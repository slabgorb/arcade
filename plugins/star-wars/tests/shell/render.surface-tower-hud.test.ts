// tests/shell/render.surface-tower-hud.test.ts
//
// Story sw8-5 (RED phase, TEA / Han Solo) — the surface gameplay HUD the clone has
// the data for but never draws: the TOWERS-remaining counter and the escalating
// "XXXXX POINTS NEXT TOWER" readout (the `towerCount`/`phaseKills` helpers exist,
// nothing renders them).
//
// The 1983 cabinet's VWMTWR (WSMAIN.MAC:3481-3535) draws, on the Death Star surface
// WHILE towers remain (`LDA GD.TWL / IFNE` — "?MORE TOWERS TO HIT?", under
// `LDA GD.WAV / IFGT` "lowest wave gets no messages ( no towers )"):
//   * "XXXXX POINTS NEXT TOWER"  (MS.NXT, TCMES.MAC:606) — XXXXX = TWRMULT, the worth
//     of the NEXT tower = (towers killed so far + 1) * 200  (see
//     tests/core/surface-tower-escalation.test.ts for the scoring law).
//   * a "TOWERS" counter (MS.TWR, VWMTWZ) showing GD.TWL, the towers left =
//     towersForWave(wave) - phaseKills.
//
// We assert the STRINGS handed to `layoutText` (the SH2-5 seam convention), never
// glyph geometry — exactly like render.reward-banners.test.ts. The fixture's
// score/wave/lives are chosen ("0"/"3"/"9") so their HUD digits can never collide
// with the readout's digits (200/400/16/15), so a plain substring check isolates the
// readout. `render()` draws no such readout today, so its strings are absent -> RED.
//
// NOTE — the cabinet BLINKS the readout, alternating it with "50,000 FOR SHOOTING ALL
// TOWERS" on `FRAMEL & 0x30`. That teaser text already renders as a POST-award banner
// (render.ts drawTrenchBanners, keyed on towerBonusAwardedAt), a different trigger; the
// blink cadence is routed to a Delivery Finding, not pinned here, so these tests stay
// seam-agnostic about whether Dev draws the readout every frame or on a blink.

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '../../src/shell/render'
import { initialState, towersForWave, type GameState } from '../../src/core/state'

// Record every string handed to layoutText; return trivial-but-valid geometry so
// render strokes without NaN and without the shared font package resolving.
const font = vi.hoisted(() => {
  const calls: { text: string }[] = []
  return {
    calls,
    layoutText(text: string, opts?: { letterSpacing?: number }) {
      calls.push({ text })
      const n = [...text].length
      const sp = opts?.letterSpacing ?? 0
      return { strokes: [{ points: [{ x: 0, y: 0 }, { x: 16, y: 0 }] }], width: 16 * n + sp * n }
    },
  }
})

vi.mock('../../src/shell/font', () => ({
  layoutText: font.layoutText,
  CELL_W: 16,
  CELL_H: 24,
  hasGlyph: () => true,
  charGlyph: () => ({ strokes: [], advance: 24 }),
  GLYPH_CHARS: ' 0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ-_,/',
}))

const W = 800
const H = 600

/** Proxy ctx: every method no-ops, every property settable; measureText width 0. */
function makeCtx(): CanvasRenderingContext2D {
  const target: Record<string | symbol, unknown> = { canvas: { width: W, height: H } }
  return new Proxy(target, {
    get(t, prop) {
      if (prop === 'measureText') return () => ({ width: 0 })
      if (prop in t) return t[prop]
      return () => {}
    },
    set(t, prop, value) {
      t[prop] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

const texts = () => font.calls.map((c) => c.text)
const drawsReadout = () => texts().some((t) => t.includes('POINTS NEXT TOWER'))
/** All laid-out text joined with a non-digit separator, for substring value checks. */
const joined = () => texts().join('|')

const draw = (state: GameState): void => {
  font.calls.length = 0
  render(makeCtx(), state, W, H)
}

/** A mid-surface gameplay frame. score=0 / wave=3 / lives=9 keep the existing HUD
 *  digits ("0","3","9") clear of the readout's (200/400/16/15); towerBonusAwardedAt=null
 *  keeps the post-clear "50,000 FOR SHOOTING ALL TOWERS" banner (which also holds
 *  "TOWERS") off-screen so the counter label is unambiguous. */
const surfaceFrame = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(1983),
  mode: 'playing',
  phase: 'surface',
  wave: 3, // SQUARE — 16 towers
  score: 0,
  lives: 9,
  bonusFlash: 0,
  turrets: [],
  towerBonusAwardedAt: null,
  t: 1,
  ...over,
})

beforeEach(() => {
  font.calls.length = 0
})

describe('sw8-5 — surface HUD draws the "POINTS NEXT TOWER" readout', () => {
  it('a surface frame with towers remaining draws the "POINTS NEXT TOWER" label (MS.NXT)', () => {
    draw(surfaceFrame({ phaseKills: 0 }))
    expect(drawsReadout()).toBe(true)
  })

  it('the readout shows the ESCALATING next-tower worth: 200 at the start, 400 after one kill', () => {
    draw(surfaceFrame({ phaseKills: 0 }))
    expect(joined()).toContain('200') // (0 + 1) * 200
    expect(joined()).not.toContain('400')

    draw(surfaceFrame({ phaseKills: 1 }))
    expect(joined()).toContain('400') // (1 + 1) * 200
  })
})

describe('sw8-5 — surface HUD draws the TOWERS-remaining counter', () => {
  it('shows a "TOWERS" counter = towersForWave - phaseKills (16, then 15 after a kill)', () => {
    draw(surfaceFrame({ phaseKills: 0 }))
    expect(texts().some((t) => t.includes('TOWERS'))).toBe(true) // the MS.TWR label
    expect(joined()).toContain(String(towersForWave(3))) // 16 remaining

    draw(surfaceFrame({ phaseKills: 1 }))
    expect(joined()).toContain('15') // one tower down
  })
})

describe('sw8-5 — the readout is gated on there being towers to hit', () => {
  it('a bunkers-only wave (wave 2, 0 towers) shows NO "POINTS NEXT TOWER" readout', () => {
    draw(surfaceFrame({ wave: 2, phaseKills: 0 })) // BUNK — towerCount 0
    expect(drawsReadout()).toBe(false)
  })

  it('once every tower is cleared (phaseKills == quota) the readout is gone', () => {
    draw(surfaceFrame({ phaseKills: towersForWave(3) })) // 16 / 16 down
    expect(drawsReadout()).toBe(false)
  })

  it('the readout is a SURFACE element — a space-phase gameplay frame does not draw it', () => {
    draw(surfaceFrame({ phase: 'space', phaseKills: 0 }))
    expect(drawsReadout()).toBe(false)
  })
})

describe('sw8-5 — the HUD figure and the banked points obey the SAME law (no on-screen lie)', () => {
  it('the readout reads 800 at phaseKills 3 — exactly what killing the 4th tower scores', () => {
    // The SCORE side (killing the 4th tower banks 800 = (3 + 1) * 200) is pinned in
    // tests/core/surface-tower-escalation.test.ts. Both files pin the identical law, so a
    // drift between what the HUD shows and what the sim banks reddens one of the two.
    draw(surfaceFrame({ phaseKills: 3 }))
    expect(joined()).toContain('800')
  })
})
