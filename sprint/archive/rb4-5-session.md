---
story_id: "rb4-5"
jira_key: "rb4-5"
epic: "rb4"
workflow: "tdd"
---
# Story rb4-5: THE CAMERA IS THE WRONG SHAPE — the arcade TRANSLATES the world; we ROTATE it

## Story Details
- **ID:** rb4-5
- **Jira Key:** rb4-5
- **Workflow:** tdd
- **Stack Parent:** none
- **Repo:** red-baron
- **Points:** 13
- **Type:** refactor

## Story Context

**Cluster C4.** Subsumes FL-013, FL-014, FL-015, FL-001, FL-004, FL-005.

**The Problem:** The ROM has NO YAW ROTATION and NO PITCH ROTATION. Turning adds the scaled PLDELX to UNIV4X (a linear universe-X), and objects are drawn at (their X - UNIV4X). Climb/dive subtracts the eye height I4YPOS from every object's Y before the single Z rotation and the divide-by-depth. Our clone rotates the camera about Y and emits a transient pitch, which is incorrect.

**Key Undecoded Macro:** The `.4WORD` macro (RBARON.MAC:15-18) MULTIPLIES EVERY OPERAND BY 4. This means POTDLY — the pitch table — is 4x what we transcribed. This is the classic way macro findings go wrong, and it went wrong in our code.

**This is a genuine rewrite, not a constant tweak.** Do not treat this as a simple coefficient fix.

## Acceptance Criteria

1. **View Pipeline is Translation-Based:** Implement world pan via a UNIV4X-equivalent (linear translation, not rotation), eye height via an I4YPOS-equivalent, then the ROM's single Z rotation and divide-by-depth. No yaw rotation matrix and no camera pitch remain.

2. **PITCH_TABLE Corrected:** Re-derive through the `.4WORD` x4 expansion: `[-128, -92, -68, -40, -20, 0, 16, 32, 52, 72, 100]`, not the raw operand list. Every pitch value must be verified against the expanded macro.

3. **DISCHK Proximity Bands Correct:** The refuter confirmed our bands are INVERTED — CLOSE is x0.375 and FAR is x1.0, on a x2 baseline. Correct the band selection. Ground mode forces the MIDDLE band (0x40 = D6 = x0.625), not the slowest.

4. **POT.X Turn Step Proportional:** The turn step must be proportional to the error (an arithmetic >>3, bounded [-16, +15]), not a constant ramp. Remove the invented MAX_TURN=40 cap.

5. **HORIZN = 0x40 = 64 Added to Projected Y:** This constant must be added to the projected Y of EVERY object (POSITH). The horizon sits at the finite depth HORZ = 0x1000 = 4096 and moves with altitude.

6. **Dependency Respected:** This story depends on rb4-1 (THE RADIX SWEEP) because its constants are hex. Do not land this story first.

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T07:53:39Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-14T21:53:08+00:00 | - | - |
| red | 2026-07-14T21:53:08+00:00 | 2026-07-14T22:47:12Z | 54m 4s |
| green | 2026-07-14T22:47:12Z | 2026-07-14T23:22:40Z | 35m 28s |
| review | 2026-07-14T23:22:40Z | 2026-07-14T23:37:48Z | 15m 8s |
| finish | 2026-07-14T23:37:48Z | 2026-07-15T00:00:00Z | (blocked at finish preflight — integration conflict) |
| green | 2026-07-15T00:00:00Z | 2026-07-15T07:37:34Z | 7h 37m |
| review | 2026-07-15T07:37:34Z | 2026-07-15T07:53:39Z | 16m 5s |
| finish | 2026-07-15T07:53:39Z | - | - |

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): HORIZN ($40=64) is defined in `topology.ts` but APPLIED nowhere — the projection substrate never adds it. AC5's "constant Y offset on every object" requires the divide-by-depth path to add HORIZN after the divide. Affects `src/core/scene.ts` (the projection substrate — the divide currently lives in `projectSegment`; HORIZN must be added post-divide, in ROM screen-Y units → NDC).
  *Found by TEA during test design.*
- **Gap** (non-blocking): the current camera pipeline copied battlezone's perspective-matrix + `rotationY(yaw)` MVP — correct for battlezone (a real 3-D tank yaw), WRONG for Red Baron (a flat UNIV4X world pan). The rewrite must replace the yaw/pitch rotations with eye translations while keeping only the bank (rotationZ). Affects `src/core/camera.ts`, `src/core/flight.ts` (toAttitude/toEye), `src/core/horizon.ts`, and callers in `src/core/landscape.ts` + `src/main.ts`.
  *Found by TEA during test design.*
- **Question** (non-blocking): the AC1/AC5 tests assume the flight→camera→scene bridge (`toAttitude`/`toEye`/`flightView`/`horizonSegments`/`projectSegment`) survives as the projection seam. If Dev restructures the substrate into ROM screen-units (a single translate→roll→divide→HORIZN projector) instead of the current NDC matrix pipeline, several tests need re-seating to the new entry point — coordinate with TEA at the verify phase. Affects `src/core/scene.ts`, `src/core/camera.ts`.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): non-rb4-5 constants in `flight/ground-mode/enemy.test.ts` still cite the decoy build `R2BRON.MAC` (GRMODE, P_OLIM, P_INDP, ACCEL, I4YPOS spawn). These are value-safe (R2BRON is byte-identical to RBARON except 7 checksum bytes; only R2GRND is poisoned), so left in scope for rb4-2's doc retraction — but a future sweep should rename them to `RBARON.MAC`. Affects `tests/core/{flight,ground-mode,enemy}.test.ts`.
  *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the code fix remediated 17 audit findings (FL-001/002/003/005/006/011/013/014/015/017, CD-007/016, RD-003/010/012/014/015). I re-anchored their `ours` citations to the fixed lines to keep `tests/audit/citations.test.ts` green, but the audit schema has NO remediation field — their `class`/`recommendation: fix` now describe a divergence that no longer exists. Affects `docs/audit/findings/*.json` + `tools/audit/check-citations.mjs` (needs a `remediated_by`/`status` model so a fixed finding reads as resolved, not as a live fix). Track for rb4-2 / the epic.
  *Found by Dev during implementation.*
- **Question** (non-blocking): the absolute VISUAL calibration — the pan direction/scale (`PAN_SCALE`), the HORIZN screen position (`ROM_SCREEN_HALF`), and the bank direction — is pinned only behaviourally (the tests assert sign/monotonicity/depth-invariance, not pixels). The epic closes on a playtest gate; a live pass should confirm these read right. Affects `src/core/flight.ts`, `src/core/scene.ts`.
  *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): stale doc comments in `src/core/flight.ts` still describe the OLD, corrected-away model — the module header (`:23-26`) says DISCHK is "close ×1.0 / mid ×0.625 / far ×0.375 … agility rises when something is near", the EXACT inversion AC3 fixed (the const is now near 0.375 / far 1.0, "sluggish when near"); the header (`:16-17`) and `pitchDelta` docstring (`:159-161`) still say the pre-×4 pitch values (dive -32 / climb +25) that AC2 replaced with -128/+100; and `heading` is called "the camera's yaw" (`:22`, `:141`) when AC1 removed all yaw. In a fidelity codebase these are a regression hazard (a future audit could "re-correct" a const back to match the comment). Affects `src/core/flight.ts` (bring the header/docstrings in line with the corrected constants). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): 5 unnecessary `as unknown as T` double-casts in test scaffolding — `tests/core/camera.test.ts:48`, `horizon.test.ts:59`, `flight.test.ts:126`, `camera-shape.test.ts:99` & `:138`. Matches the TypeScript review checklist rule #1 ("double-cast bypass, almost always wrong") and #8 (the local `Attitude` interfaces in flight.test.ts:88-92 and camera-shape.test.ts:51-55 declare `pitch`/`yaw` REQUIRED while the real `toAttitude` returns `{roll}` only — a mock/impl mismatch masked by the cast). Mechanically verified unnecessary (making pitch/yaw optional to match the sibling camera.test.ts / horizon.test.ts, and `const out: Mat4 = new Array(16).fill(0)`, both compile clean; 702/702 stay green). Test-only, no behavioural impact — held Low, not dismissed. Affects the four test files (single-cast + optional pitch/yaw). *Found by Reviewer during code review.*

### Dev (rework — integration)

- **Gap** (blocking → now RESOLVED in-branch): rb4-5's 17 code remediations are NOT recorded under develop's new frozen-evidence audit model (rb4-2 #25). The model pins `ours` citations at the audit commit (6038a07) and has NO in-file `remediated_by`/`status` field, so a finding whose divergence rb4-5 actually FIXED still reads as a live `recommendation: fix`. I reverted the citation re-anchoring (the old model's mechanism, now forbidden) to get green; the remediations are consequently untracked. Affects `docs/audit/findings/*.json` + `tools/audit/check-citations.mjs` + `tests/audit/citation-evidence.test.ts` (needs a remediation model so a fixed finding reads as resolved, not laundered). This is the exact schema gap the original Dev green flagged, now DUE that rb4-2 shipped its frozen model — track for the rb4 audit-curation follow-up. *Found by Dev during integration rework.*
- **Improvement** (non-blocking): the HORIZN scope correction (universal → POSITH/world path only) means motion objects now render at pure-projection Y, matching develop's pre-rb4-5 baseline; world objects (horizon, mountains) are visually IDENTICAL to the shipped rb4-5. The absolute HORIZN screen height + pan feel remain playtest-gated (rb4 epic close), as the original Dev/Reviewer findings already noted. Affects `src/core/scene.ts` (projectWorldSegment). *Found by Dev during integration rework.*

### Reviewer (code review — rework re-review)

- **Improvement** (non-blocking): `projectWorldSegment`'s behind-eye null-passthrough (`scene.ts:120`) is correctly implemented but has NO direct test — the only null-cull test in `scene.test.ts` drives the bare `projectSegment`, and `landscape.test.ts`'s totality check never places a mountain behind the eye. The path is near-unreachable in gameplay (horizon@4096, mountains@≥192 sit ahead of NEAR=1) and the impl is a 2-line delegation, so it is Low — but a future edit that lifted before the null-check would go uncaught. Affects `tests/core/scene.test.ts` (add a `projectWorldSegment` behind-eye → null case). *Found by Reviewer during rework re-review.*
- **Improvement** (non-blocking): PR #26's description is stale — it still says "702/702 tests" and lists the pre-rework follow-ups, from the first approval. Affects the GitHub PR body (SM should refresh it to 914/914 + the rework summary before merge). *Found by Reviewer during rework re-review.*
- **Note** (non-blocking): the two Low findings from the first review PERSIST (out of rework scope) — 5 `as unknown as` double-casts in test scaffolding, and the stale `flight.ts` header comments (rb4-1's sweep corrected the citation on :16 but not the pre-×4 values it points to). Both remain non-blocking fast-follow debt. Affects `tests/core/{camera,horizon,flight,camera-shape}.test.ts`, `src/core/flight.ts`. *Found by Reviewer, carried forward.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **AC1/AC5 pinned as scale-agnostic BEHAVIOURAL invariants, not exact projection pixels**
  - Spec source: context-story-rb4-5.md, AC-1 + AC-5 (Technical Approach is empty — "to be refined by TEA/Dev")
  - Spec text: "world pan via a UNIV4X-equivalent … the ROM's single Z rotation and divide-by-depth"; "HORIZN=$40=64 is added to the projected Y of EVERY object"
  - Implementation: the exact ROM→canvas coordinate scale is a Dev seam (the ROM works in VG screen units; the mapping to our NDC is unresolved). So I pin the SHAPE that separates a translation from a rotation — depth-invariance under pan/climb, a constant (not depth-scaled) HORIZN Y-offset, a finite altitude-tracking horizon — rather than exact NDC values.
  - Rationale: a fabricated pixel spec (with an invented scale) would send Dev chasing a wrong target; behavioural invariants pass for ANY faithful pipeline and fail for the current rotation one.
  - Severity: minor
  - Forward impact: Dev owns the coordinate/unit convention (ROM units vs NDC) and the exact HORIZN placement.

- **Camera narrowed to a roll-only rotation; pan+altitude routed through the EYE (translation)**
  - Spec source: context-story-rb4-5.md, AC-1
  - Spec text: "No yaw rotation matrix and no camera pitch remain."
  - Implementation: camera.test.ts asserts a non-zero pitch/yaw produces NO rotation (only roll rotates); flight.test.ts asserts toAttitude yields yaw=0/pitch=0 and toEye carries the heading as a LATERAL eye pan. The seam assumed is the existing flight→camera bridge (toAttitude / toEye / flightView).
  - Rationale: the ROM's single Z rotation is the bank; turning is UNIV4X (a linear pan) and climb/dive is I4YPOS (eye height) — both translations, not rotations.
  - Severity: minor
  - Forward impact: if Dev restructures the bridge (e.g. flightView takes the flight state directly), TEA re-seats these tests to the new seam.

- **horizonSegments signature changed to be ALTITUDE-aware**
  - Spec source: context-story-rb4-5.md, AC-5
  - Spec text: "the horizon sits at the finite depth HORZ = 0x1000 = 4096 and moves with altitude"
  - Implementation: pinned a new `horizonSegments({ roll, altitude }, aspect)` contract (the current `(attitude, aspect)` cannot move with altitude — it has no altitude input and sits at HORIZON_DISTANCE=10000 with EYE_AT_ORIGIN).
  - Rationale: AC5 is unsatisfiable without altitude reaching the horizon.
  - Severity: minor
  - Forward impact: Dev updates horizonSegments + its main.ts caller.

- **Re-seated sibling tests that encoded the OLD (wrong) constants/model — TEA owns test maintenance**
  - Spec source: context-story-rb4-5.md, AC-2 / AC-3 / AC-1
  - Spec text: the ×4 PITCH_TABLE, the inverted DISCHK bands, the middle-band ground mode, the translation camera
  - Implementation: corrected direct-conflict assertions in flight.test.ts (PITCH_TABLE ×4, DISCHK bands, POT.X), ground-mode.test.ts (GROUND_CONTROL_BAND 'far'→'mid'), enemy.test.ts (DISCHK direction), and rewrote camera.test.ts + horizon.test.ts from the rotation model to the translation model. All would have flipped RED the moment Dev implemented the fix, and Dev cannot move goalposts.
  - Rationale: a contract-change RED breaks siblings staged on the old contract; TEA re-seats them so Dev is not caught between the new AC and an old sibling test.
  - Severity: minor
  - Forward impact: none — the re-seats preserve each test's original intent under the corrected constants.

- **POT.X target scale left as a Dev seam; only the STEP LAW is pinned**
  - Spec source: context-story-rb4-5.md, AC-4
  - Spec text: "the invented MAX_TURN=40 cap is gone … proportional to the error (an arithmetic >>3, bounded [-16,+15])"
  - Implementation: pinned the law via input.turn=0 (target=0, so error = −turnRate, no pot→ROM-unit scale involved): step = arithShr(error,3), ±1 floor, hysteresis <3, bounds [-16,+15]. The full-deflection equilibrium scale is Dev's, constrained only by the existing "a full hard turn saturates the 0x100 bank clamp" and returning-ace HARD_TURN=0x1C guards.
  - Rationale: the ROM's POTVAL→PTRNGE mapping to our normalized yoke is not byte-pinned; testing the LAW (not a magic settled value) avoids fabricating a scale.
  - Severity: minor
  - Forward impact: Dev picks the yoke→turn-rate scale within those guards (≈ full deflection 34–56).

### Dev (implementation)

- **POT_RANGE = 40 chosen as the pot's full-deflection turn-rate (replacing MAX_TURN)**
  - Spec source: context-story-rb4-5.md, AC-4
  - Spec text: "the invented MAX_TURN=40 cap is gone"
  - Implementation: kept 40, but as the pot's turn-rate RANGE at full yoke (the target the proportional POT.X eases toward), not a cap on where PLDELX may sit. Full-yoke settles ~38 (≥ HARD_TURN 0x1C=28 and ×8 saturates the 0x100 bank clamp); half-yoke ~20 (< 28).
  - Rationale: the POTVAL→our-normalized-yoke scale is not byte-pinned; 40 satisfies the bank-clamp and HARD_TURN guards TEA left.
  - Severity: minor
  - Forward impact: none — a pot-range constant, tunable in [34,56).

- **PAN_SCALE = 1 (heading → eye-X, UNIV4X 1:1 world units)**
  - Spec source: context-story-rb4-5.md, AC-1
  - Spec text: "world pan via a UNIV4X-equivalent (linear translation)"
  - Implementation: the accumulated heading maps 1:1 to the eye's world-X offset. Pan magnitude and direction are not byte-pinned.
  - Rationale: the ROM adds scaled PLDELX straight into UNIV4X and draws at (X−UNIV4X); heading IS UNIV4X, so eye-X = heading.
  - Severity: minor
  - Forward impact: the pan feel/direction is a playtest-gated seam.

- **HORIZN mapped to NDC via ROM_SCREEN_HALF = 512 (HORIZN_NDC = 64/512 = 0.125)**
  - Spec source: context-story-rb4-5.md, AC-5
  - Spec text: "HORIZN = 0x40 = 64 is added to the projected Y of EVERY object"
  - Implementation: HORIZN is added post-divide in `projectSegment`; the ROM-screen-unit → NDC scale (512) is a Dev seam, chosen so the level horizon sits a short lift above centre.
  - Rationale: the ROM VG-unit → our-NDC scale is not byte-pinned; only the constant-offset PROPERTY is pinned.
  - Severity: minor
  - Forward impact: the horizon's exact screen height is playtest-gated.

- **Motion objects (enemies / blimp / wrecks / shells) draw at the origin eye (bank only), NOT the world pan-eye**
  - Spec source: context-story-rb4-5.md, AC-1 (POSITH is the WORLD-object path)
  - Spec text: "the ROM's single Z rotation and divide-by-depth … objects are drawn at (their X − UNIV4X)"
  - Implementation: only the mountains + horizon (world-anchored PFOBJ, the POSITH path) take the UNIV4X/I4YPOS pan-eye; enemies/blimp/wrecks/shells are camera-relative screen-window motion objects and take only the bank, so a turn/climb does not drift them off.
  - Rationale: UNIV4X/I4YPOS translate the WORLD; motion objects are already in view-relative coords (their positions never enter POSITH).
  - Severity: minor
  - Forward impact: motion-object screen positioning is unchanged from before the rewrite.

- **Re-anchored 40 audit `ours` citations; re-seated 2 sibling tests**
  - Spec source: the tests TEA wrote + `tests/audit/citations.test.ts` (epic guardrail — must stay green)
  - Spec text: "re-open every line a finding cites and compare byte-for-byte"
  - Implementation: the code change shifted / rewrote cited lines; re-anchored every broken `ours` citation to its current line (17 to the remediated fix line). Re-seated `scene.test.ts` (on-axis Y now carries the constant HORIZN offset) and `flight.test.ts` deadband (read at the commanded target, since the proportional equilibrium settles hyst counts short of it).
  - Rationale: byte-for-byte citations and the constant-ramp deadband assumption both broke on the legitimate fix; keeping them green preserves each test's intent.
  - Severity: minor
  - Forward impact: none.

### Reviewer (audit)

Every logged deviation stamped. All ACCEPTED — none reverse a spec requirement; each is a disclosed
seam (scale/unit/pan/HORIZN-position) left un-byte-pinned by the ROM, or a faithful re-shaping the ACs
demand. The ROM-pinned *laws* (the ×4 table, the inverted bands, the middle-band ground mode, the
post-divide HORIZN offset, the >>3 proportional step) are all verified against the citable quarry.

**TEA deviations:**
- **AC1/AC5 pinned as behavioural invariants, not pixels** → ✓ ACCEPTED: depth-invariance under pan/climb + a depth-independent HORIZN offset are precisely the discriminators that separate a translation from a rotation; a fabricated pixel spec would have misdirected Dev. Sound.
- **Camera narrowed to roll-only; pan+altitude via the eye** → ✓ ACCEPTED: ROM-faithful (RBARON.MAC:3196-3262 — single Z bank, UNIV4X pan, I4YPOS eye height); verified in camera.ts/flight.ts.
- **horizonSegments made altitude-aware** → ✓ ACCEPTED: AC5 ("moves with altitude") is unsatisfiable without an altitude input; the new `HorizonView` contract is the minimal change.
- **Re-seated sibling tests to the corrected constants** → ✓ ACCEPTED: preserves each test's intent under the ROM-verified values; a contract-change RED must re-seat siblings or Dev is caught between the new AC and an old test.
- **POT.X step LAW pinned, target scale a Dev seam** → ✓ ACCEPTED: the LSR×3+sign-extend law is byte-pinned; the POTVAL→normalized-yoke scale is not, so testing the law (not a magic value) is correct.

**Dev deviations:**
- **POT_RANGE = 40 (replacing MAX_TURN)** → ✓ ACCEPTED: reused as the pot's full-yoke turn-rate RANGE, not the retired cap; sits inside TEA's HARD_TURN 0x1C + bank-clamp guards; pot-range not byte-pinned.
- **PAN_SCALE = 1** → ✓ ACCEPTED (agrees with author reasoning: heading IS UNIV4X, drawn at X−UNIV4X). Forward note: `heading` accumulates unbounded where the ROM's UNIV4X wraps — a playtest/ground-wave seam (see Observation 11), not a blocker.
- **HORIZN_NDC via ROM_SCREEN_HALF = 512** → ✓ ACCEPTED: the constant-offset PROPERTY is ROM-pinned (ADC I,HORIZN after the divide); the VG-unit→NDC scale is honestly disclosed as un-pinned.
- **Motion objects at the origin eye (bank only), not the pan-eye** → ✓ ACCEPTED: enemies/blimp/wrecks/shells are view-relative window objects; not panning them is correct. (They DO still receive the HORIZN_NDC offset via projectSegment — which satisfies AC5's literal "EVERY object" and keeps tracer↔enemy alignment; see Observation 12.)
- **Re-anchored 40 audit citations + 2 sibling re-seats** → ✓ ACCEPTED: keeps the citations.test / scene.test / flight-deadband guardrails green on the legitimate fix; the "fixed finding still class'd as a live divergence" schema gap is already logged (Dev finding) and deferred to rb4-2.

**Undocumented divergence (Reviewer-spotted):** the `flight.ts` module-header + docstring comments were NOT
updated to the corrected model — they still teach the pre-×4 pitch values, the inverted DISCHK bands, and
call `heading` "yaw". Spec/const say the corrected values; the comments say the old ones. Severity: Low
(doc only). Logged as a Delivery Finding (Reviewer, Improvement, non-blocking).

### Dev (rework — integration with develop: rb4-1 radix sweep + rb4-2 frozen-evidence)

Merging current `origin/develop` (which landed rb4-5's own dependency rb4-1 + rb4-2 mid-flight) surfaced 7
failures the isolated 702/702 could not see. Root-caused each against the ROM before fixing (systematic-debugging).

- **HORIZN narrowed from the UNIVERSAL projectSegment to the WORLD/playfield path (new `projectWorldSegment`)**
  - Spec source: context-story-rb4-5.md, AC-5
  - Spec text: "HORIZN = 0x40 = 64 … added to the projected Y of EVERY object (POSITH)"
  - Implementation: the shipped rb4-5 added `HORIZN_NDC` inside the shared `projectSegment`, so EVERY drawn
    object (planes, blimp, wrecks, tracers included) got the lift. Rework splits it: `projectSegment` is now the
    PURE divide (motion objects), and a new `projectWorldSegment` = divide + HORIZN lift is taken ONLY by the
    world/playfield objects (horizon.ts, landscape.ts mountains).
  - Rationale: the ROM adds HORIZN in exactly one place — POSITH/POSITP (RBGRND.MAC:269-322, `ADC I,HORIZN`
    :303), the PLAYFIELD path that also subtracts I4YPOS and pans by UNIV4X. The motion-object path, PLANE
    PROJECT (RBGRND.MAC:359), adds NO HORIZN (verified: no `HORIZN`/`POSITH` in 359-438). AC5's "(POSITH)"
    parenthetical SCOPES "every object" to the playfield path — the universal application over-read it. This
    also (a) restores rb4-1's shipped `screen.ts` "ruler = pixel" invariant (screen-scale.test.ts, untouched)
    and (b) resolves the Reviewer's own Observation 12 (HORIZN on motion objects, flagged playtest-gated).
  - Severity: moderate — reverses the approved HORIZN placement, toward greater fidelity. Net on-screen for
    world objects is IDENTICAL; motion objects now sit at pure-projection Y (matching develop's baseline).
  - Forward impact: any future world-projected geometry (terrain, ground targets) must use
    `projectWorldSegment`; motion geometry uses `projectSegment`. Render feel still playtest-gated (rb4 close).

- **Audit findings citations REVERTED to develop's frozen values — no re-anchoring (rb4-2 model)**
  - Spec source: `tests/audit/citation-evidence.test.ts` (develop / rb4-2 #25), AUDIT_COMMIT 6038a07
  - Spec text: "Re-pointing it at a friendlier line launders a guess into evidence. Fix the CODE, not the finding."
  - Implementation: the shipped rb4-5 re-anchored 40 `ours` citations to its moved lines (old model, where
    `citations.test.ts` checked `ours` vs CURRENT code). rb4-2 replaced that with a FROZEN-evidence model: `ours`
    is pinned at the audit commit and re-anchoring is the exact "laundering" the new guardrail detects. Reverted
    `docs/audit/findings/*.json` to develop's frozen version (`git checkout origin/develop -- …`).
  - Rationale: under the merged model the re-anchoring is forbidden and fails 4 tests; the frozen citations are
    authoritative and pass by construction.
  - Severity: minor — aligns with the now-shipped model.
  - Forward impact: rb4-5's 17 code remediations are NOT recorded in-file (the frozen model has no
    `remediated_by`/`status` field — confirmed absent on develop). This is the audit-schema gap Dev flagged in
    the original green, now DUE. Logged as a Delivery Finding.

- **Re-seated rb4-5's OWN HORIZN tests to the world path (intent preserved)**
  - Spec source: the tests TEA/Dev wrote for AC5
  - Spec text: "HORIZN is a constant, depth-independent screen-Y offset"
  - Implementation: `scene.test.ts` — split the single "projectSegment lifts on-axis" test into TWO: bare
    `projectSegment` lands on raw centre (no lift), and `projectWorldSegment` carries the constant depth-
    independent lift. `camera-shape.test.ts` AC5a — its `project()` helper now goes through `projectWorldSegment`.
  - Rationale: the assertions' INTENT (HORIZN is a constant offset on the objects that get it) is unchanged; only
    the seam moved to the ROM-correct path. Adding the bare-projectSegment complement PINS the split explicitly.
  - Severity: minor. Forward impact: none — same intent, correct path.

- **Re-seated 2 develop tests for the projector split; classified POT_RANGE**
  - Spec source: `tests/landscape-wiring.test.ts`, `tests/shell/cockpit-draw-path.test.ts`, `tests/core/depth-scale.test.ts` (all develop/rb4-1)
  - Spec text: landscape "projects through scene.*"; cockpit "every pixel stroked came out of a core projection";
    depth-scale "every candidate the sweep finds has been CLASSIFIED"
  - Implementation: landscape-wiring regex `projectSegment` → `project(World)?Segment` (still the scene
    substrate). cockpit-draw-path: the recording mock now wraps BOTH `projectSegment` and `projectWorldSegment`
    into the same ordered roster (the mock's internal call bound to the real module-scope `projectSegment`, so
    world strokes were reaching the glass unrecorded → INVARIANT 4 red). depth-scale: `POT_RANGE` added to
    `NOT_A_DEPTH` (it trips `RANGE` but is an angular turn-RATE, not a distance) per the test's own instruction.
  - Rationale: each test's intent is preserved — the wiring test still pins substrate reuse, INVARIANT 4 still
    pins canvas == core projection (now over both gates), the sweep still forces every depth-named constant to be
    classified.
  - Severity: minor. Forward impact: cockpit-draw-path now instruments two gates; a future third projector must
    be added to its mock too.

### Reviewer (audit — rework re-review, 2026-07-15)

All four rework deviations stamped. All ACCEPTED — each is grounded in the ROM or in the now-shipped develop model,
and each is verified in code.

- **HORIZN narrowed to the POSITH/world path (projectWorldSegment)** → ✓ ACCEPTED: independently confirmed against
  the ROM (POSITH/POSITP add `ADC I,HORIZN`, RBGRND.MAC:303; the PLANE PROJECT path :359 adds none). The caller
  split is exact (only horizon.ts + landscape.ts take the lift; 7 motion/debug call sites stay bare). Reverses the
  earlier approved placement toward GREATER fidelity, restores rb4-1's screen.ts invariant, and closes my own
  Observation 12. Sound.
- **Audit citations reverted to develop's frozen values (no re-anchoring)** → ✓ ACCEPTED: correct under rb4-2's
  frozen-evidence model — re-anchoring is the exact "laundering" citation-evidence.test.ts detects. Findings match
  develop byte-for-byte; both audit suites green. The untracked-remediation consequence is a real schema gap,
  logged as a Delivery Finding (Gap, deferred) — not a reason to reject.
- **Re-seated rb4-5's own HORIZN tests to the world path** → ✓ ACCEPTED: intent preserved (HORIZN is a constant,
  depth-independent offset); the added bare-projectSegment complement test PINS the split explicitly. Non-vacuous
  (verified: depth-independence + non-zero magnitude assertions).
- **Re-seated 2 develop tests + classified POT_RANGE** → ✓ ACCEPTED: landscape-wiring regex loosened but its other
  guards stay strict; cockpit-draw-path INVARIANT 4 now records BOTH gates (a genuine strengthening — world-object
  HORIZN pixels are now verified); POT_RANGE correctly classified NOT_A_DEPTH (angular rate, not a Z distance).

**Reviewer-spotted (rework):** `projectWorldSegment`'s behind-eye null-passthrough is correct but untested —
logged as a Delivery Finding (Improvement, non-blocking). Not a deviation from spec; a test-coverage gap.

## TEA Assessment

**Tests Required:** Yes
**Reason:** A genuine ROM-fidelity rewrite of the view pipeline (13 pts, refactor) — behaviour and constants both change; not a chore.

**Test Files:**
- `tests/core/camera-shape.test.ts` — NEW authoritative contract for AC1 (translation pipeline: turn/climb are depth-invariant, roll banks) + AC5 (HORIZN constant offset; horizon at finite HORZ moving with altitude). 10 tests, 6 RED.
- `tests/core/camera.test.ts` — REWRITTEN rb1-3 camera to the translation+roll model; pins "no yaw/pitch rotation remains". 12 tests, 3 RED.
- `tests/core/horizon.test.ts` — REWRITTEN rb1-3 horizon to finite-HORZ + altitude-tracking (was "at infinity"). 7 tests, 2 RED.
- `tests/core/flight.test.ts` — re-seated AC2 (PITCH_TABLE ×4), AC3 (DISCHK bands), AC4 (new POT.X proportional block), AC1 (bridge → translation). 49 tests, 15 RED.
- `tests/core/ground-mode.test.ts` — re-seated AC3 (GROUND_CONTROL_BAND 'far'→'mid'). 20 tests, 3 RED.
- `tests/core/enemy.test.ts` — re-seated AC3 (DISCHK direction: near SLOWS the yoke). 38 tests, 1 RED.

**Tests Written/Re-seated:** 30 RED tests covering all 6 ACs. Full suite: **30 failed | 672 passed (702)**; `tsc --noEmit` clean. RED verified by testing-runner (RUN_ID rb4-5-tea-red); ONLY the 6 intended files fail.
**Status:** RED (failing — ready for Dev)

**ROM verification (against the CITABLE quarry `~/Projects/red-baron-source-text`, fingerprint OK; decoys R2BRON/R2GRND excluded):**
- AC2: `.4WORD` macro RBARON.MAC:15-18 ×4's every operand; POTDLY RBARON.MAC:5930 = `-32,-23,-17,-10,-5,0,4,8,13,18,25` ×4 = `[-128,-92,-68,-40,-20,0,16,32,52,72,100]`. (Current code = the un-multiplied raw list, citing decoy R2BRON.MAC:5923.)
- AC3: DISCHK RBARON.MAC:3468-3496 + band flags :3189 (`D7=CLOSE, D6=MIDDLE, D5=FAR`) → CLOSE=0.375 (BMI), MIDDLE=0.625 (BVS), FAR=1.0. Ground `LDA I,40` :3186-3188 → TEMP3=0x40=D6=MIDDLE. (Current bands INVERTED; ground forced 'far'.)
- AC4: POT.X RBARON.MAC:5897-5926 → `diff>>3` arithmetic (LSR×3 + `ORA 0E0` sign-extend), bound [-16,+15], ±1 floor (`20$`), hysteresis <3. (Current = constant min(8,·) ramp toward turn×MAX_TURN=40.)
- AC5: HORIZN RBARON.MAC:456 = `40` hex = 64; HORZ RBARON.MAC:451 = `1000` hex = 4096; POSITH RBGRND.MAC:269-322 subtracts I4YPOS (line 279), single-Z-rotates, divides by depth, then `ADC I,HORIZN` (:303). (topology.ts constants already correct from rb3-1; HORIZN applied nowhere.)
- AC1: UNIV4X pan RBARON.MAC:3196-3213, PFROTN single-Z-rotation :3214-3236, I4YPOS eye height :3237-3262 — all in PFMOTN.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| core purity — no DOM/time/randomness | flight/camera/horizon "pure & deterministic" + "does not mutate its input" | passing (guard) |
| 0 is falsy-but-VALID (no `x \|\| default`) | "center pot maps to step 0 — level flight is a real value" | passing (guard) |
| total functions on the boundary | pitchDelta out-of-range clamps; POT.X bounds [-16,+15]; proximityBand NaN-total | RED (clamp) / passing |
| meaningful assertions (no vacuous) | self-check: removed NaN-vacuous passes — reworked horizon/camera RED from NaN-noise to behavioural discriminators | done |

**Rules checked:** the applicable core-boundary + numeric-defaults + totality rules have test coverage; TS `tsc --noEmit` is clean.
**Self-check:** found and fixed a class of NaN-vacuous passes (horizon/camera tests initially failed via NaN because the current code reads `attitude.yaw`); reworked them so the RED is behavioural ("altitude ignored", "pitch/yaw rotate the view") and the guards pass on finite values.

**Handoff:** To Yoda (Dev) for the GREEN implementation.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/camera.ts` — `Attitude` narrowed to `{ roll }`; `flightView` = `rotationZ(roll)` + translate only (no yaw/pitch rotation). AC1.
- `src/core/flight.ts` — PITCH_TABLE ×4 `[-128…100]` (AC2); DISCHK inverted `near 0.375 / mid 0.625 / far 1.0` + `GROUND_CONTROL_BAND = 'mid'` (AC3); POT.X proportional `diff >> 3` bounded [-16,+15] with ±1 floor, `MAX_TURN`→`POT_RANGE` (AC4); `toAttitude` roll-only, `toEye` = lateral heading pan + altitude eye height, `ALT_TO_Y` exported (AC1).
- `src/core/horizon.ts` — `horizonSegments({ roll, altitude }, aspect)` at the finite depth HORZ=4096, moving with altitude (AC5/AC1).
- `src/core/scene.ts` — `projectSegment` adds the constant `HORIZN_NDC` (64/512) to Y after the divide (AC5).
- `src/main.ts` — draw() takes the flight state; world geometry (mountains, horizon) uses `toEye` (UNIV4X pan + I4YPOS height); camera-relative motion objects keep the origin eye (bank only).
- Tests re-seated: `flight/camera/horizon/ground-mode/enemy/scene.test.ts` (constants, translation model, proportional deadband, HORIZN offset).
- `docs/audit/findings/*.json` — re-anchored 40 `ours` citations (17 to the remediated fix lines) so `citations.test.ts` stays green.

**Tests:** 702/702 passing (GREEN). `tsc --noEmit` clean; `npm run build` succeeds. Render sanity check confirms: the horizon sits just above centre and DROPS on climb, BANKS with roll; a mountain PANS horizontally on a turn with its depth/scale intact — the translation model, on-screen, no NaN.

**Branch:** feat/rb4-5-camera-rotation-pipeline (pushed)

**Handoff:** To Obi-Wan (Reviewer) for code review.

## Dev Assessment — REWORK (integration with develop, 2026-07-15)

**Implementation Complete:** Yes — merged `origin/develop` (rb4-1 radix sweep + rb4-2 frozen-evidence + release
v0.0.14) into the branch and resolved all 7 integration failures the isolated 702/702 could not see. Root-caused
each against the ROM before fixing (systematic-debugging discipline).

**Files Changed (rework, on top of the original rb4-5):**
- `src/core/scene.ts` — split the projector: `projectSegment` reverted to the PURE perspective divide; new
  `projectWorldSegment` = divide + the ROM's POSITH HORIZN lift. HORIZN now scoped to the playfield path only.
- `src/core/horizon.ts`, `src/core/landscape.ts` — the world objects (horizon, mountains) now call
  `projectWorldSegment`; motion objects keep the bare `projectSegment`. ROM: POSITH/POSITP add HORIZN
  (RBGRND.MAC:303), the PLANE PROJECT path (:359) does not.
- `src/core/flight.ts` — merge conflict resolved keep-HEAD (rb4-5's fuller POTDLY ×4 docstring, a superset of
  develop's radix-swept one-liner).
- `docs/audit/findings/*.json` — reverted to develop's FROZEN citations (rb4-2's evidence model forbids the
  re-anchoring the original green did).
- Tests re-seated: `scene.test.ts` (pure vs world projector — split 1 test into 2), `camera-shape.test.ts`
  (AC5a → world path), `landscape-wiring.test.ts` (regex), `cockpit-draw-path.test.ts` (mock records both gates),
  `depth-scale.test.ts` (POT_RANGE classified NOT_A_DEPTH).

**Tests:** 914/914 passing (GREEN) on the merged tree; `tsc --noEmit` clean; `npm run build` succeeds. Verified
via testing-runner (RUN_ID rb4-5-dev-green-rework-2). The `cockpit-draw-path` integration test BOOTS the real
main.ts and checks every stroke on the glass against core projections — strong evidence the render path is
correct; absolute HORIZN height + pan feel remain playtest-gated (rb4 close), per the original findings.

**Branch:** feat/rb4-5-camera-rotation-pipeline (to be re-pushed with the merge)

**Handoff:** To Obi-Wan (Reviewer) for a FRESH review — the merged result integrates rb4-1/rb4-2 and changes the
HORIZN scope, so it differs materially from the earlier approval. See the rework deviations under Design Deviations.

## Subagent Results

Toggles (`pf settings get workflow.reviewer_subagents`): only `preflight` and `rule_checker` are ENABLED;
the other seven are DISABLED via settings. Disabled specialists are pre-filled "Skipped / disabled" and I
covered their domains myself (see Rule Compliance + the tagged Observations below).

**UPDATED for the REWORK re-review (2026-07-15).** The original approval (pre-rework, 702/702) is superseded;
this table + the Reviewer Assessment below reflect the reworked, develop-integrated branch (914/914).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (914/914 green, tsc+build clean, tree clean, core/shell boundary clean, 0 smells, 0 markers) | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (behind-eye cull + null paths VERIFIED) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (no swallowed errors in prod) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer + rule-checker (test quality assessed) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer ([DOC] stale-comment finding persists) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer + rule-checker |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (pure deterministic math, no I/O surface) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain covered by Reviewer (projectWorldSegment reuses projectSegment, no dup) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (Low — [TEST] projectWorldSegment null-passthrough has no direct test) | confirmed 1, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned — preflight clean 914/914, rule-checker 1 Low finding over 22 rules/61 instances; 7 disabled pre-filled per settings)
**Total findings:** 1 confirmed (Low, test-coverage gap) + 2 carried forward from the first review (5 test double-casts, stale flight.ts comments — both Low, non-blocking, out of rework scope). 0 Critical/High.

### Rule Compliance

Exhaustive rule-by-rule enumeration. The rule-checker mechanically checked 18 rules over 96 instances
(TS checklist #1-#13 + the 5 arcade project rules) and I re-verified the ROM-fidelity and boundary rules
against source. Every governed type/function/field/constant judged.

**Project rule — core/shell boundary (THE rule):** camera.ts / flight.ts / horizon.ts / scene.ts import ONLY
from `@arcade/shared/math3d` and sibling core modules; zero DOM/window/Date/performance/Math.random. `main.ts`
is the shell entry, out of scope. ✓ COMPLIANT (all 4 core files).

**Project rule — 0 is falsy-but-valid (no `|| default` on numerics):** enumerated every numeric expression in
the diff — `easeTurnRate` uses explicit `step === 0` (not `||`); `toEye`/`toAttitude`/`horizonSegments` pass
roll/heading/altitude straight through (0 propagates); tests use `.pitch ?? 0` / `.yaw ?? 0` (correct `??`).
Zero `||` fallbacks on a numeric. ✓ COMPLIANT.

**Project rule — total functions on the boundary:** `pitchDelta` clamps the table index (flight.ts:163),
`pfrotn` clamps the bank (172), `step` clamps `input.turn` and `altitude` (203/209), `easeTurnRate` bounds the
step (187), `horizonSegments` null-guards the segment (horizon.ts:42), `projectSegment` culls both-behind-eye
(scene.ts:72). No undefined array read / NaN path reachable. ✓ COMPLIANT.

**Project rule — exported ROM constants carry a citation:** PITCH_TABLE (RBARON.MAC:5930 + ×4 macro), DISCHK
(:3468-3496 + :3189), GROUND_CONTROL_BAND (:3186-3188), ALT_TO_Y (findings §2). Un-pinned seams (PAN_SCALE,
ROM_SCREEN_HALF) HONESTLY disclose "not byte-pinned" rather than fake a citation. ✓ COMPLIANT.

**ROM-fidelity of the values themselves (verified against the citable quarry `~/Projects/red-baron-source-text`):**
AC2 `.4WORD` body = `.WORD .A*4,…` → POTDLY ×4 = `[-128…100]` ✓ · AC3 DISCHK routine decodes to CLOSE 0.375 /
MIDDLE 0.625 / FAR 1.0, ground `LDA I,40`=D6=MIDDLE ✓ · AC5 `ADC I,HORIZN` sits AFTER `START DIVIDE`
(RBGRND.MAC:301-304), HORIZN=$40=64, HORZ=$1000=4096 ✓ · AC1 translation model (no yaw/pitch rotation) ✓.

**TypeScript checklist #1 (type-safety escapes):** 5 VIOLATIONS — the `as unknown as T` double-casts (see
Observation 6). No `@ts-ignore` / `@ts-expect-error` / non-null `!` anywhere. Held Low (test scaffolding).

**TypeScript checklist #8 (test quality):** 2 VIOLATIONS — flight.test.ts & camera-shape.test.ts local
`Attitude` mocks declare pitch/yaw REQUIRED vs the real `{roll}` (mismatch masked by the cast). No `as any` in
any assertion; no `dist/` imports; sibling camera.test.ts / horizon.test.ts correctly made the fields optional.

**TypeScript checklist #2-7, #9-13:** enumerated by rule-checker — 0 violations (no Record<string,any>/object/
Function types, no enums introduced, no `||`-on-nullable, `.js` extension not required under this repo's
`moduleResolution: bundler`, no .tsx, async imports correctly awaited, no config changes, no input-validation
surface, no `catch(e:any)`, no barrel over-imports, GREEN commit re-scanned clean).

### Devil's Advocate

Argue the code is broken. **A malicious/adversarial caller:** `step` receives `input.turn`/`input.pitch` from
`axis()` which only emits -1/0/+1, but the function is public — a caller could pass ±1e9 or NaN. Traced it:
`clamp(input.turn,-1,1)` neutralises magnitude, and `pitchDelta` clamps the index, so a hostile pot can't index
out of `PITCH_TABLE` or over-drive PLDELX — but NaN would slip through (`clamp(NaN,…)` = NaN, `Math.round(NaN)`
= NaN, `clamp(NaN,0,10)` = NaN, `PITCH_TABLE[NaN]` = undefined). Is that reachable? Only from a caller passing
NaN; the keyboard `axis()` never does, and the ROM pots are analog-bounded. Pre-existing totality gap, not this
diff's regression, and not wired to any real input — noted, not blocking. **A confused pilot** holding one turn
key forever: `heading` grows without bound (Observation 11); the ROM's UNIV4X wraps, ours doesn't, so
world-anchored geometry (mountains — ground-mode-only, unlanded) pans off and never recurs, and float precision
erodes over a very long session. Real divergence, but forward/playtest-gated. **A stressed renderer:** every
object now routes through `projectSegment`, which adds `HORIZN_NDC` AND divides by `w`; a segment with one
endpoint behind the eye (`w≤0`, other in front) is NOT culled (only both-behind is) and divides by a
near-zero/negative w → a wild coordinate. Pre-existing (the partial-clip gap predates this story), and the
HORIZN offset doesn't worsen it. **A future auditor:** reads the flight.ts header, sees "close ×1.0 / agility
rises when near", and "re-corrects" the DISCHK const back to the inverted (wrong) values — the stale comment is
a genuine fidelity trap ([DOC] finding). **A test that lies:** the local `Attitude` mocks declare pitch/yaw
required while the real type dropped them; could that mask a broken `toAttitude` that secretly emits pitch? No —
camera-shape.test.ts never reads `.pitch`/`.yaw`, and the AC1 tests assert pitchRate/yaw have NO effect on the
rendered eye-space point, so a regressing implementation would still fail. Conclusion: no Critical/High survives;
the surviving items are Low (test hygiene, stale docs) or pre-existing forward seams.

## Reviewer Assessment

**Verdict:** APPROVED (REWORK RE-REVIEW, 2026-07-15 — supersedes the original pre-rework approval below)

The integration rework is clean, ROM-faithful, and complete. Dev merged current `develop` (rb4-1 radix
sweep + rb4-2 frozen-evidence + v0.0.14) and resolved all 7 integration failures at the correct layer — the
code fix, not the tests. **PR #26 is MERGEABLE/CLEAN.** No Critical or High issues.

**The central decision — HORIZN scope — is verified correct against the ROM.** I independently confirmed:
POSITH/POSITP (RBGRND.MAC:269-322) add `ADC I,HORIZN` on the PLAYFIELD path (which also subtracts I4YPOS and
pans by UNIV4X); the PLANE PROJECT path (RBGRND.MAC:359) adds none. So splitting `scene.ts` into a pure
`projectSegment` (motion) and a `projectWorldSegment` (world = divide + HORIZN) is exactly the ROM's structure —
and AC5's "EVERY object **(POSITH)**" was scoping the offset to the playfield path all along. This also restores
rb4-1's shipped `screen.ts` "ruler = pixel" invariant (untouched) and resolves my own earlier Observation 12.

**Data flow traced (rework seam):** world geometry — `horizon.ts` / `landscape.ts` mountains — now calls
`projectWorldSegment` (verified: the only two callers); motion geometry — `biplane.ts` enemies/wrecks/blimp,
`guns.ts` tracers — keeps the bare `projectSegment` (verified across 7 call sites). `projectWorldSegment` reuses
`projectSegment` (no duplicated divide) and returns `null` before touching `.y1/.y2` on the behind-eye cull, so
it cannot leak a lifted ghost. Tracers and enemies are BOTH motion → both pure-projection → their alignment
holds (my prior Obs-12 concern is answered).

**Pattern observed:** the two-projector split is the minimal correct expression of the ROM's two positioning
routines; `projectWorldSegment` is a 4-line wrapper over `projectSegment` (scene.ts:118-122) — DRY, not a rival.

**Confirmed findings — all Low, non-blocking:**

| Severity | Issue | Location | Tag |
|----------|-------|----------|-----|
| [LOW] | `projectWorldSegment`'s behind-eye null-passthrough is correctly implemented but has NO direct test — the only null-cull test drives bare `projectSegment`. Path is near-unreachable (horizon@4096, mountains@≥192 are always ahead of NEAR=1), impl is a 2-line delegation; a *future* regression that lifted before the null-check would go uncaught | `tests/core/scene.test.ts` (add a `projectWorldSegment` behind-eye case) | [RULE][TEST] |
| [LOW] | 5 `as unknown as` double-casts persist in test scaffolding (out of rework scope) | camera.test.ts:48, horizon.test.ts:59, flight.test.ts:126, camera-shape.test.ts:101 & :143 | [TEST][TYPE] |
| [LOW] | Stale flight.ts header still teaches the pre-fix model (dive -32/+25, "close ×1.0 … agility rises", "heading → yaw") — rb4-1's sweep even corrected the citation on :16 to RBARON.MAC:5930 while leaving the old values it points to | src/core/flight.ts:16-17, 24, 141 | [DOC] |

**Verified good (rework, evidence):**
- [VERIFIED][RULE] rule-checker swept 22 rules / 61 instances → 1 Low finding, 0 correctness violations. Caller split, DRY, boundary, citations, re-seated-test non-vacuity all COMPLIANT.
- [VERIFIED][EDGE] `projectWorldSegment` preserves the both-behind-eye cull — scene.ts:120 `if (seg === null) return null` runs before the lift; no NaN path introduced (adds a finite 64/512 to an already-finite y).
- [VERIFIED][SIMPLE] `projectWorldSegment` reuses `projectSegment` — no duplicated `toClip`/divide (scene.ts:118-122). No dead code (tsc `noUnusedLocals` green).
- [VERIFIED][SEC] N/A — pure deterministic projection math; no user input / auth / secrets / I/O in the reworked files.
- [VERIFIED][SILENT] no swallowed errors introduced; the test `catch { … = {} }` blocks are the pre-existing RED-phase defensive-import house pattern (no `e: any`).
- [VERIFIED][DOC] the rework's OWN new comments (scene.ts two-projector header, projectWorldSegment docstring, cockpit-draw-path "two gates") are accurate to the ROM and the code; the stale-comment debt is confined to the pre-existing flight.ts header ([DOC] finding above).
- [VERIFIED][TYPE] no new type escapes; SceneSegment/HorizonView fields readonly; SceneSegment `type`-only imports correct.
- [VERIFIED][RULE] audit findings match develop's frozen version byte-for-byte (no re-anchoring) — satisfies rb4-2's citation-evidence model; citations + citation-evidence green.
- ROM re-confirmed: `.4WORD` ×4 PITCH_TABLE, DISCHK bands, POSITH-after-divide HORIZN — unchanged by rework and still correct (flight.ts POTDLY conflict resolved keep-HEAD, PITCH_TABLE intact).

### Devil's Advocate (rework)

Argue the rework is broken. **The HORIZN scope flip is a behavioural change** — motion objects lost the +0.125
lift they had in the (unshipped) approved build. Could that misplace planes? No: develop's pre-rb4-5 baseline had
NO HORIZN anywhere, so motion objects return to exactly that baseline Y, and the cockpit-draw-path INVARIANT 1 +
TARGET TRUTH tests (which boot real main.ts and measure every tracer/plane against the collision arm's ground
truth) pass at 914/914 — a misplacement would redden them. **Could the horizon/mountains now be wrong?** They gain
the HORIZN lift they were always meant to have (AC5); horizonSegments/mountainSegments both route through
projectWorldSegment and the depth-independent-offset tests pin it. **The findings revert** — did reverting to
develop's frozen citations hide a live divergence? No: rb4-5's code fixes remain; only the citation *bookkeeping*
reverted, and the frozen-evidence model is now authoritative (re-anchoring was the old model). The cost is that
rb4-5's 17 remediations are untracked in-file — a real audit-schema gap, but a Gap finding, not a code defect
(logged, deferred to rb4 curation). **The one real gap:** the null-passthrough of projectWorldSegment is untested.
A malicious future edit (`{ ...projectSegment-or-a-lifted-null }`) could leak a ghost — but the current code is
correct and the path is near-unreachable for world objects that live far ahead of the eye. **Could the
cockpit-draw-path mock double-count?** No — projectWorldSegment's internal projectSegment call binds to the real
module function, not the mock, so each world segment records once; and 914/914 confirms the canvas==roster diff.
Conclusion: no Critical/High survives; the surviving items are one Low test-gap + two carried-forward Low debts.

**Handoff:** To Grand Admiral Thrawn (SM) for finish — the branch is MERGEABLE/CLEAN and 914/914. Three
non-blocking Delivery Findings (null-passthrough test gap, persisting double-casts, stale flight.ts comments) for
a fast-follow; SM should also refresh PR #26's stale body (still says 702/702) before merge. None blocks.

---

### ⤵ Original pre-rework approval (SUPERSEDED by the rework re-review above)

**Verdict:** APPROVED

This is an exemplary ROM-fidelity rewrite. All six ACs are satisfied and every ROM constant is verified
byte-for-byte against the citable quarry (not the R2BRON/R2GRND decoys): the ×4 PITCH_TABLE, the inverted
DISCHK bands + middle-band ground mode, the post-divide HORIZN offset, and the yaw/pitch→translation pipeline.
Preflight is fully green (702/702, clean tsc + build), the core/shell boundary is clean, and the new
`camera-shape.test.ts` pins the right discriminators (depth-invariance under pan/climb; a depth-independent
HORIZN offset) through the real projection substrate — not vacuous. No Critical or High issues. The only
findings are Low: 5 test-scaffolding `as unknown as` double-casts (confirmed against the TS checklist, held
Low because they are test-only, mechanically verified harmless, and the suite is green) and a cluster of stale
`flight.ts` doc comments that still describe the pre-fix model. Both are captured as non-blocking Delivery
Findings for a fast follow.

**Data flow traced:** keyboard → `readInput` → `axis()` (-1/0/+1) → `step(state,input)`: `input.turn` is
`clamp(-1,1)×POT_RANGE` eased by the >>3 proportional law into `turnRate`; `input.pitch` → `pitchDelta`
(clamped table index) → `pitchRate`; both ×DISCHK scale accumulate into `heading` (UNIV4X) and `altitude`
(I4YPOS, clamped). `toAttitude`→roll-only bank, `toEye`→[heading·pan, altitude·ALT_TO_Y, 0]. `flightView` =
`viewMatrix(eye, rotationZ(roll))` → `projectSegment` divides by depth and adds `HORIZN_NDC`. Safe: every
boundary input is clamped and every table index is bounded; a turn/climb changes X/Y, never depth (the
translation invariant).

**Pattern observed:** the whole world → NDC path funnels through the single `projectSegment` seam
(scene.ts:69), so the HORIZN offset lands uniformly on every object (horizon, mountains, enemies, tracers) —
consistent with AC5's "EVERY object" and keeping tracer↔enemy alignment intact (biplane.ts:166, landscape.ts:122,
main.ts shellSegments all call it).

**Error handling:** pure deterministic core, no throwing paths; null-projection returns `[]` (horizon.ts:42,
shellSegments); both-behind-eye segments are culled (scene.ts:72). No swallowed errors in production; the test
`catch { m = {} }` blocks are the RED-phase defensive-import house pattern (no `e: any`).

**Confirmed findings (all Low, non-blocking — captured as Delivery Findings):**

| Severity | Issue | Location | Tag |
|----------|-------|----------|-----|
| [LOW] | 5× unnecessary `as unknown as T` double-casts; local `Attitude` mocks declare pitch/yaw REQUIRED vs real `{roll}` | tests/core/camera.test.ts:48, horizon.test.ts:59, flight.test.ts:126, camera-shape.test.ts:99 & :138 | [RULE][TEST][TYPE] |
| [LOW] | Stale header/docstrings teach the pre-fix model (inverted DISCHK "agility rises when near", pre-×4 pitch -32/+25, `heading`→"yaw") — fidelity-regression hazard | src/core/flight.ts:16-17, 22-26, 141, 159-161 | [DOC] |

**Verified good (evidence):**
- [VERIFIED][EDGE] boundary totality — pitchDelta index / pfrotn / altitude / turn-step all clamped; horizon + projectSegment null/behind-eye guarded. Evidence: flight.ts:163,172,187,209; horizon.ts:42; scene.ts:72.
- [VERIFIED][SILENT] no swallowed errors in production; test catches are RED-phase defensive with no `e:any` (rule-checker confirmed).
- [VERIFIED][SEC] N/A — pure deterministic math; no user input / auth / secrets / JSON.parse / I/O in the changed core files.
- [VERIFIED][SIMPLE] no dead code (tsc `noUnusedLocals` green); camera.ts reduced to roll-only, unused `type Attitude` import dropped from main.ts; `pitchRate` retained as a documented, test-covered ROM accumulator.
- [VERIFIED][RULE] all 5 arcade project rules + TS checklist #2-7/#9-13 pass (rule-checker, 96 instances).
- Observation 11 [EDGE, LOW obs]: `heading` accumulates unbounded vs the ROM's wrapping UNIV4X — forward/playtest, non-blocking.
- Observation 12 [obs]: HORIZN_NDC applied to camera-relative motion objects too — satisfies AC5's literal "EVERY object"; playtest-gated.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story. Two non-blocking Delivery Findings logged for a
fast-follow cleanup (test double-casts + stale flight.ts comments); neither blocks the merge.

## SM Finish — INTEGRATION REWORK REQUIRED (routed back to Dev, 2026-07-15)

**Verdict on finish: BLOCKED.** The approval above was sound — but it was made against a base that
**predated rb4-5's own declared dependency, rb4-1**. Between branch-cut (merge-base `abf123a`) and finish,
`origin/develop` advanced 5 commits: **rb4-1 #22 (THE RADIX SWEEP)**, **rb4-2 #25 (retract the poisoned doc)**,
**#24 (primary-source audit)**, a changelog PR, and **release v0.0.14**. rb4-5's 702/702 was real **in
isolation on the stale base**; it was never integrated against rb4-1. AC6 ("depends on rb4-1 — do not land
first") was honoured on develop, but rb4-5 itself never merged its dependency in.

**Integration proof (SM trial-merge of `origin/develop` into the branch — aborted, nothing pushed):**
- The merged suite is now **913 tests** (develop added ~211, incl. NEW files `depth-scale`, `screen-scale`,
  `citation-evidence`, `radix-transcription`, …). **7 fail.**
- **1 trivial conflict** — `src/core/flight.ts` POTDLY docstring: rb4-5's fuller "×4 macro" version vs develop's
  one-line radix-swept citation. Resolve by **keeping HEAD** (rb4-5's is a strict superset — already cites the
  real `RBARON.MAC:5930`). Everything else (scene.ts, main.ts, enemy.test.ts) auto-merges.

**The 7 failures Dev must resolve (these are the real work — NOT mechanical):**

| # | Failing test(s) | Root cause | Likely fix |
|---|-----------------|------------|------------|
| 1-2 | `tests/core/depth-scale.test.ts`, `tests/core/screen-scale.test.ts` | rb4-5's new `HORIZN_NDC` (+64/512 to EVERY projected Y in `scene.ts projectSegment`) shifts screen-Y; develop's frustum/screen-scale invariants (authored by rb4-1 with NO HORIZN offset) now fail | TEA/Dev judgment: re-seat those develop tests to account for the constant HORIZN offset, OR reconsider where HORIZN is applied vs where the frustum is measured. This is a genuine semantic interaction between AC5 and rb4-1's frustum work. |
| 3-4 | `tests/audit/citations.test.ts` (2) | rb4-5 re-anchored `ours` citations to ITS line numbers; the merge shifts lines again (rb4-1/rb4-2 added lines before the audited spots, ~7-line offsets in main.ts) | Re-run the citation re-anchor against the MERGED line numbers. |
| 5-7 | `tests/audit/citation-evidence.test.ts` (3) | Develop added a **NEW guardrail** rb4-5 never saw: it asserts no finding was DELETED/RECLASSIFIED and every `ours` still matches "AS AUDITED". rb4-5 re-anchored 40 citations (17 to the remediated FIX lines) — which is exactly the "laundering" this guardrail detects (see Dev's own logged finding about the audit schema lacking a `remediated_by` field) | Reconcile the citation re-anchoring with the new evidence guardrail — this is the rb4-2-deferred schema gap coming due. Coordinate with the audit-citation playbook. |

**Required rework sequence:**
1. **Dev (Yoda):** merge `origin/develop` into `feat/rb4-5-camera-rotation-pipeline` (keep-HEAD on the POTDLY
   docstring conflict). Resolve the 4 audit-citation failures (re-anchor vs merged lines + satisfy
   citation-evidence).
2. **TEA (Han) / Dev:** reconcile the 2 HORIZN↔frustum failures (depth-scale/screen-scale) — decide re-seat vs
   re-scope, per AC5.
3. **Verify:** full suite **913/913** green + `tsc --noEmit` + `npm run build`.
4. **Reviewer (Obi-Wan):** re-review — the merged result differs materially from what was approved (integrates
   rb4-1's radix sweep + rb4-2), so a fresh review pass is required, not a rubber-stamp of the prior approval.
5. **SM (Thrawn):** re-finish once green + re-approved.

**PR:** `slabgorb/red-baron#26` is OPEN and CONFLICTING — **do NOT merge** until the branch is rebased/merged
current with develop and the full 913-test suite is green.

*Found by SM (Thrawn) during finish preflight — the finish preflight's local-only green (702/702) masked the
integration conflict; caught by an explicit develop trial-merge before merging the PR.*