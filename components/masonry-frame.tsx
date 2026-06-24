import Image from "next/image";

import { clampAspectRatio, clampExploreAspectRatio } from "@/lib/masonry";
import type { Media } from "@/lib/types";

type Props = {
  media: Media;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  /** Explore grid uses tighter ratio clamps for uniform rhythm. */
  variant?: "archive" | "explore";
  /** Skip the blur placeholder (useful when the image is already cached). */
  skipBlur?: boolean;
};

/**
 * Shared masonry image frame — clamped ratio, full texture, soft density.
 */
export function MasonryFrame({
  media,
  sizes,
  priority = false,
  className = "",
  imageClassName = "object-cover transition-transform duration-[1200ms] ease-quiet group-hover:scale-[1.01] motion-reduce:transform-none",
  variant = "archive",
  skipBlur = false
}: Props) {
  const clamp =
    variant === "explore" ? clampExploreAspectRatio : clampAspectRatio;

  const blurProps =
    skipBlur || !media.blurDataURL
      ? {}
      : { placeholder: "blur" as const, blurDataURL: media.blurDataURL };

  return (
    <div
      className={`relative overflow-hidden bg-mist/30 ${className}`}
      style={{
        aspectRatio: clamp(media.aspectRatio),
        backgroundColor: media.dominantColor
      }}
    >
      <Image
        src={media.src}
        alt=""
        fill
        sizes={sizes}
        {...blurProps}
        priority={priority}
        className={imageClassName}
      />
    </div>
  );
}
