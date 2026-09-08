/**
 * The front face (docs/BUILD-PROMPT.md §2.1).
 *
 * Phase 0 holding page. Server-rendered, no client JavaScript, no WebGL —
 * which is the shape the real page must keep: content paints first, always.
 */
export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-between px-6 py-16">
      <header>
        <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          N2S
        </p>
      </header>

      <div className="n2s-reveal-mask">
        <h1 className="font-display text-5xl leading-[1.05] text-balance sm:text-7xl">
          A software studio for problems that don&rsquo;t have a product yet.
        </h1>
      </div>

      <footer className="flex items-end justify-between gap-6">
        <div aria-hidden className="n2s-draw h-px flex-1 bg-rule" />
        <p className="font-mono text-xs text-muted">Phase 0</p>
      </footer>
    </main>
  );
}
