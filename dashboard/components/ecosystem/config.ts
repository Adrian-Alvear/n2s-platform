import type { NodeId } from "./store";

export const VOID = "#05060a";
export const STARLIGHT = "#f4f6fa";
export const SILVER = "#b9c0cc";
export const PLATINUM = "#8b93a3";
export const SUNGOLD = "#f0d9a8";

export const DIVE_SECONDS = 1.6;

/**
 * Kepler's third law: T² ∝ a³, so angular velocity ω ∝ a^-1.5.
 * KEPLER_BASE is tuned so the innermost body takes ~40s per orbit; every other
 * period then falls out of the physics rather than being hand-picked. That
 * relationship — inner fast, outer crawling — is what reads as a real system.
 */
const KEPLER_BASE = 0.9;
const keplerSpeed = (radius: number) => KEPLER_BASE / Math.pow(radius, 1.5);

export type NodeConfig = {
  id: NodeId;
  label: string;
  radius: number;
  speed: number;
  phase: number;
  /** Real planets sit within ~7° of the ecliptic — near-coplanar, not stacked. */
  tilt: number;
  color: string;
  ringColor: string;
  ringOpacity: number;
};

const RAW: Omit<NodeConfig, "speed">[] = [
  { id: "financial", label: "Financial Hub",    radius: 3.2, phase: 0.0, tilt: 0.012, color: "#efdcb0", ringColor: "#c9b48a", ringOpacity: 0.34 },
  { id: "portfolio", label: "Portfolio Works",  radius: 4.7, phase: 1.7, tilt: 0.030, color: "#d6dbe4", ringColor: "#9fb0c4", ringOpacity: 0.28 },
  { id: "learning",  label: "Learning Curve",   radius: 6.5, phase: 3.1, tilt: 0.020, color: "#e8eef7", ringColor: "#b8c2d0", ringOpacity: 0.22 },
  { id: "aerospace", label: "Aerospace Hangar", radius: 8.6, phase: 4.6, tilt: 0.040, color: "#cbbda6", ringColor: "#8fa2bd", ringOpacity: 0.17 },
];

export const NODES: NodeConfig[] = RAW.map((n) => ({ ...n, speed: keplerSpeed(n.radius) }));
