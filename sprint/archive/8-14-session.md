---
story_id: "8-14"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-14: Cabinet-style targeting reticle — converging cyan crosshair chevrons + green lock-on circle on target (Wave 1)

## Story Details
- **ID:** 8-14
- **Jira Key:** (none — Jira not in use for this project)
- **Workflow:** tdd
- **Repo:** star-wars
- **Points:** 3
- **Priority:** p2
- **Stack Parent:** none

## Acceptance Criteria

### Targeting Reticle Core Logic (RED)
1. **Pure lock-on detection function:** A deterministic pure function in `src/core/` (e.g., `core/targeting.ts` or extension to `gameRules.ts`) computes whether a 3D target (enemy) is locked-on when projected to screen space. The function `isLocked(targetPos: Vec3, aimX: number, aimY: number, aspect: number, lockRadiusPixels: number): boolean` returns true when the projected screen distance from the aiming point to the target is ≤ lockRadiusPixels. Lock radius is constant in screen space (e.g., ~40 pixels, matching the Atari cabinet).

2. **Chevron convergence geometry:** The targeting reticle converges from four corner chevrons toward the screen center. The convergence distance is a pure function of fire-system state or a fixed visual parameter (chevron span shrinks/swells to indicate readiness). Chevron convergence logic, if state-driven, lives in `core/` as a pure function; static geometry lives in `shell/render.ts`.

3. **Lock-on state tracking in GameState:** `GameState` carries a `lockedTarget?: Enemy` field (optional; null when nothing is locked) OR an equivalently derived query function; the lock-on detection runs each frame in `stepGame()` to update this state. State mutations happen in `core/sim.ts`; rendering queries this state.

4. **Unit tests for lock-on detection:** Core targeting tests in `tests/core/targeting.test.ts` (or similar) verify:
   - Lock-on detects an enemy at the exact screen center (aimX=0, aimY=0)
   - Lock-on fails when an enemy is outside the radius
   - Lock-on works at screen edges and corners
   - Off-screen or behind-camera enemies do not lock
   - Lock-on is consistent under a fixed RNG seed across frames
   - Locking behavior respects the fixed lock radius (screen-space), not 3D distance

### Targeting Reticle Rendering (GREEN)
5. **Cyan converging crosshair chevrons:** The `drawCrosshair()` function in `shell/render.ts` is enhanced to render four inward-pointing arrows (chevrons) positioned at cardinal screen locations, converging toward the center. Chevrons are glowing cyan (#00e5ff, matching existing cockpit color) with `shadowBlur` for the vector-CRT effect. The chevron geometry (size, angle, convergence rate) is derived from the core's convergence function or a static parameter.

6. **Green lock-on circle on target:** When `state.lockedTarget` is non-null, render a glowing green circle at the locked target's projected screen position. Circle radius ≈ lock radius (screen-space pixels). Green color (#9dff00, reusing BOLT_GLOW or a dedicated LOCK_GLOW constant) with `shadowBlur` for consistency.

7. **No reticle obscuration:** The reticle does not obscure the player's aim or the 3D scene. It is drawn AFTER the 3D scene so it composites on top without depth clash.

8. **Rendering guard:** The rendering function respects the core/shell boundary — it consumes computed state (locked target, chevron convergence) without re-computing game logic. All 3D→screen projection uses the Math Box (via `project()` in `shell/wireframe.ts`).

### Integration & Quality
9. **No debug code:** No console logs, `debugger` statements, or feature flags in final implementation.

10. **Visual fidelity on cabinet:** Eyeball the reticle in `npm run dev` (Vite dev server on port 5274):
    - Cyan chevrons converge cleanly toward the screen center
    - Green lock-on circle appears around TIE fighters when they enter the lock radius
    - Reticle glows with the same vector-CRT aesthetic as the existing crosshair and enemy models
    - No flickering or clipping
    - Lock-on responds smoothly to target motion

11. **Test coverage:** `npm test` passes all targeting tests and existing Wave 1 tests.

## Technical Context

### Existing Architecture (Reuse Points)
- **Crosshair precedent:** `shell/render.ts` line 240–263, `drawCrosshair()` — renders a simple cyan cross based on `crosshairNdc(aimX, aimY)` from `gameRules.ts`. The new reticle extends this pattern with converging chevrons and lock-on detection.
- **Math Box & projection:** `core/math3d.ts` — all 3D math is pure and unit-tested. `shell/wireframe.ts` provides `project(Vec3, Mat4, w, h)` to convert world-space 3D points to screen coordinates. Use this for lock-on radius calculations and rendering.
- **GlowText & vector styling:** `shell/render.ts` lines 358–387, `glowText()` — the cabinet visual language: shadowBlur for glow, cyan/green color palette, vector font. Lock-on circle and chevrons follow the same pattern.
- **Target representation:** `GameState.enemies: Enemy[]` — each enemy has a 3D world-space `pos` and an `orient` (rotation matrix). Collision tests already use 3D distance (see `gameRules.ts`, `collides()`). Lock-on detection mirrors this: compute projected screen distance from the aiming point.

### Wave 1 Integration
- **Story 8-13 (TIE banking):** TIEs now bank at the player (compute `orient` in core, render applies it). The reticle chevrons naturally track whether each enemy is centered.
- **Story 8-16 (combat kill loop):** Firing must hit what the reticle covers. Lock-on circle provides visual feedback that the aiming point and the target align.
- **Story 8-17 (cabinet HUD header):** The reticle and the HUD header (SCORE / SHIELDS / WAVE) are both framing layer elements drawn after the 3D scene. They coexist without depth interference.

### Core/Shell Boundary Maintenance
- **Pure core constraint:** Lock-on detection is a pure function: `isLocked(pos, aimX, aimY, aspect, radius)` with no DOM/canvas/time/randomness. It passes a seeded-RNG test suite.
- **Shell rendering:** Chevrons and lock-on circle are deterministic canvas strokes. No game logic lives in `shell/render.ts`.
- **No DOM crossover:** The reticle is purely Canvas 2D; no HTML/CSS positioning.

### Cabinet Reference
The cabinet's targeting reticle (Atari 1983 Star Wars) features:
- Converging cyan crosshair lines (chevrons or arrows) pointing toward the center
- A green or amber circle that lights up over a locked target
- The reticle itself does not fire; it is purely visual feedback for the player's aim

Authentic behavior: when the player's aim box (the reticle's lock radius) overlaps a TIE's projected screen position, a green light confirms the lock; the lock persists as long as the TIE stays in radius, providing the player confidence that their next shot will connect.

### Testing Pattern (Mirrors Wave 1 Suite)
See `tests/core/space-combat.test.ts` for the pattern:
- Fix a seed: `const wave = (seed = 1983): GameState => initialState(seed)`
- Step the game with `stepGame(state, input, dt)`
- Assert observable state (enemies, locks, projectiles) — not internal shape

For the reticle, tests verify:
- `stepGame()` updates lock-on state correctly
- `project()` places the lock-on circle at the expected screen location
- Rendering does not crash with various lock/no-lock states

### Files to Create/Modify
1. **Create:** `src/core/targeting.ts` (or extend `gameRules.ts`) — pure lock-on detection functions
2. **Modify:** `src/core/state.ts` — add `lockedTarget?: Enemy` to `GameState` (or equivalent query)
3. **Modify:** `src/core/sim.ts` — update lock-on state in `stepGame()` each frame
4. **Modify:** `src/shell/render.ts` — enhance `drawCrosshair()` with chevrons; add `drawLockOnCircle()` function
5. **Create:** `tests/core/targeting.test.ts` — unit tests for lock-on detection
6. **Modify:** `tests/shell/render.player-laser.test.ts` (or create a targeting render test) — eyeball checks for chevron/circle geometry (if doing render testing)

---

## Workflow Tracking

**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-29T00:26:04Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T23:45:32Z | 2026-06-28T23:49:09Z | 3m 37s |
| red | 2026-06-28T23:49:09Z | 2026-06-29T00:04:53Z | 15m 44s |
| green | 2026-06-29T00:04:53Z | 2026-06-29T00:14:07Z | 9m 14s |
| review | 2026-06-29T00:14:07Z | 2026-06-29T00:26:04Z | 11m 57s |
| finish | 2026-06-29T00:26:04Z | - | - |
| red | - | 2026-06-29T00:04:53Z | unknown |
| green | 2026-06-29T00:04:53Z | 2026-06-29T00:14:07Z | 9m 14s |
| review | 2026-06-29T00:14:07Z | 2026-06-29T00:26:04Z | 11m 57s |
| finish | 2026-06-29T00:26:04Z | - | - |
| green | - | 2026-06-29T00:14:07Z | unknown |
| review | 2026-06-29T00:14:07Z | 2026-06-29T00:26:04Z | 11m 57s |
| finish | 2026-06-29T00:26:04Z | - | - |
| review | - | 2026-06-29T00:26:04Z | unknown |
| finish | 2026-06-29T00:26:04Z | - | - |
| finish | - | - | - |

## Sm Assessment

The sprint reveals itself through careful study. Three observations frame this story.

**The board was genuinely clear before setup.** Heeding the 6-11 lesson, I ran `git fetch --prune` on star-wars before trusting the gate: develop advanced (`886be55..94af94c`), a stale `fix/8-16-combat-kill-loop` branch was pruned, and `gh pr list` returned no open PRs. No phantom this time — the merge gate is honestly clear, and this branch is cut from the latest develop.

**This is a HUD/render story with a deliberately-extracted testable seam.** The reticle itself (converging cyan chevrons + green lock-on circle) is drawn in `src/shell/render.ts`, which TDD cannot unit-test. The setup therefore split the work: the *pure* logic — lock-on detection (is an enemy within the screen-space lock radius?) and chevron-convergence geometry — belongs in `src/core/` (or a pure module) and is what Han Solo will pin with failing tests; the glow rendering stays in the shell and is validated by eyeball on the dev server. Watch for the trap of testing render output instead of the geometry/state seam.

**Two standing constraints bind every phase:** (1) **core purity** — `src/core/` is deterministic (no DOM, no wall-clock, no `Math.random`; screen projection via the Math Box `project()`), so lock-on detection must be a pure function of projected positions; (2) the story shares the **cabinet visual language** with siblings 8-13 (TIE banking), 8-16 (kill loop), 8-17 (HUD header) — glowing cyan/green vectors on black; reuse the existing crosshair + glow constants rather than inventing a parallel style.

**Routing:** phased TDD, setup complete. Next phase **RED**, owned by **Han Solo (TEA)** — author failing, seeded, deterministic core tests for lock-on detection and chevron convergence (`tests/core/targeting.test.ts`).

## TEA Assessment

**Tests Required:** Yes
**Reason:** The story has a deliberately-extracted pure seam — lock-on detection. That is real, deterministic logic and gets pinned. The reticle's *visuals* (cyan chevrons, the green ring's glow) are shell render, validated by eyeball (AC-10), not unit-tested.

**Test Files:**
- `tests/core/targeting.test.ts` — 14 failing tests over the new pure lock-on surface in `src/core/gameRules.ts`.

**New pure surface the suite drives (RED until Dev builds it):**
- `LOCK_RADIUS_NDC: number` — reticle lock radius in normalised-device units (also the green circle's on-screen radius).
- `isLocked(enemyPos, aimX, aimY, aspect?): boolean` — true when the enemy projects **in front** of the camera and within `LOCK_RADIUS_NDC` of the reticle NDC `[aimX, aimY]`. Pure.
- `lockedEnemy(state, aspect?): Enemy | null` — the single enemy the green circle rings: the **nearest** one under the reticle, or `null`.

**Why NDC, not pixels:** lock-on is the dual of the firing aim (`crosshairNdc`/`aimDirection`) — a point down the bolt's path projects back onto the reticle, so "locked ⟺ next shot hits." Computing pixels in core would need the canvas height and break core purity. See the Conflict finding + the AC-1 deviation.

**Tests Written:** 14 tests covering ACs 1, 3, 4 (the core seam). ACs 2, 5–8, 10 are shell/eyeball (GREEN).
**Status:** RED (14 failing — `isLocked`/`lockedEnemy`/`LOCK_RADIUS_NDC` not yet exported). Full suite: 285 pre-existing pass, **zero regressions** (verified by testing-runner).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| AC-4 lock at screen centre | `locks a TIE dead ahead when the reticle is on it` | failing |
| AC-4 miss outside radius | `does NOT lock when the reticle is nowhere near the TIE` | failing |
| AC-4 edges & corners | `locks an OFF-CENTRE TIE…`, `…at a screen CORNER…`, `respects the viewport aspect…` | failing |
| AC-4 off-screen/behind never locks | `never locks a target BEHIND the camera`, `does not lock a TIE that has flown behind the cockpit` | failing |
| AC-4 respects fixed lock radius (not 3D dist) | `locks just inside and releases just outside the lock radius`, `uses a sane lock radius` | failing |
| AC-4 deterministic under fixed seed | `is a pure function…` (isLocked), `is deterministic — the same seeded state…` (lockedEnemy) | failing |
| AC-1 lock-on detection is pure (no DOM/time/rng) | NDC-only signature; `is a pure function…` | failing |
| AC-3 null when nothing locked (TS #4 null-handling) | `returns null when nothing is under the reticle` | failing |
| AC-3 nearest target selected | `rings the NEAREST TIE when two overlap the reticle` | failing |
| TS #8 test quality (meaningful assertions) | self-check below | n/a |

**Rules checked:** AC-4's six required cases all have ≥1 test; the core-purity rule and TS null-handling (#4) are pinned by the NDC-only signature, the null paths, and the two determinism tests. The pixel-distance rule the TS checklist would expect is deliberately **not** followed (core purity wins — logged as Conflict + deviation).
**Self-check:** 14/14 tests carry meaningful assertions (boolean lock states, `.toEqual(pos)` on the selected enemy, numeric bounds on the constant). 0 vacuous tests — no `let _ =`, no `assert(true)`, no `is_none()`-on-always-null.

**Handoff:** To Yoda (Dev) for implementation (GREEN).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `src/core/gameRules.ts` — added the pure lock-on seam: `LOCK_RADIUS_NDC = 0.12` (NDC), `isLocked(enemyPos, aimX, aimY, aspect?)` (front-of-camera guard + NDC distance ≤ radius, projected through the Math Box's `perspective`/`transform`), and `lockedEnemy(state, aspect?)` (nearest locked TIE by distance from the cockpit, else `null`). No DOM/time/randomness — boundary intact.
- `src/shell/render.ts` — wired the visible reticle (AC-5/6/7/8): `drawCrosshair` now frames the centre cross with four converging cyan chevrons; new `drawLockOn` strokes the green ring (`BOLT_GLOW`, `shadowBlur`) around `lockedEnemy(state, w/h)` at `LOCK_RADIUS_NDC * (h/2)` px, drawn under the crosshair and after the 3D scene. Lock-on is naturally space-phase-only (surface/trench carry no `enemies`).
- `tests/shell/render.tie-orient.test.ts`, `tests/shell/render.player-laser.test.ts` — added a no-op `arc()` to each hand-rolled canvas stub so `render()`'s new ring path doesn't crash the mock (see the Improvement finding).

**Approach notes:**
- Lock-on is the **dual of the firing aim** — same `FOV_Y` + `perspective`, so "locked ⟺ the next shot connects." Pinned in NDC, not pixels, to keep core pure (TEA's AC-1 deviation + the Conflict finding).
- **No `sim.ts`/`GameState` change** — lock is a pure derived query (AC-3's sanctioned branch); chevrons are **static shell geometry** (no core convergence). Both logged under Dev deviations.
- `LOCK_RADIUS_NDC = 0.12` → ~36 px at 600 px tall, matching the cabinet's ~40 px feel; comfortably inside the test's (0.02, 0.3) sanity bounds. A locked shot's lateral offset (≤ ~83 world units at z = −1200) sits well within `TIE_HIT_RADIUS` (250), so the ring never lies.

**Tests:** 299/299 passing (GREEN) — 14 new targeting tests + 285 pre-existing, zero regressions. `npm run build` (tsc --noEmit + vite) clean. Verified by testing-runner.

**Self-review (judgment checks):**
- ✅ Wired to the front end — `render()` calls `drawLockOn`/`drawCrosshair` on the playing path.
- ✅ Follows project patterns — projection via the Math Box; glow/`shadowBlur` + cyan/green palette reuse existing constants (`GLOW`, `BOLT_GLOW`).
- ✅ ACs met — core seam (1,3,4) under test; visuals (5,6,7,8) wired; no debug code (9); test coverage (11). AC-10 (eyeball on :5274) is the remaining manual check.
- ✅ Error handling — `isLocked` guards behind-camera/on-plane targets; `drawLockOn` no-ops when nothing is locked or the target won't project.

**Eyeball note for review (AC-10):** confirm on `npm run dev` (port 5274) — cyan chevrons converge cleanly, the green ring lights on a TIE as it enters the reticle and tracks it, glow matches the cabinet, no flicker/clipping.

**Handoff:** To Obi-Wan Kenobi (Reviewer) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells, 299/299 tests, build clean | N/A |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings (edge assessed by reviewer) |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings (silent-failure assessed by reviewer) |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings (test quality assessed by reviewer + rule-checker) |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings (comments assessed by reviewer) |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings (type design assessed by reviewer + rule-checker) |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings (no attack surface — client-only game, no input/auth/secrets) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings (complexity assessed by reviewer) |
| 9 | reviewer-rule-checker | Yes | findings | 1 (17 rules / 55 instances) | confirmed 1 (LOW), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` settings, pre-filled as Skipped)
**Total findings:** 1 confirmed (LOW, test-only), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The production code is clean across all 17 rules the rule-checker enumerated (55 instances) and across my own adversarial pass. The single confirmed finding is a LOW test-hygiene nit (a missing null-guard before a non-null assertion) that does not reduce the test's protective value and does not meet the Critical/High blocking threshold. Tracked as a non-blocking Delivery Finding for cleanup.

**Data flow traced:** `state.aimX/aimY` (yoke, core) + `state.enemies[].pos` (3D world space, core) → `lockedEnemy(state, w/h)` → `isLocked` projects each enemy through the Math Box (`perspective`∘`transform`) to NDC and compares `Math.hypot(Δndc) ≤ LOCK_RADIUS_NDC` → nearest match returned to `drawLockOn`, which `project()`s it to pixels and strokes the green ring. Safe: every step is null-guarded or pure; no canvas size enters the core hit-test.

**Observations (8 — issues + verifieds, tagged by source):**
1. `[VERIFIED]` **Core purity intact** — `isLocked`/`lockedEnemy` (`gameRules.ts:53-80` new block) import only `./math3d` + `./state`, use only `Math.hypot` and Math Box calls; no DOM/`Date.now`/`Math.random`/`requestAnimationFrame`/shell import. Complies with the sacred core boundary (CLAUDE.md). Corroborated by rule-checker #14.
2. `[VERIFIED]` **Math Box discipline** — projection via `transform(perspective(FOV_Y, aspect, 1, 5000), enemyPos)` and `project()` in `wireframe.ts`; no ad-hoc trig. `Math.hypot` on already-projected NDC is arithmetic, not 3D math (math3d has no Vec2 helper). Rule-checker #15.
3. `[VERIFIED]` **Hit-test stays in NDC, never pixels** — `LOCK_RADIUS_NDC` is NDC; the shell's `LOCK_RADIUS_NDC * (h/2)` is display-only ring radius. Honours "hit-tests in 3D/NDC, never screen pixels." Rule-checker #17. This is the crux of TEA's AC-1 deviation and it is implemented correctly.
4. `[VERIFIED]` **No stale-TIE ring in surface/trench** — `drawLockOn`'s "surface/trench carry no enemies" claim holds because `enterPhase` sets `enemies: []` on every transition (`sim.ts:418-423`). So the un-phase-gated `drawLockOn` call is safe: `lockedEnemy` returns `null` when there are no TIEs. `[EDGE]` boundary I chased — confirmed benign.
5. `[VERIFIED]` **Null paths guarded** — `lockedEnemy` returns `Enemy | null`; `drawLockOn` guards `if (!target) return` and `if (!c) return` before any access; `project()` may return `null` and is handled. `[SILENT]`: the early returns are intentional "draw nothing," not swallowed errors. Rule-checker #4.
6. `[LOW]` `[EDGE]` **Front-cull threshold mismatch (benign)** — `isLocked` culls `enemyPos[2] >= 0` while `project()` culls `z >= -NEAR` (−1) at `wireframe.ts:33`. A target in `z ∈ [−1, 0)` could be "locked" but not projected → `drawLockOn` no-ops (no ring), never a crash or false ring. No enemy ever occupies that 1-unit band (TIEs live at z≈−1200, removed at the cockpit). Worst case: one missing ring frame in an unreachable state. Non-blocking; could align to `< -NEAR` only if core ever imports a near constant (it shouldn't — that's a shell value).
7. `[LOW]` `[SIMPLE]` **Lock zone is an NDC circle → screen ellipse; ring drawn as a pixel circle** — `isLocked` compares an NDC-circle radius, but NDC→screen scales X by `w/2`, Y by `h/2`, so the true lock region is a mild ellipse on non-square viewports while the ring (`ctx.arc`, single radius `R*(h/2)`) is a circle. On 4:3 the ring under-shows the horizontal lock extent by ~12px. Cosmetic only; AC-6 explicitly specifies a "circle" and "radius ≈ lock radius," so this is per-spec. `[TYPE]`/`[SEC]`: no type or security concern in this domain (client-only render, no input/auth/secrets).
8. `[LOW]` `[TEST]` `[RULE]` **Missing null-guard before non-null assertion** — `tests/core/targeting.test.ts:186` uses `b!.pos` where `b: Enemy | null` was never null-asserted (only `a` is guarded at line 185). Matches TS checklist #1 (`!` on a nullable). Confirmed (cannot dismiss a rule-matching finding). **Severity LOW**: if determinism broke and `b` were `null`, the test still *fails* (throws on the deref) rather than passing — protective value intact; production code unaffected. `[DOC]`: comments reviewed and accurate (the "no enemies in surface/trench" comment verified against `sim.ts:423`). One-line fix (`expect(b).not.toBeNull()`); tracked as a non-blocking Delivery Finding.

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md` + the sacred core/shell boundary (CLAUDE.md). Exhaustive enumeration confirmed by `reviewer-rule-checker` (17 rules, 55 instances):

| Rule | Instances | Verdict |
|------|-----------|---------|
| #1 Type-safety escapes (`as any`/`!`/`@ts-ignore`) | 12 | **1 violation** — `targeting.test.ts:186` `b!` un-guarded (LOW, test-only); all production code clean |
| #2 Generics/interfaces (readonly params) | 6 | compliant — `Vec3`/`Mat4` readonly; `GameState`/`Enemy` params match existing callers |
| #4 Null/undefined handling | 4 | compliant — `Enemy | null` returned & guarded; no `||` on nullable |
| #5 Module/declaration (`import type`) | 4 | compliant — inline `type` specifiers; resolves to `src/`, not `dist/` |
| #8 Test quality | 14 | compliant except #1 nit above — no `as any` in asserts, no `vi.mock` misuse |
| #12 Performance/bundle | 3 | compliant — direct module imports, no barrels |
| Core purity (sacred) | 3 | compliant — no DOM/time/random/shell import in core |
| Math Box discipline (sacred) | 4 | compliant — projection via math3d; no ad-hoc trig |
| Shell does no game math (sacred) | 3 | compliant — lock decision delegated to core `lockedEnemy`; shell scales NDC→px only |
| Hit-tests in NDC not pixels (sacred) | 2 | compliant — `LOCK_RADIUS_NDC` in NDC; no canvas size in core |
| #3/#6/#7/#9/#10/#11/#13 | 0 | not applicable (no enums/JSX/async/config/user-input/try-catch/fix-commit in diff) |

### Devil's Advocate

Suppose I want this code to be broken. Where do I attack? First, the **lock radius constant**: `LOCK_RADIUS_NDC = 0.12` is a single magic number — if it were too large the ring would lock half the sky and "the circle never lies" becomes a lie (shots fired at a loosely-"locked" TIE would miss). I checked the geometry: at z=−1200, 0.12 NDC ≈ 83 world units of lateral offset, well inside `TIE_HIT_RADIUS` (250), so a locked shot genuinely connects — the invariant holds. Second, **the un-phase-gated `drawLockOn`**: it runs every playing frame regardless of phase, so if a TIE ever survived into the surface phase the player would see a green ring with no ship. I traced `enterPhase` (`sim.ts:418-423`) and it hard-clears `enemies: []` and `enemyShots: []` on every transition — the door is shut. Third, **a confused user** at an extreme aspect ratio: the lock region is a slight ellipse while the ring is a circle, so a TIE could read as "just outside" the drawn ring yet still be locked. That is cosmetic and AC-sanctioned (AC-6: circle, "≈"), not a correctness break — the shot still hits because the hit-test is the NDC compare, not the drawn pixels. Fourth, **a stressed test environment**: the new `ctx.arc` would crash any render test whose mock lacked it — Dev pre-empted this by patching both sibling mocks and filed the shared-mock improvement. Fifth, **NaN/degenerate inputs**: a NaN aim makes `Math.hypot` NaN, `NaN <= R` is `false` → no lock, no crash; `h = 0` gives `r = 0`, `ctx.arc(…,0,…)` draws nothing. The one thing the devil *does* find is the `b!` nit — a broken-determinism failure would surface as a null-deref stack trace instead of a clean Vitest diff. Annoying, not dangerous, and logged. Nothing here rises to High.

**Pattern observed:** Lock-on implemented as the deterministic *dual* of the firing aim (`gameRules.ts:53-80`) — same `FOV_Y`/projection, so the green ring provably coincides with where a bolt lands. Excellent reuse of the existing aim machinery rather than a parallel pixel hit-test.

**Error handling:** `drawLockOn` (`render.ts`) null-guards both `lockedEnemy` and `project()`; `isLocked` rejects behind-camera targets before projecting. No unhandled paths.

**Handoff:** To Grand Admiral Thrawn (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): AC-1 specifies a screen-pixel lock radius and signature (`isLocked(..., aspect, lockRadiusPixels)`, "projected screen distance ... ≤ lockRadiusPixels", "~40 pixels"). A pixel distance cannot be computed in the pure core without the canvas height (a DOM/shell value), so AC-1 conflicts with the sacred core-purity boundary (CLAUDE.md: "hit-tests computed in 3D/NDC, NEVER in screen pixels"). Resolved in test design by pinning lock-on in normalised-device space (`LOCK_RADIUS_NDC` + an NDC distance compare), which is also the exact dual of the firing aim (`crosshairNdc`/`aimDirection`) so "locked ⟺ the next shot hits." Affects `src/core/gameRules.ts` (Dev exports an NDC constant + NDC compare, not a pixel param) and the AC-1 text in `sprint/context/context-story-8-14.md` / the session (signature should drop `lockRadiusPixels`); the shell scales the NDC radius to a pixel circle for the green ring (AC-6). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): Each shell render test hand-rolls its own minimal `CanvasRenderingContext2D` stub (`render.tie-orient.test.ts`, `render.player-laser.test.ts`, `wireframe.test.ts`), so a new `ctx` method used by `render()` (here `arc`, for the lock-on ring) silently breaks whichever stub omits it — exactly what 8-14 hit. A single shared canvas-mock helper would stop this per-method drift. Affects `tests/shell/*` (extract a shared `makeCtx`/canvas-stub helper). *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `tests/core/targeting.test.ts:186` uses `b!.pos` (non-null assertion on `b: Enemy | null`) without a preceding `expect(b).not.toBeNull()` — only `a` is guarded (line 185). Matches TS lang-review check #1. Severity LOW: a broken-determinism failure still fails the test (it throws on the deref) rather than passing, so coverage is intact; this only degrades the failure *message*. Affects `tests/core/targeting.test.ts` (add `expect(b).not.toBeNull()` before line 186). *Found by Reviewer during code review.*

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Lock-on pinned in NDC, not screen pixels**
  - Spec source: session AC-1 (context-story-8-14)
  - Spec text: "`isLocked(targetPos, aimX, aimY, aspect, lockRadiusPixels): boolean` returns true when the projected screen distance from the aiming point to the target is ≤ lockRadiusPixels. Lock radius is constant in screen space (e.g., ~40 pixels)."
  - Implementation: Tests pin `isLocked(enemyPos, aimX, aimY, aspect?)` comparing the target's projected **NDC** distance to a module constant `LOCK_RADIUS_NDC` (normalised-device units) — no pixel/radius parameter.
  - Rationale: A pixel distance in core needs the canvas height (DOM/shell), violating the sacred core-purity boundary. NDC makes lock the exact dual of the firing aim (`crosshairNdc`/`aimDirection`), so "locked ⟺ next shot hits"; the shell converts `LOCK_RADIUS_NDC` → a pixel circle for the green ring (AC-6).
  - Severity: minor
  - Forward impact: Dev implements the NDC compare and exports `LOCK_RADIUS_NDC`; `render.ts` scales it to pixels. AC-1's signature text should drop `lockRadiusPixels`. (See Delivery Findings — Conflict.)
- **Locked target as a derived query, not a stored GameState field**
  - Spec source: session AC-3 (context-story-8-14)
  - Spec text: "`GameState` carries a `lockedTarget?: Enemy` field ... OR an equivalently derived query function; the lock-on detection runs each frame in `stepGame()`."
  - Implementation: Tests pin `lockedEnemy(state): Enemy | null`, a pure derived query over `state.enemies`, rather than a stored `GameState.lockedTarget` updated in `stepGame`.
  - Rationale: AC-3 explicitly sanctions "an equivalently derived query function." A derived query has no stale-state risk and leaves `stepGame`/`GameState` untouched; render calls `lockedEnemy(state)` each frame.
  - Severity: minor
  - Forward impact: `stepGame`/`GameState` unchanged for lock state; `render.ts` calls `lockedEnemy(state)` to find the TIE to ring.
- **Chevron convergence not unit-tested (treated as static shell geometry)**
  - Spec source: session AC-2 / AC-4 (context-story-8-14)
  - Spec text: AC-2 "Chevron convergence logic, if state-driven, lives in core as a pure function; static geometry lives in shell/render.ts." AC-4's required test list covers lock-on detection only.
  - Implementation: No core test for chevron convergence; chevrons are treated as static shell geometry (AC-2's "fixed visual parameter" branch), validated by eyeball (AC-10).
  - Rationale: The cabinet reticle's chevrons are fixed, not fire-state-driven; with no state-driven convergence in scope there is no pure function to test, and AC-4 requires none. Drawing them is a shell concern.
  - Severity: minor
  - Forward impact: Dev draws static converging chevrons in `render.ts` (`drawCrosshair`); no core convergence module. If a later story makes chevrons fire-state-driven, that logic moves to core with its own tests.

### Dev (implementation)
- **No stored lock state; `sim.ts`/`stepGame` untouched (derived-query branch of AC-3)**
  - Spec source: session AC-3 (context-story-8-14)
  - Spec text: "the lock-on detection runs each frame in `stepGame()` to update this state. State mutations happen in `core/sim.ts`; rendering queries this state."
  - Implementation: No `lockedTarget` field added to `GameState`; `sim.ts`/`stepGame` unchanged. Lock-on is the pure derived query `lockedEnemy(state, aspect)` in `gameRules.ts`, called by `render.ts` each frame — implementing the derived-query branch AC-3 sanctions and that TEA's tests pinned.
  - Rationale: A per-frame derived query cannot go stale and keeps transient lock state out of the serialisable `GameState`. AC-3 explicitly allows "an equivalently derived query function."
  - Severity: minor
  - Forward impact: none — `render.ts` reads `lockedEnemy(state, w/h)`; no sibling relies on a stored `lockedTarget`.
- **Reticle chevrons drawn as static shell geometry (implements TEA test-design deviation #3)**
  - Spec source: session AC-2 / AC-5 (context-story-8-14)
  - Spec text: AC-2 "static geometry lives in `shell/render.ts`"; AC-5 "render four inward-pointing arrows (chevrons) … converging toward the center … derived from the core's convergence function or a static parameter."
  - Implementation: Four fixed inward arrowheads (constant `GAP`/`CHEV`) added to `drawCrosshair` in `shell/render.ts`; no core convergence function, no fire-state coupling. Green lock ring is `LOCK_RADIUS_NDC * (h/2)` px, cyan chevrons + cross unchanged in colour.
  - Rationale: The cabinet reticle's chevrons are fixed, not fire-driven; AC-5's "static parameter" branch + AC-2's "static geometry lives in shell." No state-driven convergence in scope.
  - Severity: minor
  - Forward impact: none — purely visual; a future fire-readiness animation would move convergence into core with tests.

### Reviewer (audit)
- **TEA — Lock-on pinned in NDC, not screen pixels** → ✓ ACCEPTED by Reviewer: the sacred core-purity boundary (no canvas size in core) outranks AC-1's pixel wording, and NDC makes lock the exact dual of the firing aim — verified the geometry holds (0.12 NDC ≈ 83 world units at z=−1200, inside `TIE_HIT_RADIUS` 250). The AC-1 text should be updated to drop `lockRadiusPixels` (already filed as the TEA Conflict finding).
- **TEA — Locked target as a derived query, not a stored GameState field** → ✓ ACCEPTED by Reviewer: AC-3 explicitly sanctions "an equivalently derived query function"; a per-frame pure query cannot go stale and keeps transient state out of `GameState`.
- **TEA — Chevron convergence not unit-tested (static shell geometry)** → ✓ ACCEPTED by Reviewer: AC-2's "fixed visual parameter / static geometry lives in shell" branch applies; the cabinet chevrons are not fire-state-driven, so there is no core function to test — eyeball (AC-10) is the right gate.
- **Dev — No stored lock state; `sim.ts`/`stepGame` untouched** → ✓ ACCEPTED by Reviewer: the faithful realization of TEA's AC-3 deviation; verified `lockedEnemy` is the sole lock path and no sibling depends on a stored `lockedTarget`. `enterPhase` already clears `enemies` between phases (`sim.ts:423`), so the derived query is safe in every phase.
- **Dev — Reticle chevrons drawn as static shell geometry** → ✓ ACCEPTED by Reviewer: consistent with TEA deviation #3; chevrons are fixed-pixel screen geometry with no game logic, drawn in the shared cyan glow — honours the shell-does-no-game-math rule.

All five logged deviations accepted; no undocumented deviations found during review.

---

**Branch:** feat/8-14-targeting-reticle
**Branch Strategy:** gitflow (star-wars uses develop as base, not main)

## Impact Summary

**Upstream Effects:** 1 findings (0 Gap, 0 Conflict, 0 Question, 1 Improvement)
**Blocking:** None

- **Improvement:** Each shell render test hand-rolls its own minimal `CanvasRenderingContext2D` stub (`render.tie-orient.test.ts`, `render.player-laser.test.ts`, `wireframe.test.ts`), so a new `ctx` method used by `render()` (here `arc`, for the lock-on ring) silently breaks whichever stub omits it — exactly what 8-14 hit. A single shared canvas-mock helper would stop this per-method drift. Affects `tests/shell/*`.

### Downstream Effects

- **`tests/shell`** — 1 finding

