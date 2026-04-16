"use client";

import { Guide, GuideStep, PageItem } from "@/app/_lib/authoring-types";

type GuidePanelProps = {
  guide: Guide;
  pages: PageItem[];
  navPosition: "left" | "top";
  activeStepIndex: number;
  isGuidedMode: boolean;
  onStepActivate: (step: GuideStep, index: number) => void;
  onCollapse: () => void;
  onExpand: () => void;
  guides: Guide[];
  activeGuideId: string;
  onGuideChange: (id: string) => void;
};

function StepBadge({
  index,
  activeStepIndex,
}: {
  index: number;
  activeStepIndex: number;
}) {
  const isVisited = index < activeStepIndex;
  const isActive = index === activeStepIndex;

  if (isVisited) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs text-white/60">
        ✓
      </span>
    );
  }
  if (isActive) {
    return (
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
        {index + 1}
      </span>
    );
  }
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-white/40 text-xs text-white/50">
      {index + 1}
    </span>
  );
}

function StepChip({
  index,
  activeStepIndex,
  label,
  onClick,
}: {
  index: number;
  activeStepIndex: number;
  label?: string;
  onClick: () => void;
}) {
  const isVisited = index < activeStepIndex;
  const isActive = index === activeStepIndex;

  let chipClass: string;
  if (isActive) {
    chipClass =
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white cursor-pointer";
  } else if (isVisited) {
    chipClass =
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/20 text-xs text-white/60 cursor-pointer";
  } else {
    chipClass =
      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/40 text-xs text-white/50 cursor-pointer";
  }

  return (
    <button
      type="button"
      aria-label={label || `Step ${index + 1}`}
      className={chipClass}
      onClick={onClick}
    >
      {isVisited ? "✓" : index + 1}
    </button>
  );
}

export function GuidePanel({
  guide,
  pages: _pages,
  navPosition,
  activeStepIndex,
  isGuidedMode,
  onStepActivate,
  onCollapse,
  onExpand,
  guides,
  activeGuideId,
  onGuideChange,
}: GuidePanelProps) {
  if (navPosition === "left") {
    return (
      <div className="absolute left-0 top-0 bottom-0 z-40 w-56 h-full">
        {/* Slide-in panel — slides with transition; re-expand tab rides its right edge */}
        <div
          className={[
            "absolute left-0 top-0 bottom-0 h-full w-56 bg-black/70 backdrop-blur-sm transition-transform duration-200",
            "flex flex-col",
            isGuidedMode ? "translate-x-0" : "-translate-x-full",
          ].join(" ")}
        >
          {/* Title */}
          <div className="border-b border-white/10 px-4 py-3">
            <span className="text-sm font-semibold text-white">
              {guide.name || "Guide"}
            </span>
          </div>

          {/* Step list */}
          <ol className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
            {guide.steps.map((step, index) => {
              const isActive = index === activeStepIndex;
              const isVisited = index < activeStepIndex;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    aria-label={step.label || `Step ${index + 1}`}
                    onClick={() => onStepActivate(step, index)}
                    className={[
                      "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors",
                      isActive
                        ? "bg-white/10"
                        : "hover:bg-white/5",
                    ].join(" ")}
                  >
                    <StepBadge index={index} activeStepIndex={activeStepIndex} />
                    <span
                      className={[
                        "text-sm leading-snug",
                        isActive
                          ? "text-white font-medium"
                          : isVisited
                          ? "text-white/50"
                          : "text-white/80",
                      ].join(" ")}
                    >
                      {step.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>

          {/* Bottom controls */}
          <div className="border-t border-white/10 px-3 py-3 space-y-2">
            {guides.length > 1 && (
              <select
                value={activeGuideId}
                onChange={(e) => onGuideChange(e.target.value)}
                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-400"
              >
                {guides.map((g) => (
                  <option key={g.id} value={g.id} className="bg-gray-900 text-white">
                    {g.name}
                  </option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={onCollapse}
              className="flex w-full items-center justify-center gap-1 rounded-md bg-white/10 px-3 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            >
              <span>←</span>
              <span>Collapse</span>
            </button>
          </div>

          {/* Re-expand tab — rides on the right edge of the panel; peeks out when panel is collapsed */}
          {!isGuidedMode && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand guide"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-3 rounded-r-lg transition-colors hover:bg-black/85"
            >
              <span className="flex flex-col items-center gap-1">
                <span>→</span>
                <span
                  className="text-white/80"
                  style={{
                    fontSize: "10px",
                    writingMode: "vertical-lr",
                    textOrientation: "mixed",
                    letterSpacing: "0.05em",
                  }}
                >
                  Guide
                </span>
              </span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Top variant
  return (
    <div className="absolute left-0 right-0 top-0 z-40 overflow-hidden">
      {/* Slide-in bar */}
      <div
        className={[
          "h-12 w-full bg-black/70 backdrop-blur-sm transition-transform duration-200",
          "flex items-center gap-2 px-3",
          isGuidedMode ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        {/* Step chips */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
          {guide.steps.map((step, index) => (
            <StepChip
              key={step.id}
              index={index}
              activeStepIndex={activeStepIndex}
              label={step.label}
              onClick={() => onStepActivate(step, index)}
            />
          ))}
        </div>

        {/* Guide switcher */}
        {guides.length > 1 && (
          <select
            value={activeGuideId}
            onChange={(e) => onGuideChange(e.target.value)}
            className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-400"
          >
            {guides.map((g) => (
              <option key={g.id} value={g.id} className="bg-gray-900 text-white">
                {g.name}
              </option>
            ))}
          </select>
        )}

        {/* Collapse button */}
        <button
          type="button"
          onClick={onCollapse}
          className="shrink-0 rounded-md bg-white/10 px-2 py-1 text-xs text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label="Collapse guide"
        >
          ↑
        </button>
      </div>

      {/* Re-expand tab — below the panel; when panel is hidden it sits at top-0 of the viewport */}
      {!isGuidedMode && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={onExpand}
            aria-label="Expand guide"
            className="bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1 rounded-b-lg transition-colors hover:bg-black/85"
          >
            <span className="flex items-center gap-1 text-white/80">
              <span>↓</span>
              <span>Guide</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
