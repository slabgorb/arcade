// tests/shell/font-shared-resolution.test.ts
//
// RED-phase suite for Story SH2-6, the dependency-pin contract: battlezone must
// consume @shared at a ref whose exports map carries the /font subpath
// AND whose glyph table covers battlezone's audited character set — the full
// alphabet + digits (score, high-score initials), plus '-' ('DUAL-TREAD') and
// '/' (the pause card's 'E / D' / 'I / K'). The current pin (v0.5.0) has NO
// /font subpath at all, so this fails until Dev re-pins (tag v0.7.0, already the
// asteroids + star-wars pin, is the clean target — its glyph set added the '/'
// specifically for battlezone's pause card in SH2-3).
//
// battlezone renders NO comma: drawScore uses String(score), attractLines uses
// `${entry.score}`, gameOverLines uses `${SCORE} ${score}` — all un-grouped. So
// unlike star-wars (which needs ','), the audited set here is A-Z 0-9 space - /.
//
// Isolated in its own file, and imported through a VARIABLE specifier with
// @vite-ignore, so the unresolvable subpath surfaces as this one test's failure
// — not a module-graph crash that would silence the sibling mechanism/seam tests
// (exactly what a static `import('@shared/font')` did to star-wars' SH2-5
// mechanism suite on its first RED run).

import { describe, it, expect } from 'vitest'

// Runtime-only resolution: keep the specifier out of Vite's static analysis.
const SHARED_FONT_SUBPATH = '@shared/font'

interface SharedFontModule {
  layoutText: (
    text: string,
    opts?: { letterSpacing?: number },
  ) => { strokes: { points: { x: number; y: number }[] }[]; width: number }
  hasGlyph: (ch: string) => boolean
  GLYPH_CHARS: string
}

describe('SH2-6 — @shared/font resolves with the battlezone glyph set', () => {
  it('resolves the /font subpath and covers every audited character', async () => {
    const font = (await import(
      /* @vite-ignore */ SHARED_FONT_SUBPATH
    )) as unknown as SharedFontModule
    expect(typeof font.layoutText).toBe('function')
    // Full alphabet + digits (high-score initials + score) and the two
    // punctuation glyphs battlezone renders: '-' (DUAL-TREAD) and '/' (E / D).
    const NEEDED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-/ '
    for (const ch of NEEDED) {
      expect(font.hasGlyph(ch), `shared font missing glyph ${JSON.stringify(ch)}`).toBe(true)
    }
    expect(font.GLYPH_CHARS).toContain('-')
    expect(font.GLYPH_CHARS).toContain('/')
    // Representative HUD text (dash, spaces, slash) lays out to real geometry.
    for (const sample of ['DUAL-TREAD   ESC PAUSE', 'E / D']) {
      const laid = font.layoutText(sample)
      expect(laid.strokes.length, `no strokes for ${JSON.stringify(sample)}`).toBeGreaterThan(0)
      expect(laid.width, `zero width for ${JSON.stringify(sample)}`).toBeGreaterThan(0)
    }
  })
})
