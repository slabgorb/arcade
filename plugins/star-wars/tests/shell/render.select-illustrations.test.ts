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
// ISOLATION: a select frame still renders the space-scene background, which draws
// exactly ONE approaching death star — a SINGLE picture at ONE location (measured:
// its red dish spans ~9 px, off-centre). So every assertion here is framed to bite
// only on a MULTI-location signal the lone background station cannot forge: three
// separated dish clusters, and a red span covering most of the picker. A test that
// merely asked "is there a red dish on the right?" would pass today on the
// background alone — vacuous — so we never ask that. phaseTime = 0 keeps the
// background death star far, tiny and quiet.

import { describe, it, expect } from 'vitest'
import { render } from '../../src/shell/render'
import { initialState, type GameState } from '../../src/core/state'
import { makeRecorder, colorFamily, type Stroke } from '../support/canvas-recorder'
import type { HighScoreTable } from '@shared/highscore'

const W = 800
const H = 600
const NO_SCORES: HighScoreTable<'wave'> = []

/** A quiet select-mode frame: the picker up, no live hover, the space background
 *  seeded far away and empty of TIEs so the only scene picture is the lone,
 *  distant approaching death star. */
const selectFrame = (): GameState => ({
  ...initialState(1983),
  mode: 'select',
  phase: 'space',
  phaseTime: 0,
  select: { countdown: 10, hover: null },
  enemies: [],
  dyingTies: [],
  enemyShots: [],
})

function selectStrokes(): Stroke[] {
  const rec = makeRecorder()
  render(rec.ctx, selectFrame(), W, H, NO_SCORES)
  return rec.strokes().filter((s) => s.alpha > 0.01)
}

/** Every endpoint x of the strokes in a given colour family. */
function xsOfFamily(strokes: Stroke[], family: string): number[] {
  const xs: number[] = []
  for (const s of strokes) {
    if (colorFamily(s.style) !== family) continue
    for (const [x0, , x1] of s.segs) xs.push(x0, x1)
    for (const a of s.arcs) xs.push(a.cx)
  }
  return xs
}

/** Count spatially-distinct x-clusters: sort, then split on any gap wider than
 *  `gap`. One compact picture (a lone background station, ~9 px wide) is one
 *  cluster; three billboards spread across the picker are three. */
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
    // The lone background station is one red cluster; the three tier billboards are
    // three more. Today drawSelect strokes no wireframes, so only that single
    // background cluster exists → 1.
    const redXs = xsOfFamily(selectStrokes(), 'red')
    expect(clusterCount(redXs, CLUSTER_GAP)).toBeGreaterThanOrEqual(3)
  })

  it('draws a distinct death-star BODY for each of the three tiers (≥ 3 green clusters)', () => {
    // VGCGRN body per tier — proving each dish belongs to a real death-star
    // picture, not a stray red mark. Today only the background body exists → 1.
    const greenXs = xsOfFamily(selectStrokes(), 'green')
    expect(clusterCount(greenXs, CLUSTER_GAP)).toBeGreaterThanOrEqual(3)
  })

  it('spreads the tier illustrations ACROSS the picker width — not one lone central body', () => {
    // A red horizontal span > 0.4·W cannot come from the single small background
    // dish (measured ~9 px); it is the left-to-right spread of the three tiers.
    const redXs = xsOfFamily(selectStrokes(), 'red')
    expect(redXs.length).toBeGreaterThan(0)
    const span = Math.max(...redXs) - Math.min(...redXs)
    expect(span).toBeGreaterThan(0.4 * W)
  })

  it('illustrates the EASY tier on the LEFT of the picker (a death-star dish left of centre)', () => {
    // The background station sits right-of-centre (its dish is the only red today,
    // and it is at x > 0.6·W), so a red dish in the left third can only be the EASY
    // billboard the fix adds. (Green is NOT asserted here: the wide background body
    // already bleeds into the left third, so a green-left check would be vacuous —
    // the ≥3-green-cluster test above is the body's real guard.)
    const redXs = xsOfFamily(selectStrokes(), 'red')
    expect(redXs.some((x) => x < 0.4 * W)).toBe(true)
  })
})
