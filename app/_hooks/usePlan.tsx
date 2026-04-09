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
