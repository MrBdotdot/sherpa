"use client";

import { PageItem } from "@/app/_lib/authoring-types";

export function PageLinkPicker({
  pages,
  activeIndex,
  onSelect,
  onMouseDownSelect,
}: {
  pages: PageItem[];
  activeIndex?: number;
  onSelect?: (pageId: string, pageTitle: string) => void;
  onMouseDownSelect?: (pageId: string, pageTitle: string) => void;
}) {
  return (
    <ul className="max-h-48 overflow-y-auto p-1">
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
    </ul>
  );
}
