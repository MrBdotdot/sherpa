"use client";

import { RefObject, useEffect, useRef, useState } from "react";

export interface A11yViolationNode {
  /** Last segment of the axe CrossTreeSelector, for display */
  targetLabel: string;
  failureSummary: string;
  entityId: string | null;
  entityType: "feature" | "block" | null;
}

export interface A11yViolation {
  /** axe rule id, e.g. "image-alt" */
  id: string;
  description: string;
  impact: "critical" | "serious" | "moderate" | "minor";
  helpUrl: string;
  nodes: A11yViolationNode[];
  /** Stable dedup key: ruleId::targetSelector */
  key: string;
}

const DEBOUNCE_MS = 1500;

/**
 * Scans the element pointed to by `containerRef` with axe-core after DOM
 * mutations settle. Only surfaces violations that are *new* since the last
 * scan, so a persistent issue is only notified once. When the issue is fixed
 * and then reintroduced, it surfaces again.
 *
 * No-ops in production builds.
 */
export function useA11yMonitor(containerRef: RefObject<HTMLElement | null>) {
  const [violations, setViolations] = useState<A11yViolation[]>([]);
  const prevKeysRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const a11yEnabled = process.env.NODE_ENV !== "production";
  useEffect(() => {
    if (!a11yEnabled || process.env.NODE_ENV === "production") return;
    if (!containerRef.current) return;

    const run = async () => {
      const el = containerRef.current;
      if (!el) return;
      try {
        const axe = (await import("axe-core")).default;
        const results = await axe.run(el, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa"] },
          // Suppress rules that fire on authoring chrome rather than authored content
          rules: {
            "region": { enabled: false },
            "bypass": { enabled: false },
          },
        });

        // Build set of all current violation keys.
        // axe CrossTreeSelector is Array<string | string[]>; flatten to a
        // plain string for dedup and querySelector use.
        const flatTarget = (t: unknown[]): string =>
          t.map((s) => (Array.isArray(s) ? s[s.length - 1] : s)).join(" ");

        const currentKeys = new Set<string>();
        for (const v of results.violations) {
          for (const node of v.nodes) {
            currentKeys.add(`${v.id}::${flatTarget(node.target as unknown[])}`);
          }
        }

        // New violations = present now but not in previous run
        const newViolations: A11yViolation[] = [];
        const seenNewKeys = new Set<string>();
        for (const v of results.violations) {
          for (const node of v.nodes) {
            const targetStr = flatTarget(node.target as unknown[]);
            const key = `${v.id}::${targetStr}`;
            if (prevKeysRef.current.has(key)) continue;
            if (seenNewKeys.has(key)) continue;
            seenNewKeys.add(key);

            // Walk up the DOM from the offending element to find the nearest
            // authored item tagged with data-a11y-id
            let entityId: string | null = null;
            let entityType: "feature" | "block" | null = null;
            try {
              // Use only the last segment (leaf selector) for querySelector
              const leafSelector = (node.target as unknown[]).at(-1);
              const leafStr = Array.isArray(leafSelector)
                ? (leafSelector as string[]).at(-1) ?? ""
                : String(leafSelector ?? "");
              const domEl = leafStr ? document.querySelector(leafStr) : null;
              if (domEl) {
                const ancestor = domEl.closest("[data-a11y-id]");
                if (ancestor) {
                  entityId = ancestor.getAttribute("data-a11y-id");
                  entityType = ancestor.getAttribute("data-a11y-type") as "feature" | "block" | null;
                }
              }
            } catch {
              // Complex selectors can throw — ignore
            }

            newViolations.push({
              id: v.id,
              description: v.description,
              impact: (v.impact ?? "minor") as A11yViolation["impact"],
              helpUrl: v.helpUrl,
              key,
              nodes: [{
                targetLabel: targetStr,
                failureSummary: node.failureSummary ?? "",
                entityId,
                entityType,
              }],
            });
          }
        }

        prevKeysRef.current = currentKeys;

        if (newViolations.length > 0) {
          setViolations((prev) => [...prev, ...newViolations].slice(-10));
        }
      } catch {
        // axe errors are non-fatal
      }
    };

    const schedule = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(run, DEBOUNCE_MS);
    };

    const observer = new MutationObserver(schedule);
    observer.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true,
    });

    // Initial scan
    schedule();

    return () => {
      observer.disconnect();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  // containerRef identity is stable — intentionally omitted from deps
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissViolation = (key: string) => {
    setViolations((prev) => prev.filter((v) => v.key !== key));
  };

  return { violations, dismissViolation };
}
