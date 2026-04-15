import { getRequestUser } from "@/app/_lib/api-auth";
import { assertGameMember } from "@/app/_lib/analytics-auth";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { isValidUUID } from "@/app/_lib/analytics-params";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) return Response.json({ error: "Missing gameId" }, { status: 400 });
  if (!isValidUUID(gameId)) return Response.json({ error: "Invalid gameId" }, { status: 400 });

  const isMember = await assertGameMember(gameId, user.id);
  if (!isMember) return Response.json({ error: "Forbidden" }, { status: 403 });

  const { data: cards, error } = await supabaseAdmin
    .from("cards")
    .select("id, title, kind, x, y, hero_image")
    .eq("game_id", gameId);

  if (error || !cards) {
    return Response.json({ error: "Failed to load board" }, { status: 500 });
  }

  const homeCard = cards.find((c) => c.kind === "home");
  const hotspots = cards
    .filter((c) => c.kind !== "home")
    .map((c) => ({ id: c.id as string, title: c.title as string, x: (c.x as number) ?? 50, y: (c.y as number) ?? 50 }));

  return Response.json({
    heroImage: (homeCard?.hero_image as string) ?? "",
    hotspots,
  });
}
