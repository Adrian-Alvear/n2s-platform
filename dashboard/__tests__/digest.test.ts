import { describe, expect, it } from "vitest";
import { parseDigest } from "@/lib/digest";

// parseDigest turns a model-written digest into clean bullet lines, and falls
// back to sentence splitting when the model returned one blob instead of a list.

describe("parseDigest — bullet lines", () => {
  it("strips dash, bullet and asterisk markers", () => {
    expect(parseDigest("- first\n• second\n* third")).toEqual(["first", "second", "third"]);
  });

  it("strips numbered markers in both '1.' and '1)' forms", () => {
    expect(parseDigest("1. first\n2) second\n10. tenth")).toEqual(["first", "second", "tenth"]);
  });

  it("tolerates leading whitespace before the marker", () => {
    expect(parseDigest("   - first\n\t• second")).toEqual(["first", "second"]);
  });

  it("drops blank lines", () => {
    expect(parseDigest("- first\n\n\n- second\n   \n")).toEqual(["first", "second"]);
  });

  it("keeps lines that have no marker at all", () => {
    expect(parseDigest("first line\nsecond line")).toEqual(["first line", "second line"]);
  });

  it("strips only one marker per line", () => {
    // The bullet and the number rules each run once, so a doubled bullet leaves
    // the inner one behind.
    expect(parseDigest("- - first\n- second")).toEqual(["- first", "second"]);
  });

  it("strips a bullet and a number from the same line", () => {
    expect(parseDigest("- 1. first\n- 2. second")).toEqual(["first", "second"]);
  });

  it("mistakes a leading year for a list marker", () => {
    // Quirk: "2026." looks exactly like an ordered-list marker.
    expect(parseDigest("2026. was a big year\n- second")).toEqual([
      "was a big year",
      "second",
    ]);
  });
});

describe("parseDigest — single-blob fallback", () => {
  it("splits one blob into sentences", () => {
    expect(parseDigest("First thing. Second thing! Third thing?")).toEqual([
      "First thing.",
      "Second thing!",
      "Third thing?",
    ]);
  });

  it("returns a single markerless sentence as one item", () => {
    expect(parseDigest("Just one sentence")).toEqual(["Just one sentence"]);
  });

  it("does NOT strip the marker when the fallback path is taken", () => {
    // Quirk: the fallback re-splits the original text, so a lone bullet keeps
    // its marker even though the bullet path had already removed it.
    expect(parseDigest("- Only one bullet.")).toEqual(["- Only one bullet."]);
  });

  it("falls back when every line but one is blank", () => {
    expect(parseDigest("\n\n- Alone. And more.\n\n")).toEqual(["- Alone.", "And more."]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseDigest("")).toEqual([]);
  });

  it("returns an empty array for whitespace-only input", () => {
    expect(parseDigest("   \n  \n ")).toEqual([]);
  });
});
