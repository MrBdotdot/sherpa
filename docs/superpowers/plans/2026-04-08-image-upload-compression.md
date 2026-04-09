# Image Upload Compression Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add client-side image compression to `uploadImage()` so all publisher-uploaded images are reduced in size before reaching Supabase Storage.
**Architecture:** A single `compressImage()` utility function is inserted into the existing `uploadImage()` call in `app/_lib/supabase-storage.ts`; it handles GIF/SVG pass-through, PNG transparency detection, EXIF orientation correction, proportional resize, and JPEG export — all other files in the repo are untouched.
**Tech Stack:** Browser Canvas API (`HTMLCanvasElement`, `CanvasRenderingContext2D`, `getImageData`), `DataView` for inline EXIF parsing, Web `File`/`Blob` APIs, TypeScript.

---

### Task 1: Add the `COMPRESSION_QUALITY` constant and the `compressImage` function stub

**Files:**
- Modify: `app/_lib/supabase-storage.ts`

- [ ] Step 1: Open the file and add the constant and an async stub that returns the file unchanged for now. Replace the entire file with:

```ts
import { supabase } from "@/app/_lib/supabase";

const BUCKET = "sherpa-images";

/** JPEG export quality used for all compressed images. Tune here if needed. */
const COMPRESSION_QUALITY = 0.8;

/** Maximum pixel length of the longest side before downscaling is applied. */
const MAX_DIMENSION = 2400;

/**
 * Compress an image file before upload.
 * - GIF / SVG: returned unchanged (animated GIF frames would be lost on canvas).
 * - PNG with transparency: returned unchanged (preserves logos and marks).
 * - PNG without transparency: compressed to JPEG at COMPRESSION_QUALITY.
 * - All other image types: EXIF-corrected, resized if needed, compressed to JPEG.
 * - Non-image MIME types: returned unchanged.
 */
export async function compressImage(
  file: File,
  // context param reserved for future size-limit spec — not used here
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _context?: string
): Promise<File> {
  return file; // stub — replaced in subsequent tasks
}

export async function uploadImage(
  file: File,
  userId: string,
  gameId: string,
  context?: string
): Promise<string> {
  file = await compressImage(file, context);
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${userId}/${gameId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
```

- [ ] Step 2: Run verification
Run: `npm run build`
Expected: Build succeeds with no TypeScript errors. The stub compiles cleanly and the optional `context` param on `uploadImage` is accepted by all existing callers (they pass no fourth argument, so it defaults to `undefined`).

- [ ] Step 3: Commit
```bash
git commit -m "feat: add compressImage stub and context param to uploadImage"
```

---

### Task 2: Add the GIF / SVG / non-image pass-through

**Files:**
- Modify: `app/_lib/supabase-storage.ts`

- [ ] Step 1: Replace the stub body with a real early-return for non-compressible types:

```ts
export async function compressImage(
  file: File,
  _context?: string
): Promise<File> {
  const { type } = file;

  // GIF: animated frames are not preserved by canvas — pass through unchanged.
  // SVG: vector format, canvas rasterisation would destroy scalability.
  // Non-image: unexpected MIME type — pass through unchanged.
  if (
    type === "image/gif" ||
    type === "image/svg+xml" ||
    !type.startsWith("image/")
  ) {
    return file;
  }

  // PNG and all other image types handled in subsequent tasks.
  return file;
}
```

- [ ] Step 2: Run verification
Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] Step 3: Commit
```bash
git commit -m "feat: pass through GIF, SVG, and non-image files in compressImage"
```

---

### Task 3: Add the inline EXIF orientation parser

**Files:**
- Modify: `app/_lib/supabase-storage.ts`

- [ ] Step 1: Add a private helper function `readExifOrientation` above `compressImage`. This function reads the first 64 bytes of the file and returns the EXIF orientation value (1–8), defaulting to 1 on any parse failure:

```ts
/**
 * Read EXIF orientation from the first 64 bytes of a file.
 * Returns a value 1–8. Returns 1 (no correction) on any parse failure.
 *
 * JPEG EXIF structure (minimal):
 *   0xFFD8        — JPEG SOI marker
 *   0xFFE1        — APP1 marker
 *   2 bytes       — APP1 segment length
 *   "Exif\0\0"   — EXIF header (6 bytes)
 *   II or MM      — byte order (little-endian or big-endian)
 *   0x002A        — TIFF magic
 *   4 bytes       — offset to first IFD
 *   ...IFD entries, each 12 bytes...
 *   tag(2) type(2) count(4) value(4)
 *
 * We only look for tag 0x0112 (Orientation) in the first IFD.
 * The 64-byte budget is enough to reach the IFD entry when the IFD starts
 * immediately after the TIFF header (which is the common case).
 */
async function readExifOrientation(file: File): Promise<number> {
  try {
    const buffer = await file.slice(0, 64).arrayBuffer();
    const view = new DataView(buffer);

    // Must start with JPEG SOI (0xFFD8)
    if (view.getUint16(0) !== 0xffd8) return 1;
    // Next marker must be APP1 (0xFFE1)
    if (view.getUint16(2) !== 0xffe1) return 1;
    // EXIF header: bytes 6–11 must be "Exif\0\0"
    if (
      view.getUint8(6) !== 0x45 || // E
      view.getUint8(7) !== 0x78 || // x
      view.getUint8(8) !== 0x69 || // i
      view.getUint8(9) !== 0x66 || // f
      view.getUint8(10) !== 0x00 ||
      view.getUint8(11) !== 0x00
    ) {
      return 1;
    }

    // TIFF header starts at byte 12.
    // Determine byte order: "II" (0x4949) = little-endian, "MM" (0x4D4D) = big-endian.
    const tiffStart = 12;
    const byteOrderMark = view.getUint16(tiffStart);
    const littleEndian = byteOrderMark === 0x4949;
    if (byteOrderMark !== 0x4949 && byteOrderMark !== 0x4d4d) return 1;

    // TIFF magic must be 0x002A
    if (view.getUint16(tiffStart + 2, littleEndian) !== 0x002a) return 1;

    // Offset to first IFD (relative to tiffStart)
    const ifdOffset = view.getUint32(tiffStart + 4, littleEndian);
    // Number of IFD entries
    const ifdStart = tiffStart + ifdOffset;
    if (ifdStart + 2 > view.byteLength) return 1;
    const entryCount = view.getUint16(ifdStart, littleEndian);

    for (let i = 0; i < entryCount; i++) {
      const entryOffset = ifdStart + 2 + i * 12;
      if (entryOffset + 12 > view.byteLength) break;
      const tag = view.getUint16(entryOffset, littleEndian);
      if (tag === 0x0112) {
        // Orientation tag found — value is a SHORT stored in the value field
        const orientation = view.getUint16(entryOffset + 8, littleEndian);
        if (orientation >= 1 && orientation <= 8) return orientation;
        return 1;
      }
    }
  } catch {
    // Any error (slice, DataView bounds, etc.) → safe fallback
  }
  return 1;
}
```

- [ ] Step 2: Run verification
Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] Step 3: Commit
```bash
git commit -m "feat: add inline EXIF orientation parser (first 64 bytes)"
```

---

### Task 4: Add the canvas draw/resize/export helper

**Files:**
- Modify: `app/_lib/supabase-storage.ts`

- [ ] Step 1: Add a private helper `drawToJpeg` above `compressImage`. This function accepts an `HTMLImageElement` and an orientation value, applies the correct canvas transform, optionally resizes, and returns a JPEG `Blob`:

```ts
/**
 * EXIF orientation → canvas transform mapping.
 *
 * Each orientation describes how the stored pixels must be transformed to
 * produce the visually correct (upright) image.  We apply the inverse
 * transform on the canvas so the output pixels ARE already upright.
 *
 * References:
 *   https://sirv.com/help/articles/rotate-images-to-be-upright/
 *   https://www.daveperrett.com/articles/2012/07/28/exif-orientation-handling-is-a-ghetto/
 *
 *   1 = 0°   normal
 *   2 = flip horizontal
 *   3 = 180°
 *   4 = flip vertical
 *   5 = 90° CW + flip horizontal
 *   6 = 90° CW
 *   7 = 90° CCW + flip horizontal
 *   8 = 90° CCW
 */
async function drawToJpeg(img: HTMLImageElement, orientation: number): Promise<Blob> {
  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;

  // For orientations 5–8 the canvas width/height are swapped (portrait ↔ landscape).
  const swapDimensions = orientation >= 5;
  const longSide = Math.max(srcW, srcH);
  const scale = longSide > MAX_DIMENSION ? MAX_DIMENSION / longSide : 1;

  // Dimensions of the output canvas (after potential rotation swap)
  const outW = swapDimensions
    ? Math.round(srcH * scale)
    : Math.round(srcW * scale);
  const outH = swapDimensions
    ? Math.round(srcW * scale)
    : Math.round(srcH * scale);

  const canvas = document.createElement("canvas");
  canvas.width = outW;
  canvas.height = outH;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get 2d canvas context");

  // Apply EXIF orientation transform before drawing.
  ctx.save();
  switch (orientation) {
    case 1: // No transform
      break;
    case 2: // Flip horizontal
      ctx.translate(outW, 0);
      ctx.scale(-1, 1);
      break;
    case 3: // 180°
      ctx.translate(outW, outH);
      ctx.rotate(Math.PI);
      break;
    case 4: // Flip vertical
      ctx.translate(0, outH);
      ctx.scale(1, -1);
      break;
    case 5: // 90° CW + flip horizontal
      ctx.rotate(Math.PI / 2);
      ctx.scale(1, -1);
      break;
    case 6: // 90° CW
      ctx.translate(outW, 0);
      ctx.rotate(Math.PI / 2);
      break;
    case 7: // 90° CCW + flip horizontal
      ctx.translate(outW, outH);
      ctx.rotate(Math.PI / 2);
      ctx.scale(-1, 1);
      break;
    case 8: // 90° CCW
      ctx.translate(0, outH);
      ctx.rotate(-Math.PI / 2);
      break;
    default:
      break;
  }

  // Draw the source image scaled to fit within MAX_DIMENSION.
  // For swapped orientations, drawImage receives the original srcW×srcH
  // because the transform has already rotated the coordinate system.
  if (swapDimensions) {
    ctx.drawImage(img, 0, 0, srcW * scale, srcH * scale);
  } else {
    ctx.drawImage(img, 0, 0, outW, outH);
  }
  ctx.restore();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("canvas.toBlob returned null"));
      },
      "image/jpeg",
      COMPRESSION_QUALITY
    );
  });
}
```

- [ ] Step 2: Run verification
Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] Step 3: Commit
```bash
git commit -m "feat: add drawToJpeg canvas helper with EXIF orientation and resize"
```

---

### Task 5: Implement the PNG transparency branch in `compressImage`

**Files:**
- Modify: `app/_lib/supabase-storage.ts`

- [ ] Step 1: Replace the `compressImage` stub body with the full PNG branch. The function loads the image into an `HTMLImageElement` and uses `getImageData` to check for any pixel with alpha < 255. Transparent PNGs are returned unchanged; opaque PNGs are compressed to JPEG:

```ts
export async function compressImage(
  file: File,
  _context?: string
): Promise<File> {
  const { type } = file;

  if (
    type === "image/gif" ||
    type === "image/svg+xml" ||
    !type.startsWith("image/")
  ) {
    return file;
  }

  // Helper: load a File into an HTMLImageElement
  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const objectUrl = URL.createObjectURL(file);
  try {
    if (type === "image/png") {
      const img = await loadImage(objectUrl);

      // Sample alpha channel to detect transparency.
      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = img.naturalWidth;
      sampleCanvas.height = img.naturalHeight;
      const sampleCtx = sampleCanvas.getContext("2d");
      if (!sampleCtx) return file; // can't inspect — return unchanged

      sampleCtx.drawImage(img, 0, 0);
      const { data } = sampleCtx.getImageData(
        0,
        0,
        img.naturalWidth,
        img.naturalHeight
      );

      // data is a flat RGBA array: [r,g,b,a, r,g,b,a, ...]
      // Alpha is every 4th byte starting at index 3.
      let hasTransparency = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          hasTransparency = true;
          break;
        }
      }

      if (hasTransparency) {
        // Preserve logos, company marks, etc.
        return file;
      }

      // Opaque PNG — compress to JPEG.
      const blob = await drawToJpeg(img, 1 /* no EXIF rotation for PNG */);
      return new File([blob], file.name, { type: "image/jpeg" });
    }

    // All other image types (JPEG, WEBP, etc.) handled in Task 6.
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
```

- [ ] Step 2: Run verification
Run: `npm run build`
Expected: Build succeeds with no TypeScript errors.

- [ ] Step 3: Commit
```bash
git commit -m "feat: compress opaque PNGs to JPEG, pass through transparent PNGs"
```

---

### Task 6: Implement the JPEG / WEBP / other branch in `compressImage`

**Files:**
- Modify: `app/_lib/supabase-storage.ts`

- [ ] Step 1: Replace the `// All other image types handled in Task 6` stub line with the EXIF-read + compress path. The complete `compressImage` function now looks like this (replace only the function, the rest of the file is unchanged):

```ts
export async function compressImage(
  file: File,
  _context?: string
): Promise<File> {
  const { type } = file;

  if (
    type === "image/gif" ||
    type === "image/svg+xml" ||
    !type.startsWith("image/")
  ) {
    return file;
  }

  const loadImage = (src: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });

  const objectUrl = URL.createObjectURL(file);
  try {
    if (type === "image/png") {
      const img = await loadImage(objectUrl);

      const sampleCanvas = document.createElement("canvas");
      sampleCanvas.width = img.naturalWidth;
      sampleCanvas.height = img.naturalHeight;
      const sampleCtx = sampleCanvas.getContext("2d");
      if (!sampleCtx) return file;

      sampleCtx.drawImage(img, 0, 0);
      const { data } = sampleCtx.getImageData(
        0,
        0,
        img.naturalWidth,
        img.naturalHeight
      );

      let hasTransparency = false;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 255) {
          hasTransparency = true;
          break;
        }
      }

      if (hasTransparency) {
        return file;
      }

      const blob = await drawToJpeg(img, 1);
      return new File([blob], file.name, { type: "image/jpeg" });
    }

    // JPEG, WEBP, and all other image types:
    // Read EXIF orientation, apply correction, resize if needed, export JPEG.
    const orientation = await readExifOrientation(file);
    const img = await loadImage(objectUrl);
    const blob = await drawToJpeg(img, orientation);
    return new File([blob], file.name, { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
```

- [ ] Step 2: Run verification
Run: `npm run build`
Expected: Build succeeds with no TypeScript errors. The complete feature is now implemented.

- [ ] Step 3: Commit
```bash
git commit -m "feat: add EXIF-corrected JPEG compression for non-PNG image uploads"
```

---

### Task 7: Final review and full build verification

**Files:**
- No changes — verification only.

- [ ] Step 1: Review the complete `app/_lib/supabase-storage.ts` to confirm the file is coherent: constants at top, helpers (`readExifOrientation`, `drawToJpeg`) before `compressImage`, `compressImage` before `uploadImage`, `uploadImage` calling `compressImage` with the `context` param threaded through.

- [ ] Step 2: Run verification
Run: `npm run build`
Expected: Clean build, zero TypeScript errors, zero warnings about unused variables. The `_context` parameter intentionally prefixed with `_` to silence the unused-var lint rule.

- [ ] Step 3: Manual smoke-test checklist (in the running dev server):
  - Upload a JPEG photo > 2MB — inspect Network tab, confirm upload payload is visibly smaller.
  - Upload a PNG with transparency (a logo) — confirm it renders with transparency intact in studio.
  - Upload an opaque PNG photo — confirm it is accepted and renders correctly.
  - Upload an iPhone portrait JPEG — confirm the preview renders right-side up.
  - Upload a GIF — confirm it uploads and plays correctly.

- [ ] Step 4: Commit (only if any minor fixups were needed during review)
```bash
git commit -m "fix: minor cleanup after image compression review"
```
