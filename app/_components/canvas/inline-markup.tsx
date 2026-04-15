"use client";

import React from "react";
import { AnchorTarget, PageItem } from "@/app/_lib/authoring-types";

// Pre-process ((label|target)) and {text|color} for ReactMarkdown
export function processInlineMarkup(text: string): string {
  let result = text.replace(/\(\(([^|)]+)\|([^)]+)\)\)/g, "[$1](sherpa-link:$2)");
  result = result.replace(/\{([^|}]+)\|([^}]+)\}/g, "[$1](color:$2)");
  return result;
}

export function resolveColor(raw: string, accentColor: string): string {
  if (raw === "accent") return accentColor || "#2563eb";
  return raw;
}

// Render plain text with ((label|target)) and {text|color} inline markup.
// target may be a pageId (navigate), a same-card blockId (scroll),
// or a cross-card blockId (navigate to card then scroll).
export function InlineWithLinks({
  text,
  pages,
  onNavigate,
  accentColor,
  anchorTargets,
  currentPageId,
}: {
  text: string;
  pages: PageItem[];
  onNavigate: (pageId: string) => void;
  accentColor: string;
  anchorTargets?: AnchorTarget[];
  currentPageId?: string;
}) {
  const regex = /\(\(([^|)]+)\|([^)]+)\)\)|\{([^|}]+)\|([^}]+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const k = match.index;
    if (match[1] !== undefined) {
      // ((label|target)) link
      const label = match[1];
      const target = match[2];
      const color = accentColor || "#2563eb";
      const isPage = pages.some((p) => p.id === target);
      const anchorTarget = !isPage ? anchorTargets?.find((t) => t.id === target) : undefined;
      const isSameCardAnchor = !!anchorTarget && anchorTarget.pageId === currentPageId;
      const isCrossCardAnchor = !!anchorTarget && anchorTarget.pageId !== currentPageId;

      if (isPage) {
        parts.push(
          <button
            key={k}
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(target); }}
            className="inline cursor-pointer font-bold underline underline-offset-2"
            style={{ color }}
          >
            {label}
          </button>
        );
      } else if (isSameCardAnchor) {
        parts.push(
          <button
            key={k}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="inline cursor-pointer font-bold underline underline-offset-2"
            style={{ color }}
          >
            {label}
          </button>
        );
      } else if (isCrossCardAnchor) {
        const pageId = anchorTarget.pageId;
        parts.push(
          <button
            key={k}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onNavigate(pageId);
              setTimeout(() => {
                document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 400);
            }}
            className="inline cursor-pointer font-bold underline underline-offset-2"
            style={{ color }}
          >
            {label}
          </button>
        );
      } else {
        parts.push(<span key={k}>{label}</span>);
      }
    } else {
      // {text|color} span
      const label = match[3];
      const color = resolveColor(match[4], accentColor);
      parts.push(<span key={k} style={{ color }}>{label}</span>);
    }
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return <>{parts}</>;
}
