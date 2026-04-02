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

export const APP_VERSION = "v0.13.9";

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
        label: "Card Button",
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

// Stable IDs used across the sample so card-button linkUrls resolve correctly
const SAMPLE_HTP_ID = "sample-how-to-play";
const SAMPLE_QR_ID = "sample-quick-ref";
const SAMPLE_FAQ_ID = "sample-faq";
const SAMPLE_HS_FIELD_ID = "sample-hs-field";
const SAMPLE_HS_CARDS_ID = "sample-hs-cards";

function samplePage(overrides: Partial<PageItem> & Pick<PageItem, "id" | "kind" | "title" | "interactionType" | "blocks">): PageItem {
  return {
    summary: "",
    heroImage: DEFAULT_HERO,
    x: null,
    y: null,
    contentX: 50,
    contentY: 50,
    socialLinks: [],
    publicUrl: "",
    showQrCode: false,
    publishStatus: "draft",
    pageButtonPlacement: "bottom",
    templateId: "blank",
    canvasFeatures: [],
    cardSize: "medium",
    contentTintColor: "",
    contentTintOpacity: 85,
    ...overrides,
  };
}

export function createSamplePages(): PageItem[] {
  const tabsValue = JSON.stringify({
    sections: [
      {
        id: "sample-tab-rules",
        label: "Turn Order",
        blocks: [
          { id: "sample-tb-1", type: "steps", value: "Draw 2 cards from the action deck\nPlay up to 2 cards from your hand\nResolve card effects, then discard played cards\nDraw back up to 5 cards" },
        ],
      },
      {
        id: "sample-tab-setup",
        label: "Setup",
        blocks: [
          { id: "sample-tb-2", type: "steps", value: "Place the board in the center of the table\nEach player picks a color and takes 8 tokens\nShuffle the action deck and deal 5 cards to each player\nThe youngest player goes first" },
        ],
      },
      {
        id: "sample-tab-faq",
        label: "Common Questions",
        blocks: [
          { id: "sample-tb-3", type: "text", value: "**Can I play cards on another player's turn?** No — action cards can only be played on your own turn.\n\n**What if the draw pile runs out?** Shuffle the discard pile to form a new draw pile and continue." },
        ],
      },
    ],
  });

  return [
    // ── Main Page ──────────────────────────────────────────────────────────
    samplePage({
      id: HOME_PAGE_ID,
      kind: "home",
      title: "Home",
      summary: "Tap a hotspot on the board or use the buttons to explore the rules.",
      publicUrl: "https://example.com/rules",
      showQrCode: true,
      interactionType: "full-page",
      blocks: [createBlock("text", "Welcome to Realm Quest! Tap any hotspot on the board image or use the buttons below to dive into the rules.")],
      canvasFeatures: [
        { id: "sample-feat-locale",     type: "locale",      label: "EN",              description: "",                                              linkUrl: "",                    imageUrl: "", optionsText: "English|EN\nEspañol|ES\nFrançais|FR\nDeutsch|DE", x: 94, y:  6 },
        { id: "sample-feat-qr",         type: "qr",          label: "Scan to play",    description: "Scan this QR code to open the live rules.",      linkUrl: "https://example.com/rules", imageUrl: "", optionsText: "", x: 87, y: 14 },
        { id: "sample-feat-heading",    type: "heading",     label: "Realm Quest",     description: "",                                              linkUrl: "",                    imageUrl: "", optionsText: "", x: 22, y: 10 },
        { id: "sample-feat-disclaimer", type: "disclaimer",  label: "2–4 players · Ages 12+ · 45–90 min", description: "Tabletop game by Bee Studio", linkUrl: "",                    imageUrl: "", optionsText: "", x: 22, y: 88 },
        { id: "sample-feat-btn-htp",    type: "page-button", label: "How to Play",     description: "",                                              linkUrl: SAMPLE_HTP_ID,         imageUrl: "", optionsText: "", x: 28, y: 72 },
        { id: "sample-feat-btn-qr",     type: "page-button", label: "Quick Reference", description: "",                                              linkUrl: SAMPLE_QR_ID,          imageUrl: "", optionsText: "", x: 50, y: 82 },
        { id: "sample-feat-btn-faq",    type: "page-button", label: "FAQ",             description: "",                                              linkUrl: SAMPLE_FAQ_ID,         imageUrl: "", optionsText: "", x: 72, y: 72 },
        { id: "sample-feat-dropdown",   type: "dropdown",    label: "Quick Links",     description: "Jump to a specific resource.",                  linkUrl: "",                    imageUrl: "", optionsText: "Rules PDF\nVideo Tutorial\nOfficial Website", x: 80, y: 88 },
        { id: "sample-feat-search",     type: "search",      label: "Search rules…",   description: "",                                              linkUrl: "",                    imageUrl: "", optionsText: "", x: 50, y:  6 },
      ],
    }),

    // ── How to Play — full-page ────────────────────────────────────────────
    samplePage({
      id: SAMPLE_HTP_ID,
      kind: "page",
      title: "How to Play",
      summary: "Learn the rules in a few easy steps.",
      interactionType: "full-page",
      pageButtonPlacement: "bottom",
      x: 28,
      y: 72,
      blocks: [
        createBlock("section", "Setup"),
        createBlock("text", "Place the board in the center of the table. Give each player 8 tokens in their chosen color, then shuffle the action deck and deal 5 cards to each player."),
        createBlock("section", "Taking a Turn"),
        createBlock("steps", "Draw 2 cards from the action deck\nPlay up to 2 cards from your hand\nResolve card effects, then discard played cards\nDraw back up to 5 cards"),
        { ...createBlock("callout", "The first player to capture 5 zones on the board wins! Points are earned by playing zone control cards."), variant: "tip" as const },
      ],
    }),

    // ── Quick Reference — side-sheet ───────────────────────────────────────
    samplePage({
      id: SAMPLE_QR_ID,
      kind: "page",
      title: "Quick Reference",
      summary: "A handy summary of key rules for experienced players.",
      interactionType: "side-sheet",
      pageButtonPlacement: "right",
      x: 50,
      y: 82,
      blocks: [
        createBlock("section", "Card Types"),
        createBlock("text", "**Attack** — Deal damage to an opponent's token in an adjacent zone.\n\n**Move** — Relocate one of your tokens up to 2 zones.\n\n**Fortify** — Place a shield marker on a zone you control.\n\n**Event** — Trigger a board-wide effect described on the card."),
        { ...createBlock("callout", "Hand limit is 5 cards. Discard down to 5 at the end of your turn if you're over the limit."), variant: "info" as const },
      ],
    }),

    // ── FAQ — modal ────────────────────────────────────────────────────────
    samplePage({
      id: SAMPLE_FAQ_ID,
      kind: "page",
      title: "FAQ",
      summary: "Common questions answered.",
      interactionType: "modal",
      pageButtonPlacement: "top",
      x: 72,
      y: 72,
      blocks: [
        createBlock("tabs", tabsValue),
      ],
    }),

    // ── Hotspot: The Playing Field — tooltip ───────────────────────────────
    samplePage({
      id: SAMPLE_HS_FIELD_ID,
      kind: "hotspot",
      title: "The Playing Field",
      summary: "",
      interactionType: "tooltip",
      x: 35,
      y: 45,
      blocks: [
        createBlock("text", "The board is divided into 9 zones arranged in a 3×3 grid. Control a zone by having more tokens there than any opponent."),
      ],
    }),

    // ── Hotspot: Action Cards — side-sheet ────────────────────────────────
    samplePage({
      id: SAMPLE_HS_CARDS_ID,
      kind: "hotspot",
      title: "Action Cards",
      summary: "",
      interactionType: "side-sheet",
      x: 62,
      y: 28,
      blocks: [
        createBlock("text", "Action cards are the core of Realm Quest. Each card has a type (Attack, Move, Fortify, or Event) and a strength value shown in the top corner."),
        { ...createBlock("callout", "You may play a maximum of 2 action cards per turn. Unused cards stay in your hand."), variant: "info" as const },
      ],
    }),
  ];
}

