// tests/demo-jt9-43.test.ts
//
// Story jt9-43 — RED phase (Mr. Praline / TEA). narrowPhase's COLDX omission is
// X-BLIND across ALL THREE overlap passes. The unit mechanism is pinned in
// joust-jt9-43.test.ts; THIS file proves each of the three call sites threads the
// two entities' screen X, so a fix that corrects narrowPhase but leaves any one
// call site un-threaded stays RED.
//
// The bug's shape at the integration level: two sprites CLOSE enough in X to pass
// broadPhase (the 16px AABB) but far enough that, once COLDX shifts their masks
// apart, the spans no longer overlap. Today (X-blind) every such pair resolves a
// contact from the superimposed masks; after the fix the mask REJECTS it — exactly
// what BPCOL does with its `SUBD COLDX` (JOUSTRV4.SRC:7047/:7051/:7062).
//
// Each pass gets: a dx=0 CONTROL (COLDX=0, GREEN now and after — the historical
// behaviour) and the dx≠0 HEADLINE (RED today, corrected after). Every dx is < 16
// so broadPhase still fires — the mask, not the box, must be the discriminator.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { broadPhase, type CollisionBox } from '../src/core/joust.js'
import type { EntityState } from '../src/core/flight.js'
import { loadFlight } from './helpers/flight-contract.js'
import { loadArena } from './helpers/arena-contract.js'

const SEED = 0x1234
const box = (x: number, top: number): CollisionBox => ({ x, y: top, w: 16, h: 16 })

/** A held-in-place airborne entity: velY 0 / timeUp 1 keeps top within <0.1px over
 *  the short step window (the jt9-14 hover idiom). */
function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100, posY: 100 << 8, velXIndex: 0, velXFrac: 0, velY: 0, timeUp: 1,
    groundState: null, plantZ: 0, airborne: true, animPhase: 0, ...over,
  }
}

/** [staged procs + one ground enemy anchor] — the anchor holds the wave open
 *  without colliding (jt5-16/jt9-14 idiom); budget zeroed so nothing spawns. */
function only(procs: DemoProcess[]): DemoState {
  const base = createWaveDemo(SEED)
  const anchor = base.sim.processes.find((p) => p.kind === 'enemy')
  if (!anchor) throw new Error('wave 1 must supply a ground enemy to hold the wave open')
  return {
    ...base,
    sim: { ...base.sim, processes: [...procs, anchor], budget: { nsmart: 0, wsmart: 0 } },
    events: [],
  }
}

/** Nap everything except the players and one kept id, so only the staged contact
 *  can resolve. */
const hush = (d: DemoState, keep: number): DemoState => ({
  ...d,
  sim: {
    ...d.sim,
    processes: d.sim.processes.map((p) =>
      p.kind === 'player' || p.id === keep ? p : { ...p, nap: 100_000 },
    ),
  },
})

// ═════════════════════════════════════════════════════════════════════════════
// CONSUMER 1 — the PLAYER-vs-PTERO pass (demo.ts :1506).
// ═════════════════════════════════════════════════════════════════════════════
const PLAYER = 1
const PTERO = 0xb30
const PLAYER_TOP = 110

/** Stage a player and one ptero at vertical offset dy and horizontal offset dx,
 *  opposite facings, the player facing in; step 3 frames; report the outcome. */
function pteroContact(dy: number, dx: number): { pteroAlive: boolean; playerAlive: boolean; boxesOverlap: boolean } {
  const pteroTop = PLAYER_TOP + dy
  const player: DemoProcess = {
    id: PLAYER, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
    collisionEnabled: true, entity: entity({ posX: 100, posY: PLAYER_TOP << 8 }),
  }
  const ptero: DemoProcess = {
    id: PTERO, cls: 'secondary', nap: 1, period: 1, kind: 'ptero', facing: -1,
    collisionEnabled: true, entity: entity({ posX: 100 + dx, posY: pteroTop << 8 }),
  }
  const boxesOverlap = broadPhase(box(100, PLAYER_TOP), box(100 + dx, pteroTop))
  let d = only([player, ptero])
  for (let f = 0; f < 3; f++) {
    d = hush(d, PTERO)
    d = stepDemo(d, {})
  }
  return {
    pteroAlive: d.sim.processes.some((p) => p.id === PTERO),
    playerAlive: d.sim.processes.some((p) => p.id === PLAYER),
    boxesOverlap,
  }
}

describe('jt9-43 — the player-vs-ptero pass folds COLDX (screen-X) into its mask test', () => {
  it('CONTROL: a co-located lance kill (dy=−9, dx=0) still resolves — the COLDX=0 invariant', () => {
    const r = pteroContact(-9, 0)
    expect(r.boxesOverlap, 'boxes overlap').toBe(true)
    expect(r.pteroAlive, 'dy=−9, dx=0 is a real lance kill — the ptero dies').toBe(false)
  })

  it('HEADLINE: the SAME lance row 10px apart in X (inside the box) does NOT kill — the mask clears it', () => {
    // dy=−9 aligns ONLY player row 0 [7,9] × PT1RC row 9 [8,15]. COLDX=10 shifts
    // PT1RC to [18,25], clear of [7,9]. broadPhase still fires (10 < 16). RED today
    // (X-blind → the ptero is lanced from 10px clear); BPCOL would reject it.
    const r = pteroContact(-9, 10)
    expect(r.boxesOverlap, 'precondition: the 16px boxes overlap at dx=10').toBe(true)
    expect(r.pteroAlive, 'dx=10 pulls PT1RC clear of the player mask — the ptero survives').toBe(true)
    expect(r.playerAlive, 'and the player is untouched').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// CONSUMER 2 — the PLAYER-vs-EGG catch pass (demo.ts :1573).
// ═════════════════════════════════════════════════════════════════════════════
function playerAt(id: number, posX: number, pixelY: number): DemoProcess {
  return {
    id, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
    collisionEnabled: true,
    entity: {
      posX, posY: pixelY << 8, velXIndex: 0, velXFrac: 0, velY: 0, timeUp: 1,
      groundState: null, plantZ: 0, airborne: true, animPhase: 0,
    },
  }
}

async function findAir(): Promise<{ x: number; y: number }> {
  const flight = await loadFlight()
  const arena = await loadArena()
  for (let x = 40; x <= 284; x++) {
    let clear = true
    for (let y = 12; y <= 84; y++) {
      if (arena.groundOutcome(flight.groundMaskAt(x, y)).kind !== 'airborne') {
        clear = false
        break
      }
    }
    if (clear) return { x, y: 48 }
  }
  throw new Error('no open-air column found')
}

/** Stage one player and one settled egg at vertical offset dy and horizontal
 *  offset dx; step one frame; report whether the egg was collected. */
async function eggCatch(dy: number, dx: number): Promise<{ caught: boolean; boxesOverlap: boolean }> {
  const { x, y } = await findAir()
  const eggProc: DemoProcess = {
    id: 0x1_0001, cls: 'secondary', nap: 1, period: 1, kind: 'egg',
    egg: {
      posX: x + dx, posY: (y + dy) << 8, velX: 0, velY: 0, bumpX: 0, bumpY: 0,
      eggsLeft: 4, hitCount: 0, pfeet: 1, settled: true,
    },
  }
  const anchor: DemoProcess = { id: 0x7000, cls: 'secondary', nap: 1, period: 1, kind: 'enemy' }
  const base = createWaveDemo(SEED)
  const staged: DemoState = {
    ...base,
    sim: { ...base.sim, processes: [playerAt(1, x, y), eggProc, anchor] },
    events: [],
  }
  const boxesOverlap = broadPhase(box(x, y), box(x + dx, y + dy))
  const after = stepDemo(staged)
  const caught = !after.sim.processes.some((p) => p.kind === 'egg')
  return { caught, boxesOverlap }
}

describe('jt9-43 — the player-vs-egg catch pass folds COLDX (screen-X) into its mask test', () => {
  it('CONTROL: an egg within the mask (dy=−4, dx=0) is still caught — the COLDX=0 invariant', async () => {
    const r = await eggCatch(-4, 0)
    expect(r.boxesOverlap, 'boxes overlap').toBe(true)
    expect(r.caught, 'dy=−4, dx=0 is inside CEGGUP — the egg is collected').toBe(true)
  })

  it('HEADLINE: the SAME egg 8px apart in X (inside the box) is NOT caught — the mask clears it', async () => {
    // dy=−4 aligns player rows 0-2 [7,9]/[7,9]/[7,8] × CEGGUP rows 4-6
    // [2,7]/[2,7]/[3,6]. COLDX=8 shifts CEGGUP to [10,15]/[10,15]/[11,14], clear of
    // the player's ≤9 columns. broadPhase still fires (8 < 16). RED today (X-blind
    // → collected from 8px clear).
    const r = await eggCatch(-4, 8)
    expect(r.boxesOverlap, 'precondition: the 16px boxes overlap at dx=8').toBe(true)
    expect(r.caught, 'dx=8 pulls CEGGUP clear of the player mask — the egg is NOT caught').toBe(false)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// CONSUMER 3 — the JOUST pass (player-vs-player / player-vs-enemy, demo.ts :1385).
// ═════════════════════════════════════════════════════════════════════════════
/** Stage two airborne players at vertical offset dy and horizontal offset dx and
 *  step one frame. The higher one (smaller Y) wins a resolved joust; report who
 *  survives. */
function joustContact(dy: number, dx: number): { p1Alive: boolean; p2Alive: boolean; boxesOverlap: boolean } {
  const p1: DemoProcess = {
    id: 1, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
    collisionEnabled: true, entity: entity({ posX: 100, posY: 100 << 8 }),
  }
  const p2: DemoProcess = {
    id: 2, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: -1, mount: 'stork',
    collisionEnabled: true, entity: entity({ posX: 100 + dx, posY: (100 + dy) << 8 }),
  }
  const boxesOverlap = broadPhase(box(100, 100), box(100 + dx, 100 + dy))
  let d = only([p1, p2])
  d = hush(d, 2)
  d = stepDemo(d, {})
  return {
    p1Alive: d.sim.processes.some((p) => p.id === 1),
    p2Alive: d.sim.processes.some((p) => p.id === 2),
    boxesOverlap,
  }
}

describe('jt9-43 — the joust pass folds COLDX (screen-X) into its mask test', () => {
  it('CONTROL: two overlapping jousters (dy=8, dx=0) still resolve — the lower player is removed', () => {
    const r = joustContact(8, 0)
    expect(r.boxesOverlap, 'boxes overlap').toBe(true)
    expect(r.p1Alive, 'the higher player (top 100) wins').toBe(true)
    expect(r.p2Alive, 'the lower player (top 108) is removed — a joust resolved').toBe(false)
  })

  it('HEADLINE: the SAME pair 8px apart in X (inside the box) do NOT joust — both survive', () => {
    // dy=8 aligns p1 CWNG3R rows 8-12 × p2 CWNG3R rows 0-4; COLDX=8 shifts every p2
    // span past p1's right edge. broadPhase still fires (8 < 16). RED today
    // (X-blind → the lower player is removed from 8px clear).
    const r = joustContact(8, 8)
    expect(r.boxesOverlap, 'precondition: the 16px boxes overlap at dx=8').toBe(true)
    expect(r.p1Alive, 'no joust resolves — the higher player survives').toBe(true)
    expect(r.p2Alive, 'and the lower player survives too — the mask cleared them').toBe(true)
  })
})
