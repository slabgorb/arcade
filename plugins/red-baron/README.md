# Red Baron

A faithful, browser-based clone of Atari's 1980 vector arcade game *Red Baron*
— the first-person WWI biplane dogfight over a vector landscape.

**▶ Play it live: [red-baron.slabgorb.com](https://red-baron.slabgorb.com)**

Banking flight, a tilting horizon, mountains, balloons, and ground targets —
glowing vector lines on black, rendered with HTML5 Canvas 2D. No 3D engine, no
physics engine, no backend. Battlezone's hardware twin (same Math Box / AVG
lineage), built as a **deterministic pure simulation core** wrapped by a thin
input/render shell — the same architecture as its siblings
[battlezone](../battlezone), [star-wars](../star-wars) and
[tempest](../tempest).

> **Status:** Live at **v0.0.23**. All four epics have shipped: the flight
> foundation and ROM-faithful flight model (rb1), aerial combat — enemy
> biplanes, dogfight AI, machine guns, waves, blimps (rb2), the ground sequence
> (rb3), and a full ROM-fidelity pass against the original 1980 Atari source
> (rb4). Per its own CHANGELOG it is still the newest cabinet in the arcade and
> not yet feature-complete against the original.

---

## Quick start

**red-baron is a plugin inside the arcade monorepo — it is not a standalone repo
and has no build, dev-server or test commands of its own.** Its `package.json`
is a three-field stub (name/version/private); the repository root owns every
tool. Run everything from the **monorepo root**:

```bash
npm install                             # once, for the whole cabinet
npx vitest run --project red-baron      # red-baron's suite: 81 files / 1346 tests (+1 todo)
npx vitest run                          # the whole cabinet
npm run lint                            # tsc --noEmit across the monorepo
npm run test:orchestrator               # the root node:test suite
```

> **Open red-baron in a browser with `just serve`, from the monorepo root.** One
> Vite dev server holds the whole cabinet on `http://127.0.0.1:5270/` — the lobby
> at `/` and this game at `/red-baron/`, served from these plugin sources, so a
> dev URL and a production URL differ only in origin. mg1-2 landed that; the
> per-plugin dev server and red-baron's old private port (5277) are gone with it.
>
> Unknown paths still fall back to the lobby's SPA shell, which is why an
> all-`200` sweep proves nothing — a fallback answers 200 to everything. A check
> that means something compares a game path against a nonsense control and
> asserts they DIFFER, which is what `tests/canonical-serve.test.mjs` pins. Hot
> reload does not reach the games; refresh the browser (mg1-14).

---

## Architecture

```
src/
├── core/                    # PURE, deterministic, unit-tested — no DOM/canvas
│   ├── flight.ts            # the ROM flight model (pot-yoke turn, pitch table, bank)
│   ├── camera.ts            # view/projection setup, built on @shared/math3d
│   ├── scene.ts             # world → screen vector projector
│   ├── horizon.ts           # the tilting horizon
│   ├── landscape.ts         # mountains and terrain
│   ├── topology.ts          # ROM-decoded landscape/target picture data
│   ├── biplane.ts           # ROM-decoded biplane vertex/edge model
│   ├── prop.ts              # the spinning propeller
│   ├── enemy.ts             # enemy biplane spawn + dogfight AI
│   ├── returning-ace.ts     # the returning-plane ROM behaviour
│   ├── waves.ts             # wave composition and pacing
│   ├── blimp.ts             # the balloon/blimp target
│   ├── ground-targets.ts    # ground installations
│   ├── ground-collision.ts  # terrain collision
│   ├── guns.ts              # machine-gun fire + overheat
│   ├── explosion.ts         # explosions
│   ├── wreck-render.ts      # the tumbling wreck
│   ├── windscreen.ts        # cockpit windscreen framing
│   ├── screen.ts            # display-space transform
│   ├── hud-font.ts          # HUD readout laid out through @shared/font
│   ├── scoring.ts           # point values
│   ├── score-countup.ts     # the end-of-life score roll
│   ├── lives.ts             # lives
│   ├── eol.ts               # end-of-life sequencing
│   ├── timing.ts            # the ROM calc-frame cadence
│   └── events.ts            # sim → shell event stream
├── shell/                   # IO: audio.ts + audio-dispatch.ts, pokey.ts
├── tools/                   # offline ROM-model comparison + contact sheets
└── main.ts                  # bootstrap: canvas, input, rAF loop, render, HUD
```

Note the unusually thin `shell/`: red-baron keeps only its audio there. Canvas
setup, keyboard input, the rAF loop and all drawing live in `main.ts`.

Red Baron was the arcade's **first native shared-library consumer** — it never
ported a local Math Box or PRNG. The game consumes `@shared/math3d`,
`@shared/rng`, `@shared/font`, `@shared/synth`, `@shared/pause` and
`@shared/esc-overlay` from the in-repo library at `src/shared` (the offline
contact-sheet tool also uses `@shared/glow`). `tests/scaffold.test.ts` asserts a
local `src/core/math3d.ts` stays gone.

**red-baron persists no high scores.** No module under `src/` imports
`@shared/highscore` or touches `localStorage`, and there is no storage seam to
hang one on — this is a known limitation against the ROM's `NW.HSC`, not an
oversight. (`docs/audit/coverage-review.md` claims "We use
`@arcade/shared/highscore`" in that row; that line is stale and has never been
true of the code.)

**The core is pure and deterministic.** It never imports from `shell/`, never
touches the DOM/`window`/`canvas`, and never calls `Date.now()`,
`performance.now()`, `Math.random()`, or `requestAnimationFrame`. All time
enters as `dt`; all randomness comes from a seeded RNG carried in the state.

Authentic behavior is ported from the commented disassembly of the original
cabinet (historicalsource/red-baron); the quarry is kept locally under
`reference/` (gitignored) — never committed. **It is absent from most
checkouts**, and the suite is green without it: the source-side citation checks
are `skipIf`-guarded on its presence.

---

## The citation gate

`docs/audit/findings/` holds epic rb4's ROM-fidelity findings, and
`tests/audit/` is a gate that re-opens every citation byte-for-byte. The
`ours`-side citations are pinned to the commit the audit was taken against
(`6038a07`), read out of git rather than the working tree, so corrected code
does not turn the gate red and the evidence cannot be quietly rewritten to match.

That commit belongs to red-baron's pre-monorepo history. It stays reachable in
this repo through the **`audit/red-baron` tag**; `tests/audit-refs.test.mjs` at
the root guards that the tag still resolves. Do not delete it.

---

## Tech stack

- **Language:** TypeScript (ES modules, strict mode — via the root `tsconfig.json`)
- **Build tool:** [Vite](https://vitejs.dev/), configured once at the monorepo root
- **Tests:** [Vitest](https://vitest.dev/) — TDD on the pure core; red-baron is
  the `red-baron` project in the root `vitest.config.ts`
- **Rendering:** HTML5 Canvas 2D (`shadowBlur` for the vector-CRT glow)
- **Audio:** runtime synthesis through `@shared/synth`, whose skeleton red-baron
  donated (SH2-18), driven by a ROM-derived POKEY envelope table in
  `src/shell/pokey.ts`

---

## Development

Every command runs from the **monorepo root**, not from this directory.

| Command | What it does |
|---------|--------------|
| `npx vitest run --project red-baron` | Run red-baron's suite once (81 files / 1346 tests) |
| `npx vitest --project red-baron` | The same suite in watch mode |
| `npx vitest run` | Run the whole cabinet |
| `npm run lint` | `tsc --noEmit` over the monorepo, red-baron included |
| `npm run test:orchestrator` | The root `node:test` suite |

Build this game with `node scripts/build-app.mjs red-baron` (→ `dist/red-baron/`)
from the repo root; there is no per-plugin `dev`, `build`, `preview`, `test` or
`lint` script — the root owns the whole toolchain.

Sprint/epics are managed at the
[arcade orchestrator](https://github.com/slabgorb/arcade), not here.

---

## Releasing

Red Baron no longer has a release pipeline of its own. It used to be a separate
gitflow repo shipped by `just release red-baron` — feature branches onto
`develop`, a `--no-ff` merge to `main`, a bare `vX.Y.Z` tag, and a per-repo
`.github/workflows/deploy.yml` that uploaded `dist/` to the `arcade-red-baron`
R2 bucket on every push to `main`. All of that was removed when red-baron was
imported into the [arcade monorepo](https://github.com/slabgorb/arcade) as
`plugins/red-baron`: no `develop` branch, no per-repo CI, no bucket of its own.

The last standalone release was **v0.0.23** (`d7f7870` on the old `develop`);
the pre-monorepo history is parked at `.migration-backup/red-baron.git`. The
monorepo now ships the cabinet through one pipeline: `just release red-baron` from
the repo root gates + bumps `plugins/red-baron/package.json` + the generated
registry, tags **`red-baron-vX.Y.Z`**, and that tag triggers the CI deploy into
the shared `arcade-lobby` bucket under `red-baron/`. See
[`docs/ops/hosting.md`](../../docs/ops/hosting.md).

---

## License

Private project, for personal/educational use. *Red Baron* and *Atari* are
trademarks of their respective owners; this is an educational clone built to
learn how the original worked.
