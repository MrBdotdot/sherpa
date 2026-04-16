"use client";

import { useRef, useState } from "react";
import { Guide, GuideStep, PageItem } from "@/app/_lib/authoring-types";
import { createGuide, createGuideStep } from "@/app/_lib/authoring-utils";
import { EditorSection } from "@/app/_components/editor/editor-ui";

type GuideTabProps = {
  guides: Guide[];
  pages: PageItem[];
  navPosition: "left" | "top";
  onGuidesChange: (g: Guide[]) => void;
  onNavPositionChange: (pos: "left" | "top") => void;
};

export function GuideTab({
  guides,
  pages,
  navPosition,
  onGuidesChange,
  onNavPositionChange,
}: GuideTabProps) {
  const [activeGuideId, setActiveGuideId] = useState<string | null>(
    guides[0]?.id ?? null
  );
  const [editingGuideId, setEditingGuideId] = useState<string | null>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  const activeGuide = guides.find((g) => g.id === activeGuideId) ?? null;

  const nonHomePages = pages.filter((p) => p.kind !== "home");
  const hotspotPages = pages.filter((p) => p.kind === "hotspot");

  // ── Guide helpers ──────────────────────────────────────────────────────────

  function handleAddGuide() {
    const guide = createGuide("New guide");
    const next = [...guides, guide];
    onGuidesChange(next);
    setActiveGuideId(guide.id);
    // Start editing the name immediately
    setEditingGuideId(guide.id);
  }

  function handleDeleteGuide(guideId: string) {
    const next = guides.filter((g) => g.id !== guideId);
    onGuidesChange(next);
    if (activeGuideId === guideId) {
      setActiveGuideId(next[0]?.id ?? null);
    }
    if (editingGuideId === guideId) {
      setEditingGuideId(null);
    }
  }

  function handleRenameGuide(guideId: string, name: string) {
    onGuidesChange(guides.map((g) => (g.id === guideId ? { ...g, name } : g)));
    setEditingGuideId(null);
  }

  function updateActiveGuideSteps(steps: GuideStep[]) {
    if (!activeGuide) return;
    onGuidesChange(
      guides.map((g) => (g.id === activeGuide.id ? { ...g, steps } : g))
    );
  }

  // ── Step helpers ───────────────────────────────────────────────────────────

  function handleAddStep() {
    if (!activeGuide) return;
    const firstPage = nonHomePages[0];
    if (!firstPage) return;
    const step = createGuideStep(
      `Step ${activeGuide.steps.length + 1}`,
      firstPage.id
    );
    updateActiveGuideSteps([...activeGuide.steps, step]);
  }

  function handleDeleteStep(stepId: string) {
    if (!activeGuide) return;
    updateActiveGuideSteps(activeGuide.steps.filter((s) => s.id !== stepId));
  }

  function handleStepChange<K extends keyof GuideStep>(
    stepId: string,
    field: K,
    value: GuideStep[K]
  ) {
    if (!activeGuide) return;
    updateActiveGuideSteps(
      activeGuide.steps.map((s) =>
        s.id === stepId ? { ...s, [field]: value } : s
      )
    );
  }

  // ── Drag-and-drop (HTML5) ──────────────────────────────────────────────────

  const dragStepId = useRef<string | null>(null);

  function handleDragStart(stepId: string) {
    dragStepId.current = stepId;
  }

  function handleDragOver(e: React.DragEvent, overStepId: string) {
    e.preventDefault();
    if (!activeGuide) return;
    const fromId = dragStepId.current;
    if (!fromId || fromId === overStepId) return;

    const steps = [...activeGuide.steps];
    const fromIdx = steps.findIndex((s) => s.id === fromId);
    const toIdx = steps.findIndex((s) => s.id === overStepId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [item] = steps.splice(fromIdx, 1);
    steps.splice(toIdx, 0, item);
    updateActiveGuideSteps(steps);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    dragStepId.current = null;
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="divide-y divide-neutral-200">

      {/* Nav position */}
      <EditorSection title="Navigation">
        <div className="flex items-center rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
          {(["left", "top"] as const).map((pos) => {
            const isActive = navPosition === pos;
            return (
              <button
                key={pos}
                type="button"
                onClick={() => onNavPositionChange(pos)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                  isActive
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {pos === "left" ? "Left nav" : "Top nav"}
              </button>
            );
          })}
        </div>
      </EditorSection>

      {/* Guide list */}
      <EditorSection title="Guides">
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            {guides.map((guide) => {
              const isActive = guide.id === activeGuideId;
              const isEditing = guide.id === editingGuideId;

              return (
                <div
                  key={guide.id}
                  className={`group flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                    isActive
                      ? "border-[#3B82F6] bg-[#3B82F6] text-white"
                      : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-300"
                  }`}
                >
                  {isEditing ? (
                    <input
                      ref={editInputRef}
                      autoFocus
                      defaultValue={guide.name}
                      onBlur={(e) => handleRenameGuide(guide.id, e.target.value.trim() || guide.name)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleRenameGuide(
                            guide.id,
                            (e.target as HTMLInputElement).value.trim() || guide.name
                          );
                        } else if (e.key === "Escape") {
                          setEditingGuideId(null);
                        }
                      }}
                      className={`w-24 bg-transparent outline-none ${
                        isActive ? "placeholder:text-blue-200" : "placeholder:text-neutral-400"
                      }`}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveGuideId(guide.id);
                        setEditingGuideId(guide.id);
                      }}
                      className="max-w-[120px] truncate bg-transparent text-left outline-none"
                    >
                      {guide.name}
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label={`Delete guide "${guide.name}"`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteGuide(guide.id);
                    }}
                    className={`ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] transition-colors ${
                      isActive
                        ? "text-blue-200 hover:bg-blue-400 hover:text-white"
                        : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                    }`}
                  >
                    ⋯
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={handleAddGuide}
            className="rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
          >
            + Add guide
          </button>
        </div>
      </EditorSection>

      {/* Step list */}
      {activeGuide ? (
        <EditorSection title={`Steps — ${activeGuide.name}`}>
          <div className="space-y-1.5">
            {activeGuide.steps.length === 0 ? (
              <p className="text-xs text-neutral-400">No steps yet. Add one below.</p>
            ) : (
              activeGuide.steps.map((step) => (
                <div
                  key={step.id}
                  draggable
                  onDragStart={() => handleDragStart(step.id)}
                  onDragOver={(e) => handleDragOver(e, step.id)}
                  onDrop={handleDrop}
                  className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-2 py-1.5"
                >
                  {/* Drag handle */}
                  <span
                    className="cursor-grab select-none text-sm text-neutral-300 active:cursor-grabbing"
                    aria-hidden="true"
                  >
                    ⠿
                  </span>

                  {/* Label */}
                  <input
                    type="text"
                    value={step.label}
                    onChange={(e) => handleStepChange(step.id, "label", e.target.value)}
                    placeholder="Step label"
                    className="min-w-0 flex-1 rounded border-0 bg-transparent text-xs text-neutral-800 outline-none focus:ring-0 placeholder:text-neutral-400"
                  />

                  {/* Card picker */}
                  <select
                    value={step.pageId}
                    onChange={(e) => handleStepChange(step.id, "pageId", e.target.value)}
                    aria-label="Card"
                    className="rounded border border-neutral-200 bg-white px-1.5 py-1 text-xs text-neutral-700 outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/25 max-w-[110px]"
                  >
                    {nonHomePages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || "Untitled"}
                      </option>
                    ))}
                  </select>

                  {/* Hotspot picker */}
                  <select
                    value={step.anchorHotspotId ?? ""}
                    onChange={(e) =>
                      handleStepChange(
                        step.id,
                        "anchorHotspotId",
                        e.target.value || undefined
                      )
                    }
                    aria-label="Hotspot"
                    className="rounded border border-neutral-200 bg-white px-1.5 py-1 text-xs text-neutral-700 outline-none focus:border-[#3B82F6] focus:ring-1 focus:ring-[#3B82F6]/25 max-w-[110px]"
                  >
                    <option value="">None</option>
                    {hotspotPages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title || "Untitled hotspot"}
                      </option>
                    ))}
                  </select>

                  {/* Delete step */}
                  <button
                    type="button"
                    aria-label={`Delete step "${step.label}"`}
                    onClick={() => handleDeleteStep(step.id)}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    ×
                  </button>
                </div>
              ))
            )}

            {nonHomePages.length > 0 ? (
              <button
                type="button"
                onClick={handleAddStep}
                className="mt-1 rounded-lg border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-700 transition-colors"
              >
                + Add step
              </button>
            ) : (
              <p className="text-xs text-neutral-400">
                Add cards to the board first to create steps.
              </p>
            )}
          </div>
        </EditorSection>
      ) : (
        <section className="border-b border-neutral-200 px-5 py-5 last:border-b-0">
          <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-5 text-sm text-neutral-500">
            Add a guide above to start building steps.
          </div>
        </section>
      )}

    </div>
  );
}
