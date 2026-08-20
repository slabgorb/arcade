// tests/core/surface-projection-scale.test.ts
//
// Story pt1-3 — the Death Star SURFACE RUN rendered its towers far too distant
// from the player. Reference: the 1983 arcade Wave-6 surface run — the towers are
// LARGE and NEAR, filling much of the frame, standing on the ground the ship skims
// (AL82 arcade longplay still, supplied by the user).
//
// THE BUG (and the fix, per the 2026-08-08 projection audit §5/§6.2). The surface
// SIMULATION is authentic raw ROM units — maze positions to $8000, scroll $100/
// frame, all ROM-cited (surface-pacing.test.ts). But the surface VISUAL layer was
// left at a stale pre-migration PRESENTATION scale: the tower model was drawn at
// GROUND_MODEL_SCALE = 1/30 and the camera sat at SKIM_ALTITUDE = 128, over a
// ÷30 grid. So a raw-positioned tower (depth to ~34000) was drawn with a ÷30 model
// (height 352) and projected to ~1% of the screen — a speck floating far past the
// ÷30 grid's horizon. pt1-3 unifies the surface on raw ROM units (model 1:1,
// camera seat GD$MDT = 3840, raw grid, raw heights), so the raw tower (height
// 0x58×120 = 10560) LOOMS at the raw camera, exactly as the cabinet's does.
//
// This suite pins the user-visible SYMPTOM in screen space — a surface tower on
// the field subtends a SUBSTANTIAL on-screen height, not a speck — read through
// the shell's own projection pipeline exactly as surface-visibility.test.ts does.
// The raw constant VALUES themselves are pinned in
// tests/shell/render.ground-object-placement.test.ts.
//
// Sacred boundary: no DOM, no time except dt; projection is read via the shell's
// pure math.

import { describe, it, expect } from 'vitest'
import {
  initialState,
  SPAWN_DISTANCE,
  SKIM_ALTITUDE,
  TOWER_HEIGHT,
  type GameState,
} from '../../src/core/state'
import { mazeForWave } from '../../src/core/surfaceMazes'
import { FOV_Y } from '../../src/core/gameRules'
import { perspective, transform, type Vec3 } from '@shared/math3d'
import { project, NEAR, FAR } from '../../src/shell/wireframe'
import { cameraView } from '../../src/shell/render'

// A representative surface viewport (square-lens letterbox: project() maps through
// a centred square of side min(w,h)).
const W = 1280
const H = 960
const proj = perspective(FOV_Y, W / H, NEAR, FAR)

const surfaceEye = (alt = SKIM_ALTITUDE): GameState => ({
  ...initialState(1983),
  phase: 'surface',
  altitude: alt,
})

/** A native world point carried into eye space by the surface camera. */
const toEye = (p: Vec3): Vec3 => transform(cameraView(surfaceEye()), p)

/** The on-screen vertical extent (pixels) of a tower standing at native world
 *  position `pos`: base at up = 0, cannon top at up = TOWER_HEIGHT. Null if either
 *  end falls behind the near plane. project() -> [screenX, screenY]. */
function towerScreenHeight(pos: Vec3): number | null {
  const base = project(toEye([pos[0], pos[1], 0]), proj, W, H)
  const top = project(toEye([pos[0], pos[1], TOWER_HEIGHT]), proj, W, H)
  if (!base || !top) return null
  return Math.abs(top[1] - base[1])
}

// The deepest a maze tower is ever planted: the farthest authored forward depth
// across every playable wave, shifted by the spawn horizon (mazeField in sim.ts:
// depth = e.y + SPAWN_DISTANCE, raw ROM units). Even THIS tower must read as a
// real object, not a speck.
const deepestMazeDepth = (() => {
  let maxY = 0
  for (let wave = 2; wave <= 20; wave++) {
    for (const e of mazeForWave(wave).entries) if (e.y > maxY) maxY = e.y
  }
  return maxY + SPAWN_DISTANCE
})()

describe('pt1-3 — surface towers loom at a readable on-screen size, not distant specks', () => {
  // Reference (arcade Wave 6): the central tower fills ~40% of the frame height.
  // The ÷30 visual bug left towers at ~1% (a speck). 12% of the viewport is a
  // generous floor: far below the reference, far above the speck. At the raw
  // camera seat (3840) a 10560-tall tower at the FARTHEST spawn depth subtends
  // ~10560/depth of the square lens — comfortably clearing this — while the ÷30
  // build's 352-tall model at the same raw depth fails it by an order of magnitude.
  const MIN_FRACTION = 0.12

  it('a tower at the FARTHEST spawn depth still subtends a readable height', () => {
    const far: Vec3 = [deepestMazeDepth, 0, 0] // dead ahead, on the floor
    const h = towerScreenHeight(far)
    expect(h, 'the deepest tower must project in front of the cockpit').not.toBeNull()
    expect(
      h!,
      `deepest tower (depth ${deepestMazeDepth}) projects only ${Math.round(h ?? 0)}px — a speck`,
    ).toBeGreaterThanOrEqual(MIN_FRACTION * H)
  })

  it('a tower at a near-field spawn depth fills a large fraction of the frame', () => {
    // The nearest authored row (e.y = 0) enters at depth SPAWN_DISTANCE and looms
    // as it approaches. Dead ahead, its cannon should tower well up the screen.
    const near: Vec3 = [SPAWN_DISTANCE, 0, 0]
    const h = towerScreenHeight(near)
    expect(h, 'a near tower must project in front of the cockpit').not.toBeNull()
    expect(h!, `near tower (depth ${SPAWN_DISTANCE}) projects only ${Math.round(h ?? 0)}px`).toBeGreaterThanOrEqual(
      0.5 * H,
    )
  })
})
