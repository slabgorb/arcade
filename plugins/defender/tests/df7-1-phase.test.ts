// tests/df7-1-phase.test.ts
//
// Story df7-1 — RED phase (Leeloo / TEA). The PURE cabinet phase machine for
// Defender, written BEFORE plugins/defender/src/core/phase.ts exists. df7-1 is the
// ROOT of epic df7 (the spine every other df7 story hangs off — df7-2..7 all wire
// into it). It is the Defender analogue of pac-man's mc/pm4 `phase.ts` and
// missile-command's mc6-1 `state.ts`: a `Phase` union and a pure MAINLINE dispatch
// `advancePhase(phase, signals) -> Phase`, fed boolean signals a caller computes
// from frame-count timers and the sim.
//
// ─── DECISION A (RULED, epic df7 — pure-first / wired-after) ──────────────────────
// The phase machine is a PURE transition function in src/core: no clock, no rAF, no
// entropy, seeded, tested BEFORE the shell wires it. It CONSUMES df5-6's
// isGameOver(men<0, endgame.ts, DEFA7.SRC:1394/1423) as the play->death/game-over
// edge — it does NOT re-implement or re-decide game-over (AC2). purity.test.ts's
// armed src/core sweep covers the new module automatically (AC1/AC4: no browser
// global, no wall clock, no rAF/tick in core).
//
// ─── SCOPE FENCE (mirrors pm4-5 / mc6-1) — CLOCK-FREE AND CONSTANT-FREE ───────────
// df7-1 owns the PURE MACHINE — the Phase type + the transition EDGES. It is
// deliberately constant-free: no magic frame numbers (setup duration, death window,
// game-over timeout) live here, so the cited cadences stay with the stories that own
// them — the setup->play start cadence -> df7-2, the attract auto-player -> df7-3,
// the game-over->attract timeout -> df7-4. Those stories WIRE this machine into the
// running sim; df7-1 changes NO runtime behavior (the existing suites stay green,
// exactly as mc6-1's state.ts and pm4-5's phase.ts were unwired-by-design).
//
// ─── THE MAINLINE, CITED (all lines from tool output; AC3 pins them as claims) ────
// The ROM mainline dispatches the STATUS-word states: ST1 *ONE PLAYER START
// (DEFA7.SRC:1098/1100) and ST2 *TWO PLAYER START (:1110/1112); block-1 attract/hall
// entry is HALLOF (AMODE1.SRC:117/119) with the HALDIS attract/HOF display
// (AMODE1.SRC:377); GAME OVER is GAMEOV (ROMF8.SRC:339). Those citations are
// byte-verified as claims/*.json entries by df7-1-identity.test.ts (the df1-1 gate).
//
// Every test asserts a concrete next-phase; the loop test pins the whole documented
// cabinet cycle attract->setup->play->[pause]->death->game-over->attract, not just
// isolated edges (AC4: a mutation to the transition table reddens a real assertion).

import { describe, it, expect } from 'vitest'
// RED until GREEN creates the module — a bare module-resolution failure here names
// the absent feature (src/core/phase.ts), not a broken test.
import { advancePhase, PHASES, type Phase, type PhaseSignals } from '../src/core/phase.js'
// AC2 imports the REAL df5-6 reducer + df5-3 score model: the machine consumes
// isGameOver's result, it does not recompute men<0.
import { isGameOver } from '../src/core/endgame.js'
import { createScore, loseMan, type ScoreState } from '../src/core/score.js'

// The six cabinet phases the epic's spine names, in lifecycle order. Declared as
// `Phase[]` so this line fails to type-check (npm run lint) until the union exists —
// the type half of the story, enforced by tsc.
const EXPECTED_PHASES: Phase[] = ['attract', 'setup', 'play', 'pause', 'death', 'game-over']

describe('df7-1 (AC1): the Phase union carries the six cabinet phases', () => {
  it('PHASES lists exactly attract/setup/play/pause/death/game-over', () => {
    expect([...PHASES].sort()).toEqual([...EXPECTED_PHASES].sort())
  })
})

describe('df7-1 (AC1): the machine holds unless a real signal fires', () => {
  it('every phase with no signal stays put (the dispatch only moves on an event)', () => {
    for (const p of PHASES) {
      expect(advancePhase(p, {})).toBe(p)
    }
  })
})

describe('df7-1: attract --(start/coin)--> setup', () => {
  it('a start request advances attract to setup (ST1/ST2 *PLAYER START)', () => {
    expect(advancePhase('attract', { startRequested: true })).toBe('setup')
  })
  it('attract ignores every non-start signal (timers belonging to other phases)', () => {
    const irrelevant: PhaseSignals = {
      setupComplete: true,
      deathComplete: true,
      overTimeout: true,
      resumeRequested: true,
    }
    expect(advancePhase('attract', irrelevant)).toBe('attract')
  })
})

describe('df7-1: setup --(setup done)--> play', () => {
  it('setup completing advances setup to play (df7-2 owns the cadence)', () => {
    expect(advancePhase('setup', { setupComplete: true })).toBe('play')
  })
  it('an unfinished setup holds in setup', () => {
    expect(advancePhase('setup', { setupComplete: false })).toBe('setup')
  })
})

describe('df7-1 (AC2): play exits — the isGameOver(men<0) edge is CONSUMED, not re-decided', () => {
  // The signal carries the RESULT of df5-6 isGameOver; the machine reads it, it does
  // not look at `men` itself. Build the men<0 / men>=0 states with the real reducer.
  const menBelowLastShip: ScoreState = [0, 1, 2, 3].reduce<ScoreState>((s) => loseMan(s), createScore()) // 3 - 4 = -1
  const lastShipStanding: ScoreState = [0, 1, 2].reduce<ScoreState>((s) => loseMan(s), createScore()) // 3 - 3 = 0

  it('the -1 / 0 fixtures are exactly the isGameOver boundary (guards the fixture, lang-review #18)', () => {
    expect(menBelowLastShip.men).toBe(-1)
    expect(isGameOver(menBelowLastShip)).toBe(true)
    expect(lastShipStanding.men).toBe(0)
    expect(isGameOver(lastShipStanding)).toBe(false)
  })

  it('a death with men<0 (isGameOver true) goes straight to game-over', () => {
    expect(advancePhase('play', { playerDied: true, gameOver: isGameOver(menBelowLastShip) })).toBe('game-over')
  })

  it('a death with a ship still standing (isGameOver false) enters the death beat, NOT game-over', () => {
    expect(advancePhase('play', { playerDied: true, gameOver: isGameOver(lastShipStanding) })).toBe('death')
  })

  it('a death with NO gameOver signal is a survivable death (defaults to the death beat)', () => {
    // gameOver omitted === falsy: the edge only reaches game-over when isGameOver said so.
    expect(advancePhase('play', { playerDied: true })).toBe('death')
  })

  it('the same death frame decides game-over ONLY on the men<0 result and not otherwise', () => {
    expect(advancePhase('play', { playerDied: true, gameOver: true })).toBe('game-over')
    expect(advancePhase('play', { playerDied: true, gameOver: false })).toBe('death')
  })
})

describe('df7-1: play <--> pause (the modal [pause] aside; a live death outranks it)', () => {
  it('a pause request suspends a live game', () => {
    expect(advancePhase('play', { pauseRequested: true })).toBe('pause')
  })
  it('a resume request returns pause to play', () => {
    expect(advancePhase('pause', { resumeRequested: true })).toBe('play')
  })
  it('you cannot pause into a death — a death on the same frame wins over a pause request', () => {
    expect(advancePhase('play', { playerDied: true, gameOver: false, pauseRequested: true })).toBe('death')
    expect(advancePhase('play', { playerDied: true, gameOver: true, pauseRequested: true })).toBe('game-over')
  })
  it('pause ignores signals meant for other phases and holds', () => {
    expect(advancePhase('pause', { startRequested: true, setupComplete: true, overTimeout: true })).toBe('pause')
  })
})

describe('df7-1: death --(death beat done)--> setup (the surviving-ship respawn)', () => {
  it('the death beat completing routes back through setup for the next ship', () => {
    expect(advancePhase('death', { deathComplete: true })).toBe('setup')
  })
  it('an unfinished death beat holds in death', () => {
    expect(advancePhase('death', { deathComplete: false })).toBe('death')
  })
})

describe('df7-1 (AC4 example): game-over --(timeout)--> attract closes the MAINLINE loop', () => {
  it('the game-over timeout expiring returns to attract (df7-4 pins the cadence)', () => {
    expect(advancePhase('game-over', { overTimeout: true })).toBe('attract')
  })
  it('an unexpired game-over timeout holds in game-over', () => {
    expect(advancePhase('game-over', { overTimeout: false })).toBe('game-over')
  })
})

describe('df7-1 (AC1/AC4): advancePhase is a pure, deterministic, clock-free function', () => {
  it('does not mutate its signals argument (accepts a frozen object)', () => {
    const frozen = Object.freeze<PhaseSignals>({ playerDied: true, gameOver: false })
    // Would throw in strict mode if the machine tried to write to `signals`.
    expect(() => advancePhase('play', frozen)).not.toThrow()
    expect(advancePhase('play', frozen)).toBe('death')
  })
  it('is deterministic for identical inputs (no clock, no entropy — the shell drives it, not a tick)', () => {
    const sig: PhaseSignals = { setupComplete: true }
    expect(advancePhase('setup', sig)).toBe(advancePhase('setup', sig))
  })
})

describe('df7-1 (AC4): the edges compose into the documented cabinet loop', () => {
  it('drives attract -> setup -> play -> [pause -> play] -> death -> setup -> play -> game-over -> attract', () => {
    let p: Phase = 'attract'
    p = advancePhase(p, { startRequested: true })
    expect(p).toBe('setup')
    p = advancePhase(p, { setupComplete: true })
    expect(p).toBe('play')
    // the modal pause aside off play, then back
    p = advancePhase(p, { pauseRequested: true })
    expect(p).toBe('pause')
    p = advancePhase(p, { resumeRequested: true })
    expect(p).toBe('play')
    // a survivable death: a ship remains (isGameOver false) -> death beat -> respawn via setup
    p = advancePhase(p, { playerDied: true, gameOver: false })
    expect(p).toBe('death')
    p = advancePhase(p, { deathComplete: true })
    expect(p).toBe('setup')
    p = advancePhase(p, { setupComplete: true })
    expect(p).toBe('play')
    // the terminal death: men<0 (isGameOver true) -> game-over
    p = advancePhase(p, { playerDied: true, gameOver: true })
    expect(p).toBe('game-over')
    p = advancePhase(p, { overTimeout: true })
    expect(p).toBe('attract')
  })
})
