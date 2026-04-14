"use client";

import { ChangeEvent } from "react";
import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";

type SRIconShape = "circle" | "square" | "squircle" | "diamond" | "none";

type SRStep = {
  id: string;
  label: string;
  color: string;
  iconImageUrl: string;
  sectionBlockId: string;
};

type SRData = {
  orientation: "horizontal" | "vertical";
  iconShape: SRIconShape;
  showPing: boolean;
  steps: SRStep[];
};

function parseSR(value: string): SRData {
  try {
    const d = JSON.parse(value);
    return {
      orientation: (d.orientation as "horizontal" | "vertical") ?? "vertical",
      iconShape: (d.iconShape as SRIconShape) ?? "circle",
      showPing: d.showPing !== false,
      steps: ((d.steps ?? []) as Record<string, unknown>[]).map((s) => ({
        id: (s.id as string) ?? `step-${Date.now()}`,
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

const SR_MAX_STEPS: Record<"vertical" | "horizontal", number> = { vertical: 8, horizontal: 5 };

const SR_ICON_SHAPES: Array<{ value: SRIconShape; label: string }> = [
  { value: "circle", label: "Circle" },
  { value: "squircle", label: "Squircle" },
  { value: "square", label: "Square" },
  { value: "diamond", label: "Diamond" },
  { value: "none", label: "Dot" },
];

export function StepRailBlockEditor({
  block,
  pages,
  selectedPageId,
  onBlockChange,
}: {
  block: ContentBlock;
  pages?: PageItem[];
  selectedPageId?: string;
  onBlockChange: (blockId: string, value: string) => void;
}) {
  const data = parseSR(block.value);

  function updateSR(newData: SRData) {
    onBlockChange(block.id, JSON.stringify(newData));
  }

  function updateStep(idx: number, patch: Partial<SRStep>) {
    updateSR({ ...data, steps: data.steps.map((s, i) => i === idx ? { ...s, ...patch } : s) });
  }

  const currentPage = pages?.find((p) => p.id === selectedPageId);
  const sectionBlocks = (currentPage?.blocks ?? []).filter((b) => b.type === "section");

  return (
    <div className="space-y-3">
      {/* Layout */}
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Layout</div>
          <div className="flex gap-2">
            {(["vertical", "horizontal"] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => updateSR({ ...data, orientation: o })}
                aria-pressed={data.orientation === o}
                className={`flex-1 rounded-xl border py-2 text-xs font-medium capitalize transition ${
                  data.orientation === o
                    ? "border-[#3B82F6] bg-[#3B82F6] text-white"
                    : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {o}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Icon shape</div>
          <div className="flex flex-wrap gap-1.5">
            {SR_ICON_SHAPES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => updateSR({ ...data, iconShape: s.value })}
                aria-pressed={data.iconShape === s.value}
                className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                  data.iconShape === s.value
                    ? "border-[#3B82F6] bg-[#3B82F6] text-white"
                    : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={data.showPing}
            onChange={(e) => updateSR({ ...data, showPing: e.target.checked })}
            className="rounded"
          />
          <span className="text-xs text-neutral-600">Pulse animation on active step</span>
        </label>
      </div>

      {/* Steps */}
      {data.steps.map((step, i) => (
        <div key={step.id} className="rounded-xl border border-neutral-200">
          <div className="flex items-center gap-1 overflow-hidden rounded-t-xl border-b border-neutral-100 bg-neutral-50 px-2 py-2">
            <input
              type="color"
              value={step.color}
              onChange={(e) => updateStep(i, { color: e.target.value })}
              aria-label={`Step ${i + 1} color`}
              className="h-6 w-6 shrink-0 cursor-pointer rounded border border-neutral-300 p-0.5"
            />
            <input
              type="text"
              value={step.label}
              onChange={(e) => updateStep(i, { label: e.target.value })}
              placeholder={`Step ${i + 1}`}
              className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-neutral-400"
            />
            {i > 0 && (
              <button
                type="button"
                onClick={() => {
                  const next = [...data.steps];
                  [next[i - 1], next[i]] = [next[i], next[i - 1]];
                  updateSR({ ...data, steps: next });
                }}
                aria-label={`Move step ${i + 1} up`}
                className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-400 transition hover:bg-neutral-50"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {i < data.steps.length - 1 && (
              <button
                type="button"
                onClick={() => {
                  const next = [...data.steps];
                  [next[i], next[i + 1]] = [next[i + 1], next[i]];
                  updateSR({ ...data, steps: next });
                }}
                aria-label={`Move step ${i + 1} down`}
                className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-400 transition hover:bg-neutral-50"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 3v8M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            {data.steps.length > 1 && (
              <button
                type="button"
                onClick={() => updateSR({ ...data, steps: data.steps.filter((_, j) => j !== i) })}
                aria-label={`Remove step ${i + 1}`}
                className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4 3.5l.7 7.5a1 1 0 001 .9h2.6a1 1 0 001-.9L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          <div className="space-y-2.5 p-3">
            {/* Icon image */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Step icon</div>
              <div className="flex gap-1.5">
                <label className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg border border-neutral-300 px-2 py-1.5 text-[11px] font-medium text-neutral-600 transition hover:border-neutral-400 hover:bg-neutral-50">
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <rect x="1" y="4" width="12" height="8.5" rx="1.2" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M4.5 4V3a1 1 0 011-1h3a1 1 0 011 1v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                    <circle cx="7" cy="8.25" r="1.75" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e: ChangeEvent<HTMLInputElement>) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      updateStep(i, { iconImageUrl: URL.createObjectURL(file) });
                      e.target.value = "";
                    }}
                  />
                </label>
                <input
                  type="text"
                  value={step.iconImageUrl}
                  onChange={(e) => updateStep(i, { iconImageUrl: e.target.value })}
                  placeholder="Image URL"
                  className="min-w-0 flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
                />
                {step.iconImageUrl && (
                  <button
                    type="button"
                    onClick={() => updateStep(i, { iconImageUrl: "" })}
                    aria-label="Clear icon"
                    className="shrink-0 rounded-lg border border-neutral-200 p-1.5 text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-600"
                  >
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                      <path d="M2 2l8 8M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Section link */}
            <div>
              <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Linked section</div>
              {sectionBlocks.length > 0 ? (
                <select
                  value={step.sectionBlockId}
                  onChange={(e) => updateStep(i, { sectionBlockId: e.target.value })}
                  className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-sans text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
                >
                  <option value="">None</option>
                  {sectionBlocks.map((sb) => (
                    <option key={sb.id} value={sb.id}>
                      {sb.value.trim() || `Section (${sb.id.slice(-6)})`}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-2 text-xs text-neutral-400">
                  No sections yet. Add a section block first.
                </div>
              )}
            </div>
          </div>
        </div>
      ))}

      {data.steps.length < SR_MAX_STEPS[data.orientation] ? (
        <button
          type="button"
          onClick={() =>
            updateSR({
              ...data,
              steps: [...data.steps, {
                id: `step-${Date.now()}`,
                label: `Step ${data.steps.length + 1}`,
                color: "#6366f1",
                iconImageUrl: "",
                sectionBlockId: "",
              }],
            })
          }
          className="w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
        >
          + Add step
        </button>
      ) : (
        <p className="text-center text-[11px] text-neutral-400">
          Maximum {SR_MAX_STEPS[data.orientation]} steps for {data.orientation} layout
        </p>
      )}
    </div>
  );
}
