import type { PlanetName } from "./ephemeris";

/**
 * The world's configuration.
 *
 * Ported from v1, with the module semantics removed. On the front face the
 * system is a backdrop, not a menu — the five bodies are geometry, not doors.
 * Phase 3 re-attaches labels and dive targets for the hub, using this same
 * config.
 */

export const VOID = "#05060a";
export const STARLIGHT = "#f4f6fa";
export const SILVER = "#b9c0cc";
export const PLATINUM = "#8b93a3";
export const SUNGOLD = "#f0d9a8";
/** Backdrop tint for the macro view — colder and dimmer than any node. */
export const NEBULA_MACRO = "#141a2e";

/** Cold-start flight: the camera falls in from outside the system. */
export const BOOT_SECONDS = 3.2;
/** Each body settles onto its orbit this long after the one inside it. */
export const BOOT_STAGGER = 0.22;

export type BodyConfig = {
  id: string;
  planet: PlanetName;
  radius: number;
  color: string;
  ringColor: string;
  ringOpacity: number;
  /** Icosahedron detail — the outer bodies are simpler, they read smaller. */
  detail: number;
  size: number;
};

/**
 * Radii are display radii, not AU. Kepler's third law still drives the
 * periods (w proportional to a^-1.5), so the inner bodies visibly outrun the
 * outer ones without anything being faked.
 */
export const BODIES: BodyConfig[] = [
  { id: "a", planet: "Mercury", radius: 3.2,  size: 0.20, detail: 1, color: "#efdcb0", ringColor: "#c9b48a", ringOpacity: 0.34 },
  { id: "b", planet: "Venus",   radius: 4.7,  size: 0.26, detail: 1, color: "#d6dbe4", ringColor: "#9fb0c4", ringOpacity: 0.28 },
  { id: "c", planet: "Earth",   radius: 6.5,  size: 0.30, detail: 1, color: "#bcd8f0", ringColor: "#9ec4e0", ringOpacity: 0.26 },
  { id: "d", planet: "Mars",    radius: 8.6,  size: 0.24, detail: 0, color: "#cbbda6", ringColor: "#bd8f7a", ringOpacity: 0.19 },
  { id: "e", planet: "Mars",    radius: 11.4, size: 0.18, detail: 0, color: "#d8c9ae", ringColor: "#8fa2bd", ringOpacity: 0.14 },
];
