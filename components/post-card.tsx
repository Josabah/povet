import Link from "next/link";

import { MasonryFrame } from "./masonry-frame";
import { PostMetaRow } from "./post-meta-row";
import { formatPhotographerHandle } from "@/lib/format";
import type { Post } from "@/lib/types";

type Props = {
  post: Post;
  priority?: boolean;
};

export function PostCard({ post, priority = false }: Props) {
  const cover = post.media[0];
  if (!cover) return null;

  const extraCount = post.media.length - 1;

  const photographer = formatPhotographerHandle(
    post.contributorUsername,
    post.contributorDisplayName
  );

  return (
    <article className="archive-item">
        <Link
          href={`/post/${post.slug}`}
          className="group block"
          aria-label={
            post.caption?.slice(0, 80) ??
            (post.location ? `Photographs from ${post.location}` : "View post")
          }
        >
          <div className="relative">
            <MasonryFrame
              media={cover}
              priority={priority}
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
            />
            {extraCount > 0 && (
              <span
                className="pointer-events-none absolute right-2 top-2 rounded-sm bg-ink/30 px-1.5 py-0.5 font-sans text-[0.7rem] leading-none text-paper/90 backdrop-blur-[3px]"
                aria-hidden
              >
                +{extraCount}
              </span>
            )}
          </div>

          <PostMetaRow
            className="mt-2 text-[0.82rem]"
            left={<span className="block truncate">{photographer}</span>}
            right={
              post.location ? (
                <span className="block truncate text-slate-400">
                  {post.location}
                </span>
              ) : undefined
            }
          />
        </Link>
    </article>
  );
}
