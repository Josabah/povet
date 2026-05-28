import { blurDataURLFromHash } from "./media-blur";
import type { Media, Post, Reaction } from "./types";

type MediaRow = {
  imageUrl: string;
  width: number;
  height: number;
  aspectRatio: number;
  orderIndex: number;
  blurHash: string;
  dominantColor: string;
};

type MoodRow = {
  mood: { name: string; slug: string };
};

type PostRowBase = {
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
  media: MediaRow[];
  moods?: MoodRow[];
};

export function mapMoodNames(rows?: MoodRow[]): string[] {
  return (rows ?? [])
    .map((row) => row.mood.name)
    .sort((a, b) => a.localeCompare(b));
}

export async function mapMediaRow(m: MediaRow): Promise<Media> {
  return {
    src: m.imageUrl,
    width: m.width,
    height: m.height,
    aspectRatio: m.aspectRatio,
    orderIndex: m.orderIndex,
    blurHash: m.blurHash,
    blurDataURL: await blurDataURLFromHash(m.blurHash),
    dominantColor: m.dominantColor
  };
}

export async function mapPrismaPost(row: PostRowBase): Promise<Post> {
  const media = await Promise.all(row.media.map(mapMediaRow));
  const cover = media[0];

  return {
    slug: row.slug,
    telegramMessageId: Number(row.telegramMessageId),
    caption: row.caption,
    location: row.location?.name ?? null,
    contributorUsername: row.contributorUsername,
    contributorDisplayName: row.contributorDisplayName,
    moods: mapMoodNames(row.moods),
    views: row.views,
    reactions: (row.reactions as Reaction[] | null) ?? [],
    publishedAt: row.publishedAt.toISOString(),
    aspectRatio: row.aspectRatio ?? cover?.aspectRatio ?? 1,
    dominantColor: row.dominantColor ?? cover?.dominantColor ?? "#1d4351",
    media
  };
}
