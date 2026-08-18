// tests/lava-death-jt13-5.test.ts
//
// Story jt13-5 — "Landing in lava must have consequences (death), not free
// swimming." RED authored by Tyr One-Handed (TEA); re-scoped by Loki Silvertongue
// (Dev) in review round 1 after Heimdall (Reviewer) caught a ROM mis-citation.
//
// ─── THE BUG ─────────────────────────────────────────────────────────────────
// jt11-18 turned the FLOOR+7 lava plane (isLavaDeath, arena.ts) into an ON-SCREEN
// BACKSTOP: the airborne lava arm of stepPlayerEntity (frame.ts) merely CLAMPS a
// fallen bird at DEATH_Y with velY=0 so it does not integrate off the bottom of
// the screen. It never removes the player and never books a life, so a knight who
// reaches the lava can SWIM there forever — the felt bug.
//
// ─── THE ROM (corrected in round 1) ──────────────────────────────────────────
// The non-gripped lava death is ADGFLR, "DEATH VIA SWIMMING IN THE LAVA"
// (JOUSTRV4.SRC:6523): once ADGCEI's FLOOR+7 test trips (:6508 `CMPA #FLOOR+7 /
// BHS ADGFLR`), the bird is DEAD — SNPLAV/SNELAV plays, WCLENY<7 (:6555) fires
// the [DDEAD] death routine (life lost), and the body sinks to FLOOR+20 (:6568).
// The ROM does NOT clear PVELX on this path — the `CLR PVELX` "PLAYER IS NOT
// GOING ANYWHERE" (~:6611) belongs to ADDLAV, the TROLL-GRIP gravity, which
// funnels into the SAME ADGFLR death via its JMP (~:6643). So "no sideways swim"
// is a CONSEQUENCE of the death (a removed knight cannot swim), not a separate
// velocity clear.
//
// ─── WHAT THIS FILE PINS ─────────────────────────────────────────────────────
//   A — a non-gripped knight that reaches lava depth is REMOVED (no free swim).
//   B — that removal costs the knight exactly one life (death has a consequence).
// The full ROM cinematic — the break-free window (ADDLAV), the visible sink to
// FLOOR+20, and the SNPLAV/SNELAV cue — is deferred to a filed follow-up (jt13-10);
// see the session's Delivery Findings.

import { describe, it, expect } from 'vitest'
import {
  loadSim,
  type SimState,
  type SimProcess,
  type EntityState,
} from './helpers/sim-contract.js'
import { loadGameExtra } from './helpers/game-contract.js'
import { withNoPendingEnemies } from './helpers/wave-entry.js'

const SEED = 0x1234

// ROM scalars (re-derived elsewhere; used here to drive + bound the behaviour).
// FLOOR = $DF (JOUSTRV4.SRC:37); DEATH_Y = FLOOR+7 = the lava surface / kill plane.
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
const playerIn = (d: SimState, id: number): SimProcess | undefined =>
  d.sim.processes.find((p) => p.kind === 'player' && p.id === id)

/** A wave-1 sim (troll-free — `trollSpawnable` gates the troll to wave >= 4) with
 *  the bridge burned by hand, carrying exactly the given cast. A keep-alive island
 *  buzzard (collisions off, on a real platform) holds the wave open so it never
 *  advances into troll territory behind our backs. */
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
// A — a non-gripped knight that reaches lava depth is REMOVED (no free swim).
//
// The knight starts airborne AT the lava surface over the burned plank. RED on
// develop: the isLavaDeath arm only CLAMPS it there, so it stays alive and swims
// forever. GREEN: the sim layer removes it — the death routine, not a clamp.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-5 A — reaching the lava removes the knight (no free swimming)', () => {
  it('a non-gripped knight at lava depth over a burned column stays to sink, not left swimming', async () => {
    const smod = await loadSim()
    let d = await burnedWave1Sim([playerAt(1, PLANK_L, DEATH_Y, { velXIndex: 4 })])

    // Non-vacuity: the knight really is at lava depth and present before we step.
    const before = playerIn(d, 1)
    expect(before?.entity && before.entity.posY >> 8, 'the knight starts at the lava surface').toBe(DEATH_Y)

    // jt13-10 RESCOPED the same-frame removal into a VISIBLE SINK: ADGFLR keeps the
    // body and sinks it (FLOOR+7 -> FLOOR+20) before respawn, so "no free swim" is
    // now "present but sinking, not swimming free." The eventual removal and the one
    // lost life are pinned by jt13-5 B below and by
    // tests/lava-death-cinematic-jt13-10.test.ts (AC2 sink + AC1 consequence guard).
    for (let i = 0; i < 4; i++) d = smod.stepSim(d)

    // Isolation: no lava troll can exist at wave 1, so this is the SWIM death.
    expect(trollsIn(d).length, 'wave 1 has no lava troll — the death is the swim death').toBe(0)
    const after = playerIn(d, 1)
    // RED on develop: removed the same frame -> undefined. GREEN: present, sinking.
    expect(after, 'the knight stays in the lava to sink, not removed the same frame it arrives').toBeDefined()
    expect(
      after?.entity && after.entity.posY >> 8,
      'and it is at or below the lava surface, sinking — not swimming free above it',
    ).toBeGreaterThanOrEqual(DEATH_Y)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// B — that removal costs the knight exactly one life.
//
// A lone knight falls into the lava over a burned column at WAVE 1 (troll-free).
// stepGame books a mount death when a player process disappears from the sim, so
// the removal above must show up as a lost life. RED on develop: the clamp keeps
// the knight alive, so no death is booked and `lives` stays at NSHIP.
// ═════════════════════════════════════════════════════════════════════════════
describe('jt13-5 B — sinking in the lava costs exactly one life', () => {
  it('falling into the lava over a burned column costs exactly one life (no troll involved)', async () => {
    const gmod = await loadGameExtra()
    const base = gmod.createGame(SEED, 1)
    expect(base.players[0].lives, 'the game opens at NSHIP men').toBe(NSHIP)

    const burned = await burnedWave1Sim([playerAt(1, PLANK_L, 200, { velY: 0x100 })]) // 1 px/frame down
    let game = { ...base, sim: burned }

    // jt13-10 widened the window from 60 to 130: the visible sink (FLOOR+7 ->
    // FLOOR+20 at one pixel per ~3 frames, then a ~30-frame pause) DEFERS the process
    // removal that books the life. This knight falls from y=200, so it reaches the
    // lava ~frame 30 and the whole cinematic completes ~frame 100; 130 spans it with
    // margin. Respawn on a safe pad (below) still prevents a re-drown, so "exactly
    // one" holds.
    let maxPlayerY = 200
    for (let i = 0; i < 130; i++) {
      game = gmod.stepGame(game)
      const p = playerIn(game.sim, 1)
      if (p?.entity) maxPlayerY = Math.max(maxPlayerY, p.entity.posY >> 8)
    }

    // Isolation: no troll ever existed, so the life lost is the swim death.
    expect(trollsIn(game.sim).length, 'wave 1 has no lava troll — the death is isolated').toBe(0)
    // Non-vacuity: the knight descended into lava territory. The guard is FLOOR
    // (223), a conservative lower bound that holds BOTH before jt13-10 (the body
    // clamped at DEATH_Y and removed same-frame) AND after it (the body sinks
    // visibly to FLOOR+20, so its deepest observable pixel is FLOOR+20, not
    // DEATH_Y-1). The exact deepest-pixel contract is pinned in jt13-10 AC2.
    expect(maxPlayerY, 'the knight fell into lava territory — the drop was exercised').toBeGreaterThanOrEqual(
      FLOOR,
    )
    // RED on develop: the clamp keeps the knight swimming, so lives stays at NSHIP.
    // Exactly one death: respawn lands on a safe pad (max pad Y 210 < DEATH_Y), so
    // the knight cannot re-drown within the window — a double-book would fail this.
    expect(game.players[0].lives, 'sinking in the lava costs exactly one life').toBe(NSHIP - 1)
  })
})
