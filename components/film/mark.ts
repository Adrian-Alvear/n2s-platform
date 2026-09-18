import * as THREE from "three";
import { MeshSurfaceSampler } from "three/addons/math/MeshSurfaceSampler.js";

/**
 * The N2S mark as 3D geometry, traced from public/brand/n2s-icon.png.
 *
 * The icon is a ring broken in two places with a blade crossing it: a long
 * gap at the upper right where the blade breaks out, and a narrow one at the
 * lower left where it enters. Coordinates are normalised so the ring's outer
 * radius is 1; angles are degrees counter-clockwise from +x.
 */

const OUTER = 1;
const INNER = 0.73;
const deg = (d: number) => (d * Math.PI) / 180;

function arc(from: number, to: number): THREE.Shape {
  const s = new THREE.Shape();
  s.absarc(0, 0, OUTER, deg(from), deg(to), false);
  s.absarc(0, 0, INNER, deg(to), deg(from), true);
  s.closePath();
  return s;
}

function blade(): THREE.Shape {
  // Thick end at the lower left, tapering to a point beyond the ring at the
  // upper right; the lower edge bows outward, the upper edge is straight.
  const s = new THREE.Shape();
  s.moveTo(-0.71, -0.7);
  s.quadraticCurveTo(0.26, -0.24, 0.9, 0.8);
  s.lineTo(-0.66, -0.3);
  s.closePath();
  return s;
}

export function markShapes(): THREE.Shape[] {
  return [arc(58, 224), arc(238, 365), blade()];
}

/** The solid mark, extruded with a soft bevel, centred on the origin. */
export function markGeometry(radius: number): THREE.BufferGeometry {
  const g = new THREE.ExtrudeGeometry(markShapes(), {
    depth: 0.34,
    bevelEnabled: true,
    bevelThickness: 0.06,
    bevelSize: 0.045,
    bevelSegments: 4,
    curveSegments: 48,
  });
  g.translate(0, 0, -0.17);
  g.scale(radius, radius, radius);
  g.computeVertexNormals();
  return g;
}

export type TileTarget = { position: THREE.Vector3; quaternion: THREE.Quaternion; scale: number };

/**
 * Where each tile lands: points sampled across the mark's surface, each tile
 * lying flat against it. Seeded, so the assembly is identical every visit.
 */
export function markTargets(geometry: THREE.BufferGeometry, count: number): TileTarget[] {
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial());
  let s = 17;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
  const sampler = new MeshSurfaceSampler(mesh);
  (sampler as unknown as { setRandomGenerator(fn: () => number): void }).setRandomGenerator(rand);
  sampler.build();

  // Tile size from surface area, so the shell is covered with a little overlap.
  const pos = geometry.getAttribute("position");
  const index = geometry.getIndex();
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  let area = 0;
  const tri = (i0: number, i1: number, i2: number) => {
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    area += b.clone().sub(a).cross(c.clone().sub(a)).length() / 2;
  };
  if (index) for (let i = 0; i < index.count; i += 3) tri(index.getX(i), index.getX(i + 1), index.getX(i + 2));
  else for (let i = 0; i < pos.count; i += 3) tri(i, i + 1, i + 2);
  const size = Math.sqrt(area / count) * 0.95;

  const up = new THREE.Vector3(0, 0, 1);
  const p = new THREE.Vector3();
  const n = new THREE.Vector3();
  const out: TileTarget[] = [];
  for (let i = 0; i < count; i++) {
    sampler.sample(p, n);
    const q = new THREE.Quaternion().setFromUnitVectors(up, n.normalize());
    q.multiply(new THREE.Quaternion().setFromAxisAngle(up, rand() * Math.PI * 2));
    out.push({ position: p.clone().addScaledVector(n, 0.02), quaternion: q, scale: size });
  }
  return out;
}
