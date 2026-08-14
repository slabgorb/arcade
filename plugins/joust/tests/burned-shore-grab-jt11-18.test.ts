// tests/burned-shore-grab-jt11-18.test.ts
//
// Story jt11-18 — RED phase (Han Solo / TEA). DEFECT A of two: after jt11-5's
// burn-off eats a wooden bridge column, an entity that lands or walks onto that
// gap DROPS STRAIGHT OFF THE BOTTOM OF THE SCREEN instead of being seized by the
// lava troll (the felt playtest bug), and a non-gripped entity that reaches lava
// depth is never killed either.
//
// ─── THE SEAM ────────────────────────────────────────────────────────────────
// The mask/outcome layer already resolves the burned shore to the lava-troll
// case CORRECTLY (jt11-5): groundMaskAt (flight.ts) drops the wave-init ORA #$20
// once arena.bridgeBurned, and groundOutcome (arena.ts) maps $80-without-$20
// to { kind: 'troll' } — the LNDB7 "INDICATE NOT TO LAND" signal
// (JOUSTRV4.SRC:6764,6792). The failure is entirely in the CONSUMERS:
//
//   • the player land/walk-off consumers (stepPlayerEntity in frame.ts), the
//     enemy stepEntity consumers (enemy.ts) and the egg feetBelow check (stepEgg
//     in sim.ts) branch only on kind === 'platform'. A { kind:'troll' } outcome
//     is "not a platform," so the stander is sent through walkOff → stepFlight,
//     and the airborne branch of stepPlayerEntity applies only applyCeiling (TOP
//     clamp) + wrapX — no lava kill-plane — so posY integrates unbounded off the
//     bottom.
//   • The troll grip is only ever bound once-per-wave to the CLIF5-nearest bird
//     (pickTrollVictim in sim.ts), never to the entity standing on the burned
//     cell. The ROM instead spawns a LAVAT1 grab from the ground-check itself the
//     instant an entity's feet touch an LNDB7 cell (VCUPROC LAVAT1, :6776-6790).
//   • isLavaDeath (FLOOR+7, arena.ts) has exactly ONE caller — stepGrip
//     (troll.ts) — so nothing kills a non-gripped entity that falls into lava.
//
// These are BEHAVIOUR reds: each asserts the desired observable outcome and fails
// today because the outcome is the off-screen fall.

import { describe, it, expect } from 'vitest'
import {
  loadSim,
  type SimState,
  type SimProcess,
  type EntityState,
  type PlayerInput,
  type EggState,
} from './helpers/sim-contract.js'
import { loadArenaState, type ArenaState } from './helpers/arena-state-contract.js'
import { loadScheduler } from './helpers/scheduler-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const SEED = 0x1234
const NEUTRAL: PlayerInput = { dir: 0, flap: false, flapHeld: false }

// Probe columns (jt11-5's, verbatim): PLANK_L/PLANK_R sit on the shore planks —
// footing that exists ONLY through the wave-init ORA #$20, so the burn removes it
// and the outcome there becomes { kind:'troll' }. ISLAND is CLIF5's own span —
// NATIVE $20, indestructible, still a real platform after the burn.
const PLANK_L = 20
const ISLAND = 100

// ROM scalars this defect turns on (re-derived elsewhere; used here to drive the
// behaviour). FLOOR = $DF (JOUSTRV4.SRC:37); DEATH_Y = FLOOR+7 = the lava kill
// plane (:6620, DEATH_Y in arena.ts); the CLIF5 grab point is X=148 (TROLL_CLIF5_X
// in sim.ts).
const FLOOR = 0xdf
const DEATH_Y = FLOOR + 7 // 230
const CLIF5_X = 148
// The logical framebuffer is 292×240 (LOGICAL_WIDTH/HEIGHT in render.ts). "Off the
// bottom of the screen" is posY>>8 running past LOGICAL_HEIGHT — the exact felt bug.
const LOGICAL_HEIGHT = 240

// ─── Fixtures (jt11-5 / jt9-11 shapes, verbatim) ─────────────────────────────

function entityAt(posX: number, pixelY: number, over: Partial<EntityState> = {}): EntityState {
  return {
    posX,
    posY: pixelY << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
    ...over,
  }
}

function playerAt(id: number, posX: number, pixelY: number, over: Partial<EntityState> = {}): SimProcess {
  return {
    id,
    cls: 'primary',
    nap: 1,
    period: 1,
    kind: 'player',
    facing: 1,
    mount: 'ostrich',
    entity: entityAt(posX, pixelY, over),
  }
}

/** A grounded stander (jt11-5's standerAt). */
const stander = (posX: number, over: Partial<EntityState> = {}): EntityState =>
  entityAt(posX, 210, { airborne: false, groundState: 'stand', posY: 210 << 8, ...over })

/** An enemy PROCESS (demo-jt9-42's smartEnemyAt shape). */
function enemyAt(id: number, posX: number, entity: EntityState, over: Partial<SimProcess> = {}): SimProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: { entity, facing: 1, pchase: 1, brain: 'boundr', decision: 'boundr', plavt: 1 },
    enemyType: 'bounder',
    collisionEnabled: false,
    ...over,
  }
}

function eggOf(over: Partial<EggState>): EggState {
  return {
    posX: 100,
    posY: 40 << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: 4,
    hitCount: 0,
    pfeet: 0,
    settled: false,
    ...over,
  }
}

const trollsIn = (d: SimState): SimProcess[] => d.sim.processes.filter((p) => p.kind === 'troll')

/** A wave-4, bridge-burned demo carrying exactly the given cast (jt9-11 idiom). */
async function stagedBurnedDemo(processes: SimProcess[]): Promise<SimState> {
  const dmod = await loadSim()
  const base = dmod.createWaveSim(SEED)
  return withNoPendingEnemies({
    ...base,
    wave: 4, // TROLL_WAVE — the troll is active once the bridge has burned
    sim: { ...base.sim, processes },
    arena: { ...base.arena, bridgeBurned: true },
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// PREMISE (green today) — the burn produces the LNDB7 signal; jt11-5 pinned it.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt11-18 premise — the burned shore already resolves to { kind:troll }', () => {
  it('applyWaveDestruction(wave 3) burns the bridge', async () => {
    const a = await loadArenaState()
    const burned = a.applyWaveDestruction(a.initialArenaState(), 3, 0x00)
    expect(burned.bridgeBurned, 'wave 3 burns the wooden bridge (jt3-3)').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-A1 — a player standing on a burned column is GRABBED, bound to THAT entity,
//         not dropped. (RED: today it walks off and no troll binds to it.)
// ═════════════════════════════════════════════════════════════════════════════
//
// Isolation: a DECOY bird sits on CLIF5 (X=148) so the once-per-wave
// pickTrollVictim binds IT (dist 0), never our shore stander (dist 128). The
// per-entity LNDB7 grab is the only thing that can bind the stander — and it is
// exactly what is unwired.
describe('jt11-18 AC-A1 — the burned-shore stander is seized by a lava troll bound to it', () => {
  const DECOY_ID = 1
  const SHORE_ID = 2

  async function run(): Promise<SimState> {
    const dmod = await loadSim()
    let d = await stagedBurnedDemo([
      playerAt(DECOY_ID, CLIF5_X, 120), // the once-per-wave CLIF5 victim
      { ...playerAt(SHORE_ID, PLANK_L, 210), entity: stander(PLANK_L) }, // on the burned plank
    ])
    // Give the grab a few frames to bind (the hand rises before it commits).
    for (let i = 0; i < 8; i++) d = dmod.stepSim(d)
    return d
  }

  it('sanity: the once-per-wave troll still binds the CLIF5 decoy (fixture reaches the troll system)', async () => {
    const d = await run()
    expect(
      trollsIn(d).some((t) => t.victimId === DECOY_ID),
      'the CLIF5-nearest bird is the pickTrollVictim target — this proves the wave/arm gate fired',
    ).toBe(true)
  })

  it('a troll is bound to the SHORE stander (LNDB7 VCUPROC LAVAT1, :6776-6790)', async () => {
    const d = await run()
    // RED today: the stander at X=20 is far from CLIF5, so the once-per-wave path
    // never picks it; the per-entity grab that the ROM spawns on contact is
    // unwired, so it just walks off and free-falls. GREEN once the { kind:'troll' }
    // ground outcome binds a lava troll to the touching entity.
    const shore = d.sim.processes.find((p) => p.id === SHORE_ID) as { grippedBy?: number } | undefined
    const grabbed = trollsIn(d).some((t) => t.victimId === SHORE_ID) || shore?.grippedBy !== undefined
    expect(grabbed, 'the burned-plank stander must be grabbed by a lava troll, not dropped').toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-A2 — a non-gripped entity that reaches lava depth DIES, it does not
//         integrate off the bottom of the screen. (RED: no lava kill-plane on the
//         free-fall path.)  Tested at the frame stepper, in isolation from the
//         troll process system, so it exercises the FLOOR+7 backstop directly.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt11-18 AC-A2 — the airborne free-fall over lava is bounded by the FLOOR+7 kill plane', () => {
  async function fall(atX: number, arena?: ArenaState): Promise<{ maxY: number; landed: boolean }> {
    const sched = await loadScheduler()
    let state = sched.spawn(sched.createState(SEED), {
      id: 1,
      cls: 'primary',
      nap: 1,
      period: 1,
      kind: 'player',
      entity: entityAt(atX, 200, { velY: 0x100 }), // 1 px/frame downward, airborne
    })
    let maxY = 200
    let landed = false
    for (let i = 0; i < 300; i++) {
      state = sched.stepFrame(state, { 1: NEUTRAL }, { arena })
      const e = state.processes.find((q) => q.id === 1)?.entity
      if (!e) break
      const y = e.posY >> 8
      if (y > maxY) maxY = y
      if (!e.airborne) {
        landed = true
        break
      }
    }
    return { maxY, landed }
  }

  it('control: over the intact CLIF5 island the fall LANDS, never reaching lava depth', async () => {
    const { maxY, landed } = await fall(ISLAND, undefined)
    expect(landed, 'a real platform catches the fall').toBe(true)
    expect(maxY, 'it settles on the island band, well above the lava').toBeLessThan(DEATH_Y)
  })

  it('over a burned column the fall descends into lava but never leaves the screen', async () => {
    const a = await loadArenaState()
    const burned = a.applyWaveDestruction(a.initialArenaState(), 3, 0x00)
    const { maxY } = await fall(PLANK_L, burned)
    // Non-vacuity: it really did descend into lava territory (past the floor).
    expect(maxY, 'the entity fell to at least lava depth — the test exercised the drop').toBeGreaterThanOrEqual(
      FLOOR,
    )
    // RED today: with no FLOOR+7 kill plane on the airborne path, posY integrates
    // unbounded and runs off the bottom (maxY ≫ 240).
    expect(maxY, 'a lava death must stop the fall before it leaves the 240px screen').toBeLessThanOrEqual(
      LOGICAL_HEIGHT,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-A3 — enemies and eggs over the burned shore take the SAME path, not just the
//         player (the enemy stepEntity consumers, the egg feetBelow check).
//         (RED: both free-fall off-screen.)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt11-18 AC-A3 — enemies and eggs over the burned shore are bounded too', () => {
  it('a buzzard standing on a burned column is seized by a lava troll bound to it', async () => {
    // The ROM grips "THE PLAYER OR ENEMY" on LNDB7 contact (JOUSTRV4.SRC:6764). A
    // free-fall probe is confounded by the buzzard's own flap AI (it fights to stay
    // aloft — which is WHY the ROM grabs it); the faithful assertion is the grab.
    const dmod = await loadSim()
    const DECOY_ID = 1
    const ENEMY_ID = 0x200
    let d = await stagedBurnedDemo([
      playerAt(DECOY_ID, CLIF5_X, 120), // the once-per-wave CLIF5 victim
      enemyAt(ENEMY_ID, PLANK_L, stander(PLANK_L)), // on the burned plank
    ])
    for (let i = 0; i < 8; i++) d = dmod.stepSim(d)
    // RED today: the enemy at X=20 is far from CLIF5, so pickTrollVictim never
    // targets it, and its per-entity LNDB7 grab is unwired — it walks off.
    const enemyGrabbed =
      trollsIn(d).some((t) => t.victimId === ENEMY_ID) ||
      (d.sim.processes.find((p) => p.id === ENEMY_ID) as { grippedBy?: number } | undefined)?.grippedBy !==
        undefined
    expect(enemyGrabbed, 'the burned-plank buzzard must be grabbed, not dropped off-screen').toBe(true)
  })

  it('an egg falling over a burned column never leaves the screen (control: it settles on the island)', async () => {
    const demo = await loadSim()
    const a = await loadArenaState()
    const burned = a.applyWaveDestruction(a.initialArenaState(), 3, 0x00)

    // Control — over the intact island the egg settles on real footing.
    let onIsland = eggOf({ posX: ISLAND, posY: 200 << 8, velY: 0x40 })
    let settled = false
    for (let i = 0; i < 300 && !settled; i++) {
      onIsland = demo.stepEgg(onIsland) // default PRISTINE_ARENA — the intact island
      settled = onIsland.settled
    }
    expect(settled, 'the island catches the egg').toBe(true)

    // Over the burned column the egg has no footing.
    let egg = eggOf({ posX: PLANK_L, posY: 200 << 8, velY: 0x40 })
    let maxY = 200
    for (let i = 0; i < 300; i++) {
      egg = demo.stepEgg(egg, burned)
      const y = egg.posY >> 8
      if (y > maxY) maxY = y
      if (egg.settled) break
    }
    expect(maxY, 'the egg descended into lava depth').toBeGreaterThanOrEqual(FLOOR)
    // RED today: egg fall uses the same platform-only check (stepEgg in sim.ts).
    expect(maxY, 'the egg must be consumed by lava, not fall off-screen').toBeLessThanOrEqual(LOGICAL_HEIGHT)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-A4 — the once-per-wave CLIF5 victim path is UNCHANGED (regression guard,
//         green today and after). The new per-entity grab must not break or
//         double-spawn the wave troll.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt11-18 AC-A4 — the once-per-wave CLIF5 troll is unchanged', () => {
  it('wave 4 spawns exactly one troll, bound to the CLIF5-nearest bird', async () => {
    const dmod = await loadSim()
    const PLAYER = 1
    let d = dmod.createWaveSim(SEED)
    const park = (s: SimState): SimState =>
      withNoPendingEnemies({ ...s, sim: { ...s.sim, processes: [playerAt(PLAYER, CLIF5_X, 120)] } })
    d = dmod.stepSim(park(d)) // → wave 2
    d = dmod.stepSim(park(d)) // → wave 3 (bridge burns)
    d = dmod.stepSim(park(d)) // → wave 4 (troll wave)
    for (let i = 0; i < 200 && trollsIn(d).length === 0; i++) d = dmod.stepSim(d)
    expect(d.wave, 'reached the troll wave').toBe(4)
    expect(trollsIn(d).length, 'exactly one once-per-wave troll').toBe(1)
    expect(trollsIn(d)[0]?.victimId, 'bound to the parked CLIF5 bird').toBe(PLAYER)
  })
})
