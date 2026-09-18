"use client";

import { Canvas } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Component, useEffect, useState, type ReactNode } from "react";
import { useDiag } from "./diag";
import { prefersReducedMotion } from "@/lib/motion";
import { ParticleMorph } from "./ParticleMorph";

/** Half the particles on small or low-core devices; the effect survives it. */
function pickCount(): number {
  const small = window.innerWidth < 900;
  const weak = (navigator.hardwareConcurrency ?? 8) <= 4;
  return small || weak ? 9000 : 18000;
}

class CatchErrors extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    useDiag.getState().set({ stage: "crashed", error: String(error).slice(0, 160) });
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export function MorphCanvas() {
  const [config, setConfig] = useState<{ count: number; reduced: boolean } | null>(null);

  useEffect(() => {
    setConfig({ count: pickCount(), reduced: prefersReducedMotion() });
  }, []);

  if (!config) return null;

  return (
    <CatchErrors>
    <Canvas
      onCreated={({ gl, size }) => {
        useDiag.getState().set({
          stage: "canvas created",
          particles: config.count,
          canvas: `${Math.round(size.width)}x${Math.round(size.height)} (${gl.getContext().constructor.name})`,
        });
        gl.domElement.addEventListener("webglcontextlost", () =>
          useDiag.getState().set({ stage: "webgl context LOST" }),
        );
      }}
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
    </CatchErrors>
  );
}
