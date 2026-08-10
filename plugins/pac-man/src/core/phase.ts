// src/core/phase.ts
//
// pm4-5 — the pure cabinet phase machine (the ROOT of epic pm4; pm4-6/7/8/10 all
// build on it). It is the Pac-Man analogue of missile-command's mc6-1 `state.ts`
// skeleton: the extended `GamePhase` type lives in game.ts, and this module holds
// the pure MAINLINE dispatch that mirrors the ROM's master-state byte `#4e00`.
//
// In the ROM the whole cabinet lifecycle keys off master-state byte #4e00: the
// mainline READS it and branches (`pacman.asm:0195` — `ld a,(#4e00)`), and each
// transition WRITES it (`pacman.asm:0984`/`:269a`/`:318c` — `ld (#4e00),a`).
// `advancePhase` is that read-branch-and-write, expressed as a pure function of
// the current phase and a set of boolean signals a caller derives from
// frame-count timers — so this module is clock-free, entropy-free and, by
// design, CONSTANT-free: no cadence lives here. The cited frame constants and the
// side effects each edge triggers belong to the stories that own them:
//   • ready timer + start-input reseed          → pm4-6
//   • dying / level-clear freeze + death window  → pm4-7 (also sets level+1)
//   • attract auto-player                        → pm4-8
//   • game-over→attract timeout constant + main  → pm4-10
// Those stories wire this machine into `stepGame`; pm4-5 changes no runtime.

import type { GamePhase } from './game'

/** The six cabinet phases, in lifecycle order. The single runtime list of the
 *  `GamePhase` union — iterate this rather than re-typing the string literals. */
export const PHASES: readonly GamePhase[] = [
  'attract',
  'ready',
  'playing',
  'dying',
  'level-clear',
  'game-over',
] as const

/** The events that can move the machine on a given frame. All optional: an empty
 *  bag means "nothing happened, hold this phase". A caller computes these from
 *  the frame-count timers and the sim (`livesRemaining` is the life count AFTER
 *  the death is applied). Timer booleans are named for the phase they end. */
export interface PhaseSignals {
  /** attract/game-over: a start or coin was pressed (pm4-6 feeds the real input). */
  startRequested?: boolean
  /** ready: the READY! hold has elapsed (pm4-6 owns the frame constant). */
  readyExpired?: boolean
  /** dying: the death-animation hold has elapsed (pm4-7 owns the window). */
  deathExpired?: boolean
  /** level-clear: the clear/freeze hold has elapsed (pm4-7 owns the cadence). */
  clearExpired?: boolean
  /** game-over: the attract-return timeout has elapsed (pm4-10 owns the constant). */
  overExpired?: boolean
  /** playing: Pac-Man was caught this frame. */
  pacDied?: boolean
  /** playing: the last dot was eaten this frame. */
  allDotsEaten?: boolean
  /** playing: lives remaining AFTER the death is applied (decides dying vs game-over). */
  livesRemaining?: number
}

/** The MAINLINE dispatch: given the current phase and this frame's signals,
 *  return the next phase. Pure — reads only its arguments, mutates nothing,
 *  touches no clock or RNG (mirrors the ROM's `ld a,(#4e00)` read-branch at
 *  `pacman.asm:0195` and the `ld (#4e00),a` writes at `:0984`/`:269a`/`:318c`).
 *
 *  In `playing`, a death takes precedence over a level clear on the same frame —
 *  `stepGame` resolves the Pac/ghost collision before the all-dots check, so if
 *  both land together the death wins. */
export function advancePhase(phase: GamePhase, signals: PhaseSignals): GamePhase {
  switch (phase) {
    case 'attract':
      return signals.startRequested ? 'ready' : 'attract'
    case 'ready':
      return signals.readyExpired ? 'playing' : 'ready'
    case 'playing':
      if (signals.pacDied) return (signals.livesRemaining ?? 0) > 0 ? 'dying' : 'game-over'
      if (signals.allDotsEaten) return 'level-clear'
      return 'playing'
    case 'dying':
      return signals.deathExpired ? 'ready' : 'dying'
    case 'level-clear':
      return signals.clearExpired ? 'ready' : 'level-clear'
    case 'game-over':
      return signals.overExpired ? 'attract' : 'game-over'
  }
}
