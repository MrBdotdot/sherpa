"use client";

import { useState } from "react";
import type { Guide, PageItem } from "@/app/_lib/authoring-types";

// ── Sub-components ────────────────────────────────────────────────────────────

function StepBadge({
  index,
  activeIndex,
  accentColor,
}: {
  index: number;
  activeIndex: number;
  accentColor: string;
}) {
  const isActive = index === activeIndex;
  const isVisited = index < activeIndex;

  if (isVisited) {
    return (
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs text-white/50">
        ✓
      </span>
    );
  }
  if (isActive) {
    return (
      <span
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs font-bold text-white"
      >
        {index + 1}
      </span>
    );
  }
  return (
    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/30 text-xs text-white/50">
      {index + 1}
    </span>
  );
}

function Sidebar({
  gameName,
  guide,
  activeIndex,
  accentColor,
  onStepSelect,
}: {
  gameName: string;
  guide: Guide;
  activeIndex: number;
  accentColor: string;
  onStepSelect: (index: number) => void;
}) {
  const total = guide.steps.length;
  const pct = total > 0 ? Math.round(((activeIndex + 1) / total) * 100) : 0;

  return (
    <div
      className="flex h-full w-[220px] shrink-0 flex-col"
      style={{ backgroundColor: accentColor }}
    >
      {/* Header */}
      <div className="px-5 pb-4 pt-6">
        {gameName && (
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/50">
            {gameName}
          </p>
        )}
        <h2 className="text-xl font-bold leading-tight text-white">
          {guide.name || "Learn to play"}
        </h2>
      </div>

      <div className="mx-5 border-t border-white/15" />

      {/* Step list */}
      <ol className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {guide.steps.map((step, i) => {
          const isActive = i === activeIndex;
          const isVisited = i < activeIndex;
          return (
            <li key={step.id}>
              <button
                type="button"
                onClick={() => onStepSelect(i)}
                className={[
                  "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-all",
                  isActive
                    ? "bg-white/20"
                    : "hover:bg-white/10",
                ].join(" ")}
              >
                <StepBadge index={i} activeIndex={activeIndex} accentColor={accentColor} />
                <span
                  className={[
                    "text-sm leading-snug",
                    isActive
                      ? "font-semibold text-white"
                      : isVisited
                      ? "text-white/40"
                      : "text-white/75",
                  ].join(" ")}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {/* Footer — step counter + progress */}
      <div className="px-5 pb-5 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-medium uppercase tracking-wide text-white/50">
            Step {activeIndex + 1} / {total}
          </span>
          <span className="text-[11px] font-semibold text-white/60">{pct}%</span>
        </div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/15">
          <div
            className="h-full rounded-full bg-white/70 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StepCard({
  step,
  page,
  stepIndex,
  totalSteps,
  guideName,
  accentColor,
  onBack,
  onNext,
}: {
  step: { label: string };
  page: PageItem | undefined;
  stepIndex: number;
  totalSteps: number;
  guideName: string;
  accentColor: string;
  onBack: (() => void) | null;
  onNext: (() => void) | null;
}) {
  const title = page?.title || step.label;
  const body = page?.summary || "";

  return (
    <div className="w-[300px] overflow-hidden rounded-2xl bg-white shadow-[0_8px_32px_rgba(0,0,0,0.18)]">
      {/* Body */}
      <div className="px-5 pb-4 pt-5">
        {/* Breadcrumb */}
        <div className="mb-3 flex items-center gap-1.5">
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
          <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
            {guideName} · {stepIndex + 1} of {totalSteps}
          </span>
        </div>

        {/* Title */}
        <h3 className="mb-2.5 text-[1.35rem] font-bold leading-tight text-neutral-900">
          {title}
        </h3>

        {/* Body */}
        {body && (
          <p className="text-sm leading-relaxed text-neutral-500">{body}</p>
        )}
      </div>

      <div className="mx-5 border-t border-neutral-100" />

      {/* Footer */}
      <div className="flex items-center justify-between px-5 py-3.5">
        <button
          type="button"
          onClick={onBack ?? undefined}
          disabled={!onBack}
          className="text-sm text-neutral-400 transition hover:text-neutral-600 disabled:invisible"
        >
          ← Back
        </button>
        <button
          type="button"
          onClick={onNext ?? undefined}
          disabled={!onNext}
          className="flex items-center gap-1.5 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-40"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

type GuidedTourViewProps = {
  gameName?: string;
  guide: Guide;
  pages: PageItem[];
  accentColor?: string;
  /** Rendered inside the board area (background, hotspot pins, features, etc.) */
  children?: React.ReactNode;
  /** Controlled step index — when provided this component becomes fully controlled. */
  activeStepIndex?: number;
  /** Starting step index when uncontrolled (ignored if activeStepIndex is provided). */
  initialStepIndex?: number;
  /** Called whenever the active step changes. */
  onStepChange?: (index: number, step: Guide["steps"][number]) => void;
};

export function GuidedTourView({
  gameName = "",
  guide,
  pages,
  accentColor = "#1e3a8a",
  children,
  activeStepIndex: controlledIndex,
  initialStepIndex = 0,
  onStepChange,
}: GuidedTourViewProps) {
  const [internalIndex, setInternalIndex] = useState(initialStepIndex);
  const isControlled = controlledIndex !== undefined;
  const activeIndex = isControlled ? controlledIndex : internalIndex;

  const total = guide.steps.length;
  const activeStep = guide.steps[activeIndex] ?? null;
  const activePage = activeStep
    ? pages.find((p) => p.id === activeStep.pageId)
    : undefined;

  const goTo = (index: number) => {
    const clamped = Math.max(0, Math.min(total - 1, index));
    if (!isControlled) setInternalIndex(clamped);
    onStepChange?.(clamped, guide.steps[clamped]);
  };

  return (
    <div className="flex h-full w-full overflow-hidden">
      {/* Left sidebar */}
      <Sidebar
        gameName={gameName}
        guide={guide}
        activeIndex={activeIndex}
        accentColor={accentColor}
        onStepSelect={goTo}
      />

      {/* Board area */}
      <div className="relative flex-1 overflow-hidden">
        {children}

        {/* Floating step card — bottom-left of the board area */}
        {activeStep && (
          <div className="absolute bottom-8 left-8 z-30">
            <StepCard
              step={activeStep}
              page={activePage}
              stepIndex={activeIndex}
              totalSteps={total}
              guideName={guide.name || "Guide"}
              accentColor={accentColor}
              onBack={activeIndex > 0 ? () => goTo(activeIndex - 1) : null}
              onNext={activeIndex < total - 1 ? () => goTo(activeIndex + 1) : null}
            />
          </div>
        )}
      </div>
    </div>
  );
}
