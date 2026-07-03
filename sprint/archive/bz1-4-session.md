---
story_id: bz1-4
jira_key: ""
epic: bz1
workflow: tdd
---
# Story bz1-4: Tank movement — dual-tread steering, heading/position, obstacle collision, viewport framing

## Story Details
- **ID:** bz1-4
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T17:12:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T16:18:24Z | 2026-07-03T16:21:44Z | 3m 20s |
| red | 2026-07-03T16:21:44Z | 2026-07-03T16:43:04Z | 21m 20s |
| green | 2026-07-03T16:43:04Z | 2026-07-03T16:58:52Z | 15m 48s |
| review | 2026-07-03T16:58:52Z | 2026-07-03T17:12:54Z | 14m 2s |
| finish | 2026-07-03T17:12:54Z | - | - |

## Sm Assessment

**Story selection:** User requested "next up, bz1-4" immediately after finishing bz1-3. bz1-4 was the top unblocked backlog story in epic bz1 (`depends_on: null`, p2, 3 pts) and is the natural successor to bz1-3 — the render foundation is merged, so tank movement now has a camera/projection pipeline and a static 21-obstacle field to steer through. Merge gate clear: bz1-3's PR #1 is merged, no blocking open PRs.

**Setup verification:**
- Session file created with story fields, tdd workflow tracking, and empty Delivery Findings / Design Deviations sections.
- Story context written to `sprint/context/context-story-bz1-4.md` (was empty; sm-setup authored 5 ACs + technical approach, surfacing the four bz1-3 forward findings so TEA/Dev pick them up: OBSTACLE_MODEL readonly, per-edge near-plane clipping, three test-coverage gaps, and the GROUND_Y = −640 / eye-at-y-0 placement contract).
- Feature branch `feat/bz1-4-tank-movement` created in the `battlezone` subrepo off `develop` (d9ca731 — the bz1-3 merge), gitflow.
- Sprint YAML (`sprint/epic-bz1.yaml`) updated: bz1-4 → in_progress with branch reference.
- Jira: skipped — this project tracks issues locally in sprint YAML; there is no Jira instance.

**Routing decision:** Workflow is `tdd` (phased). Next phase is `red`, owned by TEA (Imperator Furiosa), who will author failing tests for tank movement: dual-tread steering kinematics, heading/position integration, obstacle collision against the ROM-positioned field, and viewport framing — all in pure `src/core` per the epic's core/shell purity non-negotiable. Handing off via the standard exit protocol.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the tread-speed, turn-rate, and obstacle collision-radius CONSTANTS the story assumed bz1-2 would land are NOT in `core/` or the findings doc — bz1-2 ported obstacles/models/scoring but no movement kinematics (verified: `docs/battlezone-1980-source-findings.md` has no movement section; grep of `src/core/` finds no speed/turn/radius constant).
  Affects `battlezone/src/core/movement.ts` (Dev must source tread speed + turn rate from the `reference/` ROM quarry — present in THIS checkout — and derive the obstacle footprint radius from the `models.ts` vertex extents, citing sources; the RED suite is deliberately magnitude-agnostic so any authentic value passes).
  *Found by TEA during test design.*
- **Question** (non-blocking): stop-vs-slide collision response is unconfirmed against the quarry/footage (story context flags it as a feel call).
  Affects `battlezone/src/core/movement.ts` (the RED contract pins only "never ends a step inside a footprint" — true for both hard-stop and slide; Dev picks the response and cites, bz1-12 trues up the feel).
  *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the exact ROM `obstacle_radius` table (address `$6955`, dis65 label `obstacle_radius`) was not byte-decoded; per-type footprint radii are derived instead from the ROM-exact base vertex extents in `models.ts` (circumscribed circle = halfWidth × √2).
  Affects `battlezone/src/core/movement.ts` (a fidelity follow-up could byte-decode `$6955` for the exact per-type collision radii, as bz1-2 did for the position tables).
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): the player forward-step magnitude (cos-scaled ×¾, `$4913-$4928`) and the exact per-frame turn quantum were read structurally from the disassembly labels, not traced to exact 6502 immediates; `MAX_SPEED`/`MAX_TURN_RATE` scale the ROM's 2-steps / 2-units-per-frame structure to per-second at 60 Hz.
  Affects `battlezone/src/core/movement.ts` (bz1-12 playtest trues up feel; a deep-trace could pin exact world-unit magnitudes).
  *Found by Dev during implementation.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Differential-drive tests pin formula SHAPE + invariants, not magnitudes**
  - Spec source: context-story-bz1-4.md, "Technical Approach"
  - Spec text: "do not invent numbers here; wire the formula shape and let bz1-2's exported constants fill it in"
  - Implementation: tests assert differential relationships (straight/reverse along `forwardFromHeading`, in-place antisymmetric pivot, mirror-image single-tread arcs, dt-linear displacement, forward/reverse speed symmetry) — never a specific speed or turn rate
  - Rationale: the constants don't exist yet (logged as a Gap); magnitude-agnostic tests let Dev's quarried values pass unchanged while still failing a broken drive
  - Severity: minor
  - Forward impact: none — if Dev exports named constants a future story may add exact-value fidelity tests
- **Absolute yaw sign (chirality) left unpinned**
  - Spec source: context-story-bz1-4.md, acceptance criteria (pivot / single-tread-arc ACs)
  - Spec text: "opposed treads ... pivot in place — heading changes"; "a single tread forward ... curving toward the idle/slower side"
  - Implementation: tests pin the differential RELATIONSHIPS (left-only vs right-only arc opposite ways; opposed pairs antisymmetric) but not whether right-tread-forward increases or decreases `heading`
  - Rationale: model+camera chirality is an unverified concern carried from bz1-3 (its handedness Question finding); hard-pinning a sign the ROM may contradict would force a mirrored control. Dev derives the sign from the ROM convention (camera.ts: +X screen-left, CCW toward +X); bz1-12 playtest confirms
  - Severity: minor
  - Forward impact: bz1-12 playtest verifies steering handedness (ties to bz1-3's chirality finding)
- **Determinism tested by pure replay, not a seed**
  - Spec source: context-story-bz1-4.md, determinism AC
  - Spec text: "a fixed input script replayed with a fixed dt sequence from a fixed seed produces an identical final (x, z, heading) trajectory"
  - Implementation: determinism asserted via identical-input ⇒ identical-output replay; no RNG/seed is involved because tank kinematics carry no stochastic element
  - Rationale: movement is pure deterministic math — a seed is N/A until stochastic systems (enemy AI bz1-7, spawns) arrive; the substantive guarantee (bit-identical replay) is fully tested
  - Severity: minor
  - Forward impact: none — GameState's seeded RNG lands with the first stochastic story
- **Camera-follows-tank verified structurally (AC 7 is an eyeball check)**
  - Spec source: context-story-bz1-4.md, AC 7
  - Spec text: "Eyeball check on the dev server (:5276): ... the camera follows the tank's pose with the turret fixed forward"
  - Implementation: a core-level structural test asserts the integrated pose drives `tankView` (moving the tank changes the view matrix) and the pose carries no turret field ({x, z, heading} only); the full visual check + both keyboard mappings remain Dev's eyeball AC on :5276
  - Rationale: shell rendering + input mapping are never unit-tested in this repo family (house convention); the structural test still guards the core seam
  - Severity: minor
  - Forward impact: none

### Dev (implementation)
- **Movement magnitudes calibrated to a 60 Hz frame, not exact ROM immediates**
  - Spec source: context-story-bz1-4.md, "Technical Approach"; TEA contract (movement.test.ts header)
  - Spec text: "The actual tread speed and turn-rate constants come from the bz1-2 findings/quarry — do not invent numbers here"
  - Implementation: the differential-drive STRUCTURE and rotation quantum (2π/512 wheel) are read exactly from the ROM ($4600 player routine, $5005), but `MAX_SPEED`/`MAX_TURN_RATE` scale the ROM's 2-steps / 2-units-per-frame quanta to per-second at 60 Hz rather than tracing the exact per-frame world-unit step
  - Rationale: bz1-2 landed no movement constants (TEA Gap); per-frame quanta need a frame rate to become per-second, and 60 Hz matches the shell's rAF; every value is ROM-structured and cited in the module header
  - Severity: minor
  - Forward impact: bz1-12 playtest trues up feel; a deep-trace story could pin exact immediates
- **Obstacle footprint from ROM vertex extents, not the $6955 radius table**
  - Spec source: context-story-bz1-4.md ("derive the obstacle footprint from the models.ts vertex extents" / quarry); epic fidelity bar
  - Spec text: "test the tank's position as a circle against each obstacle's circle/footprint (radius from the bz1-2 findings)"
  - Implementation: per-type collision radius = circumscribed circle of the ROM-decoded square base (halfWidth × √2) + ROM player radius $480; the exact ROM `obstacle_radius` table at $6955 was not byte-decoded
  - Rationale: bz1-2's findings carry no obstacle radius; the base vertices ARE ROM-exact (byte-decoded in bz1-2), and the circumscribed circle guarantees the AC ("never end a step inside the footprint"); the exact $6955 decode is a separable fidelity task
  - Severity: minor
  - Forward impact: logged as a Dev Gap finding; a follow-up can swap in the exact $6955 radii
- **Hard-stop collision response (resolves TEA's stop-vs-slide Question)**
  - Spec source: context-story-bz1-4.md, collision AC; TEA Question finding
  - Spec text: "default to a hard stop (zero the offending step) rather than sliding, but confirm stop-vs-slide against the bz1-2 findings/footage"
  - Implementation: hard stop — when a step's destination is blocked, the translation is zeroed (rotation still applies), matching the ROM's "motion blocked by object" ($340) with position saved for "undo after collision" ($1783)
  - Rationale: the ROM restores the prior position on a block — a hard stop, not a slide; this is the story's stated default and the ROM-faithful choice
  - Severity: minor
  - Forward impact: none — bz1-12 playtest can confirm feel
- **Near-plane edge clipping deferred (bz1-3 forward finding — not needed)**
  - Spec source: context-story-bz1-4.md, "Forward Findings from bz1-3" (near-plane clipping)
  - Spec text: "defer to dev phase if projection errors actually surface when tank approaches obstacles"
  - Implementation: not added — the collision radius (player 1152 + obstacle ≥724) keeps the tank ≥ ~1076 units from any obstacle face, beyond bz1-3's NEAR_CULL of 1023, so no obstacle vertex reaches the eye plane during normal driving
  - Rationale: the finding said defer unless projection errors surface; collision geometrically prevents them, so edge clipping would be unrequested scope
  - Severity: minor
  - Forward impact: revisit if a future story lets the tank overlap obstacle geometry (e.g. spawn-in-obstacle)

### Reviewer (audit)

All eight logged deviations reviewed. Every one is ROM-grounded, spec-consistent, and either resolves an open TEA Question or was pre-authorised by the story context ("defer unless X"). None flagged.

**TEA (test design):**
- **Tests pin formula SHAPE not magnitudes** → ✓ ACCEPTED: the constants genuinely did not exist (verified — bz1-2 landed obstacles/models/scoring but no kinematics); magnitude-agnostic tests match the spec's "wire the formula shape" and still fail a broken drive (confirmed by mutation testing — dropping `rightTread` from `v` fails the pivot test).
- **Absolute yaw sign (chirality) left unpinned** → ✓ ACCEPTED: carried from bz1-3's open handedness Question; hard-pinning a sign the ROM may contradict would force a mirrored control. Differential relationships (antisymmetric pivot, mirrored single-tread arcs) ARE pinned, which is the load-bearing guarantee. bz1-12 trues up.
- **Determinism by pure replay, not a seed** → ✓ ACCEPTED: tank kinematics carry no stochastic term; a seed is N/A until enemy AI (bz1-7). Bit-identical replay is the substantive guarantee and it is tested.
- **Camera-follows verified structurally (AC 7 eyeball)** → ✓ ACCEPTED: shell render/input is never unit-tested in this repo family (house convention); the structural seam test is a bonus. AC 7's real check is the :5276 eyeball, evidenced by Dev.

**Dev (implementation):**
- **Magnitudes calibrated to 60 Hz, not exact ROM immediates** → ✓ ACCEPTED: the differential STRUCTURE and 2π/512 rotation quantum are read exactly from the ROM ($4600/$5005); scaling per-frame quanta to per-second needs a frame rate and 60 Hz matches the shell's rAF. Every value is ROM-structured and cited. Logged as a Gap; bz1-12 trues feel.
- **Obstacle footprint from vertex extents, not the $6955 radius table** → ✓ ACCEPTED: the base vertices ARE ROM-exact (byte-decoded in bz1-2); circumscribed circle (halfWidth × √2) is conservative and guarantees the AC ("never end a step inside the footprint"). I verified the four radii against `models.ts` extents (512/800/512/640). Exact $6955 decode is a separable fidelity follow-up.
- **Hard-stop collision response (resolves TEA's stop-vs-slide Question)** → ✓ ACCEPTED: the ROM restores the prior position on a block ($1783 "undo after collision") — a hard stop, not a slide. This is both the story's stated default AND the ROM-faithful choice; TEA's open Question is correctly closed.
- **Near-plane edge clipping deferred** → ✓ ACCEPTED: I verified the geometry — the block radius keeps the tank centre ≥ PLAYER_RADIUS (1152) from any obstacle vertex, and 1152 > NEAR_CULL (1023), so no vertex reaches the eye plane during normal driving. The bz1-3 finding said "defer unless projection errors surface"; collision geometrically prevents them. Correct deferral.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3-point feature story creating the first sim-driving code (two new pure-core modules: movement + input); the epic's standing determinism AC and the core-purity non-negotiable both demand core coverage.

**Test Files:**
- `battlezone/tests/core/input.test.ts` — 2 tests: the abstract Input tread-axis contract (`leftTread`/`rightTread`) + `NO_INPUT` zero-constant (forward-compatible with bz1-5's fire axis).
- `battlezone/tests/core/movement.test.ts` — 54 tests: differential-drive kinematics (straight/reverse along `forwardFromHeading`, antisymmetric in-place pivot, mirror-image single-tread arcs, forward/reverse speed symmetry), time integration (dt-linearity, dt=0 no-op, NO_INPUT no-op, finiteness under extremes), determinism (fixed-script replay), obstacle collision (isBlocked anchors + a per-obstacle `describe.each` over all 21: never-ends-inside + no-tunnel), and the camera-follows-tank structural seam.
- `battlezone/tests/core/movement-purity.test.ts` — 8 tests: existence, epic core-purity token scan (no DOM/time/randomness), no type-safety escapes, core-only imports — for movement.ts and input.ts.
- `battlezone/tests/core/render-follow.test.ts` — 6 tests: bz1-3 forward-coverage folded into this red phase (full-circle ground convergence, portrait aspect<1 finiteness, negative-heading wheel/wrap continuity). Regression coverage of bz1-3's shipped projection.

**Tests Written:** 70 tests covering ACs 1–6 (dual-tread kinematics, collision, determinism). AC 7 (camera-follows eyeball on :5276 with both keyboard mappings) and AC 8 (build/test green) are eyeball/gate-verified per repo convention — the shell is never unit-tested in this repo family; a structural camera-seam test still guards the core boundary.
**Status:** RED (verified by testing-runner, run `bz1-4-tea-red`: 64/64 new feature tests fail with clean contract-style missing-export messages; the 6 render-follow regression tests pass — bz1-3 projection solid; all 153 pre-existing tests still pass, zero regressions; no collection crashes).

**Contract decisions (pinned in test headers for Dev):**
- New modules: `src/core/input.ts` (Input {leftTread, rightTread} + NO_INPUT), `src/core/movement.ts` (`stepTank(pose, input, dt): TankPose` + `isBlocked(x, z): boolean`). Movement stays pure core; the shell maps keys → tread axes and strokes bz1-3's projected segments.
- Convention bridged from camera.ts, not overridden: heading 0 → +Z, CCW toward +X, forward = `[sin h, 0, cos h]`; position integrates in the (x, z) plane at world y = 0 (GROUND_Y contract).
- Differential drive: v ∝ (leftTread + rightTread), yaw ∝ (rightTread − leftTread) — SHAPE pinned; magnitudes (tread speed / turn rate) are Dev's to source from the quarry.
- Collision contract: `stepTank` never ends a step inside an obstacle footprint (holds for hard-stop or slide); `isBlocked` is the footprint oracle; the collision radius is Dev's to derive from the models.ts vertex extents / quarry.

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Epic core purity | movement-purity: banned-token scan (Math.random/Date.now/performance.now/rAF/document./window./localStorage) + core-only imports (×2 modules) | failing (RED) |
| Epic determinism AC | movement: "replays a fixed input script ... to an identical trajectory" | failing (RED) |
| TS #1 type-safety escapes | movement-purity: "contains no type-safety escapes" (×2 modules) | failing (RED) |
| TS #2 readonly contracts | Input fields declared readonly; enforced by `tsc --noEmit` in `npm run build` | n/a (build gate) |
| TS #4 null/undefined | movement: finiteness under extreme inputs (no NaN/Infinity); stepTank always returns a TankPose (never null) | failing (RED) |
| TS #8 test quality | self-check done: no `as any` in assertions; declared-shape casts only in the RED module loaders (bz1-2 house pattern); no vacuous assertions | done |
| TS #10 input validation | movement: extreme (out-of-[-1,1]) tread values still yield finite poses (core trusts the shell's normalization but must not blow up) | failing (RED) |

**Rules checked:** 5 of 7 applicable rule families have runtime RED coverage; TS #2 is a compile-time build gate, TS #8 is a self-check (done). Enum/React/async-Promise checks are N/A (pure sync math, closed string unions, no JSX).
**Self-check:** reviewed every new test for vacuous assertions — none found (`let _ =`, `assert(true)`, always-null checks all absent). One test-strength caveat: the per-obstacle drive assertion is non-vacuous only if Dev's tread speed carries the tank ≥12000 units within 4000×(1/60)s (true for any authentic Battlezone speed); paired with the isBlocked anchors and the aim-through-a-blocked-centre construction, the collision guarantee is meaningfully enforced.

**Commit:** `fec2e4c` on `feat/bz1-4-tank-movement` — "test: add failing tests for bz1-4 tank movement (dual-tread kinematics, obstacle collision, determinism, purity)".

**Handoff:** To The Word Burgers (Dev) for GREEN — implement `src/core/input.ts` and `src/core/movement.ts` to the contracts above (source the tread-speed/turn-rate constants + obstacle footprint radius from the `reference/` quarry or `models.ts` vertex extents, citing sources), then rewire `src/main.ts` / `src/shell/input.ts` to map keyboard → tread axes (arcade E/D/I/K + arrows/WASD alternate) and drive bz1-3's camera from the live tank pose (AC 7, eyeball-verified on :5276).

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `battlezone/src/core/input.ts` — NEW: `Input {leftTread, rightTread}` + `NO_INPUT` — the abstract tread-axis contract the shell maps devices into (firing extends it in bz1-5).
- `battlezone/src/core/movement.ts` — NEW: differential-drive kinematics + planar collision. `stepTank` (v ∝ L+R, yaw ∝ R−L; rotate-then-move integration on the flat plain; hard-stop collision), `isBlocked` (circle test of ROM player radius $480 + per-type obstacle footprint vs the 21 ROM obstacles). Constants sourced from the `reference/` quarry (dis65 `$4600` player routine, `$480` player radius, 9-bit facing wheel `$5005`, cos×¾ forward step `$4913`).
- `battlezone/src/core/scene.ts` — `OBSTACLE_MODEL` → `Readonly<Record<...>>` (resolves the bz1-3 forward finding).
- `battlezone/src/shell/input.ts` — NEW: `KeyboardTreads` — arcade E/D/I/K dual-tread mapping + arrow-key drive alternate → `Input`.
- `battlezone/src/main.ts` — rewired from the bz1-3 attract pan: reads live keyboard treads, integrates the tank pose via `stepTank` each frame (rAF dt, clamped to 50 ms), drives bz1-3's camera from the live pose.

**Tests:** 223/223 passing (GREEN — testing-runner runs `bz1-4-dev-green` + `bz1-4-dev-green-2`: all 64 bz1-4 feature tests green, 6 render-follow regression green, 153 pre-existing green, zero regressions). `npm run build` (tsc --noEmit + vite build) clean.
**Branch:** `feat/bz1-4-tank-movement` (pushed; commits `fec2e4c` tests, `527a16a` implementation, `63fe46d` readonly fix).

**AC 7 eyeball evidence:** dev server :5276 (this checkout's live serve — vite HMR picked up the new code). Drove the tank via Playwright — held ArrowUp (forward) ~1.6 s then ArrowLeft (pivot) ~0.9 s; screenshot `bz1-4-tank-movement.png` at the orchestrator root (bz1-1/bz1-3 precedent): the origin view (distant pyramid + box on the skyline) becomes a box obstacle filling the foreground after the tank drives up to it (collision holds it at the face), the skyline shifts, and the horizon stays welded at NDC y=0 — the camera follows the tank pose with the turret forward-locked. Both the arcade (E/D/I/K) and arrow mappings feed the same tread axes; no console errors.

**Handoff:** To Imperator Furiosa (TEA) for the verify phase (simplify + quality-pass), then Immortan Joe for review.

## Subagent Results

Four subagents enabled via `workflow.reviewer_subagents`; five disabled (pre-filled Skipped). I covered the disabled domains myself (see Rule Compliance + Devil's Advocate).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells; 223/223 tests, build clean | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer self-pass (dt=0, NO_INPUT, extremes, negative headings, tunnelling, start-blocked) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — covered by Reviewer self-pass (bare catches throw explicit contract errors; no silent fallbacks) |
| 4 | reviewer-test-analyzer | Yes | findings | 6 (2 med, 4 low) | confirmed 6 (all LOW/non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — covered by Reviewer self-pass (headers spot-checked vs ROM/models.ts; accurate) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — covered by rule-checker + Reviewer (readonly, unions, exhaustive Records) |
| 7 | reviewer-security | Yes | findings | 3 (all low) | confirmed 3 (all LOW/non-blocking), dismissed 0, deferred 0 |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — covered by Reviewer self-pass (speculative exports; duplicated fwd/back tests) |
| 9 | reviewer-rule-checker | Yes | findings | 4 distinct (3× `as unknown as`, 1× missing readonly) | confirmed 4 (matches TS#1 → CONFIRMED, downgraded to LOW with rationale), dismissed 0, deferred 0 |

**All received:** Yes (4 enabled returned; 5 disabled pre-filled + self-covered)
**Total findings:** 13 confirmed (all LOW / non-blocking), 0 dismissed, 0 deferred. Zero Critical/High.

### Rule Compliance

Exhaustive enumeration against the applicable rules (TS lang-review 1–13 + epic non-negotiables). One exemplar is not enough — every governed instance judged.

**Epic core-purity (non-negotiable — core/ no DOM/time/randomness; all time via dt):**
- `src/core/input.ts` — COMPLIANT: zero imports, pure data. `[RULE]`
- `src/core/movement.ts` — COMPLIANT: no `Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame`/`document.`/`window.`; `dt` is the sole time input; auto-enforced by `movement-purity.test.ts` token scan. `[RULE]`
- Imports: `./camera`, `./obstacles`, `./input` — all sibling core; never shell/, never node builtins. COMPLIANT. `[RULE]`

**Planar sim (entities are (x, z, heading), no y):** `TankPose`, `Input`, `stepTank` return, `isBlocked(x,z)`, `OBSTACLE_RADIUS` — all COMPLIANT (no y term anywhere). `[TYPE]`

**Determinism (identical-in ⇒ identical-out):** `stepTank` is pure arithmetic; replay test asserts full-trajectory `toEqual`. COMPLIANT. `[RULE]`

**TS #1 type-safety escapes:** `as any` = 0, `@ts-ignore` = 0. `as unknown as` = **3** (input.test.ts:33, movement.test.ts:56, movement.test.ts:72) → VIOLATION of TS#1 ("`as unknown as T` — almost always wrong"). CONFIRMED (see Assessment). No new non-null `!` on the diff's +lines. `[RULE]`

**TS #2 readonly / generics:** `OBSTACLE_RADIUS` = `Readonly<Record<ObstacleType, number>>` COMPLIANT; `OBSTACLE_MODEL` now `Readonly<...>` (this diff's fix) COMPLIANT; `stepTank` params never mutated COMPLIANT; `held(...keys: string[])` (shell/input.ts:24) → should be `readonly string[]` (never mutated) — minor VIOLATION. No `Record<string,any>`, no `object`/`Function` types. `[TYPE]`

**TS #3 enums:** none in diff; `ObstacleType` is a string union (the recommended pattern); Records get free compiler exhaustiveness. COMPLIANT. `[TYPE]`

**TS #4 null/undefined (falsy-0 CRITICAL — 0 is a valid tread/coord):** grep-confirmed **zero** `||`/`??`/`?.` in the diff. `main.ts` dt uses strict `last === 0 ?` (not `last ||`), correctly distinguishing the sentinel from a real 0. `OBSTACLE_RADIUS[o.type]` indexes an exhaustive Record (no undefined path). COMPLIANT. `[RULE]`

**TS #5 modules:** runtime vs `import type` correctly split in every file (e.g. `import { forwardFromHeading, type TankPose }`); `moduleResolution: bundler` → extensionless relative imports correct (any `.js`-extension finding would be a FALSE POSITIVE). COMPLIANT. `[RULE]`

**TS #6 React/JSX:** N/A. **TS #7 async:** dynamic-import loaders properly awaited, no floating promises. COMPLIANT.

**TS #8 test quality:** the 3 `as unknown as` also count here (test-only escape, inconsistent with the direct-cast house pattern in camera/scene/horizon tests). All tests import `src/`, not `dist/`. No mocks. `[TEST]`

**TS #9 build:** `strict: true`; `tsc --noEmit` clean. COMPLIANT.

**TS #10–12 (input-validation / error-handling / perf):** browser game, no auth/tenant boundary — branded-type rule N/A; bare catches throw explicit contract errors (not swallowed) `[SILENT]`; `isBlocked` is O(21) no-alloc per frame — fine `[SIMPLE]`. COMPLIANT.

**TS #13 fix-regressions:** the `OBSTACLE_MODEL` Readonly tightening — grep-confirmed read-only usage, no regression; the `main.ts` pan→integration swap re-verified by `render-follow.test.ts`. COMPLIANT. `[DOC]`

### Devil's Advocate

Assume this tank is broken. Where does it fall apart?

**Tunnelling.** `stepTank` tests only the *destination* with `isBlocked`, never the swept segment. Feed it a large `dt` and the tank leaps clean over an obstacle — start clear, end clear, path straight through. The test-analyzer confirmed no test exercises this (the "extreme" test uses opposed treads, so v=0). *Rebuttal:* the sole production caller, `main.ts:38`, clamps `dt` to `Math.min(0.05, …)`. At `MAX_SPEED` that is 288 units/step against a smallest block *diameter* of ~3752 — a 13× margin. Tunnelling is unreachable in the shipped game. Real test gap, not a live bug. Logged non-blocking.

**Stuck-forever.** Drive nose-first into a pyramid and hold forward. Both translations zero every frame — is the tank bricked? *Rebuttal:* heading still integrates unconditionally, so the player rotates off the face and drives away. And the committed-pose-is-never-blocked invariant holds by induction from the clear origin, so you can always escape toward open ground.

**NaN/Infinity poisoning the render.** A malicious/confused caller passes `leftTread: 1e300` or an enormous `dt`. If `x`/`z`/`heading` go non-finite, the projection corrupts and the canvas freezes. *Rebuttal:* the finiteness test covers extreme finite inputs; sin/cos bound the direction; only a literal `Infinity` input could propagate, which the shell's `clamp` and finite rAF `dt` never produce.

**Missing canvas.** `getElementById('game') as HTMLCanvasElement` with no null guard — a host-page markup regression throws an opaque `getContext of null`. Real robustness gap (security agent, LOW), not attacker-triggerable, pre-existing from bz1-3's bootstrap. Non-blocking.

**Arrow keys scroll the page.** `KeyboardTreads` never calls `preventDefault`, so arrow-drive also scrolls the document. A confused player on a non-fullscreen page sees the page jump. UX polish (bz1-12), not correctness.

**Banned pattern propagates.** The 3 `as unknown as` casts are the copy-template bz1-5 will inherit when it extends `Input` with a fire axis — the escape metastasises. That is precisely why it is confirmed (not dismissed) and routed to bz1-5 as required cleanup. Nothing here corrupts state or blocks the slice.

## Reviewer Assessment

**Verdict:** APPROVED

Four enabled subagents (preflight, test-analyzer, security, rule-checker) returned; the five disabled specialists' domains I covered by hand (Rule Compliance + Devil's Advocate). Thirteen findings confirmed, all LOW/non-blocking; zero dismissed; **zero Critical or High**. The code is correct, pure, deterministic, and green (223/223, build clean).

**Data flow traced:** keyboard `keydown`/`keyup` → `KeyboardTreads.read()` clamps to `Input {leftTread, rightTread} ∈ [-1,1]` → `stepTank(pose, input, dt)` integrates differential drive (v ∝ L+R, yaw ∝ R−L; rotate-then-move) with hard-stop collision → `pose` drives `tankView` and bz1-3's projection. Safe: the core reads only abstract axes (never a keycode), stays pure, and the committed pose is never inside a footprint (inductive invariant from the clear origin).

**Pattern observed:** differential-drive kinematics + circumscribed-circle collision, ROM-cited throughout (`movement.ts:34-63`); the core/shell purity boundary is honoured exactly (`src/core/movement.ts` imports only sibling core).

**Error handling:** `stepTank` is total — always returns a finite `TankPose`; `dt=0`/`NO_INPUT` are no-ops; extreme finite inputs stay finite (`movement.test.ts:185`). Test-loader catches re-throw explicit contract errors, never swallow.

**Confirmed findings (all LOW, non-blocking):**

- `[RULE]` `[TEST]` **3× `as unknown as` in test loaders** — `input.test.ts:33`, `movement.test.ts:56`, `movement.test.ts:72`. Matches TS lang-review #1 (banned) AND the story's own `movement-purity.test.ts` BANNED_ESCAPES (which only scans core, missing the tests). Rule-checker proved via isolated `tsc` that a direct `as Partial<X>` compiles clean — the `unknown` hop is unnecessary and deviates from the direct-cast house pattern in camera/scene/horizon tests. **CONFIRMED, downgraded to LOW** (test-scaffolding, proven-harmless, no runtime/correctness impact) — not dismissed. Cleanup routed to bz1-5 (inherits this loader template).
- `[TYPE]` `[RULE]` **`held(...keys: string[])` → `readonly string[]`** (`shell/input.ts:24`) — never mutated; TS #2 readonly-param. LOW.
- `[TEST]` **Large-`dt` tunnelling untested** (`movement.test.ts:185`) — the swept-collision class has no coverage; unreachable in production (dt clamped to 0.05s, 13× margin). LOW test gap; would harden `stepTank` as a standalone module.
- `[TEST]` **Weak camera-follow test** (`movement.test.ts:267`) — passes for any pose change, even a wrong-direction one; AC 7's real proof is the :5276 eyeball. LOW.
- `[TEST]` **Tautological duplicate** (`input.test.ts:52`) — constructs its expectation from the values under test; redundant with line 44. LOW.
- `[TEST]` **Duplicated fwd/back tests** (`movement.test.ts:92-114`) `[SIMPLE]` — `test.each` candidates. LOW.
- `[SEC]` **Unchecked `getElementById` cast** (`main.ts:17`) — opaque crash if the canvas is absent; pre-existing bootstrap, not attacker-triggerable. LOW robustness.
- `[SEC]` **No listener teardown** in `KeyboardTreads` (`shell/input.ts:20`) — harmless for the page-lifetime singleton; a `dispose()` future-proofs re-instantiation. LOW.
- `[SEC]` **`stepTank` doesn't clamp input** (`movement.ts:121`) — trusts the shell's `[-1,1]`; a future shell could feed out-of-range axes. LOW defense-in-depth.
- `[SIMPLE]` **`MAX_SPEED`/`MAX_TURN_RATE`/`PLAYER_RADIUS` exported but consumed only internally** — speculative API surface; reasonable as named ROM constants for future tests. LOW.
- `[EDGE]` **First-frame `dt` sentinel** (`main.ts:38`) — `last === 0` doubles as init sentinel and a (practically impossible) valid rAF timestamp; theoretical only. LOW.
- `[DOC]` Module headers spot-checked against ROM addresses and `models.ts` extents — accurate, not stale. VERIFIED.

**Why APPROVE, not REJECT:** the blocking rule is "any Critical or High → REJECT." There are none. Every finding is LOW: test-scaffolding cleanliness, test-coverage hardening, and defense-in-depth. The slice's actual contract — authentic dual-tread differential drive, planar collision that provably blocks penetration into all 21 ROM obstacles (verified non-vacuous by mutation), determinism, and camera-follows-tank — is met and evidenced. The rule-matching `as unknown as` findings are confirmed and downgraded (not dismissed), with cleanup routed forward. Forcing a full workflow round-trip for a 4-line test-only type-cast tidy would be disproportionate to a LOW.

**Handoff:** To The Organic Mechanic (SM) for finish-story.

## Delivery Findings

<!-- Reviewer appends below; never edits other agents' entries. -->

### Reviewer (code review)
- **Improvement** (non-blocking): three `as unknown as Partial<…>` double-casts in the RED test loaders violate TS lang-review #1 and the story's own BANNED_ESCAPES list; a direct `as Partial<…>` compiles clean (rule-checker verified). Affects `battlezone/tests/core/input.test.ts:33`, `battlezone/tests/core/movement.test.ts:56,72` (drop the `unknown` hop to match the camera/scene/horizon direct-cast house pattern). **bz1-5 inherits this loader template when it extends `Input` with a fire axis — fix there.** *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `KeyboardTreads.held(...keys: string[])` should be `readonly string[]` (never mutated). Affects `battlezone/src/shell/input.ts:24`. *Found by Reviewer during code review.*
- **Gap** (non-blocking): no test covers large-single-step (`dt`) swept collision (tunnelling); safe today only because `main.ts` clamps `dt` to 0.05 s. Affects `battlezone/tests/core/movement.test.ts` (add a large-`dt` drive-at-obstacle assertion to harden `stepTank` as a standalone core primitive before any future caller uses an unclamped `dt`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `stepTank` trusts the shell to pre-clamp tread axes to `[-1,1]`; consider clamping inside the core so it enforces its own invariant. Affects `battlezone/src/core/movement.ts:121`. *Found by Reviewer during code review.*