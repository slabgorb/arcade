// tests/inchworm.test.ts
//
// Story ml4-3 — RED phase (TEA). THE INCHWORM: `WRMMV — ENTER AND MOVE INCH
// WORM` (`MILLI.MAC:2559`, IW-1). Unlike every other flier the inchworm lives
// in motion-object slot 0 — bare MOBJC, no index (IW-3) — and only ENTERS
// while the centipede is ALIVE (DEAD non-zero, IW-8), on the rare tick where
// the frame LOW byte is 0x13 and the frame HIGH byte & 3 is 0 (IW-5/6): one
// window every 1024 frames. It inches a pure horizontal line — H += dh
// (IW-18) with dh ±1 below 80,000 and ±2 from it (IW-28/29/30) — cycling four
// pictures 0x10→0x13 (IW-11/12) at a cadence derived from its own speed: the
// SLOW worm animates every 4 frames, the FAST one every 2 (IW-13..17). Killed,
// it FIRST sets SLOW to 0xE0 — slowing every critter on screen — then scores
// 100, or 300 in a DDT cloud (IW-34..37). Every constant below carries an
// IW-* claim in docs/rom-study/claims/11-earwig-inchworm-bee.json,
// byte-verified against reference/original-source/millipede/ by the ml1-1
// citation gate.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/inchworm.ts — a pure cited reducer (conway.ts house style:
//   in-place mutation, deterministic, BYTE semantics — fields are 0..255,
//   -1 is 0xFF). One standalone subsystem per file (the ml4-1 rule). Exports:
//
//     INCHWORM_SLOT = 0           // bare MOBJC (MILLI.MAC:2566, IW-3)
//     INCHWORM_PIC = 0x10         // :2614 (IW-22); band 0x10..0x13 (IW-9/10)
//     INCHWORM_COLOR = 0xb9       // :2616 (IW-23)
//     INCHWORM_PTS = 100          // :2113 (IW-35)
//     INCHWORM_DDT_PTS = 300      // :2118 (IW-36)
//     INCHWORM_SLOW = 0xe0        // :2111-2112 (IW-34/37)
//
//     interface InchwormSlot { color; pic; v; h; dh; pts }
//         // MOBJC/MOBJP/MOBJV/MOBJH/MOBJDH/PTS at slot 0. color 0 = free.
//         // (No dv: WRMMV3 never writes a vertical direction.)
//     interface InchwormEnv {
//       frame;                    // FRAME low byte (IW-5/16)
//       frameHi;                  // FRAME+1 — the frame HIGH byte (IW-6)
//       score2;                   // SCORE2 — the BCD ten-thousands byte (IW-29)
//       playerAlive;              // the PLAYP/PEXPLD gate (:2560-2563, IW-2)
//       centin;                   // CENTIN (IW-7)
//       dead;                     // DEAD — must be NON-ZERO to enter (IW-8)
//       rnd0;                     // POKEY RND0 — the direction bit (:2631, IW-31)
//       rnd1;                     // POKEY RND1 — the spawn row (:2620-2621, IW-25)
//     }
//
//     isInchworm(slot): boolean                 // :2581-2585 (IW-9/10)
//     inchwormSpawnTick(frame, frameHi): boolean// :2568-2573 (IW-5/6)
//     mayStartInchworm(env): boolean            // tick + CENTIN < 11 + DEAD !== 0
//     inchwormSpeed(score2): 1 | 2              // :2626-2630 (IW-28/29/30)
//     nextInchwormPic(pic): number              // (pic + 1) & 0x13 (IW-11/12)
//     inchwormFlapMask(dh): 1 | 3               // |dh| ORA 1 EOR 2 (IW-13/14/15)
//     startInchworm(slot, env): void            // WRMMV3 spawn writes (IW-22..32)
//     trySpawnInchworm(slot, env): boolean      // player gate + slot free + gates
//     moveInchworm(slot, env):
//       { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }
//         // one WRMMV move tick: picture cycle FIRST when (frame & mask) === 0
//         // (:2586-2595, IW-16/17 — the flap happens even on the exit tick),
//         // then H += dh (:2600-2603, IW-18); H === 0 clears ONLY the colour
//         // (:2604-2605, IW-19/20 — NOT BEEOFF: pts survives). The
//         // OBSTAC/DDTEXP tail (:2606-2611, IW-21) stays with the caller.
//     inchwormKill(byDdt): { points: number; slow: number }
//         // SHOOT2 :2111-2118 — slow is ALWAYS 0xe0, points 100/300 (IW-34..37)
//
// ─── SCOPE (the ml4-1/ml4-2 precedent) ───────────────────────────────────────
// • Upright cabinet only; cocktail is ml8-3.
// • CHAN8 sound (:2596-2599) is an ml6 seam — not modelled.
// • The OBSTAC/DDTEXP seams stay with their callers (IW-21); the WRMMV3
//   `LDY PLAYR` at :2625 is dead — its Y is clobbered by `LDY X,SCORE2` at
//   :2627 with X still PLAYR from :2574 — so the env carries score2 directly.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` — literals here are hex; a trailing period
// (`11.`) marks DECIMAL.
//
// ─── FIXTURE DERIVATION ─────────────────────────────────────────────────────
// Every expected byte below was hand-derived from the cited 6502 lines this
// session (TEA). No committed helper reimplements the algorithm — the
// literals stand alone.

import { describe, it, expect } from 'vitest'

interface InchwormSlot {
  color: number
  pic: number
  v: number
  h: number
  dh: number
  pts: number
}

interface InchwormEnv {
  frame: number
  frameHi: number
  score2: number
  playerAlive: boolean
  centin: number
  dead: number
  rnd0: number
  rnd1: number
}

type InchwormMove = { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }

interface InchwormModule {
  INCHWORM_SLOT: number
  INCHWORM_PIC: number
  INCHWORM_COLOR: number
  INCHWORM_PTS: number
  INCHWORM_DDT_PTS: number
  INCHWORM_SLOW: number
  isInchworm: (slot: Readonly<InchwormSlot>) => boolean
  inchwormSpawnTick: (frame: number, frameHi: number) => boolean
  mayStartInchworm: (env: Readonly<InchwormEnv>) => boolean
  inchwormSpeed: (score2: number) => number
  nextInchwormPic: (pic: number) => number
  inchwormFlapMask: (dh: number) => number
  startInchworm: (slot: InchwormSlot, env: Readonly<InchwormEnv>) => void
  trySpawnInchworm: (slot: InchwormSlot, env: Readonly<InchwormEnv>) => boolean
  moveInchworm: (slot: InchwormSlot, env: Readonly<InchwormEnv>) => InchwormMove
  inchwormKill: (byDdt: boolean) => { points: number; slow: number }
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const INCHWORM_SPECIFIER = ['..', 'src', 'core', 'inchworm'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadInchworm(): Promise<InchwormModule> {
  try {
    const mod = (await import(/* @vite-ignore */ INCHWORM_SPECIFIER)) as Partial<InchwormModule>
    if (typeof mod.moveInchworm !== 'function') throw new Error('module has no moveInchworm export')
    if (typeof mod.trySpawnInchworm !== 'function') throw new Error('module has no trySpawnInchworm export')
    return mod as InchwormModule
  } catch (e) {
    throw new Error(
      'inchworm reducer not built yet — GREEN (Dev) ships src/core/inchworm.ts per the ' +
      'contract at the top of tests/inchworm.test.ts (pure, cited, byte semantics). ' +
      `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** A free slot. */
function freeSlot(over: Partial<InchwormSlot> = {}): InchwormSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dh: 0, pts: 0, ...over }
}

/** A live mid-screen slow inchworm (frame 1 → mask 3 misses: no flap). */
function inchworm(over: Partial<InchwormSlot> = {}): InchwormSlot {
  return { color: 0xb9, pic: 0x10, v: 0x58, h: 0x40, dh: 1, pts: 0, ...over }
}

function env(over: Partial<InchwormEnv> = {}): InchwormEnv {
  return {
    frame: 0x13, frameHi: 0, score2: 0, playerAlive: true,
    centin: 0, dead: 1, rnd0: 0x00, rnd1: 0x00, ...over,
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Cited constants
// ───────────────────────────────────────────────────────────────────────────────
describe('inchworm — cited constants', () => {
  it('pins the slot, picture, colour, slow byte and scores (IW-3/22/23/34..37)', async () => {
    const m = await loadInchworm()
    expect(m.INCHWORM_SLOT, 'bare MOBJC — slot 0 (MILLI.MAC:2566, IW-3)').toBe(0)
    expect(m.INCHWORM_PIC, 'spawn picture (MILLI.MAC:2614, IW-22)').toBe(0x10)
    expect(m.INCHWORM_COLOR, 'spawn colour (MILLI.MAC:2616, IW-23)').toBe(0xb9)
    expect(m.INCHWORM_PTS, 'BCD 1 hundreds (MILLI.MAC:2113, IW-35)').toBe(100)
    expect(m.INCHWORM_DDT_PTS, 'BCD 3 hundreds by DDT (MILLI.MAC:2118, IW-36)').toBe(300)
    expect(m.INCHWORM_SLOW, 'LDA I,0E0 / STA SLOW (MILLI.MAC:2111-2112, IW-34/37)').toBe(0xe0)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Identification — the WRMMV/SHOOT2 picture band (IW-9/10/33)
// ───────────────────────────────────────────────────────────────────────────────
describe('inchworm — identification', () => {
  it('pics 0x10..0x13 are inchworms; the band edges are not (IW-9/10)', async () => {
    const m = await loadInchworm()
    expect(m.isInchworm(inchworm({ pic: 0x10 }))).toBe(true)
    expect(m.isInchworm(inchworm({ pic: 0x13 })), 'all four cycle pics qualify').toBe(true)
    expect(m.isInchworm(inchworm({ pic: 0x0f })), 'below 0x10 is the mosquito band (IW-10)').toBe(false)
    expect(m.isInchworm(inchworm({ pic: 0x14 })), 'CMP I,14 / BCS (IW-9)').toBe(false)
  })

  it('a free slot (color 0) is never an inchworm', async () => {
    const m = await loadInchworm()
    expect(m.isInchworm(freeSlot({ pic: 0x10 }))).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The spawn tick and gates (:2568-2579, IW-5/6/7/8)
// ───────────────────────────────────────────────────────────────────────────────
describe('inchworm — spawn tick and gates', () => {
  it('the low frame byte must be exactly 0x13 (IW-5)', async () => {
    const m = await loadInchworm()
    expect(m.inchwormSpawnTick(0x13, 0)).toBe(true)
    expect(m.inchwormSpawnTick(0x12, 0)).toBe(false)
    expect(m.inchwormSpawnTick(0x93, 0), 'no mask on the low byte').toBe(false)
  })

  it('the HIGH frame byte & 3 must be 0 — one window every 4 wraps (IW-6)', async () => {
    const m = await loadInchworm()
    expect(m.inchwormSpawnTick(0x13, 4)).toBe(true)
    expect(m.inchwormSpawnTick(0x13, 1)).toBe(false)
    expect(m.inchwormSpawnTick(0x13, 3)).toBe(false)
    expect(m.inchwormSpawnTick(0x13, 0xfc), 'only the low 2 bits gate').toBe(true)
  })

  it('CENTIN 11 blocks; 10 passes (IW-7)', async () => {
    const m = await loadInchworm()
    expect(m.mayStartInchworm(env({ centin: 10 }))).toBe(true)
    expect(m.mayStartInchworm(env({ centin: 11 })), 'CMP I,11. / BCS — decimal 11').toBe(false)
  })

  it('a DEAD centipede blocks the entry — the inverse of the bee/dragonfly rule (IW-8)', async () => {
    const m = await loadInchworm()
    expect(m.mayStartInchworm(env({ dead: 0 })), 'BEQ 1$ — no entry while dead').toBe(false)
    expect(m.mayStartInchworm(env({ dead: 3 }))).toBe(true)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Speed (:2626-2630, IW-28/29/30)
// ───────────────────────────────────────────────────────────────────────────────
describe('inchworm — speed', () => {
  it('1 below 80,000; 2 from 80,000 (IW-28/29/30)', async () => {
    const m = await loadInchworm()
    expect(m.inchwormSpeed(0x00)).toBe(1)
    expect(m.inchwormSpeed(0x07)).toBe(1)
    expect(m.inchwormSpeed(0x08), 'CPY I,8 / BCS — 80k is fast').toBe(2)
    expect(m.inchwormSpeed(0x99)).toBe(2)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Spawn writes — WRMMV3 (:2614-2635, IW-22..32)
// ───────────────────────────────────────────────────────────────────────────────
describe('inchworm — spawn', () => {
  it('startInchworm writes pic, colour, edge H and the RND1 V (IW-22..27)', async () => {
    const m = await loadInchworm()
    const slot = freeSlot({ dh: 0x77 })
    m.startInchworm(slot, env({ rnd1: 0x00, rnd0: 0x00, score2: 0 }))
    expect(slot.pic, 'picture 0x10 (IW-22)').toBe(0x10)
    expect(slot.color, 'colour 0xb9 (IW-23)').toBe(0xb9)
    expect(slot.h, 'starts at H=0 (IW-24)').toBe(0)
    expect(slot.v, '(0x00 & 0x38) + 0x40 (IW-25/26)').toBe(0x40)
    expect(slot.dh, 'slow rightward: +1 (IW-30/31)').toBe(1)
  })

  it('the spawn V spans (rnd1 & 0x38) + 0x40 = 0x40..0x78 (IW-25/26/27)', async () => {
    const m = await loadInchworm()
    const top = freeSlot()
    m.startInchworm(top, env({ rnd1: 0xff }))
    expect(top.v, '(0xff & 0x38) + 0x40 = 0x78').toBe(0x78)
    const mid = freeSlot()
    m.startInchworm(mid, env({ rnd1: 0x2a }))
    expect(mid.v, '(0x2a & 0x38) + 0x40 = 0x68').toBe(0x68)
  })

  it('RND0 bit 7 runs COMP — the fast worm goes leftward as 0xfe (IW-28/29/31/32)', async () => {
    const m = await loadInchworm()
    const slow = freeSlot()
    m.startInchworm(slow, env({ rnd0: 0x80, score2: 0 }))
    expect(slow.dh, '-1 is 0xff').toBe(0xff)
    const fast = freeSlot()
    m.startInchworm(fast, env({ rnd0: 0x80, score2: 0x08 }))
    expect(fast.dh, '-2 is 0xfe').toBe(0xfe)
  })

  it('trySpawnInchworm runs the whole path: player, slot, tick, CENTIN, DEAD (IW-2/4/5/6/7/8)', async () => {
    const m = await loadInchworm()
    const slot = freeSlot()
    expect(m.trySpawnInchworm(slot, env({ playerAlive: false })), 'dead player (IW-2)').toBe(false)
    expect(m.trySpawnInchworm(inchworm(), env()), 'occupied slot never spawns (IW-4)').toBe(false)
    expect(m.trySpawnInchworm(slot, env({ frame: 0x14 })), 'off tick (IW-5)').toBe(false)
    expect(m.trySpawnInchworm(slot, env({ frameHi: 2 })), 'wrong wrap (IW-6)').toBe(false)
    expect(m.trySpawnInchworm(slot, env({ centin: 11 })), 'big centipede (IW-7)').toBe(false)
    expect(m.trySpawnInchworm(slot, env({ dead: 0 })), 'dead centipede (IW-8)').toBe(false)
    expect(m.trySpawnInchworm(slot, env())).toBe(true)
    expect(slot.color, 'the passing path wrote the slot').toBe(0xb9)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The picture cycle and its cadence (:2586-2595, IW-11..17)
// ───────────────────────────────────────────────────────────────────────────────
describe('inchworm — picture cycle', () => {
  it('the four pics cycle 10→11→12→13→10 via (pic+1) & 0x13 (IW-11/12)', async () => {
    const m = await loadInchworm()
    expect(m.nextInchwormPic(0x10)).toBe(0x11)
    expect(m.nextInchwormPic(0x11)).toBe(0x12)
    expect(m.nextInchwormPic(0x12)).toBe(0x13)
    expect(m.nextInchwormPic(0x13), '0x14 & 0x13 wraps').toBe(0x10)
  })

  it('the flap mask is 3 for the slow worm, 1 for the fast — |dh| ORA 1 EOR 2 (IW-13/14/15)', async () => {
    const m = await loadInchworm()
    expect(m.inchwormFlapMask(1)).toBe(3)
    expect(m.inchwormFlapMask(2)).toBe(1)
    expect(m.inchwormFlapMask(0xff), 'ABS first: -1 is slow').toBe(3)
    expect(m.inchwormFlapMask(0xfe), 'ABS first: -2 is fast').toBe(1)
  })

  it('the slow worm animates every 4 frames, the fast every 2 (IW-16/17)', async () => {
    const m = await loadInchworm()
    const slow = inchworm({ pic: 0x10, dh: 1 })
    m.moveInchworm(slow, env({ frame: 4 }))
    expect(slow.pic, 'frame & 3 === 0 cycles the slow worm').toBe(0x11)
    m.moveInchworm(slow, env({ frame: 6 }))
    expect(slow.pic, 'frame & 3 === 2 does not').toBe(0x11)
    const fast = inchworm({ pic: 0x10, dh: 2 })
    m.moveInchworm(fast, env({ frame: 6 }))
    expect(fast.pic, 'frame & 1 === 0 cycles the fast worm').toBe(0x11)
    m.moveInchworm(fast, env({ frame: 7 }))
    expect(fast.pic, 'odd frames do not').toBe(0x11)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Movement (:2600-2611, IW-18/19/20)
// ───────────────────────────────────────────────────────────────────────────────
describe('inchworm — movement', () => {
  it('a dead player idles the inchworm (IW-2)', async () => {
    const m = await loadInchworm()
    const slot = inchworm()
    expect(m.moveInchworm(slot, env({ playerAlive: false }))).toEqual({ kind: 'idle' })
    expect(slot.h, 'no motion while idle').toBe(0x40)
  })

  it('H += dh each tick; V never moves (IW-18)', async () => {
    const m = await loadInchworm()
    const slot = inchworm({ h: 0x40, dh: 1, v: 0x58 })
    expect(m.moveInchworm(slot, env({ frame: 1 }))).toEqual({ kind: 'moved' })
    expect(slot.h).toBe(0x41)
    expect(slot.v, 'the inchworm never dives').toBe(0x58)
  })

  it('a leftward worm adds the 0xfe dh — byte wrap (IW-18)', async () => {
    const m = await loadInchworm()
    const slot = inchworm({ h: 0x01, dh: 0xfe })
    m.moveInchworm(slot, env({ frame: 1 }))
    expect(slot.h, '0x01 + 0xfe wraps to 0xff').toBe(0xff)
  })

  it('H landing on exactly 0 is offscreen: ONLY the colour clears — pts survives (IW-19/20)', async () => {
    const m = await loadInchworm()
    const slot = inchworm({ h: 0xff, dh: 1, pts: 0x55, pic: 0x12 })
    expect(m.moveInchworm(slot, env({ frame: 1 }))).toEqual({ kind: 'offscreen' })
    expect(slot.color, 'STA MOBJC removes it from the active list (IW-20)').toBe(0)
    expect(slot.h, 'the stored sum IS zero').toBe(0)
    expect(slot.pts, 'NOT BEEOFF — pts is left alone (IW-20)').toBe(0x55)
    expect(slot.pic, 'the picture is left alone too').toBe(0x12)
  })

  it('the picture still cycles on the exit tick — the flap sits BEFORE the H add (IW-16/18)', async () => {
    const m = await loadInchworm()
    const slot = inchworm({ h: 0xff, dh: 1, pic: 0x10 })
    m.moveInchworm(slot, env({ frame: 4 }))
    expect(slot.pic, ':2595 runs before :2600').toBe(0x11)
    expect(slot.color).toBe(0)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The kill — SLOW first, then the points (:2111-2118, IW-34..37)
// ───────────────────────────────────────────────────────────────────────────────
describe('inchworm — kill', () => {
  it('every inchworm kill carries slow 0xe0 and 100 points (IW-34/35/37)', async () => {
    const m = await loadInchworm()
    expect(m.inchwormKill(false)).toEqual({ points: 100, slow: 0xe0 })
  })

  it('a DDT kill scores 300 — and still slows the screen (IW-34/36)', async () => {
    const m = await loadInchworm()
    expect(m.inchwormKill(true)).toEqual({ points: 300, slow: 0xe0 })
  })
})
