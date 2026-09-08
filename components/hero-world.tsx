"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

/**
 * The world, loaded so it can never delay the page (§4.2).
 *
 * Three rules hold the performance contract:
 *  1. `ssr: false` + dynamic import keeps three.js out of the initial payload.
 *  2. Mounting waits for idle, so the canvas never competes with LCP. The
 *     text is painted and readable before a single byte of WebGL is fetched.
 *  3. The layer is absolutely positioned in space already reserved by the
 *     hero, so its arrival cannot shift layout.
 *
 * If WebGL is unavailable the component renders nothing and the procedural
 * CSS atmosphere behind it remains the backdrop — a designed fallback, not a
 * broken canvas.
 */

const EcosystemCanvas = dynamic(
  () => import("./ecosystem/EcosystemCanvas").then((m) => m.EcosystemCanvas),
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

export function HeroWorld() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!webglAvailable()) return;

    // Wait for idle so the world loads after the page is usable. The timeout
    // guarantees it still arrives on a busy main thread.
    const w = window as typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
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
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 -z-10 opacity-0 [animation:n2s-fade_1.6s_var(--ease-expo)_forwards]"
    >
      <EcosystemCanvas />
    </div>
  );
}
