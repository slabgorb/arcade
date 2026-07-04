---
story_id: "bz1-10"
jira_key: "none"
epic: "bz1"
workflow: "tdd"
---
# Story bz1-10: Difficulty ratchet + scoring/lives + game-over/attract (up to ROM ceiling)

## Story Details
- **ID:** bz1-10
- **Jira Key:** none
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** battlezone
- **Branch:** feat/bz1-10-difficulty-scoring-attract

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-04T02:25:47Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-04T01:21:43Z | 2026-07-04T01:23:24Z | 1m 41s |
| red | 2026-07-04T01:23:24Z | 2026-07-04T01:39:16Z | 15m 52s |
| green | 2026-07-04T01:39:16Z | 2026-07-04T01:55:57Z | 16m 41s |
| review | 2026-07-04T01:55:57Z | 2026-07-04T02:10:33Z | 14m 36s |
| red | 2026-07-04T02:10:33Z | 2026-07-04T02:19:15Z | 8m 42s |
| green | 2026-07-04T02:19:15Z | 2026-07-04T02:22:26Z | 3m 11s |
| review | 2026-07-04T02:22:26Z | 2026-07-04T02:25:47Z | 3m 21s |
| finish | 2026-07-04T02:25:47Z | - | - |

## TEA Assessment

**Tests Required:** Yes
**Reason:** —

**Test Files:**
- `battlezone/tests/core/difficulty.test.ts` — the ratchet: ROM constants (7000 ceiling, +1000/death, 17 s ramp), monotonicity, hard clamp at the ROM ceiling, [0,1] normalization, spawn-age ramp, `extraTanksEarned` crossing semantics (exact-boundary, no re-award, independent second threshold, double-leap)
- `battlezone/tests/core/framing.test.ts` — Mode machine: attract boot, start-edge → fresh run, inert gameplay input in attract, self-playing deterministic demo (alive, seed-reproducible, input-proof), full attract→playing→gameover→attract loop with identical re-entered demo trajectory, high-score table updated by attract re-entry, scoreless runs excluded
- `battlezone/tests/core/lives.test.ts` — death decrements lives and stays playing, enemy score +1000 per death (both sides of the ratchet), zero lives → gameover, extra-tank award wired through the sim on real kill crossings
- `battlezone/tests/core/highscore.table.test.ts` — ported sibling table helpers: 10-deep, qualification (positive-only, strict beat when full, ties defer), descending insert, truncation, immutability
- `battlezone/tests/shell/storage.test.ts` — persistence seam under `battlezone-high-scores`: round-trip, lobby read contract (finite numeric scores), every unhappy path degrades to [] (absent/corrupt/non-array/malformed rows/throwing storage), write failures swallowed, readonly input
- `battlezone/tests/core/screens.test.ts` — screen content as core data: title, PRESS START prompt, board rendering; the coin-op descope asserted on rendered lines AND on source string literals of screens.ts/render.ts/main.ts (`?raw` audit)

**Tests Written:** 55 tests across 6 files covering all 7 testable ACs (the 8th AC — clean build + green suite — is the GREEN-phase gate)
**Status:** RED (verified by testing-runner: 6 new files fail solely on unresolved imports of the six not-yet-existing modules; all 25 pre-existing files / 413 tests pass — the RED is surgical)

**Pinned GREEN surface:** `src/core/difficulty.ts` (aggression, extraTanksEarned, FULL_AGGRESSION_DIFFERENTIAL, ENEMY_SCORE_PER_PLAYER_DEATH, AGGRESSION_RAMP_SECONDS, BONUS_TANK_SCORES), `src/core/state.ts` (GameState{mode, player, playerShell, enemies, score, enemyScore, lives, highScores}, initGame, STARTING_TANKS, Mode), `src/core/sim.ts` (stepGame), `src/core/highscore.ts` (sibling port, entries {name, score, date?}), `src/core/screens.ts` (attractLines, gameOverLines), `src/shell/storage.ts` (sibling port, key `battlezone-high-scores`), plus `Input.start`.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (core) | `core-purity-sweep.test.ts` auto-covers every new `src/core/*.ts` (as any / @ts-ignore / as unknown as banned) | standing sweep |
| #2 readonly parameters | `storage.test.ts` "accepts a readonly table and does not mutate it" | failing (RED) |
| #3 enums | Mode pinned as a string union via literal comparisons (sibling convention, no enum) | failing (RED) |
| #4 null/undefined | `storage.test.ts` unhappy paths; null shells in crafted sim states (`lives.test.ts`, `framing.test.ts`) | failing (RED) |
| #8 test quality | Self-check done — every test asserts concrete values; no `let _`, no vacuous is-defined-only assertions; loose casts confined to the documented pre-GREEN Input.start convention | done |
| #10 runtime input validation | `storage.test.ts` "drops malformed rows and keeps the well-formed survivors" (JSON.parse never trusted via `as T`) | failing (RED) |
| #11 error handling | `storage.test.ts` throwing getItem/setItem swallowed gracefully | failing (RED) |
| core purity (epic rule) | new modules swept automatically by `core-purity-sweep.test.ts`; determinism ACs enforce seeded-RNG discipline behaviorally | standing sweep |

**Rules checked:** 8 of 13 lang-review checks have applicable surface in this story; the remainder (React/JSX, async, build-config, barrel imports) have no surface in a pure-core + localStorage story.
**Self-check:** 0 vacuous tests found.

**Handoff:** To Dev (The Word Burgers) for GREEN. Read the Pinned GREEN surface above plus the two Gap findings: the DIP pins (BONUS_TANK_SCORES, STARTING_TANKS) need a cited factory default, and main.ts must call the storage seam at the gameover→attract transition.

## TEA Assessment — review round 1 (rework RED)

**Tests Required:** Yes (Reviewer rejection — hardening loop)
**Test changes (commit 9b87068, pushed):**
- `tests/core/enemies-aggro.test.ts` (NEW, 5 tests) — the [MEDIUM][TEST] finding: mild tanks crawl (aggro 0 < aggro 1 distance), mild tanks take bad shots where full aggression holds fire (0.45 rad probe), shell leaves along the bad barrel line, and the "omitted aggro === aggro 1" regression guarantee deep-equality-pinned through both a plain step and a kill step. All RELATIVE assertions — bz1-12 retuning safe.
- `tests/shell/storage.test.ts` (+5 tests) — the two [SEC] mediums as RED tests: load-cap at MAX_HIGH_SCORES (FAILS), non-finite scores dropped incl. the JSON `1e999` → Infinity smuggle (FAILS), name length bounded at the 3-char convention (FAILS); plus two passing branch guards (bare-primitive rows, throwing `localStorage` property getter).
- `tests/core/framing.test.ts` (+4 tests) — GAME_OVER_SECONDS boundary (still gameover shy of the constant, attract just past) and dt=0 sanity in all three modes (no framing movement, no NaN, zero-dt frames never creep the game-over clock).
- `tests/core/screens.test.ts` (audit rebuilt) — coin-op audit now SWEEPS src/shell/*.ts + main.ts + core/screens.ts by directory (no hand-named list), with literals JOINED per file and NFKC-normalized/zero-width-stripped before matching (defeats the demonstrated split-string and zero-width bypasses); empty-board test strengthened (asserts no orphaned HIGH SCORES heading).
- Stale `as unknown as Input` casts and their misleading pre-GREEN comments retired from framing/lives suites (test files are TEA's domain; the [LOW][RULE] finding).

**Status:** RED — verified by testing-runner (RUN_ID bz1-10-tea-red-r1): EXACTLY the three storage hardening tests fail; 513/516 pass, zero regressions, new guards green against the existing wiring.

**Remaining for Dev (The Word Burgers):**
1. `src/shell/storage.ts` — make the three RED tests green: filter non-finite scores + names > 3 chars in `isHighScoreEntry`, cap the filtered table at `MAX_HIGH_SCORES` on load.
2. `src/core/highscore.ts` + `src/core/screens.ts:15` — the [MEDIUM][RULE] readonly cluster (readonly entry fields, readonly table type/params). Type-level; not runtime-testable — Reviewer re-checks.
3. No other src changes — everything else in Joe's table was test-side and is done.

**Handoff:** To Dev for GREEN (round 1).

## Dev Assessment — review round 1 (rework GREEN)

**Implementation Complete:** Yes (commit b0bd1e8, pushed)
**Files Changed:**
- `battlezone/src/shell/storage.ts` — the three RED tests green: `isHighScoreEntry` now requires `Number.isFinite(score)` (JSON's `1e999` → Infinity smuggle) and `name.length ≤ 3` (the arcade convention, `MAX_NAME_LENGTH`); `loadHighScores` caps the filtered table at `MAX_HIGH_SCORES` — the read path now bounds row shape, score domain, name length, AND row count
- `battlezone/src/core/highscore.ts` — the [MEDIUM][RULE] readonly cluster: `HighScoreEntry` fields readonly, `HighScoreTable = readonly HighScoreEntry[]` (params/returns follow via the alias; `attractLines`' param inherits it). Type-level only; divergence from the sibling ports documented in the module comment per the epic's extraction-evidence ruling

**Tests:** 516/516 across 32 files (GREEN verified by testing-runner, RUN_ID bz1-10-dev-green-r1); lint + build clean. The three storage hardening tests flipped red→green; zero regressions.
**Branch:** feat/bz1-10-difficulty-scoring-attract (pushed; 4 commits ahead of develop)

**All Reviewer findings addressed:** [MEDIUM][TEST] aggro wiring (TEA's enemies-aggro suite, green), [MEDIUM][SEC]×2 (storage guards, this commit), [MEDIUM][RULE] readonly cluster (this commit), [LOW][RULE] casts (TEA retired them), [LOW][TEST]×4 (boundary, dt=0, storage branches, audit hardening + empty-board — TEA, green).

**Handoff:** To Immortan Joe for re-review (round-trip 1).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (+ green mechanicals) | confirmed 1 (stale casts), 0 dismissed, 0 deferred |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary review performed inline (see Devil's Advocate + [EDGE] notes) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — swallow audit performed inline over shell/storage.ts (see [SILENT] note) |
| 4 | reviewer-test-analyzer | Yes | findings | 10 | confirmed 8, dismissed 0, deferred 2 (suite-sweep + empty-board fold-in noted as improvements, not rework-blocking) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — stale-comment check performed inline (found: the RED-convention comments on the stale casts are now misleading — folded into the cast finding) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type audit covered by reviewer-rule-checker rules #1/#2 (8 findings there) |
| 7 | reviewer-security | Yes | findings | 4 | confirmed 4 (2 medium seam gaps, 2 low stale casts — casts deduped into the [RULE] finding) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — complexity scan performed inline: no dead code, no over-abstraction found in the new modules |
| 9 | reviewer-rule-checker | Yes | findings | 8 | confirmed 8 (2 = stale casts deduped with #1/#7; 6 readonly-convention violations, one carrying an aliasing hazard) |

**All received:** Yes (4 of 4 enabled returned; 5 disabled via settings)
**Total findings:** 14 confirmed (deduped across sources), 0 dismissed, 2 deferred (logged as non-blocking improvements)

## Reviewer Assessment

**Verdict:** REJECTED

No Critical or High defects — every AC is met, 500/500 tests green, build/lint clean, core purity intact. The rejection is a single cheap hardening loop: confirmed project-rule violations (which I do not dismiss), two robustness gaps at the one trust boundary this story introduces, and a missing test on the story's central mechanic. All fixes are small and none change gameplay behavior.

| Severity | Tag | Issue | Location | Fix Required |
|----------|-----|-------|----------|--------------|
| [MEDIUM] | [TEST] | The aggro wiring into stepEnemies — the story's central mechanic — has NO direct test: nothing drives aggro≠1, and the "aggro 1 is EXACTLY pre-ratchet behavior" regression guarantee is untested | `battlezone/src/core/enemies.ts:342` | Add a relative-behavior test: identical state stepped with aggro=0 vs aggro=1 — low-aggro tank fires at wider error and/or crawls slower; aggro omitted === aggro 1 output. Relative assertions survive bz1-12 retuning |
| [MEDIUM] | [SEC] | loadHighScores never caps table length; attractLines renders every row per frame — tampered/oversized localStorage degrades the attract render unboundedly | `battlezone/src/shell/storage.ts:64` | Slice to MAX_HIGH_SCORES on load; test with an oversized stored array |
| [MEDIUM] | [SEC] | isHighScoreEntry admits NaN/±Infinity scores (typeof number) and unbounded name strings — both flow to per-frame fillText | `battlezone/src/shell/storage.ts:26` | Require Number.isFinite(score) and cap/reject absurd name lengths; test both |
| [MEDIUM] | [RULE] | Rule #2 readonly violations ×6 in the new pure core: mutable `HighScoreTable`, non-readonly params (qualifies/insert/attractLines), non-readonly HighScoreEntry fields — real aliasing hazard since insertHighScore stores the caller's reference | `battlezone/src/core/highscore.ts:17-42`, `src/core/screens.ts:15` | readonly table type/params/fields, matching every other interface in this diff (Input, GameState, Hostile). The "port verbatim" mandate does not license importing sibling tech debt; divergence in a ported copy is evidence for the future extraction story (epic ruling) |
| [LOW] | [RULE] | Rule #1: stale `as unknown as Input` double-casts (+ unneeded `as Input` on JUNK) — Input.start landed in this very diff; casts verified removable by tsc. Their "pre-GREEN" comments are now misleading | `battlezone/tests/core/framing.test.ts:40-41`, `tests/core/lives.test.ts:25` | Drop the casts and the stale RED-convention comments |
| [LOW] | [TEST] | GAME_OVER_SECONDS exact boundary untested (only 1 s hold + 30 s eventually) | `battlezone/tests/core/framing.test.ts` | Boundary test: still gameover one frame before 3 s, attract at/after |
| [LOW] | [TEST] | dt=0 (main.ts's real first frame) unexercised in any mode | `battlezone/tests/core/framing.test.ts` | stepGame(state, input, 0) per mode: no NaN, no spurious transition |
| [LOW] | [TEST] | storage: throwing `globalThis.localStorage` GETTER branch and the primitive-row disjunct of isHighScoreEntry never exercised | `battlezone/tests/shell/storage.test.ts` | Two small tests (defineProperty throwing getter; a bare-primitive row in the mixed fixture) |
| [LOW] | [TEST] | Coin-op source audit defeatable by string-splitting/zero-width chars (empirically demonstrated) and scans a hand-named 3-file list — same anti-pattern core-purity-sweep was built to kill | `battlezone/tests/core/screens.test.ts:23,40` | Join extracted literals per file (NFKC-normalize) before matching; sweep all src/shell + main.ts + core screens rather than naming files |
| [LOW] | [TEST] | Empty-board attract test near-vacuous (passes for any non-empty string array) | `battlezone/tests/core/screens.test.ts:60` | Assert the HIGH SCORES heading is ABSENT on an empty table |

**Verified good (evidence + rule compatibility):**
- [VERIFIED] Ratchet is wired: `sim.ts:102` computes `aggression(s.score − s.enemyScore, s.enemies.hostile.phaseAge)`; `sim.ts:106` passes it as stepEnemies' 6th arg. Complies with the epic's single-ratchet design; TEA's delivery finding satisfied. (What's missing is the TEST — see [MEDIUM][TEST] above.)
- [VERIFIED] Persistence wiring: `main.ts:62` loads at boot into the attract state; `main.ts:77` saves exactly on the non-attract→attract transition — the AC's "before/at the transition". Storage key literal `battlezone-high-scores` at `storage.ts:19` matches the lobby's `{gameId}-high-scores` reader.
- [VERIFIED] Extra-tank ordering is arcade-true: crossings credited at `sim.ts:115` BEFORE the death decrement at `sim.ts:120` — a same-frame bonus tank saves the run (lives 1 → 2 → 1, still playing).
- [VERIFIED] Core purity: zero banned tokens and zero type escapes across all 7 touched core modules (rule-checker rules #14/#15, instances 14/14; independently enforced forever by core-purity-sweep, 500/500 green).
- [VERIFIED] stepGame is identical-in→identical-out: no module state in sim.ts/state.ts; demoInput/startRun/returnToAttract pure functions of state (rule-checker #16, 5/5); framing determinism suite passes.
- [VERIFIED] ROM constants quote the findings, not taste: 7000/1000/17 in `difficulty.ts:33-39` cite §5; DSW0 pins 15K/100K (`difficulty.ts:44`) and 3 tanks (`state.ts:34`) carry the arcade-museum factory-default citation — the exact MISSILE_INTRO_THRESHOLD precedent.
- [SILENT] Swallow audit (specialist disabled, done inline): all four bare catches live in `shell/storage.ts` only, each scoped to storage IO, each degrading to a safe value with the two parse paths console.warn-ing — the sanctioned pattern; no swallowed errors anywhere in core (security specialist corroborates, 4/4 compliant).
- [EDGE] Boundary review (specialist disabled, done inline): dt=0 safe by construction (stepFiring guards dist ≤ 0, blast expiry guards dt > 0, movement scales by dt) but untested — captured as the [LOW][TEST] dt=0 finding; runSeed arithmetic (`seed + round(modeAge·60)`) stays finite and `>>> 0`-wrapped at any idle duration; clamp long-stall dt at 0.05 in the shell.
- [SIMPLE] Complexity scan (specialist disabled, done inline): no dead code, no speculative abstraction in the six new modules; sim.ts's demo/real split via one boolean parameter is the minimal shape; nothing to remove.
- [DOC] Comment audit (specialist disabled, done inline): module headers cite ROM sources accurately; ONE stale-comment case found — the "start does not exist on Input until GREEN" comments above the now-removable casts (folded into the [LOW][RULE] cast finding).

**Data flow traced:** localStorage payload (untrusted) → `loadHighScores` (JSON.parse as unknown → Array.isArray → per-row isHighScoreEntry) → `GameState.highScores` → `returnToAttract`/`insertHighScore` (descending, 10-cap on write) → `attractLines` template rows → `drawScreenLines` fillText. Safe against crash/injection everywhere; the two [SEC] mediums are the residual holes (length/finiteness on the READ path). Second trace: kill award → `stepBattle` score delta → `extraTanksEarned` crossing → lives — all ROM constants cited.
**Pattern observed:** good — the shell/core seam held perfectly through a full main.ts rewire (`main.ts:77` persistence at the transition; zero core imports of shell, rule-checker #18: 7/7). Bad — `highscore.ts` imported the sibling's non-readonly shape into a codebase that is otherwise 100% readonly (the [MEDIUM][RULE] cluster).
**Error handling:** storage seam degrades on every unhappy path (tested for corrupt JSON/non-array/malformed rows/throwing getItem+setItem); core has no throwing paths (pure data flow); the enemy fire gate's `!playerHit` guard closes the killed-by-spent-shell edge.
**Security analysis:** no injection surface (canvas fillText only), no secrets/URLs/PII in diff, no networking, ?raw test imports never execute source, no tenant model applicable. Trust boundary = localStorage; residual gaps are the two mediums above.
**Hard questions asked:** multi-day attract idle (runSeed wraps, deterministic, no crash); held start across transitions (shell edge-latch is repeat-proof; core one-shot semantics); double-threshold single-leap (+2 tanks, tested); death+crossing same frame (extra tank saves the run — verified above); tampered storage (the two mediums); backgrounded-tab dt (shell clamps 0.05).

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md` (13 checks) + epic core-purity rules. Exhaustive enumeration by reviewer-rule-checker (84 instances across 20 rules), cross-checked inline:

| Check | Result |
|-------|--------|
| #1 type-safety escapes | **FAIL** — 2 stale `as unknown as Input` in tests (framing:40, lives:25); src/ clean (0 escapes, purity-sweep enforced) |
| #2 generics/interfaces/readonly | **FAIL** — 6 violations clustered in `highscore.ts` + `screens.ts:15` param (see [MEDIUM][RULE]); everything else compliant incl. GameState/Input fully readonly, BONUS_TANK_SCORES readonly tuple, saveHighScores readonly param |
| #3 enums | PASS — no enums; Mode is a string union (house convention #17: compliant) |
| #4 null/undefined | PASS — `??` used correctly (storage:37 et al.); optional `start` truthiness is boolean-safe; Map.get guarded in test fake |
| #5 modules/declarations | PASS — 17/17 type-only imports correct; no ambient declares; `.js` extension sub-rule N/A (Vite bundler resolution, tsconfig moduleResolution: bundler) |
| #6 React/JSX | N/A — no .tsx |
| #7 async/Promise | N/A — no async code in diff |
| #8 test quality | PASS with the #1 casts noted there; fake Storage cast justified (lib.dom index signature); src-only imports; no vi.mock |
| #9 build/config | N/A — untouched; strict mode confirmed on |
| #10 input validation | PASS — JSON.parse → unknown → runtime-validated (the two [SEC] mediums are validation-STRENGTH gaps, not `as T` trust violations) |
| #11 error handling | PASS — 4/4 catches scoped to storage IO, safe degradation |
| #12 performance/bundle | PASS — no barrels; stringify cold-path only (10-row cap on write path) |
| #13 fix-regression meta | PASS — the two in-flight GREEN fixes (comment reword, `!playerHit` gate) re-scanned clean |
| Epic purity (tokens+escapes in core) | PASS — 14/14 files clean; sweep suite enforces permanently |
| Epic determinism (identical-in→out) | PASS — 5/5 sim functions pure; framing determinism suite green |
| Core never imports shell | PASS — 7/7 |

### Devil's Advocate

Assume this code is broken. A player leaves the cabinet idling overnight: modeAge grows to ~5×10⁶ seconds, runSeed becomes `seed + 3×10⁸` — still exact in doubles, wrapped `>>> 0`, deterministic; no crash, but every run started after the same idle span replays the same battle, which nobody will ever notice and the ROM's own attract had equivalent determinism. A speedrunner mashes Enter: the shell latch emits one start per physical press (repeat-guarded), and start is inert in playing and in gameover — the worst outcome is a dropped press during the 3-second game-over card, mildly annoying, arcade-authentic. A confused player might believe the demo is playable — junk input is provably inert; only the PRESS START line tells them otherwise, same as 1980. Now the hostile filesystem equivalent: a tampered localStorage. `[{name: 'A'.repeat(10⁶), score: 1e309}]` sails through isHighScoreEntry (`typeof` checks only), renders "Infinity" and megabyte-wide fillText every attract frame; an array of 10⁶ rows is filtered but never truncated, so attractLines strokes a million lines per frame — the render loop dies. Self-inflicted, same-origin only, but the fix is two lines and this review demands it. What about the sim's arithmetic? A kill that crosses BOTH bonus thresholds in one step would need a 85,000-point single award — impossible with ROM kill values, but extraTanksEarned handles it correctly anyway (tested, +2). Score never decreases within a run, so crossings cannot re-fire; a new run resets both sides of the ratchet. The `!playerHit` fire-gate: could it starve enemy fire permanently? No — playerHit is per-step, recomputed false next step. The deepest cut: the "aggro 1 === pre-ratchet behavior" guarantee is asserted in a comment and enforced by nothing; a future refactor could silently shift the default battle balance with 500 tests still green. That is the exact hole the machine cannot leave open — it becomes the [MEDIUM][TEST] rework item, and it is why this verdict is REJECTED rather than approved-with-notes.

**Handoff:** Back through the red gate — Imperator Furiosa (TEA) writes the missing tests (aggro wiring relative-behavior, storage finiteness/cap/name-length + throwing-getter + primitive-row, GAME_OVER boundary, dt=0, audit hardening), then The Word Burgers make them green alongside the mechanical fixes (readonly cluster, cast removal, storage guards). No behavior of the shipped game changes; this is armor, not surgery.

## Reviewer Assessment — re-review round 1

**Verdict:** APPROVED

Every finding from the round-1 table is verified resolved against the rework diff (commits 9b87068 + b0bd1e8), with independent mechanical re-verification by reviewer-preflight: 516/516 tests across 32 files, tsc clean, build clean, working tree clean, branch byte-identical to origin. Tag sweep for the record: [EDGE] boundary + dt=0 now tested; [SILENT] storage swallows unchanged and still scoped; [TEST] all seven test findings closed; [DOC] the misleading pre-GREEN cast comments removed with the casts; [TYPE]/[RULE] readonly cluster landed (entry fields, table alias — params inherit; tsc proves no consumer breaks) and zero type escapes remain in the story's diff; [SEC] both seam gaps closed (finite scores, 3-char names, board-depth cap on load — RED tests flipped green); [SIMPLE] the fixes added no new abstraction, two files, +32/−9.

| Round-1 finding | Resolution | Verified at |
|---|---|---|
| [MEDIUM][TEST] aggro wiring untested | `tests/core/enemies-aggro.test.ts` — 5 relative-behavior tests (crawl, bad shots, barrel line, default-invariance ×2), green | commit 9b87068 |
| [MEDIUM][SEC] uncapped load | `.filter(...).slice(0, MAX_HIGH_SCORES)` | storage.ts loadHighScores |
| [MEDIUM][SEC] non-finite/unbounded rows | `Number.isFinite(score)` + `name.length ≤ 3` in the guard | storage.ts isHighScoreEntry |
| [MEDIUM][RULE] readonly cluster | readonly entry fields + `readonly HighScoreEntry[]` alias; divergence-from-port documented in module comment | highscore.ts |
| [LOW][RULE] stale casts | Gone — grep-verified zero `as unknown as`/`as any` added lines in the story diff | framing/lives suites |
| [LOW][TEST] ×4 (boundary, dt=0, storage branches, audit + empty board) | All landed and green; audit now swept/joined/normalized | framing/storage/screens suites |

**Data flow re-traced:** tampered localStorage → guard now bounds shape, score domain, name length, AND row count → nothing unbounded can reach the per-frame fillText. The round-1 hole is shut.
**Residual notes (non-blocking, already filed as Delivery Findings):** initials-entry follow-up candidate; spawn-direction aggression for bz1-12; findings-doc absorption of the two DIP pins.

You will ride eternal, shiny and chrome.

**Handoff:** To The Organic Mechanic (SM) for finish — PR creation, merge, archive.

## Sm Assessment

Diagnosis: story is viable. Setup complete, no complications.

- Story bz1-10 (3 pts, epic bz1, repo battlezone) set up on workflow `tdd` (phased): setup → red → green → review → finish.
- Session file created; story context validated at `sprint/context/context-story-bz1-10.md` (existing curated content preserved — no epic-context clobbering, `sprint/` clean in git).
- Feature branch `feat/bz1-10-difficulty-scoring-attract` created off `develop` in the battlezone subrepo.
- Jira: none — this project tracks issues locally in sprint YAML only.
- Scope guard: difficulty ratchets UP TO the authentic ROM ceiling, never past it; no coin-op urgency mechanics.
- Next agent: tea (Imperator Furiosa) for the RED phase.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): The bz1-2 findings pin no factory default for the bonus-tank DIP pair or starting-tank count (unlike the missile threshold's 10K pin, findings §9). Tests constrain `BONUS_TANK_SCORES` to the three ROM DSW0 pairs and `STARTING_TANKS` to the 2–5 band; Dev must pin one option each WITH a cited source (arcade-museum.com factory defaults, the MISSILE_INTRO_THRESHOLD precedent) and record the citation in the findings doc or the module header. *Found by TEA during test design.*
- **Gap** (non-blocking): The persistence WIRING (who calls `saveHighScores` at the gameover→attract transition) lives in `src/main.ts` — shell code, verified by running the game per the house split. Core tests pin the table update in state; shell tests pin the seam; the call site itself is Reviewer's checklist item. Affects `src/main.ts` (wire storage save at run end). *Found by TEA during test design.*
- **Improvement** (non-blocking): The aggression→enemy-knob wiring (feeding `aggression()` into stepEnemies' provisional AI tuning) is deliberately NOT black-box asserted — the AI constants are provisional pending bz1-12 playtest true-up, so a behavioral assertion would be brittle. Reviewer should verify the sim actually passes the ratchet value into the enemy step. Affects `src/core/sim.ts` (ratchet must reach the knobs). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): The ROM's spawn-direction aggression (mild enemy "will appear in front of the player"; full aggression "spawns in any direction", findings §5) is NOT wired — `spawnHostile`'s ring placement predates the ratchet and ignores it. Affects `src/core/enemies.ts` (`spawnHostile` could take the aggression parameter). Candidate for bz1-12's playtest true-up alongside the provisional knob mapping. *Found by Dev during implementation.*
- **Improvement** (non-blocking): The two DSW0 factory defaults this story pinned (bonus tanks 15K/100K, 3 starting tanks — both $-marked on arcade-museum.com's Battlezone DIP sheet, re-confirmed this session) are cited in the module headers but not yet recorded in the findings doc. Affects `battlezone/docs/battlezone-1980-source-findings.md` (§9 could absorb the two pins next time it's touched). *Found by Reviewer during code review.* (originally noted by Dev)

### Reviewer (code review)
- **Improvement** (non-blocking): Authentic high-score INITIALS ENTRY (the real cabinet's 3-letter entry flow) was descoped with `DEFAULT_INITIALS = 'AAA'` as the single seam — a candidate follow-up story if the epic's fidelity bar wants it. Affects `battlezone/src/core/sim.ts` (`returnToAttract` would grow an entry sub-state). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): The coin-op source audit scans a hand-named 3-file list — the same anti-pattern `core-purity-sweep.test.ts` was built to kill; a future shell module with a hardcoded coin-op string would ship unscanned. Affects `battlezone/tests/core/screens.test.ts` (sweep `src/shell/*.ts` + `src/main.ts` + `src/core/screens.ts` by glob). In-scope fix requested in the rework, but the sweep-vs-list lesson is epic-level. *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (1 Gap, 0 Conflict, 0 Question, 2 Improvement)
**Blocking:** None

- **Gap:** The persistence WIRING (who calls `saveHighScores` at the gameover→attract transition) lives in `src/main.ts` — shell code, verified by running the game per the house split. Core tests pin the table update in state; shell tests pin the seam; the call site itself is Reviewer's checklist item. Affects `src/main.ts`.
- **Improvement:** The aggression→enemy-knob wiring (feeding `aggression()` into stepEnemies' provisional AI tuning) is deliberately NOT black-box asserted — the AI constants are provisional pending bz1-12 playtest true-up, so a behavioral assertion would be brittle. Reviewer should verify the sim actually passes the ratchet value into the enemy step. Affects `src/core/sim.ts`.
- **Improvement:** Authentic high-score INITIALS ENTRY (the real cabinet's 3-letter entry flow) was descoped with `DEFAULT_INITIALS = 'AAA'` as the single seam — a candidate follow-up story if the epic's fidelity bar wants it. Affects `battlezone/src/core/sim.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 3 modules

- **`battlezone/src/core`** — 1 finding
- **`src`** — 1 finding
- **`src/core`** — 1 finding

### Deviation Justifications

12 deviations

- **HighScoreEntry drops the sibling wave/level field**
  - Rationale: Battlezone has no wave/level counter; the run is the unit. The lobby reads only `score`, so the convention holds
  - Severity: minor
  - Forward impact: none — lobby contract explicitly tested (finite numeric `score`)
- **Game-over exit bounds pinned by TEA (hold ≥ 1 s, auto-return ≤ 30 s, no input)**
  - Rationale: authentic cabinets auto-cycle to attract (initials entry auto-confirms); a run loop that stalls without input is a defect, and unbounded tests can't exist
  - Severity: minor
  - Forward impact: Dev's entry sub-state (if any) needs a no-input timeout
- **DIP-dependent constants constrained to the ROM band, not one value**
  - Rationale: the findings deliberately record the DSW0 band and pin no factory default; TEA inventing one would violate "do not invent numbers here". Dev pins + cites (MISSILE_INTRO_THRESHOLD precedent)
  - Severity: minor
  - Forward impact: Delivery Finding filed for the citation duty
- **Aggression API normalized to [0, 1] with full = 1; ramp shape left free**
  - Rationale: the ROM quantifies endpoints and direction, not the interpolation; over-pinning would fabricate ROM facts
  - Severity: minor
- **Shell-side start-edge latch not unit-tested**
  - Rationale: house rule — the shell is verified by running the game (epic context: TDD on the core); siblings did the same
  - Severity: minor
  - Forward impact: bz1-12 live playtest covers it
- **No initials-entry sub-state — qualifying scores auto-record as 'AAA'**
  - Rationale: the original cabinet has initials entry, but the minimal state machine satisfying every AC (including TEA's no-input auto-cycle bound) records automatically; an entry UI would need new input semantics no test demands. The lobby reads only `score`
  - Severity: minor
  - Forward impact: if authentic initials entry is wanted, it's a bz1-12+ follow-up story; `DEFAULT_INITIALS` is the single seam
- **Ratchet→knob mapping: throttle ×(0.5+0.5a), fire gate ×(2−a)**
  - Rationale: the ROM narrative gives direction, not formulas; both scalings are no-ops at a=1 so the bz1-7/8 baseline (and its suites) are untouched. The mapping is provisional alongside the AI constants it scales
  - Severity: minor
  - Forward impact: bz1-12 playtest trues up; spawn-direction aggression filed as a Delivery Finding
- **Enemy never re-fires on the frame its shell killed the player**
  - Rationale: without it an aimed hostile refilled the shell slot in the same step its kill was registered, so the killing shell appeared unspent; one-frame lockout is the minimal semantics that honors "spent"
  - Severity: minor
  - Forward impact: none — one 60 Hz frame of fire latency after a successful enemy kill
- **Run seed = boot seed + demo clock at start press**
  - Rationale: pure (no wall clock) yet real players get varied battles because start timing varies; tests that start at tick zero replay exactly
  - Severity: minor
- **Name-length bound pinned at the 3-char arcade convention**
  - Rationale: our own writer never produces names over 3 chars (DEFAULT_INITIALS); truncation would silently rewrite data on a read path, filtering treats it like every other malformed row
  - Severity: minor
  - Forward impact: none — lobby reads only `score`
- **Load-cap semantics: keep the FIRST board-depth valid rows, no re-sort**
  - Severity: minor
- **Aggro coverage is RELATIVE, not absolute**
  - Severity: minor
  - Forward impact: bz1-12 can retune AI constants freely; only the gate ORDER and default invariance are pinned

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/difficulty.ts` (new) — the ratchet: `aggression(diff, spawnAge?)` (linear base curve, hard clamp at the +7000 ROM ceiling, ~17 s multiplicative spawn ramp, full differential overrides the ramp) + `extraTanksEarned` crossing counter. DSW0 pins cited: `BONUS_TANK_SCORES = [15000, 100000]` (arcade-museum.com factory default, the MISSILE_INTRO_THRESHOLD precedent)
- `battlezone/src/core/state.ts` (new) — `GameState`, `Mode`, `initGame(seed)` (boots attract, fully seed-derived), `STARTING_TANKS = 3` (cited factory default), `SPAWN_POSE`
- `battlezone/src/core/sim.ts` (new) — `stepGame` mode dispatch; shared battle step (movement → firing → ratcheted enemies → saucer, bz1-9 shell precedence preserved); lives/respawn/enemy-score bookkeeping; `GAME_OVER_SECONDS = 3` auto-cycle; high-score fold-in at the attract transition; deterministic demo autopilot (pure function of the demo clock)
- `battlezone/src/core/highscore.ts` (new) — sibling port, entries `{name, score, date?}`
- `battlezone/src/core/screens.ts` (new) — attract/game-over lines, coin-op-free
- `battlezone/src/shell/storage.ts` (new) — sibling port, key `battlezone-high-scores`
- `battlezone/src/core/enemies.ts` — optional `aggro = 1` param: scales tank throttle (×(0.5+0.5a)) and widens the fire gate (×(2−a)) so mild tanks crawl and take bad shots; default is byte-identical pre-ratchet behavior. Plus a `!playerHit` fire gate (no same-frame re-fire after a killing shell)
- `battlezone/src/core/input.ts` — optional one-shot `start` on `Input`; `NO_INPUT` extended
- `battlezone/src/shell/input.ts` — Enter/1 start EDGE latch (pendingStart pattern, key-repeat-proof)
- `battlezone/src/shell/render.ts` — `drawScreenLines` (centered overlay text) + `drawLives`
- `battlezone/src/main.ts` — rewired around one `GameState` + `stepGame`; loads the board at boot; persists via `saveHighScores` exactly at the run→attract transition (the AC's "before/at")

**Tests:** 500/500 passing across 31 files (GREEN verified by testing-runner; lint + typecheck also PASS). Zero regressions — the purity sweep covers all five new core modules; enemies suites unaffected by the default-1 knob.
**Branch:** feat/bz1-10-difficulty-scoring-attract (pushed to origin)

**Handoff:** To TEA (Imperator Furiosa) for verify (simplify + quality-pass), then Immortan Joe for review. Reviewer checklist from TEA's findings: the ratchet IS wired (sim.ts passes `aggression()` into `stepEnemies`); DIP pins carry citations; main.ts calls the storage seam at the attract transition.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **HighScoreEntry drops the sibling wave/level field**
  - Spec source: context-story-bz1-10.md, Technical Approach ("port the sibling core/highscore.ts ... verbatim")
  - Spec text: "port the sibling `core/highscore.ts` (`qualifiesForHighScore`/`insertHighScore`) and `shell/storage.ts` pattern verbatim, keyed `battlezone-high-scores`"
  - Implementation: Tests pin entries as `{ name, score, date? }` — no `wave` (star-wars) / `level` (tempest) analog
  - Rationale: Battlezone has no wave/level counter; the run is the unit. The lobby reads only `score`, so the convention holds
  - Severity: minor
  - Forward impact: none — lobby contract explicitly tested (finite numeric `score`)
  - → ✓ ACCEPTED by Reviewer: correct adaptation — the lobby reads only `score`, and the round-trip + lobby-contract tests prove the convention holds; sibling divergence is extraction-story evidence per the epic ruling
- **Game-over exit bounds pinned by TEA (hold ≥ 1 s, auto-return ≤ 30 s, no input)**
  - Spec source: context-story-bz1-10.md, Technical Approach + AC 6
  - Spec text: "`stepGame`'s mode dispatch drives `gameover -> (high-score check) -> attract`" — mechanism/timing unspecified
  - Implementation: Tests require gameover to hold ≥ 60 no-input steps and reach attract within 30 simulated seconds under NO input; any high-score entry sub-state must therefore time out on its own
  - Rationale: authentic cabinets auto-cycle to attract (initials entry auto-confirms); a run loop that stalls without input is a defect, and unbounded tests can't exist
  - Severity: minor
  - Forward impact: Dev's entry sub-state (if any) needs a no-input timeout
  - → ✓ ACCEPTED by Reviewer: arcade-true auto-cycle, bounds are sane; the missing EXACT 3 s boundary test is captured as a [LOW][TEST] rework finding, not a flaw in this decision
- **DIP-dependent constants constrained to the ROM band, not one value**
  - Spec source: context-story-bz1-10.md AC 3; findings §9
  - Spec text: "crossing the ROM threshold from the bz1-2 findings"
  - Implementation: `BONUS_TANK_SCORES` must equal one of {15K/100K, 25K/100K, 50K/100K}; `STARTING_TANKS` must be in {2,3,4,5}; behavior tests parameterize off the exported values
  - Rationale: the findings deliberately record the DSW0 band and pin no factory default; TEA inventing one would violate "do not invent numbers here". Dev pins + cites (MISSILE_INTRO_THRESHOLD precedent)
  - Severity: minor
  - Forward impact: Delivery Finding filed for the citation duty
  - → ✓ ACCEPTED by Reviewer: the right call — TEA inventing a pin would have violated "do not invent numbers here"; Dev discharged the citation duty (arcade-museum $-marked defaults re-fetched and cited in both module headers, verified at difficulty.ts:44 / state.ts:34)
- **Aggression API normalized to [0, 1] with full = 1; ramp shape left free**
  - Spec source: findings §5; context-story-bz1-10.md Technical Approach
  - Spec text: "a pure function mapping score differential to an aggression parameter"; "~17 seconds" ramp
  - Implementation: Tests pin `aggression(diff, spawnAge?)` ∈ [0,1], exactly 1 at ≥ 7000 differential, monotone in both args, ramp complete at 17 s, full-differential spawns full-aggression at age 0; interior curve shape and step-vs-gradual ramp are Dev's choice
  - Rationale: the ROM quantifies endpoints and direction, not the interpolation; over-pinning would fabricate ROM facts
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: agrees with author reasoning — the [0,1] normalization is exactly what lets the knobs scale by one parameter; endpoints/monotonicity are the only ROM facts and all are pinned
- **Shell-side start-edge latch not unit-tested**
  - Spec source: context-story-bz1-10.md, Technical Approach ("same latch pattern as the sibling shells' `pendingStart`")
  - Spec text: "a one-shot `start` input edge"
  - Implementation: Core tests consume `input.start` as a one-shot event; the keyboard edge latch lives in the shell and is verified by running the game
  - Rationale: house rule — the shell is verified by running the game (epic context: TDD on the core); siblings did the same
  - Severity: minor
  - Forward impact: bz1-12 live playtest covers it
  - → ✓ ACCEPTED by Reviewer: house rule, siblings identical; the shipped latch is additionally key-repeat-guarded (shell/input.ts `!e.repeat`), which is stronger than the sibling pattern

### Dev (implementation)
- **No initials-entry sub-state — qualifying scores auto-record as 'AAA'**
  - Spec source: context-story-bz1-10.md, Technical Approach
  - Spec text: "Extend the `Mode` type ... with whatever high-score entry sub-state is needed"
  - Implementation: No entry mode was needed: at the game-over→attract transition a qualifying score is inserted under `DEFAULT_INITIALS = 'AAA'`; Mode stays the three-value union
  - Rationale: the original cabinet has initials entry, but the minimal state machine satisfying every AC (including TEA's no-input auto-cycle bound) records automatically; an entry UI would need new input semantics no test demands. The lobby reads only `score`
  - Severity: minor
  - Forward impact: if authentic initials entry is wanted, it's a bz1-12+ follow-up story; `DEFAULT_INITIALS` is the single seam
  - → ✓ ACCEPTED by Reviewer: the spec explicitly delegated the judgment ("whatever ... is needed") and no AC demands an entry UI; TEA's no-input auto-cycle bound independently pushed the same direction. Follow-up filed as a Delivery Finding so the fidelity question stays visible
- **Ratchet→knob mapping: throttle ×(0.5+0.5a), fire gate ×(2−a)**
  - Spec source: findings §5; context-story-bz1-10.md ("feeds the roster's existing knobs")
  - Spec text: mild enemies "move uncertainly, and take bad shots"; full aggression at +7000
  - Implementation: aggression scales tank throttle from half to full and widens the aimed-fire gate at low aggression (fires while badly aimed = bad shots); missiles unratcheted; spawn placement unratcheted
  - Rationale: the ROM narrative gives direction, not formulas; both scalings are no-ops at a=1 so the bz1-7/8 baseline (and its suites) are untouched. The mapping is provisional alongside the AI constants it scales
  - Severity: minor
  - Forward impact: bz1-12 playtest trues up; spawn-direction aggression filed as a Delivery Finding
  - → ✓ ACCEPTED by Reviewer (design) / coverage FLAGGED: the mapping is sound and default-invariant, but its behavioral payload and the "aggro 1 === pre-ratchet" guarantee have NO direct test — this is the [MEDIUM][TEST] rework finding driving the rejection
- **Enemy never re-fires on the frame its shell killed the player**
  - Spec source: tests/core/lives.test.ts ("the fatal shell is spent"); bz1-8 shell semantics
  - Spec text: "decrements lives, stays playing, and the fatal shell is spent"
  - Implementation: the fire gate gained `!playerHit` — a hostile whose shell struck the player this frame waits one frame before shouldering a new shell
  - Rationale: without it an aimed hostile refilled the shell slot in the same step its kill was registered, so the killing shell appeared unspent; one-frame lockout is the minimal semantics that honors "spent"
  - Severity: minor
  - Forward impact: none — one 60 Hz frame of fire latency after a successful enemy kill
  - → ✓ ACCEPTED by Reviewer: minimal semantics honoring "the fatal shell is spent"; playerHit is per-step so the gate cannot starve enemy fire (re-verified in the Devil's Advocate pass)
- **Run seed = boot seed + demo clock at start press**
  - Spec source: context-epic-bz1.md (determinism guardrail); context-story-bz1-10.md AC 6
  - Spec text: "replaying from the same seed must reproduce an identical demo trajectory"
  - Implementation: `startRun` derives the run's seed word from `seed + round(modeAge·60)`; attract re-entry rebuilds from the pure boot seed
  - Rationale: pure (no wall clock) yet real players get varied battles because start timing varies; tests that start at tick zero replay exactly
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer: elegant purity-preserving variation; arithmetic stays exact and `>>> 0`-wrapped at any idle duration (checked to multi-day modeAge in the Devil's Advocate pass)

### Reviewer (audit)
- No undocumented spec deviations found beyond the nine stamped above — TEA and Dev logged their divergences in real time; the audit uncovered nothing they missed.

### TEA (test design — review round 1)
- **Name-length bound pinned at the 3-char arcade convention**
  - Spec source: Reviewer Assessment [MEDIUM][SEC] (isHighScoreEntry gaps); core/highscore.ts entry comment ("3 chars, arcade convention")
  - Spec text: "cap/reject absurd name lengths (e.g. ... matching the 3-char arcade convention already documented in the comment)"
  - Implementation: Tests pin FILTER semantics — rows with name.length > 3 are dropped on load (consistent with the guard's other malformed-row handling); shorter/empty names remain valid
  - Rationale: our own writer never produces names over 3 chars (DEFAULT_INITIALS); truncation would silently rewrite data on a read path, filtering treats it like every other malformed row
  - Severity: minor
  - Forward impact: none — lobby reads only `score`
  - → ✓ ACCEPTED by Reviewer (round 1): filter-not-truncate is the right read-path semantics; bound verified at storage.ts (MAX_NAME_LENGTH = 3) with the RED test flipped green
- **Load-cap semantics: keep the FIRST board-depth valid rows, no re-sort**
  - Spec source: Reviewer Assessment [MEDIUM][SEC] (unbounded load)
  - Spec text: "Slice to MAX_HIGH_SCORES (or re-sort descending and slice)"
  - Implementation: Tests pin filter-then-slice(0, 10) without re-sorting — the table's descending order is a documented writer-side invariant (qualifiesForHighScore precondition), and the read path should bound, not repair
  - Severity: minor
  - Forward impact: none
  - → ✓ ACCEPTED by Reviewer (round 1): bound-don't-repair matches the seam's whole philosophy (degrade, never rewrite); implemented at storage.ts loadHighScores with the write-path-bypass rationale in the comment
- **Aggro coverage is RELATIVE, not absolute**
  - Spec source: Reviewer Assessment [MEDIUM][TEST]
  - Spec text: "Relative assertions survive bz1-12 retuning"
  - Implementation: enemies-aggro.test.ts asserts mild < full (distance), mild-fires-where-full-holds (0.45 rad probe between the two gate widths), and omitted === aggro 1 deep-equality — zero absolute speed/angle constants
  - Severity: minor
  - Forward impact: bz1-12 can retune AI constants freely; only the gate ORDER and default invariance are pinned
  - → ✓ ACCEPTED by Reviewer (round 1): exactly the coverage demanded — the 0.45 rad probe sits between the two gate widths, and the deep-equality default-invariance tests turn the code comment's regression promise into an enforced contract