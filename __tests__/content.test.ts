import { describe, expect, it } from "vitest";
import {
  REAL_WORK,
  WORK,
  caseStudies,
  findWork,
  isLab,
  labPieces,
  publicWork,
  type Work,
} from "@/lib/content";

const base: Work = {
  slug: "example",
  title: "Example",
  summary: "A summary.",
  problem: "A problem.",
  approach: "An approach.",
  built: ["A thing"],
  visibility: "public",
  year: 2026,
};

const fixtures: Work[] = [
  { ...base, slug: "older", year: 2024 },
  { ...base, slug: "newer", year: 2026 },
  { ...base, slug: "hidden", visibility: "private" },
  { ...base, slug: "for-a-client", client: "Acme" },
];

describe("what ships to production", () => {
  it("has no real work yet, and none is invented", () => {
    // Inventing client-facing content is forbidden (BUILD-PROMPT §8).
    expect(REAL_WORK).toEqual([]);
  });

  it("excludes development fixtures from a production build", () => {
    // The fixtures exist only so the Lab can be seen working locally. If this
    // ever fails, test content is about to be shown to clients.
    const prod = process.env.NODE_ENV === "production" ? WORK : REAL_WORK;
    expect(prod).toEqual([]);
    expect(prod).toHaveLength(0);
  });

  it("every selector is empty-safe", () => {
    expect(labPieces([])).toEqual([]);
    expect(caseStudies([])).toEqual([]);
    expect(findWork("anything", [])).toBeUndefined();
  });
});

describe("lab vs case study", () => {
  it("work without a client is a Lab piece", () => {
    expect(isLab(base)).toBe(true);
    expect(isLab({ ...base, client: "Acme" })).toBe(false);
  });

  it("the two listings partition the public work between them", () => {
    const lab = labPieces(fixtures);
    const cases = caseStudies(fixtures);
    expect(lab.length + cases.length).toBe(publicWork(fixtures).length);
    expect(lab.map((w) => w.slug)).not.toContain("for-a-client");
    expect(cases.map((w) => w.slug)).toEqual(["for-a-client"]);
  });
});

describe("visibility", () => {
  it("private work never reaches a public listing", () => {
    expect(labPieces(fixtures).map((w) => w.slug)).not.toContain("hidden");
    expect(publicWork(fixtures).map((w) => w.slug)).not.toContain("hidden");
  });

  it("private work is not reachable by slug either", () => {
    expect(findWork("hidden", fixtures)).toBeUndefined();
    expect(findWork("newer", fixtures)?.slug).toBe("newer");
  });
});

describe("ordering", () => {
  it("lists newest first", () => {
    expect(labPieces(fixtures).map((w) => w.year)).toEqual([2026, 2024]);
  });
});
