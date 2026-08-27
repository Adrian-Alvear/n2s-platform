"use client";

import { Suspense, lazy, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { MacroView } from "./MacroView";
import { CameraRig, HOME } from "./CameraRig";
import { useEcosystem } from "./store";
import { DIVE_SECONDS, NODES } from "./config";

const AerospaceHangar = lazy(() => import("./worlds/AerospaceHangar"));
const FinancialHub = lazy(() => import("./worlds/FinancialHub"));
const Placeholder = lazy(() => import("./worlds/Placeholder"));

function MicroWorld() {
  const active = useEcosystem((s) => s.active);
  if (active === "aerospace") return <AerospaceHangar />;
  if (active === "financial") return <FinancialHub />;
  const label = NODES.find((n) => n.id === active)?.label ?? "Module";
  return <Placeholder label={label} />;
}

export default function EcosystemCanvas() {
  const mode = useEcosystem((s) => s.mode);
  const exit = useEcosystem((s) => s.exit);
  const inMicro = mode === "micro";

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inMicro) exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inMicro, exit]);

  return (
    <div className="fixed inset-0 bg-black">
      <Canvas
        camera={{ position: HOME.toArray(), fov: 55 }}
        dpr={[1, 2]}
        gl={{ antialias: true }}
      >
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.4} />
        <CameraRig />

        {/* Both branches share ONE canvas — the WebGL context is never destroyed. */}
        {!inMicro && <MacroView />}
        {inMicro && (
          <Suspense fallback={null}>
            <MicroWorld />
          </Suspense>
        )}

        {mode === "macro" && (
          <OrbitControls enablePan enableZoom minDistance={4} maxDistance={26} maxPolarAngle={Math.PI / 1.9} />
        )}

        <EffectComposer>
          <Bloom intensity={1.5} luminanceThreshold={0.15} luminanceSmoothing={0.9} mipmapBlur />
          <Vignette eskil={false} offset={0.25} darkness={0.85} />
        </EffectComposer>
      </Canvas>

      {/* Flash masks the scene swap. CSS-driven, so no per-frame React state. */}
      <div
        className="pointer-events-none fixed inset-0 bg-cyan-100 ease-in"
        style={{
          opacity: mode === "diving" ? 1 : 0,
          transitionProperty: "opacity",
          transitionDuration: `${mode === "diving" ? DIVE_SECONDS * 1000 : 400}ms`,
        }}
      />

      {inMicro && (
        <button
          onClick={exit}
          className="fixed left-6 top-6 z-10 rounded border border-cyan-400/40 px-3 py-1.5 text-xs uppercase tracking-widest text-cyan-300 transition-colors hover:bg-cyan-400/10"
        >
          ← Exit to ecosystem
        </button>
      )}

      {mode === "macro" && (
        <p className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 text-[10px] uppercase tracking-[0.3em] text-cyan-300/40">
          Drag to orbit · scroll to zoom · click a node to enter
        </p>
      )}
    </div>
  );
}
