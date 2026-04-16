"use client";

import React, { useState } from "react";
import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";
import { PreviewBlocks } from "@/app/_components/canvas/preview-blocks";

// ── Types ──────────────────────────────────────────────────────

type TabPreviewSection = { id: string; label: string; blocks: ContentBlock[] };

function parseTabPreviewSections(value: string): TabPreviewSection[] {
  try {
    const data = JSON.parse(value);
    return (data.sections ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      label: (s.label as string) ?? "",
      // backward-compat: old format used content: string
      blocks: Array.isArray(s.blocks)
        ? (s.blocks as ContentBlock[])
        : (s.content ? [{ id: `${s.id as string}-b0`, type: "text" as ContentBlock["type"], value: s.content as string }] : []),
    }));
  } catch {
    return [];
  }
}

// ── TabsBlock ──────────────────────────────────────────────────

export function TabsBlock({
  block,
  accentColor,
  page,
  pages,
  onNavigate,
  onDismissContent,
}: {
  block: ContentBlock;
  accentColor: string;
  page: PageItem;
  pages?: PageItem[];
  onNavigate?: (pageId: string) => void;
  onDismissContent?: () => void;
}) {
  const sections = parseTabPreviewSections(block.value);
  const [activeIndex, setActiveIndex] = useState(0);
  const idx = Math.min(activeIndex, Math.max(0, sections.length - 1));
  const activeSection = sections[idx];

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
        Empty tabs block
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar — centered, scrollable in narrow containers */}
      <div className="mb-3 flex justify-center overflow-x-auto border-b border-neutral-200">
        {sections.map((section, i) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`-mb-px px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
              i === idx ? "" : "border-transparent text-neutral-500 hover:text-neutral-600"
            }`}
            style={i === idx ? { borderColor: accentColor || "#171717", color: accentColor || "#171717" } : {}}
          >
            {section.label || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      {/* Active section blocks */}
      {activeSection ? (
        activeSection.blocks.length > 0 ? (
          <PreviewBlocks
            accentColor={accentColor}
            onNavigate={onNavigate}
            onDismissContent={onDismissContent}
            page={{ ...page, blocks: activeSection.blocks, summary: "" }}
            pages={pages}
          />
        ) : (
          <div className="text-sm text-neutral-500">Empty tab</div>
        )
      ) : null}
    </div>
  );
}
