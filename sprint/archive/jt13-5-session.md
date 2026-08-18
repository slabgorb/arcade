---
story_id: "jt13-5"
jira_key: "jt13-5"
epic: "jt13"
workflow: "tdd"
---
# Story jt13-5: Landing in lava must have consequences (death), not free swimming

## Story Details
- **ID:** jt13-5
- **Jira Key:** jt13-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/jt13-5-lava-landing-death
- **PR:** 525

## Workflow Tracking
**Repos:** arcade
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T00:11:42Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T23:17:13Z | 2026-08-17T23:19:49Z | 2m 36s |
| red | 2026-08-17T23:19:49Z | 2026-08-17T23:32:25Z | 12m 36s |
| green | 2026-08-17T23:32:25Z | 2026-08-17T23:36:36Z | 4m 11s |
| review | 2026-08-17T23:36:36Z | 2026-08-17T23:48:52Z | 12m 16s |
| green | 2026-08-17T23:48:52Z | 2026-08-17T23:59:26Z | 10m 34s |
| review | 2026-08-17T23:59:26Z | 2026-08-18T00:11:42Z | 12m 16s |
| finish | 2026-08-18T00:11:42Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

- **Conflict (jt11-18), non-blocking — the sink-to-FLOOR+20 refinement will break a shipped test.** `tests/burned-shore-grab-jt11-18.test.ts` asserts `maxY <= DEATH_Y` (FLOOR+7 = 230) at three sites (player free-fall AC-A2, egg AC-A3). jt11-18 deliberately made the lava plane an on-screen *clamp* — the very behaviour jt13-5 replaces. AC4 (body sinks to FLOOR+20 = 243) contradicts those assertions if the sink is implemented at the frame.ts layer. RED here does NOT bake FLOOR+20 in, to avoid prejudging the layer. **Dev/Architect must decide:** (a) sink at the game/sim layer (leave the frame.ts clamp as jt11-18's backstop, remove-after-N at the session layer) → jt11-18 stays green, or (b) sink at frame.ts → update jt11-18's three `maxY<=DEATH_Y` assertions to the new sink-and-die. Either is legitimate — "reconcile with the existing lava-troll grab" is in the story.
- **Scope/Question (AC1 audio), non-blocking — the lava SOUND needs a new event kind.** `EVENT_KINDS` (events.ts) has no SNPLAV/SNELAV; its own comment records that lava-troll audio (SNTROL) was *deliberately* omitted for lack of an emitter. A distinct lava cue ripples the audio manifest + dispatch sweeps + audio-dispatch shell. RED covers only the PVELX-clear half of AC1. **Recommend:** reuse the existing `player-death`/SNPDIE cue on lava death (sim.ts already emits it on unhorse), or file a follow-up for a faithful distinct SNPLAV/SNELAV cue.
- **Question (AC2 window / AC4 depth), non-blocking.** The break-free window length (CMPD #-, JOUSTRV4.SRC:6614) and the WCLENY<7 death-trigger depth (JOUSTRV4.SRC:6555) are implementation-specific; re-derive in GREEN. Left as a finding rather than a fragile RED that pins an unbuilt frame count.
- **Note — line cite.** The description's "isLavaDeath (frame.ts:292)" is stale; the real branch is frame.ts line 307 (SM correction). arena.ts `isLavaDeath` is at line 274.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **Layer decision (resolves TEA's jt11-18 Conflict): sink/removal at the SIM layer, clamp kept at frame.ts.** GREEN keeps frame.ts's FLOOR+7 clamp as jt11-18's on-screen backstop (raw scheduler + enemy/egg paths untouched) and adds the player death at the sim layer (sim.ts, right after the troll step): a non-gripped player at lava depth is filtered out of the process list, so `stepGame` books the mount death off the removal. This is TEA's option (a) — jt11-18's three `maxY<=DEATH_Y` assertions stay GREEN (verified: full joust suite 3746/3746). frame.ts also clears `velXIndex`/`velXFrac` in the lava arm (AC1), which jt11-18 never asserted, so it is safe.
- **AC2 break-free — preserved but its window is NOT closed.** Because frame.ts's `flap` runs before the lava check and the sim-layer removal tests the post-step posY, a hard enough flap that clears lava depth still escapes; a bird that stays at lava depth drowns. This satisfies "a hard flap escapes, otherwise lava pulls you down" but does NOT implement the ROM's *limited* window (CMPD #-, JOUSTRV4.SRC:6614) after which escape is impossible — deferred (TEA non-blocking finding).
- **Deferred to follow-up (per TEA's non-blocking findings), NOT implemented:** the multi-frame sink to FLOOR+20 (AC4 — removal is same-frame-on-contact, not a visible sink), and the distinct lava SOUND SNPLAV/SNELAV (AC1 audio — no cue emitted; would need a new `EVENT_KIND`). The story TITLE contract (no free swimming, a real life lost) is met; these are the fidelity tail.

## Sm Assessment

**Setup complete — routing to TEA for RED.** Baldur the Bright.

**Story:** jt13-5 (3pt, p1, type: bug, joust, epic jt13, tdd). "Landing in lava must have consequences (death), not free swimming."

**Premise measured before setup (SOUND).** Verified against the current tree: `isLavaDeath` (plugins/joust/src/core/arena.ts:274) is applied in the airborne branch of frame.ts and only CLAMPS the bird via `posY: DEATH_Y << 8, velY: 0` — it never clears horizontal velocity (so the sideways swim survives), never removes a life, never fires a death routine. jt11-18 is correctly named as the repurposer (its comment sits at that branch). The bug is real and as described.

**One stale line cite corrected.** The description says "isLavaDeath (frame.ts:292)"; the actual branch is at frame.ts:307 (jt11-18 clamp comment ~308-316). A `> ⚠` note recording this is in the context Background (line 27) so TEA/Dev don't chase line 292. The rest of the description's mechanism is accurate and left intact.

**ACs derived, not copied.** Epic YAML had `acceptance_criteria: null`; sm-setup derived five ACs from the ROM ADGFLR sink-and-die sequence (clear PVELX + lava sound → break-free flap window → death at WCLENY<7 with life lost → sink to FLOOR+20 + respawn), keeping the lava-troll grab as a SEPARATE death path. No user ruling was needed — the fidelity target is unambiguous.

**Orientation for TEA (not scope creep):** sibling call sites are enemy.ts:1356 (enemy lava death), sim.ts:1601 (egg lava death), troll.ts:187 (the separate troll-grab path). The ROM cross-refs ADGFLR :6508-6640 in the description are the ground truth.

**Board hygiene:** sibling probes clean at setup (no jt13-5 branch, no jt13-5 session anywhere; a-3 is on df4-6). Story stamped `in_progress`. Claim committed (a11f99a3) and branch `feat/jt13-5-lava-landing-death` pushed. Session carries Repos/Workflow fields (sm-setup omitted **Repos:**, re-added by hand).
## Tea Assessment

**RED complete — routing to Dev for GREEN.** Tyr One-Handed.

**The bug, confirmed at the seam.** jt11-18 turned the FLOOR+7 lava plane into an on-screen *backstop*: the airborne branch of `stepPlayerEntity` (frame.ts, isLavaDeath arm ~line 307) clamps a fallen bird at DEATH_Y with velY=0 and keeps the process. It never clears horizontal velocity and never removes the bird — and `stepGame` books a mount death ONLY when a player process disappears from the sim (game.ts, the priorLive/survivingIds diff). So the knight swims forever, no life lost. That is the whole bug.

**Two behavioural REDs (committed 25870e76), both fail for the right reason:**
- **AC1 — no sideways swim.** A knight held at lava depth over a burned column while *pushing the stick* keeps `velXIndex = 4` today (expected 0). ROM CLR PVELX (JOUSTRV4.SRC:6610) is unconditional; the break-free escape is a hard FLAP, not a steer. Non-vacuity: asserts it started at 4 and really reached lava depth.
- **AC3 — a life is lost.** A lone knight falling into lava at **wave 1** (bridge burned by hand; `trollSpawnable` gates the troll to wave ≥ 4, so no troll can confound) keeps `lives = 5` today (expected < NSHIP). Non-vacuity: asserts zero trolls existed and the knight descended past FLOOR.

Full joust suite: **2 failed (both mine) / 3746**; `npm run lint` clean. `comment-line-refs`, `audio-seam-scope` and jt11-18's own clamp test all stayed green (comments use the detached `frame.ts line 307` form; frame.ts untouched).

**What RED deliberately does NOT pin — see Delivery Findings (all non-blocking):** the sink-to-FLOOR+20 depth (AC4) *conflicts* with jt11-18's shipped `maxY<=DEATH_Y` assertions and needs a layer decision; the lava SOUND (AC1's SNPLAV/SNELAV) needs a new event kind (audio-seam surface); the break-free window (AC2) and WCLENY<7 trigger need ROM re-derivation. These are GREEN-phase design calls, mapped for Dev in the findings above. Passing my two REDs = the story title is satisfied (no free swimming, real death); the findings are the fidelity tail.

### Rule Coverage
- **Purity (src/core).** No new src/core code in RED; both tests exercise the existing pure cores (scheduler `stepFrame`, `stepGame`) through the contract helpers. Dev's GREEN must keep the lava-death logic clock-/entropy-free (the joust `purity`/`sim-clock-free` scanner sweeps src/core).
- **Meaningful assertions.** Every `it` has ≥1 discriminating assert plus a non-vacuity guard (start-state and reached-lava-depth checks); no `let _ =`, no always-true assertions. Both fail RED with the exact intended-behaviour gap.
- **ROM-fidelity / citations.** Behaviour derived from ADGFLR (JOUSTRV4.SRC:6508-6640); no new committed claim JSON in RED (Dev owns any claim added with the death routine). Comments avoid the banned `name.ts:line` shape (`comment-line-refs` guard).
- **Isolation over confounders.** AC3 isolates the swim-death from the troll-grab path by construction (wave 1, asserted zero trolls) rather than relying on ordering luck.
## Dev Assessment

**GREEN complete — routing to Reviewer.** Loki Silvertongue.

**Two edits, 21 lines:**
- `plugins/joust/src/core/frame.ts` — the airborne lava arm now clears `velXIndex`/`velXFrac` alongside the existing `posY`/`velY` clamp (ADGFLR `CLR PVELX`, JOUSTRV4.SRC:6610). AC1 GREEN.
- `plugins/joust/src/core/sim.ts` — after the troll step, `stepSim` filters out any non-gripped player at lava depth (`isLavaDeath(posY)`). `stepGame` books the mount death off that removal → a life is lost. AC3 GREEN. Troll-grip victims exempt (their own death path); enemies/eggs keep jt11-18's clamp.

**Layer choice = TEA's option (a):** death at the sim layer, frame.ts clamp preserved as jt11-18's backstop → jt11-18's three `maxY<=DEATH_Y` assertions stay green. See Design Deviations for what that keeps and what it defers (AC4 visible sink, AC2 window-closing, AC1 distinct sound — all TEA non-blocking findings).

**Evidence:** jt13-5 tests 2/2 pass; **full joust suite 3746/3746**; `npm run lint` (tsc --noEmit) clean. Core stayed pure (no clock/entropy added — the joust purity scanner is in that 3746). No new ROM claim JSON added.

**For the Reviewer:** the deferred fidelity tail (sink depth, break-free window length, lava sound) is documented and non-blocking per TEA. If you want any of it in-scope, it's a follow-up story, not a rework of this diff.
## Subagent Results — Round 1 (superseded)

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (GREEN 3748/3748, lint clean, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — self-reviewed (no false-positive death: lowest band top 228 < DEATH_Y 230; no respawn loop: max pad Y 210 < 230) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — self-reviewed (removal explicit + observable; no swallowed error) |
| 4 | reviewer-test-analyzer | Yes | findings | 5 | confirmed 5, dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 | confirmed 4 (one ROM-citation defect across 4 sites), dismissed 0 — verified against JOUSTRV4.SRC myself |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — self-reviewed (proper narrowing, no casts, immutable) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — self-reviewed (N/A: pure in-process game sim, no I/O/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-reviewed (1-line filter + 2 fields; minimal) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 34 checks | N/A — but check #33 (ROM fidelity) CHALLENGED: it verified only line-in-range, not mechanism attribution; superseded by the [DOC] finding below |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled and self-reviewed)
**Total findings:** 2 confirmed blocking-class (1 High ROM-citation, consolidated; 1 Medium tracking), 3 confirmed Medium/Low test-precision; 0 dismissed

## Design Deviations — Reviewer audit

### Reviewer (audit)
- **Dev's "Layer decision — sink/removal at the SIM layer, clamp kept at frame.ts"** → ✓ ACCEPTED: sound; keeps jt11-18's backstop green (verified 3746/3746) and books death via the existing stepGame removal diff. Correct, minimal choice.
- **Dev's "AC2 break-free preserved but window not closed"** → ✓ ACCEPTED as a deviation, with the caveat below: the behaviour (a hard flap that clears lava depth escapes) is fine, but see the [DOC] finding — this is NOT the ROM's ADDLAV break-free window (that path is troll-grip-only).
- **Dev's "Deferred: sink to FLOOR+20 / SNPLAV-SNELAV sound"** → ✗ FLAGGED: deferral is acceptable, but no follow-up story is filed and jt13-7 already carries a FALSE claim that these are "covered under jt13-5." Must be filed + jt13-7 corrected (Medium finding below).
- **UNDOCUMENTED deviation (Reviewer audit):** the `velXIndex/velXFrac` clear (AC1) is presented as a faithful port of ADGFLR's `CLR PVELX`, but the ROM does NOT clear PVELX on the non-gripped lava death — that instruction is ADDLAV (troll-grip) only. So the clear is an UNDOCUMENTED departure from ROM, not a port. Severity: High (fidelity rule). See [DOC] finding.

## Delivery Findings

### Reviewer (code review)
- **Conflict (blocking): ROM mis-citation in new src/core comments.** `CLR PVELX` (JOUSTRV4.SRC ~:6611) is inside ADDLAV ("ADD IN LAVA TROLLS GRAVITY"), the troll-grip path (PADGRA swapped by LT1GRP), which ends `JMP ADGFLR`. The general non-gripped lava death ADGFLR (:6523) does NOT clear PVELX (ADGCEI's fall-through even integrates it). Affects `plugins/joust/src/core/frame.ts`, `plugins/joust/src/core/sim.ts`, `plugins/joust/tests/lava-death-jt13-5.test.ts` (correct the attribution; decide velX-clear keep-as-deliberate-departure vs drop-as-redundant). *Found by Reviewer during code review.*
- **Gap (blocking): descoped work unfiled + stale cross-story claim.** jt13-7's description asserts SNPLAV/SNELAV "are covered under jt13-5's lava-death work" — false (jt13-5 deferred them). Affects `sprint/epic-jt13.yaml` (fix jt13-7's note; file a follow-up story/owner for the deferred break-free window + sink-to-FLOOR+20 + SNPLAV/SNELAV cue). *Found by Reviewer during code review.*
- **Improvement (non-blocking): AC test precision.** Affects `plugins/joust/tests/lava-death-jt13-5.test.ts` (AC1 needs a below-DEATH_Y control proving the velX-clear is scoped to the lava branch, guard anchored to DEATH_Y not FLOOR, and velXFrac asserted; AC3 should assert `toBe(NSHIP-1)` not `toBeLessThan(NSHIP)`). *Found by Reviewer during code review.*

## Reviewer Verdict — Round 1 (REJECTED, superseded by Round 2 below)

**Verdict:** REJECTED

Heimdall. The p1 gameplay bug IS fixed and verified — a knight in the lava now dies and loses a life instead of swimming freely (AC3), tests pass 3748/3748, lint clean, rule-checker 0/34, no regressions to jt11-18's backstop. But the diff bakes a FALSE ROM citation into src/core that also justifies a non-ROM line of code, and it leaves descoped work unfiled while a sibling story already carries a false reference to it. In a fidelity-first codebase these are not shippable as-is.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [DOC] | ROM mis-citation: comments attribute ADDLAV's troll-grip `CLR PVELX` (~:6611) to the general non-gripped ADGFLR lava death (:6523), which never clears PVELX. The `velXIndex/velXFrac` clear is thus a non-ROM addition justified by a false citation — a ROM-fidelity rule violation (CLAUDE.md), which may not be dismissed. | frame.ts lava arm; sim.ts (~:2412 comment); lava-death-jt13-5.test.ts (header + AC1 comment) | Correct the attribution: cite ADGFLR for the non-gripped death (SNPLAV/SNELAV, WCLENY<7→DDEAD, sink FLOOR+20); note CLR PVELX + break-free window are ADDLAV/troll-grip-only, funneling into ADGFLR via `JMP`. Then EITHER drop the velXIndex/velXFrac clear (redundant — the drowned player is removed the same frame) OR keep it explicitly labelled a deliberate non-ROM on-screen cosmetic. If dropped, re-scope the AC1 test. |
| [MEDIUM] [TEST] | Descoped AC1-sound/AC2/AC4 unfiled; jt13-7 falsely says they are "covered under jt13-5." | sprint/epic-jt13.yaml (jt13-7 description) | Fix jt13-7's note; file a follow-up story/owner for the deferred break-free-window + sink-to-FLOOR+20 + SNPLAV/SNELAV cue (descoped-must-be-filed). |
| [MEDIUM] [TEST] | AC1 does not prove the velX-clear is scoped to the lava branch (a mutant zeroing velX for all airborne players passes); guard uses FLOOR(223) not DEATH_Y(230); velXFrac unasserted. | lava-death-jt13-5.test.ts (AC1) | Add a below-DEATH_Y control (velX stays non-zero under held stick); anchor guard to DEATH_Y; assert velXFrac===0. |
| [MEDIUM] [TEST] | AC3 names itself "exactly one life" but asserts `toBeLessThan(NSHIP)` — a double-book passes. | lava-death-jt13-5.test.ts:224 | Assert `toBe(NSHIP-1)` (respawn lands on a safe pad Y≤210, so exactly one death is expected). |

**Subagent tags:** [DOC] confirmed (ROM mis-citation — the finding of record, verified against JOUSTRV4.SRC). [TEST] confirmed (5 precision/coverage items). [RULE] clean 0/34 (but #33 ROM-fidelity challenged — line-in-range ≠ mechanism-correct). [EDGE] disabled → self-reviewed clean (no false-positive standing death: lowest band top 228 < 230; no respawn drain loop: max pad Y 210 < 230; isLavaDeath gets always-integer posY). [SILENT] disabled → self-reviewed clean (removal explicit/observable). [TYPE] disabled → self-reviewed clean (narrowed, no casts, immutable). [SEC] disabled → N/A (pure sim). [SIMPLE] disabled → self-reviewed clean (minimal).

**Data flow traced:** player posY → frame.ts lava arm (clamp + velX clear) → sim.ts post-troll filter (non-gripped + lava depth → removed) → stepGame priorLive/survivingIds diff → bookDeath (life lost) → respawn queue. Correct and safe.

**Handoff:** Back to Dev for fixes (via TEA red rework — test changes are involved).
## Dev Assessment (round 2 — rework)

**Rework complete — routing back to Reviewer.** Loki Silvertongue.

Addressed all of Heimdall's round-1 findings:

- **[HIGH] ROM mis-citation — RESOLVED by DROPPING the non-ROM code.** The `CLR PVELX` is ADDLAV (troll-grip), not the general ADGFLR non-gripped death, so the velXIndex/velXFrac clear was a non-ROM addition. Rather than reframe it as a deliberate departure, I removed it: frame.ts is back to jt11-18's exact `posY: DEATH_Y<<8, velY: 0` clamp, with a corrected comment (the non-gripped death is ADGFLR :6523; CLR PVELX + break-free belong to ADDLAV/troll-grip and funnel into ADGFLR via JMP). sim.ts comment corrected the same way (removal code unchanged — it is the real fix). "No sideways swim" is now a CONSEQUENCE of the death (a removed knight can't swim), which is what the ROM actually does.
- **[MEDIUM] descoped-unfiled + stale jt13-7 — RESOLVED.** Filed **jt13-10** ("Lava death cinematic: ADDLAV break-free window, sink to FLOOR+20, and the SNPLAV/SNELAV cue") for the deferred fidelity tail. Fixed jt13-7's description: it now says SNPLAV/SNELAV were deferred from jt13-5 and filed as jt13-10 (was falsely "covered under jt13-5's lava-death work"). Epic YAML verified clean (no reflow/markers).
- **[MEDIUM] AC1 test precision — MOOT + re-scoped.** The frame-level AC1 (velX-clear) test was DELETED with the code it tested (per Reviewer's "if dropped, re-scope"). The below-DEATH_Y-control and velXFrac findings applied only to that deleted test. The file now has two faithful sim-level tests: **A** (a non-gripped knight reaching lava is REMOVED, not left swimming) and **B** (that removal costs a life).
- **[MEDIUM] AC3 `toBe(NSHIP-1)` — APPLIED.** Test B now asserts exactly one life lost.
- **[MEDIUM] guard FLOOR→DEATH_Y — DELIBERATELY NOT APPLIED, with reason.** The knight is REMOVED the frame it reaches DEATH_Y, so its deepest OBSERVABLE pixel is DEATH_Y-1; a `>= DEATH_Y` non-vacuity guard would be unsatisfiable under same-frame removal. Kept `>= FLOOR` and added a comment explaining exactly this (the test-analyzer marked it low-confidence and noted the lives assertion covers the failure mode).

**Evidence:** jt13-5 tests 2/2 pass; full joust suite **3746/3746**; `npm run lint` clean; orchestrator **505/0** (epic YAML touched). No `name.ts:NNN` in any new comment (comment-line-refs green).
## Subagent Results

Review Round 2 (rework verification). Same toggles as round 1 (4 enabled, 5 disabled).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (GREEN: joust 3746/3746, orchestrator 505/0, lint clean, no smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled — self-reviewed round 1 (no false-positive death, no respawn loop) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled — self-reviewed (removal explicit/observable) |
| 4 | reviewer-test-analyzer | Yes | findings | 2 | confirmed 2 (both non-blocking); tests re-verified non-vacuous by reverse-apply + mutation |
| 5 | reviewer-comment-analyzer | Yes | findings | 4 (LOW) | Round-1 [HIGH] RESOLVED (verified vs ROM); 4 tilde off-by-one residuals accepted non-blocking |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled — self-reviewed (narrowed, no casts, immutable) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled — N/A (pure sim) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled — self-reviewed (minimal; a redundant clause noted below) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations / 34 checks | N/A — independently re-verified ROM citations vs source + re-measured 3746/3746 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled)
**Total findings:** 0 blocking (round-1 HIGH resolved & re-verified); 6 non-blocking (accepted/routed)

## Design Deviations — Reviewer audit (Round 2)

### Reviewer (audit, round 2)
- **Round-1 [HIGH] ROM mis-citation** → ✓ RESOLVED: Dev dropped the non-ROM velX-clear (frame.ts back to jt11-18's clamp) and corrected the ADGFLR-vs-ADDLAV attribution. Independently re-verified against JOUSTRV4.SRC by both comment-analyzer and rule-checker.
- **Dev's "drop velX-clear + delete AC1"** → ✓ ACCEPTED: the deleted frame-level test tracked the retired code; no orphaned behaviour (swept for stray PVELX/AC1 refs — none). "No sideways swim" is now correctly a consequence of the death (removal).
- **Dev's "guard kept at FLOOR not DEATH_Y, with reason"** → ✓ ACCEPTED: the same-frame-removal reasoning is correct (test-analyzer traced deepest observable pixel = 229 = DEATH_Y-1). Tightening to DEATH_Y-1 is a LOW optional; FLOOR is sound (test A pins DEATH_Y exactly).

## Delivery Findings

### Reviewer (code review, round 2)
- **Improvement (non-blocking): tilde ROM line-refs off by one.** `~:6611`→:6610 (CLR PVELX), `~:6609`→:6608 (ADDLAV start), `~:6643`→:6642 (JMP ADGFLR). Under approximate `~` markers, correct routine attribution; both citation subagents said not worth a round. Affects `plugins/joust/src/core/frame.ts`, `plugins/joust/src/core/sim.ts`, `plugins/joust/tests/lava-death-jt13-5.test.ts` — **jt13-10** touches this region and can tidy them. *Found by Reviewer during code review.*
- **Improvement (non-blocking): the `grippedBy === undefined` filter clause is a mutation-survivor.** It is a proven no-op today (stepTrolls removes a gripped victim at lava depth first, same frame, same threshold), so it guards a future ordering invariant only in prose; a faithful test would require an artificial gripped-at-lava-depth state. Kept as documented defensive code. Affects `plugins/joust/src/core/sim.ts`. *Found by Reviewer during code review.*
- **Improvement (non-blocking): test B non-vacuity guard could tighten FLOOR(223)→DEATH_Y-1(229).** Affects `plugins/joust/tests/lava-death-jt13-5.test.ts`. *Found by Reviewer during code review.*

## Reviewer Assessment

**Verdict:** APPROVED
**Data flow traced:** player posY → frame.ts lava clamp (jt11-18 backstop, no velX touch) → sim.ts post-troll filter (non-gripped + isLavaDeath → removed) → stepGame priorLive/survivingIds diff → bookDeath (life lost) → respawn on a safe pad (max pad Y 210 < DEATH_Y 230, no re-drown). Correct and safe.
**Pattern observed:** the death is booked off process REMOVAL at the sim layer (game.ts's existing mount-death diff), leaving frame.ts's clamp as jt11-18's backstop — a clean layer split that keeps the enemy/egg/raw-scheduler paths and jt11-18's own tests green (3746/3746).
**Error handling:** `isLavaDeath` throws on non-integer posY by design; the filter feeds it always-integer posY (established by frame.ts's per-frame update upstream) — re-verified by rule-checker. No swallowed errors.

Heimdall. Round 1's blocking [HIGH] ROM mis-citation is resolved and independently re-verified against JOUSTRV4.SRC by two specialists; the velX-clear it justified was dropped as non-ROM. The p1 bug is fixed — a knight in the lava now dies and loses a life instead of swimming freely — with two non-vacuous, mutation-killed sim-level tests, full joust suite 3746/3746, orchestrator 505/0, lint clean. The descoped fidelity tail is filed (jt13-10) and jt13-7's stale cross-reference corrected. Remaining findings are all non-blocking (tilde off-by-one line refs, a documented defensive clause, a 6px-loose guard) and routed above; none meets the Critical/High bar.

**Subagent tags:** [DOC] round-1 finding RESOLVED + re-verified (comment-analyzer); [TEST] 2 non-blocking (test-analyzer — tests non-vacuous by reverse-apply/mutation); [RULE] clean 0/34, ROM citations re-verified (rule-checker); [EDGE] disabled → self-reviewed clean (no false-positive death: lowest band top 228 < 230; no respawn loop: max pad Y 210 < 230); [SILENT] disabled → self-reviewed clean; [TYPE] disabled → self-reviewed clean (no casts, immutable, narrowed); [SEC] disabled → N/A (pure sim); [SIMPLE] disabled → self-reviewed (minimal; the redundant defensive clause noted non-blocking).

**Merge safety note for SM:** develop is 6 commits ahead (all defender df4-6 + sprint bookkeeping) — NO overlap with joust/shared/host/build or the sprint files this story touched (epic-jt13.yaml/context vs their current-sprint/df4-df5). Collision risk nil; still, trial-merge before merge per finish discipline.

**Handoff:** To SM for finish-story.