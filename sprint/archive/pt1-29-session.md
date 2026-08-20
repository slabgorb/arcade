---
story_id: "pt1-29"
jira_key: "pt1-29"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-29: defender: HUD is missing the in-play high score and the smart-bomb stock readout

## Story Details
- **ID:** pt1-29
- **Jira Key:** pt1-29
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-29-defender-hud-highscore-smartbomb
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T20:31:34Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T20:10:25Z | 2026-08-20T20:11:39Z | 1m 14s |
| red | 2026-08-20T20:11:39Z | 2026-08-20T20:18:03Z | 6m 24s |
| green | 2026-08-20T20:18:03Z | 2026-08-20T20:19:45Z | 1m 42s |
| review | 2026-08-20T20:19:45Z | 2026-08-20T20:28:18Z | 8m 33s |
| green | 2026-08-20T20:28:18Z | 2026-08-20T20:29:33Z | 1m 15s |
| review | 2026-08-20T20:29:33Z | 2026-08-20T20:31:34Z | 2m 1s |
| finish | 2026-08-20T20:31:34Z | - | - |

## Technical Approach

### Problem Summary
The HUD in defender only draws the player score, men remaining, and wave number (drawHud in scene.ts:311-315). Two critical HUD elements are missing:
1. **In-play high score readout** — the high score appears only on the game-over hall-of-fame screen, never during live play
2. **Smart-bomb stock indicator** — the smart-bomb count (state.smartBombs in sim.ts:225) is never drawn at all

### Implementation Plan

1. **Extend drawHud in plugins/defender/src/core/scene.ts**
   - Add a new text line for the high score (positioned above/below existing score, or on the opposite side)
   - Add a new text line for the smart-bomb stock (e.g., "BOMBS: X" or similar)
   - Use the existing palette-indexed text rendering pattern (colourByIndex) for both new elements

2. **Read state values**
   - High score: `state.highScores[0]?.score` or similar accessor (verify the exact field name in highscore module)
   - Smart-bomb stock: `state.smartBombs` (already tracked per sim.ts:225)

3. **Render using existing HUD text pipeline**
   - Call formatScore() for both high score and smart-bomb count
   - Use drawText or the same rendering pipeline as score/men/wave
   - Colour through palette index like existing HUD text (verify index, likely white/OBJCOL)
   - Position on-screen without occlusion of the play area

4. **Acceptance Criteria**
   - In-play high score displays on the HUD at all times during active gameplay
   - Smart-bomb count displays on the HUD showing current stock (0-N)
   - Both values update live as the game state changes (smart-bomb depletion, high score changes)
   - Text is coloured through the palette by index, consistent with existing HUD style
   - No gameplay logic changes — purely a render addition to composeFrame
   - Tests verify both values appear in the frame buffer for various game states

### ROM Reference
Per the 2026-08-20 defender gameplay render audit (plugins/defender/docs/2026-08-20-defender-gameplay-render-audit.md), the authentic Defender HUD displays both high score and smart-bomb stock during play. The ROM render routine (DEFA7.SRC or the HUD pass) draws these elements; we will match that visual presentation.

## Sm Assessment

Small (2pt), independent bug fix from the 2026-08-20 defender render audit. Scope is a pure-core render addition to `drawHud` in `plugins/defender/src/core/scene.ts` (composeFrame): add an in-play high-score readout and a smart-bomb stock indicator, both coloured through the palette by index like the existing score/men/wave text. No sim/gameplay logic changes.

Routing to **TEA** for the RED phase. Key context for test-first:
- Defender raster draw lives in **core/scene.ts** (composeFrame is pure core) — premise-check and assertions must target core, not shell (prior audit df7-5 mis-verified by grepping shell/).
- Tests should assert both values appear in the frame buffer across game states (high-score present during live play; smart-bomb count reflects `state.smartBombs`).
- Verify exact accessors before asserting: `state.smartBombs` (sim.ts:225) and the high-score source field.

## Tea Assessment

RED phase complete. Two failing test files committed (7513b2ac); **6 assertions fail** for the right reasons, and the full defender suite is otherwise green (1081 pass, only these 6 red).

**Interface decision (pinned by the tests, Dev implements):**
- **Smart-bomb stock** reads the EXISTING `state.smartBombs` — no new plumbing. `drawHud` in `plugins/defender/src/core/scene.ts` must paint it.
- **In-play high score** is NOT on `SimState` (the sim's CMOS ledger holds coins only). It's the top of the persisted hall-of-fame board (`session.board`). So `composeFrame` grows an OPTIONAL `highScore?: number` on its 5th `options` arg — **exactly mirroring pt1-20's `controlHint`** — decoupled from the game-over `hof` payload so it can't trip the hall-of-fame-vs-GAME-OVER gating. `main.ts` sources `highScore: session.board[0]?.score ?? 0` into the same composeFrame call it already runs every frame.

**RED assertions (must go GREEN):**
1. composeFrame changes when only `state.smartBombs` differs (stock reaches HUD)
2. stock 0 vs 4 render differently (readout tracks the value, not a fixed icon)
3. composeFrame with `options.highScore` differs from the plain play frame
4. two different high scores render differently (tracks the value)
5. main.ts passes `highScore:` inside the composeFrame(...) call
6. main.ts sources it from `session.board` (not a literal)

**Green-on-arrival guards (non-vacuous, guard the new code — df7-5/pt1-20 pattern):** neither readout leaks past the game-over early-return (×2); every HUD cell stays palette index 0..15; the draw is deterministic frame-to-frame; the HUD delta is a bounded overlay, never a full-frame strobe (ADR-0005 + memory `pacman-epilepsy-no-flash`).

### Rule Coverage
- **Defender draw-in-core** (memory `defender-raster-draw-lives-in-core-scene`): both readouts asserted through `core/scene.ts` `composeFrame`, never shell.
- **lang-review #15/#25 (anchored scans):** the `?raw` wiring scans anchor `highScore:` (the colon) INSIDE `composeFrame(...)` and next to `board` — excluding the pre-existing `highScoreStorage.save(session.board)` line that a bare-token scan would false-green on.
- **ADR-0005 / epilepsy safety:** strobe + determinism guards included.
- **Palette-by-index (df2):** out-of-range-index guard on the new HUD text.
- **No `<file>.ts:line` comment refs / no count guards:** tests cite symbols and ROM/precedent, not our-source line numbers.

Handing to **Dev** for GREEN.

## Delivery Findings

No upstream findings at setup time.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

No design deviations at setup time.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | confirmed 2, dismissed 1 |

**All received:** Yes (3 enabled returned, 1 with findings; 6 disabled via settings)
**Total findings:** 2 confirmed, 1 dismissed (with rationale), 0 deferred

**Working-tree audit:** `pf reviewer audit-tree` reported DIRTY but exited 0 — the known false-DIRTY over an untracked pf-written artifact (`sprint/context/context-story-pt1-29.md`, generated by sm-setup). `git status --porcelain` confirms NO source/test mutation was left behind. Not a halt.

## Reviewer Assessment

**Verdict:** REJECTED

Rework required (2 confirmed findings; preflight GREEN 1087/1087, lint clean, security clean).

The implementation is correct on the happy path and the tests are well-anchored (rule-checker confirmed the `?raw` wiring scan is mutation-testable, not a decoy match). Two confirmed findings block:

### [RULE] Finding 1 (rule #21, correctness, high) — `main.ts:175` trusts `board[0]` as the max; the codebase's own standard is `Math.max`
`highScore: session.board[0]?.score ?? 0` assumes `session.board` is sorted descending. That invariant is maintained only by `insertHighScore` on WRITE — the load path (`@shared/highscore` `parseTable`, highscore.ts:499-511) does `parsed.filter(validator)` with **no sort**. So on corrupt or hand-edited localStorage, `board[0]` may not be the true best, and the in-play readout would present a LOWER number as the high score. The project already defends against this exact case for the identical store, in two places — one of them **this very file**:
- `src/shared/highscore.ts:607-612` (`maxScoreIn`, lobby tile): *"Takes the MAX rather than row 0: the table is written sorted, but corrupt or hand-edited data must still yield the true best, never a lower number presented as the top score."*
- `plugins/defender/src/core/scene.ts:357-361` (defender's own hall-of-fame): documents the board as adversarial (*"loaded from one-origin localStorage, which any script on the origin (or a devtools edit) can write"*).
Not a nullish bug (`?? 0` is correct for the empty board). **Fix:** derive the max defensively, e.g. `Math.max(0, ...session.board.map((r) => r.score))` (rows are already finite-validated by `parseTable`'s validator). `maxScoreIn` itself is private and takes a raw string, so it is not a drop-in import.

### [RULE] Finding 2 (rule #17, doc staleness, minor) — `composeFrame` docstring omits the HUD fields
`scene.ts:408-415` still summarizes the overlay as *"the df5-7 scanner strip + score/men HUD"*. It never mentioned `wave` (stale since df7-5) and now omits the high score and smart-bomb stock this diff adds. `drawHud`'s own docstring WAS updated correctly. **Fix:** update the summary line to name the wave, high score and smart-bomb stock (clear the pre-existing df7-5 gap while here).

### Dismissed
- `[SEC]` reviewer-security returned **clean** — the change adds two numeric HUD readouts to a pure Canvas-2D bitmap writer (`writeText`), no DOM/network/storage-write/injection surface; `String(highScore)`/`String(state.smartBombs)` feed a glyph writer, not `innerHTML`. Nothing to confirm.
- `[RULE]` rule-checker folded the docstring into its finding-set as two #17 instances; I treat them as one finding (Finding 2). No other dismissals — preflight clean; all other subagents disabled.

### Confirmed compliant (load-bearing rules)
Draw-in-core (both writes in `core/scene.ts` `drawHud`), core purity (no I/O added), palette-by-index (`TEXT_COLOUR = 9`), ADR-0005/epilepsy (determinism + no-strobe + 0..15 guards all green), no `<file>.ts:line` test comment refs, no count guards.

Routing to **Dev** for rework.
## Subagent Results

**Cycle: 1**

Method: **targeted re-verification** of the two confirmed findings via direct source probes (the diff delta is small and characterized: one expression in main.ts + three comment updates), plus a fresh full-suite + lint run. Not a fresh generalist sweep — the previously enabled specialists' domains are re-verified below.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes — re-verified | clean | none | N/A — full defender suite 1087/1087 + `tsc --noEmit` clean on the rework commit (ec8a2b3b) |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | Yes — re-verified | clean | none | N/A — rework touches only a numeric `Math.max` over already-validated board rows; no new DOM/network/storage/injection surface |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes — re-verified | clean | none | both prior findings confirmed FIXED (see assessment) |

**All received:** Yes (3 enabled re-verified; 6 disabled via settings)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred — both prior findings resolved

**Working-tree audit:** `pf reviewer audit-tree` DIRTY but exit 0 — same benign false-DIRTY over the untracked `sprint/context/context-story-pt1-29.md`; `git status --porcelain` shows no source/test mutation.

## Reviewer Assessment

**Cycle: 1**

**Verdict:** APPROVED

Both round-1 findings are fixed; preflight GREEN (1087/1087), lint clean, security clean.

### [RULE] Finding 1 (rule #21) — RESOLVED
`main.ts:182` is now `highScore: Math.max(0, ...session.board.map((row) => row.score))` — the true best regardless of stored order, matching the codebase's own `maxScoreIn` / hall-of-fame distrust of the adversarial localStorage board. Verified: empty board → `Math.max(0)` = 0; a populated out-of-order board → the max (probed `Math.max(0, 500, 900, 700)` = 900, not row 0). Rows are finite-validated by `@shared/highscore` `parseTable` before they reach here. The wiring test's `highScore:`-near-`board` anchor still holds (the expression names `session.board`).

### [RULE] Finding 2 (rule #17) — RESOLVED
`composeFrame`'s docstring now reads "the HUD (score, men, df7-5 wave, and pt1-29 in-play high score + smart-bomb stock)"; the drawHud call-site comment and the `HUD_HISCORE_Y` constant comment were likewise corrected (the latter from "the top of the persisted board" to "the best score on the persisted board", matching the new semantics). The pre-existing df7-5 `wave` omission is cleared too.

### [SEC] — clean (unchanged)
The rework is a numeric `Math.max` over already-validated board rows feeding the same bitmap glyph writer; no new injection/DOM/network/storage surface.

### Confirmed compliant (load-bearing rules, re-checked)
Draw-in-core, core purity (no I/O added — `Math.max` lives in the shell's `main.ts`, core `drawHud` still a pure function of its args), palette-by-index (`TEXT_COLOUR = 9`), ADR-0005/epilepsy (determinism + no-strobe + 0..15 guards green), no `<file>.ts:line` test comment refs, no count guards.

Approved for finish.