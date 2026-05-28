"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DEFAULT_BUDGETS, CATEGORIES, INCOME, MEMBER_COLORS, MEMBERS, getProgressColor, getProgressBg } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { MonthNav } from "@/components/month-nav";
import { Loader2 } from "lucide-react";

type Entry = { id: number; expense_at: string; description: string; category: string; amount: number; member: string; };

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠", Carro: "🚗", Seguro: "🛡️", Internet: "📡", Agua: "💧",
  Gas: "🔥", Gasolina: "⛽", "Renta Calentador": "🌡️", "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️", Cumpleaños: "🎂", "Transporte Uber": "🚕", "Mto Carro": "🔧", "Otros": "📦",
};

const totalIncome = Object.values(INCOME).reduce((s, v) => s + v, 0);
const totalBudget = Object.values(DEFAULT_BUDGETS).reduce((s, v) => s + v, 0);

function formatDateTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" }) + " · " +
    d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

export default function Overview() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    supabase.from("entries").select("*")
      .gte("expense_at", from).lt("expense_at", to)
      .order("expense_at", { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false); });
  }, [year, month]);

  const spentByCategory = Object.fromEntries(
    CATEGORIES.map((cat) => [cat, entries.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0)])
  );
  const totalSpent = Object.values(spentByCategory).reduce((s, v) => s + v, 0);
  const saldo = totalIncome - totalBudget;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">

      {/* Hero card */}
      <div className="rounded-2xl bg-gradient-to-br from-violet-600 to-violet-800 text-white p-8 shadow-lg">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-violet-200 text-sm font-medium mb-1">Saldo disponible</p>
            <p className="text-5xl font-bold tracking-tight">${saldo.toFixed(2)}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-3 py-1.5">
            <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          </div>
        </div>
        <div className="flex gap-6 text-sm">
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
            <p className={`font-semibold text-lg ${totalSpent > totalBudget ? "text-red-300" : ""}`}>
              ${totalSpent.toFixed(0)}
            </p>
          </div>
          <div className="w-px bg-violet-500" />
          <div>
            <p className="text-violet-300">Restante</p>
            <p className={`font-semibold text-lg ${(totalBudget - totalSpent) < 0 ? "text-red-300" : "text-emerald-300"}`}>
              ${(totalBudget - totalSpent).toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
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
                  <Card key={cat} className="hover:shadow-md transition-shadow">
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
                {loading && (
                  <div className="flex items-center justify-center py-10 text-muted-foreground">
                    <Loader2 className="animate-spin mr-2" size={16} /> Cargando...
                  </div>
                )}
                {!loading && entries.length === 0 && (
                  <div className="text-center py-10 text-muted-foreground text-sm">No hay movimientos este mes</div>
                )}
                {entries.slice(0, 8).map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-lg">
                        {CATEGORY_ICONS[e.category]}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{e.description}</p>
                        <p className="text-xs text-muted-foreground">{e.category} · {formatDateTime(e.expense_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MEMBER_COLORS[e.member as keyof typeof MEMBER_COLORS] ?? "bg-gray-100 text-gray-700"}`}>{e.member}</span>
                      <span className="text-sm font-bold text-red-500">-${e.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Right: budget progress + member breakdown */}
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
        </div>
      </div>
    </div>
  );
}
