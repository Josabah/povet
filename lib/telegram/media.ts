/**
 * Image processing for the Telegram sync.
 *
 * IMPORTANT — texture is emotional information.
 *
 * This pipeline does as little to the photograph as possible:
 *
 *   • We do NOT recompress by default. The bytes that arrive from Telegram
 *     are uploaded to storage as-is. Telegram already applies its own
 *     compression at upload time; adding a second generation of JPEG loss
 *     here would sterilize the archive.
 *
 *   • We re-encode ONLY when the source has an EXIF orientation tag that
 *     differs from the displayed orientation (so the photo looks correct
 *     in browsers that ignore orientation). In that case we re-encode at
 *     visually-lossless quality (mozjpeg q=95, chroma 4:4:4) so the
 *     re-save is as faithful as we can make it.
 *
 *   • Blurhash, blurDataURL, and dominant color are extracted from a
 *     tiny downscale that never affects the served output. They are
 *     PLACEHOLDER metadata only.
 *
 * Result: served photographs preserve their original texture, grain,
 * dark tones, and softness. No AI enhancement, no sharpening, no
 * "clean-up".
 */

import sharp from "sharp";
import { encode as encodeBlurhash } from "blurhash";

import { blurDataURLFromHash } from "../media-blur";
import { uploadImage, type UploadInput } from "../storage";

export type ProcessedMedia = {
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurHash: string;
  blurDataURL: string;
  dominantColor: string;
};

/**
 * Process a single image's bytes and persist via the storage layer.
 *
 * `fingerprint` should be a stable identifier (e.g. the Telegram photo
 * id) so that re-runs are idempotent.
 */
export async function processAndStore(
  bytes: Buffer,
  fingerprint: string
): Promise<ProcessedMedia> {
  // ── 1. Inspect (cheap; no decode of the output stream) ──────────────
  const metadata = await sharp(bytes).metadata();
  const format = metadata.format ?? "jpeg";
  // EXIF orientation values 2..8 require rotation/mirroring to display
  // correctly. 1 or unset is the identity transform.
  const needsRotation =
    typeof metadata.orientation === "number" && metadata.orientation > 1;

  // ── 2. Resolve served bytes ────────────────────────────────────────
  // Default: pass-through. Re-encode ONLY when we must.
  let servedBytes: Buffer = bytes;
  let extension: UploadInput["extension"] = pickExtension(format);

  if (needsRotation) {
    // We must bake the rotation in, otherwise some browsers will display
    // the photo sideways. Use visually-lossless settings so this is the
    // closest thing to a no-op re-encode.
    servedBytes = await sharp(bytes)
      .rotate()
      .jpeg({
        quality: 95,
        mozjpeg: true,
        chromaSubsampling: "4:4:4"
      })
      .toBuffer();
    extension = "jpg";
  }

  // ── 3. Dimensions of the SERVED bytes (post-rotation if any) ───────
  // Re-read because rotation swaps width/height.
  const servedMeta = needsRotation
    ? await sharp(servedBytes).metadata()
    : metadata;
  const width = servedMeta.width ?? 0;
  const height = servedMeta.height ?? 0;
  if (!width || !height) {
    throw new Error(`unable to read image dimensions for ${fingerprint}`);
  }

  // ── 4. Placeholder + metadata (NEVER touches served bytes) ─────────
  const { data, info } = await sharp(servedBytes)
    .rotate() // safe no-op if orientation is already identity
    .raw()
    .ensureAlpha()
    .resize(32, 32, { fit: "inside" })
    .toBuffer({ resolveWithObject: true });

  const blurHash = encodeBlurhash(
    new Uint8ClampedArray(data),
    info.width,
    info.height,
    4,
    4
  );

  const blurDataURL = await blurDataURLFromHash(blurHash);

  const { dominant } = await sharp(servedBytes).rotate().stats();
  const dominantColor = rgbToHex(dominant.r, dominant.g, dominant.b);

  // ── 5. Upload ──────────────────────────────────────────────────────
  const uploaded = await uploadImage({
    bytes: servedBytes,
    fingerprint,
    extension
  });

  return {
    url: uploaded.url,
    width,
    height,
    aspectRatio: width / height,
    blurHash,
    blurDataURL,
    dominantColor
  };
}

function pickExtension(format: string): UploadInput["extension"] {
  switch (format) {
    case "png":
      return "png";
    case "webp":
      return "webp";
    case "jpeg":
    case "jpg":
    default:
      return "jpg";
  }
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}
