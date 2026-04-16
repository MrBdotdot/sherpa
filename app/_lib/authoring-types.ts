export type PageKind = "home" | "page" | "hotspot";
export type LayoutMode = "desktop" | "mobile-landscape" | "mobile-portrait";
export type MobileLayoutMode = Exclude<LayoutMode, "desktop">;
export type InspectorTab = "overview" | "board" | "settings" | "guide";
export type ContentBlockType = "text" | "image" | "video" | "steps" | "callout" | "consent" | "tabs" | "section" | "step-rail" | "carousel";
export type PageButtonPlacement = "top" | "bottom" | "left" | "right" | "stack";
export type InteractionType =
  | "modal"
  | "side-sheet"
  | "bottom-sheet"
  | "tooltip"
  | "full-page"
  | "external-link";
export type ExperienceStatus = "draft" | "published";
export type TranslationMap = Record<string, Record<string, string>>;
export type CanvasFeatureType =
  | "qr"
  | "image"
  | "heading"
  | "disclaimer"
  | "button"
  | "dropdown"
  | "page-button"
  | "locale"
  | "search"
  | "anchor-pin";
export type TemplateId =
  | "blank"
  | "how-to-play"
  | "full-rules"
  | "faq"
  | "legal"
  | "social-cta";

export type DisplayStyleKey =
  | "tooltip"
  | "compact-card"
  | "card"
  | "large-card"
  | "wide-card"
  | "side-sheet"
  | "wide-side-sheet"
  | "bottom-sheet"
  | "full-screen"
  | "external-link";

export type ImageFit = "cover" | "contain" | "fill" | "center";

export type AnchorTarget = {
  id: string;        // block.id — the DOM element id to scroll to
  label: string;     // block.value — display text in picker and inserted link
  pageId: string;    // which card this heading lives on
  pageTitle: string; // card title — shown as group header for cross-card entries
  kind: "h2" | "h3" | "section";
};

export type ImageBlockHotspot = {
  id: string;
  x: number;   // 0–100 percentage from left edge of image
  y: number;   // 0–100 percentage from top edge of image
  label: string;
  content: string;
};

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  value: string;
  variant?: "info" | "warning" | "tip";
  imageFit?: ImageFit;
  imageCaption?: string;
  /** Max-width in pixels; undefined = full width */
  imageSize?: number;
  imageLightbox?: boolean;
  imageHotspots?: ImageBlockHotspot[];
  blockWidth?: "full" | "half";
  textAlign?: "left" | "center" | "right";
  verticalAlign?: "top" | "middle" | "bottom";
  blockFormat?: "prose" | "h2" | "h3" | "bullets" | "steps";
  imagePosition?: { x: number; y: number };
};

export type SocialLink = {
  id: string;
  label: string;
  url: string;
  /** "external" = open URL in new tab; "page" = navigate to an internal card; "email" = mailto: link */
  linkMode?: "external" | "page" | "email";
  /** pageId to navigate to when linkMode === "page" */
  linkPageId?: string;
};

export type CanvasFeature = {
  id: string;
  type: CanvasFeatureType;
  label: string;
  description: string;
  linkUrl: string;
  imageUrl: string;
  optionsText: string;
  logoSize?: number;
  qrSize?: number;
  qrBgColor?: string;
  qrBgOpacity?: number;
  x: number;
  y: number;
  mobileX?: number;
  mobileY?: number;
  originLayout?: LayoutMode;
  layoutOverrides?: Partial<Record<MobileLayoutMode, CanvasFeatureLayoutOverride>>;
  /** In portrait mode, "content" renders in the content zone; undefined renders in the image strip */
  portraitZone?: "content";
  /** For button type only: whether it links to an external URL or an internal content block */
  buttonLinkMode?: "external" | "page";
  /** For heading type: custom text color hex */
  headingColor?: string;
  /** For heading type: size variant */
  headingSize?: "small" | "medium" | "large";
  /** For button type: visual hierarchy variant */
  buttonVariant?: "primary" | "secondary" | "tertiary";
  /** For button type: custom background color (hex). Primary/secondary: bg color, text auto-contrasts. Tertiary: text/underline color. */
  buttonBgColor?: string;
};

export type CanvasFeatureLayoutOverride = {
  x?: number;
  y?: number;
  hidden?: boolean;
  portraitZone?: "content";
  logoSize?: number;
  qrSize?: number;
};

export type CanvasFeatureField =
  | "label" | "description" | "linkUrl" | "imageUrl" | "optionsText"
  | "logoSize" | "qrSize" | "qrBgColor" | "qrBgOpacity" | "portraitZone" | "buttonLinkMode"
  | "headingColor" | "headingSize" | "buttonVariant" | "buttonBgColor";

export type PageItem = {
  id: string;
  kind: PageKind;
  title: string;
  summary: string;
  heroImage: string;
  x: number | null;
  y: number | null;
  mobileX?: number | null;
  mobileY?: number | null;
  contentX: number;
  contentY: number;
  mobileContentX?: number;
  mobileContentY?: number;
  blocks: ContentBlock[];
  socialLinks: SocialLink[];
  publicUrl: string;
  showQrCode: boolean;
  interactionType: InteractionType;
  pageButtonPlacement: PageButtonPlacement;
  templateId: TemplateId;
  canvasFeatures: CanvasFeature[];
  cardSize: "compact" | "medium" | "xl" | "large";
  contentTintColor: string;
  contentTintOpacity: number;
  /** 3D world-space position for hotspots placed on a 3D model background [x, y, z] */
  worldPosition?: [number, number, number];
  /** Surface normal at the hotspot's placement point, used for visibility culling [x, y, z] */
  worldNormal?: [number, number, number];
  /** For hotspot kind: whether tapping opens the hotspot's own card or navigates to a section in another card */
  hotspotMode?: "card" | "section";
  /** For hotspot kind in section mode: the card to navigate to */
  hotspotTargetPageId?: string;
  /** For hotspot kind in section mode: the block ID of the section within the target card */
  hotspotTargetSectionId?: string;
  /** For hotspot kind in card mode: auto-scroll to this block ID when the card opens */
  hotspotScrollSectionId?: string;
};

export type GuideStep = {
  id: string;
  label: string;
  pageId: string;            // PageItem to open (any kind except "home")
  anchorHotspotId?: string;  // hotspot to pulse on board before opening card
};

export type Guide = {
  id: string;
  name: string;
  steps: GuideStep[];
};

export type DragState = {
  id: string;
  pointerOffsetX: number;
  pointerOffsetY: number;
};

export type SystemSettings = {
  fontTheme: "modern" | "editorial" | "friendly" | "mono" | "geometric" | "display";
  surfaceStyle: "glass" | "solid" | "contrast";
  accentColor: string;
  defaultLanguageCode?: string;
  gameIcon?: string;
  hotspotSize: "small" | "medium" | "large";
  translations?: TranslationMap;
  introScreen?: {
    enabled: boolean;
    youtubeUrl: string;
  };
  portraitLayout?: "split" | "full";  // split = image strip + content zone; full = portrait image fills entire canvas
  portraitSplitRatio?: number;  // % of canvas height for image strip (default 55, range 40–75)
  portraitBackground?: string;  // CSS color for the content zone (default "#1a1a2e")
  /** Canvas background type: "image" (default 2D hero) or "model-3d" (interactive 3D GLB) */
  backgroundType?: "image" | "model-3d";
  /** URL or object URL of the .glb / .gltf model to use when backgroundType is "model-3d" */
  modelUrl?: string;
  /** User scale multiplier applied on top of auto-fit normalisation (default 1.0) */
  modelScale?: number;
  /** Initial Y-axis rotation of the model in degrees — sets which face greets the viewer (default 0) */
  modelRotationY?: number;
  /** Initial X-axis tilt of the model in degrees (default 0) */
  modelRotationX?: number;
  /** Environment / lighting preset; "none" uses plain directional lights */
  modelEnvironment?: "none" | "apartment" | "city" | "dawn" | "forest" | "lobby" | "night" | "park" | "studio" | "sunset" | "warehouse";
/** Brand color palette — hex strings (up to 8); used as quick-picks in color pickers and to auto-style assets */
  brandColors?: string[];
  /** Dark mode for the player experience */
  darkMode?: boolean;
  /** Cache the 3D model file on the player's device for offline use */
  cache3dModels?: boolean;
  /** Page ID to open automatically when the player loads the experience. Opens every visit. */
  autoOpenPageId?: string;
  /** Author-defined CSS injected into the player. Scoped to .sherpa-player. */
  customCss?: string;
  /** Page IDs whose auto-migrated page-button has been intentionally dismissed — migration skips these */
  dismissedPageButtonTargets?: string[];
  guides?: Guide[];
  activeGuideId?: string;
  guideNavPosition?: "left" | "top";
};

export type PageTemplate = {
  id: TemplateId;
  title: string;
  summary: string;
  description: string;
  blocks: Array<{
    type: ContentBlockType;
    value: string;
  }>;
  socialLinks?: Array<{
    label: string;
    url: string;
  }>;
  publicUrl?: string;
  showQrCode?: boolean;
  interactionType: InteractionType;
  pageButtonPlacement: PageButtonPlacement;
};
