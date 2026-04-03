-- Run this in the Supabase Dashboard → SQL Editor
-- Adds user ownership to games and locks RLS down to the authenticated user.

ALTER TABLE games ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Replace open policies with user-scoped ones
DROP POLICY IF EXISTS "open_games" ON games;
DROP POLICY IF EXISTS "open_cards" ON cards;

CREATE POLICY "users_own_games" ON games
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_own_cards" ON cards
  FOR ALL
  USING (game_id IN (SELECT id FROM games WHERE user_id = auth.uid()))
  WITH CHECK (game_id IN (SELECT id FROM games WHERE user_id = auth.uid()));
