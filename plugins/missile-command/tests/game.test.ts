// plugins/missile-command/tests/game.test.ts
//
// Story mc3-4 — RED phase (Han Solo / TEA). The composed combat loop: grow
// GameState and stepGame so one frame runs the whole battle —
//   (1) spawn against LIVE targets, (2) fly ICBMs, (3) fly ABMs,
//   (4) detonate ABM arrivals into blasts, (5) damage (blasts kill ICBMs and
//   score; arrived ICBMs kill structures), (6) age blasts, (7) resolve score+phase.
// When phase='over' the loop only advances frame.
//
// These tests compose the already-shipped mc3-1/2/3 + mc1 modules through
// game.ts; they assert the WIRING and the per-frame ORDER, not the sub-modules'
// internals (those have their own suites). Every fixture is constructed so the
// expected outcome is deterministic and independent of the RNG stream where the
// AC allows it — a seed-dependent "icbms[0] exists" assertion is exactly the kind
// of flake this suite refuses.
//
// RED today: game.ts is still the mc1-4 stub — `createGame` takes no seed and
// `GameState` has no icbms/cities/bases/score/phase/remaining/rng, so this file
// fails to type-check and to run until GREEN grows game.ts.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { NICBMS, MXICON } from '../src/core/spawn.js'
import { type Icbm } from '../src/core/icbm.js'
import {
  startExplosion,
  stepExplosion,
  blastRadius,
  MAX_BLAST_RADIUS,
  type Explosion,
} from '../src/core/explosion.js'

/** A blast stepped to its PEAK radius — MAX_BLAST_RADIUS on BOTH the mc1-4 triangle
 *  and the mc9-3 OLDRAD curve, so the kill-wiring fixtures below do not depend on
 *  which radius model is live. (A hardcoded `t` cannot: the two curves' lifetimes
 *  differ — the triangle peaks at t=13, OLDRAD at t≈65 — so no single tick gives a
 *  large radius on both.) */
const peakBlast = (h: number, v: number): Explosion => {
  let e = startExplosion(h, v)
  for (let i = 0; blastRadius(e) < MAX_BLAST_RADIUS && i < 10000; i++) e = stepExplosion(e)
  return e
}

/** Fold `stepGame` `n` times. */
const run = (s: GameState, n: number): GameState => {
  let cur = s
  for (let k = 0; k < n; k++) cur = stepGame(cur)
  return cur
}

// ─── AC1: a fresh game starts defended and at rest ───────────────────────────
describe('mc3-4 AC1 — createGame(seed) returns a fresh, fully-defended game', () => {
  it('has 6 live cities, 3 live bases at ammo 10, no enemies, score 0, phase play', () => {
    const g = createGame(1)
    expect(g.cities.length).toBe(6)
    expect(g.cities.every((c) => c.alive)).toBe(true)
    expect(g.bases.length).toBe(3)
    expect(g.bases.every((b) => b.alive && b.ammo === 10)).toBe(true)
    expect(g.icbms.length).toBe(0)
    expect(g.abms.length).toBe(0)
    expect(g.explosions.length).toBe(0)
    expect(g.score).toBe(0)
    expect(g.phase).toBe('play')
    expect(g.frame).toBe(0)
  })

  it('seeds the per-wave ICBM budget to NICBMS and carries a seeded rng', () => {
    const g = createGame(1)
    expect(g.remaining).toBe(NICBMS)
    // createRng(1) seeds the durable word to 1; a later step must advance it.
    expect(g.rng.seed).toBe(1)
  })

  it('defaults the seed to 1 (createGame() === createGame(1))', () => {
    expect(createGame()).toEqual(createGame(1))
  })
})

// ─── AC2: the attack runs, respects the caps, and can be scored against ───────
describe('mc3-4 AC2 — stepGame launches the wave within its caps', () => {
  it('first step launches up to MXICON and draws the budget down by exactly that many', () => {
    // From empty, spawn.ts launches min(MXICON, remaining) at once. That pins the
    // on-screen cap (MXICON, not NICBMS) AND budget conservation in one step:
    // launched + remaining === NICBMS.
    const g1 = stepGame(createGame(1))
    expect(g1.icbms.length).toBe(MXICON)
    expect(g1.remaining).toBe(NICBMS - MXICON)
    expect(g1.icbms.length + g1.remaining).toBe(NICBMS)
    expect(g1.frame).toBe(1)
  })

  it('never exceeds the on-screen cap and never over-spends the budget over a long run', () => {
    let g = createGame(2)
    let prevRemaining = g.remaining
    for (let k = 0; k < 120; k++) {
      g = stepGame(g)
      expect(g.icbms.length).toBeLessThanOrEqual(MXICON) // MXICON on-screen ceiling
      expect(g.remaining).toBeGreaterThanOrEqual(0) // budget never goes negative
      expect(g.remaining).toBeLessThanOrEqual(prevRemaining) // monotonic drawdown
      prevRemaining = g.remaining
    }
  })

  it('a blast covering an ICBM head destroys exactly that ICBM and adds exactly 25', () => {
    // Deterministic construction (no RNG dependence): two in-flight ICBMs, a live
    // blast on top of one of them, and remaining=0 so no new spawn perturbs the count.
    const victim: Icbm = { origin: { h: 100, v: 222 }, target: { h: 100, v: 20 }, pos: { h: 100, v: 100 }, arrived: false }
    const bystander: Icbm = { origin: { h: 5, v: 222 }, target: { h: 5, v: 20 }, pos: { h: 5, v: 100 }, arrived: false }
    const blast = peakBlast(100, 99) // peak radius covers the victim's flown head; far from the bystander
    const g: GameState = { ...createGame(1), remaining: 0, icbms: [victim, bystander], explosions: [blast] }

    const next = stepGame(g)
    expect(next.icbms.length).toBe(1) // only the victim removed
    expect(next.score).toBe(25) // exactly one kill × ICBM_KILL_POINTS(25), not 50
  })

  it('spawns only against LIVE structures (dead cities/bases are never targeted)', () => {
    // Kill every structure but city 0, keep the game in 'play', and force a spawn:
    // every launched ICBM must aim at the one surviving structure.
    const base = createGame(1)
    const survivor = base.cities[0]
    const g: GameState = {
      ...base,
      cities: base.cities.map((c, i) => (i === 0 ? c : { ...c, alive: false })),
      bases: base.bases.map((b) => ({ ...b, alive: false })),
      remaining: NICBMS,
      icbms: [],
    }
    const next = stepGame(g)
    expect(next.icbms.length).toBeGreaterThan(0) // it did launch
    expect(next.phase).toBe('play') // still one city alive → not over
    expect(next.icbms.every((i) => i.target.h === survivor.pos.h && i.target.v === survivor.pos.v)).toBe(true)
  })
})

// ─── AC3: structures only die, and losing every city ends the game ────────────
describe('mc3-4 AC3 — an arrived ICBM kills its target, and the dead never resurrect', () => {
  it('an arrived ICBM at a city destroys that city, removes the warhead, and leaves the rest', () => {
    const base = createGame(1)
    const target = base.cities[0].pos
    const arrived: Icbm = { origin: { h: target.h, v: 222 }, target, pos: target, arrived: true }
    const g: GameState = { ...base, remaining: 0, icbms: [arrived] }

    let next = stepGame(g)
    expect(next.cities[0].alive).toBe(false) // the struck city died
    expect(next.cities.slice(1).every((c) => c.alive)).toBe(true) // no other city touched
    expect(next.icbms.length).toBe(0) // the arrived warhead is consumed

    // …and it stays dead across further frames (alive only ever goes true→false).
    for (let k = 0; k < 10; k++) {
      next = stepGame(next)
      expect(next.cities[0].alive).toBe(false)
    }
  })

  it('flips to phase over once every city is dead, then only advances the frame', () => {
    const g: GameState = { ...createGame(9), cities: createGame(9).cities.map((c) => ({ ...c, alive: false })) }

    const over = stepGame(g)
    expect(over.phase).toBe('over') // all cities dead → resolve to over

    // Subsequent steps freeze everything but the frame counter — in-flight ICBMs
    // are NOT flown, the score is not touched, structures are untouched.
    const nxt = stepGame(over)
    expect(nxt.phase).toBe('over')
    expect(nxt.frame).toBe(over.frame + 1)
    expect(nxt.score).toBe(over.score)
    expect(nxt.icbms).toEqual(over.icbms)
    expect(nxt.cities).toEqual(over.cities)
    expect(nxt.bases).toEqual(over.bases)
  })

  it('never resurrects a structure across a full attack (monotonic alive)', () => {
    let g = createGame(4)
    let cityAlive = g.cities.map((c) => c.alive)
    let baseAlive = g.bases.map((b) => b.alive)
    for (let k = 0; k < 260; k++) {
      g = stepGame(g)
      g.cities.forEach((c, i) => {
        if (!cityAlive[i]) expect(c.alive).toBe(false) // once dead, stays dead
      })
      g.bases.forEach((b, i) => {
        if (!baseAlive[i]) expect(b.alive).toBe(false)
      })
      cityAlive = g.cities.map((c) => c.alive)
      baseAlive = g.bases.map((b) => b.alive)
    }
  })
})

// ─── AC4: the sim is deterministic for a seed ────────────────────────────────
describe('mc3-4 AC4 — same seed is identical, and the seed actually matters', () => {
  it('two runs from the same seed produce identical multi-hundred-frame states', () => {
    expect(run(createGame(7), 250)).toEqual(run(createGame(7), 250))
  })

  it('a step advances the seeded rng (randomness is threaded through state)', () => {
    // The first step spawns, consuming the rng — the durable seed word must move.
    expect(stepGame(createGame(1)).rng.seed).not.toBe(1)
  })

  it('different seeds diverge (the seed is not ignored)', () => {
    expect(run(createGame(7), 50)).not.toEqual(run(createGame(11), 50))
  })
})
