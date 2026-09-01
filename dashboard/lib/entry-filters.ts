// Search, filter and sort over the `entries` ledger.
//
// Pure like lib/budget-analytics.ts: every function here takes rows the page
// has already fetched and returns new rows. No queries, no clock, no writes.
// The component owns the state and the copy; this file owns the matching rules.

import type { LedgerEntry } from "./budget-analytics";

/**
 * Amount bands, as fixed buckets rather than two number inputs.
 *
 * A pair of min/max fields is a form; a band is a decision — "show me the small
 * stuff" — and it can be a single tap on a phone. `min` is inclusive and `max`
 * is exclusive, so every amount falls in exactly one band.
 */
export type AmountBandId = "all" | "under25" | "mid" | "large" | "xl";

export type AmountBand = { id: AmountBandId; min: number; max: number | null };

export const AMOUNT_BANDS: readonly AmountBand[] = [
  { id: "all", min: 0, max: null },
  { id: "under25", min: 0, max: 25 },
  { id: "mid", min: 25, max: 100 },
  { id: "large", min: 100, max: 500 },
  { id: "xl", min: 500, max: null },
] as const;

export type EntryFilter = {
  text: string;
  /** Empty means every category. */
  categories: string[];
  /** Empty means everyone. */
  members: string[];
  band: AmountBandId;
};

export const EMPTY_FILTER: EntryFilter = {
  text: "",
  categories: [],
  members: [],
  band: "all",
};

export type SortKey = "date" | "amount";
export type SortDir = "asc" | "desc";
export type EntrySort = { key: SortKey; dir: SortDir };

export const DEFAULT_SORT: EntrySort = { key: "date", dir: "desc" };

/** Rows can arrive from Postgres numeric columns as strings. */
function amountOf(e: { amount: number }): number {
  return Number(e.amount) || 0;
}

/**
 * Case- and accent-insensitive search key.
 *
 * Half the ledger is in Spanish and nobody types "Cumpleaños" with the tilde
 * when they are hunting for a birthday expense, so diacritics are stripped from
 * both the haystack and the needle before comparing.
 */
export function normalize(s: string): string {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Every whitespace-separated term must appear somewhere in the row —
 * description, category or member. "uber javi" finds Javi's Uber rides without
 * needing a second filter, and an all-whitespace query matches everything.
 */
export function matchesText(entry: LedgerEntry, text: string): boolean {
  const terms = normalize(text).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return true;
  const haystack = normalize(
    `${entry.description} ${entry.category} ${entry.member}`,
  );
  return terms.every((t) => haystack.includes(t));
}

export function bandFor(id: AmountBandId): AmountBand {
  return AMOUNT_BANDS.find((b) => b.id === id) ?? AMOUNT_BANDS[0];
}

/** `min` inclusive, `max` exclusive. An open `max` has no upper edge. */
export function matchesBand(amount: number, id: AmountBandId): boolean {
  if (id === "all") return true;
  const band = bandFor(id);
  const v = Number.isFinite(amount) ? amount : 0;
  if (v < band.min) return false;
  return band.max === null ? true : v < band.max;
}

export function filterEntries(
  entries: LedgerEntry[],
  filter: EntryFilter,
): LedgerEntry[] {
  return entries.filter((e) => {
    if (filter.categories.length > 0 && !filter.categories.includes(e.category)) return false;
    if (filter.members.length > 0 && !filter.members.includes(e.member)) return false;
    if (!matchesBand(amountOf(e), filter.band)) return false;
    return matchesText(e, filter.text);
  });
}

/**
 * Sorted copy, never in place — the caller's array is the fetched month and
 * other panels read it. Ties break on descending id so equal rows keep a stable
 * order between renders instead of shuffling.
 */
export function sortEntries(entries: LedgerEntry[], sort: EntrySort): LedgerEntry[] {
  const sign = sort.dir === "asc" ? 1 : -1;
  return [...entries].sort((a, b) => {
    const primary =
      sort.key === "amount"
        ? amountOf(a) - amountOf(b)
        : new Date(a.expense_at).getTime() - new Date(b.expense_at).getTime();
    if (primary !== 0) return primary * sign;
    return b.id - a.id;
  });
}

/** True when the view is showing something narrower than the whole month. */
export function isFilterActive(filter: EntryFilter): boolean {
  return (
    normalize(filter.text).length > 0 ||
    filter.categories.length > 0 ||
    filter.members.length > 0 ||
    filter.band !== "all"
  );
}

export function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export type Facet = { value: string; count: number; amount: number };

/**
 * The category and member values that actually occur in this month's rows,
 * ranked by spend. Filter controls are built from these rather than from the
 * full CATEGORIES list so nobody is offered a filter that returns nothing.
 */
export function facets(entries: LedgerEntry[]): {
  categories: Facet[];
  members: Facet[];
} {
  const build = (pick: (e: LedgerEntry) => string): Facet[] => {
    const byValue = new Map<string, Facet>();
    for (const e of entries) {
      const value = pick(e);
      const f = byValue.get(value) ?? { value, count: 0, amount: 0 };
      f.count += 1;
      f.amount += amountOf(e);
      byValue.set(value, f);
    }
    return [...byValue.values()].sort(
      (a, b) => b.amount - a.amount || a.value.localeCompare(b.value),
    );
  };
  return { categories: build((e) => e.category), members: build((e) => e.member) };
}

export type ResultSummary = {
  count: number;
  total: number;
  /** Mean line size, 0 when there is nothing to average. */
  average: number;
  /** 0..1 of the unfiltered spend these rows represent. */
  share: number;
};

/** What the filtered slice adds up to, against the month it was cut from. */
export function summarize(
  rows: LedgerEntry[],
  allRows: LedgerEntry[],
): ResultSummary {
  const sum = rows.reduce((s, e) => s + amountOf(e), 0);
  const grand = allRows.reduce((s, e) => s + amountOf(e), 0);
  return {
    count: rows.length,
    total: sum,
    average: rows.length > 0 ? sum / rows.length : 0,
    share: grand > 0 ? sum / grand : 0,
  };
}

// ── Match highlighting ─────────────────────────────────────────────────────

export type HighlightSegment = { text: string; match: boolean };

/**
 * Folds a string for matching while remembering where every folded character
 * came from. Needed because NFD decomposition changes the length — "á" becomes
 * two code units before the mark is stripped — so an index into the folded
 * string cannot be used against the original without this map.
 */
function foldWithMap(s: string): { text: string; map: number[] } {
  let text = "";
  const map: number[] = [];
  for (let i = 0; i < s.length; i++) {
    const folded = s[i].normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    for (const ch of folded) {
      text += ch;
      map.push(i);
    }
  }
  return { text, map };
}

/**
 * Splits `text` into runs, flagging the ones that matched a search term, so the
 * caller can mark them without doing any index maths of its own.
 *
 * Matching is accent- and case-insensitive like the search itself, and every
 * term is highlighted independently — overlapping hits merge into one run
 * rather than nesting. Returns a single unmatched run when there is nothing to
 * highlight, and an empty list only for empty text.
 */
export function highlightSegments(text: string, query: string): HighlightSegment[] {
  if (!text) return [];
  const terms = normalize(query).split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [{ text, match: false }];

  const { text: folded, map } = foldWithMap(text);
  const ranges: Array<[number, number]> = [];
  for (const term of terms) {
    let from = folded.indexOf(term);
    while (from !== -1) {
      const last = from + term.length - 1;
      // map[last] is the source index of the term's final folded character;
      // +1 turns it into an exclusive end in the original string.
      ranges.push([map[from], map[last] + 1]);
      from = folded.indexOf(term, from + term.length);
    }
  }
  if (ranges.length === 0) return [{ text, match: false }];

  ranges.sort((a, b) => a[0] - b[0]);
  const merged: Array<[number, number]> = [];
  for (const [start, end] of ranges) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }

  const out: HighlightSegment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) out.push({ text: text.slice(cursor, start), match: false });
    out.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), match: false });
  return out;
}
