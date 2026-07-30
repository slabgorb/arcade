// tests/shell/font-migration.test.ts
//
// RED-phase suite for Story SH2-6: migrate battlezone's HUD/framing text off the
// vendored "Vector Battle" TTF (ctx.font + ctx.fillText, bz2-2) onto
// @shared/font stroke-vectors (layoutText -> stroked glyph geometry),
// keeping the ~0.1em HUD tracking through layoutText's `letterSpacing` opt. The
// fourth and last per-game migration after tempest (SH2-2), asteroids (SH2-4),
// and star-wars (SH2-5) — mirrors star-wars' tests/shell/font-migration.test.ts.
//
// Battlezone has NO monolithic render(): it exports one draw function per HUD
// surface (drawScore / drawScreenLines / drawLives / drawMessage /
// drawControlIndicator / drawPauseOverlay), each handed its text as a parameter.
// So the mechanism seam is driven per-function, not through a GameState.
//
// The migration DELETES the text-as-string canvas signal from the game surface:
// post-migration NO HUD text reaches ctx.fillText — every glyph (and the lives
// ▲, drawn as a bespoke stroked triangle, see lives-triangle.test.ts) is stroked
// like the wireframes. The testable seams here are (1) a recording ctx that
// proves every text draw stops touching fillText / ctx.font, (2) fs + source-text
// scans that the TTF asset and its FontFace loader are gone (comment-INCLUSIVE —
// AC-3 forbids any remaining 'Vector Battle'/FontFace reference, even in
// comments), and (3) render.ts strokes through the local './font' re-export seam.
//
// The dependency re-pin (v0.5.0 has no /font subpath; Dev moves it to v0.7.0) is
// forced by tests/shell/font-shared-resolution.test.ts; the string-routing +
// caps/tracking contract lives in tests/shell/font-text-seam.test.ts. Layout /
// size / glow / colour stay eyeball criteria at http://localhost:5273/ per the
// epic's render guardrail — these tests pin MECHANISM, never coordinates.

import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import {
  drawScore,
  drawScreenLines,
  drawLives,
  drawMessage,
  drawControlIndicator,
  drawPauseOverlay,
} from '../../src/shell/render'

const W = 800
const H = 600

// ---- recording ctx: flags every fillText / ctx.font touch, counts stroked
// segments. Every other member no-ops (Proxy) so this suite does not break when
// Dev touches an unrelated ctx call. ------------------------------------------
function recCtx() {
  const rec = {
    fillTextCalls: [] as string[],
    fontSets: [] as unknown[],
    letterSpacingSets: [] as unknown[],
    segments: 0,
    canvas: { width: W, height: H },
  }
  const target = rec as unknown as Record<string | symbol, unknown>
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop === 'fillText' || prop === 'strokeText') {
        return (s: unknown) => {
          rec.fillTextCalls.push(String(s))
        }
      }
      if (prop === 'lineTo') {
        return () => {
          rec.segments += 1
        }
      }
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} })
      if (prop in t) return t[prop]
      return () => {}
    },
    set(t, prop, value) {
      if (prop === 'font') rec.fontSets.push(value)
      if (prop === 'letterSpacing') rec.letterSpacingSets.push(value)
      t[prop] = value
      return true
    },
  })
  return { ctx: proxy as unknown as CanvasRenderingContext2D, rec }
}

// Every text-drawing entry point in render.ts, driven so it actually paints.
// drawLives is included because AC-1/AC-2 forbid its fillText('▲') path too (its
// positive bespoke-triangle contract lives in lives-triangle.test.ts).
const textDraws: ReadonlyArray<{ name: string; run: (c: CanvasRenderingContext2D) => void }> = [
  { name: 'drawScore', run: (c) => drawScore(c, 12_345, W, H) },
  { name: 'drawLives', run: (c) => drawLives(c, 3, W, H) },
  { name: 'drawScreenLines', run: (c) => drawScreenLines(c, ['BATTLEZONE', '', 'PRESS START'], W, H) },
  { name: 'drawMessage', run: (c) => drawMessage(c, 'ENEMY IN RANGE', W, H) },
  { name: 'drawControlIndicator', run: (c) => drawControlIndicator(c, W, H) },
  { name: 'drawPauseOverlay', run: (c) => drawPauseOverlay(c, W, H) },
]

// ---- (1) mechanism: HUD text is stroked, never drawn through the text API -----

describe('SH2-6 — no HUD draw uses the canvas text API', () => {
  for (const { name, run } of textDraws) {
    it(`${name} never calls ctx.fillText / ctx.strokeText`, () => {
      const { ctx, rec } = recCtx()
      run(ctx)
      expect(rec.fillTextCalls, `${name} still draws text through the canvas text API`).toEqual([])
    })

    it(`${name} never sets ctx.font — the TTF face string path is gone`, () => {
      const { ctx, rec } = recCtx()
      run(ctx)
      expect(rec.fontSets, `${name} still sets ctx.font`).toEqual([])
    })
  }

  it('drawScreenLines strokes its non-blank lines as vector geometry', () => {
    // A real line strokes segments; the blank spacer strokes nothing. Pre-
    // migration BOTH go through fillText (0 stroked segments) and this fails —
    // the RED signal that text became geometry.
    const real = recCtx()
    drawScreenLines(real.ctx, ['GAME OVER'], W, H)
    const blank = recCtx()
    drawScreenLines(blank.ctx, [''], W, H)
    expect(real.rec.segments).toBeGreaterThan(0)
    expect(real.rec.segments).toBeGreaterThan(blank.rec.segments)
  })
})

// ---- (2) the Vector Battle TTF asset + its FontFace loader are gone -----------

const SRC_DIR = fileURLToPath(new URL('../../src/', import.meta.url))
const RENDER = fileURLToPath(new URL('../../src/shell/render.ts', import.meta.url))
const FONT_TS = fileURLToPath(new URL('../../src/shell/font.ts', import.meta.url))
const MAIN = fileURLToPath(new URL('../../src/main.ts', import.meta.url))
const FONTS_DIR = fileURLToPath(new URL('../../public/fonts/', import.meta.url))
const read = (p: string): string => readFileSync(p, 'utf8')

function tsFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const p = dir + name
    if (statSync(p).isDirectory()) out.push(...tsFiles(p + '/'))
    else if (name.endsWith('.ts')) out.push(p)
  }
  return out
}

describe('SH2-6 — the non-commercial TTF face and its loader are retired', () => {
  it('ships no .ttf under public/fonts/', () => {
    const ttfs = existsSync(FONTS_DIR)
      ? readdirSync(FONTS_DIR).filter((f) => f.toLowerCase().endsWith('.ttf'))
      : []
    expect(ttfs, `stray TTF asset(s): ${ttfs.join(', ')}`).toEqual([])
  })

  it('no source file references FontFace or document.fonts (comments included)', () => {
    const offenders = tsFiles(SRC_DIR).filter((p) => /\bFontFace\b|document\.fonts/.test(read(p)))
    expect(offenders.map((p) => p.replace(SRC_DIR, 'src/'))).toEqual([])
  })

  it('no source file references loadVectorFont (comments included)', () => {
    const offenders = tsFiles(SRC_DIR).filter((p) => /\bloadVectorFont\b/.test(read(p)))
    expect(offenders.map((p) => p.replace(SRC_DIR, 'src/'))).toEqual([])
  })

  it('no source file references UI_FONT_FAMILY (the TTF family constant is gone)', () => {
    const offenders = tsFiles(SRC_DIR).filter((p) => /\bUI_FONT_FAMILY\b/.test(read(p)))
    expect(offenders.map((p) => p.replace(SRC_DIR, 'src/'))).toEqual([])
  })

  it("no source file references the 'Vector Battle' face (comments included)", () => {
    // /Vector ?Battle/ also catches the VectorBattle-e9XO.ttf asset URL.
    const offenders = tsFiles(SRC_DIR).filter((p) => /Vector ?Battle/i.test(read(p)))
    expect(offenders.map((p) => p.replace(SRC_DIR, 'src/'))).toEqual([])
  })

  it('main.ts no longer boots a TTF font load', () => {
    expect(/\bloadVectorFont\b/.test(read(MAIN)), 'main.ts still calls loadVectorFont').toBe(false)
  })
})

// ---- (3) render.ts strokes shared-font glyphs instead of TTF text -------------

describe('SH2-6 — render.ts draws text via @shared/font layoutText', () => {
  it('uses no canvas text API (fillText / ctx.font / ctx.letterSpacing) in source', () => {
    const src = read(RENDER)
    expect(/\bfillText\b/.test(src), 'render.ts still calls fillText').toBe(false)
    expect(/ctx\.font\b/.test(src), 'render.ts still sets ctx.font').toBe(false)
    // The bare word letterSpacing is ALLOWED (it is the layoutText opt the
    // tracking contract mandates) — only the ctx property is forbidden.
    expect(/ctx\.letterSpacing/.test(src), 'render.ts still sets ctx.letterSpacing').toBe(false)
  })

  it("imports layoutText through the local './font' seam and calls it", () => {
    // The local re-export module is the vi.mock seam every text-observation
    // suite relies on (tempest/asteroids/star-wars precedent) — render.ts must
    // import from './font', NOT directly from the shared package.
    const src = read(RENDER)
    expect(/from '\.\/font'/.test(src), "render.ts does not import from './font'").toBe(true)
    expect(/\blayoutText\b/.test(src), 'render.ts never references layoutText').toBe(true)
    expect(
      /from '@shared\/font'/.test(src),
      'render.ts must go through ./font, not import the shared package directly',
    ).toBe(false)
  })

  it('src/shell/font.ts is the shared re-export, not a TTF loader', () => {
    const src = read(FONT_TS)
    expect(
      /@shared\/font/.test(src),
      'font.ts does not re-export @shared/font',
    ).toBe(true)
  })
})
