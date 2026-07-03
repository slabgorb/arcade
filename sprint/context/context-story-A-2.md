# Story A-2 Context

## Title
Deterministic core tick + RNG + entity model

## Metadata
- **Story ID:** A-2
- **Type:** story
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repo:** asteroids
- **Epic:** Asteroids — faithful 1979 vector clone

## Problem
A-1 lands an empty `asteroids/` scaffold (Vite+TS+Vitest, ports, tunnel wiring)
with no game code in it. A-2 lays the deterministic simulation spine every
later story builds on: the seeded RNG, the `GameState` shape, the `Input`
shape, a `stepGame(state, input, dt)` skeleton, and the shell's fixed-timestep
loop wired up to call it. Per the epic, none of this is invention — it is a
direct port of the pattern star-wars already proved in `src/core/rng.ts`,
`src/core/state.ts`, `src/core/sim.ts`, `src/core/input.ts`, and
`src/shell/loop.ts`. Getting the core/shell boundary and the determinism
contract right here, before any entity behavior exists, is what makes every
subsequent story (A-3 flight, A-4 firing, A-6+ rocks/saucers) TDD-able against
a pure function instead of a stateful mess.

## Technical Approach

**`core/rng.ts` — seeded PRNG, copied verbatim from star-wars' pattern
(mulberry32).** star-wars models the RNG as a tiny mutable value type, not a
class:

```ts
export interface Rng { seed: number }
export function createRng(seed: number): Rng { return { seed: seed >>> 0 } }
export function nextFloat(rng: Rng): number { /* mulberry32 mix; mutates rng.seed */ }
export function nextInt(rng: Rng, n: number): number { return Math.floor(nextFloat(rng) * n) }
```
`nextFloat` advances `rng.seed` by the mulberry32 constant, runs the
xorshift-multiply mix, and returns a float in `[0, 1)`; `nextInt(rng, n)`
floors `nextFloat(rng) * n`. Port this file close to 1:1 — same algorithm,
same shape (`{ seed }`, not a class instance) so `Rng` stays trivially
serializable and comparable in `toEqual` assertions.

**`core/state.ts` — `GameState`.** Carries `rng: Rng`, `mode`, a wave/score/
lives triad, and the entity arrays: `ship`, `rocks: Rock[]`, `bullets:
Bullet[]`, `saucer: Saucer | null`. Per the epic's own state.ts sketch
(`GameState type (ship, rocks, saucer, bullets, score, wave, rng)`) declare
the full shape now so later stories extend fields rather than restructure the
type, but keep the entity *contents* minimal — `Ship`/`Rock`/`Bullet`/`Saucer`
need only a position (and for `Rock`, a size tier) since flight/physics/
splitting arrive in A-3+. Mirror star-wars' `Mode` union but trimmed to what
this epic actually needs yet: `'attract' | 'playing' | 'gameover'` (star-wars
also carries a `Phase` union for its 3-act structure — Asteroids has no
phases, so skip it). Provide an `initialState(seed = <a fixed constant>):
GameState` factory exactly like star-wars' `initialState()`, seeding `rng`
via `createRng(seed)` and zeroing everything else.

**`core/input.ts` — `Input`.** Plain booleans, abstracted from any device:
`left`, `right`, `thrust`, `fire`, `hyperspace`. star-wars' `input.ts` is the
template for the *shape* (a flat interface plus a `NO_INPUT` constant used as
the default/rest-state fixture in tests) — its actual fields (`aimX`/`aimY`
yoke axes) don't apply to Asteroids' rotate/thrust cabinet, so this story
defines the field set fresh per the epic's spec (left/right/thrust/fire/
hyperspace) rather than copying star-wars' fields verbatim. Export `NO_INPUT:
Input` with everything `false`.

**`core/sim.ts` — `stepGame(state, input, dt) → state`.** For this story it
does the minimum to prove the loop is wired and deterministic: advance an
elapsed-time/tick field and pass the RNG through untouched, with no entity
behavior yet (rotation/thrust/rocks/bullets are A-3+). Follow star-wars'
`sim.ts` convention exactly, which is **immutable-return, not mutate-in-
place**: every branch returns a *new* state object built with `{ ...state,
...patch }`; the one exception is the RNG, which is cloned once per step
(`const rng: Rng = { seed: state.rng.seed }`) into a local mutable value that
`nextFloat`/`nextInt` are allowed to mutate through the step, and that clone
— never the original `state.rng` — is threaded into the returned state. That
clone is what keeps `stepGame` pure despite the RNG's internal mutation:
`state` in is never touched, only read.

**`shell/loop.ts` — fixed-timestep accumulator loop, copied from star-wars'
pattern.** star-wars' loop is the only place wall-clock time is read
(`requestAnimationFrame`'s `now`). It accumulates elapsed seconds, clamps a
single frame's gap to 0.25s (so a backgrounded tab doesn't spiral into a
death-loop of catch-up steps), then drains the accumulator in fixed `dt = 1/hz`
slices — `while (acc >= dt) { step(dt); acc -= dt }` — before rendering once
with the leftover fraction as an interpolation `alpha = acc / dt`. Port
`createLoop(step: StepFn, render: RenderFn, hz = 60): Loop` (with `start()`/
`stop()`) verbatim; `step` closes over `stepGame` and the current `GameState`
in `main.ts`, `render` is a stub for this story (A-5 does real rendering).

**Hard boundary (standing epic AC, restated):** `core/` must never import
from `shell/`, never touch DOM/`window`/`canvas`, and never call
`Date.now()`, `performance.now()`, `Math.random()`, or
`requestAnimationFrame()`. All time enters as `dt` (only `shell/loop.ts`
reads wall-clock time); all randomness comes from `state.rng`. `stepGame` is
identical-in → identical-out.

**Discrepancy worth flagging:** star-wars does **not** have an automated
check for this boundary — no ESLint import-restriction config and no
`tests/` file asserts "no `shell/` import in `core/`" or greps for banned
globals (`find`/`grep` across `star-wars/` turned up neither; the only hit
was a comment in `highscore.ts` that mentions "importing shell/" in prose,
not code). The boundary is enforced by convention/review only in star-wars.
Since A-2 is establishing the spine fresh, this story should add the cheap
guard star-wars never got around to (see AC below) rather than skip it for
lack of precedent.

## Scope
- **In scope:** `core/rng.ts` (seeded PRNG), `core/state.ts` (`GameState`,
  minimal `Ship`/`Rock`/`Bullet`/`Saucer` shapes, `initialState()`),
  `core/input.ts` (`Input`, `NO_INPUT`), `core/sim.ts` (`stepGame` skeleton —
  tick/rng passthrough only, no entity behavior), `shell/loop.ts`
  (fixed-timestep accumulator loop), minimal `main.ts` wiring the loop to
  `stepGame` and a stub `render`, and the Vitest suites covering all of the
  above.
- **Out of scope:** ship rotate/thrust/inertia/wrap physics (A-3), firing/
  bullet lifetime (A-4), real rendering beyond the stub draw call (A-5), any
  rock or saucer spawn/movement/collision behavior, vector shape tables
  (A-17), sound.

## Acceptance Criteria
- `createRng(seed)` + repeated `nextFloat`/`nextInt` calls produce a known,
  reproducible sequence for a fixed seed (golden test — record the expected
  values once and assert against them).
- Two `stepGame` runs seeded identically (`initialState(sameSeed)`), fed the
  same input script and the same fixed `dt`, produce deeply-equal `GameState`
  after N ticks — proves the passthrough is actually pure and the RNG-clone
  discipline holds.
- `core/` has zero imports from `shell/` and zero calls to `Date.now`,
  `performance.now`, `Math.random`, or `requestAnimationFrame` — star-wars
  enforces this only by convention (no lint rule or test found in its
  `tests/`), so this story adds a small guard test that scans `core/` source
  for banned import paths and globals, establishing the check star-wars never
  had.
- `createLoop` drains the accumulator in fixed `dt` slices regardless of the
  wall-clock gap between frames (simulate variable `now` timestamps and
  assert the number of `step()` calls matches `floor(elapsed / dt)`, with the
  large-gap clamp respected).
- `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test`
  (Vitest) is green.

---
_Generated by `pf context create story A-2` from the sprint YAML._
_Enriched by Architect: RNG/state/input/sim/loop patterns ported from star-wars, with the missing boundary-enforcement gap flagged and closed._
