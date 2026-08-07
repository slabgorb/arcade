// src/core/mode.ts
//
// Story pm1-7 (Julia) — the MODE ENGINE: the scatter/chase/frightened state
// machine, the reverse-on-mode-change signal that feeds every ghost's
// one-step forced reversal (`GhostStepState.forceReverse` in ./ghost.ts), and
// the Cruise Elroy dots-remaining thresholds that bump Blinky's speed.
//
// PURE: no DOM, no wall clock, no Math.random, no timers, no shell import — the
// purity sweep (tests/purity.test.ts) scans this file's source text. The ONLY
// entropy is a seeded `@shared/rng` carried in ModeState (the frightened random
// turn choice), so stepMode stays fully deterministic.
//
// ─── FIDELITY / CITATION STATUS (glossary.md §Modes / §Cruise Elroy) ──────────
// TIMEBASE: the sim runs at 60 Hz, so a Dossier "second" is `× 60` frames.
//
//  • Scatter/chase durations, the frightened time and the flash count are
//    Pac-Man Dossier ch.4 "Chase, Scatter, and Frightened" / Table A.1 figures.
//    They live in ROM as bare, unlabelled level-indexed data tables: `grep`-ing
//    the vendored disassembly for "scatter"/"chase"/"fright"/"elroy" returns
//    ZERO hits (the source is commented only in its boot/RAM-map/scoring/text
//    regions), so there is no isolable `pacman.asm:<addr>` literal to cite.
//    They are recorded honestly as Dossier-decoded and left uncited, the same
//    policy §Speeds / §Ghost movement / §Ghost house already apply.
//
//  • Cruise Elroy IS a real, decodable routine at `pacman.asm:20d7`. It only
//    runs once Clyde has left the house (`20d7 ld a,(#4da3); and a; ret z`),
//    loads TOTAL_PELLETS #f4=244 (`20e6`, already cited), subtracts the running
//    dots-eaten count to get dots-remaining, and compares it against two
//    level-indexed threshold slots read at `20ea ld a,(#4dbb)` (Elroy 1) and
//    `20fd ld a,(#4dbc)` (Elroy 2). Those slots are loaded from a per-level
//    data table — NOT plain `cp #nn` operands — so the level-1 threshold VALUES
//    (20 and 10 dots remaining) carry the same honest-uncited Dossier status as
//    the personal dot limits in §Ghost house; the routine ANCHORS are cited
//    (claims ELROY-CLYDE-GATE / ELROY1-THRESHOLD-SLOT / ELROY2-THRESHOLD-SLOT).
//
//  • The reverse-on-mode-change rule (a ghost reverses for exactly one step on
//    each scatter↔chase transition, AND on frightened ENTRY when an energizer
//    is eaten, but NOT on frightened exit) is Dossier ch.4. This engine's
//    `reverseSignal` fires accordingly; Task 8 wires it into every ghost's
//    `forceReverse` seam.

import { createRng, nextInt, type Rng } from '@shared/rng'
import type { Dir } from './actor'

const SECONDS = 60 // 60 Hz timebase: frames = Dossier-seconds × 60.

export type Mode = 'scatter' | 'chase' | 'frightened'

/** One frame's outcome: the mode this frame is in, and whether a ghost
 *  mode-change reversal is forced this frame (feeds `GhostStepState.forceReverse`). */
export interface ModeStep {
  mode: Mode
  reverseSignal: boolean
}

/** The durable, plain-data mode state threaded through the sim. `phaseIndex` /
 *  `phaseTimer` track position in the scatter/chase schedule; `frightenedTimer`
 *  is the frames of frightened remaining (0 = not frightened). `rng` is the
 *  seeded generator for the frightened random turn choice. */
export interface ModeState {
  level: number
  phaseIndex: number
  phaseTimer: number
  frightenedTimer: number
  rng: Rng
}

/** External per-frame event: an energizer was eaten this frame (triggers /
 *  refreshes frightened mode). */
export interface ModeInput {
  energizerEaten?: boolean
}

export function createModeState(level: number, seed: number): ModeState {
  return { level, phaseIndex: 0, phaseTimer: 0, frightenedTimer: 0, rng: createRng(seed) }
}

// ─── SCATTER / CHASE TIMER TABLE (Dossier ch.4; honest-uncited) ───────────────
// Each row is that level-group's phase durations in FRAMES, alternating
// scatter (even index) / chase (odd index), ending in permanent chase
// (`Infinity`). Level 1 is the value the task pins: 7s,20s,7s,20s,5s,20s,5s,∞.
// Levels 2-4 and 5+ carry the Dossier's documented rows (including the famous
// ~1033s / ~1037s chase and the 1-frame scatter blip) so Task 8's per-level
// lifecycle has them; only level 1 is asserted by the tests.
const SCHEDULE_L1: readonly number[] = [
  7 * SECONDS,
  20 * SECONDS,
  7 * SECONDS,
  20 * SECONDS,
  5 * SECONDS,
  20 * SECONDS,
  5 * SECONDS,
  Infinity,
]
const SCHEDULE_L2_4: readonly number[] = [
  7 * SECONDS,
  20 * SECONDS,
  7 * SECONDS,
  20 * SECONDS,
  5 * SECONDS,
  1033 * SECONDS,
  1, // 1/60 s scatter blip
  Infinity,
]
const SCHEDULE_L5_PLUS: readonly number[] = [
  5 * SECONDS,
  20 * SECONDS,
  5 * SECONDS,
  20 * SECONDS,
  5 * SECONDS,
  1037 * SECONDS,
  1, // 1/60 s scatter blip
  Infinity,
]

/** The scatter/chase phase-duration schedule (frames) for `level` (1-based). */
export function scatterChaseSchedule(level: number): readonly number[] {
  if (level <= 1) return SCHEDULE_L1
  if (level <= 4) return SCHEDULE_L2_4
  return SCHEDULE_L5_PLUS
}

/** Which scatter/chase mode a schedule phase index is: even = scatter, odd = chase. */
export function scheduleModeAt(phaseIndex: number): Mode {
  return phaseIndex % 2 === 0 ? 'scatter' : 'chase'
}

// ─── FRIGHTENED TIME / FLASH COUNT (Dossier Table A.1; honest-uncited) ────────
// Level-1 frightened lasts 6 seconds; the ghost flashes 5 times as it wears
// off. Per-level frightened seconds decrease with level; from level 19 on there
// is no frightened time at all (energizers still score, but never scare). Only
// the level-1 pair (6s / 5 flashes) is task-pinned.
const FRIGHT_SECONDS_BY_LEVEL: readonly number[] = [
  6, 5, 4, 3, 2, 5, 2, 2, 1, 5, 2, 1, 1, 3, 1, 1, 0, 1,
]

/** The number of end-of-frightened flashes (Dossier level-1 figure). The exact
 *  per-frame flash cadence / start-time is a rendering detail decoded in the
 *  shell (Task 8), not a ROM literal, so only the count lives here. */
export const FRIGHT_FLASHES = 5

/** Frightened duration in FRAMES for `level` (1-based). 0 from level 19 on. */
export function frightenedFramesForLevel(level: number): number {
  const idx = level - 1
  const seconds = idx < FRIGHT_SECONDS_BY_LEVEL.length ? FRIGHT_SECONDS_BY_LEVEL[idx] : 0
  return seconds * SECONDS
}

// ─── CRUISE ELROY (pacman.asm:20d7 routine; thresholds Dossier-decoded) ───────
// dots-remaining thresholds by level-group. Level 1: Elroy 1 at 20 dots left,
// Elroy 2 at 10. The progression is the Dossier Table A.1 Elroy column.
interface ElroyThresholds {
  elroy1: number
  elroy2: number
}
function elroyRow(level: number): ElroyThresholds {
  if (level <= 1) return { elroy1: 20, elroy2: 10 }
  if (level === 2) return { elroy1: 30, elroy2: 15 }
  if (level <= 5) return { elroy1: 40, elroy2: 20 }
  if (level <= 8) return { elroy1: 50, elroy2: 25 }
  if (level <= 11) return { elroy1: 60, elroy2: 30 }
  if (level <= 14) return { elroy1: 80, elroy2: 40 }
  if (level <= 18) return { elroy1: 100, elroy2: 50 }
  return { elroy1: 120, elroy2: 60 }
}

/** The Elroy 1 / Elroy 2 dots-remaining thresholds for `level` (1-based). */
export function elroyThresholds(level: number): ElroyThresholds {
  return elroyRow(level)
}

/**
 * Cruise Elroy stage for Blinky given the dots still on the board:
 *   0 = normal, 1 = Elroy 1 (mild speed bump), 2 = Elroy 2 (larger bump).
 * The ROM's compare (`20ed sub b` / `2100 sub b`, `ret c`) engages a stage when
 * `dotsRemaining <= threshold` (borrow does NOT fire at equality), so the
 * boundary is inclusive — Elroy 1 engages AT 20 dots left on level 1, not below.
 *
 * NOTE (Task 8 wiring): the ROM also suppresses Elroy entirely until Clyde has
 * left the house (`pacman.asm:20d7`) and re-suspends it after Pac-Man dies until
 * a ghost next leaves — that gating needs house state and belongs to the caller
 * (Task 8 / the ghost speed logic), not this pure dots→stage function.
 */
export function elroyStage(dotsRemaining: number, level: number): 0 | 1 | 2 {
  const { elroy1, elroy2 } = elroyRow(level)
  if (dotsRemaining <= elroy2) return 2
  if (dotsRemaining <= elroy1) return 1
  return 0
}

/**
 * Advance the mode engine by exactly one frame and return this frame's
 * { mode, reverseSignal }. Mutates `state` (the codebase's step-mutates-state
 * convention, cf. stepGhost). Order of resolution each frame:
 *   1. If an energizer was eaten AND this level has frightened time, enter (or
 *      refresh) frightened. A fresh entry reverses every ghost; a refresh while
 *      already frightened does not. The scatter/chase clock is paused meanwhile.
 *   2. Else if frightened is running, decay it one frame. When it hits zero we
 *      resume the (paused) scatter/chase schedule — with NO reversal on exit.
 *   3. Else advance the scatter/chase schedule; crossing a phase boundary flips
 *      scatter↔chase and fires reverseSignal for that one frame.
 */
export function stepMode(state: ModeState, input: ModeInput = {}): ModeStep {
  // 1. Energizer trigger — enter or refresh frightened.
  if (input.energizerEaten && frightenedFramesForLevel(state.level) > 0) {
    const wasFrightened = state.frightenedTimer > 0
    state.frightenedTimer = frightenedFramesForLevel(state.level)
    return { mode: 'frightened', reverseSignal: !wasFrightened }
  }

  // 2. Frightened decay (scatter/chase clock stays paused).
  if (state.frightenedTimer > 0) {
    state.frightenedTimer -= 1
    if (state.frightenedTimer > 0) return { mode: 'frightened', reverseSignal: false }
    // Just expired this frame → resume scatter/chase, no reversal on exit.
    return { mode: scheduleModeAt(state.phaseIndex), reverseSignal: false }
  }

  // 3. Ordinary scatter/chase advance.
  const schedule = scatterChaseSchedule(state.level)
  const duration = schedule[state.phaseIndex]
  const hasNext = state.phaseIndex < schedule.length - 1
  if (hasNext && Number.isFinite(duration) && state.phaseTimer >= duration) {
    state.phaseIndex += 1
    state.phaseTimer = 1 // this frame is the first of the new phase
    return { mode: scheduleModeAt(state.phaseIndex), reverseSignal: true }
  }
  state.phaseTimer += 1
  return { mode: scheduleModeAt(state.phaseIndex), reverseSignal: false }
}

/**
 * The frightened random turn choice, drawn from the seeded `@shared/rng`.
 * A frightened ghost picks its next direction at random among the walkable,
 * non-reversing `candidates` the caller has already filtered — deterministic
 * for a fixed seed, never `Math.random`. Total: returns 'none' only if handed
 * an empty list (a dead end that never occurs in this maze).
 */
export function frightenedTurn(rng: Rng, candidates: readonly Dir[]): Dir {
  if (candidates.length === 0) return 'none'
  return candidates[nextInt(rng, candidates.length)]
}
