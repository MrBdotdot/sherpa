const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://us.posthog.com";
const POSTHOG_API_KEY = process.env.POSTHOG_API_KEY ?? "";
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID ?? "";

export interface HogQLResult {
  results: unknown[][];
  columns: string[];
}

/**
 * Execute a HogQL query against PostHog's Query API.
 * Server-side only — uses POSTHOG_API_KEY which must never reach the client.
 */
export async function hogql(query: string): Promise<HogQLResult> {
  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
      },
      body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog query failed ${res.status}: ${text}`);
  }
  const body = await res.json();
  if (!Array.isArray(body?.results) || !Array.isArray(body?.columns)) {
    throw new Error(`PostHog returned unexpected shape: ${JSON.stringify(body)}`);
  }
  return body as HogQLResult;
}
