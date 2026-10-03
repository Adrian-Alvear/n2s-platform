"use client";

import { useRouter } from "next/navigation";
import { prefersReducedMotion } from "@/lib/motion";

/** How long the screen takes to fall to the void before the next face loads. */
const FADE_MS = 520;

/**
 * Crossing between the studio and the ecosystem.
 *
 * The two faces are separate worlds with separate canvases, so a plain
 * navigation is a hard cut. This fades the screen to the void colour first,
 * then navigates; the arriving face supplies its own entrance (the film's
 * shards falling in, or the orrery's boot flight), so the pair reads as one
 * continuous move.
 *
 * Under reduced motion it is an ordinary link.
 */
export function PortalLink({
  href,
  children,
  className,
  title,
  "aria-label": ariaLabel,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  title?: string;
  "aria-label"?: string;
}) {
  const router = useRouter();

  return (
    <a
      href={href}
      className={className}
      title={title}
      aria-label={ariaLabel}
      onMouseEnter={() => router.prefetch(href)}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.button !== 0) return; // new tab etc.
        e.preventDefault();
        portalTo(router, href);
      }}
    >
      {children}
    </a>
  );
}

export function portalTo(router: ReturnType<typeof useRouter>, href: string) {
  if (prefersReducedMotion()) {
    router.push(href);
    return;
  }
  const veil = document.createElement("div");
  veil.setAttribute("aria-hidden", "true");
  veil.style.cssText = `position:fixed;inset:0;z-index:2147483647;pointer-events:none;
    background:var(--void);opacity:0;transition:opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1);`;
  document.body.appendChild(veil);
  // Two frames so the starting opacity is committed before the transition.
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      veil.style.opacity = "1";
    }),
  );
  window.setTimeout(() => {
    router.push(href);
    // The veil lives on the old document body; lift it once the new face has
    // had a moment to mount, so its own entrance plays out of black.
    window.setTimeout(() => {
      veil.style.transition = `opacity ${FADE_MS}ms cubic-bezier(0.4,0,0.2,1)`;
      veil.style.opacity = "0";
      window.setTimeout(() => veil.remove(), FADE_MS + 50);
    }, 260);
  }, FADE_MS);
}
