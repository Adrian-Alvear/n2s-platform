"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@/lib/user-context";
import { useBudgetScope } from "@/lib/budget-scope";
import { supabase } from "@/lib/supabase";
import { DEFAULT_BUDGETS, INCOME, PERSONAL_INCOME, MEMBER_COLORS } from "@/lib/data";
import { getPayments, paymentsTotal } from "@/lib/personal-payments-store";
import { getCover, setCover } from "@/lib/cover-cache";
import { parseDigest } from "@/lib/digest";
import { DashboardChat } from "@/components/dashboard-chat";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowRight, Loader2, Clock, ExternalLink, ChevronLeft, ChevronRight, Sparkles, Users, User } from "lucide-react";

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠", Carro: "🚗", Seguro: "🛡️", Internet: "📡", Agua: "💧",
  Gas: "🔥", Gasolina: "⛽", "Renta Calentador": "🌡️", "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️", Cumpleaños: "🎂", "Transporte Uber": "🚕", "Mto Carro": "🔧", Otros: "📦",
};

const familyBudget = Object.values(DEFAULT_BUDGETS).reduce((s, v) => s + v, 0);
const familyIncome = Object.values(INCOME).reduce((s, v) => s + v, 0);
const personalIncome = Object.values(PERSONAL_INCOME).reduce((s, v) => s + v, 0);

type Entry = { id: number; expense_at: string; description: string; category: string; amount: number; member: string };
type NewsItem = { title: string; link: string; pubDate: string; source: string; image: string; description?: string };
type MatchEvent = {
  id: string; league: string; date: string; status: string; state: string;
  home: { name: string; abbr: string; logo: string; score: string };
  away: { name: string; abbr: string; logo: string; score: string };
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

const NEWS_TABS = [
  { key: "ai",       label: "AI",       active: "bg-violet-600",  badge: "bg-violet-100 text-violet-700" },
  { key: "soccer",   label: "Soccer",   active: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-700" },
  { key: "nba",      label: "NBA",      active: "bg-orange-500",  badge: "bg-orange-100 text-orange-700" },
  { key: "ufc",      label: "UFC",      active: "bg-red-600",     badge: "bg-red-100 text-red-700" },
  { key: "colombia", label: "Colombia", active: "bg-yellow-500",  badge: "bg-yellow-100 text-yellow-700" },
  { key: "nyt",      label: "NYT",      active: "bg-zinc-800",    badge: "bg-zinc-100 text-zinc-700" },
];

function SectionHeader({ title, href, label }: { title: string; href: string; label?: string }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">{title}</h2>
      <Link href={href}>
        <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground h-7 px-2">
          {label ?? "View all"} <ArrowRight size={11} />
        </Button>
      </Link>
    </div>
  );
}

export default function Home() {
  const { user } = useUser();
  const { scope, setScope } = useBudgetScope();
  const now = new Date();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loadingBudget, setLoadingBudget] = useState(true);
  const [personalBudgetTotal, setPersonalBudgetTotal] = useState(0);

  const canPersonal = (user?.name ?? "").toLowerCase().startsWith("adrian");
  const activeScope = canPersonal ? scope : "family";
  const totalIncome = activeScope === "personal" ? personalIncome : familyIncome;
  const totalBudget = activeScope === "personal" ? personalBudgetTotal : familyBudget;

  useEffect(() => { setPersonalBudgetTotal(paymentsTotal(getPayments())); }, [activeScope]);
  const [newsTab, setNewsTab] = useState("ai");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);
  const [scores, setScores] = useState<MatchEvent[]>([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [newsDigest, setNewsDigest] = useState("");

  useEffect(() => {
    setLoadingBudget(true);
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    supabase.from("entries").select("*")
      .eq("scope", activeScope)
      .gte("expense_at", from).lt("expense_at", to)
      .order("expense_at", { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoadingBudget(false); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeScope]);

  // AI digest for the selected tab (edge-cached ~12h, cheap)
  useEffect(() => {
    let cancelled = false;
    setNewsDigest("");
    fetch(`/api/news-digest?category=${newsTab}`)
      .then(r => r.json())
      .then(({ summary }) => { if (!cancelled) setNewsDigest(summary ?? ""); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [newsTab]);

  useEffect(() => {
    let cancelled = false;
    setLoadingNews(true);
    setNews([]);
    setHeroIdx(0);
    fetch(`/api/news?category=${newsTab}`)
      .then(r => r.json())
      .then(({ items }) => {
        if (cancelled) return;
        // Hydrate each item's real cover from cache so reloads paint instantly
        const list: NewsItem[] = (items ?? [])
          .slice(0, 10)
          .map((it: NewsItem) => (it.image ? it : { ...it, image: getCover(it.link) }));
        setNews(list);
        setLoadingNews(false);
        // Discover the real og:image only for items still missing one, then cache it
        list.slice(0, 6).forEach((item, i) => {
          if (item.image || !item.link) return;
          fetch(`/api/og-image?url=${encodeURIComponent(item.link)}`)
            .then(r => r.json())
            .then(({ image }) => {
              if (cancelled || !image) return;
              setCover(item.link, image);
              setNews(prev => prev.map((p, idx) => idx === i ? { ...p, image } : p));
            })
            .catch(() => {});
        });
      })
      .catch(() => { if (!cancelled) setLoadingNews(false); });
    return () => { cancelled = true; };
  }, [newsTab]);

  useEffect(() => {
    fetch("/api/soccer-scores")
      .then(r => r.json())
      .then(({ events }) => setScores((events ?? []).slice(0, 8)))
      .catch(() => {});
  }, []);

  const heroItems = news.filter(n => n.image);

  // Auto-advance the hero image carousel every 5s
  useEffect(() => {
    if (heroItems.length < 2) return;
    const t = setInterval(() => setHeroIdx(i => (i + 1) % heroItems.length), 5000);
    return () => clearInterval(t);
  }, [heroItems.length]);

  // Preload the next slide's real image so switching is instant
  useEffect(() => {
    if (heroItems.length < 2) return;
    const nextUrl = heroItems[(heroIdx + 1) % heroItems.length]?.image;
    if (nextUrl) {
      const img = new window.Image();
      img.src = nextUrl;
    }
  }, [heroIdx, heroItems]);

  const totalSpent = entries.reduce((s, e) => s + e.amount, 0);
  const remaining = totalBudget - totalSpent;
  const budgetPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;
  const progressColor = budgetPct >= 100 ? "bg-red-500" : budgetPct >= 80 ? "bg-orange-400" : budgetPct >= 60 ? "bg-yellow-400" : "bg-emerald-500";

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8 pb-24 md:pb-8">

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs text-muted-foreground">{formatDate()}</p>
          <h1 className="font-heading text-3xl md:text-4xl font-medium tracking-tight mt-0.5">
            {greeting()}{user ? `, ${user.name}` : ""}
          </h1>
        </div>
        {canPersonal && (
          <div className="flex bg-muted p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setScope("family")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeScope === "family" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Users size={13} /> Family
            </button>
            <button
              onClick={() => setScope("personal")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeScope === "personal" ? "bg-violet-600 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <User size={13} /> Personal
            </button>
          </div>
        )}
      </div>

      {/* Ask the assistant — inline chat, expands in place */}
      <DashboardChat />

      {/* ── Top: News hero + sidebar ───────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* News — takes 2 cols on desktop */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-1 bg-muted p-1 rounded-xl overflow-x-auto" style={{ scrollbarWidth: "none" }}>
              {NEWS_TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setNewsTab(t.key)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    newsTab === t.key ? `${t.active} text-white shadow-sm` : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <Link href="/news" className="shrink-0">
              <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground h-7 px-2">
                More <ArrowRight size={11} />
              </Button>
            </Link>
          </div>

          {/* AI digest for this tab */}
          {newsDigest && (
            <div className="rounded-xl border border-border bg-card px-4 py-3">
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={13} className="text-blue-500" />
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Today&apos;s Digest</span>
              </div>
              <ul className="space-y-1.5">
                {parseDigest(newsDigest).map((line, i) => (
                  <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                    <span className="mt-1.5 shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {loadingNews && (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="animate-spin mr-2" size={15} /> Loading...
            </div>
          )}

          {!loadingNews && news.length > 0 && (() => {
            const tabBadge = NEWS_TABS.find(t => t.key === newsTab)?.badge ?? "bg-violet-100 text-violet-700";
            const hero = heroItems[heroIdx % (heroItems.length || 1)];
            return (
              <div className="space-y-3">
                {/* Hero carousel — cycles through article images */}
                {hero && (
                  <div className="group relative rounded-2xl overflow-hidden h-52 md:h-64 shadow-sm">
                    <button onClick={() => setSelected(hero)} className="block w-full h-full text-left">
                      <img src={hero.image} alt={hero.title} loading="eager" fetchPriority="high" decoding="async" className="w-full h-full object-cover transition-opacity duration-500" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${tabBadge}`}>{hero.source}</span>
                        <p className="mt-1.5 text-white font-bold text-sm md:text-base leading-snug line-clamp-2">{hero.title}</p>
                        {hero.pubDate && <p className="text-white/50 text-xs mt-1">{timeAgo(hero.pubDate)}</p>}
                      </div>
                    </button>

                    {/* Carousel controls */}
                    {heroItems.length > 1 && (
                      <>
                        <button onClick={() => setHeroIdx(i => (i - 1 + heroItems.length) % heroItems.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronLeft size={16} />
                        </button>
                        <button onClick={() => setHeroIdx(i => (i + 1) % heroItems.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                          <ChevronRight size={16} />
                        </button>
                        <div className="absolute top-3 right-3 flex gap-1">
                          {heroItems.map((_, i) => (
                            <button key={i} onClick={() => setHeroIdx(i)}
                              className={`h-1.5 rounded-full transition-all ${i === heroIdx % heroItems.length ? "w-4 bg-white" : "w-1.5 bg-white/50"}`} />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Headlines list — click to open modal */}
                <Card>
                  <CardContent className="p-0 divide-y divide-border">
                    {news.map((item, i) => (
                      <button key={i} onClick={() => setSelected(item)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50 transition-colors group text-left">
                        <span className="text-xs font-bold text-muted-foreground/25 tabular-nums shrink-0 w-4">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-foreground/70 transition-colors">{item.title}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-muted-foreground">{item.source}</span>
                            {item.pubDate && <span className="text-[10px] text-muted-foreground">{timeAgo(item.pubDate)}</span>}
                          </div>
                        </div>
                        {item.image && (
                          <img src={item.image} alt="" loading="lazy" decoding="async" className="w-12 h-12 rounded-lg object-cover shrink-0 hidden sm:block"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                        )}
                      </button>
                    ))}
                  </CardContent>
                </Card>
              </div>
            );
          })()}
        </div>

        {/* Soccer sidebar */}
        <div className="space-y-3">
          <SectionHeader title="Today's Matches" href="/news" label="Soccer" />
          <Card>
            <CardContent className="p-0 divide-y divide-border">
              {scores.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">No matches today</div>
              )}
              {scores.map((e) => {
                const live = e.state === "in", done = e.state === "post";
                return (
                  <div key={e.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{e.league}</span>
                      {live && <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 shrink-0"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE</span>}
                      {done && <span className="text-[10px] font-semibold bg-muted text-muted-foreground px-1.5 py-0.5 rounded shrink-0">FT</span>}
                      {!live && !done && <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0"><Clock size={9} />{new Date(e.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>}
                    </div>
                    <div className="space-y-1">
                      {[e.home, e.away].map((t) => (
                        <div key={t.name} className="flex items-center gap-2">
                          {t.logo
                            ? <img src={t.logo} alt={t.name} className="w-4 h-4 object-contain shrink-0" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                            : <div className="w-4 h-4 rounded-full bg-muted shrink-0" />}
                          <span className="text-xs font-medium flex-1 truncate">{t.abbr || t.name}</span>
                          {(live || done) && <span className={`text-sm font-bold tabular-nums shrink-0 ${live ? "text-emerald-600" : ""}`}>{t.score}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Bottom: Budget ──────────────────────────────────────── */}
      <div>
        <SectionHeader title={`Budget · ${now.toLocaleDateString("en", { month: "long" })}`} href="/budget" label="Details" />
        <div className="space-y-4">

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Income", value: `$${totalIncome.toLocaleString()}`, color: "text-emerald-600" },
              { label: "Spent", value: loadingBudget ? "—" : `$${totalSpent.toFixed(0)}`, color: totalSpent > totalBudget ? "text-red-500" : "text-foreground" },
              { label: "Remaining", value: loadingBudget ? "—" : `$${remaining.toFixed(0)}`, color: remaining < 0 ? "text-red-500" : "text-foreground" },
            ].map((s) => (
              <Card key={s.label}>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">{s.label}</p>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Progress */}
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Budget used</span>
                <span className="font-semibold">{loadingBudget ? "—" : `${budgetPct}%`} <span className="text-muted-foreground font-normal">of ${totalBudget.toFixed(0)}</span></span>
              </div>
              <div className="h-2.5 rounded-full bg-muted overflow-hidden">
                <div className={`h-2.5 rounded-full transition-all duration-700 ${progressColor}`} style={{ width: `${budgetPct}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground pt-0.5">
                <span>$0</span>
                <span>${totalBudget.toFixed(0)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Recent transactions */}
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between px-4 py-2.5 border-b">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Recent transactions</p>
                <span className="text-xs text-muted-foreground">{loadingBudget ? "" : `${entries.length} this month`}</span>
              </div>
              <div className="divide-y divide-border">
                {loadingBudget && <div className="flex items-center justify-center py-8 text-muted-foreground"><Loader2 className="animate-spin mr-2" size={14} />Loading...</div>}
                {!loadingBudget && entries.length === 0 && <div className="text-center py-8 text-muted-foreground text-sm">No transactions this month</div>}
                {entries.slice(0, 5).map((e) => (
                  <div key={e.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-base shrink-0">
                        {CATEGORY_ICONS[e.category] ?? "📦"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{e.description}</p>
                        <p className="text-xs text-muted-foreground">{e.category}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className={`hidden sm:inline text-xs font-medium px-2 py-0.5 rounded-full ${MEMBER_COLORS[e.member as keyof typeof MEMBER_COLORS] ?? "bg-gray-100 text-gray-700"}`}>{e.member}</span>
                      <span className="text-sm font-bold text-red-500">-${e.amount.toFixed(2)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Article modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-lg p-0 overflow-hidden gap-0 max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              {selected.image && (
                <div className="relative h-48 w-full">
                  <img src={selected.image} alt={selected.title} className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).parentElement!.style.display = "none"; }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                </div>
              )}
              <div className="p-5 space-y-3">
                <DialogHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${NEWS_TABS.find(t => t.key === newsTab)?.badge ?? "bg-violet-100 text-violet-700"}`}>{selected.source}</span>
                    {selected.pubDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock size={11} />{timeAgo(selected.pubDate)}</span>}
                  </div>
                  <DialogTitle className="text-left text-lg leading-snug">{selected.title}</DialogTitle>
                </DialogHeader>
                {selected.description && (
                  <p className="text-sm text-muted-foreground leading-relaxed border-l-2 border-border pl-3">{selected.description}</p>
                )}
                <a href={selected.link} target="_blank" rel="noopener noreferrer">
                  <Button className="w-full gap-2 mt-1">
                    Read full article <ExternalLink size={14} />
                  </Button>
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
