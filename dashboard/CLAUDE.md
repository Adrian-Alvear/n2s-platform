@AGENTS.md

# N2S Dashboard — Agent Context

## What this project is

A personal family dashboard for Adrian, Javi, and Yazmi. It tracks household budget/spending and aggregates news. Built with Next.js 16 App Router, deployed to **Cloudflare Workers** via OpenNext. Auth is handled by Cloudflare Access (JWT in `cf-access-jwt-assertion` header). In local dev there is no auth — the `/api/me` route falls back to Adrian as admin.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.6 (App Router, Turbopack) |
| Deployment | Cloudflare **Workers** via `@opennextjs/cloudflare` (see `wrangler.jsonc`) |
| Database | Supabase (Postgres) |
| Auth | Cloudflare Access (JWT) |
| UI | Tailwind CSS v4 + shadcn/ui (Radix UI primitives) |
| Icons | lucide-react |
| Charts | recharts |

## File map

```
app/
  layout.tsx                  ← root layout, ThemeProvider, sidebar, mobile nav
  page.tsx                    ← home dashboard (greeting, app grid, monthly stats, recent activity)
  budget/
    page.tsx                  ← budget overview (categories, progress bars, spending list)
    spending/page.tsx         ← full spending history
    settings/page.tsx         ← budget settings
  news/
    page.tsx                  ← news aggregator (tabs, headlines, hero, grid, article reader, custom feeds)
  chat/page.tsx               ← placeholder (Coming soon)
  admin/
    page.tsx                  ← user management / permissions
    layout.tsx                ← admin layout wrapper
  api/
    me/route.ts               ← returns current user from CF Access JWT
    news/route.ts             ← fetches + parses RSS/Google News feeds
    og-image/route.ts         ← fetches og:image from an article URL (server-side, follows redirects)
    soccer-scores/route.ts    ← ESPN unofficial API for today's soccer scores
    ufc-events/route.ts       ← ESPN unofficial API for upcoming UFC events

components/
  sidebar.tsx                 ← desktop sidebar navigation
  mobile-nav.tsx              ← bottom nav for mobile
  month-nav.tsx               ← prev/next month navigator used in budget
  spending-sheet.tsx          ← slide-in sheet with full spending list
  quick-add.tsx / quick-add-float.tsx  ← add spending entry dialogs
  ui/                         ← shadcn base components (button, card, dialog, input, sheet, etc.)

lib/
  data.ts                     ← MEMBERS, CATEGORIES, DEFAULT_BUDGETS, INCOME constants (hardcoded)
  supabase.ts                 ← singleton Supabase client
  user-context.tsx            ← React context that holds the current user (fetched from /api/me)
  utils.ts                    ← cn() tailwind class merger
```

## Database (Supabase)

Table: **`entries`**
| Column | Type | Notes |
|---|---|---|
| id | int | primary key |
| expense_at | timestamptz | when the expense occurred |
| description | text | free-text label |
| category | text | must match one of CATEGORIES in lib/data.ts |
| amount | numeric | in USD |
| member | text | Adrian / Javi / Yazmi |

Table: **`platform_users`**
| Column | Type | Notes |
|---|---|---|
| email | text | primary key |
| name | text | display name |
| role | text | admin / viewer |

## Hardcoded data (lib/data.ts)

- **MEMBERS**: `["Adrian", "Javi", "Yazmi"]`
- **INCOME**: each member earns $3,000/mo (total $9,000)
- **DEFAULT_BUDGETS**: per-category monthly budget amounts — edit here to change budget allocations
- **CATEGORIES**: 14 spending categories (Spanish labels, e.g. "Arriendo", "Comida y Aseo")

To add a member or category, update `lib/data.ts` — the rest of the UI derives from those constants.

## News module (app/news/)

### How it works
- `app/api/news/route.ts` — fetches RSS feeds and Google News RSS search results, parses XML server-side, returns `NewsItem[]` as JSON. Accepts `?category=ai|soccer|nba|ufc` or `?category=custom&topic=keyword` or `?category=custom&url=https://...`
- `app/api/og-image/route.ts` — given a URL, fetches the first 30KB of the page and extracts `og:image` or `twitter:image`. Used client-side to lazy-load real article thumbnails.
- `app/api/soccer-scores/route.ts` — hits ESPN's unofficial public scoreboard API for today's matches across 6 leagues (World Cup, Champions League, Premier League, La Liga, Bundesliga, Serie A). Auto-refreshes every 60s on the client.
- `app/api/ufc-events/route.ts` — hits ESPN's MMA scoreboard API for UFC events in the next 120 days.

### RSS sources (as of August 2026)
**AI**: Google News RSS per company (Anthropic/Claude, OpenAI, Kimi/Moonshot) + TechCrunch AI, The Verge AI, VentureBeat. Scoped deliberately — Gemini, Meta AI, Copilot, Apple Intelligence and Tesla AI feeds were removed because they were noise for this household. Add a company here only if someone actually wants it.
**Soccer**: Google News World Cup, BBC Sport, The Guardian Football, Reddit r/worldcup+soccer, 90min, FourFourTwo
**NBA**: Google News NBA, ESPN NBA, The Guardian NBA, Reddit r/nba, Bleacher Report
**UFC**: Google News UFC, ESPN MMA, MMA Fighting, MMA Junkie, Reddit r/ufc
**Colombia**: Google News (es-419), Caracol, RCN Radio, El Tiempo, Semana, El Espectador
**NYT**: Google News `site:nytimes.com` searches — world, US politics, technology, business/economy, science/health

### Custom feeds (localStorage)
Users can add custom tabs via the "+ Add" button. Two modes:
- **Topic** → Google News RSS search (`news.google.com/rss/search?q=...`)
- **URL** → direct RSS feed

Stored in `localStorage` under key `n2s_custom_feeds` as `CustomFeed[]`. No backend needed.

### HTML cleaning
Google News and some feeds use escaped HTML entities in descriptions (`&lt;a&gt;` instead of CDATA). The `cleanText()` function in `news/route.ts` does two passes of tag stripping — before and after entity decoding — to prevent raw HTML leaking into the UI.

## Auth flow

1. Cloudflare Access sits in front of the deployed app and injects a JWT in the `cf-access-jwt-assertion` request header.
2. `/api/me` decodes the JWT (base64 split on `.`), extracts the `email`, looks it up in `platform_users`, and returns `{email, name, role}`.
3. In local dev, the JWT header is absent so `/api/me` returns Adrian as admin hardcoded.
4. `lib/user-context.tsx` fetches `/api/me` on mount and makes the user available via `useUser()` hook.

## Routing / navigation

- Desktop: sidebar (`components/sidebar.tsx`)
- Mobile: bottom tab bar (`components/mobile-nav.tsx`)
- Active apps: **Budget** (live), **News** (live)
- Placeholder apps: **Chat** (Coming soon), **Notes** (Coming soon)

## Build gotcha — esbuild must stay a direct devDependency

`@opennextjs/cloudflare` imports `esbuild` at runtime (`dist/cli/build/bundle-server.js`)
but declares it only as a **devDependency**, so it is never installed for consumers.
It works purely by whatever esbuild some other package hoists to top level.

Adding Vitest changed that hoist and broke the Cloudflare deploy with
`ERR_MODULE_NOT_FOUND: Cannot find package 'esbuild'`. `esbuild` is now an explicit
devDependency here to pin it at top level. **Do not remove it**, even though nothing
in this codebase imports it directly.

**Verify dependency changes with `npx opennextjs-cloudflare build`, not `npm run build`.**
`npm run build` is `next build` and does not exercise the OpenNext bundler — it passes
while the deploy fails. For anything touching the lockfile, verify against a clean
install (`rm -rf node_modules && npm ci`), since a warm `node_modules` hides hoisting
regressions.

## Known patterns / conventions

- All pages that need client state use `"use client"` at the top.
- Server-only logic (data fetching, RSS parsing) goes in `app/api/` route handlers, never in page components.
- Supabase is only accessed from client components via `lib/supabase.ts` — do not call it from API routes (Cloudflare Workers edge doesn't need it there).
- Colors follow a per-app scheme: Budget=violet, News=emerald, Chat=blue, Notes=amber.
- Tailwind v4 is used — some v3 utilities may not exist. Check before using obscure ones.
- Radix UI `SheetContent` and `DialogContent` require a `SheetTitle`/`DialogTitle` child (can be `className="sr-only"`) to avoid accessibility warnings.

## What's next (roadmap as of June 2026)

- **Chat** — AI agent powered by OpenClaw (Phase next)
- **Notes** — personal notes and docs (Phase later)
- Budget: recurring/scheduled expenses, graphs over time
- News: save/bookmark articles, notification for breaking news
