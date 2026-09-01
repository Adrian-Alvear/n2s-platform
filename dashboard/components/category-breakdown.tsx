"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import {
  OTHER_SLICE,
  categoryBreakdown,
  donutSegments,
  type LedgerEntry,
} from "@/lib/budget-analytics";
import { CHART_SLOTS, ROLLUP_COLOR, categoryIcon } from "@/lib/category-meta";
import { money, percent } from "@/lib/format";

/**
 * "Where the money went" — the month's spend as a donut plus a ranked legend.
 *
 * The donut is drawn as one dashed `<circle>` per slice rather than arc paths,
 * which keeps the geometry to a single pure function (`donutSegments`) and lets
 * a slice grow on hover without re-solving any maths.
 *
 * Colour is never the only carrier: every wedge has a legend row that names the
 * category, its amount and its share in text. The palette is the five validated
 * chart slots — anything past the fifth rank is rolled into one neutral slice
 * that expands in place, so no unvalidated sixth colour is ever invented.
 */

// The ring is drawn in a 42x42 box with the radius chosen so the circumference
// is exactly 100 — dash lengths are then percentages and read as such.
const VIEW = 42;
const CENTER = VIEW / 2;
const RADIUS = 15.915494309189535;
const CIRCUMFERENCE = 100;
const GAP = 1.2;
const MAX_SLICES = 5;

const COPY = {
  es: {
    title: "A dónde se fue",
    centerLabel: "Gastado",
    empty: "Sin gastos este mes",
    emptySub: "El desglose por categoría aparecerá aquí en cuanto se registre un gasto.",
    other: "Otras categorías",
    otherCount: (n: number) => (n === 1 ? "1 categoría" : `${n} categorías`),
    expand: "Mostrar las demás categorías",
    collapse: "Ocultar las demás categorías",
    open: (category: string) => `Ver el detalle de ${category}`,
    chart: (n: number, amount: string) =>
      `Desglose del gasto del mes: ${amount} repartidos en ${n} ${n === 1 ? "categoría" : "categorías"}`,
  },
  en: {
    title: "Where it went",
    centerLabel: "Spent",
    empty: "Nothing spent this month",
    emptySub: "The category breakdown shows up here as soon as there is an expense.",
    other: "Other categories",
    otherCount: (n: number) => (n === 1 ? "1 category" : `${n} categories`),
    expand: "Show the remaining categories",
    collapse: "Hide the remaining categories",
    open: (category: string) => `See the detail for ${category}`,
    chart: (n: number, amount: string) =>
      `Spending breakdown for the month: ${amount} across ${n} ${n === 1 ? "category" : "categories"}`,
  },
} as const;

function Skeleton() {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-5">
      <span className="block h-4 w-32 rounded bg-muted motion-safe:animate-pulse" />
      <div className="mt-5 flex justify-center">
        <span className="block h-36 w-36 rounded-full bg-muted motion-safe:animate-pulse" />
      </div>
      <div className="mt-5 space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <span key={i} className="block h-4 w-full rounded bg-muted motion-safe:animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/** One legend line: colour swatch, name, amount and share, all in text. */
function LegendRow({
  color,
  icon,
  name,
  amount,
  share,
  ariaLabel,
  dimmed,
  compact,
  trailing,
  onActivate,
  onHoverChange,
}: {
  color: string;
  icon: string;
  name: string;
  amount: number;
  share: number;
  ariaLabel: string;
  dimmed: boolean;
  compact?: boolean;
  trailing?: React.ReactNode;
  onActivate: () => void;
  onHoverChange: (hovering: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      onMouseEnter={() => onHoverChange(true)}
      onMouseLeave={() => onHoverChange(false)}
      onFocus={() => onHoverChange(true)}
      onBlur={() => onHoverChange(false)}
      aria-label={ariaLabel}
      className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
        dimmed ? "opacity-55" : ""
      } ${compact ? "pl-7" : ""}`}
    >
      <span
        aria-hidden
        className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
        style={{ backgroundColor: color }}
      />
      <span aria-hidden className="shrink-0 text-sm leading-none">
        {icon}
      </span>
      <span className={`min-w-0 flex-1 truncate ${compact ? "text-xs" : "text-sm"} text-foreground`}>
        {name}
      </span>
      <span className={`shrink-0 tabular-nums ${compact ? "text-xs" : "text-sm"} font-medium text-foreground`}>
        {money(amount, 2)}
      </span>
      <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
        {percent(share)}
      </span>
      {trailing}
    </button>
  );
}

export function CategoryBreakdown({
  scope,
  loading,
  entries,
  onSelect,
}: {
  scope: "family" | "personal";
  loading: boolean;
  /** Entries for the selected month. */
  entries: LedgerEntry[];
  /** Opens the drill-down for a real category. */
  onSelect: (category: string) => void;
}) {
  const L = scope === "personal" ? COPY.en : COPY.es;
  const [active, setActive] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);

  const { slices, total } = useMemo(
    () => categoryBreakdown(entries, MAX_SLICES),
    [entries],
  );
  const segments = useMemo(
    () => donutSegments(slices.map((s) => s.amount), CIRCUMFERENCE, GAP),
    [slices],
  );
  const rolledDetail = useMemo(() => {
    const rollup = slices.find((s) => s.category === OTHER_SLICE);
    if (!rollup) return [];
    const sums: Record<string, number> = {};
    for (const e of entries) {
      if (rollup.rolled.includes(e.category)) {
        sums[e.category] = (sums[e.category] ?? 0) + (Number(e.amount) || 0);
      }
    }
    return rollup.rolled.map((category) => ({ category, amount: sums[category] ?? 0 }));
  }, [slices, entries]);

  if (loading) return <Skeleton />;

  return (
    <section className="rounded-2xl bg-card ring-1 ring-border p-5">
      <h2 className="text-base font-semibold text-foreground">{L.title}</h2>

      {total <= 0 ? (
        <div className="flex min-h-[220px] flex-col items-center justify-center px-4 text-center">
          {/* An empty ring rather than a spinner or a blank box: the shape of
              the answer is there, it simply has nothing in it yet. */}
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} aria-hidden className="h-24 w-24">
            <circle
              cx={CENTER}
              cy={CENTER}
              r={RADIUS}
              fill="none"
              stroke="var(--muted)"
              strokeWidth="4"
              strokeDasharray="2 2"
            />
          </svg>
          <p className="mt-4 text-sm font-medium text-foreground">{L.empty}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{L.emptySub}</p>
        </div>
      ) : (
        <>
          <div className="mt-4 flex justify-center">
            <div className="relative">
              <svg
                viewBox={`0 0 ${VIEW} ${VIEW}`}
                role="img"
                aria-label={L.chart(slices.length, money(total, 2))}
                className="h-36 w-36 md:h-40 md:w-40"
                style={{ transform: "rotate(-90deg)" }}
              >
                {/* Track, so a mostly-empty month still reads as a ring. */}
                <circle cx={CENTER} cy={CENTER} r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth="4" />
                {slices.map((slice, i) => (
                  <circle
                    key={slice.category}
                    cx={CENTER}
                    cy={CENTER}
                    r={RADIUS}
                    fill="none"
                    stroke={slice.category === OTHER_SLICE ? ROLLUP_COLOR : CHART_SLOTS[i]}
                    strokeWidth={active === i ? 5.5 : 4}
                    strokeDasharray={`${segments[i].dash} ${CIRCUMFERENCE - segments[i].dash}`}
                    strokeDashoffset={segments[i].offset}
                    opacity={active === null || active === i ? 1 : 0.3}
                    className="motion-safe:transition-all motion-safe:duration-200"
                  />
                ))}
              </svg>
              {/* Centre readout sits outside the rotated SVG so it stays level. */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <p className="text-[11px] text-muted-foreground">
                  {active === null
                    ? L.centerLabel
                    : slices[active].category === OTHER_SLICE
                      ? L.other
                      : slices[active].category}
                </p>
                <p className="mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-foreground">
                  {money(active === null ? total : slices[active].amount, 2)}
                </p>
                {active !== null && (
                  <p className="text-[11px] tabular-nums text-muted-foreground">
                    {percent(slices[active].share)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-0.5">
            {slices.map((slice, i) =>
              slice.category === OTHER_SLICE ? (
                <div key={slice.category}>
                  <LegendRow
                    color={ROLLUP_COLOR}
                    icon="⋯"
                    name={`${L.other} · ${L.otherCount(slice.rolled.length)}`}
                    amount={slice.amount}
                    share={slice.share}
                    ariaLabel={expanded ? L.collapse : L.expand}
                    dimmed={active !== null && active !== i}
                    onActivate={() => setExpanded((v) => !v)}
                    onHoverChange={(h) => setActive(h ? i : null)}
                    trailing={
                      <ChevronDown
                        aria-hidden
                        size={14}
                        className={`shrink-0 text-muted-foreground motion-safe:transition-transform ${
                          expanded ? "rotate-180" : ""
                        }`}
                      />
                    }
                  />
                  {expanded && (
                    <div className="mt-0.5 space-y-0.5 border-l border-border pl-2">
                      {rolledDetail.map((r) => (
                        <LegendRow
                          key={r.category}
                          compact
                          color="var(--border)"
                          icon={categoryIcon(r.category)}
                          name={r.category}
                          amount={r.amount}
                          share={total > 0 ? r.amount / total : 0}
                          ariaLabel={L.open(r.category)}
                          dimmed={false}
                          onActivate={() => onSelect(r.category)}
                          onHoverChange={() => {}}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <LegendRow
                  key={slice.category}
                  color={CHART_SLOTS[i]}
                  icon={categoryIcon(slice.category)}
                  name={slice.category}
                  amount={slice.amount}
                  share={slice.share}
                  ariaLabel={L.open(slice.category)}
                  dimmed={active !== null && active !== i}
                  onActivate={() => onSelect(slice.category)}
                  onHoverChange={(h) => setActive(h ? i : null)}
                />
              ),
            )}
          </div>

        </>
      )}
    </section>
  );
}
