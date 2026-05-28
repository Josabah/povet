/**
 * Re-parse stored Post.caption values with the current parser and refresh
 * location, contributor, caption, and MoodTag links.
 *
 * Safe to re-run. Does not touch Telegram or media bytes.
 *
 *   DATABASE_URL=postgres://… pnpm run reparse:captions
 */

import { createScriptPrisma } from "../lib/db";
import { slugify } from "../lib/posts";
import { parseCaption } from "../lib/telegram/parser";
import { syncPostMoods } from "../lib/telegram/moods";

async function upsertLocation(
  prisma: ReturnType<typeof createScriptPrisma>,
  name: string
): Promise<string> {
  const loc = await prisma.location.upsert({
    where: { slug: slugify(name) },
    update: { name },
    create: { name, slug: slugify(name) }
  });
  return loc.id;
}

async function main() {
  const prisma = createScriptPrisma();
  const posts = await prisma.post.findMany({
    where: { status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      caption: true,
      contributorUsername: true,
      contributorDisplayName: true
    },
    orderBy: { publishedAt: "desc" }
  });

  let updated = 0;

  for (const post of posts) {
    const parsed = parseCaption(post.caption);
    const locationId = parsed.location
      ? await upsertLocation(prisma, parsed.location)
      : null;

    const contributorUsername =
      parsed.contributorUsername ?? post.contributorUsername;
    const contributorDisplayName =
      post.contributorDisplayName ?? contributorUsername;

    await prisma.$transaction(async (tx) => {
      await tx.post.update({
        where: { id: post.id },
        data: {
          caption: parsed.caption,
          contributorUsername,
          contributorDisplayName,
          locationId
        }
      });
      await syncPostMoods(tx, post.id, parsed.hashtags);
    });

    updated += 1;
    console.log(
      `[reparse] ${post.slug}${
        parsed.location ? ` · ${parsed.location}` : ""
      }${parsed.hashtags.length ? ` · ${parsed.hashtags.map((t) => `#${t}`).join(" ")}` : ""}`
    );
  }

  console.log(`[reparse] done — ${updated} posts updated.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
