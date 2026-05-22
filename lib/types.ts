/**
 * Shared content types.
 *
 * Shape intentionally mirrors the future Prisma model in ARCHITECTURE.md
 * so that swapping the JSON loader for a DB query in Phase 3 is a
 * non-structural change.
 */

export type Reaction = {
  emoji: string;
  count: number;
};

export type Media = {
  src: string;
  width: number;
  height: number;
  aspectRatio: number;
  orderIndex: number;
  blurHash: string;
  blurDataURL: string;
  dominantColor: string;
};

export type Post = {
  slug: string;
  telegramMessageId: number;
  caption: string | null;
  location: string | null;
  contributorUsername: string | null;
  contributorDisplayName: string | null;
  views: number;
  reactions: Reaction[];
  publishedAt: string;
  aspectRatio: number;
  dominantColor: string;
  media: Media[];
};

/** One photograph in the explore canvas — flattened from posts/stacks. */
export type ExploreImage = {
  /** Stable id: `{postSlug}-{orderIndex}` or Prisma media id. */
  id: string;
  media: Media;
  postSlug: string;
  caption: string | null;
  location: string | null;
  locationSlug: string | null;
  contributorUsername: string | null;
  contributorDisplayName: string | null;
  publishedAt: string;
  stackSize: number;
  mediaIndex: number;
};

export type ExplorePage = {
  images: ExploreImage[];
  /** Cursor for the next request in the same direction; null if exhausted. */
  nextCursor: string | null;
};

/** Initial window centred on a specific image, used by the reader on mount. */
export type ExploreWindow = {
  images: ExploreImage[];
  cursorBefore: string | null;
  cursorAfter: string | null;
};
