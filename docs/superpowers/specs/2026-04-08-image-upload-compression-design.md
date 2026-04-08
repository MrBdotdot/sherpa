# Image Upload Compression — Design Spec

**Date:** 2026-04-08
**Status:** Approved

## Context

All publisher-uploaded images (hero images, block images, canvas feature images, avatars) are stored in Supabase Storage and served directly to players at full resolution. There are no upload size limits and no compression. A publisher uploading a 4K board photo at 8MB means every player downloads 8MB on every session load. This spec covers client-side compression applied before upload — reducing storage cost and player load times with no changes to the upload infrastructure.

## Scope

Single new utility function `compressImage()` in `app/_lib/supabase-storage.ts`, called once inside the existing `uploadImage()` function. All four upload hooks benefit automatically with no changes at the hook level.

**Out of scope:** `next/image` render-side optimization (separate spec), CDN proxy (separate spec), upload size limits (separate spec).

## Behaviour

### Entry point

```ts
uploadImage(file, path) {
  file = await compressImage(file)  // ← added
  // existing Supabase upload...
}
```

### compressImage logic

1. **GIF / SVG** — return unchanged. Canvas cannot represent animated GIFs; SVGs are vector.
2. **PNG** — draw to canvas, sample alpha channel via `getImageData()`. If any pixel has alpha < 255, the image uses transparency → return original file unchanged (preserves logos, company marks). If no transparent pixels found → compress to JPEG at 0.8 quality.
3. **All other image types (JPEG, WEBP, etc.)** — read EXIF orientation, apply rotation correction, resize if needed, compress to JPEG at 0.8 quality.

### EXIF orientation correction

- Read first 64 bytes of the file as ArrayBuffer
- Locate the EXIF orientation tag (0x0112) in TIFF header
- Map all 8 EXIF orientation values to canvas transform (translate + rotate + scale combinations)
- On parse failure: default to orientation 1 (no correction) — safe fallback, no crash

### Resize

- Maximum dimension: **2400px** on the longest side
- If image fits within 2400px: no resize, original dimensions preserved
- If image exceeds 2400px: scale proportionally down, maintaining aspect ratio
- No upscaling

### Quality

- JPEG export quality: **0.8** (80%)
- Defined as a named constant `COMPRESSION_QUALITY = 0.8` for easy future tuning

### Output

- Returns a `File` object with the original filename and updated MIME type (`image/jpeg` for compressed files)
- Non-image files (unexpected MIME type): returned unchanged

## Files changed

| File | Change |
|------|--------|
| `app/_lib/supabase-storage.ts` | Add `compressImage()` function, call it inside `uploadImage()` |

No changes to hooks, components, or other lib files.

## Edge cases

| Case | Handling |
|------|---------|
| Logo PNG with transparency | Detected via alpha channel scan → uploaded losslessly |
| Photo saved as PNG (no transparency) | Compressed to JPEG at 0.8 |
| iPhone portrait photo (EXIF rotation) | Corrected via transform before canvas export |
| EXIF parse failure | No rotation applied, compression proceeds normally |
| GIF | Passed through unchanged |
| SVG | Passed through unchanged |
| Non-image file type | Passed through unchanged |
| Image under 2400px | Not resized, quality compression only |

## Verification

1. Upload a JPEG board photo > 2MB — confirm Supabase storage shows file under 1MB, image renders correctly in studio and player
2. Upload a PNG logo with transparency — confirm transparency is preserved in rendered output
3. Upload a photo PNG (no transparency) — confirm it compresses to JPEG
4. Upload an iPhone photo shot in portrait — confirm it renders right-side up
5. Upload a GIF — confirm it uploads and renders unchanged
6. Confirm all four upload contexts work: hero image, block image, canvas feature image, avatar
