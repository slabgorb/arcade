// src/shell/palette.ts
//
// Story cp1-6 (GREEN, Julia) — AC-3: the CLRCH-derived colour-RAM palette, no
// invented colours. CLRCH (CENTI4.MAC:883, docs/rom-study/claims/08-render-
// color.json CL-1..CL-11) loads a 3-nibble scheme from table 99$ (indexed by X,
// the colour index — cp4's job to advance per wave) and distributes it to six
// colour-RAM entries. INIT enters with X=0 (CL-11), so this demo's nibbles are
// 99$[0..2] = [0x0D, 0x00, 0x0E] (CL-9) plus the black background 0x0F (CL-10).
//
// ADAPTER POLICY (labelled — NOT a ROM constant): decodeClrchColor is the
// hardware resistor-DAC decode, corroborated schema-only by MAME
// centiped_v.cpp:211 (centiped_paletteram_w): each of the low 3 colour bits is
// INVERTED to a full/zero colour gun (bit set → 0, bit clear → 0xFF); bit 3
// clear dims whichever of blue/green is still full to 0xC0 (blue first, else
// green — CL-1 corroboration).

export interface Rgb {
  r: number
  g: number
  b: number
}

const FULL = 255
const DIM = 0xc0

/** The CLRCH nibble → RGB hardware decode (adapter policy — see module
 *  header). Bit0→red, bit1→green, bit2→blue (each inverted), bit3 clear dims
 *  the first still-full channel of blue/green to 0xC0. */
export function decodeClrchColor(nibble: number): Rgb {
  const r = nibble & 0x1 ? 0 : FULL
  let g = nibble & 0x2 ? 0 : FULL
  let b = nibble & 0x4 ? 0 : FULL
  if (!(nibble & 0x8)) {
    if (b === FULL) b = DIM
    else g = DIM
  }
  return { r, g, b }
}

// Story cp2-13 (GREEN, Julia) — per-round colour cycling. CL-11's original
// "out of scope until cp4" deferral is claimed HERE (CL-17..CL-27): the
// per-player colour cursor LCOLOR (CENDE4.MAC:208, CL-17) is advanced by the
// IRQ +3 per cleared wave (CENIR4.MAC:319 ADC I,03, CL-18), gated by bit7
// (BMI 22$, CL-20) which CENTPC raises once per wave clear (CENTI4.MAC:462-463
// ORA I,80, CL-22), wrapping at DECIMAL 42 (CENIR4.MAC:320 CMP I,42. — the
// trailing period forces decimal under `.RADIX 16`, CL-19). INITSC resets the
// cursor to 0 for a fresh game (CENTI4.MAC:1206, CL-24), so wave 1 = scheme 0
// and the closed form is index = ((wave-1)*3) mod 42 (42 is a multiple of the
// +3 stride from a 0 start, so the reset-to-0 sequence equals the modulus).
// The 2-player bit6 swap (CENTI4.MAC:716-717, CL-23) is transcribed as quarry
// only — this clone is 1-player (cp2-12), so schemeNumberForWave takes no
// player argument.

/** The 42-byte 99$ table (CENTI4.MAC:898-901, CL-9/CL-25/CL-26/CL-27) — raw
 *  ROM nibbles, HEX (`.RADIX 16`). 14 three-nibble schemes; the table's lone
 *  0x06 sits at index 32 (scheme X=30's [X+2] pen) and there is NO 0x07
 *  anywhere in it (CL-26) — the hardware decode (above) never invents one. */
export const SCHEME_TABLE: readonly number[] = [
  0x0d, 0x00, 0x0e, 0x02, 0x04, 0x01, 0x0e, 0x01, 0x0c, 0x04, 0x01, 0x0b, // CENTI4.MAC:898 (CL-9) schemes 0-3
  0x01, 0x0c, 0x0a, 0x09, 0x0b, 0x04, 0x0c, 0x0d, 0x0a, 0x09, 0x0c, 0x0e, // CENTI4.MAC:899 (CL-25) schemes 4-7
  0x0a, 0x0e, 0x01, 0x0b, 0x01, 0x04, 0x01, 0x00, 0x06, 0x0d, 0x0e, 0x0a, // CENTI4.MAC:900 (CL-26) schemes 8-11 — index 32 is the lone 0x06
  0x0e, 0x0c, 0x0b, 0x00, 0x0d, 0x02, // CENTI4.MAC:901 (CL-27) schemes 12-13
]

/** 42 bytes / 3-nibble stride = 14 distinct palettes (CMP I,42., CL-19). */
export const SCHEME_COUNT = SCHEME_TABLE.length / 3

/** The colour-table offset for a given wave: `((wave-1)*3) mod 42` — the
 *  closed form of the IRQ's flag-gated +3/wrap-42 stepping (CL-18/19/20/24).
 *  A non-finite/degenerate wave is clamped to the first valid wave so a
 *  debug-seeded wave (AC-2) can never index off-table. */
export function colorIndexForWave(wave: number): number {
  const w = Number.isFinite(wave) ? Math.max(1, Math.floor(wave)) : 1
  return ((w - 1) * 3) % 42
}

/** The scheme number 0-13 for a given wave (colorIndexForWave / 3). */
export function schemeNumberForWave(wave: number): number {
  return colorIndexForWave(wave) / 3
}

/** Playfield pens 0-3 (COLORR+0..+3) for any wave: background, inside-
 *  mushroom/gun/lives (a=99$[X]), outside-mushroom/alphanumerics
 *  (c=99$[X+2]), poison-inside (b=99$[X+1]) — the CLRCH distribution
 *  (CL-3/4/5) generalized from scheme 0 to the wave's own scheme. The
 *  background pen is 0x0F BLACK on every wave — set outside CLRCH
 *  (CENTI4.MAC:1202-1203, CL-10/CL-24) and therefore scheme-INDEPENDENT. */
export function playfieldPensForWave(wave: number): readonly Rgb[] {
  const i = colorIndexForWave(wave)
  const a = SCHEME_TABLE[i]
  const b = SCHEME_TABLE[i + 1]
  const c = SCHEME_TABLE[i + 2]
  return [decodeClrchColor(0x0f), decodeClrchColor(a), decodeClrchColor(c), decodeClrchColor(b)]
}

/** Sprite pens 0-3 (pen 0 shares the invariant black background; COLORR+9..
 *  +B are 1-3) for any wave: legs (b=99$[X+1]), eyes (c=99$[X+2]), body
 *  (a=99$[X]) — the CLRCH distribution (CL-6/7/8) generalized to the wave's
 *  own scheme. */
export function spritePensForWave(wave: number): readonly Rgb[] {
  const i = colorIndexForWave(wave)
  const a = SCHEME_TABLE[i]
  const b = SCHEME_TABLE[i + 1]
  const c = SCHEME_TABLE[i + 2]
  return [decodeClrchColor(0x0f), decodeClrchColor(b), decodeClrchColor(c), decodeClrchColor(a)]
}

/** Playfield pens 0-3 (COLORR+0..+3), scheme 0 == wave 1 (INITSC reset,
 *  CL-24): background, inside-mushroom/gun/lives, outside-mushroom/
 *  alphanumerics, poison-inside (CL-3/4/5/9/10). Kept for existing
 *  consumers — identical to `playfieldPensForWave(1)`. */
export const PLAYFIELD_PENS: readonly Rgb[] = playfieldPensForWave(1)

/** Sprite pens 0-3 (pen 0 shares the background; COLORR+9..+B are 1-3),
 *  scheme 0 == wave 1: legs, eyes, body (CL-6/7/8). Kept for existing
 *  consumers — identical to `spritePensForWave(1)`. */
export const SPRITE_PENS: readonly Rgb[] = spritePensForWave(1)

/** A canvas-usable `rgb(r, g, b)` string — the only place a colour becomes a
 *  literal string. */
export function rgbCss(colour: Rgb): string {
  return `rgb(${colour.r}, ${colour.g}, ${colour.b})`
}
