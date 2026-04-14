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

function buildCandidates(allPages: PageItem[]) {
  return allPages
    .filter((p) => p.title.length >= MIN_TITLE_LENGTH)
    .map((p) => ({ title: p.title, pageId: p.id }))
    .sort((a, b) => b.title.length - a.title.length);
}

/**
 * Inject inline links into a single page's blocks and summary.
 * Used at render time in PreviewBlocks so links stay current without storage changes.
 */
export function injectPageLinks(page: PageItem, allPages: PageItem[]): PageItem {
  if (allPages.length <= 1) return page;

  const candidates = buildCandidates(allPages);

  let seen = new Set<string>();
  const newSummary = page.summary.trim()
    ? injectLinksIntoText(page.summary, candidates, page.id, seen)
    : page.summary;

  seen = new Set<string>();
  const newBlocks = page.blocks.map((block) => {
    if (!SCANNABLE_TYPES.has(block.type)) return block;
    const newValue = injectLinksIntoText(block.value, candidates, page.id, seen);
    return newValue === block.value ? block : { ...block, value: newValue };
  });

  const summaryChanged = newSummary !== page.summary;
  const blocksChanged = newBlocks.some((b, i) => b !== page.blocks[i]);
  if (!summaryChanged && !blocksChanged) return page;

  return { ...page, summary: newSummary, blocks: newBlocks };
}

/**
 * Inject inline links across a full set of pages.
 * Used server-side in import/split pipelines.
 */
export function injectInlineLinks(pages: PageItem[]): PageItem[] {
  if (pages.length <= 1) return pages;

  const candidates = buildCandidates(pages);

  return pages.map((page) => {
    let seen = new Set<string>();
    const newSummary = page.summary.trim()
      ? injectLinksIntoText(page.summary, candidates, page.id, seen)
      : page.summary;

    seen = new Set<string>();
    let prevType: string | null = null;
    const newBlocks = page.blocks.map((block) => {
      // Section headings reset the seen set so titles can re-link in each new section
      if (block.type === "section") {
        seen = new Set<string>();
        prevType = block.type;
        return block;
      }
      // Block-type transitions also reset seen (text → steps, steps → callout, etc.)
      if (prevType !== null && prevType !== "section" && prevType !== block.type) {
        seen = new Set<string>();
      }
      prevType = block.type;
      if (!SCANNABLE_TYPES.has(block.type)) return block;
      const newValue = injectLinksIntoText(block.value, candidates, page.id, seen);
      return newValue === block.value ? block : { ...block, value: newValue };
    });

    return { ...page, summary: newSummary, blocks: newBlocks };
  });
}
