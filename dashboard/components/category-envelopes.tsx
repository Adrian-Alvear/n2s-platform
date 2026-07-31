"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CATEGORIES } from "@/lib/data";
import { type Limits } from "@/lib/budget-limits";
import { Sliders, Minus, Plus, RotateCcw, Check, X } from "lucide-react";

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠", Carro: "🚗", Seguro: "🛡️", Internet: "📡", Agua: "💧",
  Gas: "🔥", Gasolina: "⛽", "Renta Calentador": "🌡️", "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️", Cumpleaños: "🎂", "Transporte Uber": "🚕", "Mto Carro": "🔧", Otros: "📦",
};

function barColor(pct: number, over: boolean) {
  if (over) return "bg-red-500";
  if (pct >= 90) return "bg-orange-500";
  if (pct >= 70) return "bg-yellow-500";
  return "bg-emerald-500";
}

export function CategoryEnvelopes({
  limits, spentByCategory, income, onSave, onReset,
}: {
  limits: Limits;
  spentByCategory: Record<string, number>;
  income: number;
  onSave: (next: Limits) => void;
  onReset: () => void;
}) {
  const [adjusting, setAdjusting] = useState(false);
  const [draft, setDraft] = useState<Limits>(limits);

  function startAdjust() { setDraft({ ...limits }); setAdjusting(true); }
  function cancel() { setAdjusting(false); }
  function save() { onSave(draft); setAdjusting(false); }
  function bump(cat: string, delta: number) {
    setDraft((d) => ({ ...d, [cat]: Math.max(0, Math.round(((d[cat] ?? 0) + delta) * 100) / 100) }));
  }
  function setVal(cat: string, v: string) {
    setDraft((d) => ({ ...d, [cat]: Math.max(0, parseFloat(v) || 0) }));
  }

  const active = adjusting ? draft : limits;
  const totalAssigned = CATEGORIES.reduce((s, c) => s + (active[c] ?? 0), 0);
  const unassigned = income - totalAssigned;

  return (
    <div>
      {/* Header + adjust controls */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Categorías</h2>
        {!adjusting ? (
          <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-violet-600" onClick={startAdjust}>
            <Sliders size={13} /> Reasignar
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-muted-foreground" onClick={onReset} title="Restablecer a los valores por defecto">
              <RotateCcw size={12} /> Restablecer
            </Button>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground" onClick={cancel}>
              <X size={14} />
            </Button>
            <Button size="sm" className="h-7 px-2.5 gap-1 text-xs bg-violet-600 hover:bg-violet-700 text-white" onClick={save}>
              <Check size={13} /> Guardar
            </Button>
          </div>
        )}
      </div>

      {/* Reallocation summary while adjusting */}
      {adjusting && (
        <div className="mb-3 flex items-center justify-between rounded-xl border border-border bg-muted/40 px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Presupuesto asignado</span>
          <div className="text-right">
            <span className="font-semibold tabular-nums">${totalAssigned.toFixed(0)}</span>
            <span className={`ml-2 text-xs font-medium tabular-nums ${unassigned < 0 ? "text-red-500" : "text-emerald-600"}`}>
              {unassigned < 0 ? `${unassigned.toFixed(0)} sobregirado` : `+${unassigned.toFixed(0)} sin asignar`}
            </span>
          </div>
        </div>
      )}

      <Card>
        <CardContent className="p-0 divide-y divide-border">
          {CATEGORIES.map((cat) => {
            const limit = active[cat] ?? 0;
            const spent = spentByCategory[cat] ?? 0;
            const left = limit - spent;
            const over = spent > limit;
            const pct = limit > 0 ? Math.min((spent / limit) * 100, 100) : (spent > 0 ? 100 : 0);
            return (
              <div key={cat} className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-lg shrink-0">{CATEGORY_ICONS[cat]}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate">{cat}</span>
                      {!adjusting && (
                        <span className="text-xs tabular-nums shrink-0">
                          <span className="text-muted-foreground">${spent.toFixed(0)}</span>
                          <span className="text-muted-foreground/50"> / </span>
                          <span className="font-medium">${limit.toFixed(0)}</span>
                        </span>
                      )}
                    </div>

                    {/* Adjust: stepper for the limit */}
                    {adjusting ? (
                      <div className="flex items-center gap-2 mt-1.5">
                        <button onClick={() => bump(cat, -10)} className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-violet-400 shrink-0"><Minus size={12} /></button>
                        <div className="relative flex-1 max-w-[120px]">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
                          <input
                            type="number"
                            value={limit === 0 ? "" : limit}
                            onChange={(e) => setVal(cat, e.target.value)}
                            placeholder="0"
                            className="w-full h-7 pl-5 pr-2 text-sm rounded-md border border-border bg-background outline-none focus:border-violet-400 tabular-nums"
                          />
                        </div>
                        <button onClick={() => bump(cat, 10)} className="w-6 h-6 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-violet-400 shrink-0"><Plus size={12} /></button>
                        <span className="text-[11px] text-muted-foreground tabular-nums ml-auto">gastado ${spent.toFixed(0)}</span>
                      </div>
                    ) : (
                      <>
                        <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                          <div className={`h-1.5 rounded-full transition-all ${barColor(pct, over)}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-[11px] text-muted-foreground">Límite ${limit.toFixed(0)}</span>
                          {over ? (
                            <span className="text-[11px] font-medium text-red-500 tabular-nums">Sobre ${(spent - limit).toFixed(0)}</span>
                          ) : (
                            <span className="text-[11px] font-medium text-emerald-600 tabular-nums">Restan ${left.toFixed(0)}</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {adjusting && (
        <p className="text-[11px] text-muted-foreground mt-2 px-1">
          Baja el límite de una categoría con sobrante y súbelo en la que se pasó — el total y el ahorro se ajustan solos.
        </p>
      )}
    </div>
  );
}
