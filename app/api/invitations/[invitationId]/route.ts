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

// PATCH: resend (reset expiry + re-send email)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ invitationId: string }> }
) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { invitationId } = await params;

  // Fetch full invitation details
  const { data: inv } = await supabaseAdmin
    .from("game_invitations")
    .select("id, email, role, token, game_id")
    .eq("id", invitationId)
    .single();
  if (!inv) return Response.json({ error: "Not found" }, { status: 404 });

  // Verify ownership
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id, title")
    .eq("id", inv.game_id)
    .eq("user_id", user.id)
    .single();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await supabaseAdmin
    .from("game_invitations")
    .update({ expires_at: newExpiry })
    .eq("id", invitationId);

  if (error) return Response.json({ error: "Failed to resend" }, { status: 500 });

  // Send invite email
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const { Resend } = await import("resend");
    const { render } = await import("@react-email/components");
    const React = (await import("react")).default;
    const { TeamInvite } = await import("@/app/_lib/email/team-invite");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://studio.sherpa.app";
    const acceptUrl = `${appUrl}/invite/accept?token=${inv.token}`;
    const inviterName =
      typeof user.user_metadata?.first_name === "string"
        ? user.user_metadata.first_name
        : user.email ?? "Someone";

    const html = await render(
      React.createElement(TeamInvite, { inviterName, gameTitle: game.title, role: inv.role, acceptUrl })
    );
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "Sherpa <hello@wbeestudio.com>",
      to: inv.email,
      subject: `You've been invited to collaborate on "${game.title}" in Sherpa`,
      html,
    });
  }

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
