// tests/palette.test.ts
//
// Story ml2-3 — RED phase (Tyr / TEA). The RAM-COLOUR PALETTE SEAM — millipede's
// divergence from centipede: there is NO colour PROM (board-facts.md §5, the
// ml1-4 fact row `color-ram-palette`). Colours are BYTES the 6502 writes into
// colour RAM (CLRCH, MLIRQ.MAC:242), and the video hardware drives RGB straight
// off those bits. The seam this story lands is the pure decode of ONE colour-RAM
// byte into the RGB the monitor shows: `decodeColourByte` in
// `src/core/palette.ts` — the FIRST src/core module of this plugin, which also
// auto-activates ml1-1's dormant purity sweep (tests/purity.test.ts registers
// per-file the moment src/core exists).
//
// ─── THE WIRING LAW (derived, cited in prose — GPL: never copied) ─────────────
// MAME's Centipede/Millipede video source documents the colour-RAM output
// wiring and decodes it in `milliped_set_color`: the connection diagram and pen
// notes are the comment block at `centiped_v.cpp:311-335`, the decode itself at
// `centiped_v.cpp:337-360`, reached from the write handler
// `milliped_paletteram_w` (`centiped_v.cpp:390`). Stated in MY OWN words:
//
//   • The byte is ACTIVE-LOW: a 0 bit DRIVES its colour line, a 1 bit leaves it
//     dark. All-ones ($FF) is black; $00 drives every line.
//   • Three lines are red (data bits 5, 6, 7 — low/mid/high), three are blue
//     (bits 0, 1, 2), and only TWO are green (bits 3, 4 — mid/high; green has
//     no low-weight line).
//   • The three line weights are $21 (low), $47 (mid), $97 (high) — they sum to
//     $FF, so a fully-driven 3-line channel is exactly $FF, while green's
//     2-line maximum is $47+$97 = $DE. That $DE ceiling is the fingerprint of
//     this wiring: any "8-bit RGB with a full green" reimplementation is wrong.
//
// The VENDORED 1982 source corroborates the law from its own side — CLRCH's
// immediate colour constants carry the programmers' colour names:
//   `LDA I,1F` is commented RED   (MLIRQ.MAC:294): $1F = %0001'1111 leaves
//       only the red lines driven → (255, 0, 0) exactly.
//   `LDA I,0`  is commented WHITE (MLIRQ.MAC:297): $00 drives every line →
//       (255, 222, 255), the whitest this hardware can say.
// A decode that fails either of those contradicts the shipped source's own
// comments, not just MAME.
//
// ─── WHAT GREEN (Julia) MUST SHIP ─────────────────────────────────────────────
//   src/core/palette.ts — pure (the ml1-1 scanner sweeps it): decodeColourByte,
//       with the wiring law cited: MLIRQ.MAC:242 (CLRCH) for the primary side
//       and centiped_v.cpp:311-360 PROSE citations for the MAME side. No MAME
//       code transcribed (the GPL sweep below has teeth for the distinctive
//       tokens).
//   docs/rom-study/claims/06-colour-ram-palette.json — the palette SOURCE
//       pinned as byte-verifiable claims (tests/audit/palette-claims.test.ts).
//
// OUT OF SCOPE (record, do not build): the per-slot semantic map (which ANCOL/
// MOCOL slot is "inside of mushroom" etc.) and CLRCH's per-level table walk —
// they consume this decode and belong to the render/sim stories behind ml2-3.

import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const palettePath = join(root, 'src', 'core', 'palette.ts')

interface Rgb {
  r: number
  g: number
  b: number
}

interface PaletteModule {
  decodeColourByte(data: number): Rgb
}

/**
 * Load the not-yet-built palette core with a self-describing failure (the
 * ml1-1 loadScanner idiom): the specifier is assembled at runtime so neither
 * tsc nor the bundler resolves it statically, and a missing module reads as
 * "palette core not built yet", never a collect-time stack trace.
 */
async function loadPalette(): Promise<PaletteModule> {
  const parts = ['..', 'src', 'core', 'palette.js']
  try {
    return (await import(/* @vite-ignore */ new URL(parts.join('/'), import.meta.url).href)) as PaletteModule
  } catch {
    throw new Error(
      'palette core not built yet: GREEN ships plugins/millipede/src/core/palette.ts ' +
        'exporting decodeColourByte(data) — see the header of this file for the wiring law',
    )
  }
}

/** The three output-line weights (low, mid, high). Stated once, in the test's
 *  own voice; the assertions below spell every expected channel value from
 *  these, so a wrong weight table cannot hide behind a copied constant. */
const LOW = 0x21
const MID = 0x47
const HIGH = 0x97

// ═════════════════════════════════════════════════════════════════════════════
// AC-1 — the module exists in src/core (and thereby enters the purity sweep).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-3 AC-1 — the palette seam is a src/core module', () => {
  it('GREEN ships src/core/palette.ts — the plugin’s first pure-core module', () => {
    expect(
      existsSync(palettePath),
      'plugins/millipede/src/core/palette.ts must exist — src/core is the pure tier ' +
        'ml1-1’s scanner sweeps, and this story deliberately opens it',
    ).toBe(true)
  })

  it('the module carries BOTH sides’ citations: MLIRQ.MAC:242 and centiped_v.cpp prose', () => {
    expect(existsSync(palettePath), 'premise: the module exists').toBe(true)
    const src = readFileSync(palettePath, 'utf8')
    expect(src, 'the primary source: CLRCH').toMatch(/MLIRQ\.MAC:242\b/)
    expect(src, 'the MAME side rides as prose file:line citations').toMatch(
      /centiped_v\.cpp:\d+/,
    )
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-2 — the wiring law: active-low, R/B on three lines, G on two, $21/$47/$97.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-3 AC-2 — decodeColourByte speaks the RAM-colour wiring law', () => {
  it('$FF (no line driven) is black — the byte is ACTIVE-LOW', async () => {
    const p = await loadPalette()
    expect(p.decodeColourByte(0xff)).toEqual({ r: 0, g: 0, b: 0 })
  })

  it('$00 (every line driven) is the hardware’s white: (255, 222, 255)', async () => {
    // Green tops out at MID+HIGH = $DE — the two-line channel is the wiring's
    // fingerprint. The 1982 source itself calls this byte WHITE (MLIRQ.MAC:297).
    // (That the three weights sum to a full $FF channel is proven through
    // production output by the $1F RED test below — r decodes to exactly 0xff.)
    const p = await loadPalette()
    expect(p.decodeColourByte(0x00)).toEqual({ r: LOW + MID + HIGH, g: MID + HIGH, b: LOW + MID + HIGH })
  })

  it('$1F is the source’s own RED (MLIRQ.MAC:294): only the red lines driven', async () => {
    const p = await loadPalette()
    expect(p.decodeColourByte(0x1f)).toEqual({ r: 0xff, g: 0, b: 0 })
  })

  it.each([
    ['red low (bit 5)', ~(1 << 5) & 0xff, { r: LOW, g: 0, b: 0 }],
    ['red mid (bit 6)', ~(1 << 6) & 0xff, { r: MID, g: 0, b: 0 }],
    ['red high (bit 7)', ~(1 << 7) & 0xff, { r: HIGH, g: 0, b: 0 }],
    ['green mid (bit 3)', ~(1 << 3) & 0xff, { r: 0, g: MID, b: 0 }],
    ['green high (bit 4)', ~(1 << 4) & 0xff, { r: 0, g: HIGH, b: 0 }],
    ['blue low (bit 0)', ~(1 << 0) & 0xff, { r: 0, g: 0, b: LOW }],
    ['blue mid (bit 1)', ~(1 << 1) & 0xff, { r: 0, g: 0, b: MID }],
    ['blue high (bit 2)', ~(1 << 2) & 0xff, { r: 0, g: 0, b: HIGH }],
  ] as const)('one driven line at a time: %s', async (_what, data, rgb) => {
    const p = await loadPalette()
    expect(p.decodeColourByte(data)).toEqual(rgb)
  })

  it('driven lines ADD: red low+high is $21+$97, with the mid line dark', async () => {
    // Additive DAC summing, not a lookup: a 3-bit channel has 8 distinct
    // levels, and a decode built as an 8-entry table copied from somewhere
    // else fails the arithmetic spelled here.
    const p = await loadPalette()
    const data = ~((1 << 5) | (1 << 7)) & 0xff
    expect(p.decodeColourByte(data)).toEqual({ r: LOW + HIGH, g: 0, b: 0 })
  })

  it('channels are independent: red high + green mid + blue low together', async () => {
    const p = await loadPalette()
    const data = ~((1 << 7) | (1 << 3) | (1 << 0)) & 0xff
    expect(p.decodeColourByte(data)).toEqual({ r: HIGH, g: MID, b: LOW })
  })

  it('green has NO low line: no byte can produce a green of exactly $21', async () => {
    // The exhaustive negative for the two-line channel — sweeping all 256
    // bytes, green only ever reads 0, $47, $97 or $DE.
    const p = await loadPalette()
    const seen = new Set<number>()
    for (let data = 0; data <= 0xff; data++) seen.add(p.decodeColourByte(data).g)
    expect([...seen].sort((a, b) => a - b)).toEqual([0, MID, HIGH, MID + HIGH])
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-3 — the seam refuses non-bytes (the joust groundOutcome guard discipline).
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-3 AC-3 — a colour-RAM byte is a byte', () => {
  it.each([[-1], [256], [1.5], [Number.NaN]])('rejects %s', async (bad) => {
    const p = await loadPalette()
    expect(() => p.decodeColourByte(bad)).toThrow()
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// AC-4 — GPL guard: the law was derived, the code was not taken. The tokens
// below are DISTINCTIVE spellings from the MAME implementation; none may appear
// anywhere in this plugin (src, tests, docs). Prose may NAME symbols like
// milliped_paletteram_w — a name is a citation, a statement is a copy.
// ═════════════════════════════════════════════════════════════════════════════
describe('ml2-3 AC-4 — no MAME code crosses the GPL seam', () => {
  // Review round 2 (F1): NO file is exempt — not even this one. A blanket
  // self-exemption blinded the sweep to the one file a future contributor is
  // most likely to paste MAME code into (mutation-proven). Instead, the
  // identifier-shaped tokens are built by CONCATENATION so this file never
  // contains them as scannable text; the expression-shaped tokens cannot match
  // their own escaped regex source (the `\s*` spelling breaks the literal).
  const BANNED: readonly [string, RegExp][] = [
    ['the weight-sum expression', /0x21\s*\*\s*bit0/],
    ['the pen writer', new RegExp('set_pen' + '_color')],
    ['the paletteram member', new RegExp('m_palette' + 'ram\\s*\\[')],
    ['the rgb_t constructor', new RegExp('rgb' + '_t\\s*\\(')],
    ['the inverted-shift idiom', /~data\s*>>\s*[0-9]\s*\)\s*&\s*0x01/],
  ]

  it.each(BANNED)('%s appears nowhere in the plugin', (_what, token) => {
    const hits: string[] = []
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir)) {
        if (entry === 'node_modules') continue
        const p = join(dir, entry)
        if (statSync(p).isDirectory()) walk(p)
        else if (/\.(ts|mts|mjs|md|json|html)$/.test(entry)) {
          if (token.test(readFileSync(p, 'utf8'))) hits.push(p)
        }
      }
    }
    walk(root)
    expect(hits, 'GPL: derive the law, never transcribe the code').toEqual([])
  })
})

