// src/tools/sheetLayout.ts
//
// Pure framing/layout math for the ROM|PORT vector-picture contact sheet
// (tools/contactSheet.ts): bounding spheres, fit-to-cell camera distance, and
// grid partitioning.
//
// SH4-1: `cellRects`, `fitDistance` and `modelBounds` were the "THIRD copy" this
// header once flagged for extraction. They now live in the pure shared library
// (`@shared/model-view`) and are re-exported here so contactSheet.ts and its
// tests keep importing them from the same path. The shared `modelBounds` already
// carries red-baron's `readonly Vec3[]` signature — this file's original one —
// so contactSheet.ts (which passes `p.rom.points`) is unaffected.

export { modelBounds, fitDistance, cellRects } from '@shared/model-view'
