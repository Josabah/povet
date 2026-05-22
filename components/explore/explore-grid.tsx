"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ExploreCard } from "./explore-card";
import type { ExploreImage, ExplorePage } from "@/lib/types";

const SCROLL_KEY = "explore-scroll-y";

type Props = {
  initialImages: ExploreImage[];
  initialCursor: string | null;
  /**
   * When provided, card clicks call `onSelect(image)` instead of
   * navigating. Used by the reader's embedded wall.
   */
  onSelect?: (image: ExploreImage) => void;
  /**
   * `true` when the grid is rendered inside the reader modal. Skips the
   * sessionStorage-based window scroll restore / save behaviour that the
   * standalone /explore page uses to preserve scroll across navigations.
   */
  embedded?: boolean;
};

export function ExploreGrid({
  initialImages,
  initialCursor,
  onSelect,
  embedded = false
}: Props) {
  const [images, setImages] = useState(initialImages);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (embedded) return;
    const saved = sessionStorage.getItem(SCROLL_KEY);
    if (saved) {
      const y = Number.parseInt(saved, 10);
      if (Number.isFinite(y)) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
      sessionStorage.removeItem(SCROLL_KEY);
    }
  }, [embedded]);

  useEffect(() => {
    if (embedded) return;
    const onSave = () => {
      sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
    };
    document.addEventListener("explore:save-scroll", onSave);
    return () => document.removeEventListener("explore:save-scroll", onSave);
  }, [embedded]);

  const loadMore = useCallback(async () => {
    if (!cursor || loading) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/explore?cursor=${encodeURIComponent(cursor)}&limit=32`
      );
      if (!res.ok) return;
      const page = (await res.json()) as ExplorePage;
      setImages((prev) => [...prev, ...page.images]);
      setCursor(page.nextCursor);
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore]);

  return (
    <>
      <section className="explore-columns" aria-label="Explore photographs">
        {images.map((image, i) => (
          <ExploreCard
            key={image.id}
            image={image}
            priority={i < 6}
            onSelect={onSelect}
          />
        ))}
      </section>
      {cursor ? (
        <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      ) : null}
      <div aria-live="polite" aria-busy={loading} className="sr-only">
        {loading ? "Loading more photographs" : ""}
      </div>
    </>
  );
}
