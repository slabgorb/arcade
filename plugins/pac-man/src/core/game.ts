// src/core/game.ts
//
// Story pm1-8 (Julia) — the round lifecycle: composes every earlier core
// module (maze, pacman, ghost, house, targeting, mode, level) into one
// playable game, and is the ONLY place that decides score, lives, level
// advance and game-over. PURE: no DOM, no wall clock, no Math.random, no
// timers, no shell import — the only entropy is the seeded `@shared/rng`
// carried inside `ModeState` (reused for the frightened random-turn choice
// here too, so the whole game runs off ONE seeded generator, never a second
// independent source).
//
// ─── THE SPAWN-TILE DOT-EATEN CARRY (Task 4 KNOWN CARRY, resolved here) ───
// `pacman.ts`'s eat-check only fires on tile ARRIVAL (`stepPacman`'s
// "on arriving at a new tile centre, eat..." step) — a dot sitting under
// Pac-Man's own SPAWN tile is never arrived at, so it would never be eaten
// and the level could never reach the full 240-dot count. `createGameState`
// below eats it explicitly at creation: if the spawn tile holds a dot (it
// does, in this maze), it is scored and marked in `PacmanState.eaten`
// immediately, exactly as if Pac-Man had just landed there — never a second,
// divergent bookkeeping path.
//
// ─── SPAWN TILE COORDINATES (implementation choice, not ROM-cited) ────────
// `src/core/maze.ts`'s row table is already a faithful-STYLE reconstruction
// of the arcade maze shape, not a byte-identical tile-RAM transcription (see
// that file's own header) — there is no ROM literal to decode a "Pac-Man
// spawns at tile X" fact from. The coordinates below were read off this
// port's own maze via `tileAt`/`isWalkable` (verified walkable, verified
// inside/outside the house as appropriate) and chosen to match the classic
// LAYOUT (ghosts start in the house, Blinky waits just above the gate,
// Pac-Man starts well below it) without claiming a citation that does not
// exist.
//
// ─── SCOPE / DELIBERATE DESCOPES (stated, not hidden) ─────────────────────
//  • Level-clear condition is "all 240 REGULAR dots eaten" (`maze.ts`'s
//    `DOT_COUNT`), matching this task's own brief and TDD list verbatim —
//    energizers are tracked and scored but are not required for the level to
//    clear. `maze.ts` documents `DOT_COUNT` as exactly this "regular,
//    non-energizer" count for the same reason.
//  • No death/level-clear PAUSE animation — this task's scope is the round
//    LIFECYCLE (score/lives/level/game-over), not presentation; a future
//    shell task can layer a pause on the `pac-died`/`level-cleared` events
//    this module already emits without changing this module.
//  • Cruise Elroy IS wired to a ghost speed bump for BLINKY ONLY:
//    `mode.ts`'s `elroyStage(dotsRemaining, level)` selects `level.ts`'s
//    `elroy1SpeedPct`/`elroy2SpeedPct` (Dossier Table A.1 figures, honest-
//    uncited — glossary.md §Level table, same status as `ghostSpeedPct`
//    itself) in place of Blinky's normal `ghostSpeedPct`. Deliberately NOT
//    wired: the ROM's `pacman.asm:20d7` "suppressed until Clyde has left the
//    house" gate — that nuance is out of this round's scope (pm2).
//  • Frightened Pac-Man speed is not modelled — Pac-Man's speed pattern is
//    the level's `pacSpeedPct` at all times, matching the honest-uncited
//    Dossier figures already in `level.ts`/`glossary.md` §Speeds, which give
//    only the "normal" figure.

import { tileAt, isWalkable, DOT_COUNT, type Tile } from './maze'
import { TILE_PX, DIR_DELTA, speedPattern, type Dir } from './actor'
import { createPacmanState, stepPacman, type PacmanState } from './pacman'
import { type GhostId, type Ghost, stepGhost } from './ghost'
import { createHouseState, releaseFromHouse, type HouseState } from './house'
import { targetTile, SCATTER_CORNER } from './targeting'
import {
  createModeState,
  stepMode,
  frightenedTurn,
  elroyStage as computeElroyStage,
  type ModeState,
} from './mode'
import { levelRow, FRUIT_SPAWN_DOTS, FRIGHTENED_GHOST_SPEED_PCT, type LevelFruit } from './level'
import type { GameEvent } from './events'
import { qualifiesForHighScore, insertHighScore, type HighScoreTable } from '@shared/highscore'
import { stepNameEntry } from '@shared/name-entry'

// ─── SCORING (reused symbols/values — docs/rom-study/claims/scoring.json) ──
export const SCORE_DOT = 10 // pacman.asm:2b17 (SCORE-DOT)
export const SCORE_ENERGIZER = 50 // pacman.asm:2b19 (SCORE-ENERGIZER)
/** The ghost-eaten chain, index 0..3 — pacman.asm:2b1b/2b1d/2b1f/2b21
 *  (SCORE-GHOST1..4). Resets to index 0 on every fresh energizer. */
export const GHOST_CHAIN_SCORES: readonly number[] = [200, 400, 800, 1600]

/** RAM byte 4e6f's shipped default (claims/lives.json LIVES-PER-GAME). */
export const DEFAULT_LIVES = 3

/** Dossier default free-life score (DIP-selectable; honest-uncited —
 *  glossary.md §Scoring "Extra life": no clean pacman.asm immediate stores
 *  this value, only the DIP-driven "BONUS PAC-MAN FOR ### Pts" message
 *  template at `pacman.asm:36b9`). */
export const EXTRA_LIFE_SCORE = 10_000

/** How long the bonus fruit stays on screen once spawned, in frames.
 *  Dossier-documented as roughly 9-10 seconds; no isolable ROM literal
 *  (honest-uncited, same policy as level.ts's speed table). 9s @ 60Hz. */
export const FRUIT_VISIBLE_FRAMES = 9 * 60

const GHOST_IDS: readonly GhostId[] = ['blinky', 'pinky', 'inky', 'clyde']
const DIR_LIST: readonly Dir[] = ['up', 'left', 'down', 'right']
const REVERSE_DIR: Readonly<Record<Dir, Dir>> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
  none: 'none',
}

// Implementation-choice spawn tiles — see file header.
const PACMAN_SPAWN: Tile = { x: 9, y: 23 }
const GHOST_SPAWN: Readonly<Record<GhostId, Tile>> = {
  blinky: { x: 13, y: 14 }, // outside the house, just above the gate
  pinky: { x: 13, y: 17 },
  inky: { x: 11, y: 17 },
  clyde: { x: 15, y: 17 },
}
const GHOST_START_DIR: Readonly<Record<GhostId, Dir>> = {
  blinky: 'left',
  pinky: 'up',
  inky: 'up',
  clyde: 'up',
}
const FRUIT_TILE: Tile = { x: 13, y: 20 } // just below the ghost house gate

const HIGH_SCORE_DOMAIN = 'level' as const
export type PacHighScoreTable = HighScoreTable<typeof HIGH_SCORE_DOMAIN>

export type GamePhase = 'playing' | 'game-over'

export interface FruitState {
  readonly fruit: LevelFruit
  readonly tile: Tile
  framesRemaining: number
}

/** The game-over initials screen, open only while `phase === 'game-over'`
 *  and the run qualifies. Mirrors centipede's `InitialsEntry` shape, minus
 *  the timeout (this cabinet has no attract mode to fall back to yet). */
export interface NameEntryState {
  readonly qualifies: boolean
  buffer: string
  confirmed: boolean
}

export interface GameState {
  seed: number
  level: number
  pac: PacmanState
  ghosts: Record<GhostId, Ghost>
  /** Per-ghost speed-pattern cursor — ghosts have no built-in speed control
   *  (ghost.ts's `stepGhost` moves exactly 1px whenever called), so the
   *  per-level `ghostSpeedPct` is realised here via `speedPattern`, mirroring
   *  how `pacman.ts` already gates its own movement. */
  ghostFrame: Record<GhostId, number>
  /** A mode-change reversal request latched per ghost (fix for the review
   *  finding: `stepMode`'s `reverseSignal` is a ONE-FRAME pulse, but a ghost
   *  sits at a tile centre only ~1 frame in 8 and may also be speed-gated
   *  off on the pulse frame — applying `forceReverse` only on that exact
   *  frame silently drops most mode-change reversals). Set to `true` for
   *  every ghost the instant `reverseSignal` fires (regardless of that
   *  ghost's speed gate or position that frame); consumed — forced and
   *  cleared — the NEXT time that specific ghost reaches a tile centre and
   *  makes a turn decision, matching the ROM's "the reversal takes effect at
   *  the next turn decision" behaviour. */
  pendingReverse: Record<GhostId, boolean>
  house: HouseState
  mode: ModeState
  dotsEaten: number
  pelletsEaten: number
  score: number
  lives: number
  extraLifeAwarded: boolean
  fruitSpawned: readonly boolean[]
  fruit: FruitState | null
  ghostChainIndex: number
  phase: GamePhase
  highScoreTable: PacHighScoreTable
  nameEntry: NameEntryState | null
  events: GameEvent[]
}

export interface GameInput {
  dir: Dir
}

function atTileCentre(xPx: number, yPx: number): boolean {
  return xPx % TILE_PX === 0 && yPx % TILE_PX === 0
}

function tileKey(tx: number, ty: number): string {
  return `${tx},${ty}`
}

function createGhosts(): Record<GhostId, Ghost> {
  const ghosts = {} as Record<GhostId, Ghost>
  for (const id of GHOST_IDS) {
    const spawn = GHOST_SPAWN[id]
    ghosts[id] = { id, actor: { xPx: spawn.x * TILE_PX, yPx: spawn.y * TILE_PX, dir: GHOST_START_DIR[id], pending: 'none' } }
  }
  return ghosts
}

function resetGhostPositions(ghosts: Record<GhostId, Ghost>): void {
  for (const id of GHOST_IDS) {
    const spawn = GHOST_SPAWN[id]
    ghosts[id].actor.xPx = spawn.x * TILE_PX
    ghosts[id].actor.yPx = spawn.y * TILE_PX
    ghosts[id].actor.dir = GHOST_START_DIR[id]
    ghosts[id].actor.pending = 'none'
  }
}

/** Eat the spawn tile's dot/energizer immediately, if there is one — the
 *  spawn-tile-arrival carry fix (file header). Mutates `pac` and returns the
 *  score awarded (0 if the spawn tile carries nothing collectible). */
function eatSpawnTileIfAny(pac: PacmanState): { score: number; dots: number; pellets: number } {
  const kind = tileAt(PACMAN_SPAWN.x, PACMAN_SPAWN.y)
  const key = tileKey(PACMAN_SPAWN.x, PACMAN_SPAWN.y)
  if (pac.eaten.has(key)) return { score: 0, dots: 0, pellets: 0 }
  if (kind === 'dot') {
    pac.eaten.add(key)
    return { score: SCORE_DOT, dots: 1, pellets: 1 }
  }
  if (kind === 'energizer') {
    pac.eaten.add(key)
    return { score: SCORE_ENERGIZER, dots: 0, pellets: 1 }
  }
  return { score: 0, dots: 0, pellets: 0 }
}

/** Build a fresh game at level 1, lives = DEFAULT_LIVES, score 0. `seed`
 *  drives every deterministic random choice this game ever makes (frightened
 *  ghost turns) — never `Math.random`. `highScoreTable` is the persisted
 *  board the shell loaded; an empty array is a fine, valid start. */
export function createGameState(seed: number, highScoreTable: PacHighScoreTable = []): GameState {
  const level = 1
  const pac = createPacmanState(PACMAN_SPAWN.x, PACMAN_SPAWN.y, 'none', levelRow(level).pacSpeedPct)
  const spawnEat = eatSpawnTileIfAny(pac)

  return {
    seed,
    level,
    pac,
    ghosts: createGhosts(),
    ghostFrame: { blinky: 0, pinky: 0, inky: 0, clyde: 0 },
    pendingReverse: { blinky: false, pinky: false, inky: false, clyde: false },
    house: createHouseState(),
    mode: createModeState(level, seed),
    dotsEaten: spawnEat.dots,
    pelletsEaten: spawnEat.pellets,
    score: spawnEat.score,
    lives: DEFAULT_LIVES,
    extraLifeAwarded: false,
    fruitSpawned: [false, false],
    fruit: null,
    ghostChainIndex: 0,
    phase: 'playing',
    highScoreTable,
    nameEntry: null,
    events: [],
  }
}

/** Reset actor positions and per-life bookkeeping after Pac-Man is caught —
 *  dots already eaten THIS LEVEL stay eaten (`pac.eaten` is untouched); only
 *  positions, the house's release state (now the "life lost" global-counter
 *  branch, glossary.md §Ghost house) and the mode clock restart. */
function respawnAfterDeath(state: GameState): void {
  state.pac.actor.xPx = PACMAN_SPAWN.x * TILE_PX
  state.pac.actor.yPx = PACMAN_SPAWN.y * TILE_PX
  state.pac.actor.dir = 'none'
  state.pac.actor.pending = 'none'
  state.pac.pauseFrames = 0
  state.pac.frame = 0
  resetGhostPositions(state.ghosts)
  state.ghostFrame = { blinky: 0, pinky: 0, inky: 0, clyde: 0 }
  state.pendingReverse = { blinky: false, pinky: false, inky: false, clyde: false }
  // glossary.md §Ghost house: a life lost mid-level switches release checks
  // to the GLOBAL dot counter for the rest of the level.
  state.house = { ...createHouseState(), useGlobalCounter: true }
  state.mode = createModeState(state.level, state.seed + state.level * 7 + state.lives)
  state.ghostChainIndex = 0
}

/** Advance to the next level: fresh maze dots (a brand-new PacmanState, so
 *  `eaten` resets), fresh ghosts/house/mode at the new level's table row,
 *  fruit and its spawn tracking cleared. Score/lives carry over. */
function advanceLevel(state: GameState): void {
  const level = state.level + 1
  const pac = createPacmanState(PACMAN_SPAWN.x, PACMAN_SPAWN.y, 'none', levelRow(level).pacSpeedPct)
  const spawnEat = eatSpawnTileIfAny(pac)
  state.level = level
  state.pac = pac
  state.ghosts = createGhosts()
  state.ghostFrame = { blinky: 0, pinky: 0, inky: 0, clyde: 0 }
  state.pendingReverse = { blinky: false, pinky: false, inky: false, clyde: false }
  state.house = createHouseState()
  state.mode = createModeState(level, state.seed + level * 13)
  state.dotsEaten = spawnEat.dots
  state.pelletsEaten = spawnEat.pellets
  state.score += spawnEat.score
  state.fruitSpawned = [false, false]
  state.fruit = null
  state.ghostChainIndex = 0
}

function awardScore(state: GameState, points: number): void {
  state.score += points
  if (!state.extraLifeAwarded && state.score >= EXTRA_LIFE_SCORE) {
    state.extraLifeAwarded = true
    state.lives += 1
    state.events.push({ type: 'extra-life' })
  }
}

/** House-release bookkeeping: feed this frame's eaten pellet into whichever
 *  counter `house.useGlobalCounter` selects, then re-check release
 *  (house.ts's own contract — safe to call every frame, idempotent). */
function feedHouseCounter(state: GameState): void {
  if (state.house.useGlobalCounter) state.house.globalDotsEaten += 1
  else state.house.personalDotsEaten += 1
  releaseFromHouse(state.house)
}

/** One frightened-ghost step: at a tile centre, either force the one-step
 *  mode-change reversal or pick a random non-reversing walkable direction
 *  via `mode.ts`'s seeded `frightenedTurn` (glossary.md §Modes "Frightened
 *  random turn") — deliberately NOT `ghost.ts`'s target-seeking
 *  `chooseDirection` (a frightened ghost has no target to seek). Falls back
 *  to reversing only at a genuine dead end (never occurs in this maze, kept
 *  for totality, same as ghost.ts's own fallback). */
function stepGhostFrightened(ghost: Ghost, mode: ModeState, forceReverse: boolean): void {
  const { actor } = ghost
  const tx = actor.xPx / TILE_PX
  const ty = actor.yPx / TILE_PX

  if (atTileCentre(actor.xPx, actor.yPx)) {
    if (forceReverse) {
      actor.dir = REVERSE_DIR[actor.dir]
    } else {
      const forbidden = actor.dir === 'none' ? null : REVERSE_DIR[actor.dir]
      const candidates = DIR_LIST.filter((d) => {
        if (d === forbidden) return false
        const { dx, dy } = DIR_DELTA[d]
        return isWalkable(tx + dx, ty + dy, 'ghost')
      })
      const pool = candidates.length > 0 ? candidates : DIR_LIST
      actor.dir = frightenedTurn(mode.rng, pool)
    }
  }

  const { dx, dy } = DIR_DELTA[actor.dir]
  if (dx === 0 && dy === 0) return
  if (atTileCentre(actor.xPx, actor.yPx)) {
    if (!isWalkable(tx + dx, ty + dy, 'ghost')) return
  }
  actor.xPx += dx
  actor.yPx += dy
}

/** Advance the whole game by exactly one frame. Mutates `state` (this
 *  codebase's step-mutates-state convention — pacman.ts/ghost.ts/mode.ts all
 *  do the same). `state.events` is REPLACED each call with exactly this
 *  frame's events (never accumulated across frames — the caller reads it
 *  once per step, same shape as centipede's `SimState.events`). */
export function stepGame(state: GameState, input: GameInput): void {
  state.events = []

  if (state.phase === 'game-over') return

  // ── Pac-Man movement + dot/energizer eating ──────────────────────────
  const prevEaten = state.pac.eaten.size
  stepPacman(state.pac, { dir: input.dir })
  let energizerEatenThisFrame = false
  if (state.pac.eaten.size > prevEaten) {
    const ptx = state.pac.actor.xPx / TILE_PX
    const pty = state.pac.actor.yPx / TILE_PX
    const kind = tileAt(ptx, pty)
    state.pelletsEaten += 1
    if (kind === 'dot') {
      state.dotsEaten += 1
      awardScore(state, SCORE_DOT)
      state.events.push({ type: 'dot-eaten', score: SCORE_DOT })
    } else if (kind === 'energizer') {
      awardScore(state, SCORE_ENERGIZER)
      state.ghostChainIndex = 0
      energizerEatenThisFrame = true
      state.events.push({ type: 'energizer-eaten', score: SCORE_ENERGIZER })
    }
    feedHouseCounter(state)
  }

  // ── Fruit spawn (dot-eaten thresholds, pacman.asm:0eba/0ebe) ──────────
  FRUIT_SPAWN_DOTS.forEach((threshold, i) => {
    if (!state.fruitSpawned[i] && state.pelletsEaten >= threshold) {
      const spawned = [...state.fruitSpawned]
      spawned[i] = true
      state.fruitSpawned = spawned
      const fruit = levelRow(state.level).fruit
      state.fruit = { fruit, tile: FRUIT_TILE, framesRemaining: FRUIT_VISIBLE_FRAMES }
      state.events.push({ type: 'fruit-spawned', fruit: fruit.type, points: fruit.points })
    }
  })

  // ── Fruit lifetime + eaten ─────────────────────────────────────────
  if (state.fruit) {
    const ptx = state.pac.actor.xPx / TILE_PX
    const pty = state.pac.actor.yPx / TILE_PX
    if (ptx === state.fruit.tile.x && pty === state.fruit.tile.y) {
      awardScore(state, state.fruit.fruit.points)
      state.events.push({ type: 'fruit-eaten', fruit: state.fruit.fruit.type, points: state.fruit.fruit.points })
      state.fruit = null
    } else {
      state.fruit.framesRemaining -= 1
      if (state.fruit.framesRemaining <= 0) {
        state.fruit = null
        state.events.push({ type: 'fruit-expired' })
      }
    }
  }

  // ── Mode engine (scatter/chase/frightened + reverse signal) ──────────
  const modeStep = stepMode(state.mode, { energizerEaten: energizerEatenThisFrame })

  // `reverseSignal` is a ONE-FRAME pulse from stepMode, but a ghost is only
  // AT a tile centre ~1 frame in 8 and may be speed-gated off on the pulse
  // frame too — applying it directly (the pre-review shape) silently drops
  // most mode-change reversals. Latch it per-ghost instead: every ghost
  // (regardless of release/speed-gate/position this frame) gets
  // `pendingReverse` armed the instant the pulse fires, and each ghost
  // consumes (forces + clears) its own flag the NEXT time IT specifically
  // reaches a tile centre and makes a turn decision — matching the ROM's
  // "reversal takes effect at the next turn decision", not an instant
  // mid-tile flip. A still-housed ghost simply carries the flag until it is
  // released and reaches its first tile centre — harmless, never lost.
  if (modeStep.reverseSignal) {
    for (const id of GHOST_IDS) state.pendingReverse[id] = true
  }

  // ── Ghosts: move only released ones, gated by the level's speed pattern ──
  const level = levelRow(state.level)
  const dotsRemaining = DOT_COUNT - state.dotsEaten
  // Cruise Elroy (pacman.asm:20d7 routine; level.ts's elroy1/2SpeedPct are the
  // Dossier-decoded speed figures, honest-uncited — glossary.md §Level table).
  // Blinky ONLY: stage 1/2 replaces his normal ghostSpeedPct as the board
  // empties. Deliberately NOT gating this on "Clyde has left the house" (the
  // ROM's `pacman.asm:20d7` suppression) — that nuance is out of this round's
  // scope (deferred to pm2); a threshold-based bump is the deliverable here.
  const blinkyElroyStage = computeElroyStage(dotsRemaining, state.level)
  for (const id of GHOST_IDS) {
    if (!state.house.released[id]) continue
    const ghost = state.ghosts[id]
    let pct: number
    if (modeStep.mode === 'frightened') {
      pct = FRIGHTENED_GHOST_SPEED_PCT
    } else if (id === 'blinky' && blinkyElroyStage >= 2) {
      pct = level.elroy2SpeedPct
    } else if (id === 'blinky' && blinkyElroyStage >= 1) {
      pct = level.elroy1SpeedPct
    } else {
      pct = level.ghostSpeedPct
    }

    // Tunnel slowdown (Dossier §Speeds): on a tunnel tile a ghost always
    // crawls at the level's tunnelSpeedPct, regardless of chase/frightened/
    // Elroy. Pac-Man is NOT slowed (his pattern stays pacSpeedPct) — only
    // ghosts. The zone is the 'tunnel'-kind tiles maze.ts marks.
    const gtileX = Math.floor(ghost.actor.xPx / TILE_PX)
    const gtileY = Math.floor(ghost.actor.yPx / TILE_PX)
    if (tileAt(gtileX, gtileY) === 'tunnel') pct = level.tunnelSpeedPct

    const pattern = speedPattern(pct)
    const frame = state.ghostFrame[id]
    state.ghostFrame[id] = frame + 1
    if (!pattern[frame % pattern.length]) continue

    // Captured BEFORE the step call, which mutates position: this is the
    // frame's turn-decision point, if any, for THIS ghost.
    const atCentreThisCall = atTileCentre(ghost.actor.xPx, ghost.actor.yPx)
    const reverseNow = state.pendingReverse[id]

    if (modeStep.mode === 'frightened') {
      stepGhostFrightened(ghost, state.mode, reverseNow)
    } else if (modeStep.mode === 'scatter') {
      // Scatter means every ghost makes for its own home corner — NOT
      // `targeting.ts`'s per-personality chase formula (that module only
      // ever implements the CHASE target; glossary.md §Ghost AI "Scatter
      // corners" documents `SCATTER_CORNER` as exactly this substitution,
      // which this round's fix wires in — its prior absence was the root
      // cause of the reported opening death cascade: every ghost beelined
      // straight at Pac-Man from frame 1 regardless of the mode engine's
      // scatter phase).
      stepGhost(ghost, SCATTER_CORNER[id], { forceReverse: reverseNow })
    } else {
      const pacTile: Tile = { x: state.pac.actor.xPx / TILE_PX, y: state.pac.actor.yPx / TILE_PX }
      const ghostTiles = {} as Record<GhostId, Tile>
      for (const gid of GHOST_IDS) {
        ghostTiles[gid] = { x: state.ghosts[gid].actor.xPx / TILE_PX, y: state.ghosts[gid].actor.yPx / TILE_PX }
      }
      const target = targetTile(id, { pacTile, pacDir: state.pac.actor.dir, ghostTiles })
      stepGhost(ghost, target, { forceReverse: reverseNow })
    }

    // Consumed: this call made this ghost's turn decision for the frame
    // (stepGhost/stepGhostFrightened both branch on `atTileCentre` first
    // thing), so a pending reversal was either just forced or was never
    // eligible this call — either way it's spent.
    if (atCentreThisCall) state.pendingReverse[id] = false
  }

  // ── Pac-Man / ghost collision ─────────────────────────────────────────
  const ptx = Math.floor(state.pac.actor.xPx / TILE_PX)
  const pty = Math.floor(state.pac.actor.yPx / TILE_PX)
  for (const id of GHOST_IDS) {
    if (!state.house.released[id]) continue
    const ghost = state.ghosts[id]
    const gtx = Math.floor(ghost.actor.xPx / TILE_PX)
    const gty = Math.floor(ghost.actor.yPx / TILE_PX)
    if (gtx !== ptx || gty !== pty) continue

    if (modeStep.mode === 'frightened') {
      const chainIndex = state.ghostChainIndex
      const points = GHOST_CHAIN_SCORES[Math.min(chainIndex, GHOST_CHAIN_SCORES.length - 1)]
      awardScore(state, points)
      state.ghostChainIndex = Math.min(chainIndex + 1, GHOST_CHAIN_SCORES.length - 1)
      state.events.push({ type: 'ghost-eaten', ghost: id, chainIndex, score: points })
      // Send the eaten ghost back to the house; releaseFromHouse re-admits
      // it once the (unchanged) counter condition is met again.
      const spawn = GHOST_SPAWN[id]
      ghost.actor.xPx = spawn.x * TILE_PX
      ghost.actor.yPx = spawn.y * TILE_PX
      ghost.actor.dir = GHOST_START_DIR[id]
      state.house.released[id] = false
    } else {
      state.lives -= 1
      state.events.push({ type: 'pac-died' })
      if (state.lives <= 0) {
        state.phase = 'game-over'
        state.events.push({ type: 'game-over' })
        const qualifies = qualifiesForHighScore(state.highScoreTable, state.score)
        if (qualifies) {
          state.nameEntry = { qualifies: true, buffer: '', confirmed: false }
          state.events.push({ type: 'high-score-qualified' })
        }
      } else {
        respawnAfterDeath(state)
      }
    }
    break // one collision resolved per frame — see file header.
  }

  // ── Level clear ────────────────────────────────────────────────────
  if (state.phase === 'playing' && state.dotsEaten >= DOT_COUNT) {
    state.events.push({ type: 'level-cleared', level: state.level })
    advanceLevel(state)
  }
}

/** One initials keydown on a qualifying game-over screen — the cabinet-wide
 *  shared verb (`@shared/name-entry`). Inert outside `game-over`/no qualifying
 *  entry/already confirmed, mirroring centipede's `enterInitial`. */
export function enterInitial(state: GameState, key: string): void {
  const entry = state.nameEntry
  if (state.phase !== 'game-over' || entry === null || !entry.qualifies || entry.confirmed) return
  entry.buffer = stepNameEntry(entry.buffer, key, 3)
}

/** Commit the typed initials into the persisted table (`@shared/highscore`).
 *  The shell calls this on Enter/confirm; a no-op if there is nothing open
 *  to confirm. */
export function confirmNameEntry(state: GameState): void {
  const entry = state.nameEntry
  if (state.phase !== 'game-over' || entry === null || !entry.qualifies || entry.confirmed) return
  entry.confirmed = true
  state.highScoreTable = insertHighScore(state.highScoreTable, {
    name: entry.buffer || '---',
    score: state.score,
    level: state.level,
  })
}
