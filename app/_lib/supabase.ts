import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(
  url || "https://placeholder.supabase.co",
  key || "placeholder",
  {
    auth: {
      // We bootstrap the session in useAuth and start refresh manually after
      // that. This avoids eager refresh attempts during client creation from
      // spamming the console when a revoked refresh token is still in storage.
      autoRefreshToken: false,
    },
  }
);
