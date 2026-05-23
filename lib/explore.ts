/**
 * Explore mode — flattened image stream for visual discovery.
 *
 * Each Media item becomes an ExploreImage. Pagination walks the global
 * sequence (newest posts first, media order within post preserved).
 *
 * Caching: per-request memoization via React `cache()`. Cross-request
 * freshness is handled by the page's `revalidate` window — never trust a
 * module-level variable to live across deploys, serverless instances, or
 * Telegram syncs.
 */

import { cache } from "react";

import { prisma } from "./db";
import {
  dedupeExploreImages,
  findExploreImageIndex,
  getExplorePageFromImages
} from "./explore-list";
import { getAllPosts, slugify } from "./posts";
import type {
  ExploreImage,
  ExplorePage,
  ExploreWindow,
  Media,
  Post
} from "./types";

const DEFAULT_LIMIT = 32;
const READER_BEFORE = 2;
const READER_AFTER = 6;

// ─── Public API ──────────────────────────────────────────────────────────────

export function exploreImageId(postSlug: string, orderIndex: number): string {
  return `${postSlug}-${orderIndex}`;
}

export function parseExploreImageId(id: string): {
  postSlug: string;
  orderIndex: number;
} | null {
  const lastDash = id.lastIndexOf("-");
  if (lastDash <= 0) return null;
  const postSlug = id.slice(0, lastDash);
  const orderIndex = Number.parseInt(id.slice(lastDash + 1), 10);
  if (!Number.isFinite(orderIndex) || orderIndex < 0) return null;
  return { postSlug, orderIndex };
}

export async function getExplorePage(options?: {
  cursor?: string | null;
  limit?: number;
  direction?: "after" | "before";
}): Promise<ExplorePage> {
  const all = await getAllExploreImages();
  return getExplorePageFromImages(all, {
    cursor: options?.cursor,
    limit: options?.limit ?? DEFAULT_LIMIT,
    direction: options?.direction ?? "after"
  });
}

/**
 * Initial window for the reader — a small slice centred on `startId` plus
 * cursors for extending in either direction. Keeps server-side render
 * cheap and lets the client stream more as the user drifts.
 */
export async function getExploreWindow(
  startId: string,
  before: number = READER_BEFORE,
  after: number = READER_AFTER
): Promise<ExploreWindow> {
  const all = await getAllExploreImages();
  const idx = findExploreImageIndex(all, startId);
  if (idx === -1) {
    return { images: [], cursorBefore: null, cursorAfter: null };
  }
  const startIdx = Math.max(0, idx - before);
  const endIdx = Math.min(all.length, idx + after + 1);
  const images = all.slice(startIdx, endIdx);
  return {
    images,
    cursorBefore: startIdx > 0 ? (images[0]?.id ?? null) : null,
    cursorAfter: endIdx < all.length ? (images.at(-1)?.id ?? null) : null
  };
}

export async function getExploreImageById(
  id: string
): Promise<ExploreImage | null> {
  const all = await getAllExploreImages();
  return all.find((img) => img.id === id) ?? null;
}

export async function getExploreNeighbors(id: string): Promise<{
  previous: ExploreImage | null;
  next: ExploreImage | null;
}> {
  const all = await getAllExploreImages();
  const idx = findExploreImageIndex(all, id);
  if (idx === -1) return { previous: null, next: null };
  return {
    previous: all[idx + 1] ?? null,
    next: all[idx - 1] ?? null
  };
}

/**
 * Semantic wandering — score by contributor, location, color, time.
 *
 * If nothing scores (small archive, anonymous image, no shared signals),
 * fall back to the nearest neighbours in publish order so the sidebar is
 * never empty.
 */
export async function getRelatedExploreImages(
  id: string,
  limit = 12
): Promise<ExploreImage[]> {
  const current = await getExploreImageById(id);
  if (!current) return [];

  const all = await getAllExploreImages();
  const hour = new Date(current.publishedAt).getHours();

  const scored = all
    .filter((img) => img.id !== id)
    .map((img) => {
      let score = 0;
      if (
        current.contributorUsername &&
        img.contributorUsername?.toLowerCase() ===
          current.contributorUsername.toLowerCase()
      ) {
        score += 4;
      }
      if (current.locationSlug && img.locationSlug === current.locationSlug) {
        score += 3;
      }
      score += colorAffinity(
        current.media.dominantColor,
        img.media.dominantColor
      );
      const imgHour = new Date(img.publishedAt).getHours();
      if (Math.abs(imgHour - hour) <= 2) score += 1;
      if (Math.abs(img.media.aspectRatio - current.media.aspectRatio) < 0.25) {
        score += 0.5;
      }
      return { img, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  if (scored.length >= 3) {
    return scored.slice(0, limit).map((s) => s.img);
  }

  // Quiet fallback: nearest in time, excluding the current image and any
  // already scored, so we always have something to drift to.
  const idx = findExploreImageIndex(all, id);
  const neighbours: ExploreImage[] = [];
  const taken = new Set<string>([id, ...scored.map((s) => s.img.id)]);
  let step = 1;
  while (neighbours.length + scored.length < limit && step < all.length) {
    const candidates = [all[idx - step], all[idx + step]].filter(
      (c): c is ExploreImage => Boolean(c) && !taken.has(c.id)
    );
    for (const c of candidates) {
      neighbours.push(c);
      taken.add(c.id);
      if (neighbours.length + scored.length >= limit) break;
    }
    step += 1;
  }

  return [...scored.map((s) => s.img), ...neighbours].slice(0, limit);
}

// ─── Builders ────────────────────────────────────────────────────────────────

/**
 * Per-request memoization. Multiple components on the same render (grid,
 * detail, neighbours, related) share one DB hit. Resets between requests
 * so the archive stays fresh.
 */
const getAllExploreImages = cache(async (): Promise<ExploreImage[]> => {
  const raw = prisma
    ? await queryExploreImagesFromDb()
    : flattenPosts(await getAllPosts());
  return dedupeExploreImages(raw);
});

export function flattenPosts(posts: Post[]): ExploreImage[] {
  const images: ExploreImage[] = [];
  for (const post of posts) {
    const locationSlug = post.location ? slugify(post.location) : null;
    for (const m of post.media) {
      images.push({
        id: exploreImageId(post.slug, m.orderIndex),
        media: m,
        postSlug: post.slug,
        caption: post.caption,
        location: post.location,
        locationSlug,
        contributorUsername: post.contributorUsername,
        contributorDisplayName: post.contributorDisplayName,
        publishedAt: post.publishedAt,
        stackSize: post.media.length,
        mediaIndex: m.orderIndex
      });
    }
  }
  return images;
}

function mapDbMedia(row: {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  orderIndex: number;
  blurHash: string;
  blurDataURL: string;
  dominantColor: string;
  post: {
    slug: string;
    caption: string | null;
    contributorUsername: string | null;
    contributorDisplayName: string | null;
    publishedAt: Date;
    location: { name: string; slug: string } | null;
    media: { id: string }[];
  };
}): ExploreImage {
  const media: Media = {
    src: row.imageUrl,
    width: row.width,
    height: row.height,
    aspectRatio: row.aspectRatio,
    orderIndex: row.orderIndex,
    blurHash: row.blurHash,
    blurDataURL: row.blurDataURL,
    dominantColor: row.dominantColor
  };

  return {
    id: row.id,
    media,
    postSlug: row.post.slug,
    caption: row.post.caption,
    location: row.post.location?.name ?? null,
    locationSlug: row.post.location?.slug ?? null,
    contributorUsername: row.post.contributorUsername,
    contributorDisplayName: row.post.contributorDisplayName,
    publishedAt: row.post.publishedAt.toISOString(),
    stackSize: row.post.media.length,
    mediaIndex: row.orderIndex
  };
}

async function queryExploreImagesFromDb(): Promise<ExploreImage[]> {
  if (!prisma) return [];
  const rows = await prisma.media.findMany({
    where: { post: { status: "PUBLISHED" } },
    include: {
      post: {
        include: {
          location: true,
          media: { select: { id: true }, orderBy: { orderIndex: "asc" } }
        }
      }
    },
    orderBy: [{ post: { publishedAt: "desc" } }, { orderIndex: "asc" }]
  });
  return rows.map(mapDbMedia);
}

function colorAffinity(a: string, b: string): number {
  const parse = (hex: string) => {
    const h = hex.replace("#", "");
    if (h.length < 6) return null;
    return [
      Number.parseInt(h.slice(0, 2), 16),
      Number.parseInt(h.slice(2, 4), 16),
      Number.parseInt(h.slice(4, 6), 16)
    ] as const;
  };
  const ca = parse(a);
  const cb = parse(b);
  if (!ca || !cb) return 0;
  const dist = Math.hypot(ca[0] - cb[0], ca[1] - cb[1], ca[2] - cb[2]);
  if (dist < 40) return 2;
  if (dist < 90) return 1;
  return 0;
}
