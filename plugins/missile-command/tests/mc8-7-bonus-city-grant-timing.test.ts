// plugins/missile-command/tests/mc8-7-bonus-city-grant-timing.test.ts
//
// Story mc8-7 — RED phase (Han Solo / TEA). "Bonus-city cue timing."
//
// mc8-4 wired the BN/SBONUS bonus-city cue into `playEdgeCues`, but keyed it to the
// WRONG edge: it fires the frame the running SCORE crosses a bonus-city threshold
// (`bonusCitiesEarned(curr.score) > bonusCitiesEarned(prev.score)`), which happens
// DURING PLAY the instant a kill banks the points. The ROM sounds BN at W3MAIN:4845 —
// the wave-end regeneration step, where the city is actually GRANTED (CHEKBO increments
// PLIVES, REGEN revives it up to min(PLIVES, NCITY)). A kill that crosses the threshold
// mid-wave can therefore sound the cue ~a whole wave early.
//
// This file is the AUTHORITATIVE contract for WHEN the player hears the bonus-city cue.
// The now-refuted mc8-4 AC3 tests (which asserted the mid-play crossing SHOULD fire)
// have been retired from mc8-4-event-wiring.test.ts and are superseded here.
//
// RED strategy: `playEdgeCues` already exists and compiles, so the RED signal is at the
// ASSERTION level, not a module load. Crucially, the "a grant fires the cue" case is
// driven through the REAL `stepGame` wave-end (the mc4-5 `betweenState` idiom) — the
// simulation itself decides what "a bonus city was granted" means (alive cities rise as
// the bonus recovers a loss), and we only assert the CUE accompanies it. That keeps the
// test agnostic to HOW Dev detects the grant off the (prev, curr) pair.
//
//   Current code → RED here:
//     • the mid-play crossing FIRES     (must NOT)            → test 1 fails today
//     • the real wave-end grant does NOT fire (must fire once) → test 2 fails today

import { describe, it, expect } from 'vitest'
import { playEdgeCues } from '../src/shell/audio-dispatch.js'
import { createGame, stepGame, startGame, type GameState } from '../src/core/game.js'
import { bonusInterval } from '../src/core/wave.js'
import { START_CITIES } from '../src/core/field.js'

/** A recording fake of the audio surface — captures every call, in order. (mc8-2 idiom.) */
function recorder() {
  const calls: string[] = []
  return {
    calls,
    audio: {
      play(name: string): void {
        calls.push(`play:${name}`)
      },
      startLoop(name: string): void {
        calls.push(`startLoop:${name}`)
      },
      stopLoop(name: string): void {
        calls.push(`stopLoop:${name}`)
      },
    },
  }
}

const bonusCalls = (calls: readonly string[]) => calls.filter((c) => c === 'play:bonus-city')
const aliveCities = (s: GameState): number => s.cities.filter((c) => c.alive).length

// A wave-end ('between') frame with `deadCount` dead cities, cumulative `citiesLost`,
// and a running `score`. One `stepGame` runs the REAL regen path (mc4-5 idiom): the
// reserve is START_CITIES − citiesLost + bonusCitiesEarned(score), capped at NCITY.
type BonusState = GameState & { readonly citiesLost: number }
const betweenState = (deadCount: number, citiesLost: number, score: number): BonusState => {
  const base = createGame(1)
  return {
    ...base,
    phase: 'between',
    score,
    citiesLost,
    cities: base.cities.map((c, i) => (i < deadCount ? { ...c, alive: false } : c)),
  } as BonusState
}

const interval = bonusInterval(0) // shipped default DIP: 10,000 pts / city (mc4-5)

// ═══════════════════════════════════════════════════════════════════════════════
// AC1 — the cue must NOT fire on the mid-play score-threshold crossing
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-7 — no bonus-city cue on the mid-play threshold crossing', () => {
  it('a kill that crosses a bonus threshold DURING PLAY (same wave) plays NO bonus-city cue', () => {
    const r = recorder()
    // Two consecutive PLAY frames, same wave: the score climbs from just below one
    // 10k interval to just above it — exactly the moment a kill banks the crossing.
    const prev: GameState = { ...createGame(1), phase: 'play', score: interval - 1 }
    const curr: GameState = { ...prev, score: interval + 1 }
    playEdgeCues(r.audio, prev, curr)
    // The ROM grants (and sounds) the city between waves, not here. Current code fires.
    expect(bonusCalls(r.calls), 'mid-play crossing must be silent — the grant is at wave-end').toHaveLength(0)
  })

  it('a mid-play crossing of a HIGHER interval is also silent (not just the first)', () => {
    const r = recorder()
    const prev: GameState = { ...createGame(1), phase: 'play', score: 3 * interval - 1 }
    const curr: GameState = { ...prev, score: 3 * interval + 1 }
    playEdgeCues(r.audio, prev, curr)
    expect(bonusCalls(r.calls)).toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC1/AC2 — the cue fires exactly once when a city is GRANTED at the wave-end regen
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-7 — bonus-city cue on the wave-end grant', () => {
  it('a real wave-end grant (bonus recovers a lost city) plays the bonus-city cue exactly once', () => {
    const r = recorder()
    // Sitting at exactly one 10k interval with one city lost this game: the wave-end
    // reserve is 6 − 1 + 1 = 6, so REGEN revives the lost city. That revival IS the grant.
    const prev = betweenState(1, 1, interval)
    const curr = stepGame(prev)

    // Guard the fixture: the sim really granted a city at this transition.
    expect(prev.phase, 'fixture: prev is the wave-end beat').toBe('between')
    expect(curr.phase, 'fixture: the beat resolves back to play').toBe('play')
    expect(curr.wave, 'fixture: this is a wave transition').toBeGreaterThan(prev.wave)
    expect(aliveCities(curr), 'fixture: the bonus recovered the lost city (5 → 6)').toBe(START_CITIES)
    expect(aliveCities(curr)).toBeGreaterThan(aliveCities(prev))

    playEdgeCues(r.audio, prev, curr)
    expect(bonusCalls(r.calls), 'the granted city sounds BN once').toHaveLength(1)
    // Sanity: this is a genuine wave advance, so the whoop cue rides the same edge —
    // proves the fixture is a real transition, not a hand-forged pair.
    expect(r.calls.filter((c) => c === 'play:whoop'), 'the wave-advance whoop still fires').toHaveLength(1)
  })

  it('the grant cue fires ONCE, not again on the next in-wave frame', () => {
    const r = recorder()
    const granted = stepGame(betweenState(1, 1, interval)) // the frame the city was granted
    const nextFrame: GameState = { ...granted, frame: granted.frame + 1 } // ordinary play frame
    playEdgeCues(r.audio, granted, nextFrame)
    expect(bonusCalls(r.calls), 'no re-announce after the grant frame').toHaveLength(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Mutation guard — a wave transition with NO bonus earned must stay silent. Catches a
// naive "fire bonus-city whenever the wave advances" (whoop's edge) mis-fix.
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-7 — a bonus-free wave-end is silent (not keyed on wave++ alone)', () => {
  it('advancing a wave with no bonus earned and no city granted plays NO bonus-city cue', () => {
    const r = recorder()
    // No losses, score below the first interval: reserve = 6, nothing regenerated.
    const prev = betweenState(0, 0, interval - 5_000)
    const curr = stepGame(prev)
    expect(curr.wave, 'fixture: the wave still advances').toBeGreaterThan(prev.wave)
    expect(aliveCities(curr), 'fixture: no city was granted').toBe(aliveCities(prev))
    playEdgeCues(r.audio, prev, curr)
    expect(bonusCalls(r.calls), 'a wave advance is not a grant — only whoop fires').toHaveLength(0)
    expect(r.calls.filter((c) => c === 'play:whoop'), 'whoop still rides the wave edge').toHaveLength(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// Regression guard (Reviewer #14) — a NEW-GAME RESTART also raises the alive-city count
// (0 → 6) but is NOT a wave-end grant. `startGame` resets to a fresh wave-1 game, so the
// cue must stay silent. This makes playEdgeCues self-correct off ANY (prev, curr) pair,
// not merely the ones main.ts's frame loop happens to feed — matching the WHOOP edge,
// which is already wave-gated. RED before the mc8-7 wave-gate landed (the bare alive-delta
// fired here); GREEN after.
// ═══════════════════════════════════════════════════════════════════════════════
describe('mc8-7 — a new-game restart is silent (not a wave-end grant)', () => {
  it('restarting from game-over (all cities dead) into a fresh game plays NO bonus-city cue', () => {
    const r = recorder()
    // A terminal state at a later wave with every city destroyed (alive 0).
    const over: GameState = {
      ...createGame(1),
      phase: 'over',
      wave: 3,
      cities: createGame(1).cities.map((c) => ({ ...c, alive: false })),
    }
    const fresh = startGame(over) // the real restart path: fresh wave-1 game, 6 alive
    // Guard the fixture: the alive count really jumps up, but the wave resets DOWN.
    expect(aliveCities(fresh), 'fixture: a fresh game brings the board back to full').toBeGreaterThan(
      aliveCities(over),
    )
    expect(fresh.wave, 'fixture: restart resets the wave (no wave advance)').toBeLessThan(over.wave)
    playEdgeCues(r.audio, over, fresh)
    expect(bonusCalls(r.calls), 'a new game is not a bonus grant — stay silent').toHaveLength(0)
  })
})
