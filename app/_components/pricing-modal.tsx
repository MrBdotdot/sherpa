"use client";

import { useState } from "react";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

type PricingModalProps = {
  mode: "upgrade-prompt" | "pricing";
  onClose: () => void;
};

type BillingCycle = "monthly" | "annual";

type PlanKey =
  | "pro_monthly"
  | "pro_annual"
  | "studio_monthly"
  | "studio_annual"
  | "lifetime";

async function startCheckout(
  planKey: PlanKey,
  setLoadingPlan: (key: PlanKey | null) => void
) {
  setLoadingPlan(planKey);
  try {
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ planKey, successUrl: "/", cancelUrl: "/" }),
    });
    const data = await res.json();
    if (res.ok) {
      window.location.href = data.url;
    } else {
      alert(data.error ?? "Something went wrong. Please try again.");
      setLoadingPlan(null);
    }
  } catch {
    alert("Something went wrong. Please try again.");
    setLoadingPlan(null);
  }
}

export function PricingModal({ mode, onClose }: PricingModalProps) {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<PlanKey | null>(null);

  const dialogRef = useFocusTrap<HTMLDivElement>(true);

  const proKey: PlanKey =
    billingCycle === "monthly" ? "pro_monthly" : "pro_annual";
  const studioKey: PlanKey =
    billingCycle === "monthly" ? "studio_monthly" : "studio_annual";

  const proPrice = billingCycle === "monthly" ? "$19/mo" : "$15/mo";
  const studioPrice = billingCycle === "monthly" ? "$49/mo" : "$39/mo";
  const proAnnualNote =
    billingCycle === "annual" ? "billed $182/yr" : null;
  const studioAnnualNote =
    billingCycle === "annual" ? "billed $470/yr" : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      {/* Overlay click target */}
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0"
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Choose a plan"
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
      >
        {/* Close button */}
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path
              d="M1 1l12 12M13 1L1 13"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Header */}
        {mode === "upgrade-prompt" ? (
          <div className="mb-5">
            <h2 className="text-base font-semibold text-neutral-900">
              Publish to a permanent URL
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Upgrade to Pro to publish your rulebook to a permanent, shareable
              URL — and remove Sherpa branding from the published page.
            </p>
          </div>
        ) : (
          <div className="mb-5 text-center">
            <h2 className="text-xl font-semibold text-neutral-900">
              Choose a plan
            </h2>
            <p className="mt-1 text-sm text-neutral-500">
              Pick the plan that fits your workflow. Cancel or change any time.
            </p>
          </div>
        )}

        {/* Monthly / Annual toggle */}
        <div className="mb-5 flex justify-center">
          <div className="inline-flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-xl px-4 py-1.5 text-sm font-medium transition ${
                billingCycle === "monthly"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBillingCycle("annual")}
              className={`flex items-center gap-1.5 rounded-xl px-4 py-1.5 text-sm font-medium transition ${
                billingCycle === "annual"
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              Annual
              <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plan cards */}
        <div className="mb-4 grid grid-cols-2 gap-4">
          {/* Pro card */}
          <div className="flex flex-col rounded-xl border border-neutral-200 p-4">
            <div className="mb-3">
              <div className="text-sm font-semibold text-neutral-900">Pro</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-neutral-900">
                  {proPrice}
                </span>
              </div>
              {proAnnualNote && (
                <div className="mt-0.5 text-xs text-neutral-400">
                  {proAnnualNote}
                </div>
              )}
            </div>

            <ul className="mb-4 flex-1 space-y-2">
              {[
                "Publish to permanent URL",
                "Sherpa branding removed",
                "Unlimited games",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-neutral-600">
                  <svg
                    className="mt-0.5 shrink-0 text-neutral-400"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M2.5 7l3 3 6-6"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => startCheckout(proKey, setLoadingPlan)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 hover:bg-neutral-50 disabled:opacity-60"
            >
              {loadingPlan === proKey ? "Loading..." : "Get Pro"}
            </button>
          </div>

          {/* Studio card */}
          <div className="flex flex-col rounded-xl border-2 border-[#1e3a8a] p-4">
            <div className="mb-3">
              <div className="flex items-center gap-2">
                <div className="text-sm font-semibold text-neutral-900">
                  Studio
                </div>
                <span className="rounded-full bg-[#1e3a8a]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1e3a8a]">
                  Early access
                </span>
              </div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-bold text-neutral-900">
                  {studioPrice}
                </span>
              </div>
              {studioAnnualNote && (
                <div className="mt-0.5 text-xs text-neutral-400">
                  {studioAnnualNote}
                </div>
              )}
            </div>

            <ul className="mb-4 flex-1 space-y-2">
              {[
                "Everything in Pro",
                "3 team seats",
                "Early access to new features",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-2 text-sm text-neutral-600">
                  <svg
                    className="mt-0.5 shrink-0 text-[#1e3a8a]"
                    width="14"
                    height="14"
                    viewBox="0 0 14 14"
                    fill="none"
                  >
                    <path
                      d="M2.5 7l3 3 6-6"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>

            <button
              type="button"
              disabled={loadingPlan !== null}
              onClick={() => startCheckout(studioKey, setLoadingPlan)}
              className="w-full rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-60"
            >
              {loadingPlan === studioKey ? "Loading..." : "Get Studio"}
            </button>
          </div>
        </div>

        {/* Lifetime callout */}
        <div className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3">
          <div>
            <span className="text-sm font-semibold text-neutral-900">
              $299{" "}
            </span>
            <span className="text-sm text-neutral-500">one-time</span>
            <p className="mt-0.5 text-xs text-neutral-400">
              Single-user license. Need a team?{" "}
              <a
                href="mailto:hello@sherpa.so"
                className="underline hover:text-neutral-600"
              >
                Contact us.
              </a>
            </p>
          </div>
          <button
            type="button"
            disabled={loadingPlan !== null}
            onClick={() => startCheckout("lifetime", setLoadingPlan)}
            className="shrink-0 rounded-xl bg-[#1e3a8a] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3a8a]/90 disabled:opacity-60"
          >
            {loadingPlan === "lifetime" ? "Loading..." : "Buy once"}
          </button>
        </div>
      </div>
    </div>
  );
}
