import {
  CanvasFeatureType,
  ExperienceStatus,
  InteractionType,
  PageButtonPlacement,
  PageItem,
  PublishStatus,
} from "@/app/_lib/authoring-types";

export function getQrImageUrl(value: string) {
  const data = encodeURIComponent(value || "https://example.com");
  return `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${data}`;
}

export function getPageKindLabel(kind: PageItem["kind"]) {
  switch (kind) {
    case "home":
      return "Main page";
    case "page":
      return "Card";
    case "hotspot":
      return "Image hotspot";
    default:
      return "Card";
  }
}

export function getPageRoleDescription(kind: PageItem["kind"]) {
  switch (kind) {
    case "home":
      return "The main page players see first.";
    case "page":
      return "A card that opens on top of the main page.";
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
      return "Full card";
    case "external-link":
      return "External link";
    default:
      return "Interaction";
  }
}

export function getExperienceStatusLabel(status: ExperienceStatus) {
  return status === "published" ? "Published" : "Draft";
}

export function getExperienceStatusClasses(status: ExperienceStatus) {
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
      return "Card button";
    case "locale":
      return "Language";
    case "search":
      return "Search";
    default:
      return "Feature";
  }
}
