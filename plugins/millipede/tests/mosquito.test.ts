// tests/mosquito.test.ts
//
// Story ml4-2 — RED phase (TEA). THE MOSQUITO: `MOSQT — ENTER AND MOVE THE
// MOSQUITO` (`MILLI.MAC:1324`, MQ-1). The mosquito shares motion-object slot
// 12 with the bee and dragonfly (MQ-3), enters on a frame-counter tick
// (masked-FRAME == 0x17, twice as often from 70,000 — MQ-4/5/6) once the
// centipede is short (CENTIN < 9, MQ-7), and flies a random DIAGONAL: BEEDH
// is ±speed by RND1 bit 7 (MQ-24/25), ADDED to H each tick with a bounce off
// both side walls that keeps the overshoot (MQ-13..16), while V SUBTRACTS the
// speed like every slot-12 critter (MQ-17). It plants NO mushrooms (MQ-19).
// Killed, it scores 400 — 1200 in a DDT cloud — and the playfield scrolls UP
// one row (SHOOT2's INC SCROLC, MQ-26..30). Every constant below carries an
// MQ-* claim in docs/rom-study/claims/10-dragonfly-mosquito.json,
// byte-verified against reference/original-source/millipede/ by the ml1-1
// citation gate.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/mosquito.ts — a pure cited reducer (conway.ts house style:
//   in-place mutation, deterministic, BYTE semantics — fields are 0..255,
//   -1 is 0xFF). One standalone subsystem per file (the ml4-1 rule): the
//   BEEMV2 spawn bytes are module-local copies, not imports. Exports:
//
//     MOSQUITO_SLOT = 12          // MILLI.MAC:1331/:1345 (MQ-3)
//     MOSQUITO_PIC = 0x0e         // :1405 (MQ-20); band 0x0e..0x0f (MQ-8/9)
//     MOSQUITO_COLOR = 0x79       // :238 via BEEMV2 (MQ-21)
//     MOSQUITO_SPAWN_V = 0xf8     // :225 via BEEMV2 (MQ-21)
//     MOSQUITO_PTS = 400          // :2128 (MQ-28)
//     MOSQUITO_DDT_PTS = 1200     // :2131 (MQ-29)
//
//     interface MosquitoSlot { color; pic; v; h; dv; dh; pts }
//         // BEEC / BEEP / BEEV / BEEH / BEEDV / BEEDH / PTS. color 0 = free.
//         // (No hl: MOSQT adds BEEDH whole — no fixed-point fraction.)
//     interface MosquitoEnv {
//       frame;                    // FRAME byte
//       score2;                   // SCORE2 — the BCD ten-thousands byte
//       slow;                     // SLOW byte (MQ-11)
//       playerAlive;              // the PLAYP/PEXPLD gate (:1325-1328, MQ-2)
//       rnd0; rnd1;               // POKEY random bytes
//       centin;                   // CENTIN (MQ-7)
//     }
//
//     isMosquito(slot): boolean                 // :1348-1354 (MQ-8/9)
//     mosquitoSpawnTick(frame, score2): boolean // :1333-1340 (MQ-4/5/6)
//     mayStartMosquito(env): boolean            // tick + CENTIN < 9 (MQ-7)
//     mosquitoSpeed(score2): 2 | 3              // :1410-1426 (MQ-22/23)
//     spawnH(rnd0): number | null               // BEEMV2 :228-234 (MQ-21);
//         // null = the ROM's reroll, deferred to the next tick (the same
//         // logged Design Deviation as the dragonfly's)
//     startMosquito(slot, env): void            // MOSQT3 spawn writes (MQ-20..25)
//     trySpawnMosquito(slot, env): boolean      // slot-free + gates + valid rnd0
//     moveMosquito(slot, env):
//       { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }
//         // one MOSQT sweep for ONE live mosquito: flap (:1355-1362), H add
//         // + wall bounce (:1370-1380), V subtract + BEEOFF (:1381-1389).
//         // The OBSTAC/DDTEXP/PLAY seams (:1391-1398) stay with their
//         // callers; there is NO mushroom-planting decision to return (MQ-19)
//         // — 'moved' deliberately carries no plant field.
//     mosquitoOff(slot): void                   // BEEOFF :166-171 (MQ-31)
//     mosquitoKill(byDdt): { points: number; scrollUp: true }
//         // SHOOT2 :2127-2131 (MQ-27/28/29) — the beetleKill shape, inverted
//         // scroll: INC SCROLC, positive is up (MLDEF.MAC:372, MQ-30)
//
// ─── SCOPE (the ml4-1 precedent) ─────────────────────────────────────────────
// • Upright cabinet only: CKIND/CKFF modelled clear (the :1385 EOR CKFF and
//   MOSQT3's :1427-1429 cocktail COMP are identity); cocktail is ml8-3.
// • CHAN5 sound pacing (:1363-1369, :1408-1409) is an ml6 seam — not modelled.
// • The SECURA copy-protection block (:1417-1425) is anti-piracy, not game
//   behaviour: on genuine hardware it falls through to speed 3. Not modelled.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` — literals here are hex; a trailing period
// (`12.`, `36.`) marks DECIMAL.
//
// ─── ORIENTATION ────────────────────────────────────────────────────────────
// V DECREASES downward: spawn at V=0xF8 (top), SUBTRACT dv until V<4 (bottom,
// MQ-17/18). H DECREASES rightward: H<0x0C is the RIGHT wall, H≥0xF5 the LEFT
// (MQ-14/15).
//
// ─── FIXTURE DERIVATION ─────────────────────────────────────────────────────
// Every expected byte below was hand-derived from the cited 6502 lines this
// session (TEA). No committed helper reimplements the algorithm — the
// literals stand alone.

import { describe, it, expect } from 'vitest'

interface MosquitoSlot {
  color: number
  pic: number
  v: number
  h: number
  dv: number
  dh: number
  pts: number
}

interface MosquitoEnv {
  frame: number
  score2: number
  slow: number
  playerAlive: boolean
  rnd0: number
  rnd1: number
  centin: number
}

type MosquitoMove = { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }

interface MosquitoModule {
  MOSQUITO_SLOT: number
  MOSQUITO_PIC: number
  MOSQUITO_COLOR: number
  MOSQUITO_SPAWN_V: number
  MOSQUITO_PTS: number
  MOSQUITO_DDT_PTS: number
  isMosquito: (slot: Readonly<MosquitoSlot>) => boolean
  mosquitoSpawnTick: (frame: number, score2: number) => boolean
  mayStartMosquito: (env: Readonly<MosquitoEnv>) => boolean
  mosquitoSpeed: (score2: number) => number
  spawnH: (rnd0: number) => number | null
  startMosquito: (slot: MosquitoSlot, env: Readonly<MosquitoEnv>) => void
  trySpawnMosquito: (slot: MosquitoSlot, env: Readonly<MosquitoEnv>) => boolean
  moveMosquito: (slot: MosquitoSlot, env: Readonly<MosquitoEnv>) => MosquitoMove
  mosquitoOff: (slot: MosquitoSlot) => void
  mosquitoKill: (byDdt: boolean) => { points: number; scrollUp: true }
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const MOSQUITO_SPECIFIER = ['..', 'src', 'core', 'mosquito'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadMosquito(): Promise<MosquitoModule> {
  try {
    const mod = (await import(/* @vite-ignore */ MOSQUITO_SPECIFIER)) as Partial<MosquitoModule>
    if (typeof mod.moveMosquito !== 'function') throw new Error('module has no moveMosquito export')
    if (typeof mod.trySpawnMosquito !== 'function') throw new Error('module has no trySpawnMosquito export')
    return mod as MosquitoModule
  } catch (e) {
    throw new Error(
      'mosquito reducer not built yet — GREEN (Dev) ships src/core/mosquito.ts per the ' +
      'contract at the top of tests/mosquito.test.ts (pure, cited, byte semantics). ' +
      `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** A free slot as BEEOFF leaves it. */
function freeSlot(over: Partial<MosquitoSlot> = {}): MosquitoSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, pts: 0, ...over }
}

/** A live mid-screen mosquito in a known state (even frame → no flap). */
function mosquito(over: Partial<MosquitoSlot> = {}): MosquitoSlot {
  return { color: 0x79, pic: 0x0e, v: 0x50, h: 0x40, dv: 2, dh: 2, pts: 0, ...over }
}

function env(over: Partial<MosquitoEnv> = {}): MosquitoEnv {
  return {
    frame: 0, score2: 0, slow: 0, playerAlive: true,
    rnd0: 0x47, rnd1: 0x00, centin: 0, ...over,
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Cited constants
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — cited constants', () => {
  it('pins the slot, picture, spawn bytes and scores (MQ-3/20/21/28/29)', async () => {
    const m = await loadMosquito()
    expect(m.MOSQUITO_SLOT, 'BEEC+12. spawn slot (MILLI.MAC:1331, MQ-3)').toBe(12)
    expect(m.MOSQUITO_PIC, 'MOSQT3 picture (MILLI.MAC:1405, MQ-20)').toBe(0x0e)
    expect(m.MOSQUITO_COLOR, 'BEEMV2 colour (MILLI.MAC:238, MQ-21)').toBe(0x79)
    expect(m.MOSQUITO_SPAWN_V, 'BEEMV2 top-row V (MILLI.MAC:225, MQ-21)').toBe(0xf8)
    expect(m.MOSQUITO_PTS, '400 points (MILLI.MAC:2128, MQ-28)').toBe(400)
    expect(m.MOSQUITO_DDT_PTS, 'BCD 12 hundreds by DDT (MILLI.MAC:2131, MQ-29)').toBe(1200)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Identification — the MOSQT/SHOOT2 picture band (MQ-8/9/26)
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — identification', () => {
  it('pics 0x0e and 0x0f are mosquitoes; the band edges are not (MQ-8/9)', async () => {
    const m = await loadMosquito()
    expect(m.isMosquito(mosquito({ pic: 0x0e }))).toBe(true)
    expect(m.isMosquito(mosquito({ pic: 0x0f })), 'the flapped frame is still a mosquito').toBe(true)
    expect(m.isMosquito(mosquito({ pic: 0x0d })), 'CMP I,0E / BCC (MQ-9)').toBe(false)
    expect(m.isMosquito(mosquito({ pic: 0x10 })), 'CMP I,10 / BCS (MQ-8)').toBe(false)
  })

  it('a free slot (color 0) is never a mosquito', async () => {
    const m = await loadMosquito()
    expect(m.isMosquito(freeSlot({ pic: 0x0e }))).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The spawn tick (:1333-1340, MQ-4/5/6) and gates (MQ-7)
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — spawn tick and gates', () => {
  it('below 70,000 the FULL frame byte must equal 0x17 — one tick in 256 (MQ-4/6)', async () => {
    const m = await loadMosquito()
    expect(m.mosquitoSpawnTick(0x17, 0x00)).toBe(true)
    expect(m.mosquitoSpawnTick(0x16, 0x00)).toBe(false)
    expect(m.mosquitoSpawnTick(0x97, 0x00), 'no 7F mask below 70k — 0x97 is NOT a tick').toBe(false)
  })

  it('from 70,000 the frame is masked with 0x7f — every 128 frames (MQ-5)', async () => {
    const m = await loadMosquito()
    expect(m.mosquitoSpawnTick(0x97, 0x07), 'AND I,7F opens the second phase').toBe(true)
    expect(m.mosquitoSpawnTick(0x17, 0x07)).toBe(true)
    expect(m.mosquitoSpawnTick(0x97, 0x06), 'CPY I,7 / BCC — 60k still unmasked').toBe(false)
  })

  it('CENTIN 9 blocks the start; 8 passes (MQ-7)', async () => {
    const m = await loadMosquito()
    expect(m.mayStartMosquito(env({ frame: 0x17, centin: 8 }))).toBe(true)
    expect(m.mayStartMosquito(env({ frame: 0x17, centin: 9 })), 'CMP I,9 / BCS').toBe(false)
    expect(m.mayStartMosquito(env({ frame: 0x18, centin: 0 })), 'off-tick frames never start').toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Speed (:1410-1426, MQ-22/23)
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — speed', () => {
  it('2 below 90,000; 3 from 90,000 (MQ-22/23)', async () => {
    const m = await loadMosquito()
    expect(m.mosquitoSpeed(0x00)).toBe(2)
    expect(m.mosquitoSpeed(0x08)).toBe(2)
    expect(m.mosquitoSpeed(0x09), 'CPY I,9 / BCC — 90k is fast').toBe(3)
    expect(m.mosquitoSpeed(0x99)).toBe(3)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Spawn writes — MOSQT3 + BEEMV2 (:1405-1435, MQ-20..25)
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — spawn', () => {
  it('spawnH masks RND0 with 0xf8, rejects <0x10, subtracts 4 (MQ-21)', async () => {
    const m = await loadMosquito()
    expect(m.spawnH(0x00)).toBeNull()
    expect(m.spawnH(0x0f)).toBeNull()
    expect(m.spawnH(0x10)).toBe(0x0c)
    expect(m.spawnH(0x47)).toBe(0x3c)
    expect(m.spawnH(0xff)).toBe(0xf4)
  })

  it('startMosquito writes the MOSQT3 slot bytes; RND1 bit 7 clear flies one diagonal (MQ-20/21/22/24)', async () => {
    const m = await loadMosquito()
    const slot = freeSlot()
    m.startMosquito(slot, env({ rnd0: 0x47, rnd1: 0x00, score2: 0 }))
    expect(slot.pic, 'picture 0x0e (MQ-20)').toBe(0x0e)
    expect(slot.v, 'top row (MQ-21)').toBe(0xf8)
    expect(slot.h, 'random column').toBe(0x3c)
    expect(slot.color, 'turned on').toBe(0x79)
    expect(slot.dv, 'speed 2 below 90k (MQ-22)').toBe(2)
    expect(slot.dh, 'BIT RND1 / BPL — positive keeps +speed (MQ-24)').toBe(2)
  })

  it('RND1 bit 7 set flies the other diagonal — dh is the COMP of the speed (MQ-24/25)', async () => {
    const m = await loadMosquito()
    const slot = freeSlot()
    m.startMosquito(slot, env({ rnd1: 0x80, score2: 0 }))
    expect(slot.dh, '0x100 - 2').toBe(0xfe)
    const fast = freeSlot()
    m.startMosquito(fast, env({ rnd1: 0x80, score2: 0x09 }))
    expect(fast.dv, 'fast at 90k (MQ-23)').toBe(3)
    expect(fast.dh, '0x100 - 3').toBe(0xfd)
  })

  it('trySpawnMosquito refuses a taken slot, an off-tick frame, and an invalid RND0', async () => {
    const m = await loadMosquito()
    const taken = mosquito({ pic: 0x1e })
    expect(m.trySpawnMosquito(taken, env({ frame: 0x17 })), 'a dragonfly holds slot 12 (MQ-3)').toBe(false)
    expect(taken.pic, 'the resident is not clobbered').toBe(0x1e)
    expect(m.trySpawnMosquito(freeSlot(), env({ frame: 0x18 })), 'EOR I,17 misses (MQ-6)').toBe(false)
    const slot = freeSlot()
    expect(m.trySpawnMosquito(slot, env({ frame: 0x17, rnd0: 0x0f })), 'reroll modelled as defer').toBe(false)
    expect(slot.color).toBe(0)
  })

  it('trySpawnMosquito spawns on the tick through an open gate', async () => {
    const m = await loadMosquito()
    const slot = freeSlot()
    expect(m.trySpawnMosquito(slot, env({ frame: 0x17, centin: 8, rnd0: 0xff }))).toBe(true)
    expect(slot.color).toBe(0x79)
    expect(slot.h).toBe(0xf4)
  })

  it('a dead player spawns nothing — MOSQT returns at the gate (MQ-2)', async () => {
    const m = await loadMosquito()
    const slot = freeSlot()
    expect(m.trySpawnMosquito(slot, env({ frame: 0x17, playerAlive: false }))).toBe(false)
    expect(slot.color).toBe(0)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Movement — H add + wall bounce, V subtract (:1370-1389, MQ-13..18)
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — movement', () => {
  it('h ADDS dh and v SUBTRACTS dv each tick (MQ-13/17)', async () => {
    const m = await loadMosquito()
    const slot = mosquito()
    const r = m.moveMosquito(slot, env({ frame: 0x02 }))
    expect(r.kind).toBe('moved')
    expect(slot.h, '0x40 + 2 (MQ-13)').toBe(0x42)
    expect(slot.v, '0x50 - 2 (MQ-17)').toBe(0x4e)
  })

  it('a negative dh flies the other diagonal', async () => {
    const m = await loadMosquito()
    const slot = mosquito({ dh: 0xfe })
    m.moveMosquito(slot, env({ frame: 0x02 }))
    expect(slot.h, '0x40 + 0xfe (byte add)').toBe(0x3e)
  })

  it('the right wall (post-move h < 0x0c) bounces: dh negates, the overshoot POSITION stays (MQ-14/16)', async () => {
    const m = await loadMosquito()
    const slot = mosquito({ h: 0x0a, dh: 1 })
    m.moveMosquito(slot, env({ frame: 0x02 }))
    expect(slot.h, 'CMP I,0C / BCC after the store — h keeps 0x0b').toBe(0x0b)
    expect(slot.dh, 'COMP (MQ-16)').toBe(0xff)
  })

  it('landing exactly on 0x0c does NOT bounce (MQ-14)', async () => {
    const m = await loadMosquito()
    const slot = mosquito({ h: 0x0b, dh: 1 })
    m.moveMosquito(slot, env({ frame: 0x02 }))
    expect(slot.h).toBe(0x0c)
    expect(slot.dh).toBe(1)
  })

  it('the left wall (post-move h ≥ 0xf5) bounces the same way (MQ-15/16)', async () => {
    const m = await loadMosquito()
    const slot = mosquito({ h: 0xf3, dh: 2 })
    m.moveMosquito(slot, env({ frame: 0x02 }))
    expect(slot.h, 'CMP I,0F5 / BCC — 0xf5 is off').toBe(0xf5)
    expect(slot.dh).toBe(0xfe)
    const inside = mosquito({ h: 0xf2, dh: 2 })
    m.moveMosquito(inside, env({ frame: 0x02 }))
    expect(inside.h, '0xf4 is still on screen').toBe(0xf4)
    expect(inside.dh).toBe(2)
  })

  it('a post-move v of 4 stays; 3 leaves via BEEOFF (MQ-18/31)', async () => {
    const m = await loadMosquito()
    const edge = mosquito({ v: 6, dv: 2 })
    expect(m.moveMosquito(edge, env({ frame: 0x02 })).kind, 'CMP I,4 / BCS — 4 stays').toBe('moved')
    const gone = mosquito({ v: 5, dv: 2, pts: 0x2a })
    expect(m.moveMosquito(gone, env({ frame: 0x02 })).kind).toBe('offscreen')
    expect(gone.color, 'BEEOFF frees the slot (MQ-31)').toBe(0)
    expect(gone.h, 'H cleared').toBe(0)
    expect(gone.pts, 'the PTS stamp entry is cleared').toBe(0)
  })

  it('mosquitoOff alone clears color, h and pts — and nothing else (MQ-31)', async () => {
    const m = await loadMosquito()
    const slot = mosquito({ pts: 0x33 })
    m.mosquitoOff(slot)
    expect([slot.color, slot.h, slot.pts]).toEqual([0, 0, 0])
    expect(slot.v, 'BEEOFF does not touch V').toBe(0x50)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Wing flap (:1355-1362, MQ-10/11/12)
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — wing flap', () => {
  it('flaps on odd frames only (MQ-10/12)', async () => {
    const m = await loadMosquito()
    const even = mosquito()
    m.moveMosquito(even, env({ frame: 0x02 }))
    expect(even.pic, 'AND I,01 / BEQ — even frame holds').toBe(0x0e)
    const odd = mosquito()
    m.moveMosquito(odd, env({ frame: 0x03 }))
    expect(odd.pic, 'EOR 01 (MQ-10)').toBe(0x0f)
    m.moveMosquito(odd, env({ frame: 0x05 }))
    expect(odd.pic, 'and back').toBe(0x0e)
  })

  it('slow-down mode flaps every tick (MQ-11)', async () => {
    const m = await loadMosquito()
    const slot = mosquito()
    m.moveMosquito(slot, env({ frame: 0x02, slow: 0xe0 }))
    expect(slot.pic).toBe(0x0f)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The player-alive gate (:1325-1328, MQ-2)
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — player-alive gate', () => {
  it('a dead player idles the whole sweep — nothing moves, nothing flaps', async () => {
    const m = await loadMosquito()
    const slot = mosquito()
    const before = { ...slot }
    const r = m.moveMosquito(slot, env({ frame: 0x03, playerAlive: false }))
    expect(r).toEqual({ kind: 'idle' })
    expect(slot).toEqual(before)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Scoring — SHOOT2 (:2127-2131, MQ-26..30)
// ───────────────────────────────────────────────────────────────────────────────
describe('mosquito — kill scoring', () => {
  it('a shot mosquito is 400 and the playfield scrolls UP (MQ-27/28/30)', async () => {
    const m = await loadMosquito()
    expect(m.mosquitoKill(false)).toEqual({ points: 400, scrollUp: true })
  })

  it('a DDT-cloud kill is 1200 — and still scrolls up (MQ-27/29)', async () => {
    const m = await loadMosquito()
    expect(m.mosquitoKill(true), 'INC SCROLC runs before the DDT test').toEqual({ points: 1200, scrollUp: true })
  })
})
