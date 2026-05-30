"use client";

import Link from "next/link";

import { MasonryFrame } from "@/components/masonry-frame";
import type { ExploreImage } from "@/lib/types";

type Props = {
  image: ExploreImage;
  priority?: boolean;
  /**
   * When provided, the card intercepts the click and calls `onSelect`
   * instead of navigating. Used by the reader's embedded wall to swap
   * the hero image without leaving the modal route.
   */
  onSelect?: (image: ExploreImage) => void;
};

/**
 * Explore grid tile — image only. No metadata, no stack badge.
 */
export function ExploreCard({ image, priority = false, onSelect }: Props) {
  const handleClick = onSelect
    ? (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Let modifier-clicks (cmd/ctrl/middle) keep the default
        // navigate-to-new-tab behaviour; only intercept plain clicks.
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        onSelect(image);
      }
    : undefined;

  return (
    <article className="explore-item">
      <Link
        href={`/explore/image/${image.id}`}
        scroll={false}
        onClick={handleClick}
        className="explore-card-link group block rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
        aria-label="View photograph"
      >
        <MasonryFrame
          media={image.media}
          variant="explore"
          priority={priority}
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw"
          imageClassName="object-cover motion-reduce:opacity-100 md:transition-opacity md:duration-700 md:ease-quiet md:group-hover:opacity-[0.92]"
        />
      </Link>
    </article>
  );
}
