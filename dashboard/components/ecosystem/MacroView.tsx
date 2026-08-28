"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail, Html, Stars } from "@react-three/drei";
import * as THREE from "three";
import { NODES, SUNGOLD, STARLIGHT, type NodeConfig } from "./config";
import { useEcosystem, nodePositions } from "./store";
import { ICONS } from "./icons";
import { Wire } from "./Wire";

function OrbitingNode({ node }: { node: NodeConfig }) {
  const group = useRef<THREE.Group>(null!);
  const hovered = useEcosystem((s) => s.hovered === node.id);
  const setHovered = useEcosystem((s) => s.setHovered);
  const dive = useEcosystem((s) => s.dive);
  const Icon = ICONS[node.id];

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() * node.speed + node.phase;
    group.current.position.set(Math.cos(t) * node.radius, 0, Math.sin(t) * node.radius);
    group.current.rotation.y += 0.0012;
    let v = nodePositions.get(node.id);
    if (!v) nodePositions.set(node.id, (v = new THREE.Vector3()));
    group.current.getWorldPosition(v);
  });

  return (
    // Soft, short trail — a dust wake, not a light cycle ribbon.
    <Trail width={hovered ? 2.2 : 1.1} length={5} color={STARLIGHT} attenuation={(w) => w * w * w}>
      <group
        ref={group}
        scale={hovered ? 1.45 : 1}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(node.id); }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => { e.stopPropagation(); dive(node.id); }}
      >
        <Icon color={node.color} intensity={hovered ? 2.6 : 1.5} />
        {hovered && (
          <Html center distanceFactor={9} style={{ pointerEvents: "none" }}>
            <span
              data-node-label={node.id}
              className="whitespace-nowrap rounded bg-black/60 px-2 py-1 text-[11px] font-light uppercase tracking-[0.25em] text-zinc-100 backdrop-blur-sm"
            >
              {node.label}
            </span>
          </Html>
        )}
      </group>
    </Trail>
  );
}

function OrbitRing({ radius, color, opacity }: { radius: number; color: string; opacity: number }) {
  return (
    // Truly circular. The wide flat ellipse you see is perspective from the
    // near-edge-on camera, exactly as in an orrery plate.
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.0035, 6, 320]} />
      <meshBasicMaterial color={color} toneMapped={false} transparent opacity={opacity} />
    </mesh>
  );
}

export function MacroView() {
  const core = useRef<THREE.Group>(null!);
  const halo = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }, delta) => {
    core.current.rotation.y += delta * 0.035;
    // Slow breath on the sun's halo.
    const p = 1 + Math.sin(clock.getElapsedTime() * 0.35) * 0.035;
    halo.current.scale.setScalar(p);
  });

  return (
    <group>
      {/* Depth. Instantly reads as sky rather than empty viewport. */}
      <Stars radius={120} depth={60} count={2600} factor={3.4} saturation={0} fade speed={0.4} />

      {/* ECOSYSTEM_CORE — a small sun. */}
      <group ref={core}>
        <Wire geometry={new THREE.IcosahedronGeometry(1.05, 1)} color={SUNGOLD} intensity={2.4} />
      </group>
      <mesh ref={halo}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color={SUNGOLD} toneMapped={false} transparent opacity={0.2} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={12} distance={30} color={SUNGOLD} />

      {NODES.map((n) => (
        <group key={n.id} rotation={[n.tilt, n.phase * 0.3, n.tilt * 0.4]}>
          <OrbitRing radius={n.radius} color={n.ringColor} opacity={n.ringOpacity} />
          <OrbitingNode node={n} />
        </group>
      ))}
    </group>
  );
}
