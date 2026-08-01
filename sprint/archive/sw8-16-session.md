---
story_id: "sw8-16"
jira_key: "sw8-16"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-16: TIE fire-gate coverage

## Story Details
- **ID:** sw8-16
- **Jira Key:** sw8-16
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-01T18:35:04Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-01T18:03:40Z | 2026-08-01T18:05:41Z | 2m 1s |
| red | 2026-08-01T18:05:41Z | 2026-08-01T18:16:31Z | 10m 50s |
| green | 2026-08-01T18:16:31Z | 2026-08-01T18:18:14Z | 1m 43s |
| review | 2026-08-01T18:18:14Z | 2026-08-01T18:32:19Z | 14m 5s |
| green | 2026-08-01T18:32:19Z | 2026-08-01T18:34:06Z | 1m 47s |
| review | 2026-08-01T18:34:06Z | 2026-08-01T18:35:04Z | 58s |
| finish | 2026-08-01T18:35:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

- **Improvement** (non-blocking): the header comment of
  `plugins/star-wars/tests/core/tie-fire-cadence.test.ts` (lines 8-14) still
  describes the §6 gate as requiring C_AS ("has the player in its sights") and
  says fire "still runs on the retired cooldown" — both retired by sw8-9, which
  removed C_AS from the gate (the code's own comment at sim.ts:394-402
  documents the removal). Stale prose only; the tests themselves are correct.
  Affects `plugins/star-wars/tests/core/tie-fire-cadence.test.ts` (rewrite the
  header to the four-condition gate). Candidate to fold into sw8-18, the
  stale-prose/citation-defect story already in the backlog.
  *Found by Dev during GREEN verification.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations

- **TEA (red):** No literal RED state exists for this story by design — it is a
  guard-backfill chore: the gate code (sim.ts:414-418) already implements both
  lockouts correctly; the story exists because the sw8-9 review mutation-proved
  the suite did not PIN them. RED-phase proof is therefore the mutation
  experiment (three mutations applied to sim.ts, each reddening the new tests,
  then git-restored), not a failing-suite handoff. The `testing-runner`
  RED-verification spawn was skipped for the same reason; the full star-wars
  suite (193 files / 2079 tests) and repo lint were run directly instead, both
  green with sim.ts byte-identical to HEAD.
  → ✓ ACCEPTED by Reviewer: the guard-backfill reading matches the story title
  ("UNPINNED — mutation-proven during sw8-9 review"); the reviewer-rule-checker
  independently RE-EXECUTED both story mutations plus two extras (over-broad
  twist mask; `if (false)` on the whole fire branch) and every one reds the new
  suite, so the skipped ceremony is fully compensated by execution evidence.

### Reviewer (audit)
- No undocumented deviations found: the diff adds one test file, zero
  production changes, matching both the TEA plan and the Dev no-op record.

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
| 9 | reviewer-rule-checker | Yes | findings | 1 (LOW, comment accuracy) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via settings)
**Total findings:** 1 confirmed, 0 dismissed, 0 deferred

Both subagents ran FOREGROUND: background dispatch failed twice with
`respawn pane failed: fork failed: Device not configured` (tmux pane spawn —
the known agent-teams env flag was checked and is NOT set; cause is
environmental). Foreground execution is sequential but complete; both returned
full structured results.

## Sm Assessment

Setup complete for sw8-16 (1pt, p3, chore, tdd). Session file and story context
(`sprint/context/context-story-sw8-16.md`) created; story claimed `in_progress`
and the claim pushed to origin/main (9f169b1). No remote branch or sibling
`.session/` claim exists for this story. Trunk-based — no feature branch.

**Scope for TEA (RED phase):** Two of the four conditions in the ROM's TIE
fire gate (WSCPU.MAC:622-633) are mutation-proven unpinned — sw8-9 review
showed `aimingAhead=false` and `notHit=true` each leave the suite 1437/1437
green. Needed: (1) a fighter mid-AIM_AHEAD maneuver must not fire (C$T9
lockout); (2) a glowing just-hit fighter must not fire (A$GLW lockout). The
other two conditions (C$PV, the $800 floor) are already pinned — do not
duplicate them.

**Routing:** phased tdd → next agent TEA (red phase).

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/star-wars/tests/core/tie-fire-gate-lockouts.test.ts` — pins the two
  unpinned §6 fire-gate conditions (WSCPU.MAC:622-633), one describe per
  lockout, each lockout arm paired with a control arm differing only in the
  term under test.

**Tests Written:** 5 tests covering the story's 2 ACs
1. C$T9: a fighter mid-AIM_AHEAD (VM `waitFrames`-held twist $40) never fires
   over 380 frames, with fixture-integrity guards (still in the space phase,
   still one fighter parked at [0,0,-4000], twist still set at the end).
2. C$T9 control: the identical fighter mid-AIM_PLAYER ($80 — the SAME
   aimOrient steer) fires — proves the lockout is bit $40 alone.
3. A$GLW: a glowing fighter (kind darth, glow 9999) never fires; glow still
   open at the end.
4. A$GLW control: identical fighter with glow 0 fires.
5. A$GLW window semantics: glow 4 s (80 frames) — no fire ≤ 80, fire resumes
   after; pins cooldown-not-latch.

**Status:** GREEN on arrival (guard-backfill — see Design Deviations).
Non-vacuity proven by mutation + git-restore, reproducing the sw8-9 review
mutations plus one over-broad variant:

| Mutation on sim.ts | Result |
|---|---|
| `aimingAhead = false` (:414) | test 1 REDS (1 failed / 4 passed) |
| `notHit = true` (:416) | tests 3 & 5 RED (2 failed / 3 passed) |
| `aimingAhead` reads `AIM_AHEAD\|AIM_PLAYER` | test 2 REDS (1 failed / 4 passed) |

sim.ts restored clean after each run (`git diff --stat` empty).

**Fixture landmine found and guarded:** the PH$SP2 warp ends the space phase at
`phaseTime >= 21 s` and wave 1 seeds the clock at 1.95 s, so a 400-frame run
phase-outs at step ~381 and empties `enemies` — which would read as lockout
silence. Fixtures zero `phaseTime` (420-frame budget), runs cap at 380, and
`expectStillAtPost` asserts `phase === 'space'` so any future budget change
fails loudly instead of vacuously passing.

### Rule Coverage

Test-only chore — no production code written, so most lang-review checks
(type escapes, enums, async, React) have no new surface. Applicable rules:

| Rule | Coverage | Status |
|------|----------|--------|
| #8 test quality: meaningful assertions | every test asserts fire-frame sets plus fixture-integrity guards; no `let _`, no `as any`, no non-null `!` | pass |
| #8 vacuous-test guard | control arms + 3-mutation kill proof | pass |
| #4 `??` vs `\|\|` on falsy-valid | `vm?.twist ?? 0`, `glow ?? 0` used throughout | pass |

**Rules checked:** 3 of 3 applicable lang-review rules have coverage
**Self-check:** 0 vacuous tests found (controls + mutations enforce this structurally)

**Suite:** star-wars 193 files / 2079 tests green in 104 s; `npm run lint` clean.
**Commit:** 3833041 `test(sw8-16): pin the C$T9 and A$GLW fire-gate lockouts`

**Handoff:** To Dev for GREEN — nothing to implement (gate already correct);
Dev should confirm no-op and pass through to review.

### Dev (implementation)
- No deviations from spec. (No implementation existed to deviate: the story is
  a guard-backfill; the gate at sim.ts:414-418 already satisfied both new
  tests, so GREEN is a verified no-op — zero source files changed.)

## Dev Assessment

**Implementation Complete:** Yes — as a verified no-op. The story's premise is
that the CODE was already correct and only the COVERAGE was missing; TEA's
tests pass against an unmodified `sim.ts` (byte-identical to HEAD, working
tree clean), which is exactly the GREEN this story defines. Writing gate code
here would have been scope creep.

**Files Changed:**
- none (production). Test file `tie-fire-gate-lockouts.test.ts` landed in
  TEA's commit; no Dev commit exists because there was nothing to commit.

**Tests:** 5/5 new lockout tests passing at HEAD; full star-wars suite
193 files / 2079 tests green (TEA's run, unchanged tree since); lint clean.
**Branch:** none
(trunk-based — pushed straight to main as d8502a9, rebased over unrelated
joust traffic (jt5-16) with tests re-verified green post-rebase.)

**Handoff:** To review.

### Reviewer (code review)
- **Improvement** (non-blocking): the `core-purity`-style boundary scanners
  cover only `src/core/`; test files exercising the core are outside every
  mechanical boundary check and rest on review discipline alone (noted while
  manually verifying rule A1 for this diff — the new file complies).
  Affects `plugins/star-wars/tests/` (a tests-side boundary scan would close
  the gap; candidate follow-up, not this story).
  *Found by Reviewer during code review.*

## Reviewer Assessment

**Verdict:** REJECTED (round 1 — comment-accuracy only; every assertion, fixture
and mutation-kill claim verified correct by independent execution)

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [LOW] [RULE] | Comments derive frame figures from TICK_HZ = 20, but state.ts pins `TICK_HZ = 246.094 / 12 ≈ 20.5078`: the "420-frame budget" is really ≈ 430.7 frames, and "4 s of glow = 80 game frames … steps 1..80 blocked, step 81 first eligible" is really ≈ 82.03 frames / steps 1..~82. The CODE is right (it computes from the live constant — mutation-B failure output printed `expected 16 to be greater than 82.031…`); only the prose figures are wrong. | `plugins/star-wars/tests/core/tie-fire-gate-lockouts.test.ts` docstring of `spaceWith` ("420-frame budget"), docstring of `RUN_FRAMES` ("420-frame phase budget"), and the window-test comment ("80 game frames", "steps 1..80", "step 81") | Restate the three comment spans from the real TICK_HZ (≈ 20.51): budget ≈ 430 frames, blocked span ≈ 82 frames. Do not touch any code or assertion. |

**Why LOW blocks here:** normally a lone comment nit is a follow-up, not a
block (proportionality). This epic is the exception by its own record: sw8-15
(shipped) and sw8-18 (backlog, p2) exist precisely because ROM-derived figures
embedded in comments survive green review rounds and nothing mechanical ever
re-opens them. Approving a NEW file with known-wrong figures of exactly that
class, when the fix is three comment spans and the pipeline is still open, is
how sw8-18's backlog grew to eleven items. Comment-only rework → route to
green/Dev, not red/TEA.

**Review checklist evidence (tags for enabled dispatch: [RULE]; preflight has
no tag; [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] subagents disabled
via settings, their domains covered inline below):**

1. [VERIFIED] Both story mutations kill: rule-checker re-executed mutation A
   (`aimingAhead = false` → "mid-AIM_AHEAD never fires" FAILS, `expected
   [ Array(8) ] to deeply equal []`) and mutation B (`notHit = true` → both
   glow tests FAIL), then restored sim.ts and confirmed `plugins/` clean.
   Complies with lang-review #8/#15 (no vacuous tests, mutation-provable).
2. [VERIFIED] Both CONTROL arms are themselves non-vacuous: rule-checker's
   extra mutation short-circuiting the fire branch to `if (false)` reds all
   three `fires.length > 0` assertions; the over-broad
   `AIM_AHEAD|AIM_PLAYER` mutation reds exactly the AIM_PLAYER control.
3. [VERIFIED] [RULE] 19 checklist rules (15 typescript.md incl. JS
   extensions + 4 project rules) × every construct in the diff: 0 violations.
   Nullish handling exemplary — `vm?.twist ?? 0` / `e.glow ?? 0` use `??`
   where `0` is falsy-but-valid (lang-review #4); type-only imports use
   inline `type` (#5); no type escapes (#1).
4. [VERIFIED] Core/shell boundary (project rule A1): no shell/ import, no
   DOM/window/canvas, no wall clock, no Math.random — all time via
   `TICK_DT = 1/TICK_HZ`, all randomness via `initialState(seed)`'s carried
   RNG (file imports at :25-31, fixture at `spaceWith`).
5. [VERIFIED] Citation gate untouched: diff adds one file; sim.ts (cited in
   docs/audit) last modified at 6e0a548, before this story — no cited line
   shifts (rule A4).
6. [EDGE-inline] Boundary conditions hand-checked (subagent disabled):
   `Math.min(...fires)` on an empty array is unreachable — the
   `fires.length > 0` expect throws first; `waitFrames: 1e9` cannot exhaust
   in 380 decrements; `blockedFrames` is non-integer (82.03) and fires are
   integer step indices so `toBeGreaterThan` has no equality edge; the
   phase-out landmine (space ends at 21 s) is GUARDED by
   `expectStillAtPost` asserting `phase === 'space'`, proven live — it
   caught the original 400-frame fixture during RED.
7. [TEST-inline] Test quality hand-checked (subagent disabled): every test
   asserts on data (fire-step sets) plus fixture integrity; no skips, no
   `.only`, no snapshots, no `toBeTruthy` (preflight smell scan: 0 hits).
8. **Data flow traced:** seed 1983 → `initialState` RNG → carried in state →
   `computeStatus`/fire-roll consume it per tick → `enemy-fire` events →
   `run()` collects per-step indices → assertions. Deterministic end-to-end;
   no ambient input crosses the boundary.
9. **Error handling / security / tenant isolation:** N/A surface — pure-sim
   test fixture, no I/O, no auth, no user input; nothing to sanitize
   ([SEC]/[SILENT] domains — no constructs for them to flag).
10. **Pattern observed (good):** paired lockout/control arms differing in ONE
    field, with fixture-integrity guards (`expectStillAtPost`) making silence
    attributable — a stronger idiom than the sibling cadence suite's
    single-arm tests; worth copying forward.

### Rule Compliance

Mapped rule-by-rule in the rule-checker's table (19 rules, 0 violations),
spot-audited by me on the falsy-`??` sites, the import forms and the boundary
greps. The one confirmed finding is prose accuracy inside the new file's own
comments — the class this epic tracks as real work (sw8-15/sw8-18), severity
LOW, fix specified above.

### Devil's Advocate

Suppose this suite is theater. The strongest attack: both lockout arms could
be silent for a reason OTHER than the gate term — out of view, out of range,
phase-out, despawn — and the tests would still pass while pinning nothing.
That attack is defeated by construction and by execution: `expectStillAtPost`
asserts the fighter survived IN the space phase at the exact parked position
inside the view pyramid past the $800 floor, and the phase-out failure mode
actually OCCURRED during RED (the 400-frame fixture emptied `enemies` at step
~381) and was caught by precisely these guards, so they demonstrably fire.
Second attack: the controls could share the lockout arm's silence under a
gate rewrite that locks out ALL aim maneuvers — the AIM_PLAYER control was
chosen over twist-0 exactly to red that rewrite, and the rule-checker's
over-broad mutation proved it does. Third attack: PRNG luck — a seed under
which the control arms fire zero times in 23 windows would flip them red
falsely; but the runs are seeded (1983) and deterministic, so there is no
luck, only a fixed trace, re-verified at HEAD twice by different agents.
Fourth attack: the comments. Here the devil wins a point — the file's prose
figures assume TICK_HZ = 20 when the constant is 20.5078, and this project's
own history (sw8-18, eleven items) shows wrong in-comment figures are the
defect that outlives everything else. That is the confirmed finding and the
reason for the round-1 reject. Fifth: could `waitFrames: 1e9` mask a VM bug?
No — the test asserts the twist bit is still SET at run end, so a VM that
dropped the maneuver would fail loudly.

**Handoff:** Back to Dev for the comment-only fix (review → green rework).

## Dev Assessment (round 2 — rework)

**Implementation Complete:** Yes. Applied exactly the review's fix list, and
one precision correction found while applying it: the review said "steps
1..~82 blocked"; the exact boundary is that step 83's incoming glow is still
a positive FP sliver (4 − 82×TICK_DT ≈ 0.0015), so blocked runs THROUGH step
83 and the first eligible tick is 84 — the committed comment states that
precisely rather than reproducing a second off-by-one.

**Files Changed:**
- `plugins/star-wars/tests/core/tie-fire-gate-lockouts.test.ts` — three
  comment spans restated from the real `TICK_HZ = 246.094/12 ≈ 20.5078`
  (verified against state.ts:340 directly): budget ≈ 430.7 frames, blocked
  span ≈ 82.03 frames / through step 83. Comments only — zero code, zero
  assertion changes (diff: 11 insertions, 6 deletions, all in comments).

**Tests:** 5/5 passing post-edit; `npm run lint` clean.
**Branch:** none
(trunk-based — pushed straight to main as f3c5bc6, rebased over unrelated
jt8-3 claim traffic; sprint tracking stash/popped with 0 conflict markers,
verified.)

**Handoff:** Back to review (round 2).

## Reviewer Assessment

**Verdict:** APPROVED (round 2)

Round-2 scope: the single round-1 finding ([LOW] [RULE] comment figures derived
from TICK_HZ = 20). The rework commit f3c5bc6 was verified directly:

- **Comment-only confirmed:** every changed line in `git show f3c5bc6` sits
  inside a docstring or `//` comment; one file, 11 insertions / 6 deletions;
  zero code or assertion changes.
- **Figures independently recomputed** (not taken from prose): TICK_HZ =
  246.094/12 = 20.50783…; budget 21 × TICK_HZ = 430.66 (comment says ≈430.7 ✓);
  blocked span 4 × TICK_HZ = 82.03 ✓; step-83 incoming glow sliver
  4 − 82×TICK_DT = 0.00153 (comment says ≈0.0015 ✓); step 84 first eligible
  (incoming −0.047) ✓. Dev's precision correction of the review's own
  "steps 1..~82" phrasing is right and is the kind of exactness sw8-18 asks for.
- **Tests:** 5/5 green post-rework at HEAD (f3c5bc6, pushed).
- **No new surface:** no other comment in the file states a TICK_HZ-derived
  figure (the "≈23 open cadence windows" line is mask-derived, 380/16 = 23.75,
  and stands).

Round-1's subagent table, rule compliance ([RULE]: 19 rules, 0 violations),
data-flow trace, and Devil's Advocate stand unchanged — the rework touched no
code they examined. All round-1 [VERIFIED] items remain valid.

**Data flow traced:** unchanged from round 1 (seeded RNG → stepGame decision
ticks → enemy-fire events → per-step collection → assertions).
**Pattern observed:** paired lockout/control arms with fixture-integrity
guards at tie-fire-gate-lockouts.test.ts — worth copying forward.
**Error handling:** N/A surface (pure-sim test fixture; nothing to handle).
**Handoff:** To SM for finish-story.