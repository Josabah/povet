import Image from "next/image";

import { clampAspectRatio } from "@/lib/masonry";
import type { Media } from "@/lib/types";

type Props = {
  media: Media;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
};

/**
 * Shared masonry image frame — clamped ratio, full texture, soft density.
 */
export function MasonryFrame({
  media,
  sizes,
  priority = false,
  className = "",
  imageClassName = "object-cover transition-transform duration-[1200ms] ease-quiet group-hover:scale-[1.01] motion-reduce:transform-none"
}: Props) {
  return (
    <div
      className={`relative overflow-hidden bg-mist/30 ${className}`}
      style={{
        aspectRatio: clampAspectRatio(media.aspectRatio),
        backgroundColor: media.dominantColor
      }}
    >
      <Image
        src={media.src}
        alt=""
        fill
        sizes={sizes}
        placeholder="blur"
        blurDataURL={media.blurDataURL}
        priority={priority}
        className={imageClassName}
      />
    </div>
  );
}
