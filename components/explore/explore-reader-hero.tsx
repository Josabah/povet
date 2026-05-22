"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { ExploreReaderMeta } from "./explore-reader-meta";
import { ExploreReaderMetaSide } from "./explore-reader-meta-side";
import { clampExploreAspectRatio } from "@/lib/masonry";
import type { ExploreImage } from "@/lib/types";

type Props = {
  image: ExploreImage;
  hasPrevious: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

const SWAP_EASE = [0.22, 0.61, 0.36, 1] as const;

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
  onNext
}: Props) {
  const reduce = useReducedMotion();
  const aspectRatio = clampExploreAspectRatio(image.media.aspectRatio);
  const swap = reduce ? { duration: 0 } : { duration: 0.35, ease: SWAP_EASE };

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

        <div
          className="explore-hero__image relative"
          style={{
            aspectRatio: `${aspectRatio}`,
            backgroundColor: image.media.dominantColor
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={image.id}
              className="absolute inset-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={swap}
            >
              <Image
                src={image.media.src}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                placeholder="blur"
                blurDataURL={image.media.blurDataURL}
                className="object-contain"
                priority
              />
            </motion.div>
          </AnimatePresence>
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
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={image.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={swap}
          >
            <ExploreReaderMetaSide image={image} />
          </motion.div>
        </AnimatePresence>
      </aside>

      <div className="explore-hero__meta md:hidden">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={image.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={swap}
          >
            <ExploreReaderMeta image={image} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
