# Asteroids

A faithful, browser-based clone of Atari's 1979 vector arcade game *Asteroids*.

**▶ Play it live: [asteroids.slabgorb.com](https://asteroids.slabgorb.com)**

![Asteroids gameplay — the vector ship among drifting rocks as a saucer crosses the field](https://arcade-assets.slabgorb.com/asteroids/screenshot.png)

You pilot a ship adrift in a toroidal field of drifting rocks — rotate, thrust,
and fire to break large rocks into smaller ones before they (or a roaming
saucer) get you. Glowing vector lines on black, rendered with HTML5 Canvas 2D —
no physics engine, no backend.

> **Status:** Shipped and live, at **v1.0.14**. Flight, firing, asteroid
> splitting, wave spawning, both saucers, aimed fire, hyperspace,
> lives/respawn, attract mode, the ROM-exact shape/velocity tables, scoring,
> high scores, pause, and sound are all in.

---

## Where this lives

Asteroids is **not a standalone repo any more.** It is a plugin inside the
[arcade](https://github.com/slabgorb/arcade) monorepo, at `plugins/asteroids/`.
There is no per-game `package.json` toolchain, no per-game `vite.config.ts`, no
per-game `.github/workflows/deploy.yml` — the repo root owns all three. The
shared library it used to consume as the pinned git dependency `@arcade/shared`
is now `src/shared/` at the root, reached through the **`@shared/*`** alias.

## Quick start

Everything runs **from the repo root**, not from this directory:

```bash
npm install                            # installs the whole cabinet, once
npx vitest run --project asteroids     # asteroids' suite: 44 files / 823 tests
npm run lint                           # tsc --noEmit across the monorepo
```

> **Open asteroids in a browser with `just serve`, from the monorepo root.** One
> Vite dev server holds the whole cabinet on `http://127.0.0.1:5270/` — the lobby
> at `/` and this game at `/asteroids/`, served from these plugin sources, so a
> dev URL and a production URL differ only in origin. mg1-2 landed that, and
> `scripts/build-app.mjs` builds the game for production; the per-plugin dev
> server and asteroids' old private port went with the migration.
>
> Unknown paths still fall back to the lobby's SPA shell, which is why an
> all-`200` sweep proves nothing — a fallback answers 200 to everything. A check
> that means something compares a game path against a nonsense control and
> asserts they DIFFER, which is what `tests/canonical-serve.test.mjs` pins. Hot
> reload does not reach the games; refresh the browser (mg1-14).

---

## Controls

| Action | Control |
|--------|---------|
| Rotate left / right | **← / →** or **A / D** |
| Thrust | **↑** or **W** |
| Fire | **Space** or **K** |
| Hyperspace | **↓**, **S**, or **Shift** |

---

## Gameplay

- **Toroidal playfield.** Ship, rocks, bullets, and the saucer all wrap at the
  screen edges — there is no wall, just a seam.
- **Inertial flight.** The ship rotates and thrusts with drag, faithful to the
  ROM's flight model — no instant stops, no strafing.
- **Splitting rocks.** Large rocks break into two mediums, mediums into two
  smalls, each inheriting velocity plus spread. Rocks never rotate — only the
  ship has a facing (ROM-confirmed).
- **Wave director.** Each wave spawns four rocks plus two more per wave
  cleared, capped at eleven, placed clear of the ship.
- **The large saucer.** Spawns on a countdown, crosses the field weaving
  vertically, and fires at random headings.
- **Scoring.** 20 / 50 / 100 points for large / medium / small rocks, with the
  score rolling over at 99990 and a bonus ship every 10000 points.

---

## Architecture

Asteroids is split into a **pure simulation core** and a thin **IO shell**.
This boundary is the most important rule in the codebase.

```
src/
├── core/              # PURE, deterministic, unit-tested — no DOM/canvas
│   ├── state.ts       # GameState type, world bounds
│   ├── sim.ts         # stepGame(state, input, dt) → state
│   ├── ship.ts        # flight model (rotate/thrust/inertia/drag)
│   ├── bullet.ts      # firing, lifetime, 4-shot cap
│   ├── rocks.ts       # asteroid entities, drift, splitting
│   ├── saucer.ts      # large/small saucer spawn + movement + fire
│   ├── waves.ts       # wave director (spawn counts/timing/placement)
│   ├── score.ts       # scoring + bonus-ship rules
│   ├── lives.ts       # death, respawn, bonus ships
│   ├── hyperspace.ts  # the jump + its return odds
│   ├── bounds.ts      # toroidal wrap math
│   ├── events.ts      # the core → shell event stream (audio cues)
│   └── input.ts       # Input type
├── shell/             # IO: render, input, audio, glow, font, margin
└── main.ts            # bootstrap: canvas + wire shell ↔ core
```

The seeded PRNG and the fixed-timestep game loop are **not** here — they were
extracted to the shared library (SH-3 / SH-5) and are imported as
`@shared/rng` and `@shared/loop`. Same for the stroke font, the glow
primitive, the audio engine, the high-score table, the pause gate and the
viewport fit. `tests/rng-extraction.test.ts` and `tests/loop-extraction.test.ts`
guard that no local copy comes back.

**The core is pure and deterministic.** It never imports from `shell/`, never
touches the DOM/`window`/`canvas`, and never calls `Date.now()`,
`performance.now()`, `Math.random()`, or `requestAnimationFrame`. All time
enters the core as `dt`; all randomness comes from a seeded RNG carried in the
game state. `stepGame(state, input, dt)` produces identical output for
identical input — which is exactly what makes the game unit-testable and
frame-rate independent.

---

## Reference material

The authentic shape tables and velocities were ported from the commented
disassembly of the original cabinet (story A-17) and live in `reference/` as
typed data — `reference/shapes.ts` and `reference/velocities.ts`, which **are**
committed, because they are derived numeric tables rather than the copyrighted
source. The raw disassembly quarry itself is never committed; this directory's
`.gitignore` ignores everything under `reference/` and re-includes only the
`.ts` tables.

---

## Tech stack

- **Language:** TypeScript (ES modules, strict mode)
- **Build tool:** [Vite](https://vitejs.dev/)
- **Tests:** [Vitest](https://vitest.dev/) — TDD on the pure core
- **Rendering:** HTML5 Canvas 2D (`shadowBlur` for the vector-CRT glow)

---

## Development

All of these run **from the repo root**. `plugins/asteroids/package.json` is now
a three-field manifest (name, version, private) with no scripts of its own — the
old `npm run dev` / `build` / `preview` / `test` inside this directory are gone,
along with the `vite.config.ts` that pinned port 5275.

| Command | What it does |
|---------|--------------|
| `npx vitest run --project asteroids` | Run just asteroids' suite (44 files / 823 tests) |
| `npx vitest run` | Run the whole cabinet's suite |
| `npm run lint` | `tsc --noEmit` across the monorepo, this game included |
| `npm run test:orchestrator` | The root's `node --test` suite |

Build this game with `node scripts/build-app.mjs asteroids` (→ `dist/asteroids/`)
from the repo root; there is no per-plugin `build` script — the root owns the
toolchain.

---

## License

Private project, for personal/educational use. *Asteroids* and *Atari* are
trademarks of their respective owners; this is an educational clone built to
learn how the original worked.

## Releasing

The standalone `develop` → `main` → `vX.Y.Z` flow is **retired**, along with this
game's own `.github/workflows/deploy.yml`. Releases now run from the repo root
with **`just release asteroids`**: `scripts/release.mjs` gates on this app's
vitest project and build, bumps `plugins/asteroids/package.json` (the version of
record, currently **1.0.14**, carried over from the last standalone release) plus
the generated registry, then tags **`asteroids-vX.Y.Z`** and pushes — and that
tag is what triggers the CI deploy into the shared `arcade-lobby` bucket under
`asteroids/`. See [`docs/ops/hosting.md`](../../docs/ops/hosting.md).

The pre-migration git history is not in this repo. It is parked at
`.migration-backup/asteroids.git` in the orchestrator checkout, and remains on
GitHub at `slabgorb/asteroids` (`develop` = `38795fb`, `v1.0.14`).
