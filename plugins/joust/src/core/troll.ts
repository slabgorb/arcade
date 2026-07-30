// src/core/troll.ts
//
// Story jt3-3 (GREEN, Korben) — THE LAVA TROLL'S HAND as a pure process. CORE:
// pure functions over plain numbers, no clock, no entropy, no browser surface, no
// shell import (the jt1-7 purity scanner sweeps src/core/ and takes this file the
// moment it lands). Determinism (AC-4) rests on that purity: same inputs, same
// TrollGrip / GripStep out, every time.
//
// The contract Dev builds to is tests/helpers/troll-contract.ts; the behaviour is
// pinned in tests/troll.test.ts, the source re-derivation + PATCH provenance in
// tests/troll-source.test.ts, and the carried jt3-2 demo call-site pin in
// tests/demo-troll.test.ts.
//
// ─── WHAT THE TROLL DOES (three laws, each straight off the 1982 wire) ────────
//
//   • THE SPAWN GATE (AC-1). The lava troll only comes out ONE wave after the
//     bridge burns: TTROLL = TBRIDGE + 1 (JOUSTRV4.SRC:954-957), so the troll wave
//     is 3 + 1 = 4. `trollSpawnable` READS `arena.bridgeBurned` — the carried jt3-2
//     obligation: a demo that never applied wave destruction (a stale arena) can
//     never spawn a troll, even at wave 4+. The `{ kind: 'troll' }` landing outcome
//     jt1-4 reserved (arena.groundOutcome for bit 7 without bit 5) is now reachable.
//
//   • THE GRIP (AC-2). The grab repoints the victim's gravity vector from the
//     normal ADDGRA to ADDLAV (PADGRA → ADDLAV, JOUSTRV4.SRC:1651-1652). ADDLAV
//     folds the troll's downward pull into VY BEFORE the break-free test, so the
//     escape is SUSTAINED, not a single-frame spike — see stepGrip.
//
//     ADDLAV, the PATCH3 red-label behaviour (JOUSTRV4.SRC:6612):
//         ADDD  CLVGRA      PATCH3        ← the LIVE, patched instruction: the
//                                           VARIABLE lava-troll gravity (`pull`)
//     ******** ADDD LAVGRA                ← the DISPLACED pre-patch instruction
//                                           (the CONSTANT gravity), kept behind a
//                                           ******** comment so the "classic green"
//                                           version stays recoverable (RV4 convention).
//
//   • THE RV4 ESCALATION (AC-3). PATCH1/2/3 (JOUSTRV4.SRC:6374-6396): a 30-second
//     grace (LAVKLL = 30*60 = 1800 frames; PATCH2 re-naps VNAPTIM #1 every video
//     field, so LAVKLL counts down once per frame at 60 Hz), then the pull grows
//     +1/frame to the $500 cap — where per-frame it exceeds any flap the game can
//     produce, so the grip is arithmetically INESCAPABLE. The cap is a `BHI`
//     (unsigned-strictly-higher) against $500, so the pull OVERSHOOTS to $501 as the
//     terminal value; PULL_CAP is the $500 COMPARISON constant, not a clamp.
//
// ─── UNITS (inherited from flight.ts / arena.ts) ─────────────────────────────
//   • VY is the 6809's 16-bit signed velocity; the break-free compare is signed.
//   • posY is 8.8 fixed point — whole pixel in the high byte (`posY >> 8`); the lava
//     death line is DEATH_Y = FLOOR+7 = 230 (arena.isLavaDeath), a WHOLE-PIXEL test.
//   • `pull` (CLVGRA) is a 16-bit magnitude ADDED to VY (positive = down).

import { BRIDGE_WAVE, TROLL_DELAY, isLavaDeath } from './arena.js'
import type { ArenaState } from './arena-state.js'

export { BRIDGE_WAVE, TROLL_DELAY }
export type { ArenaState }

/** Exact 16-bit two's-complement wrap for the SIGNED velocity, so long grip
 * trajectories match the ROM's `STD PVELY` (the flight.ts idiom). */
const int16 = (v: number): number => ((v & 0xffff) << 16) >> 16

/** Exact 16-bit UNSIGNED wrap for the position word (PPOSY is a 16-bit unsigned
 * RAM value, ADDLAV's `ADDD PPOSY+1` wraps mod 2^16). A victim driven off the TOP
 * goes negative as a signed JS number; wrapping unsigned makes its high byte ≥
 * DEATH_Y so the `CMPA #FLOOR+7 / BHS` lava test reads it right (jt3-3 deferred
 * edge — `int16`/signed would keep it negative and re-break the compare). */
const uint16 = (v: number): number => v & 0xffff

// ─── Constants (each radix-cited + claimed in claims/troll.json) ─────────────

/** `CMPD #-$0180` (JOUSTRV4.SRC:6616) — the break-free VY threshold. SIGNED (BLT);
 * -$0180 = -384 decimal. */
export const BREAK_FREE_VY = -0x180
/** `CMPD #$500` (JOUSTRV4.SRC:6378) — the MAXIMUM lava-troll gravity the pull
 * escalates to. The COMPARISON constant for the BHI cap (the pull overshoots it to
 * $501; do NOT clamp to $500). HEX. */
export const PULL_CAP = 0x500
/** `LDD #30*60` (JOUSTRV4.SRC:6393) — the escalation grace, in frames. 30 seconds
 * at the 60 Hz video field rate (VNAPTIM #1 renaps every frame) = 1800. */
export const GRACE_FRAMES = 30 * 60
/** `LDA #$50` BCD via SCRTEN (JOUSTRV4.SRC:6668) — 50 points for breaking free.
 * The $50 is the RAW byte; SCRTEN decimal-adjusts (DAA), so the AWARDED score is 50
 * (the verify-in-emulation caveat rides in claim JT33-011 — nothing gates on it). */
export const ESCAPE_SCORE = 50
/** 4 — the first wave the troll is active: TTROLL = TBRIDGE + 1 (BRIDGE_WAVE +
 * TROLL_DELAY, JOUSTRV4.SRC:954-957). */
export const TROLL_WAVE = BRIDGE_WAVE + TROLL_DELAY
/** 'ADDLAV' — the grip's gravity routine (PADGRA is repointed here, :1651-1652). */
export const GRIP_ROUTINE = 'ADDLAV'
/** 'ADDGRA' — the normal gravity routine the grip replaces / restores (:6641). */
export const NORMAL_ROUTINE = 'ADDGRA'

/** The troll grip's escalating state — the two RAM words PATCH1/2/3 drive. */
export interface TrollGrip {
  /** CLVGRA — the current downward pull added to VY each frame (:6612). */
  pull: number
  /** LAVKLL — frames left in the grace before the pull starts escalating (:6393). */
  killTimer: number
}

/** One frame of ADDLAV on the gripped victim (JOUSTRV4.SRC:6608-6642). */
export interface GripStep {
  /** The new VY after the troll's pull is added (STD PVELY). */
  velY: number
  /** The new 8.8 Y after integrating VY — UNCHANGED on an escape (ADLFRE branches
   * before the position add). */
  posY: number
  /** The victim broke free this frame (post-pull VY < -$0180). */
  escaped: boolean
  /** The victim was pulled into the lava this frame (posY>>8 >= DEATH_Y); mutually
   * exclusive with `escaped`. */
  inLava: boolean
}

/** The 50-point break-free score EVENT (the epic's scoring seam, ruling C). */
export interface TrollScoreEvent {
  kind: 'score'
  value: number
  reason: 'escape'
}

/**
 * THE SPAWN GATE (AC-1). True only when the bridge has burned AND the wave is at or
 * past the troll wave (BRIDGE_WAVE + TROLL_DELAY = 4). Reading `bridgeBurned` is
 * load-bearing: a demo that never applied wave destruction (a stale arena) cannot
 * spawn a troll even at wave 4+ — the carried jt3-2 obligation.
 */
export function trollSpawnable(arena: Pick<ArenaState, 'bridgeBurned'>, wave: number): boolean {
  return arena.bridgeBurned && wave >= TROLL_WAVE
}

/**
 * PATCH1 (JOUSTRV4.SRC:6392-6398) — seed a fresh grip from the wave's base LAVGRA
 * gravity: the pull starts at `baseGravity` (CLVGRA = LAVGRA) and the grace timer at
 * GRACE_FRAMES (LAVKLL = 30*60).
 */
export function beginGrip(baseGravity: number): TrollGrip {
  return { pull: baseGravity, killTimer: GRACE_FRAMES }
}

/**
 * PATCH2 (JOUSTRV4.SRC:6374-6386) — one escalation tick. On the wire:
 *   LDD LAVKLL / ADDD #-1 / BGT 10$   ; timer-1; if still > 0, just store it back
 *   LDD CLVGRA / CMPD #$500 / BHI 5$  ; else escalate the pull unless it is HIGHER
 *   ADDD #1 / STD CLVGRA              ;   than the $500 cap (BHI: overshoots to $501)
 *   5$ LDD #1 / 10$ STD LAVKLL        ; the timer holds at 1 once the grace expires
 * So while the grace is still counting down (killTimer-1 > 0) the pull is frozen and
 * the timer decrements; once it expires the pull grows +1/frame (BHI: to $501, then
 * holds) and the timer stays at 1 so every subsequent frame escalates. Pure.
 */
export function escalateGrip(grip: TrollGrip): TrollGrip {
  const decremented = grip.killTimer - 1
  if (decremented > 0) {
    // Still in the grace — the pull is frozen, only the timer counts down.
    return { pull: grip.pull, killTimer: decremented }
  }
  // Grace expired: grow the pull unless it is already strictly higher than the cap
  // (CMPD #$500 / BHI — so $500 still increments, to $501; $501+ holds). LDD #1 resets
  // the timer to 1, so it re-expires every frame from here on.
  const pull = grip.pull > PULL_CAP ? grip.pull : grip.pull + 1
  return { pull, killTimer: 1 }
}

/**
 * ADDLAV (JOUSTRV4.SRC:6608-6642) — one frame of the troll's gravity on the victim
 * (AC-2). The `SEX / ADDD CLVGRA / ADDD PVELY / STD PVELY` sequence folds the
 * wings-offset (SEX of REG.B: 0 wings-down / 4 wings-up, :6170/:6197) and the grip's
 * pull into VY, THEN tests `CMPD #-$0180 / BLT ADLFRE` — a SIGNED compare AFTER the
 * pull is added, which is exactly why a single-frame spike to the raw threshold does
 * NOT escape and the flap must be SUSTAINED. On escape ADLFRE branches BEFORE
 * `ADDD PPOSY+1` so the position is FROZEN that frame. Otherwise the fall integrates
 * and, at or below FLOOR+7 whole pixels (`CMPA #FLOOR+7 / BLO`), the victim dies in
 * the lava. Pure.
 */
export function stepGrip(velY: number, posY: number, grip: TrollGrip, wingsUp = false): GripStep {
  // REG.B addition to gravity: CLRB (0) with the flap button HELD, LDB #$04 (4) with
  // it released — ADDLAV keeps no GRAV of its own; CLVGRA replaces it.
  const gravInput = wingsUp ? 4 : 0
  const newVelY = int16(velY + gravInput + grip.pull)

  if (newVelY < BREAK_FREE_VY) {
    // ADLFRE: break free — VY is stored, but the position is NOT integrated.
    return { velY: newVelY, posY, escaped: true, inLava: false }
  }

  // PPOSY is a 16-bit UNSIGNED word: wrap so an off-the-top victim (posY going
  // negative) lands with an unsigned high byte ≥ DEATH_Y and registers a lava death.
  const newPosY = uint16(posY + newVelY)
  return { velY: newVelY, posY: newPosY, escaped: false, inLava: isLavaDeath(newPosY) }
}

/**
 * The 50-point break-free score event (AC-2, JOUSTRV4.SRC:6666-6670). The value is
 * the BCD-DECODED 50 (SCRTEN reads the raw $50 as tens via DAA), not the raw byte —
 * ruling C: the verify-in-emulation caveat lives in claim JT33-011, this event does
 * NOT gate on an emulator.
 */
export function escapeScoreEvent(): TrollScoreEvent {
  return { kind: 'score', value: ESCAPE_SCORE, reason: 'escape' }
}
