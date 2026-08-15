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

/**
 * The player-area background — BKGND $D6, set by INIT2 ("SET GREY FOR PLAYER
 * AREA", MILLI.MAC:1210-1211; also the first entry of the background table
 * MILLI.MAC:990). CLRCH stores BKGND into ANCOL+8/+0C (MLIRQ.MAC:245-247). The
 * programmers call it "grey", but the active-low wiring (src/core/palette.ts)
 * decodes $D6 to a dark green — the grass band along the bottom PLAYER_AREA_ROWS
 * ($07, conway.ts) rows of the playfield.
 */
export const PLAYER_AREA_COLOUR = 0xd6

/** RED ($1F) — the alphanumeric HUD text and score (MLIRQ.MAC:294-296). */
export const ALPHANUMERIC_COLOUR = 0x1f

// ─── MOTION-OBJECT (SPRITE) COLOURS — the 99$ table's bytes +3..+11 ───────────
// CLRCH's SECOND half (MLIRQ.MAC:275-293) walks bytes 3..11 of the same 99$ row
// into the MOCOL colour-RAM slots, one triple per creature family:
//
//   99$+3 -> MOCOL+1  CENTIPEDE LEGS   99$+4 -> MOCOL+2  EYES   99$+5 -> MOCOL+3  BODY (:275-282)
//   99$+6 -> MOCOL+5  ANT / FLY / BEE          99$+7 -> MOCOL+6         99$+8 -> MOCOL+7  (:283-287)
//   99$+9 -> MOCOL+9  SPIDER / SCORPION / EARWIG / SNAIL   ..+10 -> MOCOL+0A   ..+11 -> MOCOL+0B (:288-293)
//   $1F (RED) -> MOCOL+0E scores/explosions   $00 (WHITE) -> MOCOL+0F player   (MLIRQ.MAC:294-298)
// MOCOL+3's body colour is ALSO stored to MOCOL+0D for DDT explosions (:282).
//
// A motion object carries a `color` attribute byte; the milliped sprite hardware
// packs THREE 2-bit MOCOL sub-indices into it (centiped_v.cpp milliped_set_color,
// :360-387) — see spriteColourIndices below. The bytes are TRANSCRIBED from the
// same 99$ table; tests/sprite-colour.test.ts re-parses MLIRQ.MAC and verifies.

/** The nine motion-object colour bytes of one 99$ row (bytes +3..+11). */
export interface SpriteColours {
  /** 99$+3 -> MOCOL+1 — centipede/millipede legs. */
  readonly centLegs: number
  /** 99$+4 -> MOCOL+2 — centipede/millipede eyes. */
  readonly centEyes: number
  /** 99$+5 -> MOCOL+3 (and +0D explosions) — centipede/millipede body. */
  readonly centBody: number
  /** 99$+6 -> MOCOL+5 — ant / fly / bee (bee, dragonfly, mosquito). */
  readonly bee1: number
  /** 99$+7 -> MOCOL+6. */
  readonly bee2: number
  /** 99$+8 -> MOCOL+7. */
  readonly bee3: number
  /** 99$+9 -> MOCOL+9 — spider / scorpion / earwig / snail (spider, beetle, earwig, inchworm). */
  readonly spider1: number
  /** 99$+10 -> MOCOL+0A. */
  readonly spider2: number
  /** 99$+11 -> MOCOL+0B. */
  readonly spider3: number
}

/**
 * Bytes +3..+11 of each 12-byte `99$` row, CENTIN=1..12, transcribed from
 * MLIRQ.MAC:305-351. Index 0 is CENTIN=1. (Bytes 0..2 are the field regions in
 * FIELD_REGION_COLOURS above; the two tables split the same rows.)
 */
const SPRITE_MOTION_COLOURS: readonly SpriteColours[] = [
  { centLegs: 0x0f, centEyes: 0x39, centBody: 0xe2, bee1: 0x21, bee2: 0xf8, bee3: 0xe0, spider1: 0x14, spider2: 0x04, spider3: 0x68 }, // CENTIN=1  (:305-307)
  { centLegs: 0x04, centEyes: 0xf8, centBody: 0x0f, bee1: 0x04, bee2: 0x1f, bee3: 0x21, spider1: 0x1f, spider2: 0x04, spider3: 0xf8 }, // CENTIN=2  (:309-311)
  { centLegs: 0x0b, centEyes: 0x21, centBody: 0xe7, bee1: 0x21, bee2: 0x1f, bee3: 0x63, spider1: 0x0f, spider2: 0x1f, spider3: 0x04 }, // CENTIN=3  (:313-315)
  { centLegs: 0x27, centEyes: 0x1f, centBody: 0xf8, bee1: 0x1f, bee2: 0x04, bee3: 0xe0, spider1: 0x4f, spider2: 0x1f, spider3: 0x07 }, // CENTIN=4  (:317-319)
  { centLegs: 0x07, centEyes: 0xe7, centBody: 0x1f, bee1: 0x04, bee2: 0x39, bee3: 0x4f, spider1: 0x0f, spider2: 0x63, spider3: 0xf8 }, // CENTIN=5  (:321-323)
  { centLegs: 0x39, centEyes: 0xf8, centBody: 0x68, bee1: 0x0f, bee2: 0x04, bee3: 0x39, spider1: 0xe7, spider2: 0x68, spider3: 0x1f }, // CENTIN=6  (:325-327)
  { centLegs: 0x29, centEyes: 0x39, centBody: 0x27, bee1: 0xe2, bee2: 0x04, bee3: 0x1f, spider1: 0x04, spider2: 0xf8, spider3: 0xe7 }, // CENTIN=7  (:329-331)
  { centLegs: 0x27, centEyes: 0x0f, centBody: 0x4f, bee1: 0x63, bee2: 0xf8, bee3: 0x1f, spider1: 0x39, spider2: 0x1f, spider3: 0x04 }, // CENTIN=8  (:333-335)
  { centLegs: 0x04, centEyes: 0xe0, centBody: 0x39, bee1: 0x27, bee2: 0x1f, bee3: 0xe2, spider1: 0x27, spider2: 0xe0, spider3: 0x1f }, // CENTIN=9  (:337-339)
  { centLegs: 0xf8, centEyes: 0x63, centBody: 0x29, bee1: 0xe2, bee2: 0x39, bee3: 0x1f, spider1: 0x0b, spider2: 0xf8, spider3: 0x21 }, // CENTIN=10 (:341-343)
  { centLegs: 0xf8, centEyes: 0x4f, centBody: 0xe2, bee1: 0xe7, bee2: 0x1f, bee3: 0x04, spider1: 0x21, spider2: 0x4f, spider3: 0x1f }, // CENTIN=11 (:345-347)
  { centLegs: 0xf8, centEyes: 0x1f, centBody: 0x04, bee1: 0xe7, bee2: 0xf8, bee3: 0x4f, spider1: 0x27, spider2: 0x68, spider3: 0x0f }, // CENTIN=12 (:349-351)
]

/** RED ($1F) — MOCOL+0E, scores and explosions (MLIRQ.MAC:294-295). */
export const SCORE_COLOUR = 0x1f

/**
 * A MOCOL slot never written by CLRCH decodes to black — no real motion object
 * indexes one (every creature's `color` lands on a written slot), so this is a
 * defensive floor, not a displayed colour. ($FF drives no output line.)
 */
const MOCOL_UNSET = 0xff

/** The nine motion-object colour bytes for a level (CENTIN 1..COLOUR_LEVELS). */
export function spriteColours(centin: number): SpriteColours {
  if (!Number.isInteger(centin) || centin < 1 || centin > COLOUR_LEVELS) {
    throw new RangeError(`spriteColours expects a CENTIN level 1..${COLOUR_LEVELS}, got ${centin}`)
  }
  return SPRITE_MOTION_COLOURS[centin - 1]
}

/** Build the 16-slot MOCOL colour-RAM table CLRCH fills for a level. */
function mocolTable(centin: number): number[] {
  const s = spriteColours(centin)
  const t: number[] = new Array(16).fill(MOCOL_UNSET)
  t[0x1] = s.centLegs
  t[0x2] = s.centEyes
  t[0x3] = s.centBody
  t[0x5] = s.bee1
  t[0x6] = s.bee2
  t[0x7] = s.bee3
  t[0x9] = s.spider1
  t[0xa] = s.spider2
  t[0xb] = s.spider3
  t[0xd] = s.centBody // DDT explosions share the centipede body colour (:282)
  t[0xe] = SCORE_COLOUR // RED
  t[0xf] = PLAYER_COLOUR // WHITE
  return t
}

/**
 * The MOCOL slot indices a motion object's `color` attribute selects for the
 * three ink pixel values 1, 2, 3. milliped_set_color (centiped_v.cpp:360-387):
 * the sprite's palette base is `color*4` at 4 pens/bank, so the packed byte's
 * bit-pairs pick sub-colours —
 *     value 1 <- MOCOL[base + (color & 3)]
 *     value 2 <- MOCOL[base + ((color >> 2) & 3)]
 *     value 3 <- MOCOL[base + ((color >> 4) & 3)]   where base = 4 * (color >> 6).
 * Verified against CLRCH's own labels: color $39 (millipede head) -> MOCOL+1/2/3
 * (LEGS, EYES, BODY); $79 (bee/dragonfly/mosquito) -> +5/6/7; $B9 (spider &
 * others) -> +9/0A/0B.
 */
export function spriteColourIndices(color: number): readonly [number, number, number] {
  if (!Number.isInteger(color) || color < 0 || color > 0xff) {
    throw new RangeError(`spriteColourIndices expects a byte 0..255, got ${color}`)
  }
  const base = (color >> 6) * 4
  return [base + (color & 3), base + ((color >> 2) & 3), base + ((color >> 4) & 3)]
}

/**
 * The three ink colour BYTES a motion object with attribute `color` paints for
 * pixel values 1, 2, 3, at colour level `centin` (default the full-millipede
 * level, mirroring waveColours' default). Pixel value 0 is the transparent pen
 * and has no MOCOL byte (the shell/render layer skips it).
 */
export function spriteInkBytes(color: number, centin: number = COLOUR_LEVELS): readonly [number, number, number] {
  const table = mocolTable(centin)
  const [i1, i2, i3] = spriteColourIndices(color)
  return [table[i1], table[i2], table[i3]]
}

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
