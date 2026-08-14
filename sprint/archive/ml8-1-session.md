---
story_id: "ml8-1"
jira_key: "ml8-1"
epic: "ml8"
workflow: "tdd"
---
# Story ml8-1: Mutation battery over the CONWAY Life field

## Story Details
- **ID:** ml8-1
- **Jira Key:** ml8-1
- **Repos:** arcade
- **Workflow:** tdd
- **Stack Parent:** none
- **Points:** 5
- **Branch:** feat/ml8-1-conway-life-mutation-battery
- **PR:** 380
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

## Story Overview

This is a **title-only story** with acceptance criteria derived from the title and measured facts.

**Title:** "Mutation battery over the CONWAY Life field (ml3-4): the highest-novelty, no-sibling reducer. Mutate the growth/death generation logic and the seeded-field golden; every mutant that reddens nothing is a finding. File survivors as file-surface-grouped stories."

**Nature:** Mutation-battery hardening story. The CONWAY Life field reducer (`plugins/millipede/src/core/conway.ts`, delivered in ml3-4) stands alone without sibling reducers to cross-check it (unlike the enemy reducers: beetle/spider/dragonfly/bee). Systematic mutation coverage is the only guard on its correctness, making it the highest-value mutation target.

**Key reducer under test:**
- `plugins/millipede/src/core/conway.ts` — ~12KB
- Exports: `initConway()`, `masterStep(field: Uint8Array, state: ConwayState): ConwayState`
- `masterStep()` contains the growth/death generation logic and is the primary mutation target

**Existing test suite:**
- `plugins/millipede/tests/conway.test.ts`
- 5 AC groups: AC-1 (constants/init), AC-2 (sweep mechanics/purity), AC-3 (births/survival/death/poison/DDT/edges), AC-4 (stage animation/termination/cleanup), AC-5 (seeded-field golden generation with `GOLDEN_FINAL_ROWS` and `seededField()` fixture)
- AC-5's golden fixture is the "seeded-field golden" the title names as a mutation target

## Derived Acceptance Criteria

**AC-1: Systematically mutate masterStep() and helper functions**
- Identify all growth/death generation logic in `masterStep()` and helper functions within `conway.ts`
- Create a mutation plan documenting each mutation site and the mutation operator (e.g., logic inversion, constant changes, boundary condition flips)
- Apply mutations one at a time

**AC-2: Mutate the seeded-field golden fixture**
- Mutate `GOLDEN_FINAL_ROWS` constant in the test file
- Mutate the `seededField()` fixture to alter initial conditions
- Document each mutation

**AC-3: Run test suite after each mutation**
- Execute `npx vitest run --project millipede` after each mutation
- Record whether the mutant causes any test failures (RED)
- Document each mutant's result

**AC-4: Identify coverage gaps**
- Any mutant that reddens NOTHING is a coverage gap (finding)
- Collect all surviving mutants that do not cause test failures
- Classify survivors by their location: conway.ts growth/death logic or test fixture golden

**AC-5: File survivors as follow-up stories**
- For each surviving mutant, create a new story
- Group stories by file surface (e.g., "Mutation hardening: masterStep() line X" vs "Mutation hardening: golden fixture variant Y")
- Include mutation operator and expected RED phase coverage in the filed story title
- Survivors out of this story's scope remain open as routed findings

**AC-6: Document all findings**
- In the RED phase, add tests that kill surviving mutants (turning gaps into guards)
- Record all findings in the session file's "Delivery Findings" section
- Include both accepted gaps (filed as stories) and gaps turned into guards (new test coverage added in RED)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-14T18:17:38Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-14T17:38:11Z | 2026-08-14T17:41:19Z | 3m 8s |
| red | 2026-08-14T17:41:19Z | 2026-08-14T17:57:20Z | 16m 1s |
| green | 2026-08-14T17:57:20Z | 2026-08-14T17:58:38Z | 1m 18s |
| review | 2026-08-14T17:58:38Z | 2026-08-14T18:17:38Z | 19m |
| finish | 2026-08-14T18:17:38Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **Improvement / non-blocking:** The mutation battery found NO code defect in ml3-4's `conway.ts` — every mutant that altered behaviour was either caught by the ml3-4 suite or was a *test*-coverage gap (the code was already faithful). conway.ts is unchanged by this story. The eight gaps lived entirely in the test suite and are now closed.
- **Observation / non-blocking (fixture robustness, no action):** The AC-5 golden compares only the FINAL field, so it cannot distinguish convergent seed variations — a damaged mushroom (0x7E) regrows to 0x7F just like a seeded 0x7F, and a lone interior mushroom dies to 0x00 regardless of column. Mutating those seed cells leaves the golden green. Not a gap: the regrow and lone-death mechanisms are pinned by the AC-3/AC-4 intermediate-state tests. Recorded so a future reader does not mistake it for missing coverage.

<!-- Reviewer appends below this marker -->
### Reviewer (code review)
- **Gap** (non-blocking): A supplementary Reviewer mutation battery over the edge-column *scan geometry* (a surface TEA's 44-mutant battery did not probe) found four survivors. Two are EQUIVALENT (differential-probe confirmed over 300 edge fields): the `colmax` edge-extents for columns 28/29 (`0x80`/`0x60`) — the extra scan reads off-screen cells as zero, same class as ml8-1's M07. **Two are REAL reachable gaps**: the column-0 template-start seeds `x = 0x0A` and `y = 0x40` (`conway.ts:114-115`) — mutating either changes the left-edge neighbourhood scan on constructible fields (digest diverged). Affects `plugins/millipede/src/core/conway.ts` (needs guards for the col-0 edge seed) — **filed as ml8-4** (2pt, ml8, arcade, tdd). Out of the core generation-rule surface ml8-1 targeted; routed per the story's own "file survivors as file-surface-grouped stories" clause. *Found by Reviewer during code review.*
- No other upstream findings.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No design deviations yet

### Reviewer (audit)
No spec deviations were logged by TEA or Dev, and the review found none to add: `conway.ts` is unchanged (no production spec to deviate from), and the six guards assert ROM-cited picture-code bytes consistent with conway.ts's own CW-* documentation. Nothing to stamp ACCEPTED/FLAGGED — the section is legitimately empty.

## SM Assessment

**Title-only story — premise measured against the current tree before setup (all confirmed):**
- `plugins/millipede/src/core/conway.ts` exists (ml3-4's CONWAY Life field, ~12KB). Behavioural exports `initConway()` and `masterStep(field, state)` — `masterStep` holds the growth/death generation logic the title names as the mutation target. It also owns named ROM constants (PLYFLD_*, DDT, DEATHS, GROWTH, POISON, NORMAL, MAXPH, EDGE).
- `plugins/millipede/tests/conway.test.ts` exists with five AC groups; AC-5 "the seeded-field golden generation" holds `GOLDEN_FINAL_ROWS`, the `seededField()` fixture, and a fixture self-check — this is the "seeded-field golden" the title names.
- "no-sibling reducer" is the story's RATIONALE, not a falsifiable claim: the field reducer has no twin (unlike beetle/spider/dragonfly/bee), so mutation coverage is its only guard.
- No either/or fork in the title → no pre-RED user ruling needed. ACs were DERIVED (description + AC both null in the epic YAML) and grounded in these facts.

**Contention:** no branch existed for ml8-1 at setup; the only live sibling session (a-2, ml7-7) is a POKEY audio sweep that does not touch conway.ts. Claim (context + `in_progress` stamp) committed and pushed on `feat/ml8-1-conway-life-mutation-battery` so the branch probe lights up.

**For TEA (RED phase) — this is a mutation-battery hardening story, not a feature.** The deliverable is: mutate the growth/death logic in `masterStep`/helpers AND the golden (`GOLDEN_FINAL_ROWS`/`seededField()`), run `npx vitest run --project millipede` per mutant, and treat every mutant that reddens NOTHING as a coverage-gap finding. RED = add tests that kill the survivors (turn gaps into guards); survivors out of this story's scope get filed as file-surface-grouped follow-up stories (that filing is AC-5). Relevant traps from prior mutation batteries: mutation DIRECTION must be restrictive (a permissive mutant can't fail `.toBe(true)`); a slurped/`perl -0` mutant can hit the WRONG duplicate — confirm each survivor with `git diff` before believing it; and `conway.test.ts` is a TRACKED file so `git checkout --` restores mutations cleanly, but COMMIT any round-1 fixes before running the next mutation battery over the same file.

**Verdict:** Setup complete, story sound, ready to hand off to TEA for RED.

## TEA Assessment (RED)

**Deliverable shipped:** 6 mutation-battery guard tests appended to
`plugins/millipede/tests/conway.test.ts` (`describe('ml8-1 — mutation-battery
guards for ml3-4 conway.ts')`), commit `2c40a55d`. `conway.ts` is UNCHANGED —
this is a coverage-hardening story; the ROM port was already faithful.

**Battery run (the RED evidence).** A 44-mutant battery over `conway.ts`'s
growth/death generation logic (harness + catalog in the session scratchpad) plus
a 5-mutant golden/fixture battery over `conway.test.ts`. Every mutant applied by
exact single-match (no wrong-duplicate risk), suite run per mutant, source
restored by `git checkout` between mutants (verified clean after every pass).

- **Before guards:** killed 35/44, **9 code survivors** (all re-confirmed as true
  survivors against the WHOLE millipede project — killed 0/9, so nothing
  downstream caught them either).
- **After guards:** killed **43/44**; the single remaining survivor is the
  equivalent mutant M07.

**Survivor dispositions (AC-4 → AC-5/AC-6):**

| Mutant | Gap | Disposition |
|--------|-----|-------------|
| M01 | idle path returned the input object, not a fresh copy | guard (idle-path purity) |
| M02/M03 | MASTER row-gate untested for GROWTH/DEATH *stage* values at rows 0 / 0x1E (the AC-2 test seeds only NORMALs + score digits, which growdie/cleanup skip regardless) | guard |
| M09 | DDT **stamp-2-only** adjacency (`v === DDT + 1`) — every AC-3 case sits the victim beside both stamps | guard |
| M14 | a `0x71` (== DEATHS) death stage as a **counted neighbour** — lower bound `v >= DEATHS` never pinned at DEATHS itself | guard |
| M18/M19 | birth is **exactly-3**; 4- and 8-neighbour blank overcrowding never pinned (AC-3's plus-cross has the centre OCCUPIED) | guard (both, one test) |
| M40 | CLEANUP freezes poison at band **boundary 0x78**; AC-4 uses only mid-band 0x79 | guard |
| M07 | dropping startgr's own `row >= 0x1E` gate | **EQUIVALENT MUTANT** — MASTER only calls startgr for rows 1..0x1D, so the disjunct is unreachable; faithful port of MUSHE1's gate (CW-26/27). Documented, unguarded, **no follow-up story** (no input can reach it). |

**AC-5 note for the Reviewer:** there are **no out-of-scope survivors to file as
follow-up stories**. All eight real gaps were closable in-scope and closed in
RED; the ninth is a true equivalent mutant. Do not expect filed follow-up story
IDs — the correct outcome here is zero.

**Non-vacuity is proven, not asserted.** Each of the 6 guards passes on faithful
code AND was re-run under its named mutant with the guard present — every one
reddens (the `killed 43/44` line above is that proof). The two golden/fixture
"survivors" (G3/G5) are convergent-seed artifacts, not gaps — see Delivery
Findings.

**Verification:** full millipede project `npx vitest run --project millipede` =
**1081/1081 green** (65 files); `npm run lint` (tsc --noEmit, repo-wide) clean;
`git status` shows only the committed test file changed, `conway.ts` untouched.

### Rule Coverage (lang-review: typescript.md)
- **#15 — "Every guard must be mutation-tested: delete the mechanism and require
  red."** This story is the literal embodiment of that rule: every guard was
  authored *from* a surviving mutant and shown to redden under it.
- **#18 — "A test helper that REIMPLEMENTS a platform algorithm is untested
  code."** The guards reuse only geometry (`idx`, `emptyField`) and process-driver
  helpers (`runPhase0`/`runSweep`/`runToIdle`, which merely call `masterStep`) —
  none reimplements conway's generation logic. Expected bytes are hand-derived
  literals, consistent with the file's FIXTURE DERIVATION note.
- **Meaningful assertions:** every guard asserts concrete picture-code bytes
  (`.toBe(0x7b)`, `.toBe(0)`, …) or object identity (`.not.toBe`) — no
  `assert(true)`, no `is*` on an always-constant value.

**GREEN-phase note for Dev (Loki):** there is **nothing to implement** —
`conway.ts` is faithful and needs no change. The guards already pass on current
code; their "RED" was demonstrated per-mutant by the battery, which is the
correct shape for a mutation-hardening story (AC-6). Your GREEN is a verification
pass: confirm the full millipede suite is green and lint is clean (both are, as
of this handoff), run the simplify fan-out if the workflow calls for it over the
one changed test file, then hand to the Reviewer. Do not add production code to
manufacture a RED.

**Verdict:** RED complete. 8 coverage gaps closed by mutation-proven guards, 1
equivalent mutant documented, 0 code defects found, 0 follow-up stories owed.

## Dev Assessment (GREEN)

**No production code — by design.** This is a coverage-hardening story: TEA's
mutation battery proved `conway.ts` already faithful, so GREEN is a verification
pass, not an implementation. Adding production code to manufacture a RED would be
scope creep of the worst kind (changing a byte-verified ROM port to satisfy a
process ritual). Per the minimalist discipline, nothing was necessary and nothing
was written.

**GREEN verified on the current branch tip (`2c40a55d`, pushed):**
- `git status` clean — no uncommitted work.
- `git diff HEAD -- plugins/millipede/src/core/conway.ts` empty — the reducer is
  untouched; the only change this story makes is the 6 guard tests TEA committed.
- `npx vitest run --project millipede` → **1081/1081 green** (65 files).
- `npm run lint` (tsc --noEmit, repo-wide) → clean.

**No refactor / no simplify pass warranted.** The one changed file adds six guards,
each a distinct behavioural witness (idle-purity, row-gate on stages, DDT stamp-2,
DEATHS-boundary count, exact-3 birth, CLEANUP poison boundary). They share no
extractable structure worth abstracting, and collapsing their fixture-building
into a helper would risk lang-review #18 (a helper that reimplements the algorithm
under test). The expected bytes are hand-derived literals, consistent with the
file's FIXTURE DERIVATION note. Left as-is intentionally.

**For the Reviewer (Heimdall):** the deliverable to scrutinise is the *guards'
non-vacuity*, not any source change. Every guard passes on faithful code and was
re-run under its named mutant (TEA's `killed 43/44`); the harness + mutant catalog
live in the session scratchpad if you want to reproduce. Note AC-5's correct
outcome is **zero filed follow-up stories** — all real survivors were closed
in-scope, the ninth is a documented equivalent mutant.

**Verdict:** GREEN confirmed. Handing to review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1081/1081 green, lint clean, conway.ts absent from diff |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 1 (low) | confirmed 0, dismissed 0, deferred 1 (M02/M03 docstring overstates "cleanup"; guard still sound — non-blocking dormant) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A — all 6 guard comments verified accurate against conway.ts |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | N/A — 30 rules / 47 instances, 0 violations; all 8 mutants independently re-verified RED in an isolated worktree |

**All received:** Yes (4 enabled returned, 5 disabled; 1 low finding deferred)
**Total findings:** 0 confirmed blocking, 0 dismissed, 2 deferred (1 subagent-low docstring nit + 1 Reviewer-found coverage gap routed to ml8-4)

### Rule Compliance (lang-review: typescript.md)
Enumerated every applicable rule against the six new guards (test-only diff; `conway.ts` untouched):
- **#8 / #26 (test quality, non-local assertions):** COMPLIANT — every guard asserts concrete post-run field bytes (`.toBe(0x7b/0x75/0x78/0x7d/0)`) or object identity (`.not.toBe`); none shares a literal between fixture and expectation; no `.only/.skip`, no `as any`. Enumerated all 6 — verified individually.
- **#15 (every guard mutation-tested):** COMPLIANT and EMPIRICALLY VERIFIED — I re-ran all 8 named mutants (M01/M02/M03/M09/M14/M18/M40, and M19 via the 8-neighbour arm); each reddens exactly its named guard. The rule-checker independently confirmed the same in an isolated worktree.
- **#18 (helper reimplements the algorithm / fails-by-passing):** COMPLIANT — the guards reuse only `idx`/`emptyField` (geometry) and `runPhase0`/`runSweep`/`runToIdle` (which only call `masterStep`); no helper recomputes neighbour counts or picture codes. Expected bytes are hand-derived ROM literals per the file's FIXTURE DERIVATION note.
- **#17 / #20 (comment mechanism re-run, count not from same diff):** COMPLIANT — comment-analyzer + rule-checker both verified every prose claim (incl. the M07 equivalence and the "MASTER calls startgr only for rows 1..0x1D" claim) against conway.ts.
- **#7 (async/await in tests):** COMPLIANT — every `it(async …)` awaits `loadConway()`.
- Rules #1-6, #9-14, #16, #19, #21-25, #27-30: N/A to a pure node-env test diff (no types/enums/JSX/error-handling/security-surface/config/UI added).

### Devil's Advocate
Assume these guards are worthless and the story is a wash. First attack: the guards **pass on faithful code**, so how do I know they test anything? A guard that asserts `f[idx(11,11)] === 0x75` proves nothing if 0x75 is what the cell holds no matter what the code does. Rebuttal: I did not trust the prose — I re-applied each named mutation to `conway.ts` and watched exactly that guard, and only that guard, redden (M09→0x74 not 0x7b, M14→no birth, M18→spurious birth, M40→0x7f not 0x78). A test that flips red under the precise defect it names is by definition non-vacuous. Second attack: maybe the guards pass by luck of **sweep order** — a seeded neighbour might be overwritten before the target cell reads it, so the assertion holds for the wrong reason. Rebuttal: the test-analyzer independently traced the column-major `addr = col*0x20+row` order for every fixture (including the cascading self-deaths in the plus-cross, where an arm dies to 0x74 but a death stage still counts) and confirmed each target reads the claimed values. Third attack: the expected bytes could be **circular** — copied from a helper that re-implements Conway. Rebuttal: no such helper exists; the drivers only call `masterStep`, and the literals trace to conway.ts's own documented arithmetic (POISON+3 at :169, NORMAL−DEATHS at :174, +7 at :228). Fourth attack, the one that landed: the battery is **not exhaustive** — a mutation-hardening story that leaves reachable survivors is incomplete. This is real: my supplementary battery over the edge-column scan geometry (a surface TEA never touched) found two EQUIVALENT survivors (colmax extents) and, crucially, **two REACHABLE ones** — the column-0 template-start seeds `x=0x0A`/`y=0x40`, confirmed distinguishable by a 300-field differential probe. But "not exhaustive" is not "broken": the story's own method routes survivors on a distinct file surface to a filed follow-up, which is exactly what ml8-4 now is. Fifth attack: what if `conway.ts` was secretly changed and the guards mask a regression? Rebuttal: `git diff develop...HEAD` shows conway.ts is not in the diff at all, and the full 1081-test suite is green. The code the guards protect is the same byte-verified ml3-4 port. Nothing here is broken; the only gap found is scoped, reachable, and filed.

## Reviewer Assessment

**Verdict:** APPROVED

**What was reviewed:** a test-only diff — six mutation-battery guards appended to `plugins/millipede/tests/conway.test.ts`; `plugins/millipede/src/core/conway.ts` is unchanged (`git diff develop...HEAD` confirms).

Observations (≥5, most tagged by source):
- `[VERIFIED]` All 8 named mutants redden exactly their guard and nothing else — I re-applied each to `conway.ts` and re-ran the suite; evidence: M09→`f[idx(5,14)]` 0x74 not 0x7b, M40→`f[idx(21,20)]` 0x7f not 0x78, etc. Guards are non-vacuous.
- `[RULE]` reviewer-rule-checker: 30 rules / 0 violations, and it independently re-verified the same 8 RED mutants in an isolated `git worktree` (immune to the concurrent battery race) — the strongest possible corroboration of #15/#18.
- `[DOC]` reviewer-comment-analyzer: all six guard comments accurate against conway.ts, including the M07 equivalence claim and the "MASTER calls startgr only for rows 1..0x1D" gate claim.
- `[TEST]` reviewer-test-analyzer (LOW, deferred): the M02/M03 guard's docstring says "growdie/cleanup" but that fixture reaches only growdie (NGROWN stays 0 → jumps past the cleanup sweep). The guard still kills the mutant via the shared `conway.ts:243` gate, so it is sound; the wording merely overstates. Non-blocking dormant — a future editor of this file (e.g. ml8-4) can tighten it.
- `[VERIFIED]` M07 (dropping startgr's own `row >= 0x1E` disjunct) is a true equivalent mutant — `masterStep:243` already restricts startgr to rows 1..0x1D — confirmed it survives and correctly left unguarded/undocumented as a fidelity port.
- `[MEDIUM → routed]` My supplementary battery found 2 REACHABLE survivors in the column-0 edge-seed scan (`x=0x0A`/`y=0x40`, `conway.ts:114-115`), differential-confirmed, plus 2 equivalent colmax extents. Out of the core generation-rule surface this story targeted; **filed as ml8-4** per the title's file-survivors clause. Does not block (Medium, and the story's method sanctions routing).

**Data flow traced:** seeded `Uint8Array` field → `masterStep` sweep → asserted picture-code bytes; safe because every expected byte traces to conway.ts's own CW-* arithmetic, not to a reimplementing helper.
**Pattern observed:** mutation-proven guards (author the guard *from* a surviving mutant, prove it reddens) at `conway.test.ts:696-808` — the exact discipline lang-review #15 demands.
**Error handling:** N/A (pure deterministic reducer; no I/O, no failure surface).
**Handoff:** To SM for finish-story.