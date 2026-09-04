"use client";

import { useEffect } from "react";
import { NODES } from "./config";
import type { NodeId } from "./store";

const LABELS: Record<string, string> = {
  core: "Overview",
  ...Object.fromEntries(NODES.map((n) => [n.id, n.label])),
};

/**
 * The frame a module renders inside. This is the app's only chrome — modules
 * themselves carry none, because they are panels in a world rather than pages
 * that own the window.
 */
export function ModuleFrame({
  node,
  onExit,
  children,
}: {
  node: NodeId | "core";
  onExit: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onExit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onExit]);

  return (
    <div className="dark fixed inset-0 z-[70] flex flex-col">
      {/* Scrim, not a solid fill — the world stays faintly visible behind. */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-[2px]" />

      <header className="relative z-10 flex shrink-0 items-center gap-4 border-b border-white/10 px-5 py-3 md:px-6">
        <button
          onClick={onExit}
          className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-light uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          ← Warp out
        </button>
        <span className="truncate text-[11px] font-light uppercase tracking-[0.3em] text-zinc-400">
          {LABELS[node] ?? ""}
        </span>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto overscroll-contain">{children}</div>
    </div>
  );
}
