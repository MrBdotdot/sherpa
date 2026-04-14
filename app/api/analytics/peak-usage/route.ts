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
      toHour(timestamp) AS hour,
      count(distinct distinct_id) AS sessions
    FROM events
    WHERE event = 'game_viewed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY hour
    ORDER BY hour
  `);

  // Fill in hours with zero if missing
  const byHour = new Map(results.map((row) => [Number(row[0]), Number(row[1])]));
  const hours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    sessions: byHour.get(h) ?? 0,
  }));

  return Response.json(hours);
}
