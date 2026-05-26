/**
 * Explore mode — flattened image stream for visual discovery.
 *
 * Each Media item becomes an ExploreImage. Pagination walks the global
 * sequence (newest posts first, media order within post preserved).
 *
 * Caching: per-request memoization via React `cache()` for mock fallback.
 * Cross-request freshness is handled by the page's `revalidate` window.
 */

import { cache } from "react";

import { exploreMediaSelect } from "./db-selects";
import { prisma } from "./db";
import {
  buildExploreAfterWhere,
  buildExploreBeforeWhere,
  exploreAfterOrderBy,
  exploreBeforeOrderBy
} from "./explore-pagination";
import {
  dedupeExploreImages,
  findExploreImageIndex,
  getExplorePageFromImages
} from "./explore-list";
import { blurDataURLFromHash } from "./media-blur";
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
  const limit = options?.limit ?? DEFAULT_LIMIT;
  const direction = options?.direction ?? "after";

  if (prisma) {
    return queryExplorePageFromDb({
      cursor: options?.cursor,
      limit,
      direction
    });
  }

  const all = await getAllExploreImagesMock();
  return getExplorePageFromImages(all, {
    cursor: options?.cursor,
    limit,
    direction
  });
}

export async function getExploreWindow(
  startId: string,
  before: number = READER_BEFORE,
  after: number = READER_AFTER
): Promise<ExploreWindow> {
  if (prisma) {
    const current = await queryExploreImageByIdFromDb(startId);
    if (!current) {
      return { images: [], cursorBefore: null, cursorAfter: null };
    }

    const cursorKey = await resolveExploreSortKey(startId);
    if (!cursorKey) {
      return { images: [], cursorBefore: null, cursorAfter: null };
    }

    const [newerRows, olderRows] = await Promise.all([
      before > 0
        ? prisma.media.findMany({
            where: buildExploreBeforeWhere(cursorKey),
            orderBy: [...exploreBeforeOrderBy],
            take: before,
            select: exploreMediaSelect
          })
        : [],
      after > 0
        ? prisma.media.findMany({
            where: buildExploreAfterWhere(cursorKey),
            orderBy: [...exploreAfterOrderBy],
            take: after,
            select: exploreMediaSelect
          })
        : []
    ]);

    const newer = await Promise.all(
      [...newerRows].reverse().map(mapDbMedia)
    );
    const older = await Promise.all(olderRows.map(mapDbMedia));

    const images = dedupeExploreImages([...newer, current, ...older]);
    return {
      images,
      cursorBefore:
        before > 0 && newerRows.length === before
          ? (newer[0]?.id ?? null)
          : null,
      cursorAfter:
        after > 0 && olderRows.length === after
          ? (older.at(-1)?.id ?? null)
          : null
    };
  }

  const all = await getAllExploreImagesMock();
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
  if (prisma) return queryExploreImageByIdFromDb(id);
  const all = await getAllExploreImagesMock();
  return all.find((img) => img.id === id) ?? null;
}

export async function getExploreNeighbors(id: string): Promise<{
  previous: ExploreImage | null;
  next: ExploreImage | null;
}> {
  if (prisma) return queryExploreNeighborsFromDb(id);

  const all = await getAllExploreImagesMock();
  const idx = findExploreImageIndex(all, id);
  if (idx === -1) return { previous: null, next: null };
  return {
    previous: all[idx + 1] ?? null,
    next: all[idx - 1] ?? null
  };
}

export async function getRelatedExploreImages(
  id: string,
  limit = 12
): Promise<ExploreImage[]> {
  const current = await getExploreImageById(id);
  if (!current) return [];

  const all = prisma
    ? await queryAllExploreImagesFromDb()
    : await getAllExploreImagesMock();
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

const getAllExploreImagesMock = cache(async (): Promise<ExploreImage[]> => {
  const raw = flattenPosts(await getAllPosts());
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

type ExploreMediaRow = {
  id: string;
  imageUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  orderIndex: number;
  blurHash: string;
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
};

async function mapDbMedia(row: ExploreMediaRow): Promise<ExploreImage> {
  const media: Media = {
    src: row.imageUrl,
    width: row.width,
    height: row.height,
    aspectRatio: row.aspectRatio,
    orderIndex: row.orderIndex,
    blurHash: row.blurHash,
    blurDataURL: await blurDataURLFromHash(row.blurHash),
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

async function resolveExploreSortKey(
  id: string
): Promise<{ publishedAt: Date; orderIndex: number } | null> {
  if (!prisma) return null;

  const byId = await prisma.media.findFirst({
    where: { id, post: { status: "PUBLISHED" } },
    select: { orderIndex: true, post: { select: { publishedAt: true } } }
  });
  if (byId) {
    return { publishedAt: byId.post.publishedAt, orderIndex: byId.orderIndex };
  }

  const parsed = parseExploreImageId(id);
  if (!parsed) return null;

  const bySlug = await prisma.media.findFirst({
    where: {
      orderIndex: parsed.orderIndex,
      post: { slug: parsed.postSlug, status: "PUBLISHED" }
    },
    select: { orderIndex: true, post: { select: { publishedAt: true } } }
  });
  if (!bySlug) return null;
  return {
    publishedAt: bySlug.post.publishedAt,
    orderIndex: bySlug.orderIndex
  };
}

async function queryExploreImageByIdFromDb(
  id: string
): Promise<ExploreImage | null> {
  if (!prisma) return null;

  let row = await prisma.media.findFirst({
    where: { id, post: { status: "PUBLISHED" } },
    select: exploreMediaSelect
  });

  if (!row) {
    const parsed = parseExploreImageId(id);
    if (parsed) {
      row = await prisma.media.findFirst({
        where: {
          orderIndex: parsed.orderIndex,
          post: { slug: parsed.postSlug, status: "PUBLISHED" }
        },
        select: exploreMediaSelect
      });
    }
  }

  return row ? mapDbMedia(row) : null;
}

async function queryExploreNeighborsFromDb(id: string): Promise<{
  previous: ExploreImage | null;
  next: ExploreImage | null;
}> {
  if (!prisma) return { previous: null, next: null };

  const cursorKey = await resolveExploreSortKey(id);
  if (!cursorKey) return { previous: null, next: null };

  const [previousRow, nextRow] = await Promise.all([
    prisma.media.findFirst({
      where: buildExploreAfterWhere(cursorKey),
      orderBy: [...exploreAfterOrderBy],
      select: exploreMediaSelect
    }),
    prisma.media.findFirst({
      where: buildExploreBeforeWhere(cursorKey),
      orderBy: [...exploreBeforeOrderBy],
      select: exploreMediaSelect
    })
  ]);

  return {
    previous: previousRow ? await mapDbMedia(previousRow) : null,
    next: nextRow ? await mapDbMedia(nextRow) : null
  };
}

async function queryExplorePageFromDb(options: {
  cursor?: string | null;
  limit: number;
  direction: "after" | "before";
}): Promise<ExplorePage> {
  if (!prisma) return { images: [], nextCursor: null };

  const { cursor, limit, direction } = options;

  if (!cursor) {
    const rows = await prisma.media.findMany({
      where: { post: { status: "PUBLISHED" } },
      orderBy: [...exploreAfterOrderBy],
      take: limit + 1,
      select: exploreMediaSelect
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const images = await Promise.all(slice.map(mapDbMedia));
    return {
      images,
      nextCursor: hasMore ? (images.at(-1)?.id ?? null) : null
    };
  }

  const cursorKey = await resolveExploreSortKey(cursor);
  if (!cursorKey) return { images: [], nextCursor: null };

  if (direction === "after") {
    const rows = await prisma.media.findMany({
      where: buildExploreAfterWhere(cursorKey),
      orderBy: [...exploreAfterOrderBy],
      take: limit + 1,
      select: exploreMediaSelect
    });
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    const images = await Promise.all(slice.map(mapDbMedia));
    return {
      images,
      nextCursor: hasMore ? (images.at(-1)?.id ?? null) : null
    };
  }

  const rows = await prisma.media.findMany({
    where: buildExploreBeforeWhere(cursorKey),
    orderBy: [...exploreBeforeOrderBy],
    take: limit,
    select: exploreMediaSelect
  });
  const images = await Promise.all([...rows].reverse().map(mapDbMedia));
  return {
    images,
    nextCursor: rows.length === limit ? (images[0]?.id ?? null) : null
  };
}

async function queryAllExploreImagesFromDb(): Promise<ExploreImage[]> {
  if (!prisma) return [];
  const rows = await prisma.media.findMany({
    where: { post: { status: "PUBLISHED" } },
    orderBy: [...exploreAfterOrderBy],
    select: exploreMediaSelect
  });
  const images = await Promise.all(rows.map(mapDbMedia));
  return dedupeExploreImages(images);
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
