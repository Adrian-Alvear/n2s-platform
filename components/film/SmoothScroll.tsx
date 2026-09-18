"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { prefersReducedMotion } from "@/lib/motion";
import { film, measureChapter } from "./film";

/**
 * Smooth scrolling (Lenis) plus the film's scroll tracking.
 *
 * Under reduced motion, Lenis is not started — native scrolling, no easing —
 * but the chapter is still tracked so the page stays in sync.
 */
export function SmoothScroll() {
  useEffect(() => {
    const reduced = prefersReducedMotion();
    let lenis: Lenis | null = null;
    let raf = 0;

    const onScroll = () => measureChapter();

    if (!reduced) {
      lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: true });
      lenis.on("scroll", (l: Lenis) => {
        film.velocity = l.velocity;
        measureChapter();
      });
      const loop = (time: number) => {
        lenis?.raf(time);
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else {
      window.addEventListener("scroll", onScroll, { passive: true });
    }

    measureChapter();
    window.addEventListener("resize", onScroll);
    // Fonts and late images shift section positions after first paint.
    const ro = new ResizeObserver(onScroll);
    ro.observe(document.body);

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __n2sFilm: unknown }).__n2sFilm = { film, lenis };
    }

    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      ro.disconnect();
    };
  }, []);

  return null;
}
