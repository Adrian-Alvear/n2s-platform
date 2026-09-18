"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Bloom, EffectComposer } from "@react-three/postprocessing";
import { prefersReducedMotion } from "@/lib/motion";
import { Shards } from "./Shards";
import { FilmCamera } from "./FilmCamera";
import { film } from "./film";

class CatchErrors extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") console.error("[film]", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

/**
 * Development tooling: window.__n2sSnap(width) captures the next rendered
 * frame into window.__n2sLastSnap as a JPEG data URL. Captured inside the
 * render loop, after post-processing, so it is what the viewer actually sees.
 */
function DevSnapshot() {
  const { gl } = useThree();
  const pending = useRef<number | null>(null);
  useEffect(() => {
    const w = window as unknown as Record<string, unknown>;
    w.__n2sSnap = (width = 640) => {
      pending.current = width;
      return "requested";
    };
    w.__n2sFilmGL = gl;
  }, [gl]);
  useFrame(() => {
    if (pending.current === null) return;
    const width = pending.current;
    pending.current = null;
    const src = gl.domElement;
    const out = document.createElement("canvas");
    out.width = width;
    out.height = Math.round((src.height / src.width) * width);
    const ctx = out.getContext("2d")!;
    ctx.fillStyle = "#05060a";
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(src, 0, 0, out.width, out.height);
    (window as unknown as Record<string, unknown>).__n2sLastSnap = out.toDataURL("image/jpeg", 0.82);
    (window as unknown as Record<string, unknown>).__n2sSnapChapter = film.chapter;
  }, 2);
  return null;
}

export function FilmCanvas() {
  const [reduced, setReduced] = useState<boolean | null>(null);
  useEffect(() => setReduced(prefersReducedMotion()), []);
  if (reduced === null) return null;

  return (
    <CatchErrors>
      <Canvas
        camera={{ position: [0, 0.6, 55], fov: 38 }}
        dpr={[1, 1.5]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        {/* Depth fog in the void colour: far debris sinks into the dark,
            so near tiles read in front of it. */}
        <fog attach="fog" args={["#05060a", 11, 34]} />
        <ambientLight intensity={0.15} />
        <directionalLight position={[4, 6, 5]} intensity={1.2} color="#f4f6fa" />
        <directionalLight position={[-6, -2, -4]} intensity={0.6} color="#f0d9a8" />

        {/* Procedural studio lighting — no downloaded HDR. The strips are what
            the polished tiles reflect, which is where the look comes from. */}
        <Environment resolution={256} frames={1}>
          <Lightformer form="rect" intensity={3} position={[0, 5, -3]} scale={[10, 1.2, 1]} color="#f4f6fa" />
          <Lightformer form="rect" intensity={2} position={[-6, 1, 2]} rotation-y={Math.PI / 2} scale={[8, 0.6, 1]} color="#f0d9a8" />
          <Lightformer form="rect" intensity={1.5} position={[6, -1, 1]} rotation-y={-Math.PI / 2} scale={[8, 0.8, 1]} color="#b9c0cc" />
          <Lightformer form="ring" intensity={1.2} position={[0, 0, 6]} scale={3} color="#f4f6fa" />
        </Environment>

        <FilmCamera reducedMotion={reduced} />
        <Shards reducedMotion={reduced} />

        <EffectComposer>
          <Bloom intensity={0.55} luminanceThreshold={0.82} luminanceSmoothing={0.2} mipmapBlur />
        </EffectComposer>
        {process.env.NODE_ENV !== "production" && <DevSnapshot />}
      </Canvas>
    </CatchErrors>
  );
}
