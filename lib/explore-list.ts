import { clampExploreAspectRatio } from "./masonry";
import type { ExploreImage, ExplorePage } from "./types";

/** One vertical lane in the explicit masonry grid. */
export type ExploreColumns = ExploreImage[][];

/** Keep first occurrence — preserves global explore order. */
export function dedupeExploreImages(images: ExploreImage[]): ExploreImage[] {
  const seen = new Set<string>();
  const out: ExploreImage[] = [];
  for (const img of images) {
    if (seen.has(img.id)) continue;
    seen.add(img.id);
    out.push(img);
  }
  return out;
}

/** Append in canonical order; used when rebuilding columns on resize. */
export function appendExploreImages(
  existing: ExploreImage[],
  incoming: ExploreImage[]
): ExploreImage[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(existing.map((img) => img.id));
  const next = [...existing];
  for (const image of incoming) {
    if (seen.has(image.id)) continue;
    seen.add(image.id);
    next.push(image);
  }
  return next.length === existing.length ? existing : next;
}

export function getExploreColumnCount(viewportWidth: number): number {
  if (viewportWidth >= 1536) return 5;
  if (viewportWidth >= 1280) return 4;
  if (viewportWidth >= 1024) return 3;
  return 2;
}

/** Relative tile height for shortest-column placement (column width held constant). */
export function estimateExploreItemHeight(image: ExploreImage): number {
  const ratio = clampExploreAspectRatio(image.media.aspectRatio);
  return 1 / ratio;
}

export function shortestColumnIndex(heights: number[]): number {
  let min = 0;
  for (let i = 1; i < heights.length; i++) {
    if ((heights[i] ?? 0) < (heights[min] ?? 0)) min = i;
  }
  return min;
}

/** Initial distribution — used for SSR and after a column-count change. */
export function createExploreColumns(
  images: ExploreImage[],
  columnCount: number
): ExploreColumns {
  const count = Math.max(1, columnCount);
  const columns: ExploreColumns = Array.from({ length: count }, () => []);
  const heights = new Array<number>(count).fill(0);

  for (const image of images) {
    const col = shortestColumnIndex(heights);
    columns[col]!.push(image);
    heights[col]! += estimateExploreItemHeight(image);
  }

  return columns;
}

/**
 * Append incoming images to the shortest column only. Prior columns and
 * the order of tiles already in them are never touched — new tiles only
 * extend downward in one lane.
 */
export function appendExploreColumns(
  existing: ExploreColumns,
  incoming: ExploreImage[]
): ExploreColumns {
  if (incoming.length === 0) return existing;

  const seen = new Set(
    existing.flatMap((column) => column.map((image) => image.id))
  );
  const nextImages: ExploreImage[] = [];
  for (const image of incoming) {
    if (seen.has(image.id)) continue;
    seen.add(image.id);
    nextImages.push(image);
  }
  if (nextImages.length === 0) return existing;

  const columns = existing.map((column) => [...column]);
  const heights = columns.map((column) =>
    column.reduce((sum, image) => sum + estimateExploreItemHeight(image), 0)
  );

  for (const image of nextImages) {
    const col = shortestColumnIndex(heights);
    columns[col]!.push(image);
    heights[col]! += estimateExploreItemHeight(image);
  }

  return columns;
}

export function flattenExploreColumns(columns: ExploreColumns): ExploreImage[] {
  return columns.flat();
}

/**
 * Resolve a cursor id to an index. Uses the last match so pagination
 * continues after the furthest position when duplicate ids ever appear
 * in the source list.
 */
export function findExploreImageIndex(
  images: ExploreImage[],
  id: string
): number {
  for (let i = images.length - 1; i >= 0; i--) {
    if (images[i]?.id === id) return i;
  }
  return -1;
}

/** Pure pagination over a pre-built explore list (used by tests and API). */
export function getExplorePageFromImages(
  all: ExploreImage[],
  options?: {
    cursor?: string | null;
    limit?: number;
    direction?: "after" | "before";
  }
): ExplorePage {
  const limit = options?.limit ?? 32;
  const direction = options?.direction ?? "after";
  const images = dedupeExploreImages(all);

  if (!options?.cursor) {
    const slice = images.slice(0, limit);
    return {
      images: slice,
      nextCursor: limit < images.length ? (slice.at(-1)?.id ?? null) : null
    };
  }

  const idx = findExploreImageIndex(images, options.cursor);
  if (idx === -1) return { images: [], nextCursor: null };

  if (direction === "after") {
    const slice = images.slice(idx + 1, idx + 1 + limit);
    return {
      images: slice,
      nextCursor:
        idx + 1 + limit < images.length ? (slice.at(-1)?.id ?? null) : null
    };
  }

  const start = Math.max(0, idx - limit);
  const slice = images.slice(start, idx);
  return {
    images: slice,
    nextCursor: start > 0 ? (slice[0]?.id ?? null) : null
  };
}
