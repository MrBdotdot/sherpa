"use client";

import React, { useState, useEffect, useRef } from "react";
import { ContentBlock } from "@/app/_lib/authoring-types";

// ── SectionBlock ───────────────────────────────────────────────

export function SectionBlock({ block }: { block: ContentBlock }) {
  const label = block.value.trim();
  return (
    <div id={block.id} className="flex items-center gap-3 py-2">
      {label ? (
        <>
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">{label}</span>
          <div className="h-px flex-1 bg-neutral-200" />
        </>
      ) : (
        <div className="h-px w-full bg-neutral-200" />
      )}
    </div>
  );
}

// ── StepRailBlock ──────────────────────────────────────────────

type SRIconShape = "circle" | "square" | "squircle" | "diamond" | "none";

type SRPreviewStep = {
  id: string;
  label: string;
  color: string;
  iconImageUrl: string;
  sectionBlockId: string;
};

type SRPreviewData = {
  orientation: "horizontal" | "vertical";
  iconShape: SRIconShape;
  showPing: boolean;
  steps: SRPreviewStep[];
};

export function parseSRPreview(value: string): SRPreviewData {
  try {
    const d = JSON.parse(value);
    return {
      orientation: (d.orientation as "horizontal" | "vertical") ?? "vertical",
      iconShape: (d.iconShape as SRIconShape) ?? "circle",
      showPing: d.showPing !== false,
      steps: ((d.steps ?? []) as Record<string, unknown>[]).map((s) => ({
        id: (s.id as string) ?? "",
        label: (s.label as string) ?? "",
        color: (s.color as string) ?? "#3b82f6",
        iconImageUrl: (s.iconImageUrl as string) ?? "",
        sectionBlockId: (s.sectionBlockId as string) ?? "",
      })),
    };
  } catch {
    return { orientation: "vertical", iconShape: "circle", showPing: true, steps: [] };
  }
}

function srShapeClasses(shape: SRIconShape): string {
  switch (shape) {
    case "circle": return "rounded-full";
    case "squircle": return "rounded-xl";
    case "square": return "rounded-sm";
    case "diamond": return "rounded-sm rotate-45";
    default: return "rounded-full";
  }
}

function SRStepIcon({
  step,
  active,
  index,
  iconShape,
  showPing,
}: {
  step: SRPreviewStep;
  active: boolean;
  index: number;
  iconShape: SRIconShape;
  showPing: boolean;
}) {
  const size = active ? "w-8 h-8" : "w-6 h-6";
  const textSize = active ? "text-xs" : "text-[10px]";
  const isDiamond = iconShape === "diamond";

  if (iconShape === "none") {
    return (
      <div className="relative flex items-center justify-center">
        {active && showPing && (
          <div className="absolute inset-0 animate-ping rounded-full opacity-50" style={{ backgroundColor: step.color }} />
        )}
        <div
          className={`relative z-10 rounded-full transition-all ${active ? "w-3.5 h-3.5" : "w-2.5 h-2.5"}`}
          style={{ backgroundColor: step.color }}
        />
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      {active && showPing && (
        <div className={`absolute inset-0 animate-ping opacity-40 ${srShapeClasses(iconShape)}`} style={{ backgroundColor: step.color }} />
      )}
      <div
        className={`relative z-10 flex items-center justify-center transition-all ${size} ${srShapeClasses(iconShape)}`}
        style={{ backgroundColor: step.iconImageUrl ? "transparent" : step.color }}
      >
        {step.iconImageUrl ? (
          <img
            src={step.iconImageUrl}
            alt={step.label}
            className={`w-full h-full object-cover ${srShapeClasses(iconShape)}`}
            style={isDiamond ? { transform: "rotate(-45deg)" } : undefined}
          />
        ) : (
          <span
            className={`font-bold text-white leading-none ${textSize}`}
            style={isDiamond ? { transform: "rotate(-45deg)" } : undefined}
          >
            {index + 1}
          </span>
        )}
      </div>
    </div>
  );
}

export function StepRailBlock({ block }: { block: ContentBlock }) {
  const data = parseSRPreview(block.value);
  const linkedSteps = data.steps.filter((s) => s.sectionBlockId);
  const [activeStepId, setActiveStepId] = useState<string>(linkedSteps[0]?.id ?? "");
  // Suppress observer updates briefly after a manual click so the
  // observer doesn't overwrite the clicked step with the first
  // step that happens to share the same sectionBlockId.
  const clickLockRef = useRef(false);
  const clickLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (linkedSteps.length === 0) return;
    // Build a map: sectionBlockId → the LAST step index that links there.
    // This means repeated sections resolve to the most recent step in sequence.
    const sectionToStep = new Map<string, SRPreviewStep>();
    linkedSteps.forEach((s) => sectionToStep.set(s.sectionBlockId, s));

    const obs = new IntersectionObserver(
      (entries) => {
        if (clickLockRef.current) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const step = sectionToStep.get(entry.target.id);
            if (step) setActiveStepId(step.id);
          }
        }
      },
      { rootMargin: "0px 0px -60% 0px", threshold: 0 }
    );
    // Observe each unique section element once.
    const seen = new Set<string>();
    linkedSteps.forEach((s) => {
      if (seen.has(s.sectionBlockId)) return;
      seen.add(s.sectionBlockId);
      const el = document.getElementById(s.sectionBlockId);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block.value]);

  function scrollToSection(step: SRPreviewStep) {
    // Set active immediately so the UI responds before the scroll settles.
    setActiveStepId(step.id);
    // Lock the observer so it doesn't override us while smooth-scrolling.
    clickLockRef.current = true;
    if (clickLockTimerRef.current) clearTimeout(clickLockTimerRef.current);
    clickLockTimerRef.current = setTimeout(() => { clickLockRef.current = false; }, 900);
    document.getElementById(step.sectionBlockId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const activeIdx = data.steps.findIndex((s) => s.id === activeStepId);

  if (data.steps.length === 0) return null;

  if (data.orientation === "vertical") {
    return (
      <div className="flex flex-col items-center pt-1 w-10 flex-shrink-0">
        {data.steps.map((step, i) => (
          <React.Fragment key={step.id}>
            <button
              type="button"
              onClick={() => step.sectionBlockId && scrollToSection(step)}
              disabled={!step.sectionBlockId}
              aria-label={step.label || `Step ${i + 1}`}
              title={step.label || `Step ${i + 1}`}
              className="flex flex-col items-center gap-1 transition-opacity disabled:cursor-default"
              style={activeStepId && activeStepId !== step.id ? { opacity: 0.4 } : undefined}
            >
              <SRStepIcon step={step} active={activeStepId === step.id} index={i} iconShape={data.iconShape} showPing={data.showPing} />
              {step.label && (
                <span className="max-w-[40px] text-center text-[9px] font-medium leading-tight text-neutral-600">
                  {step.label}
                </span>
              )}
            </button>
            {i < data.steps.length - 1 && (
              <div
                className="my-1 h-3 w-0.5 flex-none rounded-full"
                style={{ backgroundColor: activeIdx > i ? step.color : "#e5e7eb" }}
              />
            )}
          </React.Fragment>
        ))}
      </div>
    );
  }

  // Horizontal
  return (
    <div className="flex items-start overflow-hidden border-b border-neutral-100 bg-white/95 px-2 py-2">
      {data.steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <button
            type="button"
            onClick={() => step.sectionBlockId && scrollToSection(step)}
            disabled={!step.sectionBlockId}
            className="flex shrink-0 flex-col items-center gap-1 transition-opacity disabled:cursor-default"
            style={activeStepId && activeStepId !== step.id ? { opacity: 0.4 } : undefined}
          >
            <SRStepIcon step={step} active={activeStepId === step.id} index={i} iconShape={data.iconShape} showPing={data.showPing} />
            {step.label && (
              <span className="max-w-[56px] text-center text-[9px] font-medium leading-tight text-neutral-700">
                {step.label}
              </span>
            )}
          </button>
          {i < data.steps.length - 1 && (
            <div
              className="mt-3 mx-1.5 h-0.5 flex-1 self-start rounded-full"
              style={{ backgroundColor: activeIdx > i ? step.color : "#e5e7eb" }}
            />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
