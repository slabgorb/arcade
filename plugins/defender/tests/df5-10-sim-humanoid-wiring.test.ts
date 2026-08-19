// tests/df5-10-sim-humanoid-wiring.test.ts
//
// Story df5-10 — RED phase (Leeloo / TEA). df5-8 wired the wave director so the running
// sim spawns LANDER waves; but nothing places HUMANOIDS on the ground at game start, so
// `createSim(...).humanoids` is empty forever. With no prey, every lander's
// `nearestTarget(x)` returns null and it takes the "no target yet — keep descending"
// path (`approach(rec.y, YMAX)`, landers.ts:242-243), sinks to the floor and idles — the
// field never clears and the game can't advance. This suite pins the WIRING GREEN must
// add: the running sim POPULATES the ground with walking humanoids at game start (the
// df5-8 analog for humanoids), via `_enemyBank.spawnHumanoid`, so landers have prey.
//
// df4-3-landers.test.ts already pins the abduction MECHANIC in isolation (a hand-placed
// humanoid is hunted, grabbed, carried). This suite proves the LIVE sim seeds the ground
// itself, and that with that seed the running sim actually plays out an abduction.
//
// The population must be PURE core — a deterministic, clock-free, entropy-free placement
// (the src/core boundary), exactly like df5-8's even lander spread across the 16-bit world
// cylinder. Two same-seed sims must place byte-identical humanoids.

import { describe, it, expect } from 'vitest'
import { createSim, stepSim, type Input } from '../src/core/sim.js'
import { LANDER_SPAWN_Y } from '../src/core/landers.js'
import { YMIN, YMAX } from '../src/core/world.js'

// NEUTRAL input: the ship does nothing, so the only movers are the wave director's landers
// and the ground humanoids on the scheduler.
const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false, smartBomb: false }

/** Deterministic byte source (LCG) — the df3-6/df4-3/df5-8 shape; no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

describe('df5-10 sim humanoid wiring — the running sim populates the ground so landers have prey', () => {
  it('a fresh sim places a live, walking ground population at game start (today the field is empty)', () => {
    const s = createSim(makeRand(1))
    expect(
      s.humanoids.length,
      'game start must place ground humanoids via _enemyBank.spawnHumanoid — today nothing calls ' +
        'it in createSim, so the field is empty and landers have no abduction target (they sink ' +
        'off the bottom untargeted). GREEN (Korben) must seed the ground the df5-8 way.',
    ).toBeGreaterThan(0)
    expect(
      s.humanoids.every((h) => h.alive),
      'every seeded humanoid starts alive',
    ).toBe(true)
    expect(
      s.humanoids.every((h) => h.state === 'walking'),
      'ground humanoids start WALKING the terrain (ASTRO, DEFB6.SRC:290) — not grabbed or falling',
    ).toBe(true)
  })

  it('the ground humanoids sit on the terrain BELOW where landers descend from — prey on the ground, not in the sky', () => {
    const s = createSim(makeRand(2))
    expect(s.humanoids.length, 'a population must exist to place').toBeGreaterThan(0)
    for (const h of s.humanoids) {
      expect(
        h.y > LANDER_SPAWN_Y && h.y <= YMAX,
        `humanoid at y=${h.y} must be on the terrain below the lander appear altitude ` +
          `(LANDER_SPAWN_Y=${LANDER_SPAWN_Y}) and no lower than the ground (YMAX=${YMAX}) — ` +
          'landers descend from the top onto prey waiting below',
      ).toBe(true)
      expect(h.y >= YMIN, `humanoid at y=${h.y} must be within the terrain strip (YMIN=${YMIN})`).toBe(true)
    }
  })

  it('the ground population is spread across the world cylinder — not stacked in one column (the df5-8 lander-spread analog)', () => {
    const s = createSim(makeRand(3))
    const xs = s.humanoids.map((h) => h.x)
    expect(xs.length, 'a population must exist to spread').toBeGreaterThan(1)
    expect(
      new Set(xs).size,
      'the ground population must occupy DISTINCT columns spread across the 16-bit world ' +
        '(like df5-8 spreads landers via (i/n)*0x10000) — a single stacked column is not a spread',
    ).toBeGreaterThan(1)
  })

  it('the ground population is deterministic — two same-seed sims place byte-identical humanoids (pure core, no clock/entropy)', () => {
    const seed = () => makeRand(7)
    const place = (): { n: number; xs: readonly number[]; ys: readonly number[] } => {
      const s = createSim(seed())
      return { n: s.humanoids.length, xs: s.humanoids.map((h) => h.x), ys: s.humanoids.map((h) => h.y) }
    }
    const a = place()
    const b = place()
    expect(a.n, 'same seed → same population size').toBe(b.n)
    expect(a.n, 'the population is non-empty (a vacuous [] would match itself)').toBeGreaterThan(0)
    expect(
      a.xs,
      'same seed → identical humanoid columns; any divergence means the placement read a clock or ' +
        'Math.random (a core-boundary breach)',
    ).toEqual(b.xs)
    expect(a.ys, 'same seed → identical humanoid rows').toEqual(b.ys)
  })

  it('the running sim keeps hunters and prey alive together — the first wave spawns landers while the ground population stands (the precondition the bug destroyed)', () => {
    const s1 = stepSim(createSim(makeRand(6)), NEUTRAL) // tick 1: wave 1 landers spawn
    expect(s1.landers.some((l) => l.alive), 'wave 1 put live landers on the field').toBe(true)
    expect(
      s1.humanoids.some((h) => h.alive && h.state === 'walking'),
      'a live, walking humanoid must stand while the landers descend — this is exactly what makes ' +
        'nearestTarget() return non-null so a lander HUNTS instead of taking the sink path. The bug ' +
        'was humanoids.length === 0 here, forever.',
    ).toBe(true)
  })

  it('landers now have prey: the running sim plays out an abduction (a humanoid is grabbed/carried), instead of every lander sinking untargeted', () => {
    // Deterministic, bounded integration run. With the ground seeded, a descending lander
    // acquires the nearest humanoid, aligns, and grabs it (LANDG3, DEFB6.SRC:778) — the
    // abduction the empty-field bug made impossible. We only need ONE to prove the loop runs.
    const BUDGET = 8000
    let s = createSim(makeRand(5))
    let abducted = false
    for (let i = 0; i < BUDGET && !abducted; i++) {
      s = stepSim(s, NEUTRAL)
      abducted =
        s.humanoids.some((h) => h.state === 'grabbed' || h.state === 'falling') ||
        s.landers.some((l) => l.carrying || l.reachedTop)
    }
    expect(
      abducted,
      `within ${BUDGET} ticks a lander must grab/carry a ground humanoid — proof the wave has ` +
        'prey and the field can play out. On the empty field (the bug) no abduction is ever ' +
        'possible: every lander just descends to YMAX and idles.',
    ).toBe(true)
  })
})
