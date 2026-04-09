import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { stripe } from "@/app/_lib/stripe-server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cookiesFromRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return cookieHeader.split(";").map((c) => {
    const [name, ...rest] = c.trim().split("=");
    return { name: name.trim(), value: rest.join("=") };
  });
}

// ---------------------------------------------------------------------------
// POST /api/stripe/portal
// Creates a Stripe Billing Portal session for the authenticated user.
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  // 1. Auth — resolve user from Supabase session cookie
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookiesFromRequest(request),
        setAll: () => {
          // read-only — we don't need to set cookies in this route
        },
      },
    }
  );

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Look up Stripe customer for this user
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  const customerId = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    return NextResponse.json(
      { error: "No billing history found" },
      { status: 400 }
    );
  }

  // 3. Create Billing Portal session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/`,
  });

  return NextResponse.json({ url: session.url });
}
