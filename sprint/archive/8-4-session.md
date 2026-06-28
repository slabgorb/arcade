---
story_id: "8-4"
jira_key: ""
epic: ""
workflow: "tdd"
---
# Story 8-4: Wave 2 — Death Star surface: towers, laser turrets, terrain skim

## Story Details
- **ID:** 8-4
- **Jira Key:** (none — local sprint tracking)
- **Workflow:** tdd
- **Stack Parent:** 8-3 (Wave 1 — space combat)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T06:39:22Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T05:51:08Z | 2026-06-28T05:53:10Z | 2m 2s |
| red | 2026-06-28T05:53:10Z | 2026-06-28T06:12:38Z | 19m 28s |
| green | 2026-06-28T06:12:38Z | 2026-06-28T06:27:49Z | 15m 11s |
| review | 2026-06-28T06:27:49Z | 2026-06-28T06:39:22Z | 11m 33s |
| finish | 2026-06-28T06:39:22Z | - | - |

## Branch Strategy
**Branch Strategy:** gitflow (feat/8-4-wave-2-death-star-surface)

## Sm Assessment

Story 8-4 (Wave 2 — Death Star surface) is set up and ready for the RED phase.

**Scope & nature.** A 5-point TDD story in `star-wars`, stacked on 8-3 (Wave 1).
Two intertwined concerns: (1) **geometry connectivity debt** carried over from the
8-2 port — `DEATH_STAR_SURFACE` and `SURFACE_TOWER` still use the nearest-neighbour
heuristic EDGES that render as tangled wireframes (the exact class of bug already
fixed for the TIEs in 8-3); (2) **new Wave 2 gameplay** — towers, laser turrets,
and terrain-skim mechanics.

**Anticipated impediments.**
- The edges must be **re-authored by ring reconstruction** (close each coplanar ring
  into a loop + radial spokes/struts), guarded by an `inducedSingleCycle` topology
  test in `tests/core/models.test.ts`. This is the heart of the story, not a footnote.
- Each model needs a **fixed display orientation** (à la `TIE_ORIENT` in
  `shell/render.ts`): trench/surface lie in `y=0`, towers stand on `+y`. Object-space
  axes ≠ in-game view.
- **Structural tests do not catch orientation/scale.** Every model must be eyeballed
  the first time it renders — flag this for the GREEN/REVIEW phases.
- Points may need revisiting given the re-authoring load (noted in the YAML).

**Required reading for the next agents:** `context-story-8-4.md`, plus
`context-epic-8.md` → "Geometry connectivity (read before 8-4/8-5)".

**Setup verification.** Session file present; story + epic context present; feature
branch `feat/8-4-wave-2-death-star-surface` created from `develop`. No Jira (local
sprint tracking). Merge gate clear — no open PRs, no in-progress/in-review stories.

**Routing decision:** Phased TDD → hand off to TEA (Han Solo) for the RED phase to
author failing tests for ring-based edge topology, display orientation, terrain
collision, and turret spawning.

## TEA Assessment

### Red Phase (test writing)

**Tests Required:** Yes
**Status:** RED (16 failing, ready for Dev) — all pre-existing suites green.

**Test Files:**
- `tests/core/models.test.ts` (extended) — Story 8-4 ring-reconstruction topology
  guard. Adds `deriveRings()` (recovers coplanar equal-radius rings from the
  VERTICES alone — uniform-scale invariant, hubs/strays fall out) and
  `inducedSingleCycle()` (a ring's induced edges form exactly one closed loop).
  Guards `DEATH_STAR_SURFACE` (>=5 cross-section rings) and `SURFACE_TOWER`
  (>=2 rings: y=0 base + upper stack). A 4-test self-check block proves the
  helper discriminates (accepts loops, rejects open rims / disjoint loops, ignores
  spokes to outside vertices) so the guard can't pass vacuously.
- `tests/core/surface.test.ts` (new) — Wave 2 gameplay contract driven through
  `stepGame`: terrain skim (altitude starts at `SKIM_ALTITUDE`, yoke climbs/dives,
  clamped >= 0, scraping below `MIN_SKIM_ALTITUDE` costs one shield + recovers,
  last-shield crash ends the run); laser turrets (timed spawn, on the floor ahead,
  capped at `MAX_TURRETS`, fire at the cockpit, deterministic, no TIEs in surface
  phase); collisions/scoring (bolt destroys a turret for `TURRET_SCORE`, a miss
  leaves it, turret fire to the cockpit costs a shield). Plus AC-2 structural
  checks: `SURFACE_ORIENT`/`TOWER_ORIENT` exported from `shell/render.ts` as
  well-formed Mat4s.

**Tests Written:** 24 new tests (10 models/topology incl. self-check, 14 surface)
covering AC-1 (geometry topology), AC-2 (orientation, structural), AC-3 (terrain
skim + turrets + collisions).
**Status:** RED — 16 failing for the right reasons (assertion/matcher level, no
collection crash). The 3 surface tests green during RED are legitimate invariants
(determinism; a miss leaving the turret untouched; carry-forward enemy-fire→cockpit
damage), not vacuous passes.

### Rule Coverage

Source: `.pennyfarthing/gates/lang-review/typescript.md`. Most checks are
implementation-side (DEV self-review); the test-relevant ones:

| Rule | Test(s) / how enforced | Status |
|------|------------------------|--------|
| #8 Test quality — meaningful assertions | self-check block guards the topology helper; `typeof`/`isMat4` guards before value asserts | green (self-check) |
| #8 Test quality — no `as any` / `as unknown as` casts | removed all casts; tests reference fields directly (tsc red until GREEN, vitest green) | clean |
| #8 Test quality — import from `src/`, not `dist/` | all imports from `../../src/...` | clean |
| #4 Null/undefined — `??` not `\|\|` | `s.turrets ?? []` guards (never `\|\|`) | clean |
| Determinism (sacred boundary / SOUL) | `spawns identically for a fixed seed`; suite drives only via `stepGame`/`dt`/seeded RNG, no `Date.now`/`Math.random` | failing (RED) |

**Rules checked:** 5 of 13 lang-review checks are test-relevant at RED; the rest
(type-safety escapes, generics, enums, modules, async, build-config, input
validation, error handling) are GREEN-phase DEV self-review concerns.
**Self-check:** 0 vacuous tests; added the `inducedSingleCycle` self-check block to
prevent a tautological topology guard.

**Handoff:** To Dev (Yoda) for GREEN — re-author the two models' edges by ring
reconstruction, add `SURFACE_ORIENT`/`TOWER_ORIENT`, and implement surface-phase
state + mechanics. **MUST eyeball both models in the dev server (port 5274) on
first render** — structural tests don't catch orientation/scale.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed (star-wars):**
- `src/core/models.ts` — re-authored `DEATH_STAR_SURFACE` & `SURFACE_TOWER` edges
  by ring reconstruction (close each coplanar ring into a loop + hub spokes +
  longitudinal/base struts), replacing the 8-2 nearest-neighbour heuristic;
  updated the header note (TIE/DARTH/TRENCH still owe reconstruction).
- `src/core/state.ts` — `Turret` interface; `altitude`/`turrets` `GameState`
  fields; Wave 2 constants (`SKIM_ALTITUDE`, `MIN_SKIM_ALTITUDE`,
  `TURRET_SPAWN_INTERVAL`, `MAX_TURRETS`, `TURRET_SCORE`, `TURRET_HIT_RADIUS`,
  internal `ALTITUDE_RATE`, `TURRET_SCROLL_SPEED`); `initialState` seeds them.
- `src/core/sim.ts` — phase branch in `stepGame` (shared prologue for player
  bolts + enemy-shot advance); new `stepSurface` (terrain skim altitude with
  floor clamp + survivable scrape, turret scroll/spawn/fire, bolt-vs-turret
  scoring, cockpit damage) and `spawnTurret`. All spatial tests route through
  `math3d`/`gameRules.collides` in 3D; rng cloned, no mutation — purity intact.
- `src/shell/render.ts` — `SURFACE_ORIENT`/`TOWER_ORIENT` consts; `drawModelAt`
  applies an orientation matrix; surface-phase draw (oriented surface + towers).

**Tests:** 79/79 passing (GREEN). `tsc --noEmit` clean; `vite build` succeeds.

**Eyeball:** Both models rendered from the real source via a throwaway Vite page
(now removed) — **no tangle**: the tower stands upright (closed base, sloped
struts to the upper box, inner detail), the surface reads as a coherent ridge
(closed triangular cross-sections + struts). Live in-phase eyeball is deferred —
the surface phase is not yet reachable (see deviation/finding on wave progression).

**Branch:** `feat/8-4-wave-2-death-star-surface` (pushed to origin).

**Handoff:** To Reviewer (Obi-Wan). Review focus: ring-reconstruction correctness,
orientation authenticity, surface-phase collision math (all 3D via `math3d`),
determinism/purity of `stepSurface`, and the deferred wave-progression gap.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 0 smells (tests 79/79 green, build PASS, tree clean) | confirmed 0, dismissed 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings (covered by reviewer) |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings (covered by reviewer) |
| 4 | reviewer-test-analyzer | No | Skipped | disabled | Disabled via settings (covered by reviewer) |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings (covered by reviewer) |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings (covered by reviewer + rule-checker) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings (covered by reviewer — N/A, client-only) |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings (covered by reviewer) |
| 9 | reviewer-rule-checker | Yes | findings | 2 (both low) | confirmed 2, dismissed 0, deferred 0 |

**All received:** Yes (2 enabled returned; 7 disabled via `workflow.reviewer_subagents` and covered by the reviewer directly)
**Total findings:** 2 confirmed (low) from rule-checker + 5 reviewer-originated (all low/medium); 0 dismissed; 0 Critical/High

## Reviewer Assessment

**Verdict:** APPROVED

The story's primary deliverable — re-authoring the two tangled models by ring
reconstruction — is correct (topology guard passes, eyeballed: no tangle), the
surface-phase gameplay is fully tested (79/79 green), the build is clean, and the
**sacred core/shell boundary is fully respected** (verified by rule-checker across
all three core files + my own read). No Critical or High issues. The findings below
are all low/medium and non-blocking; they are recorded as delivery findings for
optional follow-up.

### Rule Compliance (TypeScript lang-review + sacred boundary)

Exhaustive enumeration (rule-checker corroborated, 58 instances across 13 rules):
- **#1 Type-safety escapes** — clean. `[...shooter.pos] as Vec3` (sim.ts:202) is the
  established tuple-narrowing cast (matches pre-existing spawnTie); the `!` assertions
  in the test helper are provably safe (see [RULE]/[TEST] below). No `as any`/`as unknown as`.
- **#2 Generics/interface** — one low finding: `StepCommon.projectiles` should be
  `readonly` (never mutated). `Turret`/`GameState` fields consistent with existing types.
- **#3 Enums** — clean. `Phase` is a string union (no enum), unchanged.
- **#4 Null/undefined** — `??` used (never `||`); one low finding: `adj.get(...)!` in
  the test helper matches the "Map.get without undefined check" form.
- **#5 Modules** — clean. `type` keyword on type-only imports; bundler resolution (no `.js`).
- **#6 React/JSX** — N/A (no .tsx). **#7 Async** — N/A (all synchronous).
- **#8 Test quality** — clean and exemplary: the `inducedSingleCycle` self-check block
  prevents a vacuous guard; `isMat4` validates at runtime; imports from `src/`, no `as any`.
- **#9 Build-config** — clean (strict mode on; no config changes). **#10 Input validation**
  — N/A (no boundaries). **#11 Error handling** — N/A (pure sim). **#12 Perf** — clean
  (orient consts computed once; ~184 mat·vec ops/frame, trivial).
- **#13 Sacred boundary** — clean: core imports no shell; no DOM/`Date`/`Math.random`;
  rng cloned at sim.ts:60 before branching; orientation lives in the shell and routes
  through `math3d.rotationZ`; `stepGame` referentially transparent.

### Observations (tagged by source)

- `[RULE]` [LOW] `StepCommon.projectiles` is `Projectile[]` but only read (passed to
  `filter()`), never pushed — should be `readonly Projectile[]` (sim.ts:162). `enemyShots`
  correctly stays mutable (pushed at sim.ts:201). One-word fix. Confirmed (rule #2).
- `[RULE]`/`[TEST]` [LOW] Four `adj.get(...)!` non-null assertions in `inducedSingleCycle`
  (models.test.ts:309–322) match the "Map.get without undefined check" anti-pattern (rule
  #4). Provably safe — `adj` is pre-populated for every ring member (line 305) and edge
  access is guarded by `ringSet.has()` (line 308). Confirmed but non-blocking; the form,
  not the runtime behaviour, is the issue. A `getAdj()` throwing helper would satisfy it.
- `[SIMPLE]`/`[EDGE]` [LOW] Redundant floor clamp `if (altitude < 0) altitude = 0`
  (sim.ts:166): since `MIN_SKIM_ALTITUDE` (40) > 0, any sub-floor altitude is immediately
  caught by the scrape check (sim.ts:168) and reset to `SKIM_ALTITUDE`, so the clamped 0 is
  never observed. Harmless defence-in-depth but dead-effect as written.
- `[SIMPLE]` [LOW] Turret scroll inlines vector math (sim.ts:176) — `[x, y, z + SCROLL*dt]`
  — instead of `add`/`scale` from `math3d` as `moveEnemy`/`advance` do. Minor "one math
  source" inconsistency; not a boundary violation (it's a trivial translation).
- `[DOC]` [LOW] Stale comment in the models.test.ts 8-4 header (line ~423): "DEATH_STAR_SURFACE
  and SURFACE_TOWER **still carry** the 8-2 nearest-neighbour heuristic edges" reads
  present-tense but they have now been re-authored. Rationale-historical, but reword to past tense.
- `[EDGE]` [MEDIUM, accepted-deviation] Wave progression gap: the game starts in `'space'`
  and never transitions, so the surface phase + its rendering are dark code in live play —
  the AC "player can skim the surface…" is unmet end-to-end. Documented by TEA+Dev,
  epic-aligned (progression is 8-6), consistent with 8-3, and no test contracts it.
  Accepted as a scope boundary; tracked for 8-6. The render places turrets at y=0 while the
  floor is drawn at y=-altitude (render.ts:380–383) — they will float; part of the same
  deferred 8-6 surface render tuning.
- `[SILENT]` [VERIFIED] No swallowed errors / silent fallbacks. `stepSurface` has no
  try/catch (pure sim); `Math.max(0, state.lives - damage)` (sim.ts:225) is an intentional
  lives floor, mirroring the space path — not a silenced failure.
- `[SEC]` [VERIFIED] No security surface: client-only game, no auth, no input boundaries,
  no secrets, no `JSON.parse`/network. N/A.
- `[TYPE]` [VERIFIED] `Turret { pos: Vec3 }` mirrors `Enemy`; `Vec3` is already `readonly`.
  New `GameState` fields typed concretely.
- `[VERIFIED]` Core purity — `stepSurface`/`spawnTurret` (sim.ts:161–251) use only `dt`
  and the cloned `rng`; no DOM/`Date`/`Math.random`. Complies with the CLAUDE.md sacred boundary.
- `[VERIFIED]` Determinism — rng cloned at sim.ts:60; the `spawns identically for a fixed
  seed` + full-state `toEqual` tests pass. Referentially transparent.
- `[VERIFIED]` Ring reconstruction — topology guard passes for both models; eyeballed via a
  throwaway page (removed): tower upright, surface a coherent ridge, no tangle.

### Data flow traced
Yoke `input.aimY` → `stepSurface` altitude (`+aimY*RATE*dt`, floor-clamped, scrape → −1
shield + recover) → render floor at `[0, -altitude, 0]`. Turret spawn: `nextFloat(rng)` →
`turret.pos [x,0,-SPAWN_DISTANCE]` → scroll +Z → `collides()` vs bolts (score) / fire vs
cockpit (lives). All hit-tests in 3D via `gameRules.collides`/`math3d`. Safe.

### Pattern observed
`stepSurface` (sim.ts:161) cleanly mirrors the space-phase structure via a shared prologue
(`StepCommon`), reusing `advance`/`collides`/`toCockpit` and `enemyShots` for turret fire —
good reuse, no duplicated geometry math.

### Devil's Advocate
Could this be broken? I argued the case hard. The most damning angle is that **the entire
Wave 2 feature is unreachable in the shipped game** — `initialState` starts in `'space'`
and nothing ever sets `phase='surface'`, so `stepSurface`, the turret logic, the terrain
skim, and the new render branch never execute outside tests. A cynic calls that "shipping
dark code": 200+ lines that no player will hit until 8-6. But the epic explicitly sequences
wave progression/framing to 8-6, 8-3 shipped the same way (space phase, no transition), and
the story's real charter — fixing the flagged tangled-geometry debt + building the surface
mechanics' tested foundation — is fully met. So it's deliberate layering, not an accident.
Next: what would a malicious/confused state do? Constructing `altitude` as `NaN` would make
`altitude < MIN` false (NaN comparisons are false) → no scrape, NaN propagates — but `altitude`
is core-owned (initialState seeds it; the shell never writes it), so untrusted NaN can't enter.
A huge `dt` (tab refocus) drives altitude far negative → clamped, one scrape, recover — bounded,
no multi-damage per step (verified: a single `if`, not a loop). Turret scroll with huge `dt`
could overshoot z>0 in one step → despawned by the `pos[2] < 0` filter — fine. Determinism
under reordering? rng is used spawn-then-fire in a fixed order; cloned, never shared. The one
genuine latent bug a stressed run could expose is the floating-turret render placement (y=0 vs
floor at −altitude), but that is render-only, in the dark phase, and tracked for 8-6. Nothing
the devil surfaced rises to Critical/High.

### Verdict rationale
No Critical/High. 7 low + 1 accepted-medium-deviation, all documented. The flagged geometry
debt is genuinely fixed and verified by eye. **APPROVED.**

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

No upstream findings.

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): Story/epic context says 8-3 reconstructed the
  TIE_FIGHTER/DARTH_TIE edges (guarded by `inducedSingleCycle`) and added a
  `TIE_ORIENT` transform in `shell/render.ts` — none of that exists. Git shows 8-3
  delivered only space combat + HUD; the TIE models still carry the 8-2
  nearest-neighbour edges (outer rings don't close) and there is no topology helper
  or orientation const anywhere. Affects `sprint/context/context-story-8-4.md` and
  `sprint/context/context-epic-8.md` → "Geometry connectivity" (describes TIE work
  as done that isn't). The 8-4 topology helper is authored fresh here, not reused.
  *Found by TEA during test design.*
- **Conflict** (non-blocking): `src/core/input.ts` documents `aimY` as
  "[-1,1] (up..down)" (i.e. +1 = down), but `aimDirection()` (`[aimX, aimY, -1]`)
  and the render NDC both treat +aimY as up. The terrain-skim tests adopt the used
  convention (+aimY climbs). Affects `src/core/input.ts` (reconcile the doc comment
  with actual usage). *Found by TEA during test design.*
- **Gap** (non-blocking): The surface phase has no entry trigger — `GameState.phase`
  supports `'surface'` but `stepGame` never transitions space→surface→trench, so
  nothing enters the surface phase in normal play. The RED suite drives surface
  mechanics by constructing `phase:'surface'` states directly (as 8-3 constructed
  collision states). Wave progression may belong here or in 8-6 (framing/difficulty).
  Affects `src/core/sim.ts`. *Found by TEA during test design.*
- **Question** (non-blocking): No authentic surface-phase constants are recoverable
  as labelled tables — `StarWars.asm` is raw 6809 (the 8-3 DEV already noted no
  symbolic score/shield/timing tables). The new constants (`SKIM_ALTITUDE`,
  `MIN_SKIM_ALTITUDE`, `TURRET_SPAWN_INTERVAL`, `MAX_TURRETS`, `TURRET_SCORE`,
  `TURRET_HIT_RADIUS`) will be authentic-FEEL, single-sourced in `src/core/state.ts`
  like the Wave 1 constants, pending deeper RE. Affects `src/core/state.ts`.
  *Found by TEA during test design.*
- **Improvement** (non-blocking): 5 pts covers re-authoring two tangled models by
  ring reconstruction, two display orientations, AND a full new gameplay phase
  (altitude/terrain collision + turret spawn/fire/score). SM already flagged points
  may need revisiting; test design confirms the gameplay alone rivals 8-3's scope.
  Affects sprint planning. *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): Confirmed during implementation — the surface phase has
  no entry trigger. `stepGame` runs surface logic when `phase === 'surface'`, but
  nothing transitions space→surface→trench, so the surface, turrets, and terrain
  skim are exercised only by tests/constructed states, not live play. Wave
  progression (advance conditions per phase) is unbuilt. Affects `src/core/sim.ts`
  — belongs to 8-6 (framing/difficulty) or a dedicated progression story.
  *Found by Dev during implementation.*
- **Improvement** (non-blocking): `DEATH_STAR_SURFACE` is only 16 authentic verts
  (5 sparse cross-sections) and renders as a single elongated ridge, not a broad
  tiled floor. A convincing "skim the surface" feel will likely need the live phase
  to tile/scroll multiple instances or add more relief models — the geometry is
  correct, the quantity is sparse. Affects `src/shell/render.ts` placement + 8-6
  scope. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `StepCommon.projectiles` is `Projectile[]` but only read
  (passed to `filter()`), never mutated — make it `readonly Projectile[]` (rule #2).
  Affects `src/core/sim.ts` (line ~162). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Four `adj.get(...)!` non-null assertions in
  `inducedSingleCycle` match the "Map.get without undefined check" anti-pattern (rule #4);
  provably safe but a throwing `getAdj()` helper would satisfy the rule. Affects
  `tests/core/models.test.ts` (lines ~309–322). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Redundant `if (altitude < 0) altitude = 0` clamp is
  dead-effect (`MIN_SKIM_ALTITUDE` > 0 catches all sub-floor values and resets to SKIM).
  Affects `src/core/sim.ts` (line ~166). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Turret scroll inlines `[x, y, z + SCROLL*dt]` instead of
  `math3d` `add`/`scale` as `moveEnemy`/`advance` do — minor "one math source" inconsistency.
  Affects `src/core/sim.ts` (line ~176). *Found by Reviewer during code review.*
- **Gap** (non-blocking): Render places turrets at y=0 while the surface floor is drawn at
  y=-altitude — turrets will float above the floor; part of the deferred 8-6 surface render
  tuning. Affects `src/shell/render.ts` (lines ~380–383). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): Stale present-tense comment ("still carry the 8-2
  nearest-neighbour heuristic edges") in the models.test.ts 8-4 header is now inaccurate
  post-reconstruction. Affects `tests/core/models.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

No deviations logged yet.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Yoke-Y → altitude sign chosen by TEA (spec underspecified)**
  - Spec source: context-story-8-4.md, AC-3
  - Spec text: "Player's Y-position is constrained to skim the surface (y ≈ 0, with small clearance)"
  - Implementation: terrain-skim tests assert +aimY climbs / -aimY dives (CLIMB/DIVE inputs)
  - Rationale: the spec doesn't define the sign; input.ts's doc comment ("up..down") contradicts the used convention in aimDirection() and the render NDC (both +aimY = up). Tests follow the used convention so they don't fight the established aim direction.
  - Severity: minor
  - Forward impact: DEV must map +aimY to increasing altitude; if a different sign is chosen, the one directional test flips.
- **Terrain crash modelled as survivable (one shield + recover), not instant kill**
  - Spec source: context-story-8-4.md, AC-3
  - Spec text: "Terrain collision: player hits DEATH_STAR_SURFACE if Y drops below minimum skim height"
  - Implementation: scraping below MIN_SKIM_ALTITUDE costs exactly one shield per crash and bounces the ship back to >= MIN (no per-step drain); game over only when the last shield is lost.
  - Rationale: AC says "decrements lives," implying survivable; single-step -1 with recovery prevents an infinite drain while below the floor and matches the cabinet's survivable-crash feel.
  - Severity: minor
  - Forward impact: DEV must reset/clamp altitude up after a terrain hit; if instant-kill is preferred, the "recovers to >= MIN" assertion changes.
- **Display-orientation tests assert structure only; visual correctness deferred to eyeball**
  - Spec source: context-story-8-4.md, AC-2
  - Spec text: "Transforms are applied consistently when rendering (mock render test or integration test)"
  - Implementation: tests assert SURFACE_ORIENT/TOWER_ORIENT exist as well-formed Mat4s; they do NOT assert the transform is correct or applied.
  - Rationale: environment is node (no canvas) and the epic mandates eyeballing orientation/scale ("structural tests catch tangles but not orientation or scale"); project convention verifies the shell by running the game. A brittle mock-render test would assert little of value.
  - Severity: minor
  - Forward impact: DEV/REVIEWER MUST eyeball both models in the dev server (port 5274) on first render — structural tests cannot catch a wrong orientation.
- **inducedSingleCycle guard scoped to the two 8-4 models only**
  - Spec source: context-epic-8.md, "Geometry connectivity (read before 8-4/8-5)"
  - Spec text: "guard with a topology test — reuse inducedSingleCycle(edges, ringIndices) ... assert each rim/ring closes"
  - Implementation: the topology guard runs over DEATH_STAR_SURFACE and SURFACE_TOWER only, not all models.
  - Rationale: TIE_FIGHTER/DARTH_TIE still carry heuristic edges (TIE reconstruction was never done — see Delivery Findings) and TRENCH is 8-5's scope; sweeping all models would fail out-of-scope models. The helper is written generically so 8-5 can reuse it for TRENCH.
  - Severity: minor
  - Forward impact: 8-5 must add the TRENCH ring guard; the TIE models' tangle remains owed.

### Dev (implementation)
- **Wave progression (space→surface transition) not implemented**
  - Spec source: context-story-8-4.md, GREEN "Final state"
  - Spec text: "Player can skim the surface, avoid towers/turrets, fire at turrets, and see collisions"
  - Implementation: surface-phase mechanics + rendering are implemented, but stepGame does not transition the game into the surface phase; it is reachable only by constructing phase:'surface' (as the tests do). Eyeballed via a throwaway page, not in live play.
  - Rationale: TEA flagged progression as ambiguous/possibly-8-6; no test requires it; a transition trigger is unbounded design and would risk the green space suite. Consistent with 8-3, which added a phase without progression.
  - Severity: minor
  - Forward impact: 8-6 must wire space→surface→trench progression; surface placement/scale in render.ts may need tuning once it runs live.
- **Display orientation values chosen by Dev (no disasm draw code to confirm)**
  - Spec source: context-story-8-4.md, AC-2 / "Display Orientation"
  - Spec text: "Determine the display orientation in this story by examining the vertex data and the reference disassembly rendering code (if available)"
  - Implementation: SURFACE_ORIENT = rotationZ(-90°) (lays the X/Y cross-sections so relief rises in +Y); TOWER_ORIENT = identity (the tower is already authored upright). Chosen from vertex geometry + eyeball — the AVG draw code carries no recoverable per-object orientation.
  - Rationale: geometry analysis showed the surface cross-sections stand in the X/Y plane (need a roll to read as ground relief) while the tower base already sits in y=0 rising +Y. Confirmed by eyeball (no tangle, sensible upright tower).
  - Severity: minor
  - Forward impact: re-confirm orientation/scale once the surface phase is live (8-6); a different roll only changes the SURFACE_ORIENT const.
- **"Towers" and "laser turrets" collapsed into one surface entity; no body-contact damage**
  - Spec source: context-story-8-4.md, overview / AC-3
  - Spec text: "avoiding laser turrets and towers" / "Player collision with turret fire decrements lives"
  - Implementation: a single `turrets` entity (rendered with the SURFACE_TOWER model) that scrolls in and fires at the cockpit; only turret FIRE costs a shield (per the tests). No separate passive "tower" obstacle and no turret-body contact damage.
  - Rationale: the test contract only covers turret fire → cockpit damage; collapsing towers/turrets into one surface enemy is the minimal slice. Body-contact damage is untested and would risk false hits as turrets scroll past the origin.
  - Severity: minor
  - Forward impact: distinct passive towers or fly-into-tower collision, if wanted, are a later story.

### Reviewer (audit)
Every logged deviation reviewed. All ACCEPTED — none flagged.
- **TEA: Yoke-Y +aimY = climb** → ✓ ACCEPTED: matches the used convention in `aimDirection()`/render NDC; implemented consistently in `stepSurface`. Sound resolution of the underspec.
- **TEA: Terrain crash survivable (one shield + recover)** → ✓ ACCEPTED: faithful to "decrements lives" (survivable); single-step −1 with reset prevents drain. Implemented as specified.
- **TEA: Orientation tests structural-only, visual deferred to eyeball** → ✓ ACCEPTED: node env can't assert canvas output; eyeball was performed (throwaway page) and is correctly mandated again for the live 8-6 phase.
- **TEA: Topology guard scoped to the two 8-4 models** → ✓ ACCEPTED: TIE/DARTH/TRENCH are out of 8-4 scope; the helper is generic and reusable for TRENCH in 8-5.
- **Dev: Wave progression not implemented** → ✓ ACCEPTED: epic-aligned (progression/framing is 8-6), consistent with 8-3 shipping a phase without a transition, and uncontracted by tests. Recorded as a tracked finding; surface phase + render are dark until 8-6 wires it.
- **Dev: Orientation values chosen by Dev (no disasm draw code)** → ✓ ACCEPTED: `SURFACE_ORIENT = rotationZ(-90°)`, `TOWER_ORIENT = identity` are geometry-reasoned and eyeball-confirmed (tower upright, surface a coherent ridge). Re-confirm scale/placement when live.
- **Dev: Towers/turrets collapsed to one entity; no body-contact damage** → ✓ ACCEPTED: within the tested contract (only turret fire damages); body-contact is untested and would risk false hits as turrets scroll past the origin. Reasonable slice.

No undocumented deviations found.