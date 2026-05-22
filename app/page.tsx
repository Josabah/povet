import { PostCard } from "@/components/post-card";
import { getAllPosts } from "@/lib/posts";

export const revalidate = 300;

export default async function HomePage() {
  const posts = await getAllPosts();

  return (
    <div className="mx-auto max-w-feed px-6 pt-8 md:px-10 md:pt-10">
      <section className="archive-columns" aria-label="Photographs">
        {posts.map((post, i) => (
          <PostCard
            key={post.slug}
            post={post}
            priority={i < 3}
            index={i}
          />
        ))}
      </section>
    </div>
  );
}
