"use client";

import { PageItem } from "@/app/_lib/authoring-types";
import { PageLinkPicker } from "@/app/_components/editor/page-link-picker";

export function SectionPicker({
  pages,
  targetPageId,
  targetSectionId,
  onSelectPage,
  onSelectSection,
}: {
  pages: PageItem[];
  targetPageId: string;
  targetSectionId: string;
  onSelectPage: (pageId: string) => void;
  onSelectSection: (sectionId: string) => void;
}) {
  const nonHomePages = pages.filter((p) => p.kind !== "home");
  const targetPage = nonHomePages.find((p) => p.id === targetPageId);
  const sections = targetPage?.blocks.filter(
    (b) => b.type === "section" || b.blockFormat === "h2" || b.blockFormat === "h3"
  ) ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Card</div>
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          {targetPageId ? (
            <div className="flex items-center justify-between px-3 py-2.5">
              <span className="text-sm font-medium text-neutral-800">
                {targetPage?.title || "Untitled"}
              </span>
              <button
                type="button"
                onClick={() => { onSelectPage(""); onSelectSection(""); }}
                className="text-xs text-neutral-400 hover:text-neutral-700"
              >
                Change
              </button>
            </div>
          ) : (
            <PageLinkPicker
              pages={nonHomePages}
              onSelect={(pageId) => { onSelectPage(pageId); onSelectSection(""); }}
            />
          )}
        </div>
      </div>

      {targetPageId ? (
        <div className="space-y-1.5">
          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Section</div>
          {sections.length > 0 ? (
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              {targetSectionId ? (
                <div className="flex items-center justify-between px-3 py-2.5">
                  <span className="text-sm font-medium text-neutral-800">
                    {sections.find((b) => b.id === targetSectionId)?.value || "Unknown section"}
                  </span>
                  <button
                    type="button"
                    onClick={() => onSelectSection("")}
                    className="text-xs text-neutral-400 hover:text-neutral-700"
                  >
                    Change
                  </button>
                </div>
              ) : (
                <ul className="max-h-48 overflow-y-auto p-1">
                  {sections.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => onSelectSection(s.id)}
                        className="w-full rounded-lg px-2.5 py-2 text-left text-sm transition hover:bg-neutral-50"
                      >
                        <div className="truncate font-medium text-neutral-800">{s.value}</div>
                        <div className="text-[11px] capitalize text-neutral-400">
                          {s.type === "section" ? "Section" : s.blockFormat === "h2" ? "H2" : "H3"}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <p className="text-xs leading-5 text-neutral-400">
              No section headings in this card. Add section, H2, or H3 blocks to create anchor targets.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
