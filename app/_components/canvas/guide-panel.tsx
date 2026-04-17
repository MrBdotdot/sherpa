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
        style={{ backgroundColor: accentColor || "#3B82F6" }}
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
                  backgroundColor: accentColor || "#3B82F6",
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

          {/* Bottom controls */}
          <div className="border-t border-white/10 px-3 py-3 space-y-2">
            {guides.length > 1 && (
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
            )}
            <button
              type="button"
              onClick={onCollapse}
              aria-label="Collapse guide"
              className="flex items-center justify-center rounded-lg bg-white/10 p-2 text-white/60 hover:bg-white/20 hover:text-white transition-colors w-full"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M9 2L5 7l4 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Re-expand tab — rides on the right edge of the panel; peeks out when panel is collapsed */}
          {!isGuidedMode && (
            <button
              type="button"
              onClick={onExpand}
              aria-label="Expand guide"
              className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full bg-black/70 backdrop-blur-sm text-white px-1.5 py-3 rounded-r-lg transition-colors hover:bg-black/85"
            >
              <span className="flex flex-col items-center gap-1">
                <span>→</span>
                <span
                  className="text-[9px] text-white/60"
                  style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
                >Guide</span>
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
        role="navigation"
        aria-label={guide.name || "Guide"}
        className={[
          "h-12 w-full bg-black/70 backdrop-blur-sm transition-transform duration-200",
          "flex items-center gap-2 px-3",
          isGuidedMode ? "translate-y-0" : "-translate-y-full",
        ].join(" ")}
      >
        {/* Step pills */}
        <div className="flex flex-1 items-center gap-1.5 overflow-x-auto">
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
                style={isActive ? { backgroundColor: accentColor || "#3B82F6" } : undefined}
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
