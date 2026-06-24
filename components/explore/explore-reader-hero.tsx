"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useRef } from "react";

import { ExploreReaderMeta } from "./explore-reader-meta";
import { ExploreReaderMetaSide } from "./explore-reader-meta-side";
import { clampExploreAspectRatio } from "@/lib/masonry";
import { formatPhotoAlt } from "@/lib/format";
import type { ExploreImage } from "@/lib/types";

type Props = {
  image: ExploreImage;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
  /** 1 = next (slide left), -1 = previous (slide right). */
  direction?: 1 | -1;
};

const SWAP_EASE = [0.22, 0.61, 0.36, 1] as const;
const SLIDE_OFFSET = "40%";

/**
 * One photograph at the top of the reader. Responsive shape:
 *   - `md+`: image left, sidebar meta right (photographer / date /
 *     location / pull-quote / archive links).
 *   - `<md`: image on top, one-line meta strip directly below.
 * Click ‹ / › / keyboard / swipe to swap the image in place — the
 * frame stays put, the wall below refreshes to follow.
 */
export function ExploreReaderHero({
  image,
  hasPrevious,
  hasNext,
  onPrev,
  onNext,
  direction = 1
}: Props) {
  const reduce = useReducedMotion();
  const isFirstImage = useRef(true);
  const isFirst = isFirstImage.current;
  if (isFirstImage.current) isFirstImage.current = false;

  const aspectRatio = clampExploreAspectRatio(image.media.aspectRatio);
  const swap = reduce
    ? { duration: 0 }
    : { duration: 0.18, ease: SWAP_EASE };
  const alt = formatPhotoAlt({
    caption: image.caption,
    location: image.location,
    contributorUsername: image.contributorUsername,
    contributorDisplayName: image.contributorDisplayName,
    index: image.mediaIndex,
    total: image.stackSize
  });

  return (
    <div
      className="explore-hero"
      style={{ ["--ar" as string]: `${aspectRatio}` }}
    >
      <div className="explore-hero__stage">
        {hasPrevious ? (
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous photograph"
            className="explore-hero__nav explore-hero__nav--prev"
          >
            ‹
          </button>
        ) : null}

        <div className="explore-hero__media">
          <div
            className="explore-hero__image relative"
            style={{
              aspectRatio: `${aspectRatio}`,
              backgroundColor: image.media.dominantColor
            }}
          >
            <AnimatePresence
              mode="popLayout"
              initial={false}
              custom={direction}
            >
              <motion.div
                key={image.id}
                className="absolute inset-0"
                custom={direction}
                initial={
                  isFirst
                    ? false
                    : {
                        x: `${direction > 0 ? "" : "-"}${SLIDE_OFFSET}`,
                        opacity: 0
                      }
                }
                animate={{ x: 0, opacity: 1 }}
                exit={(d: number) => ({
                  x: `${d > 0 ? "-" : ""}${SLIDE_OFFSET}`,
                  opacity: 0
                })}
                transition={swap}
              >
                <Image
                  src={image.media.src}
                  alt={alt}
                  fill
                  sizes="(max-width: 768px) 100vw, 60vw"
                  {...(isFirst
                    ? {
                        placeholder: "blur" as const,
                        blurDataURL: image.media.blurDataURL
                      }
                    : {})}
                  className="object-contain"
                  priority
                />
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="explore-hero__meta md:hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div
                key={image.id}
                initial={isFirst ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={swap}
              >
                <ExploreReaderMeta image={image} />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {hasNext ? (
          <button
            type="button"
            onClick={onNext}
            aria-label="Next photograph"
            className="explore-hero__nav explore-hero__nav--next"
          >
            ›
          </button>
        ) : null}
      </div>

      <aside className="explore-hero__sidebar hidden md:block">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div
            key={image.id}
            initial={isFirst ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={swap}
          >
            <ExploreReaderMetaSide image={image} />
          </motion.div>
        </AnimatePresence>
      </aside>
    </div>
  );
}
