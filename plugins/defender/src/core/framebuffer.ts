// src/core/framebuffer.ts
//
// Story df2-1 (GREEN, Yoda) — the first src/core module the game has, and the pure
// heart of the df2 render seam. A Defender screen is a software-drawn bitmap of
// 4-bit COLOUR-RAM indices (CRAM EQU $C000, defender/PHR6.SRC:13), not RGB — the
// shell resolves an index to a colour, never the core. This module is that index
// surface and nothing more: allocate it, clear it. No colour, no canvas, no clock,
// no entropy, no shell import — the src/core purity sweep (tests/purity.test.ts)
// scans this file and the boundary is the single most important rule in the game.
//
// DIMENSIONS ARE ARGUMENTS. The visible-raster numbers (292x240) are a BOARD fact
// and live in the shell (render.ts LOGICAL_WIDTH/HEIGHT, williams.cpp:1601); the
// factory takes them as parameters so the core carries no board constant — the same
// "share the verb, keep the numbers" shape @shared/view fitIntegerScale uses.

/** A software framebuffer: `width * height` cells, each a 4-bit palette index. */
export interface Framebuffer {
  readonly width: number
  readonly height: number
  /** One palette index (0..15) per cell, row-major. The shell decodes it to RGBA. */
  readonly data: Uint8Array
}

/** Allocate a blank `width x height` index surface (every cell index 0). */
export function createFramebuffer(width: number, height: number): Framebuffer {
  return { width, height, data: new Uint8Array(width * height) }
}

/** Fill every cell with one palette index, in place (the whole-screen clear). */
export function clear(fb: Framebuffer, index: number): void {
  fb.data.fill(index)
}
