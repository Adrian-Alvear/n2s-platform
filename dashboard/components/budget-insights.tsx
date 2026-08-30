"use client";

import { useMemo } from "react";
import { Gauge, TriangleAlert, ShieldCheck, TrendingUp, TrendingDown, Trophy, Receipt } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import {
  biggestMover,
  categoryAlerts,
  largestEntry,
  pace,
  sumByCategory,
  topSpender,
  total,
  type LedgerEntry,
} from "@/lib/budget-analytics";

/**
 * The band of derived signals under the hero: what the month is on pace to do,
 * which envelope is about to blow, what moved most against last month, and who
 * (or what) drove the spend.
 *
 * Everything here is computed from rows the page already fetched — no extra
 * query, no stored state. Tiles with nothing honest to say are not rendered at
 * all rather than shown empty, so the band shrinks on a quiet month instead of
 * padding itself with zeroes.
 */

/**
 * Magnitude only — direction is always carried by words ("Subió"/"Down"), never
 * by a minus sign the eye can miss at 11px.
 */
function money(n: number, decimals = 0): string {
  return `$${Math.abs(n).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

// Family scope is Spanish, personal scope is English. Both sides of every
// string live here together so a tile can never ship half-translated.
const COPY = {
  es: {
    title: "Señales del mes",
    paceLive: "Ritmo del mes",
    paceClosed: "Cierre del mes",
    paceOver: (over: string, days: number) => `Proyectado ${over} sobre el presupuesto · quedan ${days} ${days === 1 ? "día" : "días"}`,
    paceUnder: (under: string, days: number) => `Proyectado ${under} bajo el presupuesto · quedan ${days} ${days === 1 ? "día" : "días"}`,
    closedOver: (over: string) => `Cerró ${over} sobre el presupuesto`,
    closedUnder: (under: string) => `Cerró ${under} bajo el presupuesto`,
    paceNoBudget: (days: number) => `Sin presupuesto definido · quedan ${days} ${days === 1 ? "día" : "días"}`,
    closedNoBudget: "Sin presupuesto definido para este mes",
    perDay: (v: string) => `${v} por día`,
    watch: "Vigilancia de categoría",
    watchClear: "Todo dentro del límite",
    watchClearSub: "Ninguna categoría va camino a pasarse este mes",
    watchAlready: (over: string) => `Ya se pasó del límite por ${over}`,
    watchProjected: (over: string, when: string) => `A este ritmo se pasará por ${over} antes del ${when}`,
    watchMore: (n: number) => `+${n} ${n === 1 ? "categoría más en riesgo" : "categorías más en riesgo"}`,
    mover: "Mayor cambio",
    moverUp: (v: string, month: string) => `Subió ${v} vs ${month}`,
    moverDown: (v: string, month: string) => `Bajó ${v} vs ${month}`,
    moverSub: (cur: string, prev: string) => `${cur} este mes · ${prev} el mes pasado`,
    spender: "Quién gastó más",
    spenderSub: (amount: string, share: number) => `${amount} · ${share}% del gasto del mes`,
    largest: "Mayor gasto",
    largestSub: (amount: string, category: string) => `${amount} · ${category}`,
  },
  en: {
    title: "This month's signals",
    paceLive: "Month pace",
    paceClosed: "Month close",
    paceOver: (over: string, days: number) => `Projected ${over} over budget · ${days} ${days === 1 ? "day" : "days"} left`,
    paceUnder: (under: string, days: number) => `Projected ${under} under budget · ${days} ${days === 1 ? "day" : "days"} left`,
    closedOver: (over: string) => `Closed ${over} over budget`,
    closedUnder: (under: string) => `Closed ${under} under budget`,
    paceNoBudget: (days: number) => `No budget set · ${days} ${days === 1 ? "day" : "days"} left`,
    closedNoBudget: "No budget set for this month",
    perDay: (v: string) => `${v} per day`,
    watch: "Category watch",
    watchClear: "All within limits",
    watchClearSub: "No category is on pace to exceed this month",
    watchAlready: (over: string) => `Already ${over} over its limit`,
    watchProjected: (over: string, when: string) => `At this pace it will pass its limit by ${over} before ${when}`,
    watchMore: (n: number) => `+${n} more ${n === 1 ? "category" : "categories"} at risk`,
    mover: "Biggest mover",
    moverUp: (v: string, month: string) => `Up ${v} vs ${month}`,
    moverDown: (v: string, month: string) => `Down ${v} vs ${month}`,
    moverSub: (cur: string, prev: string) => `${cur} this month · ${prev} last month`,
    spender: "Top spender",
    spenderSub: (amount: string, share: number) => `${amount} · ${share}% of the month's spend`,
    largest: "Largest expense",
    largestSub: (amount: string, category: string) => `${amount} · ${category}`,
  },
} as const;

type Tone = "neutral" | "over" | "good";

function Tile({
  icon,
  label,
  value,
  detail,
  sub,
  tone = "neutral",
  lead,
  index,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  detail: string;
  sub?: string;
  tone?: Tone;
  /** Optional element shown before the value, e.g. a member monogram. */
  lead?: React.ReactNode;
  index: number;
}) {
  const valueTone =
    tone === "over"
      ? "text-destructive"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-foreground";

  return (
    <div
      className="n2s-rise rounded-2xl bg-card ring-1 ring-border p-4"
      // Staggered entrance, 60ms apart, so the band assembles left to right
      // instead of snapping in. Disabled under prefers-reduced-motion.
      style={{ animationDelay: `${index * 60}ms` }}
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"
        >
          {icon}
        </span>
        <p className="truncate text-xs font-medium text-muted-foreground">{label}</p>
      </div>
      <div className="mt-3 flex items-center gap-2">
        {lead}
        <p className={`truncate text-xl font-semibold tracking-tight tabular-nums ${valueTone}`}>{value}</p>
      </div>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{detail}</p>
      {sub && <p className="mt-0.5 text-[11px] text-muted-foreground/80">{sub}</p>}
    </div>
  );
}

function TileSkeleton({ index }: { index: number }) {
  return (
    <div className="rounded-2xl bg-card ring-1 ring-border p-4" style={{ animationDelay: `${index * 60}ms` }}>
      <div className="flex items-center gap-2">
        <span className="h-7 w-7 shrink-0 rounded-lg bg-muted motion-safe:animate-pulse" />
        <span className="h-3 w-24 rounded bg-muted motion-safe:animate-pulse" />
      </div>
      <span className="mt-4 block h-6 w-28 rounded bg-muted motion-safe:animate-pulse" />
      <span className="mt-2.5 block h-3 w-full rounded bg-muted motion-safe:animate-pulse" />
      <span className="mt-1.5 block h-3 w-2/3 rounded bg-muted motion-safe:animate-pulse" />
    </div>
  );
}

export function BudgetInsights({
  scope,
  loading,
  entries,
  previousEntries,
  limits,
  totalBudget,
  year,
  month,
  now,
}: {
  scope: "family" | "personal";
  loading: boolean;
  /** Entries for the selected month. */
  entries: LedgerEntry[];
  /** Entries for the month before it, for the comparison tile. */
  previousEntries: LedgerEntry[];
  /** Effective per-category limits for the selected month. */
  limits: Record<string, number>;
  totalBudget: number;
  year: number;
  month: number;
  /** Injected so the pace maths is deterministic and testable. */
  now: Date;
}) {
  const isP = scope === "personal";
  const L = isP ? COPY.en : COPY.es;
  const locale = isP ? "en" : "es";

  const signals = useMemo(() => {
    const spentByCategory = sumByCategory(entries);
    return {
      spent: total(entries),
      p: pace(total(entries), totalBudget, year, month, now),
      alerts: categoryAlerts(spentByCategory, limits, year, month, now),
      mover: biggestMover(entries, previousEntries),
      spender: topSpender(entries),
      largest: largestEntry(entries),
    };
  }, [entries, previousEntries, limits, totalBudget, year, month, now]);

  if (loading) {
    return (
      <section aria-label={L.title}>
        <h2 className="mb-3 text-base font-semibold text-foreground">{L.title}</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <TileSkeleton key={i} index={i} />
          ))}
        </div>
      </section>
    );
  }

  const { p, alerts, mover, spender, largest } = signals;

  // Last day of the selected month, written out — "antes del 30 de septiembre"
  // reads as a real deadline where a bare ordinal does not translate cleanly.
  const monthEnd = new Date(year, month + 1, 0).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
  });
  const prevMonthName = new Date(year, month - 1, 1).toLocaleDateString(locale, { month: "long" });

  const tiles: React.ReactNode[] = [];

  // 1 — pace. Always present: even at zero spend, "on track for $0 of $5,957"
  // is a true and useful statement about the month.
  {
    // The personal ledger carries no budget figures, so there is nothing to be
    // over or under — the tile reports the pace and says so plainly instead of
    // calling every dollar an overrun.
    const hasBudget = totalBudget > 0;
    const over = hasBudget && p.overBy > 0;
    const detail = !hasBudget
      ? p.live
        ? L.paceNoBudget(p.daysLeft)
        : L.closedNoBudget
      : p.live
        ? over
          ? L.paceOver(money(p.overBy), p.daysLeft)
          : L.paceUnder(money(-p.overBy), p.daysLeft)
        : over
          ? L.closedOver(money(p.overBy))
          : L.closedUnder(money(-p.overBy));
    tiles.push(
      <Tile
        key="pace"
        index={tiles.length}
        icon={<Gauge size={14} />}
        label={p.live ? L.paceLive : L.paceClosed}
        value={money(p.live ? p.projected : p.spent)}
        detail={detail}
        // Cents matter at a few dollars a day and are noise at a few hundred.
        sub={p.perDay > 0 ? L.perDay(money(p.perDay, p.perDay < 10 ? 2 : 0)) : undefined}
        tone={!hasBudget ? "neutral" : over ? "over" : "good"}
      />,
    );
  }

  // 2 — the envelope most at risk, or the all-clear.
  if (alerts.length > 0) {
    const a = alerts[0];
    tiles.push(
      <Tile
        key="watch"
        index={tiles.length}
        icon={<TriangleAlert size={14} />}
        label={L.watch}
        value={a.category}
        detail={a.already ? L.watchAlready(money(a.spent - a.limit)) : L.watchProjected(money(a.overBy), monthEnd)}
        sub={alerts.length > 1 ? L.watchMore(alerts.length - 1) : undefined}
        tone="over"
      />,
    );
  } else if (signals.spent > 0 && Object.values(limits).some((v) => v > 0)) {
    tiles.push(
      <Tile
        key="watch"
        index={tiles.length}
        icon={<ShieldCheck size={14} />}
        label={L.watch}
        value={L.watchClear}
        detail={L.watchClearSub}
        tone="good"
      />,
    );
  }

  // 3 — month over month. Skipped entirely when there is no previous month to
  // compare against, rather than claiming everything moved from zero.
  if (mover && previousEntries.length > 0) {
    const up = mover.delta > 0;
    tiles.push(
      <Tile
        key="mover"
        index={tiles.length}
        icon={up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
        label={L.mover}
        value={mover.category}
        detail={up ? L.moverUp(money(mover.delta), prevMonthName) : L.moverDown(money(mover.delta), prevMonthName)}
        sub={L.moverSub(money(mover.current), money(mover.previous))}
      />,
    );
  }

  // 4 — who drove it. Three people share the family ledger, so "who" is the
  // interesting cut; the personal ledger is one person, so "what" is instead.
  if (!isP && spender) {
    tiles.push(
      <Tile
        key="spender"
        index={tiles.length}
        icon={<Trophy size={14} />}
        label={L.spender}
        value={spender.member}
        lead={<MemberAvatar name={spender.member} size="sm" />}
        detail={L.spenderSub(money(spender.amount), Math.round(spender.share * 100))}
      />,
    );
  } else if (isP && largest) {
    tiles.push(
      <Tile
        key="largest"
        index={tiles.length}
        icon={<Receipt size={14} />}
        label={L.largest}
        value={largest.description}
        detail={L.largestSub(money(Number(largest.amount), 2), largest.category)}
      />,
    );
  }

  return (
    <section aria-label={L.title}>
      <h2 className="mb-3 text-base font-semibold text-foreground">{L.title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">{tiles}</div>
    </section>
  );
}
