---
story_id: "ml10-5"
jira_key: "ml10-5"
epic: "ml10"
workflow: "tdd"
---
# Story ml10-5: Harden pointer-lock test coverage

## Story Details
- **ID:** ml10-5
- **Jira Key:** ml10-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** none
- **PR:** https://github.com/slabgorb/arcade/pull/444

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-16T07:30:45Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-16T06:59:14Z | 2026-08-16T07:02:24Z | 3m 10s |
| red | 2026-08-16T07:02:24Z | 2026-08-16T07:18:49Z | 16m 25s |
| green | 2026-08-16T07:18:49Z | 2026-08-16T07:21:13Z | 2m 24s |
| review | 2026-08-16T07:21:13Z | 2026-08-16T07:30:45Z | 9m 32s |
| finish | 2026-08-16T07:30:45Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

### TEA (test design)
- **Gap** (blocking): deliverable #2's RED behavioural pin needs a `window.__trackball`
  observability tap in `main.ts` — GREEN must add it. Affects `plugins/millipede/src/main.ts`
  (after `const { dh, dv } = mouse.sample()` at ~line 260, add
  `;(window as unknown as { __trackball?: { dh: number; dv: number } }).__trackball = { dh, dv }`,
  mirroring the existing `window.__sim` tap at ~line 276). Until then
  `tests/pointer-lock-reset-on-exit.test.ts` is RED (`lastTrackball()` is `undefined`).
  *Found by TEA during test design.*
- **Improvement** (non-blocking): once the tap lands, the verify phase should re-confirm
  #2 KILLS the reset-removal mutant — I proved it by hand (tap present + onExit mutated to
  `() => {}` reddens the pin; the ml10-4 source-regex `.reset(` pin does not). Affects
  `plugins/millipede/tests/pointer-lock-reset-on-exit.test.ts` (re-run under mutation in verify).
  *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): TEA's mutation-kill for #2 is now CONFIRMED against the
  real (committed) tap, not just a simulated one — with `main.ts` on `5efce570`, mutating
  onExit to `() => {}` reddens `plugins/millipede/tests/pointer-lock-reset-on-exit.test.ts`
  and restoring it greens again. The verify-phase re-check TEA flagged is discharged.
  *Found by Dev during implementation.*
- No other upstream findings during implementation.

### Reviewer (code review)
- **Improvement** (non-blocking): deliverable #1's source-read pin
  (`pointer-lock.test.ts:443`, regex `/createPointerLock\([\s\S]*?console\.warn\(/`) is
  FILE-scoped, not CALL-scoped — it kills the story's named mutant (delete the 4th arg;
  verified) but a compound RELOCATION mutant (delete the 4th arg AND add any unrelated
  `console.warn` elsewhere in `main.ts`) false-passes it. I reproduced the false-pass.
  Affects `plugins/millipede/tests/pointer-lock.test.ts` (tighten #1 to call-scoped or,
  better, convert it to a behavioural pin that forces a rejected requestPointerLock and
  asserts `console.warn` fired — the story sanctioned "behavioural/source"). **Recommend a
  follow-up story (ml10-6-class) per the epic's "reviewer files follow-ups" model** — the
  named AC is met, so this does not block ml10-5. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

### TEA (test design)
- **#2's behavioural observation requires a small production tap, not test-only wiring**
  - Spec source: context-story-ml10-5.md, deliverable #2 ("add a boot-harness behavioural
    test for the R5 onExit->mouse.reset() reset-on-exit")
  - Spec text: the deliverable is framed as a test-only addition
  - Implementation: the pin observes the drained trackball via a new `window.__trackball`
    tap in `main.ts` (GREEN work), because the mouse adapter is internal to `main.ts` and
    the reset's effect is invisible in attract mode; player-movement observation would
    couple the pin to `stepPlayer`/TBLMT clamping and play-phase entry timing
  - Rationale: mirrors the existing `window.__sim` observability tap (established idiom,
    reuse-first per the epic); phase-independent and robust; gives a genuine RED→GREEN
  - Severity: minor
  - Forward impact: GREEN adds one line to `main.ts`; the story is no longer strictly
    test-only. Recorded so the reviewer sees the production touch was deliberate.
- **#1 pinned by source-read, not behaviourally** — the story sanctioned "behavioural/source"
  for #1, so this is within spec (noted for completeness, not a deviation): a source-read
  pin reddens on the exact named mutant (delete the console.warn 4th arg), verified.

### Dev (implementation)
- No deviations from spec. GREEN was exactly the one-line `window.__trackball` tap TEA's
  blocking Delivery Finding specified — mirrored the existing `window.__sim` idiom, added
  nothing else.

### Reviewer (audit)
- **TEA deviation "#2's behavioural observation requires a small production tap"** → ✓
  ACCEPTED by Reviewer: the tap is a byte-for-byte mirror of the sanctioned `window.__sim`
  tap (`main.ts:279`), numeric-only, in shell code, no core/shell violation; security
  subagent ruled it clean and rule-checker ruled the double-cast compliant by the
  established-idiom carve-out. Sound.
- **TEA note "#1 pinned by source-read, not behaviourally"** → ✓ ACCEPTED as within spec
  (the story text literally sanctions "behavioural/source" for #1). Reviewer's own audit
  found the source-read form is evadable by a relocation mutant (see the Delivery Finding);
  that is a non-blocking robustness follow-up, not a spec violation — the source-read
  choice itself was allowed.
- Dev logged no deviations; audit confirms GREEN was exactly the one specified tap line —
  nothing undocumented diverged.

## Sm Assessment

**Story:** ml10-5 — Harden ml10-4 pointer-lock test coverage (millipede, 1pt, p3, tdd/phased).

**Contention: clear.** Sibling probes at setup — `git fetch --prune` + `git branch -r | grep ml10-5` = no branch; session sweep across `a-*` checkouts shows only a-3 on ml10-3 (different story, no file overlap with the pointer-lock seam). Merge gate clean (no open arcade PRs).

**Premise verified — all three deliverables confirmed present in the tree** (so no correction block needed; the story is sound, not stale):
1. `plugins/millipede/src/main.ts:67` — the `(reason) => console.warn('millipede: pointer lock request rejected', reason)` onReject sink is the 4th wiring arg; deleting it currently ships green (dead-wiring class to pin).
2. `plugins/millipede/src/main.ts:66` — `() => mouse.reset()` onExit reset; only source-regex pinned today, needs a boot-harness behavioural test.
3. `plugins/millipede/tests/pointer-lock.test.ts:169` — prose cites `(main.ts:100)` for the `dv += movementY` sign, but that behaviour lives at `plugins/millipede/src/shell/input.ts:51` `onMouseMove`; repoint the citation there.

**ACs:** epic YAML records none for ml10-5 (spec lives in the title). Left the context's AC section as "TEA to define during RED" and enriched the context with a **Verified Source Anchors** block carrying the three confirmed file:line facts so TEA works from measured ground, not re-derivation.

**Claim pushed:** epic-YAML `in_progress` stamp (surgical — only ml10-5's status) + context committed on `feat/ml10-5-harden-pointer-lock-test-coverage`, branch pushed so the sibling probe lights up.

**Handoff → TEA (Leeloo)** for RED: write pins for deliverables 1 & 2 (deletion of the console.warn 4th-arg AND a mutated exit callback must each redden) and make the #3 citation repoint. Out of scope: any behavioural change to the pointer-lock wiring itself.

## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — three test-hardening deliverables written; this is a reviewer-filed
mutation-coverage follow-up (the ml10 production wiring is already correct), so RED = one
genuine failing behavioural test (#2) plus two mutation-coverage pins proven by hand.

**Test Files:**
- `plugins/millipede/tests/pointer-lock-reset-on-exit.test.ts` (NEW) — deliverable #2:
  boot-harness BEHAVIOURAL pin that the booted `main.ts` wires R5 onExit → `mouse.reset()`.
  **FAILS now** (the genuine RED): observes the drained trackball via `window.__trackball`,
  a tap GREEN must add. Proven non-vacuous: with the tap it passes, and mutating onExit to
  `() => {}` reddens it (the ml10-4 `.reset(` source-regex does **not** catch that).
- `plugins/millipede/tests/pointer-lock.test.ts` (EDIT) — deliverable #1 (source-read pin
  that `main.ts` wires the `console.warn` onReject sink as the createPointerLock 4th arg;
  reddens on deleting that arg — verified ONLY this pin fails, the other 27 survive) and
  deliverable #3 (repointed the stale `main.ts:100` citation at :169 to
  `shell/input.ts:57 onMouseMove`, where `dv += movementY` lives).
- `plugins/millipede/tests/helpers/boot-shell.ts` (EDIT) — harness gains
  `setLockAcquired()` (drives `document.pointerLockElement` for the acquire/exit path) and
  `lastTrackball()` (reads the `window.__trackball` tap). Consumed by 3 boot files, all green.

**Tests Written:** 2 new pins (#1, #2) + 1 citation repoint (#3), across 3 files.
**Status:** RED — millipede project: **1 failed / 1381 passed**; the single failure is #2
(awaiting the GREEN tap). Repo-wide `tsc --noEmit` clean.

### Rule Coverage

Language: TypeScript. `.pennyfarthing/gates/lang-review/typescript.md` — this is a
test-hardening chore (no new production types/functions), so the applicable checks are
test-quality ones:

| Rule | Test(s) | Status |
|------|---------|--------|
| Meaningful assertion (no vacuous pass) | all 3 pins assert concrete values (`toEqual`, `toMatch`) | #2 failing (RED), #1/#3 green |
| Mutation-kill (a guard must redden on its mutant) | #1 (delete 4th arg), #2 (onExit → `() => {}`) | both proven to redden by hand |
| No stale citations in touched tests | #3 repoints `main.ts:100` → `shell/input.ts:57 onMouseMove` | fixed |

**Rules checked:** 3 of 3 applicable test-quality checks have coverage.
**Self-check:** 0 vacuous tests — each pin was mutation-tested (see Delivery Findings /
Design Deviations); `lastTrackball()`/`toEqual` guards against an always-`undefined` pass
because the honest-tree-with-tap value is a real `{dh:0,dv:0}`.

**Handoff:** To Dev (Korben) for GREEN — add the one-line `window.__trackball` tap to
`main.ts` (see the blocking Delivery Finding); that turns #2 green with no other change.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/millipede/src/main.ts` — one line: a `window.__trackball` observability tap
  right after `const { dh, dv } = mouse.sample()`, mirroring the existing `window.__sim`
  tap. This is the entire GREEN — the R5/onReject wiring itself was already correct (this
  is a test-hardening follow-up), so no behaviour changed.

**Tests:** 1382/1382 passing (GREEN) — full millipede vitest project. `tsc --noEmit` clean.
The formerly-RED `tests/pointer-lock-reset-on-exit.test.ts` now passes, and its mutation-kill
is confirmed against the committed tap (onExit → `() => {}` reddens it; restore greens it).

**Branch:** `feat/ml10-5-harden-pointer-lock-test-coverage` (pushed → `5efce570`).

**Handoff:** To Reviewer (Zorg) for review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | confirmed 0, dismissed 0, deferred 0 — 1382/1382, tsc clean, 0 smells |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | N/A — Disabled via settings (hand-covered: no new branches; tap is unconditional per-frame) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | N/A — Disabled via settings (hand-covered: no swallowed errors; harness emit THROWS on unwired target) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | N/A — Disabled via settings (hand-covered myself: #2 non-vacuous by mutation, #1 evasion found) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | N/A — Disabled via settings (hand-covered myself: #3 citation verified accurate) |
| 6 | reviewer-type-design | No | Skipped | disabled | N/A — Disabled via settings (hand-covered: double-cast mirrors __sim; `unknown` return forces narrowing) |
| 7 | reviewer-security | Yes | clean | none | confirmed 0 — tap numeric-only, no DOM sink, no core/shell violation |
| 8 | reviewer-simplifier | No | Skipped | disabled | N/A — Disabled via settings (hand-covered: tap allocates a tiny {dh,dv}/frame — negligible, Low) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rules #15/#25, same instance) | confirmed 1 (Medium), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned: preflight clean, security clean, rule-checker 1 finding; 6 disabled pre-filled)
**Total findings:** 1 confirmed (Medium, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The change is small and correct: a one-line production observability tap plus three
test-hardening deliverables. All mechanical checks are green (preflight: 1382/1382,
tsc --noEmit clean, 0 smells) and no Critical or High issue exists. The single confirmed
finding is a Medium test-robustness gap in deliverable #1 that does NOT block, because #1's
*named* acceptance mutant is verifiably killed.

**Observations (8):**

- [RULE] [MEDIUM] deliverable #1's source-read pin at `pointer-lock.test.ts:443` is
  FILE-scoped (`/createPointerLock\([\s\S]*?console\.warn\(/` over the whole stripped
  `main.ts`), so it verifies token ORDER, not 4th-argument containment. CONFIRMED and
  EMPIRICALLY VERIFIED: I applied the relocation mutant (delete the 4th arg + add an
  unrelated `console.warn`) and the pin false-passed. Non-blocking — the story's named
  mutant (pure deletion) IS killed (I reproduced that too: only this pin reddens). Routed
  as a follow-up (Delivery Findings).
- [TEST] [VERIFIED] deliverable #2 (`pointer-lock-reset-on-exit.test.ts`) is non-vacuous:
  it drives the REAL booted `main.ts` + real createPointerLock/createMouseAdapter, asserts
  an exact `{dh:0,dv:0}` (≠ the pushed `{200,120}`), and kills the reset-removal mutant —
  confirmed against the committed tap (`onExit → () => {}` reddens it; restore greens it).
  The harness `emit` THROWS on an unwired target (`boot-shell.ts:318`), so a silent-no-op
  mousemove cannot fake a pass.
- [DOC] [VERIFIED] deliverable #3's citation repoint is accurate — `shell/input.ts:57` is
  literally `dv += Number(e.movementY ?? 0)` (the vertical-sign line the comment describes),
  and the retired `main.ts:100` is `void pointerLock.request()` (genuinely not the mapping),
  so the stated reason for the repoint is true.
- [SEC] [VERIFIED] the `window.__trackball` tap (`main.ts:263`) is benign — two numbers, no
  DOM sink, no eval/innerHTML; exposes strictly less than the pre-existing `window.__sim`
  tap (full GameState). No backend/auth/tenancy in this repo. Security subagent: clean.
- [TYPE] [VERIFIED] the double-cast `as unknown as { __trackball?: {...} }` is a byte-for-byte
  mirror of `window.__sim` (`main.ts:279`); target shape matches the real `MouseDelta`.
  `lastTrackball(): unknown` returns `unknown` (not `any`), forcing callers to narrow.
  Rule-checker ruled it compliant by the established-idiom carve-out.
- [SIMPLE] [LOW] the tap builds a fresh `{dh,dv}` object every frame (~60/s) — negligible
  GC, matches the `__sim`-adjacent write pattern; not worth changing.
- [EDGE] [VERIFIED] the tap runs UNCONDITIONALLY (main.ts:263, before `runFixedSteps`), and
  `mouse.sample()` is likewise outside the accumulator, so `frame(16)` updates the tap even
  when `elapsed` folds to zero sub-steps — no boundary where the observable goes stale.
- [SILENT] [VERIFIED] no swallowed failures introduced: the harness surfaces a mis-targeted
  emit as a thrown error, and the only production line is a plain assignment.

### Rule Compliance (TS lang-review + CLAUDE.md core/shell)

- Rule 1 (type-safety escapes): the `as unknown as` double-cast at `main.ts:263` and in
  `boot-shell.ts` `lastTrackball` — COMPLIANT by the `window.__sim` established-idiom
  precedent; target types are real, not fabricated.
- Rule 4 (null/undefined): `const {dh,dv}` from a non-optional `MouseDelta`, and
  `lastTrackball(): unknown` documented as possibly-`undefined` and handled by `toEqual` —
  COMPLIANT.
- Rule 8/15/18/25 (test quality / source-text guards): #2 exercises real code with an
  exact-value assertion (COMPLIANT); #1 matched rules 15 & 25 — the one confirmed finding.
- CLAUDE.md core/shell boundary: no `plugins/millipede/src/core/` file touched; the tap is
  in `main.ts` (shell) — COMPLIANT (rule-checker enumerated all 4 files).

### Devil's Advocate

Argue it is broken. First: the story exists to close a dead-wiring gap, yet its own #1 pin
has a (narrower) dead-wiring evasion — is that not the pin certifying itself? It is a real
weakness, which is why it is a Medium finding and a filed follow-up; but the *named* mutant
is killed, so the deliverable is met, not hollow. Second: the tap pollutes the global
`window` namespace and allocates every frame — could a stressed GC or a colliding global
break play? No: `__sim` already sets this precedent at higher cost, and a per-frame
two-number object is trivially collected; nothing reads `__trackball` except tests. Third:
could #2 pass vacuously if `setLockAcquired`/`emit` silently did nothing? No — `emit`
throws on an unwired target, and the assertion compares against a value (`{0,0}`) that
differs from the pushed `{200,120}`, so a dead harness fails loudly rather than green.
Fourth: does #2 depend on external mutation proof for its non-vacuity, making it
un-self-evidently strong? Partly — but it drives real production code end-to-end and the
mutation-kill is documented and reproduced, which is the repo's accepted standard. Fifth:
could a future refactor that renames `MouseDelta` or moves `mouse.sample()` silently break
the tap? tsc would catch a type break; a moved sample point would be caught by #2 going
red. None of these rise to Critical/High. The one genuine defect is the #1 regex scope,
already captured and routed.

**Data flow traced:** mouse `movementX/Y` (document) → `createMouseAdapter` accumulator →
`main.ts` `mouse.sample()` drain → `window.__trackball` tap → `shell.lastTrackball()` in
the R5 test. Safe: numeric-only, no sink, reset-on-exit clears it (the behaviour #2 pins).
**Pattern observed:** established `window.__sim` observability-tap idiom reused at `main.ts:263`.
**Error handling:** harness `emit` throws on unwired targets (`boot-shell.ts:318`) — no silent no-ops.

**Handoff:** To SM for finish-story.
## Impact Summary (SM, compiled at finish)

**Blocking findings: 0.** Story APPROVED in one review round; code merged to `develop` via
PR #444 (merge commit f98d19e5). Millipede vitest project 1382/1382; `tsc --noEmit` clean.

- **TEA's blocking Gap** (deliverable #2 needed a `window.__trackball` tap) → RESOLVED by Dev
  (`main.ts:263`, one line mirroring `window.__sim`). #2 now green; mutation-kill confirmed
  against the committed tap.
- **Deliverable #1** (onReject source-read pin) kills the named mutant (delete the 4th arg;
  verified). **Deliverable #3** (citation repoint to `shell/input.ts:57 onMouseMove`) verified.
- **One Medium, NON-BLOCKING finding** (Reviewer): #1's regex is file-scoped, so a contrived
  relocation mutant can evade it (the named mutant IS killed). **Recommended follow-up
  (ml10-6-class) — NOT yet filed**; do not read the preflight's "filed ml10-6" as done.

**Final state:** shipped and green on `develop`; zero blocking issues.
