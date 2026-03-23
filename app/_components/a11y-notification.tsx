"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { A11yViolation } from "@/app/_hooks/useA11yMonitor";

const DURATION_MS = 8000;

const IMPACT_CONFIG: Record<
  "critical" | "serious" | "moderate" | "minor",
  { label: string; badgeCls: string; barCls: string; borderCls: string }
> = {
  critical: {
    label: "Critical",
    badgeCls: "bg-red-100 text-red-700",
    barCls: "bg-red-500",
    borderCls: "border-red-200",
  },
  serious: {
    label: "Serious",
    badgeCls: "bg-orange-100 text-orange-700",
    barCls: "bg-orange-500",
    borderCls: "border-orange-200",
  },
  moderate: {
    label: "Moderate",
    badgeCls: "bg-amber-100 text-amber-700",
    barCls: "bg-amber-400",
    borderCls: "border-amber-200",
  },
  minor: {
    label: "Minor",
    badgeCls: "bg-sky-100 text-sky-700",
    barCls: "bg-sky-400",
    borderCls: "border-sky-200",
  },
};

function A11yToast({
  onDismiss,
  onNavigate,
  violation,
}: {
  onDismiss: () => void;
  onNavigate: (entityId: string, entityType: "feature" | "block") => void;
  violation: A11yViolation;
}) {
  const [progress, setProgress] = useState(100);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    const animate = (timestamp: number) => {
      if (startRef.current === null) startRef.current = timestamp;
      const elapsed = timestamp - startRef.current;
      const remaining = Math.max(0, 100 - (elapsed / DURATION_MS) * 100);
      setProgress(remaining);
      if (remaining > 0) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        onDismissRef.current();
      }
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const config = IMPACT_CONFIG[violation.impact] ?? IMPACT_CONFIG.minor;
  const node = violation.nodes[0];

  const handleNavigate = useCallback(() => {
    if (node.entityId && node.entityType) {
      onNavigate(node.entityId, node.entityType);
      onDismiss();
    }
  }, [node.entityId, node.entityType, onNavigate, onDismiss]);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      className={`relative w-[320px] overflow-hidden rounded-2xl border bg-white shadow-xl ${config.borderCls}`}
    >
      {/* Countdown progress bar */}
      <div
        aria-hidden="true"
        className={`absolute bottom-0 left-0 h-0.5 ${config.barCls} transition-none`}
        style={{ width: `${progress}%` }}
      />

      <div className="p-4">
        <div className="flex items-start gap-3">
          <span
            className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${config.badgeCls}`}
          >
            {config.label}
          </span>

          <div className="min-w-0 flex-1">
            <div className="text-xs font-semibold text-neutral-900">
              Accessibility issue: {violation.id}
            </div>
            <div className="mt-0.5 text-xs leading-4 text-neutral-500">
              {node.failureSummary || violation.description}
            </div>
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss accessibility notification"
            className="shrink-0 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <span aria-hidden="true">✕</span>
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {node.entityId && node.entityType ? (
            <button
              type="button"
              onClick={handleNavigate}
              className="flex-1 rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-left text-xs font-medium text-neutral-700 hover:border-neutral-300 hover:bg-white"
            >
              Show me →
            </button>
          ) : null}
          <a
            href={violation.helpUrl}
            target="_blank"
            rel="noreferrer"
            className="shrink-0 rounded-xl border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-500 hover:border-neutral-300 hover:text-neutral-700"
          >
            Learn more
          </a>
        </div>
      </div>
    </div>
  );
}

export function A11yNotificationStack({
  onDismiss,
  onNavigate,
  violations,
}: {
  onDismiss: (key: string) => void;
  onNavigate: (entityId: string, entityType: "feature" | "block") => void;
  violations: A11yViolation[];
}) {
  if (violations.length === 0) return null;

  // Show the most recent 3
  const visible = violations.slice(-3);

  return (
    <div
      aria-label="Accessibility notifications"
      className="fixed bottom-6 right-6 z-[500] flex flex-col items-end gap-2"
    >
      {visible.map((v) => (
        <A11yToast
          key={v.key}
          violation={v}
          onDismiss={() => onDismiss(v.key)}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
