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
