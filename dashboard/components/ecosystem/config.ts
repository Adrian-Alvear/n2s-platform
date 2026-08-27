import type { NodeId } from "./store";

export const CYAN = "#22d3ee";
export const DIVE_SECONDS = 1.6;

export type NodeConfig = {
  id: NodeId;
  label: string;
  radius: number;
  speed: number;
  phase: number;
  tilt: number;
};

export const NODES: NodeConfig[] = [
  { id: "financial", label: "Financial Hub",   radius: 3.2, speed: 0.28, phase: 0.0, tilt: 0.06 },
  { id: "portfolio", label: "Portfolio Works", radius: 4.6, speed: 0.21, phase: 1.7, tilt: -0.11 },
  { id: "learning",  label: "Learning Curve",  radius: 6.0, speed: 0.16, phase: 3.1, tilt: 0.15 },
  { id: "aerospace", label: "Aerospace Hangar",radius: 7.4, speed: 0.12, phase: 4.6, tilt: -0.05 },
];
