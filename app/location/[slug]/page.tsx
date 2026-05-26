import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PostCard } from "@/components/post-card";
import { getPostIndex, getPostsByLocation, slugify } from "@/lib/posts";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const posts = await getPostsByLocation(slug);
  const label = posts[0]?.location ?? slug;
  return {
    title: `${label}`,
    description: `Photographs from ${label}.`
  };
}

export async function generateStaticParams() {
  const seen = new Set<string>();
  const all = await getPostIndex();
  for (const post of all) {
    if (post.location) seen.add(slugify(post.location));
  }
  return [...seen].map((slug) => ({ slug }));
}

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;
  const posts = await getPostsByLocation(slug);
  if (posts.length === 0) notFound();

  const label = posts[0].location ?? slug;

  return (
    <div className="mx-auto max-w-feed px-6 pb-24 md:px-10">
      <header className="pb-6 pt-8 md:pb-8 md:pt-10">
        <h1 className="font-display text-display-lg font-light text-balance text-ink">
          {label}
        </h1>
      </header>

      <section
        className="archive-columns"
        aria-label={`Photographs from ${label}`}
      >
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} />
        ))}
      </section>
    </div>
  );
}
