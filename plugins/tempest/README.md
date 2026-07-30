# Tempest

A faithful, browser-based clone of Atari's 1981 vector arcade game *Tempest*.

**▶ Play it live: [tempest.slabgorb.com](https://tempest.slabgorb.com)**

![Tempest gameplay — the Claw rounding a square tube while cyan Flippers climb the lanes from the far rim](https://arcade-assets.slabgorb.com/tempest/screenshot.png)

You control the **Claw** (blaster) riding the near rim of a geometric tube,
spinning around it to shoot enemies that climb up the lanes from the far end.
Glowing vector lines on black, rendered with HTML5 Canvas 2D — no physics
engine, no 3D engine, no backend.

> **Status:** In active development. The playable slice and full enemy roster,
> 16 cycling tube geometries, the level-end warp, scoring, lives, attract mode,
> and local high scores are in place; audio and visual polish are landing now.

---

## Quick start

`plugins/tempest/` is no longer its own toolchain — `package.json` here is a bare
`{name, version, private}` stub, and there is no `vite.config.ts` and no lockfile.
The repo root owns install, dev-serve and test for the whole cabinet. Run these
from the **repo root**, not from inside `plugins/tempest/`:

```bash
npm install                         # installs the whole cabinet — no per-app npm install
npm test                            # vitest across every project, tempest included
npx vitest run --project tempest    # this app's tests only
```

> **You cannot run tempest in a browser right now.** Neither a root dev server nor
> a root build reaches this app yet — both land in a later stage of the monorepo
> migration, and the old per-game `npm run dev` / port 5273 are gone. `npx vite` at
> the root serves the **lobby only**: root `vite.config.ts` sets `root: lobby`, so
> `/tempest/` falls back to the lobby's `index.html` (as does any other path — a
> control request to `/banana/` returns exactly the same page). `npm run build` is
> likewise not wired for tempest. Until then, tempest is exercised through its test
> suite, not by loading it.

For prerequisites and troubleshooting, see **[INSTALLATION.md](INSTALLATION.md)**.

---

## Controls

| Action | Control |
|--------|---------|
| Rotate the Claw | **Mousewheel** (the spinner/dial), or **← / →** arrow keys |
| Fire | **Hold left mouse button**, or **hold Space** (both auto-fire while held) |
| Start / restart | **Click**, or press **Enter** |

The mousewheel emulates the original arcade rotary spinner and is the primary
control. Arrow keys are a keyboard fallback.

---

## Gameplay

- **Lane-based movement.** The Claw snaps between the lanes of a closed tube.
  Positions are *tube space* — `{ laneIndex, depth }` where `depth` runs from
  `0` (far) to `1` (near) — not screen pixels.
- **The enemy roster.** Flippers, Tankers, Spikers (which lay spikes), Fuseballs,
  and Pulsars, each with its own behavior.
- **Spikes & the warp.** Clearing a level launches the Claw down the tube; spikes
  left in your lane are lethal during the warp.
- **16 geometries.** Tube shapes and colors cycle as you advance, with a rising
  difficulty ramp.
- **Arcade framing.** Score, extra lives, attract/title screen, and a local
  high-score table persisted in `localStorage`.

---

## Architecture

Tempest is split into a **pure simulation core** and a thin **IO shell**. This
boundary is the most important rule in the codebase.

```
src/
├── core/              # PURE, deterministic, unit-tested — no DOM/canvas
│   ├── geometry.ts    # tube definitions, projection math
│   ├── state.ts       # GameState type
│   ├── sim.ts         # stepGame(state, input, dt) → state
│   ├── input.ts       # Input type
│   ├── events.ts      # GameEvents drained by the shell
│   ├── rules.ts       # scoring, difficulty, spawn tables
│   └── enemies/       # per-type state machines (flipper, tanker, …)
├── shell/             # IO: render.ts, input.ts, audio.ts, fx.ts, loop.ts, glow.ts
├── tools/             # contactSheet.ts — the models.html dev tool
└── main.ts            # bootstrap: canvas + wire shell ↔ core
```

The seeded PRNG, the high-score table, the vector font, the fixed-timestep loop
kernel and the pause gate are **not** here — they live in the monorepo's shared
library at `src/shared/`, imported through the `@shared/*` alias.

**The core is pure and deterministic.** It never imports from `shell/`, never
touches the DOM/`window`/`canvas`, and never calls `Date.now()`,
`performance.now()`, `Math.random()`, or `requestAnimationFrame`. All time enters
the core as `dt`; all randomness comes from a seeded RNG carried in the game
state. `stepGame(state, input, dt)` produces identical output for identical
input — which is exactly what makes the game unit-testable and frame-rate
independent.

---

## Tech stack

- **Language:** TypeScript (ES modules, strict mode)
- **Build tool:** [Vite](https://vitejs.dev/)
- **Tests:** [Vitest](https://vitest.dev/) — TDD on the pure core
- **Rendering:** HTML5 Canvas 2D (`shadowBlur` for the vector-CRT glow)

---

## Development

All of these run from the **repo root** — there are no per-app scripts.

| Command | What it does |
|---------|--------------|
| `npm run lint` | Type-check the whole monorepo (`tsc --noEmit`) |
| `npm test` | Run the Vitest suite once, across every project |
| `npx vitest run --project tempest` | Run only tempest's suite |
| `npm run test:watch` | Run Vitest in watch mode |

`npx vite` is deliberately absent from that table: it starts, but it serves the
lobby at every path — see the Quick start note. Nothing here launches tempest in a
browser yet.

### Testing

The pure core is developed test-first with Vitest. Tests live under `tests/core/`
(geometry, each enemy state machine, collisions, scoring, level transitions, warp)
and `tests/shell/` (loop, input, audio, and source-wiring checks on render/fx).
The standing convention is that the shell's render/input/audio is verified by
**running the game** — which you cannot do from this repo until the migration
wires a dev server, so shell changes currently rest on the source-wiring tests
alone. Weigh that before landing one.

```bash
npx vitest run --project tempest              # full tempest suite
npx vitest run --project tempest geometry     # a single file or pattern
```

---

## License

Private project. *Tempest* is a trademark of its respective owners; this is an
educational clone.

## Releasing

Tempest ships as part of the `arcade` monorepo, not as its own repo. Release tags
are `tempest-vX.Y.Z` — a bare `vX.Y.Z` is invalid here, since this monorepo holds
every app's tags side by side. There is no longer a per-game
`.github/workflows/deploy.yml`. See the root `justfile`'s `release` / `release-all`
recipes and `docs/ops/hosting.md` for the current release and R2 deploy path.
