"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { Wire } from "../Wire";
import { CYAN } from "../config";

/** Financial micro-world: a vault floor of budget "columns" that breathe. */
export default function FinancialHub() {
  const bars = useRef<THREE.Group>(null!);
  const column = useMemo(() => new THREE.BoxGeometry(0.8, 1, 0.8), []);
  const coin = useMemo(() => new THREE.CylinderGeometry(1.6, 1.6, 0.12, 32), []);
  const grid = useMemo(() => new THREE.PlaneGeometry(60, 60, 40, 40), []);

  // Placeholder heights — wire these to your Supabase category totals next.
  const heights = useMemo(() => [3.2, 1.4, 2.1, 4.6, 1.9, 2.8, 3.9, 1.2], []);

  useFrame(({ clock }) => {
    bars.current.children.forEach((c, i) => {
      const t = clock.getElapsedTime() * 0.8 + i * 0.4;
      c.scale.y = heights[i] * (1 + Math.sin(t) * 0.06);
      c.position.y = c.scale.y / 2;
    });
  });

  return (
    <group>
      <OrbitControls target={[0, 2, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={6} maxDistance={40} />

      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <wireframeGeometry args={[grid]} />
        <lineBasicMaterial color={CYAN} toneMapped={false} transparent opacity={0.18} />
      </lineSegments>

      <group ref={bars}>
        {heights.map((h, i) => (
          <Wire
            key={i}
            geometry={column}
            position={[(i - heights.length / 2) * 1.4 + 0.7, h / 2, 0]}
            intensity={2.2}
          />
        ))}
      </group>

      <Wire geometry={coin} position={[0, 7, -4]} rotation={[Math.PI / 2.2, 0, 0]} intensity={3.2} />

      <Html position={[0, 9.5, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }}>
        <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-300">
          Financial Hub
        </span>
      </Html>
    </group>
  );
}
