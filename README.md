# N2S Platform

Personal family dashboard built with Next.js 16, deployed on Cloudflare Pages via OpenNext. The repo lives at `gitlab.com:n2s3/n2s-platform.git`. Pushing to `main` triggers an automatic Cloudflare deployment.

## Repo structure

```
n2s-platform/
└── dashboard/          ← the Next.js app (only active sub-project so far)
    ├── app/            ← Next.js App Router pages + API routes
    ├── components/     ← shared UI components (shadcn/ui base)
    └── lib/            ← data constants, Supabase client, utilities
```

## Getting started locally

```bash
cd dashboard
npm install
# create .env.local with Supabase credentials (see Environment below)
npm run dev             # → http://localhost:3000
```

## Environment variables

Required in `.env.local` for local dev, and in Cloudflare dashboard for prod:

```
NEXT_PUBLIC_SUPABASE_URL=https://ljtzuicapblzqxpamtyt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Set prod vars at: **Cloudflare Dashboard → Workers & Pages → n2s-dashboard → Settings → Environment Variables**

## Deployment

```bash
# Option A — triggers Cloudflare CI (preferred)
git push origin main

# Option B — manual deploy from local
cd dashboard && npm run deploy
```

Cloudflare is connected to the GitLab repo. Every push to `main` auto-deploys via OpenNext + Cloudflare Pages.

## npm scripts

| Script | What it does |
|---|---|
| `npm run dev` | Local dev server (Next.js Turbopack) |
| `npm run build` | Production Next.js build |
| `npm run deploy` | Build + deploy to Cloudflare |
| `npm run preview` | Build + local Cloudflare Workers preview |

---

See `dashboard/CLAUDE.md` for agent-specific context and architecture details.
