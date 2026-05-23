import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  mergeMediaPayloads,
  pickBestMetadata,
  resolveCanonicalMessageId
} from "../lib/telegram/media-groups";

describe("resolveCanonicalMessageId", () => {
  it("returns anchorId when there is no media group", () => {
    assert.equal(resolveCanonicalMessageId(707, null, []), 707);
  });

  it("picks the lowest message id across anchor and existing siblings", () => {
    assert.equal(
      resolveCanonicalMessageId(709, "14235763524399508", [707, 708, 710, 711]),
      707
    );
  });
});

describe("mergeMediaPayloads", () => {
  it("merges existing sibling media with newly downloaded photos", () => {
    const merged = mergeMediaPayloads(
      [
        {
          id: "a",
          slug: "707",
          telegramMessageId: BigInt(707),
          mediaGroupId: "g1",
          caption: "quote",
          contributorUsername: "cloudkingdom1930",
          contributorDisplayName: "cloudkingdom1930",
          locationId: null,
          reactions: [],
          views: 10,
          publishedAt: new Date("2026-05-01T00:00:00.000Z"),
          media: [
            {
              imageUrl: "/media/a.jpg",
              thumbnailUrl: "/media/a.jpg",
              width: 1000,
              height: 800,
              aspectRatio: 1.25,
              orderIndex: 0,
              blurHash: "hash-a",
              blurDataURL: "data:a",
              dominantColor: "#111111"
            }
          ]
        }
      ],
      [
        {
          sourceMessageId: 708,
          url: "/media/b.jpg",
          width: 900,
          height: 700,
          aspectRatio: 1.28,
          blurHash: "hash-b",
          blurDataURL: "data:b",
          dominantColor: "#222222"
        }
      ]
    );

    assert.equal(merged.length, 2);
    assert.deepEqual(
      merged.map((m) => m.sourceMessageId),
      [707, 708]
    );
    assert.deepEqual(
      merged.map((m) => m.orderIndex),
      [0, 1]
    );
  });

  it("dedupes by image URL when the same photo is seen twice", () => {
    const merged = mergeMediaPayloads(
      [
        {
          id: "a",
          slug: "707",
          telegramMessageId: BigInt(707),
          mediaGroupId: "g1",
          caption: null,
          contributorUsername: null,
          contributorDisplayName: null,
          locationId: null,
          reactions: [],
          views: 0,
          publishedAt: new Date(),
          media: [
            {
              imageUrl: "/media/a.jpg",
              thumbnailUrl: "/media/a.jpg",
              width: 1000,
              height: 800,
              aspectRatio: 1.25,
              orderIndex: 0,
              blurHash: "hash-a",
              blurDataURL: "data:a",
              dominantColor: "#111111"
            }
          ]
        }
      ],
      [
        {
          sourceMessageId: 707,
          url: "/media/a.jpg",
          width: 1000,
          height: 800,
          aspectRatio: 1.25,
          blurHash: "hash-a",
          blurDataURL: "data:a",
          dominantColor: "#111111"
        }
      ]
    );

    assert.equal(merged.length, 1);
  });
});

describe("pickBestMetadata", () => {
  it("keeps caption and contributor from whichever sibling has them", () => {
    const metadata = pickBestMetadata(
      [
        {
          id: "a",
          slug: "708",
          telegramMessageId: BigInt(708),
          mediaGroupId: "g1",
          caption: null,
          contributorUsername: null,
          contributorDisplayName: null,
          locationId: null,
          reactions: [],
          views: 5,
          publishedAt: new Date("2026-05-02T00:00:00.000Z"),
          media: []
        },
        {
          id: "b",
          slug: "707",
          telegramMessageId: BigInt(707),
          mediaGroupId: "g1",
          caption: "A quiet street",
          contributorUsername: "cloudkingdom1930",
          contributorDisplayName: "cloudkingdom1930",
          locationId: "loc-1",
          reactions: [{ emoji: "❤", count: 3 }],
          views: 12,
          publishedAt: new Date("2026-05-01T00:00:00.000Z"),
          media: [
            {
              imageUrl: "/media/a.jpg",
              thumbnailUrl: "/media/a.jpg",
              width: 1000,
              height: 800,
              aspectRatio: 1.25,
              orderIndex: 0,
              blurHash: "hash-a",
              blurDataURL: "data:a",
              dominantColor: "#111111"
            }
          ]
        }
      ],
      {
        caption: null,
        contributorUsername: null,
        locationId: null,
        reactions: [],
        views: 1,
        publishedAt: new Date("2026-05-03T00:00:00.000Z"),
        dominantColor: "#999999",
        aspectRatio: 1
      }
    );

    assert.equal(metadata.caption, "A quiet street");
    assert.equal(metadata.contributorUsername, "cloudkingdom1930");
    assert.equal(metadata.locationId, "loc-1");
    assert.equal(metadata.views, 12);
    assert.equal(metadata.publishedAt.toISOString(), "2026-05-01T00:00:00.000Z");
  });
});
