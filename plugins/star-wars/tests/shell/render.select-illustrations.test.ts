// tests/shell/render.select-illustrations.test.ts
//
// pt1-11 RED (shell) — the SELECT-A-DEATH-STAR screen shows no death-star
// illustrations for its tiers (playtest 2026-08-19: "the difficulty setting
// should show death stars illustrating the difficulty tiers but doesn't").
//
// PROVENANCE: the ROM's PHESDS (SELECT A DEATH STAR, WSMAIN.MAC:1039-1145) draws,
// per choice, VJBMIN — the miniature BASE picture (WSVROM.MAC:2658 BMIN:) — at the
// three TDTH sites. Our clone already owns the geometry: models.ts DEATH_STAR /
// DEATH_STAR_TRENCH / DEATH_STAR_DISH (M-010, sw7-15) stroked by render.ts's
// drawDeathStar in the authentic VGCGRN/VGCWHT/VGCRED palette. The fix draws three
// small death-star billboards at the choice positions; today drawSelect
// (render.ts:1692-1704) draws only the cyan text labels and NO wireframes.
//
// SEAM-AGNOSTIC (M-010 convention, sw3-9): we drive the PUBLIC render() on a
// select frame and read the STROKES it paints by colour family — any
// representation of the authentic green-body/red-dish picture passes; text-only
// fails. HOW Dev seats the billboards is theirs to choose.
//
// ISOLATION: the picker overlay (drawSelect) is PHASE-INDEPENDENT — it draws the
// same three tier illustrations regardless of the 3D scene behind it. We render in
// the SURFACE phase and empty the ground objects, which zeroes the background's
// contribution to BOTH families the assertions read:
//   * GREEN — the only green scene element is the TIE fighter, gated to the space
//     phase; the surface grid itself is steel (#5a6b8c). So SURFACE phase alone
//     guarantees no background green.
//   * RED — surface bunkers and ground-debris draw red; emptying `turrets`/
//     `groundDebris` removes those, so no background red.
// That leaves the picker's own VGCGRN/VGCWHT/VGCRED palette as the ONLY green/red in
// the frame, so each assertion bites cleanly: zero such strokes today (drawSelect
// paints only the cyan text labels), three separated death stars once the
// illustrations land. (A SPACE-phase frame would draw the lone approaching death
// star behind the picker, whose wide green body bridges the three billboards into
// one cluster — a confound we sidestep rather than fight.)

import { describe, it, expect } from 'vitest'
import { render } from '../../src/shell/render'
import { initialState, type GameState } from '../../src/core/state'
import { makeRecorder, colorFamily, type Stroke } from '../support/canvas-recorder'
import type { HighScoreTable } from '@shared/highscore'

const W = 800
const H = 600
const NO_SCORES: HighScoreTable<'wave'> = []

/** A quiet select-mode frame: the picker up, no live hover, over a surface-phase
 *  background (no green — TIEs are space-only, the grid is steel) with turrets and
 *  debris emptied (removing the only background red). The overlay draws identically
 *  in any phase. See the ISOLATION note at the top of the file. */
const selectFrame = (): GameState => ({
  ...initialState(1983),
  mode: 'select',
  phase: 'surface',
  select: { countdown: 10, hover: null },
  enemies: [],
  dyingTies: [],
  enemyShots: [],
  turrets: [],
  groundDebris: [],
})

function selectStrokes(): Stroke[] {
  const rec = makeRecorder()
  render(rec.ctx, selectFrame(), W, H, NO_SCORES)
  return rec.strokes().filter((s) => s.alpha > 0.01)
}

// The picker's ILLUSTRATION BAND — the lower region that holds the tier death
// stars, below the title (h·0.26) and the fire instruction (h·0.38). Restricting
// analysis here excludes those two text lines. This matters for GREEN: the
// instruction is drawn in BOLT_GLOW (#9dff00, a green family) and, centred, spans
// most of the width — without the band it bridges the three green bodies into one
// cluster. Red needs no such guard (no red text), but the band is harmless to it.
const BAND_TOP = H * 0.45

/** Every endpoint x of the strokes in a given colour family that lie in the
 *  illustration band (endpoint y ≥ BAND_TOP). */
function xsOfFamily(strokes: Stroke[], family: string): number[] {
  const xs: number[] = []
  for (const s of strokes) {
    if (colorFamily(s.style) !== family) continue
    for (const [x0, y0, x1, y1] of s.segs) {
      if (y0 >= BAND_TOP) xs.push(x0)
      if (y1 >= BAND_TOP) xs.push(x1)
    }
    for (const a of s.arcs) if (a.cy >= BAND_TOP) xs.push(a.cx)
  }
  return xs
}

/** Count spatially-distinct x-clusters: sort, then split on any gap wider than
 *  `gap`. A compact death-star picture (~72 px across) is one cluster; the three
 *  tier billboards, spread ~200 px apart across the picker, are three. */
function clusterCount(xs: number[], gap: number): number {
  if (xs.length === 0) return 0
  const sorted = [...xs].sort((a, b) => a - b)
  let clusters = 1
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] > gap) clusters++
  }
  return clusters
}

const CLUSTER_GAP = 0.12 * W

describe('pt1-11 · the SELECT-A-DEATH-STAR screen illustrates each tier with a death star (AC2)', () => {
  it('draws a distinct death-star DISH for each of the three tiers (≥ 3 red clusters)', () => {
    // One VGCRED superlaser dish per tier → three separated red clusters. The steel
    // grid background paints no red, so today (labels-only) there are zero.
    const redXs = xsOfFamily(selectStrokes(), 'red')
    expect(clusterCount(redXs, CLUSTER_GAP)).toBeGreaterThanOrEqual(3)
  })

  it('draws a distinct death-star BODY for each of the three tiers (≥ 3 green clusters)', () => {
    // One VGCGRN body per tier — proving each dish belongs to a real death-star
    // picture, not a stray red mark. The steel background paints no green, so today
    // there are zero.
    const greenXs = xsOfFamily(selectStrokes(), 'green')
    expect(clusterCount(greenXs, CLUSTER_GAP)).toBeGreaterThanOrEqual(3)
  })

  it('spreads the tier illustrations ACROSS the picker width — not one lone central body', () => {
    // The three dishes span left→right; a red horizontal span > 0.4·W is the spread.
    // Today no red is drawn at all, so there is nothing to span.
    const redXs = xsOfFamily(selectStrokes(), 'red')
    expect(redXs.length).toBeGreaterThan(0)
    const span = Math.max(...redXs) - Math.min(...redXs)
    expect(span).toBeGreaterThan(0.4 * W)
  })

  it('illustrates the EASY tier on the LEFT of the picker (a death-star dish left of centre)', () => {
    // The EASY billboard sits left of centre, so its red dish lands in the left third.
    const redXs = xsOfFamily(selectStrokes(), 'red')
    expect(redXs.some((x) => x < 0.4 * W)).toBe(true)
  })
})
