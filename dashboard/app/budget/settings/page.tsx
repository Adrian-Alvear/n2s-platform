"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_BUDGETS, INCOME, CATEGORIES, MEMBERS, MEMBER_COLORS, type Category } from "@/lib/data";

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠", Carro: "🚗", Seguro: "🛡️", Internet: "📡", Agua: "💧",
  Gas: "🔥", Gasolina: "⛽", "Renta Calentador": "🌡️", "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️", Cumpleaños: "🎂", "Transporte Uber": "🚕", "Mto Carro": "🔧", Otros: "📦",
};

/** $-prefixed number field — one shape for every amount on this page. */
function AmountField({ value, onChange, className }: {
  value: number;
  onChange: (v: number) => void;
  className?: string;
}) {
  return (
    <div className={`relative ${className ?? ""}`}>
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
      <Input
        type="number"
        className="pl-6 tabular-nums"
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

export default function BudgetSettings() {
  const [budgets, setBudgets] = useState({ ...DEFAULT_BUDGETS });
  const [income, setIncome] = useState({ ...INCOME });
  const [reparto, setReparto] = useState({ Javi: 500, Adrian: 700, Yazmi: 500 });
  const [saved, setSaved] = useState(false);

  const totalBudget = Object.values(budgets).reduce((s, v) => s + v, 0);
  const totalIncome = Object.values(income).reduce((s, v) => s + v, 0);
  const ahorro = totalIncome - totalBudget - Object.values(reparto).reduce((s, v) => s + v, 0);

  function save() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Ajusta los presupuestos e ingresos mensuales</p>
      </div>

      {/* Every panel here is a plain high-contrast heading over a card whose
          rows are separated by hairlines, the same shape as the budget page's
          tables: grey labels on the left, a neutral tabular figure on the
          right, and a total row closing each card. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Ingresos mensuales</h2>
          <Card>
            <CardContent className="p-0">
              {MEMBERS.map((m) => (
                <div key={m} className="flex items-center gap-3 border-b border-border/50 px-4 md:px-6 py-3">
                  <span className={`w-20 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${MEMBER_COLORS[m]}`}>{m}</span>
                  <AmountField className="flex-1" value={income[m] ?? 0} onChange={(v) => setIncome({ ...income, [m]: v })} />
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 px-4 md:px-6 py-3.5">
                <span className="text-sm text-muted-foreground">Total</span>
                <span className="text-base font-semibold tabular-nums text-foreground">${totalIncome.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Reparto mensual</h2>
          <Card>
            <CardContent className="p-0">
              {(["Javi", "Adrian", "Yazmi"] as const).map((m) => (
                <div key={m} className="flex items-center gap-3 border-b border-border/50 px-4 md:px-6 py-3">
                  <span className={`w-20 shrink-0 rounded-full px-2.5 py-0.5 text-center text-xs font-medium ${MEMBER_COLORS[m]}`}>{m}</span>
                  <AmountField className="flex-1" value={reparto[m]} onChange={(v) => setReparto({ ...reparto, [m]: v })} />
                </div>
              ))}
              <div className="flex items-baseline justify-between gap-3 px-4 md:px-6 py-3.5">
                <span className="text-sm text-muted-foreground">Ahorro estimado</span>
                <span className={`text-base font-semibold tabular-nums ${ahorro >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>${ahorro.toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      <section>
        <h2 className="text-base font-semibold text-foreground mb-3">Presupuesto por rubro</h2>
        <Card>
          <CardContent className="p-0">
            {/* Two columns of ledger rows that butt together, so the hairlines
                read as one rule running the width of the card. */}
            <div className="grid grid-cols-1 sm:grid-cols-2">
              {CATEGORIES.map((cat) => (
                <div key={cat} className="flex items-center gap-3 border-b border-border/50 px-4 md:px-6 py-3">
                  <span className="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium text-foreground">
                    <span className="shrink-0">{CATEGORY_ICONS[cat] ?? "📦"}</span>
                    <span className="truncate">{cat}</span>
                  </span>
                  <AmountField className="w-28 shrink-0" value={budgets[cat as Category]} onChange={(v) => setBudgets({ ...budgets, [cat]: v })} />
                </div>
              ))}
            </div>
            <div className="flex items-baseline justify-between gap-3 px-4 md:px-6 py-4">
              <span className="text-sm text-muted-foreground">Total presupuesto</span>
              <span className="text-xl font-semibold tabular-nums text-foreground">${totalBudget.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </section>

      <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={save}>
        {saved ? "¡Guardado!" : "Guardar cambios"}
      </Button>
    </div>
  );
}
