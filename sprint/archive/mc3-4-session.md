---
story_id: "mc3-4"
jira_key: "mc3-4"
epic: "mc3"
workflow: "tdd"
---
# Story mc3-4: Compose the combat loop: grow GameState and stepGame (spawn->fly->detonate->damage->resolve)

## Story Details
- **ID:** mc3-4
- **Jira Key:** mc3-4
- **Workflow:** tdd
- **Repos:** arcade
- **Stack Parent:** none
- **Branch:** none
- **PR:** 63 (merged into develop — slabgorb/arcade#63)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-07T15:26:20Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-07T15:01:47Z | 2026-08-07T15:04:54Z | 3m 7s |
| red | 2026-08-07T15:04:54Z | 2026-08-07T15:12:53Z | 7m 59s |
| green | 2026-08-07T15:12:53Z | 2026-08-07T15:16:33Z | 3m 40s |
| review | 2026-08-07T15:16:33Z | 2026-08-07T15:26:20Z | 9m 47s |
| finish | 2026-08-07T15:26:20Z | - | - |

## Story Context

Plan task 7 (docs/superpowers/plans/2026-08-07-missile-command-mc3-core-loop.md). Compose the whole loop in src/core/game.ts. Grow GameState to add icbms, cities, bases, score, phase, remaining (per-wave budget), and a seeded rng (Rng from @shared/rng). createGame(seed=1) seeds 6 live cities, 3 live bases at full ammo, empty enemy list, phase 'play', remaining=NICBMS. stepGame runs the 7-step per-frame order: (1) spawn against live targets, (2) fly ICBMs, (3) fly ABMs, (4) detonate ABM arrivals into blasts, (5) damage — blasts kill ICBMs (scored) and arrived ICBMs kill structures, (6) age blasts, (7) resolve score + phase. When phase='over' the loop only advances frame. Consumes every module from mc3-1/2/3 plus mc1's abm/explosion/cursor.

## Acceptance Criteria
- createGame(seed) returns a fresh game: 6 live cities, 3 live bases each with ammo 10, no ICBMs, score 0, phase 'play'.
- stepGame drives the attack: over frames it spawns ICBMs from the seeded wave (respecting the MXICON on-screen cap and drawing down the NICBMS budget), and a blast covering an ICBM's head destroys it and adds 25 to the score in the same step.
- structures only transition alive->dead (never resurrect); once every city is dead the next step sets phase 'over' and subsequent steps only advance frame.
- the sim is deterministic: two runs from the same seed produce identical multi-hundred-frame states; the whole app suite (mc1 + mc3), purity, citations, and npm run lint pass.

## Sm Assessment

**Setup complete — routing to TEA for the RED phase.** The phase pointer read `setup` on
arrival; this is a fresh 5-point TDD story with no prior work.

**Board verified before setup (sibling probes):** `git fetch --prune` + `git branch -r |
grep -i mc3-4` returned no remote branch, and the cross-checkout session sweep matched
nothing — the story was genuinely free. The one open PR at start (#62,
`chore/jt10-materialize-epic`, a sibling's unrelated chore) has since been merged by the
user, so the merge gate is fully clear.

**Dependencies confirmed done, not assumed:** mc3-1, mc3-2, mc3-3 all report `status: done`.
The substrate modules this loop composes — `state`, `icbm`, `abm`, `explosion`, `cursor`,
`damage`, `score`, `spawn`, `field`, `game` under `plugins/missile-command/src/core/` — are
all present.

**Premise measured, not trusted:** the description says "grow GameState / grow stepGame."
Current `game.ts` is a 49-line stub (minimal `GameState` / `createGame` / `stepGame`), so
"grow it" is accurate to the current tree — no stale-measurement correction was needed. ACs
were copied **verbatim** from `sprint/epic-mc3.yaml` and diffed line-for-line against the
context (they match).

**Claim pushed:** the in_progress stamp + context ride the feature branch
`feat/mc3-4-compose-combat-loop` (cut from an up-to-date develop), pushed to `origin` so the
sibling branch probe lights up. Under gitflow the sprint bookkeeping reaches develop via the
finish-time chore PR, not a direct develop push.

**For TEA:** RED against all four ACs. The implementation plan is task 7 of
`docs/superpowers/plans/2026-08-07-missile-command-mc3-core-loop.md`. AC4 is a determinism +
full-suite gate (mc1 + mc3, purity, citations, lint) — the seeded `Rng` from `@shared/rng` is
the determinism lever.

## TEA Assessment

**RED verified — handing off to Dev (Yoda) for GREEN.** New failing suite:
`plugins/missile-command/tests/game.test.ts` (188 lines, 13 tests). `testing-runner`
(RUN_ID `mc3-4-tea-red`): **11 failed / 459 passed**, the failures isolated to
`game.test.ts` alone — the other 22 files stay green, so RED is confined to this story.
Failures are for the right reasons: `TypeError` reading `.cities`/`.bases`/`.score`/`.rng`
on the mc1-4 stub state, plus the seed-divergence assertion (the stub ignores the seed).

**AC → test mapping (each AC has meaningful, non-vacuous coverage):**
- **AC1 (fresh game):** 6 live cities, 3 live bases at `ammo===10`, empty enemies/abms/
  explosions, `score 0`, `phase 'play'`, `frame 0`; `remaining===NICBMS`; `rng.seed===1`;
  `createGame() === createGame(1)` (pins the default seed).
- **AC2 (attack + caps + scoring):** first step launches `MXICON` and draws budget down by
  exactly that many (`launched+remaining===NICBMS` — cap + conservation in one deterministic
  step); a 120-frame invariant loop asserts `icbms.length<=MXICON`, `remaining>=0`, monotonic
  drawdown; a constructed blast destroys **exactly** the covered ICBM and adds **exactly 25**
  (not `>=25`); a live-target-filter test proves spawns only ever aim at surviving structures.
- **AC3 (die-only + game-over):** an arrived ICBM kills its target city, is consumed, leaves
  the rest, and the city stays dead across 10 more frames (non-resurrection); all-cities-dead
  → next step `phase 'over'`, and a subsequent step **freezes** score/icbms/cities/bases and
  only advances `frame` (pins that in-flight ICBMs are NOT flown once over); a 260-frame
  monotonic-alive sweep over a real attack.
- **AC4 (determinism):** two 250-frame runs from seed 7 are `toEqual`; a step advances
  `rng.seed` (randomness is threaded, not ignored); seed 7 vs seed 11 diverge.

**Rule Coverage (project domain rules, not just ACs):**
- **Purity / no ambient entropy:** the src/core sweep (`tests/purity.test.ts`) already guards
  game.ts; my determinism tests enforce it *behaviorally* — a stray `Math.random`/clock in the
  loop breaks same-seed `toEqual`. Dev must keep the only entropy source the seeded `Rng`.
- **Citations / no un-cited literal:** game.ts must introduce **no new numeric constant** — it
  reuses `NICBMS`, `MXICON`, `ICBM_KILL_POINTS(25)`, etc. The exact-25 scoring test pins the
  reuse of `ICBM_KILL_POINTS` through behavior; `citations.test.ts` guards the source text.
- **Vacuous-assertion self-check (Phase C):** every test asserts a concrete value or a
  cross-frame invariant — no `let _ =`, no `assert(true)`, no `is_none()`-style stubs. The two
  tests green on the stub (default-seed, same-seed determinism) are non-vacuous: they stay
  meaningful post-GREEN and their partner (seed-divergence) reddens now.

**Load-bearing note for Dev (Yoda):**
1. **`Rng` is MUTABLE** — `{ seed: number }`, and `nextFloat`/`nextInt` advance `rng.seed`
   **in place** (the sanctioned battlezone local-cursor pattern; see `src/shared/rng.ts`).
   Thread `state.rng` straight into `spawnIcbms` and carry the same object out — do **not**
   defensively clone it, and do **not** try to make it immutable. Determinism comes from each
   run starting at a fresh `createGame(seed)`, which the AC4 `toEqual` test pins.
2. **Order is the spec:** spawn(live targets) → fly ICBMs → fly ABMs → detonate ABM arrivals
   → damage(kill+score, then ground impacts) → age blasts → resolve(score, phase). The plan's
   task 7 gives the exact body.
3. **The `phase === 'over'` branch must return early** (`{ ...state, frame: state.frame + 1 }`)
   before any spawn/fly — the freeze test fails if the over-state flies its in-flight ICBMs.

**Delivery:** No upstream findings — the mc3-1/2/3 + mc1 substrate composes cleanly; every
module the loop consumes exists with the signatures the plan assumes.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `plugins/missile-command/src/core/game.ts` — grew `GameState` (added `icbms`, `cities`,
  `bases`, `score`, `phase`, `remaining`, `rng`) and rewrote `stepGame` to run the seven-step
  per-frame order, composing the mc3-1/2/3 + mc1 modules. `createGame(seed=1)` seeds a fresh
  fully-defended game. The `phase === 'over'` branch returns early (only `frame` advances).

**Tests:** 13/13 story tests GREEN; full missile-command project 470/470 (`testing-runner`
RUN_ID `mc3-4-dev-green`); `npm run lint` (repo-wide `tsc --noEmit`) clean. Purity and
citation sweeps stay green — game.ts introduces **no new numeric literal**, reusing `NICBMS`
(budget) and every scored/geometry constant from its already-cited sub-modules.

**Minimalism note:** the body is a straight composition — no helper, no abstraction beyond
what the tests demand. TEA's three load-bearing notes were honored exactly: (1) `state.rng` is
threaded straight through `spawnIcbms` and carried out on the same object — never cloned; (2)
the 7-step order matches the plan; (3) the over-branch returns before any spawn/fly, so the
freeze test (in-flight ICBMs not flown once over) passes.

**One correction to the plan's illustrative snippet** — see Design Deviations: the plan wrote
`scoreKills(state.score, killed)`, but `killed` is an `Icbm[]` and `scoreKills` takes a
count; implemented as `killed.length` to match AC2 ("adds 25 per kill") and satisfy `tsc`.

**Handoff:** To Reviewer (Obi-Wan) for the review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (470/470, lint clean, no smells) | N/A |
| 2 | reviewer-edge-hunter | Yes | Skipped | disabled | Disabled via settings — I covered boundary conditions myself (see [EDGE]) |
| 3 | reviewer-silent-failure-hunter | Yes | Skipped | disabled | Disabled via settings — no error paths in a pure reducer (see [SILENT]) |
| 4 | reviewer-test-analyzer | Yes | Skipped | disabled | Disabled via settings — I audited test quality + non-vacuity myself (see [TEST]) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 high, 1 medium (frame-order labels stale) | confirmed 1 (LOW/non-blocking), the medium is the same issue duplicated |
| 6 | reviewer-type-design | Yes | Skipped | disabled | Disabled via settings — I checked type invariants myself (see [TYPE]) |
| 7 | reviewer-security | Yes | clean | none (no attacker surface; bounded arrays) | N/A |
| 8 | reviewer-simplifier | Yes | Skipped | disabled | Disabled via settings — I checked for over-engineering myself (see [SIMPLE]) |
| 9 | reviewer-rule-checker | Yes | clean | none (41 rules / 61 instances, 0 violations) | N/A |

**All received:** Yes (4 ran, 5 disabled-and-pre-filled)
**Total findings:** 1 confirmed (LOW/non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The code composes the mc3-1/2/3 + mc1 modules into `stepGame` correctly and faithfully. The
full app suite is green (470/470, incl. purity + citations), lint is clean, the rule-checker
found 0 violations across 61 instances, and security found no attacker surface. The one
confirmed finding is a **LOW / non-blocking** documentation-accuracy issue (frame-order comment
numbering), captured under Delivery Findings — per the project severity rubric, Low/Medium do
not block, and the code's behavior is verified correct.

**Observations (all 8 dispatch tags present; disabled specialists covered by me):**

- **[RULE]** reviewer-rule-checker: **clean** — 41 checklist rules / 61 instances, 0 violations.
  It independently RE-RAN the purity (`-t purity` 20/20) and citation (`-t citation` 22/22)
  claims per checklist rule #17 rather than trusting the comments, and verified `createGame`'s
  new `seed = 1` default is backward-compatible with its 4 other call sites (`main.ts:18`,
  `render-field.test.ts:105/118/125`). Confirmed clean.
- **[SEC]** reviewer-security: **clean** — no HTTP/DOM/file/string input reaches this module;
  the only inputs are a `number` seed and the fed-back `GameState`. Every array (`cities` ≤6,
  `bases` ≤3, `icbms` ≤MXICON=7, `liveTargets` ≤9) is bounded by a compile-time constant, not
  attacker input. Object spreads operate on locally-typed core objects, never parsed JSON — no
  prototype-pollution vector. Verified against `spawn.ts:40` (`liveTargets.length===0` guard →
  no `nextInt(0)` div-by-zero).
- **[DOC]** reviewer-comment-analyzer: **confirmed, LOW/non-blocking** — the header "Frame order"
  list (`game.ts:20,22`), the docstring "seven-step order" (`:86`), the two inline labels
  (`:110` `(6) age`, `:115` `(5) damage`), and the test header (`game.test.ts:6-7`) number the
  steps damage(5)→age(6), but `stepGame` executes **age/merge-blasts then damage** (`:111` builds
  the current-frame `explosions` array — aged existing + fresh detonations, collapsed dropped —
  which `killIcbmsInBlasts` at `:116` then runs against). The runtime order is correct and
  deliberate (damage must run against the current-frame blasts); only the numbering is stale.
  See Delivery Findings for the exact relabel.
- **[EDGE]** *(edge-hunter disabled — I covered it):* traced the boundary paths. A fresh ABM
  detonation enters at `t=0` (radius 0 via `startExplosion`) so it kills nothing the frame it
  detonates — correct growth model. An ICBM that both arrives AND sits in a live blast the same
  frame is killed-and-scored by `killIcbmsInBlasts` and thus removed before `resolveGroundImpacts`
  — i.e. a last-second interception saves the structure AND scores, which is the desired ROM
  behavior, not a bug. `phase==='over'` early-returns before any spawn/fly (`:93`). No unbounded
  loops; every iteration is `map`/`filter` over a capped array. Empirically probed seeds 1–8:
  first structure death lands at frames 200–216, so no degenerate never-terminating attack.
- **[TEST]** *(test-analyzer disabled — I covered it):* all 13 tests carry meaningful, non-vacuous
  assertions (concrete values or cross-frame invariants). I specifically probed the one vacuity
  risk — the 260-frame monotonic-alive sweep (`game.test.ts` AC3) — and confirmed it is NON-vacuous:
  seed 4 kills 4 cities + 2 bases by frame 260, so the inner `expect(...alive).toBe(false)` fires.
  The exact-`===25` scoring test and the `launched+remaining===NICBMS` conservation test compute
  their LHS through real `stepGame`, and `NICBMS`/`25` are production constants — not test-local
  identities (corroborated by rule-checker #18/#26).
- **[TYPE]** *(type-design disabled — I covered it):* `GameState` is fully `readonly` (every field
  and every array `readonly T[]`), `Phase` is a string-literal union (no fragile numeric enum),
  `createGame(seed = 1)` takes a primitive, `stepGame(state): GameState` is a clean reducer
  signature. No `as any`, no non-null `!`, no `Record<string, any>`. Rule-checker corroborates
  (rules #1, #2, #5 clean).
- **[SIMPLE]** *(simplifier disabled — I covered it):* the body is a straight composition — no
  helper, no premature abstraction, no dead code. Each of the 7 steps is one `const`. This is the
  minimal wiring the tests demand; nothing to strip.
- **[SILENT]** *(silent-failure-hunter disabled — I covered it):* no `try/catch`, no `.catch()`,
  no swallowed errors, no silent fallback — a pure reducer with no error surface. Nothing to hide.
- **[VERIFIED]** the mutable-RNG threading is the sanctioned battlezone pattern, not a purity
  break — evidence: `game.ts:100` threads `state.rng` into `spawnIcbms`, which advances
  `rng.seed` in place (`src/shared/rng.ts` documents this), and the same object is carried out via
  `{...state}`. I empirically confirmed `stepGame` mutates its input's `rng.seed` (1 → 4167084903)
  and that `next.rng === g.rng`. Determinism holds because each `createGame(seed)` mints a fresh
  `{seed}` — the AC4 `toEqual` test (250 frames) and my 300-frame probe both pass. Complies with
  the core-purity rule as the explicitly-documented exception.
- **[VERIFIED]** no new numeric game constant — evidence: `game.ts` adds only `0` (initial
  frame/score) and `+1` (frame increment), both trivial; `NICBMS`/`MXICON`/`ICBM_KILL_POINTS` are
  consumed via imports. Citation sweep re-run green (22/22). Complies with the citations rule.

**Data flow traced:** `createGame(seed)` → `rng = createRng(seed)` → `stepGame` threads `state.rng`
into `spawnIcbms` (picks launch column `nextInt(rng, HMAX)` + target `nextInt(rng, liveTargets.length)`)
→ new ICBMs flown by `stepIcbm` → damage/score/phase → returned `GameState` fed back by the shell
next frame. Safe: no input escapes the seeded generator; the loop is a closed pure reducer.

### Rule Compliance

Against the TS/JS lang-review checklist and the project's core rules (this is the changed-file rubric):
- **Type-safety escapes (#1):** COMPLIANT — no `as any`/`@ts-ignore`/non-null `!` in `game.ts` or the test.
- **readonly on shared data (#2):** COMPLIANT — every `GameState` field + array is `readonly`.
- **Enum/exhaustiveness (#3):** N/A — `Phase` is a union; `stepGame` branches only on `=== 'over'`,
  which is exhaustive for the two-state phase (the general transition lives in `state.ts:nextPhase`).
- **Strict equality (#30):** COMPLIANT — `state.phase === 'over'`; no `==`/`!=` anywhere.
- **Module `.js` extensions (#5):** COMPLIANT — all 13 relative imports carry `.js`; `@shared/rng`
  is a package alias.
- **Comments assert a re-run mechanism (#17):** COMPLIANT for the purity/citation claims
  (independently re-run green); the frame-order NUMBERING is the LOW [DOC] finding below.
- **CORE PURITY:** COMPLIANT — no clock/ambient-entropy/browser/shell import; sanctioned seeded Rng only.
- **CITATIONS:** COMPLIANT — no new numeric constant.
- **core/shell one-way flow:** COMPLIANT — `stepGame` is a pure `(state) => state` reducer.

### Devil's Advocate

Let me argue this code is broken. First, the shared mutable RNG: `stepGame` advances
`state.rng.seed` in place and returns the *same* object, so `stepGame(g)` is not idempotent — call
it twice on one `g` and you get different games (I measured origin.h 154 vs 61). A careless
consumer that snapshots a state and re-steps it will silently desync, and a "save/rewind" feature
built later would corrupt the RNG. Second, the frame-order comment is *wrong*, and in a
ROM-fidelity project the comments ARE the spec-of-record — a future fidelity auditor could "correct"
the code to match the false comment (moving damage before aging) and shift every blast's kill window
by a tick, a real regression laundered through a doc fix. Third, scoring: `scoreKills(state.score,
killed.length)` counts blast kills only — an arrested ICBM that reaches the ground and is
destroyed by `resolveGroundImpacts` scores nothing; is that right, or a missed points path?
Fourth, `bases` carry `ammo` that this loop never decrements — is the whole magazine mechanic dead?
Fifth, `cursor` is never updated inside `stepGame` — is the crosshair frozen?

Rebuttals, with evidence. (1) The mutable RNG is the sanctioned fleet-wide "battlezone local-cursor"
pattern (`src/shared/rng.ts` header), and the ONLY supported usage is threading the returned state
forward, which every test and the shell do; determinism per-fresh-seed is proven (AC4 + my
300-frame probe). It is a documented sharp edge, not a defect — I record it as VERIFIED with a note,
not a finding. (2) The code order is correct and the comment is the stale artifact; my finding
direction is explicitly "renumber the comment to match the code," foreclosing the laundering risk.
(3) Ground-hit ICBMs scoring nothing is faithful: the ROM awards `ICBM_KILL_POINTS` for DOWNING an
ICBM (intercepting it), not for one that lands — a landed ICBM is a loss, not a score. Correct.
(4) `ammo` decrement and (5) cursor motion are the SHELL's job / a later story (firing input isn't
in the pure loop; mc3-4's scope is composition of what exists) — out of scope here, not regressions
(the mc1-4 stub also didn't move the cursor in `stepGame`). None of the five survives inspection as
a blocking defect.

**Handoff:** To SM for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

### Reviewer (code review)
- **Improvement** (non-blocking, LOW): the frame-order comment numbering is stale — it lists
  damage as step (5) before age-blasts (6), but `stepGame` executes age/merge-blasts THEN damage.
  Runtime is correct; only the labels are wrong. Affects `plugins/missile-command/src/core/game.ts`
  (header list at :20/:22, docstring "seven-step order" at :86, and the two inline labels at :110
  `(6) age`/:115 `(5) damage`) and `plugins/missile-command/tests/game.test.ts:6-7` (echoes the
  same order). Fix (a pure relabel, no behavior change): renumber so **(5) = age + merge blasts**
  (step existing, add fresh detonations, drop collapsed) and **(6) = damage** (blasts kill ICBMs +
  score, then arrived ICBMs kill structures), making the header list, the two inline labels (now
  ascending), and the test header all agree with execution order. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- **Score with `killed.length`, not the `killed` array**
  - Spec source: docs/superpowers/plans/2026-08-07-missile-command-mc3-core-loop.md, Task 7 Step 3 (game.ts snippet)
  - Spec text: `const score = scoreKills(state.score, killed)`
  - Implementation: `const score = scoreKills(state.score, killed.length)`
  - Rationale: `killIcbmsInBlasts` returns `killed: Icbm[]`, but `scoreKills(score, killed: number)` takes a COUNT. The plan snippet is self-inconsistent (its own prose and AC2 say "+25 per kill"); passing the array yields `NaN` and a `tsc` type error. `killed.length` is the kill count (per damage.ts's own doc) and matches the higher-authority AC.
  - Severity: trivial
  - Forward impact: none — matches AC2, the plan's prose, and damage.ts's documented contract; corrects a typo in a lower-authority illustration only.

### Reviewer (audit)
- **Dev's `killed.length` deviation** → ✓ ACCEPTED by Reviewer: correct and necessary. `killIcbmsInBlasts` returns `Icbm[]`; `scoreKills(score, killed: number)` takes a count. Passing the array yields `NaN` and a `tsc` error; the plan snippet was self-inconsistent with its own prose and AC2 ("+25 per kill"). The exact-`===25` test (`game.test.ts` AC2) proves the correct value flows through. Matches the higher-authority AC per the spec hierarchy.
- No undocumented deviations found. `stepGame`'s age-then-damage execution order differs from the plan's *prose* numbering (damage-then-age), but the plan's own CODE does age-then-damage, so the code matches the plan's implementation; the residual mismatch is a comment-numbering issue, logged as the LOW [DOC] Delivery Finding above rather than a code deviation.