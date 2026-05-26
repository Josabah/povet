/**
 * Shared Prisma select/include fragments — list paths omit blurDataURL TEXT.
 */

export const mediaListSelect = {
  id: true,
  imageUrl: true,
  width: true,
  height: true,
  aspectRatio: true,
  orderIndex: true,
  blurHash: true,
  dominantColor: true
} as const;

export const mediaDetailSelect = mediaListSelect;

export const postListInclude = {
  media: { orderBy: { orderIndex: "asc" as const }, select: mediaListSelect },
  location: true
} as const;

export const postDetailInclude = {
  media: { orderBy: { orderIndex: "asc" as const }, select: mediaDetailSelect },
  location: true
} as const;

export const exploreMediaSelect = {
  id: true,
  imageUrl: true,
  width: true,
  height: true,
  aspectRatio: true,
  orderIndex: true,
  blurHash: true,
  dominantColor: true,
  post: {
    select: {
      slug: true,
      caption: true,
      contributorUsername: true,
      contributorDisplayName: true,
      publishedAt: true,
      location: { select: { name: true, slug: true } },
      media: { select: { id: true }, orderBy: { orderIndex: "asc" as const } }
    }
  }
} as const;

export const postIndexSelect = {
  slug: true,
  publishedAt: true,
  contributorUsername: true,
  location: { select: { name: true, slug: true } }
} as const;

export const feedEntryInclude = {
  location: true,
  media: {
    orderBy: { orderIndex: "asc" as const },
    take: 1,
    select: mediaListSelect
  }
} as const;

export const siblingPostSelect = {
  id: true,
  slug: true,
  telegramMessageId: true,
  mediaGroupId: true,
  caption: true,
  contributorUsername: true,
  contributorDisplayName: true,
  locationId: true,
  reactions: true,
  views: true,
  publishedAt: true,
  media: { orderBy: { orderIndex: "asc" as const }, select: mediaListSelect }
} as const;
