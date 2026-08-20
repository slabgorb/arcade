// src/core/surface-grid.ts
//
// Story 11-5 — the Death Star surface as a procedural, receding ground grid.
//
// DEATH_STAR_SURFACE (Object_8) is a narrow 3-fin spike, never a ground: seated
// 600 units from the eye it balloons off every screen edge and collapses to a
// triangle at the crosshair (docs/adr/0002-scene-geometry-surface-and-trench.md
// part A). This replaces it — for the surface SCENE only; the model stays in the
// registry, re-classified — with a wide grid on the native floor plane (up = 0)
// that recedes to a horizon and scrolls toward the cockpit.
//
// PURE core, exactly like Tempest's tube geometry: deterministic, no DOM/time/
// randomness, so the boundary holds and the geometry is unit-tested (segment
// counts, ±X symmetry, width/length envelope, scroll recycling). The shell only
// strokes the returned Model3D through drawWireframe and lifts the camera.

import type { Vec3 } from '@shared/math3d'
import type { Model3D } from './models'

// pt1-3: the surface renders at 1:1 raw ROM units now (the ÷30 presentation fudge
// is retired — projection audit §6.2). These grid dimensions are the shipped
// presentation values ×30, so the grid's segment counts and on-screen appearance
// are unchanged, but it now recedes across the RAW maze field (positions to $8000)
// under the raw camera seat (GD$MDT = 3840) — the towers stand ON it instead of
// floating far past its old ÷30 horizon. The scroll (raw ~5250 u/s) now recycles
// the lateral lines at the field's own rate, not 30× too fast.

/** Lateral (right-axis) spacing between the longitudinal (parallel-to-depth) lines. */
export const GRID_X = 12000
/** Spacing between the lateral (across-right) lines — also the scroll period. */
export const GRID_Z = 15000
/** Half the grid's total width: the outermost longitudinal lines sit at right = ±this,
 *  wide enough to run off-screen at the horizon and to carry the maze's ±$8000 lanes. */
export const GRID_HALF_WIDTH = 108000
/** Far cutoff: the grid recedes from the cockpit out to depth ≈ +GRID_FAR (the horizon). */
export const GRID_FAR = 180000

/**
 * A wide ground grid on the native floor plane (up = 0), scrolled toward the
 * cockpit by `scroll`. sw10-1: authored directly in the ROM-native world basis
 * `[depth(+X ahead), right(+Y), up(+Z)]`, so it drops in unrotated under the one
 * camera remap (no per-model orient). Geometry is `toNative` of the old OpenGL
 * grid, vertex-for-vertex, so the shipped scroll/envelope is preserved exactly.
 *
 * - Longitudinal lines parallel to +X (depth) at right = ±k·GRID_X out to
 *   ±GRID_HALF_WIDTH — the receding "ground". They are static under depth-scroll
 *   (sliding a line along its own depth direction looks identical), so only the
 *   laterals move.
 * - Lateral lines across right (Y) every GRID_Z, from the cockpit (depth≈0) out
 *   to +GRID_FAR, advanced toward the camera by `scroll mod GRID_Z` so the ground
 *   rushes past and recycles every GRID_Z (surfaceGrid(s) ≡ surfaceGrid(s + GRID_Z)).
 */
export function surfaceGrid(scroll: number): Model3D {
  const vertices: Vec3[] = []
  const edges: [number, number][] = []

  // Longitudinal lines (parallel to +X depth), each spanning cockpit → horizon.
  const halfCount = Math.round(GRID_HALF_WIDTH / GRID_X)
  for (let k = -halfCount; k <= halfCount; k++) {
    const y = k * GRID_X // lateral (right) offset
    const near = vertices.push([0, y, 0]) - 1
    const far = vertices.push([GRID_FAR, y, 0]) - 1
    edges.push([near, far])
  }

  // Lateral lines (across right Y), recycling toward the camera every GRID_Z. The
  // modulo keeps `offset` in [0, GRID_Z) for any scroll (incl. negative). Depth
  // decreases toward the cockpit as `scroll` grows (native twin of the old +Z advance).
  const offset = ((scroll % GRID_Z) + GRID_Z) % GRID_Z
  const farCount = Math.round(GRID_FAR / GRID_Z)
  for (let k = 0; k <= farCount; k++) {
    const depth = k * GRID_Z - offset
    const left = vertices.push([depth, -GRID_HALF_WIDTH, 0]) - 1
    const right = vertices.push([depth, GRID_HALF_WIDTH, 0]) - 1
    edges.push([left, right])
  }

  return { name: 'Surface Grid', vertices, edges }
}
