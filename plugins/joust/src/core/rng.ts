// src/core/rng.ts
//
// SH3-1 — the durable-word draw joust's core threads, now sourced from
// @shared/rng instead of an inlined mulberry32 copy. Pre-migration joust shipped
// the generator BYTE-FOR-BYTE in two places (frame.ts + transporter.ts) because
// the plugin did not yet pin @arcade/shared; the collapse retired that excuse, so
// this module retires the duplication and re-exposes the ONE immutable form both
// call sites use.
//
// @shared/rng exposes the MUTABLE contract (`createRng(seed) -> {seed}`,
// `nextFloat(rng)` advances `rng.seed` in place). joust's core is a pure reducer:
// the durable seed word lives in GameState and is advanced FUNCTIONALLY, never
// mutated across frames. `rngNext` is the thin adapter between the two — it spins
// up a local cursor, takes exactly one draw, and hands back the float plus the
// next word for the reducer to thread. It is byte-for-byte the old inlined form:
// `nextFloat(createRng(w))` returns the same float and leaves `rng.seed` at the
// same next word, proven for any seed in tests/rng-shared-adoption.test.ts.

import { createRng, nextFloat } from '@shared/rng'

/** Advance the durable word once, returning the float and the next word. Pure. */
export function rngNext(word: number): { value: number; next: number } {
  const rng = createRng(word)
  const value = nextFloat(rng)
  return { value, next: rng.seed }
}
