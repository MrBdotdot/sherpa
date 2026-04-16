"use client";

import { ContentBlock } from "@/app/_lib/authoring-types";
import { createBlock } from "@/app/_lib/authoring-utils";
import { FieldLabel } from "@/app/_components/editor/editor-ui";
import { useBlockEditorContext } from "@/app/_components/editor/block-editor-context";

type SRIconShape = "circle" | "square" | "squircle" | "diamond" | "none";

type SRStep = {
  id: string;
  label: string;
  color: string;
  iconImageUrl?: string; // preserved for backward compat, no longer editable
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

const STEP_COLORS = [
  "#3b82f6", "#8b5cf6", "#10b981", "#f59e0b",
  "#ef4444", "#06b6d4", "#ec4899", "#84cc16",
];

// ── Slice helpers ──────────────────────────────────────────────────

/**
 * Split page.blocks into:
 *   pre    — blocks before the first linked section
 *   slices — one ContentBlock[] per linked step (section block + following content)
 *   post   — blocks from the first unlinked section after the linked zone onward
 *
 * Slices are in the order sections appear in page.blocks[].
 */
function getSlices(
  blocks: ContentBlock[],
  steps: SRStep[]
): { pre: ContentBlock[]; slices: ContentBlock[][]; post: ContentBlock[] } {
  const linkedIds = steps.map((s) => s.sectionBlockId).filter(Boolean);
  const linkedIdSet = new Set(linkedIds);
  if (linkedIdSet.size === 0) return { pre: blocks, slices: [], post: [] };

  const linkedPositions: number[] = [];
  blocks.forEach((b, i) => {
    if (linkedIdSet.has(b.id)) linkedPositions.push(i);
  });
  if (linkedPositions.length === 0) return { pre: blocks, slices: [], post: [] };

  const firstIdx = linkedPositions[0];
  const lastIdx = linkedPositions[linkedPositions.length - 1];

  // post begins at the first non-linked section block after the last linked section
  const postStartIdx = blocks.findIndex(
    (b, i) => i > lastIdx && b.type === "section" && !linkedIdSet.has(b.id)
  );
  const railEnd = postStartIdx >= 0 ? postStartIdx : blocks.length;

  const pre = blocks.slice(0, firstIdx);
  const post = postStartIdx >= 0 ? blocks.slice(postStartIdx) : [];
  const railBlocks = blocks.slice(firstIdx, railEnd);

  const slices: ContentBlock[][] = [];
  let current: ContentBlock[] = [];
  for (const b of railBlocks) {
    if (linkedIdSet.has(b.id)) {
      if (current.length > 0) slices.push(current);
      current = [b];
    } else {
      current.push(b);
    }
  }
  if (current.length > 0) slices.push(current);

  return { pre, slices, post };
}

// ── Component ──────────────────────────────────────────────────────

export function StepRailBlockEditor({
  block,
}: {
  block: ContentBlock;
}) {
  const { onBlockChange, onReplaceBlocks, pages, selectedPageId } = useBlockEditorContext();
  const data = parseSR(block.value);
  const currentPage = pages?.find((p) => p.id === selectedPageId);
  const currentBlocks = currentPage?.blocks ?? [];

  // Config-only changes (layout, iconShape, showPing, color) — no block list change.
  function updateConfig(newData: SRData) {
    onBlockChange(block.id, JSON.stringify(newData));
  }

  // Structural changes (add/remove/rename/reorder steps) — atomically replaces
  // both the step-rail JSON and the affected section blocks.
  function commit(newData: SRData, newBlocks: ContentBlock[]) {
    if (!onReplaceBlocks) return;
    const newJson = JSON.stringify(newData);
    onReplaceBlocks(newBlocks.map((b) => (b.id === block.id ? { ...b, value: newJson } : b)));
  }

  function addStep() {
    const newLabel = `Step ${data.steps.length + 1}`;
    const sectionBlock = createBlock("section", newLabel);
    const newStep: SRStep = {
      id: `step-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: newLabel,
      color: STEP_COLORS[data.steps.length % STEP_COLORS.length],
      sectionBlockId: sectionBlock.id,
    };
    const { pre, slices, post } = getSlices(currentBlocks, data.steps);
    commit(
      { ...data, steps: [...data.steps, newStep] },
      [...pre, ...slices.flat(), sectionBlock, ...post]
    );
  }

  function removeStep(i: number) {
    const sectionBlockId = data.steps[i]?.sectionBlockId;
    // Remove the section block; content blocks between it and the next section
    // are preserved and absorbed into the preceding step's zone.
    const newBlocks = sectionBlockId
      ? currentBlocks.filter((b) => b.id !== sectionBlockId)
      : currentBlocks;
    commit({ ...data, steps: data.steps.filter((_, j) => j !== i) }, newBlocks);
  }

  function renameStep(i: number, label: string) {
    const sectionBlockId = data.steps[i]?.sectionBlockId;
    const newBlocks = sectionBlockId
      ? currentBlocks.map((b) => (b.id === sectionBlockId ? { ...b, value: label } : b))
      : currentBlocks;
    commit(
      { ...data, steps: data.steps.map((s, j) => (j === i ? { ...s, label } : s)) },
      newBlocks
    );
  }

  function reorderStep(fromIdx: number, toIdx: number) {
    if (fromIdx === toIdx) return;
    const { pre, slices, post } = getSlices(currentBlocks, data.steps);

    const newSlices = [...slices];
    const [movedSlice] = newSlices.splice(fromIdx, 1);
    newSlices.splice(toIdx, 0, movedSlice);

    const newSteps = [...data.steps];
    const [movedStep] = newSteps.splice(fromIdx, 1);
    newSteps.splice(toIdx, 0, movedStep);

    commit({ ...data, steps: newSteps }, [...pre, ...newSlices.flat(), ...post]);
  }

  function changeColor(i: number, color: string) {
    updateConfig({ ...data, steps: data.steps.map((s, j) => (j === i ? { ...s, color } : s)) });
  }

  const canMutate = !!onReplaceBlocks;

  return (
    <div className="space-y-3">
      {/* Layout */}
      <div>
        <FieldLabel className="mb-1.5">Layout</FieldLabel>
        <div className="flex gap-2">
          {(["vertical", "horizontal"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => updateConfig({ ...data, orientation: o })}
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

      {/* Icon shape */}
      <div>
        <FieldLabel className="mb-1.5">Icon shape</FieldLabel>
        <div className="flex flex-wrap gap-1.5">
          {SR_ICON_SHAPES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => updateConfig({ ...data, iconShape: s.value })}
              aria-pressed={data.iconShape === s.value}
              className={`rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
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

      {/* Pulse animation */}
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={data.showPing}
          onChange={(e) => updateConfig({ ...data, showPing: e.target.checked })}
          className="rounded"
        />
        <span className="text-xs text-neutral-600">Pulse animation on active step</span>
      </label>

      {/* Steps */}
      {data.steps.map((step, i) => (
        <div
          key={step.id}
          className="flex items-center gap-1.5 overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2"
        >
          <input
            type="color"
            value={step.color}
            onChange={(e) => changeColor(i, e.target.value)}
            aria-label={`Step ${i + 1} color`}
            className="h-6 w-6 shrink-0 cursor-pointer rounded border border-neutral-300 p-0.5"
          />
          <input
            type="text"
            value={step.label}
            onChange={(e) => renameStep(i, e.target.value)}
            placeholder={`Step ${i + 1}`}
            aria-label={`Step ${i + 1} label`}
            className="min-w-0 flex-1 bg-transparent text-sm font-medium text-neutral-800 outline-none placeholder:text-neutral-500"
          />
          {i > 0 && (
            <button
              type="button"
              onClick={() => reorderStep(i, i - 1)}
              aria-label={`Move step ${i + 1} up`}
              className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-500 transition hover:bg-white hover:text-neutral-600"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {i < data.steps.length - 1 && (
            <button
              type="button"
              onClick={() => reorderStep(i, i + 1)}
              aria-label={`Move step ${i + 1} down`}
              className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-500 transition hover:bg-white hover:text-neutral-600"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M7 3v8M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
          {data.steps.length > 1 && (
            <button
              type="button"
              onClick={() => removeStep(i)}
              aria-label={`Remove step ${i + 1}`}
              className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
            >
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4 3.5l.7 7.5a1 1 0 001 .9h2.6a1 1 0 001-.9L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      ))}

      {data.steps.length < SR_MAX_STEPS[data.orientation] ? (
        <button
          type="button"
          onClick={addStep}
          disabled={!canMutate}
          className="w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700 disabled:opacity-40"
        >
          + Add step
        </button>
      ) : (
        <p className="text-center text-xs text-neutral-500">
          Maximum {SR_MAX_STEPS[data.orientation]} steps for {data.orientation} layout
        </p>
      )}
    </div>
  );
}
