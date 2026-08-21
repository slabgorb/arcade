// tests/cabinet.test.ts
//
// Story sa1-1 (epic sa1, "Polish and QOL") — RED phase (O'Brien / TEA).
//
// The shared DISPLAY CHROME every cabinet frames itself with. A game never fills
// the whole window: the world is fitted (letterbox/pillarbox via @shared/view's
// `letterbox`, or integer-scaled via `fitIntegerScale`), leaving BARS of dead
// screen around it. Today each game paints — or ignores — those non-game margins
// its own way. This module owns them once, for all eleven games, so the surround
// looks identical everywhere. The story's phrase is "an overlay indicating the
// 'non-game' parts of the users' screen": those parts are exactly the complement
// of the fitted game rect inside its container, and that is what this module
// computes and paints.
//
// Two halves, mirroring the split every shared render primitive here already uses
// (see @shared/view: pure `letterbox` + DOM-touching `resizeToDisplay`):
//
//   chromeRegions(container, game)  — PURE. The non-game regions as a set of
//     non-overlapping rectangles that EXACTLY tile the complement of `game`
//     inside `container`. No DOM, no state, no time — unit-tested here in node.
//
//   drawCabinetChrome(ctx, container, game, opts) — the DOM seam. Fills every
//     region returned by chromeRegions UNIFORMLY (one style for all of them —
//     that uniformity IS the consistency the story asks for) and paints NOTHING
//     inside the game rect. BROWSER subpath (writes to a canvas ctx), so it is
//     purity-exempt exactly like `resizeToDisplay` and `drawEscOverlay`.
//
// ── CONTRACT Dev implements to turn this GREEN ──────────────────────────────
//   export interface Size { readonly width: number; readonly height: number }
//   export interface Rect { readonly x: number; readonly y: number
//                           readonly width: number; readonly height: number }
//   export function chromeRegions(container: Size, game: Rect): readonly Rect[]
//   export function drawCabinetChrome(
//     ctx, container: Size, game: Rect, opts: { color: string }): void
//
// Fleet adoption ("ALL games route through it") is the other AC and is pinned
// separately, in tests/chrome-convergence.test.mjs.
import { describe, it, expect, vi } from 'vitest'
import { chromeRegions, drawCabinetChrome, type Rect, type Size } from '../cabinet'

/** Area of a rect. */
const area = (r: Rect): number => r.width * r.height

/** Do two rects overlap on a POSITIVE area (touching edges do not count)? */
function overlaps(a: Rect, b: Rect): boolean {
  const ix = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x)
  const iy = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y)
  return ix > 0 && iy > 0
}

/** A container and a fitted game rect centred inside it (the shape `letterbox`
 *  returns): describe the three fit cases plus the two degenerate ones. */
const CONTAINER: Size = { width: 800, height: 600 }

const CASES: { name: string; game: Rect; expectedBars: number }[] = [
  // Pillarbox: game is 4:3-ish but narrower than the container → left+right bars.
  { name: 'pillarbox (bars left/right)', game: { x: 100, y: 0, width: 600, height: 600 }, expectedBars: 2 },
  // Letterbox: game is wider than tall relative to container → top+bottom bars.
  { name: 'letterbox (bars top/bottom)', game: { x: 0, y: 75, width: 800, height: 450 }, expectedBars: 2 },
  // Both: game smaller in BOTH axes, centred → a full surround (>=2 regions
  // tiling the frame; the exact decomposition is Dev's, we assert the invariants).
  { name: 'full surround (smaller both axes)', game: { x: 100, y: 75, width: 600, height: 450 }, expectedBars: 3 },
]

describe('chromeRegions — the non-game surround (pure)', () => {
  it('returns NO regions when the game fills the container exactly', () => {
    const full: Rect = { x: 0, y: 0, width: CONTAINER.width, height: CONTAINER.height }
    expect(chromeRegions(CONTAINER, full)).toEqual([])
  })

  for (const { name, game } of CASES) {
    describe(name, () => {
      it('every region lies inside the container', () => {
        for (const r of chromeRegions(CONTAINER, game)) {
          expect(r.x).toBeGreaterThanOrEqual(0)
          expect(r.y).toBeGreaterThanOrEqual(0)
          expect(r.x + r.width).toBeLessThanOrEqual(CONTAINER.width)
          expect(r.y + r.height).toBeLessThanOrEqual(CONTAINER.height)
        }
      })

      it('every region is non-empty (positive area)', () => {
        const regions = chromeRegions(CONTAINER, game)
        expect(regions.length).toBeGreaterThan(0)
        for (const r of regions) {
          expect(r.width).toBeGreaterThan(0)
          expect(r.height).toBeGreaterThan(0)
        }
      })

      it('no region overlaps the game rect', () => {
        for (const r of chromeRegions(CONTAINER, game)) {
          expect(overlaps(r, game)).toBe(false)
        }
      })

      it('regions do not overlap each other', () => {
        const regions = chromeRegions(CONTAINER, game)
        for (let i = 0; i < regions.length; i++) {
          for (let j = i + 1; j < regions.length; j++) {
            expect(overlaps(regions[i], regions[j])).toBe(false)
          }
        }
      })

      it('regions tile EXACTLY the complement of the game rect (area accounts for every dead pixel)', () => {
        const regions = chromeRegions(CONTAINER, game)
        const covered = regions.reduce((sum, r) => sum + area(r), 0)
        const complement = area({ x: 0, y: 0, ...CONTAINER }) - area(game)
        expect(covered).toBe(complement)
      })
    })
  }
})

/** A canvas 2d context that records every fillRect + the fillStyle in force. */
function recordingCtx() {
  const fills: { x: number; y: number; w: number; h: number; style: string }[] = []
  let style = ''
  const ctx = {
    set fillStyle(v: string) {
      style = v
    },
    get fillStyle() {
      return style
    },
    fillRect: vi.fn((x: number, y: number, w: number, h: number) => {
      fills.push({ x, y, w, h, style })
    }),
    save: vi.fn(),
    restore: vi.fn(),
  }
  return { ctx, fills }
}

describe('drawCabinetChrome — uniform fill of the surround (DOM seam)', () => {
  const game: Rect = { x: 100, y: 75, width: 600, height: 450 }

  it('paints one fill per non-game region', () => {
    const { ctx, fills } = recordingCtx()
    drawCabinetChrome(ctx as unknown as CanvasRenderingContext2D, CONTAINER, game, { color: '#101018' })
    const regions = chromeRegions(CONTAINER, game)
    // exactly the regions get a fill — not zero (nothing drawn), not the whole frame.
    expect(fills.length).toBe(regions.length)
    for (const r of regions) {
      expect(fills).toContainEqual(
        expect.objectContaining({ x: r.x, y: r.y, w: r.width, h: r.height }),
      )
    }
  })

  it('uses ONE consistent style for every region (uniform chrome)', () => {
    const { ctx, fills } = recordingCtx()
    drawCabinetChrome(ctx as unknown as CanvasRenderingContext2D, CONTAINER, game, { color: '#101018' })
    const styles = new Set(fills.map((f) => f.style))
    expect(styles).toEqual(new Set(['#101018']))
  })

  it('never paints inside the game rect', () => {
    const { ctx, fills } = recordingCtx()
    drawCabinetChrome(ctx as unknown as CanvasRenderingContext2D, CONTAINER, game, { color: '#101018' })
    for (const f of fills) {
      expect(overlaps({ x: f.x, y: f.y, width: f.w, height: f.h }, game)).toBe(false)
    }
  })

  it('draws nothing when the game fills the container', () => {
    const { ctx, fills } = recordingCtx()
    const full: Rect = { x: 0, y: 0, width: CONTAINER.width, height: CONTAINER.height }
    drawCabinetChrome(ctx as unknown as CanvasRenderingContext2D, CONTAINER, full, { color: '#101018' })
    expect(fills.length).toBe(0)
  })
})
