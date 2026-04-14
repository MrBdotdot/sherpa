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
      concat(first_card, ' → ', second_card) AS path,
      count() AS sessions
    FROM (
      SELECT
        distinct_id,
        groupArray(properties.cardTitle ORDER BY timestamp)[1] AS first_card,
        groupArray(properties.cardTitle ORDER BY timestamp)[2] AS second_card
      FROM events
      WHERE event = 'card_viewed'
        AND properties.gameId = '${gameId}'
        AND timestamp >= '${from}'
        AND timestamp < '${to}'
      GROUP BY distinct_id
      HAVING length(groupArray(properties.cardTitle ORDER BY timestamp)) >= 2
    )
    WHERE second_card != ''
    GROUP BY path
    ORDER BY sessions DESC
    LIMIT 5
  `);

  const total = results.reduce((sum, row) => sum + Number(row[1]), 0) || 1;
  return Response.json(
    results.map((row) => ({
      path: String(row[0]),
      sessions: Number(row[1]),
      pct: Math.round((Number(row[1]) / total) * 100),
    }))
  );
}
