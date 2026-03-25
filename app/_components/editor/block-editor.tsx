"use client";

import React, { ChangeEvent, useRef, useState } from "react";
import { ContentBlock, ContentBlockType, ImageFit, PageItem } from "@/app/_lib/authoring-types";
import { PageLinkPicker } from "@/app/_components/editor/page-link-picker";

export const CONTENT_ELEMENT_TYPES = [
  { kind: "block" as const, type: "text" as ContentBlockType, label: "Text", description: "A paragraph of content" },
  { kind: "block" as const, type: "steps" as ContentBlockType, label: "Steps", description: "Numbered step-by-step instructions" },
  { kind: "block" as const, type: "callout" as ContentBlockType, label: "Callout", description: "Info, warning, or tip highlight" },
  { kind: "block" as const, type: "image" as ContentBlockType, label: "Image", description: "Inline photo or diagram" },
  { kind: "block" as const, type: "video" as ContentBlockType, label: "Video", description: "Embedded video clip" },
  { kind: "action-link" as const, type: null, label: "Action link", description: "Outbound link button — store, social, download" },
];

const TYPE_LABELS: Record<ContentBlockType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  steps: "Steps",
  callout: "Callout",
};

type TriggerState = { active: boolean; start: number; query: string; index: number };
const TRIGGER_CLOSED: TriggerState = { active: false, start: 0, query: "", index: 0 };

export function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  pages,
  selectedPageId,
  onBlockChange,
  onBlockFitChange,
  onBlockImageUpload,
  onBlockVariantChange,
  onMoveBlockDown,
  onMoveBlockUp,
  onRemoveBlock,
}: {
  block: ContentBlock;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  pages?: PageItem[];
  selectedPageId?: string;
  onBlockChange: (blockId: string, value: string) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onMoveBlockDown: (blockId: string) => void;
  onMoveBlockUp: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const [mdHintOpen, setMdHintOpen] = useState(false);
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [trigger, setTrigger] = useState<TriggerState>(TRIGGER_CLOSED);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  const linkablePages = pages?.filter(
    (p) => p.kind !== "home" && p.id !== selectedPageId
  ) ?? [];

  const triggerResults = trigger.query
    ? linkablePages.filter((p) => (p.title || "").toLowerCase().includes(trigger.query.toLowerCase()))
    : linkablePages;

  function closeTrigger() {
    setTrigger(TRIGGER_CLOSED);
  }

  function commitTrigger(pageId: string, pageTitle: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const label = pageTitle || "link";
    const insertText = `((${label}|${pageId}))`;
    const cursorPos = ta.selectionStart;
    onBlockChange(block.id, block.value.slice(0, trigger.start) + insertText + block.value.slice(cursorPos));
    closeTrigger();
    setTimeout(() => {
      ta.focus();
      const newCursor = trigger.start + insertText.length;
      ta.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  function insertLink(pageId: string, pageTitle: string) {
    const { start, end } = cursorRef.current;
    const label = pageTitle || "link";
    const insertText = `((${label}|${pageId}))`;
    onBlockChange(block.id, block.value.slice(0, start) + insertText + block.value.slice(end));
    setLinkPickerOpen(false);
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursor = start + insertText.length;
        textareaRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  }

  function handleTextareaChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    const newValue = event.target.value;
    onBlockChange(block.id, newValue);
    const cursor = event.target.selectionStart;
    const before = newValue.slice(0, cursor);
    const lastTrigger = before.lastIndexOf("((");
    if (lastTrigger !== -1) {
      const afterTrigger = before.slice(lastTrigger + 2);
      if (!/[|\)\n]/.test(afterTrigger)) {
        setTrigger({ active: true, start: lastTrigger, query: afterTrigger, index: 0 });
        cursorRef.current = { start: cursor, end: cursor };
        return;
      }
    }
    closeTrigger();
    cursorRef.current = { start: cursor, end: event.target.selectionEnd };
  }

  function handleTextareaKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!trigger.active || triggerResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setTrigger((t) => ({ ...t, index: Math.min(t.index + 1, triggerResults.length - 1) }));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setTrigger((t) => ({ ...t, index: Math.max(t.index - 1, 0) }));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const page = triggerResults[trigger.index];
      if (page) commitTrigger(page.id, page.title || "link");
    } else if (event.key === "Escape") {
      closeTrigger();
    }
  }

  const label = `${TYPE_LABELS[block.type]} ${index + 1}`;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium text-neutral-800">{label}</div>
          {block.type === "text" ? (
            <div className="flex items-center gap-1">
              <div className="relative">
                <button
                  type="button"
                  onMouseEnter={() => setMdHintOpen(true)}
                  onMouseLeave={() => setMdHintOpen(false)}
                  onClick={() => setMdHintOpen((v) => !v)}
                  aria-label="Markdown syntax help"
                  className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M7 6.5v3M7 4v.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                  </svg>
                </button>
                {mdHintOpen ? (
                  <div className="absolute bottom-full left-0 z-50 mb-2 w-52 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg">
                    <div className="mb-1.5 text-[11px] font-semibold text-neutral-800">Markdown syntax</div>
                    <div className="space-y-0.5 font-mono text-[10px] text-neutral-500">
                      <div>**bold**&nbsp;&nbsp;&nbsp;*italic*</div>
                      <div># Heading&nbsp;&nbsp;## Subheading</div>
                      <div>- List item</div>
                      <div>[link text](url)</div>
                      <div>&gt; Blockquote</div>
                      <div>--- Divider</div>
                    </div>
                  </div>
                ) : null}
              </div>
              {linkablePages.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setLinkPickerOpen((v) => !v)}
                    aria-label="Insert content link"
                    className="flex h-5 w-5 items-center justify-center rounded-full text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                      <path d="M5.5 8.5l3-3M6 4H4a2 2 0 000 4h1M8 10h1a2 2 0 000-4H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                    </svg>
                  </button>
                  {linkPickerOpen ? (
                    <div className="absolute bottom-full left-0 z-50 mb-2 w-56 rounded-xl border border-neutral-200 bg-white shadow-lg">
                      <div className="border-b border-neutral-100 px-3 py-2 text-[11px] font-semibold text-neutral-500">
                        Link to page
                      </div>
                      <PageLinkPicker pages={linkablePages} onSelect={insertLink} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onMoveBlockUp(block.id)}
            disabled={isFirst}
            aria-label={`Move ${label} up`}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
          >
            <span aria-hidden="true">↑</span>
          </button>
          <button
            type="button"
            onClick={() => onMoveBlockDown(block.id)}
            disabled={isLast}
            aria-label={`Move ${label} down`}
            className="rounded-lg border border-neutral-300 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
          >
            <span aria-hidden="true">↓</span>
          </button>
          <button
            type="button"
            onClick={() => onRemoveBlock(block.id)}
            aria-label={`Remove ${label}`}
            className="rounded-lg border border-neutral-300 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          >
            Remove
          </button>
        </div>
      </div>

      {block.type === "text" ? (
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={block.value}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            onSelect={(e) => {
              cursorRef.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
            }}
            onBlur={(e) => {
              cursorRef.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
            }}
            placeholder="Enter text content — supports **bold**, *italic*, and more"
            aria-label={label}
            rows={5}
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm leading-6 outline-none transition focus:border-black"
          />
          {trigger.active && triggerResults.length > 0 ? (
            <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-xl border border-neutral-200 bg-white shadow-lg">
              <div className="border-b border-neutral-100 px-3 py-1.5 text-[11px] font-semibold text-neutral-400">
                Link to page{trigger.query ? ` — "${trigger.query}"` : ""}
              </div>
              <PageLinkPicker pages={triggerResults} activeIndex={trigger.index} onMouseDownSelect={commitTrigger} />
            </div>
          ) : null}
        </div>
      ) : block.type === "steps" ? (
        <div className="space-y-2">
          <div className="text-xs leading-5 text-neutral-500">
            One step per line — each line becomes a numbered step in the experience.
          </div>
          <textarea
            value={block.value}
            onChange={(event) => onBlockChange(block.id, event.target.value)}
            placeholder={"Set up the board\nDeal 5 cards to each player\nThe youngest player goes first"}
            aria-label={label}
            rows={6}
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm leading-6 outline-none transition focus:border-black"
          />
        </div>
      ) : block.type === "callout" ? (
        <div className="space-y-3">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Variant</div>
            <div className="flex gap-2">
              {(["info", "warning", "tip"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => onBlockVariantChange(block.id, v)}
                  aria-pressed={block.variant === v}
                  className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                    block.variant === v
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {v}
                </button>
              ))}
            </div>
          </div>
          <textarea
            value={block.value}
            onChange={(event) => onBlockChange(block.id, event.target.value)}
            placeholder="Add a rule clarification, exception, or helpful tip"
            aria-label={label}
            rows={3}
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm leading-6 outline-none transition focus:border-black"
          />
        </div>
      ) : block.type === "image" ? (
        <div className="space-y-3">
          <input
            type="text"
            value={block.value}
            onChange={(event) => onBlockChange(block.id, event.target.value)}
            placeholder="Paste image URL"
            aria-label="Image URL"
            className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none transition focus:border-black"
          />
          <label className="inline-flex cursor-pointer items-center rounded-xl border border-neutral-300 px-3 py-2 text-xs font-medium text-neutral-700 hover:bg-neutral-50">
            Upload from computer
            <input type="file" accept="image/*" onChange={(event) => onBlockImageUpload(block.id, event)} className="hidden" />
          </label>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Image fit</div>
            <div role="group" aria-label="Image fit" className="flex gap-1.5">
              {([
                { value: "cover", label: "Fill" },
                { value: "contain", label: "Fit" },
                { value: "fill", label: "Stretch" },
                { value: "center", label: "Crop" },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onBlockFitChange(block.id, opt.value)}
                  aria-pressed={(block.imageFit ?? "cover") === opt.value}
                  className={`flex-1 rounded-lg border py-1.5 text-[11px] font-medium transition ${
                    (block.imageFit ?? "cover") === opt.value
                      ? "border-neutral-900 bg-neutral-900 text-white"
                      : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <input
          type="text"
          value={block.value}
          onChange={(event) => onBlockChange(block.id, event.target.value)}
          placeholder="Paste video URL or file URL"
          aria-label="Video URL"
          className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none transition focus:border-black"
        />
      )}
    </div>
  );
}
