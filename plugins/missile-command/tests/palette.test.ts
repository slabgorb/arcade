// plugins/missile-command/tests/palette.test.ts
//
// Story mc9-2 — RED phase (Han Solo / TEA). Per-wave 8-colour palette, ported from
// SET UP COLORS FOR NEXT WAVE (W3DSUP.MAC:1583). This file pins the palette MODULE
// (src/shell/palette.ts) against the ROM as CI-independent fixtures; its companion
// palette-source.test.ts re-derives the same numbers straight from the vendored
// source (skips on CI) so a fixture that agrees with a typo here still fails there.
//
// ─── THE ROM FACTS (verified against reference/source this session) ──────────────
// • 8 colour CODES (W3COMN.MAC:491-505, .RADIX 16): CWHITE=0, CYELLO=2, CPURPL=4,
//   CRED=6, CBLUGR=8, CGREEN=0A, CBLUE=0C, CBLACK=0E — eight named hues at EVEN codes.
// • The DBLCOL macro (W3DSUP.MAC:1677-1679) packs `A*10+B` with 10=0x10, so a row's
//   8 args land as high/low nibbles; SETCOL (W3DSUP.MAC:1619-1647) distributes them
//   so DBLCOL arg order IS the pixel-index order COL000..COL111. Net: a palette is
//   its 8 DBLCOL args, in order, as colour codes.
// • Ten palette rows (W3DSUP.MAC:1684-1702) selected through a 10-entry dispatch
//   table (W3DSUP.MAC:1655-1673) by index `((WAVENO-1) >> 1) mod 10` (W3DSUP.MAC:
//   1593-1615): the palette changes every TWO waves and repeats every 20.
// • Slot legend (W3DSUP.MAC:1706): SKY, GROUND, ICBMS, CITY(BOTTOM), UNUSED(FLASH),
//   UNUSED(FLASH), ABMS, CITY(TOP)&ABMS — i.e. COL000..COL111.
// • The two flashing slots are COL100 & COL101 (GAMEFL=0x30, W3COMN.MAC:489; the
//   per-VBLANK INC at W3INT.MAC:291-313).
// • There are NO RGB values in the ROM — code→RGB is a resistor DAC on the PCB, so
//   colorCodeToRgb is LABELLED ADAPTER POLICY, not a ROM constant (centipede precedent).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/shell/palette.ts is an empty RED seed today — no PALETTES, no paletteForWave,
// no adapter. Every assertion that touches a mc9-2 symbol fails on a self-describing
// "not implemented yet" throw. GREEN (Yoda) grows the module.
//
// tsc STAYS GREEN in RED: the mc9-2 surface is typed OPTIONAL on a namespace cast, so
// a missing export is `undefined` at runtime (a test failure), never a TS2305 compile
// error (the centipede cp2-13 / cp2-12 render-arg idiom).

import { describe, it, expect } from 'vitest'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import * as palette from '../src/shell/palette'

interface Rgb {
  r: number
  g: number
  b: number
}

// ── the mc9-2 surface the clone must grow (all optional → tsc-green in RED) ──────
type Mc9_2 = {
  PALETTE_COUNT?: number
  FLASH_SLOTS?: readonly number[]
  FLASH_MASK?: number
  paletteIndexForWave?: (wave: number) => number
  paletteCodesForWave?: (wave: number) => readonly number[]
  colorCodeToRgb?: (code: number) => Rgb
  paletteForWave?: (wave: number) => readonly Rgb[]
  rgbCss?: (c: Rgb) => string
}
// `as unknown as` is the deliberate RED seam: the seed module exports nothing, so a
// concrete `import {…}` would be a tsc error. Casting the namespace to an all-optional
// surface keeps `npm run lint` green while every symbol is `undefined` until GREEN.
const p = palette as unknown as Mc9_2

/** Fetch a not-yet-implemented mc9-2 export with a self-describing RED failure, so a
 *  red run reads "X not implemented yet", never "undefined is not a function". */
function req<T>(v: T | undefined, name: string): T {
  if (v === undefined || v === null) {
    throw new Error(
      `palette.${name} is not implemented yet — GREEN (Yoda) adds it to src/shell/palette.ts (mc9-2). ` +
        'See the Dev contract in src/shell/palette.ts and .session/mc9-2-session.md.',
    )
  }
  return v
}

// ─── The 8 colour codes (W3COMN.MAC:491-505), carried by NAME so the rows read like
//     the ROM. HEX under .RADIX 16. ────────────────────────────────────────────────
const CWHITE = 0x0
const CYELLO = 0x2
const CPURPL = 0x4
const CRED = 0x6
const CBLUGR = 0x8
const CGREEN = 0xa
const CBLUE = 0xc
const CBLACK = 0xe
const CANONICAL_CODES = [CWHITE, CYELLO, CPURPL, CRED, CBLUGR, CGREEN, CBLUE, CBLACK]

// ─── The ten palette rows, byte-for-byte from W3DSUP.MAC:1684-1702, in DISPATCH-TABLE
//     order (W3DSUP.MAC:1655-1673): index 0 = WV1COL, 1 = WV5COL, … 9 = WV8COL. Each
//     row is its 8 DBLCOL args = COL000..COL111. Hand-transcribed AND re-derived from
//     source in palette-source.test.ts. The lone bare `0` in WVDCOL (W3DSUP.MAC:1688)
//     is the CWHITE code 0. ───────────────────────────────────────────────────────
const ROM_PALETTES: readonly (readonly number[])[] = [
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

// The legend slot indices (W3DSUP.MAC:1706), COL000..COL111.
const SKY = 0
const GROUND = 1
const ICBMS = 2
const CITY_BOTTOM = 3
const ABMS = 6
const CITY_TOP = 7

/** The authentic selection: floor((wave-1) / 2) mod 10. NB: uses `Math.floor(/2)`,
 *  NOT `>> 1` — `>>` int32-coerces and would wrap negative for wave ≥ 2³¹, which is
 *  exactly the production bug this oracle must NOT share (mc9-2 review, round 1). */
const romIndex = (wave: number): number => Math.floor((Math.max(1, Math.floor(wave)) - 1) / 2) % 10

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const coreDir = join(root, 'src', 'core')

// ───────────────────────────────────────────────────────────────────────────────
// The fixture itself has teeth (guards a self-vacuous pass — if THIS table were
// mistyped the whole suite would check the wrong thing).
// ───────────────────────────────────────────────────────────────────────────────
describe('mc9-2 fixture self-check — ROM_PALETTES is a well-formed 10×8 code table', () => {
  it('is exactly 10 rows of 8 codes (10 palettes, COL000..COL111)', () => {
    expect(ROM_PALETTES).toHaveLength(10)
    for (const row of ROM_PALETTES) expect(row).toHaveLength(8)
  })

  it('every code is one of the 8 named even hues 0,2,4,6,8,A,C,E (no invented colours)', () => {
    for (const row of ROM_PALETTES) {
      for (const code of row) {
        expect(CANONICAL_CODES.includes(code), `code 0x${code.toString(16)} is not a named hue`).toBe(true)
      }
    }
  })

  it('the ten rows are not all identical (a real per-wave palette, not one repeated scheme)', () => {
    const distinct = new Set(ROM_PALETTES.map((r) => r.join(',')))
    expect(distinct.size, 'the 10 ROM rows must include more than one distinct palette').toBeGreaterThan(1)
  })

  it('spot-checks the anchor rows: WV1COL (index 0) and WVCCOL (index 8)', () => {
    // WV1COL: CBLACK,CYELLO,CRED,CBLUGR,CRED,CBLACK,CBLUE,CBLUE (W3DSUP.MAC:1690)
    expect(ROM_PALETTES[0]).toEqual([0xe, 0x2, 0x6, 0x8, 0x6, 0xe, 0xc, 0xc])
    // WVCCOL: CWHITE,CRED,CPURPL,CYELLO,CPURPL,CWHITE,CGREEN,CGREEN (W3DSUP.MAC:1686)
    expect(ROM_PALETTES[8]).toEqual([0x0, 0x6, 0x4, 0x2, 0x4, 0x0, 0xa, 0xa])
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC1 — paletteCodesForWave returns the ROM row for each wave: the palette module
// carries the authentic W3DSUP data, byte-for-byte, in the right dispatch order.
// ───────────────────────────────────────────────────────────────────────────────
describe('mc9-2 palette data — paletteCodesForWave is the W3DSUP row (1684-1702) for the wave', () => {
  it('PALETTE_COUNT is 10 (WAVEND-WAVCOL, W3DSUP.MAC:1655-1675)', () => {
    expect(req(p.PALETTE_COUNT, 'PALETTE_COUNT')).toBe(10)
  })

  // Wave 1,2 → palette 0; 3,4 → 1; … 19,20 → 9; 21,22 → 0 again. First wave of each pair.
  const firstWaveOfPalette = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19]
  it.each(firstWaveOfPalette.map((w, i) => ({ wave: w, idx: i })))(
    'paletteCodesForWave($wave) = ROM row $idx, byte-for-byte',
    ({ wave, idx }) => {
      const fn = req(p.paletteCodesForWave, 'paletteCodesForWave')
      expect(Array.from(fn(wave)), `wave ${wave} must decode ROM palette ${idx}`).toEqual(Array.from(ROM_PALETTES[idx]))
    },
  )

  it('the second wave of a pair reads the SAME row as the first (palette changes every 2 waves)', () => {
    const fn = req(p.paletteCodesForWave, 'paletteCodesForWave')
    for (const w of [1, 3, 5, 7, 19]) {
      expect(Array.from(fn(w + 1)), `wave ${w + 1} shares wave ${w}'s palette`).toEqual(Array.from(fn(w)))
    }
  })

  it('each returned row is 8 codes drawn only from the 8 named hues', () => {
    const fn = req(p.paletteCodesForWave, 'paletteCodesForWave')
    for (let w = 1; w <= 40; w++) {
      const row = fn(w)
      expect(row, `wave ${w} palette length`).toHaveLength(8)
      for (const code of row) expect(CANONICAL_CODES.includes(code), `wave ${w} code 0x${code.toString(16)}`).toBe(true)
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC1/AC3 — the selection is a pure function of wave: ((wave-1)>>1) mod 10, cycling
// through 10 palettes every 20 waves (W3DSUP.MAC:1593-1615, 1655-1675).
// ───────────────────────────────────────────────────────────────────────────────
describe('mc9-2 selection — paletteIndexForWave: ((wave-1)>>1) mod 10, period 20', () => {
  it('waves 1-6 step 0,0,1,1,2,2 (the palette advances every TWO waves)', () => {
    const fn = req(p.paletteIndexForWave, 'paletteIndexForWave')
    expect([1, 2, 3, 4, 5, 6].map(fn)).toEqual([0, 0, 1, 1, 2, 2])
  })

  it('reaches palette 9 at waves 19-20, then WRAPS to 0 at wave 21 (period 20)', () => {
    const fn = req(p.paletteIndexForWave, 'paletteIndexForWave')
    expect(fn(19), 'wave 19 = the 10th palette').toBe(9)
    expect(fn(20), 'wave 20 shares it').toBe(9)
    expect(fn(21), 'wave 21 wraps back to palette 0').toBe(0)
    expect(fn(22)).toBe(0)
    expect(fn(23)).toBe(1)
  })

  it('is exactly ((wave-1)>>1) mod 10 across waves 1..60 (the SETCOL loop in closed form)', () => {
    const fn = req(p.paletteIndexForWave, 'paletteIndexForWave')
    for (let w = 1; w <= 60; w++) expect(fn(w), `wave ${w}`).toBe(romIndex(w))
  })

  it('always lands in [0,9] — even for degenerate/debug-seeded waves (never indexes off-table)', () => {
    const fn = req(p.paletteIndexForWave, 'paletteIndexForWave')
    // Includes the 2³¹ / MAX_SAFE_INTEGER boundary (mc9-2 review, round 1): a `>> 1`
    // halving int32-wraps there and JS `%` returns a NEGATIVE index → off-table throw.
    // `floor(/2)` stays non-negative, so these must land in [0,9] like any other wave.
    for (const w of [-5, 0, 1, 2, 20, 21, 200, 999, 4.9, 2 ** 31 + 1, 2 ** 32 + 1, Number.MAX_SAFE_INTEGER]) {
      const idx = fn(w)
      expect(Number.isInteger(idx), `index for wave ${w} is an integer`).toBe(true)
      expect(idx >= 0 && idx <= 9, `index ${idx} for wave ${w} stays on-table`).toBe(true)
    }
  })

  it('paletteCodesForWave / paletteForWave never throw or return undefined — even past 2³¹', () => {
    // The off-table index bug surfaced as `paletteForWave(2147483649)` throwing
    // "Cannot read properties of undefined (reading 'map')". Pin that it cannot recur.
    const codesFn = req(p.paletteCodesForWave, 'paletteCodesForWave')
    const rgbFn = req(p.paletteForWave, 'paletteForWave')
    for (const w of [2 ** 31 + 1, 2 ** 32 + 1, Number.MAX_SAFE_INTEGER]) {
      expect(codesFn(w), `paletteCodesForWave(${w}) must be a full row`).toHaveLength(8)
      expect(rgbFn(w), `paletteForWave(${w}) must be 8 RGBs, not a throw`).toHaveLength(8)
    }
  })

  it('paletteCodesForWave(wave) == ROM_PALETTES[paletteIndexForWave(wave)] (data and selection agree)', () => {
    const idxFn = req(p.paletteIndexForWave, 'paletteIndexForWave')
    const rowFn = req(p.paletteCodesForWave, 'paletteCodesForWave')
    for (let w = 1; w <= 40; w++) {
      expect(Array.from(rowFn(w)), `wave ${w}`).toEqual(Array.from(ROM_PALETTES[idxFn(w)]))
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC2 — code→RGB is labelled ADAPTER POLICY (no ROM RGB exists). We pin only what
// the ROM constrains: the 8 named codes decode to 8 DISTINCT deterministic colours,
// and CBLACK is pure black (so wave-1 sky stays the cabinet's black backdrop).
// The exact hues are an owner/screenshot check, deliberately NOT over-asserted.
// ───────────────────────────────────────────────────────────────────────────────
describe('mc9-2 adapter — colorCodeToRgb decodes the 8 named codes (adapter policy)', () => {
  it('is deterministic (same code → same rgb)', () => {
    const dec = req(p.colorCodeToRgb, 'colorCodeToRgb')
    for (const code of CANONICAL_CODES) expect(dec(code)).toEqual(dec(code))
  })

  it('maps the 8 named codes to 8 DISTINCT colours (no two hues collapse)', () => {
    const dec = req(p.colorCodeToRgb, 'colorCodeToRgb')
    const seen = new Set(CANONICAL_CODES.map((c) => JSON.stringify(dec(c))))
    expect(seen.size, 'all 8 named hues must decode to distinct RGB').toBe(8)
  })

  it('every channel is a byte 0..255', () => {
    const dec = req(p.colorCodeToRgb, 'colorCodeToRgb')
    for (const code of CANONICAL_CODES) {
      const { r, g, b } = dec(code)
      for (const ch of [r, g, b]) {
        expect(Number.isInteger(ch) && ch >= 0 && ch <= 255, `channel ${ch} for code 0x${code.toString(16)}`).toBe(true)
      }
    }
  })

  it('CBLACK (0x0E) is pure black {0,0,0} — the sky/backdrop hue', () => {
    const dec = req(p.colorCodeToRgb, 'colorCodeToRgb')
    expect(dec(CBLACK)).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('paletteForWave(wave) is paletteCodesForWave decoded through the adapter', () => {
    const dec = req(p.colorCodeToRgb, 'colorCodeToRgb')
    const codesFn = req(p.paletteCodesForWave, 'paletteCodesForWave')
    const rgbFn = req(p.paletteForWave, 'paletteForWave')
    for (const w of [1, 3, 9, 17, 21]) {
      expect(rgbFn(w), `wave ${w} rgb palette length`).toHaveLength(8)
      expect(Array.from(rgbFn(w)), `wave ${w} rgb == codes through adapter`).toEqual(
        Array.from(codesFn(w)).map((c) => dec(c)),
      )
    }
  })

  it('rgbCss renders an rgb() string (the one place a colour becomes a literal)', () => {
    const css = req(p.rgbCss, 'rgbCss')
    expect(css({ r: 0, g: 0, b: 0 })).toBe('rgb(0, 0, 0)')
    expect(css({ r: 12, g: 34, b: 56 })).toBe('rgb(12, 34, 56)')
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC1/AC3 — the per-wave palette is RENDER-VISIBLE: consecutive palettes differ, and
// the slots the legend pins are populated. This is the "colour changes wave to wave"
// clause at the data layer (render-palette.test.ts pins it through drawFrame).
// ───────────────────────────────────────────────────────────────────────────────
describe('mc9-2 palette is real — consecutive palettes differ, legend slots populated', () => {
  it('the RGB palettes are not all identical across the 10 waves (the cycle is real)', () => {
    const rgbFn = req(p.paletteForWave, 'paletteForWave')
    const distinct = new Set([1, 3, 5, 7, 9, 11, 13, 15, 17, 19].map((w) => JSON.stringify(rgbFn(w))))
    expect(distinct.size, '10 distinct waves must not all decode to one palette').toBeGreaterThan(1)
  })

  it('ICBM slot (COL010) changes from palette 0 to palette 1 — CRED → CGREEN (render-visible cycle)', () => {
    // The clearest adjacent-palette divergence: WV1COL ICBM = CRED, WV5COL ICBM = CGREEN.
    const codesFn = req(p.paletteCodesForWave, 'paletteCodesForWave')
    expect(codesFn(1)[ICBMS], 'wave 1 ICBM colour = CRED').toBe(CRED)
    expect(codesFn(3)[ICBMS], 'wave 3 ICBM colour = CGREEN').toBe(CGREEN)
    expect(codesFn(3)[ICBMS]).not.toBe(codesFn(1)[ICBMS])
  })

  it('the legend slots are the DBLCOL order: sky/ground/icbm/city-bottom/abm/city-top', () => {
    // Pins that COL000..COL111 map to the W3DSUP.MAC:1706 legend on wave 1 (WV1COL).
    const codesFn = req(p.paletteCodesForWave, 'paletteCodesForWave')
    const w1 = codesFn(1)
    expect(w1[SKY], 'sky = COL000 = CBLACK').toBe(CBLACK)
    expect(w1[GROUND], 'ground = COL001 = CYELLO').toBe(CYELLO)
    expect(w1[ICBMS], 'icbms = COL010 = CRED').toBe(CRED)
    expect(w1[CITY_BOTTOM], 'city bottom = COL011 = CBLUGR').toBe(CBLUGR)
    expect(w1[ABMS], 'abms = COL110 = CBLUE').toBe(CBLUE)
    expect(w1[CITY_TOP], 'city top = COL111 = CBLUE').toBe(CBLUE)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC3 — colour cycling: the two flashing slots are COL100 & COL101 (GAMEFL=0x30,
// W3COMN.MAC:489; the per-VBLANK INC at W3INT.MAC:291-313). The module exposes them
// as ROM-cited data so the render/owner can reproduce the flash where the cabinet does.
// ───────────────────────────────────────────────────────────────────────────────
describe('mc9-2 colour cycling — the flash mask/slots are the GAMEFL pair COL100,COL101', () => {
  it('FLASH_MASK is 0x30 (GAMEFL, W3COMN.MAC:489)', () => {
    expect(req(p.FLASH_MASK, 'FLASH_MASK')).toBe(0x30)
  })

  it('FLASH_SLOTS are exactly [4, 5] — COL100 and COL101 (the mask bits set)', () => {
    const slots = req(p.FLASH_SLOTS, 'FLASH_SLOTS')
    expect(Array.from(slots), 'GAMEFL=0x30 sets bits 4 and 5 → slots 4,5 flash').toEqual([4, 5])
  })

  it('FLASH_SLOTS are exactly the bits set in FLASH_MASK (self-consistent, no hand-typed drift)', () => {
    const mask = req(p.FLASH_MASK, 'FLASH_MASK')
    const slots = Array.from(req(p.FLASH_SLOTS, 'FLASH_SLOTS'))
    const fromMask: number[] = []
    for (let b = 0; b < 8; b++) if (mask & (1 << b)) fromMask.push(b)
    expect(slots.slice().sort((a, b) => a - b), 'FLASH_SLOTS must equal the set bits of FLASH_MASK').toEqual(fromMask)
  })

  it('on every wave at least one FLASH_SLOT differs from the sky (a visible blast colour always exists)', () => {
    // render.ts colours blasts with a flash slot that differs from the sky so explosions
    // never vanish (WVACOL: COL100 == sky). That fallback relies on this invariant holding
    // for all 10 palettes — pin it here at the data layer (mc9-2 review, round 1).
    const rgbFn = req(p.paletteForWave, 'paletteForWave')
    const slots = Array.from(req(p.FLASH_SLOTS, 'FLASH_SLOTS'))
    for (let w = 1; w <= 20; w++) {
      const pal = rgbFn(w)
      const sky = JSON.stringify(pal[SKY])
      expect(
        slots.some((s) => JSON.stringify(pal[s]) !== sky),
        `wave ${w}: no flash slot differs from the sky — blasts would be invisible`,
      ).toBe(true)
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC3 boundary — the palette is SHELL render data; it must not land in src/core
// (purity.test.ts guards the reverse import direction; this names the intent
// directly, mirroring the mc9-1 stamp guard at render-stamps.test.ts:276).
// ───────────────────────────────────────────────────────────────────────────────
describe('mc9-2 boundary — the palette stays in src/shell, never src/core', () => {
  it('no src/core module carries palette/colour data', () => {
    const offenders = readdirSync(coreDir, { recursive: true })
      .map(String)
      .filter((f) => f.endsWith('.ts') && /palette|colou?r/i.test(f))
    expect(offenders, `palette is shell render data; found in core: ${offenders.join(', ')}`).toEqual([])
  })
})
