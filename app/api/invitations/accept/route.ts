import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { token?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { token } = body;
  if (typeof token !== "string") {
    return Response.json({ error: "Missing token" }, { status: 400 });
  }

  // Look up invitation
  const { data: invitation } = await supabaseAdmin
    .from("game_invitations")
    .select("id, game_id, email, role, expires_at")
    .eq("token", token)
    .single();

  if (!invitation) return Response.json({ error: "invalid_token" }, { status: 404 });

  if (new Date(invitation.expires_at) < new Date()) {
    return Response.json({ error: "expired_token" }, { status: 410 });
  }

  // Email must match the authenticated user
  if (invitation.email.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return Response.json({ error: "email_mismatch" }, { status: 403 });
  }

  // Already a member?
  const { data: existing } = await supabaseAdmin
    .from("game_members")
    .select("id")
    .eq("game_id", invitation.game_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Already accepted — just redirect
    await supabaseAdmin.from("game_invitations").delete().eq("id", invitation.id);
    return Response.json({ gameId: invitation.game_id });
  }

  // Create member row
  const displayName =
    typeof user.user_metadata?.first_name === "string"
      ? user.user_metadata.first_name
      : null;

  const { error: memberError } = await supabaseAdmin.from("game_members").insert({
    game_id: invitation.game_id,
    user_id: user.id,
    role: invitation.role,
    email: user.email ?? invitation.email,
    display_name: displayName,
    invited_by: null,
  });

  if (memberError) return Response.json({ error: "Failed to accept" }, { status: 500 });

  // Delete invitation
  await supabaseAdmin.from("game_invitations").delete().eq("id", invitation.id);

  return Response.json({ gameId: invitation.game_id });
}
