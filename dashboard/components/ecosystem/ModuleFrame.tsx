"use client";

import { useEffect, useState } from "react";
import { NODES } from "./config";
import { prefersReducedMotion } from "@/lib/motion";
import type { NodeId } from "./store";

const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";
const DUR = 650;

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
  // Arrival is staged so the panel resolves out of the dive rather than
  // snapping in: scrim first, then chrome, then content. Same 650ms curve as
  // the briefing, so the whole app moves in one language.
  const reduced = prefersReducedMotion();
  const [arrived, setArrived] = useState(reduced);
  useEffect(() => {
    if (reduced) return;
    const raf = requestAnimationFrame(() => setArrived(true));
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

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
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/65 to-black/80 backdrop-blur-[1.5px]"
        style={{ opacity: arrived ? 1 : 0, transition: reduced ? undefined : `opacity ${DUR}ms ${EASE}` }}
      />

      <header
        className="relative z-10 flex shrink-0 items-center gap-4 border-b border-white/10 px-5 py-3 md:px-6"
        style={{
          opacity: arrived ? 1 : 0,
          transform: arrived ? "translateY(0)" : "translateY(-10px)",
          transition: reduced ? undefined : `opacity ${DUR}ms ${EASE} 90ms, transform ${DUR}ms ${EASE} 90ms`,
        }}
      >
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

      {/* Content resolves from blurred and slightly back, matching the way the
          camera arrives — the panel reads as coming out of the dive. */}
      <div
        className="relative z-10 flex-1 overflow-y-auto overscroll-contain"
        style={{
          opacity: arrived ? 1 : 0,
          transform: arrived ? "translateY(0) scale(1)" : "translateY(18px) scale(0.985)",
          filter: reduced ? undefined : arrived ? "blur(0px)" : "blur(8px)",
          transition: reduced ? undefined : `opacity ${DUR}ms ${EASE} 170ms, transform ${DUR}ms ${EASE} 170ms, filter ${DUR}ms ${EASE} 170ms`,
          willChange: "transform, filter, opacity",
        }}
      >
        {children}
      </div>
    </div>
  );
}
