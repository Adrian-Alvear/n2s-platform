"use client";

import { useEffect, useState } from "react";
import { Plus, Check, X, Pencil } from "lucide-react";
import { getGoals, saveGoals, goalPct, type Goal } from "@/lib/goals-store";

const ICONS = ["🛟", "✈️", "💻", "🏠", "🚗", "🎓", "💍", "🎁"];

/**
 * Savings goals, the reference plate's "My goals" panel: an icon tile, the
 * name, a saved/target readout and a progress rail per row.
 *
 * Editing is inline — the reference shows a "+" and a row menu, and this is the
 * lightest thing that gives both without a dialog.
 */
export function SavingsGoals({
  labels,
}: {
  labels: { title: string; empty: string; add: string; name: string; saved: string; target: string; save: string; cancel: string; remove: string };
}) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<Goal | null>(null);

  useEffect(() => { setGoals(getGoals()); }, []);

  function commit(next: Goal[]) {
    setGoals(next);
    saveGoals(next);
  }

  function startAdd() {
    const g: Goal = { id: `g${Date.now()}`, name: "", saved: 0, target: 0, icon: "🎯" };
    setDraft(g);
    setEditing(g.id);
  }

  function saveDraft() {
    if (!draft) return;
    if (!draft.name.trim()) { setDraft(null); setEditing(null); return; }
    const exists = goals.some((g) => g.id === draft.id);
    commit(exists ? goals.map((g) => (g.id === draft.id ? draft : g)) : [...goals, draft]);
    setDraft(null);
    setEditing(null);
  }

  const rows = draft && !goals.some((g) => g.id === draft.id) ? [...goals, draft] : goals;

  return (
    <section className="rounded-2xl bg-card ring-1 ring-border p-5 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-foreground">{labels.title}</h2>
        <button
          onClick={startAdd}
          aria-label={labels.add}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-colors hover:text-foreground"
        >
          <Plus size={15} />
        </button>
      </div>

      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">{labels.empty}</p>
      )}

      <div className="mt-4 space-y-4">
        {rows.map((g) => {
          const isEditing = editing === g.id;
          const shown = isEditing && draft?.id === g.id ? draft : g;
          const pct = goalPct(shown);

          if (isEditing) {
            return (
              <div key={g.id} className="rounded-xl bg-muted/40 p-3 space-y-2.5">
                <div className="flex items-center gap-2">
                  <select
                    value={shown.icon}
                    onChange={(e) => setDraft({ ...shown, icon: e.target.value })}
                    className="h-9 w-14 rounded-lg border border-border bg-background text-center text-lg"
                    aria-label="Icon"
                  >
                    {ICONS.map((i) => <option key={i} value={i}>{i}</option>)}
                  </select>
                  <input
                    autoFocus
                    value={shown.name}
                    onChange={(e) => setDraft({ ...shown, name: e.target.value })}
                    placeholder={labels.name}
                    className="h-9 flex-1 rounded-lg border border-border bg-background px-3 text-sm"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="flex-1">
                    <span className="text-[11px] text-muted-foreground">{labels.saved}</span>
                    <input
                      type="number"
                      value={shown.saved || ""}
                      onChange={(e) => setDraft({ ...shown, saved: parseFloat(e.target.value) || 0 })}
                      className="mt-0.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                    />
                  </label>
                  <label className="flex-1">
                    <span className="text-[11px] text-muted-foreground">{labels.target}</span>
                    <input
                      type="number"
                      value={shown.target || ""}
                      onChange={(e) => setDraft({ ...shown, target: parseFloat(e.target.value) || 0 })}
                      className="mt-0.5 h-9 w-full rounded-lg border border-border bg-background px-3 text-sm tabular-nums"
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    onClick={saveDraft}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: "var(--app-budget)" }}
                  >
                    <Check size={13} /> {labels.save}
                  </button>
                  <button
                    onClick={() => { setDraft(null); setEditing(null); }}
                    className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
                  >
                    {labels.cancel}
                  </button>
                  {goals.some((x) => x.id === g.id) && (
                    <button
                      onClick={() => { commit(goals.filter((x) => x.id !== g.id)); setDraft(null); setEditing(null); }}
                      className="ml-auto flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                    >
                      <X size={13} /> {labels.remove}
                    </button>
                  )}
                </div>
              </div>
            );
          }

          return (
            <div key={g.id} className="group flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted text-xl">
                {g.icon}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{g.name}</p>
                  <button
                    onClick={() => { setDraft({ ...g }); setEditing(g.id); }}
                    aria-label={`Edit ${g.name}`}
                    className="shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                  ${g.saved.toLocaleString()} / ${g.target.toLocaleString()}
                  <span className="ml-2">{pct.toFixed(0)}%</span>
                </p>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{ width: `${pct}%`, backgroundColor: "var(--app-budget)" }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
