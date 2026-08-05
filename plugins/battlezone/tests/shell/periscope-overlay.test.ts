// tests/shell/periscope-overlay.test.ts
//
// Story bz5-2 (epic bz5) — RED phase (Leeloo / TEA). Two halves of one overlay:
//
//   (A) DESIGN — a skeuomorphic *periscope* bezel that frames the play area. The
//       cabinet's viewport is seen through a periscope mask; the clone renders
//       edge-to-edge with no framing. This is cabinet artwork (NOT in the ROM or
//       MAME), so placement is eyeball/reference-driven and pixel-exact layout is
//       verified by running the game — the epic's standing convention. What IS
//       cheaply pinnable, and what AC1 demands, is the LAYERING and the fact that
//       the mask keeps a central aperture: it is drawn over the world and UNDER
//       the score/radar HUD (same slot as drawCrackedGlass), and it must not
//       obscure the gunsight or a target at screen centre (GUNSIGHT_NDC = [0,0]).
//
//   (B) FIDELITY — the red/green colour split pinned to MAME's authoritative
//       geometry. layout/bzone.lay places the physical colour overlay as RED from
//       the top down to 0.2, GREEN from 0.2 to 1.0 (multiply blend). That 0.2
//       boundary is a MAME constant — not readable from this tree, it lives in
//       MAME's layout file — so we pin it as an exported number and assert the
//       band sits at the top (red is the score/radar strip, green is the field
//       below). Any DELIBERATE deviation from 0.2 is documented in the findings
//       doc; absent a deviation the boundary is exactly 0.2.
//
// RED drivers: drawPeriscope and MAME_COLOR_SPLIT do not exist yet. The wiring
// and shell-only guards are green-on-arrival regression guards (they redden if a
// later edit drops the layer order or leaks the overlay into core).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  drawPeriscope,
  MAME_COLOR_SPLIT,
  HUD_RED,
  GLOW_GREEN,
} from '../../src/shell/render'

const mainSrc = readFileSync(new URL('../../src/main.ts', import.meta.url), 'utf8')

/** #rgb / #rrggbb → channels; null for non-hex (a non-hex HUD colour is itself
 *  a red flag). Mirrors hud-palette.test.ts. */
function hexToRgb(color: string): { r: number; g: number; b: number } | null {
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color)
  if (m3) {
    return { r: parseInt(m3[1] + m3[1], 16), g: parseInt(m3[2] + m3[2], 16), b: parseInt(m3[3] + m3[3], 16) }
  }
  const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (m6) return { r: parseInt(m6[1], 16), g: parseInt(m6[2], 16), b: parseInt(m6[3], 16) }
  return null
}
const isRedDominant = (c: string) => {
  const rgb = hexToRgb(c)
  return rgb !== null && rgb.r > rgb.g && rgb.r > rgb.b
}
const isGreenDominant = (c: string) => {
  const rgb = hexToRgb(c)
  return rgb !== null && rgb.g > rgb.r && rgb.g > rgb.b
}

/** Alpha of an `rgba(r,g,b,a)` string; 1 for any solid colour; 1 for shapes we
 *  cannot parse (treated as opaque, the conservative default for "obscures"). */
function alphaOf(style: unknown): number {
  if (typeof style !== 'string') return 0 // a gradient/pattern object → aperture, not a solid cover
  const m = /rgba?\([^)]*,\s*([0-9]*\.?[0-9]+)\s*\)/i.exec(style)
  return m ? parseFloat(m[1]) : 1
}

type Rect = { x: number; y: number; w: number; h: number; alpha: number }

/** A recording 2D-context stub that captures the rectangles a routine paints
 *  (fillRect) and re-opens (clearRect), plus the fill/stroke colours. Any other
 *  member no-ops so a real render routine runs end-to-end. */
function recordingCtx(width = 800, height = 600) {
  const fills: Rect[] = []
  const clears: Rect[] = []
  const strokes: string[] = []
  const rec = { fillStyle: '#000000', strokeStyle: '#000000', canvas: { width, height } }
  const target = rec as unknown as Record<string | symbol, unknown>
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop === 'fillRect') {
        return (x: number, y: number, w: number, h: number) =>
          fills.push({ x, y, w, h, alpha: alphaOf(rec.fillStyle) })
      }
      if (prop === 'clearRect') {
        return (x: number, y: number, w: number, h: number) => clears.push({ x, y, w, h, alpha: 0 })
      }
      if (prop === 'stroke' || prop === 'strokeText') return () => strokes.push(String(rec.strokeStyle))
      if (prop === 'createLinearGradient') return () => ({ addColorStop() {} })
      if (prop === 'createRadialGradient') return () => ({ addColorStop() {} })
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop in t) return t[prop]
      return () => {}
    },
    set(t, prop, value) {
      t[prop] = value
      return true
    },
  })
  return { ctx: proxy as unknown as CanvasRenderingContext2D, fills, clears, strokes, width, height }
}

const covers = (r: Rect, px: number, py: number) =>
  px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h

const W = 800
const H = 600

describe('bz5-2 (A) — the periscope bezel is a shell overlay that keeps a central aperture', () => {
  it('drawPeriscope is exported from the render layer', () => {
    expect(typeof drawPeriscope, 'drawPeriscope must be an exported render function').toBe('function')
  })

  it('does not obscure the viewport centre — the gunsight/target stays visible', () => {
    // AC1: "does not obscure the gunsight or a target at screen center." The mask
    // may darken the frame with border rects or a transparent-centre vignette
    // (gradient fillStyle → alpha 0 here), but no OPAQUE solid fill may cover the
    // centre unless a later clearRect re-opens it. GUNSIGHT_NDC = [0,0] → (W/2,H/2).
    const { ctx, fills, clears } = recordingCtx(W, H)
    drawPeriscope(ctx, W, H)
    const cx = W / 2
    const cy = H / 2
    const obscured = fills.some((r) => r.alpha > 0 && covers(r, cx, cy))
    const reopened = clears.some((r) => covers(r, cx, cy))
    expect(obscured && !reopened, 'the periscope mask painted an opaque fill over screen centre').toBe(false)
  })

  it('paints SOMETHING — an empty overlay is not a bezel', () => {
    // Guards against a vacuous no-op implementation passing the aperture test.
    const { ctx, fills, strokes } = recordingCtx(W, H)
    drawPeriscope(ctx, W, H)
    expect(fills.length + strokes.length, 'drawPeriscope drew nothing at all').toBeGreaterThan(0)
  })
})

describe('bz5-2 (A) — layering: over the world, under the score/radar HUD', () => {
  it('main.ts draws the periscope after the world and before the HUD', () => {
    // Same slot as drawCrackedGlass: after drawSegments (the world), before
    // drawRadar/drawScore (the HUD), so the score and radar stay legible on top.
    const peri = mainSrc.indexOf('drawPeriscope(')
    const firstWorld = mainSrc.indexOf('drawSegments(')
    const radar = mainSrc.indexOf('drawRadar(')
    const score = mainSrc.indexOf('drawScore(')
    expect(peri, 'main.ts never calls drawPeriscope').toBeGreaterThan(-1)
    expect(peri, 'periscope must be drawn AFTER the world (drawSegments)').toBeGreaterThan(firstWorld)
    expect(peri, 'periscope must be drawn BEFORE the radar HUD').toBeLessThan(radar)
    expect(peri, 'periscope must be drawn BEFORE the score HUD').toBeLessThan(score)
  })
})

describe('bz5-2 (B) — the red/green split is pinned to MAME bzone.lay geometry', () => {
  it('MAME_COLOR_SPLIT is the authoritative 0.2 boundary (red top..0.2, green 0.2..1.0)', () => {
    // layout/bzone.lay: RED 0..0.2, GREEN 0.2..1.0, multiply. Absent a documented
    // deviation the boundary is exactly 0.2. (A deviation must both retune this
    // pin AND be recorded in docs/battlezone-1980-source-findings.md — AC2.)
    expect(MAME_COLOR_SPLIT).toBe(0.2)
  })

  it('the split places RED as a top band and GREEN below it', () => {
    // 0 < split < 0.5 → red is the top strip (score/radar), not the majority; and
    // the two HUD colours carry the right dominance so "red band / green field"
    // is meaningful, not just a bare number.
    expect(MAME_COLOR_SPLIT, 'red must be a top band, not the majority of the screen').toBeGreaterThan(0)
    expect(MAME_COLOR_SPLIT).toBeLessThan(0.5)
    expect(isRedDominant(HUD_RED), 'the band colour HUD_RED must be red-dominant').toBe(true)
    expect(isGreenDominant(GLOW_GREEN), 'the field colour GLOW_GREEN must be green-dominant').toBe(true)
  })
})

describe('bz5-2 (C) — the overlay is shell-only (core purity, AC3)', () => {
  it('no core/ source references the periscope overlay or the split constant', () => {
    // AC3: shell-only presentation, no core/sim change. The new symbols must not
    // leak into core — the core-purity sweep (tests/core/core-purity-sweep.test.ts)
    // stays green because the whole feature lives in src/shell.
    const coreDir = new URL('../../src/core/', import.meta.url)
    const { readdirSync } = require('node:fs') as typeof import('node:fs')
    const files = readdirSync(coreDir).filter((f: string) => f.endsWith('.ts'))
    for (const f of files) {
      const src = readFileSync(new URL(f, coreDir), 'utf8')
      expect(src, `core/${f} must not reference the shell periscope overlay`).not.toMatch(
        /drawPeriscope|MAME_COLOR_SPLIT|periscope/i,
      )
    }
  })
})
