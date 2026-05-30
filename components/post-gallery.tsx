"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { Lightbox } from "./lightbox";
import { MasonryFrame } from "./masonry-frame";
import type { Media } from "@/lib/types";

type Props = {
  media: Media[];
  caption?: string | null;
  location?: string | null;
  contributorUsername?: string | null;
  contributorDisplayName?: string | null;
};

const FEED_SIZES =
  "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, (max-width: 1536px) 25vw, 20vw";

export function PostGallery({
  media,
  caption = null,
  location = null,
  contributorUsername = null,
  contributorDisplayName = null
}: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduce = useReducedMotion();

  const onOpen = (i: number) => {
    setActiveIndex(i);
    setOpen(true);
  };

  if (media.length === 0) return null;

  return (
    <>
      <div className="archive-columns">
        {media.map((m, i) => (
          <motion.button
            key={m.src}
            type="button"
            onClick={() => onOpen(i)}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -80px 0px" }}
            transition={{
              duration: 0.6,
              delay: Math.min(i, 4) * 0.04,
              ease: [0.22, 0.61, 0.36, 1]
            }}
            className="archive-item group relative block w-full overflow-hidden rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2"
            aria-label={
              media.length === 1
                ? "View photograph"
                : `View photograph ${i + 1} of ${media.length}`
            }
          >
            <MasonryFrame
              media={m}
              sizes={FEED_SIZES}
              priority={i === 0}
            />
          </motion.button>
        ))}
      </div>

      <Lightbox
        media={media}
        open={open}
        initialIndex={activeIndex}
        onClose={() => setOpen(false)}
        caption={caption}
        location={location}
        contributorUsername={contributorUsername}
        contributorDisplayName={contributorDisplayName}
      />
    </>
  );
}
