"use client";

import React, { ChangeEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ContentBlock, ContentBlockType, ImageFit, PageItem } from "@/app/_lib/authoring-types";
import { createBlock } from "@/app/_lib/authoring-utils";
import { PageLinkPicker } from "@/app/_components/editor/page-link-picker";

export const CONTENT_ELEMENT_TYPES = [
  { kind: "block" as const, type: "text" as ContentBlockType, label: "Text", description: "Paragraph, heading, list, or steps" },
  { kind: "block" as const, type: "callout" as ContentBlockType, label: "Callout", description: "Info, warning, or tip highlight" },
  { kind: "block" as const, type: "tabs" as ContentBlockType, label: "Tabs", description: "Toggle between named sections" },
  { kind: "block" as const, type: "progress-bar" as ContentBlockType, label: "Progress Bar", description: "Multi-step navigator with visual indicators" },
  { kind: "block" as const, type: "consent" as ContentBlockType, label: "Consent Form", description: "Playtester likeness release — collects name and signature" },
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
  consent: "Consent Form",
  tabs: "Tabs",
  "progress-bar": "Progress Bar",
};

type TriggerState = { active: boolean; start: number; query: string; index: number };
const TRIGGER_CLOSED: TriggerState = { active: false, start: 0, query: "", index: 0 };

// Types that support the formatting toolbar (prose/h2/h3/bullets/steps + bold/italic)
const FORMAT_SUPPORTED: ContentBlockType[] = ["text", "steps"];
const HALF_WIDTH_SUPPORTED: ContentBlockType[] = ["text", "steps", "callout", "image"];
const TEXT_ALIGN_SUPPORTED: ContentBlockType[] = ["text", "steps", "callout"];
const VERTICAL_ALIGN_SUPPORTED: ContentBlockType[] = ["text", "steps", "callout", "image"];

export type BlockFormat = ContentBlock["blockFormat"];

function FocalPointPicker({
  imageUrl,
  x,
  y,
  onChange,
}: {
  imageUrl: string;
  x: number;
  y: number;
  onChange: (x: number, y: number) => void;
}) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  function updateFromPointer(e: React.PointerEvent) {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const nx = Math.round(Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100)));
    const ny = Math.round(Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100)));
    onChange(nx, ny);
  }

  return (
    <div>
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">
        Focal point — drag to reposition
      </div>
      <div
        ref={containerRef}
        className="relative h-28 w-full cursor-crosshair overflow-hidden rounded-xl border border-neutral-300 select-none"
        style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: "cover", backgroundPosition: `${x}% ${y}%` }}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); updateFromPointer(e); }}
        onPointerMove={(e) => { if (e.buttons > 0) updateFromPointer(e); }}
      >
        {/* Crosshair dot */}
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md ring-1 ring-black/30"
          style={{ left: `${x}%`, top: `${y}%`, backgroundColor: "rgba(255,255,255,0.25)" }}
        />
        {/* Cross lines */}
        <div
          className="pointer-events-none absolute top-0 bottom-0 w-px bg-white/50"
          style={{ left: `${x}%` }}
        />
        <div
          className="pointer-events-none absolute left-0 right-0 h-px bg-white/50"
          style={{ top: `${y}%` }}
        />
      </div>
      <div className="mt-1 text-[10px] text-neutral-400">{x}% / {y}%</div>
    </div>
  );
}
type VerticalAlign = ContentBlock["verticalAlign"];

const FORMAT_OPTIONS: Array<{ value: BlockFormat; label: string; title: string }> = [
  { value: "prose", label: "¶", title: "Paragraph" },
  { value: "h2", label: "H2", title: "Heading 2" },
  { value: "h3", label: "H3", title: "Heading 3" },
  { value: "bullets", label: "•", title: "Bullet list" },
  { value: "steps", label: "1.", title: "Numbered list" },
];

function getEffectiveFormat(block: ContentBlock): BlockFormat {
  if (block.blockFormat) return block.blockFormat;
  if (block.type === "steps") return "steps";
  return "prose";
}

function getTextareaPlaceholder(format: BlockFormat): string {
  switch (format) {
    case "h2": return "Section heading";
    case "h3": return "Sub-heading";
    case "bullets": return "One item per line";
    case "steps": return "Set up the board\nDeal 5 cards to each player\nThe youngest player goes first";
    default: return "Enter text content — supports **bold**, *italic*, and more";
  }
}

export function BlockEditor({
  block,
  index,
  isFirst,
  isLast,
  pages,
  selectedPageId,
  onBlockChange,
  onBlockFitChange,
  onBlockImagePositionChange,
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
  selectedPageId?: string;
  onBlockChange: (blockId: string, value: string) => void;
  onBlockFitChange: (blockId: string, fit: ImageFit) => void;
  onBlockImagePositionChange: (blockId: string, x: number, y: number) => void;
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
  const [trigger, setTrigger] = useState<TriggerState>(TRIGGER_CLOSED);
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

  const consentConfig: Record<string, string | boolean> = block.type === "consent"
    ? (() => { try { return JSON.parse(block.value); } catch { return {}; } })()
    : {};
  function updateConsentField(field: string, value: string | boolean) {
    onBlockChange(block.id, JSON.stringify({ ...consentConfig, [field]: value }));
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
                      className="flex-1 rounded-lg border border-neutral-200 px-2 py-1 text-xs font-mono outline-none focus:border-neutral-400"
                      placeholder="#hexcolor"
                      maxLength={7}
                    />
                    <button
                      type="button"
                      onClick={() => applyColor(customColor)}
                      className="rounded-lg border border-neutral-900 bg-neutral-900 px-2 py-1 text-xs font-medium text-white hover:bg-neutral-700"
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
                  <PageLinkPicker pages={linkablePages} onSelect={insertLink} />
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
            className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm leading-6 outline-none transition focus:border-black"
          />
          {trigger.active && triggerPos ? createPortal(
            <div
              className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg"
              style={{ position: "fixed", top: triggerPos.top, right: triggerPos.right, minWidth: 220, zIndex: 9999 }}
            >
              <div className="border-b border-neutral-100 px-3 py-1.5 text-[11px] font-semibold text-neutral-400">
                Link to page{trigger.query ? ` — "${trigger.query}"` : ""}
              </div>
              {triggerResults.length > 0 ? (
                <PageLinkPicker pages={triggerResults} activeIndex={trigger.index} onMouseDownSelect={commitTrigger} />
              ) : (
                <div className="px-3 py-3 text-xs text-neutral-400">
                  No pages to link to — add a page first.
                </div>
              )}
            </div>,
            document.body
          ) : null}
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
          {/* Focal point picker — only relevant for fill/crop modes */}
          {block.value && (block.imageFit === "cover" || block.imageFit === "center" || !block.imageFit) ? (
            <FocalPointPicker
              imageUrl={block.value}
              x={block.imagePosition?.x ?? 50}
              y={block.imagePosition?.y ?? 50}
              onChange={(x, y) => onBlockImagePositionChange(block.id, x, y)}
            />
          ) : null}
        </div>
      ) : block.type === "consent" ? (
        <div className="space-y-4">
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Consent statement</div>
            <textarea
              value={(consentConfig.statement as string) ?? ""}
              onChange={(e) => updateConsentField("statement", e.target.value)}
              placeholder="I agree that [Your Company] may use photos, video, and audio recordings of my likeness for marketing and promotional purposes."
              rows={4}
              className="w-full resize-none rounded-xl border border-neutral-300 px-3 py-3 text-sm leading-6 outline-none transition focus:border-black"
            />
          </div>
          <div>
            <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Web3Forms access key</div>
            <input
              type="text"
              value={(consentConfig.endpoint as string) ?? ""}
              onChange={(e) => updateConsentField("endpoint", e.target.value)}
              placeholder="Paste your Web3Forms access key"
              className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none transition focus:border-black"
            />
            <div className="mt-1.5 text-xs text-neutral-400">
              Get a free access key at web3forms.com — submissions go to your registered email.
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={(consentConfig.requireEmail as boolean) ?? false}
              onChange={(e) => updateConsentField("requireEmail", e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300"
            />
            <span className="text-sm text-neutral-700">Ask for playtester&apos;s email address</span>
          </label>
        </div>
      ) : block.type === "tabs" ? (
        <TabsBlockEditor
          block={block}
          pages={pages}
          selectedPageId={selectedPageId}
          onBlockChange={onBlockChange}
        />
      ) : block.type === "progress-bar" ? (
        <ProgressBarBlockEditor
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
          className="w-full rounded-xl border border-neutral-300 px-3 py-3 text-sm outline-none transition focus:border-black"
        />
      )}
    </div>
  );
}

// ── TabsBlockEditor ────────────────────────────────────────────

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

function TabsBlockEditor({
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
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-neutral-400"
              />
              {sections.length > 1 ? (
                <button
                  type="button"
                  onClick={() => updateTabs(sections.filter((_, j) => j !== i))}
                  aria-label={`Remove tab ${i + 1}`}
                  className="shrink-0 rounded-lg border border-neutral-200 p-1.5 text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
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
                <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-3 text-xs text-neutral-400">
                  No blocks yet — add one below.
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
                        <div className="text-[11px] text-neutral-400">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddingToSection(null)}
                    className="w-full px-3 py-2 text-xs text-neutral-400 hover:text-neutral-600 transition"
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

// ── ProgressBarBlockEditor ─────────────────────────────────────

type PBStep = {
  id: string;
  label: string;
  color: string;
  iconShape: "circle" | "square" | "squircle" | "diamond" | "none";
  iconImageUrl: string;
  blocks: ContentBlock[];
};

type PBData = {
  orientation: "horizontal" | "vertical";
  steps: PBStep[];
};

function parsePB(value: string): PBData {
  try {
    const d = JSON.parse(value);
    return {
      orientation: (d.orientation as "horizontal" | "vertical") ?? "horizontal",
      steps: ((d.steps ?? []) as Record<string, unknown>[]).map((s) => ({
        id: (s.id as string) ?? `step-${Date.now()}`,
        label: (s.label as string) ?? "",
        color: (s.color as string) ?? "#3b82f6",
        iconShape: (s.iconShape as PBStep["iconShape"]) ?? "circle",
        iconImageUrl: (s.iconImageUrl as string) ?? "",
        blocks: Array.isArray(s.blocks) ? (s.blocks as ContentBlock[]) : [],
      })),
    };
  } catch {
    return { orientation: "horizontal", steps: [] };
  }
}

const ICON_SHAPES: Array<{ value: PBStep["iconShape"]; label: string }> = [
  { value: "circle", label: "Circle" },
  { value: "squircle", label: "Squircle" },
  { value: "square", label: "Square" },
  { value: "diamond", label: "Diamond" },
  { value: "none", label: "Dot" },
];

function ProgressBarBlockEditor({
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
  const [addingToStep, setAddingToStep] = useState<number | null>(null);
  const data = parsePB(block.value);

  function updatePB(newData: PBData) {
    onBlockChange(block.id, JSON.stringify(newData));
  }

  function updateStep(idx: number, patch: Partial<PBStep>) {
    updatePB({ ...data, steps: data.steps.map((s, i) => i === idx ? { ...s, ...patch } : s) });
  }

  function updateStepBlocks(idx: number, newBlocks: ContentBlock[]) {
    updateStep(idx, { blocks: newBlocks });
  }

  function makeStepHandlers(stepIdx: number, stepBlocks: ContentBlock[]) {
    const update = (blockId: string, updater: (b: ContentBlock) => ContentBlock) =>
      updateStepBlocks(stepIdx, stepBlocks.map((b) => b.id === blockId ? updater(b) : b));

    return {
      onBlockChange: (blockId: string, val: string) => update(blockId, (b) => ({ ...b, value: val })),
      onBlockFitChange: (blockId: string, fit: ImageFit) => update(blockId, (b) => ({ ...b, imageFit: fit })),
      onBlockImagePositionChange: (blockId: string, x: number, y: number) =>
        update(blockId, (b) => ({ ...b, imagePosition: { x, y } })),
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
        const i = stepBlocks.findIndex((b) => b.id === blockId);
        if (i <= 0) return;
        const next = [...stepBlocks];
        [next[i - 1], next[i]] = [next[i], next[i - 1]];
        updateStepBlocks(stepIdx, next);
      },
      onMoveBlockDown: (blockId: string) => {
        const i = stepBlocks.findIndex((b) => b.id === blockId);
        if (i < 0 || i >= stepBlocks.length - 1) return;
        const next = [...stepBlocks];
        [next[i], next[i + 1]] = [next[i + 1], next[i]];
        updateStepBlocks(stepIdx, next);
      },
      onRemoveBlock: (blockId: string) =>
        updateStepBlocks(stepIdx, stepBlocks.filter((b) => b.id !== blockId)),
    };
  }

  return (
    <div className="space-y-3">
      {/* Orientation toggle */}
      <div>
        <div className="mb-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-400">Layout</div>
        <div className="flex gap-2">
          {(["horizontal", "vertical"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => updatePB({ ...data, orientation: o })}
              aria-pressed={data.orientation === o}
              className={`flex-1 rounded-xl border py-2 text-xs font-medium capitalize transition ${
                data.orientation === o
                  ? "border-neutral-900 bg-neutral-900 text-white"
                  : "border-neutral-300 text-neutral-600 hover:bg-neutral-50"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      {/* Steps */}
      {data.steps.map((step, i) => {
        const handlers = makeStepHandlers(i, step.blocks);
        return (
          <div key={step.id} className="overflow-hidden rounded-xl border border-neutral-200">
            {/* Step header */}
            <div className="flex items-center gap-2 border-b border-neutral-100 bg-neutral-50 px-3 py-2">
              {/* Color swatch */}
              <input
                type="color"
                value={step.color}
                onChange={(e) => updateStep(i, { color: e.target.value })}
                aria-label={`Step ${i + 1} color`}
                className="h-7 w-7 shrink-0 cursor-pointer rounded-lg border border-neutral-300 p-0.5"
              />
              {/* Label */}
              <input
                type="text"
                value={step.label}
                onChange={(e) => updateStep(i, { label: e.target.value })}
                placeholder={`Step ${i + 1}`}
                className="flex-1 bg-transparent text-sm font-medium outline-none placeholder:text-neutral-400"
              />
              {/* Delete */}
              {data.steps.length > 1 ? (
                <button
                  type="button"
                  onClick={() => updatePB({ ...data, steps: data.steps.filter((_, j) => j !== i) })}
                  aria-label={`Remove step ${i + 1}`}
                  className="shrink-0 rounded-lg border border-neutral-200 p-1.5 text-neutral-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-500"
                >
                  <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M2 3.5h10M5.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4 3.5l.7 7.5a1 1 0 001 .9h2.6a1 1 0 001-.9L10 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                  </svg>
                </button>
              ) : null}
            </div>

            <div className="space-y-3 p-3">
              {/* Icon config */}
              <div className="space-y-2">
                <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-neutral-400">Icon shape</div>
                <div className="flex flex-wrap gap-1.5">
                  {ICON_SHAPES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => updateStep(i, { iconShape: s.value })}
                      aria-pressed={step.iconShape === s.value}
                      className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                        step.iconShape === s.value
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={step.iconImageUrl}
                  onChange={(e) => updateStep(i, { iconImageUrl: e.target.value })}
                  placeholder="Custom image URL (overrides shape)"
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs outline-none transition focus:border-black"
                />
              </div>

              {/* Content blocks */}
              {step.blocks.length > 0 ? (
                step.blocks.map((b, bi) => (
                  <BlockEditor
                    key={b.id}
                    block={b}
                    index={bi}
                    isFirst={bi === 0}
                    isLast={bi === step.blocks.length - 1}
                    pages={pages}
                    selectedPageId={selectedPageId}
                    {...handlers}
                  />
                ))
              ) : (
                <div className="rounded-xl border border-dashed border-neutral-200 px-3 py-3 text-xs text-neutral-400">
                  No content yet — add a block below.
                </div>
              )}

              {/* Add block */}
              {addingToStep === i ? (
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
                        updateStepBlocks(i, [...step.blocks, createBlock(item.type)]);
                        setAddingToStep(null);
                      }}
                      className="flex w-full items-start gap-3 border-b border-neutral-200 px-3 py-2.5 text-left last:border-0 hover:bg-white transition"
                    >
                      <div>
                        <div className="text-xs font-medium text-neutral-800">{item.label}</div>
                        <div className="text-[11px] text-neutral-400">{item.desc}</div>
                      </div>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAddingToStep(null)}
                    className="w-full px-3 py-2 text-xs text-neutral-400 hover:text-neutral-600 transition"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingToStep(i)}
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
          updatePB({
            ...data,
            steps: [...data.steps, {
              id: `step-${Date.now()}`,
              label: `Step ${data.steps.length + 1}`,
              color: "#6366f1",
              iconShape: "circle",
              iconImageUrl: "",
              blocks: [],
            }],
          })
        }
        className="w-full rounded-xl border border-dashed border-neutral-300 py-2.5 text-xs font-medium text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
      >
        + Add step
      </button>
    </div>
  );
}
