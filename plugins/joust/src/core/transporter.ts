// src/core/transporter.ts
//
// Story jt2-6 — GREEN (Julia). The transporter + spawn-service core: pure,
// deterministic simulation, no browser surface, no clock, no ambient entropy
// (the src/core boundary jt1-1 guards). Satisfies
// tests/helpers/transporter-contract.ts; every constant re-derives byte-for-byte
// from the vendored 1982 Williams source and is pinned by a committed JT26-*
// claim (docs/rom-study/claims/transporter.json).
//
// The laws, all cited (see tests/transporter-source.test.ts):
//   • the four transporter pads by tier — TR1ID..TR4ID (JOUSTRV4.SRC:5587-5590);
//   • the empty-third rule — SELARE (JOUSTRV4.SRC:6413-6424), boundaries $51 and
//     $A3+6 = $A9 (the dead $8A+6 second column is a comment, not the operand);
//   • the take-a-number ticket queue — NPSERV/LPSERV/NESERV/LESERV, players
//     served ahead of enemies (JOUSTRV4.SRC:5615-5676,5722-5724);
//   • the timed materialisation ABORT law — collisions disabled while the window
//     is active; ANY control input aborts early, else it times out; PLYINT
//     re-enables collisions on either exit (JOUSTRV4.SRC:5828-5892,5923-5925);
//   • the P1/P2 spawn constants (JOUSTRV4.SRC:1019-1039);
//   • the wave-1 complement entering via pads under seed (AC-4).
//
// Types are borrowed from the sibling core modules so the seam stays structural:
// PlayerInput (flight), Facing (joust), WaveRow (wave) — type-only imports, erased
// at build, so they cross no runtime boundary.

import type { PlayerInput } from './flight.js'
import type { Facing } from './joust.js'
import type { WaveRow } from './wave.js'
import { rngNext } from './rng.js'

// ─── Pads by tier ────────────────────────────────────────────────────────────

/** The three screen thirds SELARE sorts a Y position into (AREA1/AREA2/AREA3). */
export type Tier = 'top' | 'middle' | 'bottom'

/** The four transporter pad ids, in TR1ID..TR4ID order (JOUSTRV4.SRC:5587-5590). */
export type PadId = 'TR1' | 'TR2' | 'TR3' | 'TR4'

/** One transporter pad: evaluated TPOSX/TPOSY and the tier its Y falls in. */
export interface TransporterPad {
  id: PadId
  x: number
  y: number
  tier: Tier
}

// ─── Empty-third rule ────────────────────────────────────────────────────────

/** Per-third occupant counts (AREA1/AREA2/AREA3). */
export interface AreaOccupancy {
  top: number
  middle: number
  bottom: number
}

// ─── Ticket queue ────────────────────────────────────────────────────────────

/** The deli-counter service state (RAMDEF.SRC:248-251). */
export interface ServiceQueue {
  npserv: number
  lpserv: number
  neserv: number
  leserv: number
}

// ─── Materialisation safety ──────────────────────────────────────────────────

/** Where a materialisation window stopped. */
export type MaterialiseEnd = 'active' | 'timed-out' | 'aborted'

/** A materialisation-in-progress. `collisionsEnabled` is the PID $80 bit. */
export interface Materialisation {
  napLeft: number
  collisionsEnabled: boolean
  end: MaterialiseEnd
}

// ─── Player spawn constants ──────────────────────────────────────────────────

/** A player's materialisation constants (JOUSTRV4.SRC:1019-1039). */
export interface PlayerSpawn {
  x: number
  facing: Facing
  mount: 'ostrich' | 'stork'
}

// ─── AC-4: the wave complement entering via pads ─────────────────────────────

/** One enemy's pad assignment, in entry order. */
export interface PadEntry {
  index: number
  pad: PadId
}

// ─── SELARE: the empty-third boundaries (JOUSTRV4.SRC:6413-6424) ──────────────

/** `$51` — the top/middle boundary: Y < this is the top third (JOUSTRV4.SRC:6419). */
export const THIRD_MIDDLE_MIN = 0x51

/**
 * `$A3+6` = `$A9` — the middle/bottom boundary (JOUSTRV4.SRC:6414). Written as the
 * source operand so the derivation is visible; the dead `$8A+6` second column
 * (=$90) is a comment the assembler drops at the first whitespace, NOT the bound.
 */
export const THIRD_BOTTOM_MIN = 0xa3 + 6

/**
 * SELARE: the third a Y position sits in. `BLO #$51 → top`, else `BLO #$A3+6 →
 * middle`, else bottom (JOUSTRV4.SRC:6414-6424). The `BLO` is strictly-less-than,
 * so the boundary value itself falls THROUGH into the lower third.
 */
export function selectArea(posY: number): Tier {
  if (posY < THIRD_MIDDLE_MIN) return 'top'
  if (posY < THIRD_BOTTOM_MIN) return 'middle'
  return 'bottom'
}

/** A pad with its tier derived from its own Y — never a hand-typed tier. */
function padOf(id: PadId, x: number, y: number): TransporterPad {
  return { id, x, y, tier: selectArea(y) }
}

/**
 * The four pads, TR1..TR4, with TPOSX/TPOSY evaluated from their FDB rows
 * (JOUSTRV4.SRC:5587-5590): TR1 (113,80), TR2 (231,128), TR3 (23,137),
 * TR4 (127,210). The arithmetic mirrors the source operands ($6A+7, $51-1, …).
 */
export const PADS: readonly TransporterPad[] = Object.freeze([
  padOf('TR1', 0x6a + 7, 0x51 - 1),
  padOf('TR2', 0xe0 + 7, 0x81 - 1),
  padOf('TR3', 0x10 + 7, 0x8a - 1),
  padOf('TR4', 0x78 + 7, 0xd3 - 1),
])

/**
 * Clear the three AREA flags then SELARE-classify each active occupant's Y,
 * counting occupants per third (JOUSTRV4.SRC:5622-5635).
 */
export function scanAreas(occupantYs: readonly number[]): AreaOccupancy {
  const occ: AreaOccupancy = { top: 0, middle: 0, bottom: 0 }
  for (const y of occupantYs) occ[selectArea(y)] += 1
  return occ
}

/**
 * The empty-third rule: a spawn PROCEEDS into `tier` only when that third is
 * empty; a crowded third DEFERS it (JOUSTRV4.SRC:5641-5654).
 */
export function spawnProceeds(occ: AreaOccupancy, tier: Tier): boolean {
  return occ[tier] === 0
}

/**
 * FREET's transporter selection (JOUSTRV4.SRC:5687-5710): keep the VRAND-drawn
 * `preferred` pad when its TCURUSE flag is clear, otherwise fall through
 * TR1..TR4 in id order (`GOTR1..GOTR4`) to the FIRST pad not in use. When every
 * pad is busy return `null` — the customer is turned away and re-naps with its
 * ticket intact (`BNE CRELP`, :5709). Pure: it holds no occupancy state of its
 * own, the caller passes the pads currently in use (each `INC [TCURUSE,X]`,
 * :5710). With nothing in use the fall-through is a no-op, so the preference is
 * returned unchanged and a no-contention arrival lands exactly where the VRAND
 * draw put it.
 */
export function freePad(preferred: PadId, occupied: readonly PadId[]): PadId | null {
  const busy = new Set(occupied)
  if (!busy.has(preferred)) return preferred
  for (const pad of PADS) if (!busy.has(pad.id)) return pad.id
  return null
}

/**
 * The transporter a RE-MATERIALISING KNIGHT lands on — CREPLY's empty-third safety search
 * (JOUSTRV4.SRC:5627-5665) followed by GOTTR's first-free fall-through (:5697-5709). Unlike
 * an enemy (which takes its VRAND-drawn pad via `freePad`), a re-created player is steered
 * to a pad whose SCREEN THIRD is EMPTY so it does not rematerialise on top of a swarm:
 * bottom first (TR4), then the two middle pads (TR2 then TR3), then top (TR1) — each only
 * when that third holds no occupant (`spawnProceeds`) AND the pad itself is free. When no
 * empty third has a free pad the ROM falls through GOTR1..GOTR4 to the first free pad in id
 * order; `null` only when every pad is in use (`BNE CRELP`, :5709 — re-nap with the ticket).
 *
 * `occ` is the SELARE census of the current on-screen occupants (`scanAreas`); `occupied`
 * is the set of pads already stood on. The one authenticity simplification: the ROM seeds
 * the all-thirds-occupied fall-through from `VRAND`, where this takes the deterministic
 * first-free pad — the empty-third preference itself, which IS the safety, is exact.
 */
export function selectRespawnPad(occ: AreaOccupancy, occupied: readonly PadId[]): TransporterPad | null {
  const busy = new Set(occupied)
  const free = (p: TransporterPad): boolean => !busy.has(p.id)
  const padOf = (id: PadId): TransporterPad | undefined => PADS.find((p) => p.id === id)
  const tr1 = padOf('TR1')
  const tr2 = padOf('TR2')
  const tr3 = padOf('TR3')
  const tr4 = padOf('TR4')
  if (tr4 && spawnProceeds(occ, 'bottom') && free(tr4)) return tr4
  if (spawnProceeds(occ, 'middle')) {
    if (tr2 && free(tr2)) return tr2
    if (tr3 && free(tr3)) return tr3
  }
  if (tr1 && spawnProceeds(occ, 'top') && free(tr1)) return tr1
  for (const pad of PADS) if (free(pad)) return pad
  return null
}

// ─── The take-a-number ticket queue (JOUSTRV4.SRC:5615-5676) ─────────────────

/** A fresh service state — all counters equal, so nobody is waiting or served. */
export function newServiceQueue(): ServiceQueue {
  return { npserv: 0, lpserv: 0, neserv: 0, leserv: 0 }
}

/** Player draws the next number (LDA NPSERV → ticket, INC NPSERV; :5615-5617). */
export function takePlayerNumber(q: ServiceQueue): { ticket: number; queue: ServiceQueue } {
  return { ticket: q.npserv, queue: { ...q, npserv: q.npserv + 1 } }
}

/** Enemy draws the next number (LDA NESERV → ticket, INC NESERV; :5664-5666). */
export function takeEnemyNumber(q: ServiceQueue): { ticket: number; queue: ServiceQueue } {
  return { ticket: q.neserv, queue: { ...q, neserv: q.neserv + 1 } }
}

/** Is it this player's turn? number === LPSERV (CMPB LPSERV, :5620). */
export function playerTurn(q: ServiceQueue, ticket: number): boolean {
  return ticket === q.lpserv
}

/**
 * Is it this enemy's turn? number === LESERV AND no player still holds an
 * unserved number (NPSERV == LPSERV) — players first (JOUSTRV4.SRC:5672-5675).
 */
export function enemyTurn(q: ServiceQueue, ticket: number): boolean {
  return ticket === q.leserv && q.npserv === q.lpserv
}

/** Advance the player counter after a player materialises (INC LPSERV, :5722). */
export function servePlayer(q: ServiceQueue): ServiceQueue {
  return { ...q, lpserv: q.lpserv + 1 }
}

/** Advance the enemy counter after an enemy materialises (INC LESERV, :5724). */
export function serveEnemy(q: ServiceQueue): ServiceQueue {
  return { ...q, leserv: q.leserv + 1 }
}

/**
 * Who the service hands the next transporter to: 'player' while any player holds
 * an unserved number, else 'enemy' while any enemy does, else 'idle' — the single
 * statement of "players ahead of enemies" (JOUSTRV4.SRC:5672-5676).
 */
export function nextServed(q: ServiceQueue): 'player' | 'enemy' | 'idle' {
  if (q.npserv !== q.lpserv) return 'player'
  if (q.neserv !== q.leserv) return 'enemy'
  return 'idle'
}

// ─── Timed materialisation safety — the ABORT law ────────────────────────────

/**
 * Is this frame's input a control input? dir !== 0 OR flap OR flapHeld — the whole
 * CURJOY word nonzero (LDD CURJOY / BNE 51$, JOUSTRV4.SRC:5831,5841). The neutral
 * glide is the only non-control input.
 */
export function isControlInput(input: PlayerInput): boolean {
  return input.dir !== 0 || input.flap || input.flapHeld
}

/** Begin a materialisation window of `windowFrames` naps — safe, collisions off. */
export function beginMaterialise(windowFrames: number): Materialisation {
  return { napLeft: windowFrames, collisionsEnabled: false, end: 'active' }
}

/**
 * One frame of the window (PCNAP, JOUSTRV4.SRC:5828). A control input aborts EARLY
 * (`BNE 51$` → ABORTED EARLY, :5841,5892) regardless of napLeft; otherwise napLeft
 * decrements and the window times out (`BEQ 50$`, :5848) when it reaches 0. Either
 * exit re-enables collisions (PLYINT's `ORA PID`, :5923-5925). An already-ended
 * materialisation is returned unchanged — no resurrecting the safety.
 */
export function stepMaterialise(m: Materialisation, input: PlayerInput): Materialisation {
  if (m.end !== 'active') return m
  if (isControlInput(input)) return { napLeft: m.napLeft, collisionsEnabled: true, end: 'aborted' }
  const napLeft = m.napLeft - 1
  if (napLeft <= 0) return { napLeft, collisionsEnabled: true, end: 'timed-out' }
  return { napLeft, collisionsEnabled: false, end: 'active' }
}

// ─── Player spawn constants (JOUSTRV4.SRC:1019-1039) ─────────────────────────

/** P1: X=100, facing right (+1), OSTRICH (LDX #100 / CLR PFACE, :1020-1023). */
export const PLAYER1_SPAWN: PlayerSpawn = { x: 100, facing: 1, mount: 'ostrich' }

/** P2: X=200, facing left (−1), STORK (LDX #200 / LDB #$FF, :1035-1039). */
export const PLAYER2_SPAWN: PlayerSpawn = { x: 200, facing: -1, mount: 'stork' }

// ─── AC-4: the wave complement entering via pads ─────────────────────────────

/**
 * The number of enemies a wave row sends in via pads: bounders + hunters + lords
 * + pterodactyls. The PURSUIT nibble is EXCLUDED — it seeds the intelligence
 * budget (jt2-5's seam), it is not a spawn count.
 */
export function waveEnemyComplement(row: WaveRow): number {
  return row.bounders + row.hunters + row.lords + row.pterodactyls
}

// SH3-1 retired the inlined mulberry32 that used to sit here; the seeded draw now
// comes from `rngNext` (./rng.ts), sourced from @shared/rng. The seed is the only
// input; core mints no entropy.

/**
 * Assign each of `count` entering enemies a pad, deterministically under `seed`:
 * same (count, seed) → identical sequence, every pad a real PadId, indices
 * 0..count-1. Pure — the seed threads a mulberry32 word forward, no ambient
 * entropy.
 */
export function enterViaPads(count: number, seed: number): PadEntry[] {
  const entries: PadEntry[] = []
  let word = seed >>> 0
  for (let index = 0; index < count; index++) {
    const drawn = rngNext(word)
    word = drawn.next
    entries.push({ index, pad: PADS[Math.floor(drawn.value * PADS.length)].id })
  }
  return entries
}

/**
 * The entry EDGE each of a wave's `count` pterodactyls arrives from, deterministically
 * under `seed`: PTERST's `JSR VRAND / BCC` (JOUSTRV4.SRC:1421-1489) — carry-clear keeps
 * the default LEFT entry (`LDX #ELEFT+1`), carry-set flips to the RIGHT (`LDX #ERIGHT-1`).
 * Same (count, seed) → identical sequence. Pure: threads the same mulberry32 word the pad
 * assignment does, off a ptero-specific fork of the seed so a bird's side does not shadow
 * pad 0's draw. `< 0.5` is the carry-clear (LEFT) half.
 */
export function enterPteroSides(count: number, seed: number): ('left' | 'right')[] {
  const sides: ('left' | 'right')[] = []
  let word = (seed ^ 0x50544552) >>> 0 // 'PTER' — decorrelate from enterViaPads' pad draws
  for (let i = 0; i < count; i++) {
    const drawn = rngNext(word)
    word = drawn.next
    sides.push(drawn.value < 0.5 ? 'left' : 'right')
  }
  return sides
}
