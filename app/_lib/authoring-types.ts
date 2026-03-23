export type PageKind = "home" | "page" | "hotspot";
export type ContentBlockType = "text" | "image" | "video" | "steps" | "callout";
export type PageButtonPlacement = "top" | "bottom" | "left" | "right" | "stack";
export type InteractionType =
  | "modal"
  | "side-sheet"
  | "tooltip"
  | "full-page"
  | "external-link";
export type PublishStatus = "draft" | "published";
export type CanvasFeatureType =
  | "qr"
  | "logo"
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
  | "full-screen"
  | "external-link";

export type ImageFit = "cover" | "contain" | "fill" | "center";

export type ContentBlock = {
  id: string;
  type: ContentBlockType;
  value: string;
  variant?: "info" | "warning" | "tip";
  imageFit?: ImageFit;
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
  x: number;
  y: number;
};

export type PageItem = {
  id: string;
  kind: PageKind;
  title: string;
  summary: string;
  heroImage: string;
  x: number | null;
  y: number | null;
  contentX: number;
  contentY: number;
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
  fontTheme: "modern" | "editorial" | "friendly";
  surfaceStyle: "glass" | "solid" | "contrast";
  accentColor: string;
  hotspotSize: "small" | "medium" | "large";
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
