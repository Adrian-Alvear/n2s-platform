import Link from "next/link";
import { AUDIENCE, HERO_POSTER, HERO_VIDEO, PRINCIPLES, SERVICES, SITE } from "@/lib/site";
import { labPieces } from "@/lib/content";
import { Reveal } from "@/components/reveal";
import { GlassLink } from "@/components/glass-link";
import { SiteBackdrop } from "@/components/site-backdrop";
import { MotionPlate } from "@/components/site/motion-plate";
import { HeroVideo } from "@/components/site/hero-video";

/**
 * The front face (docs/BUILD-PROMPT.md §2.1).
 *
 * Server component, no client JavaScript for content. Sectioned with real
 * rhythm: statement, position, approach, services, contact.
 */
export default function Home() {
  const lab = labPieces();

  return (
    <main>
      {/* 1 — HERO */}
      <section className="relative mx-auto flex min-h-[86vh] max-w-5xl flex-col justify-center px-6 py-20">
        {/* Video if we have one; otherwise the CSS atmosphere carries the hero. */}
        <div aria-hidden className="n2s-backdrop overflow-hidden">
          <HeroVideo src={HERO_VIDEO} poster={HERO_POSTER} />
        </div>
        <SiteBackdrop />

        <div className="n2s-above n2s-reveal-mask max-w-3xl">
          <h1 className="font-display text-5xl leading-[1.02] tracking-[-0.02em] text-balance sm:text-7xl">
            A software studio for problems that{" "}
            <span className="n2s-em">don&rsquo;t have a product yet.</span>
          </h1>
        </div>

        <p
          className="n2s-above n2s-rise mt-8 max-w-xl text-base leading-relaxed text-muted"
          style={{ animationDelay: "160ms" }}
        >
          Development-led, end to end. We take the problem from the first
          conversation to the thing that runs.
        </p>

        <div
          className="n2s-above n2s-settle mt-12 flex flex-wrap items-center gap-4"
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
      </section>

      {/* 2 — STATEMENT */}
      <section className="mx-auto max-w-5xl px-6 py-28 md:py-40">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
            What we&rsquo;re for
          </p>
        </Reveal>
        <Reveal delay={100}>
          <h2 className="font-display mt-10 text-4xl leading-[1.1] tracking-[-0.02em] text-balance md:text-6xl">
            Most businesses can describe the problem precisely and{" "}
            <span className="n2s-em">cannot buy the answer.</span> That gap is
            the work.
          </h2>
        </Reveal>
      </section>

      {/* 3 — FEATURED PLATE */}
      <section className="mx-auto max-w-6xl px-6 pb-28 md:pb-40">
        <Reveal>
          <MotionPlate className="relative aspect-video w-full rounded-3xl">
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-10">
              <div className="liquid-glass max-w-md rounded-2xl p-6 md:p-8">
                <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
                  Our approach
                </p>
                <p className="mt-3 text-sm leading-relaxed md:text-base">
                  Start with the problem, not the technology. Build the smallest
                  thing that proves the answer, put it in front of real use, and
                  let what happens next decide the roadmap.
                </p>
              </div>
              <GlassLink href="/studio">Read more</GlassLink>
            </div>
          </MotionPlate>
        </Reveal>
      </section>

      {/* 4 — APPROACH */}
      <section className="mx-auto max-w-6xl px-6 pb-28 md:pb-40">
        <Reveal>
          <h2 className="font-display text-4xl tracking-[-0.02em] md:text-6xl">
            Judgment <span className="n2s-em">×</span> execution
          </h2>
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-10 md:grid-cols-2 md:gap-12">
          <Reveal>
            <MotionPlate seed="b" className="aspect-[4/3] w-full rounded-3xl" />
          </Reveal>
          <Reveal delay={120}>
            <div className="divide-y divide-rule">
              {PRINCIPLES.slice(0, 2).map((p) => (
                <div key={p.title} className="py-8 first:pt-0 last:pb-0">
                  <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
                    {p.title}
                  </p>
                  <p className="mt-4 leading-relaxed text-muted md:text-lg">
                    {p.body}
                  </p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* 5 — SERVICES */}
      <section className="mx-auto max-w-6xl px-6 pb-28 md:pb-40">
        <Reveal>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-3xl tracking-[-0.02em] md:text-5xl">
              What we do
            </h2>
            <p className="hidden font-mono text-xs tracking-[0.2em] text-muted uppercase md:block">
              Services
            </p>
          </div>
        </Reveal>

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
          {SERVICES.map((service, i) => (
            <Reveal key={service.title} delay={i * 120}>
              <div className="liquid-glass h-full rounded-3xl p-6 md:p-8">
                <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
                  0{i + 1}
                </p>
                <h3 className="font-display mt-6 text-2xl tracking-[-0.01em] md:text-3xl">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  {service.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 6 — WHO (audience) */}
      <section className="mx-auto max-w-5xl px-6 pb-28 md:pb-40">
        <Reveal>
          <p className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
            Who we work with
          </p>
        </Reveal>
        <ul className="mt-10 space-y-6">
          {AUDIENCE.map((line, i) => (
            <Reveal as="li" key={line} delay={i * 100} className="flex gap-5">
              <span aria-hidden className="mt-3.5 h-px w-8 shrink-0 bg-accent" />
              <span className="text-lg text-balance md:text-2xl">{line}</span>
            </Reveal>
          ))}
        </ul>
      </section>

      {/*
        Selected work renders ONLY when there is work to show. A section that
        announces its own absence is §2.3 failure mode #1.
      */}
      {lab.length > 0 && (
        <section className="mx-auto max-w-6xl px-6 pb-28 md:pb-40">
          <Reveal>
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-3xl tracking-[-0.02em] md:text-5xl">
                Selected work
              </h2>
              <Link
                href="/lab"
                className="font-mono text-xs text-muted transition-colors hover:text-foreground"
              >
                All work →
              </Link>
            </div>
          </Reveal>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-8">
            {lab.slice(0, 4).map((piece, i) => (
              <Reveal key={piece.slug} delay={i * 120}>
                <Link href={`/lab/${piece.slug}`} className="group block">
                  <MotionPlate
                    seed="c"
                    className="aspect-video w-full rounded-3xl"
                  />
                  <h3 className="font-display mt-6 text-2xl transition-colors group-hover:text-accent">
                    {piece.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted">{piece.summary}</p>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 7 — CONTACT */}
      <section className="mx-auto max-w-5xl px-6 pb-32">
        <Reveal>
          <h2 className="font-display text-4xl tracking-[-0.02em] text-balance md:text-6xl">
            Tell us what isn&rsquo;t working.
          </h2>
          <a
            href={`mailto:${SITE.email}`}
            className="font-display mt-8 inline-block text-2xl break-all underline decoration-rule underline-offset-8 transition-colors hover:decoration-accent sm:text-3xl"
          >
            {SITE.email}
          </a>
        </Reveal>
      </section>
    </main>
  );
}
