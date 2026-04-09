# Stripe Billing Integration — Design Spec
**Date:** 2026-04-09  
**Status:** Approved

---

## Overview

Add subscription billing to Sherpa using Stripe. The app stores plan entitlements in Supabase and reads them at runtime — it never calls Stripe during normal usage. Webhooks keep the DB in sync. Three subscription tiers (Free, Pro, Studio) plus a one-time Lifetime deal.

---

## Plan Tiers

| Feature | Free | Pro | Studio | Lifetime |
|---|---|---|---|---|
| Games | Unlimited | Unlimited | Unlimited | Unlimited |
| Convention mode | ✅ | ✅ | ✅ | ✅ |
| Publish to permanent URL | ❌ | ✅ | ✅ | ✅ |
| Sherpa branding removed | ❌ | ✅ | ✅ | ✅ |
| Team seats | ❌ | ❌ | 3 | 1 (hard cap) |
| Early access | ❌ | ❌ | ✅ | ✅ |
| **Price** | Free | ~$19/mo | ~$49/mo | ~$299 one-time |

**Convention mode:** Free users can run a live player experience locally — the author opens Sherpa, starts a convention session, and players interact via the same device or local network. The session ends when the tab closes. No permanent URL. Sherpa branding and watermark are shown.

**Lifetime seats:** Hard cap of 1 user. No add-ons. The billing UI notes: "Lifetime is a single-user license. Need a team? Contact us." with a mailto link.

**Annual pricing:** Pro and Studio offer annual plans at ~20% discount. Stripe handles proration.

---

## Data Model

New `profiles` table in Supabase. One row per authenticated user.

```sql
CREATE TABLE profiles (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan                    text NOT NULL DEFAULT 'free',
  stripe_customer_id      text,
  stripe_subscription_id  text,
  plan_expires_at         timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own row
CREATE POLICY "users_read_own_profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

-- Only service role can write (webhooks use service role key)
-- No INSERT/UPDATE/DELETE policy for authenticated users
```

`plan` values: `'free'` | `'pro'` | `'studio'` | `'lifetime'`

`plan_expires_at`: set to the Stripe subscription's `current_period_end` on each renewal. Acts as a safety net — if a webhook is missed, the plan falls back to free at expiry rather than staying elevated forever. Null for lifetime (never expires) and free (no expiry needed).

The `updated_at` column is maintained by the existing `update_updated_at()` trigger (already in the schema).

---

## Security

**Webhook signature verification:** Every request to `/api/webhooks/stripe` is verified with `stripe.webhooks.constructEvent()` using `STRIPE_WEBHOOK_SECRET`. Requests with invalid signatures return 400 and are dropped.

**RLS write protection:** The `profiles` table has no write policy for authenticated users. Only the service role key (used server-side in the webhook handler) can update `plan`. A client-side Supabase call cannot escalate its own plan.

**Service role key:** `SUPABASE_SERVICE_ROLE_KEY` is already in `.env.local`, never in the client bundle. The webhook route and entitlement write path use it server-side only.

**Checkout price integrity:** The `priceId` passed to `/api/stripe/checkout` comes from server-side env vars (`STRIPE_PRICE_PRO_MONTHLY` etc.), never from user-supplied input. A user cannot substitute a different price ID to get a cheaper plan.

**plan_expires_at safety net:** Entitlement resolution checks both `plan` and `plan_expires_at`. If `plan_expires_at` is in the past and `plan` is not `'free'` or `'lifetime'`, the user is treated as free until the webhook catches up.

---

## API Routes

All routes in `app/api/stripe/`. All except the webhook require an authenticated Supabase session (`supabase.auth.getUser()` server-side; return 401 if not signed in).

### `POST /api/stripe/checkout`

Creates a Stripe Checkout session.

**Request body:**
```json
{ "priceId": "price_xxx", "successUrl": "/", "cancelUrl": "/" }
```

**Logic:**
1. Verify auth, get `userId`.
2. Look up `stripe_customer_id` from `profiles`. If none, create a Stripe customer with the user's email and save it back to `profiles`.
3. Create a `checkout.session` with `mode: 'subscription'` (or `'payment'` for lifetime).
4. Return `{ url }`. Client redirects to it.

### `POST /api/stripe/portal`

Creates a Stripe Billing Portal session.

**Logic:**
1. Verify auth, get `userId`.
2. Look up `stripe_customer_id` from `profiles`. Return 400 if none (user has no billing history).
3. Create portal session with `return_url: '/'`.
4. Return `{ url }`. Client redirects to it.

### `POST /api/webhooks/stripe`

Receives and processes Stripe events. **Not auth-gated — signature-verified instead.**

**Handled events:**

| Event | Action |
|---|---|
| `checkout.session.completed` | Resolve plan from `price_id`, write `plan`, `stripe_customer_id`, `stripe_subscription_id`, `plan_expires_at` to `profiles` |
| `customer.subscription.updated` | Update `plan` and `plan_expires_at` |
| `customer.subscription.deleted` | Set `plan = 'free'`, clear `stripe_subscription_id`, clear `plan_expires_at` |
| `invoice.payment_failed` | No plan change — trigger payment failed email via Resend (already wired) |

Unhandled event types return 200 (Stripe requires 200 to stop retrying).

**Resolving plan from price ID:** A server-side map from Stripe price IDs (env vars) to plan strings. e.g. `STRIPE_PRICE_PRO_MONTHLY → 'pro'`, `STRIPE_PRICE_LIFETIME → 'lifetime'`.

### `GET /api/stripe/entitlement`

Returns the current user's entitlement state.

**Response:**
```json
{ "plan": "pro", "planExpiresAt": "2026-05-09T00:00:00Z" }
```

Used by the client to populate `usePlan()` context. Does not expose Stripe IDs.

---

## Client-Side Entitlement

### `usePlan()` hook

Fetches from `/api/stripe/entitlement` once on mount, caches in React context. Exposes:

```ts
{
  plan: 'free' | 'pro' | 'studio' | 'lifetime';
  canPublish: boolean;       // pro | studio | lifetime
  hasBranding: boolean;      // free (including convention mode)
  hasTeamSeats: boolean;     // studio | lifetime (1 seat only for lifetime)
  isLoading: boolean;
}
```

`canPublish` also checks `plan_expires_at` — if expired, returns false regardless of `plan`.

The hook is provided via a `PlanProvider` wrapping `AuthoringStudio`. Components and handlers import `usePlan()` — no plan string comparisons elsewhere in the codebase.

---

## Feature Gating

### Publish

When a Free user activates the publish toggle (`handleExperienceStatusChange('published')`):
- If `!canPublish`: intercept, show the **Upgrade prompt modal** instead of publishing.
- Upgrade prompt: lightweight modal — "Publishing requires a Pro plan" + brief value prop + "See plans" CTA → opens Pricing modal.

### Convention mode

Available to all users. Entry point: where the publish toggle currently lives, Free users see a "Start convention session" button instead of (or alongside) the locked publish toggle.

Convention session = full preview mode (`isPreviewMode: true`) with:
- A floating "Convention mode" indicator badge
- Sherpa branding/watermark rendered in `PlayerView` (same as the `hasBranding` flag)
- No permanent URL — session ends when tab closes or user exits

### Sherpa branding

`PlayerView` renders a "Built with Sherpa" footer badge when `hasBranding` is true. Links to the Sherpa marketing site. Shown in both convention mode and the permanent player URL for Free accounts.

---

## Billing UI

### Account panel — Billing section

Replaces the current "coming soon" placeholder.

**Subscribed state:**
- Plan badge (Pro / Studio / Lifetime)
- Next billing date and amount
- "Manage subscription" button → POST `/api/stripe/portal` → redirect

**Free state:**
- "Free plan" badge
- "Upgrade" button → opens Pricing modal
- Convention mode callout: "Need to demo at a convention? Use Convention mode — no subscription required."

**Payment failed state:**
- Red banner: "Your last payment failed. Update your payment method to keep your plan."
- "Update payment method" CTA → portal redirect
- Detected via `plan_expires_at` being in the past while `plan` is not free. (For a more precise signal, a future iteration can add a `payment_failed` boolean to `profiles`, set by the `invoice.payment_failed` webhook and cleared on successful renewal.)

### Pricing modal

Triggered from billing section or publish upgrade prompt.

- Monthly / Annual toggle (annual = ~20% discount, shown as savings)
- Three plan cards: Pro, Studio, Lifetime callout
- Each card CTA → POST `/api/stripe/checkout` with the relevant `priceId`
- Lifetime shown as a separate callout below: "Limited availability — one-time payment"
- Current plan highlighted if already subscribed

---

## Environment Variables

```
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_PRO_MONTHLY
STRIPE_PRICE_PRO_ANNUAL
STRIPE_PRICE_STUDIO_MONTHLY
STRIPE_PRICE_STUDIO_ANNUAL
STRIPE_PRICE_LIFETIME
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY  (only needed if using Stripe.js — not required for this approach)
```

All server-side except `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, which is not needed since checkout is handled via server-side session redirect (no Stripe.js on the client).

---

## Out of Scope (this spec)

- Plan limits enforcement (max games, hotspot limits) — separate spec
- Analytics wired to real data — separate spec
- GDPR / cookie consent banner — separate spec
- VAT / sales tax handling — revisit if EU volume warrants Paddle migration
- Team seat invitations — deferred until Studio has paying customers
