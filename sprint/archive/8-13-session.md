---
story_id: "8-13"
jira_key: ""
epic: "8"
workflow: "tdd"
---
# Story 8-13: TIE fighters fly at a fixed orientation — bank/rotate toward the player like the cabinet (Wave 1)

## Story Details
- **ID:** 8-13
- **Jira Key:** none (no Jira integration)
- **Epic:** 8 (Star Wars: vector cockpit shooter)
- **Workflow:** tdd
- **Type:** bug
- **Points:** 3
- **Priority:** p2
- **Status:** backlog
- **Repos:** star-wars
- **Stack Parent:** none (no dependencies)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-06-28T18:47:55Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-06-28T18:09:14Z | 2026-06-28T18:11:07Z | 1m 53s |
| red | 2026-06-28T18:11:07Z | 2026-06-28T18:27:25Z | 16m 18s |
| green | 2026-06-28T18:27:25Z | 2026-06-28T18:37:15Z | 9m 50s |
| review | 2026-06-28T18:37:15Z | 2026-06-28T18:47:55Z | 10m 40s |
| finish | 2026-06-28T18:47:55Z | - | - |

## Technical Approach

### Problem
TIE fighters currently fly at a fixed orientation (rotated 90 degrees from player view in cabinet models). In the authentic Atari 1983 Star Wars cabinet, TIE fighters dynamically bank and rotate to face/track the player as they approach, creating a more immersive 3D cockpit effect.

### Solution Scope
1. **Core simulation (src/core/sim.ts):** Calculate TIE orientation by computing the vector from TIE to player position, then derive rotations around the appropriate axes (pitch/yaw) to orient the TIE toward the player.
2. **Render integration (src/shell/render.ts):** Apply the computed orientation matrix to the TIE model during each frame. The existing TIE_ORIENT matrix will be replaced with a per-entity dynamic orientation.
3. **Test coverage:** Add unit tests in `tests/core/sim.test.ts` verifying TIE orientation changes smoothly as the enemy approaches from different angles (relative to player Z-depth and XY position).

### Acceptance Criteria
- TIE fighters dynamically bank and rotate toward the player as they fly during Wave 1 space combat.
- Orientation is computed in the sim (deterministic, seeded RNG) and applied in render (output only).
- At least 3 test cases verify orientation behavior (far, mid, close approach angles).
- Eyeball test: TIE fighters visually bank toward the player in live game.
- No floating-point precision or gimbal lock issues; smooth interpolation if needed.

## Sm Assessment

**Setup decision:** Routed to the standard `tdd` phased workflow (setup → red → green → review → finish). This is a 3-point behavioral bug, not a trivial chore — the TIE orientation change touches the deterministic sim and must be covered by tests, so TDD is the correct nature for it.

**Repo:** star-wars only. Branch `fix/8-13-tie-fighters-bank-toward-player` cut from `develop` per repos.yaml gitflow.

**Risk / nature analysis:**
- The cabinet behavior is *banking toward the player*, not merely facing it. TEA should pin down whether the fix is yaw/pitch toward the player vector, a roll/bank component, or both. The acceptance criteria leave room for interpretation — TEA must make the expected behavior concrete and deterministic in tests.
- The technical-approach file pointers (`src/core/sim.ts`, `src/shell/render.ts`, `TIE_ORIENT`) are setup-stage guesses. TEA/Dev must verify them against the actual star-wars source before relying on them. Prior epic-8 work shows the TIE model is hand-authored, so orientation math must respect that geometry rather than re-deriving it.
- Determinism guard: orientation must be computed in `src/core` from existing sim state (seeded), with render applying it as output only. No new RNG.

**Handoff:** RED phase → Han Solo (TEA) to author the failing orientation tests.

## TEA Assessment

**Tests Required:** Yes
**Reason:** 3-pt behavioural bug in the deterministic core; the facing math (a per-frame look-at) must be pinned by tests, and the render wiring guarded.

**The bug (confirmed in source, not just the title):** `render.ts:109` draws every TIE with the default `IDENTITY` orient (no orient argument) — the raw model vertices, unrotated, identically for every enemy regardless of position. There is no `TIE_ORIENT` and no facing field on `Enemy`. So all TIEs render at one frozen orientation. (The epic note claiming a fixed `TIE_ORIENT` is applied is wrong — see Delivery Findings.)

**Contract handed to Dev:**
- `interface Enemy` gains `orient: Mat4`, computed in the PURE CORE (epic guardrail: "per-enemy facing is sim state and stays in core") and recomputed each step from the TIE's current position — set in both `spawnTie` and `moveEnemy` (sim.ts).
- `orient` is a "look toward the cockpit (origin)" rotation: it maps model forward `[0,0,1]` onto `normalize(cockpit − pos)`. Proper rotation only (orthonormal, det +1, no scale/shear/translation).
- `render.ts` passes each enemy's `orient` into the TIE `drawWireframe` call (consumes, never computes — boundary intact). The fixed display correction for the model's Y-stacked panels is a separate render concern, eyeballed.

**Test Files:**
- `tests/core/tie-orientation.test.ts` — core facing contract (exists/valid-rotation, faces cockpit, per-enemy banking, tracks live position, determinism).
- `tests/shell/render.tie-orient.test.ts` — render applies `e.orient` (mechanism guard via a recording canvas stub).

**Tests Written:** 7 tests across 2 files.
**Status:** RED — 6 failing, 1 deterministic guardrail green. 265 pre-existing tests still pass (additive, no regressions). All 6 failures are clean assertion failures — no crashes/undefined-access.

### Rule Coverage

| Rule / Guardrail | Test(s) | Status |
|------------------|---------|--------|
| Determinism — no hidden randomness/time (epic #1) | `identical input produces identical orientations` | passing guard |
| One math source (epic #2) | flagged to Dev as a finding (look-at helper → math3d) + render guard ensures render does no math | flagged / failing |
| Core/shell boundary — render consumes, never computes facing | `render applies the per-enemy TIE orientation` | failing |
| Valid rotation — no scale/shear/translation distorting the model | `freshly spawned TIE carries a well-formed rotation matrix` | failing |
| TS type-safety (#1/#8) — no `as any`/casts; complete enemy literals typecheck post-GREEN | (whole suite; only the established ctx double-cast stub used) | n/a |
| Test quality (#8) — meaningful assertions, no vacuous tests | self-check below | pass |

**Rules checked:** boundary, determinism, one-math-source, rotation validity, and TS type/test-quality of the applicable lang-review checklist (the React/async/API/enum checks are N/A to this pure game core).
**Self-check:** 0 vacuous tests found (every test asserts concrete numeric/structural values; no `let _ =`, no `assert(true)`).

**Handoff:** To Yoda (Dev) for the GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes

**Approach:** Per-enemy facing computed in the PURE CORE and applied (only) in render — honouring the boundary and the epic guardrail "per-enemy facing is sim state and stays in core."

**Files Changed:**
- `src/core/math3d.ts` — new `lookRotation(forward, up?)` (acts on TEA's "one math source" finding): a pure rotation mapping local +Z onto a direction, right-handed orthonormal, gimbal-guarded, IDENTITY on zero input.
- `src/core/state.ts` — `Enemy` gains required `orient: Mat4` (+ `Mat4` import).
- `src/core/sim.ts` — `spawnTie` and `moveEnemy` set `orient = lookRotation(toCockpit(pos))`, recomputed each step from the TIE's current position (deterministic; no new RNG).
- `src/shell/render.ts` — new fixed `TIE_ORIENT` display correction; the TIE draw composes `multiply(e.orient, TIE_ORIENT)` (render consumes the facing, never computes it).
- `tests/core/events.test.ts`, `tests/core/combat-kill-loop.test.ts` — added `orient: IDENTITY` to 4 pre-existing `Enemy` fixtures so `tsc` stays green (required-field change; behaviour unchanged).

**Tests:** 271/271 passing (GREEN) — 264 pre-existing + 7 new, zero regressions. `tsc --noEmit` clean (exit 0).

**Boundary / determinism:** facing is derived in `core/` from sim state with no `Math.random`/`Date`/time; `core/` imports no `shell/`; render only reads `e.orient`. Determinism guardrail test passes.

**Eyeball AC — PENDING (deferred by TEA to eyeball):** automated tests prove the facing math and that render applies it, but "TIE fighters visually bank toward the player" is not machine-verifiable. The exact `TIE_ORIENT` (`rotationZ(+π/2)`) needs visual confirmation in the dev server (port 5274) during verify/review — see the Dev deviation. Structurally a head-on TIE composes to `TIE_ORIENT` (panels upright, facing camera), which is the expected silhouette.

**Branch:** `fix/8-13-tie-fighters-bank-toward-player` (pushed to origin).

**Handoff:** To the next phase (verify/review).

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (tests 271/271, tsc 0, 0 smells) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — boundaries assessed by Reviewer |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — assessed by Reviewer |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — test quality assessed by Reviewer + rule-checker |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — docs assessed by Reviewer |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — types assessed by Reviewer + rule-checker |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — N/A (offline game, no security surface) |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — simplicity assessed by Reviewer |
| 9 | reviewer-rule-checker | Yes | findings | 1 (16 rules, 59 instances) | confirmed 1 (LOW), dismissed 0, deferred 0 |

**All received:** Yes (2 enabled subagents returned; 7 disabled via `workflow.reviewer_subagents` and pre-filled)
**Total findings:** 1 confirmed (LOW), 0 dismissed, 0 deferred

## Reviewer Assessment

**Verdict:** APPROVED

The implementation is correct, deterministic, boundary-respecting, and well-tested. No Critical or High issues. One LOW rule finding (a test-only DOM-stub double-cast matching an existing codebase pattern) and one deferred non-blocking eyeball item. The headline bug — every TIE frozen at one orientation — is genuinely fixed: facing is now per-enemy, computed in the pure core, and applied in render.

**Dispatch tags (all specialists accounted for):**
- `[RULE]` reviewer-rule-checker (enabled): 16 rules / 59 instances → **1 LOW violation** — `ctx as unknown as CanvasRenderingContext2D` at `tests/shell/render.tie-orient.test.ts:72` (Rule 1 double-cast without a per-line comment). Confirmed, not dismissed; downgraded to LOW because it is an unavoidable node-env canvas stub mirroring the pre-existing `tests/shell/wireframe.test.ts:18` convention, lives in test code, and does not touch production. Non-blocking.
- `[EDGE]` (subagent disabled — assessed by Reviewer): boundary paths checked — zero-forward → `IDENTITY` guard (`math3d.ts`), gimbal fallback `ref=[0,0,1]` when forward ∥ up, and a TIE that reaches the cockpit (forward = 0) is removed the same frame by the collision filter. No unhandled boundary.
- `[SILENT]` (disabled — assessed by Reviewer): no try/catch, no swallowed errors, no silent fallbacks. The zero-forward → IDENTITY return is documented and intentional, not silent.
- `[TEST]` (disabled — assessed by Reviewer + rule-checker): assertions are substantive — orthonormality/det check, per-component `toBeCloseTo(4)` facing, mirror-symmetry regression, determinism guard, render-diff. Rule-checker Rule 8 confirmed no vacuous assertions, no `as any`.
- `[DOC]` (disabled — assessed by Reviewer): new code is well-documented (`lookRotation` JSDoc, `TIE_ORIENT` eyeball note, `Enemy.orient` doc comment). The stale epic-context note is captured as a delivery finding, not a code-doc defect.
- `[TYPE]` (disabled — assessed by Reviewer + rule-checker): types are sound — `Mat4`/`Vec3` are readonly, `import type` applied correctly, `Enemy.orient` is a correctly-required invariant. No stringly-typed APIs.
- `[SEC]` (disabled — assessed by Reviewer): N/A — offline browser game, no auth, no user input boundary, no secrets, no tenancy, no network. No security surface in this diff.
- `[SIMPLE]` (disabled — assessed by Reviewer): minimal change — one helper, one field, two call sites, one render compose. No dead code, no over-engineering; `lookRotation` is general but justified by the one-math-source rule.

### Rule Compliance

Exhaustive enumeration (rule-checker corroborated, Reviewer spot-checked):
- **Core/shell boundary (epic, sacred):** COMPLIANT — `grep` confirms no `shell` import in `src/core/`; `lookRotation` (`math3d.ts`) uses only core math; `sim.ts` imports `lookRotation` from `./math3d`; `render.ts` only *consumes* `e.orient`. ✓
- **Determinism / no time-or-RNG in core (epic #1):** COMPLIANT — no `Math.random`/`Date`/`performance.now`/DOM in `math3d.ts`/`sim.ts`/`state.ts`; facing is a pure function of position; determinism test passes. ✓
- **One math source (epic #2):** COMPLIANT — facing math lives in `math3d.lookRotation`; sim and render delegate (`lookRotation`, `multiply`, `rotationZ`); no inlined trig. ✓ (Test helper `applyDir` isolates the rotation part — test scope, not sim/render.)
- **Per-enemy facing is sim state; display correction is render (epic):** COMPLIANT — `Enemy.orient` lives in core state and is computed in `sim`; the fixed `TIE_ORIENT` upright correction lives in `render`. The split is exactly as the rule prescribes. ✓
- **TS type-safety (lang-review #1, #2, #4, #5, #8, #13):** COMPLIANT except the single LOW Rule-1 test-stub double-cast above.
- **N/A rules:** #3 enums, #6 React/JSX, #7 async, #9 build-config, #10 input-validation, #11 error-handling — no such constructs in this diff.

### Observations

1. `[VERIFIED]` `lookRotation` is a proper, correct look-at — `src/core/math3d.ts:145-159`. Hand-verified for `pos=[300,0,-1000]`: column 2 (the +Z image) = `normalize(origin−pos)`, basis `{r,u,f}` orthonormal and right-handed (`r×u=f`, det +1), `u` stays world-up. Faces the cockpit, not mirrored, not reversed. Complies with one-math-source + determinism.
2. `[VERIFIED]` Boundary intact — `src/core/sim.ts:472,482` produce `orient` in core; `src/shell/render.ts:126` only consumes it. No reverse import.
3. `[VERIFIED]` Determinism — facing computed purely from `pos`; `tie-orientation.test.ts` determinism case green; no hidden RNG/time.
4. `[VERIFIED]` Required-field type change handled cleanly — `Enemy.orient` required; 4 sibling fixtures updated with `orient: IDENTITY`; `tsc` exit 0; cast fixtures (`{ pos } as Enemy`) unaffected.
5. `[LOW][RULE]` `ctx as unknown as CanvasRenderingContext2D` — `tests/shell/render.tie-orient.test.ts:72`. Double-cast without per-line comment; unavoidable node canvas stub matching `wireframe.test.ts:18`. Non-blocking.
6. `[LOW]` "Bank" semantics — the look-at uses world-up, so straight-flying TIEs *face* the player (yaw+pitch) but do not *roll/bank* around their facing axis. This satisfies the testable facing contract TEA defined; true aerodynamic roll is out of scope for straight-line approaches. Eyeball will judge the feel.
7. `[MEDIUM → non-blocking, deferred]` Eyeball AC pending — the exact `TIE_ORIENT` (`rotationZ(+π/2)`) visual correctness is not machine-verifiable and must be confirmed in the dev server / playtest (port 5274). Documented by TEA and Dev; consistent with repo convention (orientation/scale always eyeballed).

**Data flow traced:** `sim.spawnTie/moveEnemy` compute `e.orient` from `e.pos` (deterministic) → carried in `GameState.enemies` → `render` reads `e.orient` → `multiply(e.orient, TIE_ORIENT)` → `drawWireframe` transforms vertices → screen. Safe: pure data, no external/user input anywhere in the path.

**Error handling:** No failure modes — `lookRotation` guards zero-forward (→ IDENTITY) and gimbal (ref fallback); `moveEnemy` keeps `e.vel ?? ZERO`. The now-required `orient` field prevents an undefined orientation reaching render in production.

**Security analysis:** N/A — offline, client-only vector game; no auth, input sanitization, tenancy, secrets, or network surface.

### Devil's Advocate

Suppose this code is broken. Where would it bite? First, handedness: a look-at built from two cross products is the classic place to invert a sign and point every TIE *away* from the player, or to produce a left-handed basis (det −1) that mirrors the model — the kind of bug unit tests with only magnitude checks miss. I defended against this by hand-evaluating a concrete off-axis case and confirming `r×u=f` (det +1) and that column 2 equals the true cockpit direction; the suite's mirror-symmetry test would also catch a global sign flip. Second, the world-up reference: a TIE passing exactly along the +Y axis would make `cross(up,f)` collapse to zero and yield a garbage basis — but the spawn invariant pins `z=-SPAWN_DISTANCE` (never zero), so forward always has a Z component, and the `ref=[0,0,1]` fallback covers the theoretical case anyway. Third, the required-field change is a stealth blast radius: making `Enemy.orient` mandatory could silently break sibling suites — but `tsc` (which includes `tests/`) is green and all 271 tests pass, so nothing slipped. Fourth, a confused future dev could construct an `Enemy` without `orient` and render it, throwing on `multiply(undefined, …)`; the required type now blocks that at compile time except via deliberate cast. Fifth — the real soft spot — "bank" implies roll, and this implementation only yaws/pitches; a reviewer insisting on literal aerodynamic banking could call the feature half-done. I judge that acceptable: TEA scoped the contract to look-at facing, the visible regression (frozen orientation) is fixed, and roll on straight-line TIEs has no maneuver model to drive it. The remaining genuine unknown is purely visual — whether `rotationZ(+π/2)` reads upright in-game — which is explicitly deferred to playtest and cannot be settled by code review. Nothing here rises to Critical or High.

**Handoff:** To SM (Grand Admiral Thrawn) for finish-story.

## Delivery Findings

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Conflict** (non-blocking): the epic context's "Display orientation" note claims `shell/render.ts` applies a fixed `TIE_ORIENT` to face the TIEs at the player, but render.ts actually draws every TIE with the default IDENTITY orient (no orient argument) and no `TIE_ORIENT` symbol exists — that prose describes an aspiration, not the shipped code, and is the bug itself. Affects `star-wars/src/shell/render.ts` (line 109 TIE draw) and `sprint/context/context-epic-8.md` (the note should be corrected once 8-13 lands). *Found by TEA during test design.*
- **Improvement** (non-blocking): the look-toward-cockpit rotation is general 3D math; per epic guardrail #2 ("one math source") it belongs as a tested helper in `src/core/math3d.ts` (e.g. a look/face-rotation built from `sub`/`normalize`/`cross`), consumed by sim.ts — not inlined ad-hoc in sim. Affects `star-wars/src/core/math3d.ts` (add + unit-test the helper) and `src/core/sim.ts` (`spawnTie`/`moveEnemy` consume it). *Found by TEA during test design.*

### Dev (implementation)
- **Improvement** (non-blocking): the epic context "Display orientation" note (context-epic-8.md) is now out of date in the OTHER direction — 8-13 implements BOTH a per-enemy dynamic look-at `orient` in core AND a fixed `TIE_ORIENT` display correction in render. The note should be rewritten to describe that split (core owns dynamic facing; render owns the upright correction). Affects `sprint/context/context-epic-8.md`. *Found by Dev during implementation.*
- **Resolved** (non-blocking): acted on TEA's "one math source" finding — added a tested `lookRotation()` to `src/core/math3d.ts` (covered by the core suite) rather than inlining the matrix math in sim. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): adding a per-line `// eslint/ts: node-env canvas stub` comment + TODO on the `as unknown as CanvasRenderingContext2D` cast — in BOTH the new `tests/shell/render.tie-orient.test.ts:72` and the pre-existing `tests/shell/wireframe.test.ts:18` — would satisfy lang-review Rule 1 and document the unavoidable stub. Affects `star-wars/tests/shell/` (test-only, cosmetic). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the visual/eyeball AC ("TIE fighters visually bank toward the player in live game") is verified by neither tests nor this code review — it must be confirmed in the dev server / playtest (port 5274), including the exact `TIE_ORIENT` sign and whether straight-flying TIEs read as "banking" vs merely "facing." Affects `star-wars/src/shell/render.ts` (TIE_ORIENT may need a sign/axis tweak after playtest). *Found by Reviewer during code review.*

## Design Deviations

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Forward-axis convention fixed at model +Z (story leaves facing axis undefined)**
  - Spec source: context-story-8-13.md (no ACs recorded); story title
  - Spec text: "bank/rotate toward the player like the cabinet"
  - Implementation: tests adopt model-space forward = `[0,0,1]` and assert `orient` maps it onto `normalize(cockpit − pos)`; the fixed panel-stacking display correction is NOT asserted (left to render).
  - Rationale: the story names no facing axis; +Z is the codebase's own "looking down −Z" convention (bolts fire −Z, TIEs approach from −Z, so a TIE's nose pointing back at the cockpit is +Z), which gives a dead-centre TIE a no-turn baseline.
  - Severity: minor
  - Forward impact: Dev must build the core look-at against +Z forward; the model's display orientation (solar panels stack on Y) is composed on top in render and eyeballed, not unit-tested.
- **Render visual correctness verified by eyeball, not asserted**
  - Spec source: context-epic-8.md ("structural tests can't catch orientation/scale … MUST be eyeballed"); render.ts SURFACE_ORIENT note
  - Spec text: "every model must be viewed in-game once"
  - Implementation: the render test asserts only that a TIE's `orient` CHANGES the stroked geometry (the wiring/mechanism), not that the ship visually faces the player (axis/scale/bank feel).
  - Rationale: orientation/scale correctness escapes structural tests by repo convention; the mechanism guard prevents the wiring being forgotten, while the look itself is confirmed in the dev server (port 5274).
  - Severity: minor
  - Forward impact: GREEN/verify must eyeball a banking TIE in live play before review.

### Dev (implementation)
- **Fixed TIE_ORIENT display correction added in render (rotationZ(+π/2)), beyond what tests gate**
  - Spec source: context-story-8-13.md AC; context-epic-8.md "Display orientation is a render concern, kept out of core"
  - Spec text: "Eyeball test: TIE fighters visually bank toward the player in live game"
  - Implementation: render composes a fixed `rotationZ(+π/2)` (`TIE_ORIENT`) with each enemy's dynamic look-at `orient` — `multiply(e.orient, TIE_ORIENT)` — to stand the model's Y-stacked solar panels upright before banking. The render unit test only requires that `orient` is APPLIED, not the exact display axis.
  - Rationale: the authentic model stacks panels on the Y axis (a TIE on its side); without the upright correction the dynamic facing would bank a sideways ship. +π/2 about Z puts the panels left/right with the model's depth axis on +Z, so a head-on TIE reads as a correct TIE silhouette.
  - Severity: minor
  - Forward impact: the EXACT correction (sign/axis) is NOT test-gated and MUST be eyeballed in the dev server (port 5274) during verify/review; flipping to −π/2 or adding a small rotationX may be needed if the panels read mirrored or tilted.
- **`Enemy.orient` made a required field (per the TEA contract), touching sibling test fixtures**
  - Spec source: TEA Assessment (this session) — "interface Enemy gains orient: Mat4"
  - Spec text: "orient: Mat4" (required, not optional)
  - Implementation: added the required field and updated 4 pre-existing `Enemy` literals (`events.test.ts` ×3, `combat-kill-loop.test.ts` ×1) with `orient: IDENTITY` so `tsc` (which typechecks `tests/`) stays green; those tests' behaviour is unchanged (the sim recomputes `orient` on step).
  - Rationale: a required field is the correct invariant (every live TIE has a facing) and matches the contract; the cast-based fixtures (`{ pos } as Enemy`) were unaffected.
  - Severity: minor
  - Forward impact: none — future `Enemy` constructions must supply `orient` (or cast), which is the intended invariant.

### Reviewer (audit)
- **TEA — Forward-axis convention fixed at model +Z** → ✓ ACCEPTED by Reviewer: sound and codebase-consistent (looking down −Z; bolts fire −Z; TIEs approach from −Z). Hand-verified the look-at honours it.
- **TEA — Render visual correctness verified by eyeball, not asserted** → ✓ ACCEPTED by Reviewer: matches repo convention (orientation/scale escape structural tests); the mechanism guard is the right automated backstop.
- **Dev — Fixed TIE_ORIENT display correction (rotationZ(+π/2))** → ✓ ACCEPTED by Reviewer: required for the visual AC and correctly composed (`multiply(e.orient, TIE_ORIENT)` = display-first, then look). The exact sign/axis remains an eyeball/playtest item, as the author flagged — accepted on that basis.
- **Dev — `Enemy.orient` made a required field** → ✓ ACCEPTED by Reviewer: a required field is the correct invariant; the 4 sibling-fixture updates are behaviour-neutral and `tsc` is green.
- No undocumented spec deviations found. The "look-at faces but does not roll/bank" nuance is within TEA's look-at contract and is captured as Observation 6, not a hidden deviation.