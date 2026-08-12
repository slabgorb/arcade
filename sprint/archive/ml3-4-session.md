---
story_id: "ml3-4"
jira_key: "ml3-4"
epic: "ml3"
workflow: "tdd"
---
# Story ml3-4: CONWAY Life field (the schedule risk — no sibling, no prose): port Cerny MASTER control (CONWAY.MAC:24) grow/kill of mushrooms + DDT clouds by Game-of-Life rules; INICON init (MLDEF.MAC:73). Pure reducer + a SEEDED-FIELD golden test proving the growth generations match the ROM algorithm.

## Story Details
- **ID:** ml3-4
- **Jira Key:** ml3-4
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml3-4-conway-life-field
- **PR:** #302
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T20:44:32Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T19:56:20.615783Z | 2026-08-12T19:58:36Z | 2m 15s |
| red | 2026-08-12T19:58:36Z | 2026-08-12T20:23:01Z | 24m 25s |
| green | 2026-08-12T20:23:01Z | 2026-08-12T20:25:24Z | 2m 23s |
| review | 2026-08-12T20:25:24Z | 2026-08-12T20:40:00Z | 14m 36s |
| green | 2026-08-12T20:40:00Z | 2026-08-12T20:44:24Z | 4m 24s |
| review | 2026-08-12T20:44:24Z | 2026-08-12T20:44:32Z | 8s |
| finish | 2026-08-12T20:44:32Z | - | - |

<!-- Review round 1 REJECTED: complete-phase misrouted to finish; phase
repaired to green per gates/dev-exit recovery_config (action: rework,
target_phase: green). Dev applies the Reviewer's F1-F5 fix list, then
re-review. -->

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Gap, non-blocking — TEA]** The MUSH count seam is deferred: CONWAY calls
  MUSHE1 at birth and MUSHDC at total death (MLSUB.MAC:742/707, claims
  CW-61/CW-63) to keep the per-half mushroom counts. Those reducers belong to
  story **ml3-3** (MUSHER/MUSHDC). When ml3-3 lands, wire CONWAY's birth and
  total-death sites to the count seam. Routed to: ml3-3.
- **[Gap, non-blocking — TEA]** Cocktail (CKIND bit 7, player 2 up) branches are
  not modelled — the reducer is upright-only (player area = rows < 7,
  CONWAY.MAC:46-48). Matches the centipede clone precedent. If cocktail ever
  becomes scope, it touches MSKORA row bands and the MUSHE1/MUSHDC row gates.
  Routed to: SM at finish (suggest ml8 hardening backlog or explicit wontfix).
- **[Question, non-blocking — TEA]** The story title says "DDT clouds"; the code
  interacts with the DDT BOMB stamps (DDT=$6E/DDT+1, MLDEF.MAC:203). Explosion
  clouds (CLOUD=$2E) never appear in CONWAY.MAC. Title premise measured; tests
  pin the actual mechanism (a bomb stamp in the inner ring poisons a normal
  mushroom to POISON+3). No code impact.
- **[Improvement, non-blocking — TEA]** MLDEF.MAC:408's comment ("NGROWN:
  NUMBER OF MUSHROOMS GROWN OR KILLED") is wrong: NGROWN stores the last
  advanced picture code and is only ever tested for zero (CONWAY.MAC:87-88,
  146, 158) — an activity marker, not a count. Claims CW-56/CW-58 pin the true
  semantics so the clone does not transcribe the lie.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

None

## Impact Summary

**Status:** Ready to ship — all delivery findings are non-blocking and routed.

**Blocking Issues:** 0
**Non-Blocking Findings:** 4 (all routed or deferred)

### Delivery Findings Summary

- **[Gap] MUSH count seam coordination (ml3-3):** CONWAY's birth/total-death call sites (MUSHE1/MUSHDC) will wire to the count reducer when ml3-3 lands. Currently tested and deferred by design.
  
- **[Gap] Cocktail mode scoped to future backlog:** Player 2 up (CKIND bit 7) branches not modelled in this port — matches centipede precedent. Routed to SM for optional ml8 hardening epic or explicit wontfix closure.
  
- **[Question] DDT clouds mechanism verified:** Title's "DDT clouds" premise measured against vendored source. Code correctly interacts with DDT bomb stamps (BOMB=$6E); explosion clouds (CLOUD=$2E) never appear in CONWAY.MAC. Mechanism pinned by tests (bomb stamp poisons normal mushroom to POISON+3). No impact.
  
- **[Improvement] MLDEF.MAC:408 comment corrected:** NGROWN is an activity marker (tested for zero at phase-advance checks), not a mushroom count — reflected in test comments, no code impact.

### Scope Boundaries (Intentionally Out-of-Scope)

- Coordinate with ml3-3 MUSHE1/MUSHDC wiring at ml3-3 landing time
- Cocktail (player 2) hardening → ml8 backlog or wontfix
- Scroll awareness & coordinate work → ml3-5 (separate story)

**Ready to merge and finish.

## Sm Assessment

Setup complete for ml3-4 (8 pts, p2, tdd). Session file, story context and epic
context created; feature branch `feat/ml3-4-conway-life-field` cut from `develop`;
story status set to in_progress. This is a title-only story — the title is the spec:
port the Cerny CONWAY.MAC MASTER control (CONWAY.MAC:24) Game-of-Life grow/kill of
mushrooms + DDT clouds, plus INICON init (MLDEF.MAC:73), as a pure reducer in
plugins/millipede/src/core, with a seeded-field golden test pinning growth
generations against the ROM algorithm. TEA should measure the title's premise
against the vendored Millipede source before writing RED tests, and define
acceptance criteria during RED (none recorded in the sprint YAML). Handing off to
TEA for the red phase.

## Tea Assessment

**RED complete.** 29 tests in `plugins/millipede/tests/conway.test.ts`; 28 fail
with the self-describing "src/core/conway.ts not built yet" error, 1 (the golden
seed self-check, which loads no module) passes. All 233 pre-existing millipede
tests stay green — including the ml1-1 citation gate byte-verifying the 63 new
CW-* claims in `docs/rom-study/claims/08-conway.json`. `npm run lint` and
`npm run test:orchestrator` pass. Verified by testing-runner (RUN_ID
ml3-4-tea-red). Committed as 71b32f75.

**Acceptance criteria (TEA-defined; title-only story, title measured against the
vendored source this session):**
- AC-1: `src/core/conway.ts` exports the cited constants (picture-code bands,
  MAXPH, EDGE, geometry) + `initConway()` (INICON port).
- AC-2: `masterStep()` reproduces MASTER's sweep mechanics — 16 cells/call in
  phase 0, 32 later, row gates (0, $1E, $1F untouched), phase advance at $13C0,
  NGROWN=0 early end, CDONE cleared past MAXPH; a pure reducer (no input-state
  mutation; field mutated in place as the ROM does).
- AC-3: STARTGR's generation setup, in place: birth on exactly 3 (or the $10
  poison-forced flag), survival on 1..3 (NOT classic 2..3), death on 0/4+/poison
  adjacency, DDT-stamp poisoning to POISON+3 (suppressed in the player area),
  damaged-normal regrowth mapping, EDGE=2 seeding on columns 0/29, letters and
  poison left alone, MSKORA background-bit re-imposition.
- AC-4: GROWDIE one-step-per-sweep animation with completion to NORMAL+3 /
  death to 0, NGROWN-driven termination, CLEANUP conversion (+7) at phase MAXPH.
- AC-5: the seeded-field golden — a 21-cell seed exercising every rule runs to
  idle in exactly 180 calls and matches a committed 30x32 byte snapshot.

**Fixture derivation:** every expected byte hand-derived from the cited 6502
lines, cross-checked against an uncommitted line-by-line transcription
(scratchpad only — deliberately NOT committed: a committed reference
implementation would be a second implementation of the algorithm under test).
Key in-place subtleties encoded in fixtures: fresh births ($75) never count as
neighbours while same-sweep conversions ($76/$77, $71-$74) do; a DDT-poisoned
cell acts as poison for cells later in the same sweep; row 1 is GROWDIE-only
territory; CLEANUP is reachable only when external damage (the player) keeps
NGROWN alive for all 7 GROWDIE sweeps — the test does that dance explicitly.

**Rule coverage (lang-review/typescript.md):**
- "A fixture whose value IS the expectation" — avoided: golden literals are
  hand-derived, never computed from the module under test.
- "A test helper that reimplements the algorithm is untested code" — no
  committed helper reimplements CONWAY; helpers are geometry + loop drivers.
- "Every guard must be mutation-tested" — the golden self-check pins the seed
  (21 non-zero cells) so a fixture edit fails loudly; assertions are exact
  byte equalities (restrictive direction), never truthiness.
- Citation accuracy — every constant/rule carries a CW-* claim whose verbatim
  was read from the vendored tree programmatically (no hand transcription) and
  is byte-gated by check-citations.

**For Dev (GREEN):** port INICON (CONWAY.MAC:11-22) and MASTER
(CONWAY.MAC:25-114) with STARTGR/GROWDIE/CLEANUP (:165-319/:131-162/:117-128)
into `src/core/conway.ts` exactly as the header of conway.test.ts specifies.
The GRCODE template is CONWAY.MAC:320-327. Mind: TEMP2 = addr − $42 (derived,
phase-0 only); MUSHE1's write ORs the existing bit 7 (MLSUB.MAC:770-771) while
every other store ORs MSKORA; the $FB store is suppressed (:315-316). The
purity sweep in tests/purity.test.ts auto-activates on the first core module —
keep the reducer clock/entropy/DOM-free.

## Dev Assessment

**GREEN complete.** `plugins/millipede/src/core/conway.ts` (commit 0bf8f5d2)
ports INICON + MASTER (STARTGR/GROWDIE/CLEANUP) as a pure reducer, exactly the
API the RED header specifies. All 262 millipede tests pass (29 conway + the
purity sweep, which auto-activated on this first core module and passes over
it), `npm run lint` clean, `npm run test:orchestrator` green.

Implementation notes for review:
- Line-cited throughout; every constant/rule references its CW-* claim in
  docs/rom-study/claims/08-conway.json (byte-gated).
- The in-place sweep is deliberate ROM behaviour (no double buffer): the
  picture-code scheme carries previous-generation semantics — see the header.
- The two store paths differ on purpose: a birth ORs the cell's EXISTING bit 7
  (MUSHE1, MLSUB.MAC:770-771); every other rewrite ORs MSKORA. The $FB store
  (poisoned mushroom in the player area) is suppressed.
- Upright-only (CKIND clear); MUSH count seam deferred to ml3-3 — both recorded
  as Delivery Findings by TEA.
- No code beyond what the tests demand: no cocktail param, no count plumbing,
  no scroll awareness (ml3-5's coordinate work owns that).

**Fix round (review round 1 → commit c2c8db8b):** applied the Reviewer's F1-F5
verbatim — three new/replaced tests (EDGE-seed boundary, MUSHE1 bit-7 both
directions, initConway fresh-instance), CLEANUP coverage extended, claims
CW-64..CW-68 added and cited at their literals, golden reading guide added.
264/264 green, lint clean. No production logic changed.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer's own trace + mutation battery |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no catch/fallback surface in diff; typed-array OOB semantics traced by Reviewer |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 2 (F1, F4), confirmed-reduced 1 (F3), dismissed 1 (CW-38 gap — refuted by live mutation: deleting the exclusion reddens 4/29), deferred 3 (low: golden annotation, self-check scope note, startgr-death-stage reachability) |
| 5 | reviewer-comment-analyzer | Yes | clean | none | N/A (verified 10+ inline citations by MEANING against the vendored tree) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — Reviewer checked: no casts/escapes, readonly template, in-place field contract documented + tested |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure computation, no I/O boundary |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — structure mirrors the ROM deliberately (line-cited port); no dead code found |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (F2 — citation-completeness, rule-matching, not dismissible) |

**All received:** Yes (4 enabled returned: 2 clean, 2 with findings; 5 disabled covered by Reviewer directly)
**Total findings:** 5 confirmed, 1 dismissed (with mutation evidence), 3 deferred

## Reviewer Assessment

**Status:** APPROVED (round 2)

Round 1 rejected with five findings — [TEST] F1/F3/F4, [RULE] F2, [DOC] F5 —
all test/claims/comment-side; no production defect was found in either round.
Dev applied every fix in commit c2c8db8b and this round re-verified each:

- **[TEST] F1 fixed:** the two survived mutants are now killed — re-ran
  M4 (birth store `| mskora` instead of OR-existing-bit-7): 1 red; re-ran the
  observable form of M3 (EDGE seed extended to column 1): 2 red including the
  golden. New fixtures pin the EDGE-seed boundary (lone mushrooms at (1,10)
  and (28,20) die, post-phase-0 $74 each) and MUSHE1's bit-7 semantics in
  BOTH distinguishing directions ($80 blank births to $F5 outside the player
  area; $00 blank births to $75 inside it). The misleading comment at the
  interior control is reworded. M3 as originally written (clamp deletion) is
  documented as observationally inert in this port — JS out-of-range reads
  coerce to 0, which is exactly what the clamps guarantee on hardware — so the
  EDGE-boundary mutant is the correct observable proxy, and it is dead.
- **[RULE] F2 fixed:** claims CW-64..CW-68 added (verbatims read from the
  vendored tree); conway.ts's GRCODE rows and both template y-seeds now cite
  them. The citation gate byte-verifies all 68 claims (suite green with the
  vendored tree present).
- **[TEST] F3 fixed:** the arity assertion is replaced by a fresh-instance
  behavioural pin (mutating one state must not leak into another).
- **[TEST] F4 fixed:** CLEANUP now covers all three growth stages
  ($75→$7C, $76→$7D, $77→$7E) plus a poison mushroom frozen through phase
  MAXPH, alongside the frozen death stage.
- **[DOC] F5 fixed:** the golden has a cluster-by-cluster reading guide.

Final state re-verified this round: 264/264 millipede tests green (31 in
conway.test.ts), `npm run lint` clean, working tree clean after every mutant
restore. Verdict: **APPROVED — ready for finish.**

### Reviewer Assessment — round 1 (rejected, superseded by round 2 above)

**Status:** REJECTED (round 1 — test-side and claims-side hardening only; NO
production-code defect found)

### Verdict rationale

The port itself is faithful: every inline citation spot-checked by meaning
(comment-analyzer, clean), the full lang-review checklist swept (rule-checker,
33 rules), and a nine-mutant battery ran against the suite. But two mutants
SURVIVED, one test comment claims coverage it does not have, and the epic's
"every constant carries a claim" rule is unmet for five transcribed literals —
all cheap, precise fixes. One round.

### Mutation battery (all mutants re-runnable; run
`npx vitest run --project millipede plugins/millipede/tests/conway.test.ts`)

| # | Mutant (conway.ts) | Result |
|---|---|---|
| M1 | birth `t === 3` → `t === 2` | KILLED (8 red) |
| M2 | `EDGE = 2` → `1` | KILLED (3 red) |
| M3 | delete col-1 clamp `else if (addr < 0x40) { x = 5; y = 0x20 }` | **SURVIVED** (see F1) |
| M4 | birth store `GROWTH \| (field[addr] & BACKGROUND_BIT)` → `GROWTH \| mskora` | **SURVIVED** (see F1) |
| M5 | delete the `POISON+3+0x80` suppressed-store line | KILLED (1 red) |
| M6 | die threshold `>= 4` → `>= 5` | KILLED (1 red) |
| R1 | delete `&& v !== GROWTH` (CW-38, run by rule-checker) | KILLED (4 red) |
| R2 | survival band → classic-Conway 2..3 (rule-checker) | KILLED (3 red) |
| R3 | y-seed `0x40` → `0x41` (rule-checker) | KILLED (2 red) |

M3 note: the col-1/col-28 clamps are observationally inert in this port (JS
out-of-range reads coerce to 0, exactly what the clamps prevent on hardware) —
the OBSERVABLE content of those branches is only that the EDGE seed does NOT
extend to columns 1/28, and no test pins that boundary.

### Findings (confirmed)

- **F1 [TEST] (medium)** Two survived mutants = two unpinned mechanisms:
  (a) the EDGE-seed boundary — no fixture proves columns 1 and 28 get NO seed
  (and test.ts:431's comment "Column 1 gets NO seed (CW-31)" anchors that claim
  to an assertion on column 15, an interior control — misleading);
  (b) MUSHE1's birth store ORs the cell's EXISTING bit 7, not MSKORA
  (CW-42/62) — cited as load-bearing in conway.ts:158-161, distinguishable
  from `| mskora` in two directions, tested in neither.
  **Fix (verified against the ROM trace this review):** add to AC-3 —
  lone `0x7f` at (1,10) and (28,20) → post-phase-0 `0x74` (die: no seed);
  L-tromino + blank `0x80` at (11,11) → post-phase-0 `0xf5` (bit 7 preserved);
  player-area birth `0xff` at (10,3),(10,4),(11,3), blank `0x00` at (11,4) →
  post-phase-0 `0x75` NOT `0xf5` (no MSKORA on the MUSHE1 path). Reword the
  test.ts:431 comment to cite the interior control as interior, and move the
  no-seed claim to the new fixtures.
- **F2 [RULE] (low — rule-matching, not dismissible)** Citation-completeness:
  GRCODE rows transcribed from CONWAY.MAC:324/326/327 and the template-walk
  y-seeds `0x40`/`0x20` (CONWAY.MAC:185/192) carry no CW-* claim (only the
  sibling rows/X-loads are cited). **Fix:** add claims CW-64..CW-68 to
  08-conway.json (verbatims read from the vendored tree, as CW-1..63 were) and
  reference them at conway.ts:66-72/110/115.
- **F3 [TEST] (low)** The `initConway.length === 0` arity assertion restates the
  type signature. **Fix:** replace with a behavioural pin — two `initConway()`
  calls return distinct, equal objects (a shared mutable singleton would be a
  real defect the current test cannot see).
- **F4 [TEST] (low)** CLEANUP conversion tested only for `0x76`; `0x75`/`0x77`
  and a poison mushroom surviving phase MAXPH untouched are unexercised.
  **Fix:** extend the CLEANUP test — plant `0x75`,`0x76`,`0x77`,`0x79` before
  the cleanup sweep; expect `0x7c`,`0x7d`,`0x7e`, frozen `0x79`.
- **F5 [DOC] (low)** The AC-5 golden's trickier rows (the poison diamond rows
  12-17, the DDT chain rows 14-15) have no derivation note. **Fix:** one short
  comment block naming which mechanism produced each cluster (no per-byte math
  required — the AC-3 tests isolate each rule).

### Rule Compliance

Lang-review checks 1-30: clean or N/A across all 61 instances (rule-checker
sweep, spot-verified). #15/#18 (guards mutation-tested, apparatus can fail):
verified by the battery above — two survivors drove F1. #17 (mechanism claims
re-ran): comment-analyzer re-opened the cited ROM lines; the NGROWN
comment-correction was verified against the actual STA sites. #31 purity:
AST-scanner suite passes over conway.ts. #32 (epic citation rule): two
violations → F2, fix required.

### Observations (verified good)

1. The in-place generation trick (fresh births excluded from counts) is both
   implemented and PINNED — R1 kills it four ways, including the golden.
2. Exact call-count pins (90/120/180) make phase-machine drift loud; they are
   measured by running the shipped reducer, not quoted prose (#20 clean).
3. The suite's expected bytes are independently derived (no committed
   reference implementation; helpers are plumbing only) — the #18 trap avoided.
4. `masterStep`'s single exit + single CDONE-clear site mirrors the ROM's
   control flow exactly (CONWAY.MAC:99-104); no derived-edge divergence (#14).
5. Traversal/containment, OOB and degenerate inputs traced: every template
   read for every reachable (row, col) stays in [0, 0x3C0) by the ROM's own
   clamps; JS coercion covers the phantom edge reads the way page-$0F/$14 RAM
   did on hardware.

### Fix routing

All fixes are test/claims/comment-side (Dev may apply them in the green
codebase with TEA's fixture values above, each already verified against the
vendored 6502 by this review). No production behavior change expected — the
golden and all 262 existing tests must stay green, and mutants M3/M4 must be
re-run and KILLED after the fix.