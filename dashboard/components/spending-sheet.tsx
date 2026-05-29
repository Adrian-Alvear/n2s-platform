"use client";

import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES, MEMBERS, MEMBER_COLORS, type Category, type Member } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { MonthNav } from "@/components/month-nav";
import { Plus, Trash2, Pencil, Loader2 } from "lucide-react";

type Entry = { id: number; expense_at: string; description: string; category: string; amount: number; member: string };

function formatDateTime(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString("es", { day: "2-digit", month: "short" }) + " " +
    d.toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
}

function EntryForm({ initial, onSave, onCancel, saving }: {
  initial?: Partial<Entry>;
  onSave: (data: { description: string; amount: string; category: Category | ""; member: Member | "" }) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [description, setDescription] = useState(initial?.description ?? "");
  const [amount, setAmount] = useState(initial?.amount?.toString() ?? "");
  const [category, setCategory] = useState<Category | "">((initial?.category as Category) ?? "");
  const [member, setMember] = useState<Member | "">((initial?.member as Member) ?? "");

  return (
    <div className="space-y-4 pt-1">
      <div className="space-y-1.5">
        <Label>Descripción</Label>
        <Input placeholder="Ej. Mercado semanal" value={description} onChange={(e) => setDescription(e.target.value)} autoFocus />
      </div>
      <div className="space-y-1.5">
        <Label>Monto</Label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
          <Input placeholder="0.00" type="number" className="pl-7 text-lg font-semibold" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>Categoría</Label>
        <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
          <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>¿Quién pagó?</Label>
        <div className="flex gap-2">
          {MEMBERS.map((m) => (
            <button key={m} onClick={() => setMember(m)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border-2 ${member === m ? "border-violet-600 bg-violet-50 text-violet-700 dark:bg-violet-950 dark:text-violet-300" : "border-border text-muted-foreground hover:border-violet-300"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onCancel}>Cancelar</Button>
        <Button className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
          onClick={() => onSave({ description, amount, category, member })}
          disabled={!description || !amount || !category || !member || saving}>
          {saving ? <><Loader2 size={15} className="animate-spin mr-1" />Guardando...</> : "Guardar"}
        </Button>
      </div>
    </div>
  );
}

export function SpendingSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMember, setFilterMember] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    const { data } = await supabase.from("entries").select("*")
      .gte("expense_at", from).lt("expense_at", to)
      .order("expense_at", { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  }, [year, month]);

  useEffect(() => { if (open) fetchEntries(); }, [open, fetchEntries]);

  async function addEntry({ description, amount, category, member }: { description: string; amount: string; category: Category | ""; member: Member | "" }) {
    if (!description || !amount || !category || !member) return;
    setSaving(true);
    await supabase.from("entries").insert({ description, category, amount: parseFloat(amount), member });
    await fetchEntries();
    setSaving(false);
    setAddOpen(false);
  }

  async function saveEdit({ description, amount, category, member }: { description: string; amount: string; category: Category | ""; member: Member | "" }) {
    if (!editEntry || !description || !amount || !category || !member) return;
    setSaving(true);
    await supabase.from("entries").update({ description, category, amount: parseFloat(amount), member }).eq("id", editEntry.id);
    await fetchEntries();
    setSaving(false);
    setEditEntry(null);
  }

  async function deleteEntry(id: number) {
    await supabase.from("entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = entries.filter((e) => {
    if (filterMember !== "all" && e.member !== filterMember) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-border shrink-0">
            <div className="flex items-center justify-between">
              <SheetTitle>Gastos</SheetTitle>
              <div className="flex items-center gap-2">
                <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
                <Button size="sm" className="gap-1.5 bg-violet-600 hover:bg-violet-700 text-white" onClick={() => setAddOpen(true)}>
                  <Plus size={14} /> Agregar
                </Button>
              </div>
            </div>
          </SheetHeader>

          {/* Filters */}
          <div className="px-6 py-3 border-b border-border flex items-center gap-2 shrink-0 flex-wrap">
            <Select value={filterMember} onValueChange={setFilterMember}>
              <SelectTrigger className="w-36 h-8 text-xs"><SelectValue placeholder="Persona" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="w-44 h-8 text-xs"><SelectValue placeholder="Categoría" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            {(filterMember !== "all" || filterCategory !== "all") && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setFilterMember("all"); setFilterCategory("all"); }}>Limpiar</Button>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {filtered.length} · <span className="font-semibold text-foreground">${total.toFixed(2)}</span>
            </span>
          </div>

          {/* Entries list */}
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {loading && (
              <div className="flex items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="animate-spin mr-2" size={16} /> Cargando...
              </div>
            )}
            {!loading && filtered.length === 0 && (
              <div className="text-center py-16 text-muted-foreground text-sm">No hay gastos este mes</div>
            )}
            {filtered.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-base shrink-0">
                    {CATEGORY_ICONS[e.category] ?? "📦"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{e.description}</p>
                    <p className="text-xs text-muted-foreground">{e.category} · {formatDateTime(e.expense_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MEMBER_COLORS[e.member as Member] ?? "bg-gray-100 text-gray-700"}`}>{e.member}</span>
                  <span className="text-sm font-bold text-red-500 w-20 text-right">-${e.amount.toFixed(2)}</span>
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditEntry(e)}>
                      <Pencil size={12} />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEntry(e.id)}>
                      <Trash2 size={12} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      {/* Add dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
          <EntryForm onSave={addEntry} onCancel={() => setAddOpen(false)} saving={saving} />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editEntry} onOpenChange={(o) => { if (!o) setEditEntry(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar gasto</DialogTitle></DialogHeader>
          {editEntry && <EntryForm initial={editEntry} onSave={saveEdit} onCancel={() => setEditEntry(null)} saving={saving} />}
        </DialogContent>
      </Dialog>
    </>
  );
}

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠", Carro: "🚗", Seguro: "🛡️", Internet: "📡", Agua: "💧",
  Gas: "🔥", Gasolina: "⛽", "Renta Calentador": "🌡️", "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️", Cumpleaños: "🎂", "Transporte Uber": "🚕", "Mto Carro": "🔧", Otros: "📦",
};
