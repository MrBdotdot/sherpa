import type { PageItem, SystemSettings } from "@/app/_lib/authoring-types";

const IMAGE_CACHE_NAME = "sherpa-images-v1";
const MODEL_CACHE_NAME = "sherpa-models-v1";

/** Extract all cacheable resource URLs from pages and system settings. */
export function extractGameImageUrls(
  pages: PageItem[],
  systemSettings: SystemSettings
): string[] {
  const urls = new Set<string>();

  for (const page of pages) {
    if (page.heroImage && !page.heroImage.startsWith("color:")) {
      urls.add(page.heroImage);
    }
    for (const block of page.blocks) {
      if (block.type === "image" && block.value) {
        urls.add(block.value);
      }
    }
    for (const feature of page.canvasFeatures) {
      if (feature.imageUrl) {
        urls.add(feature.imageUrl);
      }
    }
  }

  if (systemSettings.cache3dModels && systemSettings.modelUrl) {
    urls.add(systemSettings.modelUrl);
  }

  return Array.from(urls);
}

/**
 * Pre-fetch all game image (and optionally 3D model) URLs into the
 * service worker cache so the game works offline.
 *
 * Returns:
 *   "already-cached" — this gameId was fully cached on a previous visit
 *   "success"        — caching completed successfully
 *   "error"          — caches API unavailable or quota exceeded
 */
export async function warmGameCache(
  gameId: string,
  pages: PageItem[],
  systemSettings: SystemSettings
): Promise<"already-cached" | "success" | "error"> {
  if (typeof window === "undefined" || !("caches" in window)) return "error";

  const storageKey = `sherpa-cached-${gameId}`;
  if (localStorage.getItem(storageKey) === "1") return "already-cached";

  try {
    const urls = extractGameImageUrls(pages, systemSettings);

    const modelUrl =
      systemSettings.cache3dModels && systemSettings.modelUrl
        ? systemSettings.modelUrl
        : null;
    const imageUrls = urls.filter((u) => u !== modelUrl);

    // Cache images
    if (imageUrls.length > 0) {
      const imageCache = await caches.open(IMAGE_CACHE_NAME);
      await Promise.allSettled(
        imageUrls.map(async (url) => {
          if (await imageCache.match(url)) return;
          const response = await fetch(url);
          if (response.ok) await imageCache.put(url, response);
        })
      );
    }

    // Cache 3D model (opt-in)
    if (modelUrl) {
      const modelCache = await caches.open(MODEL_CACHE_NAME);
      if (!(await modelCache.match(modelUrl))) {
        const response = await fetch(modelUrl);
        if (response.ok) await modelCache.put(modelUrl, response);
      }
    }

    localStorage.setItem(storageKey, "1");
    return "success";
  } catch {
    return "error";
  }
}
