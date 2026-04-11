import type { PageItem, ContentBlock } from "@/app/_lib/authoring-types";

const SCANNABLE_TYPES = new Set<ContentBlock["type"]>(["text", "steps", "callout"]);
const MIN_TITLE_LENGTH = 4;

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function injectLinksIntoText(
  text: string,
  candidates: Array<{ title: string; pageId: string }>,
  excludePageId: string,
  seen: Set<string>
): string {
  let result = text;
  for (const { title, pageId } of candidates) {
    if (pageId === excludePageId) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    const regex = new RegExp(`\\b(${escapeRegex(title)})\\b`, "i");
    const match = regex.exec(result);
    if (!match) continue;
    // Guard: skip if the match falls inside existing ((..)) markup
    const before = result.slice(0, match.index);
    const opens = (before.match(/\(\(/g) ?? []).length;
    const closes = (before.match(/\)\)/g) ?? []).length;
    if (opens > closes) continue;
    result =
      result.slice(0, match.index) +
      `((${match[1]}|${pageId}))` +
      result.slice(match.index + match[0].length);
    seen.add(key);
  }
  return result;
}

export function injectInlineLinks(pages: PageItem[]): PageItem[] {
  if (pages.length <= 1) return pages;

  // Sort longest title first so "Setup Phase" matches before "Setup"
  const candidates = pages
    .filter((p) => p.title.length >= MIN_TITLE_LENGTH)
    .map((p) => ({ title: p.title, pageId: p.id }))
    .sort((a, b) => b.title.length - a.title.length);

  return pages.map((page) => {
    // Summary is its own section
    let seen = new Set<string>();
    const newSummary = page.summary.trim()
      ? injectLinksIntoText(page.summary, candidates, page.id, seen)
      : page.summary;

    // Blocks: reset seen at each section block and at each block type transition
    seen = new Set<string>();
    let lastBlockType: ContentBlock["type"] | null = null;
    const newBlocks = page.blocks.map((block) => {
      if (block.type === "section") {
        seen = new Set<string>();
        lastBlockType = null;
        return block;
      }
      // Reset seen when transitioning between different block types
      if (lastBlockType !== null && lastBlockType !== block.type) {
        seen = new Set<string>();
      }
      if (!SCANNABLE_TYPES.has(block.type)) {
        lastBlockType = block.type;
        return block;
      }
      const newValue = injectLinksIntoText(block.value, candidates, page.id, seen);
      lastBlockType = block.type;
      return { ...block, value: newValue };
    });

    return { ...page, summary: newSummary, blocks: newBlocks };
  });
}
