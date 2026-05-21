import { createClient } from "@supabase/supabase-js";

// Service-role key bypasses RLS — server use only, never in the client bundle.
// `createClient` validates its URL argument synchronously, so the fallback `?? ""`
// will throw at module load if `NEXT_PUBLIC_SUPABASE_URL` is missing. That's
// intentional: a missing URL is a deployment misconfiguration, not a recoverable
// runtime condition. Tests provide a placeholder URL via `vitest.config.ts`.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);
