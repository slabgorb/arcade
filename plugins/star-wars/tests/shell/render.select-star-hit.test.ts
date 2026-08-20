// tests/shell/render.select-star-hit.test.ts
//
// pt1-11 ROUND 2 (Reviewer HIGH finding) — the death-star ILLUSTRATION must be
// inside its own choice's hit region.
//
// THE GAP round 1 missed: the on-screen instruction is "FIRE LASER AT DESIRED
// DEATH STAR" and this story draws three death stars a player aims at — but round
// 1 placed each illustration `radius·1.9` ABOVE its label (only the label sat on
// the choice's aim). The label was hittable; the death star was ~0.227 in aim
// units away — outside SELECT_HIT_RADIUS = 0.18 — so firing at the death star
// selected NOTHING on the common landscape aspect ratios. The ROM's structural
// rule (WSMAIN.MAC:1102-1120: hit diamond centred on the illustration site VWSITC,
// draw and hit share ONE origin) is exactly this: the drawn star IS the target.
//
// This suite is placement-AGNOSTIC. It does not assume where the illustration is
// drawn; it FINDS each death star (the symmetric green VGCGRN body, whose bounding
// box is centred on the billboard) from the real render output, inverts that centre
// through the shell's own mouse→aim map (src/shell/input.ts:35-38), and drives the
// REAL sim hit test. Any placement that puts the star inside its choice's hit
// region passes; the round-1 offset fails. Isolated over a turret-free SURFACE
// background (steel grid only) so the only green is the three billboards.

import { describe, it, expect } from 'vitest'
import { render } from '../../src/shell/render'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { initialState, DEATH_STAR_CHOICES, type GameState } from '../../src/core/state'
import { hoverOf } from '../support/select'
import { makeRecorder, colorFamily } from '../support/canvas-recorder'
import type { HighScoreTable } from '@shared/highscore'

const NO_SCORES: HighScoreTable<'wave'> = []

/** A quiet select frame whose background paints no green (surface grid is steel),
 *  so the only green strokes are the three tier illustrations. The picker overlay
 *  draws identically in any phase. */
const illustrationFrame = (): GameState => ({
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

/** A plain select-mode state to drive the hit test (phase-independent — stepGame
 *  dispatches on mode, and hoverFromAim works in aim units). */
const selectState = (): GameState => ({
  ...initialState(1983),
  mode: 'select',
  select: { countdown: 10, hover: null },
})

/** The bounding-box centre of each death-star illustration, found from the green
 *  VGCGRN body strokes in the render output. The body is symmetric about the
 *  billboard centre, so its bbox centre IS that centre — independent of exactly
 *  where the picker chose to seat the star. Returned left-to-right. */
function starCenters(w: number, h: number): { x: number; y: number }[] {
  const rec = makeRecorder()
  render(rec.ctx, illustrationFrame(), w, h, NO_SCORES)
  // Exclude the green BOLT_GLOW instruction line (drawn high, at h·0.38) so only
  // the illustration bodies remain.
  const bandTop = h * 0.45
  const pts: [number, number][] = []
  for (const s of rec.strokes()) {
    if (s.alpha <= 0.01 || colorFamily(s.style) !== 'green') continue
    for (const [x0, y0, x1, y1] of s.segs) {
      if (y0 >= bandTop) pts.push([x0, y0])
      if (y1 >= bandTop) pts.push([x1, y1])
    }
  }
  // Cluster by x-gap (bodies are ~200 px apart; a body's own points are dense).
  pts.sort((a, b) => a[0] - b[0])
  const gap = 0.08 * w
  const groups: [number, number][][] = []
  let cur: [number, number][] = []
  let prevX: number | null = null
  for (const p of pts) {
    if (prevX !== null && p[0] - prevX > gap) {
      groups.push(cur)
      cur = []
    }
    cur.push(p)
    prevX = p[0]
  }
  if (cur.length) groups.push(cur)
  return groups
    .map((g) => {
      const xs = g.map((p) => p[0])
      const ys = g.map((p) => p[1])
      return { x: (Math.min(...xs) + Math.max(...xs)) / 2, y: (Math.min(...ys) + Math.max(...ys)) / 2 }
    })
    .sort((a, b) => a.x - b.x)
}

const SHAPES = [
  { name: 'square 600×600', w: 600, h: 600 },
  { name: 'wide 1024×576', w: 1024, h: 576 },
  { name: 'tall 540×960', w: 540, h: 960 },
]

describe('pt1-11 · hovering a drawn death-star illustration selects its tier (Reviewer HIGH)', () => {
  for (const shape of SHAPES) {
    it(`each death star is inside its own choice's hit region — ${shape.name}`, () => {
      const centers = starCenters(shape.w, shape.h)
      // Left-to-right, the three illustrations are EASY / MEDIUM / HARD.
      expect(centers).toHaveLength(DEATH_STAR_CHOICES.length)

      const hovered = centers.map((c) => {
        const aimX = (c.x / shape.w) * 2 - 1
        const aimY = -((c.y / shape.h) * 2 - 1)
        return hoverOf(stepGame(selectState(), { ...NO_INPUT, aimX, aimY }, 1 / 60))
      })
      // Firing at the EASY star selects EASY (0), etc. Round 1 returns [null,null,null]
      // on landscape because the star sits above the hittable label.
      expect(hovered).toEqual([0, 1, 2])
    })
  }
})
