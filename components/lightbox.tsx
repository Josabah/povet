"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import type { Media } from "@/lib/types";

type Props = {
  media: Media[];
  open: boolean;
  initialIndex: number;
  onClose: () => void;
};

export function Lightbox({ media, open, initialIndex, onClose }: Props) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (open) setIndex(initialIndex);
  }, [open, initialIndex]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + media.length) % media.length);
  }, [media.length]);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % media.length);
  }, [media.length]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, goPrev, goNext, onClose]);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchStartX.current;
    touchStartX.current = null;
    const threshold = 50;
    if (dx > threshold) goPrev();
    else if (dx < -threshold) goNext();
  };

  const current = media[index];

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col bg-black text-paper/80"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reduce ? 0 : 0.45, ease: [0.22, 0.61, 0.36, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Photograph viewer"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-5 top-5 z-10 text-[1.4rem] leading-none text-paper/40 transition-colors duration-300 hover:text-paper md:right-8 md:top-7"
          >
            ×
          </button>

          <div
            className="relative flex flex-1 items-center justify-center px-4 py-8 md:px-16 md:py-16"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.src}
                className="relative h-full w-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduce ? 0 : 0.4, ease: "easeOut" }}
              >
                <Image
                  src={current.src}
                  alt=""
                  fill
                  sizes="100vw"
                  placeholder="blur"
                  blurDataURL={current.blurDataURL}
                  className="object-contain"
                  priority
                />
              </motion.div>
            </AnimatePresence>

            {media.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-1/2 -translate-y-1/2 px-4 py-3 text-[1.4rem] leading-none text-paper/30 transition-colors duration-300 hover:text-paper md:left-8"
                  aria-label="Previous photograph"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="absolute right-3 top-1/2 -translate-y-1/2 px-4 py-3 text-[1.4rem] leading-none text-paper/30 transition-colors duration-300 hover:text-paper md:right-8"
                  aria-label="Next photograph"
                >
                  →
                </button>
              </>
            )}
          </div>

          {media.length > 1 && (
            <div className="pb-5 text-center text-[0.78rem] tracking-wider text-paper/30 md:pb-7">
              {index + 1} / {media.length}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
