// src/core/font57.ts
//
// Story jt10-1 (GREEN, Julia) — FONT57, the 5x7 stylised banner font used for
// all Joust title/attract/select/game-over text. Transcribed by hand from the
// vendored 1982 Williams source, reference/williams-source/joust/MESSAGE.SRC:
// the FDB code->glyph pointer table at :241-293, glyph data L0 (:347) through
// LCNARW (:830-837). Every glyph header line below is byte-verified against
// the vendored tree by tools/audit/check-citations.mjs (docs/rom-study/claims/
// font.json + subsystems.json SUB-036).
//
// FORMAT (verified, not assumed): each ROM label is `FCB XSIZE,YSIZE` followed
// by YSIZE data rows of XSIZE bytes. Each byte packs two horizontal pixels as
// its hex nibbles — high nibble is the LEFT pixel, low nibble the RIGHT, each
// 0 or 1 — so decoded pixel width is XSIZE*2. Most FONT57 glyphs are 3 bytes
// wide (6px) x 7 rows, but a handful of narrow/short ROM glyphs (LI, LEQU,
// LDSH, LEXC, LBRKL/LBRKR, LSQOT, LCMMA, LPER, LDQOT, LCOLON, LCUR) carry a
// different XSIZE/YSIZE — each glyph below carries its OWN width/height, while
// the font's nominal layout cell stays 6x7 (the digits/letters' size).
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

// ─── DIGITS — MESSAGE.SRC:347-443 ─────────────────────────────────────────────

// L0 '0' — the slashed zero — MESSAGE.SRC:347
const L0 = glyph(347, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// L1 '1' — MESSAGE.SRC:356
const L1 = glyph(356, [
  [0, 0, 1, 0, 0, 0],
  [0, 1, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
])

// L2 '2' — MESSAGE.SRC:365
const L2 = glyph(365, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 0],
])

// L3 '3' — MESSAGE.SRC:375
const L3 = glyph(375, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// L4 '4' — MESSAGE.SRC:385
const L4 = glyph(385, [
  [0, 0, 0, 1, 1, 0],
  [0, 0, 1, 0, 1, 0],
  [0, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
])

// L5 '5' — MESSAGE.SRC:395
const L5 = glyph(395, [
  [1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// L6 '6' — MESSAGE.SRC:405
const L6 = glyph(405, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 1, 1, 0, 0],
  [1, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// L7 '7' — MESSAGE.SRC:415
const L7 = glyph(415, [
  [1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0],
  [0, 1, 0, 0, 0, 0],
])

// L8 '8' — MESSAGE.SRC:425
const L8 = glyph(425, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// L9 '9' — MESSAGE.SRC:435
const L9 = glyph(435, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 1, 1, 0],
  [0, 1, 1, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// LSPC ' ' (space) — all off — MESSAGE.SRC:444
const LSPC = glyph(444, [
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
])

// ─── LETTERS — MESSAGE.SRC:453-707 ────────────────────────────────────────────

// LA 'A' — MESSAGE.SRC:453
const LA = glyph(453, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
])

// LB 'B' — MESSAGE.SRC:463
const LB = glyph(463, [
  [1, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 0, 0],
])

// LC 'C' — MESSAGE.SRC:473
const LC = glyph(473, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// LD 'D' — MESSAGE.SRC:483
const LD = glyph(483, [
  [1, 1, 1, 0, 0, 0],
  [1, 0, 0, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 0, 0],
])

// LE 'E' — MESSAGE.SRC:493
const LE = glyph(493, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// LF 'F' — MESSAGE.SRC:503
const LF = glyph(503, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
])

// LG 'G' — MESSAGE.SRC:513
const LG = glyph(513, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 1, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// LH 'H' — MESSAGE.SRC:523
const LH = glyph(523, [
  [0, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
])

// LI 'I' — MESSAGE.SRC:533 (narrow: 2 bytes wide, 4px)
const LI = glyph(533, [
  [1, 1, 1, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [0, 1, 0, 0],
  [1, 1, 1, 0],
])

// LJ 'J' — MESSAGE.SRC:543
const LJ = glyph(543, [
  [0, 0, 0, 1, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// LK 'K' — MESSAGE.SRC:553
const LK = glyph(553, [
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 1, 0, 0],
  [1, 0, 1, 0, 0, 0],
  [1, 1, 0, 0, 0, 0],
  [1, 0, 1, 0, 0, 0],
  [1, 0, 0, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
])

// LL 'L' — MESSAGE.SRC:563
const LL = glyph(563, [
  [0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 1, 0],
])

// LM 'M' — MESSAGE.SRC:573 (wide: 4 bytes, 8px)
const LM = glyph(573, [
  [0, 1, 1, 0, 1, 1, 0, 0],
  [1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 0, 0, 1, 0, 0],
])

// LN 'N' — MESSAGE.SRC:583
const LN = glyph(583, [
  [1, 0, 0, 0, 1, 0],
  [1, 1, 0, 0, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 0, 0, 1, 1, 0],
  [1, 0, 0, 0, 1, 0],
])

// LO 'O' — MESSAGE.SRC:593 (own glyph, NOT shared with L0 — FONT57 has no reuse)
const LO = glyph(593, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// LP 'P' — MESSAGE.SRC:603
const LP = glyph(603, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
])

// LQ 'Q' — MESSAGE.SRC:613
const LQ = glyph(613, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 0, 0, 1, 0, 0],
  [0, 1, 1, 0, 1, 0],
])

// LR 'R' — MESSAGE.SRC:623
const LR = glyph(623, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 1, 1, 0, 0],
  [1, 0, 1, 0, 0, 0],
  [1, 0, 0, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
])

// LS 'S' — MESSAGE.SRC:632
const LS = glyph(632, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 1, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0],
  [0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// LT 'T' — MESSAGE.SRC:641
const LT = glyph(641, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 1, 1, 1, 0, 0],
])

// LU 'U' — MESSAGE.SRC:651
const LU = glyph(651, [
  [0, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 1, 1, 0, 0],
])

// LV 'V' — MESSAGE.SRC:661
const LV = glyph(661, [
  [0, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 0, 1, 0, 0],
  [0, 1, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
])

// LW 'W' — MESSAGE.SRC:671 (wide: 4 bytes, 8px)
const LW = glyph(671, [
  [0, 1, 0, 0, 0, 1, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 0, 0, 1, 0],
  [1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 0, 0, 1, 0],
  [1, 0, 0, 1, 0, 0, 1, 0],
  [0, 1, 1, 0, 1, 1, 0, 0],
])

// LX 'X' — MESSAGE.SRC:681
const LX = glyph(681, [
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 1, 0, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
])

// LY 'Y' — MESSAGE.SRC:691
const LY = glyph(691, [
  [0, 1, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 1, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
])

// LZ 'Z' — MESSAGE.SRC:700
const LZ = glyph(700, [
  [0, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
])

// ─── PUNCTUATION — MESSAGE.SRC:709-837 ────────────────────────────────────────

// LBARW '<-' (left arrow) — MESSAGE.SRC:709
const LBARW = glyph(709, [
  [0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 0, 1, 0, 0],
])

// LEQU '=' — MESSAGE.SRC:718 (short: 5 rows)
const LEQU = glyph(718, [
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
])

// LDSH '-' — MESSAGE.SRC:725 (short: 4 rows)
const LDSH = glyph(725, [
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
])

// LQUE '?' — MESSAGE.SRC:731
const LQUE = glyph(731, [
  [0, 1, 1, 1, 0, 0],
  [1, 0, 0, 0, 1, 0],
  [1, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
])

// LEXC '!' — MESSAGE.SRC:740 (narrow: 1 byte, 2px)
const LEXC = glyph(740, [
  [1, 0],
  [1, 0],
  [1, 0],
  [1, 0],
  [1, 0],
  [0, 0],
  [1, 0],
])

// LBRKL '(' — MESSAGE.SRC:749 (narrow: 2 bytes, 4px)
const LBRKL = glyph(749, [
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
])

// LBRKR ')' — MESSAGE.SRC:758
const LBRKR = glyph(758, [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 1, 0],
  [0, 0, 1, 0],
  [0, 1, 0, 0],
  [1, 0, 0, 0],
])

// LSQOT ''' (apostrophe) — MESSAGE.SRC:767 (narrow+short: 1 byte, 2 rows)
const LSQOT = glyph(767, [
  [1, 0],
  [1, 0],
])

// LCMMA ',' — MESSAGE.SRC:771 (narrow: 1 byte, 2px)
const LCMMA = glyph(771, [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [1, 0],
  [1, 0],
])

// LPER '.' — MESSAGE.SRC:780
const LPER = glyph(780, [
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [0, 0],
  [1, 0],
])

// LSLSH '/' — MESSAGE.SRC:789
const LSLSH = glyph(789, [
  [0, 0, 0, 0, 1, 0],
  [0, 0, 0, 0, 1, 0],
  [0, 0, 0, 1, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 0, 0],
])

// LAMP '&' — MESSAGE.SRC:798
const LAMP = glyph(798, [
  [0, 1, 0, 0, 0, 0],
  [1, 0, 1, 0, 0, 0],
  [1, 0, 1, 0, 0, 0],
  [0, 1, 0, 0, 0, 0],
  [1, 0, 1, 0, 1, 0],
  [1, 0, 0, 1, 0, 0],
  [0, 1, 1, 0, 1, 0],
])

// LDQOT '"' — MESSAGE.SRC:807 (narrow+short: 2 bytes, 2 rows)
const LDQOT = glyph(807, [
  [1, 0, 1, 0],
  [1, 0, 1, 0],
])

// LCOLON ':' — MESSAGE.SRC:811 (narrow: 2 bytes, 4px)
const LCOLON = glyph(811, [
  [0, 0, 0, 0],
  [1, 1, 1, 0],
  [1, 1, 1, 0],
  [0, 0, 0, 0],
  [0, 0, 0, 0],
  [1, 1, 1, 0],
  [1, 1, 1, 0],
])

// LCUR '_' — MESSAGE.SRC:820 (tall: 8 rows)
const LCUR = glyph(820, [
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0],
])

// LCNARW '^' — MESSAGE.SRC:830
const LCNARW = glyph(830, [
  [0, 0, 1, 0, 0, 0],
  [0, 1, 1, 1, 0, 0],
  [1, 0, 1, 0, 1, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
  [0, 0, 1, 0, 0, 0],
])

// ─── THE FDB CODE ORDER — MESSAGE.SRC:241-293 (53 glyphs, 1:1, no reuse) ──────

const ORDER: readonly string[] = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', // :241-250
  ' ', // :251
  'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', // :252-264
  'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', // :265-277
  '<-', '=', '-', '?', '!', '(', ')', "'", ',', '.', '/', '&', '"', ':', '_', '^', // :278-293
]

const GLYPH_FOR_CODE: readonly Glyph[] = [
  L0, L1, L2, L3, L4, L5, L6, L7, L8, L9,
  LSPC,
  LA, LB, LC, LD, LE, LF, LG, LH, LI, LJ, LK, LL, LM,
  LN, LO, LP, LQ, LR, LS, LT, LU, LV, LW, LX, LY, LZ,
  LBARW, LEQU, LDSH, LQUE, LEXC, LBRKL, LBRKR, LSQOT, LCMMA, LPER, LSLSH, LAMP, LDQOT, LCOLON, LCUR, LCNARW,
]

const CHAR_TO_GLYPH: ReadonlyMap<string, Glyph> = new Map(ORDER.map((ch, i) => [ch, GLYPH_FOR_CODE[i]]))

export const FONT57: Font = {
  name: 'FONT57',
  cellWidth: 6,
  cellHeight: 7,
  order: ORDER,
  glyphFor(ch: string): Glyph | undefined {
    return CHAR_TO_GLYPH.get(ch)
  },
}
