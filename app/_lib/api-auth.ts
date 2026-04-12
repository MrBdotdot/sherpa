import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

function cookiesFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name: name.trim(), value: rest.join("=") };
  });
}

/**
 * Returns the authenticated Supabase user from the request.
 *
 * Prefers the Bearer token in the Authorization header (sent by apiFetch),
 * then falls back to cookies for SSR contexts.
 */
export async function getRequestUser(request: Request): Promise<User | null> {
  // Prefer explicit Bearer token — works regardless of cookie setup.
  // auth.getUser(token) validates the JWT against Supabase — no service role needed.
  const authHeader = request.headers.get("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    const { data: { user }, error } = await createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
    ).auth.getUser(token);
    return error ? null : (user ?? null);
  }

  // Fall back to cookies (future SSR / middleware setups)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookiesFromRequest(request),
        setAll: () => {},
      },
    }
  );
  const { data: { user } } = await supabase.auth.getUser();
  return user ?? null;
}
