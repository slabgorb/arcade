# pac-man — arcade (Namco, 1980, Z80): design & pm1 epic

**Architect design doc.** New cabinet, ninth game. Target: the **1980 Namco arcade
machine**, consistent with the rest of the fleet (owner decision, 2026-08-06 — *not*
the Atari 2600 port). Raster game, built on the centipede/joust shape.

Ground truth and the GPL firewall are settled in §3 — read that before writing a
single constant.

## 1. What we are cloning (and what we are not)

Several candidate sources were weighed; the ground truth is now the arcade ROM itself:

| Source | What it actually is | Role here |
|--------|---------------------|-----------|
| **`pacman.asm`** — a complete commented **Z80 disassembly of the 1980 Namco/Midway arcade program ROM** (`0000`–`3fff`, ~9,289 instructions), vendored at `plugins/pac-man/reference/source/` | The actual machine's code: labelled routines + data tables (scoring table `2b17`, ghost-name table `36bf`, actor RAM `4c/4d`, level `4e13`). | **Primary source of record.** Every fidelity constant cites `pacman.asm:<addr>`; the gate byte-verifies against it — the fleet-standard model (centipede/missile-command). |
| **The Pac-Man Dossier** (Jamey Pittman, `pacman.holenet.info`) | Behavioral reference derived from the ROM + testing: ghost AI, scatter/chase timing, per-level speed/Elroy/fruit tables, scoring, kill screen. | **Behavioral decoder.** Explains what the routines *do* and decodes encodings (e.g. the ×10 BCD scores). Cited in `glossary.md` for meaning, not as the byte-level truth. |
| **`shaunlebron/pacman`** (GitHub) | Faithful JS remake, credits the Dossier + MAME. **GPL v3.** | **Read-only oracle** behind a GPL firewall (§3). Disambiguates. **Zero lines copied.** |
| `DillonDepeel/Pacman-Source-Code` (GitHub) | The **Atari 2600 home port** — 6502 `.ASM`, a different, lesser game. | **Not used.** Wrong machine. Recorded here so nobody re-adopts it. |

The Z80 disassembly **is** vendored (provenance: `reference/PROVENANCE.md`), so Pac-Man
uses the fleet's normal line-level citation gate exactly as centipede and missile-command
do — no dossier-only adaptation. **Encoding traps** the gate must survive are recorded in
PROVENANCE.md: hex radix (`#xx`), and the BCD-little-endian-×10 scoring table (`2b1b 20 00`
→ 200), where a claim must cite the raw byte AND the decoded value.

## 2. Fleet placement — reuse, invent nothing

Standard **four files + three registrations**, copied from `plugins/centipede/` (our
cleanest *raster* sibling — Pac-Man is Canvas 2D sprite blitting, not a vector game):

- Files: `plugins/pac-man/{index.html, plugin.ts, package.json, tsconfig.json}`.
- Registrations: `games` in `justfile`, `GAMES` in `vitest.config.ts`, then
  `npm run gen:registry` to regenerate `src/host/registry.ts`.
- Served at `/pac-man/`, R2 key prefix `pac-man/`. `build-app.mjs` and the deploy
  workflow read `plugins/` directly — no changes.

**Reused `@shared` modules:** `highscore`, `name-entry`, `loop`, `font`, `view`,
`pause`, `esc-overlay`, `rng`.
**Deliberately not used:** `glow`, `math3d`, `synth`/vector-audio — those are
vector-hardware concerns. Any duplication with centipede/joust stays in
`plugins/pac-man/src/` until a *second* maze game proves an extraction (the
"second game proves it" rule).

## 3. Ground truth & the fidelity gate

- **Primary source of record:** the vendored `plugins/pac-man/reference/source/pacman.asm`
  Z80 disassembly (provenance `reference/PROVENANCE.md`). A `docs/rom-study/brief.md` +
  `glossary.md` (the missile-command shape) index the routines and decode the constants,
  citing `pacman.asm:<addr>` for the byte-level truth and the Dossier for decoded meaning.
- **The gate:** clone `plugins/centipede/tests/audit/citations.test.ts` +
  `check-citations.mjs` + `dossier-sweep.ts`. Every fidelity constant (speeds, mode
  timers, ghost targets, dot/energizer counts, the per-level table, the ×10-BCD scores)
  is a `claims/*.json` entry `{symbol, value, source:'pacman.asm', addr, meaning}` that
  the checker **byte-verifies against the vendored `pacman.asm`** — the same mechanism
  centipede/missile-command use against their vendored source, no adaptation. Plus
  `purity.test.ts` (core/shell boundary scan) and a `sim-clock-free` scan of `src/core/`.
  On CI (where `reference/` may be absent) the byte-verification SKIPS and the coverage
  sweep still runs, per the centipede pattern.
- **GPL firewall (binding):** `shaunlebron/pacman` is GPL v3. It is a **read-only
  behavioral oracle** — we read it to disambiguate the Dossier and **never copy a line
  of its code, structure, or data tables** into this repo. Lifting GPL code would
  infect the whole arcade. Dev instructions and the ADR must state this explicitly.
  MAME is the final tiebreaker.

## 4. Core / shell decomposition

The single most important rule in every game: `src/core/` is the pure deterministic
simulation; `src/shell/` is render/input/audio/storage. The purity test scans
`src/core/` source text and fails on clock/DOM/Math.random access.

**`src/core/` (pure, deterministic, sim-clock-free):**

| Module | Responsibility |
|--------|----------------|
| `maze.ts` | 28×36 tile grid (8px tiles → 224×288 px), walls, dots/energizers, tunnel, house geometry — cited from the Dossier map |
| `actor.ts` | Pixel-space position + the Dossier **speed-pattern** model (per-frame move/skip tables, e.g. 80/75/50/40%) — *not* floating-point velocities |
| `pacman.ts` | Player kinematics: cornering, input latching, the eat-pause (1 frame per dot, 3 per energizer) |
| `ghost.ts` | One ghost's kinematics + the tile-decision rule (choose turn at tile centre toward target; no reversing except on the mode signal) |
| `targeting.ts` | The four personalities: Blinky (Pac's tile), Pinky (4 tiles ahead + the up-direction overflow quirk), Inky (vector from Blinky through 2-ahead, doubled), Clyde (Pac tile if >8 tiles, else his scatter corner) |
| `mode.ts` | Scatter/chase per-level timer table; frightened mode; the **reverse-on-mode-change** signal; Cruise Elroy 1/2 thresholds |
| `house.ts` | Ghost-house release (global + per-ghost dot counters), exit/enter pathing, eaten-ghost eyes-return |
| `level.ts` | Per-level master table: speeds, frightened seconds + flash count, fruit type/points, Elroy thresholds — one cited constant per column |
| `game.ts` | Orchestration: tick order, scoring, lives, level advance, death/win state machine |
| `events.ts` | Emitted events (dot, energizer, ghost-eaten chain 200/400/800/1600, fruit, death, extra-life) consumed by the shell |

**`src/shell/` (impure):** `render.ts` (maze + sprite blit via `@shared/view`),
`input.ts`, `timebase.ts` (fixed **60 Hz** sim). Audio is stubbed at the `events.ts`
seam — a real sound epic (pm2+) subscribes there without touching core.

**Determinism of the AI (crown jewel):** ghost frightened-mode turn selection draws
from `@shared/rng` seeded per game, so a test replays an exact chase. Nothing in core
reads a wall clock or `Math.random`.

## 5. pm1 epic — story spine

Points groomed at materialize; this is the order and the boundaries.

1. **Scaffold** — 4 files + 3 registrations + `pm1-dossier.md` seed + citations/purity/
   sim-clock-free gates wired. Thin, proves the harness end to end.
2. **Maze** — tile model + render: walls, dots, energizers, tunnel wrap.
3. **Pac-Man movement** — cornering, input latch, eat-pause, dot/energizer scoring.
4. **Ghost kinematics + house release** — dot counters, exit pathing; Blinky direct
   chase first.
5. **Targeting** — Pinky, Inky, Clyde personalities; pin the Pinky up-overflow quirk.
6. **Mode engine** — scatter/chase table, frightened, reverse-on-switch, Cruise Elroy.
7. **Speeds & level table** — per-level speed patterns, tunnel slowdown, frightened
   decay + flash, fruit spawn at 70/170 dots.
8. **Round lifecycle** — death/win, lives, level advance, extra life at 10 000,
   high-score entry via `@shared/name-entry`.

**Deferred to pm2+ (explicitly out of pm1):** the three intermission cutscenes, the
level-256 kill-screen bug, authentic Namco/POKEY sound, and the attract self-play demo
(an `ad1` sibling).

## 6. Testing

Per-story vitest project `pac-man` rooted at the plugin. Core sim unit-tested
deterministically (seeded RNG); `targeting.ts` tested against Dossier-cited example
positions (the documented Pinky/Inky diagrams); the `mode.ts` timer table pinned
frame-exact. The citations gate enforces provenance; the orchestrator suite
auto-covers the new plugin's tsconfig and registrations.

## 7. Open items for materialize (not blockers)

- Confirm the exact Dossier section numbers to cite as `pm1-dossier.md` sections are
  authored (transcription is story 1's deliverable, not this doc's).
- Groom points per story; expect story 5 (targeting) and 6 (mode engine) to be the
  heaviest.
