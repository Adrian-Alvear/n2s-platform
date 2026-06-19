"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useUser } from "@/lib/user-context";
import { supabase } from "@/lib/supabase";
import { DEFAULT_BUDGETS, INCOME, MEMBER_COLORS } from "@/lib/data";
import { ArrowRight, Wallet, MessageSquare, Newspaper, StickyNote, Loader2 } from "lucide-react";

const CATEGORY_ICONS: Record<string, string> = {
  Arriendo: "🏠", Carro: "🚗", Seguro: "🛡️", Internet: "📡", Agua: "💧",
  Gas: "🔥", Gasolina: "⛽", "Renta Calentador": "🌡️", "Comida y Aseo": "🛒",
  "Comida Recreativa": "🍽️", Cumpleaños: "🎂", "Transporte Uber": "🚕", "Mto Carro": "🔧", Otros: "📦",
};

const totalBudget = Object.values(DEFAULT_BUDGETS).reduce((s, v) => s + v, 0);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function formatDate() {
  return new Date().toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

type Entry = { id: number; expense_at: string; description: string; category: string; amount: number; member: string };

export default function Home() {
  const { user } = useUser();
  const now = new Date();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();
    supabase.from("entries").select("*")
      .gte("expense_at", from).lt("expense_at", to)
      .order("expense_at", { ascending: false })
      .then(({ data }) => { setEntries(data ?? []); setLoading(false); });
  }, []);

  const totalSpent = entries.reduce((s, e) => s + e.amount, 0);
  const remaining = totalBudget - totalSpent;
  const totalIncome = Object.values(INCOME).reduce((s, v) => s + v, 0);

  const apps = [
    {
      icon: Wallet,
      label: "Budget",
      description: "Family spending tracker",
      href: "/budget",
      color: "text-violet-600",
      bg: "bg-violet-50 dark:bg-violet-950",
      live: true,
      stat: loading ? null : `$${totalSpent.toFixed(0)} spent · $${remaining.toFixed(0)} left`,
    },
    {
      icon: MessageSquare,
      label: "Chat",
      description: "AI agent powered by OpenClaw",
      href: "/chat",
      color: "text-blue-600",
      bg: "bg-blue-50 dark:bg-blue-950",
      live: false,
      stat: "Coming soon",
    },
    {
      icon: Newspaper,
      label: "News",
      description: "Multi-source news aggregator",
      href: "/news",
      color: "text-emerald-600",
      bg: "bg-emerald-50 dark:bg-emerald-950",
      live: true,
      stat: "AI · Soccer · NBA · UFC",
    },
    {
      icon: StickyNote,
      label: "Notes",
      description: "Personal notes & docs",
      href: "/notes",
      color: "text-amber-600",
      bg: "bg-amber-50 dark:bg-amber-950",
      live: false,
      stat: "Coming soon",
    },
  ];

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div>
        <p className="text-muted-foreground text-sm">{formatDate()}</p>
        <h1 className="text-3xl font-bold tracking-tight mt-1">
          {greeting()}{user ? `, ${user.name}` : ""}
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          Your personal dashboard · <span className="text-foreground font-medium">${totalIncome.toLocaleString()}/mo income</span>
        </p>
      </div>

      {/* Apps grid */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Apps</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {apps.map((app) => (
            <Card key={app.label} className={`transition-shadow ${app.live ? "hover:shadow-md cursor-pointer" : "opacity-60"}`}>
              <CardContent className="p-5">
                <div className={`w-10 h-10 rounded-xl ${app.bg} flex items-center justify-center mb-4`}>
                  <app.icon size={20} className={app.color} />
                </div>
                <p className="font-semibold text-sm">{app.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{app.description}</p>
                {app.stat && (
                  <p className={`text-xs mt-3 font-medium ${app.live ? app.color : "text-muted-foreground"}`}>
                    {loading && app.live ? <Loader2 size={12} className="animate-spin inline" /> : app.stat}
                  </p>
                )}
                {app.live && (
                  <Link href={app.href}>
                    <Button variant="ghost" size="sm" className={`mt-3 h-7 px-2 text-xs gap-1 ${app.color} hover:bg-transparent`}>
                      Open <ArrowRight size={12} />
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick stats */}
      <div>
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">This month</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Spent", value: `$${totalSpent.toFixed(0)}`, sub: `of $${totalBudget.toFixed(0)}` },
            { label: "Remaining", value: `$${remaining.toFixed(0)}`, sub: remaining >= 0 ? "on track" : "over budget", alert: remaining < 0 },
            { label: "Transactions", value: loading ? "—" : `${entries.length}`, sub: "this month" },
            { label: "Budget used", value: loading ? "—" : `${Math.round((totalSpent / totalBudget) * 100)}%`, sub: "of monthly budget" },
          ].map((s) => (
            <Card key={s.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{s.label}</p>
                <p className={`text-2xl font-bold mt-1 ${s.alert ? "text-red-500" : ""}`}>{s.value}</p>
                <p className={`text-xs mt-0.5 ${s.alert ? "text-red-400" : "text-muted-foreground"}`}>{s.sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Recent activity */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Recent activity</h2>
          <Link href="/budget">
            <Button variant="ghost" size="sm" className="gap-1 text-xs text-muted-foreground hover:text-foreground">
              View all <ArrowRight size={12} />
            </Button>
          </Link>
        </div>
        <Card>
          <CardContent className="p-0 divide-y divide-border">
            {loading && <div className="flex items-center justify-center py-10 text-muted-foreground"><Loader2 className="animate-spin mr-2" size={16} />Loading...</div>}
            {!loading && entries.length === 0 && <div className="text-center py-10 text-muted-foreground text-sm">No activity this month</div>}
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
