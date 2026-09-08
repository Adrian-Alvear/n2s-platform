import { describe, expect, it } from "vitest";
import { FOUNDER, PRINCIPLES, SERVICES, SITE } from "@/lib/site";

describe("site copy", () => {
  it("uses the settled positioning sentence verbatim", () => {
    expect(SITE.positioning).toBe(
      "A software studio for problems that don't have a product yet.",
    );
  });

  it("keeps AI out of the hero (§2.1)", () => {
    expect(SITE.positioning.toLowerCase()).not.toContain("ai");
  });

  it("names no headcount and invents no people (§2.4)", () => {
    const copy = [
      ...SERVICES.map((s) => `${s.title} ${s.body}`),
      ...PRINCIPLES.map((p) => `${p.title} ${p.body}`),
    ]
      .join(" ")
      .toLowerCase();
    expect(copy).not.toMatch(/\bour team\b|\d+\s*(people|engineers|developers)/);
  });

  it("has exactly one named person", () => {
    expect(FOUNDER.name).toBe("Adrian Alvear");
  });
});
