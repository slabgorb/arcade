# Context: sw8-2 — TIE feel and fire fairness

## Story Summary

Tune the TIE virtual-machine flight model so enemies sweep and arc across the field (not zoom on Y and barrel-roll in place), reconcile incoming fireball homing and cockpit collision with the moved eye from sw8-1, and make every incoming shot dodgeable or shootable (currently homing is "always arrives"). This story absorbs backlog sw7-24 tuning work and is a "RULE → FIX" story per design §3: each divergence is opened by RULING it (bug / tuning / accepted-deviation) against the ORIGINAL ROM source BEFORE fixing. Acceptance is ultimately VISUAL — "our frame beside the cabinet frame at the same phase" (serve YOUR checkout on a spare port per the multi-checkout port trap in root CLAUDE.md; dev key `7` = space phase).

**Status:** TDD — write failing tests first, then implement.
**Points:** 5  
**Workflow:** tdd  
**Repos:** star-wars  
**Depends on:** sw8-1 (DONE, merged as star-wars PR #118 / d69e0a1)

---

## Problem Statement

Epic **sw8** is a cabinet-feel/render-fidelity audit of the sim and camera/tuning layer. Story **sw8-1** shipped the moving viewer eye (ST.UX translation); this story addresses three interrelated symptoms observed in playtesting:

### Thread 1: FLIGHT FEEL (observation #5)
The VM is authentic but **reads wrong**: TIEs "zoom on Y and barrel-roll in place" instead of sweeping/arcing across the field. The maneuver rates and play-cube clamps need tuning so TIEs visibly sweep and arc across the screen. The §7 cockpit-collision-drop already exists (`src/core/sim.ts` ~484-491) — this is FEEL-TUNING, not a missing mechanism. The Math Box aim law (`AIM_PLAYER`/`AIM_AHEAD` per model §5, §5.3) currently reuses `moveEnemy` snap-homing rather than the exact Math Box program $67 law; combined aim+roll maneuvers will not visibly SPIN until this lands.

**Symptom:** Unshot TIEs bear down and beeline the cockpit (~frame 93) before the choreography weave engages.

### Thread 2: FIRE FAIRNESS (observation #6)
The core complaint: fireballs HOME and ALWAYS ARRIVE, leaving the player no reaction window. Currently, incoming shots are undodgeable or unshootable. The ROM fire-probability rows 8-15 (currently clamped at threshold 0x80 ~50%) encode authentic late-wave cadence (rows 8-15 from `WSCPU.MAC:736` are 03,60 / 03,40 / 03,30 ≈ 62/75/81%). Every fireball that hits must have had an on-screen origin and a visible reaction window — a dodgeable or shootable arc.

**RULE (open question §6.2):** "is ROM fireball homing really 'always arrives,' or is our decay wrong?" Dig `WSCPU.MAC` / `WSGUNS.MAC`. Confirm NO shot originates outside the player's view/arc.

### Thread 3: sw8-1 CARRY-FORWARD (user-directed 2026-07-21)
sw8-1's Reviewer findings flagged three carry-forwards, now the TOP items for sw8-2:

1. **BOUND THE UNBOUNDED EYE (TOP ITEM):**  
   `spaceEye(state) = [state.frame * SPACE_EYE_SHIFT_PER_FRAME, 0, 0]` in `src/core/sim.ts` grows WITHOUT LIMIT because `state.frame` free-runs across a run (only `startRun` resets). ROM `ST.UX` is a 16-bit register that WRAPS (~±32768 raw). Because TIEs spawn origin-relative (`TBG`, tie-waves.ts:99) and the crosshair NDC clamps ±1 (gameRules.ts:61), a sliding eye pushes combat progressively off-screen and can SOFT-LOCK on longer runs (a close TIE clears the FOV edge at eye_x≈3078 ≈ frame 385 ≈ ~19s; wave 2+ severe; wave 1 fresh is fine). Fix options: per-space-phase reset / clamp / ROM 16-bit wrap.

2. **RECONCILE INCOMING FIRE WITH THE MOVED EYE:**  
   Fireball homing (`homeShots`) target + cockpit hit-test (`shipPoint(space) = COCKPIT`, origin) still center on the ORIGIN while the player's eye/gun now slide laterally (sw8-1 kept this on PURPOSE, deferring here). A drifted pilot's incoming fire homes to where the origin projects, not at his crosshair. Affects `src/core/sim.ts` (homing target + cockpit `shipPoint`).

3. **FIX THE MUZZLE-FLASH SEAT:**  
   The player muzzle-flash render (sw7-16) still seats on `shipPoint` (origin in space) while the beam now leaves from `spaceEye` — small visual gap once the eye has drifted. Affects `src/shell/render.ts`.

---

## Design Specification Reference

**Full spec:** `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md`

**Specific sections:**
- **§4 (sw8-2 bullets, lines ~104-115):** TIE flight tuning, fire fairness mechanics, bounded-eye requirement
- **§6 (open questions):** Homing strength, aim-law fidelity, fire-probability rows, scope of player-view checking

**Source documents:**
- **TIE AI model:** `star-wars/docs/tie-flight-ai-model.md` (esp. §5 Math Box aim law, §5.3 play-cube clamps, §6 fire conditions, §7 cockpit-collision-drop)
- **Cabinet reference:** `star-wars-longplay.mov` (waves 1–4, focused on TIE choreography + incoming fire arcs)
- **1983 ROM source:** `~/Projects/star-wars-1983-source-text` (WSCPU.MAC, WSGUNS.MAC, WSMAIN.MAC, SWMP.MAC)

**Rule #1 (§3): Rule before you fix.** Dig the source where a mechanism is in doubt, **rule** each divergence (bug / tuning / accepted-deviation), then fix only what was ruled a bug or tuning.

---

## Technical Approach

### Thread 1: FLIGHT FEEL — Tune the VM and Math Box Aim Law

#### 1a. Understand the Play-Cube Clamps (sw7-24 **T4a**)
- **Source dig:** `star-wars/docs/tie-flight-ai-model.md` §5.3 — play-cube bounds each axis [0x8300, 0x7CFF] (in world-relative vectors).
- **Current symptom:** TIEs barrel-roll in place (high Y-zoom) instead of sweeping across the field.
- **Tuning:** Adjust `PLAY_CUBE_*` constants (if any; may be inline or derived) to shift the weighting toward X/Z (lateral/forward) over Y (vertical).
- **Acceptance:** TIEs sweep and arc across the field during attack choreography, not plumb-line dive-bomb + retreat.

#### 1b. Land the Math Box Aim Law (sw7-24 **T4d**)
- **Source dig:** `star-wars/docs/tie-flight-ai-model.md` §5 Math Box program $67 (the exact aim law); `WSMAIN.MAC` / `SWMP.MAC` disasm.
- **Current code:** `AIM_PLAYER` / `AIM_AHEAD` (gameRules.ts) currently reuse `moveEnemy` snap-homing (full re-point each frame).
- **ROM law:** The Math Box computes an incremental *angle* change per frame, not a full re-point — combined with roll maneuvers, this produces visible SPIN behavior as the TIE tracks.
- **Fix:** Implement the exact Math Box $67 law (incremental angle adjustment) so that aim+roll maneuvers produce visible tracking spin.
- **Acceptance:** TIEs track visibly (spin) across a wave; aim behavior matches the cabinet's choreography.

### Thread 2: FIRE FAIRNESS — Audit and Tune Incoming Fire

#### 2a. RULE: Fireball Homing Mechanism (open question §6.2)
- **Source dig:** `WSCPU.MAC` / `WSGUNS.MAC` — find the homing decay law, iteration count, and target.
- **Question:** Is ROM fireball homing genuinely "always arrives," or is our homing decay/iteration wrong (e.g., too few steps, wrong epsilon)?
- **Ruling output:** Document whether homing is a bug (our decay is wrong), tuning (rates are off), or accepted-deviation (ROM is harsh, we'll soften it).
- **Forward:** Once ruled, provide a dodgeable/shootable window (e.g., slow the homing, reduce iterations, add a decay floor, or make shots visible earlier).

#### 2b. Transcribe Late-Wave Fire Cadence (sw7-24 **T5a**)
- **Source dig:** `WSCPU.MAC:736` — TGPROB fire-probability table rows 8-15 (today only rows 0-7 are ported).
- **Current:** Rows 8-15 clamp at threshold 0x80 (~50% fire rate).
- **ROM values:** Rows 8-15 are (from WSCPU.MAC) 03,60 / 03,40 / 03,30 / ... ≈ 62%, 75%, 81%, ... (rising cadence in late waves).
- **Fix:** Transcribe the exact thresholds from ROM so late-wave fire cadence is authentic.
- **Acceptance:** Waves 5+ fire at ROM cadence; the progression reads as escalating pressure.

#### 2c. Verify Player View/Arc Scope (open question §6.2, RULE)
- **Question:** "does every incoming shot originate on-screen and within the player's aim arc?"
- **Scope check:** Add a test/audit that logs incoming fireball origins and verifies they fall within the player's current FOV (crosshair clamp NDC ±1, with the moved eye).
- **Ruling:** If shots originate outside the player's view, rule whether it's an edge case (acceptable) or a bug (needs gating).
- **Acceptance:** Every incoming fireball that hits was originatable from an on-screen, aim-reachable TIE.

#### 2d. Fire Condition C_AS vs C$PV (sw7-24 **T5b**, optional/revisit)
- **Deviation:** design §6 fire cond-1 uses `C_AS` (alien-aims-at-player, our gate) vs ROM literal `C$PV` (player-can-see-us, WSCPU.MAC:624).
- **Rule:** This is a deliberate deviation (mentioned in design); revisit only if it changes the play feel or fails the dodgeable/shootable test.
- **Acceptance:** If revisited, document the ruling (bug/tuning/accepted) and the change.

### Thread 3: sw8-1 Carry-Forward — Reconcile Eye Motion

#### 3a. Bound the Unbounded Eye
- **Fix options:**
  1. **Per-space-phase reset:** `spaceEye = 0` on `enterPhase('space')`, drifts off over the phase, resets at the next phase.
  2. **Clamp:** Cap the eye at a max world-unit offset (e.g., `eye_x` ≤ 1000) so combat stays on-screen.
  3. **ROM 16-bit wrap:** `eye = (frame * SHIFT) & 0xFFFF` — emulates the hardware register wrap.
- **Acceptance:** Combat stays reachable and on-screen across multi-wave runs; no soft-lock from eye drift.

#### 3b. Reconcile Homing Target and Hit-Test
- **Current:** `homeShots` targets the origin (`shipPoint(space) = COCKPIT`); the eye has moved.
- **Fix:** When the eye drifts, the homing target and cockpit hit-test should be gated to the ORIGIN (where the ship is) OR drift WITH the eye (where the pilot is looking).
- **Ruling:** Rule whether the ship's collision hull drifts with the eye (realism) or stays at origin (simulation-separate-from-render).
- **Acceptance:** Incoming fire homes to a point consistent with where the player can be hit.

#### 3c. Fix Muzzle-Flash Render Seat
- **Current:** Player muzzle-flash (sw7-16) renders at `shipPoint` (origin); the beam leaves from `spaceEye`.
- **Fix:** Seat the muzzle-flash at the same `spaceEye` so the visual arc matches the beam origin.
- **Acceptance:** Muzzle-flash and beam-origin visually align; no gap when eye has drifted.

---

## Acceptance Criteria

### Flight Feel (Thread 1)

- [ ] **AC1 — T4a source dig (play-cube clamps):**  
  `star-wars/docs/tie-flight-ai-model.md` §5.3 and WSMAIN.MAC/WSAI.MAC disasm reviewed; play-cube bounds (X/Z vs Y weighting) understood and documented in the implementation/commit.

- [ ] **AC2 — T4d source dig (Math Box aim law):**  
  Math Box $67 aim-law (incremental angle, not snap-homing) understood from SWMP.MAC and documented.

- [ ] **AC3 — TIE sweep/arc tuning:**  
  `PLAY_CUBE_*` constants or equivalent tuned so TIEs sweep and arc across the field during attack choreography (not Y-zoom / barrel-roll in place).

- [ ] **AC4 — TIE aim behavior (Math Box law):**  
  `AIM_PLAYER` / `AIM_AHEAD` now use the exact Math Box $67 incremental-angle law (not snap-homing); TIEs spin visibly as they track across a wave.

- [ ] **AC5 — Flight feel visual QA:**  
  Serve on a spare port and watch a 2+ wave run; TIEs track smoothly with visible arc and spin, matching the cabinet longplay.

### Fire Fairness (Thread 2)

- [ ] **AC6 — RULE: Homing mechanism:**  
  Dig `WSCPU.MAC` / `WSGUNS.MAC` homing law; settle whether our fireball always-arrives is a bug (decay wrong), tuning (rates off), or accepted-deviation. Document the ruling in the implementation.

- [ ] **AC7 — T5a fire-probability rows 8-15:**  
  TGPROB rows 8-15 transcribed from `WSCPU.MAC:736`; fire cadence in waves 5+ matches ROM thresholds (62%, 75%, 81%, ...).

- [ ] **AC8 — Fire-condition C_AS vs C$PV:**  
  If revisited per T5b: dive the source (WSCPU.MAC:624 `C$PV`), rule the divergence (bug/tuning/accepted), and document.

- [ ] **AC9 — Fire dodgeability:**  
  Every incoming fireball that hits had an on-screen origin (within player's moved-eye FOV, crosshair NDC clamp ±1) and a visible reaction window (dodgeable or shootable arc).

- [ ] **AC10 — Fire fairness visual QA:**  
  Serve on a spare port and play a wave-5+ run; incoming fire is dodgeable or shootable (not all-arrives); late-wave cadence escalates.

### sw8-1 Carry-Forward (Thread 3)

- [ ] **AC11 — Bounded eye:**  
  Space-phase eye is bounded (per-phase reset / clamp / ROM wrap); combat stays on-screen and reachable across multi-wave runs. No soft-lock from unbounded eye drift.

- [ ] **AC12 — Reconciled fire homing:**  
  Fireball homing and cockpit hit-test are consistent with the moved eye (origin-anchored or eye-anchored, ruled and implemented).

- [ ] **AC13 — Muzzle-flash seat:**  
  Player muzzle-flash render seats at the same `spaceEye` as the beam origin; visual arc aligns when eye has drifted.

- [ ] **AC14 — Citations green:**  
  Any touched cited constant re-stamps its `remediated_by` line. `npm test -- citations` passes.

- [ ] **AC15 — No regressions:**  
  Full suite green (vitest baseline from sw8-1 = 1783/1783); no pre-existing tests broken.

---

## Reference Material

- **Cabinet reference:** `star-wars-longplay.mov` (6:52, waves 1–4+, focused on TIE choreography and fire arcs)
- **Design spec:** `star-wars/docs/superpowers/specs/2026-07-20-cabinet-feel-render-fidelity-design.md` (§3–6)
- **TIE AI model:** `star-wars/docs/tie-flight-ai-model.md` (§5 aim law, §5.3 play-cube, §6 fire conditions, §7 cockpit-drop)
- **1983 ROM source (pristine):** `~/Projects/star-wars-1983-source-text` (WSCPU.MAC, WSGUNS.MAC, WSMAIN.MAC, SWMP.MAC)
- **Current implementation:** 
  - Flight: `src/core/sim.ts` (moveEnemy, play-cube, cockpit-collision), `src/core/gameRules.ts` (aim gates, fire conditions)
  - Render: `src/shell/render.ts` (cameraView, muzzle-flash), `src/core/starfield.ts`
- **Math/tools:**
  - 3D math: `src/core/math3d.ts` (mat4, viewMatrix)
  - Debug: `/models.html` (contact sheet), `/scenes.html` (scene grid), `debug-overlay.ts` (axes/frustum)

---

## Scope & Constraints

- **Scope:** Flight feel tuning, fire fairness audit + fix, sw8-1 eye reconciliation (bounded eye, homing target, muzzle-flash).
  - **In-scope:** TIE maneuver rates, play-cube tuning, Math Box aim law, fire thresholds, eye wrapping, homing consistency, render seat alignment.
  - **Out-of-scope:** Core simulation rules (PRNG, state shape changes); starfield RNG substitute (keep the seeded substitute from sw8-1).
- **Core/shell purity:** `src/core` is pure/deterministic (no DOM/Date/Math.random/rAF; time via dt; RNG seeded in GameState). Eye motion may need core state ONLY if determinism requires it (sw8-1 ruled it DERIVED from state.frame).
- **Preferred fidelity source:** `~/Projects/star-wars-1983-source-text` (LF-normalized, greppable).
- **Every touched constant** re-stamps its `remediated_by` citation and keeps citations green (`npm test -- citations`).
- **Testing:** TDD — write failing tests first, then implement. Acceptance is ultimately VISUAL (serve YOUR checkout, dev key `7` = space phase, watch against longplay).
- **No regression:** Full suite green baseline from sw8-1 (1783/1783); all tests must pass.

---

## Story Dependencies

- **Depends on:** sw8-1 (The moving eye — DONE, merged)
- **Absorbs:** backlog sw7-24 (TIE flight tuning + fire fairness; RETIRED)
- **Blocks:** sw8-3 (enemy-fire readability; incoming-fire visibility depends on this story's dodgeability fix)

---

## Definition of Done

When all acceptance criteria are met:

1. **Rules documented:** AC1/AC2/AC6/AC8 rulings recorded in code/commit (source digs, reasoning, deviations if any)
2. **Tests pass:** `npm test` (vitest) + `npm test -- citations` (audit findings)
3. **Build succeeds:** `npm run build` (tsc + vite)
4. **Manual verification:** Serve on spare port; play waves 2–5+ and verify:
   - TIEs sweep/arc across the field (not Y-zoom/barrel-roll)
   - TIEs spin visibly as they track (Math Box aim law)
   - Combat stays on-screen across multi-wave runs (bounded eye)
   - Incoming fire is dodgeable or shootable (fire fairness)
   - Late-wave cadence escalates (fire thresholds)
5. **Muzzle-flash alignment:** Verify beam and muzzle-flash originate from the same point when eye has drifted
6. **No debug code:** All console logs, breakpoints, temporary test fixtures removed
7. **Code review approved**
8. **Merged to develop** via PR
