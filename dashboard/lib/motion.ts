/**
 * The app's motion vocabulary, in one place so every surface moves the same way.
 *
 * Five primitives, each with a job:
 *   DRAW    hairlines scale from the centre
 *   REVEAL  type rises out of a mask
 *   RISE    copy lifts a short distance
 *   SETTLE  controls arrive with a small scale resolve
 *   FADE    full-bleed things resolve in place — they never translate, because
 *           translating a full-bleed layer drags a bare edge into frame
 */

export const EASE = {
  expo: "cubic-bezier(0.16, 1, 0.3, 1)",
  quint: "cubic-bezier(0.22, 1, 0.36, 1)",
  slow: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;

/** Read once per call — the user can change this mid-session. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export type Primitive = "draw" | "reveal" | "rise" | "settle" | "fade";

const FROM: Record<Primitive, React.CSSProperties> = {
  draw: { transform: "scaleX(0)" },
  reveal: { transform: "translateY(115%)" },
  rise: { opacity: 0, transform: "translateY(10px)" },
  settle: { opacity: 0, transform: "translateY(8px) scale(0.965)" },
  fade: { opacity: 0 },
};

const TO: Record<Primitive, React.CSSProperties> = {
  draw: { transform: "scaleX(1)" },
  reveal: { transform: "translateY(0)" },
  rise: { opacity: 1, transform: "none" },
  settle: { opacity: 1, transform: "none" },
  fade: { opacity: 1 },
};

const PROPS: Record<Primitive, string> = {
  draw: "transform",
  reveal: "transform",
  rise: "opacity, transform",
  settle: "opacity, transform",
  fade: "opacity",
};

/**
 * Inline style for one staged element. Under reduced motion it returns the
 * resting state with no transition at all, rather than a fast animation —
 * the setting asks for no motion, not less of it.
 */
export function stage(
  primitive: Primitive,
  played: boolean,
  opts: { delay?: number; duration?: number; ease?: keyof typeof EASE; reduced?: boolean } = {},
): React.CSSProperties {
  const { delay = 0, duration = 650, ease = "quint", reduced = false } = opts;
  if (reduced) return TO[primitive];
  return {
    ...(played ? TO[primitive] : FROM[primitive]),
    transition: `${PROPS[primitive]} ${duration}ms ${EASE[ease]} ${delay}ms`,
    willChange: PROPS[primitive].replace(/, /g, ", "),
  };
}

/** Wrapper styles for a masked text reveal. */
export const MASK: React.CSSProperties = {
  display: "block",
  overflow: "hidden",
  // Ascenders and descenders sit outside the line box; without this the mask
  // clips them and the type looks cropped rather than revealed.
  paddingTop: "0.18em",
  marginTop: "-0.18em",
};
