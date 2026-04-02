import type { ContentBlock, PageItem } from "@/app/_lib/authoring-types";

export type SearchIndexEntry = {
  pageId: string;
  breadcrumb: Array<{ label: string; pageId: string }>;
  text: string;
};

export type SearchHit = {
  pageId: string;
  breadcrumb: Array<{ label: string; pageId: string }>;
  matchSnippet: string;
};

export function extractBlocksText(blocks: ContentBlock[]): string {
  return blocks
    .filter((b) => !["step-rail", "image", "video", "consent"].includes(b.type))
    .map((b) => {
      if (b.type === "tabs" || b.type === "carousel") return "";
      return b.value ?? "";
    })
    .join(" ");
}

export function buildSearchIndex(pages: PageItem[]): SearchIndexEntry[] {
  const homePage = pages.find((p) => p.kind === "home");
  const entries: SearchIndexEntry[] = [];

  for (const page of pages) {
    if (page.kind === "home") continue;

    const baseCrumb: Array<{ label: string; pageId: string }> =
      page.kind === "hotspot" && homePage
        ? [{ label: "Home", pageId: homePage.id }, { label: page.title || "Hotspot", pageId: page.id }]
        : [{ label: page.title || "Untitled", pageId: page.id }];

    const mainText = [
      page.title,
      page.summary,
      extractBlocksText(page.blocks.filter((b) => b.type !== "tabs" && b.type !== "carousel")),
    ].filter(Boolean).join(" ");
    if (mainText.trim()) {
      entries.push({ pageId: page.id, breadcrumb: baseCrumb, text: mainText.trim() });
    }

    for (const block of page.blocks) {
      if (block.type === "tabs") {
        try {
          const data = JSON.parse(block.value);
          for (const section of (data.sections ?? []) as Array<{ id: string; label: string; blocks?: ContentBlock[] }>) {
            const sectionText = [
              section.label,
              extractBlocksText((section.blocks ?? []) as ContentBlock[]),
            ].filter(Boolean).join(" ");
            if (sectionText.trim()) {
              entries.push({
                pageId: page.id,
                breadcrumb: [...baseCrumb, { label: section.label || "Tab", pageId: page.id }],
                text: sectionText.trim(),
              });
            }
          }
        } catch { /* skip */ }
      }

      if (block.type === "carousel") {
        try {
          const data = JSON.parse(block.value);
          for (const slide of (data.slides ?? []) as Array<{ id: string; label: string; blocks?: ContentBlock[] }>) {
            const slideText = [
              slide.label,
              extractBlocksText((slide.blocks ?? []) as ContentBlock[]),
            ].filter(Boolean).join(" ");
            if (slideText.trim()) {
              entries.push({
                pageId: page.id,
                breadcrumb: [...baseCrumb, { label: slide.label || "Slide", pageId: page.id }],
                text: slideText.trim(),
              });
            }
          }
        } catch { /* skip */ }
      }
    }
  }

  return entries;
}

export function searchPages(pages: PageItem[], query: string): SearchHit[] {
  const q = query.toLowerCase().trim();
  if (!q) return [];

  const index = buildSearchIndex(pages);
  const hits: SearchHit[] = [];
  const seen = new Set<string>();

  for (const entry of index) {
    const textLower = entry.text.toLowerCase();
    if (!textLower.includes(q)) continue;

    const dedupeKey = `${entry.pageId}:${entry.breadcrumb.at(-1)?.label ?? ""}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);

    const matchIdx = textLower.indexOf(q);
    const start = Math.max(0, matchIdx - 40);
    const end = Math.min(entry.text.length, matchIdx + q.length + 80);
    const snippet =
      (start > 0 ? "…" : "") +
      entry.text.slice(start, end).trim() +
      (end < entry.text.length ? "…" : "");

    hits.push({ pageId: entry.pageId, breadcrumb: entry.breadcrumb, matchSnippet: snippet });
    if (hits.length >= 8) break;
  }

  return hits;
}
