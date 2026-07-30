// tests/support/select.ts
//
// Shared helpers for the SELECT-A-DEATH-STAR screen (story sw9-2). The cabinet
// boots attract → SELECT-A-DEATH-STAR → play (PHISG1 → PH$SDS → PH$SG2,
// WSMAIN.MAC:1289/1017/1054); the clone's attract+start edge now opens the
// picker instead of jumping straight into a wave-1 run.
//
// THE SINGLE COUPLING POINT. The RED suites and the re-seated sibling suites both
// drive the picker through THIS file, so the exact GameState shape Dev lands in
// GREEN (`SelectState`, `DEATH_STAR_CHOICES`, `START_WAVE_BONUS`) is named once
// here. The new exports are read through a namespace CAST — pre-GREEN they are
// `undefined`, so a suite that uses them fails LOCALLY (a clean missing-feature
// RED), and this module still LOADS (no top-level access, no module-load crash).

import { initialState, type GameState } from '../../src/core/state'
import * as stateMod from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'

/** The shape of one Death Star on the picker. `wave` is the clone's 1-based
 *  starting wave (romWave0 = wave-1); `bonus` is the banked start bonus; `aim` is
 *  the normalised yoke position that hovers it. */
export interface DeathStarChoice {
  label: string
  wave: number
  bonus: number
  aim: readonly [number, number]
}

/** The three shipped choices (EASY/MEDIUM/HARD → GM.WAV 0/2/4). Absent pre-GREEN
 *  → `undefined`; callers reach for it only after asserting the select mode, so a
 *  clean behavioural RED fires first. */
export function choices(): readonly DeathStarChoice[] {
  return (stateMod as unknown as { DEATH_STAR_CHOICES?: readonly DeathStarChoice[] })
    .DEATH_STAR_CHOICES as readonly DeathStarChoice[]
}

/** The full ROM `TSCBN` bonus table indexed by 0-based ROM wave, or `undefined`
 *  pre-GREEN. */
export function startWaveBonus(): readonly number[] {
  return (stateMod as unknown as { START_WAVE_BONUS?: readonly number[] })
    .START_WAVE_BONUS as readonly number[]
}

/** The armed countdown length in seconds (ROM PH.TIM = 0x100 frames / TICK_HZ),
 *  or `undefined` pre-GREEN. */
export function countdownSeconds(): number {
  return (stateMod as unknown as { SELECT_COUNTDOWN_SECONDS?: number })
    .SELECT_COUNTDOWN_SECONDS as number
}

/** The live countdown remaining on a select-mode state (or `undefined`). Read
 *  through a cast so this file loads before Dev adds `state.select`. */
export function countdownOf(s: GameState): number | undefined {
  return (s as unknown as { select?: { countdown: number } }).select?.countdown
}

/** The currently-hovered choice index (or `null`) on a select-mode state. */
export function hoverOf(s: GameState): number | null | undefined {
  return (s as unknown as { select?: { hover: number | null } }).select?.hover
}

export const SELECT_DT = 1 / 60

/** attract + start → the SELECT screen (one step). Pre-GREEN this returns a
 *  `playing` state (startRun unchanged), so the caller's `mode === 'select'`
 *  assertion is the RED. */
export function enterSelect(seed = 1983): GameState {
  const attract: GameState = { ...initialState(seed), mode: 'attract' }
  return stepGame(attract, { ...NO_INPUT, start: true }, SELECT_DT)
}

/** From a select-mode state, fire over choice `i` → the run-begin step (the edge
 *  that banks the bonus, sets the wave, and emits the run-start cues). */
export function fireAtChoice(sel: GameState, i: number, dt = SELECT_DT): GameState {
  const c = choices()[i]
  const input: Input = { aimX: c.aim[0], aimY: c.aim[1], fire: true }
  return stepGame(sel, input, dt)
}

/** attract → select → fire choice `i` → the playing run, in one call. */
export function beginRunAt(i: number, seed = 1983): GameState {
  return fireAtChoice(enterSelect(seed), i)
}
