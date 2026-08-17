// tests/lava-death-jt13-5.test.ts
//
// Story jt13-5 — RED phase (Tyr One-Handed / TEA). "Landing in lava must have
// consequences (death), not free swimming."
//
// ─── THE BUG ─────────────────────────────────────────────────────────────────
// jt11-18 turned the FLOOR+7 lava plane (isLavaDeath in arena.ts, the `CMPA
// #FLOOR+7 / BHS ADGFLR` test, JOUSTRV4.SRC:6508-6509) into an ON-SCREEN
// BACKSTOP: the airborne branch of stepPlayerEntity (frame.ts, the isLavaDeath
// arm around line 307) merely CLAMPS a fallen bird at DEATH_Y with velY=0 so it
// does not integrate off the bottom of the screen. It never clears the player's
// horizontal velocity, never removes the player, and never books a life. The
// felt result: a knight who reaches the lava can SWIM sideways there forever with
// no death and no life lost.
//
// The ROM's ADGFLR ("DEATH VIA SWIMMING IN THE LAVA") is a SINK-AND-DIE sequence:
//   • CLR PVELX (JOUSTRV4.SRC:6610, "PLAYER IS NOT GOING ANYWHERE") — horizontal
//     velocity is zeroed on lava contact, so there is no sideways swim.
//   • death fires once the sprite is floor-clipped below full length (WCLENY<7,
//     JOUSTRV4.SRC:6555) — the rider is removed, the [DDEAD] death routine runs
//     and a life is lost (SPDIE2, JOUSTRV4.SRC:4700-4732).
//
// ─── WHAT THIS FILE PINS (and what it deliberately does NOT) ──────────────────
// These are the two BEHAVIOUR reds that encode the story title unambiguously and
// WITHOUT prejudging the fidelity refinements that need a design ruling (recorded
// as Delivery Findings on the session — the SNPLAV/SNELAV lava SOUND, the exact
// break-free window, the sink-to-FLOOR+20 depth, and the jt11-18 `maxY<=DEATH_Y`
// reconciliation). Passing BOTH of these means the two things the title promises
// are true: no sideways swim, and a real life lost.
//
//   AC1 — PVELX is cleared on lava contact (no sideways swim).
//   AC3 — a knight who sinks in the lava LOSES A LIFE (death has a consequence).

import { describe, it, expect } from 'vitest'
import { loadScheduler } from './helpers/scheduler-contract.js'
import { loadArenaState } from './helpers/arena-state-contract.js'
import {
  type SimState,
  type SimProcess,
  type EntityState,
  type PlayerInput,
} from './helpers/sim-contract.js'
import { loadGameExtra } from './helpers/game-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const SEED = 0x1234

// ROM scalars (re-derived elsewhere; used here to drive + bound the behaviour).
// FLOOR = $DF (JOUSTRV4.SRC:37); DEATH_Y = FLOOR+7 = the lava surface / kill plane
// the jt11-18 backstop pins to.
const FLOOR = 0xdf
const DEATH_Y = FLOOR + 7 // 230
const NSHIP = 5 // free-play men per player (TB12REV3.SRC:135)

// Probe columns (jt11-18's, verbatim): PLANK_L sits on a shore plank whose footing
// exists ONLY through the wave-init ORA #$20, so a burn removes it and the outcome
// there becomes lava. ISLAND is CLIF5's own span — native $20, a real platform.
const PLANK_L = 20
const ISLAND = 100

// ─── Fixtures (jt11-18 shapes, verbatim) ─────────────────────────────────────

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

const stander = (posX: number, over: Partial<EntityState> = {}): EntityState =>
  entityAt(posX, 210, { airborne: false, groundState: 'stand', posY: 210 << 8, ...over })

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

const trollsIn = (d: SimState): SimProcess[] => d.sim.processes.filter((p) => p.kind === 'troll')

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — PVELX is cleared on lava contact: no sideways swim.
//
// A knight sits AT lava depth over a burned column and HOLDS the stick. The ROM
// clears PVELX unconditionally on lava contact (CLR PVELX, JOUSTRV4.SRC:6610) —
// the break-free escape is a hard FLAP, never a steer — so even while the stick is
// pushed the horizontal velocity must be zero.
//
// RED on develop: the isLavaDeath arm of stepPlayerEntity zeroes velY but leaves
// velXIndex untouched, and the held stick keeps re-accelerating it, so the knight
// swims sideways in the lava frame after frame. GREEN: velXIndex is cleared.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-5 AC1 — the lava clears horizontal velocity (no sideways swim)', () => {
  it('a knight held in the lava while pushing the stick has its horizontal velocity zeroed', async () => {
    const sched = await loadScheduler()
    const a = await loadArenaState()
    const burned = a.applyWaveDestruction(a.initialArenaState(), 3, 0x00)

    // Start AIRBORNE, already at the lava surface over the burned plank, and moving
    // sideways (velXIndex=4). No footing exists this deep, so the lava arm — not a
    // landing — is the branch under test every frame.
    let state = sched.spawn(sched.createState(SEED), {
      id: 1,
      cls: 'primary',
      nap: 1,
      period: 1,
      kind: 'player',
      entity: entityAt(PLANK_L, DEATH_Y, { velXIndex: 4, airborne: true }),
    })

    const before = state.processes.find((p) => p.id === 1)?.entity
    expect(before?.velXIndex, 'non-vacuity: the knight starts with real sideways velocity').toBe(4)

    // Hold the stick toward the drift for several frames — a steer must NOT keep the
    // knight swimming. Capture the deepest velXIndex seen once at lava depth.
    const HELD: PlayerInput = { dir: 1, flap: false, flapHeld: false }
    let maxVelXIndexAtLava = 0
    let sawLavaDepth = false
    for (let i = 0; i < 6; i++) {
      state = sched.stepFrame(state, { 1: HELD }, { arena: burned })
      const e = state.processes.find((p) => p.id === 1)?.entity
      if (!e) break
      if (e.posY >> 8 >= DEATH_Y) {
        sawLavaDepth = true
        maxVelXIndexAtLava = Math.max(maxVelXIndexAtLava, Math.abs(e.velXIndex))
      }
    }

    expect(sawLavaDepth, 'non-vacuity: the knight really was at lava depth under the arm').toBe(true)
    // RED today: the held stick keeps velXIndex non-zero at lava depth (free swim).
    expect(
      maxVelXIndexAtLava,
      'ADGFLR CLR PVELX — horizontal velocity is zeroed in the lava, even while steering',
    ).toBe(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 — sinking in the lava costs a life.
//
// A lone knight falls into the lava over a burned column at WAVE 1 (with the
// bridge burned by hand): trollSpawnable gates the lava troll to wave >= 4, so at
// wave 1 there is NO troll to seize the knight — this isolates the SWIM death from
// the separate troll-grab death path (AC5). A keep-alive buzzard parked on the
// real CLIF5 island (collisions off) holds the wave open so it never advances into
// troll territory behind our backs.
//
// RED on develop: the knight clamps at DEATH_Y and swims forever — stepGame books
// a death only when a player process DISAPPEARS from the sim, and the clamp keeps
// it alive, so `lives` stays at NSHIP. GREEN: the sink removes the knight, stepGame
// books the mount death, and `lives` drops below NSHIP.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-5 AC3 — a knight who sinks in the lava loses a life', () => {
  it('falling into the lava over a burned column costs exactly one life (no troll involved)', async () => {
    const gmod = await loadGameExtra()

    const base = gmod.createGame(SEED, 1)
    expect(base.players[0].lives, 'the game opens at NSHIP men').toBe(NSHIP)

    // Wave-1 sim, bridge burned by hand, carrying only: a keep-alive island buzzard
    // (holds the wave) and the falling knight (id 1 -> ledger 0) over the burned plank.
    const burnedSim: SimState = withNoPendingEnemies({
      ...base.sim,
      wave: 1,
      sim: {
        ...base.sim.sim,
        processes: [
          enemyAt(0x201, ISLAND, stander(ISLAND)), // on a real platform — never a lava contact
          playerAt(1, PLANK_L, 200, { velY: 0x100 }), // 1 px/frame downward, into the lava
        ],
      },
      arena: { ...base.sim.arena, bridgeBurned: true },
    })
    let game = { ...base, sim: burnedSim }

    let maxPlayerY = 200
    for (let i = 0; i < 60; i++) {
      game = gmod.stepGame(game)
      const p = game.sim.sim.processes.find((q) => q.kind === 'player' && q.id === 1)
      if (p?.entity) maxPlayerY = Math.max(maxPlayerY, p.entity.posY >> 8)
    }

    // Isolation: no lava troll ever existed, so any life lost is the SWIM death.
    expect(trollsIn(game.sim).length, 'wave 1 has no lava troll — the swim death is isolated').toBe(0)
    // Non-vacuity: the knight really did descend into the lava (past the floor).
    expect(maxPlayerY, 'the knight fell into lava territory — the drop was exercised').toBeGreaterThanOrEqual(
      FLOOR,
    )
    // RED today: the clamp keeps the knight swimming, so no death is ever booked and
    // lives stays at NSHIP. GREEN: the sink death removes the knight and a life is lost.
    expect(game.players[0].lives, 'sinking in the lava must cost a life, not free swimming').toBeLessThan(
      NSHIP,
    )
  })
})
