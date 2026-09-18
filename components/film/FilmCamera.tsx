"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { film } from "./film";

/**
 * The camera's path through the film, one keyframe per section in page order.
 *
 * `look` sits left of the object on wide screens, which frames the object on
 * the right — clear of the reading column. On narrow screens everything
 * centres.
 */
const KEYS: { pos: [number, number, number]; look: [number, number, number] }[] = [
  { pos: [0, 0.6, 16], look: [-3, 0, 0] }, // hero: wide, debris to the right
  { pos: [-2, 2, 13], look: [-3, 0, 0] }, // statement: drift round
  { pos: [3, -0.6, 13], look: [-2.6, 0, 0] }, // featured: the form closing
  { pos: [0.5, 3, 12], look: [-2.8, 0.2, 0] }, // approach: from above
  { pos: [-2.5, 0.4, 11.5], look: [-2.6, 0, 0] }, // services: close, turning
  { pos: [3.5, 1.2, 11.5], look: [-3, 0, 0] }, // audience
  { pos: [0, 0, 13], look: [-3.2, 0, 0] }, // contact: settled
  { pos: [0, 0, 13], look: [-3.2, 0, 0] },
];

const INTRO_SECONDS = 2.8;

export function FilmCamera({ reducedMotion }: { reducedMotion: boolean }) {
  const { camera, size } = useThree();
  const pos = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const want = useMemo(() => new THREE.Vector3(), []);
  const wantLook = useMemo(() => new THREE.Vector3(), []);
  const pointer = useRef(new THREE.Vector2());
  const t = useRef(0);

  useEffect(() => {
    if (reducedMotion) return;
    const move = (e: PointerEvent) =>
      pointer.current.set((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reducedMotion]);

  useFrame((_, delta) => {
    t.current += Math.min(delta, 0.05);
    const c = reducedMotion ? 0 : film.chapter;
    const i = Math.max(0, Math.min(KEYS.length - 1, Math.floor(c)));
    const j = Math.min(KEYS.length - 1, i + 1);
    const f = c - Math.floor(c);
    const s = f * f * (3 - 2 * f); // smoothstep between keyframes

    want.set(...KEYS[i].pos).lerp(new THREE.Vector3(...KEYS[j].pos), s);
    wantLook.set(...KEYS[i].look).lerp(new THREE.Vector3(...KEYS[j].look), s);

    const narrow = size.width < 900;
    if (narrow) {
      wantLook.x = 0;
      want.z += 4;
    }

    // Cold open: fall in from far out along the first keyframe's line.
    if (!reducedMotion) {
      const k = Math.min(1, t.current / INTRO_SECONDS);
      const e = 1 - Math.pow(1 - k, 5);
      want.z += (1 - e) * 40;
      // A little parallax so the scene answers the cursor.
      want.x += pointer.current.x * 0.6;
      want.y -= pointer.current.y * 0.4;
    }

    // Damped follow: scroll sets the destination, the camera glides there.
    const damp = reducedMotion ? 1 : Math.min(1, delta * 2.4);
    pos.copy(camera.position).lerp(want, damp);
    look.lerp(wantLook, damp);
    camera.position.copy(pos);
    camera.lookAt(look);
  });

  return null;
}
