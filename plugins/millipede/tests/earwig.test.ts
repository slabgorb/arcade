// tests/earwig.test.ts
//
// Story ml4-3 — RED phase (TEA). THE EARWIG: `EARWIG — MOVE AND START EARWIG`
// (`MILLI.MAC:672`, EW-1). The earwig shares motion-object slot 12 with the
// bee/dragonfly/mosquito (EW-3), starts only on the FRAME==0 tick — once every
// 256 frames, "EVERY 4 SECONDS" (EW-6) — on small-centipede waves (CENTIN < 11,
// EW-7/8) with a 1-in-4 RND0 roll (EW-9), and walks a pure HORIZONTAL line
// across the upper half of the screen (dv is 0, EW-21): H += dh each tick
// (EW-25) until H wraps to exactly 0 and BEEOFF frees the slot (EW-26/27).
// Its signature is POISON: any mushroom stamp it crosses is ANDed with 0xFB
// (EW-34/35/36), and a stamp inside the DDT band [CLOUD,DDT) kills it via
// DDTEX1 (EW-31..33). Killed by the player it scores 1000 — 3000 in a DDT
// cloud (EW-40/41). Every constant below carries an EW-* claim in
// docs/rom-study/claims/11-earwig-inchworm-bee.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
//   src/core/earwig.ts — a pure cited reducer (conway.ts house style:
//   in-place mutation, deterministic, BYTE semantics — fields are 0..255,
//   -1 is 0xFF). One standalone subsystem per file (the ml4-1 rule): the
//   BEEOFF port is a module-local copy, not an import. Exports:
//
//     EARWIG_SLOT = 12            // MILLI.MAC:677 (EW-3)
//     EARWIG_PIC = 0x1c           // :695 (EW-10); band 0x1c..0x1d (EW-4/5)
//     EARWIG_COLOR = 0xb9         // :697 (EW-11)
//     EARWIG_PTS = 1000           // :2134 (EW-40)
//     EARWIG_DDT_PTS = 3000       // :2139 (EW-41)
//     CLOUD_STAMP = 0x2e          // MLDEF.MAC:202 (EW-37)
//     DDT_STAMP = 0x6e            // MLDEF.MAC:203 (EW-38)
//     MUSHROOM_STAMP_MIN = 0x7c   // MILLI.MAC:756 (EW-34)
//
//     interface EarwigSlot { color; pic; v; h; dv; dh; pts }
//         // BEEC/BEEP/BEEV/BEEH/BEEDV/BEEDH/PTS at +12. color 0 = free.
//     interface EarwigEnv {
//       frame;                    // FRAME byte (EW-6/28)
//       score2;                   // SCORE2 — the BCD ten-thousands byte (EW-12)
//       playerAlive;              // the PLAYP/PEXPLD gate (:673-676, EW-2)
//       centin;                   // CENTIN (EW-7/8)
//       rnd0;                     // 1st RND0 read — the 1-in-4 gate (:692, EW-9)
//       rndSpeed;                 // 2nd RND0 read — the slow roll (:702, EW-13)
//       rndDir;                   // 3rd RND0 read — the direction bit (:706, EW-15)
//       rndV;                     // 4th RND0 read — the spawn row (:719, EW-22)
//     }
//         // FOUR SEPARATE READS of the live POKEY register: collapsing them
//         // onto one byte correlates the gate with the slow roll (both AND 3)
//         // and every over-20k earwig would come out slow. The env carries
//         // each read as its own byte.
//
//     isEarwig(slot): boolean                   // :679-683 (EW-4/5)
//     earwigSpawnTick(frame): boolean           // frame === 0 (:686-687, EW-6)
//     mayStartEarwig(env): boolean              // tick + CENTIN < 11 + rnd0&3 === 0
//     earwigSpeed(env): 1 | 2                   // :699-714 (EW-12/13/14/17)
//     startEarwig(slot, env): void              // spawn writes (EW-10/11/19..24)
//     trySpawnEarwig(slot, env): boolean        // player gate + slot free + gates
//     moveEarwig(slot, env):
//       { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }
//         // one EARWIG move tick: H += dh FIRST (:729-732, EW-25); H === 0 is
//         // offscreen via BEEOFF with NO flap that tick (:734-738, EW-26/27);
//         // else flap on frame&3 === 0 (:740-745, EW-28/29). The OBSTAC read
//         // (:746-748, EW-30) stays with the caller: the STAMP decision is the
//         // pure classifier below.
//     earwigStamp(stamp):
//       { kind: 'none' } | { kind: 'ddt-death' } | { kind: 'poison'; stamp: number }
//         // :749-759 — [CLOUD,DDT) dies via the DDTEX1 seam (EW-31/32/33);
//         // >= 0x7c poisons: stamp & 0xfb written back (EW-34/35/36)
//     earwigOff(slot): void                     // BEEOFF :166-171 (EW-27)
//     earwigKill(byDdt): { points: number }     // SHOOT2 :2134-2139 (EW-40/41)
//
// ─── SCOPE (the ml4-1/ml4-2 precedent) ───────────────────────────────────────
// • Upright cabinet only: the :723 EOR CKF8 is identity; cocktail is ml8-3.
// • CHAN9 sound (:725-728, :736-737, :2140-2141) is an ml6 seam — not modelled.
// • The OBSTAC/DDTEX1 seams stay with their callers: moveEarwig returns the
//   motion, earwigStamp classifies the stamp the caller read.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` — literals here are hex; a trailing period
// (`11.`, `12.`) marks DECIMAL.
//
// ─── ORIENTATION ────────────────────────────────────────────────────────────
// The earwig never dives: dv stays 0 (EW-21). V is set once at spawn, in the
// upper half: (rndV & 0x78) + 0x70 = 0x70..0xE8 (EW-22/23/24).
//
// ─── FIXTURE DERIVATION ─────────────────────────────────────────────────────
// Every expected byte below was hand-derived from the cited 6502 lines this
// session (TEA). No committed helper reimplements the algorithm — the
// literals stand alone.

import { describe, it, expect } from 'vitest'

interface EarwigSlot {
  color: number
  pic: number
  v: number
  h: number
  dv: number
  dh: number
  pts: number
}

interface EarwigEnv {
  frame: number
  score2: number
  playerAlive: boolean
  centin: number
  rnd0: number
  rndSpeed: number
  rndDir: number
  rndV: number
}

type EarwigMove = { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }
type EarwigStamp = { kind: 'none' } | { kind: 'ddt-death' } | { kind: 'poison'; stamp: number }

interface EarwigModule {
  EARWIG_SLOT: number
  EARWIG_PIC: number
  EARWIG_COLOR: number
  EARWIG_PTS: number
  EARWIG_DDT_PTS: number
  CLOUD_STAMP: number
  DDT_STAMP: number
  MUSHROOM_STAMP_MIN: number
  isEarwig: (slot: Readonly<EarwigSlot>) => boolean
  earwigSpawnTick: (frame: number) => boolean
  mayStartEarwig: (env: Readonly<EarwigEnv>) => boolean
  earwigSpeed: (env: Readonly<EarwigEnv>) => number
  startEarwig: (slot: EarwigSlot, env: Readonly<EarwigEnv>) => void
  trySpawnEarwig: (slot: EarwigSlot, env: Readonly<EarwigEnv>) => boolean
  moveEarwig: (slot: EarwigSlot, env: Readonly<EarwigEnv>) => EarwigMove
  earwigStamp: (stamp: number) => EarwigStamp
  earwigOff: (slot: EarwigSlot) => void
  earwigKill: (byDdt: boolean) => { points: number }
}

// COMPUTED specifier (the conway.test.ts pattern): tsc cannot resolve it, so
// the RED tree stays lint-clean while the module does not exist; vitest
// resolves it at runtime, relative to this file.
const EARWIG_SPECIFIER = ['..', 'src', 'core', 'earwig'].join('/')

/** Self-describing loader (the ml1-1 pattern): RED proves the feature absent. */
async function loadEarwig(): Promise<EarwigModule> {
  try {
    const mod = (await import(/* @vite-ignore */ EARWIG_SPECIFIER)) as Partial<EarwigModule>
    if (typeof mod.moveEarwig !== 'function') throw new Error('module has no moveEarwig export')
    if (typeof mod.trySpawnEarwig !== 'function') throw new Error('module has no trySpawnEarwig export')
    return mod as EarwigModule
  } catch (e) {
    throw new Error(
      'earwig reducer not built yet — GREEN (Dev) ships src/core/earwig.ts per the ' +
      'contract at the top of tests/earwig.test.ts (pure, cited, byte semantics). ' +
      `(${e instanceof Error ? e.message : String(e)})`,
    )
  }
}

/** A free slot as BEEOFF leaves it. */
function freeSlot(over: Partial<EarwigSlot> = {}): EarwigSlot {
  return { color: 0, pic: 0, v: 0, h: 0, dv: 0, dh: 0, pts: 0, ...over }
}

/** A live mid-screen earwig in a known state (frame 1 → no flap). */
function earwig(over: Partial<EarwigSlot> = {}): EarwigSlot {
  return { color: 0xb9, pic: 0x1c, v: 0x90, h: 0x40, dv: 0, dh: 2, pts: 0, ...over }
}

function env(over: Partial<EarwigEnv> = {}): EarwigEnv {
  return {
    frame: 0, score2: 0, playerAlive: true, centin: 0,
    rnd0: 0x00, rndSpeed: 0x01, rndDir: 0x00, rndV: 0x00, ...over,
  }
}

// ───────────────────────────────────────────────────────────────────────────────
// Cited constants
// ───────────────────────────────────────────────────────────────────────────────
describe('earwig — cited constants', () => {
  it('pins the slot, picture, colour, stamps and scores (EW-3/10/11/37/38/40/41)', async () => {
    const m = await loadEarwig()
    expect(m.EARWIG_SLOT, 'BEEC+12. slot (MILLI.MAC:677, EW-3)').toBe(12)
    expect(m.EARWIG_PIC, 'spawn picture (MILLI.MAC:695, EW-10)').toBe(0x1c)
    expect(m.EARWIG_COLOR, 'spawn colour (MILLI.MAC:697, EW-11)').toBe(0xb9)
    expect(m.EARWIG_PTS, 'BCD 10 hundreds (MILLI.MAC:2134, EW-40)').toBe(1000)
    expect(m.EARWIG_DDT_PTS, 'BCD 30 hundreds by DDT (MILLI.MAC:2139, EW-41)').toBe(3000)
    expect(m.CLOUD_STAMP, 'CLOUD equate (MLDEF.MAC:202, EW-37)').toBe(0x2e)
    expect(m.DDT_STAMP, 'DDT equate (MLDEF.MAC:203, EW-38)').toBe(0x6e)
    expect(m.MUSHROOM_STAMP_MIN, 'CMP I,7C (MILLI.MAC:756, EW-34)').toBe(0x7c)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Identification — the EARWIG/SHOOT2 picture band (EW-4/5/39/42)
// ───────────────────────────────────────────────────────────────────────────────
describe('earwig — identification', () => {
  it('pics 0x1c and 0x1d are earwigs; the band edges are not (EW-4/5)', async () => {
    const m = await loadEarwig()
    expect(m.isEarwig(earwig({ pic: 0x1c }))).toBe(true)
    expect(m.isEarwig(earwig({ pic: 0x1d })), 'the flapped frame is still an earwig').toBe(true)
    expect(m.isEarwig(earwig({ pic: 0x1b })), 'below 0x1c is the spider band (EW-42)').toBe(false)
    expect(m.isEarwig(earwig({ pic: 0x1e })), 'CMP I,1E / BCS (EW-4)').toBe(false)
  })

  it('a free slot (color 0) is never an earwig', async () => {
    const m = await loadEarwig()
    expect(m.isEarwig(freeSlot({ pic: 0x1c }))).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The spawn tick and gates (:686-694, EW-6/7/8/9)
// ───────────────────────────────────────────────────────────────────────────────
describe('earwig — spawn tick and gates', () => {
  it('only the FULL frame byte 0 is a spawn tick — once in 256 (EW-6)', async () => {
    const m = await loadEarwig()
    expect(m.earwigSpawnTick(0)).toBe(true)
    expect(m.earwigSpawnTick(1)).toBe(false)
    expect(m.earwigSpawnTick(0x80), 'no mask — any non-zero frame is off-tick').toBe(false)
  })

  it('CENTIN 11 blocks the start; 10 passes (EW-7/8)', async () => {
    const m = await loadEarwig()
    expect(m.mayStartEarwig(env({ centin: 10 }))).toBe(true)
    expect(m.mayStartEarwig(env({ centin: 11 })), 'CMP I,11. / BCS — decimal 11').toBe(false)
  })

  it('the 1-in-4 roll: rnd0 & 3 must be 0 (EW-9)', async () => {
    const m = await loadEarwig()
    expect(m.mayStartEarwig(env({ rnd0: 0x00 }))).toBe(true)
    expect(m.mayStartEarwig(env({ rnd0: 0xfc })), 'only the low 2 bits gate').toBe(true)
    expect(m.mayStartEarwig(env({ rnd0: 0x01 }))).toBe(false)
    expect(m.mayStartEarwig(env({ rnd0: 0x03 }))).toBe(false)
  })

  it('off-tick frames never start (EW-6)', async () => {
    const m = await loadEarwig()
    expect(m.mayStartEarwig(env({ frame: 1, centin: 0, rnd0: 0 }))).toBe(false)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Speed — slow/fast and the FOUR separate RND0 reads (:699-714, EW-12..18)
// ───────────────────────────────────────────────────────────────────────────────
describe('earwig — speed', () => {
  it('below 20,000 the earwig is always slow — speed 1 (EW-12/17)', async () => {
    const m = await loadEarwig()
    expect(m.earwigSpeed(env({ score2: 0x00, rndSpeed: 0x01 }))).toBe(1)
    expect(m.earwigSpeed(env({ score2: 0x01, rndSpeed: 0xff })), 'rndSpeed never consulted below 20k').toBe(1)
  })

  it('from 20,000 the speed is 2, unless the slow roll hits (EW-13/14)', async () => {
    const m = await loadEarwig()
    expect(m.earwigSpeed(env({ score2: 0x02, rndSpeed: 0x01 }))).toBe(2)
    expect(m.earwigSpeed(env({ score2: 0x02, rndSpeed: 0x04 })), 'rndSpeed & 3 === 0 rolls slow').toBe(1)
    expect(m.earwigSpeed(env({ score2: 0x99, rndSpeed: 0x03 }))).toBe(2)
  })

  it('the slow roll reads a FRESH RND0 byte — the gate byte does not decide it (EW-9 vs EW-13)', async () => {
    const m = await loadEarwig()
    // rnd0 & 3 === 0 passed the gate; rndSpeed & 3 !== 0 keeps the fast speed.
    // A port that reuses the gate byte would force every over-20k earwig slow.
    expect(m.earwigSpeed(env({ score2: 0x02, rnd0: 0x00, rndSpeed: 0x01 }))).toBe(2)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Spawn writes (:695-724, EW-10/11/15..24)
// ───────────────────────────────────────────────────────────────────────────────
describe('earwig — spawn', () => {
  it('startEarwig writes pic, colour, edge H, zero dv, and the upper-half V (EW-10/11/20/21/22/23/24)', async () => {
    const m = await loadEarwig()
    const slot = freeSlot({ dv: 0x77, dh: 0x77 })
    m.startEarwig(slot, env({ score2: 0, rndDir: 0x00, rndV: 0x00 }))
    expect(slot.pic, 'picture 0x1c (EW-10)').toBe(0x1c)
    expect(slot.color, 'colour 0xb9 (EW-11)').toBe(0xb9)
    expect(slot.h, 'starts at the edge, H=0 (EW-20)').toBe(0)
    expect(slot.dv, 'vertical direction cleared (EW-21)').toBe(0)
    expect(slot.v, '(0x00 & 0x78) + 0x70 (EW-22/23)').toBe(0x70)
    expect(slot.dh, 'slow below 20k, bit 7 clear → +1 (EW-15/17)').toBe(1)
  })

  it('the spawn V spans the upper half: (rndV & 0x78) + 0x70 (EW-22/23/24)', async () => {
    const m = await loadEarwig()
    const top = freeSlot()
    m.startEarwig(top, env({ rndV: 0xff }))
    expect(top.v, '(0xff & 0x78) + 0x70 = 0xe8').toBe(0xe8)
    const mid = freeSlot()
    m.startEarwig(mid, env({ rndV: 0x2a }))
    expect(mid.v, '(0x2a & 0x78) + 0x70 = 0x98').toBe(0x98)
  })

  it('rndDir bit 7 negates the speed — dh is the COMP (EW-15/16/18)', async () => {
    const m = await loadEarwig()
    const slow = freeSlot()
    m.startEarwig(slow, env({ score2: 0, rndDir: 0x80 }))
    expect(slow.dh, 'slow leftward: -1 is 0xff (EW-18)').toBe(0xff)
    const fast = freeSlot()
    m.startEarwig(fast, env({ score2: 0x02, rndSpeed: 0x01, rndDir: 0x80 }))
    expect(fast.dh, 'fast leftward: -2 is 0xfe (EW-16)').toBe(0xfe)
  })

  it('trySpawnEarwig runs the whole path: player gate, slot free, tick, CENTIN, roll (EW-2/3/6/7/9)', async () => {
    const m = await loadEarwig()
    const slot = freeSlot()
    expect(m.trySpawnEarwig(slot, env({ playerAlive: false })), 'dead player (EW-2)').toBe(false)
    expect(m.trySpawnEarwig(earwig(), env()), 'occupied slot never spawns (EW-3)').toBe(false)
    expect(m.trySpawnEarwig(slot, env({ frame: 7 })), 'off tick (EW-6)').toBe(false)
    expect(m.trySpawnEarwig(slot, env({ centin: 11 })), 'big centipede (EW-7/8)').toBe(false)
    expect(m.trySpawnEarwig(slot, env({ rnd0: 2 })), 'roll missed (EW-9)').toBe(false)
    expect(m.trySpawnEarwig(slot, env())).toBe(true)
    expect(slot.color, 'the passing path wrote the slot').toBe(0xb9)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// Movement (:729-745, EW-25..29)
// ───────────────────────────────────────────────────────────────────────────────
describe('earwig — movement', () => {
  it('a dead player idles the earwig (EW-2)', async () => {
    const m = await loadEarwig()
    const slot = earwig()
    expect(m.moveEarwig(slot, env({ playerAlive: false }))).toEqual({ kind: 'idle' })
    expect(slot.h, 'no motion while idle').toBe(0x40)
  })

  it('H += dh each tick; V never moves (EW-25/21)', async () => {
    const m = await loadEarwig()
    const slot = earwig({ h: 0x40, dh: 2, v: 0x90 })
    expect(m.moveEarwig(slot, env({ frame: 1 }))).toEqual({ kind: 'moved' })
    expect(slot.h).toBe(0x42)
    expect(slot.v, 'the earwig never dives').toBe(0x90)
  })

  it('a leftward earwig adds the 0xff dh — byte wrap (EW-25)', async () => {
    const m = await loadEarwig()
    const slot = earwig({ h: 0x40, dh: 0xff })
    m.moveEarwig(slot, env({ frame: 1 }))
    expect(slot.h, '0x40 + 0xff wraps to 0x3f').toBe(0x3f)
  })

  it('H wrapping to exactly 0 is offscreen: BEEOFF frees the slot, no flap that tick (EW-26/27)', async () => {
    const m = await loadEarwig()
    const slot = earwig({ h: 0xfe, dh: 2, pic: 0x1c, pts: 0x55 })
    expect(m.moveEarwig(slot, env({ frame: 0 })), 'flap frame, but the exit comes first').toEqual({ kind: 'offscreen' })
    expect(slot.color, 'BEEOFF clears the colour').toBe(0)
    expect(slot.h, 'BEEOFF clears H').toBe(0)
    expect(slot.pts, 'BEEOFF clears PTS').toBe(0)
    expect(slot.pic, 'no flap on the exit tick — H add comes first (:729 before :740)').toBe(0x1c)
  })

  it('an H that lands non-zero is NOT offscreen — only exactly 0 exits (EW-26)', async () => {
    const m = await loadEarwig()
    const slot = earwig({ h: 0xfe, dh: 1 })
    expect(m.moveEarwig(slot, env({ frame: 1 }))).toEqual({ kind: 'moved' })
    expect(slot.h).toBe(0xff)
  })

  it('the picture flaps only every fourth frame (EW-28/29)', async () => {
    const m = await loadEarwig()
    const flap = earwig({ pic: 0x1c })
    m.moveEarwig(flap, env({ frame: 4 }))
    expect(flap.pic, 'frame & 3 === 0 flaps (EW-28)').toBe(0x1d)
    m.moveEarwig(flap, env({ frame: 8 }))
    expect(flap.pic, 'EOR 1 toggles back (EW-29)').toBe(0x1c)
    const still = earwig({ pic: 0x1c })
    m.moveEarwig(still, env({ frame: 5 }))
    expect(still.pic, 'frames 1..3 mod 4 do not flap').toBe(0x1c)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// The stamp classifier — poison and the DDT band (:749-759, EW-31..36)
// ───────────────────────────────────────────────────────────────────────────────
describe('earwig — stamp classifier', () => {
  it('a stamp inside [CLOUD, DDT) is a DDT death (EW-31/32/33)', async () => {
    const m = await loadEarwig()
    expect(m.earwigStamp(0x2e), 'CLOUD itself dies').toEqual({ kind: 'ddt-death' })
    expect(m.earwigStamp(0x6d), 'last cloud stamp dies').toEqual({ kind: 'ddt-death' })
    expect(m.earwigStamp(0x2d), 'below CLOUD is not a cloud').toEqual({ kind: 'none' })
    expect(m.earwigStamp(0x6e), 'DDT itself is the bomb, not the cloud (EW-32)').toEqual({ kind: 'none' })
  })

  it('a mushroom stamp (>= 0x7c) is poisoned: bit 2 cleared, written back (EW-34/35/36)', async () => {
    const m = await loadEarwig()
    expect(m.earwigStamp(0x7c)).toEqual({ kind: 'poison', stamp: 0x78 })
    expect(m.earwigStamp(0xff), '0xff & 0xfb').toEqual({ kind: 'poison', stamp: 0xfb })
    expect(m.earwigStamp(0x7b), 'below 0x7c is not a mushroom (EW-34)').toEqual({ kind: 'none' })
  })

  it('an already-poisoned stamp is a fixed point of the AND (EW-35)', async () => {
    const m = await loadEarwig()
    expect(m.earwigStamp(0xfb)).toEqual({ kind: 'poison', stamp: 0xfb })
  })

  it('a blank stamp is left alone', async () => {
    const m = await loadEarwig()
    expect(m.earwigStamp(0x00)).toEqual({ kind: 'none' })
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// BEEOFF and the kill (:166-171, :2134-2139, EW-27/40/41)
// ───────────────────────────────────────────────────────────────────────────────
describe('earwig — off and kill', () => {
  it('earwigOff clears pts, colour and H; V and pic stay (EW-27)', async () => {
    const m = await loadEarwig()
    const slot = earwig({ pts: 0x40, v: 0x90, pic: 0x1d })
    m.earwigOff(slot)
    expect(slot.pts).toBe(0)
    expect(slot.color).toBe(0)
    expect(slot.h).toBe(0)
    expect(slot.v, 'BEEOFF leaves V').toBe(0x90)
    expect(slot.pic, 'BEEOFF leaves the picture').toBe(0x1d)
  })

  it('a player kill scores 1000; a DDT kill 3000 (EW-40/41)', async () => {
    const m = await loadEarwig()
    expect(m.earwigKill(false)).toEqual({ points: 1000 })
    expect(m.earwigKill(true)).toEqual({ points: 3000 })
  })
})
