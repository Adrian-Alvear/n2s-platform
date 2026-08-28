"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DEFAULT_BUDGETS, PERSONAL_BUDGETS, CATEGORIES, INCOME, PERSONAL_INCOME, MEMBER_COLORS, MEMBERS } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useBudgetScope } from "@/lib/budget-scope";
import { MonthNav } from "@/components/month-nav";
import { SpendingSheet } from "@/components/spending-sheet";
import { PersonalTips } from "@/components/personal-tips";
import { PersonalAccounts } from "@/components/personal-accounts";
import { PersonalPayments } from "@/components/personal-payments";
import { CategoryEnvelopes } from "@/components/category-envelopes";
import type { Accounts } from "@/lib/personal-accounts";
import { getLimits, saveLimits, resetLimits, type Limits } from "@/lib/budget-limits";
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

  // Adjustable per-category limits (family) — loaded from the per-month store
  const [limits, setLimits] = useState<Limits>({ ...DEFAULT_BUDGETS });
  useEffect(() => {
    if (activeScope === "family") setLimits(getLimits("family", year, month));
  }, [activeScope, year, month]);

  function applyLimits(next: Limits) {
    setLimits(next);
    saveLimits("family", year, month, next);
  }
  function resetToDefaults() {
    resetLimits("family", year, month);
    setLimits(getLimits("family", year, month));
  }

  const budgets = activeScope === "personal" ? PERSONAL_BUDGETS : limits;
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
  // Share of the month's budget already spent — drives the hero's violet rail.
  const overBudget = totalSpent > totalBudget;
  const usedPct = totalBudget > 0 ? Math.min((totalSpent / totalBudget) * 100, 100) : 0;

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

      {/* Hero balance — one large figure on a card that sits a step lighter than
          the page. Violet is the accent only: it fills the budget-usage rail and
          nothing else here, so the number itself stays plain high-contrast. */}
      <section className="rounded-2xl bg-card ring-1 ring-border p-6 md:p-8">
        {/* Stacks on mobile so the hero figure always gets the full card width —
            side by side it collided with the month pill at this type size. */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{L.saved}</p>
            <p className="mt-2 text-5xl md:text-6xl font-semibold tracking-tight tabular-nums text-foreground">
              ${saldo.toFixed(2)}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">{L.savedSub}</p>
          </div>
          <div className="shrink-0 self-start rounded-full bg-muted px-1 py-0.5">
            <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          </div>
        </div>

        {/* Budget usage, directly labelled — the rail carries no meaning colour
            alone, the figures beside it repeat it. */}
        <div className="mt-7 md:mt-9 space-y-2">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <span className="text-muted-foreground">{L.spent} / {L.budget}</span>
            <span className={`tabular-nums font-medium ${overBudget ? "text-destructive" : "text-muted-foreground"}`}>
              {usedPct.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width] duration-500"
              style={{
                width: `${usedPct}%`,
                backgroundColor: overBudget ? "var(--destructive)" : "var(--app-budget)",
              }}
            />
          </div>
        </div>

        <div className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 border-t border-border pt-6 md:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">{L.income}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">${totalIncome.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{L.budget}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">${totalBudget.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{L.spent}</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${overBudget ? "text-destructive" : ""}`}>${totalSpent.toFixed(0)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{L.remaining}</p>
            <p className={`mt-1 text-xl font-semibold tabular-nums ${(totalBudget - totalSpent) < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>${(totalBudget - totalSpent).toFixed(0)}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {activeScope === "personal" ? (
            // Personal — monthly-payments checklist with progress
            <PersonalPayments />
          ) : (
            // Family — adjustable envelope categories with reallocation
            <CategoryEnvelopes
              limits={limits}
              spentByCategory={spentByCategory}
              income={totalIncome}
              onSave={applyLimits}
              onReset={resetToDefaults}
            />
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
                {(() => {
                  // Three named people = a categorical job, so bars take chart slots
                  // 1-3 in fixed MEMBERS order. Each bar is directly labelled with
                  // the name, so identity is never carried by colour alone and no
                  // legend is needed. Bars are scaled against the highest spender,
                  // which makes the comparison relative rather than absolute.
                  const spendByMember = MEMBERS.map((m) => ({
                    member: m,
                    spent: entries
                      .filter((e) => e.member === m)
                      .reduce((s, e) => s + e.amount, 0),
                  }));
                  const peak = Math.max(...spendByMember.map((d) => d.spent), 0);
                  const slots = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

                  return spendByMember.map((d, i) => (
                    <div key={d.member} className="space-y-1.5">
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-xs font-medium text-foreground">{d.member}</span>
                        <span className="text-sm font-semibold tabular-nums">
                          ${d.spent.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full transition-[width] duration-500"
                          style={{
                            // peak is 0 before any spending exists — avoid 0/0.
                            width: peak > 0 ? `${(d.spent / peak) * 100}%` : "0%",
                            backgroundColor: slots[i],
                          }}
                        />
                      </div>
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SpendingSheet open={sheetOpen} onOpenChange={setSheetOpen} scope={activeScope} />
    </div>
  );
}
