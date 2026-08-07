// tests/helpers/cabinet-contract.ts
//
// Story jt10-2 — the CONTRACT for src/core/cabinet.ts, TEA-authored (O'Brien).
// Same seam epic jt has used since jt1-2 (loadGame / loadDemo / loadFont): TEA
// states the module shape and pins the behaviour here; Dev (Julia) writes the
// module. The behaviour + purity + rule coverage lives in tests/cabinet.test.ts.
//
// ─── WHAT jt10-2 ADDS: THE THIRD CORE TIER ───────────────────────────────────
// Joust already has a TWO-tier core: the sim (frame.ts) wrapped by the session
// (game.ts — scores, lives, the GOVER tri-state). jt10-2 adds a THIRD tier ABOVE
// the session: a pure `cabinet.ts` holding a CabinetState { mode, game } mode
// machine that WRAPS createGame / stepGame the same way game.ts wraps the sim —
// exactly as tempest layers its `Mode` (plugins/tempest/src/core/state.ts:8)
// above its sim. This story pins the MACHINE only: the mode set, the GOVER-driven
// transitions, and the game-over → high-score value gate. NO screens, NO
// rendering, NO main.ts wiring (those are jt10-3..jt10-7, all depends_on jt10-2).
//
//   sim (frame.ts) ⊂ session (game.ts) ⊂ cabinet (cabinet.ts)   ← new tier
//
// ─── THE HINGE IS THE EXISTING GOVER TRI-STATE (game.ts, jt4-4) ───────────────
// GOVER is a signed byte with THREE meanings (JOUSTRV4.SRC:232-233,712,1015),
// already modelled and exported by game.ts:
//   • GOVER_ATTRACT ($7F) → self-play attract              → cabinet mode 'attract'
//   • GOVER_RUNNING (-1)  → a game in progress             → cabinet mode 'playing'
//   • GOVER_OVER (0)      → all players out (settleGameOver) → cabinet mode 'gameover'
// The cabinet does not re-model GOVER; `modeForGover` is the pure map from the
// session's rung to the mode a stepped session dictates. The other three modes
// (title / select / highscore) are cabinet-tier states reached by explicit
// transitions, not by GOVER.
//
// ─── THE HIGH-SCORE GATE IS A VALUE CHECK, NOT A LEXICAL ONE ──────────────────
// gameover → highscore IFF the score qualifies, else → attract. "Qualifies" is a
// numeric comparison against the board via @shared/highscore's qualifiesForHighScore
// (a non-positive score never qualifies; an open board takes any positive; a full
// board needs a STRICT beat of the lowest). @shared imports are pure — tempest's
// own core/state.ts imports @shared/highscore — so this lives in core (the fleet
// rule: qualifies/initials logic is core). jt10-7 owns the actual initials ENTRY;
// jt10-2 pins only the BRANCH.

// game.ts already exists (jt4), so the contract imports the REAL session types —
// not game-contract.ts's jt4-1-era narrower shapes — so a CabinetState built over
// a real createGame() typechecks against the same GameState the module wraps.
import type { GameState, PlayerLedger } from '../../src/core/game.js'
import type { PlayerInput } from '../../src/core/flight.js'
import type { HighScoreEntryBase } from '@shared/highscore'

export type { GameState, PlayerInput, PlayerLedger, HighScoreEntryBase }

/**
 * The six cabinet-lifecycle modes (design spec §"The mode set"). A UNION type,
 * not a string enum (enums carry a runtime cost; the lang-review checklist prefers
 * a union). This is the SET this story pins — a drift (added/removed member) must
 * break tests/cabinet.test.ts's compile-time exhaustive map.
 */
export type CabinetMode = 'attract' | 'title' | 'select' | 'playing' | 'gameover' | 'highscore'

/**
 * The cabinet tier state: the current `mode` plus the WRAPPED session `game`.
 * `mode` is the only new concern — every session fact (players, gover, wave, sim,
 * events) lives in the wrapped `game` (the jt4 GameState), untouched by the cabinet.
 * Both fields readonly: transitions return a NEW CabinetState, never mutate.
 */
export interface CabinetState {
  readonly mode: CabinetMode
  readonly game: GameState
}

export interface CabinetModule {
  /** The three GOVER rungs, re-exported through the cabinet for the hinge tests
   *  (they are game.ts's own constants — the cabinet does not re-define them). */
  readonly GOVER_OVER: number
  readonly GOVER_RUNNING: number
  readonly GOVER_ATTRACT: number

  /**
   * Boot the cabinet: mode 'attract', wrapping a fresh session `createGame(seed,
   * playerCount)`. Deterministic — same (seed, playerCount) → same CabinetState.
   * Pure. (The wrapped game boots at GOVER_RUNNING; wiring attract's self-play to
   * carry GOVER_ATTRACT is jt10-4 — jt10-2 pins the mode, not the demo.)
   */
  createCabinet(seed: number, playerCount?: number): CabinetState

  /**
   * The GOVER hinge — the PURE map from a session's settled `gover` rung to the
   * cabinet mode a stepped/playing session dictates:
   *   GOVER_ATTRACT → 'attract', GOVER_RUNNING → 'playing', GOVER_OVER → 'gameover'.
   * These three are the only values GOVER ever holds. Pure.
   */
  modeForGover(gover: number): CabinetMode

  /** attract → title: the attract sub-cycle's title page (a cabinet-tier edge; the
   *  page ORDER/scheduler is jt10-4). Preserves the wrapped game. Pure. */
  toTitle(cab: CabinetState): CabinetState

  /** attract/title → select: coin-up to the 1P/2P start select (NO coin economy —
   *  CREDITS is a static line, jt10-5). Preserves the wrapped game. Pure. */
  toSelect(cab: CabinetState): CabinetState

  /**
   * select → playing: begin a real game. Returns mode 'playing' wrapping a FRESH
   * `createGame(seed, playerCount)` — so the wrapped game is at GOVER_RUNNING and
   * seeded deterministically. Pure.
   */
  startPlaying(cab: CabinetState, seed: number, playerCount?: number): CabinetState

  /**
   * Step ONE frame of a playing cabinet: delegate to the session's `stepGame`
   * (no divergent second stepping path — the wrapped game must stay bit-identical
   * to a raw stepGame), then RE-DERIVE the mode from the stepped game's settled
   * GOVER via `modeForGover` — so an all-players-out frame lands in 'gameover'.
   * Pure — the argument is never mutated.
   */
  stepPlaying(cab: CabinetState, inputs?: Record<number, PlayerInput>): CabinetState

  /**
   * gameover → the routed next mode: 'highscore' IFF the best player score
   * qualifies for `table` (qualifiesForHighScore — a VALUE check), else 'attract'.
   * Preserves the wrapped game (the fresh attract cycle's game reset is jt10-4 /
   * `toAttract`). Pure — neither the state nor the table is mutated.
   */
  afterGameOver(cab: CabinetState, table: readonly HighScoreEntryBase[]): CabinetState

  /**
   * → attract: start a fresh attract cycle wrapping a new `createGame(seed,
   * playerCount)`. The return edge from 'highscore' (jt10-7 owns the entry
   * trigger; this plants the edge) and the reset after a non-qualifying gameover.
   * Pure.
   */
  toAttract(cab: CabinetState, seed: number, playerCount?: number): CabinetState
}

/**
 * Load the not-yet-built cabinet module with a self-describing failure — the
 * loadGame / loadDemo / loadFont pattern. The specifier is assembled at runtime so
 * the bundler cannot resolve it statically and redden the whole FILE at collection
 * (the tp1-8 trap); each test reddens with a clean "feature absent" instead.
 *
 * RED today: src/core/cabinet.ts does not exist, so this throws per test.
 */
export async function loadCabinet(): Promise<CabinetModule> {
  const specifier = ['..', '..', 'src', 'core', 'cabinet.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<CabinetModule>
    const fns = [
      'createCabinet',
      'modeForGover',
      'toTitle',
      'toSelect',
      'startPlaying',
      'stepPlaying',
      'afterGameOver',
      'toAttract',
    ] as const
    for (const fn of fns) {
      if (typeof mod[fn] !== 'function') throw new Error(`module has no \`${fn}\` export`)
    }
    if (mod.GOVER_OVER === undefined || mod.GOVER_RUNNING === undefined || mod.GOVER_ATTRACT === undefined) {
      throw new Error('module does not re-export the GOVER_* rungs')
    }
    return mod as CabinetModule
  } catch (e) {
    throw new Error(
      'cabinet module not built yet — GREEN (Julia) creates plugins/joust/src/core/cabinet.ts ' +
        'satisfying tests/helpers/cabinet-contract.ts: the CabinetMode union (attract/title/select/' +
        'playing/gameover/highscore), CabinetState { mode, game } WRAPPING the jt4 GameState, ' +
        '`createCabinet(seed)` (boots mode attract over createGame), `modeForGover(gover)` (the ' +
        'GOVER hinge: $7F→attract, -1→playing, 0→gameover — reuse game.ts GOVER_* constants), the ' +
        'cabinet-tier edges toTitle/toSelect/startPlaying/toAttract, `stepPlaying` (delegates to ' +
        'stepGame then re-derives mode from the settled gover — no second stepping path), and ' +
        '`afterGameOver(cab, table)` (→ highscore iff qualifiesForHighScore(table, best score), ' +
        'else → attract — import qualifiesForHighScore from @shared/highscore; @shared is pure in ' +
        `core). Keep cabinet.ts inside the jt1-7 purity boundary. (${(e as Error).message})`,
    )
  }
}
