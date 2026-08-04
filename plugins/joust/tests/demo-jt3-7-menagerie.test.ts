// tests/demo-jt3-7-menagerie.test.ts
//
// Story jt3-7 — RED phase (Leeloo / TEA). AC-1: the full ecosystem goes LIVE in the
// demo. jt3-4/3-5/3-6 landed the ptero / baiter / troll / dissolve as pure cores,
// but they are INERT — frame.ts runBehaviour dispatches no ptero/dissolve step, and
// collisionPass filters to player/enemy. This file pins the wiring that makes them
// hunt, die, and dissolve on the playable slice.
//
// These are BEHAVIOUR reds against an EXISTING module (the demo is built), not
// feature-absent throws — the right kind of red for an integration pin. Each red is
// a seam GREEN must build:
//   • frame.ts runBehaviour dispatches stepPteroFlight (the ptero flies, gravity-exempt);
//   • collisionPass resolves ptero combat via resolvePteroAttack (the lance-height kill);
//   • the ptero death → dissolve transition (jt3-6), not the interim poof;
//   • frame.ts runBehaviour dispatches stepDissolve (the dissolve advances in-scheduler);
//   • drawList renders the ptero / troll / dissolve kinds (POSOFF-placed);
//   • the troll goes live off CLIF5 at the troll wave once the bridge has burned.
//
// THE PROCESS-KIND CONTRACT this file writes to (the natural, minimal extension of
// the jt2-1 tagged union; documented for Dev in the Delivery Finding):
//   kind: 'ptero'    — carries `entity` (flight state) + `facing`; the wave-type
//                      ptero AND the baiter (PCHASE=-1) share it.
//   kind: 'troll'    — the lava-troll hand grabbing off CLIF5 (renders a GRAB frame).
//   kind: 'dissolve' — carries `dissolve` (a jt3-6 DissolveState) + `entity` for
//                      position; the ptero/baiter death fate (renders a PTERA frame).

import { describe, it, expect } from 'vitest'
import {
  loadDemo,
  loadDemoRender,
  type DemoState,
  type DemoProcess,
  type EntityState,
} from './helpers/demo-contract.js'
import { loadPtero } from './helpers/ptero-contract.js'
import { loadDissolve } from './helpers/dissolve-contract.js'

const SEED = 0x1234

const PTERO_FRAMES = new Set(['PT1R', 'PT2R', 'PT3R', 'PT1L', 'PT2L', 'PT3L'])
const TROLL_FRAMES = new Set(['GRAB1', 'GRAB2', 'GRAB3', 'GRAB4', 'GRAB5', 'GRAB6'])
const DISSOLVE_FRAMES = new Set(['PTERA1', 'PTERA2', 'PTERA3', 'ASH1R', 'ASH1L'])

function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 50,
    posY: 100 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
    ...over,
  }
}

const only = (d: DemoState, procs: DemoProcess[]): DemoState => ({
  ...d,
  sim: { ...d.sim, processes: procs },
  events: [],
})

function forceAdvance(step: (d: DemoState) => DemoState, demo: DemoState): DemoState {
  const players = demo.sim.processes.filter((p: DemoProcess) => p.kind === 'player')
  return step({ ...demo, sim: { ...demo.sim, processes: players } })
}

function advanceTo(step: (d: DemoState) => DemoState, demo: DemoState, target: number): DemoState {
  let d = demo
  let guard = 0
  while (d.wave < target) {
    d = forceAdvance(step, d)
    if (++guard > 50) throw new Error(`stuck advancing to wave ${target} at wave ${d.wave}`)
  }
  return d
}

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 (i) — THE PTERO FLIES: frame.ts dispatches stepPteroFlight, gravity-exempt.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — a live ptero is stepped by stepPteroFlight (gravity-exempt)', () => {
  it('a ptero with a downward VY moves posY by exactly VY — no gravity added (RED: inert today)', async () => {
    const demo = await loadDemo()
    // A ptero carrying its own flight state (the kind:'ptero' contract). velY is a
    // deliberate downward 1px/frame; the gravity-EXEMPT integrate moves posY by
    // exactly velY and leaves velY untouched (JOUSTRV4.SRC:1506 "NO GRAVITY!").
    const VY = 0x0100
    const START_Y = 100 << 8
    const ptero: DemoProcess = {
      id: 0x0880,
      cls: 'secondary',
      nap: 1,
      period: 1,
      kind: 'ptero',
      collisionEnabled: true,
      facing: 1,
      entity: entity({ posY: START_Y, velY: VY }),
    }
    const stepped = demo.stepDemo(only(demo.createWaveDemo(SEED), [ptero]))
    const out = stepped.sim.processes.find((p) => p.kind === 'ptero')
    expect(out?.entity, 'the ptero must still carry its flight state').toBeTruthy()
    // Inert today: runBehaviour has no 'ptero' branch, so posY is UNCHANGED (delta 0).
    // Dispatched: posY = START_Y + VY (gravity-exempt integrate).
    expect(out!.entity!.posY - START_Y, 'the ptero integrates posY by VY (stepPteroFlight dispatched)').toBe(VY)
    expect(out!.entity!.velY, 'and VY is unchanged — the ptero ignores GRAV (gravity-exempt)').toBe(VY)
  })

  it('a MOUNT with the same VY DOES gain gravity — the ptero exemption is a real divergence', async () => {
    // The baseline: a player mount stepped one frame gains GRAV (its posY delta is
    // NOT a clean VY). This is the control that makes the ptero test meaningful —
    // "posY += VY exactly" is only special because the mount does something else.
    const demo = await loadDemo()
    const VY = 0x0100
    const START_Y = 100 << 8
    const mount: DemoProcess = {
      id: 1,
      cls: 'primary',
      nap: 1,
      period: 1,
      kind: 'player',
      facing: 1,
      mount: 'ostrich',
      collisionEnabled: true,
      entity: entity({ posX: 146, posY: START_Y, velY: VY }),
    }
    const stepped = demo.stepDemo(only(demo.createWaveDemo(SEED), [mount]))
    const out = stepped.sim.processes.find((p) => p.kind === 'player')
    expect(out!.entity!.velY, 'the mount gains gravity (velY grows past VY)').toBeGreaterThan(VY)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 (ii) — THE PTERO KILL: collisionPass routes a player↔ptero contact through
//   resolvePteroAttack, and a lance-height match kills the ptero for PTERO_SCORE.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — collisionPass resolves the ptero lance-height joust (RED: filtered out today)', () => {
  /**
   * A clean glide-frame kill: player lance at offset 9 (band 10±2), OPPOSITE
   * facings, the player facing INTO the ptero. All velocities zero so the one-frame
   * step before the collision pass does not shift them out of the band.
   *
   * jt9-14 re-seat: was offset 10 (player posY 110). The player-vs-ptero pass now
   * runs narrowPhase after broadPhase (the ROM's BPCOL→OSTHIT gate,
   * JOUSTRV4.SRC:4944-4952), and the CWNG3R×PT1RC masks overlap only at lanceOffset
   * 8-9, so offset 10 became a mask MISS. Offset 9 is in the band AND the mask —
   * green on the pre- and post-jt9-14 tree alike. See demo-jt9-14.test.ts.
   */
  function killScenario(): { player: DemoProcess; ptero: DemoProcess } {
    const player: DemoProcess = {
      id: 1,
      cls: 'primary',
      nap: 1,
      period: 1,
      kind: 'player',
      facing: 1, // faces RIGHT, into the ptero to its right
      mount: 'ostrich',
      collisionEnabled: true,
      entity: entity({ posX: 100, posY: 109 << 8, airborne: true }),
    }
    const ptero: DemoProcess = {
      id: 0x0880,
      cls: 'secondary',
      nap: 1,
      period: 1,
      kind: 'ptero',
      facing: -1, // opposite the player
      collisionEnabled: true,
      // 4px right of the player (broad-phase overlap), 9px above its feet-line
      // reference: lanceOffset = plantZ(0) + 109 − 100 = 9 → in the glide band AND
      // the CWNG3R×PT1RC narrowPhase mask.
      entity: entity({ posX: 104, posY: 100 << 8, airborne: true }),
    }
    return { player, ptero }
  }

  it('a lance-height, opposite-facing, facing-into contact emits a PTERO_SCORE (1000) kill event', async () => {
    const demo = await loadDemo()
    const ptero = await loadPtero()
    const { player, ptero: pt } = killScenario()
    const stepped = demo.stepDemo(only(demo.createWaveDemo(SEED), [player, pt]))
    const scored = stepped.events.filter((e) => e.kind === 'score')
    expect(
      scored.some((e) => (e as { value: number }).value === ptero.PTERO_SCORE),
      `the ptero kill must surface a ${ptero.PTERO_SCORE}-point score event (resolvePteroAttack), not be filtered out`,
    ).toBe(true)
  })

  it('and the ptero does not survive the contact as a live hunting ptero', async () => {
    const demo = await loadDemo()
    const { player, ptero: pt } = killScenario()
    const stepped = demo.stepDemo(only(demo.createWaveDemo(SEED), [player, pt]))
    const livePteros = stepped.sim.processes.filter((p) => p.kind === 'ptero')
    expect(livePteros.length, 'the killed ptero is no longer a live ptero (it dies/dissolves)').toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 (iii) — DEATH → DISSOLVE (jt3-6 wired), not the interim poof / instant vanish.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — a killed ptero enters the dissolve, rendered, not vanished (RED)', () => {
  it('the frame after the kill renders a dissolve frame at the body (not gone, not a poof)', async () => {
    const demo = await loadDemo()
    const r = await loadDemoRender()
    const player: DemoProcess = {
      id: 1, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1,
      mount: 'ostrich', collisionEnabled: true,
      // jt9-14 re-seat 110→109 (lanceOffset 9): in the glide band AND the
      // CWNG3R×PT1RC narrowPhase mask the pass now consults.
      entity: entity({ posX: 100, posY: 109 << 8, airborne: true }),
    }
    const ptero: DemoProcess = {
      id: 0x0880, cls: 'secondary', nap: 1, period: 1, kind: 'ptero', facing: -1,
      collisionEnabled: true, entity: entity({ posX: 104, posY: 100 << 8, airborne: true }),
    }
    const stepped = demo.stepDemo(only(demo.createWaveDemo(SEED), [player, ptero]))
    const ops = r.drawList(stepped).filter((o) => o.kind === 'entity')
    // The body must dissolve, not vanish: a dissolve-frame op is present, and the
    // body is no longer rendered as a live ptero frame.
    expect(
      ops.some((o) => DISSOLVE_FRAMES.has(o.name)),
      'the killed ptero renders a dissolve frame (PTERA1/2/3), replacing the interim poof',
    ).toBe(true)
    expect(
      ops.some((o) => PTERO_FRAMES.has(o.name)),
      'and is NOT still drawn as a live flying ptero',
    ).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 (iv) — THE DISSOLVE ADVANCES IN-SCHEDULER: frame.ts dispatches stepDissolve.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — a dissolve process advances through the scheduler (RED: no dispatch today)', () => {
  it('one stepDemo wakes a dissolve process and steps its DissolveState (nap decrements)', async () => {
    const demo = await loadDemo()
    const dissolve = await loadDissolve()
    // A dissolving body — the kind:'dissolve' contract. Woken every frame (nap 1),
    // stepDissolve should decrement its frame nap from DISSOLVE_FRAME_NAPS toward 0.
    const start = dissolve.startDissolve()
    const proc = {
      id: 0x0980, cls: 'secondary', nap: 1, period: 1, kind: 'dissolve',
      dissolve: start, entity: entity({ posX: 50, posY: 100 << 8 }),
    } as unknown as DemoProcess
    const stepped = demo.stepDemo(only(demo.createWaveDemo(SEED), [proc]))
    const out = stepped.sim.processes.find((p) => p.kind === 'dissolve') as
      | (DemoProcess & { dissolve?: { nap: number; frame: number; done: boolean } })
      | undefined
    expect(out?.dissolve, 'the dissolve process must survive the step carrying its state').toBeTruthy()
    // Inert today: runBehaviour has no 'dissolve' branch, so nap stays at the start
    // value. Dispatched: stepDissolve ran and the nap counted down.
    expect(out!.dissolve!.nap, 'stepDissolve must have advanced the frame nap').toBeLessThan(start.nap)
  })

  it('across a full run the dissolve completes and the body is removed', async () => {
    const demo = await loadDemo()
    const dissolve = await loadDissolve()
    const proc = {
      id: 0x0980, cls: 'secondary', nap: 1, period: 1, kind: 'dissolve',
      dissolve: dissolve.startDissolve(), entity: entity({ posX: 50, posY: 100 << 8 }),
    } as unknown as DemoProcess
    // DISSOLVE_FRAME_COUNT frames × DISSOLVE_FRAME_NAPS naps, plus slack.
    const totalWakes = dissolve.DISSOLVE_FRAME_COUNT * dissolve.DISSOLVE_FRAME_NAPS + 4
    let d = only(demo.createWaveDemo(SEED), [proc])
    for (let i = 0; i < totalWakes; i++) d = demo.stepDemo(d)
    expect(
      d.sim.processes.some((p) => p.kind === 'dissolve'),
      'the dissolve reaches done and the body is removed from the process list',
    ).toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 (v) — THE RENDER SHOWS THE MENAGERIE: drawList renders ptero/troll/dissolve,
//   each POSOFF-lifted (so nothing draws at raw feet Y — the seed-4 no-lift, closed
//   end-to-end for the new kinds: the op name must resolve to a record).
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — drawList renders the ptero / troll / dissolve kinds, POSOFF-lifted (RED)', () => {
  it('a live ptero renders a PT* frame op, lifted off its feet', async () => {
    const r = await loadDemoRender()
    const demoMod = await loadDemo()
    const FEET = 100
    const ptero: DemoProcess = {
      id: 0x0880, cls: 'secondary', nap: 1, period: 1, kind: 'ptero', facing: 1,
      collisionEnabled: true, entity: entity({ posX: 60, posY: FEET << 8, airborne: true }),
    }
    const ops = r.drawList(only(demoMod.createWaveDemo(SEED), [ptero])).filter((o) => o.kind === 'entity')
    const op = ops.find((o) => PTERO_FRAMES.has(o.name))
    expect(op, 'drawList must emit a pterodactyl frame op (PT1R..PT3L) for a kind:ptero').toBeTruthy()
    expect(op!.y, 'the ptero is POSOFF-lifted (name resolves to its IPTERO record), not at raw feet Y').toBeLessThan(FEET)
  })

  it('a live troll renders a GRAB* hand op, lifted off its feet', async () => {
    const r = await loadDemoRender()
    const demoMod = await loadDemo()
    const FEET = 210 // CLIF5 landing surface
    const troll = {
      id: 0x0a80, cls: 'secondary', nap: 1, period: 1, kind: 'troll', facing: 1,
      collisionEnabled: true, entity: entity({ posX: 100, posY: FEET << 8, airborne: false }),
    } as unknown as DemoProcess
    const ops = r.drawList(only(demoMod.createWaveDemo(SEED), [troll])).filter((o) => o.kind === 'entity')
    const op = ops.find((o) => TROLL_FRAMES.has(o.name))
    expect(op, 'drawList must emit a lava-troll hand op (GRAB1..GRAB6) for a kind:troll').toBeTruthy()
    expect(op!.y, 'the troll hand is POSOFF-lifted (name resolves to its ILAVAT record)').toBeLessThan(FEET)
  })

  it('a dissolving body renders a dissolve frame op', async () => {
    const r = await loadDemoRender()
    const demoMod = await loadDemo()
    const dissolve = await loadDissolve()
    const proc = {
      id: 0x0980, cls: 'secondary', nap: 1, period: 1, kind: 'dissolve',
      dissolve: dissolve.startDissolve(), entity: entity({ posX: 70, posY: 100 << 8 }),
    } as unknown as DemoProcess
    const ops = r.drawList(only(demoMod.createWaveDemo(SEED), [proc])).filter((o) => o.kind === 'entity')
    expect(
      ops.some((o) => DISSOLVE_FRAMES.has(o.name)),
      'drawList must render the dissolve animation frame for a kind:dissolve',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 (vi) — THE TROLL GOES LIVE off CLIF5 once the bridge has burned (wave ≥ 4).
//   demo-troll.test.ts already pins trollSpawnable(demo.arena, demo.wave); this pins
//   that jt3-7 ACTS on it — the troll is present on the playable slice.
// ═════════════════════════════════════════════════════════════════════════════
describe('AC-1 — the demo spawns the live troll at the troll wave (RED: never spawned today)', () => {
  it('a fresh wave-1 demo has no live troll', async () => {
    const demo = await loadDemo()
    const d = demo.createWaveDemo(SEED)
    expect(d.sim.processes.some((p) => p.kind === 'troll'), 'wave 1: bridge intact, no troll').toBe(false)
  })

  it('driving past the wave-3 burn to wave 4 puts a live troll on the slice', async () => {
    const demo = await loadDemo()
    const d = advanceTo(demo.stepDemo, demo.createWaveDemo(SEED), 4)
    expect(d.wave).toBe(4)
    expect(d.arena.bridgeBurned, 'the bridge has burned by wave 4').toBe(true)
    expect(
      d.sim.processes.some((p) => p.kind === 'troll'),
      'wave 4 with a burned bridge spawns the lava troll off CLIF5 (trollSpawnable consumed)',
    ).toBe(true)
  })
})
