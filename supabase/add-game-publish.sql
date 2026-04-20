-- Run this in the Supabase Dashboard → SQL Editor
-- Moves publish state from per-card to per-game.
-- Run AFTER add-auth.sql.

-- 1. Add publish_status column to games
ALTER TABLE games ADD COLUMN IF NOT EXISTS publish_status text NOT NULL DEFAULT 'draft';

-- 2. Migrate existing data: if ALL cards in a game were published, mark the game as published
UPDATE games
SET publish_status = 'published'
WHERE id IN (
  SELECT g.id FROM games g
  WHERE NOT EXISTS (
    SELECT 1 FROM cards c
    WHERE c.game_id = g.id
      AND c.publish_status = 'draft'
  )
  AND EXISTS (
    SELECT 1 FROM cards c WHERE c.game_id = g.id
  )
);

-- 3. Replace card-based public read policies with game-level ones
DROP POLICY IF EXISTS "public_read_games" ON games;
DROP POLICY IF EXISTS "public_read_cards" ON cards;
DROP FUNCTION IF EXISTS public_game_is_accessible(text);

CREATE POLICY "public_read_games" ON games
  FOR SELECT
  USING (publish_status = 'published');

CREATE POLICY "public_read_cards" ON cards
  FOR SELECT
  USING (
    game_id IN (SELECT id FROM games WHERE publish_status = 'published')
  );
