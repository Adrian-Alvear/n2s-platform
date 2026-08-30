// Savings goals — the reference plate's "My goals" panel. Device-local, like
// the payments and accounts stores: goals are aspirational targets, not ledger
// facts, so they deliberately do not touch the shared `entries` table.

export type Goal = {
  id: string;
  name: string;
  saved: number;
  target: number;
  /** Emoji standing in for the reference's product thumbnails. */
  icon: string;
};

export const GOALS_KEY = "n2s_goals";

export const DEFAULT_GOALS: Goal[] = [
  { id: "emergency", name: "Fondo de emergencia", saved: 0, target: 5000, icon: "🛟" },
  { id: "travel", name: "Viaje", saved: 0, target: 2500, icon: "✈️" },
];

export function getGoals(): Goal[] {
  try {
    const s = JSON.parse(localStorage.getItem(GOALS_KEY) || "null");
    if (Array.isArray(s)) return s;
  } catch {
    /* ignore */
  }
  // Copy, so a caller mutating the result cannot corrupt the module-level
  // defaults for every later caller. Matches getPayments().
  return DEFAULT_GOALS.map((g) => ({ ...g }));
}

export function saveGoals(items: Goal[]) {
  try {
    localStorage.setItem(GOALS_KEY, JSON.stringify(items));
  } catch {
    /* ignore */
  }
}

/** Progress as a percentage, clamped to 0-100 and safe when target is 0. */
export function goalPct(g: Goal): number {
  if (g.target <= 0) return 0;
  return Math.min(100, Math.max(0, (g.saved / g.target) * 100));
}

export function goalsTotal(items: Goal[]): { saved: number; target: number } {
  return items.reduce(
    (acc, g) => ({ saved: acc.saved + g.saved, target: acc.target + g.target }),
    { saved: 0, target: 0 },
  );
}
