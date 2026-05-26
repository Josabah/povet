import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  buildExploreAfterWhere,
  buildExploreBeforeWhere
} from "../lib/explore-pagination";

describe("explore pagination where clauses", () => {
  const cursor = {
    publishedAt: new Date("2026-05-01T12:00:00.000Z"),
    orderIndex: 2
  };

  it("buildExploreAfterWhere targets older items in sort order", () => {
    const where = buildExploreAfterWhere(cursor);
    assert.equal(where.post.status, "PUBLISHED");
    assert.equal(where.OR.length, 2);
    assert.deepEqual(where.OR[0], {
      post: { publishedAt: { lt: cursor.publishedAt } }
    });
    assert.deepEqual(where.OR[1], {
      post: { publishedAt: cursor.publishedAt },
      orderIndex: { gt: cursor.orderIndex }
    });
  });

  it("buildExploreBeforeWhere targets newer items in sort order", () => {
    const where = buildExploreBeforeWhere(cursor);
    assert.equal(where.post.status, "PUBLISHED");
    assert.equal(where.OR.length, 2);
    assert.deepEqual(where.OR[0], {
      post: { publishedAt: { gt: cursor.publishedAt } }
    });
    assert.deepEqual(where.OR[1], {
      post: { publishedAt: cursor.publishedAt },
      orderIndex: { lt: cursor.orderIndex }
    });
  });
});
