import { supabase } from "@/app/_lib/supabase";

const BUCKET = "sherpa-images";

/** JPEG export quality used for all compressed images. Tune here if needed. */
const COMPRESSION_QUALITY = 0.8;

/** Maximum pixel length of the longest side before downscaling is applied. */
const MAX_DIMENSION = 2400;

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
