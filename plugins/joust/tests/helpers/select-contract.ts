// tests/helpers/select-contract.ts
//
// Story jt10-5 — the CONTRACT for src/core/select.ts, TEA-authored (Tyr). Same
// seam epic jt has used since jt1-2 (loadGame / loadDemo / loadFont / loadCabinet):
// TEA states the module shape and pins the behaviour + citation gate in
// tests/select.test.ts; Dev (Loki) writes the module.
//
// ─── WHAT jt10-5 ADDS: THE 1P/2P START-SELECT DATA + HANDLER ──────────────────
// jt10-2 pinned the cabinet mode machine (src/core/cabinet.ts): the 'select' mode
// and the two edges this story rides — toSelect(cab) (→ 'select') and
// startPlaying(cab, seed, playerCount) (→ 'playing', a fresh createGame). This
// story adds the SELECT-SCREEN concern the machine left open:
//
//   1. The three ROM strings shown on the coin-up screen, transcribed VERBATIM
//      from MESSEQU.SRC (the message-equate table, the primary source for joust
//      text). These are core DATA, exactly like pictures.ts / font*.ts — so they
//      sit under the jt1-7 purity boundary and under a citation gate.
//        MSPLY1  $1D  'ONE PLAYER START'   MESSEQU.SRC:48
//        MSPLY2  $1E  'TWO PLAYER START'   MESSEQU.SRC:49
//        MSCRED  $50  'CREDITS '           MESSEQU.SRC:101   (trailing space is real)
//      NB the design doc's labels PLY1 / PLY2 / MSCRD were off by a transcription —
//      the primary source spells them MSPLY1 / MSPLY2 / MSCRED.
//
//   2. selectPlayerCount(input) — the pure map from the player's start-button
//      intent to the player count startPlaying wants: 'one-player' → 1,
//      'two-player' → 2, null → null (no start this frame; the screen stays up).
//
// ─── THE START PRESS IS AN EDGE, AND THE EDGE LIVES IN THE SHELL ──────────────
// selectPlayerCount is a pure LEVEL map, deliberately. startPlaying wraps a FRESH
// createGame every call, so firing it every frame a start button is HELD would
// re-seed the game each frame — the classic "derived edge computed on the wrong
// side" bug (typescript lang-review #14). main.ts must therefore debounce the
// start press to its RISING edge (a prevStart flag, exactly as it already keeps
// prevFlap1/prevFlap2 for flap) and hand selectPlayerCount a non-null SelectInput
// only on that edge. The shell owns the clock and the edge; core owns the map.
// select-wiring.test.ts pins the edge guard's presence in main.ts.

import type { Rgba } from '../../src/shell/render.js'

export type { Rgba }

/**
 * The player's start-button intent for a single frame. A UNION, not a string enum
 * (the lang-review checklist prefers a union — enums carry a runtime cost). `null`
 * is "no start pressed this frame", the resting state while the select screen is up.
 */
export type SelectInput = 'one-player' | 'two-player' | null

export interface SelectModule {
  /** MSPLY1 $1D 'ONE PLAYER START' — MESSEQU.SRC:48. Verbatim. */
  readonly SEL_ONE_PLAYER: string
  /** MSPLY2 $1E 'TWO PLAYER START' — MESSEQU.SRC:49. Verbatim. */
  readonly SEL_TWO_PLAYER: string
  /** MSCRED $50 'CREDITS ' — MESSEQU.SRC:101. Verbatim, INCLUDING the trailing space. */
  readonly SEL_CREDITS: string

  /**
   * The pure start-select map: 'one-player' → 1, 'two-player' → 2, null → null.
   * A LEVEL map — the rising-edge debounce that keeps a held start button from
   * re-seeding the game is the shell's job (see the header note). Total over the
   * union; deterministic.
   */
  selectPlayerCount(input: SelectInput): 1 | 2 | null
}

/**
 * Load the not-yet-built select module with a self-describing failure — the
 * loadGame / loadCabinet pattern. The specifier is assembled at runtime so the
 * bundler cannot resolve it statically and redden the whole FILE at collection
 * (the tp1-8 trap); each test reddens with a clean "feature absent" instead.
 *
 * RED today: src/core/select.ts does not exist, so this throws per test.
 */
export async function loadSelect(): Promise<SelectModule> {
  const specifier = ['..', '..', 'src', 'core', 'select.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<SelectModule>
    if (typeof mod.selectPlayerCount !== 'function') throw new Error('module has no `selectPlayerCount` export')
    for (const s of ['SEL_ONE_PLAYER', 'SEL_TWO_PLAYER', 'SEL_CREDITS'] as const) {
      if (typeof mod[s] !== 'string') throw new Error(`module has no \`${s}\` string export`)
    }
    return mod as SelectModule
  } catch (e) {
    throw new Error(
      'select module not built yet — GREEN (Loki) creates plugins/joust/src/core/select.ts ' +
        'satisfying tests/helpers/select-contract.ts: SEL_ONE_PLAYER / SEL_TWO_PLAYER / SEL_CREDITS ' +
        "(the three coin-up strings, transcribed VERBATIM from MESSEQU.SRC lines 48/49/101 — 'CREDITS ' " +
        'keeps its trailing space) and selectPlayerCount(input) (one-player → 1, two-player → 2, ' +
        'null → null). Keep select.ts inside the jt1-7 purity boundary (it is core DATA + a pure ' +
        `map — no clock, no browser surface, no shell import). (${(e as Error).message})`,
    )
  }
}
