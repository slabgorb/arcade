# CLAUDE.md — Star Wars

Guidance for working in this **plugin**. star-wars is no longer a standalone
repo: it lives at `plugins/star-wars/` inside the **arcade** monorepo, alongside
`plugins/tempest/` and the other games. Its own `.git`, `.github/workflows/`,
`vite.config.ts`, `tsconfig.json` and `package-lock.json` were removed on import;
the root owns the toolchain. The `package.json` here carries a name and a version
and nothing else.

## Project Overview

A faithful, browser-based clone of Atari's 1983 vector arcade game *Star Wars* —
the first-person cockpit shooter (TIE fighters → Death Star surface → trench
run). Glowing **3D** vector lines on black, rendered with HTML5 Canvas 2D. The
game is a **deterministic pure simulation core** wrapped by a thin
input/render/audio shell.

Sibling of [tempest](../tempest) — same arcade visual language and the same hard
core/shell boundary, but a genuinely 3D core instead of Tempest's 2.5D tube.

- **Type:** a plugin in the arcade monorepo (client-only, no backend)
- **Language:** TypeScript (ES modules, strict)
- **Build tool:** Vite (root config) · **Testing:** Vitest (TDD on the pure core)
- **Status:** shipped and live at `v0.0.33` — all three phases playable. (The old
  "Wave 0 skeleton" line here was stale by many releases.)

## Directory Structure

```
plugins/star-wars/
├── src/
│   ├── core/            # PURE, unit-tested, no DOM/canvas
│   │   ├── state.ts     # GameState type
│   │   ├── sim.ts       # stepGame(state, input, dt) → state
│   │   ├── input.ts     # Input type (yoke, abstracted)
│   │   ├── models.ts    # 3D wireframe model registry
│   │   ├── tie-vm.ts    # TIE choreography VM (+ tie-waves, tie-status)
│   │   ├── trench-*.ts  # channel / detail / obstacles / wedges
│   │   ├── surface*.ts  # surface-grid, surfaceMazes
│   │   └── …            # attract, coaching, events, gameRules, highScores,
│   │                    #   hud, modelView, scenePresets, starfield
│   ├── shell/           # IO: render, input, audio, font, glow, wireframe,
│   │                    #   debug-overlay
│   ├── tools/           # dev-only: contactSheet (models.html),
│   │                    #   sceneSheet (scenes.html), romCompare, romModels.generated
│   └── main.ts          # bootstrap: canvas + wire shell ↔ core
├── tests/               # Vitest suites (mostly against the pure core)
├── tools/               # audit gate + the ROM bake tools (music/pokey/speech)
├── reference/           # GITIGNORED — disassembly + audio refs (see its README)
├── index.html           # main entry
├── models.html          # dev tool — model contact sheet
└── scenes.html          # dev tool — scene sheet
```

**There is no `core/math3d.ts`, no `core/rng.ts` and no `shell/loop.ts`.** The
Math Box, the seeded PRNG and the fixed-timestep loop live in the shared library
and are imported as `@shared/math3d`, `@shared/rng` and `@shared/loop` — as are
`@shared/{font,glow,pause,esc-overlay,audio,highscore,view,name-entry}`. Since the
monorepo migration the library is **in-repo** at `src/shared/` (repo root),
reached through the `@shared` alias; it is not an npm dependency and there is no
version pin to bump. Do not re-create local copies —
`tests/rng-extraction.test.ts` and `tests/loop-extraction.test.ts` will fail.

**All three HTML entries must survive any build wiring.** The deleted
`vite.config.ts` declared `index.html`, `models.html` **and** `scenes.html` in
`build.rollupOptions.input`; the root build config takes them as an `entries`
list. Omit them and the two dev tools vanish from the bundle silently.

## The Hard Architectural Boundary (most important rule)

`core/` is a **pure, deterministic simulation**. It must NEVER:

- import from `shell/`
- touch the DOM, `window`, `document`, or `canvas`
- call `Date.now()`, `new Date()`, `performance.now()`, `Math.random()`, or
  `requestAnimationFrame`

All time enters `core/` as `dt`. All randomness comes from the seeded RNG carried
in `GameState`. `stepGame(state, input, dt) → state` must produce identical
output for identical input. This is what makes the game unit-testable and
frame-rate independent — do not erode it.

The 3D math lives entirely in `core/math3d.ts` (pure functions on `Vec3`/`Mat4`).
The shell only *consumes* projected coordinates to stroke glowing lines; it never
does game math.

## Commands

Run these from the **repo root**, not from `plugins/star-wars/`. There are no
scripts in this directory's `package.json`.

```bash
npm install                                  # install the whole cabinet, once
npx vitest run --project star-wars           # this game's suite: 189 files, 2028 tests
npx vitest run --project star-wars <pattern> # filter, e.g. `… trench` → 24 files, 236 tests
npx vitest run --project star-wars citations # the citation gate (was `npm test -- citations`)
npx vitest run                               # every project in the monorepo
npm run lint                                 # tsc --noEmit across the monorepo
```

**Run it in a browser with `just serve`, then open <http://127.0.0.1:5270/star-wars/>.**
One dev server at the repo root serves the whole cabinet — the lobby at `/`, each game
at `/<id>/` from its own plugin sources — so a render change can be verified by loading
it, and a screenshot taken at `/star-wars/` is this game. Both second entries are served
too: `/star-wars/models.html` and `/star-wars/scenes.html`. Build with
`node scripts/build-app.mjs star-wars` (→ `dist/star-wars/`).

The per-game dev server on port 5274 is gone; there is one port, 5270, pinned in
`vite.config.ts` rather than on the command line. Two claims that stood here until
mg1-2 were true when written and are now false: that the root server returns the lobby
at every path, and that `scripts/build-app.mjs` does not exist. Both were measured
again — the server serves this game, and the build runs.

Consequence for the standing "the shell is verified by running the game"
convention below: that route is **currently unavailable**, so shell changes rest
on the source-wiring tests alone until a later migration task restores it.

## The citation gate

`tests/audit/citations.test.ts` + `tools/audit/check-citations.mjs`. Unlike
tempest's, this gate re-opens each finding's `ours` citation **against the
working tree**, not against a frozen commit — so any edit that shifts a cited
line breaks it. Re-anchor with `tools/audit/reanchor-citations.mjs` after editing
a cited file. The source side reads
`/Users/slabgorb/Projects/star-wars-1983-source-text` (override with
`STARWARS_SOURCE_DIR`); if that path is missing the source-side describe
**skips**, which is a silent pass — check it ran.

The migration's `@arcade/shared/*` → `@shared/*` rewrite deliberately did **not**
touch `docs/`: the findings' `ours.verbatim` quotes are frozen audit evidence, and
rewriting them would make the audit misquote itself.

## Testing

TDD on the pure core with Vitest — write the failing test first, then make it
pass. Cover: the math box (matrix multiply, rotation, projection invariants),
each enemy/object behavior driven by a fixed RNG seed, collision/hit-tests in 3D,
and scoring/phase-transition logic. The shell (render/input/audio) was
conventionally verified by running the game — **that route is unavailable in this
repo today** (see the Commands warning above), so shell changes currently rest on
the source-wiring tests (`tests/shell/render.*.test.ts` and friends) alone.

## Build Roadmap — complete

Built in "waves," each a self-contained slice (mirroring tempest's cadence). All
six shipped; the list is kept as the map of where each subsystem lives.

- **Wave 0 — Skeleton:** Vite+TS, canvas bootstrap, fixed-timestep loop, the
  math box, one glowing wireframe spinning. ✅
- **Wave 1 — Space combat:** cockpit crosshair, TIE fighters, fireballs, firing,
  collisions, lives, score. ✅
- **Wave 2 — Death Star surface:** towers, laser turrets, terrain skim. ✅
- **Wave 3 — Trench run:** the trench, catwalks, the exhaust port, the bonus. ✅
- **Wave 4 — Framing:** HUD, waves/difficulty ramp, attract/title, high scores. ✅
- **Wave 5 — Audio:** POKEY SFX + TMS5220 speech ("Use the Force, Luke"). ✅

## Reference Material

Authentic vector models, game constants, and audio are ported from the commented
disassembly of the original cabinet under `reference/` (gitignored). See
`reference/README.md`. `Object_3D_Data.asm` holds the real vertex/line-segment
tables; the sound disassembly and the linked audio repo hold the SFX/speech data.

### The original 1983 Atari source (preferred over the disasm)

The **complete original MACRO-11 source** (project codename "Warp Speed") is
cloned locally — strictly richer than `reference/disasm/`: it has the original
comments, labels, and the AVG picture data the disasm lacks. Prefer it for any
fidelity question.

- **Pristine clone:** `~/Projects/star-wars-1983-source`
  (github `historicalsource/star-wars`, commit `5355b76`)
- **Greppable copy:** `~/Projects/star-wars-1983-source-text` — same filenames,
  LF-normalized plain ASCII. **Use this one for grep/read**; the originals are
  CR-terminated non-UTF8 (grep flags them binary; needs `tr '\r' '\n'` + `grep -a`).
- Both are machine-local (not in any repo). Re-create with:
  `git clone https://github.com/historicalsource/star-wars.git` + per-file
  `perl -0777 -i -pe 's/\r\n/\n/g; s/\r/\n/g; s/\x0c/\n/g; s/[^\x09\x0a\x20-\x7e]//g'`.

**Key modules** (each `.MAC` has a `.TITLE`; sections under `.SBTTL`):

| File | Contents |
|------|----------|
| `WSGLOB.MAC` | Global equates, RAM layout — where named constants live |
| `WSCPU.MAC` | **TIE AI**: "ALIEN CONTROL AND CHOREOGRAPHY" — `STARTING LOCATIONS` (`TBG*` tables: depth `$7C00`, lateral offsets ×`$400`), `WAVE DATA` (`TSPWAV` space-wave sets, Darth ordering), `CHOREOGRAPHY TABLES` (behavior scripts), `COLLISION` |
| `WSGRND.MAC` | **Surface phase**: `TOWER MAZES` — hand-authored per-wave maps of `TOWER`/`BUNKER`/`BISHOP` at explicit hex coords (top view, X ±right, Y forward, out to `$7C00`); `TTWRS` per-maze tower counts; turret fire |
| `WSBASE.MAC` | Death Star framework | 
| `WSPANL.MAC` | Trench wall panels / catwalks |
| `WSOBJ.MAC` | 3D object vertex tables + draw routines. Objects are authored as small ints × a per-object scale (`.S=13.` for the TIE) → **raw ROM units; our `models.ts` vertices are these units 1:1** |
| `WSVROM.MAC` | AVG vector **pictures** (2D shapes: `GNB/GNT` gunshot sparkles, explosions). `AVGROM.MAC` is the AVG state PROM (hardware, not pictures) |
| `WSGUNS.MAC` / `WSLAZR.MAC` / `WSXPLD.MAC` | Guns / lasers / explosions |
| `WSGLOW.MAC` / `WSGAS.MAC` | Glow + shields / score |
| `WSMAIN.MAC` / `WSMATH.MAC` / `SWMP.MAC` | Main game play / math + common routines / Math Box micro-program (`SWMP.DOC` is its doc) |
| `WSSITE.MAC` / `WSSTAR.MAC` | Site handling / starfield |

**World metric:** coordinates are 16-bit raw ROM units, `$4000` = 1.0 fixed
point; play cube clamps at ±`$7CFF`; TIE spawn depth `$7C00` (= 31,744). Since
`models.ts` is already in raw ROM units, ROM distances port into the sim
**unscaled**. Cross-reference: `reference/disasm/` labels (`sub_8xxx`…) are the
compiled form of these files; `docs/tie-flight-ai-model.md` maps the TIE AI.

## Git Workflow

star-wars has no git history of its own any more — it is a directory in the
**arcade** repo and follows that repo's workflow. Its pre-migration history is
parked, unpushed-safe, at `.migration-backup/star-wars.git` (repo root,
gitignored); `develop` there is `822ee06`, level with the old `origin`, which is
the per-game rollback point.

- **Do not** look for a `develop` branch here, open a PR against the old
  `slabgorb/star-wars` remote, or run `just release star-wars`.
- **Release tags are `star-wars-vX.Y.Z`.** A bare `vX.Y.Z` is invalid in the
  monorepo. The per-game release mechanism is being rebuilt by the migration and
  is not wired yet, so this file names no release command rather than a guessed
  one.
- Imported at version `0.0.33` — see `docs/ops/migration-manifest.md` at the repo
  root for the source SHA and the rollback target.

## Important Notes

- No 3D engine, no physics engine, no networking/backend. High scores are local
  (`localStorage`). Mouse (yoke) + keyboard only.
- Positions are **3D object/world space**; projection to the screen is a render
  concern handled via the math box. Collision is computed in 3D, not screen pixels.
- Sprint/epics are managed at the **arcade orchestrator root**, not here.
