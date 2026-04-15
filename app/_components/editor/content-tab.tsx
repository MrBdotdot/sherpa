"use client";

import { ChangeEvent, useEffect, useRef, useState, useCallback } from "react";
import { ContentBlock, ContentBlockType, DisplayStyleKey, ImageFit, PageItem, SocialLink } from "@/app/_lib/authoring-types";
import { DISPLAY_STYLE_OPTIONS, getDisplayStyleKey } from "@/app/_lib/display-style";
import { BlockEditor, type BlockFormat } from "@/app/_components/editor/block-editor";
import { BlockPickerModal } from "@/app/_components/editor/block-picker-modal";
import { SelectField } from "@/app/_components/editor/editor-ui";
import { PageLinkPicker } from "@/app/_components/editor/page-link-picker";
import { HintBubble } from "@/app/_components/hint-bubble";

function ActionLinkEditor({
  item,
  pages,
  onChange,
  onRemove,
}: {
  item: SocialLink;
  pages: PageItem[];
  onChange: (socialId: string, field: "label" | "url" | "linkMode" | "linkPageId", value: string) => void;
  onRemove: (socialId: string) => void;
}) {
  const mode = item.linkMode ?? "external";
  const linkablePages = pages.filter((p) => p.kind !== "home");
  const linkedPage = linkablePages.find((p) => p.id === item.linkPageId);

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Action link
        </div>
        <button
          type="button"
          onClick={() => onRemove(item.id)}
          className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
        >
          Remove
        </button>
      </div>

      {/* Link mode toggle */}
      <div className="mb-3 flex rounded-xl border border-neutral-200 bg-neutral-100 p-0.5">
        {(["external", "page"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onChange(item.id, "linkMode", m)}
            className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition ${
              mode === m
                ? "bg-white text-neutral-900 shadow-sm"
                : "text-neutral-500 hover:text-neutral-700"
            }`}
          >
            {m === "external" ? "External URL" : "Go to card"}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        <input
          type="text"
          value={item.label}
          onChange={(e) => onChange(item.id, "label", e.target.value)}
          placeholder="Button label"
          aria-label="Action link label"
          className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
        />
        {mode === "external" ? (
          <input
            type="text"
            value={item.url}
            onChange={(e) => onChange(item.id, "url", e.target.value)}
            placeholder="https://..."
            aria-label="Action link URL"
            className="w-full rounded-lg border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
          />
        ) : (
          <div className="rounded-xl border border-neutral-200 overflow-hidden">
            {linkedPage ? (
              <div className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm font-medium text-neutral-800">{linkedPage.title || "Untitled"}</span>
                <button
                  type="button"
                  onClick={() => onChange(item.id, "linkPageId", "")}
                  className="text-xs text-neutral-400 hover:text-neutral-700"
                >
                  Change
                </button>
              </div>
            ) : (
              <PageLinkPicker
                pages={linkablePages}
                onSelect={(pageId) => onChange(item.id, "linkPageId", pageId)}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ContentTab({
  onAddBlock,
  onAddSocialLink,
  onBlockChange,
  onBlockFitChange,
  onBlockImagePositionChange,
  onBlockPropsChange,
  onBlockFormatChange,
  onBlockImageUpload,
  onBlockVariantChange,
  onBlockVerticalAlignChange,
  onBlockWidthChange,
  onBlockTextAlignChange,
  onContentTintChange,
  onDisplayStyleChange,
  onMoveBlockDown,
  onMoveBlockUp,
  onReorderBlocks,
  onRemoveBlock,
  onRemoveSocialLink,
  onSocialLinkChange,
  pages,
  scrollToBlockId,
  selectedPage,
}: {
  onAddBlock: (type: ContentBlockType) => void;
  onAddSocialLink: () => void;
  onBlockChange: (blockId: string, value: string) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImagePositionChange: (blockId: string, x: number, y: number) => void;
  onBlockPropsChange: (blockId: string, patch: Partial<ContentBlock>) => void;
  onBlockFormatChange: (blockId: string, format: BlockFormat) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onBlockVerticalAlignChange: (blockId: string, align: "top" | "middle" | "bottom" | undefined) => void;
  onBlockWidthChange: (blockId: string, width: "full" | "half") => void;
  onBlockTextAlignChange: (blockId: string, align: "left" | "center" | "right") => void;
  onContentTintChange: (color: string, opacity: number) => void;
  onDisplayStyleChange: (style: DisplayStyleKey) => void;
  onMoveBlockDown: (blockId: string) => void;
  onMoveBlockUp: (blockId: string) => void;
  onReorderBlocks: (fromIndex: number, toIndex: number) => void;
  onRemoveBlock: (blockId: string) => void;
  onRemoveSocialLink: (socialId: string) => void;
  onSocialLinkChange: (socialId: string, field: "label" | "url" | "linkMode" | "linkPageId", value: string) => void;
  pages: PageItem[];
  scrollToBlockId?: string | null;
  selectedPage: PageItem;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [highlightBlockId, setHighlightBlockId] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const blockRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleDrop = useCallback((overIndex: number) => {
    if (dragIndex === null) return;
    const to = dragIndex < overIndex ? overIndex - 1 : overIndex;
    if (to !== dragIndex) onReorderBlocks(dragIndex, to);
    setDragIndex(null);
    setDropIndex(null);
  }, [dragIndex, onReorderBlocks]);

  useEffect(() => {
    if (!scrollToBlockId) return;
    const el = blockRefs.current[scrollToBlockId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    setHighlightBlockId(scrollToBlockId);
    const t = setTimeout(() => setHighlightBlockId(null), 1400);
    return () => clearTimeout(t);
  }, [scrollToBlockId]);

  const anchorBlocks = selectedPage.blocks.filter(
    (b) =>
      (b.blockFormat === "h2" || b.blockFormat === "h3" || b.type === "section") &&
      b.value.trim() !== ""
  );

  const totalItems = selectedPage.blocks.length + selectedPage.socialLinks.length;
  const currentDisplayStyle = getDisplayStyleKey(selectedPage);
  const showTint = selectedPage.interactionType === "modal"
    || selectedPage.interactionType === "side-sheet"
    || selectedPage.interactionType === "full-page";

  return (
    <div className="space-y-6 p-5">
      {/* Container visuals — display style + background tint */}
      {false ? (
        <div className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
          Container appearance
        </div>

        <SelectField
          label="Size &amp; style"
          value={currentDisplayStyle}
          onChange={onDisplayStyleChange}
          options={DISPLAY_STYLE_OPTIONS.map((o) => ({ label: o.label, value: o.key }))}
        />


        {showTint ? (
          <div className="space-y-3">
            <div className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
              Background tint
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer select-none items-center gap-2 text-sm text-neutral-700">
                <input
                  type="checkbox"
                  checked={!!selectedPage.contentTintColor}
                  onChange={(e) =>
                    onContentTintChange(
                      e.target.checked ? "#ffffff" : "",
                      selectedPage.contentTintOpacity ?? 85
                    )
                  }
                  className="rounded"
                />
                Custom color
              </label>
              {selectedPage.contentTintColor ? (
                <input
                  type="color"
                  value={selectedPage.contentTintColor}
                  onChange={(e) =>
                    onContentTintChange(e.target.value, selectedPage.contentTintOpacity ?? 85)
                  }
                  aria-label="Background tint color"
                  className="h-8 w-10 cursor-pointer rounded-lg border border-neutral-300 p-0.5"
                />
              ) : null}
            </div>
            {selectedPage.contentTintColor ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-neutral-500">
                  <span>Opacity</span>
                  <span>{selectedPage.contentTintOpacity ?? 85}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={selectedPage.contentTintOpacity ?? 85}
                  onChange={(e) =>
                    onContentTintChange(selectedPage.contentTintColor, Number(e.target.value))
                  }
                  aria-label="Background tint opacity"
                  className="w-full accent-[#3B82F6]"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      ) : null}

      <div className="sticky top-0 z-10 -mx-5 bg-neutral-50 px-5 py-2">
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="w-full rounded-full bg-[#3B82F6] px-3 py-2.5 text-sm font-medium text-white transition hover:bg-[#2563EB]"
        >
          + Add content block
        </button>
      </div>

      {/* Blocks + social links */}
      {totalItems > 0 ? (
        <div className="space-y-3">
          {selectedPage.blocks.map((block, index) => {
            const showDropLine = dropIndex === index && dragIndex !== null && dragIndex !== index && dragIndex !== index - 1;
            return (
              <div
                key={block.id}
                ref={(el) => { blockRefs.current[block.id] = el; }}
                className={`group relative rounded-2xl transition-shadow duration-300 ${highlightBlockId === block.id ? "ring-4 ring-black/25 shadow-lg" : ""} ${dragIndex === index ? "opacity-40" : ""}`}
                onDragOver={(e) => { e.preventDefault(); setDropIndex(index); }}
                onDrop={(e) => { e.preventDefault(); handleDrop(index); }}
              >
                {showDropLine && (
                  <div className="pointer-events-none absolute -top-2 inset-x-2 z-20 h-0.5 rounded-full bg-blue-500" />
                )}
                {/* Drag handle */}
                <div
                  draggable
                  onDragStart={(e) => {
                    setDragIndex(index);
                    e.dataTransfer.effectAllowed = "move";
                    const el = blockRefs.current[block.id];
                    if (el) e.dataTransfer.setDragImage(el, 40, 20);
                  }}
                  onDragEnd={() => { setDragIndex(null); setDropIndex(null); }}
                  className="absolute inset-y-0 left-0 z-10 flex w-6 cursor-grab items-center justify-center rounded-l-2xl opacity-0 transition-opacity group-hover:opacity-100 hover:bg-black/5 active:cursor-grabbing"
                  aria-label="Drag to reorder"
                >
                  <svg width="10" height="14" viewBox="0 0 10 14" fill="none" aria-hidden="true">
                    <circle cx="3" cy="3" r="1.2" fill="#9ca3af"/>
                    <circle cx="7" cy="3" r="1.2" fill="#9ca3af"/>
                    <circle cx="3" cy="7" r="1.2" fill="#9ca3af"/>
                    <circle cx="7" cy="7" r="1.2" fill="#9ca3af"/>
                    <circle cx="3" cy="11" r="1.2" fill="#9ca3af"/>
                    <circle cx="7" cy="11" r="1.2" fill="#9ca3af"/>
                  </svg>
                </div>
                <BlockEditor
                  block={block}
                  index={index}
                  isFirst={index === 0}
                  isLast={index === selectedPage.blocks.length - 1}
                  pages={pages}
                  anchorBlocks={anchorBlocks}
                  selectedPageId={selectedPage.id}
                  onBlockChange={onBlockChange}
                  onBlockFitChange={onBlockFitChange}
                  onBlockImagePositionChange={onBlockImagePositionChange}
                  onBlockPropsChange={onBlockPropsChange}
                  onBlockFormatChange={onBlockFormatChange}
                  onBlockImageUpload={onBlockImageUpload}
                  onBlockVariantChange={onBlockVariantChange}
                  onBlockVerticalAlignChange={onBlockVerticalAlignChange}
                  onBlockWidthChange={onBlockWidthChange}
                  onBlockTextAlignChange={onBlockTextAlignChange}
                  onMoveBlockDown={onMoveBlockDown}
                  onMoveBlockUp={onMoveBlockUp}
                  onRemoveBlock={onRemoveBlock}
                />
              </div>
            );
          })}

          {/* Drop zone after last block */}
          {dragIndex !== null && (
            <div
              className="relative h-3"
              onDragOver={(e) => { e.preventDefault(); setDropIndex(selectedPage.blocks.length); }}
              onDrop={(e) => { e.preventDefault(); handleDrop(selectedPage.blocks.length); }}
            >
              {dropIndex === selectedPage.blocks.length && dragIndex !== selectedPage.blocks.length - 1 && (
                <div className="pointer-events-none absolute inset-x-2 top-1 h-0.5 rounded-full bg-blue-500" />
              )}
            </div>
          )}

          {selectedPage.socialLinks.map((item) => (
            <ActionLinkEditor
              key={item.id}
              item={item}
              pages={pages}
              onChange={onSocialLinkChange}
              onRemove={onRemoveSocialLink}
            />
          ))}

          {selectedPage.blocks.length >= 1 ? (
            <HintBubble id="first-block" className="text-[11px]">
              Hover a block and drag the left handle to reorder
            </HintBubble>
          ) : null}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          No content yet. Add a text block or action link.
        </div>
      )}

      {pickerOpen ? (
        <BlockPickerModal
          onAddBlock={onAddBlock}
          onAddSocialLink={onAddSocialLink}
          onClose={() => setPickerOpen(false)}
        />
      ) : null}
    </div>
  );
}
