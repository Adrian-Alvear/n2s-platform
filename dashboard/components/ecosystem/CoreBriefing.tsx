"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { NODES } from "./config";
import { pathForNode } from "./routes";
import { stage, prefersReducedMotion, MASK, EASE } from "@/lib/motion";
import { useEcosystem } from "./store";

/**
 * The core briefing — the system introducing itself, composed as a cinematic
 * hero rather than a list.
 *
 * One module is featured at a time: eyebrow, huge serif name, a short accent
 * rule in that module's colour, its line, and a glossy pill to enter. The other
 * modules flank as cut-outs cropped by the screen edges; clicking one features
 * it. The live 3D system is the backdrop, which is what a video would have been
 * standing in for.
 */

const DUR = 650;
const GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.08'/%3E%3C/svg%3E\")";

function Reveal({ played, delay, reduced, children }: {
  played: boolean; delay: number; reduced: boolean; children: React.ReactNode;
}) {
  return (
    <span style={MASK}>
      <span style={{ display: "block", ...stage("reveal", played, { delay, duration: 950, ease: "expo", reduced }) }}>
        {children}
      </span>
    </span>
  );
}

/** A flanking module, cropped by the screen edge as in the reference plate. */
function Flank({ side, node, onSelect, played, reduced }: {
  side: "l" | "r";
  node: (typeof NODES)[number];
  onSelect: () => void;
  played: boolean;
  reduced: boolean;
}) {
  return (
    <button
      onClick={onSelect}
      aria-label={`Show ${node.label}`}
      className={`group absolute bottom-[14vh] z-[2] ${side === "l" ? "left-[-7vw]" : "right-[-7vw]"}`}
      style={stage("fade", played, { delay: side === "l" ? 1040 : 1100, duration: 900, ease: "expo", reduced })}
    >
      <span
        className="block h-[22vw] w-[22vw] max-h-[220px] max-w-[220px] rounded-full transition-transform duration-500 group-hover:scale-[1.045] group-active:scale-[0.99]"
        style={{
          background: `radial-gradient(circle at 34% 30%, ${node.color}, ${node.nebula} 62%, #05060a 100%)`,
          boxShadow: `inset 0 0 60px rgba(0,0,0,.55), 0 0 90px ${node.color}22`,
          transitionTimingFunction: EASE.quint,
        }}
      />
      <span
        className={`absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-heading text-[11px] uppercase tracking-[0.42em] text-white/85 md:text-[13px] ${
          side === "l" ? "left-[calc(22vw+18px)]" : "right-[calc(22vw+18px)]"
        }`}
      >
        {node.label}
      </span>
    </button>
  );
}

export function CoreBriefing({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [played, setPlayed] = useState(false);
  const [featured, setFeatured] = useState(0);
  const [swapping, setSwapping] = useState(false);
  const reduced = prefersReducedMotion();
  const publishFeatured = useEcosystem((s) => s.setFeatured);

  // Publish the framed module, and clear it on the way out so the camera
  // returns to its own resting logic.
  useEffect(() => {
    publishFeatured(NODES[featured].id);
  }, [featured, publishFeatured]);
  useEffect(() => () => publishFeatured(null), [publishFeatured]);

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

  const node = NODES[featured];
  // Slots re-fill with the next two in order, so cycling is fully reversible.
  const left = NODES[(featured + NODES.length - 1) % NODES.length];
  const right = NODES[(featured + 1) % NODES.length];

  /** Locked during the crossfade so clicks cannot collide mid-transition. */
  function feature(i: number) {
    if (swapping || i === featured) return;
    setSwapping(true);
    setFeatured(i);
    setTimeout(() => setSwapping(false), reduced ? 0 : 420);
  }

  function enter() {
    const path = pathForNode(node.id);
    if (path) router.push(path);
    else dismiss();
  }

  return (
    <div
      className="fixed inset-0 z-[75] overflow-hidden"
      style={{ opacity: leaving ? 0 : 1, transition: reduced ? undefined : `opacity ${DUR}ms ${EASE.slow}` }}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-black/35 via-black/55 to-black/80" onClick={dismiss} />

      {/* Ghost wordmark, behind everything. */}
      <div className="pointer-events-none absolute inset-x-0 flex select-none items-center justify-center" style={{ top: "12%", zIndex: 1 }}>
        <span
          className="font-heading uppercase leading-none text-white/[0.06]"
          style={{ fontSize: "clamp(90px, 26vw, 360px)", letterSpacing: "-0.03em", whiteSpace: "nowrap",
                   ...stage("fade", played, { delay: 80, duration: 1600, ease: "slow", reduced }) }}
        >
          N2S
        </span>
      </div>

      <Flank side="l" node={left} onSelect={() => feature((featured + NODES.length - 1) % NODES.length)} played={played} reduced={reduced} />
      <Flank side="r" node={right} onSelect={() => feature((featured + 1) % NODES.length)} played={played} reduced={reduced} />

      {/* Centre column. */}
      <div className="pointer-events-none relative z-[3] flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-[11px] font-medium uppercase tracking-[0.5em] text-white/75 md:text-[13px]">
          <Reveal played={played} delay={200} reduced={reduced}>Module</Reveal>
        </p>

        {/* Keyed so a swap replays the reveal rather than mutating text in place. */}
        <h1
          key={node.id}
          className="mt-3 font-heading uppercase leading-none text-white"
          style={{ fontSize: "clamp(52px, 9vw, 132px)", letterSpacing: "0.01em" }}
        >
          <Reveal played={played} delay={340} reduced={reduced}>{node.label}</Reveal>
        </h1>

        <span
          className="mt-7 block h-[5px] w-[100px] rounded-full"
          style={{ backgroundColor: node.color, transformOrigin: "center",
                   ...stage("draw", played, { delay: 780, duration: 650, ease: "expo", reduced }) }}
        />

        <p
          className="mt-6 max-w-md text-sm leading-relaxed text-white/90 md:text-base"
          style={stage("rise", played, { delay: 860, reduced })}
        >
          {node.blurb}
        </p>

        <div className="pointer-events-auto" style={stage("settle", played, { delay: 1140, duration: 700, reduced })}>
          <button
            onClick={enter}
            className="mt-9 inline-flex h-[58px] items-center justify-center rounded-full px-10 text-[13px] font-bold uppercase tracking-[0.12em] text-[#071227] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.99] md:h-[66px] md:px-12"
            style={{
              background: "linear-gradient(180deg,#ffffff 0%,#d6e8f8 4%,#d9ecfe 72%,#ffffff 100%)",
              boxShadow: "0 10px 18px -8px rgba(255,255,255,.5), 0 0 26px rgba(255,255,255,.18), inset 0 0 0 2px rgba(255,255,255,.9)",
            }}
          >
            {pathForNode(node.id) ? "Enter" : "Not built yet"}
          </button>
        </div>

        <div className="pointer-events-auto mt-8 flex gap-2" style={stage("fade", played, { delay: 1320, reduced })}>
          {NODES.map((n, i) => (
            <button
              key={n.id}
              onClick={() => feature(i)}
              aria-label={`Show ${n.label}`}
              className="h-1.5 rounded-full transition-all duration-500"
              style={{
                width: i === featured ? 22 : 6,
                backgroundColor: i === featured ? n.color : "rgba(255,255,255,.3)",
                transitionTimingFunction: EASE.quint,
              }}
            />
          ))}
        </div>
      </div>

      <button
        onClick={dismiss}
        className="absolute left-6 top-6 z-[4] rounded-full border border-white/20 px-4 py-1.5 text-[11px] font-light uppercase tracking-[0.25em] text-zinc-300 transition-colors hover:bg-white/10 hover:text-white"
        style={stage("rise", played, { delay: 1400, reduced })}
      >
        ← Warp out
      </button>

      <div className="pointer-events-none absolute inset-0 z-[5]" style={{ backgroundImage: GRAIN, backgroundSize: "200px 200px", opacity: 0.4 }} />
    </div>
  );
}
