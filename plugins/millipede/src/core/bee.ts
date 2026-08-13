// src/core/bee.ts
//
// Story ml4-3 (GREEN) — THE BEE: `BEEMV — MOVE BEE DOWN SCREEN`
// (MILLI.MAC:56, BE-1), ported line-by-line as a pure reducer. The bee spawns
// into motion-object slot 12 (BE-3) when few mushrooms remain near the BOTTOM
// — the BEEMV1 needed-count against MUSH (BE-8/9) — or DIRECTLY when the
// centipede is dead, a beetle survives and CENTIN >= 10 (BE-7). It dives
// straight down: dh 0 (BE-42), V minus dv each tick through the shared BEEMV0
// (BE-16/17), planting mushrooms in its wake on a 1-in-4 RND1 roll — mask 3,
// everywhere on screen, unlike the dragonfly's area-halved mask (BE-23/24).
// Its signature is the TWO-HIT kill: SHOOT2 compares the slot dv against 4 —
// a first hit STORES the 4 (the bee speeds up, NO score, BE-45/49/50); only a
// bee already at dv 4 explodes, for 200 — 600 by DDT (BE-44..48). Every
// constant carries a BE-* claim in
// docs/rom-study/claims/11-earwig-inchworm-bee.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate. Per the
// ml4-2 Delivery Finding, the BEEMV1/BEEMV2/BEEOFF claims crib the DF-33..52
// ground the dragonfly story broke, re-cited as BE-*.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` (MLDEF.MAC:2): ROM literals quoted here are
// hex; a trailing period in the source (`12.`, `10.`) marks DECIMAL.
//
// ─── ORIENTATION (upright — the ml3-4/ml4-1 scope precedent) ────────────────
// The :225-226 and :2103-2104 EOR CKF8 are identity upright; cocktail is
// ml8-3. V DECREASES downward: spawn at V=0xF8 (top, BE-38), off at V<4
// (bottom, BE-18). The bee flies STRAIGHT down: dh is 0 at spawn (BE-42) and
// nothing moves H.
//
// ─── BYTE SEMANTICS ─────────────────────────────────────────────────────────
// Every field is a byte 0..255; -1 is 0xFF. Slot records are mutated in place
// (the conway.ts house style); functions are deterministic — randomness comes
// in as the POKEY register bytes RND0/RND1 on the env. The BEEMV1/BEEMV2/
// BEEOFF ports are module-local copies (one standalone subsystem per file,
// the ml4-1 rule — this is the family's THIRD consumer; the extraction call
// is routed as a Delivery Finding, not taken silently here). The BEEMV2
// reroll spin is the same deferred-spawn model as ml4-2's (the logged ml4-3
// Design Deviation). The SECURA block in BEEMV3 (:204-217) is anti-piracy,
// not modelled. CHAN7/AUDF1 sound — including the sweep's lowest-frequency
// fold across slots (:82-83/:97-106/:111-112) — is an ml6 seam; the
// OBSTAC/DDTEXP/PLAY/MUSHER seams stay with their callers, which plant at
// v + BEE_MUSH_V_OFFSET.

// The BEEMV1/BEEMV2/BEEOFF ports now live once in ./bee-family (ml4-6) — this
// file re-exports them so its public surface is unchanged for callers/tests.
import { mushroomsNeeded, spawnH, beeOff } from './bee-family'
export { mushroomsNeeded, spawnH, beeOff }

// ─── spawn writes (BE-3/37/38/43) ───────────────────────────────────────────
export const BEE_SLOT = 12 // BEEC+12. (MILLI.MAC:66/:80, BE-3/10)
export const BEE_PIC = 0x38 // BEEMV3 picture (:223, BE-37)
export const BEE_COLOR = 0x79 // BEEMV2 on-colour (:238, BE-43)
export const BEE_SPAWN_V = 0xf8 // BEEMV2 top row (:225, BE-38)

// ─── seams + scoring (BE-19/45/46/47) ───────────────────────────────────────
export const BEE_MUSH_V_OFFSET = 4 // the plant cell is v+4 (:131, BE-19)
export const BEE_PTS = 200 // `LDY I,2` — BCD 2 hundreds (:2099, BE-45)
export const BEE_DDT_PTS = 600 // `LDY I,6` — BCD 6 hundreds (:2102, BE-46)
export const BEE_HIT_DV = 4 // the two-hit compare byte (:2103-2107, BE-47/49)

export interface BeeSlot {
  /** BEEC — 0 means the slot is free. */
  color: number
  /** BEEP */
  pic: number
  /** BEEV */
  v: number
  /** BEEH */
  h: number
  /** BEEDV — the dive speed; 4 marks a once-hit bee (BE-49). */
  dv: number
  /** BEEDH — cleared at spawn, the bee never drifts (BE-42). */
  dh: number
  /** PTS — this slot's kill-points stamp entry (MLDEF.MAC:398, BE-51). */
  pts: number
}

export interface BeeEnv {
  /** FRAME byte (BE-14/22). */
  frame: number
  /** SCORE2 — the BCD ten-thousands byte. */
  score2: number
  /** MODE bit 7 (BE-20). */
  attract: boolean
  /** NOCENT — bombing mode (BE-21). */
  nocent: number
  /** The PLAYP/PEXPLD gate (MILLI.MAC:60-63, BE-2). */
  playerAlive: boolean
  /** POKEY RND0 byte — the spawn column (BE-39..41). */
  rnd0: number
  /** POKEY RND1 byte — the mushroom-plant roll (BE-25). */
  rnd1: number
  /** CENTIN (BE-7). */
  centin: number
  /** DEAD (BE-5). */
  dead: number
  /** BEETLS (BE-6/7). */
  beetles: number
  /** MUSH — mushrooms near the BOTTOM (BE-9; the dragonfly reads MUSH+2, the top). */
  mush: number
}

export type BeeMove =
  | { kind: 'idle' }
  | { kind: 'offscreen' }
  | { kind: 'moved'; plantMushroom: boolean }
export type BeeHit = { kind: 'speedup' } | { kind: 'killed'; points: number }

/** The movement sweep's bee test: a live slot in the band [38,3A) (MILLI.MAC:84-90, BE-12/13). */
export function isBee(slot: Readonly<BeeSlot>): boolean {
  return slot.color !== 0 && slot.pic >= BEE_PIC && slot.pic < 0x3a
}

/**
 * The BEEMV start gates (MILLI.MAC:68-78): with the centipede dead, a beetle
 * on screen and CENTIN >= decimal 10, the bee spawns DIRECTLY (BE-7); every
 * other path runs the mushroom check — BEEMV1's needed count must reach MUSH,
 * the near-bottom tally (BE-5/6/8/9). The slot-free check is trySpawnBee's.
 */
export function mayStartBee(env: Readonly<BeeEnv>): boolean {
  if (env.dead === 0 && env.beetles !== 0 && env.centin >= 10) return true // :70-75 (BE-5/6/7; `10.` is decimal)
  return mushroomsNeeded(env.score2) >= env.mush // :76-78 (BE-8/9) — CMP X,MUSH / BCC blocks
}

/** BEEMV3's dive speed (MILLI.MAC:199-218): 2 below 60,000, 3 from 60,000 (BE-34/35/36; SECURA skipped). */
export function beeSpeed(score2: number): number {
  return score2 >= 0x06 ? 3 : 2
}

/**
 * The BEEMV3 + BEEMV2 spawn writes (MILLI.MAC:197-240): dv = speed (BE-34/35/36),
 * picture 38 (BE-37), the shared position/colour init (BE-38..43). A no-op on
 * an invalid RND0 byte (the deferred reroll — trySpawnBee gates it).
 */
export function startBee(slot: BeeSlot, env: Readonly<BeeEnv>): void {
  const h = spawnH(env.rnd0)
  if (h === null) return
  slot.dv = beeSpeed(env.score2) // :199-222 (BE-34/35/36; cocktail COMP skipped)
  slot.pic = BEE_PIC // :223-224 (BE-37)
  slot.v = BEE_SPAWN_V // :225-227 (BE-38; EOR CKF8 identity upright)
  slot.h = h // :233-235 (BE-41)
  slot.dh = 0 // :236-237 (BE-42)
  slot.color = BEE_COLOR // :238-239 (BE-43)
}

/**
 * The whole BEEMV spawn path for slot 12 (MILLI.MAC:60-80): player gate
 * (BE-2), slot free (BE-4), the start gates, valid spawn column.
 */
export function trySpawnBee(slot: BeeSlot, env: Readonly<BeeEnv>): boolean {
  if (!env.playerAlive) return false // :60-64 (BE-2)
  if (slot.color !== 0) return false // :66-67 (BE-4)
  if (!mayStartBee(env)) return false // :68-78
  if (spawnH(env.rnd0) === null) return false // :228-232 — deferred reroll
  startBee(slot, env) // :79-80 (BE-10)
  return true
}

/**
 * One BEEMV sweep tick for ONE live bee (MILLI.MAC:84-128, :139-159): the
 * wing flap on EVEN frames — the opposite parity from the mosquito, with NO
 * slow-mode override (:91-96, BE-14/15) — then BEEMV0's dive (:120-125,
 * BE-16/17), the V<4 exit via beeOff (:126-128, BE-18), and the plant
 * DECISION (:139-159): mask 3 everywhere (BE-23/24), every fourth frame
 * (BE-22), vetoed by NOCENT outside attract (BE-20/21). The OBSTAC/DDTEXP/
 * PLAY/MUSHER seams stay with their callers, which plant at
 * v + BEE_MUSH_V_OFFSET (BE-19).
 */
export function moveBee(slot: BeeSlot, env: Readonly<BeeEnv>): BeeMove {
  if (!env.playerAlive) return { kind: 'idle' } // :60-64 (BE-2) — the gate covers the sweep
  // :91-96 (BE-14/15) — flap on even frames only
  if ((env.frame & 0x01) === 0) slot.pic ^= 1
  // :120-125 (BE-17) — the dive
  slot.v = (slot.v - slot.dv) & 0xff
  if (slot.v < 4) {
    // :126-128 (BE-18) — bottom of the screen
    beeOff(slot)
    return { kind: 'offscreen' }
  }
  // :139-159 (BE-20..25) — the plant decision (PLAY/OBSTAC/DDTEXP caller-side)
  let plantMushroom = false
  if (env.attract || env.nocent === 0) {
    // :139-142 (BE-20/21) — attract skips the bombing-mode veto
    if ((env.frame & 0x03) === 0) {
      // :143-145 (BE-22) — every fourth frame only
      plantMushroom = (0x03 & env.rnd1) === 0 // :146-148, :157-159 (BE-23/24/25) — mask 3, everywhere
    }
  }
  return { kind: 'moved', plantMushroom }
}

/**
 * SHOOT2's bee branch (MILLI.MAC:2099-2108) — the TWO-HIT kill. A slot dv not
 * yet 4 takes the hit as a SPEED-UP: the 4 is stored and nothing scores, even
 * in a DDT cloud (BE-47/49/50). A dv already 4 explodes: 200 points, 600 by
 * DDT (BE-44/45/46/48).
 */
export function beeHit(slot: BeeSlot, byDdt: boolean): BeeHit {
  if (slot.dv === BEE_HIT_DV) {
    // :2105-2106 (BE-44/48) — second hit: time to explode
    return { kind: 'killed', points: byDdt ? BEE_DDT_PTS : BEE_PTS }
  }
  slot.dv = BEE_HIT_DV // :2107 (BE-49) — speed up on first hit
  return { kind: 'speedup' } // :2108 (BE-50) — carry clear, no scoring yet
}
