# Star Wars

A faithful, browser-based clone of Atari's 1983 vector arcade game *Star Wars* —
the first-person cockpit shooter where you fly the trench run and "use the Force."

**▶ Play it live: [star-wars.slabgorb.com](https://star-wars.slabgorb.com)**

![Star Wars gameplay — the Death Star trench run, laser turrets flanking the crosshair, "EXHAUST PORT AHEAD"](https://arcade-assets.slabgorb.com/star-wars/screenshot.png)

Glowing 3D vector lines on black, rendered with HTML5 Canvas 2D. No 3D engine,
no physics engine, no backend. The game is a **deterministic pure simulation
core** (its own little "Math Box") wrapped by a thin input/render/audio shell —
the same architecture as its sibling, [tempest](../tempest).

> **Status:** shipped and live at `v0.0.33`. All three phases — TIE waves, the
> Death Star surface, the trench run — are playable, with POKEY SFX, TMS5220
> speech and the ROM music. The "Wave 0 skeleton" note that stood here was stale
> by many releases; see [CHANGELOG.md](CHANGELOG.md) for what actually landed.

---

## Quick start

star-wars is no longer a standalone repo — it is a plugin inside the **arcade**
monorepo, at `plugins/star-wars/`. Everything runs from the repo root, not from
here:

```bash
npm install                            # installs the whole cabinet, once
npx vitest run --project star-wars     # this game's suite (189 files, 2028 tests)
npm run lint                           # tsc --noEmit across the monorepo
```

> **Open star-wars in a browser with `just serve`, from the monorepo root.** One
> Vite dev server holds the whole cabinet on `http://127.0.0.1:5270/` — the lobby
> at `/` and this game at `/star-wars/`, served from these plugin sources, so a
> dev URL and a production URL differ only in origin. Both dev entries are served
> too: `/star-wars/models.html` and `/star-wars/scenes.html`. mg1-2 landed that
> (and `scripts/build-app.mjs` builds the game); the per-plugin dev server and the
> old pinned port 5274 are gone with it.
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
| Aim the crosshair | **Mouse** (stands in for the cabinet's two-axis yoke) |
| Fire | **Hold left mouse button**, or **hold Space** |

The original cabinet used an analog flight yoke with triggers; the mouse maps
onto its two axes.

---

## The three phases of an attack run

Faithful to the arcade, each wave escalates through three distinct sequences:

1. **Space** — Darth Vader's TIE squadron; dodge and shoot green fireballs.
2. **Death Star surface** — skim the towers, shoot or weave past the laser turrets.
3. **Trench run** — down the trench to the exhaust port. *"Use the Force, Luke."*

---

## Architecture

Split into a **pure simulation core** and a thin **IO shell**. This boundary is
the most important rule in the codebase.

```
src/
├── core/              # PURE, deterministic, unit-tested — no DOM/canvas
│   ├── state.ts       # GameState type
│   ├── sim.ts         # stepGame(state, input, dt) → state
│   ├── input.ts       # Input type (the yoke, abstracted)
│   ├── models.ts      # 3D wireframe model registry (ported from the disassembly)
│   ├── tie-vm.ts      # the TIE choreography VM (WSCPU.MAC), tie-waves, tie-status
│   ├── trench-*.ts    # trench channel / detail / obstacles / wedges
│   ├── surface*.ts    # surface-grid, surfaceMazes
│   └── …              # attract, coaching, events, gameRules, highScores, hud,
│                      #   modelView, scenePresets, starfield
├── shell/             # IO: render.ts, input.ts, audio.ts, font.ts, glow.ts,
│                      #   wireframe.ts, debug-overlay.ts
├── tools/             # dev-only: contactSheet.ts (models.html),
│                      #   sceneSheet.ts (scenes.html), romCompare.ts,
│                      #   romModels.generated.ts
└── main.ts            # bootstrap: canvas + wire shell ↔ core
```

There is **no `core/math3d.ts` and no `core/rng.ts`** in this tree, and no
`shell/loop.ts`: the Math Box, the seeded PRNG and the fixed-timestep loop were
extracted to the shared library during the SH epic and are consumed as
`@shared/math3d`, `@shared/rng` and `@shared/loop`. So are the font, glow, pause,
esc-overlay, audio-engine, high-score, view and name-entry primitives. Since the
monorepo migration the library is in-repo at `src/shared/` (repo root), reached
through the `@shared` alias rather than an npm dependency —
`tests/rng-extraction.test.ts` and `tests/loop-extraction.test.ts` guard both
halves of that.

**The core is pure and deterministic.** It never imports from `shell/`, never
touches the DOM/`window`/`canvas`, and never calls `Date.now()`,
`performance.now()`, `Math.random()`, or `requestAnimationFrame`. All time
enters as `dt`; all randomness comes from a seeded RNG carried in the state.
`stepGame(state, input, dt)` produces identical output for identical input.

Where Tempest's core was 2.5D "tube space," Star Wars' core is genuinely 3D:
`math3d.ts` is a real model→view→projection pipeline — the software stand-in for
the cabinet's hardware Math Box.

---

## Reference material

Authentic data (vector models, game constants, POKEY SFX, TMS5220 speech) is
ported from the commented disassembly of the original cabinet, kept locally
under `reference/` (gitignored — see [reference/README.md](reference/README.md)).

---

## Tech stack

- **Language:** TypeScript (ES modules, strict mode)
- **Build tool:** [Vite](https://vitejs.dev/)
- **Tests:** [Vitest](https://vitest.dev/) — TDD on the pure core
- **Rendering:** HTML5 Canvas 2D (`shadowBlur` for the vector-CRT glow)

---

## Development

Every command runs from the **repo root**, not from `plugins/star-wars/`. This
directory has a `package.json`, but it carries only a name and a version — there
are no scripts and no dependencies here any more.

| Command | What it does |
|---------|--------------|
| `npm install` | Install the whole cabinet's toolchain (root, once) |
| `npx vitest run --project star-wars` | This game's suite — 189 files, 2028 tests |
| `npx vitest run --project star-wars <pattern>` | Filter, e.g. `… trench` → 24 files, 236 tests |
| `npx vitest run` | Every project in the monorepo |
| `npm run lint` | `tsc --noEmit` across the monorepo |
| `npm run test:watch` | Vitest in watch mode |

There are no per-plugin `dev`, `preview` or `build` scripts — the root owns the
toolchain. Serve the game with `just serve` (see Quick start) and build it with
`node scripts/build-app.mjs star-wars` (→ `dist/star-wars/`). That build declares
**all three** of this game's HTML entries — `index.html`, `models.html` and
`scenes.html` — so the two dev tools stay in the bundle; if a future change to the
build config drops them, they vanish silently.

---

## License

Private project, for personal/educational use. *Star Wars* and *Atari* are
trademarks of their respective owners; this is an educational clone built to
learn how the original worked.

## Releasing

star-wars used to ship from its own repo, on its own `develop`/`main` gitflow,
with its own `.github/workflows/deploy.yml` pushing to the `arcade-star-wars` R2
bucket. All three are gone: the repo is now a directory in
[arcade](https://github.com/slabgorb/arcade), and the workflow was deleted on
import.

Per-game independent releases survive the move, now through one pipeline: run
**`just release star-wars`** from the repo root. `scripts/release.mjs` gates on
this app's vitest project and build, bumps `plugins/star-wars/package.json` plus
the generated registry, then tags and pushes. A couple of things worth knowing:

- **Release tags are `star-wars-vX.Y.Z`**, and the tag is the deploy trigger — a
  bare `vX.Y.Z` tag is invalid in the monorepo (it cannot say which app it
  releases) and deploys nothing.
- The version this tree was imported at is `0.0.33`, recorded in
  `package.json` and in `docs/ops/migration-manifest.md` at the repo root, which
  also holds the pre-migration `develop` SHA for a per-game rollback.
