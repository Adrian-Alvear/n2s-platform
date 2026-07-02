"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil } from "lucide-react";
import { getAccounts, saveAccounts, type Accounts } from "@/lib/personal-accounts";

export function PersonalAccounts({ onChange }: { onChange?: (a: Accounts) => void }) {
  const [accounts, setAccounts] = useState<Accounts>({ checking: 0, savings: 0, credit: 0 });
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ checking: "", savings: "", credit: "" });

  useEffect(() => {
    const a = getAccounts();
    setAccounts(a);
    onChange?.(a);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openEdit() {
    setDraft({ checking: String(accounts.checking), savings: String(accounts.savings), credit: String(accounts.credit) });
    setOpen(true);
  }

  function save() {
    const a: Accounts = {
      checking: parseFloat(draft.checking) || 0,
      savings: parseFloat(draft.savings) || 0,
      credit: parseFloat(draft.credit) || 0,
    };
    setAccounts(a);
    saveAccounts(a);
    onChange?.(a);
    setOpen(false);
  }

  const net = accounts.checking + accounts.savings - accounts.credit;
  const rows = [
    { key: "checking", label: "Checking", value: accounts.checking, color: "text-foreground" },
    { key: "savings", label: "Savings", value: accounts.savings, color: "text-emerald-600" },
    { key: "credit", label: "Credit (owed)", value: accounts.credit, color: "text-red-500", neg: true },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Mis cuentas</h2>
        <Button variant="ghost" size="sm" className="h-7 px-2 gap-1 text-xs text-muted-foreground hover:text-foreground" onClick={openEdit}>
          <Pencil size={12} /> Editar
        </Button>
      </div>
      <Card>
        <CardContent className="p-4 space-y-3">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{r.label}</span>
              <span className={`text-sm font-semibold tabular-nums ${r.color}`}>
                {r.neg ? "-" : ""}${Math.abs(r.value).toLocaleString()}
              </span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t pt-3">
            <span className="text-sm font-medium">Net</span>
            <span className={`text-sm font-bold tabular-nums ${net < 0 ? "text-red-500" : ""}`}>
              {net < 0 ? "-" : ""}${Math.abs(net).toLocaleString()}
            </span>
          </div>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar cuentas</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {([
              ["checking", "Checking"],
              ["savings", "Savings"],
              ["credit", "Credit (owed)"],
            ] as const).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label>{label}</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    className="pl-7"
                    placeholder="0.00"
                    value={draft[key]}
                    onChange={(e) => setDraft((d) => ({ ...d, [key]: e.target.value }))}
                  />
                </div>
              </div>
            ))}
            <Button onClick={save} className="w-full bg-violet-600 hover:bg-violet-700 text-white">Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
