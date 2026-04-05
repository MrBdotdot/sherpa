-- Fixes infinite recursion in public_read_cards policy.
-- The original policy had a subquery on `cards` inside a policy on `cards`,
-- causing Postgres to recurse infinitely.
-- Solution: a SECURITY DEFINER function that bypasses RLS for the check.
-- Also fixes the "mutable search_path" security advisor warning.

DROP POLICY IF EXISTS "public_read_games" ON games;
DROP POLICY IF EXISTS "public_read_cards" ON cards;

-- Bypasses RLS — safe because it only checks publish_status, not user data.
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

CREATE POLICY "public_read_games" ON games
  FOR SELECT
  USING (public_game_is_accessible(id));

CREATE POLICY "public_read_cards" ON cards
  FOR SELECT
  USING (
    publish_status = 'published'
    AND public_game_is_accessible(game_id)
  );
