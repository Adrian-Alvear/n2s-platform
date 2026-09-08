"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "@/lib/motion";

/**
 * Staged entrance on scroll (docs/BUILD-PROMPT.md §5.2).
 *
 * The content is rendered VISIBLE by the server. This component only hides it
 * once JavaScript has confirmed it can animate it back — so a page with no JS,
 * or a crawler, gets the complete readable page and never a blank div (§4.2).
 *
 * Runs once per element, then stops observing. Reduced motion skips the whole
 * mechanism: elements render at rest with no transition at all.
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

    el.dataset.reveal = "pending";
    el.style.transitionDelay = `${delay}ms`;

    // Two nested frames: a single frame can coalesce with the class change
    // and the transition never runs (§7).
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => {
        observer.observe(el);
      });
    });

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          el.dataset.reveal = "in";
          observer.unobserve(el);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );

    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
      observer.disconnect();
      // Leave nothing behind: an unmount mid-entrance must not strand the
      // element in its hidden state.
      delete el.dataset.reveal;
      el.style.transitionDelay = "";
    };
  }, [delay]);

  return (
    <Tag ref={ref as never} className={className}>
      {children}
    </Tag>
  );
}
