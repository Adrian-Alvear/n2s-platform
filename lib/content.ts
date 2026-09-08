/**
 * The content model (docs/BUILD-PROMPT.md §2.3).
 *
 * A Lab entry and a client case study are THE SAME SHAPE — one record type,
 * differing only in which fields are populated and whether a client is
 * attached. This is deliberate: when the first real client project lands,
 * publishing it is filling in fields, not building a new section.
 *
 * The registry below is empty on purpose. Sections driven by it render
 * nothing rather than rendering a placeholder — §2.3 failure mode #1 is
 * shipping a section that advertises its own absence.
 */

export type Visibility = "private" | "public";

export type Work = {
  slug: string;
  title: string;
  /** One line, shown in listings. */
  summary: string;
  /** What was wrong before this existed. */
  problem: string;
  /** How it was approached, and why that way. */
  approach: string;
  /** What actually shipped. */
  built: string[];
  /** Where it can be tried. Absent means there is nothing to click yet. */
  href?: string;
  /** Present only for real client work. Its absence is what makes this a Lab piece. */
  client?: string;
  /** What changed as a result. Never invent this (§8). */
  outcome?: string;
  visibility: Visibility;
  year: number;
};

/**
 * Every piece of work, public and private.
 * EMPTY BY DESIGN — see the module comment. Never seed this with examples.
 */
export const WORK: Work[] = [];

/** A Lab piece is work with no client attached. */
export function isLab(work: Work): boolean {
  return work.client === undefined;
}

export function publicWork(all: Work[] = WORK): Work[] {
  return all.filter((w) => w.visibility === "public");
}

/** The Lab index: public, client-less, newest first. */
export function labPieces(all: Work[] = WORK): Work[] {
  return publicWork(all)
    .filter(isLab)
    .sort((a, b) => b.year - a.year);
}

/** Case studies: public work with a client. Nothing qualifies yet. */
export function caseStudies(all: Work[] = WORK): Work[] {
  return publicWork(all)
    .filter((w) => !isLab(w))
    .sort((a, b) => b.year - a.year);
}

export function findWork(slug: string, all: Work[] = WORK): Work | undefined {
  return publicWork(all).find((w) => w.slug === slug);
}
