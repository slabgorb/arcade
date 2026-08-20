// tests/lava-troll-grip-drown-cinematic-jt13-11.test.ts
//
// Story jt13-11 — RED phase (TEA, Tyr One-Handed). Follow-up to jt13-10.
//
// ─── THE ROM (JOUSTRV4.SRC, re-verified by TEA before RED) ───────────────────
// jt13-10 shipped the ADGFLR "DEATH VIA SWIMMING IN THE LAVA" cinematic
// (:6523-6570) for the NON-gripped lava death: on reaching FLOOR+7 the bird is
// dead — SNPLAV (player) / SNELAV (enemy) plays, and ADGDED SINKS the body one
// pixel per PCNAP-3 from FLOOR+7 to FLOOR+20 before it leaves. In this port that
// is `stepLavaDeath` (sim.ts), driven by the post-`stepTrolls` filter.
//
// The LAVA-TROLL GRIP path is the ROM's OTHER entry into the very same routine:
// ADDLAV ("ADD IN LAVA TROLLS GRAVITY", PATCH3, :6608-6642) folds the troll's
// pull into the victim's fall, and once the fall crosses FLOOR+7 it JMPs into the
// SAME ADGFLR cinematic (~:6643). So a gripped drown must sink AND sound
// SNPLAV/SNELAV, identically to the non-gripped swim death.
//
// ─── THE GAP THIS FILE PINS ──────────────────────────────────────────────────
// This port does NOT yet route the grip-drown through ADGFLR. `stepTrolls`'s
// `gs.inLava` branch (sim.ts) removes the gripped victim the SAME FRAME with no
// sink and no cue (pre-jt13-5 behaviour) — see the header comment at sim.ts's
// non-gripped `stepLavaDeath` block, which names this as jt13-11. jt13-10 left
// this path untested.
//
//   AC1 (RED) — a gripped victim pulled under is NOT removed the same frame; the
//        body stays and SINKS gradually FLOOR+7 -> FLOOR+20, like the swim death.
//   AC2 (RED) — the gripped drown emits the same player-lava-death (SNPLAV) cue
//        the non-gripped ADGFLR death does, exactly once for the whole sink.
//
// ─── SCOPE NOTE (enemy grip-drown deferred — a SEPARATE gap) ──────────────────
// The `stepTrolls` grip branch reads `victim.entity` directly (an enemy's flight
// state lives under `.enemy.entity`, so `!victim.entity` makes the troll GIVE UP
// on an enemy victim at the LAVVFY check — jt9-42 broadened the pick + wake-order,
// not the grip integration). An enemy grip-drown therefore never reaches the
// `gs.inLava` branch at all today; wiring it is a distinct fix from jt13-11's
// "route the gs.inLava branch through stepLavaDeath". Filed as a Delivery Finding.
// These tests exercise the PLAYER grip-drown, which the branch actually drives and
// which the story concretely targets.
//
// node env (dynamic import of the modules off disk). This header never spells the
// vitest env directive as a token.

import { describe, it, expect } from 'vitest'
import { loadSim, type SimState, type SimProcess, type EntityState } from './helpers/sim-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const SEED = 0x1234
const PLAYER1_ID = 1

// ROM scalars (JOUSTRV4.SRC:37 FLOOR = $DF). DEATH_Y = FLOOR+7 (the lava kill
// plane, ADGCEI). SINK_FLOOR = FLOOR+20 (the bottom of the sink, :6568).
const FLOOR = 0xdf
const DEATH_Y = FLOOR + 7 // 230
const SINK_FLOOR = FLOOR + 20 // 243

// The escalated grip's $500 cap (troll.ts PULL_CAP / CMPD #$500). A capped,
// grace-expired grip pulls hard enough to carry the victim across FLOOR+7 within a
// frame — the deterministic terminal a no-flap struggle always reaches.
const PULL_CAP = 0x500

// jt13-10's keep-alive island buzzard, verbatim: a grounded enemy far from the
// lava holds the wave open so it never advances and spawns fresh birds mid-sink.
const ISLAND = 100
// pt1-13: the lava troll can only HOLD a bird within LAVVIC range (posX-2 <= 40 or >= 240);
// a central column is released as through-a-platform. Stage the drown victim at posX 41
// (posX-2 = 39 <= 40, IN range) — chosen just PAST the burned-shore lava-troll cells
// (X in [-32,38]) so the drowning body is NOT re-seized by the per-contact grab on its
// onset frame. The sink cadence is Y-based, so the column does not change what this measures.
const GRIP_X = 41

// ─── Fixtures (jt13-10 / jt13-7 shapes) ──────────────────────────────────────

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
  } as SimProcess
}

const stander = (posX: number, over: Partial<EntityState> = {}): EntityState =>
  entityAt(posX, 210, { airborne: false, groundState: 'stand', posY: 210 << 8, ...over })

function enemyAt(id: number, posX: number, entity: EntityState): SimProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'enemy',
    enemy: { entity, facing: 1, pchase: 1, brain: 'boundr', decision: 'boundr', plavt: 1 },
    enemyType: 'bounder',
    collisionEnabled: false,
  } as SimProcess
}

/** A lava troll ALREADY holding a capped grip on `victimId` — it skips the LT1HT
 *  hand-rise and drives the ADDLAV grip branch of `stepTrolls` from frame one. */
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
const playerIn = (d: SimState, id: number): SimProcess | undefined =>
  d.sim.processes.find((p) => p.kind === 'player' && p.id === id)

/** A wave-4 sim (the troll is active only once the bridge has burned) carrying a
 *  gripped victim, its captor, and a keep-alive island buzzard. Pending wave
 *  enemies are cleared so nothing else enters. */
async function grippedDrownSim(cast: SimProcess[]): Promise<SimState> {
  const smod = await loadSim()
  const base = smod.createWaveSim(SEED, 1)
  return withNoPendingEnemies({
    ...base,
    wave: 4,
    sim: {
      ...base.sim,
      processes: [...cast, enemyAt(0x201, ISLAND, stander(ISLAND))],
    },
    arena: { ...base.arena, bridgeBurned: true },
  })
}

/** Read `grippedBy` through a narrow widening — the sim-contract process type does
 *  surface it, but the finder returns the base type. */
const grippedByOf = (p: SimProcess | undefined): number | undefined =>
  (p as { grippedBy?: number } | undefined)?.grippedBy

// ═════════════════════════════════════════════════════════════════════════════
// AC1 — the gripped drown is a VISIBLE SINK to FLOOR+20, not a same-frame removal.
//
// RED on develop: `stepTrolls`'s gs.inLava branch removes the gripped victim the
// frame it crosses FLOOR+7, so it is never present below the surface and never
// sinks. GREEN: it routes through ADGFLR/stepLavaDeath and descends to FLOOR+20.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-11 AC1 — a gripped victim pulled under sinks like the swim death', () => {
  it('the body is NOT removed the frame it reaches the lava — it stays and sinks to FLOOR+20', async () => {
    const smod = await loadSim()
    const trollId = 0x15_0000 + PLAYER1_ID
    const victim = { ...playerAt(PLAYER1_ID, GRIP_X, DEATH_Y - 3), grippedBy: trollId } as SimProcess
    let d = await grippedDrownSim([victim, trollGripping(PLAYER1_ID, GRIP_X, DEATH_Y - 6)])

    // Precondition: the victim really is in the troll's grip on arrival.
    expect(grippedByOf(playerIn(d, PLAYER1_ID)), 'the fixture stages a committed grip').toBe(trollId)

    const ys: number[] = []
    let deepestY = DEATH_Y
    let sawMidSink = false
    let trollGoneOnOnsetFrame = false
    for (let i = 0; i < 200; i++) {
      d = smod.stepSim(d)
      // The onset frame is the FIRST step — the capped grip carries the victim across
      // FLOOR+7 at once. The ROM consumes the troll that SAME frame (LT2DIE), so a
      // regression dropping `removed.add(troll.id)` is caught HERE. (The eventual
      // trollsIn===0 is NOT a proof it ran: an unrelated LAVVFY orphan-cleanup removes
      // the troll a frame late anyway once its victim leaves — mutation-verified.)
      if (i === 0) trollGoneOnOnsetFrame = trollsIn(d).length === 0
      const p = playerIn(d, PLAYER1_ID)
      // Once removed at the end of the sink the body is gone; treat that as "at the
      // floor" so the monotone check still holds across the final removal frame.
      const y = p?.entity ? p.entity.posY >> 8 : SINK_FLOOR
      ys.push(y)
      if (p?.entity) {
        deepestY = Math.max(deepestY, y)
        if (y > DEATH_Y && y < SINK_FLOOR) sawMidSink = true
      }
    }

    // Same-frame LT2DIE consumption — kills a mutant that drops the troll removal.
    expect(trollGoneOnOnsetFrame, 'the troll is consumed the SAME frame the victim drowns (LT2DIE)').toBe(
      true,
    )

    // CADENCE — the gripped sink must match the non-gripped ADGFLR cadence EXACTLY (the
    // ROM JMPs both entries into the same routine). LAVA_SINK_NAP=3, so the body holds
    // the FLOOR+7 surface for three frames before the first one-pixel drop. Pinning the
    // exact frames (mirroring lava-death-cinematic-jt13-10.test.ts) catches a regression
    // that runs stepLavaDeath twice per frame — onset in stepTrolls AND in the downstream
    // filter — which spends a nap tick early and drops on frame 3 (index 2) not frame 4.
    expect(ys[0], 'the drown reseats the body to the FLOOR+7 surface on its onset frame').toBe(DEATH_Y)
    expect(ys[2], 'three frames in, the body is still at the FLOOR+7 surface (LAVA_SINK_NAP=3)').toBe(DEATH_Y)
    // Twenty frames in, strictly mid-descent — below the surface, not yet at the floor.
    expect(ys[20], 'twenty frames in, the body is sinking below the surface').toBeGreaterThan(DEATH_Y)
    expect(ys[20], 'twenty frames in, the body is not yet at the floor').toBeLessThan(SINK_FLOOR)

    // The whole point of "visible sink": the body is seen strictly BELOW the surface
    // but not yet at the floor. Kills both a same-frame removal (never seen sinking)
    // and a teleport straight to FLOOR+20 on the onset frame.
    expect(sawMidSink, 'the body is seen mid-descent — below FLOOR+7, above FLOOR+20').toBe(true)
    // RED on develop: removed at the surface, never sinks -> deepestY stays FLOOR+7.
    expect(deepestY, 'the gripped drown carries the body all the way to FLOOR+20').toBeGreaterThanOrEqual(
      SINK_FLOOR,
    )
    // The descent never bobs back up while sinking.
    for (let i = 1; i < ys.length; i++) {
      expect(ys[i], 'the sink never reverses').toBeGreaterThanOrEqual(ys[i - 1])
    }
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 — the gripped drown sounds SNPLAV, the SAME cue as the non-gripped death.
//
// RED on develop: the gs.inLava branch removes the victim with no cue at all — the
// grip-drown is silent. GREEN: it emits `player-lava-death` (SNPLAV), once.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-11 AC2 — the gripped drown sounds SNPLAV, exactly once', () => {
  it('a gripped player drown emits player-lava-death once, like the swim death', async () => {
    const smod = await loadSim()
    const trollId = 0x15_0000 + PLAYER1_ID
    const victim = { ...playerAt(PLAYER1_ID, GRIP_X, DEATH_Y - 3), grippedBy: trollId } as SimProcess
    let d = await grippedDrownSim([victim, trollGripping(PLAYER1_ID, GRIP_X, DEATH_Y - 6)])

    const kinds: string[] = []
    for (let i = 0; i < 200; i++) {
      d = smod.stepSim(d)
      for (const c of d.cues) kinds.push(c.type)
    }

    // Non-vacuity: the drown happened (troll consumed, no flap -> no escape).
    expect(trollsIn(d).length, 'the grip resolved to a lava death').toBe(0)
    // RED on develop: the grip branch removes the victim with no cue. GREEN: it
    // sounds the same SNPLAV cue the non-gripped ADGFLR death does.
    expect(kinds, 'the gripped drown is heard as its SNPLAV cue, not silence').toContain('player-lava-death')
    expect(
      kinds.filter((k) => k === 'player-lava-death').length,
      'the lava cue fires once for the whole sink, not every frame',
    ).toBe(1)
  })
})
