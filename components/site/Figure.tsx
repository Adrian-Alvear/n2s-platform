"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Wire } from "@/components/ecosystem/Wire";

/**
 * The standing figure.
 *
 * Built from primitives and drawn as glowing wireframe edges rather than
 * modelled: at this scale, in near-silhouette, edges read as a figure while a
 * low-poly solid reads as a bad model. It also keeps the house language —
 * EdgesGeometry, toneMapped off, caught by Bloom (§5.1).
 *
 * It is the scene's light source. The field's brightness falls off from this
 * point, so the figure and the lit ground are the same fact.
 */
export function Figure({ reducedMotion = false }: { reducedMotion?: boolean }) {
  const group = useRef<THREE.Group>(null!);

  const geo = useMemo(
    () => ({
      head: new THREE.IcosahedronGeometry(0.17, 1),
      torso: new THREE.CylinderGeometry(0.2, 0.26, 0.62, 8),
      hips: new THREE.CylinderGeometry(0.24, 0.2, 0.2, 8),
      limb: new THREE.CylinderGeometry(0.065, 0.055, 0.62, 6),
      shin: new THREE.CylinderGeometry(0.075, 0.06, 0.66, 6),
    }),
    [],
  );

  useFrame(({ clock }) => {
    if (reducedMotion) return;
    // Two unrelated periods, so the idle never lands on itself.
    const t = clock.getElapsedTime();
    group.current.position.y = Math.sin(t * 0.5) * 0.018 + Math.sin(t * 0.31) * 0.01;
    group.current.rotation.y = Math.sin(t * 0.12) * 0.09;
  });

  const C = "#eef2fa";

  return (
    <group ref={group} position={[0, 0, 0]}>
      <Wire geometry={geo.head} color={C} intensity={2.6} position={[0, 1.62, 0]} />
      <Wire geometry={geo.torso} color={C} intensity={2.0} position={[0, 1.16, 0]} />
      <Wire geometry={geo.hips} color={C} intensity={1.9} position={[0, 0.78, 0]} />

      {/* Arms, hanging with a slight outward cant. */}
      <Wire geometry={geo.limb} color={C} intensity={1.7} position={[-0.3, 1.16, 0]} rotation={[0, 0, 0.13]} />
      <Wire geometry={geo.limb} color={C} intensity={1.7} position={[0.3, 1.16, 0]} rotation={[0, 0, -0.13]} />
      <Wire geometry={geo.limb} color={C} intensity={1.6} position={[-0.35, 0.62, 0]} rotation={[0, 0, 0.06]} />
      <Wire geometry={geo.limb} color={C} intensity={1.6} position={[0.35, 0.62, 0]} rotation={[0, 0, -0.06]} />

      {/* Legs. */}
      <Wire geometry={geo.shin} color={C} intensity={1.8} position={[-0.12, 0.36, 0]} />
      <Wire geometry={geo.shin} color={C} intensity={1.8} position={[0.12, 0.36, 0]} />

      {/* The figure IS the light: the field's falloff is centred here. */}
      <pointLight position={[0, 1.1, 0]} intensity={22} distance={22} decay={1.6} color="#f2e2bd" />
      {/* Soft bloom around the body — the figure glows rather than being lit. */}
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[0.85, 20, 20]} />
        <meshBasicMaterial color="#f2e2bd" toneMapped={false} transparent opacity={0.05} />
      </mesh>
      <mesh position={[0, 1.1, 0]}>
        <sphereGeometry args={[1.9, 20, 20]} />
        <meshBasicMaterial color="#8f9ad8" toneMapped={false} transparent opacity={0.03} />
      </mesh>
    </group>
  );
}
