// src/shell/input.ts
//
// Story mc1-3 (GREEN, Yoda) — the shell input adapter. Turns mouse/trackball
// motion into the per-frame cursor delta and drives the crosshair through the
// core reducer, so the clamp lives in core/cursor.ts and this shell only adapts
// coordinate spaces. Desktop-only (repo rule: no touch/narrow-viewport). mc1-4
// added the three fire keys (Z/X/C) that launch an ABM per base.
//
// ─── THE V-FLIP (the one adaptation this seam owns) ──────────────────────────
// The pointer is top-left origin: movementY > 0 means the pointer moved DOWN the
// screen. The cabinet cursor V is bottom-origin (render.ts flips V to paint it),
// so moving the pointer UP (movementY < 0) must move the crosshair UP the field
// (v increases). Hence dv = -movementY (and dh = movementX), handed straight to
// the core clamp — the literal reading of "feed the motion as the delta".
//
// ─── THE FIRE KEYS (mc1-4) ────────────────────────────────────────────────────
// REV-01 LAUNCH ABMS (ABMLAU, W3MAIN:606) reads three fire switches through the
// mask table FIREMA: .BYTE MFIREL,MFIREC,MFIRER — each switch fires its OWN base,
// left/centre/right (owner ruling: per-key specific base, no nearest-base select).
// So Z→base 0 (left), X→base 1 (centre), C→base 2 (right), matching field.ts BASES
// (source order = ascending H = left→right). The launch itself is core geometry —
// this shell just picks the base and hands its position to core/abm.launchAbm.

import { moveCursor, type Cursor } from '../core/cursor.js'
import { launchAbm, type Abm, type Vec } from '../core/abm.js'

/**
 * Map a screen-space pointer movement (a PointerEvent's movementX/movementY,
 * top-left origin) to the next crosshair position: dh = movementX, dv =
 * -movementY (the V-flip), fed through core/cursor.moveCursor so the result can
 * never leave the play area. Pure and deterministic.
 */
export function applyPointerMotion(cursor: Cursor, movementX: number, movementY: number): Cursor {
  return moveCursor(cursor, { dh: movementX, dv: -movementY })
}

/**
 * Map a keyboard key to its missile base index — Z→0 (left), X→1 (centre),
 * C→2 (right), matching the three FIREMA switches (ABMLAU, W3MAIN:606). Returns
 * null for any non-fire key, so a stray keydown launches nothing.
 */
export function fireKeyToBase(key: string): number | null {
  switch (key.toLowerCase()) {
    case 'z':
      return 0
    case 'x':
      return 1
    case 'c':
      return 2
    default:
      return null
  }
}

/**
 * Launch an ABM from the base the fire `key` selects (via `bases`, i.e. field.ts
 * BASES) toward `target` (the current crosshair), using core/abm.launchAbm — the
 * flight is core geometry, not re-implemented here. Returns null for a non-fire key.
 */
export function launchFromKey(key: string, bases: readonly Vec[], target: Vec): Abm | null {
  const base = fireKeyToBase(key)
  if (base === null) return null
  return launchAbm(bases[base], target)
}
