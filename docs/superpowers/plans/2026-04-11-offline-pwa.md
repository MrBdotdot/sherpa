# Offline / PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the player app (`/play/[gameId]`) installable and fully offline-capable — game data and images are automatically cached on first visit, with a "Ready for offline" toast and an "Add to Home Screen" nudge.

**Architecture:** A hand-authored Workbox service worker at `public/sw.js` handles caching strategies; a `ServiceWorkerRegistration` client component mounts it in the play route layout. `warmGameCache()` pre-fetches all card images into the SW cache after load. The authoring interface is unaffected.

**Tech Stack:** Workbox 7 (CDN in SW, `workbox-window` npm package), Next.js App Router manifest route, TypeScript, Vitest (existing)

**Important:** Before writing any Next.js-specific code (manifest, layout), read `node_modules/next/dist/docs/` for current API conventions — this project runs Next.js 16 which has breaking changes from prior versions.

---

### Task 1: Install packages, generate icons, and create web app manifest

**Files:**
- Modify: `package.json`
- Create: `scripts/generate-icons.mjs`
- Create: `public/icons/icon-192.png` (generated)
- Create: `public/icons/icon-512.png` (generated)
- Create: `app/manifest.ts`

- [ ] **Step 1: Install dependencies**

```bash
npm install workbox-window
npm install -D sharp
```

`workbox-window` is the npm package used on the client to register and communicate with the service worker. `sharp` is used to generate PNG icons required for Chrome's install prompt.

- [ ] **Step 2: Create the icon generation script**

Create `scripts/generate-icons.mjs`:

```javascript
import sharp from "sharp";
import { readFileSync, mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const svg = readFileSync("public/sherpa-icon.svg");

await sharp(svg).resize(192, 192).png().toFile("public/icons/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icons/icon-512.png");

console.log("✓ public/icons/icon-192.png");
console.log("✓ public/icons/icon-512.png");
```

- [ ] **Step 3: Generate the icons**

```bash
node scripts/generate-icons.mjs
```

Expected output:
```
✓ public/icons/icon-192.png
✓ public/icons/icon-512.png
```

- [ ] **Step 4: Create the manifest**

Create `app/manifest.ts`:

```typescript
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sherpa",
    short_name: "Sherpa",
    description: "Interactive rules experiences for board games",
    start_url: "/play",
    scope: "/play/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Verify manifest is served**

Start the dev server (`npm run dev`) and open:
```
http://localhost:3000/manifest.webmanifest
```

Expected: JSON with name "Sherpa", icons array, `display: "standalone"`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json scripts/generate-icons.mjs public/icons/ app/manifest.ts
git commit -m "feat: add PWA manifest and app icons"
```

---

### Task 2: Service worker and registration

**Files:**
- Create: `public/sw.js`
- Create: `app/_components/ServiceWorkerRegistration.tsx`
- Create: `app/play/[gameId]/layout.tsx`

- [ ] **Step 1: Create the service worker**

Create `public/sw.js`:

```javascript
// Workbox service worker for Sherpa player offline support
importScripts("https://storage.googleapis.com/workbox-cdn/releases/7.0.0/workbox-sw.js");

workbox.setConfig({ debug: false });

const { registerRoute } = workbox.routing;
const { NetworkFirst, CacheFirst } = workbox.strategies;
const { ExpirationPlugin } = workbox.expiration;
const { CacheableResponsePlugin } = workbox.cacheableResponse;

// Activate immediately — take control without waiting for reload
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  const CURRENT_CACHES = new Set([
    "sherpa-pages-v1",
    "sherpa-supabase-v1",
    "sherpa-images-v1",
    "sherpa-models-v1",
  ]);
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => n.startsWith("sherpa-") && !CURRENT_CACHES.has(n))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Play page HTML — Network-first, 7-day cache
registerRoute(
  ({ url }) => url.pathname.startsWith("/play/"),
  new NetworkFirst({
    cacheName: "sherpa-pages-v1",
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Supabase REST API (game + cards queries) — Network-first, 7-day cache
registerRoute(
  ({ url }) =>
    url.hostname.includes(".supabase.co") && url.pathname.startsWith("/rest/"),
  new NetworkFirst({
    cacheName: "sherpa-supabase-v1",
    networkTimeoutSeconds: 3,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// Supabase Storage images — Cache-first, 30-day cache
// Safe: every new image upload gets a new URL (timestamp in filename)
registerRoute(
  ({ url }) =>
    url.hostname.includes(".supabase.co") &&
    url.pathname.startsWith("/storage/"),
  new CacheFirst({
    cacheName: "sherpa-images-v1",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxEntries: 500,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);

// 3D model files — Cache-first, 30-day cache (opt-in; warm-game-cache puts them here)
registerRoute(
  ({ url }) => /\.(glb|gltf)$/i.test(url.pathname),
  new CacheFirst({
    cacheName: "sherpa-models-v1",
    plugins: [
      new ExpirationPlugin({
        maxAgeSeconds: 30 * 24 * 60 * 60,
        maxEntries: 20,
      }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
);
```

- [ ] **Step 2: Create the ServiceWorkerRegistration component**

Create `app/_components/ServiceWorkerRegistration.tsx`:

```typescript
"use client";

import { useEffect } from "react";
import { Workbox } from "workbox-window";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const wb = new Workbox("/sw.js", { scope: "/play/" });
    wb.register().catch(() => {
      // Ignore registration failures — app works without SW
    });
  }, []);

  return null;
}
```

- [ ] **Step 3: Create the play route layout**

Create `app/play/[gameId]/layout.tsx`:

```typescript
import { ServiceWorkerRegistration } from "@/app/_components/ServiceWorkerRegistration";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceWorkerRegistration />
      {children}
    </>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Verify service worker registers**

Start dev server (`npm run dev`) and open `http://localhost:3000/play/any-id` in Chrome. Open DevTools → Application → Service Workers. You should see `sw.js` listed with status "activated and is running".

- [ ] **Step 6: Commit**

```bash
git add public/sw.js app/_components/ServiceWorkerRegistration.tsx app/play/[gameId]/layout.tsx
git commit -m "feat: add Workbox service worker and registration"
```

---

### Task 3: warmGameCache utility and tests

**Files:**
- Create: `app/_lib/warm-game-cache.ts`
- Create: `app/_lib/warm-game-cache.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `app/_lib/warm-game-cache.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { extractGameImageUrls } from "./warm-game-cache";
import type { PageItem, SystemSettings, ContentBlock, CanvasFeature } from "@/app/_lib/authoring-types";

let seq = 0;
function id() { return `id-${++seq}`; }

function makeBlock(type: ContentBlock["type"], value: string): ContentBlock {
  return { id: id(), type, value };
}

function makeFeature(imageUrl: string): CanvasFeature {
  return {
    id: id(), type: "image", label: "", description: "",
    linkUrl: "", imageUrl, optionsText: "", x: 0, y: 0,
  };
}

function makePage(heroImage: string, blocks: ContentBlock[], features: CanvasFeature[]): PageItem {
  return {
    id: id(), kind: "page", title: "Test", summary: "", heroImage,
    x: 0, y: 0, contentX: 50, contentY: 50, blocks,
    socialLinks: [], canvasFeatures: features, publicUrl: "",
    showQrCode: false, interactionType: "modal",
    pageButtonPlacement: "bottom", templateId: "blank",
    cardSize: "medium", contentTintColor: "", contentTintOpacity: 85,
  };
}

const baseSettings: SystemSettings = {
  fontTheme: "modern", surfaceStyle: "glass", accentColor: "#000",
  hotspotSize: "medium",
};

describe("extractGameImageUrls", () => {
  it("extracts hero image URLs", () => {
    const page = makePage("https://example.com/hero.jpg", [], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toContain("https://example.com/hero.jpg");
  });

  it("skips color: hero images", () => {
    const page = makePage("color:#ff0000", [], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).not.toContain("color:#ff0000");
  });

  it("skips empty hero images", () => {
    const page = makePage("", [], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toHaveLength(0);
  });

  it("extracts image block values", () => {
    const page = makePage("", [makeBlock("image", "https://example.com/block.jpg")], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toContain("https://example.com/block.jpg");
  });

  it("skips non-image blocks", () => {
    const page = makePage("", [makeBlock("text", "Hello world")], []);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).not.toContain("Hello world");
  });

  it("extracts canvas feature imageUrls", () => {
    const page = makePage("", [], [makeFeature("https://example.com/logo.png")]);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toContain("https://example.com/logo.png");
  });

  it("skips empty canvas feature imageUrls", () => {
    const page = makePage("", [], [makeFeature("")]);
    const result = extractGameImageUrls([page], baseSettings);
    expect(result).toHaveLength(0);
  });

  it("deduplicates URLs", () => {
    const url = "https://example.com/shared.jpg";
    const p1 = makePage(url, [], []);
    const p2 = makePage(url, [], []);
    const result = extractGameImageUrls([p1, p2], baseSettings);
    expect(result.filter((u) => u === url)).toHaveLength(1);
  });

  it("includes modelUrl when cache3dModels is true", () => {
    const settings: SystemSettings = {
      ...baseSettings,
      backgroundType: "model-3d",
      modelUrl: "https://example.com/model.glb",
      cache3dModels: true,
    };
    const result = extractGameImageUrls([], settings);
    expect(result).toContain("https://example.com/model.glb");
  });

  it("excludes modelUrl when cache3dModels is false", () => {
    const settings: SystemSettings = {
      ...baseSettings,
      backgroundType: "model-3d",
      modelUrl: "https://example.com/model.glb",
      cache3dModels: false,
    };
    const result = extractGameImageUrls([], settings);
    expect(result).not.toContain("https://example.com/model.glb");
  });

  it("excludes modelUrl when cache3dModels is undefined", () => {
    const settings: SystemSettings = {
      ...baseSettings,
      backgroundType: "model-3d",
      modelUrl: "https://example.com/model.glb",
    };
    const result = extractGameImageUrls([], settings);
    expect(result).not.toContain("https://example.com/model.glb");
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
npm test app/_lib/warm-game-cache.test.ts
```

Expected: All tests FAIL with `Cannot find module './warm-game-cache'`.

- [ ] **Step 3: Add `cache3dModels` to SystemSettings type**

In `app/_lib/authoring-types.ts`, after the `darkMode` field (currently the last field in `SystemSettings`), add:

```typescript
  /** Cache the 3D model file on the player's device for offline use */
  cache3dModels?: boolean;
```

- [ ] **Step 4: Implement warmGameCache**

Create `app/_lib/warm-game-cache.ts`:

```typescript
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

    // Separate image URLs from model URLs
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
```

- [ ] **Step 5: Run tests — verify they pass**

```bash
npm test app/_lib/warm-game-cache.test.ts
```

Expected: All 11 tests PASS.

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add app/_lib/authoring-types.ts app/_lib/warm-game-cache.ts app/_lib/warm-game-cache.test.ts
git commit -m "feat: add warmGameCache utility and cache3dModels type"
```

---

### Task 4: OfflineBadge component and play page wiring

**Files:**
- Create: `app/play/[gameId]/_components/OfflineBadge.tsx`
- Modify: `app/play/[gameId]/page.tsx`

- [ ] **Step 1: Create the OfflineBadge component**

Create `app/play/[gameId]/_components/OfflineBadge.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

type CacheStatus = "idle" | "already-cached" | "success" | "error";

export function OfflineBadge({ status }: { status: CacheStatus }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (status !== "success" && status !== "error") return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [status]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-neutral-800/95 px-4 py-2 text-sm font-medium text-white shadow-lg backdrop-blur-sm"
    >
      {status === "success" ? (
        <>
          <svg
            className="h-4 w-4 shrink-0 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Ready for offline
        </>
      ) : (
        <>
          <svg
            className="h-4 w-4 shrink-0 text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Offline unavailable
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Wire warmGameCache and OfflineBadge into the play page**

In `app/play/[gameId]/page.tsx`, make these changes:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { loadGame } from "@/app/_lib/supabase-game";
import { PlayerView } from "@/app/_components/player-view";
import { PageItem, SystemSettings } from "@/app/_lib/authoring-types";
import { warmGameCache } from "@/app/_lib/warm-game-cache";
import { OfflineBadge } from "./_components/OfflineBadge";

export default function PlayPage() {
  const { gameId } = useParams<{ gameId: string }>();
  const [pages, setPages] = useState<PageItem[] | null>(null);
  const [systemSettings, setSystemSettings] = useState<SystemSettings | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [hasBranding, setHasBranding] = useState(true);
  const [cacheStatus, setCacheStatus] = useState<
    "idle" | "already-cached" | "success" | "error"
  >("idle");

  useEffect(() => {
    if (!gameId) return;
    loadGame(gameId)
      .then((data) => {
        if (data && data.pages.some((p) => p.kind === "home")) {
          setPages(data.pages);
          setSystemSettings(data.systemSettings);
        } else {
          setNotFound(true);
        }
      })
      .catch(() => setNotFound(true));
  }, [gameId]);

  useEffect(() => {
    if (!gameId) return;
    fetch("/api/stripe/entitlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    })
      .then((r) => r.json())
      .then((data: { hasBranding?: boolean }) => {
        setHasBranding(data.hasBranding ?? true);
      })
      .catch(() => setHasBranding(true));
  }, [gameId]);

  // Warm the SW cache after game data is loaded
  useEffect(() => {
    if (!gameId || !pages || !systemSettings) return;
    warmGameCache(gameId, pages, systemSettings).then(setCacheStatus);
  }, [gameId, pages, systemSettings]);

  if (notFound) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-6 bg-neutral-950 px-6 text-center">
        <div>
          <div className="text-xl font-semibold text-white">Experience not found</div>
          <div className="mt-2 text-sm text-neutral-400">
            This link may be invalid or the experience is not published.
          </div>
        </div>
        <a
          href="/gallery"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm font-medium text-white/80 transition hover:bg-white/10"
        >
          Browse the gallery
        </a>
      </div>
    );
  }

  if (!pages || !systemSettings) {
    return (
      <div
        className="flex h-screen items-center justify-center bg-neutral-950"
        role="status"
        aria-label="Loading experience"
      >
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-white" />
      </div>
    );
  }

  return (
    <>
      <PlayerView pages={pages} systemSettings={systemSettings} hasBranding={hasBranding} />
      <OfflineBadge status={cacheStatus} />
    </>
  );
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manual verification**

Start dev server (`npm run dev`). Open a valid play URL (a published game). Open DevTools → Network. After the game loads, you should see fetch requests for card images in the network tab. Check DevTools → Application → Cache Storage → `sherpa-images-v1` and confirm the image URLs appear there. After ~1–2 seconds, the "Ready for offline" toast should appear at the bottom and auto-dismiss after 3 seconds.

On a second visit to the same URL, the toast should not appear.

- [ ] **Step 5: Commit**

```bash
git add app/play/[gameId]/_components/OfflineBadge.tsx app/play/[gameId]/page.tsx
git commit -m "feat: add OfflineBadge and wire warmGameCache into play page"
```

---

### Task 5: Entitlement offline fallback

**Files:**
- Modify: `app/play/[gameId]/page.tsx`

The Stripe entitlement check (`/api/stripe/entitlement`) is a POST request — not cacheable by the service worker. Instead, the result is saved to `localStorage` and read back if the network fetch fails.

- [ ] **Step 1: Update the entitlement useEffect in page.tsx**

Replace the existing entitlement `useEffect` in `app/play/[gameId]/page.tsx`:

```typescript
  useEffect(() => {
    if (!gameId) return;

    // Apply stored entitlement immediately for offline use
    const stored = localStorage.getItem(`sherpa-entitlement-${gameId}`);
    if (stored !== null) setHasBranding(stored === "true");

    fetch("/api/stripe/entitlement", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId }),
    })
      .then((r) => r.json())
      .then((data: { hasBranding?: boolean }) => {
        const value = data.hasBranding ?? true;
        setHasBranding(value);
        localStorage.setItem(`sherpa-entitlement-${gameId}`, String(value));
      })
      .catch(() => {
        // Offline: use stored value if available, otherwise conservative default (show branding)
        if (stored === null) setHasBranding(true);
      });
  }, [gameId]);
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/play/[gameId]/page.tsx
git commit -m "feat: cache entitlement result in localStorage for offline fallback"
```

---

### Task 6: InstallPrompt component

**Files:**
- Create: `app/play/[gameId]/_components/InstallPrompt.tsx`
- Modify: `app/play/[gameId]/page.tsx`

- [ ] **Step 1: Create the InstallPrompt component**

Create `app/play/[gameId]/_components/InstallPrompt.tsx`:

```typescript
"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): void;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "sherpa-install-dismissed";

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true); // hidden by default until prompt fires

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY) === "1") return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function handleInstall() {
    if (!prompt) return;
    prompt.prompt();
    prompt.userChoice.then(() => {
      setPrompt(null);
      setDismissed(true);
      localStorage.setItem(DISMISSED_KEY, "1");
    });
  }

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem(DISMISSED_KEY, "1");
  }

  if (dismissed || !prompt) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between gap-4 border-t border-white/10 bg-neutral-900/95 px-4 py-3 text-sm text-white backdrop-blur-sm">
      <span>Add to home screen for offline access</span>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={handleInstall}
          className="rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-neutral-900 transition hover:bg-neutral-100"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Dismiss install prompt"
          className="text-lg leading-none text-neutral-400 transition hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add InstallPrompt to the play page**

In `app/play/[gameId]/page.tsx`, add the import and render the component. The final `return` block (when pages and systemSettings are loaded) should be:

```typescript
import { InstallPrompt } from "./_components/InstallPrompt";

// ...

  return (
    <>
      <PlayerView pages={pages} systemSettings={systemSettings} hasBranding={hasBranding} />
      <OfflineBadge status={cacheStatus} />
      <InstallPrompt />
    </>
  );
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Manual verification**

In Chrome DevTools → Application → Manifest, verify the manifest is detected. Chrome requires: HTTPS (or localhost), a manifest with `display: standalone`, and a registered service worker to show the `beforeinstallprompt` event. On localhost, the event may fire in Chrome after the page has been visited twice. You can simulate it via DevTools → Application → Manifest → "Add to Home Screen".

- [ ] **Step 5: Commit**

```bash
git add app/play/[gameId]/_components/InstallPrompt.tsx app/play/[gameId]/page.tsx
git commit -m "feat: add install prompt for Add to Home Screen"
```

---

### Task 7: 3D model cache toggle in authoring interface

**Files:**
- Modify: `app/_components/editor/overview-tab.tsx`

The `cache3dModels` field on `SystemSettings` was added in Task 3. This task adds the toggle UI in the authoring interface, visible when a 3D model background is configured.

- [ ] **Step 1: Read the current 3D model section in overview-tab.tsx**

Read `app/_components/editor/overview-tab.tsx` lines 238–265 to find the exact `{isModel3d ? (` block structure.

- [ ] **Step 2: Add the 3D cache toggle**

In `app/_components/editor/overview-tab.tsx`, find this exact closing paragraph inside the `isModel3d` block:

```tsx
                          <p className="text-[11px] leading-4 text-neutral-400">
                            Drag to orbit, scroll to zoom, and right-drag or two-finger to pan.
                          </p>
```

Insert the following block immediately after that `<p>` element, before the closing `</>` of the `isModel3d` fragment:

```tsx
                          <div className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 px-3 py-2.5">
                            <div className="min-w-0">
                              <div className="text-xs font-medium text-neutral-700">
                                Cache model for offline
                              </div>
                              <div className="mt-0.5 text-[11px] leading-4 text-neutral-400">
                                {systemSettings.modelUrl
                                  ? "Stores the 3D model on the player's device"
                                  : "Set a model URL above to enable"}
                              </div>
                            </div>
                            <button
                              role="switch"
                              aria-checked={systemSettings.cache3dModels ?? false}
                              disabled={!systemSettings.modelUrl}
                              onClick={() =>
                                onSystemSettingChange(
                                  "cache3dModels",
                                  !(systemSettings.cache3dModels ?? false)
                                )
                              }
                              className={`relative mt-0.5 h-5 w-9 shrink-0 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#3B82F6] ${
                                systemSettings.cache3dModels
                                  ? "bg-[#3B82F6]"
                                  : "bg-neutral-200"
                              } disabled:cursor-not-allowed disabled:opacity-40`}
                            >
                              <span
                                className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                                  systemSettings.cache3dModels
                                    ? "translate-x-4"
                                    : "translate-x-0.5"
                                }`}
                              />
                            </button>
                          </div>
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: All tests pass (11 warm-game-cache + 14 inject-links = 25 total).

- [ ] **Step 5: Manual verification**

Start dev server. Open a game in the authoring interface. In the Overview tab, set the background to "3D model" and paste a `.glb` URL. A "Cache model for offline" toggle should appear below the URL input. Toggling it on should persist the setting.

- [ ] **Step 6: Commit**

```bash
git add app/_components/editor/overview-tab.tsx
git commit -m "feat: add 3D model cache toggle in overview tab"
```
