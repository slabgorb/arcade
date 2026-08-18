// tests/lava-troll-enemy-grip-drown.test.ts
//
// Follow-up to jt13-11 (RED authored by Loki/Dev). The lava troll's ROM routine
// grips "THE PLAYER OR ENEMY" (LNDB7, JOUSTRV4.SRC:6764), and jt9-42 already
// broadened `pickTrollVictim` to enemies — but the grab/grip machinery in
// `stepTrolls` reads the victim's flight state as `victim.entity`, which only a
// PLAYER carries. An ENEMY keeps its flight state under `victim.enemy.entity`, so
// the LAVVFY check (`!victim.entity`, sim.ts) makes the troll GIVE UP on an enemy
// victim before the grab ever commits. Net effect on develop: a lava troll can
// pick an enemy but can never actually grip or drown it.
//
// This file pins the enemy path to parity with the player path (jt13-11):
//   AC1 (RED) — the troll GRABS an enemy victim (it does not give up at LAVVFY);
//        the enemy gains `grippedBy` when the hand closes.
//   AC2 (RED) — a gripped enemy pulled under DROWNS cinematically: it sinks
//        FLOOR+7 -> FLOOR+20 and sounds `enemy-lava-death` (SNELAV) exactly once,
//        on the same ADGFLR cadence as the non-gripped enemy swim death.
//
// node env (dynamic import of the modules off disk). This header never spells the
// vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { loadSim, type SimState, type SimProcess, type EntityState } from './helpers/sim-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const SEED = 0x1234

// ROM scalars (JOUSTRV4.SRC:37 FLOOR = $DF).
const FLOOR = 0xdf
const DEATH_Y = FLOOR + 7 // 230 — the ADGFLR lava kill plane
const SINK_FLOOR = FLOOR + 20 // 243 — the bottom of the sink
const PULL_CAP = 0x500 // the escalated grip's $500 cap (troll.ts)

// jt13-7 grab staging constants (re-derived in demo-jt9-11-source.test.ts).
const EXTENDED_FRAME = 5 * 6 // :1614 — the extended grab frame
const GRIP_Y_OFFSET = 10 - 7 // :1667 — the hand-grip Y offset (+3)

const ISLAND = 100 // a keep-alive island far from the lava

// ─── Fixtures ────────────────────────────────────────────────────────────────

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
  } as SimProcess
}

/** A lava troll one step short of GRABBING its bound victim (the jt13-7 idiom):
 *  hand already extended, staged at the grip Y so the next few steps commit. */
function trollAtGrip(victimId: number, posX: number, pixelY: number): SimProcess {
  return {
    id: 0x15_0000 + victimId,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'troll',
    facing: 1,
    collisionEnabled: true,
    victimId,
    entity: entityAt(posX, pixelY, { animPhase: EXTENDED_FRAME / 6 }),
  } as SimProcess
}

/** A lava troll ALREADY holding a capped grip on `victimId` — skips the LT1HT rise
 *  and drives the ADDLAV grip branch from frame one. */
function trollGripping(victimId: number, posX: number, pixelY: number): SimProcess {
  return {
    id: 0x15_0000 + victimId,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'troll',
    facing: 1,
    collisionEnabled: true,
    victimId,
    grip: { pull: PULL_CAP, killTimer: 1 },
    entity: entityAt(posX, pixelY),
  } as SimProcess
}

const trollsIn = (d: SimState): SimProcess[] => d.sim.processes.filter((p) => p.kind === 'troll')
const enemyIn = (d: SimState, id: number): SimProcess | undefined =>
  d.sim.processes.find((p) => p.kind === 'enemy' && p.id === id)
const grippedByOf = (p: SimProcess | undefined): number | undefined =>
  (p as { grippedBy?: number } | undefined)?.grippedBy

/** A wave-4 sim (the troll is active once the bridge has burned) carrying the given
 *  cast plus a keep-alive island buzzard so the wave never advances mid-test. */
async function trollSim(cast: SimProcess[]): Promise<SimState> {
  const smod = await loadSim()
  const base = smod.createWaveSim(SEED, 1)
  return withNoPendingEnemies({
    ...base,
    wave: 4,
    sim: { ...base.sim, processes: [...cast, enemyAt(0x201, ISLAND, stander(ISLAND))] },
    arena: { ...base.arena, bridgeBurned: true },
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the troll GRABS an enemy victim (it does not give up at LAVVFY).
//
// RED on develop: `stepTrolls` reads `victim.entity` (undefined for an enemy), so
// the LAVVFY check removes the troll before the grab commits — the enemy never
// gains `grippedBy`. GREEN: the grab path is kind-aware and the hand closes.
// ═════════════════════════════════════════════════════════════════════════════
describe('enemy grip — the lava troll grabs an enemy victim, it does not give up', () => {
  it('an enemy staged at the grip point gains grippedBy when the hand closes', async () => {
    const smod = await loadSim()
    const VICTIM_ID = 0x202
    const victimY = 120
    const enemy = enemyAt(VICTIM_ID, 100, entityAt(100, victimY))
    const troll = trollAtGrip(VICTIM_ID, 98, victimY + GRIP_Y_OFFSET)
    let d = await trollSim([enemy, troll])

    let committed = false
    for (let i = 0; i < 12; i++) {
      d = smod.stepSim(d)
      if (grippedByOf(enemyIn(d, VICTIM_ID)) !== undefined) committed = true
    }

    // RED on develop: the troll gives up at LAVVFY (victim.entity is undefined for
    // an enemy) and is removed; the enemy never gains grippedBy.
    expect(committed, 'the lava troll commits its grab on an enemy victim').toBe(true)
    // The troll is still present mid-grip (it is only consumed at the terminal —
    // escape or drown — which is well past this 12-frame grab window).
    expect(trollsIn(d).length, 'the troll is holding the enemy, not gone').toBe(1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — a gripped enemy pulled under drowns cinematically (SNELAV + sink).
//
// RED on develop: the troll gives up on the enemy (LAVVFY), so the enemy — still
// carrying the fixture's grippedBy — is frozen by frame.ts and never sinks or
// sounds. GREEN: the grip drives it under, the grip releases, and the one
// downstream stepLavaDeath pass owns the enemy's sink + SNELAV cue.
// ═════════════════════════════════════════════════════════════════════════════
describe('enemy grip-drown — a gripped enemy sinks and sounds SNELAV', () => {
  it('a gripped enemy pulled under sinks to FLOOR+20 on the ADGFLR cadence', async () => {
    const smod = await loadSim()
    const VICTIM_ID = 0x202
    const trollId = 0x15_0000 + VICTIM_ID
    const enemy = { ...enemyAt(VICTIM_ID, 100, entityAt(100, DEATH_Y - 3)), grippedBy: trollId } as SimProcess
    let d = await trollSim([enemy, trollGripping(VICTIM_ID, 98, DEATH_Y - 6)])

    // Precondition: the enemy really is in the troll's grip on arrival.
    expect(grippedByOf(enemyIn(d, VICTIM_ID)), 'the fixture stages a committed grip on the enemy').toBe(trollId)

    const ys: number[] = []
    let deepestY = DEATH_Y
    let sawMidSink = false
    let sawEnemy = false
    for (let i = 0; i < 200; i++) {
      d = smod.stepSim(d)
      const en = enemyIn(d, VICTIM_ID)
      const y = en?.enemy ? en.enemy.entity.posY >> 8 : SINK_FLOOR
      ys.push(y)
      if (en?.enemy) {
        sawEnemy = true
        deepestY = Math.max(deepestY, y)
        if (y > DEATH_Y && y < SINK_FLOOR) sawMidSink = true
      }
    }

    // RED on develop: the troll gives up (LAVVFY), the enemy is frozen with the
    // stale grippedBy and never descends past DEATH_Y-3.
    expect(sawEnemy, 'the enemy stays present to sink — not frozen, not removed same-frame').toBe(true)
    expect(sawMidSink, 'the enemy body is seen mid-descent — below FLOOR+7, above FLOOR+20').toBe(true)
    // The ADGFLR cadence: LAVA_SINK_NAP=3, so the body holds FLOOR+7 for three frames.
    expect(ys[0], 'the drown reseats the enemy to the FLOOR+7 surface on its onset frame').toBe(DEATH_Y)
    expect(ys[2], 'three frames in, the enemy is still at the FLOOR+7 surface (LAVA_SINK_NAP=3)').toBe(DEATH_Y)
    expect(deepestY, 'the gripped enemy drown carries the body all the way to FLOOR+20').toBeGreaterThanOrEqual(
      SINK_FLOOR,
    )
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i], 'the sink never reverses').toBeGreaterThanOrEqual(ys[i - 1])
    }
  })

  it('the gripped enemy drown sounds enemy-lava-death (SNELAV) exactly once', async () => {
    const smod = await loadSim()
    const VICTIM_ID = 0x202
    const trollId = 0x15_0000 + VICTIM_ID
    const enemy = { ...enemyAt(VICTIM_ID, 100, entityAt(100, DEATH_Y - 3)), grippedBy: trollId } as SimProcess
    let d = await trollSim([enemy, trollGripping(VICTIM_ID, 98, DEATH_Y - 6)])

    const kinds: string[] = []
    for (let i = 0; i < 200; i++) {
      d = smod.stepSim(d)
      for (const c of d.cues) kinds.push(c.type)
    }

    // RED on develop: the enemy never drowns (frozen), so no lava cue ever fires.
    expect(kinds, 'the gripped enemy drown is heard as its SNELAV cue, not silence').toContain('enemy-lava-death')
    expect(
      kinds.filter((k) => k === 'enemy-lava-death').length,
      'the enemy lava cue fires once for the whole sink, not every frame',
    ).toBe(1)
  })
})
