// src/shell/stamps.ts
//
// Story mc9-1 (GREEN, Yoda) — authentic city and base STAMP GEOMETRY as pure
// shell render data. mc3-5 drew functional stand-ins (a live city = one fillRect
// block, a live base = a plain triangle) and deferred the real shapes to mc9;
// this module ports them straight from the W3DSUP stamp layer.
//
// PURE SHELL DATA: plain constants + a bit-decoder, no canvas, no clock, no core
// import. render.ts (the shell) projects and paints these; nothing here draws.
//
// ─── SOURCE OF TRUTH: W3DSUP.MAC (the framebuffer stamp layer) ────────────────
// Missile Command is a RASTER machine: structures are 8-row bitmap "stamps"
// blitted by WRITE A STAMP (W3DSUP.MAC:587) — each stamp is 8 bytes, one per
// row, MSB = leftmost pixel.
//
// A CITY is FOUR stamps in a 2x2 grid. DRAW ALL LIVING CITIES (W3DSUP.MAC:1067)
// walks the live-city bitmask and calls DACITY, whose loop draws the four
// quadrants named by the table at W3DSUP.MAC:1213-1217:
//     ;CITY STAMPS = LEFT TOP, LEFT BOTTOM, RIGHT TOP, RIGHT BOTTOM
//     CSTCOL: .BYTE 1,0,1,0        ; 1 = city TOP colour, 0 = city BOTTOM colour
//     CSTNUM: .BYTE 1E,1D,20,1F    ; stamp glyph id (into the LETTER table)
//     CSTHOF: .BYTE -4,-4,4,4      ; horizontal offset: left column -4, right +4
// The four glyph bitmaps are the `;CITY` block in the LETTER table
// (W3DSUP.MAC:3632-3638), reproduced verbatim below. All four draw at the same
// vertical (the city centre); the two-tone top/bottom colouring is per-stamp.
//
// A BASE is its ABM stockpile: up to MAXMIS=10 ready missiles stacked in a 1-2-3-4
// pyramid. DRAW MISSILE (W3DSUP.MAC:1221) places each at the base-relative offset
// pair (W3DSUP.MAC:1329-1331):
//     MISTBV: .BYTE 2,-1,-1,-4,-4,-4,-7,-7,-7,-7   ; vertical offsets (apex first)
//     MISTBH: .BYTE 0,-3,3,-6,0,6,-3,3,-9,9        ; horizontal offsets
// That pyramid — not a plain triangle — is the base's authentic silhouette, and
// it shrinks with the base's remaining ammo exactly as the cabinet's does.

/** One 8x8 city quadrant stamp: its 8 row-bitmaps, horizontal offset from the
 *  city centre, and which colour plane (city top vs bottom) it paints. */
export interface CityStamp {
  /** 8 rows, MSB = leftmost pixel (LETTER-table bytes, W3DSUP.MAC:3632-3638). */
  readonly rows: readonly number[]
  /** Horizontal offset from the city centre — CSTHOF (W3DSUP.MAC:1217). */
  readonly hOffset: number
  /** Colour plane — CSTCOL (W3DSUP.MAC:1213): 'top' = 1, 'bottom' = 0. */
  readonly layer: 'top' | 'bottom'
}

/** Every stamp is 8 pixels wide and 8 rows tall (WRITE A STAMP, W3DSUP.MAC:587). */
export const STAMP_W = 8
export const STAMP_H = 8

/**
 * The four city quadrant stamps, in the ROM's CSTNUM order
 * (LEFT TOP, LEFT BOTTOM, RIGHT TOP, RIGHT BOTTOM) — the 2x2 grid DACITY draws
 * (DRAW ALL LIVING CITIES, W3DSUP.MAC:1067; table W3DSUP.MAC:1213-1217). Bitmaps
 * are the `;CITY` LETTER-table bytes (W3DSUP.MAC:3632-3638), stamp ids 0x1D-0x20.
 */
export const CITY_STAMPS: readonly CityStamp[] = [
  // LEFT TOP    — stamp 0x1E, CSTCOL 1 (top),    CSTHOF -4
  { rows: [0x7c, 0x37, 0x25, 0x00, 0x00, 0x00, 0x00, 0x00], hOffset: -4, layer: 'top' },
  // LEFT BOTTOM — stamp 0x1D, CSTCOL 0 (bottom), CSTHOF -4
  { rows: [0x7f, 0xff, 0x7f, 0x7e, 0x34, 0x30, 0x20, 0x00], hOffset: -4, layer: 'bottom' },
  // RIGHT TOP   — stamp 0x20, CSTCOL 1 (top),    CSTHOF +4
  { rows: [0x3e, 0x6c, 0xc8, 0xc0, 0x80, 0x00, 0x00, 0x00], hOffset: 4, layer: 'top' },
  // RIGHT BOTTOM— stamp 0x1F, CSTCOL 0 (bottom), CSTHOF +4
  { rows: [0xfe, 0xff, 0xfe, 0xfe, 0xfa, 0x50, 0x10, 0x10], hOffset: 4, layer: 'bottom' },
]

/** One ready missile's offset from the base centre, in cabinet units. */
export interface MissileSlot {
  /** Horizontal offset — MISTBH (W3DSUP.MAC:1331). */
  readonly dh: number
  /** Vertical offset above the base ground line — MISTBV re-seated (see below). */
  readonly dv: number
}

// MISTBV is authored apex-first as offsets from the base's top centre (2 down to
// -7). Re-seated by +7 so the widest row (dv -7) rests on the base ground line and
// the pyramid rises above it — the bottom-origin cabinet V that render.ts flips.
const MISTBV = [2, -1, -1, -4, -4, -4, -7, -7, -7, -7] as const
const MISTBH = [0, -3, 3, -6, 0, 6, -3, 3, -9, 9] as const
const MISSILE_SEAT = 7 // = -min(MISTBV), so the base row sits at dv 0

/**
 * The ABM stockpile pyramid — MAXMIS=10 ready-missile slots (DRAW MISSILE,
 * W3DSUP.MAC:1221; offset tables W3DSUP.MAC:1329-1331). Index k is the k-th
 * missile; a base with `ammo` remaining shows the first `ammo` of these.
 */
export const MISSILE_STACK: readonly MissileSlot[] = MISTBH.map((dh, k) => ({
  dh,
  dv: MISTBV[k] + MISSILE_SEAT,
}))

/**
 * Decode a stamp's row-bitmaps into the set (lit) pixels, as {col,row} with
 * col 0 = leftmost (MSB) and row 0 = top. Pure: the caller projects each pixel
 * through render.ts's cabinet->canvas mapping and paints it.
 */
export function stampPixels(rows: readonly number[]): ReadonlyArray<{ col: number; row: number }> {
  const lit: Array<{ col: number; row: number }> = []
  for (let row = 0; row < rows.length; row++) {
    for (let col = 0; col < STAMP_W; col++) {
      if (rows[row] & (0x80 >> col)) lit.push({ col, row })
    }
  }
  return lit
}
