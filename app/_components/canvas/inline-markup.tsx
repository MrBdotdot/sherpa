"use client";

import React from "react";
import { PageItem } from "@/app/_lib/authoring-types";

// Pre-process ((label|pageId)) and {text|color} for ReactMarkdown
export function processInlineMarkup(text: string): string {
  let result = text.replace(/\(\(([^|)]+)\|([^)]+)\)\)/g, "[$1](sherpa-link:$2)");
  result = result.replace(/\{([^|}]+)\|([^}]+)\}/g, "[$1](color:$2)");
  return result;
}

export function resolveColor(raw: string, accentColor: string): string {
  if (raw === "accent") return accentColor || "#2563eb";
  return raw;
}

// Render plain text with ((label|pageId)) and {text|color} inline markup
export function InlineWithLinks({
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
  // matches ((label|pageId)) or {text|color}
  const regex = /\(\(([^|)]+)\|([^)]+)\)\)|\{([^|}]+)\|([^}]+)\}/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    // Stable key: match start position is unique per text render
    const k = match.index;
    if (match[1] !== undefined) {
      // ((label|pageId)) link
      const label = match[1];
      const pageId = match[2];
      const exists = pages.some((p) => p.id === pageId);
      if (exists) {
        const color = accentColor || "#2563eb";
        parts.push(
          <button
            key={k}
            type="button"
            onClick={(e) => { e.stopPropagation(); onNavigate(pageId); }}
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
