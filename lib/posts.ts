/**
 * Data access for the archive.
 *
 * Two backends, one surface:
 *
 *   • When DATABASE_URL is set, queries run against Postgres via Prisma.
 *     This is the production path and the source of truth (see
 *     ARCHITECTURE.md).
 *
 *   • When DATABASE_URL is unset, the same queries are served from
 *     lib/mock-data.json. This keeps the prototype experience working in
 *     fresh clones and on a contributor's machine without a provisioned
 *     database.
 *
 * The fallback is a temporary kindness, not a long-term plan. Once the
 * DB is provisioned and Phase 4's Telegram sync starts running, the
 * JSON file should become a development artifact only.
 */

import data from "./mock-data.json";
import { prisma } from "./db";
import type { Media, Post, Reaction } from "./types";

// ─── Shared utilities ────────────────────────────────────────────────────────

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

// ─── Public surface (async) ──────────────────────────────────────────────────

export async function getAllPosts(): Promise<Post[]> {
  if (prisma) return queryAllPostsFromDb();
  return getAllPostsFromMock();
}

export async function getPostBySlug(slug: string): Promise<Post | null> {
  if (prisma) return queryPostBySlugFromDb(slug);
  return getAllPostsFromMock().find((p) => p.slug === slug) ?? null;
}

export async function getAllSlugs(): Promise<string[]> {
  if (prisma) {
    const rows = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      select: { slug: true }
    });
    return rows.map((r) => r.slug);
  }
  return getAllPostsFromMock().map((p) => p.slug);
}

export async function getNeighbors(slug: string): Promise<{
  previous: Post | null;
  next: Post | null;
}> {
  const ordered = await getAllPosts();
  const idx = ordered.findIndex((p) => p.slug === slug);
  if (idx === -1) return { previous: null, next: null };
  return {
    previous: ordered[idx + 1] ?? null,
    next: ordered[idx - 1] ?? null
  };
}

export async function getPostsByLocation(
  locationSlug: string
): Promise<Post[]> {
  if (prisma) {
    const rows = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        location: { slug: locationSlug }
      },
      include: postInclude,
      orderBy: { publishedAt: "desc" }
    });
    return rows.map(mapPrismaPost);
  }
  return getAllPostsFromMock().filter(
    (p) => p.location && slugify(p.location) === locationSlug
  );
}

export async function getPostsByContributor(username: string): Promise<Post[]> {
  if (prisma) {
    const rows = await prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        contributorUsername: {
          equals: username,
          mode: "insensitive"
        }
      },
      include: postInclude,
      orderBy: { publishedAt: "desc" }
    });
    return rows.map(mapPrismaPost);
  }
  const u = username.toLowerCase();
  return getAllPostsFromMock().filter(
    (p) => p.contributorUsername?.toLowerCase() === u
  );
}

// ─── Prisma path ─────────────────────────────────────────────────────────────

const postInclude = {
  media: { orderBy: { orderIndex: "asc" } },
  location: true
} as const;

async function queryAllPostsFromDb(): Promise<Post[]> {
  if (!prisma) return [];
  const rows = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    include: postInclude,
    orderBy: { publishedAt: "desc" }
  });
  return rows.map(mapPrismaPost);
}

async function queryPostBySlugFromDb(slug: string): Promise<Post | null> {
  if (!prisma) return null;
  const row = await prisma.post.findUnique({
    where: { slug },
    include: postInclude
  });
  return row ? mapPrismaPost(row) : null;
}

type PrismaPostRow = {
  slug: string;
  telegramMessageId: bigint;
  caption: string | null;
  contributorUsername: string | null;
  contributorDisplayName: string | null;
  views: number;
  reactions: unknown;
  publishedAt: Date;
  aspectRatio: number | null;
  dominantColor: string | null;
  location: { name: string; slug: string } | null;
  media: Array<{
    imageUrl: string;
    width: number;
    height: number;
    aspectRatio: number;
    orderIndex: number;
    blurHash: string;
    blurDataURL: string;
    dominantColor: string;
  }>;
};

function mapPrismaPost(row: PrismaPostRow): Post {
  const media: Media[] = row.media.map((m) => ({
    src: m.imageUrl,
    width: m.width,
    height: m.height,
    aspectRatio: m.aspectRatio,
    orderIndex: m.orderIndex,
    blurHash: m.blurHash,
    blurDataURL: m.blurDataURL,
    dominantColor: m.dominantColor
  }));

  const cover = media[0];

  return {
    slug: row.slug,
    telegramMessageId: Number(row.telegramMessageId),
    caption: row.caption,
    location: row.location?.name ?? null,
    contributorUsername: row.contributorUsername,
    contributorDisplayName: row.contributorDisplayName,
    views: row.views,
    reactions: (row.reactions as Reaction[] | null) ?? [],
    publishedAt: row.publishedAt.toISOString(),
    aspectRatio: row.aspectRatio ?? cover?.aspectRatio ?? 1,
    dominantColor: row.dominantColor ?? cover?.dominantColor ?? "#1d4351",
    media
  };
}

// ─── JSON fallback path ──────────────────────────────────────────────────────

function getAllPostsFromMock(): Post[] {
  return [...(data as Post[])].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
