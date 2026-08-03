---
story_id: "jt9-3"
jira_key: "jt9-3"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-3: Pin the three wing-cue invariants jt5-3 shipped unguarded

## Story Details
- **ID:** jt9-3
- **Jira Key:** jt9-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Type:** chore
- **Points:** 3
- **Priority:** p3
- **Branch:** main
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-03T10:57:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-03T10:12:39Z | 2026-08-03T10:14:55Z | 2m 16s |
| red | 2026-08-03T10:14:55Z | 2026-08-03T10:38:59Z | 24m 4s |
| green | 2026-08-03T10:38:59Z | 2026-08-03T10:45:08Z | 6m 9s |
| review | 2026-08-03T10:45:08Z | 2026-08-03T10:57:39Z | 12m 31s |
| finish | 2026-08-03T10:57:39Z | - | - |

### Branch and Context
**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
**Context File:** sprint/context/context-story-jt9-3.md ✓ (validated)

## Background

**Epic:** jt9 — Joust — the remainder, re-ordered: apparatus, gameplay, geometry, brains, dossier

**Story Context:** jt5-3's Reviewer ran a 24-mutation battery. Three mutations reddened NOTHING across all joust tests, indicating three behaviours held by prose alone without test guards. This story pins them with mutations.

**Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)

**Current joust test count at setup:** 2499 tests (per `npx vitest run --project joust`, 2026-08-03)
— **VERIFIED by TEA at RED**, 2026-08-03: `Test Files 104 passed (104) / Tests 2499 passed
(2499)`. Setup's figure was flagged as possibly a transcription of jt9-31's story text; it is
not, it is correct. After RED the suite is **2510** tests in the same **104** files.

## Delivery Findings

### TEA (test design)

- **Improvement** (non-blocking): the story's `demo.ts:1109` citation was **correct when
  written and rotted within hours**, which is live evidence for **jt9-30**. At jt5-3's own
  GREEN commit (`8ef35a1`, 2026-08-01) demo.ts:1109 *was*
  `const cues: GameEvent[] = [...stepped.cues, ...collided.cues]`. jt5-4 (`af3fed4`, the SAME
  DAY) moved it to :1174; it is :1275 today. Three positions in three days, by two unrelated
  stories. jt9-30 currently reasons about `<file>.ts:<line>` refs in *test comments*; this
  shows the same rot in *story and epic YAML text*, where nothing can gate it. Worth stating
  in jt9-30's ACs that the drift rate is hours, not months. *Found by TEA during test design.*

- **Gap** (non-blocking): adding any new file under `plugins/joust/tests/` silently breaks
  `jt5-7 AC5 — the suite FILE count matches what vitest actually discovers`
  (`audio-seam-scope.test.ts`), because the joust README:48 states `# 104 files (derived +
  guarded)` on the `--project joust` command line. This is working as designed, but it is a
  cost no story-sizing has ever priced in and it is not mentioned in the plugin README's own
  contributor notes. Affects `plugins/joust/README.md` (a line stating the count) — a future
  story adding a suite must budget the README bump. *Found by TEA during test design.*

### Reviewer (code review)

- **Improvement** (non-blocking, ROUTED): TEA's demo.ts line-drift evidence is now **appended to
  jt9-30's description** in `sprint/epic-jt9.yaml`, not left in this session file. A Delivery
  Finding naming a story routes nothing on its own (`the-reviewers-file-with-X-line-is-unexecuted`);
  the text had to land in the story. Added there: the three-positions-in-three-days worked example,
  and the sharper half TEA implied but did not state — today's demo.ts:1109 is unrelated egg-catch
  `narrowPhase` logic, so the stale ref does not dangle, it points at the WRONG REAL CODE.
  *Found by TEA, routed by Reviewer during code review.*

- **Gap** (non-blocking, ROUTED): TEA's file-count finding named no owner, so it would have been
  forgotten at archive. Now **appended to jt9-28** ("The README counts jt5-7 did not own") as a
  fourth item, with the empirical proof added — I dropped a trivial probe file into
  `plugins/joust/tests/` and `jt5-7 AC5` failed with `README says 104 test files; vitest discovers
  105`. Fix is one sentence in the README's contributor notes. *Found by TEA, verified and routed
  by Reviewer during code review.*

- **Observation** (non-blocking, no story needed): the `cues: []` overwrite at `demo.ts:1261` —
  the structural fact this story cites three times as load-bearing — is itself **unguarded**:
  removing it leaves all 2510 tests green (my mutation N3, 0 red). This is correct and needs no
  story: `stepFrame` never reads `state.cues`, so dropping the overwrite changes no behaviour, and
  the new guards call `stepFrame` directly with a seeded cue, so they would still catch a real
  accumulation regression either way. Recorded so a later reader does not mistake the 0-red result
  for a coverage hole. *Found by Reviewer during code review.*

## Design Deviations

### TEA (test design)

- **Test placement:** context proposed a new `plugins/joust/tests/wing-cues.test.ts`; the
  guards are instead distributed into the two suites that already own each seam —
  `audio-flap.test.ts` (jt5-3's own suite: the two frame.ts invariants) and
  `audio-thud.test.ts` (the cue-ordering invariant). Reason: (a) a new file trips the derived
  file-count guard above and would force a README edit for no test benefit; (b) the ordering
  guard needs audio-thud's `stage`/`playerProcess`/`enemyProcess` staging kit, and copying it
  into audio-flap would re-introduce exactly the fixture duplication jt9-2 spent a story
  removing. Discoverability is preserved by grep, not by filename: every group and every test
  carries the literal `jt9-3`, so `grep -rn jt9-3 plugins/joust/tests` finds all three.

- **Two tests for invariant 1, not one:** the story asks for a staged frame where the entity
  becomes airborne mid-step. Both directions of the flip are pinned (a LANDING, where the
  mutant swallows a cue; and a WALK-OFF, where it invents one), because a fix that
  special-cases one direction survives a guard that only tests the other.

## Sm Assessment

**Routing:** tdd (phased) → red → TEA. Story is a 3-point guard-addition chore filed
out of jt5-3's Reviewer mutation battery. No production behaviour changes; the whole
deliverable is three tests that must each be proven to redden under a restrictive
mutation.

**Setup measured three things and ONE of them is a claim, not a measurement — TEA must
re-open it:**

1. `plugins/joust/src/core/frame.ts:321` — the pre-step `wasAirborne` read. Setup
   re-opened it and reports `const wasAirborne = p.entity.airborne` still at :321, with
   `stepPlayerEntity` at :329. Cited line holds.
2. `plugins/joust/src/core/frame.ts:163-169` — the never-accumulated comment. Setup
   reports it now spans :163-171. Cited line holds, extent drifted by two.
3. `plugins/joust/src/core/demo.ts` — the story cites **:1109** for the
   flight-cues-before-collision-cues order; setup reports the real site is **:1272-1275**
   and that :1109 is egg-catch narrowPhase logic. **This is a setup correction, and a
   setup correction is a claim.** Project memory `sm-premeasured-corrections-can-be-wrong`
   says exactly this failure shape: a correction arrives labelled MEASURED and outranks
   the story. TEA re-opens both :1109 and :1272-1275 and states which one actually
   carries the invariant, citing the symbol rather than the line.

**The test count is UNVERIFIED.** Setup's session line says "2499 tests (per
`npx vitest run --project joust`)". Setup was told not to run the suite, and 2499 is
also the literal number printed in jt9-31's story text — so it may be a transcription
wearing a measurement's clothes. It does not gate anything here; TEA gets the real
number for free on the first RED run. Treat the story's own "0 of 1979" as a
2026-08-01 figure against a smaller suite, not as today's baseline.

**The trap this story is about.** `audio-seam-suites-cannot-see-emitters`: joust's cue
suites all read the same `EVENT_KINDS` tuple, so they agree with each other whether or
not anything is right — six of eleven cues once deleted fully green. A guard written in
that vocabulary can inherit the same blindness. Every new test here is verified by
mutation before it counts: make the forbidden change, watch it redden, revert, confirm
green. And per `mutation-direction-must-be-restrictive`, the mutant must be
RESTRICTIVE — a permissive mutant cannot fail an assertion, so its survival proves
nothing about the guard.

**Branch:** none. `repos.yaml` is trunk-based for `arcade`, so work lands on `main`
directly, as jt9-1 and jt9-2 did (no merge commits in their history).

**Not my call to make here:** whether all three guards belong in one new
`wing-cues.test.ts` or distributed into the suites that already own each seam. Setup
proposed the new file and flagged the alternative; TEA owns that placement.

## Tea Assessment

**Tests Required:** Yes
**Reason:** The entire deliverable is tests. No production change is needed or wanted.

**Test Files:**
- `plugins/joust/tests/audio-flap.test.ts` — jt5-3's own suite. Two new groups (7 tests): the
  pre-step `wasAirborne` read (4) and `GameState.cues` freshness (3+1).
- `plugins/joust/tests/audio-thud.test.ts` — the collision-staging suite. One new group (3
  tests): `stepDemo` emits flight cues before collision cues.

**Tests Written:** 11 tests covering 6 ACs. joust 2499 -> **2510**, 104 files (unchanged), lint
clean (`tsc --noEmit`, repo-wide).

**Status:** GREEN against shipped code, and that is the CORRECT outcome — see below.

### The RED, done honestly

This is a pinning story: the code is already right, so a guard cannot fail against the tree as
shipped. The RED was therefore taken against the MUTATED tree. Each guard was watched to fail
under the exact change it forbids, then watched to pass again on revert.

**Baseline first, before writing any test** — the story's "0 of 1979" is a 2026-08-01 figure
and the suite has since grown 26%. Re-measured 2026-08-03 against 2499: **all three mutations
still pass 2499 of 2499.** Nothing had covered them incidentally, so no guard was dropped or
rescoped.

| # | Mutation (verbatim) | Baseline (no new tests) | With guards |
|---|---------------------|-------------------------|-------------|
| M1 | `frame.ts` `runBehaviour`: delete `const wasAirborne = p.entity.airborne` from above the step; insert `const wasAirborne = entity.airborne` below `const entity = stepPlayerEntity(p.entity, input, facing)` | 2499/2499 pass | **2 red** |
| M2 | `frame.ts` `stepFrame`: `const cues: GameEvent[] = []` -> `= [...state.cues]` | 2499/2499 pass | **3 red** |
| M3 | `demo.ts` `stepDemo`: `[...stepped.cues, ...collided.cues]` -> `[...collided.cues, ...stepped.cues]` | 2499/2499 pass | **2 red** |

Which tests reddened:
- **M1** -> `a knight that LANDS on its release frame still sounds wing-up`;
  `WALKING off a ledge on the release frame stays SILENT — the other direction`.
- **M2** -> `a cue handed IN does not come back out — even on a frame that emits`;
  `and not on a SILENT frame either — the output is [], not the input`;
  `the array handed in is neither returned nor written to`.
- **M3** -> `a frame that flaps AND thuds emits the wing edge first`;
  `the flight cue precedes the collision cue by INDEX, not by luck of the list`.

**The controls stayed green under every mutation, by design** — that is what distinguishes a
real pin from a broken instrument. `the same release twenty pixels higher sounds too` and
`landing with the button still HELD is silent` survive M1 (airborne before *and* after, so the
mutant computes the same answer); `two steps of one state do not share a cue array` survives
M2 (it guards the module-scoped-accumulator shape, a different defect); `the fixture is real —
each moment fires ALONE` survives M3 (a one-cue stream has no order to flip). In every run,
**only** the intended guards moved — 2508 / 2507 / 2508 of 2510 still passed.

Production source was reverted and verified clean (`git status --porcelain -- plugins/joust/src`
empty) after each mutation; the tree finishes at 2510/2510 green.

### The demo.ts ruling (SM asked TEA to re-open a setup correction)

**Setup's correction is right about today and wrong about the story.** Both were re-opened.

- **Today** the invariant is carried by `stepDemo` (`plugins/joust/src/core/demo.ts`, function
  begins :1238) at the statement `const cues: GameEvent[] = [...stepped.cues, ...collided.cues]`,
  currently :1275, explained by the comment at :1269-1274. Today's :1109 is `collisionPass`'s
  egg-catch `narrowPhase` call. Setup measured that correctly.
- **But the story was not sloppy.** At jt5-3's own GREEN commit (`8ef35a1`, 2026-08-01),
  demo.ts:1109 *was* that exact concatenation. jt5-4 (`af3fed4`, same day) moved it to :1174;
  it is :1275 now. The citation rotted within hours of being written. Filed as a Delivery
  Finding for **jt9-30**.
- **Cited by symbol, per instruction:** the invariant is `stepDemo`'s single
  `const cues: GameEvent[]` initialiser — the only concatenation of `stepped.cues` and
  `collided.cues` in the file, and the only one there has ever been.

### A structural fact worth carrying forward

The accumulate mutation (M2) could not have been caught from `stepGame` **at all**, and not
for want of trying: `stepDemo` calls `stepFrame({ ...demo.sim, targets, cues: [] }, ...)` —
it overwrites `cues` on the way in. So no amount of play can observe `stepFrame` reading
`state.cues`. That is *why* it reddened nothing, and why the existing
`the stream is REBUILT per frame` test (which goes through `stepGame`) is blind to it: that
test pins the DEMO's rebuild, not the scheduler's. The new guards call `stepFrame` directly.

### Rule coverage

`.pennyfarthing/gates/lang-review/` has no `typescript.md`, and `.claude/rules/` and `SOUL.md`
do not exist in this repo, so the applicable rubric is CLAUDE.md's plus this suite's own
standing hazards. Both were treated as binding:
- **Hazard C / `audio-seam-suites-cannot-see-emitters`** — no new guard reads `EVENT_KINDS`.
  Every assertion is on an emitted stream from a staged frame, compared against local string
  literals, with an exact `toEqual` rather than `toContain`.
- **`mutation-direction-must-be-restrictive`** — no mutant merely deletes a filter. M1 moves a
  read (the mutant computes a *different* value); M2 and M3 are exact-array assertions, which
  an additive or a reordering mutant genuinely fails.
- **Core purity** — the guards touch `src/core` only through its public functions; nothing was
  added to `src/`.
- **Fixtures are measured, not guessed** — every staging (x=100/y=162/velY=256 for the
  one-step landing; y=142 for the aloft control; the 68-frame cliff walk plus a held-button
  frame for the walk-off) came out of a sweep run against the shipped sim and thrown away.

## What remains for Dev (GREEN)

**Nothing.** All 11 guards pass against the tree as shipped, because jt5-3's behaviour is
correct in all three cases and this story's whole purpose is to pin it. AC6 is "no production
code changes", and the correct GREEN here is an empty one: confirm `npx vitest run --project
joust` is 2510/2510 and `npm run lint` is clean, then hand to Reviewer. **Do not invent
production work to make the shape look like TDD** — a change to `frame.ts` or `demo.ts` in
this story is a regression, not a deliverable.

The one thing Dev/Reviewer *should* do is **re-run the battery** rather than take this on
trust. The three mutations are written verbatim in the comment above each group, and a driver
that applies, runs, and reverts each one is at
`/private/tmp/claude-501/-Users-slabgorb-Projects-a-1/4db28cc0-7ce5-4e19-9253-b48ad36c69a3/scratchpad/`
(`mutate.py` + `battery.sh`; scratch, not committed).

**Handoff:** To Dev for GREEN (expected to be a no-op verification).

## Dev Assessment

**Implementation Complete:** Yes — as a verification, not an implementation. No file under
`plugins/joust/src/` was touched; `git diff --stat` is empty and stays empty.

**Battery re-run independently** (TEA's `battery.sh` driver, via a `testing-runner` subagent,
against `main` as it stands today — not against TEA's saved output):

| # | Mutation | With guards present | Failing tests (by name) | Prod file after revert |
|---|----------|----------------------|--------------------------|--------------------------|
| M1 | `frame.ts` `runBehaviour`: move `wasAirborne` read below the step | 2508 pass, **2 red** | `a knight that LANDS on its release frame still sounds wing-up`; `WALKING off a ledge on the release frame stays SILENT — the other direction` | `git status --porcelain -- plugins/joust/src` empty |
| M2 | `frame.ts` `stepFrame`: `cues = []` → `cues = [...state.cues]` | 2507 pass, **3 red** | `a cue handed IN does not come back out — even on a frame that emits`; `and not on a SILENT frame either — the output is [], not the input`; `the array handed in is neither returned nor written to` | empty |
| M3 | `demo.ts` `stepDemo`: swap `[...stepped.cues, ...collided.cues]` → `[...collided.cues, ...stepped.cues]` | 2508 pass, **2 red** | `a frame that flaps AND thuds emits the wing edge first`; `the flight cue precedes the collision cue by INDEX, not by luck of the list` | empty |

Matches TEA's RED-phase table exactly — same counts, same test names. Final re-run after all
three reverts: **104 files / 2510 tests, all passing**; final `git status --porcelain` and
`git diff --stat` both empty.

**One methodological wrinkle (not a finding about the story itself):** my first attempt ran the
mutation battery and a separate "suite + lint + orchestrator" check as two `testing-runner`
subagents IN PARALLEL. They raced on the same working tree — the second agent's `npx vitest run
--project joust` overlapped the first agent's M3 mutation window and reported the exact M3
symptom (`player-wing-down`/`player-thud` order flipped) as if it were a live regression. Caught
by re-running alone once `git status --porcelain` was confirmed empty: clean **104/104,
2510/2510**. No production defect — a race artifact from running two mutating/measuring agents
against one shared tree concurrently. Written up in the Dev sidecar so it isn't repeated.

**The `cues: []` overwrite claim — re-opened and CONFIRMED.** `plugins/joust/src/core/demo.ts:1261`
reads `const stepped = stepFrame({ ...demo.sim, targets: tickedTargets, cues: [] }, inputs, {`.
`stepDemo` truly overwrites `cues` to `[]` on every call into `stepFrame`, so `stepFrame`'s own
handling of `state.cues` (M2's target) is structurally unobservable through the demo path — a
`stepGame`/demo-fixture-only guard could never have caught M2 regardless of how it was written.
TEA's claim holds; this is why the two `frame.ts` guards call `stepFrame` directly rather than
route through `stepDemo`/`stepGame`.

**Independently confirmed numbers:**
- `npx vitest run --project joust` → **104 files (104), 2510 tests (2510)**, 0 failed, 0 skipped
  (clean, solo run — see wrinkle above for why this needed a second look).
- `npm run lint` (`tsc --noEmit`, repo-wide) → clean, no output.
- `npm run test:orchestrator` → **390 pass, 0 fail, 0 skipped, 0 cancelled**. No file-count or
  README-derived-count check lives in the orchestrator suite for joust; the `jt5-7 AC5` derived
  file-count guard is inside the vitest run instead (`audio-seam-scope.test.ts`) and it passed
  there too — expected, since jt9-3 added tests to two EXISTING files, so the derived file count
  is still 104, matching the README's stated `104 files`.

**Files Changed:** none under `plugins/joust/src/`. This session file (assessment) and the Dev
sidecar are the only writes this phase makes.

**Tests:** 2510/2510 passing (GREEN), unchanged from the RED handoff.

**Branch:** `main` (trunk-based, no branch, no PR).

**Handoff:** To review.
## Reviewer Assessment

**Verdict:** APPROVED

The guards are sound. The prose explaining them was not, and I fixed it in place rather than
spend a REJECT cycle on a comment (standing rule). Two Delivery Findings that would have been
forgotten at archive are now routed into real stories.

### What I actually did: the battery TEA and Dev did not run

TEA ran three mutations. Dev re-ran **the same three** and matched every count and test name.
That is not independent verification — it is one experiment performed twice, and it can only
confirm what it was already pointed at. Each of those three mutations was authored beside the
guard meant to catch it.

The gap it cannot see: **the three headline mutations redden only 7 of the 11 new guards.** Four
stay green. Two of those are declared controls and that is exactly right. But **two — `two steps
of one state do not share a cue array` and `the fixture is real — each moment fires ALONE` — were
justified as guarding "a different defect" that no mutation had ever produced.** By the diff's own
stated standard ("a guard nobody has watched FAIL is not a guard") those two were unproven.

I ran **11 mutations, all restrictive**, each applied to production source, run against the full
joust project, reverted, with `git status --porcelain -- plugins/joust/src` asserted empty before
the run and after every revert. Driver: `scratchpad/rev_battery.py`. Run **solo** — Dev's parallel
`testing-runner` race is real and I did not repeat it.

| # | Mutation (restrictive) | Result | What it proves |
|---|------------------------|--------|----------------|
| G1 | `wingEdge(wasAirborne, …)` → `wingEdge(entity.airborne, …)` | **2 red** | reproduces TEA/Dev exactly |
| G2 | `stepFrame`: `cues = []` → `[...state.cues]` | **3 red** | reproduces exactly |
| G3 | `stepDemo`: swap the concatenation | **2 red** | reproduces exactly |
| N1 | `cues = state.cues as GameEvent[]` (alias caller's array) | **4 red** | **reddens B4** — the unproven guard is real |
| N2 | module-scoped accumulator array | **47 red** | **reddens B4** — the exact shape it claimed to guard |
| N3 | drop `cues: []` in `stepDemo` | **0 red** | the structural fact is unguarded but INERT — see Delivery Findings |
| N4 | `wingEdge` ground branch manufactures a wing-up on release | **2 red** | the walk-off guard is specific, not incidental |
| N5 | delete the `up` edge entirely | 16 red | broad control |
| N6 | `stepDemo`: drop `collided.cues` | **36 red** | **reddens C2** — the other unproven guard is real |
| N7 | `stepDemo`: drop `stepped.cues` | **24 red** | **reddens C2** |
| N8 | stop writing `prevFlapHeld` each wake | 9 red | the seeded-`prevFlapHeld` doc claim holds, guarded by jt5-3's own tests |

**Result: all 11 guards have now been watched to fail under at least one restrictive mutation.
No dead guards.** That is a better outcome than this pipeline usually gets (jt5-3: 21 mutations,
3 dead). G1/G2/G3 redden **only** the new jt9-3 tests, which independently confirms the
"0 of 2499 without these guards" baseline.

### Findings

| Severity | Issue | Location | Disposition |
|----------|-------|----------|-------------|
| [MEDIUM] | False structural claim: "Two of jt5-3's three unguarded invariants are invisible from `stepGame` … so their guards call `stepFrame` directly". Only ONE is. The pre-step `wasAirborne` invariant is reachable through `stepGame` — this story's OWN `WALKING off a ledge…` guard reaches it in three `stepGame` calls and reddens under G1. | `audio-flap.test.ts:75-78` | **FIXED in place** |
| [MEDIUM] | Same claim restated more strongly — "WHY THESE TWO USE THE RAW `stepFrame` SEAM / Not preference — necessity". For the `wasAirborne` invariant it IS preference (staging a one-step landing is cheaper at the raw seam), not necessity. The block hedges correctly one sentence later, so the author knew the cases differed. | `audio-flap.test.ts:887-889` | **FIXED in place** — heading rescoped to the accumulation guards, correction recorded at the foot of the block with the G1 proof |
| [LOW] | Missing trailing newline (the only one of 104 joust test files) plus a stray double blank line. | `audio-thud.test.ts` | **FIXED in place** |
| [LOW] | TEA's two Delivery Findings named no owner story / did not land in the named one. | session file | **FIXED** — routed into jt9-30 and jt9-28 |

**No Critical. No High. Nothing blocking.**

### Mandatory steps

- **Data flow traced end-to-end:** `PlayerInput` (`shell/input.ts`, `flap`=rising edge,
  `flapHeld`=level) → `runBehaviour` (`frame.ts:321`) captures `wasAirborne` **before**
  `stepPlayerEntity` (:329) → `wingEdge(wasAirborne, prevFlapHeld, input)` (`flight.ts:460-465`)
  → `wingCue` → `stepFrame`'s **fresh** `cues` array (:416) → `stepDemo` concatenates
  `[...stepped.cues, ...collided.cues]` (`demo.ts:1275`) → `playEventSounds` walks the stream **in
  order**, and `CHANNELS` lets a later cue take a channel from an earlier one. That last hop is
  why the ordering invariant is audible behaviour and not cosmetics — the diff says so and it is
  correct.
- **Verified good — the Hazard C trap this story is about:** no new guard reads `EVENT_KINDS`.
  Every assertion compares an emitted stream against **local string literals** with exact
  `toEqual`. The guards do not inherit the blindness they were written to fix.
- **Verified good — no vacuity:** every staged test asserts its own precondition before its claim
  (`expect(rawAirborne(landing)).toBe(false)` etc.), and the index comparison guards both operands
  with `toBeGreaterThanOrEqual(0)` before `toBeLessThan`. No loops, no filtered lists, no `expect`
  that can be skipped.
- **Verified good — placement rationale is TRUE, not a rationalisation.** I tested it: a probe file
  in `plugins/joust/tests/` fails `jt5-7 AC5` with `README says 104 test files; vitest discovers
  105`. TEA's reason (a) is real. Reason (b) (audio-thud's staging kit, jt9-2's de-duplication) is
  independently sufficient. That said, a test-count guard *is* influencing test placement — filed
  as a fourth item on jt9-28 rather than dismissed.
- **Verified good — citations.** jt5-3's archive confirms the 24-mutation battery and "Three
  mutations reddened 0/1979". `grep -rn jt9-3 plugins/joust/tests` finds all three groups. No
  identifier shadowing (`PLAYER_WING_DOWN` at audio-thud:1300 is describe-scoped; the file has no
  file-scope binding of that name).
- **Dev's "race, not a regression" claim — CONFIRMED.** Re-ran the joust project solo, repeatedly,
  through 11 mutation cycles: never once flaky. Every red was reproducible and attributable.
- **Scope holds:** `git diff -- plugins/joust/src src/` is empty. No production code changed.
- **Security:** no attack surface — test-only, pure core functions, no I/O, no user input, no
  secrets, no network.
- **Deviation audit:** both TEA deviations **ACCEPTED**. Placement — empirically verified above.
  Two tests for invariant 1 rather than one — vindicated: G1 reddens *both* directions and N4
  reddens only the walk-off, so a one-direction guard would have been weaker exactly as TEA argued.

### Final state

`npx vitest run --project joust` → **104 files / 2510 tests, all passing**. `npm run lint` → clean.
`npm run test:orchestrator` → **390 pass, 0 fail**. Re-verified after my edits, and the battery
re-run post-edit still gives G1 2 red / G2 3 red / G3 2 red / N4 2 red.

## Subagent Results

| Subagent | Enabled | Covered by | Result |
|----------|---------|------------|--------|
| reviewer-preflight | false | Reviewer, directly | joust 2510/2510, lint clean, orchestrator 390/390 |
| reviewer-edge-hunter | false | Reviewer, directly | Both flip directions enumerated (landing / walk-off); held-button and aloft controls present |
| reviewer-silent-failure-hunter | false | Reviewer, directly | No swallowed errors; pure reducers, no catch blocks in diff |
| reviewer-test-analyzer | false | Reviewer, 11-mutation battery | All 11 guards proven to fail; 0 dead guards; no vacuous assertions |
| reviewer-comment-analyzer | false | Reviewer, directly | 2 MEDIUM false structural claims found and FIXED |
| reviewer-type-design | false | Reviewer, directly | `SimState` alias correct; `GameEvent` sentinel well-typed |
| reviewer-security | false | Reviewer, directly | No attack surface — test-only, no I/O |
| reviewer-simplifier | false | Reviewer, directly | No redundant guards — each of the 11 has a distinct reddening mutation |
| reviewer-rule-checker | false | Reviewer, directly | No `.claude/rules/`, no SOUL.md, no lang-review typescript.md; CLAUDE.md + suite hazards applied |

**All received:** Yes

All received: Yes

**Handoff:** To SM for finish-story.