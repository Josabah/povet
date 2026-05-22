/**
 * scripts/seed.ts
 *
 * Idempotent seed for the Phase 3 database swap.
 *
 * Reads the bootstrap dataset (lib/mock-data.json) and upserts it into the
 * database referenced by DATABASE_URL. Safe to re-run.
 *
 * Usage:
 *   DATABASE_URL=postgres://… pnpm run db:seed
 */

import { PrismaClient } from "@prisma/client";

import data from "../lib/mock-data.json";
import { slugify } from "../lib/posts";
import type { Post } from "../lib/types";

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is not set. The seed script needs a real database to talk to."
    );
  }

  const prisma = new PrismaClient();
  const posts = data as Post[];

  console.log(`[seed] importing ${posts.length} posts…`);

  let imported = 0;
  let mediaCount = 0;

  for (const post of posts) {
    let locationId: string | null = null;
    if (post.location) {
      const loc = await prisma.location.upsert({
        where: { slug: slugify(post.location) },
        update: { name: post.location },
        create: { name: post.location, slug: slugify(post.location) }
      });
      locationId = loc.id;
    }

    // Upsert the post first, then replace its media (cleaner than trying to
    // diff individual media rows).
    const saved = await prisma.post.upsert({
      where: { telegramMessageId: BigInt(post.telegramMessageId) },
      update: {
        slug: post.slug,
        caption: post.caption,
        contributorUsername: post.contributorUsername,
        contributorDisplayName: post.contributorDisplayName,
        locationId,
        reactions: post.reactions as object,
        views: post.views,
        dominantColor: post.dominantColor,
        aspectRatio: post.aspectRatio,
        publishedAt: new Date(post.publishedAt)
      },
      create: {
        slug: post.slug,
        telegramMessageId: BigInt(post.telegramMessageId),
        caption: post.caption,
        contributorUsername: post.contributorUsername,
        contributorDisplayName: post.contributorDisplayName,
        locationId,
        reactions: post.reactions as object,
        views: post.views,
        dominantColor: post.dominantColor,
        aspectRatio: post.aspectRatio,
        publishedAt: new Date(post.publishedAt)
      }
    });

    await prisma.media.deleteMany({ where: { postId: saved.id } });
    if (post.media.length > 0) {
      await prisma.media.createMany({
        data: post.media.map((m) => ({
          postId: saved.id,
          imageUrl: m.src,
          thumbnailUrl: m.src,
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

    imported += 1;
    mediaCount += post.media.length;
    console.log(
      `[seed]   ✓ ${post.telegramMessageId} (${post.media.length} media)`
    );
  }

  console.log(
    `[seed] done — ${imported} posts, ${mediaCount} media. Source of truth is now the database.`
  );

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("[seed] FAILED:", err);
  process.exit(1);
});
