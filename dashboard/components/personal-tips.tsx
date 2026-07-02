"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { parseDigest } from "@/lib/digest";

type Accounts = { checking: number; savings: number; credit: number };

export function PersonalTips({
  income, budget, spent, accounts, spentByCategory, budgets,
}: {
  income: number;
  budget: number;
  spent: number;
  accounts: Accounts;
  spentByCategory: Record<string, number>;
  budgets: Record<string, number>;
}) {
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function generate() {
    setLoading(true);
    setDone(true);
    const cats = Object.entries(spentByCategory)
      .filter(([, v]) => v > 0)
      .map(([c, v]) => `  - ${c}: $${v.toFixed(0)} spent of $${(budgets[c] ?? 0).toFixed(0)} budget`)
      .join("\n");
    const summary =
      `Adrian's personal finances this month (USD):\n` +
      `  Income: $${income}\n  Budgeted: $${budget}\n  Spent so far: $${spent.toFixed(0)}\n` +
      `  Checking: $${accounts.checking}\n  Savings: $${accounts.savings}\n  Credit owed: $${accounts.credit}\n` +
      `  Spending by category:\n${cats || "  (none yet)"}`;

    try {
      const res = await fetch("/api/budget-tips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });
      const { tips } = await res.json();
      setTips(parseDigest(tips ?? ""));
    } catch {
      setTips([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Sugerencias con IA</h2>
      <Card>
        <CardContent className="p-4">
          {!done ? (
            <div className="text-center space-y-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto">
                <Sparkles size={18} className="text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">Consejos personalizados sobre tu presupuesto y ahorros.</p>
              <Button size="sm" onClick={generate} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Sparkles size={14} /> Generar
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 size={14} className="animate-spin" /> Analizando tus finanzas…
            </div>
          ) : tips.length ? (
            <ul className="space-y-2">
              {tips.map((t, i) => (
                <li key={i} className="flex gap-2 text-sm leading-relaxed">
                  <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No pude generar sugerencias ahora. Intenta de nuevo.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
