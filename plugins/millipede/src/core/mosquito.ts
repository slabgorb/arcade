// src/core/mosquito.ts
//
// Story ml4-2 (GREEN) — THE MOSQUITO: `MOSQT — ENTER AND MOVE THE MOSQUITO`
// (MILLI.MAC:1324, MQ-1), ported line-by-line as a pure reducer. The
// mosquito shares motion-object slot 12 with the bee and dragonfly (MQ-3),
// enters on a frame-counter tick — masked FRAME equal to 0x17, twice as
// often from 70,000 (MQ-4/5/6) — once the centipede is short (MQ-7), and
// flies a random DIAGONAL: BEEDH is ±speed by RND1 bit 7 (MQ-24/25), ADDED
// to H with a wall bounce that keeps the overshoot (MQ-13..16), while V
// SUBTRACTS the speed (MQ-17). It plants NO mushrooms (MQ-19). Killed, it
// scores 400 — 1200 by DDT — and the playfield scrolls UP (MQ-26..30).
// Every constant carries an MQ-* claim in
// docs/rom-study/claims/10-dragonfly-mosquito.json, byte-verified against
// reference/original-source/millipede/ by the ml1-1 citation gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC inherits `.RADIX 16` (MLDEF.MAC:2): ROM literals quoted here are
// hex; a trailing period in the source (`12.`, `36.`) marks DECIMAL.
//
// ─── ORIENTATION (upright — the ml3-4/ml4-1 scope precedent) ────────────────
// CKFF/CKIND are modelled clear: the :1385 EOR CKFF is identity and MOSQT3's
// cocktail COMP (:1427-1429) never runs. V DECREASES downward: spawn at
// V=0xF8 (top), off at V<4 (bottom, MQ-18). H DECREASES rightward: H<0x0C is
// the RIGHT wall, H≥0xF5 the LEFT (MQ-14/15). The SECURA copy-protection
// block (:1417-1425) is anti-piracy, not game behaviour — on genuine
// hardware it falls through to the fast speed.
//
// ─── BYTE SEMANTICS ─────────────────────────────────────────────────────────
// Every field is a byte 0..255; -1 is 0xFF. Slot records are mutated in place
// (the conway.ts house style); functions are deterministic — randomness comes
// in as the POKEY register bytes RND0/RND1 on the env. The BEEMV2 spawn bytes
// are module-local copies (one standalone subsystem per file, the ml4-1
// rule), and its reroll spin is the same deferred-spawn model as the
// dragonfly's (the logged ml4-2 Design Deviation).

// The BEEMV2/BEEOFF/COMP ports now live once in ./bee-family (ml4-6). spawnH is
// re-exported so this file's public surface is unchanged; comp is internal;
// mosquitoOff aliases the shared beeOff.
import { comp, spawnH, beeOff } from './bee-family'
export { spawnH }

// ─── spawn writes (MQ-3/20/21) ──────────────────────────────────────────────
export const MOSQUITO_SLOT = 12 // BEEC+12. (MILLI.MAC:1331/:1345, MQ-3)
export const MOSQUITO_PIC = 0x0e // MOSQT3 picture (:1405, MQ-20)
export const MOSQUITO_COLOR = 0x79 // BEEMV2 on-colour (:238, MQ-21)
export const MOSQUITO_SPAWN_V = 0xf8 // BEEMV2 top row (:225, MQ-21)

// ─── scoring (MQ-28/29) ─────────────────────────────────────────────────────
export const MOSQUITO_PTS = 400 // SHOOT2 `LDY I,4` (:2128, MQ-28)
export const MOSQUITO_DDT_PTS = 1200 // `LDY I,12` — BCD 12 hundreds (:2131, MQ-29)

export interface MosquitoSlot {
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
  /** BEEDH — signed diagonal step, ADDED each tick (MQ-13). */
  dh: number
  /** PTS — this slot's kill-points stamp entry (MLDEF.MAC:398). */
  pts: number
}

export interface MosquitoEnv {
  /** FRAME byte. */
  frame: number
  /** SCORE2 — the BCD ten-thousands byte. */
  score2: number
  /** SLOW — the slow-down-all-critters timer (MQ-11). */
  slow: number
  /** The PLAYP/PEXPLD gate (MILLI.MAC:1325-1328, MQ-2). */
  playerAlive: boolean
  /** POKEY RND0 byte — the spawn column (MQ-21). */
  rnd0: number
  /** POKEY RND1 byte — the spawn diagonal (MQ-24). */
  rnd1: number
  /** CENTIN (MQ-7). */
  centin: number
}

export type MosquitoMove = { kind: 'idle' } | { kind: 'offscreen' } | { kind: 'moved' }

/** The movement sweep's mosquito test: a live slot in the band [0E,10) (MILLI.MAC:1348-1354, MQ-8/9). */
export function isMosquito(slot: Readonly<MosquitoSlot>): boolean {
  return slot.color !== 0 && slot.pic >= MOSQUITO_PIC && slot.pic < 0x10
}

/**
 * The MOSQT spawn tick (MILLI.MAC:1333-1340): the FRAME byte — masked with
 * 7F from SCORE2 = 7 BCD, 70,000 (MQ-4/5) — must equal 0x17 (the EOR 17
 * test, MQ-6).
 */
export function mosquitoSpawnTick(frame: number, score2: number): boolean {
  const a = score2 >= 0x07 ? frame & 0x7f : frame // :1336-1338 (MQ-4/5)
  return a === 0x17 // :1339-1340 (MQ-6)
}

/** The start gates (MILLI.MAC:1333-1344): the tick, and CENTIN under 9 (MQ-7). */
export function mayStartMosquito(env: Readonly<MosquitoEnv>): boolean {
  if (!mosquitoSpawnTick(env.frame, env.score2)) return false
  return env.centin < 9 // :1341-1344 (MQ-7)
}

/** MOSQT3's speed (MILLI.MAC:1410-1426): 2 below 90,000, 3 from 90,000 (MQ-22/23). */
export function mosquitoSpeed(score2: number): number {
  return score2 >= 0x09 ? 3 : 2 // :1410/:1415-1416/:1426
}

/**
 * The MOSQT3 + BEEMV2 spawn writes (MILLI.MAC:1405-1435): picture 0E
 * (MQ-20), the shared position/colour init (MQ-21), dv = speed (MQ-22/23),
 * dh = ±speed by RND1 bit 7 (MQ-24/25). A no-op on an invalid RND0 byte
 * (the deferred reroll — trySpawnMosquito gates it). CHAN5 sound is ml6.
 */
export function startMosquito(slot: MosquitoSlot, env: Readonly<MosquitoEnv>): void {
  const h = spawnH(env.rnd0)
  if (h === null) return
  slot.pic = MOSQUITO_PIC // :1405-1406 (MQ-20)
  slot.v = MOSQUITO_SPAWN_V // :225-227 (MQ-21)
  slot.h = h // :233-235
  slot.color = MOSQUITO_COLOR // :238-239
  const speed = mosquitoSpeed(env.score2) // :1410-1426 (MQ-22/23)
  slot.dv = speed // :1427-1430 (cocktail COMP skipped upright)
  slot.dh = (env.rnd1 & 0x80) !== 0 ? comp(speed) : speed // :1431-1434 (MQ-24/25)
}

/**
 * The whole MOSQT spawn path for slot 12 (MILLI.MAC:1325-1346): player gate
 * (MQ-2), slot free, the tick and CENTIN gates, valid spawn column.
 */
export function trySpawnMosquito(slot: MosquitoSlot, env: Readonly<MosquitoEnv>): boolean {
  if (!env.playerAlive) return false // :1325-1329 (MQ-2)
  if (slot.color !== 0) return false // :1331-1332 (MQ-3)
  if (!mayStartMosquito(env)) return false // :1333-1344
  if (spawnH(env.rnd0) === null) return false // :228-232 — deferred reroll
  startMosquito(slot, env) // :1345-1346
  return true
}

/**
 * One MOSQT sweep for ONE live mosquito (MILLI.MAC:1348-1399): the wing flap
 * (:1355-1362, MQ-10/11/12), the H add with the wall bounce that KEEPS the
 * overshot position (:1370-1380, MQ-13..16), the V subtract and BEEOFF exit
 * (:1381-1389, MQ-17/18). The OBSTAC/DDTEXP/PLAY seams (:1391-1398) stay
 * with their callers, and there is NO mushroom planting (MQ-19) — 'moved'
 * deliberately carries no plant field.
 */
export function moveMosquito(slot: MosquitoSlot, env: Readonly<MosquitoEnv>): MosquitoMove {
  if (!env.playerAlive) return { kind: 'idle' } // :1325-1329 (MQ-2) — the gate covers the sweep
  // :1355-1362 (MQ-10/11/12) — flap every tick in slow mode, else odd frames
  if (env.slow !== 0 || (env.frame & 1) !== 0) slot.pic ^= 1
  // :1370-1373 (MQ-13) — the diagonal H add
  slot.h = (slot.h + slot.dh) & 0xff
  // :1374-1380 (MQ-14/15/16) — bounce off both walls; the position keeps the overshoot
  if (slot.h < 0x0c || slot.h >= 0xf5) slot.dh = comp(slot.dh)
  // :1381-1384 (MQ-17) — the V subtract
  slot.v = (slot.v - slot.dv) & 0xff
  if (slot.v < 4) {
    // :1385-1389 (MQ-18) — off the bottom (EOR CKFF identity upright)
    mosquitoOff(slot)
    return { kind: 'offscreen' }
  }
  return { kind: 'moved' }
}

/** BEEOFF (MILLI.MAC:166-171, MQ-31): clear PTS, colour and H — the slot is freed, V untouched. The shared ./bee-family beeOff, aliased to preserve the MosquitoSlot signature. */
export const mosquitoOff: (slot: MosquitoSlot) => void = beeOff

/**
 * SHOOT2's mosquito branch (MILLI.MAC:2127-2131): INC SCROLC runs FIRST —
 * every mosquito kill scrolls the playfield UP one row (MQ-27, positive is
 * up per MLDEF.MAC:372, MQ-30) — then 400 points, 1200 by DDT (MQ-28/29).
 */
export function mosquitoKill(byDdt: boolean): { points: number; scrollUp: true } {
  return { points: byDdt ? MOSQUITO_DDT_PTS : MOSQUITO_PTS, scrollUp: true }
}
