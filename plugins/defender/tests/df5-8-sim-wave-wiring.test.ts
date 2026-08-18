// tests/df5-8-sim-wave-wiring.test.ts
//
// Story df5-8 — RED phase (Leeloo / TEA). The df5-2 wave director is PURE and UNWIRED
// today: `sim.ts` imports no `waves` module, so waveParams/createWaveDirector drive
// nothing on screen. This suite pins the WIRING GREEN must add — that the RUNNING sim
// actually mints and drives the director over its existing scheduler + enemy bank:
//
//   1. createSim calls createWaveDirector(sched, getPopulation, spawnWave) and surfaces
//      the director's `wave` counter on SimState as `wave` (0 before the first tick).
//   2. getPopulation reads the LIVE lander population — `_enemyBank.landers` filtered by
//      `.alive` (a killLander removes the struck record, so the live count drops to 0 and
//      the director advances; a still-populated field must NOT advance).
//   3. spawnWave spawns each wave's WVTAB attacker counts (waveParams(wave).counts.landers)
//      through `_enemyBank.spawnLander(x)`.
//   4. The x-selection is deterministic — pure core, no clock, no ambient entropy.
//
// df5-2-waves.test.ts already pins the director IN ISOLATION (WVTAB columns, GTWV00
// escalation) with injected fakes; this suite proves the live sim calls it for real.
//
// Loader pattern mirrors df4-3-sim-wiring.test.ts: a variable module specifier keeps
// `tsc --noEmit` from binding this observable subset to the concrete SimState, and a
// self-describing throw turns the still-missing `wave` field into an ABSENT-FEATURE RED.

import { describe, it, expect } from 'vitest'
import { waveParams } from '../src/core/waves.js'

// The pure per-tick input snapshot (sim.ts Input). NEUTRAL = the ship does nothing, so the
// only thing moving the sim is the wave director on the scheduler.
interface Input {
  readonly thrust: boolean
  readonly reverse: boolean
  readonly up: boolean
  readonly down: boolean
  readonly fire: boolean
}
const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }

// The observable subset this suite reads. `alive` is what getPopulation must respect;
// killLander is how a COLIDE kill (and this test) removes a lander to clear the field.
interface LanderView {
  readonly x: number
  readonly y: number
  readonly alive: boolean
}
interface EnemyBankView {
  readonly landers: readonly LanderView[]
  killLander: (lander: LanderView) => void
}
interface SimState {
  /** df5-8: the wave director's counter, surfaced on state so tests can read it. */
  readonly wave: number
  readonly landers: readonly LanderView[]
  readonly _enemyBank: EnemyBankView
}
interface SimModule {
  createSim: (rand: () => number) => SimState
  stepSim: (state: SimState, input: Input) => SimState
}

const SIM_SPECIFIER = '../src/core/sim.js'

/** Deterministic byte source (LCG), the shape df3-6/df4-3 use — no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

async function loadSim(): Promise<SimModule> {
  const partial = (await import(/* @vite-ignore */ SIM_SPECIFIER)) as Partial<SimModule>
  const missing = (['createSim', 'stepSim'] as const).filter((k) => typeof partial[k] !== 'function')
  if (missing.length > 0) {
    throw new Error(`src/core/sim.ts is missing export(s): ${missing.join(', ')}.`)
  }
  // Cast the whole module once, AFTER the guard (the df4-3-sim-wiring.test.ts pattern) — no
  // per-field non-null assertion, so the guard and the deref cannot silently desync.
  const mod = partial as SimModule
  const probe = mod.createSim(makeRand(0))
  if (typeof probe.wave !== 'number') {
    throw new Error(
      'src/core/sim.ts exposes no numeric `wave` on SimState — the df5-2 wave director is still ' +
        'UNWIRED. GREEN (Korben) must, inside createSim, call ' +
        'createWaveDirector(sched, getPopulation, spawnWave): getPopulation returns the LIVE lander ' +
        'count (`_enemyBank.landers` filtered by `.alive`); spawnWave spawns ' +
        '`waveParams(wave).counts.landers` landers via ' +
        '`_enemyBank.spawnLander(x)`; and the director\'s `wave` counter is surfaced on state as ' +
        '`wave` (0 on a fresh sim). PURE core — the x-selection reads no clock and mints no entropy.',
    )
  }
  return mod
}

const aliveCount = (s: SimState): number => s.landers.filter((l) => l.alive).length
function stepN(mod: SimModule, state: SimState, n: number): SimState {
  let s = state
  for (let i = 0; i < n; i++) s = mod.stepSim(s, NEUTRAL)
  return s
}

describe('df5-8 sim wave wiring — the running sim mints and drives the df5-2 director', () => {
  it('a fresh sim is at wave 0 with no landers; the first tick spawns wave 1', async () => {
    const mod = await loadSim()
    const fresh = mod.createSim(makeRand(1))
    expect(fresh.wave, 'a fresh sim has run no wave yet (the director spawns on the first tick, not eagerly)').toBe(0)
    expect(fresh.landers.length, 'spawning is explicit — a fresh field carries no enemies').toBe(0)

    const t1 = mod.stepSim(fresh, NEUTRAL)
    expect(t1.wave, 'a cleared field on the first scheduler tick advances the director to wave 1').toBe(1)
    const expected = waveParams(1).counts.landers
    expect(
      aliveCount(t1),
      `wave 1 must spawn waveParams(1).counts.landers (${expected}) live landers via _enemyBank.spawnLander`,
    ).toBe(expected)
  })

  it('the director does NOT advance while landers are alive (getPopulation reads the LIVE count, not a constant)', async () => {
    const mod = await loadSim()
    let s = mod.stepSim(mod.createSim(makeRand(2)), NEUTRAL) // wave 1, field populated
    expect(s.wave, 'wave 1 has spawned').toBe(1)
    expect(aliveCount(s), 'wave 1 left live landers on the field').toBeGreaterThan(0)

    s = stepN(mod, s, 4) // keep ticking with the field still populated
    expect(
      s.wave,
      'a still-populated field must NOT trigger the next wave — if it did, getPopulation is wired to a constant, not the real lander count',
    ).toBe(1)
    expect(aliveCount(s), 'nothing killed the landers, so the field is still populated').toBeGreaterThan(0)
  })

  it('clearing the field advances to wave 2 and spawns the escalated WVTAB count', async () => {
    const mod = await loadSim()
    let s = mod.stepSim(mod.createSim(makeRand(3)), NEUTRAL) // wave 1
    expect(s.wave).toBe(1)

    // Clear the field exactly as a COLIDE kill does: killLander removes each struck lander
    // from the bank, so the live population drops to 0 — which is what getPopulation reads.
    expect(s._enemyBank.landers.length, 'wave 1 left live landers to clear').toBeGreaterThan(0)
    for (const l of s._enemyBank.landers) s._enemyBank.killLander(l)
    expect(aliveCount(s), 'every lander is killed — the field is clear').toBe(0)
    expect(s._enemyBank.landers.length, 'the killed landers are gone from the bank').toBe(0)

    const t = mod.stepSim(s, NEUTRAL) // the director's next dispatch sees population 0
    expect(t.wave, 'a cleared field advances the director to the next wave').toBe(2)
    const w2 = waveParams(2).counts.landers
    expect(aliveCount(t), `wave 2 must spawn waveParams(2).counts.landers (${w2}) fresh live landers`).toBe(w2)
    expect(
      w2,
      'the WVTAB escalates the lander count from wave 1 to wave 2 — the on-screen escalation df5-7 exists to show',
    ).toBeGreaterThan(waveParams(1).counts.landers)
  })

  it('the wave wiring is deterministic — two same-seed sims spawn identical waves (no ambient entropy)', async () => {
    const mod = await loadSim()
    const run = (): { wave: number; xs: readonly number[]; n: number } => {
      const s = stepN(mod, mod.createSim(makeRand(7)), 3)
      return { wave: s.wave, xs: s.landers.map((l) => l.x), n: aliveCount(s) }
    }
    const a = run()
    const b = run()
    expect(a.wave, 'same seed → same wave number').toBe(b.wave)
    expect(a.n, 'same seed → same live population').toBe(b.n)
    expect(
      a.xs,
      'same seed → identical lander spawn columns; any divergence means the x-selection read a clock or Math.random (a core-boundary breach)',
    ).toEqual(b.xs)
  })
})
