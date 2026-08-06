// src/shell/input.ts
//
// Story mc1-3 (GREEN, Yoda) — the shell input adapter. Turns mouse/trackball
// motion into the per-frame cursor delta and drives the crosshair through the
// core reducer, so the clamp lives in core/cursor.ts and this shell only adapts
// coordinate spaces. Desktop-only (repo rule: no touch/narrow-viewport). The
// three fire keys (Z/X/C) are mc1-4's ABM launch, not this story.
//
// ─── THE V-FLIP (the one adaptation this seam owns) ──────────────────────────
// The pointer is top-left origin: movementY > 0 means the pointer moved DOWN the
// screen. The cabinet cursor V is bottom-origin (render.ts flips V to paint it),
// so moving the pointer UP (movementY < 0) must move the crosshair UP the field
// (v increases). Hence dv = -movementY (and dh = movementX), handed straight to
// the core clamp — the literal reading of "feed the motion as the delta".

import { moveCursor, type Cursor } from '../core/cursor.js'

/**
 * Map a screen-space pointer movement (a PointerEvent's movementX/movementY,
 * top-left origin) to the next crosshair position: dh = movementX, dv =
 * -movementY (the V-flip), fed through core/cursor.moveCursor so the result can
 * never leave the play area. Pure and deterministic.
 */
export function applyPointerMotion(cursor: Cursor, movementX: number, movementY: number): Cursor {
  return moveCursor(cursor, { dh: movementX, dv: -movementY })
}
