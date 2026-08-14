// tests/accessibility.test.ts
//
// Story ml6-2 (grown runtime) — the ACCESSIBILITY guard. The project owner has
// photosensitive epilepsy, so the standing rule (a hard override of ROM-always-
// wins, baked into the design) is: NO full-screen strobe/flash anywhere — wave,
// death, DDT-explosion and attract transitions are freeze-or-fade, never a
// per-frame flash. That was previously verified only by eye in the browser
// playtest; this pins the freeze-friendly properties as a UNIT guard so a future
// edit cannot silently reintroduce a strobe.

import { describe, it, expect } from 'vitest'
import { stepPlayerDeath, PLAYER_EXPLODE_TIMER } from '../src/core/millipede'
import { PHASES, advancePhase, type GamePhase } from '../src/core/phase'
import { EVENT_KINDS } from '../src/core/events'
import { stepGame, type GameInput } from '../src/core/sim'
import { createGame } from '../src/core/game-state'

const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }

describe('ml6-2 accessibility — no full-screen strobe (photosensitive override)', () => {
  it('the death "flashing" signal is a STEADY block, never a per-frame strobe', () => {
    // Sweep the ENTIRE player-death countdown and collect the flashing signal.
    const flashes: boolean[] = []
    let pexpld = PLAYER_EXPLODE_TIMER
    for (let i = 0; i <= PLAYER_EXPLODE_TIMER && pexpld > 0; i++) {
      const r = stepPlayerDeath(pexpld)
      flashes.push(r.flashing)
      pexpld = r.pexpld
    }
    // A strobe toggles on→off→on. The freeze-friendly signal rises to true at
    // most ONCE (one contiguous block), then never returns.
    let rises = 0
    for (let i = 1; i < flashes.length; i++) if (flashes[i] && !flashes[i - 1]) rises++
    expect(rises, 'flashing must not toggle back on — that is a strobe').toBeLessThanOrEqual(1)
    // And no on/off/on pattern anywhere in the sequence.
    for (let i = 2; i < flashes.length; i++) {
      expect(
        flashes[i - 2] && !flashes[i - 1] && flashes[i],
        `on/off/on strobe at frame ${i}`,
      ).toBe(false)
    }
  })

  it('no phase or transition is a "flash" — the phase union is only steady states', () => {
    // Every (phase, every-signal) transition lands on a real phase; there is no
    // flash/strobe phase or flag the shell could full-screen-strobe on.
    const signalSets = [
      {},
      { startRequested: true },
      { playerDied: true, livesRemaining: 1 },
      { playerDied: true, livesRemaining: 0 },
      { deathExpired: true },
      { overExpired: true },
      { scoreQualifies: true },
      { entryComplete: true },
    ]
    for (const from of PHASES) {
      for (const signals of signalSets) {
        const to: GamePhase = advancePhase(from, signals)
        expect(PHASES).toContain(to)
      }
    }
  })

  it('the death and game-over holds are SILENT — no per-frame cue that could flash', () => {
    // The death animation and the GAME OVER hold emit no events at all, so there
    // is no repeating cue a renderer could turn into a full-screen strobe.
    let g = { ...createGame(0x1982, { phase: 'death' }), deathTimer: 6 }
    for (let i = 0; i < 5; i++) {
      g = stepGame(g, idle)
      expect(g.events, 'death frames are silent').toEqual([])
    }
    let over = { ...createGame(0x1982, { phase: 'game-over' }), delay: 6 }
    for (let i = 0; i < 5; i++) {
      over = stepGame(over, idle)
      expect(over.events, 'game-over frames are silent').toEqual([])
    }
  })

  it('the event vocabulary has no strobe/flash cue', () => {
    for (const kind of EVENT_KINDS) expect(kind).not.toMatch(/flash|strobe/i)
  })
})
