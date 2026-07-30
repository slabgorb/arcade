// tests/shell/render.cockpit-frame.test.ts
//
// Story sw9-1 (RED phase, TEA / O'Brien) — the persistent X-wing cockpit canopy frame:
// the "red-strut / blue-bar" overlay that frames every cabinet gameplay view.
//
// PROVENANCE RULING (see sprint/context/context-story-sw9-1.md): the frame is an
// AUTHENTIC WSVROM color-vector picture set, NOT cabinet artwork. The 1983 source draws
// it under `.SBTTL PLAYER'S GUN SITE` (WSVROM.MAC:1413-1885) as FIVE AVG screen-space
// pictures, each a self-labelled "SITE / PLAYER'S ... GUN / SHIP":
//   VGSTTR  right side rail   (VOFF VGLIMR,VGOFFY)
//   VGSTTL  left  side rail   (VOFF VGLIML,VGOFFY)
//   VGSTBR  bottom-right      (VOFF VGLIMR,VGLIMB)
//   VGSTBL  bottom-left       (VOFF VGLIML,VGLIMB)
//   VGSTBM  bottom-middle     (VOFF 0,VGLIMB)  "PLAYER'S FRONT SHIP"
// Each is drawn `COLOR VGCBLU` (deep blue, ==1) for the gun SHAFT/TIP and `COLOR VGCRED`
// (red, ==4) for the COLLAR/DISH — the title's blue bars (shafts) + red struts (collars).
// It is a STATIC screen-space overlay (absolute VOFF to the screen limits, never through
// the 3D math box), like the crosshair chevrons (VGSITE, already `drawCrosshair`).
//
// TEST STRATEGY. `render()` is exercised through a transform-tracking recording ctx that
// captures every stroked polyline with its current strokeStyle, mapped to ABSOLUTE canvas
// pixels (so it survives Dev drawing via ctx.translate/scale or raw absolute coords, and
// via `glowPolyline` which sets `strokeStyle` then moveTo/lineTo/stroke). We then classify
// each stroke's colour and where it sits, and assert the frame's authentic-blue and
// authentic-red strokes land at the five ROM anchors.
//
// Colour isolation: the aim reticle is cyan (#00e5ff — high green), the surface grid /
// trench walls / shield gauge are green, the Death Star is white, HUD labels are red but
// TOP-anchored. We classify BLUE as a true DEEP blue (VGCBLU: high B, low R, LOW GREEN —
// so cyan is excluded) and RED as high-R/low-G/low-B, and we look for red only in the
// BOTTOM band (below the top HUD). With a minimal space-phase fixture (empty starfield, no
// enemies/shots/debris, laser off, no Death-Star boom) the only blue strokes anywhere are
// the cockpit frame.
//
// The frame does not exist today, so these tests are RED. Two are regression GUARDS that
// pass now and must keep passing (noted inline): AC-6 "absent on attract/gameover" and
// AC-7 "core purity".

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { render } from '../../src/shell/render'
import { initialState, type GameState, type Phase, type Mode } from '../../src/core/state'

// Mock the shared stroke font so HUD text lays out without resolving @shared/font
// (mirrors render.surface-tower-hud.test.ts). Returns trivial strokes; HUD text is red/
// green and TOP-anchored, so it never contaminates the bottom-band / blue frame checks.
vi.mock('../../src/shell/font', () => ({
  layoutText: (text: string, opts?: { letterSpacing?: number }) => {
    const n = [...text].length
    const sp = opts?.letterSpacing ?? 0
    return { strokes: [{ points: [{ x: 0, y: 0 }, { x: 16, y: 0 }] }], width: 16 * n + sp * n }
  },
  CELL_W: 16,
  CELL_H: 24,
  hasGlyph: () => true,
  charGlyph: () => ({ strokes: [], advance: 24 }),
  GLYPH_CHARS: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_,/',
}))

const W = 800
const H = 600

type Pt = { x: number; y: number }
type Seg = { color: string; pts: Pt[] }

/**
 * A recording ctx that tracks the 2D affine transform (save/restore/translate/scale/
 * rotate/transform/setTransform) and, on every `stroke()`, records the current path as
 * ABSOLUTE canvas points tagged with the current strokeStyle. Everything else no-ops.
 */
function makeRecorder(): { ctx: CanvasRenderingContext2D; segs: Seg[] } {
  const segs: Seg[] = []
  // affine matrix [a,b,c,d,e,f]: x' = a*x + c*y + e ; y' = b*x + d*y + f
  let m = [1, 0, 0, 1, 0, 0]
  const stack: number[][] = []
  let path: Pt[] = []
  let strokeStyle = '#000000'
  const styleStack: string[] = []
  const apply = (x: number, y: number): Pt => ({
    x: m[0] * x + m[2] * y + m[4],
    y: m[1] * x + m[3] * y + m[5],
  })
  const mul = (n: number[]): void => {
    m = [
      m[0] * n[0] + m[2] * n[1],
      m[1] * n[0] + m[3] * n[1],
      m[0] * n[2] + m[2] * n[3],
      m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4],
      m[1] * n[4] + m[3] * n[5] + m[5],
    ]
  }
  const target: Record<string | symbol, unknown> = {
    canvas: { width: W, height: H },
    save: () => {
      stack.push(m.slice())
      styleStack.push(strokeStyle)
    },
    restore: () => {
      if (stack.length) m = stack.pop() as number[]
      if (styleStack.length) strokeStyle = styleStack.pop() as string
    },
    translate: (x: number, y: number) => mul([1, 0, 0, 1, x, y]),
    scale: (x: number, y: number) => mul([x, 0, 0, y, 0, 0]),
    rotate: (a: number) => mul([Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]),
    transform: (a: number, b: number, c: number, d: number, e: number, f: number) => mul([a, b, c, d, e, f]),
    setTransform: (a: number, b: number, c: number, d: number, e: number, f: number) => {
      m = [a, b, c, d, e, f]
    },
    beginPath: () => {
      path = []
    },
    moveTo: (x: number, y: number) => {
      path.push(apply(x, y))
    },
    lineTo: (x: number, y: number) => {
      path.push(apply(x, y))
    },
    stroke: () => {
      if (path.length) segs.push({ color: String(strokeStyle), pts: path.slice() })
    },
    measureText: () => ({ width: 0 }),
  }
  const ctx = new Proxy(target, {
    get(t, prop) {
      if (prop === 'strokeStyle') return strokeStyle
      if (prop in t) return t[prop]
      return () => {}
    },
    set(t, prop, value) {
      if (prop === 'strokeStyle') {
        strokeStyle = String(value)
        return true
      }
      t[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, segs }
}

// ---- colour classification -------------------------------------------------
function parseColor(c: string): { r: number; g: number; b: number } | null {
  const s = c.trim()
  let m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(s)
  if (m) return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) }
  m = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(s)
  if (m) return { r: parseInt(m[1] + m[1], 16), g: parseInt(m[2] + m[2], 16), b: parseInt(m[3] + m[3], 16) }
  m = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(s)
  if (m) return { r: +m[1], g: +m[2], b: +m[3] }
  return null
}
// VGCBLU — a true DEEP blue: strong blue, weak red, and LOW GREEN (so the cyan #00e5ff
// aim reticle, green ~229, is NOT counted as the frame's blue).
const isBlue = (c: string): boolean => {
  const p = parseColor(c)
  return !!p && p.b >= 150 && p.r <= 130 && p.g <= 170
}
// VGCRED — a true red.
const isRed = (c: string): boolean => {
  const p = parseColor(c)
  return !!p && p.r >= 170 && p.g <= 120 && p.b <= 120
}

// ---- geometry helpers ------------------------------------------------------
const blueSegs = (segs: Seg[]): Seg[] => segs.filter((s) => isBlue(s.color))
const redSegs = (segs: Seg[]): Seg[] => segs.filter((s) => isRed(s.color))
const bluePts = (segs: Seg[]): Pt[] => blueSegs(segs).flatMap((s) => s.pts)
const redPts = (segs: Seg[]): Pt[] => redSegs(segs).flatMap((s) => s.pts)
const anyPt = (pts: Pt[], within: (p: Pt) => boolean): boolean => pts.some(within)

// Anchor regions (generous margins so the exact ROM offsets do not over-constrain Dev).
const nearLeft = (p: Pt): boolean => p.x < 0.22 * W
const nearRight = (p: Pt): boolean => p.x > 0.78 * W
const bottomBand = (p: Pt): boolean => p.y > 0.75 * H
const aboveBottom = (p: Pt): boolean => p.y < 0.72 * H
const bottomLeft = (p: Pt): boolean => nearLeft(p) && bottomBand(p)
const bottomRight = (p: Pt): boolean => nearRight(p) && bottomBand(p)
const bottomMiddle = (p: Pt): boolean => p.x > 0.32 * W && p.x < 0.68 * W && bottomBand(p)

// ---- fixture ---------------------------------------------------------------
/** A minimal live gameplay frame: nothing draws but the scene skeleton + the overlays,
 *  so the only BLUE anywhere is the cockpit frame. Empty starfield, no enemies/shots/
 *  debris, laser off, no Death-Star boom. */
const playFrame = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(1983),
  mode: 'playing',
  phase: 'space',
  aimX: 0,
  aimY: 0,
  laserOn: false,
  starfield: [],
  enemies: [],
  enemyShots: [],
  destroyedShots: [],
  dyingTies: [],
  groundDebris: [],
  turrets: [],
  trenchObstacles: [],
  exhaustPort: null,
  deathStarDestroyedAt: null,
  coaching: null,
  ...over,
})

const draw = (state: GameState): Seg[] => {
  const { ctx, segs } = makeRecorder()
  render(ctx, state, W, H)
  return segs
}

let scene: Seg[]
beforeEach(() => {
  scene = draw(playFrame())
})

// ---------------------------------------------------------------------------
describe('sw9-1 AC-1 — a persistent screen-space cockpit gun frame is drawn during play', () => {
  it('draws authentic-blue frame strokes near the left edge, the right edge, and the bottom band', () => {
    const pts = bluePts(scene)
    expect(anyPt(pts, nearLeft), 'blue frame stroke near the left edge').toBe(true)
    expect(anyPt(pts, nearRight), 'blue frame stroke near the right edge').toBe(true)
    expect(anyPt(pts, bottomBand), 'blue frame stroke in the bottom band').toBe(true)
  })
})

describe('sw9-1 AC-2 — the five ROM PLAYER\'S GUN SITE pictures at their ROM anchors', () => {
  it('blue strokes land in all five anchor regions (L rail, R rail, bottom-L, bottom-M, bottom-R)', () => {
    const pts = bluePts(scene)
    expect(anyPt(pts, (p) => nearLeft(p) && aboveBottom(p)), 'VGSTTL — left side rail').toBe(true)
    expect(anyPt(pts, (p) => nearRight(p) && aboveBottom(p)), 'VGSTTR — right side rail').toBe(true)
    expect(anyPt(pts, bottomLeft), 'VGSTBL — bottom-left gun').toBe(true)
    expect(anyPt(pts, bottomMiddle), 'VGSTBM — bottom-middle front ship').toBe(true)
    expect(anyPt(pts, bottomRight), 'VGSTBR — bottom-right gun').toBe(true)
  })

  it('is FIVE pictures, not three: a side-rail gun sits above the bottom band on EACH side', () => {
    // Guards against a lazy "three bottom guns" port that drops the two side rails.
    const pts = bluePts(scene)
    const leftRailAbove = anyPt(pts, (p) => nearLeft(p) && aboveBottom(p))
    const rightRailAbove = anyPt(pts, (p) => nearRight(p) && aboveBottom(p))
    expect(leftRailAbove && rightRailAbove, 'both side-rail guns present above the bottom guns').toBe(true)
  })
})

describe('sw9-1 AC-3 — authentic two-tone: VGCBLU shafts + VGCRED collars, not the cyan reticle', () => {
  it('the frame blue is a true DEEP blue (VGCBLU), distinct from the cyan #00e5ff aim reticle', () => {
    // isBlue already excludes cyan (green > 170). Assert we actually captured such strokes,
    // and that none of them are the cyan reticle colour.
    const blues = blueSegs(scene)
    expect(blues.length, 'at least one deep-blue frame stroke').toBeGreaterThan(0)
    expect(blues.every((s) => s.color.toLowerCase() !== '#00e5ff'), 'frame blue is not the cyan reticle glow').toBe(true)
  })

  it('draws red (VGCRED) collar/dish strokes in the bottom band', () => {
    // Space-phase fixture: HUD red labels are TOP-anchored and the Death Star is centred,
    // so red in the bottom band is the frame's collars/dishes.
    expect(anyPt(redPts(scene), bottomBand), 'red frame stroke in the bottom band').toBe(true)
  })
})

describe('sw9-1 AC-4 — static screen-space overlay: fixed geometry, no game logic', () => {
  it('the frame does NOT move with the yoke/aim (unlike the aim reticle)', () => {
    const centred = bluePts(draw(playFrame({ aimX: 0, aimY: 0 })))
    const hardOver = bluePts(draw(playFrame({ aimX: 0.9, aimY: 0.9 })))
    const key = (pts: Pt[]): string =>
      pts
        .map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`)
        .sort()
        .join('|')
    expect(centred.length, 'frame drawn at centred aim').toBeGreaterThan(0)
    expect(key(hardOver), 'blue frame geometry is identical regardless of aim').toBe(key(centred))
  })
})

describe('sw9-1 AC-5 — frames every gameplay view (all three phases)', () => {
  const phases: Phase[] = ['space', 'surface', 'trench']
  for (const phase of phases) {
    it(`draws the blue frame (left rail, right rail, bottom band) in the ${phase} phase`, () => {
      const pts = bluePts(draw(playFrame({ phase })))
      expect(anyPt(pts, nearLeft), `${phase}: blue near left edge`).toBe(true)
      expect(anyPt(pts, nearRight), `${phase}: blue near right edge`).toBe(true)
      expect(anyPt(pts, bottomBand), `${phase}: blue in bottom band`).toBe(true)
    })
  }
})

describe('sw9-1 AC-6 — live-run gated (drawn playing, absent on attract/game-over)', () => {
  it('is drawn during a live playing run', () => {
    expect(bluePts(scene).some(bottomBand), 'frame present while playing').toBe(true)
  })

  // GUARD (passes today; must keep passing): the frame must not bleed onto the framing
  // screens, exactly like drawCrosshair which is gated out of attract/gameover.
  it('is ABSENT on the attract screen', () => {
    const modes: Mode[] = ['attract']
    for (const mode of modes) {
      const pts = bluePts(draw(playFrame({ mode })))
      expect(anyPt(pts, bottomLeft), 'no bottom-left frame gun on attract').toBe(false)
      expect(anyPt(pts, bottomRight), 'no bottom-right frame gun on attract').toBe(false)
    }
  })

  it('is ABSENT on the game-over screen', () => {
    const pts = bluePts(draw(playFrame({ mode: 'gameover' })))
    expect(anyPt(pts, bottomLeft), 'no bottom-left frame gun on gameover').toBe(false)
    expect(anyPt(pts, bottomRight), 'no bottom-right frame gun on gameover').toBe(false)
  })
})

describe('sw9-1 AC-7 — purity boundary preserved (shell-only, no core state)', () => {
  // GUARD (passes today; must keep passing): the frame is a render-only overlay. src/core
  // must gain no canopy / gun-site / cockpit-FRAME symbol. (Bare "cockpit" is allowed —
  // COCKPIT_HIT_RADIUS is the legitimate core collision sphere.)
  const coreFiles = ['state.ts', 'sim.ts', 'input.ts'] as const
  for (const f of coreFiles) {
    it(`src/core/${f} carries no cockpit-frame / canopy / gun-site symbol`, () => {
      const src = readFileSync(fileURLToPath(new URL(`../../src/core/${f}`, import.meta.url)), 'utf8')
      expect(/canopy/i.test(src), `${f} mentions "canopy"`).toBe(false)
      expect(/gun.?site/i.test(src), `${f} mentions "gun site"`).toBe(false)
      expect(/cockpit.?frame/i.test(src), `${f} mentions "cockpit frame"`).toBe(false)
      expect(/\bVGST[TB][RLM]\b/.test(src), `${f} references a gun-site picture symbol`).toBe(false)
    })
  }

  it('render() draws the frame from a vanilla initialState (no new GameState field required)', () => {
    // The fixture only zeroes existing fields; if the frame needed new core state this
    // would draw nothing. AC-1 already asserts it draws — this pins that it needs no field.
    expect(bluePts(draw({ ...initialState(1983), starfield: [] })).some(bottomBand)).toBe(true)
  })
})

describe('sw9-1 AC-8 — provenance grounded in the ROM (a faithful port, not invented art)', () => {
  it('the render source references the authentic PLAYER\'S GUN SITE origin', () => {
    const src = readFileSync(fileURLToPath(new URL('../../src/shell/render.ts', import.meta.url)), 'utf8')
    // Key only on the ACTUAL gun-site picture symbols / exact ROM subtitles — not a loose
    // "player's gun", which already appears in an unrelated beamOrigin comment (render.ts:357).
    const grounded =
      /\bVGST[TB][RLM]\b/.test(src) ||
      /PLAYER'?S\s+GUN\s+SITE|PLAYER'?S\s+SIDE\s+GUN|PLAYER'?S\s+FRONT\s+SHIP/i.test(src)
    expect(grounded, 'render.ts cites a WSVROM PLAYER\'S GUN SITE symbol/name').toBe(true)
  })
})
