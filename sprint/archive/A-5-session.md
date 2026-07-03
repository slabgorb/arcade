---
story_id: "A-5"
jira_key: null
epic: "A"
workflow: "tdd"
---
# Story A-5: Vector render foundation + ship silhouette + thrust flame

## Story Details
- **ID:** A-5
- **Jira Key:** (not using Jira)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T16:12:43Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T15:31:33Z | 2026-07-03T15:34:24Z | 2m 51s |
| red | 2026-07-03T15:34:24Z | 2026-07-03T15:49:07Z | 14m 43s |
| green | 2026-07-03T15:49:07Z | 2026-07-03T16:01:46Z | 12m 39s |
| review | 2026-07-03T16:01:46Z | 2026-07-03T16:12:43Z | 10m 57s |
| finish | 2026-07-03T16:12:43Z | - | - |

## Sm Assessment

**Story shape.** A-5 (3pts, p1, `tdd`) is the render foundation for the Asteroids
subrepo — the first story that makes the game player-visible. Through A-2/A-3/A-4
the deterministic core (tick+RNG, ship flight, firing) is complete and reviewer-
approved, but `main.ts` still feeds `NO_INPUT` and nothing draws. A-5 stands up a
shell-only Canvas 2D vector renderer, draws the ship silhouette at its heading,
adds a thrust flame, and wires real keyboard input into the loop.

**Workflow choice.** `tdd` (phased), as tagged in `sprint/epic-A.yaml` and
consistent with A-2/A-3/A-4. This is production render code with a testable
architectural contract (core purity, render-reads-state-only, silhouette/flame
draw contract), so TDD is the right posture over `trivial`. Routing to **O'Brien
(TEA)** for the RED phase.

**Scope boundaries (held firm).** Foundation + ship silhouette + thrust flame
only. Asteroid rocks are A-6, collisions A-8, scoring A-9, saucers A-11+, sound
A-18, glow/feel calibration A-19. The ship silhouette is faithful-but-provisional;
ROM-exact shape tables land in A-17 — logged as a forward-carry deviation (not a
regression), not a scope creep into this story.

**Risk / watch items carried forward.**
- No `reference/` ROM quarry exists in the asteroids subrepo yet, so the ship
  shape is provisional. Boundary flagged for A-17; TEA/Dev should assert the
  render *contract*, not exact ROM vertices.
- A-4 Reviewer's latent shot-direction fidelity note (`muzzleAxis` 3/2 fold may
  veer mid-angle shots): A-5's render is the first visual exposure. Not A-5's job
  to fix — recorded as a Context Continuity item for whoever renders bullets
  (A-6/A-8) and the owner (firing model / A-17 / A-19).
- Architectural line to defend in review: renderer lives in `src/shell/`, reads
  `GameState` immutably, and does not touch `src/core/`.

**Pre-handoff checklist.**
- [x] Session file exists with fields set (`.session/A-5-session.md`)
- [x] Story context written (technical approach + AC1–AC5) — `pf validate context-story A-5` passes
- [x] Feature branch created: `feat/A-5-vector-render-foundation` off `develop` (asteroids subrepo)
- [x] Story marked `in_progress` in sprint YAML (via pf, not hand-edited)
- [x] Jira: N/A — this project tracks issues locally in `sprint/` YAML (explicitly skipped)

**Routing decision:** phased `tdd` → hand off to **O'Brien (TEA)** for RED. Not my
code to write; TEA designs the failing render-contract tests next.

## Story Context

### Summary
A-5 is the **player-visibility milestone** — the first story that makes Asteroids playable from the browser. Through A-2 (core sim), A-3 (ship flight), and A-4 (firing), the deterministic engine is core-complete and correct but nothing renders. `main.ts` feeds `NO_INPUT` and the player sees a blank canvas. A-5 stands up the render foundation, draws the ship as a vector silhouette at its position/heading, and adds a thrust flame that activates with thrust input. Once A-5 is done, players can see their ship rotate, thrust, and fire — the core is visible.

### Technical Approach

#### Architecture
The render layer belongs entirely in `src/shell/` (render is the shell's responsibility) and must NOT leak into `src/core/`. The core simulation (`src/core/`) remains pure, time-deterministic, and untouched by rendering.

**File layout:**
- `src/shell/render.ts` — NEW: Canvas 2D vector renderer; exports `setupRenderLoop(canvas, getGameState)`, which wires into the game loop (`main.ts`).
- `src/shell/main.ts` — MODIFY: calls `setupRenderLoop(...)` and feeds real `Input` (from keyboard) to the tick function (currently feeds `NO_INPUT`).
- `src/core/` — UNTOUCHED: the renderer reads `GameState` immutably and has zero write access.

#### Vector Rendering (Arcade Visual Language)
All lines are glowing vectors on black, consistent with the arcade's shared visual identity:
- **Black background:** `ctx.fillStyle = '#000'` every frame.
- **Glowing lines:** `ctx.strokeStyle = '#0f0'` (bright green) or arcade palette; `ctx.lineWidth = 2`; `ctx.lineCap = 'round'`.
- **Coordinate system:** ROM-inherited world units (0–1024 wide, 0–768 tall, lo-unit precision); each lo-unit is 1/8 screen pixel (1024 lo-units = 128 screen pixels); screen-wrapping is core-handled, not renderer.

#### Ship Silhouette (Fidelity to A-3's Model)
The ship model (`src/core/ship.ts`) tracks:
- **Position:** `ship.pos` in world lo-units.
- **Heading:** `ship.dir` on a 256-unit circle (0 = +x, CCW positive). The sine lookup table (`sinLookup`) is already in place from A-3.

**Shape:** A faithful vector silhouette based on the 1979 ROM:
- **Nose:** forward-facing point.
- **Wings:** two aft points, symmetrically placed.
- **Overall:** a triangle-like wedge, ~60–80 lo-units tip-to-tail.

The exact vertices should match the ROM's ship-drawing routine if a `reference/` quarry becomes available (A-17 will port ROM-exact shape tables later). Until then, A-5 uses a faithful-but-provisional silhouette; the silhouette shape is **NOT** a spec deviation (provisional shapes are normal for early render milestones), but it MUST be noted as a forward-carry item for A-17 and A-19 (feel calibration).

**Rendering:**
```
shipVertices = [nose, wingLeft, wingRight] (in ship-local coords)
rotate vertices by ship.dir using sinLookup
translate to ship.pos
draw via ctx.beginPath / lineTo / closePath / stroke
```

#### Thrust Flame (While Thrust Input Active)
When `input.thrust === true` (no mode-gate; rendering layer never checks `state.mode`):
- Draw a tail-flame sprite behind the ship, oriented opposite to the heading.
- Flame geometry: a small wedge or teardrop, ~20–40 lo-units aft of the ship.
- Color: orange/yellow glow (e.g., `ctx.strokeStyle = '#ff8'` or arcade-palette flame).
- **No animation.** A-5 does not add frame-based flicker; the flame is static-shape while thrust is held (animation is a A-19 feel concern).

#### Game Loop Wiring
`src/shell/main.ts` currently feeds `NO_INPUT` and the loop is passive. A-5 wires rendering and real input:

1. **Keyboard input:** already scaffolded in `src/shell/input.ts` (A-1). Bind `keydown` / `keyup` events to produce a real `Input` object.
2. **Game loop:** `main.ts` does `const input = pollInput()` (real events) and `stepGame(state, input, dt)` (core sim step).
3. **Render:** `setupRenderLoop(canvas, () => state)` is called once; internally, it uses `requestAnimationFrame` to render each frame by reading the current `state` (immutable). Renderer never calls `stepGame`.

The boundary is clear:
- **Core (`src/core/`):** pure state machine. `state` in, fresh `state` out. Renderer reads the returned state.
- **Shell (`src/shell/`):** input polling, canvas setup, render loop. Shell orchestrates.

### Acceptance Criteria

**AC1: Render Loop Established**
- `src/shell/render.ts` exports `setupRenderLoop(canvas, getGameState)`.
- `main.ts` calls it on startup with the game canvas and a closure over the current game state.
- The game loop runs at ~60 Hz via `requestAnimationFrame` (or a fixed 60 Hz timestep simulation loop if preferred).
- Each frame renders to a fresh black canvas.

**AC2: Ship Silhouette Renders**
- The player ship is drawn as a vector silhouette at its `GameState.ship.pos` (world lo-units).
- The silhouette rotates with `GameState.ship.dir` (using `sinLookup` for ROM-fidelity).
- The shape is a glowing triangle-like wedge (nose, two wings), ~60–80 lo-units tip-to-tail.
- Lines are drawn in arcade-palette green (`#0f0` or equivalent) with `lineWidth = 2`.

**AC3: Thrust Flame Renders (Conditional)**
- When `input.thrust === true`, a flame shape renders behind the ship (opposite heading direction).
- Flame is a small wedge or teardrop, ~20–40 lo-units aft, in orange/yellow glow.
- Flame disappears when thrust is released (`input.thrust === false`).
- Flame is static (no frame-based animation this story).

**AC4: Core Remains Pure**
- No code in `src/core/` is modified.
- Renderer (`src/shell/render.ts`) reads `GameState` only; zero writes.
- Test suite `asteroids/tests/` runs green (no core regressions); `pf check` passes.

**AC5: Game is Visibly Running at http://localhost:5275/asteroids/**
- Navigate to the browser URL after `npm run dev` in the asteroids subrepo.
- The canvas displays: black background, green glowing ship at screen center, ship rotates with arrow keys, thrust flame shows while holding thrust.
- No asteroid rocks, no collisions, no scoring yet (those are A-6+).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

No upstream findings (setup phase only).

### TEA (test design)

- **Question** (non-blocking): The thrust flame is driven by the shell's per-frame input, but the pure core carries no "thrusting" flag — `GameState.ship` exposes only `pos`/`vel`/`dir`, and AC-4 forbids touching `src/core/`. The render seam therefore takes the frame's input as a 5th arg: `render(ctx, state, W, H, input)`. Affects `src/shell/render.ts` and `src/main.ts` (main.ts must pass the sampled input to `render`, not only to `stepGame`). *Found by TEA during test design.*
- **Gap** (non-blocking): A-5's suite covers ship + flame only; it does not render or assert bullets, so A-4's latent mid-angle shot-direction concern (the `muzzleAxis` 3/2 fold) is NOT exercised here. Affects the test suites for whichever story first renders bullets (A-6/A-8) — add a shallow-heading bullet-direction check there, per the Context Continuity note above. *Found by TEA during test design.*

### Dev (implementation)

- **Improvement** (non-blocking): the `render-wiring` "must not call stepGame" guard matches the bare `stepGame` token anywhere in `render.ts` source — including comments — so a legitimate future comment mentioning the sim step would false-fail (it did during GREEN; I reworded the header comment). Affects `asteroids/tests/render-wiring.test.ts` (consider scoping the regex to a call site, e.g. `stepGame\s*\(`). *Found by Dev during implementation.*
- **Gap** (non-blocking): the session Story Context carries two stale facts vs the real code — world size stated as "0–1024 wide, 0–768 tall" (actual `WORLD_W`/`WORLD_H` = 8192×6144 lo-units) and "`src/shell/input.ts` (A-1)" which did not exist. Both were corrected in implementation (see Dev deviations). Affects `sprint/context/context-story-A-5.md` and future setups — spot-check context against `src/` before trusting it. *Found by Dev during implementation.*

### Reviewer (code review)

- **Improvement** (non-blocking): the X-axis of `toScreen` is unpinned by tests — a horizontal-mirror bug (`+`→`-` at `render.ts:46`) would pass all 8 `render.test.ts` cases while rendering the playfield left-right inverted. Code is correct today; the gap matters because `toScreen` is the foundation every future entity projects through. Affects `asteroids/tests/render.test.ts` (add a dir-0 vs dir-128 x-extreme assertion) — best closed when A-6 first renders rocks through `toScreen`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `render()`/`drawShip`/`drawFlame`/`toScreen`/`strokePoly` params lack `Readonly<T>`, so AC-4's "never mutates GameState" is enforced only by one runtime test, not the compiler. Affects `asteroids/src/shell/render.ts` (wrap `render`'s `state`/`input` in `Readonly<…>`) — consistent with core if the same is applied to `stepShip`/`stepGame`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `createInputController` has no `blur`/`visibilitychange` handler, so a key held while the tab loses focus stays in `held` (stuck thrust/rotate until refocus + release). Affects `asteroids/src/shell/input.ts` (add a `window` `blur` → `held.clear()` handler) — house-consistent gap, worth a polish pass. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): flame tests could be tightened — assert the thrust-off render has zero flame segments (proving "only while thrust is held", not merely "fewer"), and guard the flame set-difference against a future thrust-reactive ship body. Affects `asteroids/tests/render.test.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### SM (setup)

- **Ship silhouette is provisional, not ROM-exact (A-5 forward-carry to A-17/A-19)**
  - Spec source: Epic description ("ROM-accurate"); A-5 scope (render foundation)
  - Spec text: "A-17 ports ROM-exact shape + velocity tables under reference/"
  - Implementation: A-5 uses a faithful triangle-wedge silhouette (~60–80 lo-units); exact vertices will come from the reference/ quarry in A-17.
  - Rationale: A-17 handles ROM-exact shape tables (one centralized authoritative port). A-5's provisional shape is playable and faithful enough for the render milestone; the shape swap is mechanical and non-breaking.
  - Severity: none (forward-carry, not a regression)
  - Forward impact: A-17 will replace the silhouette vertices with the ROM-disassembly exact coordinates. A-19 (feel calibration) may refine color/glow/flame geometry.

### Context Continuity: Shot-Direction Fidelity Watch Item (from A-4)

**Latent concern noted in A-4 Reviewer Assessment (Devil's Advocate, ~line 469–477):**
The `muzzleAxis` 3/2-fold amplitude in A-4's firing code may distort bullet direction at mid-angles (shallow angles fire toward 45°). The cardinal-only A-4 tests do not expose this; A-5's rendering will be the **first visual test** of shot direction. When you render bullets in A-6 or A-8, watch whether a bullet fired at a shallow heading (e.g., dir 20 / ~28°) visibly veers. If it does, escalate as a Conflict finding and log for A-19 (feel) or A-17 (ROM re-verification). The owner is the muzzle formula in `bullet.ts:52`, not the render layer.

### TEA (test design)

- **AC-5's full browser visual/input is eyeball-verified, not unit-tested**
  - Spec source: session AC-5 ("Game is Visibly Running at http://localhost:5275/asteroids/")
  - Spec text: "The canvas displays: black background, green glowing ship at screen center, ship rotates with arrow keys, thrust flame shows while holding thrust."
  - Implementation: The end-to-end browser paint and live keyboard→ship are verified by running the dev server; automated coverage instead pins the *contract* — `render()` behavioral tests (dir/pos reach screen, nose-up, flame conditional, fresh black field) via a mock canvas, plus source-scan wiring tests (main.ts imports/drives `render`, captures keyboard input, drops the `NO_INPUT` step arg).
  - Rationale: vitest runs in the `node` environment with no DOM/canvas; the sibling games explicitly verify shell render/input "by running the game" (tempest/star-wars CLAUDE.md). A jsdom+canvas harness still could not prove "looks right."
  - Severity: minor
  - Forward impact: Dev (GREEN) and Reviewer MUST eyeball the dev server — arrow keys rotate the ship; holding thrust shows the flame — before A-5 is "done". Green unit tests alone do not satisfy AC-5.

- **Ship silhouette asserted by mechanism, not exact vertices/size**
  - Spec source: session AC-2
  - Spec text: "glowing triangle-like wedge (nose, two wings), ~60–80 lo-units tip-to-tail"
  - Implementation: Tests assert the render *mechanism* (dir changes the geometry, pos translates it, dir 64 renders nose-toward-top) but do NOT pin vertex count = 3 or the 60–80 lo-unit size.
  - Rationale: the silhouette is deliberately provisional (see SM deviation; A-17 ports ROM-exact vertices). Pinning the exact shape now would over-constrain a provisional shape and force a test rewrite at A-17.
  - Severity: minor
  - Forward impact: A-17 adds ROM-exact vertex/size assertions when the `reference/` quarry lands.

- **Heading tested for correctness, not for `sinLookup` reuse**
  - Spec source: session Story Context / "Notes for TEA"
  - Spec text: "The silhouette rotates with GameState.ship.dir (using sinLookup for ROM-fidelity)."
  - Implementation: Tests assert the nose points the correct way (up at dir 64; dir/pos reach the screen) but do NOT require the renderer to reuse the core's `sinLookup`; a continuous cos/sin rotation is acceptable.
  - Rationale: `sinLookup` is the coarse 127-step *velocity* table (ThrustTbl); quantizing a visual outline through it is arguably *less* faithful than smooth trig. Testing orientation correctness (not the trig mechanism) still catches a dir-ignoring or flipped renderer without prescribing a possibly-wrong implementation.
  - Severity: minor
  - Forward impact: none — orientation correctness is enforced. A-19 (feel) may opt into table-quantized rotation later if desired.

- **Fresh-black-field test accepts a full-frame clearRect OR a black fillRect**
  - Spec source: session AC-1
  - Spec text: "Each frame renders to a fresh black canvas."
  - Implementation: The clear-frame test passes on a full-frame black `fillRect` OR a full-frame `clearRect` (transparent over the black page).
  - Rationale: both yield a fresh black field each frame; the A-1 placeholder uses `fillRect('#000')`, but a `clearRect` over a black page is equally valid and should not be forbidden.
  - Severity: minor
  - Forward impact: none.

### Dev (implementation)

- **Ship rendered white (1979 monochrome), not the session's suggested green**
  - Spec source: session Story Context → Vector Rendering
  - Spec text: "Glowing lines: `ctx.strokeStyle = '#0f0'` (bright green) or arcade palette"
  - Implementation: Ship strokes white (`#ffffff`); thrust flame warm amber (`#ffb454`).
  - Rationale: the 1979 Asteroids cabinet is white-phosphor monochrome (the epic's "faithful clone" north star), and the A-1 placeholder already used `#ffffff` — white is the faithful, minimal-change choice. The session text itself allows "or arcade palette". A-19 owns final glow/palette calibration.
  - Severity: minor
  - Forward impact: A-19 (feel/glow) may recolor; no other story depends on the ship color.

- **Ship silhouette sized ~200 lo-units tip-to-tail, not the session's ~60–80**
  - Spec source: session Story Context → Ship Silhouette / AC-2
  - Spec text: "a triangle-like wedge, ~60–80 lo-units tip-to-tail"
  - Implementation: nose 130 + tail 70 = 200 lo-units tip-to-tail (~25px on a 1024-wide field).
  - Rationale: at the world→screen fit scale (8192 lo-units → viewport width), 60–80 lo-units renders ~8px — too small to read as a ship. ~200 lo-units matches the real cabinet's on-screen ship. Provisional; A-17 ports the ROM-exact shape/size table. TEA's tests assert orientation/mechanism, not exact size, so this stays within the tested contract.
  - Severity: minor
  - Forward impact: A-17 replaces the provisional vertices/size with ROM-exact values.

- **Render entry is `render(ctx, state, W, H, input)`, not the session's `setupRenderLoop(canvas, getGameState)`**
  - Spec source: session Story Context → File layout / AC-1
  - Spec text: "`src/shell/render.ts` ... exports `setupRenderLoop(canvas, getGameState)`"
  - Implementation: render.ts exports a stateless `render(ctx, state, W, H, input)`; loop/canvas ownership stays in `main.ts` (which already owns `createLoop`).
  - Rationale: the loop already exists (`src/shell/loop.ts` `createLoop`); wrapping canvas+rAF inside render would duplicate it and be harder to unit-test. A stateless `render()` is the sibling house pattern (star-wars/tempest) and the executable contract TEA's RED tests encode (higher authority than the session's approach hint).
  - Severity: minor
  - Forward impact: none — main.ts wires render into the existing loop.

- **Created `src/shell/input.ts` (the session assumed it already existed from A-1)**
  - Spec source: session Story Context → Game Loop Wiring
  - Spec text: "Keyboard input: already scaffolded in `src/shell/input.ts` (A-1)."
  - Implementation: `src/shell/input.ts` did NOT exist (A-1 scaffolded only `core/input.ts`, the Input type). Created it with `createInputController()` mapping keydown/keyup → Input, mirroring star-wars.
  - Rationale: keyboard capture must live somewhere; the sibling house pattern is a shell input controller. This corrects a wrong spec assumption rather than deviating from intent — real keyboard input is exactly what AC-5 requires.
  - Severity: minor
  - Forward impact: none — later stories (fire/hyperspace behavior) extend the existing controller.

### Reviewer (audit)

Every logged deviation reviewed. All ACCEPTED — none flagged. No undocumented spec deviations found: the code faithfully implements AC-1…AC-5; every departure from the session's *approach hints* was logged by Dev, and the session's own Story Context carried the stale facts (world dims, pre-existing `shell/input.ts`) that Dev's deviations correctly override.

- **SM — Ship silhouette provisional (→ A-17/A-19)** → ✓ ACCEPTED: sound. A-17 owns the ROM-exact shape table; a provisional faithful silhouette is correct for a render-foundation milestone.
- **SM — Context Continuity: shot-direction watch item (from A-4)** → ✓ ACCEPTED as a valid forward-carry. A-5 renders no bullets, so the `muzzleAxis` mid-angle concern is not exercised here; correctly re-surfaced by both TEA and Dev as a non-blocking finding for A-6/A-8.
- **TEA — AC-5 visual/input eyeball-verified, not unit-tested** → ✓ ACCEPTED: sound and honoured. vitest runs in `node` (no DOM); the house convention verifies shell render/input by running the game. I performed the eyeball myself (browser: ship draws, rotates, thrusts, flame aft) — the deviation's forward obligation is discharged.
- **TEA — Silhouette by mechanism, not exact vertices** → ✓ ACCEPTED: correct restraint against a provisional shape; A-17 adds exact-vertex assertions.
- **TEA — Heading correctness, not `sinLookup` reuse** → ✓ ACCEPTED: continuous trig is defensible (smoother outline than the coarse velocity table) and agrees with `ship.ts`'s flight model at every cardinal; orientation correctness is still enforced by the nose-up test.
- **TEA — Clear-frame accepts clearRect OR black fillRect** → ✓ ACCEPTED: both yield a fresh black field; the implementation uses a black `fillRect`, which the test covers.
- **Dev — Ship white (1979 monochrome), not the suggested green** → ✓ ACCEPTED: more faithful to the white-phosphor cabinet (the epic's north star); the session text itself allows "or arcade palette"; A-19 owns final glow/palette. No AC pins the ship color.
- **Dev — Silhouette ~200 lo-units, not ~60–80** → ✓ ACCEPTED: 60–80 lo-units renders ~8px (unreadable) at the fit scale; ~200 matches the real cabinet's on-screen ship. Provisional and within TEA's tested contract (orientation/mechanism, not size); eyeball confirms a well-proportioned ship.
- **Dev — `render(ctx,state,W,H,input)`, not `setupRenderLoop`** → ✓ ACCEPTED: matches the sibling house signature and the executable RED-test contract; wrapping the already-existing `createLoop` inside render would duplicate it and hurt testability. Higher-authority (tests) over the session's approach hint.
- **Dev — Created `src/shell/input.ts`** → ✓ ACCEPTED: the session's "already scaffolded in A-1" was stale (only `core/input.ts` existed); creating the shell controller is exactly what AC-5's real-keyboard requirement needs, and it mirrors the sibling pattern.

## Notes for TEA (RED phase)

- Render is shell-only. Core determinism is preserved by architecture: the sim (`src/core/`) is untouched, tests run green, `pf check` passes.
- ROM-fidelity for the ship silhouette comes from A-3's heading model (`ship.dir`, `sinLookup`); exact vertices are a forward-carry (A-17).
- No new core acceptance criteria. TEA should validate render architecture (core purity) and visual contract (ship draws, flame activates).
- Input wiring (keyboard → `Input.thrust`, etc.) is a shell concern; core already implements the slot/state for input—this story just connects the browser events.

## TEA Assessment

**Tests Required:** Yes
**Reason:** A-5 is production render code with a testable architectural contract (core purity, dir/pos reach the screen, conditional flame, fresh-black-field, renderer never steps the sim). Not a chore bypass.

**Test Files:**
- `asteroids/tests/render.test.ts` — 8 behavioral tests driving `render(ctx, state, W, H, input)` with a mock `CanvasRenderingContext2D` that records stroked segments + fill/clear rects (the star-wars `render.tie-orient` harness, ported). Covers AC-1 (fresh black field), AC-2 (silhouette: draws, dir reaches screen, pos reaches screen, nose-up at dir 64), AC-3 (flame appears only under thrust; flame drawn aft), AC-4 (render never mutates state).
- `asteroids/tests/render-wiring.test.ts` — 5 source-scan tests (`readFileSync`, the `core-boundary.test.ts` idiom) covering AC-1/AC-4 boundary (render.ts exists; never calls `stepGame`; no type-safety escapes) and AC-5 wiring (main.ts imports/drives `render`; captures keyboard input; drops the hardcoded `NO_INPUT` step arg).

**Tests Written:** 13 tests covering 5 ACs (AC-1…AC-5).
**Status:** RED — verified via `testing-runner`:
- `render.test.ts` → module-not-found on `../src/shell/render` (the whole suite is RED until Dev creates the module — the correct TDD signal; its 8 behavioral tests become runnable once render.ts exports `render`).
- `render-wiring.test.ts` → 5 failing: render.ts missing (×3), main.ts lacks the `./shell/render` import, main.ts lacks keyboard capture / still feeds `NO_INPUT`.
- All 110 pre-existing tests (bullet, core-boundary, input, loop, rng, ship, sim, state) stay GREEN — no regressions.

### Rule Coverage

Mapped against `.pennyfarthing/gates/lang-review/typescript.md` (13 checks). Applicable checks for a synchronous Canvas 2D renderer + bootstrap wiring:

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`as any`/`@ts-ignore`) | `render-wiring`: "introduces no type-safety escapes" | RED (render.ts absent) |
| #2 no-mutation of read-only params (renderer reads state) | `render`: "never mutates the game state it is handed" | RED (render.ts absent) |
| #8 test quality (own tests assert meaningfully) | self-check below | pass (self-audited) |

**N/A (no surface in A-5):** #3 enums, #4 `\|\|`-vs-`??` (no nullable defaults; `saucer` not drawn this story), #5 module/`.js` ext (bundler resolution), #6 React/JSX, #7 async/Promise, #9 build-config, #10 input-validation (no `JSON.parse`/user-parsed input), #11 error-handling (no `try/catch`), #12 perf/bundle, #13 fix-regressions (no fixes yet).

**Rules checked:** 3 of 3 applicable lang-review rules have test coverage.
**Self-check (Phase C):** All 13 tests reviewed — every test carries a meaningful assertion (segment counts, `.not.toEqual` geometry diffs, min/max-Y orientation, flame-aft centroid, deep-equal immutability, boolean source-scan predicates). No `assert(true)`, no `let _ =`, no `is_none()`-on-always-None, no vacuous passes. The one type cast — `as unknown as CanvasRenderingContext2D` on the mock — is the sanctioned canvas-double idiom (identical to `star-wars/tests/shell/render.tie-orient.test.ts`), constructing a test double, not silencing an assertion; it is not a #1/#8 violation. 0 vacuous tests found.

**Handoff:** To Julia (Dev) for GREEN — create `src/shell/render.ts` exporting `render(ctx, state, W, H, input)` (fresh black field → ship silhouette at `ship.pos`/`ship.dir`, world +y → screen −y → nose-up at dir 64 → thrust flame aft when `input.thrust`), and rewrite `src/main.ts` to wire keyboard input (sibling `createInputController` pattern) into `stepGame` and drive `render` from the loop's render callback. Do NOT touch `src/core/`. Remember AC-5 is finished only when the dev server eyeball passes (arrow keys rotate; thrust shows the flame).

## Dev Assessment

**Implementation Complete:** Yes

**Files Changed:**
- `asteroids/src/shell/render.ts` — NEW. `render(ctx, state, W, H, input)`: fresh black field, then the ship silhouette (nose + two swept wings + tail notch) at `ship.pos`/`ship.dir`, then the aft thrust flame when `input.thrust`. Pure over `state` (reads, never writes). World→screen is centre-anchored, uniform fit-scale, y-flipped (world +y → screen up). Heading via continuous trig off `dir`. No `src/core/` changes.
- `asteroids/src/shell/input.ts` — NEW. `createInputController()` → `{ sample(): Input }`; the only place raw keydown/keyup is read. Arrows (+ WASD/K alternates) → rotate/thrust/fire/hyperspace; `preventDefault` on arrows/space so the page doesn't scroll.
- `asteroids/src/main.ts` — REWRITTEN. Drops the A-1 placeholder `draw()` + `NO_INPUT` stub; samples real input each step into `stepGame`, and drives `render(ctx, state, W, H, frameInput)` from the loop's render callback (dpr-scaled). `src/core/` untouched.

**Tests:** 123/123 passing (GREEN) — the 13 new A-5 tests (`render.test.ts` 8, `render-wiring.test.ts` 5) plus all 110 pre-existing, verified via `testing-runner`. `npm run build` (`tsc --noEmit && vite build`) is clean — no type errors, no unused-locals, no missing exports.

**Eyeball (AC-5):** Ran the dev server (throwaway port 5288, since another checkout owns the pinned 5275) and drove it in a headless browser:
- At rest: a white glowing ship silhouette, nose-up, centred on a pure black field. ✓ (AC-1, AC-2)
- Held ArrowLeft + ArrowUp: the ship visibly **rotated**, **accelerated off-centre** (thrust → `stepGame` → `ship.pos` → render, end-to-end), and showed a warm amber **flame aft** (opposite the nose) that appears only while thrust is held. ✓ (AC-2, AC-3, AC-5)
- Console: clean except a harmless `favicon.ico` 404 — no JS/canvas errors.

**Branch:** `feat/A-5-vector-render-foundation` (committed; pushing on exit)

**Handoff:** To the next phase (verify / review). Reviewer note — the ship shape/size/color are provisional-by-design (see Dev deviations: white monochrome per 1979 fidelity; ~200 lo-units for on-screen visibility; ROM-exact shape is A-17, glow/feel is A-19). The renderer stays in `src/shell/` and reads `GameState` immutably; `src/core/` is untouched.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none (0 smells; 123/123 green; build+lint clean) | confirmed 0, dismissed 0, deferred 0 |
| 2 | reviewer-edge-hunter | No | Skipped | disabled | Disabled via settings — domain self-covered below |
| 3 | reviewer-silent-failure-hunter | No | Skipped | disabled | Disabled via settings — domain self-covered below |
| 4 | reviewer-test-analyzer | Yes | findings | 7 | confirmed 7 (all Low/Medium, non-blocking), dismissed 0, deferred 0 |
| 5 | reviewer-comment-analyzer | No | Skipped | disabled | Disabled via settings — domain self-covered below |
| 6 | reviewer-type-design | No | Skipped | disabled | Disabled via settings — domain self-covered (overlaps rule-checker #2) |
| 7 | reviewer-security | No | Skipped | disabled | Disabled via settings — domain self-covered below |
| 8 | reviewer-simplifier | No | Skipped | disabled | Disabled via settings — domain self-covered below |
| 9 | reviewer-rule-checker | Yes | findings | 6 (all rule #2 readonly) | confirmed 6 (Low, non-blocking), dismissed 0, deferred 0 |

**All received:** Yes (3 enabled subagents returned; 6 disabled via `workflow.reviewer_subagents` and self-covered)
**Total findings:** 13 confirmed (0 Critical, 0 High, 1 Medium, 12 Low), 0 dismissed, 0 deferred — none blocking

## Reviewer Assessment

**Verdict:** APPROVED

A-5 stands up the vector render foundation, ship silhouette, and thrust flame in `src/shell/` and wires real keyboard input into the loop. The code is correct, builds clean (`tsc --noEmit && vite build`), all 123 tests pass, and I **independently eyeball-verified the runtime** in a headless browser (dev server on a throwaway port): a white glowing ship silhouette nose-up on a black field; ArrowLeft rotates it; ArrowUp thrusts (ship accelerates off-centre) and shows an amber flame aft; no JS/canvas console errors. Every subagent + independent finding is test-coverage or style — none defeats an AC or reaches the Critical/High bar.

**Data flow traced:** keyboard → `createInputController` (`input.ts:32-38` window keydown/keyup → `held: Set`) → `input.sample()` (`input.ts:43-51`, fresh `Input`) → `main.ts:47` `stepGame(state, frameInput, dt)` (pure core step, returns a NEW state — `sim.ts:24` spreads, never mutates the prior object) → `main.ts:53` `render(ctx, state, W, H, frameInput)` → `render.ts:127-132` clears black, `drawShip` reads `state.ship.pos`/`dir`, `drawFlame` gated on `input.thrust`. Safe: no user-supplied data crosses a trust boundary (client-only, `KeyboardEvent.code` compared to literal arrays); the renderer only READS state.

**Pattern observed:** Good — the renderer decomposes into pure geometry helpers (`toScreen`, `heading`, `strokePoly`) + thin draw functions, and `render(ctx, state, W, H, ...)` matches the sibling house signature (star-wars/tempest). Heading via continuous trig off `dir` agrees with `ship.ts`'s flight model at every cardinal. `render.ts:20-21`/`input.ts:9` import only core **types** + the `WORLD_W`/`WORLD_H` constants — the shell READS core, never the reverse.

**Error handling:** N/A by design — pure draw over well-typed inputs, boolean input, no I/O or exceptional paths. Degenerate inputs checked ([EDGE] below): `w`/`h`=0 → `scale`=0 → all points collapse to centre, `fillRect(0,0,0,0)` is a no-op — no crash. `dir`/`pos` are always finite (core-produced).

### Findings by source (all confirmed, none blocking)

- **[TEST]** (test-analyzer, 7 findings — all confirmed):
  - **[MEDIUM] X-axis projection orientation is not pinned by any test** — `render.ts:45-46`. The suite pins the *vertical* axis (nose-up dir-64/192 reflection) but a bug mirroring X (`- (x-WORLD_W/2)*scale`) would leave every segment set non-empty and still `.not.toEqual`, passing all 8 tests while rendering everything left-right inverted. **The code is correct today** (`render.ts:46` uses `+`, world +x → screen-right; eyeball-confirmed), but `toScreen` is the foundation every future entity (rocks/bullets/saucer) projects through. Forwarded as a non-blocking Improvement — add a dir-0/dir-128 x-extreme test, ideally when A-6 first renders rocks.
  - **[LOW] scale magnitude/uniformity not pinned** (`render.ts:130`); **[LOW]** no characterization test locking current mode-agnostic / no-entity-draw behavior (`render.test.ts:78`); **[LOW]** mock uses `as unknown as` rather than a narrow `Pick<CanvasRenderingContext2D,…>` (`render.test.ts:73`); **[LOW]** source-scan wiring regexes are comment-blind (`render-wiring.test.ts:44` — corroborates the existing Dev finding); **[LOW]** flame-diff lacks a guard that the ship body is identical between on/off renders (`render.test.ts:178`); **[LOW]** flame test asserts "more segments" not "off has zero flame segments" (`render.test.ts:166`). All are test-tightening on correct code — forwarded, non-blocking.
- **[RULE]** (rule-checker, 6 findings — all confirmed, all rule #2): `toScreen`/`strokePoly`/`drawShip`/`drawFlame`/`render` take `Ship`/`View`/`GameState`/`Input` params without `Readonly<T>` (`render.ts:45,63,83,102,122,125`). **[LOW]** — none are mutated (grep + the passing AC-4 "never mutates" runtime test prove it), and this is **consistent with the established core convention** (`stepShip(ship: Ship,…)`, `stepGame(state: GameState,…)` also omit `Readonly<T>`). Downgraded to Low, not dismissed. Forwarded: wrapping `render`'s `state`/`input` in `Readonly<…>` would upgrade AC-4's guarantee from runtime to compile-time — a worthwhile follow-up, but blocking it here would be inconsistent with the whole codebase.
- **[TYPE]** (subagent disabled — self-covered, overlaps [RULE]): no stringly-typed domain APIs introduced; `Input`/`Ship`/`Vec2`/`GameState` are proper interfaces. The only type escape is the sanctioned `as unknown as CanvasRenderingContext2D` mock double, confined to test source (rule-checker #1 concurs it is compliant). The `readonly`-param gap is the [RULE] item above.
- **[SEC]** (disabled — self-covered): client-only, no backend, no secrets, no injection surface. `KeyboardEvent.code` (already string-typed by lib.dom) is compared to literal arrays — not a trust boundary. `render` reads state, no `innerHTML`/`eval`/`JSON.parse`. No vulnerability.
- **[SILENT]** (disabled — self-covered): no `try/catch`, no swallowed errors, no silent fallbacks, no async — a pure synchronous draw. Nothing to swallow.
- **[EDGE]** (disabled — self-covered): degenerate viewport (`w`/`h`=0 → `scale`=0, no crash); ship at world edge is drawn at its single position with **no toroidal wrap-ghost** (a wrapped ship near the boundary shows only one copy) — a **[LOW]** forward item, acceptable for A-5 (ship stays central; wrap-draw + rocks/bullets are A-6/A-8). `held` set is bounded by physically-held keys.
- **[DOC]** (disabled — self-covered): comments are accurate — the `render.ts` header correctly describes the y-flip and provisional silhouette; the reworded "advances the simulation — that is the loop's job" comment (`render.ts:6`) is correct; `main.ts:38-41` accurately explains why `frameInput` exists. No stale/misleading docs.
- **[SIMPLE]** (disabled — self-covered): minimal implementation, no dead code, no over-engineering (preflight: 0 smells, 0 TODOs). `frameInput` is used in both closures (no unused local — `noUnusedLocals` build is clean).

### Independent findings (my own adversarial pass)

- **[LOW] No `blur`/`visibilitychange` handler in `input.ts`** — if the tab loses focus while a key is held, `keyup` never fires and the key stays in `held` (stuck thrust/rotate until refocus + release). Matters more here than in star-wars (which is mouse-yoke + Space and also lacks a blur handler), so it's **house-consistent**, not a failed pattern port. Forwarded as a non-blocking Improvement (add a `blur`→`held.clear()` handler in a polish pass).
- **[VERIFIED] `strokePoly` leaves `shadowBlur`/`shadowColor` set, but the next frame's black `fillRect(0,0,w,h)` is a full-frame opaque fill that covers its own shadow — no visible glow leak** (eyeball showed a clean black field). Evidence: `render.ts:127-128` fill runs before any stroke each frame; the leftover state produces no artifact on an opaque full-canvas rect. Low cleanliness note only.
- **[VERIFIED] AC-4 core purity holds** — `render.ts` contains no assignment to `state.*`/`ship.*` (grep clean), no `stepGame` token, no `Date.now`/`performance.now`/`Math.random`/`requestAnimationFrame`; `main.ts:47` reassigns the local `state` binding to `stepGame`'s fresh return (does not mutate the prior object). Complies with the asteroids core/shell hard boundary. Corroborated by rule-checker #14 and the existing `core-boundary.test.ts` (still green).
- **[VERIFIED] `main.ts` non-null assertions are pre-existing** — `canvas.getContext('2d')!` (`main.ts:18`) is the unchanged A-1 canvas-bootstrap line, standard and not an A-5 regression.

### Rule Compliance (lang-review typescript.md, 13 checks + core/shell boundary)

| # | Check | Verdict |
|---|-------|---------|
| 1 | Type-safety escapes | PASS — no `as any`/`@ts-ignore` in src; the `as unknown as` mock is a sanctioned test double (test-only) |
| 2 | readonly/generic pitfalls | **LOW gap** — 6 params omit `Readonly<T>` (none mutated; consistent with core convention). Forwarded, non-blocking |
| 3 | Enum anti-patterns | N/A — no enums |
| 4 | Null/undefined (`??` vs `\|\|`) | PASS — `devicePixelRatio \|\| 1` is safe (dpr never legitimately 0); no falsy-valid values |
| 5 | Module/declaration | PASS — type-only imports marked; `WORLD_W`/`WORLD_H` are runtime imports; extensionless correct under bundler resolution |
| 6 | React/JSX | N/A — no `.tsx` |
| 7 | Async/Promise | N/A — no async code |
| 8 | Test quality | PASS — mock matches every `ctx` member render.ts calls; no `as any` in assertions; tests import from `../src`, not `dist/`. (Coverage-tightening items are [TEST] findings, not vacuity) |
| 9 | Build/config | N/A — tsconfig/package.json unchanged |
| 10 | Input validation | N/A — no trust boundary / `JSON.parse` / user-parsed input |
| 11 | Error handling | N/A — no `try/catch` |
| 12 | Perf/bundle | PASS — specific named imports; no barrel imports, no hot-path `JSON.stringify` |
| 13 | Fix-regressions | N/A — original feature diff, not a post-review fix round |
| — | core/shell purity boundary | PASS — renderer reads core types + world constants, never mutates state, no `stepGame`, no banned globals; `input.ts` type-only import; `main.ts` reassigns binding |

### Devil's Advocate

Assume this is broken. Where does it bleed? **First and most real: the untested horizontal axis.** `toScreen` pins nothing about X — every geometry test asserts inequality or a Y-sign. A one-character slip (`+`→`-` at `render.ts:46`) mirrors the entire playfield left-right and the suite stays green; the eyeball is the only thing that caught the current code being right. When A-6 renders rocks through this same function, a mirror bug would flip the whole game and the tests would smile. That gap is the single most valuable thing to close, and it's why I forwarded it with a specific test. **Second: the stuck key.** A player alt-tabs mid-thrust; the browser fires no `keyup`; `held` keeps `ArrowUp`; the ship thrusts to `SHIP_MAX_SPEED` and wraps forever while the player is in another window. Not a crash, not an AC failure, but a genuinely confusing experience with no `blur` handler to save them. **Third: a confused user resizes the window to a sliver** — `scale` collapses toward zero and the ship shrinks to a dot, or on a 32:9 ultrawide the fit-scale letterboxes the 4:3 playfield into a narrow central band with dead margins; correct, but visually surprising, and there's no wrap-ghost so a ship near a world edge simply has no partner on the far side (fine at this scope, a real gap once rocks drift across seams). **Fourth: determinism theatre.** The renderer *reads* `GameState` and the AC-4 test proves no mutation — but only at runtime, on one hand-built state; `Readonly<T>` would make the compiler the guard instead of a single test, and today nothing stops a future careless `state.ship.dir += 1` inside `drawShip` from shipping until that one test happens to exercise it. **Fifth: the flame is a subtraction trick.** The aft-flame test infers "flame" as the set-difference of two renders and trusts the ship body to be byte-identical; the day someone adds an idle engine shimmer, that inference silently reclassifies ship segments as flame and the test lies rather than fails. None of these is a shipped defect — the code is correct, verified in the build, the suite, and my own browser session — but the devil finds a real coverage hole on the foundational axis and a fistful of latent test-fragility, every one of which is now on record as a forwarded finding.

**Handoff:** To Winston Smith (SM) for finish-story.