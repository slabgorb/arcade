// src/core/ddt.ts
//
// Story ml4-4 (GREEN) — THE DDT BOMB, the signature Millipede subsystem with
// no centipede analog. DDTS (`MLSUB.MAC:420`, DD-11) places the four-entry
// DDTADD bank at wave start and DDTS2 (`MLSUB.MAC:443`, DD-17) re-stamps it;
// SHOOT1's bomb branch (`MILLI.MAC:1983-1985, 2014-2063`) starts an explosion;
// a FRAME&7-gated machine (`MILLI.MAC:841-905`, DD-102) walks ten parallel
// offset/stamp lists (`MILLI.MAC:907-989`) to animate the cloud; DDTEXP
// (`MILLI.MAC:1942`, DD-215) classifies a stamp as inside-a-cloud; BOMBS
// (`MILLI.MAC:446`, DD-74) enters bee/mosquito/dragonfly during bomb mode; and
// the SCROLD/SCROLU DDT halves (`MLSUB.MAC:1231-1295`/`:1379-1400` — the
// ml3-5-routed SC-49/SC-50) move, cull and re-seed the table under scrolling.
// Every constant carries a DD-* claim in docs/rom-study/claims/13-ddt.json,
// byte-verified against reference/original-source/millipede/ by the ml1-1 gate.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC, MLSUB.MAC and MLDEF.MAC are `.RADIX 16`: ROM literals quoted here
// are hex unless suffixed with `.` (`LDX I,12.` and `ADC I,20.` are DECIMAL).
//
// ─── STATE MODEL ────────────────────────────────────────────────────────────
// A DdtEntry is the DDTADD byte pair VERBATIM (DD-9): hi 0 = vacant (DD-18);
// hi $10|page = intact (offset = ((hi&3)<<8)|lo over the ml3-4 field shape);
// hi >= $14 = exploding, D5-D7 the state (DD-19). table[i] <-> DDTST word i;
// the ROM sweeps X = 7,5,3,1 descending (DDTS1, DD-28), so every reducer here
// visits table[3] FIRST. Player-1 bank only — the PLAYR<<3 bank select is ml7
// wiring (DD-10). Upright cabinet only (cocktail is ml8-3, fleet precedent).
//
// ─── CALLER-SIDE SEAMS (ml7 wiring — see .session/ml4-4-session.md) ─────────
// DDTS2 standalone restore callers (DD-42/43/44), CHAN2 sounds $24/$14
// (DD-214), SCORNG BCD application, BEEMV3/FLYMV3/MOSQT3 spawns after a
// bombs() 'enter' plus the NOCENT decrement (DD-84/85/91/92), DDTEX1->SHOOT2
// kill dispatch (DD-217/218), HITDDT reset at new wave (`MILLI.MAC:508`),
// INC BOMBV and DELAY=$40 application on bombModeStart (DD-100/101).

// ─── stamp and bank constants ───────────────────────────────────────────────
export const NDDT = 4 // MLDEF.MAC:191 (DD-2)
export const CLOUD_STAMP = 0x2e // MLDEF.MAC:202 (DD-3)
export const DDT_STAMP = 0x6e // MLDEF.MAC:203 (DD-4)
export const ROCK_STAMP = 0x70 // MLDEF.MAC:204 (DD-5)
export const PLYFLD_PAGE = 0x10 // PLYFLD=1000 (MLDEF.MAC:103, DD-1)

// ─── explosion machine constants ────────────────────────────────────────────
export const DDT_EXPLODING_MIN = 0x14 // CMP I,PLYFLD+400/100 (MLSUB.MAC:446, DD-19)
export const DDT_EXPLOSION_START = 0xb4 // ORA I,PLYFLD+400/100+0A0 (MILLI.MAC:2053, DD-211)
export const DDT_EXPLOSION_STEP = 0x10 // SBC I,10 (MILLI.MAC:851, DD-105)
export const DDT_FRAME_MASK = 7 // FRAME AND I,7 (MILLI.MAC:842, DD-102)
export const DDT_HIT_POINTS = 80 // "80 POINTS FOR HITTING DDT" (MILLI.MAC:2058, DD-212)
export const DDT_ANCHOR_BACKSTEP = 0x61 // SBC I,61 (MILLI.MAC:2049, DD-210)
export const DDT_CLOUD_KILL_FLAG = 0x80 // DDTEX1 LDA I,80 (MILLI.MAC:1947, DD-217)

// ─── BOMBS constants ────────────────────────────────────────────────────────
export const BOMBS_DELAY = 0x80 // MILLI.MAC:456-457 (DD-78)
export const BOMBS_RND_MASK = 7 // AND I,7 (MILLI.MAC:454, DD-77)
export const BOMBS_SLOTS = 13 // LDX I,12. — DECIMAL (MILLI.MAC:458, DD-79)
export const BOMBS_CREATURES: readonly number[] = [0x83, 0x81, 0xc0, 0x80, 0x80, 0x00] // MILLI.MAC:490-491 (DD-93/94)
export const BOMBSL: readonly number[] = [1, 3, 5, 7, 0x0b] // MILLI.MAC:492-493 (DD-95/96)
export const BOMB_MODE_NOCENT_BASE = 20 // ADC I,20. — DECIMAL 20 (MILLI.MAC:1921, DD-98)
export const BOMB_MODE_DELAY = 0x40 // MILLI.MAC:1924-1925 (DD-101)

// ─── placement words ────────────────────────────────────────────────────────
// DDTST (MLSUB.MAC:491-502, DD-30..41): words 0..3 upright, 4..7 cocktail
// (ml8-3, not modelled), 8..11 special attract — word 11 is a vacant fourth.
export const DDTST: readonly number[] = [0x10cd, 0x1119, 0x1233, 0x12f7] // DD-30..33
export const DDTST_ATTRACT: readonly number[] = [0x10a3, 0x1084, 0x1086, 0x0000] // DD-38..41

// ─── the ten cloud frames ───────────────────────────────────────────────────
// The 98$ table (MILLI.MAC:907-916, DD-118..127) maps the explosion index 0..9
// onto the offset lists 90$-97$ (MILLI.MAC:917-953, DD-128..164); stamps come
// from the PARALLEL 99$ table read with the same cursor (MILLI.MAC:954-989,
// DD-165..200). 91$/92$/93$ have no terminator of their own and FALL THROUGH
// into 97$/96$/95$ — an erase ring followed by the next smaller cloud. Offsets
// are byte-added to the cloud anchor (anchor = shot cell - $61, DD-210).
type CloudPair = readonly [number, number]

const zip = (offs: readonly number[], stamps: readonly number[]): readonly CloudPair[] =>
  offs.map((o, i) => [o, stamps[i]] as const)
const erase = (offs: readonly number[]): readonly CloudPair[] => offs.map((o) => [o, 0] as const)

// 90$ (:917-921) — the final erase frame; 99$ stamps all zero (:954-957).
const LIST_90 = erase([0x41, 0x60, 0x61, 0x62, 0x80, 0x81, 0x82, 0xa1])
// 97$ (:924-928) with stamps (:961-964) — the smallest cloud.
const LIST_97 = zip(
  [0x41, 0x60, 0x61, 0x62, 0x80, 0x81, 0x82, 0xa1],
  [0x30, 0x34, 0x31, 0x2e, 0x35, 0x32, 0x2f, 0x33],
)
// 91$ (:922-923, stamps :959-960) falls through into 97$.
const LIST_91: readonly CloudPair[] = [...erase([0x40, 0x42, 0xa0, 0xa2, 0xc1]), ...LIST_97]
// 96$ (:930-935) with stamps (:967-971).
const LIST_96 = zip(
  [0x40, 0x41, 0x42, 0x60, 0x61, 0x62, 0x80, 0x81, 0x82, 0xa0, 0xa1, 0xa2, 0xc1],
  [0x3f, 0x3a, 0x36, 0x40, 0x3b, 0x37, 0x4a, 0x3c, 0x38, 0x42, 0x3d, 0x39, 0x3e],
)
// 92$ (:929, stamps :966) falls through into 96$.
const LIST_92: readonly CloudPair[] = [...erase([0x20, 0x21, 0xc2]), ...LIST_96]
// 95$ (:938-944) with stamps (:975-980).
const LIST_95 = zip(
  [0x20, 0x21, 0x40, 0x41, 0x42, 0x60, 0x61, 0x62, 0x80, 0x81, 0x82, 0xa0, 0xa1, 0xa2, 0xc1, 0xc2],
  [0x4e, 0x48, 0x4f, 0x49, 0x43, 0x50, 0x4a, 0x44, 0x51, 0x4b, 0x45, 0x52, 0x4c, 0x46, 0x4d, 0x47],
)
// 93$ (:936-937, stamps :973-974) falls through into 95$.
const LIST_93: readonly CloudPair[] = [...erase([0x00, 0x01, 0x02, 0x22, 0xc0, 0xe0, 0xe1, 0xe2]), ...LIST_95]
// 94$ (:945-953) with stamps (:982-989) — the full 8x3 cloud. The $42 in the
// last stamp row is the SHIPPED ROM byte (:989), transcribed faithfully.
const LIST_94 = zip(
  [0x00, 0x01, 0x02, 0x20, 0x21, 0x22, 0x40, 0x41, 0x42, 0x60, 0x61, 0x62, 0x80, 0x81, 0x82, 0xa0, 0xa1, 0xa2, 0xc0, 0xc1, 0xc2, 0xe0, 0xe1, 0xe2],
  [0x63, 0x5b, 0x53, 0x64, 0x5c, 0x54, 0x65, 0x5d, 0x55, 0x66, 0x5e, 0x56, 0x67, 0x5f, 0x57, 0x68, 0x60, 0x58, 0x69, 0x61, 0x59, 0x42, 0x62, 0x5a],
)

// The 98$ dispatch: indexes 3/5 share 93$ and 4/6 share 94$ — the pulse.
export const DDT_CLOUD_FRAMES: readonly (readonly CloudPair[])[] = [
  LIST_90, // DD-118
  LIST_91, // DD-119
  LIST_92, // DD-120
  LIST_93, // DD-121
  LIST_94, // DD-122
  LIST_93, // DD-123
  LIST_94, // DD-124
  LIST_95, // DD-125
  LIST_96, // DD-126
  LIST_97, // DD-127
]

// ─── table model ────────────────────────────────────────────────────────────
export interface DdtEntry {
  /** DDTADD-1: the address low byte (row = lo & $1F). */
  lo: number
  /** DDTADD: 0 vacant; $10|page intact; >= $14 exploding (DD-9/18/19). */
  hi: number
}
export type DdtTable = DdtEntry[]

export function newDdtTable(): DdtTable {
  return Array.from({ length: NDDT }, () => ({ lo: 0, hi: 0 }))
}

/** A zero high byte is "NO ENTRY" (MLSUB.MAC:444-445, DD-18). */
export function ddtVacant(e: Readonly<DdtEntry>): boolean {
  return e.hi === 0
}

/** hi >= $14 — the CMP I,PLYFLD+400/100 threshold (MLSUB.MAC:446, DD-19). */
export function ddtExploding(e: Readonly<DdtEntry>): boolean {
  return e.hi >= DDT_EXPLODING_MIN
}

/**
 * The scroll gate's "any bomb exploding" input (MLSUB.MAC:1117-1123, DD-45 —
 * scroll.ts ScrollGate.ddtExploding, SC-7). The ROM ORs the four hi bytes
 * against $14, sound only because intact pages stay $10..$12: the seed path
 * rejects column-page 3 (DD-57), keeping the OR below the threshold.
 */
export function anyDdtExploding(table: readonly DdtEntry[]): boolean {
  return table.some((e) => e.hi >= DDT_EXPLODING_MIN)
}

/** Field offset of an entry: ((hi & 3) << 8) | lo (DD-1). */
export function ddtOffset(e: Readonly<DdtEntry>): number {
  return ((e.hi & 3) << 8) | e.lo
}

// ─── DDTS — wave-start placement (MLSUB.MAC:421-442) ────────────────────────
/**
 * Copies DDTST words 0..3 into the bank — or words 8..11 when MODE == $FF
 * (the special attract placements, DD-13/14); word 11 leaves a vacant fourth
 * entry (DD-41). Upright, player-1 bank.
 */
export function ddtPlace(table: DdtTable, specialAttract: boolean): void {
  const words = specialAttract ? DDTST_ATTRACT : DDTST // DD-14/15
  for (let i = 0; i < NDDT; i++) {
    table[i].lo = words[i] & 0xff // DD-16
    table[i].hi = (words[i] >> 8) & 0xff
  }
}

// ─── DDTS2 — stamp restore (MLSUB.MAC:443-476) ──────────────────────────────
// A cell blocks the restore when its masked stamp is $01..$6F ("IF SOMETHING
// IS THERE", DD-22/23/24); blanks and >= ROCK are overwritten ("WE CAN
// OVERWRITE A MUSHROOM IN ATTRACT"). RAW stores — no grey preservation.
function restoreCell(field: Uint8Array, cell: number, stamp: number): void {
  const v = field[cell] & 0x7f // AND I,7F (DD-22)
  if (v !== 0 && v < ROCK_STAMP) return // CMP I,ROCK / BCC (DD-23/24)
  field[cell] = stamp // DD-25/27
}

export function ddtRestore(table: readonly DdtEntry[], field: Uint8Array): void {
  for (let i = NDDT - 1; i >= 0; i--) {
    // sweep 3->0 (DDTS1, DD-28/29)
    const e = table[i]
    if (e.hi === 0) continue // DD-18
    if (e.hi >= DDT_EXPLODING_MIN) continue // DD-19/20
    const base = ddtOffset(e)
    restoreCell(field, base + 0x20, DDT_STAMP + 1) // LDY I,20 first (DD-21/25)
    restoreCell(field, base, DDT_STAMP) // EOR I,20 flip back (DD-26/27)
  }
}

// ─── SHOOT1's bomb branch (MILLI.MAC:1983-1985, 2014-2063) ──────────────────
export type DdtShot = { kind: 'none' } | { kind: 'exploded'; points: number; hitDdt: true }

/**
 * The shot hit a bomb stamp at `offset`. A DDT+1 hit normalizes to the base
 * cell first (upright: OBST -= $20, DD-204/205). The address is matched
 * against the bank byte-for-byte (DD-206); no intact match is "the bomb must
 * be starting to explode" — zero status, nothing mutates (DD-207). A match
 * clears both cells to the BASE cell's grey (the ROM's A register is stored
 * at both addresses, DD-208/209), rewrites the entry to the exploding anchor
 * (lo = base-$61, hi = $B4|page, DD-210/211) and scores 80 (DD-212). The
 * caller applies HITDDT++ via the returned flag (DD-213) and CHAN2 (DD-214).
 */
export function ddtShoot(table: DdtTable, field: Uint8Array, offset: number, stamp: number): DdtShot {
  const base = (stamp & 0x7f) === DDT_STAMP + 1 ? offset - 0x20 : offset // DD-205
  for (let i = NDDT - 1; i >= 0; i--) {
    const e = table[i]
    if (e.hi !== (PLYFLD_PAGE | (base >> 8))) continue // hi match (DD-206)
    if (e.lo !== (base & 0xff)) continue
    const grey = field[base] & 0x80 // DD-208
    field[base] = grey
    field[base + 0x20] = grey // the SAME byte (DD-209)
    const anchor = base - DDT_ANCHOR_BACKSTEP // DD-210
    e.lo = anchor & 0xff
    // anchor stays >= 0 for every legit bomb because the seed path keeps
    // page-0 bombs at lo >= $80 (DD-61/62) and DDTST's own words sit above
    // $61 — the & 0xff is defense-in-depth on that cross-function coupling.
    e.hi = (DDT_EXPLOSION_START | (anchor >> 8)) & 0xff // DD-211
    return { kind: 'exploded', points: DDT_HIT_POINTS, hitDdt: true } // DD-212/213
  }
  return { kind: 'none' } // DD-207
}

// ─── the explosion state machine (MILLI.MAC:841-905) ────────────────────────
/** MUSHD1 count regions (MLSUB.MAC:711-729, upright): row = low 5 bits. */
function mushDelta(cell: number, d: { mush: number; mushTop: number }): void {
  const row = cell & 0x1f // AND I,1F (DD-46)
  if (row < 0x0c) d.mush -= 1 // DD-47
  else if (row >= 0x14) d.mushTop -= 1 // DD-49; $0C..$13 uncounted (DD-48)
}

/**
 * One explosion-update pass. FRAME & 7 !== 0 is a strict no-op (DD-102).
 * Per exploding entry (sweep 3->0): the state steps hi -= $10 (DD-105), the
 * anchor is ((new hi & 3) << 8) | lo (DD-103/106), the frame index is
 * (old hi >> 4) - 2 (four LSRs leave carry CLEAR before SBC #1, DD-107/108),
 * and index 0 ALSO clears the entry while still drawing the erase list
 * (DD-109). Write rules per cell (DD-112..117): blanks and clouds overwritten,
 * letters and bombs preserved, >= $70 destroyed AND counted, grey bit kept.
 */
export function ddtExplosionStep(
  table: DdtTable,
  field: Uint8Array,
  frame: number,
): { mush: number; mushTop: number } {
  const d = { mush: 0, mushTop: 0 }
  if ((frame & DDT_FRAME_MASK) !== 0) return d // DD-102
  for (let i = NDDT - 1; i >= 0; i--) {
    const e = table[i]
    if (e.hi < DDT_EXPLODING_MIN) continue // DD-104
    const oldHi = e.hi
    e.hi = (oldHi - DDT_EXPLOSION_STEP) & 0xff // DD-105
    const anchor = ((e.hi & 3) << 8) | e.lo // DD-103/106
    const idx = ((oldHi >> 4) & 0x0f) - 2 // DD-107/108
    if (idx === 0) e.hi = 0 // DD-109
    for (const [off, stamp] of DDT_CLOUD_FRAMES[idx]) {
      const cell = anchor + off
      const v = field[cell] & 0x7f
      if (v !== 0) {
        if (v < CLOUD_STAMP) continue // letters preserved (DD-113)
        if (v >= DDT_STAMP) {
          if (v < DDT_STAMP + 2) continue // other bombs preserved (DD-115)
          mushDelta(cell, d) // rocks/mushrooms destroyed AND counted (DD-116)
        }
        // [CLOUD, DDT): an old cloud — erasable (DD-114)
      }
      field[cell] = (field[cell] & 0x80) | stamp // grey kept (DD-112/117)
    }
  }
  return d
}

// ─── DDTEXP — the cloud classifier (MILLI.MAC:1942-1945) ────────────────────
/** True when a masked stamp sits in [CLOUD, DDT) (DD-215/216). The kill
 * itself is caller-side: DDTEX1 passes DDT_CLOUD_KILL_FLAG into SHOOT2
 * (DD-217/218) and the per-critter reducers own their scores. */
export function inDdtCloud(stamp: number): boolean {
  const v = stamp & 0x7f
  return v >= CLOUD_STAMP && v < DDT_STAMP
}

// ─── BOMBS — the bomb-mode entry dispatcher (MILLI.MAC:449-488) ─────────────
export interface BombsEnv {
  /** NOCENT (MLDEF.MAC:391, DD-8). */
  nocent: number
  /** MODE bit 7 — special attract never bombs (DD-76). */
  specialAttract: boolean
  /** The GATE read: rnd0 & 7 must be 0 (DD-77). */
  rnd0: number
  /** The SECOND, separate RND0 read for the creature pick (DD-88) — the gate
   * read has bits 0-2 clear, so reusing it degenerates to always-bee. */
  rndPick: number
  /** CENTIN 0..11 (BOMBSL only arms <= $0B, so index centin>>1 stays 0..5). */
  centin: number
  /** The 13 BEEC slot colour bytes; 0 = free (DD-79/80). */
  beec: readonly number[]
}
export type BombCritter = 'bee' | 'dragonfly' | 'mosquito'
export type BombsDecision =
  | { kind: 'none'; delaySet: boolean }
  | { kind: 'enter'; critter: BombCritter; delaySet: true }

const enter = (critter: BombCritter): BombsDecision => ({ kind: 'enter', critter, delaySet: true })

/**
 * One BOMBS call. delaySet mirrors DELAY=$80: it is set the moment the three
 * gates pass, EVEN when no slot is free (DD-78/81). On 'enter' the caller
 * runs the critter's spawn (BEEMV3/FLYMV3/MOSQT3) and decrements NOCENT by
 * one (DD-84/85/91/92 — ml7 wiring).
 */
export function bombs(env: Readonly<BombsEnv>): BombsDecision {
  if (env.nocent === 0) return { kind: 'none', delaySet: false } // DD-75
  if (env.specialAttract) return { kind: 'none', delaySet: false } // DD-76
  if ((env.rnd0 & BOMBS_RND_MASK) !== 0) return { kind: 'none', delaySet: false } // DD-77
  let free = false
  for (let x = BOMBS_SLOTS - 1; x >= 0; x--) {
    // LDX I,12. scan (DD-79/80)
    if (env.beec[x] === 0) {
      free = true
      break
    }
  }
  if (!free) return { kind: 'none', delaySet: true } // DD-81
  const code = BOMBS_CREATURES[env.centin >> 1] // LSR index (DD-82)
  if ((code & 0x80) === 0) return enter('bee') // BPL path (DD-83)
  const shifted = (code << 1) & 0xff // ASL
  if ((shifted & 0x80) !== 0) return enter('mosquito') // BMI — $C0 only (DD-86)
  if (shifted === 0) return enter('dragonfly') // BEQ — $80 codes (DD-87)
  const pick = shifted & env.rndPick // the SECOND read (DD-88)
  if (pick === 0) return enter('bee') // DD-89
  if (pick === 6) return enter('mosquito') // only code $83's mask 6 (DD-90)
  return enter('dragonfly') // DD-91
}

// ─── bomb-mode arming (MILLI.MAC:1916-1925) ─────────────────────────────────
/**
 * A wave-end CENTIN in BOMBSL arms bomb mode (DD-97) and returns the NOCENT
 * budget: (score2 >> 1) + 20 decimal + the LSR carry — NO CLC, so an odd
 * score2 adds one (DD-98/99). Not an arming level -> null. The caller also
 * applies INC BOMBV and DELAY = $40 (DD-100/101 — ml7 wiring).
 */
export function bombModeStart(centin: number, score2: number): number | null {
  if (!BOMBSL.includes(centin)) return null // DD-97
  return ((score2 >> 1) + BOMB_MODE_NOCENT_BASE + (score2 & 1)) & 0xff // DD-98
}

// ─── the SCROLD DDT half (MLSUB.MAC:1231-1295, SC-49) ───────────────────────
/**
 * One down-scroll pass over the bank (sweep 3->0). Exploding entries neither
 * move nor clear (DD-52). Occupied entries step one row down (DEC lo, DD-53);
 * lo & $1E == 0 (rows 0/1) clears the entry (DD-54/55) and FALLS THROUGH into
 * the seed branch — a just-culled entry can re-seed the same pass. Seeding
 * fills at most ONE vacant entry per call (DD-50/56): page = rnd1 & 3 with 3
 * rejected (the right edge, DD-57 — what keeps anyDdtExploding's OR sound),
 * lo = (rnd0 & $E0) | $1E (the top row, DD-59/60), and lo < $80 on page $10
 * rejects (the left edge, DD-61/62). The seed writes DDT+1 at +$20 then DDT
 * at the base (DD-65/67), counting mushTop-- for EVERY nonzero byte it
 * overwrites (DD-64/66 — the top row is in the MUSH+2 region).
 */
export function ddtScrollDown(
  table: DdtTable,
  field: Uint8Array,
  rnd0: number,
  rnd1: number,
): { mushTop: number } {
  const d = { mushTop: 0 }
  let seeded = false // TEMP2+1, the one-bomb-per-line flag (DD-50)
  for (let i = NDDT - 1; i >= 0; i--) {
    const e = table[i]
    if (e.hi !== 0) {
      if (e.hi >= DDT_EXPLODING_MIN) continue // DD-52
      e.lo = (e.lo - 1) & 0xff // DEC X,DDTADD-1 (DD-53)
      if ((e.lo & 0x1e) !== 0) continue // still on screen (DD-54)
      e.hi = 0 // clear — stamps already moved by the field shift (DD-55)
      // ...and fall through into the seed branch (MLSUB.MAC:1248-1249).
    }
    if (seeded) continue // DD-56
    const page = rnd1 & 3
    if (page === 3) continue // right edge (DD-57)
    const hi = PLYFLD_PAGE | page // DD-58
    const lo = (rnd0 & 0xe0) | 0x1e // top row (DD-59/60)
    if (lo < 0x80 && hi === PLYFLD_PAGE) continue // left edge (DD-61/62)
    e.lo = lo
    e.hi = hi
    seeded = true // STX TEMP2+1 (DD-63)
    const base = ((hi & 3) << 8) | lo
    if (field[base + 0x20] !== 0) d.mushTop -= 1 // DD-64
    field[base + 0x20] = DDT_STAMP + 1 // DD-65
    if (field[base] !== 0) d.mushTop -= 1 // DD-66
    field[base] = DDT_STAMP // DD-67
  }
  return d
}

// ─── the SCROLU DDT half (MLSUB.MAC:1379-1400, SC-50) ───────────────────────
/**
 * One up-scroll pass: vacant and exploding entries untouched (DD-68/69);
 * occupied entries step one row up (INC lo, DD-70); row $1F is off the top
 * and clears (DD-71/72). NO seeding on up-scroll — the signature takes no
 * randomness. The ROM tails into SCROL0 (ml3-3's obstacle unstick, DD-73).
 */
export function ddtScrollUp(table: DdtTable): void {
  for (let i = NDDT - 1; i >= 0; i--) {
    const e = table[i]
    if (e.hi === 0) continue // DD-68
    if (e.hi >= DDT_EXPLODING_MIN) continue // DD-69
    e.lo = (e.lo + 1) & 0xff // INC X,DDTADD-1 (DD-70)
    if (((e.lo & 0x1f) ^ 0x1f) === 0) e.hi = 0 // off the top (DD-71/72)
  }
}
