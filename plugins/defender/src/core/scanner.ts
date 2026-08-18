// src/core/scanner.ts
//
// Story df5-1 (GREEN) — the scanner (radar) core: a PURE port of the ROM's SCNR
// world→radar projection, reading the df3 world.ts model. Decision A (RULED): the
// scanner ports SCNR's projection, it is NOT a re-derived "world width / radar width"
// minimap — a tidier minimap silently misplaces the wrap seam and the off-camera
// attackers the player relies on the radar to see. The src/core purity sweep
// (tests/purity.test.ts) scans this file; it reads no clock, mints no entropy, reaches
// no browser surface.
//
// ─── THE ROM, INSTRUCTION BY INSTRUCTION (reference/original-source/defender) ──────
// SCNR (AMODE1.SRC:1180, banner *SCANNER :1178). Scanner-left XTEMP (:1197-1199):
//     MT1  LDD  BGL              ; the camera (df3 world.ts `camera`/BGL)
//          SUBD #$8000-(150*32)  ; XTEMP = BGL − ($8000−150*32) = BGL − $6D40   (:1198)
//          STD  XTEMP
// The blip loop, once per live object — SCNR10 (:1260-1271):
//     SCNR10 LDD  OX16,X   ; D = object's ABSOLUTE 16-bit world X (OX16)          (:1260)
//            SUBD XTEMP    ; D = (OX16 − XTEMP), a 16-BIT subtract → wraps $10000  (:1261)
//     SCNR2  LSRA / LSRA   ; A (hi byte) >> 2 → column = (D >> 8) >> 2 = D >> 10   (:1262-1263)
//            LDB  OY16,X   ; B = object Y                                          (:1264)
//            LSRB×3        ; row = OY16 >> 3                                       (:1265-1267)
//            ADDD #SCANER-1; combine into the scanner SCREEN address (base = shell's df7)
//            LDD  OBJCOL,X ; the blip's colour — a PALETTE INDEX, never a hex byte (:1270)
// The 64-wide strip is CMPA #(SCANER!>8)+64 (:1223). Each constant re-opens under the
// df1-1 citation gate: docs/rom-study/claims/15-scanner.json.
//
// The screen-address base (SCANER-1, column-major addressing), the bezel (:1225-1233),
// the player blip (:1242-1257) and the mini-terrain line (MTERR) are the SHELL's df7/HUD
// concern — this pure core returns radar-space {x, y, colour} only.

import { wrap16 } from './world.js'

/** The radar strip is 64 columns wide — CMPA #(SCANER!>8)+64 (AMODE1.SRC:1223). */
export const SCANNER_COLUMNS = 64

/**
 * XTEMP's scanner-left offset: BGL − ($8000 − 150*32) = BGL − $6D40
 * (AMODE1.SRC:1198). The scanner-left world-X, from which every blip is measured.
 */
export const SCANNER_LEFT_OFFSET = 0x8000 - 150 * 32

/**
 * Column shift: LSRA×2 on the difference's HIGH byte compresses the 16-bit
 * camera-relative position to a 6-bit column — (D >> 8) >> 2 === D >> 10
 * (AMODE1.SRC:1262-1263).
 */
export const SCANNER_X_SHIFT = 10

/** Row shift: LSRB×3 compresses the object Y to the radar row (AMODE1.SRC:1265-1267). */
export const SCANNER_Y_SHIFT = 3

/**
 * The $10000 horizontal cylinder is df3 world.ts's model (wrap16), reused — NOT a
 * second geometry (Decision A). Exposed for callers that reason about the wrap.
 */
export const WORLD_WRAP = 0x10000

/** One live object as the scanner reads it: absolute world X (OX16), Y, palette index. */
export interface ScannerObject {
  /** OX16 — the object's ABSOLUTE 16-bit world X. */
  readonly worldX: number
  /** The object's world Y (YMIN..YMAX). */
  readonly y: number
  /** OBJCOL — a df2 palette INDEX (0..15), never a hex colour. */
  readonly colour: number
}

/** A radar blip: a strip column 0..63, a row, and the object's palette index. */
export interface Blip {
  /** Radar column 0..63. */
  readonly x: number
  /** Radar row (y >> 3). */
  readonly y: number
  /** The object's palette index, passed straight through (OBJCOL). */
  readonly colour: number
}

/**
 * SCNR (AMODE1.SRC:1180): project every live object onto the radar strip. Pure — a
 * function of the object snapshot and the camera (BGL) only. The 16-bit subtract is
 * modular in the $10000 world cylinder (df3 world.ts), which is exactly the wrap seam:
 * an object just past the wrap plots on the correct side of the strip, and an
 * off-camera attacker still appears at its true radar column.
 */
export function projectScanner(objects: readonly ScannerObject[], camera: number): Blip[] {
  const scannerLeft = wrap16(camera - SCANNER_LEFT_OFFSET) // XTEMP (AMODE1.SRC:1197-1199)
  return objects.map((o) => ({
    x: wrap16(o.worldX - scannerLeft) >> SCANNER_X_SHIFT, // SCNR10 (:1260-1263)
    y: o.y >> SCANNER_Y_SHIFT, // LDB OY16 / LSRB×3 (:1264-1267)
    colour: o.colour, // LDD OBJCOL,X (:1270)
  }))
}
