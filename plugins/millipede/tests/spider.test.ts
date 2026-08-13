// tests/spider.test.ts
//
// Story ml4-1 — RED phase (TEA). THE SPIDER: `SPDMV — MOVE SPIDER`
// (`MILLI.MAC:2295`, SD-1). Millipede runs up to 8 spiders in motion-object
// slots 6..13 (SD-7/8): slot 13 is reserved for spiders (SD-12), slot 12
// opens with score (SD-13/15), and — story ml4-5 — the centipede entries
// 6..11 open one by one above 100,000 on a full first wave (SD-52..61, the
// FIRST-WAVE EXTRA-SPIDER feature). The spider zig-zags on a COUNT2 countdown,
// EATS every stamp from ROCK up (mushrooms, rocks, death stages — SD-37),
// bounces between the bottom row and a score-driven ceiling (SD-38..43), and
// scores by PROXIMITY when killed (SD-46..51). Its difficulty DIP is D6
// (`MLDEF.MAC:91`, SD-2). Every constant below carries an SD-* claim in
// docs/rom-study/claims/09-beetle-spider.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/spider.ts — a pure cited reducer (conway.ts house style:
//   in-place mutation, deterministic, BYTE semantics — fields are 0..255,
//   -1 is 0xFF). Exports:
//
//     SPIDER_SLOT_FIRST = 6, SPIDER_SLOT_END = 14   // MILLI.MAC:2303/:2314 (SD-7/8)
//     SPIDER_SLOT_RESERVED = 13                     // :2350 (SD-12)
//     NCENT = 12                                    // MLDEF.MAC:188 (SD-52)
//     SPIDER_PIC = 0x14                             // :2397 (SD-24)
//     SPIDER_COLOR = 0xb9                           // :2399 (SD-25)
//     SPIDER_ENTER_V = 0x60                         // :2390 (SD-21)
//     SPIDER_OFF_DELAY = 0x60                       // :2530 (SD-32)
//     DIP_SPIDER_HARD = 0x40                        // :2424 (SD-3, D6)
//     PTS_ENTRIES = 16                              // MLDEF.MAC:398 (SD-5)
//     SPIDER_SCORE_STAMPS = [0x32,0x30,0x2d,0x2a,0x33]  // :2209 (SD-50)
//     SPIDER_SCORE_VALUES = [1200,900,600,300,1800]     // :2210 (SD-51)
//
//     interface SpiderSlot { color; pic; v; h; dv; dh; oldDh; count2; pts }
//         // SPDC / SPDP / SPDV / SPDH / SPDDV / SPDDH / OLDDH / COUNT2 / PTS.
//         // color 0 = free slot.
//     interface SpiderEnv {
//       frame;                       // FRAME byte
//       score1; score2;              // SCORE1 (BCD hundreds) / SCORE2 (BCD 10k)
//       centin;                      // CENTIN
//       dead;                        // DEAD — remaining centipede segments
//                                    // (MLDEF.MAC:295, SD-53)
//       playerAlive;                 // PLAYP/PEXPLD gate (:2299-2302, SD-6)
//       hard;                        // OPTNS1 & 40 — the D6 DIP (SD-3)
//       rnd0;                        // POKEY RND0 byte
//     }
//
//     isSpider(slot): boolean                        // :2304-2310 (SD-9/10)
//     spiderSpeed(env): 1 | 2                        // :2367-2375 (SD-16..19)
//     extraSpiderOpen(index, env): boolean           // :2321-2345 (SD-54..61)
//         // the first-wave extra-spider gate for the centipede entries
//         // (index < NCENT): centipede alive (DEAD ≠ 0, SD-55), CENTIN == 0C
//         // exactly (SD-56), SCORE2 ≥ 10 binary — 100,000 (SD-57); allowance
//         // min((SCORE2-10)>>1, 5) + 3 (SD-58/59); the slot opens only when
//         // NCENT+1-allowance < index (SD-60/61). index ≥ NCENT is always
//         // open — those slots go straight to the countdown (SD-54).
//     mayStartSpider(index, env): boolean            // :2348-2363 (SD-12/13/14/15)
//     trySpawnSpider(slot, index, env): boolean
//         // the empty-slot path (:2318-2363 + :2367-2400): a centipede entry
//         // must pass extraSpiderOpen FIRST — a closed gate skips the DEC
//         // entirely (the 11$ path, SD-54..61). Then decrement COUNT2
//         // (wrapping — a failed gate re-arms 256 frames, SD-11); at zero,
//         // gate through mayStartSpider and write the slot via startSpider.
//     startSpider(slot, env): void                   // :2367-2400 spawn writes
//     moveSpider(slot, env): { offscreen: boolean }
//         // one SPDMV sweep for ONE live spider (:2401-2524): SPDMV1
//         // animation, COUNT2 zig-zag, h/v SUBTRACT steps (SD-30), SPDOFF at
//         // h==0 (SD-31), bottom/ceiling bounce (SD-38..43). The OBSTAC
//         // lookup (ml3-3), OVRLAP (ml3-1) and PLAY (ml3-2) seams stay with
//         // their callers.
//     spiderObstacle(cell): { kind: 'die' } | { kind: 'eat'; cell } | { kind: 'none' }
//         // the pure reaction to a RAW field cell (:2452-2468; OBSTAC masks
//         // its return AND 7F, MLSUB.MAC:888, BT-46 — this takes the raw
//         // byte and keeps the background bit on an eat).
//     spiderOff(slot): void                          // SPDOFF :2526-2532 (SD-31/32/33)
//     spiderTopLimit(score2): number                 // :2479-2503 (SD-39..43)
//     spiderKill(spdV, playV, byDdt): { points; stamp }  // :2182-2210 (SD-46..51)
//
// ─── SCOPE (Delivery Findings, .session/ml4-1-session.md + ml4-5) ───────────
// • Upright cabinet only (the ml3-4 precedent): CKIND/CKF8 modelled clear —
//   no cocktail V-reversal (:2377-2381), EOR CKF8 identity throughout.
// • The FIRST-WAVE EXTRA-SPIDER feature (:2318-2345), descoped from ml4-1, is
//   IN SCOPE as of ml4-5: slots 6..11 open above 100,000 on a full first
//   wave, up to 8 concurrent spiders (SD-52..61).
// • MODE (attract) gating (:2318-2319) and CHAN3 sound (:2402-2405) remain
//   ml7/ml6 seams.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` — literals here are hex; a trailing period
// in the source (`13.`, `14.`, `11.*16.`) marks DECIMAL.
//
// ─── ORIENTATION ────────────────────────────────────────────────────────────
// V DECREASES downward: V<9 is the bottom row (SD-38); the ceiling descends
// from V=0x60 as the score grows (SD-43). The spider's steps SUBTRACT both
// direction bytes (SD-30) — a positive dv moves it DOWN. This is the inverted
// convention centipede's spider carries too (its module keeps the step local
// for exactly this reason).
//
// ─── FIXTURE DERIVATION ─────────────────────────────────────────────────────
// Every expected byte below was hand-derived from the cited 6502 lines this
// session (TEA). No committed helper reimplements the algorithm — the
// literals stand alone.

import { describe, it, expect } from 'vitest'

interface SpiderSlot {
  color: number
  pic: number
  v: number
  h: number
  dv: number
  dh: number
  oldDh: number
  count2: number
  pts: number
}

interface SpiderEnv {
  frame: number
  score1: number
  score2: number
  centin: number
  dead: number
  playerAlive: boolean
  hard: boolean
  rnd0: number
}

type SpiderObstacle = { kind: 'die' } | { kind: 'eat'; cell: number } | { kind: 'none' }

interface SpiderModule {
  SPIDER_SLOT_FIRST: number
  SPIDER_SLOT_END: number
  SPIDER_SLOT_RESERVED: number
  NCENT: number
  SPIDER_PIC: number
  SPIDER_COLOR: number
  SPIDER_ENTER_V: number
  SPIDER_OFF_DELAY: number
  DIP_SPIDER_HARD: number
  PTS_ENTRIES: number
  SPIDER_SCORE_STAMPS: readonly number[]
  SPIDER_SCORE_VALUES: readonly number[]
  isSpider: (slot: Readonly<SpiderSlot>) => boolean
  spiderSpeed: (env: Readonly<SpiderEnv>) => number
  extraSpiderOpen: (index: number, env: Readonly<SpiderEnv>) => boolean
  mayStartSpider: (index: number, env: Readonly<SpiderEnv>) => boolean
  trySpawnSpider: (slot: SpiderSlot, index: number, env: Readonly<SpiderEnv>) => boolean
  startSpider: (slot: SpiderSlot, env: Readonly<SpiderEnv>) => void
  moveSpider: (slot: SpiderSlot, env: Readonly<SpiderEnv>) => { offscreen: boolean }
  spiderObstacle: (cell: number) => SpiderObstacle
  spiderOff: (slot: SpiderSlot) => void
  spiderTopLimit: (score2: number) => number
  spiderKill: (spdV: number, playV: number, byDdt: boolean) => { points: number; stamp: number }
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const SPIDER_SPECIFIER = ['..', 'src', 'core', 'spider'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadSpider(): Promise<SpiderModule> {
  try {
    const mod = (await import(/* @vite-ignore */ SPIDER_SPECIFIER)) as Partial<SpiderModule>
    if (typeof mod.moveSpider !== 'function') throw new Error('module has no moveSpider export')
    if (typeof mod.trySpawnSpider !== 'function') throw new Error('module has no trySpawnSpider export')
    return mod as SpiderModule
  } catch (e) {
    throw new Error(
      'spider reducer not built yet — GREEN (Dev) ships src/core/spider.ts per the ' +
      'contract at the top of tests/spider.test.ts (pure, cited, byte semantics). ' +
      `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** A free slot as SPDOFF leaves it (color/h/pts 0, delay armed). */
function freeSlot(over: Partial<SpiderSlot> = {}): SpiderSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, oldDh: 0, count2: 0x60, pts: 0, ...over }
}

/** A live mid-screen fast spider in a known state. */
function spider(over: Partial<SpiderSlot> = {}): SpiderSlot {
  return { color: 0xb9, pic: 0x14, v: 0x40, h: 0x40, dv: 2, dh: 2, oldDh: 0, count2: 0x10, pts: 0, ...over }
}

function env(over: Partial<SpiderEnv> = {}): SpiderEnv {
  return { frame: 0, score1: 0, score2: 0, centin: 0, dead: 0x0c, playerAlive: true, hard: false, rnd0: 0, ...over }
}

// ───────────────────────────────────────────────────────────────────────────────
// Cited constants
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — cited constants', () => {
  it('pins the slot roster, spawn bytes and DIP bit (SD-7/8/12/24/25/21/32/3/5)', async () => {
    const m = await loadSpider()
    expect(m.SPIDER_SLOT_FIRST, 'scan start (MILLI.MAC:2303, SD-7)').toBe(6)
    expect(m.SPIDER_SLOT_END, 'scan end, exclusive (MILLI.MAC:2314, SD-8)').toBe(14)
    expect(m.SPIDER_SLOT_RESERVED, 'the spiders-only slot (MILLI.MAC:2350, SD-12)').toBe(13)
    expect(m.NCENT, 'the centipede-entry boundary (MLDEF.MAC:188, SD-52)').toBe(12)
    expect(m.SPIDER_PIC, 'picture code (MILLI.MAC:2397, SD-24)').toBe(0x14)
    expect(m.SPIDER_COLOR, 'SPDC on-colour (MILLI.MAC:2399, SD-25)').toBe(0xb9)
    expect(m.SPIDER_ENTER_V, 'entry row (MILLI.MAC:2390, SD-21)').toBe(0x60)
    expect(m.SPIDER_OFF_DELAY, 'SPDOFF delay (MILLI.MAC:2530, SD-32)').toBe(0x60)
    expect(m.DIP_SPIDER_HARD, 'OPTNS1 D6 mask (MILLI.MAC:2424, SD-3)').toBe(0x40)
    expect(m.PTS_ENTRIES, 'the PTS stamp array size (MLDEF.MAC:398, SD-5)').toBe(16)
  })

  it('pins the proximity score tables byte-for-byte (SD-50/51)', async () => {
    const m = await loadSpider()
    expect(m.SPIDER_SCORE_STAMPS).toEqual([0x32, 0x30, 0x2d, 0x2a, 0x33])
    expect(m.SPIDER_SCORE_VALUES, 'BCD hundreds 12,9,6,3,18 ×100').toEqual([1200, 900, 600, 300, 1800])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The speed gate (:2367-2375, SD-16..19) — the D6 difficulty DIP
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — speed by score and difficulty', () => {
  it('any score at or over 10,000 is fast (SCORE2 non-zero, SD-16)', async () => {
    const m = await loadSpider()
    expect(m.spiderSpeed(env({ score2: 0x01 }))).toBe(2)
    expect(m.spiderSpeed(env({ score2: 0x99, hard: true }))).toBe(2)
  })

  it('EASY stays slow until 10,000 whatever SCORE1 says (SD-17/19)', async () => {
    const m = await loadSpider()
    expect(m.spiderSpeed(env({ score2: 0, score1: 0x99, hard: false }))).toBe(1)
    expect(m.spiderSpeed(env({ score2: 0, score1: 0, hard: false }))).toBe(1)
  })

  it('HARD turns fast at SCORE1 = 50 BCD — 5,000 points (SD-18)', async () => {
    const m = await loadSpider()
    expect(m.spiderSpeed(env({ score2: 0, score1: 0x49, hard: true }))).toBe(1)
    expect(m.spiderSpeed(env({ score2: 0, score1: 0x50, hard: true }))).toBe(2)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The start gates (:2346-2363, SD-11..15)
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — start gates', () => {
  it('slot 13 is reserved for spiders — it starts at score 0 (SD-12)', async () => {
    const m = await loadSpider()
    expect(m.mayStartSpider(13, env({ score2: 0 }))).toBe(true)
  })

  it('slot 12 waits until the score is over 30,000 (SD-13)', async () => {
    const m = await loadSpider()
    expect(m.mayStartSpider(12, env({ score2: 0x02, centin: 12 }))).toBe(false)
    expect(m.mayStartSpider(12, env({ score2: 0x03, centin: 12 })), 'SCORE2=3 BCD passes the CMP I,3/BCC gate').toBe(true)
  })

  it('the second spider needs (B0 - SCORE2) >> 4 below CENTIN (SD-14/15)', async () => {
    const m = await loadSpider()
    // SCORE2=3 (30k): (B0-3)>>4 = A → needs CENTIN ≥ 11
    expect(m.mayStartSpider(12, env({ score2: 0x03, centin: 0x0a }))).toBe(false)
    expect(m.mayStartSpider(12, env({ score2: 0x03, centin: 0x0b }))).toBe(true)
    // SCORE2=50 (500k): (B0-50)>>4 = 6 → needs CENTIN ≥ 7
    expect(m.mayStartSpider(12, env({ score2: 0x50, centin: 0x06 }))).toBe(false)
    expect(m.mayStartSpider(12, env({ score2: 0x50, centin: 0x07 }))).toBe(true)
  })

  it('a closed extra-spider gate never reaches these gates: slot 11 below 100,000 refuses at the 11$ path', async () => {
    const m = await loadSpider()
    const slot = freeSlot({ count2: 1 })
    expect(m.trySpawnSpider(slot, 11, env({ score2: 0x0f, centin: 12 }))).toBe(false)
    expect(slot.color, 'slot 11 must stay free below the floor').toBe(0)
  })

  it('the countdown decrements per call and only zero opens the gate (SD-11)', async () => {
    const m = await loadSpider()
    const slot = freeSlot({ count2: 2 })
    expect(m.trySpawnSpider(slot, 13, env())).toBe(false)
    expect(slot.count2).toBe(1)
    expect(m.trySpawnSpider(slot, 13, env())).toBe(true)
    expect(slot.color, 'the start wrote the slot').toBe(0xb9)
  })

  it('a failed gate at zero re-arms a 256-frame wait — the countdown WRAPS (SD-11)', async () => {
    const m = await loadSpider()
    const slot = freeSlot({ count2: 1 })
    expect(m.trySpawnSpider(slot, 12, env({ score2: 0 })), 'slot 12 below 30k refuses').toBe(false)
    expect(slot.count2, 'COUNT2 sits at 0; the next DEC wraps').toBe(0)
    expect(m.trySpawnSpider(slot, 12, env({ score2: 0 }))).toBe(false)
    expect(slot.count2, 'DEC of 0 → FF').toBe(0xff)
  })

  it('an OCCUPIED slot is left alone — the scan moves it instead of respawning over it', async () => {
    const m = await loadSpider()
    const live = spider({ count2: 1 })
    const before = { ...live }
    expect(m.trySpawnSpider(live, 13, env())).toBe(false)
    expect(live, 'no countdown decrement, no overwrite of a live spider').toEqual(before)
  })

  it('nothing spawns while the player is dead (SD-6)', async () => {
    const m = await loadSpider()
    const slot = freeSlot({ count2: 1 })
    expect(m.trySpawnSpider(slot, 13, env({ playerAlive: false }))).toBe(false)
    expect(slot.count2, 'the routine RTSes at entry — no countdown either').toBe(1)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The first-wave extra spiders (:2318-2345, SD-52..61) — story ml4-5
//
// A free slot BELOW NCENT is a centipede entry (SD-54): before its countdown
// may even tick it must pass the extra-spider gates — centipede alive
// (DEAD ≠ 0, SD-55), CENTIN == 0C exactly (SD-56), SCORE2 ≥ 10 binary
// (100,000; SD-57). The allowance is min((SCORE2-10) >> 1, 5) + 3
// (SD-58/59) — 3 at 100,000, 8 from 200,000 — and NCENT+1-allowance is the
// last index the centipede KEEPS (SD-60): only indexes above it open
// (SD-61). Hand-derived slot table (centin = 0C, dead ≠ 0):
//
//   SCORE2 10,11 → allowance 3 → slots {11}
//   SCORE2 12    → allowance 4 → slots {10,11}
//   SCORE2 14    → allowance 5 → slots {9..11}
//   SCORE2 16    → allowance 6 → slots {8..11}
//   SCORE2 18,19 → allowance 7 → slots {7..11}
//   SCORE2 20+   → allowance 8 → slots {6..11}   (the LSR ≥ 8 clamp, SD-58)
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — first-wave extra spiders (ml4-5)', () => {
  /** The feature's happy environment: full first-wave train, segments alive. */
  function wave1(score2: number, over: Partial<SpiderEnv> = {}): SpiderEnv {
    return env({ score2, centin: 0x0c, dead: 0x0c, ...over })
  }

  it('slots at or above NCENT are always open — they go straight to the countdown (SD-54)', async () => {
    const m = await loadSpider()
    expect(m.extraSpiderOpen(12, env({ score2: 0, centin: 0, dead: 0 }))).toBe(true)
    expect(m.extraSpiderOpen(13, env({ score2: 0, centin: 0, dead: 0 }))).toBe(true)
  })

  it('the allowance opens slots top-down as the score grows: the hand-derived table (SD-58..61)', async () => {
    const m = await loadSpider()
    const openFrom = (score2: number, first: number) => {
      for (let index = 6; index < 12; index++) {
        expect(
          m.extraSpiderOpen(index, wave1(score2)),
          `SCORE2 ${score2.toString(16)} slot ${index}`,
        ).toBe(index >= first)
      }
    }
    openFrom(0x10, 11) // 100k: allowance 3, slot 11 only
    openFrom(0x11, 11) // 110k: (1)>>1 = 0 — still 3
    openFrom(0x12, 10) // 120k: allowance 4
    openFrom(0x14, 9) // 140k: allowance 5
    openFrom(0x16, 8) // 160k: allowance 6
    openFrom(0x18, 7) // 180k: allowance 7
    openFrom(0x19, 7) // 190k: (9)>>1 = 4 — still 7, the last pre-clamp value
    openFrom(0x20, 6) // 200k: LSR hits 8 → clamp 5 → allowance 8, all six
    openFrom(0x99, 6) // and it stays clamped to the ceiling from there
  })

  it('below 100,000 no centipede entry opens — the SBC borrow refuses (SD-57)', async () => {
    const m = await loadSpider()
    for (let index = 6; index < 12; index++) {
      expect(m.extraSpiderOpen(index, wave1(0x0f)), `slot ${index}`).toBe(false)
    }
    expect(m.extraSpiderOpen(11, wave1(0x00))).toBe(false)
  })

  it('CENTIN must be 0C EXACTLY — a shot-down train (0B) or an overfull one (0D) closes the feature (SD-56)', async () => {
    const m = await loadSpider()
    expect(m.extraSpiderOpen(11, wave1(0x99, { centin: 0x0b }))).toBe(false)
    expect(m.extraSpiderOpen(11, wave1(0x99, { centin: 0x0d }))).toBe(false)
    expect(m.extraSpiderOpen(11, wave1(0x99, { centin: 0x0c }))).toBe(true)
  })

  it('all centipede segments dead closes the feature — DEAD == 0 (SD-55)', async () => {
    const m = await loadSpider()
    expect(m.extraSpiderOpen(11, wave1(0x99, { dead: 0 }))).toBe(false)
    expect(m.extraSpiderOpen(11, wave1(0x99, { dead: 1 }))).toBe(true)
  })

  it('slot 5 stays reserved even at the maximum allowance — the arithmetic floor is slot 6 (SD-60/61)', async () => {
    const m = await loadSpider()
    // allowance 8 → NCENT+1-8 = 5; BCS keeps 5 itself reserved for the train.
    expect(m.extraSpiderOpen(5, wave1(0x99))).toBe(false)
  })

  it('an OPEN slot runs the normal countdown and spawn: slot 11 starts a spider at 100,000 (SD-11, SD-14/15)', async () => {
    const m = await loadSpider()
    const slot = freeSlot({ count2: 2 })
    expect(m.trySpawnSpider(slot, 11, wave1(0x10)), 'first call only decrements').toBe(false)
    expect(slot.count2).toBe(1)
    // At zero the ordinary gates run: SCORE2 10 ≥ 3, (B0-10)>>4 = A < CENTIN C.
    expect(m.trySpawnSpider(slot, 11, wave1(0x10))).toBe(true)
    expect(slot.color, 'the start wrote the slot').toBe(0xb9)
    expect(slot.v, 'entry row (SD-21)').toBe(0x60)
  })

  it('a CLOSED gate skips the countdown entirely — the 11$ path never reaches the DEC (SD-54..61)', async () => {
    const m = await loadSpider()
    const slot = freeSlot({ count2: 5 })
    expect(m.trySpawnSpider(slot, 10, wave1(0x10)), 'slot 10 is reserved at 100,000').toBe(false)
    expect(slot.count2, 'COUNT2 untouched — no re-arm drift while reserved').toBe(5)
    expect(m.trySpawnSpider(slot, 10, wave1(0x12)), 'at 120,000 slot 10 opens').toBe(false)
    expect(slot.count2, 'and only then does the countdown tick').toBe(4)
  })

  it('the whole roster can fill: at 200,000 every slot 6..13 starts a spider (SD-58/59)', async () => {
    const m = await loadSpider()
    for (let index = 6; index < 14; index++) {
      const slot = freeSlot({ count2: 1 })
      expect(m.trySpawnSpider(slot, index, wave1(0x20)), `slot ${index}`).toBe(true)
      expect(slot.color, `slot ${index} live`).toBe(0xb9)
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The spawn writes (:2367-2400, SD-20..25)
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — startSpider writes', () => {
  it('writes v 60, pic 14, color B9, count2 (rnd AND 2C) OR 0C; h is left to the step', async () => {
    const m = await loadSpider()
    const slot = freeSlot({ count2: 0 })
    m.startSpider(slot, env({ rnd0: 0xff }))
    expect(slot.v, 'SD-21').toBe(0x60)
    expect(slot.pic, 'SD-24').toBe(0x14)
    expect(slot.color, 'SD-25').toBe(0xb9)
    expect(slot.count2, 'FF AND 2C = 2C, OR 0C = 2C (SD-22/23)').toBe(0x2c)
    expect(slot.h, 'SPDH is not written — the first SUBTRACT step brings it on').toBe(0)
    const low = freeSlot({ count2: 0 })
    m.startSpider(low, env({ rnd0: 0x00 }))
    expect(low.count2, '00 AND 2C = 0, OR 0C = 0C').toBe(0x0c)
  })

  it('dv is the speed; rnd bit 2 clear keeps dh = dv, set complements it (SD-20)', async () => {
    const m = await loadSpider()
    const same = freeSlot()
    m.startSpider(same, env({ score2: 0x10, rnd0: 0x00 }))
    expect(same.dv, 'fast at 100k').toBe(2)
    expect(same.dh).toBe(2)
    const flipped = freeSlot()
    m.startSpider(flipped, env({ score2: 0x10, rnd0: 0x04 }))
    expect(flipped.dh, 'COMP(2) as a byte').toBe(0xfe)
    const slow = freeSlot()
    m.startSpider(slow, env({ score2: 0, rnd0: 0x04 }))
    expect(slow.dv).toBe(1)
    expect(slow.dh, 'COMP(1)').toBe(0xff)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Movement (:2401-2524)
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — moveSpider', () => {
  it('isSpider is the picture band [14,1C) on a live slot (SD-9/10)', async () => {
    const m = await loadSpider()
    expect(m.isSpider(spider({ pic: 0x14 }))).toBe(true)
    expect(m.isSpider(spider({ pic: 0x1b }))).toBe(true)
    expect(m.isSpider(spider({ pic: 0x1c }))).toBe(false)
    expect(m.isSpider(spider({ pic: 0x13 }))).toBe(false)
    expect(m.isSpider(spider({ color: 0 }))).toBe(false)
  })

  it('the steps SUBTRACT: h -= dh and v -= dv, as bytes (SD-30)', async () => {
    const m = await loadSpider()
    const s = spider({ h: 0x40, v: 0x40, dh: 2, dv: 2, count2: 0x10 })
    expect(m.moveSpider(s, env({ frame: 1 }))).toEqual({ offscreen: false })
    expect(s.h, 'a POSITIVE dh moves LEFT — the inverted convention').toBe(0x3e)
    expect(s.v, 'a positive dv moves DOWN (v decreases)').toBe(0x3e)
    const neg = spider({ h: 0x40, v: 0x40, dh: 0xfe, dv: 0xfe, count2: 0x10 })
    m.moveSpider(neg, env({ frame: 1 }))
    expect(neg.h, 'SBC of FE adds 2').toBe(0x42)
    expect(neg.v).toBe(0x42)
  })

  it('an h step landing on 0 runs SPDOFF: pts/color/h cleared, delay 60, v untouched (SD-31/32/33)', async () => {
    const m = await loadSpider()
    const s = spider({ h: 0x02, dh: 2, v: 0x30, dv: 2, count2: 0x10, pts: 0x2a })
    expect(m.moveSpider(s, env({ frame: 1 }))).toEqual({ offscreen: true })
    expect(s.color, 'SPDC cleared').toBe(0)
    expect(s.pts, 'PTS cleared so EXPLODE forgets the spider (SD-33)').toBe(0)
    expect(s.h).toBe(0)
    expect(s.count2, 'the slot re-arms its spawn delay (SD-32)').toBe(0x60)
    expect(s.v, 'the v step is skipped after SPDOFF').toBe(0x30)
  })

  it('does nothing while the player is dead (SD-6)', async () => {
    const m = await loadSpider()
    const s = spider()
    const before = { ...s }
    expect(m.moveSpider(s, env({ playerAlive: false, frame: 1 }))).toEqual({ offscreen: false })
    expect(s).toEqual(before)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The zig-zag (:2406-2436, SD-26..29)
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — COUNT2 zig-zag', () => {
  // count2 = 1 in each case: the DEC lands on 0 and the direction block runs.
  it('rnd bit 7 set skips the dh change; the V-probability and reset still run', async () => {
    const m = await loadSpider()
    const s = spider({ dh: 2, dv: 2, count2: 1, h: 0x40 })
    m.moveSpider(s, env({ frame: 1, rnd0: 0x80, hard: false }))
    expect(s.dh, 'kept diagonal').toBe(2)
    expect(s.dv, '80 AND 20 = 0 — no reversal').toBe(2)
    expect(s.count2, 'reset = mask EOR 10 = 30 on EASY (SD-29)').toBe(0x30)
  })

  it('mid-screen a diagonal spider goes vertical: dh saved to OLDDH and cleared', async () => {
    const m = await loadSpider()
    const s = spider({ dh: 2, dv: 2, count2: 1, h: 0x40 })
    m.moveSpider(s, env({ frame: 1, rnd0: 0x00 }))
    expect(s.dh).toBe(0)
    expect(s.oldDh).toBe(2)
    expect(s.h, 'the h step subtracts the NEW dh 0').toBe(0x40)
  })

  it('a vertical spider restores OLDDH (SD-26/27 edges do not apply to dh 0)', async () => {
    const m = await loadSpider()
    const s = spider({ dh: 0, oldDh: 0xfe, dv: 2, count2: 1, h: 0x40 })
    m.moveSpider(s, env({ frame: 1, rnd0: 0x00 }))
    expect(s.dh, 'back on the diagonal').toBe(0xfe)
  })

  it('at the screen edges the diagonal is KEPT (h ≥ FB or h < 5, SD-26/27)', async () => {
    const m = await loadSpider()
    const left = spider({ dh: 2, dv: 2, count2: 1, h: 0xfb })
    m.moveSpider(left, env({ frame: 1, rnd0: 0x00 }))
    expect(left.dh, 'left edge keeps dh').toBe(2)
    const right = spider({ dh: 2, dv: 2, count2: 1, h: 0x04 })
    m.moveSpider(right, env({ frame: 1, rnd0: 0x00 }))
    expect(right.dh, 'right edge keeps dh').toBe(2)
    const mid = spider({ dh: 2, dv: 2, count2: 1, h: 0x05 })
    m.moveSpider(mid, env({ frame: 1, rnd0: 0x00 }))
    expect(mid.dh, 'h=5 is already mid-screen — cleared').toBe(0)
  })

  it('the V reversal fires on (mask AND rnd): EASY mask 20, HARD mask 30 (SD-28)', async () => {
    const m = await loadSpider()
    const flip = spider({ dh: 0, oldDh: 2, dv: 2, count2: 1, h: 0x40 })
    m.moveSpider(flip, env({ frame: 1, rnd0: 0x20, hard: false }))
    expect(flip.dv, '20 AND 20 ≠ 0 — COMP(2)').toBe(0xfe)
    const hold = spider({ dh: 0, oldDh: 2, dv: 2, count2: 1, h: 0x40 })
    m.moveSpider(hold, env({ frame: 1, rnd0: 0x10, hard: false }))
    expect(hold.dv, '10 AND 20 = 0 on EASY — no reversal').toBe(2)
    const hard = spider({ dh: 0, oldDh: 2, dv: 2, count2: 1, h: 0x40 })
    m.moveSpider(hard, env({ frame: 1, rnd0: 0x10, hard: true }))
    expect(hard.dv, '10 AND 30 ≠ 0 on HARD — the extra reversal bit (SD-28)').toBe(0xfe)
    expect(hard.count2, 'reset = 30 EOR 10 = 20 on HARD (SD-29)').toBe(0x20)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The bounce (:2470-2519, SD-38..43)
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — bottom and ceiling bounce', () => {
  it('below row 9 a DOWNWARD spider reverses; an upward one sails on (SD-38)', async () => {
    const m = await loadSpider()
    const down = spider({ v: 0x09, dv: 2, dh: 0, oldDh: 2, count2: 0x10, h: 0x40 })
    m.moveSpider(down, env({ frame: 1 }))
    expect(down.v, 'stepped to 7 — under the row-9 line').toBe(0x07)
    expect(down.dv, 'positive dv at the bottom reverses (COMP)').toBe(0xfe)
    const up = spider({ v: 0x06, dv: 0xfe, dh: 0, oldDh: 2, count2: 0x10, h: 0x40 })
    m.moveSpider(up, env({ frame: 1 }))
    expect(up.v, 'stepped to 8 — still under the line').toBe(0x08)
    expect(up.dv, 'already climbing (dv bit 7 set) — kept').toBe(0xfe)
  })

  it('above the score ceiling an UPWARD spider reverses (SD-43)', async () => {
    const m = await loadSpider()
    // score 0: ceiling 60. Step v 60 → 62 (dv FE climbing): 60 < 62 → at top.
    const s = spider({ v: 0x60, dv: 0xfe, dh: 0, oldDh: 2, count2: 0x10, h: 0x40 })
    m.moveSpider(s, env({ frame: 1, score2: 0 }))
    expect(s.v).toBe(0x62)
    expect(s.dv, 'negative dv above the ceiling reverses').toBe(0x02)
    const inside = spider({ v: 0x5e, dv: 0xfe, dh: 0, oldDh: 2, count2: 0x10, h: 0x40 })
    m.moveSpider(inside, env({ frame: 1, score2: 0 }))
    expect(inside.v, 'stepped to 60 — exactly the ceiling is NOT above it').toBe(0x60)
    expect(inside.dv, 'BCS on limit ≥ v keeps the climb').toBe(0xfe)
  })

  it('spiderTopLimit descends by score: the cited golden set (SD-39..43)', async () => {
    const m = await loadSpider()
    expect(m.spiderTopLimit(0x00), 'below 60k the BCD subtract goes minus — full range 60').toBe(0x60)
    expect(m.spiderTopLimit(0x06), '60k exactly: step 0').toBe(0x60)
    expect(m.spiderTopLimit(0x08), '80k: (08-06)/2 = 1 → 58').toBe(0x58)
    expect(m.spiderTopLimit(0x10), '100k: BCD 10-06=04, /2 = 2 → 50').toBe(0x50)
    expect(m.spiderTopLimit(0x14), '140k: 08/2 = 4 → 40').toBe(0x40)
    expect(m.spiderTopLimit(0x16), '160k: 10/2 = 8 → clamp 5 → 38 (SD-41)').toBe(0x38)
    expect(m.spiderTopLimit(0x18), '180k: 12/2 = 9 → clamp 6 → 30 (SD-42)').toBe(0x30)
    expect(m.spiderTopLimit(0x50), '500k stays at the 30 floor').toBe(0x30)
    expect(m.spiderTopLimit(0x86), '860k: the BCD subtract goes minus again — back to 60').toBe(0x60)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Animation — SPDMV1 (:2534-2549, SD-44/45)
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — SPDMV1 animation', () => {
  it('a fast spider animates every frame: pic = ((pic + sign) AND 3) OR 14 (SD-45)', async () => {
    const m = await loadSpider()
    const down = spider({ pic: 0x17, dv: 2, dh: 0, oldDh: 2, count2: 0x10, h: 0x40, v: 0x40 })
    m.moveSpider(down, env({ frame: 1 }))
    expect(down.pic, 'positive dv steps +1; 17 wraps to 14').toBe(0x14)
    const up = spider({ pic: 0x14, dv: 0xfe, dh: 0, oldDh: 2, count2: 0x10, h: 0x40, v: 0x40 })
    m.moveSpider(up, env({ frame: 1 }))
    expect(up.pic, 'negative dv steps -1; 14 wraps to 17').toBe(0x17)
  })

  it('a slow spider animates only on even frames (SD-44)', async () => {
    const m = await loadSpider()
    const odd = spider({ pic: 0x14, dv: 1, dh: 0, oldDh: 1, count2: 0x10, h: 0x40, v: 0x40 })
    m.moveSpider(odd, env({ frame: 0x03 }))
    expect(odd.pic, '|dv| AND 1 AND frame ≠ 0 — skipped').toBe(0x14)
    const even = spider({ pic: 0x14, dv: 1, dh: 0, oldDh: 1, count2: 0x10, h: 0x40, v: 0x40 })
    m.moveSpider(even, env({ frame: 0x02 }))
    expect(even.pic).toBe(0x15)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The obstacle reaction (:2452-2468, SD-34..37) — the OBSTAC seam stays with ml3-3
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — obstacle reaction', () => {
  it('empty cells and message stamps below CLOUD are ignored (SD-34)', async () => {
    const m = await loadSpider()
    expect(m.spiderObstacle(0)).toEqual({ kind: 'none' })
    expect(m.spiderObstacle(0x2d)).toEqual({ kind: 'none' })
  })

  it('a DDT explosion cloud kills the spider (SD-35)', async () => {
    const m = await loadSpider()
    expect(m.spiderObstacle(0x2e)).toEqual({ kind: 'die' })
    expect(m.spiderObstacle(0x6d)).toEqual({ kind: 'die' })
  })

  it('the DDT bomb is NOT eaten; ROCK and everything above is (SD-36/37)', async () => {
    const m = await loadSpider()
    expect(m.spiderObstacle(0x6e), 'the bomb itself survives').toEqual({ kind: 'none' })
    expect(m.spiderObstacle(0x6f), 'the bomb band runs to ROCK — 6F is spared too').toEqual({ kind: 'none' })
    expect(m.spiderObstacle(0x70), 'a rock is eaten — unlike the beetle seam').toEqual({ kind: 'eat', cell: 0 })
    expect(m.spiderObstacle(0x7f), 'a full mushroom is eaten').toEqual({ kind: 'eat', cell: 0 })
    expect(m.spiderObstacle(0xfc), 'the background bit survives the eat (AND 80)').toEqual({ kind: 'eat', cell: 0x80 })
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The proximity kill (:2182-2210, SD-46..51) — the PTS stamp seam
// ───────────────────────────────────────────────────────────────────────────────
describe('spider — proximity scoring', () => {
  it('distance bands pay 300 / 600 / 900 / 1200 with the matching stamp (SD-46/47/48)', async () => {
    const m = await loadSpider()
    expect(m.spiderKill(0x60, 0x08, false), '|58| ≥ 38 → 300').toEqual({ points: 300, stamp: 0x2a })
    expect(m.spiderKill(0x40, 0x08, false), '|38| ≥ 38 → still 300').toEqual({ points: 300, stamp: 0x2a })
    expect(m.spiderKill(0x3f, 0x08, false), '|37| → 600').toEqual({ points: 600, stamp: 0x2d })
    expect(m.spiderKill(0x1e, 0x08, false), '|16| → 600').toEqual({ points: 600, stamp: 0x2d })
    expect(m.spiderKill(0x1d, 0x08, false), '|15| → 900').toEqual({ points: 900, stamp: 0x30 })
    expect(m.spiderKill(0x13, 0x08, false), '|0B| → 900').toEqual({ points: 900, stamp: 0x30 })
    expect(m.spiderKill(0x12, 0x08, false), '|0A| → 1200').toEqual({ points: 1200, stamp: 0x32 })
    expect(m.spiderKill(0x08, 0x08, false), 'point blank → 1200').toEqual({ points: 1200, stamp: 0x32 })
  })

  it('the distance is a signed-byte ABS — direction does not matter', async () => {
    const m = await loadSpider()
    expect(m.spiderKill(0x08, 0x20, false), 'spider BELOW the player: |−18| = 18 → 600').toEqual({ points: 600, stamp: 0x2d })
    expect(m.spiderKill(0x88, 0x08, false), 'diff 80: ABS(80) is 80 as a byte → 300').toEqual({ points: 300, stamp: 0x2a })
  })

  it('a DDT kill pays 1800 whatever the distance (SD-49)', async () => {
    const m = await loadSpider()
    expect(m.spiderKill(0x08, 0x08, true)).toEqual({ points: 1800, stamp: 0x33 })
    expect(m.spiderKill(0x60, 0x08, true)).toEqual({ points: 1800, stamp: 0x33 })
  })
})
