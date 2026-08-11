// @arcade/shared/clamp — the generic 3-arg numeric clamp.
//
// SH4-4 extraction. Four games shipped a logic-identical generic clamp(v,lo,hi)
// in three spellings that agree on every finite input:
//   nest     Math.max(lo, Math.min(hi, v))    red-baron ×4 (returning-ace,
//                                              flight, score-countup, lives)
//   min-max  Math.min(Math.max(v, lo), hi)    asteroids core/rocks.ts
//   ternary  v < lo ? lo : v > hi ? hi : v    star-wars core/gameRules.ts,
//                                              missile-command core/cursor.ts
// All three leak NaN (clamp(NaN,lo,hi) -> NaN). The one site with an explicit
// NaN policy was red-baron core/enemy.ts, whose GUARDED form returns `lo`. This
// story's design gate settles on that guarded policy fleet-wide, so the shared
// clamp is byte-equivalent to all three unguarded spellings on finite inputs and
// returns `lo` for NaN.
//
// This is the GENERIC 3-arg form only. The single-purpose variants each game
// keeps — velocity clamps, a 0..1 clamp, index and axis clamps, battlezone's
// 1-arg clamp, and the inline index-clamps — stay local to their games; they
// are not this function.

/** Clamp `v` into the inclusive range [lo, hi]. NaN returns `lo`. */
export function clamp(v: number, lo: number, hi: number): number {
  return Number.isNaN(v) ? lo : Math.max(lo, Math.min(hi, v))
}
