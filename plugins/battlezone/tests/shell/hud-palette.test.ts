// tests/shell/hud-palette.test.ts
//
// Story bz1-12 — the bichromatic framing pass, as observable render behaviour:
// the wireframe WORLD stays green, but the SCORE / HUD text is painted RED — the
// cabinet's dual-colour overlay (a green-tinted horizon band + a red score strip
// over the green vector CRT).
//
// SH2-6 REPOINT: the bichromatic contract SURVIVES the font migration, but its
// observation seam moves. Pre-migration the HUD text was FILLED (ctx.fillText, so
// the colour was read at fillStyle); post-migration every glyph is STROKED like
// the wireframes (layoutText -> stroked geometry), so the score/alert colour is
// now the strokeStyle in effect at each stroke(). The requirement is unchanged —
// drawScore/drawMessage paint RED-dominant, drawSegments/drawRadar paint
// GREEN-dominant — only WHERE the colour is read moved from fills -> strokes.
// (bz2-2's font-family assertions retired with the TTF; see font-migration.test.ts.)
//
// The epic's "render is verified by running the game" still holds for pixel-exact
// placement; this pins only the colour split, which is cheap and deterministic.
import { describe, it, expect } from 'vitest'
import { drawScore, drawSegments, drawRadar, drawMessage, GLOW_GREEN } from '../../src/shell/render'
import type { SceneSegment } from '../../src/core/scene'

/** Parse #rgb / #rrggbb into channels. Returns null for non-hex colours (the
 *  render layer uses hex throughout — a non-hex value is itself a red flag). */
function hexToRgb(color: string): { r: number; g: number; b: number } | null {
  const m3 = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(color)
  if (m3) {
    return {
      r: parseInt(m3[1] + m3[1], 16),
      g: parseInt(m3[2] + m3[2], 16),
      b: parseInt(m3[3] + m3[3], 16),
    }
  }
  const m6 = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(color)
  if (m6) {
    return { r: parseInt(m6[1], 16), g: parseInt(m6[2], 16), b: parseInt(m6[3], 16) }
  }
  return null
}

const isRedDominant = (c: string): boolean => {
  const rgb = hexToRgb(c)
  return rgb !== null && rgb.r > rgb.g && rgb.r > rgb.b
}

const isGreenDominant = (c: string): boolean => {
  const rgb = hexToRgb(c)
  return rgb !== null && rgb.g > rgb.r && rgb.g > rgb.b
}

/** A recording 2D-context stub: captures the stroke colour at each stroke/
 *  strokeText and the fill colour at each fill/fillText, so we can assert what
 *  got painted. A Proxy no-ops any other member so a real stroke routine (which
 *  may touch save/measureText/gradients) runs end-to-end without throwing. */
function recordingCtx() {
  const fills: string[] = []
  const strokes: string[] = []
  const rec = {
    fillStyle: '#000000',
    strokeStyle: '#000000',
    canvas: { width: 800, height: 600 },
  }
  const target = rec as unknown as Record<string | symbol, unknown>
  const proxy = new Proxy(target, {
    get(t, prop) {
      if (prop === 'stroke' || prop === 'strokeText') return () => { strokes.push(String(rec.strokeStyle)) }
      if (prop === 'fill' || prop === 'fillText') return () => { fills.push(String(rec.fillStyle)) }
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
  return { ctx: proxy as unknown as CanvasRenderingContext2D, fills, strokes }
}

const W = 800
const H = 600

describe('bz1-12 — the score / HUD text is painted red (bichromatic overlay)', () => {
  it('drawScore, at its default, strokes the score value in a red-dominant colour', () => {
    const { ctx, strokes } = recordingCtx()
    drawScore(ctx, 12_345, W, H)
    expect(strokes.length, 'drawScore stroked no text').toBeGreaterThan(0)
    for (const c of strokes) {
      expect(isRedDominant(c), `score stroked "${c}" — expected red-dominant`).toBe(true)
    }
  })

  it('drawMessage (the in-game ROM alert) also strokes red-dominant by default', () => {
    // The AC says "red score/HUD text", not just the score — drawMessage defaults
    // to HUD_RED too; reverting it to green would otherwise go uncaught.
    const { ctx, strokes } = recordingCtx()
    drawMessage(ctx, 'ENEMY IN RANGE', W, H)
    expect(strokes.length, 'drawMessage stroked no text').toBeGreaterThan(0)
    for (const c of strokes) {
      expect(isRedDominant(c), `alert stroked "${c}" — expected red-dominant`).toBe(true)
    }
  })

  it('an explicit colour argument overrides the red default (param is honoured)', () => {
    // Proves red is a DEFAULT, not hard-coded — passing GLOW_GREEN strokes green.
    const { ctx, strokes } = recordingCtx()
    drawScore(ctx, 1000, W, H, GLOW_GREEN)
    expect(strokes.length).toBeGreaterThan(0)
    for (const c of strokes) expect(c).toBe(GLOW_GREEN)
  })
})

describe('bz1-12 — the wireframe world stays green (only the score reddened)', () => {
  const segs: readonly SceneSegment[] = [
    { x1: -0.5, y1: -0.5, x2: 0.5, y2: 0.5 },
    { x1: 0.2, y1: -0.3, x2: -0.1, y2: 0.4 },
  ]

  it('drawSegments, at its default, strokes the world green-dominant', () => {
    const { ctx, strokes } = recordingCtx()
    drawSegments(ctx, segs, W, H)
    expect(strokes.length, 'drawSegments stroked nothing').toBeGreaterThan(0)
    for (const c of strokes) {
      expect(isGreenDominant(c), `world stroked "${c}" — expected green-dominant`).toBe(true)
    }
  })

  // bz5-5 SUPERSEDES the old bz1-12 "radar stays green" pin. The radar sits in
  // MAME bzone.lay's top red band (0..0.2, multiply), so authentically it reads
  // RED — as the real cabinet shows (reference footage). The green-radar choice
  // was bz5-2's documented deviation; bz5-5 retires it. The WORLD below the split
  // stays green (the test above still pins that).
  it('the radar scope chrome is RED (it lives in the top red band — bz5-5)', () => {
    const { ctx, strokes, fills } = recordingCtx()
    drawRadar(ctx, [{ bearing: 0.3, range: 8000 }], 0.5, W, H)
    expect(strokes.length + fills.length, 'drawRadar painted nothing').toBeGreaterThan(0)
    for (const c of [...strokes, ...fills]) {
      expect(isRedDominant(c), `radar painted "${c}" — expected red-dominant`).toBe(true)
    }
  })
})
