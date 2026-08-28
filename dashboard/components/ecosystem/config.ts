import type { NodeId } from "./store";
import type { PlanetName } from "./ephemeris";

export const VOID = "#05060a";
export const STARLIGHT = "#f4f6fa";
export const SILVER = "#b9c0cc";
export const PLATINUM = "#8b93a3";
export const SUNGOLD = "#f0d9a8";

export const DIVE_SECONDS = 1.6;

export type NodeConfig = {
  id: NodeId;
  label: string;
  /** The real body this node rides. Motion comes from its ephemeris. */
  planet: PlanetName;
  /** Scene-space radius its mean orbit maps to. */
  radius: number;
  color: string;
  ringColor: string;
  ringOpacity: number;
};

export const NODES: NodeConfig[] = [
  { id: "financial", label: "Financial Hub",    planet: "Mercury", radius: 3.2, color: "#efdcb0", ringColor: "#c9b48a", ringOpacity: 0.34 },
  { id: "portfolio", label: "Portfolio Works",  planet: "Venus",   radius: 4.7, color: "#d6dbe4", ringColor: "#9fb0c4", ringOpacity: 0.28 },
  { id: "learning",  label: "Learning Curve",   planet: "Earth",   radius: 6.5, color: "#e8eef7", ringColor: "#b8c2d0", ringOpacity: 0.22 },
  { id: "aerospace", label: "Aerospace Hangar", planet: "Mars",    radius: 8.6, color: "#cbbda6", ringColor: "#8fa2bd", ringOpacity: 0.17 },
];
