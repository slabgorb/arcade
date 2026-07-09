# Story rb1-2 Context

## Title
Source findings / fidelity spec — quarry historicalsource/red-baron into reference/; distill mechanics (flight, enemy behavior, ground seq), timing (frame cadence — watch ÷N ROM tick), sound (RBSOUN.MAC POKEY tables), object data (PLANE POINTS DB, 036xxx/037xxx picture ROMs, RBGRND.MAC)

## Metadata
- **Story ID:** rb1-2
- **Type:** chore
- **Points:** 3
- **Priority:** p1
- **Workflow:** trivial — **phased** (setup → **implement** → review → finish). No RED/TDD phase; the **implement** phase owner is **Dev**.
- **Repo:** red-baron (path: `red-baron/`)
- **Epic:** rb1 — Red Baron — Quarry & Foundation

## Problem
Red Baron (Atari 1980) needs a canonical source-findings / fidelity spec before any
sim code is written — the same quarrying step **bz1-2** did for Battlezone. This story
copies the original disassembly into `reference/` and distills it into a fidelity-spec
markdown that seeds the flight camera (rb1-3) and epics rb2–rb5. No game logic is built
here; the deliverable is documentation authored inside the red-baron subrepo.

## Source (verified reachable — this is the whole input)
- **Canonical source:** GitHub **`historicalsource/red-baron`** (Rich Moore's disassembly,
  default branch `main`). Publicly reachable — confirmed during setup.
- **Get it:** clone/download into **`red-baron/reference/`**, which is **gitignored**
  (see `red-baron/.gitignore`) — the raw source is NOT committed; only the distilled
  findings doc is.
- **Confirmed file inventory** (the ones this story mines):
  - `RBARON.MAC` / `R2BRON.MAC` — main game logic (flight, enemy behavior, ground sequence)
  - `RBSOUN.MAC` — POKEY **sound** tables + routines (engine, machine gun, explosions)
  - `RBGRND.MAC` / `R2GRND.MAC` — **ground objects** vector tables
  - `RBINT.MAC`, `RBCOIN.MAC`, `RBROM.MAC` — init / coin / ROM glue
  - `RBARON.DOC`, `MBUDOC.DOC` — original docs (fast orientation)
  - `MBUCOD.*` — Math Box microcode (context only; we CONSUME `@arcade/shared/math3d`, do NOT re-port)
  - `VGAN.MAC` / `VG*.MAC` — AVG vector generator
  - `036xxx` / `037xxx` picture-ROM object tables (incl. the `PLANE POINTS DB`)
- **Design spec (orchestrator):** `docs/superpowers/specs/2026-07-08-red-baron-design.md`
  — canonical-source pointer (line 7), quarry plan (lines 116–124), and the
  "consume `@arcade/shared/math3d`, do not re-port from battlezone" ruling (line 146).

## Technical Approach (deliverable shape — mirror bz1-2)
Author a findings / fidelity-spec markdown **inside the red-baron subrepo** (e.g.
`red-baron/reference/FINDINGS.md` or `red-baron/docs/fidelity.md` — Dev picks the exact
committed path; the doc is committed even though `reference/` raw source is gitignored).
Distill along four axes, **each finding citing its `.MAC` source (file + label/addr)**:
1. **Mechanics** — flight model (banking/roll/pitch), enemy (Fokker/Baron) behavior, ground-target sequence.
2. **Timing** — frame cadence. **Watch for the ÷N ROM tick divider** — a known fidelity
   trap: the ROM advances certain timers/updates only every Nth frame, and ports that tick
   every frame run N× too fast. (Precedent: Asteroids ÷4 frame cadence was an entire root-cause bug.)
   Nail down N and which subsystems it gates.
3. **Sound** — `RBSOUN.MAC` POKEY envelope tables (format, per-effect offsets).
4. **Object data** — `PLANE POINTS DB`, the `036xxx`/`037xxx` picture-ROM vector tables, `RBGRND.MAC` ground objects.

## Scope
- **In scope:** quarry `reference/` (gitignored) + author the distilled fidelity-spec doc (committed) covering the four axes with source citations, scoped to seed rb1-3 + rb2–rb5.
- **Out of scope:** any sim/render/audio code; porting the Math Box (consume shared math3d); exhaustive deep-fidelity for late-game states nobody reaches — **do not gold-plate**.

## Acceptance Criteria (derived — no ACs in YAML)
1. `historicalsource/red-baron` quarried into `red-baron/reference/` (gitignored — raw source not committed).
2. A fidelity-spec markdown is authored + committed in the red-baron subrepo covering all four axes: mechanics, timing (incl. the ÷N frame-cadence divider with N identified), sound (RBSOUN POKEY tables), object data (PLANE POINTS DB + 036xxx/037xxx picture ROMs + RBGRND.MAC).
3. Each material finding cites its `.MAC` source (file + label/address).
4. The spec explicitly scopes what it seeds: rb1-3 (flight camera) and rb2–rb5, and records the "consume shared math3d, don't re-port" decision.
5. No gold-plating of deep/unreached fidelity; findings stay at the altitude the game actually reaches.

## Branch / Git
- Work on **`chore/rb1-2-source-findings`** in the red-baron subrepo (off `develop`).
- red-baron has **NO GitHub remote** (local-only bootstrap policy from rb1-1): local commits only, **no push, no PR**. Finish is a local merge to `develop`.
- Orchestrator repo: no commits unless the user asks (only `sprint/context/context-story-rb1-2.md` etc. touched here).

---
_Curated by SM at setup from the design spec + verified `historicalsource/red-baron` inventory. Supersedes the bare YAML-generated template._
