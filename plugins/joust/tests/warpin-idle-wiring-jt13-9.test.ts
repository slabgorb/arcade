// tests/warpin-idle-wiring-jt13-9.test.ts
//
// Story jt13-9 — RED phase (Han Solo / TEA). THE WIRING. The pure idle-cycle state
// machine (warpin-idle-jt13-9.test.ts) is inert until stepSim runs it. jt13-2 wired
// the 30-frame grow-in: `advanceWarpIn` steps `p.warpIn` each frame and `drawList`
// overlays a `kind:'warpin'` op while `!p.warpIn.done` (both in sim.ts).
// Today, the instant the grow-in's `done` flips, BOTH stop — the arrival just becomes
// a normal opaque entity. The ROM does not: at that seam it runs the wait-for-first-
// move idle colour-cycle (:5805-5890) before PLYINT.
//
// This suite pins that seam end-to-end through the REAL pipeline (not by hand-poking
// state): a materialising arrival, stepped past its grow-in, must carry an ACTIVE idle
// cycle that stepSim then advances to its terminal 'timed-out'. Without the wiring the
// idle cycle never opens (this reddens) even if the pure module is perfect — the guard
// that keeps GREEN from shipping a module nothing calls.

import { describe, it, expect } from 'vitest'
import { loadSim, type SimState, type SimProcess } from './helpers/sim-contract.js'

const SEED = 0x1234

const materialisingEnemies = (procs: readonly SimProcess[]): SimProcess[] =>
  procs.filter((p) => p.kind === 'enemy' && p.collisionEnabled === false)

/** Drive a seeded 1P game until at least one enemy is on its pad materialising (collisions off). */
async function driveToMaterialisingEnemy(
  demo: Awaited<ReturnType<typeof loadSim>>,
  maxFrames = 240,
): Promise<{ d: SimState; id: number } | null> {
  let d: SimState = demo.createWaveSim(SEED, 1)
  for (let f = 0; f < maxFrames; f++) {
    const enemies = materialisingEnemies(d.sim.processes)
    if (enemies.length > 0) return { d, id: enemies[0].id }
    d = demo.stepSim(d, {})
  }
  return null
}

describe('jt13-9 — stepSim opens the idle cycle when the grow-in ends, then times it out', () => {
  it('a materialising enemy, stepped past its warp-in with no input, carries an active idle cycle', async () => {
    const demo = await loadSim()
    const hit = await driveToMaterialisingEnemy(demo)
    expect(hit, 'a materialising enemy was found within the opening frames').not.toBeNull()

    // Step past the 30-frame TREFF grow-in (no input → no early abort). The idle cycle
    // opens exactly when p.warpIn.done flips — allow a few extra frames for the seam.
    let d = hit!.d
    let opened: SimProcess | undefined
    for (let i = 0; i < 60; i++) {
      d = demo.stepSim(d, {})
      const p = d.sim.processes.find((q) => q.id === hit!.id)
      if (p?.warpIn?.done && p.idleCycle) {
        opened = p
        break
      }
    }
    expect(
      opened,
      'once the grow-in finishes, the sim opens a TREFF phase-2 idle cycle on the arrival ' +
        '(sim.ts advanceWarpIn seam) — today nothing runs after warpIn.done, so this stays undefined',
    ).toBeDefined()
    expect(opened!.warpIn?.done, 'the grow-in has finished').toBe(true)
    expect(opened!.idleCycle?.end, 'the idle cycle is running').toBe('active')
  })

  it('with no first move, stepSim advances the idle cycle all the way to timed-out', async () => {
    const demo = await loadSim()
    const hit = await driveToMaterialisingEnemy(demo)
    expect(hit, 'a materialising enemy was found').not.toBeNull()

    // Grow-in (30) + the whole idle wait (~376 naps) + slack; an enemy never flaps, so
    // the phase must reach its natural timeout rather than hanging forever.
    let d = hit!.d
    let ended: SimProcess['idleCycle'] | undefined
    for (let i = 0; i < 600; i++) {
      d = demo.stepSim(d, {})
      const p = d.sim.processes.find((q) => q.id === hit!.id)
      if (p?.idleCycle && p.idleCycle.end !== 'active') {
        ended = p.idleCycle
        break
      }
      // If the arrival left the sim (jousted/despawned) the guard is moot — stop.
      if (!p) break
    }
    expect(ended, 'the idle cycle reached a terminal state within the frame budget').toBeDefined()
    expect(ended!.end, 'an un-flapping arrival times out (PFEET halves to 0), it does not hang').toBe(
      'timed-out',
    )
  })
})
