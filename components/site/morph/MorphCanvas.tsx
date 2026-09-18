"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
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

/**
 * Development probe: every ~2s, reads back what actually reached the screen
 * and reports how many pixels are lit. Distinguishes "nothing drawn" from
 * "drawn but not visible". Runs after the effect composer (priority 2).
 */
function PixelProbe() {
  const { gl } = useThree();
  const n = useRef(0);
  useFrame(() => {
    n.current += 1;
    if (n.current % 120 !== 60) return;
    const c = gl.getContext();
    const w = c.drawingBufferWidth;
    const h = c.drawingBufferHeight;
    const buf = new Uint8Array(w * h * 4);
    c.readPixels(0, 0, w, h, c.RGBA, c.UNSIGNED_BYTE, buf);
    let lit = 0;
    let max = 0;
    let alpha = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const v = Math.max(buf[i], buf[i + 1], buf[i + 2]);
      if (v > max) max = v;
      if (v > 24) lit += 1;
      if (buf[i + 3] > alpha) alpha = buf[i + 3];
    }
    useDiag.getState().set({ probe: `lit ${lit} of ${w * h} · max colour ${max} · max alpha ${alpha}` });
  }, 2);
  return null;
}

export function MorphCanvas() {
  const [config, setConfig] = useState<{ count: number; reduced: boolean; noFx: boolean; big: boolean } | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const mode = q.has("nofx") ? "no effects" : q.has("big") ? "big points" : "normal";
    useDiag.getState().set({ mode });
    setConfig({ count: pickCount(), reduced: prefersReducedMotion(), noFx: q.has("nofx"), big: q.has("big") });
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
      <ParticleMorph count={config.count} reducedMotion={config.reduced} big={config.big} />
      {!config.noFx && (
        <EffectComposer>
          <Bloom intensity={0.8} luminanceThreshold={0.3} luminanceSmoothing={0.25} mipmapBlur />
        </EffectComposer>
      )}
      {process.env.NODE_ENV !== "production" && <PixelProbe />}
    </Canvas>
    </CatchErrors>
  );
}
