---
story_id: "bz1-5"
jira_key: ""
epic: bz1
workflow: tdd
---
# Story bz1-5: Player firing — shell projectile, gunsight, line-of-sight shot blocking

## Story Details
- **ID:** bz1-5
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** bz1-4 (tank movement foundation)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T19:16:49Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T18:27:25Z | 2026-07-03T18:29:26Z | 2m 1s |
| red | 2026-07-03T18:29:26Z | 2026-07-03T18:46:18Z | 16m 52s |
| green | 2026-07-03T18:46:18Z | 2026-07-03T18:58:30Z | 12m 12s |
| review | 2026-07-03T18:58:30Z | 2026-07-03T19:16:49Z | 18m 19s |
| finish | 2026-07-03T19:16:49Z | - | - |

## Technical Approach

### Player Firing System
- **Shell Projectile Physics:** Implement ballistic projectile motion in 3D space (follows tank heading on launch from barrel position).
- **Gunsight/Crosshair:** Fixed reticle at screen center; updates position based on line-of-sight projection to near plane.
- **Line-of-Sight Shot Blocking:** Scan 3D ray from tank barrel through reticle to determine if target is blocked by obstacles or terrain.

### Acceptance Criteria
1. Player can fire shells with spacebar or fire key; shells spawn at barrel position with velocity aligned to tank heading.
2. Shells follow ballistic arc, subject to gravity (y-velocity decrement per frame); collision with terrain or obstacles removes shell.
3. Gunsight renders as glowing crosshair at screen center; updates screen projection based on tank position/heading and obstacle geometry.
4. Shot blocking: If ray from barrel through reticle is blocked by an obstacle before reaching target distance, gunsight indicates blocked (visual feedback, e.g., dimmed or flickered).
5. Shells expire after max range or ground impact; track shell count in shell pool (budget: ~16 live shells per level).

## Story Context

### Dependencies
- **bz1-4 (Tank Movement):** Provides tank position, heading, barrel position in world space, and obstacle collision primitives.
- **bz1-3 (3D Render Foundation):** Viewport, camera/projection, 3D-to-screen coordinate transforms, obstacle mesh.

### Code Locations
- `src/core/entities/Shell.ts` — Shell entity, projectile physics.
- `src/core/sim/Ballistics.ts` — Ballistic arc computation, ground collision detection.
- `src/shell/render/Gunsight.ts` — Crosshair rendering, line-of-sight projection.
- `src/shell/render/ShotBlockCheck.ts` — Ray casting for obstacle blocking.
- `src/core/sim/World.ts` — Shell spawning, active shell pool management.

### Test Plan
1. **Unit:** Shell physics (arc, velocity decay, ground collision).
2. **Unit:** Gunsight projection (screen coords from 3D world ray).
3. **Unit:** Ray-obstacle intersection (blocking check).
4. **Integration:** Player fires → shell spawns, moves, collides; gunsight updates on tank rotation.
5. **Smoke:** Tank fires multiple shells in sequence; all expire cleanly (no pool leak).

## Sm Assessment

**Verdict:** Ready to hand off to TEA (RED phase).

**Setup complete:**
- Session file, story context (`sprint/context/context-story-bz1-5.md`), and feature branch `feat/bz1-5-player-firing` (off `develop` in battlezone subrepo) all in place.
- Story sits cleanly on the bz1-4 movement/sim foundation and bz1-3 render foundation — no blocking dependencies, no open PRs, merge gate clear.

**Routing note for TEA — verify against ROM before writing tests:**
- The auto-generated Technical Approach assumes a **ballistic arc with gravity** for the player shell. Authentic 1980 Battlezone fires the player shell in a **straight line at fixed speed to a max range** (no gravity/drop). Per project canon the ROM is authoritative over invented physics ([[tempest-rom-is-canonical]]), and real BZ ROM data is available ([[battlezone-quarry-source]]). Confirm the shell-travel model (straight vs. arced) from the ROM/reference before locking in test expectations — this changes the `Ballistics`/`Shell` test assertions.
- Same caution for the "gunsight blocked → dimmed/flicker" feedback: verify the authentic gunsight behavior (the real cabinet shows a lit reticle that the sight lines converge on) rather than inventing a blocked-state visual.

**Scope guard:** 3-point story. Keep to the three named deliverables (shell projectile, gunsight, line-of-sight shot blocking). Don't gold-plate deep-level fidelity.

## TEA Assessment

**Tests Required:** Yes
**Reason:** New pure-core sim behaviour (the player firing subsystem) — squarely TDD.

**Test Files:**
- `tests/core/firing.test.ts` — the behavioural contract: fire/spawn at the tank, straight **level** constant-speed flight (no arc/gravity), heading independent of the tank after firing, dt integration, the one-shot rule (one shell in flight), max-range expiry past the far plane (~32512 = ROM `$7f00`), obstacle shot-blocking + swept anti-tunnel, the centered gunsight aligned to the shot line, determinism, finite-under-extreme-dt.
- `tests/core/firing-purity.test.ts` — rule-enforcement: module existence, epic core-purity (no DOM/time/randomness), core-only imports, no type-safety escapes, and `stepFiring` as a non-mutating reducer.

**Tests Written:** 23 tests (18 behavioural + 5 rule-enforcement) covering the story's three deliverables — shell projectile, gunsight, line-of-sight shot blocking.
**Status:** RED (23 failing, verified by testing-runner) — 223 pre-existing tests still green, zero regressions, no collection crashes. Clean contract failures (missing `firing.ts` / missing `fire` field).

### Rule Coverage

| Rule | Test(s) | Status |
|------|---------|--------|
| Epic core-purity (no DOM/time/random) | `firing-purity`: "contains no DOM / time / randomness tokens" | failing |
| Core boundary (imports only `./` core) | `firing-purity`: "imports only sibling core modules" | failing |
| Determinism (standing epic AC) | `firing`: "replays a fixed fire/step script to an identical trajectory" | failing |
| TS #1 type-safety escapes | `firing-purity`: "contains no type-safety escapes" | failing |
| TS #2 readonly / no-mutate params | `firing-purity`: "stepFiring is a non-mutating reducer" | failing |
| TS #4 null/undefined handling | `firing`: "not firing spawns nothing", "slot frees on expiry", spawn `range === 0` (falsy-but-valid) | failing |
| TS #8 test quality (self-check) | Phase C self-check applied (see below) | n/a |

**Rules checked:** 6 of the applicable lang-review / epic rules have test coverage (the story touches no enums, async, React/JSX, or API-boundary input — those TS checks are not applicable to a pure planar-sim module).
**Self-check:** Reviewed every test for vacuous assertions. Fixed 2 before committing: (a) the anti-tunnel test's overshoot exceeded max range, so `null` could mean expiry not swept-blocking — retargeted to land past the obstacle but under max range on open ground; (b) the finite-dt test's only assertion was inside an `if (out !== null)` that could be skipped — added unconditional assertions on the spawned shell. No `let _ =` / `assert(true)` / always-null assertions remain.

**Handoff:** To Dev (The Word Burgers) for implementation. Contract: create `src/core/firing.ts` (`Shell`, `stepFiring`, `shellBlocked`, `SHELL_SPEED`, `SHELL_MAX_RANGE`, `GUNSIGHT_NDC`) and extend `src/core/input.ts` with `fire`. See the ROM citations in the test-file headers and the Design Deviations above — the shell flies **level and straight**, **one at a time**.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `src/core/firing.ts` (new) — `Shell`, `stepFiring` (one-shot gate + level straight flight + swept obstacle collision), `shellBlocked`, `SHELL_SPEED`/`SHELL_MAX_RANGE` (ROM `$7f00`), `GUNSIGHT_NDC`.
- `src/core/input.ts` — `Input` gains required `fire`; `NO_INPUT.fire = false`.
- `src/core/movement.ts` — `OBSTACLE_RADIUS` exported for reuse by `shellBlocked`.
- `src/shell/input.ts` — Space/F → `fire`.
- `src/main.ts` — game loop steps the cannon and renders the in-flight shell + gunsight.
- `src/shell/render.ts` — `drawGunsight` centered reticle overlay.

**Tests:** 246/246 passing (GREEN) — the 23 new bz1-5 tests plus all 223 pre-existing, verified by testing-runner. `tsc --noEmit` clean; `vite build` succeeds.
**Branch:** `feat/bz1-5-player-firing` (pushed to origin).

**Wiring / self-review:** Firing is wired end-to-end (keyboard fire → core `stepFiring` → rendered shell + gunsight). Visually verified in-browser on a temporary port (5276 is held by another checkout's `just serve` — not disturbed): the game runs, the ROM obstacle field and the centered gunsight render, zero console errors. Screenshot at repo root `bz1-5-gunsight-firing.png`. Implementation stayed minimal — no code beyond what the tests/deliverables require; the shell flies **level and straight, one at a time**, per the ROM.

**Handoff:** To Reviewer (Immortan Joe) for code review.

## Delivery Findings

### TEA (test design)

- **Improvement** (non-blocking): `input.fire` is a new REQUIRED field on `Input`. Affects `src/shell/input.ts` (device→Input mapping must supply `fire` from the cabinet button / keyboard) and `src/main.ts` (any `Input` literal), plus `src/core/input.ts` (`NO_INPUT.fire = false`). Dev wires these in GREEN. *Found by TEA during test design.*
- **Gap** (non-blocking): the gunsight's enemy-aware reticle states — "target lined up" / angled / flashing when aimed at a hostile WITH clear line of sight (Battlezone.dis65 offsets 229–251) — are unreachable this story because no enemy exists until bz1-7. bz1-7 should own the reticle target/line-of-sight-to-enemy logic (the natural home is a future `gameRules`-style module, mirroring star-wars `lockedEnemy`). Affects a future `src/core/` targeting module. *Found by TEA during test design.*
- **Improvement** (non-blocking): the exact ROM projectile collision-diameter table at `$6139` is not yet byte-decoded (parallel to movement's deferred `$6427`/`$6955`). Affects a future fidelity story — decode `$6139` into typed `core/` data. Dev may reuse movement's per-type footprint radius for now. *Found by TEA during test design.*

### Dev (implementation)

- **Gap** (non-blocking): bz1-7 (enemy tanks) must wire the shell-vs-enemy hit + score into the loop. `firing.stepFiring` returns `null` on both max-range expiry AND obstacle strike but does not yet report WHAT was hit; a hostile target will need that distinction (ROM "player projectile hit enemy" → score add). Affects `src/core/firing.ts` (extend the return to signal the hit target) and `src/main.ts` (score on enemy kill). *Found by Dev during implementation.*
- **Improvement** (non-blocking): the gunsight reticle's horizontal arms coincide with the horizon line (both at vertical screen centre, eye at ground level), so only the vertical ticks read clearly. bz1-12 (HUD fidelity) should true up the reticle shape (the authentic cracked-glass gunsight) so it stays legible against the horizon. Affects `src/shell/render.ts` (`drawGunsight`). *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): `stepFiring` does not guard a non-finite `dt`. If `SHELL_SPEED * dt` overflows to `Infinity` (dt ≳ 1.17e304) or `dt` is `Infinity`/`NaN`, then `substeps = Math.ceil(dist / SHELL_SUBSTEP)` becomes `Infinity` and `stepDist` becomes `NaN`, defeating BOTH loop exits (`range > SHELL_MAX_RANGE` and `shellBlocked`) so the `for` loop never terminates (main-thread hang). Independently corroborated by the security AND test-analyzer specialists (the latter reproduced the hang directly, `kill -9`). NOT reachable through the shipped game — `src/main.ts:42` clamps `dt` to `Math.min(0.05, …)` off a monotonic rAF timestamp — so this is a latent robustness gap in an exported pure-core function, not a live defect. Affects `src/core/firing.ts:131-135` (add a one-line `if (!Number.isFinite(dist)) return active` guard, or clamp `dist`). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the "extreme (but finite) dt — no NaN/Infinity blow-up" test's `if (extreme !== null)` branch is dead — any interesting `dt` expires the shell to `null` first, so the finiteness assertions it guards never run. The spawn-finiteness assertions above the branch DO run and are meaningful, but the "kept-live ⇒ finite" guarantee the test advertises is unverified (and is in fact violated at the overflow edge above). Affects `tests/core/firing.test.ts:842-856` (assert against a genuinely-still-alive shell, or add + test the finite-`dt` guard). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the purity suite freezes the `Input` frames and the re-frozen `Shell` but not `POSE` (a plain `TankPose`, `firing-purity.test.ts:105`) and never re-asserts its fields post-call, so a mutation of the `pose` argument would go uncaught. The code is correct today (verified: `stepFiring` only READS `pose.x/z/heading`), so the "non-mutating reducer" claim is merely 1/3 unguarded, not violated. Affects `tests/core/firing-purity.test.ts:105` (`Object.freeze(POSE)`). *Found by Reviewer during code review.*
- No blocking upstream findings. All three deliverables (shell projectile, gunsight, line-of-sight shot blocking) are correct, ROM-faithful, and covered by real behavioural tests.

## Design Deviations

### TEA (test design)

- **Shells fly LEVEL — no ballistic arc, no gravity (SM's ROM warning confirmed)**
  - Spec source: session Technical Approach ("ballistic projectile motion in 3D space") + Acceptance Criteria AC-2 ("Shells follow ballistic arc, subject to gravity (y-velocity decrement per frame)")
  - Spec text: "Shells follow ballistic arc, subject to gravity (y-velocity decrement per frame)"
  - Implementation: Tests pin straight, level, constant-speed flight in the planar (x, z) world — the `Shell` type has no y coordinate at all.
  - Rationale: Non-negotiable epic ruling — "the world is flat… shells fly level from the cannon" (context-epic-bz1.md, planar-sim ruling). The ROM stores only 16-bit projectile X/Z coords and X/Z velocities (Battlezone.dis65 `projectile_x_coords`/`_z_coords`/`_velocities`, offsets 1443–1494) — there is no Y axis for a shell to arc through. ROM is canonical over invented physics ([[tempest-rom-is-canonical]]).
  - Severity: major
  - Forward impact: none — corrects the spec before any code; no `Ballistics.ts`/gravity module is created.

- **One player shell in flight at a time — not a ~16-shell pool**
  - Spec source: session Acceptance Criteria AC-5
  - Spec text: "track shell count in shell pool (budget: ~16 live shells per level)"
  - Implementation: `stepFiring` allows exactly ONE in-flight player shell; `input.fire` is ignored until the current shell clears (expiry or obstacle hit).
  - Rationale: ROM one-shot rule — the fire routine gates on "player projectile ready?" / "player projectile still in flight?" (Battlezone.dis65 offsets 233 / 523). There are two projectile slots total: #0 player, #1 enemy. The "~16 shells" figure was invented; the ROM is canonical ([[tempest-rom-is-canonical]]).
  - Severity: major
  - Forward impact: none — a `Shell | null` models the single slot; bz1-7 adds the enemy's slot.

- **"Line-of-sight shot blocking" tested as obstacle-blocks-shell, NOT a blocked-reticle visual**
  - Spec source: session Acceptance Criteria AC-4
  - Spec text: "If ray from barrel through reticle is blocked by an obstacle before reaching target distance, gunsight indicates blocked (visual feedback, e.g., dimmed or flickered)"
  - Implementation: Tests pin obstacles stopping the shell (`shellBlocked`, swept collision so a fast shell can't tunnel) — the ROM "Projectile struck obstacle" path. The reticle's target-acquired / flash states are NOT tested this story.
  - Rationale: The ROM reticle only changes state when aimed at an ENEMY ("no target" vs "target lined up" vs flashing, dis65 offsets 229–251) — and no enemy exists until bz1-7. The "dimmed/flickered blocked" feedback was invented. The in-scope, core-testable meaning of "shot blocking" is obstacles blocking shots.
  - Severity: minor
  - Forward impact: bz1-7 owns the enemy-aware reticle target/line-of-sight states (flagged in Delivery Findings).

- **Single `src/core/firing.ts` module, not the five files the session named**
  - Spec source: session Story Context → Code Locations (Shell.ts, Ballistics.ts, Gunsight.ts, ShotBlockCheck.ts, World.ts under `entities/`/`sim/`/`render/` subdirs)
  - Spec text: "`src/core/entities/Shell.ts` … `src/core/sim/Ballistics.ts` … `src/shell/render/Gunsight.ts` …"
  - Implementation: One flat `src/core/firing.ts` owns the shell + shot-blocking + gunsight constant; `src/core/input.ts` gains `fire`.
  - Rationale: The real codebase is flat (`src/core/*.ts`, no `entities/`/`sim/` subdirs) and small-pure-function-per-module (movement.ts precedent). No `Ballistics.ts` is needed (level flight, no arc). Consolidating fits the 3-pt scope and house layout. Named `firing.ts` (not `shell.ts`) to avoid colliding with the `src/shell/` IO layer.
  - Severity: minor
  - Forward impact: none — the gunsight's stroking still lives shell-side (`src/shell/render.ts`), per star-wars precedent.

- **Projectile collision-diameter table ($6139) not byte-decoded — behaviour pinned, exact radius deferred**
  - Spec source: fidelity bar (context-epic-bz1.md — ROM-accurate per story)
  - Spec text: "each story ships ROM-accurate behavior for its slice"
  - Implementation: Shot-blocking tests assert the shell dies in the NEIGHBOURHOOD of an obstacle (well short of max range), never the exact ROM collision diameter.
  - Rationale: The ROM's projectile-diameter table at `$6139` is a byte decode the bz1-2 quarry did not extract (exactly parallel to movement's deferred `$6427`/`$6955` obstacle-radius decode). Pinning behaviour, not the byte, keeps GREEN unblocked; the exact table is a fidelity follow-up.
  - Severity: minor
  - Forward impact: a future fidelity story (or bz1-12 playtest) byte-decodes `$6139`; Dev may reuse movement's per-type footprint radius meanwhile.

### Dev (implementation)

- **`shellBlocked` reuses `movement.OBSTACLE_RADIUS` rather than a private projectile table**
  - Spec source: bz1-5 TEA deviation "Projectile collision-diameter table ($6139) not byte-decoded"
  - Spec text: "Dev may reuse movement's per-type footprint radius meanwhile"
  - Implementation: Exported `OBSTACLE_RADIUS` from `movement.ts` and imported it in `firing.ts`; the shell/obstacle test is the same footprint circle the tank uses (minus the player radius).
  - Rationale: DRY over duplicating a 4-entry map that currently holds the same approximation. The ROM does keep separate tank vs projectile diameter tables, so when `$6139` is decoded the two will split — flagged in Delivery Findings.
  - Severity: minor
  - Forward impact: minor — the `$6139` decode gives `firing.ts` its own radii and drops the movement import; no behaviour change until then.

- **A just-fired shell is invisible for its first frames (ROM near-cull), by design**
  - Spec source: session AC-1/AC-3 (shells spawn at the tank; gunsight/shell rendered)
  - Spec text: "shells spawn at barrel position with velocity aligned to tank heading"
  - Implementation: The shell spawns exactly at the tank `(x, z)` and is drawn via `projectModel(SHELL, …)`, which applies bz1-3's `[NEAR_CULL, FAR_CULL]` camera cull — so the shell only appears once it is ≥ `NEAR_CULL` (1023 units ≈ the first ~0.07 s) downrange.
  - Rationale: Faithful to the ROM's cull-before-vertex-processing; a muzzle-flash/near-field shell sprite is not in this story's scope. Core firing (spawn at tank, range 0) is unaffected and fully tested.
  - Severity: minor
  - Forward impact: none — bz1-11 (cannon SFX) / bz1-12 (HUD fidelity) can add a muzzle flash if the playtest wants one.

### Reviewer (audit)

Every logged deviation reviewed. All seven ACCEPTED — each corrects an invented-spec assumption against the canonical ROM, consistent with epic non-negotiables and [[tempest-rom-is-canonical]]:

- **Shells fly LEVEL — no ballistic arc/gravity** → ✓ ACCEPTED: the planar-sim ruling is a non-negotiable epic fact; the ROM stores only X/Z projectile coords/velocities. Correcting AC-2's invented gravity before any code is the right move.
- **One shell in flight, not a ~16-shell pool** → ✓ ACCEPTED: the ROM one-shot gate (offsets 233/523) is authoritative; the "~16" figure was invented. `Shell | null` models the single player slot correctly (verified firing.ts:121-147, firing.test.ts:685-712).
- **"Shot blocking" = obstacle-blocks-shell, not a blocked-reticle visual** → ✓ ACCEPTED: the enemy-aware reticle states require an enemy (bz1-7); obstacle blocking is the in-scope, core-testable meaning. Correctly deferred, flagged forward.
- **Single `src/core/firing.ts`, not five files** → ✓ ACCEPTED: matches the flat house layout (movement.ts precedent); no `Ballistics.ts` is needed for level flight. Sound consolidation for a 3-pt slice.
- **$6139 projectile-diameter table not decoded — behaviour pinned, exact radius deferred** → ✓ ACCEPTED: exactly parallel to movement's deferred `$6427`/`$6955`; pinning "neighbourhood" behaviour keeps GREEN honest without fabricating a byte value. (This is also why the test-analyzer's "tolerance too loose" note is non-blocking — the looseness is the deviation, not a defect.)
- **`shellBlocked` reuses `movement.OBSTACLE_RADIUS`** → ✓ ACCEPTED: DRY over duplicating a 4-entry placeholder map; the `$6139` decode will split them later. Export widening is `Readonly<Record<…>>`, no new mutation path (confirmed [RULE]).
- **A just-fired shell is invisible for its first frames (ROM near-cull)** → ✓ ACCEPTED: faithful to the ROM cull-before-vertex-processing; core spawn (range 0 at the tank) is unaffected and tested. Muzzle-flash is correctly out of scope (bz1-11/bz1-12).

**Undocumented spec deviations found by Reviewer:** none. The shell's fixed-at-fire heading, the auto-fire-while-held cadence, and the near/far-cull invisibility are all either logged above or pinned by tests; no spec divergence slipped through unlogged.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (1 minor style note) | confirmed 0, dismissed 1, deferred 0 |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 2, noted-minor 3, dismissed 2 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings |
| 7 | reviewer-security | Yes | findings | 2 | confirmed 1 (low, non-blocking), dismissed 1 (benign) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings |
| 9 | reviewer-rule-checker | Yes | clean | 0 violations (61 instances / 18 rules) | confirmed 0, dismissed 0 |

**All received:** Yes (4 enabled specialists returned; 5 disabled via `workflow.reviewer_subagents` and pre-filled)
**Total findings:** 3 confirmed (all Medium/Low, non-blocking), 3 dismissed with rationale, 3 noted as minor/deferred

### Finding dispositions

- **[SEC]/[TEST] non-finite-`dt` hang (firing.ts:131-135)** — CONFIRMED, corroborated by two independent specialists. Severity **Medium** (a test advertises a NaN/Infinity guarantee it doesn't verify) / **Low** robustness (unreachable: `main.ts:42` clamps `dt ≤ 0.05`). Non-blocking. Captured as a Delivery Finding with a one-line-guard remedy.
- **[TEST] half-vacuous NaN/Infinity test (firing.test.ts:842-856)** — CONFIRMED. Dead `if (extreme !== null)` branch. Non-blocking (spawn-finiteness half still runs). Captured as a Delivery Finding.
- **[TEST] POSE not frozen (firing-purity.test.ts:105)** — CONFIRMED minor. Code is correct (no `pose` mutation); test coverage gap only. Non-blocking. Captured as a Delivery Finding.
- **[TEST] spawn-inside-obstacle one-frame leak (firing.test.ts)** — DISMISSED: unreachable. The shell spawns at the tank CENTRE (`firing.ts:110`), and `movement.isBlocked` keeps the tank centre ≥ `PLAYER_RADIUS(1152) + OBSTACLE_RADIUS` from every obstacle centre — strictly greater than the `OBSTACLE_RADIUS` that `shellBlocked` uses — so `shellBlocked(spawn)` is always `false` in any reachable pose. The "wall-hugging muzzle" premise assumes a muzzle offset the code does not have.
- **[TEST] block-range tolerance ~3× loose + only wide-pyramid hit behaviourally (firing.test.ts:300)** — NOTED, non-blocking: the exact projectile radius is an *accepted* deferred deviation (`$6139`), so pinning "neighbourhood, not exact radius" is intentional; all four obstacle types ARE covered by the `shellBlocked`-at-centre test (firing.test.ts:748-755).
- **[TEST] dt=0/negative + shellBlocked boundary + copy-paste helper** — NOTED, all Low, non-blocking (behaviour is safe today; these are test-tightening/DRY opportunities).
- **[SEC] KeyboardTreads listeners never removed (shell/input.ts:20)** — DISMISSED as benign: constructed exactly once at `main.ts:34` for the page lifetime; pre-existing bz1-4 pattern, unchanged by this diff.
- **[PREFLIGHT] drawGunsight inline literals (render.ts)** — DISMISSED: matches the existing `drawSegments` style in the same file; no constant-extraction convention exists for render tuning values.

## Reviewer Analysis

### Rule Compliance

Enumerated every rule that governs the changed code against every instance in the diff (corroborated by [RULE]'s 61-instance sweep):

- **Epic core-purity (no DOM/time/random/rAF; time only via `dt`)** — `firing.ts`, `input.ts`, `movement.ts`: COMPLIANT. Zero banned tokens; `dt` is the sole time source. Enforced by `firing-purity.test.ts` and independently confirmed by [RULE] (rule 14, 3 instances, 0 violations).
- **Core/shell boundary (core imports only sibling `./` core)** — `firing.ts` imports `./camera`, `./obstacles`, `./movement`, `./input` only; no `../shell/`, no node builtins. COMPLIANT (firing-purity.test.ts:430; [RULE] rule 15, 7 instances).
- **Readonly discipline** — `Shell` (4 fields), `Input` (3 fields incl. new `fire`), `GUNSIGHT_NDC` (`readonly [number, number]`), `OBSTACLE_RADIUS` (`Readonly<Record<…>>`): all `readonly`. `stepFiring`/`shellBlocked` return fresh objects / never mutate. COMPLIANT. Note: the `dist <= 0` path returns the *same* `active` object — an identity return, not a mutation, so it's compliant.
- **Determinism / planar-sim** — `stepFiring`/`shellBlocked` are pure over immutable module constants, no hidden state; `Shell` carries `x,z,heading,range` — no `y`. COMPLIANT ([RULE] rules 16 & 18).
- **TS #1 type-safety escapes** — none in `src/`; the tests' `as unknown as Partial<…>` is the accepted RED-load idiom. COMPLIANT.
- **TS #2 generics / #4 null-undefined / #5 modules / #11 error-handling** — no `Record<string,any>`/`object`/`Function`; `OBSTACLE_RADIUS[o.type]` indexes a `Readonly<Record>` over the *closed* `ObstacleType` union (matches `movement.ts`'s own idiom; `noUncheckedIndexedAccess` is off project-wide); `import type` used correctly; no `catch (e: any)`. COMPLIANT.
- **Enums / React / async / build-config / input-validation** — N/A or COMPLIANT; keyboard `fire` is a boolean off a closed hardcoded key-set, no unvalidated string reaches a typed field.

### Devil's Advocate

Assume this code is broken. Where does it fail? The loudest crack is the substep loop: `for (let i = 0; i < substeps; i++)` with `substeps = Math.ceil(dist / SHELL_SUBSTEP)`. Feed it a degenerate `dt` and it does hang — two specialists proved it. A confused future author who wires a replay/save-state system (bz1-7+ will want exactly that) and forgets the `main.ts` clamp hands an unclamped `dt` straight into a pure-core function whose own test file *promises* "no NaN/Infinity blow-up." That promise is a lie told by a dead `if` branch. A stressed run — a machine that sleeps for a very long time, a debugger paused across a breakpoint — produces a large `(tMs - last)`, but `Math.min(0.05, …)` catches it, so the shipped loop is safe; the danger lives only outside the clamp. A malicious user has almost nothing to attack: no network, no storage, no injection sink, `fire` is a boolean, coordinates are numbers, canvas calls are numeric. Prototype pollution? No object-merge from external data. ReDoS in the purity regexes? Linear, no nested quantifiers. What about a player who hugs a wall and fires point-blank — does a shell spawn inside the pyramid and "leak" a frame? No: the tank centre (where the shell is born) is kept a full `PLAYER_RADIUS` beyond the shell's own block radius, so the spawn is always on open ground. What about firing mid-turn — does the shell curve to chase the turret? No; heading is frozen at fire time and never re-read (a real, hard-to-fake test proves it). What breaks if the obstacle table were mis-keyed by type? The behavioural flight test only actually strikes a wide-pyramid, so a per-type radius regression could slip past the *flight* path — but the `shellBlocked`-at-centre test exercises all 21 obstacles across all four types, so the lookup itself is covered. Net: the only genuine fault is unreachable in the running game, and everything a player, an attacker, or a stressed OS can actually reach behaves correctly.

## Reviewer Assessment

**Verdict:** APPROVED

The story ships its three deliverables — shell projectile, centered gunsight, line-of-sight shot blocking — correctly, ROM-faithfully, and with real (non-vacuous) behavioural coverage. All mechanical gates are green (246/246 tests, `tsc --noEmit` clean, `vite build` succeeds) and the specialist sweep found **zero Critical or High** issues. Confirmed findings are all Medium/Low and non-blocking; they are captured as Delivery Findings for a fast-follow.

**Subagent dispatch (all confirmed findings tagged by source):**
- `[EDGE]` — edge-hunter disabled via settings; I performed the boundary analysis myself: `dt=0`/negative (`dist <= 0` guard, firing.ts:131), max-range expiry within one step of `$7f00` (firing.test.ts:727-744), and swept anti-tunnel (`stepDist ≤ 64` ≪ smallest footprint radius 724) all hold. The one boundary that fails — non-finite `dt` — is captured below.
- `[SILENT]` — silent-failure-hunter disabled; self-checked: no swallowed errors in `src/` (the tests' empty `catch {}` is the RED-load idiom paired with an immediate descriptive `throw`). `stepFiring` signals expiry/block via an explicit `null`, not a silent fallback.
- `[TEST]` — CONFIRMED: half-vacuous NaN/Infinity test (dead `if` branch, firing.test.ts:842-856); unfrozen `POSE` in the purity suite (firing-purity.test.ts:105). Both Medium/Low, non-blocking — see Delivery Findings.
- `[DOC]` — comment-analyzer disabled; self-checked: the `firing.ts` header, the `Shell`/`stepFiring` docblocks, and the ROM-offset citations match the implementation. No stale or misleading comments.
- `[TYPE]` — type-design disabled; self-checked + [RULE]: `Shell`/`Input` fields all `readonly`, `GUNSIGHT_NDC` a `readonly` tuple, no stringly-typed APIs, planar-sim (no `y`) honoured. Clean.
- `[SEC]` — CONFIRMED: non-finite-`dt` unbounded loop (firing.ts:131-135) — Low/unreachable, non-blocking. DISMISSED: unremoved keyboard listeners (benign, single instantiation). No injection/secret/auth surface.
- `[SIMPLE]` — simplifier disabled; self-checked: no dead code or over-engineering; the one DRY note (triplicated run-to-expiry loop, firing.test.ts) is Low, non-blocking.
- `[RULE]` — CLEAN: 18 rules × 61 instances, 0 violations. Purity, boundary, readonly, determinism, planar-sim all verified mechanically.

**Data flow traced:** keyboard `Space`/`F` → `KeyboardTreads.read().fire` (shell/input.ts:59) → `main.ts` `input` → core `stepFiring(shell, pose, input, dt)` (firing.ts:121) → `Shell | null` → rendered via `projectModel(SHELL, …)` + `drawGunsight` (main.ts:57-61). Safe: `fire` is a boolean, no string reaches a DOM sink; the whole path is numeric.
**Pattern observed:** textbook pure-reducer / core-shell split — all firing math is a deterministic `dt`-driven reducer in `src/core/firing.ts`; the shell layer only strokes pixels (`drawGunsight`, render.ts:47). Matches the movement.ts precedent.
**Error handling:** `dist <= 0` guards the zero/negative-`dt` case (firing.ts:131); expiry and obstacle-strike both return `null`; the single gap — non-finite `dt` → non-terminating loop — is unreachable through `main.ts`'s clamp and logged as a non-blocking Improvement.
**Wiring:** no backend; keyboard → core → canvas verified end-to-end, including the eyeballed screenshot (`bz1-5-gunsight-firing.png`: centered reticle + ROM obstacle field + skyline, zero console errors).
**Handoff:** To SM (The Organic Mechanic) for finish-story.