/**
 * Deterministic blurHash → blurDataURL for next/image placeholders.
 *
 * Matches the pipeline in lib/telegram/media.ts so read-time derivation
 * produces the same visual result as stored DB values without egress.
 */

import { decode as decodeBlurhash } from "blurhash";
import sharp from "sharp";

const PLACEHOLDER_SIZE = 32;

const hashCache = new Map<string, string>();

export async function blurDataURLFromHash(blurHash: string): Promise<string> {
  if (!blurHash) return "";
  const cached = hashCache.get(blurHash);
  if (cached) return cached;

  const decoded = decodeBlurhash(
    blurHash,
    PLACEHOLDER_SIZE,
    PLACEHOLDER_SIZE
  );
  const placeholderPng = await sharp(Buffer.from(decoded), {
    raw: {
      width: PLACEHOLDER_SIZE,
      height: PLACEHOLDER_SIZE,
      channels: 4
    }
  })
    .png({ quality: 70, compressionLevel: 9 })
    .toBuffer();

  const blurDataURL = `data:image/png;base64,${placeholderPng.toString("base64")}`;
  hashCache.set(blurHash, blurDataURL);
  return blurDataURL;
}

/** Fill blurDataURL on media payloads before DB writes (sync path). */
export async function enrichMediaPayloadsBlur<
  T extends { blurHash: string; blurDataURL: string }
>(payloads: T[]): Promise<T[]> {
  return Promise.all(
    payloads.map(async (m) => ({
      ...m,
      blurDataURL: m.blurDataURL || (await blurDataURLFromHash(m.blurHash))
    }))
  );
}
