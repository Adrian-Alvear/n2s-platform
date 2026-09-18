"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { film } from "./film";

/**
 * The film's subject: glass tiles that begin scattered through the dark and,
 * as you scroll, assemble into one faceted object — a problem becoming a
 * product.
 *
 * Every tile is a face of a geodesic solid. Scattered, they are debris; each
 * one flies to its own face and they close into a single crafted form. One
 * InstancedMesh, so the whole thing is a single draw call.
 */

const RADIUS = 2.3;
const DETAIL = 2; // 320 faces → 320 tiles
const INTRO_SECONDS = 2.8;

/** How assembled the form is at each chapter (sections in page order). */
const ASSEMBLY = [0, 0.12, 0.62, 1, 1, 1, 1, 1];

function lerpChapter(table: number[], chapter: number) {
  const i = Math.max(0, Math.min(table.length - 1, Math.floor(chapter)));
  const j = Math.min(table.length - 1, i + 1);
  const t = chapter - Math.floor(chapter);
  return table[i] + (table[j] - table[i]) * t;
}

const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOutQuint = (t: number) => 1 - Math.pow(1 - t, 5);

type Tile = {
  target: THREE.Vector3;
  targetQ: THREE.Quaternion;
  scatter: THREE.Vector3;
  scatterQ: THREE.Quaternion;
  spinAxis: THREE.Vector3;
  intro: THREE.Vector3;
  scale: number;
  seed: number;
};

/** A thin triangular prism whose triangle has circumradius 1, in the XY plane. */
function prism(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    if (k === 0) shape.moveTo(Math.cos(a), Math.sin(a));
    else shape.lineTo(Math.cos(a), Math.sin(a));
  }
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.14,
    bevelEnabled: true,
    bevelThickness: 0.03,
    bevelSize: 0.03,
    bevelSegments: 1,
  });
  g.translate(0, 0, -0.07);
  g.computeVertexNormals();
  return g;
}

function buildTiles(): Tile[] {
  const solid = new THREE.IcosahedronGeometry(RADIUS, DETAIL);
  const pos = solid.getAttribute("position");
  const tiles: Tile[] = [];
  const v0 = new THREE.Vector3();
  const v1 = new THREE.Vector3();
  const v2 = new THREE.Vector3();
  let s = 3;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (let f = 0; f < pos.count; f += 3) {
    v0.fromBufferAttribute(pos, f);
    v1.fromBufferAttribute(pos, f + 1);
    v2.fromBufferAttribute(pos, f + 2);
    const centre = new THREE.Vector3().add(v0).add(v1).add(v2).divideScalar(3);
    const normal = centre.clone().normalize();
    const tangent = v0.clone().sub(centre).normalize();
    const bitangent = new THREE.Vector3().crossVectors(normal, tangent);
    const basis = new THREE.Matrix4().makeBasis(tangent, bitangent, normal);
    const targetQ = new THREE.Quaternion().setFromRotationMatrix(basis);

    // Debris field: wide and shallow, weighted away from the centre so the
    // form has room to appear in the middle of it.
    // Skewed right (x from -4 to 10) so the debris gathers beside the text
    // column rather than over it.
    const scatter = new THREE.Vector3(
      0.5 + Math.pow(rand(), 0.9) * 11.5,
      (rand() - 0.5) * 9,
      -1 - rand() * 9,
    );
    const scatterQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
    );
    const spinAxis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    // Intro: everything starts far behind the camera's resting view and falls in.
    const intro = scatter.clone().multiplyScalar(0.3).add(new THREE.Vector3(0, 0, -45 - rand() * 20));

    tiles.push({
      target: centre.multiplyScalar(1.004),
      targetQ,
      scatter,
      scatterQ,
      spinAxis,
      intro,
      scale: v0.distanceTo(centre) * 0.97,
      seed: rand(),
    });
  }
  solid.dispose();
  return tiles;
}

export function Shards({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const tiles = useMemo(buildTiles, []);
  const geometry = useMemo(prism, []);
  const clock = useRef(0);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const spin = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  const assembled = useRef(reducedMotion ? 1 : 0);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    clock.current += dt;
    const t = clock.current;

    const intro = reducedMotion ? 1 : easeOutQuint(Math.min(1, t / INTRO_SECONDS));
    // Ease toward the scroll target rather than jumping to it, so a fast
    // flick still reads as motion instead of a cut.
    const want = reducedMotion ? 1 : lerpChapter(ASSEMBLY, film.chapter);
    assembled.current += (want - assembled.current) * Math.min(1, dt * 3.2);
    const a = assembled.current;

    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      // Each tile arrives at its own moment, so the form closes gradually.
      const local = easeInOut(Math.min(1, Math.max(0, (a * 1.45 - tile.seed * 0.45))));

      // Drifting debris: slow tumble, gentle bob.
      spin.setFromAxisAngle(tile.spinAxis, reducedMotion ? 0 : t * (0.12 + tile.seed * 0.25));
      q.copy(tile.scatterQ).multiply(spin);

      p.copy(tile.intro).lerp(tile.scatter, intro);
      if (!reducedMotion) p.y += Math.sin(t * 0.4 + tile.seed * 20) * 0.15;

      p.lerp(tile.target, local);
      q.slerp(tile.targetQ, local);

      // Smaller while scattered (lighter behind the text), full size once
      // the tile has found its face.
      sc.setScalar(tile.scale * (0.35 + 0.65 * intro) * (0.6 + 0.4 * local));
      m.compose(p, q, sc);
      mesh.current.setMatrixAt(i, m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    // The finished form turns slowly; the debris field turns with it.
    if (!reducedMotion) {
      group.current.rotation.y += dt * (0.06 + a * 0.1);
      group.current.rotation.x = Math.sin(t * 0.15) * 0.08;
    }
  });

  return (
    <group ref={group}>
      <instancedMesh ref={mesh} args={[geometry, undefined, tiles.length]} frustumCulled={false}>
        {/* Polished dark glass: the look comes from sharp reflections of the
            light strips in the environment, not from colour. */}
        <meshPhysicalMaterial
          color="#8e97a6"
          metalness={0.7}
          roughness={0.14}
          clearcoat={1}
          clearcoatRoughness={0.06}
          envMapIntensity={1.7}
          flatShading
        />
      </instancedMesh>
    </group>
  );
}
