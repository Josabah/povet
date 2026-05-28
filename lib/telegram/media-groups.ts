/**
 * Media-group reconciliation.
 *
 * Incremental sync often receives one new Telegram message at a time. Each
 * message in an album shares a `mediaGroupId`, but without all siblings in
 * the same fetch batch the grouper produces one-photo "posts". This module
 * collapses those back onto the canonical post (lowest telegramMessageId).
 */

import type { Prisma, PrismaClient } from "@prisma/client";

import { siblingPostSelect } from "../db-selects";
import { enrichMediaPayloadsBlur } from "../media-blur";
import { parseCaption } from "./parser";
import { syncPostMoods } from "./moods";

type PostWithMedia = {
  id: string;
  slug: string;
  telegramMessageId: bigint;
  mediaGroupId: string | null;
  caption: string | null;
  contributorUsername: string | null;
  contributorDisplayName: string | null;
  locationId: string | null;
  reactions: Prisma.JsonValue;
  views: number;
  publishedAt: Date;
  media: Array<{
    imageUrl: string;
    width: number;
    height: number;
    aspectRatio: number;
    orderIndex: number;
    blurHash: string;
    blurDataURL?: string;
    dominantColor: string;
  }>;
};

export type MediaPayload = {
  /** Source Telegram message id — used to sort photos in album order. */
  sourceMessageId: number;
  orderIndex: number;
  url: string;
  width: number;
  height: number;
  aspectRatio: number;
  blurHash: string;
  blurDataURL: string;
  dominantColor: string;
};

export type PostMetadata = {
  caption: string | null;
  contributorUsername: string | null;
  contributorDisplayName: string | null;
  locationId: string | null;
  hashtags: string[];
  reactions: Prisma.InputJsonValue;
  views: number;
  publishedAt: Date;
  dominantColor: string;
  aspectRatio: number;
};

/** Lowest telegramMessageId wins — matches groupMessages anchor semantics. */
export function resolveCanonicalMessageId(
  anchorId: number,
  groupedId: string | null,
  existingMessageIds: ReadonlyArray<number>
): number {
  if (!groupedId) return anchorId;
  const ids = [anchorId, ...existingMessageIds];
  return Math.min(...ids);
}

export function pickBestMetadata(
  siblings: ReadonlyArray<PostWithMedia>,
  incoming: {
    caption: string | null;
    contributorUsername: string | null;
    locationId: string | null;
    hashtags: string[];
    reactions: Prisma.InputJsonValue;
    views: number;
    publishedAt: Date;
    dominantColor: string;
    aspectRatio: number;
  }
): PostMetadata {
  const sources: Array<{
    caption: string | null;
    contributorUsername: string | null;
    contributorDisplayName: string | null;
    locationId: string | null;
    reactions: Prisma.JsonValue;
    views: number;
    publishedAt: Date;
    dominantColor: string | null;
    aspectRatio: number | null;
  }> = [
    ...siblings.map((p) => ({
      caption: p.caption,
      contributorUsername: p.contributorUsername,
      contributorDisplayName: p.contributorDisplayName,
      locationId: p.locationId,
      reactions: p.reactions,
      views: p.views,
      publishedAt: p.publishedAt,
      dominantColor: p.media[0]?.dominantColor ?? null,
      aspectRatio: p.media[0]?.aspectRatio ?? null
    })),
    {
      caption: incoming.caption,
      contributorUsername: incoming.contributorUsername,
      contributorDisplayName: incoming.contributorUsername,
      locationId: incoming.locationId,
      reactions: incoming.reactions as Prisma.JsonValue,
      views: incoming.views,
      publishedAt: incoming.publishedAt,
      dominantColor: incoming.dominantColor,
      aspectRatio: incoming.aspectRatio
    }
  ];

  const rawCaption =
    sources.find((s) => s.caption && s.caption.trim().length > 0)?.caption ??
    null;
  const reparsed = rawCaption ? parseCaption(rawCaption) : null;

  const caption =
    incoming.caption ??
    reparsed?.caption ??
    (rawCaption && !looksStructuredCaption(rawCaption) ? rawCaption.trim() : null);
  const hashtags =
    incoming.hashtags.length > 0 ? [...incoming.hashtags] : reparsed?.hashtags ?? [];

  const contributorUsername =
    sources.find((s) => s.contributorUsername)?.contributorUsername ?? null;

  const contributorDisplayName =
    sources.find((s) => s.contributorDisplayName)?.contributorDisplayName ??
    contributorUsername;

  const locationId = sources.find((s) => s.locationId)?.locationId ?? null;

  const reactions =
    sources.find(
      (s) =>
        Array.isArray(s.reactions) &&
        (s.reactions as unknown[]).length > 0
    )?.reactions ?? incoming.reactions;

  const views = sources.reduce((max, s) => Math.max(max, s.views), 0);

  const publishedAt = sources.reduce(
    (earliest, s) => (s.publishedAt < earliest ? s.publishedAt : earliest),
    incoming.publishedAt
  );

  const coverSource =
    sources.find((s) => s.dominantColor && s.aspectRatio) ?? sources[0];

  return {
    caption,
    contributorUsername,
    contributorDisplayName,
    locationId,
    hashtags,
    reactions: reactions as Prisma.InputJsonValue,
    views,
    publishedAt,
    dominantColor: coverSource?.dominantColor ?? incoming.dominantColor,
    aspectRatio: coverSource?.aspectRatio ?? incoming.aspectRatio
  };
}

/** Merge media from sibling posts + newly downloaded items, deduped by URL. */
export function mergeMediaPayloads(
  existingPosts: ReadonlyArray<PostWithMedia>,
  incoming: ReadonlyArray<Omit<MediaPayload, "orderIndex">>
): MediaPayload[] {
  const byUrl = new Map<string, MediaPayload>();

  for (const post of existingPosts) {
    const messageId = Number(post.telegramMessageId);
    for (const m of post.media) {
      byUrl.set(m.imageUrl, {
        sourceMessageId: messageId,
        orderIndex: m.orderIndex,
        url: m.imageUrl,
        width: m.width,
        height: m.height,
        aspectRatio: m.aspectRatio,
        blurHash: m.blurHash,
        blurDataURL: m.blurDataURL ?? "",
        dominantColor: m.dominantColor
      });
    }
  }

  for (const m of incoming) {
    byUrl.set(m.url, { ...m, orderIndex: 0 });
  }

  const merged = [...byUrl.values()].sort((a, b) => {
    if (a.sourceMessageId !== b.sourceMessageId) {
      return a.sourceMessageId - b.sourceMessageId;
    }
    return a.orderIndex - b.orderIndex;
  });

  return merged.map((m, i) => ({ ...m, orderIndex: i }));
}

export async function findSiblingPosts(
  prismaClient: PrismaClient,
  mediaGroupId: string | null
): Promise<PostWithMedia[]> {
  if (!mediaGroupId) return [];
  return prismaClient.post.findMany({
    where: { mediaGroupId },
    select: siblingPostSelect,
    orderBy: { telegramMessageId: "asc" }
  });
}

export async function persistMergedPost(
  tx: Prisma.TransactionClient,
  opts: {
    canonicalMessageId: number;
    mediaGroupId: string | null;
    metadata: PostMetadata;
    media: MediaPayload[];
    /** All posts in the album — duplicates are deleted after merge. */
    siblingPosts: Array<{ id: string; telegramMessageId: bigint }>;
  }
): Promise<void> {
  const slug = String(opts.canonicalMessageId);

  const saved = await tx.post.upsert({
    where: { telegramMessageId: BigInt(opts.canonicalMessageId) },
    update: {
      slug,
      mediaGroupId: opts.mediaGroupId,
      caption: opts.metadata.caption,
      contributorUsername: opts.metadata.contributorUsername,
      contributorDisplayName: opts.metadata.contributorDisplayName,
      locationId: opts.metadata.locationId,
      reactions: opts.metadata.reactions,
      views: opts.metadata.views,
      dominantColor: opts.metadata.dominantColor,
      aspectRatio: opts.metadata.aspectRatio,
      publishedAt: opts.metadata.publishedAt
    },
    create: {
      slug,
      telegramMessageId: BigInt(opts.canonicalMessageId),
      mediaGroupId: opts.mediaGroupId,
      caption: opts.metadata.caption,
      contributorUsername: opts.metadata.contributorUsername,
      contributorDisplayName: opts.metadata.contributorDisplayName,
      locationId: opts.metadata.locationId,
      reactions: opts.metadata.reactions,
      views: opts.metadata.views,
      dominantColor: opts.metadata.dominantColor,
      aspectRatio: opts.metadata.aspectRatio,
      publishedAt: opts.metadata.publishedAt
    }
  });

  await tx.media.deleteMany({ where: { postId: saved.id } });
  if (opts.media.length > 0) {
    const enriched = await enrichMediaPayloadsBlur(opts.media);
    await tx.media.createMany({
      data: enriched.map((m) => ({
        postId: saved.id,
        imageUrl: m.url,
        thumbnailUrl: m.url,
        width: m.width,
        height: m.height,
        aspectRatio: m.aspectRatio,
        orderIndex: m.orderIndex,
        blurHash: m.blurHash,
        blurDataURL: m.blurDataURL,
        dominantColor: m.dominantColor
      }))
    });
  }

  const duplicateIds = opts.siblingPosts
    .filter((p) => Number(p.telegramMessageId) !== opts.canonicalMessageId)
    .map((p) => p.id);
  if (duplicateIds.length > 0) {
    await tx.post.deleteMany({ where: { id: { in: duplicateIds } } });
  }

  await syncPostMoods(tx, saved.id, opts.metadata.hashtags);
}

function looksStructuredCaption(text: string): boolean {
  return /#|📍|📷|@pov_?et|["""]/i.test(text);
}
