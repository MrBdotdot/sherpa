"use client";

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CanvasFeature, PageItem } from "@/app/_lib/authoring-types";
import { searchPages } from "@/app/_lib/search-index";
import { dispatchSectionHighlight } from "@/app/_lib/section-highlight";

function HighlightedSnippet({ text, query, className }: { text: string; query: string; className?: string }) {
  const q = query.trim().toLowerCase();
  if (!q) return <span className={className}>{text}</span>;
  const idx = text.toLowerCase().indexOf(q);
  if (idx === -1) return <span className={className}>{text}</span>;
  return (
    <span className={className}>
      {text.slice(0, idx)}
      <strong className="font-semibold">{text.slice(idx, idx + q.length)}</strong>
      {text.slice(idx + q.length)}
    </span>
  );
}

type DropPos = { top?: number; bottom?: number; left: number; width: number };

export function SearchFeatureCard({
  feature,
  pages = [],
  fontThemeClass = "font-sans",
  onNavigate,
  onSearch,
  surfaceStyleClass,
}: {
  feature: CanvasFeature;
  pages: PageItem[];
  fontThemeClass?: string;
  onNavigate?: (id: string) => void;
  onSearch?: (query: string) => void;
  surfaceStyleClass: string;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState<DropPos | null>(null);
  const [mobileConfig, setMobileConfig] = useState<{
    openUpward: boolean;
    width: number;
    left?: number;
    right?: number;
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useLayoutEffect(() => {
    if (!open || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const dropdownH = 280;
    const gap = 6;

    const mobileCanvas = containerRef.current.closest("[data-mobile-canvas]") as HTMLElement | null;
    if (mobileCanvas) {
      const canvasRect = mobileCanvas.getBoundingClientRect();
      const dropWidth = Math.max(rect.width, 260);
      const openUpward = canvasRect.bottom - rect.bottom < Math.min(dropdownH, 200);

      // Prefer aligning to the left edge of the search bar.
      // If the dropdown would overflow the right edge of the canvas, right-align it instead.
      const spaceRight = canvasRect.right - rect.left;
      const spaceLeft = rect.right - canvasRect.left;
      const alignRight = spaceRight < dropWidth && spaceLeft >= dropWidth;

      setMobileConfig({
        openUpward,
        width: dropWidth,
        left: alignRight ? undefined : 0,
        right: alignRight ? 0 : undefined,
      });
      setDropPos(null);
      return;
    }

    setMobileConfig(null);
    const spaceBelow = window.innerHeight - rect.bottom;
    const pos: DropPos = {
      left: rect.left,
      width: Math.max(rect.width, 300),
    };
    if (spaceBelow < dropdownH && rect.top > spaceBelow) {
      pos.bottom = window.innerHeight - rect.top + gap;
    } else {
      pos.top = rect.bottom + gap;
    }
    setDropPos(pos);
  }, [open]);

  const results = useMemo(() => searchPages(pages, query), [pages, query]);
  const isContrast = surfaceStyleClass.includes("text-white");
  const textClass = isContrast ? "text-white" : "text-neutral-800";
  const placeholderClass = isContrast ? "placeholder:text-white/50" : "placeholder:text-neutral-500";
  const dimClass = isContrast ? "text-white/40" : "text-neutral-500";
  const snippetClass = isContrast ? "text-white/80" : "text-neutral-700";
  const hoverClass = isContrast ? "hover:bg-white/10" : "hover:bg-neutral-50";
  const dividerClass = isContrast ? "border-t border-white/10" : "border-t border-neutral-100";

  function navigate(pageId: string, sectionId?: string) {
    if (query.trim()) onSearch?.(query.trim());
    onNavigate?.(pageId);
    if (sectionId) {
      setTimeout(() => {
        document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
        dispatchSectionHighlight(sectionId);
      }, 400);
    }
    setQuery("");
    setOpen(false);
  }

  function handleBlur() {
    closeTimerRef.current = setTimeout(() => setOpen(false), 150);
  }

  function cancelClose() {
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
  }

  const mobileDropdownStyle: React.CSSProperties | null = mobileConfig ? {
    position: "absolute",
    zIndex: 50,
    left: mobileConfig.left,
    right: mobileConfig.right,
    width: mobileConfig.width,
    maxHeight: 280,
    overflowY: "auto",
    ...(mobileConfig.openUpward ? { bottom: "calc(100% + 6px)" } : { top: "calc(100% + 6px)" }),
  } : null;

  const dropdown = open && (mobileConfig || dropPos) ? (
    <div
      style={mobileDropdownStyle ?? {
        position: "fixed",
        zIndex: 9999,
        top: dropPos!.top,
        bottom: dropPos!.bottom,
        left: dropPos!.left,
        width: dropPos!.width,
        maxHeight: 320,
        overflowY: "auto",
      }}
      className={`rounded-xl border shadow-2xl ${surfaceStyleClass} ${fontThemeClass}`}
      onPointerDown={cancelClose}
    >
      {!query.trim() || results.length === 0 ? (
        <div className={`px-4 py-3 text-xs ${dimClass}`}>
          {!query.trim() ? "Start typing to search…" : "No results"}
        </div>
      ) : (
        results.map((result, i) => (
          <button
            key={i}
            type="button"
            onClick={(e) => { e.stopPropagation(); navigate(result.pageId, result.sectionId); }}
            className={`w-full px-3 py-2.5 text-left transition ${hoverClass} ${i > 0 ? dividerClass : ""}`}
          >
            <div className={`mb-0.5 flex flex-wrap items-center gap-x-1 text-[10px] leading-4 ${dimClass}`}>
              {result.breadcrumb.map((crumb, ci) => (
                <React.Fragment key={ci}>
                  {ci > 0 && <span aria-hidden="true">/</span>}
                  <span className="transition hover:underline hover:opacity-70">
                    {crumb.label}
                  </span>
                </React.Fragment>
              ))}
            </div>
            <HighlightedSnippet
              text={result.matchSnippet}
              query={query}
              className={`line-clamp-2 text-xs leading-[1.4] ${snippetClass}`}
            />
          </button>
        ))
      )}
    </div>
  ) : null;

  return (
    <div ref={containerRef} className={`relative w-[220px] ${fontThemeClass}`} onClick={(e) => e.stopPropagation()}>
      {/* Search bar */}
      <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 ${surfaceStyleClass}`}>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="shrink-0 opacity-50">
          <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.3" />
          <path d="M8 8L11 11" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
          onPointerDown={(e) => e.stopPropagation()}
          placeholder={feature.label || "Search rules…"}
          className={`min-w-0 flex-1 bg-transparent text-xs outline-none ${textClass} ${placeholderClass}`}
        />
        {query ? (
          <button
            type="button"
            onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); cancelClose(); }}
            onClick={(e) => { e.stopPropagation(); setQuery(""); setOpen(false); }}
            aria-label="Clear search"
            className={`shrink-0 opacity-50 transition hover:opacity-100 ${textClass}`}
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
              <path d="M2 2l6 6M8 2L2 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        ) : null}
      </div>

      {/* Results dropdown — inline in mobile (clipped by phone frame), portaled in desktop */}
      {mobileConfig
        ? dropdown
        : typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}
    </div>
  );
}
