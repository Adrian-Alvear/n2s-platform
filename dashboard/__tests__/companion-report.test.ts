import { describe, it, expect } from "vitest";
import { buildReport } from "@/lib/companion-report";
import type { LedgerEntry } from "@/lib/budget-analytics";

const MID_MONTH = new Date(2026, 5, 15, 12, 0, 0); // 15 June, half elapsed

function entry(category: string, amount: number, member = "Adrian"): LedgerEntry {
  return {
    expense_at: new Date(2026, 5, 5).toISOString(),
    description: "x",
    category,
    amount,
    member,
  } as LedgerEntry;
}

describe("buildReport", () => {
  it("returns nothing when there are no entries", () => {
    expect(buildReport([], { Gas: 100 }, 100, 2026, 5, MID_MONTH)).toBeNull();
  });

  it("prefers an already-blown limit over everything else", () => {
    const r = buildReport([entry("Gas", 150)], { Gas: 100 }, 100, 2026, 5, MID_MONTH);
    expect(r?.urgent).toBe(true);
    expect(r?.text).toContain("Gas");
    expect(r?.text).toContain("over by $50");
  });

  it("falls back to a forecast overrun when nothing is blown yet", () => {
    // $80 of a $100 limit at half a month projects to ~$160.
    const r = buildReport([entry("Gas", 80)], { Gas: 100 }, 100, 2026, 5, MID_MONTH);
    expect(r?.urgent).toBe(true);
    expect(r?.text).toMatch(/tracking \d+% over/);
  });

  it("reports remaining budget when pace is healthy", () => {
    const r = buildReport([entry("Gas", 10)], { Gas: 1000 }, 1000, 2026, 5, MID_MONTH);
    expect(r?.urgent).toBe(false);
    expect(r?.text).toMatch(/left with \d+ days? to go/);
  });

  it("never reports a category with no limit set", () => {
    // Zero limit means nothing to exceed, so this must not be an alert.
    const r = buildReport([entry("Otros", 500)], { Otros: 0 }, 0, 2026, 5, MID_MONTH);
    expect(r?.urgent).toBe(false);
  });

  it("falls back to the top spender when there is no budget at all", () => {
    const r = buildReport(
      [entry("Otros", 80, "Javi"), entry("Otros", 20, "Yazmi")],
      {},
      0,
      2026,
      5,
      MID_MONTH,
    );
    expect(r?.text).toContain("Javi");
    expect(r?.text).toContain("80%");
  });

  it("singularises the final day", () => {
    const lastDay = new Date(2026, 5, 29, 12, 0, 0);
    const r = buildReport([entry("Gas", 10)], { Gas: 1000 }, 1000, 2026, 5, lastDay);
    expect(r?.text).toContain("1 day to go");
  });
});
