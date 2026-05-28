/**
 * One-time repair for Telegram albums split into multiple Post rows.
 *
 * Finds every mediaGroupId with more than one post, merges all photos and
 * metadata onto the canonical post (lowest telegramMessageId), and deletes
 * the duplicates.
 *
 * Usage:
 *   pnpm run repair:media-groups
 *   pnpm run repair:media-groups -- --dry-run
 */

import "dotenv/config";

import { createScriptPrisma } from "../lib/db";
import {
  mergeMediaPayloads,
  persistMergedPost,
  pickBestMetadata
} from "../lib/telegram/media-groups";

type Args = {
  dryRun: boolean;
};

function parseArgs(): Args {
  return { dryRun: process.argv.includes("--dry-run") };
}

async function main() {
  const { dryRun } = parseArgs();
  const prisma = createScriptPrisma();

  const duplicates = await prisma.$queryRaw<
    Array<{ mediaGroupId: string; post_count: bigint }>
  >`
    SELECT "mediaGroupId", COUNT(*) AS post_count
    FROM "Post"
    WHERE "mediaGroupId" IS NOT NULL
    GROUP BY "mediaGroupId"
    HAVING COUNT(*) > 1
    ORDER BY MIN("telegramMessageId")
  `;

  if (duplicates.length === 0) {
    console.log("[repair] no split albums found.");
    await prisma.$disconnect();
    return;
  }

  console.log(
    `[repair] found ${duplicates.length} split album${
      duplicates.length === 1 ? "" : "s"
    }${dryRun ? " (dry run)" : ""}.`
  );

  for (const row of duplicates) {
    const siblings = await prisma.post.findMany({
      where: { mediaGroupId: row.mediaGroupId },
      include: { media: { orderBy: { orderIndex: "asc" } } },
      orderBy: { telegramMessageId: "asc" }
    });

    const canonicalMessageId = Number(siblings[0].telegramMessageId);
    const mergedMedia = mergeMediaPayloads(siblings, []);
    const cover = mergedMedia[0];

    const metadata = pickBestMetadata(siblings, {
      caption: null,
      contributorUsername: null,
      locationId: null,
      hashtags: [],
      reactions: [],
      views: 0,
      publishedAt: siblings[0].publishedAt,
      dominantColor: cover?.dominantColor ?? "#1d4351",
      aspectRatio: cover?.aspectRatio ?? 1
    });

    console.log(
      `[repair]   ${row.mediaGroupId}: ${siblings.length} posts → slug ${canonicalMessageId} (${mergedMedia.length} photos)`
    );

    if (dryRun) continue;

    await prisma.$transaction(
      async (tx) => {
        await persistMergedPost(tx, {
          canonicalMessageId,
          mediaGroupId: row.mediaGroupId,
          metadata,
          media: mergedMedia,
          siblingPosts: siblings
        });
      },
      { maxWait: 15_000, timeout: 60_000 }
    );
  }

  console.log("[repair] done.");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
