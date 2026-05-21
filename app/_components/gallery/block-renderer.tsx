import type { ContentBlock } from "@/app/_lib/authoring-types";

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(s: string): string {
  return escapeHtml(s);
}

function renderListItems(value: string): string {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<li>${escapeHtml(line)}</li>`)
    .join("");
}

/**
 * Allow only http(s), data:image/, and root-relative URLs in user-supplied
 * image src. Blocks javascript:, vbscript:, file:, etc. — defense in depth even
 * though the author UI is sign-in gated.
 */
function isSafeImageSrc(src: string): boolean {
  return /^(https?:\/\/|data:image\/|\/)/i.test(src);
}

export function renderBlockToString(block: ContentBlock): string {
  if (block.type === "text") {
    const value = block.value ?? "";
    switch (block.blockFormat) {
      case "h2":
        return `<h2>${escapeHtml(value)}</h2>`;
      case "h3":
        return `<h3>${escapeHtml(value)}</h3>`;
      case "bullets":
        return `<ul>${renderListItems(value)}</ul>`;
      case "steps":
        return `<ol>${renderListItems(value)}</ol>`;
      case "prose":
      default:
        return `<p>${escapeHtml(value)}</p>`;
    }
  }
  if (block.type === "image") {
    const src = block.value ?? "";
    if (!src || !isSafeImageSrc(src)) return "";
    const caption = block.imageCaption?.trim();
    const alt = caption ?? "";
    const figcap = caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : "";
    return `<figure><img src="${escapeAttr(src)}" alt="${escapeAttr(alt)}" loading="lazy" />${figcap}</figure>`;
  }
  // section, callout, consent, tabs, steps (composite), step-rail, carousel, video — skipped.
  return "";
}

export function BlockRenderer({ blocks }: { blocks: ContentBlock[] }) {
  const html = blocks.map(renderBlockToString).join("");
  return <div className="prose prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />;
}
