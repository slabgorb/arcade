---
story_id: pt1-8
jira_key: pt1-8
epic: pt1
workflow: tdd
---
# Story pt1-8: millipede + missile-command + star-wars: erase the built-in high score (board starts empty)

## Story Details
- **ID:** pt1-8
- **Jira Key:** pt1-8
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-8-erase-builtin-high-score
- **PR:** (none yet — recorded when the PR is created)

## Acceptance Criteria

1. millipede, missile-command and star-wars each start with an EMPTY live high-score board on a first/empty boot: loadHighScores() (and the equivalent seed path, e.g. star-wars seedDefaultHighScores) returns [] when storage is empty, and the initial GameState board is [].
2. On a fresh boot each game's displayed HIGH SCORES table / top HIGH value shows the empty state (blank/zero rungs), never the ROM default names+scores (BBM/DFT/OBI etc.).
3. A persisted board with real localStorage scores still loads unchanged (real scores only, never re-seeded over).
4. DEFAULT_HIGH_SCORES and its ROM byte-decode + citation/audit tests REMAIN in all three games as unwired reference: no runtime seed path imports it, and the fidelity/citation suite stays green.
5. Seed-behavior tests that asserted the ladder appears on empty boot / in initial state / in attract are rewritten to assert the empty-start behavior; no test still requires a seeded default on a clean board.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T17:00:51Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T15:58:43Z | 2026-08-20T16:01:38Z | 2m 55s |
| red | 2026-08-20T16:01:38Z | 2026-08-20T16:31:02Z | 29m 24s |
| green | 2026-08-20T16:31:02Z | 2026-08-20T16:46:14Z | 15m 12s |
| review | 2026-08-20T16:46:14Z | 2026-08-20T17:00:51Z | 14m 37s |
| finish | 2026-08-20T17:00:51Z | - | - |

## Sm Assessment

**Story shape (as re-scoped at setup):** Remove the pre-seeded ROM `DEFAULT_HIGH_SCORES` ladder from the runtime seed path of THREE games (millipede, missile-command, star-wars) so each high-score board starts EMPTY on a first/empty boot — localStorage-backed real scores only. Deliberate, user-sanctioned ROM-fidelity deviation (playtest 2026-08-19 fix). Re-pointed 2 → 5 after premise-verification found the scope understated and a third seeded game (star-wars) unlisted.

**Two user rulings applied (2026-08-20):** (1) star-wars is IN scope — all three seeded games; (2) keep `DEFAULT_HIGH_SCORES` + its ROM byte-decode/citation-audit tests as UNWIRED REFERENCE (documentation only) — change only the seed path and empty-boot display, never the constant's decode contract.

**Handoff to TEA (RED):** Write failing tests proving the empty-start behavior for all three games (ACs 1-3), and prove the reference-constant survives green (AC4). The load-bearing subtlety is in Delivery Findings and the context file: KEEP the byte-decode/citation tests untouched; REWRITE only the seed-behavior tests. Blast radius (exact files + line anchors) pre-mapped in `sprint/context/context-story-pt1-8.md` and Delivery Findings so RED doesn't rediscover it. Core/shell purity boundary applies per game — the change straddles core initial-state and shell load-fallback.

**Board hygiene:** claim committed (`833244c3`) and branch `feat/pt1-8-erase-builtin-high-score` pushed to origin; story stamped `in_progress`.

## Tea Assessment

**RED delivered (commit `3412cd64`, pushed).** 17 failing tests describe the empty-board
behaviour across the three games; orchestrator 503/503, tsc clean, no unexpected cascade.

**Single seed point per game (this is Dev's whole GREEN surface):**
- millipede: `src/core/game-state.ts:194` `highScores: DEFAULT_HIGH_SCORES` → `[]`; and
  `src/shell/highscore.ts:69` `return saved.length > 0 ? saved : DEFAULT_HIGH_SCORES` →
  `return saved`. **Also guard the HUD read** `src/main.ts:292`
  `state.highScores[0].score` → `state.highScores[0]?.score ?? 0` (mc's idiom) or the empty
  board crashes the attract HUD. Drop the now-unused `DEFAULT_HIGH_SCORES` imports.
- missile-command: `src/core/game.ts:177` (inside `createPlayGame`, the ONE factory —
  `createGame` derives from it) `highScores: DEFAULT_HIGH_SCORES` → `[]`; and
  `src/shell/highscore.ts:39` same `? saved : DEFAULT_HIGH_SCORES` → `return saved`. Drop
  the imports. mc's render (`render.ts:329` `highScores[0]?.score ?? 0`) is ALREADY
  empty-safe — no HUD change needed.
- star-wars: `src/main.ts:65` `let highScores = seedDefaultHighScores(highScoreStorage.load())`
  → `let highScores = highScoreStorage.load()`; remove the `seedDefaultHighScores` import.
  Then `src/core/highScores.ts::seedDefaultHighScores` is dead + forbidden (it reads
  `DEFAULT_HIGH_SCORES`) — delete the function. star-wars render (`render.ts:1807`
  `if (highScores.length === 0)`) is ALREADY empty-safe ("NO SCORES YET").

**KEEP the constant + its ROM byte-decode / citation tests (AC4 — unwired reference):**
`DEFAULT_HIGH_SCORES` stays declared in each `core/highscore.ts`; do NOT touch
`millipede/tests/highscore.test.ts`, `millipede/tests/audit/high-scores-claims.test.ts`,
`missile-command/tests/highscore.test.ts`, `missile-command/tests/citations.test.ts`, or
the decode/sw8-20 blocks kept in `star-wars/tests/core/default-high-scores.test.ts`. The
AC4 source-guard enforces this both ways: exactly ONE declaration must remain, and zero
runtime references. Update the now-STALE seed comments (millipede/mc `shell/highscore.ts`
"the seeded ROM defaults stand", millipede `main.ts:56`, mc `game.ts:226`) when you change
the code — lang-review #17.

### Rule Coverage (lang-review/typescript.md)
- **#24 (retirement applied only where named):** the AC4 source-guard scans EVERY
  `src/**/*.ts` (positive read-set floor per **#28** — REQUIRED seed files asserted present),
  so a seed left in any file, not just the ones I found, reddens it.
- **#15 / #25 (source-text guard mutation-tested & anchored, not whole-file token):** the
  guard anchors each hit to `export const DEFAULT_HIGH_SCORES` per line (not a whole-file
  match), is RED on the current seeded tree (mutation-proven — it detects the live seed),
  and goes green only when the seed is gone. star-wars' main.ts guard is a NEGATIVE
  whole-file match (`.not.toMatch`) — permitted by #25.
- **#21 (degenerate-but-not-nullish input to numeric code):** the millipede boot test
  renders 20 frames on an EMPTY board; the unguarded `highScores[0].score` throws unless
  guarded — the empty array is present, not nullish, exactly the case `??` alone misses.
- **#8 / #18 / #26 (test quality — no vacuous / self-referential assertions):** every new
  assertion pins a concrete value (`toEqual([])`, first/last ROM row, declaration count);
  no fixture-equals-expectation, no all-local-terms identity.

**Do NOT restore the seed to make a flipped test green** — the empty-start board IS the
spec (a sanctioned ROM deviation). See Delivery Findings + Sm Assessment.

## Dev Assessment

**GREEN (commit `dc735176`, pushed).** Full suite **18149 pass / 0 fail** (1234 files),
orchestrator 503/503, tsc clean. All 17 pt1-8 RED tests pass; no test disabled or deleted.

**Implementation — exactly the seam TEA mapped, minimal:**
- millipede: `game-state.ts` `createGame` → `highScores: []`; `shell/highscore.ts`
  `loadHighScores` → `storage.load().filter(isRenderableRow)` (dropped the DEFAULT
  fallback); `main.ts:292` HUD read guarded `highScores[0]?.score ?? 0`. Dropped the now
  unused `DEFAULT_HIGH_SCORES` imports; updated 2 stale seed comments.
- missile-command: `createPlayGame` → `highScores: []` (the one factory `createGame`
  derives from); `shell/highscore.ts` `loadHighScores` → `storage.load()`. Render was
  already empty-safe. Dropped imports; updated `startGame` + load comments.
- star-wars: `main.ts` boots `highScoreStorage.load()` directly; DELETED
  `seedDefaultHighScores` (its only job was seeding, and it read the forbidden constant).
  Render already draws "NO SCORES YET" on `length === 0`. Updated the module header.

**AC4 held:** `DEFAULT_HIGH_SCORES` remains declared once per game, wired to nothing; the
source-guard is green (exactly one declaration, zero runtime references) and the ROM
byte-decode / citation suites are untouched and green.

**One thing for the Reviewer (see Design Deviations):** the empty-board change altered
qualification behaviour, cascading to 4 indirect seeded-board-premise fixtures. I pinned
an explicit full ladder into each to preserve their intent (non-qualifying / render
paths). No assertion semantics were changed to force green.

## Reviewer Assessment

**Verdict:** APPROVED (round 1). Commit `733eb01a`. Full suite 18149 pass / 0 fail; orchestrator 503/503; tsc clean.

**Findings — all comment-only, all fixed in place before approval (3 stale seed comments):**
1. **[DOC]** star-wars `tests/core/default-high-scores.test.ts` header — a leftover sw7-3 RED directive still said "a fresh cabinet must greet the player with Rebel names" + "Dev creates seedDefaultHighScores", contradicting pt1-8. Trimmed (commit `a6dccf87`).
2. **[DOC]** star-wars `src/core/highScores.ts:5` — tense flip `greeted`→`greets`; that sentence is a timeless real-ROM hardware fact (DOINTS on NOVRAM reset), unchanged by this port. Reverted (commit `a6dccf87`).
3. **[RULE]** millipede `src/core/attract-showcase.ts:17` — said the showcase table "is core/highscore.ts DEFAULT_HIGH_SCORES", but `showcaseSections()` takes the LIVE ladder as a parameter (empty on a fresh cabinet). File was outside the diff, so the stale comment survived. Fixed (commit `733eb01a`). Caught by rule-checker #17.

**[SEC]** clean — no unguarded index access introduced, no #21 degenerate-input hazard, and the `isRenderableRow` / `isHighScoreRow` localStorage validation is unchanged by this diff. **[RULE]** all 30 lang-review checks pass (the one #17 finding above fixed); source-guards mutation-verified live; core/shell purity intact. **[DOC]** all rewritten seed comments now match the empty-boot behaviour.

**Correctness (verified independently — edge/silent-failure/type-design/simplifier subagents are disabled on this project, so assessed by the Reviewer directly):**
- The empty board changes qualification (`qualifiesForHighScore([], anyPositive) === true`), so a real game-over now always routes to name-entry — intended clean-leaderboard behaviour, confirmed the user's spec. The self-playing ATTRACT demos CANNOT reach name-entry: `advancePhase('attract', …)` returns `'play'` only on `startRequested` (millipede phase.ts:67-68), and mc `self-playing-attract.test.ts:313` pins "never auto-flips to play/over". No stuck-attract bug.
- The one previously-unguarded consumer (millipede `main.ts:292` `highScores[0].score`) is now `?.score ?? 0` (#4/#21). mc render (`render.ts:329`) and star-wars render (`render.ts:1807` length===0 → "NO SCORES YET") were already empty-safe. `showcaseSections([])` renders the "HIGH SCORES" title with no rows — clean empty state, no `[0]` access.

## Subagent Results
**Cycle: 1** (re-verification method: all enabled subagents run once this cycle; no rework rounds).

**All received:** Yes (all 4 enabled specialists returned; the 5 disabled specialists were assessed first-hand by the Reviewer).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | Reported BLOCKED on a confabulated "AC-3 adoption / one game per commit" rule | Dismissed — verified false (`grep tests/` finds no such rule; the only AC-3 is an unrelated audio-dispatch check; pt1-8 is intentionally 3-game). Its transient 1/503 orch failure was the rule-checker's live in-tree mutation; clean run is 503/503. Lint PASS + 0 debug corroborated. |
| 2 | reviewer-comment-analyzer | Yes | findings | 2 stale seed comments [DOC] (items 1 & 2) | Fixed in commit `a6dccf87` |
| 3 | reviewer-security | Yes | clean | none [SEC] | N/A — no unguarded index access, no #21 hazard, validation unchanged |
| 4 | reviewer-rule-checker | Yes | findings | 1 stale comment #17 [RULE] (item 3); all 30 checks else clean, source-guards mutation-verified live | Fixed in commit `733eb01a` |
| 5 | reviewer-edge-hunter | Disabled | skipped | — | Assessed by Reviewer (Correctness above: attract demos can't reach entry) |
| 6 | reviewer-silent-failure-hunter | Disabled | skipped | — | Assessed by Reviewer (no swallowed errors; load seams return `[]` explicitly) |
| 7 | reviewer-test-analyzer | Disabled | skipped | — | Assessed by Reviewer (source-guards non-vacuous & mutation-proven; 4 cascade fixtures pin genuine full ladders) |
| 8 | reviewer-type-design | Disabled | skipped | — | Assessed by Reviewer (no type changes beyond `[]` seed literals) |
| 9 | reviewer-simplifier | Disabled | skipped | — | Assessed by Reviewer (minimal diff — one seam per game) |

**Working-tree audit:** the rule-checker's mutation probes were self-restored; the only non-source dirty file observed was pf's own `sprint/epic-pt1.yaml` review status stamp (tracking-only, expected). Final tree clean apart from the fix commits, which are pushed.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[SM / Titus Pullo] Question (non-blocking) — premise verified + two user rulings applied at setup.** The filed story ("millipede + missile-command", 2pt) understated scope. Premise-verification found THREE games seed a ROM-faithful `DEFAULT_HIGH_SCORES` ladder into the live board (millipede `game-state.ts:194` + `shell/highscore.ts:69`; missile-command `game.ts:177` + `shell/highscore.ts:39`; star-wars `highScores.ts:42` `seedDefaultHighScores`). The story's "consistent with the rest of the fleet" rationale was therefore factually imperfect — star-wars breaks it. User ruled (2026-08-20): (1) **star-wars is IN scope** — all three games; (2) **keep `DEFAULT_HIGH_SCORES` + its ROM byte-decode/citation-audit tests as UNWIRED REFERENCE** (documentation only), change only the seed path + empty-boot display. Re-pointed 2 → 5.
- **[SM] The load-bearing test distinction for TEA/Dev:** two classes of test touch `DEFAULT_HIGH_SCORES` and they get OPPOSITE treatment. KEEP GREEN & untouched: the byte-decode / ROM-citation tests (millipede `tests/highscore.test.ts` decode + `tests/audit/high-scores-claims.test.ts`; missile-command `tests/highscore.test.ts` decode + `tests/citations.test.ts`; star-wars equivalent) — they assert the CONSTANT decodes correctly, not that it is seeded, so they survive as reference. REWRITE: the seed-behavior tests that assert the ladder appears on empty boot / in initial state / in attract (millipede `high-score-persistence.test.ts`, `highscore-wiring.test.ts`, `attract-showcase.test.ts`, `attract-showcase-colour.test.ts`, `highscore-hostile-board.test.ts`; missile-command `mc7-3-name-entry-wiring.test.ts`, `mc7-2-name-entry.test.ts`, `mc6-5-attract-presentation.test.ts`, `mc7-4-ladder-display.test.ts`; star-wars: grep `seedDefaultHighScores` empty-board assertions). Full blast radius is in `sprint/context/context-story-pt1-8.md`.
- **[SM] This is a deliberate, user-sanctioned ROM-fidelity DEVIATION.** Erasing the seed departs from the original cabinets (which ship the default ladder). That is intended — a playtest UX fix, not a regression. Dev/Reviewer: do not "restore" the seed to make a rewritten test green; the empty-start behavior is the spec.
- **[TEA / Atia] Gap (blocking for GREEN) — millipede's attract HUD read is UNGUARDED.** `plugins/millipede/src/main.ts:292` reads `state.highScores[0].score` with no optional chaining. The moment the board becomes `[]`, that is `undefined.score` and the attract rAF loop throws every frame. Guard it (`highScores[0]?.score ?? 0`, the mc precedent) as part of GREEN — `pt1-8-empty-high-score.test.ts` boots + renders 20 frames on an empty board to catch exactly this. missile-command and star-wars render paths are already empty-safe (verified: `render.ts:329` `?.score ?? 0`; `render.ts:1807` `length === 0` → "NO SCORES YET").
- **[TEA] Improvement (non-blocking) — the seed cascade is already fenced.** Most name-entry / routing tests that assert on `highScores` build their fixtures with an EXPLICIT board (millipede `gameOverState`/`entry` helpers seed DEFAULT or LIVE_BOARD; mc `stateWith`/`entry` seed DEFAULT), so they survive the `createGame → []` flip untouched — only the assertions on a FRESH game's own board were flipped. mc11-3's reference-identity checks (`toBe(ladderBefore)`) and insert checks are board-content-agnostic and stay green. Verified: whole-suite run shows 17 RED, all intended, 5428 pass — no stray cascade.
- **[TEA] Note — mc has ONE seed factory.** `createGame` = `{...createPlayGame(seed), phase: INITIAL_PHASE}`, so changing `createPlayGame:177` covers both; `startGame`/`beginSetup` already carry the ladder forward (`{...createPlayGame(), highScores: state.highScores}`), which is correct for an empty board too.

### Dev (implementation)

- **[Dev] Gap resolved — the empty-board qualification cascade.** TEA's fixture analysis was right that the DIRECT seed assertions were fenced, but 4 INDIRECT tests carried a seeded-board premise without naming the constant (a low score is non-qualifying; the attract ladder has rungs). On the empty board those premises invert (`qualifiesForHighScore([], anyPositive) === true`; a fresh ladder is empty). Fixed by pinning an explicit FULL ladder into each — logged in Design Deviations. This is the ONLY behavioural ripple; the full suite (18149) is otherwise unchanged.
- **[Dev] Confirmed — the three render paths on an empty board:** millipede HUD now guards `highScores[0]?.score ?? 0` (was the one crash site); missile-command `render.ts:329` already `?.score ?? 0` + `slice`; star-wars `render.ts:1807` already `length === 0` → "NO SCORES YET". All exercised green.
- **[Dev] For Reviewer — no visual playtest run.** Behaviour is covered by tests (empty-board render + HUD guard). If the Reviewer wants eyes-on, `just serve` → `/millipede/`, `/missile-command/`, `/star-wars/` with cleared localStorage shows the empty boards.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev / Lucius Vorenus] Modified 4 EXISTING test fixtures during GREEN (not TEA's pt1-8 tests).** What: pinned an explicit FULL high-score ladder into four seeded-board-premise fixtures — `mc4-playthrough.test.ts` (wave-end game-over → over), `mc7-3-name-entry-wiring.test.ts` (non-qualifying game-over → over), `mc7-4-ladder-display.test.ts` (`attractFrame` render fixture), `millipede/tests/sim.test.ts` (game-over → fresh attract). Why: these tests build from `createGame`/`createPlayGame` (now an EMPTY board) and their premise was "a low score does NOT qualify" / "the attract ladder has 5 rungs" — both true ONLY on the retired seeded board. On an empty board `qualifiesForHighScore([], anyPositive)` is true (open rungs), so a low-score game-over now routes to name-entry and a fresh ladder renders 0 rungs. Spec said (AC5): "no test still requires a seeded default on a clean board." These are exactly that class — indirect (they never named `DEFAULT_HIGH_SCORES`, so RED's grep didn't reach them). The fix PRESERVES each test's original intent by giving it an explicit full ladder, rather than changing what it asserts. Forward-impact: the new empty-board qualification behaviour (first game on a clean board always offers name entry) is intended and now only covered positively by the pt1-8 tests + these preserved paths — Reviewer should confirm it's the desired UX.