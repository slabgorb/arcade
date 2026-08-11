# Story SH3-3 Context

## Title
missile-command — replace the raw requestAnimationFrame loop (src/main.ts:71/74) with @shared/loop createLoop and route the canvas mount through @shared/host-helpers; the sim already uses @shared/rng, so no determinism-sequence change is expected — pin it anyway

## Metadata
- **Story ID:** SH3-3
- **Type:** story
- **Points:** 3
- **Priority:** p2
- **Workflow:** tdd
- **Repo:** arcade
- **Epic:** Shared-module adoption — retire the straggler cabinets' per-game re-implementations of extracted shared code

## Background

The title's line numbers (src/main.ts:71/74) are stale; the actual raw RAF loop is `plugins/missile-command/src/main.ts:109-131`, the `frame()` closure that calls `requestAnimationFrame(frame)` at line 128 and kicks it at line 131. Canvas acquisition is the raw hand-rolled mount at `main.ts:19-22`: `document.querySelector('#game')` + null-throw + `getContext('2d')` + null-throw.

**Current state:** MC's shell owns the frame loop via raw RAF and acquires the canvas by hand. The sim (`stepGame`) is stepped exactly ONCE per video frame, determinism-driven by @shared/rng (used in game.ts, spawn.ts, mirv.ts, sputnik.ts).

**Target:** Retire the raw RAF loop by adopting `createLoop` from `@shared/loop` (`src/shared/loop.ts:55`, signature `createLoop(step, render, hz=60): Loop`). Route the canvas mount through `mountCanvas` from `@shared/host-helpers` (`src/shared/host-helpers.ts:51`, signature `mountCanvas(root, selector='#game'): CanvasMount` returning `{ canvas, ctx }`). Precedent: `plugins/asteroids/src/main.ts:13,33` — `const { canvas, ctx } = mountCanvas(document)`.

## Technical Approach / Key Risk

**The core design risk:** MC's sim is FRAME-COUNTED — `stepGame(game): GameState` takes NO `dt` parameter and is stepped exactly once per video frame (see main.ts header comment). By contrast, `@shared/loop`'s `createLoop(step, render, hz=60)` implements a FIXED-TIMESTEP ACCUMULATOR — it folds elapsed wall-time into an accumulator and calls `step(dt)` a VARIABLE number of times per rendered frame to hold a fixed 60Hz timestep.

Adopting createLoop is NOT a mechanical wrap: it changes the cadence model (decouples sim rate from display refresh; would over/under-step on non-60Hz displays). MC's `stepGame` does not accept `dt`, so the adoption forces a decision: either ignore `dt` (pass it but don't use it), or add a no-op wrapper.

**Precedent for resolution:** `plugins/asteroids/src/main.ts:99` shows how a once-per-frame arcade sim adopts createLoop. TEA/Dev must read asteroids' full adoption before writing RED — the pattern there is the blueprint.

**Determinism gate:** The title's clause "no determinism-sequence change is expected — pin it anyway" mandates a RED regression test PINNING the @shared/rng-driven sim sequence to be byte-identical across the refactor. MC's core already imports @shared/rng in game.ts/spawn.ts/mirv.ts/sputnik.ts, so the sequence is observable and testable. This pin is the proof that the cadence change does not drift the deterministic output.

## Scope

**In scope:**
1. Adopt `createLoop` from `@shared/loop` for the frame loop (main.ts:109-131)
2. Adopt `mountCanvas` from `@shared/host-helpers` for the canvas mount (main.ts:19-22)
3. Regression test pinning @shared/rng-driven sim state sequence unchanged across N steps
4. Audio-unlock + all other shell behavior remain unchanged

**Out of scope:**
- Adopting `installAudioUnlock` — leave MC's existing audio-unlock (main.ts:48-51, the `unlock`/`audio.resume()` handlers on pointerdown+keydown) UNTOUCHED. This is a separate SH3 story and carries the input-path-fusion hazard the epic warns against.
- Adding MC to the shell-adoption-matrix (docs/ops/shell-adoption-matrix.md) — MC is a post-collapse native plugin and is NOT in the matrix.

## Acceptance Criteria

1. **createLoop adoption:** main.ts drives the frame loop via `createLoop` from `@shared/loop`, with no bare `requestAnimationFrame` remaining in main.ts (except as called by createLoop's internals). The step callback receives `dt` and the render callback receives `alpha`; the implementation is correct per asteroids' pattern.

2. **Canvas mount adoption:** main.ts acquires the canvas + 2d context via `mountCanvas` from `@shared/host-helpers`, no hand-rolled `querySelector('#game')`, null-throw, or `getContext('2d')` remaining in main.ts. The destructure `const { canvas, ctx } = mountCanvas(document)` matches asteroids' form.

3. **Regression test:** A RED test in `plugins/missile-command/tests/` pins the sim's @shared/rng-driven state sequence (output of successive `stepGame` calls) against a baseline, proving the sequence is byte-identical before and after the refactor for any fixed seed. The test samples at least 10 frames to exercise spawn/ICBM/ABM/damage cycles.

4. **Audio-unlock unchanged:** Audio-unlock behavior is byte-identical: the same pointerdown+keydown event handlers call `audio.resume()` on the same events, with no changes to the unlock path or audio-engine initialization (main.ts:48-51 remain functionally unchanged).

5. **Full MC suite green:** `npx vitest run --project missile-command` passes entirely; `npm run lint` (tsc --noEmit) shows no new errors.

6. **Shell behavior stable:** All other MC shell behavior (input, rendering, high-score persistence, mode transitions, phase state) is byte-identical to the pre-refactor baseline; no change to game.ts, shell/render.ts, shell/input.ts, shell/audio-dispatch.ts, or any other game module.

---

_Context derived from the sprint YAML title + the 2026-08-11 correction block (stale line numbers, design risk, scope boundary). TEA to refine the technical approach during RED; Dev to implement per asteroids' precedent._
