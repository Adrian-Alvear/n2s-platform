# Signature moment — research and ideas

*2026-09-17. What the best studio and portfolio sites do to catch the eye, and
what fits N2S specifically.*

## What the research says

**1. The site has to be worth visiting on purpose.** AI answers now absorb the
"go to a website to learn something" visit; a large share of searches end
without a click. The sites that still win are ones people come to because the
site itself is the experience — Apple's scroll-driven 3D, fashion houses
treating the site as an installation. A brochure — even a beautiful one — is
exactly what's being replaced. (Utsubo, 2026)

**2. For AI studios specifically: show the thing doing its job.** The pattern
across credible AI company sites is the product visible above the fold — a
live demo rather than a paragraph about capability. Interactive demos are
replacing static case studies. (Mojo, Krishaweb, Khod roundups)

**3. The hero responds to the visitor.** Cursor-reactive heroes, kinetic and
variable typography, and type carrying the visual weight instead of a hero
image are the dominant 2026 hero patterns. (Envato, Figma, Really Good Designs)

**4. The technical ceiling.** Lusion, Active Theory and Igloo Inc (Awwwards
Site of the Year honouree; built entirely in WebGL by Abeto) are the reference
end: shader-driven UI, particle fields that re-form on hover, GPU-decoupled
DOM. Stunning, and months of specialist work. We learned last session that a
WebGL-dependent hero is fragile on this setup — worth borrowing ideas from, not
matching.

## The diagnosis for N2S

The site is currently **elegant and passive**: type, glow, motion. It *tells*
a visitor that N2S builds products for problems that don't have one. Nothing
on the page *does* that. With no client work to show, the page itself has to
be the proof (BUILD-PROMPT §2.3) — and right now it proves taste, not
capability.

The missing "different aspect" is **interaction that demonstrates the pitch.**

## Ideas, ranked by fit

### 1. "Describe your problem" — the signature piece  ★ recommended
A single input in the hero: *"What isn't working?"* The visitor types a real
problem — "we quote jobs from a spreadsheet and lose track of follow-ups" — and
the page answers by **sketching the product that doesn't exist yet**: a name,
three capabilities, and a wireframe that draws itself on screen with the DRAW
primitive. It ends with one action: *send this sketch to us* (a prefilled
email).

- **Why it fits:** it turns the positioning sentence into something you do,
  not something you read. It demonstrates AI as the base capability without
  the word "AI" in the hero. It is also a working **Lab piece** — it solves
  the empty-Lab problem at the same time.
- **Stack:** Cloudflare Workers AI binding (already used in v1; free daily
  allowance), structured JSON output rendered as a blueprint. Turnstile to stop
  abuse, a per-visitor rate limit, and curated examples as the fallback if the
  model is unavailable.
- **Guardrails:** clearly labelled as a sketch, never a quote or promise; the
  model shapes the sketch, it never states prices, timelines or capability
  claims about N2S; nothing a visitor types is stored or published.
- **Size:** ~1–2 weeks to do properly.

### 2. Problem → product headline (kinetic type)
The italic *"don't have a product yet"* cycles through real problem
statements, each one scrambling and resolving into the product that answers it:
*"quotes lost in spreadsheets" → Quote tracker.* Text-scramble / decode effect,
CSS + a few lines of JS, no canvas.

- **Why:** eye-catching in the first second, and it previews idea 1.
- **Size:** a day. Reliable — nothing here can fail to render.

### 3. The blueprint under the page (cursor-reactive light)
The dark background hides a faint technical grid — hairlines, measurements,
wireframe fragments. The cursor carries a soft light that *reveals* it, like a
torch over a drawing. Everything is built on something you can't see until you
look.

- **Why:** cursor-reactive heroes are the leading 2026 pattern, and this one
  carries meaning — the structure under the surface.
- **Size:** a day or two. CSS mask + pointer position; off on touch and under
  reduced motion.

### 4. Scroll that builds a product
Replace the static "Judgment × execution" plate with a scroll-driven sequence:
a problem statement → hairlines draw a sketch → the sketch becomes a wireframe
→ the wireframe becomes a working interface. The process section, shown
instead of described.

- **Size:** ~a week. Pairs naturally with idea 1's blueprint style.

### 5. "Currently building" live strip
A quiet line under the hero, fed from the hub: *currently building — a quote
tracker for a landscaping business.* Signals a working studio. The one-way
hub → site connection from §0, made visible.

- **Guardrail:** only ever real data from the hub. If nothing is live, it
  doesn't render.
- **Size:** small once the hub has a Works module.

### Not recommended now
Particle fields that re-form on hover (Igloo Inc style) and full WebGL heroes.
High ceiling, but it's the path that failed last session, and it shows
craft rather than the thing N2S sells.

## Suggested order
**2 + 3 now** (fast, reliable, visibly different within days) → **1** as the
signature piece and first real Lab entry → **4** → **5** when the hub is ready.

## Sources
- Utsubo — Web Design Trends 2026: AI Killed the Brochure Website
  https://www.utsubo.com/blog/web-design-trends-2026-decision-makers-guide
- Mojo — Best AI Company Website Designs 2026
  https://mojo-agency.com/ai-company-website-designs/
- Krishaweb — AI-Powered Agency Websites
  https://www.krishaweb.com/blog/ai-powered-agency-websites/
- Khod — AI Website Examples 2026
  https://www.khod.io/resource-center/articles/ai-website-examples
- Envato — Web design trends 2026: kinetic type, broken grids
  https://elements.envato.com/learn/web-design-trends
- Figma — Top Web Design Trends for 2026
  https://www.figma.com/resource-library/web-design-trends/
- Really Good Designs — Web Design Trends 2026
  https://reallygooddesigns.com/web-design-trends-2026/
- Awwwards — Igloo Inc case study
  https://www.awwwards.com/igloo-inc-case-study.html
- WebGPU.com — Igloo Inc: procedural crystals, shader-driven UI
  https://www.webgpu.com/showcase/igloo-inc-procedural-crystals/
- Psychoactive Studios — Best WebGL & interactive 3D agencies 2026
  https://www.psychoactive.co.nz/content-hub/best-webgl-interactive-3d-agencies
- Muzli — 100 Best Designer Portfolio Websites 2026
  https://muz.li/blog/top-100-most-creative-and-unique-portfolio-websites-of-2025/
