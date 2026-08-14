// src/shared/palette-decoder.ts
//
// The Williams 6809 colour decode, shared by every framebuffer game on that board.
// The hardware packs one colour register as BBGGGRRR — two bits of blue, three of
// green, three of red — into a byte, and each field is scaled up to eight bits for
// display. Joust proved it first (jt1-6); Defender is the SECOND game on the same
// video board (df2-2), so the "extract on the second game" bar (CLAUDE.md) is met and
// the decode moves here VERBATIM. Both games import it; neither keeps a private copy.
//
// The byte FORMAT is a board fact, read from MAME in prose (williams.cpp palette
// init — "16 bytes of BBGGGRRR", williams.cpp:66; palette_init at williams.cpp:1559,
// pinned in each game's dossier), never guessed. The palette ENTRIES are always
// transcribed from each game's own vendored source.

/** A decoded colour: 8-bit channels, opaque unless a later palette says otherwise. */
export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/**
 * Decode one Williams palette byte. The hardware packs BBGGGRRR — two bits of blue,
 * three of green, three of red — into one byte, and each field is scaled up to eight
 * bits for display. The STORED byte is never altered; this is a presentation
 * transform only.
 */
export function paletteToRgba(paletteByte: number): Rgba {
  if (!Number.isInteger(paletteByte) || paletteByte < 0 || paletteByte > 255) {
    throw new RangeError(`paletteToRgba expects a byte 0..255, got ${paletteByte}`)
  }
  const red = paletteByte & 0x07
  const green = (paletteByte >> 3) & 0x07
  const blue = (paletteByte >> 6) & 0x03
  const widen = (value: number, bits: number): number =>
    Math.round((value / ((1 << bits) - 1)) * 255)
  return { r: widen(red, 3), g: widen(green, 3), b: widen(blue, 2), a: 255 }
}
