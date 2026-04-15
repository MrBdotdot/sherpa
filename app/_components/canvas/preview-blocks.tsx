"use client";

import React, { useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AnchorTarget, PageItem } from "@/app/_lib/authoring-types";
import { ConsentFormBlock } from "@/app/_components/canvas/consent-form-block";
import { processInlineMarkup, resolveColor, InlineWithLinks } from "@/app/_components/canvas/inline-markup";
import { SectionBlock } from "@/app/_components/canvas/step-rail-block";
import { ImageBlock } from "@/app/_components/canvas/image-block";
import { CarouselBlock } from "@/app/_components/canvas/carousel-block";
import { TabsBlock } from "@/app/_components/canvas/tabs-block";
import { injectPageLinks } from "@/app/_lib/inline-links";

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
  // Inject inline links at render time so links reflect the current card set
  // without requiring storage changes. Works for both real pages and the synthetic
  // pages TabsBlock creates when rendering tab content.
  const displayPage = useMemo(
    () => pages && pages.length > 1 ? injectPageLinks(page, pages) : page,
    [page, pages]
  );

  const hasAnyContent =
    displayPage.summary.trim().length > 0 ||
    displayPage.blocks.some(
      (block) =>
        block.type === "consent" ||
        block.type === "section" ||
        block.type === "step-rail" ||
        block.type === "carousel" ||
        block.value.trim().length > 0
    );

  const anchorTargets = useMemo<AnchorTarget[]>(
    () => {
      const allPages = pages ?? [];
      const hasCurrentPage = allPages.some((p) => p.id === displayPage.id);
      const pagesForAnchors = hasCurrentPage ? allPages : [displayPage, ...allPages];
      return pagesForAnchors.flatMap((page) =>
        page.blocks
          .filter(
            (b) =>
              (b.blockFormat === "h2" || b.blockFormat === "h3" || b.type === "section") &&
              b.value.trim() !== ""
          )
          .map((b) => ({
            id: b.id,
            label: b.value,
            pageId: page.id,
            pageTitle: page.title || "Untitled",
            kind: (b.blockFormat === "h2" ? "h2" : b.blockFormat === "h3" ? "h3" : "section") as AnchorTarget["kind"],
          }))
      );
    },
    [pages, displayPage]
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

  const hasHalfBlock = displayPage.blocks.some((b) => b.blockWidth === "half");

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
      {displayPage.blocks.map((block) => {
        const spanClass = hasHalfBlock && block.blockWidth !== "half" ? "col-span-2" : "";
        const selfAlign = hasHalfBlock ? selfAlignClass(block) : "";
        const blockClass = `${spanClass} ${selfAlign}`.trim();

        if (block.type === "text" || block.type === "steps") {
          const format = getEffectiveFormat(block);

          // Heading formats
          if (format === "h2") {
            return (
              <div key={block.id} id={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
                <h2 className="text-base font-bold text-neutral-900 leading-tight">
                  {block.value || <span className="text-neutral-400 font-normal">Empty heading</span>}
                </h2>
              </div>
            );
          }
          if (format === "h3") {
            return (
              <div key={block.id} id={block.id} data-a11y-id={block.id} data-a11y-type="block" className={`${alignClass(block)} ${blockClass}`}>
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
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorTargets={anchorTargets} currentPageId={displayPage.id} />
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
                        <InlineWithLinks text={item} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorTargets={anchorTargets} currentPageId={displayPage.id} />
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
                        const target = href.slice("sherpa-link:".length);
                        const color = accentColor || "#2563eb";
                        const isPage = pages?.some((p) => p.id === target);
                        const anchorTarget = !isPage ? anchorTargets.find((t) => t.id === target) : undefined;
                        const isSameCardAnchor = !!anchorTarget && anchorTarget.pageId === displayPage.id;
                        const isCrossCardAnchor = !!anchorTarget && anchorTarget.pageId !== displayPage.id;
                        if (isPage && onNavigate) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigate(target); }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        if (isSameCardAnchor) {
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
                              }}
                              className="cursor-pointer font-bold underline underline-offset-2"
                              style={{ color }}
                            >
                              {children}
                            </button>
                          );
                        }
                        if (isCrossCardAnchor && onNavigate) {
                          const pageId = anchorTarget.pageId;
                          return (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onNavigate(pageId);
                                setTimeout(() => {
                                  document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                }, 150);
                              }}
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
                    anchorTargets={anchorTargets}
                    currentPageId={displayPage.id}
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

  const summary = displayPage.summary.trim() ? (
    <p className="text-sm leading-6 text-neutral-600">
      {canLink ? (
        <InlineWithLinks text={displayPage.summary} pages={pages!} onNavigate={onNavigate!} accentColor={accentColor} anchorTargets={anchorTargets} currentPageId={displayPage.id} />
      ) : (
        displayPage.summary
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
