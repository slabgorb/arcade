// tests/lava-death-cinematic-jt13-10.test.ts
//
// Story jt13-10 — "Lava death cinematic." RED authored by Tyr One-Handed (TEA).
// Follow-up to jt13-5, whose header explicitly deferred the ROM cinematic here.
//
// ─── THE ROM (JOUSTRV4.SRC, verified by TEA before RED) ──────────────────────
// The non-gripped lava death is ADGCEI -> ADGFLR ("DEATH VIA SWIMMING IN THE
// LAVA", :6508-6570). Once `CMPA #FLOOR+7 / BHS ADGFLR` (:6508-6509) trips, the
// bird is committed: SNPLAV (player) / SNELAV (enemy) plays (:6534-6538, VSND),
// the length-clip fires `[DDEAD]` (life lost, WCLENY<7 :6554-6556 -> JSR [DDEAD,Y]
// :6564), and `ADGDED` SINKS the body one pixel per ~3-frame nap (PCNAP 3, :6542)
// from FLOOR+7 to FLOOR+20 (`INC PPOSY+1 / CMPA #FLOOR+20+1 / BLO ADGLAV`, :6566-6569),
// then `PCNAP 30` (:6570) and respawns.
//
// The break-free VELOCITY test `CMPD #-$0180 / BLT ADLFRE` (:6616) lives in
// ADDLAV, "ADD IN LAVA TROLLS GRAVITY" (PATCH3, :6608-6642) — the routine PADGRA
// is patched to ONLY while a lava troll grips the bird. It is a GRIP mechanic,
// NOT a property of the non-gripped death, and it already ships in core/troll.ts
// (BREAK_FREE_VY, stepGrip, escalateGrip). See the session's Design Deviation
// DD-1: the story's AC1 "add the break-free window" is a GREEN fidelity GUARD
// (below), because the ROM gives a non-gripped bird NO velocity escape.
//
// ─── WHAT THIS FILE PINS ─────────────────────────────────────────────────────
//   AC1 (GUARD, green-on-arrival) — the break-free window is grip-EXCLUSIVE and
//        it CLOSES; a non-gripped bird gets no velocity reprieve.
//   AC2 (RED) — the non-gripped player death is a VISIBLE SINK to FLOOR+20, not a
//        same-frame removal.
//   AC3 (RED) — reaching the lava plays the distinct SNPLAV/SNELAV cue, wired as
//        a new EVENT_KIND through the audio manifest.
//
// Required interface (TEA sets it, so Dev's kind names are unambiguous): two new
// `EVENT_KINDS` — `player-lava-death` (SNPLAV) and `enemy-lava-death` (SNELAV) —
// parallel to `player-death`/`enemy-death`. See the session assessment.

import { describe, it, expect } from 'vitest'
import {
  loadSim,
  type SimState,
  type SimProcess,
  type EntityState,
} from './helpers/sim-contract.js'
import { loadGameExtra } from './helpers/game-contract.js'
import { loadTroll } from './helpers/troll-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'
import { CUE_SOURCES } from '../src/shell/audio-manifest.js'

const SEED = 0x1234

// ROM scalars (JOUSTRV4.SRC:37 FLOOR = $DF). DEATH_Y = FLOOR+7 (the lava kill
// plane, ADGCEI). SINK_FLOOR = FLOOR+20 (the bottom of the sink, :6568).
const FLOOR = 0xdf
const DEATH_Y = FLOOR + 7 // 230
const SINK_FLOOR = FLOOR + 20 // 243
const NSHIP = 5 // free-play men per player (TB12REV3.SRC:135)

// jt11-18's probe columns, verbatim: PLANK_L's footing exists ONLY via the
// wave-init ORA #$20, so a burn removes it and the outcome there becomes lava.
const PLANK_L = 20
const ISLAND = 100

// ─── Fixtures (jt13-5 / jt11-18 shapes, verbatim) ────────────────────────────

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
const playerIn = (d: SimState, id: number): SimProcess | undefined =>
  d.sim.processes.find((p) => p.kind === 'player' && p.id === id)

/** A wave-1 sim (troll-free — `trollSpawnable` gates the troll to wave >= 4) with
 *  the bridge burned by hand, carrying exactly the given cast. A keep-alive island
 *  buzzard holds the wave open so it never advances into troll territory. */
async function burnedWave1Sim(extra: SimProcess[]): Promise<SimState> {
  const smod = await loadSim()
  const base = smod.createWaveSim(SEED, 1)
  return withNoPendingEnemies({
    ...base,
    wave: 1,
    sim: {
      ...base.sim,
      processes: [enemyAt(0x201, ISLAND, stander(ISLAND)), ...extra],
    },
    arena: { ...base.arena, bridgeBurned: true },
  })
}

// ═════════════════════════════════════════════════════════════════════════════
// AC1 (GUARD) — the break-free window is grip-EXCLUSIVE and it CLOSES.
//
// These pass on develop TODAY and must STAY green: they lock the DD-1 ruling so a
// future change cannot smuggle a velocity break-free window into the non-gripped
// death (a fidelity regression) or let the grip window stay open forever.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-10 AC1 (guard) — break-free is a grip-only window that closes', () => {
  it('the grip HAS a break-free window: a hard sustained flap escapes during the grace', async () => {
    const t = await loadTroll()
    const grip = t.beginGrip(0x08) // grace pull, small (LAVGRA rung)
    // A flap strong enough that velY + pull is still below the -$0180 threshold.
    const step = t.stepGrip(-0x200, DEATH_Y << 8, grip, false)
    expect(step.escaped, 'a hard flap during the grace breaks the grip free').toBe(true)
    expect(step.inLava, 'an escaped victim is not in the lava this frame').toBe(false)
  })

  it('the grip window CLOSES: after escalation the same flap no longer frees the victim', async () => {
    const t = await loadTroll()
    let grip = t.beginGrip(0x08)
    const FLAP = -0x200 // the same flap that escaped above
    expect(t.stepGrip(FLAP, DEATH_Y << 8, grip, false).escaped, 'open during grace').toBe(true)
    // Run past the 30s grace, then keep escalating: PATCH2 grows the pull each frame
    // (CLVGRA += 1 up to the $500 cap), so the flap velocity needed to escape climbs.
    for (let i = 0; i < t.GRACE_FRAMES + 0x200; i++) grip = t.escalateGrip(grip)
    const late = t.stepGrip(FLAP, DEATH_Y << 8, grip, false)
    expect(late.escaped, 'once the pull has escalated, the same flap cannot break free').toBe(false)
    expect(late.inLava, 'the un-escaped victim is dragged into the lava').toBe(true)
  })

  it('the NON-gripped death gives no velocity reprieve — the grip break-free velocity does not save it', async () => {
    // A lone knight sits BELOW the lava surface (DEATH_Y+6) carrying velY equal to
    // the grip's break-free threshold (BREAK_FREE_VY). If a non-gripped bird had a
    // velocity window, this flap would free it; the ROM's non-gripped death (ADGFLR)
    // has none, so it dies and loses exactly one life. Positional, not velocity.
    const t = await loadTroll()
    const gmod = await loadGameExtra()
    const base = gmod.createGame(SEED, 1)
    const burned = await burnedWave1Sim([playerAt(1, PLANK_L, DEATH_Y + 6, { velY: t.BREAK_FREE_VY })])
    let game = { ...base, sim: burned }

    for (let i = 0; i < 120; i++) game = gmod.stepGame(game)

    expect(trollsIn(game.sim).length, 'wave 1 has no lava troll — this is the non-gripped death').toBe(0)
    expect(
      game.players[0].lives,
      'a non-gripped bird carrying the break-free velocity still dies — no velocity window',
    ).toBe(NSHIP - 1)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC2 (RED) — the non-gripped player death is a VISIBLE SINK to FLOOR+20.
//
// RED on develop: sim.ts removes the non-gripped player the SAME frame it reaches
// lava depth (and frame.ts clamps posY at DEATH_Y), so it is never present after
// that frame and its posY never descends past the surface. GREEN: ADGFLR keeps
// the body present and sinks it to FLOOR+20 before respawn.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-10 AC2 — reaching the lava is a visible sink, not a same-frame removal', () => {
  it('the knight is NOT removed the frame it reaches the lava — it stays to sink', async () => {
    const smod = await loadSim()
    let d = await burnedWave1Sim([playerAt(1, PLANK_L, DEATH_Y, { velXIndex: 4 })])

    expect(playerIn(d, 1)?.entity && (playerIn(d, 1)!.entity!.posY >> 8), 'starts at the lava surface').toBe(
      DEATH_Y,
    )

    d = smod.stepSim(d)

    expect(trollsIn(d).length, 'wave 1 has no lava troll — this is the swim death').toBe(0)
    // RED on develop: removed same frame -> undefined. GREEN: present, sinking.
    expect(playerIn(d, 1), 'the knight is still present the frame after reaching the lava (it sinks)').toBeDefined()
  })

  it('the body sinks all the way down to FLOOR+20 before it leaves', async () => {
    const smod = await loadSim()
    let d = await burnedWave1Sim([playerAt(1, PLANK_L, DEATH_Y, { velXIndex: 4 })])

    let deepestY = DEATH_Y
    for (let i = 0; i < 90; i++) {
      d = smod.stepSim(d)
      const p = playerIn(d, 1)
      if (p?.entity) deepestY = Math.max(deepestY, p.entity.posY >> 8)
    }

    expect(trollsIn(d).length, 'no troll — the sink is the non-gripped ADGFLR cinematic').toBe(0)
    // RED on develop: clamped at DEATH_Y (never sinks). GREEN: descends to FLOOR+20.
    expect(deepestY, 'the ROM sink carries the body from FLOOR+7 down to FLOOR+20').toBeGreaterThanOrEqual(
      SINK_FLOOR,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC3 (RED) — reaching the lava plays the distinct SNPLAV / SNELAV cue.
//
// RED on develop: no lava-death EVENT_KIND exists — the non-gripped death emits
// no cue at all (it books a life silently), and the manifest has no SNPLAV/SNELAV
// entry. GREEN: a `player-lava-death` cue (SNPLAV) fires and both tables are wired.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-10 AC3 — the lava death sounds SNPLAV/SNELAV, a new cue', () => {
  it('a non-gripped player lava death emits the distinct lava cue', async () => {
    const gmod = await loadGameExtra()
    const base = gmod.createGame(SEED, 1)
    const burned = await burnedWave1Sim([playerAt(1, PLANK_L, DEATH_Y, { velY: 0x100 })])
    let game = { ...base, sim: burned }

    // The game-contract helper types GameState without `events`, but stepGame
    // returns the frame's cue stream at runtime (game.ts: `events: [...sim.cues,
    // ...]`). Widen to read it, exactly as tests/audio-events.test.ts does.
    const eventsOf = (g: unknown): readonly { readonly type: string }[] =>
      (g as { events?: readonly { readonly type: string }[] }).events ?? []
    const kinds: string[] = []
    for (let i = 0; i < 90; i++) {
      game = gmod.stepGame(game)
      for (const e of eventsOf(game)) kinds.push(e.type)
    }

    // RED on develop: only the generic 'player-death' (SNPDIE) ever appears — the
    // lava cue does not exist. GREEN: the lava-specific cue fires (SNPLAV).
    expect(kinds, 'the lava death is heard as its own SNPLAV cue, not silence').toContain('player-lava-death')
  })

  it('the audio manifest wires both SNPLAV (player) and SNELAV (enemy)', () => {
    const tables = Object.values(CUE_SOURCES).map((s) => (s as { table: string }).table)
    // RED on develop: neither table has a cue entry yet.
    expect(tables, 'the player lava-death cue points at SNPLAV').toContain('SNPLAV')
    expect(tables, 'the enemy lava-death cue points at SNELAV').toContain('SNELAV')
  })
})
