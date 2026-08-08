// src/core/font35.ts
//
// Story jt10-1 (GREEN, Julia) — FONT35, the 3x5 tight font used for scores,
// BCD displays and the CREDITS row. Transcribed by hand from the vendored 1982
// Williams source, reference/williams-source/joust/MESSAGE.SRC: the FDB
// code->glyph pointer table at :295-343, glyph data S0 (:839) through SARRW
// (:1163-1168). Every glyph header line below is byte-verified against the
// vendored tree by tools/audit/check-citations.mjs (docs/rom-study/claims/
// font.json + subsystems.json SUB-037).
//
// FORMAT: identical packing to FONT57 (see src/core/font57.ts) — `FCB
// XSIZE,YSIZE` then YSIZE rows of XSIZE bytes, each byte two nibble pixels
// (high=left, low=right). Most FONT35 glyphs are 2 bytes wide (4px) x 5 rows;
// a handful (SM, SW, S000, SARRW, and the short punctuation tail) carry their
// own width/height, transcribed as-is.
//
// THE FDB REUSE QUIRK (measured against MESSAGE.SRC, not the jt10-1 setup
// note's first guess — see the session's TEA Design Deviation): the pointer
// table is NOT 1:1 with the data labels for two code slots:
//   'O' (:320) re-points to S0 (S0's own comment: "0 & O")
//   'S' (:324) re-points to S5 (S5's own comment: "5 & S")
// 'T' (:325) has its own distinct ST glyph — it does NOT alias S5.
//
// This module holds LITERAL transcribed data and one pure lookup. No clock, no
// ambient entropy, no browser surface, no shell import — it is core.

export type Pixel = 0 | 1

/** One transcribed glyph, decoded from its `FCB XSIZE,YSIZE` header + rows. */
export interface Glyph {
  /** decoded pixel width = XSIZE * 2 */
  readonly width: number
  /** row count = YSIZE */
  readonly height: number
  /** `height` rows, each `width` pixels of 0|1 */
  readonly rows: ReadonlyArray<ReadonlyArray<Pixel>>
  /** MESSAGE.SRC line of the `FCB XSIZE,YSIZE` header (provenance) */
  readonly srcLine: number
}

/** A transcribed raster font. */
export interface Font {
  readonly name: 'FONT35' | 'FONT57'
  /** nominal layout cell in decoded pixels */
  readonly cellWidth: number
  readonly cellHeight: number
  /** the character each FDB pointer-table index maps to, in table order */
  readonly order: readonly string[]
  glyphFor(ch: string): Glyph | undefined
}

function glyph(srcLine: number, rows: readonly Pixel[][]): Glyph {
  return { width: rows[0].length, height: rows.length, rows, srcLine }
}

// ─── DIGITS — MESSAGE.SRC:839-908 ─────────────────────────────────────────────

// S0 '0 & O' — the reuse target for 'O' — MESSAGE.SRC:839
const S0 = glyph(839, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
])

// S1 '1' — MESSAGE.SRC:846
const S1 = glyph(846, [
  [0, 1, 0, 0],
  [1, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [1, 1, 1, 0],
])

// S2 '2' — MESSAGE.SRC:853
const S2 = glyph(853, [
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
])

// S3 '3' — MESSAGE.SRC:860
const S3 = glyph(860, [
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [1, 1, 1, 0],
])

// S4 '4' — MESSAGE.SRC:867
const S4 = glyph(867, [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 1, 0],
])

// S5 '5 & S' — the reuse target for 'S' — MESSAGE.SRC:874
const S5 = glyph(874, [
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [1, 1, 1, 0],
])

// S6 '6' — MESSAGE.SRC:881
const S6 = glyph(881, [
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
])

// S7 '7' — MESSAGE.SRC:888
const S7 = glyph(888, [
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
])

// S8 '8' — MESSAGE.SRC:895
const S8 = glyph(895, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
])

// S9 '9' — MESSAGE.SRC:902
const S9 = glyph(902, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 1, 0],
])

// SSPC ' ' (space) — all off — MESSAGE.SRC:909
const SSPC = glyph(909, [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
])

// ─── LETTERS — MESSAGE.SRC:916-1090 ───────────────────────────────────────────

// SA 'A' — MESSAGE.SRC:916
const SA = glyph(916, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
])

// SB 'B' — MESSAGE.SRC:923
const SB = glyph(923, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 0, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
])

// SC 'C' — MESSAGE.SRC:930
const SC = glyph(930, [
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
])

// SD 'D' — MESSAGE.SRC:937
const SD = glyph(937, [
  [1, 1, 0, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 0, 0],
])

// SE 'E' — MESSAGE.SRC:944
const SE = glyph(944, [
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
])

// SF 'F' — MESSAGE.SRC:951
const SF = glyph(951, [
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 1, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
])

// SG 'G' — MESSAGE.SRC:958
const SG = glyph(958, [
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
])

// SH 'H' — MESSAGE.SRC:965
const SH = glyph(965, [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
])

// SI 'I' — MESSAGE.SRC:972
const SI = glyph(972, [
  [1, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [1, 1, 1, 0],
])

// SJ 'J' — MESSAGE.SRC:979
const SJ = glyph(979, [
  [0, 0, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
])

// SK 'K' — MESSAGE.SRC:986
const SK = glyph(986, [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 0, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
])

// SL 'L' — MESSAGE.SRC:993
const SL = glyph(993, [
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
])

// SM 'M' — MESSAGE.SRC:1000 (wide: 3 bytes, 6px)
const SM = glyph(1000, [
  [1, 1, 1, 1, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
])

// SN 'N' — MESSAGE.SRC:1007
const SN = glyph(1007, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
])

// SP 'P' — MESSAGE.SRC:1014
const SP = glyph(1014, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
])

// SQ 'Q' — MESSAGE.SRC:1021
const SQ = glyph(1021, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
])

// SR 'R' — MESSAGE.SRC:1028
const SR = glyph(1028, [
  [1, 1, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 0, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
])

// ST 'T' — MESSAGE.SRC:1036 (distinct from S5; the setup note's "T -> S5" was wrong)
const ST = glyph(1036, [
  [1, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
])

// SU 'U' — MESSAGE.SRC:1043
const SU = glyph(1043, [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
])

// SV 'V' — MESSAGE.SRC:1050
const SV = glyph(1050, [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
])

// SW 'W' — MESSAGE.SRC:1064 (wide: 3 bytes, 6px)
const SW = glyph(1064, [
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 1, 1, 1, 1, 0],
])

// SX 'X' — MESSAGE.SRC:1071
const SX = glyph(1071, [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 1, 0],
  [1, 0, 1, 0],
])

// SY 'Y' — MESSAGE.SRC:1078
const SY = glyph(1078, [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
  [1, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
])

// SZ 'Z' — MESSAGE.SRC:1085
const SZ = glyph(1085, [
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 0, 0],
  [1, 1, 1, 0],
])

// ─── PUNCTUATION — MESSAGE.SRC:1092-1168 ──────────────────────────────────────

// SBARW '<-' (left arrow) — MESSAGE.SRC:1092
const SBARW = glyph(1092, [
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
])

// SEQU '=' — MESSAGE.SRC:1099 (short: 4 rows)
const SEQU = glyph(1099, [
  [0, 0, 0, 0],
  [1, 1, 1, 0],
  [0, 0, 0, 0],
  [1, 1, 1, 0],
])

// SDSH '-' — MESSAGE.SRC:1105 (short: 3 rows)
const SDSH = glyph(1105, [
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [1, 1, 1, 0],
])

// SQUE '?' — MESSAGE.SRC:1110
const SQUE = glyph(1110, [
  [1, 1, 1, 0],
  [0, 0, 1, 0],
  [0, 1, 1, 0],
  [0, 0, 0, 0],
  [0, 1, 0, 0],
])

// SEXC '!' — MESSAGE.SRC:1117 (narrow: 1 byte, 2px)
const SEXC = glyph(1117, [
  [1, 0],
  [1, 0],
  [1, 0],
  [0, 0],
  [1, 0],
])

// SBRKL '(' — MESSAGE.SRC:1124
const SBRKL = glyph(1124, [
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
])

// SBRKR ')' — MESSAGE.SRC:1131
const SBRKR = glyph(1131, [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 0, 0],
])

// SSQOT ''' (apostrophe) — MESSAGE.SRC:1138 (narrow+short: 1 byte, 2 rows)
const SSQOT = glyph(1138, [
  [1, 0],
  [1, 0],
])

// SCMMA ',' — MESSAGE.SRC:1142 (narrow: 1 byte, 2px)
const SCMMA = glyph(1142, [
  [0, 0],
  [0, 0],
  [0, 0],
  [1, 0],
  [1, 0],
])

// SPER '.' — MESSAGE.SRC:1149
const SPER = glyph(1149, [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [1, 0],
])

// S000 — a wide triple-bar glyph (no CHARACTER comment in the ROM source; used
// as its own FDB slot, not reused for any letter/digit) — MESSAGE.SRC:1156
const S000 = glyph(1156, [
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0],
  [1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0],
])

// SARRW — a cursor/pointer glyph. The ROM's own comment reads "CHARACTER ' '"
// (MESSAGE.SRC:1164), but its bitmap is a cross, not a blank — using literal
// ' ' here would collide with SSPC's true blank-space glyph (index 10) in the
// character map below, so this glyph is keyed distinctly. — MESSAGE.SRC:1163
const SARRW = glyph(1163, [
  [0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0],
  [1, 1, 1, 1, 1, 0],
  [0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
])

// ─── THE FDB CODE ORDER — MESSAGE.SRC:295-343 (49 code slots; indices 25 and
// 29 REUSE S0/S5 rather than pointing at their own data — see the module
// header note) ──────────────────────────────────────────────────────────────

const ORDER: readonly string[] = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', // :295-304
  ' ', // :305
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', // :306-319
  'O', // :320 — reuse: points at S0
  'P', 'Q', 'R', // :321-323
  'S', // :324 — reuse: points at S5
  'T', 'U', 'V', 'W', 'X', 'Y', 'Z', // :325-331
  '<-', '=', '-', '?', '!', '(', ')', "'", ',', '.', // :332-341
  '000', // :342 — S000, no ROM character name
  'ARRW', // :343 — SARRW, ROM comment says ' ' but the shape is a cursor cross;
  // kept distinct so it cannot shadow SSPC's true blank glyph above
]

const GLYPH_FOR_CODE: readonly Glyph[] = [
  S0, S1, S2, S3, S4, S5, S6, S7, S8, S9,
  SSPC,
  SA, SB, SC, SD, SE, SF, SG, SH, SI, SJ, SK, SL, SM, SN,
  S0, // 'O' reuse — :320
  SP, SQ, SR,
  S5, // 'S' reuse — :324
  ST, SU, SV, SW, SX, SY, SZ,
  SBARW, SEQU, SDSH, SQUE, SEXC, SBRKL, SBRKR, SSQOT, SCMMA, SPER,
  S000, SARRW,
]

const CHAR_TO_GLYPH: ReadonlyMap<string, Glyph> = new Map(ORDER.map((ch, i) => [ch, GLYPH_FOR_CODE[i]]))

export const FONT35: Font = {
  name: 'FONT35',
  cellWidth: 4,
  cellHeight: 5,
  order: ORDER,
  glyphFor(ch: string): Glyph | undefined {
    return CHAR_TO_GLYPH.get(ch)
  },
}
