"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { Wire } from "../Wire";
import { SUNGOLD } from "../config";

/** Learning: a stack of pages with motes rising off it, like dust in a beam. */
export default function LearningWorld() {
  const stack = useRef<THREE.Group>(null!);
  const motes = useRef<THREE.Points>(null!);

  const page = useMemo(() => new THREE.BoxGeometry(3.4, 0.07, 2.4), []);
  const brain = useMemo(() => new THREE.IcosahedronGeometry(0.95, 1), []);

  const dust = useMemo(() => {
    const n = 220;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 12;
      arr[i * 3 + 1] = Math.random() * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);

  useFrame(({ clock }, delta) => {
    stack.current.rotation.y += delta * 0.09;
    const t = clock.getElapsedTime();
    stack.current.children.forEach((c, i) => {
      c.position.y = i * 0.24 + Math.sin(t * 0.6 + i * 0.5) * 0.06;
    });
    // Motes drift up and wrap, so the column never empties.
    const pos = motes.current.geometry.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + delta * 0.35;
      if (y > 10) y = 0;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
  });

  return (
    <group>
      <OrbitControls minDistance={7} maxDistance={32} />
      <group ref={stack}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Wire key={i} geometry={page} color="#cbbda6" intensity={1.3} rotation={[0, i * 0.14, 0]} />
        ))}
      </group>
      <Wire geometry={brain} color={SUNGOLD} intensity={2.4} position={[0, 3.1, 0]} />
      <points ref={motes} geometry={dust}>
        <pointsMaterial size={0.045} color={SUNGOLD} transparent opacity={0.5} toneMapped={false} />
      </points>
    </group>
  );
}
