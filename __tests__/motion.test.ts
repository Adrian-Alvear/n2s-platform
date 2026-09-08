import { describe, expect, it } from "vitest";
import { DRAW, FADE, MOTION, REVEAL, RISE, SETTLE, stagger } from "@/lib/motion";

describe("motion vocabulary", () => {
  it("exposes exactly five primitives, each with a distinct class", () => {
    const names = [DRAW, REVEAL, RISE, SETTLE, FADE];
    expect(new Set(names).size).toBe(5);
  });

  it("uses one duration and one primary curve", () => {
    expect(MOTION.duration).toBe(650);
    expect(MOTION.ease).toBe("cubic-bezier(0.4, 0, 0.2, 1)");
  });

  it("staggers between elements, starting at zero", () => {
    expect(stagger(0)).toEqual({ animationDelay: "0ms" });
    expect(stagger(3, 80)).toEqual({ animationDelay: "240ms" });
  });
});
