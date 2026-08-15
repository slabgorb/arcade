---
story_id: "jt11-14"
jira_key: "jt11-14"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-14: High-score entry timeout survives a hidden tab: commit on pagehide/visibilitychange

## Story Details
- **ID:** jt11-14
- **Jira Key:** jt11-14
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** feat/jt11-14-highscore-timeout-pagehide-commit
- **PR:** #404 (code PR into develop — https://github.com/slabgorb/arcade/pull/404)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T09:59:20Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T09:17:33Z | 2026-08-15T09:19:30Z | 1m 57s |
| red | 2026-08-15T09:19:30Z | 2026-08-15T09:30:34Z | 11m 4s |
| green | 2026-08-15T09:30:34Z | 2026-08-15T09:36:01Z | 5m 27s |
| review | 2026-08-15T09:36:01Z | 2026-08-15T09:48:21Z | 12m 20s |
| red | 2026-08-15T09:48:21Z | 2026-08-15T09:51:57Z | 3m 36s |
| green | 2026-08-15T09:51:57Z | 2026-08-15T09:52:59Z | 1m 2s |
| review | 2026-08-15T09:52:59Z | 2026-08-15T09:59:20Z | 6m 21s |
| finish | 2026-08-15T09:59:20Z | - | - |

## Sm Assessment

**Story:** jt11-14 — High-score entry timeout survives a hidden tab: commit on pagehide/visibilitychange (1pt, p3, joust, tdd).

**Branch Strategy:** gitflow (feat/jt11-14-highscore-timeout-pagehide-commit)

**Premise verified against the current tree — description is CURRENT fact, no correction block needed:**
- `MAX_CATCHUP_SECONDS = 0.25` confirmed at `plugins/joust/src/main.ts:502` (used at :512 to clamp catch-up).
- Single write path confirmed: `commitHighScore(initials)` at `plugins/joust/src/main.ts:466-468` is the ONLY writer; it calls `commitEntry(...)` then `highScores.save(...)`. Committed from exactly two call sites (:544 confirm-flap, :547 timeout).
- `cabinet.mode === 'highscore'` confirmed as the real guard symbol in `plugins/joust/src/main.ts` (the highscore-entry block begins at :527). The description's phrasing is exact.
- The single-callsite invariant test the story must preserve is REAL: `plugins/joust/tests/highscore-entry-jt11-6-wiring.test.ts:304` asserts "one and only one highScores.save( call site". This invariant MUST survive.
- Current listeners: only a `keydown` listener exists (`main.ts:493`). No `pagehide`/`visibilitychange` listener exists yet — this story adds one.

**Background — ROM entry-timeout budget:**
- jt11-6 wired a 7680-tick budget (ROM: AMODE's 256 x PCNAP 30, JOUSTRV4.SRC:77-78 via TB12REV1.SRC:77-78)
- The budget is spent inside `pumpFrames`, driven by `requestAnimationFrame`
- `MAX_CATCHUP_SECONDS = 0.25` discards elapsed wall time during tab inactivity
- Therefore: countdown FREEZES while tab is hidden, never advances if tab is closed
- Fix: commit via `commitHighScore` on `pagehide` and/or `visibilitychange` to hidden events

**Derivation notes — No acceptance criteria in sprint YAML, TEA derives during RED from the description:**

1. **AC-1:** When the `pagehide` event fires (tab closed/navigated away) and `cabinet.mode === 'highscore'`, the current entry buffer is auto-committed via the same `commitHighScore(...)` helper as the timeout + confirm-flap paths
2. **AC-2:** When the `visibilitychange` event fires with `document.hidden === true` and `cabinet.mode === 'highscore'`, the current entry buffer is auto-committed via `commitHighScore(...)`
3. **AC-3:** The listener guard on `cabinet.mode === 'highscore'` prevents committing when entry is not active (guards against stale listener firing after screen exit)
4. **AC-4:** The invariant is preserved: `plugins/joust/tests/highscore-entry-jt11-6-wiring.test.ts:304` still asserts exactly one `highScores.save()` call site and one `commitEntry()` call site after this story ships
5. **AC-5:** A source-scan test confirms the listener wiring (pagehide + visibilitychange handler detection + guard test) and a mutation test proves the guard bites (removing `cabinet.mode === 'highscore'` guard reddens the test)

**Technical notes for TEA/Dev:**
- **Shell-only:** the listener is in main.ts (shell); core (sim.ts) must not learn about the document and continues counting ticks
- **Single-path invariant:** Do NOT add a second `highScores.save()` or `commitEntry()` call site; thread through the existing helper
- **Test model:** follow the jt11-6 pattern — source-scan on the pump/handler wiring + mutation guard proof
- **Listener scope:** guard on `cabinet.mode === 'highscore'` so the listener doesn't fire after the screen exits or during other modes

**Routing:** phased/tdd → next agent **tea** (RED).

## Delivery Findings

No upstream findings.

## Tea Assessment

**RED landed — commit `5c62139b`.** New file `plugins/joust/tests/highscore-entry-jt11-14-tab-hidden-wiring.test.ts`.
Suite state: `--project joust` → **12 failed | 3667 passed** (194 files, 1 failed file — mine only). `npm run lint` clean.

**Approach — the sanctioned jt11-6 seam test.** `main.ts` installs the whole cabinet on import (canvas,
RAF loop, keydown), so it is not unit-importable; jt11-6 pinned its pump seam by reading `main.ts` as
text and this file pins the listener seam the same way — a SOURCE-SCAN on the wiring plus a MUTATION that
proves the guard bites. All scans run over a **comment-stripped** copy (string literals kept) so a
`// addEventListener('pagehide')` note cannot spoof a match (checklist #15).

**Why BOTH events are required (not "and/or").** `pagehide` is the terminal close/navigate/discard signal
but does NOT fire on a plain desktop tab-switch where the tab stays alive; `visibilitychange`→hidden is
the tab-switch signal but is not the reliable close signal. The story names BOTH failure modes (freezes
when HIDDEN, never advances when CLOSED), so serving both takes both listeners. Recorded so a Dev who
ships only one knows the test is right, not over-strict.

**The load-bearing discipline (checklist #25).** The pump branch already contains
`cabinet.mode === 'highscore'`, so a whole-file positive anchor for the guard would stay GREEN under the
exact mutant this story must catch (delete the guard from the exit handler; the pump's copy still
satisfies the match). The guard assertion is therefore BOUNDED to the effective handler body, extracted
with a balanced-delimiter scanner that resolves one hop of delegation (so `('pagehide', commitOnExit)` and
`('visibilitychange', () => { if (hidden) commitOnExit() })` both fold the guard+commit into view). Folding
in `commitHighScore`'s own body is safe — it carries no guard, so it cannot mask a deleted one.

**Mutation proof (out-of-tree harness, delegated impl shape — each mutant reddens ONLY its target check):**
| Mutant | Reddens | Other checks |
|--------|---------|--------------|
| remove `cabinet.mode === 'highscore'` from exit commit | AC-3 guard-bites (both events) | unchanged |
| add `&& isEntryComplete(entry)` to exit commit | AC-3 unconditional (both events) — the jt11-6 mirror-mutant | unchanged |
| commit on every `visibilitychange` (drop hidden test) | AC-2 hidden-edge (visibilitychange) | unchanged |
A correct delegated GREEN passes all 14. Guards are non-vacuous and precisely targeted.

**Test map (14 tests):**
- **AC-1/AC-2 (RED):** both listeners installed; each handler commits via `commitHighScore` and never
  `highScores.save` directly; each pads the CURRENT buffer via `timeoutInitials(entry)` (persists a 0/2-letter
  walk-away, the point); each routes to `toAttract` (a returning tab can't re-commit); visibilitychange
  commits only when the document is HIDDEN (#14 — the "became hidden" edge).
- **AC-3 (RED, mutation):** each exit commit is guarded by `cabinet.mode === 'highscore'` (bounded) and is
  UNCONDITIONAL on completeness.
- **AC-4 (GREEN fence):** exactly one `highScores.save(` and one `commitEntry(` call site — the single
  persistence invariant jt11-6 pinned must survive the two new listeners.
- **AC-5 (GREEN fence):** no `src/core/` file references `document.`/`window.`/`visibilitychange`/`pagehide`/
  `localStorage`/`navigator` — the listener is shell-only; core keeps counting ticks and never learns about
  the document (the core/shell boundary rule).

**Note — README derived count.** Adding a test file bumps the `derivedTestFileCount()` guard in
`audio-seam-scope.test.ts`, so `README.md`'s `--project joust # N files` was moved 193→194 in the SAME
commit (checklist #20 — a number measured from an artifact the diff changes). Not a feature change.

### Rule Coverage (TS lang-review checklist)
| Check | How covered |
|-------|-------------|
| #15 source-text matches CLAIM not token; every guard mutation-tested | comment-stripped scans; each guard proven to redden under its mutant (table above) |
| #25 positive anchor bounded, not whole-file | guard match runs over the extracted handler body only — the pump's own guard is out of scope |
| #14 edge computed where every path is visible | visibilitychange commits on the "became hidden" edge (`visibilityState==='hidden'`/`document.hidden`), not on every change |
| #8 test quality (no vacuous assertions) | GREEN harness confirms all 14 satisfiable; no `let _=`, no always-true assertions; self-describing throws on the absent listener (tp1-8 idiom) |

**For Dev (Korben):** everything is already imported in `main.ts` — `commitHighScore`, `timeoutInitials`,
`toAttract`, `SEED`, plus the mutable `cabinet`/`entry`. The minimal GREEN: a `pagehide` listener and a
`visibilitychange`-to-hidden listener that, while `cabinet.mode === 'highscore'`, call
`commitHighScore(timeoutInitials(entry))` then `cabinet = toAttract(cabinet, SEED)` — a shared
`commitOnExit()` helper satisfies both and keeps the single-save invariant. Do NOT add a second
`highScores.save`/`commitEntry` site, do NOT gate the exit commit on `isEntryComplete`, and keep it all in
the shell (no `document` in core).

### TEA rework (round 2 — review reject)

**Fixed the [#15] polarity finding — commit `ab609bed`.** The `visibilitychange` "commits only when HIDDEN"
guard OR-ed a bare `document.hidden` / `'hidden'` alternative, matching on token PRESENCE — so the inversion
`!document.hidden` (commit on became-VISIBLE, the wrong edge) passed. Tightened to require the positive
`document.visibilityState === 'hidden'` comparison the shell uses, plus a negative that forbids the negated
forms (`!document.hidden`, `visibilityState !== 'hidden'`, `!(document.visibilityState…`, commit-on-`'visible'`).

**Mutation re-verified in-tree (serial, tree restored after each):**
| Mutant applied to main.ts | polarity test |
|---------------------------|---------------|
| `!document.hidden` (the reviewer's mutant) | RED (1 failed) |
| `document.visibilityState !== 'hidden'` | RED (1 failed) |
| drop the condition (commit unconditionally) | RED (1 failed) |
| shipped code (`=== 'hidden'`) | 14/14 GREEN |

Shipped code needs NO change — it was correct polarity all along; only the TEST was under-tight. Full joust
suite **3679/3679**, `npm run lint` clean. Honest limitation recorded in the test comment: a source-scan
cannot catch an else-branch inversion (control flow), which is the ceiling for this un-importable shell seam.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/joust/src/main.ts` — added `commitEntryOnExit()` (guarded by `cabinet.mode === 'highscore'`,
  commits `commitHighScore(timeoutInitials(entry))` then `toAttract`) plus a `pagehide` listener and a
  `visibilitychange`→hidden listener, both routing through it. Placed beside the existing keydown listener,
  where `cabinet`/`entry`/`commitHighScore`/`timeoutInitials`/`toAttract`/`SEED` are all in scope.
- `plugins/joust/tests/highscore-entry-jt11-14-tab-hidden-wiring.test.ts` — apparatus fix only (see deviation).

**How it maps to the ACs:** one shared helper commits the in-flight entry on BOTH the close signal (pagehide)
and the tab-hidden signal (visibilitychange→hidden), padded like the jt11-6 timeout so a walked-away
0/2-letter entry keeps its rank, and routes to attract so a returning tab cannot re-commit. Single-save
invariant untouched (still one `highScores.save(`, one `commitEntry(`). Core stays document-free.

**Tests:** 14/14 target file (GREEN). Full joust suite **3679/3679**; orchestrator **498/498**; `npm run lint` clean.
**Branch:** feat/jt11-14-highscore-timeout-pagehide-commit (pushed, commit `a5b82521`)

**Guards re-proven to bite after the apparatus fix** (out-of-tree harness, shipped shape — named
`commitEntryOnExit` identifier callback for pagehide, arrow for visibilitychange): removing the mode guard
reddens both AC-3 guard tests; adding `&& isEntryComplete` reddens both AC-3 unconditional tests; dropping
the visibilitychange hidden-check reddens AC-2 hidden. A correct GREEN passes all 14.

**Handoff:** To Reviewer.

### Dev rework (round 2 — review reject)

**No implementation change.** The reviewer's [#15] finding was a test-coverage gap, not a code defect —
the shipped `document.visibilityState === 'hidden'` guard was correct polarity all along. TEA tightened the
polarity assertion (commit `ab609bed`); nothing in `plugins/joust/src/main.ts` needed to change. Confirmed
GREEN at the pushed tip: joust **3679/3679**, `npm run lint` clean, working tree clean. No new deviations.

## Design Deviations

### Dev (implementation)
- **Test-apparatus fix: excluded `commitHighScore` from `effectiveHandler`'s delegation-folding**
  - Spec source: the tests TEA wrote — `highscore-entry-jt11-14-tab-hidden-wiring.test.ts`, `effectiveHandler` helper + the AC-1/AC-2 "must NOT persist directly" assertion
  - Spec text: the fold loop originally folded the bodies of ALL local helpers the handler calls, one hop
  - Implementation: added `FOLD_EXCLUDE = new Set(['commitHighScore'])`; the terminal single-save helper is no longer inlined into the extracted handler text (the handler still CALLS it — that token is at the call site, in view)
  - Rationale: with the idiomatic `addEventListener('pagehide', commitEntryOnExit)`, folding `commitHighScore`'s body pulled its own `highScores.save(` into the handler text and failed the handler's "does not persist directly" negative check — the apparatus contaminating its own assertion (TS checklist #18). The alternative — wrapping the listener in a pointless `() => commitEntryOnExit()` arrow purely to dodge the fold — would ship worse code to satisfy a buggy test. The fix strengthens the test (removes a false contamination) and weakens no guard: a save written DIRECTLY in the handler body is still caught, and AC-4 independently pins the one save site. All three mutation guards re-proven to bite after the change.
  - Severity: minor
  - Forward impact: none — the change is confined to a test helper; the ACs and their coverage are unchanged, and the single-save invariant is doubly guarded (AC-4 + the fixed negative check).

### Reviewer (audit)
- **Dev's `FOLD_EXCLUDE` test-apparatus fix** → ✓ ACCEPTED by Reviewer: sound. Independently confirmed by
  reviewer-rule-checker (#18): a mutant that bypasses `commitHighScore` and calls `highScores.save(` directly
  in the handler body is STILL caught — by both the negative "does not persist directly" assertion (the direct
  call sits in `body` before any folding) and AC-4's independent single-call-site count. The exclusion removes a
  false contamination without weakening any guard.
- **No undocumented source deviations.** The shipped code matches the story's prescription exactly: `pagehide`
  + `visibilitychange`→hidden listeners, guarded on `cabinet.mode === 'highscore'`, single `commitHighScore`
  commit path, padded via `timeoutInitials`, routed to attract, shell-only (no `src/core/` file touched).

## Delivery Findings

### Reviewer (code review)
- No upstream findings. (The one finding below is a rework of THIS story's own test, not an upstream issue.)

## Subagent Results

_Round 2 re-review (after the round-1 [#15] reject was fixed in commit `ab609bed`). Round-2 diff is
test-only — one tightened polarity assertion; no production code changed since round 1's clean passes._

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — lint clean, joust 3679/3679, orchestrator 498/498, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [SILENT]) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [TEST]) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [DOC]) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none | N/A — test-only diff, no production path touched |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | 0 (round-1 #15 now CLOSED) | confirmed 0 — fix verified, no new issue |

**All received:** Yes (3 enabled returned clean; 6 disabled via workflow.reviewer_subagents, each hand-covered below)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred (round-1's 1 finding is fixed and re-verified)

## Reviewer Assessment

**Verdict:** APPROVED

**Round history:** Round 1 REJECTED on one [MEDIUM][RULE][TEST][#15] finding — the `visibilitychange` "commits
only when HIDDEN" guard was TOKEN-anchored (its `document\.hidden` regex alternative matched on substring
presence, so the inversion `!document.hidden`, which commits on became-VISIBLE, passed all 14 tests). Round 2
(commit `ab609bed`, test-only) tightened it to require the positive `document.visibilityState === 'hidden'`
comparison and forbid the negated forms. **Fix re-verified by mutation, independently and by reviewer-rule-checker:**
`!document.hidden`, `document.visibilityState !== 'hidden'`, and drop-condition each now redden the polarity test;
the shipped (correct-polarity) code stays 14/14 green. No production code changed, so round-1's clean data-flow,
security and boundary conclusions still hold.

**Data flow traced:** keyboard keydown → `stepNameEntry` (`@shared/name-entry`, bounded `/^[a-zA-Z]$/`, capped
at 3) → `entry.initials` → on `pagehide` / `visibilitychange`-hidden while `cabinet.mode === 'highscore'`,
`commitEntryOnExit` → `commitHighScore(timeoutInitials(entry))` → `commitEntry` → `highScores.save` (localStorage).
Safe: no network/URL input path, buffer is length- and charset-bounded, the mode guard blocks committing in any
non-highscore mode. [SEC] clean both rounds.

**Pattern observed:** one shared guarded helper called from both lifecycle listeners — `plugins/joust/src/main.ts:511-520`.
Single edge-computation point (checklist #14); the `cabinet = toAttract(...)` inside the guard makes a
`pagehide` + `visibilitychange` double-fire idempotent (the 2nd call sees mode ≠ 'highscore' and no-ops). [EDGE] hand-covered.

**Error handling:** no new try/catch; the `highScores.save` storage exposure is unchanged from the pre-existing
timeout/confirm paths and already defended inside `@shared/highscore`. No new silent failure. [SILENT] hand-covered.

**Observations (≥5):**
- [VERIFIED][TEST] the round-1 finding is CLOSED — the polarity guard now bites: `!document.hidden` (the reviewer's mutant), `!== 'hidden'`, and drop-condition each redden the test; shipped code 14/14 green. [RULE] independently reproduced, tree restored clean.
- [VERIFIED] Single-persistence invariant holds — `highScores.save(` ×1 and `commitEntry(` ×1 (only sites); both listeners route through `commitHighScore`. Mutation-verified a direct-save bypass reddens the negative check + AC-4.
- [VERIFIED] core/shell boundary intact — no `src/core/` file touched; core grep for document/window/localStorage = 0; AC-5 fence enforces it. [SEC]+[RULE] concur.
- [VERIFIED][EDGE] `pagehide`+`visibilitychange` double-fire is idempotent — `toAttract` flips mode out of 'highscore' so the 2nd call no-ops (main.ts:513-514).
- [VERIFIED][TYPE] no type escapes — `commitEntryOnExit(): void` explicit return; `document.visibilityState === 'hidden'` is a type-safe `DocumentVisibilityState` compare; no `any`/casts/non-null.
- [VERIFIED][DOC] the round-2 test comment is accurate and honest — it discloses the source-scan ceiling (an else-branch inversion is beyond its reach) rather than overclaiming. [RULE] #17 verified the disclosed gap is real, not overclaimed.
- [VERIFIED][SIMPLE] minimal — two listeners + one helper; both events necessary (pagehide=close, visibilitychange=hidden). No over-engineering.

### Rule Compliance (TS lang-review checklist, mapped to the diff)
- **#15** (source-text matches the CLAIM; every guard mutation-tested): ✓ ALL guards now bite — mode guard, completeness, direct-save, drop-hidden-condition, AND polarity (the round-2 fix). Each mutation-verified red.
- **#25** (positive anchor BOUNDED, not whole-file): ✓ `effectiveHandler` slices the handler body + one folded hop; rule_checker confirmed no whole-file leakage.
- **#18** (apparatus fails-by-passing): ✓ `FOLD_EXCLUDE` sound; the round-2 tightening introduces no new fails-by-passing (all terms trace to source under test).
- **#17** (comment asserts an unrun mechanism): ✓ round-2 comment discloses the else-branch ceiling truthfully.
- **#14** (edge computed in one branch): ✓ single computation point shared by both listeners.
- **#20** (quantity from same-diff artifact): ✓ README 193→194 correct at HEAD.
- **#5 / #1 / #7**: ✓ no relative imports / type escapes / async issues.
- Non-blocking latent notes (carried, not fixed — out of scope for a 1-pt story): `stripComments` has no regex-literal awareness (unexercised — main.ts has no regex literals); the positive anchor is operand-order sensitive (a Yoda `'hidden' === …` would not match, but shipped code uses standard order). Neither is a defect today.

### Devil's Advocate
Argue it is still broken. First: the fix is test-only — did it actually change anything? Yes: I reinstated the
exact round-1 mutant (`!document.hidden`) against the real `main.ts` and the polarity test reddened, where before
it passed. The guard now bites. Second: is the tightened regex OVER-tight — does it false-reject correct code? No:
the shipped `document.visibilityState === 'hidden'` passes 14/14, and the negative clause only forbids negations
and a literal `'visible'`, none of which appear in correct code. Third, the real residual: a future editor could
still dodge the guard with an ELSE-branch inversion (`if (visibilityState === 'hidden') {} else commit()`) — the
positive anchor matches the token and the negative sees no `!`. This is a genuine ceiling of a source-scan on an
un-importable shell, and — crucially — the test now DISCLOSES it in a comment rather than pretending completeness.
That honesty is the right call for a 1-point story; a behavioural test would need main.ts to be import-refactored,
which is out of scope. Fourth: malicious surface? None — initials are charset/length bounded, no network, no eval.
Fifth: double-fire, storage-full, stale score? All handled (toAttract idempotence, shared-module try/catch, mode
guard blocks stale-score commits). The code is correct and the guard now keeps it correct against every realistic
regression. Zero defects.

**Handoff:** To SM for finish-story.
## Impact Summary

**Hand-compiled by SM at finish (the finish-preflight subagent was deliberately NOT spawned — for a
multi-round story it scrapes every round's Delivery Findings and can resurrect a CLOSED finding as a false
BLOCKING; the round-1 [#15] finding is fixed and re-verified, see below).**

**Blocking items: 0.** The single review finding (round-1 [MEDIUM][#15], visibilitychange polarity guard
token-anchored) was FIXED in round 2 (commit `ab609bed`) and independently re-verified by the reviewer and
by reviewer-rule-checker: `!document.hidden`, `document.visibilityState !== 'hidden'`, and drop-condition
each redden the tightened polarity test; the shipped (correct-polarity) code stays 14/14 green. Review
verdict: **APPROVED** (round 2). Do not re-open.

**What shipped (PR #404, merge commit `31d4e78c` into `develop`):**
- `plugins/joust/src/main.ts` (+20) — `commitEntryOnExit()` guarded by `cabinet.mode === 'highscore'`,
  committing the in-flight entry via the single `commitHighScore(timeoutInitials(entry))` path then routing
  to attract, wired to a `pagehide` listener and a `visibilitychange`→hidden listener. Fixes the
  frozen-countdown gap: a hidden or closed tab now persists a walked-away qualifying score instead of losing it.
- `plugins/joust/tests/highscore-entry-jt11-14-tab-hidden-wiring.test.ts` (new, 14 tests) — source-scan +
  mutation seam test; every guard mutation-verified to bite (mode, completeness, direct-save, drop-hidden,
  and the round-2 polarity pin).
- `plugins/joust/README.md` — derived test-file count 193→194.

**Verification at finish:** merged `develop` (tip `31d4e78c`) is green — joust **3679/3679**, orchestrator
**498/498**, `npm run lint` clean. `develop` fast-forwarded (no sibling race on jt11-14; a sibling's ml7-11
archive arrived in the same pull, unrelated).

**Deviations:** one, ACCEPTED — Dev's `FOLD_EXCLUDE` test-apparatus fix (excludes the terminal
`commitHighScore` helper from the effectiveHandler delegation-fold so it can't contaminate the "does not
persist directly" negative check); reviewer-rule-checker independently confirmed it hides no defect.

**Follow-ups / watch-items:** none blocking. Two non-blocking latent test-apparatus notes carried (not a
1-pt story's job): `stripComments` has no regex-literal awareness (unexercised — main.ts has no regex
literals); the positive polarity anchor is operand-order sensitive (Yoda form would not match; shipped code
uses standard order). A source-scan cannot catch an else-branch polarity inversion — the test discloses this
ceiling honestly rather than overclaiming.
