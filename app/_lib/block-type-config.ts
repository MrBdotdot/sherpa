import { ContentBlock, ContentBlockType } from "@/app/_lib/authoring-types";

export type BlockFormat = ContentBlock["blockFormat"];

export type VerticalAlign = ContentBlock["verticalAlign"];

export const CONTENT_ELEMENT_TYPES = [
  { kind: "block" as const, type: "text" as ContentBlockType, label: "Text", description: "Paragraph, heading, list, or steps" },
  { kind: "block" as const, type: "callout" as ContentBlockType, label: "Callout", description: "Info, warning, or tip highlight" },
  { kind: "block" as const, type: "tabs" as ContentBlockType, label: "Tabs", description: "Toggle between named sections" },
  { kind: "block" as const, type: "section" as ContentBlockType, label: "Section", description: "Named anchor for the Step Rail to link to" },
  { kind: "block" as const, type: "step-rail" as ContentBlockType, label: "Step Rail", description: "Sticky nav that links to section blocks" },
  { kind: "block" as const, type: "carousel" as ContentBlockType, label: "Carousel", description: "Swipeable slides with full content per slide" },
  { kind: "block" as const, type: "consent" as ContentBlockType, label: "Consent Form", description: "Collects a name and signature from playtesters" },
  { kind: "block" as const, type: "image" as ContentBlockType, label: "Image", description: "Inline photo or diagram" },
  { kind: "block" as const, type: "video" as ContentBlockType, label: "Video", description: "Embedded video clip" },
  { kind: "action-link" as const, type: null, label: "Action link", description: "Link to a store, social page, or download" },
];

export const TYPE_LABELS: Record<ContentBlockType, string> = {
  text: "Text",
  image: "Image",
  video: "Video",
  steps: "Steps",
  callout: "Callout",
  consent: "Consent Form",
  tabs: "Tabs",
  section: "Section",
  "step-rail": "Step Rail",
  carousel: "Carousel",
};

export const FORMAT_OPTIONS: Array<{ value: BlockFormat; label: string; title: string }> = [
  { value: "prose", label: "¶", title: "Paragraph" },
  { value: "h2", label: "H2", title: "Heading 2" },
  { value: "h3", label: "H3", title: "Heading 3" },
  { value: "bullets", label: "•", title: "Bullet list" },
  { value: "steps", label: "1.", title: "Numbered list" },
];

// Types that support the formatting toolbar (prose/h2/h3/bullets/steps + bold/italic)
export const FORMAT_SUPPORTED: ContentBlockType[] = ["text", "steps"];
export const HALF_WIDTH_SUPPORTED: ContentBlockType[] = ["text", "steps", "callout", "image"];
export const TEXT_ALIGN_SUPPORTED: ContentBlockType[] = ["text", "steps", "callout"];
export const VERTICAL_ALIGN_SUPPORTED: ContentBlockType[] = ["text", "steps", "callout", "image"];

export function getEffectiveFormat(block: ContentBlock): BlockFormat {
  if (block.blockFormat) return block.blockFormat;
  if (block.type === "steps") return "steps";
  return "prose";
}

export function getTextareaPlaceholder(format: BlockFormat): string {
  switch (format) {
    case "h2": return "Section heading";
    case "h3": return "Sub-heading";
    case "bullets": return "One item per line";
    case "steps": return "Set up the board\nDeal 5 cards to each player\nThe youngest player goes first";
    default: return "Enter text. You can use **bold**, *italic*, and more.";
  }
}
