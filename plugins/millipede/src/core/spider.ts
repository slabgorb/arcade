// src/core/spider.ts
//
// Story ml4-1 (GREEN) — THE SPIDER: `SPDMV — MOVE SPIDER` (MILLI.MAC:2295,
// SD-1), ported line-by-line as a pure reducer. Millipede scans spiders in
// motion-object slots 6..13 (SD-7/8): slot 13 is reserved for spiders
// (SD-12), slot 12 opens with score (SD-13/15), and — story ml4-5, the
// FIRST-WAVE EXTRA-SPIDER feature (SD-52..61) — the centipede entries 6..11
// open one by one above 100,000 on a full first wave (CENTIN=0C, segments
// alive). The spider zig-zags on its COUNT2 countdown, eats every
// stamp from ROCK up (SD-37), bounces between the bottom row and a
// score-driven ceiling (SD-38..43), and scores by PROXIMITY when killed
// (SD-46..51). Every constant carries an SD-* claim in
// docs/rom-study/claims/09-beetle-spider.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16`: ROM literals quoted here are hex; a
// trailing period in the source (`13.`, `14.`, `11.*16.`) marks DECIMAL.
//
// ─── ORIENTATION (upright — the ml3-4 scope precedent) ──────────────────────
// CKIND/CKF8 are modelled clear: no cocktail V-reversal (MILLI.MAC:2377-2381)
// and every `EOR CKF8` is identity. V DECREASES downward: V<9 is the bottom
// row (SD-38) and the ceiling descends from V=60 as the score grows (SD-43).
//
// ─── THE INVERTED STEP ──────────────────────────────────────────────────────
// SPDMV SUBTRACTS both direction bytes (`SEC / SBC`, MILLI.MAC:2437-2451,
// SD-30) where the beetle ADDS — a positive dv moves the spider DOWN. The
// step stays local to this module for exactly that reason (the centipede
// spider carries the same trap and the same ruling).
//
// ─── BYTE SEMANTICS ─────────────────────────────────────────────────────────
// Every field is a byte 0..255; -1 is 0xFF. Slot records are mutated in place
// (the conway.ts house style); functions are deterministic — randomness comes
// in as the POKEY RND0 byte on the env.

// ─── slot roster (MILLI.MAC:2303/2314/2350, SD-7/8/12) ──────────────────────
export const SPIDER_SLOT_FIRST = 6
export const SPIDER_SLOT_END = 14
export const SPIDER_SLOT_RESERVED = 13
/** NCENT (MLDEF.MAC:188, SD-52) — slots 0..11 are centipede entries. */
export const NCENT = 12

// ─── spawn writes (MILLI.MAC:2367-2400, SD-20..25) ──────────────────────────
export const SPIDER_PIC = 0x14 // SPDP (:2397, SD-24)
export const SPIDER_COLOR = 0xb9 // SPDC on-colour (:2399, SD-25)
export const SPIDER_ENTER_V = 0x60 // (:2390, SD-21)
export const SPIDER_OFF_DELAY = 0x60 // SPDOFF re-arm (:2530, SD-32)

// ─── difficulty + scoring (SD-2/3, SD-46..51) ───────────────────────────────
export const DIP_SPIDER_HARD = 0x40 // OPTNS1 D6 (MLDEF.MAC:91; MILLI.MAC:2424)
export const PTS_ENTRIES = 16 // the PTS stamp array (MLDEF.MAC:398, SD-5)
/** 98$ (MILLI.MAC:2209, SD-50) — picture codes for the kill-score stamp, index Y 0..4. */
export const SPIDER_SCORE_STAMPS: readonly number[] = [0x32, 0x30, 0x2d, 0x2a, 0x33]
/** 99$ (MILLI.MAC:2210, SD-51) — BCD hundreds 12,9,6,3,18 as decimal points. */
export const SPIDER_SCORE_VALUES: readonly number[] = [1200, 900, 600, 300, 1800]

// ─── playfield stamp bands the obstacle reaction reads ──────────────────────
// (module-local copies, like the beetle's — one standalone subsystem per file)
const CLOUD = 0x2e // MLDEF.MAC:202
const DDT = 0x6e // MLDEF.MAC:203
const ROCK = 0x70 // MLDEF.MAC:204
const BACKGROUND_BIT = 0x80

export interface SpiderSlot {
  /** SPDC — 0 means the slot is free. */
  color: number
  /** SPDP */
  pic: number
  /** SPDV */
  v: number
  /** SPDH */
  h: number
  /** SPDDV */
  dv: number
  /** SPDDH */
  dh: number
  /** OLDDH — the parked diagonal restored on the next zig (MILLI.MAC:2417/2421). */
  oldDh: number
  /** COUNT2 — spawn countdown on a free slot, zig-zag countdown on a live one. */
  count2: number
  /** PTS — the kill-score stamp for this slot (MLDEF.MAC:398, SD-5/33). */
  pts: number
}

export interface SpiderEnv {
  /** FRAME byte. */
  frame: number
  /** SCORE1 — the BCD hundreds/thousands byte (SD-18). */
  score1: number
  /** SCORE2 — the BCD ten-thousands byte. */
  score2: number
  /** CENTIN (SD-15). */
  centin: number
  /** DEAD — remaining centipede segments (MLDEF.MAC:295, SD-53); 0 = all dead. */
  dead: number
  /** The PLAYP/PEXPLD gate (MILLI.MAC:2299-2302, SD-6). */
  playerAlive: boolean
  /** OPTNS1 & DIP_SPIDER_HARD — the D6 difficulty (SD-3). */
  hard: boolean
  /** POKEY RND0 byte. */
  rnd0: number
}

export type SpiderObstacle = { kind: 'die' } | { kind: 'eat'; cell: number } | { kind: 'none' }

/** Two's complement of a byte (the ROM's COMP). */
function comp(b: number): number {
  return (0x100 - b) & 0xff
}

/** The scan's spider test: a live slot in the band [14,1C) (MILLI.MAC:2304-2310, SD-9/10). */
export function isSpider(slot: Readonly<SpiderSlot>): boolean {
  return slot.color !== 0 && slot.pic >= SPIDER_PIC && slot.pic < 0x1c
}

/**
 * The speed gate (MILLI.MAC:2367-2375, SD-16..19): fast (2) from 10,000, or
 * from 5,000 on HARD (SCORE1 ≥ BCD 50); slow (1) before.
 */
export function spiderSpeed(env: Readonly<SpiderEnv>): number {
  if (env.score2 !== 0) return 2 // :2367-2369 (SD-16)
  if (env.hard && env.score1 >= 0x50) return 2 // :2371-2374 (SD-18)
  return 1 // :2375 (SD-19)
}

/**
 * The first-wave extra-spider gate (MILLI.MAC:2321-2345, SD-54..61) — story
 * ml4-5. A free slot below NCENT is a centipede entry (SD-54): it opens only
 * while segments remain (DEAD ≠ 0, SD-55), on a FULL first wave (CENTIN == 0C
 * exactly, SD-56), at 100,000 up (SCORE2 ≥ 10 binary — the SBC borrow,
 * SD-57). The allowance is min((SCORE2-10) >> 1, 5) + 3 (SD-58/59) and
 * NCENT+1-allowance is the last index the centipede KEEPS (SD-60) — only
 * indexes above it open (BCS refuses at or below, SD-61). Slots at NCENT and
 * up go straight to the countdown.
 */
export function extraSpiderOpen(index: number, env: Readonly<SpiderEnv>): boolean {
  if (index >= NCENT) return true // :2321-2322 (SD-54)
  if (env.dead === 0) return false // :2323-2325 (SD-55)
  if (env.centin !== 0x0c) return false // :2326-2328 (SD-56)
  if (env.score2 < 0x10) return false // :2329-2332 (SD-57)
  let a = ((env.score2 - 0x10) & 0xff) >> 1 // :2333 (SD-58)
  if (a >= 0x08) a = 5 // :2334-2336 (SD-58) — the 200,000 clamp
  const allowance = a + 3 // :2337-2339 (SD-59)
  return NCENT + 1 - allowance < index // :2340-2344 (SD-60/61)
}

/**
 * The start gates for a slot whose countdown just expired
 * (MILLI.MAC:2348-2363): slot 13 always may (SD-12); others wait for 30,000
 * (SD-13) and the (B0 - SCORE2) >> 4 < CENTIN allowance (SD-14/15).
 */
export function mayStartSpider(index: number, env: Readonly<SpiderEnv>): boolean {
  if (index === SPIDER_SLOT_RESERVED) return true // :2350-2351 (SD-12)
  if (env.score2 < 0x03) return false // :2352-2354 (SD-13)
  return ((0xb0 - env.score2) & 0xff) >> 4 < env.centin // :2355-2363 (SD-14/15)
}

/** The spawn writes (MILLI.MAC:2367-2400). SPDH is NOT written — the first subtract step brings the spider on. */
export function startSpider(slot: SpiderSlot, env: Readonly<SpiderEnv>): void {
  const speed = spiderSpeed(env)
  slot.dv = speed // :2382 (upright — no cocktail reversal)
  slot.dh = (env.rnd0 & 0x04) !== 0 ? comp(speed) : speed // :2383-2389 (SD-20)
  slot.v = SPIDER_ENTER_V // :2390-2392 (SD-21)
  slot.count2 = (env.rnd0 & 0x2c) | 0x0c // :2393-2396 (SD-22/23)
  slot.pic = SPIDER_PIC // :2397-2398 (SD-24)
  slot.color = SPIDER_COLOR // :2399-2400 (SD-25)
}

/**
 * The empty-slot path (MILLI.MAC:2318-2363): a centipede entry must pass
 * extraSpiderOpen FIRST — a closed gate takes the 11$ path and never reaches
 * the DEC (SD-54..61). Then decrement the countdown — WRAPPING, so a failed
 * gate at zero re-arms a 256-frame wait (SD-11) — and start through the
 * gates at zero.
 */
export function trySpawnSpider(slot: SpiderSlot, index: number, env: Readonly<SpiderEnv>): boolean {
  if (!env.playerAlive) return false // :2299-2302 (SD-6) — no countdown either
  if (slot.color !== 0) return false // occupied — the scan moves it instead
  if (index >= SPIDER_SLOT_END) return false // :2314 — outside the scan
  if (!extraSpiderOpen(index, env)) return false // :2321-2345 (SD-54..61)
  slot.count2 = (slot.count2 - 1) & 0xff // :2346-2347 (SD-11)
  if (slot.count2 !== 0) return false
  if (!mayStartSpider(index, env)) return false // COUNT2 sits at 0 and wraps next call
  startSpider(slot, env)
  return true
}

/** SPDOFF (MILLI.MAC:2526-2532): clear PTS/SPDC/SPDH, re-arm the spawn delay (SD-31/32/33). */
export function spiderOff(slot: SpiderSlot): void {
  slot.pts = 0
  slot.color = 0
  slot.h = 0
  slot.count2 = SPIDER_OFF_DELAY
}

/**
 * SPDMV1 (MILLI.MAC:2534-2549): a slow spider (odd |dv|) animates only on
 * even frames (SD-44); the picture walks ±1 by the dv sign inside the
 * up/down band — ((pic ± 1) AND 3) OR 14 (SD-45).
 */
function spdmv1(slot: SpiderSlot, frame: number): void {
  const absDv = (slot.dv & 0x80) !== 0 ? comp(slot.dv) : slot.dv
  if (((absDv & 1) & frame) !== 0) return // :2534-2538 (SD-44)
  const delta = (slot.dv & 0x80) === 0 ? 1 : -1 // :2539-2543 — sign of dv
  slot.pic = ((slot.pic + delta) & 3) | SPIDER_PIC // :2544-2548 (SD-45)
}

/**
 * The score-driven ceiling (MILLI.MAC:2479-2503, SD-39..43): a BCD subtract
 * of 6 from SCORE2 (minus → 0), halved binary, clamped 5 under 180,000 and 6
 * after; the ceiling is 60 - 8*step. Goes minus again at 860,000+ — the
 * spider ranges high once more (the ROM's own wraparound).
 */
export function spiderTopLimit(score2: number): number {
  // SED SEC SBC I,6 (:2483-2486)
  let lo = (score2 & 0x0f) - 6
  let hi = score2 >> 4
  if (lo < 0) {
    lo += 10
    hi -= 1
  }
  if (hi < 0) hi += 10
  let a = ((hi << 4) | lo) & 0xff
  if ((a & 0x80) !== 0) a = 0 // :2487-2488 — minus uses the minimum
  a >>= 1 // :2489 — binary LSR of the BCD byte
  if (a >= 5) a = a < 9 ? 5 : 6 // :2490-2495 (SD-40/41/42)
  return (0x60 - (a << 3)) & 0xff // :2496-2503 (SD-43)
}

/**
 * One SPDMV sweep for ONE live spider (MILLI.MAC:2401-2524): SPDMV1
 * animation, COUNT2 zig-zag, the SUBTRACT steps (SD-30), SPDOFF at h==0
 * (SD-31), bottom/ceiling bounce (SD-38..43). The OBSTAC lookup (ml3-3),
 * OVRLAP (ml3-1) and PLAY (ml3-2) seams stay with the caller — apply
 * spiderObstacle to the cell at the new position.
 */
export function moveSpider(slot: SpiderSlot, env: Readonly<SpiderEnv>): { offscreen: boolean } {
  if (!env.playerAlive) return { offscreen: false } // :2299-2302 (SD-6)
  if (!isSpider(slot)) return { offscreen: false } // :2304-2310 (SD-9/10)
  spdmv1(slot, env.frame) // :2401
  // :2406-2436 — the zig-zag on COUNT2 expiry
  slot.count2 = (slot.count2 - 1) & 0xff
  if (slot.count2 === 0) {
    const mask = env.hard ? 0x30 : 0x20 // :2423-2428 (SD-28)
    if ((env.rnd0 & 0x80) === 0) {
      // :2408-2409 — bit 7 set keeps the current dh
      if (slot.dh !== 0) {
        // :2410-2419 — park the diagonal unless at a screen edge (SD-26/27)
        if (!(slot.h >= 0xfb || slot.h < 0x05)) {
          slot.oldDh = slot.dh
          slot.dh = 0
        }
      } else {
        slot.dh = slot.oldDh // :2421-2422 — back on the diagonal
      }
    }
    if ((mask & env.rnd0) !== 0) slot.dv = comp(slot.dv) // :2429-2433
    slot.count2 = mask ^ 0x10 // :2434-2436 (SD-29)
  }
  // :2437-2444 (SD-30/31) — the subtract step; h==0 is off the screen
  slot.h = (slot.h - slot.dh) & 0xff
  if (slot.h === 0) {
    spiderOff(slot)
    return { offscreen: true }
  }
  slot.v = (slot.v - slot.dv) & 0xff // :2448-2451
  // :2470-2519 — the bounce (OVRLAP seam skipped)
  if (slot.v < 0x09) {
    // :2470-2477 (SD-38) — at the bottom a downward dv (bit 7 clear) reverses
    if ((slot.dv & 0x80) === 0) slot.dv = comp(slot.dv)
  } else {
    // :2479-2514 — above the ceiling a climbing dv (bit 7 set) reverses
    if (spiderTopLimit(env.score2) < slot.v && (slot.dv & 0x80) !== 0) slot.dv = comp(slot.dv)
  }
  return { offscreen: false }
}

/**
 * The pure reaction to an obstacle cell (MILLI.MAC:2452-2468). Takes the RAW
 * field byte (OBSTAC masks its return AND 7F, MLSUB.MAC:888, BT-46): below
 * CLOUD ignored (SD-34), a cloud kills (SD-35), the DDT bomb survives
 * (SD-36), ROCK and above is eaten down to its background bit (SD-37).
 */
export function spiderObstacle(cell: number): SpiderObstacle {
  const code = cell & 0x7f
  if (code < CLOUD) return { kind: 'none' } // :2454-2456 (SD-34)
  if (code < DDT) return { kind: 'die' } // :2457-2460 (SD-35)
  if (code < ROCK) return { kind: 'none' } // :2462-2463 (SD-36)
  return { kind: 'eat', cell: cell & BACKGROUND_BIT } // :2464-2468 (SD-37)
}

/**
 * The proximity kill (MILLI.MAC:2182-2210): |SPDV - PLAYV| as a signed-byte
 * ABS picks the score band — ≥38 pays 300, ≥16 pays 600, ≥0B pays 900,
 * closer pays 1200; DDT pays 1800 (SD-46..49). Returns the points and the
 * 98$ stamp code the caller writes to the slot's PTS (SD-50/51).
 */
export function spiderKill(
  spdV: number,
  playV: number,
  byDdt: boolean,
): { points: number; stamp: number } {
  let d = (spdV - playV) & 0xff // :2182-2184
  if ((d & 0x80) !== 0) d = comp(d) // JSR ABS (:2185)
  let y: number
  if (d >= 0x38) y = 3 // :2186-2188 (SD-46)
  else if (d >= 0x16) y = 2 // :2189-2191 (SD-47)
  else if (d >= 0x0b) y = 1 // :2192-2194 (SD-48)
  else y = 0 // :2195
  if (byDdt) y = 4 // :2200-2202 (SD-49)
  return { points: SPIDER_SCORE_VALUES[y], stamp: SPIDER_SCORE_STAMPS[y] } // :2203-2210
}
