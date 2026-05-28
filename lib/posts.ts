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
import {
  getCachedFeedEntries,
  getCachedFeedPosts,
  getCachedPostIndex,
  type PostIndexEntry
} from "./archive-cache";
import { postDetailInclude, postListInclude } from "./db-selects";
import { prisma } from "./db";
import { mapPrismaPost } from "./post-mapper";
import type { Post } from "./types";

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
  if (prisma) return getCachedFeedPosts();
  return getAllPostsFromMock();
}

export async function getFeedEntries(): Promise<Post[]> {
  if (prisma) return getCachedFeedEntries();
  return getAllPostsFromMock();
}

export async function getPostIndex(): Promise<PostIndexEntry[]> {
  if (prisma) return getCachedPostIndex();
  return getAllPostsFromMock().map((p) => ({
    slug: p.slug,
    publishedAt: p.publishedAt,
    location: p.location,
    contributorUsername: p.contributorUsername
  }));
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
  if (prisma) return queryNeighborsFromDb(slug);
  const ordered = getAllPostsFromMock();
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
      include: postListInclude,
      orderBy: { publishedAt: "desc" }
    });
    return Promise.all(rows.map(mapPrismaPost));
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
      include: postListInclude,
      orderBy: { publishedAt: "desc" }
    });
    return Promise.all(rows.map(mapPrismaPost));
  }
  const u = username.toLowerCase();
  return getAllPostsFromMock().filter(
    (p) => p.contributorUsername?.toLowerCase() === u
  );
}

// ─── Prisma path ─────────────────────────────────────────────────────────────

async function queryPostBySlugFromDb(slug: string): Promise<Post | null> {
  if (!prisma) return null;
  const row = await prisma.post.findUnique({
    where: { slug },
    include: postDetailInclude
  });
  return row ? mapPrismaPost(row) : null;
}

async function queryNeighborsFromDb(slug: string): Promise<{
  previous: Post | null;
  next: Post | null;
}> {
  if (!prisma) return { previous: null, next: null };

  const ordered = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
    orderBy: { publishedAt: "desc" }
  });

  const idx = ordered.findIndex((p) => p.slug === slug);
  if (idx === -1) return { previous: null, next: null };

  const previousSlug = ordered[idx + 1]?.slug ?? null;
  const nextSlug = ordered[idx - 1]?.slug ?? null;

  const [previous, next] = await Promise.all([
    previousSlug ? queryPostBySlugFromDb(previousSlug) : null,
    nextSlug ? queryPostBySlugFromDb(nextSlug) : null
  ]);

  return { previous, next };
}

// ─── JSON fallback path ──────────────────────────────────────────────────────

function getAllPostsFromMock(): Post[] {
  return [...(data as Post[])].map((post) => ({
    ...post,
    moods: post.moods ?? []
  })).sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
  );
}
