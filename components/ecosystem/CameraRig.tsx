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
 * Once the flight lands, the rig lets go and OrbitControls takes over, so
 * the system can be dragged and zoomed. The gentle idle motion afterwards is
 * the controls' own auto-rotate, which a drag interrupts.
 *
 * Entirely frame-loop driven: zero React renders.
 */
export function CameraRig({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, controls } = useThree();
  const handedOver = useRef(false);
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

    // The mouse owns the camera from the moment the flight lands.
    if (handedOver.current) return;

    t.current += delta;
    const p = Math.min(1, t.current / BOOT_SECONDS);
    const eased = 1 - Math.pow(1 - p, 5); // easeOutQuint

    camera.position.lerpVectors(START, REST, eased);

    camera.lookAt(target.current);

    if (p >= 1) {
      const orbit = controls as unknown as
        | { target: THREE.Vector3; enabled: boolean; update: () => void }
        | null;
      if (orbit) {
        orbit.target.copy(target.current);
        orbit.enabled = true;
        orbit.update();
      }
      handedOver.current = true;
    }
  });

  return null;
}
