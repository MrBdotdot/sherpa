# next/image Render Optimization — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

All images in Sherpa are rendered as plain `<img>` tags pulling full-resolution files directly from Supabase Storage. No resizing, no format conversion, no srcset. A 4MB board photo is downloaded at full resolution by every player regardless of their screen size or device. This spec replaces plain `<img>` tags with `next/image` throughout — enabling automatic WebP conversion, srcset generation, and Vercel/Cloudflare edge caching — and adds natural dimension storage to the data model to prevent layout shift in content-flow images.

## Scope

- Replace `<img>` with `next/image` at all image render sites
- Add `imageNaturalWidth`/`imageNaturalHeight` to `ContentBlock`, `PageItem`, and `CanvasFeature`
- Add `isPassthroughImage()` utility for GIF/SVG detection
- Configure `next.config.ts` with allowed image domains

**Out of scope:** image upload compression (separate spec), CDN proxy setup (separate spec), video blocks (YouTube embeds, untouched).

## Data model changes

### `ContentBlock` (`app/_lib/authoring-types.ts`)
```ts
imageNaturalWidth?: number;
imageNaturalHeight?: number;
```

### `PageItem` (`app/_lib/authoring-types.ts`)
```ts
heroImageNaturalWidth?: number;
heroImageNaturalHeight?: number;
```

### `CanvasFeature` (`app/_lib/authoring-types.ts`)
```ts
imageNaturalWidth?: number;
imageNaturalHeight?: number;
```

All fields are optional. Existing saved data without these fields degrades gracefully — see fallback behaviour below.

## New utility: `app/_lib/image-utils.ts`

```ts
export function isPassthroughImage(url: string): boolean
```

Returns `true` for URLs ending in `.gif` or `.svg` (case-insensitive). All render sites import this and branch to a plain `<img>` when true. Next.js image optimization cannot improve GIFs (animated frames lost) or SVGs (vector, no raster benefit).

## next.config.ts

```ts
images: {
  remotePatterns: [
    { protocol: 'https', hostname: '*.supabase.co' },    // current storage
    { protocol: 'https', hostname: '*.cloudflare.com' }, // future CDN proxy
  ]
}
```

## Render patterns by location

### Hero background — `canvas-background.tsx`
- Pattern: `next/image` with `fill`
- Container: already `absolute inset-0` — no changes needed
- `objectPosition` preserved via `style` prop
- `onLoad` handler updated to save `naturalWidth`/`naturalHeight` to `PageItem`
- Fallback: `fill` works without stored dimensions — no fallback needed

### Block image — `image-block.tsx`
- Pattern: `next/image` with stored `width`/`height` + `style={{ width: '100%', height: 'auto' }}`
- `onLoad` handler saves `naturalWidth`/`naturalHeight` to `ContentBlock` on first load
- Fallback (no dimensions stored yet): plain `<img>` with `width: 100%` until first load completes and dimensions are persisted. On subsequent loads, `next/image` is used with correct dimensions.
- `imageFit`, `imageSize`, `imageCaption`, `imageLightbox` behaviour unchanged

### Lightbox — `image-block.tsx` (full-screen overlay)
- Pattern: `next/image` with `fill` inside `fixed inset-0` container
- No dimensions needed — `fill` covers the viewport

### Canvas feature image (logo/icon) — `canvas-feature-card.tsx`
- Pattern: `next/image` with `fill` inside existing positioned container
- `onLoad` handler saves `naturalWidth`/`naturalHeight` to `CanvasFeature`
- Fallback: `fill` works without stored dimensions

### Avatars — `account-sections.tsx`
- Pattern: `next/image` with fixed `width={40} height={40}` (or `width={64} height={64}` for larger variants)
- No dimension storage needed — display size is fixed by design

### GIF or SVG (any location)
- Pattern: plain `<img>` tag
- Detection: `isPassthroughImage(url)` returns true → skip `next/image`
- GIFs: animated frames would be lost through canvas optimization
- SVGs: vector format, raster optimization provides no benefit

### Video blocks
- Untouched — YouTube embeds, not affected by this spec

## Files changed

| File | Change |
|------|--------|
| `app/_lib/authoring-types.ts` | Add natural dimension fields to `ContentBlock`, `PageItem`, `CanvasFeature` |
| `app/_lib/image-utils.ts` | New file — `isPassthroughImage()` utility |
| `next.config.ts` | Add `images.remotePatterns` for Supabase and Cloudflare |
| `app/_components/canvas/canvas-background.tsx` | Replace `<img>` with `next/image fill`, wire `onLoad` to save dimensions |
| `app/_components/canvas/image-block.tsx` | Replace `<img>` with `next/image`, add dimension fallback logic, lightbox uses `fill` |
| `app/_components/canvas/canvas-feature-card.tsx` | Replace `<img>` with `next/image fill`, wire `onLoad` |
| `app/_components/account/account-sections.tsx` | Replace `<img>` with `next/image` fixed dimensions |
| `app/_components/editor/canvas-feature-type-body.tsx` | Replace `<img>` preview thumbnails with `next/image` |

## Edge cases

| Case | Handling |
|------|---------|
| GIF anywhere | `isPassthroughImage()` → plain `<img>` |
| SVG anywhere | `isPassthroughImage()` → plain `<img>` |
| Block image, no dimensions stored yet | Plain `<img>` on first load; saves dimensions; `next/image` on all subsequent loads |
| External image URL (not Supabase/Cloudflare) | `next/image` will error — `isPassthroughImage` extended to detect non-whitelisted domains and fall back to plain `<img>` |
| Avatar with no photo | Existing initial fallback unchanged |
| `heroImage` set to `color:` prefix | Already handled before image render — no change |

## Verification

1. Load a published game as a player — confirm hero image renders correctly, no layout shift, network tab shows WebP format and smaller file size than original
2. Open a modal with a block image — confirm image fills container width without distortion, lightbox opens full-screen correctly
3. Upload a new hero image — confirm dimensions are saved to the page data, subsequent loads use `next/image` with correct dimensions
4. Open a card with a logo canvas feature — confirm logo renders correctly with transparency intact (PNG logos pass through compression unchanged per A1 spec)
5. Upload a GIF as a block image — confirm it renders and animates correctly via plain `<img>`
6. Check `next.config.ts` domains cover all image sources in use
