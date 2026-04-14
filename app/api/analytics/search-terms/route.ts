import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { hogql } from "@/app/_lib/posthog-query";
import { isValidDate, isValidUUID } from "@/app/_lib/analytics-params";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }
  if (!isValidUUID(gameId) || !isValidDate(from) || !isValidDate(to)) {
    return Response.json({ error: "Invalid gameId, from, or to" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { results } = await hogql(`
    SELECT
      lower(trim(properties.query)) AS term,
      count() AS searches
    FROM events
    WHERE event = 'search_performed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY term
    ORDER BY searches DESC
    LIMIT 10
  `);

  return Response.json(
    results.map((row) => ({ query: String(row[0]), count: Number(row[1]) }))
  );
}
