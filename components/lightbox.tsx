"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

import { formatPhotoAlt } from "@/lib/format";
import type { Media } from "@/lib/types";

type Props = {
  media: Media[];
  open: boolean;
  initialIndex: number;
  onClose: () => void;
  caption?: string | null;
  location?: string | null;
  contributorUsername?: string | null;
  contributorDisplayName?: string | null;
};

const fade = { duration: 0.5, ease: [0.22, 0.61, 0.36, 1] as const };

export function Lightbox({
  media,
  open,
  initialIndex,
  onClose,
  caption = null,
  location = null,
  contributorUsername = null,
  contributorDisplayName = null
}: Props) {
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
  const transition = reduce ? { duration: 0 } : fade;

  return (
    <AnimatePresence>
      {open && current && (
        <motion.div
          className="fixed inset-0 z-[100] flex flex-col bg-soot text-paper/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={transition}
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
            className="ui-close ui-close--on-dark absolute right-4 top-4 z-10 md:right-7 md:top-6"
          >
            ×
          </button>

          <div
            className="relative flex flex-1 items-center justify-center px-3 py-10 md:px-12 md:py-14"
            onClick={(e) => {
              if (e.target === e.currentTarget) onClose();
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={current.src}
                className="relative h-full w-full max-h-[88vh]"
                initial={{ opacity: 0, scale: reduce ? 1 : 0.985 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: reduce ? 1 : 0.985 }}
                transition={transition}
              >
                <Image
                  src={current.src}
                  alt={formatPhotoAlt({
                    caption,
                    location,
                    contributorUsername,
                    contributorDisplayName,
                    index,
                    total: media.length
                  })}
                  fill
                  sizes="100vw"
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
                  className="ui-step ui-step--on-dark absolute left-2 top-1/2 -translate-y-1/2 md:left-6"
                  aria-label="Previous photograph"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="ui-step ui-step--on-dark absolute right-2 top-1/2 -translate-y-1/2 md:right-6"
                  aria-label="Next photograph"
                >
                  →
                </button>
              </>
            )}
          </div>

          {media.length > 1 && (
            <p className="pb-4 text-center font-sans text-[0.68rem] text-paper/18 md:pb-6">
              {index + 1} / {media.length}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
