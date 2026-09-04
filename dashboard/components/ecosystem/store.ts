import { create } from "zustand";
import * as THREE from "three";

export type NodeId = "overview" | "financial" | "portfolio" | "learning" | "aerospace";
/** `briefing` is the core's Jarvis intro: camera pulls back, overlay stages in. */
export type Mode = "macro" | "diving" | "micro" | "exiting" | "briefing";

// Live world positions, written by each node every frame. Deliberately kept
// OUT of zustand — this changes 60x/sec and must never trigger a React render.
export const nodePositions = new Map<NodeId, THREE.Vector3>();

export type RouteNode = NodeId | "core" | null;

type State = {
  /** Mirrors the URL. The router owns this; the 3D layer only reads it. */
  routeNode: RouteNode;
  setRouteNode: (n: RouteNode) => void;
  /** Which module the briefing is showing, so the camera can frame it. */
  featured: NodeId | null;
  setFeatured: (n: NodeId | null) => void;
  mode: Mode;
  active: NodeId | null;
  hovered: NodeId | "core" | null;
  dive: (id: NodeId) => void;
  enter: () => void;
  exit: () => void;
  land: () => void;
  brief: () => void;
  setHovered: (id: NodeId | "core" | null) => void;
};

export const useEcosystem = create<State>((set) => ({
  routeNode: null,
  setRouteNode: (routeNode) => set({ routeNode }),
  featured: null,
  setFeatured: (featured) => set({ featured }),
  mode: "macro",
  active: null,
  hovered: null,
  dive: (id) => set({ mode: "diving", active: id }),
  enter: () => set({ mode: "micro" }),
  exit: () => set({ mode: "exiting" }),
  land: () => set({ mode: "macro", active: null }),
  brief: () => set({ mode: "briefing" }),
  setHovered: (hovered) => set({ hovered }),
}));
