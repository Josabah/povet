import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/post-card";
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
      <header className="pb-10 pt-10 md:pb-14 md:pt-14">
        <h1 className="font-display text-display-xl font-light text-ink">
          @{username}
        </h1>
      </header>

      <section className="feed-columns" aria-label={`Photographs by @${username}`}>
        {posts.map((post, i) => (
          <PostCard key={post.slug} post={post} index={i} />
        ))}
      </section>
    </div>
  );
}
