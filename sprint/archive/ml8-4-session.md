---
story_id: "ml8-4"
jira_key: "ml8-4"
epic: "ml8"
workflow: "tdd"
---
# Story ml8-4: Mutation battery: column-0 edge-seed template start in conway.ts

## Story Details
- **ID:** ml8-4
- **Jira Key:** ml8-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml8-4-mutation-battery-conway-col0-edge-seed
- **PR:** https://github.com/slabgorb/arcade/pull/414

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-15T13:03:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-15T12:03:52Z | 2026-08-15T12:06:06Z | 2m 14s |
| red | 2026-08-15T12:06:06Z | 2026-08-15T12:21:16Z | 15m 10s |
| green | 2026-08-15T12:21:16Z | 2026-08-15T12:29:04Z | 7m 48s |
| review | 2026-08-15T12:29:04Z | 2026-08-15T13:03:59Z | 34m 55s |
| finish | 2026-08-15T13:03:59Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation)
- No deviations from spec.

## Sm Assessment

This story is a 2-point mutation-battery hardening task routed from the ml8-1 review. The deliverable is regression guards over the CONWAY Life field's column-0 edge-seed template (x=0x0A, y=0x40). Two mutants are confirmed reachable and differentiable over 300 edge fields; two additional mutants (colmax edge-extents, cols 28/29) are equivalent and documented per ml8-1 M07, not guarded.

**Measured Premises (from ml8-1 review, do not re-derive):**
- Surface: plugins/millipede/src/core/conway.ts + plugins/millipede/tests/conway.test.ts
- TWO REACHABLE SURVIVORS: the COLUMN-0 template-start seeds x=0x0A and y=0x40. **Line citation corrected by SM (see below):** the ml8-1 review cited `conway.ts:114-115`, but those lines now hold the COLUMN-1 seed (x=5, y=0x20 — the WRONG duplicate). The column-0 seeds x=0x0A/y=0x40 currently live at **conway.ts:109-110** (the `// column 0` block at :108). ANCHOR ON THE VALUES (x=0x0A/y=0x40, column-0), not the line number — confirm with `git diff` before believing any mutant (this IS the "slurped mutant hits the wrong duplicate" trap the ml8-1 review warned of).
- TWO EQUIVALENT MUTANTS: colmax cols 28/29 (0x80/0x60) — reads off-screen as zero, same class as ml8-1 M07, do not guard
- Dormant nit (optional): M02/M03 guard docstring says "growdie/cleanup" but fixture reaches only growdie (NGROWN stays 0)

**TDD Traps (carried from ml8-1):**
- Mutation direction must be RESTRICTIVE
- Confirm each survivor with `git diff` before believing it
- conway.test.ts is tracked; `git checkout --` restores mutations cleanly
- COMMIT round-1 fixes before the next battery over the same file

## Tea Assessment (RED)

**Test-only hardening battery. conway.ts is byte-correct and UNCHANGED** — the
survivors were missing regression coverage, not wrong values. One new guard added
to `plugins/millipede/tests/conway.test.ts` in a `describe('ml8-4 …')` block:
one test asserting three column-0 cells on a busy left-3-columns fixture. Full
millipede project: **1261 pass** (was 1260); repo-wide `tsc --noEmit` clean.

**AC (defined this phase, none in YAML):**
- AC-1: A guard reddens when the column-0 GRCODE start index `x=0x0a`
  (conway.ts:109) is mutated, incl. the column-1 duplicate value 5.
- AC-2: A guard reddens when the column-0 field-offset start `y=0x40`
  (conway.ts:110) is mutated, incl. the column-1 duplicate value 0x20.
- AC-3: The two `colmax` equivalent mutants (cols 28/29, conway.ts:120/123) are
  documented and left UNGUARDED (ml8-1 M07 precedent).

**Mutation table — MEASURED this session** (busy fixture; witness cells
(0,3)=0x80, (0,8)=0x7f, (0,0x0a)=0x75; each row is the literal mutant applied to
a pristine conway.ts, full conway suite of 38 tests re-run, then restored):

| Mutant (exact) | conway suite result | Notes |
|---|---|---|
| `x = 0x0a` → `x = 5`   | **1 failed** / 37 | col-1 dup; ml8-4 guard is the SOLE killer (was a survivor) |
| `x = 0x0a` → `x = 0`   | 3 failed / 35     | broad; ml8-4 guard among killers |
| `x = 0x0a` → `x = 0x09`| caught (witness flip) | off-by-one, restrictive |
| `x = 0x0a` → `x = 0x0b`| caught (witness flip) | off-by-one, restrictive |
| `y = 0x40` → `y = 0x20`| **1 failed** / 37 | col-1 dup; ml8-4 guard is the SOLE killer (was a survivor) |
| `y = 0x40` → `y = 0x60`| 3 failed / 35     | broad; ml8-4 guard among killers |
| `y = 0x40` → `y = 0x41`| caught (witness flip) | off-by-one, restrictive |
| `y = 0x40` → `y = 0x3f`| caught (witness flip) | off-by-one, restrictive |
| `y = 0x40` → `y = 0`   | caught (witness flip) | window origin to base |
| `colmax = 0x60` → `0x80` (col29) | **38 pass** (survives) | EQUIVALENT — not guarded (M07 class) |
| `colmax = 0x80` → `0xa0` (col28) | **38 pass** (survives) | EQUIVALENT — not guarded (M07 class) |

The two "wrong duplicate" survivors (`x→5`, `y→0x20`) each redden EXACTLY the new
guard and nothing else — direct proof it is their specific killer. The two colmax
mutants leave the whole suite green (no reachable input distinguishes them),
corroborating the ml8-1 review's 300-field differential-equivalence finding; left
unguarded per the M07 precedent (documented in the test's block comment).

**Rule Coverage:**
- Test quality (meaningful assertions): PASS — three concrete `toBe(byte)`
  assertions, no vacuous `is*`/`assert(true)`; each mutation-verified to flip.
- No helper reimplements the algorithm under test (lang-review): PASS — the
  fixture is 13 literal placements; expected bytes are literals, not computed.
- src/core purity: N/A — no production code touched (conway.ts unchanged).
- Determinism: PASS — pure `masterStep` over a fixed field; no clock/entropy.

**No upstream findings.** Dormant nit from ml8-1 (M02/M03 docstring overstates
"growdie/cleanup") left as-is: it is on a DIFFERENT test than this story's guard
and is non-blocking; not touched to keep the diff scoped to the col-0 seed.

**GREEN phase is a no-op:** the production code is already faithful, so there is
no failing behavior for Dev to implement. Route to Dev to confirm green (suite +
lint) and advance to review, or fast-path to review.

**Commit:** `f5262158` test(ml8-4): guard the column-0 edge seed in startgr.

## Dev Assessment

**Implementation Complete:** Yes (no production change required)
**Files Changed:**
- None. `plugins/millipede/src/core/conway.ts` is byte-identical to develop
  (`git diff develop -- …/conway.ts` is empty). This is a test-only hardening
  battery: the two reachable survivors were missing regression coverage, not
  wrong values, so the faithful col-0 seed already satisfies TEA's guard.

**Tests:** millipede project **1261/1261** passing (GREEN); conway suite 38/38;
repo-wide `tsc --noEmit` clean.
**Branch:** feat/ml8-4-mutation-battery-conway-col0-edge-seed (pushed)

**Minimalist note:** Deliberately touched no source. Editing conway.ts would be
scope creep and would risk the byte-verified ml3-4 port; the guard passes on
faithful code by design. The colmax equivalents remain unguarded per TEA/M07.

**Handoff:** To review.

### Delivery Findings Capture
- No upstream findings during implementation.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Yes (disabled) | Skipped (disabled via settings) | N/A | hand-covered — see [EDGE] |
| 3 | reviewer-silent-failure-hunter | Yes (disabled) | Skipped (disabled via settings) | N/A | hand-covered — see [SILENT] |
| 4 | reviewer-test-analyzer | Yes (disabled) | Skipped (disabled via settings) | N/A | hand-covered — see [TEST] (1 LOW finding) |
| 5 | reviewer-comment-analyzer | Yes (disabled) | Skipped (disabled via settings) | N/A | hand-covered — see [DOC] |
| 6 | reviewer-type-design | Yes (disabled) | Skipped (disabled via settings) | N/A | hand-covered — see [TYPE] |
| 7 | reviewer-security | Yes | clean | none | N/A |
| 8 | reviewer-simplifier | Yes (disabled) | Skipped (disabled via settings) | N/A | hand-covered — see [SIMPLE] |
| 9 | reviewer-rule-checker | Yes | findings | 1 flag (#18), 0 violations | confirmed 1 (LOW, non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled ran — preflight clean, security clean, rule-checker 1 LOW flag; 6 disabled via `workflow.reviewer_subagents`, each hand-covered below)
**Total findings:** 1 confirmed (LOW, non-blocking), 0 dismissed, 0 deferred

## Reviewer Assessment

**VERDICT: APPROVED** (1 LOW, non-blocking finding recorded for optional follow-up).

**What was reviewed:** the ml8-4 diff (`git diff develop...HEAD`) — one new
`describe('ml8-4 …')` block (73 lines) in `plugins/millipede/tests/conway.test.ts`
guarding the column-0 edge seed of `startgr`, plus sprint bookkeeping
(`sprint/epic-ml8.yaml` status→in_progress, generated `context-story-ml8-4.md`).
Production code `conway.ts` is byte-identical to develop (confirmed by preflight,
security and rule-checker independently). I read the full diff and the whole
`conway.ts` seed geometry (lines 99-186) myself, and re-derived the col-0 scan
(temp2 = addr-0x42; x=0x0a starts GRCODE at template column 2; y=0x40 origins the
field walk over cols 0..2, rows ±2).

### Observations

- **[VERIFIED] The guard kills both reachable survivors (x=0x0a, y=0x40).**
  Evidence: `conway.test.ts:874` (0,0x0a)=0x75 flips to 0x00 under x→5, x→0x0b,
  y→0x20/0x3f/0x60/0; `conway.test.ts:879` (0,3)=0x80 flips to 0x75 under x→0,
  y→0x20/0x41/0x60 — cross-confirmed by rule-checker's live per-mutant matrix.
  Rule check: complies with lang-review #15 (asserts real `masterStep` output, not
  source text) and #26 (LHS is genuine module output, not a test-local identity).
- **[RULE][TEST] (LOW, non-blocking) The `(0,8)===0x7f` assertion is redundant and
  carries the #18 "fixture value IS the expectation" shape.** `conway.test.ts:870`
  asserts 0x7f while the fixture seeds (0,8)=0x7f. rule-checker's blast-radius
  matrix shows it IS sensitive (flips to 0x74 under x→5, x→9, y→0x41 — so not
  vacuous by the letter of #18) but it never uniquely catches any of the 9 named
  mutants: every mutant that flips (0,8) also flips (0,0x0a) or (0,3). Confirmed as
  a genuine LOW finding — not dismissed, because it matches the documented #18
  pattern. Non-blocking: the guard's stated purpose (kill the two reachable col-0
  survivors) is fully met by the other two witnesses. Rule check: partial #18
  (shape present, substance absent — it discriminates the survive/die branch).
- **[DOC] Comments are accurate and were independently re-run.** rule-checker (#17)
  re-executed the block comment's two claims (per-seed mutant sensitivity; colmax
  equivalence) via live mutation and reproduced them exactly, and verified the
  citations `conway.ts:108-111` (109=`x=0x0a`, 110=`y=0x40`) and `:120/123`
  (colmax 0x60/0x80). The SM's setup-time line-citation correction (the ml8-1
  review's stale `:114-115`, now the col-1 seed, → the live `:109-110`) is correct.
  Rule check: complies with #17 (no stale/unrun mechanism claim).
- **[VERIFIED] The two equivalent mutants are correctly documented, not guarded.**
  Evidence: rule-checker mutated `colmax = 0x60 → 0x80` (col29) and
  `colmax = 0x80 → 0xa0` (col28) against the real file and ran the full 38-test
  conway suite — both 38/38 pass (survive), matching the ml8-1 M07 equivalent-mutant
  precedent. No reachable input distinguishes them. Rule check: consistent with the
  epic's "a mutant that reddens nothing is a finding, not redundancy — trace
  reachability first" — reachability was traced (off-screen cells read as zero).
- **[SEC] No security surface.** reviewer-security ran and returned clean: no I/O,
  no external input, no `JSON.parse`, no casts, no entropy — a closed deterministic
  assertion over a hardcoded `Uint8Array`. Dismissed (nothing to find).
- **[EDGE] Boundary handling is sound.** The story is itself an edge-column battery.
  The witnesses at rows 3/8/0x0a sit inside `startgr`'s gated range (rows 2..0x1d);
  the left edge (col 0) is guarded, the right-edge extents (cols 28/29) are the
  documented equivalents. No off-by-one in the fixture rows. Rule check: #21
  (degenerate numeric input) N/A — no external measured quantity.
- **[TYPE] No type surface.** The test introduces no new types; it reuses the
  existing `ConwayModule`/`ConwayState` interfaces and `Uint8Array`. No
  stringly-typed API, no `as` casts, no non-null assertions. N/A.
- **[SILENT] No swallowed errors.** The only error path is the pre-existing
  `loadConway()` which throws a descriptive error if the module is missing
  (`conway.test.ts:91-97`) — fails loud. The new test adds no try/catch. N/A.
- **[SIMPLE] Minimal apparatus, one redundancy.** The fixture is 13 literal
  placements and a single focused test; no over-engineering. The only simplification
  is the redundant (0,8) assertion already captured under [TEST].

### Rule Compliance

Project rules source: `CLAUDE.md` (src/core purity; ROM-fidelity; hardening-epic
grooming) + `.pennyfarthing/gates/lang-review/typescript.md` (checks 1-30). No
`SOUL.md` or `.claude/rules/*.md` in this repo. Enumerated against the one in-scope
`.ts` file:

**Rule: lang-review #15 — source-text assertions match a TOKEN not the CLAIM**
- `conway.test.ts:874,879,870` (the three assertions) — COMPLIANT: assert real
  `masterStep` byte output, not a grep over `conway.ts` source text.

**Rule: lang-review #18 — test apparatus that fails by PASSING (fixture value IS
the expectation)**
- `conway.test.ts:874` (0,0x0a)=0x75 (seeded 0) — COMPLIANT: transforms 0→0x75.
- `conway.test.ts:879` (0,3)=0x80 (seeded 0) — COMPLIANT: transforms 0→0x80.
- `conway.test.ts:870` (0,8)=0x7f (seeded 0x7f) — VIOLATION (LOW): literal echoes
  the seed; redundant across all 9 named mutants (see [TEST] finding).

**Rule: lang-review #23 — recorded mutant not re-runnable / red count not blast
radius**
- `.session` mutation table, 9 x/y rows + 2 colmax rows — COMPLIANT: every row is a
  complete, line-preserving single-literal swap; rule-checker reconstructed and
  re-ran each from the table text alone and reproduced the exact counts (incl.
  "1 failed | 37 passed" for x→5 with the ml8-4 test as sole failure); behavioural
  red is separated from the (nonexistent here) apparatus red.

**Rule: lang-review #26 — assertion whose terms are ALL local to the test**
- `conway.test.ts:870,874,879` — COMPLIANT: LHS `f[idx(...)]` is production output;
  RHS literals are hand-derived pins per the suite's established no-helper
  convention (`conway.test.ts` header ~40-52).

**Rule: CLAUDE.md — src/core purity (no clock/entropy in the sim)**
- `conway.ts` (unchanged) and the new test — COMPLIANT: no `Date.now`/`Math.random`;
  the purity guard still governs `conway.ts` and it is byte-identical to develop.

**Rule: CLAUDE.md — ROM fidelity / hardening (no production behaviour change)**
- `conway.ts` — COMPLIANT: zero diff vs develop; the byte-verified ml3-4 port is
  untouched, so no fidelity risk. The battery adds regression coverage only.

### Devil's Advocate

Assume this guard is worthless. The most damning line is `expect(f[idx(0, 8)])
.toBe(0x7f)` — the test both seeds (0,8) to 0x7f and asserts it is 0x7f, the exact
"identity dressed as a check" that lang-review #18 exists to catch. A reader could
conclude the whole story is a green-by-construction wash: three assertions on a
"busy" fixture whose bytes nobody can explain, dressed up with a 33-line comment
that merely *asserts* the seeds matter. Worse, the fixture is a single opaque
blob — if it is subtly wrong, every assertion is honest and the suite still passes,
measuring itself. And the mutation "proof" lives in a session file, not in the
suite: a future editor who trusts the prose but never re-runs the mutants ships a
weakened guard the moment they "tidy" the fixture. The colmax mutants are declared
equivalent and left unguarded — a convenient way to dodge coverage by calling a
survivor "equivalent." Finally, the story is a `type: refactor` that changed no
production code at all; what did it actually buy?

Rebuttal, point by point. The (0,8) echo is real and I have CONFIRMED it as a LOW
finding rather than waving it away — but it is redundant, not vacuous: the
rule-checker's independent per-mutant matrix shows it flips to 0x74 under x→5/9 and
y→0x41, so it discriminates the survive branch from the die branch; the guard's job
is nonetheless carried by (0,0x0a) and (0,3), both seeded-0→transform assertions
that each uniquely catch multiple mutants. The "opaque fixture / measures itself"
fear (#18's deeper form) is exactly what the rule-checker tested: it re-ran all 11
mutants against the real module and reproduced every byte and every pass/fail count
— so the fixture CAN distinguish a broken reducer, empirically, not by assertion.
The "proof only in prose" risk is answered by the committed test itself reddening
under the named mutants (preflight + rule-checker both re-ran the file), and by the
table being re-runnable per #23. "Dodging coverage as equivalent" was checked, not
trusted: both colmax mutants leave 38/38 green, which is the definition of an
equivalent mutant (no reachable input distinguishes them), and reachability was
traced (the extra scan reads off-screen cells as zero). And "changed no production
code" is the correct outcome for a hardening battery: the survivors were missing
regression coverage, not wrong values; editing the byte-verified ml3-4 port would
have been the actual defect. The one thing the devil surfaced that is worth acting
on is the (0,8) redundancy — recorded below, non-blocking.

### Delivery Findings (routed)
- **Improvement** (non-blocking): the `(0,8)===0x7f` guard assertion
  (`plugins/millipede/tests/conway.test.ts:870`) echoes its own seed value and is
  redundant — it never uniquely catches any of the 9 named col-0 mutants. A future
  tightening should either drop it or replace it with a seeded-0 cell that is the
  sole catcher of at least one mutant, removing the lang-review #18 shape. Affects
  `plugins/millipede/tests/conway.test.ts` (one assertion). *Found by Reviewer
  (rule-checker #18) during code review; correctness unaffected — the two reachable
  survivors are killed by the other two witnesses.*

**Verdict rationale:** correctness is sound (both reachable survivors killed;
equivalents correctly documented; production untouched; suite + lint green), the
sole finding is LOW and non-blocking, and the story's goal is met. **APPROVED.**