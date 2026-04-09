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

// Maps planKey strings to the corresponding env var price ID.
// Resolving server-side prevents clients from passing raw Stripe price IDs.
const PLAN_KEY_MAP: Record<string, string | undefined> = {
  pro_monthly:     process.env.STRIPE_PRICE_PRO_MONTHLY,
  pro_annual:      process.env.STRIPE_PRICE_PRO_ANNUAL,
  studio_monthly:  process.env.STRIPE_PRICE_STUDIO_MONTHLY,
  studio_annual:   process.env.STRIPE_PRICE_STUDIO_ANNUAL,
  lifetime:        process.env.STRIPE_PRICE_LIFETIME,
};

// ---------------------------------------------------------------------------
// POST /api/stripe/checkout
// Creates a Stripe Checkout session for the authenticated user.
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

  // 2. Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("planKey" in body) ||
    typeof (body as Record<string, unknown>).planKey !== "string"
  ) {
    return NextResponse.json(
      { error: "Missing or invalid planKey" },
      { status: 400 }
    );
  }

  const { planKey, successUrl, cancelUrl } = body as {
    planKey: string;
    successUrl?: unknown;
    cancelUrl?: unknown;
  };

  // 3. Validate planKey and resolve price ID
  const priceId = PLAN_KEY_MAP[planKey];
  if (!priceId) {
    return NextResponse.json(
      { error: "Invalid or unconfigured planKey" },
      { status: 400 }
    );
  }

  // 4. Look up (or create) Stripe customer for this user
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId: string | null = profile?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;

    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  // 5. Create Checkout session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const resolvedSuccessUrl =
    typeof successUrl === "string" ? successUrl : "/";
  const resolvedCancelUrl =
    typeof cancelUrl === "string" ? cancelUrl : "/";

  const session = await stripe.checkout.sessions.create({
    mode: planKey === "lifetime" ? "payment" : "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}${resolvedSuccessUrl}?checkout=success`,
    cancel_url: `${appUrl}${resolvedCancelUrl}`,
    metadata: { userId: user.id },
  });

  return NextResponse.json({ url: session.url });
}
