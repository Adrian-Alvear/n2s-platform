"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Loads the particle hero so it can never delay the page (§4.2): dynamic
 * import keeps three.js out of the first payload, and mounting waits for idle
 * so the canvas never competes with the headline painting. No WebGL → renders
 * nothing, and the CSS atmosphere stays the backdrop.
 */
const MorphCanvas = dynamic(() => import("./MorphCanvas").then((m) => m.MorphCanvas), {
  ssr: false,
});

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function MorphBackdrop() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!webglAvailable()) return;
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 300);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) return null;
  return (
    <div aria-hidden className="absolute inset-0">
      <MorphCanvas />
    </div>
  );
}
