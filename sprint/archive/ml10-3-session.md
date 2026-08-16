---
story_id: "ml10-3"
jira_key: "ml10-3"
epic: "ml10"
workflow: "tdd"
---
# Story ml10-3: Thread the live mushroom state into its two dead consumers (bee MUSH spawn gate + wave-end restoring blocker)

## Story Details
- **ID:** ml10-3
- **Jira Key:** ml10-3
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T09:36:27Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T23:21:38Z | 2026-08-15T23:23:03Z | 1m 25s |
| red | 2026-08-15T23:23:03Z | 2026-08-16T00:21:12Z | 58m 9s |
| green | 2026-08-16T00:21:12Z | 2026-08-16T00:57:00Z | 35m 48s |
| review | 2026-08-16T00:57:00Z | 2026-08-16T09:30:09Z | 8h 33m |
| green | 2026-08-16T09:30:09Z | 2026-08-16T09:33:40Z | 3m 31s |
| review | 2026-08-16T09:33:40Z | 2026-08-16T09:36:27Z | 2m 47s |
| finish | 2026-08-16T09:36:27Z | - | - |

## Story Overview

Two dead branches of the same class (`dead-feature-signature-unpopulated-input-field`), both because a consumer reads a field that every producer hardcodes — while the REAL value already lives in state. Grouped per the epic file-surface rule (both touch `core/sim.ts`); land as TWO commits:

1. **BEE MUSH SPAWN GATE** — `mayStartBee` (core/bee.ts:122) gates on `mushroomsNeeded(score2) >= env.mush`; `mushroomsNeeded` ∈ [5..0x2f] always, but the view adapter hardcodes `mush:0` (core/enemies/bee.ts:67), so the gate is `>= 0` — ALWAYS true, and bees are never held back by the near-bottom mushroom tally (BE-5/6/8/9, MILLI.MAC:68-78). The live count already exists in `state.mushCounts.lower` (sim.ts maintains `mushLower`).

2. **WAVE-END RESTORING BLOCKER** — `waves.ts:55` reads `blockers.mushroomsRestoring` to hold wave-end open, but `sim.ts:290` hardcodes it `false` (TODO item 4), so a wave can end while conway mushroom-restoration is still running.

## Acceptance Criteria

1. EnemyView carries the near-bottom mushroom count sourced from `state.mushCounts.lower` (no hardcoded 0), and `mayStartBee`'s mushroom gate actually blocks a bee spawn when the tally is below `mushroomsNeeded(score2)` — proven by driving `stepGame`/`stepBees` through the real roster view, not a hand-built BeeEnv.

2. `mushroomsRestoring` is computed from the real conway mushroom-restoration state (not the literal false at `sim.ts:290`), so wave-end waits while mushrooms are still restoring, matching `waves.ts`'s blocker read — proven through `stepGame`, not a hand-built blockers object.

3. Both fixes are ROM-cited (bee gate BE-5/6/8/9, MILLI.MAC:68-78; the wave-end blocker) and land as two commits on the shared `core/sim.ts` surface; a mutation reverting either field to its hardcoded constant fails a test; no regression to bee movement/scoring, wave advance, or the mushroom-field reducers.

## Technical Approach

### Commit 1: Thread mushroomsNeeded through EnemyView

- Modify `EnemyView` interface in `core/enemies/contract.ts` to carry the near-bottom mushroom count.
- Update `sim.ts` view population to extract and pass `state.mushCounts.lower` instead of hardcoded 0.
- Verify `mayStartBee` gates correctly through the real producer path.

### Commit 2: Wire mushroomsRestoring blocker

- Compute `mushroomsRestoring` from the real conway mushroom-field state in `sim.ts`.
- Replace the hardcoded `false` at `sim.ts:290` with live state computation.
- Verify wave-end waits correctly through the real producer path.

## Delivery Findings

<!-- Dev findings below -->
### Dev (implementation)
- No upstream findings during implementation.

### Reviewer (code review)
- No upstream findings. Both issues I raised are comment-fidelity defects in this story's OWN new diff (a verified-false ROM citation and a self-contradicting "exact" overclaim) — they are rework items in the Reviewer Assessment severity table below, not pre-existing upstream Gaps/Conflicts.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (2 commits, per the story's file-surface rule):**
- Commit 1 `39f47d96` — bee MUSH spawn gate:
  - `src/core/enemies/contract.ts` — EnemyView gains `readonly mush` (MUSH[0], BE-8/9)
  - `src/core/sim.ts` — view build populates `mush: state.mushCounts.lower`
  - `src/core/enemies/bee.ts` — `beeEnv` reads `view.mush` (was hardcoded 0); `throwaway` seam comment updated to a documented note
  - 10 `enemies/*` + `beetle-quota` + `secondary-inputs` fixtures gain `mush: 0` (required-field compile fix, ml7-8 pattern)
- Commit 2 `8fc64364` — wave-end restoring blocker:
  - `src/core/sim.ts` — `stepWaveDelay` fed `mushroomsRestoring: conway.active` (was hardcoded `false`); stale wave-loop comment corrected
  - `tests/sim.test.ts` — clear-frame DELAY expectation updated 0x3F → 0x40 (corrected timing; see Design Deviations)

**Tests:** full millipede project **1333 passed | 6 skipped** (was 3 failed at RED); `npm run lint` (tsc) clean; orchestrator suite **498/498**. All 6 TEA ml10-3 tests green.

**Mutation guards hold (AC3):** reverting `beeEnv.mush` to `0` fails "a FULL lower band HOLDS the bee back"; reverting `mushroomsRestoring` to `false` fails the two wave-hold tests.

**Branch:** feat/ml10-3-thread-live-mushroom-state (pushed)

**Handoff:** To verify (TEA simplify/quality-pass) per the tdd workflow.

### Dev rework (round 1 — comment-only green rework)

Addressed both Reviewer findings; comment-only, no logic or test change.

- **[MED] sim.ts:292** — reworded the `mushroomsRestoring` blocker comment (`89755497`). It no longer claims MLSUB.MAC:54 checks CDONE; it now states :54 is `LDA MEM+1` (the RESTOR sweep pointer, MLDEF.MAC:344) and frames `conway.active` as an explicit APPROXIMATION for the unwired MEM+1/RESTOR sweep, with the caveat that the ROM's restoring window is post-conway (`restor()` gates on `cdone===0`) while this proxy holds during it. Mirrors the correct MEM+1 framing already in `waves.ts:33`.
- **[LOW] bee.ts:51** — softened "the gate is exact" to "reads the live tally instead of a hardcoded 0", noting `mushCounts.lower` still misses the deferred MUSHDC write-backs (shot.ts, conway.ts, the bee's own discarded plant), so the count is live-but-partial (`89755497`).

**Verification:** millipede project **1333 passed | 0 failed | 6 skipped**; `npm run lint` (tsc) clean. Working tree clean (source fix `89755497`, sprint bookkeeping `chore(ml10-3)` committed + pushed). No production behavior changed — the two flagged comments described code that was already correct.

**Handoff:** Back to review (Reviewer re-check of the two reworded comments).

## Design Deviations

### Dev (implementation)
- **Updated an existing wave-clear test to the corrected timing**
  - Spec source: context-story-ml10-3.md, AC-2 (and the epic's "wire the dead seam" intent)
  - Spec text: "wave-end waits while mushrooms are still restoring, matching waves.ts's blocker read"
  - Implementation: Wiring `mushroomsRestoring: conway.active` changed the clear-frame behavior — on the wave-clear frame `initConway()` starts restoration, so CHKEND now HOLDS the armed DELAY at 0x40 instead of ticking to 0x3F. The pre-existing test `sim.test.ts` "clearing the millipede arms the inter-wave DELAY" asserted `0x3F` (the pre-fix, dead-`false` behavior); its expectation was updated to `0x40` with an explaining comment.
  - Rationale: The old `0x3F` was an artifact of the hardcoded `false` blocker letting the countdown proceed mid-restoration — the exact bug this story fixes. No production code was bent to preserve the stale assertion; the test now documents the corrected hold.
  - Severity: minor
  - Forward impact: none — no sibling story depends on the clear-frame DELAY being 0x3F; the other three wave-loop tests (re-arm guard, DELAY→0 advance, beetle hold) are unaffected (they use `delay≠0`, so the clear-edge conway re-init does not fire).
- **MUSHER write-back left as a documented note (not wired)**
  - Spec source: context-story-ml10-3.md, story body ("Related seam … wire it if cheap, else leave a documented note")
  - Spec text: "musher's discarded `throwaway` delta at core/enemies/bee.ts:118 drops the per-frame plant increment — wire it if cheap, else leave a documented note"
  - Implementation: Left the `throwaway` discard in place with an expanded comment explaining why the write-back is deferred.
  - Rationale: Folding the bee's plant delta back into `state.mushCounts.lower` requires `EnemyStepResult` to carry a mush delta and sim.ts to fold it (a roster-contract change touching every creature) — not the "cheap" seam the story permits wiring. The story explicitly allows the documented-note path.
  - Severity: minor
  - Forward impact: minor — a future story wanting exact MUSH[0] maintenance from bee plants must extend the roster contract; the read-side gate (this story's scope) is complete.

### Reviewer (audit)
- **Updated an existing wave-clear test to the corrected timing (0x3F → 0x40)** → ✓ ACCEPTED by Reviewer: verified against ROM. On the clear frame `delay===0` arms `WAVE_DELAY` (0x40) AND `initConway()` seeds an active conway (sim.ts:275-277); one `masterStep` of a fresh phase-0 conway sweeps only a half-column (mask 0x0f, addr 0→16, does not reach PLYFLD_SIZE) so `conway.active` stays true, and CHKEND HOLDS the armed 0x40 (stepWaveDelay hold path, waves.ts:56). The old 0x3F was the dead-`false` blocker ticking mid-restoration — exactly the bug this story fixes. Mutation-verified: reverting `mushroomsRestoring→false` reddens this test. No production code bent. The other three wave-loop tests use `delay≠0`, so the clear-edge conway re-init does not fire — forward-impact "none" confirmed.
- **MUSHER write-back left as a documented note** → ✓ ACCEPTED by Reviewer: the story context (`sprint/context/context-story-ml10-3.md`, story body) explicitly permits "wire it if cheap, else leave a documented note." Folding the bee's plant delta requires `EnemyStepResult` to carry a mush delta (contract.ts:62-65 confirms it carries only `slots`/`playerHit`) — a roster-contract change touching every creature, not the "cheap" seam. Security subagent independently classed the resulting drift a known, non-exploitable, self-documented gap. Deferral is sound; the read-side gate (this story's scope) is complete. (See Reviewer Assessment finding #2 — the deferral is fine, but the sibling comment at bee.ts:51 must not call the resulting gate "exact.")

## Sm Assessment

Setup verified and clean. State was `NEW_WORK_STATE`; merge gate clear (no open PRs), no remote `ml10-3` branch, `develop` in sync. Branch `feat/ml10-3-thread-live-mushroom-state` cut from `develop`; session + context written.

Story is a two-branch dead-code wiring of one class (`dead-feature-signature-unpopulated-input-field`): (a) bee MUSH spawn gate reads a hardcoded `mush:0` view field while the live count lives in `state.mushCounts.lower`; (b) wave-end `mushroomsRestoring` blocker reads a hardcoded `false` at `sim.ts:290`. Both are ROM-cited and land as TWO commits on the shared `core/sim.ts` surface.

**Note for the fleet (per ml10 precedent):** each wired seam wants the `<story> wired X` note appended to `millipede.ts`'s SCOPE header in the SAME commit (ml3-6/ml10-1 pattern) or the round eats a comment-only review cycle. TEA/Architect may split only if the two fixes end up on disjoint file surfaces — but both touch `core/sim.ts`, so default is one branch, two commits.

**Critical AC discipline:** both tests MUST reach the gate/blocker through the REAL producers (`stepGame`/`stepBees`; `stepGame`/wave-end), NOT a hand-built env/blocker — a data test stays green while the branch is dead. A mutation reverting either field to its hardcoded constant must fail a test.

Routing to TEA (Han Solo) for the RED phase. Everything proceeds according to my sprint plan.

## Tea Assessment

**RED landed.** New file `plugins/millipede/tests/mush-state-wiring.test.ts` (committed `1a7e1305`). Full millipede project: **3 failed | 1330 passed | 6 skipped**; `npm run lint` (tsc) clean. The only failures are my three wired-law tests — no cross-file guard reddened.

**Both branches driven through the REAL producer `stepGame`** (the AC discipline — a hand-built `BeeEnv`/`blockers` stays green while the branch is dead), 3 controls + 3 wired-law guards:

- **(a) Bee MUSH spawn gate** — with `segments: []`, DEAD==CENTIN==0 so `mayStartBee`'s direct-spawn path is unreachable and the mushroom check alone governs. `score2 0 → mushroomsNeeded 5`. CONTROL: `mushCounts.lower 0` → gate `5 >= 0` → a bee spawns (green now). WIRED LAW (RED): `mushCounts.lower 0x30` (48 ≫ 5) → gate `5 >= 48` false → bee held back. Fails today because `beeEnv` (core/enemies/bee.ts:67) hardcodes `mush: 0`. Third test pins the spawned colour == `BEE_COLOR` (not another flier).
- **(b) Wave-end restoring blocker** — with `segments: []` and `delay` already armed (≠0), the clear-edge re-arm does NOT fire, so the provided `conway` is what `masterStep` advances and the blocker reads; a fresh (phase 0, addr 0) active conway stays active across the single step. CONTROL: idle conway → DELAY 5→4 (green). WIRED LAW (RED): active conway → DELAY holds at 5; and at DELAY 1 the wave must not advance (wave/segments unchanged). Fails today because `stepGame` (core/sim.ts:290) hardcodes `mushroomsRestoring: false`.

**Each RED test is the mutation guard AC3 demands:** reverting `beeEnv.mush` to `0` re-spawns the held bee; reverting `mushroomsRestoring` to `false` decrements the held DELAY. Both fail cleanly (assertion, not runtime error).

### Rule Coverage (lang-review ts)
- **#14 (every caller path sets the edge explicitly):** `stepWaveDelay` already hard-codes `waveReady:false` on both non-decrement paths; test (b) exercises the blocker HOLD path so a future edit can't drop the hold silently.
- **Meaningful assertions / no vacuous tests:** every test asserts a concrete value; the two "no spawn"/"hold" negatives are paired with a green control that proves the positive is reachable (not vacuously true).
- **No hand-built env:** deliberately avoided — the whole point of the story class is that a data test on a synthetic env stays green while the real producer path is dead.

### Notes for Dev (Yoda)
- **Two commits** on the shared `core/sim.ts` surface (per the story): (1) carry `mush` on `EnemyView` (contract.ts) + populate from `state.mushCounts.lower` in sim's view build + read it in `beeEnv` (drop the `mush: 0`); (2) compute `mushroomsRestoring` from the real conway state in sim.ts.
- **Related seam (a):** the discarded `throwaway` MushCounts delta at `core/enemies/bee.ts:118` — wire the bee's per-frame plant increment if cheap, else leave a documented note (story allows either).
- **ROM citations (AC3):** bee gate BE-5/6/8/9, MILLI.MAC:68-78; wave blocker MLSUB.MAC:54. Keep them in the code comments.
- **SCOPE-header caution:** this wiring is in `sim.ts`/`enemies/bee.ts`, NOT `millipede.ts`'s SCOPE header (that convention is for the stepMillipede dead-seam path — ml3-6/ml10-1). No millipede comment-line-refs guard exists (joust-only). No new-test-file count guard tripped.

Routing to Dev (Yoda) for GREEN.

---

**Branch:** feat/ml10-3-thread-live-mushroom-state
**Repository:** arcade
**Points:** 5
**Priority:** p2

---

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — GREEN: 1333 passed / 0 failed / 6 skipped, lint (tsc) clean, 0 new TODOs |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (conway termination, delay===0 short-circuit, 40-frame window calibration) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer (no try/catch, no swallowed errors in diff) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings — covered by Reviewer (both guards mutation-tested live; controls use distinct inputs so non-vacuous) |
| 5 | reviewer-comment-analyzer | Yes | findings | 2 | confirmed 2 (both verified against ROM source), dismissed 0, deferred 0 |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by Reviewer (new field `readonly mush: number`, no stringly-typing) |
| 7 | reviewer-security | Yes | clean | none | N/A — clean; independently corroborated conway termination + write-back drift as known gap |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by Reviewer (minimal change, no over-engineering; `throwaway` documented) |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 30+3 rules, 0 violations; independently mutation-tested both guards in isolated worktree |

**All received:** Yes (4 enabled returned: preflight clean, security clean, rule-checker clean, comment-analyzer 2 findings; 5 disabled via settings, covered by Reviewer)
**Total findings:** 2 confirmed (both `[DOC]`/`[COMMENT]`, Medium/Low), 0 dismissed, 0 deferred

### Processing
- **[DOC] comment-analyzer #1 — sim.ts:292-295 false ROM citation** → CONFIRMED (high). Verified MLSUB.MAC:54 directly: `LDA MEM+1 ;WAIT UNTIL MUSHROOMS RESTORED` — reads MEM+1, not CDONE. mushroom.ts:113 `restor()` acts only when `cdone === 0`, so the ROM's restoring window is POST-conway; the comment frames it as WHILE-conway (CDONE active) and pins MLSUB.MAC:54 to that. Code (`conway.active`) is story-sanctioned (RESTOR/MEM+1 unwired — no `restor()` caller in sim.ts); the COMMENT is the defect.
- **[DOC] comment-analyzer #2 — bee.ts:51 "is exact" overclaim** → CONFIRMED (high). The same diff's bee.ts:114-120 discards the bee plant delta; shot.ts:71-72 and conway.ts:27-29 defer their MUSHDC writes. The gate reads a live-but-partial count — "is exact" contradicts the same file. Severity Low.

## Reviewer Assessment (round 1 — REJECTED, superseded by the round-2 re-review below)

**Verdict:** REJECTED

Two comment-fidelity defects in this story's OWN new prose. The wiring, tests, and ROM-cited *behavior* are all sound — this is the lightest round-trip (comment-only green rework, no test or logic change). I verified both against the ROM source; neither is a matter of taste.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] `[DOC]` | Comment claims MLSUB.MAC:54 checks "CDONE active (CW-8)" while conway runs. MLSUB.MAC:54 is `LDA MEM+1` (the RESTOR sweep pointer, MLDEF.MAC:344), a DIFFERENT register; and per this repo's own `restor()` (mushroom.ts:113, acts only when `cdone===0`) the ROM's restoring window is AFTER conway finishes, not during. The comment misattributes the citation and inverts the ROM model. | `plugins/millipede/src/core/sim.ts:292-295` | Reword: state that `conway.active` is an APPROXIMATION/proxy for "still restoring" (the real MEM+1/RESTOR sweep is unwired here — story-sanctioned), and drop "CDONE active, CW-8" as a description of what MLSUB.MAC:54 checks. `waves.ts:33` already models MEM+1 correctly — mirror it. |
| [LOW] `[DOC]` | "so mayStartBee's mushroom-need gate (BE-8/9) is exact" overstates fidelity — `state.mushCounts.lower` has unwired write paths (this diff's own bee.ts:114-120 discards the bee plant; shot.ts:71-72 and conway.ts:27-29 defer MUSHDC), so the count is live-but-partial. | `plugins/millipede/src/core/enemies/bee.ts:51` | Soften "is exact" to e.g. "reads the live tally (no longer hardcoded 0; not yet ROM-exact — see the shot.ts/conway.ts MUSHDC TODOs)". |

**Everything else verified sound (blessed so the rework is surgical — touch only the two comments above):**
- `[TEST]` Both guards mutation-tested live by me AND independently by rule-checker in an isolated worktree: reverting `beeEnv.mush→0` reddens the bee-hold test; reverting `mushroomsRestoring→false` reddens both wave-hold tests + the sim.test 0x40 flip. Controls use distinct inputs (0 vs 0x30 lower; idle vs active conway) so the negatives are non-vacuous. Exact-magnitude assertions (`toBe(5/4/1/3/0x40)`), not orderings. Tests drive the REAL producer `stepGame`, not a hand-built env — the AC discipline. — evidence: mush-state-wiring.test.ts, sim.test.ts:180.
- `[EDGE]` No wave soft-lock: `masterStep` advances `addr` monotonically; when `phase===MAXPH+1` it sets `active=false` (conway.ts:263), so `conway.active` clears in bounded frames and the held DELAY always resumes. `stepWaveDelay` short-circuits at `delay===0` (waves.ts:55), so the new blocker has zero effect during normal play — it only extends the armed inter-wave pause. The 40-frame spawn window is calibrated (the control spawns within it). — evidence: conway.ts:236-265, waves.ts:55.
- `[SIMPLE]` Minimal change: one `readonly` field + two one-line wirings. The `throwaway` MushCounts discard is retained by design (documented, story-sanctioned) — not dead code to remove. No over-engineering.
- `[TYPE]` New `EnemyView.mush: readonly number` matches its sibling readonly fields (`mushTop`, `beetles`, `dead`); no stringly-typing, no unsafe cast. `tsc` clean proves all 12 construction sites populate the new required field.
- `[SEC]` Clean (subagent + Reviewer): `mush` is only a comparison RHS, never an array index; the one bounds-sensitive `musher(field, offset, …)` keeps its pre-existing `0 <= offset < PLYFLD_SIZE` guard (untouched); no clock/DOM/random introduced — core purity intact (purity.test.ts green).
- `[RULE]` rule-checker: 30 lang-review + 3 project rules, 0 violations. Notably #4 (`||` vs `??`): the new `mush` count uses direct pass-through, no default operator — 0 is handled correctly by `>=`. #14 (edge on a single path): the `conway=initConway()` reset and the `conway.active` read sit on the same straight-line stepPlay path, not divergent branches. millipede.ts untouched → SCOPE-header correctly not required.

**Data flow traced:** `state.mushCounts.lower` → (sim.ts:196) `EnemyView.mush` → (bee.ts:66) `beeEnv.mush` → (bee.ts:122) `mushroomsNeeded(score2) >= env.mush` gate → bee spawn held/allowed. Safe: read-only pass-through of a bounded non-negative integer; `0` correctly leaves the gate open (control test proves reachability).

### Rule Compliance
Rules enumerated from `.pennyfarthing/gates/lang-review/typescript.md` + CLAUDE.md/millipede conventions, checked against every changed type/function/field:
- **readonly on interface fields** — `EnemyView.mush` (contract.ts:47-50): COMPLIANT (`readonly`, matches siblings).
- **`||` vs `??` on 0-valid numeric** — `mush: state.mushCounts.lower` (sim.ts:196), `mush: view.mush` (bee.ts:66), `mushroomsNeeded(env.score2) >= env.mush` (bee.ts:122): COMPLIANT (no default operator; 0 valid and correct).
- **Edge computed on one branch / reset on a different path (#14)** — sim.ts:275-296: COMPLIANT (reset `initConway()` and read `conway.active` on the same straight-line path; snapshot ordering for the SCROLL gate at :284 is separately and correctly documented).
- **Test guards mutation-tested, no bare-keyword scans, exact-value bounds (#15/#18/#20/#29)** — mush-state-wiring.test.ts, sim.test.ts:180: COMPLIANT (mutation-verified live; real-producer; exact magnitudes).
- **New required field populated at every construction site (#A3)** — sim.ts + 11 fixtures: COMPLIANT (all 12 sites set `mush`; tsc clean).
- **core/ purity (#A1)** — bee.ts/contract.ts/sim.ts: COMPLIANT (no clock/DOM/random; purity.test.ts green).
- **millipede.ts SCOPE-header (#A2)** — N/A: millipede.ts not in the diff; convention correctly not invoked.
- **Comments assert a mechanism nobody re-ran (#17 / lying-docstring)** — sim.ts:292-295 and bee.ts:51: **VIOLATION ×2** (the two findings above). All other new comments (BE-8/9 citations, the write-back deferral note, the post-masterStep ordering) verified accurate against ROM/claims JSON.

### Devil's Advocate
Argue this code is broken. First attack: the wave never advances. If `conway.active` could stay true forever, the inter-wave DELAY would hold at its armed value and no fresh train would ever march — a hard soft-lock, the worst outcome for a wired blocker. I chased it: `masterStep` increments `addr` every call and, on each full-screen wrap, `phase`; at `phase===MAXPH+1` it forces `active=false` (conway.ts:263). Bounded. The security subagent reached the same conclusion independently. Not broken — but this is exactly why the blocker deserved the scrutiny. Second attack: a confused future dev reads sim.ts:292-295, believes MLSUB.MAC:54 gates on CDONE/conway-active, and "corrects" some sibling to match — propagating a wrong ROM model through a codebase whose entire worth is fidelity. This is not hypothetical harm; it is the precise failure the comment-analyzer exists to prevent, and it is why I am rejecting over a comment rather than waving it through as cosmetic. The comment teaches the inverse of what `restor()` (mushroom.ts:113, `cdone===0`) and `waves.ts:33` already say — an internal contradiction a reader cannot resolve without the ROM in hand. Third attack: "is exact" (bee.ts:51) invites a future story to trust the gate's count and skip wiring the deferred MUSHDC writes, entrenching a partial tally as if complete — the same overclaim class the millipede memory warns about (a totality claim that is quietly false). Fourth attack: degenerate inputs — a negative or huge `mushCounts.lower`? It is a non-optional integer maintained by sim's own fold, initialized to 0; it only ever feeds a `>=` comparison, so even a pathological value can misgate a bee spawn but cannot crash, index out of bounds, or NaN-propagate. Fifth: the 0x3F→0x40 test change could be masking a real regression. Mutation-tested both directions — the flip tracks the wired blocker exactly and the other three wave tests (delay≠0) are untouched. Conclusion: no code-correctness break; two comment falsehoods in the diff's own prose that, in this codebase, are worth the lightest round-trip to fix.

**Handoff:** Back to Dev (Yoda) for a comment-only green rework — reword the two comments above; no test or logic change.

---

## Subagent Results (round 2 — comment-only re-review)

The rework (`89755497`) touched ONLY the two comments the comment-analyzer flagged; the substantive code (contract.ts field, sim.ts wiring, bee.ts gate read, all tests) is byte-identical to round 1, where preflight, security, and rule-checker all returned clean. Re-running the full specialist fan-out on a two-comment reword is disproportionate; per the reviewer's own discipline I re-verified the NEW comment prose myself against the ROM/sibling source (the exact "re-verify the replacement, don't just confirm the old phrase is gone" catch).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (r2, via testing-runner) | clean | none | GREEN: 1333 passed / 0 failed / 6 skipped, tsc clean |
| 2 | reviewer-edge-hunter | N/A | Skipped | disabled | No logic change since r1; covered by Reviewer |
| 3 | reviewer-silent-failure-hunter | N/A | Skipped | disabled | No logic change since r1 |
| 4 | reviewer-test-analyzer | N/A | Skipped | disabled | No test change since r1 |
| 5 | reviewer-comment-analyzer | Yes (r1) | findings | 2 → both CLOSED | Reviewer re-verified both reworded comments against source — closed |
| 6 | reviewer-type-design | N/A | Skipped | disabled | No type change since r1 |
| 7 | reviewer-security | Yes (r1) | clean | none | Code unchanged since clean r1 pass |
| 8 | reviewer-simplifier | N/A | Skipped | disabled | No structural change since r1 |
| 9 | reviewer-rule-checker | Yes (r1) | clean | none | Code unchanged since clean r1 pass |

**All received:** Yes (r1 fan-out clean on the substantive code, unchanged in r2; comment-analyzer's 2 findings verified closed by Reviewer; r2 preflight re-run GREEN)
**Total findings:** 0 open (2 from round 1, both closed)

## Reviewer Assessment

**Verdict:** APPROVED

Round-2 re-review of the comment-only green rework. Both round-1 findings are genuinely closed, and — per the "re-verify the replacement prose, don't just check the old phrase is gone" discipline — I read both reworded comments in full and verified every factual claim against the ROM and sibling source. No fresh false claim was introduced.

**Findings closed (re-verified against source):**
- `[DOC]` **Finding #1 — sim.ts:292 CLOSED.** The reworded comment now correctly states MLSUB.MAC:54 is `LDA MEM+1` (verified in the ROM) and that MEM is "PLAYFIELD ADDRESS POINTER FOR RESTORING MUSHROOMS" (verified MLDEF.MAC:344). It frames `conway.active` as an explicit APPROXIMATION for the unwired MEM+1/RESTOR sweep (verified: `restor()` in mushroom.ts has no caller anywhere in src), and correctly states the window difference — RESTOR runs only once CDONE is idle (verified mushroom.ts:113 `if (gate.cdone !== 0) return false`). The "post-masterStep" ordering claim holds (masterStep sim.ts:289 precedes the chkend read sim.ts:291). Every claim accurate.
- `[DOC]` **Finding #2 — bee.ts:51 CLOSED.** "is exact" is softened to "reads the live tally instead of a hardcoded 0", and the three deferred write paths it cites all check out: shot.ts:71-72 (`MUSHDC ... deferred — TODO(ml7-2)`), conway.ts:31-33 (`MUSH count seam (MUSHE1/MUSHDC, CW-61/63) deferred to the ml3-3 reducers`, and conway.ts never touches MushCounts), and the bee's own `throwaway` plant (bee.ts:112-122). Accurate.

**Everything else stands from round 1 (code byte-identical):**
- `[TEST]` Suite GREEN — 1333 passed / 0 failed / 6 skipped (r2 re-run via testing-runner); both mutation guards still hold (unchanged tests). `[EDGE]` conway termination + `delay===0` short-circuit unchanged. `[SIMPLE]` no structural change — two comments only. `[TYPE]` `EnemyView.mush: readonly number` unchanged, tsc clean. `[SEC]` code unchanged since the clean security pass; no clock/DOM/random introduced. `[RULE]` rule-checker's 30+3 clean result stands (no rule-governed code changed); the two `#17 lying-docstring` violations it would have flagged are now fixed. `[SILENT]` no error-handling code touched.

**Data flow (unchanged):** `state.mushCounts.lower` → `EnemyView.mush` (sim.ts:196) → `beeEnv.mush` (bee.ts:66) → `mushroomsNeeded(score2) >= env.mush` gate. Safe.

### Devil's Advocate (round 2)
Argue the rework is broken. Attack one: a rework told to "fix a lying comment" often ships a fresh lie in the replacement (the documented cp7-6 failure mode). So I did not diff for "is the old phrase gone" — I read both new comments whole and checked each cross-reference against the file it names. sim.ts's new comment makes five checkable ROM claims (MLSUB.MAC:54 opcode, MLDEF.MAC:344 register role, restor() has no caller, restor() gates cdone===0, masterStep-before-chkend ordering); I verified all five in the source this turn, not from memory. bee.ts's new comment names three deferral sites; all three carry the deferral in their own text. Attack two: did the reword quietly change behavior? No — the diff is comment-lines only (verified: the `mushroomsRestoring: conway.active` and `mush: view.mush` code lines are untouched), and the suite is green. Attack three: is "approximation" now UNDERclaiming — could a reader think the blocker is broken? The caveat is precise about which direction it differs (holds DURING conway vs the ROM's after), names the story directive that sanctions it, and points at waves.ts:33 as the correct MEM+1 model — a reader is left with the true picture, not a vaguer one. No new defect. The rework is surgical and correct; approve.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.