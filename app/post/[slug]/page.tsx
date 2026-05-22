import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostGallery } from "@/components/post-gallery";
import { formatContributor, formatPublishedAt } from "@/lib/format";
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
  const description = post.caption ?? "A photograph from the pov.et archive.";
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

  return (
    <article className="mx-auto max-w-[68rem] px-6 pb-24 pt-8 md:px-10 md:pt-12">
      <header className="mb-10 md:mb-14">
        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[0.92rem] text-slate-500">
          {post.location && (
            <Link
              href={`/location/${slugify(post.location)}`}
              className="text-ink transition-colors duration-300 hover:text-slate-500"
            >
              {post.location}
            </Link>
          )}
          {post.contributorUsername && (
            <Link
              href={`/photographer/${post.contributorUsername}`}
              className="transition-colors duration-300 hover:text-ink"
            >
              @{post.contributorUsername}
            </Link>
          )}
          <span className="text-slate-400">
            {formatPublishedAt(post.publishedAt)}
          </span>
        </div>

        {post.caption && (
          <p className="mt-6 max-w-prose font-display text-display-md text-balance text-pretty leading-[1.35] text-ink">
            {post.caption}
          </p>
        )}
      </header>

      <PostGallery media={post.media} />

      {(previous || next) && (
        <nav
          className="mt-24 flex items-center justify-between text-[0.9rem] text-slate-500"
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
