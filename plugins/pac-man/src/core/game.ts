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
import { createHouseState, releaseFromHouse, forceLeaveHouse, type HouseState } from './house'
import { targetTile, SCATTER_CORNER } from './targeting'
import {
  createModeState,
  stepMode,
  frightenedTurn,
  elroyStage as computeElroyStage,
  type ModeState,
} from './mode'
import { levelRow, FRUIT_SPAWN_DOTS, FRIGHTENED_GHOST_SPEED_PCT, type LevelFruit } from './level'
import { advancePhase } from './phase'
import { isIntermissionLevel, INTERMISSION_MUSIC } from './intermission'
import { autoPlayDir } from './attract'
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

/** pm4-6: how long the READY! freeze holds before the sim moves, in frames.
 *  The ROM plays the start jingle over READY! and only releases the actors when
 *  it ends — so the freeze IS the intro's length. The intro streams are baked
 *  byte-for-byte in `src/shell/tune.ts` (glossary.md §Music: bass 256 frames,
 *  melody 248), so 256 frames ≈ 4.2 s @ 60 Hz matches the jingle. Honest-uncited
 *  cadence — no isolable ROM duration literal, same policy as FRUIT_VISIBLE_FRAMES;
 *  it derives from the §Music-cited intro length, not a fabricated `pacman.asm`
 *  address. (pm4-7 REUSES this hold for the post-death / post-level-clear READY
 *  it hands off to; a distinct, shorter post-death READY is deferred — the
 *  arcade's post-death delay is shorter than the full opening jingle, but no test
 *  requires it and adding a second cadence is out of pm4-7's minimal scope.) */
export const READY_HOLD_FRAMES = 256

/** pm4-7: how long the DYING freeze holds before Pac respawns, in frames. The
 *  death animation (Pac collapses) plays over a still sim, then the round
 *  restarts. Honest-uncited cadence — the quarry carries no isolable death-delay
 *  literal (glossary §-, no docs/rom-study/claims timing entry; TEA confirmed at
 *  pm4-7 RED), same policy as READY_HOLD_FRAMES / FRUIT_VISIBLE_FRAMES. ~2s @ 60Hz. */
export const DYING_HOLD_FRAMES = 120

/** pm4-7: how long the LEVEL-CLEAR freeze holds before advancing, in frames.
 *  The board freezes on a static frame (accessibility: NO full-screen flash —
 *  pm4-1 removed the strobe and this MUST NOT reintroduce it), then the next
 *  maze loads. Honest-uncited cadence, same policy/reason as DYING_HOLD_FRAMES.
 *  ~2s @ 60Hz. */
export const LEVEL_CLEAR_HOLD_FRAMES = 120

/** pm6-1: how long the between-rounds coffee-break INTERMISSION holds before the
 *  next round's READY, in frames. A placeholder window here — pm6-1 is the PHASE +
 *  trigger only, so the break is a static hold (accessibility: NO flash — Decision
 *  B, the same freeze-not-strobe rule as LEVEL_CLEAR_HOLD_FRAMES); pm6-2/pm6-3 lay
 *  the scripted actor animations over this window and pin the real, RED-anchored
 *  duration. Honest-uncited cadence, same policy as LEVEL_CLEAR_HOLD_FRAMES. ~5s @
 *  60Hz. */
export const INTERMISSION_HOLD_FRAMES = 300

/** pm4-10: how long GAME OVER holds on screen before the cabinet times out back
 *  to attract, in frames — closing the MAINLINE loop (attract -> ready -> play ->
 *  game-over -> attract) and replacing main.ts's old manual Enter-to-restart. The
 *  ROM master-state dispatch at #4e00 pins the game-over -> attract MECHANISM
 *  (glossary.md §Cabinet state machine; pacman.asm:0195 read / :0984,:269a,:318c
 *  writes), NOT an isolable duration literal — so, exactly like READY_HOLD_FRAMES /
 *  DYING_HOLD_FRAMES / LEVEL_CLEAR_HOLD_FRAMES, this is an honest-uncited shell-timing
 *  choice, not a fabricated pacman.asm address. If the run qualified, the name-entry
 *  screen PAUSES this hold until the initials are confirmed (stepGame's game-over
 *  branch), so it counts only from a null or confirmed entry. ~3s @ 60Hz. */
export const GAME_OVER_HOLD_FRAMES = 180

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

// pm4-3: an eaten ghost's eyes travel home, regenerate a body, and leave.
// `'eyes'` = the eyes-only body descending to `EYES_HOME_TILE`; `'regenerated'`
// = a re-formed body climbing back out through the gate to `EYES_EXIT_TILE`.
// `null` = an ordinary in-play ghost. Eyes move fast (Dossier ch.4 "Ghosts";
// no isolable pacman.asm literal — glossary "Citation status"). Home/exit tiles
// read straight off the current maze geometry (gate row 15, interior 16-18,
// from pm4-4): `EYES_HOME_TILE` is a house-interior tile, `EYES_EXIT_TILE` the
// corridor tile just above the gate.
type ReturnPhase = 'eyes' | 'regenerated'
const EYES_SPEED_PCT = 100 // eyes are not speed-throttled — they move every frame
const EYES_HOME_TILE: Tile = { x: 13, y: 17 } // inside the house (rows 16-18)
const EYES_EXIT_TILE: Tile = { x: 13, y: 14 } // corridor just above the gate

const HIGH_SCORE_DOMAIN = 'level' as const
export type PacHighScoreTable = HighScoreTable<typeof HIGH_SCORE_DOMAIN>

// pm4-5: the full cabinet lifecycle (was `'playing' | 'game-over'`). The pure
// transition machine over these phases lives in ./phase.ts (`advancePhase`),
// mirroring the ROM master-state byte #4e00 dispatch (pacman.asm:0195 read;
// :0984/:269a/:318c writes). `createGameState` now boots into `'attract'` (pm4-6
// flipped the start and wired the start-input reseed; pm4-8 made attract self-play;
// pm4-9 paints the attract screen), and pm4-7 wired the `dying`/`level-clear`
// freeze. pm4-5 widened the type and provided the machine.
export type GamePhase =
  | 'attract'
  | 'ready'
  | 'playing'
  | 'dying'
  | 'level-clear'
  | 'intermission'
  | 'game-over'

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
  /** pm4-3: per-ghost eyes-return phase. `null` for an ordinary in-play ghost;
   *  `'eyes'`/`'regenerated'` while an eaten ghost is returning home and coming
   *  back out. The shell renders the eyes-only `'eaten'` body while `'eyes'`. */
  returning: Record<GhostId, ReturnPhase | null>
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
  /** pm4-6: frames elapsed in the current READY! hold. Reset to 0 each time the
   *  cabinet enters `ready` (a start/coin from attract); counts up while `ready`
   *  and releases the sim once it reaches `READY_HOLD_FRAMES`. Meaningless (and
   *  untouched) outside `ready`. */
  readyFrames: number
  /** pm4-7/pm6-1: frames elapsed in the current freeze pause (`dying`,
   *  `level-clear` or `intermission` — never more than one at a time, they are
   *  mutually exclusive phases). Reset to 0 on entry to each; counts up while
   *  frozen and releases (respawn / advanceLevel / next-round, then `ready`) once
   *  it reaches DYING_HOLD_FRAMES / LEVEL_CLEAR_HOLD_FRAMES / INTERMISSION_HOLD_FRAMES.
   *  Meaningless (and untouched) outside those phases. */
  freezeFrames: number
  /** pm4-10: frames elapsed in the current GAME OVER hold. Reset to 0 on entry to
   *  `game-over`; counts up ONLY while the name-entry screen is null or confirmed
   *  (an open, unconfirmed initials screen pauses it), and times out to attract
   *  once it reaches GAME_OVER_HOLD_FRAMES. Meaningless (and untouched) outside
   *  `game-over`. Mirrors `readyFrames`/`freezeFrames`. */
  gameOverFrames: number
  highScoreTable: PacHighScoreTable
  nameEntry: NameEntryState | null
  events: GameEvent[]
}

export interface GameInput {
  dir: Dir
  /** pm4-6: a start/coin was pressed this frame. Advances `attract -> ready`
   *  (reseeding a fresh board); inert in every other phase — the ROM gates the
   *  start on the credit count (`pacman.asm:061e` reads `(#4e6e)` Credits) and
   *  shows the credit/PUSH-START message table on the attract screen
   *  (`pacman.asm:36a7`, the "1 CREDIT" entry, siblings FREE PLAY / PLAYER ONE). */
  start?: boolean
}

function atTileCentre(xPx: number, yPx: number): boolean {
  return xPx % TILE_PX === 0 && yPx % TILE_PX === 0
}

/** pm4-3: is this ghost currently returning home (eyes in transit, or a
 *  regenerated body climbing back out)? True from the moment it is eaten until
 *  it is fully back in play outside the house. The shell uses it to render the
 *  eyes-only `'eaten'` body and to keep drawing the ghost while it is not
 *  `released`. */
export function isReturningHome(state: GameState, id: GhostId): boolean {
  return state.returning[id] !== null
}

/** pm4-3: advance one eyes-returning ghost by a single step. `'eyes'` descend
 *  to `EYES_HOME_TILE` inside the house; on arrival the ghost REGENERATES (a
 *  body, facing up) and is forced out of the house — NOT dot-gated
 *  (`forceLeaveHouse`). The `'regenerated'` body then climbs to
 *  `EYES_EXIT_TILE`; once it stands on a tile that is neither house nor gate it
 *  is fully back in play and its return phase clears. Reuses `stepGhost`'s
 *  kinematics — pure and deterministic, no random walk. */
function stepEyes(state: GameState, id: GhostId): void {
  const ghost = state.ghosts[id]
  if (state.returning[id] === 'eyes') {
    stepGhost(ghost, EYES_HOME_TILE, {})
    const tx = Math.round(ghost.actor.xPx / TILE_PX)
    const ty = Math.round(ghost.actor.yPx / TILE_PX)
    if (atTileCentre(ghost.actor.xPx, ghost.actor.yPx) && tx === EYES_HOME_TILE.x && ty === EYES_HOME_TILE.y) {
      state.returning[id] = 'regenerated'
      ghost.actor.dir = 'up' // re-formed body heads straight up and out the gate
      forceLeaveHouse(state.house, id)
    }
    return
  }
  // 'regenerated': climb back out through the gate.
  stepGhost(ghost, EYES_EXIT_TILE, {})
  const tx = Math.round(ghost.actor.xPx / TILE_PX)
  const ty = Math.round(ghost.actor.yPx / TILE_PX)
  const kind = tileAt(tx, ty)
  if (atTileCentre(ghost.actor.xPx, ghost.actor.yPx) && kind !== 'house' && kind !== 'gate') {
    state.returning[id] = null
  }
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
    returning: { blinky: null, pinky: null, inky: null, clyde: null },
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
    // pm4-6: the cabinet boots into ATTRACT (was 'playing'). A start/coin then
    // reseeds and enters READY before play — the ROM master-state dispatch
    // (phase.ts, glossary.md §Cabinet state machine). Until then the whole sim
    // is frozen, so Blinky (released from frame 0, house.ts) does NOT wander the
    // attract maze.
    phase: 'attract',
    readyFrames: 0,
    freezeFrames: 0,
    gameOverFrames: 0,
    highScoreTable,
    nameEntry: null,
    events: [],
  }
}

/** pm4-6: a start/coin from `attract` — reseed a fresh board (createGameState,
 *  keeping the persisted high-score table and the seed) and enter the READY!
 *  hold. This is the reseed AC2 asks for; the freeze that follows runs the intro
 *  before the sim moves. */
function startCabinet(state: GameState): void {
  Object.assign(state, createGameState(state.seed, state.highScoreTable))
  state.phase = 'ready'
  state.readyFrames = 0
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
  state.returning = { blinky: null, pinky: null, inky: null, clyde: null }
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
  state.returning = { blinky: null, pinky: null, inky: null, clyde: null }
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

  // ── pm4-6: the cabinet MAINLINE — START/coin -> READY -> PLAY ────────────
  // The real-player sim runs in `playing`. `game-over`, `ready`, `dying` and
  // `level-clear` freeze it: nothing moves — not Pac, not the ghosts (Blinky is
  // released from frame 0), not the dot count. `attract` used to freeze too, but
  // pm4-8 runs the SELF-PLAYING DEMO there — the auto-player drives the SAME sim
  // (see the attract branch below). Each edge here feeds the pure pm4-5 machine
  // (`advancePhase`, phase.ts) the one signal it owns and applies that edge's
  // side effect. `dying`/`level-clear` (their freeze + advanceLevel) are pm4-7;
  // `game-over -> attract` (the timeout) is pm4-10.
  if (state.phase === 'game-over') {
    // pm4-10: the GAME OVER hold, then the TIMEOUT back to attract — the last
    // unhooked edge of the pm4-5 machine, closing the MAINLINE loop (main.ts's
    // manual Enter-to-restart is retired). The sim stays FROZEN (no
    // stepPlayingSim): the final board holds still under the GAME OVER text.
    //
    // Name-entry gate ("name-entry done, THEN timeout", design §3): while a
    // qualifying run's initials screen is OPEN and unconfirmed the timeout is
    // PAUSED indefinitely — the cabinet waits for the player. Only a null or
    // CONFIRMED entry counts, so pre-confirm frames never bank and the full
    // window runs FROM confirmation. On expiry, reseed a fresh attract board
    // (keeping seed + the persisted high-score table) — the same reseed idiom as
    // startCabinet / the attract self-exit above.
    const entryOpen = state.nameEntry !== null && !state.nameEntry.confirmed
    if (!entryOpen) {
      state.gameOverFrames += 1
      state.phase = advancePhase('game-over', { overExpired: state.gameOverFrames >= GAME_OVER_HOLD_FRAMES })
      if (state.phase === 'attract') {
        Object.assign(state, createGameState(state.seed, state.highScoreTable))
      }
    }
    return
  }
  if (state.phase === 'attract') {
    // A start/coin advances attract -> ready AND reseeds a fresh board (pm4-6).
    // The joystick does NOT: the ROM gates the exit on the credit count
    // (pacman.asm:061e reads (#4e6e) Credits), so a bare direction press is inert.
    if (advancePhase('attract', { startRequested: !!input.start }) === 'ready') {
      startCabinet(state)
      return
    }
    // pm4-8: no coin -> the SELF-PLAYING DEMO. The seeded auto-player drives Pac
    // (input.dir is ignored — the stick is inert in attract) and the SAME sim runs,
    // reusing stepGhost for the ghost AI. Like mc6-4 (missile-command game.ts:428)
    // the demo is PINNED to attract: if the auto-player's Pac is caught the sim
    // would flip to dying/game-over, so on any such flip we reseed a fresh demo
    // board — the attract loop plays on forever and never self-exits to real play.
    stepPlayingSim(state, { dir: autoPlayDir(state.pac) })
    if (state.phase !== 'attract') {
      Object.assign(state, createGameState(state.seed, state.highScoreTable))
    }
    return
  }
  if (state.phase === 'ready') {
    // The READY! freeze: hold the sim for READY_HOLD_FRAMES (the intro plays),
    // then advance ready -> playing. The intro runs BEFORE the sim moves.
    state.readyFrames += 1
    state.phase = advancePhase('ready', { readyExpired: state.readyFrames >= READY_HOLD_FRAMES })
    return
  }
  if (state.phase === 'dying') {
    // pm4-7: the death-anim freeze. Hold the WHOLE sim for DYING_HOLD_FRAMES (a
    // static frame — nothing moves), then respawn Pac and hand off to the READY
    // hold. Replaces the old instant respawnAfterDeath: the reset is DEFERRED to
    // this dying -> ready edge, so the death window is visible before the round
    // restarts. Feeds the pure pm4-5 machine the one signal it owns.
    state.freezeFrames += 1
    state.phase = advancePhase('dying', { deathExpired: state.freezeFrames >= DYING_HOLD_FRAMES })
    if (state.phase === 'ready') {
      respawnAfterDeath(state)
      state.readyFrames = 0
    }
    return
  }
  if (state.phase === 'level-clear') {
    // pm4-7: the level-clear freeze. Hold a STATIC frame for
    // LEVEL_CLEAR_HOLD_FRAMES — the accessibility-critical "freeze, NO flash"
    // (pm4-1 deleted the full-screen strobe; this must not bring it back) — then
    // run the DEFERRED advanceLevel and hand off to READY on the next level.
    //
    // pm6-1 (Decision A): a coffee-break round diverts to `intermission` instead
    // of straight to `ready`. `intermissionDue` reads the COMPLETED round —
    // `state.level` is still the cleared level here (advanceLevel is deferred),
    // so it must be sampled BEFORE the advance below (else a round-2 clear would
    // check round 3). On the divert we advance the board now (the next round
    // loads behind the break) and request the pm2 looping intermission music
    // (#02, CONSUMED — the shell audio plays it off the event).
    state.freezeFrames += 1
    const clearExpired = state.freezeFrames >= LEVEL_CLEAR_HOLD_FRAMES
    const intermissionDue = isIntermissionLevel(state.level)
    state.phase = advancePhase('level-clear', { clearExpired, intermissionDue })
    if (state.phase === 'intermission') {
      advanceLevel(state)
      state.freezeFrames = 0
      state.events.push({ type: 'intermission-started', music: INTERMISSION_MUSIC })
    } else if (state.phase === 'ready') {
      advanceLevel(state)
      state.readyFrames = 0
    }
    return
  }
  if (state.phase === 'intermission') {
    // pm6-1: the between-rounds coffee break. A STATIC hold (Decision B — freeze,
    // NO flash, exactly like level-clear) for INTERMISSION_HOLD_FRAMES; the next
    // round's board is already loaded (advanceLevel ran on entry), so on expiry
    // the machine simply hands off to that round's READY. pm6-2/pm6-3 lay the
    // scripted actor animations over this window.
    state.freezeFrames += 1
    state.phase = advancePhase('intermission', {
      intermissionExpired: state.freezeFrames >= INTERMISSION_HOLD_FRAMES,
    })
    if (state.phase === 'ready') {
      state.readyFrames = 0
    }
    return
  }

  // pm4-6/pm4-8: past the phase gate, the sim proper runs. In `playing` it runs
  // once on the real input; in `attract` the demo drove it above (same body), so
  // the attract demo can never drift from real play.
  stepPlayingSim(state, input)
}

/** The PLAYING sim proper: Pac movement + eating, fruit, the mode engine, the
 *  ghost movement loop (reusing `stepGhost`), Pac/ghost collision, and the
 *  level-clear edge. Extracted from `stepGame` (pm4-8) so the attract auto-player
 *  can run the IDENTICAL simulation without duplicating it. `input.dir` drives
 *  Pac — the real joystick in `playing`, the auto-player's route in `attract`. */
function stepPlayingSim(state: GameState, input: GameInput): void {
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
    // pm4-3: eyes-returning ghosts move even though they are not `released`.
    if (!state.house.released[id] && state.returning[id] === null) continue
    const ghost = state.ghosts[id]

    // pm4-3: an eaten ghost's eyes travel home and its regenerated body climbs
    // back out — its own fast, deterministic path, independent of chase/scatter
    // targeting and the dot-gated release.
    if (state.returning[id] !== null) {
      const eyesPattern = speedPattern(EYES_SPEED_PCT)
      state.ghostFrame[id] += 1
      if (eyesPattern[state.ghostFrame[id] % eyesPattern.length]) stepEyes(state, id)
      continue
    }

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
    // pm4-3: a returning ghost (eyes, or a regenerated body still in the house)
    // cannot eat or be eaten — it is out of play until it fully re-exits.
    if (state.returning[id] !== null) continue
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
      // pm4-3: the ghost becomes EYES that travel home from HERE (no instant
      // teleport). It leaves play (`released=false`, so it can neither be
      // re-eaten nor catch Pac-Man in transit) and regenerates at the house,
      // then leaves forcibly — see the eyes branch in the movement loop.
      state.returning[id] = 'eyes'
      state.house.released[id] = false
    } else {
      state.lives -= 1
      state.events.push({ type: 'pac-died' })
      // pm4-7: route the death edge through the pure pm4-5 machine (same as the
      // level-clear entry below) — advancePhase picks game-over (last life) vs
      // dying (a life left) from livesRemaining, mirroring the ROM master-state
      // dispatch. game-over ends the run; dying begins the death-anim freeze and
      // DEFERS the respawn to the dying -> ready edge in the sim gate above.
      state.phase = advancePhase('playing', { pacDied: true, livesRemaining: state.lives })
      if (state.phase === 'game-over') {
        state.events.push({ type: 'game-over' })
        state.gameOverFrames = 0 // pm4-10: start the GAME OVER hold clean (mirrors dying's freezeFrames reset)
        const qualifies = qualifiesForHighScore(state.highScoreTable, state.score)
        if (qualifies) {
          // Name entry rides the STATE contract — the shell opens it off
          // `state.nameEntry` (main.ts) via @shared/name-entry. No event is
          // emitted: a parallel `high-score-qualified` event had no consumer
          // and was removed in pm5-3.
          state.nameEntry = { qualifies: true, buffer: '', confirmed: false }
        }
      } else {
        state.freezeFrames = 0
      }
    }
    break // one collision resolved per frame — see file header.
  }

  // ── Level clear ────────────────────────────────────────────────────
  // pm4-7: enter the LEVEL-CLEAR freeze instead of advancing instantly — the
  // static-frame hold runs first (sim gate) and advanceLevel is DEFERRED to the
  // level-clear -> ready edge. STILL gated on `playing`, which is what makes a
  // same-frame death win the tie: the collision above already set phase='dying',
  // so this block is skipped and no advance / level-cleared fires (lang-review
  // #14 — the edge is taken at the single exit where both triggers are visible).
  if (state.phase === 'playing' && state.dotsEaten >= DOT_COUNT) {
    state.events.push({ type: 'level-cleared', level: state.level })
    state.phase = advancePhase('playing', { allDotsEaten: true })
    state.freezeFrames = 0
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
