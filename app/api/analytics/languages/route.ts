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
      properties.toCode AS language_code,
      count() AS switches
    FROM events
    WHERE event = 'language_changed'
      AND properties.gameId = '${gameId}'
      AND timestamp >= '${from}'
      AND timestamp < '${to}'
    GROUP BY language_code
    ORDER BY switches DESC
    LIMIT 10
  `);

  return Response.json(
    results.map((row) => ({ code: String(row[0]), switches: Number(row[1]) }))
  );
}
