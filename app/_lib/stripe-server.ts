import Stripe from "stripe";

// Singleton — re-used across invocations in the same Lambda warm instance.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-03-25.dahlia",
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
