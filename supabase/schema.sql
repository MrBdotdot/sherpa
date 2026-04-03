-- Sherpa schema
-- Run this in the Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS games (
  id text PRIMARY KEY,
  title text NOT NULL DEFAULT 'Untitled Game',
  system_settings jsonb NOT NULL DEFAULT '{}',
  card_order text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS cards (
  id text PRIMARY KEY,
  game_id text NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'page',
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  hero_image text NOT NULL DEFAULT '',
  x float,
  y float,
  mobile_x float,
  mobile_y float,
  content_x float NOT NULL DEFAULT 50,
  content_y float NOT NULL DEFAULT 50,
  mobile_content_x float,
  mobile_content_y float,
  blocks jsonb NOT NULL DEFAULT '[]',
  social_links jsonb NOT NULL DEFAULT '[]',
  canvas_features jsonb NOT NULL DEFAULT '[]',
  public_url text NOT NULL DEFAULT '',
  show_qr_code boolean NOT NULL DEFAULT false,
  interaction_type text NOT NULL DEFAULT 'modal',
  publish_status text NOT NULL DEFAULT 'draft',
  page_button_placement text NOT NULL DEFAULT 'bottom',
  template_id text NOT NULL DEFAULT 'blank',
  card_size text NOT NULL DEFAULT 'medium',
  content_tint_color text NOT NULL DEFAULT '',
  content_tint_opacity float NOT NULL DEFAULT 0.7,
  world_position float[],
  world_normal float[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER games_updated_at
  BEFORE UPDATE ON games
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER cards_updated_at
  BEFORE UPDATE ON cards
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: open policies for now — lock down with auth later
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "open_games" ON games FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "open_cards" ON cards FOR ALL USING (true) WITH CHECK (true);
