// Recurring-commitment detection over the `entries` ledger.
//
// Pure like lib/budget-analytics.ts and lib/entry-filters.ts: every function
// takes rows a caller already fetched plus an explicit `now`, and returns new
// data. No queries, no clock reads, no writes.
//
// The household has no subscription list anywhere — the rent, the insurance and
// the internet bill are just rows somebody typed each month. This file recovers
// that structure from the history: which descriptions repeat month after month,
// what they usually cost, when in the month they usually land, and whether the
// month being looked at has seen them yet.

import type { LedgerEntry } from "./budget-analytics";

/** Rows can arrive from Postgres numeric columns as strings. */
function amountOf(e: { amount: number }): number {
  return Number(e.amount) || 0;
}

/** Months since year 0, so month arithmetic never wraps by hand. */
function monthIndex(year: number, month: number): number {
  return year * 12 + month;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

// Words that say *which* month a row belongs to rather than *what* it is.
// "Arriendo mayo" and "Arriendo junio" are the same commitment, so the month
// word has to come out of the signature or every month looks like a new series.
const MONTH_WORDS = new Set([
  "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto",
  "septiembre", "setiembre", "octubre", "noviembre", "diciembre",
  "ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "sept", "oct", "nov", "dic",
  "january", "february", "march", "april", "june", "july", "august",
  "september", "october", "november", "december",
  "jan", "apr", "aug", "dec",
]);

// Connectives that carry no identity. Kept short on purpose: over-stripping
// merges genuinely different expenses into one series.
const FILLER = new Set([
  "de", "del", "la", "el", "los", "las", "un", "una", "y",
  "the", "of", "for", "and", "a",
  "mes", "mensual", "pago", "month", "monthly", "payment", "bill",
]);

/**
 * The identity of a repeating expense, derived from its description.
 *
 * Accents and case are folded, digits are dropped (an invoice number or an
 * amount typed into the description must not split a series), month words and
 * connectives are removed, and what is left is de-duplicated and sorted — so
 * "Pago Internet" and "internet pago" are recognised as the same thing, which
 * is how people actually type into a shared ledger.
 *
 * Falls back to the category when nothing survives, so a row described only as
 * "2026" still groups with its category rather than vanishing.
 */
export function recurringSignature(description: string, category: string): string {
  const folded = (description ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const tokens = folded
    .split(/[^a-z]+/)
    .filter((t) => t.length > 1 && !MONTH_WORDS.has(t) && !FILLER.has(t));
  const unique = [...new Set(tokens)].sort();
  if (unique.length > 0) return unique.join(" ");
  return (category ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Where a detected commitment stands in the month being viewed.
 *
 * `due` is "expected, not here yet" and `late` is "expected, the usual day has
 * passed". `missed` is only ever used for a month that is entirely over, where
 * neither of those is meaningful any more.
 */
export type RecurringStatus = "paid" | "due" | "late" | "missed";

export type RecurringSeries = {
  /** Stable grouping id: category and signature. Safe as a React key. */
  key: string;
  /** The description the household writes most often for this expense. */
  label: string;
  category: string;
  /** Distinct prior months, inside the window, in which it appeared. */
  monthsSeen: number;
  /** Prior months the window covered, so monthsSeen reads as "4 of 6". */
  monthsWindow: number;
  /** Median of the prior months' totals — what it usually costs. */
  typical: number;
  /** True when every prior month sat close to `typical`; false means it varies. */
  fixed: boolean;
  /** Median day of the month it usually lands on, 1..31. */
  expectedDay: number;
  /** Most recent occurrence anywhere in the window, as an ISO timestamp. */
  lastSeen: string;
  /** What the viewed month has actually charged for it so far. */
  currentAmount: number;
  currentCount: number;
  status: RecurringStatus;
  /** Who pays it most often. Ties break towards the more recent payer. */
  topMember: string;
};

export type RecurringOptions = {
  /** Prior months examined. The viewed month is judged, never used as evidence. */
  lookback?: number;
  /** Prior months an expense must appear in before it counts as recurring. */
  minMonths?: number;
  /** Days past the usual day before an unseen commitment reads as late. */
  graceDays?: number;
};

const DEFAULTS = { lookback: 6, minMonths: 3, graceDays: 3 };

/** A monthly total this far from the median still counts as a fixed amount. */
const FIXED_TOLERANCE = 0.15;

type Occurrence = { day: number; amount: number; ts: number; iso: string; member: string; description: string };

/**
 * Commitments recovered from `entries`, for the month `year`/`month`.
 *
 * Evidence comes only from the months *before* the viewed one, so the status of
 * the viewed month is a genuine prediction: a bill that has not been entered
 * yet still shows up, which is the whole point. Rows outside the window are
 * ignored, so the caller can over-fetch safely.
 */
export function detectRecurring(
  entries: LedgerEntry[],
  year: number,
  month: number,
  now: Date,
  options: RecurringOptions = {},
): RecurringSeries[] {
  const lookback = Math.max(1, options.lookback ?? DEFAULTS.lookback);
  const minMonths = Math.max(1, options.minMonths ?? DEFAULTS.minMonths);
  const graceDays = options.graceDays ?? DEFAULTS.graceDays;

  const anchor = monthIndex(year, month);
  const earliest = anchor - lookback;

  // group key → month index → occurrences in that month
  const groups = new Map<string, Map<number, Occurrence[]>>();
  const categories = new Map<string, string>();

  for (const e of entries) {
    const d = new Date(e.expense_at);
    if (Number.isNaN(d.getTime())) continue;
    const idx = monthIndex(d.getFullYear(), d.getMonth());
    if (idx < earliest || idx > anchor) continue;

    const signature = recurringSignature(e.description, e.category);
    const key = `${e.category}::${signature}`;
    categories.set(key, e.category);

    const byMonth = groups.get(key) ?? new Map<number, Occurrence[]>();
    const list = byMonth.get(idx) ?? [];
    list.push({
      day: d.getDate(),
      amount: amountOf(e),
      ts: d.getTime(),
      iso: e.expense_at,
      member: e.member,
      description: e.description,
    });
    byMonth.set(idx, list);
    groups.set(key, byMonth);
  }

  const out: RecurringSeries[] = [];

  for (const [key, byMonth] of groups) {
    const priorMonths = [...byMonth.keys()].filter((m) => m < anchor).sort((a, b) => a - b);
    if (priorMonths.length < minMonths) continue;
    // A commitment that stopped is not a commitment. Requiring a sighting in
    // one of the two most recent prior months drops the cancelled ones instead
    // of nagging about a bill nobody pays any more.
    const stillActive = priorMonths.some((m) => m >= anchor - 2);
    if (!stillActive) continue;

    const monthlyTotals = priorMonths.map((m) =>
      (byMonth.get(m) ?? []).reduce((s, o) => s + o.amount, 0),
    );
    const typical = median(monthlyTotals);
    // Within a tolerance band, or within a dollar — a $0.40 drift on an $81
    // internet bill is a fixed bill, not a variable one.
    const fixed = monthlyTotals.every(
      (t) => Math.abs(t - typical) <= Math.max(typical * FIXED_TOLERANCE, 1),
    );

    // The day it lands on is the first sighting of each month: a bill paid in
    // two instalments is still "due on the 3rd".
    const firstDays = priorMonths.map((m) =>
      Math.min(...(byMonth.get(m) ?? []).map((o) => o.day)),
    );
    const expectedDay = Math.min(31, Math.max(1, Math.round(median(firstDays))));

    const all = [...byMonth.values()].flat().sort((a, b) => a.ts - b.ts);
    const lastSeen = all[all.length - 1]?.iso ?? "";

    const current = byMonth.get(anchor) ?? [];
    const currentAmount = current.reduce((s, o) => s + o.amount, 0);

    out.push({
      key,
      label: pickLabel(all),
      category: categories.get(key) ?? "",
      monthsSeen: priorMonths.length,
      monthsWindow: lookback,
      typical,
      fixed,
      expectedDay,
      lastSeen,
      currentAmount,
      currentCount: current.length,
      status: statusFor(current.length > 0, year, month, expectedDay, graceDays, now),
      topMember: pickMember(all),
    });
  }

  // Anything still outstanding sorts above what is already settled, and inside
  // each of those the biggest commitment leads — the order somebody scanning
  // for "what do I still owe this month" actually wants.
  const rank: Record<RecurringStatus, number> = { late: 0, due: 1, missed: 2, paid: 3 };
  return out.sort(
    (a, b) =>
      rank[a.status] - rank[b.status] ||
      b.typical - a.typical ||
      a.label.localeCompare(b.label),
  );
}

/** The wording the household uses most for this expense; ties go to the latest. */
function pickLabel(occurrences: Occurrence[]): string {
  const counts = new Map<string, number>();
  for (const o of occurrences) counts.set(o.description, (counts.get(o.description) ?? 0) + 1);
  let best = occurrences[occurrences.length - 1]?.description ?? "";
  let bestCount = 0;
  // Walked newest-first so an equal count keeps the most recent wording.
  for (let i = occurrences.length - 1; i >= 0; i--) {
    const d = occurrences[i].description;
    const c = counts.get(d) ?? 0;
    if (c > bestCount) {
      best = d;
      bestCount = c;
    }
  }
  return best;
}

function pickMember(occurrences: Occurrence[]): string {
  const counts = new Map<string, number>();
  for (const o of occurrences) counts.set(o.member, (counts.get(o.member) ?? 0) + 1);
  let best = "";
  let bestCount = 0;
  for (let i = occurrences.length - 1; i >= 0; i--) {
    const m = occurrences[i].member;
    const c = counts.get(m) ?? 0;
    if (c > bestCount) {
      best = m;
      bestCount = c;
    }
  }
  return best;
}

function statusFor(
  seen: boolean,
  year: number,
  month: number,
  expectedDay: number,
  graceDays: number,
  now: Date,
): RecurringStatus {
  if (seen) return "paid";
  const anchor = monthIndex(year, month);
  const today = monthIndex(now.getFullYear(), now.getMonth());
  // A month still ahead cannot be late, and one already over cannot be due.
  if (anchor > today) return "due";
  if (anchor < today) return "missed";
  return now.getDate() > expectedDay + graceDays ? "late" : "due";
}

export type RecurringSummary = {
  count: number;
  /** What the detected commitments usually add up to in a month. */
  committed: number;
  /** Of that, what the viewed month has already charged. */
  paid: number;
  /** The usual cost of everything not yet seen this month. */
  outstanding: number;
  /** 0..1 of `committed` already settled. */
  coverage: number;
  late: number;
  due: number;
};

export function summarizeRecurring(series: RecurringSeries[]): RecurringSummary {
  const committed = series.reduce((s, r) => s + r.typical, 0);
  const paid = series.reduce((s, r) => s + (r.status === "paid" ? r.currentAmount : 0), 0);
  const outstanding = series.reduce((s, r) => s + (r.status === "paid" ? 0 : r.typical), 0);
  return {
    count: series.length,
    committed,
    paid,
    outstanding,
    // Capped: paying more than usual is not more than 100% covered.
    coverage: committed > 0 ? Math.min(paid / committed, 1) : 0,
    late: series.filter((r) => r.status === "late").length,
    due: series.filter((r) => r.status === "due").length,
  };
}
