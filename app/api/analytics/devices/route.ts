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
      properties.layoutMode AS device,
      count() AS sessions
    FROM events
    WHERE event = 'game_viewed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY device
    ORDER BY sessions DESC
  `);

  const total = results.reduce((sum, row) => sum + Number(row[1]), 0) || 1;
  const COLOR_MAP: Record<string, string> = {
    desktop: "#0ea5e9",
    "mobile-landscape": "#8b5cf6",
    "mobile-portrait": "#f59e0b",
  };
  const LABEL_MAP: Record<string, string> = {
    desktop: "Desktop",
    "mobile-landscape": "Mobile Landscape",
    "mobile-portrait": "Mobile Portrait",
  };

  return Response.json(
    results.map((row) => ({
      device: String(row[0]),
      label: LABEL_MAP[String(row[0])] ?? String(row[0]),
      sessions: Number(row[1]),
      pct: Math.round((Number(row[1]) / total) * 100),
      color: COLOR_MAP[String(row[0])] ?? "#94a3b8",
    }))
  );
}
