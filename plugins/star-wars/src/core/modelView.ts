// src/core/modelView.ts
//
// Pure framing/layout math for the model contact sheet (tools/contactSheet.ts):
// bounding spheres, fit-to-cell camera distance, and grid partitioning. No DOM,
// no time, no randomness — safe under the core's purity rule.
//
// SH4-1: these three helpers were extracted into the shared library
// (`@shared/model-view`) and are re-exported here. `modelBounds` now takes red-
// baron's `readonly Vec3[]` signature rather than a `Model3D` envelope, so this
// game's call sites (tools/contactSheet.ts, shell/debug-overlay.ts) pass
// `model.vertices`. @shared is already a legal core import (math3d, rng), so the
// purity boundary is intact.

export { modelBounds, fitDistance, cellRects } from '@shared/model-view'
