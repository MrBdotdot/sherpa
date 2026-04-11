"use client";

import { useEffect } from "react";
import { Workbox } from "workbox-window";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const wb = new Workbox("/sw.js", { scope: "/play/" });
    wb.register().catch(() => {
      // Ignore registration failures — app works without SW
    });
  }, []);

  return null;
}
