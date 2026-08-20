---
story_id: "pt1-5"
jira_key: "pt1-5"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-5: tempest: attract mode needs a 'play example' (auto-play demo) instead of just the wordmark

## Story Details
- **ID:** pt1-5
- **Jira Key:** pt1-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-5-attract-play-example
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T00:29:50Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T22:58:50Z | 2026-08-19T23:00:01Z | 1m 11s |
| red | 2026-08-19T23:00:01Z | 2026-08-19T23:47:31Z | 47m 30s |
| green | 2026-08-19T23:47:31Z | 2026-08-20T00:00:08Z | 12m 37s |
| review | 2026-08-20T00:00:08Z | 2026-08-20T00:17:01Z | 16m 53s |
| green | 2026-08-20T00:17:01Z | 2026-08-20T00:21:43Z | 4m 42s |
| review | 2026-08-20T00:21:43Z | 2026-08-20T00:29:50Z | 8m 7s |
| finish | 2026-08-20T00:29:50Z | - | - |

## Sm Assessment

Story is READY for RED. Setup clean: session + branch (`feat/pt1-5-attract-play-example`, pushed) created, hand-authored Architect context preserved (`context-story-pt1-5.md`, not regenerated). No sibling claim on the remote; merge gate clear (no open PRs). No Jira — story id is the key.

**Routing to TEA (RED phase).** This is a `tdd` phased story, 5 pts, p1. The context is unusually complete — Architect has already located the code (`plugins/tempest/src/core/sim.ts` demo core; `render.ts:1041-1047` suppression), the ROM authenticity source (three-page attract rotation), and the joust jt13-13 reuse template. TEA owns AC definition at RED; six candidate ACs are suggested in the context (§Acceptance Criteria).

**Decisions TEA must make consciously (flagged, not decided by SM):**
- The wave-clear gate (`sim.ts:1052`, no-op in attract) — keep authentic 1-life die-out, or make the demo wave-clearing (a core change). Context §Technical-Approach.3 asks for an explicit call either way.
- Citation stamps (`remediated_by: "pt1-5"`) belong ONLY on findings genuinely fixed; `ours` is frozen at audit `4232ed4` so edits won't redden the gate on their own.
- Accessibility outranks ROM here: no strobe (Decision B) — the logo rainbow already passes.

Do not regress the 4-2 F1 ghost-tube early-return; the demo scene draws only when `s.demoActive`, in the phosphor scene path.

## TEA Assessment

**Tests Required:** Yes
**Tests Written:** 35 tests across 4 files (1 helper), covering AC1/AC2/AC6 fully and
AC3–AC5 behaviourally. **Status:** RED — 23 failing across the 3 new suites; all 150
other tempest suites green; `tsc --noEmit` clean.

**Test Files:**
- `plugins/tempest/tests/helpers/pt1-5-attract-contract.ts` — lazy module-loader +
  types for the not-yet-built `core/attract-scheduler.ts` (non-literal dynamic import
  so `tsc` stays green in RED, joust tp1-8 idiom).
- `plugins/tempest/tests/core/pt1-5.attract-scheduler.test.ts` — the pure scheduler:
  page order `ladder → logo → demo`, dwell-boundary advance (magnitude, not ordering),
  wrap, leftover-frame carry, positive/finite dwells, purity (AST helper + source scan).
- `plugins/tempest/tests/core/pt1-5.attract-cycle.test.ts` — the scheduler on
  `GameState.attract`, driven in `stepGame`'s attract case: `demoActive` true only on
  the demo page, cleared on both leave-page and demo-death paths, fresh 1-life re-seed
  per cycle, rng-driven level, spinner-exit-to-start, start-to-select intact, determinism.
- `plugins/tempest/tests/shell/pt1-5.attract-demo-render.test.ts` — `render()` gates the
  scene on `s.demoActive` while preserving the 4-2 ghost-tube suppression for
  select/highscore/non-demo attract; wordmark chrome (rainbow/table/PRESS START) not lost.

### Rule Coverage (`.pennyfarthing/gates/lang-review/typescript.md`)

| Rule | Test(s) | Status |
|------|---------|--------|
| #14 edge computed in one branch | cycle: "edge is cleared on every exit (#14)" — leave-page AND death paths | failing |
| #15 source-text guard matches token not claim | render: `demoActive` anchored in a boolean expr, not a bare word | failing |
| #25 source guard scope = whole file | render: suppression window bounded by `render(`...`beginScene` | failing (mixed) |
| #27 gate waits for a thing never created in a mode | cycle: "demoActive tracks the demo page only (#27)" ladder/logo never run demo | failing |
| #29 ordering standing in for magnitude | scheduler: advance at exactly the dwell boundary + leftover carry; demo *plays* (spawns+fires) | failing |

**Rules checked:** 5 of 5 applicable lang-review rules have test coverage (the others —
React/JSX #6, async #7, input-validation #10, enums #3 — do not apply to this pure
sim + canvas change). **Self-check:** 0 vacuous tests; every new-behaviour assertion was
observed failing for the RIGHT reason (absent module / absent `s.attract` field / absent
`demoActive` gate), not a typo or import error.

**Handoff:** To Dev for implementation.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/tempest/src/core/attract-scheduler.ts` (new) — the pure page rotation
  (`ladder → logo → demo`, WRAP): `PAGE_ORDER`, `createAttract`, `stepAttract`,
  `dwellFor`. Joust attract-scheduler shape, minus the colour phase.
- `plugins/tempest/src/core/state.ts` — `GameState.attract: AttractState`, booted to
  `createAttract()` in `initialState`. `cloneState`'s `...s` carries it (immutable).
- `plugins/tempest/src/core/sim.ts` — the attract case drives the scheduler: seed a
  fresh 1-life demo only on the demo page; clear `demoActive` on the leave-page path
  AND the demo-death path (#14); real input rewinds to `createAttract()`.
- `plugins/tempest/src/shell/render.ts` — the framing suppression is now
  `(s.mode === 'attract' && !s.demoActive) || select || highscore`, so the demo page
  falls through to the phosphor scene path while the 4-2 ghost-tube fix still governs
  the other framing screens.

**Tests:** 47/47 pt1-5 passing; full tempest suite 1775/1775 (GREEN); `tsc` clean.
**Branch:** feat/pt1-5-attract-play-example (pushed, e96733e2)

**Self-review:** wired end-to-end (render consults `demoActive`, sim owns the demo
lifecycle, state seeds the scheduler); no new error paths needed (pure transforms);
AC1–AC6 covered by the RED suite, all green. **Minimal by design** — ladder/logo
render the existing attract chrome; no untested render code added.

**Handoff:** To Reviewer for code review.

### Dev rework (round 1)

Addressed all four Reviewer findings — every fix is in a test file; the shipping src
(attract-scheduler/state/sim/render) is unchanged from round 1 (Reviewer confirmed it
correct). Commit `30985312`.
- **#29 (High):** added `pt1-5.attract-cycle.test.ts` → "a SINGLE demo-page visit lasts
  long enough to spawn an enemy AND fire" — measures ONE uninterrupted demo-page visit
  instead of accumulating across many. **Mutation-verified:** `DEMO_DWELL_FRAMES=5` now
  reddens exactly this test (was green before).
- **#1:** removed the `as unknown as {...}` casts; direct `s.mode`/`s.attract.page`/
  `s.attract.framesOnPage` (GameState types them). `tsc` clean.
- **#17:** corrected the `sim.attract-demo.test.ts` header (page-model entry point).
- **#11:** `e instanceof Error ? e.message : String(e)` in the contract helper.

pt1-5 48/48 (was 47 + the new #29 test); full tempest suite green; `tsc` clean; tree clean.

**Handoff:** Back to Reviewer for re-review (round 1 rework).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (stepAttract negative-frames unreachable; render fall-through overlays all mode-gated) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (no swallowed errors; resetDemoToTitle on both exit paths) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer + rule-checker (#29 magnitude gap confirmed) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer + rule-checker (#17 stale header confirmed) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer + rule-checker (#1 double-cast confirmed) |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer (no over-engineering; scheduler mirrors fleet template) |
| 9 | reviewer-rule-checker | Yes | findings | 4 | confirmed 4, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned; 6 disabled via `workflow.reviewer_subagents`, domains assessed first-hand)
**Total findings:** 4 confirmed, 0 dismissed, 0 deferred
**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (a mutation probe left `'bogus'` in attract-scheduler.ts mid-run; restored via `git checkout`, re-audited CLEAN before conclusions)

## Reviewer Assessment

**Verdict:** REJECTED — 1 High + 3 Lower test-rigor findings; the shipping implementation is correct, the tests are not yet honest about the story's core defect.

### Devil's Advocate

Assume this is broken. The story's whole reason to exist is "the attract screen must show a *play example* instead of a frozen wordmark." What actually guarantees that? I traced it and the answer is uncomfortable: nothing pins the demo dwelling long enough to *be* a play example. `DEMO_DWELL_FRAMES = 1000` is a bare constant, and the one test named for the defect ("the demo VISIBLY PLAYS on its page") accumulates `sawEnemyWhileActive`/`firedWhileActive` booleans across an 8000-frame loop that spans *many* demo visits without ever resetting per visit — so a demo page that flickers on for 5 frames at a time still turns both booleans true after enough cycles. I proved it: `DEMO_DWELL_FRAMES=5` leaves all 25 pt1-5 tests green. A future edit that shrinks the dwell, or slows the first spawn, silently guts the feature and the suite stays green. That is the exact failure the story is supposed to be immune to. A confused maintainer reading the green suite would trust a guarantee that isn't there. Separately, a reader opening `sim.attract-demo.test.ts` hits a header still asserting the demo "seeds on the first idle step" — the very mechanism this commit *retired* — and will reason from a false premise. And the new cycle test reaches into `GameState` through `as unknown as {...}` double-casts that were load-bearing in RED (the field didn't exist yet) but are now vestigial and defeat the type system on fields this same commit typed — a stressed refactor that renames `attract.page` would not be caught by these tests because they've cast the type away. None of this breaks the running game today; all of it weakens the net that is supposed to keep it working tomorrow. In a codebase whose entire lang-review checklist is institutional memory of tests-that-pass-vacuously, shipping a vacuous test on the headline AC is the thing to send back.

### Findings

Dispatch coverage — `[SEC]` clean (security), `[RULE]` 4 findings (rule-checker); `[EDGE]` `[SILENT]` `[SIMPLE]` disabled, assessed by Reviewer → clean; `[TEST]` `[TYPE]` `[DOC]` disabled, corroborated by rule-checker + Reviewer (findings below).

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] `[RULE][TEST]` #29 | The "visibly plays" test is vacuous about the demo dwell magnitude — the story's core defect. It accumulates spawn/fire across many demo visits in one loop, never per visit; **mutation-verified by Reviewer**: `DEMO_DWELL_FRAMES=5` → all 25 pt1-5 tests green, including "the demo must spawn enemies while it plays". | `plugins/tempest/tests/core/pt1-5.attract-cycle.test.ts:102-127` (+ `attract-scheduler.ts:43`) | Pin a per-visit magnitude: assert that within N frames of the demo page starting the demo spawns an enemy AND fires, so shrinking `DEMO_DWELL_FRAMES` below "a real play example" reddens. |
| [MEDIUM] `[RULE][TYPE]` #1 | `(s as unknown as {...})` double-casts on `mode`, `attract.page`, `attract.framesOnPage` — vestigial now that `GameState` types `attract: AttractState` (this same commit). Defeats the type system on fields this diff added. | `plugins/tempest/tests/core/pt1-5.attract-cycle.test.ts:36,40,42` | Drop the casts; use direct `s.mode` / `s.attract.page` / `s.attract.framesOnPage` (typechecks cleanly — verified). |
| [LOW] `[RULE][DOC]` #17/#24 | File header still states the demo "seeds lazily on the first idle step" — the mechanism THIS commit retires — with only a distant acknowledgement 150 lines below. A reader hits the false premise first. | `plugins/tempest/tests/core/sim.attract-demo.test.ts:15-18` | Correct the header sentence to the page-model entry point. |
| [LOW] `[RULE]` #11 | `(e as Error).message` in `catch (e)` without an `instanceof Error` narrowing — a non-Error rejection prints `undefined`, defeating the helper's diagnostic purpose. | `plugins/tempest/tests/helpers/pt1-5-attract-contract.ts:56` | Narrow with `instanceof Error` (or `String(e)`) before reading `.message`. |

**Verified clean:** [SEC] purity/determinism (security subagent); [RULE] #14 the `demoActive` edge is cleared on every exit path (I traced all four + the two other `mode='attract'` sites; rule-checker mutation-confirmed); #3 `dwellFor` exhaustiveness (I mutation-tested: an added union member fails `tsc` TS2366 — the `assertNever` default is optional here); #27 the demo page is always reachable (fixed 3-page rotation); the render fall-through (all post-scene overlays are `warp`/`playing`-gated, so attract+demo only gains `drawHud`, which is authentic).

**Handoff:** Back to TEA — all four findings are in test files (the fixes are test assertions/casts/comments), so this is a `red` rework, not a `green` one.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
- **Improvement** (non-blocking): the "deterministic from the seed" cycle test passes
  under BOTH the old and new models (the pre-existing continuous demo is also
  deterministic), so it guards determinism but not the page model specifically — the
  page model is pinned by the other 22 failing assertions. Fine as-is; noted so Dev
  doesn't read its green as page-model coverage.
  Affects `plugins/tempest/tests/core/pt1-5.attract-cycle.test.ts`.
  *Found by TEA during test design.*
- **Question** (non-blocking): tempest's ROM page dwell frame-counts are not cited in
  the story context (unlike joust's MARQUE_DWELL), so the tests pin dwells only as
  positive/finite and pin the demo behaviourally ("visibly plays" = spawns + fires).
  If Dev finds a citable ATARI source line for a page dwell, stamp it like joust's
  `MARQUE_DWELL_FRAMES`; otherwise document the dwell as a presentation choice.
  Affects `plugins/tempest/src/core/attract-scheduler.ts` (to be created).
  *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the render change is verified by the source-wiring guard +
  the core behavioural demo tests, but I did NOT run a live browser playtest — I did
  not actually look at the demo rendering at `/tempest/`. A human/Reviewer smoke test
  should confirm the demo visibly plays on the attract screen (tempest CLAUDE.md's
  shell-verification convention; matches joust jt10-4's "demo-runs-under-attract is a
  human smoke test").
  Affects `plugins/tempest/src/shell/render.ts` (visual confirmation only).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the `ladder` and `logo` pages currently render the
  same existing `drawAttract` chrome (which already shows both the wordmark and the
  high-score table), so they are not yet visually distinct — only the demo page is
  new. No AC requires differentiation; a follow-up could emphasise the ladder's table
  vs the logo's wordmark per page.
  Affects `plugins/tempest/src/shell/render.ts` (`drawAttract` could branch on `s.attract.page`).
  *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the "visibly plays" test does not pin a per-visit demo dwell
  magnitude — mutation-proven vacuous (`DEMO_DWELL_FRAMES=5` keeps it green). This is
  the story's headline AC and must have a magnitude-bearing assertion before finish.
  Affects `plugins/tempest/tests/core/pt1-5.attract-cycle.test.ts` (add a per-visit
  spawn+fire-within-N-frames assertion).
  *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the vestigial `as unknown as` casts, the stale
  `sim.attract-demo.test.ts` header, and the un-narrowed `catch` cast are all test-file
  cleanups bundled into this rework (see Reviewer Assessment findings #1/#17/#11).
  Affects `plugins/tempest/tests/**` (pt1-5.attract-cycle, sim.attract-demo, helpers).
  *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

### Deviation Justifications

1 deviation

- **Scheduler state lives on `GameState` and is driven inside `stepGame`'s attract case**

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
- **Re-negotiated the 10-3 attract-demo contract.** Spec (`sim.attract-demo.test.ts`,
  Story 10-3) seeded the demo on the FIRST idle step. Context §Tests-affected authorised
  re-negotiation "if the mode/page model changes." It changed: the demo now seeds when the
  three-page rotation reaches the DEMO page, so the old single-step Group B blocks were
  retired (their coverage moved, extended, into `pt1-5.attract-cycle.test.ts`). Group A
  (pure `demoInput`) is unchanged. *Why:* the ROM starts a fresh 1-life demo as one page of
  a rotation, not continuously.
- **Scheduler state lives on `GameState` and is driven inside `stepGame`'s attract case**
  — not a shell-only module as in joust. *Why:* tempest's demo already runs inside the sim
  (`sim.ts:1127-1141`), and the sim steps inside the shared `createLoop` (main.ts doesn't
  pump frames itself), so the sim is the only place that can start/stop the demo per page.
  The pure page math still lives in `core/attract-scheduler.ts` (joust shape) for reuse.
- **Page order pinned as `['ladder','logo','demo']`, booting on `ladder`.** *Why:* the
  cited ROM cycle ENDGAM→CDLADR (ladder) → DLADR→CLOGO (logo) → self-play demo
  (ALEXEC.MAC:428-470). The current permanent wordmark is the `logo` page shown forever.
- **`AttractState` carries `{page, framesOnPage}` only — no `colourPhase`** (joust has it).
  *Why:* tempest's rainbow logo already animates off the render clock; a marquee colour
  phase would be dead state.

### Reviewer (audit)
- **ACCEPTED** — Re-negotiated the 10-3 contract. Explicitly authorised by the story
  context (§Tests-affected: "Re-negotiate if the mode/page model changes"); coverage was
  moved into `pt1-5.attract-cycle.test.ts`, not lost. (The *header* left describing the old
  entry point is finding #17 — a documentation defect, not a deviation objection.)
- **ACCEPTED** — Scheduler state on `GameState`, driven in `stepGame`. Correct call for
  tempest's architecture (the demo already lives in the sim; main.ts doesn't pump frames);
  purity preserved (security + purity gates green).
- **ACCEPTED** — Page order `['ladder','logo','demo']` booting on `ladder`. Matches the
  cited ROM cycle; the SEQUENCE is cited, dwells are disclosed as presentation choices.
- **ACCEPTED** — `AttractState` drops joust's `colourPhase`. Sound — tempest's logo
  animates off the render clock; carrying it would be dead state.
- **ACCEPTED (Dev)** — ladder/logo render the same existing chrome (Dev's non-blocking
  Improvement). No AC requires per-page differentiation; left as a follow-up.
- **FLAGGED (Dev)** — the live-browser smoke test was NOT run (Dev's honest Gap). The
  render change is source- + behaviour-tested only; a human/Reviewer visual confirmation
  that the demo visibly plays at `/tempest/` is owed before finish (tempest CLAUDE.md
  shell-verification convention). Carried forward to the rework/finish.

## Subagent Results

**Cycle: 1**

Method: all three enabled subagents RE-RUN against the full `develop...HEAD` diff for this cycle (not just re-verified), plus Reviewer independent mutation re-check of #29.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — new single-visit loop bound re-checked by Reviewer (reachable, terminates on dwell) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — #11 catch-narrowing now present, assessed by Reviewer + rule-checker |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — #29 magnitude fix mutation-verified by Reviewer + rule-checker |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — #17 header correction confirmed by Reviewer + rule-checker |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — #1 casts removed, tsc clean, confirmed by Reviewer + rule-checker |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — no new complexity in the test-only rework |
| 9 | reviewer-rule-checker | Yes | clean | none (4 prior all resolved, 0 new) | confirmed resolved 4, new 0 |

**All received:** Yes (3 enabled re-run; 6 disabled via settings, domains assessed first-hand)
**Total findings:** 0 new; all 4 prior findings verified resolved (#29 independently mutation-verified by Reviewer AND rule-checker)
**Working-tree audit:** `pf reviewer audit-tree` → CLEAN (before and after the Reviewer's own #29 mutation probe; restored via `git checkout`)

## Reviewer Assessment

**Verdict:** APPROVED (re-review round 1; supersedes the round-0 REJECTED verdict) — all four findings resolved, independently verified, no new violations.

### Devil's Advocate (re-review)

The suspicion for a re-review is that the fixes *paper over* the findings rather than close them — a test renamed to look stronger, a cast moved rather than removed, a magnitude assertion that still can't fail. I checked each against that. #29 is the one that mattered, and it is genuinely load-bearing now: I re-ran the mutation myself (`DEMO_DWELL_FRAMES=5`) and exactly the new "SINGLE demo-page visit" test reddened while the old accumulate-across-visits test stayed green — so the new assertion, not the old one, is what pins the story's headline magnitude, and shrinking the dwell below a real play example can no longer ship green. The #1 casts are *removed*, not relocated: `tsc --noEmit` is clean over direct `s.attract.page` access, which only typechecks because `GameState` really declares the field — a masked type error would have surfaced there. #17's header now states the page-model entry point and a repo-wide grep for "first idle step" finds only past-tense historical references. #11 narrows with `instanceof Error` under `strict`. The rule-checker's one extra observation — a pre-existing `as unknown as` on `demoInput` at sim.attract-demo.test.ts:45 — I confirmed predates this branch (blame `61b707b4`, 2026-07-30) and is untouched here, so it is out of scope for pt1-5, not a regression. The remaining honest gap is not a defect but a deferral: the demo's *pixels* are still only source- and behaviour-tested, never seen — carried as a FLAGGED deviation for a human smoke test at finish. Nothing here is broken; the net is now honest about the one thing it was letting through.

### Dispatch coverage

`[SEC]` clean (security re-run) · `[RULE]` clean, 4 prior resolved / 0 new (rule-checker re-run) · `[TEST]` `[TYPE]` `[DOC]` `[SILENT]` disabled, corroborated by rule-checker + Reviewer (all findings resolved) · `[EDGE]` `[SIMPLE]` disabled, assessed by Reviewer → clean.

**Data flow traced:** idle input → `stepGame` attract case → `stepAttract(s.attract)` → on the `demo` page `seedDemo` sets `s.demoActive` → `render()` reads `s.demoActive` to draw the scene (safe: render only reads state; the demo's randomness stays on the seeded `s.rng`).
**Pattern observed:** the fleet attract-scheduler shape at `plugins/tempest/src/core/attract-scheduler.ts` (pure, purity-swept), mirroring `plugins/joust/src/core/attract-scheduler.ts`.
**Error handling:** `demoActive` edge cleared on every exit path from the demo page (`sim.ts` attract case — verified #14); test-helper import failure narrows the caught error (`pt1-5-attract-contract.ts:54`).

**Handoff:** To SM for finish-story. One item to carry: the human visual smoke test at `/tempest/` (FLAGGED deviation) is owed before/at finish.