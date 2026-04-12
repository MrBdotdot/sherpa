import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) return Response.json({ error: "Missing gameId" }, { status: 400 });

  // Verify caller owns this game
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();

  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  // Members for this game
  const { data: members, error } = await supabaseAdmin
    .from("game_members")
    .select("id, user_id, role, email, display_name, joined_at")
    .eq("game_id", gameId)
    .order("joined_at");

  if (error) return Response.json({ error: "Failed to load members" }, { status: 500 });

  // Total collaborators across all owned games (for Pro seat limit display)
  const { count: totalCollaborators } = await supabaseAdmin
    .from("game_members")
    .select("user_id", { count: "exact", head: true })
    .in(
      "game_id",
      (
        await supabaseAdmin.from("games").select("id").eq("user_id", user.id)
      ).data?.map((g) => g.id) ?? []
    );

  return Response.json({ members: members ?? [], totalCollaborators: totalCollaborators ?? 0 });
}
