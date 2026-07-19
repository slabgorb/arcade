---
story_id: "tp2-2"
jira_key: "tp2-2"
epic: "tp2"
workflow: "trivial"
---
# Story tp2-2: The level-select prompt says 'PRESS FIRE TO SELECT' but the sim advances on Enter (input.start), not fire

## Story Details
- **ID:** tp2-2
- **Jira Key:** tp2-2
- **Workflow:** trivial
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** trivial
**Phase:** finish
**Phase Started:** 2026-07-19T08:56:42Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-19T08:14:20+00:00 | 2026-07-19T08:16:25Z | 2m 5s |
| implement | 2026-07-19T08:16:25Z | 2026-07-19T08:22:52Z | 6m 27s |
| review | 2026-07-19T08:22:52Z | 2026-07-19T08:32:15Z | 9m 23s |
| implement | 2026-07-19T08:32:15Z | 2026-07-19T08:41:50Z | 9m 35s |
| review | 2026-07-19T08:41:50Z | 2026-07-19T08:56:42Z | 14m 52s |
| finish | 2026-07-19T08:56:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Improvement (non-blocking, fixed in-story):** `src/core/input.ts` documented `fire` as
  edge-triggered ("true only on the step the trigger goes down") while the shell deliberately
  asserts it every step a button is held (autofire) — the exact lie behind this bug class.
  Comment corrected in this story's commit.
- **Gap (non-blocking, resolved):** the 4-2 framing suite pinned "fire/zap are inert in
  select", directly contradicting this story's AC. Amended to zap-only with a pointer to the
  new tp2-2 edge-semantics suite. Also discovered: a mouse click queues start+fire TOGETHER
  (`shell/input.ts` mousedown), so without the `fireHeld` latch the click entering select
  would instantly launch level 1 — this shaped the implementation.

### Reviewer (code review)

- No upstream findings during code review — all findings are in-story rework items
  (see Reviewer Assessment). The one pre-existing latent issue found (the `withSelect`
  test helper constructing a `SelectState` without the new required field via cast)
  evaporates entirely once the rework drops `SelectState.fireHeld`.
  *Found by Reviewer during code review.*

### Dev (implementation, rework)

- No new upstream findings. The round-1 review's design finding — the duplicate
  edge-latch — is resolved in-story: confirm now reads the shared
  `GameState.prevFire`, `SelectState.fireHeld` and its seeding are deleted, and
  the `input.ts` comment points at the canonical latch. The two `[TEST]` gaps the
  Reviewer named are pinned (spin-while-fire-held; no-bullet-on-confirm on both
  fire-confirm tests), and LOW item (d) — the `withSelect` cast omitting the
  latch field — resolves automatically now that the field no longer exists.
  *Found by Dev during rework.*

### Reviewer (code review, round 2)

- **Improvement** (non-blocking): the spin-while-held test confirms via a fresh fire press
  but omits the `expect(out.bullets).toHaveLength(0)` pin its two sibling confirm tests
  carry. A bullet-spawn regression is already caught by those siblings on the identical
  line, so this is consistency, not a coverage hole. Affects
  `tempest/tests/core/tp2-2.select-fire.test.ts` (optional one-line add on a future touch).
  *Found by Reviewer during code review.*
- **Gap** (non-blocking): no test pins that the select fire-path leaves `state.rng`
  untouched / does not mutate the caller's state (the sibling determinism pin covers only
  attract+start). Verified by inspection that the branch makes no RNG calls and stepGame
  clones state first — not a live risk. Affects `tempest/src/core/sim.ts` (could extend the
  determinism test on a future touch). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): PR #147's description still describes the pre-rework
  `SelectState.fireHeld` approach and cites 1709 tests; the shipped code uses `prevFire`
  (1710). Affects the PR #147 body (SM to refresh at finish so the merge record is
  accurate). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)

- No deviations from spec. The rework swaps the round-1 `SelectState.fireHeld`
  latch for the canonical `GameState.prevFire` (6-2) exactly as the Reviewer's
  rework item required — behaviour-preserving (full suite 1710 green; the swap
  is frame-equivalent for every reachable entry/held/release path, and the only
  runtime entry into `select` is the attract arm, where `prevFire` is set from
  the entering frame's fire at frame-end). Net-negative source diff; `state.ts`
  fully reverted to develop.

### Reviewer (audit)

- No design deviations were logged by Dev. Audit of the diff against the story context
  confirms scope was honoured: behaviour fixed, prompt string untouched (zero shell files
  in the diff), Enter path preserved. The amendment of the 4-2 framing pin ("fire/zap
  inert" → "zap inert") is AC-sanctioned by the story context (the AC explicitly requires
  "no lingering fire-does-nothing mismatch") and is already disclosed in Dev's Delivery
  Findings → ✓ ACCEPTED by Reviewer: required by the story's own acceptance criteria.

- **(Round 2)** Dev (implementation): "No deviations from spec — the rework swaps the
  round-1 `SelectState.fireHeld` latch for the canonical `GameState.prevFire` (6-2)."
  → ✓ ACCEPTED by Reviewer: the rework is a behaviour-preserving alignment with the
  established fire-edge pattern (independently verified equivalent — code-path trace +
  old-impl-runs-new-tests + 1710/1710 green), not a spec deviation. Nothing to flag.

## Sm Assessment

**Scope decision (from the user, explicit):** Fix the BEHAVIOUR, not the message. The
context file's AC offers an either/or (fix sim vs. fix prompt string) — that decision is
already made: option (a). Make `input.fire` confirm the level select in the `select` case
of `tempest/src/core/sim.ts` so Fire (Space) starts the selected level, matching the
ROM-authentic "PRESS FIRE TO SELECT" prompt. The prompt string in `drawSelect`
(`tempest/src/shell/render.ts`) must NOT change. Whether Enter (`input.start`) also
continues to confirm is Dev's call; the acceptance criterion is that FIRE works. Guard
against double-triggering on the same press that entered the select screen, and keep the
existing test suite green with a test pinning the new fire-confirms behaviour.

Branch: `fix/tp2-2-select-fire-input` (off develop, checked out in tempest/).
No Jira for this repo — jira_key is the story id. Merge gate was clear at setup
(no open tempest PRs). Handoff to Dev for the implement phase.

## Subagent Results

(Round 2 — re-review of the rework. Round-1 table/verdict superseded; the round-1
REJECTED verdict and its three MEDIUM rework items are preserved in git history and in
the Phase History round-trip above.)

| # | Subagent | Received | Status | Findings | Decisions |
|---|----------|----------|--------|----------|-----------|
| 1 | reviewer-preflight | Yes | clean | none (+1 note) | 148 files / 1710 tests green, tsc clean, citations 79/79 green, tree clean, no smells; noted stale PR #147 body (LOW doc, non-blocking) |
| 2 | reviewer-edge-hunter | Skipped / disabled | — | — | disabled via workflow.reviewer_subagents |
| 3 | reviewer-silent-failure-hunter | Skipped / disabled | — | — | disabled via workflow.reviewer_subagents |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (both LOW) | both round-1 [TEST] rework items mutation-verified NON-VACUOUS (spin-while-held caught by 3 mutants; bullets-on-confirm caught by a bullet-injection mutant); refactor equivalence independently verified (old fireHeld impl runs the new tests 22/22 unchanged); 2 LOW completeness nits recorded non-blocking |
| 5 | reviewer-comment-analyzer | Skipped / disabled | — | — | disabled via workflow.reviewer_subagents |
| 6 | reviewer-type-design | Skipped / disabled | — | — | disabled (type surface covered by rule-checker checks #1–#5) |
| 7 | reviewer-security | Yes | clean | none | 5 rules / 0 violations — core purity, spin NaN/∞ guard intact + reachable via the else-if, no RNG on the browse path, input.fire boolean-only |
| 8 | reviewer-simplifier | Skipped / disabled | — | — | disabled (rework is net-negative; no complexity added) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (18 rules / 34 instances) | fix-introduced-regression check (#13, primary for a rework) clean; core purity, switch exhaustiveness, and audit-citation freeze all confirmed |

All received: Yes (4 of 4 enabled subagents returned; 5 disabled rows pre-filled).

### Rule Compliance

Rules from tempest/CLAUDE.md + the TypeScript lang-review checklist, enumerated against
every changed item in the round-2 diff (input.ts comment-only, sim.ts select case, two
test files; state.ts byte-identical to develop). Full instance-level enumeration in the
rule-checker report (18 rules / 34 instances / 0 violations):

- **core/ purity (no shell imports, no DOM, no Date/Math.random/rAF):** COMPLIANT for all
  changed core files — input.ts is comment-only with no imports; sim.ts's select case adds
  only boolean/state-field reads (grepped whole file for forbidden globals — none);
  state.ts unchanged vs develop.
- **stepGame determinism / no RNG on the browse path:** COMPLIANT — the confirm condition is
  a pure boolean of (input, prevFire); the only RNG draw (spawnForLevel via
  startGameAtLevel → startLevel, sim.ts:686/578) fires only on commit, pre-existing and
  identical whether triggered by `start` or the new fire-confirm — not a new draw.
- **Switch exhaustiveness (`default: assertNever`)**: COMPLIANT — sim.ts:1200-1201 present
  and unchanged; the select case body was edited but no case arm added/removed; tsc clean.
- **Audit citation freeze (docs/audit/findings @ 4232ed4):** COMPLIANT — diff touches no
  findings JSON; a full JSON walk found no finding's `ours` citing the changed sim.ts select
  range or the stepHighScore prevFire line; the sole PRESS-FIRE-TO-SELECT finding
  (pair-2-alvrom-shapes-font.json) cites the untouched render.ts. Citations suite green.
- **TDD on the pure core:** COMPLIANT — the round-1 RED history stands; test-analyzer
  independently mutation-tested the confirm condition (3 mutants, all caught) and the
  bullets pin (bullet-injection mutant, caught).
- **TypeScript lang-review checklist (13 checks):** PASS — zero violations; the fix-regression
  meta-check (#13) confirms the rework added no `as any`, no `||`-for-`??`, no lost
  constraint, and no dead code; `Partial<Input>` in the test helper is the idiomatic
  override pattern over a fully-populated NEUTRAL base, not a lost-constraint misuse.

### Devil's Advocate

Assume this rework is broken; where would the bodies be? First, the load-bearing claim:
that reading the GLOBAL `GameState.prevFire` is equivalent to the old select-local
`fireHeld`. Could they ever diverge at a select-branch evaluation? I chased it. `'select'`
is entered from exactly ONE call site — the attract arm on `input.start` (sim.ts:1133) —
and the select branch never runs on the entering frame (the switch already dispatched to
attract that frame). On the FIRST select frame, `prevFire` equals the entering frame's
fire because sim.ts:1204 writes `s.prevFire = input.fire` unconditionally at every frame's
tail — which is precisely what the old code seeded `fireHeld` to. On every subsequent
select frame, both track the immediately prior frame's fire (and if a prior frame had
confirmed, we'd have left select, so there is no later select frame to mistime). No
reachable divergence — and this is not just my trace: the test-analyzer checked out the
old `fireHeld` implementation and ran the CURRENT tests against it, 22/22 unchanged,
proving the suite pins behaviour, not the latch's name. Second, could the confirming fire
also fire a shot on the transition frame? No — the branch calls `startGameAtLevel`, whose
`startLevel` zeroes `s.bullets`, then `break`s before any `stepFiring`; the injected
bullet-spawn mutant reddens both pinned tests. Third, hostile input: NaN/±Infinity spin is
still rejected by the `Number.isFinite` guard, now reached via the `else if` when fire is
held-but-not-confirming (security subagent confirmed reachability against the passing
spin-while-held test); `input.fire` is consumed only in boolean contexts, so a non-boolean
value cannot poison arithmetic. Fourth, the round-1 rejection's own worry — two parallel
"was fire down" trackers rotting apart — is now structurally impossible: the duplicate is
deleted, `state.ts` is byte-identical to develop, and the input.ts comment points readers
at the single canonical latch. What remains are two LOW completeness nits (a missing
consistency assertion already covered by sibling tests on the identical line; an unpinned
"select path is RNG-clean" claim verified true by inspection) — neither is a bug, neither
reaches Medium. No Critical/High. I could not break it.

## Reviewer Assessment

**Verdict:** APPROVED (round 2 — supersedes the round-1 REJECTED verdict; all three round-1
MEDIUM rework items resolved and independently re-verified. Round-1 rejection preserved in
git history + the Phase History round-trip.)

**Round-1 rework items — all resolved:**
- **[MEDIUM] Duplicate edge-latch → RESOLVED.** Confirm now reads `input.start || (input.fire && !s.prevFire)`, reusing the shared `GameState.prevFire` latch (6-2, written unconditionally at sim.ts:1204, already consumed by stepHighScore at sim.ts:68). `SelectState.fireHeld` deleted; `state.ts` is byte-identical to develop (empty diff, confirmed by preflight AND rule-checker). input.ts comment repointed at prevFire. Behaviour-equivalent (proven three ways: my code-path trace, the test-analyzer's old-impl-runs-new-tests experiment, and 1710/1710 full-suite green). Net-negative source diff.
- **[MEDIUM] [TEST] spin-while-fire-held → RESOLVED.** Pinned at tp2-2.select-fire.test.ts:44; mutation-verified against drop-edge, inverted-polarity, and delete-latch-update mutants — all caught.
- **[MEDIUM] [TEST] no-bullet-on-confirm → RESOLVED.** `expect(out.bullets).toHaveLength(0)` on both fire-confirm tests; the bullet-injection mutant reddens both — non-vacuous.

**Subagent dispatch coverage** (5 disabled via workflow.reviewer_subagents):
[EDGE] disabled · [SILENT] disabled · [TEST] test-analyzer — both rework [TEST] items mutation-verified non-vacuous; 2 LOW completeness nits (below) · [DOC] comment-analyzer disabled (preflight separately flagged a stale PR #147 body) · [TYPE] type-design disabled (type surface covered by rule-checker #1–#5, clean) · [SEC] security clean (5 rules / 0 violations) · [SIMPLE] simplifier disabled (rework net-negative) · [RULE] rule-checker clean (18 rules / 34 instances / 0 violations).

**Non-blocking observations (LOW — recorded for the record, do NOT gate this story):**
| Severity | Issue | Location | Note |
|----------|-------|----------|------|
| [LOW] [TEST] | The spin-while-held test confirms via a fresh fire press but omits the `bullets.toHaveLength(0)` pin its two siblings carry. Mutation-tested: a bullet-spawn in the confirm branch is ALREADY caught by the siblings on the identical line — this is consistency, not a coverage hole. | tempest/tests/core/tp2-2.select-fire.test.ts:44 | Optional one-line add on a future touch. |
| [LOW] [TEST] | No test pins that the select fire-path leaves `state.rng` untouched / doesn't mutate the caller's state (the sibling determinism pin covers only attract+start). Verified by inspection: the branch makes no RNG calls and stepGame clones state first — not a live risk, an unpinned claim. | tempest/src/core/sim.ts:1154 | Could extend the determinism test on a future touch. |
| [LOW] [DOC] | PR #147's description still describes the pre-rework `SelectState.fireHeld` approach and cites 1709 tests; shipped code uses `prevFire` (1710). | PR #147 body | SM to refresh the body at finish. |

**Data flow traced:** shell input (held space/mouse → level-triggered `fire`; a click sets start+fire together) → stepGame select arm → `input.start || (input.fire && !s.prevFire)` rising-edge check → startGameAtLevel (safe: startLevel clears bullets and the entering press cannot re-trigger; NaN/±Infinity spin still rejected by the 5-9 `Number.isFinite` guard, intact and reachable in the else-if).
**Pattern observed:** the canonical fire-edge idiom (GameState.prevFire at sim.ts:68/1204) is now the SINGLE mechanism — the duplicate the round-1 review rejected is gone.
**Error handling:** boolean-only logic; no new failure surface; spin guard intact (security + rule-checker confirmed).
**Subagent verification:** preflight 1710/1710 + tsc clean + citations 79/79 + tree clean; security clean (5/0); rule-checker clean (18/34/0); test-analyzer confirmed both [TEST] rework items non-vacuous and the refactor equivalence, with only 2 LOW nits.

**Handoff:** To SM (The Organic Mechanic) for finish-story.

## Dev Assessment

**Implementation Complete:** Yes (rework, round 2)

**Files Changed:**
- `tempest/src/core/sim.ts` — select confirms on `input.start || (input.fire && !s.prevFire)`, reusing the shared edge latch; restored the original single `else if` spin structure; comment repointed at `GameState.prevFire`.
- `tempest/src/core/state.ts` — reverted: `SelectState.fireHeld` and its `initialState` seeding removed (net-zero vs develop).
- `tempest/src/core/input.ts` — `fire` doc comment repointed from `SelectState.fireHeld` to the canonical `GameState.prevFire` latch (6-2).
- `tempest/tests/core/tp2-2.select-fire.test.ts` — added the spin-while-fire-held pin (spin works and held fire never confirms; release + re-press confirms at the spun-to level) and `bullets` length-0 assertions on both fire-confirm tests; header comment updated to the prevFire mechanism.

**Rework items addressed (all three MEDIUMs):**
- Duplicate edge-latch → reuse `GameState.prevFire`; `SelectState.fireHeld` deleted; `state.ts` reverted; attract-arm seeding dropped; `input.ts` comment repointed. Verified frame-equivalent for every entry/held/release path (the sole runtime entry into `select` is the attract arm, where `prevFire` carries the entering frame's fire). Net-negative source diff.
- `[TEST]` spin-while-fire-held → added.
- `[TEST]` no-bullet-on-confirm → added to both confirm tests.
- LOW (d) resolved automatically (the omitted-field cast trap is gone with the field); (a)–(c) remain deferred as the Reviewer allowed.

**Tests:** 1710/1710 passing (GREEN), full tempest suite; `tsc --noEmit` clean.
**Branch:** `fix/tp2-2-select-fire-input` (pushed; PR #147 updated).

**Handoff:** To review.