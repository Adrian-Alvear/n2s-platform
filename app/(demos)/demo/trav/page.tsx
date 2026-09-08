"use client";

import { useEffect, useRef, useState } from "react";
import { Inter } from "next/font/google";
import { REF_VIDEO } from "@/lib/demos";

const inter = Inter({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-inter-trav",
});

const NAV = ["Home", "Our Story", "FAQ", "Policies"];

/** Delay before the heading starts — the pin lands first. */
const HEAD_START = 0.45;
const WORD_STEP = 0.055;

/**
 * Splits every text node into per-word spans with an incrementing animation
 * delay, leaving <br> elements intact so the intended line breaks survive.
 *
 * Returns the delay the next element should start at, so the subheading can
 * begin exactly as the heading finishes rather than at a guessed time.
 */
function revealWords(el: HTMLElement, start: number, step: number): number {
  let i = 0;
  const nodes = Array.from(el.childNodes);

  for (const node of nodes) {
    if (node.nodeType !== Node.TEXT_NODE) continue; // keep <br> untouched
    const text = node.textContent ?? "";
    if (!text.trim()) continue;

    const frag = document.createDocumentFragment();
    // Split on spaces but keep them, so word spacing is unchanged.
    for (const part of text.split(/(\s+)/)) {
      if (!part) continue;
      if (/^\s+$/.test(part)) {
        frag.appendChild(document.createTextNode(part));
        continue;
      }
      const span = document.createElement("span");
      span.className = "word-wrap";
      span.textContent = part;
      span.style.animationDelay = `${(start + i * step).toFixed(3)}s`;
      i += 1;
      frag.appendChild(span);
    }
    node.parentNode?.replaceChild(frag, node);
  }

  return start + i * step;
}

export default function Trav() {
  const heading = useRef<HTMLHeadingElement>(null);
  const sub = useRef<HTMLParagraphElement>(null);
  const cta = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!heading.current || !sub.current || !cta.current) return;

    // Heading, then the subheading starting where the heading ends, then the
    // button. Each stage is derived from the previous, never hardcoded.
    const afterHeading = revealWords(heading.current, HEAD_START, WORD_STEP);
    const afterSub = revealWords(sub.current, afterHeading + 0.05, 0.028);
    cta.current.style.animationDelay = `${(afterSub + 0.12).toFixed(3)}s`;
  }, []);

  return (
    <div
      className={`${inter.variable} min-h-screen bg-black text-white`}
      style={{ fontFamily: "var(--font-inter-trav), sans-serif" }}
    >
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <video
          className="h-full w-full object-cover"
          src={REF_VIDEO.trav}
          autoPlay
          loop
          muted
          playsInline
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Header */}
      <header className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-6 py-6 md:px-16 md:py-10">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.6" aria-hidden>
              <circle cx="12" cy="12" r="9" />
              <path d="M3 12h18M12 3c2.5 2.7 2.5 15 0 18M12 3c-2.5 2.7-2.5 15 0 18" />
            </svg>
          </span>
          <span className="text-[16px] font-medium tracking-wide">Trav</span>
        </div>

        <nav className="hidden space-x-10 md:block">
          {NAV.map((l) => (
            <a key={l} href="#" className="text-[14px] font-medium text-white/95">
              {l}
            </a>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Open menu"
          onClick={() => setMenuOpen(true)}
          className="md:hidden"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" stroke="white" strokeWidth="1.6" aria-hidden>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </header>

      {/* Hero */}
      <main className="mx-auto flex h-[100dvh] max-w-4xl flex-col items-center justify-center px-6 text-center">
        <svg
          className="trav-drop mb-8"
          width="40"
          height="40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.5"
          style={{ filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.45))" }}
          aria-hidden
        >
          <path d="M12 21s7-6.2 7-11a7 7 0 1 0-14 0c0 4.8 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.6" />
        </svg>

        <h1
          ref={heading}
          className="text-[34px] leading-[1.1] font-semibold tracking-[-0.02em] sm:text-[44px] md:text-[60px]"
        >
          Begin Your Next<br className="hidden md:block" />
          Big Adventure
        </h1>

        <p
          ref={sub}
          className="mt-6 max-w-[480px] text-[16px] leading-[1.6] font-medium text-white/95 md:text-[17px]"
        >
          Discover hidden gems, plan unforgettable trips, and<br className="hidden md:block" />
          explore the world — all in one seamless app.
        </p>

        <div ref={cta} className="trav-fade mt-10">
          <a
            href="#"
            className="trav-cta inline-block rounded-full bg-white px-8 py-3.5 text-[15px] font-medium text-black"
          >
            Download Now
          </a>
        </div>
      </main>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-xl transition-opacity duration-500 ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex justify-end px-6 py-6">
          <button type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <svg width="24" height="24" viewBox="0 0 24 24" stroke="white" strokeWidth="1.6" aria-hidden>
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        <nav className="flex flex-1 flex-col items-center justify-center gap-8">
          {NAV.map((l) => (
            <a
              key={l}
              href="#"
              onClick={() => setMenuOpen(false)}
              className="text-2xl font-medium"
            >
              {l}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
