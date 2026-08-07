# Joust cabinet lifecycle — design (epic jt10)

**Date:** 2026-08-07
**Author:** Architect (Mimir)
**Status:** Approved (design), pending epic materialization
**Sprint:** 2632 — ROM fidelity
**Fidelity target:** Faithful to the 1982 ROM (`reference/williams-source/joust/`)

## Problem

Joust's shell (`plugins/joust/src/main.ts`) boots **straight into a seeded wave-1
game** and steps it forever. The cabinet lifecycle a real Joust machine cycles
through — attract/title, coin-up 1P/2P select, game over, high-score entry — is
absent. Text is drawn only as an `8px monospace` dev overlay; **Joust's own two
fonts are not transcribed at all.**

This is the "cabinet stuff": the outer shell around gameplay that makes the game
feel like the machine, not a tech demo.

## What already exists (the reuse-first ledger)

The game-over *logic* is already modelled in core; only its presentation and the
loop back to attract are missing.

| Piece | State today | Location |
|---|---|---|
| `GOVER` tri-state (over / running / attract) + `settleGameOver` | **Shipped** (jt4-4) | `src/core/game.ts` |
| Per-player `out` / `lives` co-op ledger | **Shipped** (jt4-2/jt4-4) | `src/core/game.ts` |
| Self-play sim (the substrate for attract) | **Shipped** | `src/core/demo.ts` |
| Fixed-timestep shell clock | **Shipped** | `src/shell/timebase.ts` (`pumpFrames`) |
| Raster atlas/blit pipeline | **Shipped** | `src/shell/render.ts`, `main.ts` `blit`/`blitOp` |
| Shared high-score storage + qualifies + initials buffer | **Shipped** | `@shared/highscore`, `@shared/name-entry` |

**Reused, not rebuilt:** `GOVER`/`out`/`lives`/`settleGameOver`, `demo.ts`,
`@shared/highscore`, the atlas/blit path, `pumpFrames`.

## Scope

**In scope** (the three the owner named, plus high-score entry):

1. Attract cycle — title screen, high-score table, self-play demo, rules/banner
   pages (e.g. *BEWARE OF THE "UNBEATABLE?" PTERODACTYL*, *HOME OF THE LAVA
   TROLL*).
2. 1P/2P start select (with a `CREDITS` line — **no coin economy**).
3. Game over.
4. High-score initials entry + the `JOUST CHAMPIONS` table.

**Out of scope:** the coin/credit economy, operator/bookkeeping/service menus
(pricing, buzzards-per-credit, audits) — `CREDITS` renders as a static line, not
a live coin counter. These are the `ATT.SRC` operator loop and can be a later
epic if wanted.

## Architecture

### The one real decision: where the mode machine lives

Joust already has a **two-tier core**: the sim (`frame.ts` `GameState`) wrapped by
the session (`game.ts` `GameState` — scores, lives, `GOVER`). The cabinet
lifecycle is a **third tier above session**, exactly as tempest layers its `Mode`
(`core/state.ts`) above its sim.

**Decision:** a new pure core module `plugins/joust/src/core/cabinet.ts` holding a
`CabinetState { mode, ... }` that *wraps* `createGame` / `stepGame` the same way
`game.ts` wraps the sim. `main.ts` becomes a thin shell that renders whatever mode
it is handed.

```
sim (frame.ts) ⊂ session (game.ts) ⊂ cabinet (cabinet.ts)   ← new tier
```

**Alternatives rejected:**
- *`mode` inside the session `GameState`* — bloats the score/lives layer with
  attract concerns and couples gameplay to presentation.
- *A shell-side state machine in `main.ts`* — would drift, cannot be pinned by the
  vitest core suite, and violates the core/shell purity boundary the jt1-7 scanner
  enforces.

### The mode set

```ts
type CabinetMode =
  | 'attract'    // self-play + cycling attract pages
  | 'title'      // JOUST logo + presented-by / extra-mount / copyright
  | 'select'     // 1P / 2P start
  | 'playing'    // the game (wraps stepGame)
  | 'gameover'   // GAME OVER
  | 'highscore'  // initials entry, then JOUST CHAMPIONS table
```

`GOVER` is the hinge between the cabinet tier and the session tier it already
owns:

- `GOVER_ATTRACT ($7F)` → self-play under `attract`
- `GOVER_RUNNING (-1)` → `playing`
- `GOVER_OVER (0)` from `settleGameOver` → `gameover` → `highscore` (iff the score
  qualifies) → back to `attract`

`attract` is itself a sub-cycle: an attract-page scheduler steps through
title → high-score table → self-play demo → rules/banner pages and repeats
(the `ATT.SRC` sequence; colours cycle every ~2.5 s per `ATT.SRC:173`).

### The fonts (prerequisite for every screen)

Joust ships **two** fonts, both dispatched from `MESSAGE.SRC` and both visible in
the reference captures:

- **`FONT35`** — 3×5, glyph table `S0…` (`MESSAGE.SRC:295`). The tight font:
  scores, BCD, `CREDITS`. Output routines `CHR35` / `PHR35` / `BCD35` / `OUTT35`.
- **`FONT57`** — 5×7, glyph table `L0…` (`MESSAGE.SRC:241`). The stylized wide
  font: all banner/title text. Output routines `OUTTEXT` / `ERTEXT`.

Both are transcribed into new **pure core data modules** (glyph bitmaps are data),
consumed by a new **shell raster text renderer** that lays out a string in a
chosen font + colour via the existing atlas/blit path. This is joust's own raster
font — **not** the shared vector `@shared/font`. (The SH2 shared-font playbook is
the opposite migration and does not apply here.)

The **JOUST logo** (title screen) is a separate *picture* transcription, not a
font glyph — see Open Questions.

### Screens (shell overlays, selected by `mode`)

| Screen | Reuses | New | ROM citation targets |
|---|---|---|---|
| Title | — | logo blit + `FONT57` text | JOUST logo pic, `MS17 'EXTRA MOUNT EVERY '`, `MS18 ',000 POINTS'`, `COPYRGT '(C) 1982…'` |
| Attract self-play | `demo.ts`, `pumpFrames` | banner overlays + attract-page scheduler | `ATT.SRC` page sequence + colour cycle (`ATT.SRC:173`) |
| 1P/2P select | — | select overlay + credits row | `PLY1 $1D 'ONE PLAYER START'`, `PLY2 $1E 'TWO PLAYER START'`, `MSCRD $50 'CREDITS '` |
| Game over | `GOVER` / `settleGameOver` | `GAME OVER` overlay + transition | `GAMEND` (`EQU.SRC:237`) |
| High-score entry + table | `@shared/highscore`, `@shared/name-entry` | initials entry in joust font + `JOUST CHAMPIONS` table | `GODM $67 'ENTER THY NAME MY LORD!'`, `PEONM $68 'ENTER YOUR INITIALS'`, `JCH $4F 'JOUST CHAMPIONS'` |

The high-score initials buffer/qualifies logic lives in **core** (per the fleet
rule: initials live in `src/core`, shell holds only storage + the save trigger).

## Story decomposition (font-first)

Proposed epic **jt10** (jt1–jt9 taken). ~7 stories:

1. **jt10-1 — Font port.** `FONT35` + `FONT57` core data + shell raster text
   renderer. *Blocks every other story.*
2. **jt10-2 — Cabinet state machine.** `cabinet.ts` modes + transitions wrapping
   the session; wire `GOVER`. No screens yet — pins the machine.
3. **jt10-3 — Title screen.** JOUST logo transcription + title lines + colour
   cycle.
4. **jt10-4 — Attract cycle.** Self-play (`demo.ts`) + banners + attract-page
   scheduler. **Folds in / supersedes `ad1-4`** ("joust attract simulation — wire
   GOVER"), which is retired from epic `ad1` into this epic.
5. **jt10-5 — 1P/2P select + credits + START.**
6. **jt10-6 — Game-over screen.** Wire `GOVER_OVER` → `GAME OVER` → transition.
7. **jt10-7 — High-score entry + JOUST CHAMPIONS table.** Shared highscore module
   + joust font.

Dependency order: 1 → 2 → {3, 4, 5, 6} → 7. Story 1 is a hard prerequisite;
2 gates the screen stories; 7 depends on the machine reaching `gameover`.

## Not extracting to `src/shared`

The mode machine stays in `plugins/joust/src/core/`. Joust is only the **second**
game to grow a cabinet mode machine and tempest's is bespoke; CLAUDE.md's "extract
only once a second game proves the duplication is real" bar is about *implementation*
sharing, and the two machines share a shape (a mode enum) more than code. Revisit
extraction when a *third* game needs one.

## Testing strategy

- **Core (vitest, per-story):** `cabinet.ts` transitions pinned as pure
  transforms — attract→select→playing→gameover→highscore→attract, and the `GOVER`
  hinge (all-players-out → `gameover`; qualifies → `highscore`). Font modules
  pinned by glyph-bitmap fixtures transcribed from `MESSAGE.SRC` under the
  citation gate.
- **Purity:** every new `src/core/` module is swept by the jt1-7 boundary scanner
  (no clock, no browser surface, no shell import). Avoid the word `window.` /
  `document.` in comments (the scanner reads comment text).
- **Shell:** raster text renderer verified via the `render.ts?raw` source-wiring
  idiom where a live canvas can't be asserted; a human smoke test confirms each
  screen renders in the correct font.
- **Fidelity gate:** each transcription (fonts, logo, phrases) cites its
  `JOUSTRV4.SRC` / `MESSAGE.SRC` / `PHRASE.SRC` line under the joust citation
  guard.

## Open questions (quarry for TEA before RED)

1. **JOUST logo geometry** — where in the ROM is it built? It is **not** among the
   entity `.PIC` files (`BUZZARD.PIC`, `CLIFF.PIC`, …); most likely an `ATT.SRC`
   picture routine. Needs a quarry pass before jt10-3.
2. **Title phrasing / revision.** The reference title capture shows *"PRESENTED
   BY:"* but `PHRASE.SRC` carries `NEW1 'THIS IS JOUST'` / `NEW2 'DESIGNED BY
   WILLIAMS ELECTROINCS INC.'`. Resolve which revision (`JOUSTRV1..4.SRC`) matches
   the target capture and pin its exact phrase.
3. **Attract page order & timings.** The exact `ATT.SRC` page sequence and the
   colour-cycle cadence (`ATT.SRC:173` ≈ 2.5 s).

## Migration note

`ad1-4` (epic `ad1`, "Attract demos") is superseded by **jt10-4** and should be
moved into jt10 at grooming (`pf sprint story move`, which renumbers to the target
epic's next id — annotate the old id). The `ad1` epic keeps the other cabinets'
attract stories.
