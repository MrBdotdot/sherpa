"use client";

import dynamic from "next/dynamic";
import { MobileLanding } from "@/app/_components/mobile-landing";
import { LoginScreen } from "@/app/_components/login-screen";
import { useMobileDetect } from "@/app/_hooks/useMobileDetect";
import { useAuth } from "@/app/_hooks/useAuth";

const AuthoringStudio = dynamic(
  () => import("@/app/_components/authoring-studio").then((m) => ({ default: m.AuthoringStudio })),
  { ssr: false }
);

export default function Page() {
  const isMobile = useMobileDetect();
  const { user, loading } = useAuth();

  // Render nothing on first pass to avoid flash of wrong layout or auth state.
  if (isMobile === null || loading) return null;

  if (isMobile) return <MobileLanding />;
  if (!user) return <LoginScreen />;

  return <AuthoringStudio userId={user.id} userEmail={user.email ?? ""} />;
}
