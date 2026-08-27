"use client";

import { useMemo } from "react";
import * as THREE from "three";

/**
 * Glowing wireframe edges. Uses EdgesGeometry rather than `material.wireframe`
 * so only real silhouette edges draw — wireframe mode also draws every
 * triangulation diagonal, which reads as noise at icon scale.
 *
 * `toneMapped: false` plus a colour pushed past 1.0 is what makes the Bloom
 * pass actually catch these lines.
 */
export function Wire({
  geometry,
  color = "#22d3ee",
  intensity = 2.2,
  ...props
}: {
  geometry: THREE.BufferGeometry;
  color?: string;
  intensity?: number;
} & React.ComponentProps<"lineSegments">) {
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 18), [geometry]);
  const material = useMemo(() => {
    const m = new THREE.LineBasicMaterial({ toneMapped: false });
    m.color = new THREE.Color(color).multiplyScalar(intensity);
    return m;
  }, [color, intensity]);

  return <lineSegments geometry={edges} material={material} {...props} />;
}
