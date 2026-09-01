"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CATEGORIES, MEMBERS, MEMBER_COLORS, type Category, type Member } from "@/lib/data";
import { supabase } from "@/lib/supabase";
import { mutate } from "@/lib/db";
import { useUser } from "@/lib/user-context";
import { useBudgetScope } from "@/lib/budget-scope";
import { MonthNav } from "@/components/month-nav";
import { categoryIcon } from "@/lib/category-meta";
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

export default function Spending() {
  const now = new Date();
  const { user } = useUser();
  const { scope } = useBudgetScope();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterMember, setFilterMember] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<Entry | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canPersonal = (user?.name ?? "").toLowerCase().startsWith("adrian");
  const activeScope = canPersonal ? scope : "family";

  useEffect(() => { fetchEntries(); }, [year, month, activeScope]);

  async function fetchEntries() {
    setLoading(true);
    const from = new Date(year, month, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    const { data } = await supabase.from("entries").select("*")
      .eq("scope", activeScope)
      .gte("expense_at", from).lt("expense_at", to)
      .order("expense_at", { ascending: false });
    setEntries(data ?? []);
    setLoading(false);
  }

  async function addEntry({ description, amount, category, member }: { description: string; amount: string; category: Category | ""; member: Member | "" }) {
    if (!description || !amount || !category || !member) return;
    setError(null);
    setSaving(true);
    const err = await mutate(supabase.from("entries").insert({ description, category, amount: parseFloat(amount), member, scope: activeScope }));
    setSaving(false);
    // Keep the dialog open on failure so the typed entry isn't lost.
    if (err) { setError("No se pudo guardar el gasto. Intenta de nuevo."); return; }
    await fetchEntries();
    setAddOpen(false);
  }

  async function saveEdit({ description, amount, category, member }: { description: string; amount: string; category: Category | ""; member: Member | "" }) {
    if (!editEntry || !description || !amount || !category || !member) return;
    setError(null);
    setSaving(true);
    const err = await mutate(supabase.from("entries").update({ description, category, amount: parseFloat(amount), member }).eq("id", editEntry.id));
    setSaving(false);
    if (err) { setError("No se pudo guardar el cambio. Intenta de nuevo."); return; }
    await fetchEntries();
    setEditEntry(null);
  }

  async function deleteEntry(id: number) {
    setError(null);
    const err = await mutate(supabase.from("entries").delete().eq("id", id));
    // Only drop it from the list once the delete actually succeeded — otherwise
    // the row vanishes from the UI while still sitting in the database.
    if (err) { setError("No se pudo eliminar el gasto."); return; }
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const filtered = entries.filter((e) => {
    if (filterMember !== "all" && e.member !== filterMember) return false;
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    return true;
  });

  const total = filtered.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Gastos</h1>
          {error && (
            <p className="text-sm text-destructive" role="alert">{error}</p>
          )}
          <p className="text-muted-foreground text-sm mt-1">Registra y revisa todos los gastos</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-muted px-1 py-0.5">
            <MonthNav year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          </div>
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-violet-600 hover:bg-violet-700 text-white"><Plus size={15} /> Agregar</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-sm">
              <DialogHeader><DialogTitle>Nuevo gasto</DialogTitle></DialogHeader>
              <EntryForm onSave={addEntry} onCancel={() => setAddOpen(false)} saving={saving} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <Select value={filterMember} onValueChange={setFilterMember}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Persona" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {MEMBERS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Categoría" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas las categorías</SelectItem>
            {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
          </SelectContent>
        </Select>
        {(filterMember !== "all" || filterCategory !== "all") && (
          <Button variant="ghost" size="sm" onClick={() => { setFilterMember("all"); setFilterCategory("all"); }}>Limpiar</Button>
        )}
        <span className="ml-auto text-sm text-muted-foreground">
          {filtered.length} registros · <span className="font-semibold text-foreground tabular-nums">${total.toFixed(2)}</span>
        </span>
      </div>

      <Dialog open={!!editEntry} onOpenChange={(o) => { if (!o) setEditEntry(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Editar gasto</DialogTitle></DialogHeader>
          {editEntry && <EntryForm initial={editEntry} onSave={saveEdit} onCancel={() => setEditEntry(null)} saving={saving} />}
        </DialogContent>
      </Dialog>

      {/* Entries table — the same shape as the budget page's "Últimos
          movimientos" card and the spending sheet: muted grey column headings,
          a high-contrast truncating description, the amount as a plain neutral
          figure, the member as a status pill, and secondary detail (category,
          date) demoted to grey columns. Narrow screens drop those columns and
          fold category + date under the description. Row actions get their own
          trailing column. */}
      <Card>
        <CardContent className="p-0">
          {loading && (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={16} /> Cargando...
            </div>
          )}
          {!loading && filtered.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">No hay gastos este mes</div>
          )}
          {!loading && filtered.length > 0 && (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="w-full px-4 md:px-6 py-3 text-left text-xs font-normal text-muted-foreground">Descripción</th>
                  <th className="px-3 py-3 text-right text-xs font-normal text-muted-foreground">Monto</th>
                  <th className="hidden md:table-cell px-3 py-3 text-left text-xs font-normal text-muted-foreground">Categoría</th>
                  <th className="hidden sm:table-cell px-3 py-3 text-left text-xs font-normal text-muted-foreground">Persona</th>
                  <th className="hidden md:table-cell px-3 py-3 text-right text-xs font-normal text-muted-foreground">Fecha</th>
                  <th className="px-4 md:px-6 py-3"><span className="sr-only">Acciones</span></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((e) => (
                  <tr key={e.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/40 transition-colors">
                    <td className="px-4 md:px-6 py-3.5 max-w-0">
                      <p className="truncate font-medium text-foreground">{e.description}</p>
                      <p className="md:hidden truncate text-xs text-muted-foreground">{e.category} · {formatDateTime(e.expense_at)}</p>
                    </td>
                    <td className="px-3 py-3.5 text-right font-medium tabular-nums text-foreground whitespace-nowrap">-${e.amount.toFixed(2)}</td>
                    <td className="hidden md:table-cell px-3 py-3.5 text-muted-foreground whitespace-nowrap">
                      <span className="mr-1.5">{categoryIcon(e.category)}</span>{e.category}
                    </td>
                    <td className="hidden sm:table-cell px-3 py-3.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${MEMBER_COLORS[e.member as Member] ?? "bg-muted text-muted-foreground"}`}>{e.member}</span>
                    </td>
                    <td className="hidden md:table-cell px-3 py-3.5 text-right text-muted-foreground tabular-nums whitespace-nowrap">{formatDateTime(e.expense_at)}</td>
                    <td className="px-4 md:px-6 py-3.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setEditEntry(e)}>
                          <Pencil size={12} />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={() => deleteEntry(e.id)}>
                          <Trash2 size={12} />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
