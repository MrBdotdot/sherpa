"use client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ContentBlock, PageItem } from "@/app/_lib/authoring-types";
import { ConsentFormBlock } from "@/app/_components/canvas/consent-form-block";
import { processInlineMarkup, resolveColor, InlineWithLinks } from "@/app/_components/canvas/inline-markup";
import { SectionBlock } from "@/app/_components/canvas/step-rail-block";
import { ImageBlock } from "@/app/_components/canvas/image-block";

// ── CarouselBlock ──────────────────────────────────────────────

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

function CarouselBlock({
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

      {/* Slide content */}
      <div className="p-3">
        {activeSlide.blocks.length > 0 ? (
          <PreviewBlocks
            accentColor={accentColor}
            onNavigate={onNavigate}
            onDismissContent={onDismissContent}
            page={{ ...page, blocks: activeSlide.blocks, summary: "" }}
            pages={pages}
          />
        ) : (
          <div className="text-sm text-neutral-400">Empty slide</div>
        )}
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

// ── TabsBlock ──────────────────────────────────────────────────
type TabPreviewSection = { id: string; label: string; blocks: ContentBlock[] };

function parseTabPreviewSections(value: string): TabPreviewSection[] {
  try {
    const data = JSON.parse(value);
    return (data.sections ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      label: (s.label as string) ?? "",
      // backward-compat: old format used content: string
      blocks: Array.isArray(s.blocks)
        ? (s.blocks as ContentBlock[])
        : (s.content ? [{ id: `${s.id as string}-b0`, type: "text" as ContentBlock["type"], value: s.content as string }] : []),
    }));
  } catch {
    return [];
  }
}

function TabsBlock({
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
  const sections = parseTabPreviewSections(block.value);
  const [activeIndex, setActiveIndex] = useState(0);
  const idx = Math.min(activeIndex, Math.max(0, sections.length - 1));
  const activeSection = sections[idx];

  if (sections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500">
        Empty tabs block
      </div>
    );
  }

  return (
    <div>
      {/* Tab bar — centered, scrollable in narrow containers */}
      <div className="mb-3 flex justify-center overflow-x-auto border-b border-neutral-200">
        {sections.map((section, i) => (
          <button
            key={section.id}
            type="button"
            onClick={() => setActiveIndex(i)}
            className={`-mb-px px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors border-b-2 ${
              i === idx ? "" : "border-transparent text-neutral-400 hover:text-neutral-600"
            }`}
            style={i === idx ? { borderColor: accentColor || "#171717", color: accentColor || "#171717" } : {}}
          >
            {section.label || `Tab ${i + 1}`}
          </button>
        ))}
      </div>
      {/* Active section blocks */}
      {activeSection ? (
        activeSection.blocks.length > 0 ? (
          <PreviewBlocks
            accentColor={accentColor}
            onNavigate={onNavigate}
            onDismissContent={onDismissContent}
            page={{ ...page, blocks: activeSection.blocks, summary: "" }}
            pages={pages}
          />
        ) : (
          <div className="text-sm text-neutral-400">Empty tab</div>
        )
      ) : null}
    </div>
  );
}

export function PreviewBlocks({
  accentColor,
  onNavigate,
  onDismissContent,
  page,
  pages,
  header,
}: {
  accentColor: string;
  onNavigate?: (pageId: string) => void;
  onDismissContent?: () => void;
  page: PageItem;
  pages?: PageItem[];
  header?: React.ReactNode;
}) {
  const hasAnyContent =
    page.summary.trim().length > 0 ||
    page.blocks.some(
      (block) =>
        block.type === "consent" ||
        block.type === "section" ||
        block.type === "step-rail" ||
        block.type === "carousel" ||
        block.value.trim().length > 0
    );

  if (!hasAnyContent) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-4 text-sm leading-6 text-neutral-500">
        No content yet. Add a summary or content blocks to make this page feel
        complete.
      </div>
    );
  }

  const dotColor = accentColor || "#171717";
  const canLink = !!(onNavigate && pages);

  const hasHalfBlock = page.blocks.some((b) => b.blockWidth === "half");

  function alignClass(block: { textAlign?: string }) {
    if (block.textAlign === "center") return "text-center";
    if (block.textAlign === "right") return "text-right";
    return "text-left";
  }

  function selfAlignClass(block: { verticalAlign?: string }) {
    if (block.verticalAlign === "middle") return "self-center";
    if (block.verticalAlign === "bottom") return "self-end";
    return "self-start";
  }

  function getEffectiveFormat(block: { type: string; blockFormat?: string }) {
    if (block.blockFormat) return block.blockFormat;
    if (block.type === "steps") return "steps";
    return "prose";
  }

  const blockList = (
    <div className={hasHalfBlock ? "grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 items-start" : "space-y-2"}>
      {page.blocks.map((block) => {
        const spanClass = hasHalfBlock && block.blockWidth !== "half" ? "col-span-2" : "";
        const selfAlign = hasHalfBlock ? selfAlignClass(block) : "";
        const blockClass = `${spanClass} ${selfAlign}`.trim();

        if (block.type === "text" || block.type === "steps") {
          const format = getEffectiveFormat(block);

          // Heading formats
          if (format === "h2") {
            return (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h2 className="text-base font-bold text-neutral-900 leading-tight">
                  {block.value || <span className="text-neutral-400 font-normal">Empty heading</span>}
                </h2>
              </div>
            );
          }
          if (format === "h3") {
            return (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h3 className="text-sm font-semibold text-neutral-800 leading-snug">
                  {block.value || <span className="text-neutral-400 font-normal">Empty heading</span>}
                </h3>
              </div>
            );
          }

          // Bullet list
          if (format === "bullets") {
            const items = block.value.split("\n").map((s) => s.trim()).filter(Boolean);
            return items.length > 0 ? (
              <ul key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`list-none space-y-1 ${alignClass(block)} ${blockClass}`}>
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: dotColor }} />
                    <span className="text-sm leading-6 text-neutral-700">
                      {canLink ? (
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
                      ) : item}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
                Empty list block
              </div>
            );
          }

          // Numbered / steps
          if (format === "steps") {
            const items = block.value.split("\n").map((s) => s.trim()).filter(Boolean);
            return items.length > 0 ? (
              <ol key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`list-none space-y-2 ${alignClass(block)} ${blockClass}`}>
                {items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                      style={{ backgroundColor: dotColor }}
                    >
                      {i + 1}
                    </span>
                    <span className="text-sm leading-6 text-neutral-700">
                      {canLink ? (
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
                      ) : item}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${blockClass}`}>
                Empty steps block
              </div>
            );
          }

          // Prose (default markdown)
          return (
            <div
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              className={`text-sm leading-6 text-neutral-700 prose prose-sm max-w-none prose-p:my-0 prose-headings:mb-1 ${alignClass(block)} ${blockClass}`}
            >
              {block.value ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={(url) => url}
                  components={{
                    a: ({ href, children }) => {
                      if (href?.startsWith("color:")) {
                        const color = resolveColor(href.slice(6), accentColor);
                        return <span style={{ color }}>{children}</span>;
                      }
                      if (href?.startsWith("sherpa-link:")) {
                        const pageId = href.slice("sherpa-link:".length);
                        const exists = pages?.some((p) => p.id === pageId);
                        if (exists && onNavigate) {
                          const color = accentColor || "#2563eb";
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigate(pageId); }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        return <span>{children}</span>;
                      }
                      return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
                    },
                  }}
                >
                  {processInlineMarkup(block.value)}
                </ReactMarkdown>
              ) : (
                "Empty text block"
              )}
            </div>
          );
        }

        if (block.type === "callout") {
          const variant = block.variant ?? "info";
          const variantStyles = {
            info: "bg-sky-50 border-sky-200 text-sky-900",
            warning: "bg-amber-50 border-amber-200 text-amber-900",
            tip: "bg-emerald-50 border-emerald-200 text-emerald-900",
          };
          const variantIcon = {
            info: "ℹ",
            warning: "⚠",
            tip: "✦",
          };
          return (
            <div
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              className={`flex gap-2.5 rounded-xl border px-3 py-3 text-sm leading-6 ${variantStyles[variant]} ${alignClass(block)} ${blockClass}`}
            >
              <span className="mt-0.5 shrink-0 text-[13px]">
                {variantIcon[variant]}
              </span>
              <span>
                {canLink ? (
                  <InlineWithLinks
                    text={block.value || "Empty callout block"}
                    pages={pages!}
                    onNavigate={onNavigate!}
                    accentColor={accentColor}
                  />
                ) : (block.value || "Empty callout block")}
              </span>
            </div>
          );
        }

        if (block.type === "image") {
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={blockClass}>
              <ImageBlock block={block} blockClass="" />
            </div>
          );
        }

        if (block.type === "consent") {
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={hasHalfBlock ? "col-span-2" : ""}>
              <ConsentFormBlock
                block={block}
                accentColor={accentColor}
                gameName={page.title || "Untitled"}
                onDismissContent={onDismissContent}
              />
            </div>
          );
        }

        if (block.type === "tabs") {
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={hasHalfBlock ? "col-span-2" : ""}>
              <TabsBlock
                block={block}
                accentColor={accentColor}
                page={page}
                pages={pages}
                onNavigate={onNavigate}
                onDismissContent={onDismissContent}
              />
            </div>
          );
        }

        if (block.type === "section") {
          return (
            <div key={block.id} className={hasHalfBlock ? "col-span-2" : ""}>
              <SectionBlock block={block} />
            </div>
          );
        }

        if (block.type === "carousel") {
          return (
            <div key={block.id} data-a11y-id={block.id} data-a11y-type="block" className={hasHalfBlock ? "col-span-2" : ""}>
              <CarouselBlock
                block={block}
                accentColor={accentColor}
                page={page}
                pages={pages}
                onNavigate={onNavigate}
                onDismissContent={onDismissContent}
              />
            </div>
          );
        }

        // video — always full width
        const videoSpan = hasHalfBlock ? "col-span-2" : "";
        return block.value ? (
          <div
            key={block.id}
            data-a11y-id={block.id}
            data-a11y-type="block"
            className={`overflow-hidden rounded-xl border border-neutral-200 ${videoSpan}`}
          >
            <video src={block.value} controls className="max-h-64 w-full bg-black" />
          </div>
        ) : (
          <div
            key={block.id}
            data-a11y-id={block.id}
            data-a11y-type="block"
            className={`rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500 ${videoSpan}`}
          >
            Empty video block
          </div>
        );
      })}
    </div>
  );

  const summary = page.summary.trim() ? (
    <p className="text-sm leading-6 text-neutral-600">
      {canLink ? (
        <InlineWithLinks text={page.summary} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} />
      ) : (
        page.summary
      )}
    </p>
  ) : null;

  return (
    <div className="space-y-3">
      {header}
      {summary}
      {blockList}
    </div>
  );
}
