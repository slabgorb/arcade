# Playbook — building the next sprite-based (raster) game

**Status:** field guide, distilled from three builds — `joust` (migrated then hardened,
237 commits), `missile-command` (native, shipped **v1.0.0**, 192 commits) and
`pac-man` (native, the cleanest example, 90 commits). Read this **after** the mechanical
setup in [`../ops/hosting.md` → *Adding a new game*](../ops/hosting.md) and **alongside**
the `rom-source-study` skill (front-loading the ROM). This document is the part neither
of those covers: **the order to build in, the seams unique to raster hardware, and the
traps that only bit us in play.**

Scope: a *raster* clone — tile/sprite graphics ROMs, a colour PROM, a sound chip
(WSG/POKEY), 60 Hz video-timebase logic. For vector games (glowing lines, AVG picture
ROMs, Math Box) the render seam is different; most of the *process* below still holds.

---

## 0. What "sprite-based" changes

Every game in this cabinet keeps the same spine — `plugins/<id>/src/core/` is the pure
deterministic sim, `src/shell/` is render/audio/input/storage, and a purity test scans
`core/` source text to keep the boundary honest. A raster game adds four things a vector
game doesn't have, and **all four live in the shell**:

| Seam | Vector game | Raster game | Where it lives |
|---|---|---|---|
| Pixels | line lists, `COLOR` opcodes | **tile + sprite ROMs**, 2-bit planar | `src/shell/gfx-rom.ts`, `*-data.ts` |
| Colour | palette constants | **resistor-DAC colour PROM** | `gfx-rom.ts` `decodePaletteFromProm` |
| Sound | POKEY / synth | **WSG wavetable PROM + sweeps** | `src/shell/wsg*.ts`, `tune.ts` |
| Asset build | none | **bake step** ROM bytes → data module | `tools/bake-*.mjs` |

The core sim never sees a pixel or a sample. It emits *entity records* (position, tile
index, animation frame, palette id); the shell turns those into ImageData. That
separation is what lets the whole sim run under vitest's `node` environment with no
canvas — hold it or the purity gate reddens.

---

## 1. The phase sequence that worked

`pac-man` is the reference arc. Build epics in this order — each phase is boot-stable and
independently reviewable, and each depends only on the ones above it:

1. **ROM study first, no code** (`pm1` opener, the `rom-source-study` skill). Vendor the
   source and ROM bytes under `plugins/<id>/reference/`, write `docs/rom-study/brief.md`
   (source of record, CPU/timebase, radix traps) and `glossary.md`. Establish **one
   citation vocabulary** — for pac-man that's `` `pacman.asm:<hexaddr>` ``. Nothing
   downstream is allowed to invent a constant that isn't cited here.
2. **Scaffold + fidelity harness** (`pm1`). The four-file scaffold (see hosting.md) that
   boots a black canvas over `createGame`/`stepGame`, **plus** the citation gate and
   purity test *before the first real constant*. Order matters: the gate exists so that
   every later story's numbers arrive pre-verified. (`missile-command` split this into
   `mc1` scaffold + `mc2` citation-checker; folding them as `pm1` did is cleaner.)
3. **Graphics ROM decode** (`pm3`). The raster-specific heart — see §2. Vendor the
   tile/sprite/colour ROMs under a byte-citation gate (`pm3-1`), then add **pure decode
   primitives** (`pm3-3/4/5`) and a **bake tool** that turns ROM bytes into a committed
   data module. Get pixels on screen before wiring much game logic — it de-risks the
   coordinate/rotation traps early (§4).
4. **Core simulation** (`pm`'s actor/ghost/targeting/mode; `mc3`–`mc5` ICBM/MIRV
   reducers). Pure reducers, one subsystem per file, each cited. This is the bulk and it
   is *just* the vector-game process — TDD each reducer red→green against ROM values.
5. **Sound** (`pm2` WSG; can precede or follow §4). Wavetable PROM decode + the tune
   player. **The sweep is the sound** — see §4.
6. **Phase machine + runtime wiring** (`pm4`, `mc6`). The attract→play→death→game-over
   state machine, and the wiring that connects core events to shell render/audio. Ships
   the pure phase machine *unwired* first (`pm4-5`), then wires runtime in later stories
   (`pm4-6/7/8`) — keeps each diff small.
7. **HUD, attract demo, showcase** (`pm4-9/11`, `mc7`, the lobby carousel). Bottom-HUD
   icons, the self-playing attract loop, and opting the game into the lobby showcase.
8. **Hardening / mutation batteries** (`jt3`–`jt9`, `mc10`). Reviewer-driven; expect it
   to *file* stories, not just close them — group them by **file surface**, not theme
   (see the Architect gotcha on jt9). This phase is where joust spent most of its 237
   commits.

Rule of thumb from all three: **pixels before physics, gate before constants, wire last.**

---

## 2. The graphics-ROM seam (the part that's genuinely new)

Model it exactly as `pac-man` did — it is the most portable code we have:

- **`src/shell/gfx-rom.ts` is pure**: one decode primitive per ROM *shape* — palette PROM,
  8×8 tile ROM (2-bit planar), 16×16 sprite ROM. Every function is `(Uint8Array) → plain
  data`, no fetch, no DOM, no canvas. That's what lets the same module run under vitest
  *and* under the Node bake script. New shapes **append** to this file; they don't
  restructure it.
- **The colour PROM is a resistor-DAC**, not a lookup table. Pac-man's `82s123.7f` drives
  three resistor ladders per byte (R,G = 3 bits through {1000,470,220}Ω; B = 2 bits
  through {470,220}Ω). Decode = normalise conductances to per-bit weights, sum, scale to
  0–255. Cite MAME's `compute_resistor_weights` / `PALETTE_INIT` in prose; **don't paste**
  it (the "cite, don't copy" constraint the citation gate enforces).
- **Bake, don't fetch.** `tools/bake-graphics.mjs` reads the vendored ROM bytes and emits a
  committed `*-data.ts` module (`sprite-data.ts`, `tile-data.ts`, `palette-data.ts`). The
  running game imports decoded data; it never loads a `.rom` at runtime. This keeps the
  reference bytes gitignored/licence-walled while the *decoded* output is in-tree and
  diffable.
- **Layout is data too.** `maze-tilemap-data.ts` / `maze-topology.generated.ts` come from
  a VRAM dump baked by `tools/bake-core-maze.mjs` + `dump-maze-vram.mjs` — the maze is not
  hand-typed.

---

## 3. The fidelity harness (copy pac-man's whole `docs/rom-study/` + `tests/audit/`)

This is the machinery that keeps a clone *faithful* instead of *plausible*, and it pays
for itself by the second epic:

- **`docs/rom-study/claims/*.json`** — one file per subsystem (`scoring`, `ghosts`,
  `maze`, `sound`, …). Each claim is `{id, symbol, value, meaning, addr, decode, source:
  {file, line, verbatim}}`. The `verbatim` is the exact ROM line, tabs and all.
- **`tools/audit/check-citations.mjs`** re-opens every cited line **byte-for-byte** and
  fails if the vendored source no longer says what the claim says.
- **`tests/audit/citations.test.ts`** fails if any prose citation in `brief.md`/`glossary.md`
  lacks a covering claim. So documentation can't drift from the ROM silently.
- **`src/core/` purity test** — scans core source text for `fetch`/`canvas`/`Date`/`Math.random`
  and the like. Named variously (`purity`, `core-boundary`, `sim-clock-free`); keep it.

Pac-man carries ~36 test files across `tests/{core,shell,audit,helpers}`. That density is
the norm for a finished cabinet, not gold-plating.

---

## 4. Traps that only showed up in play (do not relearn these)

These are the expensive lessons — each one shipped green tests while being wrong:

- **ROT90 tile/sprite asymmetry.** Pac-Man hardware stores **tiles unrotated but sprites
  and score-text rotated 90° CW**. Byte-equality decode tests pass while the screen is
  visibly wrong; only a *visual* playtest caught it. Score digits are tiles 0–9. Assume
  every new raster machine has some orientation quirk and **playtest the pixels**.
- **The WSG effect *is* a pitch sweep.** A static render of a sound = flat beeps and looks
  "done" (the silent-feature trap). The sweep over time is the sound. Also: gate audio on
  the first user gesture or autoplay policy leaves it silent in prod.
- **Accessibility overrides ROM fidelity.** The owner has photosensitive epilepsy: **no
  full-screen strobe/flash** — freeze or fade instead. This is the one standing exception
  to "ROM always wins." Bake it into the phase machine from the start, not as a retrofit.
- **Don't invent a default high-score ladder.** Pac-Man ROM ships a single `HIGH SCORE 0`,
  no descending ladder (that's a centipede-era clone-ism). Check the ROM before mirroring
  another game's attract HUD.
- **Assets degrade silently.** The shared audio/render paths swallow every failure so one
  missing sound never crashes a frame — which means a 404'd sample is indistinguishable
  from working code (star-wars music was wired and silent in prod for weeks). If a story's
  payload is an *asset the code merely points at*, the acceptance test is a **live 200**,
  not a green vitest. There is **no CI upload path** for the hand-managed `arcade` asset
  bucket — someone uploads sfx/speech by hand.
- **Verify the render coordinates, not just the routing.** Routing tests pass while a
  flipped/mis-scaled HUD ships; pin output *coordinates* in a core unit test.

---

## 5. Reuse before you write (the Architect's standing order)

Before adding anything to a new plugin, check `src/shared/` — these are already extracted
and every game should consume them, not re-implement:

`loop` (the rAF loop + `createLoop`), `rng` (mulberry32 — never re-inline the
`0x6d2b79f5` magic), `highscore`, `name-entry`, `host-helpers` (canvas mount + audio
unlock), `view`/`model-view`, `font`, `glow`, `pause`, `esc-overlay`, `held-keys`,
`audio`, `synth`, `math3d`, and `num` (scalar `clamp`). The SH3/SH4 epics exist precisely
to stop stragglers forking this code — a topology guard (`SH3-5`) now fails the build if a
plugin re-declares a shared primitive. Extract *new* shared code only once a **second**
game proves the duplication is real.

---

## 6. Definition-of-ready checklist for the next sprite game

- [ ] Original source + ROM bytes vendored under `plugins/<id>/reference/`, provenance in
      `reference/PROVENANCE.md`, `reference/` gitignored if licence-walled.
- [ ] `docs/rom-study/brief.md` (source of record, CPU, **timebase**, **radix** traps) +
      `glossary.md`, with one citation vocabulary fixed.
- [ ] Four-file scaffold (`index.html`, `plugin.ts`, `package.json`, `tsconfig.json`) +
      three registrations (`justfile` `games`, `vitest.config.ts` `GAMES`,
      `npm run gen:registry`). Copy from `plugins/joust/`.
- [ ] Citation gate + purity test **committed before the first game constant**.
- [ ] `gfx-rom.ts` pure decode primitives + `tools/bake-*.mjs` → committed `*-data.ts`.
- [ ] Core reducers TDD'd against cited ROM values, one subsystem per file.
- [ ] WSG/sound decode + tune player; audio gated on first gesture.
- [ ] Phase machine (attract→play→death→game-over) with **no full-screen flash**.
- [ ] HUD + attract demo; opt into the lobby showcase carousel.
- [ ] **Visual playtest** for orientation/coordinate/colour correctness — not just green
      vitest.
- [ ] `just release <id>` — verify the deploy **run** went green and the asset URLs 200.

---

*Sources: `plugins/pac-man/` (arc, harness, decode seam), `plugins/missile-command/`
(shipped v1.0.0), `plugins/joust/` (hardening), `docs/superpowers/specs/2026-08-06-pac-man-arcade-design.md`,
`docs/ops/hosting.md`, and the `rom-source-study` / `rom-fidelity-audit` skills.*
