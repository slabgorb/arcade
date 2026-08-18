// plugins/defender/src/core/world.ts
//
// Story df3-2 (GREEN) — the world-wrap coordinate model + camera slide for Defender,
// the epic's riskiest seam. A pure, clock-free port of the ROM's OWN world/camera
// representation (ROM-always-wins) at reference/original-source/defender/DEFA7.SRC +
// PHR6.SRC — NOT a tidier world-absolute re-derivation. The src/core purity sweep
// (tests/purity.test.ts) scans this file; it reads no clock, mints no entropy, and
// reaches no browser surface. df3-3 (the ship) drives slide() with the player's
// velocity/facing snapshot; df3-4 (stars) rides the BGL delta (bgl − bglx).
//
// ─── THE MODEL, ROUTINE BY ROUTINE ───────────────────────────────────────────────
//   BGL  (defender/PHR6.SRC:215) "TERRAIN LEFT POINTER" — the CAMERA: the world-X of the
//        screen's left edge. The world is a 16-BIT HORIZONTAL CYLINDER: BGL and every
//        world-X wrap at $10000 with no clamp (wrap16).
//   BGLX (defender/PHR6.SRC:216) "OLD TERRAIN LEFT" — last frame's camera, for the object/star
//        scroll delta. slide() saves it (defender/DEFA7.SRC:2419-2420).
//   PLABX(defender/PHR6.SRC:335, defender/DEFA7.SRC:2432-2440) — absolute world X is DERIVED not stored:
//        worldX(entity) = onscreen + BGL, a pure helper (wrap16'd).
//   PLAY1(defender/DEFA7.SRC:2373-2431) — the SHIP LEADS THE SCROLL:
//     • targetColumn maps velocity → a target screen column: base $20 facing-right
//       (:2385) / $70 facing-left (:2389), plus a velocity column that applies ONLY
//       when the facing agrees with the velocity column's SIGN (TSTB/BMI PV1A/BMI PV2,
//       :2386-2393) — otherwise the column is CLEARED (CLR PCX, :2392-2393). The column
//       is the low byte of (PLAXV >> 2) shifted once more (ASRA/RORB ×2, CLRA, ASRB/RORA,
//       :2373-2380); its SIGN is a post-shift property, not the raw velocity direction.
//     • slide() slides BGL toward the target by BGDELT (:2397-2415):
//         diff = target − plax16 (PV2A SUBD PLAX16, :2397)
//         diff  >  $100      → BGDELT +$40, plax16 += $100   (:2400-2406)
//         diff  ≤ −$100      → BGDELT −$40, plax16 −= $100   (:2407-2413)
//         −$100 < diff ≤ $100 → BGDELT 0, plax16 = target   (PV9, :2401,2408,2414-2417)
//       The boundary is ASYMMETRIC on purpose: `CMPD #$100 / BLS PV9` puts diff==+$100
//       IN range (no slide); `CMPD #-$100 / BGT PV9` puts diff==−$100 OUT of range (it
//       slides). Then it saves BGLX, CLAMPS plaxv to [−$100,+$100] (:2421-2428) and
//       integrates BGL = BGL + plaxv_clamped − BGDELT (:2429-2431), 16-bit-wrapped.
//   Vertical is a CLAMPED STRIP, not a cylinder — TWO rules on one axis:
//     • clampPlayerY → [YMIN+1, 238]: PLAUP freezes upward at YMIN+1 (:2450), PLADN
//       freezes downward at 238 (:2461).
//     • wrapObjectY  → single-step wrap on [YMIN, YMAX]: VELO (:2490-2496).
//   YMIN=42 / YMAX=240 are DECIMAL (defender/PHR6.SRC:20-21).

/** PLADIR sign: the ship faces right (BPL / positive) or left (BMI / negative). */
export type Facing = 'right' | 'left'

/** YMIN — minimum Y coordinate (defender/PHR6.SRC:21, decimal). */
export const YMIN = 42
/** YMAX — maximum Y coordinate (defender/PHR6.SRC:20, decimal). */
export const YMAX = 240

/** The base target column per facing: $20 right (defender/DEFA7.SRC:2385), $70 left (:2389). */
const BASE_RIGHT = 0x20
const BASE_LEFT = 0x70
/** BGDELT slide step and the in-range window half-width (defender/DEFA7.SRC:2400-2412). */
const SLIDE_STEP = 0x40
const SLIDE_WINDOW = 0x100
/** Player velocity clamp bound (defender/DEFA7.SRC:2422-2427). */
const VEL_CLAMP = 0x100

/** Arithmetic (sign-preserving) shift-right of a 16-bit value by `n` (ASRA/RORB). */
function asr16(x: number, n: number): number {
  return (((x & 0xffff) << 16) >> 16) >> n
}

/** Arithmetic shift-right of an 8-bit value by 1, returned as a byte (ASRB). */
function asr8Byte(b: number): number {
  return (((b & 0xff) << 24) >> 24 >> 1) & 0xff
}

/** True if the byte's sign bit is set (the 6809 BMI test). */
function isNegByte(b: number): boolean {
  return (b & 0x80) !== 0
}

/** The 16-bit horizontal cylinder: every world-X wraps at $10000, no clamp. */
export function wrap16(x: number): number {
  return x & 0xffff
}

/** The world cylinder measured in SCREEN COLUMNS: a world-x's on-screen column is `x >> 8`
 *  (the high byte), so the $10000 cylinder is exactly `0x10000 >> 8 = 256` columns around.
 *  The camera (BGL >> 8) and every world-space blit share this period — the terrain must tile
 *  at it too, or the surface snaps once per lap when BGL wraps (df5-9). */
export const WORLD_COLS = 0x10000 >> 8

/** PLABX — absolute world X is derived, not stored: onscreen + BGL, wrapped. */
export function worldX(onscreenX: number, bgl: number): number {
  return wrap16(onscreenX + bgl)
}

/**
 * PLAY1 velocity→column mapping (defender/DEFA7.SRC:2373-2396): the ship's target screen
 * column. Returns the 16-bit PCX pair (column in the high byte, fraction low).
 */
export function targetColumn(plaxv: number, facing: Facing): number {
  // ASRA/RORB ×2 (÷4 signed), CLRA (keep the low byte), ASRB/RORA.
  const shifted = asr16(plaxv, 2)
  const lowByte = shifted & 0xff
  const carry = lowByte & 0x01 // ASRB pushes bit 0 into the carry…
  let column = asr8Byte(lowByte) // …B becomes the (signed) velocity column
  let fraction = (carry << 7) & 0xff // …RORA rotates the carry into A's top bit

  // The base is chosen by facing; the column applies only when facing AGREES with the
  // column's sign, else it (and the fraction) are cleared (CLR PCX, :2392-2393).
  let base: number
  if (facing === 'right') {
    base = BASE_RIGHT
    if (isNegByte(column)) {
      column = 0
      fraction = 0
    }
  } else {
    base = BASE_LEFT
    if (!isNegByte(column)) {
      column = 0
      fraction = 0
    }
  }

  // PV2: A = base + column (8-bit add), B = fraction — the target PCX pair.
  const columnHi = (base + column) & 0xff
  return wrap16((columnHi << 8) | fraction)
}

/**
 * clampPlayerY — the reachable player-Y BAND is [YMIN+1, 238] (AC5). This is a
 * stateless clamp of the coordinate model. NOTE the ROM's actual mechanism is not a
 * clamp: PLAUP/PLADN (defender/DEFA7.SRC:2450,2461) test the ship's CURRENT Y and
 * FREEZE (RTS) when it is already at/past the edge, then add velocity with no post-add
 * clamp (PYV1, :2472-2474) — so a ±$200 step can overshoot to Y=YMIN(42) and freeze
 * there. That freeze-and-overshoot behaviour lives in the ship's VERTICAL MOTION
 * (defender/DEFA7.SRC:2441-2476), which is df3-3's territory; df3-2 exposes the band.
 */
export function clampPlayerY(y: number): number {
  if (y < YMIN + 1) return YMIN + 1
  if (y > 238) return 238
  return y
}

/** wrapObjectY — an object's Y WRAPS one step on [YMIN, YMAX] (defender/DEFA7.SRC:2490-2496). */
export function wrapObjectY(y: number): number {
  if (y < YMIN) return YMAX // below the floor → the ceiling
  if (y > YMAX) return YMIN // above the ceiling → the floor
  return y
}

/** One frame of the ship-leads-scroll camera update (the PLAY1 result). */
export interface SlideResult {
  /** BGL — the new camera (16-bit). */
  readonly bgl: number
  /** BGLX — the pre-tick camera (defender/DEFA7.SRC:2419-2420). */
  readonly bglx: number
  /** PLAX16 — the ship's new onscreen X. */
  readonly plax16: number
  /** BGDELT — the slide step applied this frame: −$40 | 0 | +$40. */
  readonly bgdelt: number
  /** PLAXV — the velocity after the ±$100 clamp (defender/DEFA7.SRC:2422-2428). */
  readonly plaxv: number
}

/**
 * PLAY1 (defender/DEFA7.SRC:2397-2431): slide BGL toward the ship's target column, then
 * integrate the camera. All inputs/outputs are 16-bit; `plaxv` is the top 16 bits of
 * the 24-bit PLAXV (its sub-pixel low byte is the ship module's concern, df3-3).
 */
export function slide(input: {
  bgl: number
  plax16: number
  plaxv: number
  facing: Facing
}): SlideResult {
  const { bgl, plax16, plaxv, facing } = input
  const target = targetColumn(plaxv, facing)
  const bglx = wrap16(bgl) // BGLX = old BGL

  // PV2A SUBD PLAX16 → the signed displacement toward the target.
  const diff = target - plax16
  let bgdelt: number
  let newPlax16: number
  if (diff > SLIDE_WINDOW) {
    // diff > $100 → slide forward $40, step plax16 by +$100 (:2400-2406).
    bgdelt = SLIDE_STEP
    newPlax16 = wrap16(plax16 + SLIDE_WINDOW)
  } else if (diff <= -SLIDE_WINDOW) {
    // diff ≤ −$100 → slide back −$40, step plax16 by −$100 (:2407-2413). The `≤` (BGT
    // fails at exactly −$100) is the deliberate asymmetry vs the `>` on the + side.
    bgdelt = -SLIDE_STEP
    newPlax16 = wrap16(plax16 - SLIDE_WINDOW)
  } else {
    // −$100 < diff ≤ $100 → in range: no slide, plax16 snaps to the target (PV9, :2414-2417).
    bgdelt = 0
    newPlax16 = target
  }

  // Clamp the velocity to ±$100 (:2422-2428), then BGL = BGL + plaxv − BGDELT (:2429-2431).
  const clampedV = plaxv > VEL_CLAMP ? VEL_CLAMP : plaxv < -VEL_CLAMP ? -VEL_CLAMP : plaxv
  const newBgl = wrap16(bgl + clampedV - bgdelt)

  return { bgl: newBgl, bglx, plax16: newPlax16, bgdelt, plaxv: clampedV }
}
