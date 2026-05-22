import Image from "next/image";
import Link from "next/link";

import { FadeIn } from "./motion/fade-in";
import type { Post } from "@/lib/types";

type Props = {
  post: Post;
  priority?: boolean;
  index?: number;
};

export function PostCard({ post, priority = false, index = 0 }: Props) {
  const cover = post.media[0];
  if (!cover) return null;

  const extraCount = post.media.length - 1;
  // Subtle staggered entry; capped so below-the-fold cards resolve fast.
  const delay = Math.min(index, 5) * 60;

  // Pull a quiet caption: the location when known, otherwise the
  // contributor. If neither, we render no label at all. The photograph
  // already says enough.
  const label = post.location
    ? post.location
    : post.contributorUsername
      ? `@${post.contributorUsername}`
      : null;

  return (
    <FadeIn delay={delay}>
      <article className="feed-item">
        <Link
          href={`/post/${post.slug}`}
          className="group block"
          aria-label={
            post.caption?.slice(0, 80) ??
            (post.location ? `Photographs from ${post.location}` : "View post")
          }
        >
          <div
            className="relative overflow-hidden bg-mist/40"
            style={{
              aspectRatio: cover.aspectRatio,
              backgroundColor: cover.dominantColor
            }}
          >
            <Image
              src={cover.src}
              alt={post.caption ?? post.location ?? "Photograph"}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              placeholder="blur"
              blurDataURL={cover.blurDataURL}
              priority={priority}
              className="object-cover transition-transform duration-[1200ms] ease-quiet group-hover:scale-[1.01] motion-reduce:transform-none"
            />
          </div>

          {(label || extraCount > 0) && (
            <div className="mt-3 flex items-baseline justify-between gap-4 text-[0.85rem] text-slate-500">
              <span className="truncate">{label ?? ""}</span>
              {extraCount > 0 && (
                <span className="shrink-0 text-slate-400">
                  +{extraCount}
                </span>
              )}
            </div>
          )}
        </Link>
      </article>
    </FadeIn>
  );
}
