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
  const compareFrom = searchParams.get("compareFrom");
  const compareTo = searchParams.get("compareTo");
  if (!gameId || !from || !to) {
    return Response.json({ error: "Missing gameId, from, or to" }, { status: 400 });
  }
  if (!isValidUUID(gameId) || !isValidDate(from) || !isValidDate(to)) {
    return Response.json({ error: "Invalid gameId, from, or to" }, { status: 400 });
  }
  if ((compareFrom && !isValidDate(compareFrom)) || (compareTo && !isValidDate(compareTo))) {
    return Response.json({ error: "Invalid compareFrom or compareTo" }, { status: 400 });
  }

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  async function fetchPeriod(f: string, t: string) {
    const q = `
      SELECT
        count(distinct distinct_id) AS sessions,
        avg(duration_seconds) AS avg_duration_seconds
      FROM (
        SELECT
          distinct_id,
          dateDiff('second', min(timestamp), max(timestamp)) AS duration_seconds
        FROM events
        WHERE properties.gameId = '${gameId}'
          AND timestamp >= '${f}'
          AND timestamp < '${t}'
        GROUP BY distinct_id
      )
    `;
    const { results } = await hogql(q);
    const row = results[0] ?? [0, 0];
    return {
      sessions: Number(row[0]) || 0,
      avgDurationSeconds: Number(row[1]) || 0,
    };
  }

  const [current, previous] = await Promise.all([
    fetchPeriod(from, to),
    compareFrom && compareTo ? fetchPeriod(compareFrom, compareTo) : Promise.resolve(null),
  ]);

  function pctDelta(curr: number, prev: number | undefined) {
    if (!prev || prev === 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  }

  return Response.json({
    sessions: current.sessions,
    avgDurationSeconds: current.avgDurationSeconds,
    sessionsDelta: previous ? pctDelta(current.sessions, previous.sessions) : null,
    avgDurationDelta: previous
      ? pctDelta(current.avgDurationSeconds, previous.avgDurationSeconds)
      : null,
  });
}
