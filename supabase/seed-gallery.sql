-- Run this in the Supabase Dashboard → SQL Editor.
-- Seeds the 6 hand-written gallery entries from app/_lib/gallery-data.ts as real
-- games rows. Idempotent: ON CONFLICT DO NOTHING.
--
-- Pre-req: a service auth user "sherpa-curated@sherpa.so" must exist with a
-- known UUID. Create it once via Supabase Auth (Dashboard → Authentication →
-- Add user → Email "sherpa-curated@sherpa.so") and paste the resulting UUID
-- into the @curator_id placeholder below before running.

DO $$
DECLARE
  curator_id uuid := '<PASTE_CURATOR_UUID_HERE>';
BEGIN
  IF curator_id IS NULL THEN
    RAISE EXCEPTION 'Set curator_id to the UUID of sherpa-curated@sherpa.so before running';
  END IF;

  INSERT INTO games (id, title, user_id, publish_status, featured, system_settings)
  VALUES
    (
      'ironveil', 'Ironveil', curator_id, 'published', true,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'A hidden-movement thriller set in a city under occupation.',
        'designer',    'Marcus Drenn',
        'playerCount', '3–6',
        'playTime',    '90–120 min',
        'complexity',  'Heavy',
        'ageRange',    '17+',
        'tags',        jsonb_build_array('thematic', 'hidden-movement', 'asymmetric'),
        'cardImage',   'https://images.unsplash.com/photo-1514565131-fce0801e6785?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'cascade', 'Cascade', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'A river-routing game where every dam changes everything downstream.',
        'designer',    'Elara Voss',
        'playerCount', '2–4',
        'playTime',    '60–90 min',
        'complexity',  'Medium',
        'ageRange',    '13+',
        'tags',        jsonb_build_array('strategy', 'tile-placement'),
        'cardImage',   'https://images.unsplash.com/photo-1469474968028-56623f02e42e?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'solaseed', 'Solaseed', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'Grow a garden on a dying moon. Cooperate or perish.',
        'designer',    'Priya Nath',
        'playerCount', '1–4',
        'playTime',    '45–60 min',
        'complexity',  'Light',
        'ageRange',    '8+',
        'tags',        jsonb_build_array('cooperative', 'engine-building'),
        'cardImage',   'https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'switchback', 'Switchback', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'A mountain rally pressed into 40-second turns.',
        'designer',    'Hana Okabe',
        'playerCount', '2–5',
        'playTime',    '30–45 min',
        'complexity',  'Medium',
        'ageRange',    '8+',
        'tags',        jsonb_build_array('racing', 'strategy'),
        'cardImage',   'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'foundry-9', 'Foundry 9', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'A company town, a brittle supply chain, three generations.',
        'designer',    'Yusuf Adeyemi',
        'playerCount', '3–5',
        'playTime',    '120–180 min',
        'complexity',  'Heavy',
        'ageRange',    '17+',
        'tags',        jsonb_build_array('economic', 'strategy'),
        'cardImage',   'https://images.unsplash.com/photo-1518709594023-6eab9bab7b23?q=80&w=800&auto=format&fit=crop'
      ))
    ),
    (
      'papercut', 'Papercut', curator_id, 'published', false,
      jsonb_build_object('gameMeta', jsonb_build_object(
        'tagline',     'Write letters, deliver them in character, betray gently.',
        'designer',    'Mira Delacroix',
        'playerCount', '4–8',
        'playTime',    '25 min',
        'complexity',  'Light',
        'ageRange',    '13+',
        'tags',        jsonb_build_array('party', 'storytelling'),
        'cardImage',   'https://images.unsplash.com/photo-1524293568345-75d62c3664f7?q=80&w=800&auto=format&fit=crop'
      ))
    )
  ON CONFLICT (id) DO NOTHING;
END $$;
