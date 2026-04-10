# Publish Per-Game Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move publish state from per-card (`PageItem.publishStatus`) to per-game (`games.publish_status`), and add a "Send feedback" link to the sidebar.

**Architecture:** `games.publish_status` is the single source of truth. `useGameLoader` manages it as React state — loads from DB, saves back with every auto-save. `authoring-studio.tsx` reads `publishStatus` and `setPublishStatus` from `useGameLoader` rather than deriving it from page state. The DB migration (`supabase/add-game-publish.sql`) already exists and just needs to be run.

**Tech Stack:** Next.js 16 App Router, React, TypeScript, Supabase (Postgres + RLS), Tailwind CSS.

> **Note:** No test framework exists. Verification uses `npx tsc --noEmit`.

---

## File Map

**Modified files:**
- `app/_lib/authoring-types.ts` — remove `PublishStatus` type, remove `publishStatus` field from `PageItem`
- `app/_lib/label-utils.ts` — replace `PublishStatus` with `ExperienceStatus` in helper functions
- `app/_lib/supabase-game.ts` — save/load game-level `publish_status`; stop reading it from cards; remove `publishedOnly` option
- `app/_hooks/useGameLoader.ts` — add `publishStatus` state; initialize from loaded game; include in auto-save; return from hook
- `app/_hooks/usePageHandlers.ts` — remove `handlePublishStatusChange` and `handleSidebarPublishStatusChange`
- `app/_hooks/usePaletteEntries.ts` — remove per-card publish palette entry and `handlePublishStatusChange` option
- `app/_components/authoring-studio.tsx` — get `publishStatus`/`setPublishStatus` from `useGameLoader`; simplify `handleExperienceStatusChange`; remove old per-card publish destructuring
- `app/_components/page-sidebar.tsx` — remove `onPublishStatusChange` prop; add feedback link
- `app/_lib/authoring-utils.ts` — bump `APP_VERSION` to `"v0.19.1"`
- `app/_lib/patch-notes.ts` — add v0.19.1 entry

---

## Task 1: Update supabase-game.ts — game-level publish_status

**Files:**
- Modify: `app/_lib/supabase-game.ts`

The DB already has `games.publish_status` (after running `supabase/add-game-publish.sql`). This task updates the TypeScript layer to match.

Changes:
- `saveGame` gets a new `publishStatus` parameter and writes it to the `games` row
- `saveGame` stops writing `publish_status` to card rows (the column still exists on cards for now, but we no longer manage it)
- `loadGame` reads `game.publish_status` and includes it in its return value
- `loadGame` drops the `publishedOnly` option — RLS on `games` handles access control for anonymous users (draft games are invisible to anon), and the home-page guard moves to the play route

- [ ] **Step 1: Read the file**

Read `app/_lib/supabase-game.ts` to confirm the current structure before editing.

- [ ] **Step 2: Rewrite supabase-game.ts**

Replace the full file with:

```ts
import { supabase } from "@/app/_lib/supabase";
import { ExperienceStatus, PageItem, SystemSettings } from "@/app/_lib/authoring-types";

// ---------- save ----------

export async function saveGame(
  gameId: string,
  userId: string,
  gameTitle: string,
  pages: PageItem[],
  systemSettings: SystemSettings,
  publishStatus: ExperienceStatus,
): Promise<void> {
  const cardOrder = pages.map((p) => p.id);

  const { error: gameError } = await supabase.from("games").upsert({
    id: gameId,
    user_id: userId,
    title: gameTitle,
    system_settings: systemSettings,
    card_order: cardOrder,
    publish_status: publishStatus,
  });
  if (gameError) throw gameError;

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

  const { error: cardsError } = await supabase.from("cards").upsert(cardRows);
  if (cardsError) throw cardsError;

  // Remove cards that no longer exist in pages
  const { error: deleteError } = await supabase
    .from("cards")
    .delete()
    .eq("game_id", gameId)
    .not("id", "in", `(${cardOrder.map((id) => `"${id}"`).join(",")})`);
  if (deleteError) throw deleteError;
}

// ---------- load ----------

export async function loadGame(
  gameId: string,
): Promise<{ pages: PageItem[]; systemSettings: SystemSettings; gameTitle: string; publishStatus: ExperienceStatus } | null> {
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

  const publishStatus: ExperienceStatus =
    game.publish_status === "published" ? "published" : "draft";

  return { pages, systemSettings: game.system_settings, gameTitle: game.title ?? "", publishStatus };
}

export async function deleteGame(gameId: string): Promise<void> {
  const { error } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId);

  if (error) throw error;
}
```

Note: `PageItem` no longer has `publishStatus` — it's removed in Task 5. At this point TypeScript is still happy because `PageItem` still has it; we just stopped writing it to the DB.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/_lib/supabase-game.ts
git commit -m "refactor: move publish_status from cards to games table"
```

---

## Task 2: Update useGameLoader — add publishStatus state

**Files:**
- Modify: `app/_hooks/useGameLoader.ts`

`useGameLoader` currently calls `saveGame` without `publishStatus`. This task adds `publishStatus` state, initialises it from the loaded game, threads it through auto-save, and returns it from the hook.

- [ ] **Step 1: Read the file**

Read `app/_hooks/useGameLoader.ts` to confirm the current structure.

- [ ] **Step 2: Add publishStatus state and threading**

Apply these four changes to `useGameLoader.ts`:

**Import `ExperienceStatus`** — add it to the types import at the top:
```ts
import { ExperienceStatus, InspectorTab, PageItem, SystemSettings } from "@/app/_lib/authoring-types";
```

**Add state after the existing state declarations** (after `const [saveState, setSaveState] = ...`):
```ts
const [publishStatus, setPublishStatus] = useState<ExperienceStatus>("draft");
```

**Initialize from loaded game** — in the `load()` function inside the hydration `useEffect`, after `setPages(...)` and before the `return`:

Current remote load block:
```ts
if (remote) {
  const loaded = applyLoadedPages(remote.pages);
  setPages(
    loaded.length > 0
      ? loaded
      : createInitialPages({ ... })
  );
  if (remote.systemSettings) {
    setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...remote.systemSettings });
  }
  if (remote.gameTitle) setCurrentGameName(remote.gameTitle);
  return;
}
```

Add `setPublishStatus(remote.publishStatus);` after `setCurrentGameName`:
```ts
if (remote) {
  const loaded = applyLoadedPages(remote.pages);
  setPages(
    loaded.length > 0
      ? loaded
      : createInitialPages({
          defaultLanguageCode: remote.systemSettings?.defaultLanguageCode ?? "EN",
          gameName: remote.gameTitle || "Untitled Game",
        })
  );
  if (remote.systemSettings) {
    setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...remote.systemSettings });
  }
  if (remote.gameTitle) setCurrentGameName(remote.gameTitle);
  setPublishStatus(remote.publishStatus);
  return;
}
```

**Thread publishStatus into saveGame** — in the auto-save `useEffect`, update the `saveGame` call:
```ts
saveGame(currentGameId, userId, currentGameName, persistablePages, persistableSystemSettings, publishStatus)
```

Add `publishStatus` to that useEffect's dependency array:
```ts
}, [pages, systemSettings, currentGameId, currentGameName, hasLoadedInitialState, userId, publishStatus]);
```

**Also update switchToGame** — set publish status when switching games. After `setCurrentGameName(name)`:
```ts
setPublishStatus(remote.publish_status === "published" ? "published" : "draft");
```

Wait — `switchToGame` calls `loadGame(id)` which now returns `publishStatus` in the result. Add:
```ts
loadGame(id).then((remote) => {
  if (remote) {
    // ... existing code ...
    setCurrentGameName(name);
    setPublishStatus(remote.publishStatus);  // ADD THIS LINE
  } else {
    // ... existing code ...
    setPublishStatus("draft");  // ADD THIS LINE (new games start as draft)
  }
  // ...
```

Also in `openFreshWorkspace`, add `setPublishStatus("draft");` alongside the other resets.

**Add to return object:**
```ts
return {
  currentGameId,
  currentGameName,
  setCurrentGameName,
  currentStudioName,
  setCurrentStudioName,
  hasLoadedInitialState,
  saveState,
  switchToGame,
  openFreshWorkspace,
  onRenameGame,
  publishStatus,        // ADD
  setPublishStatus,     // ADD
};
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. TypeScript will complain that `saveGame` now expects 6 args — you may see one error here since `authoring-studio.tsx` still calls the old 5-arg version... actually no, because `useGameLoader.ts` is the only place `saveGame` is called, and we just updated it. Should be clean.

- [ ] **Step 4: Commit**

```bash
git add app/_hooks/useGameLoader.ts
git commit -m "refactor: add publishStatus state to useGameLoader, initialize from game"
```

---

## Task 3: Update authoring-studio.tsx — use game-level publishStatus

**Files:**
- Modify: `app/_components/authoring-studio.tsx`

`authoring-studio.tsx` currently derives `experienceStatus` from `pages.every(p => p.publishStatus === "published")`. Replace this with `publishStatus` from `useGameLoader`. Simplify `handleExperienceStatusChange` to just call `setPublishStatus`.

- [ ] **Step 1: Read the relevant section**

Read `app/_components/authoring-studio.tsx`, focusing on:
- Where `useGameLoader` is called and what it returns
- The `experienceStatus` derivation (search for `experienceStatus`)
- The `handleExperienceStatusChange` callback
- Where `handlePublishStatusChange` and `handleSidebarPublishStatusChange` are destructured

- [ ] **Step 2: Get publishStatus from useGameLoader**

In the destructuring of `useGameLoader(...)`, add `publishStatus` and `setPublishStatus`:

```ts
const {
  currentGameId,
  currentGameName,
  setCurrentGameName,
  currentStudioName,
  setCurrentStudioName,
  hasLoadedInitialState,
  saveState,
  switchToGame,
  openFreshWorkspace,
  onRenameGame,
  publishStatus,      // ADD
  setPublishStatus,   // ADD
} = useGameLoader({ ... });
```

- [ ] **Step 3: Replace experienceStatus derivation**

Find:
```ts
const experienceStatus: ExperienceStatus =
  pages.length > 0 && pages.every((page) => page.publishStatus === "published")
    ? "published"
    : "draft";
```

Replace with:
```ts
const experienceStatus: ExperienceStatus = publishStatus;
```

- [ ] **Step 4: Simplify handleExperienceStatusChange**

Find:
```ts
const handleExperienceStatusChange = useCallback((status: ExperienceStatus) => {
  if (status === "published" && !canPublish) {
    setShowPricingModal("upgrade-prompt");
    return;
  }
  pushPagesHistory();
  setPages((prev) =>
    prev.map((page) =>
      page.publishStatus === status ? page : { ...page, publishStatus: status }
    )
  );
}, [pushPagesHistory, canPublish]);
```

Replace with:
```ts
const handleExperienceStatusChange = useCallback((status: ExperienceStatus) => {
  if (status === "published" && !canPublish) {
    setShowPricingModal("upgrade-prompt");
    return;
  }
  setPublishStatus(status);
}, [setPublishStatus, canPublish]);
```

- [ ] **Step 5: Remove old per-card publish destructuring**

Find the destructuring of `usePageHandlers` — it includes `handlePublishStatusChange, handleSidebarPublishStatusChange`. Remove both of those:

```ts
// BEFORE (find and remove these two):
handlePublishStatusChange, handleSidebarPublishStatusChange,

// AFTER: simply omit them from the destructuring
```

Also find where they are passed into `sharedCanvasProps` (search for `onPublishStatusChange`) and remove those entries:
```ts
// Remove these lines from sharedCanvasProps and from the PageSidebar JSX:
onPublishStatusChange: handlePublishStatusChange,
// and:
onPublishStatusChange={handleSidebarPublishStatusChange}
```

Also remove `handlePublishStatusChange` from the `usePaletteEntries` call options:
```ts
// BEFORE:
handleSystemSettingChange, handlePublishStatusChange, pushPagesHistory,

// AFTER:
handleSystemSettingChange, pushPagesHistory,
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If TypeScript complains that `handlePublishStatusChange` no longer exists on `usePageHandlers`'s return type, that's fine — we remove it in the next task. For now it still exists, we're just not destructuring it.

- [ ] **Step 7: Commit**

```bash
git add app/_components/authoring-studio.tsx
git commit -m "refactor: use game-level publishStatus in authoring-studio"
```

---

## Task 4: Remove per-card publish handlers from usePageHandlers and usePaletteEntries

**Files:**
- Modify: `app/_hooks/usePageHandlers.ts`
- Modify: `app/_hooks/usePaletteEntries.ts`

Now that `authoring-studio.tsx` no longer destructures these, we can remove them.

- [ ] **Step 1: Update usePageHandlers.ts**

Remove the `PublishStatus` import and the two handlers.

**Remove from import:**
```ts
// BEFORE:
import {
  DisplayStyleKey,
  InspectorTab,
  InteractionType,
  PageButtonPlacement,
  PageItem,
  PublishStatus,
} from "@/app/_lib/authoring-types";

// AFTER:
import {
  DisplayStyleKey,
  InspectorTab,
  InteractionType,
  PageButtonPlacement,
  PageItem,
} from "@/app/_lib/authoring-types";
```

**Remove the two handler functions** (lines ~115–123):
```ts
// DELETE these two functions entirely:
const handlePublishStatusChange = (value: PublishStatus) => {
  updateSelectedPage((page) => ({ ...page, publishStatus: value }));
};

const handleSidebarPublishStatusChange = (pageId: string, status: PublishStatus) => {
  setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, publishStatus: status } : p)));
};
```

**Remove from return object:**
```ts
// BEFORE:
return {
  ...
  handlePublishStatusChange,
  handleSidebarPublishStatusChange,
  ...
};

// AFTER: simply omit those two lines
```

- [ ] **Step 2: Update usePaletteEntries.ts**

Remove `handlePublishStatusChange` from the options type, destructuring, and usage.

**Remove from the options type** (the `UsePaletteEntriesOptions` interface or inline type):
```ts
// Remove this line:
handlePublishStatusChange: (status: "published" | "draft") => void;
```

**Remove from the destructuring at the top of the function:**
```ts
// Remove:
handlePublishStatusChange,
```

**Remove the "page-publish-toggle" palette entry** — find and delete:
```ts
if (selectedPage && selectedPage.kind !== "home") {
  const isPublished = selectedPage.publishStatus === "published";
  entries.push({
    id: "page-publish-toggle",
    label: isPublished ? "Unpublish current page" : "Publish current page",
    group: "Current page",
    alwaysShow: true,
    onRun: () => handlePublishStatusChange(isPublished ? "draft" : "published"),
  });
  // keep the page-delete entry below it
```

Remove the `page-publish-toggle` push only — keep the `page-delete` entry. Also remove `handlePublishStatusChange` from the dependency array of the `useMemo`.

Also remove `selectedPage.publishStatus` reference — the `isPublished` variable and its usage are gone with the deleted entry.

After removing, the block becomes:
```ts
if (selectedPage && selectedPage.kind !== "home") {
  entries.push({
    id: "page-delete",
    // ... existing page-delete entry code unchanged ...
  });
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. TypeScript may still complain about `page.publishStatus` references in `authoring-types.ts` and `authoring-utils.ts` — those are cleaned up in the next task.

- [ ] **Step 4: Commit**

```bash
git add app/_hooks/usePageHandlers.ts app/_hooks/usePaletteEntries.ts
git commit -m "refactor: remove per-card publish handlers from usePageHandlers and usePaletteEntries"
```

---

## Task 5: Remove publishStatus from PageItem type and clean up label-utils / authoring-utils

**Files:**
- Modify: `app/_lib/authoring-types.ts`
- Modify: `app/_lib/label-utils.ts`
- Modify: `app/_lib/authoring-utils.ts`

Now that no consumer references `page.publishStatus`, we can safely remove it from `PageItem`.

- [ ] **Step 1: Update authoring-types.ts**

Remove the `PublishStatus` type and `publishStatus` field from `PageItem`.

Find and delete the `PublishStatus` type:
```ts
// DELETE this line:
export type PublishStatus = "draft" | "published";
```

Find `publishStatus: PublishStatus;` in the `PageItem` type and delete it:
```ts
// In the PageItem type, DELETE:
publishStatus: PublishStatus;
```

`ExperienceStatus` (which is identical: `"draft" | "published"`) stays — it's the game-level type.

- [ ] **Step 2: Update label-utils.ts**

The two helper functions use `PublishStatus`. Switch them to `ExperienceStatus` (same values, different name).

**Update the import:**
```ts
// BEFORE:
import {
  InteractionType,
  PageButtonPlacement,
  PageItem,
  PublishStatus,
} from "@/app/_lib/authoring-types";

// AFTER:
import {
  ExperienceStatus,
  InteractionType,
  PageButtonPlacement,
  PageItem,
} from "@/app/_lib/authoring-types";
```

**Update the two function signatures:**
```ts
export function getPublishStatusLabel(status: ExperienceStatus) {
  // body unchanged
}

export function getPublishStatusClasses(status: ExperienceStatus) {
  // body unchanged
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. If `authoring-utils.ts` has `publishStatus: "draft"` in page literals, TypeScript will flag them as unknown properties — fix by removing those literals. Search for `publishStatus` in `authoring-utils.ts` and delete any occurrence.

Run tsc again after fixing.

- [ ] **Step 4: Commit**

```bash
git add app/_lib/authoring-types.ts app/_lib/label-utils.ts app/_lib/authoring-utils.ts
git commit -m "refactor: remove PublishStatus type and publishStatus from PageItem"
```

---

## Task 6: Update page-sidebar and play route

**Files:**
- Modify: `app/_components/page-sidebar.tsx`
- Modify: `app/play/[gameId]/page.tsx`

Two small cleanups: remove the dead `onPublishStatusChange` prop from the sidebar and add the feedback link; update the play route to remove the now-removed `publishedOnly` option and guard on home page presence.

- [ ] **Step 1: Update page-sidebar.tsx**

**Remove `PublishStatus` from the import** (line 7):
```ts
// BEFORE:
import { CanvasFeature, ContentBlock, ExperienceStatus, PageItem, PublishStatus } from "@/app/_lib/authoring-types";

// AFTER:
import { CanvasFeature, ContentBlock, ExperienceStatus, PageItem } from "@/app/_lib/authoring-types";
```

**Remove `onPublishStatusChange` from `PageSidebarProps`:**
```ts
// Remove this line from the type:
onPublishStatusChange: (pageId: string, status: PublishStatus) => void;
```

**Remove from the function parameters** (currently `onPublishStatusChange: _onPublishStatusChange`):
```ts
// Remove this destructured param from the function signature:
onPublishStatusChange: _onPublishStatusChange,
```

**Add feedback link.** Find the "Account row" comment (around line 681). Insert the feedback link **before** the Account row button:

```tsx
{/* Feedback row */}
<a
  href={`mailto:will@wbeestudio.com?subject=${encodeURIComponent("Sherpa feedback")}&body=${encodeURIComponent("What happened:\n\nWhat I expected:\n\nMy email: " + (userEmail || ""))}`}
  target="_blank"
  rel="noopener noreferrer"
  className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left transition ${dk ? "hover:bg-neutral-800" : "hover:bg-neutral-100"}`}
>
  <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${dk ? "bg-neutral-800 text-neutral-400" : "bg-neutral-100 text-neutral-500"}`}>
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M1 2.5h11v7a1 1 0 01-1 1H2a1 1 0 01-1-1v-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M1 2.5l5.5 4.5L12 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
  <div className="min-w-0">
    <div className={`truncate text-xs font-medium ${dk ? "text-neutral-200" : "text-neutral-700"}`}>Send feedback</div>
    <div className="truncate text-[10px] text-neutral-400">Report a bug or share ideas</div>
  </div>
</a>

{/* Account row */}
<button ...
```

- [ ] **Step 2: Update play/[gameId]/page.tsx**

The play route calls `loadGame(gameId, { publishedOnly: true })`. The `publishedOnly` option no longer exists. Replace with a plain `loadGame(gameId)` call and add an explicit home-page check:

Read `app/play/[gameId]/page.tsx` to find the exact call site. It's in a `useEffect`.

Change the `loadGame` call from:
```ts
loadGame(gameId, { publishedOnly: true })
```

To:
```ts
loadGame(gameId)
```

And update the `if (data)` guard to also require a home page:
```ts
// BEFORE:
if (data) {

// AFTER:
if (data && data.pages.some((p) => p.kind === "home")) {
```

Leave all other code in the callback (setPages, setSystemSettings, etc.) unchanged.

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/_components/page-sidebar.tsx app/play/[gameId]/page.tsx
git commit -m "refactor: remove onPublishStatusChange from sidebar, add feedback link, fix play route"
```

---

## Task 7: Bump version and patch notes

**Files:**
- Modify: `app/_lib/authoring-utils.ts`
- Modify: `app/_lib/patch-notes.ts`

- [ ] **Step 1: Bump APP_VERSION**

In `app/_lib/authoring-utils.ts`, find:
```ts
export const APP_VERSION = "v0.19.0";
```

Change to:
```ts
export const APP_VERSION = "v0.19.1";
```

- [ ] **Step 2: Add patch note**

In `app/_lib/patch-notes.ts`, prepend to the `PATCH_NOTES` array:

```ts
{
  version: "v0.19.1",
  date: "2026-04-09",
  changes: [
    "Publish state is now per-game — one toggle publishes or unpublishes the entire experience",
    "Feedback link in the sidebar: send bugs or ideas directly from the authoring tool",
    "RLS policies updated: game access is gated on games.publish_status, not per-card",
  ],
},
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/_lib/authoring-utils.ts app/_lib/patch-notes.ts
git commit -m "chore: bump to v0.19.1 — publish-per-game refactor"
```

---

## Post-implementation checklist

Before merging:

- [ ] Run `supabase/add-game-publish.sql` in the Supabase Dashboard → SQL Editor (if not already done)
- [ ] Open the authoring studio, load a game — confirm the publish toggle still works
- [ ] Publish a game, open its play URL in an incognito window — confirm it loads
- [ ] Unpublish the game, reload the play URL — confirm it shows not-found
- [ ] Click "Send feedback" in the sidebar — confirm it opens a pre-filled email
- [ ] Open account settings → Billing → confirm the upgrade modal still opens from "Upgrade"
