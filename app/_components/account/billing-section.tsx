"use client";

import React, { useState } from "react";
import { SectionHeader } from "@/app/_components/account/account-form-ui";
import { usePlan, Plan } from "@/app/_hooks/usePlan";

export type BillingSectionProps = {
  onOpenPricingModal: () => void;
};

async function openPortal(setLoading: (v: boolean) => void): Promise<void> {
  setLoading(true);
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
    setLoading(false);
  }
}

function PlanBadge({ plan }: { plan: Plan }) {
  if (plan === "free") {
    return (
      <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-600">
        Free
      </span>
    );
  }
  if (plan === "pro") {
    return (
      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
        Pro
      </span>
    );
  }
  if (plan === "studio") {
    return (
      <span
        className="rounded-full px-2.5 py-1 text-xs font-semibold text-white"
        style={{ backgroundColor: "#1e3a8a" }}
      >
        Studio
      </span>
    );
  }
  if (plan === "lifetime") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
        Lifetime
      </span>
    );
  }
  return null;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function isExpired(planExpiresAt: string | null): boolean {
  if (!planExpiresAt) return false;
  return new Date(planExpiresAt) < new Date();
}

export function BillingSection({ onOpenPricingModal }: BillingSectionProps) {
  const { plan, planExpiresAt, isLoading } = usePlan();
  const [portalLoading, setPortalLoading] = useState(false);

  return (
    <div>
      <SectionHeader
        title="Billing"
        description="Manage your subscription and payment details."
      />

      {isLoading && (
        <div className="h-24 animate-pulse rounded-xl bg-neutral-100" />
      )}

      {!isLoading && plan === "free" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3.5">
            <PlanBadge plan="free" />
            <span className="flex-1 text-sm text-neutral-600">You are on the Free plan.</span>
            <button
              type="button"
              onClick={onOpenPricingModal}
              className="rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-medium text-white hover:bg-[#1e3a8a]/90 transition"
            >
              Upgrade
            </button>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3.5">
            <div className="text-sm font-medium text-neutral-700">Convention mode</div>
            <p className="mt-1 text-xs text-neutral-500 leading-5">
              Need to demo at a convention? Use Convention mode — no subscription required. Start a local session from the studio toolbar.
            </p>
          </div>
        </div>
      )}

      {!isLoading && plan !== "free" && isExpired(planExpiresAt) && (
        <div className="space-y-4">
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3.5">
            <div className="text-sm font-medium text-red-700">
              Your last payment failed. Update your payment method to keep your plan active.
            </div>
          </div>
          <button
            type="button"
            disabled={portalLoading}
            onClick={() => openPortal(setPortalLoading)}
            className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition disabled:opacity-50"
          >
            {portalLoading ? "Redirecting…" : "Update payment method"}
          </button>
        </div>
      )}

      {!isLoading && plan !== "free" && !isExpired(planExpiresAt) && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 rounded-xl border border-neutral-200 px-4 py-3.5">
            <PlanBadge plan={plan} />
            <span className="flex-1 text-sm text-neutral-600">
              {plan === "lifetime"
                ? "No expiry"
                : planExpiresAt
                ? `Renews ${formatDate(planExpiresAt)}`
                : "Active subscription"}
            </span>
            <button
              type="button"
              disabled={portalLoading}
              onClick={() => openPortal(setPortalLoading)}
              className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition disabled:opacity-50"
            >
              {portalLoading ? "Redirecting…" : "Manage subscription"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
