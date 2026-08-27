"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { Wire } from "../Wire";
import { CYAN } from "../config";

/** Stand-in world for modules whose interior is not designed yet. */
export default function Placeholder({ label }: { label: string }) {
  const shell = useRef<THREE.Group>(null!);
  const geo = useMemo(() => new THREE.IcosahedronGeometry(3.2, 1), []);
  const grid = useMemo(() => new THREE.PlaneGeometry(60, 60, 40, 40), []);

  useFrame((_, delta) => {
    shell.current.rotation.y += delta * 0.25;
    shell.current.rotation.x += delta * 0.08;
  });

  return (
    <group>
      <OrbitControls minDistance={6} maxDistance={40} />
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, -4, 0]}>
        <wireframeGeometry args={[grid]} />
        <lineBasicMaterial color={CYAN} toneMapped={false} transparent opacity={0.15} />
      </lineSegments>
      <group ref={shell}>
        <Wire geometry={geo} intensity={2.6} />
      </group>
      <Html position={[0, 5, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }}>
        <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-300">
          {label} · interior not built yet
        </span>
      </Html>
    </group>
  );
}
