-- Run in Supabase Dashboard → SQL Editor
-- Requires: schema.sql, add-auth.sql already applied.

-- ── Ownership helper (breaks circular RLS between games ↔ game_members) ──────
-- SECURITY DEFINER means it runs as the function owner (postgres), bypassing
-- RLS on games. Without this, policies on game_members that subquery games
-- cause infinite recursion when games policies subquery game_members.
CREATE OR REPLACE FUNCTION is_game_owner(p_game_id text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM games WHERE id = p_game_id AND user_id = auth.uid()
  );
$$;

-- ── game_members ─────────────────────────────────────────────────────────────
-- Accepted collaborators. Owner is NOT stored here — ownership is games.user_id.
CREATE TABLE IF NOT EXISTS game_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id      text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('editor', 'viewer')),
  email        text NOT NULL,         -- denormalized from auth.users at acceptance time
  display_name text,                  -- denormalized from user_metadata at acceptance time
  invited_by   uuid REFERENCES auth.users(id),
  joined_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id)
);

ALTER TABLE game_members ENABLE ROW LEVEL SECURITY;

-- Owners manage their games' members
CREATE POLICY "owners_manage_members" ON game_members
  FOR ALL
  USING (is_game_owner(game_id))
  WITH CHECK (is_game_owner(game_id));

-- ── game_invitations ─────────────────────────────────────────────────────────
-- Pending invitations. Converted to game_members on acceptance.
CREATE TABLE IF NOT EXISTS game_invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        text NOT NULL CHECK (role IN ('editor', 'viewer')),
  token       uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  invited_by  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  expires_at  timestamptz NOT NULL DEFAULT now() + INTERVAL '7 days',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, email)
);

ALTER TABLE game_invitations ENABLE ROW LEVEL SECURITY;

-- Owners manage invitations for their games
CREATE POLICY "owners_manage_invitations" ON game_invitations
  FOR ALL
  USING (is_game_owner(game_id))
  WITH CHECK (is_game_owner(game_id));

-- ── Extended RLS on games ─────────────────────────────────────────────────────
-- Allow editors to read and update games they are members of.
-- (Existing "users_own_games" policy remains — these are additive via OR.)

CREATE POLICY "editors_read_games" ON games
  FOR SELECT USING (
    id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "editors_update_games" ON games
  FOR UPDATE USING (
    id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  ) WITH CHECK (
    id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "viewers_read_games" ON games
  FOR SELECT USING (
    id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'viewer')
  );

-- ── Extended RLS on cards ─────────────────────────────────────────────────────

CREATE POLICY "editors_read_cards" ON cards
  FOR SELECT USING (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "editors_write_cards" ON cards
  FOR INSERT WITH CHECK (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "editors_update_cards" ON cards
  FOR UPDATE USING (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  ) WITH CHECK (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "editors_delete_cards" ON cards
  FOR DELETE USING (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'editor')
  );

CREATE POLICY "viewers_read_cards" ON cards
  FOR SELECT USING (
    game_id IN (SELECT game_id FROM game_members WHERE user_id = auth.uid() AND role = 'viewer')
  );
