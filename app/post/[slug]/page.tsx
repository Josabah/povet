import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PostGallery } from "@/components/post-gallery";
import { MetaLocationIcon, MetaPersonIcon } from "@/components/icons/meta-icons";
import {
  formatContributor,
  formatPhotographerHandle,
  formatPublishedAt
} from "@/lib/format";
import { formatHashtagLabels } from "@/lib/mood-labels";
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
    ? post.location
    : formatContributor(post.contributorUsername, post.contributorDisplayName);
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
  const hashtagLine = formatHashtagLabels(post.moods);
  const hasContext = Boolean(hashtagLine || post.caption?.trim());

  return (
    <article className="mx-auto max-w-feed px-6 pb-24 pt-5 md:px-10 md:pt-6">
      <header className="post-meta mb-3 font-sans text-[0.86rem] leading-snug md:mb-3.5">
        <div className="post-meta__identity">
          <div className="flex min-w-0 items-start justify-between gap-2">
            <div className="post-meta__row min-w-0 flex-1 basis-0">
              <MetaPersonIcon className="post-meta__icon" />
              <div className="min-w-0">
                {post.contributorUsername ? (
                  <Link
                    href={`/photographer/${post.contributorUsername}`}
                    className="block truncate text-soot transition-colors duration-300 hover:text-slate-700"
                  >
                    {photographer}
                  </Link>
                ) : (
                  <span className="block truncate text-soot">
                    {formatContributor(
                      post.contributorUsername,
                      post.contributorDisplayName
                    )}
                  </span>
                )}

                <p className="post-meta__date text-[0.78rem] text-slate-500">
                  {formatPublishedAt(post.publishedAt)}
                </p>
              </div>
            </div>

            {post.location ? (
              <div className="post-meta__row min-w-0 max-w-[48%] shrink-0 font-display italic text-soot">
                <MetaLocationIcon className="post-meta__icon" />
                <Link
                  href={`/location/${slugify(post.location)}`}
                  className="min-w-0 truncate text-soot transition-colors duration-300 hover:text-slate-700"
                >
                  {post.location}
                </Link>
              </div>
            ) : null}
          </div>
        </div>

        {hasContext ? (
          <div className="post-meta__context">
            {hashtagLine ? (
              <p className="text-[0.82rem] text-slate-500">{hashtagLine}</p>
            ) : null}

            {post.caption?.trim() ? (
              <blockquote
                className={`post-meta__quote font-display italic leading-relaxed text-soot ${
                  hashtagLine ? "post-meta__quote-offset" : ""
                }`}
              >
                &ldquo;{post.caption}&rdquo;
              </blockquote>
            ) : null}
          </div>
        ) : null}
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
