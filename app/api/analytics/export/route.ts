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
  if (!isMember) return new Response("Forbidden", { status: 403 });

  const { results } = await hogql(`
    SELECT
      toString(timestamp) AS timestamp,
      event,
      distinct_id AS session_id,
      ifNull(properties.cardId, '') AS card_id,
      ifNull(properties.cardTitle, '') AS card_title,
      ifNull(properties.query, '') AS query,
      ifNull(properties.toCode, '') AS language_code,
      ifNull(properties.layoutMode, '') AS device
    FROM events
    WHERE properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    ORDER BY timestamp
    LIMIT 100000
  `);

  const header = "timestamp,event,session_id,card_id,card_title,query,language_code,device\n";
  const rows = results
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell ?? "");
          return s.includes(",") || s.includes('"') || s.includes("\n")
            ? `"${s.replace(/"/g, '""')}"`
            : s;
        })
        .join(",")
    )
    .join("\n");

  const filename = `sherpa-analytics-${gameId}-${from}-${to}.csv`;
  return new Response(header + rows, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
