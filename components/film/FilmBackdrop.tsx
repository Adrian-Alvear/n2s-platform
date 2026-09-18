"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { SmoothScroll } from "./SmoothScroll";

/**
 * The film layer: fixed behind the whole page, loaded after the page is
 * usable (§4.2). Text never waits for it; without WebGL the page is simply the
 * page, with the CSS atmosphere behind it.
 */
const FilmCanvas = dynamic(() => import("./FilmCanvas").then((m) => m.FilmCanvas), { ssr: false });

function webglAvailable(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function FilmBackdrop() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!webglAvailable()) return;
    const id = window.setTimeout(() => setReady(true), 250);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <SmoothScroll />
      {/* -z-10 inside a positioned, background-less wrapper: behind the text,
          above the page background. The wrapper must stay transparent. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        {ready && <FilmCanvas />}
      </div>
    </>
  );
}
