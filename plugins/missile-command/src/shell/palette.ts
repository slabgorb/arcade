// src/shell/palette.ts
//
// Story mc9-2 — RED SEED (Han Solo / TEA). This is an intentionally EMPTY module,
// committed so the RED test suite's imports resolve and `npm run lint` (tsc) stays
// green while the palette is unimplemented. It carries ZERO game logic.
//
// GREEN (Yoda) REPLACES this whole body with the per-wave 8-colour palette ported
// from SET UP COLORS FOR NEXT WAVE (W3DSUP.MAC:1583). The contract the tests pin
// (see tests/palette.test.ts, palette-source.test.ts, render-palette.test.ts):
//
//   interface Rgb { r: number; g: number; b: number }
//   const PALETTE_COUNT = 10
//   const FLASH_SLOTS: readonly number[]           // [4, 5]  (COL100, COL101)
//   const FLASH_MASK: number                       // 0x30    (GAMEFL, W3COMN.MAC:489)
//   paletteIndexForWave(wave: number): number      // ((wave-1) >> 1) mod 10
//   paletteCodesForWave(wave: number): readonly number[]  // 8 ROM colour codes, COL000..COL111
//   colorCodeToRgb(code: number): Rgb              // labelled adapter policy — NOT a ROM constant
//   paletteForWave(wave: number): readonly Rgb[]   // 8 RGBs = codes through the adapter
//   rgbCss(colour: Rgb): string                    // `rgb(r, g, b)`
//
// Until then this module exports nothing; every symbol above reads back `undefined`
// through the tests' namespace cast, which turns each into a self-describing
// "not implemented yet" failure (the centipede cp2-13 idiom) rather than a crash.

export {}
