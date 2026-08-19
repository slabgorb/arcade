// plugins/defender/tests/df7-2-start-transition.test.ts
//
// Story df7-2 — RED phase (Leeloo / TEA). The mc6-2 analog: the start-of-game
// transition. df7-1 gave us the PURE phase machine (`advancePhase(phase, signals)`,
// core/phase.ts) but nothing wires it — main.ts still boots a bare running sim
// (main.ts:28 `createSim(...)`). This story adds the PURE start seam that composes
// df7-1's `advancePhase` with a df3 `createSim` RESEED at the setup->play edge, so a
// start/coin action turns the attract screen into a fresh, playable game.
//
// THE SEAM GREEN MUST BUILD — `src/core/start.ts` (pure: entropy injected, no clock,
// no rAF; purity.test.ts's armed src/core sweep will cover it):
//   • interface Session { readonly phase: Phase; readonly sim: SimState }
//   • bootSession(rand): Session          -> { phase: 'attract', sim: createSim(rand) }
//   • advanceStart(session, signals, rand): Session
//        phase' = advancePhase(session.phase, signals)   // df7-1, CONSUMED not re-decided
//        reseed  = session.phase === 'setup' && phase' === 'play'
//        sim'    = reseed ? createSim(rand) : session.sim // the df3 reseed, PURE
// The shell (main.ts) computes `signals` from input (startRequested) and its own
// setup->play cadence (setupComplete — df7-2 owns that constant, not pinned here), and
// only draws `rand` on the reseed edge. Only the input binding is shell; the reseed is core.
//
// RED now: core/start.ts does not exist, so this file fails to resolve its import — the
// absent-feature RED. GREEN adds the module above.
//
// SCOPE NOTE (logged as a TEA deviation): AC1 reads "attract|game-over -> setup -> play",
// but df7-1's advancePhase has NO game-over->setup edge — game-over exits only to attract
// via `overTimeout`, and that timeout is df7-4's. So df7-2 delivers the ATTRACT -> setup ->
// play start (Scope section: "starts a single-player game from attract"); the game-over
// leg reaches the same start once df7-4 lands the game-over->attract timeout.

import { describe, it, expect } from 'vitest'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { STARTING_MEN } from '../src/core/score.js'
import { composeFrame } from '../src/core/scene.js'
import { assertNoFullFrameStrobe } from '../src/core/effects.js'
import { bootSession, advanceStart } from '../src/core/start.js'

// The visible-raster window (render.ts LOGICAL_WIDTH/HEIGHT = 292x240; df3-6-live-sim
// idiom — declared locally so this core test pulls in no shell/render module).
const LOGICAL_WIDTH = 292
const LOGICAL_HEIGHT = 240

// NEUTRAL input: the ship does nothing, so the only mover on a play tick is the df5-8
// wave director (the df5-8/df5-10 fixture shape).
const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false, smartBomb: false }

/** Deterministic byte source (LCG) — the df3-6/df5-8/df5-10 shape; no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

/** Drive the pure seam attract -> setup -> play and return the fresh play-edge sim. */
function reseedAtPlayEdge(seed: number): SimState {
  const setup = advanceStart(bootSession(makeRand(seed)), { startRequested: true }, makeRand(seed))
  return advanceStart(setup, { setupComplete: true }, makeRand(seed)).sim
}

describe('df7-2 AC2 — the pure start seam boots into attract and advances on the start signal', () => {
  it('bootSession boots into the df7-1 attract phase, not a running play field', () => {
    const boot = bootSession(makeRand(1))
    expect(boot.phase, 'a fresh cabinet shows attract, not play').toBe('attract')
  })

  it('a start/coin request advances attract -> setup (df7-1 startRequested), with no reseed yet', () => {
    const boot = bootSession(makeRand(1))
    const setup = advanceStart(boot, { startRequested: true }, makeRand(2))
    expect(setup.phase, 'attract + startRequested -> setup').toBe('setup')
    // The reseed is the setup->play edge, not here: attract->setup carries the boot sim through.
    expect(setup.sim, 'no reseed on the attract->setup edge').toBe(boot.sim)
  })

  it('holds attract with no start signal, and holds setup until setup completes', () => {
    const boot = bootSession(makeRand(1))
    expect(advanceStart(boot, {}, makeRand(2)).phase, 'attract holds without a start').toBe('attract')
    const setup = advanceStart(boot, { startRequested: true }, makeRand(2))
    expect(advanceStart(setup, {}, makeRand(2)).phase, 'setup holds until setupComplete').toBe('setup')
  })
})

describe('df7-2 AC1 — the setup->play edge RESEEDS a fresh game (df5-10 humanoids, df5-8 wave 1, df5-3 men=3)', () => {
  it('setup + setupComplete -> play and reseeds the fresh-game invariants at the edge', () => {
    const setup = advanceStart(bootSession(makeRand(1)), { startRequested: true }, makeRand(1))
    const play = advanceStart(setup, { setupComplete: true }, makeRand(7))
    expect(play.phase, 'setup + setupComplete -> play').toBe('play')
    // The df3 createSim reseed carries df5-8/df5-10/df5-3's seed:
    expect(play.sim.humanoids.length, 'df5-10 ground population placed on the reseed').toBeGreaterThan(0)
    expect(play.sim.men, 'df5-3 STARTING_MEN on a fresh game (NSHIP ROMC8.SRC:802)').toBe(STARTING_MEN)
    expect(STARTING_MEN, 'ROMC8.SRC:802 NSHIP = 3').toBe(3)
    expect(play.sim.score, 'a fresh game scores 0').toBe(0)
    expect(play.sim.gameOver, 'a fresh game is not over').toBe(false)
  })

  it('the reseeded sim is byte-fresh (wave 0, empty field), and the first PLAY tick spawns df5-8 wave 1', () => {
    const play = reseedAtPlayEdge(5)
    // A fresh sim is pre-first-tick (sim.ts: "spawning is explicit; the df5 wave logic drives it"):
    expect(play.wave, 'a fresh field has run no wave yet').toBe(0)
    expect(play.landers.length, 'spawning is explicit — the fresh field carries no enemies').toBe(0)
    // One play tick on the cleared field advances the df5-8 director to wave 1 (WVTAB landers):
    const t1 = stepSim(play, NEUTRAL)
    expect(t1.wave, 'the first play tick spawns df5-8 wave 1').toBe(1)
    expect(t1.landers.length, 'wave 1 puts WVTAB attackers on the field').toBeGreaterThan(0)
  })
})

describe('df7-2 AC3 — the reseed is deterministic under a seed (df3 seeded RNG), and pure', () => {
  it('the same seed yields the same fresh game at the setup->play edge', () => {
    const a = reseedAtPlayEdge(42)
    const b = reseedAtPlayEdge(42)
    expect(a.humanoids, 'same seed -> byte-identical humanoid placement').toEqual(b.humanoids)
    expect(a.men).toBe(b.men)
    expect(a.wave).toBe(b.wave)
    expect(a.score).toBe(b.score)
    // Non-vacuity: the comparison is over real, populated data...
    expect(a.humanoids.length, 'the determinism check compares a real population').toBeGreaterThan(0)
    // ...and the seed actually FLOWS into the reseed — a different seed reseeds a different
    // star field (STINIT RAND, injected into createSim), so the reseed is not seed-blind.
    expect(a.stars, 'a different seed -> a different reseed (rand reaches createSim)').not.toEqual(reseedAtPlayEdge(43).stars)
  })

  it('advanceStart is pure: identical inputs (session + signals + seeded rand) give identical output', () => {
    const setup = advanceStart(bootSession(makeRand(9)), { startRequested: true }, makeRand(9))
    const one = advanceStart(setup, { setupComplete: true }, makeRand(9))
    const two = advanceStart(setup, { setupComplete: true }, makeRand(9))
    expect(one.phase).toBe(two.phase)
    expect(one.sim.humanoids, 'a pure reducer replays byte-for-byte off the same seeded rand').toEqual(two.sim.humanoids)
  })
})

describe('df7-2 AC4 — the setup->play transition renders no full-frame strobe (ADR-0005 Decision B; df4-2 guard)', () => {
  it('the last-setup frame and the first-play frame are not a whole-screen luminance flip', () => {
    const setup = advanceStart(bootSession(makeRand(3)), { startRequested: true }, makeRand(3))
    const play = advanceStart(setup, { setupComplete: true }, makeRand(3))
    const before = composeFrame(setup.sim, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    const after = composeFrame(play.sim, LOGICAL_WIDTH, LOGICAL_HEIGHT)
    // A safe transition changes CONTENT, never inverts the whole frame — assertNoFullFrameStrobe
    // throws only on a near-total luminance flip (df5-4/df5-5/effects idiom). It fails CLOSED on
    // a mismatched pair, so this also proves both frames are the same real 292x240 raster.
    expect(
      () => assertNoFullFrameStrobe(before.data, after.data),
      'the start transition must not strobe the whole screen (ADR-0005)',
    ).not.toThrow()
  })
})
