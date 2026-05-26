/**
 * Cross-route archive caching — dedupes Neon reads within the ISR window.
 */

import { unstable_cache } from "next/cache";

import {
  feedEntryInclude,
  postIndexSelect,
  postListInclude
} from "./db-selects";
import { prisma } from "./db";
import { mapPrismaPost } from "./post-mapper";
import type { Post } from "./types";

export const ARCHIVE_TAG = "archive";
export const REVALIDATE_SECONDS = 300;

export type PostIndexEntry = {
  slug: string;
  publishedAt: string;
  location: string | null;
  contributorUsername: string | null;
};

async function queryFeedPostsFromDb(): Promise<Post[]> {
  if (!prisma) return [];
  const rows = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    include: postListInclude,
    orderBy: { publishedAt: "desc" }
  });
  return Promise.all(rows.map(mapPrismaPost));
}

async function queryPostIndexFromDb(): Promise<PostIndexEntry[]> {
  if (!prisma) return [];
  const rows = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: postIndexSelect,
    orderBy: { publishedAt: "desc" }
  });
  return rows.map((row) => ({
    slug: row.slug,
    publishedAt: row.publishedAt.toISOString(),
    location: row.location?.name ?? null,
    contributorUsername: row.contributorUsername
  }));
}

async function queryFeedEntriesFromDb(): Promise<Post[]> {
  if (!prisma) return [];
  const rows = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    include: feedEntryInclude,
    orderBy: { publishedAt: "desc" }
  });
  return Promise.all(rows.map(mapPrismaPost));
}

export const getCachedFeedPosts = unstable_cache(
  queryFeedPostsFromDb,
  ["archive-feed-posts"],
  { revalidate: REVALIDATE_SECONDS, tags: [ARCHIVE_TAG] }
);

export const getCachedPostIndex = unstable_cache(
  queryPostIndexFromDb,
  ["archive-post-index"],
  { revalidate: REVALIDATE_SECONDS, tags: [ARCHIVE_TAG] }
);

export const getCachedFeedEntries = unstable_cache(
  queryFeedEntriesFromDb,
  ["archive-feed-entries"],
  { revalidate: REVALIDATE_SECONDS, tags: [ARCHIVE_TAG] }
);
