---
story_id: "jt9-53"
jira_key: "jt9-53"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-53: pin tick() idle path: an idle tick must not release a sounding zero-window voice

## Story Details
- **ID:** jt9-53
- **Jira Key:** jt9-53
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** feat/jt9-53-pin-tick-idle-zero-window-voice
- **PR:** 54

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T13:37:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T13:13:28.074823Z | 2026-08-07T13:17:53Z | 4m 24s |
| red | 2026-08-07T13:17:53Z | 2026-08-07T13:25:11Z | 7m 18s |
| green | 2026-08-07T13:25:11Z | 2026-08-07T13:30:31Z | 5m 20s |
| review | 2026-08-07T13:30:31Z | 2026-08-07T13:37:43Z | 7m 12s |
| finish | 2026-08-07T13:37:43Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- No upstream findings. Guard added cleanly; the shipped `tick()` is correct and the
  mutation proof holds. *Found by TEA during test design.*
- **Gap** (blocking, for FINISH only — not for review): the working tree arrived (at
  session start, before any jt9-53 work) carrying ORPHANED finish bookkeeping from a
  prior session — jt9-51's `done`/`completed` stamp, its archived session
  (`sprint/archive/jt9-51-session.md`), `sprint/current-sprint.yaml`,
  `sprint/archive/sprint-2632-completed.yaml`, and the pm1 epic archival
  (`sprint/epic-pm1.yaml` deleted → `sprint/archive/epic-pm1.yaml`). jt9-51 IS merged
  (PR #50) so this is real completed work that never landed on `develop`. To get a clean
  tree for the dev-exit gate WITHOUT bundling sibling bookkeeping into jt9-53's PR, Dev
  stashed all of it — plus jt9-53's own tangled `in_progress` stamp in `epic-jt9.yaml` —
  at `git stash` message `jt9-53-green: orphaned jt9-51/pm1 finish bookkeeping + jt9-53
  in_progress stamp — SM to sort at finish`. **SM at finish:** `git stash list`, restore
  jt9-53's stamp (→ `done`), and land the orphaned jt9-51/pm1 completion onto `develop`
  separately (a `chore/` PR), NOT inside jt9-53's PR. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking, for FINISH): `origin/develop` advanced under sibling
  work during this story (to `5a96d4ec`; mc3-2 active), so jt9-53's branch is behind.
  Expect a rebase/merge at finish — trial-merge `origin/develop` and re-run the shared
  suite on the merged tree before merging the PR (finish-time re-measure rule).
  Affects the merge step only; the diff itself is clean. *Found by Reviewer during code review.*
- I corroborate Dev's blocking stash finding above (orphaned jt9-51/pm1 bookkeeping).
  No new upstream code findings beyond it.
- **CORRECTION to Dev's finding (UNSTASHED):** to stamp `review_verdict: approved`
  consistently onto jt9-53's `in_progress` entry, the Reviewer POPPED Dev's stash
  (`stash@{0}` dropped, applied cleanly). So there is NO stash to restore — the orphaned
  jt9-51/pm1 bookkeeping is now sitting UNSTASHED in the working tree:
  `sprint/epic-jt9.yaml` (jt9-51 `done`+`completed`, jt9-53 `in_progress`+`review_verdict:
  approved`), `sprint/current-sprint.yaml`, `sprint/archive/sprint-2632-completed.yaml`,
  `sprint/epic-pm1.yaml` (deleted) → `sprint/archive/epic-pm1.yaml`,
  `sprint/archive/jt9-51-session.md`. **SM at finish:** do NOT `git stash list`; the
  changes are in-tree. `pf sprint story finish jt9-53` handles jt9-53's own YAML; the
  jt9-51/pm1 completion is real prior work that must land on `develop` via a SEPARATE
  `chore/` PR, NOT bundled into jt9-53's PR (diff before commit; revert to jt9-53's lines).
  *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec. This is a latent-mutant guard: the shipped `tick()` is
  already correct, so GREEN required NO production code change. Deliberately did NOT
  edit `src/shared/audio.ts` — any edit there would be a fidelity regression, not the
  story. GREEN = TEA's guard test passing, independently re-verified plus the full
  mutation proof re-run (below).
  → ✓ ACCEPTED by Reviewer: correct call. This is a "pin a surviving mutant" story
  (jt9-6/jt9-35/jt9-52 family); the shipped `tick()` at `audio.ts:323-328` is faithful,
  and my own mutation battery confirms editing it would only introduce the very defect
  the guard forbids. Zero production change is the right outcome.

### Reviewer (audit)
- No undocumented deviations. The diff is exactly the two artifacts the spec calls for
  (one engine test + story context); `src/shared/audio.ts` is byte-unchanged
  (`git diff origin/develop...HEAD` touches no production file). Nothing diverged silently.

## SM Assessment

**Story:** jt9-53 — pin tick() idle path: an idle tick must not release a sounding
zero-window voice. 2pt, p3, tdd, arcade. Filed by the jt9-35 Reviewer as a non-blocking
MINOR sibling of jt9-52.

**Board check (clean):** sibling probes ran before setup — no remote branch and no
sibling `.session/` file for jt9-53. Claim branch `feat/jt9-53-pin-tick-idle-zero-window-voice`
pushed EMPTY (tip == develop) so the sibling probe lights up.

**Premise measured (the description demands "re-measure the line anchors at setup"):**
- The cited site `src/shared/audio.ts:324-326` is ACCURATE right now — no drift today —
  reading exactly `if (voiceFrames > 0) { voiceFrames -= 1; if (voiceFrames === 0) releaseVoice() }`.
  TEA should still re-grep at RED time (jt9-30: these anchors drift by the hour).
- The target test file `src/shared/tests/audio-voice-release.test.ts` already exists.
- **`ZEROWIN` already exists** in that file (≈line 336); existing tests already pin the
  `:222` and `:313` release sites with it. The story's "add ZEROWIN manifest shape" is
  really REUSE the existing const. The genuinely-NEW coverage is the tick() IDLE path
  (`:324-326`) — a distinct mutant site from `:222`/`:313`. Recorded in the context's
  Technical Approach so TEA has it as primary input.

**ACs:** `acceptance_criteria` is `null` in the epic YAML — TEA derives ACs during RED
(same shape as jt8-6). Premise here is SOUND (not refuted), so no correction banner is
needed; the SCOPE in the description is precise and directly testable.

**Handoff:** → TEA (Tyr One-Handed) for the RED phase. Write one engine test in
`audio-voice-release.test.ts`: a sounding zero-window voice, one idle `tick()`, then
assert an accepted arbitrated cue still cross-steals the channel (mutant survives
otherwise: the idle tick releases the voice, no steal, two voices sound).

## TEA Assessment

**Tests Required:** Yes
**Reason:** N/A — this is a latent-mutant guard (a "pin the surviving mutant" story,
same family as jt9-6/jt9-35/jt9-52). The shipped `tick()` is already CORRECT, so the
guard PASSES green on arrival; its value is caught only by the mutation proof below.

**Test Files:**
- `src/shared/tests/audio-voice-release.test.ts` — added one `it()` in a new
  `describe('jt9-53 …')` block after the jt9-52 B1/B2 block.

**Tests Written:** 1 engine test. (Story has no `acceptance_criteria` in the epic YAML;
scope is the description's SCOPE clause — "add one engine test … an idle tick must NOT
release a sounding zero-window voice; the next accepted arbitrated cue must still steal
its channel." One focused test covers it.)

**Status:** GREEN on correct code, RED under the mutant — the honest state for a latent
guard (not "RED failing for Dev to implement": there is nothing to implement; see
Handoff). Full shared suite **561 passed** (was 560), `npm run lint` clean — confirmed
independently by `testing-runner`.

**Line anchors re-measured (the story demands it; jt9-30):** `src/shared/audio.ts:324-326`
reads exactly `if (voiceFrames > 0) { voiceFrames -= 1; if (voiceFrames === 0) releaseVoice() }`
at setup and at RED — no drift.

**Mutation proof (non-vacuity — rule #14/#15 "delete the mechanism, require red"):**
Applied the verbatim hoist to `tick()`, confirmed via `git diff` the intended site
changed (rule against wrong-duplicate slurps), reverted with `git checkout --` and
re-verified clean + green.
```
-      if (voiceFrames === 0) releaseVoice()   // inside the `voiceFrames > 0` block
     }
+    if (voiceFrames === 0) releaseVoice()     // hoisted — fires on EVERY idle tick
```
- correct code → test PASSES (`zap.stopped === true`: voice held, `:266` cross-steals)
- hoist mutant → test FAILS (`expected false to be true`: idle tick freed the voice,
  `:266` never fires, `zap` sounds alongside `boom` — two voices)
- reverted → PASSES again; `git diff --stat src/shared/audio.ts` empty.

Why the existing battery is blind to this mutant (so the test is non-redundant):
- **jt9-52 B1** (natural countdown-to-zero release) — a voice that started with
  `voiceFrames > 0` releases at zero under BOTH forms, so B1 cannot distinguish the hoist.
- **ZEROWIN Mutant-C** (`:266` restrictor) — never calls `tick()`, so the mutated line
  is never executed. jt9-53's added idle `tick()` is the discriminator.

### Rule Coverage

| Rule (TS lang-review) | Test / evidence | Status |
|------|---------|--------|
| #14/#15 guard must be mutation-tested — delete/alter the mechanism, require red | the mutation proof above (apply hoist → red, revert → green) | satisfied |
| #18 test must fail on a broken implementation (not pass regardless) | mutant flips the discriminating `zap.stopped` assertion `true`→`false` | satisfied |
| #18 helpers must not be reimplemented / one-concept-one-helper | REUSES existing `mkLoadedEngine`, `created`, and the `ZEROWIN` manifest — no new scaffolding | satisfied |
| vacuous-assertion self-check | test has premise (`zap` started) + control (`boom` started → `:266` evaluated) + discriminator (`zap.stopped`); all `.toBe(...)` on real values; no `let _=`, no `assert(true)` | clean |

**Rules checked:** 3 of 3 applicable lang-review rules (the rest govern production-code
design — validated constructors, exhaustiveness, etc. — and do not apply to a one-test
guard change). **Self-check:** 0 vacuous tests found.

**Handoff:** → Dev (Loki Silvertongue) for GREEN. GREEN is ALREADY SATISFIED — the
production code is correct and needs NO change (latent guard). Dev's role: confirm the
guard passes, re-run the mutation proof if desired, and hand to Reviewer. Do NOT
"implement" anything against `src/shared/audio.ts`; any edit there would be a regression,
not the story.

## Dev Assessment

**Implementation Complete:** Yes — with ZERO production code change (correct for a latent
guard; see Design Deviations → Dev).

**Files Changed:**
- `src/shared/tests/audio-voice-release.test.ts` — TEA's guard test (commit `118b8847`),
  unchanged by Dev.
- `sprint/context/context-story-jt9-53.md` — story context committed (`47205f52`).
- `src/shared/audio.ts` — **NOT changed** (correct code; touched only transiently for the
  mutation proof, reverted; `git diff --stat` empty).

**Independent verification (Dev kept the guard honest):**
- Target test PASSES on shipped code.
- Re-applied the verbatim hoist mutant to `tick()` (`git diff` confirmed the intended
  site) → test FAILS (`expected false to be true` on `zap.stopped`) → `git checkout --`
  revert → test PASSES again; `audio.ts` clean. The guard is non-vacuous.

**Tests:** shared project **561/561 passing (GREEN)**, `npm run lint` clean.
**Branch:** `feat/jt9-53-pin-tick-idle-zero-window-voice` (pushed — 2 commits: test + context).

**Note for finish:** orphaned pre-existing jt9-51/pm1 bookkeeping was stashed to keep the
tree clean; see the blocking Delivery Finding. Not a jt9-53 code concern.

**Handoff:** → Reviewer (Heimdall) for review.

## Subagent Results

Only `preflight` is enabled in `workflow.reviewer_subagents`; the other 8 specialists are
disabled via settings, so the Reviewer carries the adversarial load directly (mutation
battery below).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (561/561 pass, lint clean, 0 smells, diff 2 files/85 ins) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's mutation battery |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered by Reviewer's prose-claim verification |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (no security surface: test + markdown only) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — covered by Rule Compliance below |

**All received:** Yes (1 enabled returned clean; 8 disabled via settings)
**Total findings:** 0 confirmed defects, 0 dismissed, 2 non-blocking notes deferred to finish
(develop-moved rebase + the pre-existing stash — both in Delivery Findings)

## Reviewer Assessment

**Verdict:** APPROVED

**Story shape:** latent-mutant guard (jt9-6/jt9-35/jt9-52 family). Diff is test-only —
one `it()` in a new `jt9-53` describe block plus story context. `src/shared/audio.ts` is
byte-unchanged; the shipped `tick()` is already faithful, so the correct deliverable is a
NON-VACUOUS guard, not a code change. My job reduces to: is the guard real, precisely
scoped, and honestly documented?

### Mutation battery (I ran it myself — specialists disabled)

Applied each mutant to `audio.ts`, ran the new test, verified the site via `git diff`,
reverted with `git checkout --` (source clean afterward, full suite 561/561):

| Mutant | Site | New test | Verdict meaning |
|--------|------|----------|-----------------|
| M1 — HOIST `:326` release out of the `voiceFrames > 0` block | `tick()` | **FAILS** (`zap.stopped` `true`→`false`) | the guard CATCHES the exact mutant the story names ✓ |
| M2 — empty `tick()` body (no-op) | `tick()` | PASSES | not over-broad: a zero-window tick is legitimately a no-op; the test forbids only RELEASE, not inaction ✓ |
| M3 — delete `:326` release entirely (jt9-52 B1's mutant) | `tick()` | PASSES | orthogonal to B1: the zero-window path never runs `:326`, so this guard correctly does not double-own B1's coverage ✓ |

M1 is the decisive one and it reddens; M2/M3 confirm the assertion is scoped to the
hoist and nothing else. The guard is non-vacuous AND non-redundant.

### Observations (≥5, no rubber-stamp)

- [VERIFIED] The guard catches the target mutant — evidence: M1 above flips
  `created.sources[0].stopped` to `false`; on shipped code it is `true` because
  `audio.ts:266` cross-steals the held voice. Complies with lang-review #14/#15
  (mechanism mutation-tested) and #18 (fails on a broken impl).
- [VERIFIED] Assertion precisely scoped — evidence: M2/M3 leave the test green, proving
  it does not over-constrain `tick()` or poach B1's `:326`-deletion coverage.
- [VERIFIED] Prose citations accurate — evidence: `:266` is the cross-channel steal
  (`audio.ts:266`, `voiceChannel !== null && voiceChannel !== channel`); `:324-326` is
  the tick block with `:326` the release. Both match the test's comment verbatim. No
  token-vs-claim drift (lang-review #15/#17).
- [VERIFIED] The "latent today" claim is TRUE, not decorative — evidence:
  `plugins/joust/src/shell/audio-manifest.ts:604-609` throws on
  `!Number.isInteger(frames) || frames <= 0`, and ROM cues are bake-guarded by
  `!(frames > 0)` — so no shipped joust cue can present the `voiceFrames 0 + voiceChannel set`
  precondition. The defect is genuinely unreachable in production; the guard is a
  regression net, correctly filed non-blocking MINOR.
- [VERIFIED] Test premise is real, not fixture-echoed — evidence: `ZEROWIN` gives `zap`
  a priority (5) but NO `frameDurations` entry (`audio-voice-release.test.ts:336-342`),
  which is exactly the `voiceFrames ?? 0` → 0 path in `audio.ts:288`. The premise
  (`zap` started) and control (`boom` started → `:266` evaluated) are asserted before the
  discriminator, so a false-green from `boom` never starting is caught.
- [VERIFIED] No scaffolding duplication — evidence: reuses `mkLoadedEngine`, `created`,
  `startedSources`, and the `ZEROWIN` const already in the file; adds only one `it()`.
  No new manifest, no reimplemented helper (lang-review #18 one-concept-one-helper).
- [VERIFIED] No count-guard breakage — evidence: preflight full suite 561/561, and no
  orchestrator/README guard references this file (grep clean during RED). One `it()` added
  to an existing file → no test-file census shift.
- [LOW] The describe title and comment are long, but consistent with the file's
  established jt9-6/jt9-35/jt9-52 house style (each mutant documented in prose). Not a defect.

### Rule Compliance (lang-review/typescript — enumerated against the diff)

The diff is one test + one markdown file; production-code rules (validated constructors,
`#[non_exhaustive]`, `??` vs `||`, DOM guards) have no governed instances here. Applicable
rules, each checked exhaustively against the single new test:

| Rule | Instances in diff | Judgment |
|------|-------------------|----------|
| #14/#15 guard must be mutation-tested; assert count/value, not a token | the 1 new `it()` | COMPLIANT — mutation battery M1 reddens; asserts `.stopped`/`.started` booleans, not source text |
| #18 fails-by-passing / test apparatus honest | the 1 new `it()` | COMPLIANT — M1 proves it can distinguish correct from broken; helpers reused not reimplemented |
| #15/#17 comment/citation matches the mechanism it cites | the block comment | COMPLIANT — `:266`/`:326`/joust `framesFor` all verified against current source |
| vacuous-assertion ban | the 1 new `it()` | COMPLIANT — 3 real `.toBe(...)` assertions, premise+control+discriminator, no `let _=`/`assert(true)` |

### Devil's Advocate

Let me try to break this. **Claim 1: the test is vacuous — it passes on shipped code, so
maybe it would pass on anything.** Refuted by M1: hoisting the release reddens it, so the
green is causally tied to the held voice, not to nothing. **Claim 2: it's redundant with
B1/Mutant-C, adding noise not coverage.** Refuted by M3 (B1's delete-`:326` mutant leaves
it green → not B1's coverage) and by the fact that Mutant-C never ticks (so it cannot see a
tick-path mutant at all). The added idle `tick()` is the unique discriminator. **Claim 3:
the "latent" framing is an excuse to ship an unreachable test.** Refuted by reading joust:
`framesFor` throws on non-positive frames, so the precondition truly cannot arise in a
shipped cabinet — but "unreachable today" is exactly why a guard is warranted: cp6-3 made
jt9-6's identically-latent shape LIVE, so a future cabinet arbitrating a duration-less cue
is a real risk, and this pins the behaviour before then. **Claim 4: over-broad assertion
could mask a different regression.** Refuted by M2: an empty `tick()` (which would be a real
regression for NON-zero windows, caught by B1) passes THIS test — correct, because this test
is deliberately scoped to the zero-window release, and B1 owns the decrement path. The
division of labour is clean. **Claim 5: hidden production risk in the stash.** The stashed
material is pre-existing sprint bookkeeping, not code; `audio.ts` and all `src/` are
byte-unchanged. The only real residue is process (SM must unstash at finish), already filed
blocking. I cannot find a code defect. The green is earned.

**Data flow traced:** `ZEROWIN.zap` (no `frameDurations`) → `startSource` sets
`voiceFrames = 0`, `voiceChannel='v'` (`audio.ts:286-290`) → idle `tick()` (`:323-328`)
leaves it held (guard `voiceFrames > 0` false) → `play('boom')` accepted (`:245` refuse
needs `voiceFrames > 0`) → cross-steal `:266` stops `zap`. One voice. Safe.

**Handoff:** To SM for finish-story. Note the two non-blocking finish-time items (develop
moved → rebase+re-measure; pre-existing stash to unstash) in Delivery Findings.