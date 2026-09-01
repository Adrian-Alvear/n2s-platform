"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Check, Clock, Repeat } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { categoryIcon } from "@/lib/category-meta";
import { money, percent } from "@/lib/format";
import type { LedgerEntry } from "@/lib/budget-analytics";
import {
  detectRecurring,
  summarizeRecurring,
  type RecurringStatus,
} from "@/lib/recurring";

/**
 * The household's fixed commitments, recovered from the ledger.
 *
 * Nobody in this house keeps a list of subscriptions — the rent, the insurance
 * and the internet bill are just rows somebody types every month. This panel
 * reads the last six months, works out which of those rows repeat, and then
 * says what the month being viewed still owes: what usually lands, roughly
 * when, and whether it has shown up yet.
 *
 * All the detection lives in lib/recurring.ts as pure functions. This file
 * fetches its own window (the page only holds two months, and a commitment
 * needs a longer history than that), holds the copy and draws the rows.
 *
 * Every status is written out as a word beside its icon — colour is never the
 * only thing saying a bill is late.
 */

const LOOKBACK = 6;
const PAGE = 6;

const COPY = {
  es: {
    title: "Gastos fijos",
    subtitle: "Detectados de los últimos 6 meses",
    committed: "Compromiso mensual",
    covered: (p: string) => `${p} cubierto este mes`,
    outstanding: (a: string) => `Faltan ${a}`,
    settled: "Todo al día este mes",
    empty: "Aún no hay gastos fijos",
    emptySub:
      "Cuando un gasto se repita al menos tres meses seguidos aparecerá acá con lo que suele costar.",
    seen: (n: number, of: number) => `${n} de ${of} meses`,
    expected: (d: number) => `suele caer el ${d}`,
    varies: "varía",
    paidFor: (a: string) => `pagado: ${a}`,
    open: (label: string) => `Ver la categoría de ${label}`,
    more: (n: number) => `Ver ${n} más`,
    less: "Ver menos",
    status: {
      paid: "Pagado",
      due: "Pendiente",
      late: "Atrasado",
      missed: "No apareció",
    } as Record<RecurringStatus, string>,
  },
  en: {
    title: "Fixed costs",
    subtitle: "Detected from the last 6 months",
    committed: "Monthly commitment",
    covered: (p: string) => `${p} covered this month`,
    outstanding: (a: string) => `${a} still to come`,
    settled: "All settled this month",
    empty: "No fixed costs yet",
    emptySub:
      "Once an expense repeats for three months running it shows up here with what it usually costs.",
    seen: (n: number, of: number) => `${n} of ${of} months`,
    expected: (d: number) => `usually lands on the ${d}${ordinal(d)}`,
    varies: "varies",
    paidFor: (a: string) => `paid: ${a}`,
    open: (label: string) => `Open the ${label} category`,
    more: (n: number) => `Show ${n} more`,
    less: "Show less",
    status: {
      paid: "Paid",
      due: "Due",
      late: "Late",
      missed: "Never arrived",
    } as Record<RecurringStatus, string>,
  },
} as const;

/** English-only helper; the Spanish copy says "el 5" and needs no suffix. */
function ordinal(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  return ["th", "st", "nd", "rd"][day % 10] ?? "th";
}

const STATUS_ICON: Record<RecurringStatus, typeof Check> = {
  paid: Check,
  due: Clock,
  late: AlertTriangle,
  missed: AlertTriangle,
};

/**
 * Tone per status. `paid` deliberately stays neutral: a settled bill is the
 * normal case and does not need to shout, and the word "Pagado" is already
 * there for anyone who cannot separate the hues.
 */
const STATUS_TONE: Record<RecurringStatus, { color: string; tint: string }> = {
  paid: { color: "var(--muted-foreground)", tint: "var(--muted)" },
  due: {
    color: "var(--app-budget)",
    tint: "color-mix(in oklch, var(--app-budget) 14%, transparent)",
  },
  late: {
    color: "var(--destructive)",
    tint: "color-mix(in oklch, var(--destructive) 14%, transparent)",
  },
  missed: {
    color: "var(--destructive)",
    tint: "color-mix(in oklch, var(--destructive) 14%, transparent)",
  },
};

function Skeleton({ title }: { title: string }) {
  return (
    <section className="rounded-2xl bg-card ring-1 ring-border p-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <span className="mt-4 block h-10 w-full rounded-lg bg-muted motion-safe:animate-pulse" />
      <div className="mt-4 space-y-3">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <span className="h-8 w-8 shrink-0 rounded-full bg-muted motion-safe:animate-pulse" />
            <span className="h-4 flex-1 rounded bg-muted motion-safe:animate-pulse" />
            <span className="h-4 w-14 rounded bg-muted motion-safe:animate-pulse" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function RecurringPanel({
  scope,
  year,
  month,
  now,
  onSelect,
}: {
  scope: "family" | "personal";
  year: number;
  month: number;
  /** Stable clock from the page, so the due/late line does not drift. */
  now: Date;
  /** Opens the category drill-down for the row that was clicked. */
  onSelect: (category: string) => void;
}) {
  const isP = scope === "personal";
  const L = isP ? COPY.en : COPY.es;

  const [rows, setRows] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // Own window: the page holds two months, and three sightings cannot be
    // established from that. Read only — this panel never writes.
    const from = new Date(year, month - LOOKBACK, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    supabase
      .from("entries")
      .select("id, expense_at, description, category, amount, member")
      .eq("scope", scope)
      .gte("expense_at", from)
      .lt("expense_at", to)
      .then(({ data }) => {
        if (cancelled) return;
        setRows((data ?? []) as LedgerEntry[]);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scope, year, month]);

  // Collapse again whenever the window changes, so a long list from one month
  // does not carry over into the next.
  useEffect(() => setExpanded(false), [scope, year, month]);

  const series = useMemo(
    () => detectRecurring(rows, year, month, now, { lookback: LOOKBACK }),
    [rows, year, month, now],
  );
  const stats = useMemo(() => summarizeRecurring(series), [series]);

  if (loading) return <Skeleton title={L.title} />;

  const shown = expanded ? series : series.slice(0, PAGE);
  const hidden = series.length - shown.length;

  return (
    <section className="rounded-2xl bg-card ring-1 ring-border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">{L.title}</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{L.subtitle}</p>
        </div>
        <Repeat aria-hidden size={16} className="mt-1 shrink-0 text-muted-foreground" />
      </div>

      {series.length === 0 ? (
        <div className="flex min-h-[160px] flex-col items-center justify-center px-2 text-center">
          <span
            aria-hidden
            className="flex h-12 w-12 items-center justify-center rounded-full border border-dashed border-border text-muted-foreground"
          >
            <Repeat size={18} />
          </span>
          <p className="mt-4 text-sm font-medium text-foreground">{L.empty}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{L.emptySub}</p>
        </div>
      ) : (
        <>
          {/* What the month owes in total, and how much of it has landed. The
              rail repeats the percentage in words beside it. */}
          <div className="mt-4 rounded-xl bg-muted/50 p-3.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-xs text-muted-foreground">{L.committed}</span>
              <span className="text-lg font-semibold tabular-nums text-foreground">
                {money(stats.committed, 2)}
              </span>
            </div>
            <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
                style={{
                  width: `${stats.coverage * 100}%`,
                  backgroundColor: "var(--app-budget)",
                }}
              />
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {L.covered(percent(stats.coverage))}
              {" · "}
              {stats.outstanding > 0 ? L.outstanding(money(stats.outstanding, 2)) : L.settled}
            </p>
          </div>

          <ul className="mt-3 divide-y divide-border/50">
            {shown.map((s) => {
              const Icon = STATUS_ICON[s.status];
              const tone = STATUS_TONE[s.status];
              return (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => onSelect(s.category)}
                    aria-label={L.open(s.category)}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span aria-hidden className="text-lg leading-none">
                      {categoryIcon(s.category)}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-foreground">
                        {s.label}
                      </span>
                      <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">
                        {L.seen(s.monthsSeen, s.monthsWindow)} · {L.expected(s.expectedDay)}
                        {s.fixed ? "" : ` · ${L.varies}`}
                        {s.status === "paid" ? ` · ${L.paidFor(money(s.currentAmount, 2))}` : ""}
                      </span>
                    </span>

                    <span className="shrink-0 text-right">
                      <span className="block text-sm font-semibold tabular-nums text-foreground">
                        {s.fixed ? "" : "~"}
                        {money(s.typical, 2)}
                      </span>
                      <span
                        className="mt-1 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ color: tone.color, backgroundColor: tone.tint }}
                      >
                        <Icon aria-hidden size={10} />
                        {L.status[s.status]}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {series.length > PAGE && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 w-full rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {expanded ? L.less : L.more(hidden)}
            </button>
          )}
        </>
      )}
    </section>
  );
}
