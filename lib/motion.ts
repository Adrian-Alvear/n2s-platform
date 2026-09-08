/**
 * The motion vocabulary (docs/BUILD-PROMPT.md §5.2).
 *
 * Five primitives, one definition each. Every surface in both faces moves the
 * same way, or the two faces stop feeling like one system.
 *
 * The keyframes live in app/globals.css; this module owns the names, the
 * timing tokens, and the staging helper.
 */

export const MOTION = {
  /** Single curve for everything. Alternates exist but are the exception. */
  ease: "cubic-bezier(0.4, 0, 0.2, 1)",
  easeExpo: "cubic-bezier(0.16, 1, 0.3, 1)",
  easeQuint: "cubic-bezier(0.22, 1, 0.36, 1)",
  duration: 650,
} as const;

/** hairlines scale from centre */
export const DRAW = "n2s-draw";
/** type rises out of a mask — apply to the WRAPPER, not the text */
export const REVEAL = "n2s-reveal-mask";
/** copy lifts a short distance */
export const RISE = "n2s-rise";
/** controls arrive with a scale resolve */
export const SETTLE = "n2s-settle";
/** full-bleed layers resolve in place — never translates */
export const FADE = "n2s-fade";

export type Primitive =
  | typeof DRAW
  | typeof REVEAL
  | typeof RISE
  | typeof SETTLE
  | typeof FADE;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Stagger delays for a sequence. All properties crossfade together within one
 * element; staging is only ever BETWEEN elements.
 */
export function stagger(index: number, step = 80): { animationDelay: string } {
  return { animationDelay: `${index * step}ms` };
}

/**
 * Play an entrance on the next frame, then clean up after itself.
 *
 * Two nested requestAnimationFrame calls are required: a single frame can
 * coalesce with the mount and the animation silently never runs.
 *
 * Returns a cancel function, so a component unmounting mid-entrance leaves no
 * pending frames behind.
 */
export function playEntrance(
  el: HTMLElement,
  primitive: Primitive,
  { onDone }: { onDone?: () => void } = {},
): () => void {
  if (prefersReducedMotion()) {
    onDone?.();
    return () => {};
  }

  let outer = 0;
  let inner = 0;
  let cleanup: (() => void) | undefined;

  outer = requestAnimationFrame(() => {
    inner = requestAnimationFrame(() => {
      el.classList.add(primitive);
      const done = () => {
        // Entrance runs once, then removes its own classes, leaving no
        // residual transforms behind.
        el.classList.remove(primitive);
        el.removeEventListener("animationend", done);
        onDone?.();
      };
      el.addEventListener("animationend", done);
      cleanup = () => el.removeEventListener("animationend", done);
    });
  });

  return () => {
    cancelAnimationFrame(outer);
    cancelAnimationFrame(inner);
    cleanup?.();
  };
}
