// src/core/dragonfly.ts
//
// Story ml4-2 (GREEN) — THE DRAGONFLY: `FLYMV — ENTER AND MOVE DRAGONFLY`
// (MILLI.MAC:1004, DF-1), ported line-by-line as a pure reducer. The
// dragonfly lives in motion-object slot 12 (DF-3), spawns while the top of
// the screen wants mushrooms (the BEEMV1 curve + 0x30 with its carry trap,
// DF-7/49..52) and the centipede is nearly gone (DF-9), weaves on a
// FRAME-driven triangle wave accumulated as 8.8 fixed point through BEEHL
// (FLYMV1, DF-16..27), dives by SUBTRACTING dv (the shared BEEMV0, DF-39)
// and plants mushrooms in its wake (DF-42..48). Every constant carries a
// DF-* claim in docs/rom-study/claims/10-dragonfly-mosquito.json,
// byte-verified against reference/original-source/millipede/ by the ml1-1
// citation gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` (MLDEF.MAC:2): ROM literals quoted here are
// hex; a trailing period in the source (`12.`, `10.`) marks DECIMAL.
//
// ─── ORIENTATION (upright — the ml3-4/ml4-1 scope precedent) ────────────────
// CKF8/CKFF/CKIND are modelled clear: every EOR CKF8/CKFF is identity and
// the cocktail COMP in FLYMV3 (MILLI.MAC:1155-1157) never runs. V DECREASES
// downward: spawn at V=0xF8 (top, DF-33), off at V<4 (bottom, DF-40).
// H DECREASES rightward: H<0x0E is the RIGHT edge (DF-20), H≥0xF4 the LEFT
// (DF-21).
//
// ─── BYTE SEMANTICS ─────────────────────────────────────────────────────────
// Every field is a byte 0..255; -1 is 0xFF. Slot records are mutated in place
// (the conway.ts house style); functions are deterministic — randomness comes
// in as the POKEY register bytes RND0/RND1 on the env. The ROM's spawn-column
// reroll spin (BEEMV2, MILLI.MAC:228-232) is modelled as a DEFERRED spawn:
// spawnH returns null on the 16 invalid bytes (the logged ml4-2 Design
// Deviation).

// ─── spawn writes (DF-3/28/33/38) ───────────────────────────────────────────
export const DRAGONFLY_SLOT = 12 // BEEC+12. (MILLI.MAC:1011/:1025, DF-3)
export const DRAGONFLY_PIC = 0x1e // FLYMV3 picture (:1139, DF-28)
export const DRAGONFLY_COLOR = 0x79 // BEEMV2 on-colour (:238, DF-38)
export const DRAGONFLY_SPAWN_V = 0xf8 // BEEMV2 top row (:225, DF-33)

// ─── seams + scoring (DF-42/54/55) ──────────────────────────────────────────
export const DRAGONFLY_MUSH_V_OFFSET = 4 // the OBSTAC cell is v+4 (:131, DF-42)
export const DRAGONFLY_PTS = 500 // SHOOT2 `LDY I,5` (:2121, DF-54)
export const DRAGONFLY_DDT_PTS = 1500 // `LDY I,15` — BCD 15 hundreds (:2124, DF-55)

export interface DragonflySlot {
  /** BEEC — 0 means the slot is free. */
  color: number
  /** BEEP */
  pic: number
  /** BEEV */
  v: number
  /** BEEH */
  h: number
  /** BEEDV */
  dv: number
  /** BEEDH — an XOR direction mask over the wave (DF-19). */
  dh: number
  /** BEEHL — the fractional H byte the 8.8 step accumulates into (DF-60). */
  hl: number
  /** PTS — this slot's kill-points stamp entry (MLDEF.MAC:398, DF-56). */
  pts: number
}

export interface DragonflyEnv {
  /** FRAME byte. */
  frame: number
  /** SCORE2 — the BCD ten-thousands byte. */
  score2: number
  /** MODE bit 7 (DF-25/43). */
  attract: boolean
  /** SLOW — the slow-down-all-critters timer (MLDEF.MAC:392, DF-58). */
  slow: number
  /** NOCENT — bombing mode (MLDEF.MAC:391, DF-59). */
  nocent: number
  /** The PLAYP/PEXPLD gate (MILLI.MAC:1005-1008, DF-2). */
  playerAlive: boolean
  /** POKEY RND0 byte — the spawn column (DF-34..36). */
  rnd0: number
  /** POKEY RND1 byte — the mushroom-plant roll (DF-48). */
  rnd1: number
  /** DEAD byte (DF-5). */
  dead: number
  /** BEETLS (DF-6). */
  beetles: number
  /** MUSH+2 — mushrooms near the top (MLDEF.MAC:343, DF-57). */
  mushTop: number
  /** CENTIN (DF-9). */
  centin: number
}

export type DragonflyMove =
  | { kind: 'idle' }
  | { kind: 'offscreen' }
  | { kind: 'moved'; audioOffset: number; plantMushroom: boolean }

/** Two's complement of a byte (the ROM's COMP). */
function comp(b: number): number {
  return (0x100 - b) & 0xff
}

/** The movement sweep's dragonfly test: a live slot in the band [1E,20) (MILLI.MAC:1030-1036, DF-11/12). */
export function isDragonfly(slot: Readonly<DragonflySlot>): boolean {
  return slot.color !== 0 && slot.pic >= DRAGONFLY_PIC && slot.pic < 0x20
}

/**
 * BEEMV1 (MILLI.MAC:179-194) — the mushrooms-needed curve: 5 below 20,000
 * (DF-49), 9 to 120,000 (DF-50), the halved SCORE2 byte plus 6 beyond
 * (DF-51), capped at 0x2F (DF-52).
 */
export function mushroomsNeeded(score2: number): number {
  if (score2 < 0x02) return 0x05 // :180-182 (DF-49)
  if (score2 < 0x12) return 0x09 // :183-185 (DF-50)
  const a = (score2 >> 1) + 6 // :186-188 (DF-51)
  return a < 0x30 ? a : 0x2f // :189-191 (DF-52)
}

/**
 * FLYMV's spawn threshold (MILLI.MAC:1019, DF-7): BEEMV1 + 0x30 — ADDED WITH
 * BEEMV1'S EXIT CARRY, which is set only on the 0x2F cap path (its final CMP
 * I,30 left carry set, DF-52). Uncapped exits ran a BCC, so carry is clear.
 * Ceiling: 0x2f + 0x30 + 1 = 0x60.
 */
export function flySpawnThreshold(score2: number): number {
  const need = mushroomsNeeded(score2)
  const capped = score2 >= 0x12 && (score2 >> 1) + 6 >= 0x30
  return (need + 0x30 + (capped ? 1 : 0)) & 0xff
}

/**
 * The FLYMV start gates (MILLI.MAC:1013-1024). With the centipede alive
 * (DEAD ≠ 0, DF-5) — or dead with no beetle left (DF-6) — the top of the
 * screen must hold no more than the threshold's worth of mushrooms (CMP
 * X,MUSH+2 / BCC, DF-8); and the centipede must be under 10 (decimal)
 * segments (DF-9). The slot-free check is trySpawnDragonfly's (DF-4).
 */
export function mayStartDragonfly(env: Readonly<DragonflyEnv>): boolean {
  const mushChecked = env.dead !== 0 || env.beetles === 0 // :1014-1017 (DF-5/6)
  if (mushChecked && flySpawnThreshold(env.score2) < env.mushTop) return false // :1018-1021 (DF-7/8)
  return env.centin < 10 // :1022-1024 (DF-9; `10.` is decimal)
}

/**
 * FLYMV3's vertical speed (MILLI.MAC:1142-1153): 3 from 150,000 (DF-29),
 * 2 from 50,000 (DF-30) or in bombing mode (DF-31), else 1 (DF-32).
 */
export function dragonflySpeed(env: Readonly<DragonflyEnv>): number {
  if (env.score2 >= 0x15) return 3 // :1142-1147 (DF-29)
  if (env.score2 >= 0x05) return 2 // :1148-1150 (DF-30)
  if (env.nocent !== 0) return 2 // :1151-1152 (DF-31)
  return 1 // :1153 (DF-32)
}

/**
 * BEEMV2's spawn column (MILLI.MAC:228-234): RND0 AND F8, rejected below
 * 0x10 (DF-34/35 — null models the ROM's reroll spin as a deferred spawn),
 * minus 4 (DF-36).
 */
export function spawnH(rnd0: number): number | null {
  const masked = rnd0 & 0xf8 // :229 (DF-34)
  if (masked < 0x10) return null // :230-232 (DF-34/35) — BEQ and CMP I,10/BCC rerolls
  return (masked - 4) & 0xff // :233-234 (DF-36)
}

/**
 * The FLYMV3 + BEEMV2 spawn writes (MILLI.MAC:1139-1158, :225-240). A no-op
 * on an invalid RND0 byte (the deferred reroll — trySpawnDragonfly gates it).
 */
export function startDragonfly(slot: DragonflySlot, env: Readonly<DragonflyEnv>): void {
  const h = spawnH(env.rnd0)
  if (h === null) return
  slot.pic = DRAGONFLY_PIC // :1139-1140 (DF-28)
  slot.v = DRAGONFLY_SPAWN_V // :225-227 (DF-33; EOR CKF8 identity upright)
  slot.h = h // :233-235 (DF-36)
  slot.dh = 0 // :236-237 (DF-37)
  slot.color = DRAGONFLY_COLOR // :238-239 (DF-38)
  slot.dv = dragonflySpeed(env) // :1142-1158 (DF-29..32; cocktail COMP skipped)
}

/**
 * The whole FLYMV spawn path for slot 12 (MILLI.MAC:1005-1026): player gate
 * (DF-2), slot free (DF-4), start gates, valid spawn column.
 */
export function trySpawnDragonfly(slot: DragonflySlot, env: Readonly<DragonflyEnv>): boolean {
  if (!env.playerAlive) return false // :1005-1009 (DF-2)
  if (slot.color !== 0) return false // :1011-1012 (DF-4)
  if (!mayStartDragonfly(env)) return false // :1013-1024
  if (spawnH(env.rnd0) === null) return false // :228-232 — deferred reroll
  startDragonfly(slot, env) // :1025-1026 (DF-3)
  return true
}

/**
 * One FLYMV sweep for ONE live dragonfly (MILLI.MAC:1030-1062): the wing
 * flap (:1037-1044, DF-13/14/15), FLYMV1's horizontal weave (:1083-1136),
 * BEEMV0's vertical dive (:120-128, DF-39/40) and the mushroom-plant
 * DECISION (:139-159, DF-43..48). The OBSTAC/DDTEXP/PLAY/MUSHER seams stay
 * with their callers (the ml4-1 routing): plantMushroom is applied by the
 * caller only if the DDT/player seams didn't kill first, at the cell
 * DRAGONFLY_MUSH_V_OFFSET above (DF-42). audioOffset is FLYMV1's TEMP2+1
 * exit byte, -80..7F (:1081/:1114, DF-16) — the CHAN4/AUDC1/AUDF1 writes
 * themselves are ml6 seams.
 */
export function moveDragonfly(slot: DragonflySlot, env: Readonly<DragonflyEnv>): DragonflyMove {
  if (!env.playerAlive) return { kind: 'idle' } // :1005-1009 (DF-2) — the gate covers the sweep
  // :1037-1044 (DF-13/14/15) — flap every tick in slow mode, else odd frames
  if (env.slow !== 0 || (env.frame & 1) !== 0) slot.pic ^= 1
  // ── FLYMV1 (:1083-1136) ──
  let a = ((env.frame & 0x3f) << 2) & 0xff // :1083-1086 (DF-17)
  if (a >= 0x40 && a < 0xc0) a ^= 0x7f // :1087-1091 (DF-18) — the triangle fold
  a ^= slot.dh // :1092 (DF-19)
  if (slot.h < 0x0e) {
    // :1093-1098 (DF-20) — right edge: bounce a rightward (negative) step
    if ((a & 0x80) !== 0) {
      slot.dh ^= 0xff // :1104-1106 (DF-22)
      a = comp(a) // :1107-1108 (DF-23)
    }
  } else if (slot.h >= 0xf4) {
    // :1100-1103 (DF-21) — left edge: bounce a leftward (positive) step
    if ((a & 0x80) === 0) {
      slot.dh ^= 0xff // :1104-1106 (DF-22)
      a = comp(a) // :1107-1108 (DF-23)
    }
  }
  // :1109-1114 — first ASL + sign extend; TEMP2+1 is the audio offset (DF-16)
  let lo = (a << 1) & 0xff
  let hi = (lo & 0x80) !== 0 ? 0xff : 0x00
  const audioOffset = lo
  // :1115-1118 (DF-24) — two more ASL/ROL: ×8 of the wave, 16-bit
  for (let i = 0; i < 2; i++) {
    const carry = (lo & 0x80) !== 0 ? 1 : 0
    lo = (lo << 1) & 0xff
    hi = ((hi << 1) | carry) & 0xff
  }
  // :1120-1129 (DF-25/26) — ×16 from 30,000; attract scores as zero
  const effScore2 = env.attract ? 0 : env.score2
  if (effScore2 >= 3) {
    const carry = (lo & 0x80) !== 0 ? 1 : 0
    lo = (lo << 1) & 0xff
    hi = ((hi << 1) | carry) & 0xff
  }
  // :1130-1135 (DF-27) — BEEHL takes the fraction; its carry rides into BEEH
  const sum = slot.hl + lo
  slot.hl = sum & 0xff
  slot.h = (slot.h + hi + (sum > 0xff ? 1 : 0)) & 0xff
  // ── BEEMV0 (:120-159) ──
  slot.v = (slot.v - slot.dv) & 0xff // :122-125 (DF-39)
  if (slot.v < 4) {
    // :126-128 (DF-40) — bottom of the screen
    dragonflyOff(slot)
    return { kind: 'offscreen' }
  }
  // :139-159 (DF-43..48) — the plant decision (PLAY/OBSTAC/DDTEXP caller-side)
  let plantMushroom = false
  if (env.attract || env.nocent === 0) {
    // :139-142 (DF-43/44) — attract skips the bombing-mode veto
    if ((env.frame & 3) === 0) {
      // :143-145 (DF-45) — every fourth frame only
      const mask = slot.v >= 0x48 ? 0x01 : 0x07 // :149-155 (DF-46/47) — POST-move V
      plantMushroom = (mask & env.rnd1) === 0 // :157-159 (DF-48)
    }
  }
  return { kind: 'moved', audioOffset, plantMushroom }
}

/** BEEOFF (MILLI.MAC:166-171, DF-41): clear PTS, colour and H — the slot is freed, V untouched. */
export function dragonflyOff(slot: DragonflySlot): void {
  slot.pts = 0 // :166-167 (DF-41/56)
  slot.color = 0 // :168
  slot.h = 0 // :169 — prevents blanking other motion objects
}

/** SHOOT2's dragonfly branch (MILLI.MAC:2121-2124): 500 points, 1500 by DDT (DF-53/54/55). */
export function dragonflyKill(byDdt: boolean): { points: number } {
  return { points: byDdt ? DRAGONFLY_DDT_PTS : DRAGONFLY_PTS }
}
