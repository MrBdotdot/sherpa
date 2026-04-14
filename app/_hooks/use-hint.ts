"use client";

import { useState } from "react";

export function useHint(id: string) {
  const key = `sherpa-hint-${id}`;
  const [dismissed, setDismissed] = useState(
    () => typeof window !== "undefined" && localStorage.getItem(key) === "true"
  );
  const dismiss = () => {
    if (typeof window !== "undefined") localStorage.setItem(key, "true");
    setDismissed(true);
  };
  return { shouldShow: !dismissed, dismiss };
}
