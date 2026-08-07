---
story_id: "jt9-51"
jira_key: "jt9-51"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-51: joust climb-prep: pin the 21-wake B2UP3/SHUP3 decision-interval LENGTH behaviourally

## Story Details
- **ID:** jt9-51
- **Jira Key:** jt9-51
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt9-51-climb-prep-per-wake-hold
- **PR:** https://github.com/slabgorb/arcade/pull/50

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-07T13:06:07Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T12:39:26Z | 2026-08-07T12:43:58Z | 4m 32s |
| red | 2026-08-07T12:43:58Z | 2026-08-07T12:56:20Z | 12m 22s |
| green | 2026-08-07T12:56:20Z | 2026-08-07T12:58:41Z | 2m 21s |
| review | 2026-08-07T12:58:41Z | 2026-08-07T13:06:07Z | 7m 26s |
| finish | 2026-08-07T13:06:07Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### Reviewer (code review)
No upstream findings. The diff is test-only and self-contained; nothing to route to a sibling story. (The pre-existing `PR #45 chore/pm2-2-sprint-complete` open-PR loose end that SM flagged is unrelated to this story.)

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

## SM Assessment

**Setup by Baldur the Bright (SM), 2026-08-07.** Story arrived at the `setup` pointer, `NEW_WORK_STATE`.

**Premise refuted → REPURPOSED (user ruling 2026-08-07).** The filed story asks to "pin the 21-wake B2UP3/SHUP3 decision-interval LENGTH behaviourally … once the port models the interval as a held state." That precondition is **false by design**: the joust port models climb-prep STATELESS — it re-checks the cliff mask every wake and re-derives the hold, with no armed 21-wake `PJOYT` countdown and no stored `PDIST` line. Direct evidence: `enemy.ts:784-785` (hunter, "Re-derived per wake … per-wake line ≡ live line collapses the ROM's `PDIST+1 CMPB PPOSY+1` gate") and `enemy.ts:965` (shadow, "Stateless … re-checked each wake"). This is a Reviewer-ACCEPTED deviation from jt9-23 (`sprint/archive/jt9-23-session.md:137-143`, `:200`). There is no 21-wake period to observe, so a period test would be vacuous.

**User ruling:** repurpose (keep 2pt) to **pin the deviation** — a behavioural test of the port's actual per-wake semantics: hold level with a cliff one YLEN above; the hold re-derives each wake (no 21-wake latch); a cleared cliff resumes the climb the NEXT wake; a re-appeared cliff re-holds; open-air control climbs unobstructed. Both hunter (`b2undr`/B2UP3) and shadow (SHUP3). Rejected alternatives: "expand to model a held interval" (reverses a deliberate fidelity deviation, >2pt) and "park" (leaves the deviation unpinned).

**Context steering:** ACs were `null`; derived them toward the repurposed scope (5 ACs in the context file). A `⚠ REPURPOSED` banner sits at the top of the context; the epic YAML and story title still name the old "21-wake" framing (title deliberately not changed per the ruling).

**Board probes (both clean):** no remote branch owned `jt9-51` before setup; only live sibling session is a-3 on `mc3-1` (unrelated). Claim now pushed: branch `feat/jt9-51-climb-prep-per-wake-hold` (empty at push, then the context/stamp commit) + `status: in_progress` stamped on `sprint/epic-jt9.yaml`.

**Flag for TEA (Tyr One-Handed):** this state is play-unreachable (uf1-9: 0 frames / 3 seeds / 6000 frames) — drive it directly via a staged fixture, mirroring `climb-prep-wiring.test.ts` (which most likely EXTENDS rather than a new file — a new `plugins/joust/tests/*.test.ts` reddens `audio-seam-scope`'s derived README counts; bump the README at RED if you add one). Provenance for the ROM's 21-wake timer / per-brain `PDIST` width already lives in `climb-prep-source.test.ts` — do not re-pin it; pin the port's per-wake OBSERVABLE.

**Loose end (not blocking):** PR #45 (`chore/pm2-2-sprint-complete`) is open and non-draft — leftover pm2-2 bookkeeping; did not block the merge gate.

## TEA Assessment

**RED phase by Tyr One-Handed (TEA), 2026-08-07.** Commit `cde74470` on `feat/jt9-51-climb-prep-per-wake-hold`.

### ⚠ This is a GREEN-GUARD story — there is NO implementation for Dev to write

The port ALREADY does per-wake climb-prep re-derivation (that IS the jt9-23 deviation). I measured the live behaviour with a throwaway probe before writing a line (probe deleted). The five new tests pass on arrival — they are **regression guards** against a future drift toward the ROM's held 21-wake timer or any stateful latch. **Do not read green-on-arrival as "already done, skip"** (the jt8-6 trap). Dev's job here is: (1) confirm the suite is green, (2) reproduce the mutation battery below to satisfy yourself the guards bite, (3) hand to Reviewer. No `src/core` edit is expected or wanted; an edit that "makes it faithful" (adds a 21-wake latch) would REVERSE the Reviewer-accepted deviation and redden these guards — that is their whole point.

### What I added

Extended `plugins/joust/tests/climb-prep-wiring.test.ts` (NOT a new file — the `audio-seam-scope` README census is unaffected; full joust suite 3030/3030) with one `describe('jt9-51 …')` block + a `traceFlaps` helper. `traceFlaps` is `flapCount`'s harness with a PER-WAKE position: driving `stepEnemyDetailed` while carrying all brain state (seek/pjoy/facing/wing-cadence) forward and only moving the bird between the cliff site (solid box one YLEN above) and the clear site. Moving the bird IS clearing/re-adding the cliff to the up-seek decide, which samples the mask one YLEN above the LIVE position. It reuses production `stepEnemyDetailed` — it does not reimplement it (lang-review #18).

### AC coverage

| AC | Coverage | Where |
|----|----------|-------|
| AC-1 hunter holds at a cliff | ✔ existing | jt9-23 block: "RED — hunter must HOLD LEVEL (B2UP3)" (green since jt9-23) |
| AC-2 shadow holds at a cliff | ✔ existing | jt9-23 block: "RED — shadow must HOLD LEVEL (SHUP3)" |
| AC-5 open-air control climbs | ✔ existing | jt9-23 block: the two CONTROL tests |
| AC-3 cleared cliff resumes climb, no latch | ✔ NEW | `AC-3 shadow` (resumes the very next wake), `AC-3 hunter` (resumes inside 21 wakes) |
| AC-4 re-appearing cliff re-engages hold | ✔ NEW | `AC-4 shadow`, `AC-4 hunter` |
| (both brains, full toggle) | ✔ NEW | `the hold tracks the mask each wake: cliff→clear→cliff` |

AC-1/AC-2/AC-5 are already pinned by jt9-23 and are NOT duplicated — the story's genuine delta is the no-latch TEMPORAL property (AC-3/AC-4), which jt9-23 explicitly left unpinned.

### RED evidence — the mutation battery (lang-review #15, #18)

Because the guards are green on arrival, non-vacuity is proven by mutating the single per-wake gate `cliffBlocksClimb` (read once/wake by the hunter `b2undr` up-seek branch and the shadow SHUP3 branch) to a constant, then reverting via `git checkout --` (verified clean each time; 13/13 restored):

| Mutation | Meaning | jt9-51 tests reddened |
|----------|---------|----------------------|
| `return true` | sticky hold = a never-releasing latch (the ROM-drift the guard defends against) | **all 5** (AC-3 ×2, AC-4 ×2, toggle) |
| `return false` | no hold = always climbs | **4** (AC-3 shadow, AC-4 ×2, toggle) |

Every new test bites under at least one mutation; AC-3-hunter is specifically the latch-discriminator (its `firstFlap < 21` fails only under the latch). The discriminator relies on 5+15=20 < 21 total wakes, so a `#20+1` interval armed at cliff entry would still be holding — the assertion cannot pass under the very thing it forbids.

### Rule coverage (lang-review/typescript.md)

- **#15 (guards mutation-tested):** the battery above — recorded here, reproducible by Dev.
- **#17 (comment mechanism re-run):** the port/ROM claims in the block's header were re-measured by probe, not transcribed; the `#20+1`→21 fact stays provenance-only in `climb-prep-source.test.ts`.
- **#18 (apparatus fails-by-passing):** answered directly — the fixture distinguishes a broken impl in both directions; the shadow gives an exact per-wake signal (flap iff clear).
- **jt9-30 (no `<file>.ts:<line>` comment refs):** hit once on first write (`comment-line-refs.test.ts` reddened), converted to symbol references (`cliffBlocksClimb`, the two branches); grep-clean now.

### Robustness note for finish-time

All assertions are slice-based `.some()`/`.every()` + the "< 21" discriminator, and the shadow's exact `f[5]` / `f.slice(12)` reads — chosen to survive a sibling changing the hunter's wing-cadence TIMING, since the shadow flaps every clear wake regardless of cadence. No exact hunter-flap-index is asserted.

**Delivery Findings:** No upstream findings.

**Handoff:** To Loki Silvertongue (Dev), GREEN phase — a verify-and-confirm pass, not an implementation. See the ⚠ banner above.

## Dev Assessment

**GREEN phase by Loki Silvertongue (Dev), 2026-08-07.** No new commit — **no implementation was written, and none should be.**

**Why no code changed.** This is the green-guard story TEA described: the port already re-derives climb-prep every wake (the Reviewer-accepted jt9-23 deviation). Making the tests "pass" required nothing — they passed on arrival. The only edit that would satisfy a naïve "make it faithful to the ROM" reading is to add a 21-wake `PJOYT` latch, which would REVERSE the deviation and redden these very guards. Minimalist discipline and the deviation both say: touch no `src/core`. The branch diff is test-only (`plugins/joust/tests/climb-prep-wiring.test.ts`) plus the SM bookkeeping (context + epic stamp).

**Verification (independent, not taken on trust):**
- Full joust suite: **3030/3030 green**, 149 files (the `audio-seam-scope` census is intact — the file was extended, not added).
- Re-ran the latch mutation myself (`cliffBlocksClimb → return true`), reverted via `git checkout --`: all **5** jt9-51 guards reddened, then **13/13** restored green. The guards bite.
- Typecheck `npm run lint` (tsc --noEmit, repo-wide): clean.
- `git diff develop...HEAD` confirms zero `src/` changes.

**No regression surface.** The change adds test assertions only; no core mechanism, event union, or shared value shape moved — none of the GREEN-phase ripple traps (space-change, shared-value-shape, trigger-gating fan-out) apply.

**Delivery Findings:** No upstream findings.

**Handoff:** To Heimdall (Reviewer). The review target is a test-only diff. Suggested focus: (1) are the guards genuinely discriminating, or vacuous? — the mutation table in the TEA Assessment is the evidence, reproducible in one perl-substitution; (2) is the AC-3-hunter "< 21" discriminator sound (5+15=20 < 21, so a `#20+1` latch cannot pass it)?; (3) is relying on the existing jt9-23 block for AC-1/AC-2/AC-5 (rather than duplicating) acceptable coverage? The story is a repurposed deviation-pin (see SM Assessment + the `⚠ REPURPOSED` banner in the context) — the title still names the old "21-wake period" framing deliberately.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (preflight returned clean; the 8 specialists are disabled via `workflow.reviewer_subagents`)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

Because `test_analyzer` (the specialist that would judge vacuity here) is DISABLED, the mutation check was mine — see the battery in the Reviewer Assessment below.

## Reviewer Assessment

**Review by Heimdall (Reviewer), 2026-08-07.** Verdict below. Target: a test-only diff on `feat/jt9-51-climb-prep-per-wake-hold` (`plugins/joust/tests/climb-prep-wiring.test.ts`, +134; the other two changed files are SM sprint bookkeeping). Mechanical state (preflight, independently re-run): no `src/` change, joust 3030/3030, `tsc --noEmit` clean, orchestrator 408/0, no code smells, no banned `.ts:<line>` comment refs.

### The adversarial work: an INDEPENDENT mutation battery (not TEA's / Dev's)

All 8 review specialists are disabled, so vacuity is mine to disprove. Self-reading a green test proves nothing; I mutated production and watched. Every mutation reverted via `git checkout --`, tree verified clean, 13/13 restored each time.

1. **Shared gate `cliffBlocksClimb → return true`** (a never-releasing latch — the exact ROM-drift these guards defend against): **all 5** jt9-51 tests redden. The `#20+1`-latch class is caught.
2. **Shared gate `→ return false`** (no hold): **4** redden (AC-3-hunter correctly does NOT — it is the latch-discriminator, and no-hold is caught instead by the jt9-23 hold-exists block in the same file).
3. **Per-brain isolation — the check TEA/Dev did NOT do.** Disabling ONLY the hunter branch (`enemy.ts:786` → `if (false)`) reddens AC-4-hunter + toggle and leaves every shadow test green; disabling ONLY the shadow branch (`enemy.ts:970` → `if (false)`) reddens AC-3-shadow + AC-4-shadow + toggle and leaves every hunter test green. This proves the shadow tests guard the SHADOW branch and the hunter tests the HUNTER branch — they are not accidentally co-exercising one path through the shared helper.

**Vacuity audit:** every test carries a POSITIVE flap anchor (AC-3-shadow `f[5]===true`; AC-3-hunter `firstFlap>=5`; AC-4-shadow `f[11]===true`; AC-4-hunter `slice(0,12).some===true`; toggle `slice(4,12).some===true`), so no "held (no flap)" assertion can pass vacuously on a dead fixture. `traceFlaps` carries `pjoy`/`seek`/`facing`/`prevFlapHeld` forward and overrides only the entity's position/velocity — a latch, if one existed, would live in exactly the state it preserves, and the mutations above confirm it would show. Sites come from `findSites()` (scanned from the BCK tables), not hardcoded coordinates — robust to table drift.

### Rule compliance (lang-review/typescript + project rules)

- **#15 (guards mutation-tested):** satisfied and independently re-verified above.
- **#18 (apparatus fails-by-passing):** the fixture demonstrably distinguishes a broken impl in both directions and across both brains; `traceFlaps` reuses production `stepEnemyDetailed` rather than reimplementing it.
- **#17 (comment mechanism re-run):** the block's ROM/port claims were measured by TEA's probe; the `#20+1`→21 fact stays provenance-only in `climb-prep-source.test.ts` (not re-asserted here).
- **jt9-30 (`comment-line-refs`):** grep-clean; the one initial `enemy.ts:784` was converted to symbol refs.

### Coverage judgment (answering Dev's Q3)

Relying on the existing jt9-23 block for AC-1/AC-2/AC-5 (hold-exists + open-air control) rather than duplicating is CORRECT: that block is in the same file, runs in the same process, and was itself mutation-reviewed at jt9-23. The new block adds the genuine delta jt9-23 left open — the no-latch TEMPORAL property. Together the two blocks are complete; duplication would be noise.

### Non-blocking observation (not a finding, no action required)

AC-3-hunter's `< 21` upper bound is largely documentary — its real teeth are `slice(0,5) held` + `firstFlap >= 5`, and by itself it would not catch a SHORT (<~13-wake) latch. That is acceptable: a short latch is not the ROM behaviour in scope, the hunter's coarseness is inherent to its ~8-wake cadence and is honestly documented, and AC-3-**shadow** (`f[5]===true`) catches ANY latch ≥ 1 wake. No change requested.

### Severity table

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 0 |
| Low | 0 |

No Critical or High (indeed nothing actionable). The diff does exactly what a repurposed deviation-pin should: it locks the port's per-wake climb-prep behaviour with mutation-proven, branch-specific, non-vacuous guards, and correctly changes no production code.

**Verdict:** APPROVED