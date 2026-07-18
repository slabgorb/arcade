---
story_id: "rb4-16"
jira_key: "rb4-16"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-16: PLONSN, OR THE PLANE ESCAPES THE SCREEN — the servo must weave the DISPLAY position, clamped on-screen the ROM's way

## Story Details
- **ID:** rb4-16
- **Jira Key:** rb4-16
- **Workflow:** tdd
- **Type:** refactor
- **Points:** 8
- **Repos:** red-baron
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-18T01:33:04Z
**Round-Trip Count:** 1

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-17T21:41:58Z | 2026-07-17T21:46:13Z | 4m 15s |
| red | 2026-07-17T21:46:13Z | 2026-07-17T22:18:43Z | 32m 30s |
| green | 2026-07-17T22:18:43Z | 2026-07-18T00:44:07Z | 2h 25m |
| review | 2026-07-18T00:44:07Z | 2026-07-18T01:09:45Z | 25m 38s |
| green | 2026-07-18T01:09:45Z | 2026-07-18T01:18:35Z | 8m 50s |
| review | 2026-07-18T01:18:35Z | 2026-07-18T01:33:04Z | 14m 29s |
| finish | 2026-07-18T01:33:04Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (blocking): AC-4's outer-zone depth gate direction is INVERTED between the spec and the ROM. Context + design say "positionZ < 4 → flies past"; RBARON.MAC:2776-2781 (verified firsthand) says positionZ ≥ 4 → `;W/I DEPTH NO RETURN TO SCREEN` (flies past) and < 4 → `;RETURN TO WARDS SCREEN CENTER`. AND the compare is on PLSTAT+19, the POSITION Z **LSB** (:295), whose "4" has no defined scale in our continuous world-unit `positionZ`. Affects `red-baron/src/core/enemy.ts` (the servo's outer arm — AC-4 cannot be encoded without guessing) and `sprint/context/context-story-rb4-16.md` (AC-4 text). Left as `it.todo` in `tests/core/plonsn.test.ts`; SM/user must adjudicate the direction + the LSB-vs-value threshold, or descope AC-4 to a successor. **RESOLVED 2026-07-17 (user ruling): DESCOPED to a successor story** — rb4-16 ships AC-1/2/3/R3; the successor resolves the FLAG+1 direction + the LSB threshold against the ROM (firsthand evidence preserved in the test header + this finding). No longer blocks green. *Found by TEA during test design.*
- **Gap** (non-blocking): The AC-R3 reachability baseline documented in `red-baron/tests/core/display-space.test.ts:343` (597.3/112.5/24.1/20.2/10.8, and the design doc's repeated citation of 10.8) is STALE — measured through the ±32 gun rb4-17 deleted. Re-measured through the current COLLD gun with the same harness: 600 / 208.1 / 44.5 / 32.8 / 17.1. Affects `red-baron/tests/core/display-space.test.ts` (its :343 comment should be corrected during the green/verify pass — its `> 10` bar still holds, so non-blocking). My `plonsn.test.ts` uses the honest re-measured numbers. *Found by TEA during test design.*
- **Improvement** (non-blocking): The authority design doc `red-baron/docs/2026-07-17-rb4-16-plonsn-recut-design.md` — cited by the story as the source of truth — was UNTRACKED in the red-baron repo. Committed it (`e8d6027`) so the story's rationale survives the branch. Affects nothing further; noting so SM/Dev know it is now in git. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): TEA's "zero collateral" was measured RED-against-OLD-code and could not see the GREEN ripple — moving the servo world→screen broke SIX sibling assertions across `tests/core/enemy.test.ts` and `tests/core/enemy-machine.test.ts` (world-space zone reads, the retired ±olim fence, and one real NaN-totality regression). Affects `red-baron/tests/core/enemy.test.ts` + `red-baron/tests/core/enemy-machine.test.ts` (re-seated intent-preservingly; see the Design Deviation) and `red-baron/src/core/enemy.ts` (`plonsnClamp` regained the NaN sink the ±olim clamp used to be). *Found by Dev during implementation.*
- **Gap** (non-blocking): the front-end wiring that ACTIVATES the whole story — `main.ts` threading `toEye(flight)` into `stepWave` — has NO direct test. TEA's RED pinned the CORE seam (3-arg `stepWave` in `plonsn.test.ts`), and the booted `cockpit-loop.test.ts` never asserts the servo responds to pilot motion, so a reverted eye would ship green. Affects `red-baron/src/main.ts:577` (a cockpit-loop assertion — plane's weave-centre tracks the eye — should lock it). *Found by Dev during implementation.*
- **Question** (non-blocking): `POSITH_SCALE` (the servo's perspective-divide fixed-point) is an empirically-pinned SEAM (`2^14`) — SETDIV/`D.NBIT` (RBARON.MAC:586/935) give the divide's FORM (numerator `<<16` over the 16-bit depth, 12-bit quotient) but not the exact power-of-two alignment, which a 2901 microcode simulation could nail. Affects `red-baron/src/core/enemy.ts` `POSITH_SCALE` (a successor could replace the empirical pin with the derived alignment; the AC-R3 baseline is the current guard). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (blocking): the inner-window reversal regression test at `tests/core/enemy-machine.test.ts:208-219` is MUTATION-PROVEN VACUOUS — the re-seat missed it, so with `positionZ=P_INDP` the plane sits in the OUTER zone and the "head away from centre" logic can be deleted with the test still green (independently reproduced). Affects `red-baron/tests/core/enemy-machine.test.ts:231` (add `positionZ: identityZ()`, matching its two siblings). *Found by Reviewer during code review.*
- **Gap** (blocking): `plonsnLimit`/`plonsnClamp` totality docstrings (`enemy.ts:368`, `:504`) are FALSE for a negative or `-Infinity` `positionZ` — a negative `limit` teleports the plane to the wrong side; an `-Infinity` limit returns a non-finite `x` that persists (no backstop, unlike Y). Unreachable via `spawn`/`closeSpeed` today, but the AC-4 successor reads raw PLSTAT+19 into this field. Affects `red-baron/src/core/enemy.ts:496-498,506-513` (guard the domain, e.g. `Math.max(0, positionZ)` in `plonsnLimit`, + a `positionZ` totality test). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): AC-R3's prose ("the reachability regression guard", D4/D5) overclaims eye-sensitivity — dropping the eye from `stepWave` leaves 3 of 5 levels green and fails 0/4 by <1%; AC-1 ("OBSERVES the eye") is the decisive eye-proof. Affects `red-baron/tests/core/plonsn.test.ts:475` (reframe AC-R3 as a coarse reachability/soft-lock floor, or widen its sensitivity). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the stale ±olim assertions at `tests/core/enemy.test.ts:298-302,:355-361` assert the WORLD bound AC-3 retired, passing only by boresight-eye/world-origin coincidence. Affects `red-baron/tests/core/enemy.test.ts` (re-seat/reframe; the real bound is PLONSN, covered by plonsn.test.ts AC-2/AC-3). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the local mock-type contracts for `step` (`enemy.test.ts:121`) and `stepWave` (`enemy-machine.test.ts:140`) were not updated with the new `eye` param. Affects both files (add the `eye?` param to the mirror signatures). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 3 findings (1 Gap, 0 Conflict, 0 Question, 2 Improvement)
**Blocking:** None

- **Gap:** the front-end wiring that ACTIVATES the whole story — `main.ts` threading `toEye(flight)` into `stepWave` — has NO direct test. TEA's RED pinned the CORE seam (3-arg `stepWave` in `plonsn.test.ts`), and the booted `cockpit-loop.test.ts` never asserts the servo responds to pilot motion, so a reverted eye would ship green. Affects `red-baron/src/main.ts:577`.
- **Improvement:** AC-R3's prose ("the reachability regression guard", D4/D5) overclaims eye-sensitivity — dropping the eye from `stepWave` leaves 3 of 5 levels green and fails 0/4 by <1%; AC-1 ("OBSERVES the eye") is the decisive eye-proof. Affects `red-baron/tests/core/plonsn.test.ts:475`.
- **Improvement:** the stale ±olim assertions at `tests/core/enemy.test.ts:298-302,:355-361` assert the WORLD bound AC-3 retired, passing only by boresight-eye/world-origin coincidence. Affects `red-baron/tests/core/enemy.test.ts`.

### Downstream Effects

Cross-module impact: 3 findings across 2 modules

- **`red-baron/tests/core`** — 2 findings
- **`red-baron/src`** — 1 finding

### Deviation Justifications

7 deviations

- **AC-4 left as `it.todo` — no behavioral test written**
  - Rationale: The spec's gate DIRECTION is the mirror of the ROM's own comments (verified firsthand), and the threshold compares the POSITION Z LSB with no defined scale in our field. Encoding either without user resolution is the exact guess this epic exists to prevent. Filed as a blocking Delivery Finding.
  - Severity: major
  - Forward impact: Dev cannot implement AC-4 until the finding is resolved; the story can proceed on AC-1/2/3/R3 meanwhile. **RESOLVED 2026-07-17 (user ruling): AC-4 DESCOPED to a successor story.**
- **PLONSN rotation fixed-point not pinned — left to Dev with a required citation**
  - Rationale: The Math Box rotation (MRSLT0 through the sine table) is genuine derivation work; pinning an exact rotated-window value risks trapping Dev in my reading (the parked-RED contract philosophy — "this suite must not pre-decide it wrong"). The verified bytes are handed to Dev in the file header (SINE: 0,192,324,4B5,646,…,3FFB,4000; QUADSN: 0,80,0C0,40).
  - Severity: minor
  - Forward impact: Reviewer must independently full-diff Dev's sine-table transcription against 037007.XXX:48-64 (the diff-transcription-vs-ROM discipline).
- **POSITH_SCALE pinned EMPIRICALLY as a declared seam (`2^14`), not from a readable byte**
  - Rationale: AC-1/2/3 are all scale-INVARIANT (ratio-invariance, sign, anti-symmetry, depth-scaled clamp); only AC-R3 constrains it. Swept 2^12…2^16 through the exact guard: 2^14 is the clean power of two centred in the band that holds EVERY baseline (L0 15000/15000 exact; L1-4 244/110/66/26 ≥ 208/44/32/17). This is D5's own process — pin the window scale/unit to hold the honest baseline, never re-tune the bar.
  - Severity: minor
  - Forward impact: Reviewer verifies the scale is ROM-plausible and the baseline holds; a successor may nail the exact microcode alignment (see the Delivery Finding Question).
- **PLONSN's PFROTN window rotation NOT applied — declared seam (the eye API carries position, not bank)**
  - Rationale: `step`/`stepWave` thread the pilot's eye POSITION (a `Vec3`), not the pilot's BANK, so the rotation angle is unavailable — the same reason the servo's screen reading is unbanked. It is EXACT at level flight (rotation identity) and differs only mid-bank, where the servo already ignores bank; the gun's offset-rotation (guns.collides) is where our clone applies bank. TEA's own deviation left the rotation to Dev and noted the suite does not pin it.
  - Severity: minor
  - Forward impact: a successor that threads the bank ports the rotation from the cited bytes; the sine-table location is preserved in the `plonsnLimit` doc for the diff-vs-ROM check.
- **Five rb4-6 sibling servo tests re-seated world→screen; the retired ±olim-fence assertions dropped (AC-3)**
  - Rationale: rb4-16 moves the servo's input space; these rb4-6 tests hard-coded world-space zones + the retired clamp. TEA's RED (new tests vs OLD code) could not see the ripple. Re-seats preserve each test's INTENT (inner→away, outer→reverse, Y weaves both ways, not-a-seeker) in the new space; the new coordinate-space coverage lives in plonsn.test.ts AC-1.
  - Severity: minor
  - Forward impact: Reviewer/TEA confirm intent preservation; the dropped ±olim assertions are exactly what AC-3 retires.
- **main.ts front-end wiring added without a driving RED (`stepWave` eye thread)**
  - Rationale: TEA's RED pinned only the core seam (3-arg `stepWave` in plonsn.test.ts); no test asserts main.ts passes the eye, so the feature is a silent no-op in play without this one line. It is the same eye `guns.step` already consumes (rb4-6), so producer and consumer agree.
  - Severity: minor
  - Forward impact: filed as a Delivery Finding — a cockpit-loop assertion should lock the wiring so a future revert fails loudly.
- **POSITH_SCALE pinned empirically as a seam (2^14)** → ✓ ACCEPTED by Reviewer: the Math Box divide alignment is genuinely not byte-readable; AC-1/2/3 are scale-invariant (independently confirmed the ratio-invariance test distinguishes all three spaces), only AC-R3 constrains it, and 2^14 is ROM-plausible + holds the honest baseline. This is D5's sanctioned process, not bar-tuning. **BUT see the FLAG below on AC-R3's weak sensitivity — the guard this scale was tuned against is itself soft.**

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC-4 left as `it.todo` — no behavioral test written**
  - Spec source: context-story-rb4-16.md, AC-4; design doc §4
  - Spec text: "Outer-zone depth gate (:2776-2781). 'Return to centre' is depth-gated: when POSITION Z < 4 the plane flies past off-screen instead of turning back. Fold into the servo's outer arm."
  - Implementation: AC-4 is an `it.todo` placeholder with the ROM citation; no assertion is written.
  - Rationale: The spec's gate DIRECTION is the mirror of the ROM's own comments (verified firsthand), and the threshold compares the POSITION Z LSB with no defined scale in our field. Encoding either without user resolution is the exact guess this epic exists to prevent. Filed as a blocking Delivery Finding.
  - Severity: major
  - Forward impact: Dev cannot implement AC-4 until the finding is resolved; the story can proceed on AC-1/2/3/R3 meanwhile. **RESOLVED 2026-07-17 (user ruling): AC-4 DESCOPED to a successor story.**
- **PLONSN rotation fixed-point not pinned — left to Dev with a required citation**
  - Spec source: context-story-rb4-16.md, AC-2; design doc D2/§4
  - Spec text: "rotation (037007.XXX `SINE:`/`QUADSN:`) ... each transcribed from cited bytes."
  - Implementation: The suite pins the window magnitude (0x1A0), depth-proportionality, pilot-anchoring, and clamp-not-attract; it does NOT pin the exact PFROTN rotation of the window.
  - Rationale: The Math Box rotation (MRSLT0 through the sine table) is genuine derivation work; pinning an exact rotated-window value risks trapping Dev in my reading (the parked-RED contract philosophy — "this suite must not pre-decide it wrong"). The verified bytes are handed to Dev in the file header (SINE: 0,192,324,4B5,646,…,3FFB,4000; QUADSN: 0,80,0C0,40).
  - Severity: minor
  - Forward impact: Reviewer must independently full-diff Dev's sine-table transcription against 037007.XXX:48-64 (the diff-transcription-vs-ROM discipline).

### Dev (implementation)
- **POSITH_SCALE pinned EMPIRICALLY as a declared seam (`2^14`), not from a readable byte**
  - Spec source: context-story-rb4-16.md AC-1; design doc D2/D3/D5
  - Spec text: "Servo runs in post-divide SCREEN space (PLNDEL's space) ... window scale/unit is the likely axis; a regression is a green-phase finding."
  - Implementation: `screen = (world − eye) × POSITH_SCALE / positionZ`, `POSITH_SCALE = 0x4000`. SETDIV (RBARON.MAC:935-940) clears the numerator low word and POSITH loads the offset into the HIGH word over the 16-bit depth (a `<<16 / depth`, 12-bit `D.NBIT` divide), giving the FORM but not the exact power-of-two alignment — declared a seam with the derivation shown (scene.ts:43 precedent).
  - Rationale: AC-1/2/3 are all scale-INVARIANT (ratio-invariance, sign, anti-symmetry, depth-scaled clamp); only AC-R3 constrains it. Swept 2^12…2^16 through the exact guard: 2^14 is the clean power of two centred in the band that holds EVERY baseline (L0 15000/15000 exact; L1-4 244/110/66/26 ≥ 208/44/32/17). This is D5's own process — pin the window scale/unit to hold the honest baseline, never re-tune the bar.
  - Severity: minor
  - Forward impact: Reviewer verifies the scale is ROM-plausible and the baseline holds; a successor may nail the exact microcode alignment (see the Delivery Finding Question).
- **PLONSN's PFROTN window rotation NOT applied — declared seam (the eye API carries position, not bank)**
  - Spec source: context-story-rb4-16.md AC-2; design doc D2
  - Spec text: "rotation (037007.XXX `SINE:`/`QUADSN:`) ... each transcribed from cited bytes."
  - Implementation: PLONSN's depth-scaled window MAGNITUDE is byte-pinned (`0x1A0`, `>>16`, `×0x100`, RBARON.MAC:2882-2896), but the PFROTN rotation of that window (`LDY PFROTN / D.COMP / TRIG / MRSLT0`, :2898-2901, via the 037007.XXX:48-64 sine table) is NOT applied — the window stays axis-aligned.
  - Rationale: `step`/`stepWave` thread the pilot's eye POSITION (a `Vec3`), not the pilot's BANK, so the rotation angle is unavailable — the same reason the servo's screen reading is unbanked. It is EXACT at level flight (rotation identity) and differs only mid-bank, where the servo already ignores bank; the gun's offset-rotation (guns.collides) is where our clone applies bank. TEA's own deviation left the rotation to Dev and noted the suite does not pin it.
  - Severity: minor
  - Forward impact: a successor that threads the bank ports the rotation from the cited bytes; the sine-table location is preserved in the `plonsnLimit` doc for the diff-vs-ROM check.
- **Five rb4-6 sibling servo tests re-seated world→screen; the retired ±olim-fence assertions dropped (AC-3)**
  - Spec source: the rb4-6 servo suites (enemy.test.ts, enemy-machine.test.ts); AC-3
  - Spec text (AC-3): "The ad-hoc ±olim world clamp is retired. PLONSN replaces it."
  - Implementation: 3 zone tests seated at `positionZ = POSITH_SCALE` (the IDENTITY depth where screen == world, isolating the zone logic from the divide AC-1 pins separately); the Y-weave re-driven with a band-centred eye (the boresight default sits below the altitude band → a correct monotone dive, not a dead axis); the beeline re-expressed via deltaX sign-oscillation (the weave survives; its WORLD excursion correctly shrinks as the plane closes on screen); the outer-wall `x ≤ olim` fence assertions DELETED (AC-3). The NaN case was a real code regression (the ±olim `clamp` used to be X's NaN sink) — fixed in `plonsnClamp`, not the test.
  - Rationale: rb4-16 moves the servo's input space; these rb4-6 tests hard-coded world-space zones + the retired clamp. TEA's RED (new tests vs OLD code) could not see the ripple. Re-seats preserve each test's INTENT (inner→away, outer→reverse, Y weaves both ways, not-a-seeker) in the new space; the new coordinate-space coverage lives in plonsn.test.ts AC-1.
  - Severity: minor
  - Forward impact: Reviewer/TEA confirm intent preservation; the dropped ±olim assertions are exactly what AC-3 retires.
- **main.ts front-end wiring added without a driving RED (`stepWave` eye thread)**
  - Spec source: context-story-rb4-16.md AC-1; Dev self-review "wired to front end"
  - Spec text: "the window servo's zone detection ... run on the plane's post-divide screen position."
  - Implementation: threaded `toEye(flight)` into `main.ts:577` `stepWave(enemies, level, toEye(flight))`. Without it the shipped game's servo reads the boresight and RE-CREATES the five-kill soft-lock the story exists to kill.
  - Rationale: TEA's RED pinned only the core seam (3-arg `stepWave` in plonsn.test.ts); no test asserts main.ts passes the eye, so the feature is a silent no-op in play without this one line. It is the same eye `guns.step` already consumes (rb4-6), so producer and consumer agree.
  - Severity: minor
  - Forward impact: filed as a Delivery Finding — a cockpit-loop assertion should lock the wiring so a future revert fails loudly.

### Reviewer (audit)
- **POSITH_SCALE pinned empirically as a seam (2^14)** → ✓ ACCEPTED by Reviewer: the Math Box divide alignment is genuinely not byte-readable; AC-1/2/3 are scale-invariant (independently confirmed the ratio-invariance test distinguishes all three spaces), only AC-R3 constrains it, and 2^14 is ROM-plausible + holds the honest baseline. This is D5's sanctioned process, not bar-tuning. **BUT see the FLAG below on AC-R3's weak sensitivity — the guard this scale was tuned against is itself soft.**
- **PFROTN window rotation NOT applied (seam)** → ✓ ACCEPTED by Reviewer: the eye API threads position (Vec3), not bank, so the angle is genuinely unavailable; identity at level flight; the gun's offset-rotation is the clone's bank seam; sine-table citation (037007.XXX:48-64) verified present. Sound.
- **Five rb4-6 sibling servo tests re-seated world→screen** → ✗ FLAGGED by Reviewer: the re-seat was INCOMPLETE. `enemy-machine.test.ts:208-219` (a third inner-window sibling) was missed and is now MUTATION-PROVEN VACUOUS (I reproduced: deleting the inner reversal leaves it green; its re-seated siblings fail). And `enemy.test.ts:298-302 / :355-361` still assert the ±olim WORLD bound AC-3 retired, passing only by boresight-eye coincidence. The re-seats that WERE done (AC-1/2/3, beeline, outer-wall) hold up under mutation — but this deviation's "five tests" is really "six, and one was defanged." See the severity table.
- **main.ts eye wiring added without a driving RED** → ✓ ACCEPTED by Reviewer: the wiring is required (without it the shipped game reads the boresight), verified present and eye-consistent with `guns.step`; the missing front-end test is honestly filed as a Delivery Finding. Sound — the wiring is right; only its test coverage is deferred.

## Sm Assessment

**This is a RE-CUT of a parked story, not a fresh start.** rb4-16 was parked with a "⛔ PARKED" banner
citing two hard blockers. Both dissolved and were re-verified against the current tree during a
user-approved brainstorm (Architect → superpowers:brainstorming, 2026-07-17):

1. *"PLONSN's window can't be byte-pinned — the SINE table's data is in no `.MAC` file."* **False.** The
   sine table is in `037007.XXX:48` (`SINE:`, `.RADIX 16`, origin `.=^H03800`, 65 words 0→`0x4000`,
   `QUADSN:` at `SINE+0x82` — cross-checks RBARON.MAC:397). The parked Dev grepped only `*.MAC`; the
   `.XXX` picture ROMs are ASCII assembler source too. PLONSN's rotation + window are fully byte-pinnable.
2. *"AC-R3 infeasible — 0.0 frames-in-reach at L4 for every window."* **Stale.** That sweep ran through
   the ±32 world-tube gun that rb4-17 (merged `644ad58`) has since DELETED and replaced with the
   depth-growing COLLD picture-plate gun. Never re-measured. Not a wall.

**Authority docs.** Full design + decision log: `red-baron/docs/2026-07-17-rb4-16-plonsn-recut-design.md`.
Actionable ACs: `sprint/context/context-story-rb4-16.md` (hand-authored from the brainstorm, committed
`273ca9d`, PRESERVED through setup — md5 `e4f00270…` verified unchanged, `context_file_touched: false`).
The parked banner + the old wrong-premise body are removed; provenance survives in the archived session.

**Scope (fidelity-first, user width "B").** Build the ROM's real machine: servo weaves in post-divide
SCREEN space (the PLNDEL space, not our pre-divide `displayPos`); PLONSN ported byte-pinned end to end
(window `0x1A0 × depth` via Math Box `>>16` + real trig from the sine table); RETIRE the ad-hoc ±olim
world clamp; fold in the outer-zone depth gate (:2776-2781, reads `positionZ`); ride-along rb4-6 comment
cleanups. AC-R3 is DEMOTED from goal to a reachability regression guard — its bar is the current shipped
baseline captured honestly through rb4-17's new gun, never the stale 10.8, never re-tuned; a regression
is a green-phase FINDING, not a knob. Deferred with a code-comment divergence: N.PLNZ gate (port PLONSN
UNGATED per standing user ruling) and STPLNE MAXDEL seeding.

**Setup verified on disk (not trusted from the subagent).** Session file present; story `in_progress`;
fresh branch `refactor/rb4-16-plonsn-recut` checked out in red-baron — deliberately NOT the parked
`refactor/rb4-16-plonsn-display-space-servo`, whose RED (`bdd03f1`) encodes the wrong coordinate premise;
context clean. Session opened in the setup step with no pre-advance and no duplicate history row.

**Handoff to Imperator Furiosa (TEA) — RED.** REWRITE `tests/core/plonsn.test.ts` against the corrected
spec; do NOT inherit the parked RED. Deliver the committed frames-in-reach reachability guard (AC-R3,
honest baseline through rb4-17's gun), the servo-in-screen-space assertions (find the `LDX` before any
`ZX,` operand — the parked story burned a round here; `enemy.ts:103-128` is already correct), and the
PLONSN byte-pinned-window guards. Do NOT re-introduce a HORIZN bias in this module (rb4-6, settled).
## TEA Assessment

**Tests Required:** Yes
**Reason:** n/a — a servo/coordinate-space refactor with byte-pinned constants; behaviour and the ROM contract must be pinned.

**Test Files:**
- `red-baron/tests/core/plonsn.test.ts` — REWRITTEN from scratch. It does NOT inherit the parked RED (`bdd03f1`), whose AC-2 premise put the servo on our PRE-divide `displayPos`; the re-cut's whole point is that the servo runs in POST-divide SCREEN space. Verified firsthand before writing: PLNDEL reads PLSTAT+8 (:2749/:2867, `LDX I,2` = the Y pass), and POSITH computes PLSTAT+8 AFTER the perspective divide (RBGRND.MAC:296-306).

**Tests Written:** 17 — **9 RED (failing, ready for Dev)**, **7 green guards**, **1 `it.todo`** (AC-4, blocked). Full red-baron suite after: **1111 pass, 9 fail (all mine), 1 todo — zero collateral.** RED verified by DIRECT `vitest run` (the haiku testing-runner confabulates counts — I read the real output).

**Coverage by AC:**
| AC | Tests | State | What it pins |
|----|-------|-------|--------------|
| AC-1 servo → post-divide screen | 4 | RED | observes-the-eye (mutation-proof); **depth-divide ratio-invariance** — the re-cut's signature, distinguishes post-divide from BOTH world and the parked pre-divide `displayPos`, and is robust to the unknown scale constant; pilot-relative return direction; no HORIZN bias (rb4-6 settled) |
| AC-2 PLONSN byte-pinned | 5 | 4 RED + 1 guard | window magnitude **0x1A0** (contract export `PLONSN_WINDOW`); pilot-anchored write-back (:2929); depth-anchored same-edge; depth-scale widens (:2882-2892); inside-window-left-alone (:2920, negative guard) |
| AC-3 retire ±olim clamp | 1 | RED | world \|x\| may exceed P_OLIM once PLONSN (screen-space) is the bound |
| AC-4 outer-zone depth gate | 1 | **BLOCKED** (`it.todo`) | direction INVERTED spec-vs-ROM + LSB-threshold with no scale — blocking finding, do not guess |
| AC-5 rb4-6 comment cleanups | 0 | chore bypass | doc-only prose (NaN-clamp overclaim, z-gate disclosure, name the ace-wiring regex) — can't be meaningfully asserted; Dev applies in green, Reviewer verifies |
| AC-R3 reachability guard | 6 | GREEN guard | chasing pilot → 3-arg `stepWave` → REAL `guns.collides`; per-level bar = **honestly re-measured** baseline 600/208/44/32/17 (NOT the stale 10.8); PLNLVL[5]=2 coupling |

**On AC-R3 being green, not red:** it is a REGRESSION GUARD by design (D4), so it is green now and must STAY green through Dev's green phase. The bar is the honest baseline captured 2026-07-17 through the current (rb4-17 COLLD) gun — re-measured, because the `display-space.test.ts:343` / design-doc "10.8" was measured through the ±32 gun rb4-17 deleted (see the Gap finding). A green-phase drop below the bar is a FINDING to investigate honestly (D5), never a bar to re-tune.

### Rule Coverage (TypeScript lang-review checklist)
| Rule | Test(s) / adherence | Status |
|------|---------------------|--------|
| #1 type-safety escapes (`as unknown as`) | the `beforeAll` contract casts are the DELIBERATE rb4-6 idiom, documented inline (the contract shapes must not overlap the shipped ones, so the RED signal lands at the assertion, not at compile) — the justified-with-a-comment path rule #1 allows | adhered |
| #4 `??` vs `||` | `deltaY` reads use `?? 0`, preserving a legitimate 0 (the P_IIDL[0] / positionZ lesson) — never `\|\|` | adhered |
| #8 test quality | every test asserts a real value (Phase C self-check — 0 vacuous); no `as any` in assertions; dynamic imports target `../../src/core/*`, never `dist/`; each RED fails on its intended assertion, verified in the run output | adhered |

**Rules checked:** 3 of 3 applicable TS lang-review rules (React/JSX #6, enum #3, async #7 do not apply to a pure-sim RED suite). **Self-check:** 0 vacuous tests found.

**Contracts Dev must satisfy for green:** thread the pilot's eye into `step(enemy, level, eye)` and `stepWave(enemies, level, eye)` (default to the boresight so the 2-arg callers — main.ts, engagement/display-space suites — keep working, guns.ts `EYE_ORIGIN` precedent); export `PLONSN_WINDOW = 0x1A0`; derive the depth-scale + PFROTN rotation and CITE the bytes (sine table handed over in the file header). The Math Box rotation is deliberately NOT pinned (deviation logged) — do not read a rotated-window value out of a test.

**Handoff:** To The Word Burgers (Dev) for green — AC-1/2/3/R3, ready now. **AC-4 was DESCOPED to a successor story (user ruling 2026-07-17)** — the gate direction + LSB threshold conflict is preserved in the finding and the test header for the successor; it does NOT block this green phase.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `red-baron/src/core/enemy.ts` — the machine. Servo (`windowServo`) now decides its zone from the POST-DIVIDE SCREEN position (`screenPos = (world − eye) × POSITH_SCALE / positionZ`) and returns only the delta (AC-1). `step(enemy, level, eye)` integrates the world, altitude-bands Y, then PLONSN-clamps both axes (`plonsnClamp` through the pilot), RETIRING the ±olim world fence (AC-3). Added `PLONSN_WINDOW = 0x1a0` (AC-2), `POSITH_SCALE = 0x4000` (empirical seam), `plonsnLimit` (depth-scaled, byte-pinned magnitude), `BORESIGHT` default. NaN totality preserved in `plonsnClamp`. AC-5: NaN-clamp overclaim corrected.
- `red-baron/src/core/waves.ts` — `stepWave(enemies, level, eye)` threads the eye down to each plane's servo (default boresight).
- `red-baron/src/main.ts` — threaded `toEye(flight)` into the live `stepWave` call so the eye-aware servo is ACTIVE in play (the same eye `guns.step` already consumes).
- `red-baron/src/core/guns.ts` — AC-5: Z-gate disclosure on `collides` (AC-R3 satisfies the Z gate by construction to measure X/Y reach).
- `red-baron/tests/core/enemy-machine.test.ts`, `red-baron/tests/core/enemy.test.ts` — 5 rb4-6 servo tests re-seated world→screen (deviation logged); local mirrors gained `positionZ`/`POSITH_SCALE`.
- `red-baron/tests/core/display-space.test.ts` — AC-5/TEA-Gap: corrected the stale ±32-gun baseline comment; points at AC-R3 as authoritative.
- `red-baron/tests/ace-wiring.test.ts` — AC-5: named the round-2 ace-wiring regex (`/aceCountdown\s*=\s*\w+/`, the binding-shape it indicts).

**AC coverage:** AC-1 (servo→screen) ✓, AC-2 (PLONSN byte-pinned window; rotation a logged seam) ✓, AC-3 (±olim retired) ✓, AC-5 (3 comment cleanups) ✓. AC-4 descoped to a successor (user ruling). AC-R3 (reachability guard) GREEN and above baseline at every GMLEVL: **600 / 244 / 110 / 66 / 26** frames-in-reach vs the honest bar **600 / 208 / 44 / 32 / 17** — the eye-aware servo + growing gun catch MORE than the old machine, exactly as D5 predicted.

**Tests:** 1120/1120 passing (GREEN), 1 todo (AC-4, descoped). `npm run build` (tsc + vite) clean.
**Branch:** `refactor/rb4-16-plonsn-recut` (pushed on commit below)

**Verification:** AC-R3 IS the behavioural anti-soft-lock check — it drives the REAL flight model, `guns.collides`, and the eye-threaded `stepWave` with a chasing pilot and proves planes stay reachable at every level. The round-1 soft-lock (all tests green, game dead) is exactly what this deterministic guard catches; the wiring gap it would have re-created (main.ts reading the boresight) is closed.

**Handoff:** To the Thought Police (Reviewer) for review. Two things to weigh independently: (1) `POSITH_SCALE = 2^14` is an empirically-pinned Math Box seam — verify it is ROM-plausible and holds the baseline (do not re-tune the bar; D5); (2) the PFROTN window rotation is a declared seam (eye API carries position, not bank) — verify the sine-table citation, not a rotated value.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | findings | 1 (untested degenerate positionZ) | confirmed 1 (folded into the totality finding) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundary/degenerate paths assessed inline (totality findings) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — no swallowed-error surface in a pure sim; assessed inline |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 3 (vacuous inner-window test, AC-R3 eye-overclaim, untested totality), deferred 1 (Y-weave weakness is PRE-EXISTING) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — stale-comment audit done inline (AC-5 prose, AC-R3 prose) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — type invariants covered by rule-checker #1/#2/#8 |
| 7 | reviewer-security | Yes | findings | 2 | confirmed 2 (negative-positionZ wrong-side clamp; -Infinity non-finite persist) — reproduced independently |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — noted one trivial double `toEye(flight)` call, not worth a finding |
| 9 | reviewer-rule-checker | Yes | findings | 2 | confirmed 2 (stale mock-type contracts for step/stepWave) |

**All received:** Yes (4 enabled returned, 5 disabled pre-filled)
**Total findings:** 6 confirmed (1 High, 3 Medium, 2 Low), 0 dismissed, 1 deferred (pre-existing Y-weave weakness)

### Rule Compliance (TypeScript lang-review + orchestrator CLAUDE.md)

Rule-checker enumerated 16 rules × 55 instances; I re-verified the load-bearing ones independently:

| Rule | Verdict | Evidence |
|------|---------|----------|
| #1 type-safety escapes | COMPLIANT | The four `as unknown as T` in plonsn.test.ts are the justified rb4-6 contract idiom (documented, display-space.test.ts precedent); `Object.freeze([0,0,0]) as Vec3` (enemy.ts:521, waves.ts:34) is a single necessary cast. Zero `as any`, `@ts-ignore`, non-null `!` (preflight + rule-checker grep). |
| #4 `??` vs `\|\|` | COMPLIANT | `positionZ ?? depth`, `deltaY ?? 0`, `entryFrames ?? 0` — all `??`; zero `\|\|` on a nullable (rule-checker exhaustive grep). |
| #5 module/type exports | COMPLIANT | `import type { Vec3 }` (waves.ts:4) type-only; `PLONSN_WINDOW`/`POSITH_SCALE` are runtime value exports. |
| #8 test quality | 2 VIOLATIONS | Mock-type contracts for `step` (enemy.test.ts:121) and `stepWave` (enemy-machine.test.ts:140) not updated with the new `eye` param. No dist imports, no `as any` in assertions. |
| CORE/SHELL boundary | COMPLIANT | enemy.ts/waves.ts/guns.ts add NO DOM/time/random (grep clean); main.ts wiring is shell-appropriate (`toEye(flight)` is a pure core fn). |
| ROM fidelity | COMPLIANT | `PLONSN_WINDOW=0x1a0` byte-cited (RBARON.MAC:2886-2889, re-verified against the source); `plonsnLimit` arithmetic cited (:2882-2896, re-verified); `POSITH_SCALE=0x4000` correctly declared a SEAM with derivation (SETDIV/D.NBIT). No bare magic numbers. |
| Determinism | COMPLIANT | All new fns pure; eye threaded as an explicit param, not ambient; BORESIGHT frozen. |

### Devil's Advocate

Assume this is broken. The story's whole thesis is "the servo now reads the eye," so the first attack is: *is the eye actually wired, and does the safety net prove it?* The main.ts wiring IS present (line 583) and uses the same `toEye(flight)` the gun consumes (verified — no eye divergence). But the test-analyzer's mutation exposed that AC-R3 — the test whose prose calls itself "the reachability regression guard" — barely notices when the eye is torn out: dropping it leaves three of five levels green and the other two failing by under 1%, because the harness's chasing pilot compensates for a blind servo. So a future refactor could silently un-thread the eye and AC-R3 would shrug; only AC-1 catches it decisively. A confused maintainer reading "AC-R3 guards the eye" would trust a guard that mostly doesn't.

Second attack: *what does a degenerate input do?* The module loudly claims totality ("PLONSN's own clamp sinks a NaN X"; "a non-finite limit leaves the position untouched"). Both claims are FALSE for a negative or -Infinity `positionZ` — I reproduced a plane sitting basically ON the eye being teleported to −256, and an -Infinity depth poisoning `enemy.x` forever with no backstop (Y is saved only by an unrelated altitude clamp). Today no caller feeds that, but the named AC-4 successor will read the raw PLSTAT+19 LSB into this exact field with admittedly-unresolved sign/scale. A false totality claim in a totality-disciplined module is a landmine with a date on it.

Third attack: *does a passing test mean the behavior is guarded?* No — enemy-machine.test.ts:208 is mutation-proven vacuous: delete the inner-window reversal and it stays green, because the incomplete re-seat left it in the outer zone. Its comment lies about what it tests. This is the round-1 pattern in miniature: green suite, unguarded behavior. The behavior is covered by a sibling *today*, but the broken test is exactly the kind of false confidence this project mutation-tests to prevent. Three independent angles, three real holes — none a live product bug, all real erosion of the safety net. The machine is right; the net around it has tears.

## Reviewer Assessment

**Verdict:** APPROVED (round-trip 1 re-review — round-0 REJECTED, all findings reworked and verified)

**Round-0 REJECTED, round-1 APPROVED.** The initial review rejected on verified safety-net erosion (a mutation-proven-vacuous test + false totality docstrings). Round-trip 1 (commit `e63496b`) closed all five findings, and I re-ran the four enabled subagents on the rework delta + verified independently: the inner-window re-seat is mutation-confirmed (it now FAILS when the inner reversal is deleted, was green before); the `Math.max(0, positionZ)` totality guard is security-verified TOTAL (all five degenerate depths yield finite, correctly-sided x/y, and normal positive-depth clamping is unchanged, so AC-R3 still holds); the ±olim / AC-R3 reframes are honest (mutation-confirmed to catch real regressions, not cosmetic); both mock contracts gained `eye?`. Suite **1121 green**, tsc + build clean, tree clean of mutation residue. Two non-blocking follow-ups remain (below) — neither Critical/High, the code is correct and total.

**Round-0 findings — ALL RESOLVED in round-trip 1 (re-verified):**

| Severity | Issue | Location | Resolution (round-trip 1) |
|----------|-------|----------|--------------|
| [HIGH] | **[TEST]** Mutation-proven VACUOUS: the inner-window reversal regression test stays GREEN when the "head away from centre" logic is deleted — the incomplete re-seat left it in the OUTER zone (`positionZ=P_INDP`), so it no longer tests what its comment claims. Independently reproduced (its re-seated siblings correctly fail the same mutation). A defanged regression test is the round-1 "green suite, unguarded behavior" pattern in miniature. | `tests/core/enemy-machine.test.ts:231` | Add `positionZ: identityZ()` to the `withEnemy(...)` call, matching its two siblings. |
| [MEDIUM] | **[SEC]** Totality docstrings (`enemy.ts:368`, `:504`) claim NaN/non-finite are sunk, but a NEGATIVE or `-Infinity` `positionZ` makes `plonsnLimit` negative → `plonsnClamp` teleports a plane that is basically AT the eye to the wrong side, or returns `-Infinity` that persists in `x` with no backstop (Y is saved only by the unrelated altitude clamp). Unreachable via spawn today; the AC-4 successor reads raw PLSTAT+19 into this field. Reproduced. | `enemy.ts:496-498` (`plonsnLimit`), `:506-513` (`plonsnClamp`) | `Math.max(0, positionZ)` in `plonsnLimit` (or a finiteness/sign guard in `plonsnClamp`) so the documented totality is TRUE; add a `positionZ` NaN/0/±Infinity totality test. |
| [MEDIUM] | **[TEST]** AC-R3's prose ("the reachability regression guard", D4/D5) overclaims eye-sensitivity: tearing the eye out of `stepWave` leaves GMLEVL 1/2/3 green and fails 0/4 by <1% (the chasing pilot compensates). AC-1 is the decisive eye-proof; AC-R3 is really a coarse reachability floor. | `tests/core/plonsn.test.ts:475` (+ D4/D5 prose) | Reframe AC-R3 honestly (AC-1 owns the eye-threading proof), or widen its sensitivity. |
| [MEDIUM] | **[TEST]** Stale ±olim assertions survive only by boresight-eye/world-origin coincidence; their comments assert the invariant AC-3 RETIRED. | `tests/core/enemy.test.ts:298-302`, `:355-361` | Re-seat/reframe; the bound is now PLONSN/screen (plonsn.test.ts AC-2/AC-3). |
| [LOW] | **[RULE]** Local mock-type contracts for `step`/`stepWave` not updated with the new `eye` param (their siblings were). | `tests/core/enemy.test.ts:121`, `tests/core/enemy-machine.test.ts:140` | Add the `eye?` param to both mirror signatures. |

**Deferred (not blocking, informational):** **[TEST]** the re-seated Y-weave (`enemy-machine.test.ts:313`) is insensitive to the inner reversal because the altitude clamp forces bounce-back — but the test-analyzer confirmed (via the pre-rb4-16 version) this weakness is PRE-EXISTING, preserved not introduced. Worth isolating from the altitude clamp someday; not this story's debt.

**Dispatch tags:** **[SEC]** 2 confirmed (totality, reproduced) · **[TEST]** 3 confirmed + 1 deferred (mutation-verified) · **[RULE]** 2 confirmed (contract drift). Disabled this run (assessed inline): **[EDGE]** degenerate-input paths → covered by the totality findings; **[SILENT]** no swallowed-error surface in a pure sim; **[DOC]** stale-comment audit done inline (AC-R3 + ±olim prose); **[TYPE]** covered by rule-checker #1/#2/#8; **[SIMPLE]** only a trivial double `toEye(flight)` call — not worth a finding.

**Data flow traced:** pilot yoke → `flight.step` → `toEye(flight)` → `stepWave(…, eye)` servo AND `stepGuns(…, eyeNow)` — SAME unmutated `flight`, so producer and consumer read the plane in one space (verified; no eye divergence). **ROM citations** (`PLONSN_WINDOW=0x1a0`, the `>>16 / ×0x100` window, the servo→PLSTAT+8 read) re-verified against `reference/red-baron/RBARON.MAC` firsthand. **Core purity** clean (no DOM/time/random). Tests 1120/1120, tsc + build clean.

**Re-review subagents (round-trip 1, on the rework delta):** preflight CLEAN (1121 pass, build/tree clean); test-analyzer — inner-window re-seat RESOLVED (mutation-confirmed), totality test a real non-finite guard (PARTIALLY — under-asserts its wrong-side prose, see follow-up), reframes RESOLVED, no new vacuous/`as any`/dist; security CLEAN (totality total, all 5 degenerate depths finite + correctly-sided); rule-checker — both mock contracts RESOLVED, zero new violations, +1 pre-existing follow-up.

**Non-blocking follow-ups (fast-follow, do NOT block this story — code is correct + security-verified total):**
- **[TEST]** the new `positionZ` totality test (`enemy-machine.test.ts` degenerate-positionZ) guards the non-finite regression (mutation-proven) but its `Number.isFinite` check does not verify the "wrong-side" claim in its own prose — a contrived partial revert (leave finite negatives unclamped, map ±∞/NaN→0) slips through. Strengthen it to also assert a negative-depth `x` collapses to `eye[0]`, or soften the prose. A full `Math.max` revert IS caught, so the practical risk is narrow.
- **[RULE]** `tests/core/display-space.test.ts:112,136` carry the SAME stale mock-type contracts (`step`/`stepWave` missing the `eye?` param) — pre-existing, out of this story's scope, third instance of the pattern.

**Handoff:** To The Organic Mechanic (SM) for finish-story. Round-0 REJECTED → round-trip 1 reworked + re-verified → APPROVED. The machine was always sound; the net is now honest too.

## Dev Rework Assessment — Round-Trip 1

**Rework Complete:** Yes — all 5 Reviewer findings addressed (2 blocking, 3 non-blocking).

**Files Changed (rework):**
- `red-baron/src/core/enemy.ts` — **[MED/blocking]** totality guard: `plonsnLimit` now clamps depth with `Math.max(0, positionZ)`, so a negative/−Infinity `positionZ` can no longer produce a negative `limit` (wrong-side shove) or a non-finite `x`; `plonsnLimit`/`plonsnClamp` docstrings corrected to state the guard, making the module's totality claim TRUE.
- `red-baron/tests/core/enemy-machine.test.ts` — **[HIGH/blocking]** the mutation-proven-vacuous inner-window test (`:208-219`) re-seated with `positionZ: identityZ()` (now lands in the inner zone — MUTATION-VERIFIED: it now FAILS when the inner reversal is deleted, was green before); added a `positionZ` NaN/0/±Infinity totality test (MUTATION-VERIFIED: FAILS without the `Math.max` guard); **[LOW]** `stepWave` mock contract gained the `eye?` param.
- `red-baron/tests/core/enemy.test.ts` — **[MED]** the two stale ±olim assertions (`:298-302`, `:355-361`) reframed to the honest mechanism (boresight convergence + level-scaled window width, not the retired ±olim world fence); **[LOW]** `step` mock contract gained the `eye?` param.
- `red-baron/tests/core/plonsn.test.ts` — **[MED]** AC-R3 prose reframed: disclosed it is a coarse reachability/soft-lock floor whose chasing-pilot loop compensates for a blind servo, and that AC-1 ("OBSERVES the eye") is the decisive eye-threading proof.

**Verification:** full suite **1121 passing** (the new totality test adds one), 1 todo; `npm run build` clean. Both blocking fixes MUTATION-VERIFIED with cp-backup + control runs (the vacuous test now catches the inner-reversal mutation; the totality test now catches the missing `Math.max` guard). No new spec deviation: the `Math.max(0, …)` clamp is a totality hardening on a degenerate input the ROM never feeds (its depth is always ≥ 0), not a fidelity change.

**Handoff:** Back to the Thought Police (Reviewer) — round-trip 1 fixes applied and mutation-verified.