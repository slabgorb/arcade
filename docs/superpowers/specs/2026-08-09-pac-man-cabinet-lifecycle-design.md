# Pac-Man — cabinet lifecycle (attract + state machine + freeze pauses) + four fidelity/accessibility fixes

**Epic:** pm4 (proposed) · **Author:** Architect (Vito Cornelius) · **Date:** 2026-08-09
**Template:** the Missile Command `mc6` (attract + state machine) and `mc7`
(high-score ladder + name entry) epics, adapted to Pac-Man.
**Ground truth:** `plugins/pac-man/reference/source/pacman.asm` (the vendored
quarry the game already cites throughout), `glossary.md`, `docs/rom-study/claims`.

---

## 1. Problem

Pac-Man has no cabinet lifecycle. `core/game.ts` defines only
`GamePhase = 'playing' | 'game-over'`; `createGameState` drops the player
straight into `'playing'` with Blinky already released and moving. There is no
attract mode, no start/coin gate, no READY! freeze, no death pause, no
level-clear pause. Consequences the boss reported, each traced to source:

| Report | Root cause (verified) |
|--------|----------------------|
| "A ghost spawns immediately; the game begins the moment you touch a key, THEN the intro plays." | No `attract`/`ready` phase. `createGameState` → `phase:'playing'`; `house.released.blinky = true` from frame 0. `overlays.ts` clears the READY! banner on the **first dot eaten**, so the sim runs live *under* the intro. |
| "Animations go way too fast." | `drawPacman`/`drawGhost` index sprites with `animPhase % len`, where `animPhase` is `game.pac.frame` / `game.ghostFrame[id]` — both increment **every 60 Hz sim step**. Chomp/legs cycle at 15–30 Hz. `ghostFrame` is worse: it is the *speed-pattern* cursor, not an animation cursor. |
| "The ghost-house wall Pac-Man can't cross seems wrong." | **Not a bug in the rule.** `maze.ts` bars Pac-Man from `house`/`gate` tiles (`isWalkable(..,'pac-man') === false`) — authentic. Likely a maze-authoring artifact near the house. Needs a visual playtest to confirm/deny (investigation, not a blind fix). |
| "Ghosts path back into the house and stay there." | An eaten ghost is teleported to its spawn tile with `released=false` (`game.ts:525-529`). There is **no eyes-return / regenerate / forced-exit** behavior; re-release is gated on the same dot counter as the initial release, so it loiters. |
| "On screen clear a flashing white full-screen effect plays and the game keeps playing — I have epilepsy, lose it." | `overlays.ts` fills the **entire 224×288 buffer** solid white (`FLASH_COLOR='#ffffff'`, `fillRect(0,0,LOGICAL_W,LOGICAL_H)`) strobing ~3.75 Hz for 96 frames on `level-cleared`, and `advanceLevel` runs the **same** frame so the sim never freezes. Photosensitivity hazard **and** non-authentic (the arcade recolors maze *walls*, not the whole screen). |

**What is already done (the `mc7` half):** the high-score ladder and initials
entry are already ported into `game.ts` (`qualifiesForHighScore`,
`insertHighScore`, `nameEntry`, `enterInitial`, `confirmNameEntry`) and wired to
one-origin `localStorage` in `main.ts`. Only two `mc7`-tail pieces remain, and
they need the attract screen to exist first: seed a **default** ladder and
**display** the ladder on the attract screen (the `mc7-4` equivalent). These are
folded into pm4-6, not a separate epic.

---

## 2. Ground truth (ROM citations)

The whole cabinet lifecycle in the ROM keys off master state byte **`#4e00`**,
dispatched from the main routine. Verified in the vendored quarry:

- **Master-state dispatch (the MAINLINE analogue):** `pacman.asm:0195`, `:01ad`,
  `:01c6`, `:032d`, `:03c8` all `ld a,(#4e00)` then branch.
- **State writes (the transitions):** `pacman.asm:0984` (`ld (#4e00),a`),
  `:269a`, `:318c`.
- **Coin → credit:** `pacman.asm:02df` (coins-per-credit accounting).
- **1/2-player select + start-button check:** `pacman.asm:061e`.
- **Attract/setup text table** (the strings the attract + ready screens draw):
  `pacman.asm:36a7` → `CREDIT`, `PLAYER ONE`, `READY?`, `PUSH START BUTTON`;
  `:36f1` the coin/credit lines.

Citations **not yet anchored** (grep did not isolate a clean line — the TEA
anchors these at RED against the quarry, do **not** fabricate a line number, cf.
the "sm-setup fabricates ROM citations" gotcha): the level-complete maze-flash
routine, the READY! delay constant, and the eaten-ghost **eyes-return** routine.
Each new `src/core` constant carries a claim gated by `citations.test.ts`;
`purity.test.ts` stays green (no clock/DOM/`Math.random` in core).

---

## 3. Design — the pure MAINLINE state machine

Extend `GamePhase` and add a pure, seeded, clock-free transition inside
`stepGame` (same contract as `mc6-1`). All phase timers are **frame counters**
carried in `GameState` and advanced in `stepGame`; the attract auto-player and
every random choice run off the existing seeded `@shared/rng` in `ModeState` —
never a wall clock, never a second entropy source.

```
GamePhase = 'attract' | 'ready' | 'playing' | 'dying' | 'level-clear' | 'game-over'

  attract ──(start/coin input)──▶ ready ──(ready timer)──▶ playing
  playing ──(pac-died, lives>0)──▶ dying ──(death timer)──▶ ready
  playing ──(pac-died, lives=0)──▶ game-over
  playing ──(all dots)──────────▶ level-clear ──(clear timer)──▶ ready (level+1)
  game-over ──(name-entry done, then timeout)──▶ attract
```

**Deliberate deviation from the `mc6` template — no `pause` phase.** The Pac-Man
cabinet has no pause button; `mc6` added one because Missile Command's ROM has a
PAUSE state. Adding one here would be un-authentic and the boss did not ask for
it. Omitted by design.

**Deliberate accessibility deviation — `level-clear` freezes and does NOT
flash.** Per the boss's explicit instruction (photosensitive epilepsy), the
level-clear effect is **freeze the sim + hold a static frame + draw the next
maze** — zero full-screen luminance flashing. Spec-authority note: a direct user
health instruction outranks ROM fidelity (and the current full-screen white fill
is non-authentic anyway). This deviation is **decided**; the pipeline must not
"restore authenticity" here. Recorded as a Design Deviation at story time.

The `dying` and `level-clear` phases replace today's *instant* respawn/advance —
`game.ts`'s own header already flagged the missing death/level-clear pause as a
future shell task; it belongs in the state machine.

---

## 4. Proposed epic pm4 — story breakdown

Total 34 pts. Three tracks; the safety fix ships first and alone.

> **Materialized ID map (2026-08-10).** The epic was created via `pf epic add` /
> `pf sprint story add`, which auto-number stories in creation order. The IDs
> below in prose (pm4-8/9/10 etc.) were the *proposed* numbers; the **actual**
> sprint IDs are: **pm4-1** safety strobe · **pm4-2** animation-hold · **pm4-3**
> eyes-return · **pm4-4** house-wall audit · **pm4-5** phase machine (the
> dependency anchor) · **pm4-6** start→ready→play · **pm4-7** freeze pauses ·
> **pm4-8** self-play demo · **pm4-9** attract presentation + ladder (depends-on
> pm4-8) · **pm4-10** game-over→attract timeout. pm4-6/7/8/10 depend-on pm4-5.

### Track A — safety (ship immediately, shell-only)

| Story | Pts | Scope |
|-------|-----|-------|
| **pm4-1** [SAFETY] | 2 | Remove the full-screen white level-clear strobe (`overlays.ts` only). Delete the `fillRect(0,0,LOGICAL_W,LOGICAL_H)` white fill; hold a brief static frame instead. Independent of the state machine — shippable today. **pm4-4 later builds the proper freeze on top of this; it must not reintroduce the strobe.** |

### Track B — independent bug fixes (parallelisable with Track C)

| Story | Pts | Scope |
|-------|-----|-------|
| **pm4-8** animation-hold | 2 | Shell render fix: add an animation-hold divisor so Pac-Man chomp + ghost legs advance every N sim frames, not every frame. `render.ts` + `main.ts` only; core untouched. The hold cadence is an honest-uncited shell-timing choice (same posture as the existing `FLASH_HALF_PERIOD`). |
| **pm4-9** eyes-return | 5 | Core: an eaten ghost becomes **eyes**, returns to the house, regenerates, and **forcibly leaves** — not gated on the dot counter. Fixes ghosts loitering in the house. Touches `game.ts` (eaten branch), `house.ts` (an exit/regenerate path distinct from initial release), `ghost.ts` (eyes-mode traversal), and the `'eaten'` render mode `render.ts` already implements but never receives. Anchor the eyes-return routine citation at RED. |
| **pm4-10** house-wall audit | 2 | Investigation: visual playtest (Playwright headless, per the arcade playtest memo) to determine whether the reported "wall Pac-Man can't cross" is the authentic `gate`/`house` bar (expected → close as no-op with evidence) or a maze-authoring error in `maze.ts`'s row table (→ fix the table only). May close without a code change. |

### Track C — the cabinet lifecycle (the mc6 spine; C-stories depend on pm4-2)

| Story | Pts | Scope |
|-------|-----|-------|
| **pm4-2** phase machine | 5 | Extend `GamePhase` to `attract\|ready\|dying\|level-clear` (`playing`/`game-over` exist) + a pure MAINLINE dispatch over frame-count timers, seeded, no clock. Cite `pacman.asm:0195` dispatch, `:0984/:269a/:318c` writes. |
| **pm4-3** start → ready → play | 3 | A start/coin action advances `attract\|game-over → ready → playing`, reseeding `createGameState`; a READY! freeze (timer) runs the intro **before** the sim moves — fixes "the game begins before the intro." Blinky no longer moves during `attract`/`ready`. Cite `:061e`, `:36a7` (READY?/PUSH START). |
| **pm4-4** freeze pauses | 5 | The `level-clear` and `dying` freeze phases: on `level-cleared`, freeze → hold → `advanceLevel` → `ready`; on `pac-died` with lives left, freeze → death-anim window → respawn → `ready`. Makes the boss's "freeze + no flash" real and removes the instant advance/respawn. Builds on pm4-1. |
| **pm4-5** self-play demo | 5 | A deterministic seeded auto-player drives Pac-Man during `attract` so the maze plays itself (ghost AI already runs); any input → `ready`. Pure attract driver in `src/core`, seeded RNG, no clock. Mirrors `mc6-4`. |
| **pm4-6** attract presentation + ladder | 3 | Render the attract screen: title + the (already-built) high-score ladder + the ROM attract text, and **seed a default ladder** (the `mc7-4` tail). Pin the ROM strings/cadence at RED (`:36a7` table). Depends on pm4-2 (attract phase) and reads pm4-5's demo underneath. |
| **pm4-7** game-over → attract timeout | 2 | After `game-over` (and name entry, if the run qualified), a cited cadence auto-returns to `attract`, closing the MAINLINE loop and replacing today's manual Enter-to-restart in `main.ts`. |

---

## 5. Sequencing & handoff

1. **pm4-1 first, on its own PR** — it protects the boss's health and needs
   nothing else. Do not batch it behind the state machine.
2. **Track B** (pm4-8/9/10) runs in parallel with Track C; none touch the phase
   enum, so they won't collide with pm4-2 beyond ordinary `game.ts` merges.
3. **Track C** is strictly ordered: pm4-2 → pm4-3 → pm4-4 → pm4-5 → pm4-6 →
   pm4-7. pm4-4 supersedes pm4-1's stopgap (freeze on top of no-strobe).

**Contract for every story:** `purity.test.ts` green (core stays clock-free /
DOM-free / `Math.random`-free — attract timers and the auto-player are frame
counts + seeded RNG); each new `src/core` constant carries a
`citations.test.ts`-gated claim; shell-timing choices (animation hold, freeze
hold length) are honest-uncited, matching the existing `FLASH_HALF_PERIOD`
posture. Playtest the flash/lifecycle changes with a **static screenshot**, not a
live strobe, given the boss's photosensitivity.

## 6. Out of scope

- A `pause` phase (not authentic to Pac-Man; not requested).
- Coin/credit economy UI beyond a start gate (this cabinet has no money model —
  cf. the "no coin-op urgency mechanics" standing rule).
- Intermission/coffee-break cutscenes between levels.
- Any change to the maze row table beyond a genuine authoring bug proven by
  pm4-10.
