---
story_id: ml3-5
jira_key: ml3-5
epic: ml3
workflow: tdd
---
# Story ml3-5: Scrolling playfield (novel vs centipede): SCROLL/SCROLD/SCROLU scroll mushrooms up/down (MLSUB.MAC:1105/1149/1309); make the core coordinate system scroll-aware from the start. Cited; pin output coordinates in a core unit test (routing != geometry).

## Story Details
- **ID:** ml3-5
- **Jira Key:** ml3-5
- **Workflow:** tdd
- **Stack Parent:** none (stack root)
- **Branch:** feat/ml3-5-scrolling-playfield
- **PR:** https://github.com/slabgorb/arcade/pull/320

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T14:16:48Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T13:44:02Z | 2026-08-13T13:46:16Z | 2m 14s |
| red | 2026-08-13T13:46:16Z | 2026-08-13T13:59:02Z | 12m 46s |
| green | 2026-08-13T13:59:02Z | 2026-08-13T14:01:37Z | 2m 35s |
| review | 2026-08-13T14:01:37Z | 2026-08-13T14:12:01Z | 10m 24s |
| green | 2026-08-13T14:12:01Z | 2026-08-13T14:15:20Z | 3m 19s |
| review | 2026-08-13T14:15:20Z | 2026-08-13T14:16:48Z | 1m 28s |
| finish | 2026-08-13T14:16:48Z | - | - |

## Sm Assessment

Setup complete for ml3-5 (tdd, phased). Branch `feat/ml3-5-scrolling-playfield`
cut from `develop`; story set `in_progress` in `sprint/epic-ml3.yaml`; story
context enriched at `sprint/context/context-story-ml3-5.md` (quarry pointers,
title-derived ACs — this is a title-only story, so TEA must verify the cited
MLSUB.MAC line numbers and routine extents against `reference/original-source/millipede/`
before RED). No open PRs blocked the merge gate. Handing off to TEA for the RED
phase.

## Tea Assessment

**RED complete** (commit e4999ff5). 27 tests in `plugins/millipede/tests/scroll.test.ts`;
25 fail with the self-describing "src/core/scroll.ts not built yet" loader error, 2
RNG-fixture guards pass by design. All 538 other millipede tests stay green (the
citation gate now checks 576 claims including the new 50) and repo-wide `npm run lint`
is clean.

**Premise verified against the quarry** (title-only story — the title is the spec):
SCROLL/SCROLD/SCROLU are exactly where cited (`MLSUB.MAC:1105/1149/1309` — the
`.SBTTL`s at 1105/1149/1309, bodies at 1113/1152/1312), plus `SCROLC` semantics
pinned by `MLDEF.MAC:372` ("1+=UP, -1=DOWN"), `DEAD`/`CENTIN` by `MLDEF.MAC:295/299`.
50 SC-* claims in `docs/rom-study/claims/12-scroll.json`, verbatims extracted
mechanically from the vendored tree (no hand transcription) and byte-verified.

**What GREEN must ship** — `src/core/scroll.ts` (full API in the test header):
- `scrollDispatch(scrolc, gate)` — the SCROLL gate chain in ROM order plus the
  wave-4 continuous-scroll tick (FRAME & $7F == $1E → DEC, i.e. a down-scroll);
  the tick can swallow a pending up-scroll to zero (pinned).
- `scrollDown(field, scrolc, rng)` — SCROLD upright: in-place column shift
  (col 29 → 0, one `nextInt(rng, 0x100)` sample per column, ($0F-masked) == 0
  plants $7F on row $1E), grey-bit re-add + poison→normal at row 6, MUSH/MUSH+2
  deltas at rows 2/$0B/$13.
- `scrollUp(field, scrolc)` — SCROLU upright: $80 grey blank in at row 2,
  grey strip at row 7, deltas at rows $1E/$0C/$14.

**Rule coverage:** purity (the ml1-1 scanner auto-sweeps the new core file);
in-place field mutation matches the conway convention; geometry pinned by
whole-column `toEqual` (identity, not region counts); RNG fixtures self-guard
their hit patterns so an @shared/rng change fails loudly; column-order is
observable (a 0→29 sweep plants different columns than the pinned 29/28/8).

Acceptance criteria (formalized from the title):
1. SCROLL/SCROLD/SCROLU semantics implemented in core, cited (SC-1..SC-48).
2. Core coordinate system scroll-aware: content moves through the ml3-4 field
   shape in place; positions stay absolute.
3. Output coordinates pinned (whole-column and whole-field assertions), not
   merely routing.

Handing off to Dev for GREEN.

## Dev Assessment

**GREEN complete** (commit 18ae826a). `src/core/scroll.ts` (178 lines) makes all
25 RED tests pass on the first run — 564/564 millipede tests green (the ml1-1
purity sweep auto-activated on the new core file and passes), repo-wide
`npm run lint` clean.

Implementation notes:
- Exactly the API the RED header specified: `scrollDispatch` (SCROLL gate chain
  in ROM order + the wave-4 continuous tick), `scrollDown` (SCROLD upright),
  `scrollUp` (SCROLU upright). In-place field mutation, deltas returned.
- Reuses `PLYFLD_STRIDE`/`PLYFLD_WIDTH` from `./conway` rather than duplicating
  the ml3-4 geometry — one coordinate system, now scroll-aware.
- Count-region boundary rows ($0B/$13 down, $0C/$14 up), the $70 threshold, the
  poison band and the grey bit are module-local cited constants; only the seven
  test-required constants are exported (minimalist).
- The ROM's unmasked boundary reads are preserved (`CMP I,70` with no `AND 7F`
  at :1213/:1218/:1361/:1366) — the bottom/top push-off checks mask ($1208/
  :1356), the region-boundary checks do not, faithfully.
- No deviations from the RED spec; nothing beyond the tests was added.

Handing off to TEA for verify.

**Rework round 1** (commit a1eb814c, test-only): closed all three review
findings — ROCK $70 / $6F exact-threshold fixtures at all six MUSHROOM_MIN
sites (new claim SC-51, MLDEF.MAC:204, citations gate green at 577), poison-band
edges $78→$FC, $77 untouched, $7B→$FF, and the tick-with-positive-counter
dispatcher pin. Former survivors M8/M9 re-run and now redden (1 site-specific
failure each). 569/569 millipede tests green, lint clean. No core changes.

## Subagent Results

| Subagent | Received | Status | Findings | Decision |
|----------|----------|--------|----------|----------|
| reviewer-preflight | Yes | clean | none — 564/564 tests, lint clean, 576 claims verified | N/A |
| reviewer-edge-hunter | Skipped / disabled | — | covered by Reviewer mutation battery | N/A |
| reviewer-silent-failure-hunter | Skipped / disabled | — | covered by Reviewer manual pass (no catches/fallbacks in diff) | N/A |
| reviewer-test-analyzer | Yes | findings | 3 MEDIUM (0x70 boundary; 0xF8 poison edge; tick-with-positive-counter), 1 LOW (RND_MASK indirect) | MEDIUMs CONFIRMED (2 match mutation survivors M8/M9; 3rd verified by code read); LOW noted, no action |
| reviewer-comment-analyzer | Yes | clean | none — all 50 SC claims + all :NNN comments re-verified against vendored source | N/A |
| reviewer-type-design | Skipped / disabled | — | covered by Reviewer manual pass | N/A |
| reviewer-security | Skipped / disabled | — | pure math module, no attack surface | N/A |
| reviewer-simplifier | Skipped / disabled | — | covered by Reviewer manual pass (minimalist API held) | N/A |
| reviewer-rule-checker | Yes | findings | 2 HIGH under check #15 (same 0x70 + 0xF8 boundaries, mechanically demonstrated); GREY_POISON_MAX ruled EQUIVALENT mutant | CONFIRMED — identical to mutation survivors M8/M9; equivalence ruling ACCEPTED |

All received: Yes

## Reviewer Assessment

**Verdict: APPROVED (round 2 of 2).** Round 1 rejected on three
mutation-proven/analyzer-confirmed boundary gaps in the test suite (production
code was faithful throughout — no core change was ever requested). Rework
a1eb814c (test-only) closed all three:

1. [TEST]+[RULE] `MUSHROOM_MIN` $70 boundary — ROCK ($70, MLDEF.MAC:204, new
   claim SC-51) and $6F fixtures now sit on all six call sites.
2. [TEST]+[RULE] Poison-band lower edge — $78→$FC, $77 untouched, $7B→$FF
   pinned in the grey-conversion test.
3. [TEST] Continuous tick with post-tick counter still positive —
   `scrollDispatch(2, armed)` → `{action:'up', scrolc:1}` pinned.

**Round-2 verification** (Reviewer, independent): rework diff confirmed
test-only (57 test lines + 9 claim lines). Seven-mutant battery on the fixed
surface, sequential, git-diff-verified, all restored: former survivors M8/M9
now redden; constant-level mutants `MUSHROOM_MIN 0x71` (4 failures) and
`GREY_POISON_MIN 0xf9` redden; per-site operator mutants at the down-region
and up-push-off sites redden; a hardcode-'down'-on-tick dispatcher mutant
reddens 2 tests. 7/7 caught. 569/569 millipede tests green, lint clean,
citation gate green at 577 claims (SC-51 verified).

[DOC] comment-analyzer's round-1 clean verdict stands — the rework added only
cited fixtures; SC-51's verbatim was extracted mechanically and byte-verified.
[RULE] GREY_POISON_MAX `<`→`<=` equivalence ruling stands (not pinned, by
design). Delivery Findings routing (ml4-4 DDT halves, ml3-3 SCROL0, ml8-3
cocktail) unchanged and correctly filed.

All acceptance criteria met; the story's own bar — output coordinates pinned,
routing != geometry — is now mutation-proven at the boundaries too. APPROVED.

## Reviewer Assessment — Round 1 (superseded by round 2 above)

**Verdict: REJECTED (round 1)** — implementation faithful, test suite has three
mutation-proven/analyzer-confirmed boundary gaps. Test-only rework; no
production code change requested.

**Reviewer mutation battery** (9 mutants, sequential, git-diff-verified, all
restored): M1 column order, M2 grey-row write, M3 poison-conversion kill, M4
boundary-row shift, M5 up-scroll incoming byte, M6 tick phase off-by-one, M7
consume sign — all CAUGHT. **M8 (`>= MUSHROOM_MIN` → `>`) and M9
(`>= GREY_POISON_MIN` → `>`) SURVIVED** all 564 tests.

Findings (all [TEST]+[RULE]+[Reviewer/mutation] confirmed):
1. **[MEDIUM][test-coverage]** `MUSHROOM_MIN` $70 is never exercised at the
   boundary across its six call sites — and $70 is `ROCK` (MLDEF.MAC:204,
   "INDESTRUCTIBLE FEATURE"): the ROM threshold exists precisely to count
   rocks. Fix: fixtures with a rock ($70) that must count and $6F (DDT+1) that
   must not, on at least the push-off and one region-boundary site per
   direction.
2. **[MEDIUM][test-coverage]** Poison-band lower edge: no fixture at pre-OR
   $78 (the FIRST poison picture, POISON itself) → must convert to $FC; add
   $77 (GROWTH+2) → must NOT convert; optionally $7B → $FF (last in band).
3. **[MEDIUM][test-coverage]** [TEST] Continuous tick with post-tick
   counter still positive: `scrollDispatch(2, armedGate())` must return
   `{action:'up', scrolc:1}` — current suite lets a hardcode-'down'-on-tick
   implementation pass. (Shipped code verified correct by read; pin it.)

Dispositions: [DOC] comment-analyzer clean — VERIFIED. [RULE]
GREY_POISON_MAX `<`→`<=` equivalence ruling ACCEPTED (OR-based mechanism makes
it unobservable; do not pin). [TEST] LOW RND_MASK indirect pin —
ACCEPTED as-is (guarded via live-rng geometry test). Disabled specialists'
domains covered: edge cases via battery; silent failures none (no catch/
fallback in diff); type design conventional (matches sibling gate shapes);
security N/A (pure math); simplification VERIFIED (only test-required exports).

Required rework: add the three fixture groups to
`plugins/millipede/tests/scroll.test.ts`; re-run M8/M9 (must redden) plus the
full millipede project. No claims JSON or core changes expected.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings at setup.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[TEA / Gap / non-blocking]** The DDT-bomb halves of SCROLD/SCROLU
  (`MLSUB.MAC:1231-1295` and `:1379-1399` — DDTADD pointer moves, off-screen
  clears, and the one-per-scroll top-row bomb seeding, claims SC-49/SC-50) are
  descoped from ml3-5: the DDTADD table has no core owner yet. Routed to
  **ml4-4** (DDT bombs — DDTS/BOMBS/CLOUD), which must also handle scroll-time
  table maintenance when it lands.
- **[TEA / Gap / non-blocking]** SCROL0 (`MLSUB.MAC:1296-1307`, claim SC-48) —
  deleting an obstacle scrolled onto the player ("PREVENT PLAYER GETTING
  STUCK") — needs OBSTAC, which **ml3-3** owns (`MILLI.MAC:824` per its title).
  Deferred to ml3-3; its Dev should read SC-48 and wire the tail call for both
  scroll directions (SCROLD falls into SCROL0, SCROLU jumps to it).
- **[TEA / Question / non-blocking]** Cocktail (CKIND) paths in all three
  routines are modelled clear, consistent with every millipede story so far —
  fleet-wide cocktail support is filed as **ml8-3**.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->