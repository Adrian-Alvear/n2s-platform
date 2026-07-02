// Builds the live context (current-month budget + top AI headlines) that gets
// passed to the assistant so it can answer questions about the family's data.
// Shared by the full chat page and the inline dashboard chat.

import { supabase } from "@/lib/supabase";
import { DEFAULT_BUDGETS, INCOME } from "@/lib/data";

type Entry = { category: string; amount: number; member: string; description: string; expense_at: string };

const totalBudget = Object.values(DEFAULT_BUDGETS).reduce((s, v) => s + v, 0);
const totalIncome = Object.values(INCOME).reduce((s, v) => s + v, 0);

export async function buildChatContext(): Promise<string> {
  const parts: string[] = [];

  // Budget summary for the current month
  try {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    const { data } = await supabase
      .from("entries")
      .select("*")
      .gte("expense_at", from)
      .lt("expense_at", to)
      .order("expense_at", { ascending: false });
    const entries = (data ?? []) as Entry[];
    const spent = entries.reduce((s, e) => s + e.amount, 0);
    const byCat = new Map<string, number>();
    for (const e of entries) byCat.set(e.category, (byCat.get(e.category) ?? 0) + e.amount);
    const catLines = [...byCat.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([c, amt]) => `  - ${c}: $${amt.toFixed(0)} spent of $${(DEFAULT_BUDGETS as Record<string, number>)[c] ?? 0} budget`)
      .join("\n");
    const recent = entries
      .slice(0, 8)
      .map((e) => `  - ${e.description} (${e.category}): $${e.amount.toFixed(0)} by ${e.member}`)
      .join("\n");
    const month = now.toLocaleDateString("en", { month: "long", year: "numeric" });

    parts.push(
      `BUDGET (${month}):\n` +
        `  Monthly income: $${totalIncome}\n` +
        `  Total budget: $${totalBudget}\n` +
        `  Total spent: $${spent.toFixed(0)}\n` +
        `  Remaining: $${(totalBudget - spent).toFixed(0)}\n` +
        `  Spending by category:\n${catLines || "  (none yet)"}\n` +
        `  Recent transactions:\n${recent || "  (none yet)"}`
    );
  } catch {
    /* budget context is best-effort */
  }

  // Top AI headlines
  try {
    const res = await fetch("/api/news?category=ai");
    const { items } = await res.json();
    const heads = (items ?? [])
      .slice(0, 8)
      .map((n: { title: string; source: string }) => `  - ${n.title} (${n.source})`)
      .join("\n");
    if (heads) parts.push(`LATEST AI NEWS HEADLINES:\n${heads}`);
  } catch {
    /* news context is best-effort */
  }

  return parts.join("\n\n");
}
