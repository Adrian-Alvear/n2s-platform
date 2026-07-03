"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEFAULT_BUDGETS, PERSONAL_BUDGETS, CATEGORIES, INCOME, PERSONAL_INCOME, MEMBER_COLORS, MEMBERS, getProgressColor, getProgressBg } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useBudgetScope } from "@/lib/budget-scope";
import { MonthNav } from "@/components/month-nav";
import { SpendingSheet } from "@/components/spending-sheet";
import { PersonalTips } from "@/components/personal-tips";
import { PersonalAccounts } from "@/components/personal-accounts";
import { PersonalPayments } from "@/components/personal-payments";
import type { Accounts } from "@/lib/personal-accounts";
import { Loader2, ArrowRight, Users, User } from "lucide-react";

type Entry = { id: number; expense_at: string; description: string; category: string; amount: number; member: string };

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠", Carro: "🚗", Seguro: "🛡️", Internet: "📡", Agua: "💧",
  Gas: "🔥", Gasolina: "⛽", "Renta Calentador": "🌡️", "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️", Cumpleaños: "🎂", "Transporte Uber": "🚕", "Mto Carro": "🔧", Otros: "📦",
};

function formatDateTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" }) + " · " +
    d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export default function BudgetOverview() {
  const now = new Date();
  const { user } = useUser();
  const { scope, setScope } = useBudgetScope();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [accounts, setAccounts] = useState<Accounts>({ checking: 0, savings: 0, credit: 0 });

  // Personal budget is only for Adrian; force family for everyone else
  const canPersonal = (user?.name ?? "").toLowerCase().startsWith("adrian");
  const activeScope = canPersonal ? scope : "family";

  const budgets = activeScope === "personal" ? PERSONAL_BUDGETS : DEFAULT_BUDGETS;
  const income = activeScope === "personal" ? PERSONAL_INCOME : INCOME;
  const totalIncome = Object.values(income).reduce((s, v) => s + v, 0);
  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);

  useEffect(() => {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    supabase.from("entries").select("*")
      .eq("scope", activeScope)
      .gte("expense_at", from).lt("expense_at", to)
      .order("expense_at", { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false); });
  }, [year, month, activeScope]);

  const spentByCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, entries.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)])
  );
  const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);
  const saldo = totalIncome - totalBudget;

  // Personal dashboard is in English; family stays in Spanish
  const isP = activeScope === "personal";
  const L = {
    saved: isP ? "Available this month" : "Ahorro del mes",
    savedSub: isP ? "Income − Bills" : "Ingresos − Presupuesto",
    income: isP ? "Income" : "Ingresos",
    budget: isP ? "Bills" : "Presupuesto",
    spent: isP ? "Spent" : "Gastado",
    remaining: isP ? "Left" : "Restante",
    recent: isP ? "Recent transactions" : "Últimos movimientos",
    viewAll: isP ? "View all" : "Ver todos",
    empty: isP ? "No transactions this month" : "No hay movimientos este mes",
    loading: isP ? "Loading..." : "Cargando...",
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 md:space-y-8">

      {/* Family / Personal toggle — only Adrian sees Personal */}
      {canPersonal && (
        <div className="flex bg-muted p-1 rounded-xl gap-1 w-fit">
          <button
            onClick={() => setScope("family")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeScope === "family" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Users size={14} /> Family
          </button>
          <button
            onClick={() => setScope("personal")}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeScope === "personal" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            <User size={14} /> Personal
          </button>
        </div>
      )}

      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white p-5 md:p-8 shadow-lg">
        <div className="flex items-start justify-between mb-5 md:mb-6 gap-4">
          <div>
            <p className="text-violet-200 text-sm font-medium mb-1">{L.saved}</p>
            <p className="text-4xl md:text-5xl font-bold tracking-tight">${saldo.toFixed(2)}</p>
            <p className="text-violet-300/80 text-xs mt-1">{L.savedSub}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-1.5 shrink-0">
            <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          </div>
        </div>
        <div className="grid grid-cols-2 md:flex md:gap-6 gap-3 text-sm">
          <div><p className="text-violet-300">{L.income}</p><p className="font-semibold text-base md:text-lg">${totalIncome.toLocaleString()}</p></div>
          <div><p className="text-violet-300">{L.budget}</p><p className="font-semibold text-base md:text-lg">${totalBudget.toFixed(0)}</p></div>
          <div><p className="text-violet-300">{L.spent}</p><p className={`font-semibold text-base md:text-lg ${totalSpent > totalBudget ? "text-red-300" : ""}`}>${totalSpent.toFixed(0)}</p></div>
          <div><p className="text-violet-300">{L.remaining}</p><p className={`font-semibold text-base md:text-lg ${(totalBudget - totalSpent) < 0 ? "text-red-300" : "text-emerald-300"}`}>${(totalBudget - totalSpent).toFixed(0)}</p></div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeScope === "personal" ? (
            // Personal — monthly-payments checklist with progress
            <PersonalPayments />
          ) : (
            // Family — category budgets list
            <div>
              <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Categorías</h2>
              <Card>
                <CardContent className="p-0 divide-y divide-border">
                  {CATEGORIES.map((cat) => {
                    const spent = spentByCategory[cat] ?? 0;
                    const budget = budgets[cat];
                    const unbudgeted = budget <= 0;
                    const pct = unbudgeted ? (spent > 0 ? 100 : 0) : Math.min((spent / budget) * 100, 100);
                    const over = !unbudgeted && spent > budget;
                    return (
                      <div key={cat} className="flex items-center gap-3 px-4 py-3">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">{CATEGORY_ICONS[cat]}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-sm font-medium truncate">{cat}</span>
                            <span className={`text-xs font-semibold tabular-nums shrink-0 ${over ? "text-red-500" : "text-foreground"}`}>
                              ${spent.toFixed(0)}
                              <span className="font-normal text-muted-foreground">{unbudgeted ? "" : ` / ${budget.toFixed(0)}`}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className={`h-1.5 rounded-full flex-1 ${getProgressBg(pct)}`}>
                              <div className={`h-1.5 rounded-full ${getProgressColor(pct)}`} style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums w-9 text-right shrink-0">{unbudgeted ? "—" : `${Math.round(pct)}%`}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{L.recent}</h2>
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-violet-600" onClick={() => setSheetOpen(true)}>
                {L.viewAll} <ArrowRight size={13} />
              </Button>
            </div>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {loading && <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="animate-spin mr-2" size={16} /> {L.loading}</div>}
                {!loading && entries.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">{L.empty}</div>}
                {entries.slice(0, 8).map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-lg shrink-0">{CATEGORY_ICONS[e.category]}</div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.description}</p>
                        <p className="text-xs text-muted-foreground truncate">{e.category} · {formatDateTime(e.expense_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full ${MEMBER_COLORS[e.member as keyof typeof MEMBER_COLORS] ?? "bg-gray-100 text-gray-700"}`}>{e.member}</span>
                      <span className="text-sm font-bold text-red-500">-${e.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          {activeScope === "personal" ? (
            <>
              {/* Editable account balances */}
              <PersonalAccounts onChange={setAccounts} />

              {/* AI suggestions */}
              <PersonalTips income={totalIncome} spent={totalSpent} accounts={accounts} />
            </>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Por persona</p>
                {MEMBERS.map((m) => {
                  const spent = entries.filter((e) => e.member === m).reduce((s, e) => s + e.amount, 0);
                  return (
                    <div key={m} className="flex items-center justify-between">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MEMBER_COLORS[m]}`}>{m}</span>
                      <span className="text-sm font-semibold">${spent.toFixed(2)}</span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SpendingSheet open={sheetOpen} onOpenChange={setSheetOpen} scope={activeScope} />
    </div>
  );
}
