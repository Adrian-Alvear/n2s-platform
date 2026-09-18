# N2S — Agent Context

## Read this first

**`docs/BUILD-PROMPT.md` is the single source of truth for this project.**
Read it before doing any work here. It defines the product, the architecture,
the visual and motion language, the constraints, and the build phases. This
file is only a pointer and a status board — when the two disagree, the build
prompt wins.

## What this is

Two faces. One is an assistant, and it runs the other.

- **The back face** (`/hub/*`, Cloudflare Access) — **the ecosystem.** This is
  the assistant, JARVIS; the 3D orrery is its shell. Private, built for one
  person, and the interesting thing.
- **The front face** (`/`, public) — N2S the studio. Fast, editorial,
  cinematic, with **its own** visual language. Its quality is the portfolio,
  because there are no clients yet.

**The orrery belongs to the hub alone. Never mount it on a public route** — a
client seeing the operator's cockpit learns nothing about whether their problem
can be solved.

The connection runs one way: the hub holds the work, and publishing to the
public site is flipping a `visibility` flag on a record it already has. The
site is an *output* of the ecosystem, not a view of it.

The two faces share tokens, typography and the motion vocabulary — same hand —
but not geometry, not the canvas, not the shell. See BUILD-PROMPT §0 and §2.

## Current phase

**Phases 0–2 done.** Foundation, tokens, motion library, Access gate, the
full front face (`/`, `/lab`, `/studio`, `/contact`), and the orrery ported
from v1 and mounted at `/hub`.

**The front face is now a scroll film** (`HERO_MODE = "film"` in
`lib/site.ts`, code in `components/film/`). Glass shards drift as debris on the
right, pour toward a small core light as you scroll, and become the **N2S mark
in crystal glass** (`film/mark.ts`, traced from `public/brand/n2s-icon.png`).
Lenis smooth scroll; the camera follows one keyframe per `[data-film]`
section. Adrian approved: crystal look, darker tone, quiet matte debris.

**Next, agreed with Adrian:**
1. Pages as places in one 3D world — the canvas moves to the site layout and
   the camera *flies* between Home / Lab / Studio / Contact.
2. F1-style telemetry on the hub's solar system (real orbital data). Look not
   yet chosen: HUD, racing-line trails, wind-tunnel flow, or pit-wall.
3. Later: the "spaceman" style animation for the solar system.

**Seeing the 3D:** the agent's preview pane is a hidden document and never
renders WebGL. Adrian enabled Safari → Developer → "Allow JavaScript from
Apple Events"; the agent reads his localhost:3000 tab with `osascript … do
JavaScript`, and `window.__n2sSnap()` (dev only) captures real frames.

**Dev server gotcha:** never run `npm run cf-build` while `npm run dev` is
running — they share `.next/` and the build kills the dev server. If it dies,
`rm -rf .next && npm run dev`.

**Still open:** the Lab set — three to five real, working, deployed pieces.
The registry in `lib/content.ts` is empty by design and every section driven
by it renders nothing rather than a placeholder. See BUILD-PROMPT §2.3.

**Next: Phase 3 — the hub.** Re-attach node labels and dive targets to the
ported world, add `ModuleFrame`, and design the mobile tab bar.

## Stack

Next.js 16 App Router · Cloudflare **Workers** via `@opennextjs/cloudflare` ·
Tailwind v4 · zustand · Vitest. Package manager is **npm — never pnpm**.

## Verification gates

All three must pass before any slice is done:

```bash
npm run gates      # test + typecheck + cf-build
```

Individually: `npm test`, `npm run typecheck`, `npm run cf-build`.

**`npm run cf-build` is the one that matters.** It runs
`opennextjs-cloudflare build`. Plain `next build` does NOT exercise the OpenNext
bundler and passes green while the deploy is broken.

## Traps that have already cost time

- **`esbuild` must stay a direct devDependency.** `@opennextjs/cloudflare`
  imports it at runtime but declares it only as a devDependency, so it survives
  on whatever another package hoists. Adding a dependency has silently broken
  the deploy before. Verify lockfile changes against a clean
  `rm -rf node_modules && npm ci`.
- **Two nested `requestAnimationFrame`** before playing an entrance, or a single
  frame coalesces and the animation never runs. `lib/motion.ts` does this.
- Full list in BUILD-PROMPT §7. Read it before touching 3D or the build.

## Hard rules

- **Never write to the production database.** Reads only.
- **Never invent client-facing content** — no fake logos, case studies,
  testimonials or metrics. An empty section is honest; a fabricated one is a
  liability.
- **Never invent people.** Corporate "we" is fine; a phantom team is not.
- Honour `prefers-reduced-motion` everywhere. The setting asks for *no* motion,
  not less of it.
- Tests are written **after** the feature is built, not before.
- Don't commit to `main` and don't push. `main` is v1 and still deploys live.

## Git

This repo shares a remote with v1 (`gitlab.com:n2s3/n2s-platform`) but has
**unrelated history**. Work happens on `v2`. `main` holds the v1 app and is
still wired to Cloudflare — leave it alone until Adrian decides to cut over.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
