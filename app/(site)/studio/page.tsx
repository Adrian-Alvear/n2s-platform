import type { Metadata } from "next";
import { FOUNDER, PRINCIPLES, SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Studio — N2S",
  description: "How N2S works.",
};

export default function Studio() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl sm:text-5xl">Studio</h1>

      {/* The expansion appears exactly once, here, framed as the client's arc (§2.4). */}
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-balance">
        {SITE.name} is short for {SITE.expansion}. You arrive with a problem that
        has nothing solving it, and leave with something that works.
      </p>

      <section className="mt-20">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          How we work
        </h2>
        <dl className="mt-10 space-y-10">
          {PRINCIPLES.map((principle) => (
            <div key={principle.title}>
              <dt className="font-display text-2xl">{principle.title}</dt>
              <dd className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                {principle.body}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Founder block. Renders only what actually exists — no placeholder bio. */}
      <section className="mt-20">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          {FOUNDER.role}
        </h2>
        <div className="mt-8 flex flex-wrap items-start gap-8">
          {FOUNDER.photo && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={FOUNDER.photo}
              alt={FOUNDER.name}
              width={128}
              height={128}
              className="h-32 w-32 rounded-full object-cover"
            />
          )}
          <div className="flex-1">
            <p className="font-display text-2xl">{FOUNDER.name}</p>
            {FOUNDER.bio && (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
                {FOUNDER.bio}
              </p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
