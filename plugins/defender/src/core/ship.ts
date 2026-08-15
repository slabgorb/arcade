// plugins/defender/src/core/ship.ts
//
// Story df3-3 (GREEN) — the player SHIP for Defender: a pure, clock-free port of the
// ROM's own player physics at reference/original-source/defender/DEFA7.SRC + PHR6.SRC
// (ROM-always-wins). The ship is a scheduler process (df3-1) driven by a pure input
// snapshot — the shell owns the PIA read; this module reads no clock, mints no entropy
// and reaches no browser surface (tests/purity.test.ts scans src/core). The horizontal
// velocity produced here (its TOP 16 bits) is what world.slide() (df3-2) consumes; the
// SUB-PIXEL low byte is this module's concern. Every constant is enrolled in
// docs/rom-study/claims/11-ship.json (citations.test.ts byte-verifies it).
//
// ─── THE ROM, ROUTINE BY ROUTINE ─────────────────────────────────────────────────
//   PLAXV (PHR6.SRC:332 "PLAXV RMB 3") — the horizontal velocity is a 24-BIT
//     accumulator (three bytes); its LOW byte (PLAXV+2) is a sub-pixel fraction, so
//     the value world.slide() consumes is the integer velocity PLAXV>>8. Each PLAYER
//     frame updates it in two steps (order matters):
//       • X DAMPING (DEFA7.SRC:2342-2359): NEGD the top 16 bits, shift ×4 (ASLB/ROLA
//         twice), add back into the low 16 with carry → PLAXV -= 4·(PLAXV>>8). A
//         friction term proportional to the integer velocity, pulling it toward 0,
//         computed on the FULL 24-bit value.
//       • THRUST (DEFA7.SRC:2360-2371): when the accel button is held (PIA21 bit $02,
//         :2360-2362) add PLADIR into the 24-bit accumulator (ITEMP sign-extends).
//   PLADIR (PHR6.SRC:320) — the signed "THRUST+DIRECTION" vector, init $0300 facing
//     right (DEFA7.SRC:1249-1250); facing left is its two's-complement negation.
//   REV (DEFA7.SRC:3155-3171) — reverse-facing, gated by REVFLG (PHR6.SRC:295 "REV
//     SWITCH DEBOUNCE"): `LDA REVFLG / BNE REVX` makes a held button flip the facing
//     EXACTLY ONCE; the latch clears only after the button is released (:3166-3170).
//   VERTICAL MOTION (DEFA7.SRC:2441-2476) — a CLAMPED STRIP, not a cylinder:
//       • FREEZE (a pre-move gate, RTS): up freezes when Yint ≤ YMIN+1 = 43 (CMPB
//         #YMIN+1 / BLS PLAYX, :2450-2451); down freezes when Yint ≥ 238 (CMPB #238 /
//         BHS PLAYX, :2461-2462). Yint is the HIGH byte of the 16-bit PLAY16.
//       • else kickstart ±$100 when reversing/starting (PLAUP1/PLADN1, :2459,2470),
//         accelerate ±8 while already moving that way (:2454,2465), clamp speed to
//         ±$200 (:2455-2457,2466-2468), then INTEGRATE PLAY16 += PLAYV with NO
//         post-add clamp (:2472-2474) — a max step can overshoot to Yint=42 (=YMIN).
//       • neutral (no up/down): PLAYV := 0 the same frame (LDD #0, :2448) — vertical
//         has no inertia. Up is checked before down (:2443-2445), so up wins if both.

/** PLADIR sign: the ship faces right (positive) or left (negative). Mirrors world.Facing. */
export type Facing = 'right' | 'left'

/** PLADIR "THRUST+DIRECTION" magnitude — LDD #$0300 (defender/DEFA7.SRC:1249). */
export const PLADIR_MAG = 0x0300
/** Vertical acceleration step per frame — ADDD #8 / #-8 (defender/DEFA7.SRC:2454,2465). */
export const VY_STEP = 8
/** Vertical speed clamp — CMPD #$200 (defender/DEFA7.SRC:2455,2466). */
export const VY_MAX = 0x0200
/** Vertical reversing/starting kick — LDD #$100 (defender/DEFA7.SRC:2459,2470). */
export const VY_KICK = 0x0100
/** Up freezes at/above this integer Y — CMPB #YMIN+1 (defender/DEFA7.SRC:2450; YMIN=42). */
export const Y_TOP_FREEZE = 43
/** Down freezes at/below this integer Y — CMPB #238 (defender/DEFA7.SRC:2461). */
export const Y_BOTTOM_FREEZE = 238

/** PLADIR for a facing: +$0300 right, its two's-complement negation −$0300 left. */
export function pladir(facing: Facing): number {
  return facing === 'right' ? PLADIR_MAG : -PLADIR_MAG
}

/**
 * X DAMPING (defender/DEFA7.SRC:2342-2359): friction on the full 24-bit PLAXV —
 * PLAXV -= 4·(PLAXV>>8). Proportional to the integer velocity, pulling it toward 0.
 * Operating on the 24-bit value (not its 16-bit integer part) is what keeps the
 * sub-pixel byte; a 16-bit truncation of e.g. 0x010000 would lose it and return 0.
 */
export function dampX(plaxv24: number): number {
  return plaxv24 - 4 * (plaxv24 >> 8)
}

/** THRUST (defender/DEFA7.SRC:2367-2371): add PLADIR into the 24-bit accumulator. */
export function accelX(plaxv24: number, dir: number): number {
  return plaxv24 + dir
}

/**
 * One PLAYER frame of horizontal velocity (defender/DEFA7.SRC:2342-2371): DAMP first,
 * THEN thrust while the accel button is held. The order is load-bearing — three accel
 * frames from rest reach 0x08E0 (friction bleeding each step), not the naive 0x0900.
 */
export function stepVelocityX(
  plaxv24: number,
  io: { accel: boolean; facing: Facing },
): number {
  const damped = dampX(plaxv24)
  return io.accel ? accelX(damped, pladir(io.facing)) : damped
}

/** REV state: the ship's facing and the REVFLG debounce latch (defender/PHR6.SRC:295,320). */
export interface RevState {
  readonly facing: Facing
  readonly revflg: boolean
}

/**
 * REV reverse-facing (defender/DEFA7.SRC:3155-3171). A HELD reverse button flips the
 * facing exactly once: the flip fires only on the frame the latch is clear (`LDA REVFLG
 * / BNE REVX`, :3157-3158), and the latch clears only when the button is released
 * (:3166-3170). One press = one flip.
 */
export function stepReverse(state: RevState, reverseHeld: boolean): RevState {
  if (!reverseHeld) return { facing: state.facing, revflg: false } // release re-arms
  if (state.revflg) return { facing: state.facing, revflg: true } // already flipped this hold
  return { facing: state.facing === 'right' ? 'left' : 'right', revflg: true }
}

/** Vertical state: PLAY16 (16-bit position, hi byte = integer Y) and PLAYV (16-bit velocity). */
export interface VState {
  readonly y16: number
  readonly playv: number
}

/**
 * VERTICAL MOTION (defender/DEFA7.SRC:2441-2476): freeze at the strip edges, else
 * kick/accelerate/clamp the vertical velocity and integrate with NO post-add clamp.
 * Up is checked before down, so up wins when both are held.
 */
export function stepVerticalY(state: VState, io: { up: boolean; down: boolean }): VState {
  const yint = state.y16 >> 8 // LDB PLAY16 — the integer Y is the high byte

  if (io.up) {
    // CMPB #YMIN+1 / BLS PLAYX — freeze (RTS) at/above the top, PLAYV untouched.
    if (yint <= Y_TOP_FREEZE) return { y16: state.y16, playv: state.playv }
    // BPL PLAUP1: already moving up (PLAYV<0) accelerates by −8, clamped to −$200;
    // otherwise kick to −$100.
    const playv =
      state.playv < 0 ? Math.max(state.playv - VY_STEP, -VY_MAX) : -VY_KICK
    return { y16: state.y16 + playv, playv } // integrate, no post-add clamp
  }

  if (io.down) {
    // CMPB #238 / BHS PLAYX — freeze at/below the bottom.
    if (yint >= Y_BOTTOM_FREEZE) return { y16: state.y16, playv: state.playv }
    // BLE PLADN1: already moving down (PLAYV>0) accelerates by +8, clamped to +$200;
    // otherwise kick to +$100.
    const playv =
      state.playv > 0 ? Math.min(state.playv + VY_STEP, VY_MAX) : VY_KICK
    return { y16: state.y16 + playv, playv }
  }

  // Neutral (LDD #0): vertical has no inertia — PLAYV := 0 the same frame, Y holds.
  return { y16: state.y16, playv: 0 }
}
