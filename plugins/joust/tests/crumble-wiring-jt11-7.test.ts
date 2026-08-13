// tests/crumble-wiring-jt11-7.test.ts
//
// Story jt11-7 — RED phase (O'Brien / TEA). AC-4, THE VISIBLE TRANSITION. The
// core state machine (crumble-jt11-7.test.ts) is inert until something drives it;
// this suite pins the WIRING through the public drawList boundary — a destroyed
// cliff plays its CLFDES crumble in the gap jt11-5 opened, instead of blinking out.
//
// ─── THE jt11-5 CONSTRAINT (do not regress it) ───────────────────────────────
// jt11-5 committed: at wave 6 (WSTATUS $41), `arena.destroyedCliffs === ['CLIF2']`
// and drawList drops CLIF2's `kind:'arena'` records at once (lava-shore-jt11-5,
// AC-3). That is WCLFEW clearing the RAM bit (JOUSTRV4.SRC:2301-2325) — immediate,
// and it stays. CLFDES (:4562-4599) is a SEPARATE routine that animates OVER the
// vacated space. So the crumble is an ADDITIVE overlay of a NEW op kind
// (`kind:'crumble'`), never a re-addition of the cliff's arena records — a
// `kind === 'arena'` filter cannot see it, and jt11-5 stays green. What jt11-7
// adds is that the space is not instantly EMPTY: for the CLFDES duration a
// crumble overlay animates there, then it too is gone.
//
// ─── DRIVING MECHANICS (jt11-5's, reused verbatim) ───────────────────────────
// forceAdvance / demoAtWave are lava-shore-jt11-5.test.ts's helpers: strip to
// players to force a clear, step once — stepSim advances the wave and re-applies
// applyWaveDestruction. Reaching wave 6 destroys CLIF2 on the final advance, so
// the returned sim carries a freshly-spawned CLIF2 crumble.

import { describe, it, expect } from 'vitest'
import { loadSim, type SimState, type SimProcess, type DrawOp } from './helpers/sim-contract.js'
import { loadCrumble } from './helpers/crumble-contract.js'

const SEED = 0x1234

/** Force ONE wave advance (lava-shore-jt11-5, verbatim). */
function forceAdvance(step: (d: SimState) => SimState, demo: SimState): SimState {
  const players = demo.sim.processes.filter((p: SimProcess) => p.kind === 'player')
  const stripped: SimState = { ...demo, sim: { ...demo.sim, processes: players } }
  return step(stripped)
}

/** A fresh demo advanced to `wave` through the real wave-event path. */
async function demoAtWave(
  demo: Awaited<ReturnType<typeof loadSim>>,
  wave: number,
): Promise<SimState> {
  let d = demo.createWaveSim(SEED)
  while (d.wave < wave) d = forceAdvance(demo.stepSim, d)
  return d
}

// A crumble overlay op, widened past the jt11-5 DrawOp union so this file typechecks
// before Dev adds the `kind:'crumble'` variant to sim.ts.
interface MaybeCrumbleOp {
  kind: string
  cliff?: string
  phase?: string
  frame?: number
}
const crumbleOpsFor = (ops: DrawOp[], cliff: string): MaybeCrumbleOp[] =>
  (ops as unknown as MaybeCrumbleOp[]).filter((o) => o.kind === 'crumble' && o.cliff === cliff)
const anyCrumbleOps = (ops: DrawOp[]): MaybeCrumbleOp[] =>
  (ops as unknown as MaybeCrumbleOp[]).filter((o) => o.kind === 'crumble')
/** jt11-5's arena-op name projection — used to reassert the no-regression law. */
const arenaNames = (ops: DrawOp[]): string[] =>
  ops.filter((op) => op.kind === 'arena').map((op) => op.name)

// ─────────────────────────────────────────────────────────────────────────────
// AC-4a — THE TRANSITION IS VISIBLE. A freshly-destroyed cliff surfaces a
// crumble overlay through drawList; the space is animating, not blank.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4a — a destroyed cliff surfaces a crumble overlay', () => {
  it('wave 6 destroys CLIF2 AND drawList emits a crumble overlay for it', async () => {
    const demo = await loadSim()
    const d6 = await demoAtWave(demo, 6)
    // premise, straight from jt11-5 (must still hold):
    expect(d6.arena.destroyedCliffs, 'wave 6 → CLIF2 destroyed').toEqual(['CLIF2'])
    // jt11-7: the destroyed space is not blank — a crumble overlay animates there.
    const crumbles = crumbleOpsFor(demo.drawList(d6), 'CLIF2')
    expect(
      crumbles.length,
      'drawList emits a kind:crumble overlay for the just-destroyed CLIF2',
    ).toBeGreaterThan(0)
  })

  it('the overlay carries a CLFDES phase and frame (shake first)', async () => {
    const demo = await loadSim()
    const d6 = await demoAtWave(demo, 6)
    const [op] = crumbleOpsFor(demo.drawList(d6), 'CLIF2')
    expect(op, 'a crumble op exists on the destruction frame').toBeDefined()
    expect(op.phase, 'a fresh crumble is in the SHAKE phase').toBe('shake')
    expect(typeof op.frame, 'and carries a numeric frame index').toBe('number')
  })

  it('the overlay does NOT re-add CLIF2 arena records — jt11-5 stays green', async () => {
    const demo = await loadSim()
    const d6 = await demoAtWave(demo, 6)
    const names = arenaNames(demo.drawList(d6))
    // The crumble is a SEPARATE kind; CLIF2's arena records remain dropped.
    expect(names, 'CSRC2 stays gone (jt11-5 AC-3 unbroken)').not.toContain('CSRC2')
    expect(names, 'an intact cliff still draws its arena record').toContain('CSRC1L')
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4b — THE TRANSITION ENDS. The overlay is temporary: once the CLFDES budget
// elapses the space is finally empty (parity with jt11-5's steady-state).
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4b — the crumble overlay settles to nothing', () => {
  it('after the CLFDES budget the crumble overlay is gone', async () => {
    const demo = await loadSim()
    const c = await loadCrumble()
    const budget = c.CRUMBLE_SHAKE_COUNT * c.CRUMBLE_SHAKE_NAPS +
      c.CRUMBLE_DEBRIS_FRAME_COUNT * c.CRUMBLE_DEBRIS_FRAME_NAPS
    let d = await demoAtWave(demo, 6)
    expect(crumbleOpsFor(demo.drawList(d), 'CLIF2').length, 'present at the start').toBeGreaterThan(0)
    // step past the whole animation (generous slack), players idle so the wave
    // does not advance and re-arm a crumble.
    for (let i = 0; i < budget + 40; i++) d = demo.stepSim(d, {})
    expect(
      crumbleOpsFor(demo.drawList(d), 'CLIF2').length,
      'the overlay is gone once the CLFDES budget elapses',
    ).toBe(0)
    expect(d.arena.destroyedCliffs, 'and CLIF2 is still destroyed (the end-state)').toEqual([
      'CLIF2',
    ])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4c — THE INDESTRUCTIBLE ISLAND NEVER CRUMBLES. CLIF5 has no WBCLS bit
// (arena-state.ts, the CLIFF_DESTRUCTION WBCLS note); it must never spawn a crumble overlay.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4c — CLIF5 never crumbles', () => {
  it('a pristine arena has no crumble overlay at all', async () => {
    const demo = await loadSim()
    const fresh = demo.createWaveSim(SEED)
    expect(fresh.arena.destroyedCliffs, 'nothing destroyed yet').toEqual([])
    expect(anyCrumbleOps(demo.drawList(fresh)).length, 'no crumble on an intact arena').toBe(0)
  })

  it('the indestructible island CLIF5 never appears as a crumbling cliff', async () => {
    const demo = await loadSim()
    // Sweep several waves; CLIF5 must never surface a crumble op.
    for (const wave of [3, 4, 6]) {
      const d = await demoAtWave(demo, wave)
      const cliffs = anyCrumbleOps(demo.drawList(d)).map((o) => o.cliff)
      expect(cliffs, `wave ${wave}: CLIF5 is indestructible, never crumbles`).not.toContain('CLIF5')
    }
  })
})
