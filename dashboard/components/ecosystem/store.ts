import { create } from "zustand";
import * as THREE from "three";

export type NodeId = "financial" | "portfolio" | "learning" | "aerospace";
export type Mode = "macro" | "diving" | "micro" | "exiting";

// Live world positions, written by each node every frame. Deliberately kept
// OUT of zustand — this changes 60x/sec and must never trigger a React render.
export const nodePositions = new Map<NodeId, THREE.Vector3>();

type State = {
  mode: Mode;
  active: NodeId | null;
  hovered: NodeId | null;
  dive: (id: NodeId) => void;
  enter: () => void;
  exit: () => void;
  land: () => void;
  setHovered: (id: NodeId | null) => void;
};

export const useEcosystem = create<State>((set) => ({
  mode: "macro",
  active: null,
  hovered: null,
  dive: (id) => set({ mode: "diving", active: id }),
  enter: () => set({ mode: "micro" }),
  exit: () => set({ mode: "exiting" }),
  land: () => set({ mode: "macro", active: null }),
  setHovered: (hovered) => set({ hovered }),
}));
