"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DEFAULT_BUDGETS, INCOME, CATEGORIES, MEMBERS, MEMBER_COLORS, type Category } from "@/lib/data";

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
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground text-sm mt-1">Ajusta los presupuestos e ingresos mensuales</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Ingresos mensuales</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {MEMBERS.map((m) => (
              <div key={m} className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-20 text-center ${MEMBER_COLORS[m]}`}>{m}</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" className="pl-6" value={income[m] ?? 0} onChange={(e) => setIncome({ ...income, [m]: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between text-sm">
              <span className="text-muted-foreground">Total</span>
              <span className="font-bold">${totalIncome.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm font-semibold">Reparto mensual</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {(["Javi", "Adrian", "Yazmi"] as const).map((m) => (
              <div key={m} className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-20 text-center ${MEMBER_COLORS[m]}`}>{m}</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" className="pl-6" value={reparto[m]} onChange={(e) => setReparto({ ...reparto, [m]: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t flex justify-between text-sm">
              <span className="text-muted-foreground">Ahorro estimado</span>
              <span className={`font-bold ${ahorro >= 0 ? "text-emerald-600" : "text-red-500"}`}>${ahorro.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm font-semibold">Presupuesto por rubro</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {CATEGORIES.map((cat) => (
              <div key={cat} className="flex items-center gap-3">
                <span className="text-sm font-medium w-40 truncate">{cat}</span>
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                  <Input type="number" className="pl-6" value={budgets[cat as Category]} onChange={(e) => setBudgets({ ...budgets, [cat]: parseFloat(e.target.value) || 0 })} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between text-sm">
            <span className="font-medium text-muted-foreground">Total presupuesto</span>
            <span className="font-bold text-lg">${totalBudget.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>

      <Button className="w-full bg-violet-600 hover:bg-violet-700 text-white" onClick={save}>
        {saved ? "¡Guardado!" : "Guardar cambios"}
      </Button>
    </div>
  );
}
