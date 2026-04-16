"use client";

import React from "react";
import { AnchorTarget, PageItem } from "@/app/_lib/authoring-types";

export function PageLinkPicker({
  pages,
  anchorTargets,
  currentPageId,
  activeIndex,
  onSelect,
  onMouseDownSelect,
}: {
  pages: PageItem[];
  anchorTargets?: AnchorTarget[];
  currentPageId?: string;
  activeIndex?: number;
  onSelect?: (id: string, label: string) => void;
  onMouseDownSelect?: (id: string, label: string) => void;
}) {
  const sameCard = (anchorTargets ?? []).filter((t) => t.pageId === currentPageId);
  const crossCard = (anchorTargets ?? []).filter((t) => t.pageId !== currentPageId);

  // Group cross-card targets by pageId, preserving first-seen order
  interface CrossCardGroup {
    pageId: string;
    pageTitle: string;
    items: Array<{ target: AnchorTarget; idx: number }>;
  }
  const crossCardGroupMap = new Map<string, CrossCardGroup>();
  let crossIdx = pages.length + sameCard.length;
  for (const t of crossCard) {
    if (!crossCardGroupMap.has(t.pageId)) {
      crossCardGroupMap.set(t.pageId, { pageId: t.pageId, pageTitle: t.pageTitle, items: [] });
    }
    crossCardGroupMap.get(t.pageId)!.items.push({ target: t, idx: crossIdx++ });
  }
  const crossCardGroups = [...crossCardGroupMap.values()];

  const hasAnchors = (anchorTargets ?? []).length > 0;

  return (
    <ul className="max-h-48 overflow-y-auto p-1">
      {hasAnchors && pages.length > 0 && (
        <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
          Pages
        </li>
      )}
      {pages.map((p, i) => (
        <li key={p.id}>
          <button
            type="button"
            onClick={onSelect ? () => onSelect(p.id, p.title || "link") : undefined}
            onMouseDown={onMouseDownSelect
              ? (e) => { e.preventDefault(); onMouseDownSelect(p.id, p.title || "link"); }
              : undefined
            }
            className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
              activeIndex !== undefined && i === activeIndex
                ? "bg-neutral-100"
                : "hover:bg-neutral-50"
            }`}
          >
            <div className="truncate font-medium text-neutral-800">{p.title || "Untitled"}</div>
            <div className="text-xs capitalize text-neutral-500">{p.kind}</div>
          </button>
        </li>
      ))}
      {sameCard.length > 0 && (
        <>
          <li className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500${pages.length > 0 ? " mt-1" : ""}`}>
            On this card
          </li>
          {sameCard.map((t, i) => {
            const idx = pages.length + i;
            const kindLabel = t.kind === "h2" ? "H2" : t.kind === "h3" ? "H3" : "Section";
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(t.id, t.label) : undefined}
                  onMouseDown={onMouseDownSelect
                    ? (e) => { e.preventDefault(); onMouseDownSelect(t.id, t.label); }
                    : undefined
                  }
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    activeIndex !== undefined && idx === activeIndex
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="truncate font-medium text-neutral-800">{t.label}</div>
                  <div className="text-xs text-neutral-500">{kindLabel}</div>
                </button>
              </li>
            );
          })}
        </>
      )}
      {crossCardGroups.map((group) => (
        <React.Fragment key={group.pageId}>
          <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-500 mt-1">
            {group.pageTitle}
          </li>
          {group.items.map(({ target: t, idx }) => {
            const kindLabel = t.kind === "h2" ? "H2" : t.kind === "h3" ? "H3" : "Section";
            return (
              <li key={t.id}>
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(t.id, t.label) : undefined}
                  onMouseDown={onMouseDownSelect
                    ? (e) => { e.preventDefault(); onMouseDownSelect(t.id, t.label); }
                    : undefined
                  }
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    activeIndex !== undefined && idx === activeIndex
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="truncate font-medium text-neutral-800">{t.label}</div>
                  <div className="text-xs text-neutral-500">{kindLabel}</div>
                </button>
              </li>
            );
          })}
        </React.Fragment>
      ))}
    </ul>
  );
}
