# RLS Lockdown & Team Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the open `USING (true)` RLS policies on `games` and `cards` with membership-scoped policies backed by a new `game_members` join table.
**Architecture:** A `game_members` table (game_id, user_id, role) is the single source of truth for who can access what; a `SECURITY DEFINER` helper function `user_game_role()` is called from all RLS policies to avoid recursion and to keep the policies readable; an `AFTER INSERT` trigger on `games` auto-creates the owner membership row so the application never has to manage it.
**Tech Stack:** PostgreSQL RLS, Supabase SQL editor, TypeScript / Next.js (`app/_lib/supabase-game.ts`, `app/_hooks/useGameLoader.ts`, `app/_components/game-switcher-modal.tsx`).

---

> **CRITICAL PREREQUISITE — read before executing any task:**
> Existing games have no `game_members` rows. The moment new RLS policies are applied, every existing game becomes inaccessible to its owner. The backfill in **Task 1** MUST be run in the Supabase SQL editor BEFORE the policies in **Task 2** are applied. Do not skip or reorder these two steps.

---

### Task 1: Backfill existing games to an owner (manual, run FIRST)

**Files:**
- Create: `supabase/backfill-game-members.sql`

- [ ] Step 1: Retrieve the UUID of the admin/creator user from Supabase Auth dashboard → Users. Copy the UUID — it will be substituted below.

- [ ] Step 2: Create the backfill SQL file:

```sql
-- supabase/backfill-game-members.sql
-- PURPOSE: Assign all existing games to a known owner BEFORE RLS policies are applied.
-- Run this FIRST in the Supabase SQL editor. Replace <admin-user-uuid> with the real UUID.
-- This is a one-time migration — safe to re-run (ON CONFLICT DO NOTHING).

INSERT INTO game_members (game_id, user_id, role)
SELECT id, '<admin-user-uuid>', 'owner'
FROM games
ON CONFLICT DO NOTHING;
```

- [ ] Step 3: Open the Supabase dashboard → SQL Editor. Paste the contents of `backfill-game-members.sql` with the real UUID substituted and run it.

- [ ] Step 4: Verify the backfill succeeded:

```sql
SELECT COUNT(*) FROM game_members;
-- Should equal the number of rows in games.
SELECT COUNT(*) FROM games;
```

- [ ] Step 5: Commit the SQL file (without the real UUID — keep `<admin-user-uuid>` as the placeholder):

```
git add supabase/backfill-game-members.sql
git commit -m "chore: add game_members backfill script for RLS migration"
```

---

### Task 2: Create supabase/add-rls.sql with full migration

**Files:**
- Create: `supabase/add-rls.sql`

- [ ] Step 1: Create the file with the complete migration. This script is idempotent — safe to re-run.

```sql
-- supabase/add-rls.sql
-- RLS Lockdown & Team Access — run in Supabase SQL editor AFTER backfill-game-members.sql

-- ──────────────────────────────────────────
-- 1. game_members table
-- ──────────────────────────────────────────

CREATE TABLE IF NOT EXISTS game_members (
  game_id    text        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, user_id)
);

ALTER TABLE game_members ENABLE ROW LEVEL SECURITY;

-- ──────────────────────────────────────────
-- 2. Helper: user_game_role(gid)
--    Returns 'owner' | 'editor' | 'viewer' | NULL for current user on given game.
--    SECURITY DEFINER so it can read game_members without RLS recursion.
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION user_game_role(gid text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT role FROM public.game_members
  WHERE game_id = gid AND user_id = auth.uid()
  LIMIT 1;
$$;

-- ──────────────────────────────────────────
-- 3. Auto-owner trigger: fires after INSERT on games,
--    inserts a game_members row for the creating user.
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION assign_game_owner()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.game_members (game_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_game_created ON games;

CREATE TRIGGER on_game_created
  AFTER INSERT ON games
  FOR EACH ROW EXECUTE FUNCTION assign_game_owner();

-- ──────────────────────────────────────────
-- 4. Drop existing open policies
-- ──────────────────────────────────────────

DROP POLICY IF EXISTS "open_games" ON games;
DROP POLICY IF EXISTS "open_cards" ON cards;

-- Also drop the earlier public-read policies that will be superseded below.
DROP POLICY IF EXISTS "public_read_games" ON games;
DROP POLICY IF EXISTS "public_read_cards" ON cards;

-- ──────────────────────────────────────────
-- 5. public_game_is_accessible() helper
--    Kept from fix-public-read-recursion.sql — recreated here for completeness.
--    SECURITY DEFINER avoids infinite recursion inside cards policies.
-- ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public_game_is_accessible(gid text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.cards
    WHERE cards.game_id = gid
      AND cards.kind = 'home'
      AND cards.publish_status = 'published'
  );
$$;

-- ──────────────────────────────────────────
-- 6. games policies
-- ──────────────────────────────────────────

-- Read: member of any role, OR game is publicly accessible (published home card exists)
CREATE POLICY "games_select" ON games FOR SELECT USING (
  user_game_role(id) IS NOT NULL
  OR public_game_is_accessible(id)
);

-- Insert: any authenticated user — trigger assigns them as owner
CREATE POLICY "games_insert" ON games FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Update: owner or editor
CREATE POLICY "games_update" ON games FOR UPDATE USING (
  user_game_role(id) IN ('owner', 'editor')
);

-- Delete: owner only
CREATE POLICY "games_delete" ON games FOR DELETE USING (
  user_game_role(id) = 'owner'
);

-- ──────────────────────────────────────────
-- 7. cards policies
-- ──────────────────────────────────────────

-- Read: member of parent game (any role), OR card is published and game is accessible
CREATE POLICY "cards_select" ON cards FOR SELECT USING (
  user_game_role(game_id) IS NOT NULL
  OR (publish_status = 'published' AND public_game_is_accessible(game_id))
);

-- Insert: owner or editor on parent game
CREATE POLICY "cards_insert" ON cards FOR INSERT
  WITH CHECK (user_game_role(game_id) IN ('owner', 'editor'));

-- Update: owner or editor on parent game
CREATE POLICY "cards_update" ON cards FOR UPDATE USING (
  user_game_role(game_id) IN ('owner', 'editor')
);

-- Delete: owner or editor on parent game
CREATE POLICY "cards_delete" ON cards FOR DELETE USING (
  user_game_role(game_id) IN ('owner', 'editor')
);

-- ──────────────────────────────────────────
-- 8. game_members policies
-- ──────────────────────────────────────────

-- Read: any member of the game can see other members
CREATE POLICY "members_select" ON game_members FOR SELECT USING (
  user_game_role(game_id) IS NOT NULL
);

-- Insert: owner can add members
CREATE POLICY "members_insert" ON game_members FOR INSERT
  WITH CHECK (user_game_role(game_id) = 'owner');

-- Update: owner can change roles
CREATE POLICY "members_update" ON game_members FOR UPDATE USING (
  user_game_role(game_id) = 'owner'
);

-- Delete: owner can remove members
-- Note: preventing self-removal of the last owner is enforced by the application, not the DB.
CREATE POLICY "members_delete" ON game_members FOR DELETE USING (
  user_game_role(game_id) = 'owner'
);
```

- [ ] Step 2: Commit:

```
git add supabase/add-rls.sql
git commit -m "feat: add RLS lockdown SQL — game_members table, scoped policies, auto-owner trigger"
```

- [ ] Step 3: Open the Supabase dashboard → SQL Editor, paste the full contents of `supabase/add-rls.sql`, and run it. Confirm zero errors.

- [ ] Step 4: Verify policies exist:

```sql
SELECT policyname, tablename, cmd
FROM pg_policies
WHERE tablename IN ('games', 'cards', 'game_members')
ORDER BY tablename, cmd;
-- Expected: games (SELECT/INSERT/UPDATE/DELETE), cards (SELECT/INSERT/UPDATE/DELETE),
--           game_members (SELECT/INSERT/UPDATE/DELETE) — no more "open_games" or "open_cards"
```

---

### Task 3: Update `saveGame()` — remove `userId` parameter

**Files:**
- Modify: `app/_lib/supabase-game.ts`

- [ ] Step 1: Open `app/_lib/supabase-game.ts`. Remove `userId: string` from the `saveGame` signature and remove `user_id: userId` from the `games` upsert object:

```ts
// Before:
export async function saveGame(
  gameId: string,
  userId: string,
  gameTitle: string,
  pages: PageItem[],
  systemSettings: SystemSettings
): Promise<void> {
  // ...
  const { error: gameError } = await supabase.from("games").upsert({
    id: gameId,
    user_id: userId,
    title: gameTitle,
    system_settings: systemSettings,
    card_order: cardOrder,
  });

// After:
export async function saveGame(
  gameId: string,
  gameTitle: string,
  pages: PageItem[],
  systemSettings: SystemSettings
): Promise<void> {
  // ...
  const { error: gameError } = await supabase.from("games").upsert({
    id: gameId,
    title: gameTitle,
    system_settings: systemSettings,
    card_order: cardOrder,
  });
```

- [ ] Step 2: Run `npm run build` — Expected: TypeScript errors in callers of `saveGame` (two files), zero other errors. This confirms the parameter removal is caught statically.

---

### Task 4: Update caller — `useGameLoader.ts`

**Files:**
- Modify: `app/_hooks/useGameLoader.ts`

- [ ] Step 1: In `app/_hooks/useGameLoader.ts`, find the `saveGame` call at line ~157 and remove the `userId` argument:

```ts
// Before:
saveGame(currentGameId, userId, currentGameName, persistablePages, persistableSystemSettings)

// After:
saveGame(currentGameId, currentGameName, persistablePages, persistableSystemSettings)
```

- [ ] Step 2: Run `npm run build` — Expected: one remaining TypeScript error (in `game-switcher-modal.tsx`), the `useGameLoader` error is gone.

---

### Task 5: Update caller — `game-switcher-modal.tsx`

**Files:**
- Modify: `app/_components/game-switcher-modal.tsx`

- [ ] Step 1: In `app/_components/game-switcher-modal.tsx`, find the `saveGame` call at line ~55 and remove the `userId` argument:

```ts
// Before:
await saveGame(id, userId, trimmed, starterPages, systemSettings);

// After:
await saveGame(id, trimmed, starterPages, systemSettings);
```

- [ ] Step 2: Run `npm run build` — Expected: clean build, zero TypeScript errors.

- [ ] Step 3: Commit:

```
git add app/_lib/supabase-game.ts app/_hooks/useGameLoader.ts app/_components/game-switcher-modal.tsx
git commit -m "refactor: remove userId param from saveGame — ownership handled by DB trigger"
```

---

### Task 6: Update game list query to join through `game_members`

**Files:**
- Modify: `app/_components/game-switcher-modal.tsx`

The current query filters by `user_id` column on the `games` table, which no longer exists in the schema (it was never in `schema.sql` and is silently ignored). After RLS is active, the correct filter is the membership join — but since RLS already limits rows to the current user's games via policy, a simple `select` without `.eq("user_id", userId)` is sufficient. The Supabase client sends the user's JWT automatically; the `games_select` policy enforces `user_game_role(id) IS NOT NULL`.

- [ ] Step 1: In `app/_components/game-switcher-modal.tsx`, find the game list query (around line 166–171) and remove the `.eq("user_id", userId)` filter:

```ts
// Before:
supabase
  .from("games")
  .select("id, title, system_settings")
  .eq("user_id", userId)
  .order("updated_at", { ascending: false })

// After:
supabase
  .from("games")
  .select("id, title, system_settings")
  .order("updated_at", { ascending: false })
```

- [ ] Step 2: Run `npm run build` — Expected: clean build.

- [ ] Step 3: Commit:

```
git add app/_components/game-switcher-modal.tsx
git commit -m "fix: remove user_id filter from game list — RLS policy now scopes rows to member games"
```

---

### Task 7: End-to-end verification

No code changes — manual QA steps to run after all SQL and code changes are deployed.

- [ ] Step 1: Log in as Publisher A. Confirm existing (backfilled) games appear in the game switcher.

- [ ] Step 2: Publisher A creates a new game. Confirm the `game_members` table now has a row `(new_game_id, publisher_a_uuid, 'owner')`.

- [ ] Step 3: Log in as Publisher B (second test account). Confirm Publisher B's game switcher shows zero games from Publisher A's list.

- [ ] Step 4: Publisher A publishes a game (home card `publish_status = 'published'`). Confirm Publisher B and an anonymous user can read that game via the play route.

- [ ] Step 5: Manually insert an editor membership for Publisher B on Publisher A's game:

```sql
INSERT INTO game_members (game_id, user_id, role)
VALUES ('<publisher-a-game-id>', '<publisher-b-uuid>', 'editor');
```

Confirm Publisher B can now see and edit that game but cannot delete it.

- [ ] Step 6: Change Publisher B's role to `viewer`:

```sql
UPDATE game_members SET role = 'viewer'
WHERE game_id = '<publisher-a-game-id>' AND user_id = '<publisher-b-uuid>';
```

Confirm Publisher B can open the game but save operations fail (edit controls should be read-only — note: read-only UI is out of scope for this plan, but save RPC calls must be rejected by RLS).

- [ ] Step 7: Publisher A deletes a game. Confirm the `game_members` rows for that game are cascade deleted:

```sql
SELECT COUNT(*) FROM game_members WHERE game_id = '<deleted-game-id>';
-- Expected: 0
```
