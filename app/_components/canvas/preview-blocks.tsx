"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PageItem } from "@/app/_lib/authoring-types";

// Pre-process ((label|pageId)) → [label](sherpa-link:pageId) for ReactMarkdown
function processTextLinks(text: string): string {
  return text.replace(/\(\(([^|)]+)\|([^)]+)\)\)/g, "[$1](sherpa-link:$2)");
}

// Render plain text with ((label|pageId)) as tappable inline buttons
function InlineWithLinks({
  text,
  pages,
  onNavigate,
  accentColor,
}: {
  text: string;
  pages: PageItem[];
  onNavigate: (pageId: string) => void;
  accentColor: string;
}) {
  const regex = /\(\(([^|)]+)\|([^)]+)\)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const label = match[1];
    const pageId = match[2];
    const exists = pages.some((p) => p.id === pageId);
    if (exists) {
      const color = accentColor || "#2563eb";
      parts.push(
        <button
          key={key++}
          type="button"
          onClick={(e) => { e.stopPropagation(); onNavigate(pageId); }}
          className="inline cursor-pointer font-bold underline underline-offset-2"
          style={{ color }}
        >
          {label}
        </button>
      );
    } else {
      parts.push(<span key={key++}>{label}</span>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}

export function PreviewBlocks({
  accentColor,
  onNavigate,
  page,
  pages,
}: {
  accentColor: string;
  onNavigate?: (pageId: string) => void;
  page: PageItem;
  pages?: PageItem[];
}) {
  const hasAnyContent =
    page.summary.trim().length > 0 ||
    page.blocks.some((block) => block.value.trim().length > 0);

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

  return (
    <div className="space-y-3">
      {page.summary.trim() ? (
        <p className="text-sm leading-6 text-neutral-600">
          {canLink ? (
            <InlineWithLinks
              text={page.summary}
              pages={pages!}
              onNavigate={onNavigate!}
              accentColor={accentColor}
            />
          ) : (
            page.summary
          )}
        </p>
      ) : null}

      {page.blocks.map((block, blockIndex) => {
        if (block.type === "text") {
          return (
            <div
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              className="rounded-xl bg-neutral-50 px-3 py-2 text-sm leading-6 text-neutral-700 prose prose-sm max-w-none prose-p:my-0 prose-headings:mb-1"
            >
              {block.value ? (
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  urlTransform={(url) => url}
                  components={canLink ? {
                    a: ({ href, children }) => {
                      if (href?.startsWith("sherpa-link:")) {
                        const pageId = href.slice("sherpa-link:".length);
                        const exists = pages!.some((p) => p.id === pageId);
                        if (exists) {
                          const color = accentColor || "#2563eb";
                          return (
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); onNavigate!(pageId); }}
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
                  } : undefined}
                >
                  {canLink ? processTextLinks(block.value) : block.value}
                </ReactMarkdown>
              ) : (
                "Empty text block"
              )}
            </div>
          );
        }

        if (block.type === "steps") {
          const items = block.value
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          return items.length > 0 ? (
            <ol key={block.id} data-a11y-id={block.id} data-a11y-type="block" className="list-none space-y-2">
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
                      <InlineWithLinks
                        text={item}
                        pages={pages!}
                        onNavigate={onNavigate!}
                        accentColor={accentColor}
                      />
                    ) : item}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <div
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500"
            >
              Empty steps block
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
              className={`flex gap-2.5 rounded-xl border px-3 py-3 text-sm leading-6 ${variantStyles[variant]}`}
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
          const fitClass = block.imageFit === "contain" ? "object-contain"
            : block.imageFit === "fill" ? "object-fill"
            : block.imageFit === "center" ? "object-none object-center"
            : "object-cover";
          return block.value ? (
            <img
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              src={block.value}
              alt=""
              className={`max-h-56 w-full rounded-xl ${fitClass}`}
            />
          ) : (
            <div
              key={block.id}
              data-a11y-id={block.id}
              data-a11y-type="block"
              className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500"
            >
              Empty image block
            </div>
          );
        }

        // video
        return block.value ? (
          <div
            key={block.id}
            data-a11y-id={block.id}
            data-a11y-type="block"
            className="overflow-hidden rounded-xl border border-neutral-200"
          >
            <video src={block.value} controls className="max-h-64 w-full bg-black" />
          </div>
        ) : (
          <div
            key={block.id}
            data-a11y-id={block.id}
            data-a11y-type="block"
            className="rounded-xl border border-dashed border-neutral-300 px-3 py-4 text-sm text-neutral-500"
          >
            Empty video block
          </div>
        );
      })}
    </div>
  );
}
