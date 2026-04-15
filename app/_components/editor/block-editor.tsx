"use client";

import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnchorTarget, ContentBlock, ImageFit, PageItem } from "@/app/_lib/authoring-types";
import { PageLinkPicker } from "@/app/_components/editor/page-link-picker";
import { StepRailBlockEditor } from "@/app/_components/editor/step-rail-block-editor";
import { TabsBlockEditor } from "@/app/_components/editor/tabs-block-editor";
import { CarouselBlockEditor } from "@/app/_components/editor/carousel-block-editor";
import { CalloutBlockEditor, ConsentBlockEditor, ImageBlockEditor } from "@/app/_components/editor/block-type-editors";
import {
  CONTENT_ELEMENT_TYPES,
  TYPE_LABELS,
  FORMAT_OPTIONS,
  FORMAT_SUPPORTED,
  HALF_WIDTH_SUPPORTED,
  TEXT_ALIGN_SUPPORTED,
  VERTICAL_ALIGN_SUPPORTED,
  getEffectiveFormat,
  getTextareaPlaceholder,
  type BlockFormat,
  type VerticalAlign,
} from "@/app/_lib/block-type-config";
import { useInlineTriggerState } from "@/app/_hooks/useInlineTriggerState";

export type { BlockFormat } from "@/app/_lib/block-type-config";
export { CONTENT_ELEMENT_TYPES };

export function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  pages,
  anchorTargets,
  selectedPageId,
  onBlockChange,
  onReplaceBlocks,
  onBlockFitChange,
  onBlockImagePositionChange,
  onBlockPropsChange,
  onBlockFormatChange,
  onBlockImageUpload,
  onBlockVariantChange,
  onBlockVerticalAlignChange,
  onBlockWidthChange,
  onBlockTextAlignChange,
  onMoveBlockDown,
  onMoveBlockUp,
  onRemoveBlock,
}: {
  block: ContentBlock;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  pages?: PageItem[];
  anchorTargets?: AnchorTarget[];
  selectedPageId?: string;
  onBlockChange: (blockId: string, value: string) => void;
  onReplaceBlocks?: (newBlocks: ContentBlock[]) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImagePositionChange: (blockId: string, x: number, y: number) => void;
  onBlockPropsChange: (blockId: string, patch: Partial<ContentBlock>) => void;
  onBlockFormatChange: (blockId: string, format: BlockFormat) => void;
  onBlockImageUpload: (blockId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onBlockVariantChange: (blockId: string, variant: ContentBlock["variant"]) => void;
  onBlockVerticalAlignChange: (blockId: string, align: VerticalAlign) => void;
  onBlockWidthChange: (blockId: string, width: "full" | "half") => void;
  onBlockTextAlignChange: (blockId: string, align: "left" | "center" | "right") => void;
  onMoveBlockDown: (blockId: string) => void;
  onMoveBlockUp: (blockId: string) => void;
  onRemoveBlock: (blockId: string) => void;
}) {
  const [linkPickerOpen, setLinkPickerOpen] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [customColor, setCustomColor] = useState("#e11d48");
  const { trigger, setTrigger, closeTrigger } = useInlineTriggerState();
  const [triggerPos, setTriggerPos] = useState<{ top: number; right: number } | null>(null);
  const [linkPickerPos, setLinkPickerPos] = useState<{ top: number; right: number } | null>(null);
  const [colorPickerPos, setColorPickerPos] = useState<{ top: number; right: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const linkBtnRef = useRef<HTMLButtonElement>(null);
  const colorBtnRef = useRef<HTMLButtonElement>(null);
  const cursorRef = useRef<{ start: number; end: number }>({ start: 0, end: 0 });

  useEffect(() => {
    if (trigger.active && textareaRef.current) {
      const r = textareaRef.current.getBoundingClientRect();
      setTriggerPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
    } else {
      setTriggerPos(null);
    }
  }, [trigger.active]);

  function openLinkPicker() {
    if (linkBtnRef.current) {
      const r = linkBtnRef.current.getBoundingClientRect();
      setLinkPickerPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setLinkPickerOpen(true);
    setColorPickerOpen(false);
  }

  function openColorPicker() {
    if (colorBtnRef.current) {
      const r = colorBtnRef.current.getBoundingClientRect();
      setColorPickerPos({ top: r.bottom + 6, right: window.innerWidth - r.right });
    }
    setColorPickerOpen(true);
    setLinkPickerOpen(false);
  }

  const linkablePages = pages?.filter(
    (p) => p.kind !== "home" && p.id !== selectedPageId
  ) ?? [];

  type TriggerResult = { id: string; label: string };

  const triggerPageResults = trigger.query
    ? linkablePages.filter((p) => (p.title || "").toLowerCase().includes(trigger.query.toLowerCase()))
    : linkablePages;

  const triggerAnchorResults = trigger.query
    ? (anchorTargets ?? []).filter((t) => t.label.toLowerCase().includes(trigger.query.toLowerCase()))
    : (anchorTargets ?? []);

  const triggerResults: TriggerResult[] = [
    ...triggerPageResults.map((p) => ({ id: p.id, label: p.title || "Untitled" })),
    ...triggerAnchorResults.map((t) => ({ id: t.id, label: t.label })),
  ];

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

  function applyColor(color: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end } = cursorRef.current;
    const selected = block.value.slice(start, end);
    const wrapped = `{${selected || "text"}|${color}}`;
    onBlockChange(block.id, block.value.slice(0, start) + wrapped + block.value.slice(end));
    setColorPickerOpen(false);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + 1, start + 1 + (selected || "text").length);
    }, 0);
  }

  function wrapSelection(prefix: string, suffix: string) {
    const ta = textareaRef.current;
    if (!ta) return;
    const { start, end } = cursorRef.current;
    const selected = block.value.slice(start, end);
    const wrapped = prefix + (selected || "text") + suffix;
    onBlockChange(block.id, block.value.slice(0, start) + wrapped + block.value.slice(end));
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length + (selected || "text").length);
    }, 0);
  }

  function indentCurrentLine(indent: boolean, fromPos?: number) {
    const ta = textareaRef.current;
    if (!ta) return;
    const val = block.value;
    const pos = fromPos ?? cursorRef.current.start;
    const lineStart = val.lastIndexOf("\n", pos - 1) + 1;
    let newVal: string;
    let newPos: number;
    if (indent) {
      if (val[lineStart] === "\t") return;
      newVal = val.slice(0, lineStart) + "\t" + val.slice(lineStart);
      newPos = pos + 1;
    } else {
      if (val[lineStart] !== "\t") return;
      newVal = val.slice(0, lineStart) + val.slice(lineStart + 1);
      newPos = Math.max(lineStart, pos - 1);
    }
    onBlockChange(block.id, newVal);
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(newPos, newPos);
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
    if (event.key === "Tab" && !trigger.active && (effectiveFormat === "bullets" || effectiveFormat === "steps")) {
      event.preventDefault();
      indentCurrentLine(!event.shiftKey, event.currentTarget.selectionStart);
      return;
    }
    if (!trigger.active || triggerResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setTrigger((t) => ({ ...t, index: Math.min(t.index + 1, triggerResults.length - 1) }));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setTrigger((t) => ({ ...t, index: Math.max(t.index - 1, 0) }));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const item = triggerResults[trigger.index];
      if (item) commitTrigger(item.id, item.label);
    } else if (event.key === "Escape") {
      closeTrigger();
    }
  }

  const label = `${TYPE_LABELS[block.type]} ${index + 1}`;
  const isFormatBlock = FORMAT_SUPPORTED.includes(block.type);
  const effectiveFormat = getEffectiveFormat(block);
  const isProse = effectiveFormat === "prose";
  const showInlineTools = isFormatBlock && isProse;

  const verticalAlignClass = VERTICAL_ALIGN_SUPPORTED.includes(block.type)
    ? (block.verticalAlign === "middle" ? "self-center" : block.verticalAlign === "bottom" ? "self-end" : "self-start")
    : "";

  return (
    <div className={`rounded-2xl border border-neutral-200 bg-white p-4 ${verticalAlignClass}`}>
      {/* Row 1: label + move + remove */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="text-sm font-semibold text-neutral-800">{label}</div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onMoveBlockUp(block.id)}
            disabled={isFirst}
            aria-label={`Move ${label} up`}
            className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
          >
            <span aria-hidden="true">↑</span>
          </button>
          <button
            type="button"
            onClick={() => onMoveBlockDown(block.id)}
            disabled={isLast}
            aria-label={`Move ${label} down`}
            className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-30"
          >
            <span aria-hidden="true">↓</span>
          </button>
          <button
            type="button"
            onClick={() => onRemoveBlock(block.id)}
            aria-label={`Remove ${label}`}
            className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-medium text-neutral-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          >
            Remove
          </button>
        </div>
      </div>

      {/* Row 2: controls (only when applicable) */}
      {(isFormatBlock || TEXT_ALIGN_SUPPORTED.includes(block.type) || VERTICAL_ALIGN_SUPPORTED.includes(block.type) || HALF_WIDTH_SUPPORTED.includes(block.type)) ? (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {/* Format toolbar */}
          {isFormatBlock ? (
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
              {FORMAT_OPTIONS.map((opt) => {
                const isActive = effectiveFormat === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => onBlockFormatChange(block.id, opt.value)}
                    aria-pressed={isActive}
                    title={opt.title}
                    className={`rounded px-2 py-1 text-[10px] font-semibold leading-none transition-all ${
                      isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Indent / dedent — only for list formats */}
          {(effectiveFormat === "bullets" || effectiveFormat === "steps") ? (
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
              <button
                type="button"
                onClick={() => indentCurrentLine(false)}
                title="Decrease indent"
                className="rounded px-2 py-1 text-[10px] font-semibold leading-none text-neutral-400 hover:text-neutral-600"
              >
                ←
              </button>
              <button
                type="button"
                onClick={() => indentCurrentLine(true)}
                title="Increase indent"
                className="rounded px-2 py-1 text-[10px] font-semibold leading-none text-neutral-400 hover:text-neutral-600"
              >
                →
              </button>
            </div>
          ) : null}

          {/* Inline formatting: B / I — only in prose mode */}
          {showInlineTools ? (
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
              <button
                type="button"
                onClick={() => wrapSelection("**", "**")}
                title="Bold"
                className="rounded px-2 py-1 text-[10px] font-bold leading-none text-neutral-500 transition hover:bg-white hover:text-neutral-900 hover:shadow-sm"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => wrapSelection("*", "*")}
                title="Italic"
                className="rounded px-2 py-1 text-[10px] italic font-semibold leading-none text-neutral-500 transition hover:bg-white hover:text-neutral-900 hover:shadow-sm"
              >
                I
              </button>
            </div>
          ) : null}

          {/* Color picker — prose mode only */}
          {showInlineTools ? (
            <>
              <button
                ref={colorBtnRef}
                type="button"
                onClick={colorPickerOpen ? () => setColorPickerOpen(false) : openColorPicker}
                aria-label="Apply text color"
                title="Text color"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-500 transition hover:bg-white hover:text-neutral-900 hover:shadow-sm"
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <text x="1" y="11" fontSize="11" fontWeight="bold" fill="currentColor" fontFamily="sans-serif">A</text>
                  <rect x="1" y="12" width="12" height="2" rx="1" fill={customColor}/>
                </svg>
              </button>
              {colorPickerOpen && colorPickerPos ? createPortal(
                <div
                  className="w-52 rounded-xl border border-neutral-200 bg-white p-3 shadow-lg"
                  style={{ position: "fixed", top: colorPickerPos.top, right: colorPickerPos.right, zIndex: 9999 }}
                >
                  <div className="mb-2 text-[11px] font-semibold text-neutral-500">Text color</div>
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyColor("accent")}
                      title="Accent color"
                      className="h-6 w-6 rounded-full border-2 border-white shadow ring-1 ring-neutral-200 hover:scale-110 transition-transform"
                      style={{ background: "linear-gradient(135deg, #6366f1, #ec4899)" }}
                    />
                    {["#ef4444","#f97316","#eab308","#22c55e","#06b6d4","#3b82f6","#8b5cf6","#ec4899","#ffffff","#171717"].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => { setCustomColor(c); applyColor(c); }}
                        title={c}
                        className="h-6 w-6 rounded-full border-2 border-white shadow ring-1 ring-neutral-200 hover:scale-110 transition-transform"
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="h-7 w-7 cursor-pointer rounded border border-neutral-200 p-0.5"
                      aria-label="Custom color"
                    />
                    <input
                      type="text"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="flex-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-mono outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10"
                      placeholder="#hexcolor"
                      maxLength={7}
                    />
                    <button
                      type="button"
                      onClick={() => applyColor(customColor)}
                      className="rounded-full bg-[#3B82F6] px-2 py-1 text-xs font-medium text-white hover:bg-[#2563EB]"
                    >
                      Apply
                    </button>
                  </div>
                </div>,
                document.body
              ) : null}
            </>
          ) : null}

          {/* Link picker button — prose mode only */}
          {showInlineTools ? (
            <>
              <button
                ref={linkBtnRef}
                type="button"
                onClick={linkPickerOpen ? () => setLinkPickerOpen(false) : openLinkPicker}
                aria-label="Insert content link"
                title="Link to page"
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-neutral-200 bg-neutral-100 text-neutral-500 transition hover:bg-white hover:text-neutral-900 hover:shadow-sm"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M5.5 8.5l3-3M6 4H4a2 2 0 000 4h1M8 10h1a2 2 0 000-4H8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                </svg>
              </button>
              {linkPickerOpen && linkPickerPos ? createPortal(
                <div
                  className="w-56 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
                  style={{ position: "fixed", top: linkPickerPos.top, right: linkPickerPos.right, zIndex: 9999 }}
                >
                  <div className="border-b border-neutral-100 px-3 py-2 text-[11px] font-semibold text-neutral-500">
                    Link to page
                  </div>
                  <PageLinkPicker pages={linkablePages} anchorTargets={anchorTargets} currentPageId={selectedPageId} onSelect={insertLink} />
                </div>,
                document.body
              ) : null}
            </>
          ) : null}

          {/* Spacer to push alignment controls right */}
          <div className="flex-1" />

          {/* Horizontal text alignment */}
          {TEXT_ALIGN_SUPPORTED.includes(block.type) ? (
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
              {(["left", "center", "right"] as const).map((align) => {
                const isActive = (block.textAlign ?? "left") === align;
                return (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onBlockTextAlignChange(block.id, align)}
                    aria-pressed={isActive}
                    title={`Align ${align}`}
                    className={`rounded p-1 transition-all ${
                      isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {align === "left" ? (
                      <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
                        <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor"/>
                        <rect x="0" y="5" width="10" height="2" rx="1" fill="currentColor"/>
                        <rect x="0" y="10" width="12" height="2" rx="1" fill="currentColor"/>
                      </svg>
                    ) : align === "center" ? (
                      <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
                        <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor"/>
                        <rect x="2" y="5" width="10" height="2" rx="1" fill="currentColor"/>
                        <rect x="1" y="10" width="12" height="2" rx="1" fill="currentColor"/>
                      </svg>
                    ) : (
                      <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
                        <rect x="0" y="0" width="14" height="2" rx="1" fill="currentColor"/>
                        <rect x="4" y="5" width="10" height="2" rx="1" fill="currentColor"/>
                        <rect x="2" y="10" width="12" height="2" rx="1" fill="currentColor"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Vertical alignment */}
          {VERTICAL_ALIGN_SUPPORTED.includes(block.type) ? (
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
              {(["top", "middle", "bottom"] as const).map((v) => {
                const isActive = (block.verticalAlign ?? "top") === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => onBlockVerticalAlignChange(block.id, v)}
                    aria-pressed={isActive}
                    title={`Align ${v}`}
                    className={`rounded p-1 transition-all ${
                      isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {v === "top" ? (
                      <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                        <rect x="0" y="0" width="12" height="2" rx="1" fill="currentColor"/>
                        <rect x="3" y="4" width="6" height="8" rx="1" fill="currentColor" opacity="0.4"/>
                      </svg>
                    ) : v === "middle" ? (
                      <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                        <rect x="0" y="6" width="12" height="2" rx="1" fill="currentColor"/>
                        <rect x="3" y="3" width="6" height="8" rx="1" fill="currentColor" opacity="0.4"/>
                      </svg>
                    ) : (
                      <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
                        <rect x="0" y="12" width="12" height="2" rx="1" fill="currentColor"/>
                        <rect x="3" y="2" width="6" height="8" rx="1" fill="currentColor" opacity="0.4"/>
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          ) : null}

          {/* Block width */}
          {HALF_WIDTH_SUPPORTED.includes(block.type) ? (
            <div className="flex items-center rounded-lg border border-neutral-200 bg-neutral-100 p-0.5">
              {(["full", "half"] as const).map((w) => {
                const isActive = (block.blockWidth ?? "full") === w;
                return (
                  <button
                    key={w}
                    type="button"
                    onClick={() => onBlockWidthChange(block.id, w)}
                    aria-pressed={isActive}
                    title={w === "full" ? "Full width" : "Half width"}
                    className={`rounded px-1.5 py-1 text-[10px] font-semibold leading-none transition-all ${
                      isActive ? "bg-white text-neutral-900 shadow-sm" : "text-neutral-400 hover:text-neutral-600"
                    }`}
                  >
                    {w === "full" ? "Full" : "½"}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Content editor */}
      {isFormatBlock ? (
        <div>
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
            placeholder={getTextareaPlaceholder(effectiveFormat)}
            aria-label={label}
            rows={effectiveFormat === "h2" || effectiveFormat === "h3" ? 2 : 5}
            className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-3 text-sm leading-6 outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
          />
          {trigger.active && triggerPos ? createPortal(
            <div
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
              style={{ position: "fixed", top: triggerPos.top, right: triggerPos.right, minWidth: 220, zIndex: 9999 }}
            >
              <div className="border-b border-neutral-100 px-3 py-1.5 text-[11px] font-semibold text-neutral-400">
                Link to page or heading{trigger.query ? `: "${trigger.query}"` : ""}
              </div>
              {triggerResults.length > 0 ? (
                <PageLinkPicker
                  pages={triggerPageResults}
                  anchorTargets={triggerAnchorResults}
                  currentPageId={selectedPageId}
                  activeIndex={trigger.index}
                  onMouseDownSelect={commitTrigger}
                />
              ) : (
                <div className="px-3 py-3 text-xs text-neutral-400">
                  No matches found.
                </div>
              )}
            </div>,
            document.body
          ) : null}
        </div>
      ) : block.type === "callout" ? (
        <CalloutBlockEditor
          block={block}
          label={label}
          onBlockVariantChange={onBlockVariantChange}
          onBlockChange={onBlockChange}
        />
      ) : block.type === "image" ? (
        <ImageBlockEditor
          block={block}
          onBlockChange={onBlockChange}
          onBlockFitChange={onBlockFitChange}
          onBlockImagePositionChange={onBlockImagePositionChange}
          onBlockPropsChange={onBlockPropsChange}
          onBlockImageUpload={onBlockImageUpload}
        />
      ) : block.type === "consent" ? (
        <ConsentBlockEditor block={block} onBlockChange={onBlockChange} />
      ) : block.type === "tabs" ? (
        <TabsBlockEditor
          block={block}
          pages={pages}
          selectedPageId={selectedPageId}
          onBlockChange={onBlockChange}
        />
      ) : block.type === "section" ? (
        <SectionBlockEditor block={block} onBlockChange={onBlockChange} />
      ) : block.type === "step-rail" ? (
        <StepRailBlockEditor
          block={block}
          pages={pages}
          selectedPageId={selectedPageId}
          onBlockChange={onBlockChange}
          onReplaceBlocks={onReplaceBlocks}
        />
      ) : block.type === "carousel" ? (
        <CarouselBlockEditor
          block={block}
          pages={pages}
          selectedPageId={selectedPageId}
          onBlockChange={onBlockChange}
        />
      ) : (
        <input
          type="text"
          value={block.value}
          onChange={(event) => onBlockChange(block.id, event.target.value)}
          placeholder="Paste video URL or file URL"
          aria-label="Video URL"
          className="w-full rounded-lg border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
        />
      )}
    </div>
  );
}

// ── SectionBlockEditor ─────────────────────────────────────────

function SectionBlockEditor({
  block,
  onBlockChange,
}: {
  block: ContentBlock;
  onBlockChange: (blockId: string, value: string) => void;
}) {
  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Section label</div>
      <input
        type="text"
        value={block.value}
        onChange={(e) => onBlockChange(block.id, e.target.value)}
        placeholder="e.g. Overview, Setup, Victory Conditions"
        className="w-full rounded-lg border border-neutral-200 px-3 py-3 text-sm outline-none transition focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 placeholder:text-neutral-400 disabled:bg-neutral-50 disabled:text-neutral-400 disabled:cursor-not-allowed"
      />
      <div className="mt-1.5 text-xs text-neutral-400">
        This label appears as a divider in your content. The Step Rail links to this section by name.
      </div>
    </div>
  );
}

