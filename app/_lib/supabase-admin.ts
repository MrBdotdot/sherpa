import { createClient } from "@supabase/supabase-js";

// Service-role key bypasses RLS — server use only, never in the client bundle.
//
// ⚠ SECURITY: this client bypasses Row Level Security. Any query that fronts a
// public, unauthenticated surface (e.g. /gallery, /gallery/[id]) MUST hard-filter
// for the public-visible subset of rows — e.g. `.eq("publish_status", "published")`
// — directly in the query. Do not rely on later filtering in JS, and do not expose
// arbitrary table reads through routes without explicit predicates. See
// `app/_lib/gallery-queries.ts` for the canonical pattern.
//
// `createClient` validates its URL argument synchronously, so the fallback `?? ""`
// will throw at module load if `NEXT_PUBLIC_SUPABASE_URL` is missing. That's
// intentional: a missing URL is a deployment misconfiguration, not a recoverable
// runtime condition. Tests provide a placeholder URL via `vitest.config.ts`.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);
