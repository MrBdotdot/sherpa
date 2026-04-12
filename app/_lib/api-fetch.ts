import { supabase } from "./supabase";

/**
 * fetch() wrapper that attaches the current Supabase session token as a
 * Bearer Authorization header. Server-side routes read this via getRequestUser()
 * instead of relying on cookies (which aren't set by the standard createClient).
 */
export async function apiFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = new Headers(init.headers);
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  return fetch(input, { ...init, headers });
}
