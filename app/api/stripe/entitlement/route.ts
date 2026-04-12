import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { getRequestUser } from "@/app/_lib/api-auth";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isExpired(planExpiresAt: string | null): boolean {
  if (!planExpiresAt) return false;
  return new Date(planExpiresAt) < new Date();
}

// ---------------------------------------------------------------------------
// GET /api/stripe/entitlement
// Returns the authenticated user's current plan. Used by usePlan() hook.
// ---------------------------------------------------------------------------

export async function GET(request: Request) {
  const user = await getRequestUser(request);

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ plan: "free", planExpiresAt: null });
  }

  return NextResponse.json({
    plan: profile.plan,
    planExpiresAt: profile.plan_expires_at,
  });
}

// ---------------------------------------------------------------------------
// POST /api/stripe/entitlement
// Returns { hasBranding: boolean } for a specific game's owner.
// Used by the public play route. No auth required.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("gameId" in body) ||
    typeof (body as Record<string, unknown>).gameId !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid gameId" },
      { status: 400 }
    );
  }

  const { gameId } = body as { gameId: string };

  const { data: game } = await supabaseAdmin
    .from("games")
    .select("user_id")
    .eq("id", gameId)
    .single();

  if (!game) {
    // Conservative default: show branding when game is not found
    return NextResponse.json({ hasBranding: true });
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", game.user_id)
    .single();

  if (profileError) {
    return Response.json({ hasBranding: true }); // conservative default on error
  }

  let hasBranding: boolean;

  if (!profile || profile.plan === "free") {
    hasBranding = true;
  } else if (
    profile.plan !== "lifetime" &&
    isExpired(profile.plan_expires_at)
  ) {
    // Paid plan that has expired
    hasBranding = true;
  } else {
    hasBranding = false;
  }

  return NextResponse.json({ hasBranding });
}
