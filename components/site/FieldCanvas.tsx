"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer, Vignette } from "@react-three/postprocessing";
import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { LuminousField } from "./LuminousField";

/**
 * The front face's backdrop (§2.1). Its own visual language — never the
 * orrery, which belongs to the hub.
 *
 * One Points draw call plus two post passes. Bloom is the whole effect: bright
 * points on black, glowing rather than merely bright. The vignette is what
 * makes the field recede into the void instead of ending at the frame edge.
 */
export function FieldCanvas() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  return (
    <Canvas
      // Low and close to the ground, so the field recedes to a horizon.
      camera={{ position: [0, 1.5, 13], fov: 46 }}
      // A backdrop behind type: 2x costs double the fill rate and shows nothing.
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
      style={{ background: "transparent" }}
      onCreated={({ camera }) => camera.lookAt(0, 1.1, 0)}
    >
      {/* The single warm source the field is lit by — the thing that makes
          it read as one light in a void rather than a scattering of dots. */}
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[0.42, 24, 24]} />
        <meshBasicMaterial color="#f0d9a8" toneMapped={false} />
      </mesh>
      <mesh position={[0, 1.15, 0]}>
        <sphereGeometry args={[1.5, 24, 24]} />
        <meshBasicMaterial color="#f0d9a8" toneMapped={false} transparent opacity={0.09} />
      </mesh>
      <LuminousField reducedMotion={reduced} />
      <EffectComposer>
        <Bloom intensity={1.4} luminanceThreshold={0.15} luminanceSmoothing={0.3} mipmapBlur />
        <Vignette eskil={false} offset={0.35} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  );
}
