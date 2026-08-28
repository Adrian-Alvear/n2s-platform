"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, X, Check } from "lucide-react";
import { getPayments, savePayments, type Payment } from "@/lib/personal-payments-store";

function Ring({ pct }: { pct: number }) {
  const size = 64, stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (Math.min(pct, 100) / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="stroke-muted" fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeLinecap="round" fill="none" className="stroke-violet-600" strokeDasharray={c} strokeDashoffset={off} style={{ transition: "stroke-dashoffset 0.5s ease" }} />
    </svg>
  );
}

export function PersonalPayments() {
  const [items, setItems] = useState<Payment[]>([]);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    setItems(getPayments());
  }, []);

  function persist(next: Payment[]) {
    setItems(next);
    savePayments(next);
  }
  const toggle = (id: string) => persist(items.map((i) => (i.id === id ? { ...i, paid: !i.paid } : i)));
  const remove = (id: string) => persist(items.filter((i) => i.id !== id));
  function add() {
    if (!name.trim()) return;
    persist([...items, { id: crypto.randomUUID(), name: name.trim(), amount: parseFloat(amount) || 0, paid: false }]);
    setName(""); setAmount(""); setAdding(false);
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  const paidAmt = items.filter((i) => i.paid).reduce((s, i) => s + i.amount, 0);
  const paidCount = items.filter((i) => i.paid).length;
  const pct = total > 0 ? Math.round((paidAmt / total) * 100) : items.length ? Math.round((paidCount / items.length) * 100) : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-foreground">Monthly payments</h2>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={() => setAdding((a) => !a)}>
          <Plus size={13} /> Add
        </Button>
      </div>
      <Card>
        <CardContent className="p-4">
          {/* Progress */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="relative shrink-0">
              <Ring pct={pct} />
              <div className="absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums">{pct}%</div>
            </div>
            <div>
              <p className="text-sm font-semibold">{paidCount} of {items.length} paid</p>
              <p className="text-xs text-muted-foreground tabular-nums">${paidAmt.toFixed(0)} of ${total.toFixed(0)} this month</p>
            </div>
          </div>

          {/* Add form */}
          {adding && (
            <div className="flex items-center gap-2 py-3 border-b border-border">
              <Input placeholder="Name (e.g. Rent)" value={name} onChange={(e) => setName(e.target.value)} autoFocus className="flex-1" />
              <div className="relative w-24">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input type="number" placeholder="0" className="pl-6" value={amount} onChange={(e) => setAmount(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") add(); }} />
              </div>
              <Button size="sm" onClick={add} className="bg-violet-600 hover:bg-violet-700 text-white shrink-0">Add</Button>
            </div>
          )}

          {/* List */}
          <div className="divide-y divide-border">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 py-3">
                <button
                  onClick={() => toggle(i.id)}
                  className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${i.paid ? "bg-violet-600 border-violet-600 text-white" : "border-muted-foreground/40 hover:border-violet-500"}`}
                >
                  {i.paid && <Check size={13} />}
                </button>
                <span className={`flex-1 text-sm ${i.paid ? "line-through text-muted-foreground" : "font-medium"}`}>{i.name}</span>
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">${i.amount.toFixed(0)}</span>
                <button onClick={() => remove(i.id)} className="text-muted-foreground/50 hover:text-red-500 transition-colors shrink-0">
                  <X size={15} />
                </button>
              </div>
            ))}
            {items.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">Add your monthly payments</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
