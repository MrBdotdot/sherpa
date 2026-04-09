-- Run in Supabase Dashboard → SQL Editor
-- Creates the profiles table for plan/billing state.
-- Run after add-auth.sql and add-game-publish.sql.

CREATE TABLE IF NOT EXISTS profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                    text NOT NULL DEFAULT 'free',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_expires_at         timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can read their own row; only service role can write
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Block direct writes from authenticated users (only service role can write)
CREATE POLICY "block_user_insert_profiles" ON profiles
  FOR INSERT WITH CHECK (false);

CREATE POLICY "block_user_update_profiles" ON profiles
  FOR UPDATE USING (false);

CREATE POLICY "block_user_delete_profiles" ON profiles
  FOR DELETE USING (false);

-- Trigger: keep updated_at current (reuses the existing trigger function)
CREATE TRIGGER IF NOT EXISTS update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create a free profile row when a new user signs up
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER IF NOT EXISTS on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();
