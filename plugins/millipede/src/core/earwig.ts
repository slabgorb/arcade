// src/core/earwig.ts
//
// Story ml4-3 (GREEN) — THE EARWIG: `EARWIG — MOVE AND START EARWIG`
// (MILLI.MAC:672, EW-1), ported line-by-line as a pure reducer. The earwig
// shares motion-object slot 12 with the bee/dragonfly/mosquito (EW-3), starts
// only on the FRAME==0 tick — once every 256 frames (EW-6) — on
// small-centipede waves (EW-7/8) with a 1-in-4 RND0 roll (EW-9), and walks a
// pure HORIZONTAL line across the upper half of the screen (dv stays 0,
// EW-21): H += dh each tick (EW-25) until H wraps to exactly 0 and BEEOFF
// frees the slot (EW-26/27). Any mushroom stamp it crosses is POISONED — AND
// 0xFB (EW-34/35/36) — and a stamp inside [CLOUD, DDT) kills it via the
// DDTEX1 seam (EW-31..33). Killed, it scores 1000 — 3000 by DDT (EW-40/41).
// Every constant carries an EW-* claim in
// docs/rom-study/claims/11-earwig-inchworm-bee.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` (MLDEF.MAC:2): ROM literals quoted here are
// hex; a trailing period in the source (`11.`, `12.`) marks DECIMAL.
//
// ─── ORIENTATION (upright — the ml3-4/ml4-1 scope precedent) ────────────────
// The :723 EOR CKF8 is identity upright; cocktail is ml8-3. The earwig never
// dives: V is set once at spawn in the upper half, (rndV & 0x78) + 0x70 =
// 0x70..0xE8 (EW-22/23/24).
//
// ─── BYTE SEMANTICS ─────────────────────────────────────────────────────────
// Every field is a byte 0..255; -1 is 0xFF. Slot records are mutated in place
// (the conway.ts house style); functions are deterministic — randomness comes
// in as POKEY register bytes on the env. EARWIG reads the live RND0 register
// FOUR times (:692/:702/:706/:719), so the env carries each read as its own
// byte (rnd0/rndSpeed/rndDir/rndV): collapsing them onto one byte would
// correlate the 1-in-4 gate with the slow roll (both AND 3) and force every
// over-20k earwig slow. The BEEOFF port is a module-local copy (one
// standalone subsystem per file, the ml4-1 rule). CHAN9 sound is an ml6 seam;
// the OBSTAC read and the DDTEX1 death sequence stay with their callers —
// earwigStamp classifies the stamp the caller read.

// The BEEOFF/COMP ports now live once in ./bee-family (ml4-6). comp is internal;
// earwigOff aliases the shared beeOff.
import { comp, beeOff } from './bee-family'

// ─── spawn writes (EW-3/10/11) ──────────────────────────────────────────────
export const EARWIG_SLOT = 12 // BEEC+12. (MILLI.MAC:677, EW-3)
export const EARWIG_PIC = 0x1c // spawn picture (:695, EW-10)
export const EARWIG_COLOR = 0xb9 // spawn colour (:697, EW-11)

// ─── stamps + scoring (EW-34/37/38/40/41) ───────────────────────────────────
export const CLOUD_STAMP = 0x2e // CLOUD equate (MLDEF.MAC:202, EW-37)
export const DDT_STAMP = 0x6e // DDT equate (MLDEF.MAC:203, EW-38)
export const MUSHROOM_STAMP_MIN = 0x7c // CMP I,7C (MILLI.MAC:756, EW-34)
export const EARWIG_PTS = 1000 // `LDY I,10` — BCD 10 hundreds (:2134, EW-40)
export const EARWIG_DDT_PTS = 3000 // `LDY I,30` — BCD 30 hundreds (:2139, EW-41)

export interface EarwigSlot {
  /** BEEC — 0 means the slot is free. */
  color: number
  /** BEEP */
  pic: number
  /** BEEV */
  v: number
  /** BEEH */
  h: number
  /** BEEDV — cleared at spawn, the earwig never dives (EW-21). */
  dv: number
  /** BEEDH — signed walk step, ADDED each tick (EW-25). */
  dh: number
  /** PTS — this slot's kill-points stamp entry (MLDEF.MAC:398). */
  pts: number
}

export interface EarwigEnv {
  /** FRAME byte (EW-6/28). */
  frame: number
  /** SCORE2 — the BCD ten-thousands byte (EW-12). */
  score2: number
  /** The PLAYP/PEXPLD gate (MILLI.MAC:673-676, EW-2). */
  playerAlive: boolean
  /** CENTIN (EW-7/8). */
  centin: number
  /** 1st RND0 read — the 1-in-4 gate (:692, EW-9). */
  rnd0: number
  /** 2nd RND0 read — the slow roll (:702, EW-13). */
  rndSpeed: number
  /** 3rd RND0 read — the direction bit (:706, EW-15). */
  rndDir: number
  /** 4th RND0 read — the spawn row (:719, EW-22). */
  rndV: number
}

export type EarwigMove = { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }
export type EarwigStamp =
  | { kind: 'none' }
  | { kind: 'ddt-death' }
  | { kind: 'poison'; stamp: number }

/** The occupancy test: a live slot in the band [1C,1E) (MILLI.MAC:679-683, EW-4/5). */
export function isEarwig(slot: Readonly<EarwigSlot>): boolean {
  return slot.color !== 0 && slot.pic >= EARWIG_PIC && slot.pic < 0x1e
}

/** The spawn tick (MILLI.MAC:686-687, EW-6): the FULL frame byte must be 0 — every 4 seconds. */
export function earwigSpawnTick(frame: number): boolean {
  return frame === 0
}

/** The start gates (MILLI.MAC:686-694): the tick, CENTIN under decimal 11 (EW-7/8), the 1-in-4 roll (EW-9). */
export function mayStartEarwig(env: Readonly<EarwigEnv>): boolean {
  if (!earwigSpawnTick(env.frame)) return false // :686-687 (EW-6)
  if (env.centin >= 11) return false // :689-691 (EW-7/8; `11.` is decimal)
  return (env.rnd0 & 0x03) === 0 // :692-694 (EW-9)
}

/**
 * The speed pick (MILLI.MAC:699-714): always slow (1) below 20,000 (EW-12/17);
 * from 20,000 a FRESH RND0 read AND 3 equal to zero still rolls slow (EW-13),
 * else fast 2 (EW-14).
 */
export function earwigSpeed(env: Readonly<EarwigEnv>): number {
  if (env.score2 < 0x02) return 1 // :699-701 (EW-12)
  return (env.rndSpeed & 0x03) === 0 ? 1 : 2 // :702-705 (EW-13/14)
}

/**
 * The spawn writes (MILLI.MAC:695-724): picture 1C (EW-10), colour B9
 * (EW-11), dh = ±speed by rndDir bit 7 (EW-15/16/17/18/19), H at the edge
 * (EW-20), dv cleared (EW-21), V in the upper half (EW-22/23/24).
 */
export function startEarwig(slot: EarwigSlot, env: Readonly<EarwigEnv>): void {
  slot.pic = EARWIG_PIC // :695-696 (EW-10)
  slot.color = EARWIG_COLOR // :697-698 (EW-11)
  const speed = earwigSpeed(env) // :699-714 (EW-12/13/14/17)
  slot.dh = (env.rndDir & 0x80) !== 0 ? comp(speed) : speed // :706-715 (EW-15/16/18/19)
  slot.h = 0 // :716-717 (EW-20)
  slot.dv = 0 // :718 (EW-21)
  slot.v = ((env.rndV & 0x78) + 0x70) & 0xff // :719-724 (EW-22/23/24; EOR CKF8 identity)
}

/**
 * The whole EARWIG spawn path for slot 12 (MILLI.MAC:673-698): player gate
 * (EW-2), slot free (EW-3), the tick/CENTIN/roll gates.
 */
export function trySpawnEarwig(slot: EarwigSlot, env: Readonly<EarwigEnv>): boolean {
  if (!env.playerAlive) return false // :673-676 (EW-2)
  if (slot.color !== 0) return false // :677-678 (EW-3)
  if (!mayStartEarwig(env)) return false // :686-694
  startEarwig(slot, env)
  return true
}

/**
 * One EARWIG move tick (MILLI.MAC:729-745): H += dh FIRST (EW-25); a sum of
 * exactly 0 is offscreen via BEEOFF with NO flap that tick (EW-26/27); else
 * the picture flaps every fourth frame (EW-28/29). The OBSTAC read (EW-30)
 * stays with the caller — earwigStamp classifies what it read.
 */
export function moveEarwig(slot: EarwigSlot, env: Readonly<EarwigEnv>): EarwigMove {
  if (!env.playerAlive) return { kind: 'idle' } // :673-676 (EW-2) — the gate covers the move
  // :729-732 (EW-25) — the walk
  slot.h = (slot.h + slot.dh) & 0xff
  if (slot.h === 0) {
    // :734-738 (EW-26/27) — off screen, before the flap ever runs
    earwigOff(slot)
    return { kind: 'offscreen' }
  }
  // :740-745 (EW-28/29) — flap every fourth frame
  if ((env.frame & 0x03) === 0) slot.pic ^= 1
  return { kind: 'moved' }
}

/**
 * The stamp decision (MILLI.MAC:749-759): [CLOUD, DDT) dies via the DDTEX1
 * seam (EW-31/32/33); a mushroom (>= 7C) is poisoned — bit 2 cleared, the
 * caller writes it back (EW-34/35/36); everything else is left alone.
 */
export function earwigStamp(stamp: number): EarwigStamp {
  if (stamp >= CLOUD_STAMP && stamp < DDT_STAMP) return { kind: 'ddt-death' } // :749-754
  if (stamp >= MUSHROOM_STAMP_MIN) return { kind: 'poison', stamp: stamp & 0xfb } // :756-759
  return { kind: 'none' }
}

/** BEEOFF (MILLI.MAC:166-171, EW-27): clear PTS, colour and H — the slot is freed, V untouched. The shared ./bee-family beeOff, aliased to preserve the EarwigSlot signature. */
export const earwigOff: (slot: EarwigSlot) => void = beeOff

/** SHOOT2's earwig branch (MILLI.MAC:2134-2139): 1000 points, 3000 by DDT (EW-40/41). */
export function earwigKill(byDdt: boolean): { points: number } {
  return { points: byDdt ? EARWIG_DDT_PTS : EARWIG_PTS }
}
