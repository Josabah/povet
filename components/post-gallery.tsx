"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

import { Lightbox } from "./lightbox";
import type { Media } from "@/lib/types";

type Props = {
  media: Media[];
};

export function PostGallery({ media }: Props) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const reduce = useReducedMotion();

  const onOpen = (i: number) => {
    setActiveIndex(i);
    setOpen(true);
  };

  // A single photograph deserves the full width — no masonry needed.
  if (media.length === 1) {
    const only = media[0];
    return (
      <>
        <motion.button
          type="button"
          onClick={() => onOpen(0)}
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={reduce ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 0.61, 0.36, 1] }}
          className="group relative block w-full overflow-hidden outline-none"
          style={{
            aspectRatio: only.aspectRatio,
            backgroundColor: only.dominantColor
          }}
          aria-label="View photograph"
        >
          <Image
            src={only.src}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 1024px"
            placeholder="blur"
            blurDataURL={only.blurDataURL}
            priority
            className="object-cover"
          />
        </motion.button>

        <Lightbox
          media={media}
          open={open}
          initialIndex={activeIndex}
          onClose={() => setOpen(false)}
        />
      </>
    );
  }

  return (
    <>
      <div className="gallery-columns">
        {media.map((m, i) => (
          <motion.button
            key={m.src}
            type="button"
            onClick={() => onOpen(i)}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            whileInView={reduce ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "0px 0px -120px 0px" }}
            transition={{
              duration: 0.65,
              delay: Math.min(i, 4) * 0.05,
              ease: [0.22, 0.61, 0.36, 1]
            }}
            className="gallery-item group relative block w-full overflow-hidden outline-none"
            style={{
              aspectRatio: m.aspectRatio,
              backgroundColor: m.dominantColor
            }}
            aria-label={`View photograph ${i + 1} of ${media.length}`}
          >
            <Image
              src={m.src}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 600px"
              placeholder="blur"
              blurDataURL={m.blurDataURL}
              priority={i === 0}
              className="object-cover transition-transform duration-[1400ms] ease-quiet group-hover:scale-[1.01] motion-reduce:transform-none"
            />
          </motion.button>
        ))}
      </div>

      <Lightbox
        media={media}
        open={open}
        initialIndex={activeIndex}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
