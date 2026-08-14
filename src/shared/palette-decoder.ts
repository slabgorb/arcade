// src/shared/palette-decoder.ts — RED stub (df2-2, Han Solo / TEA).
//
// The Williams 6809 colour decode, shared by every framebuffer game on that board.
// GREEN (Dev) MOVES joust's paletteToRgba here VERBATIM — the BBGGGRRR (3-3-2) decode:
// red = byte & 0x07, green = byte >> 3 & 0x07, blue = byte >> 6 & 0x03, each widened to
// eight bits, alpha 255 — then re-points BOTH joust and defender to import it (the
// CLAUDE.md "extract on the second game" bar, met by defender). This empty stub exists
// so the type checker resolves the import while the suite reds on the missing export;
// GREEN replaces it. Contract: src/shared/tests/palette-decoder.test.ts.
export {}
