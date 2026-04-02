import {
  CanvasFeature,
  CanvasFeatureType,
  ContentBlock,
  ContentBlockType,
  ImageBlockHotspot,
  InteractionType,
  PageButtonPlacement,
  PageItem,
  PageTemplate,
  PublishStatus,
  SocialLink,
  TemplateId,
} from "@/app/_lib/authoring-types";

export const APP_VERSION = "v0.13.6";

export type { PatchNote } from "@/app/_lib/patch-notes";
export { PATCH_NOTES } from "@/app/_lib/patch-notes";

export const HOME_PAGE_ID = "home-page";
export const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop";

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "how-to-play",
    title: "How to Play",
    summary: "",
    description: "A quick explainer page with setup, turn flow, and the win condition.",
    blocks: [],
    interactionType: "modal",
    pageButtonPlacement: "bottom",
  },
  {
    id: "full-rules",
    title: "Full Rules",
    summary: "",
    description: "Best for complete rules, examples, and edge cases.",
    blocks: [],
    interactionType: "full-page",
    pageButtonPlacement: "right",
  },
  {
    id: "faq",
    title: "FAQ",
    summary: "",
    description: "A lightweight support page for clarifications and edge cases.",
    blocks: [],
    interactionType: "side-sheet",
    pageButtonPlacement: "left",
  },
  {
    id: "legal",
    title: "Disclaimer",
    summary: "",
    description: "A good place for legal notes, age restrictions, or event disclaimers.",
    blocks: [],
    interactionType: "tooltip",
    pageButtonPlacement: "top",
  },
  {
    id: "social-cta",
    title: "Follow Us",
    summary: "",
    description: "Use this for social links, buy-now CTAs, or contact actions.",
    blocks: [],
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

export function createImageHotspot(x = 50, y = 50): ImageBlockHotspot {
  return {
    id: createId("imghs"),
    x,
    y,
    label: "",
    content: "",
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
    case "search":
      return {
        id: createId("feature"),
        type,
        label: "Search rules…",
        description: "",
        linkUrl: "",
        imageUrl: "",
        optionsText: "",
        x: 50,
        y: 8,
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

export const DEFAULT_HOTSPOT_BLOCK_TEXT = "Add contextual content for this hotspot.";

export function createHotspotPage(count: number, heroImage: string): PageItem {
  return createBasePage({
    kind: "hotspot",
    title: `Hotspot ${count}`,
    summary: "",
    heroImage,
    blocks: [createBlock("text", DEFAULT_HOTSPOT_BLOCK_TEXT)],
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

