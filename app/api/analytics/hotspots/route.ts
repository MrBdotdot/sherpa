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

  // Both queries are independent — run in parallel
  const [clicksResult, dwellResult] = await Promise.all([
    // Click counts from hotspot_clicked
    hogql(`
      SELECT
        properties.hotspotTitle AS title,
        count() AS clicks
      FROM events
      WHERE event = 'hotspot_clicked'
        AND properties.gameId = '${gameId}'
        AND timestamp >= '${from}'
        AND timestamp < '${to}'
      GROUP BY title
      ORDER BY clicks DESC
      LIMIT 20
    `),
    // Avg dwell time from card_closed (keyed by cardTitle which matches hotspotTitle)
    hogql(`
      SELECT
        properties.cardTitle AS title,
        avg(toFloatOrDefault(properties.durationSeconds)) AS avg_seconds
      FROM events
      WHERE event = 'card_closed'
        AND properties.gameId = '${gameId}'
        AND timestamp >= '${from}'
        AND timestamp < '${to}'
      GROUP BY title
    `),
  ]);

  const dwellMap = new Map(
    dwellResult.results.map((row) => [String(row[0]), Number(row[1]) || 0])
  );

  const maxClicks = Number(clicksResult.results[0]?.[1]) || 1;
  const hotspots = clicksResult.results.map((row) => {
    const clicks = Number(row[1]);
    return {
      title: String(row[0]),
      clicks,
      avgDurationSeconds: dwellMap.get(String(row[0])) ?? 0,
      pct: Math.round((clicks / maxClicks) * 100),
    };
  });

  return Response.json(hotspots);
}
