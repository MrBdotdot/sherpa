import { createClient } from "@supabase/supabase-js";

// Service-role key bypasses RLS — server use only, never in the client bundle.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);
