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
// lives in font-text-seam.test.ts). The dimming backdrop is a fillRect, not text,
// so it is still observed directly.
//
// SH2-14 REPOINT: drawPauseOverlay's card now flows through the shared
// @shared/esc-overlay (not battlezone's local font), so it is observed at
// THAT boundary — the card lines handed to drawEscOverlay. drawControlIndicator
// still uses the local font seam and is read from the layoutText mock as before.
//
// WHAT IS PINNED (cheap + deterministic): the keybind card is actually routed; it
// names the resume key; a dimming backdrop panel is drawn; the control indicator
// draws a non-empty hint. WHAT IS NOT pinned (playtest-tunable per the epic):
// exact copy, glyph size, placement, opacity, backdrop geometry.
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { drawPauseOverlay, drawControlIndicator } from '../../src/shell/render'

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

// SH2-14 RE-POINT: drawPauseOverlay now delegates the paused keybind card to the
// shared @shared/esc-overlay, which strokes it through the shared font
// INTERNALLY — unobservable via a local-font mock (and the dist's internal font
// import is node_modules-relative, so a shared-font mock can't reach it either).
// So observe drawPauseOverlay at the seam it now OWNS: the card LINES it hands to
// drawEscOverlay. The mock also strokes the real dim fillRect so the backdrop
// assertion still holds; the shared overlay's own font layout / tracking is
// unit-tested in arcade-shared (SH2-12).
const overlay = vi.hoisted(() => {
  const cards: string[][] = []
  return {
    cards,
    drawEscOverlay(
      ctx: { fillRect(x: number, y: number, w: number, h: number): void },
      w: number,
      h: number,
      opts: { lines: readonly string[]; color: string; opacity: number },
    ) {
      cards.push([...opts.lines])
      ctx.fillRect(0, 0, w, h) // the dim panel (opts.opacity) — a real backdrop
    },
  }
})
vi.mock('@shared/esc-overlay', () => ({ drawEscOverlay: overlay.drawEscOverlay }))

const cardLines = () => overlay.cards.flat()

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
  overlay.cards.length = 0
})

describe('bz2-5 — drawPauseOverlay: the paused keybind overlay (SH2-14: via shared esc-overlay)', () => {
  it('hands the keybind card to the shared drawEscOverlay — AC2', () => {
    const { ctx } = recordingCtx()
    drawPauseOverlay(ctx, W, H)
    expect(
      overlay.cards.length,
      'drawPauseOverlay did not route through the shared drawEscOverlay',
    ).toBeGreaterThan(0)
    expect(
      cardLines().some((t) => t.trim().length > 0),
      'the pause overlay routed only blank card lines',
    ).toBe(true)
  })

  it('tells the player how to resume — the card names the Escape key (AC3)', () => {
    // AC3 is "resume on a subsequent Escape press". A keybind card that never
    // mentions Escape leaves the player frozen with no way back in — so the
    // resume key must appear somewhere in the card lines.
    const { ctx } = recordingCtx()
    drawPauseOverlay(ctx, W, H)
    const all = cardLines().join(' \n ')
    expect(all, `overlay card "${all}" must reference the Escape (resume) key`).toMatch(/esc/i)
  })

  it('dims the view behind a backdrop panel (it is an OVERLAY, not floating text)', () => {
    // "An overlay appears" (AC2) means the frozen world is dimmed behind a panel,
    // not that bare glyphs float over live vectors. That SOME dimming rectangle
    // is drawn is the structure; exact size/opacity/placement is playtest-tunable.
    const { ctx, fillRects } = recordingCtx()
    drawPauseOverlay(ctx, W, H)
    expect(fillRects.length, 'the pause overlay drew no dimming backdrop').toBeGreaterThan(0)
  })
})

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
