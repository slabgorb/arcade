// src/core/field.ts
//
// Story mc1-2 (GREEN, Yoda) — the fixed playfield as PURE data: the six cities
// and three missile bases at their cabinet coordinates. Core owns the layout;
// the shell (shell/render.ts) paints it. No enemies, no damage — just where the
// nine fixed structures live.
//
// PURE: plain constants, no clock, no entropy, no browser surface, no shell
// import. The src/core purity sweep (tests/purity.test.ts) scans this file.
//
// ─── SOURCE OF TRUTH: all `W3COMN.MAC` (REV-01, `.RADIX 16` at :1) ────────────
// Coordinates are the DECIMAL decode of the HEX the ROM ships; each carries its
// source symbol. Counts: NCITY=6 (:39), NMISBA=3 (:41). The H/V axis is the
// cabinet's — V grows UPWARD from the bottom (TOPSCR=222. is the top, :107), so
// the structures at V 0x10..0x16 sit in the bottom band. render.ts flips V for
// the top-left-origin canvas.

/** One fixed structure's cabinet position (decimal decode of the hex source). */
export interface FieldPos {
  /** Horizontal cabinet coordinate — CITYnH / MISBnH (8-bit, 0x00..0xFF). */
  readonly h: number
  /** Vertical cabinet coordinate — CITYnV / MISBnV. Origin at the BOTTOM. */
  readonly v: number
}

/** Max cities — `W3COMN.MAC:39` (`NCITY=6`). */
export const NCITY = 6

/**
 * Default starting cities (REV-01) — the count a new game begins with, DISTINCT
 * from the `NCITY` max. NEW GAME SETUP reads it from `STCITY[OPTIO2 & SCITYM]`
 * (`STCITY: .BYTE 6,4,5,7`, `W3MAIN.MAC:3895`); with the option-2 bits clear the
 * default is entry 0 = 6. SCITYM's "5 cities" is the option-2 (Y=2) selection, not
 * the default. See `docs/rom-study/starting-cities.md` (claim `MC-STCITY-START`).
 */
export const START_CITIES = 6

/** Missile bases — `W3COMN.MAC:41` (`NMISBA=3`). */
export const NMISBA = 3

/** The six cities in source order — `W3COMN.MAC:123-145`. */
export const CITIES: readonly FieldPos[] = [
  { h: 0x5f, v: 0x10 }, // CITY1H/CITY1V :123/:125
  { h: 0xb4, v: 0x15 }, // CITY2H/CITY2V :127/:129
  { h: 0x94, v: 0x12 }, // CITY3H/CITY3V :131/:133
  { h: 0x2c, v: 0x12 }, // CITY4H/CITY4V :135/:137
  { h: 0x47, v: 0x11 }, // CITY5H/CITY5V :139/:141
  { h: 0xd0, v: 0x11 }, // CITY6H/CITY6V :143/:145
]

/** The three missile bases in source order — `W3COMN.MAC:147-157`. */
export const BASES: readonly FieldPos[] = [
  { h: 0x14, v: 0x16 }, // MISB1H/MISB1V :147/:149
  { h: 0x7b, v: 0x16 }, // MISB2H/MISB2V :151/:153
  { h: 0xf0, v: 0x16 }, // MISB3H/MISB3V :155/:157
]

// ─── mc3-1 (GREEN, Yoda): the STATEFUL structures the combat loop mutates ─────
// mc1's constants above fix WHERE the nine structures sit; mc3 adds the live
// state — a city that can die, a base that can die and holds ABM ammo — built
// from those same cited positions (render still reads CITIES/BASES for layout,
// so nothing above changes). Append-only.

/** ABMs loaded per base at a fresh game — `W3COMN.MAC:29` (`MAXMIS=10.`, decimal
 *  override; claim MC-MAXMIS). */
export const MAXMIS = 10

/** A city that can be destroyed (mc3). Position is the fixed cabinet coord. */
export interface City {
  readonly pos: FieldPos
  readonly alive: boolean
}

/** A missile base: destroyable, and its ABM magazine. `ammo` starts at MAXMIS. */
export interface Base {
  readonly pos: FieldPos
  readonly alive: boolean
  readonly ammo: number
}

/** Six live cities at the cited CITY positions — a fresh game's defended cities. */
export function createCities(): readonly City[] {
  return CITIES.map((pos) => ({ pos, alive: true }))
}

/** Three live bases at the cited MISB positions, each loaded with MAXMIS ABMs. */
export function createBases(): readonly Base[] {
  return BASES.map((pos) => ({ pos, alive: true, ammo: MAXMIS }))
}
