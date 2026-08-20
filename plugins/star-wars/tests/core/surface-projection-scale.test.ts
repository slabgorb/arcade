// tests/core/surface-projection-scale.test.ts
//
// Story pt1-3 (RED / TEA) — the Death Star SURFACE RUN renders its towers far
// too distant from the player. Reference: the 1983 arcade Wave-6 surface run —
// the towers are LARGE and NEAR, filling much of the frame, standing on the
// ground the ship skims (AL82 arcade longplay still, supplied by the user).
//
// THE BUG. The surface phase mixes two coordinate systems. Everything the tower
// is measured against sits at the ROM->world PRESENTATION scale (1/30 — the
// render.ts GROUND_MODEL_SCALE that draws the ROM's 960-unit tower footprint at
// r=32): the ground grid (surface-grid.ts GRID_HALF_WIDTH=3600 / GRID_FAR=6000),
// the camera seat (SKIM_ALTITUDE=128) and the tower MODEL itself. But mazeField
// (src/core/sim.ts) plants the authored maze coordinates UNSCALED — raw ROM units
// out to +/-32768 lateral and ~32768 deep. A 352-tall tower model planted at
// depth ~34000 projects to an NDC height of ~0.01: a sub-pixel speck ~9x beyond
// the far edge of the very grid it should stand on. The render.ts:250 comment
// says it out loud — "the maze spacing and hit radii all assume" the 1/30 scale —
// so the placement is the outlier, not the grid/camera/model.
//
// These tests pin the contract in WORLD space, where it is exact and uniform
// across every maze — NOT in screen pixels, where the bug's on-screen towers
// (small-lateral, mid-depth rows) sit only just beyond the grid edge and no
// pixel threshold separates "buggy-far" from "at the horizon" without becoming
// brittle. A tower planted within the drawn ground necessarily projects large
// under the authentic +/-45 deg square lens; the envelope IS the visual symptom.
//
// THE CONTRACT (WITHOUT prescribing which knob Dev turns):
//   1. Every laid surface tower stands WITHIN the ground grid it scrolls over
//      (lateral within +/-GRID_HALF_WIDTH, depth ahead of the cockpit and no
//      deeper than the drawn horizon GRID_FAR) — not 9x outside it.
//   2. The placement scale equals the tower MODEL's footprint scale
//      (GROUND_MODEL_SCALE): positions and footprints must share one scale, or a
//      tower cannot sit on its own base.
//
// Sacred boundary: pure core placement, exercised through the real space->surface
// transition. No DOM, no time except `dt`.

import { describe, it, expect } from 'vitest'
import { initialState, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { mazeForWave } from '../../src/core/surfaceMazes'
import { GROUND_MODEL_SCALE } from '../../src/shell/render'
import { SPACE_PHASE_OVER } from '../support/space-phase-end'

const DT = 0.05

// The drawn extent of the surface floor (surface-grid.ts). A tower outside these
// floats over undrawn void — which is exactly the bug: the raw-unit field runs to
// +/-32768 lateral, ~34000 deep, while the grid ends at +/-3600 / 6000.
const GRID_HALF_WIDTH = 3600
const GRID_FAR = 6000

/** Drive a fresh run through space->surface at a chosen wave, so the maze is laid
 *  by the real phase transition (mirrors surface-maze-field.test.ts). */
function enterSurface(seed: number, wave: number): GameState {
  let s: GameState = {
    ...initialState(seed),
    wave,
    phase: 'space',
    ...SPACE_PHASE_OVER,
    enemies: [],
    enemyShots: [],
  }
  for (let i = 0; i < 200 && s.phase !== 'surface'; i++) s = stepGame(s, NO_INPUT, DT)
  return s
}

/** The full authored field, one surface frame in (before anything scrolls past
 *  the cull plane) — every maze entry, at its laid world position. */
function laidField(seed: number, wave: number) {
  return stepGame(enterSurface(seed, wave), NO_INPUT, DT).turrets
}

// --- 1. Towers stand within the ground they scroll over ----------------------

describe('pt1-3 — surface towers are laid within the ground grid, not 9x beyond it', () => {
  it('lays every wave 2..20 tower within the lateral grid envelope (|right| <= GRID_HALF_WIDTH)', () => {
    for (let wave = 2; wave <= 20; wave++) {
      const field = laidField(1983, wave)
      expect(field.length, `wave ${wave} laid a field`).toBeGreaterThan(0)
      for (const t of field) {
        // native pos = [depth(+X fwd), right(+Y lateral), up(+Z)]
        expect(
          Math.abs(t.pos[1]),
          `wave ${wave}: tower at lateral ${t.pos[1]} is outside the +/-${GRID_HALF_WIDTH} grid`,
        ).toBeLessThanOrEqual(GRID_HALF_WIDTH)
      }
    }
  })

  it('lays every laid tower ahead of the cockpit and no deeper than the drawn horizon (GRID_FAR)', () => {
    for (let wave = 2; wave <= 20; wave++) {
      for (const t of laidField(1983, wave)) {
        expect(t.pos[0], `wave ${wave}: tower depth ${t.pos[0]} must be in front of the cockpit`).toBeGreaterThan(0)
        expect(
          t.pos[0],
          `wave ${wave}: tower depth ${t.pos[0]} is beyond the drawn ground (${GRID_FAR})`,
        ).toBeLessThanOrEqual(GRID_FAR)
      }
    }
  })
})

// --- 2. Placement scale == model footprint scale (the root cause) ------------

describe('pt1-3 — tower PLACEMENT shares the tower MODEL footprint scale', () => {
  it('places each tower at its authored lateral coordinate SCALED by GROUND_MODEL_SCALE', () => {
    // The model is drawn at GROUND_MODEL_SCALE (render.ts). The maze spacing "all
    // assumes it" (render.ts:250). So a tower authored at raw e.x must be planted
    // at e.x * GROUND_MODEL_SCALE — otherwise footprint and position disagree by
    // 30x and the tower cannot sit on its own base. Today it is planted at raw e.x.
    const wave = 7 // DIFF: entries at lateral 0 out to +/-28672
    const authored = mazeForWave(wave).entries
    const field = laidField(1983, wave)
    expect(field.length, 'wave 7 laid a field').toBeGreaterThan(0)
    for (const t of field) {
      const match = authored.some((e) => Math.abs(e.x * GROUND_MODEL_SCALE - t.pos[1]) < 1e-6)
      expect(
        match,
        `tower at lateral ${t.pos[1]} matches no authored e.x * GROUND_MODEL_SCALE (raw placement bug)`,
      ).toBe(true)
    }
  })
})
