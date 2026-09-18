import { create } from "zustand";

/**
 * Which form the hero's particles are holding.
 *
 * -1 is the loose cloud: the problem before it has a shape. 0..3 are the four
 * services. The DOM writes this (hover, focus, auto-cycle); the canvas only
 * reads it. Kept in a store rather than props because the canvas is loaded
 * separately and must not re-render React to change shape.
 */
type MorphState = {
  target: number;
  /** True while the visitor is choosing — pauses the auto-cycle. */
  held: boolean;
  setTarget: (target: number) => void;
  hold: (target: number) => void;
  release: () => void;
};

export const useMorph = create<MorphState>((set) => ({
  target: -1,
  held: false,
  setTarget: (target) => set({ target }),
  hold: (target) => set({ target, held: true }),
  release: () => set({ held: false }),
}));

export const SHAPE_COUNT = 4;
