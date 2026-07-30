// tests/demo-jt4-5.test.ts
//
// Story jt4-5 — RED phase (Leeloo / TEA). The SIM half of the epic closer: the
// EGG-WAVE SELF-CLEAR (forward-carries #3 + #5). jt4-4 wired an egg wave to enter
// its complement AS SETTLED EGGS (WAVEGG, JOUSTRV4.SRC:2737) but left the
// hatch→remount off a settled WAVE egg unwired — so the eggs sit forever and an egg
// wave can NEVER be cleared through play (Dev + Reviewer forward finding). This file:
//
//   1. HARDENS the jt4-4 egg-wave entry pin beyond `hasEgg` (Reviewer [MEDIUM][TEST]
//      at demo-jt4-4.test.ts:176-184): the complement enters as EXACTLY the ground
//      count of eggs, with ZERO materialising ground enemies. Green regression guard.
//   2. Pins the SELF-CLEAR (RED): a settled wave egg must HATCH→remount, so the egg
//      wave stops being a permanent egg-lock and can progress (egg.ts's willHatch /
//      remountEntryEdge are already cited laws — jt2-4 — just never driven off a
//      settled wave egg). RED today: `stepEgg` leaves a settled egg put forever.
//
// demo.ts already exists, so these redden on MISSING BEHAVIOUR (a clean assertion
// red), not a module-resolution trace. The complement size is derived from the wave
// module (loadWave) rather than a magic literal. Each test NAMES the mutant it kills.

import { describe, it, expect } from 'vitest'
import { loadDemo } from './helpers/demo-contract.js'
import { loadWave } from './helpers/wave-contract.js'
import type { DemoState } from './helpers/demo-contract.js'

const SEED = 0x1234

const eggCount = (d: DemoState): number => d.sim.processes.filter((p) => p.kind === 'egg').length
const enemyCount = (d: DemoState): number => d.sim.processes.filter((p) => p.kind === 'enemy').length
const hasEgg = (d: DemoState): boolean => eggCount(d) > 0

/** One forced wave advance at the demo level: strip to players (a cleared wave) + step. */
function forceAdvance(d: Awaited<ReturnType<typeof loadDemo>>, demo: DemoState): DemoState {
  const players = demo.sim.processes.filter((p) => p.kind === 'player')
  return d.stepDemo({ ...demo, sim: { ...demo.sim, processes: players }, events: [] })
}
function advanceTo(d: Awaited<ReturnType<typeof loadDemo>>, demo: DemoState, target: number): DemoState {
  let s = demo
  let guard = 0
  while (s.wave < target) {
    s = forceAdvance(d, s)
    if (++guard > 60) throw new Error(`stuck advancing to wave ${target} at ${s.wave}`)
  }
  return s
}

/** The ground complement (bounders + hunters + lords) an egg wave enters as eggs. */
async function groundComplement(wave: number): Promise<number> {
  const w = await loadWave()
  const row = w.waveRowAt(wave)
  return row.bounders + row.hunters + row.lords
}

// ═════════════════════════════════════════════════════════════════════════════
// ENTRY HARDENING — the egg wave enters its whole complement AS EGGS, no ground
//   enemies (strengthens the jt4-4 hasEgg-only pin). Green regression guard.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt4-5 egg wave — the complement enters as EGGS, not materialising ground enemies (hardening)', () => {
  it('wave 5 enters EXACTLY the ground-complement count of eggs and ZERO ground enemies', async () => {
    const demo = await loadDemo()
    // Wave 5 (status $08) dispatches to the egg type: WAVEGG enters the whole ground
    // complement as eggs (JOUSTRV4.SRC:2737). Harden past `hasEgg`: the COUNT must equal
    // the ground complement, and there must be NO materialising `enemy` process — kills
    // "the egg wave spawns eggs AND the usual bounders" and "it spawns just one token egg".
    const atWave5 = advanceTo(demo, demo.createWaveDemo(SEED), 5)
    expect(atWave5.wave, 'reached the egg wave').toBe(5)
    const expected = await groundComplement(5)
    expect(expected, 'wave 5 has a real ground complement to convert (bounders)').toBeGreaterThan(0)
    expect(eggCount(atWave5), 'the whole ground complement entered as eggs').toBe(expected)
    expect(enemyCount(atWave5), 'and NO materialising ground enemy entered alongside them').toBe(0)
    expect(hasEgg(atWave5), 'so the wave holds open on eggs').toBe(true)
  })

  it('a NON-egg wave (2, co-op) enters ground enemies and NO eggs — the wiring is egg-typed', async () => {
    const demo = await loadDemo()
    // The negative control: wave 2 is co-op, not an egg wave. Kills "spawnWaveEnemies now
    // spawns eggs for every wave" (an always-on egg spawn would redden here).
    const atWave2 = advanceTo(demo, demo.createWaveDemo(SEED), 2)
    expect(atWave2.wave, 'reached a non-egg wave').toBe(2)
    expect(hasEgg(atWave2), 'a co-op wave enters ground enemies, not eggs').toBe(false)
    expect(enemyCount(atWave2), 'and it does enter its ground complement').toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// SELF-CLEAR — a settled wave egg must HATCH→remount so an egg wave can progress.
//   RED today: stepEgg leaves a settled egg put forever, so the egg count never
//   moves and the wave is a permanent egg-lock (Dev + Reviewer forward finding).
// ═════════════════════════════════════════════════════════════════════════════
describe('jt4-5 egg wave — settled wave eggs HATCH→remount so the wave is not a permanent egg-lock', () => {
  it('the settled wave eggs eventually hatch (the egg count drops from its entry count)', async () => {
    const demo = await loadDemo()
    const atWave5 = advanceTo(demo, demo.createWaveDemo(SEED), 5)
    const entryEggs = eggCount(atWave5)
    expect(entryEggs, 'the egg wave enters holding a full complement of eggs').toBeGreaterThan(0)
    // The eggs are SETTLED, so nothing but a HATCH can reduce their count (they do not
    // fall off-screen, and egg-catch is not modelled). Drive the sim: a settled wave egg
    // MUST mature into a remount (egg.ts willHatch/remountEntryEdge — cited jt2-4 laws).
    // RED today: `stepEgg` returns a settled egg unchanged, so the count is frozen at
    // its entry value forever and the egg wave can never clear.
    let d = atWave5
    let hatched = false
    for (let f = 1; f <= 1500 && !hatched; f++) {
      d = demo.stepDemo(d)
      if (eggCount(d) < entryEggs) hatched = true
    }
    expect(hatched, 'a settled wave egg hatches within the window — the wave is not egg-locked').toBe(true)
  })

  it('the hatch puts a live buzzard back in play (a remount enemy appears as an egg leaves)', async () => {
    const demo = await loadDemo()
    const atWave5 = advanceTo(demo, demo.createWaveDemo(SEED), 5)
    const entryEggs = eggCount(atWave5)
    // The remount is a buzzard flying back in (the FARTHER-edge remount, egg.ts:285) — a
    // live `enemy` process. So a hatch both DROPS an egg and RAISES an enemy: the wave
    // can now be fought and cleared. Kills "the egg just vanishes (no buzzard remounts)".
    let d = atWave5
    let sawRemount = false
    for (let f = 1; f <= 1500 && !sawRemount; f++) {
      d = demo.stepDemo(d)
      if (eggCount(d) < entryEggs && enemyCount(d) > 0) sawRemount = true
    }
    expect(sawRemount, 'a hatched wave egg remounts a live buzzard (enemy) so the wave can be cleared').toBe(true)
  })
})
