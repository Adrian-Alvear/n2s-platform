"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Line, Stars, Trail } from "@react-three/drei";
import * as THREE from "three";
import {
  BODIES,
  BOOT_SECONDS,
  BOOT_STAGGER,
  STARLIGHT,
  SUNGOLD,
  type BodyConfig,
} from "@/lib/ecosystem/config";
import { heliocentric, orbitPath, simDate } from "@/lib/ecosystem/ephemeris";
import { Wire } from "./Wire";

/**
 * Boot easing, staggered by index so the system assembles outward from the
 * sun. Driven in the frame loop — this costs zero React renders.
 */
function useBoot(index: number) {
  const t = useRef(0);
  const delay = index * BOOT_STAGGER;
  useFrame((_, delta) => {
    t.current = Math.min(1, t.current + delta / (BOOT_SECONDS * 0.55));
  });
  return () => {
    const raw = (t.current * (BOOT_SECONDS * 0.55) - delay) / (BOOT_SECONDS * 0.45);
    const c = Math.min(1, Math.max(0, raw));
    return 1 - Math.pow(1 - c, 3);
  };
}

function OrbitingBody({ body, index }: { body: BodyConfig; index: number }) {
  const group = useRef<THREE.Group>(null!);
  const tmp = useRef(new THREE.Vector3());
  const geometry = useMemo(
    () => new THREE.IcosahedronGeometry(body.size, body.detail),
    [body.size, body.detail],
  );

  // Mount already on-orbit: Trail seeds its buffer from the target's position,
  // and a zero-length curve normalises its tangent to NaN.
  const start = useMemo(
    () => heliocentric(body.planet, body.radius, simDate(0), new THREE.Vector3()),
    [body.planet, body.radius],
  );
  const boot = useBoot(index);

  useFrame(({ clock }) => {
    const date = simDate(clock.getElapsedTime());
    heliocentric(body.planet, body.radius, date, tmp.current);
    group.current.position.copy(tmp.current);
    group.current.rotation.y += 0.0012;
    group.current.scale.setScalar(boot());
  });

  return (
    <Trail width={1.1} length={5} color={STARLIGHT} attenuation={(w) => w * w * w}>
      <group ref={group} position={start} scale={0}>
        <Wire geometry={geometry} color={body.color} intensity={1.5} />
      </group>
    </Trail>
  );
}

/** The real orbit, sampled from the ephemeris — a true path, not a circle. */
function OrbitRing({ body, index }: { body: BodyConfig; index: number }) {
  const points = useMemo(
    () => orbitPath(body.planet, body.radius),
    [body.planet, body.radius],
  );
  // drei's Line builds its own LineMaterial; a <lineBasicMaterial> child is
  // silently ignored, which pins opacity and hides the ring.
  const line = useRef<React.ComponentRef<typeof Line>>(null);
  const boot = useBoot(index);
  useFrame(() => {
    if (line.current?.material) {
      line.current.material.opacity = body.ringOpacity * boot();
    }
  });
  return (
    <Line
      ref={line}
      points={points}
      color={body.ringColor}
      transparent
      opacity={0}
      lineWidth={1}
      toneMapped={false}
    />
  );
}

export function Orrery() {
  const core = useRef<THREE.Group>(null!);
  const halo = useRef<THREE.Mesh>(null!);
  const coreGeometry = useMemo(() => new THREE.IcosahedronGeometry(1.05, 1), []);

  useFrame(({ clock }, delta) => {
    core.current.rotation.y += delta * 0.035;
    halo.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 0.35) * 0.035);
  });

  return (
    <group>
      <Stars radius={120} depth={60} count={2600} factor={3.4} saturation={0} fade speed={0.4} />

      <group ref={core}>
        <Wire geometry={coreGeometry} color={SUNGOLD} intensity={2.4} />
      </group>
      <mesh ref={halo}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color={SUNGOLD} toneMapped={false} transparent opacity={0.2} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={12} distance={30} color={SUNGOLD} />

      {/* No tilt wrappers: inclination and eccentricity come from the data. */}
      {BODIES.map((b, i) => (
        <group key={b.id}>
          <OrbitRing body={b} index={i} />
          <OrbitingBody body={b} index={i} />
        </group>
      ))}
    </group>
  );
}
