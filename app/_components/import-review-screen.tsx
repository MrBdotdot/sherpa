"use client";

import React, { useRef, useState } from "react";
import type { DraftSection } from "@/app/_lib/import-types";

interface ReviewRow {
  id: string;
  title: string;
  kind: "page" | "hotspot";
  interactionType: string;
  blocks: DraftSection["blocks"];
  included: boolean;
}

interface ImportReviewScreenProps {
  sections: DraftSection[];
  onConfirm: (sections: DraftSection[]) => void;
  onBack: () => void;
  isCommitting: boolean;
  commitError: string | null;
}

function previewText(blocks: DraftSection["blocks"]): string {
  for (const b of blocks) {
    const text = b.value?.replace(/\n/g, " ").trim();
    if (text) return text.length > 100 ? text.slice(0, 100) + "…" : text;
  }
  return "";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BlocksContent({ blocks }: { blocks: DraftSection["blocks"] }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (b.type === "section") {
          return (
            <p key={i} className="mt-1.5 text-xs font-semibold text-neutral-600">
              {b.value}
            </p>
          );
        }
        if (b.type === "steps") {
          return (
            <ul key={i} className="mt-1 space-y-0.5">
              {b.value.split("\n").filter(Boolean).map((line, j) => (
                <li key={j} className="flex items-start gap-1.5 text-xs text-neutral-500">
                  <span className="mt-[4px] h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                  {line}
                </li>
              ))}
            </ul>
          );
        }
        if (b.type === "callout") {
          return (
            <p key={i} className="mt-1 border-l-2 border-neutral-300 pl-2 text-xs italic text-neutral-500">
              {b.value}
            </p>
          );
        }
        return (
          <p key={i} className="mt-1 text-xs leading-relaxed text-neutral-500">
            {b.value}
          </p>
        );
      })}
    </>
  );
}

function BlockPreview({
  blocks,
  isExpanded,
  onToggle,
}: {
  blocks: DraftSection["blocks"];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const preview = previewText(blocks);
  if (!preview && blocks.length === 0) return null;

  if (isExpanded) {
    return (
      <div onDragStart={(e) => e.stopPropagation()}>
        <div className="mt-1.5 max-h-44 overflow-y-auto rounded-lg bg-neutral-50 px-2.5 py-2">
          <BlocksContent blocks={blocks} />
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="mt-1 text-[10px] text-neutral-500 transition-colors hover:text-neutral-600"
        >
          Show less ↑
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1 flex items-baseline gap-1.5">
      {preview && (
        <p className="flex-1 truncate text-xs leading-relaxed text-neutral-500">{preview}</p>
      )}
      <button
        type="button"
        onClick={onToggle}
        className="shrink-0 rounded-full border border-neutral-200 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 transition-colors hover:bg-neutral-50"
      >
        more ↓
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function ImportReviewScreen({
  sections,
  onConfirm,
  onBack,
  isCommitting,
  commitError,
}: ImportReviewScreenProps) {
  const [rows, setRows] = useState<ReviewRow[]>(() =>
    sections.map((s, i) => ({
      id: `row-${i}`,
      title: s.title,
      kind: s.kind,
      interactionType: s.interactionType,
      blocks: s.blocks,
      included: true,
    }))
  );
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
  const draggedIdxRef = useRef<number | null>(null);

  const includedCount = rows.filter((r) => r.included).length;
  const isDragging = draggedIdx !== null;

  // ── Row actions ─────────────────────────────────────────────────────────────

  function toggleInclude(id: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, included: !r.included } : r)));
  }

  function setKind(id: string, kind: "page" | "hotspot") {
    setRows((rs) =>
      rs.map((r) =>
        r.id === id
          ? {
              ...r,
              kind,
              interactionType:
                kind === "hotspot"
                  ? "tooltip"
                  : r.interactionType === "tooltip"
                  ? "modal"
                  : r.interactionType,
            }
          : r
      )
    );
  }

  function updateTitle(id: string, title: string) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, title } : r)));
  }

  function mergeUp(idx: number) {
    setRows((rs) => {
      const next = [...rs];
      const above: ReviewRow = {
        ...next[idx - 1],
        blocks: [...next[idx - 1].blocks, ...next[idx].blocks],
      };
      next.splice(idx - 1, 2, above);
      return next;
    });
  }

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // ── Drag handlers ────────────────────────────────────────────────────────────

  function handleDragStart(e: React.DragEvent, idx: number) {
    // Prevent drag when initiated from an interactive element (input, button)
    if ((e.target as HTMLElement).closest("input, button")) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", String(idx));
    e.dataTransfer.effectAllowed = "move";
    draggedIdxRef.current = idx;
    setDraggedIdx(idx);
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIdx !== idx) setDragOverIdx(idx);
  }

  function handleDropOnRow(targetIdx: number) {
    const from = draggedIdxRef.current;
    draggedIdxRef.current = null;
    if (from === null || from === targetIdx) {
      setDraggedIdx(null);
      setDragOverIdx(null);
      return;
    }
    setRows((rs) => {
      const next = [...rs];
      const [moved] = next.splice(from, 1);
      const adjusted = from < targetIdx ? targetIdx - 1 : targetIdx;
      next.splice(adjusted, 0, moved);
      return next;
    });
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  function handleDragEnd() {
    draggedIdxRef.current = null;
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  function handleConfirm() {
    const included = rows
      .filter((r) => r.included)
      .map(({ title, kind, interactionType, blocks }) => ({ title, kind, interactionType, blocks }));
    onConfirm(included);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col" style={{ maxHeight: "72vh" }}>
      {/* Subheader */}
      <div className="border-b border-neutral-100 px-5 py-3">
        <p className="text-xs text-neutral-500">
          Review what was found. Rename sections, uncheck anything you don't need, then add to your game.
        </p>
      </div>

      {/* Scrollable list */}
      <div
        className="flex-1 overflow-y-auto px-4 py-3"
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverIdx(null);
        }}
      >
        {rows.map((row, idx) => {
          const isRowDragging = draggedIdx === idx;
          const isDropTarget = dragOverIdx === idx && draggedIdx !== null && draggedIdx !== idx;

          return (
            <React.Fragment key={row.id}>
              {/* Merge zone — hidden while dragging */}
              {idx > 0 && !isDragging && (
                <div className="group my-1.5 flex items-center gap-2">
                  <div className="h-px flex-1 bg-neutral-100" />
                  <button
                    type="button"
                    onClick={() => mergeUp(idx)}
                    className="rounded px-2 py-0.5 text-[10px] text-neutral-300 transition-colors hover:bg-neutral-50 hover:text-neutral-500 group-hover:text-neutral-500"
                  >
                    Merge ↑
                  </button>
                  <div className="h-px flex-1 bg-neutral-100" />
                </div>
              )}

              {/* Drop indicator */}
              {isDropTarget && (
                <div className="mb-1.5 h-0.5 rounded-full bg-[#1e3a8a]" />
              )}

              {/* Row card */}
              <div
                draggable
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDrop={() => handleDropOnRow(idx)}
                onDragEnd={handleDragEnd}
                className={`rounded-xl border px-3 py-2.5 transition-opacity ${
                  isRowDragging
                    ? "cursor-grabbing opacity-25"
                    : row.included
                    ? "border-neutral-200 bg-white"
                    : "border-neutral-100 bg-neutral-50 opacity-50"
                }`}
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  {/* Checkbox */}
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={row.included}
                    onClick={() => toggleInclude(row.id)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors ${
                      row.included
                        ? "border-[#1e3a8a] bg-[#1e3a8a]"
                        : "border-neutral-300 bg-white hover:border-neutral-400"
                    }`}
                  >
                    {row.included && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path
                          d="M1 3l2 2 4-4"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </button>

                  {/* Title — always editable */}
                  <input
                    type="text"
                    value={row.title}
                    onChange={(e) => updateTitle(row.id, e.target.value)}
                    onDragStart={(e) => e.stopPropagation()}
                    className={`flex-1 min-w-0 bg-transparent text-sm font-medium outline-none transition-colors border-b border-transparent hover:border-neutral-200 focus:border-[#1e3a8a] ${
                      row.included ? "text-neutral-900" : "text-neutral-500"
                    }`}
                  />

                  {/* Card / Hotspot toggle */}
                  <div className="flex shrink-0 overflow-hidden rounded-md border border-neutral-200 text-[10px] font-semibold">
                    <button
                      type="button"
                      onClick={() => setKind(row.id, "page")}
                      className={`px-2 py-1 transition-colors ${
                        row.kind === "page"
                          ? "bg-[#1e3a8a] text-white"
                          : "bg-white text-neutral-500 hover:bg-neutral-50"
                      }`}
                    >
                      Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setKind(row.id, "hotspot")}
                      className={`border-l border-neutral-200 px-2 py-1 transition-colors ${
                        row.kind === "hotspot"
                          ? "bg-[#1e3a8a] text-white"
                          : "bg-white text-neutral-500 hover:bg-neutral-50"
                      }`}
                    >
                      Hotspot
                    </button>
                  </div>

                  {/* Drag handle */}
                  <span
                    className="shrink-0 cursor-grab text-neutral-500 transition-colors hover:text-neutral-600 active:cursor-grabbing"
                    aria-hidden="true"
                  >
                    <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
                      <circle cx="2.5" cy="2.5" r="1.5" /><circle cx="7.5" cy="2.5" r="1.5" />
                      <circle cx="2.5" cy="7"   r="1.5" /><circle cx="7.5" cy="7"   r="1.5" />
                      <circle cx="2.5" cy="11.5" r="1.5" /><circle cx="7.5" cy="11.5" r="1.5" />
                    </svg>
                  </span>
                </div>

                {/* Block preview — indented to align with title */}
                <div className="pl-[26px]">
                  <BlockPreview
                    blocks={row.blocks}
                    isExpanded={expandedIds.has(row.id)}
                    onToggle={() => toggleExpanded(row.id)}
                  />
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-neutral-200 px-5 py-3">
        <span className="text-xs text-neutral-500">
          {includedCount === rows.length
            ? `${includedCount} section${includedCount !== 1 ? "s" : ""}`
            : `${includedCount} of ${rows.length} kept`}
        </span>

        {commitError && (
          <p className="flex-1 text-right text-xs text-red-500">{commitError}</p>
        )}

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onBack}
            disabled={isCommitting}
            className="rounded-full border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={includedCount === 0 || isCommitting}
            className="rounded-full bg-[#1e3a8a] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1e3a8a]/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isCommitting
              ? "Adding…"
              : `Add ${includedCount} section${includedCount !== 1 ? "s" : ""} →`}
          </button>
        </div>
      </div>
    </div>
  );
}
