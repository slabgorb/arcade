// src/shell/playfield-palette.ts
//
// Story ml7-11 (GREEN, Loki / Dev) — the RENDER palette for per-region playfield
// colour. The pure core (src/core/playfield-colour.ts) says which colour BYTE
// each field region takes from the 99$ table; this shell seam decodes those
// bytes through the ml2-3 wiring law (decodeColourByte) into the 4-pen array the
// blitter indexes by 2-bit pixel value. Mirrors centipede's shell/palette.ts
// (playfieldPensForWave): one pen set serves normal and poison mushrooms alike —
// they differ by which pixel values their stamp uses.
//
//   pen 0 = background (colour byte $FF drives no line → black)
//   pen 1 = inside of mushroom   (ANCOL+5/+0D, 99$+0, MLIRQ.MAC:265-266)
//   pen 2 = outside of mushroom  (ANCOL+6/+0E, 99$+1, MLIRQ.MAC:270-271)
//   pen 3 = inside of poison     (ANCOL+7/+0F, 99$+2, MLIRQ.MAC:273-274)
//
// COLOUR INDEX: millipede colours by CENTIN — the millipede LENGTH (MLDEF.MAC:4866),
// not a per-wave scheme. INIT sets CENTIN=12 (MILLI.MAC:1169 "SET CENTIPEDE
// SIZE"), so a full millipede — the wave-start view — is colour row 12, the
// default below. The LCOLOR-gated recolour as segments die is a documented
// deferral (session Design Deviations); a fixed index is a steady colour, so the
// ml7-4 no-strobe rule holds by construction.

import { decodeColourByte, type Rgb } from '../core/palette'
import { waveColours, PLAYER_COLOUR, COLOUR_LEVELS } from '../core/playfield-colour'

/** The background colour byte — $FF leaves every output line dark (black). */
const BACKGROUND_COLOUR = 0xff

/**
 * The four playfield pens for a millipede length CENTIN (1..COLOUR_LEVELS),
 * indexed by a stamp's 2-bit pixel value. Defaults to CENTIN=12, the full
 * millipede a fresh wave starts with (MILLI.MAC:1169).
 */
export function playfieldPens(centin: number = COLOUR_LEVELS): readonly Rgb[] {
  const w = waveColours(centin)
  return [
    decodeColourByte(BACKGROUND_COLOUR),
    decodeColourByte(w.insideMushroom),
    decodeColourByte(w.outsideMushroom),
    decodeColourByte(w.poison),
  ]
}

/**
 * The pens for the gun (player ship) and the lives icons — WHITE on every
 * non-background pixel (MOCOL+0F / ANCOL+3, MLIRQ.MAC:297-299). The ship stamp
 * uses pixel value 3, so pen 3 is the one that shows.
 */
export function playerPens(): readonly Rgb[] {
  const white = decodeColourByte(PLAYER_COLOUR)
  return [decodeColourByte(BACKGROUND_COLOUR), white, white, white]
}
