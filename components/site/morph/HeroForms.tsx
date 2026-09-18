"use client";

import { useEffect } from "react";
import { prefersReducedMotion } from "@/lib/motion";
import { SERVICES } from "@/lib/site";
import { SHAPE_COUNT, useMorph } from "./store";

/** How long each form holds before the next one, when nobody is choosing. */
const DWELL_MS = 4200;

/**
 * The four services, as the controls for the particles. Hover or focus one
 * and the cloud pours into its form; leave and the auto-cycle resumes.
 * Clicking goes to the services section, so the words do something real
 * even without the canvas.
 */
export function HeroForms() {
  const hold = useMorph((s) => s.hold);
  const release = useMorph((s) => s.release);
  const target = useMorph((s) => s.target);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    // Cloud → sphere → knot → box → icosahedron → cloud … The loose cloud
    // comes back between cycles: the problem before it has a shape.
    const order = [-1, ...Array.from({ length: SHAPE_COUNT }, (_, i) => i)];
    let step = 0;
    const id = window.setInterval(() => {
      const { held, setTarget } = useMorph.getState();
      if (held) return;
      step = (step + 1) % order.length;
      setTarget(order[step]);
    }, DWELL_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <ul className="flex flex-wrap gap-x-6 gap-y-2">
      {SERVICES.map((service, i) => (
        <li key={service.title}>
          <a
            href="#services"
            onMouseEnter={() => hold(i)}
            onMouseLeave={release}
            onFocus={() => hold(i)}
            onBlur={release}
            className={`n2s-link font-mono text-xs tracking-[0.18em] uppercase transition-colors ${
              target === i ? "text-foreground" : "text-muted hover:text-foreground"
            }`}
          >
            {service.title}
          </a>
        </li>
      ))}
    </ul>
  );
}
