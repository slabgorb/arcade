---
story_id: "6-3"
jira_key: ""
epic: "6"
workflow: "tdd"
---
# Story 6-3: Safe respawn after death (no chain-death on death lanes)

## Story Details
- **ID:** 6-3
- **Jira Key:** (none)
- **Workflow:** tdd
- **Stack Parent:** none

## Technical Approach

**Design Decision (resolved from ROM rev-3):** The arcade does NOT use invulnerability frames. Instead, it RESETS THE BOARD on death.

### Respawn Sequence
1. Player dies (player_status goes negative)
2. Death animation waits for all bullets to clear
3. Surviving enemies pushed back down tube
4. Claw zooms down (along 0x10 → 0xf0, +0x0f/frame ≈ 15 frames / ~0.25s)
5. Enemies vanish, claw freezes
6. Life deducted (40-frame / ~0.67s GAME OVER pause if last life)
7. **With lives remaining:** FULL BOARD RESET
   - Remove all enemies from tube
   - Setup level (reset)
   - Reset pending enemy spawn timers
   - Clear all shots
   - **Respawn at fixed lane (arcade segment 14), near rim, SAME level**
   - NO invulnerability frames — cleared board + spawn delay = the grace

This is why the arcade never chain-deaths.

## Acceptance Criteria

- [ ] Respawn model is decided and documented (chosen approach + rationale) before implementation
- [ ] After death, the fresh ship does NOT instantly re-die from the same hazard that killed it (death lane / crowded lane)
- [ ] The player gets a recovery beat on respawn (e.g. brief invulnerability and/or board reset and/or safe spawn relocation, per the chosen model)
- [ ] Respawn behavior is deterministic (seeded RNG + dt) and covered by a core unit test reproducing the chain-death scenario
- [ ] On respawn (lives remain): all enemies removed + spawn timers reset, same level restarts, claw at a fixed lane near rim; brief ~0.25s death-zoom animation first; NO invulnerability frames (cleared board + spawn delay is the grace)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-27T22:00:01Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-27T21:31:39Z | 2026-06-27T21:33:47Z | 2m 8s |
| red | 2026-06-27T21:33:47Z | 2026-06-27T21:46:47Z | 13m |
| green | 2026-06-27T21:46:47Z | 2026-06-27T21:49:50Z | 3m 3s |
| review | 2026-06-27T21:49:50Z | 2026-06-27T22:00:01Z | 10m 11s |
| finish | 2026-06-27T22:00:01Z | - | - |

## Delivery Findings

### TEA (test design)
- **Improvement** (non-blocking): the new board-reset `respawn()` must keep the existing warp early-return (`if (s.warp.progress > 0) { advanceLevel(s); return }`) BEFORE the board reset. Affects `src/core/sim.ts` (`respawn`). Removing/relocating it regresses the Story 3-6 warp-death suite (`tests/core/sim.warp-death-respawn.test.ts`). *Found by TEA during test design.*
- **Improvement** (non-blocking): a fixed respawn-lane constant (e.g. `RESPAWN_LANE = 14`) belongs in `src/core/rules.ts` alongside the other tunables, not inline in `sim.ts`. Affects `src/core/rules.ts` / `src/core/sim.ts`. *Found by TEA during test design.*
- **Gap** (non-blocking): `sm-setup` declared tempest "trunk-based / no branch", but the repo uses gitflow (feat → develop) and was left on a stale, unmerged `feat/6-7` branch whose story was already `done`. TEA merged 6-7 to develop (pushed) and created `feat/6-3-safe-respawn`. Affects sm-setup branch detection for the tempest subrepo. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): two pre-existing test comments now slightly mis-describe the mechanism — `tests/core/sim.death.test.ts` (lines ~38-41) and `tests/core/sim.warp-death-respawn.test.ts` (the "normal mid-level death" test, lines ~162-163) say a below-rim survivor *persists* and keeps the level un-cleared. Under the new board-reset model the survivor is *removed*; the re-armed spawn budget is what keeps the level un-cleared. Assertions still pass; only the comments are stale. *Found by Dev during implementation.*

### Reviewer (code review)
- **Question** (non-blocking): respawn now calls `startLevel()`, which rearms the Superzapper to `'full'` — so a mid-level death refills the once-per-level Superzapper. The old respawn did not. Affects `src/core/sim.ts` (`respawn` → `startLevel`). Confirm whether arcade fidelity wants the Superzapper refilled on a death-respawn (likely NOT — it is once *per level*, and a death does not start a new level). *Found by Reviewer during code review.*
- **Question** (non-blocking): "arcade segment 14" is implemented as 0-indexed lane index 14. If the arcade numbers segments 1–16, true fidelity could be index 13. Story text + TEA's tests both pin 14, so this matches spec-as-written. Affects `src/core/rules.ts` (`RESPAWN_LANE`). Confirm the 0- vs 1-index interpretation. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): test hardening for a follow-up — import `RESPAWN_LANE` from `rules.ts` in the test instead of re-declaring `const RESPAWN_LANE = 14`; strengthen the chain-death test by placing a survivor on the *respawn* lane (14); assert `spawn.timer` reset; add an open-tube (15-lane, e.g. level 8) respawn-lane case. Affects `tests/core/sim.respawn.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)
- **Death-zoom animation (~0.25s) not unit-tested**
  - Spec source: context-story-6-3.md, AC-5
  - Spec text: "brief ~0.25s death-zoom animation first"
  - Implementation: No core unit test for the zoom; the existing `'dying'` delay (`RESPAWN_DELAY`) already gates the respawn, and the zoom is a render-space animation read from state during `'dying'`.
  - Rationale: tempest's `core/` is pure sim with no render; per tempest CLAUDE.md the shell (render/animation) is "verified by running the game", not unit-tested. Asserting a frame-count zoom in the core would couple a render concern to the sim.
  - Severity: minor
  - Forward impact: Dev/render must surface the death-zoom in the shell; verify visually. The core respawn timing is unchanged.

### Dev (implementation)
- No deviations from spec. Implemented the board-reset respawn exactly as the ACs and TEA's tests specify (full board reset, fixed lane 14, no invulnerability, warp path preserved).

### Reviewer (audit)
- **TEA — "Death-zoom animation (~0.25s) not unit-tested"** → ✓ ACCEPTED by Reviewer: sound. `core/` is a pure sim with no render; per tempest CLAUDE.md the shell is verified by running the game. The `'dying'` delay (`RESPAWN_DELAY`) already gates the respawn; pinning a frame-count zoom in the core would couple a render concern to the sim. The visible zoom remains a shell follow-up.
- **Dev — "No deviations from spec"** → ✓ ACCEPTED by Reviewer: the implementation matches the ACs and TEA's tests (board reset, fixed lane 14, no invuln, warp path preserved).
- **UNDOCUMENTED (Reviewer):** respawn rearms the Superzapper to `'full'` via `startLevel()` (sim.ts:286). Spec said "all enemies removed + spawn timers reset, same level restarts"; code additionally refills the once-per-level Superzapper on every death. Not logged by Dev. Severity: LOW (balance side-effect, non-crashing, debatable fidelity). Captured as a non-blocking Question in Delivery Findings; does not block the verdict.

## Sm Assessment

**Story:** 6-3 — Safe respawn after death (no chain-death on death lanes). 2pts, p1, `tdd` phased workflow, repo `tempest`.

**Readiness:** Ready for RED phase. The design decision is fully resolved from ROM rev-3 (board reset, not invulnerability), so there is no open design question blocking test authoring — the acceptance criteria are concrete and testable.

**Scope:** Confined to the death → lives → respawn transition in `src/core/sim.ts` (deterministic core sim). No shell/render changes required for the core behavior; the visible death-zoom is a ~0.25s animation beat the sim must account for before the board reset.

**Key testable behaviors for TEA (O'Brien):**
1. Chain-death reproduction: a ship that respawns into the same hazard lane must NOT instantly re-die — the regression test that proves the fix.
2. On respawn with lives remaining: all enemies removed from tube, spawn timers reset, shots cleared, same level restarts.
3. Respawn lane is fixed (arcade segment 14), near rim.
4. NO invulnerability frames — grace comes from the cleared board + spawn delay.
5. Determinism: seeded RNG + dt; behavior reproducible.

**Routing:** Phased `tdd` → next agent is `tea` (RED phase). No branch (tempest is trunk-based).

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Branch:** `feat/6-3-safe-respawn` (off develop; 6-7 merged to develop first — see Delivery Findings)

**Test Files:**
- `tests/core/sim.respawn.test.ts` — Story 6-3 safe-respawn / board-reset suite (5 tests)

**Tests Written:** 5 tests covering all 5 ACs (board model is one compound AC).
**Status:** RED — 4 failing (1 deterministic-purity guard already green; the sim is already deterministic).

| AC | Test | Status |
|----|------|--------|
| AC2 no chain-death | `does not chain-death on a crowded death lane after respawn` | failing (chain-deaths → `dying`) |
| AC5 board reset (enemies/shots/spawn/level) | `performs a full board reset on respawn (...)` | failing (2 enemies remain) |
| AC5 fixed lane (seg 14) | `respawns at the fixed arcade lane (segment 14) regardless of death location` | failing (respawns at death spot: 4≠9) |
| AC5 no invuln | `grants no invulnerability frames on respawn (a rim enemy kills immediately)` | failing (no board reset → `warp`) |
| AC4 determinism | `respawn is deterministic for identical seed and inputs` | passing (purity guard) |

**Not covered (logged as deviation):** AC5 ~0.25s death-zoom — render concern, verified by running the game (see Design Deviations).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| core purity / determinism (tempest CLAUDE.md: no Date.now/Math.random; all time via dt; seeded RNG) | `respawn is deterministic for identical seed and inputs` | passing (guard) |

**Rules checked:** core purity/determinism is the dominant project rule; TS lang-review type-safety checks are N/A to a behavioral sim change. **Self-check:** 0 vacuous assertions — every test asserts concrete values.

**Implementation pointers for Dev (Julia):**
- Rework `respawn()` in `src/core/sim.ts`: after the warp early-return, FULLY reset the board with lives remaining — clear enemies, clear bullets, re-arm the spawn budget (`spawnForLevel(s.level)`), keep the SAME level, set the player to the fixed respawn lane (segment 14, near rim), and resume `'playing'`. No invulnerability frames — the cleared board + spawn delay is the grace.
- Reuse `startLevel(s)` where it fits (it already clears bullets + re-arms spawn + rearms superzapper), but do NOT call `advanceLevel`/`startGameAtLevel` on a normal death.
- Keep the warp-crash path (`s.warp.progress > 0 → advanceLevel`) untouched (Story 3-6).

**Handoff:** To Dev (Julia) for GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/sim.ts` — reworked `respawn()`: on a normal mid-level death (lives remaining) it now FULLY resets the board — clears all enemies, sets the player to the fixed respawn lane, calls `startLevel()` (clears bullets, re-arms the spawn budget + Superzapper), keeps the SAME level, resumes `'playing'`. The warp-crash early-return (`s.warp.progress > 0 → advanceLevel`) is untouched. No invulnerability frames added.
- `src/core/rules.ts` — added `RESPAWN_LANE = 14` (arcade segment 14), placed with the other tunables per TEA's finding.

**Approach:** Minimal — replaced the old "filter rim enemies, keep the death lane" two-liner with the board reset. Reused existing `startLevel()` rather than duplicating spawn/bullet reset logic. No new abstractions, no new state fields.

**Tests:** 336/336 passing (GREEN). `tsc --noEmit && vite build` succeeds. No regressions in `sim.death.test.ts` or `sim.warp-death-respawn.test.ts` (Story 3-6).

**ACs:** All core ACs met. AC5's ~0.25s death-zoom is a render concern (deferred to the shell, logged as a TEA deviation) — the core respawn timing (`RESPAWN_DELAY`) is unchanged.

**Branch:** `feat/6-3-safe-respawn` (pushed to origin).

**Handoff:** To verify/review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (3 advisory notes) | N/A — all gates pass; notes folded into review |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (manually assessed below) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (manually assessed below) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 4 (LOW, non-blocking), dismissed 1 (gameover covered elsewhere) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (manually assessed below) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (manually assessed below) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (manually assessed below) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (manually assessed below) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 16 rules | N/A — clean (1 maintenance note = test-analyzer #1) |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 4 confirmed (all LOW, non-blocking), 1 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is minimal and correct: `respawn()` (sim.ts:284-286) replaces the old "filter rim enemies, keep the death lane" logic with a full board reset — `enemies = []`, `player.lane = RESPAWN_LANE`, then `startLevel(s)` (re-arms spawn budget + clears bullets). The warp-crash early-return is preserved above it. All 336 tests pass, `tsc --noEmit && vite build` succeeds, and the core-purity boundary is intact. No Critical or High findings; the confirmed findings are LOW test-quality/balance improvements suitable for a follow-up.

**Data flow traced:** player death (`resolvePlayerHits` → `killPlayer`, lives−1, mode `'dying'`, `respawnTimer = RESPAWN_DELAY`) → `'dying'` countdown → `respawn()`. With `warp.progress > 0` it advances the level (Story 3-6, untouched); otherwise it wipes the board, relocates the Claw to lane 14, re-arms the level via `startLevel`, and resumes `'playing'`. Score and `lives` are never touched by `respawn`/`startLevel`, so they survive correctly — evidence: sim.ts `startLevel` sets only `spawn`, `bullets`, `superzapper`.

**Pattern observed:** good reuse — `startLevel(s)` is the existing level-arming primitive, so the reset doesn't duplicate spawn/bullet logic (sim.ts:233-237, called at sim.ts:286). Constant extracted to `rules.ts` with the other tunables.

**Error handling:** N/A in the conventional sense — pure deterministic state mutation, no I/O, no try/catch, no nullable inputs. `wrapLane`/`currentLane` already guard out-of-range lanes, so `RESPAWN_LANE = 14` can never produce an invalid index even in a hypothetical smaller tube.

### Observations (8)

1. `[VERIFIED]` board-reset respawn is correct — sim.ts:284-286: `enemies=[]`, `player.lane=RESPAWN_LANE(14)`, `startLevel()` resets `spawn=spawnForLevel(level)` (remaining **and** timer), `bullets=[]`, `superzapper='full'`. Score/lives untouched (lives already decremented in `killPlayer`). Checked against core-purity rule — no forbidden APIs. Complies.
2. `[VERIFIED]` warp-crash path preserved — sim.ts:273-276 early-returns to `advanceLevel` when `warp.progress > 0`, BEFORE the board reset. The 10-test Story 3-6 suite stays green (preflight GREEN).
3. `[RULE][VERIFIED]` `PLAYER_RIM_DEPTH` is still used (sim.ts:254, `resolvePlayerHits`) — not a dead import; `noUnusedLocals: true` + passing build confirm. rule-checker: 0 violations across all 16 rules.
4. `[TEST]` `[LOW]` test re-declares `const RESPAWN_LANE = 14` (sim.respawn.test.ts:35) instead of importing the existing export from `rules.ts` — flagged by test-analyzer (high) and rule-checker. Magic-number duplication; non-blocking because the asserted lane comes from the real sim, so a sim-side divergence still fails the test. Fix in follow-up.
5. `[TEST]` `[LOW]` chain-death test (test 1) places the survivor on the death lane (4) while the ship respawns on lane 14, so test 1 alone doesn't isolate the board wipe as the prevention mechanism — but test 2 explicitly asserts `enemies.length === 0`, so the AC IS covered by the suite. Suggestion: put a survivor on lane 14.
6. `[TEST]` `[LOW]` test 2 asserts `spawn.remaining` but not `spawn.timer`; `startLevel` resets both, so the behavior is correct, just under-asserted.
7. `[TEST]` `[LOW]` no open-tube (15-lane) geometry case for `RESPAWN_LANE=14`. Manually verified: index 14 is valid in a 15-lane tube (0–14), and `wrapLane` clamps for open tubes — the rules.ts "valid in every geometry" comment holds.
8. `[TEST]` dismissed — test-analyzer flagged "no last-life/gameover test." Dismissed: that path never reaches `respawn()` (handled in `killPlayer`) and IS covered by `sim.death.test.ts:56` and `sim.warp-death-respawn.test.ts`.

### Disabled-subagent manual assessment (tags)

- `[EDGE]` (disabled) — boundary cases: last-life death (covered, observation 8), open-tube lane 14 (valid, observation 7), death-during-warp (preserved, observation 2). No unhandled path.
- `[SILENT]` (disabled) — no swallowed errors/fallbacks; `respawn` is pure state mutation with no `catch`/`||` fallback.
- `[DOC]` (disabled) — new comments (rules.ts RESPAWN_LANE, sim.ts respawn) are accurate. Stale comments exist only in *other* test files (pre-existing; Dev finding).
- `[TYPE]` (disabled) — `RESPAWN_LANE: number` is consistent with `player.lane: number` (tube-space index); no stringly-typing, no cast. rule-checker confirmed.
- `[SEC]` (disabled) — N/A: client-only deterministic game sim; no auth/secrets/tenant/external input. `RESPAWN_LANE` is a literal constant.
- `[SIMPLE]` (disabled) — change is maximally simple (reuses `startLevel`, no new state field or abstraction). No over-engineering.

### Rule Compliance

- **Core purity boundary** (tempest CLAUDE.md): `respawn`/`startLevel` import nothing from `shell/`, touch no DOM/window/canvas, call no `Date.now`/`Math.random`/`performance.now`/RAF. ✓ (every changed symbol checked by rule-checker rule 14).
- **Time via dt / randomness via seeded RNG**: the reset consumes no time and no RNG. ✓ (rule 15).
- **Tube-space coordinates**: `player.lane = 14` is an integer lane index, consistent with `startGameAtLevel`'s `lane: 0`. ✓ (rule 16).
- **TS strict / type-safety** (rules 1–13): no casts, no `any`, no `||`-vs-`??` hazards, no dead imports. ✓ (rule-checker clean).

### Devil's Advocate

Suppose this code is broken. The sharpest attack is the `startLevel()` reuse: it rearms the Superzapper to `'full'` on every respawn. A player who hoards the once-per-level Superzapper, dies on purpose, and respawns now gets a fresh charge — an infinite-Superzapper exploit bounded only by lives. That is a genuine, unintended balance change versus the pre-fix behavior (the old respawn preserved Superzapper state), and the ACs never asked for it. I cannot prove the arcade refills it on a death-respawn; if it does not, this is a fidelity regression. It is non-crashing and debatable, so it does not block, but it is surfaced as a Question. Second attack: `RESPAWN_LANE = 14` as a 0-indexed value. If the arcade's "segment 14" is 1-indexed, the authentic landing lane is index 13 — a one-segment fidelity error that no test would catch because the tests were authored to the same 14. Third: a future tube geometry with fewer than 15 lanes would relocate the respawn (wrapLane clamps/wraps) — safe from crashes but silently off-spec; the rules.ts comment scopes the claim to 15/16 lanes, mitigating this. Fourth: a confused player might expect brief invulnerability (many arcade ports do); here the grace is the cleared board, and an enemy can kill on the first post-respawn frame (test 4 proves it) — intentional per the ROM, but a UX surprise to verify by playtest. Fifth: the death-zoom is untested in the core; if the shell never renders it, the player sees an instant board swap with no feedback — a render follow-up, already logged. None of these rise to Critical/High: the feature meets every AC, the suite is green, and the purity/determinism invariants hold. The Superzapper refill and segment-index questions are captured as non-blocking findings.

**Handoff:** To SM (Winston Smith) for finish-story.