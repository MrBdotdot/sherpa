-- Run this in the Supabase Dashboard -> SQL Editor
-- Allows anyone with a game ID (UUID) to view it as a player.
-- The UUID acts as an unguessable share token - no login required to play.
-- Only published experiences and published cards are publicly readable.

DROP POLICY IF EXISTS "public_read_games" ON games;
DROP POLICY IF EXISTS "public_read_cards" ON cards;

CREATE POLICY "public_read_games" ON games
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM cards
      WHERE cards.game_id = games.id
        AND cards.kind = 'home'
        AND cards.publish_status = 'published'
    )
  );

CREATE POLICY "public_read_cards" ON cards
  FOR SELECT
  USING (
    publish_status = 'published'
    AND game_id IN (
      SELECT game_id FROM cards
      WHERE kind = 'home'
        AND publish_status = 'published'
    )
  );
