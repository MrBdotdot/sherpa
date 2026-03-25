import { createCanvasFeature } from "@/app/_lib/authoring-utils";
import { CanvasFeature, PageItem, SystemSettings } from "@/app/_lib/authoring-types";

const STORAGE_KEY = "sherpa-v1";

export function loadPersistedState(): { pages: PageItem[]; systemSettings: SystemSettings } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function migrateLocaleFeature(pages: PageItem[]): PageItem[] {
  const homePage = pages.find((p) => p.kind === "home");
  if (!homePage) return pages;
  if (homePage.canvasFeatures.some((f) => f.type === "locale")) return pages;
  const locale = createCanvasFeature("locale");
  return pages.map((page) =>
    page.id === homePage.id
      ? { ...page, canvasFeatures: [...page.canvasFeatures, locale] }
      : page
  );
}

export function migratePageButtons(pages: PageItem[]): PageItem[] {
  const homePage = pages.find((p) => p.kind === "home");
  if (!homePage) return pages;

  const navPages = pages.filter((p) => p.kind === "page");
  const existingTargetIds = new Set(
    homePage.canvasFeatures
      .filter((f) => f.type === "page-button")
      .map((f) => f.linkUrl)
  );

  const placementPos: Record<string, [number, number]> = {
    top: [50, 8],
    bottom: [50, 88],
    left: [12, 50],
    right: [88, 50],
    stack: [50, 50],
  };

  const newButtons: CanvasFeature[] = navPages
    .filter((p) => !existingTargetIds.has(p.id))
    .map((p) => {
      const [bx, by] =
        p.x !== null && p.y !== null
          ? [p.x, p.y]
          : placementPos[p.pageButtonPlacement] ?? [50, 85];
      return {
        id: `feature-migrated-${p.id}`,
        type: "page-button" as const,
        label: p.title || "Page",
        description: "",
        linkUrl: p.id,
        imageUrl: "",
        optionsText: "",
        x: bx,
        y: by,
      };
    });

  if (newButtons.length === 0) return pages;

  return pages.map((page) =>
    page.id === homePage.id
      ? { ...page, canvasFeatures: [...page.canvasFeatures, ...newButtons] }
      : page
  );
}
