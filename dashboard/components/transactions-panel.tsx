"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MEMBER_COLORS, type Member } from "@/lib/data";
import { categoryIcon } from "@/lib/category-meta";
import { money, percent } from "@/lib/format";
import type { LedgerEntry } from "@/lib/budget-analytics";
import {
  DEFAULT_SORT,
  EMPTY_FILTER,
  facets,
  filterEntries,
  highlightSegments,
  isFilterActive,
  sortEntries,
  summarize,
  toggleValue,
  type AmountBandId,
  type EntryFilter,
  type EntrySort,
  type SortDir,
  type SortKey,
} from "@/lib/entry-filters";

/**
 * The month's ledger as something you can actually interrogate: search across
 * description, category and member; narrow by who spent, by category and by
 * amount band; re-sort; and read what the visible slice adds up to.
 *
 * All the matching lives in lib/entry-filters.ts as pure functions — this file
 * only holds the state, the copy and the chrome. Colour never carries a state
 * on its own: every toggle is a real button with `aria-pressed`, and the result
 * count is written out in words above the table.
 */

const ALL = "__all__";
const PAGE = 8;

const COPY = {
  es: {
    title: "Movimientos",
    viewAll: "Ver todos",
    viewAllLabel: "Ver el historial completo de gastos",
    search: "Buscar por descripción, categoría o persona",
    searchShort: "Buscar movimientos",
    clearSearch: "Borrar la búsqueda",
    clearAll: "Limpiar filtros",
    allCategories: "Todas las categorías",
    allBands: "Cualquier monto",
    category: "Categoría",
    amount: "Monto",
    sort: "Orden",
    filterBy: (m: string) => `Filtrar por ${m}`,
    filterByCategory: (c: string) => `Filtrar por la categoría ${c}`,
    colName: "Descripción",
    colAmount: "Monto",
    colCategory: "Categoría",
    colWho: "Quién",
    colDate: "Fecha",
    empty: "No hay movimientos este mes",
    emptySub: "Los gastos registrados en este mes aparecerán aquí.",
    noMatch: "Ningún movimiento coincide",
    noMatchSub: "Probá con otra búsqueda o quitá algún filtro.",
    more: (n: number) => `Mostrar ${n} más`,
    less: "Mostrar menos",
    summary: (n: number, amount: string) =>
      `${n} ${n === 1 ? "movimiento" : "movimientos"} · ${amount}`,
    ofMonth: (p: string) => `${p} del mes`,
    average: (a: string) => `promedio ${a}`,
    bands: {
      all: "Cualquier monto",
      under25: "Menos de $25",
      mid: "$25 – $100",
      large: "$100 – $500",
      xl: "Más de $500",
    },
    sorts: {
      "date:desc": "Más recientes",
      "date:asc": "Más antiguos",
      "amount:desc": "Mayor monto",
      "amount:asc": "Menor monto",
    },
  },
  en: {
    title: "Transactions",
    viewAll: "View all",
    viewAllLabel: "Open the full spending history",
    search: "Search by description, category or person",
    searchShort: "Search transactions",
    clearSearch: "Clear the search",
    clearAll: "Clear filters",
    allCategories: "All categories",
    allBands: "Any amount",
    category: "Category",
    amount: "Amount",
    sort: "Sort",
    filterBy: (m: string) => `Filter by ${m}`,
    filterByCategory: (c: string) => `Filter by the ${c} category`,
    colName: "Name",
    colAmount: "Amount",
    colCategory: "Category",
    colWho: "Who",
    colDate: "Date",
    empty: "No transactions this month",
    emptySub: "Anything spent this month shows up here.",
    noMatch: "Nothing matches",
    noMatchSub: "Try a different search, or drop one of the filters.",
    more: (n: number) => `Show ${n} more`,
    less: "Show less",
    summary: (n: number, amount: string) =>
      `${n} ${n === 1 ? "transaction" : "transactions"} · ${amount}`,
    ofMonth: (p: string) => `${p} of the month`,
    average: (a: string) => `${a} average`,
    bands: {
      all: "Any amount",
      under25: "Under $25",
      mid: "$25 – $100",
      large: "$100 – $500",
      xl: "Over $500",
    },
    sorts: {
      "date:desc": "Newest",
      "date:asc": "Oldest",
      "amount:desc": "Largest",
      "amount:asc": "Smallest",
    },
  },
} as const;

const BAND_IDS: AmountBandId[] = ["all", "under25", "mid", "large", "xl"];
const SORT_IDS = ["date:desc", "date:asc", "amount:desc", "amount:asc"] as const;

function formatDateTime(ts: string, locale: string) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString(locale, { day: "2-digit", month: "short" }) +
    " · " +
    d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
  );
}

/** Search hits marked inside the description, with no index maths up here. */
function Highlighted({ text, query }: { text: string; query: string }) {
  const parts = highlightSegments(text, query);
  return (
    <>
      {parts.map((p, i) =>
        p.match ? (
          <mark
            key={i}
            className="rounded-[3px] px-0.5 text-foreground"
            style={{ backgroundColor: "color-mix(in oklch, var(--app-budget) 30%, transparent)" }}
          >
            {p.text}
          </mark>
        ) : (
          <span key={i}>{p.text}</span>
        ),
      )}
    </>
  );
}

function Skeleton({ title }: { title: string }) {
  return (
    <section className="rounded-2xl bg-card ring-1 ring-border">
      <div className="px-5 pt-5">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <span className="mt-4 block h-8 w-full rounded-lg bg-muted motion-safe:animate-pulse" />
      </div>
      <div className="mt-4 divide-y divide-border/50 border-t border-border">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-3.5">
            <span className="h-4 flex-1 rounded bg-muted motion-safe:animate-pulse" />
            <span className="h-4 w-16 rounded bg-muted motion-safe:animate-pulse" />
            <span className="hidden h-4 w-20 rounded bg-muted motion-safe:animate-pulse sm:block" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function TransactionsPanel({
  scope,
  loading,
  entries,
  onViewAll,
}: {
  scope: "family" | "personal";
  loading: boolean;
  /** Entries for the selected month, in whatever order they arrived. */
  entries: LedgerEntry[];
  /** Opens the full spending history sheet. */
  onViewAll: () => void;
}) {
  const isP = scope === "personal";
  const L = isP ? COPY.en : COPY.es;
  const locale = isP ? "en" : "es";

  const [filter, setFilter] = useState<EntryFilter>(EMPTY_FILTER);
  const [sort, setSort] = useState<EntrySort>(DEFAULT_SORT);
  const [visible, setVisible] = useState(PAGE);
  const searchRef = useRef<HTMLInputElement>(null);

  // Any change to what is being matched collapses the list back to one page —
  // otherwise a narrow filter inherits a long "show more" from the last one.
  function update(next: Partial<EntryFilter>) {
    setFilter((f) => ({ ...f, ...next }));
    setVisible(PAGE);
  }

  // `/` jumps to the search box, the way it does in every tool that has one.
  // Ignored while typing somewhere else, and while a modifier is held so it
  // never steals a browser shortcut.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      // A sheet or dialog owns the focus while it is open — pulling it back to
      // a search box behind the scrim would just fight the focus trap.
      if (document.querySelector('[role="dialog"][data-state="open"]')) return;
      e.preventDefault();
      searchRef.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const available = useMemo(() => facets(entries), [entries]);
  const rows = useMemo(
    () => sortEntries(filterEntries(entries, filter), sort),
    [entries, filter, sort],
  );
  const stats = useMemo(() => summarize(rows, entries), [rows, entries]);

  const active = isFilterActive(filter);
  const shown = rows.slice(0, visible);
  const hidden = rows.length - shown.length;

  if (loading) return <Skeleton title={L.title} />;

  const monthIsEmpty = entries.length === 0;

  return (
    <section className="rounded-2xl bg-card ring-1 ring-border">
      <div className="flex items-center justify-between gap-3 px-5 pt-5">
        <h2 className="text-base font-semibold text-foreground">{L.title}</h2>
        <Button
          variant="ghost"
          size="sm"
          aria-label={L.viewAllLabel}
          className="-mr-2 gap-1 text-xs text-muted-foreground"
          onClick={onViewAll}
        >
          {L.viewAll} <ArrowRight aria-hidden size={13} />
        </Button>
      </div>

      {!monthIsEmpty && (
        <div className="mt-4 space-y-3 px-5">
          {/* Search. The `/` hint is decorative and disappears once the field
              has focus or content, so it never sits on top of the text. */}
          <div className="relative">
            <Search
              aria-hidden
              size={14}
              className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              ref={searchRef}
              type="search"
              value={filter.text}
              onChange={(e) => update({ text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === "Escape" && filter.text) {
                  e.preventDefault();
                  update({ text: "" });
                }
              }}
              placeholder={L.search}
              aria-label={L.searchShort}
              className="peer h-9 w-full rounded-lg border border-input bg-transparent pl-8 pr-16 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30 [&::-webkit-search-cancel-button]:hidden"
            />
            {filter.text ? (
              <button
                type="button"
                onClick={() => {
                  update({ text: "" });
                  searchRef.current?.focus();
                }}
                aria-label={L.clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X aria-hidden size={13} />
              </button>
            ) : (
              <kbd
                aria-hidden
                className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground peer-focus:opacity-0 sm:block"
              >
                /
              </kbd>
            )}
          </div>

          {/* Filters. Scrolls sideways on a phone rather than stacking into a
              wall of full-width controls. */}
          <div className="-mx-5 flex items-center gap-2 overflow-x-auto px-5 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {available.members.map((m) => {
              const on = filter.members.includes(m.value);
              return (
                <button
                  key={m.value}
                  type="button"
                  aria-pressed={on}
                  aria-label={L.filterBy(m.value)}
                  onClick={() => update({ members: toggleValue(filter.members, m.value) })}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    on
                      ? MEMBER_COLORS[m.value as Member] ?? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  } ${on ? "ring-1 ring-inset ring-foreground/20" : ""}`}
                >
                  {/* A checkmark, so "selected" is not only a colour swap. */}
                  {on ? "✓ " : ""}
                  {m.value}
                </button>
              );
            })}

            <Select
              value={filter.categories[0] ?? ALL}
              onValueChange={(v) => update({ categories: v === ALL ? [] : [v] })}
            >
              <SelectTrigger aria-label={L.category} className="max-w-[11rem] shrink-0 text-xs">
                <SelectValue placeholder={L.allCategories} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{L.allCategories}</SelectItem>
                {available.categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span aria-hidden>{categoryIcon(c.value)}</span>
                    {c.value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={filter.band}
              onValueChange={(v) => update({ band: v as AmountBandId })}
            >
              <SelectTrigger aria-label={L.amount} className="shrink-0 text-xs">
                <SelectValue placeholder={L.allBands} />
              </SelectTrigger>
              <SelectContent>
                {BAND_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {L.bands[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={`${sort.key}:${sort.dir}`}
              onValueChange={(v) => {
                const [key, dir] = v.split(":") as [SortKey, SortDir];
                setSort({ key, dir });
              }}
            >
              <SelectTrigger aria-label={L.sort} className="shrink-0 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_IDS.map((id) => (
                  <SelectItem key={id} value={id}>
                    {L.sorts[id]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {active && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 shrink-0 gap-1 text-xs text-muted-foreground"
                onClick={() => {
                  setFilter(EMPTY_FILTER);
                  setVisible(PAGE);
                }}
              >
                <X aria-hidden size={12} /> {L.clearAll}
              </Button>
            )}
          </div>

          {/* What the visible slice adds up to. Written out, and announced, so
              the effect of a filter is never left to be inferred. */}
          <p aria-live="polite" className="text-xs tabular-nums text-muted-foreground">
            {L.summary(stats.count, money(stats.total, 2))}
            {active && stats.count > 0 && ` · ${L.ofMonth(percent(stats.share))}`}
            {stats.count > 1 && ` · ${L.average(money(stats.average, 2))}`}
          </p>
        </div>
      )}

      <div className="mt-4">
        {monthIsEmpty && (
          <div className="px-5 pb-8 pt-4 text-center">
            <p className="text-sm font-medium text-foreground">{L.empty}</p>
            <p className="mt-1 text-xs text-muted-foreground">{L.emptySub}</p>
          </div>
        )}

        {!monthIsEmpty && rows.length === 0 && (
          <div className="px-5 pb-8 pt-4 text-center">
            <p className="text-sm font-medium text-foreground">{L.noMatch}</p>
            <p className="mt-1 text-xs text-muted-foreground">{L.noMatchSub}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 gap-1 text-xs"
              onClick={() => {
                setFilter(EMPTY_FILTER);
                setVisible(PAGE);
              }}
            >
              <X aria-hidden size={12} /> {L.clearAll}
            </Button>
          </div>
        )}

        {rows.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-border">
                <th className="w-full px-5 py-2.5 text-left text-xs font-normal text-muted-foreground">{L.colName}</th>
                <th className="px-3 py-2.5 text-right text-xs font-normal text-muted-foreground">{L.colAmount}</th>
                <th className="hidden px-3 py-2.5 text-left text-xs font-normal text-muted-foreground md:table-cell">{L.colCategory}</th>
                <th className="hidden px-3 py-2.5 text-left text-xs font-normal text-muted-foreground sm:table-cell">{L.colWho}</th>
                <th className="hidden px-5 py-2.5 text-right text-xs font-normal text-muted-foreground md:table-cell">{L.colDate}</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((e) => (
                <tr key={e.id} className="border-b border-border/50 transition-colors last:border-b-0 hover:bg-muted/40">
                  <td className="max-w-0 px-5 py-3.5">
                    <p className="truncate font-medium text-foreground">
                      <Highlighted text={e.description} query={filter.text} />
                    </p>
                    <p className="truncate text-xs text-muted-foreground md:hidden">
                      {e.category} · {formatDateTime(e.expense_at, locale)}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-right font-medium tabular-nums text-foreground">
                    -{money(Number(e.amount) || 0, 2)}
                  </td>
                  <td className="hidden whitespace-nowrap px-3 py-3.5 md:table-cell">
                    {/* Clicking a category narrows the list to it — the same
                        gesture as tapping a chip, from where the eye already is. */}
                    <button
                      type="button"
                      aria-label={L.filterByCategory(e.category)}
                      onClick={() => update({ categories: [e.category] })}
                      className="rounded-md px-1.5 py-0.5 -mx-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span aria-hidden className="mr-1.5">{categoryIcon(e.category)}</span>
                      {e.category}
                    </button>
                  </td>
                  <td className="hidden px-3 py-3.5 sm:table-cell">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        MEMBER_COLORS[e.member as Member] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {e.member}
                    </span>
                  </td>
                  <td className="hidden whitespace-nowrap px-5 py-3.5 text-right tabular-nums text-muted-foreground md:table-cell">
                    {formatDateTime(e.expense_at, locale)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {rows.length > PAGE && (
          <div className="border-t border-border px-5 py-2.5 text-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => setVisible(hidden > 0 ? visible + PAGE * 2 : PAGE)}
            >
              {hidden > 0 ? L.more(Math.min(hidden, PAGE * 2)) : L.less}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
