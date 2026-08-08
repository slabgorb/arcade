---
story_id: "jt10-6"
jira_key: "jt10-6"
epic: "jt10"
workflow: "tdd"
---
# Story jt10-6: Game-over screen: wire GOVER_OVER/settleGameOver to a GAME OVER overlay and the transition to highscore-or-attract

## Story Details
- **ID:** jt10-6
- **Jira Key:** jt10-6
- **Workflow:** tdd
- **Stack Parent:** jt10-5 (DONE — 1P/2P start select, PR #73)
- **Repos:** arcade
- **Branch Strategy:** gitflow (feat/jt10-6-game-over-screen)
- **Branch:** feat/jt10-6-game-over-screen
- **PR:** #75 (MERGED into develop, merge commit 3cfbcfcd)

## Background

The cabinet lifecycle epic jt10 is building the full state machine and screens for Joust (attract/title/select/playing/gameover/highscore). Story **jt10-5 (DONE)** implemented the 1P/2P select screen; this story implements the **game-over screen** — the overlay rendered when the cabinet enters `'gameover'` mode (when all players are out), and the transition OUT to either high-score entry (if the score qualifies) or back to attract.

**Design authority:** [docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md](../../docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md), §Screens table (line 128) and §Story decomposition (line 148).

**Core logic already exists — this is WIRING + PRESENTATION only:**
- `GOVER_OVER = 0` (plugins/joust/src/core/game.ts:183): the tri-state value signalling game over
- `settleGameOver(players)` (plugins/joust/src/core/game.ts:359): returns `{players, gover}` with `gover === GOVER_OVER` iff EVERY player is out
- `CabinetMode` (plugins/joust/src/core/cabinet.ts:38): already includes `'gameover'`
- `modeForGover(gover)` (plugins/joust/src/core/cabinet.ts:65-70): already maps `GOVER_OVER` → `'gameover'`
- `afterGameOver(cab, table)` (plugins/joust/src/core/cabinet.ts:109): already routes `'gameover'` → `'highscore'` iff best score qualifies else `'attract'`

**Font resources** (jt10-1, DONE):
- `FONT57` (5×7) — the stylized ROM font for the `GAME OVER` banner

**Cabinet state machine seam** (jt10-2/jt10-5, DONE):
- Cabinet mode `'gameover'` already exists in `CabinetMode`
- The transition `'playing'` → `'gameover'` via `modeForGover` is already pinned (happens inside `stepPlaying` when `settleGameOver` fires)
- The transition `'gameover'` → `'highscore'` or `'attract'` via `afterGameOver` is already pinned

**Scope of THIS story:**
1. **Shell overlay** — a `GAME OVER` overlay that renders when `cabinet.mode === 'gameover'`, using FONT57 via the existing raster text renderer (mirror jt10-5's select overlay: `paintText`/`layoutText` glyph ops, paintDissolve style).
2. **Wiring in main.ts** — update the frame loop to detect the `'gameover'` mode, render the overlay, and after a brief delay (configurable), transition to the routed next mode via `afterGameOver`.
3. **Purity preserved** — no new core logic (the game-over decision already lives in `settleGameOver`/`GOVER_OVER`); shell owns only render + transition delay.

**Out of Scope:**
- Title screen (jt10-3), attract cycle (jt10-4), high-score entry (jt10-7).
- New simulation logic — `settleGameOver` and `afterGameOver` already exist and are tested.

## Acceptance Criteria

Derived from the design spec; CANONICAL for RED/Review. The epic's `description` and `acceptance_criteria` in sprint YAML were `null`, so these are extracted from primary source material cited below.

1. **GAME OVER overlay render** — new shell component (e.g. `src/shell/gameOverScreen.ts` or inline in `main.ts` render) that:
   - Renders the text `GAME OVER` in FONT57 (5×7, the stylized ROM font).
   - Uses the existing atlas/blit pipeline (raster text painter via `paintText` + `layoutText`).
   - Centres the text horizontally on the 292×240 backbuffer.
   - ROM citation: `GAMEND` (EQU.SRC:237) — the label for the game-over message in the original source.
   - Uses a transcribed palette colour (e.g. the OVERLAY_COLOUR_INDEX or a distinct readable hue).

2. **Wiring in main.ts** — update the frame loop to:
   - Detect when `cabinet.mode === 'gameover'` (already set by `stepPlaying` when `settleGameOver` fires `GOVER_OVER`).
   - Render the `GAME OVER` overlay instead of gameplay.
   - After a brief display time (e.g. 2–3 seconds; configurable as a shell constant), compute the next mode via `afterGameOver(cabinet, table)` to route to `'highscore'` (if score qualifies) or `'attract'` (if not).
   - Preserve the literal `createGame(` and `stepGame(` calls for the demo-source seam (BLOCKING constraint from jt4-5; see Seam Constraint below).

3. **Transition logic** — implement a frame counter or timestamp in main.ts that:
   - Starts when `'gameover'` is first entered (i.e., mode changes from `'playing'` to `'gameover'`).
   - After the elapsed time, call `afterGameOver(cabinet, highScoreTable)` to transition to the routed next mode.
   - The `highScoreTable` is from `@shared/highscore` (stub/empty for now; jt10-7 will populate it).

4. **Vitest core suite covers cabinet transitions** — seed-replay fixtures pinning the `'playing'` → `'gameover'` transition when all players are out; assert that `modeForGover(GOVER_OVER)` returns `'gameover'` and `afterGameOver` returns the correct routed mode.

5. **Purity constraint** — no new core logic. Shell owns render + transition delay. Existing core (`game.ts`, `cabinet.ts`) remains unchanged.

6. **ROM fidelity** — the text `GAME OVER` is transcribed verbatim from the ROM message at `GAMEND` (EQU.SRC:237); font choice (FONT57) matched to the original cabinet.

## Seam Constraint (BLOCKING)

**From jt10-5 session Reconciliation note:** demo-source.test.ts requires `main.ts` to contain literal `createGame(` and `stepGame(` calls (the jt4-5 session seam). Do NOT refactor these calls into a function or remove them, as that will break the demo-source wiring seam. The `'playing'→'gameover'` transition should NOT route every frame through a cabinet step in a way that removes the literal calls.

Example COMPLIANT path:
```typescript
// Keep literal createGame( and stepGame( calls
const game = stepGame(cabinet.game, inputs)
cabinet = { mode: modeForGover(game.gover), game }
```

Example NON-COMPLIANT (do NOT do this):
```typescript
// Removing the literal calls or abstracting them breaks the seam
cabinet = stepPlaying(cabinet, inputs)  // ✗ hides the stepGame call
```

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T20:10:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T22:00:00Z | 2026-08-07T18:02:32Z | -14248s |
| red | 2026-08-07T18:02:32Z | 2026-08-07T19:56:14Z | 1h 53m |
| green | 2026-08-07T19:56:14Z | 2026-08-07T20:04:07Z | 7m 53s |
| review | 2026-08-07T20:04:07Z | 2026-08-07T20:10:04Z | 5m 57s |
| finish | 2026-08-07T20:10:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Conflict** (blocking): The derived AC-1/AC-6 overlay text `'GAME OVER'` cited to `GAMEND (EQU.SRC:237)` is wrong against the ROM — `GAMEND` is `RMB 3`, a RAM variable for the H.S.T.D. check routine, NOT a message string; and the whole-cabinet game-over overlay Joust displays is `'THY GAME IS OVER'` (`MSGOVR $00`, MESSEQU.SRC:18), put up by `GOVERM` (JOUSTRV4.SRC:674). `'GAME OVER'` (`MSGAMO $6D`, MESSEQU.SRC:130) is the separate per-player banner `GAMOV1`. **User ruled (RED) for the faithful `'THY GAME IS OVER'`.** Affects `sprint/context/context-story-jt10-6.md` (⚠ CORRECTION banner added at top) and the implementation: Dev exports `GAME_OVER_TEXT = 'THY GAME IS OVER'` from `plugins/joust/src/core/cabinet.ts` and the shell imports it. *Found by TEA during test design.*
- **Improvement** (non-blocking): The authentic overlay hold is ~88 ticks (~1.47s) — `GOVWAT` (JOUSTRV4.SRC:678, `#11  8*11 OR 88 TICK WAIT`) — then `JMP GAMEND`. The RED pins the hold's PRESENCE (a timer/frame counter), not the exact value. Affects `plugins/joust/src/main.ts` (a tunable shell timing constant; Reviewer + human smoke test confirm the banner is actually visible for the hold). *Found by TEA during test design.*
- **Gap** (non-blocking): The derived AC-1 calls FONT57 "5×7" — FONT57 is 6×7 (`cellWidth 6, cellHeight 7`); FONT35 is the 3×5 font. The banner uses FONT57. Verified all 13 distinct chars of `'THY GAME IS OVER'` resolve via `FONT57.glyphFor`. Affects the context AC-1 wording only (noted in the ⚠ banner). *Found by TEA during test design.*
- **Question** (non-blocking): The RED pins `GAME_OVER_TEXT` in `core/cabinet.ts` (the module owning `'gameover'` + `afterGameOver`, mirroring `core/select.ts` owning `SEL_*`). If Dev/Architect prefers a different core home, it is a one-line change to `tests/helpers/gameover-contract.ts` — the value/citation gate is what matters, not the exact file. *Found by TEA during test design.*

### Reviewer (code review)

- **Improvement** (non-blocking): The game-over hold DURATION (`GAMEOVER_HOLD_FRAMES = 88`) and the runtime render are NOT test-covered — the wiring test is a source-scan for a hold identifier, so a mutant `= 1` (banner flashes one frame) stays green. Mutation-confirmed. This is the correct limit of a node test over a DOM shell and matches jt10-5's deferral of positions/colours; the human smoke test is the guard. Affects `plugins/joust/src/main.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `renderGameOverScreen` inlines its horizontal-centre (`Math.round((LOGICAL_WIDTH - banner.width)/2)`) rather than reusing `renderSelectScreen`'s local `centred` helper — the helper is function-local, so sharing it would need a small refactor. Cosmetic; the two screens now duplicate the centre expression. Affects `plugins/joust/src/main.ts` (a future extract when a third screen lands). *Found by Reviewer during code review.*
- No blocking findings. The ROM citation, mode derivation, purity, and seam are all VERIFIED (see Reviewer Assessment).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- **Post-gameover screens routed to the coin-up door.** `afterGameOver` returns `'highscore'`
  or `'attract'`, but those screens are jt10-4 / jt10-7 and don't exist. Rather than dead-end
  the cabinet, main.ts renders `'attract'`/`'highscore'` as the `'select'` coin-up screen and
  lets the start-press handler fire in those modes too, so the demo loops (game over → banner →
  route → coin-up → new game). When jt10-4/jt10-7 land they add the real renders/handlers for
  those modes; the `afterGameOver` call and its result are already wired. Coherent, non-broken
  slice — same bar as jt10-5's "front door → play forever".
- **High-score table is empty (`[]`) at the `afterGameOver` call.** jt10-7 wires
  `@shared/highscore` persistence; until then any positive final score routes to `'highscore'`
  (open board), which renders as the coin-up door per the above. In scope-out per the context.
- **Placeholder colour + position** for the banner: `GAMEOVER_COLOUR_INDEX = 5` (a transcribed
  COLOR1 index, as the select screen uses — not an invented literal) and `GAMEOVER_BANNER_Y = 108`.
  The ROM puts the phrase at `$3090`; the exact colour/placement await a reference capture + human
  smoke test (same deferral jt10-5 logged for the select screen).
- **`GAME_OVER_TEXT` lives in `core/cabinet.ts`** per TEA's contract (the module owning `'gameover'`
  + `afterGameOver`, mirroring `core/select.ts` owning `SEL_*`).

## Sm Assessment

**Story:** jt10-6 — Game-over screen. 2pt, p2, tdd (phased). One of the jt10-3..jt10-7
cabinet-screen slices; jt10-5 (1P/2P select) just merged and pointed forward to this one.

**Board at setup:** clean. No sibling branch for jt10-6 (`git branch -r | grep jt10-6`
empty before my claim push), no sibling `.session/` files, no open PRs, merge gate clear.
Claim pushed as `feat/jt10-6-game-over-screen` (commit `8a1aeaf2`) so the sibling probe lights up.

**Premise verified against the current tree — the pure core already exists.** This is
wiring + presentation, NOT new sim logic:
- `settleGameOver` (`plugins/joust/src/core/game.ts:359`) returns `gover === GOVER_OVER`
  (`:183`) iff EVERY player is out.
- `deriveMode` maps `gover === GOVER_OVER` → `'gameover'` (`cabinet.ts:68`); `afterGameOver`
  (`cabinet.ts:109`) routes gameover → `'highscore'` iff the best score qualifies, else back.
- `CabinetMode` already includes `'gameover'`. So the story only wires the `'playing'→'gameover'`
  exit in `main.ts` and paints a `GAME OVER` overlay (mirror jt10-5's select overlay).

**ACs are DERIVED, not authored.** The epic YAML's `description` and `acceptance_criteria`
were BOTH `null`. sm-setup derived six ACs from the cabinet-lifecycle design spec
(`docs/superpowers/specs/2026-08-07-joust-cabinet-lifecycle-design.md:22,128,148`), the core
code, and the jt10-5 archive. TEA and the Reviewer must treat them as derived — the context
file header says so. ROM anchor for the overlay: `GAMEND` (`EQU.SRC:237`).

**BLOCKING constraint carried forward (AC-3):** `demo-source.test.ts` scans `main.ts` for
literal `createGame(` + `stepGame(` calls (the jt4-5 seam). jt10-5 deliberately mixed the
session layer (per-frame step) and the cabinet layer (transition). jt10-6 must preserve that —
do NOT route every frame through a cabinet step in a way that erases those literal calls.

**Out of scope:** high-score initials ENTRY + JOUST CHAMPIONS table is jt10-7. This story only
needs to reach the routed next mode.

**Handoff:** → TEA (Tyr One-Handed) for RED. Write failing tests pinning the two cabinet
transitions (all-players-out → `'gameover'`; gameover → highscore/attract via `afterGameOver`)
and the overlay render, keeping the demo-source seam green.

## Tea Assessment

**Phase (written during):** red
**Tests Required:** Yes
**Tests Written:** 13 tests across 2 new suites + 1 contract helper. RED verified: 12 fail
(feature absent), 1 passes (the AC-3 seam guard — a non-vacuous regression guard, see below).
**Status:** RED (ready for Dev). `npm run lint` (tsc --noEmit) exit 0. Full joust suite:
`2 failed | 157 passed (159)` — the ONLY reds are the two new jt10-6 files.

**Test Files:**
- `plugins/joust/tests/gameover-screen.test.ts` — the shell overlay module `layoutGameOverScreen`
  (mirrors `select-screen.test.ts`): the `GAME_OVER_TEXT` banner in FONT57 (height 7, width =
  16×6, first glyph `'T'`), one op per char, colour threaded (two distinct colours), and
  source-wiring that the shell reuses the core constant + `layoutText` + FONT57 (no re-hardcoded
  ROM literal).
- `plugins/joust/tests/gameover-wiring.test.ts` — main.ts source wiring (mirrors
  `select-wiring.test.ts`): imports `modeForGover`/`afterGameOver` from core/cabinet and
  `layoutGameOverScreen` from shell; DERIVES the playing mode from the stepped game `.gover`
  (kills the pre-jt10-6 `{ mode: 'playing', game: stepGame(...) }` hardcode — restrictive
  mutation-direction assertion); branches on `'gameover'` to render; routes out via
  `afterGameOver`; holds the overlay before exit (tolerant timer pin); AND the AC-3 BLOCKING
  seam guard (literal `createGame(`/`stepGame(` survive) — this one PASSES on arrival, guarding
  the seam Dev must not break (jt8-6 green-guard pattern; non-vacuous — removing the calls
  reddens it).
- `plugins/joust/tests/helpers/gameover-contract.ts` — the core-constant contract (value +
  citation), the loadGame/loadSelect idiom.

**Core transitions already covered — not re-pinned.** AC-4's core assertions
(`modeForGover(GOVER_OVER)→'gameover'`, stepPlaying all-out→gameover, `afterGameOver` value
semantics) are GREEN in `cabinet.test.ts:94-243` (jt10-2). Duplicating them would be vacuous;
this story adds NO new core logic (AC-5 purity), so RED lives on the two absent surfaces (the
shell overlay + the main.ts wiring).

### Rule Coverage

| Rule / constraint | Test(s) | Status |
|---|---|---|
| ROM fidelity — correct string + citation (not `GAMEND`/`GAME OVER`) | `displays 'THY GAME IS OVER' (MSGOVR $00)` | failing |
| No re-hardcoded ROM text in shell (one string, one citation) | `imports GAME_OVER_TEXT from core/cabinet … not re-hardcoded` | failing |
| lang-review — mode derived from data, not a hard literal | `DERIVES the playing mode from the stepped game GOVER` | failing |
| Restrictive mutation-direction (permissive mutant can't pass) | `.not.toMatch(/mode:\s*'playing',\s*game:\s*stepGame/)` in same test | failing |
| BLOCKING jt4-5 seam preserved (AC-3) | `keeps the literal createGame( and stepGame( calls` | passing (guard) |
| Colour threaded, not hard-wired | `threads the caller's colour … two distinct colours` | failing |
| Purity (core unchanged; string is pure DATA) | covered by existing `purity`/`sim-clock-free` scanners; no core edit | n/a |

**Rules checked:** ROM-fidelity + citation, no-re-hardcode, derived-edge (lang-review), restrictive
mutation-direction, seam preservation, colour threading. **Self-check:** 0 vacuous tests — every
assertion ties to a core constant, a font metric, or a source form; the one passing test is a
verified-non-vacuous seam guard.

**Key finding for Dev (see Delivery Findings):** the derived AC's string + citation are WRONG.
Implement `GAME_OVER_TEXT = 'THY GAME IS OVER'` (MSGOVR $00, MESSEQU.SRC:18) exported from
`core/cabinet.ts`; the shell `gameOverScreen.ts` imports it. Duration ~88 ticks (GOVWAT), tunable.

**Handoff:** → Dev (Loki Silvertongue) for GREEN.

## Dev Assessment

**Phase written during:** green
**Status:** GREEN — all tests pass, ready for Reviewer.

**Verification (evidence, not assertion):**
- Full joust suite: `159 passed (159)` files, `3151 passed (3151)` tests.
- `npm run lint` (tsc --noEmit): clean (exit 0), re-run after the code edits.
- `npm run test:orchestrator`: `pass 408 | fail 0`.
- `node scripts/build-app.mjs joust`: built (`dist/joust/assets/main-*.js 159.32 kB`).

**What I changed (3 files, minimal):**
- `plugins/joust/src/core/cabinet.ts` — added `export const GAME_OVER_TEXT = 'THY GAME IS OVER'`
  (MSGOVR $00, MESSEQU.SRC:18), cited to GOVERM/GOVWAT (JOUSTRV4.SRC:674/678). Pure DATA; no logic.
- `plugins/joust/src/shell/gameOverScreen.ts` — NEW. `layoutGameOverScreen(colour): { banner }`
  lays `GAME_OVER_TEXT` out in FONT57 via `layoutText`, reusing the core constant (no hardcoded
  ROM literal — the "no re-hardcode" guard also caught a comment quoting the string; paraphrased).
- `plugins/joust/src/main.ts` — the playing step derives the mode from the stepped game's `.gover`
  via `modeForGover` (killing the `{ mode: 'playing', game: stepGame(...) }` hardcode); a `'gameover'`
  pump branch holds `GAMEOVER_HOLD_FRAMES = 88` then routes via `afterGameOver(cabinet, [])`; the
  render paints the banner via `renderGameOverScreen`. Literal `createGame(`/`stepGame(` preserved.

**Design decisions (logged as Design Deviations):** post-gameover `'attract'`/`'highscore'` render
as the coin-up door until jt10-4/jt10-7; empty high-score table (`[]`) until jt10-7; placeholder
banner colour/Y pending a reference capture.

**For the Reviewer — the one thing tests can't see:** the game-over screen renders correctly at
runtime. main.ts is a DOM shell (no node test runs its loop), and reaching `'gameover'` needs an
all-players-out playthrough (no dev/level-skip key). The wiring is source-verified + all green, but
a **human smoke test** confirming the banner actually appears (and its colour/position) is the same
deferral jt10-5 logged for the select screen. Suggested check: play until all knights are spent →
'THY GAME IS OVER' banner shows ~1.5s → returns to the coin-up screen.

**Handoff:** → Reviewer (Heimdall) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (0 smells) | N/A — 3559 tests green, lint clean, joust builds |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — edges assessed by Reviewer (see Devil's Advocate) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no swallowed errors in diff (no try/catch, no fallbacks) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by MUTATION BATTERY (4/4 caught) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — comments checked by Reviewer (citations accurate) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — `CabinetMode` union, `GameOverScreenLayout` interface both sound |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — no auth/input/secrets surface (offline canvas game) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — one cosmetic dup noted (centred helper), non-blocking |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — rules checked by Reviewer (see Rule Compliance) |

**All received:** Yes (1 enabled returned, 8 disabled pre-filled)
**Total findings:** 0 confirmed blocking, 2 non-blocking (deferred/cosmetic), 4 VERIFIED-good

## Reviewer Assessment

**Verdict:** APPROVED
**Story:** jt10-6 — Game-over screen. Reviewed diff `git diff origin/develop` (9 files, +547/−11).

**Board:** clean at review — fetch-first showed no sibling jt10-6 branch, jt10-6 not on `origin/develop`, no SUPERSEDED risk.

### Rule Compliance (CLAUDE.md + joust boundary rules)

- **Core/shell purity boundary (the single most important rule).** VERIFIED. The only core change is `core/cabinet.ts` gaining `export const GAME_OVER_TEXT` — pure string DATA (like `SEL_*` in `core/select.ts`), no clock, no browser surface. All render/timing/DOM lives in `main.ts` + the new `shell/gameOverScreen.ts`. The `purity`/`sim-clock-free` scanners are green (full suite passes).
- **ROM fidelity + citation gate.** VERIFIED independently against primary source: `GAME_OVER_TEXT = 'THY GAME IS OVER'` = `MSGOVR $00` (MESSEQU.SRC:18, re-read the raw line), the message `GOVERM` puts up (JOUSTRV4.SRC:674). Correctly NOT `MSGAMO $6D 'GAME OVER'` (the per-player banner) and NOT `GAMEND` (EQU.SRC:237 confirmed `RMB 3`, a routine). The RED's correction of the wrong derived AC is sound.
- **No re-hardcoded ROM text in the shell** (one string, one citation). VERIFIED — `gameOverScreen.ts` imports `GAME_OVER_TEXT`; the guard even caught a comment quoting the literal, since paraphrased.
- **BLOCKING jt4-5 demo-source seam.** VERIFIED — literal `createGame(` (boot) and `stepGame(` (playing step) survive; `demo-source.test.ts` + my AC-3 guard both green. The mode is derived AROUND the literal `stepGame` call, not by routing through `stepPlaying`.
- **Adding a test file bumps the derived README count.** VERIFIED — README `--project joust … 159 files` matches vitest discovery; `audio-seam-scope` green.

### Observations (≥5)

1. **[VERIFIED]** Mode derivation: `cabinet = { mode: modeForGover(game.gover), game }` replaces the `mode: 'playing'` hardcode — mutation-proven (M2 reddens on removal of `modeForGover`). This is the real fix; all-players-out now reaches `'gameover'` in the live loop.
2. **[VERIFIED]** `afterGameOver(cabinet, [])` cannot crash on the empty table — `cabinet.test.ts:234` already pins `afterGameOver(cab, [])` for scores 100→highscore and 0→attract. Empty is a tested input.
3. **[VERIFIED]** `gameoverHoldFrames` cannot leak across games — reset both in `enterPlaying` and after routing; the only exit from `'gameover'` is the `>= 88` branch that resets it, so re-entry is always at 0.
4. **[VERIFIED]** No held-key instant restart after routing — the `prevStartHeld` rising-edge discipline (untouched) requires release+repress; a start key held through the game-over hold does not auto-start.
5. **[non-blocking]** Hold duration (88) + runtime render are source-scan-only, not behaviourally tested — human-smoke-test deferral (matches jt10-5). Logged.
6. **[non-blocking]** `renderGameOverScreen` duplicates the centre expression rather than sharing the function-local `centred` helper — cosmetic; extract when a third screen lands.
7. **[VERIFIED]** Post-gameover `attract`/`highscore` route to the coin-up door — a deliberate, logged placeholder until jt10-4/jt10-7; keeps the demo non-dead-ending (same bar as jt10-5). `afterGameOver`'s result is genuinely consumed, not dead code.

### Devil's Advocate

Argue it is broken. (1) **Catch-up burns the hold in one animation frame** — `pumpFrames` can drain many sim frames after a lag spike, so the 88-frame banner could be skipped. Rebutted: `MAX_CATCHUP_SECONDS = 0.25` caps elapsed at 0.25s ≈ 15 sim frames per animation frame, so the 88-frame hold spans ≥6 animation frames even at max catch-up; the banner always renders. (2) **The banner never leaves gameover** — no, `++gameoverHoldFrames >= 88` fires deterministically and `afterGameOver` sets a non-gameover mode; mutation M3 proves the route is wired. (3) **Empty table routes everything to a highscore screen that doesn't exist, soft-locking the cabinet** — no, `'highscore'` falls into the coin-up-door branch in both pump and render, and a start press begins a new game; no dead-end. (4) **The mode literal for `'gameover'` could be a typo the tests miss** — no, `modeForGover` returns the `CabinetMode` union value and the render/pump branch on the same string literal `'gameover'` that `cabinet.test.ts` pins. (5) **A player mashing 1/2 during the hold double-starts** — no, the hold branch `return`s before the coin-up handler, and on exit the rising-edge guard blocks a held key. (6) **Purity regression: did a clock leak into core?** — no, `GAME_OVER_TEXT` is a bare string; the hold counter and `GAMEOVER_HOLD_FRAMES` live in the shell. Nothing here corrupts state or breaks an observable contract. The two residual items are a documented smoke-test deferral and a cosmetic dup. **No Critical or High. No defect survives.**

**Handoff:** → SM (Baldur) for the finish ceremony (gitflow: open + merge the PR into `develop`, then `story finish`).