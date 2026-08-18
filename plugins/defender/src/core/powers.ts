// plugins/defender/src/core/powers.ts
//
// Story df5-5 (GREEN) — the two EMERGENCY POWERS for Defender: smart-bomb and hyperspace.
// A pure, clock-free port of the ROM's own trigger + timing at
// reference/original-source/defender/DEFA7.SRC (ROM-always-wins). This module reads no
// clock, mints no entropy (the RNG is INJECTED, stars.ts-style) and reaches no browser
// surface — tests/purity.test.ts scans src/core. Every constant is enrolled in
// docs/rom-study/claims/18-powers.json (citations.test.ts / brief-dossier.test.ts
// byte-verify it).
//
// The powers PRESENT through the df4-2 effect-policy (effects.ts classify/assertNoFull-
// FrameStrobe): the ROM's full-screen strobes — the smart bomb's SBMBX0 COM PCRAM whole-
// page invert (:3199) and the hyperspace screen-clear — are the ONE standing exception to
// ROM-always-wins (docs/adr/0005-photosensitivity-accessibility-exception.md). df5 CITES
// ADR-0005; the classifier substitutes freeze/fade/particle for the strobe. See the session
// Design Deviation.
//
// ─── THE ROM, ROUTINE BY ROUTINE (DEFA7.SRC) ──────────────────────────────────────
//   SMART BOMB (SBOMB, :3175-3209): a scheduler process.
//     • :3175-3176 `LDA SBFLG / BNE SBMBX2` — SBFLG is the "in progress" latch; a second
//       press while it is set bails (no fire). Cleared at the end of the flash (SBX2A :3208).
//     • :3178-3179 `LDA PSBC,X / BEQ SBMBX2` — PSBC,X is the player's remaining smart-bomb
//       COUNT; zero bails.
//     • :3180-3181 `INC SBFLG / DEC PSBC,X` — on fire: arm the latch and spend one bomb.
//     • :3185-3195 the SBMB0 loop clears every on-screen object with `OTYP < $02`
//       (`CMPA #$02 / BHS SBMB2`, :3190-3191) by calling its collision vector `[OCVECT,X]`
//       (:3192) — the df4-1 collision seam. `clearsType` is that predicate.
//     • :3197,:3199 `LDA #4 SCREEN FLASHES/2` / `SBMBX0 COM PCRAM` — the strobe count +
//       whole-page invert. Timing cited; PRESENTATION substituted (ADR-0005).
//     • :3209 `SBMBX2 JMP SUCIDE` — SBOMB is a df3 scheduler process (no per-power rAF).
//   HYPERSPACE (HYPER, :3213-3242): a scheduler process.
//     • :3213-3215 `LDA STATUS / BITA #$FD / LBNE HYPX` — NO GO unless `(STATUS & $FD) == 0`.
//     • :3216 `LDA #$77 / STA STATUS` — the in-hyperspace STATUS (the re-entry marker).
//     • :3219 `NAP 15,HYP02` — a scheduler nap, not an rAF.
//     • :3229-3235 `LSRB / BCC HYP0` — the SEED low bit picks the teleport DIRECTION:
//         carry SET (bit0=1) → `LDD #$2000 / LDX #$0300` : X=$2000, face RIGHT;
//         carry CLEAR (bit0=0) → `LDX #-$0300 / LDD #$7000` : X=$7000, face LEFT.
//     • :3238-3240 `LDB HSEED / LSRB / ADDB #YMIN` — a random Y in the player band,
//       `(HSEED >> 1) + YMIN`.
//     • :3242+ `CLRD / STA PLAXV` — the X velocity is zeroed: the ship re-enters STILL, at a
//       random spot — the re-entry risk.

import type { Scheduler, Process } from './scheduler.js'
import { YMIN } from './world.js'
import type { Facing } from './world.js'

// ─── Smart-bomb constants, ported and cited (AC4) ─────────────────────────────────────

/** OTYP clear threshold — objects with type below this are cleared, `CMPA #$02 / BHS SBMB2`
 *  (defender/DEFA7.SRC:3190,3191). */
export const SMART_BOMB_CLEAR_TYPE_MAX = 0x02
/** The ROM strobe count — `LDA #4 SCREEN FLASHES/2` (defender/DEFA7.SRC:3197). The TIMING is
 *  ported; the strobe itself is substituted by the df4-2 policy (ADR-0005). */
export const SMART_BOMB_FLASHES = 4
/** The df3 scheduler PTYPE tag for the smart-bomb process — opaque, distinct from the
 *  laser/enemy/score ptypes and from HYPER_PTYPE. */
export const SMART_BOMB_PTYPE = 6

// ─── Hyperspace constants, ported and cited (AC4) ─────────────────────────────────────

/** The NO GO mask — `BITA #$FD` (defender/DEFA7.SRC:3214): hyperspace is refused unless
 *  every STATUS bit but bit 1 is clear. */
export const HYPER_NOGO_MASK = 0xfd
/** The in-hyperspace STATUS — `LDA #$77` (defender/DEFA7.SRC:3216). */
export const HYPER_STATUS = 0x77
/** The hyperspace scheduler nap — `NAP 15,HYP02` (defender/DEFA7.SRC:3219). */
export const HYPER_NAP = 15
/** Teleport X for the RIGHT branch — `LDD #$2000` (defender/DEFA7.SRC:3231). */
export const HYPER_X_RIGHT = 0x2000
/** Teleport X for the LEFT branch — `LDD #$7000` (defender/DEFA7.SRC:3235). */
export const HYPER_X_LEFT = 0x7000
/** The re-faced direction magnitude — `LDX #$0300` / `#-$0300`
 *  (defender/DEFA7.SRC:3232,3234); +right, −left, the same magnitude as PLADIR_MAG. */
export const HYPER_DIR_MAG = 0x0300
/** The df3 scheduler PTYPE tag for the hyperspace process — distinct from SMART_BOMB_PTYPE. */
export const HYPER_PTYPE = 7

// ─── Smart-bomb: the trigger reducer + the clear gate ─────────────────────────────────

/** The smart-bomb trigger inputs: `armed` (SBFLG, already in progress) and `count` (PSBC,X). */
export interface SmartBombState {
  readonly armed: boolean
  readonly count: number
}

/** The trigger outcome: whether it `fired`, and the new `armed` latch + `count`. */
export interface SmartBombResult {
  readonly fired: boolean
  readonly armed: boolean
  readonly count: number
}

/**
 * The SBMB0 clear gate (defender/DEFA7.SRC:3189-3191): a smart bomb clears every on-screen
 * object whose OTYP is below `SMART_BOMB_CLEAR_TYPE_MAX` (`CMPA #$02 / BHS SBMB2` spares the
 * rest). The sim applies this over its live object list via the df4-1 collision seam.
 */
export function clearsType(otyp: number): boolean {
  return otyp < SMART_BOMB_CLEAR_TYPE_MAX
}

/**
 * SBOMB trigger (defender/DEFA7.SRC:3175-3181), a pure reducer. Bails when already in
 * progress (`LDA SBFLG / BNE SBMBX2`, :3175-3176) or with an empty stock (`LDA PSBC,X /
 * BEQ SBMBX2`, :3178-3179); otherwise arms the latch (`INC SBFLG`, :3180) and spends one
 * bomb (`DEC PSBC,X`, :3181).
 */
export function smartBomb(state: SmartBombState): SmartBombResult {
  if (state.armed) return { fired: false, armed: true, count: state.count }
  if (state.count === 0) return { fired: false, armed: false, count: 0 }
  return { fired: true, armed: true, count: state.count - 1 }
}

/**
 * Spawn the smart bomb as ONE df3 scheduler process (`JMP SUCIDE`, defender/DEFA7.SRC:3209 —
 * the ROM's process shape), not a per-power rAF loop. The clear over the live object list
 * (via `clearsType` + the df4-1 collision seam) is applied by the sim wiring; here the power
 * is the scheduler process the ROM uses.
 */
export function spawnSmartBomb(sched: Scheduler): Process {
  return sched.makeProcess(() => {}, SMART_BOMB_PTYPE)
}

// ─── Hyperspace: the gate + the random teleport ───────────────────────────────────────

/** The teleport HYPER computes: a new player X ($2000/$7000), facing, integer Y in the
 *  player band, and a zeroed X velocity (the ship re-enters still). */
export interface Teleport {
  readonly x16: number
  readonly facing: Facing
  readonly y: number
  readonly vx: number
}

/**
 * The HYPER NO GO gate (defender/DEFA7.SRC:3213-3215): hyperspace is allowed only when
 * `(status & HYPER_NOGO_MASK) === 0` (`BITA #$FD / LBNE HYPX`).
 */
export function canHyperspace(status: number): boolean {
  return (status & HYPER_NOGO_MASK) === 0
}

/**
 * The HYPER random teleport (defender/DEFA7.SRC:3229-3242). Draws two bytes from the
 * INJECTED seeded rng (the ROM's SEED then HSEED): the first byte's low bit picks the
 * direction (`LSRB / BCC HYP0`, :3229-3230) — bit set → X=$2000 facing right (:3231-3232),
 * bit clear → X=$7000 facing left (:3234-3235); the second gives the Y, `(HSEED >> 1) + YMIN`
 * (`LDB HSEED / LSRB / ADDB #YMIN`, :3238-3240). The X velocity is zeroed (`CLRD / STA
 * PLAXV`, :3242+) — the ship re-appears still at a random spot, the re-entry risk.
 */
export function hyperspace(rand: () => number): Teleport {
  const dirBit = rand() & 1
  const facing: Facing = dirBit === 1 ? 'right' : 'left'
  const x16 = dirBit === 1 ? HYPER_X_RIGHT : HYPER_X_LEFT
  const y = (rand() >> 1) + YMIN
  return { x16, facing, y, vx: 0 }
}

/**
 * Spawn hyperspace as ONE df3 scheduler process (`JMP SUCIDE` via the HYP nap chain,
 * defender/DEFA7.SRC:3219+), not a per-power rAF loop. On dispatch it reads the seeded rng
 * and computes the teleport (HYP00, :3236); the sim wiring applies the result to the ship.
 */
export function spawnHyperspace(sched: Scheduler, rand: () => number): Process {
  return sched.makeProcess(() => {
    void hyperspace(rand)
  }, HYPER_PTYPE)
}
