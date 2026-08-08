// tests/gameover-screen.test.ts
//
// Story jt10-6 — RED (Tyr / TEA). The shell GAME-OVER OVERLAY layout: a new shell
// module plugins/joust/src/shell/gameOverScreen.ts exporting `layoutGameOverScreen`,
// which lays the 'THY GAME IS OVER' banner out as glyph-placement ops the existing
// atlas/blit path can paint — in FONT57 (the stylized wide banner font, as the two
// select START labels use). Same testable seam jt10-1's fontRender.ts established and
// jt10-5's selectScreen.ts reused: return layout DATA, paint pixels elsewhere (a
// human smoke test confirms the pixels; screen POSITION is main.ts's job).
//
// This is a SHELL file — the jt1-7 purity scanner does not sweep it. What a node test
// CAN pin is the FONT choice, the STRING identity (tied to the core constant so the
// ROM text is not re-hardcoded in the shell), colour threading, and the wiring lines.
//
// The string itself ('THY GAME IS OVER', MSGOVR $00, MESSEQU.SRC:18 — NOT 'GAME OVER'
// / MSGAMO, and NOT the spec's GAMEND, which is a routine) is pinned in
// tests/helpers/gameover-contract.ts and asserted here through the core constant.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadGameOverText, GAME_OVER_TEXT_EXPECTED } from './helpers/gameover-contract.js'
import { FONT57 } from '../src/core/font57.js'
import type { Rgba } from '../src/shell/render.js'
import type { LaidOutText } from '../src/shell/fontRender.js'

const shellDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'shell')
const GREEN: Rgba = { r: 0, g: 255, b: 0, a: 255 }
const AMBER: Rgba = { r: 255, g: 191, b: 0, a: 255 }

interface GameOverScreenLayout {
  readonly banner: LaidOutText
}

/** Load the not-yet-built game-over overlay with a self-describing failure (the
 *  loadSelectScreen pattern; the specifier is assembled so the bundler cannot
 *  resolve it statically and redden the whole FILE at collection). */
async function loadGameOverScreen(): Promise<{ layoutGameOverScreen(colour: Rgba): GameOverScreenLayout }> {
  const specifier = ['..', '..', 'src', 'shell', 'gameOverScreen.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as {
      layoutGameOverScreen?: (c: Rgba) => GameOverScreenLayout
    }
    if (typeof mod.layoutGameOverScreen !== 'function') throw new Error('no `layoutGameOverScreen` export')
    return mod as { layoutGameOverScreen(colour: Rgba): GameOverScreenLayout }
  } catch (e) {
    throw new Error(
      'game-over overlay not built yet — GREEN (Loki) creates plugins/joust/src/shell/gameOverScreen.ts ' +
        'exporting layoutGameOverScreen(colour): { banner } — the GAME_OVER_TEXT banner laid out in ' +
        'FONT57 via fontRender.layoutText, reusing the core GAME_OVER_TEXT constant (never re-hardcoding ' +
        `the ROM text). (${(e as Error).message})`,
    )
  }
}

function readGameOverScreenSource(): string {
  const p = join(shellDir, 'gameOverScreen.ts')
  if (!existsSync(p)) throw new Error('GREEN (Loki) must create src/shell/gameOverScreen.ts (jt10-6)')
  return readFileSync(p, 'utf8')
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — the banner is laid out in FONT57 (the wide banner font), carrying the
// EXACT ROM string. The font is pinned by its cell HEIGHT (FONT57 = 7) and the
// first glyph's identity; the width ties to the CORE string length, so a shell
// that dropped, padded or mis-spelled a character reddens.
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-1 layoutGameOverScreen — the GAME OVER banner, in FONT57', () => {
  it("displays 'THY GAME IS OVER' (MSGOVR $00) — the whole-game overlay, not 'GAME OVER'", async () => {
    const { GAME_OVER_TEXT } = await loadGameOverText()
    // Kills a shell that shows the per-player 'GAME OVER' (MSGAMO $6D) or the spec's
    // wrong-cited text. The value gate is the faithful-transcription guard.
    expect(GAME_OVER_TEXT, "the overlay's ROM string is exactly MSGOVR $00").toBe(GAME_OVER_TEXT_EXPECTED)
    expect(GAME_OVER_TEXT, "and it is NOT the per-player 'GAME OVER' banner (MSGAMO $6D)").not.toBe('GAME OVER')
  })

  it('the banner is laid out in FONT57 (cell height 7), spanning the whole string', async () => {
    const { GAME_OVER_TEXT } = await loadGameOverText()
    const { banner } = (await loadGameOverScreen()).layoutGameOverScreen(GREEN)
    expect(banner.height, 'FONT57 cell height').toBe(FONT57.cellHeight)
    // Advance = GAME_OVER_TEXT length × FONT57 cell — kills a dropped/padded char
    // and a wrong-font (FONT35) render in one assertion.
    expect(banner.width, 'advance = GAME_OVER_TEXT length × FONT57 cell').toBe(
      GAME_OVER_TEXT.length * FONT57.cellWidth,
    )
    // Kills "the banner is drawn in the wrong font" — the first op is FONT57's 'T'.
    expect(banner.ops[0].glyph, "first glyph is FONT57 'T'").toBe(FONT57.glyphFor('T'))
  })

  it('has one glyph op per character of the ROM string', async () => {
    const { GAME_OVER_TEXT } = await loadGameOverText()
    const { banner } = (await loadGameOverScreen()).layoutGameOverScreen(GREEN)
    // A layout that silently truncated (or duplicated) the string would pass a
    // width check that used its OWN op count; tie the op count to the CORE length.
    expect(banner.ops.length, 'one op per character of GAME_OVER_TEXT').toBe(GAME_OVER_TEXT.length)
  })

  it("threads the caller's colour onto the banner (two distinct colours, distinctly)", async () => {
    const green = (await loadGameOverScreen()).layoutGameOverScreen(GREEN).banner
    const amber = (await loadGameOverScreen()).layoutGameOverScreen(AMBER).banner
    // A hard-wired colour mutant (ignores the arg) fails the second leg.
    expect(green.colour, 'banner carries the requested GREEN').toEqual(GREEN)
    expect(amber.colour, 'banner carries the requested AMBER').toEqual(AMBER)
    expect(amber.colour, 'the colour is threaded, not hard-wired').not.toEqual(green.colour)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — the overlay REUSES the core ROM string; it does not re-transcribe it in
// the shell (one string, one citation, one place to drift). Source-wiring: the
// faithful pin a node test has for "the shell does not re-hardcode the ROM text".
// ─────────────────────────────────────────────────────────────────────────────
describe('AC-4 the overlay reuses the core string + FONT57 (source wiring)', () => {
  it('imports GAME_OVER_TEXT from core/cabinet — the ROM text is not re-hardcoded here', () => {
    const src = readGameOverScreenSource()
    expect(src, 'gameOverScreen imports from core/cabinet').toMatch(/from\s+['"][^'"]*core\/cabinet(\.js)?['"]/)
    expect(src, 'gameOverScreen uses GAME_OVER_TEXT rather than a literal').toContain('GAME_OVER_TEXT')
    // Kills "the shell re-types the ROM string as a literal" — neither the faithful
    // string nor the wrong per-player one may appear as a bare literal here.
    expect(src, "no re-hardcoded 'THY GAME IS OVER' literal in the shell").not.toMatch(/'THY GAME IS OVER'|"THY GAME IS OVER"/)
    expect(src, "no re-hardcoded 'GAME OVER' literal in the shell").not.toMatch(/'GAME OVER'|"GAME OVER"/)
  })

  it('lays the banner out in FONT57 via layoutText', () => {
    const src = readGameOverScreenSource()
    expect(src, 'uses the jt10-1 raster renderer').toMatch(/layoutText\s*\(/)
    expect(src, 'banner font FONT57 is named').toContain('FONT57')
  })
})
