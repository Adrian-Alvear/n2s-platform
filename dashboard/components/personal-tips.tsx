"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { parseDigest } from "@/lib/digest";
import { getPayments } from "@/lib/personal-payments-store";

type Accounts = { checking: number; savings: number; credit: number };

export function PersonalTips({
  income, spent, accounts,
}: {
  income: number;
  spent: number;
  accounts: Accounts;
}) {
  const [tips, setTips] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function generate() {
    setLoading(true);
    setDone(true);

    // Build an accurate summary from the real personal data
    const payments = getPayments();
    const billsTotal = payments.reduce((s, p) => s + p.amount, 0);
    const paidTotal = payments.filter((p) => p.paid).reduce((s, p) => s + p.amount, 0);
    const billLines = payments.length
      ? payments.map((p) => `    - ${p.name}: $${p.amount.toFixed(0)} (${p.paid ? "paid" : "unpaid"})`).join("\n")
      : "    (none set)";
    const leftover = income - billsTotal - spent;

    const summary =
      `Adrian's personal finances this month (all amounts in USD):\n` +
      `  Monthly income: $${income.toFixed(0)}\n` +
      `  Recurring monthly bills (total $${billsTotal.toFixed(0)}, $${paidTotal.toFixed(0)} already paid):\n${billLines}\n` +
      `  Other spending this month: $${spent.toFixed(0)}\n` +
      `  Estimated left after bills and spending: $${leftover.toFixed(0)}\n` +
      `  Account balances: Checking $${accounts.checking.toFixed(0)}, Savings $${accounts.savings.toFixed(0)}, Credit card owed $${accounts.credit.toFixed(0)}`;

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
      <h2 className="text-base font-semibold mb-3 text-foreground">AI suggestions</h2>
      <Card>
        <CardContent className="p-4">
          {!done ? (
            <div className="text-center space-y-3 py-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mx-auto">
                <Sparkles size={18} className="text-blue-600" />
              </div>
              <p className="text-xs text-muted-foreground">Personalized tips based on your bills, spending, and savings.</p>
              <Button size="sm" onClick={generate} className="gap-1.5 bg-blue-600 hover:bg-blue-700 text-white">
                <Sparkles size={14} /> Generate
              </Button>
            </div>
          ) : loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 size={14} className="animate-spin" /> Analyzing your finances…
            </div>
          ) : tips.length ? (
            <div className="space-y-3">
              <ul className="space-y-2">
                {tips.map((t, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed">
                    <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              <Button variant="ghost" size="sm" onClick={generate} className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground gap-1">
                <Sparkles size={12} /> Regenerate
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Couldn&apos;t generate suggestions right now. Try again.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
