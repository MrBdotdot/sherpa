# Publisher Draft/Publish/Revert Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace per-card `publish_status` with a game-level snapshot system so publishers edit freely and players always see the last explicitly published snapshot.
**Architecture:** A new `game_snapshots` table stores full serialized game state (JSONB). The play route reads the latest snapshot; the studio reads live `games`/`cards` rows as before. Publish inserts a new snapshot row; restore inserts a new snapshot then overwrites the live rows.
**Tech Stack:** Supabase (Postgres, RLS), Next.js App Router, React, TypeScript, Tailwind CSS.

---

### Task 1: Create SQL — game_snapshots table with RLS

**Files:**
- Create: `supabase/add-snapshots.sql`

- [ ] Step 1: Create the file with the full table, index, and all four RLS policies:

```sql
-- supabase/add-snapshots.sql
-- Run in Supabase Dashboard → SQL Editor BEFORE running migrate-publish-status.sql

CREATE TABLE game_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id       text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  snapshot      jsonb NOT NULL,
  published_at  timestamptz NOT NULL DEFAULT now(),
  published_by  uuid NOT NULL REFERENCES auth.users(id),
  label         text
);

CREATE INDEX game_snapshots_game_id_idx ON game_snapshots (game_id, published_at DESC);

ALTER TABLE game_snapshots ENABLE ROW LEVEL SECURITY;

-- Read: member of game (any role) OR any authenticated user (for play route)
CREATE POLICY "snapshots_select" ON game_snapshots FOR SELECT USING (
  user_game_role(game_id) IS NOT NULL
  OR EXISTS (
    SELECT 1 FROM game_snapshots s2
    WHERE s2.game_id = game_snapshots.game_id
    LIMIT 1
  )
);

-- Insert: owner or editor
CREATE POLICY "snapshots_insert" ON game_snapshots FOR INSERT
  WITH CHECK (user_game_role(game_id) IN ('owner', 'editor'));

-- Update: owner or editor (label only)
CREATE POLICY "snapshots_update" ON game_snapshots FOR UPDATE USING (
  user_game_role(game_id) IN ('owner', 'editor')
);

-- Delete: owner only
CREATE POLICY "snapshots_delete" ON game_snapshots FOR DELETE USING (
  user_game_role(game_id) = 'owner'
);
```

- [ ] Step 2: **MANUAL STEP** — Run `supabase/add-snapshots.sql` in the Supabase Dashboard → SQL Editor. Confirm the `game_snapshots` table appears in the Table Editor with 5 columns (id, game_id, snapshot, published_at, published_by, label).
- [ ] Step 3: Commit: "Add game_snapshots SQL with RLS policies"

---

### Task 2: Create SQL — migration script for existing published data

**Files:**
- Create: `supabase/migrate-publish-status.sql`

- [ ] Step 1: Create the migration file. This script creates one snapshot per game that has at least one published card, then drops the column. It must be idempotent — wrapping in a DO block protects re-runs:

```sql
-- supabase/migrate-publish-status.sql
-- Run AFTER add-snapshots.sql, BEFORE deploying code that removes publishStatus.
-- Creates initial snapshots for games that have published cards.
-- Then removes publish_status column from cards.

DO $$
DECLARE
  r RECORD;
  snap jsonb;
  sys_settings jsonb;
  card_order_arr text[];
  pages_arr jsonb;
BEGIN
  -- For each game that has at least one published card
  FOR r IN
    SELECT DISTINCT g.id AS game_id, g.title, g.system_settings, g.card_order, g.user_id
    FROM games g
    INNER JOIN cards c ON c.game_id = g.id
    WHERE c.publish_status = 'published'
  LOOP
    card_order_arr := r.card_order;

    -- Build pages array from published cards only, ordered by card_order
    SELECT jsonb_agg(
      jsonb_build_object(
        'id',                  c.id,
        'kind',                c.kind,
        'title',               c.title,
        'summary',             c.summary,
        'heroImage',           c.hero_image,
        'x',                   c.x,
        'y',                   c.y,
        'mobileX',             c.mobile_x,
        'mobileY',             c.mobile_y,
        'contentX',            c.content_x,
        'contentY',            c.content_y,
        'mobileContentX',      c.mobile_content_x,
        'mobileContentY',      c.mobile_content_y,
        'blocks',              c.blocks,
        'socialLinks',         c.social_links,
        'canvasFeatures',      c.canvas_features,
        'publicUrl',           c.public_url,
        'showQrCode',          c.show_qr_code,
        'interactionType',     c.interaction_type,
        'pageButtonPlacement', c.page_button_placement,
        'templateId',          c.template_id,
        'cardSize',            c.card_size,
        'contentTintColor',    c.content_tint_color,
        'contentTintOpacity',  c.content_tint_opacity,
        'worldPosition',       c.world_position,
        'worldNormal',         c.world_normal
      )
      ORDER BY
        CASE WHEN array_position(card_order_arr, c.id) IS NULL THEN 1 ELSE 0 END,
        array_position(card_order_arr, c.id)
    )
    INTO pages_arr
    FROM cards c
    WHERE c.game_id = r.game_id AND c.publish_status = 'published';

    snap := jsonb_build_object(
      'gameId',         r.game_id,
      'title',          r.title,
      'systemSettings', r.system_settings,
      'cardOrder',      to_jsonb(card_order_arr),
      'pages',          COALESCE(pages_arr, '[]'::jsonb)
    );

    INSERT INTO game_snapshots (game_id, snapshot, published_by, label)
    VALUES (r.game_id, snap, r.user_id, 'Initial snapshot (migrated)');
  END LOOP;
END $$;

-- Drop publish_status from cards (safe to run once snapshots exist)
ALTER TABLE cards DROP COLUMN IF EXISTS publish_status;
```

- [ ] Step 2: **MANUAL STEP** — Run `supabase/migrate-publish-status.sql` in the Supabase Dashboard → SQL Editor. Verify in Table Editor that `game_snapshots` has rows for games with published cards, and that `publish_status` column no longer exists on `cards`.
- [ ] Step 3: Commit: "Add publish-status migration SQL"

---

### Task 3: Update authoring-types.ts — remove publishStatus, add snapshot types

**Files:**
- Modify: `app/_lib/authoring-types.ts`

- [ ] Step 1: Remove the `PublishStatus` type and the `publishStatus` field from `PageItem`. Also add `GameSnapshot` and `GameSnapshotRecord` types. The file currently has `PublishStatus` on line 14 and `publishStatus: PublishStatus` on line 146.

Remove `PublishStatus` type definition:
```ts
// DELETE this line:
export type PublishStatus = "draft" | "published";
```

Remove `publishStatus` from `PageItem` (between `interactionType` and `pageButtonPlacement`):
```ts
// DELETE this line from PageItem:
  publishStatus: PublishStatus;
```

Add the new types after `ExperienceStatus`:
```ts
export type GameSnapshot = {
  gameId: string;
  title: string;
  systemSettings: SystemSettings;
  cardOrder: string[];
  pages: PageItem[];
};

export type GameSnapshotRecord = {
  id: string;
  game_id: string;
  snapshot: GameSnapshot;
  published_at: string;
  published_by: string;
  label: string | null;
};
```

- [ ] Step 2: Run: `npm run build` — Expected: TypeScript errors surfacing every place that references `publishStatus` or `PublishStatus`. Note each file for the tasks below (do not fix yet in this step — just confirm the error list matches the spec).
- [ ] Step 3: Commit: "types: remove PublishStatus/publishStatus, add GameSnapshot types"

---

### Task 4: Update authoring-utils.ts — add serializeSnapshot and deserializeSnapshot

**Files:**
- Modify: `app/_lib/authoring-utils.ts`

- [ ] Step 1: Remove the `PublishStatus` import from the top of the file (it's imported but only used indirectly via `PageItem`). Confirm `PublishStatus` no longer appears in the import list.

- [ ] Step 2: Add `GameSnapshot` and `GameSnapshotRecord` to the import from `authoring-types`:
```ts
import {
  // ... existing imports ...
  GameSnapshot,
  SystemSettings,
} from "@/app/_lib/authoring-types";
```

- [ ] Step 3: Add `serializeSnapshot` and `deserializeSnapshot` functions near the bottom of the file (before the last closing brace):

```ts
// ── Snapshot serialization ─────────────────────────────────────

export function serializeSnapshot(
  gameId: string,
  title: string,
  systemSettings: SystemSettings,
  pages: PageItem[]
): GameSnapshot {
  return {
    gameId,
    title,
    systemSettings,
    cardOrder: pages.map((p) => p.id),
    pages,
  };
}

export function deserializeSnapshot(snapshot: GameSnapshot): {
  pages: PageItem[];
  systemSettings: SystemSettings;
  title: string;
} {
  return {
    pages: snapshot.pages,
    systemSettings: snapshot.systemSettings,
    title: snapshot.title,
  };
}
```

- [ ] Step 4: Bump `APP_VERSION` from `"v0.17.10"` to `"v0.18.0"` and add a PATCH_NOTES entry in `app/_lib/patch-notes.ts`:
```ts
// In patch-notes.ts, add at the top of the PATCH_NOTES array:
{
  version: "v0.18.0",
  date: "2026-04-08",
  notes: [
    "Game-level publish snapshots replace per-card publish status",
    "Publishers now edit freely — players always see the last explicitly published snapshot",
    "Version history with restore in the Game tab",
  ],
},
```

- [ ] Step 5: Run: `npm run build` — Expected: same TypeScript errors as before (no new ones from utils).
- [ ] Step 6: Commit: "utils: add serializeSnapshot/deserializeSnapshot, bump version to v0.18.0"

---

### Task 5: Update supabase-game.ts — snapshot-aware loadGame, publishGame, loadSnapshots, restoreSnapshot

**Files:**
- Modify: `app/_lib/supabase-game.ts`

- [ ] Step 1: Add `GameSnapshot`, `GameSnapshotRecord`, `PageItem` (already imported), and `serializeSnapshot`, `deserializeSnapshot` to imports:
```ts
import { PageItem, SystemSettings, GameSnapshot, GameSnapshotRecord } from "@/app/_lib/authoring-types";
import { serializeSnapshot, deserializeSnapshot } from "@/app/_lib/authoring-utils";
```

- [ ] Step 2: Update `saveGame()` — remove `publish_status` from the card row mapping. The `cardRows` array currently has `publish_status: page.publishStatus` on line 45; delete that line.

- [ ] Step 3: Rewrite `loadGame()` so that `publishedOnly: true` reads from `game_snapshots` instead of filtering cards. Replace the entire function:

```ts
export async function loadGame(
  gameId: string,
  options?: { publishedOnly?: boolean }
): Promise<{ pages: PageItem[]; systemSettings: SystemSettings; gameTitle: string } | null> {
  // Play route: read latest snapshot
  if (options?.publishedOnly) {
    const { data: snapshotRow, error: snapError } = await supabase
      .from("game_snapshots")
      .select("snapshot")
      .eq("game_id", gameId)
      .order("published_at", { ascending: false })
      .limit(1)
      .single();

    if (snapError || !snapshotRow) return null;

    const { pages, systemSettings, title } = deserializeSnapshot(
      snapshotRow.snapshot as GameSnapshot
    );

    if (!pages.some((p) => p.kind === "home")) return null;

    return { pages, systemSettings, gameTitle: title };
  }

  // Studio route: read live games + cards tables
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", gameId)
    .single();

  if (gameError || !game) return null;

  const { data: cards, error: cardsError } = await supabase
    .from("cards")
    .select("*")
    .eq("game_id", gameId);

  if (cardsError || !cards) return null;

  const cardOrder: string[] = game.card_order ?? [];
  const cardMap = new Map(cards.map((c) => [c.id, c]));
  const ordered = [
    ...cardOrder.map((id) => cardMap.get(id)).filter(Boolean),
    ...cards.filter((c) => !cardOrder.includes(c.id)),
  ] as ReturnType<typeof cardMap.get>[];

  const pages: PageItem[] = ordered.map((card) => ({
    id: card!.id,
    kind: card!.kind,
    title: card!.title,
    summary: card!.summary,
    heroImage: card!.hero_image,
    x: card!.x,
    y: card!.y,
    mobileX: card!.mobile_x,
    mobileY: card!.mobile_y,
    contentX: card!.content_x,
    contentY: card!.content_y,
    mobileContentX: card!.mobile_content_x,
    mobileContentY: card!.mobile_content_y,
    blocks: card!.blocks ?? [],
    socialLinks: card!.social_links ?? [],
    canvasFeatures: card!.canvas_features ?? [],
    publicUrl: card!.public_url,
    showQrCode: card!.show_qr_code,
    interactionType: card!.interaction_type,
    pageButtonPlacement: card!.page_button_placement,
    templateId: card!.template_id,
    cardSize: card!.card_size,
    contentTintColor: card!.content_tint_color,
    contentTintOpacity: card!.content_tint_opacity,
    worldPosition: card!.world_position,
    worldNormal: card!.world_normal,
  }));

  return { pages, systemSettings: game.system_settings, gameTitle: game.title ?? "" };
}
```

- [ ] Step 4: Add the three new functions after `deleteGame`:

```ts
// ── Snapshot publish ────────────────────────────────────────────

export async function publishGame(
  gameId: string,
  title: string,
  systemSettings: SystemSettings,
  pages: PageItem[],
  publishedBy: string
): Promise<void> {
  const snapshot = serializeSnapshot(gameId, title, systemSettings, pages);
  const { error } = await supabase.from("game_snapshots").insert({
    game_id: gameId,
    snapshot,
    published_by: publishedBy,
  });
  if (error) throw error;
}

// ── Snapshot history ────────────────────────────────────────────

export async function loadSnapshots(gameId: string): Promise<GameSnapshotRecord[]> {
  const { data, error } = await supabase
    .from("game_snapshots")
    .select("id, game_id, published_at, published_by, label, snapshot")
    .eq("game_id", gameId)
    .order("published_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return (data ?? []) as GameSnapshotRecord[];
}

export async function updateSnapshotLabel(
  snapshotId: string,
  label: string
): Promise<void> {
  const { error } = await supabase
    .from("game_snapshots")
    .update({ label: label || null })
    .eq("id", snapshotId);
  if (error) throw error;
}

// ── Snapshot restore ────────────────────────────────────────────

export async function restoreSnapshot(
  gameId: string,
  snapshotId: string,
  publishedBy: string
): Promise<{ pages: PageItem[]; systemSettings: SystemSettings; title: string }> {
  // 1. Fetch the selected snapshot
  const { data: snapshotRow, error: fetchError } = await supabase
    .from("game_snapshots")
    .select("snapshot")
    .eq("id", snapshotId)
    .single();

  if (fetchError || !snapshotRow) throw fetchError ?? new Error("Snapshot not found");

  const snapshotData = snapshotRow.snapshot as GameSnapshot;
  const { pages, systemSettings, title } = deserializeSnapshot(snapshotData);

  // 2. Insert a new snapshot row (preserves history; never mutates existing rows)
  const newSnapshot = serializeSnapshot(gameId, title, systemSettings, pages);
  const { error: insertError } = await supabase.from("game_snapshots").insert({
    game_id: gameId,
    snapshot: newSnapshot,
    published_by: publishedBy,
    label: `Restored from ${new Date(snapshotData.gameId).toLocaleDateString()}`,
  });
  if (insertError) throw insertError;

  // 3. Overwrite games table
  const cardOrder = pages.map((p) => p.id);
  const { error: gameError } = await supabase.from("games").update({
    title,
    system_settings: systemSettings,
    card_order: cardOrder,
  }).eq("id", gameId);
  if (gameError) throw gameError;

  // 4. Overwrite cards table — upsert all restored cards
  const cardRows = pages.map((page) => ({
    id: page.id,
    game_id: gameId,
    kind: page.kind,
    title: page.title,
    summary: page.summary,
    hero_image: page.heroImage,
    x: page.x,
    y: page.y,
    mobile_x: page.mobileX ?? null,
    mobile_y: page.mobileY ?? null,
    content_x: page.contentX,
    content_y: page.contentY,
    mobile_content_x: page.mobileContentX ?? null,
    mobile_content_y: page.mobileContentY ?? null,
    blocks: page.blocks,
    social_links: page.socialLinks,
    canvas_features: page.canvasFeatures,
    public_url: page.publicUrl,
    show_qr_code: page.showQrCode,
    interaction_type: page.interactionType,
    page_button_placement: page.pageButtonPlacement,
    template_id: page.templateId,
    card_size: page.cardSize,
    content_tint_color: page.contentTintColor,
    content_tint_opacity: page.contentTintOpacity,
    world_position: page.worldPosition ?? null,
    world_normal: page.worldNormal ?? null,
  }));

  const { error: upsertError } = await supabase.from("cards").upsert(cardRows);
  if (upsertError) throw upsertError;

  // 5. Delete cards no longer in this snapshot
  const { error: deleteError } = await supabase
    .from("cards")
    .delete()
    .eq("game_id", gameId)
    .not("id", "in", `(${cardOrder.map((id) => `"${id}"`).join(",")})`);
  if (deleteError) throw deleteError;

  return { pages, systemSettings, title };
}
```

- [ ] Step 5: Run: `npm run build` — Expected: TypeScript errors should now be only in components and hooks referencing `publishStatus`/`PublishStatus` — no new errors in the lib files.
- [ ] Step 6: Commit: "data: update supabase-game.ts for snapshot publish/restore"

---

### Task 6: Remove publishStatus from usePageHandlers.ts

**Files:**
- Modify: `app/_hooks/usePageHandlers.ts`

- [ ] Step 1: Remove `PublishStatus` from the import at the top of the file. The import line currently reads:
```ts
import {
  DisplayStyleKey,
  InspectorTab,
  InteractionType,
  PageButtonPlacement,
  PageItem,
  PublishStatus,
} from "@/app/_lib/authoring-types";
```
Change to:
```ts
import {
  DisplayStyleKey,
  InspectorTab,
  InteractionType,
  PageButtonPlacement,
  PageItem,
} from "@/app/_lib/authoring-types";
```

- [ ] Step 2: Delete the entire `// ── Publishing ──` section (lines 115–123), which contains `handlePublishStatusChange` and `handleSidebarPublishStatusChange`.

- [ ] Step 3: Remove `handlePublishStatusChange` and `handleSidebarPublishStatusChange` from the return object (lines 143–144).

- [ ] Step 4: Run: `npm run build` — Expected: Errors now in callers (`authoring-studio.tsx`, `usePaletteEntries.ts`) that reference those removed handlers. Note them for next tasks.
- [ ] Step 5: Commit: "hooks: remove handlePublishStatusChange from usePageHandlers"

---

### Task 7: Remove publishStatus from usePaletteEntries.ts

**Files:**
- Modify: `app/_hooks/usePaletteEntries.ts`

- [ ] Step 1: Remove the `handlePublishStatusChange` prop from the `UsePaletteEntriesProps` interface:
```ts
// DELETE:
  handlePublishStatusChange: (status: "published" | "draft") => void;
```

- [ ] Step 2: Remove `handlePublishStatusChange` from the destructured argument list in the function body.

- [ ] Step 3: Delete the `page-publish-toggle` entry block (roughly lines 97–105):
```ts
// DELETE this block:
      const isPublished = selectedPage.publishStatus === "published";
      entries.push({
        id: "page-publish-toggle",
        label: isPublished ? "Unpublish current page" : "Publish current page",
        group: "Current page",
        alwaysShow: true,
        onRun: () => handlePublishStatusChange(isPublished ? "draft" : "published"),
      });
```

- [ ] Step 4: Remove `handlePublishStatusChange` from the `useMemo` dependency array at the bottom.
- [ ] Step 5: Run: `npm run build` — Expected: Errors now only in `authoring-studio.tsx`.
- [ ] Step 6: Commit: "hooks: remove publish-status palette entry from usePaletteEntries"

---

### Task 8: Remove publishStatus from page-sidebar.tsx

**Files:**
- Modify: `app/_components/page-sidebar.tsx`

- [ ] Step 1: Remove `PublishStatus` from the import:
```ts
// Change:
import { CanvasFeature, ContentBlock, ExperienceStatus, PageItem, PublishStatus } from "@/app/_lib/authoring-types";
// To:
import { CanvasFeature, ContentBlock, ExperienceStatus, PageItem } from "@/app/_lib/authoring-types";
```

- [ ] Step 2: Remove the `onPublishStatusChange` prop from `PageSidebarProps`:
```ts
// DELETE:
  onPublishStatusChange: (pageId: string, status: PublishStatus) => void;
```

- [ ] Step 3: Remove `onPublishStatusChange: _onPublishStatusChange,` from the function destructure (currently line 269, where it's already prefixed with `_` to silence the unused warning). Remove the line entirely.

- [ ] Step 4: Run: `npm run build` — Expected: Error in `authoring-studio.tsx` where it passes `onPublishStatusChange={handleSidebarPublishStatusChange}`.
- [ ] Step 5: Commit: "sidebar: remove per-card publish toggle prop"

---

### Task 9: Remove publishStatus from page-editor-modal.tsx

**Files:**
- Modify: `app/_components/page-editor-modal.tsx`

- [ ] Step 1: Remove `PublishStatus` from the import at the top:
```ts
// Remove PublishStatus from this import:
import {
  // ...
  PublishStatus,
  // ...
} from "@/app/_lib/authoring-types";
```

- [ ] Step 2: Remove the `onPublishStatusChange` prop from `PageEditorModalProps`:
```ts
// DELETE:
  onPublishStatusChange: (value: PublishStatus) => void;
```

- [ ] Step 3: Remove `onPublishStatusChange: _onPublishStatusChange,` from the function destructure and remove the corresponding `void _onPublishStatusChange;` silencer line.

- [ ] Step 4: Run: `npm run build` — Expected: Error in `authoring-studio.tsx` where it passes `onPublishStatusChange`.
- [ ] Step 5: Commit: "editor: remove onPublishStatusChange prop from PageEditorModal"

---

### Task 10: Remove publishStatus from player-view.tsx

**Files:**
- Modify: `app/_components/player-view.tsx`

- [ ] Step 1: Remove the `publishStatus === "published"` filter from `homePage` derivation. Currently:
```ts
const homePage = useMemo(
  () =>
    localizedPages.find((p) => p.kind === "home" && p.publishStatus === "published") ?? null,
  [localizedPages]
);
```
Change to:
```ts
const homePage = useMemo(
  () => localizedPages.find((p) => p.kind === "home") ?? null,
  [localizedPages]
);
```

- [ ] Step 2: Remove the `publishStatus === "published"` filter from `hotspotPages` derivation. Currently:
```ts
const hotspotPages = useMemo(
  () => localizedPages.filter((p) => p.kind !== "home" && p.publishStatus === "published"),
  [localizedPages]
);
```
Change to:
```ts
const hotspotPages = useMemo(
  () => localizedPages.filter((p) => p.kind !== "home"),
  [localizedPages]
);
```

- [ ] Step 3: Run: `npm run build` — Expected: Remaining errors all in `authoring-studio.tsx`.
- [ ] Step 4: Commit: "player: remove publishStatus filters — snapshots are always fully published"

---

### Task 11: Create publish-confirm-modal.tsx

**Files:**
- Create: `app/_components/publish-confirm-modal.tsx`

- [ ] Step 1: Create the component:

```tsx
"use client";

export function PublishConfirmModal({
  isOpen,
  isPublishing,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  isPublishing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isPublishing) onCancel(); }}
      onKeyDown={(e) => { if (e.key === "Escape" && !isPublishing) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-neutral-900">Publish game?</h2>
        <p className="mt-2 text-sm text-neutral-500">
          This will make your current game live for all players.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isPublishing}
            className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPublishing}
            className="flex-1 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2563eb] disabled:opacity-50"
          >
            {isPublishing ? "Publishing..." : "Publish now"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] Step 2: Run: `npm run build` — Expected: No new errors from this file.
- [ ] Step 3: Commit: "ui: add PublishConfirmModal"

---

### Task 12: Create restore-confirm-modal.tsx

**Files:**
- Create: `app/_components/restore-confirm-modal.tsx`

- [ ] Step 1: Create the component:

```tsx
"use client";

export function RestoreConfirmModal({
  isOpen,
  isRestoring,
  snapshotDate,
  onConfirm,
  onCancel,
}: {
  isOpen: boolean;
  isRestoring: boolean;
  snapshotDate: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!isOpen) return null;

  const formattedDate = snapshotDate
    ? new Date(snapshotDate).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "this version";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4"
      onClick={(e) => { if (e.target === e.currentTarget && !isRestoring) onCancel(); }}
      onKeyDown={(e) => { if (e.key === "Escape" && !isRestoring) onCancel(); }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl">
        <h2 className="text-base font-semibold text-neutral-900">Restore and publish?</h2>
        <p className="mt-2 text-sm text-neutral-500">
          This will restore your game to <span className="font-medium text-neutral-700">{formattedDate}</span> and publish it immediately. Your current unpublished changes will be overwritten.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isRestoring}
            className="flex-1 rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isRestoring}
            className="flex-1 rounded-xl bg-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2563eb] disabled:opacity-50"
          >
            {isRestoring ? "Restoring..." : "Restore and publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] Step 2: Run: `npm run build` — Expected: No new errors.
- [ ] Step 3: Commit: "ui: add RestoreConfirmModal"

---

### Task 13: Add version history section to experience-tab.tsx

**Files:**
- Modify: `app/_components/editor/experience-tab.tsx`

- [ ] Step 1: Add import for `GameSnapshotRecord` from authoring-types and `loadSnapshots`, `updateSnapshotLabel`, `restoreSnapshot` from supabase-game. Also import `RestoreConfirmModal`:

```ts
import { useState, useMemo, useCallback, useEffect, ChangeEvent } from "react";
import { GameSnapshotRecord } from "@/app/_lib/authoring-types";
import { loadSnapshots, updateSnapshotLabel, restoreSnapshot as restoreSnapshotDb } from "@/app/_lib/supabase-game";
import { RestoreConfirmModal } from "@/app/_components/restore-confirm-modal";
```

- [ ] Step 2: Add new props to `ExperienceTab`:

```ts
// Add to the existing props interface (after existing props):
  currentGameId: string;
  userId: string;
  onRestoreComplete: (pages: PageItem[], systemSettings: SystemSettings, title: string) => void;
```

- [ ] Step 3: Update the `ExperienceTab` function signature to accept the new props.

- [ ] Step 4: Add state for the version history section inside `ExperienceTab`, before the return:

```ts
  const [snapshots, setSnapshots] = useState<GameSnapshotRecord[]>([]);
  const [snapshotsLoading, setSnapshotsLoading] = useState(false);
  const [snapshotsError, setSnapshotsError] = useState("");
  const [snapshotsSectionOpen, setSnapshotsSectionOpen] = useState(false);
  const [restoreTarget, setRestoreTarget] = useState<GameSnapshotRecord | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [labelDrafts, setLabelDrafts] = useState<Record<string, string>>({});

  const loadSnapshotHistory = useCallback(async () => {
    if (!currentGameId) return;
    setSnapshotsLoading(true);
    setSnapshotsError("");
    try {
      const rows = await loadSnapshots(currentGameId);
      setSnapshots(rows);
      const drafts: Record<string, string> = {};
      rows.forEach((r) => { drafts[r.id] = r.label ?? ""; });
      setLabelDrafts(drafts);
    } catch {
      setSnapshotsError("Failed to load version history.");
    } finally {
      setSnapshotsLoading(false);
    }
  }, [currentGameId]);

  useEffect(() => {
    if (snapshotsSectionOpen) loadSnapshotHistory();
  }, [snapshotsSectionOpen, loadSnapshotHistory]);

  async function handleLabelBlur(snapshotId: string) {
    try {
      await updateSnapshotLabel(snapshotId, labelDrafts[snapshotId] ?? "");
    } catch {
      // silently fail — label is cosmetic
    }
  }

  async function handleRestoreConfirm() {
    if (!restoreTarget) return;
    setIsRestoring(true);
    try {
      const result = await restoreSnapshotDb(currentGameId, restoreTarget.id, userId);
      onRestoreComplete(result.pages, result.systemSettings, result.title);
      setRestoreTarget(null);
      await loadSnapshotHistory();
    } catch {
      setSnapshotsError("Restore failed. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  }
```

- [ ] Step 5: Add the version history `EditorSection` at the bottom of the returned JSX, after the BoardGameGeek section and before the closing `</div>`:

```tsx
      {/* Version history */}
      <EditorSection title="Version history">
        <div className="space-y-3">
          {!snapshotsSectionOpen ? (
            <button
              type="button"
              onClick={() => setSnapshotsSectionOpen(true)}
              className="w-full rounded-xl border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              Load version history
            </button>
          ) : snapshotsLoading ? (
            <div className="text-sm text-neutral-400">Loading...</div>
          ) : snapshotsError ? (
            <div className="space-y-2">
              <p className="text-xs text-red-500">{snapshotsError}</p>
              <button
                type="button"
                onClick={loadSnapshotHistory}
                className="text-xs font-medium text-neutral-500 underline"
              >
                Retry
              </button>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
              You haven&apos;t published this game yet.
            </div>
          ) : (
            <ul className="space-y-2">
              {snapshots.map((snap, index) => {
                const formattedDate = new Date(snap.published_at).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
                return (
                  <li
                    key={snap.id}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-neutral-700">{formattedDate}</span>
                          {index === 0 ? (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Current live
                            </span>
                          ) : null}
                        </div>
                      </div>
                      {index !== 0 ? (
                        <button
                          type="button"
                          onClick={() => setRestoreTarget(snap)}
                          className="shrink-0 rounded-lg border border-neutral-200 px-2.5 py-1 text-xs font-medium text-neutral-600 transition hover:bg-white hover:text-neutral-900"
                        >
                          Restore
                        </button>
                      ) : null}
                    </div>
                    <input
                      type="text"
                      value={labelDrafts[snap.id] ?? ""}
                      onChange={(e) =>
                        setLabelDrafts((prev) => ({ ...prev, [snap.id]: e.target.value }))
                      }
                      onBlur={() => handleLabelBlur(snap.id)}
                      placeholder="Add label (e.g. v2 launch)"
                      aria-label={`Label for snapshot from ${formattedDate}`}
                      className="w-full rounded-lg border border-neutral-200 bg-white px-2.5 py-1.5 text-xs outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400"
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </EditorSection>

      <RestoreConfirmModal
        isOpen={!!restoreTarget}
        isRestoring={isRestoring}
        snapshotDate={restoreTarget?.published_at ?? null}
        onConfirm={handleRestoreConfirm}
        onCancel={() => setRestoreTarget(null)}
      />
```

- [ ] Step 6: Run: `npm run build` — Expected: TypeScript error in `page-editor-modal.tsx` where `ExperienceTab` is rendered without the new props.
- [ ] Step 7: Commit: "experience-tab: add version history section with restore flow"

---

### Task 14: Thread new ExperienceTab props through page-editor-modal.tsx

**Files:**
- Modify: `app/_components/page-editor-modal.tsx`

- [ ] Step 1: Add the new props to `PageEditorModalProps`:
```ts
  currentGameId: string;
  userId: string;
  onRestoreComplete: (pages: PageItem[], systemSettings: SystemSettings, title: string) => void;
```

- [ ] Step 2: Destructure the new props in the function signature.

- [ ] Step 3: Pass them down to `<ExperienceTab>`:
```tsx
<ExperienceTab
  currentGameId={currentGameId}
  userId={userId}
  onRestoreComplete={onRestoreComplete}
  currentGameName={currentGameName}
  // ... all existing props ...
/>
```

- [ ] Step 4: Run: `npm run build` — Expected: TypeScript error in `authoring-studio.tsx` where `PageEditorModal` is rendered without the new props.
- [ ] Step 5: Commit: "editor-modal: thread currentGameId/userId/onRestoreComplete to ExperienceTab"

---

### Task 15: Wire everything in authoring-studio.tsx — publish flow, cleanup, new props

**Files:**
- Modify: `app/_components/authoring-studio.tsx`

- [ ] Step 1: Add imports for the new items:
```ts
import { publishGame } from "@/app/_lib/supabase-game";
import { PublishConfirmModal } from "@/app/_components/publish-confirm-modal";
```

- [ ] Step 2: Remove `ExperienceStatus` from the authoring-types import (it was used only for `experienceStatus` derivation). Keep `InspectorTab`, `LayoutMode`, `PageItem`, `SystemSettings`.

- [ ] Step 3: Add publish-flow state near the other modal state (around line 73):
```ts
const [showPublishModal, setShowPublishModal] = useState(false);
const [isPublishing, setIsPublishing] = useState(false);
const [lastPublishedAt, setLastPublishedAt] = useState<string | null>(null);
```

- [ ] Step 4: Replace the `experienceStatus` derivation and `handleExperienceStatusChange` (lines 307–324) with a simpler published-at tracker:
```ts
// Remove:
const experienceStatus: ExperienceStatus =
  pages.length > 0 && pages.every((page) => page.publishStatus === "published")
    ? "published"
    : "draft";

// Remove handleExperienceStatusChange entirely.

// Add:
const experienceStatus = lastPublishedAt ? "published" : "draft";
```

- [ ] Step 5: Add the `handlePublish` function after the `handleExperienceStatusChange` removal:
```ts
const handlePublish = useCallback(async () => {
  setIsPublishing(true);
  try {
    await publishGame(currentGameId, currentGameName, systemSettings, pages, userId);
    setLastPublishedAt(new Date().toISOString());
    setShowPublishModal(false);
  } catch (err) {
    console.error("Publish failed", err);
  } finally {
    setIsPublishing(false);
  }
}, [currentGameId, currentGameName, systemSettings, pages, userId]);
```

- [ ] Step 6: Add the `handleRestoreComplete` function:
```ts
const handleRestoreComplete = useCallback(
  (restoredPages: PageItem[], restoredSettings: SystemSettings, restoredTitle: string) => {
    pushPagesHistory();
    setPages(restoredPages);
    setSystemSettings(restoredSettings);
    setCurrentGameName(restoredTitle);
    setLastPublishedAt(new Date().toISOString());
  },
  [pushPagesHistory]
);
```

- [ ] Step 7: Remove from `sharedEditorProps`:
  - `onPublishStatusChange: handlePublishStatusChange,`
- Also remove `onPublishStatusChange` from `usePageHandlers` destructure at line 165.

- [ ] Step 8: Add the new props to `sharedEditorProps`:
```ts
currentGameId: currentGameId,
userId: userId,
onRestoreComplete: handleRestoreComplete,
```

- [ ] Step 9: In `sharedCanvasProps`, update `onExperienceStatusChange` to open the publish modal when switching to "published":
```ts
// Replace:
onExperienceStatusChange: handleExperienceStatusChange,
// With:
onExperienceStatusChange: (status: ExperienceStatus) => {
  if (status === "published") setShowPublishModal(true);
},
```

Note: Keep the `ExperienceStatus` import just for this callback type.

- [ ] Step 10: Remove `onPublishStatusChange` from `<PageSidebar>` props (delete `onPublishStatusChange={handleSidebarPublishStatusChange}`) and remove `handleSidebarPublishStatusChange` from the `usePageHandlers` destructure.

- [ ] Step 11: Add `<PublishConfirmModal>` to the JSX before the closing `</main>`:
```tsx
<PublishConfirmModal
  isOpen={showPublishModal}
  isPublishing={isPublishing}
  onConfirm={handlePublish}
  onCancel={() => setShowPublishModal(false)}
/>
```

- [ ] Step 12: Remove the `handlePublishStatusChange` and `handleSidebarPublishStatusChange` from the `usePageHandlers` destructure at the top. These handlers no longer exist.

- [ ] Step 13: Remove `extraPaletteEntries`'s `handlePublishStatusChange` prop (passed to `usePaletteEntries`) since it no longer exists.

- [ ] Step 14: Run: `npm run build` — Expected: Clean build with zero TypeScript errors.
- [ ] Step 15: Commit: "studio: wire publish flow, remove publishStatus logic, thread restore"

---

### Task 16: Update preview-canvas.tsx — change the status control to a "Publish" button

**Files:**
- Modify: `app/_components/preview-canvas.tsx`

- [ ] Step 1: The `renderExperienceStatusControl` function currently renders a draft/published toggle. The spec says the toolbar "Publish" button should trigger the confirmation modal. Since `onExperienceStatusChange` now opens the modal when called with "published", change the control to a single "Publish" button when status is "draft":

```tsx
function renderExperienceStatusControl({ dark = false }: { dark?: boolean } = {}) {
  const containerClass = dark
    ? "border-neutral-700 bg-neutral-800/90"
    : "border-[#d8cfbf] bg-white";

  if (experienceStatus === "published") {
    return (
      <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 shadow-sm ${containerClass}`}>
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className={`text-xs font-semibold ${dark ? "text-neutral-300" : "text-neutral-700"}`}>
          Published
        </span>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onExperienceStatusChange("published")}
      className="inline-flex items-center rounded-xl bg-[#3B82F6] px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2563eb]"
    >
      Publish
    </button>
  );
}
```

- [ ] Step 2: Run: `npm run build` — Expected: Clean build.
- [ ] Step 3: Commit: "canvas: replace draft/publish toggle with single Publish button"

---

### Task 17: Update useGameLoader.ts to seed lastPublishedAt on load

**Files:**
- Modify: `app/_hooks/useGameLoader.ts`

- [ ] Step 1: Inspect the current `useGameLoader` to understand how game loading works — find where `loadGame` is called and how initial state is set.

- [ ] Step 2: Add a `onSnapshotFound?: (publishedAt: string) => void` callback prop to `UseGameLoaderProps` so the studio can know whether a snapshot exists on load.

- [ ] Step 3: After the game loads in `useGameLoader`, also query for the latest snapshot's `published_at` and call the callback if one exists:
```ts
// After successful loadGame call, also check for existing snapshot:
const { data: latestSnap } = await supabase
  .from("game_snapshots")
  .select("published_at")
  .eq("game_id", gameId)
  .order("published_at", { ascending: false })
  .limit(1)
  .maybeSingle();

if (latestSnap?.published_at) {
  options?.onSnapshotFound?.(latestSnap.published_at);
}
```

- [ ] Step 4: In `authoring-studio.tsx`, wire `onSnapshotFound`:
```ts
// In useGameLoader call, add:
onSnapshotFound: (publishedAt) => setLastPublishedAt(publishedAt),
```

- [ ] Step 5: Run: `npm run build` — Expected: Clean build.
- [ ] Step 6: Commit: "loader: seed lastPublishedAt from existing snapshot on game load"

---

### Task 18: Final cleanup — liveViewHref and published badge in sidebar

**Files:**
- Modify: `app/_components/page-sidebar.tsx`
- Modify: `app/_components/authoring-studio.tsx`

The sidebar already shows a "Live" badge when `experienceStatus === "published"`. Since `experienceStatus` is now derived from `lastPublishedAt`, this works correctly as-is. Verify no additional changes needed.

- [ ] Step 1: Confirm the sidebar `isLive` logic (line 287: `const isLive = experienceStatus === "published"`) works with the new `experienceStatus` derived from `lastPublishedAt`. No code change needed here.

- [ ] Step 2: In `preview-canvas.tsx`, confirm the "Open live view" link still appears correctly when `experienceStatus === "published" && liveViewHref`. No code change needed.

- [ ] Step 3: Run: `npm run build` — Expected: Clean build.
- [ ] Step 4: Commit: "cleanup: verify Live badge and live view link work with snapshot-based status"

---

### Task 19: End-to-end verification

- [ ] Step 1: Run the dev server: `npm run dev`

- [ ] Step 2: Verify the spec's acceptance criteria manually:
  1. Click "Publish" → confirm modal appears → confirm → verify `game_snapshots` row in Supabase Table Editor
  2. Open play route (`/play/[gameId]`) → confirm it reads from snapshot, not live rows
  3. Edit a card after publishing → reload play route → confirm pre-edit content shows
  4. Click "Publish" again → reload play route → confirm updated content shows
  5. Open Game tab in editor → expand Version History → confirm both snapshots appear with correct timestamps
  6. Restore a previous snapshot → confirm play route reverts + studio reflects restored state
  7. Create a new game (no publish) → open play route → confirm 404 / "Experience not found"
  8. Confirm per-card publish toggles are gone from sidebar and editor panel
  9. Confirm existing published games have initial snapshot after migration (check Supabase Table Editor)

- [ ] Step 3: Commit: "test: verified publish/revert snapshot flow end-to-end"

---

### Task 20: Final build check and PR-ready commit

- [ ] Step 1: Run: `npm run build` — Expected: Zero TypeScript errors, zero lint warnings.
- [ ] Step 2: Review the diff with `git diff main` to confirm:
  - `publish_status` does not appear in any `.ts`/`.tsx` file
  - `PublishStatus` type is gone from `authoring-types.ts`
  - `game_snapshots` SQL files exist in `supabase/`
  - New components `publish-confirm-modal.tsx` and `restore-confirm-modal.tsx` exist
  - `ExperienceTab` has version history section
- [ ] Step 3: Final commit: "feat: game-level snapshot publish/restore system (v0.18.0)"
