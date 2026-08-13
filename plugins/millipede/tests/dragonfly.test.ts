// tests/dragonfly.test.ts
//
// Story ml4-2 — RED phase (TEA). THE DRAGONFLY: `FLYMV — ENTER AND MOVE
// DRAGONFLY` (`MILLI.MAC:1004`, DF-1). The dragonfly lives in motion-object
// slot 12 (DF-3), spawns only while the top of the screen is short of
// mushrooms (the BEEMV1 curve + 0x30, DF-7/49..52) and the centipede is
// nearly gone (CENTIN < 10, DF-9). It weaves horizontally on a FRAME-driven
// triangle wave accumulated as 8.8 fixed point (FLYMV1, DF-16..27), dives by
// SUBTRACTING its vertical speed (the shared BEEMV0, DF-39), and plants
// mushrooms in its wake like a bee — every fourth frame, with a probability
// mask that HALVES inside the player area (DF-42..48). Killed, it scores 500,
// or 1500 in a DDT cloud (SHOOT2, DF-54/55). Every constant below carries a
// DF-* claim in docs/rom-study/claims/10-dragonfly-mosquito.json,
// byte-verified against reference/original-source/millipede/ by the ml1-1
// citation gate.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/dragonfly.ts — a pure cited reducer (conway.ts house style:
//   in-place mutation, deterministic, BYTE semantics — fields are 0..255,
//   -1 is 0xFF). Exports:
//
//     DRAGONFLY_SLOT = 12          // MILLI.MAC:1011/:1025 (DF-3)
//     DRAGONFLY_PIC = 0x1e         // :1139 (DF-28); band 0x1e..0x1f (DF-11/12)
//     DRAGONFLY_COLOR = 0x79       // :238 (DF-38)
//     DRAGONFLY_SPAWN_V = 0xf8     // :225 (DF-33)
//     DRAGONFLY_MUSH_V_OFFSET = 4  // :131 (DF-42) — the OBSTAC cell is v+4
//     DRAGONFLY_PTS = 500          // :2121 (DF-54)
//     DRAGONFLY_DDT_PTS = 1500     // :2124 (DF-55)
//
//     interface DragonflySlot { color; pic; v; h; dv; dh; hl; pts }
//         // BEEC / BEEP / BEEV / BEEH / BEEDV / BEEDH / BEEHL / PTS.
//         // color 0 = free slot. hl is the FRACTIONAL H byte (DF-60).
//     interface DragonflyEnv {
//       frame;                     // FRAME byte
//       score2;                    // SCORE2 — the BCD ten-thousands byte
//       attract;                   // MODE bit 7 (DF-25/43)
//       slow;                      // SLOW byte (MLDEF.MAC:392, DF-58)
//       nocent;                    // NOCENT byte (MLDEF.MAC:391, DF-59)
//       playerAlive;               // the PLAYP/PEXPLD gate (:1005-1008, DF-2)
//       rnd0; rnd1;                // POKEY random bytes
//       dead;                      // DEAD byte (DF-5)
//       beetles;                   // BEETLS (DF-6)
//       mushTop;                   // MUSH+2 — mushrooms near the top (DF-57)
//       centin;                    // CENTIN (DF-9)
//     }
//
//     isDragonfly(slot): boolean               // :1030-1036 (DF-11/12)
//     mushroomsNeeded(score2): number          // BEEMV1 :179-194 (DF-49..52)
//     flySpawnThreshold(score2): number        // BEEMV1 + 0x30 + exit CARRY (:1019, DF-7/52)
//     mayStartDragonfly(env): boolean          // gates :1013-1024 (DF-5/6/8/9)
//     dragonflySpeed(env): 1 | 2 | 3           // FLYMV3 :1142-1153 (DF-29..32)
//     spawnH(rnd0): number | null              // BEEMV2 :228-234 (DF-34/35/36);
//         // null = the ROM's reroll (it spins on fresh RND0 — see the logged
//         // Design Deviation: a pure single-byte model defers to next tick)
//     startDragonfly(slot, env): void          // FLYMV3+BEEMV2 spawn writes
//     trySpawnDragonfly(slot, env): boolean    // slot-free + gates + valid rnd0
//     moveDragonfly(slot, env):
//       | { kind: 'idle' }                     // player dead — FLYMV RTS (DF-2)
//       | { kind: 'offscreen' }                // BEEOFF ran (DF-40/41)
//       | { kind: 'moved'; audioOffset: number; plantMushroom: boolean }
//         // one FLYMV sweep for ONE live dragonfly: flap (:1037-1044),
//         // FLYMV1 horizontal (:1083-1136), BEEMV0 vertical + the plant
//         // DECISION (:120-159). audioOffset is FLYMV1's TEMP2+1 exit byte
//         // (DF-16). The OBSTAC/DDTEXP/PLAY/MUSHER seams stay with their
//         // callers (the ml4-1 Delivery-Findings routing): plantMushroom is
//         // the reducer's decision, applied by the caller only if the DDT/
//         // player seams didn't kill first.
//     dragonflyOff(slot): void                 // BEEOFF :166-171 (DF-41)
//     dragonflyKill(byDdt): { points: number } // SHOOT2 :2121-2124 (DF-54/55)
//
// ─── SCOPE (the ml4-1 precedent) ─────────────────────────────────────────────
// • Upright cabinet only (ml3-4/ml4-1): CKIND/CKF8/CKFF modelled clear — every
//   EOR CKF8/CKFF is identity; cocktail is ml8-3.
// • CHAN4/AUDC1/AUDF1 sound writes (:1058-1075) are ml6 seams; only FLYMV1's
//   audio OFFSET (a pure motion by-product, DF-16) crosses the contract.
// • Attract MODE sequencing is ml7; the two attract BRANCHES inside the
//   reducer (score-as-zero DF-25, plant-in-bomb-mode DF-43) are modelled.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` — literals here are hex; a trailing period
// in the source (`12.`, `10.`) marks DECIMAL.
//
// ─── ORIENTATION ────────────────────────────────────────────────────────────
// V DECREASES downward: the dragonfly spawns at V=0xF8 (top) and BEEMV0
// SUBTRACTS dv (DF-39) until V<4 (bottom, DF-40). H DECREASES rightward:
// H<0x0E is the RIGHT edge (DF-20), H≥0xF4 the LEFT (DF-21).
//
// ─── FIXTURE DERIVATION ─────────────────────────────────────────────────────
// Every expected byte below was hand-derived from the cited 6502 lines this
// session (TEA), including the 8.8 fixed-point shift/carry chains. No
// committed helper reimplements the algorithm — the literals stand alone.

import { describe, it, expect } from 'vitest'

interface DragonflySlot {
  color: number
  pic: number
  v: number
  h: number
  dv: number
  dh: number
  hl: number
  pts: number
}

interface DragonflyEnv {
  frame: number
  score2: number
  attract: boolean
  slow: number
  nocent: number
  playerAlive: boolean
  rnd0: number
  rnd1: number
  dead: number
  beetles: number
  mushTop: number
  centin: number
}

type DragonflyMove =
  | { kind: 'idle' }
  | { kind: 'offscreen' }
  | { kind: 'moved'; audioOffset: number; plantMushroom: boolean }

interface DragonflyModule {
  DRAGONFLY_SLOT: number
  DRAGONFLY_PIC: number
  DRAGONFLY_COLOR: number
  DRAGONFLY_SPAWN_V: number
  DRAGONFLY_MUSH_V_OFFSET: number
  DRAGONFLY_PTS: number
  DRAGONFLY_DDT_PTS: number
  isDragonfly: (slot: Readonly<DragonflySlot>) => boolean
  mushroomsNeeded: (score2: number) => number
  flySpawnThreshold: (score2: number) => number
  mayStartDragonfly: (env: Readonly<DragonflyEnv>) => boolean
  dragonflySpeed: (env: Readonly<DragonflyEnv>) => number
  spawnH: (rnd0: number) => number | null
  startDragonfly: (slot: DragonflySlot, env: Readonly<DragonflyEnv>) => void
  trySpawnDragonfly: (slot: DragonflySlot, env: Readonly<DragonflyEnv>) => boolean
  moveDragonfly: (slot: DragonflySlot, env: Readonly<DragonflyEnv>) => DragonflyMove
  dragonflyOff: (slot: DragonflySlot) => void
  dragonflyKill: (byDdt: boolean) => { points: number }
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const DRAGONFLY_SPECIFIER = ['..', 'src', 'core', 'dragonfly'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadDragonfly(): Promise<DragonflyModule> {
  try {
    const mod = (await import(/* @vite-ignore */ DRAGONFLY_SPECIFIER)) as Partial<DragonflyModule>
    if (typeof mod.moveDragonfly !== 'function') throw new Error('module has no moveDragonfly export')
    if (typeof mod.trySpawnDragonfly !== 'function') throw new Error('module has no trySpawnDragonfly export')
    return mod as DragonflyModule
  } catch (e) {
    throw new Error(
      'dragonfly reducer not built yet — GREEN (Dev) ships src/core/dragonfly.ts per the ' +
      'contract at the top of tests/dragonfly.test.ts (pure, cited, byte semantics). ' +
      `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** A free slot as BEEOFF leaves it. */
function freeSlot(over: Partial<DragonflySlot> = {}): DragonflySlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, hl: 0, pts: 0, ...over }
}

/** A live mid-screen dragonfly in a known state (even frame, no wave fold). */
function fly(over: Partial<DragonflySlot> = {}): DragonflySlot {
  return { color: 0x79, pic: 0x1e, v: 0x50, h: 0x40, dv: 1, dh: 0, hl: 0, pts: 0, ...over }
}

function env(over: Partial<DragonflyEnv> = {}): DragonflyEnv {
  return {
    frame: 0, score2: 0, attract: false, slow: 0, nocent: 0, playerAlive: true,
    rnd0: 0x47, rnd1: 0x01, dead: 1, beetles: 0, mushTop: 0, centin: 0, ...over,
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Cited constants
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — cited constants', () => {
  it('pins the slot, pictures, spawn bytes and scores (DF-3/28/38/33/42/54/55)', async () => {
    const m = await loadDragonfly()
    expect(m.DRAGONFLY_SLOT, 'BEEC+12. spawn slot (MILLI.MAC:1011, DF-3)').toBe(12)
    expect(m.DRAGONFLY_PIC, 'FLYMV3 picture (MILLI.MAC:1139, DF-28)').toBe(0x1e)
    expect(m.DRAGONFLY_COLOR, 'BEEMV2 colour (MILLI.MAC:238, DF-38)').toBe(0x79)
    expect(m.DRAGONFLY_SPAWN_V, 'BEEMV2 top-row V (MILLI.MAC:225, DF-33)').toBe(0xf8)
    expect(m.DRAGONFLY_MUSH_V_OFFSET, 'the mushroom cell is v+4 (MILLI.MAC:131, DF-42)').toBe(4)
    expect(m.DRAGONFLY_PTS, '500 points (MILLI.MAC:2121, DF-54)').toBe(500)
    expect(m.DRAGONFLY_DDT_PTS, 'BCD 15 hundreds by DDT (MILLI.MAC:2124, DF-55)').toBe(1500)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Identification — the SHOOT2/FLYMV picture band (DF-11/12/53)
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — identification', () => {
  it('pics 0x1e and 0x1f are dragonflies; the band edges are not (DF-11/12)', async () => {
    const m = await loadDragonfly()
    expect(m.isDragonfly(fly({ pic: 0x1e }))).toBe(true)
    expect(m.isDragonfly(fly({ pic: 0x1f })), 'the flapped frame is still a dragonfly').toBe(true)
    expect(m.isDragonfly(fly({ pic: 0x1d })), 'CMP I,1E / BCC — earwig band (DF-12)').toBe(false)
    expect(m.isDragonfly(fly({ pic: 0x20 })), 'CMP I,20 / BCS — bee band (DF-11)').toBe(false)
  })

  it('a free slot (color 0) is never a dragonfly, whatever its stale pic says', async () => {
    const m = await loadDragonfly()
    expect(m.isDragonfly(freeSlot({ pic: 0x1e }))).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The mushroom curve — BEEMV1 (:179-194, DF-49..52) and the FLYMV threshold
// (:1019, DF-7) with its carry trap
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — mushrooms-needed curve and spawn threshold', () => {
  it('BEEMV1: 5 below 20k, 9 to 120k, halved+6 beyond, capped at 0x2f (DF-49/50/51/52)', async () => {
    const m = await loadDragonfly()
    expect(m.mushroomsNeeded(0x00), 'below 20,000 (DF-49)').toBe(5)
    expect(m.mushroomsNeeded(0x01)).toBe(5)
    expect(m.mushroomsNeeded(0x02), 'at 20,000 (DF-50)').toBe(9)
    expect(m.mushroomsNeeded(0x11), 'just under 120,000').toBe(9)
    expect(m.mushroomsNeeded(0x12), '0x12>>1 + 6 (DF-51)').toBe(0x0f)
    expect(m.mushroomsNeeded(0x52), '0x52>>1 + 6 = 0x2f, one BELOW the cap').toBe(0x2f)
    expect(m.mushroomsNeeded(0x99), 'capped (DF-52)').toBe(0x2f)
  })

  it('the FLYMV threshold is BEEMV1 + 0x30 — plus BEEMV1\'s exit CARRY on the cap path only (DF-7/52)', async () => {
    const m = await loadDragonfly()
    expect(m.flySpawnThreshold(0x00)).toBe(0x35)
    expect(m.flySpawnThreshold(0x02)).toBe(0x39)
    expect(m.flySpawnThreshold(0x12)).toBe(0x3f)
    // The trap: 0x52 computes 0x2f UNCAPPED (BCC → carry clear) → 0x5f, while
    // 0x99 hits the LDA I,2F cap (CMP left carry SET) → 0x2f+0x30+1 = 0x60.
    // A port that always (or never) adds the carry fails one of these.
    expect(m.flySpawnThreshold(0x52), 'uncapped 0x2f, carry clear').toBe(0x5f)
    expect(m.flySpawnThreshold(0x99), 'capped 0x2f, carry SET — the ceiling 0x60 (DF-7)').toBe(0x60)
    // The tightest flip: 0x53>>1+6 = 0x2f (uncapped, carry clear) but
    // 0x54>>1+6 = 0x30 (capped, carry set) — adjacent inputs, both landing on
    // need 0x2f, split only by the carry.
    expect(m.mushroomsNeeded(0x53)).toBe(0x2f)
    expect(m.mushroomsNeeded(0x54)).toBe(0x2f)
    expect(m.flySpawnThreshold(0x53), 'one below the cap edge').toBe(0x5f)
    expect(m.flySpawnThreshold(0x54), 'first capped input (DF-52)').toBe(0x60)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Spawn gates (:1011-1024, DF-4/5/6/8/9)
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — spawn gates', () => {
  it('with the centipede alive, the top must hold at least the threshold... inverted: spawn needs threshold ≥ MUSH+2 (DF-5/8)', async () => {
    const m = await loadDragonfly()
    // score2=0 → threshold 0x35: a top count AT the threshold passes, one above blocks.
    expect(m.mayStartDragonfly(env({ dead: 1, mushTop: 0x35 })), 'CMP/BCC — equal passes').toBe(true)
    expect(m.mayStartDragonfly(env({ dead: 1, mushTop: 0x36 })), 'too many mushrooms at the top (DF-8)').toBe(false)
  })

  it('centipede dead + beetle on screen skips the mushroom check (DF-6)', async () => {
    const m = await loadDragonfly()
    expect(m.mayStartDragonfly(env({ dead: 0, beetles: 1, mushTop: 0xff }))).toBe(true)
  })

  it('centipede dead + NO beetle still runs the mushroom check (DF-5/6)', async () => {
    const m = await loadDragonfly()
    expect(m.mayStartDragonfly(env({ dead: 0, beetles: 0, mushTop: 0xff }))).toBe(false)
    expect(m.mayStartDragonfly(env({ dead: 0, beetles: 0, mushTop: 0x35 }))).toBe(true)
  })

  it('no flies while the centipede is nearly whole — CENTIN 10 decimal blocks, 9 passes (DF-9)', async () => {
    const m = await loadDragonfly()
    expect(m.mayStartDragonfly(env({ centin: 9 }))).toBe(true)
    expect(m.mayStartDragonfly(env({ centin: 10 })), 'CMP I,10. / BCS (decimal 10)').toBe(false)
  })

  it('the cap-path carry reaches the gate: at 0x99 a top of 0x60 passes, 0x61 blocks (DF-7/52)', async () => {
    const m = await loadDragonfly()
    expect(m.mayStartDragonfly(env({ score2: 0x99, mushTop: 0x60 }))).toBe(true)
    expect(m.mayStartDragonfly(env({ score2: 0x99, mushTop: 0x61 }))).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Speed — FLYMV3 (:1142-1153, DF-29..32)
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — vertical speed', () => {
  it('1 below 50k, 2 from 50k, 3 from 150k (DF-30/29/32)', async () => {
    const m = await loadDragonfly()
    expect(m.dragonflySpeed(env({ score2: 0x00 }))).toBe(1)
    expect(m.dragonflySpeed(env({ score2: 0x04 }))).toBe(1)
    expect(m.dragonflySpeed(env({ score2: 0x05 })), 'CPY I,5 / BCS (DF-30)').toBe(2)
    expect(m.dragonflySpeed(env({ score2: 0x14 }))).toBe(2)
    expect(m.dragonflySpeed(env({ score2: 0x15 })), 'CPY I,15 / BCS (DF-29)').toBe(3)
  })

  it('bombing mode (NOCENT) forces at least 2 below 50k, and never slows 150k+ (DF-31)', async () => {
    const m = await loadDragonfly()
    expect(m.dragonflySpeed(env({ score2: 0x00, nocent: 1 }))).toBe(2)
    expect(m.dragonflySpeed(env({ score2: 0x15, nocent: 1 }))).toBe(3)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Spawn writes — BEEMV2 + FLYMV3 (:225-240, :1139-1158, DF-28/33..38)
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — spawn', () => {
  it('spawnH masks RND0 with 0xf8, rejects <0x10, and subtracts 4 (DF-34/35/36)', async () => {
    const m = await loadDragonfly()
    expect(m.spawnH(0x00), 'masked zero rerolls (DF-34)').toBeNull()
    expect(m.spawnH(0x0f), 'below 0x10 rerolls (DF-35)').toBeNull()
    expect(m.spawnH(0x10)).toBe(0x0c)
    expect(m.spawnH(0x47), '0x47&0xf8 = 0x40, minus 4 (DF-36)').toBe(0x3c)
    expect(m.spawnH(0xff)).toBe(0xf4)
  })

  it('startDragonfly writes the FLYMV3/BEEMV2 slot bytes (DF-28/33/36/37/38)', async () => {
    const m = await loadDragonfly()
    // dh seeded non-zero so the DF-37 reset is a real write, not the fixture default
    const slot = freeSlot({ dh: 0xaa })
    m.startDragonfly(slot, env({ rnd0: 0x47, score2: 0 }))
    expect(slot.pic, 'picture 0x1e (DF-28)').toBe(0x1e)
    expect(slot.v, 'top row (DF-33)').toBe(0xf8)
    expect(slot.h, 'random column (DF-36)').toBe(0x3c)
    expect(slot.dh, 'direction mask starts 0 (DF-37)').toBe(0)
    expect(slot.color, 'turned on (DF-38)').toBe(0x79)
    expect(slot.dv, 'speed 1 at score 0 (DF-32)').toBe(1)
  })

  it('trySpawnDragonfly refuses a taken slot and leaves it untouched (DF-4)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ pic: 0x38 })
    expect(m.trySpawnDragonfly(slot, env())).toBe(false)
    expect(slot.pic, 'the resident (a bee) is not clobbered').toBe(0x38)
  })

  it('trySpawnDragonfly refuses a closed gate and an invalid RND0 byte', async () => {
    const m = await loadDragonfly()
    expect(m.trySpawnDragonfly(freeSlot(), env({ centin: 10 })), 'gate closed (DF-9)').toBe(false)
    const slot = freeSlot()
    expect(m.trySpawnDragonfly(slot, env({ rnd0: 0x0f })), 'reroll modelled as defer (DF-35)').toBe(false)
    expect(slot.color, 'nothing written').toBe(0)
  })

  it('trySpawnDragonfly spawns through an open gate (DF-3)', async () => {
    const m = await loadDragonfly()
    const slot = freeSlot()
    expect(m.trySpawnDragonfly(slot, env({ dead: 1, mushTop: 0, centin: 0, rnd0: 0xff }))).toBe(true)
    expect(slot.color).toBe(0x79)
    expect(slot.h).toBe(0xf4)
  })

  it('a dead player spawns nothing — FLYMV returns at the gate (DF-2)', async () => {
    const m = await loadDragonfly()
    const slot = freeSlot()
    expect(m.trySpawnDragonfly(slot, env({ playerAlive: false }))).toBe(false)
    expect(slot.color).toBe(0)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Horizontal motion — FLYMV1 (:1083-1136, DF-17..27). All bytes hand-derived;
// the 16-bit step is (wave ^ dh) sign-extended ×8 (×16 from 30k), split into
// BEEHL (fraction, +carry) and BEEH (integer).
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — horizontal weave (FLYMV1)', () => {
  it('frame 0x08: wave 0x20, step +0x100 of 8.8 — h advances exactly 1 (DF-17/24/27)', async () => {
    const m = await loadDragonfly()
    const slot = fly()
    const r = m.moveDragonfly(slot, env({ frame: 0x08 }))
    expect(slot.h, '0x40 + 1').toBe(0x41)
    expect(slot.hl, 'no fraction left').toBe(0x00)
    expect(r).toMatchObject({ kind: 'moved', audioOffset: 0x40 })
  })

  it('from 30,000 the step doubles: same frame moves h by 2 (DF-26)', async () => {
    const m = await loadDragonfly()
    const slot = fly()
    m.moveDragonfly(slot, env({ frame: 0x08, score2: 0x03 }))
    expect(slot.h, 'CPY I,3 / BCS → one more ASL').toBe(0x42)
  })

  it('attract mode zeroes the score for the motion — no doubling at 0x99 (DF-25)', async () => {
    const m = await loadDragonfly()
    const slot = fly()
    m.moveDragonfly(slot, env({ frame: 0x08, score2: 0x99, attract: true }))
    expect(slot.h, 'LDY #00 under BIT MODE').toBe(0x41)
  })

  it('frame 0x20 folds to wave -1: step -8/256 rides the fraction (DF-18/24/27)', async () => {
    const m = await loadDragonfly()
    const slot = fly()
    const r = m.moveDragonfly(slot, env({ frame: 0x20 }))
    expect(slot.h, '0x40 + 0xff integer + no carry').toBe(0x3f)
    expect(slot.hl, 'fraction 0xf8').toBe(0xf8)
    expect(r).toMatchObject({ kind: 'moved', audioOffset: 0xfe })
  })

  it('the fractional carry rides into h: hl 0x10 - 8 carries back to 0x40 (DF-27)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ hl: 0x10 })
    m.moveDragonfly(slot, env({ frame: 0x20 }))
    expect(slot.hl).toBe(0x08)
    expect(slot.h, '0x40 + 0xff + CARRY = 0x40').toBe(0x40)
  })

  it('the dh mask inverts the wave: frame 0x08 under dh 0xff steps -264/256 (DF-19)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ dh: 0xff })
    const r = m.moveDragonfly(slot, env({ frame: 0x08 }))
    expect(slot.h, '0x40 + 0xfe integer').toBe(0x3e)
    expect(slot.hl).toBe(0xf8)
    expect(r).toMatchObject({ kind: 'moved', audioOffset: 0xbe })
  })

  it('right edge (h<0x0e) bounces an inward... rightward wave: dh flips, step negates (DF-20/22/23)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ h: 0x0d })
    const r = m.moveDragonfly(slot, env({ frame: 0x20 }))
    expect(slot.dh, 'EOR 0xff (DF-22)').toBe(0xff)
    expect(slot.h, 'COMP(0xff)=+1 → ×8 is all fraction, h holds').toBe(0x0d)
    expect(slot.hl).toBe(0x08)
    expect(r).toMatchObject({ kind: 'moved', audioOffset: 0x02 })
  })

  it('left edge (h≥0xf4) bounces a leftward wave: -1.0 exactly (DF-21/22/23)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ h: 0xf4 })
    m.moveDragonfly(slot, env({ frame: 0x08 }))
    expect(slot.dh).toBe(0xff)
    expect(slot.h, 'COMP(0x20)=0xe0 → ×8 = -0x100 exactly').toBe(0xf3)
    expect(slot.hl).toBe(0x00)
  })

  it('a leftward wave at the RIGHT edge passes without bouncing (DF-20)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ h: 0x0d })
    m.moveDragonfly(slot, env({ frame: 0x08 }))
    expect(slot.dh, 'BPL 38$ — going to the left, no bounce').toBe(0)
    expect(slot.h).toBe(0x0e)
  })

  it('a rightward wave at the LEFT edge passes without bouncing (DF-21)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ h: 0xf4 })
    m.moveDragonfly(slot, env({ frame: 0x20 }))
    expect(slot.dh, 'BMI 38$ — going to the right, no bounce').toBe(0)
    expect(slot.h, '-8/256: integer 0xff, no fraction carry').toBe(0xf3)
    expect(slot.hl).toBe(0xf8)
  })

  it('the triangle fold engages exactly at wave 0x40 and releases at 0xc0 (DF-18)', async () => {
    const m = await loadDragonfly()
    // frame 0x10 → wave 0x40 folds to 0x3f: audio 0x7e, step +1 (an unfolded
    // 0x40 would read negative and walk h BACKWARDS)
    const atFold = fly()
    const r1 = m.moveDragonfly(atFold, env({ frame: 0x10 }))
    expect(r1).toMatchObject({ kind: 'moved', audioOffset: 0x7e })
    expect(atFold.h, 'CMP I,40 / BCC — 0x40 is inside the fold').toBe(0x41)
    // frame 0x30 → wave 0xc0 does NOT fold: a negative step, h walks back 2
    const pastFold = fly()
    const r2 = m.moveDragonfly(pastFold, env({ frame: 0x30 }))
    expect(r2).toMatchObject({ kind: 'moved', audioOffset: 0x80 })
    expect(pastFold.h, 'CMP I,0C0 / BCS — 0xc0 is outside the fold').toBe(0x3e)
    expect(pastFold.hl).toBe(0x00)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Wing flap (:1037-1044, DF-13/14/15)
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — wing flap', () => {
  it('flaps on odd frames only (DF-13/15)', async () => {
    const m = await loadDragonfly()
    const even = fly()
    m.moveDragonfly(even, env({ frame: 0x08 }))
    expect(even.pic, 'AND I,01 / BEQ — even frame holds').toBe(0x1e)
    const odd = fly()
    m.moveDragonfly(odd, env({ frame: 0x05 }))
    expect(odd.pic, 'EOR 01 (DF-13)').toBe(0x1f)
    m.moveDragonfly(odd, env({ frame: 0x07 }))
    expect(odd.pic, 'and back').toBe(0x1e)
  })

  it('slow-down mode flaps every tick, even frames included (DF-14)', async () => {
    const m = await loadDragonfly()
    const slot = fly()
    m.moveDragonfly(slot, env({ frame: 0x08, slow: 0xe0 }))
    expect(slot.pic).toBe(0x1f)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Vertical dive + leaving the screen — BEEMV0/BEEOFF (:120-128, :166-171,
// DF-39/40/41)
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — vertical dive and exit', () => {
  it('v moves by SUBTRACTING dv (DF-39)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ v: 0x50, dv: 2 })
    const r = m.moveDragonfly(slot, env({ frame: 0x04 }))
    expect(slot.v).toBe(0x4e)
    expect(r.kind).toBe('moved')
  })

  it('a post-move v of 4 is still on screen; 3 leaves via BEEOFF (DF-40/41)', async () => {
    const m = await loadDragonfly()
    const edge = fly({ v: 6, dv: 2 })
    expect(m.moveDragonfly(edge, env({ frame: 0x04 })).kind, 'CMP I,4 / BCC — 4 stays').toBe('moved')
    const gone = fly({ v: 5, dv: 2, pts: 0x2a })
    expect(m.moveDragonfly(gone, env({ frame: 0x04 })).kind).toBe('offscreen')
    expect(gone.color, 'BEEOFF frees the slot').toBe(0)
    expect(gone.h, 'H cleared — prevents blanking other motion objects').toBe(0)
    expect(gone.pts, 'the PTS stamp entry is cleared (DF-41/56)').toBe(0)
  })

  it('dragonflyOff alone clears color, h and pts (DF-41)', async () => {
    const m = await loadDragonfly()
    const slot = fly({ pts: 0x33 })
    m.dragonflyOff(slot)
    expect([slot.color, slot.h, slot.pts]).toEqual([0, 0, 0])
    expect(slot.v, 'BEEOFF does not touch V').toBe(0x50)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The mushroom trail — BEEMV0's plant decision (:139-159, DF-43..48).
// frame 0x04 keeps h static (wave 0x10 ×8 = 0x80 all-fraction) and satisfies
// FRAME AND 03 = 0, isolating the decision.
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — mushroom trail decision', () => {
  it('above the player area (v≥0x48) the mask is 1 — plants on even RND1 bytes (DF-46/48)', async () => {
    const m = await loadDragonfly()
    const r1 = m.moveDragonfly(fly({ v: 0x50, dv: 2 }), env({ frame: 0x04, rnd1: 0x00 }))
    expect(r1).toMatchObject({ kind: 'moved', plantMushroom: true })
    const r2 = m.moveDragonfly(fly({ v: 0x50, dv: 2 }), env({ frame: 0x04, rnd1: 0x01 }))
    expect(r2).toMatchObject({ kind: 'moved', plantMushroom: false })
    const r3 = m.moveDragonfly(fly({ v: 0x50, dv: 2 }), env({ frame: 0x04, rnd1: 0xfe }))
    expect(r3, 'only bit 0 counts against mask 1').toMatchObject({ kind: 'moved', plantMushroom: true })
  })

  it('inside the player area (v<0x48) the mask is 7 — one byte in eight (DF-47/48)', async () => {
    const m = await loadDragonfly()
    const r1 = m.moveDragonfly(fly({ v: 0x42, dv: 2 }), env({ frame: 0x04, rnd1: 0x08 }))
    expect(r1, '7 AND 8 = 0 plants').toMatchObject({ kind: 'moved', plantMushroom: true })
    const r2 = m.moveDragonfly(fly({ v: 0x42, dv: 2 }), env({ frame: 0x04, rnd1: 0x04 }))
    expect(r2).toMatchObject({ kind: 'moved', plantMushroom: false })
  })

  it('the area boundary uses the POST-move v: landing exactly on 0x48 is above (DF-46)', async () => {
    const m = await loadDragonfly()
    const r = m.moveDragonfly(fly({ v: 0x4a, dv: 2 }), env({ frame: 0x04, rnd1: 0x01 }))
    expect(r, 'CMP I,48 / BCS at equal → mask 1, and 1&1 blocks').toMatchObject({ kind: 'moved', plantMushroom: false })
  })

  it('only every fourth frame plants (DF-45)', async () => {
    const m = await loadDragonfly()
    const r = m.moveDragonfly(fly({ v: 0x50, dv: 2 }), env({ frame: 0x05, rnd1: 0x00 }))
    expect(r).toMatchObject({ kind: 'moved', plantMushroom: false })
  })

  it('bombing mode plants nothing in normal play — but attract overrides it (DF-43/44)', async () => {
    const m = await loadDragonfly()
    const normal = m.moveDragonfly(fly({ v: 0x50, dv: 2 }), env({ frame: 0x04, rnd1: 0x00, nocent: 1 }))
    expect(normal, 'LDA NOCENT / BNE 28$ (DF-44)').toMatchObject({ kind: 'moved', plantMushroom: false })
    const attract = m.moveDragonfly(fly({ v: 0x50, dv: 2 }), env({ frame: 0x04, rnd1: 0x00, nocent: 1, attract: true }))
    expect(attract, 'BIT MODE / BMI 10$ skips the NOCENT check (DF-43)').toMatchObject({ kind: 'moved', plantMushroom: true })
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The player-alive gate (:1005-1008, DF-2)
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — player-alive gate', () => {
  it('a dead player idles the whole sweep — nothing moves, nothing flaps', async () => {
    const m = await loadDragonfly()
    const slot = fly()
    const before = { ...slot }
    const r = m.moveDragonfly(slot, env({ frame: 0x05, playerAlive: false }))
    expect(r).toEqual({ kind: 'idle' })
    expect(slot).toEqual(before)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Scoring — SHOOT2 (:2121-2124, DF-53/54/55)
// ───────────────────────────────────────────────────────────────────────────────
describe('dragonfly — kill scoring', () => {
  it('a shot dragonfly is 500; a DDT-cloud kill is 1500 (DF-54/55)', async () => {
    const m = await loadDragonfly()
    expect(m.dragonflyKill(false)).toEqual({ points: 500 })
    expect(m.dragonflyKill(true), 'LDY I,15 — BCD 15 hundreds').toEqual({ points: 1500 })
  })
})
