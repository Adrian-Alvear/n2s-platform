"use client";

import { Suspense, lazy, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { MacroView } from "./MacroView";
import { CameraRig, HOME } from "./CameraRig";
import { ModuleOverlay, hasModule } from "./ModuleOverlay";
import { useEcosystem } from "./store";
import { DIVE_SECONDS, NODES, VOID } from "./config";

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
  const active = useEcosystem((s) => s.active);
  const exit = useEcosystem((s) => s.exit);
  const inMicro = mode === "micro";
  // A node backed by a real 2D module opens that UI over its 3D world.
  const showingModule = inMicro && hasModule(active);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inMicro) exit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inMicro, exit]);

  return (
    // z-60 sits above the root layout's sidebar (z-50) so the void is unbroken.
    <div className="fixed inset-0 z-[60]" style={{ background: VOID }}>
      <Canvas camera={{ position: HOME.toArray(), fov: 55 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[VOID]} />
        <ambientLight intensity={0.25} />
        <CameraRig />

        {/* One Canvas for the whole app — the WebGL context is never destroyed. */}
        {!inMicro && <MacroView />}
        {inMicro && (
          <Suspense fallback={null}>
            <MicroWorld />
          </Suspense>
        )}

        {mode === "macro" && (
          <OrbitControls enablePan enableZoom minDistance={5} maxDistance={34} maxPolarAngle={Math.PI / 1.9} />
        )}

        <EffectComposer>
          <Bloom intensity={0.85} luminanceThreshold={0.35} luminanceSmoothing={0.85} mipmapBlur />
          <Vignette eskil={false} offset={0.3} darkness={0.75} />
        </EffectComposer>
      </Canvas>

      {/* Flash masks the scene swap. CSS-driven, so no per-frame React state. */}
      <div
        className="pointer-events-none fixed inset-0 bg-[#f5ead2] ease-in"
        style={{
          opacity: mode === "diving" ? 1 : 0,
          transitionProperty: "opacity",
          transitionDuration: `${mode === "diving" ? DIVE_SECONDS * 1000 : 400}ms`,
        }}
      />

      {showingModule && <ModuleOverlay />}

      {/* Worlds without a 2D module get the plain exit affordance. */}
      {inMicro && !showingModule && (
        <button
          onClick={exit}
          className="fixed left-6 top-6 z-[70] rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-light uppercase tracking-[0.25em] text-zinc-300 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
        >
          ← Warp out
        </button>
      )}

      {mode === "macro" && (
        <p className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-light uppercase tracking-[0.35em] text-zinc-400/50">
          Drag to orbit · scroll to zoom · click a node to enter
        </p>
      )}
    </div>
  );
}
