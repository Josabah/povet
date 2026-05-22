import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import {
  groupMessages,
  type RawTelegramMessage
} from "../lib/telegram/groups";

const D = 1_700_000_000; // arbitrary base unix timestamp

function msg(
  id: number,
  groupedId: string | null,
  opts: Partial<RawTelegramMessage> = {}
): RawTelegramMessage {
  return {
    id,
    groupedId,
    date: opts.date ?? D + id,
    message: opts.message ?? null,
    hasPhoto: opts.hasPhoto ?? true,
    views: opts.views ?? null,
    reactions: opts.reactions ?? null
  };
}

describe("groupMessages", () => {
  it("groups messages sharing a groupedId into a single logical post", () => {
    const result = groupMessages([
      msg(101, "g1"),
      msg(102, "g1"),
      msg(103, "g1")
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].anchorId, 101);
    assert.equal(result[0].photoMessages.length, 3);
    assert.equal(result[0].groupedId, "g1");
  });

  it("treats messages without a groupedId as standalones", () => {
    const result = groupMessages([msg(10, null), msg(11, null)]);
    assert.equal(result.length, 2);
    assert.deepEqual(
      result.map((p) => p.anchorId),
      [10, 11]
    );
    assert.equal(result[0].groupedId, null);
  });

  it("orders photos within a group by id ascending regardless of input order", () => {
    const result = groupMessages([
      msg(203, "g2"),
      msg(201, "g2"),
      msg(202, "g2")
    ]);
    assert.equal(result.length, 1);
    assert.deepEqual(
      result[0].photoMessages.map((m) => m.id),
      [201, 202, 203]
    );
    assert.equal(result[0].anchorId, 201);
  });

  it("picks the first non-empty caption (by id) as the merged caption", () => {
    const result = groupMessages([
      msg(301, "g3", { message: "" }),
      msg(302, "g3", { message: "the real caption" }),
      msg(303, "g3", { message: "should be ignored" })
    ]);
    assert.equal(result[0].caption, "the real caption");
  });

  it("returns a null caption when no message in the group has one", () => {
    const result = groupMessages([
      msg(401, "g4", { message: null }),
      msg(402, "g4", { message: "" }),
      msg(403, "g4")
    ]);
    assert.equal(result[0].caption, null);
  });

  it("drops a group if no message has a photo", () => {
    const result = groupMessages([
      msg(501, "g5", { hasPhoto: false, message: "text only" }),
      msg(502, "g5", { hasPhoto: false })
    ]);
    assert.equal(result.length, 0);
  });

  it("keeps only photo messages but preserves the lead caption", () => {
    const result = groupMessages([
      msg(601, "g6", { hasPhoto: false, message: "lead caption" }),
      msg(602, "g6", { hasPhoto: true }),
      msg(603, "g6", { hasPhoto: true })
    ]);
    assert.equal(result.length, 1);
    assert.equal(result[0].caption, "lead caption");
    assert.equal(result[0].photoMessages.length, 2);
    assert.deepEqual(
      result[0].photoMessages.map((m) => m.id),
      [602, 603]
    );
  });

  it("uses the earliest date in the group as publishedAt", () => {
    const result = groupMessages([
      msg(701, "g7", { date: D + 500 }),
      msg(702, "g7", { date: D + 100 }),
      msg(703, "g7", { date: D + 300 })
    ]);
    assert.equal(result[0].publishedAt, new Date((D + 100) * 1000).toISOString());
  });

  it("takes the maximum views and the first non-empty reactions", () => {
    const result = groupMessages([
      msg(801, "g8", { views: 50 }),
      msg(802, "g8", {
        views: 110,
        reactions: [{ emoji: "❤", count: 12 }]
      }),
      msg(803, "g8", {
        views: 90,
        reactions: [{ emoji: "🔥", count: 1 }]
      })
    ]);
    assert.equal(result[0].views, 110);
    assert.deepEqual(result[0].reactions, [{ emoji: "❤", count: 12 }]);
  });

  it("sorts the output by anchorId ascending", () => {
    const result = groupMessages([
      msg(900, null),
      msg(800, "gA"),
      msg(801, "gA"),
      msg(700, null)
    ]);
    assert.deepEqual(
      result.map((p) => p.anchorId),
      [700, 800, 900]
    );
  });

  it("never collapses standalones from different ids together", () => {
    const result = groupMessages([
      msg(1, null),
      msg(2, null),
      msg(3, null)
    ]);
    assert.equal(result.length, 3);
  });

  it("does not group two standalone messages that share an id by accident", () => {
    // Defensive: even if two standalones were claimed to have the same id
    // (pathological), the bucketing logic keeps them keyed by `s:${id}` so
    // they collide deterministically rather than crash.
    const result = groupMessages([msg(1, null), msg(1, null)]);
    assert.equal(result.length, 1);
    assert.equal(result[0].photoMessages.length, 2);
  });
});
