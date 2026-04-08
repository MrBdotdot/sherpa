import { createCanvasFeature, createId } from "@/app/_lib/authoring-utils";
import { CanvasFeature, ContentBlock, PageItem, SystemSettings } from "@/app/_lib/authoring-types";

const STORAGE_KEY = "sherpa-v2";

export function loadPersistedState(): { pages: PageItem[]; systemSettings: SystemSettings } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function isEphemeralUrl(value: string | undefined) {
  return typeof value === "string" && value.startsWith("blob:");
}

function sanitizeBlockForPersistence(block: ContentBlock): ContentBlock {
  if ((block.type === "image" || block.type === "video") && isEphemeralUrl(block.value)) {
    return { ...block, value: "" };
  }
  return block;
}

export function sanitizePagesForPersistence(pages: PageItem[]): PageItem[] {
  return pages.map((page) => ({
    ...page,
    heroImage: isEphemeralUrl(page.heroImage) ? "" : page.heroImage,
    blocks: page.blocks.map(sanitizeBlockForPersistence),
    canvasFeatures: page.canvasFeatures.map((feature) => ({
      ...feature,
      imageUrl: isEphemeralUrl(feature.imageUrl) ? "" : feature.imageUrl,
    })),
  }));
}

export function sanitizeSystemSettingsForPersistence(systemSettings: SystemSettings): SystemSettings {
  return {
    ...systemSettings,
    gameIcon: isEphemeralUrl(systemSettings.gameIcon) ? undefined : systemSettings.gameIcon,
    modelUrl: isEphemeralUrl(systemSettings.modelUrl) ? undefined : systemSettings.modelUrl,
  };
}

function normalizeMatchValue(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function titlesMatch(a: string, b: string) {
  const na = normalizeMatchValue(a);
  const nb = normalizeMatchValue(b);
  return !!na && !!nb && (na === nb || na.includes(nb) || nb.includes(na));
}

function remapInlinePageLinks(text: string, resolvePageId: (pageId: string, label?: string) => string): string {
  let next = text.replace(/\(\(([^|)]+)\|([^)]+)\)\)/g, (_, label: string, pageId: string) => {
    return `((${label}|${resolvePageId(pageId, label)}))`;
  });
  next = next.replace(/\[([^\]]+)\]\(sherpa-link:([^)]+)\)/g, (_, label: string, pageId: string) => {
    return `[${label}](sherpa-link:${resolvePageId(pageId, label)})`;
  });
  return next;
}

function remapDropdownOptions(text: string, resolvePageId: (pageId: string, label?: string) => string): string {
  return text
    .split("\n")
    .map((line) => {
      const pipeIndex = line.indexOf("|");
      if (pipeIndex === -1) return line;
      const label = line.slice(0, pipeIndex).trim();
      const target = line.slice(pipeIndex + 1).trim();
      if (!target.startsWith("page:")) return line;
      return `${label}|page:${resolvePageId(target.slice(5), label)}`;
    })
    .join("\n");
}

function remapBlockPageLinks(block: ContentBlock, resolvePageId: (pageId: string, label?: string) => string): ContentBlock {
  if (block.type === "text" || block.type === "steps" || block.type === "callout" || block.type === "section") {
    return { ...block, value: remapInlinePageLinks(block.value, resolvePageId) };
  }

  if (block.type === "tabs") {
    try {
      const parsed = JSON.parse(block.value) as { sections?: Array<Record<string, unknown>> };
      return {
        ...block,
        value: JSON.stringify({
          ...parsed,
          sections: (parsed.sections ?? []).map((section) => ({
            ...section,
            blocks: Array.isArray(section.blocks)
              ? (section.blocks as ContentBlock[]).map((child) => remapBlockPageLinks(child, resolvePageId))
              : section.blocks,
          })),
        }),
      };
    } catch {
      return block;
    }
  }

  if (block.type === "carousel") {
    try {
      const parsed = JSON.parse(block.value) as { slides?: Array<Record<string, unknown>> };
      return {
        ...block,
        value: JSON.stringify({
          ...parsed,
          slides: (parsed.slides ?? []).map((slide) => ({
            ...slide,
            blocks: Array.isArray(slide.blocks)
              ? (slide.blocks as ContentBlock[]).map((child) => remapBlockPageLinks(child, resolvePageId))
              : slide.blocks,
          })),
        }),
      };
    } catch {
      return block;
    }
  }

  return block;
}

export function ensureUniquePageIds(pages: PageItem[]): PageItem[] {
  const seenIds = new Set<string>();
  const duplicateGroups = new Map<string, Array<{ oldId: string; nextId: string; title: string }>>();
  let hasDuplicates = false;

  const pagesWithUniqueIds = pages.map((page) => {
    if (!seenIds.has(page.id)) {
      seenIds.add(page.id);
      duplicateGroups.set(page.id, [{ oldId: page.id, nextId: page.id, title: page.title }]);
      return page;
    }

    hasDuplicates = true;
    const nextId = createId(page.kind === "home" ? "home" : page.kind);
    duplicateGroups.get(page.id)?.push({ oldId: page.id, nextId, title: page.title });
    return { ...page, id: nextId };
  });

  if (!hasDuplicates) return pages;

  const resolvePageId = (pageId: string, label?: string) => {
    const candidates = duplicateGroups.get(pageId);
    if (!candidates || candidates.length === 0) return pageId;
    if (candidates.length === 1) return candidates[0].nextId;

    if (label) {
      const matched = candidates.filter((candidate) => titlesMatch(candidate.title || "", label));
      if (matched.length === 1) return matched[0].nextId;
    }

    return candidates[0].nextId;
  };

  return pagesWithUniqueIds.map((page) => ({
    ...page,
    blocks: page.blocks.map((block) => remapBlockPageLinks(block, resolvePageId)),
    socialLinks: page.socialLinks.map((link) => ({
      ...link,
      linkPageId: link.linkPageId ? resolvePageId(link.linkPageId, link.label) : link.linkPageId,
    })),
    canvasFeatures: page.canvasFeatures.map((feature) => {
      if (feature.type === "page-button") {
        return { ...feature, linkUrl: resolvePageId(feature.linkUrl, feature.label) };
      }

      if (feature.type === "button" && (feature.buttonLinkMode ?? "external") === "page" && feature.linkUrl) {
        return { ...feature, linkUrl: resolvePageId(feature.linkUrl, feature.label) };
      }

      if (feature.type === "dropdown") {
        return { ...feature, optionsText: remapDropdownOptions(feature.optionsText, resolvePageId) };
      }

      return feature;
    }),
  }));
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

export function migrateResponsiveBoardFeatures(pages: PageItem[]): PageItem[] {
  let hasChanges = false;

  const nextPages = pages.map((page) => {
    const nextFeatures = page.canvasFeatures.map((feature) => {
      const nextPortraitOverride = feature.mobileX !== undefined || feature.mobileY !== undefined
        ? {
            ...(feature.layoutOverrides?.["mobile-portrait"] ?? {}),
            ...(feature.mobileX !== undefined ? { x: feature.mobileX } : {}),
            ...(feature.mobileY !== undefined ? { y: feature.mobileY } : {}),
          }
        : feature.layoutOverrides?.["mobile-portrait"];

      const nextOriginLayout = feature.originLayout ?? "desktop";
      const nextLayoutOverrides = nextPortraitOverride
        ? {
            ...(feature.layoutOverrides ?? {}),
            "mobile-portrait": nextPortraitOverride,
          }
        : feature.layoutOverrides;

      const migratedFeature = {
        ...feature,
        originLayout: nextOriginLayout,
        layoutOverrides: nextLayoutOverrides,
      };

      if (
        migratedFeature.originLayout !== feature.originLayout ||
        migratedFeature.layoutOverrides !== feature.layoutOverrides
      ) {
        hasChanges = true;
      }

      return migratedFeature;
    });

    return nextFeatures === page.canvasFeatures
      ? page
      : { ...page, canvasFeatures: nextFeatures };
  });

  return hasChanges ? nextPages : pages;
}
