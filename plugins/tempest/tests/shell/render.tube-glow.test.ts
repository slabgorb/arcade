// tests/shell/render.tube-glow.test.ts
//
// Tube glow contract — REWRITTEN by story tp1-40 (THE GLOW TAX), superseding
// the SH2-9 suite that lived here.
//
// SH2-9's real point was "migrate the glow WITHOUT flattening the tube": the
// far->near spoke gradients, the dim far ring vs bright near rim, the halo. That
// intent survives intact below. What tp1-40 REMOVES is SH2-9's pinned MECHANISM
// — the @shared/glow envelope and its live shadow-blur ramp (6/8/18) —
// because the Architect's investigation proved live shadow blur is a
// per-primitive GPU Gaussian pass and the single cause of production's 8-34 fps
// (session tp1-40; A/B with blur no-op'd runs a locked 60). The blur RADII stay
// meaningful as inputs (glowStrokePasses(blur, …) scales the halo reach from
// them); they are simply no longer canvas shadow state. This supersession is
// logged as a Design Deviation in the tp1-40 session file.
//
// House pattern preserved from the original suite: WIRING via `?raw` source,
// DEPTH via a recording ctx driving the real drawTube() (DOM-free, node-safe).
//
// All behavioral tests fail today (drawTube still blurs, has no layered
// passes, draws its dots with live blur). Valid RED.

import { describe, it, expect } from 'vitest'
import renderSrc from '../../src/shell/render.ts?raw'
import { drawTube } from '../../src/shell/render'
import { makeCircleTube } from '../../src/core/geometry'
import type { GameState } from '../../src/core/state'
import { sharedGlowImports } from '../helpers/shared-glow-imports'

// ── A minimal recording CanvasRenderingContext2D ────────────────────────────
// Captures every shadowBlur assignment, a snapshot of stroke state (style,
// width, alpha) at each stroke(), gradient creations, and dot draws (fill /
// drawImage) so the blit path is observable whichever mechanism serves it.

interface GradStub {
  readonly _grad: true
  readonly stops: Array<readonly [number, string]>
  addColorStop(offset: number, color: string): void
}

interface StrokeSnap {
  readonly strokeStyle: unknown
  readonly lineWidth: number
  readonly globalAlpha: number
  readonly shadowBlur: number
}

interface RecCtx {
  readonly ctx: CanvasRenderingContext2D
  readonly blurTimeline: number[]
  readonly strokes: StrokeSnap[]
  readonly gradients: GradStub[]
  readonly dots: { fills: number; drawImages: number }
}

function isGrad(v: unknown): v is GradStub {
  return typeof v === 'object' && v !== null && (v as { _grad?: unknown })._grad === true
}

function makeRecCtx(): RecCtx {
  const blurTimeline: number[] = []
  const strokes: StrokeSnap[] = []
  const gradients: GradStub[] = []
  const dots = { fills: 0, drawImages: 0 }
  let shadowBlur = 0

  const rec: Record<string, unknown> = {
    strokeStyle: '',
    fillStyle: '',
    shadowColor: '',
    lineWidth: 1,
    globalAlpha: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    createLinearGradient(): GradStub {
      const stops: Array<readonly [number, string]> = []
      const g: GradStub = {
        _grad: true,
        stops,
        addColorStop(offset: number, color: string): void {
          stops.push([offset, color])
        },
      }
      gradients.push(g)
      return g
    },
    beginPath(): void {},
    moveTo(): void {},
    lineTo(): void {},
    closePath(): void {},
    arc(): void {},
    fill(): void {
      dots.fills += 1
    },
    drawImage(): void {
      dots.drawImages += 1
    },
    save(): void {},
    restore(): void {},
    translate(): void {},
    rotate(): void {},
    scale(): void {},
    fillRect(): void {},
    setTransform(): void {},
    stroke(): void {
      strokes.push({
        strokeStyle: rec.strokeStyle,
        lineWidth: rec.lineWidth as number,
        globalAlpha: rec.globalAlpha as number,
        shadowBlur,
      })
    },
  }
  Object.defineProperty(rec, 'shadowBlur', {
    get(): number {
      return shadowBlur
    },
    set(v: number): void {
      shadowBlur = v
      blurTimeline.push(v)
    },
  })

  return { ctx: rec as unknown as CanvasRenderingContext2D, blurTimeline, strokes, gradients, dots }
}

// The tube identity drawTube must preserve — the CORE (crisp) stroke of each
// element. The halo around each is layered passes now; its exact widths/alphas
// are Dev-tuned, so the tests pin structure (wider + dimmer) not values.
const SPOKE_CORE_WIDTH = 2
const FAR_RING_CORE_WIDTH = 1.5
const NEAR_RING_CORE_WIDTH = 3.5
const GRADIENT_FAR_STOP = 'rgba(255,255,255,0.04)' // dim white at the far rim
const FAR_RING_STROKE = 'rgba(150,190,255,0.28)' // dim blue far ring
const LEVEL_COLOR = '#abcdef' // sentinel level colour passed into drawTube

function drawTestTube(): RecCtx {
  const rec = makeRecCtx()
  // A closed 4-lane circle tube: far.length === near.length === laneCount === 4.
  const tube = makeCircleTube(4, { x: 0, y: 0 }, 20, 200)
  const s = { tube } as unknown as GameState
  drawTube(rec.ctx, s, LEVEL_COLOR, 0)
  return rec
}

// ── Wiring: the glow tax is gone from the tube (tp1-40 AC-1/AC-3) ────────────

describe('drawTube wiring — tempest-local layered glow, no shared blur envelope', () => {
  // By MODULE IDENTITY, not by spelling: this was
  // `not.toMatch(/from ['"]@shared\/glow['"]/)`, which could only ever be written
  // one way while `@arcade/shared/glow` was an npm package. src/shared/glow.ts is
  // in-tree since the monorepo migration, so `../../../../src/shared/glow` reaches
  // the same module past that regex. See tests/helpers/shared-glow-imports.ts.
  it('no longer imports src/shared/glow, by any specifier (its contract IS live blur)', () => {
    expect(sharedGlowImports('src/shell/render.ts', renderSrc)).toEqual([])
  })

  it('imports the tempest-local glow helper instead', () => {
    expect(renderSrc).toMatch(/from\s*['"]\.\/glow['"]/)
  })

  // POSITIVE CONTROL for the assertion above, which expects an empty array and
  // would therefore stay green if the checker went blind — the exact failure the
  // migration caused. Both spellings must be caught; `./glow` must not be.
  it('the check bites on both spellings of the shared module and on neither local one', () => {
    const from = 'src/shell/render.ts'
    expect(sharedGlowImports(from, "import { glowEnvelope } from '@shared/glow'")).toEqual(['@shared/glow'])
    expect(sharedGlowImports(from, "import { glowEnvelope } from '../../../../src/shared/glow'")).toEqual([
      '../../../../src/shared/glow',
    ])
    expect(sharedGlowImports(from, "import { glowStrokePasses } from './glow'")).toEqual([])
  })
})

// ── The tax itself: zero live blur while the tube draws (tp1-40 AC-1) ────────

describe('drawTube pays no glow tax — no live shadow blur at any stroke', () => {
  it('never strokes with a non-zero shadowBlur', () => {
    const rec = drawTestTube()
    const blurred = rec.strokes.filter((s) => s.shadowBlur !== 0)
    expect(
      blurred.length,
      'every blurred stroke is a per-primitive GPU Gaussian pass — the lag',
    ).toBe(0)
  })

  it('never even assigns a non-zero shadowBlur (resets to 0 are fine)', () => {
    const rec = drawTestTube()
    expect(rec.blurTimeline.filter((v) => v !== 0)).toEqual([])
  })
})

// ── Depth preserved: SH2-9's guarantee, carried forward (tp1-40 AC-3) ────────

describe('drawTube depth preserved — far->near gradient + element identity', () => {
  it('strokes every spoke with a far->near CanvasGradient (no flattening)', () => {
    const rec = drawTestTube()
    const spokeGrads = new Set(rec.strokes.map((s) => s.strokeStyle).filter(isGrad))
    expect(spokeGrads.size).toBe(4)
  })

  it('creates ONE gradient per spoke, reused across its passes (no per-pass churn)', () => {
    // This is a perf story: a layered spoke that mints a fresh gradient for
    // every halo pass would triple the per-frame gradient churn it came to fix.
    const rec = drawTestTube()
    const depthGradients = rec.gradients.filter(
      (g) =>
        g.stops.length === 2 &&
        g.stops[0][0] === 0 &&
        g.stops[0][1] === GRADIENT_FAR_STOP &&
        g.stops[1][0] === 1 &&
        g.stops[1][1] === LEVEL_COLOR,
    )
    expect(depthGradients.length).toBe(4)
  })

  it('keeps each spoke\'s crisp core: gradient stroke at width 2, full alpha', () => {
    const rec = drawTestTube()
    const cores = rec.strokes.filter(
      (s) => isGrad(s.strokeStyle) && s.lineWidth === SPOKE_CORE_WIDTH && s.globalAlpha === 1,
    )
    expect(cores.length).toBe(4)
  })

  it('keeps the far ring core: dim-blue stroke at width 1.5', () => {
    const rec = drawTestTube()
    expect(
      rec.strokes.some(
        (s) => s.strokeStyle === FAR_RING_STROKE && s.lineWidth === FAR_RING_CORE_WIDTH,
      ),
      'the dim far ring must survive — losing it flattens the tube',
    ).toBe(true)
  })

  it('keeps the near ring core: level-colour stroke at width 3.5, full alpha', () => {
    const rec = drawTestTube()
    expect(
      rec.strokes.some(
        (s) =>
          s.strokeStyle === LEVEL_COLOR &&
          s.lineWidth === NEAR_RING_CORE_WIDTH &&
          s.globalAlpha === 1,
      ),
      'the bright near rim must survive at its width',
    ).toBe(true)
  })

  it('draws NO halo: every tube stroke is a full-alpha core, none widened', () => {
    // Inverted from tp1-40's "layers a halo" contract when the owner removed the
    // glow (2026-08-02). Same observation, opposite expectation: the tube is
    // drawn crisp. A halo pass is recognisable as a dimmed, widened stroke, and
    // there must not be one — this is the door a re-introduced bloom comes back
    // through, so it is asserted rather than merely no longer checked.
    const rec = drawTestTube()
    const halos = rec.strokes.filter((s) => s.globalAlpha < 1 && s.lineWidth > SPOKE_CORE_WIDTH)
    expect(halos, 'a de-glowed tube must draw no wide low-alpha halo passes').toEqual([])
    // The near rim is where the old bloom was brightest (blur 18) — pin it by name.
    expect(
      rec.strokes.some((s) => s.lineWidth > NEAR_RING_CORE_WIDTH && s.globalAlpha < 1),
    ).toBe(false)
    // Not vacuous: the tube really did stroke, and every stroke it made is a core
    // at one of the three element widths. (A no-op renderer would pass the two
    // assertions above; it cannot pass this one.)
    expect(rec.strokes.length).toBeGreaterThanOrEqual(6)
    for (const s of rec.strokes) {
      expect(s.globalAlpha).toBe(1)
      expect([SPOKE_CORE_WIDTH, FAR_RING_CORE_WIDTH, NEAR_RING_CORE_WIDTH]).toContain(s.lineWidth)
    }
  })

  it('still draws the rim dots + vanishing point, all blur-free (tp1-40 AC-2)', () => {
    const rec = drawTestTube()
    // 4 rim vertex sparks + the closed-tube vanishing-point dot: ≥5 dot draws.
    // Since the de-glow these are plain fills (the sprite blit is gone); the
    // drawImage term is kept so this stays a count of DOTS, however drawn.
    expect(rec.dots.fills + rec.dots.drawImages).toBeGreaterThanOrEqual(5)
  })
})
