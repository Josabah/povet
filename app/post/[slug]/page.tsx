import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostGallery } from "@/components/post-gallery";
import {
  formatContributor,
  formatPhotographerHandle,
  formatPublishedAt
} from "@/lib/format";
import {
  getAllSlugs,
  getNeighbors,
  getPostBySlug,
  slugify
} from "@/lib/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return {};
  const title = post.location
    ? `${post.location} — pov.et`
    : `${formatContributor(post.contributorUsername, post.contributorDisplayName)} — pov.et`;
  const description = post.caption ?? "A photograph from pov.et.";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: post.media.map((m) => ({ url: m.src }))
    }
  };
}

export default async function PostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const { previous, next } = await getNeighbors(slug);
  const photographer = formatPhotographerHandle(
    post.contributorUsername,
    post.contributorDisplayName
  );

  return (
    <article className="mx-auto max-w-feed px-6 pb-24 pt-6 md:px-10 md:pt-8">
      <header className="mb-6 md:mb-8">
        <div className="flex items-baseline justify-between gap-4 text-[0.84rem] text-slate-500">
          {post.contributorUsername ? (
            <Link
              href={`/photographer/${post.contributorUsername}`}
              className="truncate text-ink transition-colors duration-300 hover:text-slate-600"
            >
              {photographer}
            </Link>
          ) : (
            <span className="truncate text-slate-500">{photographer}</span>
          )}
          {post.location ? (
            <Link
              href={`/location/${slugify(post.location)}`}
              className="shrink-0 text-slate-400 transition-colors duration-300 hover:text-ink"
            >
              {post.location}
            </Link>
          ) : null}
        </div>

        {post.caption && (
          <p className="mt-5 max-w-prose font-display text-display-md text-balance text-pretty leading-[1.35] text-ink">
            {post.caption}
          </p>
        )}

        <p className="mt-3 text-[0.78rem] text-slate-400">
          {formatPublishedAt(post.publishedAt)}
        </p>
      </header>

      <PostGallery media={post.media} />

      {(previous || next) && (
        <nav
          className="mt-20 flex items-center justify-between text-[0.88rem] text-slate-400"
          aria-label="Neighbouring posts"
        >
          {previous ? (
            <Link
              href={`/post/${previous.slug}`}
              className="transition-colors duration-300 hover:text-ink"
            >
              ←
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={`/post/${next.slug}`}
              className="transition-colors duration-300 hover:text-ink"
            >
              →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </article>
  );
}
