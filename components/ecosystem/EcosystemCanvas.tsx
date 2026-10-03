"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { OrbitControls } from "@react-three/drei";
import { useEffect, useState } from "react";
import { NEBULA_MACRO, SUNGOLD } from "@/lib/ecosystem/config";
import { prefersReducedMotion } from "@/lib/motion";
import { Nebula } from "./Nebula";
import { Orrery } from "./Orrery";
import { CameraRig } from "./CameraRig";

/**
 * The world (docs/BUILD-PROMPT.md §4).
 *
 * Bloom IS the aesthetic: emissive geometry on black plus a bloom pass. Kept
 * soft — glow, not neon.
 *
 * Rendered at a capped DPR: this is a backdrop behind type, and the difference
 * between 2x and 1.5x here is invisible while costing over half the fill rate.
 */
export function EcosystemCanvas() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  return (
    <Canvas
      camera={{ position: [0, 4.2, 18], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      // The page owns the background; the canvas paints only the world.
      style={{ background: "transparent" }}
    >
      <Nebula tint={NEBULA_MACRO} core={SUNGOLD} strength={0.5} />
      {/* Drag to orbit, scroll to zoom. Disabled until the intro flight has
          landed, then it owns the camera; auto-rotate supplies the idle drift
          and any drag interrupts it. Panning is off so the sun stays centred. */}
      <OrbitControls
        makeDefault
        enabled={false}
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={0.5}
        zoomSpeed={0.7}
        minDistance={4}
        maxDistance={70}
        autoRotate={!reduced}
        autoRotateSpeed={0.22}
      />
      <CameraRig reducedMotion={reduced} />
      <Orrery />
      <EffectComposer>
        <Bloom intensity={0.85} luminanceThreshold={0.35} luminanceSmoothing={0.2} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
