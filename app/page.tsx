"use client";

import dynamic from "next/dynamic";

const AuthoringStudio = dynamic(
  () => import("@/app/_components/authoring-studio").then((m) => ({ default: m.AuthoringStudio })),
  { ssr: false }
);

export default function Page() {
  return <AuthoringStudio />;
}
