// src/shell/pause.ts
//
// Story bz2-5 — the pause gate. A shell/loop concern, kept OUT of the pure core:
// the sim never learns it was paused (the epic's core-purity non-negotiable).
// The shell owns the wall clock and the frame loop, so it also owns the question
// "should this frame advance?". Escape toggles a boolean the loop holds; a paused
// frame simply does not call stepGame, so the deterministic core is untouched and
// resume continues from the exact same state (story AC5).
//
// SH2-14 RE-POINT: the mechanism this module used to hand-roll now lives in the
// PURE @shared/pause subpath (extracted from here in SH2-12) — the cabinet
// shares the VERB. INITIAL_PAUSED / isPauseKey / togglePaused re-export the shared
// definitions verbatim (identical behaviour: isPauseKey matches the lowercased
// 'escape' EXACTLY, never a prefix). battlezone keeps its own local 4-arg
// stepUnlessPaused(game, input, dt, paused) signature — the NUMBERS/shape its
// callers (main.ts + the surviving bz2-5 pause-gate tests) depend on — as a thin
// delegate over the shared game-agnostic thunk gate: it passes stepGame as the
// zero-arg thunk, so the shared gate imports no game sim and battlezone's callers
// are unchanged.

import type { GameState } from '../core/state'
import type { Input } from '../core/input'
import { stepGame } from '../core/sim'
import {
  INITIAL_PAUSED,
  isPauseKey,
  togglePaused,
  stepUnlessPaused as sharedStepUnlessPaused,
} from '@shared/pause'

// Re-export the shared primitives verbatim so main.ts and the bz2-5 tests keep
// importing them from './pause' — the module boundary is unchanged, only the
// implementation moved into the shared library.
export { INITIAL_PAUSED, isPauseKey, togglePaused }

/**
 * The frame gate, battlezone's local 4-arg shape. When paused, the sim is frozen
 * — the prior state is returned untouched (the SAME reference: no advance, no
 * mutation), so resume continues deterministically. When active, this is exactly
 * stepGame. Implemented as a delegate over the shared thunk gate: stepGame is
 * passed as the zero-arg thunk so the shared code imports no game sim.
 */
export function stepUnlessPaused(
  game: GameState,
  input: Input,
  dt: number,
  paused: boolean,
): GameState {
  return sharedStepUnlessPaused(() => stepGame(game, input, dt), game, paused)
}
