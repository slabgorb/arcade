---
story_id: "ml12-3"
jira_key: "ml12-3"
epic: "ml12"
workflow: "tdd"
---
# Story ml12-3: DDT has no effect killing millipede segments — deploying DDT does not damage/kill the train (gameplay, NOT the already-shipped ml9-3/ml11 DDT visual)

## Story Details
- **ID:** ml12-3
- **Jira Key:** ml12-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/ml12-3-ddt-kills-segments
- **PR:** #511 (https://github.com/slabgorb/arcade/pull/511) — code → develop, awaiting owner merge
- **Base:** develop (gitflow)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-17T19:54:35Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-17T12:35:08Z | 2026-08-17T12:36:35Z | 1m 27s |
| red | 2026-08-17T12:36:35Z | 2026-08-17T14:43:37Z | 2h 7m |
| green | 2026-08-17T14:43:37Z | 2026-08-17T16:17:07Z | 1h 33m |
| review | 2026-08-17T16:17:07Z | 2026-08-17T19:08:01Z | 2h 50m |
| red | 2026-08-17T19:08:01Z | 2026-08-17T19:11:22Z | 3m 21s |
| green | 2026-08-17T19:11:22Z | 2026-08-17T19:25:29Z | 14m 7s |
| review | 2026-08-17T19:25:29Z | 2026-08-17T19:54:35Z | 29m 6s |
| finish | 2026-08-17T19:54:35Z | - | - |

## Acceptance Criteria

1. A triggered DDT kills the millipede segments within its blast region per the ROM: pinned by a core test that places segments inside a triggered DDT's radius and asserts they are removed/killed (and segments outside are not), with the DDT damage geometry/timing cited to the millipede ROM and gated by citations.test.ts.
2. The fix is DISTINCT from and does not regress the shipped DDT visual (ml9-3/ml11 glyph) nor the head-passes-through-cloud turn behaviour (obstacle.ts): the existing DDT/glyph and millipede-turn tests stay green while the new kill lands.
3. Verified LIVE at the /millipede/ visual playtest: deploying DDT visibly kills train segments in its blast, with no full-screen strobe/flash introduced (ml7-4 owner-epilepsy accessibility gate).

## Technical Approach

**Problem:** DDT explosion/cloud in millipede currently does not kill segments. The DDT visual (blue box + red glyph) was shipped in ml9-3/ml11, but the gameplay collision/damage is missing.

**Hypothesis (to verify):** The DDT explosion/cloud is deployed and renders but its damage region never intersects/marks millipede segments, or the sim never runs the DDT-vs-segment resolution.

**Likely seam:** 
- core/ddt.ts (explosion/cloud state + radius) 
- core/sim.ts (DDT resolution path)
- core/millipede.ts (segment-damage path; note obstacle.ts already lets a head pass THROUGH a DDT cloud with 'none' return, so the kill is separate from turn logic)

**Approach:**
1. Derive DDT's segment-kill behaviour and geometry from millipede ROM (MILLI.MAC / MLSUB.MAC)
2. Write tests that place segments inside a triggered DDT's radius and assert they are removed
3. Wire the segment-kill logic in core
4. Verify LIVE at /millipede/ that DDT kills train segments
5. Confirm no regression to existing DDT visual (ml9-3/ml11) or head-turn-through-cloud behaviour

## Delivery Findings

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

**Dev (GREEN, Julia):** Wired the kill in `sim.ts` as a step-8b pass right after `stepMillipede`, exactly per TEA's roadmap. For each live segment, `inDdtCloud(obstacleAt(state.field, obstacOffset(s.h, s.v, 0)))` → destroyed (filtered out, `score += SEGMENT_PTS`, `segment-killed` event) — the SAME representation as the existing shot kill (sim.ts:173-181), which does not drop a mushroom, so neither does this (consistent + minimal; the ROM's MUSHER-on-kill is an unmodelled gap shared by shot kills, not opened here). `obstacOffset` was already imported and already used dir-0 for the player obstacle check (sim.ts:140); only `inDdtCloud` was newly imported. No new constant, no core-purity impact. Full millipede suite **1460 green**, `tsc` clean. The DDT visual and the head-through-cloud turn are untouched.

Watch-items for Reviewer: (1) player-collision precedence — the port checks player collision at step 7 (pre-march) while the DDT kill is step 8b (post-march), so the ROM's "DDT kills before PLAY" ordering (:1613 before :1615) is only approximated; not gated by a test, pre-existing march-ordering deviation. (2) DDT-kill scoring is the flat provisional `SEGMENT_PTS`, not the ROM's body-10/head-100 tripled-on-DDT — same provisional scoring the shot kill uses (sim.ts:67 "refined when full scoring lands").

### Reviewer (code review)

- **Gap** (blocking): a DDT-cloud kill awards the flat `SEGMENT_PTS` (=10), but the ROM (`MILLI.MAC:2162-2175`) scores it **30 for a body / 300 for a head** — DDTEX1 (`:1947 LDA I,80`, DD-217) unconditionally passes the DDT-death flag into SHOOT2, so the `LDA I,10 → LDA I,30` premium (`:2164-2165`) and the head's `LSR×4` hundreds path (`:2171-2175`) ALWAYS apply to a DDT kill. `DDT_CLOUD_KILL_FLAG` (`plugins/millipede/src/core/ddt.ts:49`, whose own docstring names this caller-side seam) is unwired. Affects `plugins/millipede/src/core/sim.ts:281` (award body 30 / head 300 — `s.color === BODY_COLOR ? 30 : 300` — behind a cited constant + a citations.test.ts claim, not the flat `SEGMENT_PTS`). *Found by Reviewer (rule-checker #17/#32, verified against the ROM by Reviewer) during code review.*
- **Gap** (blocking): no test pins the DDT-kill **score** or the `'segment-killed'` **event** — mutation-proven, deleting both lines from the 8b block leaves all 10 tests green, so a regression that kills the segment but drops the score/audio cue ships silently. Affects `plugins/millipede/tests/ddt-segment-kill.test.ts` (add assertions that a DDT kill increments score by the ROM amount AND emits `segment-killed`). *Found by Reviewer (rule-checker #8, mutation-verified) during code review.*
- **Improvement** (non-blocking): `sim.ts:275` comment has a stray word ("Represented as a shot kill **is** (filter…)") and the "exactly as a shot kill does" framing over-reaches — the removal/mushroom half matches a shot kill but the SCORE does not (see above); reword when fixing. Affects `plugins/millipede/src/core/sim.ts:275`. *Found by Reviewer during code review.*

### Reviewer (code review, r2)

- **Gap** (non-blocking): the ROM leaves a mushroom (`MUSHER`, `MILLI.MAC:2157`) at every dead millipede segment's cell, but the port plants NONE — neither the shot-kill path (`sim.ts:177-185`) nor the new DDT-kill path (`sim.ts:282-295`). Killed trains therefore don't thicken the mushroom field, a real gameplay-fidelity divergence. Pre-existing (shot path predates ml12-3) and shared by both paths; out of scope here. Affects `plugins/millipede/src/core/sim.ts` (plant `FULL_MUSHROOM` at the dead cell on both kill paths). *Found by Reviewer (rule-checker #17) during code review.*
- **Gap** (non-blocking): the shot-kill of a segment scores a flat `SEGMENT_PTS`(=10) with NO head/body split, but the ROM scores a shot BODY 10 / shot HEAD 100 (`SHOOT2` 142$, `MILLI.MAC:2162-2171`). The r2 rework gave the DDT path its head/body split (30/300) but the shot path is still flat — now asymmetric. Pre-existing; out of scope. Affects `plugins/millipede/src/core/sim.ts:181` (award 100 for a head via the same `s.color >= BODY_COLOR` split). *Found by Reviewer during code review (raised by owner).*
- **Question** (non-blocking): AC3 requires a LIVE `/millipede/` playtest ("deploy DDT, watch the train die, no full-screen strobe") — this is unit-proven by the real-explosion test and strobe-safe by construction, but the live observation has not been performed (no verify phase ran). Recommend the owner run it before closing. Affects nothing in code. *Found by Reviewer during code review.*
- **Note:** the branch also carries an unrelated chore commit (`3b709849`, `sprint/epic-df4.yaml` df4-4 → in_review) that rode in to clear the merge gate — benign sprint bookkeeping, not ml12-3 code. *Found by Reviewer during code review.*

## Design Deviations

No deviations from spec.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Reviewer (audit)

- **DDT-kill scoring (UNDOCUMENTED deviation):** Spec/ROM says a DDT-cloud kill scores 30 (body) / 300 (head) — `MILLI.MAC:2162-2175`. Code does flat `SEGMENT_PTS` (=10). Not logged by TEA/Dev as a deviation (Dev's Delivery Finding framed it as "provisional like the shot kill", but the ROM's DDT premium is deterministic and the flag exists for it). Severity: **H** (this is the "per the ROM" core of the feature being shipped). → ✗ FLAGGED — fix in rework.
- **Player-collision precedence (Dev-noted):** ROM kills before PLAY (`:1613` before `:1615`); the port runs player-collision at step 7 (pre-march) and the DDT kill at step 8b (post-march). → ✓ ACCEPTED by Reviewer: pre-existing march-ordering deviation shared by all segment/player interactions, not introduced by this diff, untestable without a broader MOTION reorder; out of scope for ml12-3.

**Reviewer (audit, round 2):** the FLAGGED scoring deviation above is now **RESOLVED** — the r2 rework wires the ROM premium (body 30 / head 300, DD-223/224 byte-verified) at sim.ts:288, matching `MILLI.MAC:2162-2171`. No new deviations introduced by the rework. One test-header over-reach ("plants a mushroom, exactly like a shot kill") was corrected in-place (commit 4eca2103); the underlying MUSHER-plant omission is a pre-existing, out-of-scope gap filed as a Delivery Finding.

## Sm Assessment

Setup complete for ml12-3 (p1, 3pts, tdd). This is an owner-playtest gameplay bug: the DDT weapon renders (visual shipped in ml9-3/ml11) but never damages/kills millipede train segments. Scope is core collision/damage only — the DDT glyph visual and the head-passes-through-cloud turn behaviour (obstacle.ts) are explicitly out of scope and must stay green.

Seams flagged for TEA: `plugins/millipede/src/core/ddt.ts` (cloud state + radius), `core/sim.ts` (resolution path), `core/millipede.ts` (segment-damage). The DDT kill geometry/timing must be cited to the millipede ROM (MILLI.MAC / MLSUB.MAC) and gated by citations.test.ts — remember MLSUB.MAC is `.RADIX 16`, so verify thresholds as hex. AC3 requires a LIVE /millipede/ visual playtest with NO full-screen strobe (ml7-4 epilepsy accessibility gate).

Handing off to TEA for the RED phase. Merge gate was cleared by flipping df4-4 → in_review (its open PR #505 awaits the owner's merge).

## Tea Assessment

RED landed: `plugins/millipede/tests/ddt-segment-kill.test.ts` (10 tests, **5 RED / 5 passing guards**). Full millipede suite otherwise green (1455 passing) and `tsc` clean — no regression to the shipped DDT visual or the head-through-cloud turn.

**ROM ground truth (read, not guessed — MILLI.MAC).** The kill is NOT in the DDT subsystem; it is in MOTION, the per-segment march:
- `:1601-1608` moves the segment, THEN `:1611 LDY I,0` / `:1612 JSR OBSTAC` / `:1613 JSR DDTEXP` / `:1614 BCS 30$ (OBJECT DESTROYED)`. The `LDY I,0` (dir 0) means the kill reads the cell the segment **now occupies**, NOT the cell-ahead the TURN check reads (`:1527 JSR OBSTA0`, Y=±1). **This is why the shipped "head passes through a cloud" test (`obstac.test.ts:354-359`) stays green** — the two mechanics read different cells. Do NOT wire the kill through `obstac(field,s)` (that's the dir=±1 cell-ahead); use `obstacOffset(h, v, 0)` on the post-move position.
- `DDTEXP` (`:1942-1945`): kill band is exactly `[CLOUD=0x2E, DDT=0x6E)` (`inDdtCloud` already models this). A letter (<CLOUD) or a bomb/mushroom (≥DDT) in the occupied cell does NOT DDT-kill.
- Destroyed = removed from the live count + a mushroom left at the cell (`SHOOT2` 142$: `:2157 JSR MUSHER`, `:2159 DEC X,DEAD`) — same observable as a shot kill (`sim.ts` filters the segment + drops a mushroom, emits `segment-killed`). DDTEX1 also sets the explosion picture/colour + `CHAN2=$14` sound; matching the existing shot-kill representation (filter + mushroom + event) is the low-risk GREEN.

**Where to wire it (Dev's call):** the ROM does it inside MOTION; the port's `stepMillipede` is a pure segment stepper. Cleanest is a `sim.ts` step-8 pass (after `stepMillipede`) that, for each surviving segment, reads `field[obstacOffset(s.h, s.v, 0)]` and if `inDdtCloud` removes it + drops a mushroom (musher) + emits an event — ordered BEFORE the wave-clear check. Precedence: the ROM kills BEFORE PLAYER collision (`:1613` before `:1615`); a segment on a cloud that also touches the player should die, not kill the player (nice-to-have, not gated by a test here).

**Citations:** call-site claims **DD-219..222** added to `13-ddt.json` (byte-verified green by `citations.test.ts`). No new numeric constant is introduced — the wiring reuses `CLOUD_STAMP`/`DDT_STAMP` (already DD-3/DD-4).

**AC3 (live) is NOT unit-covered by design** — the real-explosion test proves an `ddtExplosionStep`-drawn cloud kills at the unit level, but the owner-facing "deploy DDT, watch the train die, no strobe" belongs to the verify-phase `/millipede/` playtest (ml7-4 epilepsy gate).

### Rule Coverage
- **Meaningful assertions / no vacuous tests** (ts lang-review test-quality): every `it` asserts a concrete length/value; the 5 passing guards are non-vacuous (control would flip if the kill over-fired; letter/bomb genuinely seed the occupied cell; ahead-guard asserts distinct cells; sanity asserts `inDdtCloud`).
- **No magic numbers**: stamps/thresholds come from exported cited constants (`CLOUD_STAMP`, `DDT_STAMP`, `DDT_EXPLOSION_START`, `DDT_ANCHOR_BACKSTEP`), not literals.
- **Core purity**: no test touches `src/core` source; the purity scanner is unaffected.
- **Citations gate**: new claims are byte-verified against the vendored 1982 source.

Handing off to Dev (Julia) for GREEN.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
_(Round 2 — re-review of the r2 rework that closed round 1's HIGH/MEDIUM/LOW.)_

| 1 | reviewer-preflight | Yes | clean | none (1463 pass, tsc clean, citations 239 incl DD-219..224 byte-green, no smells) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (OOB read fails closed; wave-clear reads post-kill roster; multi-kill per frame loops correctly) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — hand-covered (no swallowed errors; `some(isLive)` guard is a correct early-out) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered (r2 added body=30/head=300/event guards; round-1 #8 gap CLOSED) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — hand-covered; the round-1 sim.ts stray-word/over-reach is fixed. A NEW test-header over-reach (test:26-28 "plants a mushroom, exactly like a shot kill") was found → FIXED in-place during review at user's direction (commit 4eca2103) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — hand-covered (no `as any`/`!`; `Segment[]` local; new consts are cited `number`) |
| 7 | reviewer-security | Yes | clean | none (security-inert pure sim; OOB read fails closed; no non-determinism introduced) | N/A |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — hand-covered (the outer `some(isLive)` guard is a minor early-out, acceptable) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (rule #17: test-header claims sim.ts shot-kill plants a mushroom — it plants none) | confirmed 1, fixed-in-place 1, dismissed 0, deferred 0 |

**All received:** Yes (3 enabled returned — preflight clean, security clean, rule-checker 1 finding; 6 disabled via settings, hand-covered)
**Total findings:** 1 confirmed (rule-checker #17, ROM-verified by me), FIXED in-place during review; 0 dismissed, 0 deferred. Round-1's 3 blockers all verified CLOSED.

## Reviewer Assessment

**Verdict:** APPROVED _(round 2 — supersedes the round-1 REJECTED below-the-fold; all three round-1 blockers verified closed)_

The r2 rework closed every round-1 finding and the fix is ROM-faithful end-to-end. The DDT-cloud kill now scores the ROM premium (body 30 / head 300), pinned by new tests, and the byte-verified head/body split matches `MILLI.MAC:2162-2171` exactly (`s.color >= BODY_COLOR ? 30 : 300` — `>=` is stronger than round-1's suggested `===` and correct against `CMP I,3D / BCS 145$`). 1463 tests green, tsc clean, citations 239 (incl DD-219..224) byte-green, purity intact. The one round-2 finding (a misleading test-header comment) was corrected in-place during review at the user's direction (commit 4eca2103). Two pre-existing ROM-fidelity gaps and AC3's live playtest are recorded as non-blocking Delivery Findings.

**Round-1 blockers — all verified CLOSED:**
- [HIGH][RULE] scoring flat 10 → **fixed**: `DDT_KILL_BODY_PTS=30`/`DDT_KILL_HEAD_PTS=300` cited to `MILLI.MAC:2165`/`:2171` (DD-223/224, byte-verified), wired at sim.ts:288.
- [MEDIUM][TEST] score/event unpinned → **fixed**: new describe block asserts body=30, head=300, and the `segment-killed` event (score determinism: zeroed score, empty roster, no threshold crossing).
- [LOW][DOC] stray "is" / over-reach at sim.ts → **fixed**: comment reworded, "but the SCORE does NOT".

**Data flow traced:** deployed DDT → `ddtExplosionStep` draws cloud stamps into `state.field` (step 6) → `stepMillipede` marches segments (step 8) → step 8b reads each live segment's OCCUPIED cell `obstacleAt(field, obstacOffset(s.h,s.v,0))`, and `inDdtCloud` [0x2E,0x6E) → removes it + scores 30/300 + emits `segment-killed` → wave-clear (step 9) sees the post-kill roster. Verified end-to-end by the real-explosion test.

**Observations:**
- [VERIFIED] Head/body split is ROM-exact — evidence: sim.ts:288 `s.color >= BODY_COLOR(0x3d) ? 30 : 300`; byte-checked against `MILLI.MAC:2168 CMP I,3D / BCS 145$` (>=0x3D→body 30) and `:2171 LSR ;100 POINTS FOR A HEAD` (LSR×4 of 0x30 → 300). HEAD=0x39/POISON=0x1B both < 0x3D → 300. [RULE][TYPE] rule-checker cross-check confirmed.
- [VERIFIED] `>=` cannot misclassify — evidence: `isLive = color !== VACANT_COLOR`, and the only non-head/body colour (`SCORE_COLOR=0xFF`, millipede.ts:417) is set solely by `stepSegmentExplosion`, which has **no caller in sim.ts** (grep clean); every live segment in the running sim is 0x39/0x3D/0x1B, so `>=0x3D` selects exactly body. [EDGE] (hand-covered) — a future ml5 score-park wiring must revisit.
- [VERIFIED] OOB field read fails closed — evidence: sim.ts:285 → obstacleAt masks `field[addr] & 0x7f`; an OOB Uint8Array index yields `undefined & 0x7f === 0` → `inDdtCloud(0)` false. [SEC] corroborated (security clean); [SILENT] no swallowed error — the early-out is intentional.
- [VERIFIED] Post-kill roster read by every downstream consumer — evidence: `segments = survivors` (sim.ts:294) precedes `millipedeCleared` (:306) and the scroll/centin reads; a DDT clearing the last segment correctly wins the wave. [EDGE] multi-segment-per-frame loops correctly (each independently scored/removed).
- [VERIFIED] No new full-screen strobe (ml7-4) — evidence: a DDT kill arms the SAME band-recolour a shot kill arms (no new flash primitive); AC3 accessibility gate structurally intact. [TYPE] new consts are cited `number`, no stringly-typing. [SIMPLE] the outer `some(isLive)` guard is an acceptable micro early-out.
- [RULE][DOC] Test-header over-reach ("plants a mushroom, exactly like a shot kill") — **FIXED** in-place (commit 4eca2103): the port plants no mushroom on either kill path; comment now says so. Rule-checker #17 confirmed, ROM-verified by me.

**Rule Compliance (TypeScript lang-review, 33-rule sweep):** #1 type-safety (no `as any`/`!` — clean), #2/#5 modules & generics (clean), #4 null/undefined (OOB fails closed; `?? newDdtTable()` correct — clean), #8 test quality (round-1 gap CLOSED — score/head/body/event all pinned), #14 derived edges (single linear block, no bypass — clean), #15 token-not-claim (tests assert real `stepGame` output — clean), #17 mechanism-doc (test-header VIOLATION — FIXED in-place; all other comments byte-verified), #21 degenerate input (color is required — clean), A1 core purity (clean, purity 52/52), A2/A3 citations (DD-219..224 byte-verified). Full sweep in the rule-checker result above.

**Devil's Advocate:** Is this more broken than it looks now that scoring is fixed? Attack 1 — the score value: a DDT body kill scores 30, head 300; I byte-read `MILLI.MAC:2162-2171` directly rather than trust the claim, and the ROM's `LDA I,30` / `LSR×4` path produces exactly those, so the value is right, not just plausible. Attack 2 — determinism of the score test: could another source leak into `out.score`? Empty roster, no shot, score zeroed, and 30/300 cross no bonus threshold — the DDT kill is the sole source, so the exact-equality assertions are sound. Attack 3 — the `>=` boundary: could a live segment ever have colour >0x3D and be mis-scored as a body? Only `SCORE_COLOR=0xFF` exceeds it, and its only writer (`stepSegmentExplosion`) is unwired in sim.ts today — a genuine latent trap for the ml5 score-park wiring, noted, but not reachable now. Attack 4 — player-collision precedence: the port checks PLAY at step 7 (pre-march) while the kill is step 8b (post-march), inverting the ROM's kill-before-PLAY order; but step 7 uses the segment's OLD cell, so a segment newly arriving on a cloud+player cell is killed at 8b without having hurt the player — effectively ROM-equivalent, and pre-existing march ordering regardless. Attack 5 — the MUSHER gap: the ROM leaves a mushroom at every dead segment's cell; the port plants none on shot OR DDT kills, so killed trains don't thicken the mushroom field. Real fidelity gap, but pre-existing (shot path) and shared — a follow-up story, filed non-blocking. Net: the kill and its scoring are sound and observed; the residuals are pre-existing gaps and the live AC3 playtest, both booked as findings.

**AC status:** AC1 ✅ (kill + band + occupied-cell + real-explosion + score, all unit-verified). AC2 ✅ (obstac head-through-cloud and DDT visual green — no regression). AC3 ⏳ live /millipede/ playtest OUTSTANDING — unit-proven via the real-explosion test and strobe-safe by construction, but the owner-facing "deploy DDT, watch the train die, no flash" observation is not yet done; recorded as a non-blocking Delivery Finding for the owner/verify step.

**Data flow traced:** deployed DDT cloud (field stamp) → segment march → occupied-cell classify → remove + score + event → wave-clear (safe: post-kill roster read everywhere).
**Pattern observed:** ROM-faithful caller-side kill dispatch, mirroring the existing shot-kill representation, at plugins/millipede/src/core/sim.ts:282-295.
**Error handling:** OOB field read fails closed (undefined & 0x7f === 0 → no kill); no swallowed errors.
**Handoff:** To SM (Ruby Rhod) for finish-story.

---
_Round 1 (REJECTED — retained for history; all findings closed by the r2 rework):_

**Verdict:** REJECTED

The DDT-cloud KILL mechanic is correct and well-tested — ROM-grounded (occupied cell via `obstacOffset(...,0)`, `[CLOUD,DDT)` band), the head-through-cloud turn and the DDT visual are un-regressed, 1460 tests green, tsc clean, citations byte-verified. But the kill's **scoring** diverges from the ROM and is unpinned by any test. For a fidelity clone this is a fix-before-merge.

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [HIGH] [RULE] | DDT-cloud kill awards flat SEGMENT_PTS (10); the ROM scores body 30 / head 300 (DDTEX1's $80 flag, always set for DDT kills, MILLI.MAC:2162-2175). DDT_CLOUD_KILL_FLAG (ddt.ts:49) exists for this and is unwired. | plugins/millipede/src/core/sim.ts:281 | Award body 30 / head 300 (s.color === BODY_COLOR ? 30 : 300) behind a cited constant + a citations.test.ts claim, not the flat SEGMENT_PTS. |
| [MEDIUM] [TEST] | No test asserts the DDT kill's score or the segment-killed event — mutation-proven (deleting both lines leaves all 10 tests green). | plugins/millipede/tests/ddt-segment-kill.test.ts | Add assertions: a DDT kill increments score by the ROM amount AND emits segment-killed. |
| [LOW] [DOC] | Stray word "is" in the 8b comment; "exactly as a shot kill does" over-reaches (removal matches, score does not). | plugins/millipede/src/core/sim.ts:275 | Reword when fixing. |

**Handoff:** Back to TEA (testable findings — the score is a failing-test-shaped fix). TEA pins the ROM score (30/300) + the segment-killed event RED; Dev wires the premium via DDT_CLOUD_KILL_FLAG.
## Tea Assessment (rework r2)

Addressed the reviewer's two blocking findings with RED tests in `plugins/millipede/tests/ddt-segment-kill.test.ts` (new describe "a DDT kill scores the ROM premium"):
- **BODY kill scores 30** and **HEAD kill scores 300** (currently flat 10 → both RED: "expected 10 to be 30" / "expected 10 to be 300"). ROM: DDTEX1 (`MILLI.MAC:1947 LDA I,80`, DD-217) always sets the DDT-death flag, so SHOOT2 142$ takes the premium path — body `LDA I,30` (`:2164-2165`), head LSR×4 hundreds (`:2171-2175`). Head = colour < BODY_COLOR (`:2168 CMP I,3D / BCS 145$`).
- **segment-killed event** pinned (guard, green now) so the CHAN2 explosion cue can't be silently dropped — closes the mutation-proven #8 gap.

Determinism: the score tests zero `score` and use an empty roster / no shot / no bonus-threshold crossing, so the DDT kill is the sole score source; `out.score` is exactly the award. Full suite otherwise green, `tsc` clean.

**For Dev (GREEN):** in `sim.ts` step 8b, replace the flat `SEGMENT_PTS` award with the ROM premium: `score += (s.color === BODY_COLOR ? 30 : 300)`. Introduce cited constants (e.g. `DDT_KILL_BODY_PTS = 30` / `DDT_KILL_HEAD_PTS = 300`) in `ddt.ts` with citations.test.ts-gated claims citing `MILLI.MAC:2165` and `:2171`, and reference `DDT_CLOUD_KILL_FLAG`'s intent in the comment. Also reword the `sim.ts:275` comment (drop the stray "is"; the score does NOT match a shot kill).

Handing off to Dev (Julia) for GREEN r2.
**Dev (GREEN r2, Julia):** Addressed both reviewer blockers. Replaced the flat `SEGMENT_PTS` on the DDT-cloud kill with the ROM premium `s.color >= BODY_COLOR ? DDT_KILL_BODY_PTS(30) : DDT_KILL_HEAD_PTS(300)` (head/body split = colour >= 0x3D, MILLI.MAC:2168). New cited constants in `ddt.ts` with claims DD-223 (`:2165 LDA I,30`) / DD-224 (`:2171 LSR ;100 POINTS FOR A HEAD`), byte-verified green. Reworded the sim.ts comment (dropped stray "is"; the score does NOT match a shot kill). The shot-kill path still uses SEGMENT_PTS (unchanged, out of scope). ml12-3 13/13 (2 new score tests now green), citations 25/25, full millipede **1463 green**, tsc clean. Pushed.