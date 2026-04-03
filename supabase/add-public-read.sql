-- Run this in the Supabase Dashboard → SQL Editor
-- Allows anyone with a game ID (UUID) to view it as a player.
-- The UUID acts as an unguessable share token — no login required to play.
--
-- To restrict to explicitly published games in future, add an `is_published`
-- column and change USING (true) to USING (is_published = true).

CREATE POLICY "public_read_games" ON games
  FOR SELECT
  USING (true);

CREATE POLICY "public_read_cards" ON cards
  FOR SELECT
  USING (true);
