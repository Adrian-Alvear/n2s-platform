"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useEcosystem, nodePositions } from "./store";
import { DIVE_SECONDS, BRIEF_SECONDS } from "./config";

const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
// ~13deg above the ecliptic - the near-edge-on angle of an orrery plate.
export const HOME = new THREE.Vector3(0, 3.6, 16);
/** Wide vantage for the briefing — the whole system in frame, seen from above. */
export const VANTAGE = new THREE.Vector3(0, 13, 30);

/**
 * Drives the portal dive. The camera accelerates toward the node's LIVE
 * position (it is still orbiting) and overshoots past its centre, so the
 * motion reads as passing through the icon rather than stopping at it.
 */
export function CameraRig() {
  const mode = useEcosystem((s) => s.mode);
  const active = useEcosystem((s) => s.active);
  const enter = useEcosystem((s) => s.enter);
  const land = useEcosystem((s) => s.land);

  const t = useRef(0);
  const started = useRef(false);
  const from = useRef(new THREE.Vector3());
  const tmp = useRef(new THREE.Vector3());

  useFrame(({ camera }, delta) => {
    if (mode === "diving" && active) {
      if (!started.current) {
        from.current.copy(camera.position);
        started.current = true;
        t.current = 0;
      }
      t.current = Math.min(1, t.current + delta / DIVE_SECONDS);

      const target = nodePositions.get(active);
      if (!target) return;

      tmp.current.copy(target).sub(from.current).multiplyScalar(1.2).add(from.current);
      camera.position.lerpVectors(from.current, tmp.current, easeInCubic(t.current));
      camera.lookAt(target);

      if (t.current >= 1) {
        started.current = false;
        enter();
      }
      return;
    }

    if (mode === "briefing") {
      if (!started.current) { from.current.copy(camera.position); started.current = true; t.current = 0; }
      t.current = Math.min(1, t.current + delta / BRIEF_SECONDS);
      camera.position.lerpVectors(from.current, VANTAGE, easeOutCubic(t.current));
      camera.lookAt(0, 0, 0);
      if (t.current >= 1) started.current = false;
      return;
    }

    if (mode === "exiting") {
      if (!started.current) {
        from.current.copy(camera.position);
        started.current = true;
        t.current = 0;
      }
      t.current = Math.min(1, t.current + delta / DIVE_SECONDS);
      camera.position.lerpVectors(from.current, HOME, easeOutCubic(t.current));
      camera.lookAt(0, 0, 0);

      if (t.current >= 1) {
        started.current = false;
        land();
      }
    }
  });

  return null;
}
