import * as THREE from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

/**
 * Target positions for each form, as flat Float32Arrays of length count*3.
 *
 * Points are sampled from mesh SURFACES rather than volumes: a surface reads
 * as a solid object from any angle, a filled volume reads as fog.
 *
 * Each form is one of the four services, in SERVICES order:
 *   0 Consultation   — a sphere: the whole problem, considered
 *   1 AI development — a torus knot: one continuous, intricate system
 *   2 Applications   — a box: something with edges you can hold
 *   3 Ideation       — an icosahedron: a facet cut out of nothing
 */

function sample(geometry: THREE.BufferGeometry, count: number, seed: number): Float32Array {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  // Deterministic sampling, so the forms are identical on every visit.
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const sampler = new MeshSurfaceSampler(mesh);
  // setRandomGenerator exists at runtime but is missing from @types/three.
  (sampler as unknown as { setRandomGenerator(fn: () => number): void }).setRandomGenerator(rand);
  sampler.build();
  const out = new Float32Array(count * 3);
  const p = new THREE.Vector3();
  for (let i = 0; i < count; i++) {
    sampler.sample(p);
    out.set([p.x, p.y, p.z], i * 3);
  }
  geometry.dispose();
  return out;
}

/** The loose cloud: a soft, uneven volume with no surface at all. */
function cloud(count: number): Float32Array {
  const out = new Float32Array(count * 3);
  let s = 7;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  for (let i = 0; i < count; i++) {
    // Gaussian-ish radius, so the cloud has a dense core and thin edges.
    const r = 2.1 * Math.pow((rand() + rand() + rand()) / 3, 1.4) + 0.3;
    const t = rand() * Math.PI * 2;
    const u = rand() * 2 - 1;
    const k = Math.sqrt(1 - u * u);
    out.set([r * k * Math.cos(t) * 1.2, r * u * 0.8, r * k * Math.sin(t)], i * 3);
  }
  return out;
}

export function buildShapes(count: number): Float32Array[] {
  return [
    cloud(count),
    sample(new THREE.SphereGeometry(1.7, 64, 48), count, 11),
    sample(new THREE.TorusKnotGeometry(1.25, 0.34, 220, 24, 2, 3), count, 23),
    sample(new THREE.BoxGeometry(2.5, 2.5, 2.5, 8, 8, 8), count, 37),
    sample(new THREE.IcosahedronGeometry(1.95, 0), count, 41),
  ];
}
