// src/core/ptero.ts
//
// Story jt3-4 (GREEN, Julia) — the pterodactyl as a pure core process: the
// gravity-EXEMPT FLYXP flight, the lance-height kill window with its two bands,
// the opposite-facing + facing-into gates, the normal-joust-loses fallback (the
// epic's binding ruling), the DERIVED 1000-point SCRHUN kill value, and the ptero
// wave-type spawn count flowing through jt2-5's dispatch.
//
// CORE: pure functions over plain numbers and plain records — no clock, no
// ambient entropy, no browser surface, no shell import. Every function is a pure
// transform of the state handed in (the jt1-7 purity scanner sweeps this file;
// AC-4 determinism depends on it — no argument is ever mutated).
//
// The behaviour is pinned by tests/ptero.test.ts; the ROM-law provenance +
// the SCRHUN→1000 derivation + the JT34-* claim coverage by tests/ptero-source.
// test.ts (byte-verified against the vendored 1982 Williams source, JOUSTRV4.SRC);
// the wave type going LIVE in the demo by tests/demo-ptero.test.ts.
//
// ─── THE GRAVITY EXEMPTION ("NO GRAVITY!", JOUSTRV4.SRC:1506) ─────────────────
// The mount's per-frame integrate enters the position pipeline at ADDGRA, whose
// first instruction ADDs the variable gravity to VY (`ADDGRA ADDB GRAV`,
// JOUSTRV4.SRC:6489). The ptero enters ONE instruction later at ADDGRX
// (`ADDGRX ADDD PPOSY+1,U`, JOUSTRV4.SRC:6494 — the position integrate), skipping
// the gravity add entirely (`LDX #FLYXP … NO GRAVITY!`, JOUSTRV4.SRC:1506;
// `JSR ADDGRX`, JOUSTRV4.SRC:1508). So a still ptero HOLDS altitude where the
// mount's stepFlight adds gravity to VY and falls. Its X ladder is FLYXP
// (±$0300, JOUSTRV4.SRC:1587-1595) — WIDER than the mount's FLYX (±$0200).
//
// ─── THE 1000-POINT KILL IS DERIVED (ruling C — verify in emulation) ─────────
// 1000 is DERIVED, never stated as a literal in the source. The ptero enemy
// (P7DEC) has DVALUE = $10 (`FCB WHI*$11,$10,MSGAMO`, JOUSTRV4.SRC:5577) decoded
// through its DVALUR routine SCRHUN (`FDB DEATH4,0,STENMY,SCRHUN,0,EMYTIM`,
// JOUSTRV4.SRC:5575). SCRHUN is the "INCREMENT SCORE BY THOUSANDS AND HUNDREDS"
// routine (JOUSTRV4.SRC:7340) that ADDs the byte at the score's thousands/hundreds
// BCD position (`ADDA 2,Y`, JOUSTRV4.SRC:7348), so $10 = high-nibble 1 thousand +
// low-nibble 0 hundreds = 1000. Cross-checked against the shadow-lord anchor P6DEC
// $15 via SCRHUN → 1500 (joust.killScore). SCRHUN is the straight thousands/
// hundreds routine, NOT the "BACKWARDS" SCRTEN — the ptero dodges that trap. The
// value is confirmed by playing the ROM in EMULATION; nothing here gates on an
// emulator (ruling C — the caveat rides in this comment + the JT34 claim).

import { dispatchWaveType, type PlayersAlive } from './wave.js'
import type { EntityState, PlayerInput } from './flight.js'
import type { JoustEntity, Facing } from './joust.js'

export type { EntityState, PlayerInput, JoustEntity, Facing, PlayersAlive }

/**
 * The ptero as a joust participant — position, facing, and its ATTACKING-frame
 * flag. `attackFrame` is true while the ptero shows FLY3 (PIMAGE > FLY2-FLY1),
 * which the kill window reads to select the 8 ± 3 band over the 10 ± 2 band
 * (`CMPA #FLY2-FLY1  ATTACKING FRAME?`, JOUSTRV4.SRC:4975).
 */
export interface PteroEntity {
  /** Whole-pixel X (PPOSX pixel) — the COLDX side is sign(ptero.posX − player.posX). */
  posX: number
  /** 8.8 fixed Y — the compare uses the WHOLE pixel `posY >> 8` (PPOSY+1). */
  posY: number
  /** `PFACE` — +1 right, −1 left. */
  facing: Facing
  /** FLY3 attacking frame (PIMAGE > FLY2-FLY1): selects the 8 ± 3 band. */
  attackFrame: boolean
}

/**
 * The lance-height kill window's verdict:
 *   • `kill`  — the player killed the ptero (all three tests held) → score 1000.
 *   • `pteroWins` — any single test failed → the NORMAL joust (OSTBO), which the
 *     ptero wins (the player dies). The story's binding ruling for the fallback.
 */
export type PteroAttackOutcome =
  | { kind: 'kill'; score: number }
  | { kind: 'pteroWins' }

/** The 1000-point kill score EVENT (the epic's scoring seam, ruling C). */
export interface PteroScoreEvent {
  kind: 'score'
  value: number
  /** A ptero kill — the demo's existing 'kill' reason (not a new score reason). */
  reason: 'kill'
}

// ─── FLYXP horizontal ladder + the gravity exemption (AC-1) ──────────────────

/**
 * The nine FLYXP entries in INDEX order −8..+8 (JOUSTRV4.SRC:1587-1595): the
 * ptero's X-velocity ladder, zero in the MIDDLE (the FLYX house convention).
 * ±$0300 endpoints — WIDER than the mount's FLYX (±$0200). HEX in the source,
 * signed 16-bit. Index i maps to `PTERO_FLYX[i / 2 + 4]` — zero is in the middle.
 */
export const PTERO_FLYX: readonly number[] = Object.freeze([
  -0x0300, -0x0180, -0x00c0, -0x0060, 0x0000, 0x0060, 0x00c0, 0x0180, 0x0300,
])

/** $0300 — the ptero's top |X velocity| rung (vs the mount's FLYX $0200). */
export const PTERO_FLYX_MAX = 0x0300

// ─── The lance-height bands (AC-2) ───────────────────────────────────────────

/** 8 — the ATTACKING-frame (FLY3) band centre (`SUBB #15-7`, JOUSTRV4.SRC:4978). */
export const ATTACK_BAND_CENTER = 15 - 7

/** 3 — the attacking-frame tolerance (`CMPB #3` "WITHIN 7 PIXELS", JOUSTRV4.SRC:4981). */
export const ATTACK_BAND_TOL = 3

/** 10 — the glide-frame (FLY1/FLY2) band centre (`SUBB #15-5`, JOUSTRV4.SRC:4986). */
export const GLIDE_BAND_CENTER = 15 - 5

/** 2 — the glide-frame tolerance (`CMPB #2` "WITHIN 5 PIXELS", JOUSTRV4.SRC:4989). */
export const GLIDE_BAND_TOL = 2

/**
 * 12 — FLY2-FLY1 (the RMB-12 frame stride, JOUSTRV4.SRC:140-142). PIMAGE > this
 * is the attacking frame (FLY3 = 24); `CMPA #FLY2-FLY1 / BLS 13$`, JOUSTRV4.SRC:4975.
 */
export const ATTACK_FRAME_THRESHOLD = 12

/**
 * 1000 — the ptero kill value. DERIVED, not stated: DVALUE $10 (P7DEC,
 * JOUSTRV4.SRC:5577) through SCRHUN (JOUSTRV4.SRC:5575,7340-7348) = 1 thousand +
 * 0 hundreds. The high nibble of $0x10 is thousands, the low nibble hundreds
 * (`(byte >> 4) * 1000 + (byte & 0xf) * 100`). The verify-in-emulation caveat
 * rides in the file header + the JT34 claim (ruling C).
 */
export const PTERO_SCORE = ((0x10 >> 4) & 0xf) * 1000 + (0x10 & 0xf) * 100

// ─── Flight (AC-1) ───────────────────────────────────────────────────────────

/** Sign-extend an 8-bit value — the 6809's `SEX` (mirrors flight.ts). */
const sex8 = (v: number): number => ((v & 0xff) << 24) >> 24

/**
 * One frame of ptero flight — the ADDGRX entry that SKIPS the mount's `ADDB GRAV`
 * (JOUSTRV4.SRC:1508,6489-6494). posY integrates by VY with NO gravity add, so a
 * still ptero (velY 0, no flap) HOLDS altitude where the mount's stepFlight falls.
 * Horizontal uses PTERO_FLYX exactly as flight.stepFlight uses FLYX: the ladder
 * word's low byte accumulates into `velXFrac`, only the carry plus the
 * sign-extended high byte reach `posX`. Pure — the argument is never mutated.
 */
export function stepPteroFlight(state: EntityState, _input: PlayerInput): EntityState {
  // NO GRAVITY: VY is carried through untouched (no `+ GRAV`), unlike stepFlight.
  const velY = state.velY
  const posY = state.posY + velY

  const rung = PTERO_FLYX[state.velXIndex / 2 + 4]
  if (rung === undefined) throw new RangeError(`velXIndex ${state.velXIndex} is off the FLYXP ladder`)
  const sum = state.velXFrac + (rung & 0xff)
  const velXFrac = sum & 0xff
  const whole = sex8(((rung >> 8) & 0xff) + (sum >> 8))

  return { ...state, posX: state.posX + whole, posY, velY, velXFrac }
}

// ─── The lance-height kill window (AC-2) ─────────────────────────────────────

/**
 * The lance-height delta B = player.plantZ + (player.posY>>8) − (ptero.posY>>8),
 * in WHOLE pixels (`LDB PLANTZ,U / ADDB PPOSY+1,U / SUBB PPOSY+1,X`,
 * JOUSTRV4.SRC:4971-4973). A skidding player (plantZ 2) shifts the band. Pure.
 */
export function lanceOffset(player: JoustEntity, ptero: PteroEntity): number {
  return player.plantZ + (player.posY >> 8) - (ptero.posY >> 8)
}

/**
 * Resolve a player↔ptero contact (the OSTHIT ptero path, JOUSTRV4.SRC:4971-5002).
 * `kill` (→ PTERO_SCORE) iff ALL of: (a) `lanceOffset` within the frame's band
 * (attackFrame → 8±3, else 10±2 — `BHI OSTBO`, JOUSTRV4.SRC:4990), (b) OPPOSITE
 * facings (`EORA PFACE / BPL OSTBO`, JOUSTRV4.SRC:4991-4993), and (c) the player
 * facing INTO the ptero (`LDD COLDX` sign vs PFACE, JOUSTRV4.SRC:4994-5001:
 * facing === sign(ptero.posX − player.posX)). Any single failure → `pteroWins`
 * (the normal joust OSTBO, JOUSTRV4.SRC:5002 — which the ptero wins per the
 * binding story ruling; the raw ROM re-runs the height compare, we do not). Pure.
 */
export function resolvePteroAttack(player: JoustEntity, ptero: PteroEntity): PteroAttackOutcome {
  const center = ptero.attackFrame ? ATTACK_BAND_CENTER : GLIDE_BAND_CENTER
  const tol = ptero.attackFrame ? ATTACK_BAND_TOL : GLIDE_BAND_TOL
  const inBand = Math.abs(lanceOffset(player, ptero) - center) <= tol

  const oppositeFacings = player.facing !== ptero.facing
  // COLDX = ptero.posX − player.posX; the ROM tests its sign against PFACE with a
  // `BPL` (branch on PLUS — and 0 IS plus, JOUSTRV4.SRC:4994-5001), so COLDX = 0
  // groups into the RIGHT branch ONLY. The old `player.facing === Math.sign(COLDX)`
  // refused the right-facer COLDX = 0 kill because Math.sign(0) = 0 (the jt3-4
  // deferred degenerate edge), letting a same-column, in-band, opposite-facing
  // right-facer float past instead of killing. A right-facer needs COLDX ≥ 0 (0 is
  // a kill); a left-facer needs COLDX < 0 (strict — an exact-column left-facer
  // falls to OSTBO = the normal joust, since BPL takes 0 into the right branch).
  const coldx = ptero.posX - player.posX
  const facingInto = player.facing > 0 ? coldx >= 0 : coldx < 0

  if (inBand && oppositeFacings && facingInto) return { kind: 'kill', score: PTERO_SCORE }
  return { kind: 'pteroWins' }
}

/**
 * The 1000-point kill score event (reason 'kill'; the ruling-C verify-in-emulation
 * caveat rides in the file header + the JT34 claim, not in a gate). Pure.
 */
export function pteroScoreEvent(): PteroScoreEvent {
  return { kind: 'score', value: PTERO_SCORE, reason: 'kill' }
}

// ─── The ptero wave type, LIVE (AC-3) ────────────────────────────────────────

/**
 * How many pteros a wave spawns (AC-3): the wave table's ptero nibble (WPTEN =
 * `pterodactyls`) WHEN the wave dispatches to the 'ptero' type through jt2-5's
 * `dispatchWaveType` (WPTERO index 5, `FDB WPTERO`, JOUSTRV4.SRC:2591; WPTEN read
 * at `LDA WPTEN,X`, JOUSTRV4.SRC:2614), else 0. The ptero type does NOT degrade by
 * player-count (only coop/gladiator do), so a player being out does not change the
 * count. Pure.
 */
export function pteroWaveSpawnCount(
  status: number,
  pterodactyls: number,
  players: PlayersAlive,
): number {
  return dispatchWaveType(status, players) === 'ptero' ? pterodactyls : 0
}
