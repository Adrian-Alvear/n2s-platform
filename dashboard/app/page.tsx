"use client";

import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_BUDGETS, CATEGORIES, INCOME, MEMBER_COLORS, MEMBERS, SAMPLE_ENTRIES, getProgressColor, getProgressBg } from "@/lib/data";

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠",
  Carro: "🚗",
  Seguro: "🛡️",
  Internet: "📡",
  Agua: "💧",
  Gas: "🔥",
  Gasolina: "⛽",
  "Renta Calentador": "🌡️",
  "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️",
  Cumpleaños: "🎂",
  "Transporte Uber": "🚕",
  "Mto Carro": "🔧",
};

const totalIncome = Object.values(INCOME).reduce((s, v) => s + v, 0);
const totalBudget = Object.values(DEFAULT_BUDGETS).reduce((s, v) => s + v, 0);
const saldo = totalIncome - totalBudget;

export default function Overview() {
  const spentByCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, SAMPLE_ENTRIES.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)])
  );
  const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      {/* Hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white p-8 flex items-center justify-between shadow-lg">
        <div>
          <p className="text-violet-200 text-sm font-medium mb-1">Saldo disponible · Mayo 2026</p>
          <p className="text-5xl font-bold tracking-tight">${saldo.toFixed(2)}</p>
          <div className="flex gap-6 mt-4 text-sm">
            <div>
              <p className="text-violet-300">Ingresos</p>
              <p className="font-semibold text-lg">${totalIncome.toLocaleString()}</p>
            </div>
            <div className="w-px bg-violet-500" />
            <div>
              <p className="text-violet-300">Presupuesto</p>
              <p className="font-semibold text-lg">${totalBudget.toFixed(0)}</p>
            </div>
            <div className="w-px bg-violet-500" />
            <div>
              <p className="text-violet-300">Gastado</p>
              <p className="font-semibold text-lg">${totalSpent.toFixed(0)}</p>
            </div>
          </div>
        </div>
        <div className="text-right space-y-2">
          {MEMBERS.map((m) => (
            <div key={m} className="flex items-center justify-end gap-2">
              <span className="text-violet-200 text-sm">{m}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${MEMBER_COLORS[m]}`}>
                ${INCOME[m]?.toLocaleString() ?? 0}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: categories + transactions */}
        <div className="col-span-2 space-y-6">

          {/* Category grid */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Categorías</h2>
            <div className="grid grid-cols-4 gap-3">
              {CATEGORIES.map((cat) => {
                const spent = spentByCategory[cat] ?? 0;
                const budget = DEFAULT_BUDGETS[cat];
                const pct = Math.min((spent / budget) * 100, 100);
                const over = spent > budget;
                return (
                  <Card key={cat} className="hover:shadow-md transition-shadow cursor-default">
                    <CardContent className="p-3 text-center">
                      <div className="text-2xl mb-1">{CATEGORY_ICONS[cat]}</div>
                      <p className="text-xs font-medium leading-tight truncate">{cat}</p>
                      <p className={`text-xs mt-1 font-semibold ${over ? "text-red-500" : "text-muted-foreground"}`}>
                        ${spent.toFixed(0)}<span className="font-normal text-muted-foreground">/{budget.toFixed(0)}</span>
                      </p>
                      <div className={`h-1 rounded-full mt-2 ${getProgressBg(pct)}`}>
                        <div className={`h-1 rounded-full ${getProgressColor(pct)}`} style={{ width: `${pct}%` }} />
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Recent transactions */}
          <div>
            <h2 className="text-sm font-semibold mb-3 text-muted-foreground uppercase tracking-wide">Últimos movimientos</h2>
            <Card>
              <CardContent className="p-0 divide-y divide-border">
                {[...SAMPLE_ENTRIES].slice(0, 8).map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-lg">
                        {CATEGORY_ICONS[e.category]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.description}</p>
                        <p className="text-xs text-muted-foreground">{e.category} · {e.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MEMBER_COLORS[e.member]}`}>{e.member}</span>
                      <span className="text-sm font-bold text-red-500">-${e.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: budget progress */}
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Uso del presupuesto</h2>
          <Card>
            <CardContent className="p-4 space-y-4">
              {CATEGORIES.map((cat) => {
                const spent = spentByCategory[cat] ?? 0;
                const budget = DEFAULT_BUDGETS[cat];
                const pct = Math.min((spent / budget) * 100, 100);
                return (
                  <div key={cat}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-medium truncate">{cat}</span>
                      <span className="text-muted-foreground shrink-0 ml-2">{Math.round(pct)}%</span>
                    </div>
                    <div className={`h-1.5 rounded-full ${getProgressBg(pct)}`}>
                      <div className={`h-1.5 rounded-full ${getProgressColor(pct)}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
