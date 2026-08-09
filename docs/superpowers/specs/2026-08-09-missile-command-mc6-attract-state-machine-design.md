# Missile Command — mc6, attract + state machine + pause (REV-01) — Architect design

2026-08-09. Detailed epic design for **mc6**, executing the roadmap slice at
`docs/superpowers/specs/2026-08-07-missile-command-full-cabinet-roadmap.md:112`
under the one-design-per-epic rule. Ground truth for every ROM fact is the
vendored **REV-01** tree (`plugins/missile-command/reference/source/`) and the
machine-gated dossier (`plugins/missile-command/docs/rom-study/`); this design
*cites* that source, it does not re-derive the dossier. Citation form is
`FILE.MAC:LINE` against the physical file (W3MAIN is CRLF + has stray binary
bytes → read a `tr -d '\r'` copy with `grep -a`; the line numbers below are from
that cleaned copy). RADIX: W3MAIN inherits `.RADIX 16`, so **bare literals are
HEX**, a trailing `.` is DECIMAL, and score arithmetic runs under `SED` (BCD).

## Where mc6 mounts

mc6 depends on **mc3** (done — the core combat loop, and the `state.ts` phase
seam it explicitly left for this epic: *"The full attract/setup/pause machine is
mc6; mc3's `phase` is the seam it will grow into,"*
`docs/superpowers/specs/2026-08-07-missile-command-full-cabinet-roadmap.md:167`).
It does **not** depend on mc5: the state machine wraps the combat loop whatever
enemies populate it. It runs orthogonally to mc8 (audio) and mc9 (render), which
layer on the events and frames mc6 sequences.

Today `plugins/missile-command/src/core/state.ts` declares
`Phase = 'play' | 'between' | 'over'` and a `nextPhase`/`nextWavePhase`/`resumePlay`
trio; `game.ts` runs `'play'` until every city dies, then freezes at `'over'`
advancing only the frame counter. That is the whole lifecycle mc6 replaces with
the ROM's real one.

The fidelity contract from the roadmap (§"Fidelity contract") binds every mc6
story unchanged: REV-01 ground truth, every new `src/core` constant carries a
claim gated by `citations.test.ts`, the core/shell boundary holds
(`purity.test.ts` — the state machine and the attract auto-player are pure in
`src/core`, all pixels and key bindings in `src/shell`), the RNG is seeded state
never ambient entropy, and any REV-01↔REV-03 divergence is catalogued.

## Ground-truth findings that shaped this design

Extracted from `W3MAIN.MAC` (REV-01). Three findings drove the scope, the module
shape, and the story order — and each corrects an assumption baked into the
roadmap's one-line mc6 row.

### 1. The ROM has THREE states, not six — and attract is an orthogonal flag

The roadmap row implies an `attract | setup | play | pause | over` enum. The ROM
does not model it that way. `STATE` (`W3MAIN.MAC:131`, ";GAME STATE
(PLAY,PAUSE,OR SETUP)") holds exactly **three** dispositions, and MAINLINE
dispatches on its sign (`W3MAIN.MAC:507-527`):

```
LDA STATE
IFEQ            → JSR PLAY     ; STATE == 0        (S.PLAY)
ELSE IFMI       → JSR PAUSE    ; STATE <  0        (S.PAUS, high bit set)
ELSE            → JSR SETUP    ; STATE >  0        (S.SETU)
THEN
JSR ALWAYS      ; non-state-dependent processing every frame
```

- **`'over'` is not a state.** Game-over and every wave transition are handled
  *inside* SETUP: end-of-wave writes `S.SETU` back to `STATE`
  (`W3MAIN.MAC:3601` ";NO. END WAVE", `:3663` ";YES. END WAVE"), and SETUP walks a
  task list (`SETUPC` index into the `SETUP1` dispatch table, `W3MAIN.MAC:561-583`,
  `.WORD NEWGAM-1`) that sequences new-game, new-wave, bonus, and game-over
  screens. Our current `'between'` and `'over'` phases are both **SETUP tasks** in
  the ROM, not peers of `'play'`.
- **Attract is a flag, not a state.** `ATRACT` (`W3MAIN.MAC:135`, ";ATTRACT
  (0)/GAME (-1) FLAG") is orthogonal to `STATE`: during attract the machine still
  runs SETUP→PLAY→SETUP over a live simulation. Attract is *the same game playing
  itself*, gated by `ATRACT`, not a separate code path.

**Design consequence.** mc6 keeps a small, ROM-faithful phase set and models
attract as a boolean on `GameState`, rather than inventing a flat six-way enum the
ROM never had. Proposed `Phase = 'attract' | 'setup' | 'play' | 'pause'` with an
`ATRACT`-analogue `attract: boolean`, and the existing `'between'`/`'over'`
collapse into `'setup'` tasks (see §"Architecture"). This is the mc6 analogue of
mc5's "the four enemies are three" — the roadmap's surface count is wrong; the
ROM's structure is simpler and truer.

### 2. Attract plays the real game with a "smart cursor" auto-player

`SMART CURSOR MOVER (ATTRACT)` / `AUTCUR` (`W3MAIN.MAC:891`) is a deterministic
auto-player that drives the cursor and fires during attract, so the field is a
live demo, not a canned animation. It is a *pure driver over the same
`stepGame`* — which is exactly what our seeded, clock-free core makes cheap: an
attract driver reads `GameState` and returns the same input a player would. This
is why mc6-4 is a `src/core` module, not a shell animation: the demo must be
replayable and testable frame-by-frame like every other MC core unit.

### 3. Pause is a throttled, resumable freeze with its own timer

`PAUSE STATE` (`W3MAIN.MAC:615`) updates on a 4/60 s cadence (`AND I,03` on
`FRAME`), runs a `PAUST` timer, then advances via `NXTSTA`→`STATE`
(`W3MAIN.MAC:635-641`, next state compared to `S.PLAY`). Pause is entered from
play and also used as a deliberate inter-screen *wait* (`S.PAUS` "NOW WAIT X
SECONDS BEFORE PLAY STATE", `W3MAIN.MAC:4037`; "MUST PAUSE A LITTLE IF BONUS ABM
PTS", `:4519`). So pause in REV-01 is two things: a player-toggled freeze and a
scripted delay between setup screens. mc6 models the player-toggled freeze
(mc6-3); the scripted-delay use is a SETUP-sequencing detail folded into mc6-2/6-5
where those screens live.

## Architecture — model by the ROM's state machine

The state machine and the attract auto-player are pure `src/core`; the shell binds
keys and renders screens. Each new `src/core` file is scanned by `purity.test.ts`
and `citations.test.ts`.

### New / changed core modules

- **`state.ts` (changed — the heart of the epic).** Grow `Phase` from
  `'play' | 'between' | 'over'` to `'attract' | 'setup' | 'play' | 'pause'`, add
  `attract: boolean` on `GameState`, and replace the ad-hoc `nextPhase` trio with
  a single **MAINLINE-faithful transition** (`W3MAIN.MAC:475-527`): dispatch by
  phase, SETUP walks a task sequence, PAUSE freezes-and-resumes, PLAY runs the
  combat step. `'between'` and `'over'` become named SETUP tasks so no behaviour is
  lost — the mc3/mc4 wave-transition and game-over edges keep their current tests,
  re-expressed against the SETUP task list.
- **`attract.ts` (new).** The pure smart-cursor auto-player (`AUTCUR`,
  `W3MAIN.MAC:891`): given `GameState` + seed, return the cursor move / fire input
  that drives the attract demo. Seeded, no clock — replayable exactly like
  `cursor.ts`.
- **`game.ts` (changed).** `stepGame` becomes the MAINLINE composition root: it
  reads `phase`, and in `'play'` runs today's seven-step combat order unchanged; in
  `'setup'` advances the task sequence; in `'pause'` runs the throttled freeze
  (clock ticks, sim frozen); in `'attract'` folds `attract.ts`'s synthesized input
  into a live `'play'` step. `createGame()` starts in `'attract'` (the cabinet
  boots to the demo), and a start action transitions to `'setup'`→`'play'`.

### Shell (functional only; authentic render is mc9)

- **`input.ts` (changed)** — bind the pause key (toggle `'play'`↔`'pause'`) and the
  start/coin action (`'attract'`/`'over'`→`'setup'`); in `'attract'` any input
  starts a game (the AUTCUR demo yields to the player). No render authenticity
  here.
- **`render.ts` (changed)** — draw the attract screens (scrolling messages, THE
  END) and the pause overlay. The shell reuses **`@shared/pause`** for the pause
  overlay rather than hand-rolling one (contract 4, reuse-first). Pixel-authentic
  attract typography and the high-score screen layout are mc9 / mc7 respectively;
  mc6 renders them *functionally* so each story is hand-verifiable.

**Rejected alternative — a flat six-way phase enum.** Modelling
`attract|setup|play|pause|over|between` as six peer states contradicts the ROM
(finding §1), duplicates the SETUP task list as pseudo-states, and orphans the
mc3/mc4 wave-transition tests. Following the ROM's three-states-plus-a-flag keeps
`state.ts` small and the existing tests re-homeable.

## Stories — ROM-faithful order

Sliced by file surface (grouping edits to `state.ts` / `game.ts` per the
review-as-generator grooming rule). Point estimates are the Architect's sketch;
grooming refines them. Matches the six stories materialized in
`sprint/epic-mc6.yaml`.

### mc6-1 — Phase machine *(the seam grows)*

Extend `Phase` to `'attract' | 'setup' | 'play' | 'pause'`, add `attract:
boolean`, and implement the pure MAINLINE dispatch (`W3MAIN.MAC:475`, dispatch
`:507-527`; initial `S.SETU` at `:491-493`). `'between'`/`'over'` re-expressed as
SETUP tasks, keeping mc3-3 (all-cities-dead→over) and mc4 (wave transition) green
against the new shape.

- **Changed:** `state.ts` (the transition + task list), `game.ts` (dispatch in
  `stepGame`).
- **Claims:** `MC-STATE-PLAY` (0), `MC-STATE-PAUS` (negative), `MC-STATE-SETU`
  (positive), `MC-STATE-INIT` (boots to SETUP/attract).
- **Not:** no attract driver yet, no new screens — the structural opener.

### mc6-2 — SETUP → PLAY start-of-game

A start/coin action advances `'attract'`/`'over'` → `'setup'` → `'play'`,
reseeding `createGame` (6 live cities, 3 bases full ammo, wave-1 schedule) through
the SETUP `NEWGAM` task (`SETUP1: .WORD NEWGAM-1`, `W3MAIN.MAC:583`; `NEWGAM`,
`:3835`).

- **Changed:** `state.ts` (the NEWGAM task), `game.ts` (reseed on transition),
  `input.ts` (start action).
- **Claims:** `MC-SETUP-NEWGAM` (the new-game task seeds a full field).

### mc6-3 — PAUSE toggle

`'play'` ↔ `'pause'` freezes enemy motion, ABM flight, scoring and spawn
(`stepGame` a no-op but the clock) while paused, resuming to `'play'`; the shell
binds the pause key and reuses `@shared/pause` for the overlay. Cadence + resume
from `PAUSE STATE` (`W3MAIN.MAC:615`; 4/60 s `AND I,03`; `NXTSTA`→`STATE` resume
`:635-641`).

- **Changed:** `state.ts` (pause/resume), `game.ts` (frozen step), `input.ts`
  (pause key), `render.ts` (`@shared/pause` overlay).
- **Claims:** `MC-PAUSE-CADENCE` (4/60 s update), `MC-PAUSE-RESUME` (→play).

### mc6-4 — Self-playing attract (smart-cursor demo)

A deterministic seeded auto-player (`attract.ts`) drives cursor + fire during
`'attract'` so the field plays itself; any input → `'setup'`. Pure, seeded, no
clock (`AUTCUR`, `W3MAIN.MAC:891`).

- **New:** `attract.ts`. **Changed:** `game.ts` (fold synthesized input into the
  attract step), `input.ts` (any input starts a game).
- **Claims:** `MC-ATTRACT-BOOT` (cabinet boots to attract), and the auto-player's
  cited targeting rule.

### mc6-5 — Attract presentation: scrolling messages + THE END

The ROM attract text sequence (`REFRESH ATTRACT MODE MESSAGES`,
`W3MAIN.MAC:5277`; `SCROLL ATTRACT MESSAGES ACROSS SCREEN`, `:5331`) and the
"THE END" screen, rendered in shell, plus the high-score display **slot** mc7
fills with the ladder. Pin the ROM message strings + scroll cadence at RED.

- **Changed:** `state.ts` (attract message sequencing as SETUP/attract tasks),
  `render.ts` (scroll + THE END). Exposes the mc7 ladder hook.
- **Claims:** the attract message strings' ROM location + `MC-SCROLL-CADENCE`.

### mc6-6 — Game-over → attract timeout

After the game-over SETUP task, a cited ROM cadence (the `S.PAUS` inter-screen
wait, `W3MAIN.MAC:4037`) auto-returns to `'attract'`, closing the MAINLINE loop.

- **Changed:** `state.ts` (the timeout task), `game.ts`.
- **Claims:** `MC-GAMEOVER-TIMEOUT` (the wait constant before attract).

## Testability notes for TEA

- `state.ts` and `attract.ts` are pure, seeded, unit-testable exactly like
  `cursor.ts`/`icbm.ts`: deterministic transitions over plain data. A fixed
  `createGame(seed)` replays the whole lifecycle — attract demo, start, play,
  pause, over, back to attract — frame-by-frame, the mc6 integration backbone.
- **Pin the dispatch boundary, not the interior:** `STATE == 0` vs `< 0` vs `> 0`
  is a three-way sign split — test all three, and test the *transitions* between
  them (play→pause→play, over→attract, attract→setup→play), not just steady state.
- **The freeze must be observably frozen:** in `'pause'`, assert enemies, ABMs,
  score and spawn are byte-identical across a step while `frame` advances — a
  vacuous "returns pause" assertion misses a leaking sim.
- **Attract must not mutate the real high-score / credit state**, and any input
  must leave attract deterministically. Pin "input during attract → setup" and
  "no input → demo continues."
- **Re-home, don't delete, the mc3/mc4 phase tests:** mc3-3 (all-cities-dead→over)
  and mc4's wave transition move from `nextPhase`/`nextWavePhase` onto the SETUP
  task list; their assertions must survive the refactor, re-pointed, not dropped.

## Open questions

- **O-6a (phase-set shape):** `'attract' | 'setup' | 'play' | 'pause'` + `attract`
  boolean is the ROM-faithful proposal; if grooming prefers to keep an explicit
  `'over'` for render/HUD convenience, that is a shell-only alias over the
  game-over SETUP task, not a fourth core state. Resolve at mc6-1 RED.
- **O-6b (REV-01 vs REV-03 attract):** attract timing, the message strings, and
  the "THE END" screen are a place the revisions diverge. mc6 ships REV-01 and
  catalogues any REV-03 delta in the relevant story's claim note if/when the
  REV-03 source is vendored (shares the blocker with mc5-4).
- **O-6c (SLAM/tilt):** `SLAMSN` (`W3MAIN.MAC:283`) is the tilt-switch sound flag;
  there is no browser tilt input (mc8-6 filed it as maybe-won't-do). mc6 does not
  add a tilt *state*; if a tilt input is ever decided, it enters as a PAUSE-like
  interrupt, out of scope here.
