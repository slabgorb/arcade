---
story_id: "jt9-14"
jira_key: "jt9-14"
epic: "jt9"
workflow: "tdd"
---
# Story jt9-14: Player-vs-ptero attack is box-only too — the third pass that stops at broadPhase, and the narrowPhase X-blindness question it forces

## Story Details
- **ID:** jt9-14
- **Jira Key:** jt9-14
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** trunk-based (branching skipped — work happens on the default branch)
- **Branch:** none
- **PR:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-04T22:17:18Z
**Repos:** arcade

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-04T21:39:34.049777Z | 2026-08-04T21:43:18Z | 3m 43s |
| red | 2026-08-04T21:43:18Z | 2026-08-04T22:08:58Z | 25m 40s |
| green | 2026-08-04T22:08:58Z | 2026-08-04T22:11:36Z | 2m 38s |
| review | 2026-08-04T22:11:36Z | 2026-08-04T22:17:18Z | 5m 42s |
| finish | 2026-08-04T22:17:18Z | - | - |

## Story Background

**Points:** 3 | **Priority:** p2 | **Type:** bug

### From the Epic Description (jt9)

This story is part of BLOCK C (jt9-13 to jt9-17, 16 pts): "collision geometry — settle the premise, then fix the passes."

jt9-14 is positioned as the second story in this block "not only for its own defect (the player's reach against a pterodactyl is a flat box) but because it is the story that must rule on whether narrowPhase's screen-X blindness matches the machine at all — a premise inherited unexamined since jt2-3 that jt9-15 and jt9-17 both build on."

The epic explicitly states: "jt9-14 and jt9-15 stay separate because jt9-14 anticipated exactly this pass and refused it in its own text ('adjacent enough to be merged by a groomer who reads only the titles; they should not be') — different loop, different routine, different failure."

### MEASURED CORRECTIONS BLOCK (verified 2026-08-04)

The original epic description cite lines were stale. Current facts from the live tree:

- **Target file:** `plugins/joust/src/core/demo.ts` (CORE, not shell)
- **Player-vs-ptero attack pass:** demo.ts **:1491** (`broadPhase(collisionBox(playerJoust), entityBox(pt.entity!))`) → `resolvePteroAttack` at **:1493**, with NO narrowPhase between them. This is the box-only defect.
- **Egg-catch pass** (jt8-7's fixed reference, correct for comparison): broadPhase THEN narrowPhase at demo.ts **:1544**/**:1552**
- **Joust pass** (correct reference): demo.ts **:1379**/**:1385**
- **collisionMaskFor location:** demo.ts **:1181**, returns `'PT1RC'` for a ptero at **:1184**. Mask exists, is claimed, is reachable.
- **PT1RC:** Live COLLISION_TABLES entry in `plugins/joust/src/core/pictures.ts` **:1829** with **13 span rows** (4 blank + 6 real + 3 blank). Confirmed exactly as described.
- **narrowPhase and MaskRef:** Live in `plugins/joust/src/core/joust.ts` :177 / :56. Confirmed.

### Research Obligation (TEA/Architect)

The story requires reading the ROM's own collision comparison to decide whether narrowPhase's X-blindness (it compares COFF-unbiased sprite-local columns and never sees screen X; broadPhase carries all horizontal truth) faithfully matches the ROM, since this story makes that premise govern a THIRD pass.

**Valid outcomes:**
- Confirm the port (narrowPhase mechanism matches ROM)
- File a follow-up correction (it does not match)

Either is acceptable; this is a TEA/Architect research task before starting production work.

### Watch-For (from jt8-7 precedent)

jt8-7's fix moved four frame-exact seeded pins in `plugins/joust/tests/audio-events.test.ts`. Expect the same here. Re-baseline by SCANNING each test's own precondition rather than nudging numbers. The method is written up in sprint/archive/jt8-7-session.md and the Dev sidecar.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Question/Improvement (non-blocking) — the research obligation is SETTLED: wiring narrowPhase in matches the ROM, but narrowPhase itself is an incomplete BPCOL port.** The ROM runs the span-mask test BPCOL (JOUSTRV4.SRC:7043) as a PRECONDITION to the whole player-vs-ptero dispatch: `OSTXYP JSR BPCOL` (:4944) → `BCS OSTHIT` (:4945) → the lance compare (:4971-5001). So the box-only third pass is the infidelity and consulting narrowPhase is the correction — **port direction CONFIRMED**, pinned by demo-jt9-14-source.test.ts. BUT BPCOL subtracts COLDX (the screen-X separation) from its column comparison (:7047/:7051/:7062), so it is a screen-space overlap; the port's narrowPhase (joust.ts:177) drops COLDX and compares superimposed sprite-local columns, leaning on broadPhase for all of X. That X-blindness is a **pre-existing divergence since jt2-3 affecting all three overlap passes** — **filed as jt9-43** (3pt, backlog). jt9-14 correctly wires the existing COLDX-less narrowPhase (consistent with the joust + egg passes); jt9-43 fixes the COLDX omission for all three at once. Every jt9-14 fixture is staged at dx=0 (COLDX=0), so these bands are invariant under jt9-43.

- **Improvement (non-blocking) — the collision-contract change rippled into 8 sibling tests across 4 files; re-seated in RED (TEA owns this per the sidecar).** The natural lance-kill geometry every sibling stages (lanceOffset 10 → dy=−10) sits one pixel OUTSIDE the CWNG3R×PT1RC mask (which agrees only at dy −9/−8), so the fix turned 8 green kills RED: audio-emission.test.ts (×2), demo-jt3-7-menagerie.test.ts (×3), demo-jt4-4.test.ts (×2, baiters are ptero-kind), demo-jt5-16.test.ts (×1). All re-seated to lanceOffset 9 (in the band AND the mask), verified green on BOTH the pre- and post-fix tree. This ripple is real scope the 3-pt estimate did not price — a 3-pt story whose contract change touches 4 sibling suites is a signal for grooming, not a defect.

- **Informational — the faithful lance-kill window is TIGHT (2px).** kill band [8,12] ∩ mask-hit [−9,+8 by dy] = dy {−8,−9} only. At dx=0 this is faithful (BPCOL == COLDX-less narrowPhase when COLDX=0), so the ROM itself would not grant a kill at exactly offset 10/dx=0 — the old fixtures "worked" only because the box-only pass was over-permissive. jt9-43's COLDX fix will widen this window for dx≠0.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Re-seated 8 sibling player-vs-ptero kill fixtures from lanceOffset 10 to 9 (4 files)**
  - Spec source: TEA gotchas sidecar — "A story that changes a hit/collision CONTRACT breaks sibling tests staged OUTSIDE the new gate — re-seat them in RED"
  - Spec text: "anything outside your new gate must be re-seated (TEA owns test maintenance) into the gated region, preserving that test's ACTUAL intent … Verify the re-seat stays green BOTH on current code and after the fix"
  - Implementation: player posY 110→109 (offset 10→9) in demo-jt5-16.test.ts, demo-jt3-7-menagerie.test.ts (killScenario + the dissolve fixture), demo-jt4-4.test.ts (lancePlayer, shared by both DBAIT tests); audio-emission.test.ts kill re-seat `stage(10)`→`stage(9)`. Each preserves the test's intent (pair-loop-leak / dissolve / NBAIT settle / cue emission), which is orthogonal to the exact offset. Verified green on the clean tree AND with the fix applied.
  - Rationale: the CWNG3R×PT1RC masks agree with the kill band only at offset 8-9; offset 10 became a mask MISS. Offset 9 is in the band and the mask, green in both worlds. jt9-14's own dy=−10/−11/−12 tests supply the box-only-excluded coverage the re-seat gave up.
  - Severity: minor
  - Forward impact: these four files stage at dx=4, so jt9-43 (the COLDX fix) may shift their bands — jt9-43's description names them for re-baseline.

- **Re-seated audio-emission's out-of-band control from stage(14) to stage(5)**
  - Spec source: same sidecar entry; audio-emission.test.ts:238 ("the SAME contact outside the band kills the KNIGHT")
  - Spec text: "Offset 14 is deliberate: still INSIDE the 16px collision box … outside the 10±2 glide band"
  - Implementation: `stage(14)` → `stage(5)`; offset 5 is a mask HIT (dy=−5) out of the kill band, so the pteroWins/player-death intent survives the fix. Offset 14 was a mask MISS post-fix → the `not.toContain('ptero-death')` would have passed VACUOUSLY (nothing resolves). Comment updated to the mask rationale.
  - Rationale: preserve the control's non-vacuity — it must resolve a REAL contact that goes the player-death way, which requires the mask to agree.
  - Severity: minor
  - Forward impact: none at dx=4/COLDX=0 for offset 5; jt9-43 may revisit.

- **Bumped the README derived test-file count 117→119**
  - Spec source: audio-seam-scope.test.ts:400 ("the suite FILE count matches what vitest actually discovers")
  - Spec text: "README says N test files; vitest discovers M. Update the README — this number is derived and will redden whenever it drifts."
  - Implementation: plugins/joust/README.md:48 `# 117 files` → `# 119 files` (two new test files: demo-jt9-14.test.ts, demo-jt9-14-source.test.ts).
  - Rationale: mechanical derived-count maintenance mandated by adding test files.
  - Severity: trivial
  - Forward impact: none.

## Sm Assessment

**Routing:** tdd (phased) → hand off to TEA for the RED phase. 3pt bug, `acceptance_criteria: null` in
the epic YAML, so TEA DERIVES the ACs during RED (against the corrected line cites, not the stale ones).

**Sibling probes (clean):** no remote branch for jt9-14 at setup; live sibling sessions are jt9-24 (a-2)
and cp7-4 (a-3) — no collision. Claim pushed: commit `5cdfa9e` on `main` (context + epic stamp) plus an
empty claim branch `feat/jt9-14-player-vs-ptero-box-only` (tip == main) so a sibling probe lights up.
Story stamped `in_progress` (sm-setup left it `backlog`, sixth confirmation of that bug).

**Premises measured before setup (all TRUE in shape; only line numbers drifted, file grew since filing):**
- player-vs-ptero attack pass IS box-only — `core/demo.ts:1491` broadPhase → `resolvePteroAttack:1493`, no narrowPhase.
- `collisionMaskFor:1184` already returns `'PT1RC'` for a ptero; PT1RC is live in `core/pictures.ts:1829` with 13 span rows.
- egg-catch reference `:1544`/`:1552`; joust reference `:1379`/`:1385`; `narrowPhase`/`MaskRef` at `core/joust.ts:177`/`:56`.
The context file (which TEA reads) is a pure YAML regen carrying the STALE cites, so I added a ⚠ CORRECTION
banner at its top pointing to the current lines and to this session's measured block.

**For TEA:** the story carries an in-scope research obligation — read the ROM's own collision comparison and
rule on whether narrowPhase's screen-X blindness faithfully matches the machine before making it govern a
THIRD pass. Confirm-the-port OR file-a-follow-up-correction are both acceptable outcomes; this is NOT a user
ruling. And expect the audio-events.test.ts frame-exact pins to move (jt8-7 precedent) — re-baseline by
scanning each test's precondition, not nudging numbers.

**No user decision required at setup:** no either/or AC, no parked blocker, no refuted premise.
## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `plugins/joust/tests/demo-jt9-14.test.ts` — behavioral: the box-only defect + guards + sharp mask edges + the X-blind broadPhase guard (9 tests)
- `plugins/joust/tests/demo-jt9-14-source.test.ts` — provenance: the ROM BPCOL→OSTHIT gate (:4944-4945, skipIf !vendored) + the 3-call-site census (2 tests)

**Tests Written:** 11 tests (9 behavioral + 2 source) covering derived ACs 1–5.
**Status:** RED — 6 fail on the clean tree (5 behavioral box-only + 1 census); 5 pass (the guards + the ROM byte-read). Full joust+shared: 6 failed / 3269 passed. `npm run lint` clean.

**Derived ACs (acceptance_criteria was null; derived from the corrected description):**
- AC-1 the player-vs-ptero pass consults PT1RC after broadPhase (kill path box-only)
- AC-2 a lance kill inside the mask still resolves (1000 + one ptero-death) — guard
- AC-3 the kill cutoff follows the mask, not the box (sharp −9/−10 edge)
- AC-4 a box-only ptero cannot kill the PLAYER either (pteroWins path box-only; sharp +8/+9 edge)
- AC-5 broadPhase is NOT removed — narrowPhase is X-blind (64px-in-X guard)

**Calibration (measured, not assumed — throwaway probes, since deleted).** Player airborne
→ CWNG3R (13 rows); ptero → PT1RC (6 real rows). dy = pteroTop − playerTop:

| dy band | 16px box | CWNG3R×PT1RC mask | glide kill (lance 8–12) | today | after fix |
|---|---|---|---|---|---|
| −15..−10 | Y | MISS | K at −12..−10 | ptero killed | **ptero survives** (RED) |
| −9, −8 | Y | HIT | K | ptero killed | ptero killed (guard) |
| −7..+8 | Y | HIT | — | player dies | player dies (guard) |
| +9..+15 | Y | MISS | — | player dies | **player survives** (RED) |
| \|dy\|≥16 | . | . | — | nothing | nothing |

All fixtures staged at **dx=0** (COLDX=0) so the bands are invariant under jt9-43's COLDX fix.

**Mutation ranking (measured against the temp fix, then reverted):**
| Mutant | Caught by |
|---|---|
| do-nothing (no narrowPhase) | AC-1 (−11,−12), AC-3 (−10), AC-4 (+12,+9) redden |
| shrink ENTITY_BOX_H instead of the mask | AC-2 (−9) fails to kill — box narrow enough to spare −10 also spares −9 |
| delete broadPhase, keep the mask | AC-5 (64px-in-X) resolves a far contact |
| vacuous always-true narrowPhase | AC-1 (−11,−12) still killed → RED persists |
| wrong mask / wrong top | AC-3/AC-4 sharp edges shift off −9/−10 and +8/+9 |

**Rule Coverage (TS lang-review + house rules):**
| Rule | Coverage | Status |
|------|----------|--------|
| #8 test quality — no vacuous assertions | every test asserts an outcome AND its box-overlap precondition; the stage(14)→stage(5) re-seat exists specifically to keep a control non-vacuous | pass |
| pure-core boundary | tests are `plugins/joust/tests/` (shell side); no `src/core` edits; the fix stays pure (narrowPhase + collisionMaskFor are pure) | n/a to tests |
| non-null `!` on nullable | the fix reuses the existing `pt.entity!` guarded by the livePteros filter; a `collision === null` / mask `=== null` guard is load-bearing for `tsc` (TS2322) even where unreachable — noted for Dev | flagged for Dev |
| double-entry provenance | source companion is an INDEPENDENT reader of the vendored ROM; nothing under src/ imports it | pass |

**Self-check:** 0 vacuous tests. Both throwaway calibration probes deleted before commit (confirmed absent).

**For Dev (GREEN):** mirror the egg pass (demo.ts:1550-1558). After the broadPhase at demo.ts:1491, before `resolvePteroAttack`, add:
```ts
const ptMask = collisionMaskFor(pt)
if (playerJoust.collision === null || ptMask === null) continue   // null guard is load-bearing for tsc (TS2322)
if (!narrowPhase(
  { name: playerJoust.collision, top: playerJoust.posY >> 8 },
  { name: ptMask, top: pt.entity!.posY >> 8 },
  MASKS,
)) continue
```
Do NOT touch narrowPhase itself (the COLDX omission is jt9-43, not this story). Re-run the full joust+shared suite — the 8 sibling re-seats are already done and green; nothing else should move.

**Handoff:** To Dev (Bicycle Repair Man) for GREEN.
## Dev Assessment

**Implementation:** one change — `plugins/joust/src/core/demo.ts` (the player-vs-ptero pass, ~:1493).
After the existing broadPhase, before `resolvePteroAttack`, gate on `narrowPhase(player CWNG3R/CSTN4R,
ptero PT1RC)` — the exact two-step the joust (:1385) and egg (:1552) passes use. The `collision === null
|| pteroMask === null` guard is load-bearing for `tsc` (TS2322) even where unreachable at runtime, per
TEA's note. No change to narrowPhase itself (the COLDX omission is jt9-43).

**Tests:** GREEN. `npm run lint` clean · `--project joust --project shared` 3289/3289 · orchestrator
390/0 · demo-jt9-14 11/11. The 6 RED tests now pass; the 8 sibling re-seats stay green; no collateral.

**Minimalism:** the diff is the narrowPhase gate and its comment — nothing else. narrowPhase,
collisionMaskFor and MASKS already existed; no new helper, no refactor.

**Handoff:** To Reviewer (The Argument Professional).
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (1 enabled returned clean; 8 disabled via settings)
**Total findings:** 0 confirmed, 0 dismissed, 0 deferred

Because 8 of 9 specialists are disabled, the real coverage came from a **mutation battery** run by the Reviewer against the fix (below), not from the specialist swarm.

## Reviewer Assessment

**Verdict:** APPROVED

**What was reviewed:** the narrowPhase gate in `collisionPass`'s player-vs-ptero pass (demo.ts ~:1493), the two new test files, the 8 sibling re-seats across 4 files, and the README count bump.

**Mutation battery (the Reviewer's instrument, since the specialists are off) — 4/4 caught:**
| Mutant | Result |
|---|---|
| swap player/ptero `top` args (narrowPhase's `j=a.top+i−b.top` is asymmetric) | 3 tests red — caught |
| ptero mask := player's mask (CWNG3R for both) | 3 tests red — caught |
| invert the gate (`if (narrowPhase(...)) continue`) | 8 tests red — caught |
| delete broadPhase from the pass (mask alone) | AC-5 (64px-in-X) red — caught |
Baseline restored to 11/11 after each; `git diff demo.ts` clean afterward.

**Correctness (verified independently):**
- The fix mirrors the joust (:1385) and egg (:1552) two-step exactly. Argument order and both `top` values are correct (mutants above prove the tests are sensitive to each).
- The ROM comment's claims were checked against the vendored source: `:4944 OSTXYP JSR BPCOL`, `:4945 BCS OSTHIT`, and COLDX subtracted at `:7047/:7051`. Every claim is accurate — so the "wiring narrowPhase in is faithful" rationale holds, and the census confirms exactly 3 narrowPhase call sites in demo.ts.
- The `collision === null || pteroMask === null` guard is unreachable at runtime (a live player/ptero always has a mask) but load-bearing for `tsc` (TS2322) — correct, and matches the egg pass.

**Research obligation:** properly discharged. The port DIRECTION is confirmed (BPCOL gates the dispatch), and the residual COLDX X-blindness — pre-existing across all three passes since jt2-3, NOT introduced by this story — is filed as **jt9-43** with a full description. Scoping it out of a 3-pt story is the right call; fixing it would re-architect narrowPhase and re-baseline the joust + egg passes too.

**Deviations:** the 8 re-seats (offset 10→9; audio-emission 14→5) are legitimate test maintenance TEA owns per the sidecar. Each preserves its test's actual intent (pair-loop-leak / dissolve / NBAIT settle / cue emission / out-of-band control), is verified green on BOTH the pre- and post-fix tree, and carries a 6-field deviation entry. The audio-emission 14→5 specifically restores non-vacuity (offset 14 would pass its `not.toContain` vacuously post-fix).

**TEA's watch-for (audio-events seeded pins):** did NOT materialize — the full suite is green including audio-events.test.ts, so the ptero fix (unlike jt8-7's egg fix) did not shift the seeded demo timeline. No re-baseline needed.

**No Critical, High, Medium, or Low findings.** Minimal diff, faithful to the ROM, strongly tested.

**Handoff:** To SM (The Announcer) for finish.
## Impact Summary

_Compiled at finish from the Delivery Findings (single review round, APPROVED). All three findings are non-blocking._

**Research obligation — SETTLED, port confirmed (non-blocking).** The ROM runs BPCOL as a PRECONDITION to the player-vs-ptero dispatch (`OSTXYP JSR BPCOL` / `BCS OSTHIT`, JOUSTRV4.SRC:4944-4945), so the box-only third pass was the infidelity and consulting narrowPhase is faithful. The residual divergence — the ROM's BPCOL folds a screen-X COLDX term (:7047/:7051) that the port's narrowPhase drops for ALL THREE passes since jt2-3 — is **filed as jt9-43** (3pt, backlog), NOT introduced by this story. All jt9-14 fixtures are staged at dx=0 (COLDX=0), invariant under jt9-43.

**Test-contract ripple — 8 sibling re-seats, verified (non-blocking).** The collision-contract change turned 8 green player-vs-ptero kills RED (the natural lanceOffset-10 geometry sits one pixel outside the CWNG3R×PT1RC mask). Re-seated to lanceOffset 9 (audio-emission ×2, demo-jt3-7-menagerie ×3, demo-jt4-4 ×2 baiters, demo-jt5-16 ×1), each preserving its intent, verified green on both the pre- and post-fix tree. Real scope a 3-pt estimate did not price — grooming signal.

**Tight kill window (informational).** kill band [8,12] ∩ mask-hit = dy {−8,−9} only — a 2px window, faithful at dx=0. jt9-43's COLDX fix will widen it for dx≠0; re-baseline the 4 re-seated files then.
