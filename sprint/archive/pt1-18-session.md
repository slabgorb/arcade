---
story_id: "pt1-18"
jira_key: "pt1-18"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-18: defender: the whole world renders on one screen — the horizontal projection is collapsed, the camera-scroll and scanner are cosmetic

## Story Details
- **ID:** pt1-18
- **Jira Key:** pt1-18
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-18-defender-projection-scroll-window
- **PR:** #616 (https://github.com/slabgorb/arcade/pull/616)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T00:18:02Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-19T23:13:02Z | 2026-08-19T23:14:30Z | 1m 28s |
| red | 2026-08-19T23:14:30Z | 2026-08-19T23:20:48Z | 6m 18s |
| green | 2026-08-19T23:20:48Z | 2026-08-19T23:52:52Z | 32m 4s |
| review | 2026-08-19T23:52:52Z | 2026-08-20T00:18:02Z | 25m 10s |
| finish | 2026-08-20T00:18:02Z | - | - |

## Sm Assessment

**Setup complete → routing to TEA (red phase).**

Story context (`sprint/context/context-story-pt1-18.md`) carries the ROM ground truth from the architect diagnosis this session. Key facts TEA must pin failing tests against:

- **The defect:** the object/terrain/star/collision projection uses `(worldX − camera) >> 8` (`scene.ts:398` `screenCol`, `sim.ts:624` `toScreenCol`, `stars.ts`) with **no visible-window cull**, so the entire 256-column world (`0x10000 >> 8`) is blitted into the 292px raster — every enemy is always on screen and the camera-scroll/scanner are cosmetic.
- **ROM ground truth:** object-visibility test is `DEFA7.SRC:2527-2530` — `LDD OX16 / SUBD BGL / CMPD #150*64 / BHS OPLP OFF SCREEN`. Objects project at `(OX16 − BGL) >> 6` into a **150px visible window** onto a `0x10000/(150*64) ≈ 6.8-screen` world. Right-edge cull corroborated at `$98` (`BLK71.SRC:638-645`, `SAMEXAP7.SRC:74`).
- **The trap for Dev:** the port conflated two fixed-point formats — the ship `PLAX16` is pixel.8 (ship at `plax16>>8 ∈ [$20,$70]=[32,112]`) but `OX16` must be pixel.6; `sim.ts:535` even mixes them (`camera.bgl + plax16`). Render **and** collision **and** laser hit-testing must move together, or shots land where objects are not drawn.
- **Test shape:** pin (a) the visible-window width and the off-window cull (an object beyond the window is NOT drawn but STILL appears on the scanner), and (b) that the projection scale matches the ROM `150*64` constant — mutate the constant to prove the test reddens. Recommend the `rom-fidelity-audit` skill to lock the exact `PLAX16`-vs-`OX16` scale by reading the ship-draw + object-draw pixel computation before writing the pin.
- **Verify:** this is high regression risk; a live playtest (run the game locally) is part of green/verify, not optional.

## Tea Assessment (red)

**RED confirmed → routing to Dev (green).**

New suite: `plugins/defender/tests/pt1-18-visible-window.test.ts` — 5 tests, **4 failing / 1 passing** against current code (the correct RED shape; the passing one is the "on-window attacker is still drawn" over-cull guard). The 4 failures all fail for the RIGHT reason: an attacker at camera-relative world-X 20000 (well beyond the `150*64` window) is drawn at column 78 today (`expected -1 to be 78`) — proof the whole 256-column world is blitted onto the screen.

What the suite pins (behaviourally, via df5-9's diff-frame technique, pixel-scale-agnostic):
1. an attacker outside the `150*64` window is culled from the main view;
2. an attacker inside it is still drawn (no over-cull);
3. the window boundary is exactly `150*64` (camera-rel 9599 drawn, 9600 culled — mutation-sensitive to the ROM constant, `DEFA7.SRC:2527-2530` `CMPD #150*64 / BHS OPLP`);
4. scrolling the camera reveals an off-window attacker (world > one screen);
5. a culled attacker still projects onto the scanner (`SCNR` reads absolute `OX16`).

GREEN scope + traps are in the Delivery Findings (render/collision/laser must share the window; PLAX16-vs-OX16 reconciliation; existing `>>8` tests to update). Recommend `rom-fidelity-audit` to lock the exact scale, and a LIVE playtest in verify.

## Dev Assessment (green)

**GREEN — all pins pass, verified live. → routing to Reviewer.**

- pt1-18 suite: 5/5 pass. Full defender suite: **1055/1055 pass**. `tsc --noEmit`: clean.
- **Implementation:** one shared projection in `world.ts` — `projectWorldX(worldX, camera)` returns the framebuffer pixel or `null` when `(worldX-camera) & 0xffff >= 150*64` (DEFA7.SRC:2527-2530). The 9600-unit window maps linearly across the raster. Render (`scene.ts`), ship-vs-enemy + bomb collision, and laser hit-test (`sim.ts`) all go through it, so you shoot exactly what you see. Onscreen quantities (ship, lasers — PLAX16 pixel.8) reconcile to the world (OX16 pixel.6) via `>>2` (`projectOnscreenX`, `shipWorldX`). Terrain scrolls at the window zoom (2048-col surface, `camera>>5`).
- **Live playtest (Playwright, my tree on :5291):** deterministic probe — world is **6.83 screens** (0x10000/9600), camera scrolls under thrust (0→12745), and only **5 of 25 live enemies are on-screen** (20 culled off-window), spread across columns [52…222]. Screenshot confirms a sparse scrolling window with a clean scrolling ground line — not the old everything-at-once row. `gameOver=false, men=2` → no insta-death; the browser GAME OVER frames were the attract demo playing to completion.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|------------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes (self-run) | clean | defender 1058/1058, orchestrator 503/503, `tsc` clean, tree clean, on branch, no debug code | N/A |
| 2 | reviewer-edge-hunter | Yes | findings | `projectOnscreenX` overshoot (292–295) + laser collision query + ship-guard + asymmetry + NaN→0 | 1–4 fixed (clamp); NaN accepted (pre-existing) |
| 3 | reviewer-test-analyzer | Yes | findings | boundary `BHS >=` + null-cull masked by render clip (mutation battery) | fixed — clamp + direct `projectWorldX` unit tests |
| 4 | reviewer-comment-analyzer [DOC] | Yes | findings | 5 stale comments / lying `SCREEN_WIDTH` docstring / ADR-0006 pointer | all fixed |
| 5 | reviewer-rule-checker [RULE] | Yes | clean | 0 violations / 34 rules; `number\|null` guarded at all 8 call sites; purity preserved; constants cited | N/A (1 citation nitpick fixed) |
| 6 | reviewer-security [SEC] | Yes | clean | none — layered OOB defense, NaN→valid index, no injection/DoS surface | N/A |

**All received:** Yes (6 specialists — the 4 enabled [preflight, DOC, RULE, SEC] plus edge-hunter and test-analyzer).

## Reviewer Assessment

**Verdict:** APPROVED

The feature is correct and verified (live + mutation). All subagent findings were addressed inline; none were correctness bugs in the shipped behaviour.

Adversarial review: 3 parallel subagents (edge-hunter, test-analyzer with an isolated mutation battery, comment-analyzer) + my own trace of every projection call site.

**Confirmed sound (not vacuous):** mutation showed the two headline claims are genuinely protected — reverting `toScreenCol` to camera-blind reddens df5-9 "shoot what you see" AND the df6-1 fingerprint; removing the cull reddens 4/5 pt1-18 tests. Fixtures preserve intent; the fingerprint re-baseline is justified; the rewritten df5-9 test uses an independent oracle.

**Findings, all fixed this phase (commit 01b32241):**
- **[edge-hunter, high] `projectOnscreenX` unguarded** — a rightward laser reached pixels 292–295 (past the 292 raster) into the collision box arithmetic (no crash — collision is arithmetic, blit/streak clip; ROM-faithful that the laser dies just past the edge). Fixed by clamping `windowPixel` to `[0, SCREEN_WIDTH-1]`; ship is provably always on-window (settled column ≤ ~112 → offset ≤ 7168 < 9600).
- **[test-analyzer, med/low] boundary + guard masked by the render clip** — `windowPixel(9600)=292` self-clips, so the `BHS >=` operator and the null-cull weren't pinned. The clamp makes them observable to the render tests, AND added direct `projectWorldX` unit tests (null at 9600, pixel at 9599, culls 0x4000/0x8000/0xff00) — mutation-verified to redden on `>=`→`>`.
- **[comment-analyzer, high] lying docstring** — `SCREEN_WIDTH` claimed a pin test that didn't exist; added `SCREEN_WIDTH == LOGICAL_WIDTH` test (core/shell drift guard).
- **[comment-analyzer, high/med/low] stale comments** — `drawPlayerBlip` (`camera+ship.x<<8`), `WORLD_COLS` scope, `terrain.ts` sampling; + a pt1-18 amendment to ADR-0006.
- **[edge-hunter, low] NaN → pixel 0** — pre-existing (old `>>8` had it too), no worse than before; blit/streak throw downstream on real draws. Accepted, not fixed (out of scope).

**Specialist subagents:**
- **[DOC]** (comment-analyzer): 5 stale-comment / doc findings — all fixed (`drawPlayerBlip` `camera+ship.x<<8`, the `SCREEN_WIDTH` lying docstring, `WORLD_COLS` scope, `terrain.ts` sampling, the ADR-0006 pointer → added a pt1-18 amendment). ROM citation `DEFA7.SRC:2527-2530` verified accurate.
- **[RULE]** (rule-checker): **CLEAN — 0 violations / 34 rules, 61 instances.** Purity preserved (empirical purity.test.ts sweep); all 4 new constants cited (`VISIBLE_WINDOW_X`/`SCREEN_WIDTH`/`TERRAIN_SCROLL_COLS`/`TERRAIN_SCROLL_SHIFT`); `number|null` guarded at all 8 `projectWorldX`/`toScreenCol` call sites with no unsafe unwraps; no non-null assertions; old `screenCol`/`>>8` mapping fully retired (the one retained raw `>>8` in `resolveHumanoidOutcomes` is labeled + justified). Fixed the one nitpick — added `:1601` to the `SCREEN_WIDTH` citation.
- **[SEC]** (security): **CLEAN — no findings.** Layered OOB defense (`windowPixel` clamp + `blitObject`/`drawLaserStreak` per-pixel clips); `wrap16(NaN)`→0 collapses to a valid index (no NaN pixel path); collision is pure arithmetic (no indexed write); no DoS / injection / secrets surface (Canvas-2D over internal sim state only).

Purity preserved (no shell import / clock / entropy in the 3 core files). Defender 1058/1058, orchestrator 503/503, `tsc` clean.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (red) — pt1-18

- **Gap (blocking for GREEN, non-blocking for RED):** the RED suite (`tests/pt1-18-visible-window.test.ts`) pins the visible-window cull, the scroll-reveal and the scanner-preservation on the **render path only** (`composeFrame` output, via the df5-9 diff-frame technique). It does NOT pin the **collision / laser hit-test** path, because a scale-agnostic collision assertion would over-couple to the internal representation. GREEN MUST reconcile the SAME `150*64` window (and whatever pixel scale it lands on) across `scene.ts` (render), `sim.ts` `toScreenCol`/`enemyObjects`/`hazardObjects` (ship-vs-object + bomb collision) and `hitTestLasers` (laser vs enemy) together — or the game will "shoot where you don't hit" and off-window enemies could still kill the ship. This consistency is verified LIVE in the verify phase (run the game), not by these unit tests.
- **Question / design call for GREEN:** the exact reconciliation of the two fixed-point formats — ship `PLAX16` is pixel.8 (`plax16>>8 ∈ [$20,$70]`), object `OX16` must be pixel.6 (`(OX16-BGL)>>6`, cull at `150*64`) — is unresolved, and `sim.ts:535` currently mixes them (`camera.bgl + plax16`). Whether the 150-unit window renders scaled-up or letterboxed into the 292px raster is also open. Recommend the `rom-fidelity-audit` skill + reading the ship-draw AND object-draw pixel computation before implementing. The RED tests are pixel-scale-agnostic on purpose so they don't force a wrong choice.
- **Improvement (non-blocking, heads-up for GREEN):** existing tests encode the current `>>8` projection — `df5-9-world-scroll` (asserts relationships, mostly scale-safe, but see its inline `W>>8` comments), plus `render`, `stars`, `terrain-blit`, `df7-8-*`, `df3-6-live-sim`, `df5-7-visual-playtest`. Changing the projection scale WILL touch some of them; update the ones that hard-code `>>8`, do not delete their intent.

## Impact Summary

**Upstream Effects:** No upstream effects noted
**Blocking:** None

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### Dev (implementation) — pt1-18

- **Window maps to the FULL 292px raster, not the ROM's 150-logical-doubled.** Spec source: DEFA7.SRC:2527-2530 (the ROM's visible field is 150 logical px, doubled to ~300 physical). Implementation: `projectWorldX` stretches the 9600-unit window linearly across the whole `SCREEN_WIDTH=292` framebuffer (1 px ≈ 32.9 world-X). Why: the port's framebuffer/HUD/scanner/text are all laid out for a 292-wide surface; introducing the ROM's 150-logical width + a 2× shell scale would re-flow every HUD position (df7-4/df7-5/df7-8) — out of scope for a projection fix. The ROM INVARIANT that matters (the 150*64 world-X window, the 6.83-screen world, the cull) is exact; only the px-per-world-unit differs. Forward impact: none for gameplay; a future "authentic raster" story could switch to 150-logical + integer scale.
- **Terrain scroll is ~2.7% approximate.** Spec: the ground scrolls locked to the world. Implementation: terrain decodes at its native 2048-column resolution and scrolls at `camera>>5` (32 world-X/surface-col), while objects project at ~32.9 world-X/px. Why: `blitTerrain` maps 1 screen px → 1 integer surface column and the exact match (worldCols=1992.5) is not an integer divisor of the 2048-bit TDATA; 2048 (a divisor) is the closest. The drift is ≤ ~8px across the full width — imperceptible in play. Forward impact: none; a sub-pixel terrain sampler would remove it.
- **Enemy-fire-vs-humanoid stays WORLD-space (no window cull).** Spec: humanoids are abducted/shot across the whole cylinder, on-camera or not (the scanner exists for exactly this). Implementation: `resolveHumanoidOutcomes` projects prey + hazards with a plain `wrap16(worldX-camera)>>8` (the pre-pt1-18 mapping, no cull), NOT the culling `projectWorldX`. Why: the visible-window cull is correct for ship-collision and laser-hit (on-screen only), but applying it here would wrongly make off-camera humanoids invulnerable. Forward impact: preserves df6-1 astro-hit/astro-land behaviour exactly.