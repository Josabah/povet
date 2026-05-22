import type { MetadataRoute } from "next";

import { getAllPosts, slugify } from "@/lib/posts";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pov.et";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const posts = await getAllPosts();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/explore`, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/about`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${SITE_URL}/submit`, changeFrequency: "yearly", priority: 0.4 }
  ];

  const postEntries: MetadataRoute.Sitemap = posts.map((p) => ({
    url: `${SITE_URL}/post/${p.slug}`,
    lastModified: new Date(p.publishedAt),
    changeFrequency: "yearly",
    priority: 0.8
  }));

  const locations = new Set<string>();
  const contributors = new Set<string>();
  for (const p of posts) {
    if (p.location) locations.add(slugify(p.location));
    if (p.contributorUsername) contributors.add(p.contributorUsername);
  }

  const locationEntries: MetadataRoute.Sitemap = [...locations].map((slug) => ({
    url: `${SITE_URL}/location/${slug}`,
    changeFrequency: "weekly",
    priority: 0.6
  }));

  const contributorEntries: MetadataRoute.Sitemap = [...contributors].map(
    (username) => ({
      url: `${SITE_URL}/photographer/${username}`,
      changeFrequency: "weekly",
      priority: 0.6
    })
  );

  return [
    ...staticPages,
    ...postEntries,
    ...locationEntries,
    ...contributorEntries
  ];
}
