import { describe, expect, it } from "vitest";
import type { LedgerEntry } from "@/lib/budget-analytics";
import {
  AMOUNT_BANDS,
  DEFAULT_SORT,
  EMPTY_FILTER,
  bandFor,
  facets,
  filterEntries,
  highlightSegments,
  isFilterActive,
  matchesBand,
  matchesText,
  normalize,
  sortEntries,
  summarize,
  toggleValue,
  type EntryFilter,
} from "@/lib/entry-filters";

function entry(over: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: 1,
    expense_at: "2026-09-05T12:00:00.000Z",
    description: "Mercado",
    category: "Comida y Aseo",
    amount: 50,
    member: "Adrian",
    ...over,
  };
}

const ledger: LedgerEntry[] = [
  entry({ id: 1, description: "Mercado semanal", category: "Comida y Aseo", amount: 180, member: "Yazmi", expense_at: "2026-09-02T10:00:00.000Z" }),
  entry({ id: 2, description: "Uber al aeropuerto", category: "Transporte Uber", amount: 35, member: "Javi", expense_at: "2026-09-05T10:00:00.000Z" }),
  entry({ id: 3, description: "Cumpleaños de Yazmi", category: "Cumpleaños", amount: 20, member: "Adrian", expense_at: "2026-09-07T10:00:00.000Z" }),
  entry({ id: 4, description: "Arriendo septiembre", category: "Arriendo", amount: 2950, member: "Adrian", expense_at: "2026-09-01T10:00:00.000Z" }),
  entry({ id: 5, description: "Uber a casa", category: "Transporte Uber", amount: 12, member: "Javi", expense_at: "2026-09-09T10:00:00.000Z" }),
];

function withFilter(over: Partial<EntryFilter>): EntryFilter {
  return { ...EMPTY_FILTER, ...over };
}

describe("normalize", () => {
  it("lowercases", () => {
    expect(normalize("MERCADO")).toBe("mercado");
  });

  it("strips accents so a plain keyboard finds Spanish words", () => {
    expect(normalize("Cumpleaños")).toBe("cumpleanos");
    expect(normalize("Créditó")).toBe("credito");
  });

  it("trims surrounding whitespace", () => {
    expect(normalize("  uber  ")).toBe("uber");
  });

  it("survives an empty string", () => {
    expect(normalize("")).toBe("");
  });
});

describe("matchesText", () => {
  it("matches on the description", () => {
    expect(matchesText(entry({ description: "Mercado semanal" }), "semanal")).toBe(true);
  });

  it("matches on the category", () => {
    expect(matchesText(entry({ category: "Gasolina" }), "gasol")).toBe(true);
  });

  it("matches on the member", () => {
    expect(matchesText(entry({ member: "Yazmi" }), "yazmi")).toBe(true);
  });

  it("ignores accents in either direction", () => {
    const e = entry({ description: "Cumpleaños de Javi" });
    expect(matchesText(e, "cumpleanos")).toBe(true);
    expect(matchesText(entry({ description: "Cumpleanos" }), "cumpleaños")).toBe(true);
  });

  it("requires every term, across different fields", () => {
    const e = entry({ description: "Uber al aeropuerto", member: "Javi" });
    expect(matchesText(e, "uber javi")).toBe(true);
    expect(matchesText(e, "uber yazmi")).toBe(false);
  });

  it("treats an empty or whitespace query as no filter at all", () => {
    expect(matchesText(entry(), "")).toBe(true);
    expect(matchesText(entry(), "   ")).toBe(true);
  });
});

describe("amount bands", () => {
  it("exposes one band per id with a single open end at each extreme", () => {
    expect(AMOUNT_BANDS.map((b) => b.id)).toEqual(["all", "under25", "mid", "large", "xl"]);
    expect(bandFor("xl").max).toBeNull();
  });

  it("lets everything through the all band", () => {
    expect(matchesBand(0, "all")).toBe(true);
    expect(matchesBand(99999, "all")).toBe(true);
  });

  it("treats min as inclusive and max as exclusive", () => {
    expect(matchesBand(24.99, "under25")).toBe(true);
    expect(matchesBand(25, "under25")).toBe(false);
    expect(matchesBand(25, "mid")).toBe(true);
    expect(matchesBand(100, "mid")).toBe(false);
    expect(matchesBand(100, "large")).toBe(true);
    expect(matchesBand(500, "large")).toBe(false);
    expect(matchesBand(500, "xl")).toBe(true);
  });

  it("puts every amount in exactly one band", () => {
    const bands = ["under25", "mid", "large", "xl"] as const;
    for (const amount of [0, 1, 24.99, 25, 99.99, 100, 499.99, 500, 5000]) {
      expect(bands.filter((b) => matchesBand(amount, b))).toHaveLength(1);
    }
  });

  it("falls back to the open band for an unknown id", () => {
    expect(bandFor("nope" as never).id).toBe("all");
  });

  it("treats a non-finite amount as zero", () => {
    expect(matchesBand(NaN, "under25")).toBe(true);
    expect(matchesBand(NaN, "xl")).toBe(false);
  });
});

describe("filterEntries", () => {
  it("returns everything under the empty filter", () => {
    expect(filterEntries(ledger, EMPTY_FILTER)).toHaveLength(5);
  });

  it("narrows by category", () => {
    const rows = filterEntries(ledger, withFilter({ categories: ["Transporte Uber"] }));
    expect(rows.map((r) => r.id)).toEqual([2, 5]);
  });

  it("treats several categories as a union", () => {
    const rows = filterEntries(ledger, withFilter({ categories: ["Arriendo", "Cumpleaños"] }));
    expect(rows.map((r) => r.id)).toEqual([3, 4]);
  });

  it("narrows by member", () => {
    const rows = filterEntries(ledger, withFilter({ members: ["Javi"] }));
    expect(rows.map((r) => r.id)).toEqual([2, 5]);
  });

  it("narrows by amount band", () => {
    const rows = filterEntries(ledger, withFilter({ band: "under25" }));
    expect(rows.map((r) => r.id)).toEqual([3, 5]);
  });

  it("intersects the filters rather than unioning them", () => {
    const rows = filterEntries(
      ledger,
      withFilter({ members: ["Javi"], band: "mid", text: "uber" }),
    );
    expect(rows.map((r) => r.id)).toEqual([2]);
  });

  it("can end up with nothing", () => {
    expect(filterEntries(ledger, withFilter({ members: ["Yazmi"], band: "xl" }))).toEqual([]);
  });

  it("handles amounts that arrived as numeric strings", () => {
    const rows = filterEntries(
      [entry({ id: 9, amount: "12.5" as unknown as number })],
      withFilter({ band: "under25" }),
    );
    expect(rows).toHaveLength(1);
  });

  it("does not mutate the input", () => {
    const before = [...ledger];
    filterEntries(ledger, withFilter({ text: "uber" }));
    expect(ledger).toEqual(before);
  });
});

describe("sortEntries", () => {
  it("defaults to newest first", () => {
    expect(sortEntries(ledger, DEFAULT_SORT).map((r) => r.id)).toEqual([5, 3, 2, 1, 4]);
  });

  it("sorts oldest first", () => {
    expect(sortEntries(ledger, { key: "date", dir: "asc" }).map((r) => r.id)).toEqual([4, 1, 2, 3, 5]);
  });

  it("sorts by amount, largest first", () => {
    expect(sortEntries(ledger, { key: "amount", dir: "desc" }).map((r) => r.id)).toEqual([4, 1, 2, 3, 5]);
  });

  it("sorts by amount, smallest first", () => {
    expect(sortEntries(ledger, { key: "amount", dir: "asc" }).map((r) => r.id)).toEqual([5, 3, 2, 1, 4]);
  });

  it("breaks ties on descending id so the order never shuffles", () => {
    const tied = [
      entry({ id: 1, amount: 10, expense_at: "2026-09-01T10:00:00.000Z" }),
      entry({ id: 2, amount: 10, expense_at: "2026-09-01T10:00:00.000Z" }),
      entry({ id: 3, amount: 10, expense_at: "2026-09-01T10:00:00.000Z" }),
    ];
    expect(sortEntries(tied, { key: "amount", dir: "asc" }).map((r) => r.id)).toEqual([3, 2, 1]);
    expect(sortEntries(tied, { key: "date", dir: "desc" }).map((r) => r.id)).toEqual([3, 2, 1]);
  });

  it("returns a copy and leaves the source untouched", () => {
    const source = [...ledger];
    const sorted = sortEntries(source, { key: "amount", dir: "desc" });
    expect(sorted).not.toBe(source);
    expect(source.map((r) => r.id)).toEqual(ledger.map((r) => r.id));
  });

  it("handles an empty ledger", () => {
    expect(sortEntries([], DEFAULT_SORT)).toEqual([]);
  });
});

describe("isFilterActive", () => {
  it("is false for the empty filter", () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it("ignores a whitespace-only search", () => {
    expect(isFilterActive(withFilter({ text: "   " }))).toBe(false);
  });

  it.each([
    ["text", withFilter({ text: "uber" })],
    ["category", withFilter({ categories: ["Arriendo"] })],
    ["member", withFilter({ members: ["Javi"] })],
    ["band", withFilter({ band: "xl" })],
  ])("is true when %s is set", (_label, filter) => {
    expect(isFilterActive(filter)).toBe(true);
  });
});

describe("toggleValue", () => {
  it("adds a missing value", () => {
    expect(toggleValue([], "Javi")).toEqual(["Javi"]);
  });

  it("removes a present value", () => {
    expect(toggleValue(["Javi", "Yazmi"], "Javi")).toEqual(["Yazmi"]);
  });

  it("returns a new array", () => {
    const list = ["Javi"];
    expect(toggleValue(list, "Yazmi")).not.toBe(list);
    expect(list).toEqual(["Javi"]);
  });
});

describe("facets", () => {
  it("lists only the values present, ranked by spend", () => {
    const { categories, members } = facets(ledger);
    expect(categories.map((c) => c.value)).toEqual([
      "Arriendo",
      "Comida y Aseo",
      "Transporte Uber",
      "Cumpleaños",
    ]);
    expect(members.map((m) => m.value)).toEqual(["Adrian", "Yazmi", "Javi"]);
  });

  it("counts rows and sums amounts per value", () => {
    const uber = facets(ledger).categories.find((c) => c.value === "Transporte Uber");
    expect(uber).toEqual({ value: "Transporte Uber", count: 2, amount: 47 });
  });

  it("breaks equal spend alphabetically so the control order is stable", () => {
    const rows = [
      entry({ id: 1, category: "Gas", amount: 10 }),
      entry({ id: 2, category: "Agua", amount: 10 }),
    ];
    expect(facets(rows).categories.map((c) => c.value)).toEqual(["Agua", "Gas"]);
  });

  it("returns empty lists for an empty ledger", () => {
    expect(facets([])).toEqual({ categories: [], members: [] });
  });
});

describe("summarize", () => {
  it("counts, totals and averages the visible rows", () => {
    const rows = filterEntries(ledger, withFilter({ categories: ["Transporte Uber"] }));
    const s = summarize(rows, ledger);
    expect(s.count).toBe(2);
    expect(s.total).toBe(47);
    expect(s.average).toBe(23.5);
  });

  it("reports the share of the unfiltered month", () => {
    const rows = [entry({ id: 1, amount: 25 })];
    expect(summarize(rows, [entry({ id: 1, amount: 25 }), entry({ id: 2, amount: 75 })]).share).toBe(0.25);
  });

  it("is all zeros with nothing selected, and never divides by zero", () => {
    expect(summarize([], [])).toEqual({ count: 0, total: 0, average: 0, share: 0 });
  });

  it("is a full share when nothing is filtered out", () => {
    expect(summarize(ledger, ledger).share).toBe(1);
  });
});

describe("highlightSegments", () => {
  it("returns nothing for empty text", () => {
    expect(highlightSegments("", "uber")).toEqual([]);
  });

  it("returns one unmatched run when there is no query", () => {
    expect(highlightSegments("Mercado", "")).toEqual([{ text: "Mercado", match: false }]);
  });

  it("marks the matched run and keeps the original casing", () => {
    expect(highlightSegments("Mercado semanal", "merc")).toEqual([
      { text: "Merc", match: true },
      { text: "ado semanal", match: false },
    ]);
  });

  it("marks every occurrence of a term", () => {
    expect(highlightSegments("Uber ida, Uber vuelta", "uber")).toEqual([
      { text: "Uber", match: true },
      { text: " ida, ", match: false },
      { text: "Uber", match: true },
      { text: " vuelta", match: false },
    ]);
  });

  it("marks each term of a multi-term query", () => {
    expect(highlightSegments("Uber al aeropuerto", "uber aero")).toEqual([
      { text: "Uber", match: true },
      { text: " al ", match: false },
      { text: "aero", match: true },
      { text: "puerto", match: false },
    ]);
  });

  it("merges overlapping terms into one run instead of nesting", () => {
    expect(highlightSegments("Mercado", "merca cado")).toEqual([
      { text: "Mercado", match: true },
    ]);
  });

  it("maps accent-insensitive hits back onto the original characters", () => {
    expect(highlightSegments("Cumpleaños de Javi", "cumpleanos")).toEqual([
      { text: "Cumpleaños", match: true },
      { text: " de Javi", match: false },
    ]);
  });

  it("keeps the accented character intact when the match starts inside it", () => {
    expect(highlightSegments("añejo", "n")).toEqual([
      { text: "a", match: false },
      { text: "ñ", match: true },
      { text: "ejo", match: false },
    ]);
  });

  it("leaves text alone when nothing matches", () => {
    expect(highlightSegments("Mercado", "gasolina")).toEqual([
      { text: "Mercado", match: false },
    ]);
  });

  it("rebuilds the original text exactly, whatever the query", () => {
    const text = "Cumpleaños de Yazmi — Uber";
    for (const q of ["", "uber", "cumpleanos uber", "z", "  "]) {
      expect(highlightSegments(text, q).map((p) => p.text).join("")).toBe(text);
    }
  });
});
