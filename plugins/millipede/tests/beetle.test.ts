// tests/beetle.test.ts
//
// Story ml4-1 — RED phase (TEA). THE BEETLE: `BEETL — MOVE AND START BEETLE`
// (`MILLI.MAC:243`, BT-1), the first of the ml4 menagerie. The beetle borrows
// the centipede's 12 motion-object slots (NCENT, `MLDEF.MAC:188`, BT-2),
// enters on the "row about new heads", walks a slow L-shaped patrol timed by
// BEETL1 (`MILLI.MAC:392`), and — its signature — turns the mushrooms it
// crosses into indestructible ROCKs (`MILLI.MAC:373-377`, BT-34/35). Its
// difficulty DIP is D1 (`MLDEF.MAC:88`, BT-3); its kill pays 300 (900 by DDT)
// and scrolls the playfield down (`MILLI.MAC:2089-2096`, BT-43/44/45).
// Every constant below carries a BT-* claim in
// docs/rom-study/claims/09-beetle-spider.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/beetle.ts — a pure cited reducer (the conway.ts house style:
//   in-place mutation of the passed records, deterministic, byte semantics —
//   every field is 0..255 and -1 is stored as 0xFF). Exports:
//
//     NCENT = 12                                    // MLDEF.MAC:188 (BT-2)
//     BEETLE_COLOR = 0xb9                           // MILLI.MAC:289 (BT-18)
//     BEETLE_SPAWN_V = 0x48                         // :291 (BT-19)
//     BEETLE_PIC = 0x34                             // :302 (BT-21)
//     BEETLE_TURN_TIMER = 0x0c                      // :304 (BT-22)
//     BEETLE_PTS = 300, BEETLE_DDT_PTS = 900        // :2091/:2096 (BT-43/44)
//     DIP_BEETLE_HARD = 0x02                        // :268 (BT-4, D1)
//
//     interface BeetleSlot { color; pic; v; h; dv; dh; timer }
//         // MOBJC / MOBJP / MOBJV / MOBJH / MOBJDV / MOBJDH / MOBJHL.
//         // color 0 = free slot (the MOBJC convention).
//     interface BeetleEnv {
//       frame; score2;              // FRAME byte; SCORE2 BCD 10-thousands byte
//       playerAlive;                // PLAYP/PEXPLD gate (:244-248)
//       centipedeAlive; centin;     // DEAD ≠ 0; CENTIN (:261-266)
//       sideFeed; hard;             // NEWD ≠ 0; OPTNS1 & 02 (:267-271)
//       rnd0; rnd1;                 // POKEY random bytes (RND0/RND1)
//     }
//
//     isBeetle(slot): boolean                       // :323-329 (BT-26/27)
//     beetleAllowed(score2): 1|2|3                  // :272-279 (BT-14/15)
//     beetleSpawnTick(frame, score2): boolean       // :252-260 (BT-7..10)
//     startBeetle(slots, counts, env): number
//         // the whole BEETL start gate (:244-315). counts = { beetles: BEETLS,
//         // allowed: BEETLA }. Returns the slot index started, or -1. On
//         // success writes the slot (BT-18..22), increments counts.beetles,
//         // decrements counts.allowed, and doubles dh for a fast beetle
//         // (BT-23/24/25).
//     moveBeetle(slot, counts, env): 'offscreen' | null
//         // one movement sweep for ONE slot (:323-352 + BEETL1 :392-443):
//         // animation, position step, off-screen clear, turn-timer/direction.
//         // No-op (null) on a non-beetle slot. The OBSTAC lookup is NOT here —
//         // the caller maps the new position to a field cell (ml3-3's seam)
//         // and applies beetleObstacle below.
//     beetleObstacle(cell): { kind: 'die' } | { kind: 'rock'; cell } | { kind: 'none' }
//         // the pure reaction to the obstacle picture code (:360-378).
//     beetleKill(byDdt): { points; scrollDown: true } // :2089-2096 (BT-43/44/45)
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` (MLDEF.MAC:2) — ROM literals quoted here are
// hex; a trailing period in the source (`12.`, `14.`) marks DECIMAL.
//
// ─── ORIENTATION (upright — the ml3-4 scope precedent) ──────────────────────
// CKF8/CKFF/CKIND are modelled clear: every `EOR CKF8` is identity, the
// beetle's vertical unit is +1 (`CKFF ORA 1` = 1, BT-37). V DECREASES downward:
// V<9 is the bottom row (:412-413), V≥0xF0 the cocktail top (:410-411). The
// beetle spawns at V=0x48 and its mid-screen turn COMPLEMENTS the unit
// (BT-38) so it heads for the bottom row.
//
// ─── FIXTURE DERIVATION ─────────────────────────────────────────────────────
// Every expected byte below was hand-derived from the cited 6502 lines this
// session (TEA). No committed helper reimplements the algorithm — the
// literals stand alone.

import { describe, it, expect } from 'vitest'

interface BeetleSlot {
  color: number
  pic: number
  v: number
  h: number
  dv: number
  dh: number
  timer: number
}

interface BeetleCounts {
  beetles: number
  allowed: number
}

interface BeetleEnv {
  frame: number
  score2: number
  playerAlive: boolean
  centipedeAlive: boolean
  centin: number
  sideFeed: boolean
  hard: boolean
  rnd0: number
  rnd1: number
}

type ObstacleReaction = { kind: 'die' } | { kind: 'rock'; cell: number } | { kind: 'none' }

interface BeetleModule {
  NCENT: number
  BEETLE_COLOR: number
  BEETLE_SPAWN_V: number
  BEETLE_PIC: number
  BEETLE_TURN_TIMER: number
  BEETLE_PTS: number
  BEETLE_DDT_PTS: number
  DIP_BEETLE_HARD: number
  isBeetle: (slot: Readonly<BeetleSlot>) => boolean
  beetleAllowed: (score2: number) => number
  beetleSpawnTick: (frame: number, score2: number) => boolean
  startBeetle: (slots: BeetleSlot[], counts: BeetleCounts, env: Readonly<BeetleEnv>) => number
  moveBeetle: (slot: BeetleSlot, counts: BeetleCounts, env: Readonly<BeetleEnv>) => 'offscreen' | null
  beetleObstacle: (cell: number) => ObstacleReaction
  beetleKill: (byDdt: boolean) => { points: number; scrollDown: true }
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const BEETLE_SPECIFIER = ['..', 'src', 'core', 'beetle'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadBeetle(): Promise<BeetleModule> {
  try {
    const mod = (await import(/* @vite-ignore */ BEETLE_SPECIFIER)) as Partial<BeetleModule>
    if (typeof mod.startBeetle !== 'function') throw new Error('module has no startBeetle export')
    if (typeof mod.moveBeetle !== 'function') throw new Error('module has no moveBeetle export')
    return mod as BeetleModule
  } catch (e) {
    throw new Error(
      'beetle reducer not built yet — GREEN (Dev) ships src/core/beetle.ts per the ' +
      'contract at the top of tests/beetle.test.ts (pure, cited, byte semantics). ' +
      `(${(e as Error).message})`,
    )
  }
}

/** A free motion-object slot (MOBJC = 0). */
function freeSlot(): BeetleSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, timer: 0 }
}

/** A live mid-screen slow beetle in a known state. */
function beetle(over: Partial<BeetleSlot> = {}): BeetleSlot {
  return { color: 0xb9, pic: 0x34, v: 0x48, h: 0x40, dv: 0, dh: 1, timer: 0x0c, ...over }
}

/** An env in which every spawn gate is OPEN (frame on the tick, all clears). */
function openEnv(over: Partial<BeetleEnv> = {}): BeetleEnv {
  return {
    frame: 0x37,
    score2: 0,
    playerAlive: true,
    centipedeAlive: true,
    centin: 0,
    sideFeed: false,
    hard: false,
    rnd0: 0,
    rnd1: 0x80,
    ...over,
  }
}

function freshSlots(n = 12): BeetleSlot[] {
  return Array.from({ length: n }, freeSlot)
}

// ───────────────────────────────────────────────────────────────────────────────
// Cited constants
// ───────────────────────────────────────────────────────────────────────────────
describe('beetle — cited constants', () => {
  it('pins the slot pool, spawn bytes and DIP bit (BT-2/18/19/21/22/4)', async () => {
    const m = await loadBeetle()
    expect(m.NCENT, 'NCENT (MLDEF.MAC:188, BT-2)').toBe(12)
    expect(m.BEETLE_COLOR, 'MOBJC on-colour (MILLI.MAC:289, BT-18)').toBe(0xb9)
    expect(m.BEETLE_SPAWN_V, 'spawn row (MILLI.MAC:291, BT-19)').toBe(0x48)
    expect(m.BEETLE_PIC, 'picture code (MILLI.MAC:302, BT-21)').toBe(0x34)
    expect(m.BEETLE_TURN_TIMER, 'delay timer (MILLI.MAC:304, BT-22)').toBe(0x0c)
    expect(m.DIP_BEETLE_HARD, 'OPTNS1 D1 mask (MILLI.MAC:268, BT-4)').toBe(0x02)
  })

  it('pins the kill scores: 300, 900 by DDT, and the scroll-down (BT-43/44/45)', async () => {
    const m = await loadBeetle()
    expect(m.BEETLE_PTS, '300 points (MILLI.MAC:2091, BT-43)').toBe(300)
    expect(m.BEETLE_DDT_PTS, '900 by DDT (MILLI.MAC:2096, BT-44)').toBe(900)
    expect(m.beetleKill(false)).toEqual({ points: 300, scrollDown: true })
    expect(m.beetleKill(true)).toEqual({ points: 900, scrollDown: true })
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The spawn tick (:252-260, BT-7..10)
// ───────────────────────────────────────────────────────────────────────────────
describe('beetle — spawn cadence (FRAME AND mask == 37)', () => {
  it('below 600,000 the mask is 7F: frame 37 ticks, 36 and 77 do not (BT-8/10)', async () => {
    const m = await loadBeetle()
    expect(m.beetleSpawnTick(0x37, 0x00)).toBe(true)
    expect(m.beetleSpawnTick(0x36, 0x00)).toBe(false)
    // bit 6 is inside the 7F mask — frame 77 misses the 37 match below 600k
    expect(m.beetleSpawnTick(0x77, 0x00)).toBe(false)
    expect(m.beetleSpawnTick(0xb7, 0x00), 'bit 7 is outside the 7F mask').toBe(true)
  })

  it('at and above SCORE2=60 BCD the mask narrows to 3F — twice as often (BT-7/9)', async () => {
    const m = await loadBeetle()
    expect(m.beetleSpawnTick(0x77, 0x60), '77 AND 3F == 37').toBe(true)
    expect(m.beetleSpawnTick(0x37, 0x60)).toBe(true)
    expect(m.beetleSpawnTick(0x77, 0x59), '59 BCD is still below the switch').toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The concurrency allowance (:272-279, BT-14/15)
// ───────────────────────────────────────────────────────────────────────────────
describe('beetle — concurrency allowance by score', () => {
  it('1 below 90,000; 2 from 90,000; 3 from 250,000 (BCD windows)', async () => {
    const m = await loadBeetle()
    expect(m.beetleAllowed(0x00)).toBe(1)
    expect(m.beetleAllowed(0x08)).toBe(1)
    expect(m.beetleAllowed(0x09), 'SCORE2=9 BCD is 90,000 — the first boundary').toBe(2)
    expect(m.beetleAllowed(0x24)).toBe(2)
    expect(m.beetleAllowed(0x25), 'SCORE2=25 BCD is 250,000').toBe(3)
    expect(m.beetleAllowed(0x99)).toBe(3)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The start gate (:244-315)
// ───────────────────────────────────────────────────────────────────────────────
describe('beetle — startBeetle gates', () => {
  it('spawns into the HIGHEST free slot (the scan runs NCENT-1 down, BT-17)', async () => {
    const m = await loadBeetle()
    const slots = freshSlots()
    const counts = { beetles: 0, allowed: 5 }
    const idx = m.startBeetle(slots, counts, openEnv())
    expect(idx).toBe(11)
    expect(counts, 'BEETLS++ / BEETLA-- (:287-288)').toEqual({ beetles: 1, allowed: 4 })
  })

  it('writes the cited slot bytes: color B9, v 48, h 0, dv 0, pic 34, timer 0C (BT-18..22)', async () => {
    const m = await loadBeetle()
    const slots = freshSlots()
    m.startBeetle(slots, { beetles: 0, allowed: 1 }, openEnv({ rnd1: 0x80 }))
    expect(slots[11]).toEqual({ color: 0xb9, pic: 0x34, v: 0x48, h: 0, dv: 0, dh: 1, timer: 0x0c })
  })

  it('direction is RND1 bit 7: set → dh +1, clear → dh FF (BT-20, byte semantics)', async () => {
    const m = await loadBeetle()
    const a = freshSlots()
    m.startBeetle(a, { beetles: 0, allowed: 1 }, openEnv({ rnd1: 0x80 }))
    expect(a[11].dh).toBe(0x01)
    const b = freshSlots()
    m.startBeetle(b, { beetles: 0, allowed: 1 }, openEnv({ rnd1: 0x7f }))
    expect(b[11].dh).toBe(0xff)
  })

  it('skips occupied slots and reports -1 when none is free (BT-17)', async () => {
    const m = await loadBeetle()
    const slots = freshSlots()
    slots[11].color = 0x3d // any non-zero MOBJC occupies the slot
    const counts = { beetles: 0, allowed: 5 }
    expect(m.startBeetle(slots, counts, openEnv())).toBe(10)
    const full = freshSlots().map((s) => ({ ...s, color: 1 }))
    const c2 = { beetles: 0, allowed: 5 }
    expect(m.startBeetle(full, c2, openEnv())).toBe(-1)
    expect(c2, 'a failed scan must not touch the counts').toEqual({ beetles: 0, allowed: 5 })
  })

  it('every gate closes the start: player dead, BEETLA 0, off-tick, centipede gone, CENTIN full', async () => {
    const m = await loadBeetle()
    const cases: Array<[Partial<BeetleEnv>, BeetleCounts, string]> = [
      [{ playerAlive: false }, { beetles: 0, allowed: 5 }, 'player dead (:244-248, BT-5)'],
      [{}, { beetles: 0, allowed: 0 }, 'BEETLA zero (:250-251, BT-6)'],
      [{ frame: 0x36 }, { beetles: 0, allowed: 5 }, 'not the spawn tick (:258-260, BT-10)'],
      [{ centipedeAlive: false }, { beetles: 0, allowed: 5 }, 'centipede gone (:262-263, BT-11)'],
      [{ centin: 12 }, { beetles: 0, allowed: 5 }, 'centipede full (:264-266, BT-12)'],
    ]
    for (const [over, counts, why] of cases) {
      const slots = freshSlots()
      expect(m.startBeetle(slots, counts, openEnv(over)), why).toBe(-1)
      expect(slots.every((s) => s.color === 0), `${why} — no slot may be written`).toBe(true)
    }
    expect(m.startBeetle(freshSlots(), { beetles: 0, allowed: 5 }, openEnv({ centin: 11 })),
      'CENTIN 11 is still below the 12 gate').toBe(11)
  })

  it('EASY blocks the start while the side-feed is active; HARD does not (BT-13)', async () => {
    const m = await loadBeetle()
    expect(m.startBeetle(freshSlots(), { beetles: 0, allowed: 5 }, openEnv({ sideFeed: true, hard: false }))).toBe(-1)
    expect(m.startBeetle(freshSlots(), { beetles: 0, allowed: 5 }, openEnv({ sideFeed: true, hard: true }))).toBe(11)
  })

  it('blocks a start only when BEETLS equals the allowance (CPX/BEQ, BT-16)', async () => {
    const m = await loadBeetle()
    expect(m.startBeetle(freshSlots(), { beetles: 1, allowed: 5 }, openEnv({ score2: 0 })),
      'score below 90k allows 1 — a second is refused').toBe(-1)
    expect(m.startBeetle(freshSlots(), { beetles: 1, allowed: 5 }, openEnv({ score2: 0x09 })),
      'from 90k two run at once').toBe(11)
  })

  it('a fast beetle doubles dh past the DIP threshold: easy above 39, hard above 29 BCD (BT-23/24/25)', async () => {
    const m = await loadBeetle()
    const at = async (score2: number, hard: boolean) => {
      const slots = freshSlots()
      m.startBeetle(slots, { beetles: 0, allowed: 1 }, openEnv({ score2, hard, rnd1: 0x80 }))
      return slots[11].dh
    }
    expect(await at(0x39, false), 'easy at the threshold stays slow (BCS)').toBe(0x01)
    expect(await at(0x40, false), 'easy above 390k is fast').toBe(0x02)
    expect(await at(0x29, true), 'hard at the threshold stays slow').toBe(0x01)
    expect(await at(0x30, true), 'hard above 290k is fast').toBe(0x02)
    // the negative direction doubles as a byte: FF → FE
    const slots = freshSlots()
    m.startBeetle(slots, { beetles: 0, allowed: 1 }, openEnv({ score2: 0x40, rnd1: 0x00 }))
    expect(slots[11].dh, 'ASL of FF is FE (BT-25, byte semantics)').toBe(0xfe)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The movement sweep for one slot (:323-352, BT-26..30)
// ───────────────────────────────────────────────────────────────────────────────
describe('beetle — moveBeetle', () => {
  it('isBeetle is the picture band [34,38) on a live slot (BT-26/27)', async () => {
    const m = await loadBeetle()
    expect(m.isBeetle(beetle({ pic: 0x34 }))).toBe(true)
    expect(m.isBeetle(beetle({ pic: 0x37 }))).toBe(true)
    expect(m.isBeetle(beetle({ pic: 0x38 }))).toBe(false)
    expect(m.isBeetle(beetle({ pic: 0x33 }))).toBe(false)
    expect(m.isBeetle(beetle({ color: 0 })), 'a cleared slot is dead whatever its picture').toBe(false)
  })

  it('a non-beetle slot is left untouched (null)', async () => {
    const m = await loadBeetle()
    const slot = beetle({ pic: 0x14 })
    const before = { ...slot }
    expect(m.moveBeetle(slot, { beetles: 1, allowed: 0 }, openEnv())).toBeNull()
    expect(slot).toEqual(before)
  })

  it('the picture advances ((pic+1) AND 3) OR 34 only on frames with FRAME AND 3 == 0 (BT-28/29)', async () => {
    const m = await loadBeetle()
    const slot = beetle({ pic: 0x37, h: 0x40, dh: 1 })
    m.moveBeetle(slot, { beetles: 1, allowed: 0 }, openEnv({ frame: 0x04 }))
    expect(slot.pic, '37 wraps to 34').toBe(0x34)
    const still = beetle({ pic: 0x35, h: 0x40, dh: 1 })
    m.moveBeetle(still, { beetles: 1, allowed: 0 }, openEnv({ frame: 0x05 }))
    expect(still.pic, 'off-cadence frames keep the picture').toBe(0x35)
  })

  it('a horizontal beetle steps h += dh, both directions, as bytes', async () => {
    const m = await loadBeetle()
    const right = beetle({ h: 0x40, dh: 1, timer: 0x50 })
    m.moveBeetle(right, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(right.h).toBe(0x41)
    const left = beetle({ h: 0x40, dh: 0xff, timer: 0x50 })
    m.moveBeetle(left, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(left.h, 'dh FF is -1 as a byte').toBe(0x3f)
  })

  it('a vertical beetle steps v += dv and keeps h (:338-343)', async () => {
    const m = await loadBeetle()
    const down = beetle({ v: 0x30, dv: 0xff, h: 0x22, timer: 0x50 })
    m.moveBeetle(down, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(down.v, 'dv FF descends (V decreases downward)').toBe(0x2f)
    expect(down.h).toBe(0x22)
  })

  it('an h step landing on 0 clears the beetle and drops BEETLS (BT-30)', async () => {
    const m = await loadBeetle()
    const slot = beetle({ h: 0x01, dh: 0xff, timer: 0x50 })
    const counts = { beetles: 2, allowed: 1 }
    expect(m.moveBeetle(slot, counts, openEnv({ frame: 1 }))).toBe('offscreen')
    expect(slot.color, 'MOBJC cleared (:350)').toBe(0)
    expect(counts.beetles, 'DEC BEETLS (:351)').toBe(1)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BEETL1 — the turn timer and direction change (:392-443, BT-36..42)
// ───────────────────────────────────────────────────────────────────────────────
describe('beetle — BEETL1 turn timer', () => {
  it('a slow beetle decrements once per frame; direction changes only at 0 (BT-36)', async () => {
    const m = await loadBeetle()
    const slot = beetle({ h: 0x40, dh: 1, timer: 3 })
    m.moveBeetle(slot, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(slot.timer).toBe(2)
    expect(slot.dv, 'no turn yet').toBe(0)
  })

  it('a fast beetle decrements twice per frame (BT-36)', async () => {
    const m = await loadBeetle()
    const slot = beetle({ h: 0x40, dh: 2, timer: 6 })
    m.moveBeetle(slot, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(slot.timer).toBe(4)
  })

  it('a fast beetle whose FIRST decrement lands on 0 sails past it — timer wraps to FF, no turn', async () => {
    const m = await loadBeetle()
    // DEC to 0, DEC to FF, BEQ tests only the second result (:396-398).
    const slot = beetle({ h: 0x40, dh: 2, timer: 1 })
    m.moveBeetle(slot, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(slot.timer).toBe(0xff)
    expect(slot.dv).toBe(0)
  })

  it('mid-screen horizontal → vertical: dv = COMP(unit) toward the bottom, timer 40 (BT-37/38/39)', async () => {
    const m = await loadBeetle()
    const slow = beetle({ v: 0x48, h: 0x40, dh: 1, timer: 1 })
    m.moveBeetle(slow, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(slow.dv, 'upright unit 1, complemented (BT-37/38)').toBe(0xff)
    expect(slow.timer, 'the mid-screen vertical leg is 40 frames (BT-39)').toBe(0x40)
    const fast = beetle({ v: 0x48, h: 0x40, dh: 2, timer: 2 })
    m.moveBeetle(fast, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(fast.dv, 'a fast beetle turns at unit 2 — COMP is FE').toBe(0xfe)
  })

  it('on the bottom row the turn is UPWARD (+unit) with timer (RND0 AND 38) + 40 (BT-40)', async () => {
    const m = await loadBeetle()
    // v after the step must be < 9: start at 9 moving left… h step does not
    // change v; the row test reads MOBJV (:409-413). Use v = 8.
    const slot = beetle({ v: 0x08, h: 0x40, dh: 1, timer: 1 })
    m.moveBeetle(slot, { beetles: 1, allowed: 0 }, openEnv({ frame: 1, rnd0: 0xff }))
    expect(slot.dv, 'no COMP on the rows — the beetle climbs back').toBe(0x01)
    expect(slot.timer, 'FF AND 38 = 38, + 40 = 78').toBe(0x78)
  })

  it('mid-screen vertical → horizontal: dv 0 and the timer wraps to FF to leave the screen (BT-42)', async () => {
    const m = await loadBeetle()
    const slot = beetle({ v: 0x30, dv: 0xff, h: 0x40, dh: 1, timer: 1 })
    m.moveBeetle(slot, { beetles: 1, allowed: 0 }, openEnv({ frame: 1 }))
    expect(slot.dv).toBe(0)
    expect(slot.timer, 'DEC of the spent timer: 0 → FF (:435)').toBe(0xff)
  })

  it('on-row vertical → horizontal: dv 0 with timer (RND0 AND 78) + 60 (BT-41)', async () => {
    const m = await loadBeetle()
    // dv +1 stepping v 8 → 9 still reads as bottom row? No: the row test reads
    // the STEPPED v (:430-433 runs after the position step) — use v that LANDS
    // below 9: v = 8 with dv = FF lands at 7.
    const slot = beetle({ v: 0x08, dv: 0xff, h: 0x40, dh: 1, timer: 1 })
    m.moveBeetle(slot, { beetles: 1, allowed: 0 }, openEnv({ frame: 1, rnd0: 0xff }))
    expect(slot.dv).toBe(0)
    expect(slot.timer, 'FF AND 78 = 78, + 60 = D8').toBe(0xd8)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The obstacle reaction (:360-378, BT-31..35) — the OBSTAC seam stays with ml3-3
// ───────────────────────────────────────────────────────────────────────────────
describe('beetle — obstacle reaction', () => {
  it('a DDT explosion cloud (CLOUD ≤ code < DDT) kills the beetle (BT-31/32)', async () => {
    const m = await loadBeetle()
    expect(m.beetleObstacle(0x2e)).toEqual({ kind: 'die' })
    expect(m.beetleObstacle(0x6d)).toEqual({ kind: 'die' })
    expect(m.beetleObstacle(0x2d), 'below CLOUD is a message stamp — ignored').toEqual({ kind: 'none' })
  })

  it('mushrooms at and above 75 become a ROCK, keeping the background bit (BT-33/34/35)', async () => {
    const m = await loadBeetle()
    expect(m.beetleObstacle(0x75), 'a growing mushroom converts').toEqual({ kind: 'rock', cell: 0x70 })
    expect(m.beetleObstacle(0x7f), 'a full mushroom converts').toEqual({ kind: 'rock', cell: 0x70 })
    expect(m.beetleObstacle(0xfa), 'bit 7 (grey background) survives the conversion').toEqual({ kind: 'rock', cell: 0xf0 })
  })

  it('the DDT bomb, a rock, and dying mushrooms do NOT convert (BT-34)', async () => {
    const m = await loadBeetle()
    expect(m.beetleObstacle(0x6e), 'the DDT bomb itself').toEqual({ kind: 'none' })
    expect(m.beetleObstacle(0x70), 'a rock stays a rock').toEqual({ kind: 'none' })
    expect(m.beetleObstacle(0x74), 'the last dying-mushroom stage is below 75').toEqual({ kind: 'none' })
    expect(m.beetleObstacle(0), 'an empty cell').toEqual({ kind: 'none' })
  })
})
