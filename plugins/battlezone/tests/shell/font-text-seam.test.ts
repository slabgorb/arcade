// tests/shell/font-text-seam.test.ts
//
// RED-phase suite for Story SH2-6, the string-content + tracking contract: after
// the migration the ONLY seam where battlezone's HUD/framing text is identifiable
// as text is the layoutText boundary (the canvas sees anonymous stroke geometry).
// This suite mocks the local './font' re-export module (tempest/asteroids/
// star-wars precedent — render.ts imports layoutText from './font', which
// re-exports @shared/font) and pins:
//
//   1. WHICH strings each HUD draw function hands to layoutText — the same
//      strings it draws through fillText today, so nothing is lost in migration.
//   2. That every run carries a POSITIVE letterSpacing opt — the bz2-2 HUD text
//      read with tracking, the thin caps-only face reads cramped at zero, and a
//      per-run predicate also guards a measure-with-0 / draw-with-N mismatch that
//      would misalign centred / right-aligned text (the SH2-4/SH2-5 contract).
//   3. That every string is handed over ALREADY UPPERCASE — the shared VGMSGA
//      face is caps-only (no lowercase glyph exists); the draw path must
//      uppercase or mixed-case input (e.g. a tampered high-score name flowing
//      through attractLines' `${name}  ${score}` row) silently drops glyphs.
//
// The mock returns trivial-but-valid geometry, so these assertions are decoupled
// from the shared package resolving (the re-pin is forced by
// tests/shell/font-shared-resolution.test.ts) and from real glyph coordinates.
// The lives ▲ is NOT here — it is a bespoke stroked triangle, never a layoutText
// glyph (tests/shell/lives-triangle.test.ts). Layout / position / glow / colour
// remain eyeball criteria per the epic's render guardrail.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  drawScore,
  drawScreenLines,
  drawMessage,
  drawControlIndicator,
} from '../../src/shell/render'

// Record the strings + opts handed to layoutText. Returned geometry is trivial
// but valid so render can stroke it without NaN and without the shared package
// needing to resolve.
const font = vi.hoisted(() => {
  const calls: { text: string; opts: { letterSpacing?: number } | undefined }[] = []
  return {
    calls,
    layoutText(text: string, opts?: { letterSpacing?: number }) {
      calls.push({ text, opts })
      const n = [...text].length
      const sp = opts?.letterSpacing ?? 0
      return {
        strokes: [{ points: [{ x: 0, y: 0 }, { x: 16, y: 0 }] }],
        width: 16 * n + sp * n,
      }
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
  // the graph imports. Dead once Dev deletes the TTF loader (GREEN) — the seam
  // tests observe layoutText, never this constant.
  UI_FONT_FAMILY: 'Vector Battle',
}))

const W = 800
const H = 600

/** Proxy ctx: every method no-ops, every property is settable; measureText
 *  returns width 0 so any centring math never NaNs. */
function makeCtx(): CanvasRenderingContext2D {
  const target: Record<string | symbol, unknown> = { canvas: { width: W, height: H } }
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} })
      if (prop in t) return t[prop]
      return () => {}
    },
    set(t, prop, value) {
      t[prop] = value
      return true
    },
  })
  return proxy as unknown as CanvasRenderingContext2D
}

const texts = () => font.calls.map((c) => c.text)

beforeEach(() => {
  font.calls.length = 0
})

// ---- (1) which strings each surface routes through layoutText ----------------

describe('SH2-6 — the running HUD flows through layoutText', () => {
  it('hands the score value to layoutText', () => {
    drawScore(makeCtx(), 12_345, W, H)
    expect(texts()).toContain('12345')
  })

  it('hands the in-game alert word to layoutText', () => {
    drawMessage(makeCtx(), 'ENEMY IN RANGE', W, H)
    expect(texts()).toContain('ENEMY IN RANGE')
  })
})

describe('SH2-6 — the screen-line surfaces flow through layoutText', () => {
  it('hands each non-blank screen line to layoutText and skips blanks', () => {
    drawScreenLines(makeCtx(), ['GAME OVER', '', 'PRESS START'], W, H)
    expect(texts()).toContain('GAME OVER')
    expect(texts()).toContain('PRESS START')
    // The blank spacer line must NOT reach layoutText (it is layout whitespace,
    // not a glyph run) — the length>0 skip is preserved through the migration.
    expect(texts()).not.toContain('')
  })

  it('routes the attract high-score row (name + score) through layoutText', () => {
    // attractLines composes `${name}  ${score}` — the row that carries arbitrary
    // stored initials. Driven directly here so the seam sees a realistic row.
    drawScreenLines(makeCtx(), ['BATTLEZONE', '', 'ACE  9000', 'PRESS START'], W, H)
    expect(texts()).toContain('ACE  9000')
  })
})

// ---- (2) tracking + caps contracts on EVERY run ------------------------------

// The LOCAL-font typographic HUD surfaces (drawLives is a bespoke triangle, not
// here). SH2-14 RE-POINT: drawPauseOverlay LEAVES this census — its keybind card
// now strokes through the shared @shared/esc-overlay (which calls layoutText
// on the shared font INTERNALLY, not battlezone's local './font'), so it no longer
// makes a local-font run to observe here. The shared overlay's own tracking + caps
// contract is enforced in arcade-shared's esc-overlay tests (SH2-12); battlezone's
// side is that it hands the card lines to drawEscOverlay (tests/shell/pause-overlay.test.ts).
const surfaces: [string, (c: CanvasRenderingContext2D) => void][] = [
  ['drawScore', (c) => drawScore(c, 12_345, W, H)],
  ['drawScreenLines', (c) => drawScreenLines(c, ['BATTLEZONE', '', 'PRESS START'], W, H)],
  ['drawMessage', (c) => drawMessage(c, 'ENEMY IN RANGE', W, H)],
  ['drawControlIndicator', (c) => drawControlIndicator(c, W, H)],
]

describe('SH2-6 — every layoutText run honours the tracking + caps contracts', () => {
  it('every run carries a positive letterSpacing opt', () => {
    for (const [label, run] of surfaces) {
      font.calls.length = 0
      run(makeCtx())
      expect(font.calls.length, `${label} drew no text at all`).toBeGreaterThan(0)
      for (const call of font.calls) {
        expect(
          call.opts?.letterSpacing ?? 0,
          `run ${JSON.stringify(call.text)} in ${label} has no positive letterSpacing`,
        ).toBeGreaterThan(0)
      }
    }
  })

  it('every string reaches layoutText already uppercase (the face is caps-only)', () => {
    for (const [label, run] of surfaces) {
      font.calls.length = 0
      run(makeCtx())
      expect(font.calls.length, `${label} drew no text at all`).toBeGreaterThan(0)
      for (const call of font.calls) {
        expect(
          call.text,
          `run ${JSON.stringify(call.text)} in ${label} is not caps-only`,
        ).toBe(call.text.toUpperCase())
      }
    }
  })
})

describe('SH2-6 — mixed-case input is upper-cased before the caps-only face', () => {
  it('drawScreenLines upper-cases a tampered high-score row before layoutText', () => {
    // A tampered localStorage high-score name flows verbatim into attractLines'
    // `${name}  ${score}` row. The caps-only VGMSGA face has no lowercase glyph,
    // so the draw path must uppercase it or the name renders blank/gappy.
    drawScreenLines(makeCtx(), ['aCe  9000'], W, H)
    expect(font.calls.length, 'drawScreenLines drew no text').toBeGreaterThan(0)
    for (const call of font.calls) {
      expect(call.text, `row ${JSON.stringify(call.text)} was not upper-cased`).toBe(
        call.text.toUpperCase(),
      )
    }
    expect(texts()).toContain('ACE  9000')
  })

  it('drawMessage upper-cases a lower-case alert before layoutText', () => {
    drawMessage(makeCtx(), 'enemy in range', W, H)
    expect(texts()).toContain('ENEMY IN RANGE')
  })
})
