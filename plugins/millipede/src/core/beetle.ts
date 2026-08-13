// src/core/beetle.ts
//
// Story ml4-1 (GREEN) — THE BEETLE: `BEETL — MOVE AND START BEETLE`
// (MILLI.MAC:243, BT-1), ported line-by-line as a pure reducer. The beetle
// borrows the centipede's motion-object slots (NCENT, MLDEF.MAC:188, BT-2),
// enters on the "row about new heads", walks an L-shaped patrol timed by
// BEETL1 (MILLI.MAC:392), and turns the mushrooms it crosses into
// indestructible ROCKs (MILLI.MAC:373-377, BT-34/35). Every constant carries
// a BT-* claim in docs/rom-study/claims/09-beetle-spider.json, byte-verified
// against reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` (MLDEF.MAC:2): ROM literals quoted here are
// hex; a trailing period in the source (`12.`) marks DECIMAL.
//
// ─── ORIENTATION (upright — the ml3-4 scope precedent) ──────────────────────
// CKF8/CKFF are modelled clear: every `EOR CKF8` is identity and the vertical
// unit is +1 (`LDA CKFF / ORA I,1`, MILLI.MAC:406, BT-37). V DECREASES
// downward: V<9 is the bottom row, V≥F0 the cocktail top (MILLI.MAC:409-413).
//
// ─── BYTE SEMANTICS ─────────────────────────────────────────────────────────
// Every field is a byte 0..255; -1 is 0xFF. Slot records are mutated in place
// (the conway.ts house style); functions are deterministic — randomness comes
// in as the POKEY register bytes RND0/RND1 on the env.

// ─── slot pool (MLDEF.MAC:188, BT-2) ────────────────────────────────────────
export const NCENT = 12

// ─── spawn writes (MILLI.MAC:287-305, BT-18..22) ────────────────────────────
export const BEETLE_COLOR = 0xb9 // MOBJC on-colour (:289, BT-18)
export const BEETLE_SPAWN_V = 0x48 // "ROW ABOUT NEW HEADS" (:291, BT-19)
export const BEETLE_PIC = 0x34 // picture code (:302, BT-21)
export const BEETLE_TURN_TIMER = 0x0c // MOBJHL delay (:304, BT-22)

// ─── difficulty + scoring (BT-4/43/44) ──────────────────────────────────────
export const DIP_BEETLE_HARD = 0x02 // OPTNS1 D1 (MLDEF.MAC:88; MILLI.MAC:268)
export const BEETLE_PTS = 300 // SHOOT2 `LDY I,3` (MILLI.MAC:2091, BT-43)
export const BEETLE_DDT_PTS = 900 // `LDY I,9` (MILLI.MAC:2096, BT-44)

// ─── playfield stamp bands the obstacle reaction reads ──────────────────────
// (module-local: the spider carries its own copies — each file is one
// standalone subsystem, like the ROM's shared includes)
const CLOUD = 0x2e // MLDEF.MAC:202 (BT-32)
const DDT = 0x6e // MLDEF.MAC:203 — first DDT bomb stamp
const ROCK = 0x70 // MLDEF.MAC:204 (BT-33)
const MUSHROOM_CONVERT_MIN = 0x75 // `CMP I,75` (MILLI.MAC:373, BT-34)
const BACKGROUND_BIT = 0x80

export interface BeetleSlot {
  /** MOBJC — 0 means the slot is free. */
  color: number
  /** MOBJP */
  pic: number
  /** MOBJV */
  v: number
  /** MOBJH */
  h: number
  /** MOBJDV */
  dv: number
  /** MOBJDH */
  dh: number
  /** MOBJHL — the BEETL1 direction-change timer. */
  timer: number
}

export interface BeetleCounts {
  /** BEETLS (MLDEF.MAC:369) — active beetles. */
  beetles: number
  /** BEETLA (MLDEF.MAC:370) — beetles still allowed this wave. */
  allowed: number
}

export interface BeetleEnv {
  /** FRAME byte. */
  frame: number
  /** SCORE2 — the BCD ten-thousands byte. */
  score2: number
  /** The PLAYP/PEXPLD gate (MILLI.MAC:244-248, BT-5). */
  playerAlive: boolean
  /** DEAD ≠ 0 (MILLI.MAC:262-263, BT-11). */
  centipedeAlive: boolean
  /** CENTIN (MILLI.MAC:264-266, BT-12). */
  centin: number
  /** NEWD ≠ 0 (MILLI.MAC:270-271, BT-13). */
  sideFeed: boolean
  /** OPTNS1 & DIP_BEETLE_HARD — the D1 difficulty (BT-4). */
  hard: boolean
  /** POKEY RND0 byte — BEETL1's timer randomness (BT-40/41). */
  rnd0: number
  /** POKEY RND1 byte — the start direction (BT-20). */
  rnd1: number
}

export type BeetleObstacle = { kind: 'die' } | { kind: 'rock'; cell: number } | { kind: 'none' }

/** Two's complement of a byte (the ROM's COMP). */
function comp(b: number): number {
  return (0x100 - b) & 0xff
}

/** The movement sweep's beetle test: a live slot in the band [34,38) (MILLI.MAC:323-329, BT-26/27). */
export function isBeetle(slot: Readonly<BeetleSlot>): boolean {
  return slot.color !== 0 && slot.pic >= BEETLE_PIC && slot.pic < BEETLE_PIC + 4
}

/** Concurrency allowance by score: 1 below 90k, 2 below 250k, 3 after (MILLI.MAC:272-279, BT-14/15). */
export function beetleAllowed(score2: number): number {
  if (score2 < 0x09) return 1
  if (score2 < 0x25) return 2
  return 3
}

/**
 * The spawn cadence (MILLI.MAC:252-260, BT-7..10): mask 7F below 600,000,
 * 3F after; a tick fires when (FRAME AND mask) == 37.
 */
export function beetleSpawnTick(frame: number, score2: number): boolean {
  const mask = score2 < 0x60 ? 0x7f : 0x3f
  return (frame & mask) === 0x37
}

/**
 * The whole BEETL start gate (MILLI.MAC:244-315). Returns the started slot
 * index, or -1 with nothing written. On success: slot written per BT-18..22,
 * BEETLS incremented, BEETLA decremented (:287-288), and dh doubled for a
 * fast beetle (BT-23/24/25).
 */
export function startBeetle(
  slots: BeetleSlot[],
  counts: BeetleCounts,
  env: Readonly<BeetleEnv>,
): number {
  if (!env.playerAlive) return -1 // :244-248 (BT-5)
  if (counts.allowed === 0) return -1 // :250-251 (BT-6)
  if (!beetleSpawnTick(env.frame, env.score2)) return -1 // :252-260 (BT-10)
  if (!env.centipedeAlive) return -1 // :261-263 (BT-11)
  if (env.centin >= 12) return -1 // :264-266 (BT-12)
  if (!env.hard && env.sideFeed) return -1 // :267-271 (BT-13)
  // :272-281 (BT-14/15/16) — blocked only when BEETLS EQUALS the allowance
  if (counts.beetles === beetleAllowed(env.score2)) return -1
  // :282-286 (BT-17) — scan NCENT-1 down to 0 for a free entry
  let idx = -1
  for (let x = NCENT - 1; x >= 0; x--) {
    if (slots[x].color === 0) {
      idx = x
      break
    }
  }
  if (idx < 0) return -1
  counts.beetles = (counts.beetles + 1) & 0xff // :287
  counts.allowed = (counts.allowed - 1) & 0xff // :288
  const s = slots[idx]
  s.color = BEETLE_COLOR // :289-290 (BT-18)
  s.v = BEETLE_SPAWN_V // :291-293 (BT-19; EOR CKF8 identity upright)
  s.dv = 0 // :294-295
  s.h = 0 // :296
  s.dh = (env.rnd1 & 0x80) !== 0 ? 0x01 : 0xff // :297-301 (BT-20)
  s.pic = BEETLE_PIC // :302-303 (BT-21)
  s.timer = BEETLE_TURN_TIMER // :304-305 (BT-22)
  // :306-315 (BT-23/24/25) — fast beetle when SCORE2 exceeds the DIP threshold
  const threshold = env.hard ? 0x29 : 0x39
  if (env.score2 > threshold) s.dh = (s.dh << 1) & 0xff
  return idx
}

/**
 * BEETL1 (MILLI.MAC:392-443) — the direction-change timer. A fast beetle
 * (even direction bytes) decrements twice; only the SECOND decrement's zero
 * turns (BT-36 — a fast timer of 1 sails past zero to FF).
 */
function beetl1(slot: BeetleSlot, env: Readonly<BeetleEnv>): void {
  if (((slot.dv | slot.dh) & 1) === 0) slot.timer = (slot.timer - 1) & 0xff // :392-396
  slot.timer = (slot.timer - 1) & 0xff // :397
  if (slot.timer !== 0) return // :398-399
  const onRow = slot.v >= 0xf0 || slot.v < 0x09 // :409-413 / :430-433
  if (slot.dv === 0) {
    // horizontal → vertical (:401-426)
    const unit = (slot.dh & 1) === 1 ? 1 : 2 // :403-408 (BT-37; ASL for fast)
    if (!onRow) {
      slot.dv = comp(unit) // :414-415 (BT-38) — continue to the bottom row
      slot.timer = 0x40 // :416-417 (BT-39)
    } else {
      slot.dv = unit // :420 — climb back off the row
      slot.timer = ((env.rnd0 & 0x38) + 0x40) & 0xff // :421-425 (BT-40)
    }
  } else {
    // vertical → horizontal (:428-443)
    slot.dv = 0 // :428-429
    if (!onRow) {
      slot.timer = (slot.timer - 1) & 0xff // :435 (BT-42) — 0 → FF, off the screen
    } else {
      slot.timer = ((env.rnd0 & 0x78) + 0x60) & 0xff // :438-442 (BT-41)
    }
  }
}

/**
 * One movement sweep for ONE slot (MILLI.MAC:323-352 + BEETL1): animation,
 * position step, off-screen clear, turn timer. Returns 'offscreen' when the
 * slot was cleared (BT-30), null otherwise (including non-beetle no-ops).
 * The OBSTAC lookup is the caller's seam (ml3-3) — apply beetleObstacle to
 * the cell at the NEW position.
 */
export function moveBeetle(
  slot: BeetleSlot,
  counts: BeetleCounts,
  env: Readonly<BeetleEnv>,
): 'offscreen' | null {
  if (!env.playerAlive) return null // the BEETL entry gate covers the sweep too (BT-5)
  if (!isBeetle(slot)) return null // :323-329 (BT-26/27)
  // :330-337 (BT-28/29) — the picture advances only every 4th frame
  if ((env.frame & 3) === 0) slot.pic = ((slot.pic + 1) & 3) | BEETLE_PIC
  if (slot.dv !== 0) {
    slot.v = (slot.v + slot.dv) & 0xff // :338-343 — vertical only
  } else {
    slot.h = (slot.h + slot.dh) & 0xff // :345-348
    if (slot.h === 0) {
      // :349-352 (BT-30) — off the screen: clear the slot, drop the count
      slot.color = 0
      counts.beetles = (counts.beetles - 1) & 0xff
      return 'offscreen'
    }
  }
  beetl1(slot, env) // :354
  return null
}

/**
 * The pure reaction to an obstacle cell (MILLI.MAC:360-378). Takes the RAW
 * field byte — OBSTAC hands its caller the code AND 7F (MLSUB.MAC:888,
 * BT-46) and the conversion re-reads the raw cell for bit 7 (BT-35).
 */
export function beetleObstacle(cell: number): BeetleObstacle {
  const code = cell & 0x7f
  if (code >= CLOUD && code < DDT) return { kind: 'die' } // :360-370 (BT-31)
  if (code >= MUSHROOM_CONVERT_MIN) {
    // :373-378 (BT-34/35) — growing and poisoned mushrooms included
    return { kind: 'rock', cell: (cell & BACKGROUND_BIT) | ROCK }
  }
  return { kind: 'none' }
}

/** SHOOT2's beetle branch (MILLI.MAC:2087-2097): 300 points, 900 by DDT, and the playfield scrolls down (BT-43/44/45). */
export function beetleKill(byDdt: boolean): { points: number; scrollDown: true } {
  return { points: byDdt ? BEETLE_DDT_PTS : BEETLE_PTS, scrollDown: true }
}
