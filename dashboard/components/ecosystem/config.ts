import type { NodeId } from "./store";
import type { PlanetName } from "./ephemeris";

export const VOID = "#05060a";
export const STARLIGHT = "#f4f6fa";
export const SILVER = "#b9c0cc";
export const PLATINUM = "#8b93a3";
export const SUNGOLD = "#f0d9a8";

export const DIVE_SECONDS = 1.6;
/** The briefing pull-back, matched to the overlay's 650ms motion language. */
export const BRIEF_SECONDS = 1.1;
/** Cold-start flight: the camera falls in from outside the system. */
export const BOOT_SECONDS = 3.2;
/** Each body settles onto its orbit this long after the one inside it. */
export const BOOT_STAGGER = 0.22;

export type NodeConfig = {
  id: NodeId;
  label: string;
  planet: PlanetName;
  radius: number;
  speed: number;
  phase: number;
  tilt: number;
  /** One line describing the module, shown in the core briefing. */
  blurb: string;
  color: string;
  ringColor: string;
  ringOpacity: number;
};

const KEPLER_BASE = 0.9;
const keplerSpeed = (radius: number) => KEPLER_BASE / Math.pow(radius, 1.5);

const RAW: Omit<NodeConfig, "speed">[] = [
  { id: "financial", label: "Financial Hub",    planet: "Mercury", radius: 3.2,  phase: 0.0, tilt: 0.012, color: "#efdcb0", ringColor: "#c9b48a", ringOpacity: 0.34, blurb: "Household budget, envelopes, goals and every transaction." },
  { id: "portfolio", label: "Portfolio Works",  planet: "Venus",   radius: 4.7,  phase: 1.7, tilt: 0.030, color: "#d6dbe4", ringColor: "#9fb0c4", ringOpacity: 0.28, blurb: "Project gallery and case studies. Not built yet." },
  { id: "overview",  label: "Overview",         planet: "Earth",   radius: 6.5,  phase: 3.1, tilt: 0.020, color: "#bcd8f0", ringColor: "#9ec4e0", ringOpacity: 0.26, blurb: "Your daily briefing: news, matches and the month at a glance." },
  { id: "learning",  label: "Learning Curve",   planet: "Mars",    radius: 8.6,  phase: 4.6, tilt: 0.040, color: "#cbbda6", ringColor: "#bd8f7a", ringOpacity: 0.19, blurb: "Notes, reading and what you are studying. Not built yet." },
  { id: "aerospace", label: "Aerospace Hangar", planet: "Mars",    radius: 11.4, phase: 2.2, tilt: 0.008, color: "#d8c9ae", ringColor: "#8fa2bd", ringOpacity: 0.14, blurb: "Launch complex and flight tracking. Not built yet." },
];

export const NODES: NodeConfig[] = RAW.map((n) => ({ ...n, speed: keplerSpeed(n.radius) }));
