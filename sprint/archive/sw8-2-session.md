---
story_id: "sw8-2"
jira_key: "sw8-2"
epic: "sw8"
workflow: "tdd"
---
# Story sw8-2: TIE feel and fire fairness

## Story Details
- **ID:** sw8-2
- **Jira Key:** sw8-2
- **Workflow:** tdd
- **Stack Parent:** sw8-1
- **Points:** 5
- **Priority:** p1
- **Repos:** star-wars
- **Type:** bug

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-21T17:56:37Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-21T16:27:55Z | 2026-07-21T16:31:32Z | 3m 37s |
| red | 2026-07-21T16:31:32Z | 2026-07-21T17:02:36Z | 31m 4s |
| green | 2026-07-21T17:02:36Z | 2026-07-21T17:44:15Z | 41m 39s |
| review | 2026-07-21T17:44:15Z | 2026-07-21T17:56:37Z | 12m 22s |
| finish | 2026-07-21T17:56:37Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): AC13 (muzzle-flash seat) is **MOOT in the current render** — the player laser (`drawPlayerLaserToSite`, render.ts:614) draws four cyan beams from FIXED screen corners to the reticle (`crosshairNdc`), pure screen-space; the only `drawMuzzleFlash` call (render.ts:558-564) is the ENEMY-fire tell, anchored to the fireball's projected point. `spaceEye` and `surfaceShip` feed ONLY the camera (render.ts:355 / :338), never a player muzzle. So there is no player muzzle-flash seated on `shipPoint`/origin to diverge from the moved eye — the sw8-1 carry-forward #3 does not manifest. Wrote NO RED test (would invent a defect). Dev: confirm during render review; a fix is needed only if a NEW player muzzle starburst is added. Affects `src/shell/render.ts`. *Found by TEA during test design.*
- **Conflict** (non-blocking): AC7's "rows 8-15" wording is **corrected against the ROM** (gotcha: story text < primary source). WSCPU.MAC:736-748 (`~/Projects/star-wars-1983-source-text`) defines TGPROB rows **0-10 only** — `TGPROZ:` ends it at row 10. Thresholds: row8=`0x60`, row9=`0x40`, row10=`0x30`. The ROM CLAMPS the fire-index to the last defined row (WSCPU.MAC:636-644 `CMPB #TGPROZ-TGPROB/4 / IFHS / LDU #TGPROZ-4`), so indices 11-15 must reuse row 10 (`0x30`), NOT row 7's `0x80`. FIRE_MASK[8..10] is already correct (`0x03`); only FIRE_THRESHOLD[8..15] is stubbed. Affects `src/core/state.ts` (`FIRE_THRESHOLD`). *Found by TEA during test design.*
- **Question** (non-blocking): AC12 (reconcile homing/hit-test) is left to Dev's RULING. `homeShots` decays the shot toward the ORIGIN (sim.ts:1755 `scale(s.pos, decay)`) and the cockpit hit-test centres on `shipPoint`=origin (sim.ts:523), while `beamOrigin`/camera = `spaceEye` (moved). The ROM homes toward the cockpit — which IS the origin — so the FAITHFUL reconciliation is most likely to BOUND the eye (AC11) so origin ≈ view, NOT to move the hit-test (which would redden `homing-fireball.test.ts`'s origin-convergence pins). The bounded-eye suite encodes the fairness invariant (a landed hit had an aim-reachable origin) that BOTH rulings satisfy; I wrote no forcing test to avoid over-specifying. Affects `src/core/sim.ts` (`homeShots` target + cockpit `shipPoint`). *Found by TEA during test design.*
- **Improvement** (non-blocking): AC11 fix guidance — a per-space-phase **reset alone is INADEQUATE**. The soft-lock happens WITHIN one continuous space phase (finding: ~385 frames ≈ 19s); `bounded-eye-combat.test.ts` steps ~1600 game frames without a phase transition, so a fix that only resets on phase ENTRY still drifts and stays RED. Dev must bound WITHIN the phase (clamp / slower `SPACE_EYE_SHIFT_PER_FRAME` / ROM wrap+reconcile), not merely reset. Also: the exact bound is a VISUAL tuning call — my fixtures use depth-8000 combat (FOV envelope ≈ 4600); closer combat needs a tighter bound, and ACs 5/10 (beside-the-longplay QA, dev key `7`) are the real acceptance for the magnitude. Affects `src/core/sim.ts` (`spaceEye`). *Found by TEA during test design.*
- **Improvement** (non-blocking): AC3 (TIE sweep/arc) is deferred to Dev tuning + visual QA (AC5), not unit-pinned — the play-cube clamp `sub_8DE3` (model §5.3, bounds each axis `[$8300,$7CFF]`) may be missing, and the "sweeps laterally not Y-zoom" magnitude is eyeball-owned (the sw8-1 precedent for drift magnitude). Affects `src/core/sim.ts` (choreography/play-cube). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): AC5/AC10 VISUAL QA is still owed — hold our build beside `star-wars-longplay.mov` (dev key `7` = space) and rule the eye amplitude (`EYE_WRAP/2 = ±2048`, 512-frame period), the TIE aim spin, combat reachability across a multi-wave run, and the late-wave fire cadence. Tunables: `SPACE_EYE_SHIFT_PER_FRAME`(8) / `EYE_WRAP`(4096). Affects manual QA. *Found by Dev during implementation.*
- **Improvement** (non-blocking): AC4's authentic $67 aim (~4.48°/frame) makes a homing TIE curve at turn radius `v/ω ≈ 6560u` — far outside the 80u cockpit hit sphere — so it ORBITS rather than ramming. Under NO_INPUT TIEs therefore do NOT ram (the ROM's homing doesn't either; the space threat is enemy FIRE). This is a real feel shift; Reviewer/user should judge whether TIEs should still close/ram, which would need the §7 collision-drop or a choreography retune (AC3 territory, deferred). Affects `src/core/sim.ts` (`aimOrient`). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the starfield lateral drift (`stepStarfield` / `STAR_LATERAL_SPEED`) is still UN-wrapped (sw8-1 Reviewer finding) — I bounded the camera/gun eye but not the starfield, so the field slides one way while the eye now oscillates. Minor consistency follow-up. Affects `src/core/starfield.ts`. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the eye WRAP is a SAWTOOTH — it snaps the camera+world ~4095u (`EYE_WRAP`) at each wrap boundary, ~every 512 frames (~25 s). Faithful to the 16-bit register, deterministic, and firing stays consistent (camera==gun), but it may read as a visual glitch; AC5 QA should decide sawtooth vs a smooth triangle wave (a one-line change). Affects `src/core/sim.ts` (`spaceEye`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the eye amplitude `EYE_WRAP/2 = ±2048` keeps the design's ~3078 close-TIE reachable but leaves POINT-BLANK combat (depth < ~3550, e.g. the fire floor 2048) unreachable at the eye's peak. Mitigated by such a TIE being huge on-screen; AC5 QA should confirm/tighten the amplitude. Affects `src/core/sim.ts` (`EYE_WRAP`). *Found by Reviewer during code review.*
- **Question** (non-blocking): AC5/AC10 beside-the-longplay QA (dev key `7`) remains the real acceptance for the flight/fire FEEL — the orbit-not-ram behavior, the aim spin, the eye amplitude/pop, and the late-wave cadence should be judged against `star-wars-longplay.mov` before release. Affects manual QA. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **AC1/AC2/AC6/AC8 (source-dig rulings) get no bespoke RED test — knowledge deliverables ruled in GREEN**
  - Spec source: context-story-sw8-2.md AC1/AC2/AC6/AC8 + design §3 ("rule before you fix")
  - Spec text: "source dig … understood and documented in the implementation/commit"; "settle whether … bug/tuning/accepted-deviation"
  - Implementation: no vitest authored for these; they are documented rulings (the sw8-1 AC1 precedent — a source ruling is a knowledge output, not a pass/fail assert). The observable CONSEQUENCES are pinned instead (AC4 aim-law → tie-aim-law.test.ts; AC6 homing fairness → bounded-eye-combat.test.ts)
  - Rationale: pinning a source ruling as a unit test would invent the very literal the story must derive
  - Severity: minor
  - Forward impact: Dev must record the AC1/AC2/AC6/AC8 rulings in code/commit; Reviewer verifies they are documented
- **AC7 pinned as rows 8-10 + saturation of row 10, correcting the story's "rows 8-15"**
  - Spec source: context-story-sw8-2.md AC7 ("TGPROB rows 8-15 … 62%,75%,81%")
  - Spec text: "TGPROB rows 8-15 transcribed from WSCPU.MAC:736"
  - Implementation: late-wave-fire-cadence.test.ts pins FIRE_THRESHOLD[8..10] = 0x60/0x40/0x30 and [11..15] = 0x30 (saturate the last DEFINED ROM row), per the verbatim ROM (table ends at TGPROZ, row 10; index clamped WSCPU.MAC:636-644)
  - Rationale: the ROM defines only rows 0-10; "rows 8-15" over-states the table. Pinning the real rows + the ROM's own saturation is faithful; pinning a nonexistent row 11-15 would be fiction
  - Severity: minor
  - Forward impact: Dev transcribes 3 thresholds + saturates row 10; FIRE_MASK is already correct; re-stamp any cited constant (AC14)
- **AC4 pinned as the OBSERVABLE "not a snap / carries prior orientation", not the exact $67 turn rate**
  - Spec source: context-story-sw8-2.md AC4 + model §5.2c/§5.3
  - Spec text: "the exact Math Box $67 incremental-angle law … TIEs spin visibly"
  - Implementation: tie-aim-law.test.ts asserts one AIM tick does NOT fully align a reversed nose (endErr > 1 rad) and that two different starting orientations yield different results (an incremental steer depends on prior orientation; a snap collapses them) — never the ~4.48°/frame magnitude
  - Rationale: the exact rate (TIE_YAW_RATE/PITCH_RATE) is Dev's to wire; pinning it would over-couple. Pinning the mechanism (rate-limited, orientation-dependent) is faithful and sharp
  - Severity: minor
  - Forward impact: Dev implements the $67 steer (yaw on lateral error, pitch on vertical error) replacing `aimOrient`'s `lookRotation` snap; visual spin verified in QA (AC5)
- **AC9 pinned as "incoming fire stays shootable/fair", not a new dodge mechanic**
  - Spec source: context-story-sw8-2.md AC9 ("dodgeable OR shootable")
  - Spec text: "a visible reaction window (dodgeable or shootable arc)"
  - Implementation: the "shootable" half ALREADY exists (sim.ts:468-498 beamHit vs enemyShots → `fireball-destroyed`); bounded-eye-combat.test.ts pins that it STAYS viable — an incoming fireball remains aim-reachable over a long run so the player can answer it — rather than adding a new evasion mechanic (the player is on rails in space)
  - Rationale: the fairness defect is that eye-drift makes existing shootability impossible (off-screen origin), not the absence of a dodge; pinning the reachability invariant is the true acceptance
  - Severity: minor
  - Forward impact: Dev's homing/eye ruling must keep incoming fire inside the player's answerable arc; visual QA (AC10) confirms feel
- **AC11 pinned seam-agnostically (reachability + bound), not a specific bound value; AC12 has no forcing test**
  - Spec source: context-story-sw8-2.md AC11/AC12 (fix options: reset / clamp / ROM wrap)
  - Spec text: "Space-phase eye is bounded … combat stays on-screen and reachable"
  - Implementation: bounded-eye-combat.test.ts pins combat reachability over a long run + a 16-bit-range bound on the eye, agnostic to WHICH bound Dev picks; AC12's homing/hit-test anchoring is left to Dev's ruling (see Delivery Findings)
  - Rationale: the story lists three fix options — pinning one would forbid the others; the sw8-1 precedent leaves drift magnitude to eyeball tuning
  - Severity: minor
  - Forward impact: Dev picks a within-phase bound (reset-only is insufficient, per Findings); Reviewer + visual QA verify magnitude
- **AC5/AC10 (visual QA) and AC14/AC15 carried by existing gates, not new tests**
  - Spec source: context-story-sw8-2.md AC5/AC10/AC14/AC15
  - Spec text: "Serve on a spare port … watch"; "npm test -- citations passes"; "Full suite green"
  - Implementation: AC5/AC10 are explicitly visual (no vitest can assert the pixels); AC14 is guarded by the existing `citations` suite; AC15 is the 1783-green baseline (now 1785 with my 2 green guards)
  - Rationale: these are stay-green / eyeball properties, not new behaviours to drive red
  - Severity: minor
  - Forward impact: Dev runs `npm test -- citations` if a cited constant is touched; Reviewer + user do the beside-the-longplay QA (dev key `7` = space)

### Dev (implementation)
- **Bounded eye implemented as the ROM's signed register WRAP (a sawtooth), scaled 1/16 — not a reset or a flat clamp**
  - Spec source: context-story-sw8-2.md AC11 (fix options: per-phase reset / clamp / ROM wrap)
  - Spec text: "Space-phase eye is bounded (per-phase reset / clamp / ROM wrap)"
  - Implementation: `spaceEye` signed-wraps `frame*8` into `[−2048, +2048)` (`EYE_WRAP = 4096`) — the ROM's 16-bit ST.UX register (period `EYE_WRAP/SHIFT = 512` frames, matching the ROM exactly) scaled by the same 1/16 as the velocity (ROM SHIFT 128 → 8, wrap 65536 → 4096)
  - Rationale: ST.UX IS a wrapping register (a bounded sawtooth), the most faithful of the three options; the scaled amplitude keeps combat inside the FOV while the Death Star still drifts (sw8-1). A reset-only would not bound within one space phase (TEA's finding)
  - Severity: minor
  - Forward impact: amplitude/period are eyeball-tunable (AC5); the eye stays a pure fn of `state.frame`
- **AC12 ruled: the incoming-fire homing target AND the cockpit hit-test STAY at the origin; reconciliation = bounding the eye**
  - Spec source: context-story-sw8-2.md AC12
  - Spec text: "Fireball homing and cockpit hit-test are consistent with the moved eye (origin-anchored or eye-anchored, ruled and implemented)"
  - Implementation: `homeShots`→origin and the cockpit hit-test at `shipPoint`=origin are UNCHANGED; the bounded eye (origin ≈ view) is the reconciliation, so a landed hit always had an aim-reachable on-screen origin
  - Rationale: the ROM homes incoming fire toward the cockpit, which IS the origin — moving the hit-test would be less faithful and would redden `homing-fireball.test.ts`'s origin-convergence pins; bounding the eye satisfies the fairness invariant BOTH rulings had to meet
  - Severity: minor
  - Forward impact: `homing-fireball.test.ts` stays green; no collision-frame change
- **AC4 authentic aim makes homing TIEs ORBIT (not ram) → `space-world-metric.test.ts` spawn tests RE-SEATED to force turnover**
  - Spec source: sibling `tests/core/space-world-metric.test.ts` (sw4-1) vs context AC4
  - Spec text: the sibling counted spawns via NO_INPUT ram-turnover — `expect(spawns.length).toBeGreaterThanOrEqual(10)`
  - Implementation: the faithful $67 steer makes TIEs orbit at `v/ω ≈ 6560u` (>> the 80u hit sphere) → no rams under NO_INPUT → the TBG table walk stalled (seed 4041 plateaued at 8). Re-seated `collectSpawns` to clear off-spawn-plane TIEs each frame, forcing slot turnover so the table walks to the ±2048 D-group independent of flight. The spawn GEOMETRY assertions (depth/lateral/one-offset/D-group/no-foreign-pairs) are UNCHANGED
  - Rationale: authentic homing does not ram (the ROM's space threat is fire); the sibling's ram-turnover assumption was invalidated by the faithful flight (the #1001 sibling-breakage pattern, surfaced in GREEN). Re-seating preserves its geometry intent flight-independently and hides no product behaviour (the orbit is authentic and disclosed as a Delivery Finding)
  - Severity: minor
  - Forward impact: Reviewer should confirm the re-seat preserves the spawn-geometry intent (it only changes the turnover mechanism)
- **AC3 (play-cube clamp / sweep-arc tuning) NOT implemented — deferred to visual QA, per TEA's scoping**
  - Spec source: context-story-sw8-2.md AC3
  - Spec text: "`PLAY_CUBE_*` constants … tuned so TIEs sweep and arc across the field (not Y-zoom / barrel-roll in place)"
  - Implementation: not implemented; GREEN confirms AC4 (the aim law) works without it — the homing orbit is bounded by the aim geometry, not a position clamp (the ROM clamp `[$8300,$7CFF]` ≈ ±32000 is far larger than the ~6560 orbit radius, so it would not tighten the orbit)
  - Rationale: TEA scoped AC3 as tuning/visual (no unit test); the sweep-arc magnitude is eyeball-owned (AC5), and the clamp is a containment for escapes, not the orbit
  - Severity: minor
  - Forward impact: a future feel pass may add the play-cube clamp + retune the choreography if playtesting wants TIEs to close/ram (see Delivery Findings)

### Reviewer (audit)
- **TEA — AC1/AC2/AC6/AC8 rulings get no bespoke test** → ✓ ACCEPTED: source rulings are knowledge outputs (the sw8-1 AC1 precedent); Dev documented all four in the Dev Assessment and the observable consequences ARE pinned (AC4→tie-aim-law, AC9/AC11→bounded-eye). Sound.
- **TEA — AC7 pinned rows 8-10 + saturation, correcting the story's "rows 8-15"** → ✓ ACCEPTED: I re-read WSCPU.MAC:736-748 — the table ends at `TGPROZ:` (row 10) and the index clamps to the last row (:636-644); `FIRE_THRESHOLD` = `[…,0x60,0x40,0x30,0x30×5]` matches. rule-checker confirmed + citations green.
- **TEA — AC4 pinned the mechanism (not a snap / carries prior orientation), not the rate** → ✓ ACCEPTED: correct discipline; Dev then used the AUTHENTIC ~4.48°/frame rate, so the mechanism pin did not under-constrain.
- **TEA — AC9 pinned "shootable stays reachable", not a new dodge** → ✓ ACCEPTED: `beamHit` vs `enemyShots` (sim.ts:468-498) already makes fireballs shootable; the fairness invariant is reachability, which the bounded eye restores.
- **TEA — AC11 seam-agnostic bound; AC12 no forcing test** → ✓ ACCEPTED: not over-specifying was right; Dev bounded the eye and ruled AC12 (origin-anchored) — both satisfy the fairness invariant.
- **TEA — AC5/AC10/AC14/AC15 via existing gates** → ✓ ACCEPTED: citations 12/12, suite 1793/1793; visual QA correctly left to the required beside-the-longplay pass.
- **Dev — bounded eye = ROM signed register WRAP (sawtooth), scaled 1/16** → ✓ ACCEPTED: the most faithful of the three options (ST.UX IS a wrapping register); rule-checker verified the wrap math (frame 0→0, 512→0, period 512). **NOTE (flagged for AC5, non-blocking):** a sawtooth pops the camera+world ~4095u at each wrap (~every 25 s) — faithful to the register but a possible visual glitch; the QA should decide sawtooth vs a smooth triangle. Not a spec deviation, an emergent visual consequence.
- **Dev — AC12 ruled: homing target + cockpit hit-test STAY at origin; reconciliation = bound the eye** → ✓ ACCEPTED: the ROM homes to the cockpit=origin; `homing-fireball.test.ts` (origin-convergence) stays green, proving the collision frame is untouched. Faithful.
- **Dev — AC4 authentic aim ORBITS (v/ω≈6560≫80u) → space-world-metric spawn tests RE-SEATED** → ✓ ACCEPTED: I traced it — the re-seat records spawns at the plane BEFORE clearing off-plane TIEs, so the depth/lateral/D-group/no-foreign-pairs assertions stay non-vacuous and drive the real production spawn/aim path (rule-checker independently confirmed). A legitimate #1001 sibling re-seat; the orbit is authentic (the ROM's space threat is fire) and disclosed. No product behavior hidden.
- **Dev — AC3 (play-cube clamp) NOT implemented, deferred** → ✓ ACCEPTED: TEA scoped AC3 as tuning/visual (no unit test); GREEN confirms AC4 stands without it (the ±32000 clamp would not tighten the ~6560 orbit). Correctly deferred to AC5.
- No UNDOCUMENTED deviations beyond the sawtooth-pop note above: the team disclosed the orbit, the un-wrapped starfield, the amplitude tuning, and the AC13-moot / AC3-deferred scoping honestly.

## SM Assessment

**Setup complete — routing to TEA (Han Solo) for the RED phase.**

sw8-2 is a **5pt TDD "rule → fix" story** in star-wars (`depends_on: sw8-1`, merged as PR #118 / d69e0a1). The epic-YAML title is thin; the real scope spans **three threads**, all captured in `sprint/context/context-story-sw8-2.md` (232 lines, 15 ACs) and the design spec §4/§6:

1. **Flight feel** (obs #5 / sw7-24 T4a + T4d) — tune VM maneuver rates + play-cube clamp so TIEs *sweep and arc* instead of Y-zoom + barrel-roll-in-place; land the Math Box `$67` aim law so aim+roll visibly spins.
2. **Fire fairness** (obs #6 / sw7-24 T5a) — **rule** whether ROM homing really "always arrives" (open-Q §6.2), make an incoming shot **dodgeable or shootable**, confirm no shot originates off-view, transcribe deeper TGPROB rows 8–15.
3. **sw8-1 carry-forward** (user-directed 2026-07-21) — **bound the unbounded eye** (`spaceEye = frame*8` free-runs → combat soft-locks on long runs), reconcile incoming-fire homing/cockpit hit-test with the moved eye, fix the muzzle-flash seat.

**Discipline notes for the pipeline:**
- This is **rule-before-fix** (design §3). The first deliverables (homing-strength ruling, aim-law fidelity) are **documented knowledge outputs** like sw8-1's AC1 — TEA should pin the *observable mechanism* (dodge window exists, combat stays reachable across a multi-wave run, late-wave cadence non-clamped), **not** an invented ROM literal; Dev rules the source in GREEN.
- **Acceptance is ultimately VISUAL** ("our frame beside the cabinet frame"; dev key `7` = space; serve YOUR checkout on a spare port — multi-checkout port trap). Green vitest is necessary, not sufficient.
- **Guardrails:** hard core/shell purity boundary; preferred source `~/Projects/star-wars-1983-source-text` (WSCPU/WSGUNS/WSMAIN/SWMP); re-stamp `remediated_by` on any touched cited constant and keep `npm test -- citations` green; don't re-break sw7 (baseline 1783/1783).

**Setup verification:** session file present with fields set; branch `feat/sw8-2-tie-feel-fire-fairness` created off `develop`; rich context-story on disk; Jira explicitly skipped (local YAML tracking). Merge gate clear (no open star-wars PRs).

**Decision:** proceed to RED. Route to **TEA**.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Reason:** 5pt behavioural change across three threads — bounded eye, fire cadence, aim law — all observable through the pure sim / camera projection without touching canvas.

**Test Files:**
- `tests/core/bounded-eye-combat.test.ts` — AC11 (combat stays aim-reachable over a long continuous space run), AC9 (incoming fire stays shootable/fair), AC11/AC12 (the eye stays within the ROM ST.UX 16-bit range, not free-running). Seam-agnostic: uses `eyeOf`/`aimAt` (the real camera + crosshair projection), pins the bound OBSERVABLE not a specific magnitude. **+1 green anchor** (fresh frame-0 combat is reachable — must survive).
- `tests/core/late-wave-fire-cadence.test.ts` — AC7 (FIRE_THRESHOLD rows 8/9/10 = 0x60/0x40/0x30, and 11-15 saturate row 10 = 0x30), verified verbatim vs WSCPU.MAC:736-748 + the ROM index clamp (:636-644). **+1 green guard** (rows 0-7 + FIRE_MASK[8..10] unchanged).
- `tests/core/tie-aim-law.test.ts` — AC4 (an AIM tick does not snap a reversed nose fully onto target; the steer carries the prior orientation forward). Pins the rate-limited-steer mechanism, not the ~4.48°/frame magnitude.

**Tests Written:** 10 tests (8 RED + 2 green guards) covering ACs 4, 7, 9, 11, 12(fairness). **Status: RED.**

**Verified RED (testing-runner, RUN_ID sw8-2-tea-red):** `tsc --noEmit` clean → every failure is an **assertion** mismatch, not a type/import error. Full suite **1785 passed / 8 failed / 1793** — the 8 reds are 100% the three new files; **zero pre-existing failures** (baseline 1783 + my 2 green guards = 1785).

| AC | Test | Today (RED) | Why red |
|----|------|-------------|---------|
| AC11 | `a TIE dead ahead stays aim-reachable across a long run` | `expected false to be true` | eye slides to ~12,800; origin TIE clears the NDC-clamped FOV |
| AC9 | `an incoming fireball stays aim-reachable (shootable)` | `expected false to be true` | drifted eye pushes the origin-homing shot off the answerable arc |
| AC11/12 | `the space eye does not free-run past the ROM 16-bit range` | `expected 400000 to be < 33000` | `spaceEye = frame*8` is unbounded |
| AC7 | `ports the ROM threshold for rows 8, 9, 10` | `expected 128 to be 96` | FIRE_THRESHOLD[8..10] stubbed at 0x80 |
| AC7 | `saturates indices past the last defined row` | `expected 128 to be 48` | [11..15] carry 0x80 not row-10 0x30 |
| AC7 | `escalates the fire index (wave 9/11/12)` | `expected 128 to be 96` | `waveParams` reads the stubbed table |
| AC4 | `does not fully align the nose in a single AIM tick` | `expected 0 to be > 1` | `aimOrient` snaps via `lookRotation(toCockpit)` |
| AC4 | `carries the prior orientation forward` | `expected 1 to be < 0.999` | snap ignores current orient → both collapse |
| AC11 | `fresh space combat is aim-reachable` (green anchor) | **green** | wave-1 fresh (eye≈0) holds today, must survive |
| AC7 | `rows 0-7 + mask unchanged` (green guard) | **green** | early rows already ROM-correct; scope guard |

### Rule Coverage

Language: TypeScript (`.pennyfarthing/gates/lang-review/typescript.md`, 13 checks). In RED the governing check is **#8 test quality**; the rest are implementation-side (Dev's GREEN + Reviewer).

| Rule | Test(s) | Status |
|------|---------|--------|
| #8 test-quality — meaningful assertions | all 8 reds + 2 guards carry a concrete numeric/boolean `expect` (0x60/0x30/0x40, reachable true/false, <33000, >1 rad, <0.999); none vacuous | enforced |
| #8 test-quality — no `as any` in tests | none used (typed `Enemy` literals, `Vec3`/`Mat4` type-only imports; tsc green) | enforced |
| #8 test-quality — import from `src/` not `dist/` | all imports from `../../src/**`, `../support/aim`, `@arcade/shared/math3d` (published pkg) | enforced |
| #1 type-safety / #4 null (`??` not `||`) | `e.orient ?? IDENTITY` used (not `||`); no `as any`/`@ts-ignore` in the diff | enforced |

**Rules checked:** 1 of 13 lang-review checks is applicable to RED test design (#8); #1/#4/#5 are flagged for Dev's GREEN self-review (the port may add an eye clamp/wrap and a `$67` steer).
**Self-check (Phase C):** 0 vacuous tests — each red asserts a value provably wrong today (0x80 stub, endErr 0, dot 1, false, 400000) and a non-trivial threshold after; the 2 green guards assert equalities that hold today and must be preserved.

**Handoff:** To Dev (Yoda) for GREEN. Rule the source first (AC1/AC2/AC6/AC8 → document in commit), then: bound the eye WITHIN the space phase (not reset-only — see Findings), transcribe FIRE_THRESHOLD rows 8-10 + saturate row 10, and replace `aimOrient`'s snap with the $67 rate-limited steer. AC13 is MOOT (no player muzzle at `shipPoint` — see Findings); AC12 anchoring is Dev's ruling. Keep the 2 green guards green and `npm test -- citations` green.

## Dev Assessment

**Implementation Complete:** Yes

**Source rulings (rule-before-fix, design §3):**
- **AC1 (T4a play-cube):** the ROM position clamp is `sub_8DE3`, each axis `[$8300, $7CFF]` ≈ ±32000 (model §5.3). NOT implemented — it is a containment for escapes (±32000 box), not the homing orbit (~6560 radius), so it is not needed for the tested ACs; deferred to the AC5 feel pass (see Deviations/Findings).
- **AC2 (T4d $67 aim law):** ROM:8C44-8D66 transforms the player into the TIE's LOCAL frame (Math Box `$67`), then YAWS on the lateral error and PITCHES on the vertical error at the STEERING rate `word_89A8[#$14]` ≈ 4.48°/frame (§5.2c/§5.3) — a rate-limited steer, NOT a re-point. Implemented.
- **AC6 (homing "always arrives"):** `homeShots` decays the shot 7/8 per tick toward the ORIGIN cockpit (`sub_A875`, §6) — the ROM homing genuinely always arrives; that is authentic, NOT a decay bug. RULING: keep it; "fire fairness" is served by BOUNDING the eye so the origin-anchored hit always had an aim-reachable on-screen source (AC9/AC11), and by the fact that a fireball is already shootable (`beamHit`). Homing target unchanged (AC12).
- **AC8 (C_AS vs C$PV):** not revisited — the in-arc gate is unchanged; no feel problem surfaced that would justify swapping the deliberate deviation.

**Files Changed:**
- `src/core/sim.ts` — `spaceEye` now signed-wraps into `[−2048,+2048)` (`EYE_WRAP=4096`, the ROM ST.UX register scaled 1/16; AC11/AC9/AC12); `aimOrient(e, dt)` replaced the `lookRotation` snap with the rate-limited `$67` yaw/pitch steer + `clampStep` helper (AC4); the `applyManeuver` AIM call passes `dt`; imports `dot`/`transform`. Homing target + cockpit hit-test left at origin (AC12 ruling).
- `src/core/state.ts` — `FIRE_THRESHOLD` rows 8/9/10 = `0x60/0x40/0x30` and 11-15 saturate row 10 (`0x30`), per WSCPU.MAC:736-748 + the ROM index clamp; comment updated (AC7).
- `tests/core/space-world-metric.test.ts` — RE-SEAT: `collectSpawns` forces slot turnover (clears off-spawn-plane TIEs) so the TBG table walk is decoupled from the now-orbiting (non-ramming) authentic flight; geometry assertions unchanged (see Deviations).
- `docs/audit/findings/*.json` — 33 citations re-anchored (line-number drift ONLY from the comment inserts; 0 lost).

**Tests:** **1793/1793 passing (GREEN)** (`npx vitest run`); `npm run build` (tsc + vite) clean; `citations` green (in-suite). The 8 sw8-2 reds are green; the 2 green guards hold; the 3 space-world-metric failures (my aim change's blast radius) are resolved by the re-seat.
- **Blast radius verified:** `tie-vm-flight` (AIM "steers toward, not a fixed rate"), `render.moving-eye` (sw8-1), `darth-vader-enemy-rom`, `homing-fireball`, `tie-fire-cadence` all green.

**AC status:** AC1 ✅ (ruled — clamp deferred) · AC2 ✅ (ruled) · AC3 ⏸ (deferred to AC5, per TEA scope) · AC4 ✅ · AC5 ⏳ (visual QA owed) · AC6 ✅ (ruled) · AC7 ✅ · AC8 ⏸ (not revisited) · AC9 ✅ (shootable stays reachable) · AC10 ⏳ (visual QA owed) · AC11 ✅ · AC12 ✅ (ruled: origin-anchored + bounded eye) · AC13 ✅ (MOOT — verified) · AC14 ✅ (citations green) · AC15 ✅ (1793/1793).

**Wiring:** `spaceEye` feeds both `cameraView` (shell camera) and `beamOrigin` (player gun); `aimOrient` runs inside the live `applyManeuver` motion loop; `FIRE_THRESHOLD` is read by `waveParams` on every fire tick. Live on the front end.

**Branch:** feat/sw8-2-tie-feel-fire-fairness (to be pushed)

**Handoff:** To the review phase. Reviewer (Obi-Wan): the headline is that the authentic $67 aim makes TIEs ORBIT rather than ram (v/ω ≈ 6560 >> 80u hit sphere) — this forced a re-seat of `space-world-metric`'s spawn-turnover and is a real feel shift (the space threat is now purely fire); please sanity-check that ruling and do the design-§6 beside-the-longplay QA (dev key `7` = space) for the eye amplitude / aim spin / fire cadence (AC5/AC10). AC3 (play-cube clamp) and the un-wrapped starfield are disclosed follow-ups.

## Subagent Results

Only `preflight` and `rule_checker` are enabled (`pf settings get workflow.reviewer_subagents`); the other 7 are disabled via settings. I covered the disabled domains myself (adversarial pass on the 499-line src+test diff) — see the tagged observations.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 blocking (1 documented AC3-deferral TODO) | confirmed clean: 1793/1793, build clean, citations 12/12, tree clean, 0 debug code |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | covered manually ([EDGE]: sawtooth-wrap pop + ±2048 amplitude at point-blank range — both AC5-deferred) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | covered manually ([SILENT]: no try/catch, no swallowed errors — pure math diff) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | covered manually ([TEST]: no vacuous assertions; the re-seat stays non-vacuous — cross-confirmed by rule-checker) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | covered manually ([DOC]: comments verified against WSCPU.MAC / model §5.2c) |
| 6 | reviewer-type-design | No | Skipped | disabled | covered manually ([TYPE]: `Vec3`/`Mat4` sound, `?? ` on nullable orient, no stringly-typed API) |
| 7 | reviewer-security | No | Skipped | disabled | covered manually ([SEC]: no input/IO/parse surface) |
| 8 | reviewer-simplifier | No | Skipped | disabled | covered manually ([SIMPLE]: minimal — reuses `transform`/`multiply`/`rotationX/Y`; one small `clampStep` helper) |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (15 rules / 34 instances) | confirmed clean: purity (`core-purity` 14/14), determinism, wrap math, non-vacuous tests all independently verified |

**All received:** Yes (2 enabled returned clean; 7 disabled via settings, domains covered manually)
**Total findings:** 2 confirmed MEDIUM (both visual, AC5-deferred) + LOW/VERIFIED notes; 0 dismissed; **0 blocking**

## Reviewer Assessment

**Verdict:** APPROVED

**Summary:** The story's specified + tested scope is correct and fully green (1793/1793, tsc+vite clean, citations 12/12). All three fixes are ROM-grounded: the eye is bounded as the authentic 16-bit ST.UX register WRAP (period 512 frames = ROM, amplitude scaled 1/16 like the velocity), the TIE aim is the authentic `$67` rate-limited steer (~4.48°/frame, model §5.2c) replacing the snap, and `FIRE_THRESHOLD` rows 8-10 = `0x60/0x40/0x30` + saturation match WSCPU.MAC:736-748 verbatim. Purity + determinism are airtight (`core-purity` 14/14; `spaceEye`/`aimOrient` are pure fns of their inputs — rule-checker confirmed). The one substantive emergent behavior — authentic homing ORBITS rather than rams (turn radius v/ω ≈ 6560u ≫ the 80u hit sphere; the ROM is the same, its space threat is fire) — is faithful, forced a legitimate re-seat of `space-world-metric`'s spawn-turnover (which stays non-vacuous), and is fully disclosed. No Critical/High. The remaining items (sawtooth camera pop, ±2048 amplitude at point-blank, un-wrapped starfield, AC3 play-cube clamp) are all eyeball-owned/feel items the design (§3/§6) explicitly routes to the required beside-the-longplay QA (AC5/AC10) — follow-ups, not blockers.

### Rule Compliance (TypeScript lang-review + CLAUDE.md hard boundary)
- **#1 type-safety escapes:** compliant — no `as any`/`as unknown`/`@ts-ignore`/non-null-on-nullable in the diff (rule-checker: 8 instances, 0 violations). `spaceEye` returns `Vec3`, `aimOrient` returns `Mat4`, tsc green.
- **#4 null/undefined:** compliant — `e.orient ?? IDENTITY` (sim.ts:1783) uses `??`, not `||`, on the nullable orient (correct even though an object is never falsy-valid). No new `Map.get`/destructure-without-default.
- **#5 module/.js:** compliant — new `dot`/`transform` imported as VALUES (not `import type`); `moduleResolution: bundler` so no `.js` extension needed (matches every sibling import).
- **#8 test quality:** compliant — the 3 new suites use real numeric/boolean thresholds, no `as any`, import from `src/`; the `space-world-metric` re-seat records spawns from the REAL `stepGame` before trimming state, so its assertions stay non-vacuous (rule-checker cross-confirmed).
- **#12 performance:** compliant — `aimOrient`/`spaceEye` allocate small Vec3/Mat4 literals in the per-frame path, identical idiom to the existing roll/pitch/yaw code directly below; no barrel import, no JSON.stringify/sync-fs.
- **CLAUDE.md core/shell purity + determinism (the hard rule):** COMPLIANT — `spaceEye` (pure fn of `state.frame`), `aimOrient`/`clampStep` (pure fns of `(e, dt)`); no `Math.random`/`Date`/DOM/`shell` import; `render.ts` still imports FROM core (allowed direction). Determinism asserted by `core-purity.test.ts` (14/14) and `space-world-metric` AC13 (bit-identical replay), both green.

### Observations
- [VERIFIED][RULE] rule-checker returned **0 violations across 15 rules / 34 instances** — the strongest signal for a self-authored chain — and independently ran `tsc`, the full suite, `core-purity` (14/14), and citations as ground truth. Corroborates my own pass.
- [VERIFIED] `spaceEye` bound + determinism — evidence: sim.ts:1962-1968 is a pure signed-wrap of `state.frame` into `[−2048,+2048)`; `bounded-eye-combat.test.ts` proves reachability across a 1600-frame run and `|eye| < 33000` at frame 50000. Wrap math hand-checked (frame 0→0, 512→0, no off-by-one).
- [VERIFIED] `aimOrient` sign-correctness + convergence — evidence: the basis-projection steer (sim.ts:1782-1798) yaws on lateral / pitches on vertical local error, clamped to the rate; `tie-vm-flight.test.ts:54` ("AIM steers toward, not a fixed rate") is green — err shrinks over 5 frames — proving the signs REDUCE error. aim==view==resolve preserved (`darth-vader-enemy-rom` green).
- [MEDIUM][EDGE] the sawtooth wrap POPS the camera+world ~4095u at each wrap (~every 25 s) — faithful to the register but a candidate visual glitch; AC5 QA should decide sawtooth vs a smooth triangle. Non-blocking (feel is eyeball-owned §3; disclosed).
- [MEDIUM][EDGE] amplitude ±2048 keeps the design's ~3078 "close TIE" reachable but leaves POINT-BLANK combat (depth <~3550, e.g. the fire floor 2048) unreachable at the eye's peak — a TIE that close is huge on screen, but AC5 should confirm/tighten. Non-blocking (disclosed in TEA/Dev findings).
- [VERIFIED][DOC] the code comments cite `WSMAIN.MAC:2529-2531` / `WSCPU.MAC:736-748` / model §5.2c — I confirmed the TGPROB rows and the ST.UX slope in `~/Projects/star-wars-1983-source-text`; the aim-law derivation matches §5.2c.
- [LOW] pre-existing NaN-at-origin: `toCockpit(e.pos) = normalize(-pos)` is NaN at exact origin, but a TIE within the 80u hit radius is removed before reaching origin, and the OLD `lookRotation(toCockpit(...))` had the identical call — not introduced, not reachable.
- [VERIFIED][SEC][SILENT] no security surface and no swallowed errors — the diff is pure sim math + one data table; no input/IO/try-catch.

### Devil's Advocate
Argue the code is broken. The sharpest attack is the orbit: by porting the authentic homing rate I have made TIEs stop ramming — a determined *idle* player is now menaced only by fireballs, and a reviewer could call that a downgrade of the space threat, or worse a stall (TIEs circling forever at ~6560 units). But it holds up: `homeShots` still decays every fireball to the origin cockpit and the hit-test still takes a shield, so a passive pilot bleeds shields and dies — there is no soft-lock, and the ROM's own homing (radius ≫ hit sphere) does not ram either, so the orbit is faithful, not a bug. A second attack: the eye WRAP snaps the whole world sideways by 4095 units every 512 frames — surely a glitch. It is a real visual artifact, but it is exactly the 16-bit register the ROM runs, it is deterministic and consistent between camera and gun (so firing never desyncs), and the design routes its feel to the required QA; the fix if it reads badly is a one-line triangle. A third: the re-seat "moves the goalposts" on `space-world-metric` to hide the turnover regression. But the re-seat trims only the test's own copy of enemy state between real `stepGame` calls, records every spawn from the genuine production path, and leaves all geometry assertions intact and non-vacuous — the rule-checker independently confirmed this, and the change is logged as a deviation. A fourth: the amplitude leaves point-blank TIEs off-screen at the peak — true, but flagged for QA and mitigated by their on-screen size. What survives the assault: purity/determinism are airtight (two independent green gates), the aim signs are proven correct by an existing sibling test, the eye is genuinely bounded (reachability proven), and every worst case is either faithful-to-ROM, disclosed, or an eyeball-tuning item the design defers. None is a Critical/High defect in the story's specified, tested scope. The orbit and the pop are the two items a human should watch in the beside-the-longplay QA before release — loudly flagged, not buried.

**Data flow traced:** yoke `aimX/aimY` → `crosshairNdc` → `aimDirection(beamOrigin = spaceEye(state))` → `beamHit` → kill; and `state.frame` → `spaceEye` (bounded) → BOTH `cameraView` (what the pilot sees) and `beamOrigin` (where he shoots) → aim==view==resolve preserved through the bound. Safe for determinism.
**Pattern observed:** the sw7-16/sw8-1 "gun and eye are one function" invariant is preserved under the bound — `spaceEye` (sim.ts:1962) feeds `render.ts:355` and `sim.ts:289` unchanged; the aim law reuses the existing `applyManeuver` rotation idiom.
**Error handling:** N/A — pure arithmetic, no fallible paths; the one nullable (`e.orient`) is defended with `??`.

**Dispatch tags present:** [EDGE] [SILENT] [TEST] [DOC] [TYPE] [SEC] [SIMPLE] [RULE].

**Handoff:** To SM (Thrawn) for finish-story. **Before release**, run the design-§6 manual QA (dev key `7` = space, beside `star-wars-longplay.mov`) and evaluate the two flagged visual items — the sawtooth camera pop (triangle if it reads badly) and the ±2048 amplitude at point-blank — plus confirm the orbit feel. AC3 (play-cube clamp) and the un-wrapped starfield remain disclosed follow-ups for a later feel pass.