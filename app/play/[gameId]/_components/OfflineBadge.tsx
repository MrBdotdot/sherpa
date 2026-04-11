"use client";

import { useEffect, useState } from "react";

type CacheStatus = "idle" | "already-cached" | "success" | "error";

export function OfflineBadge({ status }: { status: CacheStatus }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "success" && status !== "error") return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-800/95 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
    >
      {status === "success" ? (
        <>
          <svg
            className="h-4 w-4 shrink-0 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Ready for offline
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4 shrink-0 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Offline unavailable
        </>
      )}
    </div>
  );
}
