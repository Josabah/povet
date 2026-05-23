import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  appendExploreColumns,
  appendExploreImages,
  createExploreColumns,
  dedupeExploreImages,
  getExplorePageFromImages
} from "../lib/explore-list";
import type { ExploreImage } from "../lib/types";

function img(
  id: string,
  options?: { postSlug?: string; mediaIndex?: number; stackSize?: number }
): ExploreImage {
  return {
    id,
    media: {
      src: `/media/${id}.jpg`,
      width: 100,
      height: 100,
      aspectRatio: 1,
      orderIndex: 0,
      blurHash: "",
      blurDataURL: "",
      dominantColor: "#000000"
    },
    postSlug: options?.postSlug ?? id,
    caption: null,
    location: null,
    locationSlug: null,
    contributorUsername: null,
    contributorDisplayName: null,
    publishedAt: "2026-01-01T00:00:00.000Z",
    stackSize: options?.stackSize ?? 1,
    mediaIndex: options?.mediaIndex ?? 0
  };
}

describe("explore list helpers", () => {
  it("dedupeExploreImages keeps first occurrence in order", () => {
    const list = [img("a"), img("b"), img("a"), img("c")];
    const deduped = dedupeExploreImages(list);
    assert.deepEqual(
      deduped.map((i) => i.id),
      ["a", "b", "c"]
    );
  });

  it("appendExploreImages appends only new ids", () => {
    const existing = [img("a"), img("b")];
    const incoming = [img("b"), img("c"), img("c")];
    const merged = appendExploreImages(existing, incoming);

    assert.deepEqual(
      merged.map((i) => i.id),
      ["a", "b", "c"]
    );
  });

  it("appendExploreImages does not move prior items", () => {
    const existing = [img("a"), img("b"), img("c")];
    const next = appendExploreImages(existing, [img("d"), img("e")]);

    assert.deepEqual(next.slice(0, existing.length), existing);
    assert.notEqual(next, existing);
    assert.deepEqual(
      next.map((i) => i.id),
      ["a", "b", "c", "d", "e"]
    );
  });

  it("keeps stack continuations adjacent in row-major order", () => {
    const existing = [
      img("a-0", { postSlug: "a", mediaIndex: 0, stackSize: 3 }),
      img("a-1", { postSlug: "a", mediaIndex: 1, stackSize: 3 })
    ];
    const continued = appendExploreImages(existing, [
      img("a-2", { postSlug: "a", mediaIndex: 2, stackSize: 3 })
    ]);

    assert.deepEqual(
      continued.map((image) => image.id),
      ["a-0", "a-1", "a-2"]
    );
  });

  it("getExplorePageFromImages paginates without overlap", () => {
    const all = ["a", "b", "c", "d", "e"].map((id) => img(id));

    const page1 = getExplorePageFromImages(all, { limit: 2 });
    assert.deepEqual(
      page1.images.map((i) => i.id),
      ["a", "b"]
    );
    assert.equal(page1.nextCursor, "b");

    const page2 = getExplorePageFromImages(all, {
      cursor: page1.nextCursor,
      limit: 2
    });
    assert.deepEqual(
      page2.images.map((i) => i.id),
      ["c", "d"]
    );
    assert.equal(page2.nextCursor, "d");

    const page3 = getExplorePageFromImages(all, {
      cursor: page2.nextCursor,
      limit: 2
    });
    assert.deepEqual(
      page3.images.map((i) => i.id),
      ["e"]
    );
    assert.equal(page3.nextCursor, null);
  });

  it("getExplorePageFromImages dedupes source before paginating", () => {
    const all = [img("a"), img("b"), img("a"), img("c")];
    const page1 = getExplorePageFromImages(all, { limit: 2 });
    const page2 = getExplorePageFromImages(all, {
      cursor: page1.nextCursor,
      limit: 2
    });

    const seen = new Set<string>();
    for (const id of [
      ...page1.images.map((i) => i.id),
      ...page2.images.map((i) => i.id)
    ]) {
      assert.equal(seen.has(id), false, `duplicate id in pages: ${id}`);
      seen.add(id);
    }
    assert.deepEqual([...seen], ["a", "b", "c"]);
  });

  it("getExplorePageFromImages dedupes before cursor resolution", () => {
    const all = [img("dup"), img("b"), img("c"), img("dup"), img("e")];
    const page = getExplorePageFromImages(all, { cursor: "dup", limit: 2 });
    assert.deepEqual(
      page.images.map((i) => i.id),
      ["b", "c"]
    );
  });

  it("appendExploreColumns extends lanes without reordering prior tiles", () => {
    const initial = createExploreColumns(
      [img("a"), img("b"), img("c"), img("d")],
      2
    );
    const next = appendExploreColumns(initial, [img("e"), img("f")]);

    for (let lane = 0; lane < initial.length; lane++) {
      const before = initial[lane]?.map((image) => image.id) ?? [];
      const after = next[lane]?.slice(0, before.length).map((image) => image.id) ?? [];
      assert.deepEqual(after, before, `lane ${lane} reordered`);
    }

    assert.equal(next.flat().length, 6);
  });

  it("getExplorePageFromImages keeps stack siblings in source order", () => {
    const all = [
      img("a-0", { postSlug: "a", mediaIndex: 0, stackSize: 3 }),
      img("a-1", { postSlug: "a", mediaIndex: 1, stackSize: 3 }),
      img("a-2", { postSlug: "a", mediaIndex: 2, stackSize: 3 }),
      img("b-0", { postSlug: "b" }),
      img("c-0", { postSlug: "c" })
    ];

    const page = getExplorePageFromImages(all, { limit: 5 });

    assert.deepEqual(
      page.images.map((i) => i.id),
      ["a-0", "a-1", "a-2", "b-0", "c-0"]
    );
  });
});
