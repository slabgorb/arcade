---
story_id: "ml3-3"
jira_key: "ml3-3"
epic: "ml3"
workflow: "tdd"
---
# Story ml3-3: Mushroom field reducers

## Story Details
- **ID:** ml3-3
- **Jira Key:** ml3-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml3-3-mushroom-field-reducers
- **PR:** https://github.com/slabgorb/arcade/pull/323 (feat→develop; gitflow — user merges)

## Acceptance Criteria

**AC-1: MUSHER increments mushroom count for empty locations (MLSUB.MAC:732)**
- Given the millipede field with an empty playfield location (AND I,7F = 0)
- When MUSHER reducer is called with that location
- Then the mushroom count should increment by 1
- And the location should be marked with a mushroom value
- Cite: reference/original-source/millipede/MLSUB.MAC:732-760

**AC-2: MUSHER does not add mushroom if one already exists (MLSUB.MAC:732)**
- Given a playfield location already containing a mushroom (AND I,7F != 0)
- When MUSHER reducer is called
- Then the mushroom count should not change
- And no duplicate mushroom should be created
- Cite: reference/original-source/millipede/MLSUB.MAC:738-740

**AC-3: MUSHDC decrements count respecting cocktail mode screen regions (MLSUB.MAC:707)**
- Given a millipede field with mushrooms in different screen regions
- When MUSHDC reducer is called with a playfield address
- Then the mushroom count should decrement correctly based on cocktail mode position (upper/lower/middle screen)
- The reduction should use the correct player register offset (X,MUSH)
- Cite: reference/original-source/millipede/MLSUB.MAC:707-729

**AC-4: RESTOR restores damaged mushrooms every 16 frames (MLSUB.MAC:919)**
- Given the millipede field with partially damaged mushrooms (state between 00 and 7F)
- When every 16 frames (AND FRAME,03 = 0)
- And player explosion is not active (PEXPLD = 0)
- And CONWAY growth is complete (CDONE = 0)
- Then damaged mushrooms should be restored to full health (7F)
- Cite: reference/original-source/millipede/MLSUB.MAC:919-949

**AC-5: OBSTAC detects obstacles/mushrooms for collision handling (MLSUB.MAC:824)**
- Given a playfield position containing a mushroom or rock
- When OBSTAC reducer is called to check for obstacles at that position
- Then it should return 0 (Z flag set) if an obstacle exists
- And return 1 (Z flag clear) if no obstacle
- This is used by movers (MOTION/EXPLOD) to detect collisions
- Cite: reference/original-source/millipede/MLSUB.MAC:824-887

**AC-6: Poison mushroom state is distinct and identifiable (MLDEF.MAC:143)**
- Given the mushroom field with both normal and poison mushrooms
- When a mushroom is marked as poison state
- Then it should have a distinct internal representation (poison bit set in status)
- And be identifiable from the playfield data
- Poison mushrooms render with a different color (ANCOL color 7 = poison)
- Cite: reference/original-source/millipede/MLDEF.MAC:143 (color definition 7=POISON)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-13T14:33:33Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-13T13:42:19Z | 2026-08-13T13:45:17Z | 2m 58s |
| red | 2026-08-13T13:45:17Z | 2026-08-13T14:00:04Z | 14m 47s |
| green | 2026-08-13T14:00:04Z | 2026-08-13T14:04:38Z | 4m 34s |
| review | 2026-08-13T14:04:38Z | 2026-08-13T14:18:40Z | 14m 2s |
| green | 2026-08-13T14:18:40Z | 2026-08-13T14:23:42Z | 5m 2s |
| review | 2026-08-13T14:23:42Z | 2026-08-13T14:33:33Z | 9m 51s |
| finish | 2026-08-13T14:33:33Z | - | - |

## Delivery Findings

### TEA (test design)
- **Gap** (non-blocking): the full OBSTAC mover→playfield address derivation is NOT pinned by
  the RED suite — only the probe semantics (`obstacleAt`) are. The derivation (V/8 + the
  "half-way to next row" ADC-carry round, `MLSUB.MAC:853-857`; `H' = H + 8*dir`, `:834-871`;
  the `(0xF7 - H') & 0xF8` column fold and the right-edge `PLYFLD+3C0` wrap, `:872-886`) hangs
  on a base reconciliation I would not resolve by guessing: OBSTAC's own exit comment computes
  an address based at **0x800** (`MLSUB.MAC ~:886`, `"800+V/8+((F7-H')^F8)*4"`) while conway.ts's
  committed field model is **0x400-based** (`0x400..0x7BF`, offset = col*0x20+row). Affects
  `plugins/millipede/src/core/mushroom.ts` (needs a cited `obstac(field, {h,v,dh})` that maps
  mover coords to a conway-offset, plus hand-derived non-wrapping + left-margin + right-edge
  fixtures). Recommend Architect/Dev reconcile the 0x400/0x800 base against primary source
  before a byte fixture is trusted; this is the classic geometry-transcription hotspot.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): `ROCK` (`MLDEF.MAC:204`), the OBSTAC probe, RESTOR, and the
  MUSHER presence/count mechanics are cited in test comments but have no `docs/rom-study/claims/`
  entry (unlike conway's CW-* and the existing CW-61/62/63 MUSH-seam claims). To hold the
  fidelity bar, GREEN should enroll a claims file (e.g. extend the 08/09 series) covering the
  new constants/mechanics so the ml1-1 citation gate byte-verifies them. Affects
  `plugins/millipede/docs/rom-study/claims/`. *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the two TEA findings above (the deferred full OBSTAC
  mover→address derivation, and the missing citation-claim entries for the new constants/mechanics)
  are confirmed still-open and intentionally OUT of this story's scope — GREEN ships the reducers +
  the OBSTAC probe only. No mover consumes `obstacleAt`/`isPoison` yet, by design; wiring waits on
  the 0x400/0x800 base reconciliation. Affects `plugins/millipede/src/core/millipede.ts` (the
  stepMillipede OBSTAC call site) and `plugins/millipede/docs/rom-study/claims/`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): `field[addr]` is indexed with no bounds check against PLYFLD_SIZE (0x3C0) in
  `musher`/`restor`/`obstacleAt`. Out-of-range reads yield 0 and writes silently no-op (typed-array
  semantics — no memory corruption). Not exploitable (single-player, addr is core-computed), but a
  silent-failure surface for the deferred OBSTAC-mover caller. Affects
  `plugins/millipede/src/core/mushroom.ts` (consider a dev/test-build bounds assertion). Corroborated
  by reviewer-security (low confidence). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `restor`'s `gate` parameter is read-only in practice; typing it
  `Readonly<RestorGate>` documents intent (reviewer-rule-checker rule #2). Affects
  `plugins/millipede/src/core/mushroom.ts:114`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the MUSH count registers have no 8-bit wrap — the ROM `DEC MUSH`
  wraps 0→0xFF, `counts.lower/top` go negative in JS. Irrelevant in balanced play but a latent
  divergence the future count-consumer story should know. Affects `plugins/millipede/src/core/mushroom.ts`.
  *Found by Reviewer during code review.*

## Design Deviations

**Story-title citation correction (SM, setup):** The epic story title cites OBSTAC at
`MILLI.MAC:824`. That is a wrong-file citation — SM verified against the vendored source:
`MILLI.MAC:824` is unrelated player-sparkle sound code, and MILLI.MAC only *calls* the
routine (`JSR OBSTA0` at :1527/:2155). OBSTAC itself is defined at
`reference/original-source/millipede/MLSUB.MAC:824` (`.SBTTL OBSTAC-OBSTACLE`,
body :853-887). AC-5 already carries the corrected cite. TEA/Dev: cite **MLSUB.MAC:824**,
not the title's MILLI.MAC:824. The epic title is left unedited (its wording is the
tracked record); this note is the correction of record.

### TEA (test design)
- **AC-5 OBSTAC Z-flag semantics were inverted in the derived AC**
  - Spec source: session AC-5 (sm-setup derived), context-story-ml3-3.md
  - Spec text: "it should return 0 (Z flag set) if an obstacle exists / return 1 (Z flag clear) if no obstacle"
  - Implementation: pinned the ROM's actual sense — `obstacleAt` returns the cell's low 7 bits;
    **0 == NO obstacle (ROM Z=1), nonzero == OBSTACLE (ROM Z=0)** (`MLSUB.MAC:847-848`
    header + `:887-889 AND I,7F`). The AC had it backwards.
  - Rationale: ROM outranks a derived AC (spec-authority + "ROM always wins"); the header comment
    `(Z)=0=OBSTACLE / =1=NO OBSTACLE` is unambiguous.
  - Severity: minor
  - Forward impact: Dev implements nonzero-stamp = obstacle; the AC-5 prose remains as-derived but is superseded by this note.
- **AC-4 "every 16 frames" is the ROM's comment, but the actual gate mask is 0x03**
  - Spec source: session AC-4
  - Spec text: "every 16 frames (AND FRAME,03 = 0)"
  - Implementation: pinned the MECHANISM — RESTOR acts iff `(frame & 0x03) === 0` (`MLSUB.MAC:924`).
    The suite proves frames 1/2/3 are gated out and 4 re-opens (mask 0x03, a period of 4 in FRAME
    units), NOT a literal 16.
  - Rationale: "pin the mechanism, not the literal" — the `;EVERY 16 FRAMES` source comment is the
    designer's intent annotation (FRAME advances faster than one per video frame); the mask is what executes.
  - Severity: minor
  - Forward impact: none; the mask period is the testable contract.
- **AC-4 damaged range is [ROCK, 0x7F), not "between 00 and 7F"**
  - Spec source: session AC-4
  - Spec text: "partially damaged mushrooms (state between 00 and 7F)"
  - Implementation: RESTOR restores only `ROCK(0x70) <= (cell & 0x7f) < 0x7F` (`MLSUB.MAC:942-945`);
    values below ROCK are not mushrooms/rocks and are left alone. Boundary pinned (0x6F skipped, 0x70 restored).
  - Rationale: ROM `CMP I,ROCK / BCC` skips everything below 0x70; "00" would wrongly restore blanks/letters.
  - Severity: minor
  - Forward impact: none.
- **AC-6 poison is a VALUE RANGE [0x78,0x7C), not a "bit set in status"**
  - Spec source: session AC-6
  - Spec text: "distinct internal representation (poison bit set in status)"
  - Implementation: `isPoison` = `POISON <= (stamp & 0x7f) < NORMAL` (the [0x78,0x7B] band,
    `MLDEF.MAC:207`, matching `conway.ts:133/141`). Poison is not a single bit; colour index 7 vs 6 (`MLDEF.MAC:142-143`).
  - Rationale: the picture-code bands are contiguous value ranges; there is no dedicated poison bit.
  - Severity: minor
  - Forward impact: none.
- **OBSTAC full address math deferred (test omission)** — see Delivery Findings › TEA Gap above.
  - Spec source: AC-5 (full mover-collision behaviour)
  - Spec text: "used by movers (MOTION/EXPLOD) to detect collisions"
  - Implementation: only the probe (`obstacleAt`) is pinned in RED; the coordinate→address derivation is filed as a Delivery Finding.
  - Rationale: an unresolved 0x400/0x800 base reconciliation makes a hand-derived address a manufactured, unverifiable fixture; better filed than guessed.
  - Severity: moderate
  - Forward impact: GREEN owns the full `obstac(field, mover)`; Reviewer should confirm the base reconciliation lands with cited fixtures.

### Dev (implementation)
- No deviations from spec. Implemented exactly the contract TEA's 31 tests pin (the "WHAT GREEN
  MUST SHIP" block in `mushroom.test.ts`): reused conway.ts's `POISON`/`NORMAL` rather than forking
  constants, kept the module pure core, and scoped OBSTAC to the probe (`obstacleAt`) with the full
  mover-address math left to the deferred finding. No abstraction beyond what the tests demand.
- Round 2 (rework): no deviations from spec. Applied the Reviewer's three round-1 findings exactly
  (citation re-anchoring, the row-0x1F test, `Readonly<RestorGate>`); reducer logic untouched.

### Reviewer (audit)
**Deviation stamps:**
- **SM story-title citation correction (MILLI.MAC:824 → MLSUB.MAC:824)** → ✓ ACCEPTED by Reviewer:
  independently re-verified — MLSUB.MAC:824 is `.SBTTL OBSTAC-OBSTACLE`, MILLI.MAC only calls OBSTA0.
- **TEA: AC-5 OBSTAC Z-flag inverted** → ✓ ACCEPTED: ROM header `(Z)=0=OBSTACLE / =1=NO OBSTACLE`
  (MLSUB.MAC:847-848) confirms nonzero stamp = obstacle. `obstacleAt` implements this correctly.
- **TEA: AC-4 "16 frames" vs mask 0x03** → ✓ ACCEPTED: MLSUB.MAC:924 `AND I,03` — the mask is the
  mechanism; pinning `frame & 3 === 0` is correct.
- **TEA: AC-4 damaged range [ROCK,0x7F) not [00,7F)** → ✓ ACCEPTED: MLSUB.MAC:942-945 `CMP I,ROCK /
  BCC` + `CMP I,7F / BCS`; the ROM comment ":943 IF NOT A MUSHROOM OR A ROCK" confirms ROCK is in-range
  (0x70 restores to 0x7F — faithful, if counterintuitive for an "indestructible" rock).
- **TEA: AC-6 poison is a value band not a bit** → ✓ ACCEPTED: [0x78,0x7C) matches conway.ts:133/141.
- **TEA: OBSTAC full address math deferred (moderate)** → ✓ ACCEPTED: the 0x400/0x800 base is real —
  MLSUB.MAC:886 comment reads `800+V/8+((F7-H')^F8)*4` while conway's model is 0x400-based. Deferring
  beats a guessed fixture. This is a genuine open item, not scope-dodging.
- **Dev: no deviations / reuse conway constants** → ✓ ACCEPTED: `import { POISON, NORMAL } from
  './conway'` verified, no forked field model.

**UNDOCUMENTED deviation found by Reviewer:**
- **MUSHER citation line-anchors are wrong (both files):** The story ships as "Cited." but musher()'s
  ROM citations point to the wrong lines. Spec/fidelity rule: source citations must resolve to the
  quoted ROM line (this project runs fidelity audits off them). Code does: cites row-exclusion checks
  at MLSUB.MAC:748/750/761 (actual :744-745/:746-747/:759-760) and cites MUSHER's count bands at
  :722/:726 — which are **MUSHDC's** lines (MUSHER's own are :761-762/:763-766). The verbatim quotes
  are correct but the anchors mislead. Duplicated in `mushroom.ts:58-76` and
  `mushroom.test.ts:34-35,170,175,227,238`. Not logged by TEA/Dev. Severity: High (fidelity-integrity
  in a citation-driven project; confirmed by reviewer-rule-checker at high confidence). See findings.
  → ✓ **RESOLVED (Round 2):** all MUSHER anchors re-derived byte-exact and corrected in both files
  (round-2 rework, commit `066c948f`); reviewer-rule-checker round 2 reports 0 citation violations.

## TEA Assessment

**Tests Required:** Yes
**Reason:** ROM-fidelity core reducer — behavioural pins per AC, no chore bypass applies.

**Test Files:**
- `plugins/millipede/tests/mushroom.test.ts` — 31 failing tests across the 6 ACs, pinning the
  contract of a new `plugins/millipede/src/core/mushroom.ts` that operates on conway.ts's field.

**Tests Written:** 31 tests covering 6 ACs (AC-1..AC-6), plus band-boundary and gate edge cases.
**Status:** RED (all 31 fail `module not built yet`; the other 536 millipede tests stay green; tsc clean).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| ROM-authority: cite primary source, ROM beats derived AC | every `expect` carries a `MLSUB.MAC`/`MLDEF.MAC` cite; 4 AC corrections logged as deviations | failing |
| core/shell boundary (purity): new module is pure core | module specced pure (no clock/entropy/DOM); `purity.test.ts` auto-scans it on GREEN | n/a (src absent) |
| lang-review: no helper reimplements the algorithm under test | only geometry `idx`/field builders in the test; all expected bytes are standalone literals | failing |
| table/range ENDS boundary (the "test past the end" rule) | ROCK boundary 0x6F/0x70; poison band ends at NORMAL 0x7C; RESTOR full-0x7F skip | failing |
| meaningful assertions (no vacuous) | every test asserts a concrete value (`.toBe(0x7f)`, counts, booleans); no `is_some`/`let _ =` | failing |

**Rules checked:** 5 of 5 applicable checks have coverage (purity runs once GREEN lands the module).
**Self-check:** 0 vacuous tests. Every assertion pins a specific value or boundary; each AC has both
a positive and a refuting case (dup-reject, middle-band no-count, gate-closed no-op, below-ROCK skip).

**Scope corrections (ROM > derived AC):** AC-5 Z-flag sense was inverted; AC-4 "16 frames" is a
comment while the executing mask is 0x03; AC-4 damaged range is [ROCK,0x7F) not [00,7F); AC-6 poison
is a value band not a bit. All four logged under Design Deviations › TEA. The full OBSTAC address
math is deferred (Delivery Findings › TEA) pending a 0x400/0x800 base reconciliation.

**Handoff:** To Dev (Korben) for GREEN — implement `src/core/mushroom.ts` per the "WHAT GREEN MUST
SHIP" block at the top of the test file; resolve the OBSTAC base reconciliation and enroll a citation
claim for the new constants/mechanics.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/millipede/src/core/mushroom.ts` (new) — the pure core mushroom-field reducers:
  `musher`, `mushdc`, `restor`, `obstacleAt`, `isPoison`, the `MushCounts` interface, and the
  cited constants (`ROCK`, `FULL_MUSHROOM`, `BACKGROUND_BIT`, `LOWER_MAX`, `TOP_MIN`,
  `MUSH_COLOR_IDX`, `POISON_COLOR_IDX`), re-exporting `POISON`/`NORMAL` from conway.ts.

**Tests:** 31/31 mushroom passing (GREEN). Full millipede project 568/568; purity + citations
audits 49/49 (the purity sweep auto-scans the new core module and passes); orchestrator suite
478/478; `tsc --noEmit` clean.
**Branch:** feat/ml3-3-mushroom-field-reducers (pushed, commit `09d8bfde`)

**Wiring note:** the reducers are new core surface with no consumer yet — by design. Movers call
the full `obstac(field, mover)`, whose address derivation is TEA's deferred finding (the 0x400/0x800
base reconciliation), so there is no `main.ts`/`stepMillipede` producer to thread for THIS story.
`obstacleAt`/`isPoison` are the pinned seams a follow-up wires in.

**Handoff:** To Reviewer (Zorg) for code review.

### Dev round 2 (rework of Reviewer round-1 findings)
**All three round-1 findings resolved — reducer LOGIC unchanged (comments/tests/type only):**
- [High] MUSHER citation anchors re-pointed to their true MLSUB.MAC lines in **both** files:
  exclusions :744-745 / :746-747 / :759-760 (were :748/:750/:761); count bands :761-762 (lower),
  :763-764 (middle), :765-766 (top) (were MUSHDC's :722/:726). Residual-wrong-anchor sweep is empty;
  MUSHDC's own :722/:725/:726/:728 citations verified correct and kept.
- [Medium] Added the row-0x1F exclusion test (AC-2 block). **Mutation-proven**: deleting musher's
  `if (row === 0x1f) return false` now fails exactly that one test (1 failed | 31 passed).
- [Low] `restor(gate: Readonly<RestorGate>)`.

**Non-blocking findings (OOB bounds, count-wrap) left as filed** — out of this story's scope.

**Tests:** 32/32 mushroom; full millipede **569/569**; orchestrator 478/478; `tsc --noEmit` clean.
**Branch:** feat/ml3-3-mushroom-field-reducers (pushed, commit `066c948f`)
**Handoff:** Back to Reviewer (Zorg) for round 2.

## Round 1 — Subagent Results (superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (all green: vitest 568, lint 0, orchestrator 478, no smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered by Reviewer (boundary tests present: ROCK 0x6F/0x70, poison 0x7B/0x7C, gate frame 1-4; the row-0x1F branch is the one uncovered edge, confirmed below) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — hand-covered: the only silent surface is OOB `field[addr]` (no-op), captured as a Gap finding |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — hand-covered: row-0x1F exclusion untested (mutation-proven), a Medium finding below |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — hand-covered: MUSHER citation anchors wrong (High finding); this is exactly the class this subagent would catch |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — hand-covered: `MushCounts`/`RestorGate` sound; `Readonly<RestorGate>` improvement noted |
| 7 | reviewer-security | Yes | findings | 1 (low: OOB bounds) | confirmed 1 (as non-blocking Gap) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — hand-covered: no dead code / over-engineering; module is minimal |
| 9 | reviewer-rule-checker | Yes | findings | 4 (3× citation-anchor High, 1× Readonly) | confirmed 4 (citation → High; Readonly → Low); independently corroborates my citation + row-0x1F findings |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled per `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed blocking-relevant (citation-anchor High, row-0x1F Medium), 3 confirmed non-blocking (OOB, Readonly, count-wrap), 0 dismissed

## Round 1 — Reviewer Assessment (superseded by Round 2 below)

**Verdict (Round 1):** REJECTED

I authored this code (same session ran Dev), so I weighted independent re-derivation and the
adversarial subagents over re-reading my own reasoning. The reducer LOGIC is ROM-faithful — I
re-derived MUSHER/MUSHDC/RESTOR/obstacleAt/isPoison line-by-line against MLSUB.MAC/MLDEF.MAC and
reviewer-rule-checker did the same independently; both agree the behavior matches and all 31 tests
are non-vacuous. The rejection is not about behavior. It is two real defects the automated gates and
my own authoring missed, both independently confirmed:

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] | `[RULE]`/`[DOC]` MUSHER citation anchors point to the wrong ROM lines — row exclusions cited :748/:750/:761 (actual :744-745/:746-747/:759-760); count bands cited :722/:726 which are **MUSHDC's** lines (MUSHER's own are :761-762/:763-766). Verbatim quotes correct; anchors mislead. A "Cited." fidelity story with a citation gate + audit culture cannot ship citations that resolve to the wrong routine. | `mushroom.ts:58-59,69-71,74-76`; `mushroom.test.ts:34-35,170,175,227,238` | Re-anchor each MUSHER citation to its true MLSUB.MAC line (exclusions :744-745/:746-747/:759-760; lower band :761-762; middle :763-764; top :765-766). Leave the MUSHDC citations (:722/:725/:726/:728) — those are correct. |
| [MEDIUM] | `[TEST]` MUSHER's row-0x1F exclusion (`mushroom.ts:70`) has no test — **mutation-proven**: deleting the line leaves all 31 tests green. | `mushroom.test.ts` (AC-2 block) | Add a test: `musher` on row 0x1F returns false, stamps nothing, counts unchanged. |
| [LOW] | `[TYPE]` `restor(gate)` never writes `gate`; type it `Readonly<RestorGate>`. | `mushroom.ts:114` | One-token change (optional, may fold into the green rework). |

**Non-blocking (recorded as Delivery Findings, not required for this rework):** OOB `field[addr]`
silently no-ops; count registers don't 8-bit-wrap like the ROM byte.

Dispatch tag coverage (all 8, incl. the 6 disabled subagents I hand-covered):
[EDGE] boundary tests present (ROCK 0x6F/0x70, poison 0x7B/0x7C, gate frame 1-4); the row-0x1F edge is the one uncovered boundary — Medium.
[SILENT] only silent surface is OOB field[addr] no-op — Low, recorded.
[TEST] MUSHER row-0x1F exclusion untested, mutation-proven — Medium (blocking-relevant).
[DOC] MUSHER citation anchors resolve to wrong ROM lines/routine — High.
[TYPE] restor gate should be Readonly<RestorGate> — Low; MushCounts/RestorGate otherwise sound.
[SEC] no injection/auth/secret surface; OOB bounds is the only note — Low.
[SIMPLE] no dead code or over-engineering; minimal reducers.
[RULE] rule-checker confirmed citation-anchor violations (High) + verified purity/radix/reuse/type compliance.

**Observations (≥5):**
- `[VERIFIED]` core/shell purity — no clock/entropy/DOM/dynamic-import; evidence: `mushroom.ts` imports only `./conway`; `tests/purity.test.ts` recursively scans `src/core/` and passes 24/24. Complies with CLAUDE.md purity rule. (`[SEC]` + `[RULE]` corroborate.)
- `[VERIFIED]` reuse-over-fork — `import { POISON, NORMAL } from './conway'` (`mushroom.ts:24`), no second field model; row = `addr & 0x1f` matches conway's CW-11 offset scheme. Complies with the reuse rule.
- `[VERIFIED]` radix fidelity — ROCK 0x70, FULL 0x7f, LOWER_MAX 0x0c, TOP_MIN 0x14 all written as hex, matching the `.RADIX 16` ROM operands; no decimal-misread. (`[RULE]` #34 corroborates.)
- `[VERIFIED]` RESTOR ROCK-inclusion is faithful — `mushroom.ts:121` restores 0x70; ROM `:942-943 CMP I,ROCK / BCC ;IF NOT A MUSHROOM OR A ROCK` includes ROCK by design. Looks wrong, is ROM-correct.
- `[HIGH]` `[RULE]`/`[DOC]` MUSHER citation anchors wrong (see table).
- `[MEDIUM]` `[TEST]` row-0x1F exclusion untested, mutation-proven (see table).
- `[LOW]` `[TYPE]` `Readonly<RestorGate>` (see table). `[SEC]`/`[SILENT]` OOB no-op; `[SIMPLE]` no dead code, count-wrap divergence noted.

### Rule Compliance
Rules from CLAUDE.md (no `.claude/rules`/`SOUL.md` in repo) + TS lang-review checklist:
- **core/shell purity** (every function): COMPLIANT — enumerated `musher`/`mushdc`/`restor`/`obstacleAt`/`isPoison`/`rowOf`; none touches clock/entropy/DOM.
- **ROM-fidelity citation** (every constant + behavior): 7/9 groups byte-exact; **2 groups VIOLATION** (MUSHER exclusions + bands) — the High finding.
- **reuse-over-fork**: COMPLIANT (conway import).
- **radix (.RADIX 16)**: COMPLIANT (all 9 constants).
- **TS type-safety** (no `as any`/`@ts-ignore`/`!`): COMPLIANT (none present). **readonly params**: 1 minor (`gate`).
- **test quality** (non-vacuous, edge coverage): mostly COMPLIANT — every assertion pins a concrete value; **one gap** (row-0x1F), the Medium finding.

### Devil's Advocate
Argue this code is broken. First: the citations. This is a story whose one-word thesis is "Cited." — and
its central routine cites its own ROM lines wrong, two of them pointing into a *different routine*
(MUSHDC). A future fidelity auditor — and this project runs them (the `rom-fidelity-audit` skill exists,
the ml1-1 citation gate exists) — will open `musher()`'s "`// :722 BCC 7$`", jump to MLSUB.MAC:722, find
the DECREMENT routine, and either "fix" the correct code to match the wrong line or file a phantom
discrepancy. That is not cosmetic; it is a fidelity landmine, and the fact that the verbatim quote is
correct makes it *worse* — a careful auditor who checks the quote against the wrong line sees a mismatch
and distrusts the whole module. Second: the untested row-0x1F branch. A future refactor could delete that
exclusion and every test would stay green (I proved it), so a mushroom could be planted on the top row —
a real gameplay divergence — with a fully green suite. Third: robustness. `obstacleAt(field, badAddr)`
returns 0 = "no obstacle" for an out-of-range address, so the deferred OBSTAC-mover wiring, if it ever
computes an off-field address (and its whole hazard is the 0x400/0x800 base confusion), would read "clear"
and drive a segment through a wall silently. Fourth: the count registers. `mushdc` on an empty region
drives `lower` to -1; a future consumer testing `count > 0` to trigger regeneration would misbehave where
the ROM's byte wrap to 0xFF would too, but differently. None of these are behavioral bugs in *this*
story's shipped surface — the reducers are correct and tested — but the citation defect is a shipped,
misleading fidelity artifact in a fidelity story, and that is enough to send it back.

**Handoff:** Back to TEA for rework (red) — a testable gap (row-0x1F) exists, so per the workflow this
routes to red: TEA adds the row-0x1F test and re-anchors the MUSHER citations in the test file; Dev (green)
re-anchors the source citations and applies `Readonly<RestorGate>`. The reducer LOGIC is correct and must
not change.

## Subagent Results

Round 2 re-review (the rework diff: citation re-anchoring, +1 test, `Readonly<RestorGate>`).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (lint 0, millipede 569, mushroom 32/32, orchestrator 478, no smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered: the round-1 uncovered edge (row-0x1F) now has a test |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — hand-covered: OOB no-op unchanged (non-blocking) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled — hand-covered: new row-0x1F test is non-vacuous (mutation-proven by me AND rule-checker) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled — hand-covered: the citation anchors (this subagent's domain) re-verified byte-exact, now correct |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — hand-covered: `Readonly<RestorGate>` applied |
| 7 | reviewer-security | Yes | findings | 1 (low, pre-existing OOB — unchanged) | confirmed non-blocking; no new surface |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — hand-covered: no dead code introduced |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 34 checks | all round-1 findings confirmed FIXED; citations independently re-derived byte-exact; row-0x1F mutation-tested |

**All received:** Yes (3 enabled returned; 6 disabled pre-filled)
**Total findings:** 0 blocking, 1 non-blocking pre-existing (OOB, unchanged), 0 new

## Reviewer Assessment

**Verdict:** APPROVED

Round 2. The round-1 rejection's two findings are both closed, and I confirmed each independently
(I authored the fixes, so re-derivation — not re-reading — is the check), corroborated by
reviewer-rule-checker's byte-exact re-verification and a fresh mutation test.

**Round-1 findings — disposition:**
- [HIGH] `[RULE]`/`[DOC]` MUSHER citation anchors → **FIXED & VERIFIED.** All six re-anchored to their
  true MLSUB.MAC lines, and I re-derived each against the ROM (not merely "a number changed"): row
  exclusions :744-745/:746-747/:759-760 (AND I,1F / CMP I,1F / CMP I,01 + their BEQ 20$); count bands
  :761-762 (MUSHER's own CMP I,0C/BCC 7$), :763-764 (CMP I,14/BCC 10$), :765-766 (6$: INX/INX) — the
  two that had to move OFF MUSHDC's lines did. MUSHDC's own :722/:725/:726/:728 correctly untouched.
  reviewer-rule-checker independently re-derived all 9 anchors byte-exact and reported them clean. No
  fresh wrong anchor was introduced (the round-1-to-round-2 failure mode I checked for explicitly).
- [MEDIUM] `[TEST]` row-0x1F untested → **FIXED & VERIFIED.** New test `refuses the top row 0x1F`
  (`mushroom.test.ts:249-262`) asserts `added===false`, nothing stamped, both counts 0. Mutation-proven
  twice (by me during the fix and by reviewer-rule-checker this round): deleting the exclusion reddens
  exactly that one test, tree restored clean.
- [LOW] `[TYPE]` `restor(gate: Readonly<RestorGate>)` → **APPLIED** (`mushroom.ts:114`).

**Observations (≥5):**
- `[VERIFIED]` reducer logic UNCHANGED across the rework — `git diff 09d8bfde..HEAD` is comments, one
  added test, and one `Readonly<>` annotation; all prior behavior tests still green (569 millipede).
- `[VERIFIED]` citations byte-exact — evidence: rule-checker rule #17/#32 clean, my own re-derivation
  against MLSUB.MAC:744-766. Complies with the ROM-fidelity citation rule.
- `[VERIFIED]` new test non-vacuous — mutation-proven (1 failed | 31 passed on the mutant).
- `[VERIFIED]` purity intact — `mushroom.ts` imports only `./conway`; `purity.test.ts` 24/24. `[SEC]`+`[RULE]` concur.
- `[LOW]` `[SEC]`/`[SILENT]` OOB `field[addr]` no-op — pre-existing, unchanged, non-blocking (Delivery Finding).
- `[SIMPLE]` no dead code / over-engineering added. `[EDGE]` the one previously-uncovered boundary is now covered.

Dispatch tag coverage (all 8, plain text): [EDGE] row-0x1F boundary now tested; [SILENT] OOB no-op unchanged, non-blocking; [TEST] new row-0x1F test mutation-proven; [DOC] citation anchors now correct byte-exact; [TYPE] Readonly<RestorGate> applied; [SEC] no new surface, OOB low; [SIMPLE] no dead code; [RULE] rule-checker clean 0/34, citations re-verified.

### Rule Compliance (Round 2)
- ROM-fidelity citation: **now COMPLIANT** (9/9 anchors byte-exact; the 2 round-1 violations fixed).
- core/shell purity: COMPLIANT. reuse-over-fork: COMPLIANT. radix: COMPLIANT. TS type-safety: COMPLIANT (incl. the new `Readonly<>`). test quality: COMPLIANT (row-0x1F gap closed).

### Devil's Advocate
Argue it is still broken. First attack: did the fix just swap one wrong anchor for another (the round-1
lesson — a green-rework can ship a fresh lie)? I checked this specifically: every new anchor was
re-derived line-by-line against MLSUB.MAC, and reviewer-rule-checker did so independently and byte-exact;
the two that had to move from MUSHDC's routine to MUSHER's own (:722→:761-762, :726→:765-766) landed on
MUSHER's real lines, not a new wrong pair. Second: is the new row-0x1F test real or does it pass
vacuously (e.g. would it pass even if musher were a no-op)? No — it's mutation-proven from both sides:
deleting the exclusion reddens exactly it, and the AC-1 add tests would redden if musher stopped adding,
so the test genuinely pins "row 0x1F is refused while other rows are added." Third: does `Readonly<>`
create a false sense of immutability? It is compile-time only and anyone with a mutable reference can
still write `gate` — but `restor` never does, and the annotation documents intent without changing
runtime, so it neither helps nor harms correctness. Fourth: the still-open items — OOB `field[addr]`
and the deferred full-OBSTAC address math. Could approving now ship a latent bug? The OOB path is a
no-op for an internally-computed addr with no current caller, and the full OBSTAC math is explicitly
scoped OUT (a filed Delivery Finding with the 0x400/0x800 reconciliation named for the follow-up) — the
shipped surface (`obstacleAt` probe) is correct and tested. None of these attacks lands on the shipped
behavior; the blocking round-1 defects are genuinely closed. Approve.

**Data flow traced:** a mover/growth caller passes a playfield `addr` + `counts` → `musher`/`mushdc`
mutate the shared `Uint8Array` field and the MUSH count pair; `restor` gates on frame/PEXPLD/CDONE
before restoring; `obstacleAt` reads the low-7-bits stamp. Safe: all inputs are internal core state,
no external/user input, no side effects beyond the passed field/counts.
**Pattern observed:** pure ROM-ported reducers over conway.ts's field, cited per constant — matches
conway.ts/millipede.ts convention (`mushroom.ts:24` reuse import).
**Error handling:** N/A for pure integer reducers; the one robustness note (OOB) is filed non-blocking.
**Handoff:** To SM for finish-story.

## Sm Assessment

**Story ml3-3 — Mushroom field reducers — COMPLETE (approved round 2).**

Flow: setup → red (31 failing tests) → green (mushroom.ts reducers) → review **round 1 REJECTED**
(High: MUSHER citation anchors wrong in both files; Medium: row-0x1F untested) → green rework
(citations re-anchored byte-exact + mutation-proven row-0x1F test + `Readonly<RestorGate>`) → review
**round 2 APPROVED**. Both round-1 findings independently verified closed by SM (author) and by
reviewer-rule-checker (0 violations, citations byte-exact). Trial-merge of origin/develop (which had
moved +14) was clean and green on the merged tree (lint clean, millipede 602, orchestrator 478).

### Impact Summary

**Round 1 findings — RESOLVED:**
- **[HIGH] MUSHER citation line-anchors** (both files) pointed to wrong MLSUB.MAC lines (exclusions
  cited :748/:750/:761 vs actual :744-745/:746-747/:759-760; count bands cited MUSHDC's :722/:726 vs
  MUSHER's own :761-766). → FIXED in commit `066c948f`; all 9 anchors re-derived byte-exact,
  reviewer-rule-checker round 2 clean. **CLOSED.**
- **[MEDIUM] MUSHER row-0x1F exclusion untested** → FIXED; added `refuses the top row 0x1F` test,
  mutation-proven (deleting the exclusion reddens exactly that test). **CLOSED.**

**Open, non-blocking (explicitly scoped OUT — filed as Delivery Findings for follow-up):**
- [Moderate] Full OBSTAC mover→address derivation deferred pending the 0x400/0x800 base reconciliation
  (only the `obstacleAt` probe shipped; no mover consumes it yet).
- [Low] No `docs/rom-study/claims/` entries yet for the new constants/mechanics.
- [Low] `field[addr]` has no bounds check (typed-array no-op on OOB; addr is core-computed).
- [Low] MUSH count registers don't 8-bit-wrap like the ROM byte.

**Tests at finish:** mushroom 32/32; millipede 569 (602 on merged tree); orchestrator 478; tsc clean.
**Deliverable:** `plugins/millipede/src/core/mushroom.ts` (pure core reducers over conway.ts's field) +
`plugins/millipede/tests/mushroom.test.ts`. Reducer logic ROM-faithful; the mushroom field the CONWAY
seam (ml3-4) deferred is now live.