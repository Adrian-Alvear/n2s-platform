import {
  sumByCategory,
  categoryAlerts,
  pace,
  topSpender,
  total,
  type LedgerEntry,
} from "@/lib/budget-analytics";

/**
 * The single most useful sentence the companion can say right now.
 *
 * Ordered by how much it should interrupt: a blown limit outranks a forecast
 * one, which outranks a whole-budget pace warning, which outranks trivia. Only
 * one line is ever returned — a drone that lists things is a dashboard, and
 * there is already a dashboard.
 */
export type Report = { text: string; urgent: boolean };

export function buildReport(
  entries: LedgerEntry[],
  limits: Record<string, number>,
  totalBudget: number,
  year: number,
  month: number,
  now: Date,
): Report | null {
  if (entries.length === 0) return null;

  const byCategory = sumByCategory(entries);
  const alerts = categoryAlerts(byCategory, limits, year, month, now);

  const blown = alerts.find((a) => a.already);
  if (blown) {
    // `overBy` on an alert is the PROJECTED overage. This sentence is present
    // tense, so it has to state the actual overage or it overstates the damage.
    const actual = blown.spent - blown.limit;
    return {
      text: `${blown.category} is over by $${actual.toFixed(0)}.`,
      urgent: true,
    };
  }

  if (alerts.length > 0) {
    const a = alerts[0];
    const pct = a.limit > 0 ? Math.round((a.overBy / a.limit) * 100) : 0;
    return {
      text: `${a.category} is tracking ${pct}% over.`,
      urgent: true,
    };
  }

  if (totalBudget > 0) {
    const p = pace(total(entries), totalBudget, year, month, now);
    if (p.live && p.overBy > 0) {
      return { text: `On pace to exceed budget by $${p.overBy.toFixed(0)}.`, urgent: true };
    }
    if (p.live && p.daysLeft > 0) {
      const left = p.limit - p.spent;
      return {
        text: `$${left.toFixed(0)} left with ${p.daysLeft} ${p.daysLeft === 1 ? "day" : "days"} to go.`,
        urgent: false,
      };
    }
  }

  const spender = topSpender(entries);
  if (spender) {
    return {
      text: `${spender.member} drove ${Math.round(spender.share * 100)}% of spend.`,
      urgent: false,
    };
  }

  return null;
}
