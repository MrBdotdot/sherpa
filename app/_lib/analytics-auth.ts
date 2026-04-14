import { supabaseAdmin } from "@/app/_lib/supabase-admin";

/**
 * Returns true if `userId` is the owner of `gameId` or a game_member of it.
 * Used by all analytics API routes to gate access.
 */
export async function assertGameMember(gameId: string, userId: string): Promise<boolean> {
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", gameId)
    .eq("user_id", userId)
    .single();
  if (game) return true;

  const { data: member } = await supabaseAdmin
    .from("game_members")
    .select("id")
    .eq("game_id", gameId)
    .eq("user_id", userId)
    .single();
  return !!member;
}
