// src/core/palette.ts — RED stub (df2-2, Han Solo / TEA). PURE data + resolver.
//
// The 16-entry colour model: DEFAULT_PCRAM is the 16 default colour-RAM bytes
// transcribed from the vendored source under the df1-1 citation gate; resolveCram
// models the per-frame PCRAM -> CRAM copy the IRQ performs (defender/PHR6.SRC:219 ->
// defender/PHR6.SRC:13, DEFA7.SRC:1968-1994) as a pure "resolve 16 indices" step. No
// colour lives here — bytes are 4-bit-packed colour-RAM values; the shell decodes them
// to RGBA through @shared/palette-decoder. This empty stub exists so the type checker
// resolves the import while the suite reds on the missing exports; GREEN replaces it.
// Contract: plugins/defender/tests/palette.test.ts.
export {}
