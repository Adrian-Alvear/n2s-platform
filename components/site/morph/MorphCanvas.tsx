"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { ParticleMorph } from "./ParticleMorph";

/** Half the particles on small or low-core devices; the effect survives it. */
function pickCount(): number {
  const small = window.innerWidth < 900;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return small || weak ? 9000 : 18000;
}

export function MorphCanvas() {
  const [config, setConfig] = useState<{ count: number; reduced: boolean } | null>(null);

  useEffect(() => {
    setConfig({ count: pickCount(), reduced: prefersReducedMotion() });
  }, []);

  if (!config) return null;

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 40 }}
      dpr={[1, 1.5]}
      gl={{ antialias: false, powerPreference: "high-performance" }}
      style={{ background: "transparent" }}
    >
      <ParticleMorph count={config.count} reducedMotion={config.reduced} />
      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.3} luminanceSmoothing={0.25} mipmapBlur />
      </EffectComposer>
    </Canvas>
  );
}
