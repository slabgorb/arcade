// plugins/defender/tests/palette.test.ts
//
// Story df2-2 — RED phase (Han Solo / TEA). The 16-entry CRAM/PCRAM model + the
// 3-3-2 decode extraction, on the DEFENDER side of the df2-2 decision.
//
// df2-1 shipped src/shell/render.ts with a TEMPORARY grey-ramp indexToRgba and a
// header note that "df2-2 replaces THIS ONE function and nothing else on the blit
// path". df2-2 does exactly that: it transcribes the real 16-byte
// default palette, models the per-frame PCRAM -> CRAM copy (PHR6.SRC:219 -> :13,
// DEFA7.SRC:1968-1994) as a pure "resolve 16 indices" step, and decodes each
// resolved byte through the EXTRACTED @shared Williams decoder.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
//   • src/core/palette.ts does not exist (no DEFAULT_PCRAM, no resolveCram).
//   • src/shell/render.ts indexToRgba is still the grey ramp — it does NOT yet decode
//     the transcribed palette through @shared/palette-decoder.
//   • plugins/joust/src/shell/render.ts still DEFINES its own paletteToRgba, so it is
//     not the same reference as the (not-yet-existing) @shared one.
//   • docs/rom-study/board-facts.md records no palette byte-format decision.
//
// ─── CONTRACT (what GREEN/Dev must build) ────────────────────────────────────────
//   // src/core/palette.ts — PURE data + resolver (no colour: bytes are 4-bit-packed
//   // colour-RAM values, decoded to RGBA only in the shell). GENERATED + cited: the
//   // 16 DEFAULT_PCRAM bytes are transcribed from the vendored source under the df1-1
//   // citation gate (claims/*.json byte-verified); this suite does NOT re-transcribe
//   // them (lang-review #18/#26 — a fixture whose value IS the expectation checks
//   // nothing). The citation gate owns byte-accuracy; this suite owns SHAPE + WIRING.
//   export const DEFAULT_PCRAM: readonly number[]                  // 16 bytes 0..255
//   export function resolveCram(pcram: readonly number[]): number[] // the IRQ copy, pure
//
//   // src/shell/render.ts — indexToRgba now decodes the resolved palette:
//   //   const CRAM = resolveCram(DEFAULT_PCRAM)
//   //   indexToRgba(i) === paletteToRgba(CRAM[i])   // paletteToRgba from @shared/palette-decoder
//
//   // @shared/palette-decoder.ts — joust's paletteToRgba, extracted VERBATIM and
//   // re-pointed (both games import it). See src/shared/tests/palette-decoder.test.ts.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

interface Rgba {
  r: number
  g: number
  b: number
  a: number
}
interface PaletteModule {
  DEFAULT_PCRAM: readonly number[]
  resolveCram: (pcram: readonly number[]) => number[]
}
interface RenderModule {
  indexToRgba: (index: number) => Rgba
}

async function loadPalette(): Promise<PaletteModule> {
  try {
    const mod = (await import('../src/core/palette.js')) as Partial<PaletteModule>
    if (!Array.isArray(mod.DEFAULT_PCRAM)) throw new Error('no `DEFAULT_PCRAM` array export')
    if (typeof mod.resolveCram !== 'function') throw new Error('no `resolveCram` export')
    return mod as PaletteModule
  } catch (e) {
    throw new Error(
      'src/core/palette.ts not built yet — GREEN (Dev) transcribes the 16-byte ' +
        '`DEFAULT_PCRAM` from the vendored source under the citation gate and adds a pure ' +
        '`resolveCram(pcram)` modelling the per-frame PCRAM -> CRAM copy ' +
        `(defender/PHR6.SRC:219 -> :13, DEFA7.SRC:1968-1994). (${(e as Error).message})`,
    )
  }
}

async function loadIndexToRgba(): Promise<(index: number) => Rgba> {
  const mod = (await import('../src/shell/render.js')) as Partial<RenderModule>
  if (typeof mod.indexToRgba !== 'function') throw new Error('render.ts has no `indexToRgba` export')
  return mod.indexToRgba
}

// Lazy so the whole suite stays collectable while @shared/palette-decoder is absent —
// each test then reds with a self-describing message instead of a file-load error.
async function loadShared(): Promise<(byte: number) => Rgba> {
  try {
    const mod = (await import('@shared/palette-decoder')) as { paletteToRgba?: (b: number) => Rgba }
    if (typeof mod.paletteToRgba !== 'function') throw new Error('no `paletteToRgba` export')
    return mod.paletteToRgba
  } catch (e) {
    throw new Error(
      '@shared/palette-decoder not built yet — GREEN (Dev) extracts joust\'s paletteToRgba ' +
        `into src/shared/palette-decoder.ts and re-points both games. (${(e as Error).message})`,
    )
  }
}

// joust's render module lives one plugin over; the defender project root is
// plugins/defender, so ../../joust reaches plugins/joust. Used only to prove the
// SHARED decoder is the one joust now uses (reference identity), i.e. the extraction
// re-pointed joust rather than leaving a divergent copy behind.
async function loadJoustDecode(): Promise<(byte: number) => Rgba> {
  const mod = (await import('../../joust/src/shell/render.js')) as { paletteToRgba?: (b: number) => Rgba }
  if (typeof mod.paletteToRgba !== 'function') throw new Error('joust render.ts has no `paletteToRgba` export')
  return mod.paletteToRgba
}

describe('defender palette — the 16-byte default PCRAM (transcribed, gated)', () => {
  it('DEFAULT_PCRAM is exactly 16 colour-RAM bytes, each an integer 0..255', async () => {
    const { DEFAULT_PCRAM } = await loadPalette()
    expect(DEFAULT_PCRAM.length, 'CRAM is 16 entries (defender/PHR6.SRC:13, CRAM EQU $C000)').toBe(16)
    for (const [i, byte] of DEFAULT_PCRAM.entries()) {
      expect(Number.isInteger(byte), `entry ${i} must be an integer byte`).toBe(true)
      expect(byte, `entry ${i} in 0..255`).toBeGreaterThanOrEqual(0)
      expect(byte, `entry ${i} in 0..255`).toBeLessThanOrEqual(255)
    }
  })
})

describe('resolveCram — the per-frame PCRAM -> CRAM copy modelled as a pure 16-index resolve', () => {
  // Crafted inputs (NOT DEFAULT_PCRAM), so the copy semantics are pinned independently
  // of whatever bytes the transcription lands — the test cannot pass by hardcoding
  // DEFAULT_PCRAM (lang-review #18/#26).
  const A = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
  const B = [255, 0, 128, 7, 56, 192, 1, 254, 200, 3, 60, 15, 240, 85, 170, 42]

  it('resolves the 16 supplied indices (a straight per-index copy)', async () => {
    const { resolveCram } = await loadPalette()
    expect(resolveCram(A)).toEqual(A)
    expect(resolveCram(B)).toEqual(B)
    expect(resolveCram(B).length).toBe(16)
  })

  it('is pure: deterministic, a fresh array, and never mutates its input', async () => {
    const { resolveCram } = await loadPalette()
    const input = [...B]
    const first = resolveCram(input)
    const second = resolveCram(input)
    expect(first).toEqual(second) // deterministic
    expect(first).not.toBe(input) // returns a copy, not the same reference
    expect(input).toEqual(B) // input untouched
  })
})

describe('the seam swap — indexToRgba decodes the transcribed palette via @shared (df2-2 replaces the grey ramp)', () => {
  it('indexToRgba(i) === paletteToRgba(resolveCram(DEFAULT_PCRAM)[i]) for every index', async () => {
    const { DEFAULT_PCRAM, resolveCram } = await loadPalette()
    const indexToRgba = await loadIndexToRgba()
    const sharedDecode = await loadShared()
    const cram = resolveCram(DEFAULT_PCRAM)
    // Every term comes from code under test: defender's indexToRgba, defender's
    // palette data + resolver, and the @shared decoder. The df2-1 grey ramp
    // (round(i*17) in all three channels) cannot satisfy this unless the palette
    // happens to encode a grey ramp, which the transcribed CRAM does not.
    for (let i = 0; i < 16; i++) {
      expect(indexToRgba(i), `index ${i} must decode CRAM[${i}] through the shared decoder`).toEqual(
        sharedDecode(cram[i]),
      )
    }
  })
})

describe('the extraction decision — joust and defender share ONE Williams decoder (AC5, EXTRACT branch)', () => {
  it('joust\'s paletteToRgba IS the @shared paletteToRgba (re-pointed, not a divergent copy)', async () => {
    const joustDecode = await loadJoustDecode()
    const sharedDecode = await loadShared()
    // Same reference: the extraction moved the function to @shared and joust re-exports
    // it. A leftover local copy in joust would be a DIFFERENT reference and reds here.
    expect(joustDecode).toBe(sharedDecode)
  })

  it('joust\'s decode output is byte-for-byte the @shared output across all 256 bytes (no regression)', async () => {
    const joustDecode = await loadJoustDecode()
    const sharedDecode = await loadShared()
    for (let b = 0; b < 256; b++) {
      expect(joustDecode(b), `byte 0x${b.toString(16)}`).toEqual(sharedDecode(b))
    }
  })
})

describe('the byte format is documented — read from MAME, decided in prose (AC4)', () => {
  it('board-facts.md records the palette byte format as BBGGGRRR with a williams.cpp palette-init pointer', () => {
    const md = readFileSync(join(root, 'docs', 'rom-study', 'board-facts.md'), 'utf8')
    const lower = md.toLowerCase()
    // The format token must appear...
    const at = lower.indexOf('bbgggrrr')
    expect(
      at,
      'board-facts.md must document the CRAM byte format as BBGGGRRR (the 3-3-2 Williams ' +
        'colour decode), read from MAME williams.cpp palette init at the df1-4 pin',
    ).toBeGreaterThanOrEqual(0)
    // ...and a williams.cpp MAME prose pointer must sit WITHIN a bounded window of it,
    // so the token is part of a real, cited palette-format statement rather than an
    // incidental mention elsewhere in the file (lang-review #25 — bound the scope).
    const window = lower.slice(Math.max(0, at - 600), at + 600)
    expect(window, 'the BBGGGRRR format decision must cite MAME williams.cpp (palette init) in prose').toContain(
      'williams.cpp',
    )
  })
})
