# Epic bz1 Context

## Title
Battlezone (1980) — full faithful vector clone

## Overview
Faithful browser-based vector clone of Atari's 1980 Battlezone — first-person 3D wireframe tank combat on a flat plain. Full game in one epic: dual-tread steering, green radar scanner, all 21 ROM-positioned obstacles, full enemy roster (slow tank 1000 / missile 2000 / super tank 3000 / saucer 5000), 'always one hostile' spawn, score-threshold intro, difficulty ratchet up-to-ROM, extra-tank award, POKEY-style SFX, cracked-glass viewport + gunsight. New gitignored subrepo battlezone/ (TS/Vite/Vitest, pinned port 5276 — 5275 taken by asteroids/epic A), math3d PORTED from star-wars (shared-lib extraction deferred). Canonical source: https://6502disassembly.com/va-battlezone/. Design brief: docs/superpowers/specs/2026-07-03-battlezone-bz1-epic-design.md. Sequenced AFTER epic A (Asteroids, p1); tagged p2. Descopes: no coin-op mechanics, difficulty capped at ROM, spawn-in-obstacle ROM bug not replicated. First of an expected bz1/bz2/bz3 Battlezone epic line.

## Metadata
- **Epic ID:** bz1
- **Repo:** battlezone

## Background

This epic builds the fifth subrepo in the arcade. **Nothing here is a new
invention** — Battlezone inherits the architecture tempest proved and
star-wars refined. **star-wars is the direct blueprint** (it is the 3D
sibling: same Math Box, same first-person wireframe render problem); epic A's
context (`sprint/context/context-epic-A.md`) is the freshest precedent for the
bootstrap/wiring story shape. Where this document is silent, do what
star-wars does.

### Architecture: the hard core/shell boundary (non-negotiable)

Identical to tempest, star-wars, and asteroids:

```
battlezone/
├── src/
│   ├── core/            # PURE, unit-tested, no DOM/canvas
│   │   ├── state.ts     # GameState (player tank, hostile, saucer, shells, score, lives, rng)
│   │   ├── sim.ts       # stepGame(state, input, dt) → state
│   │   ├── input.ts     # Input type (left/right tread sticks, fire — abstracted)
│   │   ├── rng.ts       # seeded PRNG (deterministic) — copy star-wars pattern
│   │   ├── math3d.ts    # the Math Box — PORTED from star-wars/src/core/math3d.ts
│   │   ├── models.ts    # 3D wireframe model tables (tanks, missile, saucer, obstacles)
│   │   ├── obstacles.ts # the 21 fixed obstacles — ROM-table positions/orientations
│   │   ├── radar.ts     # pure derivation: enemy bearing/range → scanner blips
│   │   └── …            # enemies.ts, scoring.ts etc. as stories require
│   ├── shell/           # IO: render.ts, input.ts, loop.ts, audio.ts, storage.ts, font.ts
│   └── main.ts          # bootstrap: canvas + wire shell ↔ core
├── tests/               # Vitest suites against the pure core
├── reference/           # GITIGNORED — disassembly quarry (see below)
├── index.html
└── vite.config.ts       # base '/battlezone/', port 5276, strictPort
```

`core/` must NEVER: import from `shell/`; touch DOM/window/canvas; call
`Date.now()`, `performance.now()`, `Math.random()`, or `requestAnimationFrame`.
All time enters as `dt`; all randomness comes from the seeded RNG carried in
`GameState`. `stepGame(state, input, dt) → state` is identical-in →
identical-out. TDD (Vitest) on the core; the shell is verified by running the
game.

### The Math Box ruling: port, don't share

`star-wars/src/core/math3d.ts` is a single-file, pure vec3/mat4 pipeline
(row-major `Mat4`, right-handed, looking down −Z, perspective divide on
transform) with its own test suite. **bz1-1 copies the file and its tests
into `battlezone/src/core/` unchanged**, provenance noted in a header comment.
Do NOT create a shared library — CLAUDE.md says extraction waits until
duplication is proven across games, and that call belongs to a dedicated
future story (the PM ruling in the design brief: extract with *real*
knowledge of what is identical vs game-specific). Battlezone will diverge
where its needs differ (ground-plane world, radar projection); divergence in
a ported copy is evidence for the future extraction story, not a defect.

### The planar-sim ruling: the world is flat, the render is 3D

Mirror the original hardware's split. Battlezone's game world is a **flat
2D plane**: every entity is `(x, z, heading)` — the sim never needs a y
coordinate (shells fly level from the cannon; nothing leaves the ground
except the saucer's fixed hover height, a render offset). Therefore:

- **`core/` simulates in 2D planar space:** movement, dual-tread kinematics,
  collision (obstacle circles, shell hits), line-of-sight, spawn logic, and
  radar bearings are all planar geometry — cheap to test, no matrices needed.
- **The 3D-ness lives at the render boundary:** entities project to wireframe
  via the Math Box (model transform from `(x, z, heading)` + camera from the
  player tank's pose). This is exactly what the arcade Math Box did — the
  6502 ran a flat game; the co-processor did display math.
- Model-space wireframes (`models.ts`) and their projection are still pure
  `core/` code (as in star-wars) — the *shell* only strokes projected lines.

### Toolchain (identical to siblings)

TypeScript strict, ES modules, Vite 8, Vitest 4. `package.json` scripts match
star-wars verbatim: `dev`, `build` (`tsc --noEmit && vite build`), `test`
(`vitest run --passWithNoTests`), `test:watch`, `lint`.

`vite.config.ts` mirrors star-wars with three substitutions: `base:
'/battlezone/'`, `server.port: 5276`, `preview.port: 5276`. Keep `strictPort:
true` and `allowedHosts: ['arcade.slabgorb.com']` on both server and preview
(the Cloudflare tunnel forwards that Host header).

### Arcade wiring (story bz1-1)

bz1-1 is the keystone and has the same bootstrap wrinkle as A-1: the
`battlezone/` directory does not exist when the story starts. bz1-1 therefore
begins at the orchestrator: `git init` the subrepo (default branch `develop`,
gitflow, remote `github.com/slabgorb/battlezone` when created), add it to the
orchestrator's `.gitignore`, register it in `.pennyfarthing/repos.yaml` (copy
the star-wars entry shape), wire `just serve` + `just install-all`, add the
lobby tile, and add the `/battlezone/*` → `:5276` ingress rule under
`cloudflared/` per `cloudflared/README.md`. **Port 5276 is the next free pin**
(lobby 5270, tempest 5273, star-wars 5274, asteroids 5275 — bz1 originally
claimed 5275 and lost it to epic A; do not reintroduce it). bz1-1 also
performs the math3d port (see ruling above).

### Fidelity bar (applies to every story, not a polish phase)

The epic was committed as **full-faithful up front**: each story ships
ROM-accurate behavior for its slice. The authority chain for game constants:

1. `reference/` quarry — 6502disassembly.com Battlezone disassembly
   (https://6502disassembly.com/va-battlezone/): 6502 code listing, vector
   bytecode, 3D object/vertex specs, Math Box internals, rev1/rev2 diffs
2. Published analyses of the disassembly
3. Observed behavior in footage / MAME — for feel calibration only (bz1-12)

Known ROM facts already established (bz1-2 verifies and expands these against
the quarry; stories must honor them):

- **Scoring:** slow tank **1000** · missile **2000** · super tank **3000** ·
  saucer **5000**
- **Spawn rule:** always exactly **one hostile unit** on the battlefield;
  a replacement spawns when the current one dies. The saucer is a bonus
  visitor, not the hostile.
- **Score-threshold introduction:** missiles enter at a DIP-selectable
  threshold (5K–30K) — pin one authentic default and document it (no
  coin-op DIP menu). Saucers appear from **2000 pts**.
- **Difficulty:** enemy aggression scales with score differential — ratchet
  **up to** the ROM curve, never past it (standing arcade rule).
- **Obstacles:** **21 fixed obstacles** (pyramids/blocks) at ROM-table
  positions and orientations; they block movement and shells, but do NOT
  appear on radar. The ROM's missing spawn-collision check (enemies can
  spawn inside obstacles) is a **known defect we deliberately do not
  replicate** — log as a deviation in bz1-7, not silently.
- **Radar:** shows enemy bearing only — obstacles and saucers are invisible
  to it. Objects render within a **45° visibility cone**; the background
  horizon spans **90° FOV**.
- **Display:** original is X-Y vector, ~1024×768 addressable, relative-move
  bytecode; ours is Canvas 2D glowing green wireframe on black.
- **Sound:** POKEY (4 voices) plus **discrete** circuits for engine rumble,
  cannon, and explosion — bz1-11 approximates; document sources in
  `reference/README.md`.
- **Framing:** cracked-glass viewport overlay, gunsight reticle, horizon
  with mountains, erupting volcano, and crescent moon.

### The reference/ quarry

Gitignored, with a `README.md` explaining provenance and how to refresh —
copy the star-wars convention. bz1-2 is the quarry story: it distills the
disassembly into a committed findings doc (the tempest/star-wars playbook)
and ports obstacle tables, 3D vertex specs, and difficulty constants into
`core/` as typed TypeScript data with the quarry as cited source. **The
quarry lives only in the checkout that created it** (lesson from star-wars
and asteroids) — extracted data must land in committed `core/` source so no
other checkout needs the quarry.

### Cross-story constraints and guardrails

- **Determinism is a standing AC:** every story's tests drive the core with a
  fixed RNG seed and fixed dt; no story may introduce wall-clock or
  `Math.random()` into `core/`.
- **Planar world space:** positions are 2D `(x, z)` world coordinates on an
  unbounded plain; collision and line-of-sight are computed in world space,
  never screen pixels. The 3D projection is render-side only (see ruling).
- **Rendering:** Canvas 2D glowing vector lines on black. Battlezone's
  arcade palette is green wireframe (the original used a green-tinted
  overlay for the horizon band and red for score text) — bz1-12 trues up the
  bichromatic framing; earlier stories use the sibling games' default glow.
- **No engines, no backend:** no game/physics engine, no networking. High
  scores in `localStorage`, lobby wiring included.
- **Story order is dependency order:** bz1-1 (bootstrap) → bz1-2 (findings)
  → bz1-3 (render foundation) → bz1-4 (movement) → bz1-5 (firing) → bz1-6
  (radar) → bz1-7 (enemy tanks) → bz1-8 (missiles/super tanks) → bz1-9
  (saucer) → bz1-10 (difficulty/scoring/attract) → bz1-11 (audio) → bz1-12
  (HUD fidelity + live playtest capstone). bz1-8/9 depend on bz1-7's hostile
  lifecycle; bz1-10 depends on the full roster for its ratchet.
- **Descopes (locked in the design brief):** no coin-op mechanics (no
  "insert 2 coins", no quarter-pressure attract); difficulty capped at the
  ROM ceiling; spawn-in-obstacle ROM bug not replicated.
- **Gitflow:** PRs target `develop`, squash-merge; branch naming
  `feat/{story}-{description}` etc. Sprint ceremony stays at the orchestrator.
- **Workflow reminder:** merge PRs before `pf sprint story finish` and verify
  the merge landed on `origin/develop` (known toolchain gotcha).

### Planning Documents

| Document | Location | Role |
|----------|----------|------|
| Battlezone disassembly hub | https://6502disassembly.com/va-battlezone/ | Primary quarry (rev1/rev2 ROM) |
| Epic design brief | `docs/superpowers/specs/2026-07-03-battlezone-bz1-epic-design.md` | Scope, story map, naming/port decisions |
| star-wars CLAUDE.md | `star-wars/CLAUDE.md` | Architecture blueprint to copy |
| star-wars Math Box | `star-wars/src/core/math3d.ts` | The file bz1-1 ports (with its tests) |
| Epic A context | `sprint/context/context-epic-A.md` | Sibling bootstrap precedent (A-1 shape) |
| Arcade CLAUDE.md | `CLAUDE.md` (orchestrator root) | Serving/ports/tunnel canon |
| cloudflared README | `cloudflared/README.md` | Ingress apply procedure (bz1-1) |
| repos.yaml | `.pennyfarthing/repos.yaml` | Subrepo registration shape (bz1-1) |

---
_Generated by `pf context create epic bz1` from the sprint YAML._
_Enriched by Architect (Maude): architecture, Math Box + planar-sim rulings, fidelity bar, and cross-story guardrails._
