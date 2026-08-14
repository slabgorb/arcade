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
const DEATH_Y = FLOOR + 7 // 230 — the FLOOR+7 lava floor the clamp pins to
const CLIF5_X = 148

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

/** A wave-4, bridge-burned demo carrying exactly the given cast (jt9-11 idiom).
 *  `over` sets extra SimState fields — e.g. `trollArmed: false` to spend the
 *  once-per-wave CLIF5 pick so only the per-contact LNDB7 grab can bind. */
async function stagedBurnedDemo(processes: SimProcess[], over: Partial<SimState> = {}): Promise<SimState> {
  const dmod = await loadSim()
  const base = dmod.createWaveSim(SEED)
  return withNoPendingEnemies({
    ...base,
    wave: 4, // TROLL_WAVE — the troll is active once the bridge has burned
    sim: { ...base.sim, processes },
    arena: { ...base.arena, bridgeBurned: true },
    ...over,
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
// AC-A1 — a bird on the burned shore is SEIZED by a lava troll bound to THAT
//         entity when one can rise (LNDB7 VCUPROC LAVAT1, :6776-6790), and — per
//         the ROM's LAVNBR gate (`LDA LAVNBR / BNE LNDB7C`, :6767-6768: only ONE
//         lava troll in the whole game at a time) — falls to the lava death, NOT
//         off-screen, when a troll is already active. Both branches replace the
//         old off-screen drop. (RED on develop: the stander walks off and falls.)
// ═════════════════════════════════════════════════════════════════════════════
describe('jt11-18 AC-A1 — the burned-shore bird is seized, or dies in lava — never dropped off-screen', () => {
  const DECOY_ID = 1
  const SHORE_ID = 2

  it('with no active troll, the shore stander is seized by a lava troll bound to it', async () => {
    // trollArmed:false spends the once-per-wave CLIF5 pick, so LNDB7-on-contact is
    // the ONLY path that can bind the shore stander — isolating the per-contact grab.
    // A KEEP-ALIVE buzzard parked on the CLIF5 island (a real platform, not a lava
    // cell) holds the wave open so it never advances and re-arms the once-per-wave
    // pick behind our backs — WITHOUT this, a player-only wave clears, advances, and
    // the once-per-wave grab binds the lone stander even on develop (a vacuous green).
    const dmod = await loadSim()
    let d = await stagedBurnedDemo(
      [
        enemyAt(0x201, ISLAND, stander(ISLAND)), // keep-alive; on a platform, never a troll contact
        { ...playerAt(SHORE_ID, PLANK_L, 210), entity: stander(PLANK_L) },
      ],
      { trollArmed: false },
    )
    for (let i = 0; i < 8; i++) d = dmod.stepSim(d)
    // RED on develop: no per-contact grab, so the stander walks off and free-falls;
    // no troll binds to it. GREEN once the { kind:'troll' } outcome spawns a LAVAT1
    // bound to the contacting entity.
    const shore = d.sim.processes.find((p) => p.id === SHORE_ID) as { grippedBy?: number } | undefined
    const grabbed = trollsIn(d).some((t) => t.victimId === SHORE_ID) || shore?.grippedBy !== undefined
    expect(grabbed, 'the burned-plank stander must be seized by a lava troll bound to it').toBe(true)
  })

  it('LAVNBR — with the CLIF5 victim already grabbed, a second shore bird is NOT re-grabbed but dies in lava', async () => {
    const dmod = await loadSim()
    let d = await stagedBurnedDemo([
      playerAt(DECOY_ID, CLIF5_X, 120), // the once-per-wave CLIF5 victim (LAVNBR := 1)
      { ...playerAt(SHORE_ID, PLANK_L, 210), entity: stander(PLANK_L) }, // on the burned plank
    ])
    let maxY = 210
    for (let i = 0; i < 60; i++) {
      d = dmod.stepSim(d)
      const s = d.sim.processes.find((p) => p.id === SHORE_ID)
      if (s?.entity) maxY = Math.max(maxY, s.entity.posY >> 8)
    }
    // ROM LAVNBR: only ONE lava troll at a time — the shore bird gets no second troll.
    expect(trollsIn(d).length, 'exactly one lava troll (LAVNBR), bound to the CLIF5 victim').toBe(1)
    expect(trollsIn(d)[0]?.victimId, 'and it is the CLIF5-nearest bird, not the shore stander').toBe(DECOY_ID)
    // RED on develop: the un-grabbed shore bird walks off and runs off the bottom of
    // the screen. GREEN: it is bounded by the FLOOR+7 lava death instead.
    expect(maxY, 'the un-grabbed shore bird dies in the lava, it is not dropped off-screen').toBeLessThanOrEqual(
      DEATH_Y,
    )
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
    // unbounded and runs off the bottom (maxY ≫ 240). The clamp pins it at exactly
    // DEATH_Y (FLOOR+7), so pin THAT — a mutant clamping a few px lower survives a
    // loose `<= LOGICAL_HEIGHT` (240) bound.
    expect(maxY, 'a lava death stops the fall at the FLOOR+7 lava floor, not off-screen').toBeLessThanOrEqual(
      DEATH_Y,
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
    // trollArmed:false spends the once-per-wave pick so LNDB7-on-contact is the only
    // binder (and LAVNBR permits it: no other troll is alive).
    const dmod = await loadSim()
    const ENEMY_ID = 0x200
    let d = await stagedBurnedDemo([enemyAt(ENEMY_ID, PLANK_L, stander(PLANK_L))], { trollArmed: false })
    for (let i = 0; i < 8; i++) d = dmod.stepSim(d)
    // RED on develop: the enemy's per-contact LNDB7 grab is unwired — it walks off.
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
    // Pin the exact FLOOR+7 floor, not the looser 240px screen edge.
    expect(maxY, 'the egg is stopped at the FLOOR+7 lava floor, not off-screen').toBeLessThanOrEqual(DEATH_Y)
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
