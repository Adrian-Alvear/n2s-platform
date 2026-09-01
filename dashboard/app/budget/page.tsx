"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_BUDGETS, PERSONAL_BUDGETS, CATEGORIES, INCOME, PERSONAL_INCOME, MEMBERS } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { useUser } from "@/lib/user-context";
import { useBudgetScope } from "@/lib/budget-scope";
import { MonthNav } from "@/components/month-nav";
import { SpendingSheet } from "@/components/spending-sheet";
import { PersonalTips } from "@/components/personal-tips";
import { PersonalAccounts } from "@/components/personal-accounts";
import { PersonalPayments } from "@/components/personal-payments";
import { CategoryEnvelopes } from "@/components/category-envelopes";
import { ActivityChart } from "@/components/activity-chart";
import { SavingsGoals } from "@/components/savings-goals";
import { MemberAvatar } from "@/components/member-avatar";
import { BudgetInsights } from "@/components/budget-insights";
import { CategoryBreakdown } from "@/components/category-breakdown";
import { CategoryDetailSheet } from "@/components/category-detail-sheet";
import { TransactionsPanel } from "@/components/transactions-panel";
import { RecurringPanel } from "@/components/recurring-panel";
import { splitByMonth } from "@/lib/budget-analytics";
import type { Accounts } from "@/lib/personal-accounts";
import { getLimits, saveLimits, resetLimits, type Limits } from "@/lib/budget-limits";
import { Users, User } from "lucide-react";

type Entry = { id: number; expense_at: string; description: string; category: string; amount: number; member: string };

export default function BudgetOverview() {
  const now = new Date();
  const { user } = useUser();
  const { scope, setScope } = useBudgetScope();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<Entry[]>([]);
  // The month before the selected one, kept only so the signal band can say
  // what moved. Never rendered as a list.
  const [prevEntries, setPrevEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  // The category whose drill-down is open, or null. Driven from the breakdown
  // donut and from the envelope rows — both open the same sheet.
  const [detailCategory, setDetailCategory] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Accounts>({ checking: 0, savings: 0, credit: 0 });
  // Stable clock for the derived signals. A fresh Date on every render would
  // invalidate their memo constantly and make the pace maths drift mid-session.
  const [clock] = useState(() => new Date());

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
    // Two months in one read: the selected month drives everything on screen,
    // the one before it only feeds the month-over-month signal. Splitting the
    // result client-side keeps this to a single round trip.
    const from = new Date(year, month - 1, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    supabase.from("entries").select("*")
      .eq("scope", activeScope)
      .gte("expense_at", from).lt("expense_at", to)
      .order("expense_at", { ascending: false })
      .then(({ data }) => {
        const { current, previous } = splitByMonth((data ?? []) as Entry[], year, month);
        setEntries(current);
        setPrevEntries(previous);
        setLoading(false);
      });
  }, [year, month, activeScope]);

  const spentByCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, entries.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)])
  );
  const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);
  const saldo = totalIncome - totalBudget;
  // Share of the month's budget already spent — drives the hero's violet rail.
  // PERSONAL_BUDGETS maps every category to 0, so personal scope has no budget
  // defined. "No budget set" is not an overrun — without this guard every
  // personal-scope figure paints destructive red the moment anything is spent.
  const hasBudget = totalBudget > 0;
  const overBudget = hasBudget && totalSpent > totalBudget;
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
    loading: isP ? "Loading..." : "Cargando...",
    activity: isP ? "My activity" : "Actividad",
    activityEmpty: isP ? "No spending in the last 12 months" : "Sin gastos en los últimos 12 meses",
    perPerson: isP ? "Per person" : "Por persona",
    goals: isP ? "My goals" : "Metas de ahorro",
    goalsEmpty: isP ? "No goals yet" : "Aún no hay metas",
    goalAdd: isP ? "Add goal" : "Agregar meta",
    goalName: isP ? "Goal name" : "Nombre de la meta",
    goalSaved: isP ? "Saved" : "Ahorrado",
    goalTarget: isP ? "Target" : "Meta",
    goalSave: isP ? "Save" : "Guardar",
    goalCancel: isP ? "Cancel" : "Cancelar",
    goalRemove: isP ? "Remove" : "Eliminar",
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">

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
      {/* Reference composition: balance and activity share the top row, then
          envelopes sit beside the transaction table beneath. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <section className="rounded-2xl bg-card ring-1 ring-border p-6 md:p-8 lg:col-span-2">
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

        {/* Card visual, as in the reference's balance panel. Stands for the
            scope being viewed rather than a real payment card — this household
            has no card data, so inventing a number would be a lie. */}
        <div
          className="mt-6 rounded-2xl p-4 text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--app-budget), color-mix(in oklch, var(--app-budget) 55%, black))" }}
        >
          <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">
            {activeScope === "personal" ? "Personal" : "Family"}
          </p>
          <p className="mt-3 text-lg font-semibold tabular-nums">${totalSpent.toFixed(2)}</p>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <span className="text-[11px] text-white/70">{L.spent}</span>
            <span className="text-[11px] text-white/70 tabular-nums">
              {new Date(year, month).toLocaleDateString(isP ? "en" : "es", { month: "long", year: "numeric" })}
            </span>
          </div>
        </div>

        {/* Budget usage, directly labelled — the rail carries no meaning colour
            alone, the figures beside it repeat it. Hidden when no budget is
            defined, where a 0% rail would imply a limit that does not exist. */}
        <div className={`mt-7 md:mt-9 space-y-2 ${hasBudget ? "" : "hidden"}`}>
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
            {hasBudget ? (
              <p className={`mt-1 text-xl font-semibold tabular-nums ${(totalBudget - totalSpent) < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>${(totalBudget - totalSpent).toFixed(0)}</p>
            ) : (
              <p className="mt-1 text-xl font-semibold tabular-nums text-muted-foreground">—</p>
            )}
          </div>
        </div>
      </section>

      <div className="lg:col-span-3">
        <ActivityChart
          scope={activeScope}
          year={year}
          month={month}
          monthlyIncome={totalIncome}
          labels={{
            title: L.activity,
            empty: L.activityEmpty,
            loading: L.loading,
            spent: L.spent,
            income: L.income,
          }}
        />
      </div>
      </div>

      {/* Derived signals, computed from the rows already on this page: what the
          month is on pace to spend, which envelope is about to blow, the
          biggest change against last month, and who drove it. */}
      <BudgetInsights
        scope={activeScope}
        loading={loading}
        entries={entries}
        previousEntries={prevEntries}
        limits={budgets}
        totalBudget={totalBudget}
        year={year}
        month={month}
        now={clock}
      />

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
              onSelect={setDetailCategory}
            />
          )}

          {/* The month's ledger, searchable and filterable in place. The full
              history still lives one click away in the spending sheet. */}
          <TransactionsPanel
            scope={activeScope}
            loading={loading}
            entries={entries}
            onViewAll={() => setSheetOpen(true)}
          />
        </div>

        <div className="space-y-6">
          <CategoryBreakdown
            scope={activeScope}
            loading={loading}
            entries={entries}
            onSelect={setDetailCategory}
          />

          {/* Fixed commitments recovered from six months of history: what
              usually lands each month, when, and what this month still owes. */}
          <RecurringPanel
            scope={activeScope}
            year={year}
            month={month}
            now={clock}
            onSelect={setDetailCategory}
          />

          <SavingsGoals
            labels={{
              title: L.goals,
              empty: L.goalsEmpty,
              add: L.goalAdd,
              name: L.goalName,
              saved: L.goalSaved,
              target: L.goalTarget,
              save: L.goalSave,
              cancel: L.goalCancel,
              remove: L.goalRemove,
            }}
          />
          {activeScope === "personal" ? (
            <>
              {/* Editable account balances */}
              <PersonalAccounts onChange={setAccounts} />

              {/* AI suggestions */}
              <PersonalTips income={totalIncome} spent={totalSpent} accounts={accounts} />
            </>
          ) : (
            <Card>
              <CardContent className="p-5 space-y-4">
                <p className="text-base font-semibold text-foreground">Por persona</p>
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
                    // Monogram disc first, as the reference leads its transfer
                    // rows with a face; the written name stays beside it.
                    <div key={d.member} className="flex items-center gap-3">
                      <MemberAvatar name={d.member} />
                      <div className="min-w-0 flex-1 space-y-1.5">
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
                    </div>
                  ));
                })()}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <SpendingSheet open={sheetOpen} onOpenChange={setSheetOpen} scope={activeScope} />

      <CategoryDetailSheet
        category={detailCategory}
        onClose={() => setDetailCategory(null)}
        scope={activeScope}
        entries={entries}
        previousEntries={prevEntries}
        limits={budgets}
        year={year}
        month={month}
        now={clock}
      />
    </div>
  );
}
