"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/** Nothing stays hidden longer than this, whatever else goes wrong. */
const FAILSAFE_MS = 1500;

/**
 * Staged entrance on scroll (docs/BUILD-PROMPT.md §5.2).
 *
 * The server renders content VISIBLE. Script hides it only to animate it back,
 * so no-JS visitors and crawlers get the whole page (§4.2).
 *
 * Content visibility must NEVER depend on this working. Three independent
 * paths reveal an element, so a failure of any one of them cannot leave the
 * page blank:
 *   1. already in the viewport at mount   → reveal on the next frame
 *   2. scrolled into view                 → IntersectionObserver
 *   3. anything else, including IO never firing → failsafe timer
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
}: {
  children: React.ReactNode;
  /** Stagger BETWEEN elements. Properties within one element never sequence. */
  delay?: number;
  as?: "div" | "section" | "li";
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    let done = false;
    const reveal = () => {
      if (done) return;
      done = true;
      el.dataset.reveal = "in";
    };

    el.dataset.reveal = "pending";
    el.style.transitionDelay = `${delay}ms`;

    const inView = () => {
      const r = el.getBoundingClientRect();
      return r.top < window.innerHeight && r.bottom > 0;
    };

    // Two nested frames: a single frame can coalesce with the class change and
    // the transition never runs (§7).
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        if (inView()) reveal();
        else observer.observe(el);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          reveal();
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    const failsafe = window.setTimeout(reveal, FAILSAFE_MS);

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      window.clearTimeout(failsafe);
      observer.disconnect();
      // An unmount mid-entrance must not strand the element hidden.
      if (!done) delete el.dataset.reveal;
      el.style.transitionDelay = "";
    };
  }, [delay]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
