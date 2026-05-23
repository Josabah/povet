"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { ExploreGrid } from "./explore-grid";
import { ExploreReaderHero } from "./explore-reader-hero";
import type { ExploreImage, ExplorePage } from "@/lib/types";

type Props = {
  initialImage: ExploreImage;
  initialPrevious: ExploreImage | null;
  initialNext: ExploreImage | null;
  initialWall: ExploreImage[];
  initialWallCursor: string | null;
  /** `modal` = opened from the wall (soft nav). `page` = direct visit. */
  mode: "modal" | "page";
};

type NeighborsResponse = {
  previous: ExploreImage | null;
  next: ExploreImage | null;
};

type WallState = {
  images: ExploreImage[];
  cursor: string | null;
};

/**
 * The reader on paper. Architecture:
 *
 *   ┌────────────────────────────────────────┐
 *   │  HERO — image + responsive meta        │  ← swap-only
 *   │    md+ : image left, side column right │
 *   │    <md : image, one-liner below        │
 *   ├────────────────────────────────────────┤
 *   │  WALL — masonry continuing from hero   │  ← scroll; click swaps
 *   └────────────────────────────────────────┘
 *
 * Each swap (prev/next/swipe/click-in-wall) does three things in
 * parallel: updates the hero (crossfade), snaps the modal back to
 * scrollTop=0 with no animation, and refreshes the wall to start
 * from the new image's successor. Neighbours and wall slices are
 * both memoized by image id so re-traversal is instant the second
 * time around.
 */
export function ExploreReader({
  initialImage,
  initialPrevious,
  initialNext,
  initialWall,
  initialWallCursor,
  mode
}: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchX = useRef<number | null>(null);
  const touchY = useRef<number | null>(null);

  const [current, setCurrent] = useState(initialImage);
  const [previous, setPrevious] = useState(initialPrevious);
  const [next, setNext] = useState(initialNext);
  const [wall, setWall] = useState<WallState>({
    images: initialWall,
    cursor: initialWallCursor
  });

  // Cache neighbours we've already resolved so prev/next never need to
  // wait on the network the second time the user crosses the same edge.
  const neighbourCache = useRef(
    new Map<string, NeighborsResponse>([
      [
        initialImage.id,
        { previous: initialPrevious, next: initialNext }
      ]
    ])
  );
  // Same pattern for the wall slice — re-opening an image instantly
  // restores the wall we had before instead of refetching.
  const wallCache = useRef(
    new Map<string, WallState>([
      [initialImage.id, { images: initialWall, cursor: initialWallCursor }]
    ])
  );

  // ── Close
  const close = useCallback(() => {
    if (mode === "modal") router.back();
    else router.push("/explore");
  }, [mode, router]);

  // ── Swap the hero to `target`. Updates URL, snaps to top (no
  // ── animation), refreshes prev/next and the wall slice in
  // ── parallel (both cached after the first round-trip).
  const swapTo = useCallback(
    async (target: ExploreImage) => {
      if (target.id === current.id) return;
      setCurrent(target);
      window.history.replaceState({}, "", `/explore/image/${target.id}`);

      // Instant scroll-to-top — no fast-airplane smooth animation.
      const scroller = scrollRef.current;
      if (scroller && scroller.scrollTop > 0) {
        scroller.scrollTop = 0;
      }

      // ── Neighbours (cached, else fetch)
      const cachedNeighbours = neighbourCache.current.get(target.id);
      if (cachedNeighbours) {
        setPrevious(cachedNeighbours.previous);
        setNext(cachedNeighbours.next);
      } else {
        setPrevious(null);
        setNext(null);
        fetch(`/api/explore/neighbors?id=${encodeURIComponent(target.id)}`)
          .then((res) => (res.ok ? res.json() : null))
          .then((data: NeighborsResponse | null) => {
            if (!data) return;
            neighbourCache.current.set(target.id, data);
            setPrevious(data.previous);
            setNext(data.next);
          })
          .catch(() => {
            // Leave neighbours null — keyboard/swipe become no-ops
            // until the user picks something from the wall.
          });
      }

      // ── Wall slice — continue from `target` so the grid below the
      // ── hero is specific to whatever is on screen.
      const cachedWall = wallCache.current.get(target.id);
      if (cachedWall) {
        setWall(cachedWall);
      } else {
        fetch(
          `/api/explore?cursor=${encodeURIComponent(target.id)}&limit=32`
        )
          .then((res) => (res.ok ? res.json() : null))
          .then((page: ExplorePage | null) => {
            if (!page) return;
            const nextWall: WallState = {
              images: page.images,
              cursor: page.nextCursor
            };
            wallCache.current.set(target.id, nextWall);
            setWall(nextWall);
          })
          .catch(() => {
            // Leave the previous wall visible — the user can still
            // browse from where they were if the refetch fails.
          });
      }
    },
    [current.id]
  );

  const goPrev = useCallback(() => {
    if (previous) swapTo(previous);
  }, [previous, swapTo]);

  const goNext = useCallback(() => {
    if (next) swapTo(next);
  }, [next, swapTo]);

  // ── Body scroll lock — modal scrolls internally
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  // ── Keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        goNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, goPrev, goNext]);

  // ── Horizontal swipe = swap hero. Vertical scroll passes through to
  // ── the native scroll container so the user can still drift into
  // ── the wall below.
  const onTouchStart = (e: React.TouchEvent) => {
    touchX.current = e.touches[0]?.clientX ?? null;
    touchY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchX.current === null || touchY.current === null) return;
    const dx = (e.changedTouches[0]?.clientX ?? 0) - touchX.current;
    const dy = (e.changedTouches[0]?.clientY ?? 0) - touchY.current;
    touchX.current = null;
    touchY.current = null;
    if (Math.abs(dy) > Math.abs(dx)) return;
    const threshold = 60;
    if (dx < -threshold) goNext();
    else if (dx > threshold) goPrev();
  };

  const wallImages = wall.images.filter((image) => image.id !== current.id);

  return (
    <div
      ref={scrollRef}
      className="explore-reader h-full w-full overflow-y-auto overflow-x-hidden overscroll-contain"
    >
      <button
        type="button"
        onClick={close}
        aria-label="Close"
        className="fixed right-4 top-4 z-30 px-2 py-1 font-sans text-[1.25rem] leading-none text-slate-500 transition-colors duration-300 hover:text-ink md:right-7 md:top-6"
      >
        ×
      </button>

      <section
        className="explore-reader__hero"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        aria-label="Photograph"
      >
        <ExploreReaderHero
          image={current}
          hasPrevious={previous !== null}
          hasNext={next !== null}
          onPrev={goPrev}
          onNext={goNext}
        />
      </section>

      <section className="explore-reader__wall" aria-label="Explore">
        <ExploreGrid
          key={current.id}
          initialImages={wallImages}
          initialCursor={wall.cursor}
          onSelect={swapTo}
          embedded
        />
      </section>
    </div>
  );
}
