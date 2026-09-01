"use client";

import { useMemo } from "react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { MemberAvatar } from "@/components/member-avatar";
import { categoryDetail, type LedgerEntry } from "@/lib/budget-analytics";
import { categoryIcon } from "@/lib/category-meta";
import { money, percent } from "@/lib/format";
import { MEMBER_COLORS } from "@/lib/data";

/**
 * Drill-down for a single category: what it spent, how that compares with its
 * limit and with last month, and every line behind the number.
 *
 * It is handed the rows the page already fetched rather than querying again, so
 * opening it is instant and it can never disagree with the donut it came from.
 */

const COPY = {
  es: {
    ofMonth: "del gasto del mes",
    limit: "Límite",
    noLimit: "Sin límite",
    noLimitSub: "Esta categoría no tiene presupuesto asignado este mes.",
    lines: "Movimientos",
    average: "Promedio",
    vsLast: "vs mes pasado",
    up: (v: string) => `Subió ${v}`,
    down: (v: string) => `Bajó ${v}`,
    flat: "Sin cambio",
    newThisMonth: "Nuevo este mes",
    used: (pct: string) => `${pct} del límite usado`,
    over: (v: string) => `Se pasó ${v} del límite`,
    paceOver: (v: string, when: string) => `A este ritmo se pasará por ${v} antes del ${when}`,
    paceUnder: (v: string) => `Va camino a cerrar ${v} por debajo del límite`,
    perDay: (v: string) => `${v} por día`,
    who: "Quién gastó más",
    empty: "Sin movimientos en esta categoría este mes",
    close: "Cerrar",
  },
  en: {
    ofMonth: "of the month's spend",
    limit: "Limit",
    noLimit: "No limit",
    noLimitSub: "This category has no budget assigned this month.",
    lines: "Transactions",
    average: "Average",
    vsLast: "vs last month",
    up: (v: string) => `Up ${v}`,
    down: (v: string) => `Down ${v}`,
    flat: "No change",
    newThisMonth: "New this month",
    used: (pct: string) => `${pct} of the limit used`,
    over: (v: string) => `${v} over the limit`,
    paceOver: (v: string, when: string) => `At this pace it will pass its limit by ${v} before ${when}`,
    paceUnder: (v: string) => `On track to close ${v} under the limit`,
    perDay: (v: string) => `${v} per day`,
    who: "Top spender",
    empty: "No transactions in this category this month",
    close: "Close",
  },
} as const;

function Stat({ label, value, tone }: { label: string; value: string; tone?: "over" | "good" }) {
  const color =
    tone === "over"
      ? "text-destructive"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-foreground";
  return (
    <div className="rounded-xl bg-muted/50 px-3 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className={`mt-1 truncate text-sm font-semibold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}

export function CategoryDetailSheet({
  category,
  onClose,
  scope,
  entries,
  previousEntries,
  limits,
  year,
  month,
  now,
}: {
  /** The open category, or null when the sheet is closed. */
  category: string | null;
  onClose: () => void;
  scope: "family" | "personal";
  entries: LedgerEntry[];
  previousEntries: LedgerEntry[];
  limits: Record<string, number>;
  year: number;
  month: number;
  now: Date;
}) {
  const isP = scope === "personal";
  const L = isP ? COPY.en : COPY.es;
  const locale = isP ? "en" : "es";

  const detail = useMemo(
    () =>
      category
        ? categoryDetail(category, entries, previousEntries, limits[category] ?? 0, year, month, now)
        : null,
    [category, entries, previousEntries, limits, year, month, now],
  );

  const monthLabel = new Date(year, month, 1).toLocaleDateString(locale, {
    month: "long",
    year: "numeric",
  });
  const monthEnd = new Date(year, month + 1, 0).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
  });

  const hasLimit = (detail?.limit ?? 0) > 0;
  const overBy = detail ? detail.spent - detail.limit : 0;
  const usedPct = detail && hasLimit ? Math.min(detail.spent / detail.limit, 1) : 0;

  return (
    <Sheet open={category !== null} onOpenChange={(open) => !open && onClose()}>
      {/* The shared SheetContent close button is labelled in English only;
          this sheet renders its own so the label follows the active scope. */}
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
      >
        <SheetClose asChild>
          <Button variant="ghost" size="icon-sm" className="absolute top-3 right-3">
            <X aria-hidden />
            <span className="sr-only">{L.close}</span>
          </Button>
        </SheetClose>
        {detail && (
          <>
            <SheetHeader className="pb-2">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-lg"
                >
                  {categoryIcon(detail.category)}
                </span>
                <div className="min-w-0">
                  <SheetTitle className="truncate">{detail.category}</SheetTitle>
                  <SheetDescription className="capitalize">{monthLabel}</SheetDescription>
                </div>
              </div>
            </SheetHeader>

            <div className="space-y-5 px-4 pb-6">
              {/* Headline: what this category cost, and how much of the month
                  it accounts for. */}
              <div>
                <p className="text-3xl font-semibold tracking-tight tabular-nums text-foreground">
                  {money(detail.spent, 2)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {percent(detail.share)} {L.ofMonth}
                </p>
              </div>

              {/* Against the limit. The rail is never the only signal — the
                  sentence under it repeats the state in words. */}
              {hasLimit ? (
                <div className="space-y-2">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="text-muted-foreground">
                      {L.limit} {money(detail.limit)}
                    </span>
                    <span
                      className={`font-medium tabular-nums ${overBy > 0 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {overBy > 0 ? L.over(money(overBy, 2)) : L.used(percent(usedPct))}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500"
                      style={{
                        width: `${usedPct * 100}%`,
                        backgroundColor: overBy > 0 ? "var(--destructive)" : "var(--app-budget)",
                      }}
                    />
                  </div>
                  {detail.pace.live && detail.spent > 0 && (
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {detail.pace.overBy > 0
                        ? L.paceOver(money(detail.pace.overBy, 2), monthEnd)
                        : L.paceUnder(money(-detail.pace.overBy, 2))}
                      {detail.pace.perDay > 0 && (
                        <> · {L.perDay(money(detail.pace.perDay, detail.pace.perDay < 10 ? 2 : 0))}</>
                      )}
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-border px-3 py-2.5">
                  <p className="text-xs font-medium text-foreground">{L.noLimit}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{L.noLimitSub}</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <Stat label={L.lines} value={String(detail.count)} />
                <Stat label={L.average} value={money(detail.average, 2)} />
                <Stat
                  label={L.vsLast}
                  value={
                    detail.previous === 0 && detail.spent > 0
                      ? L.newThisMonth
                      : detail.delta === 0
                        ? L.flat
                        : detail.delta > 0
                          ? L.up(money(detail.delta, 2))
                          : L.down(money(detail.delta, 2))
                  }
                  tone={detail.delta > 0 ? "over" : detail.delta < 0 ? "good" : undefined}
                />
              </div>

              {/* Who drove it — only meaningful on the shared family ledger. */}
              {!isP && detail.topMember && (
                <div className="flex items-center gap-3 rounded-xl bg-muted/50 px-3 py-2.5">
                  <MemberAvatar name={detail.topMember.member} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-muted-foreground">{L.who}</p>
                    <p className="truncate text-sm font-medium text-foreground">
                      {detail.topMember.member}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">
                    {money(detail.topMember.amount, 2)}
                  </p>
                </div>
              )}

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">{L.lines}</p>
                {detail.entries.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
                    {L.empty}
                  </p>
                ) : (
                  <ul className="divide-y divide-border rounded-xl ring-1 ring-border">
                    {detail.entries.map((e) => (
                      <li key={e.id} className="flex items-center gap-3 px-3 py-2.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">{e.description}</p>
                          <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                            <span className="tabular-nums">
                              {new Date(e.expense_at).toLocaleDateString(locale, {
                                day: "2-digit",
                                month: "short",
                              })}
                            </span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 font-medium ${
                                MEMBER_COLORS[e.member as keyof typeof MEMBER_COLORS] ??
                                "bg-muted text-muted-foreground"
                              }`}
                            >
                              {e.member}
                            </span>
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">
                          {money(Number(e.amount), 2)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
