/**
 * Pure helpers for explore SQL cursor pagination.
 *
 * Global order: post.publishedAt DESC, media.orderIndex ASC.
 * "after"  → older items (higher index in the flattened list).
 * "before" → newer items (lower index in the flattened list).
 */

export type ExploreSortKey = {
  publishedAt: Date;
  orderIndex: number;
};

export type ExplorePaginationDirection = "after" | "before";

const PUBLISHED_WHERE = { post: { status: "PUBLISHED" as const } };

export function buildExploreAfterWhere(cursor: ExploreSortKey) {
  return {
    ...PUBLISHED_WHERE,
    OR: [
      { post: { publishedAt: { lt: cursor.publishedAt } } },
      {
        post: { publishedAt: cursor.publishedAt },
        orderIndex: { gt: cursor.orderIndex }
      }
    ]
  };
}

export function buildExploreBeforeWhere(cursor: ExploreSortKey) {
  return {
    ...PUBLISHED_WHERE,
    OR: [
      { post: { publishedAt: { gt: cursor.publishedAt } } },
      {
        post: { publishedAt: cursor.publishedAt },
        orderIndex: { lt: cursor.orderIndex }
      }
    ]
  };
}

export const exploreAfterOrderBy = [
  { post: { publishedAt: "desc" as const } },
  { orderIndex: "asc" as const }
] as const;

export const exploreBeforeOrderBy = [
  { post: { publishedAt: "asc" as const } },
  { orderIndex: "desc" as const }
] as const;
