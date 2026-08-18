---
story_id: "df5-9"
jira_key: "df5-9"
epic: "df5"
workflow: "tdd"
---
# Story df5-9: Fix world scroll: composeFrame draws the terrain and world-space enemies at absolute positions — camera-offset them so the planet surface scrolls under the ship and enemies stay world-anchored

## Story Details
- **ID:** df5-9
- **Jira Key:** df5-9
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/df5-9-fix-world-scroll-camera-offset
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-18T18:36:10Z
**Round-Trip Count:** 2

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-18T17:12:11Z | 2026-08-18T17:14:06Z | 1m 55s |
| red | 2026-08-18T17:14:06Z | 2026-08-18T17:23:19Z | 9m 13s |
| green | 2026-08-18T17:23:19Z | 2026-08-18T17:30:35Z | 7m 16s |
| review | 2026-08-18T17:30:35Z | 2026-08-18T17:44:07Z | 13m 32s |
| green | 2026-08-18T17:44:07Z | 2026-08-18T17:51:09Z | 7m 2s |
| review | 2026-08-18T17:51:09Z | 2026-08-18T18:07:33Z | 16m 24s |
| green | 2026-08-18T18:07:33Z | 2026-08-18T18:27:39Z | 20m 6s |
| review | 2026-08-18T18:27:39Z | 2026-08-18T18:36:10Z | 8m 31s |
| finish | 2026-08-18T18:36:10Z | - | - |

## Acceptance Criteria

From story context and description:

- **AC1:** `composeFrame` reads `state.camera` (BGL) and camera-offsets both `blitTerrain` (the planet surface) and the world-space entity blits (landers, humanoids, lasers) so the terrain scrolls under the ship as the camera moves.

- **AC2:** Camera-offset terrain and entities honour the $10000 horizontal world-wrap seam (world.ts `wrap16`), so the world wraps correctly at the seam and off-camera entities are culled.

- **AC3:** The ship's display column remains fixed on screen (does not move with the camera offset) — only the world and its entities scroll beneath it.

- **AC4:** Existing render tests remain green: `purity.test.ts` (camera is already in state; the offset stays pure/clock-free), `df3-6-live-sim.test.ts` (frame composition "at rest HOLDS" determinism), `df4-6-visual-playtest.test.ts` (staged enemy coordinates may need camera-aware review), and `still-frame.test.ts`.

- **AC5:** The fix unblocks df5-7's visual playtest and reveals off-camera attackers from df5-10's ground population wiring; reverse+thrust now both navigate the world (reverse already bound as KeyA/ArrowLeft in shell/input.ts, not an input bug).

## Sm Assessment

Story set up and claimed. Premise VERIFIED CURRENT (not stale): `plugins/defender/src/core/scene.ts`
`composeFrame` (lines 186-222) contains **zero** `camera` references — confirmed by grep. Terrain
(`blitTerrain`, :193), landers (:202), humanoids (:207) and lasers (:212) all render at absolute
`world.x >> 8` (terrain at fixed columns), so the world never scrolls and world-spread entities
render off the 292-wide screen. The camera is already on state (`state.camera`, sim.ts:87/162/225)
and already consumed by `stepStars` (sim.ts:227), so the fix is PURE — no new state, no clock/entropy.

**Why this story now, and how it relates to df5-10:** df5-10 (just merged) correctly wires the ground
humanoid population into the sim, but because `composeFrame` ignores the camera, that population is
never drawn where the player is looking — so df5-10's feature was sim-only, not playable. The user
called that correctly ("not a feature — can't interact"). This is the ROOT-CAUSE render fix: it makes
df5-10's population, df5-8's lander waves, and the terrain scroll all reach the screen at once. Chosen
by the user over reopening df5-10 (the render fix is broader than humanoids — it fixes landers, lasers
and terrain too, so it belongs here in df5-9, its already-filed home).

**Watch-outs handed to TEA (in the context + ACs):** honour the $10000 `wrap16` seam (world.ts) and
CULL off-camera entities; keep the SHIP at its fixed display column (only the world scrolls under it);
keep `purity.test.ts` green; and expect `df4-6-visual-playtest.test.ts`'s hand-placed enemy stagings
(fixed world columns) to need camera-aware coordinates once entities are camera-offset — the SAME
class of staging fragility that df5-10's R1 hit. Also `df3-6-live-sim.test.ts` "at rest HOLDS" and the
determinism tests must stay green.

Board clean at claim time: no open PRs, no df5-9 branch anywhere (a-1 is on jt13-8), merge gate clear.
5pt p1. Claim branch pushed; story stamped `in_progress`. Handing to TEA for RED.

## Delivery Findings

No upstream findings.

## Tea Assessment

RED phase complete. New suite `plugins/defender/tests/df5-9-world-scroll.test.ts` — 5 tests, all
failing; lint (`tsc --noEmit`) clean. The RED is behavioural (composeFrame already takes the full
state; it just never reads `state.camera`), not a missing export.

**The bug, confirmed by reading + measuring:** `composeFrame` (scene.ts:186-222) contains zero
`camera` references. Terrain (`blitTerrain`, :193) draws at fixed columns; landers (:202),
humanoids (:207), lasers (:212) blit at absolute `entity.x >> 8`. Only stars scroll (pre-advanced
in sim.ts stepStars). I MEASURED the mapping with a throwaway probe (since deleted): a world entity
at world-x W renders at column `W >> 8` and the camera has zero effect today.

**What GREEN (Korben) must do:** thread `state.camera` (already on SimState, computed each tick by
`slide()` sim.ts:225) into composeFrame and offset the on-screen column to `(wrap16(entity.x −
camera)) >> 8` for the terrain AND every world-space entity (landers, humanoids, lasers), honouring
world.ts `wrap16`. Do NOT offset the SHIP — it stays at its fixed display column. Pure change (camera
already in state; no clock/entropy) — `purity.test.ts` must stay green.

**The 5 RED tests (scale-independent — they assert the camera-relative RELATIONSHIP, not a pixel
constant, via an entity-diff technique that locates a sprite without knowing its colour):**
1. Panning the camera moves a fixed world entity on screen (today pinned at col 64 regardless).
2. The terrain scrolls with the camera (today byte-identical across cameras).
3. On-screen col depends only on `(world-x − camera)` — shifting BOTH by Δ leaves it fixed (today
   off by Δ>>8, because only world-x is read).
4. The $10000 seam wraps (camera past the seam positions by the wrapped difference; today col 1 vs 2).
5. The ship's column is camera-invariant WHILE the world scrolls (guards against offsetting the ship
   AND against a no-op freeze).

**Heads-up for GREEN (same class as df5-10's R1):** `df4-6-visual-playtest.test.ts` and
`df3-6-live-sim.test.ts` stage/inspect frames with hand-placed enemies at fixed world columns and a
settled camera. Once entities are camera-offset, those stagings still compose at `camera=0` (a fresh
sim's camera is 0 and stays 0 with no thrust), so they should hold — but VERIFY the full defender
suite, especially the df3-6 "at rest HOLDS" determinism test and df4-6's kill/abduct stagings.

**Rule Coverage (lang-review/typescript + core-boundary):**
- Test quality (#8/#15/#18): every assertion reads live composeFrame output; the entity-diff helper
  is non-vacuous (it fails if the entity isn't drawn — guarded with `toBeGreaterThanOrEqual(0)`).
- Core-boundary purity: the fix reads `state.camera` (already pure state); no new clock/entropy. The
  existing `purity.test.ts` remains the guard (AC4) — GREEN must keep it green.
- Wrap correctness (#21 degenerate/geometry): the seam test pins wrap16 behaviour at the $10000 seam.

See the Delivery Finding re: AC2 "culling" being moot in this 256-col-world / 292-screen model.

Handing to Korben for GREEN.

## Dev Assessment

GREEN complete. All 5 df5-9 tests pass; full defender 685/685, purity 40/40, cross-app 17457
(0 fail), orchestrator 503/0, `tsc --noEmit` clean.

**The change (scene.ts + terrain.ts):** `composeFrame` now reads `state.camera` and offsets every
world-space blit to `wrap16(worldX - camera) >> 8` via a local `screenCol` helper — terrain,
landers, humanoids, lasers AND effects (drawEffect takes `camera`). `blitTerrain` gained an optional
`cameraCol` param (default 0 → byte-identical to prior behaviour, which is why every camera-0 test —
df3-6 "at rest HOLDS", df4-6 stagings, terrain-blit — stayed green) that scrolls the surface as a
cylinder. The SHIP is untouched (fixed display column), and stars were already pre-scrolled in
sim.ts. No new state, no clock/entropy — `purity.test.ts` green (AC4).

**Consistency beyond the tests:** I camera-offset landers, lasers AND effects too, not just the
tested humanoid+terrain — they are the same world-space seam, and leaving any un-offset would freeze
explosions/lasers while enemies scroll (the same "half-fixed" inconsistency class as df5-10's R1).

**End-to-end interactivity verified** (throwaway probe, deleted): from a fresh sim, 120 ticks of
thrust move `state.camera` 0 -> 12745 and change the composed frame (world scrolls under the ship);
120 ticks of reverse drive it the other way (-> 48643, wrapping the cylinder) and produce a different
frame — so reverse now flies you both ways (AC5). This is the interactivity df5-10 was missing.

**One pre-existing quirk flagged** (Delivery Finding): the terrain surface is 1024 columns while the
entity/camera world is 256 (0x10000>>8). df5-9 scrolls both at the same screen rate (correct + tested),
but the differing wrap moduli are a latent alignment issue in the extreme wrap zone — an Architect
call on the world's true width, out of df5-9 scope.

Handing to the Reviewer.


## Dev Assessment (round 3 — R3/R4/R5 fixes)

All three round-2 findings fixed; the fix touched collision, as the Reviewer flagged.

**R3 (HIGH — lasers rendered off-ship):** confirmed `laser.x` is ON-SCREEN (laser.ts:109
`rec.x = shipX_onscreen + offset`, bounded by onscreen RIGHT_EDGE/LEFT_EDGE). Reverted the laser
blit to `laser.x >> 8` (no camera term) — lasers, like the ship, do not scroll.

**R4 (HIGH — could not shoot what you see):** `hitTestLasers` now projects each lander to its
ON-SCREEN column `wrap16(l.x - camera) >> 8`, threading THIS frame's `camera.bgl` (the same value
composeFrame renders with), so collision agrees with the render. Landers render world→onscreen;
lasers/ship are already onscreen; collision now happens uniformly in onscreen space.

**R5 (MEDIUM):** rewrote the COLIDE comment to the real onscreen-consistent model.

**Both fixes are camera=0-identical** (screenCol/collision degenerate to the old `x>>8` at camera 0),
so the whole existing suite is unmoved (685→687, only the 2 new tests added).

**Closed the test gap the Reviewer named** — added two DISCRIMINATING camera != 0 tests, and VERIFIED
each fails on the pre-fix code (reverted the two fix lines, ran, saw both red, restored):
1. Lasers do NOT scroll with the camera (a laser at a fixed laser.x renders at the same column at
   camera 0 and camera C; a world entity does not).
2. You can shoot the enemy you SEE at a scrolled camera. The discriminator is coordinate-space, not
   fragile staging: raw-world collision can only kill a lander whose WORLD col is in the beam's
   onscreen reach [~32,152], which draws no further right than `152 - cameraCol`; so a kill DRAWN
   beyond that (a planted lander lingering in the far beam via the df5-10-R1 lure technique) is
   impossible under raw collision and proves onscreen-consistent collision. Verified fails pre-R4.

**Green:** df5-9 7/7, full defender 687/687, purity 40/40, cross-app 17459 (0 fail), orchestrator 503/0,
tsc clean. Sub-pixel-jitter (round 1) and terrain-data-size 1024-vs-256 (round 2 Architect flag) remain
non-blocking. Handing back to the Reviewer.

## Design Deviations

No design deviations yet.
## Subagent Results

**Cycle: 0**

Enabled specialists (per `workflow.reviewer_subagents`): preflight, security, rule_checker.
Disabled (pre-filled Skipped): edge_hunter, silent_failure_hunter, test_analyzer,
comment_analyzer, type_design, simplifier. test_analyzer AND comment_analyzer are both off, so I
audited test quality and every comment first-hand — and the rule_checker (backstop) caught two
things there.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 685/685 + purity 40/40, tsc clean, no smells — confirmed 0 |
| 2 | reviewer-edge-hunter | No — disabled | Skipped | none | disabled via settings |
| 3 | reviewer-silent-failure-hunter | No — disabled | Skipped | none | disabled via settings |
| 4 | reviewer-test-analyzer | No — disabled | Skipped | none | disabled; tests assessed first-hand |
| 5 | reviewer-comment-analyzer | No — disabled | Skipped | none | disabled; comments assessed first-hand |
| 6 | reviewer-type-design | No — disabled | Skipped | none | disabled via settings |
| 7 | reviewer-security | Yes | clean | none | pure integer arithmetic, no clock/entropy — confirmed 0 |
| 8 | reviewer-simplifier | No — disabled | Skipped | none | disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 2 | terrain snap (R1) + stale comments (R2) — confirmed 2 |

**All received:** Yes
**Working-tree audit (`pf reviewer audit-tree`):** CLEAN.
**Total findings:** 2 confirmed (1 must-fix HIGH, 1 must-fix LOW), 0 dismissed. Both independently verified.

## Reviewer Assessment

**Verdict:** REJECTED

The camera-offset core is correct and well-tested — but the terrain scroll has a measured render
defect this change introduced, plus two comments citing the render convention this change retired.

[PRE] `reviewer-preflight` CONFIRMED 685/685 defender + purity 40/40 green, `tsc --noEmit` clean, no debug/smells.
[SEC] `reviewer-security` CONFIRMED clean — pure integer arithmetic on existing state (`state.camera`), no clock/entropy; web-sec N/A for this offline core.
[RULE] `reviewer-rule-checker` verified `wrap16(0x0100−0xFF00)=0x0200` by execution, confirmed the `cameraCol=0` terrain path is byte-identical to prior behaviour (why every camera-0 test stayed green), and confirmed all four world-space blit families are offset while the ship is not — but surfaced the two findings below (both measured, not inferred).

### FINDING df5-9-R1 [RULE] (HIGH, must-fix) — CONFIRMED by my own measurement
**File:** `plugins/defender/src/core/terrain.ts:88-96` (introduced by this change).
**What:** `blitTerrain` scrolls the surface wrapping modulo the altitude-table length (**1024**), but it
is driven by `cameraCol = camera >> 8`, whose reachable range is **[0,255]** (the camera is a 16-bit
BGL, and entities wrap at the 0x10000 cylinder → 256 columns via `>>8`). The two periods don't match:
the world/camera cylinder is 256 columns, the terrain wraps at 1024. Consequence — **the planet
surface SNAPS once per lap.** I measured it (throwaway probe, deleted): at the camera high-byte wrap
(cameraCol 255→0, which happens every full traverse of the world in normal play — verified in GREEN
that thrust/reverse sweep the camera across this range) the terrain jumps **36 rows at column 245**,
versus a **2-row** normal step. ~477 of the 1024 entries are also never reachable.
**Fix (in scope for df5-9):** wrap the terrain scroll at the WORLD CYLINDER period (`0x10000 >> 8` =
256), not the data length — define it as a named constant cited to the 16-bit cylinder, don't leave a
magic 256. Verified: at mod-256 the wrap step is 2 rows = a normal step (seamless, no snap). Keep the
`cameraCol=0` path byte-identical. Re-verify the df5-9 suite + full defender stay green.
**Out of scope (flag for Architect, do NOT fix here):** WHY the decoded terrain is 1024 entries while
the world is 256 columns (a data-vs-world-size mismatch), and whether the 256-col terrain seam is
cliff-continuous — that's a coordinate-system decision about the world's true width. R1 only asks for
the seamless-scroll modulus, which removes the snap regardless of that larger question.

### FINDING df5-9-R2 [RULE] (LOW, must-fix) — stale comments citing the retired render convention
**Files:** `plugins/defender/src/core/sim.ts:238-239` and `plugins/defender/src/core/effects.ts:260-261`.
**What:** both describe the pre-df5-9 render convention `column = world-x >> 8` as current. This change
retired that convention in scene.ts (render is now `wrap16(worldX − camera) >> 8`). The COLIDE comment
even states a safety rationale — "both are read in SCREEN space (column = world-x >> 8, the render
convention), so the laser you SEE hits the lander you SEE" — whose stated mechanism is now false.
NOTE for Dev: collision itself is NOT broken — it hit-tests in raw world-x on both sides, and since the
render offsets lasers and landers by the SAME camera, visual coincidence is preserved. So the fix is to
the COMMENTS only: correct/retire the `>> 8` "render convention" citation (state that COLIDE works in
raw world space and the equal camera offset preserves what-you-see-hits-what-you-see), and fix the
`PlacedEffect` doc's "column is `x >> 8`". Same class as df5-10's R1; `comment_analyzer` is disabled, so
these have no other net.

### Non-blocking note (do NOT require rework)
- Sub-pixel jitter: entities offset by `(worldX − camera) >> 8` (sub-pixel accurate) while terrain
  shifts by whole columns (`camera >> 8`) — a ≤1px terrain-vs-entity jitter under sub-pixel camera
  motion, inherent to column-granular terrain. Cosmetic; acceptable.

Rework is one modulus + a named constant (R1) and two comment corrections (R2). Handing back to Korben.
## Dev Assessment (round 2 — R1/R2 fixes)

Both Reviewer findings addressed.

**R1 (HIGH — terrain snap):** the terrain scroll wrapped modulo the 1024-entry altitude table, but
the camera cycles at the 256-column world period (`0x10000>>8`), so the surface snapped ~36 rows
once per lap at the BGL wrap. Fix: added `world.ts` `WORLD_COLS = 0x10000 >> 8` (cited to the
cylinder) and tiled the terrain at that period via a new `blitTerrain(..., period = altitudes.length)`
param — `composeFrame` passes `WORLD_COLS`. The `period` defaults to `altitudes.length`, so the static
callers that omit it (`composeStaticFrame` / the title still, and the `terrain-blit.test.ts` unit tests
that pin `min(len, width)` with small arrays) keep the EXACT legacy paint — confirmed by 685/685.
**Verified the snap is gone** (throwaway probe on the live `composeFrame`, deleted): the BGL-wrap step
(cameraCol 255→0) is now **2 rows, identical to a normal step** (was 36). Seamless.
Note: reconciling WHY the decoded surface is 1024 entries vs the 256-col world remains the Architect
flag from round 1's Delivery Finding — R1 only fixes the seamless-scroll period, which is in df5-9 scope.

**R2 (LOW — stale comments):** corrected `sim.ts:236-239` (COLIDE) — it now states collision hit-tests
in RAW world space (`world-x >> 8`, camera-independent, unaffected by the scroll) and that the render
offsets lasers+landers by the SAME camera so a hit still lines up with sight — and `effects.ts:260`
(`PlacedEffect` doc: "camera-offset to its on-screen column at render"). Verified: collision really does
compare `l.x >> 8` / `laser.x >> 8` (sim.ts hitTestLasers), so the corrected comment is accurate, and
collision behaviour is unchanged (no test moved).

**Green:** df5-9 5/5, full defender 685/685, purity 40/40, cross-app 17457 (0 fail), orchestrator 503/0,
`tsc` clean. The sub-pixel-jitter note from round 1 remains non-blocking/cosmetic (unaddressed by design).

Handing back to the Reviewer.
## Subagent Results

**Cycle: 1**

_(Review round 2.)_ **Method: re-ran all three enabled specialists** on the round-2 state. test_analyzer
+ comment_analyzer disabled; I re-audited tests/comments first-hand. The rule_checker (backstop) caught a
real regression the round-1/round-2 diffs introduced.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 685/685 + purity, tsc clean, no smells — confirmed 0 |
| 2 | reviewer-edge-hunter | No — disabled | Skipped | none | disabled via settings |
| 3 | reviewer-silent-failure-hunter | No — disabled | Skipped | none | disabled via settings |
| 4 | reviewer-test-analyzer | No — disabled | Skipped | none | disabled; tests assessed first-hand |
| 5 | reviewer-comment-analyzer | No — disabled | Skipped | none | disabled; comments assessed first-hand |
| 6 | reviewer-type-design | No — disabled | Skipped | none | disabled via settings |
| 7 | reviewer-security | Yes | clean | none | pure integer arithmetic — confirmed 0 |
| 8 | reviewer-simplifier | No — disabled | Skipped | none | disabled via settings |
| 9 | reviewer-rule-checker | Yes | findings | 3 | R1 RESOLVED; found laser-render + collision coordinate bug — confirmed |

**All received:** Yes
**Working-tree audit (`pf reviewer audit-tree`):** CLEAN (after committing the legitimate `in_review` stamp).
**Total findings:** R1 (terrain snap) VERIFIED RESOLVED. Two NEW must-fix HIGH (R3 laser render, R4 collision)
+ one MEDIUM (R5 comment) — the camera model has a coordinate-space hole the round-1 tests never covered.

## Reviewer Assessment

**Verdict:** REJECTED

Round-1 findings are resolved — but verifying them surfaced a deeper, confirmed correctness hole: df5-9
camera-offsets RENDER but the ship/laser (onscreen) vs lander/humanoid (world) coordinate split was never
reconciled, so once the world scrolls, lasers render wrong AND you can't shoot what you see. Both bugs are
invisible at camera=0, which is the only state every test exercises.

[PRE] `reviewer-preflight` CONFIRMED 685/685 + purity green, tsc clean, no smells.
[SEC] `reviewer-security` CONFIRMED clean — pure integer arithmetic, no clock/entropy.
[RULE] `reviewer-rule-checker` CONFIRMED **df5-9-R1 (terrain snap) RESOLVED** — instrumented the wrap
boundary (cameraCol 255→0 shifts ±2 rows = a normal step, not 36; the default 3-arg `blitTerrain` path is
byte-identical, 685/685 green) — and surfaced R3/R4/R5 below (all measured, not inferred).

### FINDING df5-9-R3 [RULE] (HIGH, must-fix) — lasers wrongly camera-offset in render (CONFIRMED)
**File:** `plugins/defender/src/core/scene.ts` (the `drawLaserStreak(fb, screenCol(laser.x), ...)` line).
**What:** my df5-9 change camera-offsets `laser.x` as if it were world-space, but `laser.x` is
ONSCREEN-relative: `laser.ts:109` sets `rec.x = shipX + offset` where `shipX = camera.plax16` (the ship's
16-bit ONSCREEN X — sim.ts:231 passes `camera.plax16`, laser.ts/sim.ts docs say "onscreen PLAX16"), and
travel is bounded by fixed onscreen edges RIGHT_EDGE=0x9800 / LEFT_EDGE=0x0500 — never the world cylinder.
Subtracting the world camera from an onscreen quantity is wrong: rule_checker measured a **150-column error**
after 20000 ticks of ordinary thrust (camera=26816). Every laser fired after the world has scrolled renders
far from the ship.
**Fix:** render lasers at `laser.x >> 8` — NO camera term (they are onscreen, like the ship). Identical at
camera=0, so existing tests stay green.

### FINDING df5-9-R4 [RULE] (HIGH, must-fix) — collision is not camera-consistent → can't shoot what you see (CONFIRMED by my own probe)
**File:** `plugins/defender/src/core/sim.ts` (`hitTestLasers`).
**What:** landers/humanoids now RENDER camera-offset (`wrap16(x − camera) >> 8`, scene.ts) but COLLISION
still compares the RAW `lander.x >> 8` (world). So the drawn position and the collision position diverge by
`camera >> 8` once the world scrolls. Empirically (my probe, deleted): at camera=64704 a lander RENDERS at
onscreen col **254** but collision expects the killing laser at col **−5** — a 259-col mismatch. Result: you
cannot shoot the enemies you see the moment the world scrolls — the game becomes UNPLAYABLE during exactly
the scrolling df5-9 adds (a playability *regression* vs the frozen-but-shootable prior state).
**Fix (recommended — Option A, minimal, keeps the ROM's onscreen ship/laser + world enemies):** make
collision camera-consistent with render. In `hitTestLasers`, test each enemy at its ONSCREEN x
(`wrap16(lander.x − camera) >> 8`, threading `state.camera` in) against the laser's onscreen `laser.x >> 8`,
so what collides is what's drawn. Identical at camera=0 (so df4-6's kill/abduct stagings stay green). The
alternative (convert lasers to world-space in laser.ts + collision + render together) is a larger change; A
is correct for the world-space-enemy model df4-3/df5-8/df5-10 already use — but if you prefer the world-space
route, reconcile all three sites at once.

### FINDING df5-9-R5 [RULE] (MEDIUM, must-fix with R3/R4) — the R2 COLIDE comment is now half-true
**File:** `plugins/defender/src/core/sim.ts:236-240`. The round-1-R2 rewrite says collision hit-tests "in
RAW world space... a hit still lines up with what you SEE." The "lines up with what you SEE" half is FALSE at
camera≠0 (R4), and lasers aren't world-space at all (R3). Rewrite it once R3/R4 land, to describe the real
onscreen-consistent model.

### PROCESS NOTE (for the rework — the gap that let R3/R4 through GREEN twice)
The RED suite only exercises camera-offset for HUMANOIDS at camera≠0; it never fires a laser or runs
collision under a nonzero camera, and its own docstring wrongly grouped lasers with landers/humanoids as
"world-space entities." The rework MUST add camera≠0 coverage: (a) a laser fired after the sim scrolls the
camera renders adjacent to the ship; (b) a laser overlapping an enemy's DRAWN position kills it at camera≠0.
Both fixes are camera=0-identical, so they will not disturb the existing suite — the new tests are what pin
them.

Handing back to Korben. This is the coordinate-consistency tail of "make the world scroll" — required for
the playable feature the user asked for.
## Subagent Results

**Cycle: 2**

_(Review round 3.)_ **Method: re-ran all three enabled specialists** on the R3/R4/R5 fix. test_analyzer
+ comment_analyzer disabled; audited tests/comments first-hand.

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | 687/687 + purity 40/40, tsc clean, no smells — confirmed 0 |
| 2 | reviewer-edge-hunter | No — disabled | Skipped | none | disabled via settings |
| 3 | reviewer-silent-failure-hunter | No — disabled | Skipped | none | disabled via settings |
| 4 | reviewer-test-analyzer | No — disabled | Skipped | none | disabled; tests assessed first-hand |
| 5 | reviewer-comment-analyzer | No — disabled | Skipped | none | disabled; comments assessed first-hand |
| 6 | reviewer-type-design | No — disabled | Skipped | none | disabled via settings |
| 7 | reviewer-security | Yes | clean | none | pure integer arithmetic — confirmed 0 |
| 8 | reviewer-simplifier | No — disabled | Skipped | none | disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | none | R3/R4/R5 RESOLVED, no new coord bug — confirmed 0 |

**All received:** Yes
**Working-tree audit (`pf reviewer audit-tree`):** CLEAN.
**Total findings:** 0. R3/R4/R5 all VERIFIED RESOLVED (rule_checker independently reverted each fix and
saw the matching test fail). One non-blocking test-robustness note (below).

## Reviewer Assessment

**Verdict:** APPROVED

The coordinate-consistency tail is closed. df5-9 now makes the world scroll AND stay playable: the
terrain/landers/humanoids/effects render camera-offset, the ship and lasers stay on-screen, and COLIDE
projects landers to the same on-screen space so you can shoot what you see.

[PRE] `reviewer-preflight` CONFIRMED 687/687 + purity 40/40 green, tsc clean, no smells.
[SEC] `reviewer-security` CONFIRMED clean — pure integer arithmetic, no clock/entropy.
[RULE] `reviewer-rule-checker` CONFIRMED R3 (lasers render `laser.x>>8`, no camera term — laser.x is
onscreen per laser.ts), R4 (`hitTestLasers` projects landers `wrap16(l.x−camera)>>8` with `camera.bgl` =
the same camera composeFrame renders that frame with — one projection, both sites), and R5 (comment
accurate) all RESOLVED; verified both fixes degenerate to `x>>8` at camera 0 (why the suite is unmoved),
and INDEPENDENTLY re-verified both new tests are discriminating by reverting each fix and observing the
matching failure. It found NO remaining coordinate inconsistency — effects stay world-space/camera-offset,
the terrain sign convention (`screenCol = worldCol − cameraCol`) matches the entity projection, and the
laser/lander box widths don't need seam handling.

I independently confirmed the same discrimination (reverted the two fix lines, saw both new tests fail,
restored) before this verdict, and read the reworked collision/comment myself.

### Non-blocking note (recorded; does NOT require rework)
- **R4 test robustness:** the discriminator margin (planted lander drawn at col 100 vs threshold
  `152 − cameraCol + 5` = 98 at seed 7's settled `cameraCol=59`) is thin and tied to the exact camera
  seed-7 settles to. The FIX is unaffected, but a future change to unrelated tuning constants (slide
  step, velocity clamp) could shift that camera below the threshold and spuriously fail this one test.
  Recommend a follow-up one-liner: assert the camera assumption explicitly
  (`expect(DRAWN_START).toBeGreaterThan(rawMaxDrawn + 5)`) so such a shift fails LOUDLY with a clear
  message instead of a mysterious kill-not-found. Not blocking — the test is correct and discriminating today.

df5-9 ships: the world scrolls both ways, the ground population and waves are visible and DEFENDABLE, and
collision agrees with the render. Two prior Architect flags remain open as separate concerns (terrain
1024-vs-256 data size; sub-pixel terrain/entity jitter) — neither blocks. APPROVED for merge.