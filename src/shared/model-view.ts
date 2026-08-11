// src/shared/model-view.ts
//
// Pure framing/layout math for the games' vector-model dev tools (contact sheets
// and model viewers): bounding spheres, fit-to-cell camera distance, and grid
// partitioning. No DOM, no time, no randomness.
//
// SH4-1: lifted verbatim from the three copies that had accreted across the
// cabinet — `cellRects` was byte-identical in red-baron (tools/sheetLayout.ts),
// star-wars and tempest (core/modelView.ts); `fitDistance` in red-baron and
// star-wars; `modelBounds` in red-baron and star-wars. red-baron's own header
// called its copy "the THIRD copy ... a genuine candidate for extraction". The
// point-set (`readonly Vec3[]`) signature of `modelBounds` is red-baron's, chosen
// over star-wars' `Model3D` envelope so the shared helper carries no dependency on
// any one game's model type; star-wars call sites pass `model.vertices`.

import type { Vec3 } from './math3d.js'

/** Bounding sphere of a point set: AABB centre + farthest-point radius. */
export function modelBounds(points: readonly Vec3[]): { center: Vec3; radius: number } {
  let minX = Infinity, minY = Infinity, minZ = Infinity
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
  for (const [x, y, z] of points) {
    if (x < minX) minX = x
    if (y < minY) minY = y
    if (z < minZ) minZ = z
    if (x > maxX) maxX = x
    if (y > maxY) maxY = y
    if (z > maxZ) maxZ = z
  }
  const center: Vec3 = [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2]
  let radius = 0
  for (const [x, y, z] of points) {
    const dx = x - center[0], dy = y - center[1], dz = z - center[2]
    const d = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (d > radius) radius = d
  }
  return { center, radius }
}

/**
 * Camera distance (along -z) at which a sphere of `radius` subtends ~FILL of the
 * vertical FOV — i.e. frames the model to its cell. A degenerate radius is
 * clamped so a single-point model still yields a positive distance.
 */
export function fitDistance(radius: number, fovY: number): number {
  const FILL = 0.7 // fraction of the vertical FOV the model should subtend
  const r = Math.max(radius, 1e-3)
  return r / Math.tan((fovY * FILL) / 2)
}

/** Partition a w×h area into `count` grid cells across `cols` columns (row-major). */
export function cellRects(
  w: number,
  h: number,
  count: number,
  cols: number,
): { x: number; y: number; w: number; h: number }[] {
  const c = Math.max(1, cols)
  const rows = Math.max(1, Math.ceil(count / c))
  const cw = w / c
  const ch = h / rows
  const rects: { x: number; y: number; w: number; h: number }[] = []
  for (let i = 0; i < count; i++) {
    rects.push({ x: (i % c) * cw, y: Math.floor(i / c) * ch, w: cw, h: ch })
  }
  return rects
}
