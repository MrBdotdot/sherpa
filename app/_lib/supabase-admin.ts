import { createClient } from "@supabase/supabase-js";

// Service-role key bypasses RLS — server use only, never in the client bundle.
// We do not throw here so that the Next.js build can evaluate this module even
// when the env var is absent (e.g. during Vercel's page-data collection step).
// If the key is genuinely missing at runtime, Supabase requests will return 401.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);
