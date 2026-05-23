"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ExploreCard } from "./explore-card";
import {
  appendExploreColumns,
  createExploreColumns,
  dedupeExploreImages,
  flattenExploreColumns,
  getExploreColumnCount
} from "@/lib/explore-list";
import type { ExploreImage, ExplorePage } from "@/lib/types";

const SCROLL_KEY = "explore-scroll-y";
/** Client fetches — keep in sync with explore page SSR hint. */
export const EXPLORE_PAGE_SIZE = 32;
/** Matches SSR first paint — updated after hydration on resize. */
const INITIAL_COLUMN_COUNT = 2;

function prefetchRootMargin(root: HTMLElement | null): string {
  const height =
    root instanceof HTMLElement ? root.clientHeight : window.innerHeight;
  return `${Math.round(height)}px 0px`;
}

type Props = {
  initialImages: ExploreImage[];
  initialCursor: string | null;
  pageSize?: number;
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

function getScrollRoot(el: HTMLElement): HTMLElement | Window {
  let node: HTMLElement | null = el.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return window;
}

export function ExploreGrid({
  initialImages,
  initialCursor,
  pageSize = EXPLORE_PAGE_SIZE,
  onSelect,
  embedded = false
}: Props) {
  const initialDeduped = dedupeExploreImages(initialImages);
  const [columnCount, setColumnCount] = useState(INITIAL_COLUMN_COUNT);
  const [columns, setColumns] = useState(() =>
    createExploreColumns(initialDeduped, INITIAL_COLUMN_COUNT)
  );
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const gridRef = useRef<HTMLElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const cursorRef = useRef(initialCursor);
  const loadedIdsRef = useRef(new Set(initialDeduped.map((img) => img.id)));
  /** Cursors whose "after" page was already merged — avoids duplicate fetches. */
  const fetchedCursorsRef = useRef(new Set<string | null>());

  cursorRef.current = cursor;

  useEffect(() => {
    const syncColumnCount = () => {
      const next = getExploreColumnCount(window.innerWidth);
      setColumnCount((prev) => {
        if (prev === next) return prev;
        setColumns((current) =>
          createExploreColumns(flattenExploreColumns(current), next)
        );
        return next;
      });
    };

    syncColumnCount();
    window.addEventListener("resize", syncColumnCount);
    return () => window.removeEventListener("resize", syncColumnCount);
  }, []);

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

  const loadMore = useCallback(async (): Promise<boolean> => {
    const nextCursor = cursorRef.current;
    if (!nextCursor || loadingRef.current) return false;
    if (fetchedCursorsRef.current.has(nextCursor)) return false;

    loadingRef.current = true;
    try {
      const res = await fetch(
        `/api/explore?cursor=${encodeURIComponent(nextCursor)}&limit=${pageSize}`
      );
      if (!res.ok) return false;
      const page = (await res.json()) as ExplorePage;
      fetchedCursorsRef.current.add(nextCursor);
      if (page.images.length === 0) {
        setCursor(page.nextCursor);
        return false;
      }
      const newImages = page.images.filter((image) => {
        if (loadedIdsRef.current.has(image.id)) return false;
        loadedIdsRef.current.add(image.id);
        return true;
      });

      if (newImages.length > 0) {
        setColumns((prev) => appendExploreColumns(prev, newImages));
      }
      setCursor(page.nextCursor);
      return newImages.length > 0;
    } finally {
      loadingRef.current = false;
    }
  }, [pageSize]);

  // Load more only when the user scrolls near the bottom. New tiles append
  // to the shortest lane — tiles already on screen never move.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !cursor) return;
    const scrollRoot =
      embedded && gridRef.current
        ? getScrollRoot(gridRef.current)
        : null;
    const rootEl = scrollRoot instanceof HTMLElement ? scrollRoot : null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      {
        root: rootEl,
        rootMargin: prefetchRootMargin(rootEl)
      }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [cursor, loadMore, embedded]);

  let priorityBudget = 8;

  return (
    <>
      <section
        ref={gridRef}
        className="explore-columns"
        style={
          {
            "--explore-column-count": columnCount
          } as React.CSSProperties
        }
        aria-label="Explore photographs"
      >
        {columns.map((column, columnIndex) => (
          <div key={columnIndex} className="explore-column">
            {column.map((image) => {
              const priority = priorityBudget > 0;
              if (priority) priorityBudget -= 1;
              return (
                <ExploreCard
                  key={image.id}
                  image={image}
                  priority={priority}
                  onSelect={onSelect}
                />
              );
            })}
          </div>
        ))}
      </section>
      {cursor ? (
        <div ref={sentinelRef} aria-hidden className="h-px w-full" />
      ) : null}
    </>
  );
}
