---
story_id: "A-21"
jira_key: "A-21"
epic: null
workflow: "tdd"
---
# Story A-21: Saucer death breakup — flying saucer fractures into drifting, fading line segments (mirrors A2-5 ship breakup)

## Story Details
- **ID:** A-21
- **Jira Key:** A-21
- **Repos:** asteroids
- **Workflow:** tdd
- **Stack Parent:** none
- **Branch Strategy:** gitflow (feat/A-21-saucer-death-breakup)

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-06T22:59:25Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-06T22:22:30Z | 2026-07-06T22:25:50Z | 3m 20s |
| red | 2026-07-06T22:25:50Z | 2026-07-06T22:42:45Z | 16m 55s |
| green | 2026-07-06T22:42:45Z | 2026-07-06T22:54:19Z | 11m 34s |
| review | 2026-07-06T22:54:19Z | 2026-07-06T22:59:25Z | 5m 6s |
| finish | 2026-07-06T22:59:25Z | - | - |

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Improvement** (non-blocking): The `ShipDebrisSegment` type is now reused for saucer
  debris too, so its "Ship" name mildly under-describes it (it is a generic drifting/fading
  line segment). Affects `asteroids/src/core/state.ts` (a future neutral rename to
  `DebrisSegment` would read cleaner; deferred to avoid churning A2-5 code + tests in this
  story). *Found by TEA during test design.*
- **Improvement** (non-blocking): The single-source geometry guard
  (`render-wiring.test.ts`) pins that render.ts no longer keeps a private copy of the
  saucer CONSTANTS (it must import from `core/saucerShape`), but it does not catch a
  duplicated vertex-LAYOUT if Dev keeps `drawSaucer`'s three `strokePoly` calls built from
  the shared constants. Affects `asteroids/src/shell/render.ts` — for full single-source,
  `drawSaucer` should build from `saucerSegments`/a shared polyline source, not just the
  constants. *Found by TEA during test design.*
- **Gap** (non-blocking, pre-empted): The saucer waistline edge's midpoint IS the saucer
  center, so a "velocity = outward from center" breakup leaves that piece with zero
  velocity. Pinned by the "every segment moves" test. Affects `asteroids/src/core/saucerDebris.ts`
  (Dev must use a fixed index-based outward pattern, not pure center-outward). *Found by
  TEA during test design.*
- **Improvement** (non-blocking): `SAUCER_DEBRIS_LIFETIME_S` and the outward-drift speed
  are provisional feel values (like A2-5's DEBRIS_LIFETIME_S and A2-8's shrapnel speed).
  Affects `asteroids/src/core/saucerDebris.ts` — carry the house `verify vs quarry (A-17)`
  note; this breakup is a feel-based embellishment, NOT ROM-faithful. *Found by TEA during
  test design.*

### Dev (implementation)
- No new upstream findings. TEA's Finding #2 (geometry layout single-source) was **resolved
  during implementation** — `saucerShape.ts`'s `saucerPolylines` is now the one layout
  source that both `render.ts drawSaucer` and `core saucerSegments` derive from, so no
  vertex-layout copy remains. Finding #3 (waistline degenerate velocity) was **handled** via
  the fixed index-based outward pattern (every piece moves). Finding #1 (`ShipDebrisSegment`
  name) was left as-is (deferred, as TEA suggested — a neutral rename would churn A2-5). No
  gaps, conflicts, or questions surfaced while implementing. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): `SAUCER_BREAKUP_SPEED` (6) is not exact-pinned by any test —
  the motion tests assert only nonzero/diverge/velocity-inheritance, so a mutant changing the
  speed would pass. Affects `asteroids/src/core/saucerDebris.ts` (a feel value; matches the
  A2-5 precedent where ship `BREAKUP_SPEED` is likewise unpinned and only lifetime is
  exact-pinned — so this is consistency, not a regression). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `saucerPolylines` allocates 3 objects + 12 Vec2s each frame a
  saucer is on screen. Affects `asteroids/src/core/saucerShape.ts` — negligible for a single
  saucer (the ROM allows only one), noted only for completeness; no action needed. *Found by
  Reviewer during code review.*

## Sm Assessment

**Story:** A-21 — Saucer death breakup: the flying saucer fractures into drifting, fading
line segments on destruction, mirroring A2-5's player-ship breakup (3 pts, p1, epic A).
Originated from a user feature request ("spaceship should break up much like the player's
ship"); shaped via brainstorming and scope-confirmed with the user.

**Setup performed:**
- Story A-21 added to epic A via `pf sprint story add` (dry-run verified; only
  `sprint/epic-A.yaml` changed — no collateral edits to epic-SH/epic-bz2).
- Session file created at `.session/A-21-session.md`; `**Repos:** asteroids` added.
- Story context at `sprint/context/context-story-A-21.md` — the `pf context create` stub
  was **replaced by SM** with the full user-approved technical approach (A2-5 precedent,
  saucer-geometry hoist, the RNG-discipline crux, A2-5 lessons, fidelity note, AC guidance).
- Branch `feat/A-21-saucer-death-breakup` created from `develop` in the asteroids subrepo (gitflow).
- Jira explicitly skipped — this project has no Jira instance (local sprint YAML only).
- Merge gate verified clear: no open PRs in asteroids.

**Approved scope:** visual line-fracture breakup ONLY — no audio/death-cue changes (user
explicitly deferred the missing saucer explosion sound).

**Note to O'Brien (TEA):** No pre-written ACs — originate them from the enriched story
context during RED (as in A2-5). The **crux to decide first** is RNG discipline: prefer a
**RNG-free** `breakSaucer` (like `spawnShrapnel`) so a saucer death does not shift the
wave/saucer spawn stream, and pin `state.rng.seed` invariance. Age debris in **all** mode
pipelines from the start (A2-5's headline HIGH bug was debris freezing once mode left
`'playing'`).

## TEA Assessment

**Tests Required:** Yes
**Reason:** New feature, no existing coverage. No ACs in the sprint YAML — TEA originated
them from the enriched story context and the A2-5 precedent, per the SM handoff note.

**Test Files:**
- `asteroids/tests/saucerDebris.test.ts` (new) — pure-function unit tests for the new
  `core/saucerDebris.ts` + `core/saucerShape.ts` modules (`breakSaucer`, `saucerSegments`)
  plus `stepGame` integration for death-edge spawn, despawn≠death, RNG invariance,
  cross-mode aging, and cosmetic guardrails.
- `asteroids/tests/render-wiring.test.ts` (edited) — `state.saucerDebris` draw wiring +
  the `core/saucerShape` single-source guard.
- `asteroids/tests/render.test.ts` (edited) — mock-ctx `drawSaucerDebris` coverage
  (draws each segment, draws nothing when empty, alpha-fades by life). Pre-empts the exact
  Reviewer finding A2-5 drew for omitting render coverage.

**Tests Written:** 33 new tests (28 in saucerDebris.test.ts, +2 render-wiring, +3 render).
Coverage: silhouette geometry (matches `saucerSegments`, tracks position, no rotation);
motion (every piece moves incl. the degenerate waistline, pieces diverge, exact
`SAUCER_DEBRIS_LIFETIME_S`, velocity inheritance); **RNG-free + purity** (arity guard,
determinism, no-mutate, no-alias, exact keys); death-edge spawn at all 3 sites; **despawn
≠ death** (no debris on far-edge exit); **RNG-seed invariance** across a saucer death;
**cross-mode aging** (playing/gameover/attract, direct mutation-sound fixtures per A2-5's
H-1 lesson); cosmetic guardrails (no respawn gate, no hitbox).

**Status:** RED (verified via `testing-runner`, RUN_ID A-21-tea-red):
`3 test files failed | 37 passed`, `4 tests failed | 814 passed`. `saucerDebris.test.ts`
fails at load (`Cannot find module '../src/core/saucerDebris'`) — its 28 tests are RED;
`render-wiring.test.ts` (2) and `render.test.ts` (2) fail on assertions. **No pre-existing
test broke** — every failure is attributable to A-21's not-yet-implemented feature.

**API contract established for Dev (Julia):**
- `state.ts`: add `GameState.saucerDebris: ShipDebrisSegment[]` (reuse the existing
  segment type); `initialState()` seeds it to `[]`.
- `core/saucerShape.ts` (new, mirrors `shipShape.ts`): hoist the 6 saucer geometry
  constants out of `shell/render.ts` (`SAUCER_HALF_W=140`, `SAUCER_HULL_TOP=44`,
  `SAUCER_HULL_BOTTOM=-40`, `SAUCER_HULL_SHOULDER=56`, `SAUCER_CANOPY_HALF_W=30`,
  `SAUCER_CANOPY_TOP=78`); export `saucerSegments(saucer: Saucer): ReadonlyArray<readonly [Vec2, Vec2]>`
  returning the 10 silhouette edges (closed 6-point hull lens → 6, open canopy dome → 3,
  waistline → 1). `render.ts` must import the geometry from here (no private copy).
- `core/saucerDebris.ts` (new): `breakSaucer(saucer: Saucer): ShipDebrisSegment[]` — PURE,
  **RNG-FREE** (arity 1, no rng), one segment per `saucerSegments` edge; each `vel` =
  `saucer.velocity` + a **fixed index-based outward drift** (NOT pure center-outward — the
  waistline midpoint is the saucer center; use a shrapnel-style fixed pattern so every
  piece moves and they diverge); `life = SAUCER_DEBRIS_LIFETIME_S` (new provisional
  constant, `verify vs quarry (A-17)`). Aging may reuse `updateShipDebris`.
- `sim.ts`: at each of the 3 saucer-death sites (player shot ~L378, ship ram ~L406, rock
  ~L418) spawn `breakSaucer(deadSaucer)` into `saucerDebris` capturing the saucer's
  pos/vel at death — do NOT spawn on the far-edge despawn in `stepSaucer`. `breakSaucer`
  must consume NO rng. Age `saucerDebris` every tick in the playing pipeline (~L311) AND
  in `stepGameOver`'s `base` (~L195) AND `stepAttract` (~L163) — the A2-5 HIGH-bug lesson.
  Debris must NOT enter any collision loop or `lives.ts` `isCenterClear`.
- `render.ts`: add `drawSaucerDebris` reading `state.saucerDebris`, alpha-faded by
  `life / SAUCER_DEBRIS_LIFETIME_S` (mirror `drawShipDebris`).

### Rule Coverage

No `.claude/rules/*.md` or `SOUL.md` exist in this project (confirmed) — the TypeScript
lang-review checklist is the only rule rubric. This is a pure, DOM-free, non-React,
non-async core module + test-only DOM mock, so most sections are N/A. Applicable:

| Rule | Test(s) / Coverage | Status |
|------|--------------------|--------|
| #1 type-safety escapes (`as any`/`@ts-ignore`/non-null `!`) | No `as any`/`as unknown as`/`@ts-ignore` in any new test; render fixture uses a precise return-type annotation, not a cast; `render-wiring.test.ts` already greps render.ts for `as any` | pass (self-check) |
| #2 generics / `readonly` | `saucerSegments` return pinned `ReadonlyArray<readonly [Vec2,Vec2]>`; `breakSaucer` param is a plain `Saucer` | pass |
| #4 null/undefined (`??` vs `||` on 0) | No `||`-on-falsy introduced; all coordinate math uses direct numeric fields | n/a (none introduced) |
| #5 module resolution | Imports follow the project's no-`.js`-extension convention (matches every sibling core import) | pass |
| #8 test quality (no vacuous assertions, no `as any` in tests) | Self-checked: every test has a concrete non-trivial `expect`; 0 `as any`, 0 `.only`/`.skip` | pass (self-check) |

**Rules checked:** 5 of 13 TypeScript checklist sections applicable; 0 blocking gaps.
**Self-check:** 0 vacuous tests found. Every `expect` asserts a concrete value/shape; no
`let _ =`, no bare truthiness on always-truthy values, no `assert(true)`-equivalents.

**Handoff:** To Julia (Dev) for implementation (GREEN phase).

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- No deviations from spec. No ACs existed in the sprint YAML; TEA originated the ACs
  from the enriched story context (which the SM wrote from user-approved brainstorming),
  so there is no higher-authority spec to diverge from. Design choices made within the
  latitude the story context explicitly granted ("TEA/Dev's call") — documented here, not
  logged as deviations:
  - **breakSaucer is RNG-FREE** (no rng param; state.rng.seed pinned invariant across a
    saucer death). The context's stated "strong lean" — chosen (not deviated) because a
    saucer death is immediately followed in-frame by stepSaucer + updateSpawnDirector
    reading the shared rng, so any rng draw would shift the spawn stream (the A2-6/A2-8
    trap that made spawnShrapnel RNG-free). This is the opposite of A2-5's breakShip,
    which consumes rng — a deliberate, tested divergence for a good reason.
  - **Reused the `ShipDebrisSegment` type** for saucer debris (a generic p1/p2/vel/life
    line segment) rather than minting a `SaucerDebrisSegment`; added a **new
    `GameState.saucerDebris` field** (parallel to shipDebris, mirroring how A2-8's shrapnel
    got its own field). No new update-function symbol was mandated — aging is pinned only
    via stepGame integration, leaving Dev free to reuse `updateShipDebris`.
  - **All 10 rendered edges fracture** (6 hull + 3 canopy + 1 waistline), consistent with
    the ship fracturing all 4 of its edges. The waistline midpoint coincides with the
    saucer center, so the "every segment moves" test forbids a pure center-outward velocity
    scheme (which would leave that piece motionless) — nudging Dev to a fixed index-based
    outward pattern (à la shrapnel's SHRAPNEL_PATTERN), also the natural RNG-free way to
    make pieces diverge.
  - **No audio** — the approved scope is visual breakup only (the saucer keeps its A-13
    siren-stop; the missing explosion cue was explicitly deferred by the user).

### Dev (implementation)
- No deviations from spec. Every item in TEA's API contract was implemented as specified;
  the tests are the spec and all 846 pass. Implementation choices worth recording (none
  diverge from a higher-authority source):
  - **Single geometry source went one step further than the contract's minimum.** The
    contract required only "render.ts must import the geometry from saucerShape (no private
    copy of the constants)." Implemented the fuller single-source that resolves TEA's
    non-blocking Delivery Finding #2: `saucerShape.ts` exports `saucerPolylines` (the three
    stroked outlines) as THE layout source; `saucerSegments` derives its 10 edges from it,
    and `render.ts`'s `drawSaucer` strokes it — so the vertex LAYOUT (not just the
    constants) lives in exactly one place. `drawSaucer`'s output is byte-identical (same 3
    `strokePoly` calls, confirmed by the pre-existing saucer render tests staying green).
  - **breakSaucer outward pattern:** each piece flies on a heading spaced evenly around the
    circle by its edge index (`theta_i = i/n · 2π`), plus the saucer's velocity — RNG-free,
    every piece nonzero (incl. the waistline), all diverging. Resolves TEA Finding #3.
  - **Aging reuses `updateShipDebris`** (a segment is a segment) — no redundant
    `updateSaucerDebris` symbol, per the latitude the contract granted.
  - **Feel constants:** `SAUCER_DEBRIS_LIFETIME_S = 1.5` (matches the ship breakup),
    `SAUCER_BREAKUP_SPEED = 6` — both provisional, carry `verify vs quarry (A-17)`.

### Reviewer (audit)
- **TEA — "breakSaucer is RNG-FREE / pin state.rng.seed invariance"** → ✓ ACCEPTED by Reviewer.
  Independently confirmed: `breakSaucer` has arity 1 (no rng param) and uses only
  `Math.cos/sin` + field reads — it CANNOT consume rng. The rock-kill seed-invariance test
  (`saucerDebris.test.ts`) pins it directly on the one death path where no other rng
  consumer runs; the arity guard covers the other two paths (where breakShip/splitRock move
  the seed). Correct call — this is the opposite of breakShip and the right divergence.
- **TEA — "reuse ShipDebrisSegment + new saucerDebris field; aging reuses updateShipDebris"** →
  ✓ ACCEPTED. The segment type is a generic p1/p2/vel/life line segment; reuse is DRY and
  the field mirrors A2-8's shrapnel precedent. Reusing `updateShipDebris` avoids a redundant
  ager. No coverage weakened.
- **TEA — "all 10 rendered edges fracture; index-based outward pattern"** → ✓ ACCEPTED.
  Verified the waistline-degenerate concern is genuinely handled — the index-based headings
  give every one of the 10 pieces a nonzero, distinct velocity (the pure center-outward trap
  is avoided).
- **TEA — "no audio (scope)"** → ✓ ACCEPTED — matches the user-approved scope.
- **Dev — "single geometry source went one step further (saucerPolylines)"** → ✓ ACCEPTED by
  Reviewer. This RESOLVES TEA's own non-blocking Finding #2: `saucerShape.saucerPolylines` is
  now the one layout source both `drawSaucer` and `saucerSegments` derive from. Independently
  confirmed `drawSaucer` output is byte-identical (same 3 `strokePoly` calls; the pre-existing
  saucer render tests stay green). Good instinct to remove the duplication rather than defer it.
- **Dev — "index-based outward pattern; aging reuses updateShipDebris; feel constants"** →
  ✓ ACCEPTED — all consistent with the TEA contract and the house `verify vs quarry (A-17)`
  convention.
- No UNDOCUMENTED deviations found: the diff matches the logged approach exactly; nothing
  diverged from the tests without a corresponding deviation entry.

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/core/state.ts` — added `GameState.saucerDebris: ShipDebrisSegment[]`
  (reuses the existing segment type); `initialState()` seeds it to `[]`.
- `asteroids/src/core/saucerShape.ts` (new) — hoisted the saucer geometry out of
  `render.ts` into one shared source: `saucerPolylines(saucer)` (the 3 stroked outlines) +
  `saucerSegments(saucer)` (the 10 silhouette edges, derived from the polylines) + the 6
  dimension constants.
- `asteroids/src/core/saucerDebris.ts` (new) — `breakSaucer(saucer)`: PURE, RNG-FREE, one
  segment per silhouette edge with a fixed index-based outward drift + the saucer's
  velocity; `SAUCER_DEBRIS_LIFETIME_S`.
- `asteroids/src/core/sim.ts` — spawn `breakSaucer` at all 3 death sites (player shot, ship
  ram, rock) into `saucerDebris`, NOT on the far-edge despawn; RNG-free so `state.rng.seed`
  is untouched; age `saucerDebris` every tick in the playing pipeline AND `stepGameOver`'s
  `base` AND `stepAttract`.
- `asteroids/src/shell/render.ts` — new `drawSaucerDebris` (alpha-faded by
  `life / SAUCER_DEBRIS_LIFETIME_S`); `drawSaucer` now strokes the shared `saucerPolylines`
  (no private geometry copy).

**Tests:** 846/846 passing (GREEN) — all 33 new A-21 tests plus every pre-existing test
(verified via `testing-runner`, RUN_ID A-21-dev-green-2). `npm run build`
(`tsc --noEmit && vite build`) clean, no type errors.
**Branch:** `feat/A-21-saucer-death-breakup` (pushed to origin).

**Handoff:** To Reviewer (The Thought Police) for code review.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A — 846/846 green, tsc+vite clean, tree clean/pushed, 0 smells |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via `workflow.reviewer_subagents.edge_hunter` — self-covered |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — self-covered |
| 4 | reviewer-test-analyzer | Skipped | disabled | N/A | Disabled via settings — self-covered |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — self-covered |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — self-covered |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — self-covered |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — self-covered |
| 9 | reviewer-rule-checker | Skipped | disabled | N/A | Disabled via settings — self-covered via Rule Compliance below |

**All received:** Yes (1 enabled subagent returned clean; 8 disabled via `workflow.reviewer_subagents`, pre-filled per protocol and self-covered)
**Total findings:** 0 confirmed blocking, 2 non-blocking Improvements (in Delivery Findings), 0 dismissed

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** saucer destruction → debris → screen.
A live `state.saucer` is hit at one of three collision sites in `stepGame` — a player shot
(`sim.ts:382`), a ship ram (`sim.ts:416`), or a rock (`sim.ts:433`). Each captures the
still-live saucer, appends `breakSaucer(saucer)` to `saucerDebris`, then nulls the saucer —
the three sites are **mutually exclusive** (a shot-killed saucer is `null` for the ram and
rock blocks, guarded by `sc !== null` / `scForRock !== null`), so at most one breakup per
frame. `breakSaucer` (`saucerDebris.ts:38`) maps `saucerSegments(saucer)` → 10 segments,
each `vel = saucer.velocity + (cos θᵢ, sin θᵢ)·6`, `life = SAUCER_DEBRIS_LIFETIME_S` — PURE
and RNG-FREE. `saucerDebris` flows into the returned `stepped` state (`sim.ts:476`) and is
aged every tick by `updateShipDebris` in **all three** mode pipelines (playing `sim.ts:318`,
`stepGameOver` base `sim.ts:203`, `stepAttract` `sim.ts:169`). `render.ts drawSaucerDebris`
strokes each segment at `globalAlpha = life / SAUCER_DEBRIS_LIFETIME_S`. **Safe:** cosmetic
only — `saucerDebris` appears in no collision loop and is never read by `lives.ts`
`isCenterClear` (guardrail tests confirm no hitbox, no respawn gate).

**Pattern observed:** `core/saucerShape.ts saucerPolylines` (`saucerShape.ts:31`) is a genuinely
good single-source pattern — the ONE place the saucer's vertex layout lives; both the renderer
(`drawSaucer`) and the breakup (`saucerSegments` → `breakSaucer`) derive from it, so the
fractured pieces cannot drift from what was on screen. Resolves TEA's own Delivery Finding #2,
and mirrors A2-5's `shipShape.ts`. `drawSaucer`'s output is byte-identical (same 3 `strokePoly`
calls — pre-existing saucer render tests stay green).

**Error handling:** [VERIFIED] N/A — `breakSaucer`/`saucerSegments`/`saucerPolylines` are total
functions over their input domain (no null/optional fields on `Saucer`/`Vec2`, no throw paths).
Every death site is guarded by an explicit `!== null` check before dereferencing the saucer
(`sim.ts:416,433`); no `||`-on-falsy, no unchecked `Map.get`.

**Security analysis:** [VERIFIED] N/A — client-side Canvas 2D game, no user input, no network,
no `JSON.parse`, no DOM string injection anywhere in the diff. Pure numeric simulation state.

**Tenant isolation audit:** N/A — single-player, client-only, no tenant/auth/server concept
anywhere in the codebase.

### Subagent finding incorporation (all 8 tags)
- `[EDGE]` — N/A (edge-hunter disabled). **Self-covered:** enumerated all 3 death sites + the
  far-edge despawn (NOT a death — correctly spawns no debris, `sim.ts` stepSaucer untouched,
  pinned by test) + all 3 mode pipelines. The waistline boundary (midpoint == saucer center)
  is handled by the index-based pattern (every piece nonzero). No unhandled path found.
- `[SILENT]` — N/A (disabled). **Self-covered:** no error-swallowing surface — pure sim, no
  try/catch, no fallbacks, no swallowed returns in the diff.
- `[TEST]` — N/A (disabled). **Self-covered:** the cross-mode aging pins are direct
  mutation-sound fixtures (not the vacuous routed-path A2-5 originally shipped); lifetime is
  exact-pinned; RNG-freeness is pinned by both an arity guard and a seed-invariance integration
  test. One LOW note: `SAUCER_BREAKUP_SPEED` is not exact-pinned (see Delivery Findings) —
  non-blocking, matches the A2-5 precedent.
- `[DOC]` — N/A (disabled). **Self-covered:** the new file headers accurately document the
  RNG-free rationale and the single-source design; no stale/misleading comments introduced.
- `[TYPE]` — N/A (disabled). **Self-covered:** no `as any`/`as unknown as`/`@ts-ignore`/non-null
  `!`; `saucerSegments` returns `ReadonlyArray<readonly [Vec2,Vec2]>`; `saucerDebris` typed
  `ShipDebrisSegment[]`; the lone `as const` in `drawSaucer` is a const assertion, not an escape.
  `tsc --noEmit` clean under strict + `noUnusedLocals`.
- `[SEC]` — N/A (disabled). **Self-covered:** no security surface (see Security analysis).
- `[SIMPLE]` — N/A (disabled). **Self-covered:** the `saucerPolylines` refactor is a net
  simplification (net −52 lines in render.ts; removed the inline geometry duplication); no
  over-engineering, no dead code (`noUnusedLocals` passing).
- `[RULE]` — N/A (disabled). **Self-covered** via Rule Compliance below.

### Rule Compliance

No `.claude/rules/*.md` or `SOUL.md` exist (confirmed) — the TypeScript lang-review checklist is
the rubric. This is a pure, DOM-free, non-React, non-async core module + a render refactor.
Enumerated every applicable check against every changed symbol:

- **#1 type-safety escapes** — [VERIFIED] grepped the full diff: 0 `as any`, 0 `as unknown as`,
  0 `@ts-ignore`, 0 non-null `!`. `breakSaucer`, `saucerSegments`, `saucerPolylines`,
  `drawSaucerDebris`, the `saucerDebris` field — all concretely typed.
- **#2 generics / readonly** — [VERIFIED] `saucerSegments`→`ReadonlyArray<readonly [Vec2,Vec2]>`;
  `saucerPolylines`→`readonly SaucerPolyline[]` with `points: readonly Vec2[]`; `SaucerPolyline`
  is a concrete interface (no `Record<string,any>`/`object`/`Function`).
- **#3 enums** — N/A: no new enum/union introduced (`SaucerPolyline` is an interface).
- **#4 null/undefined** — [VERIFIED] no `||`-on-falsy-0; all three death sites gate on explicit
  `!== null` before dereferencing; coordinate math uses direct numeric fields.
- **#5 module resolution** — [VERIFIED] all new imports omit `.js` extensions, matching every
  sibling core import (this project's bundler convention).
- **#6 React / #7 async / #10 input-validation / #11 error-handling / #12 perf** — N/A
  (no JSX, no async/Promise, no user input/JSON, no throw paths, no hot-path serialization).
- **#8 test quality** — [VERIFIED] 0 `as any` in the new tests, 0 `.only`/`.skip`; the render
  fixture uses a precise return annotation instead of a cast; every assertion is concrete.
- **#13 fix-introduced regressions** — N/A (no rework diff — first review pass).

Total: 5 of 13 checks applicable, 0 violations.

### Devil's Advocate

Assume this is broken. The scariest class of bug for a *faithful, deterministic* clone is a
hidden non-determinism, so start there: does a saucer death shift the RNG stream? `breakSaucer`
is appended in the collision block *before* `stepSaucer`/`updateSpawnDirector`/`updateWaveDirector`
run on the returned state — the exact window where a stray `rng` draw would silently re-roll every
future wave and saucer spawn, and NO test would catch it unless it specifically asserts
`state.rng.seed`. Is `breakSaucer` truly rng-free on *every* path, or only the rock path the test
pins? I traced it: the function signature takes only `saucer` (arity 1, and the arity is itself
pinned), its body is `saucerSegments(saucer).map(...)` with `Math.cos/sin` and field reads — there
is no `rng`, `nextFloat`, or `Math.random` anywhere in `saucerDebris.ts` or `saucerShape.ts`. So
even on the shot/ram paths (where `splitRock`/`breakShip` legitimately DO move the seed), the
saucer breakup adds zero draws. The seed-invariance test on the isolated rock path plus the
provable purity closes it. Next: the despawn trap. A saucer that flies off the far edge becomes
`null` in `stepSaucer` — if Dev had wired the breakup to "saucer went null," every saucer that
*escaped* would explode into wreckage mid-flight off-screen. But the breakup is wired only to the
three *collision* sites, `stepSaucer` is untouched, and the "spawns NO debris when the saucer
merely DESPAWNS" test pins it. Next: double-spawn. Could a saucer be shot AND rammed AND
rock-hit in one frame, spawning 30 segments? No — each site nulls the saucer and the later sites
re-read it (`sc`/`scForRock` are captured after the prior block and null-checked), so exactly one
breakup fires. Next: the confused-user visual. A player who kills a saucer one tick before losing
their last life — does the wreckage freeze on the GAME OVER card like A2-5's original HIGH bug?
No: `stepGameOver`'s `base` and `stepAttract` both age `saucerDebris`, pinned by direct fixtures
that go RED if either aging line is reverted. Finally, the waistline: its midpoint is the saucer
center, so a lazier "outward from center" scheme would leave one segment frozen in place — a
subtle "why is that one line not moving?" glitch. The index-based heading pattern gives it a real
velocity, pinned by "every segment moves." The one thing genuinely NOT pinned is the exact
`SAUCER_BREAKUP_SPEED` magnitude — but that is a feel value under the house `verify vs quarry
(A-17)` convention, exactly as the ship's own breakup speed is unpinned. Nothing here rises to a
blocking defect.

### Observations (8)
- [VERIFIED] RNG-free breakup on all 3 death sites — `breakSaucer` arity 1, no rng/Math.random
  (`saucerDebris.ts:38`); seed-invariance pinned on the rock path (`saucerDebris.test.ts`) +
  arity guard covers the shot/ram paths. Complies with the core-determinism convention.
- [VERIFIED] Single-source geometry — `saucerPolylines` (`saucerShape.ts:31`) is the sole layout
  source; `drawSaucer` + `saucerSegments` both derive from it; output byte-identical.
- [VERIFIED] Cross-mode aging — `saucerDebris` aged in playing/`stepGameOver`/`stepAttract`
  (`sim.ts:318,203,169`); mutation-sound direct fixtures. A2-5's freeze bug class avoided.
- [VERIFIED] Despawn ≠ death — breakup only at the 3 collision sites; `stepSaucer` far-edge
  despawn untouched; pinned negative test.
- [VERIFIED] No double-spawn — `sim.ts:416,433` guard on `sc`/`scForRock !== null`; at most one
  breakup per frame.
- [VERIFIED] Cosmetic only — `saucerDebris` in no collision loop, not in `isCenterClear`;
  guardrail tests green.
- [VERIFIED] Type + build clean — no type escapes; `tsc --noEmit` + `vite build` clean under
  strict + `noUnusedLocals` (preflight).
- [LOW] `SAUCER_BREAKUP_SPEED` (6) not exact-pinned by a test — feel value, matches A2-5
  precedent; non-blocking (Delivery Findings).

**Handoff:** To Winston Smith (SM) for finish-story.