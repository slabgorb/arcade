---
story_id: "A-2"
jira_key: ""
epic: "A"
workflow: "tdd"
---
# Story A-2: Deterministic core tick + RNG + entity model

## Story Details
- **ID:** A-2
- **Jira Key:** (local sprint tracking, no Jira)
- **Workflow:** tdd
- **Stack Parent:** none

## Workflow Tracking
**Workflow:** tdd
**Phase:** finish
**Phase Started:** 2026-07-03T12:50:48Z

### Phase History
| Phase | Started | Ended | Duration |
|-------|---------|-------|----------|
| setup | 2026-07-03T11:46:12Z | 2026-07-03T11:47:45Z | 1m 33s |
| red | 2026-07-03T11:47:45Z | 2026-07-03T12:04:21Z | 16m 36s |
| green | 2026-07-03T12:04:21Z | 2026-07-03T12:13:17Z | 8m 56s |
| review | 2026-07-03T12:13:17Z | 2026-07-03T12:50:48Z | 37m 31s |
| finish | 2026-07-03T12:50:48Z | - | - |

## Branch Strategy
**Branch Strategy:** gitflow (asteroids subrepo)
**Branch:** `feat/A-2-core-tick-rng` (created, checked out; targets `develop`)
**Note:** asteroids has no remote yet (github.com/slabgorb/asteroids pending) — local gitflow only. The pf branch-protection hook blocks direct commits to `develop`; all work goes on the feature branch, merged to `develop` at finish.

## Sm Assessment

**Story readiness:** READY. A-2 "Deterministic core tick + RNG + entity model"
(3 pts, p1, workflow `tdd`) is the first real simulation story on the fresh
A-1 scaffold. Context at `sprint/context/context-story-A-2.md` is
Architect-enriched (146 lines, committed ed63ba2, verified intact after
setup — not regenerated) with technical approach and acceptance criteria.

**Repo state:** `asteroids/` exists (A-1), `develop` at scaffold commit
06017d6, feature branch `feat/A-2-core-tick-rng` created and checked out.
`src/core/` and `src/shell/` are empty placeholders — this story populates
`src/core` (deterministic sim: tick, seeded RNG, entity model). Vitest is
wired (`npm test`, currently 0 tests via `--passWithNoTests`).

**Routing:** tdd workflow — red (tea) → green (dev) → verify (tea) → review
(reviewer) → finish (sm). Running in **peloton mode**: fresh team for A-2,
SM orchestrates via SendMessage. Per Comrade's directive: TEA and Reviewer
run on opus, Dev on sonnet.

**Jira:** skipped — no Jira for this project (local sprint tracking only).

## Delivery Findings

Agents record upstream observations discovered during their phase.
Each finding is one list item. Use "No upstream findings" if none.

**Types:** Gap, Conflict, Question, Improvement
**Urgency:** blocking, non-blocking

<!-- Agents: append findings below this line. Do not edit other agents' entries. -->
### TEA (test design)
- **Conflict** (non-blocking): the epic GameState sketch omits `lives`, but the story context specifies a "wave/score/lives triad" — resolved in favour of the story context (lives included, zeroed). Affects `sprint/context/context-epic-A.md` (the sketch could add `lives` for consistency). *Found by TEA during test design.*
- **Gap** (non-blocking): the story's "elapsed-time/tick field" is unnamed and its semantics (integer count vs elapsed seconds) unspecified; tests pin an integer `tick` counter. Affects `asteroids/src/core/state.ts` + `asteroids/src/core/sim.ts` (dev adds `tick: number`, +1 per step). *Found by TEA during test design.*
- **Question** (non-blocking): the star-wars reference source is absent from this checkout (it lives only in a-3), so the RNG golden was derived from the canonical mulberry32 the context specifies rather than star-wars' actual file; if star-wars' port differs, reconcile the golden in verify. Affects `asteroids/tests/rng.test.ts`. *Found by TEA during test design.*
- **Improvement** (non-blocking): the core/ boundary guard matches banned globals as literal call syntax, so a comment containing e.g. `Math.random(` would also trip it — dev should avoid the literal banned-call token in core/ comments. Affects `asteroids/src/core/*.ts` (comment phrasing). *Found by TEA during test design.*

### Dev (implementation)
- **Gap** (non-blocking): the project had no `@types/node` and its `tsconfig.json` `lib` was `ES2020`, so `tsc --noEmit` failed on `tests/core-boundary.test.ts` (`node:fs`/`node:url`) and `tests/loop.test.ts` (`Array.prototype.at()`) even though Vitest (esbuild, no type-checking) ran them fine — RED verification never surfaced it since it only runs `npm test`, not `npm run build`. Fixed by adding `@types/node` and bumping `lib` to `ES2022` (see Design Deviations for the full writeup). Affects `asteroids/package.json` + `asteroids/tsconfig.json` (already applied) — future stories with a red→green split should consider running `npm run build` during RED verification too, not just `npm test`, to catch this class of gap earlier. *Found by Dev during implementation.*
- **Improvement** (non-blocking): a byte-for-byte port of star-wars' `shell/loop.ts` fails `loop.test.ts`'s AC-4 drain assertion because its `last === 0` first-frame sentinel collides with a genuine `now === 0` timestamp (which the test deliberately drives as its baseline frame). Fixed with a `started` boolean flag instead (see Design Deviations). Affects `star-wars/src/shell/loop.ts` conceptually — if star-wars ever gets a similar loop unit test, the same sentinel bug would surface there too. *Found by Dev during implementation.*

### Reviewer (code review)
- **Improvement** (non-blocking): the immutable-return contract lives only in comments + runtime tests, not in the types. `GameState`'s entity fields are mutable (`rocks: Rock[]`, `ship: Ship`, nested `Vec2`), and `stepGame`'s shallow spread aliases those exact references into the returned state. Correct for A-2 (nothing mutates them), but the first A-3 in-place write (`state.rocks.push(...)`, `ship.pos.x = ...`) would silently break purity/determinism with **zero compile-time signal**. Affects `asteroids/src/core/state.ts` + `asteroids/src/core/sim.ts` (make entity fields `readonly` / `ReadonlyArray<Rock>` / `Readonly<Ship>` so tsc rejects in-place mutation before A-3 lands — best folded into A-3). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): `createLoop` (the reusable loop every future game inherits) ships two latent footguns — no re-entrancy guard (a second `start()` overwrites `raf` without cancelling the prior chain → an un-killable rAF loop that double-steps and defeats `stop()`) and no `hz > 0` validation (`hz <= 0` → `dt <= 0` → `while (acc >= dt)` is an infinite loop that hangs the tab on the first frame). Both unreachable in the delivered wiring (`main.ts` single-starts with the default `hz`), so non-blocking, but cheap to harden. Affects `asteroids/src/shell/loop.ts` (add `isRunning` guard + cancel-before-schedule; validate `hz` finite/positive). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): the AC-3 boundary guard is a static text-scan, so it is evadable by aliasing (`const r = Math.random; r()` — empirically confirmed to slip through) and blind to Node builtins (`process`, `node:*` imports), which `tsconfig.json`'s new `types: ["node"]` now makes type-visible inside `src/core/`. This meets AC-3 as written (it catches direct calls + shell imports — both empirically confirmed to fail the guard), so it is an accepted limitation, not a defect. Affects `asteroids/tests/core-boundary.test.ts` + `asteroids/tsconfig.json` (future hardening: ban `node:` imports/`process` in the banned set, or a light eslint/AST rule, and/or a tests-only tsconfig so core never sees Node types). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): loop-test coverage has two blind spots that let real regressions ship green — the 0.25s clamp is exercised only once (a "clamp fires on first frame only" bug re-opening the tab-switch spiral passes all 7 tests), and the default `hz = 60` that production actually uses is never exercised (all 7 call sites pass `hz = 50`; a bad default would go undetected). Affects `asteroids/tests/loop.test.ts` (add a repeated-large-gap assertion and a no-`hz`-arg test). *Found by Reviewer during code review.*
- **Gap** (non-blocking): the RNG's degenerate-input contract is unspecified and untested — `nextInt(rng, 0)` returns `0`, negative/`NaN` `n` is unguarded (returns a negative int / `NaN`), and `createRng(NaN|Infinity)` silently collapses to seed `0`. No production call sites yet, so latent; decide + pin the contract when the first rock-spawn table (A-3+) wires a real `n` from external/parsed input. Affects `asteroids/src/core/rng.ts` + `asteroids/tests/rng.test.ts`. *Found by Reviewer during code review.*
- **Improvement** (non-blocking): two test-clarity nits — `sim.test.ts` "stays deterministic under a fixed dt **regardless of run interleaving**" does not interleave anything (it's a second sequential determinism run; the real interleaving/shared-state coverage comes from the sibling tests), and `input.test.ts`'s all-pressed runtime `every(v => v === true)` assertion is tautological (its genuine value is the compile-time `: Input` annotation catching a dropped field via `tsc`). Affects `asteroids/tests/sim.test.ts` + `asteroids/tests/input.test.ts` (rename/replace with a true A/B-interleaved test; keep the Input literal as a type-level check). *Found by Reviewer during code review.*
- **Improvement** (non-blocking): RED verification runs only `npm test`, not `npm run build`, so the `tsc`-only Node/ES2022-lib type gap escaped red and surfaced during green (Dev Deviation #2). Echoes TEA's + Dev's own findings. Affects the `tdd` workflow's RED-verify step (run `npm run build` alongside `npm test` when a suite imports Node builtins or uses newer-lib syntax). *Found by Reviewer during code review.*

## Impact Summary

**Upstream Effects:** 4 findings (0 Gap, 1 Conflict, 0 Question, 3 Improvement)
**Blocking:** None

- **Conflict:** the epic GameState sketch omits `lives`, but the story context specifies a "wave/score/lives triad" — resolved in favour of the story context (lives included, zeroed). Affects `sprint/context/context-epic-A.md`.
- **Improvement:** the core/ boundary guard matches banned globals as literal call syntax, so a comment containing e.g. `Math.random(` would also trip it — dev should avoid the literal banned-call token in core/ comments. Affects `asteroids/src/core/*.ts`.
- **Improvement:** `createLoop` (the reusable loop every future game inherits) ships two latent footguns — no re-entrancy guard (a second `start()` overwrites `raf` without cancelling the prior chain → an un-killable rAF loop that double-steps and defeats `stop()`) and no `hz > 0` validation (`hz <= 0` → `dt <= 0` → `while (acc >= dt)` is an infinite loop that hangs the tab on the first frame). Both unreachable in the delivered wiring (`main.ts` single-starts with the default `hz`), so non-blocking, but cheap to harden. Affects `asteroids/src/shell/loop.ts`.
- **Improvement:** loop-test coverage has two blind spots that let real regressions ship green — the 0.25s clamp is exercised only once (a "clamp fires on first frame only" bug re-opening the tab-switch spiral passes all 7 tests), and the default `hz = 60` that production actually uses is never exercised (all 7 call sites pass `hz = 50`; a bad default would go undetected). Affects `asteroids/tests/loop.test.ts`.

### Downstream Effects

Cross-module impact: 4 findings across 4 modules

- **`asteroids/src/core`** — 1 finding
- **`asteroids/src/shell`** — 1 finding
- **`asteroids/tests`** — 1 finding
- **`sprint/context`** — 1 finding

### Deviation Justifications

7 deviations

- **Unspecified "elapsed-time/tick field" pinned to an integer `tick` counter**
  - Rationale: the field name/semantics were left open; a named field is required to prove the loop is wired non-trivially, and an integer count avoids float-accumulation nondeterminism.
  - Severity: minor
  - Forward impact: dev must add `tick: number` (init 0) to GameState and increment it in stepGame; a different name/semantics requires updating sim.test.ts + state.test.ts.
- **`initialState` triad includes `lives: 0` (epic sketch omits lives)**
  - Rationale: story context outranks the epic sketch (spec-authority hierarchy); "zeroing everything else" → lives = 0.
  - Severity: minor
  - Forward impact: GameState carries `lives: number` from A-2; A-15 (lives) builds on it.
- **Initial `mode` pinned to `'attract'`**
  - Rationale: arcade cabinets boot into the attract loop (the lobby runs an attract demo when idle); attract is the natural rest state.
  - Severity: minor
  - Forward impact: none beyond the constant; A-16 drives transitions out of attract.
- **Loop tests pin a global-rAF contract and run in the plain node env (no jsdom)**
  - Rationale: keeps the shell/loop test in the node environment (no jsdom change) while letting a verbatim star-wars port (bare rAF or window.rAF) pass.
  - Severity: minor
  - Forward impact: dev's loop must read the global rAF and treat `now` as milliseconds (convert to seconds); a seconds-based `now` or a performance.now()-based loop fails loop.test.ts.
- **RNG golden values generated from canonical mulberry32 (star-wars source not in this checkout)**
  - Rationale: the star-wars reference lives only in a-3, not this checkout; the algorithm is fully specified, so canonical values are the contract for a 1:1 port.
  - Severity: minor
  - Forward impact: dev must implement canonical mulberry32 exactly; a legitimate-but-different variant would fail the golden and require regenerating it in verify.
- **`shell/loop.ts` uses a `started` boolean instead of star-wars' `last === 0` sentinel**
  - Rationale: verified by direct simulation that the literal star-wars sentinel is ambiguous — it can't distinguish "loop not yet started" from "the previous real frame's timestamp was exactly 0". `loop.test.ts`'s AC-4 drain test drives `env.frame(0)` as the deliberate baseline, then `env.frame(90)`, `env.frame(170)`, expecting 8 total `step()` calls (`floor(0.170/0.02)`). Simulating the verbatim sentinel against that exact sequence yields only 3 steps (the 90ms gap after the `now=0` baseline gets silently swallowed by a second false-positive "first frame" reset), so a byte-for-byte port fails AC-4. The `started`-flag version reproduces the correct accumulator semantics and yields the required 8 steps; all other loop.test.ts assertions (lifecycle, sub-dt accumulation, 0.25s clamp, render/alpha) pass identically either way. No test file was modified to reach this — the fix is entirely in the implementation.
  - Severity: minor
  - Forward impact: none on the public API (`createLoop(step, render, hz)` unchanged); future shell code ported from star-wars' loop pattern should use the `started`-flag form, not the `last === 0` sentinel, to avoid the same false-positive on a genuine `now === 0` first frame.
- **Added `@types/node` devDependency + tsconfig `lib`/`types` bump to unblock `npm run build`**
  - Rationale: `tests/core-boundary.test.ts` (TEA's AC-3 guard) imports `node:fs`/`node:url`, and `tests/loop.test.ts` uses `Array.prototype.at()` — both compiled fine under Vitest (esbuild, no type-checking) so RED verification never surfaced it, but `tsc --noEmit` failed on both: `Cannot find module 'node:fs'`/`'node:url'` (no Node type declarations) and `Property 'at' does not exist` (needs ES2022+ lib). Neither test file was touched; this is a project-configuration gap the new test suite exposed for the first time (no prior test in this repo imported Node builtins or used ES2022 array methods).
  - Severity: minor
  - Forward impact: `asteroids/` now has Node type declarations and ES2022 lib available repo-wide; future core-boundary-style filesystem-scanning tests or ES2022+ syntax will type-check without further config changes.

## Design Deviations

Agents log spec deviations as they happen — not after the fact.
Each entry: what was changed, what the spec said, and why.

<!-- Agents: append deviations below this line. Do not edit other agents' entries. -->
### TEA (test design)
- **Unspecified "elapsed-time/tick field" pinned to an integer `tick` counter**
  - Spec source: context-story-A-2.md, Technical Approach (core/sim.ts) + AC-2
  - Spec text: "advance an elapsed-time/tick field and pass the RNG through untouched"
  - Implementation: tests pin a `tick: number` field, init 0, +1 per stepGame call (sim.test.ts, state.test.ts)
  - Rationale: the field name/semantics were left open; a named field is required to prove the loop is wired non-trivially, and an integer count avoids float-accumulation nondeterminism.
  - Severity: minor
  - Forward impact: dev must add `tick: number` (init 0) to GameState and increment it in stepGame; a different name/semantics requires updating sim.test.ts + state.test.ts.
- **`initialState` triad includes `lives: 0` (epic sketch omits lives)**
  - Spec source: context-story-A-2.md (core/state.ts) vs context-epic-A.md GameState sketch
  - Spec text: story: "a wave/score/lives triad ... zeroing everything else"; epic sketch: "GameState type (ship, rocks, saucer, bullets, score, wave, rng)" (no lives)
  - Implementation: state.test.ts asserts `lives === 0`
  - Rationale: story context outranks the epic sketch (spec-authority hierarchy); "zeroing everything else" → lives = 0.
  - Severity: minor
  - Forward impact: GameState carries `lives: number` from A-2; A-15 (lives) builds on it.
- **Initial `mode` pinned to `'attract'`**
  - Spec source: context-story-A-2.md (core/state.ts) + context-epic-A.md
  - Spec text: "Mirror star-wars' Mode union ... 'attract' | 'playing' | 'gameover'" (initial value unspecified)
  - Implementation: state.test.ts asserts `initialState(seed).mode === 'attract'`
  - Rationale: arcade cabinets boot into the attract loop (the lobby runs an attract demo when idle); attract is the natural rest state.
  - Severity: minor
  - Forward impact: none beyond the constant; A-16 drives transitions out of attract.
- **Loop tests pin a global-rAF contract and run in the plain node env (no jsdom)**
  - Spec source: context-story-A-2.md (shell/loop.ts) + A-1 review note (node env)
  - Spec text: "star-wars' loop is the only place wall-clock time is read (requestAnimationFrame's now)"
  - Implementation: loop.test.ts stubs requestAnimationFrame/cancelAnimationFrame as globals (plus a window mirror) and drives ms timestamps; asserts step count == floor(elapsedSeconds/dt) with a 0.25s clamp.
  - Rationale: keeps the shell/loop test in the node environment (no jsdom change) while letting a verbatim star-wars port (bare rAF or window.rAF) pass.
  - Severity: minor
  - Forward impact: dev's loop must read the global rAF and treat `now` as milliseconds (convert to seconds); a seconds-based `now` or a performance.now()-based loop fails loop.test.ts.
- **RNG golden values generated from canonical mulberry32 (star-wars source not in this checkout)**
  - Spec source: context-story-A-2.md (core/rng.ts) + AC-1
  - Spec text: "copied verbatim from star-wars' pattern (mulberry32) ... record the expected values once and assert against them"
  - Implementation: GOLDEN_FLOATS / GOLDEN_INTS_N6 in rng.test.ts generated from the canonical mulberry32 the context specifies (seed>>>0; +0x6D2B79F5; xorshift-multiply mix).
  - Rationale: the star-wars reference lives only in a-3, not this checkout; the algorithm is fully specified, so canonical values are the contract for a 1:1 port.
  - Severity: minor
  - Forward impact: dev must implement canonical mulberry32 exactly; a legitimate-but-different variant would fail the golden and require regenerating it in verify.

### Dev (implementation)
- **`shell/loop.ts` uses a `started` boolean instead of star-wars' `last === 0` sentinel**
  - Spec source: context-story-A-2.md, Technical Approach (shell/loop.ts): "Port `createLoop(...)` verbatim"
  - Spec text: "star-wars' loop is the only place wall-clock time is read ... Port `createLoop(step, render, hz = 60): Loop` ... verbatim"
  - Implementation: replaced the `if (last === 0) last = now` first-frame check with an explicit `started` flag (`if (!started) { started = true; last = now } else { acc += ...; last = now }`).
  - Rationale: verified by direct simulation that the literal star-wars sentinel is ambiguous — it can't distinguish "loop not yet started" from "the previous real frame's timestamp was exactly 0". `loop.test.ts`'s AC-4 drain test drives `env.frame(0)` as the deliberate baseline, then `env.frame(90)`, `env.frame(170)`, expecting 8 total `step()` calls (`floor(0.170/0.02)`). Simulating the verbatim sentinel against that exact sequence yields only 3 steps (the 90ms gap after the `now=0` baseline gets silently swallowed by a second false-positive "first frame" reset), so a byte-for-byte port fails AC-4. The `started`-flag version reproduces the correct accumulator semantics and yields the required 8 steps; all other loop.test.ts assertions (lifecycle, sub-dt accumulation, 0.25s clamp, render/alpha) pass identically either way. No test file was modified to reach this — the fix is entirely in the implementation.
  - Severity: minor
  - Forward impact: none on the public API (`createLoop(step, render, hz)` unchanged); future shell code ported from star-wars' loop pattern should use the `started`-flag form, not the `last === 0` sentinel, to avoid the same false-positive on a genuine `now === 0` first frame.
- **Added `@types/node` devDependency + tsconfig `lib`/`types` bump to unblock `npm run build`**
  - Spec source: context-story-A-2.md, Acceptance Criteria: "`npm run build` (`tsc --noEmit && vite build`) is clean and `npm test` (Vitest) is green."
  - Spec text: AC-5 requires a clean build; the story context does not mention project-config changes.
  - Implementation: `npm install --save-dev @types/node` (asteroids/package.json + package-lock.json); tsconfig.json `lib` bumped from `["ES2020","DOM","DOM.Iterable"]` to `["ES2022","DOM","DOM.Iterable"]`, `types` extended with `"node"`.
  - Rationale: `tests/core-boundary.test.ts` (TEA's AC-3 guard) imports `node:fs`/`node:url`, and `tests/loop.test.ts` uses `Array.prototype.at()` — both compiled fine under Vitest (esbuild, no type-checking) so RED verification never surfaced it, but `tsc --noEmit` failed on both: `Cannot find module 'node:fs'`/`'node:url'` (no Node type declarations) and `Property 'at' does not exist` (needs ES2022+ lib). Neither test file was touched; this is a project-configuration gap the new test suite exposed for the first time (no prior test in this repo imported Node builtins or used ES2022 array methods).
  - Severity: minor
  - Forward impact: `asteroids/` now has Node type declarations and ES2022 lib available repo-wide; future core-boundary-style filesystem-scanning tests or ES2022+ syntax will type-check without further config changes.

### Reviewer (audit)
- **Dev #1 — `started` flag over the `last === 0` sentinel: ACCEPTED.** Independently reproduced (clean-room, outside the repo): the verbatim `last === 0` sentinel yields **3** steps on `loop.test.ts`'s AC-4 drain scenario (`frame(0)→frame(90)→frame(170)`) vs the required **8**, because the `now = 0` baseline collides with the sentinel and swallows the first real gap; the `started`-flag form yields 8. This is a genuine latent bug fix, not a stylistic swap. Public API unchanged. No test file was touched (verified: `git diff 889cc47..c09168f -- tests/` empty).
- **Dev #2 — `@types/node` + tsconfig `lib` ES2022 / `types: ["node"]`: ACCEPTED.** Load-bearing and minimal (confirmed: removing it breaks `tsc` on `core-boundary.test.ts`'s `node:fs`/`node:url` and `loop.test.ts`'s `Array.prototype.at()`), forced by TEA's own test files, no strictness lost. **One non-blocking side-effect flagged** (see Delivery Findings): `types: ["node"]` widens the Node-global surface type-visible inside `src/core/`, beyond what the boundary guard's banned list covers — a future-hardening candidate (tests-only tsconfig, or extend the guard).
- **TEA contract-pins (5): ACCEPTED collectively.** `tick: number` (integer count), `lives: 0` (story context outranks the epic sketch), `mode: 'attract'` (arcade attract rest state), global-rAF-in-ms loop contract, and canonical-mulberry32 golden values — all consistent with the story context and the spec-authority hierarchy; the canonical-golden decision is independently validated (my clean-room `|0` mulberry32 reproduces the golden floats + `nextInt(,6)` bit-for-bit).

## TEA Assessment

**Tests Required:** Yes
**Reason:** A-2 is the deterministic simulation spine (seeded RNG, GameState/Input model, stepGame skeleton, fixed-timestep loop) — pure core logic, squarely TDD-able. No chore bypass.

**Test Files:**
- `asteroids/tests/rng.test.ts` — seeded mulberry32: golden float/int sequences, unsigned-seed normalisation, determinism, [0,1)/[0,n) range, mutation-advances-state, independence between Rng values (13 tests)
- `asteroids/tests/state.test.ts` — initialState/GameState: rng seeding + normalisation, attract mode, zeroed score/wave/lives, empty rocks/bullets, null saucer, ship present, repeatability, seed threading, fresh-array aliasing guard (10 tests)
- `asteroids/tests/input.test.ts` — Input field set (left/right/thrust/fire/hyperspace) + NO_INPUT all-false rest fixture + compile-time field contract (4 tests)
- `asteroids/tests/sim.test.ts` — stepGame: input-state immutability, new-object return, referential transparency, N-tick determinism (AC-2), RNG-clone-not-alias + untouched passthrough, non-no-op tick advance (9 tests)
- `asteroids/tests/loop.test.ts` — createLoop: start/stop lifecycle, fixed-dt drain == floor(elapsed/dt), sub-dt accumulation, 0.25s large-gap clamp, render-once-per-frame + alpha in [0,1) (7 tests)
- `asteroids/tests/core-boundary.test.ts` — the guard star-wars never had: core/ has expected files, zero shell/ imports, zero Date.now/performance.now/Math.random/requestAnimationFrame calls (3 tests, non-vacuous)

**Tests Written:** 46 tests across 6 files covering all 5 ACs (AC-5 build/test-green is the pipeline gate — currently RED because no source exists yet).
**Status:** RED (verified failing for the right reasons).

**RED verification (via testing-runner / Room 101):**
- 5 suites fail with `Cannot find module '../src/core/...'` / `'../src/shell/loop'` — correct RED (implementation not written).
- core-boundary.test.ts executes and fails its non-vacuous guards (`expected 0 to be greater than 0`, `src/core/rng.ts must exist`) — proving the guard breaks on an empty core/ rather than passing vacuously.
- No syntax/TS-compile errors in the test files; no unexpected assertion mismatches (no module resolved that shouldn't have).

### Rule Coverage

| Rule (source) | Test(s) | Status |
|---------------|---------|--------|
| Core-purity standing AC (no shell import / Date.now / performance.now / Math.random / requestAnimationFrame in core) | core-boundary.test.ts (3 guards) | failing (RED) |
| Determinism standing AC (fixed seed + fixed dt; identical-in → identical-out) | sim.test.ts + rng.test.ts determinism | failing (RED) |
| TS #3 union/enum (Mode is a valid string-union member) | state.test.ts "starts in attract mode" | failing (RED) |
| TS #4 null vs undefined (`saucer: Saucer \| null` is null, not undefined) | state.test.ts "no rocks/bullets/saucer" (`'saucer' in s` + toBeNull) | failing (RED) |
| TS #10 boundary normalisation (seed `>>> 0`) | rng.test.ts "masks negative/>32-bit seeds" + state.test.ts "normalises the seed" | failing (RED) |
| TS #8 test quality (meaningful assertions, no `as any`, non-vacuous) | self-check across all 6 suites | pass (self-check) |

**Rules checked:** 4 applicable TypeScript lang-review checks (#3, #4, #8, #10) + 2 project standing ACs (core-purity, determinism) have coverage. Remaining TS checklist items are N/A for this story's surface: #6 React/JSX (no React), #7 async/promises (core is synchronous), #12 barrel/bundle (no barrels), #5 `.js` import extension (moduleResolution `bundler` — extensionless is correct), #9 build-config (strict already enabled), #11 error-handling (no try/catch surface), #1/#2 type escapes/generics (none used).
**Self-check:** 0 vacuous tests found — every test has concrete assertions; the boundary guard explicitly asserts `files.length > 0` to avoid a vacuous pass; no `as any`, no `let _ =`, no assert-true.

**Handoff:** To Dev (Julia) for implementation — GREEN phase.

## Dev Assessment

**Implementation Complete:** Yes
**Files Changed:**
- `asteroids/src/core/rng.ts` - seeded mulberry32 PRNG (`Rng`/`createRng`/`nextFloat`/`nextInt`), ported 1:1 from star-wars' canonical algorithm
- `asteroids/src/core/state.ts` - `GameState`, minimal `Ship`/`Rock`/`Bullet`/`Saucer` shapes, `initialState(seed)` factory
- `asteroids/src/core/input.ts` - `Input` (left/right/thrust/fire/hyperspace) + `NO_INPUT`
- `asteroids/src/core/sim.ts` - `stepGame(state, input, dt)` skeleton: immutable-return, RNG cloned-not-aliased, integer `tick` advance
- `asteroids/src/shell/loop.ts` - fixed-timestep accumulator loop (`createLoop`), with a `started`-flag fix over the star-wars sentinel (see Design Deviations)
- `asteroids/src/main.ts` - rewired to wire `createLoop` to `stepGame`/`initialState`/`NO_INPUT`; render stub re-draws the A-1 placeholder ship
- `asteroids/tsconfig.json` - `lib` bumped to `ES2022`, `types` extended with `node` (unblocks `tsc --noEmit` on TEA's test files)
- `asteroids/package.json` / `package-lock.json` - added `@types/node` devDependency

**Tests:** 46/46 passing (GREEN), verified via testing-runner (RUN_ID `A-2-dev-green` then `A-2-dev-green-2` after the tsconfig fix). `npm run build` (`tsc --noEmit && vite build`) clean.
**Branch:** `feat/A-2-core-tick-rng` (asteroids has no remote yet — committed locally, not pushed; per session Branch Strategy note)

**Handoff:** To next phase (verify — O'Brien)

## Subagent Results

6 specialists ran in parallel (background) under the lead reviewer; reviewer-rule-checker (row 7) was run afterward by SM — the reviewer pane terminated after writing its verdict but before the rule-checker row landed, and SM completed the record inline at the Comrade's direction. **All received: Yes.** "Decision" = lead reviewer's disposition after confirm/dismiss (row 7: SM's).

| # | Specialist | Received | Status | Findings | Decision |
|---|-----------|----------|--------|----------|----------|
| 1 | reviewer-preflight | Yes | clean | 46/46 green, `tsc --noEmit && vite build` clean, tests untampered (`889cc47..c09168f -- tests/` empty), no `.only`/`.skip`, vite scope unnarrowed; flagged tsconfig node/ES2022 bump | Confirmed baseline; independently re-ran tests+build at verdict time (still green) |
| 2 | reviewer-test-analyzer | Yes | findings | 7 test-quality findings (clamp-tested-once, default-`hz=60` untested, guard alias-evasion, misleading `interleaving` name, degenerate-`n` gap, `dt=0` gap, tautological input assert); empirically confirmed the 3 crux ACs strong (golden non-circular, purity catches `state.rng` mutation, guard non-vacuous for direct violations) | All non-blocking → Delivery Findings (test hardening). Crux confirmations corroborate my independent checks |
| 3 | reviewer-edge-hunter | Yes | findings | 14 boundary findings (`nextInt` n=0/neg/NaN, `createRng` non-finite→0, `hz≤0` infinite-loop, unbounded drain, negative-gap→neg acc/alpha, double-start race, frame no try/catch, `sim` shallow-aliases entities, `NO_INPUT` unfrozen, `initialState(null)`) | All latent/unreachable in delivered wiring → non-blocking forward findings |
| 4 | reviewer-silent-failure-hunter | Yes | findings | 3 (loop double-start leaked rAF [high-conf], frame no error boundary [low], `createRng(NaN)→0` [low]); `getContext('2d')!` self-dismissed (fails loud, not silent) | Double-start downgraded to non-blocking (unreachable — single-start wiring); folded into loop-guards forward finding |
| 5 | reviewer-type-design | Yes | findings | immutability-not-in-types [MED, top item], `nextInt` no `n` constraint [LOW], `input`/`dt` unused [intentional/informational], primitive-obsession [matches star-wars convention] | `readonly` immutability → highest-leverage forward finding; primitive-obsession + unused-params dismissed (deliberate/scoped) |
| 6 | reviewer-simplifier | Yes | clean | appropriately minimal, zero scope creep, no dead code; only cosmetic nits (render wrapper, single-use type aliases, clone-spread style, "boundary-test is heavy machinery" aside) | Confirmed scope discipline; the "heavy machinery" aside dismissed — AC-3 explicitly demanded a standalone source-scan guard |
| 7 | reviewer-rule-checker | Yes | clean | 6/6 project rules PASS, 0 violations, exhaustive with file:line evidence: core/shell boundary (zero banned globals/imports in core, loop.ts sole rAF reader), vector aesthetic + no new runtime deps (`@types/node` dev-only, verified load-bearing by revert+rebuild; prod bundle Node-free), gitflow conventions (feature-branch-only commits, `develop` unmoved at 06017d6, vite.config untouched), TS strict preserved (lib/types changes demonstrably required), determinism (dt-only time, rng-clone discipline, pure stepGame), no scope creep (no entity behavior/input handling/render changes; A-1 draw() byte-identical) | Confirmed clean — corroborates the reviewer's verdict; run inline by SM after the reviewer pane died, closing the record's one gap |

**Lead independent verifications (beyond subagents):** clean-room `|0` mulberry32 vs golden constants (bit-for-bit match → non-circular); boundary-guard regex poison-bite proof (all patterns bite; multi-form shell-import); sentinel-vs-started loop reproduction (3 vs 8 steps); `main.ts` A-1 no-regression diff; verdict-time tests+build rerun on a confirmed-clean tree.

## Reviewer Assessment

**Verdict:** APPROVED

**Adversarial pass — 6 specialist subagents (preflight, silent-failure, edge-hunter, type-design, simplifier, test-analyzer) + independent lead verification. Nothing was trusted on prior claim; every crux was re-proven.**

**Independent verification of each acceptance criterion:**
- **Preflight:** 46/46 tests green, `tsc --noEmit && vite build` clean, tests untampered (`889cc47..c09168f -- tests/` empty), no `.only`/`.skip`, vite scope unnarrowed. **Re-ran on a confirmed-clean tree at verdict time — still 46/46 + clean build** (the test-analyzer did in-place mutation testing; I verified `git status` clean + HEAD still `c09168f` afterward).
- **AC-1 (RNG golden):** reproduced `GOLDEN_FLOATS` + `GOLDEN_INTS_N6` bit-for-bit from a clean-room `|0` mulberry32 that does **not** import `rng.ts` → the golden is genuinely canonical, **non-circular**, tightly asserted with `toEqual`.
- **AC-2 (determinism / purity):** mutation-tested — injecting an in-place `nextFloat(state.rng)` into `stepGame` fails `sim.test.ts` 3/9 immediately. RNG cloned-not-aliased + untouched-passthrough + fresh-object return all pinned; determinism run is N=100 ticks with a varied input script and fresh initial state per run.
- **AC-3 (boundary guard):** proved **non-vacuous** — every banned-global regex bites its poison sample, the shell-import regex catches single-line / type-only / multi-line / dynamic-import forms, and the test carries real structural floors (`existsSync` per expected file + `files.length > 0` + reads on-disk files via `import.meta.url`). Direct `Math.random()` and `shell/` import injections into `sim.ts` both correctly fail the guard. Known limitation (alias evasion, Node builtins) surfaced as a non-blocking forward finding — it still meets AC-3 as written.
- **AC-4 (fixed-timestep loop):** reproduced sentinel=3 vs `started`-flag=8 on the drain scenario (Deviation #1 = real fix); clamp, sub-dt accumulation, render-once-per-frame, and `alpha ∈ [0,1)` all asserted with concrete numbers.
- **AC-5 (build/test green):** confirmed twice (preflight + verdict-time rerun).
- **Added AC — A-1 no-regression:** `main.ts` diff is **purely additive** — `draw()` (the A-1 ship triangle) is byte-for-byte unchanged, `canvas#game` still present in `index.html`, `vite build` clean. No regression.
- **Added AC — scope discipline:** `sim.ts` advances `tick` + clones the RNG only; simplifier + my read confirm **zero entity behavior leaked** (rotation/thrust/firing/rocks/saucer correctly deferred to A-3+).

**Data flow traced:** `NO_INPUT` (`main.ts`) → `createLoop` step callback → `stepGame(state, NO_INPUT, dt)` → new `GameState` (`tick+1`, RNG cloned) → `state` reassigned; render stub redraws. Core stays deterministic and DOM-free; wall-clock enters only via `shell/loop.ts`'s rAF `now`. Safe.

**Wiring:** `main.ts` → `shell/loop` → `core/sim`; `canvas#game` in `index.html`; `loop.start()` invoked once. Reachable.

**Pattern observed:** immutable-return `{ ...state, rng, tick: state.tick + 1 }` with the RNG cloned-not-aliased (`sim.ts:17-23`) — matches the star-wars convention the context specifies; verified pure.

**Error handling:** loop lacks a double-start guard, `hz>0` validation, and a frame try/catch (`shell/loop.ts`) — all latent in the delivered single-start / default-hz / monotonic-clock wiring; non-blocking, surfaced as forward findings.

**Observations (12, all non-blocking):** immutability-not-in-types (readonly), loop double-start guard, loop hz≤0 hang, boundary-guard alias/Node-builtin gap, `types:["node"]` core-surface widening, clamp-tested-once, default-hz-untested, RNG degenerate-input contract, `nextInt`/`createRng` non-finite coercion, misleading `sim.test.ts` interleaving name, tautological `input.test.ts` assertion, RED-should-run-build process note. **None reachable + in-scope; none block.**

**Deviation audit:** Dev #1 (started flag) ACCEPTED — independently reproduced the bug it fixes. Dev #2 (`@types/node` + ES2022 lib) ACCEPTED — load-bearing, minimal; `types:["node"]` surface-widening noted as forward-hardening. 5 TEA contract-pins ACCEPTED — consistent with story context + spec-authority. (Full audit under Design Deviations → Reviewer (audit).)

**Subagent corroboration:** [PREFLIGHT] 46/46 + clean build, tests untampered, no `.only`/`.skip`, re-verified at verdict time; [TEST] 7 test-quality findings (clamp-tested-once, default-hz untested, guard alias-evasion, interleaving name, degenerate-`n`, `dt=0`, tautological input assert) — all non-blocking test-hardening, while the 3 crux ACs were empirically confirmed strong (golden non-circular, purity mutation-caught, guard non-vacuous for direct violations); [EDGE] 14 boundary findings, all latent/unreachable in delivered wiring → forward findings; [SILENT] 3 findings, double-start downgraded (unreachable), `getContext('2d')!` self-dismissed as fail-loud; [TYPE] readonly-immutability elevated to top forward finding, primitive-obsession/unused-params dismissed as deliberate; [SIMPLE] scope discipline confirmed, zero dead code, "heavy machinery" aside dismissed (AC-3 demands the standalone guard); [RULE] 6/6 project rules PASS with 0 violations (core/shell boundary, vector aesthetic + dev-only `@types/node` verified load-bearing, gitflow conventions with `develop` unmoved, TS strict preserved, determinism discipline, no scope creep) — run inline by SM after the reviewer pane terminated, corroborating the verdict.

**Why APPROVE, not REJECT:** every finding is a *forward-hardening* item on a deliberately minimal spine — defensive guards on input space that is unreachable in the delivered wiring, or test-strengthening on code that is already correct. All 5 story ACs + both SM-added ACs are met and independently verified. Bouncing a correct, fully-green, scope-disciplined skeleton over latent A-3+ guards would violate scope discipline (those guards belong with the code that makes them reachable). Recommend the forward findings be folded into A-3 (readonly immutability, loop guards) or a small hardening chore.

**Handoff:** To SM (Winston Smith) for finish-story.