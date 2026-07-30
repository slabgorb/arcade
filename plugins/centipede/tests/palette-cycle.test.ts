// tests/palette-cycle.test.ts
//
// Story cp2-13 — RED phase (O'Brien / TEA). Per-round colour cycling. USER-REPORTED
// (2026-07-19): "colours should change per round, as the arcade does" — pulled
// forward from cp4. The wave-1 loop already ships (cp2-5), so rounds already advance;
// this story transcribes the ROM's per-wave palette and keys it off SimState.wave.
//
// GROUND TRUTH (docs/rom-study/claims/08-render-color.json, CL-17..CL-27, all
// byte-verified against reference/atari-source/centipede/revision.v4/ this session):
//   • 99$ (CENTI4.MAC:898-901, CL-9/25/26/27) is a 42-byte table = 14 three-nibble
//     schemes. It carries EXACTLY ONE 0x06 (table index 32 = scheme X=30's [X+2]
//     pen) and NO 0x07 anywhere — the ROM stores 0x06; any 0x07 is uncited.
//   • The IRQ advances the colour index +3 per wave (CENIR4.MAC:319 ADC I,03,
//     CL-18), gated by bit7 (BMI, CL-20) which CENTPC raises on each cleared wave
//     (CENTI4.MAC:462 ORA I,80, CL-22), wrapping at DECIMAL 42 (CENIR4.MAC:320
//     CMP I,42. — trailing period = decimal under .RADIX 16, CL-19) back to 0.
//   • INITSC resets the index to 0 for a fresh game (CENTI4.MAC:1206, CL-24), so
//     wave 1 = scheme 0. The background pen 0 is set to 0x0F black SEPARATELY
//     (CENTI4.MAC:1203, CL-10/CL-24) and is scheme-INDEPENDENT.
// Net: colour = a PURE function of wave number, index = ((wave-1)*3) mod 42 — the
// stored sequence 0,3,6,...,39,0,... (42 is a multiple of the +3 stride from 0).
// The 2-player bit6 swap (CL-23) is 1-player-out-of-scope (deferred).
//
// WHY THIS IS RED: src/shell/palette.ts today transcribes ONLY scheme 0 (the two
// hardcoded PLAYFIELD_PENS/SPRITE_PENS arrays) — there is no 99$ table, no
// colorIndexForWave, no *PensForWave lookup in code at all. Every assertion that
// touches a cp2-13 symbol below fails on a self-describing "not implemented yet"
// throw. The existing scheme-0 exports (decodeClrchColor, PLAYFIELD_PENS,
// SPRITE_PENS, rgbCss) are unchanged, so the back-compat pins stay honest.
//
// tsc STAYS GREEN in RED: the cp2-13 symbols are typed OPTIONAL on a namespace
// cast, so a missing export is `undefined` at runtime (a test failure), never a
// TS2305 compile error (the cp2-12 render-4th-arg / cp1-2 loadChecker idiom).

import { describe, it, expect } from 'vitest'
import * as palette from '../src/shell/palette'
import { decodeClrchColor, PLAYFIELD_PENS, SPRITE_PENS, type Rgb } from '../src/shell/palette'

// ── the cp2-13 surface the clone must grow (all optional → tsc-green in RED) ──────
type Cp2_13 = {
  SCHEME_TABLE?: readonly number[]
  SCHEME_COUNT?: number
  colorIndexForWave?: (wave: number) => number
  schemeNumberForWave?: (wave: number) => number
  playfieldPensForWave?: (wave: number) => readonly Rgb[]
  spritePensForWave?: (wave: number) => readonly Rgb[]
}
const p = palette as unknown as Cp2_13

/** Fetch a not-yet-implemented cp2-13 export with a self-describing RED failure,
 *  so a red run reads "X not implemented yet", never "undefined is not a function". */
function req<T>(v: T | undefined, name: string): T {
  if (v === undefined || v === null) {
    throw new Error(
      `palette.${name} is not implemented yet — GREEN (Julia) adds it to src/shell/palette.ts (cp2-13). ` +
        'See the Dev contract in .session/cp2-13-session.md and claims CL-17..CL-27.',
    )
  }
  return v
}

// ── the 42-byte 99$ table, carried HERE byte-for-byte (CENTI4.MAC:898-901). This
// is the drift trap: if Dev fat-fingers a nibble (e.g. 0x07 for the lone 0x06),
// the deep-equal below reddens. Hand-transcribed + machine-cross-checked this
// session (one 0x06 at index 32, zero 0x07). ──────────────────────────────────────
const NINETY_NINE: readonly number[] = [
  // row 1 — CENTI4.MAC:898 (CL-9), schemes 0-3
  0x0d, 0x00, 0x0e, 0x02, 0x04, 0x01, 0x0e, 0x01, 0x0c, 0x04, 0x01, 0x0b,
  // row 2 — CENTI4.MAC:899 (CL-25), schemes 4-7
  0x01, 0x0c, 0x0a, 0x09, 0x0b, 0x04, 0x0c, 0x0d, 0x0a, 0x09, 0x0c, 0x0e,
  // row 3 — CENTI4.MAC:900 (CL-26), schemes 8-11 — index 32 is the LONE 0x06
  0x0a, 0x0e, 0x01, 0x0b, 0x01, 0x04, 0x01, 0x00, 0x06, 0x0d, 0x0e, 0x0a,
  // row 4 — CENTI4.MAC:901 (CL-27), schemes 12-13
  0x0e, 0x0c, 0x0b, 0x00, 0x0d, 0x02,
]

// The CLRCH distribution generalized from CL-2..CL-8 to any scheme (a,b,c) =
// (99$[X], 99$[X+1], 99$[X+2]):
//   playfield = [background 0x0F, a (inside/gun), c (outside/alnum), b (poison)]
//   sprite    = [background,      b (legs),       c (eyes),          a (body)]
// (scheme 0: a=0x0D,b=0x00,c=0x0E reproduces the existing cp1-6 pens exactly.)
const BG = 0x0f
function expectedPlayfield(a: number, b: number, c: number): Rgb[] {
  return [decodeClrchColor(BG), decodeClrchColor(a), decodeClrchColor(c), decodeClrchColor(b)]
}
function expectedSprite(a: number, b: number, c: number): Rgb[] {
  return [decodeClrchColor(BG), decodeClrchColor(b), decodeClrchColor(c), decodeClrchColor(a)]
}
function tripleForWave(wave: number): [number, number, number] {
  const idx = ((wave - 1) * 3) % 42
  return [NINETY_NINE[idx], NINETY_NINE[idx + 1], NINETY_NINE[idx + 2]]
}

// ───────────────────────────────────────────────────────────────────────────────
// AC-3 — the 99$ table matches byte-for-byte (one 0x06 at index 32, NO 0x07).
// ───────────────────────────────────────────────────────────────────────────────
describe('cp2-13 palette — SCHEME_TABLE is 99$ byte-for-byte (CENTI4.MAC:898-901, CL-9/25/26/27)', () => {
  it('the fixture itself has exactly one 0x06 (at index 32) and no 0x07 (guards a self-vacuous pass)', () => {
    // If THIS table were mistyped the whole suite would be checking the wrong thing.
    expect(NINETY_NINE).toHaveLength(42)
    expect(NINETY_NINE.filter((n) => n === 0x06)).toHaveLength(1)
    expect(NINETY_NINE.indexOf(0x06)).toBe(32)
    expect(NINETY_NINE.filter((n) => n === 0x07)).toHaveLength(0)
  })

  it('SCHEME_TABLE equals the full 42-byte 99$ table (any drifted nibble reddens)', () => {
    const table = req(p.SCHEME_TABLE, 'SCHEME_TABLE')
    expect(Array.from(table)).toEqual(Array.from(NINETY_NINE))
  })

  it('is exactly 42 bytes — 14 three-nibble schemes (CMP I,42., CL-19)', () => {
    const table = req(p.SCHEME_TABLE, 'SCHEME_TABLE')
    expect(table).toHaveLength(42)
    expect(table.length % 3, '42 is an exact multiple of the 3-nibble scheme stride').toBe(0)
  })

  it('carries EXACTLY ONE 0x06 — at index 32 (scheme X=30 [X+2] pen, CL-26)', () => {
    const table = req(p.SCHEME_TABLE, 'SCHEME_TABLE')
    const sixes = Array.from(table).map((n, i) => [n, i]).filter(([n]) => n === 0x06)
    expect(sixes.map(([, i]) => i), 'the lone 0x06 sits at table index 32').toEqual([32])
  })

  it('contains NO 0x07 anywhere — any 0x07 would be uncited (CL-26)', () => {
    const table = req(p.SCHEME_TABLE, 'SCHEME_TABLE')
    expect(Array.from(table).filter((n) => n === 0x07), 'the ROM stores 0x06, never 0x07').toEqual([])
  })

  it('every entry is a 4-bit nibble 0..15 (no invented colours / out-of-range bytes)', () => {
    const table = req(p.SCHEME_TABLE, 'SCHEME_TABLE')
    for (const n of table) {
      expect(Number.isInteger(n) && n >= 0 && n <= 0x0f, `nibble ${n} out of 0..15`).toBe(true)
    }
  })

  it('scheme X=30 is [0x01, 0x00, 0x06] — the [X+2] pen is 0x06, not 0x07', () => {
    const table = req(p.SCHEME_TABLE, 'SCHEME_TABLE')
    expect(Array.from(table.slice(30, 33))).toEqual([0x01, 0x00, 0x06])
  })

  it('SCHEME_COUNT is 14 (table.length / 3)', () => {
    const table = req(p.SCHEME_TABLE, 'SCHEME_TABLE')
    expect(req(p.SCHEME_COUNT, 'SCHEME_COUNT')).toBe(14)
    expect(req(p.SCHEME_COUNT, 'SCHEME_COUNT')).toBe(table.length / 3)
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-1 — the LCOLOR advance is a pure function of wave: +3 per wave, wrap 42, 14
// palettes; pinned waves 1-4 AND the wrap at palette 14. INITSC reset ⇒ wave 1 = 0.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp2-13 palette — colorIndexForWave: +3/wave, wrap 42, 14 palettes (CL-18/19/20/24)', () => {
  it('waves 1-4 step 0, 3, 6, 9 (INITSC reset then +3 per cleared wave)', () => {
    const fn = req(p.colorIndexForWave, 'colorIndexForWave')
    expect(fn(1), 'wave 1 = scheme 0 (INITSC reset, CL-24)').toBe(0)
    expect(fn(2)).toBe(3)
    expect(fn(3)).toBe(6)
    expect(fn(4)).toBe(9)
  })

  it('reaches index 39 at wave 14, then WRAPS to 0 at wave 15 (palette 14 → palette 1)', () => {
    const fn = req(p.colorIndexForWave, 'colorIndexForWave')
    expect(fn(14), 'the 14th and last distinct palette').toBe(39)
    expect(fn(15), 'wraps at 42 back to scheme 0 (CL-19)').toBe(0)
    expect(fn(16)).toBe(3)
    expect(fn(28)).toBe(39)
    expect(fn(29)).toBe(0)
  })

  it('is exactly ((wave-1)*3) mod 42 across waves 1..60 (the flag-gated stepping in closed form)', () => {
    const fn = req(p.colorIndexForWave, 'colorIndexForWave')
    for (let w = 1; w <= 60; w++) expect(fn(w), `wave ${w}`).toBe(((w - 1) * 3) % 42)
  })

  it('always lands on a multiple of 3 in [0, 39] — never a negative or off-stride index', () => {
    const fn = req(p.colorIndexForWave, 'colorIndexForWave')
    // Includes degenerate inputs (0, negative, huge, fractional) — the shell may
    // debug-seed any wave (AC-2), so the lookup must never crash or index off-table.
    for (const w of [-5, 0, 1, 2, 13, 14, 15, 100, 999, 3.9]) {
      const idx = fn(w)
      expect(Number.isInteger(idx), `index for wave ${w} is an integer`).toBe(true)
      expect(idx >= 0 && idx <= 39, `index ${idx} for wave ${w} stays on-table`).toBe(true)
      expect(idx % 3, `index ${idx} for wave ${w} is a scheme boundary`).toBe(0)
    }
  })

  it('schemeNumberForWave is colorIndexForWave/3 in 0..13 (wave 1→0, 11→10 the 0x06 scheme, 15→0)', () => {
    const idxFn = req(p.colorIndexForWave, 'colorIndexForWave')
    const schemeFn = req(p.schemeNumberForWave, 'schemeNumberForWave')
    expect(schemeFn(1)).toBe(0)
    expect(schemeFn(11), 'wave 11 = scheme 10 = the scheme carrying the lone 0x06').toBe(10)
    expect(schemeFn(14)).toBe(13)
    expect(schemeFn(15), 'wraps back to scheme 0').toBe(0)
    for (let w = 1; w <= 40; w++) {
      expect(schemeFn(w), `wave ${w}`).toBe(idxFn(w) / 3)
      expect(schemeFn(w) >= 0 && schemeFn(w) <= 13, `scheme ${schemeFn(w)} in 0..13`).toBe(true)
    }
  })
})

// ───────────────────────────────────────────────────────────────────────────────
// AC-1/AC-2 — the pens for each wave: CLRCH distribution generalized to any scheme.
// Background pen 0 is scheme-INVARIANT black. Consecutive waves change the pens
// (the render-visible cycle). Wrap at 14. The lone 0x06 shows at the wave-11 eyes.
// ───────────────────────────────────────────────────────────────────────────────
describe('cp2-13 palette — pens per wave (CLRCH distribution, CL-2..CL-8 generalized)', () => {
  const waves = [1, 2, 3, 4, 11, 14, 15]
  it.each(waves)('playfieldPensForWave(%i) = [bg, a, c, b] decoded from that scheme', (wave) => {
    const fn = req(p.playfieldPensForWave, 'playfieldPensForWave')
    const [a, b, c] = tripleForWave(wave)
    expect(Array.from(fn(wave))).toEqual(expectedPlayfield(a, b, c))
  })

  it.each(waves)('spritePensForWave(%i) = [bg, b, c, a] decoded from that scheme', (wave) => {
    const fn = req(p.spritePensForWave, 'spritePensForWave')
    const [a, b, c] = tripleForWave(wave)
    expect(Array.from(fn(wave))).toEqual(expectedSprite(a, b, c))
  })

  it('both pen arrays are length 4 (background + three pens)', () => {
    const pf = req(p.playfieldPensForWave, 'playfieldPensForWave')
    const sp = req(p.spritePensForWave, 'spritePensForWave')
    expect(pf(1)).toHaveLength(4)
    expect(sp(1)).toHaveLength(4)
  })

  it('the background pen 0 is BLACK on every wave — scheme-independent (CL-10/CL-24)', () => {
    const pf = req(p.playfieldPensForWave, 'playfieldPensForWave')
    const sp = req(p.spritePensForWave, 'spritePensForWave')
    const black = { r: 0, g: 0, b: 0 }
    for (let w = 1; w <= 14; w++) {
      expect(pf(w)[0], `wave ${w} playfield background`).toEqual(black)
      expect(sp(w)[0], `wave ${w} sprite background`).toEqual(black)
    }
  })

  it('back-compat: scheme 0 == wave 1 — PLAYFIELD_PENS / SPRITE_PENS are unchanged (cp1-6 consumers)', () => {
    const pf = req(p.playfieldPensForWave, 'playfieldPensForWave')
    const sp = req(p.spritePensForWave, 'spritePensForWave')
    expect(Array.from(pf(1)), 'wave 1 playfield pens == the existing scheme-0 constant').toEqual(
      Array.from(PLAYFIELD_PENS),
    )
    expect(Array.from(sp(1)), 'wave 1 sprite pens == the existing scheme-0 constant').toEqual(Array.from(SPRITE_PENS))
  })

  it('the pens CHANGE between wave 1 and wave 2 — the render-visible per-round cycle (AC-2)', () => {
    const pf = req(p.playfieldPensForWave, 'playfieldPensForWave')
    const sp = req(p.spritePensForWave, 'spritePensForWave')
    expect(Array.from(pf(2)), 'wave 2 playfield pens differ from wave 1').not.toEqual(Array.from(pf(1)))
    expect(Array.from(sp(2)), 'wave 2 sprite pens differ from wave 1').not.toEqual(Array.from(sp(1)))
  })

  it('wraps: wave 15 pens deep-equal wave 1 pens (palette 14 → palette 1)', () => {
    const pf = req(p.playfieldPensForWave, 'playfieldPensForWave')
    const sp = req(p.spritePensForWave, 'spritePensForWave')
    expect(Array.from(pf(15))).toEqual(Array.from(pf(1)))
    expect(Array.from(sp(15))).toEqual(Array.from(sp(1)))
  })

  it('the lone 0x06 reaches the screen at wave 11 — eyes = decode(0x06), NOT decode(0x07)', () => {
    // Scheme X=30 (wave 11) [X+2] = 0x06 paints the EYES (sprite pen 2 = c, CL-7/CL-26).
    const sp = req(p.spritePensForWave, 'spritePensForWave')
    expect(sp(11)[2], 'wave-11 eyes decode the ROM 0x06').toEqual(decodeClrchColor(0x06))
    expect(sp(11)[2], '…and are NOT the uncited 0x07').not.toEqual(decodeClrchColor(0x07))
    // decode(0x06) and decode(0x07) really are distinct, so the negative pin has teeth.
    expect(decodeClrchColor(0x06)).not.toEqual(decodeClrchColor(0x07))
  })

  it('over all 14 schemes the pen sets are not all identical (the cycle is real, not a constant)', () => {
    const sp = req(p.spritePensForWave, 'spritePensForWave')
    const distinct = new Set<string>()
    for (let w = 1; w <= 14; w++) distinct.add(JSON.stringify(sp(w).map((c) => [c.r, c.g, c.b])))
    expect(distinct.size, '14 waves must not all decode to one palette').toBeGreaterThan(1)
  })
})
