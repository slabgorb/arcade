---
story_id: "ml10-2"
jira_key: "ml10-2"
epic: "ml10"
workflow: "tdd"
---
# Story ml10-2: Wire high-score persistence: load the ladder on boot, save it after name entry

## Story Details
- **ID:** ml10-2
- **Jira Key:** ml10-2
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Type:** feature

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T13:53:47Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T12:27:21Z | 2026-08-16T12:30:42Z | 3m 21s |
| red | 2026-08-16T12:30:42Z | 2026-08-16T12:45:56Z | 15m 14s |
| green | 2026-08-16T12:45:56Z | 2026-08-16T13:01:06Z | 15m 10s |
| review | 2026-08-16T13:01:06Z | 2026-08-16T13:14:47Z | 13m 41s |
| red | 2026-08-16T13:14:47Z | 2026-08-16T13:19:35Z | 4m 48s |
| green | 2026-08-16T13:19:35Z | 2026-08-16T13:31:49Z | 12m 14s |
| review | 2026-08-16T13:31:49Z | 2026-08-16T13:42:08Z | 10m 19s |
| green | 2026-08-16T13:42:08Z | 2026-08-16T13:46:30Z | 4m 22s |
| review | 2026-08-16T13:46:30Z | 2026-08-16T13:53:47Z | 7m 17s |
| finish | 2026-08-16T13:53:47Z | - | - |

## Story Context

### Background
Wire millipede high-score persistence END-TO-END, INCLUDING the name-entry runtime it depends on (scope EXPANDED 2026-08-16, re-pointed 3→5 by user ruling; the original 'no new logic / main.ts already has a name-entry phase' framing was STALE — see below). Two dead seams: (1) shell/highscore.ts (makeMilliHighScoreStorage, loadHighScores) is built + tested (high-score-persistence.test.ts) but imported by NOTHING in src/ (self-labelled 'Deliberately UNWIRED' at shell/highscore.ts:18). (2) The name-entry RUNTIME does not exist: phase.ts defines an 'entry' phase and advancePhase routes game-over->entry when scoreQualifies, BUT sim.ts:433 deliberately DEFERS it (game-over handler never passes scoreQualifies), and main.ts has NO entry-phase handling (no initials input, no stepInitials drive, no entry-screen render). main.ts seeds the HUD/attract board from core/highscore DEFAULT_HIGH_SCORES only, so the ladder resets every reload and a qualifying score can never be entered or persisted. Deliver, in order: (a) wire the entry runtime — sim.ts computes scoreQualifies via qualifiesForHighScore and routes game-over->entry; main.ts drives the entry phase (capture initials input, step stepInitials, render the entry screen, insertHighScore on commit); (b) on boot, main.ts loads the table via loadHighScores(makeMilliHighScoreStorage()), falling back to the seeded ROM ladder on empty/first boot, and renders it (attract showcase + HUD hi-score); (c) after entry commits, save the updated table through makeMilliHighScoreStorage().save under the one-origin cabinet key (MILLI_HIGH_SCORE_GAME_ID = 'millipede') so the shared arcade-lobby localStorage persists it and the lobby can read it. Reuse the tested shell module and core/highscore primitives (insertHighScore / qualifiesForHighScore / stepInitials) — the new logic is the RUNTIME WIRING in sim.ts + main.ts, not new game math. Seams: src/core/sim.ts (scoreQualifies signal), src/main.ts (entry-phase input/render + boot load + post-entry save); shell/highscore.ts unchanged or minimal.

### Acceptance Criteria
1. On boot, main.ts loads the ladder via loadHighScores(makeMilliHighScoreStorage()) and renders it (attract showcase + HUD hi-score), falling back to DEFAULT_HIGH_SCORES on a first/empty boot.
2. After a game ends and a qualifying score is entered, the updated ladder is saved via makeMilliHighScoreStorage().save under the one-origin cabinet key ('millipede') and survives a reload — a returning boot shows the persisted board.
3. Persistence is proven end-to-end through main.ts wiring (boot → play → name-entry → reload), not only the existing module unit tests; no regression to the name-entry flow, the self-playing attract demo, or the HUD.

## Branch Strategy
gitflow (feat/ml10-2-high-score-persistence)

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Question / non-blocking — TEA, red] The RED commits the mc7-2/mc7-3 contract as the design.** This is a wiring story with a real architectural fork (name-entry state in core `GameState` vs the `main.ts` shell), and the tdd workflow has no design phase, so RED had to pick. It follows the **missile-command precedent** — which `plugins/millipede/src/core/highscore.ts:6` explicitly names as its shape ("the standalone shape of plugins/missile-command/src/core/highscore.ts"), and which mc7-2/mc7-3 already shipped end-to-end. Concretely the RED pins: (1) `GameState.highScores` (seeded `DEFAULT_HIGH_SCORES`) + `GameState.initials` (`''`), created by `createGame`; (2) `stepGameOver` feeds `scoreQualifies: qualifiesForHighScore(state.highScores, state.score)` into `advancePhase` so a qualifying game-over reaches `'entry'`; (3) the attract→play and game-over→attract world rebuilds PRESERVE `highScores` (mc `{...createPlayGame(seed), highScores: state.highScores}`, game.ts:211) — today both reset it; (4) a shell reducer `nameEntryFromKey(key, state)` in `src/shell/input.ts` (letter→`stepInitials`, Enter+full→`insertHighScore`+→attract); (5) `main.ts` boot-loads and saves on the new-array `highScores` reference change. Dev/Reviewer: if a millipede-specific reason argues against any seam here, raise it — the contract is precedent-chosen, not mandated by the ROM. It supersedes the SM description's shell-centric phrasing ("main.ts holds the board") where they differ, because sim needs the board in `GameState` to compute `scoreQualifies`.
- **[Gap / non-blocking — TEA, red] The loaded-board RENDER is pinned by a source floor + the visual playtest, not by pixel-matching.** AC1 says the boot renders the loaded ladder (attract showcase + HUD hi-score). RED proves the load reaches game state behaviourally (`sim().highScores === persisted board`, Group D) and pins that `render()` no longer hardcodes `DEFAULT_HIGH_SCORES` via the Group E source floor; the actual pixels are verified by the mandatory `/millipede/` playtest (playbook §4, hud-render.test.ts:30-31 — "only eyes at /millipede/ prove the picture"). Dev must run that playtest and confirm the HUD hi-score + showcase reflect a persisted board; Reviewer, treat a green suite as necessary-not-sufficient for AC1's render half.
- **[Improvement / non-blocking — Dev, green rework r1] The [RULE] #14 dead `entryComplete` signal is NOT retired by the [EDGE] fix.** The Reviewer's ideal was to route entry→attract through the sim so `entryComplete` (phase.ts:78) goes live. But Group C's direct-commit test forces the shell reducer's own return to be `phase:'attract'`, so the commit + fresh-world rebuild had to stay inlined in `nameEntryFromKey` (createGame in the shell). `sim.ts`'s `'entry'` case still just freezes and never feeds `entryComplete`, so that phase-machine branch remains exercised only by `phase.test.ts` in isolation. Affects `plugins/millipede/src/core/sim.ts` + `plugins/millipede/src/core/phase.ts` (a future refactor could move the commit into a core `entryComplete`-driven transition, but only if the shell-reducer contract — reducer returns attract directly on commit — is relaxed). *Found by Dev during green rework.*
- **[Gap / non-blocking — Dev, green rework r2] The [SEC] score-magnitude residual is closed + re-playtested; the fleet-wide root cause is upstream.** Bounded the loaded score to `<= Number.MAX_SAFE_INTEGER` in `isRenderableRow` and pinned it with a `score: 1e21` hostile-board row (RED `no ROM char code for "e"` → GREEN). Real-browser: a `1e21`+lowercase+negative store sanitizes to DEFAULT, rAF loop survives the showcase window. NOTE for the epic: the reachability *root cause* is `src/shared/highscore.ts` `isPublishableScore` (:241) having NO magnitude cap (`Number.isInteger && > 0`), which lets a 21-digit plain-digit legacy cookie decode to `1e21` and flow through every game's `seedFromLegacyCookie`. Millipede's render filter now defends itself, but a shared-layer cap would defend the whole fleet — out of ml10-2 scope, worth an epic-level follow-up (Reviewer filed the same as a non-blocking finding). Affects `src/shared/highscore.ts`. *Found by Dev during green rework r2.*
- **[Gap / non-blocking — Dev, green rework r1] Hostile-board no-crash + valid-board render both re-playtested GREEN in a real browser.** Ran `/millipede/` on a fresh vite (5299 — 5270 was a-1's sibling checkout, per the pinned-port trap). (1) [SEC]: seeded the hostile board (`abc`/`-1`) into `localStorage['millipede-high-scores']`, reloaded, and let the attract cycle run past the HIGH SCORES showcase window (9s) — the rAF loop KEPT advancing (`__sim.frame` 1397→1937, no freeze) and the board sanitized to DEFAULT (top `BBM`/89175, 8 renderable rungs). (2) valid board (`KEV`/654321…) survives the filter unchanged (3 rows, HUD hi-score renders `654321`). Only console error is a favicon 404 (dev-server noise, not our regression). The still-not-headless-eyeballable residuals from the prior round (the showcase TABLE pixels + the `'entry'` screen prompt, reachable only by a full game to a qualifying game-over) are unchanged by this fix — the human release-gate visual check still stands.
- **[Gap / non-blocking — Dev, green] HUD render playtested GREEN; the showcase table + `'entry'` screen visuals are inferred, not eyeballed.** Ran the real-browser playtest for AC1: a seeded persisted board loads into `window.__sim.highScores` and the HUD hi-score renders `654321` (not DEFAULT `89175`) — `millipede-hud-hiscore.png`. NOT directly eyeballed: (a) the attract SHOWCASE HIGH SCORES table (background-tab rAF throttling kept skipping the 5s showcase window at screenshot time) and (b) the `'entry'` name-entry screen (reaching it needs a full game to a qualifying game-over, not scriptable headless). Both reuse the exact `showcaseSections(state.highScores)` / `drawGridStamps`+`textPlacements` path the HUD screenshot proves renders the live board as upright, readable text, so the risk is low — but a HUMAN should, before release, (1) let attract cycle to the HIGH SCORES table and confirm it shows the persisted names/scores, and (2) earn a qualifying score and confirm the entry screen prompts + accepts initials and the committed row persists across a reload. Reviewer: this is the residual AC1/AC3 visual gap.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Minimal name-entry SCREEN, not the full ROM dressing**
  - Spec source: context-story-ml10-2.md description, "render the entry screen"
  - Spec text: "main.ts drives the entry phase (capture initials input, step stepInitials, render the entry screen, insertHighScore on commit)"
  - Implementation: `render()`'s `'entry'` branch paints black + "GREAT SCORE" / "ENTER YOUR INITIALS" + the padded initials buffer through the existing `drawGridStamps`/`textPlacements` text path. No ROM-authentic layout/colour/cursor animation.
  - Rationale: no test pins the entry-screen pixels (TEA deferred them to the visual playtest); the minimalist floor is a readable, functional entry screen reusing the already-playtested text path (the HUD's readable 654321 proves that path renders upright text). Full fidelity is not an AC.
  - Severity: minor
  - Forward impact: a later polish story may want the authentic MLATR entry-screen layout; the seam is `render()`'s `'entry'` branch + `textPlacements`.
- **Updated one pre-existing sim.test attract-timeout case to a non-qualifying score**
  - Spec source: tests/sim.test.ts "when the hold reaches 0 it returns to a FRESH attract world (score reset)"
  - Spec text: constructed a game-over with `score: 99999` and asserted `phase === 'attract'`
  - Implementation: changed the score to `100` (non-qualifying) with a comment pointing at highscore-wiring.test.ts
  - Rationale: a QUALIFYING game-over now routes to `'entry'` (the story's whole point — sim.ts:433's deferred route is wired). 99999 beats the seeded ladder, so it would reach entry; the attract-timeout path this test guards is now the non-qualifying case. The test's intent (score/lives reset on the timeout) is unchanged.
  - Severity: minor
  - Forward impact: none — the attract-return path still exists for non-qualifying scores; the qualifying route is covered by highscore-wiring.test.ts Group B.
- **Corrected a premise bug in the RED suite's game-over→attract preservation test**
  - Spec source: tests/highscore-wiring.test.ts Group B (TEA-authored, this story)
  - Spec text: used a 2-entry `LIVE_BOARD` with a "non-qualifying" score to reach the attract path
  - Implementation: added `LIVE_FULL_BOARD` (8 rungs, distinct from DEFAULT) — a partial board has open rungs so ANY positive score qualifies, which would route to entry, not attract
  - Rationale: the only way to exercise the non-qualifying attract-timeout path is a FULL board the score can't beat; the RED test's setup was infeasible as written (masked during RED by the then-`undefined` highScores field).
  - Severity: minor
  - Forward impact: none — strengthens the test (now also asserts the preserved board `!== DEFAULT`).

- **[Rework r1] [SEC] fix landed at `loadHighScores`, NOT at `encodeChar` — kept the encoder strict**
  - Spec source: Reviewer [SEC] HIGH + TEA rework RED (`highscore-hostile-board.test.ts`), "filter `loadHighScores` AND/OR make `encodeChar`/`place` fail safe"
  - Spec text: "Filter loadHighScores's result to millipede's renderable charset … AND/OR make encodeChar/place render a blank stamp for an unencodable char"
  - Implementation: chose ONLY the upstream filter (`isRenderableRow` in `shell/highscore.ts` drops rows failing `/^[A-Z0-9 ]*$/` on name or non-negative-integer score). Left `encodeChar` throwing.
  - Rationale: the fix is fix-agnostic per the test, and the single upstream gate is the one place the untrusted board enters `GameState`. Keeping `encodeChar` strict preserves it as a real guard for its ROM-CONSTANT callers (the CAST/FOOTER labels, compile-time all-caps) — a throw there is a genuine dev-time bug signal, not a runtime hazard. `initials` are already A-Z-only via `stepInitials`. Sanitizing at the boundary + a strict interior encoder is a cleaner separation than a lenient encoder.
  - Severity: minor
  - Forward impact: any FUTURE untrusted text path into the encoder (none today) must re-sanitize at its own boundary, since the encoder does not fail soft.
- **[Rework r1] [EDGE] fix rebuilds the fresh attract world IN THE SHELL reducer, not by routing through the sim**
  - Spec source: Reviewer [EDGE] HIGH ("best done by routing entry→attract through the sim `advancePhase({entryComplete:true})`") + [RULE] #14 (dead `entryComplete`)
  - Spec text: "route the edge through advancePhase/entryComplete + a createGame rebuild … so `entryComplete` stops being dead"
  - Implementation: `nameEntryFromKey`'s Enter-commit returns `{ ...createGame(state.seed), highScores: insertHighScore(...) }` — the fresh-world rebuild is inlined in the shell. `entryComplete`/the sim `'entry'` freeze are UNCHANGED, so [RULE] #14's dead signal REMAINS.
  - Rationale: FORCED by the tests — Group C's direct-commit test (`nameEntryFromKey('Enter', …)` with no sim step) asserts the reducer's OWN return is `phase:'attract'` with the committed row and cleared buffer, so the attract transition cannot be deferred to a later sim step. TEA's rework RED recommends exactly this shell-createGame shape and pins only the observable (fresh score 0/lives 3 + committed row). Routing through the sim would keep the reducer in `'entry'` and fail the direct-commit test.
  - Severity: minor
  - Forward impact: [RULE] #14 (dead `entryComplete`, non-blocking) is NOT retired by this fix — see the Delivery Finding. A later refactor could move the commit into a core `entryComplete`-driven transition if the shell-reducer contract is relaxed.

- **[Rework r2] [SEC] residual closed by an upper bound on the score, not a re-tune of the encoder**
  - Spec source: Reviewer rework re-review [SEC] HIGH (residual) — `isRenderableRow`'s `Number.isInteger(score) && score >= 0` admits an integer ≥ 1e21 whose `String()` is `"1e+21"`, which `encodeChar` throws on.
  - Spec text: "Bound the score to the renderable range … `score <= Number.MAX_SAFE_INTEGER` … OR `/^[0-9]+$/.test(String(score))`. Add a RED pin with a `score: 1e21` row."
  - Implementation: added `&& score <= Number.MAX_SAFE_INTEGER` to `isRenderableRow` (shell/highscore.ts). MAX_SAFE_INTEGER (~9.007e15) is well below JS's 1e21 exponent-notation threshold, so every admitted score stringifies to plain digits `encodeChar` can render. Added `{ name: 'AAA', score: 1e21 }` to `highscore-hostile-board.test.ts`'s `HOSTILE_BOARD` (RED→GREEN confirmed).
  - Rationale: chose the numeric bound over the `/^[0-9]+$/.test(String(score))` string check — it keeps the score's numeric intent readable, is a principled ceiling (the integer-precision boundary), and no real millipede score approaches it. Kept the filter at `loadHighScores` (the single untrusted-data choke point per reviewer-security #2) rather than touching `encodeChar` (still strict for its ROM-constant callers).
  - Severity: minor
  - Forward impact: a value in (MAX_SAFE_INTEGER, 1e21) is technically renderable but now dropped — harmless (absurd score, never organic). The fleet-wide root cause (uncapped `isPublishableScore` in `src/shared/highscore.ts`) is filed as a non-blocking Reviewer Delivery Finding for an epic-level follow-up.

### Reviewer (audit)
- **Minimal name-entry SCREEN, not the full ROM dressing** → ✓ ACCEPTED by Reviewer: no AC requires pixel fidelity and the text path is proven; the entry SCREEN render is not implicated in either blocking finding (the [EDGE] HIGH is about the post-commit world transition, not the screen).
- **Updated one pre-existing sim.test attract-timeout case to a non-qualifying score** → ✓ ACCEPTED by Reviewer: correct — a qualifying game-over now routes to entry; the test's reset intent is preserved with a non-qualifying score and a pointer comment.
- **Corrected a premise bug in the RED suite's game-over→attract preservation test** → ✓ ACCEPTED by Reviewer: sound — a partial board qualifies any positive score, so a full distinct board is the only way to reach the non-qualifying path; the added `!== DEFAULT` assertion strengthens it.
- **UNDOCUMENTED — entry→attract commit inlined in the shell, diverging from the cited mc precedent:** Spec/comment (`shell/input.ts:40`) says this mirrors "the mc7-3 shell reducer," but mc keeps the commit (`commitNameEntry`) in CORE and the shell only dispatches; millipede inlines `insertHighScore` + the `phase:'attract'` transition in the shell, bypassing `advancePhase`/`entryComplete`. Not logged by Dev. Severity: M (it is the root cause of the [EDGE] HIGH stale-attract finding). → ✗ FLAGGED — fix with the [EDGE] HIGH by routing the edge through the sim.

## Sm Assessment

**Scope ruling (2026-08-16, by user): EXPAND — re-pointed 3→5.** The story's original
"no new logic / main.ts already has a name-entry phase" framing was measured and found
STALE before setup. Findings against the current millipede tree:

- `shell/highscore.ts` (load/save adapter) is imported by NOTHING in `src/` — genuinely
  dead (self-labelled "Deliberately UNWIRED" at `shell/highscore.ts:18`). TRUE.
- The name-entry RUNTIME does not exist. `core/phase.ts` defines an `'entry'` phase and
  `advancePhase` routes game-over→entry when `scoreQualifies`, but `core/sim.ts:433`
  DELIBERATELY defers it (the game-over handler never supplies `scoreQualifies`), and
  `main.ts` has no entry-phase handling (no initials input, no `stepInitials` drive, no
  entry-screen render). So the "save after name-entry commits" half (AC2/AC3) had no
  runtime seam to hook onto.

The user chose to expand ml10-2 to also wire that runtime (sim.ts `scoreQualifies`
routing + main.ts entry input/render/insert) rather than split or block it. All three
ACs stay verbatim; the description was corrected in `sprint/epic-ml10.yaml` to record
the ruling. The epic YAML still needs no further edits.

**Recovery note:** `sm-setup` STASHED the SM's uncommitted epic-YAML re-point during
branch creation (`stash@{0}: "ml10-2 setup: stash epic yaml changes"`), reverting the
working tree to `points: 3` while the generated context reflected 5pt. Restored via
`git stash apply` + drop, then re-stamped `in_progress`. Claim committed + pushed on
`feat/ml10-2-high-score-persistence`.

## Dev Assessment (rework round 2)

**Implementation Complete:** Yes — the residual [SEC] HIGH from the rework re-review is closed.
**Files Changed (rework r2):**
- `plugins/millipede/src/shell/highscore.ts` — **[SEC] residual**: `isRenderableRow` now also requires `score <= Number.MAX_SAFE_INTEGER`, closing the integer-≥-1e21 case where `String(score)` uses exponent notation (`"1e+21"`) that `encodeChar` throws on. Filter stays at the single `loadHighScores` choke point.
- `plugins/millipede/tests/highscore-hostile-board.test.ts` — added a `{ name: 'AAA', score: 1e21 }` row to `HOSTILE_BOARD` (RED confirmed: `no ROM char code for "e"` → GREEN after the bound).

**Verification (rework r2):** RED→GREEN on the new magnitude pin; full **millipede 1408/1408 GREEN**; `tsc` clean. Real-browser `/millipede/`: a store seeded with `1e21` + lowercase + negative rows drops all three → fallback DEFAULT (8 renderable rungs), rAF loop advances across the showcase window (frame 430→970) — no freeze. See Delivery Findings.

---

## Dev Assessment (rework round 1)

**Implementation Complete:** Yes — both Reviewer HIGHs fixed, both non-blocking [TEST]/[DOC] items tightened.
**Files Changed (rework r1):**
- `plugins/millipede/src/shell/highscore.ts` — **[SEC] HIGH**: `loadHighScores` now filters the loaded board through `isRenderableRow` (drops any row whose name is not `/^[A-Z0-9 ]*$/` or whose score is not a non-negative integer) before it enters `GameState.highScores`; an emptied board falls back to the seeded DEFAULT. The strict `encodeChar` guard is deliberately kept for its ROM-constant callers (see deviation).
- `plugins/millipede/src/shell/input.ts` — **[EDGE] HIGH**: `nameEntryFromKey`'s Enter-commit returns a FRESH `createGame(state.seed)` attract world carrying the updated ladder (`insertHighScore`), converging with the non-qualifying game-over→attract rebuild; the ended game's score no longer leaks onto the attract demo. Also corrected the overstated "mc7-3 shell reducer" docstring ([DOC], non-blocking).
- `plugins/millipede/tests/highscore-wiring.test.ts` — **[TEST]** (non-blocking): anchored the save-guard from a bare `/\.save\s*\(/` to `/highScoreStorage\.save\s*\(/` so a stray `ctx.save()` canvas call can't satisfy the persistence floor.

**Verification (rework r1):** the two RED pins now pass; full **millipede 1408/1408 GREEN** (up from `2 failed | 1406 passed`); `tsc --noEmit` clean. Real-browser `/millipede/` re-playtest: hostile board → no rAF freeze across the showcase window + sanitized to DEFAULT; valid board → renders unchanged (HUD `654321`). See Delivery Findings.
**Residual (non-blocking):** the [RULE] #14 dead `entryComplete` signal is not retired — the direct-commit test forces the attract transition into the shell reducer (see deviation + finding).

---

## Dev Assessment (initial green — superseded by rework above)

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/millipede/src/core/game-state.ts` — `GameState.highScores` (seeded `DEFAULT_HIGH_SCORES`) + `GameState.initials` (`''`); `createGame` seeds both.
- `plugins/millipede/src/core/sim.ts` — `stepGameOver` feeds `scoreQualifies` into `advancePhase` (qualifying game-over → `'entry'`); the ladder is PRESERVED across the attract→play and game-over→attract world rebuilds.
- `plugins/millipede/src/shell/input.ts` — new `nameEntryFromKey(key, state)`: buffer via `stepInitials`, Enter commits (`insertHighScore` → attract, buffer cleared), inert outside `'entry'`.
- `plugins/millipede/src/main.ts` — boot `{...createGame(), highScores: loadHighScores(makeMilliHighScoreStorage())}`; keydown drives the entry reducer and saves on the new-array ladder reference; render reads `state.highScores` (HUD + showcase) + a minimal `'entry'` screen.
- `plugins/millipede/src/core/attract-showcase.ts` — export `textPlacements` for the entry prompt.
- `plugins/millipede/tests/highscore-wiring.test.ts`, `plugins/millipede/tests/sim.test.ts` — test corrections (see Design Deviations).

**Architecture:** followed TEA's committed mc7-2/mc7-3 contract exactly (the missile-command precedent `core/highscore.ts` cites) — no new contract invented.

**Tests:** millipede **1406/1406** GREEN (the 15 new + all prior, incl. `purity`/`citations`/audit); orchestrator **505/505**; `tsc --noEmit` clean.

**Visual playtest (AC1 render, AC3 no-regression):** ran `/millipede/` in a real browser (fresh vite on 5299 — the shared 5270/5291 had a STALE pre-edit server; games don't HMR, so a fresh port was required) with `localStorage['millipede-high-scores']` seeded to a non-default board. `window.__sim.highScores` loaded the persisted board, and the **HUD hi-score rendered `654321`** (the seeded top), not the DEFAULT `89175` — screenshot `millipede-hud-hiscore.png`. The attract demo, HUD and field render unchanged (no regression). The showcase HIGH SCORES table and the `'entry'` screen use the SAME `showcaseSections(state.highScores)` / `drawGridStamps` text path this screenshot exercises, so they render the live board too; catching the showcase window and driving a full game to a qualifying game-over headlessly were not feasible (see the Delivery Finding).

**Branch:** `feat/ml10-2-high-score-persistence` (pushed, commit `3f9d3fc5`)

**Handoff:** To verify (TEA simplify + quality-pass).

## Subagent Results

_(FINAL re-review — round 2. The r2 delta is a single `&& score <= Number.MAX_SAFE_INTEGER` clause + one hostile-board test row. Per user direction ("finish it off, don't round-trip"), the enabled subagent panel was NOT re-spawned for a one-clause delta; the three enabled dimensions were hand-run/hand-verified this round on top of the round-1 re-review subagent evidence. The round-1 re-review table is preserved below as history.)_

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (hand-run) | clean | none | Ran directly: millipede 1408/1408 GREEN, tsc clean, orchestrator 505/505, tree clean (only epic-yaml review-metadata uncommitted), no debug |
| 2 | reviewer-edge-hunter | Yes | disabled | N/A | Disabled — hand-covered (exhaustive admitted-row probe: partial boards, empty/space names, NaN, -0, boundary scores, MAX+1, entry-screen text path — no admitted row throws) |
| 3 | reviewer-silent-failure-hunter | Yes | disabled | N/A | Disabled — hand-covered (no swallow introduced; the fix is an upstream drop, not a catch) |
| 4 | reviewer-test-analyzer | Yes | disabled | N/A | Disabled — hand-covered (the `score: 1e21` pin is RED→GREEN verified; not vacuous) |
| 5 | reviewer-comment-analyzer | Yes | disabled | N/A | Disabled — hand-covered (the r2 docstring accurately explains the MAX_SAFE_INTEGER bound + the 1e21/exponent rationale) |
| 6 | reviewer-type-design | Yes | disabled | N/A | Disabled — hand-covered (one boolean clause, no type surface change) |
| 7 | reviewer-security | Yes (hand-verified) | clean | 0 | The r2 bound closes the EXACT residual reviewer-security flagged in round 1 (integer ≥ 1e21 → exponent String → encodeChar throw). Exhaustively re-probed: name charset ≡ encoder, score bound < exponent threshold, single `loadHighScores` choke point. Hole closed. |
| 8 | reviewer-simplifier | Yes | disabled | N/A | Disabled — hand-covered (minimal one-clause bound; no over-engineering) |
| 9 | reviewer-rule-checker | Yes | disabled | N/A | Disabled — hand-covered (round-1 rule-checker cleared the surrounding code exhaustively; the r2 delta adds no new rule surface — one `&&` clause + one test row) |

**All received:** Yes (accounting — preflight + security hand-run/verified this round; the remaining dimensions hand-covered on a one-clause delta per user direction; round-1 re-review subagent evidence stands underneath)
**Total findings:** 0 blocking. The round-1 [EDGE] HIGH is fixed (mutation-verified); the round-2 [SEC] residual is fixed (exhaustively re-probed); 1 pre-existing LOW (`.js` import) and 1 fleet-wide non-blocking finding (`isPublishableScore` uncapped) carried as follow-ups.

## Reviewer Assessment

**Verdict:** APPROVED

**FINAL re-review (round 2).** All blocking findings from every prior round are closed and verified; nothing new survived an adversarial pass. The round-1 [EDGE] stale-attract HIGH was fixed and mutation-verified in rework r1; the round-2 [SEC] score-magnitude residual is fixed in r2 and exhaustively re-probed here. millipede 1408/1408 GREEN, tsc clean, orchestrator 505/505.

| Severity | Tag | Item | Status |
|----------|-----|------|--------|
| [SEC] | [SEC] | Untrusted persisted board crashing the attract render (lowercase name / negative / fractional / huge-integer score → `encodeChar` throw in the uncaught rAF loop) | **CLOSED.** `isRenderableRow` (shell/highscore.ts) now gates `RENDERABLE_NAME.test(name) && Number.isInteger(score) && score >= 0 && score <= Number.MAX_SAFE_INTEGER`. The name class is byte-for-byte the encoder's accept set; the score bound sits below JS's 1e21 exponent-notation threshold so every admitted score stringifies to plain digits. Exhaustive probe (empty/space names, NaN, -0, boundary + MAX+1 scores, entry-screen text): NO admitted row throws. Single choke point (`loadHighScores`, main.ts:57); the strict encoder still guards its ROM-constant callers. RED→GREEN pinned by `highscore-hostile-board.test.ts` (lowercase + negative + `1e21`). |
| [EDGE] | [EDGE] | Stale attract world after a qualifying commit | **CLOSED.** `nameEntryFromKey`'s Enter-commit returns `{ ...createGame(state.seed), highScores: insertHighScore(...) }` — fresh score 0 / lives 3 / field, committed row on top; converges with the game-over→attract rebuild. Mutation-verified (revert → "FRESH attract demo" test reddens). |
| [TEST] | [TEST] | Save-guard was a bare `.save(` token match | **CLOSED.** Anchored to `/highScoreStorage\.save\s*\(/`; a stray `ctx.save()` no longer satisfies it. |
| [DOC] | [DOC] | Overstated mc7-3 shell-reducer comment | **CLOSED.** Docstring now accurately describes the shell-inlined commit + fresh-world rebuild and contrasts with mc's core-dispatched reducer. |
| [TYPE] | [TYPE] | Board/initials typing | **CLEAN.** `readonly MilliHighScore[]` + `string`; destructured `MilliHighScore` param; no `as any`/type-escape. |
| [SILENT] | [SILENT] | Error handling | **CLEAN.** The r2 fix is an upstream row-drop, not a swallow; no empty catch / silent fallback introduced. |
| [SIMPLE] | [SIMPLE] | Complexity | **CLEAN.** One boolean clause + a spread rebuild; `createGame` is a pure core factory called from the shell (correct direction). |
| [RULE] | [RULE] | Project rules / purity | **CLEAN.** Core/shell purity holds (both changed source files are SHELL; `purity.test.ts` 53/53). |

**Non-blocking follow-ups (do NOT block this story):**
- [LOW] [RULE] `highscore-wiring.test.ts:71` imports `'../src/core/highscore.js'` with `.js` while siblings omit it — pre-existing, harmless under `moduleResolution: bundler`.
- [IMPROVEMENT] `src/shared/highscore.ts` `isPublishableScore` (:241) has no magnitude cap, which is what lets a 21-digit plain-digit legacy cookie decode to `1e21` fleet-wide. Millipede now self-defends at its render filter; a shared-layer cap is an epic-level follow-up beyond ml10-2 scope. (Also filed as a Reviewer Delivery Finding.)
- [RULE #14] The dead `entryComplete` signal remains (the direct-commit test forces the attract transition into the shell reducer) — accepted as a deliberate trade-off; the [EDGE] behaviour is correct and mutation-verified.

### Devil's Advocate (final)

The whole arc of this story was one lesson applied twice: the board stopped being a compile-time ROM constant and became untrusted bytes, and "shape-valid" is not "renderable." Round 1 shipped a renderer that threw on a lowercase name; rework r1 filtered the name but conflated "non-negative integer" with "stringifies to digits," so `1e21` — a value `Number.isInteger` calls an integer and JS stringifies as `"1e+21"` — still walked straight through into `encodeChar`. r2 closes that by bounding the score below the exponent-notation threshold, and I refused to take the one-line diff on faith: I enumerated the admitted set against the encoder (boundary scores, `MAX_SAFE_INTEGER`, `MAX+1`, `-0`, `NaN`, empty and space-only names, the entry-screen text path) and confirmed the invariant "no admitted row can throw" holds with zero exceptions. The remaining reachability — a 21-digit cookie decoding to `1e21` through the uncapped shared `isPublishableScore` — is real but is now defanged at millipede's own filter and correctly kicked upstream as a fleet-wide follow-up rather than papered over here. The HUD was never at risk (integer math). The confused-user path (stale attract after a commit) is genuinely fixed and mutation-pinned. There is no third charset corner left: the name gate is the encoder's exact accept set, and the score gate now guarantees a plain-digit string. Nothing here is one frame or one charset short any more.

### Reviewer (code review) — Delivery Findings

- **Improvement** (non-blocking): `src/shared/highscore.ts` `isPublishableScore` (:241) should cap score magnitude (e.g. `<= Number.MAX_SAFE_INTEGER`) so no game's legacy-cookie seed can decode an unrenderable/huge score — a fleet-wide hardening. Out of ml10-2 scope; epic-level follow-up. *Found by Reviewer during final re-review.*
- No blocking findings remain. *Reviewer, final re-review.*

---

### Round 1 re-review (historical — REJECTED, superseded by the APPROVED final verdict above)

**Verdict:** REJECTED

**Rework re-review (round 1).** The rework fixed ONE of the two blocking HIGHs cleanly and left the OTHER partially open. The **[EDGE] HIGH is FIXED** — mutation-verified: reverting the `createGame(state.seed)` rebuild reddens `highscore-wiring.test.ts`'s "commits to a FRESH attract demo" pin (`expected 100000 to be +0`); the commit path now converges with the game-over→attract rebuild (rule-checker #14). The non-blocking [TEST] guard is genuinely tightened and the [DOC] comment is corrected (both verified). But the **[SEC] HIGH is only PARTIALLY closed**: the charset filter stops a lowercase name and a negative/fractional score, yet a huge-INTEGER score still reproduces the identical uncaught-`RangeError`-in-the-rAF-loop crash. Measured independently and corroborated by reviewer-security.

| Severity | Tag | Issue | Location | Fix Required |
|----------|-----|-------|----------|--------------|
| [HIGH] | [SEC] | **Residual of the round-1 [SEC] HIGH — the score guard checks integer-and-non-negative but not RENDERABILITY.** `isRenderableRow` gates the score with `Number.isInteger(score) && score >= 0` — no magnitude bound. A JS integer ≥ `1e21` passes (`Number.isInteger(1e21) === true`) but `String(1e21) === "1e+21"`, and `showcaseSections` feeds `String(entry.score)` through `place`→`encodeChar`, which THROWS on `e`/`+`. Same permanent-freeze crash the fix was written to close, via magnitude instead of sign. **MEASURED:** `isRenderableRow({name:'AAA',score:1e21}) === true` then `showcaseSections([…])` throws `no ROM char code for "e"`. **Reachable two ways:** (1) DRIVE-BY — a sibling `*.slabgorb.com` sets a `Domain=slabgorb.com` cookie `arcade-hi-millipede=AAA:100000000000000000000`; a 21-digit PLAIN-DIGIT value passes `parseTopScore`'s `/^\d+$/`, `Number()`s to `1e21`, `isPublishableScore` has NO magnitude cap (`Number.isInteger && >0`), so on a FIRST-visit `seedFromLegacyCookie` admits it (game validator = shape-only `isHighScoreRow`) → seeded → `loadHighScores` admits it → ~7s into attract the showcase throws → dead loop. (2) hand-edited `localStorage['millipede-high-scores']`. NOT exercised by `highscore-hostile-board.test.ts` (only lowercase name + `-1`). | plugins/millipede/src/shell/highscore.ts:45, plugins/millipede/src/core/attract-showcase.ts:44-48,141-144, src/shared/highscore.ts:241 (`isPublishableScore` uncapped) | Bound the score to the renderable range in `isRenderableRow` — either `Number.isInteger(score) && score >= 0 && score <= Number.MAX_SAFE_INTEGER` (MAX_SAFE_INTEGER ≈ 9e15 < the 1e21 exponent threshold, so `String()` is always plain digits — a principled bound), OR mirror the name check on the rendered form: `/^[0-9]+$/.test(String(score))`. Add a RED pin to `highscore-hostile-board.test.ts` with a `score: 1e21` (or 21-digit) row. |

**Confirmed-FIXED this round (verified, evidence-backed):**
- [VERIFIED] [EDGE] The stale-attract-world HIGH is closed: `nameEntryFromKey`'s Enter-commit returns `{ ...createGame(state.seed), highScores: insertHighScore(...) }` (input.ts:54-57) — fresh score 0 / lives 3 / field, committed row on top. Mutation-verified (revert → "FRESH attract demo" test reddens). Converges the commit path with the sim's game-over→attract rebuild (rule-checker #14).
- [VERIFIED] [TEST] The save-guard is genuinely STRICTER: `highscore-wiring.test.ts:355` anchors `/highScoreStorage\.save\s*\(/` to the sole real call (`main.ts:107`); a stray `ctx.save()` can no longer satisfy it. Not vacuous, not weakened (rule-checker #8/#15).
- [VERIFIED] [DOC] The `input.ts` docstring no longer overstates mc-parity — it now accurately says the commit inlines the insert + fresh-world rebuild in the shell and contrasts with mc's core-dispatched reducer (rule-checker #17).
- [VERIFIED] [TYPE] `isRenderableRow({ name, score }: MilliHighScore)` destructures a concrete interface; `loadHighScores`' `readonly MilliHighScore[]` return preserved; no `as any`/type-escape (rule-checker #1/#2).
- [VERIFIED] [SILENT] The residual [SEC] is an UNCAUGHT throw in the rAF loop, not a swallowed error — no empty catch, no silent fallback introduced. The charset half of the filter (name) is a byte-for-byte match to `encodeChar`'s accept set.
- [VERIFIED] [SIMPLE] The fix is minimal — a 2-line filter + a spread-rebuild; `createGame` is a verified-pure core factory called from the shell (correct dependency direction, purity.test.ts 53/53 green). No over-engineering.
- [VERIFIED] [RULE] Core/shell purity holds — both touched files are under `src/shell/`, off the purity sweep; the residual is the ONLY open rule/security item.

**Non-blocking (carry-over):**
- [LOW] [RULE] `highscore-wiring.test.ts:71` imports `'../src/core/highscore.js'` WITH `.js` while siblings omit it — pre-existing, untouched by this rework, harmless under `moduleResolution: bundler`. One-line cleanup, not blocking.
- The round-1 [MEDIUM] [RULE] #14 dead-`entryComplete` note is now a documented Dev Delivery Finding: the direct-commit test forces the attract transition into the shell reducer, so `entryComplete` stays exercised only by `phase.test.ts`. Accepted as a deliberate trade-off (not re-raised as blocking) — the [EDGE] behaviour is correct and mutation-verified.

### Rule Compliance

Rules source: `.pennyfarthing/gates/lang-review/typescript.md` (30 checks) + CLAUDE.md core/shell purity. Rework diff = 3 files (`shell/highscore.ts`, `shell/input.ts`, `tests/highscore-wiring.test.ts`).

- **Core/shell purity (CLAUDE.md):** both changed source files are SHELL; `createGame` called from the shell is a pure core factory (correct direction). `purity.test.ts` 53/53 green. ✓
- **#1 type escapes / #2 generics-readonly / #4 null (`>= 0`, not `||`) / #5 import-type (`import { createGame, type GameState }`) / #8 test-quality / #17 comment-accuracy:** all COMPLIANT (rule-checker exhaustive, mutation-verified). 
- **#10 input-validation:** the NAME charset gate is complete, but the SCORE gate is INCOMPLETE (magnitude → exponent-notation → `encodeChar` throw). This is the blocking [SEC] residual — **I do not concur with rule-checker's #10 "COMPLIANT"**; it verified the name-charset match and did not check `String(score)` renderability. Challenged and overridden by the measured reproduction + reviewer-security.
- **`as any`:** none. ✓

### Devil's Advocate

The round-1 review said the diff "stops exactly one frame and one charset short of both defects." The rework closed the frame (the [EDGE] world-rebuild) and MOST of the charset (names, negative/fractional scores) — but "one charset short" was more literally true than it looked. The fix reads `Number.isInteger(score) && score >= 0` and calls the board renderable, conflating "is a non-negative integer" with "stringifies to digits the ROM font has." Those are not the same set: JavaScript switches `Number#toString` to exponential notation at exactly `1e21`, and `Number.isInteger(1e21)` is cheerfully `true`. So the guard that exists to keep unrenderable text out of `encodeChar` hands `encodeChar` the literal string `"1e+21"`. A malicious neighbour who can't plant a lowercase name any more (that door is shut) plants a twenty-one-digit score instead — `arcade-hi-millipede=AAA:100000000000000000000` — and because the legacy cookie decoder demands plain digits (so the attacker uses plain digits) and `isPublishableScore` never caps magnitude, the poison flows straight through `seedFromLegacyCookie` on the victim's first visit, past the new filter, into the showcase, and the rAF loop dies seven seconds later. The HUD survives because it does integer math (`Math.floor`/`% 1e6`), which is the tell: the two consumers of the same field disagree about whether it's a number or text, and only the text one is exposed. The confused-user path is now genuinely fixed — a committed score is the sim's own small integer and the attract world rebuilds clean — but the hostile-data path was narrowed, not closed. A stressed reviewer sees "hostile-board test is green, 1408 pass" and approves; the trap is that the one hostile row the test picked (a lowercase name) is the case the fix handles, and the case it doesn't handle (a huge score) is one the test never tries. The lesson is the same one the round-1 review drew and this rework half-applied: validate the board for RENDERABILITY, not shape — and renderability of a score means its STRING is digits, which `Number.isInteger` does not guarantee.

### Reviewer (code review) — Delivery Findings

- **Gap** (blocking): the loaded-board score guard checks integer-and-non-negative but not renderability, so an integer score ≥ 1e21 stringifies with exponent notation and crashes `encodeChar` in the uncaught rAF loop — the same permanent-freeze as the round-1 [SEC] HIGH, reachable drive-by (legacy cookie, first visit) and by hand-edit. Affects `plugins/millipede/src/shell/highscore.ts` (bound the score in `isRenderableRow`) + a RED pin in `plugins/millipede/tests/highscore-hostile-board.test.ts`. *Found by Reviewer during rework re-review (with reviewer-security).*
- **Improvement** (non-blocking): `src/shared/highscore.ts` `isPublishableScore` (:241) has no magnitude cap, so the legacy-cookie decoder is what lets a 21-digit value become `1e21` in the first place — a fleet-wide hardening (cap publishable scores) would defend every game's cookie-seed path, not just millipede's render filter. Out of ml10-2 scope; worth an epic-level follow-up. *Found by Reviewer during rework re-review.*

---

### Round 1 (historical — superseded by the rework re-review above)

**Verdict:** REJECTED

Two HIGH findings, both introduced by this story and both untested by the new suite. This is a genuinely good wiring diff — core purity holds, `highScores` is preserved across every sim rebuild, the typed initials path is charset-safe, the boot-load is proven end-to-end — but it wires an untrusted persisted board into a renderer that throws, and its commit path leaves the attract demo stale. Both are measured, not theorized.

| Severity | Tag | Issue | Location | Fix Required |
|----------|-----|-------|----------|--------------|
| [HIGH] | [SEC] | An untrusted persisted board crashes the attract render loop. `isHighScoreRow` (shared/highscore.ts:130) admits any `string` name + any finite `score`; `showcaseSections` feeds `entry.name` and `String(entry.score)` through `place`→`encodeChar`, which THROWS `RangeError` on any char outside `A-Z`/`0-9`/space (a lowercase name, punctuation, a negative or fractional score all trip it). The throw is inside the uncaught `frame()` rAF loop, so the loop dies permanently → game frozen until reload. Reachable on plain boot once the showcase window shows (~7s), and via `seedFromLegacyCommit`/cross-subdomain cookie. Before ml10-2 the board was hardcoded ROM all-caps, so this was unreachable — this story introduces it. | plugins/millipede/src/core/attract-showcase.ts:44-48, plugins/millipede/src/core/attract-showcase.ts:141-145, plugins/millipede/src/main.ts:216, src/shared/highscore.ts:130 | Filter `loadHighScores`'s result to millipede's renderable charset before it enters `GameState.highScores` (drop rows failing `/^[A-Z0-9 ]*$/.test(name)` or `!(Number.isInteger(score) && score >= 0)`), AND/OR make `encodeChar`/`place` render a blank stamp for an unencodable char instead of throwing (as `sixDigitStamps` already fails safe for the HUD). Add a RED test with a lowercase/negative-score persisted board. |
| [HIGH] | [EDGE] | Stale attract world after a qualifying commit. MEASURED: one attract frame after `nameEntryFromKey('Enter', …)` commits, `score` is still `100000` (the ended game's score), `lives`/field are the ended game's — not a fresh demo. The non-qualifying game-over→attract path rebuilds fresh via `createGame(state.seed)`; the commit path returns `{...state, phase:'attract'}` and never rebuilds. AC3 says "no regression to … the self-playing attract demo," and this regresses it on the feature's own happy path. Root cause = the [RULE] #14 finding below. | plugins/millipede/src/shell/input.ts:43-55, plugins/millipede/src/core/sim.ts:109-110 | On commit, return a FRESH attract world preserving the updated ladder — best done by routing entry→attract through the sim (`advancePhase({entryComplete:true})` + the `createGame(seed)` rebuild the other timeout path uses), so the qualifying and non-qualifying paths converge and `entryComplete` stops being dead. Add a RED test: commit → step one attract frame → `score === 0`. |

**Non-blocking (do not block, but fix alongside the HIGHs since they share the fix):**

- [MEDIUM] [RULE] The `entry→attract` edge bypasses the central `advancePhase` dispatcher every other transition uses. `sim.ts:109` freezes `entry` unconditionally and never feeds `PhaseSignals.entryComplete`; the real transition is hand-built in the shell (`input.ts:43` sets `phase:'attract'`), leaving `phase.ts:78`'s `entryComplete` dead in the runtime (only exercised by `phase.test.ts` in isolation). This IS the root cause of the [EDGE] HIGH — fix them together.
- [MEDIUM] [TEST] `tests/highscore-wiring.test.ts:334` `expect(src).toMatch(/\.save\s*\(/)` is a whole-file token match, not anchored to `highScoreStorage.save`. A future `ctx.save()`/`c.save()` canvas call (common in this exact 2D renderer) would satisfy the guard even if the real persistence call were deleted. Anchor to `/highScoreStorage\.save\s*\(/`.
- [LOW] [DOC] `input.ts:40` calls this "the mc7-3 shell reducer" bound to the board, but missile-command's shell `nameEntryFromKey` is a thin dispatcher to CORE `commitNameEntry`/`stepInitials` (game.ts:257-265); millipede inlines the insert-on-commit in the shell. The comment names the file it claims to mirror, so it's checkably overstated.
- [LOW] `tests/highscore-wiring.test.ts:66-71` imports `'../src/core/highscore.js'` WITH a `.js` extension while the sibling imports two lines above omit it — a new intra-file inconsistency (`moduleResolution: bundler` keeps lint green).

**Confirmed-good (verified, evidence-backed):**
- [VERIFIED] [TYPE] `highScores: readonly MilliHighScore[]` (game-state.ts:94) + `initials: string` — readonly board, no stringly-typed API introduced; the `EntryState` cast in tests is the documented RED-seam idiom (rule-checker #1/#2 clean). Complies with the TS lang-review generic/readonly rules.
- [VERIFIED] [SILENT] `highScores` is preserved across EVERY sim path: `stepPlay`/`stepDeath`/`stepAttract`/the `entry` freeze all `{...state}` spread (sim.ts:110/405/470), and the two `createGame` world-rebuilds explicitly re-add `highScores: state.highScores` (sim.ts:127, sim.ts:447). No path leaves it `undefined` mid-game — evidence: grep of every `return {` in sim.ts. (The render path has NO try/catch, which is precisely why the [SEC] throw is fatal — not a swallow, an uncaught throw.)
- [VERIFIED] `state.highScores[0].score` (main.ts:273) is index-safe: `loadHighScores` falls back to the 8-rung DEFAULT on empty/corrupt (shell/highscore.ts:44-45), `createGame` seeds 8, `insertHighScore` truncates to depth 8 (never below 1). Corroborated by rule-checker #4.
- [VERIFIED] Save-on-commit is correct: only the Enter-commit builds a NEW `highScores` array (`insertHighScore`), so `game.highScores !== prevScores` (main.ts:107) is true only on commit; a typing keystroke returns `{...state, initials}` with the SAME board reference → no spurious save.
- [VERIFIED] [SIMPLE] `textPlacements` (attract-showcase.ts:56) is a justified thin re-export of the private `place()` — minimal, not over-engineered.
- [VERIFIED] The keydown entry-gate (main.ts:101-106) returns before `startPlay`, so a committing Enter does not boot an unrequested game (the mc7-3 landmine) — good.

**Data flow traced:** `localStorage['millipede-high-scores']` → `@shared/highscore.load()` (shape-validated only) → `loadHighScores` (main.ts:57) → `GameState.highScores` → `renderShowcase`/`showcaseSections` → `place`→`encodeChar` (THROWS on non-`[A-Z0-9 ]`) → uncaught in the `frame()` rAF loop → dead loop. This is the [SEC] path; it is UNSAFE because the shape guard is not a charset guard.

### Rule Compliance

Rules source: `.pennyfarthing/gates/lang-review/typescript.md` (30 checks) + CLAUDE.md core/shell purity rule (no `.claude/rules/`, no SOUL.md).

- **Core purity (CLAUDE.md):** `game-state.ts`, `sim.ts`, `attract-showcase.ts` touch no `localStorage`/`window`/`document`/`Date`/`Math.random` — `highScores` is data, `qualifiesForHighScore`/`insertHighScore`/`stepInitials` are pure wrappers. `purity.test.ts` stays green. All localStorage/keyboard/DOM lives in `shell/input.ts` + `main.ts`. ✓ COMPLIANT (every changed core file checked; rule-checker corroborates).
- **Type escapes (#1), generics/readonly (#2), null handling (#4), module/import-type (#5), async (#7), test-quality (#8), input-validation (#10):** checked across all 47 instances the rule-checker enumerated — 0 blocking violations; the `.js`-extension inconsistency (#5) is the only style nit.
- **`as any`:** none anywhere in the diff. ✓
- **Exhaustive switch:** `stepGame`'s phase switch (sim.ts) covers all 5 `GamePhase` members; unmodified by this diff. ✓

### Devil's Advocate

Assume this code is broken and a hostile or careless world is on the other side of it. The moment the high-score board stops being a compile-time ROM constant and becomes bytes read from `localStorage`, every assumption the renderer made about that data is now a liability — and this diff makes exactly that move while validating the data for *shape* (`isHighScoreRow`: is it an object with a string name and a finite score?) but never for *renderability*. A malicious neighbour on any `*.slabgorb.com` subdomain writes `arcade-hi-millipede=hax:5000` as a `Domain=slabgorb.com` cookie; millipede's own legacy-cookie migration seeds it into the board on the victim's next visit; seven seconds later the attract cycle hits the showcase, `encodeChar('h')` throws, and the rAF loop is dead — the game is bricked for that browser until the user knows to clear storage they've never heard of. No gameplay, no interaction, a pure drive-by. Even without an attacker, a *negative* score (`Number.isFinite(-1)` is true) or a score of `1e21` (stringifies to `"1e+21"`) does the same from a corrupted or hand-edited store. The HUD survives (it floors/mods digits), but the showcase is a landmine.

Now the confused user: they finally earn a top-eight score, proudly type their initials, hit Enter — and the attract screen shows their just-ended game frozen with their old score still on the HUD, not the clean self-playing demo the cabinet is supposed to idle into. It self-heals only when they start another game. It looks broken because, on this path, it is: the qualifying and non-qualifying game-over exits disagree about whether to rebuild the world, and the tests never stepped a frame past the commit to notice. A stressed reviewer would rubber-stamp this — lint is green, 1911 tests pass, the boot screenshot shows `654321`. That is the trap: the suite proves the load reaches the state and the HUD, and stops exactly one frame and one charset short of both defects. The lesson the rule-checker and security agent jointly surface is that "the board is now dynamic" needed two guards this diff didn't add — a charset gate before render, and a world-rebuild on commit — and a test that feeds the renderer something a ROM never would.

### Reviewer (code review) — Delivery Findings

- **Gap** (blocking): the persisted board is shape-validated but not charset/range-validated before it reaches `encodeChar`, which throws in the uncaught rAF loop. Affects `plugins/millipede/src/main.ts` (loadHighScores threading) + `plugins/millipede/src/core/attract-showcase.ts` (encodeChar/showcaseSections must fail safe). *Found by Reviewer during code review (with reviewer-security).*
- **Gap** (blocking): the `entry`→`attract` commit does not rebuild a fresh attract world, leaving stale game state on the attract demo. Affects `plugins/millipede/src/shell/input.ts` + `plugins/millipede/src/core/sim.ts` (route the edge through `advancePhase`/`entryComplete` + a `createGame` rebuild). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): anchor the `.save(` source guard to `highScoreStorage.save`; move the insert-on-commit into a core function so the shell reducer matches the mc precedent it cites and `entryComplete` stops being dead. Affects `plugins/millipede/tests/highscore-wiring.test.ts`, `plugins/millipede/src/shell/input.ts`, `plugins/millipede/src/core/`. *Found by Reviewer during code review (with reviewer-rule-checker).*

## Tea Assessment

**RED landed. New file: `plugins/millipede/tests/highscore-wiring.test.ts` (commit on the
feature branch).** State on arrival: `9 failed | 3 passed | 6 skipped` in the file, the
rest of the millipede project green (`86 passed`, `1391` tests), `tsc --noEmit` green.
Every failure is Dev-actionable; the 6 skips are the RED-seam (Group C's `beforeAll` throws
on the not-yet-built `nameEntryFromKey` export, message names it). The 3 passers are
non-vacuous GREEN guards (entry already frozen; a non-qualifying game-over is not entry;
the seeded fake-store is lobby-shaped).

**Structure (adopting the mc7-2/mc7-3 contract — see the Delivery Finding above):**
- **A** — `createGame` seeds `highScores`/`initials` (RED: fields absent → `undefined`).
- **B** — sim routes a qualifying game-over→`entry`, keeps a non-qualifying one out, FREEZES
  `entry`, and PRESERVES the ladder across the attract→play and game-over→attract rebuilds
  (RED: routing deferred at sim.ts:433, rebuilds reset the ladder). The freeze test is a
  green guard (millipede already froze `entry`).
- **C** — the shell `nameEntryFromKey` reducer: buffer append/cap/backspace + Enter-commit
  (RED-seam, variable-specifier import keeps tsc green).
- **D** — behavioural boot: `bootMillipedeShell()` over a fake `localStorage` seeded with a
  non-default board proves `main` threads `loadHighScores(makeMilliHighScoreStorage())` into
  the boot state (`sim().highScores` deep-equals the persisted board). Boot succeeded and
  `__sim` was set — the RED is the un-threaded ladder, not a harness crash.
- **E** — comment-stripped `main.ts` wiring floor: `loadHighScores`/`makeMilliHighScoreStorage`,
  `nameEntryFromKey`, and a `.save(` gated on `highScores !==` (the asteroids/mc reference-change
  signal).

**tsc idiom:** the two new `GameState` members are read through a local `EntryState` cast so
the lint gate stays green while `GameState` still lacks them; the RED lands at runtime.

**Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md` + project rules):**
- *Graceful degradation / never-throw persistence* — already covered by
  `tests/high-score-persistence.test.ts` (corrupt JSON, non-array, unreachable store all fall
  back to the seeded ladder without throwing). ml10-2 adds no new storage code, so that floor
  still governs; Dev's `main.ts` boot-load must not re-introduce a throw path.
- *Meaningful assertions (no vacuous tests)* — every `it` asserts a concrete value; the
  potentially-weak Group D equality is hardened with a second `not.toEqual(DEFAULT_HIGH_SCORES)`
  so seeding DEFAULT-and-forgetting-the-load can't pass it.
- *Core purity* — no new core numeric constants; the wiring reuses cited `qualifiesForHighScore`/
  `insertHighScore`/`stepInitials`; keyboard + localStorage stay in `src/shell`, off the
  `purity.test.ts` core sweep.

**For Dev (Korben):** make A–E green in order (fields → sim routing/preservation → shell
reducer → main.ts wiring). Then run the **`/millipede/` visual playtest** — a green suite is
necessary-not-sufficient for AC1's render half and AC3's no-regression clause (see the Gap
finding). THE SWEEP IS THE SOUND has no bearing here, but the HUD/showcase board is eyes-only.
## Tea Assessment (rework round 1)

**RED for the two Reviewer HIGHs.** New/changed:
- `tests/highscore-hostile-board.test.ts` (new) — [SEC]: boots the real shell over a hostile persisted board (lowercase name + negative score, both admitted by shape-only `isHighScoreRow`) and runs a full attract cycle; RED with `RangeError: no ROM char code for "a"` (the `encodeChar` throw in the uncaught rAF loop). Fix-agnostic — passes under either a charset filter at `loadHighScores` OR a fail-safe `encodeChar`/`place`.
- `tests/highscore-wiring.test.ts` Group C — [EDGE]: a qualifying commit must return to a FRESH attract world (`score === 0`), not the ended game's stale score. RED now (score stays at the played value).

State: `2 failed | 1406 passed` (only the two new pins fail); tsc green. **For Dev:** make both green — recommended fix (per the Reviewer, addresses the [RULE] #14 dead-signal too): on commit, rebuild a fresh attract world preserving the updated ladder (e.g. `{ ...createGame(state.seed), highScores: insertHighScore(state.highScores, { name: state.initials, score: state.score }) }`), and validate/sanitize the loaded board to the renderable charset in `loadHighScores` (drop rows failing `/^[A-Z0-9 ]*$/` on name or `!(Number.isInteger(score) && score >= 0)`) and/or make `encodeChar`/`place` render a blank for an unencodable char. Also tighten the non-blocking items: anchor the `.save(` guard to `highScoreStorage.save`, and correct the `input.ts:40` mc-parity comment. Re-run the `/millipede/` playtest after the fix.