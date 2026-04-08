import { ContentBlock } from "@/app/_lib/authoring-types";

export const BLOCK_LABELS: Record<string, string> = {
  text: "Text",
  callout: "Callout",
  image: "Image",
  tabs: "Tabs",
  section: "Section",
  "step-rail": "Step Rail",
  carousel: "Carousel",
  consent: "Consent",
};

export function getBlockPreview(block: ContentBlock): string {
  if (block.type === "text" || block.type === "callout" || block.type === "section") {
    return block.value.split("\n")[0].slice(0, 48) || (BLOCK_LABELS[block.type] ?? block.type);
  }
  return BLOCK_LABELS[block.type] ?? block.type;
}

export function getTabSections(blocks: ContentBlock[]): Array<{ blockId: string; tabId: string; label: string }> {
  const result: Array<{ blockId: string; tabId: string; label: string }> = [];
  for (const block of blocks) {
    if (block.type === "tabs") {
      try {
        const data = JSON.parse(block.value);
        const sections: Array<{ id: string; label: string }> = data.sections ?? [];
        sections.forEach((s, i) => {
          result.push({ blockId: block.id, tabId: s.id, label: s.label || `Tab ${i + 1}` });
        });
      } catch { /* ignore */ }
    }
  }
  return result;
}
