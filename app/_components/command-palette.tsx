"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CanvasFeatureType, ContentBlockType, LayoutMode, PageItem } from "@/app/_lib/authoring-types";

export type ExtEntry = {
  id: string;
  label: string;
  group: string;
  hint?: string;
  alwaysShow?: boolean;
  onRun: () => void;
};

type PaletteEntry =
  | { kind: "page"; id: string; label: string; group: string; pageId: string }
  | { kind: "feature"; id: string; label: string; group: string; featureType: CanvasFeatureType }
  | { kind: "block"; id: string; label: string; group: string; blockType: ContentBlockType }
  | { kind: "layout"; id: string; label: string; group: string; mode: LayoutMode; hint: string }
  | { kind: "action"; id: string; label: string; group: string; action: "new-page" | "toggle-preview" | "toggle-focus"; hint?: string }
  | { kind: "ext" } & ExtEntry;

const BLOCK_ACTIONS: { type: ContentBlockType; label: string }[] = [
  { type: "text", label: "Add text" },
  { type: "image", label: "Add image block" },
  { type: "video", label: "Add video" },
  { type: "steps", label: "Add numbered steps" },
  { type: "callout", label: "Add callout" },
  { type: "tabs", label: "Add tabs" },
  { type: "carousel", label: "Add carousel" },
  { type: "step-rail", label: "Add step rail" },
  { type: "section", label: "Add section divider" },
  { type: "consent", label: "Add consent form" },
];

const FEATURE_ACTIONS: { type: CanvasFeatureType; label: string }[] = [
  { type: "qr", label: "Add QR Code" },
  { type: "image", label: "Add Image" },
  { type: "heading", label: "Add Heading" },
  { type: "button", label: "Add Button" },
  { type: "disclaimer", label: "Add Disclaimer" },
  { type: "dropdown", label: "Add Dropdown" },
  { type: "search", label: "Add Search" },
  { type: "page-button", label: "Add Card Button" },
  { type: "locale", label: "Add Locale Switcher" },
];

interface CommandPaletteProps {
  pages: PageItem[];
  /** When "content", content-block actions are surfaced first and canvas/layout actions are hidden until the user types */
  context?: "content" | null;
  extraEntries?: ExtEntry[];
  onSelectPage: (id: string) => void;
  onAddCanvasFeature: (type: CanvasFeatureType) => void;
  onAddBlock?: (type: ContentBlockType) => void;
  onCreatePage: () => void;
  onSetLayoutMode: (mode: LayoutMode) => void;
  onTogglePreview: () => void;
  onToggleFocus: () => void;
  onClose: () => void;
}

function HighlightedLabel({ label, query }: { label: string; query: string }) {
  if (!query.trim()) return <span>{label}</span>;
  const idx = label.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return <span>{label}</span>;
  return (
    <span>
      {label.slice(0, idx)}
      <strong className="font-semibold">{label.slice(idx, idx + query.trim().length)}</strong>
      {label.slice(idx + query.trim().length)}
    </span>
  );
}

export function CommandPalette({
  pages,
  context,
  extraEntries,
  onSelectPage,
  onAddCanvasFeature,
  onAddBlock,
  onCreatePage,
  onSetLayoutMode,
  onTogglePreview,
  onToggleFocus,
  onClose,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filteredItems = useMemo<PaletteEntry[]>(() => {
    const pageEntries: PaletteEntry[] = pages.map((p) => ({
      kind: "page" as const,
      id: `page-${p.id}`,
      label: p.kind === "home" ? "Home" : p.title || "Untitled",
      group: p.kind === "hotspot" ? "Hotspots" : "Cards",
      pageId: p.id,
    }));
    const blockEntries: PaletteEntry[] = BLOCK_ACTIONS.map((a) => ({
      kind: "block" as const,
      id: `block-${a.type}`,
      label: a.label,
      group: "Add to content",
      blockType: a.type,
    }));
    const canvasEntries: PaletteEntry[] = FEATURE_ACTIONS.map((a) => ({
      kind: "feature" as const,
      id: `feature-${a.type}`,
      label: a.label,
      group: "Add to board",
      featureType: a.type,
    }));
    const layoutEntries: PaletteEntry[] = [
      { kind: "layout", id: "layout-desktop", label: "Desktop view", group: "Layout", mode: "desktop" as LayoutMode, hint: "1" },
      { kind: "layout", id: "layout-landscape", label: "Landscape view", group: "Layout", mode: "mobile-landscape" as LayoutMode, hint: "2" },
      { kind: "layout", id: "layout-portrait", label: "Portrait view", group: "Layout", mode: "mobile-portrait" as LayoutMode, hint: "3" },
    ];
    const actionEntries: PaletteEntry[] = [
      { kind: "action", id: "new-page", label: "New card", group: "Actions", action: "new-page" },
      { kind: "action", id: "toggle-preview", label: "Toggle preview", group: "Actions", action: "toggle-preview", hint: "P" },
      { kind: "action", id: "toggle-focus", label: "Toggle focus mode", group: "Actions", action: "toggle-focus", hint: "F" },
    ];
    const extPaletteEntries: PaletteEntry[] = (extraEntries ?? []).map((e) => ({ kind: "ext" as const, ...e }));
    const extAlways = extPaletteEntries.filter((e) => e.kind === "ext" && (e as ExtEntry & { kind: "ext" }).alwaysShow);

    if (context === "content") {
      if (!query.trim()) {
        return [...blockEntries, ...pageEntries, ...actionEntries, ...extAlways];
      }
      const q = query.toLowerCase();
      const all: PaletteEntry[] = [...blockEntries, ...pageEntries, ...actionEntries, ...canvasEntries, ...layoutEntries, ...extPaletteEntries];
      return all.filter((item) => item.label.toLowerCase().includes(q));
    }

    // Default context
    if (!query.trim()) {
      return [...pageEntries, ...canvasEntries, ...layoutEntries, ...actionEntries, ...extAlways];
    }
    const q = query.toLowerCase();
    const all: PaletteEntry[] = [...pageEntries, ...canvasEntries, ...layoutEntries, ...actionEntries, ...extPaletteEntries];
    return all.filter((item) => item.label.toLowerCase().includes(q));
  }, [pages, query, context, extraEntries]);

  useEffect(() => { setActiveIndex(0); }, [query]);

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function handleSelect(entry: PaletteEntry) {
    switch (entry.kind) {
      case "page": onSelectPage(entry.pageId); break;
      case "feature": onAddCanvasFeature(entry.featureType); break;
      case "block": onAddBlock?.(entry.blockType); break;
      case "layout": onSetLayoutMode(entry.mode); break;
      case "ext": entry.onRun(); break;
      case "action":
        if (entry.action === "new-page") onCreatePage();
        else if (entry.action === "toggle-preview") onTogglePreview();
        else if (entry.action === "toggle-focus") onToggleFocus();
        break;
    }
    onClose();
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const item = filteredItems[activeIndex];
      if (item) handleSelect(item);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, PaletteEntry[]>();
    for (const item of filteredItems) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return map;
  }, [filteredItems]);

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center bg-black/40 pt-[18vh]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl">
        <div className="flex items-center gap-2 border-b border-neutral-100 px-4 py-3">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true" className="shrink-0 text-neutral-400">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4" />
            <path d="M9.5 9.5L12.5 12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search cards and actions..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-w-0 flex-1 bg-transparent text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="shrink-0 text-xs text-neutral-400 hover:text-neutral-600"
            >
              Clear
            </button>
          )}
        </div>

        <div className="max-h-[360px] overflow-y-auto py-2">
          {filteredItems.length === 0 && (
            <div className="px-4 py-6 text-center text-sm text-neutral-400">No results</div>
          )}
          {Array.from(groups.entries()).map(([group, groupItems]) => (
            <div key={group}>
              <div className="px-4 pb-1 pt-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-neutral-400">
                {group}
              </div>
              {groupItems.map((item) => {
                const flatIdx = filteredItems.indexOf(item);
                const isActive = flatIdx === activeIndex;
                const hint = (item.kind === "layout" || item.kind === "action" || item.kind === "ext") && item.hint ? item.hint : null;
                return (
                  <button
                    key={item.id}
                    ref={(el) => { itemRefs.current[flatIdx] = el; }}
                    type="button"
                    className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition-colors ${
                      isActive ? "bg-neutral-100 text-neutral-900" : "text-neutral-700 hover:bg-neutral-50"
                    }`}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(flatIdx)}
                  >
                    <HighlightedLabel label={item.label} query={query} />
                    {hint && (
                      <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-500">
                        {hint}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 border-t border-neutral-100 px-4 py-2 text-[11px] text-neutral-400">
          <span>↑↓ navigate</span>
          <span>↵ select</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
