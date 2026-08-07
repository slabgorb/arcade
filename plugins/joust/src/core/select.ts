// src/core/select.ts
//
// Story jt10-5 (GREEN, Loki) — the 1P/2P start-select DATA + handler, the fourth
// screen concern layered on jt10-2's cabinet mode machine. Two pure things live
// here, and only these:
//
//   1. The three coin-up strings, transcribed VERBATIM from the message-equate
//      table (the primary source for joust text). These are core DATA — exactly
//      like pictures.ts / font*.ts — so they sit inside the jt1-7 purity boundary
//      and under the select-source citation gate:
//        MSPLY1  $1D  'ONE PLAYER START'   MESSEQU.SRC:48
//        MSPLY2  $1E  'TWO PLAYER START'   MESSEQU.SRC:49
//        MSCRED  $50  'CREDITS '           MESSEQU.SRC:101   (the trailing space is real —
//                                          the ROM message routine appends the count after it)
//
//   2. selectPlayerCount — the pure map from the player's start-button intent to
//      the player count startPlaying (cabinet.ts) wants. A LEVEL map: 'one-player'
//      -> 1, 'two-player' -> 2, null -> null. Null is "no start pressed this
//      frame", the resting state while the select screen is up.
//
// The start press is an EDGE, and the edge lives in the SHELL. startPlaying wraps
// a FRESH createGame every call, so firing it while a start button is merely HELD
// would re-seed the game each frame. main.ts therefore debounces the press to its
// rising edge (a prevStart flag, the same shape it already keeps for flap) and
// hands this map a non-null SelectInput only on that edge. The shell owns the
// clock and the edge; core owns the map — no time, no entropy, no browser surface.

/**
 * The player's start-button intent for a single frame. A UNION, not a string enum
 * (enums carry a runtime cost; the closed set is expressed better as a union).
 * `null` is "no start pressed this frame".
 */
export type SelectInput = 'one-player' | 'two-player' | null

/** MSPLY1 $1D 'ONE PLAYER START' — MESSEQU.SRC:48. The 1P start-button label. */
export const SEL_ONE_PLAYER = 'ONE PLAYER START'

/** MSPLY2 $1E 'TWO PLAYER START' — MESSEQU.SRC:49. The 2P start-button label. */
export const SEL_TWO_PLAYER = 'TWO PLAYER START'

/** MSCRED $50 'CREDITS ' — MESSEQU.SRC:101. Verbatim, INCLUDING the trailing space.
 *  The clone has no coin economy (design spec) — this renders as a static label. */
export const SEL_CREDITS = 'CREDITS '

/**
 * The pure start-select map: 'one-player' -> 1, 'two-player' -> 2, null -> null.
 * A LEVEL map (the rising-edge debounce is the shell's job — see the header). Total
 * over the SelectInput union; deterministic. A null result means "no game to start
 * this frame", so main.ts must NOT call startPlaying — never a defaulted count.
 */
export function selectPlayerCount(input: SelectInput): 1 | 2 | null {
  if (input === 'one-player') return 1
  if (input === 'two-player') return 2
  return null
}
