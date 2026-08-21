// tests/margin-mask.render.test.ts
//
// Story A2-1 (RED) — the margin mask, wired into render().
//
// margin.test.ts pins the pure bar geometry. This suite pins that render()
// actually PAINTS that mask, and paints it without breaking the two things the
// ACs guard: it must not obscure the play area, and it must not obscure the HUD.
//
// sa1-1: the mask is now routed through the shared @shared/cabinet module
// (drawCabinetChrome + CABINET_CHROME) so asteroids' margin reads identically to
// every other game's. The geometry contract is unchanged (same bars); only the
// fill colour changed, from asteroids' own translucent white wash to the shared
// cabinet's opaque near-black (#0a0a12) — see isCabinetChrome below.
//
// The testable seam (as in render.test.ts) is the ordered stream of draw calls a
// mock CanvasRenderingContext2D records. render() already fills one full-frame
// black background rect; the mask is any *non*-full-frame fill on top. The mock
// timestamps every fillRect and fillText with a monotonic order counter so we can
// assert the mask lands BEFORE the first HUD glyph — the deterministic expression
// of "does not obscure UI elements". This suite pins that the mask paints the ONE
// shared cabinet colour (@shared/cabinet CABINET_CHROME, '#0a0a12') every game in
// the cabinet uses — that uniformity is the whole point of sa1-1.
//
// An INDEPENDENT oracle (`fit`) re-derives the expected playfield from the WORLD
// constants so the margin/play-area classification is not circular with margin.ts.
//
// RED until render() draws a margin mask.

import { describe, it, expect, vi } from 'vitest'
import { render } from '../src/shell/render'
import { WORLD_W, WORLD_H, initialState, type GameState, type Mode } from '../src/core/state'
import { NO_INPUT } from '../src/core/input'
import { CABINET_CHROME } from '@shared/cabinet'

// SH2-4: HUD text is stroked from @shared/font layoutText geometry, not
// drawn via ctx.fillText. To keep the "mask before HUD text" ordering check, the
// local ./font module is mocked so each layoutText call timestamps its order from
// the SAME monotonic counter the ctx stub bumps on fillRect.
const font = vi.hoisted(() => {
  const order = { n: 0 }
  const textOrders: number[] = []
  return {
    order,
    textOrders,
    layoutText(text: string, opts?: { letterSpacing?: number }) {
      textOrders.push(order.n++)
      const n = [...text].length
      const sp = opts?.letterSpacing ?? 0
      return { strokes: [{ points: [{ x: 0, y: 0 }, { x: 16, y: 0 }] }], width: 16 * n + sp * n }
    },
  }
})

vi.mock('../src/shell/font', () => ({
  layoutText: font.layoutText,
  CELL_W: 16,
  CELL_H: 24,
  hasGlyph: () => true,
  charGlyph: () => ({ strokes: [], advance: 24 }),
  GLYPH_CHARS: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_,/',
}))

const EPS = 1e-6

type FillRec = { x: number; y: number; w: number; h: number; style: string; alpha: number; order: number }

/** A canvas-context stub that records fillRect in draw order; layoutText order is
 *  recorded on the shared counter by the ./font mock above. */
function makeCtx() {
  const fills: FillRec[] = []
  const segments: number[][] = []
  let pen: [number, number] = [0, 0]
  font.order.n = 0
  font.textOrders.length = 0
  const rec = {
    fillStyle: '' as string,
    strokeStyle: '' as string,
    shadowColor: '' as string,
    shadowBlur: 0,
    lineWidth: 0,
    globalAlpha: 1,
    textAlign: '' as CanvasTextAlign,
    font: '' as string,
    letterSpacing: '' as string,
    save() {},
    restore() {},
    beginPath() {},
    closePath() {},
    stroke() {},
    fill() {},
    arc() {},
    moveTo(x: number, y: number) {
      pen = [x, y]
    },
    lineTo(x: number, y: number) {
      segments.push([pen[0], pen[1], x, y])
      pen = [x, y]
    },
    fillRect(x: number, y: number, w: number, h: number) {
      fills.push({ x, y, w, h, style: rec.fillStyle, alpha: rec.globalAlpha, order: font.order.n++ })
    },
    clearRect() {},
    fillText() {},
    measureText() {
      return { width: 0 }
    },
  }
  return { ctx: rec as unknown as CanvasRenderingContext2D, fills, segments }
}

function fit(w: number, h: number) {
  const s = Math.min(w / WORLD_W, h / WORLD_H)
  const pw = WORLD_W * s
  const ph = WORLD_H * s
  const left = (w - pw) / 2
  const top = (h - ph) / 2
  return { left, top, right: left + pw, bottom: top + ph }
}

const isFullFrame = (f: FillRec, w: number, h: number): boolean =>
  f.x <= EPS && f.y <= EPS && f.w >= w - EPS && f.h >= h - EPS

/** The mask is every fill that is not the full-frame background clear. */
const maskFillsOf = (fills: FillRec[], w: number, h: number): FillRec[] =>
  fills.filter((f) => !isFullFrame(f, w, h))

const containsPoint = (f: FillRec, x: number, y: number): boolean =>
  x >= f.x - EPS && x <= f.x + f.w + EPS && y >= f.y - EPS && y <= f.y + f.h + EPS

const hitsPlayfield = (f: FillRec, p: ReturnType<typeof fit>): boolean =>
  f.x + f.w > p.left + EPS && f.x < p.right - EPS && f.y + f.h > p.top + EPS && f.y < p.bottom - EPS

/** The ONE shared cabinet surround colour (@shared/cabinet CABINET_CHROME) every
 *  game in the fleet must paint its margin with — sa1-1's whole point is that this
 *  no longer varies per game. */
const isCabinetChrome = (style: string): boolean => style.trim().toLowerCase() === CABINET_CHROME.color

const playingState = (over: Partial<GameState> = {}, mode: Mode = 'playing'): GameState => ({
  ...initialState(1979),
  mode,
  ...over,
})

// ---- pillarbox: the mask covers the side margins, nothing else -----------------

describe('render margin mask — pillarbox (wide canvas)', () => {
  const W = 1600
  const H = 600
  const p = fit(W, H)

  it('paints a mask, and only over the non-playable margin', () => {
    const { ctx, fills } = makeCtx()
    render(ctx, playingState(), W, H, NO_INPUT)
    const mask = maskFillsOf(fills, W, H)
    expect(mask.length, 'no margin mask was drawn').toBeGreaterThan(0)
    for (const f of mask) {
      expect(hitsPlayfield(f, p), `mask fill ${JSON.stringify(f)} covers the play area`).toBe(false)
    }
    // and it actually reaches both side margins
    expect(mask.some((f) => containsPoint(f, p.left / 2, H / 2)), 'left margin unmasked').toBe(true)
    expect(mask.some((f) => containsPoint(f, (p.right + W) / 2, H / 2)), 'right margin unmasked').toBe(true)
  })

  it('never paints over the playfield centre — gameplay stays fully visible', () => {
    const { ctx, fills } = makeCtx()
    render(ctx, playingState(), W, H, NO_INPUT)
    for (const f of maskFillsOf(fills, W, H)) {
      expect(containsPoint(f, W / 2, H / 2), 'mask covers the playfield centre').toBe(false)
    }
  })

  it('draws the mask BEFORE the HUD text, so the HUD is never obscured (AC-2)', () => {
    const { ctx, fills } = makeCtx()
    render(ctx, playingState(), W, H, NO_INPUT)
    const mask = maskFillsOf(fills, W, H)
    expect(mask.length).toBeGreaterThan(0)
    expect(font.textOrders.length, 'expected HUD text to be laid out').toBeGreaterThan(0)
    const firstHudOrder = Math.min(...font.textOrders)
    for (const f of mask) {
      expect(f.order, 'a mask fill was drawn on top of the HUD').toBeLessThan(firstHudOrder)
    }
  })

  it('paints the shared cabinet chrome colour (sa1-1: one look for the whole fleet)', () => {
    const { ctx, fills } = makeCtx()
    render(ctx, playingState(), W, H, NO_INPUT)
    const mask = maskFillsOf(fills, W, H)
    expect(mask.length, 'no mask to check the colour of').toBeGreaterThan(0)
    for (const f of mask) {
      expect(isCabinetChrome(f.style), `mask fill style "${f.style}" is not CABINET_CHROME`).toBe(true)
    }
  })

  it('does not mutate the core state it renders', () => {
    const state = playingState()
    const before = structuredClone(state)
    render(makeCtx().ctx, state, W, H, NO_INPUT)
    expect(state).toEqual(before)
  })
})

// ---- letterbox: same guarantees on the other axis ------------------------------

describe('render margin mask — letterbox (tall canvas)', () => {
  const W = 600
  const H = 1600
  const p = fit(W, H)

  it('masks the top and bottom margins but never the playfield centre', () => {
    const { ctx, fills } = makeCtx()
    render(ctx, playingState(), W, H, NO_INPUT)
    const mask = maskFillsOf(fills, W, H)
    expect(mask.length, 'no margin mask was drawn').toBeGreaterThan(0)
    expect(mask.some((f) => containsPoint(f, W / 2, p.top / 2)), 'top margin unmasked').toBe(true)
    expect(mask.some((f) => containsPoint(f, W / 2, (p.bottom + H) / 2)), 'bottom margin unmasked').toBe(true)
    for (const f of mask) {
      expect(hitsPlayfield(f, p), 'mask covers the play area').toBe(false)
    }
    expect(mask.some((f) => containsPoint(f, W / 2, H / 2)), 'mask covers the playfield centre').toBe(false)
  })
})

// ---- exact 4:3: nothing to mask -----------------------------------------------

describe('render margin mask — exact 4:3 canvas (no margin)', () => {
  it('paints no mask when the playfield already fills the canvas', () => {
    const W = 800
    const H = 600
    const { ctx, fills } = makeCtx()
    render(ctx, playingState(), W, H, NO_INPUT)
    // Only the full-frame background fill is allowed; no extra bars.
    expect(maskFillsOf(fills, W, H)).toHaveLength(0)
  })
})

// ---- always-on: the mask frames the arena in every mode ------------------------

describe('render margin mask — always-on framing', () => {
  it('draws the mask in attract mode too (it is arena framing, not a play-mode overlay)', () => {
    const W = 1600
    const H = 600
    const { ctx, fills } = makeCtx()
    render(ctx, playingState({}, 'attract'), W, H, NO_INPUT)
    expect(maskFillsOf(fills, W, H).length, 'attract-mode frame has no margin mask').toBeGreaterThan(0)
  })
})
