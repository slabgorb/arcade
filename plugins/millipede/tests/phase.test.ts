// tests/phase.test.ts
//
// Story ml7-1 (RED, TEA / Han Solo) — the pure Millipede cabinet phase machine,
// written BEFORE src/core/phase.ts exists. This is the pm4-5 model
// (plugins/pac-man/src/core/phase.ts): a pure MAINLINE dispatch
// `advancePhase(phase, signals) -> nextPhase`, fed boolean signals a caller
// derives from frame-count timers and the sim. It is clock-free, entropy-free and,
// by design, CONSTANT-FREE — no cadence lives here (the frame constants belong to
// the wiring story ml7-2), so like missile-command's state.ts it carries no claim.
//
// The ROM lifecycle keys off MODE / the attract state machine in MLATR:
//   • ATTRACT MODE ACTION            — MLATR.MAC:21   (the MODEFF dispatcher)
//   • MODE FE, INITIALIZATION        — MLATR.MAC:126  (INITFE)
//   • MODE FF (attract execute)      — MLATR.MAC:313  (BOXSFF)
// (ROM line numbers live in // comments, never JSDoc — the millipede purity /
// citation scanners strip // but not /** */.)
//
// SCOPE FENCE (mirrors pm4-5 / missile-command mc6-1's pure state.ts skeleton):
//   ml7-1 owns the PURE MACHINE — the `GamePhase` type + the transition EDGES.
//   It is UNWIRED: nothing here touches stepGame, render, audio, or input. The
//   runtime wiring (frame loop -> stepGame, input, render/audio, the ml6 sound
//   driver) is ml7-2; the full accessibility gate (no full-screen strobe/flash on
//   any transition — the owner has photosensitive epilepsy) is ml7-4. ml7-1 keeps
//   the transition seam clean so ml7-4 has a home, but ships no render, so there is
//   nothing strobe-related to assert at this pure-core layer.
//
// The five cabinet phases (title: "attract/play/death/game-over" + the ml5
// name-entry route):
//   attract -(start)-> play -(life lost, lives>0)-> death -(death hold)-> play
//                          \-(life lost, lives==0)-> game-over
//   game-over -(final score qualifies)-> entry -(initials committed)-> attract
//   game-over -(attract-return timeout, not qualifying)-> attract
// `scoreQualifies` is what the caller computes from millipede's own
// `qualifiesForHighScore(table, score)` (core/highscore.ts:69); routing a
// QUALIFYING game-over into the ml5 name-entry phase is the story's headline edge.
//
// forcePhase / TS2367: the title directs Dev to route transitions through a
// `forcePhase` helper because a bare phase-literal assignment reds tsc with TS2367.
// That is a TYPE-launder with no observable RUNTIME behavior, so there is
// deliberately NO runtime forcePhase assertion here (it would be vacuous — TEA
// rule against always-true tests); its gate is `npm run lint` (tsc --noEmit). The
// type-extension test below (EXPECTED_PHASES typed `GamePhase[]`) is what fails the
// type check until the union exists, giving this suite compile-time teeth too.

import { describe, it, expect } from 'vitest'
import { advancePhase, PHASES, type GamePhase, type PhaseSignals } from '../src/core/phase'

// The five cabinet phases the story names. Declared as `GamePhase[]` so this line
// fails to type-check (npm run lint) until the union is declared exactly this wide
// — the type half of the story, enforced by tsc, not just by the runtime asserts.
const EXPECTED_PHASES: GamePhase[] = ['attract', 'play', 'death', 'game-over', 'entry']

describe('ml7-1: GamePhase carries the five cabinet phases', () => {
  it('PHASES lists exactly attract/play/death/game-over/entry', () => {
    expect([...PHASES].sort()).toEqual([...EXPECTED_PHASES].sort())
  })
})

describe('ml7-1: the machine holds unless a real signal fires', () => {
  it('every phase with no signal stays put (the dispatch only moves on an event)', () => {
    for (const p of PHASES) {
      expect(advancePhase(p, {})).toBe(p)
    }
  })
})

describe('ml7-1: attract --(start/coin)--> play (MLATR.MAC:21/126/313)', () => {
  it('a start request advances attract to play', () => {
    expect(advancePhase('attract', { startRequested: true })).toBe('play')
  })
  it('attract ignores every non-start signal (timers belonging to other phases)', () => {
    const irrelevant: PhaseSignals = {
      deathExpired: true,
      overExpired: true,
      scoreQualifies: true,
      entryComplete: true,
    }
    expect(advancePhase('attract', irrelevant)).toBe('attract')
  })
})

describe('ml7-1: play exits on a lost life (death vs game-over by lives remaining)', () => {
  it('a lost life with lives remaining enters death (respawn pending)', () => {
    expect(advancePhase('play', { playerDied: true, livesRemaining: 2 })).toBe('death')
  })
  it('a lost life with no lives left goes straight to game-over', () => {
    expect(advancePhase('play', { playerDied: true, livesRemaining: 0 })).toBe('game-over')
  })
  it('an absent livesRemaining is treated as none left (game-over, never a stuck death loop)', () => {
    expect(advancePhase('play', { playerDied: true })).toBe('game-over')
  })
  it('play holds while no life is lost', () => {
    expect(advancePhase('play', { playerDied: false })).toBe('play')
  })
  it('play ignores signals meant for other phases and stays playing', () => {
    expect(advancePhase('play', { startRequested: true, deathExpired: true, overExpired: true })).toBe('play')
  })
})

describe('ml7-1: death --(death hold)--> play (respawn)', () => {
  it('the death hold expiring returns to play (the respawn is wired by ml7-2)', () => {
    expect(advancePhase('death', { deathExpired: true })).toBe('play')
  })
  it('an unexpired death hold stays in death', () => {
    expect(advancePhase('death', { deathExpired: false })).toBe('death')
  })
})

describe('ml7-1: game-over routes a QUALIFYING score to entry, else times out to attract', () => {
  it('a qualifying final score routes game-over to the ml5 name-entry phase (the headline edge)', () => {
    expect(advancePhase('game-over', { scoreQualifies: true })).toBe('entry')
  })
  it('a non-qualifying game-over holds until the attract-return timeout, then returns to attract', () => {
    expect(advancePhase('game-over', { scoreQualifies: false, overExpired: false })).toBe('game-over')
    expect(advancePhase('game-over', { scoreQualifies: false, overExpired: true })).toBe('attract')
  })
  it('qualifying takes precedence over the timeout on the same frame (never skip name entry)', () => {
    expect(advancePhase('game-over', { scoreQualifies: true, overExpired: true })).toBe('entry')
  })
})

describe('ml7-1: entry --(initials committed)--> attract', () => {
  it('committing the initials returns entry to attract', () => {
    expect(advancePhase('entry', { entryComplete: true })).toBe('attract')
  })
  it('an in-flight name entry stays in entry', () => {
    expect(advancePhase('entry', { entryComplete: false })).toBe('entry')
  })
})

describe('ml7-1: advancePhase is a pure, deterministic function', () => {
  it('does not mutate its signals argument (accepts a frozen object)', () => {
    const frozen = Object.freeze<PhaseSignals>({ playerDied: true, livesRemaining: 2 })
    // Would throw in strict mode if the machine tried to write to `signals`.
    expect(() => advancePhase('play', frozen)).not.toThrow()
    expect(advancePhase('play', frozen)).toBe('death')
  })
  it('is deterministic for identical inputs (no clock, no entropy)', () => {
    const sig: PhaseSignals = { scoreQualifies: true }
    expect(advancePhase('game-over', sig)).toBe(advancePhase('game-over', sig))
  })
})

describe('ml7-1: the edges compose into the documented cabinet loops', () => {
  it('drives the QUALIFYING loop: attract -> play -> death -> play -> game-over -> entry -> attract', () => {
    let p: GamePhase = 'attract'
    p = advancePhase(p, { startRequested: true })
    expect(p).toBe('play')
    p = advancePhase(p, { playerDied: true, livesRemaining: 1 })
    expect(p).toBe('death')
    p = advancePhase(p, { deathExpired: true })
    expect(p).toBe('play')
    p = advancePhase(p, { playerDied: true, livesRemaining: 0 })
    expect(p).toBe('game-over')
    p = advancePhase(p, { scoreQualifies: true })
    expect(p).toBe('entry')
    p = advancePhase(p, { entryComplete: true })
    expect(p).toBe('attract')
  })
  it('drives the NON-qualifying loop: attract -> play -> game-over -> attract (no name entry)', () => {
    let p: GamePhase = 'attract'
    p = advancePhase(p, { startRequested: true })
    expect(p).toBe('play')
    p = advancePhase(p, { playerDied: true, livesRemaining: 0 })
    expect(p).toBe('game-over')
    p = advancePhase(p, { scoreQualifies: false, overExpired: true })
    expect(p).toBe('attract')
  })
})
