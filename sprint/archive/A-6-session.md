---
story_id: "A-6"
jira_key: null
epic: "A"
workflow: "tdd"
---
# Story A-6: Asteroid entities — 3 sizes, authentic shape tables, drift (no rotation — ROM-confirmed)

## Story Details
- **ID:** A-6
- **Title:** Asteroid entities — 3 sizes, authentic shape tables, drift (no rotation — ROM-confirmed)
- **Jira Key:** null (local sprint tracking)
- **Type:** feature
- **Points:** 3
- **Priority:** p1
- **Workflow:** tdd
- **Repos:** asteroids
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T17:19:54Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T16:42:03Z | 2026-07-03T16:45:39Z | 3m 36s |
| red | 2026-07-03T16:45:39Z | 2026-07-03T17:00:56Z | 15m 17s |
| green | 2026-07-03T17:00:56Z | 2026-07-03T17:10:35Z | 9m 39s |
| review | 2026-07-03T17:10:35Z | 2026-07-03T17:19:54Z | 9m 19s |
| finish | 2026-07-03T17:19:54Z | - | - |

## Sm Assessment

**Story shape.** A-6 (3pts, p1, `tdd`) gives Asteroids its title objects. Through
A-2 (core sim), A-3 (ship flight + wrap), A-4 (firing), and A-5 (render foundation),
the ship is player-visible and flies. A-6 makes rocks exist as first-class core
entities — a size tier, a fixed shape variant, and seeded drift motion around the
toroidal playfield — so later stories can split them (A-7), collide with them (A-8),
and schedule waves (A-10). This is **entity + passive movement only**: `core/state.ts`
`Rock` extension, a new `core/rocks.ts` (spawn/update), and a reuse-first extraction
of `wrapPosition` from `core/ship.ts` into a shared `core/bounds.ts`.

**Workflow choice.** `tdd` (phased), as tagged in `sprint/epic-A.yaml` and consistent
with A-2…A-5. All 7 ACs are deterministic core assertions (fixed seed + fixed dt) with
a testable extraction contract (A-3 ship-wrap must keep passing unmodified). TDD is the
right posture over `trivial`. Routing to **O'Brien (TEA)** for RED.

**Scope boundaries (held firm).** Entity + drift + wrap only. Splitting is A-7,
collisions + screen-wrap-collision is A-8, scoring A-9, wave director (spawn timing,
4+2/wave, cap 11, ship-safe placement) A-10, authentic ROM shape *point data* A-17.
A-6 ships a **placeholder polygon per variant** and named provisional constants, shaped
so A-17 is a data-only swap, not a refactor.

**Watch items carried forward (the two traps — both in Story Context):**
- **⚠ Title-vs-ROM-truth.** The story title says "rotation." ROM research across two
  independent sources (computerarcheology + 6502disassembly) **confirms rocks never
  rotate** — no angle field, no angle-update routine, only the ship has `ShipDir`.
  Rotation is **dropped from scope, not deferred.** AC-5 verifies rotation's *absence*
  (no orientation field on `Rock`; `shapeVariant` fixed after spawn). **TEA must write
  the absence test, NOT a rotation test.** This is the single most important thing to
  get right this story.
- **A-6 is pure CORE — it does NOT render rocks.** `src/shell/render.ts` stays
  ship-only. Rocks live in `state.rocks` but stay invisible until a later render pass
  iterates them. Consequently the A-5-carried **x-axis projection test** and
  **render-wrap-ghost** items are for that later render pass, **not A-6**. **Open
  coordination gap flagged forward:** *no story is explicitly titled "render the rocks"*
  — whoever wires it inherits A-5's two render obligations. Architect/PM should place it.
- **Provisional constants need quarry verification (A-17):** `ROCK_SHAPE_VARIANT_COUNT`
  (4, leans-confirmed via masked `%00011000` 2-bit random read), `ROCK_HITBOX`
  132/72/42 (corroborated ×2, box-vs-radius unresolved, consumed by A-8), `ROCK_SPEED_MIN/MAX`
  (feel-based, not found in fetches). Keep them named + isolated so A-17 swaps data only.

**Pre-handoff checklist.**
- [x] Session file exists with fields set (`.session/A-6-session.md`)
- [x] Story context written (technical approach + constants table + AC1–AC7) — carried
      from Architect-enriched `sprint/context/context-story-A-6.md`
- [x] Feature branch created: `feat/A-6-asteroid-entities` off `develop` (asteroids subrepo)
- [x] Story marked `in_progress` in sprint YAML (via pf, not hand-edited)
- [x] Jira: N/A — this project tracks issues locally in `sprint/` YAML (explicitly skipped)

**Routing decision:** phased `tdd` → hand off to **O'Brien (TEA)** for RED. Not my
code to write; TEA designs the failing rock-entity tests next (spawn determinism,
shapeVariant range, pure translation, toroidal wrap parity with ship, rotation-absence,
determinism/no-globals).

## Tea Assessment

**Tests Required:** Yes
**Reason:** Production core logic with a testable contract (deterministic spawn,
pure dt-scaled drift, shared toroidal wrap, ROM-confirmed rotation absence). TDD, not a chore bypass.

**Test Files:**
- `asteroids/tests/bounds.test.ts` — 12 tests. The shared toroidal-wrap module (AC-4):
  `wrapPosition(position, bounds)` correctness (both axes, in/over/under-bounds, far-out
  folds, honours the *passed* bounds not a hardcoded WORLD, purity), plus REUSE source-scans
  proving `core/ship.ts` and `core/rocks.ts` both consume `./bounds` (extraction, not a copy).
- `asteroids/tests/rocks.test.ts` — 30 tests. Constants (AC context); `spawnRock`/`spawnRocks`
  determinism + count + tier + shapeVariant range (AC-1, AC-2, AC-6); `updateRock`/`updateRocks`
  pure dt-scaled translation + immutable return (AC-3); toroidal wrap parity with `wrapPosition`
  (AC-4); rotation absence — type-level (no angle field) + structural (key set) + behavioural
  (shapeVariant/size invariant across 600 ticks) (AC-5); `stepGame` wiring + determinism + no-rng
  drift + purity (AC-6).

**Tests Written:** 42 tests across 2 files, covering AC-1…AC-6. (AC-7 — full build/suite green
including A-3 ship-wrap after the extraction — is a whole-suite gate verified by `testing-runner`
at GREEN, not a unit test; the existing `ship.test.ts` wrap suite is that regression guard.)

**Status:** RED — verified via `testing-runner` (RUN_ID `A-6-tea-red`):
- `bounds.test.ts` → `Cannot find module '../src/core/bounds'` (whole file RED until Dev creates it).
- `rocks.test.ts` → `Cannot find module '../src/core/rocks'` (whole file RED until Dev creates it).
- All 123 pre-existing tests (bullet, core-boundary, input, loop, render, render-wiring, rng, ship,
  sim, state) stay GREEN — no regressions. Extending `Rock` with required `velocity`/`shapeVariant`
  is build-safe: no `Rock` literal is constructed anywhere except `rocks: []`.

### Rule Coverage

Mapped against `.pennyfarthing/gates/lang-review/typescript.md` (13 checks). Applicable checks for
pure deterministic core (no DOM/React/async/JSON/user-input):

| Rule | Test(s) | Status |
|------|---------|--------|
| #1 type-safety escapes (`as any`/`@ts-ignore`) | `ship.test.ts` "core stays typed" + `core-boundary.test.ts` walk the whole `core/` dir → auto-cover new `rocks.ts`/`bounds.ts` | GREEN scan (will cover the new files once Dev creates them) |
| #2 no-mutation of read-only params | `rocks.test.ts` purity (`updateRock`/`updateRocks`/`stepGame` don't mutate inputs, `structuredClone`+`toEqual`); `bounds.test.ts` `wrapPosition` purity | RED |
| #8 test quality (own tests assert meaningfully) | self-check below | pass (self-audited) |

**N/A (no surface in A-6 pure core):** #3 enums (`RockSize` is a string union; `shapeVariant` is a
number — no enum), #4 `??`-vs-`||` (no nullable-falsy-valid defaults), #5 module/`.js` ext
(extensionless bundler resolution — house convention), #6 React/JSX, #7 async/Promise, #9 build-config,
#10 input-validation (no `JSON.parse`/user input), #11 error-handling (no `try/catch`), #12 perf/bundle
(named imports only), #13 fix-regressions (original diff, no fixes yet).

**Rules checked:** 3 of 3 applicable lang-review rules have test coverage.
**Self-check (Phase C):** All 42 tests reviewed — every test carries a meaningful assertion (exact
positions via `toBeCloseTo`, deep-equal determinism, `.not.toEqual` seed-threading, set-size variety
guards, range bounds, key-set equality, invariant-across-N-ticks with a non-vacuity movement check).
No `assert(true)`, no `let _ =`, no vacuous passes; no `as any` in assertions; the one non-null
assertion was replaced with a hard narrowing guard. 0 vacuous tests. Imports resolve from `../src`,
never `dist/`.

**⚠ Handoff watch-items for Julia (Dev) — GREEN:**
1. **Rotation is ROM-confirmed ABSENT.** Do NOT add an angle/orientation field to `Rock`; AC-5 source-scans
   the interface for `angle|rotation|orient|spin|angular|dir` and fails if any appear. `shapeVariant` is
   fixed visual identity, set once at spawn, never mutated.
2. **`updateRock` integrates `velocity * (dt*60)`** (frames = dt*60), matching `ship.ts`/`bullet.ts` — NOT
   `velocity * dt`. See Design Deviations.
3. **Reuse, don't duplicate:** create `core/bounds.ts` `wrapPosition(pos, bounds)`, then rewire BOTH
   `ship.ts`'s inlined wrap and `rocks.ts` to import it. The source-scan tests forbid a private copy in
   `rocks.ts`. `Bounds = { width, height }`; `stepGame` passes `{ width: WORLD_W, height: WORLD_H }`.
4. **Spawn draws a scalar speed in `[MIN[size], MAX[size]]` then decomposes by a random heading** — drawing
   `vx`/`vy` independently would fail the `hypot(vel) <= MAX` band assertion.

**Handoff:** To Julia (Dev) for GREEN — create `src/core/bounds.ts` (`Bounds` + `wrapPosition`), extend
`Rock` (`velocity`, `shapeVariant`), create `src/core/rocks.ts` (constants + `spawnRock`/`spawnRocks`/
`updateRock`/`updateRocks`), and wire `updateRocks` into `stepGame` for the playing tick. Do NOT touch
`src/shell/`.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/core/bounds.ts` (new) — shared toroidal-wrap module: `Bounds` type + pure `wrapPosition(position, bounds)` (the UpdateObjPos $6fc7 fold, hoisted per AC-4)
- `asteroids/src/core/rocks.ts` (new) — provisional constants (`ROCK_SHAPE_VARIANT_COUNT` = 4, `ROCK_HITBOX` 132/72/42, `ROCK_SPEED_MIN`/`ROCK_SPEED_MAX` bands large 4–8 / medium 8–16 / small 16–32, all named + isolated for A-17) plus `spawnRock` / `spawnRocks` / `updateRock` / `updateRocks`
- `asteroids/src/core/state.ts` — `Rock` extended with `velocity: Vec2` + `shapeVariant: number`; deliberately no facing/orientation field (AC-5, ROM-confirmed)
- `asteroids/src/core/ship.ts` — private scalar `wrap` removed; position now folds through the shared `wrapPosition`; the 256-unit `dir` fold stays a local mod expression (heading, not a position)
- `asteroids/src/core/sim.ts` — `stepGame` drifts rocks via `updateRocks(state.rocks, dt, WORLD_BOUNDS)` when `mode === 'playing'`

**Tests:** 172/172 passing (GREEN) — 49 new (bounds 13, rocks 36) + 123 pre-existing, zero regressions; A-3's ship-wrap suite passes unmodified after the extraction (AC-7). `npm run build` (`tsc --noEmit && vite build`) clean. Verified via `testing-runner` RUN_ID `A-6-dev-green` (RED re-confirmed pre-implementation via `A-6-dev-red`).

**Implementation notes for review:**
- `spawnRock` rng-consumption order: position x, position y, `shapeVariant` (nextInt), heading, speed scalar — speed drawn in `[MIN, MAX)` then decomposed by heading, so `hypot(velocity)` sits in the tier band by construction (TEA watch-item 4).
- `updateRock` integrates `velocity * (dt*60)`, matching ship/bullet per-frame units (TEA watch-item 2 / logged TEA deviation).
- `src/shell/` untouched; `bullet.ts`'s duplicate private `wrap` left in place — out of A-6 scope, already logged by TEA as a non-blocking Improvement.

**Branch:** feat/A-6-asteroid-entities (pushed, commit 78c837d)

**Handoff:** To The Thought Police (Reviewer) for the review phase.

## Subagent Results

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | none | N/A (informational note on provisional constants matches logged TEA deviations) |
| 2 | reviewer-edge-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [EDGE] observations |
| 3 | reviewer-silent-failure-hunter | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [SILENT] observation |
| 4 | reviewer-test-analyzer | Yes | findings | 4 | confirmed 2, dismissed 1, deferred 1 |
| 5 | reviewer-comment-analyzer | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [DOC] observation |
| 6 | reviewer-type-design | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [TYPE] observations |
| 7 | reviewer-security | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [SEC] observation |
| 8 | reviewer-simplifier | Skipped | disabled | N/A | Disabled via settings — domain assessed by Reviewer directly, see [SIMPLE] observation |
| 9 | reviewer-rule-checker | Yes | findings | 1 (+1 forward note) | confirmed 1 (Low, already tracked); forward note logged as Delivery Finding |

**All received:** Yes (3 enabled returned — preflight clean, test-analyzer 4 findings, rule-checker 1 finding; 6 disabled via `workflow.reviewer_subagents`)
**Total findings:** 3 confirmed, 1 dismissed (with rationale), 1 deferred

**Finding decisions in detail:**
- *test-analyzer #1* — CONFIRMED [TEST][MEDIUM]: `rocks.test.ts` never exercises a non-WORLD `Bounds`; an implementation that ignored the `bounds` param and closed over `WORLD_W/H` would pass the whole file (only `bounds.test.ts:82-87` probes custom bounds, and only for `wrapPosition`). Code itself verified correct — `rocks.ts:54` reads `bounds.width/height`, `rocks.ts:82-85` forwards `bounds` — so test-strength gap, not a defect. Non-blocking; logged forward.
- *test-analyzer #2* — CONFIRMED [TEST][MEDIUM]: `rocks.test.ts:182-188` asserts `seen.size > 1` where `=== ROCK_SHAPE_VARIANT_COUNT` is safe across 100 seeds; a range-halving regression (`nextInt(rng, 2)`) would pass. Implementation verified correct at `rocks.ts:55`. Non-blocking; logged forward.
- *test-analyzer #3* — DISMISSED: the `bounds.test.ts:3-9` header is factually accurate — `bullet.ts:43-45` *does* still carry the duplicate `wrap` and the header describes it as motivation, never claims it was rewired; the session Scope rewires ship + rocks only, and the bullet consolidation is already logged as TEA's non-blocking Improvement Delivery Finding.
- *test-analyzer #4* — DEFERRED (informational): the AC-5 regex scan can false-positive on future innocent comments inside the `Rock` interface body; inherent to the source-scan approach AC-5 explicitly mandates. No action for A-6.
- *rule-checker (bullet.ts unmigrated)* — CONFIRMED [RULE][LOW]: the extraction's stated rationale names bullet as one of the two duplicate copies, and bullet's copy survives A-6. Same substance as the dismissed #3 but as an incompleteness fact rather than a doc defect: real, non-blocking, already tracked in Delivery Findings; recommend riding along with A-7/A-8 touching `bullet.ts`.
- *rule-checker forward note (rng mutation)* — logged as a Reviewer Delivery Finding: `spawnRock` mutates the passed `Rng` in place (by `rng.ts` design), so A-10's wave director must clone `state.rng` before calling it from `stepGame`, matching the existing clone at `sim.ts:24`.

## Reviewer Assessment

**Verdict:** APPROVED

**Data flow traced:** `dt` enters from the shell loop (fixed 1/60) → `stepGame` (`sim.ts:21`) → mode-gated `updateRocks(state.rocks, dt, WORLD_BOUNDS)` (`sim.ts:32-33`) → `updateRock` integrates `pos += velocity * (dt*60)` (`rocks.ts:79-86`) → shared `wrapPosition` fold (`bounds.ts:25-30`) → fresh `Rock` → fresh array → fresh state. Safe because: no mutation anywhere on the path (spread + fresh objects, purity pinned by tests), no randomness consumed per tick (`rocks.test.ts:390-396` pins `rng.seed` unchanged), and no user input reaches rocks at all — `input` flows only into `stepShip`/`stepBullets`. Seed path: `spawnRock` draws exactly 5 rng values in documented order (`rocks.ts:53-57`) from a caller-provided `Rng`; no production caller exists yet (A-10).

**Pattern observed:** Reuse-by-construction done right — the toroidal fold was hoisted once into `bounds.ts:19-30` and both consumers import it (`ship.ts:23`, `rocks.ts:17`), enforced by source-scan tests (`bounds.test.ts:104-128`) so the sharing can't silently regress into copies. Good pattern at `rocks.ts:20-47`: every provisional constant carries its evidence status and its A-17 verification obligation in the doc comment — honest provenance, no fabricated ROM citations.

**Error handling:** No error paths exist to handle — every function in the diff is total over numeric inputs (pure arithmetic + object construction, no I/O, no parsing, no null states; `ROCK_SPEED_MIN[size]` etc. are exhaustive-union-keyed records, statically defined). Degenerate numeric inputs (NaN/Infinity velocity) propagate rather than throw, matching the pre-existing ship/bullet convention — acceptable in a deterministic core whose inputs are produced by its own spawn/step functions.

**Observations (severity-tagged):**
- [VERIFIED] Wrap extraction is behavior-identical for the ship — removed `ship.ts` `wrap` and new `bounds.ts:19-21` compute the same `((v % size) + size) % size`; A-3's 38-test ship suite passes unmodified (AC-7), and `rocks.test.ts:277-307` pins rock-vs-`wrapPosition` parity. Checked against lang-review #1/#2: no escapes, `readonly` where the house style uses it.
- [VERIFIED] AC-5 rotation absence holds at type, structure, and behavior level — `state.ts` `Rock` body carries only `pos`/`velocity`/`size`/`shapeVariant` (regex-scanned by `rocks.test.ts:344-359`), spawn key-set is exactly those four (`:361-364`), 600-tick invariance passes (`:366-375`). Complies with the story's central ROM-truth constraint.
- [VERIFIED][SEC] Core purity — zero hits for `Math.random`/`Date.now`/`performance.now`/`requestAnimationFrame`/DOM/`src/shell` imports across all five touched src files (rule-checker grep + `core-boundary.test.ts` + `ship.test.ts` type-scan, which auto-cover the two new files). No user input, no injection surface, no secrets, no network. Tenant isolation: N/A — offline single-player sim, no tenancy or auth surface exists in this repo.
- [VERIFIED][SILENT] No swallowed errors possible — no `try/catch`, no fallback branches, no ignored return values in the diff; the one silent behavior (rocks frozen outside `playing`, `sim.ts:32-33`) is deliberate, commented, and logged as TEA's unpinned deviation.
- [TEST][MEDIUM] Confirmed test-analyzer #1 — no non-WORLD `Bounds` coverage for `spawnRock`/`updateRock`/`updateRocks` (`rocks.test.ts` throughout); WORLD-hardcoding regressions would pass. Logged forward as a Delivery Finding.
- [TEST][MEDIUM] Confirmed test-analyzer #2 — `seen.size > 1` at `rocks.test.ts:187` under-asserts variant coverage vs `=== 4`. Logged forward as a Delivery Finding.
- [RULE][LOW] Confirmed rule-checker — `bullet.ts:43-45` keeps the third private `wrap` copy the extraction rationale names; consolidation already tracked (TEA Improvement finding), natural ride-along for A-7/A-8.
- [SIMPLE][LOW] `const WORLD_BOUNDS: Bounds = { width: WORLD_W, height: WORLD_H }` is now duplicated at `ship.ts:75` and `sim.ts:19`. Harmless (two literals of two constants), but a single export from `bounds.ts` or `state.ts` would be tidier; fold into the bullet-consolidation ride-along.
- [TYPE][LOW] `spawnRock` resolves headings with continuous-radian `Math.cos/sin` (`rocks.ts:56-61`) where ship/bullet use the ROM's 256-unit integer `sinLookup` table. Not a rule violation and explicitly provisional (spawn formula is A-17 quarry-verification territory); same-engine determinism (the actual AC-6) holds. Noted so A-17 considers table-based headings for ROM fidelity.
- [EDGE][LOW] `spawnRocks` with a fractional `count` (e.g. 2.5) iterates ⌈count⌉ times (`rocks.ts:69-73`); negative counts correctly yield `[]` and zero-count is test-pinned. No caller exists yet; A-10 passes integers. No action — noted for the wave director.
- [DOC][VERIFIED] Comments audited against behavior: `bounds.ts` header, `ship.ts:73-75` note, `state.ts` Rock docs, and all provisional-constant annotations state exactly what the code does and what remains unverified; no stale or overclaiming comment found (the bullet mention is motivation, not a claim of migration).

### Rule Compliance

Mapped to `.pennyfarthing/gates/lang-review/typescript.md`, every declaration in the diff checked (2 new modules, 1 interface extension, 2 rewired files, 2 test files):
| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Type-safety escapes | PASS | zero `as any`/`@ts-ignore`/`@ts-expect-error`/non-null-`!` across all 7 files (grep + preflight + ship.test.ts scan) |
| 2 | Generic/interface | PASS | `Readonly<Record<RockSize, number>>` on all three constant tables (`rocks.ts:28,38,43`); `readonly Rock[]` param (`rocks.ts:90`); no `Record<string,any>`/`object`/`Function`; `Partial<Rock>` in tests is a correct builder default |
| 3 | Enums | PASS/N-A | no enums introduced; `RockSize` stays a string union; no switches needing `assertNever` (ternary at `sim.ts:32`) |
| 4 | Null/undefined | PASS | no `||`-vs-`??` sites, no `?.`, no `Map.get`; union-keyed record lookups statically defined |
| 5 | Module/declaration | PASS | `import type` used correctly in all 5 src files; extensionless imports per house convention |
| 6 | React/JSX | N/A | no .tsx |
| 7 | Async/Promise | N/A | no async code |
| 8 | Test quality | PASS | no `as any` in assertions, no mocks, no `dist/` imports, every invariant test has a non-vacuity companion — two MEDIUM strength gaps confirmed above |
| 9 | Build/config | PASS | `strict: true`; `skipLibCheck: true` is pre-existing and untouched by this diff (not introduced here; build clean regardless) |
| 10 | Input validation | N/A | no JSON.parse/user input |
| 11 | Error handling | N/A | no try/catch surface |
| 12 | Perf/bundle | PASS | named imports only; per-frame `updateRock` path is plain arithmetic + spread; `readFileSync` appears only in one-shot test scans |
| 13 | Fix-regressions | N/A | original diff, no fix commits |

Project conventions: core purity PASS (see [SEC]); immutable-return PASS (`rocks.ts:59-64,80-86,91`; `bounds.ts:26-29`; purity tests); determinism PASS (200-tick deep-equal, zero per-tick rng draws); house style (no semicolons, honest ROM citations) PASS.

### Devil's Advocate

Assume this code is broken; where would the bodies be? First: the bounds parameter is theater. Every rocks test passes WORLD-sized bounds, so if `updateRock` quietly folded against a module-level constant the suite would smile and nod — and `ship.ts` even models that exact pattern with its own `WORLD_BOUNDS` const. The only reason I believe rocks honor the parameter is line-level reading (`rocks.ts:54,85`), not the tests. That is a real hole, and I confirmed it as a MEDIUM finding rather than trusting green. Second: the mode gate. The original cabinet keeps rocks drifting on the GAME OVER screen and in attract demo; A-6 freezes them everywhere except `playing`. Today that's unobservable — nothing can spawn a rock outside `playing` — but the moment A-8 kills the ship with rocks on screen, a frozen gameover field will read as a bug to anyone who knows the arcade. TEA anticipated this by leaving the gate unpinned; I'm escalating it from "unpinned" to a named Question finding so A-10 makes the call deliberately. Third: replay determinism. `Math.cos`/`Math.sin` are engine-dependent transcendentals — two browsers can disagree in the last ulp, so cross-machine replays or seed-sharing would diverge, while the ship's integer table lookups never would. AC-6 only demands same-engine determinism, so this passes, but it's a latent trap if the epic ever grows replay export. Fourth: a NaN smuggled into velocity propagates forever with no floor — but that's the standing ship/bullet convention, and no path in this diff can mint one. None of these break A-6 as scoped; two of them earned forward findings.

**Handoff:** To Winston Smith (SM) for finish-story.

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Gap** (non-blocking): the context assumed A-3 shipped a public `wrapPosition(ship, bounds)` in `core/ship.ts`, but A-3 actually shipped a PRIVATE scalar `wrap(v, size)` inlined into `stepShip`. The extraction is therefore from a private scalar + inlined call sites, not from a public function; there is no "existing wrapPosition" to thin-wrap. Affects `src/core/ship.ts` (Dev creates `core/bounds.ts` `wrapPosition`, then rewires ship's inlined wrap to it). *Found by TEA during test design.*
- **Improvement** (non-blocking): `core/bullet.ts` carries a byte-identical private `wrap(v, size)` copy (`bullet.ts:43-45`, used in `advance` `bullet.ts:61-76`) — the same duplication A-6 consolidates. A-6 scope only rewires ship + rocks; rewiring `bullet.ts` to the shared `wrapPosition` would finish the consolidation. Affects `src/core/bullet.ts`. *Found by TEA during test design.*
- **Conflict** (non-blocking): AC-3 literally says "velocity * dt" but the cabinet's velocity unit is per-60Hz-frame (`Ship.vel`/`Bullet.vel`); resolved in test design as `velocity * (dt*60)` for ship/bullet consistency (see Design Deviations). Reviewer should confirm the per-frame reading is the intended one. Affects `src/core/rocks.ts` (`updateRock` integration). *Found by TEA during test design.*
- **Improvement** (non-blocking, reinforces SM): A-6 renders NOTHING — no failing render test is in this story because it ships no render code. The A-5-carried x-axis-projection test and render-wrap-ghost belong to a later render pass, and "no story is explicitly titled 'render the rocks'" remains an open placement gap for Architect/PM. Affects `src/shell/render.ts` (future story). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the "placeholder polygon per variant" the context mentions was deferred out of A-6 — nothing consumes outline point data yet (rock rendering is the unplaced story; A-8 collides on `ROCK_HITBOX`, not outlines), so only `ROCK_SHAPE_VARIANT_COUNT` shipped. Whichever story renders rocks inherits adding the per-variant point table (shaped for A-17's data-only quarry swap) alongside A-5's x-axis-projection and wrap-ghost obligations. Affects `src/core/rocks.ts` (add a `ROCK_SHAPES`-style table when a consumer lands). *Found by Dev during implementation.*

### Reviewer (code review)
- **Gap** (non-blocking): `rocks.test.ts` never exercises a non-WORLD `Bounds` — a WORLD-hardcoded `spawnRock`/`updateRock` would pass the suite (only `wrapPosition` gets the tiny-bounds probe). Affects `asteroids/tests/rocks.test.ts` (add one tiny-bounds test per function; natural home is A-7's rock-test work). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the shape-variant coverage assertion at `rocks.test.ts:187` accepts `seen.size > 1`; across 100 seeds `seen.size === ROCK_SHAPE_VARIANT_COUNT` is safe and would catch range-halving regressions. Affects `asteroids/tests/rocks.test.ts` (strengthen the assertion). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `spawnRock` mutates the passed `Rng` in place (by `rng.ts` design) — when A-10 wires spawning into `stepGame`, it must clone `state.rng` first, exactly as `sim.ts` already does for the per-tick clone. Affects `src/core/sim.ts` (A-10 wiring pattern). *Found by Reviewer during code review.*
- **Question** (non-blocking): the original cabinet keeps rocks drifting on attract and GAME OVER screens; A-6's `mode === 'playing'` gate freezes them elsewhere. Unobservable today (nothing spawns rocks outside `playing`), but A-10/attract-demo should decide the gate deliberately — reinforces TEA's unpinned-gate deviation. Affects `src/core/sim.ts` (mode gate). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `WORLD_BOUNDS` is now built inline in both `ship.ts` and `sim.ts`; export it once (from `bounds.ts` or `state.ts`) when `bullet.ts`'s duplicate `wrap` gets consolidated — same ride-along chore. Affects `src/core/bounds.ts`/`ship.ts`/`sim.ts`. *Found by Reviewer during code review.*

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->

### TEA (test design)
- **Rock drift integrates as `velocity * (dt*60)`, not the AC's literal `velocity * dt`**
  - Spec source: context-story-A-6.md, AC-3 + Technical Approach ("position += velocity * dt")
  - Spec text: "updateRock translates a rock's position by `velocity * dt` each tick"
  - Implementation: tests assert one tick's displacement = `velocity * frames` where `frames = dt*60`, identical to `ship.ts` (`stepShip`) and `bullet.ts` (`advance`).
  - Rationale: velocity is documented "world-units per 60 Hz frame" everywhere (`Ship.vel`, `Bullet.vel`); ship and bullet both integrate `pos += vel * (dt*60)`. Rocks must share the unit so drift is consistent and A-7 velocity-inheritance is meaningful. "velocity * dt" is read as loose shorthand for the cabinet's per-frame convention.
  - Severity: minor
  - Forward impact: Dev must implement `frames = dt*60` in `updateRock`; A-7 splitting inherits per-frame velocity units.
- **AC-1 golden test pinned by determinism + invariants, not hardcoded exact literals**
  - Spec source: context-story-A-6.md, AC-1
  - Spec text: "returns N deterministic Rock objects — golden-test the exact position/velocity/shapeVariant values for a known seed"
  - Implementation: AC-1 is pinned via reproducibility (same seed → deep-equal) plus structural invariants (count, tier, integer shapeVariant in range, in-bounds pos, per-tier speed band, drift/heading variety, seed-advance) rather than hardcoded literal coordinates.
  - Rationale: exact spawn values depend on Dev's unwritten formula (rng-consumption order, heading/speed decomposition). Authoring literals in RED would couple the suite to one premature implementation and would themselves be a guess. Determinism + invariants prove "deterministic + reproducible" without over-coupling.
  - Severity: minor
  - Forward impact: none — invariants fully constrain correctness; an exact-byte characterization snapshot may be locked at GREEN/verify if desired.
- **Provisional speed constants pinned by relationship, not magnitude**
  - Spec source: context-story-A-6.md constants table (`ROCK_SPEED_MIN`/`ROCK_SPEED_MAX`)
  - Spec text: "feel-based range, small > medium > large ... verify vs quarry (A-17)"
  - Implementation: tests assert positivity, `MIN <= MAX`, and smaller-is-faster ordering — never the specific magnitudes. (Contrast: `ROCK_SHAPE_VARIANT_COUNT`=4 and `ROCK_HITBOX` 132/72/42 ARE pinned exactly — structural / corroborated-x2 respectively.)
  - Rationale: the speed magnitudes are explicitly feel-based/provisional and slated to change in A-17; `.toBe`-pinning them would make this suite an A-17 obstacle. Relationships capture intent robustly across the value swap.
  - Severity: minor
  - Forward impact: A-17 can swap speed magnitudes without editing `rocks.test.ts`.
- **`updateRocks` mode-gate for non-playing states left unpinned**
  - Spec source: context-story-A-6.md, Technical Approach (stepGame calls updateRocks "when state.mode === 'playing'")
  - Spec text: "core/sim.ts's stepGame calls updateRocks(state.rocks, dt, bounds) once per tick when state.mode === 'playing'"
  - Implementation: tested the positive case only (playing → rocks drift, parity with `updateRock`). Did not assert rocks stay static in attract/gameover.
  - Rationale: the epic's attract-mode demo (idle loop) will plausibly want rocks to drift; hard-pinning attract=static now could obstruct that, and there are no rocks in attract yet (spawning is A-10). Pin what is certain; leave the negative gate to A-10/attract-demo.
  - Severity: minor
  - Forward impact: A-10/attract-demo owns the final gate; a Dev gating on 'playing' OR running unconditionally both satisfy this suite.

### Dev (implementation)
- **No thin-wrapper `wrapPosition(ship, bounds)` retained in ship.ts — `stepShip` calls the shared function directly**
  - Spec source: context-story-A-6.md, Technical Approach (shared wrap module)
  - Spec text: "core/ship.ts's own wrapPosition(ship, bounds) becomes a thin wrapper calling the shared function and re-assembling Ship"
  - Implementation: `stepShip` calls the shared `wrapPosition(pos, bounds)` inline when assembling the returned Ship; no ship-level wrapper function exists. The 256-unit `dir` fold stays a local mod expression (it wraps a heading, not a playfield position).
  - Rationale: the spec's premise was wrong — A-3 never exported a `wrapPosition(ship, bounds)` (see TEA's Gap finding: it was a private scalar `wrap` inlined in `stepShip`), so there is no public API to preserve and adding a wrapper no test or caller demands would be dead code. Behavior is bit-identical; A-3's ship suite passes unmodified.
  - Severity: minor
  - Forward impact: none — future consumers (saucer, bullet consolidation) import `core/bounds.ts` directly.
- **No placeholder polygon point tables shipped for the shape variants**
  - Spec source: context-story-A-6.md, Scope out-of-scope note + Sm Assessment ("A-6 ships a placeholder polygon per variant")
  - Spec text: "A-6 ships placeholder polygons per variant" (A-17 ports the real quarry coordinates)
  - Implementation: only `ROCK_SHAPE_VARIANT_COUNT` (4) shipped; no per-variant outline data exists.
  - Rationale: no consumer exists — A-6 renders nothing (rock rendering is an unplaced story) and A-8 collision consumes `ROCK_HITBOX`, not outlines. The in-scope checklist and TEA's handoff enumerate constants + spawn/update only; exporting unused polygon arrays is untested scope creep. Logged forward as a Dev Delivery Finding.
  - Severity: minor
  - Forward impact: the rock-render story adds the per-variant table; its shape should still be designed for A-17's data-only swap.

### Reviewer (audit)
- **TEA: Rock drift integrates as `velocity * (dt*60)`, not the AC's literal `velocity * dt`** → ✓ ACCEPTED by Reviewer: TEA's Conflict finding asked for explicit confirmation, and I confirm the per-frame reading is intended — `Ship.vel`/`Bullet.vel` are documented "world-units per 60 Hz frame" (`state.ts:25,41`), `stepShip` integrates `vel * frames` (`ship.ts:110-114`), and rocks must share the unit for A-7 velocity inheritance to be meaningful. The AC's "velocity * dt" is shorthand for the cabinet convention.
- **TEA: AC-1 golden test pinned by determinism + invariants, not hardcoded exact literals** → ✓ ACCEPTED by Reviewer: agrees with author reasoning — literals authored before the spawn formula existed would have been guesses coupling the suite to one implementation; determinism + band/range/variety invariants fully constrain the contract.
- **TEA: Provisional speed constants pinned by relationship, not magnitude** → ✓ ACCEPTED by Reviewer: magnitudes are explicitly feel-based and A-17-swappable; relationship pins (positive, MIN≤MAX, smaller-faster, non-vacuity) capture the durable intent.
- **TEA: `updateRocks` mode-gate for non-playing states left unpinned** → ✓ ACCEPTED by Reviewer: correct restraint — my Devil's Advocate pass upgraded this to a named Question Delivery Finding (original cabinet drifts rocks on attract/gameover) so A-10 decides deliberately rather than inheriting the gate by accident.
- **Dev: No thin-wrapper `wrapPosition(ship, bounds)` retained in ship.ts** → ✓ ACCEPTED by Reviewer: the spec premise was corrected by TEA's Gap finding (A-3 shipped a private scalar, not a public wrapper); adding an exported wrapper nothing calls would be dead API. Extraction verified behavior-identical — A-3's 38 ship tests pass unmodified.
- **Dev: No placeholder polygon point tables shipped for the shape variants** → ✓ ACCEPTED by Reviewer: no consumer exists (no rock rendering; A-8 uses `ROCK_HITBOX`), the session in-scope list never enumerates point data, and the omission is transparently logged forward as a Dev Delivery Finding. Shipping unused, untested data arrays would have been scope creep, not fidelity.

---

# Story Context

## Summary

A-3 gave the ship real flight; A-6 gives the game its title objects. Rocks need to exist as first-class entities — with a size tier, a shape, and drift motion around the toroidal playfield — before anything can split them (A-7), collide with them (A-8), or schedule waves of them (A-10). This story is entity + passive movement only: a rock spawns with a random shape variant and a random drift velocity (seeded, deterministic), then translates and wraps every tick.

**Critical:** The story title says "rotation," but ROM research (two independent sources) **confirms rocks do NOT rotate** — a widely-misremembered detail of the original cabinet. Rotation is dropped from scope. AC-5 verifies rotation's *absence* (no angle field on `Rock`; `shapeVariant` fixed after spawn). The TEA phase must NOT write a rotation test — they must write the absence test.

## Technical Approach

**Research pass (max 3 fetches shared across A-6/A-7/A-8; all 3 spent).** Fetched `computerarcheology.com/Arcade/Asteroids/Code.html` and `6502disassembly.com/va-asteroids/Asteroids.html`. Both tools summarize a huge raw listing rather than reading byte-for-byte, so treat specifics as leads to confirm against the actual `reference/` quarry in A-17, per the epic's standing caveat:

- **Rotation: confirmed absent, independently, in both fetches.** Neither excerpt found an angle/direction field or an angle-update routine for asteroid objects — only the ship has `ShipDir`. Position updates for rocks are pure velocity-accumulation (`$6FCA-$7013` region) with no rotation term. **Dropping rotation from scope is correct, not a gap.**
- **Shape variant count: leans confirmed at 4.** One excerpt surfaced a `GetRandNum` call masked with `%00011000` (two bits, i.e. a 4-way random choice) in rock update/spawn code. **Verify exact variant count against `reference/` quarry (A-17).**
- **Size tiers and hit-box constants: corroborated by both independent sources** at large/medium/small with values **132 / 72 / 42** (world units). Whether these denote a full box width or a radius-like half-extent is **not disambiguated — verify vs quarry (A-17)**; A-6 doesn't need the answer, only A-8 does.
- **Drift speed ranges per size tier: not found.** Both fetches located velocity storage (`AstXSpeed`/`AstYSpeed` arrays) but no explicit per-size speed-cap constants. Ship with feel-based provisional ranges, smaller-is-faster per common convention. **Verify vs quarry (A-17)**.

**Shared wrap module (epic's "hoist if sensible" call).** A-3 defined `wrapPosition(ship, bounds) → Ship` inside `core/ship.ts`, operating on the whole `Ship`. Rocks need the identical toroidal-wrap behavior, and bullets/saucer will too later, so this story extracts the position-only core into a new shared module — `core/bounds.ts` — exporting `wrapPosition(position: Vec2, bounds: Bounds): Vec2`. `core/ship.ts`'s own `wrapPosition(ship, bounds)` becomes a thin wrapper calling the shared function and re-assembling `Ship`; behavior is unchanged (existing A-3 tests must keep passing unmodified). `core/rocks.ts` calls the same shared function directly. This keeps rock-wrap and ship-wrap bit-for-bit identical by construction rather than by convention.

**Code shape.**
- Extend `Rock` in `core/state.ts` (currently position + size tier only, per A-2) with `velocity: { x: number; y: number }` and `shapeVariant: number` (`0..ROCK_SHAPE_VARIANT_COUNT-1`, fixed at spawn, never mutated post-spawn). **No angle/rotation field** — there's nothing for it to represent.
- New `core/rocks.ts`, pure functions, no mutation:
  - `spawnRock(rng, size, bounds) → Rock` — random position within bounds, random `shapeVariant` via `nextInt(rng, ROCK_SHAPE_VARIANT_COUNT)`, random drift velocity (random heading + speed drawn from `[ROCK_SPEED_MIN[size], ROCK_SPEED_MAX[size]]`) via `state.rng`.
  - `spawnRocks(rng, count, size, bounds) → Rock[]` — bare stub: loops `spawnRock` `count` times. A-10 either calls this directly or supersedes it; the seam is this function signature.
  - `updateRock(rock, dt, bounds) → Rock` — `integratePosition` (position += velocity * dt) then `wrapPosition` from shared `core/bounds.ts`. No rotation step — deliberately absent, not deferred.
  - `updateRocks(rocks, dt, bounds) → Rock[]` — maps `updateRock` over the array.
- `core/sim.ts`'s `stepGame` calls `updateRocks(state.rocks, dt, bounds)` once per tick when `state.mode === 'playing'`, alongside `updateShip`, following A-3's immutable-return convention (`{ ...state, rocks: ... }`).
- Rock shape *point data* is out of scope for A-6 beyond the variant *count*: use a small placeholder/approximate polygon per variant. The provisional-table structure is deliberately shaped so A-17's data port is a data-only swap, not a refactor.

**Standing epic ACs:** determinism (fixed seed + fixed dt in every test), and A-2's banned-globals guard continues to cover `core/rocks.ts` and `core/bounds.ts` automatically.

## Provisional Constants Table

| Constant | Provisional value | Status |
|---|---|---|
| `ROCK_SHAPE_VARIANT_COUNT` | 4 | leans-confirmed — `GetRandNum` masked `%00011000` (2 random bits) near rock spawn/update code — **verify exact table vs quarry (A-17)** |
| `ROCK_HITBOX` (large/medium/small) | 132 / 72 / 42 world units | corroborated by two independent sources; box-vs-radius semantics unresolved — **verify vs quarry (A-17)** (consumed by A-8, defined here alongside `RockSize`) |
| `ROCK_SPEED_MIN` / `ROCK_SPEED_MAX` (per size tier) | feel-based range, small > medium > large | not found in fetched excerpts — **verify vs quarry (A-17)** |
| `ROCK_ROTATION_RATE` | n/a — no field | **confirmed absent** in two independent sources; not implemented, not provisional |

## Scope

**In scope:**
- `Rock` shape extension (`velocity`, `shapeVariant`) in `core/state.ts`
- `core/bounds.ts` (new shared module: `wrapPosition` extracted from `core/ship.ts`, re-wired so `ship.ts` calls the shared function with no behavior change)
- `core/rocks.ts` (`spawnRock`/`spawnRocks` stub, `updateRock`/`updateRocks` — drift + wrap, no rotation)
- Wiring `updateRocks` into `stepGame`
- The provisional constants table above as named exports
- Vitest coverage for all of the above, including a regression check that A-3's ship-wrap tests still pass unmodified after the extraction

**Out of scope:**
- Splitting behavior (A-7)
- Collision detection (A-8)
- Wave director — spawn timing, wave-count progression, cap-11 logic, ship-avoiding placement (A-10)
- Authentic rock shape *point data* — A-6 ships placeholder polygons per variant, A-17 ports the real quarry coordinates
- Scoring (A-9)
- Any form of rotation (confirmed absent, not a future addition for this story)
- **Rock rendering** — A-6 is pure core. Rocks exist in `state.rocks` but stay invisible; see Watch Items below.

## Acceptance Criteria

1. **AC-1: Deterministic spawn with fixed seed**
   `spawnRocks(rng, N, 'large', bounds)` with a fixed seed returns `N` deterministic `Rock` objects — golden-test the exact position/velocity/`shapeVariant` values for a known seed.

2. **AC-2: Shape variant range**
   Every returned `shapeVariant` is an integer in `[0, ROCK_SHAPE_VARIANT_COUNT)`.

3. **AC-3: Pure translation (no rotation)**
   `updateRock` translates a rock's position by `velocity * dt` each tick with `velocity`, `shapeVariant`, and `size` unchanged (pure translation) — assert across N ticks at a fixed `dt`.

4. **AC-4: Toroidal wrap matches ship**
   A rock crossing any playfield edge wraps to the opposite side (toroidal), matching A-3's ship-wrap behavior bit-for-bit via the shared `core/bounds.ts` module — assert ship and rock produce identical wrapped coordinates for the same pre-wrap position/bounds.

5. **AC-5: Rotation verified absent**
   Rotation is verified absent, not merely untested: run a rock through many ticks at fixed `dt` with nonzero velocity and assert (a) `Rock` carries no angle/orientation field at the type level and (b) `shapeVariant` — the only per-instance visual-identity field — never changes after spawn. This test stands in for "rotation rate" and documents the confirmed absence instead.

6. **AC-6: Determinism (no global state)**
   Fixed seed via `spawnRocks`, fixed `dt` fixtures, no wall-clock or `Math.random` in `core/rocks.ts`/`core/bounds.ts` (covered by A-2's existing banned-globals guard test).

7. **AC-7: Build and test green**
   `npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` (Vitest) is green, including pre-existing A-3 ship tests after the `wrapPosition` extraction.

## Watch Items & Carry-Forward

### ⚠ Rotation Title vs. ROM Reality

The story title says "rotation," but ROM research (two independent sources: computerarcheology.com and 6502disassembly.com) **confirms rocks NEVER rotate in the original Asteroids**. This is a widely-misremembered detail from screenshots/gifs. The Architect has already confirmed this and dropped it from scope. **TEA phase RED:** Do NOT write a rotation test. Instead, write AC-5 (the absence test) — verify that `Rock` has no angle field and `shapeVariant` never changes post-spawn. This documents the confirmed absence, not a gap.

### No Rock Rendering in A-6 (Pure Core)

A-6 is pure core entity + drift + wrap. It does **not** draw rocks. A-5's `render.ts` currently draws only the ship. Rocks will exist in `state.rocks` but stay invisible. Rendering will land in a later story (likely a dedicated render pass or wired into whichever story extends `src/shell/render.ts`). **Flag for SM/Architect:** no story is explicitly titled "render the rocks" — this is an open coordination gap.

### A-5 Carry-Forward: Render-Side Obligations

When rock rendering lands, inherit these from A-5:

1. **x-axis projection test (high value).** Add a test that pins the horizontal axis: an entity at world +x vs −x must map to screen right vs left. A-5's suite pins only the vertical axis, so a left-right mirror bug in `toScreen` would pass every current render test. This is the single highest-value render test to add.

2. **Render-side wrap-ghost gap.** Rocks drift across toroidal edges, but the renderer draws each entity at one position with no wrapped copy — a rock straddling an edge will "pop" rather than smoothly wrap on screen. Core wrap is correct (shared `core/bounds.ts`); the *render* wrap-ghost (draw entities near an edge twice, at `pos` and `pos ± bounds`) is a separate open item. Note it forward when rock rendering lands.

### Boundary Reminder

Any rock-rendering code lives in `src/shell/`, reads `GameState` immutably, never mutates core or calls the sim step (A-5 AC-4).

---

## Branch & Repo

- **Repo:** asteroids
- **Branch:** feat/A-6-asteroid-entities (off develop)
- **Branch Strategy:** gitflow (feat/{STORY_ID}-{SLUG})

---

_Session file created by The Diary (SM setup subagent) at 2026-07-03T16:42:03Z._
_Story context enriched from `sprint/context/context-story-A-6.md` (Architect research: ROM confirmation of no rotation, shape variant count leans-confirmed at 4, size hitbox constants corroborated, wrapPosition extraction strategy)._