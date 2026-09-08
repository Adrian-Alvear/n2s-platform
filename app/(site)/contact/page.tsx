import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contact — N2S",
  description: `Email ${SITE.email}`,
};

/** One path, no form, no calendar embed (§2.1). */
export default function Contact() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-display text-4xl sm:text-5xl">Contact</h1>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-muted">
        Tell us what you&rsquo;re trying to build, or what isn&rsquo;t working.
        Enough detail to reply usefully is plenty.
      </p>
      <a
        href={`mailto:${SITE.email}`}
        className="font-display mt-10 inline-block text-3xl break-all underline decoration-rule underline-offset-8 transition-colors hover:decoration-accent sm:text-4xl"
      >
        {SITE.email}
      </a>
    </main>
  );
}
