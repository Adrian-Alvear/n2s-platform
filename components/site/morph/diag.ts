import { create } from "zustand";

/**
 * Development diagnostics for the hero canvas. Written by the canvas code,
 * read by DevHud. Exists because this scene cannot be checked from the agent
 * side, so the page has to report on itself.
 */
type Diag = {
  stage: string;
  webgl: string;
  particles: number;
  frames: number;
  canvas: string;
  error: string;
  set: (patch: Partial<Omit<Diag, "set">>) => void;
};

export const useDiag = create<Diag>((set) => ({
  stage: "page loaded",
  webgl: "?",
  particles: 0,
  frames: 0,
  canvas: "-",
  error: "",
  set: (patch) => set(patch),
}));
