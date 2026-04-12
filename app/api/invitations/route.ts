import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

export async function GET(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("gameId");
  if (!gameId) return Response.json({ error: "Missing gameId" }, { status: 400 });

  // Verify ownership
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  const { data: invitations, error } = await supabaseAdmin
    .from("game_invitations")
    .select("id, email, role, expires_at, created_at")
    .eq("game_id", gameId)
    .order("created_at");

  if (error) return Response.json({ error: "Failed to load invitations" }, { status: 500 });
  return Response.json({ invitations: invitations ?? [] });
}

export async function POST(request: Request) {
  const user = await getRequestUser(request);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { gameId?: unknown; email?: unknown; role?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { gameId, email, role } = body;
  if (typeof gameId !== "string") return Response.json({ error: "Missing gameId" }, { status: 400 });
  if (typeof email !== "string" || !email.includes("@")) {
    return Response.json({ error: "Invalid email" }, { status: 400 });
  }
  if (role !== "editor" && role !== "viewer") {
    return Response.json({ error: "Invalid role" }, { status: 400 });
  }

  // Verify ownership + get game title
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("id, title")
    .eq("id", gameId)
    .eq("user_id", user.id)
    .single();
  if (!game) return Response.json({ error: "Not found" }, { status: 404 });

  // Prevent inviting yourself
  if (email === user.email) {
    return Response.json({ error: "Cannot invite yourself" }, { status: 400 });
  }

  // Check if already a member
  const { data: existing } = await supabaseAdmin
    .from("game_members")
    .select("id")
    .eq("game_id", gameId)
    .eq("email", email)
    .maybeSingle();
  if (existing) return Response.json({ error: "already_member" }, { status: 409 });

  // Pro seat limit: max 1 collaborator total across all owned games
  const { data: ownedGames } = await supabaseAdmin
    .from("games")
    .select("id")
    .eq("user_id", user.id);
  const ownedGameIds = (ownedGames ?? []).map((g) => g.id);

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan")
    .eq("id", user.id)
    .single();
  const plan = profile?.plan ?? "free";

  if (plan === "free" || plan === "lifetime") {
    return Response.json({ error: "Team collaboration requires Pro or Studio plan" }, { status: 403 });
  }

  if (plan === "pro" && ownedGameIds.length > 0) {
    const { count } = await supabaseAdmin
      .from("game_members")
      .select("id", { count: "exact", head: true })
      .in("game_id", ownedGameIds);
    if ((count ?? 0) >= 1) {
      return Response.json({ error: "seat_limit_reached" }, { status: 403 });
    }
  }

  // Upsert invitation (resend if pending invite already exists)
  const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const { data: invitation, error: insertError } = await supabaseAdmin
    .from("game_invitations")
    .upsert(
      { game_id: gameId, email, role, invited_by: user.id, expires_at: newExpiry },
      { onConflict: "game_id,email" }
    )
    .select("id, token")
    .single();

  if (insertError || !invitation) {
    return Response.json({ error: "Failed to create invitation" }, { status: 500 });
  }

  // Send invite email directly via Resend
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const { Resend } = await import("resend");
    const { render } = await import("@react-email/components");
    const React = (await import("react")).default;
    const { TeamInvite } = await import("@/app/_lib/email/team-invite");

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://studio.sherpa.app";
    const acceptUrl = `${appUrl}/invite/accept?token=${invitation.token}`;
    const inviterName =
      typeof user.user_metadata?.first_name === "string"
        ? user.user_metadata.first_name
        : user.email ?? "Someone";

    const html = await render(
      React.createElement(TeamInvite, { inviterName, gameTitle: game.title, role, acceptUrl })
    );
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: "Sherpa <hello@sherpa.app>",
      to: email,
      subject: `You've been invited to collaborate on "${game.title}" in Sherpa`,
      html,
    });
  }

  return Response.json({ ok: true }, { status: 201 });
}
