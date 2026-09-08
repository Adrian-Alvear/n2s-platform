# N2S

A software studio for problems that don't have a product yet.

One application, two faces: a public studio front and an Access-gated operator
hub, sharing a single persistent 3D world.

See **[docs/BUILD-PROMPT.md](docs/BUILD-PROMPT.md)** for the full specification.

## Develop

```bash
npm install
npm run dev          # http://localhost:3000
```

`/hub` is open in development and gated by Cloudflare Access in production.

## Verify

```bash
npm run gates        # test + typecheck + opennext build
```

`npm run cf-build` is the build that matters — plain `next build` passes while
the Cloudflare deploy is broken.

## Deploy

```bash
npm run deploy
```
