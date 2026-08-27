"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail, Html } from "@react-three/drei";
import * as THREE from "three";
import { NODES, CYAN, type NodeConfig } from "./config";
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
    group.current.rotation.y += 0.004;
    // Publish the world position so CameraRig can chase a still-moving target.
    let v = nodePositions.get(node.id);
    if (!v) nodePositions.set(node.id, (v = new THREE.Vector3()));
    group.current.getWorldPosition(v);
  });

  return (
    <Trail width={hovered ? 3.5 : 1.8} length={7} color={CYAN} attenuation={(w) => w * w}>
      <group
        ref={group}
        scale={hovered ? 1.5 : 1}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(node.id); }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => { e.stopPropagation(); dive(node.id); }}
      >
        <Icon />
        {/* Labels stay in the DOM — accessible, crisp at any zoom, assertable. */}
        {hovered && (
          <Html center distanceFactor={9} style={{ pointerEvents: "none" }}>
            <span
              data-node-label={node.id}
              className="whitespace-nowrap rounded bg-black/70 px-2 py-1 text-[11px] font-medium uppercase tracking-widest text-cyan-300"
            >
              {node.label}
            </span>
          </Html>
        )}
      </group>
    </Trail>
  );
}

function OrbitRing({ radius }: { radius: number }) {
  return (
    <mesh rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[radius, 0.008, 8, 220]} />
      <meshBasicMaterial color={CYAN} toneMapped={false} transparent opacity={0.55} />
    </mesh>
  );
}

export function MacroView() {
  const core = useRef<THREE.Group>(null!);
  useFrame((_, delta) => { core.current.rotation.y += delta * 0.15; });

  return (
    <group>
      {/* ECOSYSTEM_CORE — the central anchor. */}
      <group ref={core}>
        <Wire geometry={new THREE.IcosahedronGeometry(0.9, 1)} intensity={3} />
      </group>

      {NODES.map((n) => (
        <group key={n.id} rotation={[n.tilt, 0, 0]}>
          <OrbitRing radius={n.radius} />
          {/* A faint inner companion ring gives the concentric density. */}
          <OrbitRing radius={n.radius - 0.28} />
          <OrbitingNode node={n} />
        </group>
      ))}
    </group>
  );
}
