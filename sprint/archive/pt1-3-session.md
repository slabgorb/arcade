---
story_id: "pt1-3"
jira_key: "pt1-3"
epic: "pt1"
workflow: "tdd"
---
# Story pt1-3: star-wars: surface-run projection looks wrong — elements render very far from the player

## Story Details
- **ID:** pt1-3
- **Jira Key:** pt1-3
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch:** feat/pt1-3-star-wars-surface-run-projection
- **PR:** (none yet — recorded when the PR is created)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-08-20T11:21:59Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-08-20T09:11:00Z | 2026-08-20T09:12:55Z | 1m 55s |
| red | 2026-08-20T09:12:55Z | 2026-08-20T09:31:46Z | 18m 51s |
| green | 2026-08-20T09:31:46Z | 2026-08-20T10:57:57Z | 1h 26m |
| review | 2026-08-20T10:57:57Z | 2026-08-20T11:21:59Z | 24m 2s |
| finish | 2026-08-20T11:21:59Z | - | - |

## Sm Assessment

**Story:** pt1-3 — star-wars surface-run projection looks wrong (elements render far too distant during the Death Star surface run). 3pt, p1, tdd, epic pt1 (Sprint 2636 playtest sweep).

**Setup:** Session, context (`sprint/context/context-story-pt1-3.md`) and branch `feat/pt1-3-star-wars-surface-run-projection` created; status stamped `in_progress`. Contention probes clean (no remote pt1-3 branch; sibling a-1 on pt1-1). Claim committed and pushed.

**For TEA (RED):** The epic's "projection or z-scale/near-plane" cause is a *playtest hypothesis, not a diagnosis* — confirm the real cause against star-wars ROM/math (`plugins/star-wars/CLAUDE.md`) before writing the failing test. Enforce the core/shell boundary: projection math is pure sim in `plugins/star-wars/src/core/`; render in `src/shell/`. The RED test should pin the correct projected distance/scale of surface-run geometry, not the symptom.

## Tea Assessment

RED phase complete. Failing tests committed at `91bdb2b2`. `npm run lint` clean.

### Diagnosis (root cause, confirmed against source)
The surface run mixes two coordinate systems. Everything the tower is measured
against is at the ROM→world **presentation scale (1/30)** — `render.ts:259`
`GROUND_MODEL_SCALE` (the ROM's 960-unit tower footprint drawn at r=32), the
ground grid `GRID_HALF_WIDTH=3600`/`GRID_FAR=6000` (`surface-grid.ts:26-28`), the
camera seat `SKIM_ALTITUDE=128`, and the tower **model** itself. But `mazeField`
(`plugins/star-wars/src/core/sim.ts:2118-2127`) plants the authored maze coords
**unscaled**: `pos: [e.y + SPAWN_DISTANCE, e.x, 0]`, with `e.x`/`e.y` raw ROM
units out to ±32768. A 352-tall tower model planted at depth ~34000 projects to
~1% NDC height — a speck ~9× beyond the far edge of the grid it should stand on.
`render.ts:250` states it outright: *"the maze spacing and hit radii all assume"*
the 1/30 scale. The placement is the outlier, not the grid/camera/model. The
2026-08-08 projection audit (`docs/2026-08-08-star-wars-projection-audit.md`)
already flagged this and recommended re-deriving `SPAWN_DISTANCE` and the surface
seat. Reference: user-supplied arcade Wave-6 still — towers large & near.

### Derived ACs (none in the YAML; I defined them)
- **AC1** Every laid surface tower stands within the drawn ground: lateral
  `|pos[1]| ≤ GRID_HALF_WIDTH`, depth `0 < pos[0] ≤ GRID_FAR`.
- **AC2** Tower placement shares the tower model's footprint scale — a tower
  authored at raw `e.x` is planted at `e.x · GROUND_MODEL_SCALE`.

### Failing tests (RED — verified with real output, 4 failing / 16 passing)
- `tests/core/surface-projection-scale.test.ts` (new) — AC1 (lateral + depth
  envelope, all waves 2–20) and AC2 (scale coherence), exercised through the real
  space→surface transition. Pure world-space invariants, uniform across mazes.
- `tests/core/surface-maze-field.test.ts` — corrected the `places turrets only at
  the maze's authored lateral coordinates` test from raw `e.x` to
  `e.x · GROUND_MODEL_SCALE`; it was **locking in the buggy raw placement**.

### For Dev (GREEN) — READ THIS
- The fix is **coordinate-frame coherence**, not a one-liner. Scaling only
  `mazeField`'s lateral/depth by `GROUND_MODEL_SCALE` will satisfy AC1/AC2 but the
  **surface scroll speed is also raw** (`SURFACE_SEED_SPEED = 0x100·TICK_HZ ≈ 5250
  u/s`, `SURFACE_MAX_SPEED`, `state.ts:738-741`). Scale positions without the
  scroll and the whole field flies past in a fraction of a second. Make the scale
  coherent across positions **and** pacing (and re-check `SPAWN_DISTANCE`, per the
  audit doc). The tests pin the end-state, not the knobs — that is deliberate.
- `GROUND_MODEL_SCALE` currently lives in **`shell/render.ts`**; `mazeField` is
  **pure core** and must not import shell. You'll need the scale (or its inverse)
  available in core — a shared/core constant that the shell model-scale equals.
  The tests assert that equality, so keep them one number.
- The tower **footprint/height** (`render.ground-object-placement.test.ts`) and
  the ROM maze **data** (`surfaceMazes.ts`) are correct — do not touch them. Only
  the *placement into world space* (and its pacing) is wrong.
- Verify visually after GREEN: `just serve` → `http://127.0.0.1:5270/star-wars/`,
  reach the surface run, confirm towers loom large & near like the reference.

### Rule Coverage
- **Core/shell purity boundary:** tests exercise core placement via `stepGame`;
  no DOM/time/RNG added to core. Dev must keep the scale constant out of a
  core→shell import (called out above).
- **Meaningful assertions / non-vacuity:** every test asserts a laid field exists
  (`length > 0`) before iterating, so a green cannot come from an empty field.
- **Determinism:** fixed seed `1983`; placement is seed-independent (already
  guarded by sw4-3's "identical field per seed").

## Subagent Results

Only preflight/security/rule_checker are enabled on this project (edge_hunter, silent_failure_hunter, test_analyzer, comment_analyzer, type_design, simplifier disabled via `workflow.reviewer_subagents`).

| # | Specialist | Received | Status | Findings | Decision |
| 1 | reviewer-preflight | Yes | clean | none (2413 green, lint clean, 0 smells) | N/A |
| 2 | reviewer-security | Yes | clean | none (FAR=9000 note dismissed — not a regression) | N/A |
| 3 | reviewer-rule-checker | Yes | findings | 8 doc findings (#15/#17/#24) | all FIXED in rework 33880eb8 |
| 4 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 5 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — covered manually |
| 8 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |

**All received:** Yes (all 3 enabled specialists — preflight, security, rule_checker — returned; the other 6 are disabled via settings).

## Reviewer Assessment

**Verdict:** APPROVED (after a one-round rework applied in-phase, `33880eb8`).

**Subagents:**
- **[PRE]** `reviewer-preflight` — GREEN: lint clean, star-wars 2413/2413, zero code smells.
- **[SEC]** `reviewer-security` — CLEAN: grid loop-counts unchanged (ratios preserved), no NaN/Infinity from scaled divides, no overflow (max ~180000 ≪ MAX_SAFE_INTEGER). Its FAR=9000 note verified as a non-issue by me: `project()` (wireframe.ts:73) near-clips only, no far cull, deep geometry renders (confirmed visually) and towers were always at raw ~34000 — not a regression.
- **[RULE]** `reviewer-rule-checker` — 8 findings, all documentation (rules #15/#17/#24), each confirmed by re-running the real projection pipeline. All addressed in the rework; no code-correctness or purity-boundary violations (it confirmed no `core/` file imports the shell's `GROUND_MODEL_SCALE`).

**Correctness:** the fix is sound — the sim/pacing stayed ROM-faithful raw, only the visual constants moved to 1:1 raw (matching the audit §6.2 direction). Core/shell purity intact (rule-checker confirmed no `core/` file imports the shell's `GROUND_MODEL_SCALE`). Fix verified visually at `/star-wars/`.

**What the review caught & FIXED (rework `33880eb8`):** with `comment_analyzer` disabled, the raw-scale migration left retired ÷30 figures scattered across ~14 comment/title sites (my manual sweep + the rule-checker + a grep-the-numbers pass found them all): source band/lift/scale comments (sim.ts, render.ts, models.ts, debug-overlay.ts), a self-inconsistent `BUNKER_CRASH_CEILING` arithmetic comment (1680 = 56×30, not the 1200×720/512 = 1687.5 it claimed), two self-contradicting test titles (`87`→`~2639`, `2,000`→`4,000`), stale prose across surface-hazard/surface/hitscan-laser/surface-aim-wysiwyg/surface-ship-point/gun-visibility, and one too-loose bound in the new `surface-projection-scale.test.ts` (near-field 0.5×→1.5× viewport; it was 8.8× loose). No behaviour change beyond the tightened bound. Re-verified: lint clean, star-wars 2413 green, working-tree audit CLEAN.

**Delivery Finding (not blocking):** pt1-21 already filed for the ROM-confirmed surface-traversal staged-multi-pass reveal.

## Dev Assessment

GREEN complete. Implementation committed `99399dbb` (+ follow-up `9fdfb274`), pushed. `npm run lint` clean; full monorepo suite 18033 green; star-wars 2413 green.

**What shipped (per user ruling "Raw ROM units", audit §6.2):** the surface run's projection bug was a scale split — the sim is authentic raw ROM units, the *visual* layer was a stale ÷30 presentation fudge, so raw-positioned towers drawn with a ÷30 model projected as distant specks. Unified the surface visual on raw ROM units, leaving the ROM-faithful sim/pacing untouched:
- `render.ts` GROUND_MODEL_SCALE 1/30 → 1
- `state.ts` SKIM_ALTITUDE 128→3840 (GD$MDT), MIN/MAX_SKIM 40/238→1200/7168 (GD$MXT), TOWER_HEIGHT 352→10560 (0x58×120), BUNKER_MUZZLE_HEIGHT/CRASH_CEILING ×30, TURRET_HIT_RADIUS 200→6000, ALTITUDE_RATE 200→6000
- `surface-grid.ts` GRID_X/Z/HALF_WIDTH/FAR ×30

**RED re-pointed:** TEA's RED tests assumed the *opposite* direction (scale the sim down to ÷30) — refuted by the ROM-faithful sim + the audit. Re-pointed `surface-projection-scale.test.ts` to the raw projection-symptom invariant; reverted the `surface-maze-field.test.ts` edit to its original raw assertion. See Design Deviations.

**Test cascade:** the ÷30 constant contract (`render.ground-object-placement`) and 6 fixture-based collision/aim suites (`surface-aim-wysiwyg`, `hitscan-laser`, `surface-hazard`, `gun-visibility-and-shape`, `surface.test.ts`) were re-derived to raw geometry — the fixtures used close presentation-depths that no longer cohere with the raw camera / 6000-radius hit sphere (documented per-file with `pt1-3` comments).

**Verified visually** at `/star-wars/` (dev-jump `8`): towers render as tall yellow columns with white caps, big and near on the receding grid, matching the arcade reference. The distance bug is gone.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

- **[Dev/green] Gap, non-blocking → filed as pt1-21.** The surface TRAVERSAL is one dense pass; the arcade is a staged ~5-lap reveal (awakening `.C` gates PRESENCE not just firing; `M$TX` wraps → `INC GD.SEQ`; phase ends at `GD.SEQ ≥ 5`). ROM-verified (WSMAIN.MAC:2537-2547/1678-1689, WSGRND.MAC:738-742/771-781/146). The pt1-3 projection fix REVEALED this pre-existing pacing divergence; user playtest confirmed "too close together / brief encounter." Filed pt1-21 (5pt) with the full audit as spec. NOT in pt1-3 scope (distinct mechanism).
- **[Dev/green] Improvement, non-blocking — playtest the raw balance.** Three feel constants changed with the scale and want a play check: (1) `TURRET_HIT_RADIUS` is now 6000 raw — targeting is more forgiving relative to on-screen tower spacing than the old 200÷raw-positions; (2) `SPAWN_DISTANCE` (1200, unchanged) is now the near-spawn horizon in raw terms — the audit §6.2 flagged re-deriving it; (3) `ALTITUDE_RATE` ×30→6000 so the ship still crosses the raw band in ~1s. All ratio-preserving, but the surface is a feel surface.
- **[Dev/green] Improvement, non-blocking.** `COCKPIT_HIT_RADIUS` (80) is correctly LEFT raw — it is shared with space/trench (both raw) and is a fixed aimed-hit tolerance; the presentation-era surface (80 vs altitude 128) was the anomaly, now resolved.

- **[SM/setup] Question, non-blocking:** The epic YAML names a *suspected* root cause ("projection or z-scale/near-plane issue specific to the surface phase"). This is a hypothesis from the 2026-08-19 playtest, NOT a confirmed diagnosis. TEA/Dev must diagnose the actual cause against the star-wars ROM/math (`plugins/star-wars/CLAUDE.md`) before locking a fix — do not assume near-plane is the culprit.
- **[SM/setup] Improvement, non-blocking:** Contention probes clean at claim time — no `pt1-3` remote branch, sibling a-1 is on `pt1-1`. Claim pushed on `feat/pt1-3-star-wars-surface-run-projection` (epic-YAML stamp + context). Core/shell boundary applies: projection math in `plugins/star-wars/src/core/`, render in `src/shell/`.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

- **[Dev/green] RED phase mis-pointed the fix direction — corrected per user ruling.** The RED tests (`surface-projection-scale.test.ts`, and an edit to `surface-maze-field.test.ts`) assumed the surface should scale *down* to the ÷30 presentation frame (`pos == e.x * GROUND_MODEL_SCALE`, envelope within `3600/6000`). Investigation showed the opposite: the surface **simulation** (maze positions `$8000`, scroll `$100/frame`) is authentic **raw ROM units**, pinned & ROM-cited by `surface-pacing.test.ts` (`WSMAIN.MAC:1621`); the whole post-sw10-1 game uses raw units (`$4000=1.0`, TIE spawn `$7C00`). The **stale pre-migration presentation-scale fudge is the surface VISUAL layer** — `GROUND_MODEL_SCALE=1/30`, `SKIM_ALTITUDE=128`, grid `3600/6000`, heights `352` — exactly what the 2026-08-08 projection audit §5/§6.2 flagged for re-derivation once the lens landed (it did, sw10-1). WYSIWYG (`surface-aim-wysiwyg.test.ts`: aim=render=collision all key off `turret.pos`) forbids a render-only patch. **User ruled: Raw ROM units (audit §6.2).** Fix re-derives the surface visual constants to raw (`GROUND_MODEL_SCALE→1`, camera seat `GD$MDT=3840`, `TOWER_HEIGHT→10560`, grid ×30, hit-radius/heights ×30), leaving the ROM-faithful sim/pacing untouched. RED tests re-pointed to the raw invariant. **Camera pitch & targeting feel change — flagged for playtest per the audit's §6.3.**