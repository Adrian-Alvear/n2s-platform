// Derived signals over the `entries` ledger.
//
// Everything here is a pure function of rows that were already fetched — no
// queries, no clock reads, no writes. `now` is always passed in so a caller can
// ask "what did this look like on the 12th" and so the results are stable to
// reason about. The budget page owns the fetching; this file owns the maths.

export type LedgerEntry = {
  id: number;
  expense_at: string;
  description: string;
  category: string;
  amount: number;
  member: string;
};

/** Rows can arrive from Postgres numeric columns as strings. */
function amountOf(e: { amount: number }): number {
  return Number(e.amount) || 0;
}

export function total(entries: LedgerEntry[]): number {
  return entries.reduce((s, e) => s + amountOf(e), 0);
}

export function sumByCategory(entries: LedgerEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) out[e.category] = (out[e.category] ?? 0) + amountOf(e);
  return out;
}

export function sumByMember(entries: LedgerEntry[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const e of entries) out[e.member] = (out[e.member] ?? 0) + amountOf(e);
  return out;
}

export function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(year, month + 1, 0).getDate();
}

/**
 * How much of the selected month has been lived through, as of `now`.
 * A month in the past is fully elapsed; one in the future has not started.
 */
export function elapsedDays(year: number, month: number, now: Date): number {
  const span = daysInMonth(year, month);
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime();
  const t = now.getTime();
  if (t < start) return 0;
  if (t >= end) return span;
  return now.getDate();
}

export function isCurrentMonth(year: number, month: number, now: Date): boolean {
  return now.getFullYear() === year && now.getMonth() === month;
}

export type Pace = {
  spent: number;
  limit: number;
  /** Spend extrapolated to the end of the month at the current daily rate. */
  projected: number;
  /** Positive when the projection lands over the limit. */
  overBy: number;
  perDay: number;
  elapsed: number;
  span: number;
  daysLeft: number;
  live: boolean;
};

export function pace(
  spent: number,
  limit: number,
  year: number,
  month: number,
  now: Date,
): Pace {
  const span = daysInMonth(year, month);
  const elapsed = elapsedDays(year, month, now);
  const live = isCurrentMonth(year, month, now);
  // Before the month starts there is no rate to extrapolate from, and a closed
  // month's projection is simply what it actually spent.
  const perDay = elapsed > 0 ? spent / elapsed : 0;
  const projected = live && elapsed > 0 ? perDay * span : spent;
  return {
    spent,
    limit,
    projected,
    overBy: projected - limit,
    perDay,
    elapsed,
    span,
    daysLeft: Math.max(span - elapsed, 0),
    live,
  };
}

export type CategoryAlert = {
  category: string;
  spent: number;
  limit: number;
  projected: number;
  /** How far past the limit the projection lands. Always > 0 here. */
  overBy: number;
  /** True when the limit has already been blown, not merely forecast to be. */
  already: boolean;
};

/**
 * Categories heading past their limit — already over, or on pace to be.
 * Categories with no limit set are skipped: there is nothing to exceed.
 */
export function categoryAlerts(
  spentByCategory: Record<string, number>,
  limits: Record<string, number>,
  year: number,
  month: number,
  now: Date,
): CategoryAlert[] {
  const out: CategoryAlert[] = [];
  for (const [category, limit] of Object.entries(limits)) {
    if (!(limit > 0)) continue;
    const spent = spentByCategory[category] ?? 0;
    if (spent <= 0) continue;
    const p = pace(spent, limit, year, month, now);
    if (p.projected <= limit) continue;
    out.push({
      category,
      spent,
      limit,
      projected: p.projected,
      overBy: p.projected - limit,
      already: spent > limit,
    });
  }
  return out.sort((a, b) => b.overBy - a.overBy);
}

export type Mover = {
  category: string;
  current: number;
  previous: number;
  /** Signed: positive means this month spent more than last. */
  delta: number;
};

/**
 * The category whose spend changed most against the previous month, in dollars.
 * Dollars rather than percent on purpose — a category going $2 → $8 is a 300%
 * jump and completely uninteresting in a household of this size.
 */
export function biggestMover(
  current: LedgerEntry[],
  previous: LedgerEntry[],
): Mover | null {
  const a = sumByCategory(current);
  const b = sumByCategory(previous);
  let best: Mover | null = null;
  for (const category of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const cur = a[category] ?? 0;
    const prev = b[category] ?? 0;
    const delta = cur - prev;
    if (!best || Math.abs(delta) > Math.abs(best.delta)) {
      best = { category, current: cur, previous: prev, delta };
    }
  }
  // A zero delta is not a mover, it is a coincidence.
  return best && best.delta !== 0 ? best : null;
}

export type Spender = { member: string; amount: number; share: number };

/** Who put the most on the ledger this month, with their share of the total. */
export function topSpender(entries: LedgerEntry[]): Spender | null {
  const sums = sumByMember(entries);
  const grand = total(entries);
  let best: Spender | null = null;
  for (const [member, amount] of Object.entries(sums)) {
    if (!best || amount > best.amount) {
      best = { member, amount, share: grand > 0 ? amount / grand : 0 };
    }
  }
  return best && best.amount > 0 ? best : null;
}

/** The single biggest line on the ledger — the "what was that?" of the month. */
export function largestEntry(entries: LedgerEntry[]): LedgerEntry | null {
  let best: LedgerEntry | null = null;
  for (const e of entries) {
    if (!best || amountOf(e) > amountOf(best)) best = e;
  }
  return best && amountOf(best) > 0 ? best : null;
}

/**
 * Split one fetched window into the selected month and the month before it,
 * using local month boundaries so it lines up with how the month is displayed.
 */
export function splitByMonth(
  rows: LedgerEntry[],
  year: number,
  month: number,
): { current: LedgerEntry[]; previous: LedgerEntry[] } {
  const start = new Date(year, month, 1).getTime();
  const end = new Date(year, month + 1, 1).getTime();
  const prevStart = new Date(year, month - 1, 1).getTime();
  const current: LedgerEntry[] = [];
  const previous: LedgerEntry[] = [];
  for (const r of rows) {
    const t = new Date(r.expense_at).getTime();
    if (t >= start && t < end) current.push(r);
    else if (t >= prevStart && t < start) previous.push(r);
  }
  return { current, previous };
}

// ── Breakdown: where the month's money actually went ────────────────────────

/**
 * Sentinel category for the rolled-up remainder slice. Deliberately not a real
 * category name — "Otros" already exists in CATEGORIES and is a genuine
 * envelope, so a rollup labelled "Otros" would be indistinguishable from it.
 */
export const OTHER_SLICE = "__other__";

export type CategorySlice = {
  /** A real category name, or OTHER_SLICE for the rolled-up remainder. */
  category: string;
  amount: number;
  /** 0..1 of the month's total spend. */
  share: number;
  /** Categories folded into this slice, largest first. Empty for a real one. */
  rolled: string[];
};

/**
 * The month's spend ranked by category and capped at `maxSlices`, with
 * everything past the cap folded into one remainder slice.
 *
 * The cap exists because the categorical palette is five validated colours and
 * this household has fourteen categories — a fifteen-wedge donut would either
 * recycle colours or invent unvalidated ones. Ties break alphabetically so the
 * order is stable between renders of the same data.
 */
export function categoryBreakdown(
  entries: LedgerEntry[],
  maxSlices = 5,
): { slices: CategorySlice[]; total: number } {
  const sums = sumByCategory(entries);
  const ranked = Object.entries(sums)
    .filter(([, amount]) => amount > 0)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const grand = ranked.reduce((s, [, amount]) => s + amount, 0);
  const share = (amount: number) => (grand > 0 ? amount / grand : 0);
  const cap = Math.max(1, Math.floor(maxSlices));

  if (ranked.length <= cap) {
    return {
      slices: ranked.map(([category, amount]) => ({
        category,
        amount,
        share: share(amount),
        rolled: [],
      })),
      total: grand,
    };
  }

  // One slot is spent on the rollup itself, so only cap-1 categories are named.
  const head = ranked.slice(0, cap - 1);
  const tail = ranked.slice(cap - 1);
  const tailAmount = tail.reduce((s, [, amount]) => s + amount, 0);
  return {
    slices: [
      ...head.map(([category, amount]) => ({
        category,
        amount,
        share: share(amount),
        rolled: [],
      })),
      {
        category: OTHER_SLICE,
        amount: tailAmount,
        share: share(tailAmount),
        rolled: tail.map(([category]) => category),
      },
    ],
    total: grand,
  };
}

export type DonutSegment = {
  /** Length of the drawn arc, in the same units as `circumference`. */
  dash: number;
  /** stroke-dashoffset that pushes this arc to its position on the ring. */
  offset: number;
};

/**
 * Ring geometry for a donut drawn as dashed circles rather than arc paths —
 * one `<circle>` per slice, each showing a single dash of its own length.
 *
 * `gap` is subtracted from every arc to leave a hairline between wedges, and is
 * skipped when only one slice is drawn: a gap in a full ring is just a notch.
 * Values that are zero, negative or not finite take no arc at all.
 */
export function donutSegments(
  values: number[],
  circumference: number,
  gap = 0,
): DonutSegment[] {
  const drawable = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const sum = drawable.reduce((s, v) => s + v, 0);
  if (sum <= 0) return drawable.map(() => ({ dash: 0, offset: 0 }));
  const effectiveGap = drawable.filter((v) => v > 0).length > 1 ? gap : 0;
  let cumulative = 0;
  return drawable.map((v) => {
    const length = (v / sum) * circumference;
    const start = cumulative;
    cumulative += length;
    // Negative offset advances the dash pattern along the path, so each slice
    // begins exactly where the previous one ended.
    return { dash: Math.max(length - effectiveGap, 0), offset: -start };
  });
}

export type CategoryDetail = {
  category: string;
  spent: number;
  /** 0..1 of the month's total spend across all categories. */
  share: number;
  limit: number;
  pace: Pace;
  /** The same category's spend in the previous month. */
  previous: number;
  /** Signed: positive means this month spent more than last. */
  delta: number;
  count: number;
  /** Mean size of a transaction in this category, 0 when there are none. */
  average: number;
  /** This category's rows, newest first. */
  entries: LedgerEntry[];
  topMember: Spender | null;
};

/**
 * Everything the drill-down needs about one category, from rows the page has
 * already fetched. Ordering is newest first with the id as the tiebreak, so two
 * entries stamped at the same minute keep a stable order.
 */
export function categoryDetail(
  category: string,
  current: LedgerEntry[],
  previous: LedgerEntry[],
  limit: number,
  year: number,
  month: number,
  now: Date,
): CategoryDetail {
  const rows = current
    .filter((e) => e.category === category)
    .sort(
      (a, b) =>
        new Date(b.expense_at).getTime() - new Date(a.expense_at).getTime() ||
        b.id - a.id,
    );
  const spent = total(rows);
  const grand = total(current);
  const prev = total(previous.filter((e) => e.category === category));
  return {
    category,
    spent,
    share: grand > 0 ? spent / grand : 0,
    limit,
    pace: pace(spent, limit, year, month, now),
    previous: prev,
    delta: spent - prev,
    count: rows.length,
    average: rows.length > 0 ? spent / rows.length : 0,
    entries: rows,
    topMember: topSpender(rows),
  };
}
