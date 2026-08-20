// tests/core/pt1-9.select-bonus-paid.test.ts
//
// Story pt1-9, AC2 — SINGLE SOURCE OF TRUTH for the start-level bonus.
//
// The select screen must SHOW the bonus that starting at the chosen level will
// PAY. The render side draws startWaveBonus(selectedLevel) (pinned by
// tests/shell/pt1-9.select-preview-bonus.test.ts); THIS suite pins the PAID side
// against the live sim: for a level chosen in the real framing flow, the wave
// bonus actually awarded equals the ROM-cited ladder value for that level — and
// equals startWaveBonus(level), the same function the render reads. So the shown
// number and the paid number are the same value by construction, for every level
// the chooser offers.
//
// The ladder magnitudes below are the derived-and-cited ROM values (BONPTM,
// ALWELG.MAC:266-277; the first 8 skill steps = START_WAVE_BONUS_LADDER in
// rules.ts). They are PINNED AS LITERALS here — a characterization against the
// cited constant, not a re-derivation from our own code — so a wrong ladder
// reddens this even if startWaveBonus and the paid path drift together.
//
// This is the paid-side regression anchor: the payment already works (tp1-13),
// so it is green on arrival. Its job is to lock shown==paid so a later change to
// either side cannot silently split them.
import { describe, it, expect } from 'vitest'
import type { GameState } from '../../src/core/state'
import { initialState } from '../../src/core/state'
import type { GameEvent } from '../../src/core/events'
import { stepGame } from '../../src/core/sim'
import type { Input } from '../../src/core/input'
import { startWaveBonus } from '../../src/core/rules'

const DT = 1 / 60
const NEUTRAL: Input = { spin: 0, fire: false, zap: false, start: false }
const START: Input = { ...NEUTRAL, start: true }
const SPIN_UP: Input = { ...NEUTRAL, spin: 1 }

// step = floor((level-1)/2), clamp 0..7 → the ROM BONPTM ladder value (×1, points).
// Pinned literals, keyed by the level the chooser offers.
const EXPECTED_BONUS: Record<number, number> = {
  1: 0,        // step 0 — a wave-1 start pays nothing (ENDWAV's IFNE gate)
  3: 6_000,    // step 1
  5: 16_000,   // step 2
  16: 114_000, // step 7 (the top of our contiguous 1..16 chooser)
}

function eventsOfType<T extends GameEvent['type']>(
  events: readonly GameEvent[], type: T,
): Extract<GameEvent, { type: T }>[] {
  return events.filter((e): e is Extract<GameEvent, { type: T }> => e.type === type)
}

// Drive the REAL framing flow: attract -> (start) -> select -> (spin up to
// `level`) -> (start) -> playing at `level`, exactly as tp1-34 does.
function startAtLevel(level: number, seed = 7): GameState {
  let s = initialState(seed)
  s.mode = 'attract'
  s = stepGame(s, START, DT)
  expect(s.mode, 'start on the title must open level select').toBe('select')
  for (let i = 1; i < level; i++) s = stepGame(s, SPIN_UP, DT)
  expect(s.select.selectedLevel, `chooser must reach level ${level}`).toBe(level)
  s = stepGame(s, START, DT)
  expect(s.mode).toBe('playing')
  expect(s.level).toBe(level)
  return s
}

// A clean, threat-free dive to the next wave — the arrival that pays the pending
// start bonus (beginFlyIn). Returns every event seen along the way.
function diveSuccessfully(s: GameState, bound = 3000): { state: GameState; events: GameEvent[] } {
  s.enemies = []
  s.spawn = { nymphs: [] }
  s.bullets = []
  s.enemyBullets = []
  s.spikes = s.spikes.map(() => 0)
  const levelBefore = s.level
  const events: GameEvent[] = []
  let enteredWarp = false
  let steps = 0
  while (steps < bound) {
    s = stepGame(s, NEUTRAL, DT)
    events.push(...s.events)
    steps++
    if (s.mode === 'warp') enteredWarp = true
    if (enteredWarp && s.mode === 'playing') break
  }
  expect(enteredWarp, 'staging: an empty, spike-free board must enter the warp').toBe(true)
  expect(s.level, 'a clean dive advances exactly one wave').toBe(levelBefore + 1)
  return { state: s, events }
}

describe('pt1-9 AC2 — the bonus paid for a chosen level equals the cited ladder (== what select shows)', () => {
  for (const [levelStr, expected] of Object.entries(EXPECTED_BONUS)) {
    const level = Number(levelStr)

    it(`level ${level}: startWaveBonus(${level}) is the cited ladder value ${expected}`, () => {
      // The function the RENDER reads returns the cited ladder value — so the
      // number shown at select is exactly `expected`.
      expect(startWaveBonus(level)).toBe(expected)
    })

    if (expected > 0) {
      it(`level ${level}: starting there PAYS exactly ${expected} (one wave-bonus, matching the shown value)`, () => {
        const s = startAtLevel(level)
        expect(s.score, 'a fresh advanced start scores 0 until the bonus is paid').toBe(0)
        const dive = diveSuccessfully(s)
        const bonuses = eventsOfType(dive.events, 'wave-bonus')
        expect(bonuses, 'exactly one wave-bonus on the arrival').toHaveLength(1)
        expect(bonuses[0].points, 'paid points == the cited ladder value').toBe(expected)
        expect(bonuses[0].points, 'paid points == startWaveBonus(selectedLevel), the value select shows')
          .toBe(startWaveBonus(level))
        expect(dive.state.score, 'the score reflects exactly that one payment').toBe(expected)
      })
    } else {
      it(`level ${level}: starting there pays NOTHING (no wave-bonus, no chime)`, () => {
        const s = startAtLevel(level)
        const dive = diveSuccessfully(s)
        expect(eventsOfType(dive.events, 'wave-bonus'), 'a wave-1 start pays no bonus').toHaveLength(0)
        expect(dive.state.score, 'no bonus paid for a wave-1 start').toBe(0)
      })
    }
  }
})
