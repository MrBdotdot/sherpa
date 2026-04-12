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
  SocialLink,
  TemplateId,
} from "@/app/_lib/authoring-types";
import { getKnownLocaleLanguage } from "@/app/_lib/localization";

export const APP_VERSION = "v0.20.2";

export type { PatchNote } from "@/app/_lib/patch-notes";
export { PATCH_NOTES } from "@/app/_lib/patch-notes";

export const HOME_PAGE_ID = "home-page";
export const DEFAULT_HERO =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?q=80&w=1600&auto=format&fit=crop";

export function getHomePage(pages: PageItem[]): PageItem | null {
  return pages.find((page) => page.kind === "home") ?? pages[0] ?? null;
}

export function getHomePageId(pages: PageItem[], fallback = HOME_PAGE_ID): string {
  return getHomePage(pages)?.id ?? fallback;
}

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
  return `${prefix}-${crypto.randomUUID()}`;
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
        linkUrl: "",
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
        label: "Heading",
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
        label: "Primary action",
        description: "Link to a store, landing page, or signup form.",
        linkUrl: "",
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
        optionsText: "",
        x: 50,
        y: 18,
      };
    case "page-button":
      return {
        id: createId("feature"),
        type,
        label: "Card button",
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
        label: "Element",
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
    interactionType: "full-page",
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

/**
 * Creates a PageItem from structured importer data.
 * `kind` defaults to "page"; `interactionType` defaults to "modal".
 */
export function createImportedPage(
  title: string,
  kind: PageItem["kind"] = "page",
  interactionType: InteractionType = "modal",
  blocks: ContentBlock[],
  count: number,
): PageItem {
  return {
    id: createId(kind),
    kind,
    title: title || `Page ${count}`,
    summary: "",
    heroImage: DEFAULT_HERO,
    x: null,
    y: null,
    contentX: 50,
    contentY: 50,
    blocks,
    socialLinks: [],
    publicUrl: "",
    showQrCode: false,
    interactionType,
    pageButtonPlacement: "bottom",
    templateId: "blank",
    canvasFeatures: [],
    cardSize: "medium",
    contentTintColor: "",
    contentTintOpacity: 85,
  };
}

export function createInitialPages({
  defaultLanguageCode = "EN",
  gameName = "Untitled Game",
}: {
  defaultLanguageCode?: string;
  gameName?: string;
} = {}): PageItem[] {
  const defaultLanguage = getKnownLocaleLanguage(defaultLanguageCode) ?? {
    code: defaultLanguageCode.trim().toUpperCase() || "EN",
    label: defaultLanguageCode.trim().toUpperCase() || "EN",
  };
  const starterPage = createStandardPage(1);
  starterPage.title = "Rules overview";
  starterPage.blocks = [
    createBlock(
      "text",
      `Start writing the ${defaultLanguage.label.toLowerCase()} version of your rules here.`
    ),
  ];
  const localeFeature = createCanvasFeature("locale");
  localeFeature.label = defaultLanguage.code;
  localeFeature.optionsText = `${defaultLanguage.label}|${defaultLanguage.code}`;

  return [
    {
      ...createBasePage({
        kind: "home",
        title: "Home",
        summary: `Welcome to ${gameName}.`,
        blocks: [],
        publicUrl: "",
        showQrCode: false,
        interactionType: "full-page",
      }),
      id: createId("home"),
      canvasFeatures: [
        localeFeature,
        {
          ...createCanvasFeature("heading"),
          label: gameName,
          description: "Build your rules experience from here.",
          x: 20,
          y: 10,
        },
        {
          ...createCanvasFeature("page-button"),
          label: starterPage.title,
          linkUrl: starterPage.id,
          x: 50,
          y: 84,
        },
      ],
    },
    starterPage,
  ];
}

/**
 * Creates an initial pages array with only the home page — no starter card.
 * Used when creating a new game so the empty-canvas overlay can appear.
 */
export function createInitialHomePage({
  defaultLanguageCode = "EN",
  gameName = "Untitled Game",
}: {
  defaultLanguageCode?: string;
  gameName?: string;
} = {}): PageItem[] {
  const defaultLanguage = getKnownLocaleLanguage(defaultLanguageCode) ?? {
    code: defaultLanguageCode.trim().toUpperCase() || "EN",
    label: defaultLanguageCode.trim().toUpperCase() || "EN",
  };
  const localeFeature = createCanvasFeature("locale");
  localeFeature.label = defaultLanguage.code;
  localeFeature.optionsText = `${defaultLanguage.label}|${defaultLanguage.code}`;

  return [
    {
      ...createBasePage({
        kind: "home",
        title: "Home",
        summary: `Welcome to ${gameName}.`,
        blocks: [],
        publicUrl: "",
        showQrCode: false,
        interactionType: "full-page",
      }),
      id: createId("home"),
      canvasFeatures: [
        localeFeature,
        {
          ...createCanvasFeature("heading"),
          label: gameName,
          description: "Import your rulebook or start blank.",
          x: 20,
          y: 10,
        },
      ],
    },
  ];
}

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
  const sampleIds = {
    home: createId("home"),
    howToPlay: createId("sample-page"),
    quickReference: createId("sample-page"),
    faq: createId("sample-page"),
    trailer: createId("sample-page"),
    gallery: createId("sample-page"),
    buy: createId("sample-page"),
    kitchenHotspot: createId("sample-hotspot"),
    cardsHotspot: createId("sample-hotspot"),
  };

  const faqTabsValue = JSON.stringify({
    sections: [
      {
        id: "sample-tab-turns",
        label: "Turn Order",
        blocks: [
          { id: "sample-tb-1", type: "steps", value: "Draw 2 cards from the action deck\nPlay up to 2 cards from your hand\nResolve card effects in order\nDiscard played cards, draw back to 5" },
        ],
      },
      {
        id: "sample-tab-setup",
        label: "Setup",
        blocks: [
          { id: "sample-tb-2", type: "steps", value: "Place the Ugly Pickle board in the center\nEach player picks a color and takes their meeples\nShuffle the action deck and deal 5 cards each\nYoungest player goes first" },
        ],
      },
      {
        id: "sample-tab-faq",
        label: "FAQs",
        blocks: [
          { id: "sample-tb-3", type: "text", value: "**Can I play cards on another player's turn?** No — action cards can only be played on your own turn.\n\n**What if the draw pile runs out?** Shuffle the discard pile to form a new draw pile.\n\n**Can I win mid-turn?** Yes — check victory conditions the moment they're met." },
        ],
      },
    ],
  });

  const carouselValue = JSON.stringify({
    slides: [
      { id: "slide-net", label: "The Net Zone", blocks: [{ id: "sl-b-1", type: "text", value: "The center net zone is contested — the first to occupy it gains the Pressure Meter advantage." }] },
      { id: "slide-kitchen", label: "The Kitchen", blocks: [{ id: "sl-b-2", type: "text", value: "You can't volley from the kitchen. Step out before striking!" }] },
      { id: "slide-erne", label: "The ERNE", blocks: [{ id: "sl-b-3", type: "text", value: "Jump around the post and land outside the kitchen for a legal surprise shot." }] },
    ],
  });

  return [
    // ── Board ──────────────────────────────────────────────────────────────
    // Covers: all 9 canvas feature types
    samplePage({
      id: sampleIds.home,
      kind: "home",
      title: "Home",
      summary: "Tap a zone on the board or use the buttons to explore the rules.",
      publicUrl: "https://example.com/rules",
      showQrCode: true,
      interactionType: "full-page",
      blocks: [createBlock("text", "Welcome to Ugly Pickle! Tap any hotspot on the board or use the buttons to dive in.")],
      canvasFeatures: [
        { id: "sample-feat-locale",     type: "locale",      label: "EN",           description: "",                                               linkUrl: "",                           imageUrl: "", optionsText: "English|EN\nEspañol|ES\nFrançais|FR\nDeutsch|DE",            x: 94, y:  5 },
        { id: "sample-feat-search",     type: "search",      label: "Search rules…", description: "",                                              linkUrl: "",                           imageUrl: "", optionsText: "",                                                        x: 50, y:  6 },
        { id: "sample-feat-heading",    type: "heading",     label: "Ugly Pickle",  description: "A pickleball board game",                        linkUrl: "",                           imageUrl: "", optionsText: "",                                                        x: 20, y: 10 },
        { id: "sample-feat-qr",         type: "qr",          label: "Scan to play", description: "Scan to open the live rules experience.",        linkUrl: "https://example.com/rules",  imageUrl: "", optionsText: "",                                                        x: 86, y: 14 },
        { id: "sample-feat-btn-htp",    type: "page-button", label: "How to Play",  description: "",                                              linkUrl: sampleIds.howToPlay,          imageUrl: "", optionsText: "",                                                        x: 22, y: 74 },
        { id: "sample-feat-btn-qr",     type: "page-button", label: "Quick Ref",    description: "",                                              linkUrl: sampleIds.quickReference,     imageUrl: "", optionsText: "",                                                        x: 42, y: 82 },
        { id: "sample-feat-btn-faq",    type: "page-button", label: "FAQ",          description: "",                                              linkUrl: sampleIds.faq,                imageUrl: "", optionsText: "",                                                        x: 60, y: 82 },
        { id: "sample-feat-btn-trailer",type: "page-button", label: "Trailer",      description: "",                                              linkUrl: sampleIds.trailer,            imageUrl: "", optionsText: "",                                                        x: 78, y: 74 },
        { id: "sample-feat-dropdown",   type: "dropdown",    label: "Quick Links",  description: "",                                              linkUrl: "",                           imageUrl: "", optionsText: "Rules PDF|https://example.com/rules.pdf\nGame Trailer|https://example.com/trailer\nBuy the Game|https://example.com/buy", x: 86, y: 82 },
        { id: "sample-feat-disclaimer", type: "disclaimer",  label: "2–4 players · Ages 12+ · 30–60 min", description: "© Bee Studio. Not affiliated with USA Pickleball.", linkUrl: "", imageUrl: "", optionsText: "",                                                        x: 20, y: 90 },
      ],
    }),

    // ── How to Play — full-page ────────────────────────────────────────────
    // Covers: section, text (bold/links), steps (numbered list), step-rail, callout (tip)
    samplePage({
      id: sampleIds.howToPlay,
      kind: "page",
      title: "How to Play",
      summary: "Learn Ugly Pickle in under 5 minutes.",
      interactionType: "full-page",
      pageButtonPlacement: "bottom",
      x: 22,
      y: 74,
      blocks: [
        createBlock("section", "The Goal"),
        createBlock("text", "Ugly Pickle is a 2–4 player pickleball board game. Win by scoring 11 points before your opponents. Points are earned by out-maneuvering opponents with action cards.\n\nCheck the [Quick Ref](#) for card types or the [FAQ](#) for common questions."),
        createBlock("section", "Setup"),
        createBlock("steps", "Place the Ugly Pickle board in the center of the table\nEach player picks a color and takes their meeples\nShuffle the action deck and deal 5 cards to each player\nThe youngest player serves first"),
        createBlock("section", "Taking a Turn"),
        createBlock("step-rail", JSON.stringify({
          orientation: "vertical",
          iconShape: "circle",
          showPing: false,
          steps: [
            { id: "sr-1", label: "Draw 2 cards from the action deck", color: "#3b82f6", iconImageUrl: "", sectionBlockId: "" },
            { id: "sr-2", label: "Play up to 2 cards from your hand", color: "#8b5cf6", iconImageUrl: "", sectionBlockId: "" },
            { id: "sr-3", label: "Resolve card effects in order played", color: "#f59e0b", iconImageUrl: "", sectionBlockId: "" },
            { id: "sr-4", label: "Discard played cards, draw back to 5", color: "#10b981", iconImageUrl: "", sectionBlockId: "" },
          ],
        })),
        { ...createBlock("callout", "First to 11 points wins — but you must win by 2. Use the Pressure Meter on the board to track momentum shifts!"), variant: "tip" as const },
      ],
    }),

    // ── Quick Reference — side-sheet ──────────────────────────────────────
    // Covers: section, text (bold), callout (info + warning), side-sheet interaction
    samplePage({
      id: sampleIds.quickReference,
      kind: "page",
      title: "Quick Reference",
      summary: "The fast-lookup card for experienced players.",
      interactionType: "side-sheet",
      pageButtonPlacement: "right",
      x: 42,
      y: 82,
      blocks: [
        createBlock("section", "Card Types"),
        createBlock("text", "**Serve** — Start a rally. Must land in the opposite service box.\n\n**Dink** — Soft shot into the kitchen. Forces opponent forward.\n\n**Drive** — Aggressive groundstroke. High risk, high reward.\n\n**ERNE** — Leap around the post for a surprise volley.\n\n**Lob** — Send the ball deep to push opponents back."),
        { ...createBlock("callout", "Hand limit is 5 cards. Discard down to 5 at the end of your turn. See [How to Play](#) for the full turn sequence."), variant: "info" as const },
        createBlock("section", "Kitchen Rules"),
        createBlock("text", "You cannot volley (hit out of the air) while standing in the kitchen zone. You **must** let the ball bounce first."),
        { ...createBlock("callout", "Stepping into the kitchen during a volley is an automatic fault — your opponent scores the point."), variant: "warning" as const },
      ],
    }),

    // ── FAQ — modal ───────────────────────────────────────────────────────
    // Covers: tabs block (each tab has steps or text), modal interaction
    samplePage({
      id: sampleIds.faq,
      kind: "page",
      title: "FAQ",
      summary: "Common questions about Ugly Pickle.",
      interactionType: "modal",
      pageButtonPlacement: "top",
      x: 60,
      y: 82,
      blocks: [
        createBlock("tabs", faqTabsValue),
      ],
    }),

    // ── Game Trailer — bottom-sheet ───────────────────────────────────────
    // Covers: video block, bottom-sheet interaction
    samplePage({
      id: sampleIds.trailer,
      kind: "page",
      title: "Game Trailer",
      summary: "Watch the Ugly Pickle launch trailer.",
      interactionType: "bottom-sheet",
      pageButtonPlacement: "stack",
      x: 78,
      y: 74,
      blocks: [
        createBlock("video", ""),
        createBlock("text", "Ugly Pickle — the pickleball board game that brings the fastest-growing sport to your table. 2–4 players, ages 12+."),
      ],
    }),

    // ── Zone Guide — modal ────────────────────────────────────────────────
    // Covers: carousel block (image blocks inside slides), modal interaction variant
    samplePage({
      id: sampleIds.gallery,
      kind: "page",
      title: "Zone Guide",
      summary: "A tour of each zone on the Ugly Pickle board.",
      interactionType: "modal",
      pageButtonPlacement: "left",
      x: 50,
      y: 60,
      blocks: [
        createBlock("carousel", carouselValue),
        { ...createBlock("callout", "Tap each zone on the board image to get a hotspot tooltip for that specific area."), variant: "info" as const },
      ],
    }),

    // ── Buy the Game — external-link ──────────────────────────────────────
    // Covers: external-link interaction type
    samplePage({
      id: sampleIds.buy,
      kind: "page",
      title: "Buy the Game",
      summary: "Get Ugly Pickle at your local game store or online.",
      interactionType: "external-link",
      publicUrl: "https://example.com/buy",
      pageButtonPlacement: "right",
      x: 90,
      y: 50,
      blocks: [],
    }),

    // ── Hotspot: The Kitchen — tooltip ────────────────────────────────────
    // Covers: tooltip interaction, hotspot kind
    samplePage({
      id: sampleIds.kitchenHotspot,
      kind: "hotspot",
      title: "The Kitchen",
      summary: "",
      interactionType: "tooltip",
      x: 38,
      y: 52,
      blocks: [
        createBlock("text", "The non-volley zone (NVZ). You cannot hit the ball out of the air while standing here — let it bounce first."),
      ],
    }),

    // ── Hotspot: Action Cards — side-sheet ────────────────────────────────
    // Covers: side-sheet interaction on a hotspot, callout (info)
    samplePage({
      id: sampleIds.cardsHotspot,
      kind: "hotspot",
      title: "Action Cards",
      summary: "",
      interactionType: "side-sheet",
      x: 64,
      y: 30,
      blocks: [
        createBlock("text", "Action cards are the heart of Ugly Pickle. Each card has a type (Serve, Dink, Drive, ERNE, or Lob) and a point value shown in the corner."),
        { ...createBlock("callout", "You may play up to 2 action cards per turn. Unplayed cards stay in your hand until your next turn."), variant: "info" as const },
      ],
    }),
  ];
}
