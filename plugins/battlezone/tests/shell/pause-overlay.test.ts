// tests/shell/pause-overlay.test.ts
//
// Story bz2-5 — the two HUD surfaces the playtest asked for (epic bz2): a PAUSE
// overlay listing the keybinds, and an always-on control indicator.
//
// SH2-6 REPOINT: these bz2-5 contracts survive the font migration; only the seam
// where the TEXT is observed moves. Pre-migration the overlay text was FILLED
// (ctx.fillText) so its strings were read there; post-migration every glyph is
// STROKED via layoutText, and stroked geometry is anonymous — the only place the
// STRINGS are still identifiable is the layoutText boundary. So this suite mocks
// the local './font' re-export and reads the routed strings from there. The
// bz2-2 'Vector Battle' font-family assertions retired with the TTF (their
// replacement — every run goes through layoutText, upper-cased, with tracking —
// lives in font-text-seam.test.ts).
//
// SH2-14 REPOINT (superseded below): drawPauseOverlay's card used to flow
// through the shared @shared/esc-overlay (not battlezone's local font), observed
// at THAT boundary — the card lines handed to drawEscOverlay.
//
// sa1-5 RETIREMENT (Option A): drawPauseOverlay (and PAUSE_LINES/PAUSE_DIM) is
// GONE from src/shell/render.ts — battlezone no longer owns any pause chrome at
// all. Escape now opens the rebindable @shared/controls-overlay (main.ts), which
// draws its own dim panel + menu/rebind rows and is unit-tested at the shared
// layer (src/shared/tests/controls-overlay.test.ts); the "resume is reachable"
// and "the frozen field is dimmed" guarantees pinned below by the retired
// describe block are now that module's contract, not this file's — see
// tests/shell/pause-esc-overlay-repoint.test.ts for battlezone's wiring-level
// pin (imports @shared/controls-overlay, no longer @shared/esc-overlay).
// drawControlIndicator is UNCHANGED by sa1-5 (still an always-on, always-local
// HUD hint through the local font seam) and keeps its coverage below.
//
// WHAT IS PINNED (cheap + deterministic): the control indicator draws a
// non-empty hint. WHAT IS NOT pinned (playtest-tunable per the epic): exact
// copy, glyph size, placement.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawControlIndicator } from '../../src/shell/render'

// drawControlIndicator still strokes through battlezone's LOCAL font (layoutText);
// record the strings it hands over — its post-migration text seam.
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

/** Recording ctx: captures filled rectangles (the dimming panel). A Proxy
 *  no-ops every other member so the real draw routine runs end-to-end without
 *  throwing — that "does not break rendering" is itself AC6. */
function recordingCtx() {
  const fillRects: Array<{ w: number; h: number }> = []
  const rec = { canvas: { width: W, height: H } }
  const target = rec as unknown as Record<string | symbol, unknown>
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop === 'fillRect') return (_x: number, _y: number, w: number, h: number) => { fillRects.push({ w, h }) }
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
  return { ctx: proxy as unknown as CanvasRenderingContext2D, fillRects }
}

const texts = () => font.calls.map((c) => c.text)

beforeEach(() => {
  font.calls.length = 0
})

// sa1-5 RETIREMENT: the former 'bz2-5 — drawPauseOverlay' describe block lived
// here, pinning AC2 (routes through the shared drawEscOverlay), AC3 (names
// Escape) and the dimming backdrop directly against battlezone's now-deleted
// drawPauseOverlay. That behaviour is not gone from the game — it moved to
// @shared/controls-overlay, which main.ts's Escape listener now opens outright
// (tests/shell/pause-esc-overlay-repoint.test.ts pins the wiring: battlezone
// imports @shared/controls-overlay, no longer @shared/esc-overlay). The dim
// panel + "how to resume" (its menu's RESUME row) contracts are that shared
// module's own coverage (src/shared/tests/controls-overlay.test.ts), so
// re-pinning them here against a mock would only duplicate that suite while
// asserting nothing about battlezone-specific code.

describe('bz2-5 — drawControlIndicator: the always-on control hint', () => {
  it('routes a non-empty control hint through the shared font — AC4', () => {
    const { ctx } = recordingCtx()
    drawControlIndicator(ctx, W, H)
    expect(font.calls.length, 'the control indicator routed no text').toBeGreaterThan(0)
    expect(
      texts().some((t) => t.trim().length > 0),
      'the control indicator routed only blank strings',
    ).toBe(true)
  })
})
