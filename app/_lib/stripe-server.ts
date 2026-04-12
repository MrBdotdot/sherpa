import Stripe from "stripe";

// Lazy singleton — instantiated on first use so the module can be evaluated
// at build time even when STRIPE_SECRET_KEY is absent from the build env.
let _stripe: Stripe | null = null;

function getInstance(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not configured.");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop: string | symbol) {
    return getInstance()[prop as keyof Stripe];
  },
});

// Maps Stripe price IDs (from env vars) to plan strings.
// Add or update entries when new plans are created in the Stripe dashboard.
export type Plan = "free" | "pro" | "studio" | "lifetime";

export function priceIdToPlan(priceId: string): Plan | null {
  if (!priceId) return null;  // Reject empty strings (unset env var fallback)
  const map: Record<string, Plan> = Object.fromEntries(
    ([
      [process.env.STRIPE_PRICE_PRO_MONTHLY,    "pro"],
      [process.env.STRIPE_PRICE_PRO_ANNUAL,     "pro"],
      [process.env.STRIPE_PRICE_STUDIO_MONTHLY, "studio"],
      [process.env.STRIPE_PRICE_STUDIO_ANNUAL,  "studio"],
      [process.env.STRIPE_PRICE_LIFETIME,       "lifetime"],
    ] as [string | undefined, Plan][]).filter(([k]) => !!k)
  ) as Record<string, Plan>;
  return map[priceId] ?? null;
}
