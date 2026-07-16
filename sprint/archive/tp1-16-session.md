---
story_id: "tp1-16"
jira_key: "tp1-16"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-16: FIRE & COLLISION GEOMETRY — tick order, the invented far-end fire floor, and hit tolerances 2-3x too generous

## Story Details
- **ID:** tp1-16
- **Jira Key:** tp1-16
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-16T09:46:29Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-16T08:51:36Z | 2026-07-16T08:54:07Z | 2m 31s |
| red | 2026-07-16T08:54:07Z | 2026-07-16T09:19:45Z | 25m 38s |
| green | 2026-07-16T09:19:45Z | 2026-07-16T09:36:27Z | 16m 42s |
| review | 2026-07-16T09:36:27Z | 2026-07-16T09:46:29Z | 10m 2s |
| finish | 2026-07-16T09:46:29Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): W-021's mid-jump (INVMOT) no-fire rule is unimplemented and NOT covered by a test in this suite — the ROM's FIREIC skips a mid-flip invader (`AND INVMOT / IFEQ`, ALWELG.MAC:2701-04). Affects `src/core/sim.ts` (`stepEnemyFire` ~L381 must also skip `isJumping(e)`; the fire gate isn't a pure seam, so consider extracting fire-eligibility into a pure predicate to make it testable). *Found by TEA during test design.*
- **Conflict** (blocking): `HIT_DEPTH` (sim.ts:445) is shared by TWO collision routines — `resolveBulletHits` (bullet↔invader, L479, the W-046 target) AND `resolveEnemyBulletHits` (charge↔charge, L407, a DIFFERENT ROM range). Affects `src/core/sim.ts` (wire the new `enemyHitTolerance` into L479 ONLY; do NOT globally shrink `HIT_DEPTH`, or you silently regress charge-vs-charge collision). *Found by TEA during test design.*
- **Improvement** (non-blocking): the charge↔charge collision range at sim.ts:407 may itself be wrong — the ROM's CHACHA (`STX CHACHA`, ALWELG.MAC:527) is `TIMES8(WCHARL).X`, not the invented 0.06. Affects `src/core/sim.ts` (OUT of scope for tp1-16/W-046 — candidate follow-up finding, don't fix it here). *Found by TEA during test design.*
- **Gap** (non-blocking): citation-gate step — after removing the W-001/W-021/W-046 divergences, set `"remediated_by": "tp1-16"` on those three findings and run `node tools/audit/reanchor-citations.mjs --write` for other citations in touched files, then commit the JSON, or `npm test -- citations` goes red on the next story. Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json`. *Found by Dev during implementation: done — three stamps applied, 15 citations re-anchored, `0 lost`.*

### Dev (implementation)
- **Gap** (blocking, for the audit curators): the charge↔charge collision range is now a LIVE divergence with NO finding pointing at it. `HIT_DEPTH = 0.06` survives in `sim.ts` serving `resolveEnemyBulletHits` alone, and the ROM's CHACHA is `TIMES8(WCHARL).X` (ALWELG.MAC:529) — a per-wave derived value, not a flat 0.06. W-046's `ours` citation used to sit on that exact line, but W-046 is now stamped `remediated_by: tp1-16` (correctly — its divergence, the charge↔INVADER range, IS gone), which freezes the quote as history and stops the gate re-opening it. I grepped every findings file: `CHACHA` appears in NONE of them. So the line has just lost its only pointer. Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json` (file a new DIVERGENCE finding citing ALWELG.MAC:529 + `const HIT_DEPTH = 0.06`, so the follow-up is tracked rather than orphaned). *Found by Dev during implementation.*
- **Gap** (non-blocking): the INVMOT mid-jump fire gate ships with no automated coverage — see the Dev deviation for why the obvious `stepGame`-level test is dishonest (a hand-set `jumpAngle` freezes forever, since only a flipper's CAM advances a jump, so the fixture pins an unreachable state). Affects `src/core/sim.ts` (`stepEnemyFire`) — TEA's suggested fix stands: extract fire-eligibility into a pure predicate and test it directly. *Found by Dev during implementation.*
- **Improvement** (non-blocking): `enemyHitTolerance` is the first consumer to need a raw ROM speed BYTE rather than a converted depth/s, so `winvilForLevel`/`contourValue(TSPIIN, …)` are now read by two different kinds of consumer. If a third appears, the raw-byte accessors are worth exporting as a named pair rather than reaching through. Affects `src/core/rules.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking, for the audit curators): W-046's claim says ENSIZE "evaluates to 7 at waves 1-16 and 8 at waves 33+" — that summary is INCOMPLETE, and the finding's own reasoning only ever hand-verified waves 1 and 33. Deriving the whole TINVIN table gives **7 at waves 1-22, 8 at waves 23-64, and 8/9 ALTERNATING from wave 65** (the `TR` record swings WINVIL between -160 even and -191 odd, and -191×8 → hi=0xFA → ENSIZE 9). Dev's code is right — it derives from the table — but the claim text and Dev's inline comment both repeat the two-anchor summary, which invites a later "fix" that caps the value at 8. Affects `docs/audit/findings/pair-1-alwelg-sim-enemies.json` (correct W-046's claim to state the real bands) and `src/core/rules.ts` (the comment above the flipper/tanker/pulsar arm). *Found by Reviewer during code review.*
- **Gap** (non-blocking, for the audit curators): the MOVCHA→FIREIC boundary is only HALF ported, and W-001's claim never mentions the other half. The ROM retires a rim-reaching invader charge INSIDE MOVCHA — `DEC ESHCOU` (:2564), `JSR CHATOP` (the bolt-kills-cursor check, :2565), then `LDA I,0 / STA X,CHARY` to free the slot (:2566-68) — all BEFORE FIREIC scans those same slots for a vacancy (:2711-12) and rolls `CHANCE` indexed by ESHCOU (:2706). Our equivalents (`cullEnemyBullets`, `resolveEnemyBoltHits`) sit at the END of `stepPlaying`, after `stepEnemyFire`, so a bolt that reached the rim this frame still occupies a slot and still depresses `enemyFireChance(s.enemyBullets.length)` for one frame. Verified NOT a regression — `cullEnemyBullets` was already last on `origin/develop`, so tp1-16 did not introduce it and W-001's stamp remains honest for the divergences it actually states. Affects `src/core/sim.ts` (`stepPlaying` ordering) — worth its own DIVERGENCE finding. *Found by Reviewer during code review.*
- **Question** (non-blocking): correcting the fuseball window to the ROM's fixed 6 has a real, unrecorded late-game consequence — the fuseball is the ONE kind whose ENSIZE does not scale with its speed, yet it is the FASTEST enemy (`fuseballSpeed: 2 * flipperSpeed`, rules.ts:867 = the ROM's "FUSE INC=2X INVADER SPEED", :539-544). Its window is 12 along-units wide while a head-on charge closes at 9 + 2·|WINVIL|/32 per ROM frame — 11.75 at wave 1 (fits, by 0.25), but 12.06 from wave 2 and 20.94 by wave 65. Since `src/shell/loop.ts` drives `stepGame` at exactly one ROM frame, a charge can pass THROUGH a vulnerable fuseball without registering — a ~0.5% skip shadow at wave 2 rising to ~43% by wave 65. The old 0.09 window (40.3 units) made this impossible. I believe this is FAITHFUL, not a defect: all four inputs are byte-verified (ENSIZE+ZABFUS=6, fuse=2×WINVIL, PCVELO=9, COLLIS once per frame), and it plausibly explains the arcade's famously unkillable late-game fuseballs. Recording it so the next reader does not misdiagnose it as a collision bug and "fix" it. Affects `docs/audit/findings/` (file as an observation against W-046) . *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Mid-jump (INVMOT) fire gate left untested**
  - Spec source: docs/audit/findings/pair-1-alwelg-sim-enemies.json, W-021
  - Spec text: "FIREIC also refuses to fire while the invader is mid-jump (INVMOT set, 2702-2704) — we have no such rule."
  - Implementation: No test written for the mid-jump gate; flagged as a Delivery Finding (Gap) for Dev instead.
  - Rationale: the fire gate is inline in `stepEnemyFire` and `jumpAngle` (INVMOT) is owned by the CAM; a `stepGame`-level test can't deterministically hold an invader mid-flip at the fire-gate frame without a fragile hand-built state. Reliable coverage needs a pure fire-eligibility seam.
  - Severity: minor
  - Forward impact: Dev implements the INVMOT gate uncovered by my suite; reviewer verifies against ALWELG.MAC:2701-04.
- **W-046 wave-scaling pinned at anchors only**
  - Spec source: docs/audit/findings/pair-1-alwelg-sim-enemies.json, W-046
  - Spec text: "((255 - hi) + 13) >> 1 ... evaluates to 7 at waves 1-16 and 8 at waves 33+."
  - Implementation: tests assert 7/224 at levels 1 & 16 and 8/224 at level 33 (plus 33 > 1); waves 17-32 are not asserted.
  - Rationale: the finding states neither the intermediate values nor the exact 7→8 flip wave; pinning a guessed middle band would over-constrain (table-audit lesson: don't pin an unknown row).
  - Severity: minor
  - Forward impact: none — Dev derives ENSIZE from the wave's invader speed, so 17-32 fall out of the derivation.
- **W-030 not tested (already remediated)**
  - Spec source: sprint/context/context-story-tp1-16.md ("Subsumes W-001, W-021, W-030, W-046")
  - Spec text: subsumes W-030 (a tanker's children born at the parent's exact depth).
  - Implementation: no test written for W-030.
  - Rationale: W-030 carries `remediated_by: tp1-24`; the `SPLIT_CHILD_DEPTH` clamp is already gone (sim.ts:316, rules.ts:454) and covered by tests/core/tp1-24.split-child-depth.test.ts. Re-testing would duplicate.
  - Severity: minor
  - Forward impact: none — W-030 is out of this story's remaining work.

### Dev (implementation)
- **Implemented the INVMOT mid-jump fire gate, which no test in this story covers**
  - Spec source: .session/tp1-16-session.md, TEA Delivery Finding 1 + TEA deviation "Mid-jump (INVMOT) fire gate left untested"
  - Spec text: "Dev implements the INVMOT gate uncovered by my suite; reviewer verifies against ALWELG.MAC:2701-04."
  - Implementation: added `if (isJumping(e)) continue` to `stepEnemyFire` (sim.ts), reusing the existing exported `isJumping` helper whose doc comment already names the ROM's $80 INVMOT bit. Verified against ALWELG.MAC:2702-2704 (`LDA X,INVAC1 / AND I,INVMOT / IFEQ`).
  - Rationale: W-021's claim has THREE parts (no far-end floor, cap 192/224, no mid-jump fire). Stamping `remediated_by: tp1-16` on W-021 while leaving the third live would write a phantom fix into the audit and the citation gate would go green on it. Implementing it is what makes the stamp honest.
  - Severity: minor
  - Forward impact: the gate ships with NO automated coverage. I probed it with a throwaway test (a hand-set `jumpAngle` does suppress fire where a settled invader fires, so the gate is load-bearing, not dead code) but DELETED the probe rather than ship it: the trace showed `jumpAngle` frozen at 3 forever, because a tanker's CAM never advances a jump — i.e. the probe pinned a state the game cannot reach, exactly the fragility TEA predicted. Honest coverage needs TEA's pure fire-eligibility seam. Reviewer should verify by source, per TEA's plan.
- **Re-seated two point-blank tanker-split fixtures that RED's sibling sweep missed**
  - Spec source: tests/core/tp1-5.pulsar-fuse-split.test.ts:461, tests/core/tp1-6.invader-cap.test.ts:174
  - Spec text: `s0.bullets = [{ lane: 5, depth: 0.50 }]   // point-blank: it splits this frame`
  - Implementation: seated each charge ONE step rimward — `depth: 0.50 + BULLET_SPEED * FRAME` — so it lands on the tanker at COLLIS instead of past it.
  - Rationale: both stepped at `SIM_STEP` (the ROM's 28.44 fps frame), in which a charge travels PCVELO = 9 along-units = 0.040 depth. A charge parked exactly ON its target is therefore ~0.048 PAST it by the time COLLIS runs — inside the invented 0.06 window, outside the ROM's ENSIZE = 7/224 = 0.031. The fixtures were relying on the over-generous tolerance this story removes. Not a gameplay regression: TIMES8 sets ENSIZE to HALF THE CLOSING SPEED by construction (`;COLLISION RANGE=AVERAGE OF ABS VAL OF SPEEDS`, :571-572), so the ±7 window (14 wide) always exceeds the ~10.7-unit closing step and a charge approaching from the rim cannot skip it — only a teleported-on-top fixture can miss.
  - Severity: minor
  - Forward impact: none — both assertions (the split, the slot gate) are unchanged; only the seat moved. Future fixtures seeding a charge point-blank need the same one-step offset.
- **Inverted story 6-15's "fuseball has the WIDER kill window" test block instead of re-seating it**
  - Spec source: tests/core/sim.enemy-motion-fidelity.test.ts, "AC 2b: fuseball has the wider hit_tol[4]=6 kill window"
  - Spec text: "hit_tol[4]=6 (§D l.265) is WIDER than the default enemy tolerance... NOTE (TEA assumption): the rev-3 default hit_tol is not in the extracted notes, so this pins the RELATIONSHIP (fuseball window strictly wider than the default ~0.06)... Dev/Reviewer should confirm the exact ratio against the disassembly."
  - Implementation: rewrote the block to assert the opposite inequality (fuseball 6/224 strictly NARROWER than flipper 7/224), driving the same dt→0 sim-level probe and keeping the complement test that guards against shrinking the window for every kind. Offsets now derive from `enemyHitTolerance` rather than the magic 0.07/0.05.
  - Rationale: the block did not merely have a stale fixture — it asserted a REFUTED PREMISE, and 6-15's own note conceded the assumption was unverified and asked a later Dev to check it against the disassembly. tp1-16 is that check, and the primary source says 6 < 7 (ALWELG.MAC:545-546 vs :530-538). CLAUDE.md is explicit that the primary-source audit outranks the book-derived notes. Re-seating would have preserved a false law. There is precedent in this same file: tp1-5 deleted two other 6-15 fuseball tests on the same grounds, with a tombstone comment.
  - Severity: minor
  - Forward impact: 6-15's AC 2b is now inverted in the tree. Net +1 test (3 → 4). Anyone reading 6-15's ACs should treat AC 2b as superseded by W-046.

### Reviewer (audit)

Every TEA and Dev deviation above is stamped. Nothing is left unadjudicated.

- **TEA — "Mid-jump (INVMOT) fire gate left untested"** → ✓ ACCEPTED by Reviewer: vindicated by evidence TEA did not have. Dev's deleted probe trace proved `jumpAngle` stays pinned at 3 forever on a tanker (only a flipper's CAM advances a jump), which is exactly the "fragile hand-built state" TEA predicted. The deferral was correct, and so was the recommendation (a pure fire-eligibility seam).
- **TEA — "W-046 wave-scaling pinned at anchors only"** → ✓ ACCEPTED by Reviewer, and the caution proved well-founded. I derived the full table independently: ENSIZE is 7 at waves 1-22 (not 1-16), 8 at 23-64, and alternates 8/9 from wave 65 (the TINVIN `TR` record swings WINVIL -160/-191 by parity). Had TEA guessed the middle band from the finding's summary, it would have pinned the wrong flip wave and forced Dev to a wrong derivation. Refusing to pin an unknown row was the right call.
- **TEA — "W-030 not tested (already remediated)"** → ✓ ACCEPTED by Reviewer: `remediated_by: tp1-24` confirmed on the finding; re-testing would duplicate `tests/core/tp1-24.split-child-depth.test.ts`.
- **Dev — "Implemented the INVMOT mid-jump fire gate, which no test in this story covers"** → ✓ ACCEPTED by Reviewer: the reasoning is the decisive one. W-021's claim carries three divergences and stamping `remediated_by` while leaving the third live would have written a phantom fix — the exact failure the citation convention exists to prevent. Verified the gate against ALWELG.MAC:2702-2704 (`LDA X,INVAC1 / AND I,INVMOT / IFEQ`, INVMOT=0x80 at ALCOMN.MAC:852, ZMOTJM=INVMOT at :854 — the bit means "flipping/leaping", so `IFEQ` fires only when settled). Placement is also right: the ROM's RANDOM/CHANCE roll (:2705-07) sits AFTER the INVMOT test, and Dev's gate likewise precedes `nextFloat(s.fireRng)`, so a mid-flip invader consumes no RNG draw in either build. Deleting the probe rather than shipping it as coverage was the correct call, not a shortcut.
- **Dev — "Re-seated two point-blank tanker-split fixtures that RED's sibling sweep missed"** → ✓ ACCEPTED by Reviewer: diffed both — the assertions are byte-identical and only the bullet seat moved. The physics check is sound and I re-derived it independently: TIMES8 sets ENSIZE to half the closing speed by construction, and across all 99 waves the tightest margin for the speed-derived kinds is +2 along-units (wave 15, step 12 vs window 14), so a charge closing from the rim cannot skip an invader. The fixtures were relying on the invented 0.06, not on real geometry.
- **Dev — "Inverted story 6-15's 'fuseball has the WIDER kill window' test block instead of re-seating it"** → ✓ ACCEPTED by Reviewer: this is the correct disposition, not merely a permissible one. The block cited the book-derived rev-3 extract (§D l.265) and CLAUDE.md is explicit that the primary-source audit outranks it ("Take arcade constants from there, not from the book-derived findings doc"). The source is unambiguous — ENSIZE+ZABFUS is a literal 6 (:545-546), the flipper's is TIMES8's 7 (:530-538). Re-seating would have preserved a false law that the block's own author flagged as unverified. Precedent confirmed in the same file, where tp1-5 deleted two other 6-15 fuseball tests on identical grounds.

## SM Assessment

Setup complete for tp1-16 (FIRE & COLLISION GEOMETRY), tdd/phased, tempest (gitflow).
Branch `feat/tp1-16-fire-collision-geometry` cut off `origin/develop`; merge gate clear
(no open tempest PRs); parallel-checkout race check clean (no tp1-16 commits on any origin ref).

**Scope:** Cluster C12 minus W-022 (carved to tp1-3). Context lists subsumed findings
W-001, W-021, W-030, W-046. Three concrete AC targets:
1. Tick reorder — all charges move AFTER invaders; enemy charges fire AFTER enemies move.
2. Delete `ENEMY_FIRE_MIN_DEPTH` (0.188) — the invented far-end fire floor; ROM has no such rule.
3. Derive hit tolerance from ENSIZE (flipper 7 / fuseball 6) + closing speed, not hard-coded
   `HIT_DEPTH=0.06` / `FUSEBALL_HIT_DEPTH=0.09` (~1.9x / ~3.3x too generous).

**⚠ TEA — before RED, verify against source, do not trust the subsumes labels:**
- Pull each of W-001/W-021/W-030/W-046 from `tempest/docs/audit/findings/*.json`; read the full
  claim + reasoning (watch for `[REFUTATION]`/`[CORRECTION]` tags that can flip a claim) and check
  each `remediated_by` — some may already be fixed by a prior story and should be carved out.
- W-030's fairness valve depends on the CAM from tp1-4/tp1-5 — confirm those landed; if not,
  scope W-030 out rather than block. Grep every consumer of any clamp/constant you change.
- Gate: `npm test -- citations` must stay green — re-anchor pinned lines after ANY edit (even
  comment-only), and don't introduce `window.`/`document.` in sim/events/state source OR comments
  (the purity scanner reads comment text).

## TEA Assessment

**Tests Required:** Yes

**Test Files:**
- `tests/core/tp1-16.fire-collision-geometry.test.ts` — 11 tests, all verified against Theurer's ALWELG.MAC (source re-read, not trusting the finding summaries).

**Tests Written:** 11 tests covering the 3 live ACs (W-001, W-021, W-046). **Status:** RED — 10 failing, 1 passing (the point-blank-kill positive control, which must STAY green through the fix).

**Verified RED (each fails for the right reason, run via testing-runner):**
| AC / Finding | Test | Current (buggy) → assertion |
|---|---|---|
| W-001 tick order | bolt born-still on its fire frame | bolt at 0.51005 vs fire-depth 0.50291 — advanced 0.0071 on birth frame → fails |
| W-001 liveness | bolt DOES move next frame (not frozen) | positive half passes; birth-still half fails today |
| W-021 no far-end floor | fresh far-end tanker fires below 0.1875 | first fire pinned at 0.18968 (just above the invented floor) → fails |
| W-021 near cap | `ENEMY_FIRE_MAX_DEPTH` ≈ 192/224 | 0.9 vs 0.857 → fails |
| W-046 flipper/tanker/pulsar | 7/224 at waves 1-16 | `enemyHitTolerance` not a function → fails |
| W-046 fuseball | fixed 6/224, wave-independent | not a function → fails |
| W-046 inversion | fuseball tol < flipper tol (comment was backwards) | not a function → fails |
| W-046 closing-speed scaling | 8/224 by wave 33+ | not a function → fails |
| W-046 exhaustiveness | finite tol for every EnemyKind | not a function → fails |
| W-046 wiring | flipper kill at gap 0.066 must become a MISS | currently kills (true) → fails |
| W-046 wiring | point-blank kill still works | **PASSES** (must remain green) |

### Rule Coverage
| Rule (lang-review TS) | Test | Status |
|---|---|---|
| Exhaustive switch on enum (`default: assertNever`) | `returns a finite tolerance for every enemy kind` | failing (function missing) |

**Rules checked:** the one applicable TS lang-review rule (enum exhaustiveness) has coverage; the rest (Result types, async-throws, Deserialize bypass) don't apply to this numeric-fidelity story. **Self-check:** 0 vacuous tests — every test asserts a concrete number or kill/miss outcome; the born-still and wiring tests each carry a liveness/positive-control guard so a frozen-bolt or dead-collision bug can't pass them.

### Scope notes for Dev (Julia)
- **W-030 is already done** (`remediated_by: tp1-24`; clamp gone at sim.ts:316 / rules.ts:454) — do NOT touch it. Only W-001, W-021, W-046 remain.
- **`enemyHitTolerance(kind, level)` is the contracted seam** — add it to `src/core/rules.ts` (returns depth-units) and wire it into `resolveBulletHits` (sim.ts:479) ONLY. See the Delivery Findings for the shared-`HIT_DEPTH` hazard (L407 charge-charge is a different ROM range — don't regress it) and the `remediated_by: tp1-16` citation-gate step.
- Keep `src/core/sim.ts`/`state.ts` pure (the events.test.ts scanner reads comments too — no `window.`/`document.`/`Date.now`/`Math.random`, not even in a comment).

**Handoff:** To Dev (Julia) for GREEN.

### Delivery Findings Capture
See `## Delivery Findings` → `### TEA (test design)` above (4 findings: the untested INVMOT gate, the shared-`HIT_DEPTH` hazard, the possible CHACHA follow-up, and the `remediated_by` gate step).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/rules.ts` — deleted the invented `ENEMY_FIRE_MIN_DEPTH`; `ENEMY_FIRE_MAX_DEPTH` 0.9 → `(0xf0-0x30)/224`; added `enemyHitTolerance(kind, level)` + the `times8CollisionRange` helper (W-021, W-046).
- `src/core/sim.ts` — tick order reordered to PLAY's MOVINV/MOVCHA/FIREIC/COLLIS; fire gate reduced to the single positional test + the INVMOT mid-jump rule; `resolveBulletHits` now reads `enemyHitTolerance`; `FUSEBALL_HIT_DEPTH` deleted and `HIT_DEPTH` re-scoped/re-commented to charge↔charge only (W-001, W-021, W-046).
- `tests/core/sim.enemy-motion-fidelity.test.ts` — 6-15's AC 2b inverted to the source's direction (3 tests → 4). See deviation.
- `tests/core/tp1-5.pulsar-fuse-split.test.ts`, `tests/core/tp1-6.invader-cap.test.ts` — point-blank charge fixtures re-seated one charge-step rimward. See deviation.
- `docs/audit/findings/*.json` — W-001/W-021/W-046 stamped `remediated_by: tp1-16`; 15 citations re-anchored across 5 files, **0 lost**.

**Tests:** 1512/1512 passing (GREEN), 131/131 files. `tsc --noEmit` clean, `vite build` clean.
**Branch:** `feat/tp1-16-fire-collision-geometry` (pushed, commit `ec83f59`). No PR — SM opens it at finish.

**All 11 of TEA's tests pass, including the point-blank positive control that had to stay green.**

### Source verification (I re-read ALWELG.MAC rather than trust the finding summaries)
- The finding gives the flipper/tanker/pulsar derivation but is silent on the **spiker**. The ROM does define one: `ENSIZE` is a 5-entry table (`.BLKB 5`, ALCOMN.MAC:781) and ZABTRA=3 ("TRALER") gets its own range from its own speed slot at :520-524, separately from the shared TIMES8 at :530-538. TEA's exhaustiveness test only required a finite value; I derived the faithful one.
- The pulsar's SPEED is overridden at :547-550 but its ENSIZE is already set at :538 — so it correctly shares the flipper's range, matching TEA's `enemyHitTolerance('pulsar', 1) === 7/224`.

### Judgement calls for the Reviewer (The Thought Police) to weigh
1. **The INVMOT gate ships untested.** It is implemented and I proved it load-bearing with a throwaway probe, but I deleted the probe rather than ship it: the trace showed a hand-set `jumpAngle` frozen forever (only a flipper's CAM advances a jump), so it pinned a state the game cannot reach — TEA called this exactly right. Verify by source: ALWELG.MAC:2702-2704.
2. **Three sibling test files changed beyond the story's suite** — two mechanical re-seats and one inverted premise. All three are logged as deviations with rationale.
3. **`HIT_DEPTH = 0.06` survives as an unrecorded live divergence.** W-046's stamp is honest (its own divergence is gone), but the constant now serves charge↔charge, whose ROM value is `TIMES8(WCHARL).X` (:529) — and no findings file mentions CHACHA. Filed as a blocking Delivery Finding for the audit curators.

**Handoff:** To Reviewer (The Thought Police) for review.

### Delivery Findings Capture
See `## Delivery Findings` → `### Dev (implementation)` above (3 findings: the unrecorded CHACHA divergence — blocking, for the curators; the uncovered INVMOT gate; and the raw-byte accessor note).

## Subagent Results

Only `preflight` is enabled in this project — `pf settings get workflow.reviewer_subagents` returns `false` for the other eight. Their domains were therefore assessed by me directly, not claimed as covered.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 1512/1512 pass, tsc + vite build clean, `npm test -- citations` 25/25, zero debug code, tree clean, no scratch files |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by me: derived ENSIZE across all 99 waves, proved the no-tunnel margin for speed-derived kinds (+2 worst case, wave 15) and FOUND the fuseball skip-shadow (finding 3) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by me: no catches/fallbacks in the diff; the one silent path (`default:` on the new switch) is `assertNever`, which fails loudly at compile time |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed by me: 1 LOW (duplicate inversion assertion); re-seat diffs verified assertion-preserving; no vacuous tests |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — assessed by me: 1 MEDIUM (the "8 from wave 33" comment is incomplete — finding 1) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — assessed by me: `enemyHitTolerance(kind: EnemyKind, level: number): number` is properly typed, exhaustive, no escapes |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — assessed by me: N/A domain. No auth/tenancy/network/untrusted input exists in this repo (client-only vector game, no backend); the diff is pure arithmetic on a seeded core |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — assessed by me: 2 LOW (per-pair recompute; duplicated PCVELO literal) |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — assessed by me: ran the lang-review TS checklist mechanically over the diff (see `### Rule Compliance`) — 0 violations |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via settings and assessed directly)
**Total findings:** 6 confirmed (0 Critical, 0 High, 3 Medium, 3 Low), 0 dismissed, 0 deferred

### Rule Compliance

Rubric: `.pennyfarthing/gates/lang-review/typescript.md`. Every rule enumerated against every changed symbol, not one exemplar.

| # | Rule | Instances checked | Verdict |
|---|------|-------------------|---------|
| 1 | Type safety escapes (`as any`, `as unknown as`, `@ts-ignore`, `@ts-expect-error`, unsafe `!`) | Whole diff swept: 0 hits for every pattern. Two `!` in TEA's tests (`bolt!.depth`, `moved!.depth`) — both immediately preceded by `expect(...).toBeDefined()` | ✓ compliant |
| 2 | Generic/interface pitfalls (`Record<string, any>`, `object`, `Function`, missing `readonly`) | 0 hits. `enemyHitTolerance(kind: EnemyKind, level: number): number` takes concrete types; `times8CollisionRange(rawSpeed: number): number` likewise. Neither mutates any argument | ✓ compliant |
| 3 | **Enum exhaustiveness (`default: assertNever`)** | The one new switch — `enemyHitTolerance` on `EnemyKind` — covers all 5 members (fuseball; flipper/tanker/pulsar; spiker) and ends `default: return assertNever(kind, 'enemyHitTolerance kind')`, matching the file's existing idiom at :278/:428/:590. This is the rule TEA wrote a test for; it passes | ✓ compliant |
| 4 | Null/undefined (`\|\|` vs `??`, unchecked `Map.get`, optional destructuring) | No new optionals introduced. Pre-existing `(e.fireCooldown ?? 0) > 0` untouched and correct (`??`, not `\|\|` — 0 is a valid cooldown) | ✓ compliant |
| 5 | Module/declaration issues (`export type`, `import type`, ambient decls) | `enemyHitTolerance` is a runtime value correctly imported as a plain named import in sim.ts and both touched test files; `EnemyKind` was already `import type` in rules.ts | ✓ compliant |
| 6 | React/JSX | No `.tsx` in the diff | N/A |
| 7 | Async/Promise | No async introduced; the core is synchronous by design | N/A |
| 8 | Test quality (`as any` in assertions, mock drift, importing from `dist/`) | 4 test files; all import from `../../src/core/*`, no mocks, no casts | ✓ compliant |
| 9 | Build/config (`strict`, `skipLibCheck`, sourcemaps, paths) | No config files touched | N/A |

**Project-specific rules (tempest CLAUDE.md — the hard architectural boundary):**

| Rule | Enumeration | Verdict |
|------|-------------|---------|
| `core/` must never touch DOM/`window`/`document`/`canvas` | Swept every added line in `src/core/rules.ts` + `src/core/sim.ts`: 0 hits. Comment text too — the scanner reads comments, and Dev's "…the fuseball window was WIDER" prose sits in rules.ts, which is not scanned; sim.ts's added comments contain no forbidden token | ✓ compliant |
| `core/` must never call `Date.now`/`Math.random`/`performance.now`/`rAF` | 0 hits across the diff. The new code is pure arithmetic; the one RNG use (`nextFloat(s.fireRng)`) is the pre-existing seeded stream carried in `GameState` | ✓ compliant |
| `stepGame` must be deterministic for identical input | `enemyHitTolerance` is a pure function of `(kind, level)` — no state, no clock. The INVMOT gate reads `e.jumpAngle`, already part of `GameState`. 1512 seeded tests pass | ✓ compliant |
| Take constants from the primary-source audit, NOT the book-derived findings doc | This is the rule the whole story turns on. Dev applied it correctly against 6-15's `§D l.265` book note, and the inversion is the rule being enforced, not broken | ✓ compliant |
| Citation gate must stay green; `remediated_by` only for divergences actually removed | 3 stamps, each triaged against its finding's stated claim; `reanchor-citations.mjs` reports 0 lost; `npm test -- citations` 25/25 | ✓ compliant |

## Reviewer Assessment

**Verdict:** APPROVED

No Critical or High findings. Six confirmed observations (3 Medium, 3 Low), none blocking — the three Mediums are all *audit-record* gaps rather than code defects, and two of them predate this story.

### Findings

| Severity | Issue | Location | Fix Required |
|----------|-------|----------|--------------|
| [MEDIUM] [DOC] | Comment says ENSIZE is "7 at waves 1-16, 8 from wave 33"; the code correctly yields 7 at 1-22, 8 at 23-64, 8/9 alternating from 65. Repeats the finding's two-anchor summary and invites a wrong "cap at 8" fix | `src/core/rules.ts` (flipper/tanker/pulsar arm) | Follow-up — filed as a Delivery Finding; code is correct, only the prose is incomplete |
| [MEDIUM] | MOVCHA's retire/`DEC ESHCOU`/CHATOP run before FIREIC in the ROM; our `cullEnemyBullets`/`resolveEnemyBoltHits` run after `stepEnemyFire` | `src/core/sim.ts` `stepPlaying` | Follow-up — **pre-existing** (verified on `origin/develop`), outside W-001's stated claim. Filed for the curators |
| [MEDIUM] | Fuseball skip-shadow: fixed ENSIZE 6 vs the fastest enemy's closing speed → ~0.5% at wave 2 rising to ~43% at wave 65 | `src/core/rules.ts` fuseball arm | None — judged ROM-faithful (4 byte-verified inputs). Filed so it is not later misdiagnosed |
| [LOW] | `expect(FUSE_TOL).toBeLessThan(FLIPPER_TOL)` duplicates tp1-16's own unit-level inversion test | `tests/core/sim.enemy-motion-fidelity.test.ts` | Optional — the block's other 3 tests are sim-level and earn their keep |
| [LOW] | `PCVELO = 9` now named in rules.ts while `BULLET_SPEED` (:78) still hardcodes a bare `9` — two sources for one ROM constant | `src/core/rules.ts` | Optional — Dev avoided touching a cited line deliberately; sound trade |
| [LOW] | `enemyHitTolerance` recomputed per (bullet, enemy) pair inside the nested loop, each doing a contour table scan, while `levelParams` is already hoisted in the same function | `src/core/sim.ts` `resolveBulletHits` | Optional — ≤56 calls/frame at 28.44fps; clarity over micro-perf is defensible |

### Verified (evidence, not vibes)

- **[VERIFIED] The TIMES8 arithmetic is faithful, and the shortcut is exact.** Dev reduced the ROM's 3× `ASL`/`ROL` macro to `((raw*8) & 0xffff) >>> 8`. I did not take that on trust: I re-implemented TIMES8 as a true 8-bit accumulator + `TEMP0` sign-extend-from-`0xFF` simulation and compared both across all 99 waves of the real TINVIN table — **0 mismatches**. The sign-extend trick is what makes it work: the ROM's `.BYTE -160` stores `0x60`, and `0xFF00|0x60` = -160, so the byte-vs-JS-number difference cancels. `rules.ts` `times8CollisionRange`.
- **[VERIFIED] Charges cannot tunnel the narrowed window for the speed-derived kinds.** TIMES8's own comment says the range is "AVERAGE OF ABS VAL OF SPEEDS" (:571-72), i.e. half the closing speed — so the window should always exceed the per-frame step. Confirmed numerically across all 99 waves for flipper/tanker/pulsar/spiker: tightest margin +2 along-units (wave 15, step 12 vs window 14). The narrowing is safe.
- **[VERIFIED] The spiker's ENSIZE is real, and the finding omitted it.** W-046 documents only the flipper/tanker/pulsar and fuseball arms. `ENSIZE` is `.BLKB 5` (ALCOMN.MAC:781) and ZABTRA=3 ("TRALER", :848) is assigned separately at :520-524 from its own speed slot. Dev derived it rather than satisfying TEA's finite-value test with a guess. COLCHK:2981 ("FLIPPER,TANKER,SPINNER,PULSAR") confirms spikers take the ENSIZE path.
- **[VERIFIED] `HIT_DEPTH` is correctly retained and correctly scoped — TEA's blocking Conflict honored.** COLCHK loops over charges AND invaders and branches on `CPX I,NICHAR` (:2946-47): shots compare against `CHACHA` (:2948), invaders against `ENSIZE` (:2963). Two different ROM ranges behind one of our constants. `sim.ts:407` still uses `HIT_DEPTH` for charge↔charge; only `resolveBulletHits` moved to `enemyHitTolerance`. Charge-vs-charge is not regressed.
- **[VERIFIED] The INVMOT gate matches the ROM in both semantics and position.** `INVMOT`=0x80 (ALCOMN.MAC:852), `ZMOTJM=INVMOT` = "flipping/leaping" (:854), and FIREIC's `AND I,INVMOT / IFEQ` (:2702-04) fires only when the bit is CLEAR. Dev's `isJumping(e)` reads `jumpAngle !== undefined`, and the gate precedes `nextFloat(s.fireRng)` — matching the ROM, where the RANDOM/CHANCE roll (:2705-07) also sits after the INVMOT test, so neither build burns an RNG draw on a mid-flip invader.
- **[VERIFIED] The three `remediated_by` stamps are honest.** W-001's claim states two divergences (charges-before-invaders; fire-before-move) — both removed. W-021's states three (far-end floor; 0.9 cap; mid-jump) — all three removed, which is precisely why Dev implementing the untested third one matters. W-046's states the charge↔invader tolerance — removed. Each stamp names a divergence that is genuinely gone, and no stamp papers over a live one.
- **[VERIFIED] The sibling re-seats preserve intent.** Diffed both: assertions byte-identical, only the bullet's seat moved, each carrying a comment explaining the geometry. `tp1-5` still asserts 2 flipping children from a ~0.50 split; `tp1-6` still asserts the full-board slot gate.

### Devil's Advocate

Arguing this change is broken. The most dangerous move here is not the arithmetic — it is that this story makes the game **harder in three compounding ways at once**, and no test measures playability. Enemies at the well's base can now fire immediately (the floor is gone), the fire cap extends nearer the rim (0.857 vs 0.9 is *stricter*, so that one helps), and every hit box shrank by roughly half (0.06 → 0.031, 0.09 → 0.027). A player who could clear wave 10 yesterday may not today. Is that a bug? No — it is the entire point of a fidelity epic, and each constant is byte-verified. But it is worth stating plainly that nobody has played this build; 1512 green unit tests say the arithmetic is right, not that the game is fun.

Second: the fuseball. I went looking for a way the narrowed window breaks the game and I found one — a ~43% chance at wave 65 that a charge passes clean through a vulnerable fuseball. My instinct was "reject, this is a collision bug". I talked myself out of it only by verifying all four inputs against the source (fixed ENSIZE 6, 2× speed, PCVELO 9, one COLLIS per frame) and finding the ROM has exactly this property. That is the right call, but it is a *judgement*, and I want it on the record rather than buried: if a future playtest reports "fuseballs are unkillable at high waves", this is why, and the answer is "yes, that is the arcade" — not a regression to hunt.

Third: what if `jumpAngle` is set on an enemy that never clears it? Dev's own trace found exactly that — a tanker pinned mid-jump forever. In the live game only a flipper's CAM sets and advances `jumpAngle`, so the gate is safe; but if any future story sets `jumpAngle` on a kind whose CAM does not advance it, that enemy is now **permanently silenced** rather than merely mid-flip. That is a latent trap the INVMOT gate just armed, and there is no test to catch it. It does not block — no current code path does this — but it is the strongest argument for TEA's pure fire-eligibility seam, and it strengthens that Delivery Finding from "nice to have" to "the next story in this area should do it".

Fourth: the `<=` vs `IFCC`. The ROM's COLCHK is `CMP Y,ENSIZE / IFCC` — strictly less-than. Ours is `<=`. In integer along-units that is a one-unit-wider window; in continuous float depth the boundary is measure-zero, and it is pre-existing besides. Not worth a finding, but I checked rather than assumed.

**Data flow traced:** player fires → `stepFiring` pushes a bullet at the rim → `stepBullets` advances it baseward one `SIM_STEP` (`BULLET_SPEED`, 9 along-units) → `resolveBulletHits` compares `|e.depth - b.depth|` against `enemyHitTolerance(e.kind, s.level)` → on a hit, `awardScore` + `enemy-death` event + `splitTanker`. Safe because the tolerance is a pure function of two values already in `GameState`, and the window provably exceeds the per-frame closing step for every speed-derived kind.

**Pattern observed:** the ROM-citation comment convention is followed exactly — every new constant and arm cites file + line + the assembler mnemonic it transcribes (`src/core/rules.ts:647-694`). This is the pattern that makes the audit re-checkable, and Dev extended it rather than eroding it, including on the retained `HIT_DEPTH` where the comment now explains what the constant is NOT.

**Error handling:** the only failure mode in the new code is an unknown `EnemyKind`, handled by `default: return assertNever(kind, 'enemyHitTolerance kind')` (`src/core/rules.ts:694`) — a compile-time error, not a runtime silent default. No nulls, no I/O, no throws.

**Handoff:** To SM (Winston Smith) for finish-story.