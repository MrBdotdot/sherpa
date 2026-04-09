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
