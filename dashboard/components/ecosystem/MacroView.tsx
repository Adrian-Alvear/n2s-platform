"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail, Html, Stars, Line } from "@react-three/drei";
import * as THREE from "three";
import { NODES, SUNGOLD, STARLIGHT, type NodeConfig } from "./config";
import { heliocentric, orbitPath, simDate, PERIOD_DAYS, DAYS_PER_SECOND } from "./ephemeris";
import { useEcosystem, nodePositions } from "./store";
import { ICONS } from "./icons";
import { Wire } from "./Wire";

/** Shared simulated clock, read by the HUD without forcing React renders. */
export const simClock = { date: new Date() };

function OrbitingNode({ node }: { node: NodeConfig }) {
  const group = useRef<THREE.Group>(null!);
  const hovered = useEcosystem((s) => s.hovered === node.id);
  const setHovered = useEcosystem((s) => s.setHovered);
  const dive = useEcosystem((s) => s.dive);
  const Icon = ICONS[node.id];
  const tmp = useRef(new THREE.Vector3());

  // Mount already on-orbit. Trail seeds its point buffer from the target's
  // position at mount; starting at the origin and teleporting out on frame 1
  // leaves a zero-length curve, whose tangent normalises to NaN.
  const start = useMemo(
    () => heliocentric(node.planet, node.radius, simDate(0), new THREE.Vector3()),
    [node.planet, node.radius],
  );

  useFrame(({ clock }) => {
    const date = simDate(clock.getElapsedTime());
    // True heliocentric position for the simulated instant.
    heliocentric(node.planet, node.radius, date, tmp.current);
    group.current.position.copy(tmp.current);
    group.current.rotation.y += 0.0012;

    let v = nodePositions.get(node.id);
    if (!v) nodePositions.set(node.id, (v = new THREE.Vector3()));
    group.current.getWorldPosition(v);
  });

  return (
    <Trail width={hovered ? 2.2 : 1.1} length={5} color={STARLIGHT} attenuation={(w) => w * w * w}>
      <group
        ref={group}
        position={start}
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
              <span className="ml-2 text-zinc-400">
                {node.planet} · {Math.round(PERIOD_DAYS[node.planet])}d
              </span>
            </span>
          </Html>
        )}
      </group>
    </Trail>
  );
}

/** The real orbit, sampled from the ephemeris — a true ellipse at true inclination. */
function OrbitPath({ node }: { node: NodeConfig }) {
  const points = useMemo(() => orbitPath(node.planet, node.radius), [node.planet, node.radius]);
  return (
    <Line
      points={points}
      color={node.ringColor}
      transparent
      opacity={node.ringOpacity}
      lineWidth={1}
      toneMapped={false}
    />
  );
}

export function MacroView() {
  const core = useRef<THREE.Group>(null!);
  const halo = useRef<THREE.Mesh>(null!);

  useFrame(({ clock }, delta) => {
    core.current.rotation.y += delta * 0.035;
    halo.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 0.35) * 0.035);
    simClock.date = simDate(clock.getElapsedTime());
  });

  return (
    <group>
      <Stars radius={120} depth={60} count={2600} factor={3.4} saturation={0} fade speed={0.4} />

      {/* The sun. */}
      <group ref={core}>
        <Wire geometry={new THREE.IcosahedronGeometry(1.05, 1)} color={SUNGOLD} intensity={2.4} />
      </group>
      <mesh ref={halo}>
        <sphereGeometry args={[0.8, 32, 32]} />
        <meshBasicMaterial color={SUNGOLD} toneMapped={false} transparent opacity={0.2} />
      </mesh>
      <pointLight position={[0, 0, 0]} intensity={12} distance={30} color={SUNGOLD} />

      {/* No tilt wrappers: inclination and eccentricity come from the data. */}
      {NODES.map((n) => (
        <group key={n.id}>
          <OrbitPath node={n} />
          <OrbitingNode node={n} />
        </group>
      ))}
    </group>
  );
}

export { DAYS_PER_SECOND };
