"use client";

import { ChangeEvent, useState } from "react";
import { ContentBlock, ContentBlockType, ImageFit, PageItem } from "@/app/_lib/authoring-types";
import { createBlock } from "@/app/_lib/authoring-utils";
import { BlockEditor, type BlockFormat } from "@/app/_components/editor/block-editor";

type TabSection = { id: string; label: string; blocks: ContentBlock[] };

function parseTabs(value: string): TabSection[] {
  try {
    const data = JSON.parse(value);
    return (data.sections ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      label: (s.label as string) ?? "",
      // backward-compat: old format stored content as string
      blocks: Array.isArray(s.blocks)
        ? (s.blocks as ContentBlock[])
        : (s.content ? [{ id: `${s.id as string}-b0`, type: "text" as ContentBlockType, value: s.content as string }] : []),
    }));
  } catch {
    return [];
  }
}

export function TabsBlockEditor({
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
  const [addingToSection, setAddingToSection] = useState<number | null>(null);
  const sections = parseTabs(block.value);

  function updateTabs(newSections: TabSection[]) {
    onBlockChange(block.id, JSON.stringify({ sections: newSections }));
  }

  function updateSectionBlocks(sectionIdx: number, newBlocks: ContentBlock[]) {
    updateTabs(sections.map((s, j) => j === sectionIdx ? { ...s, blocks: newBlocks } : s));
  }

  function makeSectionHandlers(sectionIdx: number, sectionBlocks: ContentBlock[]) {
    const update = (blockId: string, updater: (b: ContentBlock) => ContentBlock) =>
      updateSectionBlocks(sectionIdx, sectionBlocks.map((b) => b.id === blockId ? updater(b) : b));

    return {
      onBlockChange: (blockId: string, val: string) => update(blockId, (b) => ({ ...b, value: val })),
      onBlockFitChange: (blockId: string, fit: ImageFit) => update(blockId, (b) => ({ ...b, imageFit: fit })),
      onBlockImagePositionChange: (blockId: string, x: number, y: number) =>
        update(blockId, (b) => ({ ...b, imagePosition: { x, y } })),
      onBlockPropsChange: (blockId: string, patch: Partial<ContentBlock>) =>
        update(blockId, (b) => ({ ...b, ...patch })),
      onBlockFormatChange: (blockId: string, format: BlockFormat) =>
        update(blockId, (b) => ({ ...b, blockFormat: format })),
      onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) =>
        update(blockId, (b) => ({ ...b, variant })),
      onBlockVerticalAlignChange: (blockId: string, align: ContentBlock["verticalAlign"]) =>
        update(blockId, (b) => ({ ...b, verticalAlign: align })),
      onBlockWidthChange: (blockId: string, width: "full" | "half") =>
        update(blockId, (b) => ({ ...b, blockWidth: width })),
      onBlockTextAlignChange: (blockId: string, align: "left" | "center" | "right") =>
        update(blockId, (b) => ({ ...b, textAlign: align })),
      onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        update(blockId, (b) => ({ ...b, value: URL.createObjectURL(file), imageFit: "cover" as const }));
      },
      onMoveBlockUp: (blockId: string) => {
        const idx = sectionBlocks.findIndex((b) => b.id === blockId);
        if (idx <= 0) return;
        const next = [...sectionBlocks];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        updateSectionBlocks(sectionIdx, next);
      },
      onMoveBlockDown: (blockId: string) => {
        const idx = sectionBlocks.findIndex((b) => b.id === blockId);
        if (idx < 0 || idx >= sectionBlocks.length - 1) return;
        const next = [...sectionBlocks];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        updateSectionBlocks(sectionIdx, next);
      },
      onRemoveBlock: (blockId: string) =>
        updateSectionBlocks(sectionIdx, sectionBlocks.filter((b) => b.id !== blockId)),
    };
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const handlers = makeSectionHandlers(i, section.blocks);
        return (
          <div key={section.id} className="overflow-hidden rounded-xl border border-neutral-200">
            {/* Section header */}
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-3 py-2">
              <input
                type="text"
                value={section.label}
                onChange={(e) =>
                  updateTabs(sections.map((s, j) => j === i ? { ...s, label: e.target.value } : s))
                }
                placeholder={`Tab ${i + 1} label`}
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-neutral-500"
              />
              {sections.length > 1 ? (
                <button
                  type="button"
                  onClick={() => updateTabs(sections.filter((_, j) => j !== i))}
                  aria-label={`Remove tab ${i + 1}`}
                  className="shrink-0 rounded-lg border border-neutral-200 p-1.5 text-neutral-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4 3.5l.7 7.5a1 1 0 001 .9h2.6a1 1 0 001-.9L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
              ) : null}
            </div>

            {/* Section blocks */}
            <div className="space-y-3 p-3">
              {section.blocks.length > 0 ? (
                section.blocks.map((b, bi) => (
                  <BlockEditor
                    key={b.id}
                    block={b}
                    index={bi}
                    isFirst={bi === 0}
                    isLast={bi === section.blocks.length - 1}
                    pages={pages}
                    selectedPageId={selectedPageId}
                    {...handlers}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-3 text-xs text-neutral-500">
                  No blocks yet. Add one below.
                </div>
              )}

              {/* Add block */}
              {addingToSection === i ? (
                <div className="overflow-hidden rounded-xl border border-neutral-200 bg-neutral-50">
                  {([
                    { type: "text" as ContentBlockType, label: "Text", desc: "Paragraph, heading, list, or steps" },
                    { type: "callout" as ContentBlockType, label: "Callout", desc: "Info, warning, or tip" },
                    { type: "image" as ContentBlockType, label: "Image", desc: "Inline photo or diagram" },
                  ] as const).map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => {
                        updateSectionBlocks(i, [...section.blocks, createBlock(item.type)]);
                        setAddingToSection(null);
                      }}
                      className="flex w-full items-start gap-3 border-b border-neutral-200 px-3 py-2.5 text-left last:border-0 hover:bg-white transition"
                    >
                      <div>
                        <div className="text-xs font-medium text-neutral-800">{item.label}</div>
                        <div className="text-xs text-neutral-500">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddingToSection(null)}
                    className="w-full px-3 py-2 text-xs text-neutral-500 hover:text-neutral-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingToSection(i)}
                  className="w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
                >
                  + Add block
                </button>
              )}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() =>
          updateTabs([...sections, { id: `tab-${Date.now()}`, label: `Tab ${sections.length + 1}`, blocks: [] }])
        }
        className="w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
      >
        + Add section
      </button>
    </div>
  );
}
