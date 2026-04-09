# RLS Lockdown & Team Access — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

Current RLS policies on `games` and `cards` use `USING (true)` — any authenticated user can read, write, update, or delete any game. A publisher who knows another publisher's `gameId` can overwrite or delete their work. This spec locks down data isolation using a `game_members` join table that supports owner/editor/viewer roles from the start, so team access is a UI build rather than a future database migration.

## Scope

- New `game_members` table with role-based access
- RLS policies on `games`, `cards`, and `game_members`
- Trigger: auto-insert owner membership on game creation
- Remove `user_id` from `saveGame()` (column not in schema, silently ignored today)
- Keep existing public read policies for player access to published games

**Out of scope:** Team management UI (invite flow, member list, role changes — future feature), plan gating on game count, transfer ownership UI.

## Data model

### `game_members` table

```sql
CREATE TABLE game_members (
  game_id  text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role     text NOT NULL CHECK (role IN ('owner', 'editor', 'viewer')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (game_id, user_id)
);

ALTER TABLE game_members ENABLE ROW LEVEL SECURITY;
```

### Roles

| Role | Can read draft | Can edit content | Can delete game | Can manage members |
|------|---------------|-----------------|-----------------|-------------------|
| owner | ✓ | ✓ | ✓ | ✓ |
| editor | ✓ | ✓ | ✗ | ✗ |
| viewer | ✓ | ✗ | ✗ | ✗ |

### Auto-owner trigger

On `INSERT` into `games`, automatically insert a `game_members` row for the creating user with `role = 'owner'`. The studio never manually creates membership.

```sql
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

CREATE TRIGGER on_game_created
  AFTER INSERT ON games
  FOR EACH ROW EXECUTE FUNCTION assign_game_owner();
```

### Helper function

Reusable membership check used across RLS policies:

```sql
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
```

## RLS policies

### `games` table

Drop existing open policy. Replace with:

```sql
-- Read: member of any role OR publicly accessible (published)
CREATE POLICY "games_select" ON games FOR SELECT USING (
  user_game_role(id) IS NOT NULL
  OR public_game_is_accessible(id)
);

-- Insert: any authenticated user (trigger assigns them as owner)
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
```

### `cards` table

Drop existing open policy. Replace with:

```sql
-- Read: member of parent game (any role) OR card is published and game is accessible
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
```

### `game_members` table

```sql
-- Read: members can see other members of games they belong to
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

-- Delete: owner can remove members (cannot remove self if last owner — enforced by application)
CREATE POLICY "members_delete" ON game_members FOR DELETE USING (
  user_game_role(game_id) = 'owner'
);
```

## Application changes

### `supabase-game.ts` — `saveGame()`
Remove `userId` parameter and `user_id` field from the upsert. Ownership is handled by the database trigger.

```ts
// Before:
export async function saveGame(gameId, userId, ...)
  supabase.from("games").upsert({ id: gameId, user_id: userId, ... })

// After:
export async function saveGame(gameId, ...)
  supabase.from("games").upsert({ id: gameId, ... })
```

Update all callers of `saveGame()` to remove the `userId` argument.

### Game switcher / game list
`loadAllGames()` (or equivalent) — query changes from `select * from games` to `select games.* from games inner join game_members on games.id = game_members.game_id where game_members.user_id = auth.uid()`. This ensures publishers only see their own games (or games they're members of).

## Migration notes

Existing games in the database have no `game_members` rows — they will be inaccessible to their owners after RLS is applied. Before deploying:

```sql
-- Backfill: assign existing games to their creator
-- Run this BEFORE applying new RLS policies
-- Requires knowing which user_id created each game.
-- If user_id was never stored (column missing from schema), 
-- this must be done manually or games assigned to a known admin user.
INSERT INTO game_members (game_id, user_id, role)
SELECT id, '<admin-user-uuid>', 'owner'
FROM games
ON CONFLICT DO NOTHING;
```

**Action required:** Before deploying, retrieve the `user_id` values from Supabase Auth logs or reassign existing games to the correct owner manually via the Supabase dashboard. This is a one-time migration step.

## Files changed

| File / Location | Change |
|----------------|--------|
| `supabase/add-rls.sql` | New — full SQL for `game_members` table, trigger, helper function, all policies |
| `app/_lib/supabase-game.ts` | Remove `userId` param from `saveGame()`, update game list query |
| `app/_hooks/useGameLoader.ts` | Remove `userId` from `saveGame()` call |
| `app/_hooks/useSave.ts` | Remove `userId` from `saveGame()` call |
| Supabase dashboard | Run `add-rls.sql` in SQL editor after backfill |

## Verification

1. Create two test accounts (Publisher A, Publisher B)
2. Publisher A creates a game — confirm Publisher B cannot read, edit, or delete it in the studio
3. Publisher A publishes the game — confirm Publisher B (and anonymous users) can read it via the play route
4. Publisher A's game list shows only their games, not Publisher B's
5. Manually insert a `game_members` row giving Publisher B `editor` role on Publisher A's game — confirm Publisher B can now edit but not delete
6. Manually insert a `game_members` row giving Publisher B `viewer` role — confirm Publisher B can open but not edit
7. Publisher A deletes their game — confirm `game_members` rows are cascade deleted
8. Existing games (backfilled) remain accessible to their assigned owner
