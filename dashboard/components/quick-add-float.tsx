"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORIES, MEMBERS, MEMBER_COLORS, type Category, type Member } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { Plus, Check, Loader2 } from "lucide-react";

export function QuickAddFloat() {
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<Category | "">("");
  const [member, setMember] = useState<Member | "">("");
  const [saved, setSaved] = useState(false);

  async function handleAdd() {
    if (!description || !amount || !category || !member) return;
    setSaved(true);
    await supabase.from("entries").insert({
      date: new Date().toISOString().slice(0, 10),
      description,
      category,
      amount: parseFloat(amount),
      member,
    });
    setTimeout(() => {
      setSaved(false);
      setOpen(false);
      setDescription("");
      setAmount("");
      setCategory("");
      setMember("");
      window.location.reload();
    }, 1000);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-lg flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-50">
          <Plus size={24} />
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Agregar gasto</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Input
              placeholder="Ej. Mercado, gasolina..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label>Monto</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                placeholder="0.00"
                type="number"
                className="pl-7 text-lg font-semibold"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Categoría</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger><SelectValue placeholder="Seleccionar categoría..." /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>¿Quién pagó?</Label>
            <div className="flex gap-2">
              {MEMBERS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMember(m)}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border-2 ${
                    member === m
                      ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300"
                      : "border-border text-muted-foreground hover:border-violet-300"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <Button
            className="w-full bg-violet-600 hover:bg-violet-700 text-white"
            onClick={handleAdd}
            disabled={!description || !amount || !category || !member || saved}
          >
            {saved ? <><Loader2 size={15} className="animate-spin mr-1" /> Guardando...</> : "Guardar gasto"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
