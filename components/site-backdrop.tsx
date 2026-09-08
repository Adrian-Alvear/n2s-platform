"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * Loads the front face's backdrop so it can never delay the page (§4.2).
 *
 * Same three rules as the hub's world: dynamic import keeps three.js out of
 * the initial payload, mounting waits for idle so the canvas never competes
 * with LCP, and the layer sits in space the hero already reserves so its
 * arrival cannot shift layout.
 *
 * No WebGL means this renders nothing and the procedural CSS atmosphere
 * remains the backdrop — a designed fallback, not a broken canvas.
 */

const FieldCanvas = dynamic(
  () => import("./site/FieldCanvas").then((m) => m.FieldCanvas),
  { ssr: false },
);

function webglAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl")),
    );
  } catch {
    return false;
  }
}

export function SiteBackdrop() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!webglAvailable()) return;
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 2000 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 400);
    return () => window.clearTimeout(id);
  }, []);

  if (!ready) return null;

  return (
    // The field fades itself up from its own boot uniform, so this layer needs
    // no opacity animation that could strand it invisible.
    <div aria-hidden className="n2s-backdrop">
      <FieldCanvas />
    </div>
  );
}
