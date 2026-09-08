"use client";

import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { BOOT_SECONDS } from "@/lib/ecosystem/config";

/**
 * Cold start: the camera begins far outside the system and falls inward over
 * BOOT_SECONDS on easeOutQuint — most of the distance is covered early, so it
 * reads as arriving and settling rather than gliding along a rail.
 *
 * Afterwards it drifts on two sine waves at unrelated periods, so the loop
 * never lands on itself and the scene never looks frozen.
 *
 * Entirely frame-loop driven: zero React renders.
 */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera } = useThree();
  const t = useRef(0);
  const target = useRef(new THREE.Vector3(0, 0, 0));

  // ~13 degrees above the ecliptic: the wide flat ellipse the orbits appear to
  // trace is this perspective, not squashed geometry.
  const REST = new THREE.Vector3(0, 4.2, 18);
  const START = new THREE.Vector3(0, 14, 68);

  useFrame((_, delta) => {
    if (reducedMotion) {
      camera.position.copy(REST);
      camera.lookAt(target.current);
      return;
    }

    t.current += delta;
    const p = Math.min(1, t.current / BOOT_SECONDS);
    const eased = 1 - Math.pow(1 - p, 5); // easeOutQuint

    camera.position.lerpVectors(START, REST, eased);

    // Idle drift begins only once the flight has landed.
    if (p >= 1) {
      const s = t.current - BOOT_SECONDS;
      camera.position.x += Math.sin(s * 0.11) * 1.6;
      camera.position.y += Math.sin(s * 0.07) * 0.5;
    }

    camera.lookAt(target.current);
  });

  return null;
}
