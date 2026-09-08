# N2S v2 — MASTER BUILD PROMPT

> Status: **v1.0 — ready to build.** This is the goal document for a ground-up
> rebuild. It supersedes `docs/ECOSYSTEM-SPEC.md`, which described a
> personal-only product.
>
> **Settled and not to be relitigated:** the two-faced product (§2), the
> positioning sentence (§2.1), voice and identity (§2.4), the stack (§3), the
> architecture and performance contract (§4), the visual and motion language
> (§5), the finance module's deletion and reframe (§6), the constraints (§8) and
> the gates (§9).
>
> **Deliberately still open:** the Lab set (§11, Phase 1's first task) and the
> Phase 4 finance decisions (§10). Neither blocks Phase 0. Sections marked
> **[NEEDS ADRIAN]** are the only unresolved items; nothing else is optional.

---

## 0. THE ONE-LINE GOAL

**Two faces. One of them is an assistant, and it runs the other.**

> **CORRECTION, 2026-09-07.** An earlier draft said the public landing *was*
> the back portal seen from outside — one shared 3D world spanning both faces.
> That was wrong and is superseded by this section. The orrery belongs to the
> hub alone.

**The back face is the ecosystem.** It is the assistant — JARVIS — and the 3D
orrery is its shell. This is where the operator works: projects, demos,
experiments, the ledger. It is private, it is the interesting thing, and it is
built for one person.

**The front face is N2S the studio.** What a client sees. It is a fast,
editorial, cinematic site with its own visual language, and it is **not made of
the ecosystem**. A prospective client must never be shown the operator's
orrery — it is somebody else's cockpit, and it says nothing to them about
whether their problem can be solved.

**The connection runs one way: the assistant drives the site.** The hub is
where work is recorded, and publishing to the public site is flipping the
`visibility` flag on a record the hub already holds (§2.3). Over time the
assistant does more of that job — deciding what is worth showing, drafting it,
keeping it current. The studio site is an *output* of the ecosystem, not a view
of it.

So the two faces share **tokens, typography and the motion vocabulary** — they
are recognisably from the same hand — but not geometry, not the canvas, and not
the shell. They are one system in the way a workshop and a shopfront are one
business.

---

## 1. ROLE

You are a senior product engineer with three unusual strengths, in this order:

1. **Real-time 3D on the web** — three.js / react-three-fiber, pointer
   interaction, nested scenes, and above all *performance discipline*. A
   beautiful scene that costs a client 4 seconds of blank screen has failed.
2. **Editorial visual design** — typography, restraint, negative space. This is
   a studio site. It must read as expensive and deliberate, never as a
   developer's tech demo with copy pasted on top.
3. **Product architecture** — an IA that holds a marketing site and a private
   operating hub in one codebase without either compromising the other.

You are not building a portfolio template. You are building the artefact that
wins the business.

---

## 2. THE TWO FACES

### 2.1 The front face — `n2s.<domain>` (public)

**Audience:** a prospective client, on a laptop, who has ~8 seconds of patience
and has already seen fifty agency sites this month.

**Job:** answer three questions in order, fast.
1. *What is this?* — a software studio for problems that don't have a product yet.
2. *Can they actually build?* — the page itself is the evidence.
3. *How do I start a conversation?* — one obvious, low-friction path.

**Non-negotiable properties:**
- **No orrery, and no shared canvas.** The front face has its own visual
  language — cinematic, editorial, glass and type. Any 3D it uses is its own
  and must serve the pitch, not display the operator's cockpit.
- Fully server-rendered, crawlable content. A search engine and a screen reader
  both get the complete story with zero JavaScript.
- Works on a phone, on a throttled connection, and with
  `prefers-reduced-motion` on. Each of those is a different fallback, not one.
- No lorem ipsum, no fake logos, no invented client names, no fabricated
  testimonials or metrics. Ever. If we don't have it, the section doesn't ship.

**The positioning sentence — settled, use it verbatim:**

> **N2S is a software studio for problems that don't have a product yet.**

The problem space is deliberately **open**. N2S does not decline a category of
work. What is narrow is the *method*, not the domain — see §2.4.

**Where AI sits.** AI is the base capability and the reason the range is
possible. It is **not the pitch.** AI agencies sell AI; N2S sells the outcome
and uses AI to get there. Consequently: **AI does not appear in the hero.** It
appears where it belongs — in how the work gets done, and visibly in what the
Lab pieces actually are. A site that leads with "AI" reads as the exact category
this is trying not to be.

**Services**, stated further down the page, never in the hero: consultation, AI
development, application building, ideation. Development-led.

**Who it's for:** startup founders, and established SMBs that need custom
software.

**Information architecture:**

| Route | Purpose |
|---|---|
| `/` | Hero statement, the live 3D world, what N2S does, selected Lab pieces, contact. One page, sectioned. |
| `/lab` | Working, deployed things. The evidence. See §2.3. |
| `/lab/[slug]` | One piece: the problem, what was built, what it does, and a link to try it. |
| `/studio` | Who N2S is, how the work is approached, what an engagement looks like. |
| `/contact` | A real email address. Nothing else — no form, no calendar embed. |

`/work` is **reserved, not built.** It appears the day there is a real client
project to put in it. See §2.3 for the content-model rule that makes that a data
entry rather than a rebuild.

### 2.2 The back face — `/hub/*` (private)

**Audience:** you, daily.

**Job:** be the single place your work and life are operated from — the thing
you actually open every morning.

**Gate:** Cloudflare Access sits in front of every `/hub` route. Local dev falls
back to an admin identity. There is no in-app login form, no password, no
session table — Access is the auth.

**Modules (proposed — confirm in §10):**

| Module | Contains |
|---|---|
| **Overview** | The daily briefing. Today, calendar, news, what needs attention. The default landing after sign-in. |
| **Ledger** | The household money, rebuilt as a **finance assistant**, not a dashboard — see §6. Three members, bilingual, real Supabase data, reads only. |
| **Works** | Projects and their state. The *source* for the public `/lab` (and later `/work`) entries — one content model, two presentations. See §2.3. |
| **Lab** | Side projects and tech demos. Things half-finished on purpose. Some are publishable to the front face; most are not. |
| **Library** | Notes, reading, references, learning. |
| **[NEEDS ADRIAN]** | Anything else the hub must hold — see §10. |

### 2.3 The credibility problem — a studio site with no clients yet

**There are no clients and no case studies.** N2S is being built so that
something exists the day an opportunity arrives. This is the defining constraint
on the front face and must be designed for directly, not worked around.

**The four failure modes, all fatal, all common:**
1. **The empty portfolio** — a "Our Work" section containing "coming soon". It
   advertises the absence. Never ship a section with nothing in it.
2. **The fake-big agency** — "we", an invented team page, "trusted by industry
   leaders", stock photography of people at whiteboards. Every prospect has seen
   this and can detect it, and detection is terminal.
3. **The student portfolio** — a grid of unexplained experiments. Work without
   framing reads as practice, not capability.
4. **Invented proof** — fabricated metrics, testimonials, or client logos. The
   temptation peaks precisely when there is nothing to show. It is banned in
   §8 and restated here for that reason.

**What replaces proof is demonstration.** Three sources, in descending order of
strength:

1. **The site itself.** A prospect looking at a site built to this standard has
   already had "can they build?" answered before reading a sentence. This is the
   entire economic justification for the 3D shell and the performance work — it
   is not decoration, it is the portfolio.
2. **The Lab.** Real, deployed, working things they can click. Not mockups, not
   screenshots, not concepts. Each framed as *problem → what I built → what it
   does → try it*. **A working demo with a written rationale is a case study
   without a client**, and is nearly as persuasive.
3. **The hub itself.** The strongest single asset available. A real operating
   system, used daily, built to production standard, is more convincing than
   three client landing pages — and §2.1's continuity means a prospect can
   glimpse it from the outside.

**Tone: small and deliberate, never big and established.** "A studio taking on a
small number of projects" is honest, reads as selective rather than new, and
cannot be falsified. Never claim scale, headcount, or history that doesn't exist.

**Launch minimum.** The front face does not ship until it has all of:
- one clear positioning sentence,
- **three to five genuinely working Lab pieces** — this is the hard one, and it
  is the real work of Phase 1,
- a stated approach to how the work is done,
- a real, monitored email address.

**The content-model rule.** A Lab entry and a client case study are **the same
shape** — a record with title, problem, approach, artefacts, outcome, and the
`visibility` flag from §2.2 — differing only in which fields are populated and
whether a client is attached. Build it this way from the first commit. When the
first real project lands, publishing it is filling in fields, not building a new
section.

---

### 2.4 Voice, identity, and the range problem

**N2S is currently one person.** The site does not disclose that, and does not
need to. It also must never manufacture the opposite. The line is precise:

| Permitted | Prohibited |
|---|---|
| The studio name and a corporate **"we"** | Invented team members — names, photos, bios |
| A named founder/CEO with a real photo | Any stated or implied headcount |
| **No team page at all** | Fabricated testimonials or client logos |
| "A studio taking on a small number of projects" | Claimed history, scale, or years in operation |

**Presentation — settled:** studio voice, founder named. Corporate "we"
throughout the site; a real named founder with a photo on `/studio`. Founders
and SMB buyers buy from people, and a real face converts better than a faceless
entity — while saying nothing about size. There is no team page, so there is no
place where a headcount is implied or has to be dodged.

Omitting a fact is fine. Inventing one is not, and the invented ones are what
get caught.

**The name.** N2S expands to **"Nothing to Success."** It is used under three
constraints:

1. **It appears once, on `/studio`, and nowhere else.** Never in the hero, never
   in nav, never as a tagline under the wordmark. The mark carries the brand on
   its own.
2. **It is framed as the client's arc, not the studio's.** Read as autobiography
   it is an origin story about N2S at the moment the reader is being asked to
   care about themselves. Read as a promise it aligns exactly with the
   positioning sentence (§2.1) — the client arrives with a problem that has
   *nothing* solving it, and leaves with something that works. Write the second
   version.
3. **It never sets the voice.** The expansion is motivational in register; the
   site is editorial, precise and restrained. Copy elsewhere must not drift
   toward inspirational-agency tone to match it.

**The range problem.** "We can solve anything" is the least differentiated
sentence in business, and with no track record it reads as unfocused rather than
capable. It cannot be *claimed* into credibility — but it can be **demonstrated**.

That is the Lab's second job (§2.3). Choose the three-to-five launch pieces so
they are **visibly unlike each other** — different domains, different problem
shapes, different surfaces. Range shown across four working artefacts proves
what no sentence can. Four variations on the same idea prove the opposite.

Selection rule: if two candidate Lab pieces would be described the same way by a
stranger, one of them is taking a slot it hasn't earned.

---

**The bridge between the faces:** a module's content carries a
`visibility: 'private' | 'public'` flag. Publishing a case study is flipping a
flag in the hub, not maintaining a second CMS. This is the single most valuable
structural decision in the rebuild — design for it from the first commit.

---

## 3. STACK (fixed — do not relitigate)

| Layer | Choice |
|---|---|
| Framework | Next.js (latest stable), App Router |
| Deploy | Cloudflare **Workers** via `@opennextjs/cloudflare` |
| Auth | Cloudflare Access (JWT header), dev falls back to admin |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix primitives) |
| 3D | three.js + @react-three/fiber + @react-three/drei + @react-three/postprocessing |
| State | zustand |
| Icons | lucide-react |
| Package manager | **npm — never pnpm, never yarn** |
| Install target | Installable PWA, standalone display mode, so it opens as its own macOS window with no browser chrome |

**Data layer — [NEEDS ADRIAN]:** the live household ledger currently sits in
Supabase and holds real family data. A true blank slate would move it; the safe
answer is to keep Supabase for the ledger and use Cloudflare D1/KV for
everything new. Decide before any data work starts.

**Workers, not Pages.** Pages has no Cron Triggers; Workers does. Any scheduled
work — digests, feed refreshes, briefings — depends on that distinction.

---

## 4. ARCHITECTURE

### 4.1 The world is the shell

- The `<Canvas>` belongs to the **hub only** (§0). It mounts once inside the
  `/hub` layout and is **never unmounted** while inside the hub, so navigation
  between modules does not tear down the WebGL context and the world stays
  continuous. It is never mounted on a public route.
- **The URL is authoritative.** A pure function maps pathname → which node is
  open and where the camera sits. Deep links, refresh, and browser back all
  land in the right place. `/hub/ledger/spending` opens you *inside* the Ledger
  node, not on a bare page.
- Navigation is flying into a node. **No sidebar, no bottom nav on desktop** — a
  persistent nav is a second answer to the question the world already answers.
- **Mobile is the exception and must be designed, not inherited.** Orbiting a 3D
  scene with a thumb to reach the budget is worse than a tab bar. Below the
  breakpoint: the world becomes a static backdrop and a conventional tab bar
  takes over. This was a known gap in v1 — do not repeat it.
- Modules are **panels in a world**, not pages that own the window. Every module
  must render correctly standalone *and* framed inside the portal, in light and
  dark.
- Module page wrappers stay **transparent**. A page-level opaque background
  looks fine standalone and blacks out the world behind the portal.

State machine: `macro → diving → micro → exiting → macro`, plus `briefing`.

### 4.2 The performance contract (this is what makes or breaks the front face)

- Three.js and the scene are **dynamically imported, below the fold of meaning**.
  Server-rendered content paints first, always.
- Hard budgets, enforced every slice:
  - **LCP < 2.0s** on a mid-tier laptop over a throttled connection.
  - **No layout shift** when the canvas mounts — it occupies reserved space from
    the first paint.
  - The 3D bundle is **not** in the initial JS payload.
- Three fallback tiers, each explicitly built and tested:
  1. **No JS / crawler** → full static page, complete content.
  2. **Reduced motion** → world renders at rest, no camera flight, no idle
     animation. The setting asks for *no* motion, not less of it.
  3. **Low-power / mobile / WebGL unavailable** → a designed static composition,
     not a broken canvas or an empty box.

---

## 5. VISUAL LANGUAGE

### 5.1 Aesthetic

**Orrery / observatory.** Deep near-black void, silver and bone-white geometry,
one warm gold light source. Nodes differ by colour *temperature*, not hue, so
the system stays monochrome and never reads as colour-coded UI chips.

Explicitly rejected: electric cyan wireframe. Too robotic, reads as a 2010s
"tech" cliché.

```
VOID       #05060a     STARLIGHT  #f4f6fa
SILVER     #b9c0cc     PLATINUM   #8b93a3
SUNGOLD    #f0d9a8
```

Treat these as a **starting palette to be re-derived**, not inherited law — this
is a rebuild, and the front face has a job the old palette was never designed
for. But any replacement must hold the same principle: monochrome-plus-one-warm,
temperature over hue.

### 5.3 Typography

Typography is the single biggest lever on whether the front face reads as a
studio or as a developer's demo. Three roles, no more — a fourth typeface is
almost always a mistake.

| Role | Use | Direction |
|---|---|---|
| **Display** | Hero statement, module names, section openers | A high-contrast **serif**, set large and tight. v1 already established this ("huge serif module name" in the briefing carousel) and it is what stops the site reading as a generic tech landing page. |
| **Text** | Body copy, UI, labels | A neutral **grotesque**. Invisible by design; it should never compete with the display face. |
| **Numeric** | Every figure in the Ledger, all data surfaces | **Monospace or tabular figures.** Required, not stylistic — digits must align in columns and must not jitter when values change (§6.7). |

Use freely-licensed faces so no licensing decision blocks the build. Reasonable
defaults: **Instrument Serif** or **Fraunces** for display, **Inter** or
**Geist** for text, **JetBrains Mono** or **Geist Mono** for numerals. Adrian may
override any of the three; the three-role structure stands regardless.

The serif/grotesque pairing is what carries the "orrery observatory" register
(§5.1); the tabular numerals are what carry the "financial terminal" register
(§6.7). Both live in the same system without conflict.

### 5.2 Motion vocabulary

Five named primitives. One definition each. Every surface in both faces moves
the same way, or the two faces stop feeling like one system.

```
DRAW    hairlines scale from centre     scaleX(0) → scaleX(1)
REVEAL  type rises out of a mask        translateY(115%) in overflow:hidden
RISE    copy lifts a short distance
SETTLE  controls arrive with a scale resolve
FADE    full-bleed layers resolve in place
```

- Single curve: **650ms `cubic-bezier(0.4, 0, 0.2, 1)`**. Alternates: expo
  `(.16,1,.3,1)`, quint `(.22,1,.36,1)`.
- **FADE never translates.** Translating a full-bleed layer drags a bare edge
  into frame.
- **All properties crossfade together**, never sequenced. Depth reads through
  **blur + scale**, not position alone.
- Entrance runs once, then removes its own classes — no residual timers or
  transforms left behind.
- Camera and scene animation runs in the frame loop and costs **zero React
  renders**.

---

## 6. THE FINANCE MODULE — DELETE IT, THEN REBUILD IT AS AN ASSISTANT

The v1 financial module is the most-built part of the old app and the part
Adrian likes least. It is not being ported, refactored, or salvaged. It is being
**deleted and re-conceived**, because the problem with it is not the code — the
code is fine and well tested. The problem is the *interaction model*.

### 6.1 Do not port these

Nothing below carries into v2. Listed explicitly so no agent "helpfully" brings
one back. All paths are relative to the v1 repo `n2s-platform/dashboard/`.

```
components/budget-insights.tsx        components/transactions-panel.tsx
components/category-breakdown.tsx     components/recurring-panel.tsx
components/category-detail-sheet.tsx  components/savings-goals.tsx
components/category-envelopes.tsx     components/activity-chart.tsx
components/spending-sheet.tsx         components/month-nav.tsx
components/quick-add.tsx              components/quick-add-float.tsx
components/personal-accounts.tsx      components/personal-payments.tsx
components/personal-tips.tsx
app/budget/page.tsx                   app/budget/spending/page.tsx
app/budget/settings/page.tsx
```

The analytics libraries (`budget-analytics.ts`, `entry-filters.ts`,
`recurring.ts`) are **not ported either** — but see §6.5: what they *compute* is
correct and must be recreated. Their maths is the asset; their role as feeders
for a panel wall is not.

### 6.2 The diagnosis — why it doesn't feel right

v1's budget screen is **nine independent panels, each answering a question you
did not ask**: an insights band, a category donut with drill-down, a searchable
ledger table, a recurring-cost panel, a twelve-month paired chart, savings
goals, a hero balance card, per-person bars, and a floating quick-add.

Every panel is individually good. Together they are a **reporting surface**:
they hand you the raw material and leave the analysis to you. You open it and
have to *work* to find out whether you are fine this month. That is the failure.
It is a dashboard, and dashboards make the reader do the thinking.

### 6.3 The reframe — assistant, not dashboard

**The target is a finance *assistant*.** The distinction is the entire brief:

| Dashboard | Assistant |
|---|---|
| Shows everything, always | Says one thing, then waits |
| You scan and interpret | It concludes, you confirm |
| Panels are permanent furniture | Visuals appear as *evidence for an answer* |
| Navigation is spatial (find the panel) | Navigation is linguistic (ask the question) |
| Answers questions you didn't ask | Answers the question you did |

There is already a proof of this concept in v1: `lib/companion-report.ts` — 76
lines that read the month's ledger and produce **one line**, the single most
useful thing (a blown limit, else one forecast to blow, else whole-budget pace,
else top spender). The old spec's rule for it — *"a drone that lists things is a
dashboard"* — is the governing principle for this entire module.

**Build the whole module as that drone, given a voice and a body.**

### 6.4 The interaction model

- **Opening state is a sentence, not a grid.** You arrive and the assistant
  states the one thing that matters about the money right now, with a single
  supporting figure. Nothing else is resident on screen.
- **The primary control is an input**, not a nav. Ask in plain language —
  *"how much did we spend on food this month?"*, *"are we going to blow rent?"*,
  *"what changed since last month?"* — in Spanish or English.
- **Answers render as response cards**, in this order, always:
  1. the answer as a sentence,
  2. at most **one** visual, and only if it carries information the sentence
     can't,
  3. the underlying rows, collapsed.
- **Depth is reachable, not resident.** The full ledger, category breakdowns and
  history still exist — you get there by asking, or by one deliberate action
  from an answer. They are never the landing state.
- **Proactive, but rationed.** The assistant may volunteer things unprompted —
  a limit about to break, an unusual charge, a recurring cost that changed
  price. **At most two per session.** A queue of alerts is a dashboard wearing a
  different hat.
- **Motion follows §5.2.** Answers arrive with REVEAL and RISE; superseded
  content leaves with FADE. The assistant should feel like it is *thinking and
  responding*, never like a page re-rendering.

### 6.5 Hard rules for the assistant

These are correctness requirements, not preferences.

- **The model phrases; it never computes.** Every figure in every answer comes
  from a pure, unit-tested TypeScript function over the ledger rows. An LLM must
  never be asked to do arithmetic on financial data, and must never be the
  source of a number shown on screen. Recreate the v1 maths — burn rate,
  month-over-month movement, at-risk categories, recurring-cost detection,
  forecast-to-limit — as pure functions with tests, then let the assistant
  *narrate* their output.
- **Every stated number is traceable.** One action from any figure shows the
  exact entries behind it. An assistant that asserts without evidence is
  strictly worse than the table it replaced.
- **Never fabricate.** If the data cannot answer the question, the answer is
  "the ledger doesn't cover that" — never a plausible-sounding estimate.
- **Bilingual is a requirement.** Family scope answers in Spanish, personal
  scope in English, including anything the assistant generates. Never ship an
  English-only string into family scope.
- **"No budget defined" is not an overrun.** Personal budgets are zeroed. Zero
  must never be narrated as a blown limit.
- **Reads only.** Production Supabase holds the real family ledger. See §6.6.

### 6.6 The write problem — [NEEDS ADRIAN]

An assistant you can only ask, never tell, is half a product — *"add $40 groceries"*
is the most natural thing to say to it. But v1's entry writes **discarded errors
silently**, and the hard constraint on the production ledger is reads-only.

Two honest options, pick one before Phase 4:
- **(a) Read-only assistant.** No add path at all. No disabled button, no
  "coming soon" — the capability simply doesn't exist in the UI.
- **(b) Proper write path.** Real error handling, optimistic update with
  rollback, confirmation before commit, and an audit trail. Built as a genuine
  feature, tested against a non-production dataset first.

**A fake or silently-failing add control is worse than no add control.** Do not
ship one.

### 6.7 The visual direction — terminal materials, assistant pacing

**This is a Phase 4 decision. It does not block anything before then.** It is
recorded here so the direction isn't lost, not because it needs resolving now.

Adrian pointed at `motionsites.ai/?prompt=finance-assistant` as a feel
reference. That prompt's text and design spec sit behind a paid subscription and
could not be retrieved, and the gallery thumbnails are not labelled per-prompt —
so that specific design is unknown to this document and should not be guessed at.

The stated direction is **financial portfolio / stock-market terminal**: the
texture of a trading desk. Serious, precise, numerate.

**This fits the house palette already.** Near-black void, silver and bone-white
geometry, one warm gold accent (§5.1) is, functionally, a terminal palette. No
new colour system is needed.

**The tension to resolve, and how.** Terminal aesthetics are *dense* — a real
trading screen shows hundreds of figures at once. That is the exact panel-wall
failure §6.2 diagnoses. So take the terminal's **materials**, not its density:

- Monospace or tabular-figure numerals, so digits align in columns and changing
  values don't jitter.
- Hairline rules and tight, precise small-caps labels against large,
  high-contrast figures.
- Sparklines and inline micro-charts rather than full chart panels.
- Value changes *tick* — numbers roll or crossfade in place, they never
  re-render as a new page.
- Restraint in colour: gain/loss must never be carried by red/green alone
  (§8, accessibility) — use direction, position and glyph too.

...delivered at **assistant pacing**: one answer at a time, evidence on request
(§6.4). The result should feel like a Bloomberg terminal that has learned to
speak in sentences, not a chat window with charts pasted into it.

**Still useful if supplied:** a screenshot of the reference, or two or three
named frames dropped into `docs/references/` with a written rule extracted from
each — the pattern v1's spec used well.
---

## 7. HARD-WON LESSONS — REIMPLEMENT, DON'T REDISCOVER

No code carries over. This knowledge does. Each of these cost real time in v1.

**Ephemeris / orbital mechanics** (if real planetary positions are kept):
- `HelioVector` returns **equatorial J2000**, inclined 23.4° to the ecliptic.
  Pipe it through `Ecliptic()` or the entire plane tilts and nothing looks right.
- **Angles true, radii compressed.** At real scale the inner system is a dot.
  Scale distance against each body's mean semi-major axis so real eccentricity
  survives.
- Orbits are **true circles at real inclination**. The flat ellipse you see is
  perspective from a low camera, not squashed geometry.
- Sample orbit rings from the ephemeris across one full period — real paths, not
  drawn circles.
- Compress the period spread. Mercury→Neptune is 122×; the outer nodes look
  frozen. Terrestrial-only is ~7.8× and reads as alive.

**Rendering:**
- Wireframes use `EdgesGeometry` + `lineSegments`, **never**
  `material.wireframe` — the latter draws every triangulation diagonal and reads
  as noise.
- `toneMapped: false` with colour pushed past 1.0 is what makes Bloom catch it.
- Bloom is the entire aesthetic. Keep it soft — glow, not neon.
- Backgrounds are **procedural shaders, not video**. Video can't be tinted,
  weighs megabytes, and decodes alongside a live WebGL scene.
- Grain plate over large black fields (tiled SVG fractalNoise) — stops banding.
- **Two nested `requestAnimationFrame`** before playing an entrance, or a single
  frame coalesces and the transition silently never runs.
- Masked type reveals need `padding-top:.18em; margin-top:-.18em` or the mask
  clips ascenders.
- Keep labels and HUD as **DOM** (drei `<Html>`), not painted into the canvas —
  accessible, crisp at any zoom, testable.

**Build / deploy:**
- Verify with **`npx opennextjs-cloudflare build`**, never `npm run build`.
  `next build` does not exercise the OpenNext bundler and passes green while the
  deploy is broken.
- **`esbuild` must be a direct devDependency.** `@opennextjs/cloudflare` imports
  it at runtime but declares it only as a devDependency, so it survives purely
  on whatever another package hoists. Adding a dependency has silently broken
  the deploy before.
- Verify any lockfile change against a clean `rm -rf node_modules && npm ci` —
  a warm `node_modules` hides hoisting regressions.
- Cloudflare Access will block any inbound webhook endpoint. It needs an
  explicit bypass policy.

---

## 8. HARD CONSTRAINTS

- **Never write to the production database.** The Supabase ledger is the real
  family ledger. Reads only. New persistence goes somewhere new.
- **Bilingual is a requirement, not a style.** Household/family scope is
  Spanish, personal scope is English. Every new string ships with both. Never
  ship an English-only string into family scope.
- **"No budget defined" is not an overrun.** Zeroed budgets must not render as
  blown limits.
- **Never invent client-facing content.** No placeholder logos, fake case
  studies, invented metrics or made-up testimonials — not even temporarily. An
  empty section is honest; a fabricated one is a liability.
- **Never invent people.** No fictional team members, no stated headcount, no
  stock photography standing in for staff. Corporate "we" is fine; a phantom
  team is not. See §2.4.
- **Accessibility is a gate, not a pass.** Never carry meaning by colour alone.
  Label icon-only controls. Keep focus visible. Honour reduced motion
  everywhere.
- No secrets in the repo. No committing to `main` without review.

---

## 9. VERIFICATION GATES

Every slice must pass all of these before it is considered done:

```
npm test                          zero failing, count only goes up
npx tsc --noEmit                  clean
npx opennextjs-cloudflare build   passes
```

Plus, for any slice touching the front face:
- Lighthouse performance ≥ 90 on `/`, mobile profile.
- The page renders complete and readable with JavaScript disabled.
- `prefers-reduced-motion: reduce` produces a fully static, correct page.

**Tests are written after the feature is built, not before.**

---

## 10. OPEN DECISIONS — [NEEDS ADRIAN]

**Decision order: business first, internals later.** Only the business block
below gates current work — it blocks Phase 1, which is the next real build step.
The finance and technical blocks are Phase 4 decisions and are deliberately left
open. Do not stall the front face on them.

**Answered — treat as settled:**
- **Positioning:** *N2S is a software studio for problems that don't have a
  product yet.* Verbatim. AI stays out of the hero (§2.1).
- **Identity:** studio voice, founder named, no team page, no headcount (§2.4).
- **Brand:** the existing N2S mark carries into v2. Assets in
  `~/Documents/N2S/` (wordmark, icon, white, B&W) — copy into the new repo at
  Phase 0 and derive the palette and favicon set from them.
- **Typography:** three roles — display serif, text grotesque, tabular numerals
  (§5.3).
- **Proof:** no clients yet. The site is being built ahead of the opportunity.
  The app and the Lab are the evidence. See §2.3.
- **Offer:** consultation, AI development, app building, ideation —
  development-led.
- **Buyer:** startup founders, and established SMBs.
- **Domain:** handled — already in the pipeline as part of N2S 2.
- **The name:** N2S expands to **"Nothing to Success."** Usage rule below.
- **Conversion:** a real email address. No form, no calendar embed.

**Still open — nothing here blocks Phase 0 or Phase 1:**

*(The business block is fully answered. Domain is handled — already in the
pipeline as part of N2S 2.)*

The **Lab set** was previously listed here. It has moved to §11 as Phase 1's
first task, because it is a working session over an inventory of existing
projects, not a question that can be answered in the abstract.

**Product shape:**
3. Is the module list in §2.2 right? What's missing, what should go?
4. Does the ledger stay in this app at all, or is the hub for work only?
5. Should the public `/work` content genuinely be driven by the hub's Works
   module, or is that over-engineering for now?

**Finance module (blocks Phase 4 — see §6):**
6. Direction set: financial-terminal materials at assistant pacing (§6.7). A
    screenshot or named reference frames would sharpen it, but it is no longer
    blocking.
7. What specifically felt wrong in v1's budget screen? The diagnosis in §6.2 is
    inferred, not confirmed. Confirm or correct it — the rebuild is aimed at it.
8. Write access: read-only assistant, or a proper write path? (§6.6)
9. Does the assistant use an LLM to phrase answers at all, or is it template-
    driven from the same pure functions? Template-driven is cheaper, fully
    deterministic, and trivially bilingual; an LLM handles open-ended questions
    but needs the §6.5 no-arithmetic guarantee enforced in code.

**Technical:**
10. Supabase stays, or move to Cloudflare D1?
11. New repo name, and does the current `n2s-platform` repo get archived?
12. Is anything at all salvaged, or is `budget-reimagined` (30 unpushed commits)
    abandoned as-is?

---

## 11. BUILD PHASES

Each phase ends deployable. No phase depends on a later one.

**Phase 0 — Foundation.** New repo, Next.js + Workers + OpenNext deploying to a
staging URL. Cloudflare Access gating `/hub`. Design tokens, typography scale,
motion library. Nothing visual yet beyond a correct, empty, well-typed shell.

**Phase 1 — The front face, static.** The complete public site with real
content, fully server-rendered, no WebGL at all. This must stand on its own as a
good studio site. If it doesn't work here, 3D won't save it.

> **Inventory, as of 2026-09-07 — read this before searching.** A scan of the
> machine and the GitLab remote found exactly **one** project of Adrian's:
> `n2s-platform` itself. `~/projects/gnhf` is Kun Chen's published npm tool that
> Adrian uses, not his work. `~/projects/n2s-playwright` is an empty directory.
> The GitLab remote `n2s3/n2s-platform` is this same repo (`main` plus three
> Renovate branches, no other work); the `n2s3` group is private and could not be
> enumerated. **Conclusion: the Lab set is built, not curated.** Do not re-run
> this search — ask Adrian instead.
>
> **The unbundling strategy.** v1 already contains several differently-shaped
> projects fused into one app, and separating them is far cheaper than building
> from zero: the **orrery** (VSOP87 ephemeris driving a WebGL shell), the **news
> aggregator** (multi-source RSS parsed at the edge, og:image extraction), the
> **recurring-cost engine** (recovering monthly commitments from six months of
> ledger history — a real inference problem and the most interesting thing in the
> repo), and the **hub** itself.
>
> **The catch, and it matters.** All four come from one codebase, so a stranger
> would describe the whole set as "pieces of his personal dashboard" — which
> fails the §2.4 selection rule and proves range only weakly. **At least one Lab
> piece must visibly not belong to that world**: different audience, different
> shape, and ideally something that looks like work a client would have paid for.
> That piece is the one that converts.
>
> **Phase 1, task one — choose the Lab set.** Before any page is written, take
> an inventory of every existing, abandoned and half-built project, and select
> **three to five** to finish to a deployable standard. This is the launch
> blocker (§2.3) and the proof of range (§2.4), so apply the selection rule: if
> two candidates would be described the same way by a stranger, one of them
> hasn't earned its slot. The hub counts as one. Everything else in Phase 1 is
> writing and layout; this is the actual work.

**Phase 2 — The world.** The persistent canvas, the orrery, camera flight,
node hover, the dive. Layered onto Phase 1 as an enhancement, with all three
fallback tiers built and verified. Front face now complete.

**Phase 3 — The gate and the hub shell.** Access-gated `/hub`, the URL↔node
mapping, `ModuleFrame`, the entrance sequence, mobile tab bar. Empty modules,
correct navigation.

**Phase 4 — Module interiors, one at a time.** Overview first (it's the default
landing), then the Ledger assistant (§6), then Works. Each is a full slice: UI,
data, tests, gates. The Ledger sub-slices in a fixed order — **pure analytics
functions and their tests first**, then the assistant's answer surface on top of
them. Never the reverse: an answer surface with no verified maths behind it is
how you ship a confident wrong number.

**Phase 5 — The bridge.** Visibility flags, hub → public case study publishing.

**Phase 6 — The core.** The system's voice: briefing, camera pull-back,
companion. Last, deliberately — it's the most seductive thing to build and the
least load-bearing.

---

## 12. HOW TO USE THIS DOCUMENT

- Answer §10 before starting Phase 1. Phase 0 can begin now.
- One phase at a time. One slice at a time inside a phase. Gates every slice.
- When something here turns out to be wrong, **change this document** in the
  same commit that changes the code. A spec that drifts from the build is worse
  than no spec.
