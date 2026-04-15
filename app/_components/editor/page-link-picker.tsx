"use client";

import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";

export function PageLinkPicker({
  pages,
  anchorBlocks,
  activeIndex,
  onSelect,
  onMouseDownSelect,
}: {
  pages: PageItem[];
  anchorBlocks?: ContentBlock[];
  activeIndex?: number;
  onSelect?: (id: string, label: string) => void;
  onMouseDownSelect?: (id: string, label: string) => void;
}) {
  const hasAnchors = !!anchorBlocks && anchorBlocks.length > 0;

  return (
    <ul className="max-h-48 overflow-y-auto p-1">
      {hasAnchors && pages.length > 0 && (
        <li className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400">
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
            <div className="text-[11px] capitalize text-neutral-400">{p.kind}</div>
          </button>
        </li>
      ))}
      {hasAnchors && (
        <>
          <li className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-neutral-400${pages.length > 0 ? " mt-1" : ""}`}>
            On this card
          </li>
          {anchorBlocks!.map((b, i) => {
            const idx = pages.length + i;
            const kindLabel =
              b.blockFormat === "h2" ? "H2" :
              b.blockFormat === "h3" ? "H3" :
              "Section";
            return (
              <li key={b.id}>
                <button
                  type="button"
                  onClick={onSelect ? () => onSelect(b.id, b.value) : undefined}
                  onMouseDown={onMouseDownSelect
                    ? (e) => { e.preventDefault(); onMouseDownSelect(b.id, b.value); }
                    : undefined
                  }
                  className={`w-full rounded-lg px-2.5 py-2 text-left text-sm transition ${
                    activeIndex !== undefined && idx === activeIndex
                      ? "bg-neutral-100"
                      : "hover:bg-neutral-50"
                  }`}
                >
                  <div className="truncate font-medium text-neutral-800">{b.value}</div>
                  <div className="text-[11px] text-neutral-400">{kindLabel}</div>
                </button>
              </li>
            );
          })}
        </>
      )}
    </ul>
  );
}
