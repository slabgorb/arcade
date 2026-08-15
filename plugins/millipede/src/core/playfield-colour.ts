// src/core/playfield-colour.ts
//
// Story ml7-11 (GREEN, Loki / Dev) — the PER-REGION PLAYFIELD PALETTE: the
// per-slot semantic map and the per-level colour-table walk that ml2-3's
// palette seam (src/core/palette.ts) deliberately deferred to "the render/sim
// stories behind ml2-3". Pure data derived from the ROM; the ml2-3 decode
// (decodeColourByte) turns each byte here into the monitor's RGB.
//
// ─── CLRCH — COLOR RAM INITIALIZATION (MLIRQ.MAC:242) ────────────────────────
// CLRCH forms the table index X = 12*(CENTIN-1) (MLIRQ.MAC:256-263) and reads
// the per-level `99$` colour table (MLIRQ.MAC:304-351 — one 12-byte row per
// CENTIN level 1..12). The ROUTINE, not the table's inline comment, assigns the
// field regions from the first three bytes of each row:
//
//   99$+0 -> ANCOL+5 / ANCOL+0D   INSIDE OF MUSHROOM      (MLIRQ.MAC:265-266)
//                                 (also DDT explosions, ANCOL+1/+9, :267-268)
//   99$+1 -> ANCOL+6 / ANCOL+0E   OUTSIDE OF MUSHROOM     (MLIRQ.MAC:270-271)
//   99$+2 -> ANCOL+7 / ANCOL+0F   INSIDE OF POISON MUSHROOM (MLIRQ.MAC:273-274)
//
// The table's own line-304 comment reads "(MUCHROOMS-INSIDE,OUTSIDE,DDT)", which
// mislabels the third byte "DDT". It is NOT: byte 0 is the byte shared with DDT
// explosions, and byte 2 is INSIDE-OF-POISON. The routine's stores are the
// authority. See docs/rom-study/claims/06-colour-ram-palette.json (PAL-5/6/12).
//
// Two colours are IMMEDIATE constants, loaded after the table walk and therefore
// wave-invariant:
//   $1F RED   -> ANCOL+2   ALPHANUMERICS (HUD text/score)   (MLIRQ.MAC:294-296)
//   $00 WHITE -> MOCOL+0F  PLAYER, ANCOL+3 (gun + lives)    (MLIRQ.MAC:297-299)
//
// The bytes below are TRANSCRIBED from the vendored 99$ table (a colour-RAM
// value is program data, not a live read — a browser core cannot open the file);
// tests/playfield-colour.test.ts re-parses MLIRQ.MAC and byte-verifies every row.
//
// Pure: no clock, no entropy, no browser surface (the ml1-1 scanner sweeps this
// directory).

/** The three ROM-derived colour bytes for a level's playfield field regions. */
export interface WaveColours {
  /** 99$+0 — inside of mushroom (shared with DDT explosions). */
  readonly insideMushroom: number
  /** 99$+1 — outside of mushroom. */
  readonly outsideMushroom: number
  /** 99$+2 — inside of poison mushroom. */
  readonly poison: number
}

/**
 * The first three bytes (inside / outside / poison) of each 12-byte `99$` row,
 * CENTIN=1..12, transcribed from MLIRQ.MAC:304-351. Index 0 is CENTIN=1.
 */
const FIELD_REGION_COLOURS: readonly WaveColours[] = [
  { insideMushroom: 0x1f, outsideMushroom: 0x27, poison: 0x21 }, // CENTIN=1  (:304)
  { insideMushroom: 0xef, outsideMushroom: 0x63, poison: 0x39 }, // CENTIN=2  (:308)
  { insideMushroom: 0x4f, outsideMushroom: 0x27, poison: 0xf8 }, // CENTIN=3  (:312)
  { insideMushroom: 0xe7, outsideMushroom: 0x39, poison: 0x0f }, // CENTIN=4  (:316)
  { insideMushroom: 0x0b, outsideMushroom: 0xe7, poison: 0x68 }, // CENTIN=5  (:320)
  { insideMushroom: 0x4f, outsideMushroom: 0xe2, poison: 0x27 }, // CENTIN=6  (:324)
  { insideMushroom: 0x4f, outsideMushroom: 0x0b, poison: 0x21 }, // CENTIN=7  (:328)
  { insideMushroom: 0x29, outsideMushroom: 0x67, poison: 0xf8 }, // CENTIN=8  (:332)
  { insideMushroom: 0xf8, outsideMushroom: 0x6f, poison: 0xe7 }, // CENTIN=9  (:336)
  { insideMushroom: 0x04, outsideMushroom: 0x0f, poison: 0xe7 }, // CENTIN=10 (:340)
  { insideMushroom: 0x39, outsideMushroom: 0xa7, poison: 0x04 }, // CENTIN=11 (:344)
  { insideMushroom: 0x0b, outsideMushroom: 0xe2, poison: 0xf8 }, // CENTIN=12 (:348)
]

/** The number of colour levels the `99$` table holds (CENTIN 1..12). */
export const COLOUR_LEVELS = FIELD_REGION_COLOURS.length

/** WHITE ($00) — the gun (player ship) and lives icons (MLIRQ.MAC:297-299). */
export const PLAYER_COLOUR = 0x00

/** RED ($1F) — the alphanumeric HUD text and score (MLIRQ.MAC:294-296). */
export const ALPHANUMERIC_COLOUR = 0x1f

/**
 * The playfield field-region colour bytes for a level. CENTIN is the 1-based
 * level colour index; the `99$` table has exactly COLOUR_LEVELS rows, so any
 * value outside 1..COLOUR_LEVELS is a caller bug and a deterministic port must
 * say so here (the ml2-3 byte-guard discipline).
 */
export function waveColours(centin: number): WaveColours {
  if (!Number.isInteger(centin) || centin < 1 || centin > COLOUR_LEVELS) {
    throw new RangeError(`waveColours expects a CENTIN level 1..${COLOUR_LEVELS}, got ${centin}`)
  }
  return FIELD_REGION_COLOURS[centin - 1]
}
