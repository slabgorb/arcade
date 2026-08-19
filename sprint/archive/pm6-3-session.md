---
story_id: pm6-3
jira_key: pm6-3
epic: pm6
workflow: tdd
---
# Story pm6-3: ACT 2 (ripped-ghost / 'nail') + ACT 3 (worm / tearing-ghost): the second and third coffee-break cutscenes, layered on the pm6-2 scripted-actor player

## Story Details
- **ID:** pm6-3
- **Jira Key:** pm6-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pm6-3-cutscene-act2-ripped-ghost-act3-worm
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-19T15:37:20Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T14:59:24Z | 2026-08-19T15:00:51Z | 1m 27s |
| red | 2026-08-19T15:00:51Z | 2026-08-19T15:14:11Z | 13m 20s |
| green | 2026-08-19T15:14:11Z | 2026-08-19T15:22:29Z | 8m 18s |
| review | 2026-08-19T15:22:29Z | 2026-08-19T15:32:30Z | 10m 1s |
| green | 2026-08-19T15:32:30Z | 2026-08-19T15:35:40Z | 3m 10s |
| review | 2026-08-19T15:35:40Z | 2026-08-19T15:37:20Z | 1m 40s |
| finish | 2026-08-19T15:37:20Z | - | - |

## Sm Assessment

**Story:** pm6-3 — the second and third Pac-Man coffee-break cutscenes (Act 2 ripped-ghost/"nail", Act 3 worm/tearing-ghost), layered on the pm6-2 scripted-actor player. Two new scripted timelines on an existing framework — **not** a new framework, **not** new sprites.

**Where the work lives (consume, don't rebuild):**
- `plugins/pac-man/src/core/cutscene.ts` — the pm6-2 scripted-actor player (Act 1 already here). Act 2 + Act 3 are new timelines added here.
- `plugins/pac-man/src/core/intermission.ts` / `actor.ts` — the pm6-1 intermission phase + actor primitives; consumed.
- pm3 baked sprites (ripped ghost, worm) — **CONSUMED**, no new bake.
- Tests: `plugins/pac-man/tests/core/cutscene.test.ts`; claims dossier `plugins/pac-man/docs/rom-study/claims/cutscene.json`; citation gate `plugins/pac-man/tests/audit/citations.test.ts`.

**Non-negotiable constraints TEA must pin at RED:**
- **Decision C (RED-anchor):** every path/timing constant anchored to the vendored source + dossier and CITED. Anchor the citation to the byte that *encodes the value* (per the citation-anchoring rule), and audit every constant in one pass. Each constant → a `citations.test.ts` claim.
- **Decision B (accessibility OUTRANKS ROM fidelity):** gentle animation, NO >3 Hz large-area strobe. This is the standing photosensitive-epilepsy rule — a test must guard it.
- **act→level mapping** is pinned by a test (which act plays at which level cadence).
- **Purity + determinism:** `purity.test.ts` stays green; each scene replays bit-for-bit under seed.

**AC coverage TEA owns (RED):** AC1 both acts play at cited cadence + deterministic replay; AC2 paths/timing RED-anchored & cited, sprites consumed; AC3 mutation-reddens + no un-cited src/core value + act→level mapping; AC4 no-strobe + pm3 palette.

**Routing:** phased tdd — TEA (red) → Dev (green) → Reviewer → SM (finish). Blocks pm6-5 (visual playtest). No blockers; dependencies (pm6-1, pm6-2, pm3) all shipped.

## Tea Assessment

**RED landed:** `plugins/pac-man/tests/core/cutscene-act2-act3.test.ts` (23 tests: 22 RED, 1 green precondition). Full pac-man suite: 460 pass / 22 fail, all 22 in the new file — pm6-2's `cutscene.test.ts` and everything else stays green. Commit `21f1bfe3`.

**ROM ground truth (studied this phase — the three intermission drivers are siblings):**
- act 1 state `4e06` driver `2108` (pm6-2, done)
- act 2 state `4e07` driver `219e`; act 3 state `4e08` driver `2297`
- The coffee-break actor-init `260f` is SHARED — seeds Pac `4d3a=0x1f` (266b) and Blinky `4d32=0x1e` (261e) for ALL acts. No per-act start column: acts 2/3 CONSUME `ACT1_PAC_START_COL`/`ACT1_BLINKY_START_COL`.

**GREEN contract — the Dev must add to `src/core/cutscene.ts`:**
- Add `act: 1 | 2 | 3` to `CutsceneState` and `ripped: boolean` to `CutsceneActor`. **`createAct1Cutscene` must set `act: 1` and `ripped: false`** (the round-2 regression test asserts `.act === 1`).
- `export const ACT2_PAC_SNAG_COL = 0x2c` — pacman.asm:21e4 `sub #2c` (line 4743)
- `export const ACT3_PAC_COL = 0x25` — pacman.asm:22aa `sub #25` (line 4830)
- `export const ACT3_WORM_COL_A = 0x2d` — pacman.asm:22e0 `sub #2d` (line 4857)
- `export const ACT3_WORM_COL_B = 0x1e` — pacman.asm:22f8 `sub #1e` (line 4866)
- `createAct2Cutscene(seed)` — run-in → Pac reaches snag col 0x2c → Blinky `ripped=true` → gentle tear-hold → done. NO big-Pac (that's act 1). Ripped is a one-way latch.
- `createAct3Cutscene(seed)` — run-in (Pac 0x25) → worm crosses (worm gate 0x2d) → worm exits (worm gate 0x1e) → done. The worm is the tattered ghost (`ripped`). The 0x2d→0x1e leg is a reversal like act 1's return; the ±1 step SIGN is honest-uncited (the port's representation, no byte-claim), same as pm6-2.
- `cutsceneActForLevel(level): 1|2|3|null` — 2→1, 5→2, 9/13/17→3, else null. Honest-uncited map gated on `INTERMISSION_LEVELS`.
- `createCutsceneForLevel(level, seed): CutsceneState | null` — the selector game.ts calls.
- `stepCutscene` must become act-agnostic (drive the script the state carries), not hardcode `ACT1_SCRIPT`.

**Wiring — `src/core/game.ts` intermission handler (~line 640):** replace `if (state.level === INTERMISSION_LEVELS[0]) state.cutscene = createAct1Cutscene(state.seed)` with `state.cutscene = createCutsceneForLevel(state.level, state.seed)`. The existing `!state.cutscene.done` termination arm already generalises (a cutscene owns its own end).

**Citations — add to `docs/rom-study/claims/cutscene.json`** (byte-verified by `tests/audit/citations.test.ts`; anchor to the value byte, verbatim EXACT):
| addr | line | verbatim |
|------|------|----------|
| 219e | 4711 | `219e  3a074e    ld      a,(#4e07)` |
| 21e4 | 4743 | `21e4  d62c      sub     #2c` |
| 162d | 3223 | `162d  3a074e    ld      a,(#4e07)` |
| 2297 | 4821 | `2297  3a084e    ld      a,(#4e08)` |
| 22aa | 4830 | `22aa  d625      sub     #25` |
| 22e0 | 4857 | `22e0  d62d      sub     #2d` |
| 22f8 | 4866 | `22f8  d61e      sub     #1e` |

**Traps (from memory + pm6-2):** anchor each claim to the `sub #NN` value byte, NOT the adjacent load; after writing claims, MUTATE one byte to prove citations.test.ts reddens (it byte-checks the verbatim but NOT that the value is inside it). The tear/worm sprite-swap frames run off the ROM's `4d01` counter whose tick→frame factor isn't in the asm — keep any hold honest-uncited (like `FREEZE_BEAT_FRAMES`), do NOT fabricate a frame literal. Ripped/worm ART is CONSUMED from pm3's `SPRITES` (#32/#33) — bake nothing.

## Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)
- **Exhaustiveness on enum/union (#TS switch-assertNever):** the act→level map is pinned TOTAL — every `INTERMISSION_LEVELS` round maps to a real act (1/2/3), every non-break round → null (AC3 mapping test). If GREEN dispatches on `act` via switch, it needs `default: assertNever`.
- **Optional-chain / nullable result without null check:** `createCutsceneForLevel` returns `| null`; both the null arm (round 3 → null) and the non-null arm (`?.act`) are asserted.
- **Test quality (no vacuous assertions):** self-checked — every test asserts a concrete value or set; the one already-green test (CONSUMED sprites) is a real AC2 precondition guard (reddens if pm3 sprites are removed/emptied), not vacuous.
- **Accessibility (Decision B, standing epilepsy ruling):** AC4 pins no flash/invert/strobe field, gliding ≤ 2 tiles/frame (no teleport), and ripped as a one-way latch (no flicker).

**Delivery Finding (non-blocking):** the level-5+ Elroy-2 speed defect pm6-2 flagged still stands (out of pm6-3 scope) — the integration tests force the level-clear→intermission transition directly to stay off it, exactly as pm6-2's no-cutscene test did.

## Dev Assessment

**GREEN landed** (`5b69ff1c`). Full pac-man suite **482/482**, `npm run lint` clean (tsc --noEmit, repo-wide). pm6-3 file 23/23, citations gate 54/54.

**What changed:**
- `src/core/cutscene.ts` — generalised the pm6-2 player to be act-agnostic: `CutsceneState.act: 1|2|3`, `CutsceneActor.ripped`, `SubstateSpec.onEnter` (frighten/reverse/bigPac/rip). Act 1's hardcoded boundary effects are now data (frighten+reverse on sub 3, bigPac on sub 5) — byte-identical behaviour, pm6-2's suite unchanged. Added `ACT2_SCRIPT`/`ACT3_SCRIPT`, the four cited thresholds, `createAct2/3Cutscene`, `cutsceneActForLevel`, `createCutsceneForLevel`. `stepCutscene`/`advance` dispatch on `ACT_SCRIPTS[act]`.
- `src/core/game.ts` — intermission handler now calls `createCutsceneForLevel(level, seed)` (was act-1-only); dropped the now-unused `INTERMISSION_LEVELS` import.
- `docs/rom-study/claims/cutscene.json` — 7 new claims (219e, 21e4, 162d, 2297, 22aa, 22e0, 22f8), each anchored to its `sub #NN` value byte.

**Mutation-proofed (per the citation-anchoring discipline):**
- Constant drift `ACT2_PAC_SNAG_COL 0x2c→0x2b` → reddens the AC3 value-pin. Reverted.
- Claim verbatim drift `sub #25→#99` → reddens the citations byte-check with a cited/actual diff. Reverted (54/54 restored).

**Design decisions (minimal, faithful):**
- Acts 2/3 CONSUME the pm6-2 start columns (ROM actor-init #260f is shared) and pm3's baked ripped/worm sprites (#32/#33) — no new constants, no new bake.
- The tear-hold reuses `FREEZE_BEAT_FRAMES` (honest-uncited — the #4d01 tick→frame factor isn't in the asm), never a fabricated frame literal.
- Act 3's 0x2d→0x1e crawl-back is a `reverse` on-enter (the ±1 step sign is the port's honest-uncited representation, same policy as pm6-2's act-1 return leg).

**Note for the Reviewer:** `BIG_PAC_FIRST_SUBSTATE` remains exported (pm6-2 tests import + value-pin it) but is no longer read inside cutscene.ts — big-Pac now arms via `ACT1_SCRIPT[5].onEnter.bigPac`. The constant stays as the pinned public API; the positional link (index 5 == the constant) is intentional, not dead code.

## Dev Rework — Round 1 (`3d402850`)

Addressed every reviewer finding. Full pac-man suite **483/483** (+1 new test), lint clean.
1. **[BLOCKING, fixed]** Added the act-3 behavioral transition test tying `ACT3_SCRIPT`'s gate columns to the cited constants. **Mutation-proven:** hard-coding a wrong column (0x40) into `ACT3_SCRIPT` now reddens the new test (was drift-green). AC3 gap closed.
2. **[fixed]** `advance()` docstring rewritten act-agnostic (`ACT_SCRIPTS[s.act].length - 1`; per-act citations moved to each act's script comment).
3. **[fixed]** `game.ts` `cutscene` + `freezeFrames` field docs updated — every coffee-break round now runs a scripted cutscene; the frame-count hold is the forced-null-only fallback.
4. **[fixed]** intermission handler comment + INTERMISSION_HOLD_FRAMES doc refreshed likewise.
5. **[fixed]** CONSUMED-sprites test reframed as an explicit pm6-5 precondition guard (not an AC2 behavioral claim).
6. **[note, no change]** `cutsceneActForLevel` positional coupling left as-is (documented, stable 5-element dossier constant — a guard would be busywork).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | all gates green (pac-man 482, citations 54, purity 27, lint PASS, orchestrator 503); zero smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 2 (1 blocking AC3 gap, 1 test-wording), dismissed 0, deferred 2 (precedent) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 | confirmed 1 (advance() docstring); citations byte-verified ✓ |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 3 stale-comment (rules #17/#24), 1 soft-coupling note (non-blocking) |

**All received:** Yes (4 enabled + 5 disabled pre-filled)
**Total findings:** 4 confirmed blocking, 3 non-blocking (test-wording + soft-coupling + notes), 2 deferred (precedent). Reviewer-independent read corroborated the stale field docs (game.ts:283/267).
**Working-tree audit:** `pf reviewer audit-tree` initially DIRTY on `sprint/epic-pm6.yaml` (the pf `status: in_progress→in_review` stamp, a known false-positive that exits 0 — not a source mutation); reverted the stamp, re-audit CLEAN. Subagents left no source changes (test-analyzer used an isolated worktree).

## Reviewer Assessment

**Round-Trip Count:** 0
**Verdict:** REJECTED — rework required.

The implementation is architecturally sound (one data-driven `stepCutscene` for all three acts), all mechanical gates pass, and every ROM citation is byte-verified correct. But one **explicit AC3 violation** and a cluster of stale comments must be fixed before finish.

### BLOCKING

1. **[TEST] [HIGH — AC3 drift-green] Act-3 thresholds are value-pinned but not behaviorally wired** — `plugins/pac-man/tests/core/cutscene-act2-act3.test.ts`. Proven by mutation (test-analyzer, isolated worktree): replacing all three gate columns *inside* `ACT3_SCRIPT` with unrelated values left **23/23 green**. Act 2 does NOT have this gap — its "rips at col" test (line ~200) wires `ACT2_PAC_SNAG_COL` to observed behavior. AC3 requires "mutating any path/timing constant reddens an assertion; no drift-green." **Fix (TEA):** add an act-3 analogue asserting the sub-state-0→1 transition occurs at/near `ACT3_PAC_COL`, 1→2 at/near `ACT3_WORM_COL_A`, and the final `blinky.col` at done is at/near `ACT3_WORM_COL_B`.

2. **[DOC] [RULE] [MEDIUM — stale docstring] `cutscene.ts:318-321` `advance()` docstring** describes act-1-only termination ("arms big-Pac from sub-state 5 ... ends when the final sub-state 6 gate is reached, Pac at 0x3d, pacman.asm:218f") as universal — false for act 2 (ends sub-state 1) and act 3 (ends sub-state 2), and contradicts the diff's own new inline comment 3 lines below. Confirmed by comment-analyzer + rule-checker #17/#24. **Fix (Dev):** rewrite generic.

3. **[RULE] [DOC] [MEDIUM — stale field docs] `game.ts:283-284` (`cutscene` field) + `game.ts:267-270` (`freezeFrames` field)** still assert "Only act 1 exists today; act 2/3 leave it null / the release only for cutscene-less coffee-break rounds." pm6-3 retires that model (`createCutsceneForLevel` returns non-null for every `INTERMISSION_LEVELS` entry). **Fix (Dev):** update both to the new always-non-null behavior.

4. **[RULE] [LOW — stale handler comments] `game.ts:651-661` + `game.ts:125-131` (INTERMISSION_HOLD_FRAMES doc)** describe the frame-count fallback as the live release for act 2/3; it is now a defensive/forced-null-only branch. **Fix (Dev):** note the fallback is retained only for a forced-null cutscene (still exercised by pm6-2's no-cutscene test).

### NON-BLOCKING (fix opportunistically)

5. **[TEST] [LOW-MED — test wording] CONSUMED-sprites test (line ~234)** passes independent of this diff (pre-existing pm3 atlas) and nothing in this story reads `blinky.ripped` — shell render is pm6-5's scope (verified: `state.cutscene` is read by no shell file, in pm6-2 *or* pm6-3, so core-only is correct and consistent). Reframe the test as an explicit precondition guard, not an AC2 behavioral claim. **(TEA, will fix this round.)**

6. **[RULE] [LOW — soft coupling, note only] `cutsceneActForLevel` positional coupling** to `INTERMISSION_LEVELS[0]/[1]/slice(2)` (rule-checker #4). Safe today (fixed 5-element dossier constant, both modules gate on the same array); a future reorder/shrink would silently mis-map. Documented in both files; not adding a defensive guard (would be busywork on a stable constant).

7. **[INFO] `createCutsceneForLevel` switch** is correct but not statically exhaustive (no `assertNever`); the `1|2|3|null` union is closed and `default: return null` is right. Optional future-proofing, not required.

8. **[INFO — precedent] flash-field naming guard + ignored-seed determinism tests** — consistent with pm6-2's act-1 pattern; no action.

## Subagent Results

**Cycle: 1**

**Method:** targeted re-verification of each round-0 finding via direct probes (mutation + grep + gate re-run), which is stronger evidence for characterized findings than a fresh generalist sweep. The round-0 sweep already ran all 4 enabled specialists; each of their confirmed findings was re-checked below.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (re-run) | clean | none | pac-man 483/483, lint PASS, audit-tree CLEAN |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes (re-verified) | resolved | 0 open | F1 fixed (mutation reddens on any act-3 gate mis-wire); F5 reframed |
| 5 | reviewer-comment-analyzer | Yes (re-verified) | resolved | 0 open | F2 advance() docstring generic; stale phrasing gone |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes (re-verified) | resolved | 0 open | F3/F4 stale field+handler docs updated; F6 accepted (documented coupling) |

**All received:** Yes (4 enabled re-verified + 5 disabled pre-filled)
**Total findings:** 0 open (round-0's 4 blocking all fixed + verified; 3 non-blocking resolved/accepted).
**Working-tree audit:** `pf reviewer audit-tree` DIRTY on the pf `status: in_progress→in_review` stamp (known false-positive, exits 0); reverted, re-audit CLEAN. No source mutation left by re-verification.

## Reviewer Assessment

**Round-Trip Count:** 1
**Verdict:** APPROVED

Re-review of the round-1 rework (`3d402850`). Every round-0 finding re-verified as resolved by targeted probe:

1. **[TEST] Act-3 drift-green (BLOCKING) — FIXED & verified.** The new `act 3 fires each transition AT its cited gate column` test ties `ACT3_SCRIPT`'s three gates to the cited constants. Independently mutation-proven this cycle: hard-coding a wrong column into the `ACT3_WORM_COL_A` gate (and, round-1, the `ACT3_PAC_COL` gate) reddens the test. The AC3 drift-green gap is closed — act 3 now matches act 2's behavioral wiring.
2. **[DOC] [RULE] `advance()` docstring — FIXED.** Rewritten act-agnostic (`ACT_SCRIPTS[s.act].length - 1`, per-act end states named); stale "sub-state 6 / 0x3d" universal phrasing gone; no longer contradicts the inline comment.
3. **[RULE] [DOC] game.ts `cutscene` + `freezeFrames` field docs — FIXED.** Both now describe the always-non-null coffee-break behavior; "Only act 1 exists today / cutscene-less rounds" removed.
4. **[RULE] game.ts handler + INTERMISSION_HOLD_FRAMES comments — FIXED.** Now describe the frame-count hold as the forced-null-only fallback.
5. **[TEST] CONSUMED-sprites test — FIXED.** Reframed as an explicit pm6-5 precondition guard, not an AC2 behavioral claim.
6. **[RULE] `cutsceneActForLevel` positional coupling — ACCEPTED (non-blocking).** Documented; a defensive guard on a stable 5-element dossier constant would be busywork.

Mechanical gates all green (pac-man 483/483, citations 54/54, purity 27/27, lint PASS, orchestrator 503/503 from round-0 preflight). ROM citations byte-verified in round 0. No new findings introduced by the rework. Ready to finish.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations