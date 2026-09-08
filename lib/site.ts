/**
 * Settled site constants (docs/BUILD-PROMPT.md §2.1, §2.4).
 * Copy lives here so it is changed in one place and can be tested.
 */

export const SITE = {
  name: "N2S",
  /** Use verbatim. AI deliberately does not appear here (§2.1). */
  positioning: "A software studio for problems that don't have a product yet.",
  email: "adrianalvear09@gmail.com",
  /** Expands to "Nothing to Success" — once, on /studio only (§2.4). */
  expansion: "Nothing to Success",
} as const;

/** Stated below the hero, never in it (§2.1). */
export const SERVICES = [
  {
    title: "Consultation",
    body: "Working out what should be built, and whether it should be built at all.",
  },
  {
    title: "AI development",
    body: "Systems that use models where they earn their place, and conventional code everywhere else.",
  },
  {
    title: "Applications",
    body: "Complete products — design through deployment, owned end to end.",
  },
  {
    title: "Ideation",
    body: "Turning a problem you can describe into something you can use.",
  },
] as const;

export const AUDIENCE = [
  "Founders building something that doesn't exist yet",
  "Established companies whose work has outgrown spreadsheets",
] as const;

/**
 * The founder (§2.4 — studio voice, founder named, no team page).
 * Blank fields render nothing rather than a placeholder.
 */
export const FOUNDER = {
  name: "Adrian Alvear",
  role: "Founder",
  photo: "/brand/adrian.jpg",
  /** From LinkedIn — paste the About text here. Renders nothing while empty. */
  bio: "",
} as const;

/**
 * DRAFT COPY — Adrian to confirm before this goes live.
 * These are positioning statements, not claims about past work.
 */
export const PRINCIPLES = [
  {
    title: "You talk to the person building it",
    body: "A small studio taking on a small number of projects. No account managers, no handoffs, nothing lost between the brief and the build.",
  },
  {
    title: "End to end",
    body: "Design through deployment, owned by one team. Nobody hands you a design and wishes you luck.",
  },
  {
    title: "AI where it earns its place",
    body: "Models are used where they genuinely solve the problem, and ordinary code everywhere else. Most software does not need a model, and most models do not need to be visible.",
  },
  {
    title: "Shipped, not demoed",
    body: "The work is judged by what runs, not by what was presented. Everything in the Lab is live and clickable for exactly that reason.",
  },
] as const;
