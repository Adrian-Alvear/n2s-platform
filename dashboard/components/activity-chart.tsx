"use client";

import { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

type Row = { expense_at: string; amount: number };

/**
 * Twelve-month spend history, the reference plate's "My activity" panel.
 *
 * Fetches its own window rather than reusing the page's current-month query,
 * which is scoped to one month by design. Bars are the app's budget accent;
 * the month under the cursor lifts to full opacity so the hover target is
 * never carried by colour alone.
 */
export function ActivityChart({
  scope,
  year,
  month,
  monthlyIncome,
  labels,
}: {
  scope: "family" | "personal";
  year: number;
  month: number;
  /** Flat monthly figure from INCOME/PERSONAL_INCOME — drawn as the paired series. */
  monthlyIncome: number;
  labels: { title: string; empty: string; loading: string; spent: string; income: string };
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    setLoading(true);
    // Twelve months back from the selected month, inclusive.
    const from = new Date(year, month - 11, 1).toISOString();
    const to = new Date(year, month + 1, 1).toISOString();
    supabase
      .from("entries")
      .select("expense_at, amount")
      .eq("scope", scope)
      .gte("expense_at", from)
      .lt("expense_at", to)
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [scope, year, month]);

  const data = useMemo(() => {
    const buckets = Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, month - 11 + i, 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        // Single letter, as in the reference's dense monthly axis.
        label: d.toLocaleDateString("en", { month: "narrow" }),
        full: d.toLocaleDateString("en", { month: "long", year: "numeric" }),
        income: monthlyIncome,
        spent: 0,
      };
    });
    const index = new Map(buckets.map((b, i) => [b.key, i]));
    for (const r of rows) {
      const d = new Date(r.expense_at);
      const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
      if (i !== undefined) buckets[i].spent += Number(r.amount) || 0;
    }
    return buckets;
  }, [rows, year, month, monthlyIncome]);

  const hasSpend = data.some((d) => d.spent > 0);

  return (
    <section className="rounded-2xl bg-card ring-1 ring-border p-5 md:p-6 flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-base font-semibold text-foreground">{labels.title}</h2>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--chart-2)" }} />
            {labels.income}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: "var(--app-budget)" }} />
            {labels.spent}
          </span>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-[180px]">
        {loading && (
          <div className="flex h-[180px] items-center justify-center text-muted-foreground">
            <Loader2 className="animate-spin mr-2" size={15} /> {labels.loading}
          </div>
        )}

        {!loading && !hasSpend && (
          <div className="flex h-[180px] items-center justify-center text-center text-sm text-muted-foreground">
            {labels.empty}
          </div>
        )}

        {!loading && hasSpend && (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart
              data={data}
              margin={{ top: 4, right: 0, bottom: 0, left: -18 }}
              onMouseLeave={() => setActive(null)}
            >
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={48}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : `${v}`)}
              />
              <Tooltip
                cursor={{ fill: "var(--muted)", opacity: 0.4 }}
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                  color: "var(--popover-foreground)",
                }}
                labelFormatter={(_, p) => p?.[0]?.payload?.full ?? ""}
                formatter={(v, n) => [`$${Number(v ?? 0).toFixed(2)}`, n === "income" ? labels.income : labels.spent]}
              />
              <Bar dataKey="income" radius={[4, 4, 0, 0]} isAnimationActive={false} maxBarSize={14}>
                {data.map((_, i) => (
                  <Cell key={i} fill="var(--chart-2)" fillOpacity={active === null || active === i ? 0.85 : 0.35} />
                ))}
              </Bar>
              <Bar
                dataKey="spent"
                radius={[4, 4, 0, 0]}
                maxBarSize={14}
                onMouseEnter={(_, i) => setActive(i)}
                isAnimationActive={false}
              >
                {data.map((_, i) => (
                  <Cell
                    key={i}
                    fill="var(--app-budget)"
                    fillOpacity={active === null || active === i ? 1 : 0.45}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
