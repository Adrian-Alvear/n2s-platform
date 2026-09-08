import Link from "next/link";
import { AUDIENCE, SERVICES, SITE } from "@/lib/site";
import { labPieces } from "@/lib/content";

/**
 * Server component, no client JavaScript. Content paints first, always —
 * the 3D world layers on top of this in Phase 2 (§4.2).
 */
export default function Home() {
  const lab = labPieces();

  return (
    <main className="mx-auto max-w-5xl px-6">
      {/* Hero — the positioning sentence, verbatim. No AI in it (§2.1). */}
      <section className="py-20 sm:py-32">
        <div className="n2s-reveal-mask max-w-3xl">
          <h1 className="font-display text-5xl leading-[1.05] text-balance sm:text-7xl">
            {SITE.positioning}
          </h1>
        </div>
        <div aria-hidden className="n2s-draw mt-12 h-px w-24 bg-accent" />
      </section>

      {/* What we do */}
      <section className="py-16">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          What we do
        </h2>
        <dl className="mt-10 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {SERVICES.map((service) => (
            <div key={service.title}>
              <dt className="font-display text-2xl">{service.title}</dt>
              <dd className="mt-2 max-w-sm text-sm leading-relaxed text-muted">
                {service.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Who it's for */}
      <section className="py-16">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          Who we work with
        </h2>
        <ul className="mt-8 space-y-4">
          {AUDIENCE.map((line) => (
            <li key={line} className="flex gap-4 text-lg">
              <span aria-hidden className="mt-3 h-px w-6 shrink-0 bg-accent" />
              <span className="text-balance">{line}</span>
            </li>
          ))}
        </ul>
      </section>

      {/*
        Selected work. Renders ONLY when there is work to show — a section
        that announces its own emptiness is §2.3 failure mode #1.
      */}
      {lab.length > 0 && (
        <section className="py-16">
          <div className="flex items-baseline justify-between">
            <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
              Selected work
            </h2>
            <Link
              href="/lab"
              className="font-mono text-xs text-muted transition-colors hover:text-foreground"
            >
              All work →
            </Link>
          </div>
          <ul className="mt-10 space-y-10">
            {lab.slice(0, 3).map((piece) => (
              <li key={piece.slug}>
                <Link href={`/lab/${piece.slug}`} className="group block">
                  <h3 className="font-display text-3xl transition-colors group-hover:text-accent">
                    {piece.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-muted">{piece.summary}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Contact — one path, no form (§2.1) */}
      <section className="py-24">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          Start a conversation
        </h2>
        <a
          href={`mailto:${SITE.email}`}
          className="font-display mt-6 inline-block text-3xl break-all underline decoration-rule underline-offset-8 transition-colors hover:decoration-accent sm:text-4xl"
        >
          {SITE.email}
        </a>
      </section>
    </main>
  );
}
