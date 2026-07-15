---
story_id: "tp1-33"
jira_key: "tp1-33"
epic: "tp1"
workflow: "tdd"
---
# Story tp1-33: THE MOVING EYE — the well expands past the fixed Claw during the dive (live core eye field)

## Story Details
- **ID:** tp1-33
- **Jira Key:** tp1-33
- **Workflow:** tdd
- **Stack Parent:** none
- **Repos:** tempest
- **Branch:** feat/tp1-33-moving-eye

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-15T19:48:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-15T22:00:00Z | - | - |

## Story Context

### SM Interpretation (Provisional — TEA/Architect to Firm)

This story implements the **deferred well-expansion behavior from tp1-10** (AC-1 "the camera moves with the Claw") by introducing a **live, moving eye field** in the core simulation.

**The visual mechanism:** During the warp dive, the Claw stays FIXED at a constant screen position (the rim — already done in tp1-10). Simultaneously, the WELL's tube geometry expands outward on the screen, creating the optical illusion of the player flying INTO the well. This expansion is driven by the eye's INWARD motion during the descent.

**The ROM basis:** ALWELG.MAC:85-91 shows the eye (EYL, eye-Y) advancing toward the well's target depth by a fixed increment (+0x18 per descending frame) from its starting position to a per-well destination (EYLDES, ALDISP.MAC:2475). This is distinct from (and parallel to) the cursor's own descent down CURSY.

**Current gap (from tp1-10):** The warp descent's fixed-Claw half shipped (the Claw no longer depth-shrinks). The eye-expansion half was deferred — the projection math still uses the static per-well eye baked into `Tube.farRatio` (tp1-9), and `project()` / `perspectiveDepth()` have no way to accept a live eye. As a result, the well does NOT expand as the cursor descends.

**What tp1-33 adds:** 
1. A **live eye field** that holds the eye's current Y-position during the warp dive (distinct from the static per-well eye constants)
2. The eye **advances per-frame** during the descent phase (ALWELG.MAC:85-91 logic)
3. The core projection functions accept and use the **live eye** to recompute ring geometry frame-by-frame
4. As the eye moves inward, the perspective ratio shrinks (eye closer to the well → smaller far-ring → well expands outward on screen), driving the visual effect

**Load-bearing unit lesson** (from tp1-31): The eye's position is a ROM-screen-unit quantity (ALDISP.MAC's world units); converting it to canvas units requires the same rim-relative scale that drives `screenZ`. Naïve world-unit port will re-create scaling errors — the ROM's eye Z is separate from its eye Y and interacts with the divide differently.

### Provisional Acceptance Criteria (SM-Derived — TEA/Architect to Verify Against ROM)

**These ACs are AUTHORED BY THE SCRUM MASTER from the epic context and predecessor archives. They are NOT from the epic YAML. TEA and Architect must verify them against the ROM source (~/Projects/tempest-source-text) and may revise or reject them during the RED phase.**

1. **A live eye field exists in the warp descent simulation.** The eye's Y-position is stored in WarpState or core projection state and changes during the descent phase (not only at boundaries). It begins at the well's static per-well eye-Y value (ROM_EYE_Y[level]) and advances toward a per-well destination (EYLDES, per ALDISP.MAC:2475) at a fixed rate (+0x18 per frame, ALWELG.MAC:85-91). The ROM values are cited in tests.

2. **The projection math consumes the live eye and recomputes ring geometry dynamically.** During the descent, `perspectiveDepth()`, `project()`, `laneCenterFar()`, and `laneCenterNear()` are called with the CURRENT warp eye-Y, not the static per-well value. The far-ring contract (vanishing point, curvature, radius) is preserved — only the eye's position changes. A test proves the far ring's projection ratio shrinks as the eye moves inward (simulating the well expanding outward on screen).

3. **The perspective ratio during the warp dive is derived from the live eye.** The far/near radius ratio R changes frame-by-frame as the eye-Y descends, following the ROM's formula: R = (16 + eye-Y-to-rim-distance) / (240 + eye-Y-to-rim-distance). This ratio is NOT the static per-well farRatio (which stays baked in the Tube). A test pins the ratio's shrinkage across a sample descent sequence.

4. **The Claw's screen position remains fixed throughout the dive.** The Claw is drawn via `clawTransform` at depth 1 (the rim), and the fixed camera translates the whole scene uniformly. The Claw's size does not change. (This is the tp1-10 half — no change needed; included for AC completeness.)

5. **The well visually expands as the eye moves inward.** As a consequence of the above: the far ring's screen radius shrinks (moving inward) and the near ring stays fixed (at depth 1), so the gap between them WIDENS on screen. Points on the well at constant lane+depth move outward. This is verified by a `?raw` render test asserting the far-ring extent during a sample warp descent.

6. **The eye's advancement and the cursor's descent are independent.** CURSY (cursor depth) and EYL (eye-Y) are separate fields. The cursor climbs during the descent (CURSY → ILINDDY) while the eye flies inward. Neither blocks the other. Tests cover cases where the eye has moved far but the cursor is still climbing, and vice versa (edge cases at low ROM_EYE_Z wells).

7. **All cited ROM constants and per-frame advancement rules are in the tests and referenced to the source.** EYLDES per-well table, EYL start = ROM_EYE_Y[level], the +0x18 advancement rate, the eye-Z interaction (if any). The citation gate (tools/audit + tests/audit/citations.test.ts) stays green. If the audit has a finding for this feature (WD-012 "camera moves with Claw" or WD-018 "eye flies into new well"), it is marked `remediated_by: tp1-33` and `ours: null` (the new eye field code is the remedy).

### ROM Quarry Locations

**Most relevant predecessor archive:** `sprint/archive/tp1-10-session.md` — contains AC-1's deferred well-expansion intent, the Reviewer's finding ("AC-1's eye-driven WELL-EXPANSION... needs a live core eye field"), and the RECOMMENDATION to file a follow-up (this story).

**Additional resources:**
- `sprint/archive/tp1-31-session.md` — screen-Z damping and the unit-conversion lesson (canvas vs ROM units)
- `sprint/archive/tp1-9-session.md` — the static eye constants (ROM_EYE_Y, ROM_EYE_Z) and farRatio definition
- ROM source: `~/Projects/tempest-source-text/ALWELG.MAC:85-91` (eye advancement during descent), ALDISP.MAC:2475 (EYLDES per-well table), ALDISP.MAC:1387-1388 (ROM_EYE_Y/Z constants)

### Touch Points (Key Files to Modify)

**Core simulation files (src/core/):**
- `state.ts` — WarpState or a new core projection-state field to hold the live eye-Y during descent
- `sim.ts` — `stepGame()` logic for the descent phase to advance the eye each frame; `cloneState()` to carry the eye
- `geometry.ts` — `perspectiveDepth()`, `project()`, and related functions to accept an optional eye-Y parameter and recompute the ratio dynamically
- `rules.ts` — ROM_EYLDES table, eye-Z constant (if separate from Y), eye-advancement rate constant (+0x18)

**Test files (tests/core/ and tests/shell/):**
- NEW `tests/core/tp1-33.warp-eye.test.ts` — RED test suite pinning the eye field's existence, advancement rate, per-frame ratio shrinkage, and the well-expansion visual (via `?raw` geometry assertions)
- RE-SEAT `tests/core/tp1-10.*.test.ts` (warp tests) — may need minor updates if the eye field interacts with existing warp descent assertions

**Render files (src/shell/ — non-blocking verification):**
- `render.ts` — the warp scene draw should already pass the live eye to `project()` / tube functions; visual verification on a dev server

### Known Constraints & Risks

- **Eye constants are per-well (EYLDES table, ALDISP.MAC:2475).** Like the static ROM_EYE_Y, the destination requires a 16-row lookup. TEA must decode this during RED.
- **Eye-Z interaction (if any).** The ROM's eye is 3D (EYL and EZL); tempest's camera is 2D (no Z rotation). The story may need only EYL; verify against ALDISP.MAC's WORSCR projection.
- **Unit conversion.** The eye-Y is a ROM screen-unit quantity; converting to canvas requires care (see tp1-31 unit-conversion lesson, Delivery Finding #1).
- **Sibling test ripple.** Existing warp tests (tp1-10, tp1-13 unification) may rely on the static eye. Minor re-seats expected.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Gap** (non-blocking): WD-012 ("the well expands past the fixed Claw") is marked `remediated_by: tp1-10` but tp1-10 shipped only the Claw-fixed half — the well-expansion half was a LIVE divergence until this story. Affects `docs/audit/findings/pair-9-warp-drop-mode.json` (WD-012). Reviewer/Dev: record tp1-33's completion WITHOUT re-opening WD-012's frozen `ours` quote (citation-gate trap — see tempest-citation-gate-traps); prefer a note/field, not a re-quote. *Found by TEA during test design.*
- **Gap** (non-blocking): WD-018 (the Phase-2 post-descent fly-in — `EYL += 0x18` INTO the new well toward EYLDES, ALWELG.MAC:85-91) is `ours: null` and still only a countdown placeholder (`WarpState.flyIn` frames). This story deliberately does NOT implement the genuine fly-in eye flight; it needs a follow-up. Affects `src/core/sim.ts` (`stepWarp` fly-in branch, `beginFlyIn`). The `warpDiveTube` eye seam added here should be reusable by that story. *Found by TEA during test design.*
- **Improvement** (non-blocking): the full ROM dive also sweeps the NEAR rim past the advancing eye and off-screen (the Claw detaches from the rim to PY=CURSY, a fixed screen point). This story's near-ring-fixed model is faithful to the headline ("well expands past the fixed Claw") and to the shipped clawTransform, but the rim-fly-off is a further-fidelity follow-up. Affects `src/core/geometry.ts` (`warpDiveTube`) + `src/shell/render.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): the render integration — drawing `warpDiveTube(s.tube, s.warp.progress)` during the warp — must restructure `render()`'s warp flow past `tests/shell/render.warp-dispatch.test.ts`'s "drawSpikes runs before the warp/else split" structural guard; tp1-10's first attempt broke exactly this and backed out. Dev should expect to re-seat that guard, and the well-expansion visual is verified by running the game (CLAUDE.md: shell is eyeballed; the RED here is the pure core). Affects `src/shell/render.ts`, `tests/shell/render.warp-dispatch.test.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): tp1-31 left the mid-slide death→respawn camera snap unpinned and handed it to "the dive rework". It is adjacent but out of this story's scope (the dive expansion is progress-driven and resets on `replayWave`). Flagging so it is not lost. Affects `src/core/sim.ts` (`replayWave`, `s.camera`). *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): WD-012 remains `remediated_by: tp1-10` in `docs/audit/findings/pair-9-warp-drop-mode.json`; I did NOT re-file it, to avoid the frozen-`ours` citation-gate trap. tp1-33 completes its well-expansion half via `warpDiveTube` + the render wiring. Reviewer/SM to decide whether to record the completion (a note/field, not a re-quote). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the dive-zoom visual is verified by driving the real `render()` (screenshots in scratchpad: far ring 0.15→0.54 across the dive, near rim + Claw fixed), NOT by a unit test — the repo has no headless render harness and no warp-trigger debug key, so shell render is eyeballed per CLAUDE.md. The pure core seam is fully unit-tested. Reviewer may re-confirm visually on the dev server. *Found by Dev during implementation.*
- **Question** (non-blocking): re-anchored 4 unrelated citations shifted by editing cited files — V-030/V-031/V-032 (`src/shell/render.ts`) and DB-018 (`src/core/geometry.ts`), via `node tools/audit/reanchor-citations.mjs --write` (0 lost). Committed with the change. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `drawWarp`'s speed streaks ride the BASE (un-expanded) spokes (`src/shell/render.ts:892-904`, using the `s`-tube passed at the `drawWarp(pctx, s, color)` call), while `drawTube` now draws the EXPANDED diving spokes. At deep dive progress the two diverge at the far end — the streaks trail slightly inside the expanded tube. Non-blocking visual polish; streaks and the Claw share `drawWarp`, so aligning streaks to the diving tube must not move the Claw. Affects `src/shell/render.ts` (`drawWarp`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): with the descent now flattening the old well to R_eff=1 at the bottom, the descent-bottom → fly-in beat is a harder visual cut (flat old well → new well at normal size), because the deferred WD-018 fly-in (which would smooth the eye back into the new well) is still a countdown placeholder. Not a regression (the pre-existing WD-018 gap), and the flattening correctly sells "you flew through" — but it strengthens the case for the WD-018 follow-up. Affects `src/core/sim.ts` (`stepWarp` fly-in). *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)

- **Mechanism re-derived from ROM — the SM's "+0x18/frame eye toward EYLDES" is the WRONG routine for "the dive"**
  - Spec source: .session/tp1-33-session.md, SM Interpretation (AC-1/2/3) + "ROM basis: ALWELG.MAC:85-91"
  - Spec text: "the eye (EYL) advancing toward the well's target depth by a fixed increment (+0x18 per descending frame) from its starting position to a per-well destination (EYLDES)"
  - Implementation: RED pins the DESCENT expansion to `MOVCUD` — `EYL += CURSVL` (the SAME accelerating velocity as the cursor, ALWELG.MAC:1049-1062), so `(CURSY − EYL)` is invariant. The `+0x18` is a DIFFERENT phase (NEWAV2, the post-descent fly-in into the NEW well). The effective far/near ratio follows the frozen-YDEUNI law `R_eff(progress) = (16+H)/((240+H) − 224·progress)`, R at progress 0 → 1.0 at the bottom.
  - Rationale: two independent ROM interrogations + the byte-verified WD-012 finding + rules.ts:210-221 all agree: the well-expands-past-the-fixed-Claw behavior ("during the dive") is Phase-1 MOVCUD (cursor-velocity eye), not the Phase-2 fly-in `+0x18`. Ratifying the SM's constant would re-file the tp1-27 "invented constant" trap. YDEUNI is FROZEN at 16+H (INIWLS, ALDISP.MAC:2464-2506) — the scale is NOT recomputed as the eye moves.
  - Severity: major
  - Forward impact: Dev implements a cursor-velocity-driven expansion, NOT a `+0x18` ramp. The `+0x18`/EYLDES fly-in belongs to WD-018 (see the scope deviation below).

- **Scoped to Phase 1 (descent, WD-012); Phase 2 fly-in eye-into-new-well (WD-018) deferred**
  - Spec source: epic-tp1.yaml (tp1-33 has NO ACs) + story title "…during the dive (live core eye field)"
  - Spec text: "THE MOVING EYE — the well expands past the fixed Claw during the dive"
  - Implementation: RED covers ONLY the descent well-expansion (Phase 1 / WD-012's deferred half). The Phase-2 fly-in (NEWAV2, `EYL += 0x18` into the NEW well, WD-018) keeps its shipped countdown placeholder (`flyIn` frames) and is left for a follow-up. The eye seam added here is designed so a WD-018-completion story can reuse it.
  - Rationale: the title says "during the dive" = the descent; the tp1-10 Reviewer's follow-up recommendation names exactly this ("the moving-eye zoom so the well rushes past the fixed Claw"). Phase 2 is a distinct movement with a working placeholder. Containment at 5 pts.
  - Severity: major
  - Forward impact: WD-018's genuine eye-flight remains `ours: null`/placeholder → Delivery Finding filed for a follow-up story.

- **Near ring (rim/Claw) held FIXED during the dive; only the far ring expands — a documented simplification of the ROM's full rim-fly-off**
  - Spec source: WD-012 claim (pair-9-warp-drop-mode.json) + tp1-10 shipped fixed-Claw
  - Spec text: "its rim (fixed at 0x10) and bottom (fixed at 0xF0) get nearer to the advancing eye, so the tube expands and streams past the stationary Claw"
  - Implementation: the diving projection keeps the NEAR ring identical (the Claw rides the rim via the tp1-10 `clawTransform`, already shipped and reviewer-accepted) and expands the FAR ring toward it (R_eff: R→1). The ROM additionally sweeps the near rim past the eye and off-screen (claw detaches to PY=CURSY); that full model is NOT reproduced.
  - Rationale: tp1-10 shipped and the Reviewer accepted the Claw fixed AT the rim (clawTransform at the near ring). Completing the far-ring expansion against that fixed rim delivers the legible "well expands past the fixed Claw" (and renders the spike growing up to meet the Claw, WD-012's own note) without a render rework that conflicts with the shipped claw and re-breaks `render.warp-dispatch.test.ts`.
  - Severity: minor
  - Forward impact: full rim-fly-off (claw at CURSY, rim off-screen) is a further-fidelity follow-up → Delivery Finding.

- **SM's ROM citations corrected before any test pins them**
  - Spec source: .session SM Interpretation "ROM Quarry Locations" + provisional AC-1/AC-7
  - Spec text: "EYLDES per-well table, ALDISP.MAC:2475"; "ROM_EYE_Y/Z constants at ALDISP.MAC:1387-1388"; "ALDISP.MAC:1385-1388"
  - Implementation: tests cite the VERIFIED locations — HOLEYL (eye Y, the H table) @ ALDISP.MAC:1385; HOLEZL @ :1386; EYLDES is a 1-byte SCALAR @ ALCOMN.MAC:532 (line 2475 is `STA EYLDES`, an instruction, not a table); descent driver `MOVCUD` @ ALWELG.MAC:1049-1062; fly-in `+0x18` @ ALWELG.MAC:85-91; ALDISP.MAC:1387-1388 is HOLZAD/HOLZDH (ZADJ), NOT the eye.
  - Rationale: the SM's line numbers were haiku-generated and 2 of 3 are mislocated; a citations-gate test built on them would fail against real ROM text (tempest-citation-gate-traps).
  - Severity: minor
  - Forward impact: none — corrected at the source; Dev/Reviewer inherit the right anchors.

### Dev (implementation)

- **Wired render (shell) to draw the diving tube — code beyond the pure-core RED**
  - Spec source: TEA Assessment "SCOPE (firmed)" + the story title
  - Spec text: "Render integration is shell work verified by running the game; the RED here is the pure core."
  - Implementation: `src/shell/render.ts` computes `const scene = s.mode === 'warp' ? { ...s, tube: warpDiveTube(s.tube, min(1, progress)) } : s` and passes `scene` to `drawTube` + `drawSpikes`, so the well AND spikes draw against the expanding well while `drawWarp` keeps the Claw on the base near ring. No failing unit test demanded this (shell is `?raw`/eyeballed here), but shipping `warpDiveTube` unused would be dead code and the story's whole value is the visible expansion.
  - Rationale: delivers the story; verified by driving the real `render()` at progress 0.05 vs 0.85 (screenshots in scratchpad: far ring expands, near rim + Claw stay put). farRatio 0.1515→0.1582→0.5435 matches the ROM law.
  - Severity: minor
  - Forward impact: the visible dive-zoom is verified by game-drive, not a unit test (repo convention). Reviewer may re-confirm visually.

- **Re-seated `tests/shell/render.warp-dispatch.test.ts`'s `iWarpCond` anchor**
  - Spec source: tp1-10's shipped structural guard + TEA Delivery Finding ("Dev should expect to re-seat that guard")
  - Spec text: "drawSpikes runs before the warp/else split" (guard intent)
  - Implementation: changed `iWarpCond` from the first-match `/s\.mode === 'warp'/` to the dispatch-specific `/if\s*\(\s*s\.mode\s*===\s*'warp'\s*\)/`, because my `const scene = s.mode === 'warp' ? …` adds an earlier textual match. The guard's INTENT (spikes drawn before the drawWarp dispatch) is unchanged and still asserted — the anchor is now more precise, not weaker. All 6 dispatch-guard tests pass.
  - Rationale: exactly the re-seat the TEA anticipated; intent-preserving.
  - Severity: minor
  - Forward impact: none.

- **Implemented AC-4 as near-ring-fixed (per the TEA's firmed spec, not a new deviation)**
  - Spec source: TEA firmed AC-4 + TEA deviation "Near ring held FIXED"
  - Spec text: "the near ring (rim/Claw) is fixed across the dive; only the far ring expands"
  - Implementation: `warpDiveTube` lerps each far vertex toward its OWN near vertex by `k = (1−progress)/(1−progress·(1−R))`, holding `near` identical — a scale about the same per-well vanishing point. Closed form needs no eye/VP recovery; exact at both endpoints. Noting for the record that this follows the TEA's documented simplification (full rim-fly-off deferred).
  - Rationale: implements the firmed AC exactly; the closed form (R_eff = R/(1−progress·(1−R))) is the minimal expression of the ROM law with H cancelled.
  - Severity: minor
  - Forward impact: none — matches the firmed contract.

### Reviewer (audit)

Every logged deviation stamped:

- **TEA: mechanism re-derived (SM's +0x18/EYLDES was the wrong routine)** → ✓ ACCEPTED: byte-verified two independent ways (WD-012 finding + the ROM interrogation); the descent is MOVCUD/cursor-velocity, the +0x18 is the Phase-2 fly-in. Correctly refuses to ratify the invented constant (the tp1-27 trap).
- **TEA: scoped to Phase 1 (WD-018 fly-in deferred)** → ✓ ACCEPTED: the title ("during the dive") and tp1-10's own follow-up recommendation both name the descent expansion; Phase 2 has a working placeholder. Deferral is documented as a Delivery Finding.
- **TEA: near ring held fixed (rim-fly-off simplified)** → ✓ ACCEPTED: consistent with tp1-10's shipped-and-accepted fixed Claw; the far-ring expansion is ROM-faithful and delivers the headline; full rim-fly-off is a documented follow-up.
- **TEA: SM citations corrected** → ✓ ACCEPTED: independently re-verified — HOLEYL @ ALDISP.MAC:1385, EYLDES scalar @ ALCOMN.MAC:532, MOVCUD @ ALWELG.MAC:1049-1062; the SM's ALDISP.MAC:2475 / :1387-1388 were mislocated. No fabricated citation reached a test.
- **Dev: wired render beyond the pure-core RED** → ✓ ACCEPTED: necessary to deliver the visible story (else `warpDiveTube` is dead code); minimal (`{...s, tube}` swap), and verified by driving the real `render()`.
- **Dev: re-seated `render.warp-dispatch` iWarpCond onto the `if (s.mode === 'warp')` dispatch** → ✓ ACCEPTED: the guard's intent (spikes drawn before the drawWarp dispatch) is preserved and the anchor is more precise, not weaker; verified the regex matches only the dispatch (not the new `const scene =` line, nor the `&& warning>0` variant).
- **Dev: implemented AC-4 near-ring-fixed** → ✓ ACCEPTED: matches the firmed contract; the closed form is exact at both endpoints.

No UNDOCUMENTED deviations found — the diff matches the firmed ACs and every departure was logged.

## TEA Assessment

**Phase:** finish
**Tests Required:** Yes
**Status:** RED (13/14 failing on the missing `warpDiveTube` seam; 1 intended keep-behavior anchor passes)

**Test File:**
- `tempest/tests/core/tp1-33.warp-eye.test.ts` — the DIVE well-expansion, pinned to the byte-verified ROM mechanism (MOVCUD descent, cursor-velocity eye, frozen YDEUNI).

**Tests Written:** 14 tests across 7 describe blocks. RED verified by testing-runner (RUN_ID tp1-33-tea-red): the 13 that call `warpDiveTube` fail with `warpDiveTube is not a function`; the lone passing test pins `WARP_ALONG_SPAN === 224` (the law's anchor — a keep-behavior guard, not a new-behavior assertion). Collateral CLEAN: all 181 pre-existing geometry/warp tests pass (19/19 sibling files green).

### The RED contract handed to Dev (Julia)

Add a PURE core seam **`warpDiveTube(tube: Tube, progress: number): Tube`** in `src/core/geometry.ts`:
- **progress 0 → the STATIC well, byte-exact** (no pop when the dive starts).
- **Far ring EXPANDS** about the same per-well vanishing point per the ROM law
  **`R_eff(progress) = (16 + H) / ((240 + H) − 224·progress)`**, H = HOLEYL[wellID]
  (recoverable from the tube's static `farRatio`); strictly monotonic; ends at **exactly 1.0** (flat) at progress 1 on EVERY well.
- **Near ring HELD FIXED** across the whole descent — the Claw rides it (tp1-10 `clawTransform`) and does not move or shrink.
- Reuses the existing `perspectiveDepth`/`project`/`laneWidth` pipeline unchanged (render draws the returned tube during warp — see the render Delivery Finding for the `render.warp-dispatch.test.ts` structural-guard obstacle).
- Pure/deterministic: no RNG, no time, does not mutate its input.

### Firmed Acceptance Criteria (TEA — supersede the SM's provisional, ROM-invented set)

1. `warpDiveTube(tube, progress)` exists as a pure `(Tube, number) → Tube` seam; `warpDiveTube(tube, 0)` equals the static well byte-for-byte.
2. The effective far/near ratio expands per `R_eff = (16+H)/((240+H)−224·progress)`, matching the ROM law per-well (recovered signature-agnostically from lane widths), strictly monotonic.
3. At progress 1 the far ring coincides with the near ring (flat, R_eff = 1.0) on EVERY well — the eye advances the FULL 224 span (this is the DESCENT/MOVCUD, distinct from the EYLDES-clamped Phase-2 fly-in).
4. The near ring (rim/Claw) is fixed across the dive; a depth-1 point projects to the same screen point at every progress.
5. The well expands outward: a far-end point's gap to the near rim on its lane strictly closes to ~0 by the bottom (the mechanism by which a spike grows up to meet the stationary Claw, WD-012).
6. Purity/determinism: referentially transparent, input untouched, finite and in [R, 1] across all 16 wells and the full progress range.
7. Wired to the live sim: sampling `warpDiveTube(s.tube, s.warp.progress)` over a real `stepGame` descent expands monotonically (not a hard-coded ramp).

**SCOPE (firmed):** Phase 1 — the descent well-expansion (WD-012's deferred half). Phase 2 (fly-in eye-into-new-well, WD-018) and the full rim-fly-off are deferred (see Delivery Findings + Design Deviations). Render integration is shell work verified by running the game; the RED here is the pure core.

### Rule Coverage (TS lang-review — applicable checks only)

| Rule | Test(s) | Status |
|------|---------|--------|
| #4 Null/undefined & divide safety | "stays finite and in [R,1] across all wells"; `s.warp.flyIn ?? 0` in the wiring test | failing (seam absent) |
| #2 Interface/return-type contract | AC1 "at progress 0 returns the well UNCHANGED" pins the full `Tube` shape (laneCount/farRatio/screenZ/rings) | failing |
| #8 Test quality (meaningful assertions) | every test asserts a ROM-derived value or a strict inequality; self-checked — 0 vacuous | n/a (self-check) |
| #13 Fix-introduced regressions (meta) | collateral run: 181 sibling geometry/warp tests still pass | passing (no regression) |

Rules #1, #3, #5–#7, #9–#12 are N/A — `warpDiveTube` is a pure deterministic geometry function: no type escapes, no enums, no modules/async/React, no user input, no error handling, no perf/bundle surface.

**Self-check:** 0 vacuous tests. The single pre-GREEN pass (`WARP_ALONG_SPAN === 224`) is an intended keep-behavior anchor, not a new-behavior assertion.

**Handoff:** To Dev (Julia) for GREEN — implement `warpDiveTube`.
## Dev Assessment

**Phase:** finish
**Status:** GREEN — all tests pass; story delivered and verified

**Implementation:**
- `src/core/geometry.ts` — new pure seam `warpDiveTube(tube, progress): Tube`. Each far vertex lerps toward its own near vertex by `k = (1−progress)/(1−progress·(1−R))` (near ring held fixed), giving the effective far/near ratio `R_eff = R/(1−progress·(1−R)) = (16+H)/((240+H)−224·progress)` — the ROM's cursor-tracking dive law (MOVCUD, ALWELG.MAC:1049-1062) with H cancelled. Exact at both endpoints (progress 0 → the static well; progress 1 → flat). No eye/VP recovery, no state, no time — pure.
- `src/shell/render.ts` — during warp, `drawTube` + `drawSpikes` draw the diving well `warpDiveTube(s.tube, min(1, progress))`, so the well and any spike expand around the stationary Claw; `drawWarp` keeps the Claw on the base near ring (identical to the diving near ring), so it does not move.
- `tests/shell/render.warp-dispatch.test.ts` — re-anchored `iWarpCond` onto the `if (s.mode === 'warp')` dispatch (my scene-swap added an earlier textual match); guard intent unchanged.
- `docs/audit/findings/pair-2-*.json`, `pair-4-*.json` — re-anchored 4 citations (V-030/031/032, DB-018) shifted by the edits.

**Verification:**
- `npm test` — **1425/1425 pass** (14/14 tp1-33 core, 6/6 re-seated dispatch guard, citations 12/12, zero regressions across 122 files).
- `npm run build` — clean (`tsc --noEmit` type-checks `warpDiveTube` + the `{...s, tube}` scene object; vite build OK).
- **Game-drive** — froze the loop and drove the real `render()` at progress 0.05 vs 0.85 on level 1: the far ring expands (farRatio 0.1582 → 0.5435, matching the ROM law) while the near rim and the yellow Claw stay fixed. Screenshots in scratchpad (`tp1-33-dive-progress-005-start.png`, `tp1-33-dive-085-v2.png`).

**Scope delivered:** Phase 1 — the descent well-expansion (WD-012's deferred half). Phase 2 fly-in (WD-018) and the full rim-fly-off deferred per the firmed ACs (Delivery Findings).

**Handoff:** To Reviewer (The Thought Police) for code review.
## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (tests 1425/1425, build OK, citations 25/25, 0 smells) |
| 2 | reviewer-edge-hunter | No | Skipped / disabled | none | domain assessed by Reviewer ([EDGE]) |
| 3 | reviewer-silent-failure-hunter | No | Skipped / disabled | none | domain assessed by Reviewer ([SILENT]) |
| 4 | reviewer-test-analyzer | No | Skipped / disabled | none | domain assessed by Reviewer ([TEST]) |
| 5 | reviewer-comment-analyzer | No | Skipped / disabled | none | domain assessed by Reviewer ([DOC]) |
| 6 | reviewer-type-design | No | Skipped / disabled | none | domain assessed by Reviewer ([TYPE]) |
| 7 | reviewer-security | No | Skipped / disabled | none | domain assessed by Reviewer ([SEC]) |
| 8 | reviewer-simplifier | No | Skipped / disabled | none | domain assessed by Reviewer ([SIMPLE]) |
| 9 | reviewer-rule-checker | No | Skipped / disabled | none | domain assessed by Reviewer ([RULE]) |

**All received:** Yes (only `preflight` enabled via `workflow.reviewer_subagents`; the other 8 are disabled and each domain was assessed by the Reviewer directly)
**Total findings:** 0 confirmed blocking, 2 confirmed non-blocking (LOW, → Delivery Findings), 0 dismissed

### Rule Compliance

Exhaustive enumeration of every project rule against the changed code:

- **Core purity boundary (tempest CLAUDE.md, "the most important rule"):** `warpDiveTube` is in `src/core/geometry.ts` and must not touch DOM/window/Date/Math.random/rAF/performance. VERIFIED compliant — pure arithmetic + `Array.map`; no time, no RNG, no DOM (preflight smell-scan: 0 hits for `Math.random`/`Date.now`/`performance.now` in core). The `scene` object and all canvas use live in `src/shell/render.ts` (shell) — correct side of the boundary.
- **Determinism / immutability (core contract):** VERIFIED — `warpDiveTube` returns a new Tube (`{...tube, far: <new array>, farRatio}`); `far` is a fresh `.map`, so the shared immutable `GEOMETRIES` entry is never mutated. `near` is shared by reference but `readonly` and unmutated. Referential transparency pinned by the purity test.
- **Citation gate (tempest CLAUDE.md, load-bearing):** VERIFIED — touched cited files (`render.ts`, `geometry.ts`) → ran `reanchor-citations.mjs` (rule 2); the 4 shifted quotes (V-030/031/032, DB-018) re-anchored (0 lost) and independently confirmed to match their new lines (1037/1045/1062/372). No finding was `remediated_by`-tagged falsely; WD-012 was deliberately NOT re-quoted (correct — avoids the frozen-`ours` trap). `npm test -- citations` GREEN (25/25).
- **TS lang-review #4 (null/undefined & divide safety):** VERIFIED — `denom = 1 − progress·(1−R)` ∈ [R, 1] > 0 for progress ∈ [0,1]; the sole caller clamps with `Math.min(1, s.warp.progress)` and `s.warp.progress` is structurally ≥ 0 (seeded 0, monotone). No divide-by-zero. `s.warp` is a required field so `s.warp.progress` is safe under the `mode==='warp'` guard.
- **TS lang-review #8 (test quality):** VERIFIED — 14 tests, each asserts a ROM-derived value or a strict inequality; no vacuous assertions; the lone pre-GREEN pass (`WARP_ALONG_SPAN===224`) is a keep-behavior anchor.
- **TS lang-review #1/#5 (type escapes, unused):** VERIFIED — no `any`/`as any`/`@ts-ignore` (preflight); `noUnusedLocals` + `tsc --noEmit` clean; `warpDiveTube` return type is a proper `Tube`.
- Rules for enums (#3), async (#7), React (#6), security input-validation (#10), error handling (#11): N/A — pure deterministic geometry + a view swap; no enums, async, JSX, user input, or error surface.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `s.warp.progress` (core sim, 0→1 over the descent) → `render()` clamps `Math.min(1, progress)` → `warpDiveTube(s.tube, progress)` scales the far ring → `drawTube`/`drawSpikes` stroke the expanding well; the Claw path (`drawWarp`→`clawTransform` on the base near ring) is untouched. Safe: `progress` is structurally ∈ [0,1] after the clamp, `denom` ∈ [R,1] > 0, no NaN/Inf reaches the canvas.

**Observations (11):**

- `[VERIFIED]` **warpDiveTube math is correct and exact at endpoints** — `src/core/geometry.ts:317-327`. `k=(1−progress)/denom`, far vertex lerps toward its near vertex. progress 0 → k=1 → far==base far, farRatio==R (no pop); progress 1 → k=0 → far==near, farRatio==1 (flat). Algebraically equals the ROM law `(16+H)/((240+H)−224·progress)` (H cancels). Verified against the 14-test suite + my own derivation.
- `[EDGE]` **divide safety across the domain** — `denom = 1 − progress·(1−R)`; for progress ∈ [0,1] and R ∈ (0,1), denom ∈ [R,1] > 0, so no divide-by-zero and `farRatio` stays finite. The sole caller clamps the upper bound (`Math.min(1, …)`); `s.warp.progress` is never negative (seeded 0, monotone-increasing velocity). Assessed by Reviewer (edge-hunter disabled).
- `[VERIFIED]` **immutability preserved** — `far` is a fresh `.map`; `{...tube}` is a new object; the shared immutable `GEOMETRIES` entry is never mutated. `near` shared by ref but `readonly` and unmutated. `src/core/geometry.ts:321-326`.
- `[SILENT]` **no swallowed errors / silent fallbacks** — pure arithmetic; no try/catch, no `??`/`||` fallbacks masking failure, no empty catches. The render ternary is a clean either/or, not a silent default. Assessed by Reviewer (silent-failure-hunter disabled).
- `[TEST]` **test quality is strong** — 14 tests, each pins a ROM-derived value or a strict inequality (ratio law, endpoints, monotonicity, near-fixed, purity, live-descent wiring). No vacuous assertions; the one pre-GREEN pass is a keep-behavior anchor. Assessed by Reviewer (test-analyzer disabled).
- `[DOC]` **comments accurate** — the `warpDiveTube` derivation comment matches the code (R_eff form ↔ k form), the render comment correctly states drawWarp keeps the Claw on the base ring. Minor grammar nit ("the well's rim/floor near the advancing eye" reads awkwardly) — not worth a change. Assessed by Reviewer (comment-analyzer disabled).
- `[TYPE]` **type contract clean** — `warpDiveTube(tube: Tube, progress: number): Tube`; the `scene` object is a valid `GameState`; no `any`/casts/`@ts-ignore`; `tsc --noEmit` clean. Assessed by Reviewer (type-design disabled).
- `[SEC]` **no security surface** — client-only vector game; no auth, no user input parsing, no secrets, no tenant data, no network. N/A. Assessed by Reviewer (security disabled).
- `[SIMPLE]` **minimal and non-dead** — the closed form avoids eye/VP recovery; `warpDiveTube` is consumed by render (not dead code); the render swap is 3 changed lines reusing the whole projection pipeline. No over-engineering. Assessed by Reviewer (simplifier disabled).
- `[RULE]` **all applicable project rules pass** — see `### Rule Compliance`: core purity, determinism/immutability, the citation gate (re-anchor done, 0 lost), and TS lang-review #1/#4/#5/#8. No violations. Assessed by Reviewer (rule-checker disabled).
- `[LOW]` **drawWarp streaks ride the base spokes** (`src/shell/render.ts:892-904`) — at deep progress the speed streaks trail inside the expanded tube. Non-blocking visual polish → Delivery Finding.

**Deviation audit:** all 7 logged deviations stamped ✓ ACCEPTED (see `### Reviewer (audit)`); 0 undocumented deviations found.

**Error handling:** no failure paths introduced — pure arithmetic + a view swap. Null/undefined: `s.warp` is a required field, read only under `mode==='warp'`; no optional-chain hazards.

### Devil's Advocate

Let me argue this code is broken. First attack: the divide. `warpDiveTube` divides by `denom = 1 − progress·(1−R)`, and a malicious/confused caller passing `progress = 1/(1−R)` (≈1.12 for a level-11 well) would hit denom≈0 and spray Infinity into the canvas. Does the code defend itself? It does not — the function trusts its domain. But the ONLY caller is `render.ts`, which clamps `Math.min(1, s.warp.progress)`, and `s.warp.progress` cannot go negative (seeded 0, velocity ≥ 0), so the real domain is [0,1] where denom ∈ [R,1]. The unit test even pins "finite and in [R,1] across all wells" at progress up to 1. So the theoretical blow-up is unreachable in this codebase — but I note the function is domain-trusting exactly like its neighbour `perspectiveDepth`, so it is consistent, not newly reckless.

Second attack: mutation. `render` builds `scene = {...s, tube: warpDiveTube(...)}` and passes it to `drawTube`/`drawSpikes`. If either draw function mutated `scene.player` or `scene.spikes` (shared refs), it would corrupt the real state. But (a) render is a view and these are stroke-only draw functions, and (b) the SAME shared refs flow through the non-warp path (`scene===s`), so the warp branch introduces no new mutation risk. The one genuinely-new object, the diving tube, shares `near` by reference with the immutable `GEOMETRIES` entry — but nothing mutates `near`, and `.map` guarantees the far array is fresh, so the shared geometry table is safe.

Third attack: the visual is wrong. A confused player mid-dive sees the well balloon while the Claw sits still — is that a bug? No: that IS the ROM behaviour (WD-012), and I verified it by driving the real `render()` at progress 0.05 vs 0.85 (far ring 0.15→0.54, near rim + Claw fixed). The honest weakness I DID find: `drawWarp`'s streaks still ride the base spokes, so at deep progress they diverge from the expanded tube — a real but minor polish gap, filed non-blocking. And the descent now flattens the old well at the bottom, making the (deferred WD-018) cut to the new well more abrupt — again documented, non-blocking, and it actually sells the "arrival." Nothing here rises to Critical or High.

**Handoff:** To SM (Winston Smith) for finish-story.