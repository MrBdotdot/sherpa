# next/image Render Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all plain `<img>` tags with `next/image` to enable automatic WebP conversion, srcset generation, and edge caching, while preserving animated GIFs and SVGs via passthrough detection.
**Architecture:** A new `isPassthroughImage()` utility gates all render sites — GIFs and SVGs fall back to plain `<img>`, everything else uses `next/image` with either `fill` (background/lightbox/canvas features) or explicit `width`+`height` (avatars, block images with stored dimensions). Natural dimensions are stored back to `ContentBlock`, `PageItem`, and `CanvasFeature` on first `onLoad` so subsequent renders avoid layout shift.
**Tech Stack:** Next.js `next/image`, TypeScript, Supabase Storage (image source), existing handler props for dimension persistence.

---

### Task 1: Configure next.config.ts with image remote patterns

**Files:**
- Modify: `next.config.ts`

- [ ] Step 1: Replace the current config with:
  ```ts
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    turbopack: {
      root: __dirname,
    },
    images: {
      remotePatterns: [
        { protocol: "https", hostname: "*.supabase.co" },
        { protocol: "https", hostname: "*.cloudflare.com" },
      ],
    },
  };

  export default nextConfig;
  ```
- [ ] Step 2: Run: `npm run build` — Expected: clean build, no image domain errors
- [ ] Step 3: Commit: `feat: add next/image remotePatterns for Supabase and Cloudflare`

---

### Task 2: Create isPassthroughImage utility

**Files:**
- Create: `app/_lib/image-utils.ts`

- [ ] Step 1: Create the file with the following content:
  ```ts
  /**
   * Returns true for image URLs that must be rendered as plain <img> tags.
   *
   * - GIFs: animated frames are lost when passed through next/image optimisation.
   * - SVGs: vector format; raster conversion provides no benefit.
   * - Non-whitelisted domains: next/image will throw if the hostname is not in
   *   remotePatterns, so fall back to plain <img> for safety.
   */

  const WHITELISTED_HOSTNAME_PATTERNS = [
    /\.supabase\.co$/i,
    /\.cloudflare\.com$/i,
  ];

  export function isPassthroughImage(url: string): boolean {
    if (!url) return true;

    // GIF or SVG by extension (case-insensitive)
    const lower = url.toLowerCase().split("?")[0];
    if (lower.endsWith(".gif") || lower.endsWith(".svg")) return true;

    // Non-whitelisted external domain
    try {
      const { hostname } = new URL(url);
      const isWhitelisted = WHITELISTED_HOSTNAME_PATTERNS.some((pattern) =>
        pattern.test(hostname)
      );
      if (!isWhitelisted) return true;
    } catch {
      // Relative URLs or malformed URLs — let next/image handle them
    }

    return false;
  }
  ```
- [ ] Step 2: Run: `npm run build` — Expected: clean build
- [ ] Step 3: Commit: `feat: add isPassthroughImage utility for GIF/SVG/external-URL detection`

---

### Task 3: Add natural dimension fields to authoring-types.ts

**Files:**
- Modify: `app/_lib/authoring-types.ts`

- [ ] Step 1: Add `imageNaturalWidth` and `imageNaturalHeight` to the `ContentBlock` type after the `imagePosition` field:
  ```ts
  imagePosition?: { x: number; y: number };
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  ```
- [ ] Step 2: Add `heroImageNaturalWidth` and `heroImageNaturalHeight` to the `PageItem` type after the `worldNormal` field:
  ```ts
  worldNormal?: [number, number, number];
  heroImageNaturalWidth?: number;
  heroImageNaturalHeight?: number;
  ```
- [ ] Step 3: Add `imageNaturalWidth` and `imageNaturalHeight` to the `CanvasFeature` type after the `buttonVariant` field:
  ```ts
  buttonVariant?: "primary" | "secondary" | "tertiary";
  imageNaturalWidth?: number;
  imageNaturalHeight?: number;
  ```
- [ ] Step 4: Run: `npm run build` — Expected: clean build, all existing data still valid (fields are optional)
- [ ] Step 5: Commit: `feat: add imageNaturalWidth/Height to ContentBlock, PageItem, CanvasFeature`

---

### Task 4: Replace <img> in canvas-background.tsx with next/image (fill mode)

**Files:**
- Modify: `app/_components/canvas/canvas-background.tsx`

- [ ] Step 1: Add `import Image from "next/image";` and `import { isPassthroughImage } from "@/app/_lib/image-utils";` after the existing `ChangeEvent` import.

- [ ] Step 2: Replace the `hasHeroImage` render branch. The existing plain `<img>` becomes a conditional: passthrough images keep the plain `<img>`, others use `next/image` with `fill`. The entire `if (hasHeroImage)` block becomes:
  ```tsx
  if (hasHeroImage) {
    const src = heroImage || DEFAULT_HERO;
    if (isPassthroughImage(src)) {
      return (
        <img
          src={src}
          alt="Preview background"
          className="h-full w-full select-none object-cover"
          style={{ objectPosition: `${objectPositionX}% ${objectPositionY}%` }}
          draggable={false}
          onLoad={(e) => onImageLoad?.(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
        />
      );
    }
    return (
      <div className="absolute inset-0">
        <Image
          src={src}
          alt="Preview background"
          fill
          className="select-none object-cover"
          style={{ objectPosition: `${objectPositionX}% ${objectPositionY}%` }}
          draggable={false}
          priority
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            onImageLoad?.(img.naturalWidth, img.naturalHeight);
          }}
        />
      </div>
    );
  }
  ```
- [ ] Step 3: Run: `npm run build` — Expected: clean build
- [ ] Step 4: Commit: `feat: use next/image fill in canvas-background, wire onLoad for dimension capture`

---

### Task 5: Replace <img> in image-block.tsx with next/image (content + lightbox)

**Files:**
- Modify: `app/_components/canvas/image-block.tsx`

- [ ] Step 1: Add these imports at the top of the file after the existing imports:
  ```ts
  import Image from "next/image";
  import { isPassthroughImage } from "@/app/_lib/image-utils";
  ```

- [ ] Step 2: Add the `onSaveDimensions` optional prop to the `ImageBlock` component signature:
  ```tsx
  export function ImageBlock({
    block,
    blockClass,
    onSaveDimensions,
  }: {
    block: ContentBlock;
    blockClass: string;
    onSaveDimensions?: (naturalWidth: number, naturalHeight: number) => void;
  })
  ```

- [ ] Step 3: Replace the main image render (the `<img>` inside the `imageWrapperRef` div, before the hotspot pins). The new logic branches on passthrough and on whether stored dimensions are available:
  ```tsx
  {isPassthroughImage(block.value) ? (
    <img
      src={block.value}
      alt={block.imageCaption ?? ""}
      style={{ ...posStyle, ...imgSizeStyle }}
      className={`rounded-xl ${fitClass} ${!sized ? "max-h-56 w-full" : ""} ${block.imageLightbox && !hasHotspots ? "cursor-zoom-in" : ""}`}
      onClick={block.imageLightbox && !hasHotspots ? () => setLightboxOpen(true) : undefined}
    />
  ) : block.imageNaturalWidth && block.imageNaturalHeight ? (
    <Image
      src={block.value}
      alt={block.imageCaption ?? ""}
      width={block.imageNaturalWidth}
      height={block.imageNaturalHeight}
      style={{ width: sized ? block.imageSize : "100%", height: "auto", ...posStyle }}
      className={`rounded-xl ${fitClass} ${block.imageLightbox && !hasHotspots ? "cursor-zoom-in" : ""}`}
      onClick={block.imageLightbox && !hasHotspots ? () => setLightboxOpen(true) : undefined}
    />
  ) : (
    <img
      src={block.value}
      alt={block.imageCaption ?? ""}
      style={{ ...posStyle, ...imgSizeStyle }}
      className={`rounded-xl ${fitClass} ${!sized ? "max-h-56 w-full" : ""} ${block.imageLightbox && !hasHotspots ? "cursor-zoom-in" : ""}`}
      onClick={block.imageLightbox && !hasHotspots ? () => setLightboxOpen(true) : undefined}
      onLoad={(e) => {
        const img = e.currentTarget;
        onSaveDimensions?.(img.naturalWidth, img.naturalHeight);
      }}
    />
  )}
  ```

- [ ] Step 4: Replace the lightbox `<img>` (inside the portal's dialog div) with a `next/image fill` variant. The lightbox overlay div already uses `fixed inset-0`, so wrap the image in a positioned container:
  ```tsx
  {lightboxOpen && createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-black/85 p-4"
      onClick={() => setLightboxOpen(false)}
    >
      <button
        type="button"
        aria-label="Close lightbox"
        className="absolute top-4 right-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
        onClick={() => setLightboxOpen(false)}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
          <path d="M2 2l14 14M16 2 2 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </button>
      {isPassthroughImage(block.value) ? (
        <img
          src={block.value}
          alt={block.imageCaption ?? ""}
          className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          className="relative max-h-[85vh] max-w-[90vw] w-full h-full"
          onClick={(e) => e.stopPropagation()}
        >
          <Image
            src={block.value}
            alt={block.imageCaption ?? ""}
            fill
            className="rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
      {block.imageCaption ? (
        <p className="mt-3 text-sm text-white/75">{block.imageCaption}</p>
      ) : null}
    </div>,
    document.body
  )}
  ```

- [ ] Step 5: Run: `npm run build` — Expected: clean build
- [ ] Step 6: Commit: `feat: use next/image in image-block with dimension fallback and fill lightbox`

---

### Task 6: Wire onSaveDimensions from ImageBlock callers

**Files:**
- Modify: `app/_components/canvas/preview-blocks.tsx` (or wherever `ImageBlock` is rendered — verify by searching)

- [ ] Step 1: Search for all `<ImageBlock` usages in the codebase:
  Run: `grep -r "ImageBlock" app/ --include="*.tsx" -l`

- [ ] Step 2: For each call site, add the `onSaveDimensions` prop wired to the appropriate block-update handler. The handler should call the existing `onBlockChange` (or equivalent) with `imageNaturalWidth` and `imageNaturalHeight` merged into the block. Example pattern for a call site that has `onBlockChange: (blockId: string, field: string, value: unknown) => void`:
  ```tsx
  <ImageBlock
    block={block}
    blockClass={blockClass}
    onSaveDimensions={(w, h) => {
      onBlockChange(block.id, "imageNaturalWidth", w);
      onBlockChange(block.id, "imageNaturalHeight", h);
    }}
  />
  ```
  If the call site passes a full block update function instead, adapt accordingly. Only add `onSaveDimensions` where a block-update mechanism is available; player-view-only render sites can omit it.
- [ ] Step 3: Run: `npm run build` — Expected: clean build, TypeScript accepts new prop
- [ ] Step 4: Commit: `feat: wire onSaveDimensions at ImageBlock call sites`

---

### Task 7: Replace <img> in canvas-feature-card.tsx with next/image (image feature + QR)

**Files:**
- Modify: `app/_components/canvas/canvas-feature-card.tsx`

- [ ] Step 1: Add these imports at the top of the file after the existing imports:
  ```ts
  import Image from "next/image";
  import { isPassthroughImage } from "@/app/_lib/image-utils";
  ```

- [ ] Step 2: Add the `onSaveDimensions` optional prop to the `ImageFeatureCard` internal component signature and thread it down from `CanvasFeatureCard`. Update `ImageFeatureCard` props:
  ```tsx
  function ImageFeatureCard({
    feature,
    fontThemeClass,
    surfaceStyleClass,
    onSaveDimensions,
  }: {
    feature: CanvasFeature;
    fontThemeClass: string;
    surfaceStyleClass: string;
    onSaveDimensions?: (naturalWidth: number, naturalHeight: number) => void;
  })
  ```

- [ ] Step 3: Replace the `<img>` inside the `ImageFeatureCard` button. The image feature renders at a variable `logoSize` height — use passthrough check; for optimized images use `next/image` with `fill` inside a sized container:
  ```tsx
  <button
    type="button"
    onClick={() => hasLinks && setOpen((v) => !v)}
    aria-expanded={hasLinks ? open : undefined}
    aria-haspopup={hasLinks ? "menu" : undefined}
    aria-controls={hasLinks ? menuId : undefined}
    aria-label={feature.label || "Image"}
    className={hasLinks ? "cursor-pointer" : "cursor-default"}
  >
    {isPassthroughImage(feature.imageUrl) ? (
      <img
        src={feature.imageUrl}
        alt={feature.label}
        className="block w-auto max-w-none object-contain drop-shadow-sm"
        style={{ height: feature.logoSize ?? 48 }}
      />
    ) : (
      <div
        className="relative"
        style={{ height: feature.logoSize ?? 48, width: feature.logoSize ?? 48 }}
      >
        <Image
          src={feature.imageUrl}
          alt={feature.label}
          fill
          className="object-contain drop-shadow-sm"
          onLoad={(e) => {
            const img = e.target as HTMLImageElement;
            onSaveDimensions?.(img.naturalWidth, img.naturalHeight);
          }}
        />
      </div>
    )}
  </button>
  ```

- [ ] Step 4: Replace the QR `<img>` inside the `feature.type === "qr"` branch. QR images are small fixed-size renders — use `next/image` with fill inside the existing container (which is already `width: qrSize + 4`):
  ```tsx
  {feature.imageUrl ? (
    isPassthroughImage(feature.imageUrl) ? (
      <img
        src={feature.imageUrl}
        alt="QR code"
        className="w-full rounded-md object-contain"
      />
    ) : (
      <div className="relative w-full" style={{ aspectRatio: "1 / 1" }}>
        <Image
          src={feature.imageUrl}
          alt="QR code"
          fill
          className="rounded-md object-contain"
        />
      </div>
    )
  ) : (
    <div className="rounded-md border border-dashed border-neutral-300 px-3 py-6 text-center text-[11px] text-neutral-400">
      Upload QR image
    </div>
  )}
  ```

- [ ] Step 5: Thread `onSaveDimensions` from `CanvasFeatureCard` down to `ImageFeatureCard`. Add the prop to `CanvasFeatureCard`'s props interface and pass it through:
  ```tsx
  export function CanvasFeatureCard({
    ...
    onSaveFeatureDimensions,
  }: {
    ...
    onSaveFeatureDimensions?: (naturalWidth: number, naturalHeight: number) => void;
  }) {
    ...
    if (feature.type === "image") {
      return (
        <ImageFeatureCard
          feature={feature}
          fontThemeClass={fontThemeClass}
          surfaceStyleClass={surfaceStyleClass}
          onSaveDimensions={onSaveFeatureDimensions}
        />
      );
    }
    ...
  }
  ```

- [ ] Step 6: Run: `npm run build` — Expected: clean build
- [ ] Step 7: Commit: `feat: use next/image fill in canvas-feature-card for image and QR features`

---

### Task 8: Wire onSaveFeatureDimensions at CanvasFeatureCard call sites

**Files:**
- Modify: call sites of `<CanvasFeatureCard` (search to find them)

- [ ] Step 1: Run: `grep -r "CanvasFeatureCard" app/ --include="*.tsx" -l` to find all render sites.
- [ ] Step 2: For each call site that has access to a feature-update handler, add the `onSaveFeatureDimensions` prop:
  ```tsx
  <CanvasFeatureCard
    ...
    onSaveFeatureDimensions={(w, h) => {
      onCanvasFeatureChange(feature.id, "imageNaturalWidth", String(w));
      onCanvasFeatureChange(feature.id, "imageNaturalHeight", String(h));
    }}
  />
  ```
  Note: `CanvasFeatureField` currently does not include `imageNaturalWidth`/`imageNaturalHeight` — update the `CanvasFeatureField` union in `authoring-types.ts` to include them, or add a separate numeric-value handler. Prefer adding a dedicated `onSaveFeatureDimensions` prop to avoid widening the string-typed `CanvasFeatureField` union with numeric fields.
- [ ] Step 3: Run: `npm run build` — Expected: clean build
- [ ] Step 4: Commit: `feat: wire onSaveFeatureDimensions at CanvasFeatureCard call sites`

---

### Task 9: Replace <img> avatars in account-sections.tsx with next/image

**Files:**
- Modify: `app/_components/account/account-sections.tsx`

- [ ] Step 1: Add these imports at the top of the file after the existing imports:
  ```ts
  import Image from "next/image";
  import { isPassthroughImage } from "@/app/_lib/image-utils";
  ```

- [ ] Step 2: Replace the `ProfileSection` avatar `<img>` (the 64×64 `h-16 w-16` one):
  ```tsx
  {avatarUrl ? (
    isPassthroughImage(avatarUrl) ? (
      <img
        src={avatarUrl}
        alt="Profile photo"
        className="h-16 w-16 rounded-full object-cover"
      />
    ) : (
      <Image
        src={avatarUrl}
        alt="Profile photo"
        width={64}
        height={64}
        className="h-16 w-16 rounded-full object-cover"
      />
    )
  ) : (
    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#1e3a8a] text-xl font-semibold text-white">
      {initials}
    </div>
  )}
  ```

- [ ] Step 3: Replace the `SessionsSection` avatar `<img>` (the 32×32 `h-8 w-8` one):
  ```tsx
  {userAvatarUrl ? (
    isPassthroughImage(userAvatarUrl) ? (
      <img
        src={userAvatarUrl}
        alt={userDisplayName || "Profile photo"}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    ) : (
      <Image
        src={userAvatarUrl}
        alt={userDisplayName || "Profile photo"}
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-semibold text-white">
      {userInitial}
    </div>
  )}
  ```

- [ ] Step 4: Replace the `TeamSection` avatar `<img>` (the second 32×32 `h-8 w-8` one):
  ```tsx
  {userAvatarUrl ? (
    isPassthroughImage(userAvatarUrl) ? (
      <img
        src={userAvatarUrl}
        alt={userDisplayName || "Profile photo"}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    ) : (
      <Image
        src={userAvatarUrl}
        alt={userDisplayName || "Profile photo"}
        width={32}
        height={32}
        className="h-8 w-8 shrink-0 rounded-full object-cover"
      />
    )
  ) : (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1e3a8a] text-xs font-semibold text-white">
      {userInitial}
    </div>
  )}
  ```

- [ ] Step 5: Run: `npm run build` — Expected: clean build
- [ ] Step 6: Commit: `feat: use next/image for avatars in account-sections`

---

### Task 10: Replace <img> thumbnails in canvas-feature-type-body.tsx with next/image

**Files:**
- Modify: `app/_components/editor/canvas-feature-type-body.tsx`

- [ ] Step 1: Add these imports at the top of the file after the existing imports:
  ```ts
  import Image from "next/image";
  import { isPassthroughImage } from "@/app/_lib/image-utils";
  ```

- [ ] Step 2: Replace the image-feature thumbnail `<img>` (the `h-10 w-auto max-w-[120px]` one in the `feature.type === "image"` section):
  ```tsx
  {feature.imageUrl ? (
    <div className="flex items-center gap-2">
      {isPassthroughImage(feature.imageUrl) ? (
        <img
          src={feature.imageUrl}
          alt="Image"
          className="h-10 w-auto max-w-[120px] rounded-lg border border-neutral-200 object-contain p-1"
        />
      ) : (
        <div className="relative h-10 w-[120px] rounded-lg border border-neutral-200 p-1 overflow-hidden">
          <Image
            src={feature.imageUrl}
            alt="Image"
            fill
            className="object-contain"
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => onCanvasFeatureChange(feature.id, "imageUrl", "")}
        className="text-xs text-neutral-400 hover:text-red-500"
      >
        Remove
      </button>
    </div>
  ) : null}
  ```

- [ ] Step 3: Replace the QR-feature thumbnail `<img>` (the `h-12 w-12` one in the `feature.type === "qr"` section):
  ```tsx
  {feature.imageUrl ? (
    <div className="flex items-center gap-2">
      {isPassthroughImage(feature.imageUrl) ? (
        <img
          src={feature.imageUrl}
          alt="QR"
          className="h-12 w-12 rounded-lg border border-neutral-200 object-contain p-0.5"
        />
      ) : (
        <div className="relative h-12 w-12 rounded-lg border border-neutral-200 p-0.5 overflow-hidden">
          <Image
            src={feature.imageUrl}
            alt="QR"
            fill
            className="object-contain"
          />
        </div>
      )}
      <button
        type="button"
        onClick={() => onCanvasFeatureChange(feature.id, "imageUrl", "")}
        className="text-xs text-neutral-400 hover:text-red-500"
      >
        Remove
      </button>
    </div>
  ) : null}
  ```

- [ ] Step 4: Run: `npm run build` — Expected: clean build
- [ ] Step 5: Commit: `feat: use next/image for editor thumbnails in canvas-feature-type-body`

---

### Task 11: Wire heroImageNaturalWidth/Height at CanvasBackground call sites

**Files:**
- Modify: call sites of `<CanvasBackground` (search to find them)

- [ ] Step 1: Run: `grep -r "CanvasBackground" app/ --include="*.tsx" -l` to find all render sites.
- [ ] Step 2: Confirm that `onImageLoad` is already plumbed at the call sites. The `CanvasBackground` component already accepts `onImageLoad?: (naturalWidth: number, naturalHeight: number) => void` and calls it on `onLoad`. At each call site that has access to a page-update handler, verify the existing `onImageLoad` prop saves to the page's `heroImageNaturalWidth` / `heroImageNaturalHeight` fields. If the existing handler only fires a side-effect and does not persist dimensions, update it to merge the new fields into the page item. Example:
  ```tsx
  onImageLoad={(w, h) => {
    onPageChange(page.id, { heroImageNaturalWidth: w, heroImageNaturalHeight: h });
  }}
  ```
- [ ] Step 3: Run: `npm run build` — Expected: clean build
- [ ] Step 4: Commit: `feat: persist heroImageNaturalWidth/Height on canvas background onLoad`

---

### Task 12: Final verification build and version bump

**Files:**
- Modify: `app/_lib/authoring-utils.ts`

- [ ] Step 1: Bump `APP_VERSION` and add a `PATCH_NOTES` entry in `app/_lib/authoring-utils.ts` describing the next/image optimization rollout.
- [ ] Step 2: Run: `npm run build` — Expected: clean build with no TypeScript errors and no missing image domain warnings.
- [ ] Step 3: Manual verification checklist:
  - Load a published game as a player — hero image renders correctly, network tab shows WebP format
  - Open a modal with a block image — image fills container width without distortion, lightbox opens full-screen correctly
  - Upload a new hero image — confirm `heroImageNaturalWidth`/`heroImageNaturalHeight` appear in saved page data
  - Open a card with a logo canvas feature — logo renders correctly with transparency intact
  - Upload a GIF as a block image — confirm it renders and animates correctly via plain `<img>`
  - Confirm avatar images in account panel load correctly
- [ ] Step 4: Commit: `feat: bump version for next/image render optimization rollout`
