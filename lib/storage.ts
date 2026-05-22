/**
 * Storage abstraction.
 *
 * Two backends, selected by env at runtime:
 *
 *   • **Local** (default) — writes processed JPEGs to `public/media/`
 *     under content-hashed keys. Served by Next.js as `/media/<key>`.
 *     Good enough for dev and for first-run before R2 is set up.
 *
 *   • **R2** — Cloudflare R2 over the S3-compatible API. Writes immutable,
 *     content-hashed objects with `Cache-Control: public, max-age=31536000,
 *     immutable` and serves them through whatever public base URL the
 *     operator configures (a custom domain like `https://media.pov.et`
 *     or the rate-limited `https://pub-…r2.dev` URL for dev).
 *
 * Selection rule: if `R2_ACCOUNT_ID`, `R2_BUCKET`, and `R2_PUBLIC_URL`
 * are all set, the R2 backend is used. Otherwise we fall back to local.
 *
 * Everything outside this file is backend-agnostic. The sync, the image
 * pipeline, and the Next.js routes only see `uploadImage()` returning
 * a public URL. Swapping backends never requires touching another file.
 */

import { createHash } from "node:crypto";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

export type UploadInput = {
  /** Raw image bytes. */
  bytes: Buffer;
  /** Stable identifier for idempotency (e.g. Telegram photo id). */
  fingerprint: string;
  /** File extension without the dot. */
  extension: "jpg" | "jpeg" | "png" | "webp";
};

export type UploadResult = {
  /** Public URL the website can use (relative for local, absolute for R2). */
  url: string;
  /** Storage key (filename-like). */
  key: string;
};

export type StorageBackendKind = "local" | "r2";

export interface StorageBackend {
  readonly kind: StorageBackendKind;
  /** Human-readable description used in sync logs. */
  describe(): string;
  upload(input: UploadInput): Promise<UploadResult>;
}

// ─── Local backend ──────────────────────────────────────────────────────────

const LOCAL_DIR = path.resolve(process.cwd(), "public", "media");
const LOCAL_PREFIX = "/media";

class LocalBackend implements StorageBackend {
  readonly kind = "local" as const;

  describe(): string {
    return `local filesystem (${path.relative(process.cwd(), LOCAL_DIR)}/)`;
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    await mkdir(LOCAL_DIR, { recursive: true });

    const key = makeKey(input);
    const target = path.join(LOCAL_DIR, key);

    if (!(await exists(target))) {
      await writeFile(target, input.bytes);
    }

    return {
      url: `${LOCAL_PREFIX}/${key}`,
      key
    };
  }
}

async function exists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

// ─── R2 backend ─────────────────────────────────────────────────────────────

type R2Config = {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
};

class R2Backend implements StorageBackend {
  readonly kind = "r2" as const;
  private readonly client: S3Client;
  private readonly cfg: R2Config;

  constructor(cfg: R2Config) {
    this.cfg = cfg;
    this.client = new S3Client({
      // R2 ignores the region but the SDK requires a value.
      region: "auto",
      endpoint: `https://${cfg.accountId}.r2.cloudflarestorage.com`,
      // R2 only supports path-style URLs. Without this, the SDK builds
      // `{bucket}.{accountId}.r2.cloudflarestorage.com`, which does not
      // resolve (ENOTFOUND).
      forcePathStyle: true,
      credentials: {
        accessKeyId: cfg.accessKeyId,
        secretAccessKey: cfg.secretAccessKey
      }
    });
  }

  describe(): string {
    return `Cloudflare R2 (bucket: ${this.cfg.bucket}, public: ${this.cfg.publicUrl})`;
  }

  async upload(input: UploadInput): Promise<UploadResult> {
    const key = makeKey(input);

    // Idempotency: if the object already exists, skip the upload. Our keys
    // are sha1(fingerprint, bytes) so identical content always lands at the
    // same key; HEAD on R2 is cheap.
    const alreadyThere = await this.exists(key);
    if (!alreadyThere) {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.cfg.bucket,
          Key: key,
          Body: input.bytes,
          ContentType: contentTypeFor(input.extension),
          // Content-hashed keys are immutable — same key always means same
          // bytes. Tell every cache between R2 and the browser to keep it
          // forever.
          CacheControl: "public, max-age=31536000, immutable"
        })
      );
    }

    return {
      url: `${trimTrailingSlash(this.cfg.publicUrl)}/${key}`,
      key
    };
  }

  private async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.cfg.bucket, Key: key })
      );
      return true;
    } catch (err: unknown) {
      if (isNotFound(err)) return false;
      throw err;
    }
  }
}

function isNotFound(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as { name?: string; $metadata?: { httpStatusCode?: number } };
  if (e.name === "NotFound" || e.name === "NoSuchKey") return true;
  return e.$metadata?.httpStatusCode === 404;
}

function trimTrailingSlash(s: string): string {
  return s.endsWith("/") ? s.slice(0, -1) : s;
}

function contentTypeFor(ext: UploadInput["extension"]): string {
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
  }
}

// ─── Backend selection ─────────────────────────────────────────────────────

function makeKey(input: UploadInput): string {
  const hash = createHash("sha1")
    .update(input.fingerprint)
    .update(input.bytes)
    .digest("hex")
    .slice(0, 16);
  return `${hash}.${input.extension}`;
}

let cached: StorageBackend | null = null;

function readR2Config(): R2Config | null {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucket = process.env.R2_BUCKET;
  const publicUrl = process.env.R2_PUBLIC_URL;

  // All five must be set for R2 to be considered configured.
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket || !publicUrl) {
    return null;
  }
  return { accountId, accessKeyId, secretAccessKey, bucket, publicUrl };
}

/** Lazily resolve and cache the active backend. */
export function getStorageBackend(): StorageBackend {
  if (cached) return cached;
  const r2 = readR2Config();
  cached = r2 ? new R2Backend(r2) : new LocalBackend();
  return cached;
}

/**
 * Reset the cached backend. Test-only — production code should never call
 * this. Exposed for unit tests that swap env between runs.
 */
export function __resetStorageForTests(): void {
  cached = null;
}

/** Idempotent upload via the active backend. */
export async function uploadImage(input: UploadInput): Promise<UploadResult> {
  return getStorageBackend().upload(input);
}
