// src/core/inchworm.ts
//
// Story ml4-3 (GREEN) — THE INCHWORM: `WRMMV — ENTER AND MOVE INCH WORM`
// (MILLI.MAC:2559, IW-1), ported line-by-line as a pure reducer. Unlike every
// other flier the inchworm lives in motion-object slot 0 — bare MOBJC, no
// index (IW-3) — and only ENTERS while the centipede is ALIVE (DEAD non-zero,
// IW-8), on the rare tick where the frame LOW byte is 0x13 and the frame HIGH
// byte & 3 is 0 (IW-5/6): one window every 1024 frames. It inches a pure
// horizontal line — H += dh (IW-18), dh ±1 below 80,000 and ±2 from it
// (IW-28/29/30) — cycling four pictures 0x10→0x13 (IW-11/12) at a cadence
// derived from its own speed: the SLOW worm animates every 4 frames, the FAST
// one every 2 (IW-13..17). Killed, it FIRST sets SLOW to 0xE0 — slowing every
// critter on screen — then scores 100, or 300 by DDT (IW-34..37). Every
// constant carries an IW-* claim in
// docs/rom-study/claims/11-earwig-inchworm-bee.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` (MLDEF.MAC:2): ROM literals quoted here are
// hex; a trailing period in the source (`11.`) marks DECIMAL.
//
// ─── BYTE SEMANTICS ─────────────────────────────────────────────────────────
// Every field is a byte 0..255; -1 is 0xFF. Slot records are mutated in place
// (the conway.ts house style); functions are deterministic — randomness comes
// in as the POKEY register bytes RND0/RND1 on the env. Upright cabinet only
// (ml8-3 owns cocktail). CHAN8 sound (:2596-2599) is an ml6 seam; the
// OBSTAC/DDTEXP tail (:2606-2611, IW-21) stays with the caller. The WRMMV3
// `LDY PLAYR` at :2625 is dead — its Y is clobbered by `LDY X,SCORE2` at
// :2627 with X still PLAYR from :2574 — so the env carries score2 directly.
// The off-screen exit clears ONLY the colour (:2604-2605, IW-19/20): this is
// NOT the BEEOFF path, and PTS survives it.

// ─── spawn writes (IW-3/22/23) ──────────────────────────────────────────────
export const INCHWORM_SLOT = 0 // bare MOBJC (MILLI.MAC:2566, IW-3)
export const INCHWORM_PIC = 0x10 // spawn picture (:2614, IW-22)
export const INCHWORM_COLOR = 0xb9 // spawn colour (:2616, IW-23)

// ─── scoring (IW-34..37) ────────────────────────────────────────────────────
export const INCHWORM_PTS = 100 // `LDY I,1` — BCD 1 hundreds (:2113, IW-35)
export const INCHWORM_DDT_PTS = 300 // `LDY I,3` — BCD 3 hundreds (:2118, IW-36)
export const INCHWORM_SLOW = 0xe0 // LDA I,0E0 / STA SLOW (:2111-2112, IW-34/37)

export interface InchwormSlot {
  /** MOBJC — 0 means the slot is free. */
  color: number
  /** MOBJP */
  pic: number
  /** MOBJV */
  v: number
  /** MOBJH */
  h: number
  /** MOBJDH — one of -2, -1, 1 or 2 (IW-13). */
  dh: number
  /** PTS — this slot's kill-points stamp entry (MLDEF.MAC:398); the off-screen exit does NOT clear it (IW-20). */
  pts: number
}

export interface InchwormEnv {
  /** FRAME low byte (IW-5/16). */
  frame: number
  /** FRAME+1 — the frame HIGH byte (IW-6). */
  frameHi: number
  /** SCORE2 — the BCD ten-thousands byte (IW-29). */
  score2: number
  /** The PLAYP/PEXPLD gate (MILLI.MAC:2560-2563, IW-2). */
  playerAlive: boolean
  /** CENTIN (IW-7). */
  centin: number
  /** DEAD — must be NON-ZERO to enter (IW-8). */
  dead: number
  /** POKEY RND0 byte — the direction bit (:2631, IW-31). */
  rnd0: number
  /** POKEY RND1 byte — the spawn row (:2620-2621, IW-25). */
  rnd1: number
}

export type InchwormMove = { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }

/** Two's complement of a byte (the ROM's COMP). */
function comp(b: number): number {
  return (0x100 - b) & 0xff
}

/** The move path's inchworm test: a live slot in the band [10,14) (MILLI.MAC:2581-2585, IW-9/10). */
export function isInchworm(slot: Readonly<InchwormSlot>): boolean {
  return slot.color !== 0 && slot.pic >= INCHWORM_PIC && slot.pic < 0x14
}

/**
 * The spawn tick (MILLI.MAC:2568-2573): the low frame byte must be exactly
 * 0x13 (IW-5) and the high byte AND 3 must be 0 (IW-6) — one window every
 * 1024 frames.
 */
export function inchwormSpawnTick(frame: number, frameHi: number): boolean {
  return frame === 0x13 && (frameHi & 0x03) === 0
}

/** The start gates (MILLI.MAC:2568-2579): the tick, CENTIN under decimal 11 (IW-7), the centipede ALIVE (IW-8). */
export function mayStartInchworm(env: Readonly<InchwormEnv>): boolean {
  if (!inchwormSpawnTick(env.frame, env.frameHi)) return false // :2568-2573 (IW-5/6)
  if (env.centin >= 11) return false // :2574-2577 (IW-7; `11.` is decimal)
  return env.dead !== 0 // :2578-2579 (IW-8) — no entry while the centipede is dead
}

/** WRMMV3's speed (MILLI.MAC:2626-2630): 1 below 80,000, 2 from 80,000 (IW-28/29/30). */
export function inchwormSpeed(score2: number): number {
  return score2 >= 0x08 ? 2 : 1
}

/** The picture cycle (MILLI.MAC:2586-2587): (pic + 1) & 0x13 wraps 10→11→12→13→10 (IW-11/12). */
export function nextInchwormPic(pic: number): number {
  return (pic + 1) & 0x13
}

/**
 * The flap-cadence mask (MILLI.MAC:2589-2592): |dh| ORA 1 EOR 2 — 3 for the
 * slow worm (every 4 frames), 1 for the fast (every 2) (IW-13/14/15).
 */
export function inchwormFlapMask(dh: number): number {
  const abs = (dh & 0x80) !== 0 ? comp(dh) : dh // :2590 — the ROM's ABS
  return (abs | 0x01) ^ 0x02 // :2591-2592 (IW-14/15)
}

/**
 * WRMMV3's spawn writes (MILLI.MAC:2614-2635): picture 10 (IW-22), colour B9
 * (IW-23), H at the edge (IW-24), V from RND1 (IW-25/26/27), dh = ±speed by
 * RND0 bit 7 (IW-28..32).
 */
export function startInchworm(slot: InchwormSlot, env: Readonly<InchwormEnv>): void {
  slot.pic = INCHWORM_PIC // :2614-2615 (IW-22)
  slot.color = INCHWORM_COLOR // :2616-2617 (IW-23)
  slot.h = 0 // :2618-2619 (IW-24)
  slot.v = ((env.rnd1 & 0x38) + 0x40) & 0xff // :2620-2624 (IW-25/26/27)
  const speed = inchwormSpeed(env.score2) // :2626-2630 (IW-28/29/30)
  slot.dh = (env.rnd0 & 0x80) !== 0 ? comp(speed) : speed // :2631-2634 (IW-31/32)
}

/**
 * The whole WRMMV spawn path for slot 0 (MILLI.MAC:2560-2580): player gate
 * (IW-2), slot free (IW-4), the tick/CENTIN/DEAD gates.
 */
export function trySpawnInchworm(slot: InchwormSlot, env: Readonly<InchwormEnv>): boolean {
  if (!env.playerAlive) return false // :2560-2563 (IW-2)
  if (slot.color !== 0) return false // :2566-2567 (IW-4)
  if (!mayStartInchworm(env)) return false // :2568-2579
  startInchworm(slot, env) // :2580
  return true
}

/**
 * One WRMMV move tick (MILLI.MAC:2586-2611): the picture cycle FIRST when
 * (frame & mask) === 0 (IW-16/17 — it runs even on the exit tick), then
 * H += dh (IW-18); a sum of exactly 0 clears ONLY the colour (IW-19/20 —
 * NOT BEEOFF: pts survives). The OBSTAC/DDTEXP tail (IW-21) stays with the
 * caller.
 */
export function moveInchworm(slot: InchwormSlot, env: Readonly<InchwormEnv>): InchwormMove {
  if (!env.playerAlive) return { kind: 'idle' } // :2560-2563 (IW-2) — the gate covers the move
  // :2586-2595 (IW-11..17) — the cycle, at the speed-derived cadence
  if ((inchwormFlapMask(slot.dh) & env.frame) === 0) slot.pic = nextInchwormPic(slot.pic)
  // :2600-2603 (IW-18) — the inch
  slot.h = (slot.h + slot.dh) & 0xff
  if (slot.h === 0) {
    // :2604-2605 (IW-19/20) — removed from the active list; pts left alone
    slot.color = 0
    return { kind: 'offscreen' }
  }
  return { kind: 'moved' }
}

/**
 * SHOOT2's inchworm branch (MILLI.MAC:2111-2118): SLOW is set to 0xE0 FIRST —
 * every inchworm kill slows all critters, DDT or not (IW-34/37) — then 100
 * points, 300 by DDT (IW-35/36).
 */
export function inchwormKill(byDdt: boolean): { points: number; slow: number } {
  return { points: byDdt ? INCHWORM_DDT_PTS : INCHWORM_PTS, slow: INCHWORM_SLOW }
}
