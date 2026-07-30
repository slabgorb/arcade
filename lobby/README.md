# lobby

The arcade's front door — a vector-style lobby on black that lists the games as
glowing tiles, launches them, runs an attract-mode demo loop when idle, and shows
per-game high scores. Canvas 2D, no backend. Second subrepo in the **arcade**
series; sprint/epics are managed at the orchestrator (epic 7).

**▶ Live: [arcade.slabgorb.com](https://arcade.slabgorb.com)** — this lobby is
the arcade's front door.

## Stack

TypeScript (ES modules, strict) · Vite 8 · Vitest 4 · HTML5 Canvas 2D. No engine,
no backend. Mirrors the `tempest` toolchain so the two games stay consistent.

## Commands

```bash
npm install          # Install dependencies
npm run dev          # Vite dev server → http://localhost:5270
npm run build        # tsc --noEmit && vite build
npm test             # vitest run --passWithNoTests
npm run test:watch   # vitest in watch mode
```

## Structure

```
lobby/
├── src/
│   ├── core/         # PURE, unit-tested, no DOM/canvas (e.g. layout math)
│   └── main.ts       # bootstrap: canvas + render shell
├── tests/            # Vitest suites against the pure core
├── index.html        # Vite entry
└── vite.config.ts    # dev server pinned to port 5270, base /lobby/
```

The pure `core/` vs. IO `shell` split follows the same discipline as `tempest`:
anything testable without a canvas lives in `core/`; the DOM bootstrap stays in
`main.ts`. Served under `/lobby/` on arcade.slabgorb.com.

## Releasing

This repo ships from the [arcade orchestrator](https://github.com/slabgorb/arcade):
`just release lobby` gates on tests + build, merges `develop` → `main`, tags
`vX.Y.Z`, and pushes. Every push to `main` auto-deploys to Cloudflare R2 via
GitHub Actions (`.github/workflows/deploy.yml`) — **`main` is production; never
push it by hand.** A red CI run deploys nothing.
