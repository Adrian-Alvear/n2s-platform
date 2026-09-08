"use client";

import { useState } from "react";
import { Inter } from "next/font/google";
import { Menu, Play, X } from "lucide-react";
import { REF_VIDEO } from "@/lib/demos";

const inter = Inter({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-inter",
});

const LINKS = ["ABOUT", "PROCESS", "PROJECTS", "CATALOG", "D.O.T", "TALK"];

const Logo = ({ size = 28 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 256 256" fill="none" aria-hidden>
    <path
      d="M 160 88 L 194 34 L 216 0 L 256 0 L 256 40 L 221.5 93.5 L 200 128 L 256 128 L 256 256 L 96 256 L 96 168 L 64.246 220 L 40 256 L 0 256 L 0 216 L 34 162 L 56 128 L 0 128 L 0 0 L 160 0 Z"
      fill="white"
    />
  </svg>
);

/** Dev-only technique study. See lib/demos.ts. */
export default function Portfolio() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className={`${inter.variable} relative h-screen w-full overflow-hidden bg-black text-white`}
      style={{ fontFamily: "var(--font-inter), sans-serif" }}
    >
      {/* basis33 is not on Google Fonts; loaded from its own host. */}
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://db.onlinewebfonts.com/c/d08bafd725a4cfc309efb5a88e0b63a5?family=basis33"
        rel="stylesheet"
      />

      <video
        className="absolute inset-0 h-full w-full object-cover lg:scale-[1.2]"
        src={REF_VIDEO.portfolio}
        autoPlay
        muted
        loop
        playsInline
      />

      <div className="relative z-10 flex h-full flex-col px-5 sm:px-6 md:px-10 lg:px-14">
        <nav className="flex items-center justify-between py-6">
          <Logo />
          <div className="hidden items-center gap-8 text-sm tracking-wide md:flex">
            {LINKS.map((l) => (
              <a key={l} href="#" className="transition-opacity hover:opacity-70">
                {l}
              </a>
            ))}
          </div>
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setMenuOpen(true)}
            className="p-2 transition-opacity hover:opacity-70 md:hidden"
          >
            <Menu size={24} />
          </button>
        </nav>

        <div className="mt-4 grid grid-cols-2 gap-4 sm:gap-6 lg:grid-cols-4 lg:gap-8">
          <div>
            <h2 className="text-lg leading-tight tracking-wide md:text-xl">
              <span className="font-normal">ADAM</span>
              <br />
              <span className="font-pixel text-2xl md:text-3xl">ROBERTS</span>
            </h2>
            <p className="mt-3 text-[10px] text-white/50">*</p>
            <p className="font-pixel mt-1 text-xs leading-relaxed text-white/60">
              Grilled Pixels is my
              <br />
              personal brand - I came up
              <br />
              with it in 2004 based on
              <br />
              &ldquo;cooking up ideas&rdquo;
            </p>
          </div>

          <div className="text-right lg:text-left">
            <h2 className="text-lg leading-tight tracking-wide md:text-xl">
              <span className="font-normal">DESIGN &amp;</span>
              <br />
              <span className="font-pixel text-2xl md:text-3xl">ENGINEERING</span>
            </h2>
          </div>

          <div>
            <p className="font-pixel mb-3 text-base tracking-widest text-white/50 uppercase">
              What I Do
            </p>
            <p className="max-w-[220px] text-sm leading-relaxed text-white/90">
              I create the top 1% of experiences for brands and digital products
            </p>
          </div>

          <div className="text-right lg:text-left">
            <p className="font-pixel mb-3 text-base tracking-widest text-white/50 uppercase">
              Services
            </p>
            <ul className="space-y-0.5 text-sm leading-relaxed text-white/90">
              <li>Branding</li>
              <li>Creative Direction &amp; Strategy</li>
              <li>UX/UI Design</li>
              <li>Web Development (React/Nextjs)</li>
              <li>3D, WebGL / Photography</li>
              <li>Video &amp; Animation</li>
            </ul>
          </div>
        </div>

        <div className="flex-1" />

        <div className="pb-4">
          <div className="grid grid-cols-1 items-end gap-4 sm:gap-6 lg:grid-cols-2">
            <h1
              className="text-3xl font-normal tracking-wide uppercase sm:text-4xl md:text-5xl lg:text-[3.75rem] xl:text-[4.25rem]"
              style={{ lineHeight: 0.72 }}
            >
              I BRING THE
              <br />
              <span className="font-pixel inline-block align-baseline text-[1.25em] leading-none font-normal">
                UNEXPECTED
              </span>{" "}
              TO
              <br />
              BRAND &amp; DIGITAL
              <br />
              <span className="font-pixel inline-block align-baseline text-[1.25em] leading-none font-normal">
                EXPERIENCES
              </span>
            </h1>

            <div className="flex flex-col justify-end gap-4 sm:gap-6">
              <button
                type="button"
                className="flex items-center gap-3 self-start border border-white/30 bg-white/5 px-6 py-3 backdrop-blur-sm transition-colors hover:bg-white/10"
              >
                <Play size={14} fill="white" />
                <span className="text-sm tracking-wider">PLAY SHOWREEL</span>
              </button>

              <div className="flex flex-wrap items-stretch gap-2 self-start text-sm text-white/80 sm:gap-3 lg:self-end">
                {[
                  { n: "FWA", c: "x1", cls: "text-sm sm:text-base tracking-tight" },
                  { n: "W.", c: "x7", cls: "text-lg sm:text-xl" },
                  { n: "CSSDesignAwards", c: "x22", cls: "text-[10px] sm:text-xs tracking-tight" },
                ].map((a) => (
                  <div key={a.n} className="flex items-center gap-2 bg-[#0B0B0B] px-3 py-2 sm:px-4">
                    <span className={`font-bold ${a.cls}`}>{a.n}</span>
                    <span className="text-xs text-white/50">{a.c}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 pt-4 sm:mt-5 sm:grid-cols-2 sm:gap-4">
            <p className="text-xs text-white/60">
              Open to freelance, contract or full-time.{" "}
              <a href="#" className="text-red-500 transition-colors hover:text-red-400">
                Schedule a call
              </a>
            </p>
            <p className="text-xs text-white/60 sm:text-right">
              5 full cases &bull; 82 archive fragments &bull; 22 catalog items
            </p>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`fixed inset-0 z-50 flex flex-col bg-black/95 backdrop-blur-md transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          menuOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <div className="flex items-center justify-between px-6 py-6">
          <Logo />
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="p-2 transition-opacity hover:opacity-70"
          >
            <X size={24} />
          </button>
        </div>
        <nav className="flex flex-1 flex-col items-center justify-center gap-8">
          {LINKS.map((l, i) => (
            <a
              key={l}
              href="#"
              onClick={() => setMenuOpen(false)}
              className={`text-2xl tracking-widest transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                menuOpen ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
              }`}
              style={{ transitionDelay: menuOpen ? `${100 + i * 60}ms` : "0ms" }}
            >
              {l}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
