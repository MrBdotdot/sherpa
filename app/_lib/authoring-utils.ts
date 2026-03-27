import {
  CanvasFeature,
  CanvasFeatureType,
  ContentBlock,
  ContentBlockType,
  DisplayStyleKey,
  InteractionType,
  PageButtonPlacement,
  PageItem,
  PageTemplate,
  PublishStatus,
  SocialLink,
  TemplateId,
} from "@/app/_lib/authoring-types";

export const APP_VERSION = "v0.10.8";

export type { PatchNote } from "@/app/_lib/patch-notes";
export { PATCH_NOTES } from "@/app/_lib/patch-notes";

export const HOME_PAGE_ID = "home-page";
export const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop";

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "how-to-play",
    title: "How to Play",
    summary: "Give players a fast onboarding path before they jump in.",
    description: "A quick explainer page with setup, turn flow, and the win condition.",
    blocks: [
      { type: "text", value: "1. Set up the board and deal the starting cards." },
      { type: "text", value: "2. Take turns in clockwise order and resolve each action." },
      { type: "text", value: "3. The first player to complete the objective wins." },
    ],
    interactionType: "modal",
    pageButtonPlacement: "bottom",
  },
  {
    id: "full-rules",
    title: "Full Rules",
    summary: "A deeper rules reference for players who want everything in one place.",
    description: "Best for complete rules, examples, and edge cases.",
    blocks: [
      { type: "text", value: "Overview\nExplain the goal, setup, and round structure in detail." },
      { type: "text", value: "Key Rules\nList scoring, restrictions, and tie-breakers." },
    ],
    interactionType: "full-page",
    pageButtonPlacement: "right",
  },
  {
    id: "faq",
    title: "FAQ",
    summary: "Answer the most common player questions before they get stuck.",
    description: "A lightweight support page for clarifications and edge cases.",
    blocks: [
      { type: "text", value: "Q: What happens if two players finish at the same time?\nA: Add your answer here." },
      { type: "text", value: "Q: Can players trade items?\nA: Add your answer here." },
    ],
    interactionType: "side-sheet",
    pageButtonPlacement: "left",
  },
  {
    id: "legal",
    title: "Disclaimer",
    summary: "Include legal, safety, or store-policy text without interrupting the core experience.",
    description: "A good place for legal notes, age restrictions, or event disclaimers.",
    blocks: [{ type: "text", value: "Add legal or disclaimer copy here." }],
    interactionType: "tooltip",
    pageButtonPlacement: "top",
  },
  {
    id: "social-cta",
    title: "Follow Us",
    summary: "Drive players to socials, purchasing, or another external destination.",
    description: "Use this for social links, buy-now CTAs, or contact actions.",
    blocks: [{ type: "text", value: "Invite players to follow, buy, or contact you." }],
    socialLinks: [
      { label: "Instagram", url: "https://instagram.com/" },
      { label: "TikTok", url: "https://tiktok.com/" },
    ],
    interactionType: "external-link",
    pageButtonPlacement: "stack",
  },
];

export function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function createBlock(type: ContentBlockType, value = ""): ContentBlock {
  const defaultValue = type === "tabs" && !value
    ? JSON.stringify({ sections: [
        { id: "tab-1", label: "Tab 1", blocks: [] },
        { id: "tab-2", label: "Tab 2", blocks: [] },
      ]})
    : type === "step-rail" && !value
    ? JSON.stringify({ orientation: "vertical", iconShape: "circle", showPing: true, steps: [
        { id: "step-1", label: "Step 1", color: "#3b82f6", iconImageUrl: "", sectionBlockId: "" },
        { id: "step-2", label: "Step 2", color: "#8b5cf6", iconImageUrl: "", sectionBlockId: "" },
        { id: "step-3", label: "Step 3", color: "#10b981", iconImageUrl: "", sectionBlockId: "" },
      ]})
    : type === "carousel" && !value
    ? JSON.stringify({ slides: [
        { id: "slide-1", label: "Slide 1", blocks: [] },
        { id: "slide-2", label: "Slide 2", blocks: [] },
      ]})
    : value;
  return {
    id: createId("block"),
    type,
    value: defaultValue,
    ...(type === "callout" ? { variant: "info" as const } : {}),
  };
}

export function createSocialLink(label = "", url = ""): SocialLink {
  return {
    id: createId("social"),
    label,
    url,
  };
}

export function createCanvasFeature(
  type: CanvasFeatureType
): CanvasFeature {
  switch (type) {
    case "qr":
      return {
        id: createId("feature"),
        type,
        label: "QR Code",
        description: "Link visitors to the live rules experience.",
        linkUrl: "https://example.com/rules",
        imageUrl: "",
        optionsText: "",
        x: 82,
        y: 18,
      };
    case "image":
      return {
        id: createId("feature"),
        type,
        label: "Image",
        description: "",
        linkUrl: "",
        imageUrl: "",
        optionsText: "",
        x: 18,
        y: 16,
      };
    case "heading":
      return {
        id: createId("feature"),
        type,
        label: "Section Heading",
        description: "",
        linkUrl: "",
        imageUrl: "",
        optionsText: "",
        x: 50,
        y: 14,
      };
    case "disclaimer":
      return {
        id: createId("feature"),
        type,
        label: "Disclaimer",
        description: "Add short legal or event-specific copy.",
        linkUrl: "",
        imageUrl: "",
        optionsText: "",
        x: 20,
        y: 82,
      };
    case "button":
      return {
        id: createId("feature"),
        type,
        label: "Buy Now",
        description: "Link to a store, landing page, or signup form.",
        linkUrl: "https://example.com",
        imageUrl: "",
        optionsText: "",
        x: 76,
        y: 76,
      };
    case "dropdown":
      return {
        id: createId("feature"),
        type,
        label: "Quick Links",
        description: "Let visitors choose from a small list of destinations.",
        linkUrl: "",
        imageUrl: "",
        optionsText: "How to Play\nFAQ\nStore Locator",
        x: 50,
        y: 18,
      };
    case "page-button":
      return {
        id: createId("feature"),
        type,
        label: "Page Button",
        description: "",
        linkUrl: "",
        imageUrl: "",
        optionsText: "",
        x: 50,
        y: 85,
      };
    case "locale":
      return {
        id: createId("feature"),
        type,
        label: "EN",
        description: "",
        linkUrl: "",
        imageUrl: "",
        optionsText: "English|EN\nEspañol|ES\nFrançais|FR\nDeutsch|DE",
        x: 90,
        y: 6,
      };
    default:
      return {
        id: createId("feature"),
        type,
        label: "Feature",
        description: "",
        linkUrl: "",
        imageUrl: "",
        optionsText: "",
        x: 50,
        y: 50,
      };
  }
}

function createBasePage({
  kind,
  title,
  summary,
  heroImage = DEFAULT_HERO,
  blocks,
  socialLinks = [],
  publicUrl = "",
  showQrCode = false,
  interactionType,
  publishStatus = "draft",
  pageButtonPlacement = "bottom",
  templateId = "blank",
  cardSize = "medium",
  contentTintColor = "",
  contentTintOpacity = 85,
}: {
  kind: PageItem["kind"];
  title: string;
  summary: string;
  heroImage?: string;
  blocks: ContentBlock[];
  socialLinks?: SocialLink[];
  publicUrl?: string;
  showQrCode?: boolean;
  interactionType: InteractionType;
  publishStatus?: PublishStatus;
  pageButtonPlacement?: PageButtonPlacement;
  templateId?: TemplateId;
  cardSize?: PageItem["cardSize"];
  contentTintColor?: string;
  contentTintOpacity?: number;
}): PageItem {
  return {
    id: createId(kind),
    kind,
    title,
    summary,
    heroImage,
    x: null,
    y: null,
    contentX: 50,
    contentY: 50,
    blocks,
    socialLinks,
    publicUrl,
    showQrCode,
    interactionType,
    publishStatus,
    pageButtonPlacement,
    templateId,
    canvasFeatures: [],
    cardSize,
    contentTintColor,
    contentTintOpacity,
  };
}

export function createStandardPage(count: number): PageItem {
  return createBasePage({
    kind: "page",
    title: `Page ${count}`,
    summary: "",
    blocks: [createBlock("text", "Add content for this page.")],
    interactionType: "modal",
  });
}

export function createTemplatePage(templateId: TemplateId, count: number): PageItem {
  const template = PAGE_TEMPLATES.find((item) => item.id === templateId);
  if (!template) {
    return createStandardPage(count);
  }

  return createBasePage({
    kind: "page",
    title: template.title,
    summary: template.summary,
    blocks: template.blocks.map((block) => createBlock(block.type, block.value)),
    socialLinks: (template.socialLinks ?? []).map((link) =>
      createSocialLink(link.label, link.url)
    ),
    publicUrl: template.publicUrl ?? "",
    showQrCode: template.showQrCode ?? false,
    interactionType: template.interactionType,
    pageButtonPlacement: template.pageButtonPlacement,
    templateId: template.id,
    publishStatus: "draft",
  });
}

export function createHotspotPage(count: number, heroImage: string): PageItem {
  return createBasePage({
    kind: "hotspot",
    title: `Hotspot ${count}`,
    summary: "",
    heroImage,
    blocks: [createBlock("text", "Add contextual content for this hotspot.")],
    interactionType: "tooltip",
  });
}

export function createInitialPages(): PageItem[] {
  return [
    {
      ...createBasePage({
        kind: "home",
        title: "Home",
        summary: "Welcome to the rules experience.",
        blocks: [createBlock("text", "Add intro content for the landing page.")],
        publicUrl: "https://example.com/rules",
        showQrCode: true,
        interactionType: "full-page",
        publishStatus: "draft",
      }),
      id: HOME_PAGE_ID,
      canvasFeatures: [createCanvasFeature("locale")],
    },
  ];
}

export function getQrImageUrl(value: string) {
  const data = encodeURIComponent(value || "https://example.com");
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${data}`;
}

export function getPageKindLabel(kind: PageItem["kind"]) {
  switch (kind) {
    case "home":
      return "Landing page";
    case "page":
      return "Page button";
    case "hotspot":
      return "Image hotspot";
    default:
      return "Page";
  }
}

export function getPageRoleDescription(kind: PageItem["kind"]) {
  switch (kind) {
    case "home":
      return "The starting surface players see first.";
    case "page":
      return "A container that sits on top of the home page.";
    case "hotspot":
      return "Contextual callouts attached to a point on the hero image.";
    default:
      return "";
  }
}

export function getInteractionTypeLabel(interactionType: InteractionType) {
  switch (interactionType) {
    case "modal":
      return "Modal";
    case "side-sheet":
      return "Side sheet";
    case "bottom-sheet":
      return "Bottom sheet";
    case "tooltip":
      return "Tooltip";
    case "full-page":
      return "Full page";
    case "external-link":
      return "External link";
    default:
      return "Interaction";
  }
}

export function getExperienceStatusLabel(status: import("@/app/_lib/authoring-types").ExperienceStatus) {
  return status === "published" ? "Published" : "Draft";
}

export function getExperienceStatusClasses(status: import("@/app/_lib/authoring-types").ExperienceStatus) {
  return status === "published"
    ? "bg-emerald-100 text-emerald-800"
    : "bg-amber-100 text-amber-800";
}

export function getPublishStatusLabel(status: PublishStatus) {
  switch (status) {
    case "draft":
      return "Draft";
    case "published":
      return "Published";
    default:
      return "Status";
  }
}

export function getPublishStatusClasses(status: PublishStatus) {
  switch (status) {
    case "draft":
      return "bg-amber-100 text-amber-800";
    case "published":
      return "bg-emerald-100 text-emerald-800";
    default:
      return "bg-neutral-100 text-neutral-700";
  }
}

export function getPlacementLabel(placement: PageButtonPlacement) {
  switch (placement) {
    case "top":
      return "Top";
    case "bottom":
      return "Bottom";
    case "left":
      return "Left rail";
    case "right":
      return "Right rail";
    case "stack":
      return "Centered stack";
    default:
      return "Placement";
  }
}

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
  { key: "full-screen", label: "Full screen", description: "Covers the entire canvas" },
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

export function getFeatureTypeLabel(type: CanvasFeatureType) {
  switch (type) {
    case "qr":
      return "QR code";
    case "image":
      return "Image";
    case "heading":
      return "Heading";
    case "disclaimer":
      return "Disclaimer";
    case "button":
      return "Button";
    case "dropdown":
      return "Dropdown";
    case "page-button":
      return "Page button";
    case "locale":
      return "Language";
    default:
      return "Feature";
  }
}
