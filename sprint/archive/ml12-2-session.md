---
story_id: "ml12-2"
jira_key: "ml12-2"
epic: "ml12"
workflow: "tdd"
---
# Story ml12-2: Millipede heads wrap horizontally off the side of the play area and re-enter from the other side

## Story Details
- **ID:** ml12-2
- **Jira Key:** ml12-2
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Repos:** arcade
**Phase Started:** 2026-08-17T15:12:04Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T12:26:38.591335Z | 2026-08-17T12:28:36Z | 1m 57s |
| red | 2026-08-17T12:28:36Z | 2026-08-17T14:42:58Z | 2h 14m |
| green | 2026-08-17T14:42:58Z | 2026-08-17T14:52:02Z | 9m 4s |
| review | 2026-08-17T14:52:02Z | 2026-08-17T15:03:20Z | 11m 18s |
| green | 2026-08-17T15:03:20Z | 2026-08-17T15:07:35Z | 4m 15s |
| review | 2026-08-17T15:07:35Z | 2026-08-17T15:12:04Z | 4m 29s |
| finish | 2026-08-17T15:12:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Conflict, non-blocking] The story's root-cause HYPOTHESIS is refuted; the real defect is a HEADLESS train, not the head edge-turn.** (TEA, RED)
  Grounded against ROM + live code (probes over the full boot train 400+ frames and the full `stepGame` across 8 seeds): the HEAD edge-turn is already correct — driven into either edge a head reverses `dh` and drops a row well before `h` reaches the 0x00/0xFF boundary; ZERO head wraps. `wrapH` (`h & 0xff`) is ROM-faithful (MILLI.MAC:1626-1628 `20$ ADC MOBJH` is a plain 8-bit add). The owner's "runs dead-horizontal across the screen several times" reproduces ONLY when the train is **headless**: the kill path splices the shot segment out (`sim.ts:176 segments.filter((_, i) => i !== hit)`) with **no head-promotion** (the ROM instead turns the segment behind a dead head into a head — MILLI.MAC 164$ "TURN ON COLOR FOR EYES"). A headless train is all bodies; a body has no edge-turn (only leader-follow, MT-20); the leaderless front body (`leader === undefined`) runs `move(seg,false)` every frame, coasts `0xFE -> 0x00` at the edge and never drops. Reproduced deterministically (Group B) and via `stepGame` (Group C).
- **[Question, non-blocking] Fix location / scope: head-promotion (ml3-2 territory) vs a minimal universal edge no-wrap.** (TEA, RED)
  The ROM-faithful fix is head-promotion-on-kill, which overlaps the explicitly-deferred split/death work (ml3-2). A narrower fix satisfies the AC observable equally: give the leaderless/front-most live segment the edge-turn, or clamp any segment at the edge so it cannot cross the byte boundary. The RED tests pin the **observable** (no wrap + must descend), NOT the mechanism, so Dev may choose either. Architect/Dev should confirm the chosen shape does not silently re-open ml3-2 scope.
- **[Improvement, non-blocking] The existing head edge-test bound is VACUOUS against a wrap.** (TEA, RED)
  `tests/millipede.test.ts` ml3-1 edge tests assert `after[0].h <= LEFT_EDGE + SEG_SPACING` (0xF8) — a wrapped head at `h = 0x00` trivially satisfies `<= 0xF8`, so those tests could never have caught this family. Left in place (they still meaningfully assert reversal + descent); Group A here supersedes them with a non-vacuous per-step no-wrap check. Consider retiring the vacuous bound when this area is next touched.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **RED pins the AC observable through the ROM-grounded mechanism, not the story's stated head-wrap hypothesis.**
  - Spec source: context-story-ml12-2.md, Problem + AC-1
  - Spec text: "the horizontal position wraps mod-256 before the screen-edge turn fires. Likely seam: wrapH ... racing the screen-edge turn (atEdge)"
  - Implementation: Tests do NOT pin "the head wraps"; the head edge-turn is verified already correct (Group A, green). The AC observable ("a head reaching either horizontal edge turns and drops a row ... and never wraps"; "a repeated dead-horizontal traverse must be impossible") is pinned via the actual defect — a HEADLESS train's leaderless front body coasting past the byte boundary (Groups B/C, red).
  - Rationale: The story instructs "derive the correct behaviour from the ROM ... before pinning; do NOT assume the in-code hypothesis is correct" — the hypothesis was measured false, so the ACs are honoured through the real mechanism.
  - Severity: minor
  - Forward impact: minor — Dev's GREEN must not assume `wrapH`/`atEdge` is the fix site; the fix is in the headless/body path (see Delivery Findings). No AC text changed.

### Dev (implementation)

- **A BODY now takes the screen-edge turn; the ROM instead promotes a head onto each shot sub-run.**
  - Spec source: context-story-ml12-2.md, AC-1/AC-2; millipede ROM MOTION 78$ (MILLI.MAC:1495) + splitOnTurn (MS-8)
  - Spec text: "a head reaching either horizontal play-area edge turns and drops a row per the ROM, and never wraps to the opposite side ... a repeated dead-horizontal traverse must be impossible"
  - Implementation: In `stepMillipede`'s body branch, a body that is not following its leader now turns at the screen edge (`atScreenEdge`) instead of coasting off it. The ROM body does NOT edge-turn (78$ routes only heads to the edge logic); the ROM avoids body-wrap because `splitOnTurn` (MS-8, ml3-2) promotes a HEAD onto the front of every shot sub-run, and that head owns the edge turn. That promotion is not wired into the port's kill path (`sim.ts` splices a shot segment out with no promotion), so without this a headless/fragmented train's front body marches dead-horizontal and wraps mod-256.
  - Rationale: Minimal change that satisfies the pinned observable (no wrap, must descend) without re-opening ml3-2 head-promotion; in an intact train a body only reaches the edge as its leader's follow-gap opens, so it coincides with the follow-turn it would take anyway (all 1456 tests stay green).
  - Severity: minor
  - Forward impact: minor — ml3-2 (split/death head promotion) should, when built, restore ROM-faithful sub-run heads; this body edge-turn is a bounded stand-in and is harmless to keep (a promoted head reaches the edge check first). No sibling AC broken.

## Sm Assessment

**Story:** ml12-2 — millipede heads wrap horizontally off the play area and re-enter from the other side (repeated dead-horizontal traverses) instead of turning + dropping a row at the edge. 3pt, type: bug, tdd. Owner playtest finding dated 2026-08-17.

**Setup verification (done before spawning sm-setup):**
- Sibling-ownership probes clean: no remote branch existed for ml12-2; a-2 owns ml12-1, a-3 owns df4-4. No contention.
- develop synced to origin (d1709b11) before the branch was cut.
- The description carries an explicit HYPOTHESIS labelled "unverified, verify against ROM + live code before pinning." This is intentional: the ROM derivation is TEA/Dev work, NOT a stale claim to correct. Left verbatim.
- Cited line references confirmed accurate against the current tree: wrapH at core/millipede.ts:144 (with the "real hardware wraps mod 256" comment at :143), LEFT_EDGE=0xf0 / RIGHT_EDGE=0x10 at :82-83 (matching MILLI.MAC:1511/1519), atEdge at :323-324. No line-number correction block needed.

**For TEA (RED):** The bug is a race between the mod-256 horizontal wrap (wrapH) and the screen-edge turn (atEdge). The RED test must reproduce the reported behaviour — a head reaching either horizontal edge should TURN and drop a row, and a repeated dead-horizontal traverse must be provably impossible. Derive the correct edge-turn behaviour from the millipede ROM (MILLI.MAC:1511/1519 region) before pinning; do NOT assume the in-code hypothesis is correct. Every changed core constant carries a citations.test.ts-gated claim. AC includes a LIVE confirmation at /millipede/.

**Claim pushed:** fix/ml12-2-millipede-heads-wrap-horizontally-edge-turn (commit stamps in_progress + context). Story status: in_progress.
## TEA Assessment

**Tests Required:** Yes
**Reason:** 3pt bug; behavioural regression that must be pinned before the fix.

**Test Files:**
- `plugins/millipede/tests/millipede-edge-wrap.test.ts` — the horizontal edge / no-wrap behaviour, driven through the real producers (`stepMillipede`, `stepGame`).

**Tests Written:** 6 tests covering AC-1 (head edge-turn, non-vacuous anti-wrap — 2 control tests, green) and AC-2 (no dead-horizontal wrap — 4 tests, red).
**Status:** RED (4 failing — ready for Dev; 2 green controls prove the harness and the head-turn are sound)

**RED evidence:** `npx vitest run --project millipede` → 4 failed | 1452 passed. The 4 failures are exactly the AC-2 headless-train tests (Groups B/C). Group C failure output shows the owner's bug verbatim: `h fe->0 v=f8` repeated across segments at a constant V (dead-horizontal, re-entering the far side).

### Rule Coverage (lang-review / project rules)

| Rule | Test(s) | Status |
|------|---------|--------|
| #26 assertion terms not all read from SUT | ROM constants hand-mirrored with MT-* citations in the test file | n/a (structural) |
| core/shell boundary | tests are pure core (no DOM); driven via `stepMillipede`/`stepGame` | pass |
| observable-not-implementation | AC-2 pins the observable (no wrap + must descend), not the fix mechanism | failing (RED) |
| no vacuous assertions | `isWrapStep` per-step check supersedes the vacuous `h <= 0xF8` bound; every test asserts a concrete list/inequality | pass (self-checked) |

**Rules checked:** the applicable lang-review items (assertion independence, purity, non-vacuous assertions) have coverage.
**Self-check:** No vacuous tests introduced. Found one pre-existing vacuous bound (`millipede.test.ts` ml3-1 `h <= 0xF8`) — logged as a Delivery Finding and superseded by Group A rather than edited (it still asserts reversal + descent meaningfully; editing it is out of this story's scope).

**Grounding:** The story's head-wrap hypothesis was measured FALSE against ROM + live code (see Delivery Findings + Design Deviation). The real defect is a headless train (kill-splice with no head-promotion); the leaderless front body has no edge-turn and coasts past the byte boundary.

**Handoff:** To Dev (Julia) for GREEN. The fix is in the headless/body edge path, NOT `wrapH`/`atEdge`. Pin the observable: no live segment crosses 0x00/0xFF; a train marching into an edge must descend. Confirm the chosen fix does not silently re-open ml3-2 (head-promotion/split) scope. Verify LIVE at /millipede/ (AC-3) with no full-screen strobe (ml7-4 gate).
## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `plugins/millipede/src/core/millipede.ts` — extract a shared `atScreenEdge` helper (MT-21/22) used by both the head reaction and the body branch; a non-following BODY now turns at the screen edge instead of coasting its MOBJH past the byte boundary and wrapping. Root cause: the kill-splice leaves headless/fragmented trains whose front body has no head to follow and no edge-turn (the ROM's `splitOnTurn` head-promotion, ml3-2, is unwired).
- `plugins/millipede/tests/millipede-edge-wrap.test.ts` — removed three unused hand-mirrored constants (tsc `noUnusedLocals`); no assertion changed.

**Tests:** 6/6 ml12-2 green; full millipede suite **1456/1456 green**; `npm run lint` (tsc --noEmit) clean.

**Integration verification (the ml9 "green-tests ≠ right-pixels" rule):** re-ran the reproduction through the full `stepGame` — firing + weaving, 14 seeds × 3000 frames — **zero** segment wraps across the 0x00/0xFF boundary (was ~180 before the fix; the first, narrower leaderless-only fix still left 24 from split sub-runs). Deepest descent still reaches the bottom row (train motion intact).

**Live smoke at /millipede/** (Playwright vs the running dev server; Chrome extension was down): the build serves and renders — mushroom field, DDT bombs, HUD, and the millipede train as a **coherent snake** in the player zone (not a dead-horizontal smear). No full-screen strobe/flash (AC-3 / ml7-4 accessibility gate). A single static frame can't show the edge-turn temporally — the deterministic zero-wrap probe is the authoritative motion evidence; a HUMAN interactive playtest remains the ideal final AC-3 confirmation (pointer-lock input, per the centipede-bootstrap human-smoke note).

**Branch:** fix/ml12-2-millipede-heads-wrap-horizontally-edge-turn
**PR:** https://github.com/slabgorb/arcade/pull/507

**For Reviewer:** The fix diverges from the ROM (a ROM body does NOT edge-turn; the ROM promotes a sub-run head instead) — logged as a Dev deviation, a bounded stand-in until ml3-2 wires `splitOnTurn` into the kill. Watch: (1) does giving every non-following body an edge-turn change any intact-train serpentine behaviour? (argued no — a body reaches the edge only as its follow-gap opens; 1456 tests agree). (2) the `atScreenEdge` extraction is behaviour-preserving for the head path (same expression). (3) AC-3's live/no-strobe is smoke-verified, not human-played.

**Handoff:** To Reviewer (the Thought Police).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (GREEN 1456 + orch 505; no smells; no probe files) | confirmed 0, dismissed 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — compensated by reviewer's own mutation + A/B |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 2 (coverage gaps, medium+low) | deferred 2 (behaviour VERIFIED correct; test-hardening only) |
| 5 | reviewer-comment-analyzer | Yes | findings | 5 (3 high citation, 2 medium) | confirmed 5 (all verified against repo claims) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (pure core sim, no I/O/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 1 violation (readonly) + 1 minor | confirmed 1, deferred 1 |

**All received:** Yes
**Total findings:** 8 confirmed/deferred, 0 dismissed — 3 high (citations), 1 medium (readonly type), 4 medium/low (prose + coverage). None are logic-correctness defects (code VERIFIED correct); all are comment/citation/type-precision + test-hardening.

### Reviewer independent verification (compensating for disabled edge-hunter)
- **No intact-train regression — VERIFIED by A/B.** Captured the intact boot train trajectory (200 frames, head + 11 bodies) on HEAD (with fix) and on HEAD~1 (pre-fix, confirmed lacking `atScreenEdge`): **byte-identical** (md5 be220cc6…). The 55 "new-branch-reached" events are a boundary artifact — SEG_SPACING == BODY_FOLLOW_GAP == 8, so an intact body reaches the edge exactly as its follow-gap opens and `move(true)` is taken either way.
- **Fix is load-bearing — VERIFIED by mutation** (removing `if (atScreenEdge(s)) return move(s, true)` fails 4/6 tests with the `h fe->0` wrap signature; corroborated by test-analyzer's independent mutation).
- **Opposite-direction split sub-run (test-analyzer finding #1) — VERIFIED handled**: a body whose array-leader marches the other way, into the edge at gap 0, does not wrap and descends. Behaviour correct; only the committed test is missing.
- **No new core constant** ⇒ no citations.test.ts change required (reuses LEFT_EDGE/RIGHT_EDGE, MT-21/22); orchestrator suite (505) green confirms no audit/citation regression.

### Reviewer (audit)

- **TEA deviation (RED pins observable via ROM-grounded mechanism, not the head-wrap hypothesis)** → ✓ ACCEPTED by Reviewer: the head-wrap hypothesis was correctly measured false; the RED tests pin the observable (no wrap + must descend) and are mutation-verified load-bearing (reviewer + test-analyzer both confirmed 4/6 fail without the fix). No AC text changed; sound.
- **Dev deviation (a BODY now edge-turns; ROM does not — ROM promotes sub-run heads)** → ✓ ACCEPTED by Reviewer with a citation correction required: the DECISION (give a non-following body the edge-turn as a bounded stand-in) is sound and verified non-regressive on the intact train (reviewer A/B: byte-identical trajectory over 200 frames), and correctly handles the opposite-direction split sub-run (reviewer probe: no wrap + descends). HOWEVER the deviation's supporting citation is inaccurate and MUST be corrected (see findings [DOC-1..3]): `splitOnTurn`/MS-8 is the BOTTOM-ROW split (MS-7 V<9 @ MILLI.MAC:1561; MS-8 promotion @ :1590), NOT a shot-kill promotion, and it is wired NOWHERE in production (not merely "absent from the kill path"). Reframe accordingly.
- **UNDOCUMENTED:** none — no spec deviation was left unlogged; the divergence (body edge-turn vs ROM) is captured in the Dev deviation above.

### Reviewer (code review)

- **Improvement** (blocking): ROM citations in the fix comment and test header are inaccurate. Affects `plugins/millipede/src/core/millipede.ts` (:322-333 — reframe: `splitOnTurn`/MS-8 is the BOTTOM-ROW split, MS-7 V<9 @ MILLI.MAC:1561 / MS-8 @ :1590, NOT a shot-kill promotion; and it is wired NOWHERE in production, not merely "absent from the kill path") and `plugins/millipede/tests/millipede-edge-wrap.test.ts` (:17 `MILLI.MAC:1626-1628` → the 20$ block is `MILLI.MAC:1605-1607`, MT-24 pins `ADC X,MOBJH` @ 1607; :24 `MILLI.MAC:164$` → line 1590, label 164$). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the test's local `MillipedeModule.stepMillipede` types the param as `Segment[]` but the real signature is `readonly Segment[]`, forcing a `cur as Segment[]` cast (`:116`) that hides the reducer no-mutation contract. Affects `plugins/millipede/tests/millipede-edge-wrap.test.ts` (add `readonly`, drop the cast). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): unbacked prose — "coincides with the follow-turn it would take anyway" (`millipede.ts:331-333`) is asserted without backing (reviewer A/B-verified it IS true because SEG_SPACING==BODY_FOLLOW_GAP==8 → cite that or mark it a design assumption); "supersede" (test `:8`) overstates — `millipede.test.ts:410`'s vacuous `h <= 0xF8` bound is untouched (reword to "is stronger than", or tighten :410). *Found by Reviewer during code review.*
- **Gap** (non-blocking): two coverage gaps on already-correct behaviour (test-analyzer) — no committed test locks (a) the opposite-direction split sub-run, or (b) an intact head+body train driven into the edge. Reviewer verified both behave correctly; add tests to lock them. Affects `plugins/millipede/tests/millipede-edge-wrap.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `stepMillipede` top JSDoc (`millipede.ts:369-374`) still says only "bodies follow their leader down (MT-20)" — add a note about the ml12-2 body edge-turn. *Found by Reviewer during code review.*

## Reviewer Assessment — Round 1 (REJECTED — SUPERSEDED by Round 2 below)

**Verdict:** REJECTED

The fix is logically CORRECT and well-verified — but it ships confirmed-inaccurate ROM citations in a fidelity project, plus a type-contract weakening. Both are cheap to correct and warrant one tight fix cycle before merge. No logic-correctness defect was found.

### Severity table

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM][DOC] | ROM citation wrong: `splitOnTurn`/MS-8 mis-cited as a shot-kill head promotion; it is the BOTTOM-ROW split (MS-7 V<9 @ MILLI.MAC:1561, MS-8 @ :1590) and is wired NOWHERE in production | `millipede.ts:322-333` | Reframe: the kill path splices a shot segment out with NO head promotion of any kind; `splitOnTurn` is the (unwired) bottom-row split. Do not imply the ROM promotes a head on a shot-kill unless separately cited. |
| [MEDIUM][DOC] | Citation line numbers wrong: `MILLI.MAC:1626-1628` for the 20$ coast-march | `millipede-edge-wrap.test.ts:17` | The 20$ block is `MILLI.MAC:1605-1607`; MT-24 pins `ADC X,MOBJH` @ 1607 (verbatim already correct). |
| [MEDIUM][DOC] | Malformed citation `MILLI.MAC:164$` (label, not line) + shot-kill misattribution | `millipede-edge-wrap.test.ts:24` | Cite line 1590 (label 164$); reframe as the bottom-row split promotion. |
| [MEDIUM][TYPE][RULE] | Test's `MillipedeModule.stepMillipede` drops `readonly`, forcing `cur as Segment[]` cast that hides the reducer no-mutation contract (rule-checker #2/#8, verified load-bearing via tsc) | `millipede-edge-wrap.test.ts:83-85,116` | Type param as `readonly Segment[]`; drop the cast. |
| [LOW][DOC] | Unbacked prose ("coincides with the follow-turn", "supersede") | `millipede.ts:331-333`, `millipede-edge-wrap.test.ts:8` | Ground the coincidence (SEG_SPACING==BODY_FOLLOW_GAP==8, reviewer A/B-verified) or mark it an assumption; reword "supersede"→"is stronger than". |
| [LOW][TEST] | No committed test locks the opposite-direction split sub-run or an intact head+body-into-edge (behaviour VERIFIED correct) | `millipede-edge-wrap.test.ts` | Add the two cases (optional but recommended). |
| [LOW][DOC] | `stepMillipede` JSDoc not updated for the body edge-turn | `millipede.ts:369-374` | Add a one-line note. |

### Subagent dispatch (all 8 tags)
- `[EDGE]` — reviewer-edge-hunter DISABLED via settings; compensated by reviewer's own mutation + A/B trajectory diff (see below). No unhandled boundary found beyond those covered.
- `[SILENT]` — reviewer-silent-failure-hunter DISABLED; manual check: the change adds no error handling, no catch, no fallback — a pure predicate + one branch. No swallowed failure. Clean.
- `[TEST]` — reviewer-test-analyzer: 2 findings (coverage gaps). Confirmed as gaps; behaviour VERIFIED correct by reviewer probe → LOW, non-blocking.
- `[DOC]` — reviewer-comment-analyzer: 5 findings. All confirmed against the repo's own pinned claims (MT-24 @ 1607; MS-7/8 @ 1561/1590; `splitOnTurn` uncalled). The 3 citation errors are the blocking basis for this REJECT.
- `[TYPE]` — reviewer-type-design DISABLED; the readonly issue was caught by rule-checker (#2/#8) instead and confirmed.
- `[SEC]` — reviewer-security DISABLED; N/A — pure deterministic core simulation, no I/O, no secrets, no untrusted input, no auth surface.
- `[SIMPLE]` — reviewer-simplifier DISABLED; manual check: the `atScreenEdge` extraction REMOVES duplication (head + body share one definition); the change is minimal (one branch). No over-engineering.
- `[RULE]` — reviewer-rule-checker: 1 violation (readonly, #2/#8) + 1 minor (JSDoc). Purity gate (52/52) and citations gate (31/31) re-run green; no new uncited constant; Segment readonly + spread-rebuild intact.

### Rule Compliance (arcade + TS lang-review)
- **Core purity:** PASS — `atScreenEdge` and the body branch are pure (no DOM/Date/Math.random/I-O); purity.test.ts 52/52 green (rule-checker executed it).
- **New-constant citation gate:** PASS — no new `export const`; reuses LEFT_EDGE/RIGHT_EDGE (MT-21/22); citations.test.ts green.
- **Readonly Segment / no in-place mutation:** PASS in production (`move` rebuilds via spread); the TEST under-specifies `readonly` — the [TYPE] finding.
- **Lang-review #26 (assertion terms not all from SUT):** PASS — constants hand-mirrored; behaviour driven through the real producer.
- **Prose-comment accuracy (unguarded surface):** FAIL — the [DOC] citation findings; no gate covers prose, so these ship green unless fixed here.

### Observations (VERIFIED + findings)
1. [VERIFIED] No intact-train regression — evidence: A/B trajectory of the boot train (200 frames) on HEAD vs HEAD~1 is byte-identical (md5 be220cc6…); HEAD~1 confirmed to lack `atScreenEdge`.
2. [VERIFIED] Fix is load-bearing — evidence: removing `if (atScreenEdge(s)) return move(s, true)` (millipede.ts:334) fails 4/6 tests with the `h fe->0` wrap signature (reviewer + test-analyzer independent mutation).
3. [VERIFIED] Opposite-direction split sub-run handled — evidence: reviewer probe (leader dh=-2, follower dh=+2, gap 0, into edge) → wraps=0, minV descends.
4. [VERIFIED] `atScreenEdge` extraction is behaviour-preserving for the head — evidence: expression byte-identical to the removed inline `atEdge`; 1456 tests green; A/B includes the head.
5. [VERIFIED] Integration: zero wraps across 14 seeds × 3000 frames of firing `stepGame` (the owner's reproduction), deepest V reaches the bottom row.
6. [MEDIUM][DOC] Citation inaccuracies (3) — see severity table.
7. [MEDIUM][TYPE] readonly under-specification — see severity table.
8. [LOW] Unbacked prose + 2 coverage gaps + JSDoc — see severity table.

### Devil's Advocate
Assume this fix is broken. First attack: does giving EVERY non-following body an edge-turn corrupt the normal serpentine? A body that turns a frame early would desynchronise the train's shape. I took this seriously and ran an A/B of the intact boot train over 200 frames pre- and post-fix: byte-identical. The reason is arithmetic, not luck — SEG_SPACING and BODY_FOLLOW_GAP are both 8, so a body arrives at the edge exactly as its follow-gap reaches a full cell; the follow-branch fires first and the new edge-branch is never the deciding path in an intact train. But that safety is a *coincidence of two constants*: if a future story retunes SEG_SPACING or BODY_FOLLOW_GAP, or spaces a train differently, a body could reach the edge with the gap not yet open and now edge-turn where before it marched — a silent gameplay change with NO test guarding it (the [TEST] gap). Second attack: the bottom of the screen. A body that edge-turns descends; a headless train near V=8 could be driven to descend off the bottom — but I confirmed the deepest V in the integration sweep is 0x08 (the player row), same as an intact train, and bottom handling is a pre-existing gap orthogonal to this change. Third attack: the comment lies about the ROM. This one lands — the fix's justification cites `splitOnTurn`/MS-8 as a shot-kill promotion, but MS-8 is the bottom-row split and `splitOnTurn` is dead code. A future engineer reading this comment would wire the wrong ROM mechanism into the kill path chasing "faithfulness". In a clone whose entire value is provenance, a confidently-wrong citation is a real defect, not a nit — hence blocking. Fourth attack: could the type cast (`cur as Segment[]`) mask a real mutation bug? Yes in principle — if a refactor mutated the array in place, the test's weakened type would not complain. Low probability, but the rule-checker is right to flag it. None of these attacks found a LOGIC bug in the shipped behaviour; the blocking issues are provenance and contract precision.

**Handoff:** Back to Dev for fixes (comment/citation corrections + readonly type; optional coverage tests). No PR to create or merge.
## Dev Assessment (review rework)

**Rework of Reviewer findings — logic UNCHANGED (only comments/citations/type/tests):**
- [DOC] Corrected the body-branch comment (`millipede.ts:322-334`) and test header/`:24` citations: `splitOnTurn`/MS-8 reframed as the BOTTOM-ROW split (MS-7 V<9 @ MILLI.MAC:1561, MS-8 @ :1590), NOT a shot-kill; stated the kill path splices with NO promotion and `splitOnTurn` is unwired everywhere.
- [DOC] Fixed line numbers: 20$ coast-march is `MILLI.MAC:1605-1607` (MT-24 pins `ADC X,MOBJH` @ 1607), was 1626-1628; `164$` → 1590.
- [DOC] Grounded "coincides with follow-turn" (SEG_SPACING==BODY_FOLLOW_GAP==8, A/B byte-identical); reworded "supersede"→"stronger than"; updated `stepMillipede` JSDoc for the body edge-turn.
- [TYPE] `MillipedeModule.stepMillipede` param → `readonly Segment[]`; dropped the `cur as Segment[]` cast.
- [TEST] Added two coverage tests: opposite-direction split sub-run (locks the fix's 2nd scenario); intact head+body train into the edge (locks no-regression).

**Verification:** millipede suite **1458 green** (2 new tests); purity 52 + citations 25 green; `tsc` clean. The fix logic lines (`atScreenEdge`, `if (atScreenEdge(s)) return move(s, true)`) are byte-unchanged, so integration behaviour (zero wraps, verified prior round) is preserved.

**Handoff:** Back to Reviewer for re-review.
## Subagent Results — Round 2 (re-review of rework)

Scope: the rework diff (34f05943..HEAD) is comments/citations/type/2 tests only; NO runtime-logic line changed (verified: `git diff` shows no change to `atScreenEdge` or the `if (atScreenEdge(s)) return move(s, true)` branch). Round-1 panel results carry forward for the unchanged logic; the changed domains were re-verified.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (reviewer-run) | clean | GREEN 1458 + purity 52 + citations 25; tsc clean | confirmed 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | logic unchanged since round 1 (A/B byte-identical) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | no error-handling changed |
| 4 | reviewer-test-analyzer | Yes (reviewer mutation) | resolved | round-1 gaps closed by 2 new tests | sub-run test load-bearing (mutation: fails without fix); intact test = valid no-regression control |
| 5 | reviewer-comment-analyzer | Yes (re-run) | clean | all 5 round-1 findings RESOLVED; 0 new | confirmed 0 — line numbers 1561/1590/1607 verified byte-for-byte vs ROM + claims |
| 6 | reviewer-type-design | Skipped | disabled | N/A | readonly fix verified by tsc |
| 7 | reviewer-security | Skipped | disabled | N/A | pure core sim |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | cast removed (less complexity) |
| 9 | reviewer-rule-checker | Yes (reviewer-run) | resolved | round-1 readonly violation fixed | tsc clean with `readonly Segment[]` param and no cast |

**All received:** Yes
**Total findings (round 2):** 0 new; all 6 round-1 findings resolved and independently re-verified.

### Reviewer (audit) — Round 2
- **Dev deviation (body edge-turn vs ROM head promotion)** → ✓ ACCEPTED (round 1), and its supporting citation is now CORRECTED and re-verified (splitOnTurn = bottom-row split MS-7/8 @ 1561/1590, unwired; not a shot-kill). No open deviation.

## Reviewer Assessment

**Verdict:** APPROVED

Re-review of the round-1 rework. The blocking basis (inaccurate ROM citations) and the readonly type finding are fully resolved and independently re-verified; no new issues. The runtime logic is byte-unchanged from the round-1 GREEN, so the behavioural verification from round 1 (A/B byte-identical intact train, mutation-confirmed fix, integration zero-wraps over 14 seeds × 3000 frames, live smoke) stands.

**Data flow traced:** shot kills head → `sim.ts` splices it out (no promotion) → headless/fragmented train → a non-following body now hits `atScreenEdge` → `move(s, true)` turns + drops instead of coasting `wrapH` past 0x00/0xFF. Safe: cannot re-enter the far side (verified no-wrap across the full `stepGame`).
**Pattern observed:** shared `atScreenEdge` helper removes head/body duplication — `millipede.ts:281`.
**Error handling:** N/A — pure deterministic core reducer, no I/O/failure path.

### Subagent dispatch (all 8 tags)
- `[EDGE]` — disabled; compensated round 1 by reviewer A/B + mutation. Logic unchanged since, so those results stand.
- `[SILENT]` — disabled; no error-handling touched by the rework.
- `[TEST]` — round-1 coverage gaps CLOSED: 2 new tests added; reviewer mutation confirms the opposite-direction sub-run test is load-bearing and the intact-train test is a valid no-regression control.
- `[DOC]` — comment-analyzer re-run: all 5 citation/prose findings RESOLVED, 0 new; line numbers 1561/1590/1607 verified byte-for-byte vs ROM + pinned claims (MT-24, MS-7/8).
- `[TYPE]` — readonly finding fixed: `MillipedeModule.stepMillipede` now `readonly Segment[]`, cast dropped; tsc clean.
- `[SEC]` — disabled; N/A (pure core sim, no I/O/secrets/untrusted input).
- `[SIMPLE]` — disabled; the cast removal reduces complexity; `atScreenEdge` still de-duplicates.
- `[RULE]` — rule-checker round-1 violation (readonly) fixed; purity (52) + citations (25) gates re-run green; no new constant.

### Rule Compliance
- Core purity: PASS (purity 52/52). New-constant citation gate: PASS (no new const; citations 25/25). Readonly Segment/no-mutation: PASS in prod AND now in the test type. Lang-review #26: PASS. Prose-comment accuracy: PASS (citations corrected + re-verified).

### Observations
1. [VERIFIED] Citations now correct — evidence: MILLI.MAC:1561=`16$: CMP I,9`, :1590=`STA Y,MOBJC ;TURN ON COLOR FOR EYES`, :1607=`ADC X,MOBJH`; match MT-24/MS-7/MS-8 pins; comment-analyzer independently confirmed.
2. [VERIFIED] readonly fix compiles without cast — evidence: `npm run lint` exit 0.
3. [VERIFIED] New sub-run test load-bearing — evidence: removing the body `atScreenEdge` branch fails it (mutation, restored after).
4. [VERIFIED] Intact-train no-regression test is a valid control — evidence: green on both fixed and mutant (an intact train never wrapped); asserts body follows + descends.
5. [VERIFIED] Logic byte-unchanged since round-1 GREEN — evidence: `git diff 34f05943..HEAD` touches no `atScreenEdge`/`move` branch line.
6. [VERIFIED] Suite green — 1458 millipede + purity 52 + citations 25.

**Handoff:** To SM for finish-story.