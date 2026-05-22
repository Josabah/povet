/**
 * /feed.xml — RSS 2.0 feed of the archive.
 *
 * Slow-internet kindred spirit: people who follow editorial archives often
 * read by RSS. The feed mirrors the website's tone — no engagement metrics,
 * no tracking pixels, just the post, the place, and the photographer.
 */

import { getAllPosts } from "@/lib/posts";
import { formatContributor } from "@/lib/format";

export const revalidate = 300;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://pov.et";

export async function GET() {
  const posts = await getAllPosts();
  const lastBuild = posts[0]
    ? new Date(posts[0].publishedAt).toUTCString()
    : new Date().toUTCString();

  const items = posts
    .map((post) => {
      const url = `${SITE_URL}/post/${post.slug}`;
      const title = post.location
        ? post.location
        : formatContributor(
            post.contributorUsername,
            post.contributorDisplayName
          );
      const contributor = formatContributor(
        post.contributorUsername,
        post.contributorDisplayName
      );
      const cover = post.media[0];
      const coverUrl = cover ? `${SITE_URL}${cover.src}` : null;

      const bodyParts = [
        post.caption ? `<p>${escapeHtml(post.caption)}</p>` : null,
        post.location ? `<p><em>${escapeHtml(post.location)}</em></p>` : null,
        coverUrl
          ? `<p><img src="${coverUrl}" alt="" width="${cover.width}" height="${cover.height}" /></p>`
          : null,
        `<p>— ${escapeHtml(contributor)}</p>`
      ].filter(Boolean);

      const description = bodyParts.join("");

      return `<item>
  <title>${escapeXml(title)}</title>
  <link>${url}</link>
  <guid isPermaLink="true">${url}</guid>
  <pubDate>${new Date(post.publishedAt).toUTCString()}</pubDate>
  <dc:creator>${escapeXml(contributor)}</dc:creator>
  ${coverUrl ? `<enclosure url="${coverUrl}" type="image/jpeg" />` : ""}
  <description><![CDATA[${description}]]></description>
</item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>pov.et — Ethiopia, softly</title>
  <link>${SITE_URL}</link>
  <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
  <description>A quiet archive of everyday Ethiopian life, captured through phone photography.</description>
  <language>en</language>
  <lastBuildDate>${lastBuild}</lastBuildDate>
  ${items}
</channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400"
    }
  });
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br />");
}
