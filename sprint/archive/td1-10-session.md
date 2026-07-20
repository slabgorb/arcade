---
story_id: "td1-10"
jira_key: "td1-10"
epic: "td1"
workflow: "tdd"
---
# Story td1-10: just test-all and build-all mask every game's failure but the last — just ci prints CI passed with six of seven red

## Story Details
- **ID:** td1-10
- **Jira Key:** td1-10
- **Workflow:** tdd
- **Repos:** .
- **Branch:** none (trunk-based orchestrator)

## Workflow Tracking
**Workflow:** tdd
**Phase:** setup
**Phase Started:** 2026-07-20T18:08:04.070650+00:00

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-20T18:08:04.070650+00:00 | - | - |

## Story Description

Found by the td1-8 TEA (2026-07-20) while writing the RED phase for the `serve` recipe, and independently reproduced by SM before filing. PRE-EXISTING, not created by td1-8. Filed separately rather than folded in, for the same reason td1-8 filed its own config-type-check finding out: td1-8 is a 2-point story that already carries a real behavioural fix, and a masked-exit-code defect in the CI gate deserves its own RED phase rather than a footnote.

**THE DEFECT** (justfile:28-33, and :126-127):

```
test-all:
    @for g in {{games}}; do echo "==> $g"; (cd {{root}}/$g && npm test); done
build-all:
    @for g in {{games}}; do echo "==> $g"; (cd {{root}}/$g && npm run build); done
ci: test-orchestrator test-all build-all
    @echo "CI passed!"
```

A `for` loop's exit status is the status of its LAST iteration. These recipe bodies are a single shell line with no `set -e` and no per-iteration status tracking, so every game's failure except the last is discarded.

**REPRODUCED** (exact shape of the recipe body, SM-verified 2026-07-20):
```
for g in a b c; do (exit 3 on a); done  -> exit 0    FIRST failure MASKED
for g in a b c; do (exit 3 on b); done  -> exit 0    MIDDLE failure MASKED
for g in a b c; do (exit 3 on c); done  -> exit 3    only the LAST propagates
```

`games := "tempest star-wars asteroids battlezone red-baron centipede joust"`, so ONLY joust's failure is ever visible. Six of the seven games can be fully red and `just ci` still prints "CI passed!".

**WHY p1:** this is strictly worse than td1-8's blast radius. td1-8 makes a dev-loop launcher look healthy; this makes a CI GATE report success. It is the same failure shape the whole td1 epic keeps circling — a check that cannot fail — sitting on the recipe most likely to be trusted as a release preflight. Note `just release` / `release-all` gate on each repo's own tests via scripts/release.mjs and do NOT route through `just ci`, so this is not believed to have shipped a broken release; confirm that during the fix rather than assuming it.

**SUGGESTED FIX:** track a failure flag per iteration, print a NAMED summary of which games failed, and exit non-zero if any did. Same discipline td1-8 lands for `serve` — a named summary line, not just a non-zero code. Consider whether test-all should fail fast or run all games and report the full set (the latter is more useful for a fleet sweep).

**Also worth checking while here:** `status`, `install-all` and any other `@for g in ...` recipe in the justfile share this shape. Sweep them all rather than fixing only the two named here.

## Acceptance Criteria
1. Every multi-repo for-loop recipe in the justfile propagates failure — a failing game in ANY position (first, middle, last) makes the recipe exit non-zero, proven for all three positions.
2. A failed sweep names which games failed rather than only exiting non-zero, and just ci cannot print CI passed when any game is red.
3. The all-green path still exits 0, so a fix that always fails cannot pass.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): the `status` recipe (justfile:37-38) is a third `@for g in {{games}}` sh one-liner sharing the exact masking shape, but its per-game command is `git -C .../$g status --short` (informational). AC1's literal "every multi-repo for-loop recipe" covers it; I did NOT author a hard RED for it because the story explicitly leaves it as "your call whether to fix for consistency." Dev/Reviewer: decide whether to sweep it. The reference pattern already lives in this justfile — the `pull` recipe (justfile:63-95). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): addressed — `status` was swept to the same accumulator pattern as test-all/build-all (see Design Deviations). No new upstream findings for another story. *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

No design deviations — tests are aimed exactly at the ACs, exercising the real `just` recipes.

### Dev (implementation)
- **`status` recipe fixed too, beyond what any test requires:** TEA left this as an
  explicit call for Dev. Fixed it for consistency — AC1 says "every multi-repo
  for-loop recipe" and `status` shares the exact masking shape (`@for` sh one-liner,
  no `set -e`). Its failure mode is rarer (a repo missing/not-a-checkout; a dirty repo
  still returns 0 from `git status --short`) and purely informational, but the fix is
  the same 3-line accumulator pattern already applied to test-all/build-all, so the
  inconsistency of leaving it unfixed seemed worse than the small added surface. No
  test exercises `status`; verified only via `just --list` parsing + full suite green.
- **Run-all-then-report kept, not fail-fast:** matches the `pull` recipe's existing
  idiom and is what the "multiple failures all named" test requires (AC2). A CI sweep
  is more useful reporting every red game than aborting at the first.

## TEA Assessment

**Tests Required:** Yes
**Reason:** The defect is a real behavioural bug in a CI gate; it deserves a behavioural RED phase, not a footnote.

**Test Files:**
- `tests/ci-sweep-masking.test.mjs` — drives the REAL `test-all` / `build-all` / `ci` recipe bodies (extracted verbatim from the justfile) through the REAL `just` binary against a throwaway tree of stub games, and asserts on the recipe's real exit status and printed summary. No test touches the real `{{games}}`; every fixture is a temp dir OUTSIDE the repo.

**Tests Written:** 13 tests covering all 3 ACs.
- AC1 (propagate failure in every position): test-all + build-all, each FIRST / MIDDLE / LAST → non-zero. (6)
- AC2 (name the failed games; ci cannot lie): test-all names one / names multiple-not-the-passing-one; build-all names one; ci with a red game exits non-zero AND suppresses "CI passed!". (4)
- AC3 (all-green still passes): test-all / build-all exit 0; ci exits 0 and prints "CI passed!". (3 — the guards that block an always-fail "fix".)

**RED result (measured):** full suite 287 tests, 279 pass, **8 fail** — all 8 are the new td1-10 tests; the 274 pre-existing tests are untouched. The 5 new GREEN tests are the pins/guards (last-position propagates today; all-green paths).

Failing (RED, the defect):
- test-all FIRST / MIDDLE masked → returns 0
- test-all names the failed game (single + multiple) — today no per-game summary
- build-all FIRST / MIDDLE masked → returns 0
- build-all names the failed game
- ci prints "CI passed!" and exits 0 while a game is red

**Anti-vacuity control (out-of-band probe, uncommitted):** REAL recipe → position/naming/ci tests RED; a REFERENCE fix (per-iteration failure flag + named summary + non-zero exit) → all GREEN; a STRAW-MAN that always exits 1 → the all-green guards RED. The suite is not passable by typing a string into the justfile, and a fix that always fails cannot pass.

**Recipe map (SM's, verified + corrected):**
- DEFECTIVE (RED tests target these): `test-all` (justfile:29), `build-all` (justfile:33) — `@for` sh one-liners, no set -e; `ci` (justfile:126) inherits.
- SHARES THE SHAPE, benign: `status` (justfile:38) — noted as a non-blocking finding.
- SAFE (verified): `deploy` (bash `set -euo`, non-backgrounded subshell), `release-all` (bash `set -euo`, direct node, aborts first failure). Correction: SM's "pull-all" is the `pull` recipe (justfile:63-95); it runs bash `set -uo` (NO -e) yet is SAFE because it tracks failures explicitly (`failed` accumulator + `exit 1`) — this is the reference pattern for the fix. `install-all` is a single `node` call, not a loop.

**Status:** RED (failing — ready for Dev)
**Handoff:** To Dev for implementation (`.session/td1-10-handoff-red.md`)

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `justfile` — `test-all` (was line 29), `build-all` (was line 33), and `status`
  (was line 38) converted from `@for ... ; done` sh one-liners to `#!/usr/bin/env
  bash` recipes matching the `pull` recipe's existing pattern: `set -uo pipefail`
  (no `-e`, so every iteration runs), a `failed` accumulator built with `if ! (...);
  then failed="$failed $g"; fi` per game, then `if [ -n "$failed" ]; then echo "!!
  <recipe> FAILED:$failed"; exit 1; fi` after the loop completes. `ci` (justfile:126)
  was NOT touched — it inherits correctness automatically once `just` aborts the
  dependency chain on a non-zero `test-all`/`build-all`.

**Decisions:**
- `status`: fixed too, for AC1-literal consistency. No test forces it; rationale
  logged in Design Deviations.
- Fail-fast vs run-all: kept run-all-then-report (matches `pull`; required by the
  "multiple failures all named" test).

**Tests:** 287/287 passing (GREEN). All 13 td1-10 tests green (5 pre-existing
guards + 8 formerly-RED). The pre-existing 274 are untouched.
**Branch:** none — trunk-based orchestrator, commit owned by SM per story instructions.

**Handoff:** To Reviewer
