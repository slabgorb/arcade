// tests/select-screen.test.ts
//
// Story jt10-5 — RED (Tyr / TEA). The shell SELECT-OVERLAY layout: a new shell
// module plugins/joust/src/shell/selectScreen.ts exporting `layoutSelectScreen`,
// which lays the three coin-up lines out as glyph-placement ops the existing
// atlas/blit path can paint — ONE PLAYER START / TWO PLAYER START in FONT57 (the
// stylized wide banner font), CREDITS in FONT35 (the tight score font). This is
// the same testable seam jt10-1's fontRender.ts established: return layout DATA,
// paint pixels elsewhere (a human smoke test confirms the pixels).
//
// This is a SHELL file — the jt1-7 purity scanner does not sweep it. What a node
// test CAN pin is the font choice per line, the string identity (tied to the core
// constants so the ROM text is not re-hardcoded in the shell), colour threading,
// and the wiring lines. Screen POSITIONS are a human smoke test / reference
// capture — not invented here.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadSelect } from './helpers/select-contract.js'
import type { Rgba } from './helpers/select-contract.js'
import { FONT57 } from '../src/core/font57.js'
import { FONT35 } from '../src/core/font35.js'
import type { LaidOutText } from '../src/shell/fontRender.js'

const shellDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shell')
const GREEN: Rgba = { r: 0, g: 255, b: 0, a: 255 }

interface SelectScreenLayout {
  readonly onePlayer: LaidOutText
  readonly twoPlayer: LaidOutText
  readonly credits: LaidOutText
}

/** Load the not-yet-built select overlay with a self-describing failure (the
 *  loadFontRender pattern; the specifier is assembled so the bundler cannot
 *  resolve it statically and redden the whole FILE at collection). */
async function loadSelectScreen(): Promise<{ layoutSelectScreen(colour: Rgba): SelectScreenLayout }> {
  const specifier = ['..', '..', 'src', 'shell', 'selectScreen.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      layoutSelectScreen?: (c: Rgba) => SelectScreenLayout
    }
    if (typeof mod.layoutSelectScreen !== 'function') throw new Error('no `layoutSelectScreen` export')
    return mod as { layoutSelectScreen(colour: Rgba): SelectScreenLayout }
  } catch (e) {
    throw new Error(
      'select overlay not built yet — GREEN (Loki) creates plugins/joust/src/shell/selectScreen.ts ' +
        'exporting layoutSelectScreen(colour): { onePlayer, twoPlayer, credits } — the two START ' +
        'labels laid out in FONT57 and the CREDITS row in FONT35 via fontRender.layoutText, reusing ' +
        `the SEL_* strings from core/select (never re-hardcoding the ROM text). (${(e as Error).message})`,
    )
  }
}

function readSelectScreenSource(): string {
  const p = join(shellDir, 'selectScreen.ts')
  if (!existsSync(p)) throw new Error('GREEN (Loki) must create src/shell/selectScreen.ts (jt10-5)')
  return readFileSync(p, 'utf8')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — the two START labels are laid out in FONT57; CREDITS in FONT35. The font
// per line is pinned by its cell HEIGHT (FONT57 = 7, FONT35 = 5) and by the first
// glyph's identity. Widths tie to the CORE string lengths, so a shell that dropped
// or padded a character reddens.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-2 layoutSelectScreen — the three lines, in the right two fonts', () => {
  it('ONE PLAYER START is laid out in FONT57 (the wide banner font)', async () => {
    const s = await loadSelect()
    const { onePlayer } = (await loadSelectScreen()).layoutSelectScreen(GREEN)
    expect(onePlayer.height, 'FONT57 cell height').toBe(FONT57.cellHeight)
    expect(onePlayer.width, 'advance = SEL_ONE_PLAYER length × FONT57 cell').toBe(
      s.SEL_ONE_PLAYER.length * FONT57.cellWidth,
    )
    // Kills "the label is drawn in the wrong font" — the first op is FONT57's 'O'.
    expect(onePlayer.ops[0].glyph, "first glyph is FONT57 'O'").toBe(FONT57.glyphFor('O'))
  })

  it('TWO PLAYER START is laid out in FONT57', async () => {
    const s = await loadSelect()
    const { twoPlayer } = (await loadSelectScreen()).layoutSelectScreen(GREEN)
    expect(twoPlayer.height).toBe(FONT57.cellHeight)
    expect(twoPlayer.width).toBe(s.SEL_TWO_PLAYER.length * FONT57.cellWidth)
    expect(twoPlayer.ops[0].glyph, "first glyph is FONT57 'T'").toBe(FONT57.glyphFor('T'))
  })

  it('CREDITS is laid out in FONT35 (the tight score font), NOT FONT57', async () => {
    const s = await loadSelect()
    const { credits } = (await loadSelectScreen()).layoutSelectScreen(GREEN)
    // Kills "all three lines share one font" — CREDITS must be the SHORT font.
    expect(credits.height, 'FONT35 cell height (5), not FONT57 (7)').toBe(FONT35.cellHeight)
    expect(credits.width, 'advance = SEL_CREDITS length × FONT35 cell (trailing space counts)').toBe(
      s.SEL_CREDITS.length * FONT35.cellWidth,
    )
    expect(credits.ops[0].glyph, "first glyph is FONT35 'C'").toBe(FONT35.glyphFor('C'))
  })

  it('the START banners and the CREDITS row are in DIFFERENT fonts', async () => {
    const { onePlayer, credits } = (await loadSelectScreen()).layoutSelectScreen(GREEN)
    // A single-font mutant (everything FONT57 or everything FONT35) collapses this.
    expect(onePlayer.height, 'banner font ≠ credits font').not.toBe(credits.height)
  })

  it('threads the caller’s colour onto every line', async () => {
    const { onePlayer, twoPlayer, credits } = (await loadSelectScreen()).layoutSelectScreen(GREEN)
    for (const [name, line] of [
      ['onePlayer', onePlayer],
      ['twoPlayer', twoPlayer],
      ['credits', credits],
    ] as const) {
      expect(line.colour, `${name} carries the requested colour`).toEqual(GREEN)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the overlay REUSES the core ROM strings; it does not re-transcribe them
// in the shell (one string, one citation, one place to drift). Source-wiring: the
// only faithful pin a node test has for "which font each string uses".
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 the overlay reuses the core strings + the two fonts (source wiring)', () => {
  it('imports the SEL_* strings from core/select — the ROM text is not re-hardcoded here', () => {
    const src = readSelectScreenSource()
    expect(src, 'selectScreen imports from core/select').toMatch(/from\s+['"][^'"]*core\/select(\.js)?['"]/)
    for (const sym of ['SEL_ONE_PLAYER', 'SEL_TWO_PLAYER', 'SEL_CREDITS']) {
      expect(src, `selectScreen uses ${sym} rather than a literal`).toContain(sym)
    }
  })

  it('lays the banners out in FONT57 and CREDITS in FONT35 via layoutText', () => {
    const src = readSelectScreenSource()
    expect(src, 'uses the jt10-1 raster renderer').toMatch(/layoutText\s*\(/)
    expect(src, 'banner font FONT57 is named').toContain('FONT57')
    expect(src, 'credits font FONT35 is named').toContain('FONT35')
  })
})
