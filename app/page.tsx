"use client";

import dynamic from "next/dynamic";
import { MobileLanding } from "@/app/_components/mobile-landing";
import { useMobileDetect } from "@/app/_hooks/useMobileDetect";

const AuthoringStudio = dynamic(
  () => import("@/app/_components/authoring-studio").then((m) => ({ default: m.AuthoringStudio })),
  { ssr: false }
);

export default function Page() {
  const isMobile = useMobileDetect();

  // Render nothing on first pass to avoid flash of wrong layout.
  if (isMobile === null) return null;

  if (isMobile) return <MobileLanding />;

  return <AuthoringStudio />;
}
