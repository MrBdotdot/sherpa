"use client";

import { ChangeEvent, useState } from "react";
import { ContentBlock, ContentBlockType, ImageFit, PageItem } from "@/app/_lib/authoring-types";
import { createBlock } from "@/app/_lib/authoring-utils";
import { BlockEditor, type BlockFormat } from "@/app/_components/editor/block-editor";

type CarouselSlide = { id: string; label: string; blocks: ContentBlock[] };

function parseCarouselSlides(value: string): CarouselSlide[] {
  try {
    const data = JSON.parse(value);
    return (data.slides ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      label: (s.label as string) ?? "",
      blocks: Array.isArray(s.blocks) ? (s.blocks as ContentBlock[]) : [],
    }));
  } catch {
    return [];
  }
}

export function CarouselBlockEditor({
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
  const [addingToSlide, setAddingToSlide] = useState<number | null>(null);
  const slides = parseCarouselSlides(block.value);

  function updateSlides(newSlides: CarouselSlide[]) {
    onBlockChange(block.id, JSON.stringify({ slides: newSlides }));
  }

  function updateSlideBlocks(slideIdx: number, newBlocks: ContentBlock[]) {
    updateSlides(slides.map((s, j) => j === slideIdx ? { ...s, blocks: newBlocks } : s));
  }

  function makeSlideHandlers(slideIdx: number, slideBlocks: ContentBlock[]) {
    const update = (blockId: string, updater: (b: ContentBlock) => ContentBlock) =>
      updateSlideBlocks(slideIdx, slideBlocks.map((b) => b.id === blockId ? updater(b) : b));

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
        const idx = slideBlocks.findIndex((b) => b.id === blockId);
        if (idx <= 0) return;
        const next = [...slideBlocks];
        [next[idx - 1], next[idx]] = [next[idx], next[idx - 1]];
        updateSlideBlocks(slideIdx, next);
      },
      onMoveBlockDown: (blockId: string) => {
        const idx = slideBlocks.findIndex((b) => b.id === blockId);
        if (idx < 0 || idx >= slideBlocks.length - 1) return;
        const next = [...slideBlocks];
        [next[idx], next[idx + 1]] = [next[idx + 1], next[idx]];
        updateSlideBlocks(slideIdx, next);
      },
      onRemoveBlock: (blockId: string) =>
        updateSlideBlocks(slideIdx, slideBlocks.filter((b) => b.id !== blockId)),
    };
  }

  return (
    <div className="space-y-3">
      {slides.map((slide, i) => {
        const handlers = makeSlideHandlers(i, slide.blocks);
        return (
          <div key={slide.id} className="overflow-hidden rounded-xl border border-neutral-200">
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-3 py-2">
              <span className="shrink-0 text-[10px] font-semibold text-neutral-500">{i + 1}</span>
              <input
                type="text"
                value={slide.label}
                onChange={(e) =>
                  updateSlides(slides.map((s, j) => j === i ? { ...s, label: e.target.value } : s))
                }
                placeholder={`Slide ${i + 1} label`}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-neutral-500"
              />
              {i > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...slides];
                    [next[i - 1], next[i]] = [next[i], next[i - 1]];
                    updateSlides(next);
                  }}
                  aria-label={`Move slide ${i + 1} up`}
                  className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-500 transition hover:bg-neutral-50"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 11V3M3.5 6.5L7 3l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {i < slides.length - 1 && (
                <button
                  type="button"
                  onClick={() => {
                    const next = [...slides];
                    [next[i], next[i + 1]] = [next[i + 1], next[i]];
                    updateSlides(next);
                  }}
                  aria-label={`Move slide ${i + 1} down`}
                  className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-500 transition hover:bg-neutral-50"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 3v8M3.5 7.5L7 11l3.5-3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {slides.length > 1 && (
                <button
                  type="button"
                  onClick={() => updateSlides(slides.filter((_, j) => j !== i))}
                  aria-label={`Remove slide ${i + 1}`}
                  className="shrink-0 rounded border border-neutral-200 p-1 text-neutral-500 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4 3.5l.7 7.5a1 1 0 001 .9h2.6a1 1 0 001-.9L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            <div className="space-y-3 p-3">
              {slide.blocks.length > 0 ? (
                slide.blocks.map((b, bi) => (
                  <BlockEditor
                    key={b.id}
                    block={b}
                    index={bi}
                    isFirst={bi === 0}
                    isLast={bi === slide.blocks.length - 1}
                    pages={pages}
                    selectedPageId={selectedPageId}
                    {...handlers}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-3 text-xs text-neutral-500">
                  No content yet. Add a block below.
                </div>
              )}

              {addingToSlide === i ? (
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
                        updateSlideBlocks(i, [...slide.blocks, createBlock(item.type)]);
                        setAddingToSlide(null);
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
                    onClick={() => setAddingToSlide(null)}
                    className="w-full px-3 py-2 text-xs text-neutral-500 hover:text-neutral-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingToSlide(i)}
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
          updateSlides([...slides, { id: `slide-${Date.now()}`, label: `Slide ${slides.length + 1}`, blocks: [] }])
        }
        className="w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
      >
        + Add slide
      </button>
    </div>
  );
}
