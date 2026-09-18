import { describe, expect, it } from "vitest";
import { buildShapes } from "@/components/site/morph/shapes";
import { SHAPE_COUNT } from "@/components/site/morph/store";
import { SERVICES } from "@/lib/site";

const COUNT = 2000;

describe("hero morph shapes", () => {
  const shapes = buildShapes(COUNT);

  it("has the loose cloud plus one form per service", () => {
    expect(shapes).toHaveLength(SHAPE_COUNT + 1);
    // If a service is added, the particles need a form for it too.
    expect(SHAPE_COUNT).toBe(SERVICES.length);
  });

  it("gives every particle a finite position in every form", () => {
    for (const shape of shapes) {
      expect(shape).toHaveLength(COUNT * 3);
      expect(shape.every(Number.isFinite)).toBe(true);
    }
  });

  it("is deterministic, so the forms are identical on every visit", () => {
    const again = buildShapes(COUNT);
    shapes.forEach((shape, i) => expect(Array.from(again[i])).toEqual(Array.from(shape)));
  });

  it("produces forms that are actually different from each other", () => {
    for (let a = 0; a < shapes.length; a++) {
      for (let b = a + 1; b < shapes.length; b++) {
        expect(Array.from(shapes[a].slice(0, 30))).not.toEqual(Array.from(shapes[b].slice(0, 30)));
      }
    }
  });

  it("keeps every form inside the frame the camera is set up for", () => {
    for (const shape of shapes) {
      const max = shape.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
      expect(max).toBeLessThan(5);
    }
  });
});
