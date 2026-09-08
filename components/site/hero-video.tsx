"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Full-bleed looping hero video with a seamless crossfade.
 *
 * The loop technique is the one from Adrian's reference prompt, and it is the
 * good part of it: a plain `loop` attribute snaps hard at the seam, which
 * reads as a glitch. Instead the clip fades to black over 500ms just before it
 * ends, restarts, and fades back up — so the seam lands on black and is
 * invisible.
 *
 * Driven with requestAnimationFrame rather than CSS transitions, because the
 * fade has to start at whatever opacity the element currently holds; a CSS
 * transition interrupted mid-flight jumps.
 *
 * Renders nothing when no source is configured, leaving the CSS atmosphere as
 * the backdrop — so the page is never broken by a missing asset.
 */
export function HeroVideo({
  src,
  poster,
  /** Seconds before the end at which the fade-out begins. */
  fadeLead = 0.55,
  fadeMs = 500,
}: {
  src?: string;
  poster?: string;
  fadeLead?: number;
  fadeMs?: number;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const raf = useRef(0);
  const fadingOut = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !src) return;

    // Reduced motion gets a still frame, not a loop.
    if (prefersReducedMotion()) {
      el.style.opacity = "1";
      return;
    }

    const fadeTo = (target: number, done?: () => void) => {
      cancelAnimationFrame(raf.current);
      const from = Number(el.style.opacity || "0");
      const start = performance.now();
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / fadeMs);
        el.style.opacity = String(from + (target - from) * t);
        if (t < 1) raf.current = requestAnimationFrame(step);
        else done?.();
      };
      raf.current = requestAnimationFrame(step);
    };

    const onCanPlay = () => {
      void el.play().catch(() => {
        // Autoplay refused (some power-saving modes). Show the frame anyway.
        el.style.opacity = "1";
      });
      fadingOut.current = false;
      fadeTo(1);
    };

    const onTimeUpdate = () => {
      if (fadingOut.current || !el.duration) return;
      if (el.duration - el.currentTime <= fadeLead) {
        fadingOut.current = true;
        fadeTo(0);
      }
    };

    const onEnded = () => {
      el.style.opacity = "0";
      window.setTimeout(() => {
        el.currentTime = 0;
        void el.play().catch(() => {});
        fadingOut.current = false;
        fadeTo(1);
      }, 100);
    };

    el.addEventListener("canplay", onCanPlay);
    el.addEventListener("timeupdate", onTimeUpdate);
    el.addEventListener("ended", onEnded);

    return () => {
      cancelAnimationFrame(raf.current);
      el.removeEventListener("canplay", onCanPlay);
      el.removeEventListener("timeupdate", onTimeUpdate);
      el.removeEventListener("ended", onEnded);
    };
  }, [src, fadeLead, fadeMs]);

  if (!src) return null;

  return (
    <video
      ref={ref}
      className="absolute inset-0 h-full w-full object-cover"
      style={{ opacity: 0 }}
      src={src}
      poster={poster}
      muted
      playsInline
      preload="auto"
      aria-hidden
    />
  );
}
