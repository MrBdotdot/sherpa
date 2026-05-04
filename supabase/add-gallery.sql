-- Run this in the Supabase Dashboard → SQL Editor.
-- Adds the `featured` flag used by the public gallery to pin one game to
-- the top of the directory. Default false; flip per-game in the DB.

ALTER TABLE games ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
