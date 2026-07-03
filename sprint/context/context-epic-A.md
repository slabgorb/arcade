# Epic A Context

## Title
Asteroids — faithful 1979 vector clone

## Overview
Full-fidelity browser vector clone of Atari's 1979 Asteroids. New gitignored subrepo (gitflow, port 5275, /asteroids/ base). ROM-accurate flight, splitting, waves, saucers, hyperspace; reference/ quarry from 6502disassembly.com/va-asteroids.

## Metadata
- **Epic ID:** A
- **Repo:** asteroids

## Background

This epic builds the fourth subrepo in the arcade. **Nothing here is a new
invention** — Asteroids inherits the architecture tempest proved and star-wars
refined. star-wars (`star-wars/CLAUDE.md`) is the direct blueprint; Asteroids
is strictly simpler (2D, no Math Box, no multi-page contact sheets required).
Where this document is silent, do what star-wars does.

### Architecture: the hard core/shell boundary (non-negotiable)

Identical to tempest and star-wars:

```
asteroids/
├── src/
│   ├── core/            # PURE, unit-tested, no DOM/canvas
│   │   ├── state.ts     # GameState type (ship, rocks, saucer, bullets, score, wave, rng)
│   │   ├── sim.ts       # stepGame(state, input, dt) → state
│   │   ├── input.ts     # Input type (left/right/thrust/fire/hyperspace, abstracted)
│   │   ├── rng.ts       # seeded PRNG (deterministic) — copy star-wars pattern
│   │   ├── shapes.ts    # vector shape tables (ship, 3 rock size tiers × variants, saucers)
│   │   └── …            # rocks.ts, saucer.ts, scoring.ts etc. as stories require
│   ├── shell/           # IO: render.ts, input.ts, loop.ts, audio.ts, storage.ts, font.ts
│   └── main.ts          # bootstrap: canvas + wire shell ↔ core
├── tests/               # Vitest suites against the pure core
├── reference/           # GITIGNORED — disassembly quarry (see below)
├── index.html
└── vite.config.ts       # base '/asteroids/', port 5275, strictPort
```

`core/` must NEVER: import from `shell/`; touch DOM/window/canvas; call
`Date.now()`, `performance.now()`, `Math.random()`, or `requestAnimationFrame`.
All time enters as `dt`; all randomness comes from the seeded RNG carried in
`GameState`. `stepGame(state, input, dt) → state` is identical-in →
identical-out. TDD (Vitest) on the core; the shell is verified by running the
game.

**Reuse-first ruling:** copy the *pattern* from star-wars (`rng.ts`, loop
fixed-timestep, glow rendering approach, `storage.ts` localStorage high
scores, `font.ts` vector font). Do NOT create a shared library — CLAUDE.md
says extraction waits until duplication is proven across games, and that call
belongs to a dedicated future story, not this epic.

### Toolchain (identical to siblings)

TypeScript strict, ES modules, Vite 8, Vitest 4. `package.json` scripts match
star-wars verbatim: `dev`, `build` (`tsc --noEmit && vite build`), `test`
(`vitest run --passWithNoTests`), `test:watch`, `lint`.

`vite.config.ts` mirrors star-wars with three substitutions: `base:
'/asteroids/'`, `server.port: 5275`, `preview.port: 5275`. Keep `strictPort:
true` and `allowedHosts: ['arcade.slabgorb.com']` on both server and preview
(the Cloudflare tunnel forwards that Host header).

### Arcade wiring (story A-1)

A-1 is the keystone and has a bootstrap wrinkle: the `asteroids/` directory
does not exist when the story starts. A-1 therefore begins at the orchestrator:
`git init` the subrepo (default branch `develop`, gitflow, remote
`github.com/slabgorb/asteroids` when created), add it to the orchestrator's
`.gitignore`, register it in `.pennyfarthing/repos.yaml` (copy the star-wars
entry shape: `default_branch: develop`, `branch_strategy: gitflow`,
dev/build/test commands), wire `just serve` + `just install-all`, add the
lobby tile, and add the `/asteroids/*` → `:5275` ingress rule under
`cloudflared/` per `cloudflared/README.md`. Port 5275 is the next free pin
(lobby 5270, tempest 5273, star-wars 5274).

### Fidelity bar (applies to every story, not a polish phase)

The epic was committed as **full-faithful up front**: each story ships
ROM-accurate behavior for its slice. The authority chain for game constants:

1. `reference/` quarry — Computer Archeology / 6502disassembly.com
   rev-4 ROM disassembly of Asteroids (via https://6502disassembly.com/va-asteroids/,
   plus the original source on GitHub linked from that page)
2. Published analyses of the disassembly
3. Observed behavior in footage / MAME — for feel calibration only (A-19)

Known ROM facts already established (stories must honor these; verify against
the quarry when porting):

- **Ship:** rotate / thrust / inertia / drag / screen-wrap; max velocity capped
- **Bullets:** max **4** player shots on screen; finite lifetime/range
- **Rocks:** 3 sizes; large→2 medium→2 small; scores **20 / 50 / 100**
- **Score:** two BCD bytes, displayed ×10, **rolls over at 99,990**; extra
  life every 10,000
- **Waves:** start 4 large, +2 per wave, **cap 11** starting rocks; engine
  tolerates 27 total objects on screen
- **Saucers:** large fires randomly (200 pts); small aims, accuracy ramps
  after **35,000 pts** (1,000 pts)
- **Hyperspace:** random reposition avoiding edges; ~**25%** self-destruct
  chance; waits for clear spawn zone
- **Sound:** NOT in the disassembly notes — the accelerating heartbeat,
  thrust, fire, explosions, and saucer siren (A-18) are sourced from analyses
  and recordings; document sources in `reference/README.md`

### The reference/ quarry

Gitignored, with a `README.md` explaining provenance and how to refresh —
copy the star-wars convention. A-17 ports the ROM shape tables (ship, rock
variants, saucer, explosion debris, vector font digits) and velocity/timing
constants into `core/` as typed TypeScript data with the quarry as cited
source. **The quarry lives only in the checkout that created it** (lesson
from star-wars: reference/ existed only in a-3) — the porting story must land
the *extracted data* in committed `core/` source so no other checkout needs
the quarry.

### Cross-story constraints and guardrails

- **Determinism is a standing AC:** every story's tests drive the core with a
  fixed RNG seed and fixed dt; no story may introduce wall-clock or
  `Math.random()` into `core/`.
- **2D world space, toroidal:** positions are 2D world coordinates on a
  wrapping (toroidal) playfield; wrap is a *sim* concern (A-3/A-8), not a
  render trick. Collision is computed in world space, never screen pixels.
- **Rendering:** Canvas 2D glowing vector lines on black, matching the arcade
  visual language. DVG-authentic brightness/glow tuning is A-19; earlier
  stories use the sibling games' default glow style.
- **No engines, no backend:** no game/physics engine, no networking. High
  scores in `localStorage` (A-16), lobby wiring included.
- **Story order is dependency order:** A-1 → A-2 (tick/RNG/state) → A-3..A-5
  (flight/fire/render) → A-6..A-10 (rocks/waves/scoring) → A-11..A-13
  (saucers) → A-14..A-16 (hyperspace/lives/attract) → A-17..A-19
  (tables/sound/glow). Saucer stories depend on scoring (A-9) for the 35k
  ramp; hyperspace (A-14) depends on rock placement queries (A-10).
- **Gitflow:** PRs target `develop`, squash-merge; branch naming
  `feat/{story}-{description}` etc. Sprint ceremony stays at the orchestrator.
- **Workflow reminder:** merge PRs before `pf sprint story finish` and verify
  the merge landed on `origin/develop` (known toolchain gotcha).

### Planning Documents

| Document | Location | Role |
|----------|----------|------|
| Asteroids disassembly hub | https://6502disassembly.com/va-asteroids/ | Primary quarry (rev-4 ROM) |
| star-wars CLAUDE.md | `star-wars/CLAUDE.md` | Architecture blueprint to copy |
| Arcade CLAUDE.md | `CLAUDE.md` (orchestrator root) | Serving/ports/tunnel canon |
| cloudflared README | `cloudflared/README.md` | Ingress apply procedure (A-1) |
| repos.yaml | `.pennyfarthing/repos.yaml` | Subrepo registration shape (A-1) |

---
_Generated by `pf context create epic A` from the sprint YAML._
_Enriched by Architect (Goldstein): architecture, fidelity bar, and cross-story guardrails._
