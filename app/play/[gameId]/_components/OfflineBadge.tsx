"use client";

import { useEffect, useState } from "react";

type CacheStatus = "idle" | "already-cached" | "success" | "error";

export function OfflineBadge({ status }: { status: CacheStatus }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "success" && status !== "error") return;
    setVisible(true);
  }, [status]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-4 left-4 z-50 flex items-center gap-2 rounded-full pl-4 pr-2 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
      style={{ backgroundColor: status === "success" ? "#2e5baa" : "#92400e" }}
    >
      {status === "success" ? "Ready for offline" : "Offline unavailable"}
      <button
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white/60 transition hover:bg-white/10 hover:text-white"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
          <path d="M1.5 1.5l7 7M8.5 1.5l-7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>
    </div>
  );
}
