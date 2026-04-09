# Stripe Billing Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Stripe subscription billing to Sherpa — profiles table, four API routes, `usePlan()` hook, feature gating (publish, convention mode, branding), pricing modal, and billing section UI.

**Architecture:** Supabase `profiles` table is the source of truth for plan state. Stripe webhooks write to it server-side using the service role key; the app reads plan from the DB at runtime and never calls Stripe during normal usage. Entitlement is exposed to the client via `usePlan()` context, which fetches once from `/api/stripe/entitlement` on mount.

**Tech Stack:** Stripe Node SDK (`stripe` npm), Next.js 16 App Router API routes, Supabase service role client (server-only), React context for client-side entitlement, Tailwind CSS for UI.

---

## File Map

**New files:**
- `supabase/add-profiles.sql` — profiles table, RLS policies
- `app/_lib/stripe-server.ts` — server-side Stripe client singleton + price→plan map
- `app/_lib/supabase-admin.ts` — service role Supabase client (server-only)
- `app/api/stripe/entitlement/route.ts` — GET current user's plan
- `app/api/stripe/checkout/route.ts` — POST create Stripe Checkout session
- `app/api/stripe/portal/route.ts` — POST create Stripe Billing Portal session
- `app/api/webhooks/stripe/route.ts` — POST Stripe webhook handler
- `app/_hooks/usePlan.tsx` — usePlan hook + PlanProvider context
- `app/_components/pricing-modal.tsx` — pricing modal with upgrade prompt mode
- `app/_components/account/billing-section.tsx` — real billing section (replaces placeholder)

**Modified files:**
- `package.json` — add `stripe` dependency
- `app/_components/app-shell.tsx` — wrap `AuthoringStudio` with `PlanProvider`
- `app/_components/authoring-studio.tsx` — use `usePlan()`, intercept publish, convention mode state, pass `onOpenPricing` down
- `app/_components/preview-canvas.tsx` — convention mode button + convention badge
- `app/_components/player-view.tsx` — add `hasBranding` prop + "Built with Sherpa" badge
- `app/play/[gameId]/page.tsx` — fetch branding status for public play route
- `app/_components/account/account-sections.tsx` — replace inline `BillingSection` with import
- `app/_lib/authoring-utils.ts` — bump `APP_VERSION` to `"v0.19.0"`
- `app/_lib/patch-notes.ts` — add v0.19.0 entry

---

## Task 1: Install Stripe and create server helpers

**Files:**
- Modify: `package.json`
- Create: `app/_lib/stripe-server.ts`
- Create: `app/_lib/supabase-admin.ts`

> **Note:** This project has no test framework. Verification steps use `npx tsc --noEmit` (TypeScript type check) in place of unit tests.

- [ ] **Step 1: Install Stripe**

```bash
npm install stripe
```

Expected: `stripe` added to `package.json` dependencies, no errors.

- [ ] **Step 2: Create the server-side Stripe client**

Create `app/_lib/stripe-server.ts`:

```ts
import Stripe from "stripe";

// Singleton — re-used across invocations in the same Lambda warm instance.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2025-01-27.acacia",
});

// Maps Stripe price IDs (from env vars) to plan strings.
// Add or update entries when new plans are created in the Stripe dashboard.
export type Plan = "free" | "pro" | "studio" | "lifetime";

export function priceIdToPlan(priceId: string): Plan | null {
  const map: Record<string, Plan> = {
    [process.env.STRIPE_PRICE_PRO_MONTHLY ?? ""]:    "pro",
    [process.env.STRIPE_PRICE_PRO_ANNUAL ?? ""]:     "pro",
    [process.env.STRIPE_PRICE_STUDIO_MONTHLY ?? ""]: "studio",
    [process.env.STRIPE_PRICE_STUDIO_ANNUAL ?? ""]:  "studio",
    [process.env.STRIPE_PRICE_LIFETIME ?? ""]:       "lifetime",
  };
  return map[priceId] ?? null;
}
```

- [ ] **Step 3: Create the service-role Supabase admin client**

Create `app/_lib/supabase-admin.ts`:

```ts
import { createClient } from "@supabase/supabase-js";

// Service-role key bypasses RLS — server use only, never in the client bundle.
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
);
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Add environment variables to `.env.local`**

Open `.env.local` and add the following (fill in values from the Stripe dashboard):

```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_PRO_MONTHLY=price_...
STRIPE_PRICE_PRO_ANNUAL=price_...
STRIPE_PRICE_STUDIO_MONTHLY=price_...
STRIPE_PRICE_STUDIO_ANNUAL=price_...
STRIPE_PRICE_LIFETIME=price_...
```

`SUPABASE_SERVICE_ROLE_KEY` should already be in `.env.local`. Confirm it is present.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json app/_lib/stripe-server.ts app/_lib/supabase-admin.ts
git commit -m "feat: install stripe, add server-side stripe and supabase-admin helpers"
```

---

## Task 2: Supabase profiles table

**Files:**
- Create: `supabase/add-profiles.sql`

- [ ] **Step 1: Create the SQL migration file**

Create `supabase/add-profiles.sql`:

```sql
-- Run in Supabase Dashboard → SQL Editor
-- Creates the profiles table for plan/billing state.
-- Run after add-auth.sql and add-game-publish.sql.

CREATE TABLE IF NOT EXISTS profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                    text NOT NULL DEFAULT 'free',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_expires_at         timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- RLS: users can read their own row; only service role can write
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Trigger: keep updated_at current (reuses the existing trigger function)
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create a free profile row when a new user signs up
CREATE OR REPLACE FUNCTION create_profile_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO profiles (id) VALUES (NEW.id) ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_profile_for_new_user();
```

- [ ] **Step 2: Run the migration**

In Supabase Dashboard → SQL Editor, paste and run the contents of `supabase/add-profiles.sql`.

Expected: no errors. Confirm in the Table Editor that the `profiles` table exists with the correct columns and policies.

- [ ] **Step 3: Verify existing users get a profile row**

After running the migration, existing users won't have profile rows (the trigger only fires for new sign-ups). Run this in the SQL Editor to backfill:

```sql
INSERT INTO profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;
```

Expected: rows inserted for all existing users with `plan = 'free'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/add-profiles.sql
git commit -m "feat(db): add profiles table with plan, RLS, and new-user trigger"
```

---

## Task 3: Entitlement API route

**Files:**
- Create: `app/api/stripe/entitlement/route.ts`

The entitlement route returns the authenticated user's current plan. It also serves a game-branding lookup used by the public play route.

- [ ] **Step 1: Create the entitlement route**

Create `app/api/stripe/entitlement/route.ts`:

```ts
import { createClient } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";

// GET /api/stripe/entitlement
// Returns the current user's plan and expiry for use by usePlan().
// Auth: requires a valid Supabase session cookie.
export async function GET(request: Request) {
  // Create a per-request Supabase client that reads the user's session from cookies.
  const { createServerClient } = await import("@supabase/ssr");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Read plan from profiles table via service role (bypasses RLS for server reads).
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    // No profile yet — treat as free.
    return Response.json({ plan: "free", planExpiresAt: null });
  }

  return Response.json({
    plan: profile.plan,
    planExpiresAt: profile.plan_expires_at ?? null,
  });
}

// GET /api/stripe/entitlement?gameId=xxx
// Returns hasBranding for a specific game's owner (used by the public play route).
// No auth required — reads via service role; returns only a boolean.
export async function POST(request: Request) {
  let body: { gameId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { gameId } = body;
  if (typeof gameId !== "string" || !gameId) {
    return Response.json({ error: "Missing gameId" }, { status: 400 });
  }

  // Look up the game's owner.
  const { data: game } = await supabaseAdmin
    .from("games")
    .select("user_id")
    .eq("id", gameId)
    .single();

  if (!game?.user_id) {
    return Response.json({ hasBranding: true }); // conservative default
  }

  // Look up their plan.
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("plan, plan_expires_at")
    .eq("id", game.user_id)
    .single();

  const plan = profile?.plan ?? "free";
  const expiresAt = profile?.plan_expires_at ? new Date(profile.plan_expires_at) : null;
  const isExpired = expiresAt ? expiresAt < new Date() : false;
  const hasBranding = plan === "free" || (plan !== "lifetime" && isExpired);

  return Response.json({ hasBranding });
}
```

**Note:** This route uses `@supabase/ssr` to read the session cookie. Install it:

```bash
npm install @supabase/ssr
```

- [ ] **Step 2: Install @supabase/ssr**

```bash
npm install @supabase/ssr
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Manual test (dev server must be running)**

Start the dev server (`npm run dev`), sign in, then:

```bash
curl http://localhost:3000/api/stripe/entitlement
```

Expected: `{"plan":"free","planExpiresAt":null}` (or 401 if not authenticated via cookie — use browser devtools fetch instead for cookie auth).

In browser console (signed in):

```js
fetch('/api/stripe/entitlement').then(r => r.json()).then(console.log)
```

Expected: `{ plan: "free", planExpiresAt: null }`.

- [ ] **Step 5: Commit**

```bash
git add app/api/stripe/entitlement/route.ts package.json package-lock.json
git commit -m "feat(api): add stripe entitlement and game-branding routes"
```

---

## Task 4: usePlan hook and PlanProvider

**Files:**
- Create: `app/_hooks/usePlan.tsx`

- [ ] **Step 1: Create usePlan hook and PlanProvider**

Create `app/_hooks/usePlan.tsx`:

```tsx
"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Plan = "free" | "pro" | "studio" | "lifetime";

export type PlanState = {
  plan: Plan;
  planExpiresAt: string | null;
  canPublish: boolean;    // pro | studio | lifetime (and not expired)
  hasBranding: boolean;   // free or expired paid plan
  hasTeamSeats: boolean;  // studio | lifetime
  isLoading: boolean;
};

const defaultState: PlanState = {
  plan: "free",
  planExpiresAt: null,
  canPublish: false,
  hasBranding: true,
  hasTeamSeats: false,
  isLoading: true,
};

const PlanContext = createContext<PlanState>(defaultState);

function deriveEntitlements(plan: Plan, planExpiresAt: string | null): Omit<PlanState, "plan" | "planExpiresAt" | "isLoading"> {
  const isExpired =
    planExpiresAt !== null &&
    plan !== "lifetime" &&
    new Date(planExpiresAt) < new Date();

  const effectivePlan: Plan = isExpired ? "free" : plan;

  return {
    canPublish: effectivePlan === "pro" || effectivePlan === "studio" || effectivePlan === "lifetime",
    hasBranding: effectivePlan === "free",
    hasTeamSeats: effectivePlan === "studio" || effectivePlan === "lifetime",
  };
}

export function PlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<PlanState>(defaultState);

  useEffect(() => {
    fetch("/api/stripe/entitlement")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data: { plan: Plan; planExpiresAt: string | null }) => {
        setState({
          plan: data.plan,
          planExpiresAt: data.planExpiresAt,
          ...deriveEntitlements(data.plan, data.planExpiresAt),
          isLoading: false,
        });
      })
      .catch(() => {
        // Unauthenticated or fetch failed — default to free
        setState({
          plan: "free",
          planExpiresAt: null,
          ...deriveEntitlements("free", null),
          isLoading: false,
        });
      });
  }, []);

  return <PlanContext.Provider value={state}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanState {
  return useContext(PlanContext);
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/_hooks/usePlan.tsx
git commit -m "feat: add usePlan hook and PlanProvider context"
```

---

## Task 5: Wire PlanProvider into AppShell

**Files:**
- Modify: `app/_components/app-shell.tsx`

- [ ] **Step 1: Wrap AuthoringStudio with PlanProvider**

Read `app/_components/app-shell.tsx` (already read — content known).

Edit the return in `AppShell` to wrap `AuthoringStudio`:

```tsx
// Add import at top of app-shell.tsx:
import { PlanProvider } from "@/app/_hooks/usePlan";

// In the return statement, wrap AuthoringStudio:
return (
  <PlanProvider>
    <AuthoringStudio
      userId={user.id}
      userEmail={user.email ?? ""}
      userMetadata={(user.user_metadata as UserMetadata) ?? {}}
    />
  </PlanProvider>
);
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual test — verify hook loads in AuthoringStudio**

In `app/_components/authoring-studio.tsx`, temporarily add at the top of the component body (remove after test):

```ts
import { usePlan } from "@/app/_hooks/usePlan";
// inside component body:
const plan = usePlan();
console.log("[plan]", plan);
```

Reload the dev server. Open the browser console. Expected: `[plan] { plan: "free", canPublish: false, ... }` after a moment.

Remove the temporary console.log after verifying.

- [ ] **Step 4: Commit**

```bash
git add app/_components/app-shell.tsx
git commit -m "feat: wrap AppShell with PlanProvider"
```

---

## Task 6: Checkout API route

**Files:**
- Create: `app/api/stripe/checkout/route.ts`

- [ ] **Step 1: Create the checkout route**

Create `app/api/stripe/checkout/route.ts`:

```ts
import { stripe, priceIdToPlan } from "@/app/_lib/stripe-server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  // Auth check
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: { priceId?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate priceId against the known price map — never trust user-supplied IDs.
  const { priceId, successUrl = "/", cancelUrl = "/" } = body;
  if (typeof priceId !== "string" || !priceIdToPlan(priceId)) {
    return Response.json({ error: "Invalid price ID" }, { status: 400 });
  }

  // Get or create Stripe customer
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  let customerId = profile?.stripe_customer_id as string | undefined;

  if (!customerId) {
    const customer = await stripe.customers.create({ email: user.email });
    customerId = customer.id;
    await supabaseAdmin
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", user.id);
  }

  const plan = priceIdToPlan(priceId);
  const isLifetime = plan === "lifetime";

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: isLifetime ? "payment" : "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${successUrl}?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}${cancelUrl}`,
    metadata: { userId: user.id },
  });

  return Response.json({ url: session.url });
}
```

**Note:** Add `NEXT_PUBLIC_APP_URL` to `.env.local` (e.g. `http://localhost:3000` for dev).

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/checkout/route.ts
git commit -m "feat(api): add stripe checkout session route"
```

---

## Task 7: Portal API route

**Files:**
- Create: `app/api/stripe/portal/route.ts`

- [ ] **Step 1: Create the portal route**

Create `app/api/stripe/portal/route.ts`:

```ts
import { stripe } from "@/app/_lib/stripe-server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", user.id)
    .single();

  if (!profile?.stripe_customer_id) {
    return Response.json({ error: "No billing history found" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id as string,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/`,
  });

  return Response.json({ url: session.url });
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/api/stripe/portal/route.ts
git commit -m "feat(api): add stripe billing portal route"
```

---

## Task 8: Webhook handler

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

The webhook handler must be able to read the raw request body for signature verification. In Next.js App Router, this requires opting out of body parsing. This is handled automatically since we use `request.text()`.

- [ ] **Step 1: Create the webhook route**

Create `app/api/webhooks/stripe/route.ts`:

```ts
import Stripe from "stripe";
import { stripe, priceIdToPlan } from "@/app/_lib/stripe-server";
import { supabaseAdmin } from "@/app/_lib/supabase-admin";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";
  const sig = request.headers.get("stripe-signature") ?? "";

  let event: Stripe.Event;
  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, sig, webhookSecret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[stripe/webhook] signature verification failed:", msg);
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    await handleStripeEvent(event);
  } catch (err) {
    console.error("[stripe/webhook] handler error:", err);
    return Response.json({ error: "Handler error" }, { status: 500 });
  }

  // Always return 200 for handled and unhandled events — Stripe will retry on non-200.
  return Response.json({ received: true });
}

async function handleStripeEvent(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutCompleted(session);
      break;
    }
    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionUpdated(sub);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await handleSubscriptionDeleted(sub);
      break;
    }
    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(invoice);
      break;
    }
    default:
      // Unhandled event type — log and return 200 to stop Stripe retrying.
      break;
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const userId = session.metadata?.userId;
  if (!userId) return;

  const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : (session.subscription as Stripe.Subscription | null)?.id ?? null;

  // Determine plan from the line items' price IDs.
  let plan: ReturnType<typeof priceIdToPlan> = null;
  let planExpiresAt: string | null = null;

  if (session.mode === "payment") {
    // Lifetime purchase — no subscription, no expiry.
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
    const priceId = lineItems.data[0]?.price?.id ?? "";
    plan = priceIdToPlan(priceId);
    planExpiresAt = null;
  } else if (subscriptionId) {
    const sub = await stripe.subscriptions.retrieve(subscriptionId);
    const priceId = sub.items.data[0]?.price.id ?? "";
    plan = priceIdToPlan(priceId);
    planExpiresAt = new Date((sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000).toISOString();
  }

  if (!plan) return;

  await supabaseAdmin.from("profiles").upsert({
    id: userId,
    plan,
    stripe_customer_id: customerId ?? null,
    stripe_subscription_id: subscriptionId ?? null,
    plan_expires_at: planExpiresAt,
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) return;

  const priceId = sub.items.data[0]?.price.id ?? "";
  const plan = priceIdToPlan(priceId);
  if (!plan) return;

  const planExpiresAt = new Date(
    (sub as Stripe.Subscription & { current_period_end: number }).current_period_end * 1000
  ).toISOString();

  await supabaseAdmin
    .from("profiles")
    .update({ plan, plan_expires_at: planExpiresAt })
    .eq("id", profile.id);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription): Promise<void> {
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) return;

  await supabaseAdmin
    .from("profiles")
    .update({ plan: "free", stripe_subscription_id: null, plan_expires_at: null })
    .eq("id", profile.id);
}

async function handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  // No plan change on payment failure. Send notification email via Resend.
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .single();

  if (!profile) return;

  // Look up the user's email to send the notification.
  const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.id);
  if (!user?.email) return;

  // Fire-and-forget — don't await, don't block the webhook response.
  fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? ""}/api/email/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      template: "billing-event",
      to: user.email,
      props: { event: "payment_failed" },
    }),
  }).catch((err) => console.error("[stripe/webhook] payment-failed email failed:", err));
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors. (Some Stripe type casting is needed — if you get errors on `current_period_end`, the Stripe API version may define it differently. Cast via `(sub as any).current_period_end` if needed, then file a follow-up to update the Stripe API version.)

- [ ] **Step 3: Set up Stripe CLI for local webhook testing**

If not already installed, download the [Stripe CLI](https://docs.stripe.com/stripe-cli).

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

This outputs a webhook signing secret (`whsec_...`). Copy it into `STRIPE_WEBHOOK_SECRET` in `.env.local`.

- [ ] **Step 4: Test a webhook event**

With the dev server and `stripe listen` running:

```bash
stripe trigger checkout.session.completed
```

Expected in the dev server logs: no errors. In Supabase, check that the test user's profile row has `plan` updated.

- [ ] **Step 5: Commit**

```bash
git add app/api/webhooks/stripe/route.ts
git commit -m "feat(api): add stripe webhook handler (checkout, subscription, payment-failed)"
```

---

## Task 9: Pricing modal

**Files:**
- Create: `app/_components/pricing-modal.tsx`

This component has two modes:
- `mode="upgrade-prompt"` — a lightweight gate shown when a free user tries to publish
- `mode="pricing"` — the full plan comparison shown from the billing section

- [ ] **Step 1: Create the pricing modal component**

Create `app/_components/pricing-modal.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type PricingModalProps = {
  mode: "upgrade-prompt" | "pricing";
  onClose: () => void;
};

const MONTHLY_PRICES = {
  pro: { label: "$19", period: "/mo" },
  studio: { label: "$49", period: "/mo" },
};

const ANNUAL_PRICES = {
  pro: { label: "$15", period: "/mo", note: "billed $182/yr" },
  studio: { label: "$39", period: "/mo", note: "billed $470/yr" },
};

async function startCheckout(priceEnvKey: string): Promise<void> {
  // priceEnvKey is used only to identify which env var name to pass.
  // The actual priceId resolution happens server-side; we pass the env var name
  // as a hint and resolve it server-side.
  // IMPLEMENTATION NOTE: The client passes the env var name; the checkout route
  // maps it to the actual Stripe price ID via server-side env vars.
  //
  // Since we can't expose env var names to the client safely, the checkout route
  // accepts a `planKey` string and maps it to the price ID internally.
  const res = await fetch("/api/stripe/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planKey: priceEnvKey,
      successUrl: "/",
      cancelUrl: "/",
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    alert(data.error ?? "Something went wrong. Please try again.");
    return;
  }
  const { url } = await res.json();
  if (url) window.location.href = url;
}

export function PricingModal({ mode, onClose }: PricingModalProps) {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [loading, setLoading] = useState<string | null>(null);
  const dialogRef = useFocusTrap<HTMLDivElement>(true);

  const prices = billing === "monthly" ? MONTHLY_PRICES : ANNUAL_PRICES;

  async function handleCheckout(planKey: string) {
    setLoading(planKey);
    try {
      await startCheckout(planKey);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a plan"
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100"
          aria-label="Close"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          </svg>
        </button>

        {mode === "upgrade-prompt" ? (
          <div className="mb-6">
            <div className="mb-1 text-base font-semibold text-neutral-900">Publish to a permanent URL</div>
            <p className="text-sm text-neutral-500">
              Publishing requires a Pro plan. Share your experience with a permanent link that players can access from any device.
            </p>
          </div>
        ) : (
          <div className="mb-6 text-center">
            <h2 className="text-xl font-semibold text-neutral-900">Choose a plan</h2>
            <p className="mt-1 text-sm text-neutral-500">All plans include unlimited games and convention mode.</p>
          </div>
        )}

        {/* Billing toggle */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                  billing === b ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-500"
                }`}
              >
                {b === "monthly" ? "Monthly" : "Annual"}
                {b === "annual" && (
                  <span className="ml-1.5 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                    Save 20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Plan cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Pro */}
          <div className="rounded-2xl border border-neutral-200 p-5">
            <div className="mb-4">
              <div className="text-sm font-semibold uppercase tracking-[0.12em] text-neutral-500">Pro</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-neutral-900">{prices.pro.label}</span>
                <span className="text-sm text-neutral-400">{prices.pro.period}</span>
              </div>
              {"note" in prices.pro && (
                <div className="mt-0.5 text-xs text-neutral-400">{(prices.pro as { note: string }).note}</div>
              )}
            </div>
            <ul className="mb-5 space-y-2 text-sm text-neutral-600">
              <li className="flex items-center gap-2">
                <CheckIcon /> Publish to permanent URL
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon /> Sherpa branding removed
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon /> Unlimited games
              </li>
            </ul>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleCheckout(billing === "monthly" ? "pro_monthly" : "pro_annual")}
              className="w-full rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e3a8a]/90 disabled:opacity-60"
            >
              {loading === (billing === "monthly" ? "pro_monthly" : "pro_annual") ? "Loading..." : "Get Pro"}
            </button>
          </div>

          {/* Studio */}
          <div className="rounded-2xl border-2 border-[#1e3a8a] p-5">
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1e3a8a]">Studio</div>
                <span className="rounded-full bg-[#1e3a8a]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1e3a8a]">
                  Early access
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-neutral-900">{prices.studio.label}</span>
                <span className="text-sm text-neutral-400">{prices.studio.period}</span>
              </div>
              {"note" in prices.studio && (
                <div className="mt-0.5 text-xs text-neutral-400">{(prices.studio as { note: string }).note}</div>
              )}
            </div>
            <ul className="mb-5 space-y-2 text-sm text-neutral-600">
              <li className="flex items-center gap-2">
                <CheckIcon /> Everything in Pro
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon /> 3 team seats
              </li>
              <li className="flex items-center gap-2">
                <CheckIcon /> Early access to new features
              </li>
            </ul>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleCheckout(billing === "monthly" ? "studio_monthly" : "studio_annual")}
              className="w-full rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1e3a8a]/90 disabled:opacity-60"
            >
              {loading === (billing === "monthly" ? "studio_monthly" : "studio_annual") ? "Loading..." : "Get Studio"}
            </button>
          </div>
        </div>

        {/* Lifetime callout */}
        <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-neutral-900">Lifetime — $299 one-time</div>
              <div className="mt-0.5 text-xs text-neutral-500">
                Single-user license. Need a team?{" "}
                <a href="mailto:will@wbeestudio.com?subject=Lifetime%20team%20license" className="underline">
                  Contact us.
                </a>
              </div>
            </div>
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => handleCheckout("lifetime")}
              className="shrink-0 rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:bg-neutral-100 disabled:opacity-60"
            >
              {loading === "lifetime" ? "Loading..." : "Buy once"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0 text-emerald-500" aria-hidden="true">
      <circle cx="7" cy="7" r="6" fill="currentColor" opacity="0.15" />
      <path d="M4 7l2.5 2.5L10 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
```

**Note:** The checkout route currently accepts `priceId` (a Stripe price ID string), but the pricing modal sends `planKey` (a logical key like `"pro_monthly"`). Update the checkout route to accept `planKey` and map it server-side:

- [ ] **Step 2: Update checkout route to accept planKey**

Edit `app/api/stripe/checkout/route.ts`. Replace the `priceId` validation block:

Old code:
```ts
  // Validate priceId against the known price map — never trust user-supplied IDs.
  const { priceId, successUrl = "/", cancelUrl = "/" } = body;
  if (typeof priceId !== "string" || !priceIdToPlan(priceId)) {
    return Response.json({ error: "Invalid price ID" }, { status: 400 });
  }
```

New code:
```ts
  // Accept a logical planKey and resolve it server-side to a Stripe price ID.
  // This ensures the client cannot substitute a cheaper price.
  const { planKey, successUrl = "/", cancelUrl = "/" } = body as { planKey?: string; successUrl?: string; cancelUrl?: string };

  const PLAN_KEY_TO_PRICE_ID: Record<string, string | undefined> = {
    pro_monthly:     process.env.STRIPE_PRICE_PRO_MONTHLY,
    pro_annual:      process.env.STRIPE_PRICE_PRO_ANNUAL,
    studio_monthly:  process.env.STRIPE_PRICE_STUDIO_MONTHLY,
    studio_annual:   process.env.STRIPE_PRICE_STUDIO_ANNUAL,
    lifetime:        process.env.STRIPE_PRICE_LIFETIME,
  };

  if (typeof planKey !== "string" || !PLAN_KEY_TO_PRICE_ID[planKey]) {
    return Response.json({ error: "Invalid plan key" }, { status: 400 });
  }
  const priceId = PLAN_KEY_TO_PRICE_ID[planKey]!;
```

Also update the `priceIdToPlan` call to use `priceId` which is now set:

```ts
  const plan = priceIdToPlan(priceId);
  const isLifetime = plan === "lifetime";
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/_components/pricing-modal.tsx app/api/stripe/checkout/route.ts
git commit -m "feat: add pricing modal with upgrade-prompt and pricing modes"
```

---

## Task 10: Billing section

**Files:**
- Create: `app/_components/account/billing-section.tsx`
- Modify: `app/_components/account/account-sections.tsx`

- [ ] **Step 1: Create the real billing section**

Create `app/_components/account/billing-section.tsx`:

```tsx
"use client";

import { useState } from "react";
import { SectionHeader } from "@/app/_components/account/account-form-ui";
import { usePlan } from "@/app/_hooks/usePlan";

type BillingSectionProps = {
  onOpenPricingModal: () => void;
};

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  studio: "Studio",
  lifetime: "Lifetime",
};

const PLAN_COLORS: Record<string, string> = {
  free: "bg-neutral-100 text-neutral-600",
  pro: "bg-blue-100 text-blue-700",
  studio: "bg-[#1e3a8a]/10 text-[#1e3a8a]",
  lifetime: "bg-amber-100 text-amber-700",
};

export function BillingSection({ onOpenPricingModal }: BillingSectionProps) {
  const { plan, planExpiresAt, canPublish, isLoading } = usePlan();
  const [portalLoading, setPortalLoading] = useState(false);

  const isPaid = plan !== "free";
  const isExpired = planExpiresAt
    ? plan !== "lifetime" && new Date(planExpiresAt) < new Date()
    : false;
  const isPaymentFailed = isPaid && isExpired;

  async function handleManageSubscription() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(data.error ?? "Something went wrong");
        return;
      }
      const { url } = await res.json();
      if (url) window.location.href = url;
    } finally {
      setPortalLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div>
        <SectionHeader title="Billing" description="Manage your subscription and payment details." />
        <div className="h-24 animate-pulse rounded-xl bg-neutral-100" />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title="Billing" description="Manage your subscription and payment details." />

      {/* Payment failed banner */}
      {isPaymentFailed && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <div className="text-sm font-semibold text-red-700">Your last payment failed</div>
          <p className="mt-0.5 text-xs text-red-600">
            Update your payment method to keep your plan active.
          </p>
          <button
            type="button"
            onClick={handleManageSubscription}
            disabled={portalLoading}
            className="mt-2 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 transition hover:bg-red-100 disabled:opacity-60"
          >
            {portalLoading ? "Loading..." : "Update payment method"}
          </button>
        </div>
      )}

      {/* Current plan */}
      <div className="mb-4 rounded-xl border border-neutral-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-neutral-500">Current plan</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${PLAN_COLORS[plan] ?? PLAN_COLORS.free}`}>
                {PLAN_LABELS[plan] ?? plan}
              </span>
              {isPaid && !isExpired && planExpiresAt && plan !== "lifetime" && (
                <span className="text-xs text-neutral-400">
                  Renews {new Date(planExpiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              )}
              {plan === "lifetime" && (
                <span className="text-xs text-neutral-400">No expiry</span>
              )}
            </div>
          </div>

          {isPaid && !isExpired ? (
            <button
              type="button"
              onClick={handleManageSubscription}
              disabled={portalLoading}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
            >
              {portalLoading ? "Loading..." : "Manage subscription"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenPricingModal}
              className="rounded-xl bg-[#1e3a8a] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#1e3a8a]/90"
            >
              Upgrade
            </button>
          )}
        </div>
      </div>

      {/* Free plan callout */}
      {!isPaid && (
        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3 text-xs text-neutral-500 leading-5">
          <span className="font-medium text-neutral-700">Need to demo at a convention?</span>
          {" "}Use Convention mode — no subscription required. Start a local session from the studio toolbar.
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update account-sections.tsx to use the new BillingSection**

In `app/_components/account/account-sections.tsx`, replace the existing `BillingSection` export (lines 505–517):

Old code:
```tsx
export function BillingSection() {
  return (
    <div>
      <SectionHeader title="Billing" description="Manage your subscription and payment details." />
      <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-5 py-10 text-center">
        <div className="text-sm font-medium text-neutral-600">Billing management is coming soon.</div>
        <p className="mt-1.5 text-xs text-neutral-400">
          Subscription plans, invoices, and payment methods will appear here.
        </p>
      </div>
    </div>
  );
}
```

New code:
```tsx
export { BillingSection } from "@/app/_components/account/billing-section";
```

- [ ] **Step 3: Update account-panel.tsx to pass onOpenPricingModal**

In `app/_components/account-panel.tsx`:

1. Add `onOpenPricingModal?: () => void` to `AccountPanelProps`.
2. Destructure it in the function signature.
3. Pass it to the `BillingSection` case in the switch statement:

```tsx
// In AccountPanelProps type:
onOpenPricingModal?: () => void;

// In the switch:
case "billing":
  sectionContent = <BillingSection onOpenPricingModal={onOpenPricingModal ?? (() => {})} />;
  break;
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add app/_components/account/billing-section.tsx app/_components/account/account-sections.tsx app/_components/account-panel.tsx
git commit -m "feat: replace billing placeholder with real billing section UI"
```

---

## Task 11: Publish gating and upgrade prompt

**Files:**
- Modify: `app/_components/authoring-studio.tsx`

When a Free user activates the publish toggle, intercept the action, show the pricing modal in "upgrade-prompt" mode, and prevent the publish from going through.

- [ ] **Step 1: Add pricing modal state and import to authoring-studio.tsx**

In `app/_components/authoring-studio.tsx`, add the following imports:

```tsx
import { usePlan } from "@/app/_hooks/usePlan";
import { PricingModal } from "@/app/_components/pricing-modal";
```

At the top of the `AuthoringStudio` component body, add:

```tsx
const { canPublish } = usePlan();
const [showPricingModal, setShowPricingModal] = useState<"upgrade-prompt" | "pricing" | null>(null);
```

- [ ] **Step 2: Intercept handleExperienceStatusChange**

Find this in `authoring-studio.tsx`:

```tsx
const handleExperienceStatusChange = useCallback((status: ExperienceStatus) => {
  setPublishStatus(status);
}, [setPublishStatus]);
```

Replace with:

```tsx
const handleExperienceStatusChange = useCallback((status: ExperienceStatus) => {
  if (status === "published" && !canPublish) {
    setShowPricingModal("upgrade-prompt");
    return;
  }
  setPublishStatus(status);
}, [setPublishStatus, canPublish]);
```

- [ ] **Step 3: Pass onOpenPricingModal to AccountPanel**

In the JSX where `AccountPanel` is rendered (search for `<AccountPanel`), add:

```tsx
onOpenPricingModal={() => setShowPricingModal("pricing")}
```

- [ ] **Step 4: Render PricingModal**

Find the closing `</React.Fragment>` or the last JSX element before the component return ends. Add:

```tsx
{showPricingModal && (
  <PricingModal
    mode={showPricingModal}
    onClose={() => setShowPricingModal(null)}
  />
)}
```

Place it just before the `</div>` that closes the outermost container of the component return.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Manual test**

With the dev server running, sign in, and try to activate the publish toggle. Expected: pricing modal appears in upgrade-prompt mode instead of publishing. Close the modal. The experience stays in draft state.

- [ ] **Step 7: Commit**

```bash
git add app/_components/authoring-studio.tsx
git commit -m "feat: gate publish action behind plan check, show upgrade prompt for free users"
```

---

## Task 12: Convention mode

**Files:**
- Modify: `app/_components/authoring-studio.tsx`
- Modify: `app/_components/preview-canvas.tsx`

Convention mode = `isPreviewMode: true` with a visible badge. Available to all users. Entry point: in the preview canvas toolbar, where the publish controls live.

- [ ] **Step 1: Add conventionMode state to authoring-studio.tsx**

In `authoring-studio.tsx`, add alongside the other state declarations:

```tsx
const [conventionMode, setConventionMode] = useState(false);
```

Add handlers:

```tsx
const handleStartConventionMode = useCallback(() => {
  setIsPreviewMode(true);
  setConventionMode(true);
}, []);

const handleStopConventionMode = useCallback(() => {
  setConventionMode(false);
  setIsPreviewMode(false);
}, []);
```

- [ ] **Step 2: Pass convention mode props to sharedCanvasProps**

In `sharedCanvasProps` object (around line 406 in authoring-studio.tsx), add:

```tsx
conventionMode,
onStartConventionMode: handleStartConventionMode,
onStopConventionMode: handleStopConventionMode,
```

- [ ] **Step 3: Add convention mode props to PreviewCanvas**

In `app/_components/preview-canvas.tsx`, find the props type for `PreviewCanvas` and add:

```tsx
conventionMode?: boolean;
onStartConventionMode?: () => void;
onStopConventionMode?: () => void;
```

Destructure them in the function signature alongside `experienceStatus`.

- [ ] **Step 4: Add "Start convention" button in preview-canvas.tsx**

Locate `renderExperienceStatusControl` in `preview-canvas.tsx`. This function renders the draft/published toggle. Modify it to also accept `canPublish` from `usePlan()`:

At the top of `PreviewCanvas`, add:

```tsx
const { canPublish } = usePlan();
```

Import `usePlan`:

```tsx
import { usePlan } from "@/app/_hooks/usePlan";
```

In `renderExperienceStatusControl`, add a "Start convention session" button for free users alongside (or replacing) the locked publish button:

```tsx
function renderExperienceStatusControl({ dark = false } = {}) {
  // ... existing toggle code ...

  // After the existing draft/published toggle, add:
  return (
    <div className="flex items-center gap-2">
      {/* Existing publish toggle — only shown when canPublish */}
      {canPublish ? (
        <div role="group" aria-label="Publish status" className={`inline-flex items-center rounded-xl border p-1 shadow-sm ${containerClass}`}>
          {(["draft", "published"] as ExperienceStatus[]).map((status) => {
            /* ... existing button code ... */
          })}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {/* setShowPricingModal — need to pass this down */}}
          className="inline-flex items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 text-xs font-medium text-neutral-500 shadow-sm"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d="M8.5 5V3.5a2.5 2.5 0 00-5 0V5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <rect x="1.5" y="5" width="9" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Publish (Pro)
        </button>
      )}

      {/* Convention mode button — shown when not already in convention mode */}
      {!conventionMode && (
        <button
          type="button"
          onClick={onStartConventionMode}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium shadow-sm transition ${
            dark
              ? "border-neutral-700 bg-neutral-800 text-neutral-300 hover:bg-neutral-700"
              : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <polygon points="2,1 11,6 2,11" fill="currentColor" opacity="0.8" />
          </svg>
          Convention
        </button>
      )}

      {/* Exit convention mode */}
      {conventionMode && (
        <button
          type="button"
          onClick={onStopConventionMode}
          className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
          Convention mode — Exit
        </button>
      )}
    </div>
  );
}
```

**Note:** The `renderExperienceStatusControl` function needs to be refactored to use the props directly rather than closing over them from the outer function. Treat the above as pseudocode — adapt it to match the actual function signature in preview-canvas.tsx. The key changes are:
1. Import and call `usePlan()` at the top of `PreviewCanvas`
2. Render the lock button when `!canPublish`
3. Add the convention mode button using `onStartConventionMode`
4. Add the exit button when `conventionMode` is true

- [ ] **Step 5: Add the "Convention mode" floating badge in preview canvas**

When `conventionMode` is true and `isPreviewMode` is true, show a floating badge. In `preview-canvas.tsx`, find where the preview content is rendered. Add:

```tsx
{conventionMode && isPreviewMode && (
  <div className="pointer-events-none absolute left-1/2 top-4 z-20 -translate-x-1/2">
    <div className="flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Convention mode — session ends when you close this tab
    </div>
  </div>
)}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add app/_components/authoring-studio.tsx app/_components/preview-canvas.tsx
git commit -m "feat: add convention mode — device-local preview session for free users"
```

---

## Task 13: Player branding badge

**Files:**
- Modify: `app/_components/player-view.tsx`
- Modify: `app/play/[gameId]/page.tsx`

- [ ] **Step 1: Add hasBranding prop to PlayerView**

In `app/_components/player-view.tsx`, add `hasBranding?: boolean` to the props type and destructure it:

```tsx
export function PlayerView({
  pages,
  systemSettings,
  hasBranding = false,
}: {
  pages: PageItem[];
  systemSettings: SystemSettings;
  hasBranding?: boolean;
}) {
```

Find the return JSX (the outermost `<div>` wrapping the player). Add the branding badge before the closing tag:

```tsx
{hasBranding && (
  <div className="pointer-events-none absolute bottom-4 left-1/2 z-50 -translate-x-1/2">
    <a
      href="https://sherpa.app"
      target="_blank"
      rel="noopener noreferrer"
      className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-white/20 bg-black/60 px-3 py-1.5 text-xs font-medium text-white/80 backdrop-blur-sm transition hover:bg-black/75"
      aria-label="Built with Sherpa"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" opacity="0.7" />
        <path d="M6 3v3l2 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
      Built with Sherpa
    </a>
  </div>
)}
```

Make sure the outer container has `relative` positioning for `absolute` children to work:

```tsx
<div className="relative h-full w-full overflow-hidden">
  {/* existing content */}
  {hasBranding && ( /* badge */ )}
</div>
```

- [ ] **Step 2: Pass hasBranding from authoring studio preview**

In `app/_components/authoring-studio.tsx`, add `hasBranding` from `usePlan()`:

```tsx
const { canPublish, hasBranding } = usePlan();
```

Find where `PlayerView` is used inside the preview canvas or wherever the in-studio preview renders. (It may be inside `PreviewCanvas` — trace through to where `PlayerView` is rendered in preview mode.)

Pass `hasBranding={hasBranding || conventionMode}` to `PlayerView`.

- [ ] **Step 3: Fetch branding status in the public play route**

In `app/play/[gameId]/page.tsx`, after loading the game, fetch the branding status:

```tsx
const [hasBranding, setHasBranding] = useState(true); // conservative default

useEffect(() => {
  if (!gameId) return;
  fetch("/api/stripe/entitlement", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gameId }),
  })
    .then((r) => r.json())
    .then((data: { hasBranding?: boolean }) => {
      setHasBranding(data.hasBranding ?? true);
    })
    .catch(() => setHasBranding(true));
}, [gameId]);
```

Pass `hasBranding` to `PlayerView`:

```tsx
return <PlayerView pages={pages} systemSettings={systemSettings} hasBranding={hasBranding} />;
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Manual test**

With a free account: open the published play URL for a game. Expected: "Built with Sherpa" badge visible at the bottom.

- [ ] **Step 6: Commit**

```bash
git add app/_components/player-view.tsx app/play/[gameId]/page.tsx app/_components/authoring-studio.tsx
git commit -m "feat: add Sherpa branding badge to player view for free accounts"
```

---

## Task 14: Bump version and patch notes

**Files:**
- Modify: `app/_lib/authoring-utils.ts`
- Modify: `app/_lib/patch-notes.ts`

- [ ] **Step 1: Bump APP_VERSION**

In `app/_lib/authoring-utils.ts`, change:

```ts
export const APP_VERSION = "v0.18.1";
```

To:

```ts
export const APP_VERSION = "v0.19.0";
```

- [ ] **Step 2: Add patch note**

In `app/_lib/patch-notes.ts`, prepend to the `PATCH_NOTES` array:

```ts
{
  version: "v0.19.0",
  date: "2026-04-09",
  changes: [
    "Subscription billing via Stripe — Pro, Studio, and Lifetime plans",
    "Billing section in account settings: plan badge, manage subscription, and upgrade flow",
    "Publish is now gated on a Pro or higher plan — free users see an upgrade prompt",
    "Convention mode: start a device-local player session from the studio toolbar",
    "'Built with Sherpa' badge shown in player view for Free accounts",
    "Stripe webhooks keep plan state in sync; plan_expires_at acts as a safety net",
  ],
},
```

- [ ] **Step 3: Type-check and final check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add app/_lib/authoring-utils.ts app/_lib/patch-notes.ts
git commit -m "chore: bump to v0.19.0 — stripe billing integration"
```

---

## Post-implementation checklist

Before considering this done, verify these scenarios manually:

- [ ] Free user sees upgrade prompt when trying to publish
- [ ] Free user can start a convention session and see the badge
- [ ] Free user's play URL shows the "Built with Sherpa" badge
- [ ] Billing section shows "Free plan" badge + "Upgrade" button + convention callout
- [ ] Stripe Checkout opens and completes (use test card `4242 4242 4242 4242`)
- [ ] After checkout, webhook fires and `profiles.plan` is updated in Supabase
- [ ] After plan update, refresh the page and `usePlan()` returns the new plan
- [ ] Pro/Studio user does NOT see upgrade prompt when publishing
- [ ] Pro/Studio user does NOT see "Built with Sherpa" badge
- [ ] "Manage subscription" → Stripe portal opens
