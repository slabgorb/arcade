// src/core/cursor.ts
//
// Story mc1-3 (GREEN, Yoda) — the trackball/mouse crosshair as PURE core data.
// The cabinet reads the trackball, adds the increment to the cursor, then clamps
// it to the play area so the crosshair can never leave the field. This module is
// that arithmetic and nothing more: a reducer (cursor, delta) → clamped cursor.
// The shell (shell/input.ts) supplies the delta; the shell (render.ts) paints it.
//
// PURE: plain arithmetic, no clock, no entropy, no browser surface, no shell
// import. The src/core purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH ─────────────────────────────────────────────────────────
//   PROCESS CURSOR MOTION   `W3MAIN:424` (UPCURS)  — read trackball, then update
//   ADD TBALL TO CURSOR     `W3MAIN:546` (ADCURS)  — add the increment
//   UPDATE CURSOR POSITION  `W3MAIN:587` (UPDCUR/DOCURS) — the clamp:
//     `CMP AX,HMIN / IFCC / LDA AX,HMIN` then `CMP AX,HMAX / IFCS / LDA AX,HMAX`,
//     bound table `HMIN: .BYTE IHMIN,IVMIN,IHMAX,IVMAX`.
// The four bounds are `W3COMN.MAC` constants (`.RADIX 16` at :1; a trailing `.`
// forces decimal): IHMIN=8 (:113), IHMAX=247. (:115), IVMIN=45. (:117),
// IVMAX=TOPSCR-16. (:119) with TOPSCR=222. (:107) → 206. The H/V axis is the
// cabinet's — V grows UPWARD from the bottom (as in core/field.ts); render.ts
// flips V for the top-left-origin canvas and shell/input.ts flips the pointer.

/** The crosshair position in cabinet coordinates (V origin at the BOTTOM). */
export interface Cursor {
  /** Horizontal cabinet coordinate, always within [HMIN, HMAX]. */
  readonly h: number
  /** Vertical cabinet coordinate (bottom-origin), always within [VMIN, VMAX]. */
  readonly v: number
}

/** A per-frame motion increment in cabinet space (up is +v). */
export interface Delta {
  readonly dh: number
  readonly dv: number
}

/** Cursor min H — `IHMIN` (`W3COMN.MAC:113`). */
export const HMIN = 8
/** Cursor max H — `IHMAX` (`W3COMN.MAC:115`, `247.`). */
export const HMAX = 247
/** Cursor min V — `IVMIN` (`W3COMN.MAC:117`, `45.`). */
export const VMIN = 45
/** Cursor max V — `IVMAX = TOPSCR-16` (`W3COMN.MAC:119`, `TOPSCR=222.` :107). */
export const VMAX = 206

/** The crosshair's start position: the centre of the play area. */
export const INITIAL_CURSOR: Cursor = { h: (HMIN + HMAX) >> 1, v: (VMIN + VMAX) >> 1 }

/** Clamp x into the inclusive range [lo, hi] (the cabinet's CMP/IFCC/IFCS pair). */
const clamp = (x: number, lo: number, hi: number): number => (x < lo ? lo : x > hi ? hi : x)

/**
 * Integrate the delta into the cursor and clamp the result to the play area.
 * Referentially transparent: returns a fresh Cursor, never mutates its input.
 */
export function moveCursor(cursor: Cursor, delta: Delta): Cursor {
  return {
    h: clamp(cursor.h + delta.dh, HMIN, HMAX),
    v: clamp(cursor.v + delta.dv, VMIN, VMAX),
  }
}
