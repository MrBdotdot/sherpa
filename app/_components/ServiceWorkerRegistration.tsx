"use client";

import { useEffect } from "react";
import { Workbox } from "workbox-window";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const wb = new Workbox("/sw.js", { scope: "/play/" });
    wb.register().then(() => {
      console.log("[SW] registered");
    }).catch((err) => {
      console.error("[SW] registration failed", err);
    });
  }, []);

  return null;
}
