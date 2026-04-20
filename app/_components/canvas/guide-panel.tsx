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
  accentColor?: string;
};

function StepBadge({
  index,
  activeStepIndex,
  accentColor,
}: {
  index: number;
  activeStepIndex: number;
  accentColor?: string;
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
      <span
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: accentColor || "#5B7AF5" }}
      >
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
  accentColor,
}: GuidePanelProps) {
  if (navPosition === "left") {
    return (
      <div className="absolute left-0 top-0 bottom-0 z-40 w-56 h-full">
        {/* Slide-in panel — slides with transition; re-expand tab rides its right edge */}
        <div
          role="navigation"
          aria-label={guide.name || "Guide"}
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

          {/* Progress bar */}
          {guide.steps.length > 0 && (
            <div
              role="progressbar"
              aria-label="Guide progress"
              aria-valuenow={activeStepIndex}
              aria-valuemin={0}
              aria-valuemax={guide.steps.length}
              className="mx-4 mt-1 mb-2 h-1 rounded-full bg-white/10 overflow-hidden"
            >
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(activeStepIndex / guide.steps.length) * 100}%`,
                  backgroundColor: accentColor || "#5B7AF5",
                }}
              />
            </div>
          )}

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
                    <StepBadge index={index} activeStepIndex={activeStepIndex} accentColor={accentColor} />
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

          {/* Bottom controls — guide switcher only */}
          {guides.length > 1 && (
            <div className="border-t border-white/10 px-3 py-3">
              <select
                value={activeGuideId}
                onChange={(e) => onGuideChange(e.target.value)}
                aria-label="Switch guide"
                className="w-full rounded bg-white/10 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-400"
              >
                {guides.map((g) => (
                  <option key={g.id} value={g.id} className="bg-gray-900 text-white">
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Collapse/expand tab — always visible, rides the right edge of the panel */}
          <button
            type="button"
            onClick={isGuidedMode ? onCollapse : onExpand}
            aria-label={isGuidedMode ? "Collapse guide" : "Expand guide"}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-black/70 backdrop-blur-sm text-white/70 px-1.5 py-3 rounded-r-lg transition-colors hover:bg-black/85 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
              <path d={isGuidedMode ? "M8 2l-4 4 4 4" : "M4 2l4 4-4 4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>
    );
  }

  // Top variant
  return (
    <div className="absolute left-0 right-0 top-0 z-40">
      {/* Slide-in bar */}
      <div
        role="navigation"
        aria-label={guide.name || "Guide"}
        className={[
          "relative h-12 w-full bg-black/70 backdrop-blur-sm transition-transform duration-200",
          "flex items-center gap-2 px-3",
          isGuidedMode ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        {/* Step pills */}
        <div className="flex flex-1 items-center justify-center gap-1.5 overflow-x-auto">
          {guide.steps.map((step, index) => {
            const isActive = index === activeStepIndex;
            const isVisited = index < activeStepIndex;
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => onStepActivate(step, index)}
                className={`flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? "text-white"
                    : isVisited
                    ? "bg-white/10 text-white/50"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                }`}
                style={isActive ? { backgroundColor: accentColor || "#5B7AF5" } : undefined}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">
                  {isVisited ? "✓" : index + 1}
                </span>
                <span className="max-w-[80px] truncate">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Guide switcher */}
        {guides.length > 1 && (
          <select
            value={activeGuideId}
            onChange={(e) => onGuideChange(e.target.value)}
            aria-label="Switch guide"
            className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs text-white outline-none focus:ring-1 focus:ring-blue-400"
          >
            {guides.map((g) => (
              <option key={g.id} value={g.id} className="bg-gray-900 text-white">
                {g.name}
              </option>
            ))}
          </select>
        )}

        {/* Collapse/expand tab — always visible, rides the bottom edge of the bar */}
        <button
          type="button"
          onClick={isGuidedMode ? onCollapse : onExpand}
          aria-label={isGuidedMode ? "Collapse guide" : "Expand guide"}
          className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-full bg-black/70 backdrop-blur-sm text-white/70 px-3 py-1.5 rounded-b-lg transition-colors hover:bg-black/85 hover:text-white"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
            <path d={isGuidedMode ? "M2 8l4-4 4 4" : "M2 4l4 4 4-4"} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
