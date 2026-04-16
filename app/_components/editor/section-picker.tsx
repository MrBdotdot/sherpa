"use client";

import { useState } from "react";
import { PageItem } from "@/app/_lib/authoring-types";

export function SectionPicker({
  pages,
  targetPageId,
  targetSectionId,
  onSelect,
}: {
  pages: PageItem[];
  targetPageId: string;
  targetSectionId: string;
  /** Called with pageId + sectionId when a selection is made. Pass ("","") to reset. */
  onSelect: (pageId: string, sectionId: string) => void;
}) {
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);

  const nonHomePages = pages.filter((p) => p.kind !== "home");
  const targetPage = nonHomePages.find((p) => p.id === targetPageId);
  const selectedSection = targetPage?.blocks.find((b) => b.id === targetSectionId);

  // ── Summary: selection made ───────────────────────────────────────────
  if (targetPageId && targetSectionId) {
    const kindLabel =
      selectedSection?.type === "section" ? "Section"
      : selectedSection?.blockFormat === "h2" ? "H2"
      : "H3";
    return (
      <div className="overflow-hidden rounded-xl border border-neutral-200">
        <div className="flex items-center justify-between px-3 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-neutral-800">
              {selectedSection?.value ?? "Unknown section"}
            </div>
            <div className="text-xs text-neutral-500">
              {targetPage?.title || "Untitled"} · {kindLabel}
            </div>
          </div>
          <button
            type="button"
            onClick={() => { onSelect("", ""); setExpandedPageId(null); }}
            className="ml-3 shrink-0 text-xs text-neutral-500 hover:text-neutral-700"
          >
            Change
          </button>
        </div>
      </div>
    );
  }

  // ── Picker: accordion card list ───────────────────────────────────────
  if (nonHomePages.length === 0) {
    return (
      <p className="text-xs leading-5 text-neutral-500">No cards available to link to.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <ul>
        {nonHomePages.map((p, i) => {
          const isExpanded = expandedPageId === p.id;
          const sections = p.blocks.filter(
            (b) => b.type === "section" || b.blockFormat === "h2" || b.blockFormat === "h3"
          );
          const hasSections = sections.length > 0;

          return (
            <li key={p.id} className={i > 0 ? "border-t border-neutral-100" : ""}>
              {/* Card row */}
              <button
                type="button"
                onClick={() => setExpandedPageId(isExpanded ? null : p.id)}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left transition hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-neutral-800">
                    {p.title || "Untitled"}
                  </div>
                  <div className="text-xs capitalize text-neutral-500">
                    {hasSections ? `${sections.length} section${sections.length === 1 ? "" : "s"}` : "No sections"}
                  </div>
                </div>
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  aria-hidden="true"
                  className={`ml-2 shrink-0 text-neutral-500 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                >
                  <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>

              {/* Sections drawer */}
              {isExpanded && (
                <ul className="border-t border-neutral-100 bg-neutral-50 px-1 py-1">
                  {hasSections ? sections.map((s) => {
                    const kindLabel =
                      s.type === "section" ? "Section"
                      : s.blockFormat === "h2" ? "H2"
                      : "H3";
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          onClick={() => onSelect(p.id, s.id)}
                          className="w-full rounded-lg py-2 pl-5 pr-2.5 text-left text-sm transition hover:bg-white"
                        >
                          <div className="truncate font-medium text-neutral-800">{s.value}</div>
                          <div className="text-xs text-neutral-500">{kindLabel}</div>
                        </button>
                      </li>
                    );
                  }) : (
                    <li className="py-2 pl-5 pr-2.5 text-xs text-neutral-500">
                      No section headings in this card.
                    </li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
