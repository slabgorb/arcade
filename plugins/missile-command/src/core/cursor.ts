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

import { clamp } from '@shared/clamp'

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

// The cabinet's LOGICAL field — the space shell/render.ts's `project` maps a cursor
// INTO, and that placeCursor (mc10-1) inverts back OUT of. H spans 0x100 = 256
// columns (all structures sit within 0x00..0xFF); V spans TOPSCR = 222. rows
// (W3COMN.MAC:107, decimal). Kept in core as a cabinet fact so the pure inverse
// never imports the shell; render.ts holds its own LOGICAL_WIDTH/HEIGHT for the
// forward map and the two must agree (place-cursor.test.ts anchors that they do).
/** Logical field width. H is a full 8-bit cabinet byte — every H constant above
 *  and the structure positions (MISB1H=0x14..MISB3H=0xF0) live in 0x00..0xFF — so
 *  the field spans 0x100 = 256 columns. STRUCTURAL (2^8, the byte-space size), not
 *  a ROM table entry: unlike LOGICAL_HEIGHT it names no W3COMN line because none
 *  exists. Matches render.ts LOGICAL_WIDTH. */
export const LOGICAL_WIDTH = 0x100 // 256
/** Logical field height — TOPSCR=222. (W3COMN.MAC:107; matches render.ts LOGICAL_HEIGHT). */
export const LOGICAL_HEIGHT = 222

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

/**
 * Place the crosshair ABSOLUTELY at a canvas pixel — the inverse of
 * shell/render.ts's `project(pos, width, height)`. Given a pointer at (x, y) over
 * a (width, height) canvas, map it back to the cabinet cursor and clamp to the
 * play area:
 *   h = (x / width)  * LOGICAL_WIDTH   → [HMIN, HMAX]
 *   v = LOGICAL_HEIGHT - (y / height) * LOGICAL_HEIGHT   → [VMIN, VMAX]
 * The `LOGICAL_HEIGHT -` term is the V-flip: canvas y grows DOWNWARD while cabinet
 * v grows UPWARD (project applies the same flip forward). Unlike moveCursor this is
 * ABSOLUTE — the crosshair goes where the pointer is, with no dependence on its
 * previous position — which is the mc10-1 fix for the twitchy relative aim (no
 * pointer lock, 1px≈1unit). Referentially transparent: a fresh Cursor, no mutation.
 */
export function placeCursor(x: number, y: number, width: number, height: number): Cursor {
  // Guard the divisor: a degenerate canvas (width/height 0 — a hidden or not-yet-
  // laid-out element) would make x/width Infinity or, for 0/0, NaN. With no area to
  // map into, the fraction is 0, parking the crosshair at the low edge. (The shared
  // clamp is NaN-guarded and would itself floor a NaN ratio to HMIN/VMIN, but
  // guarding the divisor here keeps the ratio finite and the intent explicit rather
  // than leaning on clamp's NaN policy.) The result is always finite and in range
  // [HMIN,HMAX]x[VMIN,VMAX].
  const fx = width > 0 ? x / width : 0
  const fy = height > 0 ? y / height : 0
  return {
    h: clamp(fx * LOGICAL_WIDTH, HMIN, HMAX),
    v: clamp(LOGICAL_HEIGHT - fy * LOGICAL_HEIGHT, VMIN, VMAX),
  }
}
