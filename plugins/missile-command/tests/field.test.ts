// plugins/missile-command/tests/field.test.ts
//
// Story mc1-2 — RED phase (Han Solo / TEA). The fixed playfield: six cities and
// three missile bases at their cabinet coordinates. Core (`src/core/field.ts`)
// owns the layout as pure data; the shell (`render.ts`, tested separately in
// render-field.test.ts) paints it. No enemies, no damage — just where the nine
// fixed structures live.
//
// ─── GROUND TRUTH (all hex; W3COMN.MAC sets `.RADIX 16` at :1) ────────────────
// Cities  `W3COMN.MAC:123-145`  (CITY1H/V .. CITY6H/V)
// Bases   `W3COMN.MAC:147-157`  (MISB1H/V .. MISB3H/V)
// Counts  NCITY=6 `:39`   NMISBA=3 `:41`
// The H/V axis is the cabinet's: V grows UPWARD from the bottom (TOPSCR=222. is
// the TOP, `:107`), so the cities/bases — at V 16..22 (hex 10..16) — sit in the
// bottom band. render-field.test.ts pins that the paint lands there.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// `src/core/field.ts` does not exist yet. `loadField()` dynamic-imports it and
// throws a self-describing "not built yet" (never a module-resolution stack
// trace), so every layout test reddens for the FEATURE's absence. The purity of
// field.ts is guarded automatically by the existing src/core sweep in
// purity.test.ts the moment the file lands.
//
// ─── THE ONE GREEN-FROM-DAY-ONE TEST ─────────────────────────────────────────
// "source ground truth" reads the vendored W3COMN.MAC directly and proves the
// DECIMAL values this file expects really decode from the HEX the ROM ships.
// It is green now (data, not code) and it is the anti-drift anchor: if a later
// edit "corrects" a coordinate to something the source never said, this test —
// not a human — objects.
//
// ─── SOURCE-FILE HAZARD (measured at SM setup) ───────────────────────────────
// `reference/source/W3COMN.MAC` carries a stray non-text byte, so the shell
// `file` command calls it "data" and a plain `grep CITY` returns a FALSE-EMPTY.
// `readFileSync(..., 'utf8')` below reads it fine — node does not care — but if
// you grep it by hand, use `grep -a`.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ─── The contract GREEN (Yoda / Dev) implements: src/core/field.ts ───────────

/** One fixed structure's cabinet position. Decimal decode of the hex source. */
interface FieldPos {
  /** Horizontal cabinet coordinate (CITYnH / MISBnH). */
  readonly h: number
  /** Vertical cabinet coordinate (CITYnV / MISBnV). Origin at the BOTTOM. */
  readonly v: number
}

interface FieldModule {
  /** Max cities — W3COMN.MAC:39 (`NCITY=6`). */
  NCITY: number
  /** Missile bases — W3COMN.MAC:41 (`NMISBA=3`). */
  NMISBA: number
  /** The six cities in source order CITY1..CITY6 — W3COMN.MAC:123-145. */
  CITIES: readonly FieldPos[]
  /** The three bases in source order MISB1..MISB3 — W3COMN.MAC:147-157. */
  BASES: readonly FieldPos[]
}

// A variable specifier with `/* @vite-ignore */` so `tsc --noEmit` (the release
// gate) stays green while field.ts is still absent — the fleet idiom for a RED
// import of a not-yet-built module (asteroids audio-migration, centipede flea).
const FIELD_SPECIFIER = '../src/core/field.js'

async function loadField(): Promise<FieldModule> {
  try {
    const mod = (await import(/* @vite-ignore */ FIELD_SPECIFIER)) as Partial<FieldModule>
    if (!Array.isArray(mod.CITIES) || !Array.isArray(mod.BASES)) {
      throw new Error('module has no `CITIES` / `BASES` array exports')
    }
    return mod as FieldModule
  } catch (e) {
    throw new Error(
      'field core module not built yet — GREEN (Yoda) creates src/core/field.ts, a PURE ' +
        'data module exporting NCITY (6, W3COMN:39), NMISBA (3, :41), CITIES (six FieldPos in ' +
        'source order CITY1..6H/V, :123-145) and BASES (three, MISB1..3H/V, :147-157). Each ' +
        'coordinate is the decimal decode of the hex source and carries its W3COMN citation. ' +
        `(${(e as Error).message})`,
    )
  }
}

// Expected DECIMAL positions, transcribed from W3COMN.MAC and decoded from hex.
// (The "source ground truth" describe below proves these against the file so a
// typo here cannot pass by agreeing with a matching typo in field.ts.)
const EXPECT_CITIES: FieldPos[] = [
  { h: 0x5f, v: 0x10 }, // CITY1  :123/:125   95, 16
  { h: 0xb4, v: 0x15 }, // CITY2  :127/:129  180, 21
  { h: 0x94, v: 0x12 }, // CITY3  :131/:133  148, 18
  { h: 0x2c, v: 0x12 }, // CITY4  :135/:137   44, 18
  { h: 0x47, v: 0x11 }, // CITY5  :139/:141   71, 17
  { h: 0xd0, v: 0x11 }, // CITY6  :143/:145  208, 17
]
const EXPECT_BASES: FieldPos[] = [
  { h: 0x14, v: 0x16 }, // MISB1  :147/:149   20, 22
  { h: 0x7b, v: 0x16 }, // MISB2  :151/:153  123, 22
  { h: 0xf0, v: 0x16 }, // MISB3  :155/:157  240, 22
]

describe('AC1 — counts match the cited maxima', () => {
  it('NCITY is 6 (W3COMN:39) and there are exactly six cities', async () => {
    const f = await loadField()
    expect(f.NCITY).toBe(6)
    expect(f.CITIES).toHaveLength(6)
    expect(f.CITIES).toHaveLength(f.NCITY)
  })

  it('NMISBA is 3 (W3COMN:41) and there are exactly three bases', async () => {
    const f = await loadField()
    expect(f.NMISBA).toBe(3)
    expect(f.BASES).toHaveLength(3)
    expect(f.BASES).toHaveLength(f.NMISBA)
  })
})

describe('AC1 — the six cities sit at their cited coordinates', () => {
  it('every city matches W3COMN CITY1..6H/V in source order', async () => {
    const f = await loadField()
    expect(f.CITIES.map((c) => ({ h: c.h, v: c.v }))).toEqual(EXPECT_CITIES)
  })

  it('city coordinates are distinct horizontal positions (no two cities stacked)', async () => {
    const f = await loadField()
    const hs = new Set(f.CITIES.map((c) => c.h))
    expect(hs.size, 'the six cities occupy six distinct H columns').toBe(6)
  })
})

describe('AC1 — the three bases sit at their cited coordinates', () => {
  it('every base matches W3COMN MISB1..3H/V in source order', async () => {
    const f = await loadField()
    expect(f.BASES.map((b) => ({ h: b.h, v: b.v }))).toEqual(EXPECT_BASES)
  })

  it('the three bases share one vertical row (MISBnV all 0x16)', async () => {
    const f = await loadField()
    expect(new Set(f.BASES.map((b) => b.v)), 'all three bases are on the same bottom row').toEqual(
      new Set([0x16]),
    )
  })
})

describe('AC1 — every coordinate carries a W3COMN source citation', () => {
  // AC1: "each value carrying a source citation in a comment or claim." The
  // citation gate + claims/*.json are DEFERRED to epic mc2 (skeleton-first), so
  // the enforceable form here is a raw source-text scan: field.ts must name the
  // module and every structure's source symbol. Raw text, so a citation living
  // in a comment counts (the purity scanner strips comments; this does not).
  const fieldSrc = (): string => readFileSync(join(root, 'src', 'core', 'field.ts'), 'utf8')

  it('names the source module and both count symbols', () => {
    const src = fieldSrc()
    expect(src, 'must cite W3COMN — the module every constant comes from').toMatch(/W3COMN/)
    expect(src).toMatch(/NCITY/)
    expect(src).toMatch(/NMISBA/)
  })

  it('cites each city symbol CITY1H..CITY6H', () => {
    const src = fieldSrc()
    for (const n of [1, 2, 3, 4, 5, 6]) {
      expect(src, `city ${n} must cite its source symbol CITY${n}H`).toMatch(
        new RegExp(`CITY${n}H`),
      )
    }
    // …and prove the vertical axis is cited too, not just horizontal.
    expect(src).toMatch(/CITY1V/)
  })

  it('cites each base symbol MISB1H..MISB3H', () => {
    const src = fieldSrc()
    for (const n of [1, 2, 3]) {
      expect(src, `base ${n} must cite its source symbol MISB${n}H`).toMatch(
        new RegExp(`MISB${n}H`),
      )
    }
    expect(src).toMatch(/MISB1V/)
  })
})

const macPath = join(root, 'reference', 'source', 'W3COMN.MAC')
// Byte-gated: W3COMN.MAC is gitignored (copyright wall — NEVER committed), so
// this ground-truth suite SKIPS wherever the local quarry is absent (CI
// included). `describe.skipIf` still runs its factory BODY at collection, so the
// read is guarded too — otherwise it ENOENTs before any skip can apply.
describe.skipIf(!existsSync(macPath))('source ground truth — the expected decimals really decode from W3COMN.MAC', () => {
  // GREEN wherever the quarry is present: reads the vendored source (data), not
  // field.ts (code). It anchors EXPECT_CITIES/EXPECT_BASES to the ROM so neither
  // this test nor a later "fix" can drift the layout away from what Atari shipped.
  const mac = existsSync(macPath) ? readFileSync(macPath, 'utf8') : ''

  /** Hex value of a `SYMBOL = xx` definition in the .RADIX 16 source. */
  const hexOf = (symbol: string): number => {
    const m = mac.match(new RegExp(`\\b${symbol}\\s*=\\s*0?([0-9A-Fa-f]+)`))
    if (!m) throw new Error(`symbol ${symbol} not found in W3COMN.MAC`)
    return parseInt(m[1], 16)
  }

  it('NCITY=6, NMISBA=3', () => {
    expect(hexOf('NCITY')).toBe(6)
    expect(hexOf('NMISBA')).toBe(3)
  })

  it('CITY1..6 H/V in the file equal the expected decimals', () => {
    for (let i = 0; i < 6; i++) {
      expect(hexOf(`CITY${i + 1}H`), `CITY${i + 1}H`).toBe(EXPECT_CITIES[i].h)
      expect(hexOf(`CITY${i + 1}V`), `CITY${i + 1}V`).toBe(EXPECT_CITIES[i].v)
    }
  })

  it('MISB1..3 H/V in the file equal the expected decimals', () => {
    for (let i = 0; i < 3; i++) {
      expect(hexOf(`MISB${i + 1}H`), `MISB${i + 1}H`).toBe(EXPECT_BASES[i].h)
      expect(hexOf(`MISB${i + 1}V`), `MISB${i + 1}V`).toBe(EXPECT_BASES[i].v)
    }
  })
})
