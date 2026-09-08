import { Body, HelioVector, Ecliptic } from "astronomy-engine";
import * as THREE from "three";

/**
 * Real planetary positions from astronomy-engine (VSOP87 / NOVAS C 3.1,
 * accurate to ~1 arcminute).
 *
 * The compromise, and it is the same one a physical orrery makes: angular
 * positions are TRUE, radii are compressed. At real scale Neptune is 77x
 * farther than Mercury and the inner system collapses to a dot. Mapping the
 * four nodes onto the four terrestrial planets keeps the period spread at
 * 7.8x instead of 122x, so nothing has to be faked to stay legible.
 *
 * Each body's real eccentricity survives the compression: distance is scaled
 * against the planet's mean semi-major axis, so Mercury still visibly breathes
 * in and out across its orbit.
 */

export type PlanetName = "Mercury" | "Venus" | "Earth" | "Mars";

/** Simulated days elapsed per real second. */
export const DAYS_PER_SECOND = 5;
const MS_PER_DAY = 86_400_000;

const MEAN_AU: Record<PlanetName, number> = {
  Mercury: 0.3871,
  Venus: 0.7233,
  Earth: 1.0000,
  Mars: 1.5237,
};

/** Sidereal orbital periods in days — used to trace one full orbit path. */
export const PERIOD_DAYS: Record<PlanetName, number> = {
  Mercury: 87.969,
  Venus: 224.701,
  Earth: 365.256,
  Mars: 686.980,
};

const BODIES: Record<PlanetName, Body> = {
  Mercury: Body.Mercury,
  Venus: Body.Venus,
  Earth: Body.Earth,
  Mars: Body.Mars,
};

/** The epoch the simulation starts from — real "now", so today's sky matches. */
export const EPOCH_MS = Date.now();

export function simDate(elapsedSeconds: number): Date {
  return new Date(EPOCH_MS + elapsedSeconds * DAYS_PER_SECOND * MS_PER_DAY);
}

/**
 * Heliocentric position in scene space.
 * HelioVector returns EQUATORIAL J2000, which is inclined 23.4 degrees to the
 * ecliptic — piping it through Ecliptic() is what keeps the system flat.
 */
export function heliocentric(
  planet: PlanetName,
  displayRadius: number,
  date: Date,
  out: THREE.Vector3,
): THREE.Vector3 {
  const ec = Ecliptic(HelioVector(BODIES[planet], date)).vec;
  const scale = displayRadius / MEAN_AU[planet];
  // Ecliptic frame: +x vernal equinox, +z ecliptic north. three.js has +y up.
  return out.set(ec.x * scale, ec.z * scale, -ec.y * scale);
}

/** Samples one complete orbit so the ring is the real path, not a circle. */
export function orbitPath(planet: PlanetName, displayRadius: number, segments = 360): THREE.Vector3[] {
  const period = PERIOD_DAYS[planet];
  const v = new THREE.Vector3();
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < segments; i++) {
    const d = new Date(EPOCH_MS + (i / segments) * period * MS_PER_DAY);
    pts.push(heliocentric(planet, displayRadius, d, v).clone());
  }
  return pts;
}
