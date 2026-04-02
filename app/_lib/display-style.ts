import { DisplayStyleKey, InteractionType, PageItem } from "@/app/_lib/authoring-types";

export type DisplayStyleOption = { key: DisplayStyleKey; label: string; description: string };

export const DISPLAY_STYLE_OPTIONS: DisplayStyleOption[] = [
  { key: "tooltip", label: "Tooltip", description: "Small pop-up attached to a hotspot" },
  { key: "compact-card", label: "Compact", description: "Small centered panel — 360px" },
  { key: "card", label: "Standard", description: "Medium centered panel — 520px" },
  { key: "large-card", label: "Large", description: "Wide centered panel — 660px" },
  { key: "wide-card", label: "Extra wide", description: "Extra-wide centered panel — 800px" },
  { key: "side-sheet", label: "Side panel", description: "Narrow panel from the right edge — 320px" },
  { key: "wide-side-sheet", label: "Wide side panel", description: "Wide panel from the right edge — 480px" },
  { key: "bottom-sheet", label: "Bottom sheet", description: "Full-width panel that slides up from the bottom" },
  { key: "full-screen", label: "Full screen", description: "Covers the entire board" },
  { key: "external-link", label: "External link", description: "Opens a URL outside the app" },
];

export function getDisplayStyleKey(page: PageItem): DisplayStyleKey {
  const { interactionType, cardSize } = page;
  if (interactionType === "tooltip") return "tooltip";
  if (interactionType === "full-page") return "full-screen";
  if (interactionType === "external-link") return "external-link";
  if (interactionType === "bottom-sheet") return "bottom-sheet";
  if (interactionType === "modal") {
    if (cardSize === "compact") return "compact-card";
    if (cardSize === "xl") return "large-card";
    if (cardSize === "large") return "wide-card";
    return "card";
  }
  if (interactionType === "side-sheet") {
    if (cardSize === "large") return "wide-side-sheet";
    return "side-sheet";
  }
  return "card";
}

export function applyDisplayStyle(style: DisplayStyleKey): { interactionType: InteractionType; cardSize: PageItem["cardSize"] } {
  switch (style) {
    case "tooltip": return { interactionType: "tooltip", cardSize: "medium" };
    case "compact-card": return { interactionType: "modal", cardSize: "compact" };
    case "card": return { interactionType: "modal", cardSize: "medium" };
    case "large-card": return { interactionType: "modal", cardSize: "xl" };
    case "wide-card": return { interactionType: "modal", cardSize: "large" };
    case "side-sheet": return { interactionType: "side-sheet", cardSize: "medium" };
    case "wide-side-sheet": return { interactionType: "side-sheet", cardSize: "large" };
    case "bottom-sheet": return { interactionType: "bottom-sheet", cardSize: "medium" };
    case "full-screen": return { interactionType: "full-page", cardSize: "medium" };
    case "external-link": return { interactionType: "external-link", cardSize: "medium" };
  }
}
