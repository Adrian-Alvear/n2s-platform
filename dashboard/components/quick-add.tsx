"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORIES, MEMBERS, MEMBER_COLORS, type Category, type Member } from "@/lib/data";
import { Plus, Check } from "lucide-react";

export function QuickAdd() {
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [member, setMember] = useState<Member | "">("");
  const [saved, setSaved] = useState(false);

  function handleAdd() {
    if (!description || !amount || !category || !member) return;
    // In a real app this would write to a shared store / DB
    setSaved(true);
    setDescription("");
    setAmount("");
    setCategory("");
    setMember("");
    setTimeout(() => setSaved(false), 2000);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleAdd();
  }

  return (
    <div className="border-b border-border bg-background px-6 py-3">
      <div className="flex items-center gap-2 max-w-5xl mx-auto">
        <span className="text-xs font-medium text-muted-foreground shrink-0">Agregar gasto</span>
        <Input
          placeholder="Descripción"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onKeyDown={handleKey}
          className="h-8 text-sm"
        />
        <div className="relative w-28 shrink-0">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">$</span>
          <Input
            placeholder="0.00"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={handleKey}
            className="h-8 text-sm pl-5 w-28"
          />
        </div>
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger className="h-8 text-sm w-44 shrink-0">
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={member} onValueChange={(v) => setMember(v as Member)}>
          <SelectTrigger className="h-8 text-sm w-32 shrink-0">
            <SelectValue placeholder="¿Quién?" />
          </SelectTrigger>
          <SelectContent>
            {MEMBERS.map((m) => (
              <SelectItem key={m} value={m}>
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${MEMBER_COLORS[m]}`}>{m}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          size="sm"
          className="h-8 shrink-0 gap-1"
          onClick={handleAdd}
          disabled={!description || !amount || !category || !member}
        >
          {saved ? <><Check size={13} /> Guardado</> : <><Plus size={13} /> Agregar</>}
        </Button>
      </div>
    </div>
  );
}
