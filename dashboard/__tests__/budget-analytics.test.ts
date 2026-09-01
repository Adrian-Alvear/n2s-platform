import { describe, expect, it } from "vitest";
import {
  OTHER_SLICE,
  biggestMover,
  categoryAlerts,
  categoryBreakdown,
  categoryDetail,
  daysInMonth,
  donutSegments,
  elapsedDays,
  isCurrentMonth,
  largestEntry,
  pace,
  splitByMonth,
  sumByCategory,
  sumByMember,
  topSpender,
  total,
  type LedgerEntry,
} from "@/lib/budget-analytics";

// Pure derivations over the entries ledger. `now` is injected everywhere, so
// every pace assertion below is a fixed date rather than "today".

let nextId = 1;
function entry(partial: Partial<LedgerEntry> = {}): LedgerEntry {
  return {
    id: partial.id ?? nextId++,
    expense_at: partial.expense_at ?? "2026-09-10T12:00:00.000Z",
    description: partial.description ?? "Algo",
    category: partial.category ?? "Comida y Aseo",
    amount: partial.amount ?? 10,
    member: partial.member ?? "Adrian",
  };
}

/** Local-midnight ISO string, so month bucketing does not depend on the TZ. */
function localDay(year: number, month: number, day: number): string {
  return new Date(year, month, day, 12, 0, 0).toISOString();
}

describe("total", () => {
  it("is zero for an empty ledger", () => {
    expect(total([])).toBe(0);
  });

  it("sums the amounts", () => {
    expect(total([entry({ amount: 10 }), entry({ amount: 2.5 })])).toBe(12.5);
  });

  it("coerces the numeric strings Postgres can hand back", () => {
    const rows = [entry({ amount: "20.50" as unknown as number })];
    expect(total(rows)).toBe(20.5);
  });

  it("treats an unparseable amount as zero rather than NaN", () => {
    const rows = [entry({ amount: "abc" as unknown as number }), entry({ amount: 5 })];
    expect(total(rows)).toBe(5);
  });
});

describe("sumByCategory", () => {
  it("groups amounts under their category", () => {
    const rows = [
      entry({ category: "Gasolina", amount: 40 }),
      entry({ category: "Gasolina", amount: 20 }),
      entry({ category: "Agua", amount: 15 }),
    ];
    expect(sumByCategory(rows)).toEqual({ Gasolina: 60, Agua: 15 });
  });

  it("returns an empty map for an empty ledger", () => {
    expect(sumByCategory([])).toEqual({});
  });
});

describe("sumByMember", () => {
  it("groups amounts under their member", () => {
    const rows = [
      entry({ member: "Javi", amount: 30 }),
      entry({ member: "Yazmi", amount: 12 }),
      entry({ member: "Javi", amount: 8 }),
    ];
    expect(sumByMember(rows)).toEqual({ Javi: 38, Yazmi: 12 });
  });
});

describe("daysInMonth", () => {
  it("knows the long months", () => {
    expect(daysInMonth(2026, 0)).toBe(31);
  });

  it("knows the short months", () => {
    expect(daysInMonth(2026, 8)).toBe(30);
  });

  it("handles a common-year February", () => {
    expect(daysInMonth(2026, 1)).toBe(28);
  });

  it("handles a leap-year February", () => {
    expect(daysInMonth(2028, 1)).toBe(29);
  });
});

describe("elapsedDays", () => {
  it("is the day of the month inside the live month", () => {
    expect(elapsedDays(2026, 8, new Date(2026, 8, 12, 9))).toBe(12);
  });

  it("is the whole span for a month already closed", () => {
    expect(elapsedDays(2026, 7, new Date(2026, 8, 1))).toBe(31);
  });

  it("is zero for a month that has not started", () => {
    expect(elapsedDays(2026, 9, new Date(2026, 8, 30))).toBe(0);
  });

  it("counts the first day as one, not zero", () => {
    expect(elapsedDays(2026, 8, new Date(2026, 8, 1, 0, 1))).toBe(1);
  });
});

describe("isCurrentMonth", () => {
  it("is true for the month containing now", () => {
    expect(isCurrentMonth(2026, 8, new Date(2026, 8, 20))).toBe(true);
  });

  it("is false for a different month of the same year", () => {
    expect(isCurrentMonth(2026, 7, new Date(2026, 8, 20))).toBe(false);
  });

  it("is false for the same month of a different year", () => {
    expect(isCurrentMonth(2025, 8, new Date(2026, 8, 20))).toBe(false);
  });
});

describe("pace", () => {
  it("extrapolates the live month to the full span", () => {
    // $300 over 10 of 30 days = $30/day = $900 projected.
    const p = pace(300, 1000, 2026, 8, new Date(2026, 8, 10, 12));
    expect(p.perDay).toBe(30);
    expect(p.projected).toBe(900);
    expect(p.overBy).toBe(-100);
    expect(p.daysLeft).toBe(20);
    expect(p.live).toBe(true);
  });

  it("reports a projection over the limit as a positive overBy", () => {
    const p = pace(600, 1000, 2026, 8, new Date(2026, 8, 10, 12));
    expect(p.projected).toBe(1800);
    expect(p.overBy).toBe(800);
  });

  it("does not extrapolate a closed month — its projection is what it spent", () => {
    const p = pace(750, 1000, 2026, 7, new Date(2026, 8, 10));
    expect(p.projected).toBe(750);
    expect(p.live).toBe(false);
    expect(p.daysLeft).toBe(0);
  });

  it("has no rate to extrapolate before the month begins", () => {
    const p = pace(0, 1000, 2026, 9, new Date(2026, 8, 10));
    expect(p.perDay).toBe(0);
    expect(p.projected).toBe(0);
    expect(p.elapsed).toBe(0);
  });

  it("keeps daysLeft at zero rather than going negative", () => {
    expect(pace(10, 100, 2026, 1, new Date(2026, 5, 1)).daysLeft).toBe(0);
  });
});

describe("categoryAlerts", () => {
  const now = new Date(2026, 8, 10, 12); // 10 of 30 days elapsed

  it("flags a category already past its limit", () => {
    const alerts = categoryAlerts({ Gasolina: 300 }, { Gasolina: 220 }, 2026, 8, now);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].already).toBe(true);
    expect(alerts[0].spent).toBe(300);
  });

  it("flags a category merely on pace to pass its limit", () => {
    // $100 in 10 days projects to $300 against a $220 limit.
    const alerts = categoryAlerts({ Gasolina: 100 }, { Gasolina: 220 }, 2026, 8, now);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].already).toBe(false);
    expect(alerts[0].overBy).toBeCloseTo(80);
  });

  it("stays quiet for a category tracking under its limit", () => {
    expect(categoryAlerts({ Agua: 40 }, { Agua: 140 }, 2026, 8, now)).toEqual([]);
  });

  it("skips categories with no limit set — there is nothing to exceed", () => {
    expect(categoryAlerts({ Otros: 500 }, { Otros: 0 }, 2026, 8, now)).toEqual([]);
  });

  it("skips categories with no spend", () => {
    expect(categoryAlerts({ Agua: 0 }, { Agua: 140 }, 2026, 8, now)).toEqual([]);
  });

  it("ranks the worst overrun first", () => {
    const alerts = categoryAlerts(
      { Gasolina: 100, "Comida y Aseo": 400 },
      { Gasolina: 220, "Comida y Aseo": 600 },
      2026,
      8,
      now,
    );
    expect(alerts.map((a) => a.category)).toEqual(["Comida y Aseo", "Gasolina"]);
  });
});

describe("biggestMover", () => {
  it("picks the largest dollar change, not the largest percentage", () => {
    const current = [entry({ category: "Arriendo", amount: 2950 }), entry({ category: "Agua", amount: 8 })];
    const previous = [entry({ category: "Arriendo", amount: 2950 }), entry({ category: "Agua", amount: 2 })];
    const mover = biggestMover(current, previous);
    expect(mover?.category).toBe("Agua");
    expect(mover?.delta).toBe(6);
  });

  it("reports a fall as a negative delta", () => {
    const mover = biggestMover(
      [entry({ category: "Gasolina", amount: 40 })],
      [entry({ category: "Gasolina", amount: 200 })],
    );
    expect(mover?.delta).toBe(-160);
  });

  it("sees a category that appeared this month", () => {
    const mover = biggestMover([entry({ category: "Cumpleaños", amount: 90 })], []);
    expect(mover).toEqual({ category: "Cumpleaños", current: 90, previous: 0, delta: 90 });
  });

  it("is null when nothing moved at all", () => {
    const rows = [entry({ category: "Agua", amount: 50 })];
    expect(biggestMover(rows, [entry({ category: "Agua", amount: 50 })])).toBeNull();
  });

  it("is null for two empty months", () => {
    expect(biggestMover([], [])).toBeNull();
  });
});

describe("topSpender", () => {
  it("names the biggest spender with their share of the month", () => {
    const rows = [
      entry({ member: "Adrian", amount: 75 }),
      entry({ member: "Javi", amount: 25 }),
    ];
    expect(topSpender(rows)).toEqual({ member: "Adrian", amount: 75, share: 0.75 });
  });

  it("is null for an empty ledger", () => {
    expect(topSpender([])).toBeNull();
  });

  it("is null when every entry is zero", () => {
    expect(topSpender([entry({ amount: 0 })])).toBeNull();
  });
});

describe("largestEntry", () => {
  it("returns the single biggest line", () => {
    const big = entry({ amount: 2950, description: "Arriendo" });
    expect(largestEntry([entry({ amount: 12 }), big, entry({ amount: 300 })])).toBe(big);
  });

  it("is null for an empty ledger", () => {
    expect(largestEntry([])).toBeNull();
  });

  it("is null when nothing was actually spent", () => {
    expect(largestEntry([entry({ amount: 0 })])).toBeNull();
  });
});

describe("splitByMonth", () => {
  it("separates the selected month from the one before it", () => {
    const rows = [
      entry({ expense_at: localDay(2026, 8, 5) }),
      entry({ expense_at: localDay(2026, 7, 20) }),
    ];
    const { current, previous } = splitByMonth(rows, 2026, 8);
    expect(current).toHaveLength(1);
    expect(previous).toHaveLength(1);
  });

  it("drops rows outside the two-month window", () => {
    const rows = [entry({ expense_at: localDay(2026, 5, 5) })];
    const { current, previous } = splitByMonth(rows, 2026, 8);
    expect(current).toEqual([]);
    expect(previous).toEqual([]);
  });

  it("puts the first instant of the month in current", () => {
    const rows = [entry({ expense_at: new Date(2026, 8, 1, 0, 0, 0).toISOString() })];
    expect(splitByMonth(rows, 2026, 8).current).toHaveLength(1);
  });

  it("rolls back across a year boundary for January", () => {
    const rows = [entry({ expense_at: localDay(2025, 11, 15) })];
    expect(splitByMonth(rows, 2026, 0).previous).toHaveLength(1);
  });
});

describe("categoryBreakdown", () => {
  it("returns nothing for an empty ledger", () => {
    expect(categoryBreakdown([])).toEqual({ slices: [], total: 0 });
  });

  it("ranks categories by spend, largest first", () => {
    const rows = [
      entry({ category: "Agua", amount: 15 }),
      entry({ category: "Arriendo", amount: 2950 }),
      entry({ category: "Gasolina", amount: 60 }),
    ];
    const { slices } = categoryBreakdown(rows);
    expect(slices.map((s) => s.category)).toEqual(["Arriendo", "Gasolina", "Agua"]);
  });

  it("shares sum to one across the slices", () => {
    const rows = [
      entry({ category: "Agua", amount: 25 }),
      entry({ category: "Gasolina", amount: 75 }),
    ];
    const { slices, total: grand } = categoryBreakdown(rows);
    expect(grand).toBe(100);
    expect(slices.map((s) => s.share)).toEqual([0.75, 0.25]);
  });

  it("leaves every category named when they fit under the cap", () => {
    const rows = [
      entry({ category: "Agua", amount: 10 }),
      entry({ category: "Gas", amount: 20 }),
    ];
    const { slices } = categoryBreakdown(rows, 5);
    expect(slices.every((s) => s.rolled.length === 0)).toBe(true);
  });

  it("folds everything past the cap into one remainder slice", () => {
    const rows = [
      entry({ category: "Arriendo", amount: 1000 }),
      entry({ category: "Carro", amount: 500 }),
      entry({ category: "Agua", amount: 30 }),
      entry({ category: "Gas", amount: 20 }),
      entry({ category: "Internet", amount: 10 }),
    ];
    const { slices } = categoryBreakdown(rows, 3);
    expect(slices).toHaveLength(3);
    expect(slices[2].category).toBe(OTHER_SLICE);
    expect(slices[2].amount).toBe(60);
    expect(slices[2].rolled).toEqual(["Agua", "Gas", "Internet"]);
  });

  it("still accounts for the whole month once rolled up", () => {
    const rows = [
      entry({ category: "Arriendo", amount: 1000 }),
      entry({ category: "Carro", amount: 500 }),
      entry({ category: "Agua", amount: 30 }),
    ];
    const { slices, total: grand } = categoryBreakdown(rows, 2);
    expect(slices.reduce((s, x) => s + x.amount, 0)).toBe(grand);
  });

  it("never uses the real 'Otros' category as the rollup key", () => {
    const rows = [
      entry({ category: "Arriendo", amount: 1000 }),
      entry({ category: "Otros", amount: 40 }),
      entry({ category: "Agua", amount: 30 }),
    ];
    const { slices } = categoryBreakdown(rows, 2);
    expect(slices[1].category).toBe(OTHER_SLICE);
    expect(slices[1].rolled).toContain("Otros");
  });

  it("breaks ties alphabetically so the order is stable", () => {
    const rows = [
      entry({ category: "Gasolina", amount: 50 }),
      entry({ category: "Agua", amount: 50 }),
    ];
    expect(categoryBreakdown(rows).slices.map((s) => s.category)).toEqual(["Agua", "Gasolina"]);
  });

  it("ignores categories with no spend", () => {
    const rows = [entry({ category: "Agua", amount: 0 }), entry({ category: "Gas", amount: 5 })];
    expect(categoryBreakdown(rows).slices.map((s) => s.category)).toEqual(["Gas"]);
  });

  it("clamps a nonsensical cap to a single rollup slice", () => {
    const rows = [
      entry({ category: "Agua", amount: 10 }),
      entry({ category: "Gas", amount: 20 }),
    ];
    const { slices } = categoryBreakdown(rows, 0);
    expect(slices).toHaveLength(1);
    expect(slices[0].category).toBe(OTHER_SLICE);
    expect(slices[0].amount).toBe(30);
  });
});

describe("donutSegments", () => {
  it("splits a full ring proportionally", () => {
    expect(donutSegments([1, 1, 1, 1], 100)).toEqual([
      { dash: 25, offset: -0 },
      { dash: 25, offset: -25 },
      { dash: 25, offset: -50 },
      { dash: 25, offset: -75 },
    ]);
  });

  it("gives a single value the whole ring and no gap", () => {
    expect(donutSegments([5], 100, 2)).toEqual([{ dash: 100, offset: -0 }]);
  });

  it("subtracts the gap from every arc when there is more than one", () => {
    const segments = donutSegments([1, 1], 100, 2);
    expect(segments.map((s) => s.dash)).toEqual([48, 48]);
    expect(segments.map((s) => s.offset)).toEqual([-0, -50]);
  });

  it("never produces a negative arc when the gap exceeds the slice", () => {
    const segments = donutSegments([100, 0.01], 100, 5);
    expect(segments[1].dash).toBe(0);
  });

  it("draws nothing when there is no spend at all", () => {
    expect(donutSegments([0, 0], 100)).toEqual([
      { dash: 0, offset: 0 },
      { dash: 0, offset: 0 },
    ]);
  });

  it("gives no arc to a zero or negative value but keeps its slot", () => {
    const segments = donutSegments([1, 0, 1], 100);
    expect(segments).toHaveLength(3);
    expect(segments[1].dash).toBe(0);
    expect(segments[2].offset).toBe(-50);
  });

  it("scales to whatever circumference it is handed", () => {
    expect(donutSegments([1, 3], 200)[1].dash).toBe(150);
  });
});

describe("categoryDetail", () => {
  const now = new Date(2026, 8, 10, 12); // 10 of 30 days elapsed

  it("sums only its own category and reports its share of the month", () => {
    const current = [
      entry({ category: "Gasolina", amount: 60 }),
      entry({ category: "Gasolina", amount: 40 }),
      entry({ category: "Agua", amount: 100 }),
    ];
    const d = categoryDetail("Gasolina", current, [], 220, 2026, 8, now);
    expect(d.spent).toBe(100);
    expect(d.share).toBe(0.5);
    expect(d.count).toBe(2);
    expect(d.average).toBe(50);
  });

  it("orders its entries newest first", () => {
    const current = [
      entry({ id: 1, category: "Agua", expense_at: localDay(2026, 8, 2) }),
      entry({ id: 2, category: "Agua", expense_at: localDay(2026, 8, 9) }),
    ];
    expect(categoryDetail("Agua", current, [], 140, 2026, 8, now).entries.map((e) => e.id)).toEqual([2, 1]);
  });

  it("breaks a timestamp tie on the id so the order is stable", () => {
    const stamp = localDay(2026, 8, 4);
    const current = [
      entry({ id: 7, category: "Agua", expense_at: stamp }),
      entry({ id: 9, category: "Agua", expense_at: stamp }),
    ];
    expect(categoryDetail("Agua", current, [], 140, 2026, 8, now).entries.map((e) => e.id)).toEqual([9, 7]);
  });

  it("does not reorder the caller's array", () => {
    const current = [
      entry({ id: 1, category: "Agua", expense_at: localDay(2026, 8, 2) }),
      entry({ id: 2, category: "Agua", expense_at: localDay(2026, 8, 9) }),
    ];
    categoryDetail("Agua", current, [], 140, 2026, 8, now);
    expect(current.map((e) => e.id)).toEqual([1, 2]);
  });

  it("compares against the same category last month", () => {
    const d = categoryDetail(
      "Gasolina",
      [entry({ category: "Gasolina", amount: 80 })],
      [entry({ category: "Gasolina", amount: 200 }), entry({ category: "Agua", amount: 999 })],
      220,
      2026,
      8,
      now,
    );
    expect(d.previous).toBe(200);
    expect(d.delta).toBe(-120);
  });

  it("carries the pace projection for the category", () => {
    const d = categoryDetail("Gasolina", [entry({ category: "Gasolina", amount: 100 })], [], 220, 2026, 8, now);
    expect(d.pace.projected).toBe(300);
    expect(d.pace.overBy).toBe(80);
  });

  it("names who spent most within the category, not across the month", () => {
    const current = [
      entry({ category: "Gasolina", member: "Javi", amount: 90 }),
      entry({ category: "Gasolina", member: "Adrian", amount: 10 }),
      entry({ category: "Agua", member: "Adrian", amount: 500 }),
    ];
    expect(categoryDetail("Gasolina", current, [], 220, 2026, 8, now).topMember?.member).toBe("Javi");
  });

  it("is empty but not broken for a category with no spend", () => {
    const d = categoryDetail("Cumpleaños", [entry({ category: "Agua", amount: 10 })], [], 33, 2026, 8, now);
    expect(d.spent).toBe(0);
    expect(d.count).toBe(0);
    expect(d.average).toBe(0);
    expect(d.share).toBe(0);
    expect(d.topMember).toBeNull();
  });
});
