// sw8-11 — the space phase END is TIME-boxed in the ROM, not kill-quota'd.
//
// RULING: PORT. The story's "unrecovered number" is now fully recovered from the
// 1983 source, so the self-described placeholder quota (SPACE_WAVE_QUOTA = 6)
// retires in favour of the ROM mechanism:
//
//   PHISP1 (space init) stamps PH.TIM = 0 (WSMAIN.MAC:1379-1380) — or, while the
//   player is still on the run's FIRST wave (SC.FWV == 0, "0==>STILL ON FIRST
//   WAVE", WSGLOB.MAC:760), PH.TIM = 2*20.-1 = 39 "THEN START A BIT AHEAD"
//   (WSMAIN.MAC:1386-1390). PHESP1 then adds 1 every game frame
//   (WSMAIN.MAC:1415-1417) and walks the music milestones:
//
//     PH.TIM ==  2*20.          =  40   theme (PMTH5 / PMDAR on ROM waves ≥3 odd)
//     PH.TIM ==  2+7+1*20.      = 200   theme B (PMTHB)
//     PH.TIM ==  2+7+1+9+1*20.  = 400   descent music (PMDES)
//     PH.TIM >=  2+7+1+9+1+1*20.= 420   "GO AHEAD AND DESCEND" — PHASE = PH$SP2
//                                       (IFHS, WSMAIN.MAC:1441-1444)
//
//   NOTE the arithmetic: these .MAC sources evaluate STRICTLY LEFT-TO-RIGHT
//   (MACRO-style), so `2+7+1*20.` is (2+7+1)*20 = 200, not 29 — the pattern is
//   "seconds × 20", and the sibling `CMPD #2*20.  ;2 SECONDS` comments at
//   WSMAIN.MAC:2064/2096/2128 ratify the 20 Hz game frame the repo already uses
//   (state.ts POST_HIT_SHIELD_WINDOW note). 420 frames / 20 Hz = 21 s;
//   the first-wave head start is 39/20 = 1.95 s.
//
//   Throughout, the TIE supply refills unconditionally (WV.LIV < 3 → ADASHP,
//   WSMAIN.MAC:1450-1454, ported by sw8-7) — there is NO kill count anywhere in
//   the phase-end path. Kills score; they never advance the phase.
//
// Contract pinned here (Dev implements to this):
//   - state.ts exports SPACE_PHASE_END_S = 21 and SPACE_PHASE_HEAD_START_S = 1.95
//   - state.ts no longer exports SPACE_WAVE_QUOTA (retired, with its consumers)
//   - GameState carries a `phaseTime` clock (seconds since phase entry):
//     accumulated by stepGame, reset to 0 by enterPhase (ROM: every PHIxxx
//     stamps PH.TIM — "NEW PHASE TIMER JUST STARTED", WSMAIN.MAC:2042), seeded
//     to the head start by initialState (run start = the ROM's SC.FWV==0 case)
//   - the space phase advances on the step that reaches phaseTime >= 21 —
//     surface for waves 2+, trench for wave 1 (sw7-18: wave 1 has no ground
//     phase) — via the same progress()/enterPhase warp path (level-clear event)
//   - kills DON'T advance the phase; gameOver still blocks the warp; the
//     surface/trench end conditions are untouched (traversal / exhaust port)
//   - deathStarPlacement's approach progress re-derives from the clock
//     (phaseTime / 21), not from phaseKills
//
// Every premise is pinned to LITERALS (21, 1.95, 6), never to the constants
// under audit — a test that re-derives from the audited constant stays green
// for any value of it (TEA sidecar, tp1-27).

import { describe, it, expect } from 'vitest'
import * as State from '../../src/core/state'
import { initialState, type GameState } from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { deathStarPlacement } from '../../src/shell/render'

/** One ROM game frame (20 Hz) in seconds. */
const DT = 0.05

/** A playing-phase state (initialState opens mode 'playing', phase 'space', wave 1). */
function playing(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState(1), ...overrides }
}

/**
 * A wave-2+ space entry, the clearRun path: enterPhase(…, 'space') — its clock
 * starts at 0 (no head start; the ROM's SC.FWV is ≠0 past the first wave).
 */
function spaceWave2(): GameState {
  return { ...enterPhase(playing(), 'space'), wave: 2 }
}

/**
 * Park the sky so a 21-second idle run is deterministic: no fighters, no
 * incoming fire, and the spawner parked. "A positive timer still parks" is
 * sw8-7's own RED contract, so the park idiom survives the retired countdown.
 */
function parkedSky(s: GameState): GameState {
  return { ...s, enemies: [], enemyShots: [], spawnTimer: 1e9 }
}

/** Read the phase clock without pinning tests to the not-yet-landed field type. */
function phaseTimeOf(s: GameState): number | undefined {
  return (s as GameState & { phaseTime?: number }).phaseTime
}

/**
 * Stage the phase clock at `t` seconds. phaseKills rides along only to anchor
 * the Partial cast until `phaseTime` lands in GameState (RED-transitional; the
 * cast is exact after the fix; the extra key is inert at runtime today).
 */
function withPhaseTime(s: GameState, t: number): GameState {
  return { ...s, ...({ phaseKills: s.phaseKills, phaseTime: t } as Partial<GameState>) }
}

describe('sw8-11 — ROM constants recovered (WSMAIN.MAC:1418-1448)', () => {
  it('exports SPACE_PHASE_END_S = 21 — (2+7+1+9+1+1)*20 = 420 frames at 20 Hz', () => {
    // safe: dynamic probe — the export must EXIST; a missing symbol is the red.
    const mod = State as unknown as Record<string, unknown>
    expect(mod['SPACE_PHASE_END_S']).toBe(21)
  })

  it('exports SPACE_PHASE_HEAD_START_S = 1.95 — 2*20-1 = 39 frames "START A BIT AHEAD" (WSMAIN.MAC:1386-1390)', () => {
    // safe: dynamic probe — the export must EXIST; a missing symbol is the red.
    const mod = State as unknown as Record<string, unknown>
    expect(mod['SPACE_PHASE_HEAD_START_S']).toBe(1.95)
  })

  it('retires SPACE_WAVE_QUOTA — the invented 6-kill gate has no ROM counterpart', () => {
    expect('SPACE_WAVE_QUOTA' in State).toBe(false)
  })
})

describe('sw8-11 — the space phase ends on the clock, not on kills', () => {
  it('wave 2+: still flying space at 20.9s', () => {
    let s = parkedSky(spaceWave2())
    for (let i = 0; i < 418; i++) s = stepGame(s, NO_INPUT, DT) // 418 × 0.05 = 20.9s
    expect(s.phase).toBe('space')
  })

  it('wave 2+: advances to the SURFACE between 20.9s and 21.15s with zero kills, via the normal warp (level-clear)', () => {
    let s = parkedSky(spaceWave2())
    let steps = 0
    while (s.phase === 'space' && steps < 500) {
      s = stepGame(s, NO_INPUT, DT)
      steps++
    }
    expect(s.phase).toBe('surface')
    expect(steps * DT).toBeGreaterThan(20.9)
    expect(steps * DT).toBeLessThanOrEqual(21.15)
    // The crossing step announces the warp exactly like the old path did.
    expect(s.events).toContainEqual({ type: 'level-clear', next: 'surface' })
  })

  it("wave 1: the head start shortens the box — dives to the TRENCH (no ground phase) between 18.9s and 19.2s", () => {
    // initialState IS the run start: the ROM's SC.FWV==0 head-start case.
    let s = parkedSky(playing())
    let steps = 0
    while (s.phase === 'space' && steps < 500) {
      s = stepGame(s, NO_INPUT, DT)
      steps++
    }
    expect(s.phase).toBe('trench') // sw7-18: wave 1 flies space -> trench
    expect(steps * DT).toBeGreaterThan(18.9) // 21 - 1.95 = 19.05s of flight
    expect(steps * DT).toBeLessThanOrEqual(19.2)
  })

  it('a pile of kills alone never ends the phase — the 6-kill quota is retired', () => {
    // 6 is the OLD state.ts literal, staged as a literal on purpose.
    const s0 = { ...parkedSky(spaceWave2()), phaseKills: 6 }
    const s1 = stepGame(s0, NO_INPUT, DT)
    expect(s1.phase).toBe('space')
  })

  it('a dead cockpit never warps: gameOver blocks the time-box advance', () => {
    const s0 = { ...withPhaseTime(parkedSky(spaceWave2()), 21), gameOver: true, lives: 0 }
    expect(stepGame(s0, NO_INPUT, DT).phase).toBe('space')
  })

  it("the box belongs to the SPACE phase: a surface state at 22s still ends by traversal only (sw7-18 / D-019)", () => {
    const surf = withPhaseTime({ ...enterPhase(playing(), 'surface'), wave: 2 }, 22)
    expect(stepGame(surf, NO_INPUT, DT).phase).toBe('surface')
  })
})

describe('sw8-11 — the phase clock is sim state', () => {
  it('a wave-2+ space entry starts the clock at 0, and one 0.05s step advances it one ROM frame', () => {
    const s0 = parkedSky(spaceWave2())
    expect(phaseTimeOf(s0)).toBe(0)
    const s1 = stepGame(s0, NO_INPUT, DT)
    expect(phaseTimeOf(s1)).toBeCloseTo(0.05, 5)
  })

  it('initialState seeds the first-wave head start of 1.95s (SC.FWV==0, WSMAIN.MAC:1386-1390)', () => {
    expect(phaseTimeOf(initialState(1))).toBeCloseTo(1.95, 10)
  })

  it('every phase entry restarts the clock ("NEW PHASE TIMER JUST STARTED", WSMAIN.MAC:2042)', () => {
    const late = withPhaseTime(spaceWave2(), 20)
    expect(phaseTimeOf(enterPhase(late, 'surface'))).toBe(0)
  })
})

describe('sw8-11 — the Death Star approach rides the clock, not the kill count', () => {
  const spaceAt = (t: number, kills = 0): GameState =>
    withPhaseTime({ ...playing(), phase: 'space', wave: 2, phaseKills: kills }, t)

  it('apparent size grows monotonically from 0s to 21s with ZERO kills', () => {
    const apparent = (t: number): number => {
      const p = deathStarPlacement(spaceAt(t))
      const z = Math.abs(p.pos[2])
      expect(z).toBeGreaterThan(0)
      return (p.scale ?? 1) / z
    }
    let prev = apparent(0)
    for (const t of [3.5, 7, 10.5, 14, 17.5, 21]) {
      const cur = apparent(t)
      expect(cur).toBeGreaterThanOrEqual(prev)
      prev = cur
    }
    expect(apparent(21)).toBeGreaterThan(apparent(0)) // strictly bigger by the dive
  })

  it('and is INSENSITIVE to kills: 0 vs 6 phaseKills at the same clock give the identical seat', () => {
    expect(deathStarPlacement(spaceAt(10, 6))).toEqual(deathStarPlacement(spaceAt(10, 0)))
  })
})
