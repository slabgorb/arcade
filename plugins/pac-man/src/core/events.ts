// src/core/events.ts
//
// Story pm1-8 (Julia) — the discriminated union `game.ts`'s `stepGame` emits,
// one entry per gameplay moment a shell (render/audio) would need to react
// to. `main.ts` (this task) does NOT read `GameState.events` — it drives
// rendering and high-score persistence straight off `GameState` each frame,
// which is all a bare visual + score/lives HUD needs. This union is a
// FORWARD SEAM for a future shell (per-cue audio, popup score text, a
// "READY!"/flash overlay reacting to a specific moment rather than polling
// state) — kept to the shape such a consumer would plausibly need (YAGNI: no
// per-frame position events, since a shell can already read `GameState`
// directly for that; no event for every internal state transition). PURE
// type-only module: no DOM, no clock, no Math.random, no shell import.

import type { GhostId } from './ghost'
import type { FruitType } from './level'

/** A dot (10 pts, `pacman.asm:2b17`) eaten this frame. */
export interface DotEatenEvent {
  readonly type: 'dot-eaten'
  readonly score: number
}

/** An energizer (50 pts, `pacman.asm:2b19`) eaten — enters/refreshes
 *  frightened mode (mode.ts owns that transition; this is the score/HUD
 *  signal). */
export interface EnergizerEatenEvent {
  readonly type: 'energizer-eaten'
  readonly score: number
}

/** A frightened ghost was eaten. `chainIndex` is 0-based position in this
 *  energizer's chain (0=200, 1=400, 2=800, 3=1600 pts,
 *  `docs/rom-study/claims/scoring.json` SCORE-GHOST1..4) — the shell can
 *  render the chain-value popup without recomputing it. */
export interface GhostEatenEvent {
  readonly type: 'ghost-eaten'
  readonly ghost: GhostId
  readonly chainIndex: number
  readonly score: number
}

/** The level's bonus fruit appeared at its dot-eaten threshold
 *  (`FRUIT_SPAWN_DOTS`, `pacman.asm:0eba`/`0ebe`). */
export interface FruitSpawnedEvent {
  readonly type: 'fruit-spawned'
  readonly fruit: FruitType
  readonly points: number
}

/** The bonus fruit was eaten before it expired. */
export interface FruitEatenEvent {
  readonly type: 'fruit-eaten'
  readonly fruit: FruitType
  readonly points: number
}

/** The bonus fruit's on-screen timer ran out unclaimed. */
export interface FruitExpiredEvent {
  readonly type: 'fruit-expired'
}

/** Pac-Man was caught by a non-frightened ghost — a life is spent (or this
 *  was the last one; `game-over` follows separately once lives reach 0). */
export interface PacDiedEvent {
  readonly type: 'pac-died'
}

/** Score crossed the extra-life threshold (`LEVELS`/`EXTRA_LIFE_SCORE`,
 *  Dossier default 10 000; honest-uncited, see glossary.md §Scoring). Fires
 *  exactly once per game. */
export interface ExtraLifeEvent {
  readonly type: 'extra-life'
}

/** All 240 dots (+4 energizers) cleared — the level is about to advance. */
export interface LevelClearedEvent {
  readonly type: 'level-cleared'
  readonly level: number
}

/** Lives reached 0. Terminal for this round. */
export interface GameOverEvent {
  readonly type: 'game-over'
}

/** The final score qualifies for the persisted high-score table — the shell
 *  opens name entry (`@shared/name-entry`) in response. */
export interface HighScoreQualifiedEvent {
  readonly type: 'high-score-qualified'
}

export type GameEvent =
  | DotEatenEvent
  | EnergizerEatenEvent
  | GhostEatenEvent
  | FruitSpawnedEvent
  | FruitEatenEvent
  | FruitExpiredEvent
  | PacDiedEvent
  | ExtraLifeEvent
  | LevelClearedEvent
  | GameOverEvent
  | HighScoreQualifiedEvent
