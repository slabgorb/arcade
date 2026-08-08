// src/core/title.ts
//
// Story jt10-3 (GREEN, Loki) — the TITLE SCREEN's pure DATA (the ROM's MARQUE
// routine, ATT.SRC:50). Core, under the jt1-7 boundary: no clock, no browser
// surface — glyph/vector geometry and ROM strings are data, exactly like
// core/font57.ts, core/select.ts (SEL_*) and core/cabinet.ts (GAME_OVER_TEXT).
// The shell overlay (shell/titleScreen.ts) reuses these; it never re-types them.
//
// Three things the design spec left open were resolved from source before RED
// (see the session Delivery Findings); two of its guesses were wrong:
//   • the logo is a VECTOR line-drawing (the LIST polyline table, ATT.SRC:423-531),
//     NOT a bitmap/.PIC;
//   • there is no "PRESENTED BY" line in any ROM revision — dropped;
//   • the colour-cycle cadence is 87 (ATT.SRC:173), not the spec's ~88.
//
// ─── THE THREE MARQUE TEXT LINES (all FONT57, output via OUTPHR) ──────────────
// MSCOPY $6C '(C) 1982 WILLIAMS ELECTRONICS INC.'  MESSEQU.SRC:129 (bytes PHRASE.SRC:599)
// MSW17  $F7 'EXTRA MOUNT EVERY '                  MESSEQU.SRC:158 (trailing space intact)
// MSW18  $F8 ',000 POINTS'                         MESSEQU.SRC:157
// The extra-mount line is conditional in the ROM (only if a replay/extra-man
// level is set) with a BCD level printed between MSW17 and MSW18.

/** MSCOPY $6C — MESSEQU.SRC:129. Verbatim; the space after "(C)" is the ROM's. */
export const TITLE_COPYRIGHT = '(C) 1982 WILLIAMS ELECTRONICS INC.'
/** MSW17 $F7 — MESSEQU.SRC:158. Verbatim; the trailing space precedes the BCD level. */
export const TITLE_EXTRA_MOUNT = 'EXTRA MOUNT EVERY '
/** MSW18 $F8 — MESSEQU.SRC:157. Verbatim; leading comma. */
export const TITLE_POINTS_SUFFIX = ',000 POINTS'

// ─── THE JOUST WORDMARK — a VECTOR line-drawing (LIST, ATT.SRC:423-531) ───────
// Transcribed byte-for-byte from the LIST table as decoded by the GO interpreter
// (ATT.SRC:85-118) and drawn by LINE (ATT.SRC:340). Each letter is a group of
// polyline strokes keyed by the letter's stored x-offset (XPOS=4, ATT.SRC:47,
// folded in). The five letters appear here in the ROM's DATA order (O,J,U,S,T)
// but their x-offsets place them left→right as J-O-U-S-T. Colours are CL1..CL4
// ($11/$22/$33/$44, ATT.SRC:43-46); a stroke fills between colorLeft/colorRight
// when `fill` (ATT.SRC FILL=$80 / NOFILL=0).

/** One polyline stroke of a logo letter (a LIST fill/colour group). */
export interface LogoStroke {
  readonly fill: boolean
  /** left-pixel colour (CL1..CL4 = 0x11/0x22/0x33/0x44). */
  readonly colorLeft: number
  /** right-pixel colour. */
  readonly colorRight: number
  /** connected vertices, letter-local (add xOffset for the wordmark x). */
  readonly points: readonly (readonly [number, number])[]
}
/** One letter of the JOUST wordmark, keyed by its LIST x-offset. */
export interface LogoLetter {
  readonly xOffset: number
  readonly strokes: readonly LogoStroke[]
}
/** The vector JOUST wordmark (LIST, ATT.SRC:423-531). */
export interface JoustLogo {
  readonly letters: readonly LogoLetter[]
}

/** The JOUST wordmark, transcribed from LIST (ATT.SRC:423-531). */
export const JOUST_LOGO: JoustLogo = {
  letters: [
    { xOffset: 68, strokes: [
      { fill: false, colorLeft: 0x11, colorRight: 0x11, points: [[2,80], [3,100], [8,116], [12,122], [20,127], [30,127], [38,122], [42,117], [48,100], [48,80]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x22, points: [[28,92], [28,85], [30,80], [32,75]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x11, points: [[32,75], [35,86], [35,94]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[14,86], [14,95], [17,104], [22,112], [27,112], [33,104], [36,94]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[28,92], [29,98], [33,104]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[14,95], [14,86], [17,76], [21,68], [23,66], [26,66], [28,68], [32,74]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[3,100], [2,80], [8,66], [14,58], [22,54], [30,54], [37,58], [44,66], [48,80]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[32,53], [43,58]] },
    ] },
    { xOffset: 5, strokes: [
      { fill: false, colorLeft: 0x11, colorRight: 0x11, points: [[9,109], [12,110], [22,122], [32,127], [41,126], [47,123], [52,121]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x22, points: [[46,124], [70,117]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[69,116], [65,100], [64,80]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[52,121], [58,112], [58,80], [60,72], [65,59]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[65,59], [71,65]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x22, points: [[30,76], [44,76]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[30,75], [44,70]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[30,75], [30,70], [65,59]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[44,70], [44,104], [42,108], [36,111], [31,110], [27,106], [24,100], [23,95], [22,93], [21,95], [9,109]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[22,93], [36,91], [38,92], [40,99], [44,100]] },
    ] },
    { xOffset: 110, strokes: [
      { fill: false, colorLeft: 0x22, colorRight: 0x33, points: [[1,118], [13,107]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[1,117], [7,100]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x44, points: [[10,88], [10,98], [12,106]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x44, points: [[13,107], [19,117], [26,124], [34,126], [44,126], [51,124], [54,122]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x33, points: [[54,122], [56,127]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x33, points: [[57,118], [56,128], [63,126], [68,126], [76,128]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[53,121], [57,118]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[74,126], [71,114], [70,84]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[26,80], [26,88], [28,96], [31,102], [36,105], [42,106], [48,104], [53,100], [56,90], [57,77], [58,66]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x11, points: [[8,52], [12,62]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x22, points: [[12,63], [20,62]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x11, points: [[78,50], [72,64], [70,84]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[39,44], [42,88], [44,92], [46,88], [46,60], [54,44]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[54,44], [56,54], [57,66], [57,77]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[54,44], [60,45], [78,49]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[26,80], [28,70], [34,54], [39,44]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[10,88], [12,79], [16,68], [20,62], [31,48]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[13,62], [20,54], [31,48]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[9,51], [17,47], [26,45], [39,43]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[0,58], [16,68]] },
    ] },
    { xOffset: 170, strokes: [
      { fill: false, colorLeft: 0x11, colorRight: 0x33, points: [[56,118], [48,124], [40,127], [25,123], [18,122]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x44, points: [[18,122], [12,114]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[19,121], [20,113], [20,102]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[20,102], [18,90]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[12,85], [19,90]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[18,90], [34,106], [41,108], [44,104], [44,99]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[43,98], [40,94], [20,82], [16,78], [15,70]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x44, points: [[56,118], [68,123]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[55,118], [59,109]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[58,108], [56,99], [50,88], [32,76], [30,70]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x44, points: [[36,78], [56,82]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[55,81], [48,72], [37,66], [32,66], [30,70]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[55,81], [55,63], [44,57], [36,54], [28,53], [23,56], [16,64], [16,78]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[13,63], [21,58]] },
    ] },
    { xOffset: 222, strokes: [
      { fill: false, colorLeft: 0x11, colorRight: 0x33, points: [[15,122], [21,126], [32,127], [52,125], [60,102]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x33, points: [[30,96], [40,78]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x33, points: [[48,68], [65,55]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x44, points: [[40,78], [60,76]] },
      { fill: false, colorLeft: 0x11, colorRight: 0x33, points: [[60,76], [64,72]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[41,77], [45,75], [60,75]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[15,121], [10,111]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[11,110], [11,104], [14,96], [21,81], [32,72]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[59,103], [52,112], [40,116], [32,112], [30,106], [30,96]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[59,102], [47,99], [42,102], [36,106], [30,106]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[1,90], [11,79]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x44, points: [[11,79], [26,74], [31,73]] },
      { fill: false, colorLeft: 0x22, colorRight: 0x44, points: [[4,80], [7,81]] },
      { fill: true, colorLeft: 0x22, colorRight: 0x44, points: [[4,65], [9,62]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[9,80], [9,62], [26,64], [37,66], [50,58], [64,55]] },
      { fill: true, colorLeft: 0x11, colorRight: 0x33, points: [[48,68], [63,72]] },
    ] },
  ],
}

// ─── THE MARQUE COLOUR CYCLE (FLASH, ATT.SRC:142-184) ────────────────────────
// The marquee palette MARCOL (ATT.SRC:288-294): six 8-byte rows. Row 0 is the
// initial/static palette; FLASH cycles the five rows MARCOL+8..MAREND, advancing
// one row every TITLE_COLOR_CADENCE and wrapping. Bytes are transcribed from the
// ROM's @ octal / $ hex literals by RADIX (e.g. @300 = 192, @377 = 255).

/** MARCOL (ATT.SRC:288-294): 6 rows × 8 bytes. Row 0 static; rows 1-5 cycle. */
export const TITLE_PALETTE: readonly (readonly number[])[] = [
  [0x00, 0x00, 0x07, 0x3f, 0x05, 0xff, 0xe8, 0xe8], // :288  $/@ mixed initial row
  [0o000, 0o001, 0o003, 0o005, 0o007, 0o005, 0o003, 0o001], // :289
  [0o000, 0o010, 0o030, 0o050, 0o070, 0o050, 0o030, 0o010], // :290
  [0o000, 0o000, 0o100, 0o200, 0o300, 0o200, 0o100, 0o000], // :291
  [0o000, 0o011, 0o033, 0o055, 0o077, 0o055, 0o033, 0o011], // :292
  [0o000, 0o011, 0o122, 0o244, 0o377, 0o244, 0o122, 0o011], // :293
]

/** ((((2*60+30)/16)+1)*8)+7 — ATT.SRC:173, "CHANGE COLORS EVERY 2 1/2 SECONDS". */
export const TITLE_COLOR_CADENCE = 87

/** The rows FLASH cycles: MARCOL+8..MAREND = all but the static row 0. */
const CYCLE_ROWS = TITLE_PALETTE.length - 1

/**
 * Which cycling palette row (0..CYCLE_ROWS-1, i.e. TITLE_PALETTE[1+n]) is active
 * at frame `tick`. Pure and deterministic — no clock; the shell passes its frame
 * counter. Advances one row every TITLE_COLOR_CADENCE frames and wraps
 * (FLASH steps PCOLOR by 8 and loops MARCOL+8..MAREND, ATT.SRC:159-164).
 */
export function titleColorRow(tick: number): number {
  const step = Math.floor(tick / TITLE_COLOR_CADENCE)
  return ((step % CYCLE_ROWS) + CYCLE_ROWS) % CYCLE_ROWS
}
