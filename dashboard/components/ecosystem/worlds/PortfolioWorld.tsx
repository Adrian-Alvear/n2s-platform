"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Wire } from "../Wire";
import { SILVER } from "../config";

/** Portfolio: a drifting gallery of frames, each turning at its own rate. */
export default function PortfolioWorld() {
  const wall = useRef<THREE.Group>(null!);
  const frame = useMemo(() => new THREE.BoxGeometry(2.1, 1.4, 0.05), []);
  const slots = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => ({
        pos: [
          Math.cos((i / 7) * Math.PI * 2) * 5.2,
          ((i % 3) - 1) * 2.1,
          Math.sin((i / 7) * Math.PI * 2) * 5.2,
        ] as [number, number, number],
        rate: 0.1 + (i % 4) * 0.05,
      })),
    [],
  );

  useFrame(({ clock }, delta) => {
    wall.current.rotation.y += delta * 0.045;
    const t = clock.getElapsedTime();
    wall.current.children.forEach((c, i) => {
      c.position.y = slots[i].pos[1] + Math.sin(t * slots[i].rate * 3 + i) * 0.22;
      c.lookAt(0, c.position.y, 0);
    });
  });

  return (
    <group>
      <OrbitControls minDistance={7} maxDistance={32} />
      <group ref={wall}>
        {slots.map((s, i) => (
          <group key={i} position={s.pos}>
            <Wire geometry={frame} color={SILVER} intensity={1.4} />
          </group>
        ))}
      </group>
    </group>
  );
}
