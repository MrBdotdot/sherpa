"use client";

import { ChangeEvent, useState } from "react";
import { createPortal } from "react-dom";
import { ContentBlock, ContentBlockType, DisplayStyleKey, ImageFit, PageItem } from "@/app/_lib/authoring-types";
import { DISPLAY_STYLE_OPTIONS, getDisplayStyleKey } from "@/app/_lib/authoring-utils";
import { BlockEditor, CONTENT_ELEMENT_TYPES } from "@/app/_components/editor/block-editor";
import { SelectField } from "@/app/_components/editor/editor-ui";
import { useFocusTrap } from "@/app/_hooks/useFocusTrap";

function BlockPickerModal({
  onAddBlock,
  onAddSocialLink,
  onClose,
}: {
  onAddBlock: (type: ContentBlockType) => void;
  onAddSocialLink: () => void;
  onClose: () => void;
}) {
  const dialogRef = useFocusTrap<HTMLDivElement>(true);
  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/40 p-4 sm:items-center"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onKeyDown={(e) => { if (e.key === "Escape") onClose(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="block-picker-title"
        className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <div id="block-picker-title" className="text-base font-semibold text-neutral-900">
            Add content block
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close picker"
            className="rounded-xl border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
        </div>
        <ul role="list" className="space-y-2">
          {CONTENT_ELEMENT_TYPES.map((item) => (
            <li key={item.label}>
              <button
                type="button"
                onClick={() => {
                  if (item.kind === "block") {
                    onAddBlock(item.type!);
                  } else {
                    onAddSocialLink();
                  }
                  onClose();
                }}
                className="flex w-full items-start gap-3 rounded-2xl border border-neutral-200 px-4 py-3 text-left hover:border-neutral-300 hover:bg-neutral-50"
              >
                <div>
                  <div className="text-sm font-medium text-neutral-900">{item.label}</div>
                  <div className="mt-0.5 text-xs leading-4 text-neutral-400">{item.description}</div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
}

export function ContentTab({
  onAddBlock,
  onAddSocialLink,
  onBlockChange,
  onBlockFitChange,
  onBlockImageUpload,
  onBlockVariantChange,
  onContentTintChange,
  onDisplayStyleChange,
  onMoveBlockDown,
  onMoveBlockUp,
  onRemoveBlock,
  onRemoveSocialLink,
  onSocialLinkChange,
  selectedPage,
}: {
  onAddBlock: (type: ContentBlockType) => void;
  onAddSocialLink: () => void;
  onBlockChange: (blockId: string, value: string) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onContentTintChange: (color: string, opacity: number) => void;
  onDisplayStyleChange: (style: DisplayStyleKey) => void;
  onMoveBlockDown: (blockId: string) => void;
  onMoveBlockUp: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
  onRemoveSocialLink: (socialId: string) => void;
  onSocialLinkChange: (socialId: string, field: "label" | "url", value: string) => void;
  selectedPage: PageItem;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const totalItems = selectedPage.blocks.length + selectedPage.socialLinks.length;
  const currentDisplayStyle = getDisplayStyleKey(selectedPage);
  const showTint = selectedPage.interactionType === "modal"
    || selectedPage.interactionType === "side-sheet"
    || selectedPage.interactionType === "full-page";

  return (
    <div className="space-y-6 p-5">
      {/* Intro text — not applicable on the home surface */}

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="w-full rounded-2xl border border-dashed border-neutral-300 px-4 py-3 text-sm font-medium text-neutral-600 hover:border-neutral-400 hover:bg-white"
      >
        + Add content block
      </button>

      {/* Container visuals — display style + background tint */}
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
                  className="w-full accent-neutral-900"
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* Blocks + social links */}
      {totalItems > 0 ? (
        <div className="space-y-3">
          {selectedPage.blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              index={index}
              isFirst={index === 0}
              isLast={index === selectedPage.blocks.length - 1}
              onBlockChange={onBlockChange}
              onBlockFitChange={onBlockFitChange}
              onBlockImageUpload={onBlockImageUpload}
              onBlockVariantChange={onBlockVariantChange}
              onMoveBlockDown={onMoveBlockDown}
              onMoveBlockUp={onMoveBlockUp}
              onRemoveBlock={onRemoveBlock}
            />
          ))}

          {selectedPage.socialLinks.map((item) => (
            <div key={item.id} className="rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">
                  Action link
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveSocialLink(item.id)}
                  className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={item.label}
                  onChange={(e) => onSocialLinkChange(item.id, "label", e.target.value)}
                  placeholder="Button label"
                  aria-label="Action link label"
                  className="rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
                />
                <input
                  type="text"
                  value={item.url}
                  onChange={(e) => onSocialLinkChange(item.id, "url", e.target.value)}
                  placeholder="https://..."
                  aria-label="Action link URL"
                  className="rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none focus:border-black"
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 px-4 py-8 text-center text-sm text-neutral-500">
          No content yet — add a text block or action link.
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
