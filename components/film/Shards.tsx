"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { MeshTransmissionMaterial } from "@react-three/drei";
import * as THREE from "three";
import { film } from "./film";
import { markGeometry, markTargets } from "./mark";

/**
 * The film's subject: glass tiles that begin scattered through the dark and,
 * as you scroll, assemble into one faceted object — a problem becoming a
 * product.
 *
 * Every tile is a face of a geodesic solid. Scattered, they are debris; each
 * one flies to its own face and they close into a single crafted form. One
 * InstancedMesh, so the whole thing is a single draw call.
 */

/** Outer radius of the mark's ring, in world units. */
const RADIUS = 2.3;
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
const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
};

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
    depth: 0.16,
    bevelEnabled: true,
    bevelThickness: 0.05,
    bevelSize: 0.06,
    bevelSegments: 2,
  });
  g.translate(0, 0, -0.08);
  g.computeVertexNormals();
  return g;
}

const TILE_COUNT = 1100;

function buildTiles(markGeom: THREE.BufferGeometry): Tile[] {
  const targets = markTargets(markGeom, TILE_COUNT);
  const tiles: Tile[] = [];
  let s = 3;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  for (const t of targets) {
    // Debris field, skewed right (x from 0.5 to 12) so it gathers beside the
    // text column rather than over it.
    const scatter = new THREE.Vector3(
      0.5 + Math.pow(rand(), 0.9) * 11.5,
      (rand() - 0.5) * 9,
      -1 - rand() * 9,
    );
    const scatterQ = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(rand() * 6.28, rand() * 6.28, rand() * 6.28),
    );
    const spinAxis = new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).normalize();
    // Intro: everything starts far behind the resting view and falls in.
    const intro = scatter.clone().multiplyScalar(0.3).add(new THREE.Vector3(0, 0, -45 - rand() * 20));

    tiles.push({
      target: t.position,
      targetQ: t.quaternion,
      scatter,
      scatterQ,
      spinAxis,
      intro,
      scale: t.scale,
      seed: rand(),
    });
  }
  return tiles;
}

export function Shards({ reducedMotion }: { reducedMotion: boolean }) {
  const mesh = useRef<THREE.InstancedMesh>(null!);
  const group = useRef<THREE.Group>(null!);
  const mark = useMemo(() => markGeometry(RADIUS), []);
  const tiles = useMemo(() => buildTiles(mark), [mark]);
  const solid = useRef<THREE.Mesh>(null!);
  // The loose shards' material, so their finish can follow the assembly.
  const tileMat = useRef<(THREE.MeshPhysicalMaterial & { chromaticAberration: number }) | null>(null);
  const geometry = useMemo(prism, []);
  const clock = useRef(0);

  const m = useMemo(() => new THREE.Matrix4(), []);
  const p = useMemo(() => new THREE.Vector3(), []);
  const q = useMemo(() => new THREE.Quaternion(), []);
  const spin = useMemo(() => new THREE.Quaternion(), []);
  const sc = useMemo(() => new THREE.Vector3(), []);
  const assembled = useRef(reducedMotion ? 1 : 0);
  const core = useRef<THREE.Mesh>(null!);
  const coreLight = useRef<THREE.PointLight>(null!);

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
      // Smaller while scattered, full size on landing, then absorbed into
      // the solid mark as it materialises.
      let absorb = 1 - smooth(0.82, 1, a);
      if (absorb < 0.03) absorb = 0;
      sc.setScalar(tile.scale * (0.35 + 0.65 * intro) * (0.6 + 0.4 * local) * absorb);
      m.compose(p, q, sc);
      mesh.current.setMatrixAt(i, m);
    }
    mesh.current.instanceMatrix.needsUpdate = true;

    // Loose shards are quiet — frosted and dim, so the debris never competes
    // with the mark — and gain their shine as they land. The finished mark is
    // the thing that sparkles.
    if (tileMat.current) {
      const shine = smooth(0.15, 0.85, a);
      tileMat.current.roughness = 0.32 - 0.26 * shine;
      tileMat.current.envMapIntensity = 0.45 + 1.35 * shine;
      tileMat.current.clearcoat = 0.15 + 0.85 * shine;
      tileMat.current.chromaticAberration = 0.02 + 0.1 * shine;
    }
    // Once the mark has fully formed the tiles are gone; skip drawing them.
    mesh.current.visible = a < 0.985;

    // The light inside: a spark while the tiles are debris, growing into the
    // core the finished form glows with. The glass refracts it — that inner
    // light is what makes the form read as crystal rather than dark plastic.
    const grow = easeInOut(Math.min(1, a));
    const pulse = reducedMotion ? 1 : 1 + Math.sin(t * 1.3) * 0.04;
    core.current.scale.setScalar((0.1 + grow * 0.26) * pulse * intro);
    coreLight.current.intensity = (2.5 + grow * 32) * intro;

    const reveal = smooth(0.82, 1, a);
    solid.current.visible = reveal > 0.001;
    solid.current.scale.setScalar(0.94 + 0.06 * reveal);

    // The finished form turns slowly; the debris field turns with it.
    if (!reducedMotion) {
      // Debris turns slowly; the finished mark settles facing the viewer and
      // sways, so it always reads as the logo rather than going edge-on.
      const sway = Math.sin(t * 0.28) * 0.42 + Math.sin(t * 0.17) * 0.12;
      group.current.rotation.y = THREE.MathUtils.lerp(t * 0.06, sway, smooth(0.5, 1, a));
      group.current.rotation.x = Math.sin(t * 0.15) * 0.08;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={core} position={[0, 0, -0.55]}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial color={[1.6, 1.45, 1.2]} toneMapped={false} />
      </mesh>
      <pointLight ref={coreLight} position={[0, 0, -0.4]} color="#f3e6cc" distance={9} decay={1.6} />
      <mesh ref={solid} geometry={mark} visible={false}>
        <MeshTransmissionMaterial
          samples={8}
          resolution={1280}
          transmission={1}
          thickness={0.9}
          roughness={0.04}
          ior={1.5}
          chromaticAberration={0.1}
          anisotropicBlur={0.1}
          distortion={0}
          distortionScale={0.3}
          temporalDistortion={0}
          clearcoat={1}
          clearcoatRoughness={0.03}
          attenuationDistance={2}
          attenuationColor="#dbe3f0"
          color="#f2f5fa"
          envMapIntensity={1.8}
        />
      </mesh>
      <instancedMesh ref={mesh} args={[geometry, undefined, tiles.length]} frustumCulled={false}>
        {/* Real glass: refraction of the lit backdrop, a whisper of
            chromatic dispersion at the edges (the "expensive" tell), clean
            clear-coat highlights. */}
        <MeshTransmissionMaterial
          ref={tileMat as never}
          samples={4}
          resolution={512}
          transmission={1}
          thickness={0.6}
          roughness={0.06}
          ior={1.48}
          chromaticAberration={0.12}
          anisotropicBlur={0.12}
          distortion={0.08}
          distortionScale={0.35}
          temporalDistortion={0}
          clearcoat={1}
          clearcoatRoughness={0.04}
          attenuationDistance={1.6}
          attenuationColor="#d9e1ee"
          color="#eef2f8"
          envMapIntensity={1.8}
        />
      </instancedMesh>
    </group>
  );
}
