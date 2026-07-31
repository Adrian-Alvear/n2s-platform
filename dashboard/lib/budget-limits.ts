import { DEFAULT_BUDGETS, PERSONAL_BUDGETS, CATEGORIES, type Category } from "@/lib/data";

// Per-month, per-scope category limit overrides. Lets the family reallocate
// budget between categories (move leftover from one envelope to cover another)
// without touching the base budgets. Stored on the device; falls back to the
// default budgets for any category with no override, and resets each month.

export type Limits = Record<string, number>;

function baseFor(scope: string): Record<Category, number> {
  return scope === "personal" ? PERSONAL_BUDGETS : DEFAULT_BUDGETS;
}

function key(scope: string, year: number, month: number): string {
  return `n2s_budget_limits:${scope}:${year}-${String(month + 1).padStart(2, "0")}`;
}

// Effective limits = base budgets with any saved overrides applied.
export function getLimits(scope: string, year: number, month: number): Limits {
  const base = baseFor(scope);
  const limits: Limits = { ...base };
  try {
    const saved = JSON.parse(localStorage.getItem(key(scope, year, month)) || "{}");
    for (const c of CATEGORIES) {
      if (typeof saved[c] === "number") limits[c] = saved[c];
    }
  } catch {
    /* ignore */
  }
  return limits;
}

export function saveLimits(scope: string, year: number, month: number, limits: Limits) {
  try {
    localStorage.setItem(key(scope, year, month), JSON.stringify(limits));
  } catch {
    /* ignore */
  }
}

export function resetLimits(scope: string, year: number, month: number) {
  try {
    localStorage.removeItem(key(scope, year, month));
  } catch {
    /* ignore */
  }
}
