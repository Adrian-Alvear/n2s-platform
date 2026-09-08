import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { findWork, labPieces } from "@/lib/content";

export function generateStaticParams() {
  return labPieces().map((piece) => ({ slug: piece.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const work = findWork(slug);
  if (!work) return { title: "Not found — N2S" };
  return { title: `${work.title} — N2S`, description: work.summary };
}

export default async function WorkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const work = findWork(slug);
  if (!work) notFound();

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="tabular text-xs text-muted">{work.year}</p>
      <h1 className="font-display mt-3 text-4xl sm:text-5xl">{work.title}</h1>
      <p className="mt-4 text-lg text-balance text-muted">{work.summary}</p>

      {work.href && (
        <a
          href={work.href}
          className="font-mono mt-8 inline-block text-xs tracking-widest uppercase underline decoration-rule underline-offset-8 transition-colors hover:decoration-accent"
        >
          Try it →
        </a>
      )}

      <Section title="The problem">{work.problem}</Section>
      <Section title="The approach">{work.approach}</Section>

      <section className="mt-12">
        <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
          What shipped
        </h2>
        <ul className="mt-4 space-y-3">
          {work.built.map((item) => (
            <li key={item} className="flex gap-4 text-sm leading-relaxed">
              <span aria-hidden className="mt-2.5 h-px w-4 shrink-0 bg-accent" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Outcome renders only when there is a real one. Never invented (§8). */}
      {work.outcome && <Section title="Outcome">{work.outcome}</Section>}
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-12">
      <h2 className="font-mono text-xs tracking-[0.2em] text-muted uppercase">
        {title}
      </h2>
      <p className="mt-4 text-sm leading-relaxed">{children}</p>
    </section>
  );
}
