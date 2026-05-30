import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/post-card";
import { ExternalLinkIcon } from "@/components/icons/meta-icons";
import { getPostsByContributor } from "@/lib/posts";

type PageProps = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username}`,
    description: `Photographs by @${username}.`
  };
}

export default async function PhotographerPage({ params }: PageProps) {
  const { username } = await params;
  const posts = await getPostsByContributor(username);
  if (posts.length === 0) notFound();

  return (
    <div className="mx-auto max-w-feed px-6 pb-24 md:px-10">
      <header className="pb-6 pt-8 md:pb-8 md:pt-10">
        <h1 className="flex flex-wrap items-center gap-x-4 gap-y-2 font-display text-display-lg font-light text-ink">
          <span>@{username}</span>
          <a
            href={`https://t.me/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open @${username} on Telegram`}
            className="inline-flex items-center gap-1.5 py-1 font-sans text-[0.85rem] text-slate-500 transition-colors duration-300 hover:text-ink"
          >
            <span>Telegram</span>
            <ExternalLinkIcon className="h-3.5 w-3.5 shrink-0" />
          </a>
        </h1>
      </header>

      <section
        className="archive-columns"
        aria-label={`Photographs by @${username}`}
      >
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </section>
    </div>
  );
}
