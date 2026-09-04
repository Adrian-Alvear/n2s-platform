# N2S ECOSYSTEM — FULL BUILD SPEC

Consolidated brief. Everything below was specified by Adrian across the build
session; this is the single source of truth for the project's intent.

---

## 0. THE ONE-LINE GOAL

Not a dashboard with a 3D page. **One centralized application whose entire shell
is a 3D ecosystem** — every module is a place you fly into, not a link you click.

---

## 1. ROLE

Expert WebGL & Spatial UI Developer. Real-time 3D rendering of complex geometry,
pointer interaction, and seamless transitions between multiple nested 3D scenes
without crushing browser performance.

---

## 2. STACK (fixed — do not change)

| Layer | Choice |
|---|---|
| Framework | Next.js 16 App Router, Turbopack |
| Deploy | Cloudflare **Workers** via `@opennextjs/cloudflare` |
| DB | Supabase (Postgres) |
| Auth | Cloudflare Access (JWT) — local dev falls back to Adrian/admin |
| UI | Tailwind CSS v4 + shadcn/ui (Radix) |
| 3D | three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing |
| State | zustand |
| Charts | recharts |
| Icons | lucide-react |
| Ephemeris | astronomy-engine |
| Package manager | **npm — never pnpm** |

App lives in `dashboard/`. Run all npm commands from there.

---

## 3. ARCHITECTURE — THE ECOSYSTEM IS THE SHELL

- The `<Canvas>` lives in the **root layout**, mounted once, **never unmounted**.
  The WebGL context must survive navigation so the world stays continuous.
- **The URL is authoritative.** `nodeForPath()` decides which portal is open, so
  deep links, refresh and browser back all work. `/budget/spending` lands you
  *inside* the Financial Hub, not on a bare page.
- Clicking a node sets `mode="diving"` then navigates, so the dive animation
  plays while the route transition happens underneath it.
- **No sidebar. No bottom nav. No page chrome.** Navigation is flying into a
  node; a sidebar is a second answer to the same question.
- Modules are **panels in a world**, not pages that own the window. `ModuleFrame`
  is the app's only chrome.
- Module pages must render correctly standalone **and** inside the portal, in
  light and dark theme.
- The module page wrapper MUST stay transparent — a page-level `bg-background`
  looks right standalone but blacks out the 3D world behind the portal.

State machine: `macro → diving → micro → exiting → macro`, plus `briefing`.

---

## 4. THE VISUAL LANGUAGE

### Aesthetic — evolved, this is the current target
The original brief said "electric cyan wireframe". **That was rejected as too
robotic.** The target is an **orrery / observatory**: deep near-black void,
silver and bone-white geometry, a warm gold sun. Nodes differ by colour
*temperature*, not hue, so the system stays monochrome-ish rather than reading
as colour-coded UI chips.

```
VOID       #05060a     STARLIGHT  #f4f6fa
SILVER     #b9c0cc     PLATINUM   #8b93a3
SUNGOLD    #f0d9a8
```

- Wireframes use `EdgesGeometry` + `lineSegments`, **never** `material.wireframe`
  — the latter draws every triangulation diagonal and reads as noise.
- `toneMapped: false` with colour pushed past 1.0 is what makes Bloom catch it.
- Bloom is the entire aesthetic: emissive geometry on black plus a bloom pass.
  Keep it soft (intensity ~0.85, threshold ~0.35) — glow, not neon.
- **Never hardcode violet/cyan hexes in module UI.** Use tokens:
  `var(--app-budget)`, `var(--destructive)`, `--chart-1..5`.

### Reference plates (in repo at `docs/references/`)
- `solar-system.png` — the orrery plate. Coplanar orbits, near-edge-on camera,
  faint per-planet ring tints, dense starfield.
- `financial-ui.png` — dark finance dashboard: near-black cards a step lighter
  than the page, ~16–20px radius, generous padding, one large balance figure,
  violet accent, muted grey labels against high-contrast numbers, transactions
  as a real table with status pills, goals as labelled progress rows.
- `dark-dashboard-zenith.avif` — additional dark UI reference.

---

## 5. THE SYSTEM — REAL ORBITAL MECHANICS

Positions come from **astronomy-engine** (VSOP87 / NOVAS C 3.1, ~1 arcminute),
not synthetic math. The simulation starts at `Date.now()`, so on load the
configuration matches where the planets actually are.

**Critical:** `HelioVector` returns **EQUATORIAL J2000**, inclined 23.4° to the
ecliptic. Pipe it through `Ecliptic()` or the whole plane tilts.

**The orrery compromise — angles are true, radii are compressed.** At real scale
the inner system collapses to a dot. Distance scales against each planet's mean
semi-major axis, so real **eccentricity survives** — Mercury visibly breathes in
and out.

- Orbits are **true circles at real inclination**. The wide flat ellipse you see
  is *perspective from a ~13° camera*, not squashed geometry.
- Orbit rings are **sampled from the ephemeris across one full period**, so they
  are real paths.
- Rotation must be **slow**. Kepler's third law (ω ∝ a^-1.5) drives the periods.
- Terrestrial planets keep the period spread at ~7.8×; Mercury→Neptune would be
  122× and the outer nodes would look frozen.

### The five nodes
| Node | Body | Icon | Purpose |
|---|---|---|---|
| Financial Hub | Mercury | stack of wireframe coins in a ring | budget, envelopes, goals, transactions |
| Portfolio Works | Venus | isometric gallery building with boards | project gallery — not built |
| Overview | Earth | globe with latitude ring | daily briefing: news, matches, month |
| Learning Curve | Mars | open book, brain hovering above | notes, reading — not built |
| Aerospace Hangar | outer | rocket on a hex launchpad | launch complex — not built |

News / Chat / Admin are **parked** — routes intact, not on the map.

---

## 6. THE CORE = JARVIS

The core is **not** a module door. It is the system's voice, Iron Man's JARVIS.

Clicking it: **camera pulls back to a wide vantage** revealing the whole system
while a briefing stages in over it — what this ecosystem is, what it includes.
The macro world keeps rendering behind the scrim, so the pull-back is something
you watch happen to a live scene.

### The companion drone
A small wireframe drone rides with the core. It is built entirely from
**attention cues**, because that is what sells a thing as alive:
- looks at whatever node you hover, and leans into it
- gimbals spin ~3× faster when it has a target
- eye brightens and pulses faster; the eye is the only saturated element on it,
  so it carries state without anything else changing colour
- with nothing hovered it turns back to face the camera
- during the briefing it parks further out and higher, clearing the type
- idle bob is two sine waves at **unrelated periods** so the loop never lands

**It reports.** It reads the month's ledger and says the single most useful
thing — a blown limit, else one forecast to blow, else whole-budget pace, else
top spender. **Only ever one line**; a drone that lists things is a dashboard.
Reads only, never writes.

---

## 7. MOTION VOCABULARY

Five named primitives, one definition, every surface moves the same way:

```
DRAW    hairlines scale from centre       scaleX(0) → scaleX(1)
REVEAL  type rises out of a mask          translateY(115%) inside overflow:hidden
RISE    copy lifts a short distance
SETTLE  controls arrive with a scale resolve
FADE    full-bleed layers resolve in place
```

**FADE never translates** — translating a full-bleed layer drags a bare edge
into frame.

- Single curve: **650ms `cubic-bezier(0.4, 0, 0.2, 1)`**. Alternates:
  expo `(.16,1,.3,1)`, quint `(.22,1,.36,1)`.
- **All properties crossfade together**, never sequenced. Depth reads through
  **blur + scale**, not position alone.
- Masked reveals need `padding-top:.18em; margin-top:-.18em` or the mask clips
  ascenders.
- **Two nested `requestAnimationFrame`** before playing — a single frame can
  coalesce and the transition never runs.
- Entrance runs once, then removes its own classes, leaving no timers or
  residual transforms.
- Grain plate over large black fields (tiled SVG fractalNoise, 200px, ~0.4
  opacity) — stops banding.

### Entrance sequences
**Cold start:** camera begins far outside the system and falls inward over
~3.2s on `easeOutQuint` — most distance covered early, so it reads as arriving
and settling, not gliding on a rail. The system **assembles**: orbit paths fade
up and bodies scale onto them, staggered outward from the sun. Driven in
`useFrame`, costing **zero React renders**.

**Node entrance:** scrim → chrome at 90ms → content at 170ms resolving out of
`blur(8px)` + `scale(0.985)`. The camera is still flying when the frame mounts,
so a hard cut fights the dive.

### Reduced motion
`prefers-reduced-motion` must be honoured everywhere — boot flight skips to the
resting camera, staged elements render **at rest with no transition at all**.
The setting asks for no motion, not less of it.

---

## 8. BACKGROUNDS

Procedural, **not video**. Four videos would be several MB each, can't be
tinted, and would decode alongside a live WebGL scene.

Nebula shader: inverted sphere the camera sits inside, 4 octaves of value noise
in two layers drifting at different rates and directions so the field never
resolves into a repeating pattern. Warm lift toward the ecliptic centre. Renders
first with depth writes off.

**Each node carries its own tint**, and the shader eases toward the active one
in the frame loop, so diving **crossfades** the ambience instead of cutting it.

**Every node is its own world** with its own geometry and animation — a node
that opens onto empty black is a bug.

---

## 9. THE FINANCIAL MODULE

Match `financial-ui.png`'s **design language**, not its feature list. It is a
bank dashboard; this is a shared household ledger for three people (Adrian,
Javi, Yazmi). **There are no cards, no accounts to transfer between, no
recipients.** Never put a fake account number, fake card or dead control on
screen.

Real data: `entries` (expense_at, description, category, amount, member, scope),
14 hardcoded Spanish CATEGORIES, DEFAULT_BUDGETS, MEMBERS, INCOME $3,000 each,
family/personal scope, per-month adjustable limits.

Built so far: insights band (burn rate, at-risk categories, MoM movement, top
spender), category donut + drill-down sheet, searchable/filterable/sortable
ledger, recurring-cost detection, 12-month paired income/spend chart, savings
goals, hero balance card.

**Bilingual is a hard requirement, not a style.** Family scope is Spanish,
personal is English, driven by the `L` object. Every new string needs both.
Never ship an English-only string into family scope.

`PERSONAL_BUDGETS` is all zeros — **"no budget defined" is not an overrun.**

---

## 10. HARD CONSTRAINTS

- **Never write to the database.** No inserts, updates or deletes. Supabase
  points at the real family ledger. Reads only; new persistence → localStorage.
- Verify with **`npx opennextjs-cloudflare build`**, never `npm run build` —
  `next build` does not exercise the OpenNext bundler and passes while the
  deploy is broken.
- **`esbuild` must stay a direct devDependency.** `@opennextjs/cloudflare`
  imports it at runtime but declares it only as a devDependency, so it survives
  on whatever another package hoists. Adding deps has broken the deploy before —
  verify any dependency change against `rm -rf node_modules && npm ci`.
- Never read `package-lock.json` or `.open-next/` — both enormous.
- Accessibility: never carry meaning by colour alone, label icon-only controls,
  keep focus visible, honour reduced motion.
- Keep labels/HUD as **DOM** (drei `<Html>`), not painted into the canvas —
  accessible, crisp at any zoom, and testable.
- Don't fix pre-existing lint. Don't push. Don't commit to main.

### Verification gates (all must pass, every slice)
```
npm test                          ≥ current count, zero failing
npx tsc --noEmit                  clean
npx opennextjs-cloudflare build   passes
```

---

## 11. SOURCES & REFERENCES GIVEN

**Motion inspiration**
- https://motionsites.ai/ — gallery of animated-background landing pages
- TOONHUB carousel spec — role-based carousel, 650ms coordinated crossfade,
  depth via blur+scale layering, giant ghost display type, grain overlay,
  animation lock during transitions
- SpaceEdu hero spec — named entrance primitives, run-once-then-self-delete
  pattern, blocking inline script to avoid FOUC, `document.fonts.ready` with a
  500ms guard, warm-on-intent asset preloading, never reassign `img.src`

**Video references** (animated backgrounds; the "robot one" was the favourite —
liked for interaction/animation feel, not literal content)
- https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_115139_0fc6bd3d-3631-4d26-ab9b-28293887dcc9.mp4
- https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260423_084718_72a17915-4964-4059-afcd-22d59399b72e.mp4
- https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260411_104032_69319010-2458-492b-b04d-b40a5dfa4482.mp4

**Product references**
- Monarch Money — visual bar for a personal-finance product
- Iron Man's JARVIS — the core's character

---

## 12. OPEN / NOT YET BUILT

- Bank connection. Researched: Monarch uses Plaid + MX + Finicity with fallback.
  **Webhooks (`SYNC_UPDATES_AVAILABLE`), never polling** — banks aren't
  real-time; card transactions sit pending 1–3 days. Canada matters: Plaid
  covers the Big 6 but often by scraping; **Flinks** runs the larger live
  OAuth network for Canadian banks. Plaid Trial = 10 production Items free.
  Gotchas: Cloudflare Access will block the webhook endpoint (needs a bypass
  policy); Plaid categories need mapping to the 14 Spanish ones; `entries`
  writes currently discard errors and must be fixed before any importer.
  **Recommended first step is CSV import**, which forces the same category
  mapping and deduplication work at zero cost.
- Mobile navigation. The bottom nav was deleted with the shell move; orbiting a
  3D scene on a phone to reach the budget is worse than a tab bar.
- Portfolio, Learning, Aerospace module UIs — worlds exist, modules do not.
- Command palette, skeleton loaders across the ecosystem.
