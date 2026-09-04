"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Trail, Html, Stars, Line } from "@react-three/drei";
import * as THREE from "three";
import { NODES, SUNGOLD, STARLIGHT, BOOT_SECONDS, BOOT_STAGGER, type NodeConfig } from "./config";
import { heliocentric, orbitPath, simDate, PERIOD_DAYS, DAYS_PER_SECOND } from "./ephemeris";
import { useEcosystem, nodePositions } from "./store";
import { useRouter } from "next/navigation";
import { pathForNode } from "./routes";
import { ICONS } from "./icons";
import { Wire } from "./Wire";
import { Companion } from "./Companion";
import { warmWorld } from "./EcosystemCanvas";

/** Shared simulated clock, read by the HUD without forcing React renders. */
export const simClock = { date: new Date() };

/** Shared boot easing. Index-staggered so assembly reads outward from the sun. */
function useBoot(index: number) {
  const t = useRef(0);
  const delay = index * BOOT_STAGGER;
  useFrame((_, delta) => {
    t.current = Math.min(1, t.current + delta / (BOOT_SECONDS * 0.55));
  });
  return () => {
    const raw = (t.current * (BOOT_SECONDS * 0.55) - delay) / (BOOT_SECONDS * 0.45);
    const c = Math.min(1, Math.max(0, raw));
    return 1 - Math.pow(1 - c, 3);
  };
}

function OrbitingNode({ node, index }: { node: NodeConfig; index: number }) {
  const group = useRef<THREE.Group>(null!);
  const hovered = useEcosystem((s) => s.hovered === node.id);
  const setHovered = useEcosystem((s) => s.setHovered);
  const dive = useEcosystem((s) => s.dive);
  const router = useRouter();
  const Icon = ICONS[node.id];
  const tmp = useRef(new THREE.Vector3());

  // Mount already on-orbit. Trail seeds its point buffer from the target's
  // position at mount; starting at the origin and teleporting out on frame 1
  // leaves a zero-length curve, whose tangent normalises to NaN.
  const start = useMemo(
    () => heliocentric(node.planet, node.radius, simDate(0), new THREE.Vector3()),
    [node.planet, node.radius],
  );
  const boot = useBoot(index);

  useFrame(({ clock }) => {
    const date = simDate(clock.getElapsedTime());
    // True heliocentric position for the simulated instant.
    heliocentric(node.planet, node.radius, date, tmp.current);
    group.current.position.copy(tmp.current);
    group.current.rotation.y += 0.0012;

    // Bodies scale up onto their orbit as the system assembles.
    const b = boot();
    const target = hovered ? 1.45 : 1;
    group.current.scale.setScalar(target * b);

    let v = nodePositions.get(node.id);
    if (!v) nodePositions.set(node.id, (v = new THREE.Vector3()));
    group.current.getWorldPosition(v);
  });

  return (
    <Trail width={hovered ? 2.2 : 1.1} length={5} color={STARLIGHT} attenuation={(w) => w * w * w}>
      <group
        ref={group}
        position={start}
        scale={0}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(node.id);
          // Fetch on intent, not on click.
          warmWorld(node.id);
        }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => {
          e.stopPropagation();
          dive(node.id);
          const path = pathForNode(node.id);
          if (path) router.push(path);
        }}
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
function OrbitPath({ node, index }: { node: NodeConfig; index: number }) {
  const points = useMemo(() => orbitPath(node.planet, node.radius), [node.planet, node.radius]);
  const mat = useRef<THREE.Material & { opacity: number }>(null!);
  const boot = useBoot(index);
  // Driven straight on the material so the fade costs no React renders.
  useFrame(() => {
    if (mat.current) mat.current.opacity = node.ringOpacity * boot();
  });
  return (
    <Line
      points={points}
      color={node.ringColor}
      transparent
      opacity={0}
      lineWidth={1}
      toneMapped={false}
      ref={undefined}
    >
      <lineBasicMaterial ref={mat} attach="material" color={node.ringColor} transparent opacity={0} toneMapped={false} />
    </Line>
  );
}

export function MacroView() {
  const core = useRef<THREE.Group>(null!);
  const halo = useRef<THREE.Mesh>(null!);
  const setHovered = useEcosystem((s) => s.setHovered);
  const brief = useEcosystem((s) => s.brief);
  const coreHovered = useEcosystem((s) => s.hovered === "core");

  useFrame(({ clock }, delta) => {
    core.current.rotation.y += delta * 0.035;
    halo.current.scale.setScalar(1 + Math.sin(clock.getElapsedTime() * 0.35) * 0.035);
    simClock.date = simDate(clock.getElapsedTime());
  });

  return (
    <group>
      <Stars radius={120} depth={60} count={2600} factor={3.4} saturation={0} fade speed={0.4} />

      {/* The sun is the core module — your overview. Clicking it dives in. */}
      <group
        onPointerOver={(e) => { e.stopPropagation(); setHovered("core"); }}
        onPointerOut={() => setHovered(null)}
        onClick={(e) => { e.stopPropagation(); brief(); }}
      >
        <group ref={core}>
          <Wire
            geometry={new THREE.IcosahedronGeometry(1.05, 1)}
            color={SUNGOLD}
            intensity={coreHovered ? 3.6 : 2.4}
          />
        </group>
        <mesh ref={halo}>
          <sphereGeometry args={[0.8, 32, 32]} />
          <meshBasicMaterial color={SUNGOLD} toneMapped={false} transparent opacity={coreHovered ? 0.3 : 0.2} />
        </mesh>
        {coreHovered && (
          <Html center distanceFactor={9} position={[0, 1.7, 0]} style={{ pointerEvents: "none" }}>
            <span className="whitespace-nowrap rounded bg-black/60 px-2 py-1 text-[11px] font-light uppercase tracking-[0.25em] text-zinc-100 backdrop-blur-sm">
              Core
            </span>
          </Html>
        )}
      </group>
      <pointLight position={[0, 0, 0]} intensity={12} distance={30} color={SUNGOLD} />

      {/* No tilt wrappers: inclination and eccentricity come from the data. */}
      {/* Rides with the core rather than orbiting — it belongs to the system,
          not to any one module. */}
      <Companion />

      {NODES.map((n, i) => (
        <group key={n.id}>
          <OrbitPath node={n} index={i} />
          <OrbitingNode node={n} index={i} />
        </group>
      ))}
    </group>
  );
}

export { DAYS_PER_SECOND };
