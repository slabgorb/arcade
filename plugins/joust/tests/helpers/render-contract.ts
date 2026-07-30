// tests/helpers/render-contract.ts
//
// Story jt1-6 — the CONTRACT for the render shell, TEA-authored. Same split as
// every prior story: TEA states the shape and the tests, Dev writes the module.
//
// ─── THIS IS A SHELL STORY ───────────────────────────────────────────────────
// The shell imports core; core never learns the shell exists. Everything here
// lives under src/shell/ and is free to touch canvases, palettes and colours —
// none of which core may name. The purity guard (now AST-based, jt1-7) enforces
// the other direction.
//
// ─── WHAT IS TESTABLE HERE, AND WHAT IS NOT ──────────────────────────────────
// AC-1's demo is a browser artefact: two players flying on 5279, screenshotted.
// No unit test can assert that. What tests CAN pin is everything the screenshot
// depends on — the atlas geometry, the palette derivation, the animation frame
// selection, the input mapping, and the wiring lines that a node env cannot
// execute. Pixels are the reviewer's job; wiring is ours.

import type { PixelBlock, Palette } from './pictures-contract.js'

/** An RGBA colour resolved from a COLOR1 palette byte. */
export interface Rgba {
  r: number
  g: number
  b: number
  a: number
}

/**
 * The offscreen atlas: every blittable block packed once, with the palette
 * already applied.
 *
 * `blocks` is keyed by the jt1-3 label. Only RASTER blocks belong here — see
 * the encoding discriminant below.
 */
export interface Atlas {
  width: number
  height: number
  /** Where each block sits in the atlas. */
  blocks: Record<string, { x: number; y: number; width: number; height: number }>
  /** RGBA bytes, length width×height×4. */
  data: Uint8ClampedArray
}

export interface RenderModule {
  /** Visible raster, `williams.cpp:1556`. */
  LOGICAL_WIDTH: number
  LOGICAL_HEIGHT: number

  /**
   * COLOR1 byte → RGBA. The palette is `BBGGGRRR` with resistor-weighted DACs
   * (`williams_v.cpp:342-343`). Joust has NO remap PROM, so a pixel nibble is a
   * LITERAL index into this table — never a lookup through a remap.
   */
  paletteToRgba(paletteByte: number): Rgba

  /** The 16 COLOR1 entries as RGBA, in index order. */
  rgbaPalette(palette: Palette): Rgba[]

  /**
   * The integer scale factor and letterbox offsets for a viewport.
   *
   * Scale is `floor(min(vw/292, vh/240))` and never zero — a viewport smaller
   * than the logical raster still renders at 1×, cropped, rather than vanishing.
   */
  viewport(vw: number, vh: number): { scale: number; offsetX: number; offsetY: number }

  /**
   * Reshape a `stream`-encoded expansion into a padded rectangle.
   *
   * `expandComcl5` returns RAGGED rows packed contiguously — the ROM's decoder
   * emits a run then an end-of-line, and lines differ in length. Indexing that
   * flat array as `pixels[y*width + x]` SHEARS the image progressively. This
   * pads each row to `width` with palette index 0 so it can be blitted.
   * Row boundaries come from the decoder's rowLengths — they are NOT
   * recoverable from width x height (jt1-6 review addendum: the 3-arg form was
   * arithmetically identical to the fixed-stride shear it existed to prevent).
   */
  reshapeRagged(
    pixels: readonly number[],
    width: number,
    height: number,
    rowLengths: readonly number[],
  ): number[]

  /** Build the atlas from raster blocks only. */
  buildAtlas(blocks: readonly PixelBlock[], palette: Palette): Atlas
}

/** The per-player input the shell produces and core consumes. */
export interface ShellInputModule {
  /**
   * Map a set of held keys to the core input contract.
   *
   * Both directions held must normalise to 0 — that is the ROM's own answer
   * (`ANDA #$03 / ASRA / SBCA #0` maps raw 3 → 0, JOUSTRV4.SRC:7261-7263). A
   * last-pressed-wins mapping is a different game.
   */
  mapPlayer1(held: ReadonlySet<string>, prevFlap: boolean): { dir: -1 | 0 | 1; flap: boolean; flapHeld: boolean }
  mapPlayer2(held: ReadonlySet<string>, prevFlap: boolean): { dir: -1 | 0 | 1; flap: boolean; flapHeld: boolean }
}

export async function loadRender(): Promise<RenderModule> {
  const specifier = ['..', '..', 'src', 'shell', 'render.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<RenderModule>
    if (typeof mod.viewport !== 'function') throw new Error('module has no `viewport` export')
    return mod as RenderModule
  } catch (e) {
    throw new Error(
      'render shell not built yet — GREEN (Julia) creates joust/src/shell/render.ts ' +
        `satisfying tests/helpers/render-contract.ts. (${(e as Error).message})`,
    )
  }
}

export async function loadShellInput(): Promise<ShellInputModule> {
  const specifier = ['..', '..', 'src', 'shell', 'input.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<ShellInputModule>
    if (typeof mod.mapPlayer1 !== 'function') throw new Error('module has no `mapPlayer1` export')
    return mod as ShellInputModule
  } catch (e) {
    throw new Error(
      'shell input not built yet — GREEN creates joust/src/shell/input.ts ' +
        `satisfying tests/helpers/render-contract.ts. (${(e as Error).message})`,
    )
  }
}
