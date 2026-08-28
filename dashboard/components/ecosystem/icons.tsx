"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { Wire } from "./Wire";
import type { NodeId } from "./store";

/** Financial Hub — a stack of glowing wireframe coins inside a ring. */
type IconProps = { color?: string; intensity?: number };

export function FinancialIcon({ color, intensity = 1.5 }: IconProps) {
  const coin = useMemo(() => new THREE.CylinderGeometry(0.3, 0.3, 0.06, 24), []);
  const ring = useMemo(() => new THREE.TorusGeometry(0.42, 0.012, 6, 40), []);
  return (
    <group>
      {[0, 1, 2, 3].map((i) => (
        <Wire key={i} geometry={coin} color={color} intensity={intensity} position={[0, i * 0.09 - 0.14, 0]} rotation={[0, i * 0.35, 0]} />
      ))}
      <Wire geometry={ring} color={color} intensity={intensity * 1.5} rotation={[Math.PI / 2, 0, 0]} />
    </group>
  );
}

/** Portfolio Works — an isometric gallery block with project boards. */
export function PortfolioIcon({ color, intensity = 1.5 }: IconProps) {
  const shell = useMemo(() => new THREE.BoxGeometry(0.6, 0.4, 0.5), []);
  const roof = useMemo(() => new THREE.ConeGeometry(0.46, 0.22, 4), []);
  const board = useMemo(() => new THREE.PlaneGeometry(0.16, 0.12), []);
  return (
    <group>
      <Wire geometry={shell} color={color} intensity={intensity} />
      <Wire geometry={roof} color={color} intensity={intensity * 1.5} position={[0, 0.31, 0]} rotation={[0, Math.PI / 4, 0]} />
      {[-0.18, 0.02, 0.22].map((x, i) => (
        <Wire key={i} geometry={board} color={color} intensity={intensity * 1.6} position={[x, 0.02, 0.26]} />
      ))}
    </group>
  );
}

/** Learning Curve — an open book with a brain silhouette hovering above. */
export function LearningIcon({ color, intensity = 1.5 }: IconProps) {
  const page = useMemo(() => new THREE.BoxGeometry(0.34, 0.02, 0.46), []);
  const brain = useMemo(() => new THREE.IcosahedronGeometry(0.17, 1), []);
  return (
    <group>
      <Wire geometry={page} color={color} intensity={intensity} position={[-0.18, 0, 0]} rotation={[0, 0, 0.18]} />
      <Wire geometry={page} color={color} intensity={intensity} position={[0.18, 0, 0]} rotation={[0, 0, -0.18]} />
      <Wire geometry={brain} color={color} intensity={intensity * 1.7} position={[0, 0.36, 0]} />
    </group>
  );
}

/** Aerospace Hangar — a rocket on a hex launchpad. */
export function AerospaceIcon({ color, intensity = 1.5 }: IconProps) {
  const body = useMemo(() => new THREE.CylinderGeometry(0.12, 0.12, 0.55, 16), []);
  const nose = useMemo(() => new THREE.ConeGeometry(0.12, 0.22, 16), []);
  const fin = useMemo(() => new THREE.BoxGeometry(0.02, 0.16, 0.14), []);
  const pad = useMemo(() => new THREE.CylinderGeometry(0.34, 0.34, 0.03, 6), []);
  return (
    <group>
      <Wire geometry={body} color={color} intensity={intensity} position={[0, 0.12, 0]} />
      <Wire geometry={nose} color={color} intensity={intensity * 1.6} position={[0, 0.5, 0]} />
      {[0, 1, 2].map((i) => (
        <Wire
          key={i}
          geometry={fin}
          position={[Math.cos((i / 3) * Math.PI * 2) * 0.13, -0.1, Math.sin((i / 3) * Math.PI * 2) * 0.13]}
          rotation={[0, -(i / 3) * Math.PI * 2, 0]}
          color={color}
          intensity={intensity}
        />
      ))}
      <Wire geometry={pad} color={color} intensity={intensity * 0.7} position={[0, -0.22, 0]} />
    </group>
  );
}

export const ICONS: Record<NodeId, (p: IconProps) => React.JSX.Element> = {
  financial: FinancialIcon,
  portfolio: PortfolioIcon,
  learning: LearningIcon,
  aerospace: AerospaceIcon,
};
