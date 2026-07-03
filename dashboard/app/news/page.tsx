"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, ExternalLink, X, Clock, Calendar, Plus, Rss, Search, Copy, Check, Settings2, Compass, Lock, Sparkles } from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getCover, setCover } from "@/lib/cover-cache";
import { readNewsCache, writeNewsCache, readDigestCache, writeDigestCache } from "@/lib/news-cache";
import { parseDigest } from "@/lib/digest";

// ─── Types ───────────────────────────────────────────────────────────────────

type NewsItem = { title: string; link: string; pubDate: string; description: string; content: string; source: string; image: string; author: string };
type Team = { name: string; abbr: string; logo: string; score: string };
type MatchEvent = { id: string; league: string; date: string; status: string; state: string; home: Team; away: Team };
type UFCEvent = { id: string; name: string; shortName: string; date: string; venue: string; location: string; state: string; mainEvent: string };
type CustomFeed = { id: string; label: string; type: "topic" | "url"; value: string };

// ─── Constants ───────────────────────────────────────────────────────────────

const BASE_CATEGORIES = [
  { key: "ai",       label: "AI",       active: "bg-violet-600",  badge: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300",     dot: "bg-violet-500" },
  { key: "soccer",   label: "Soccer",   active: "bg-emerald-600", badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",  dot: "bg-emerald-500" },
  { key: "nba",      label: "NBA",      active: "bg-orange-500",  badge: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",     dot: "bg-orange-400" },
  { key: "ufc",      label: "UFC",      active: "bg-red-600",     badge: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",        dot: "bg-red-500" },
  { key: "colombia", label: "Colombia", active: "bg-yellow-500",  badge: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",     dot: "bg-yellow-400" },
  { key: "nyt",      label: "NYT",      active: "bg-zinc-800",    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",       dot: "bg-zinc-600" },
];

const CUSTOM_COLOR = { active: "bg-sky-600", badge: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300", dot: "bg-sky-500" };

// ─── Discover: pick a source platform to follow ──────────────────────────────
// Only platforms with free, reliable public feeds are enabled. X/Facebook/
// Instagram require paid APIs (no free RSS), so they're shown but disabled.
type Platform = {
  key: string; label: string; emoji: string; desc: string;
  available: boolean; needsTopic?: boolean;
  build?: (topic: string) => { type: "topic" | "url"; value: string };
  tag: string;
};

const PLATFORMS: Platform[] = [
  { key: "google", label: "Google News", emoji: "📰", desc: "Search across thousands of outlets", available: true, needsTopic: true, tag: "News",
    build: (q) => ({ type: "topic", value: q }) },
  { key: "reddit", label: "Reddit", emoji: "👽", desc: "Community discussions & links", available: true, needsTopic: true, tag: "Reddit",
    build: (q) => ({ type: "url", value: `https://www.reddit.com/search.rss?q=${encodeURIComponent(q)}&sort=relevance` }) },
  { key: "hn", label: "Hacker News", emoji: "💻", desc: "Tech & startup stories", available: true, needsTopic: true, tag: "HN",
    build: (q) => ({ type: "url", value: `https://hnrss.org/newest?q=${encodeURIComponent(q)}` }) },
  { key: "trends", label: "Google Trends", emoji: "📈", desc: "What's trending right now", available: true, needsTopic: false, tag: "Trends",
    build: () => ({ type: "url", value: "https://trends.google.com/trending/rss?geo=US" }) },
  { key: "youtube", label: "YouTube", emoji: "▶️", desc: "Requires channel API — coming soon", available: false, tag: "YT" },
  { key: "x", label: "X / Twitter", emoji: "𝕏", desc: "No free API — paid only", available: false, tag: "X" },
  { key: "facebook", label: "Facebook", emoji: "📘", desc: "No public feed access", available: false, tag: "FB" },
  { key: "instagram", label: "Instagram", emoji: "📸", desc: "No public feed access", available: false, tag: "IG" },
];

const FALLBACKS: Record<string, string[]> = {
  ai:       ["https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=800&q=80","https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=800&q=80","https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&q=80"],
  soccer:   ["https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&q=80","https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&q=80","https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80"],
  nba:      ["https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80","https://images.unsplash.com/photo-1504450758481-7338eba7524a?w=800&q=80","https://images.unsplash.com/photo-1627627256672-027a4613d028?w=800&q=80"],
  ufc:      ["https://images.unsplash.com/photo-1549476464-37392f717541?w=800&q=80","https://images.unsplash.com/photo-1517438984742-1262db08379e?w=800&q=80","https://images.unsplash.com/photo-1607453998774-d533f65dac99?w=800&q=80"],
  colombia: ["https://images.unsplash.com/photo-1588392382834-a891154bca4d?w=800&q=80","https://images.unsplash.com/photo-1512813195386-6cf811ad3542?w=800&q=80","https://images.unsplash.com/photo-1518182170546-07661fd94132?w=800&q=80"],
  nyt:      ["https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80","https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80","https://images.unsplash.com/photo-1495020689067-958852a7765e?w=800&q=80"],
  custom:   ["https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80","https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&q=80"],
};

function getFallback(key: string, index: number) {
  const list = FALLBACKS[key] ?? FALLBACKS.custom;
  return list[index % list.length];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function formatEventDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// ─── Image component with lazy og:image fetch ────────────────────────────────

function ArticleImg({ rssImage, link, fallback, alt, className }: {
  rssImage: string; link: string; fallback: string; alt: string; className: string;
}) {
  const [src, setSrc] = useState(rssImage || "");
  const [err, setErr] = useState(false);
  const fetched = useRef(false);

  useEffect(() => {
    // Prefer the RSS image, else a previously-resolved real cover from cache
    setSrc(rssImage || getCover(link) || "");
    setErr(false);
    fetched.current = false;
  }, [rssImage, link]);

  // Fetch og:image when: no rss image at all, OR rss image failed to load
  function tryOgImage() {
    if (fetched.current || !link) return;
    fetched.current = true;
    fetch(`/api/og-image?url=${encodeURIComponent(link)}`)
      .then((r) => r.json())
      .then(({ image }) => { if (image) { setCover(link, image); setSrc(image); setErr(false); } })
      .catch(() => {});
  }

  useEffect(() => {
    if (!src) tryOgImage();
  }, [src, link]);

  const imgSrc = (!src || err) ? fallback : src;
  return (
    <img
      src={imgSrc}
      alt={alt}
      loading="lazy"
      decoding="async"
      className={`${className} object-cover`}
      onError={() => {
        if (!err) {
          setErr(true);
          // If rss image failed, try og:image before giving up
          if (src && src !== fallback) tryOgImage();
        }
      }}
    />
  );
}

// ─── Score strip ─────────────────────────────────────────────────────────────

function ScoreStrip({ events }: { events: MatchEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {events.map((e) => {
        const live = e.state === "in", done = e.state === "post";
        return (
          <div key={e.id} className={`rounded-xl border bg-card p-3 space-y-2.5 ${live ? "border-emerald-500 shadow-sm shadow-emerald-100 dark:shadow-emerald-950" : ""}`}>
            {/* Header */}
            <div className="flex items-center justify-between gap-1">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">{e.league}</span>
              {live && (
                <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE
                </span>
              )}
              {done && <span className="text-[10px] font-semibold text-muted-foreground shrink-0 bg-muted px-1.5 py-0.5 rounded">FT</span>}
              {!live && !done && (
                <span className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
                  <Clock size={9} />
                  {new Date(e.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              )}
            </div>

            {/* Teams */}
            <div className="space-y-2">
              {[e.home, e.away].map((t) => (
                <div key={t.name} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {t.logo
                      ? <img src={t.logo} alt={t.name} className="w-5 h-5 object-contain shrink-0" onError={(ev) => { (ev.target as HTMLImageElement).style.display = "none"; }} />
                      : <div className="w-5 h-5 rounded-full bg-muted shrink-0" />}
                    <span className="text-xs font-medium truncate">{t.abbr || t.name}</span>
                  </div>
                  {(live || done) && (
                    <span className={`text-base font-bold tabular-nums shrink-0 ${live ? "text-emerald-600" : ""}`}>{t.score}</span>
                  )}
                </div>
              ))}
            </div>

            {live && e.status && (
              <p className="text-[10px] font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-950 rounded px-1.5 py-0.5 w-fit">{e.status}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── UFC strip ───────────────────────────────────────────────────────────────

function UFCStrip({ events }: { events: UFCEvent[] }) {
  if (!events.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {events.map((e) => {
        const isNext = events[0]?.id === e.id;
        return (
          <div key={e.id} className={`rounded-xl border bg-card p-3 space-y-2 ${isNext ? "border-red-500 shadow-sm shadow-red-100 dark:shadow-red-950" : ""}`}>
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0">
                <Calendar size={10} className="text-muted-foreground shrink-0" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide truncate">
                  {formatEventDate(e.date)}
                </span>
              </div>
              {isNext && (
                <span className="text-[10px] font-bold text-red-600 shrink-0 bg-red-50 dark:bg-red-950 px-1.5 py-0.5 rounded">NEXT</span>
              )}
            </div>
            <p className="text-sm font-bold leading-tight">{e.shortName || e.name}</p>
            {e.mainEvent && (
              <p className="text-xs text-muted-foreground font-medium">{e.mainEvent}</p>
            )}
            {e.location && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 truncate">
                <span>📍</span>{e.location}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Add feed dialog ─────────────────────────────────────────────────────────

function AddFeedDialog({ open, onClose, onAdd }: {
  open: boolean; onClose: () => void; onAdd: (feed: CustomFeed) => void;
}) {
  const [mode, setMode] = useState<"topic" | "url">("topic");
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");

  function handleAdd() {
    const v = value.trim();
    const l = label.trim() || v;
    if (!v || !l) return;
    onAdd({ id: Date.now().toString(), label: l, type: mode, value: v });
    setValue("");
    setLabel("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add News Source</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          {/* Mode toggle */}
          <div className="flex gap-1 bg-muted p-1 rounded-lg">
            <button onClick={() => setMode("topic")} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "topic" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Search size={13} /> Topic / Keyword
            </button>
            <button onClick={() => setMode("url")} className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-sm font-medium transition-all ${mode === "url" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
              <Rss size={13} /> RSS / URL
            </button>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {mode === "topic" ? "Search topic" : "RSS feed URL"}
            </label>
            <Input
              placeholder={mode === "topic" ? "e.g. electric vehicles, Bitcoin, SpaceX..." : "https://example.com/rss.xml"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tab label</label>
            <Input
              placeholder={mode === "topic" ? "e.g. EV News" : "e.g. My Blog"}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {mode === "topic"
              ? "We'll search Google News for this topic and create a live tab."
              : "Paste any RSS feed URL and we'll pull it directly into a tab."}
          </p>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button className="flex-1 bg-sky-600 hover:bg-sky-700 text-white" onClick={handleAdd} disabled={!value.trim()}>
              Add tab
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Article reader ───────────────────────────────────────────────────────────

function readTime(text: string) {
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function fullDate(dateStr: string) {
  if (!dateStr) return "";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function ArticleReader({ item, open, onClose, badge, fallback }: {
  item: NewsItem | null; open: boolean; onClose: () => void; badge: string; fallback: string;
}) {
  const [copied, setCopied] = useState(false);
  const [heroImg, setHeroImg] = useState("");

  useEffect(() => {
    if (!item) return;
    setHeroImg(item.image || "");
    // Always attempt og:image when modal opens so we get the real post image
    if (item.link) {
      fetch(`/api/og-image?url=${encodeURIComponent(item.link)}`)
        .then(r => r.json())
        .then(({ image }) => { if (image) setHeroImg(image); })
        .catch(() => {});
    }
  }, [item?.link]);

  if (!item) return null;

  const paragraphs = item.content.split("\n\n").filter(p => p.trim().length > 20);
  const mins = readTime(item.content || item.description);

  function copyLink() {
    if (!item) return;
    navigator.clipboard.writeText(item.link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent side="right" showCloseButton={false} className="w-full sm:max-w-xl p-0 flex flex-col">
        <SheetTitle className="sr-only">{item.title}</SheetTitle>

        {/* Hero image */}
        <div className="relative h-56 shrink-0 bg-muted">
          <img
            src={heroImg || fallback}
            alt={item.title}
            className="w-full h-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).src = fallback; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors">
            <X size={16} />
          </button>
          {/* Source badge over image */}
          <div className="absolute bottom-3 left-4">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${badge}`}>{item.source}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-5 space-y-4">

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
              {item.author && (
                <span className="font-medium text-foreground">{item.author}</span>
              )}
              {item.author && item.pubDate && <span>·</span>}
              {item.pubDate && <span>{fullDate(item.pubDate)}</span>}
              {item.pubDate && <span>·</span>}
              <span className="flex items-center gap-1"><Clock size={11} />{mins} min read</span>
            </div>

            {/* Title */}
            <h2 className="text-xl font-bold leading-snug">{item.title}</h2>

            {/* Summary */}
            {item.description && item.description !== item.content && (
              <p className="text-sm font-medium text-foreground/80 leading-relaxed border-l-2 border-muted-foreground/30 pl-3">
                {item.description}
              </p>
            )}

            {/* Divider */}
            <div className="border-t" />

            {/* Body */}
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              {paragraphs.length > 0
                ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
                : <p className="italic">Open the full article to read more.</p>}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t shrink-0 flex gap-2">
          <button
            onClick={copyLink}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-medium hover:bg-muted transition-colors"
          >
            {copied ? <><Check size={14} className="text-emerald-500" /> Copied</> : <><Copy size={14} /> Copy link</>}
          </button>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-foreground text-background text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Read full article <ExternalLink size={14} />
          </a>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const LS_KEY = "n2s_custom_feeds";
const LS_HIDDEN_KEY = "n2s_hidden_tabs";

function loadCustomFeeds(): CustomFeed[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]"); } catch { return []; }
}
function saveCustomFeeds(feeds: CustomFeed[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(feeds));
}
function loadHiddenTabs(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_HIDDEN_KEY) ?? "[]"); } catch { return []; }
}
function saveHiddenTabs(keys: string[]) {
  localStorage.setItem(LS_HIDDEN_KEY, JSON.stringify(keys));
}

export default function News() {
  const [category, setCategory] = useState("ai");
  const [items, setItems] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [digest, setDigest] = useState("");
  const [digestLoading, setDigestLoading] = useState(false);
  const [scores, setScores] = useState<MatchEvent[]>([]);
  const [ufcEvents, setUfcEvents] = useState<UFCEvent[]>([]);
  const [selected, setSelected] = useState<NewsItem | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [customFeeds, setCustomFeeds] = useState<CustomFeed[]>([]);
  const [hiddenTabs, setHiddenTabs] = useState<string[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [discoverPlatform, setDiscoverPlatform] = useState<Platform | null>(null);
  const [discoverTopic, setDiscoverTopic] = useState("");

  useEffect(() => {
    setCustomFeeds(loadCustomFeeds());
    setHiddenTabs(loadHiddenTabs());
    setMounted(true);
  }, []);

  // Soccer scores: fetch once, then poll every 60s ONLY while the soccer tab is
  // open and the page is visible — avoids constant background requests.
  useEffect(() => {
    if (category !== "soccer") return;
    function fetchScores() {
      fetch("/api/soccer-scores").then(r => r.json()).then(({ events }) => setScores(events ?? [])).catch(() => {});
    }
    fetchScores();
    let t: ReturnType<typeof setInterval> | null = null;
    const start = () => { if (!t) t = setInterval(fetchScores, 60_000); };
    const stop = () => { if (t) { clearInterval(t); t = null; } };
    const onVis = () => (document.hidden ? stop() : (fetchScores(), start()));
    start();
    document.addEventListener("visibilitychange", onVis);
    return () => { stop(); document.removeEventListener("visibilitychange", onVis); };
  }, [category]);

  // UFC events only needed on the UFC tab
  useEffect(() => {
    if (category !== "ufc") return;
    fetch("/api/ufc-events").then(r => r.json()).then(({ events }) => setUfcEvents(events ?? [])).catch(() => {});
  }, [category]);

  useEffect(() => {
    // Discover is a source picker, not a feed — skip fetching
    if (category === "discover") { setLoading(false); setItems([]); return; }

    const custom = customFeeds.find(f => f.id === category);
    const cacheKey = custom ? `${custom.type}:${custom.value}` : category;

    // Show cached items instantly (no spinner), then revalidate in background
    const cached = readNewsCache(cacheKey) as NewsItem[] | null;
    if (cached && cached.length) {
      setItems(cached);
      setLoading(false);
    } else {
      setLoading(true);
      setItems([]);
    }

    let url = `/api/news?category=${category}`;
    if (custom) {
      url = custom.type === "topic"
        ? `/api/news?category=custom&topic=${encodeURIComponent(custom.value)}`
        : `/api/news?category=custom&url=${encodeURIComponent(custom.value)}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(({ items }) => {
        setItems(items ?? []);
        setLoading(false);
        if (items?.length) writeNewsCache(cacheKey, items);
      })
      .catch(() => setLoading(false));
  }, [category, customFeeds]);

  // AI daily digest — cached in-session so reloads paint it instantly
  useEffect(() => {
    if (category === "discover") { setDigest(""); return; }

    const custom = customFeeds.find(f => f.id === category);
    const cacheKey = custom ? `${custom.type}:${custom.value}` : category;

    const cachedDigest = readDigestCache(cacheKey);
    if (cachedDigest) {
      setDigest(cachedDigest);
      setDigestLoading(false);
    } else {
      setDigest("");
      setDigestLoading(true);
    }

    let url = `/api/news-digest?category=${category}`;
    if (custom) {
      url = custom.type === "topic"
        ? `/api/news-digest?category=custom&topic=${encodeURIComponent(custom.value)}`
        : `/api/news-digest?category=custom&url=${encodeURIComponent(custom.value)}`;
    }

    fetch(url)
      .then(r => r.json())
      .then(({ summary }) => { setDigest(summary ?? ""); if (summary) writeDigestCache(cacheKey, summary); })
      .catch(() => {})
      .finally(() => setDigestLoading(false));
  }, [category, customFeeds]);

  function addFeed(feed: CustomFeed) {
    const updated = [...customFeeds, feed];
    setCustomFeeds(updated);
    saveCustomFeeds(updated);
    setCategory(feed.id);
  }

  function removeFeed(id: string) {
    const updated = customFeeds.filter(f => f.id !== id);
    setCustomFeeds(updated);
    saveCustomFeeds(updated);
    if (category === id) setCategory("ai");
  }

  function toggleTab(key: string) {
    const updated = hiddenTabs.includes(key)
      ? hiddenTabs.filter(k => k !== key)
      : [...hiddenTabs, key];
    setHiddenTabs(updated);
    saveHiddenTabs(updated);
    if (updated.includes(category)) setCategory(BASE_CATEGORIES.find(c => !updated.includes(c.key))?.key ?? "ai");
  }

  function pickPlatform(p: Platform) {
    if (!p.available) return;
    if (p.needsTopic) { setDiscoverPlatform(p); setDiscoverTopic(""); return; }
    // No topic needed (e.g. Trends) — create the feed right away
    const built = p.build!("");
    addFeed({ id: `disc-${p.key}-${Date.now()}`, label: p.tag, type: built.type, value: built.value });
  }

  function confirmDiscover() {
    const p = discoverPlatform;
    const topic = discoverTopic.trim();
    if (!p || !topic) return;
    const built = p.build!(topic);
    const label = `${p.tag} · ${topic}`.slice(0, 28);
    addFeed({ id: `disc-${p.key}-${Date.now()}`, label, type: built.type, value: built.value });
    setDiscoverPlatform(null);
    setDiscoverTopic("");
  }

  function openArticle(item: NewsItem) { setSelected(item); setReaderOpen(true); }

  const customFeed = customFeeds.find(f => f.id === category);
  const baseCat = BASE_CATEGORIES.find(c => c.key === category);
  const catColors = baseCat ?? { ...CUSTOM_COLOR, key: category, label: customFeed?.label ?? "" };

  const headlines = items.slice(0, 7);
  const [hero, ...grid] = items;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-3xl font-medium tracking-tight">News</h1>
        <span className="text-xs text-muted-foreground">Live</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex bg-muted p-1 rounded-xl gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {BASE_CATEGORIES.filter(c => !hiddenTabs.includes(c.key)).map((c) => (
            <button
              key={c.key}
              onClick={() => setCategory(c.key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${category === c.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* Discover tab */}
        <button
          onClick={() => setCategory("discover")}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${category === "discover" ? "bg-indigo-600 text-white shadow-sm" : "bg-muted text-muted-foreground hover:text-foreground"}`}
        >
          <Compass size={14} /> Discover
        </button>

        {/* Custom feed tabs */}
        {mounted && customFeeds.map((f) => (
          <div key={f.id} className="flex items-center gap-0.5">
            <button
              onClick={() => setCategory(f.id)}
              className={`px-4 py-1.5 rounded-l-lg text-sm font-medium whitespace-nowrap transition-all border ${category === f.id ? "bg-sky-600 text-white border-sky-600" : "bg-muted text-muted-foreground hover:text-foreground border-transparent"}`}
            >
              {f.label}
            </button>
            <button
              onClick={() => removeFeed(f.id)}
              className={`px-1.5 py-1.5 rounded-r-lg text-xs transition-all border-l border ${category === f.id ? "bg-sky-700 text-white border-sky-600" : "bg-muted text-muted-foreground border-transparent hover:text-red-500"}`}
              title="Remove"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Add button */}
        <button
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-all border border-dashed border-muted-foreground/30"
        >
          <Plus size={13} /> Add
        </button>

        {/* Manage tabs button */}
        <button
          onClick={() => setManageOpen(true)}
          className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
          title="Manage tabs"
        >
          <Settings2 size={16} />
        </button>
      </div>

      {/* Manage tabs dialog */}
      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Manage tabs</DialogTitle>
          </DialogHeader>
          <div className="space-y-1 pt-1">
            {BASE_CATEGORIES.map((c) => {
              const hidden = hiddenTabs.includes(c.key);
              return (
                <button
                  key={c.key}
                  onClick={() => toggleTab(c.key)}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                    <span className="text-sm font-medium">{c.label}</span>
                  </div>
                  <div className={`w-9 h-5 rounded-full transition-colors relative ${hidden ? "bg-muted-foreground/20" : "bg-emerald-500"}`}>
                    <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${hidden ? "left-0.5" : "left-4.5"}`} />
                  </div>
                </button>
              );
            })}
            <p className="text-xs text-muted-foreground px-3 pt-2">Custom tabs can be removed using the × on each tab.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Soccer matches */}
      {category === "soccer" && scores.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Matches</p>
          <ScoreStrip events={scores} />
        </div>
      )}

      {/* UFC upcoming */}
      {category === "ufc" && ufcEvents.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Upcoming Events</p>
          <UFCStrip events={ufcEvents} />
        </div>
      )}

      {/* Discover — source picker */}
      {category === "discover" && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold">Discover sources</h2>
            <p className="text-sm text-muted-foreground">Pick a platform and topic to follow. It becomes a saved tab you can revisit anytime.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PLATFORMS.map((p) => (
              <button
                key={p.key}
                onClick={() => pickPlatform(p)}
                disabled={!p.available}
                className={`relative text-left rounded-xl border p-4 transition-all ${
                  p.available
                    ? "bg-card hover:border-indigo-400 hover:shadow-sm cursor-pointer"
                    : "bg-muted/40 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl">{p.emoji}</span>
                  {!p.available && <Lock size={13} className="text-muted-foreground" />}
                </div>
                <p className="font-semibold text-sm">{p.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.desc}</p>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            X, Facebook & Instagram don't offer free public feeds, so they require paid APIs — added later if needed.
          </p>
        </div>
      )}

      {/* Discover — topic entry dialog */}
      <Dialog open={!!discoverPlatform} onOpenChange={(o) => { if (!o) setDiscoverPlatform(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-xl">{discoverPlatform?.emoji}</span> Follow on {discoverPlatform?.label}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <Input
              autoFocus
              placeholder="Topic or keyword (e.g. Claude AI)"
              value={discoverTopic}
              onChange={(e) => setDiscoverTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") confirmDiscover(); }}
            />
            <Button onClick={confirmDiscover} disabled={!discoverTopic.trim()} className="w-full gap-2">
              <Plus size={14} /> Add feed
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {loading && (
        <div className="flex items-center justify-center py-24 text-muted-foreground">
          <Loader2 className="animate-spin mr-2" size={16} /> Loading...
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-5">

          {/* AI daily digest */}
          {(digest || digestLoading) && (
            <div className="rounded-xl border bg-card overflow-hidden">
              <div className="px-4 py-2.5 border-b flex items-center gap-2">
                <Sparkles size={13} className="text-blue-500" />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Today&apos;s Digest</span>
                <span className="text-[10px] text-muted-foreground ml-auto">AI summary</span>
              </div>
              <div className="px-4 py-3">
                {digestLoading && !digest ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" /> Summarizing today&apos;s news…
                  </div>
                ) : (
                  <ul className="space-y-1.5">
                    {parseDigest(digest).map((line, i) => (
                      <li key={i} className="flex gap-2 text-sm leading-relaxed text-foreground/90">
                        <span className="text-blue-500 mt-1.5 shrink-0 w-1 h-1 rounded-full bg-blue-500" />
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* Headlines */}
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${catColors.dot}`} />
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Top Headlines</span>
            </div>
            <div className="divide-y divide-border">
              {headlines.map((item, i) => (
                <button
                  key={i}
                  onClick={() => openArticle(item)}
                  className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group"
                >
                  {/* Thumbnail */}
                  <div className="shrink-0 w-14 h-14 rounded-lg overflow-hidden bg-muted hidden sm:block">
                    <ArticleImg
                      rssImage={item.image}
                      link={item.link}
                      fallback={getFallback(baseCat?.key ?? "custom", i)}
                      alt={item.title}
                      className="w-full h-full"
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${catColors.badge}`}>{item.source}</span>
                      {item.pubDate && <span className="text-[10px] text-muted-foreground">{timeAgo(item.pubDate)}</span>}
                    </div>
                    <p className="text-sm font-semibold leading-snug line-clamp-2 group-hover:text-foreground/80 transition-colors">{item.title}</p>
                    {item.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{item.description}</p>
                    )}
                  </div>

                  {/* Index number */}
                  <span className="text-xs font-bold text-muted-foreground/30 tabular-nums shrink-0 mt-0.5 hidden md:block">{i + 1}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Hero */}
          {hero && (
            <button
              onClick={() => openArticle(hero)}
              className="group relative block w-full text-left rounded-2xl overflow-hidden h-60 md:h-80 shadow-sm hover:shadow-lg transition-shadow"
            >
              <ArticleImg rssImage={hero.image} link={hero.link} fallback={getFallback(baseCat?.key ?? "custom", 0)} alt={hero.title} className="w-full h-full" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${catColors.badge}`}>{hero.source}</span>
                <h2 className="mt-2 text-white text-base md:text-xl font-bold leading-snug line-clamp-2 group-hover:underline decoration-white/40">{hero.title}</h2>
                {hero.description && <p className="text-white/60 text-xs mt-1 line-clamp-2 hidden md:block">{hero.description}</p>}
                {hero.pubDate && <p className="text-white/40 text-xs mt-1">{timeAgo(hero.pubDate)}</p>}
              </div>
            </button>
          )}

          {/* Grid */}
          {grid.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grid.map((item, i) => (
                <button
                  key={i}
                  onClick={() => openArticle(item)}
                  className="group flex flex-col text-left rounded-xl overflow-hidden border bg-card hover:shadow-md transition-shadow"
                >
                  <div className="h-40 overflow-hidden bg-muted">
                    <ArticleImg rssImage={item.image} link={item.link} fallback={getFallback(baseCat?.key ?? "custom", i + 1)} alt={item.title} className="w-full h-full transition-transform duration-300 group-hover:scale-105" />
                  </div>
                  <div className="flex flex-col flex-1 p-3.5 gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0 ${catColors.badge}`}>{item.source}</span>
                      {item.pubDate && <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(item.pubDate)}</span>}
                    </div>
                    <p className="text-sm font-semibold leading-snug line-clamp-2">{item.title}</p>
                    {item.description && <p className="text-xs text-muted-foreground line-clamp-2 mt-auto pt-1 leading-relaxed">{item.description}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add feed dialog */}
      <AddFeedDialog open={addOpen} onClose={() => setAddOpen(false)} onAdd={addFeed} />

      {/* Article reader */}
      <ArticleReader
        item={selected}
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        badge={catColors.badge}
        fallback={getFallback(baseCat?.key ?? "custom", 0)}
      />
    </div>
  );
}
