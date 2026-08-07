// plugins/missile-command/tests/mc3-playthrough.test.ts
//
// Story mc3-5 — RED phase (Han Solo / TEA). AC3: one seeded end-to-end run proving
// the whole mc3 combat loop is coherent AND fully deterministic. Two blocks:
//
//   1. THE ENEMY LOOP (pure stepGame). Enemies appear, the wave budget draws down,
//      never more than MXICON on screen, structures only ever go alive→dead, the
//      phase is always {play,over}, and identical seeds replay identically while
//      different seeds diverge. mc3-4 already composed this loop, so this block is
//      GREEN ON ARRIVAL by design — it is the regression guard that keeps the render
//      + input changes in this story from disturbing the simulation underneath.
//
//   2. THE FULL STACK (input → sim). A scripted seeded run that also FIRES through
//      the new `fireFromKey` shell seam: the magazine economy draws down, ABMs reach
//      the field, ammo never goes negative, and the whole input+sim composition is
//      deterministic. This block is RED until AC2's `fireFromKey` exists — it is the
//      genuine end-to-end driver of this story.
//
// No wall clock, no entropy beyond the seeded Rng carried in state: every constant
// (MXICON, NICBMS, the magazine size) is imported from core, never hardcoded here.

import { describe, it, expect } from 'vitest'
import { createGame, stepGame, type GameState } from '../src/core/game.js'
import { MXICON, NICBMS } from '../src/core/spawn.js'

// ─── Block 2's fire seam, via the fleet @vite-ignore RED-import idiom ──────────
interface FireModule {
  fireFromKey: (key: string, state: GameState) => GameState
}
const INPUT_SPECIFIER = '../src/shell/input.js'
async function loadFire(): Promise<FireModule> {
  try {
    const mod = (await import(/* @vite-ignore */ INPUT_SPECIFIER)) as Partial<FireModule>
    if (typeof mod.fireFromKey !== 'function') throw new Error('no `fireFromKey` export')
    return mod as FireModule
  } catch (e) {
    throw new Error(
      'end-to-end playthrough needs AC2 first — Dev adds fireFromKey(key, state): GameState ' +
        `to src/shell/input.ts (see fire-ammo.test.ts). (${(e as Error).message})`,
    )
  }
}

/** The state after `n` frames of the pure enemy loop from a fresh seeded game. */
function trajectory(seed: number, n: number): GameState[] {
  const out: GameState[] = [createGame(seed)]
  for (let k = 0; k < n; k++) out.push(stepGame(out[out.length - 1]))
  return out
}

const aliveCities = (s: GameState): number => s.cities.filter((c) => c.alive).length
const aliveBases = (s: GameState): number => s.bases.filter((b) => b.alive).length
const liveAmmo = (s: GameState): number => s.bases.reduce((n, b) => n + b.ammo, 0)

const FRAMES = 400

describe('AC3 — the enemy loop runs coherently for a whole seeded wave', () => {
  const run = trajectory(11, FRAMES)
  const end = run[run.length - 1]

  it('enemies actually appear during the run', () => {
    expect(run.some((s) => s.icbms.length > 0), 'the wave must launch ICBMs').toBe(true)
  })

  it('the wave budget draws down as ICBMs launch', () => {
    expect(end.remaining, 'ICBMs are drawn from the NICBMS budget').toBeLessThan(NICBMS)
    expect(end.remaining, 'the budget never goes negative').toBeGreaterThanOrEqual(0)
  })

  it('never more than MXICON ICBMs on screen, on any frame', () => {
    for (const s of run) {
      expect(s.icbms.length, `frame ${s.frame}: MXICON exceeded`).toBeLessThanOrEqual(MXICON)
    }
  })

  it('cities and bases only ever go alive→dead (monotonic, never resurrect)', () => {
    for (let i = 1; i < run.length; i++) {
      expect(aliveCities(run[i]), `cities resurrected at frame ${i}`).toBeLessThanOrEqual(aliveCities(run[i - 1]))
      expect(aliveBases(run[i]), `bases resurrected at frame ${i}`).toBeLessThanOrEqual(aliveBases(run[i - 1]))
    }
  })

  it('the remaining budget is monotonic non-increasing', () => {
    for (let i = 1; i < run.length; i++) {
      expect(run[i].remaining, `budget increased at frame ${i}`).toBeLessThanOrEqual(run[i - 1].remaining)
    }
  })

  it('the phase is always play or over, never anything else', () => {
    for (const s of run) expect(['play', 'over']).toContain(s.phase)
  })
})

describe('AC3 — the run is fully deterministic in the seed', () => {
  it('identical seeds replay to identical states, frame for frame', () => {
    expect(trajectory(7, 300)).toEqual(trajectory(7, 300))
  })

  it('different seeds diverge (the seed is actually consumed, not ignored)', () => {
    expect(trajectory(7, 300)).not.toEqual(trajectory(8, 300))
  })
})

describe('AC3 — end to end through the fire seam: the magazine economy is spent', () => {
  const AIM = { h: 128, v: 128 }
  const KEYS = ['z', 'x', 'c'] as const

  /** A scripted seeded run that fires a cycling key each frame, then steps. */
  async function playFiring(seed: number, frames: number): Promise<GameState[]> {
    const { fireFromKey } = await loadFire()
    const out: GameState[] = [{ ...createGame(seed), cursor: AIM }]
    for (let k = 0; k < frames; k++) {
      const fired = fireFromKey(KEYS[k % KEYS.length], out[out.length - 1])
      out.push(stepGame(fired))
    }
    return out
  }

  it('firing every frame draws the total magazine down below its full load', () => {
    const start = liveAmmo(createGame(3))
    return playFiring(3, 60).then((run) => {
      const end = run[run.length - 1]
      expect(liveAmmo(end), 'sustained firing must spend ammo').toBeLessThan(start)
    })
  })

  it('ABMs reach the field, and ammo never goes negative', async () => {
    const run = await playFiring(3, 60)
    expect(run.some((s) => s.abms.length > 0), 'fired ABMs must appear in flight').toBe(true)
    for (const s of run) {
      for (const b of s.bases) expect(b.ammo, `frame ${s.frame}: negative ammo`).toBeGreaterThanOrEqual(0)
    }
  })

  it('the full input+sim playthrough is deterministic in the seed', async () => {
    const [a, b] = await Promise.all([playFiring(5, 120), playFiring(5, 120)])
    expect(a).toEqual(b)
  })
})
