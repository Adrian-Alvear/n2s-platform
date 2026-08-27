"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { Wire } from "../Wire";
import { CYAN } from "../config";

/**
 * Aerospace micro-world: a launch complex with a rocket that periodically
 * lifts off. Code-split — this chunk only loads when the portal is entered.
 */
export default function AerospaceHangar() {
  const rocket = useRef<THREE.Group>(null!);
  const exhaust = useRef<THREE.Group>(null!);

  const body = useMemo(() => new THREE.CylinderGeometry(0.5, 0.5, 3.2, 24), []);
  const nose = useMemo(() => new THREE.ConeGeometry(0.5, 1.2, 24), []);
  const fin = useMemo(() => new THREE.BoxGeometry(0.08, 0.9, 0.7), []);
  const pad = useMemo(() => new THREE.CylinderGeometry(2.6, 2.6, 0.2, 6), []);
  const tower = useMemo(() => new THREE.BoxGeometry(0.25, 6, 0.25), []);
  const grid = useMemo(() => new THREE.PlaneGeometry(60, 60, 40, 40), []);
  const plume = useMemo(() => new THREE.ConeGeometry(0.42, 1.6, 12), []);

  useFrame(({ clock }) => {
    // 12s cycle: hold on the pad, then climb and reset.
    const cycle = (clock.getElapsedTime() % 12) / 12;
    const climb = cycle < 0.45 ? 0 : Math.pow((cycle - 0.45) / 0.55, 2) * 26;
    rocket.current.position.y = climb;
    exhaust.current.visible = climb > 0.05;
    exhaust.current.scale.y = 1 + Math.sin(clock.getElapsedTime() * 30) * 0.25;
  });

  return (
    <group>
      <OrbitControls target={[0, 2, 0]} maxPolarAngle={Math.PI / 2.05} minDistance={6} maxDistance={45} />

      {/* Ground plane as a wireframe grid — the hangar floor. */}
      <lineSegments rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]}>
        <wireframeGeometry args={[grid]} />
        <lineBasicMaterial color={CYAN} toneMapped={false} transparent opacity={0.18} />
      </lineSegments>

      <Wire geometry={pad} position={[0, 0, 0]} intensity={1.6} />
      <Wire geometry={tower} position={[-3.2, 3, 0]} intensity={1.2} />
      <Wire geometry={tower} position={[3.2, 3, 0]} intensity={1.2} />

      <group ref={rocket} position={[0, 0, 0]}>
        <Wire geometry={body} position={[0, 1.8, 0]} intensity={2.4} />
        <Wire geometry={nose} position={[0, 4, 0]} intensity={3.4} />
        {[0, 1, 2, 3].map((i) => (
          <Wire
            key={i}
            geometry={fin}
            position={[Math.cos((i / 4) * Math.PI * 2) * 0.52, 0.6, Math.sin((i / 4) * Math.PI * 2) * 0.52]}
            rotation={[0, -(i / 4) * Math.PI * 2, 0]}
            intensity={2.4}
          />
        ))}
        <group ref={exhaust} position={[0, -0.6, 0]}>
          <mesh rotation={[Math.PI, 0, 0]} geometry={plume}>
            <meshBasicMaterial color="#67e8f9" toneMapped={false} transparent opacity={0.55} />
          </mesh>
        </group>
      </group>

      <Html position={[0, 8.5, 0]} center distanceFactor={18} style={{ pointerEvents: "none" }}>
        <span className="whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.3em] text-cyan-300">
          Aerospace Hangar
        </span>
      </Html>
    </group>
  );
}
