"use client";

import { useEffect, useState } from "react";
import { useDiag } from "./diag";
import { useMorph } from "./store";

/** Development only: a readable status line for the hero canvas. */
export function DevHud() {
  const [, tick] = useState(0);
  // Render nothing on the server and on the first client pass. Everything
  // below reads browser-only state, so rendering it during SSR produces
  // different text on each side and a hydration error.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const id = window.setInterval(() => tick((n) => n + 1), 500);
    return () => window.clearInterval(id);
  }, []);

  if (process.env.NODE_ENV === "production" || !mounted) return null;
  const d = useDiag.getState();
  const target = useMorph.getState().target;

  return (
    <div
      style={{ position: "fixed", left: 12, bottom: 12, zIndex: 9999 }}
      className="rounded-md bg-black/80 px-3 py-2 font-mono text-[11px] leading-5 text-white"
    >
      <div>hero3d · stage: <b>{d.stage}</b></div>
      <div>webgl: {d.webgl} · canvas: {d.canvas}</div>
      <div>particles: {d.particles} · frames: {d.frames} · form: {target}</div>
      <div>visible tab: {document.hidden ? "no" : "yes"}</div>
      {d.error && <div style={{ color: "#ff8a8a" }}>error: {d.error}</div>}
    </div>
  );
}
