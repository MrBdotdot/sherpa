"use client";

import dynamic from "next/dynamic";
import { MobileLanding } from "@/app/_components/mobile-landing";
import { LoginScreen } from "@/app/_components/login-screen";
import { useAuth } from "@/app/_hooks/useAuth";
import { useMobileDetect } from "@/app/_hooks/useMobileDetect";
import { PlanProvider } from "@/app/_hooks/usePlan";
import { UserMetadata } from "@/app/_lib/user-profile";

const AuthoringStudio = dynamic(
  () => import("@/app/_components/authoring-studio").then((m) => ({ default: m.AuthoringStudio })),
  { ssr: false }
);

function AppShellLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-6">
      <div className="w-full max-w-sm rounded-3xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-sm">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
        </div>
        <div className="mt-4 text-base font-semibold text-neutral-900">Loading your rules workspace</div>
        <p className="mt-1 text-sm text-neutral-500">
          Checking your session and preparing the latest experience.
        </p>
      </div>
    </div>
  );
}

export function AppShell() {
  const isMobile = useMobileDetect();
  const { user, loading } = useAuth();

  if (isMobile === null || loading) {
    return <AppShellLoading />;
  }

  if (isMobile) return <MobileLanding />;
  if (!user) return <LoginScreen />;

  return (
    <PlanProvider>
      <AuthoringStudio
        userId={user.id}
        userEmail={user.email ?? ""}
        userMetadata={(user.user_metadata as UserMetadata) ?? {}}
      />
    </PlanProvider>
  );
}
