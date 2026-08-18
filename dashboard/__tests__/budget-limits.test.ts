// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { getLimits, resetLimits, saveLimits } from "@/lib/budget-limits";
import { CATEGORIES, DEFAULT_BUDGETS, PERSONAL_BUDGETS } from "@/lib/data";

// Per-month, per-scope category limit overrides kept in localStorage. `month`
// is zero-based (JS Date convention) and the storage key is one-based.

const keyFor = (scope: string, ym: string) => `n2s_budget_limits:${scope}:${ym}`;

describe("getLimits", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("falls back to the family default budgets when nothing is saved", () => {
    expect(getLimits("family", 2026, 7)).toEqual(DEFAULT_BUDGETS);
  });

  it("falls back to the personal budgets for the personal scope", () => {
    expect(getLimits("personal", 2026, 7)).toEqual(PERSONAL_BUDGETS);
  });

  it("treats any unrecognised scope as the family scope", () => {
    expect(getLimits("something-else", 2026, 7)).toEqual(DEFAULT_BUDGETS);
  });

  it("merges saved overrides over the defaults", () => {
    localStorage.setItem(keyFor("family", "2026-08"), JSON.stringify({ Gasolina: 500 }));
    const limits = getLimits("family", 2026, 7);
    expect(limits.Gasolina).toBe(500);
    expect(limits.Arriendo).toBe(DEFAULT_BUDGETS.Arriendo);
  });

  it("returns every category even when only one is overridden", () => {
    localStorage.setItem(keyFor("family", "2026-08"), JSON.stringify({ Gasolina: 500 }));
    expect(Object.keys(getLimits("family", 2026, 7)).sort()).toEqual([...CATEGORIES].sort());
  });

  it("accepts a zero override rather than treating it as missing", () => {
    localStorage.setItem(keyFor("family", "2026-08"), JSON.stringify({ Arriendo: 0 }));
    expect(getLimits("family", 2026, 7).Arriendo).toBe(0);
  });

  it("ignores overrides that are not numbers", () => {
    localStorage.setItem(
      keyFor("family", "2026-08"),
      JSON.stringify({ Gasolina: "500", Agua: null, Gas: true }),
    );
    const limits = getLimits("family", 2026, 7);
    expect(limits.Gasolina).toBe(DEFAULT_BUDGETS.Gasolina);
    expect(limits.Agua).toBe(DEFAULT_BUDGETS.Agua);
    expect(limits.Gas).toBe(DEFAULT_BUDGETS.Gas);
  });

  it("ignores saved keys that are not known categories", () => {
    localStorage.setItem(keyFor("family", "2026-08"), JSON.stringify({ NotACategory: 999 }));
    expect(getLimits("family", 2026, 7)).toEqual(DEFAULT_BUDGETS);
  });

  it("falls back to the defaults when the saved value is malformed JSON", () => {
    localStorage.setItem(keyFor("family", "2026-08"), "{not json");
    expect(getLimits("family", 2026, 7)).toEqual(DEFAULT_BUDGETS);
  });

  it("does not leak overrides across scopes or months", () => {
    localStorage.setItem(keyFor("family", "2026-08"), JSON.stringify({ Gasolina: 500 }));
    expect(getLimits("family", 2026, 8).Gasolina).toBe(DEFAULT_BUDGETS.Gasolina);
    expect(getLimits("family", 2025, 7).Gasolina).toBe(DEFAULT_BUDGETS.Gasolina);
    expect(getLimits("personal", 2026, 7).Gasolina).toBe(PERSONAL_BUDGETS.Gasolina);
  });

  it("never mutates the shared default budgets", () => {
    localStorage.setItem(keyFor("family", "2026-08"), JSON.stringify({ Arriendo: 1 }));
    getLimits("family", 2026, 7);
    expect(DEFAULT_BUDGETS.Arriendo).toBe(2950);
  });
});

describe("month key generation", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("writes a one-based, zero-padded month for a zero-based month argument", () => {
    saveLimits("family", 2026, 0, { Gasolina: 1 });
    expect(localStorage.getItem(keyFor("family", "2026-01"))).toBe('{"Gasolina":1}');

    saveLimits("family", 2026, 11, { Gasolina: 2 });
    expect(localStorage.getItem(keyFor("family", "2026-12"))).toBe('{"Gasolina":2}');
  });

  it("namespaces the key by scope", () => {
    saveLimits("personal", 2026, 7, { Gasolina: 3 });
    expect(localStorage.getItem(keyFor("personal", "2026-08"))).toBe('{"Gasolina":3}');
    expect(localStorage.getItem(keyFor("family", "2026-08"))).toBeNull();
  });

  it("does not normalise an out-of-range month", () => {
    // Quirk: month 12 becomes "13" rather than rolling over into the next year.
    saveLimits("family", 2026, 12, { Gasolina: 4 });
    expect(localStorage.getItem(keyFor("family", "2026-13"))).toBe('{"Gasolina":4}');
  });
});

describe("saveLimits / resetLimits round trip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("reads back what was saved", () => {
    saveLimits("family", 2026, 7, { ...DEFAULT_BUDGETS, Gasolina: 750 });
    expect(getLimits("family", 2026, 7).Gasolina).toBe(750);
  });

  it("returns to the defaults after a reset", () => {
    saveLimits("family", 2026, 7, { ...DEFAULT_BUDGETS, Gasolina: 750 });
    resetLimits("family", 2026, 7);
    expect(getLimits("family", 2026, 7)).toEqual(DEFAULT_BUDGETS);
    expect(localStorage.getItem(keyFor("family", "2026-08"))).toBeNull();
  });

  it("leaves other months untouched when one is reset", () => {
    saveLimits("family", 2026, 7, { ...DEFAULT_BUDGETS, Gasolina: 750 });
    saveLimits("family", 2026, 8, { ...DEFAULT_BUDGETS, Gasolina: 900 });
    resetLimits("family", 2026, 7);
    expect(getLimits("family", 2026, 8).Gasolina).toBe(900);
  });
});
