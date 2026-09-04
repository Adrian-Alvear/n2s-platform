"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { MacroView } from "./MacroView";
import { CoreBriefing } from "./CoreBriefing";
import { Nebula } from "./Nebula";
import { CameraRig, HOME } from "./CameraRig";
import { useEcosystem } from "./store";
import { useRouter } from "next/navigation";
import { pathForNode } from "./routes";
import { DIVE_SECONDS, NODES, VOID, NEBULA_MACRO, SUNGOLD } from "./config";

const loadAerospace = () => import("./worlds/AerospaceHangar");
const loadFinancial = () => import("./worlds/FinancialHub");
const loadPlaceholder = () => import("./worlds/Placeholder");
const loadOverview = () => import("./worlds/OverviewWorld");
const loadPortfolio = () => import("./worlds/PortfolioWorld");
const loadLearning = () => import("./worlds/LearningWorld");

const AerospaceHangar = lazy(loadAerospace);
const FinancialHub = lazy(loadFinancial);
const Placeholder = lazy(loadPlaceholder);
const OverviewWorld = lazy(loadOverview);
const PortfolioWorld = lazy(loadPortfolio);
const LearningWorld = lazy(loadLearning);

/**
 * Pull a world's chunk on intent rather than on click, so the dive never
 * stalls on a fetch. Idempotent — the module cache makes repeats free.
 */
export function warmWorld(node: string | null) {
  if (node === "aerospace") void loadAerospace();
  else if (node === "financial") void loadFinancial();
  else if (node === "overview") void loadOverview();
  else if (node === "portfolio") void loadPortfolio();
  else if (node === "learning") void loadLearning();
  else if (node) void loadPlaceholder();
}

function MicroWorld() {
  const active = useEcosystem((s) => s.active);
  if (active === "aerospace") return <AerospaceHangar />;
  if (active === "financial") return <FinancialHub />;
  if (active === "overview") return <OverviewWorld />;
  if (active === "portfolio") return <PortfolioWorld />;
  if (active === "learning") return <LearningWorld />;
  const label = NODES.find((n) => n.id === active)?.label ?? "Module";
  return <Placeholder label={label} />;
}

function TodayReadout() {
  const [today, setToday] = useState(() => new Date());
  useEffect(() => {
    // Refresh once a minute so the date stays correct across midnight.
    const t = setInterval(() => setToday(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  return (
    <p className="pointer-events-none fixed right-6 top-6 text-right text-[11px] font-light uppercase tracking-[0.3em] text-zinc-300/70">
      {today.toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
    </p>
  );
}

export default function EcosystemCanvas() {
  const router = useRouter();
  const routeNode = useEcosystem((s) => s.routeNode);
  const mode = useEcosystem((s) => s.mode);
  const active = useEcosystem((s) => s.active);
  const enter = useEcosystem((s) => s.enter);
  const land = useEcosystem((s) => s.land);
  const briefing = mode === "briefing";
  const inMicro = mode === "micro";

  // The URL is authoritative. Arriving on a module route (deep link, refresh,
  // browser back) puts the world into that node's micro view without a dive;
  // returning to / brings it home. The dive animation still runs when the user
  // clicks a node, because that sets mode="diving" before the route changes.
  useEffect(() => {
    if (routeNode && routeNode !== "core" && mode === "macro") enter();
    if (!routeNode && inMicro) land();
  }, [routeNode, mode, inMicro, enter, land]);

  return (
    // The world sits behind every module frame, which renders at z-70.
    <div className="fixed inset-0 z-0" style={{ background: VOID }}>
      <Canvas camera={{ position: HOME.toArray(), fov: 55 }} dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[VOID]} />
        <ambientLight intensity={0.25} />

        {/* One backdrop for the whole app. Its tint eases toward whichever node
            is open, so ambience crossfades instead of cutting. */}
        <Nebula
          tint={(inMicro && NODES.find((n) => n.id === active)?.nebula) || NEBULA_MACRO}
          core={SUNGOLD}
          strength={inMicro ? 0.75 : 0.5}
        />
        <CameraRig />

        {/* One Canvas for the whole app — the WebGL context is never destroyed. */}
        {(!inMicro || briefing) && <MacroView />}
        {inMicro && (
          <Suspense fallback={null}>
            <MicroWorld />
          </Suspense>
        )}

        {(mode === "macro" || briefing) && (
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


      {/* Nodes with no module have no frame, so they keep their own exit. */}
      {inMicro && !pathForNode(active ?? "core") && (
        <button
          onClick={() => router.push("/")}
          className="fixed left-6 top-6 z-[80] rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-light uppercase tracking-[0.25em] text-zinc-300 backdrop-blur-sm transition-colors hover:bg-white/10 hover:text-white"
        >
          ← Warp out
        </button>
      )}

      {mode === "macro" && <TodayReadout />}

      {briefing && <CoreBriefing onDismiss={land} />}

      {mode === "macro" && !briefing && (
        <p className="pointer-events-none fixed bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-light uppercase tracking-[0.35em] text-zinc-400/50">
          Drag to orbit · scroll to zoom · click a node to enter
        </p>
      )}
    </div>
  );
}
