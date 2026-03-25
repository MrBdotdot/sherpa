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

export const APP_VERSION = "v0.8.4";

export type PatchNote = {
  version: string;
  date: string;
  changes: string[];
};

export const PATCH_NOTES: PatchNote[] = [
  {
    version: "v0.8.4",
    date: "2026-03-24",
    changes: [
      "QR code background color replaced border color — set any hex color with adjustable opacity",
      "QR code card padding reduced by half for a tighter, less bulky appearance",
    ],
  },
  {
    version: "v0.8.3",
    date: "2026-03-24",
    changes: [
      "QR code canvas element now has a size slider (60–240px) to control both the image and container width",
      "QR code label is now centered below the image",
      "Background border replaced with a border color picker — set any hex color or clear to remove the border",
    ],
  },
  {
    version: "v0.8.2",
    date: "2026-03-24",
    changes: [
      "Canvas elements can now be assigned to the portrait content zone via zone toggle in the Surface inspector",
      "Content zone features render above ContentModule (z-20) and are draggable within the content zone in layout edit mode",
      "Image strip now only renders features assigned to the strip (not content zone features)",
    ],
  },
  {
    version: "v0.8.1",
    date: "2026-03-24",
    changes: [
      "Portrait mode now renders a split canvas: content zone (top) + image strip with hotspots (bottom) — keeps tappable controls in thumb reach",
      "ContentModule fills the portrait content zone instead of floating as an overlay card",
      "Portrait split ratio is adjustable (35–75%) via Setup tab — defaults to 55% image strip",
      "Portrait content zone background is configurable via Setup tab — defaults to #1a1a2e",
      "Drag and hotspot creation coordinates in portrait are relative to the image strip, not the full canvas",
    ],
  },
  {
    version: "v0.8.0",
    date: "2026-03-24",
    changes: [
      "Added dual-layout authoring: hotspots, canvas features, and content card positions can now be set independently for Desktop/Landscape and Portrait orientations",
      "Canvas toolbar now shows a centered 3-way segmented toggle: Desktop, Landscape, Portrait — replaces the single Mobile toggle button",
      "Portrait mode uses mobile-specific coordinates (mobileX/Y, mobileContentX/Y) with automatic fallback to desktop positions until manually adjusted",
      "New hotspots created in portrait mode are seeded with the same position in both coordinate sets so nothing starts out of place",
    ],
  },
  {
    version: "v0.7.4",
    date: "2026-03-24",
    changes: [
      "Fixed layout overflow at 1024px — canvas+inspector grid now activates at 1280px (xl) where there is enough room, preventing horizontal scroll on laptops",
      "Added page navigation to mobile/tablet header — a select dropdown lets you switch between all pages without needing the sidebar",
      "Inspector overlay on mobile no longer shows a redundant preview canvas inside the modal",
      "Canvas wrapper padding reduced on small screens (8px/16px on mobile, 20px on md+) to reclaim usable canvas space",
    ],
  },
  {
    version: "v0.7.3",
    date: "2026-03-24",
    changes: [
      "Modal panels now cap at 80% of canvas height and scroll internally — tall content no longer overflows the canvas on small screens",
      "External link card now has a max-width cap to match all other form factors",
    ],
  },
  {
    version: "v0.7.2",
    date: "2026-03-24",
    changes: [
      "New form factor: Bottom sheet — full-width panel that slides up from the bottom edge",
      "Bottom sheet has a drag-handle pill, scrollable content area (capped at 65% of canvas height), and rounded top corners",
      "Available in the display style picker for all container types",
    ],
  },
  {
    version: "v0.7.1",
    date: "2026-03-24",
    changes: [
      "Fixed 'Extra wide' panel width — was using 70% of canvas (narrower than Large at 660px at typical sizes), now fixed at 800px",
      "Renamed modal display styles to a clear size scale: Compact (360px) → Standard (520px) → Large (660px) → Extra wide (800px)",
      "Renamed 'Side sheet' → 'Side panel' and 'Wide side sheet' → 'Wide side panel' for consistency",
      "Display style descriptions now include pixel widths for reference",
    ],
  },
  {
    version: "v0.7.0",
    date: "2026-03-24",
    changes: [
      "Intro screen: paste a YouTube URL to play a full-screen cover video before the experience opens",
      "Black cover hides YouTube's loading UI and fades out when the video starts playing",
      "'Tap anywhere to start' prompt at the bottom of the intro screen",
      "Experience assets (images, videos) preload silently in the background during the intro",
      "Intro screen can be enabled or disabled from the Setup tab — Global section",
    ],
  },
  {
    version: "v0.6.0",
    date: "2026-03-23",
    changes: [
      "Text linking system: surround text with ((label|pageId)) to create tappable inline links that surface containers",
      "Autocomplete dropdown appears when typing (( in text blocks, listing matching pages",
      "Text links render bold in the accent color",
      "Removed all canvas positioning restrictions — hotspots and elements can be placed anywhere",
      "Moved + Template button from sidebar into the Setup tab",
      "Add canvas element and Add content block buttons now match secondary button style",
      "Full-page containers now center content vertically and horizontally",
      "Hotspot dragging gated behind layout edit mode only",
      "Dragging a hotspot or element in edit mode no longer triggers its container interaction",
      "Content module remains visible and repositionable in edit mode",
    ],
  },
  {
    version: "v0.5.9",
    date: "2026-03-23",
    changes: [
      "Fixed side-sheet and full-page animation — wrong transform was applied when pages of hotspot kind used these styles",
      "Canvas background click now dismisses an open container instead of creating a new hotspot",
      "Removed touchAction:none from side-sheet/full-page so touch-scroll works inside them",
    ],
  },
  {
    version: "v0.5.8",
    date: "2026-03-22",
    changes: ["Removed intro text field from Content and Setup tabs"],
  },
  {
    version: "v0.5.7",
    date: "2026-03-22",
    changes: [
      "Replaced multi-line intro text areas with single-line text inputs in Content tab and Setup tab",
    ],
  },
  {
    version: "v0.5.6",
    date: "2026-03-22",
    changes: [
      "Creating a new container now automatically adds a page button to the canvas and the Page buttons panel",
      "Deleting a container now also removes its page button from the canvas",
    ],
  },
  {
    version: "v0.5.5",
    date: "2026-03-22",
    changes: [
      "Removed all blur effects — all surface elements now use solid backgrounds",
      "Fixed container position mismatch between layout edit mode and normal mode — 'Content module' label no longer shifts the card position",
    ],
  },
  {
    version: "v0.5.4",
    date: "2026-03-22",
    changes: [
      "Fixed blurry hotspot label text on small and medium marker sizes",
      "Fixed canvas darkening overlay appearing when exiting layout edit mode — veil now only shows when a visitor opens hotspot content in preview mode",
    ],
  },
  {
    version: "v0.5.3",
    date: "2026-03-22",
    changes: [
      "Fixed live preview — edits to text, container size, and content blocks now reflect instantly without clicking away",
      "Creating a hotspot now automatically opens the Content tab in the inspector",
    ],
  },
  {
    version: "v0.5.2",
    date: "2026-03-22",
    changes: [
      "Fixed changelog modal parse error causing sidebar to break",
      "Removed duplicate Display style selector from Setup tab (it lives in Content tab)",
    ],
  },
  {
    version: "v0.5.1",
    date: "2026-03-22",
    changes: [
      "Added in-app changelog modal — click the version badge in the sidebar to view patch notes",
      "Fixed hydration mismatch crash caused by random page IDs on server vs client",
      "Fixed CSS build error from bare custom properties outside a selector",
    ],
  },
  {
    version: "v0.5.0",
    date: "2026-03-22",
    changes: [
      "Container open/close animations with expo easing (wipe-in for side-sheet and full-page, scale-fade for modal and tooltip)",
      "Image blocks now support fill, fit, stretch, and center-crop display modes",
      "Markdown info icon replaces the write/preview toggle in text blocks",
      "Canvas content module extracted into its own component",
      "Back button repositioned per container type (sticky inside full-page, top-right for side-sheet, floating above modal/tooltip)",
      "Type tags removed from container headers",
    ],
  },
];
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
  return {
    id: createId("block"),
    type,
    value,
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
    case "logo":
      return {
        id: createId("feature"),
        type,
        label: "Brand Logo",
        description: "link",
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
    case "logo":
      return "Logo";
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
