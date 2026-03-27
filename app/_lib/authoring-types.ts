export type PageKind = "home" | "page" | "hotspot";
export type LayoutMode = "desktop" | "mobile-landscape" | "mobile-portrait";
export type ContentBlockType = "text" | "image" | "video" | "steps" | "callout" | "consent" | "tabs" | "section" | "step-rail" | "carousel";
export type PageButtonPlacement = "top" | "bottom" | "left" | "right" | "stack";
export type InteractionType =
  | "modal"
  | "side-sheet"
  | "bottom-sheet"
  | "tooltip"
  | "full-page"
  | "external-link";
export type PublishStatus = "draft" | "published";
export type ExperienceStatus = "draft" | "published";
export type CanvasFeatureType =
  | "qr"
  | "image"
  | "heading"
  | "disclaimer"
  | "button"
  | "dropdown"
  | "page-button"
  | "locale";
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

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  value: string;
  variant?: "info" | "warning" | "tip";
  imageFit?: ImageFit;
  imageCaption?: string;
  imageSize?: "small" | "medium" | "large";
  imageLightbox?: boolean;
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
  /** In portrait mode, "content" renders in the content zone; undefined renders in the image strip */
  portraitZone?: "content";
  /** For button type only: whether it links to an external URL or an internal content block */
  buttonLinkMode?: "external" | "page";
};

export type CanvasFeatureField =
  | "label" | "description" | "linkUrl" | "imageUrl" | "optionsText"
  | "logoSize" | "qrSize" | "qrBgColor" | "qrBgOpacity" | "portraitZone" | "buttonLinkMode";

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
  publishStatus: PublishStatus;
  pageButtonPlacement: PageButtonPlacement;
  templateId: TemplateId;
  canvasFeatures: CanvasFeature[];
  cardSize: "compact" | "medium" | "xl" | "large";
  contentTintColor: string;
  contentTintOpacity: number;
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
  hotspotSize: "small" | "medium" | "large";
  introScreen?: {
    enabled: boolean;
    youtubeUrl: string;
  };
  portraitLayout?: "split" | "full";  // split = image strip + content zone; full = portrait image fills entire canvas
  portraitSplitRatio?: number;  // % of canvas height for image strip (default 55, range 40–75)
  portraitBackground?: string;  // CSS color for the content zone (default "#1a1a2e")
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
