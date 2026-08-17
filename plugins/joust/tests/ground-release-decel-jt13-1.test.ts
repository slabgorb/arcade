// tests/ground-release-decel-jt13-1.test.ts
//
// Story jt13-1 — RED phase (TEA). A landed ostrich with NO direction held must
// shed its stored horizontal velocity, instead of "running in place" and then
// launching at full speed.
//
// ─── THE DEFECT (measured on the live build arcade.slabgorb.com/joust) ───────
// The ground state machine's `onZero` transition for the RUNNING rungs is a
// SELF-LOOP (`PLYCR STATE …,PLYCR,…` — JOUSTRV4.SRC:7165-7168, transcribed
// faithfully into GROUND_STATES). So a bird that lands at speed and then holds
// NEUTRAL keeps its running rung forever: `velXIndex` never decays, the run
// animation cycles with no position change (delta × dir === 0), and the first
// flap launches it across the screen at the landed airspeed. On a stepGround
// probe, `velXIndex` stayed 8 for 12+ centered frames and `takeOff()` carried
// the 8 straight into `stepFlight`.
//
// ─── THE OWNER'S RULING (2026-08-17) ─────────────────────────────────────────
// This DELIBERATELY departs from the ROM self-loop that jt11-3 pinned. The game
// owner, from the real cabinet, ruled:
//   1. Releasing all direction (centered/neutral) SKIDS the stored velocity to 0
//      over a few frames — never an infinite run-in-place.
//   2. BRIEF GRACE: a running landing keeps its momentum for the IMMEDIATE
//      next-frame flap (touch-and-go / flap-hopping still launches at the landed
//      speed); only SUSTAINED centering decays. jt11-3's touch-and-go test
//      (one centered frame → launch at rung speed) therefore stays green and is
//      itself the guard that FORCES the 1-frame grace.
//   3. INSTANT FLIP (in scope): pressing the OPPOSITE direction turns the bird
//      and runs the other way within a frame or two, velocity re-signed — this
//      already works via the onMinus skid chain and must be preserved.
//
// Momentum lives only while a direction is actively held; centered = coast to a
// stop. Grounded on CLIF5 (snapY 210, LNDB5 "lands at all points") so the mount
// stays grounded while it decelerates and turns (the jt2-9 staging).

import { describe, it, expect } from 'vitest'
import {
  loadSim,
  type SimState,
  type SimProcess,
  type EntityState,
} from './helpers/sim-contract.js'
import type { PlayerInput } from './helpers/flight-contract.js'

const SEED = 0x1234_5678
const GROUND_Y = 210 // CLIF5 — lands at all points

function entityAt(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 146,
    posY: GROUND_Y << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: 'PLYFR',
    plantZ: 0,
    airborne: false,
    animPhase: 0,
    ...over,
  }
}

/** A grounded player running at full speed in `facing`, staged on CLIF5. */
function runningPlayer(facing: -1 | 1, over: Partial<EntityState> = {}): SimProcess {
  return {
    id: 1,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing,
    mount: 'ostrich',
    collisionEnabled: true,
    entity: entityAt({ velXIndex: 8 * facing, ...over }),
  }
}

/** An AIRBORNE player descending toward CLIF5 (snapY 210), running at full speed. */
function fallingPlayer(facing: -1 | 1): SimProcess {
  return {
    id: 1,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing,
    mount: 'ostrich',
    collisionEnabled: true,
    // posY 205, velY +0x200 lands on CLIF5 within ~2 frames (measured); velXIndex 8
    // so land() (FRCONV) selects the top run rung PLYFR.
    entity: entityAt({
      posY: 205 << 8,
      velY: 0x200,
      velXIndex: 8 * facing,
      timeUp: 20,
      groundState: null,
      airborne: true,
    }),
  }
}

const only = (d: SimState, procs: SimProcess[]): SimState => ({
  ...d,
  sim: { ...d.sim, processes: procs },
  events: [],
})

const inp = (dir: -1 | 0 | 1, flap = false): PlayerInput => ({ dir, flap, flapHeld: flap })

/** Step `frames` frames threading one fixed input; return player 1 each frame's end. */
async function drive(
  demo: SimState,
  dir: -1 | 0 | 1,
  frames: number,
  flap = false,
): Promise<{ last: SimProcess; trail: SimProcess[] }> {
  const dmod = await loadSim()
  let d = demo
  const trail: SimProcess[] = []
  for (let i = 0; i < frames; i++) {
    d = dmod.stepSim(d, { 1: inp(dir, flap) })
    const p = d.sim.processes.find((q) => q.id === 1)
    if (!p) throw new Error('player 1 vanished mid-drive')
    trail.push(p)
  }
  return { last: trail[trail.length - 1], trail }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1 — SUSTAINED CENTER SKIDS THE STORED VELOCITY TO 0  (the RED core)
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-1 — releasing all direction skids stored velocity to zero', () => {
  it('THE BUG: a running mount held NEUTRAL coasts to velXIndex 0 within a few frames', async () => {
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    const { last, trail } = await drive(only(base, [runningPlayer(1)]), 0, 24)

    const seq = trail.map((p) => p.entity!.velXIndex)
    // Today: seq is [8,8,8,…] forever (PLYFR self-loop) — this is the failing line.
    expect(
      last.entity!.velXIndex,
      `a mount that releases all input must come to rest — got trail ${JSON.stringify(seq)}`,
    ).toBe(0)
  })

  it('the decel walks the FRCONV ladder one rung per frame: [8,6,4,2,0] after a 1-frame grace', async () => {
    // Pin the EXACT ROM ladder (jt13-1 review F2/F5): grace holds the rung on the
    // first neutral frame (8), then one FLYVEL rung sheds per frame
    // PLYFR8→PLYER6→PLYDR4→PLYCR2→PLYBR0. A wrong decay RATE (e.g. 2 rungs/frame,
    // 8→4→0) or a missing/extra hold reddens here — monotonicity + a loose deadline
    // alone did not (a 2-rung skip survived both).
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    const { trail } = await drive(only(base, [runningPlayer(1)]), 0, 8)
    const mags = trail.map((p) => Math.abs(p.entity!.velXIndex))

    // Exact leading trail — grace(8), then one rung per frame to rest, then held.
    expect(mags.slice(0, 6), 'FRCONV ladder, one rung per neutral frame after grace').toEqual([
      8, 6, 4, 2, 0, 0,
    ])
    // Reaches a dead stop at frame index 4 (the 5th neutral frame); bound is tight,
    // not a 5x-loose backstop. `<= FRCONV.length` derives the ceiling from the ladder.
    const zeroBy = mags.findIndex((m) => m === 0)
    expect(zeroBy, 'must reach a dead stop, not self-loop forever').toBeGreaterThanOrEqual(0)
    expect(zeroBy, 'a full-speed runner stops in one FRCONV ladder length').toBeLessThanOrEqual(5)
  })

  it('once stopped it STAYS stopped under continued neutral (no drift, no re-launch of speed)', async () => {
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    const { last } = await drive(only(base, [runningPlayer(1)]), 0, 40)
    expect(last.entity!.velXIndex, 'a standing mount holds 0').toBe(0)
    expect(last.entity!.airborne, 'still grounded').toBe(false)
  })

  it('leftward runner coasts to 0 too — the fix is sign-agnostic', async () => {
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    const { last } = await drive(only(base, [runningPlayer(-1)]), 0, 24)
    expect(last.entity!.velXIndex, 'a left-facing runner also skids to rest').toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 — NO LAUNCH FLING FROM A STANDSTILL  (RED, end to end)
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-1 — a mount that skidded to rest launches with no horizontal fling', () => {
  it('THE BUG: coast to a stop, then flap — the launch drifts ~0 px, not across the screen', async () => {
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)

    // Release for long enough to reach a dead stop.
    let d = only(base, [runningPlayer(1)])
    for (let i = 0; i < 24; i++) d = dmod.stepSim(d, { 1: inp(0) })
    const rest = d.sim.processes.find((q) => q.id === 1)!
    expect(rest.entity!.velXIndex, 'precondition: at rest before flapping').toBe(0)

    // Flap off from rest, then glide 8 frames with no direction held.
    const startX = rest.entity!.posX
    d = dmod.stepSim(d, { 1: inp(0, true) })
    for (let i = 0; i < 8; i++) d = dmod.stepSim(d, { 1: inp(0) })
    const flown = d.sim.processes.find((q) => q.id === 1)!
    const drift = Math.abs(flown.entity!.posX - startX)
    // Today velXIndex survives at 8, so FLYX[+8] flings it ~24px; from rest it is ~0.
    expect(drift, `a rest launch must not fling horizontally — drifted ${drift}px`).toBeLessThanOrEqual(2)
  })

  it('CONTROL: a mount launched while HOLDING a direction DOES travel (discriminates the test)', async () => {
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    let d = only(base, [runningPlayer(1)])
    const startX = d.sim.processes.find((q) => q.id === 1)!.entity!.posX
    // Flap off while still holding RIGHT — momentum is real here.
    d = dmod.stepSim(d, { 1: inp(1, true) })
    for (let i = 0; i < 8; i++) d = dmod.stepSim(d, { 1: inp(1) })
    const flown = d.sim.processes.find((q) => q.id === 1)!
    expect(
      flown.entity!.posX - startX,
      'a held-direction launch keeps its momentum — this is NOT the bug',
    ).toBeGreaterThan(4)
  })

  it('LEFT mirror: a left-facing runner that skids to rest also launches with no fling', async () => {
    // jt13-1 review F6 — the no-fling fix must be sign-agnostic, the same way
    // section 1 mirrors left/right. A left-only launch-sign bug (e.g. a stale
    // velXFrac/facing sign surviving on the left branch) would pass the rightward
    // case above and only fail here.
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    let d = only(base, [runningPlayer(-1)])
    for (let i = 0; i < 24; i++) d = dmod.stepSim(d, { 1: inp(0) })
    const rest = d.sim.processes.find((q) => q.id === 1)!
    expect(rest.entity!.velXIndex, 'precondition: left runner at rest before flapping').toBe(0)

    const startX = rest.entity!.posX
    d = dmod.stepSim(d, { 1: inp(0, true) })
    for (let i = 0; i < 8; i++) d = dmod.stepSim(d, { 1: inp(0) })
    const flown = d.sim.processes.find((q) => q.id === 1)!
    expect(
      Math.abs(flown.entity!.posX - startX),
      'a rest launch (left facing) must not fling horizontally either',
    ).toBeLessThanOrEqual(2)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 — GRACE + PRESERVED BEHAVIOUR  (guards: green today, must STAY green)
// ─────────────────────────────────────────────────────────────────────────────
describe('jt13-1 guards — the fix must not overshoot', () => {
  it('GRACE: one centered frame HOLDS the rung, so touch-and-go keeps its speed', async () => {
    // The 1-frame grace: a single neutral frame must not have decayed the rung
    // yet (this is what lets flap-hopping launch at the landed speed — and what
    // keeps jt11-3's touch-and-go test green).
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    const { last } = await drive(only(base, [runningPlayer(1)]), 0, 1)
    expect(
      Math.abs(last.entity!.velXIndex),
      'the FIRST neutral frame is grace — the rung is held, not yet decayed',
    ).toBe(8)
  })

  it('HELD direction keeps running: holding RIGHT sustains speed and travels', async () => {
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    const { last, trail } = await drive(only(base, [runningPlayer(1)]), 1, 12)
    expect(Math.abs(last.entity!.velXIndex), 'holding a direction never decays').toBe(8)
    expect(
      last.entity!.posX,
      'a running mount that holds its direction actually travels',
    ).toBeGreaterThan(trail[0].entity!.posX)
  })

  it('INSTANT FLIP (in scope): running right, press LEFT — turns and runs left within 2 frames', async () => {
    // jt13-1 review F7 — scope note: the flip itself rides PRE-EXISTING code (the
    // onMinus skid-chain routing + `nextFacing = sign(dir)`), which the coast change
    // does NOT touch (coast is only read when `input.dir === 0`). So this is a
    // REGRESSION GUARD proving the coast change did not collaterally break the
    // owner's in-scope instant-flip requirement — not a test of new coast logic.
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)
    const { trail } = await drive(only(base, [runningPlayer(1)]), -1, 3)
    const p = trail[1] // by the 2nd frame
    expect(p.facing, 'the bird has turned to face left').toBe(-1)
    expect(p.entity!.velXIndex, 'velocity is re-signed leftward').toBeLessThan(0)
    expect(
      trail[2].entity!.posX,
      'and it is moving left (posX decreasing)',
    ).toBeLessThan(trail[0].entity!.posX)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 — TOUCH-AND-GO GRACE THROUGH A REAL LANDING  (jt13-1 review F1)
// ─────────────────────────────────────────────────────────────────────────────
// The owner's ruling: a running landing keeps its momentum for the IMMEDIATE
// next-frame flap. This is carried by frame.ts's `wasAirborne ? 0` reset of the
// coast counter — the landing frame does NOT consume the grace. Every other
// jt13-1 test seeds an already-grounded runner (wasAirborne always false), so
// this is the ONLY test that drives a REAL airborne→grounded landing through
// stepSim and exercises that branch. Deleting `|| wasAirborne` from frame.ts
// reddens the final assertion here (the launch decays to rung 6 instead of 8).
describe('jt13-1 — touch-and-go after a real landing keeps the landed momentum', () => {
  it('land at full speed via the airborne path, flap on the very next frame → launch at the landed rung', async () => {
    const dmod = await loadSim()
    const base = dmod.createWaveSim(SEED)

    // Fall onto CLIF5 holding NO direction; drive until the landing frame.
    let d = only(base, [fallingPlayer(1)])
    let landed = false
    for (let i = 0; i < 20 && !landed; i++) {
      d = dmod.stepSim(d, { 1: inp(0) })
      const p = d.sim.processes.find((q) => q.id === 1)!
      if (!p.entity!.airborne) landed = true
    }
    const onGround = d.sim.processes.find((q) => q.id === 1)!
    expect(landed, 'the faller must reach CLIF5 and land').toBe(true)
    expect(onGround.entity!.groundState, 'FRCONV selects the top rung for a full-speed landing').toBe('PLYFR')
    expect(onGround.entity!.velXIndex, 'land() seeds the full landed rung speed').toBe(8)

    // THE IMMEDIATE next frame: flap. The 1-frame landing grace must hold, so the
    // launch keeps the full landed speed — not a decayed rung.
    d = dmod.stepSim(d, { 1: inp(0, true) })
    const launched = d.sim.processes.find((q) => q.id === 1)!
    expect(launched.entity!.airborne, 'the flap took off').toBe(true)
    expect(
      launched.entity!.velXIndex,
      'touch-and-go keeps the landed momentum — the landing frame must not consume the grace',
    ).toBe(8)
  })
})
