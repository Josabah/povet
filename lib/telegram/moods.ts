import type { Prisma } from "@prisma/client";

import { slugify } from "../posts";

/** Upsert MoodTag rows and replace PostMood links for one post. */
export async function syncPostMoods(
  tx: Prisma.TransactionClient,
  postId: string,
  hashtags: ReadonlyArray<string>
): Promise<void> {
  await tx.postMood.deleteMany({ where: { postId } });

  for (const tag of hashtags) {
    const name = tag.trim();
    if (!name) continue;
    const slug = slugify(name);
    if (!slug) continue;

    const mood = await tx.moodTag.upsert({
      where: { slug },
      update: { name },
      create: { name, slug }
    });

    await tx.postMood.create({
      data: { postId, moodId: mood.id }
    });
  }
}
