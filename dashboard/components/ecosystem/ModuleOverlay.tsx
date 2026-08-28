"use client";

import { lazy, Suspense } from "react";
import { useEcosystem, type NodeId } from "./store";
import { NODES } from "./config";

/**
 * Renders an existing 2D module inside the ecosystem. These are the app's real
 * client pages — same components, same Supabase data, same providers from the
 * root layout — re-hosted over the parked 3D scene rather than rebuilt.
 */
const MODULES: Partial<Record<NodeId, React.LazyExoticComponent<() => React.JSX.Element>>> = {
  financial: lazy(() => import("@/app/budget/page")),
};

export function hasModule(id: NodeId | null): boolean {
  return !!id && id in MODULES;
}

export function ModuleOverlay() {
  const active = useEcosystem((s) => s.active);
  const exit = useEcosystem((s) => s.exit);
  const Module = active ? MODULES[active] : undefined;
  if (!active || !Module) return null;

  const label = NODES.find((n) => n.id === active)?.label ?? "";

  return (
    <div className="dark fixed inset-0 z-[70] flex flex-col">
      {/* Scrim — the 3D world stays faintly visible behind the module. */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />

      <header className="relative z-10 flex shrink-0 items-center gap-4 border-b border-white/10 px-6 py-3">
        <button
          onClick={exit}
          className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-light uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          ← Warp out
        </button>
        <span className="text-[11px] font-light uppercase tracking-[0.3em] text-zinc-400">{label}</span>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto">
        <Suspense fallback={<p className="p-8 text-sm text-zinc-400">Loading module…</p>}>
          <Module />
        </Suspense>
      </div>
    </div>
  );
}
