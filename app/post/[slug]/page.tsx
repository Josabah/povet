import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { BackLink } from "@/components/back-link";
import { PostGallery } from "@/components/post-gallery";
import { MetaLocationIcon, MetaPersonIcon } from "@/components/icons/meta-icons";
import {
  formatContributor,
  formatPhotographerHandle,
  formatPostNavLabel,
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
      <header className="post-meta mb-4 font-sans text-[0.86rem] leading-snug md:mb-5">
        <div className="post-meta__identity">
          <div className="flex min-w-0 items-center gap-3">
            <BackLink className="shrink-0 text-slate-400 transition-colors duration-300 hover:text-ink" />

            <div className="flex min-w-0 items-start justify-between gap-2 flex-1">
              <div className="post-meta__row min-w-0 flex-1 basis-0">
                <MetaPersonIcon className="post-meta__icon" />
                <div className="flex min-w-0 items-baseline gap-3">
                  {post.contributorUsername ? (
                    <Link
                      href={`/photographer/${post.contributorUsername}`}
                      className="truncate text-soot transition-colors duration-300 hover:text-ink"
                    >
                      {photographer}
                    </Link>
                  ) : (
                    <span className="truncate text-soot">
                      {formatContributor(
                        post.contributorUsername,
                        post.contributorDisplayName
                      )}
                    </span>
                  )}

                  <span className="shrink-0 text-[0.78rem] text-slate-400">
                    {formatPublishedAt(post.publishedAt)}
                  </span>
                </div>
              </div>

              {post.location ? (
                <div className="post-meta__row min-w-0 max-w-[48%] shrink-0 font-display italic text-soot">
                  <MetaLocationIcon className="post-meta__icon" />
                  <Link
                    href={`/location/${slugify(post.location)}`}
                    className="min-w-0 truncate text-soot transition-colors duration-300 hover:text-ink"
                  >
                    {post.location}
                  </Link>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {hasContext ? (
          <div className="post-meta__context">
            {post.caption?.trim() ? (
              <blockquote
                className={`post-meta__quote font-display text-[1.05rem] italic leading-relaxed text-soot ${
                  hashtagLine ? "post-meta__quote-offset" : ""
                }`}
              >
                &ldquo;{post.caption}&rdquo;
              </blockquote>
            ) : null}

            {hashtagLine ? (
              <p className="text-[0.82rem] text-slate-500">{hashtagLine}</p>
            ) : null}
          </div>
        ) : null}
      </header>

      <PostGallery
        media={post.media}
        caption={post.caption}
        location={post.location}
        contributorUsername={post.contributorUsername}
        contributorDisplayName={post.contributorDisplayName}
      />

      {(previous || next) && (
        <nav
          className="mt-20 flex items-center justify-between"
          aria-label="Neighbouring posts"
        >
          {previous ? (
            <Link
              href={`/post/${previous.slug}`}
              aria-label={`Previous post: ${formatPostNavLabel(
                previous.location,
                previous.contributorUsername,
                previous.contributorDisplayName
              )}`}
              className="ui-step"
            >
              ←
            </Link>
          ) : (
            <span aria-hidden className="min-w-[2.75rem]" />
          )}
          {next ? (
            <Link
              href={`/post/${next.slug}`}
              aria-label={`Next post: ${formatPostNavLabel(
                next.location,
                next.contributorUsername,
                next.contributorDisplayName
              )}`}
              className="ui-step"
            >
              →
            </Link>
          ) : (
            <span aria-hidden className="min-w-[2.75rem]" />
          )}
        </nav>
      )}
    </article>
  );
}
