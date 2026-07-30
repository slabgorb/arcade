// src/core/playfield.ts
//
// Story cp1-4 (GREEN, Julia) — the 30x32 PLYFLD grid + mushroom model: initial
// seeding (INIT "PUT UP OBSTACLES"), per-shot damage decrement, and the RESTOR
// repair sweep, transcribed from rev-4 CENTI4.MAC/CENDE4.MAC. Every constant
// below is cited in docs/rom-study/claims/06-playfield-mushrooms.json (PM-*),
// byte-verified by tools/audit/check-citations.mjs.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// CENTI4.MAC/CENDE4.MAC inherit .RADIX 16 (hex) from CENDE4 — every literal
// below is hex UNLESS a trailing period marks it decimal (SEED_COUNT: `45.`
// is decimal 45, see PM-6).
//
// ─── ADDRESSING ─────────────────────────────────────────────────────────────
// A ROM playfield address `addr` in [PLYFLD_BASE, PLYFLD_END] decomposes as
// v = addr & 0x1F (vertical index, 0-31, the low 5 bits / PLYFLD_STRIDE) and
// h = (addr - PLYFLD_BASE) >> 5 (horizontal index, 0-29). This module's flat
// `cells` array drops the base and indexes by offset = h*PLYFLD_STRIDE + v
// (PM-1 corroboration).
//
// ─── ROM FACT vs ADAPTER POLICY (PM-7) ─────────────────────────────────────
// Seeding's column walk (v) is a ROM fact: deterministic, CENTI4.MAC:1220/
// 1253/1255 (PM-5/12/13). WHICH horizontal cell (h) a mushroom lands on is
// read from RNGEN, the POKEY hardware RNG (CENTI4.MAC:1223, PM-7) — real
// hardware entropy this sim replaces with the seeded @shared/rng
// (mulberry32), the ONLY source of randomness in this module. RNGEN is an
// 8-bit read; h consumes 5 bits of it (0-31), which can overshoot the 30-wide
// grid (h=30/31 lands in motion-object RAM on real hardware). This grid-only
// model treats an overshoot as a no-op: no cell write, no MUSH increment —
// the faithful reduction for a sim with no motion-object RAM to corrupt.

import { nextInt, type Rng } from '@shared/rng'

// ─── geometry (CENDE4.MAC:61, PM-1) ────────────────────────────────────────
export const PLYFLD_BASE = 0x400
export const PLYFLD_WIDTH = 30
export const PLYFLD_HEIGHT = 32
export const PLYFLD_END = 0x7bf
export const PLYFLD_STRIDE = 0x20

// ─── mushroom picture codes (CENTI4.MAC:2151-2168, PM-15/16/17/18/19) ──────
export const MUSHROOM_FULL = 0x3f
export const MUSHROOM_MIN = 0x38
export const NORMAL_DESTROY = 0x3b
export const POISON_DESTROY = 0x37
export const MUSHROOM_HP = 4

// ─── seeding (CENTI4.MAC:1220-1259, PM-5/6/8/12) ───────────────────────────
export const SEED_COUNT = 46 // LDX I,45. is DECIMAL 45 + DEX/BPL => 46 attempts (PM-6/14)
export const SEED_COLUMN_START = 0x1b
export const SEED_COLUMN_MIN = 0x02
export const MUSH_LOWER_BOUND = 0x0c

// The RNG's per-attempt horizontal draw: RNGEN supplies 5 bits for h (PM-7),
// so the adapter draws from the same 0-31 range. This is adapter policy, not
// a PLYFLD dimension — deliberately NOT the same constant as PLYFLD_WIDTH/
// PLYFLD_HEIGHT, even though it numerically matches the latter.
const SEED_ROW_DRAW = 32

// ─── scoring — BCD, hex == decimal (CENTI4.MAC:2161/1856/1951, PM-20/26/31) ─
export const SCORE_DESTROY = 1
export const SCORE_RESTORE = 5

// ─── RESTOR repair sweep (CENTI4.MAC:995-997/1826-1857, PM-22/23) ──────────
export const RESTOR_FRAME_MASK = 0x07 // AND I,07 => active every 8 frames (comment says 16 -- wrong, PM-23)
export const RESTOR_START = 0x400 // MEM armed to PLYFLD base at player death (PM-22)
export const RESTOR_END = 0x7c0 // CT-61 (:1841-1842): the sweep disarms once MEM reaches PLYFLD_END+1

export interface Playfield {
  /** 30*32 = 960 cells; offset = h*PLYFLD_STRIDE + v. 0 = empty, 0x38-0x3F = mushroom. */
  cells: Uint8Array
  /** Count of mushrooms on the lower screen (v < MUSH_LOWER_BOUND) — the ROM's MUSH cell (PM-2). */
  mush: number
}

export function createPlayfield(): Playfield {
  return { cells: new Uint8Array(PLYFLD_WIDTH * PLYFLD_HEIGHT), mush: 0 }
}

/** (cell & 0x3F) >= MUSHROOM_MIN — the mask-then-compare CENTI4.MAC:2151/2152 performs (PM-15/16). */
export function isMushroom(cell: number): boolean {
  return (cell & 0x3f) >= MUSHROOM_MIN
}

/**
 * A shot's decrement (CENTI4.MAC:2154, PM-17): the picture code drops by 1.
 * Reaching NORMAL_DESTROY (0x3B, from a normal mushroom) or POISON_DESTROY
 * (0x37, from a poisoned one) destroys the cell and scores 1 point
 * (PM-18/19/20); any other decrement scores nothing and leaves the cell
 * partially damaged.
 */
export function damageMushroom(cell: number): { cell: number; scored: number; destroyed: boolean } {
  const decremented = cell - 1
  if (decremented === NORMAL_DESTROY || decremented === POISON_DESTROY) {
    return { cell: 0, scored: SCORE_DESTROY, destroyed: true }
  }
  return { cell: decremented, scored: 0, destroyed: false }
}

/**
 * The RESTOR sweep's per-cell repair (CENTI4.MAC:1850-1857, PM-25/26): a
 * partial/poisoned mushroom (0x38-0x3E) restores to full (0x3F) and scores 5
 * points; a full mushroom or a non-mushroom cell is untouched (0 points).
 */
export function restoreMushroom(cell: number): { cell: number; scored: number } {
  if (cell >= MUSHROOM_MIN && cell < MUSHROOM_FULL) {
    return { cell: MUSHROOM_FULL, scored: SCORE_RESTORE }
  }
  return { cell, scored: 0 }
}

// ─── OBSTAC — the shared obstacle probe (CENTI4.MAC:1689-1733), transcribed
// ONCE for both its consumers: MOTION (the centipede, story cp2-3, dir=±speed)
// and MOVE/SHOOT (the gun/shot, dir=0 — cp1-5's obstacleCell(h,v) is now this
// routine's dir=0 special case, see src/core/player.ts). Cited by CT-27/28/29
// in docs/rom-study/claims/09-centipede-train.json; == cp1-5's PS-16/17/18.
export const OBSTAC_H_BASE = 0xf7 // column reversal base (CT-29, :1715 "LDA I,0F7")
export const OBSTAC_CELL_PX = 8 // cell size: the 8*direction probe step (CT-28, :1711 "ASL ;8*DIRECTION")
export const OBSTAC_ROW_ROUND = OBSTAC_CELL_PX / 2 // round-to-nearest row, +4 (CT-29, PS-16 ADC I,0)

/**
 * OBSTAC's cell mapping (CT-27/28/29): the grid cell a motion object at pixel
 * (h,v) travelling in `dir` (signed MOBJDH; the gun/shot pass dir=0 to probe
 * in place) would enter. H' = h + 8*dir (CT-28) is reversed about 0xF7 and
 * floored to 8px for the column (CT-29); the row rounds to the nearest cell.
 */
export function obstacleCellFor(h: number, v: number, dir: number): { h: number; v: number } {
  const hPrime = h + OBSTAC_CELL_PX * dir
  return {
    h: ((OBSTAC_H_BASE - hPrime) & 0xf8) >> 3,
    v: (v + OBSTAC_ROW_ROUND) >> 3,
  }
}

/**
 * The playfield cell CODE at the OBSTAC cell for (h,v,dir) — the ONE field
 * probe both MOTION and MOVE/SHOOT consume (CT-27 EXIT (A)=stamp code). A
 * cell outside the grid (an extreme `dir` overshooting the 30-wide board) is
 * a no-obstacle (0), never an out-of-range array read.
 */
export function obstacleCode(field: Playfield, h: number, v: number, dir: number): number {
  const cell = obstacleCellFor(h, v, dir)
  if (cell.h < 0 || cell.h >= PLYFLD_WIDTH || cell.v < 0 || cell.v >= PLYFLD_HEIGHT) return 0
  return field.cells[cell.h * PLYFLD_STRIDE + cell.v]
}

/**
 * INIT "PUT UP OBSTACLES" (CENTI4.MAC:1220-1259): SEED_COUNT (46) placement
 * attempts. The vertical index (v) walks deterministically from
 * SEED_COLUMN_START (0x1B) down to SEED_COLUMN_MIN (0x02), wrapping back to
 * SEED_COLUMN_START (PM-5/12/13) — this never reaches the reserved rows
 * v=0/1 (bottom) or v=0x1F (top score row). The horizontal index (h) is
 * read from the RNG (PM-7, adapter policy — see module header); an overshoot
 * (h >= PLYFLD_WIDTH) is a no-op, same as landing on an already-occupied
 * cell. Every placed mushroom is full (0x3F, PM-10) and, if on the lower
 * screen (v < MUSH_LOWER_BOUND), bumps `mush` (PM-8/9).
 */
/**
 * RESTOR (CENTI4.MAC:1826-1888, story cp2-5): one frame of the death-pause
 * mushroom-repair sweep. Inactive unless `frame&RESTOR_FRAME_MASK==0` (CT-56
 * — active every 8 frames, the stale ";EVERY 16 FRAMES" comment loses). On an
 * active frame it walks the field in ROM ADDRESS order from `mem` (an
 * absolute address in [RESTOR_START, RESTOR_END); index = mem-RESTOR_START)
 * forward to the next damaged mushroom (restoreMushroom's 0x38-0x3E band,
 * CT-58), restores it in place (+SCORE_RESTORE, CT-59), and returns the
 * cursor advanced PAST that cell (CT-60) — exactly one restore per active
 * pass. With nothing left to repair before RESTOR_END it returns
 * mem=RESTOR_END (the disarmed sentinel, CT-61).
 */
export function stepRestor(field: Playfield, mem: number, frame: number): { mem: number; scored: number } {
  if ((frame & RESTOR_FRAME_MASK) !== 0) return { mem, scored: 0 } // CT-56

  let cursor = mem
  while (cursor < RESTOR_END) {
    const offset = cursor - RESTOR_START
    const result = restoreMushroom(field.cells[offset]) // CT-58/59
    if (result.scored > 0) {
      field.cells[offset] = result.cell
      return { mem: cursor + 1, scored: result.scored } // CT-60
    }
    cursor += 1
  }
  return { mem: RESTOR_END, scored: 0 } // CT-61
}

export function seedPlayfield(rng: Rng): Playfield {
  const field = createPlayfield()
  let v = SEED_COLUMN_START
  for (let attempt = 0; attempt < SEED_COUNT; attempt++) {
    const h = nextInt(rng, SEED_ROW_DRAW)
    if (h < PLYFLD_WIDTH) {
      const offset = h * PLYFLD_STRIDE + v
      if (field.cells[offset] === 0 && v < MUSH_LOWER_BOUND) field.mush++
      field.cells[offset] = MUSHROOM_FULL
    }
    v -= 1
    if (v < SEED_COLUMN_MIN) v = SEED_COLUMN_START
  }
  return field
}
