import { strict as assert } from "node:assert";
import { describe, it } from "node:test";

import { parseCaption } from "../lib/telegram/parser";

describe("parseCaption", () => {
  it("parses the current multi-line channel format", () => {
    const parsed = parseCaption(`#nature #streetshots #landscape
#sunset #goldenhour #roads
Addis Ababa
"The sun, Dr.driving and more sun."
📷 by @Urfav_unc
@pov_et`);

    assert.equal(parsed.caption, "The sun, Dr.driving and more sun.");
    assert.equal(parsed.location, "Addis Ababa");
    assert.equal(parsed.contributorUsername, "Urfav_unc");
    assert.deepEqual(parsed.hashtags, [
      "nature",
      "streetshots",
      "landscape",
      "sunset",
      "goldenhour",
      "roads"
    ]);
  });

  it("parses a compact single-line post", () => {
    const parsed = parseCaption(
      `#flowers Gulele Botanical Garden "Flowers" @pov_et`
    );

    assert.equal(parsed.caption, "Flowers");
    assert.equal(parsed.location, "Gulele Botanical Garden");
    assert.deepEqual(parsed.hashtags, ["flowers"]);
    assert.equal(parsed.contributorUsername, null);
  });

  it("parses hashtags, location, and quote without signature", () => {
    const parsed = parseCaption(`#nature #flowers
Mekelle
"White rose in the garden."
📷 by @Wed0m`);

    assert.equal(parsed.caption, "White rose in the garden.");
    assert.equal(parsed.location, "Mekelle");
    assert.equal(parsed.contributorUsername, "Wed0m");
    assert.deepEqual(parsed.hashtags, ["nature", "flowers"]);
  });

  it("keeps legacy pin-location posts working", () => {
    const parsed = parseCaption(`📍 Hawassa
"A quiet afternoon."
📷 by @cloudkingdom1930`);

    assert.equal(parsed.location, "Hawassa");
    assert.equal(parsed.caption, "A quiet afternoon.");
    assert.equal(parsed.contributorUsername, "cloudkingdom1930");
  });

  it("re-parses polluted caption bodies stored by the old parser", () => {
    const parsed = parseCaption(
      `#nature #streetshots #landscape #sunset #goldenhour #roads Addis Ababa "The sun, Dr.driving and more sun." @pov_et`
    );

    assert.equal(parsed.caption, "The sun, Dr.driving and more sun.");
    assert.equal(parsed.location, "Addis Ababa");
    assert.deepEqual(parsed.hashtags, [
      "nature",
      "streetshots",
      "landscape",
      "sunset",
      "goldenhour",
      "roads"
    ]);
  });
});
