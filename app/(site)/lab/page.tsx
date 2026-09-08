import Link from "next/link";
import type { Metadata } from "next";
import { labPieces } from "@/lib/content";

export const metadata: Metadata = {
  title: "Lab — N2S",
  description: "Working software, built and deployed.",
};

export default function Lab() {
  const pieces = labPieces();

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <h1 className="font-display text-4xl sm:text-5xl">Lab</h1>
      <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted">
        Working software, built and deployed. Everything here is live.
      </p>

      {pieces.length > 0 ? (
        <ul className="mt-16 space-y-12">
          {pieces.map((piece) => (
            <li key={piece.slug}>
              <Link href={`/lab/${piece.slug}`} className="group block">
                <div className="flex items-baseline gap-4">
                  <h2 className="font-display text-3xl transition-colors group-hover:text-accent">
                    {piece.title}
                  </h2>
                  <span className="tabular text-xs text-muted">{piece.year}</span>
                </div>
                <p className="mt-2 max-w-xl text-sm text-muted">{piece.summary}</p>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        /* Honest, and deliberately not a "coming soon" placeholder (§2.3). */
        <p className="mt-16 max-w-xl text-sm text-muted">
          The first pieces are being built.
        </p>
      )}
    </main>
  );
}
