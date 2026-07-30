// src/core/difficulty.ts
//
// Story jt3-1 (GREEN, Korben) — the CENTRALIZED difficulty engine (user ruling
// A): the ROM's inter-wave difficulty pass (IWAVE, JOUSTRV4.SRC:1887-1933) made
// THE per-wave source.
//
// Story uf1-2 (GREEN, Julia) — …and made it actually RUN. jt3-1 built everything
// here and nothing ever called it: for a year the cabinet resolved every dial at
// wave 1 forever. `waveValue` is the seam consumers call; `ROW_DISPOSITION` at the
// bottom of this file records, for all 28 rows, whether it is wired, dead in the
// 1982 ROM, or waiting on a mechanic this port does not have yet. READ THAT TABLE
// before assuming a row is available — 25 of the 28 still are not.
//
// This module is committed DATA + a pure decoder — it never
// re-reads the vendored source (the byte gate in tests/difficulty-source.test.ts
// re-derives the 28 DYWORD rows INDEPENDENTLY and pins them against the table
// below). CORE: pure functions over plain numbers — no clock, no ambient entropy,
// no browser surface, no filesystem, no shell import (the jt1-7 purity scanner
// sweeps this file; tests/difficulty.test.ts AC-4 is the teeth test).
//
// ─── WHAT THIS CENTRALIZES (all cited; see tests/difficulty-source.test.ts) ────
//
//   • THE DYTBL DECODE — 28 DYWORD rows (DYTBL, JOUSTRV4.SRC:7304-7331). The
//     DYWORD macro (JOUSTRV4.SRC:210-213) is NOT a bare start→end pair. It emits
//         FDB START1,START2,START3,ENDV,TIM1,TIM2   (6 words = 12 bytes)
//         FCB TIM3,INCRE                            (2 bytes)
//     so the 14-byte struct is three start columns (one per GA1 tier, DYWST0/1/2,
//     :202-204), a signed word END (DYWEND, :205), a 5-byte / 10-nibble
//     per-difficulty step-cadence table (DYWTIM, :206), and a signed byte
//     increment (DYWINC, :207). THE TRAP: the macro moves INCRE (its 4th operand)
//     to the LAST emitted byte — operand order ≠ byte order. `starts` and `end`
//     hold the raw 16-bit words; `timeBytes` the five raw bytes; `inc` the raw
//     signed byte 0..255. DYWLEN = 14 (:208).
//   • THE GA1 STARTING COLUMN — operator difficulty GA1 buckets into three tiers
//     that pick which start column seeds the RAM working copy: 0-3 → 0, 4-6 → 1,
//     7+ → 2 (CMPA #3 / CMPA #6, JOUSTRV4.SRC:930-939). GA1 default 5.
//   • THE IWAVE WALK + PLATEAU — once per wave-advance each row's value walks
//     toward END by its signed increment, gated by the per-difficulty nibble
//     cadence, and CLAMPS at END (the signed BLT/BGT clamp, :1910-1922). Once it
//     reaches END it holds FLAT forever. The RAM copy seeds to the start value
//     with a countdown timer of 2 (:945). On the first wave the walk has run zero
//     times (CIA branches to IWAVE2, skipping the walk — :1883), so wave 1 reads
//     the start; the end-of-wave loop (LBEQ IWAVE, :2099) runs the walk once per
//     subsequent wave — during wave N the walk has run N-1 times.
//
// ─── THE RETROFIT (user ruling A, the jt2-1 migration bar) ────────────────────
// jt2 landed three per-wave knobs as story-local stubs; they are the OTHER knobs
// computed in the SAME IWAVE pass (not DYTBL rows). This module is now their
// source; src/core/wave.ts and src/core/arena.ts delegate to it, so jt2's seeded
// determinism replays reproduce bit-for-bit (the retrofit changes the SOURCE, not
// any wave's realized value):
//   • EMYTIM divider — 2 on waves 1-2, else 1 (JOUSTRV4.SRC:2202-2205).
//   • Lava-level step — $EA → $E5 → $E0, then flat (JOUSTRV4.SRC:1929-1933). The
//     constants (LAVA_START/MIN/STEP) remain arena's cited data; the WALK is here.
//   • The pursuit-nibble budget SEED — {nsmart:0, wsmart: row.pursuers} (WPERSUE,
//     ANDA #$0F / STA WSMART, JOUSTRV4.SRC:2075-2077). Reuses enemy.seedBudget so
//     the engine and the budget stay one law.

import { seedBudget, type IntelBudget } from './enemy.js'
import { LAVA_START, LAVA_MIN, LAVA_STEP } from './arena.js'
import type { WaveRow } from './wave.js'

export type { IntelBudget, WaveRow }

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * One decoded DYWORD row (JOUSTRV4.SRC:210-213). On the wire it is 14 bytes; the
 * decoder unpacks them into the named fields. `name` is the trailing assembler
 * LABEL comment (LAVTIM, BOUPWD, …) — documentation only, never an assembled
 * byte, so it takes no part in the byte gate.
 */
export interface DyRow {
  /** DYWST0/1/2 (:202-204) — the three start columns, one per GA1 tier. Raw signed words 0..65535. */
  starts: readonly [number, number, number]
  /** DYWEND (:205) — the plateau/clamp target. A raw signed word 0..65535. */
  end: number
  /** DYWTIM (:206) — the 5-byte (10-nibble) per-difficulty step-cadence table. */
  timeBytes: readonly number[]
  /** DYWINC (:207) — the signed per-step increment, stored as its raw byte 0..255 (two's-complement). */
  inc: number
  /** The trailing label comment (LAVTIM …). Documentation; not part of the 14 assembled bytes. */
  name: string
}

// ─── The committed DYTBL decode (byte-gated against JOUSTRV4.SRC:7304-7331) ────
//
// GENERATED from the 28 DYWORD rows through the macro's emission order (NOT the
// operand order — INCRE is the LAST byte). This is DATA, not a computation:
// tests/difficulty-source.test.ts re-derives all 392 bytes independently and
// pins them against this table. Every value is radix-cited via its DYWORD source
// line; the JT31-* claims in docs/rom-study/claims/difficulty.json anchor them.

export const DIFFICULTY_TABLE: readonly DyRow[] = Object.freeze(
  [
    { name: 'LAVTIM', starts: [0x000b, 0x0006, 0x0004], end: 0x0001, timeBytes: [0xfa, 0x86, 0x44, 0x33, 0x21], inc: 0xff }, // :7304
    { name: 'LAVGRA', starts: [0x0004, 0x0006, 0x0008], end: 0x002d, timeBytes: [0xfa, 0x86, 0x43, 0x33, 0x21], inc: 0x02 }, // :7305
    { name: 'LAVLAV', starts: [0x0010, 0x0008, 0x0004], end: 0x0001, timeBytes: [0xfa, 0x86, 0x44, 0x33, 0x21], inc: 0xff }, // :7306
    { name: 'EGGWT', starts: [0x0060, 0x0040, 0x0020], end: 0x0010, timeBytes: [0xff, 0xca, 0x86, 0x43, 0x21], inc: 0xfe }, // :7307
    { name: 'EGGWT2', starts: [0x005e, 0x0038, 0x0022], end: 0x0008, timeBytes: [0xca, 0x53, 0xa5, 0x25, 0x21], inc: 0xfc }, // :7308
    { name: 'BODNRG', starts: [0x000e, 0x000e, 0x000c], end: 0x000b, timeBytes: [0xff, 0xff, 0xff, 0xf8, 0x42], inc: 0xff }, // :7309
    { name: 'BODNDI', starts: [0xf000, 0xf200, 0xf800], end: 0xff00, timeBytes: [0x42, 0x11, 0x42, 0x14, 0x21], inc: 0x20 }, // :7310
    { name: 'BODNVY', starts: [0x0080, 0x0100, 0x0200], end: 0x0300, timeBytes: [0x42, 0x11, 0xf8, 0x13, 0x21], inc: 0x20 }, // :7311
    { name: 'BOUPRG', starts: [0xfff1, 0xfff2, 0xfff4], end: 0xfff5, timeBytes: [0xff, 0xff, 0xff, 0xf8, 0x42], inc: 0x01 }, // :7312
    { name: 'BOUPDI', starts: [0x1000, 0x0e00, 0x0800], end: 0x0100, timeBytes: [0x42, 0x11, 0x42, 0x14, 0x21], inc: 0xe0 }, // :7313
    { name: 'BOUPWD', starts: [0x0003, 0x0002, 0x0001], end: 0x0001, timeBytes: [0xfa, 0x86, 0x44, 0x33, 0x21], inc: 0xff }, // :7314
    { name: 'BOUPWU', starts: [0x000a, 0x0008, 0x0006], end: 0x0002, timeBytes: [0xfa, 0x86, 0x44, 0x33, 0x21], inc: 0xff }, // :7315
    { name: 'BOLETM', starts: [0x0020, 0x0015, 0x0010], end: 0x0002, timeBytes: [0x77, 0x66, 0x44, 0x33, 0x21], inc: 0xff }, // :7316
    { name: 'HUDNRG', starts: [0x000f, 0x000e, 0x000c], end: 0x000b, timeBytes: [0xff, 0xff, 0xff, 0xfa, 0x22], inc: 0xff }, // :7317
    { name: 'HUDNDI', starts: [0xf000, 0xf200, 0xf800], end: 0xff00, timeBytes: [0xff, 0xff, 0xff, 0x84, 0x22], inc: 0x20 }, // :7318
    { name: 'HUDNVY', starts: [0x0100, 0x0200, 0x0300], end: 0x0380, timeBytes: [0xff, 0xff, 0xff, 0x84, 0x84], inc: 0x20 }, // :7319
    { name: 'HUUPRG', starts: [0xfff1, 0xfff2, 0xfff4], end: 0xfff5, timeBytes: [0xff, 0xff, 0xff, 0xf8, 0x22], inc: 0x01 }, // :7320
    { name: 'HUUPDI', starts: [0x1000, 0x0e00, 0x0800], end: 0x0100, timeBytes: [0xff, 0xf8, 0xff, 0x84, 0x22], inc: 0xe0 }, // :7321
    { name: 'HUUPWD', starts: [0x0003, 0x0002, 0x0001], end: 0x0001, timeBytes: [0xff, 0xf8, 0xff, 0x83, 0x22], inc: 0xff }, // :7322
    { name: 'HUUPWU', starts: [0x000a, 0x0008, 0x0006], end: 0x0002, timeBytes: [0xff, 0xf8, 0xff, 0x83, 0x22], inc: 0xff }, // :7323
    { name: 'HUUPVY', starts: [0xff80, 0xff00, 0xfe00], end: 0xfe00, timeBytes: [0xff, 0xff, 0xff, 0x84, 0x84], inc: 0x20 }, // :7324
    { name: 'HULETM', starts: [0x0020, 0x0015, 0x0010], end: 0x0002, timeBytes: [0xff, 0xf8, 0x84, 0x33, 0x22], inc: 0xff }, // :7325
    { name: 'SHDNRG', starts: [0x0014, 0x0010, 0x000e], end: 0x000c, timeBytes: [0xff, 0xff, 0xff, 0xfa, 0x82], inc: 0xff }, // :7326
    { name: 'SHUPRG', starts: [0xffec, 0xffe0, 0xfff2], end: 0xfff4, timeBytes: [0xff, 0xff, 0xff, 0xfa, 0x82], inc: 0x01 }, // :7327
    { name: 'SHUPVY', starts: [0xfff0, 0xfe00, 0xfd00], end: 0xfc00, timeBytes: [0xff, 0xff, 0xff, 0xfa, 0x84], inc: 0x20 }, // :7328
    { name: 'SHUPTM', starts: [0x0014, 0x000a, 0x0008], end: 0x0002, timeBytes: [0xff, 0xff, 0xff, 0xfa, 0x82], inc: 0xff }, // :7329
    { name: 'SHLETM', starts: [0x0020, 0x0015, 0x0010], end: 0x0002, timeBytes: [0xff, 0xff, 0xff, 0xfa, 0x82], inc: 0xff }, // :7330
    { name: 'SHCLTM', starts: [0x000a, 0x0008, 0x0006], end: 0x0002, timeBytes: [0xff, 0xff, 0xff, 0xfa, 0x61], inc: 0xff }, // :7331
  ].map((r) => Object.freeze({ ...r, starts: Object.freeze(r.starts), timeBytes: Object.freeze(r.timeBytes) })),
) as readonly DyRow[]

/** 28 — the number of committed DYWORD rows (JOUSTRV4.SRC:7304-7331). */
export const DYTBL_ROW_COUNT = 28

/** 14 — DYWLEN, the assembled byte length of one DYWORD row (JOUSTRV4.SRC:208). */
export const DYWORD_LEN = 14

/** 5 — the operator GA1 factory default (the middle tier). */
export const GA1_DEFAULT = 5

// ─── Signed helpers (the 6809's 16-bit words / 8-bit increment) ───────────────

/** Reinterpret a raw 16-bit word as a signed value (the 6809's D register). */
const s16 = (v: number): number => {
  const w = v & 0xffff
  return w & 0x8000 ? w - 0x10000 : w
}

/** Sign-extend a raw byte (the 6809's SEX before the add). */
const s8 = (v: number): number => {
  const b = v & 0xff
  return b & 0x80 ? b - 0x100 : b
}

// ─── The decode geometry ──────────────────────────────────────────────────────

/**
 * The DYWST start-column index a GA1 value selects: 0-3 → 0, 4-6 → 1, 7+ → 2
 * (CLR / CMPA #3 / INC / CMPA #6 / INC, JOUSTRV4.SRC:932-938). Independent of any
 * row.
 */
export function ga1StartColumn(ga1: number): number {
  return ga1 <= 3 ? 0 : ga1 <= 6 ? 1 : 2
}

/**
 * The per-difficulty step-cadence nibble for a row (JOUSTRV4.SRC:1899-1908):
 * the byte is timeBytes[floor(ga1/2)] — the `ADDB #DYWTIM*2 / ASRB` byte offset —
 * and the HIGH nibble is taken when ga1 is even (BCC → LSRB×4), the LOW nibble
 * when odd (BCS → ANDB #$0F). A nibble N means the value steps once every N waves.
 */
export function stepNibble(row: DyRow, ga1: number): number {
  const byte = row.timeBytes[Math.floor(ga1 / 2)] & 0xff
  return ga1 % 2 === 0 ? (byte >> 4) & 0x0f : byte & 0x0f
}

/**
 * The row's difficulty value in effect DURING a 1-based `wave` (the IWAVE walk,
 * JOUSTRV4.SRC:1890-1926). The RAM working copy seeds to starts[ga1StartColumn]
 * with a countdown timer of 2 (:945); each wave-advance decrements the timer and,
 * when it reaches zero, adds the sign-extended DYWINC and CLAMPS at DYWEND (the
 * signed BLT/BGT clamp), then reloads the timer with the cadence nibble. Wave 1
 * reads the start (the walk has run zero times); any wave past the walk length
 * reads the END value (the plateau).
 */
export function difficultyValue(row: DyRow, ga1: number, wave: number): number {
  const inc = s8(row.inc)
  const end = s16(row.end)
  const nib = stepNibble(row, ga1)
  const stepOnce = (value: number): number => {
    const next = s16(value + inc)
    // Positive inc clamps from below (CMPD / BLT), negative from above (CMPD / BGT).
    return inc >= 0 ? (next < end ? next : end) : next > end ? next : end
  }
  let value = s16(row.starts[ga1StartColumn(ga1)])
  let timer = 2 // LDA #2 / STA 2,Y — JOUSTRV4.SRC:945-946
  for (let p = 1; p <= wave - 1; p++) {
    if (timer === 0) {
      value = stepOnce(value)
      timer = nib
    } else {
      timer -= 1
      if (timer === 0) {
        value = stepOnce(value)
        timer = nib
      }
    }
  }
  return value
}

// ─── uf1-2: the NAMED per-wave seam production actually calls ─────────────────
//
// jt3-1 built everything above and NOTHING EVER CALLED IT. The missing piece was
// an accessor a consumer could reach for by the ROM's own label — the way the 6809
// does it (`SUBD BODNVY`, `LDA BOUPWD`), since each row's assembler label IS the
// DYNADJ RAM address its one consumer loads. `waveValue` is that accessor.

/** The 28 DYWORD row labels in DYTBL order (JOUSTRV4.SRC:7304-7331). */
export type DyRowName = (typeof DYTBL_ROW_NAMES)[number]

export const DYTBL_ROW_NAMES = Object.freeze([
  'LAVTIM',
  'LAVGRA',
  'LAVLAV',
  'EGGWT',
  'EGGWT2',
  'BODNRG',
  'BODNDI',
  'BODNVY',
  'BOUPRG',
  'BOUPDI',
  'BOUPWD',
  'BOUPWU',
  'BOLETM',
  'HUDNRG',
  'HUDNDI',
  'HUDNVY',
  'HUUPRG',
  'HUUPDI',
  'HUUPWD',
  'HUUPWU',
  'HUUPVY',
  'HULETM',
  'SHDNRG',
  'SHUPRG',
  'SHUPVY',
  'SHUPTM',
  'SHLETM',
  'SHCLTM',
] as const)

const ROW_BY_NAME: ReadonlyMap<string, DyRow> = new Map(DIFFICULTY_TABLE.map((r) => [r.name, r]))

/**
 * The row with this ROM label. THROWS on an unknown name rather than returning
 * `undefined`: a bad name is a programming error, and an undefined row would flow
 * straight into `difficultyValue` and yield NaN — a wrong answer that looks like a
 * number.
 */
export function dyRow(name: DyRowName): DyRow {
  const row = ROW_BY_NAME.get(name)
  if (row === undefined) throw new RangeError(`no DYWORD row named '${name}' in DYTBL`)
  return row
}

/**
 * THE SEAM — a row's live value during a 1-based `wave` at operator difficulty
 * `ga1` (default GA1_DEFAULT = 5, the shipped setting). This is what production
 * consumers call.
 *
 * `wave` must be a 1-based integer. It is validated rather than tolerated because
 * the walk runs `wave - 1` times, so wave 0 and every negative would quietly
 * return the START — a legitimate-looking value indistinguishable from wave 1.
 * That silent degradation is exactly what made the frozen-constant bug invisible
 * for as long as it was.
 */
export function waveValue(name: DyRowName, wave: number, ga1: number = GA1_DEFAULT): number {
  if (!Number.isInteger(wave) || wave < 1) {
    throw new RangeError(`wave must be a 1-based integer, got ${wave}`)
  }
  return difficultyValue(dyRow(name), ga1, wave)
}

/**
 * Why a row is or is not read by this port. A row with no consumer is only
 * acceptable as a FACT with an address — the ROM line that reads it, the mechanic
 * this clone lacks, and the story that owns building it.
 */
export type RowDisposition =
  | { readonly kind: 'wired'; readonly consumer: string }
  | { readonly kind: 'dead-in-rom' }
  | {
      readonly kind: 'no-consumer-yet'
      readonly rom: string
      readonly missing: string
      readonly owner: string
    }

const RANGE_SEEK = 'the long/short range-seek gate (no range test in smartDecision)'
const PDIST = 'the PDIST "distance to go" budget'
const WING = 'the PJOYT wing-flap cadence timer'
const DECISION = 'the "time until next decision" timer'
const UP_VY = 'the up-flight VY gate'

/**
 * Every row's disposition, TOTAL over all 28 — data in the module, not prose in an
 * archive note, so the next sweep reads it instead of rediscovering the gap.
 *
 * uf1-2 wires 2. LAVLAV is dead in the ORIGINAL: its label appears exactly ONCE in
 * the whole of JOUSTRV4.SRC, on its own DYWORD line at :7306 — Williams shipped a
 * row nothing reads, so there is no behaviour to port and no story can wire it.
 * The remaining 25 each wait on a mechanic this clone does not have yet.
 */
export const ROW_DISPOSITION: Readonly<Record<DyRowName, RowDisposition>> = Object.freeze({
  // ─── Wired by uf1-2 — the down-seek brakes, the one live consumer chain ────
  BODNVY: Object.freeze({ kind: 'wired', consumer: 'enemy.boundr (the bounder down-seek brake)' }),
  HUDNVY: Object.freeze({ kind: 'wired', consumer: 'enemy.b2undr (the hunter down-seek brake)' }),

  // ─── Dead in the 1982 source itself ───────────────────────────────────────
  LAVLAV: Object.freeze({ kind: 'dead-in-rom' }),

  // ─── uf1-8 — the range-seek gate and the PDIST budget (10 rows) ───────────
  BODNRG: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3801', missing: RANGE_SEEK, owner: 'uf1-8' }),
  BODNDI: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3803', missing: PDIST, owner: 'uf1-8' }),
  BOUPRG: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3844', missing: RANGE_SEEK, owner: 'uf1-8' }),
  BOUPDI: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3851', missing: PDIST, owner: 'uf1-8' }),
  HUDNRG: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3984', missing: RANGE_SEEK, owner: 'uf1-8' }),
  HUDNDI: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3988', missing: PDIST, owner: 'uf1-8' }),
  HUUPRG: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4028', missing: RANGE_SEEK, owner: 'uf1-8' }),
  HUUPDI: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4035', missing: PDIST, owner: 'uf1-8' }),
  SHDNRG: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4243', missing: RANGE_SEEK, owner: 'uf1-8' }),
  SHUPRG: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4257', missing: RANGE_SEEK, owner: 'uf1-8' }),

  // ─── uf1-9 — the wing/decision cadences and the up-flight VY gates (11) ───
  BOUPWD: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3864', missing: WING, owner: 'uf1-9' }),
  BOUPWU: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3894', missing: WING, owner: 'uf1-9' }),
  HUUPWD: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4182', missing: WING, owner: 'uf1-9' }),
  HUUPWU: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4047', missing: WING, owner: 'uf1-9' }),
  BOLETM: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:3909', missing: DECISION, owner: 'uf1-9' }),
  HULETM: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4060', missing: DECISION, owner: 'uf1-9' }),
  SHUPTM: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4283', missing: DECISION, owner: 'uf1-9' }),
  SHLETM: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4316', missing: DECISION, owner: 'uf1-9' }),
  SHCLTM: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4375', missing: DECISION, owner: 'uf1-9' }),
  HUUPVY: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4178', missing: UP_VY, owner: 'uf1-9' }),
  SHUPVY: Object.freeze({ kind: 'no-consumer-yet', rom: 'JOUSTRV4.SRC:4272', missing: UP_VY, owner: 'uf1-9' }),

  // ─── uf1-10 — the egg wait and the lava troll (4 rows) ────────────────────
  EGGWT: Object.freeze({
    kind: 'no-consumer-yet',
    rom: 'JOUSTRV4.SRC:3224',
    missing: 'the settled-egg hatch wait timer (egg.ts models no wait at all)',
    owner: 'uf1-10',
  }),
  EGGWT2: Object.freeze({
    kind: 'no-consumer-yet',
    rom: 'JOUSTRV4.SRC:2761',
    missing: 'the initial egg wait timer',
    owner: 'uf1-10',
  }),
  LAVTIM: Object.freeze({
    kind: 'no-consumer-yet',
    rom: 'JOUSTRV4.SRC:1611',
    missing: "the lava troll's hand-animation frame timer",
    owner: 'uf1-10',
  }),
  LAVGRA: Object.freeze({
    kind: 'no-consumer-yet',
    rom: 'JOUSTRV4.SRC:6395',
    missing: 'a LIVE troll grab — troll.beginGrip exists but has zero production callers (uf1-11)',
    owner: 'uf1-10',
  }),
})

// ─── The retrofitted jt2 knobs, now sourced HERE (user ruling A) ──────────────

/** `EMYTIM` on waves 1-2 = 2 (the divider). */
export const EMYTIM_SLOW = 2

/** `EMYTIM` default = 1 (NO ENEMY SLOW DOWN). */
export const EMYTIM_NORMAL = 1

/**
 * EMYTIM for a 1-based wave number: 2 on waves 1-2, else 1 — the enemy slow-down
 * divider gated on TBRIDGE (seeded 3, decremented per wave; TBRIDGE ≠ 0 on the
 * 1st/2nd wave), JOUSTRV4.SRC:2202-2205.
 */
export function emytimForWave(wave: number): number {
  return wave <= 2 ? EMYTIM_SLOW : EMYTIM_NORMAL
}

/**
 * The lava surface Y for a 1-based wave: $EA → $E5 → $E0, then flat. A five-unit
 * step (SUBA #$5) with a hard floor (CMPA #$E0 / BLS), JOUSTRV4.SRC:1929-1933.
 * Rising lava means DEcreasing Y, so the sequence is monotonically non-increasing.
 * The constants remain arena's cited data; this walk is the difficulty engine's.
 */
export function lavaLevelForWave(wave: number): number {
  let level = LAVA_START
  for (let w = 2; w <= wave; w++) {
    if (level <= LAVA_MIN) break // BLS IWAVE2 — already at the top level
    level -= LAVA_STEP
  }
  return level
}

/**
 * The pursuit-nibble budget seed for a wave row — {nsmart:0, wsmart: row.pursuers}
 * (WPERSUE, ANDA #$0F / STA WSMART, JOUSTRV4.SRC:2075-2077). Reuses
 * enemy.seedBudget so the engine and jt2-2's budget law stay one law.
 */
export function seedBudgetForRow(row: WaveRow): IntelBudget {
  return seedBudget(row.pursuers)
}
