/**
 * scripts/bootstrap-mock.ts
 *
 * One-off Phase 1 bootstrap. Curates a mock dataset from the public
 * channel preview at https://t.me/s/pov_et so we can build the feed
 * against real photography without needing the GramJS sync (Phase 4).
 *
 * This is intentionally simple. It is NOT the production sync.
 *
 * Output:
 *   - public/mock/<hash>.jpg               (downloaded images)
 *   - lib/mock-data.json                   (typed Post[] payload)
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";

import { load, type CheerioAPI } from "cheerio";
import sharp from "sharp";
import { encode as encodeBlurhash, decode as decodeBlurhash } from "blurhash";

import type { Media, Post, Reaction } from "../lib/types";
import { parseCaption } from "../lib/telegram/parser";

const CHANNEL = "pov_et";
const PAGES_TO_FETCH = 4;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) povet-bootstrap/0.1";

const PUBLIC_MOCK_DIR = path.resolve(process.cwd(), "public", "mock");
const OUTPUT_JSON = path.resolve(process.cwd(), "lib", "mock-data.json");

async function main() {
  await mkdir(PUBLIC_MOCK_DIR, { recursive: true });

  console.log(`[bootstrap] fetching up to ${PAGES_TO_FETCH} pages of @${CHANNEL}…`);

  const rawPosts: RawPost[] = [];
  let before: string | null = null;

  for (let page = 0; page < PAGES_TO_FETCH; page++) {
    const url = before
      ? `https://t.me/s/${CHANNEL}?before=${before}`
      : `https://t.me/s/${CHANNEL}`;

    console.log(`[bootstrap]   page ${page + 1}: ${url}`);
    const html = await fetchText(url);
    const $ = load(html);
    const parsed = parsePage($);

    if (parsed.posts.length === 0) {
      console.log("[bootstrap]   no more posts; stopping pagination.");
      break;
    }

    rawPosts.push(...parsed.posts);
    if (!parsed.olderCursor) break;
    before = parsed.olderCursor;
  }

  // Deduplicate by telegramMessageId and keep the newest first.
  const byId = new Map<number, RawPost>();
  for (const p of rawPosts) byId.set(p.telegramMessageId, p);
  const unique = [...byId.values()]
    .filter((p) => p.images.length > 0)
    .sort((a, b) => b.telegramMessageId - a.telegramMessageId);

  console.log(`[bootstrap] parsed ${unique.length} photo posts. processing…`);

  const posts: Post[] = [];

  for (const raw of unique) {
    try {
      const media: Media[] = [];
      for (let i = 0; i < raw.images.length; i++) {
        const img = raw.images[i];
        const processed = await downloadAndProcess(img.url, i);
        media.push({
          ...processed,
          orderIndex: i
        });
      }

      const cover = media[0];

      posts.push({
        slug: String(raw.telegramMessageId),
        telegramMessageId: raw.telegramMessageId,
        caption: raw.caption,
        location: raw.location,
        contributorUsername: raw.contributorUsername,
        contributorDisplayName: raw.contributorUsername, // mock: same as username
        views: raw.views,
        reactions: raw.reactions,
        publishedAt: raw.publishedAt,
        aspectRatio: cover.aspectRatio,
        dominantColor: cover.dominantColor,
        media
      });

      console.log(
        `[bootstrap]   ✓ ${raw.telegramMessageId} (${raw.images.length} image${
          raw.images.length === 1 ? "" : "s"
        })`
      );
    } catch (err) {
      console.warn(
        `[bootstrap]   ✗ ${raw.telegramMessageId} skipped:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  await writeFile(OUTPUT_JSON, JSON.stringify(posts, null, 2));
  console.log(`[bootstrap] wrote ${posts.length} posts → ${path.relative(process.cwd(), OUTPUT_JSON)}`);
}

type RawImage = { url: string; aspectRatio: number };

type RawPost = {
  telegramMessageId: number;
  caption: string | null;
  location: string | null;
  contributorUsername: string | null;
  views: number;
  reactions: Reaction[];
  publishedAt: string;
  images: RawImage[];
};

function parsePage($: CheerioAPI): { posts: RawPost[]; olderCursor: string | null } {
  const posts: RawPost[] = [];

  $(".tgme_widget_message_wrap").each((_, el) => {
    const $msg = $(el).find(".tgme_widget_message").first();
    const dataPost = $msg.attr("data-post");
    if (!dataPost) return;
    const idStr = dataPost.split("/")[1];
    if (!idStr) return;
    const telegramMessageId = Number(idStr);
    if (!Number.isFinite(telegramMessageId)) return;

    const images: RawImage[] = [];
    $(el)
      .find(".tgme_widget_message_photo_wrap")
      .each((_, ph) => {
        const style = $(ph).attr("style") ?? "";
        const m = style.match(/background-image:url\('([^']+)'\)/);
        if (!m) return;
        const ratio = Number($(ph).attr("data-ratio")) || 1;
        images.push({ url: m[1], aspectRatio: ratio });
      });

    if (images.length === 0) return;

    const captionRaw = $(el).find(".tgme_widget_message_text.js-message_text").last();
    const captionText = htmlToPlain($, captionRaw);

    const { location, contributorUsername, body } = parseCaption(captionText);

    const reactions: Reaction[] = [];
    $(el)
      .find(".tgme_widget_message_reactions .tgme_reaction")
      .each((_, rEl) => {
        const $r = $(rEl);
        const emoji = readEmoji($, $r);
        const text = $r.text().trim();
        const count = Number(text.replace(/[^\d]/g, "")) || 0;
        if (emoji) reactions.push({ emoji, count });
      });

    const time = $(el).find(".tgme_widget_message_date time").attr("datetime");
    const views = Number(
      ($(el).find(".tgme_widget_message_views").text() || "0")
        .replace(/[^\d.]/g, "")
        .trim()
    );

    posts.push({
      telegramMessageId,
      caption: body,
      location,
      contributorUsername,
      views: Number.isFinite(views) ? views : 0,
      reactions,
      publishedAt: time ?? new Date().toISOString(),
      images
    });
  });

  const moreBefore =
    $(".tme_messages_more.js-messages_more").attr("data-before") ?? null;

  return { posts, olderCursor: moreBefore };
}

function htmlToPlain($: CheerioAPI, node: ReturnType<CheerioAPI>): string {
  if (!node.length) return "";
  const clone = node.clone();
  // Replace emoji <i> tags with their unicode <b> child.
  clone.find("i.emoji").each((_, el) => {
    const $el = $(el);
    const txt = $el.find("b").text();
    $el.replaceWith(txt);
  });
  // Replace <br> with newlines.
  clone.find("br").replaceWith("\n");
  // Decode & trim.
  return clone
    .text()
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function readEmoji($: CheerioAPI, $r: ReturnType<CheerioAPI>): string | null {
  const $i = $r.find("i.emoji b");
  const txt = $i.text().trim();
  return txt.length ? txt : null;
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`fetch ${url} failed: ${res.status}`);
  return res.text();
}

type Processed = Omit<Media, "orderIndex">;

async function downloadAndProcess(url: string, idx: number): Promise<Processed> {
  const hash = createHash("sha1").update(url).digest("hex").slice(0, 16);
  const filename = `${hash}.jpg`;
  const outPath = path.join(PUBLIC_MOCK_DIR, filename);
  const publicSrc = `/mock/${filename}`;

  const exists = await fileExists(outPath);

  let buffer: Buffer;
  if (exists) {
    buffer = await sharp(outPath).toBuffer();
  } else {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) throw new Error(`image fetch ${url} failed: ${res.status}`);
    const arr = await res.arrayBuffer();
    buffer = Buffer.from(arr);
    // Mild normalization only: re-encode as jpeg without aggressive resizing.
    // Preserves texture. We honor the photographic source.
    const normalized = await sharp(buffer)
      .rotate()
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer();
    await writeFile(outPath, normalized);
    buffer = normalized;
  }

  const metadata = await sharp(buffer).metadata();
  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;
  if (!width || !height) throw new Error(`bad metadata for image ${idx}`);

  // Blurhash from a small downscale.
  const { data, info } = await sharp(buffer)
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

  // Decode blurhash back into a tiny PNG so we can embed it as a
  // next/image blurDataURL without shipping the decoder to the client.
  const placeholderSize = 32;
  const decoded = decodeBlurhash(blurHash, placeholderSize, placeholderSize);
  const placeholderPng = await sharp(Buffer.from(decoded), {
    raw: { width: placeholderSize, height: placeholderSize, channels: 4 }
  })
    .png({ quality: 70, compressionLevel: 9 })
    .toBuffer();
  const blurDataURL = `data:image/png;base64,${placeholderPng.toString("base64")}`;

  const { dominant } = await sharp(buffer).stats();
  const dominantColor = rgbToHex(dominant.r, dominant.g, dominant.b);

  return {
    src: publicSrc,
    width,
    height,
    aspectRatio: width / height,
    blurHash,
    blurDataURL,
    dominantColor
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err) => {
  console.error("[bootstrap] FAILED:", err);
  process.exit(1);
});
