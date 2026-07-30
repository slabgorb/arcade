// tests/shell/lives-triangle.test.ts
//
// RED-phase suite for Story SH2-6, AC-2 — the lives counter's up-triangle icon.
//
// drawLives today draws `ctx.fillText('▲'.repeat(lives))` (render.ts). U+25B2 is
// NOT a glyph in @shared/font: the SH2-3 audit deliberately omitted it as
// an ICON, not typography. So the migration cannot route it through layoutText —
// if it did, the caps-only stroke face returns an empty glyph and the lives row
// renders BLANK once the TTF is deleted. AC-2 requires it be redrawn as a bespoke
// vector shape: a stroked triangle, one per remaining tank.
//
// This suite mocks './font' (so a lazy layoutText('▲') is observable as a mock
// call, and so it never depends on the /font subpath resolving) and drives
// drawLives through a recording ctx that counts stroked segments (lineTo),
// stroke() calls, and any fillText. The contract: the row is drawn as stroked
// geometry that SCALES with the tank count, through NO text API and NO layoutText.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawLives } from '../../src/shell/render'

// The mock records any layoutText call so a ▲-through-the-font mistake is caught.
const font = vi.hoisted(() => {
  const calls: { text: string }[] = []
  return {
    calls,
    layoutText(text: string) {
      calls.push({ text })
      return { strokes: [{ points: [{ x: 0, y: 0 }, { x: 16, y: 0 }] }], width: 16 }
    },
  }
})

vi.mock('../../src/shell/font', () => ({
  layoutText: font.layoutText,
  CELL_W: 16,
  CELL_H: 24,
  hasGlyph: () => true,
  charGlyph: () => ({ strokes: [], advance: 24 }),
  GLYPH_CHARS: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-,/_',
  // Link-compat shim: pre-migration render.ts still imports UI_FONT_FAMILY from
  // './font', and vitest errors at collection if a mocked module omits a name
  // the graph imports. Dead once Dev deletes the TTF loader (GREEN).
  UI_FONT_FAMILY: 'Vector Battle',
}))

const W = 800
const H = 600

// Recording ctx: counts stroked segments (lineTo), stroke() calls, and captures
// any fillText/strokeText text. Everything else no-ops (Proxy).
function recCtx() {
  const rec = {
    fillTextCalls: [] as string[],
    segments: 0,
    strokeCalls: 0,
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
      if (prop === 'lineTo') return () => { rec.segments += 1 }
      if (prop === 'stroke') return () => { rec.strokeCalls += 1 }
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop in t) return t[prop]
      return () => {}
    },
    set(t, prop, value) {
      t[prop] = value
      return true
    },
  })
  return { ctx: proxy as unknown as CanvasRenderingContext2D, rec }
}

const segmentsFor = (lives: number): number => {
  const { ctx, rec } = recCtx()
  drawLives(ctx, lives, W, H)
  return rec.segments
}

beforeEach(() => {
  font.calls.length = 0
})

describe('SH2-6 — the lives ▲ is a bespoke stroked triangle, not TTF/font text', () => {
  it('never draws the lives row through the canvas text API (AC-1)', () => {
    const { ctx, rec } = recCtx()
    drawLives(ctx, 3, W, H)
    expect(rec.fillTextCalls, 'drawLives still paints the ▲ via fillText').toEqual([])
  })

  it('strokes one triangle per remaining tank — the row scales with lives (AC-2)', () => {
    // Pre-migration every count strokes 0 segments (it fillTexts), so these
    // ordering checks all fail — the RED signal that the ▲ became real geometry.
    expect(segmentsFor(0), 'zero lives should stroke no triangle').toBe(0)
    expect(segmentsFor(1), 'one life should stroke a triangle').toBeGreaterThan(0)
    expect(segmentsFor(3), 'three lives should stroke more than one').toBeGreaterThan(segmentsFor(1))
  })

  it('strokes the triangle as vector geometry rather than filling it (AC-2)', () => {
    // AC-2: a STROKED triangle — the cabinet's glowing-vector aesthetic. Pre-
    // migration drawLives never calls stroke() (it fillTexts), so this fails RED.
    const { ctx, rec } = recCtx()
    drawLives(ctx, 3, W, H)
    expect(rec.strokeCalls, 'the lives triangle is not stroked').toBeGreaterThan(0)
  })

  it('never routes the ▲ icon through @shared/font layoutText (AC-2)', () => {
    // The icon must not lean on the shared font at all — layoutText('▲') would
    // return an empty glyph and blank the row. Guarded by "it drew real geometry"
    // (segments > 0) so this is not vacuously green: pre-migration segments is 0.
    const { ctx, rec } = recCtx()
    drawLives(ctx, 3, W, H)
    expect(rec.segments, 'drawLives drew no geometry for the lives row').toBeGreaterThan(0)
    expect(font.calls.length, 'drawLives routed the ▲ through layoutText').toBe(0)
  })
})
