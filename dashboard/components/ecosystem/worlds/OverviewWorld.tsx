"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Wire } from "../Wire";
import { SILVER, SUNGOLD } from "../config";

/** Overview: a slowly turning globe ringed by tracking satellites. */
export default function OverviewWorld() {
  const globe = useRef<THREE.Group>(null!);
  const sats = useRef<THREE.Group>(null!);

  const sphere = useMemo(() => new THREE.SphereGeometry(3, 20, 14), []);
  const band = useMemo(() => new THREE.TorusGeometry(3.9, 0.012, 6, 80), []);
  const sat = useMemo(() => new THREE.OctahedronGeometry(0.11, 0), []);
  const rings = useMemo(() => [0.2, -0.5, 1.1], []);

  useFrame(({ clock }, delta) => {
    globe.current.rotation.y += delta * 0.07;
    const t = clock.getElapsedTime();
    sats.current.children.forEach((s, i) => {
      const r = 4.4 + i * 0.55;
      const w = 0.28 - i * 0.05;
      s.position.set(Math.cos(t * w + i * 2) * r, Math.sin(t * w * 0.7 + i) * 1.4, Math.sin(t * w + i * 2) * r);
    });
  });

  return (
    <group>
      <OrbitControls minDistance={7} maxDistance={34} enablePan={false} />
      <group ref={globe}>
        <Wire geometry={sphere} color="#bcd8f0" intensity={1.5} />
      </group>
      {rings.map((tilt, i) => (
        <Wire key={i} geometry={band} color={SILVER} intensity={0.8} rotation={[Math.PI / 2 + tilt, tilt * 0.6, 0]} />
      ))}
      <group ref={sats}>
        {[0, 1, 2, 3].map((i) => (
          <Wire key={i} geometry={sat} color={SUNGOLD} intensity={2.6} />
        ))}
      </group>
    </group>
  );
}
