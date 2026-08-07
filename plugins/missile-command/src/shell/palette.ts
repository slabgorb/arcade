// src/shell/palette.ts
//
// Story mc9-2 (GREEN, Yoda) — the per-wave 8-colour palette, ported from SET UP
// COLORS FOR NEXT WAVE (SETCOL, W3DSUP.MAC:1583). This resolves open question O-5:
// how REV-01 maps a pixel's 3-bit index to one of the 8 hardware colours.
//
// ─── THE MECHANISM (verified against reference/source; docs/rom-study/palette.md) ─
// A pixel carries a 3-bit colour index; those 3 bits select one of eight colour
// REGISTERS COL000..COL111 (W3INT.MAC:93-107 — the register names ARE their binary
// index). Each wave, SETCOL fills those 8 registers from one of ten per-wave rows
// (W3DSUP.MAC:1684-1702), selected through a 10-entry dispatch table (W3DSUP.MAC:
// 1655-1673) by index ((WAVENO-1) >> 1) mod 10 (W3DSUP.MAC:1593-1615) — so the
// palette changes every TWO waves and repeats every 20. Each row is packed by the
// DBLCOL macro (W3DSUP.MAC:1677-1679) as `A*10+B` under `.RADIX 16` (10 = 0x10, so
// each arg is a nibble); SETCOL distributes them so the DBLCOL argument order IS the
// COL000..COL111 order. A register holds a colour CODE (CWHITE..CBLACK, W3COMN.MAC:
// 491-505 — eight named hues at even codes 0..0x0E).
//
// The legend for the 8 slots (W3DSUP.MAC:1706): COL000=SKY, COL001=GROUND,
// COL010=ICBMS, COL011=CITY(BOTTOM), COL100/COL101=UNUSED(FLASH), COL110=ABMS,
// COL111=CITY(TOP)&ABMS.
//
// We reproduce the palette and its per-wave selection. We do NOT reproduce the
// hardware ADDRESS SCRAMBLE (get_bit3_addr / the 3rd-colour-bit video-RAM scatter,
// missile.cpp:617-625) — that is a memory-layout detail of the real PCB, invisible
// on a modern canvas, and stays a deliberate non-goal (the other half of O-5).
//
// ADAPTER POLICY (labelled — NOT a ROM constant): the ROM stores colour CODES, not
// RGB; the code→RGB decode was a resistor DAC on the cabinet PCB. colorCodeToRgb is
// that decode, keyed by each code's OWN name (CWHITE→white … CBLACK→black), so the
// eight named hues render as eight distinct colours. The flash cycle INCs a code by
// one each frame (W3INT.MAC:299-303); since the eight hues sit at even codes, `INC`
// nudges within the same hue slot — colorCodeToRgb keys on `code >> 1` so an odd
// (mid-flash) code decodes to its base hue rather than an undefined colour.

export interface Rgb {
  r: number
  g: number
  b: number
}

// ─── The 8 colour codes (W3COMN.MAC:491-505), by name. HEX under `.RADIX 16`. ────
const CWHITE = 0x0
const CYELLO = 0x2
const CPURPL = 0x4
const CRED = 0x6
const CBLUGR = 0x8
const CGREEN = 0xa
const CBLUE = 0xc
const CBLACK = 0xe

/** The ten per-wave palettes (W3DSUP.MAC:1684-1702), in DISPATCH-TABLE order
 *  (W3DSUP.MAC:1655-1673): index 0 = WV1COL … 9 = WV8COL. Each row is its 8 DBLCOL
 *  args = the colour codes for COL000..COL111. The lone bare `0` in WVDCOL
 *  (W3DSUP.MAC:1688) is the CWHITE code 0. */
const PALETTES: readonly (readonly number[])[] = [
  /* 0  WV1COL */ [CBLACK, CYELLO, CRED, CBLUGR, CRED, CBLACK, CBLUE, CBLUE],
  /* 1  WV5COL */ [CBLACK, CYELLO, CGREEN, CBLUGR, CGREEN, CBLACK, CBLUE, CBLUE],
  /* 2  WV6COL */ [CBLACK, CBLUE, CRED, CYELLO, CRED, CPURPL, CGREEN, CGREEN],
  /* 3  WVDCOL */ [CBLACK, CRED, CYELLO, CYELLO, CWHITE, CGREEN, CBLUE, CBLUE],
  /* 4  WV7COL */ [CBLUE, CYELLO, CRED, CPURPL, CRED, CBLUE, CBLACK, CBLACK],
  /* 5  WV9COL */ [CBLUGR, CYELLO, CRED, CBLACK, CRED, CBLUGR, CBLUE, CBLUE],
  /* 6  WVACOL */ [CPURPL, CGREEN, CBLACK, CBLACK, CPURPL, CBLUGR, CYELLO, CYELLO],
  /* 7  WVBCOL */ [CYELLO, CGREEN, CBLACK, CWHITE, CBLACK, CYELLO, CRED, CRED],
  /* 8  WVCCOL */ [CWHITE, CRED, CPURPL, CYELLO, CPURPL, CWHITE, CGREEN, CGREEN],
  /* 9  WV8COL */ [CRED, CYELLO, CBLACK, CGREEN, CBLACK, CRED, CBLUE, CBLUE],
]

/** The number of distinct per-wave palettes (WAVEND-WAVCOL, W3DSUP.MAC:1655-1675). */
export const PALETTE_COUNT = PALETTES.length

/** The FLSHCO mask that flashes colours 4 & 5 during play (GAMEFL, W3COMN.MAC:489). */
export const FLASH_MASK = 0x30

/** The colour registers that cycle during play — COL100 & COL101, the bits set in
 *  FLASH_MASK (the per-VBLANK INC at W3INT.MAC:291-313). */
export const FLASH_SLOTS: readonly number[] = [4, 5]

/** The colour registers, indexed by the 8 legend slots (COL000..COL111). Kept for
 *  render readability so a call site can say `SLOT.SKY` rather than a bare 0. */
export const SLOT = {
  SKY: 0,
  GROUND: 1,
  ICBMS: 2,
  CITY_BOTTOM: 3,
  ABMS: 6,
  CITY_TOP: 7,
} as const

/** The palette index for a wave: ((wave-1) >> 1) mod 10 — the SETCOL selection
 *  (W3DSUP.MAC:1593-1615) in closed form. A degenerate/debug-seeded wave clamps to
 *  the first valid wave so the lookup can never index off-table. */
export function paletteIndexForWave(wave: number): number {
  const w = Number.isFinite(wave) ? Math.max(1, Math.floor(wave)) : 1
  return ((w - 1) >> 1) % PALETTE_COUNT
}

/** The 8 ROM colour codes for a wave, in COL000..COL111 order. */
export function paletteCodesForWave(wave: number): readonly number[] {
  return PALETTES[paletteIndexForWave(wave)]
}

// ─── The code→RGB adapter (labelled policy — see module header). Eight named hues,
//     keyed by `code >> 1` so both a code and its odd flash-INC neighbour decode to
//     the same hue. CBLACK (0x0E) is pure black — the sky/backdrop. ────────────────
const HUES: readonly Rgb[] = [
  { r: 255, g: 255, b: 255 }, // 0  CWHITE
  { r: 255, g: 255, b: 0 }, //   2  CYELLO
  { r: 255, g: 0, b: 255 }, //   4  CPURPL
  { r: 255, g: 0, b: 0 }, //     6  CRED
  { r: 0, g: 255, b: 255 }, //   8  CBLUGR (blue-green)
  { r: 0, g: 255, b: 0 }, //     A  CGREEN
  { r: 0, g: 0, b: 255 }, //     C  CBLUE
  { r: 0, g: 0, b: 0 }, //       E  CBLACK
]

/** Decode a colour code to RGB (adapter policy). */
export function colorCodeToRgb(code: number): Rgb {
  return HUES[(code >> 1) & 0x7]
}

/** The 8 RGB colours for a wave — the ROM codes decoded through the adapter. */
export function paletteForWave(wave: number): readonly Rgb[] {
  return paletteCodesForWave(wave).map(colorCodeToRgb)
}

/** A canvas-usable `rgb(r, g, b)` string — the one place a colour becomes a literal. */
export function rgbCss(colour: Rgb): string {
  return `rgb(${colour.r}, ${colour.g}, ${colour.b})`
}
