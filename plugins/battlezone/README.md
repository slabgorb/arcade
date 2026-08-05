# Battlezone

A faithful, browser-based clone of Atari's 1980 vector arcade game *Battlezone*
— the first-person 3D wireframe tank duel on a flat plain.

**▶ Play it live: [battlezone.slabgorb.com](https://battlezone.slabgorb.com)**

![Battlezone gameplay — first-person wireframe view across the plain, obstacles under the mountain horizon and the green radar scanner](https://arcade-assets.slabgorb.com/battlezone/screenshot.png)

You steer a tank with two independent treads, aim through a fixed gunsight,
and watch a green radar scanner for the next hostile. Glowing wireframe
vectors on black, rendered with HTML5 Canvas 2D — no 3D engine, no physics
engine, no backend. The game is a **deterministic pure simulation core** (the
ported Atari "Math Box", now shared at `@shared/math3d`) wrapped by a thin
input/render shell — the same architecture as its siblings,
[tempest](../tempest) and [star-wars](../star-wars).

> **Status:** Shipped and live at **v1.0.3**. The 3D render foundation,
> dual-tread movement, firing, radar, the full enemy roster (slow tank, guided
> missile, super tank), the bonus saucer, the difficulty ratchet,
> lives/attract mode, audio and the 15.625 Hz ROM timebase are all in.

---

## Quick start

**battlezone is a plugin inside the arcade monorepo — it is not a standalone
repo and has no build, dev-server or test commands of its own.** Its
`package.json` is a three-field stub (name/version/private); the repository root
owns every tool. Run everything from the **monorepo root**:

```bash
npm install                              # once, for the whole cabinet
npx vitest run --project battlezone      # battlezone's suite: 72 files / 1038 tests
npx vitest run                           # the whole cabinet
npm run lint                             # tsc --noEmit across the monorepo
npm run test:orchestrator                # the root node:test suite
```

> **Open battlezone in a browser with `just serve`, from the monorepo root.** One
> Vite dev server holds the whole cabinet on `http://127.0.0.1:5270/` — the lobby
> at `/` and this game at `/battlezone/`, served from these plugin sources, so a
> dev URL and a production URL differ only in origin. mg1-2 landed that; the
> per-plugin dev server and battlezone's old private port (5276) are gone with it.
>
> Unknown paths still fall back to the lobby's SPA shell, which is why an
> all-`200` sweep proves nothing — a fallback answers 200 to everything. A check
> that means something compares a game path against a nonsense control and
> asserts they DIFFER, which is what `tests/canonical-serve.test.mjs` pins. Hot
> reload does not reach the games; refresh the browser (mg1-14).

---

## Controls

Two mappings drive the same tread axes — use whichever feels natural.

| Action | Arcade (dual-stick) | Friendly (arrows) |
|--------|----------------------|--------------------|
| Left tread forward / back | **E / D** | — |
| Right tread forward / back | **I / K** | — |
| Drive forward / back | — | **↑ / ↓** |
| Pivot left / right | — | **← / →** |
| Fire | **Space** or **F** | **Space** or **F** |

Both treads forward drives straight; opposed treads pivot in place — the
authentic Battlezone differential-drive feel.

---

## Gameplay

- **Dual-tread steering.** Forward speed comes from the sum of both treads,
  turn rate from their difference — a real differential drive, not an
  arcade-generic tank control scheme.
- **Always one hostile.** The moment one enemy is destroyed, the next spawns
  immediately — there is no gap in the fight.
- **Enemy roster.** The slow tank (1000 pts) is joined by the guided missile
  (2000 pts) and the super tank (3000 pts) as your score climbs.
- **Radar scanner.** A green sweep shows hostile bearing and range within its
  cone; the 21 static obstacles never appear on it.
- **The plain.** 21 ROM-positioned obstacles — pyramids and boxes — dot a flat
  plain under a mountain horizon, volcano, and moon.

---

## Architecture

Split into a **pure simulation core** and a thin **IO shell**. This boundary is
the most important rule in the codebase.

```
src/
├── core/              # PURE, deterministic, unit-tested — no DOM/canvas
│   ├── camera.ts      # TankPose, view/projection setup
│   ├── scene.ts       # world → NDC wireframe projector
│   ├── models.ts      # ROM-decoded 3D wireframe models
│   ├── movement.ts    # dual-tread differential-drive kinematics
│   ├── obstacles.ts   # the 21 ROM-positioned obstacles
│   ├── horizon.ts     # skyline / mountains / volcano / moon
│   ├── volcano.ts     # the erupting-volcano particle emitter
│   ├── firing.ts      # player shell projectile + line-of-sight
│   ├── enemies.ts     # roster spawn/AI/hit/explosion/scoring
│   ├── saucer.ts      # the bonus saucer
│   ├── debris.ts      # explosion debris
│   ├── radar.ts       # radar contacts + sweep
│   ├── difficulty.ts  # the ROM difficulty ratchet
│   ├── timebase.ts    # the 15.625 Hz ROM game-frame clock
│   ├── scoring.ts     # point values
│   ├── screens.ts     # attract / game-over / initials screen text
│   ├── alerts.ts      # in-game alert lines
│   ├── text.ts        # message strings
│   ├── events.ts      # sim → shell event stream
│   ├── sim.ts         # the whole game as one stepped GameState
│   ├── state.ts       # GameState shape + initGame
│   └── input.ts       # Input type (tread axes)
├── shell/             # IO: input.ts (KeyboardTreads), render.ts, glow.ts,
│                      # font.ts, audio.ts + audio-dispatch.ts, and pause.ts /
│                      # viewport.ts — local wrappers over the shared modules
└── main.ts            # bootstrap: canvas + wire shell ↔ core
```

Three pure modules that used to live here — the Math Box (`core/math3d.ts`), the
seeded PRNG (`core/rng.ts`) and the high-score table + storage seam
(`core/highscore.ts` + `shell/storage.ts`) — were extracted to the arcade's
shared library and are consumed as `@shared/math3d`, `@shared/rng` and
`@shared/highscore`. `tests/scaffold.test.ts`, `tests/rng-extraction.test.ts` and
`tests/highscore-extraction.test.ts` assert the local copies stay gone.

**The core is pure and deterministic.** It never imports from `shell/`, never
touches the DOM/`window`/`canvas`, and never calls `Date.now()`,
`performance.now()`, `Math.random()`, or `requestAnimationFrame`. All time
enters as `dt`; all randomness comes from a seeded RNG carried in the state.
The render camera *is* the tank's own pose (turret forward-locked), so the
world projection follows the tank for free.

---

## Reference material

Authentic data — the entity roster and scoring, the obstacle table, 3D vertex
specs, the difficulty curve, and radar rules — is ported from the commented
disassembly of the original cabinet, distilled in
[`docs/battlezone-1980-source-findings.md`](docs/battlezone-1980-source-findings.md).
The disassembly quarry itself is kept locally under `reference/` (gitignored)
— never committed.

---

## Tech stack

- **Language:** TypeScript (ES modules, strict mode — via the root `tsconfig.json`)
- **Build tool:** [Vite](https://vitejs.dev/), configured once at the monorepo root
- **Tests:** [Vitest](https://vitest.dev/) — TDD on the pure core; battlezone is
  the `battlezone` project in the root `vitest.config.ts`
- **Rendering:** HTML5 Canvas 2D (`shadowBlur` for the vector-CRT glow)

---

## Development

Every command runs from the **monorepo root**, not from this directory.

| Command | What it does |
|---------|--------------|
| `npx vitest run --project battlezone` | Run battlezone's suite once (72 files / 1038 tests) |
| `npx vitest --project battlezone` | The same suite in watch mode |
| `npx vitest run` | Run the whole cabinet |
| `npm run lint` | `tsc --noEmit` over the monorepo, battlezone included |
| `npm run test:orchestrator` | The root `node:test` suite |

Build this game with `node scripts/build-app.mjs battlezone` (→ `dist/battlezone/`)
from the repo root; there is no per-plugin `dev`, `build`, `preview`, `test` or
`lint` script — the root owns the whole toolchain.

---

## License

Private project, for personal/educational use. *Battlezone* and *Atari* are
trademarks of their respective owners; this is an educational clone built to
learn how the original worked.

## Releasing

Battlezone no longer has a release pipeline of its own. It used to be a separate
gitflow repo shipped by `just release battlezone` — feature branches onto
`develop`, a `--no-ff` merge to `main`, a bare `vX.Y.Z` tag, and a per-repo
`.github/workflows/deploy.yml` that uploaded `dist/` to the `arcade-battlezone`
R2 bucket on every push to `main`. All of that was removed when battlezone was
imported into the [arcade monorepo](https://github.com/slabgorb/arcade) as
`plugins/battlezone`: no `develop` branch, no per-repo CI, no bucket of its own.

The last standalone release was **v1.0.3** (`413bb0c` on the old `develop`); the
pre-monorepo history is parked at `.migration-backup/battlezone.git`. The monorepo
now ships the cabinet through one pipeline: `just release battlezone` from the repo
root gates + bumps `plugins/battlezone/package.json` + the generated registry,
tags **`battlezone-vX.Y.Z`**, and that tag triggers the CI deploy into the shared
`arcade-lobby` bucket under `battlezone/`. See
[`docs/ops/hosting.md`](../../docs/ops/hosting.md).
