import Link from "next/link";
import { AUDIENCE, SERVICES, SITE } from "@/lib/site";
import { labPieces } from "@/lib/content";
import { Reveal } from "@/components/reveal";
import { GlassLink } from "@/components/glass-link";
import { HeroWorld } from "@/components/hero-world";

/**
 * Server component. Content is server-rendered and readable with no
 * JavaScript; motion is layered on top of a page that already works (§4.2).
 */
export default function Home() {
  const lab = labPieces();

  return (
    <main className="mx-auto max-w-5xl px-6">
      {/*
        Hero. Entrance is staged on load, not on scroll — it is already in
        view. Stagger is BETWEEN elements; within each, everything crossfades
        together (§5.2).
      */}
      <section className="relative flex min-h-[82vh] flex-col justify-center py-20">
        {/* The world. Loads after the text is painted and readable (§4.2). */}
        <HeroWorld />

        <div className="n2s-reveal-mask max-w-3xl">
          <h1 className="font-display text-5xl leading-[1.02] tracking-[-0.02em] text-balance sm:text-7xl">
            {SITE.positioning}
          </h1>
        </div>

        <p
          className="n2s-rise mt-8 max-w-xl text-base leading-relaxed text-muted"
          style={{ animationDelay: "160ms" }}
        >
          Development-led, end to end. We take the problem from the first
          conversation to the thing that runs.
        </p>

        <div
          className="n2s-settle mt-12 flex flex-wrap items-center gap-4"
          style={{ animationDelay: "320ms" }}
        >
          <GlassLink href={`mailto:${SITE.email}`} external>
            Start a conversation
          </GlassLink>
          <Link
            href="/studio"
            className="font-mono px-2 text-xs tracking-widest text-muted uppercase transition-colors hover:text-foreground"
          >
            How we work →
          </Link>
        </div>

        <div
          aria-hidden
          className="n2s-draw mt-20 h-px w-full bg-rule"
          style={{ animationDelay: "480ms" }}
        />
      </section>

      {/* What we do */}
      <Reveal as="section" className="py-20">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          What we do
        </h2>
        <dl className="mt-12 grid gap-x-12 gap-y-12 sm:grid-cols-2">
          {SERVICES.map((service, i) => (
            <Reveal key={service.title} delay={i * 90}>
              <dt className="font-display text-3xl">{service.title}</dt>
              <dd className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
                {service.body}
              </dd>
            </Reveal>
          ))}
        </dl>
      </Reveal>

      {/* Who we work with */}
      <Reveal as="section" className="py-20">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          Who we work with
        </h2>
        <ul className="mt-10 space-y-6">
          {AUDIENCE.map((line, i) => (
            <Reveal as="li" key={line} delay={i * 90} className="flex gap-5">
              <span aria-hidden className="mt-3.5 h-px w-8 shrink-0 bg-accent" />
              <span className="text-lg text-balance">{line}</span>
            </Reveal>
          ))}
        </ul>
      </Reveal>

      {/*
        Selected work renders ONLY when there is work to show. A section that
        announces its own absence is §2.3 failure mode #1.
      */}
      {lab.length > 0 && (
        <Reveal as="section" className="py-20">
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
          <ul className="mt-12 space-y-12">
            {lab.slice(0, 3).map((piece, i) => (
              <Reveal as="li" key={piece.slug} delay={i * 90}>
                <Link href={`/lab/${piece.slug}`} className="group block">
                  <h3 className="font-display text-3xl transition-colors group-hover:text-accent">
                    {piece.title}
                  </h3>
                  <p className="mt-2 max-w-xl text-sm text-muted">
                    {piece.summary}
                  </p>
                </Link>
              </Reveal>
            ))}
          </ul>
        </Reveal>
      )}

      {/* Contact — one path, no form (§2.1) */}
      <Reveal as="section" className="py-28">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          Start a conversation
        </h2>
        <a
          href={`mailto:${SITE.email}`}
          className="font-display mt-6 inline-block text-3xl break-all underline decoration-rule underline-offset-8 transition-colors hover:decoration-accent sm:text-4xl"
        >
          {SITE.email}
        </a>
      </Reveal>
    </main>
  );
}
