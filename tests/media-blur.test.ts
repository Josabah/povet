import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { blurDataURLFromHash } from "../lib/media-blur";

describe("blurDataURLFromHash", () => {
  it("returns empty string for missing hash", async () => {
    assert.equal(await blurDataURLFromHash(""), "");
  });

  it("derives a data URL from a blurhash", async () => {
    const url = await blurDataURLFromHash("LEHV6nWB2yk8pyo0adR*.7kCMdnj");
    assert.match(url, /^data:image\/png;base64,/);
  });

  it("memoizes repeated hashes", async () => {
    const hash = "LEHV6nWB2yk8pyo0adR*.7kCMdnj";
    const first = await blurDataURLFromHash(hash);
    const second = await blurDataURLFromHash(hash);
    assert.equal(first, second);
  });
});
