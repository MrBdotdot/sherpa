"use client";

import React, { useEffect, useRef, useState } from "react";
import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";
import { PreviewBlocks } from "@/app/_components/canvas/preview-blocks";

// ── Types ──────────────────────────────────────────────────────

type CarouselPreviewSlide = { id: string; label: string; blocks: ContentBlock[] };

function parseCarouselPreview(value: string): CarouselPreviewSlide[] {
  try {
    const d = JSON.parse(value);
    return (d.slides ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      label: (s.label as string) ?? "",
      blocks: Array.isArray(s.blocks) ? (s.blocks as ContentBlock[]) : [],
    }));
  } catch {
    return [];
  }
}

// ── CarouselBlock ──────────────────────────────────────────────

export function CarouselBlock({
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
  const slides = parseCarouselPreview(block.value);
  const [current, setCurrent] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const idx = Math.min(current, Math.max(0, slides.length - 1));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") setCurrent((c) => Math.max(0, c - 1));
      if (e.key === "ArrowRight") setCurrent((c) => Math.min(slides.length - 1, c + 1));
    }
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  }, [slides.length]);

  if (slides.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
        Empty carousel block
      </div>
    );
  }

  const activeSlide = slides[idx];

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="rounded-xl border border-neutral-200 overflow-hidden outline-none"
      onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchStart === null) return;
        const diff = touchStart - e.changedTouches[0].clientX;
        if (Math.abs(diff) > 40) {
          if (diff > 0) setCurrent((c) => Math.min(slides.length - 1, c + 1));
          else setCurrent((c) => Math.max(0, c - 1));
        }
        setTouchStart(null);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-100 px-3 py-2">
        <span className="text-sm font-semibold text-neutral-800">{activeSlide.label || `Slide ${idx + 1}`}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={idx === 0}
            className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 disabled:opacity-30"
            aria-label="Previous slide"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <span className="min-w-[32px] text-center text-[10px] text-neutral-400">{idx + 1}/{slides.length}</span>
          <button
            type="button"
            onClick={() => setCurrent((c) => Math.min(slides.length - 1, c + 1))}
            disabled={idx === slides.length - 1}
            className="rounded-lg p-1 text-neutral-400 transition hover:bg-neutral-100 disabled:opacity-30"
            aria-label="Next slide"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Slide content — all slides rendered in the same grid cell so the
          container height is always the tallest slide's height, preventing
          layout shifts when navigating between slides. */}
      <div className="p-3">
        <div className="grid">
          {slides.map((slide, i) => (
            <div
              key={slide.id}
              className="col-start-1 row-start-1"
              style={{ visibility: i === idx ? "visible" : "hidden" }}
              aria-hidden={i !== idx}
            >
              {slide.blocks.length > 0 ? (
                <PreviewBlocks
                  accentColor={accentColor}
                  onNavigate={onNavigate}
                  onDismissContent={onDismissContent}
                  page={{ ...page, blocks: slide.blocks, summary: "" }}
                  pages={pages}
                />
              ) : (
                <div className="text-sm text-neutral-400">Empty slide</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 pb-3">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 16 : 6,
                height: 6,
                backgroundColor: i === idx ? (accentColor || "#171717") : "#e5e7eb",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
