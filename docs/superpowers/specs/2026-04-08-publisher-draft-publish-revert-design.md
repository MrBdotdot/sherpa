# Publisher Draft/Publish/Revert Workflow — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

Publishers currently edit live card rows that players read directly. There is no separation between "what the publisher is working on" and "what players see." Saving a change to a published card immediately affects the player experience. Per-card publish status exists but creates confusing partial-publish states. This spec replaces the per-card publish model with a game-level snapshot system — publishers edit freely, players always see the last explicitly published snapshot, and any past snapshot can be restored.

## Scope

- New `game_snapshots` table
- Remove `publish_status` from `cards` table and all application code
- Update play route to read from snapshots
- Publish flow: insert snapshot on publish
- Revert flow: restore a previous snapshot
- Version history UI in the studio
- RLS on `game_snapshots`

**Out of scope:** Per-card draft visibility (removed entirely), scheduled publishing, preview links for external stakeholders (covered by viewer role in Spec F).

## Data model

### New table — `game_snapshots`

```sql
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
```

### `snapshot` JSONB structure

Complete serialized game state — everything needed to render the play route:

```ts
type GameSnapshot = {
  gameId: string;
  title: string;
  systemSettings: SystemSettings;
  cardOrder: string[];
  pages: PageItem[];  // all cards, all content
}
```

### Remove `publish_status` from `cards`

```sql
ALTER TABLE cards DROP COLUMN publish_status;
```

Remove `publishStatus` from:
- `authoring-types.ts` — `PageItem` type, `PublishStatus` type
- `supabase-game.ts` — `saveGame()` card rows, `loadGame()` mapping
- `usePageHandlers.ts` — `handlePublishStatusChange`, `handleSidebarPublishStatusChange`
- `authoring-studio.tsx` — publish-all logic, status checks
- `page-sidebar.tsx` — per-card publish toggle
- `page-editor-modal.tsx` — publish status prop
- `player-view.tsx` — `publishStatus === "published"` filters (now reads snapshot, always fully published)

### RLS on `game_snapshots`

```sql
-- Read: member of game (any role) OR anon access for published games
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

-- Update: owner or editor (for adding/editing label only)
CREATE POLICY "snapshots_update" ON game_snapshots FOR UPDATE USING (
  user_game_role(game_id) IN ('owner', 'editor')
);

-- Delete: owner only
CREATE POLICY "snapshots_delete" ON game_snapshots FOR DELETE USING (
  user_game_role(game_id) = 'owner'
);
```

## Publish flow

Publisher clicks "Publish" in the studio toolbar:

1. Confirmation modal: "This will make your current game live for all players. Continue?"  
   Buttons: "Publish now" (primary blue) · "Cancel"
2. On confirm: serialize current `pages` + `systemSettings` + `title` + `cardOrder` into a `GameSnapshot`
3. Insert row into `game_snapshots` with `game_id`, `snapshot`, `published_by = auth.uid()`
4. Success toast: "Your game is now live at [slug].sherpa.build" (or private link if no slug set)
5. Studio header/toolbar updates to show "Published" status with timestamp

No changes to `games` or `cards` tables on publish — publishers continue editing those freely.

## Play route

`loadGame()` for the play route (`publishedOnly: true`) changes to:

```ts
// Fetch latest snapshot for this game
const { data: snapshot } = await supabase
  .from("game_snapshots")
  .select("snapshot")
  .eq("game_id", gameId)
  .order("published_at", { ascending: false })
  .limit(1)
  .single();

if (!snapshot) return null; // no published snapshot → 404
return deserializeSnapshot(snapshot.snapshot);
```

`loadGame()` without `publishedOnly` (studio) continues reading from `games` + `cards` tables as today — publishers always see their live working state.

## Revert flow

Publisher opens version history → selects a past snapshot → clicks "Restore":

1. Confirmation modal: "This will restore your game to [date] and publish it immediately. Your current unpublished changes will be overwritten. Continue?"  
   Buttons: "Restore and publish" (primary blue) · "Cancel"
2. On confirm:
   - Insert a new `game_snapshots` row with the selected snapshot's content (preserves history — never destructive)
   - Overwrite `games` and `cards` tables with the restored snapshot content so the studio reflects the restored state
3. Success toast: "Game restored to [date] and published"

Revert always publishes — there is no "restore to draft only" because the purpose of revert is to fix what players see.

## Version history UI

Located in the Game tab (experience tab area) of the editor panel.

**List view:**
- Each row: date + time · published by (name/email) · label (if set) · "Restore" button
- Most recent at top, labelled "Current live version"
- Shows last 20 snapshots (pagination deferred)
- Empty state: "You haven't published this game yet"

**Label editing:**
- Each snapshot row has an optional inline text field for a label ("v2 launch", "holiday edition")
- Label saves on blur via PATCH to `game_snapshots`

## Studio UI changes

| Location | Change |
|----------|--------|
| Toolbar | "Publish" button triggers confirmation modal, shows published timestamp after publish |
| Game tab | New "Version history" section with snapshot list and restore flow |
| Page sidebar | Remove per-card publish toggle entirely |
| Editor panel | Remove publish status field from card inspector |
| Page editor modal | Remove `onPublishStatusChange` prop |

## Migration — existing data

Existing published cards have `publish_status = 'published'`. Before dropping the column:

1. For each game that has at least one card with `publish_status = 'published'`, create an initial snapshot from the current published state
2. This ensures existing games don't lose their published state when the column is removed

```sql
-- Run before dropping publish_status column
-- Creates initial snapshots for all currently-published games
-- (Implementation: script that reads each game, serializes to JSONB, inserts snapshot)
```

This migration script runs once in the Supabase SQL editor before the code deploy.

## Files changed

| File | Change |
|------|--------|
| `supabase/add-snapshots.sql` | New — `game_snapshots` table, indexes, RLS policies |
| `supabase/migrate-publish-status.sql` | New — one-time migration script |
| `app/_lib/authoring-types.ts` | Remove `PublishStatus`, `publishStatus` from `PageItem`, add `GameSnapshot` type |
| `app/_lib/supabase-game.ts` | Update `loadGame()` for play route to read snapshots, add `publishGame()`, `loadSnapshots()`, `restoreSnapshot()` |
| `app/_lib/authoring-utils.ts` | Add `serializeSnapshot()`, `deserializeSnapshot()` |
| `app/_components/authoring-studio.tsx` | Wire publish button to `publishGame()`, remove publish-all logic |
| `app/_components/editor/experience-tab.tsx` | Add version history section |
| `app/_components/publish-confirm-modal.tsx` | New — publish confirmation modal |
| `app/_components/restore-confirm-modal.tsx` | New — restore confirmation modal |
| `app/_components/page-sidebar.tsx` | Remove per-card publish toggle |
| `app/_components/page-editor-modal.tsx` | Remove `onPublishStatusChange` prop |
| `app/_components/player-view.tsx` | Remove `publishStatus` filters |
| `app/_hooks/usePageHandlers.ts` | Remove publish status handlers |
| Supabase dashboard | Run migration scripts in order |

## Verification

1. Publish a game → confirm snapshot row created in `game_snapshots`
2. Load play route → confirm it reads from snapshot, not live rows
3. Edit a card after publishing → confirm play route still shows pre-edit content
4. Publish again → confirm play route now shows updated content
5. Open version history → confirm both snapshots appear with correct timestamps
6. Restore a previous snapshot → confirm play route reverts, studio reflects restored state
7. Create a new game, don't publish → confirm play route returns 404
8. Confirm per-card publish toggles are gone from sidebar and editor
9. Confirm existing published games have an initial snapshot after migration
