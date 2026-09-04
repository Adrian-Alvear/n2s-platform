"use client";

import { useEffect, useState } from "react";
import { NODES } from "./config";
import { stage, prefersReducedMotion, MASK, EASE } from "@/lib/motion";

/**
 * The core briefing — the system introducing itself.
 *
 * Motion language, applied uniformly: one 650ms cubic-bezier(0.4,0,0.2,1)
 * curve, every property (transform, filter, opacity) crossfading together
 * rather than in sequence. Depth reads through blur and scale, not just
 * position. A grain plate over everything keeps the black from looking flat.
 *
 * Content staggers in on a fixed rhythm so the eye lands on the wordmark, then
 * the line, then the manifest — never all at once.
 */

const DUR = 650;

// Tiled fractal noise. Cheap, and it stops large black fields from banding.
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")";

/** Type rising out of a mask, rather than fading in place. */
function Reveal({ played, delay, reduced, children }: {
  played: boolean; delay: number; reduced: boolean; children: React.ReactNode;
}) {
  return (
    <span style={MASK}>
      <span
        style={{
          display: "block",
          ...stage("reveal", played, { delay, duration: 950, ease: "expo", reduced }),
        }}
      >
        {children}
      </span>
    </span>
  );
}

export function CoreBriefing({ onDismiss }: { onDismiss: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const [played, setPlayed] = useState(false);
  const reduced = prefersReducedMotion();

  // Two nested frames so the from-state is committed before the to-state lands;
  // a single frame can coalesce and the transition never runs.
  useEffect(() => {
    if (reduced) { setPlayed(true); return; }
    let b = 0;
    const a = requestAnimationFrame(() => { b = requestAnimationFrame(() => setPlayed(true)); });
    return () => { cancelAnimationFrame(a); cancelAnimationFrame(b); };
  }, [reduced]);

  function dismiss() {
    if (reduced) { onDismiss(); return; }
    setLeaving(true);
    setTimeout(onDismiss, DUR * 0.7);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="fixed inset-0 z-[75] flex flex-col items-center justify-center px-6"
      style={{
        opacity: leaving ? 0 : 1,
        transition: reduced ? undefined : `opacity ${DUR}ms ${EASE.slow}`,
      }}
    >
      {/* Scrim only — the pulled-back system stays visible behind the type. */}
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[3px]" onClick={dismiss} />

      {/* Giant ghost wordmark, sitting behind the content like the reference. */}
      <div
        className="pointer-events-none absolute inset-x-0 flex select-none items-center justify-center"
        style={{ top: "16%", zIndex: 1 }}
      >
        <span style={stage("fade", played, { delay: 80, duration: 1600, ease: "slow", reduced })}>
          <span
            className="font-heading uppercase leading-none text-white/[0.07]"
            style={{ fontSize: "clamp(90px, 26vw, 360px)", letterSpacing: "-0.03em", whiteSpace: "nowrap" }}
          >
            N2S
          </span>
        </span>
      </div>

      <div className="relative z-10 w-full max-w-2xl">
        <p className="text-[11px] font-light uppercase tracking-[0.45em] text-zinc-400">
          <Reveal played={played} delay={200} reduced={reduced}>Ecosystem online</Reveal>
        </p>

        <h1 className="mt-4 font-heading text-3xl font-medium leading-tight tracking-tight text-zinc-50 md:text-5xl">
          <Reveal played={played} delay={340} reduced={reduced}>Good to see you, Adrian.</Reveal>
        </h1>

        <div style={stage("rise", played, { delay: 620, reduced })}>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-zinc-400">
            Five modules orbit the core, each on the real path of a planet. Fly into
            one to open it. Everything you see is live — positions are computed
            from the actual ephemeris for today.
          </p>
        </div>

        <div className="mt-9 space-y-px">
          {NODES.map((n, i) => (
            <div key={n.id} style={stage("rise", played, { delay: 760 + i * 90, reduced })}>
              <div className="flex items-baseline gap-4 border-t border-white/[0.07] py-3">
                <span
                  className="h-1.5 w-1.5 shrink-0 translate-y-[-2px] rounded-full"
                  style={{ backgroundColor: n.color }}
                />
                <span className="w-40 shrink-0 text-[13px] font-medium text-zinc-200">
                  {n.label}
                </span>
                <span className="min-w-0 flex-1 text-[12px] leading-relaxed text-zinc-500">
                  {n.blurb}
                </span>
                <span className="hidden shrink-0 text-[10px] uppercase tracking-[0.2em] text-zinc-600 sm:block">
                  {n.planet}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={stage("settle", played, { delay: 760 + NODES.length * 90 + 140, reduced })}>
          <button
            onClick={dismiss}
            className="group mt-10 flex items-center gap-3 text-zinc-300 transition-colors hover:text-white"
          >
            <span
              className="font-heading uppercase leading-none"
              style={{ fontSize: "clamp(20px, 3.4vw, 44px)", letterSpacing: "-0.02em" }}
            >
              Enter the system
            </span>
            <span
              className="text-2xl transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden
            >
              →
            </span>
          </button>
        </div>
      </div>

      {/* Grain plate, above everything, inert to pointers. */}
      <div
        className="pointer-events-none absolute inset-0 z-20"
        style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px", opacity: 0.4 }}
      />
    </div>
  );
}
