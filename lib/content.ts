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
 * Real work. EMPTY BY DESIGN — see the module comment.
 * Never seed this with examples; that is what DEV_FIXTURES is for.
 */
export const REAL_WORK: Work[] = [];

/**
 * Development-only fixtures.
 *
 * These exist so the Lab index, the detail page and the homepage grid can be
 * seen working before any real work exists. They are NOT portfolio entries and
 * must never be visible to a client — §8 forbids invented client-facing
 * content, and a recreation of someone else's design is not our work to show.
 *
 * They are excluded from any production build, and a test asserts that.
 */
const DEV_FIXTURES: Work[] = [
  {
    slug: "cinematic-landing-study",
    href: "/demo/securify",
    title: "Cinematic landing study",
    summary:
      "A dark, video-led landing page built to work out the motion and glass vocabulary.",
    problem:
      "Cinematic marketing sites lean on multi-megabyte background video and hard-cut loops. We wanted the same feel without the weight or the visible seam.",
    approach:
      "Rebuilt the genre from its parts: a seamless loop that crossfades through black rather than snapping, glass controls drawn with a masked gradient border, and staged entrances on a single shared curve.",
    built: [
      "Loop-fade video that hides its own seam",
      "Liquid-glass component keyed to the palette, working in both themes",
      "Scroll-staged entrance system with three independent reveal paths",
    ],
    visibility: "public",
    year: 2026,
  },
  {
    slug: "word-by-word-hero",
    href: "/demo/trav",
    title: "Word-by-word hero",
    summary:
      "A cinematic hero where the headline resolves one word at a time, on a timeline that derives itself.",
    problem:
      "Staged text reveals are usually hardcoded delays that drift out of sync the moment the copy changes, and they destroy the line breaks the layout depends on.",
    approach:
      "Split text nodes into per-word spans at runtime while leaving <br> elements untouched, and have each stage return the time it finished so the next begins exactly there rather than at a guessed offset.",
    built: [
      "Runtime word splitting that preserves intended line breaks",
      "A self-deriving timeline — change the copy and the sequence still lands",
      "Fully disabled under prefers-reduced-motion",
    ],
    visibility: "public",
    year: 2026,
  },
  {
    slug: "orrery",
    href: "/hub",
    title: "Orrery",
    summary:
      "A navigable solar system driven by real planetary positions, used as an application shell.",
    problem:
      "Dashboards are lists of links. We wanted a system you move through, where position means something rather than being decoration.",
    approach:
      "Real VSOP87 ephemeris drives the bodies, so the configuration on load matches the actual sky. Angles are true; radii are compressed against each body's mean orbit, so real eccentricity survives.",
    built: [
      "Ephemeris-driven positions with true inclination and eccentricity",
      "Orbit rings sampled from one full period, not drawn as circles",
      "Procedural nebula backdrop with per-region tinting",
    ],
    visibility: "public",
    year: 2026,
  },
  {
    slug: "recurring-costs",
    href: "/demo/portfolio",
    title: "Recurring cost detection",
    summary:
      "Recovers a household's real monthly commitments from six months of raw transactions.",
    problem:
      "People know roughly what they spend and not what they are committed to. Subscriptions and standing costs hide inside an undifferentiated ledger.",
    approach:
      "Pure functions over transaction history that cluster by description and cadence, tolerate price changes and missed months, and report only what the data supports.",
    built: [
      "Cadence clustering tolerant of date drift and price changes",
      "Forecast of what the month still owes",
      "Fully deterministic and unit tested — no model in the numbers",
    ],
    visibility: "public",
    year: 2026,
  },
];

/** Fixtures are development-only and can never reach a production build. */
export const WORK: Work[] =
  process.env.NODE_ENV === "production"
    ? REAL_WORK
    : [...REAL_WORK, ...DEV_FIXTURES];

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
