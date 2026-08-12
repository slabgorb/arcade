---
story_id: "jt11-3"
jira_key: "jt11-3"
epic: "jt11"
workflow: "tdd"
---
# Story jt11-3: Ground arrests momentum (pure core, flight.ts only): velXIndex (the FLYX flight-velocity index, flight.ts:59) currently survives land->ground->takeoff untouched - land() flight.ts:416-431 reads it for FRCONV state selection but never writes it, stepGround flight.ts:327-370 moves via animation-phase posX deltas and never touches it, takeOff() flight.ts:378-387 restores it verbatim - so launch resumes the PREVIOUS flight airspeed. Fix consumes the dead ROM field: GROUND_STATES flyVel (interface flight.ts:84, rows flight.ts:118-131, JOUSTRV4.SRC:7163-7175; grep confirms flyVel written and read NOWHERE). takeOff() derives velXIndex from the current ground rung flyVel signed by facing (facing already threaded at frame.ts:262); land() resets velXIndex to the landed rung flyVel. Callers frame.ts:258/265 unchanged. Watch seeded-replay fixtures - this changes player trajectories.

## Story Details
- **ID:** jt11-3
- **Jira Key:** jt11-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt11-3-ground-arrests-momentum
- **PR:** https://github.com/slabgorb/arcade/pull/279

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-12T13:10:29Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-12T12:19:35Z | 2026-08-12T12:22:00Z | 2m 25s |
| red | 2026-08-12T12:22:00Z | 2026-08-12T12:35:50Z | 13m 50s |
| green | 2026-08-12T12:35:50Z | 2026-08-12T12:57:44Z | 21m 54s |
| review | 2026-08-12T12:57:44Z | 2026-08-12T13:07:20Z | 9m 36s |
| green | 2026-08-12T13:07:20Z | 2026-08-12T13:09:58Z | 2m 38s |
| review | 2026-08-12T13:09:58Z | 2026-08-12T13:10:29Z | 31s |
| finish | 2026-08-12T13:10:29Z | - | - |

<!-- Round-1 review REJECTED with rework target green (gate recovery_config); the
complete-phase router walked the reject into finish — repaired here per the
documented misroute recovery: phase set back to green for the fix round. -->

## Sm Assessment

Setup complete for jt11-3 (tdd, 3 pts, p1). Session file created, story claimed (`in_progress`, started 2026-08-12), branch `feat/jt11-3-ground-arrests-momentum` cut from develop, story context committed at `sprint/context/context-story-jt11-3.md`. Scope is the pure core only — `plugins/joust/src/core/flight.ts` (takeOff/land consuming the dead GROUND_STATES `flyVel` field); callers in frame.ts unchanged. Known risk flagged in the story: seeded-replay fixtures will shift because player trajectories change. Handing off to TEA for the RED phase.

## TEA Assessment

RED established for jt11-3. New file `plugins/joust/tests/ground-momentum.test.ts` — 11 tests: 7 failing (the defect), 4 passing (controls). Suite-wide verification (testing-runner, RUN_ID jt11-3-tea-red): 174 files, the ONLY failures are the 7 new pins; 3422 tests green elsewhere. Repo lint (tsc) green after updating the stale test contract (`FlightModule.stepGround` lacked jt2-9's `facing` param). README census bumped 173 → 174 in the same commit (audio-seam-scope guard green).

**What the tests pin** (all expected values derived from GROUND_STATES at run time, never transcribed — mutating a row's flyVel reddens them):
- AC-1: `land()` resets velXIndex to the landed FRCONV rung's flyVel, selection still made from the INCOMING index (order trap pinned), sign dropped (rung magnitude).
- AC-2: `stepGround()` maintains velXIndex = new state row's flyVel, negated for facing −1 (the ROM's UPDNO2/NEG PVELX, JOUSTRV4.SRC:5997-6008); no −0 leak; one ground frame kills a stale flight index; airborne no-op control; facing-less call pinned to the ladder invariant only (enemy scope — see Delivery Findings).
- AC-3: end-to-end in frame.ts's call order — land at −8, skid the derived 6-step chain to PLYBR (deceleration ladder pinned with toEqual), flap → launch at REST; a running/touch-and-go takeoff keeps the rung speed signed by facing; takeOff's other STFLY writes unchanged (control).

**Rule Coverage** (lang-review/typescript.md): no type-safety escapes in the new tests (no `as any` / double-casts; the one structural type is `Awaited<ReturnType<typeof loadFlight>>`); assertions all `.toBe(exact)`/`.toEqual(derived)` — restrictive direction, no vacuous asserts; loops bounded with reach-assertions (skid chain must arrive in ≤10 steps).

**For Dev:** the fix is flight.ts only; callers (frame.ts, enemy.ts) stay unchanged. flight.ts's "GENERATED — DO NOT HAND-EDIT" header has LAPSED (measured): jt2-9 added stepGround's facing param and jt5-3 added wingEdge by hand, and `tools/transcribe-flight.mjs` still emits the stale 2-arg stepGround — a regeneration today would wipe those stories AND this fix (it already bit once: jt1-6 regenerated over the jt1-5 timeUp hotfix). Hand-edit flight.ts; teaching the generator too is optional but keeps the trap from re-arming. Comment-line pins in other tests may shift if line numbers move — run the full joust project, not just the new file.

## Dev Assessment

GREEN complete. The fix is two writes in `plugins/joust/src/core/flight.ts`, exactly as the RED pins demand: `stepGround` maintains `velXIndex = next.flyVel` negated for `facing === -1` (`| 0` normalizes −0), and `land()` seeds `velXIndex` from the landed FRCONV rung after selection reads the incoming index. `takeOff()` untouched — it inherits verbatim, correctly now. No caller changed (frame.ts, enemy.ts verified untouched).

**Verification:** all 11 jt11-3 pins green; full joust project 174 files / 3429 tests green; full vitest (all apps) 14775 green; orchestrator suite 478/478; repo lint green.

**Re-baselines (the predicted fixture fallout — 18 failures in 6 files, all re-measured under audio-thud's AC7 protocol, never nudged):**
- Justified line, measured with a landing-instrumentation probe: every moved row traces to a pre-anchor landing (player#1 lands at frame 29 on all script seeds; dumb enemy#257 at 15); rows that never touch ground are bit-identical; at ≤200-frame anchors moved rows are HORIZONTAL-only (posX/velXIndex/velXFrac — posY/velY/timeUp bit-identical); `rng` unmoved everywhere (still 2_006_456_271 at 0xbeef/2400, ninth consecutive re-baseline).
- audio-thud: pre/post-contact digests re-pinned; first contacts re-swept and UNMOVED (0xbeef/0xface frame 119; 0x2468 none in 2000). Person-thud staging re-swept [0x1000,0x1120)×4000 by its own precondition → seed 0x1035 frame 723 (pair verified enemy-vs-player from positions, bounce directions recorded).
- audio-events: egg 0x1234 273→416; knight-2 death 2369→2054 (+ re-entry 2055, sibling coupling preserved); wave advance 4047→2866; 2400 fingerprint re-pinned.
- audio-transporter-split: re-entry table re-swept — 0xface knight-1 1210 / knight-2 2055 (disagreeing pair), 0xbeef knight-2 224.
- dumb-wingbeat: 0x2468@400 player row re-pinned; enemy-wing-down counts re-measured (169/256/155); player wing-up 154→153 on all three seeds, traced to the frame-1210 re-entry landing on a %13==1 release frame.
- glide-prologue: scripted promotions 14→9, floor 10→8 (house pattern: below measured).

**Fix round (post round-1 review), commit dc8efec6:** (1) ground-momentum header claim made TRUE — reworded to the wiring the file pins, and the FRCONV run-rung FLYVEL ladder [0,2,4,6,8] added as a hand-transcribed value pin (PLYFR.flyVel 8→6 mutation now reddens IN-FILE, verified); (2) stepGround JSDoc documents `facing` and the UPDNO2 velXIndex maintenance; (3) expectedNext carries its independent-pin pointer (demo-jt2-9) and the −0 assertion its toBe-is-the-guard rationale. Full joust suite 3430 green, lint green. One process note: the mutation run's trailing git-checkout wiped the uncommitted JSDoc fix once — caught by grep and re-applied; fixes committed before any further mutation.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer's own mutation battery (M1–M7) and edge analysis below |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no new error paths; the one new throw-adjacent site (GROUND_STATES[rung]) assessed below |
| 4 | reviewer-test-analyzer | Yes | findings | 3 (all low) | confirmed 1, dismissed 2 (rationales in assessment) |
| 5 | reviewer-comment-analyzer | Yes | findings | 1 (medium) | confirmed 1 |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — rule-checker's checks #1/#2/#7 ran the same rubric: clean |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — pure deterministic sim, no I/O surface in diff |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — 2-line core change reviewed directly: no dead code, no over-engineering |
| 9 | reviewer-rule-checker | Yes | findings | 1 violation / 28 rules | confirmed 1 |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 3 confirmed, 2 dismissed (with rationale), 0 deferred

## Reviewer Assessment

**Round 2 — Decision: APPROVED**

All three round-1 findings fixed in commit dc8efec6 and re-verified by the Reviewer directly:
1. [RULE] The false header claim is gone: ground-momentum.test.ts now states it pins the WIRING, and the new hand-transcribed FRCONV run-rung ladder pin ([0,2,4,6,8], JOUSTRV4.SRC:7164-7168) makes an in-file table mutation redden — re-ran the rule-checker's exact mutant (PLYFR.flyVel 8→6): 1 red, the transcription pin. Killed.
2. [DOC] stepGround's JSDoc now documents `facing` and the UPDNO2 velXIndex maintenance — verified in the diff.
3. [TEST] expectedNext carries the demo-jt2-9 independent-pin pointer; the −0 assertion documents that toBe is the operative guard.

Verification state at approval: joust project 174 files / 3430 tests green; repo lint green; orchestrator 478/478 (unchanged by the fix round); mutation record 8/8 killed (M1–M7 plus the round-2 flyVel-value mutant), all sites diff-confirmed. The TEA Delivery Finding on enemy facing remains routed to SM for filing at finish (see Required Routing in the round-1 record below). Specialist coverage, dismissal rationales and the full battery are recorded in the superseded round-1 assessment and the Subagent Results table above — both still accurate.

## Reviewer Assessment Round 1 (superseded by the approval above)

**Round 1 — Decision: REJECTED** (comment-level fixes only; no behavioral defect found)

**Verification performed (covers the disabled specialists' domains):**
- Own mutation battery, sequential, each site confirmed via git diff before trusting the result: M1 land()→0 (killed, 2 red), M2 negation dropped (killed, 4 red — first run was a phantom from a shared-tree race with the test-analyzer's revert runs; re-verified with confirmed site), M3 current-vs-next row (killed, 3), M4 takeOff zeroes (killed, 2), M5 land always PLYBR (killed, 4), M6 −0 leak (killed, 2), M7 sign by dir not facing (killed, 5). 7/7 killed.
- Test-analyzer independently: 2 mutants killed; reverting flight.ts to pre-jt11-3 reddens exactly the 17 re-baselined assertions — re-baselines track behavior, not anchors.
- Rule-checker: 28 rules × 61 instances; purity suites 90/90; comment-line-refs clean; retired "173 files" figure has zero survivors.
- Comment-analyzer: ROM citations verified verbatim against JOUSTRV4.SRC (:5997-6008, :6123-6135, STATE macro 7th operand); the cross-file death/re-entry number web (1209/1210, 2054/2055) internally consistent.
- [EDGE] (own) Odd velXIndex would now reach `GROUND_STATES[undefined].flyVel` (TypeError) in land() — DISMISSED: unreachable per the pinned even/in-range invariant, and the jt1-5 Reviewer precedent (recorded in ground-locomotion.test.ts) explicitly rejects pinning odd-index behavior.
- [EDGE] (own) Facing-less enemy path now takes +flyVel on takeoff regardless of travel direction — a known, TEA-filed Delivery Finding; MUST end with a filed follow-up story id at finish (see Required Routing below).

**Confirmed findings (fix before approval):**
1. [RULE] ground-momentum.test.ts header (~line 40): "mutating a row's flyVel reddens these tests" is FALSE, measured — PLYFR.flyVel 8→6 and PLYER.flyVel 6→2 both leave the file 11/11 green (expected values derive from the same table production reads; expected and actual move together). The file pins the WIRING (proven — M1/M5 killed); the table VALUES are pinned by the sibling fixture files (15 reds under the same mutation, measured). Fix: reword the claim to what the file actually protects, and add one independently-derived (non-table-sourced) value pin so an in-file table mutation reddens.
2. [DOC] flight.ts stepGround JSDoc (function-level, ~line 316): silent on the `facing` parameter (pre-existing gap) and on this story's velXIndex maintenance — a caller reading only the contract comment cannot learn stepGround now determines launch airspeed. Fix: extend the JSDoc.
3. [TEST] ground-momentum.test.ts expectedNext(): re-derives stepGround's dir/facing dispatch, so this sweep alone cannot catch a wrong dispatch. Mitigated (demo-jt2-9.test.ts pins it by concrete outcomes) but undocumented. Fix: one-line comment naming the independent pin.

**Dismissed (with rationale):**
- [TEST] "−0 Object.is assertion is redundant after toBe" — kept deliberately: toBe IS the operative guard; the explicit Object.is line is the documentation of the trap. Will fold this rationale into the comment as part of finding 3's edit pass so the intent is explicit.
- [TEST] "`.toBe(0)` literal should derive from GROUND_STATES.PLYBR.flyVel" — REJECTED as counterproductive: the rule-checker's finding 1 shows derived-from-the-same-table expectations are the WEAK form; the hardcoded 0 is the file's one independent value pin and must stay literal.

**Required routing at finish:** the TEA Delivery Finding on enemy facing (2-arg stepGround) must be filed as a follow-up story by SM — "out of scope" must end with a story id.

**Rule Compliance:** typescript.md checks #1–#26 clean except #17 (finding 1 above); CLAUDE.md core purity clean (90/90, no banned tokens in new comments); hand-edit convention match clean.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **[Improvement, non-blocking] (TEA)** Story premise refined by measurement: the ROM does NOT put the velXIndex write in takeoff. STFLY (JOUSTRV4.SRC:6123-6135) never touches PVELX; the ground loop maintains it — UPDNO2 runs LDA 6,X / STA PVELX,U ("UPDATE FICTISIOUS VELX FOR BUMPING", :5997-6001) then NEG PVELX,U when facing left (:6005-6008). "takeOff() derives" in the title is the NET effect at launch. This is also the only factoring satisfying the story's own constraints (flight.ts only, frame.ts callers unchanged), since facing reaches flight.ts through stepGround alone. The RED tests pin the ROM mechanism: stepGround maintains, land seeds the reset, takeOff inherits verbatim.
- **[Gap, non-blocking] (TEA)** enemy.ts's stepEntity calls the SAME land/stepGround/takeOff, facing-less (2-arg stepGround). The fix therefore changes enemy ground/takeoff trajectories too — the story names only the frame.ts callers. The facing-less sign convention is deliberately NOT pinned (only the even/in-range ladder invariant is); if enemies should sign flyVel by their own facing, that is an enemy.ts threading follow-up for the SM to file. **Filed: jt11-11** (2 pts, p2, epic jt11).
- **[Question, non-blocking] (TEA)** Seeded-replay fixtures: flight.test.ts AC-3 compares run-vs-run (no stored golden), so it survives. Any demo/replay fixture that serializes velXIndex through a landing may shift — Dev must run the FULL joust suite and re-baseline by instrumenting the mechanism, not by re-anchoring frames.
- **[Question, non-blocking] (Dev)** All three census seeds (0xbeef/0x2468/0xface) now show a knight death at exactly frame 1209 — a seed-independent death frame suggests a script-determined kill (the knight's trajectory is input-scripted and identical across seeds until enemies interact). Benign for this story (measured and pinned), but if a future story changes the input script or death timing, expect the 153 wing-up count to move in lockstep on all seeds.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->