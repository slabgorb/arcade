# Story jt10-6: Game-over screen

**DERIVED ACs** — the epic YAML's `description` and `acceptance_criteria` were `null`. These acceptance criteria are derived from the primary source material cited below and are the CANONICAL reference for RED/Review.

> ⚠ **CORRECTION (TEA, RED phase — user-ruled). The overlay TEXT and its CITATION in AC-1/AC-6 below are WRONG; the RED tests pin the corrected values. Do NOT implement `'GAME OVER'` / `GAMEND`.**
>
> The derived AC named the overlay text **`GAME OVER`** cited to **`GAMEND` (EQU.SRC:237)**. Both are wrong against the ROM:
> - `GAMEND` (EQU.SRC:237) is **`RMB 3`** — a RAM variable for the "GAME OVER H.S.T.D. CHECK AND ENTER ROUTINE", **not a message string**.
> - The whole-cabinet game-over overlay Joust actually displays is **`'THY GAME IS OVER'`** — `MSGOVR EQU $00` (**MESSEQU.SRC:18**), put up by the routine literally labelled "GAME OVER MESSAGE": `GOVERM` (JOUSTRV4.SRC:674 `LDD #256*MSGOVR+…  PUT UP GAME OVER MESSAGE`), held ~**88 ticks (~1.47s)** by `GOVWAT` (JOUSTRV4.SRC:678 `#11  8*11 OR 88 TICK WAIT`) before `JMP GAMEND`.
> - `'GAME OVER'` = `MSGAMO $6D` (MESSEQU.SRC:130) is a **different** string — the per-player banner `GAMOV1` ("GAME OVER FOR PLAYER 1 OR 2", a 3-second message). **Not this story's string.**
>
> **User ruling (RED):** ship the faithful **`'THY GAME IS OVER'`** (`MSGOVR $00`, MESSEQU.SRC:18). So:
> - **AC-1/AC-6 string:** the overlay text is `'THY GAME IS OVER'`, exported as a core constant **`GAME_OVER_TEXT`** from `src/core/cabinet.ts` (mirroring `SEL_*` in `core/select.ts`), imported by the shell — never re-hardcoded. Cite `MSGOVR $00, MESSEQU.SRC:18`.
> - **AC-1 font:** the comment says "FONT57 (5×7)" — FONT57 is **6×7** (cellWidth 6, cellHeight 7); FONT35 is the 3×5 font. The banner is FONT57.
> - **AC-2 duration:** the authentic hold is **~88 ticks (~1.47s)**, then `afterGameOver`; a shell timing constant, tunable. The RED pins the hold's *presence*, not the exact value.
>
> See the session file's **Delivery Findings** (`### TEA (test design)`) for the full record. RED test files: `tests/gameover-screen.test.ts`, `tests/gameover-wiring.test.ts`, `tests/helpers/gameover-contract.ts`.

## Story Metadata
- **ID:** jt10-6
- **Title:** Game-over screen: wire GOVER_OVER/settleGameOver to a GAME OVER overlay and the transition to highscore-or-attract
- **Type:** feature
- **Points:** 2
- **Epic:** jt10 (Cabinet lifecycle)
- **Workflow:** tdd (phased: RED → GREEN → review)
- **Priority:** p2

## Context Summary

The cabinet lifecycle epic jt10 builds the full state machine and screens for Joust. This story implements the **game-over screen** — the overlay rendered when all players are out (cabinet mode `'gameover'`), and the transition OUT to either high-score entry (if score qualifies) or back to attract.

**Critical fact:** The core game-over logic (`GOVER_OVER`, `settleGameOver`, `afterGameOver`, `modeForGover`) already exists and is proven (jt4-4, jt10-2). This story is **WIRING + PRESENTATION only** — no new simulation logic.

## Acceptance Criteria

### AC-1: GAME OVER overlay render (shell)
The shell must render a `GAME OVER` overlay when `cabinet.mode === 'gameover'`:
- Render the text `GAME OVER` in FONT57 (5×7, the stylized ROM font).
- Use the existing raster text painter: `layoutText` → `paintText` glyph ops.
- Centre the text horizontally on the 292×240 backbuffer.
- Use a transcribed palette colour (e.g. OVERLAY_COLOUR_INDEX or a distinct readable hue).
- Implement inline in `main.ts` render or as a new shell module (e.g. `src/shell/gameOverScreen.ts`); mirror jt10-5's select overlay pattern.

**ROM Citation:** `GAMEND` (EQU.SRC:237) — the game-over message label in JOUSTRV4.SRC.

### AC-2: Transition delay and routing (main.ts wiring)
When `cabinet.mode === 'gameover'`:
1. Display the overlay for a brief time (2–3 seconds; shell constant, tunable).
2. After the elapsed time, compute the next mode via `afterGameOver(cabinet, highScoreTable)`.
3. Route to `'highscore'` if the best player's score qualifies (per `@shared/highscore` logic), else `'attract'`.
4. Do NOT advance the frame counter or call `stepGame` during the gameover display — the game is already over.

**Prerequisite:** High-score table passed to `afterGameOver` (stub/empty for now; jt10-7 populates it).

### AC-3: Preserve the demo-source seam (BLOCKING constraint)
The literal `createGame(` and `stepGame(` calls in `main.ts` must remain unchanged:
- The existing `stepGame(cabinet.game, inputs)` path for `'playing'` mode must stay intact (line 277 in current main.ts).
- Do NOT refactor these calls into an abstracted function or wrapper that hides them.
- Do NOT route every frame through a cabinet-level `stepPlaying` in a way that removes the literal calls.

**Rationale:** demo-source.test.ts scans `main.ts` source text for literal `createGame(` and `stepGame(` calls (jt4-5 session seam). Removing or abstracting them breaks the seam.

### AC-4: Vitest core suite covers cabinet transitions
Write seed-replay fixtures pinning:
- The `'playing'` → `'gameover'` transition when `settleGameOver` fires `GOVER_OVER` (every player out).
- Assert that `modeForGover(GOVER_OVER)` returns `'gameover'`.
- Assert that `afterGameOver(cabinet, table)` routes correctly:
  - Score qualifies → `'highscore'`
  - Score does not qualify → `'attract'`
- No collection or type errors; `tsc --noEmit` clean.

### AC-5: Purity and scan compliance
- No new core logic (game-over decision already lives in `settleGameOver`/`GOVER_OVER`).
- Shell owns render + transition delay only.
- Core modules remain unchanged (game.ts, cabinet.ts).
- Pass the jt1-7 purity boundary scanner (no clock, no DOM, no shell import in core).

### AC-6: ROM fidelity
- The text `GAME OVER` transcribed verbatim from the ROM message at `GAMEND` (EQU.SRC:237).
- Font choice FONT57 (5×7, stylized) matched to the original cabinet.

## Primary Source Material

**Design spec:**
- `docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md`, line 22-23: "The game-over *logic* is already modelled in core; only its presentation and the loop back to attract are missing."
- Line 128 (Screens table): Game over | `GOVER` / `settleGameOver` | `GAME OVER` overlay + transition | ROM ref `GAMEND` (`EQU.SRC:237`).
- Line 148: jt10-6 — Game-over screen. Wire `GOVER_OVER` → `GAME OVER` → transition.

**Core implementation (existing, DO NOT change):**
- `plugins/joust/src/core/game.ts:183` — `GOVER_OVER = 0`: the tri-state value for game over.
- `plugins/joust/src/core/game.ts:359` — `settleGameOver(players)`: returns `{players, gover}` with `gover === GOVER_OVER` iff EVERY player is out.
- `plugins/joust/src/core/cabinet.ts:38` — `CabinetMode`: includes `'gameover'`.
- `plugins/joust/src/core/cabinet.ts:65-70` — `modeForGover(gover)`: maps `GOVER_OVER` → `'gameover'`.
- `plugins/joust/src/core/cabinet.ts:109` — `afterGameOver(cab, table)`: routes `'gameover'` → `'highscore'` (iff score qualifies) or `'attract'`.

**Prior story seam constraint:**
- `sprint/archive/jt10-5-session.md`, line 175: "The game still steps via `stepGame` directly ... so no regression; the `'playing'→'gameover'` exit is jt10-6."
- Reconciliation note (line 175–176): demo-source.test.ts requires literal `createGame(` + `stepGame(` calls. Do NOT abstract or remove them.

## Out of Scope

- Title screen (jt10-3), attract cycle (jt10-4), high-score entry (jt10-7).
- New simulation logic.
- Coin/credit economy or operator menus.

## Quarry / Gotchas for TEA

1. **High-score table source** — `afterGameOver` requires a `table: readonly HighScoreEntryBase[]` argument. For now, pass an empty array `[]` (jt10-7 will populate it). The `qualifiesForHighScore(@shared/highscore)` logic is already tested; this story just wires it.

2. **Gameover display duration** — the design spec does not mandate a specific delay (e.g. 2 seconds vs 3 seconds). Pick a reasonable shell constant (e.g. `GAMEOVER_DISPLAY_MS = 2000`) and document it in a comment. The reviewer can tune it later based on arcade reference captures.

3. **Mode transition timing** — the `'gameover'` mode is entered INSIDE `stepPlaying` (which calls `modeForGover` on the stepped game's settled GOVER). The frame loop will then render the overlay. The transition OUT (to `'highscore'` or `'attract'`) must happen OUTSIDE the step logic — add a frame counter or timestamp in `main.ts` that tracks elapsed time in the mode and fires `afterGameOver` when ready.

4. **Seam constraint enforcement** — double-check that `stepGame(cabinet.game, inputs)` remains a literal call (not abstracted). The demo-source seam is enforced at the scanner level; if you see "missing stepGame call" errors in tests after RED, the seam was broken.

5. **Font already transcribed** — FONT57 glyph data + `layoutText` renderer exist from jt10-1 (DONE). Reuse them; do NOT re-define or re-transcribe the font.

6. **Reference captures** — no `docs/reference-captures/` asset exists yet for the game-over screen. The overlay layout/colours are placeholder estimates; they can be tuned when a capture lands (logged as a minor deviation in jt10-5). No blocker.

## Notes for Implementer

- **Test-first (RED phase):** Write a core-layer test pinning the cabinet transitions (playing → gameover when all out; gameover → highscore/attract via afterGameOver). Use seed-replay fixtures with a two-player game that runs until both are out.
- **Shell (GREEN phase):** Build the overlay render (mirror select screen: `layoutSelectScreen` pattern) and the main.ts wiring (frame counter, mode check, transition).
- **Purity:** No new core functions. Game.ts and cabinet.ts stay read-only.
- **Citation:** Add a comment citing EQU.SRC:237 where the `GAME OVER` text is rendered.
