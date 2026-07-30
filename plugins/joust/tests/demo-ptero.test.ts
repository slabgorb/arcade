// tests/demo-ptero.test.ts
//
// Story jt3-4 — RED phase (Leeloo / TEA). THE PTERO WAVE TYPE GOES LIVE in the demo
// (the architect ruling: "the PTERODACTYL wave type goes live on jt2-5's WJSRTB
// skeleton"). jt2-5 routed the ptero dispatch but demo.ts filled a ptero wave's
// slots with 'bounder' (demo.ts:287 "Pterodactyls carry no scored DVALUE type … are
// filled with 'bounder'") — an inert placeholder. This file pins the placeholder
// being replaced by real ptero spawning driven by the wave table's ptero nibble.
//
//   • BEFORE the first ptero wave (waves 1–7, nibble 0) the demo spawns NO ptero.
//   • AT wave 8 (the FIRST ptero wave, nibble 1 — committed jt2-5 data) the demo
//     spawns exactly ONE `kind:'ptero'` process, from the nibble, through the
//     dispatch. A Dev who leaves the placeholder (fills with 'bounder') reddens.
//
// The demo module already exists, so these are BEHAVIOUR reds (the demo does not yet
// spawn pteros), not feature-absent throws — the right kind of red for a wiring pin.
// (The pure spawn-count law + the FLYXP flight + the kill window live in
// tests/ptero.test.ts / tests/ptero-source.test.ts.)

import { describe, it, expect } from 'vitest'
import { loadDemo, type DemoState, type DemoProcess } from './helpers/demo-contract.js'
import { loadWave } from './helpers/wave-contract.js'

const SEED = 0x1234

/**
 * Force ONE wave advance (the demo-troll.test.ts pattern): strip the live
 * enemies/eggs/pteros so the wave is "cleared", keep the players, and step once —
 * stepDemo advances the wave and spawns the new wave's complement.
 */
function forceAdvance(step: (d: DemoState) => DemoState, demo: DemoState): DemoState {
  const players = demo.sim.processes.filter((p: DemoProcess) => p.kind === 'player')
  const stripped: DemoState = { ...demo, sim: { ...demo.sim, processes: players } }
  return step(stripped)
}

/** Advance the demo (clearing each wave) until it reaches `target`. */
function advanceTo(step: (d: DemoState) => DemoState, demo: DemoState, target: number): DemoState {
  let d = demo
  let guard = 0
  while (d.wave < target) {
    d = forceAdvance(step, d)
    if (++guard > 50) throw new Error(`stuck advancing to wave ${target} at wave ${d.wave}`)
  }
  return d
}

const pteroCount = (d: DemoState): number => d.sim.processes.filter((p) => p.kind === 'ptero').length

describe('jt3-4 — the ptero wave type spawns pteros in the demo, from the nibble', () => {
  it('the committed table anchors: wave 8 is the first ptero wave (1 ptero)', async () => {
    const w = await loadWave()
    expect(w.WAVE_TABLE[7].pterodactyls, 'wave 8 carries one ptero').toBe(1)
    for (let i = 0; i < 7; i++) {
      expect(w.WAVE_TABLE[i].pterodactyls, `wave ${i + 1} carries no ptero`).toBe(0)
    }
  })

  it('a fresh wave-1 demo spawns NO ptero (nibble 0)', async () => {
    const demo = await loadDemo()
    const d = demo.createWaveDemo(SEED)
    expect(d.wave).toBe(1)
    expect(pteroCount(d), 'wave 1 has no pterodactyls').toBe(0)
  })

  it('driving up to wave 7 still spawns NO ptero — the dispatch gates it', async () => {
    const demo = await loadDemo()
    const d = advanceTo(demo.stepDemo, demo.createWaveDemo(SEED), 7)
    expect(d.wave).toBe(7)
    expect(pteroCount(d), 'wave 7 (nibble 0) spawns no ptero').toBe(0)
  })

  it('AT wave 8 the demo spawns exactly ONE ptero — the placeholder is replaced', async () => {
    const demo = await loadDemo()
    const d = advanceTo(demo.stepDemo, demo.createWaveDemo(SEED), 8)
    expect(d.wave).toBe(8)
    expect(pteroCount(d), "wave 8's ptero nibble (1) spawns one kind:'ptero' process").toBe(1)
  })

  it('the spawned ptero is NOT a scored ground enemy (no bounder/hunter/lord DVALUE type)', async () => {
    // The demo.ts:287 placeholder filled ptero slots with 'bounder'. A real ptero is a
    // PTEID process, not a scored ground enemy — so no ptero process carries an enemyType.
    const demo = await loadDemo()
    const d = advanceTo(demo.stepDemo, demo.createWaveDemo(SEED), 8)
    const pteros = d.sim.processes.filter((p) => p.kind === 'ptero')
    expect(pteros.length).toBe(1)
    for (const pt of pteros) {
      expect(pt.enemyType, 'a ptero has no bounder/hunter/lord DVALUE type').toBeUndefined()
    }
  })
})
