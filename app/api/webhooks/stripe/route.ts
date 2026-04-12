import type Stripe from "stripe";
import { stripe, priceIdToPlan } from "@/app/_lib/stripe-server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractCustomerId(customer: Stripe.Subscription["customer"]): string {
  return typeof customer === "string" ? customer : customer.id;
}

async function getProfileByCustomerId(customerId: string) {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("id, plan")
    .eq("stripe_customer_id", customerId)
    .single();

  if (error) {
    console.error("[stripe/webhook] failed to look up profile by customer id:", error);
    return null;
  }
  return data;
}

// ---------------------------------------------------------------------------
// Event handlers
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("[stripe/webhook] checkout.session.completed: missing userId in metadata");
    return;
  }

  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  let plan: ReturnType<typeof priceIdToPlan> = null;
  let subscriptionId: string | null = null;
  let planExpiresAt: string | null = null;

  if (session.mode === "payment") {
    // One-time payment (lifetime)
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    const priceId = lineItems.data[0]?.price?.id ?? "";
    plan = priceIdToPlan(priceId);
    planExpiresAt = null;
  } else if (session.mode === "subscription") {
    // Recurring subscription
    const subscriptionIdRaw =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id ?? null;

    if (!subscriptionIdRaw) {
      console.error("[stripe/webhook] checkout.session.completed: missing subscription id");
      return;
    }

    subscriptionId = subscriptionIdRaw;
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const item = sub.items.data[0];
    if (!item) {
      console.error("[stripe/webhook] subscription has no items, skipping");
      return;
    }
    const priceId = item.price.id;
    plan = priceIdToPlan(priceId);
    planExpiresAt = new Date(item.current_period_end * 1000).toISOString();
  }

  if (!plan) {
    console.error("[stripe/webhook] checkout.session.completed: could not resolve plan from price id");
    return;
  }

  const { error } = await supabaseAdmin.from("profiles").upsert({
    id: userId,
    plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscriptionId,
    plan_expires_at: planExpiresAt,
  });

  if (error) {
    console.error("[stripe/webhook] checkout.session.completed: upsert error:", error);
  }
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const customerId = extractCustomerId(sub.customer);
  const profile = await getProfileByCustomerId(customerId);
  if (!profile) return;

  const item = sub.items.data[0];
  if (!item) {
    console.error("[stripe/webhook] subscription has no items, skipping");
    return;
  }
  const priceId = item.price.id;
  const plan = priceIdToPlan(priceId);
  if (!plan) {
    console.error("[stripe/webhook] customer.subscription.updated: could not resolve plan from price id");
    return;
  }

  const planExpiresAt = new Date(item.current_period_end * 1000).toISOString();

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan, plan_expires_at: planExpiresAt })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("[stripe/webhook] customer.subscription.updated: update error:", error);
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  const customerId = extractCustomerId(sub.customer);
  const profile = await getProfileByCustomerId(customerId);
  if (!profile) return;

  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ plan: "free", stripe_subscription_id: null, plan_expires_at: null })
    .eq("stripe_customer_id", customerId);

  if (error) {
    console.error("[stripe/webhook] customer.subscription.deleted: update error:", error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId =
    typeof invoice.customer === "string"
      ? invoice.customer
      : invoice.customer?.id ?? null;

  if (!customerId) {
    console.error("[stripe/webhook] invoice.payment_failed: missing customer id");
    return;
  }

  const profile = await getProfileByCustomerId(customerId);
  if (!profile) return;

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.admin.getUserById(profile.id);

  if (userError || !user?.email) {
    console.error("[stripe/webhook] invoice.payment_failed: could not look up user email:", userError);
    return;
  }

  if (!NEXT_PUBLIC_APP_URL) {
    console.warn("[stripe/webhook] invoice.payment_failed: NEXT_PUBLIC_APP_URL not set, skipping email");
    return;
  }

  // Fire-and-forget: do not await
  fetch(`${NEXT_PUBLIC_APP_URL}/api/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template: "billing-event",
      to: user.email,
      props: { event: "payment_failed" },
    }),
  }).catch((err) => {
    console.error("[stripe/webhook] invoice.payment_failed: email fire-and-forget error:", err);
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request) {
  const payload = await request.text();
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/webhook] signature verification failed:", message);
    return new Response(`Webhook signature verification failed: ${message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        // Return 200 for all unhandled event types so Stripe stops retrying.
        break;
    }
  } catch (err) {
    console.error("[stripe/webhook] unhandled error processing event:", event.type, err);
    // Return 200 to stop Stripe retrying — the error is logged for investigation.
    return new Response(JSON.stringify({ received: true, error: "handler_error" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
