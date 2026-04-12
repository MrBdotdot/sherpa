import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

async function verifyInvitationOwnership(invitationId: string, userId: string): Promise<boolean> {
  const { data: inv } = await supabaseAdmin
    .from("game_invitations")
    .select("game_id")
    .eq("id", invitationId)
    .single();
  if (!inv) return false;

  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", inv.game_id)
    .eq("user_id", userId)
    .single();
  return !!game;
}

// PATCH: resend (reset expiry)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { invitationId } = await params;
  if (!(await verifyInvitationOwnership(invitationId, user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("game_invitations")
    .update({ expires_at: newExpiry })
    .eq("id", invitationId);

  if (error) return Response.json({ error: "Failed to resend" }, { status: 500 });
  return Response.json({ ok: true });
}

// DELETE: revoke
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { invitationId } = await params;
  if (!(await verifyInvitationOwnership(invitationId, user.id))) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { error } = await supabaseAdmin
    .from("game_invitations")
    .delete()
    .eq("id", invitationId);

  if (error) return Response.json({ error: "Failed to revoke" }, { status: 500 });
  return Response.json({ ok: true });
}
