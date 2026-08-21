// plugins/defender/src/core/sim.ts
//
// Story df3-6 (GREEN) — the pure aggregate that wires the df3 core into ONE tick.
// Story df6-1 (GREEN) EXTENDS it into the INTEGRATED game: df4/df5 built the enemy
// menagerie (mutants, baiters, bombers, pods, swarmers), the emergency powers
// (smart-bomb, hyperspace), scoring and end-of-game as isolated, unit-tested BANK
// modules that `stepSim` never constructed — so the running game played only landers.
// df6-1 WIRES them all into the live sim (the "no more deferring the integration"
// pass), which is what gives every audio cue in the SOUND TABLE a REAL, reachable
// call site — and carries the df6 audio EVENT CHANNEL (`SimState.cues`, DATA never
// callbacks — Decision C) that the shell's audio-dispatch turns into sound.
//
// PURE, clock-free src/core (tests/purity.test.ts scans it): it imports only sibling
// core modules, reads no clock, and mints no entropy — every RAND is INJECTED by the
// shell (createSim's `rand` argument). The event channel adds no RNG draw and no
// ordering change, so df3's seeded-determinism replays reproduce bit-for-bit.
//
// ─── THE ORDER OF ONE TICK (mirrors the ROM PLAYER frame) ─────────────────────────
//   1-5. ship: REV / PLAXV / VERTICAL / camera slide / stars (df3)
//   6.   powers: smart-bomb + hyperspace edges (df5-5)
//   7.   LFIRE: spawn a laser (before the dispatch, df3-5)
//   8.   update the enemy-aim player pose (world space), then DISP: sched.stepTick —
//        one dispatch pass drives EVERY process: landers, humanoids, mutants, baiters,
//        bombers, pods, swarmers, lasers and the wave director (df3/df4/df5)
//   9.   per-tick sim wiring: lander→mutant transform, lander pickup, panic freak,
//        the baiter anti-camping timer, lander shooting, and the enemy-shot travel
//  10.   COLIDE: player lasers vs every enemy (kill+score+explode+cue); enemy
//        shots/bombs/bodies vs the ship (player death); the rescue catch; the
//        astro land/hit outcomes

import { createScheduler, type Scheduler } from './scheduler.js'
import { createLaserBank, type LaserBank, type Laser } from './laser.js'
import { createEnemyBank, type EnemyBank, type Lander, type Humanoid } from './landers.js'
import { createMutantBank, type MutantBank, type Mutant } from './mutants.js'
import { createUfoBank, type UfoBank, type Ufo } from './ufo.js'
import { createBomberBank, type BomberBank, type Bomber, type Bomb } from './ties.js'
import { createSwarmerBank, type SwarmerBank, type Swarmer, SWARMER_MAX } from './swarmers.js'
import { createPodBank, type PodBank, type Pod } from './probes.js'
import { createWaveDirector, type WaveDirector } from './waves.js'
import { createEffectBank, type EffectBank, type PlacedEffect } from './effects.js'
import { laserVsObject, bombVsPlayer, shipVsObject, type CollObject, type Query, type Box } from './collision.js'
import { OBJECTS, type ObjectImage } from './objects.js'
import { initStars, stepStars, STAR_COUNT, type Star } from './stars.js'
import { DEFAULT_PCRAM } from './palette.js'
import { initColorCycle, stepColorCycle, type ColorCycleState } from './color-cycle.js'
import { decodeScrollSurface, TERRAIN } from './terrain.js'
import { slide, wrap16, projectWorldX, projectOnscreenX, shipWorldX, type Facing } from './world.js'
import { stepVelocityX, stepReverse, stepVerticalY, type RevState, type VState } from './ship.js'
import {
  createScore,
  addPoints,
  loseMan,
  ENEMY_POINTS,
  RESCUE_POINTS,
  SAFE_LANDING_POINTS,
  type ScoreState,
} from './score.js'
import { isGameOver } from './endgame.js'
import { smartBomb, canHyperspace, hyperspace, hyperspaceKilled, SMART_BOMB_FLASHES } from './powers.js'
import type { PlayerPos } from './enemy-motion.js'
import type { GameEvent } from './events.js'

/** Two 4-bit pixels per raster byte — a picture is `width×2` pixels wide (objects.ts). */
const PIXELS_PER_BYTE = 2

/** Look up a transcribed sprite picture by name (objects.ts OBJECTS), or throw — a missing
 *  picture is a build error, not a silent empty box. */
function pic(name: string): ObjectImage {
  const p = OBJECTS.find((o) => o.name === name)
  if (!p) throw new Error(`sim.ts: ${name} is not in the transcribed OBJECTS table`)
  return p
}

// The sprites each entity materializes / explodes as (df4-2 animates the object's OWN picture).
const LANDER_PICTURE = pic('LNDP1') // LNDP1, DEFB6.SRC:1947
const MUTANT_PICTURE = pic('SCZP1') // SCZP1 "schizoid", DEFB6.SRC:1896
const BAITER_PICTURE = pic('UFOP1') // UFOP1 the baiter/ufo
const BOMBER_PICTURE = pic('TIEP1') // TIEP1 the bomber, DEFB6.SRC:997
const POD_PICTURE = pic('PRBP1') // PRBP1 the pod/probe, DEFB6.SRC:1909
const SWARMER_PICTURE = pic('SWPIC1') // SWPIC1 the swarmer
const HUMANOID_PICTURE = pic('ASTP1') // ASTP1 the astronaut, DEFB6.SRC:1913
const BOMB_PICTURE = pic('BMBP1') // BMBP1 the bomber's dropped bomb/mine

/** A picture's collision box: width×2 pixels (two nibbles per byte) × height. */
function box(picture: ObjectImage): Box {
  return { width: picture.width * PIXELS_PER_BYTE, height: picture.height }
}

/** The player laser box (LASP1, 8×1, DEFB6.SRC:1940). */
const LASER_BOX: Box = { width: 8, height: 1 }
/** The player ship box (PLAPIC, 8×6) — COLCHK / bomb-vs-player (collision.ts). */
const SHIP_BOX: Box = { width: 8, height: 6 }
/** An enemy shot's box — a small aimed projectile. */
const SHOT_BOX: Box = { width: 2, height: 2 }

/** The initial ground population — PTARG := 10 astronauts (PLRES→ASTST, DEFA7.SRC:1548). */
const GROUND_HUMANOID_COUNT = 10
/** The astronaut ground row — ASTST plants each at OY16 = $E0 (DEFA7.SRC:1529-1530). */
const GROUND_HUMANOID_Y = 0xe0
/** Terrain surface resolution used to sample lander roam altitude: TDATA is 256 bytes × 8 =
 *  2048 one-bit columns spanning one world lap (0x10000), matching the render (scene.ts). */
const TERRAIN_SURFACE_COLS = 2048
/** Landers/bombers/pods appear two rows below the top (LANDER_SPAWN_Y, landers.ts). */
const SPAWN_Y = 42 + 2 // YMIN+2 (world.ts YMIN=42)

// ─── df6-1 integration magnitudes (deviations: not byte-cited ROM values) ──────────
// These pace behaviours the isolated bank modules deferred (lander shooting, the baiter
// anti-camping timer, the aimed-shot projectile model, the starting smart-bomb stock).
// They are df6-1 integration placeholders — logged as Design Deviations — chosen to make
// each moment reachable in ordinary play; the exact ROM cadences are a later df story.
/** How many frames an aimed enemy shot travels before it would reach its target. */
const SHOT_TRAVEL_FRAMES = 40
/** An aimed shot's total lifetime in frames (a little past its aim point). */
const SHOT_LIFE = 52
/** Frames between a live lander's shots (LSHOT — modeled at the sim level: landers.ts
 *  deferred LSHOT, so the integrated sim owns the lander weapon). Staggered by column. */
const LANDER_SHOOT_PERIOD = 72
/** Frames between baiter anti-camping spawns (UFOST countdown, DEFA7.SRC:1690). */
const BAITER_SPAWN_PERIOD = 480
/** At most this many baiters harry the player at once. */
const BAITER_MAX = 2
/** The player's starting smart-bomb stock (PSBC init — not transcribed into core; the
 *  df6-1 integration seeds it). */
const STARTING_SMART_BOMBS = 3
/** Post-death respawn grace, in frames. On a non-fatal death the ship reappears at its
 *  start position and is briefly invulnerable, so the hazard that killed it cannot re-kill
 *  on the very next tick — without this the resting ship death-loops to game-over in a few
 *  frames. A df6-1 integration placeholder standing in for the ROM's NEWSHP respawn
 *  sequence (PLADIE → new ship), whose exact timing/animation is a later df story. */
const RESPAWN_GRACE = 60

// ─── pt1-28: the THOUT thrust-exhaust flame tables (DEFA7.SRC:2203-2210, 3282-3288) ─────
/** THX slides over byte positions 0..THTAB_WINDOW inclusive — THPROC keeps X while
 *  `CMPX #THTAB+32 / BLS` holds and resets to THTAB past it, so the window has 33 stops. */
const THTAB_WINDOW = 32
/** THPROC advances THX one byte per `NAP 4,THPROC` slice — every 4 ticks. */
const THPROC_NAP = 4

/** The pure per-tick input snapshot the shell feeds the ship (shell owns the PIA read).
 *  df6-1 adds the two emergency-power buttons (edge-debounced in-core, like `reverse`). */
export interface Input {
  readonly thrust: boolean
  readonly reverse: boolean
  readonly up: boolean
  readonly down: boolean
  readonly fire: boolean
  // The two emergency-power buttons. OPTIONAL (default: not pressed) so a caller that
  // predates df6-1 — the df3/df4/df5 movement/wave tests — still forms a valid Input; the
  // shell's mapInput always provides them.
  readonly smartBomb?: boolean
  readonly hyperspace?: boolean
}

/** The ship's observable on-screen pose. */
export interface ShipView {
  readonly x: number
  readonly y: number
  readonly facing: Facing
  /** pt1-28: this tick's thrust button LEVEL (PIA21 bit $02) — THOUT gates the exhaust
   *  plume's extension on it at draw (scene.ts drawThrustExhaust). */
  readonly thrust: boolean
}

/** An in-flight aimed enemy shot: WORLD x, display row y, per-tick velocity, remaining life. */
export interface EnemyShot {
  readonly x: number
  readonly y: number
  readonly life: number
}

interface ShotRecord {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

/**
 * The mutable integration runtime, carried by reference across ticks (like the scheduler
 * and the banks). It holds the state the pure-reducer modules leave to the sim: the score
 * ledger, the smart-bomb latch/stock, the enemy-aim player pose, the aimed-shot list, the
 * baiter timer, the input edge latches, and this tick's cue accumulator. NOT part of the
 * SimState the shell reads — its observable projections (score/men/cues/…) are surfaced on
 * SimState each tick.
 */
interface SimRuntime {
  readonly rand: () => number
  /** The ship's current WORLD pose, updated each tick, read by the enemy-aim deps. */
  player: PlayerPos
  score: ScoreState
  smartBombs: number
  smartBombArmed: boolean
  smartBombFlash: number
  gameOver: boolean
  baiterTimer: number
  /** Frames of post-death respawn invulnerability remaining (RESPAWN_GRACE on a death). */
  respawnGrace: number
  prevSmartBomb: boolean
  prevHyperspace: boolean
  /** df6-2 — the previous-frame level of the two STATEFUL cues, so their loop edges
   *  (start on off->on, stop on on->off) are detected from state, not a module `let`.
   *  `prevThrust` is last tick's thrust button; `prevSucking` is whether ANY lander was
   *  carrying a humanoid upward (the single aggregate suck voice). */
  prevThrust: boolean
  prevSucking: boolean
  shots: ShotRecord[]
  cues: GameEvent[]
  /** Landers seen carrying (so lander-pickup fires once per abduction). */
  readonly carrying: WeakSet<object>
  /** Fallers already counted as safely landed (so astro-land fires once). */
  readonly landed: WeakSet<object>
  /** Per-lander shot countdown (LSHOT cadence), keyed by the stable Lander record. */
  readonly landerShootTimers: WeakMap<object, number>
}

/**
 * One frame of the whole Defender sim. The ship/camera/stars/lasers/enemy/effect views are
 * what the shell composer and tests read; the `_`-fields carry the state stepSim advances.
 */
export interface SimState {
  readonly ship: ShipView
  readonly camera: number
  readonly stars: readonly Star[]
  readonly lasers: readonly Laser[]
  readonly landers: readonly Lander[]
  readonly humanoids: readonly Humanoid[]
  readonly mutants: readonly Mutant[]
  readonly baiters: readonly Ufo[]
  readonly bombers: readonly Bomber[]
  readonly bombs: readonly Bomb[]
  readonly pods: readonly Pod[]
  readonly swarmers: readonly Swarmer[]
  readonly shots: readonly EnemyShot[]
  readonly effects: readonly PlacedEffect[]
  readonly wave: number
  /** df5-3 score ledger + df5-6 lives, surfaced from the runtime each tick. */
  readonly score: number
  readonly men: number
  /** Remaining smart-bomb stock (PSBC). */
  readonly smartBombs: number
  /** df5-6 end of game (men < 0). */
  readonly gameOver: boolean
  /** df6-1: the audio EVENT CHANNEL — this tick's cues, DATA on the returned state
   *  (Decision C). Rebuilt every tick, never carried forward. Empty on a fresh sim. */
  readonly cues: readonly GameEvent[]
  /** pt1-22 (ADR-0007 decision 1): the live 16-byte PCRAM colour shadow. Pure 4-bit-packed
   *  BBGGGRRR bytes (never RGBA — the shell decodes them), seeded from DEFAULT_PCRAM (the
   *  CRINIT copy) and mutated each tick by the standing colour cyclers. The shell decodes
   *  through THIS every frame instead of a module-load cache, reviving the laser/bomb/TIE/
   *  mutant colours that otherwise sit frozen at their $00 boot black. */
  readonly pcram: readonly number[]
  readonly _plaxv24: number
  readonly _rev: RevState
  readonly _vy: VState
  readonly _plax16: number
  readonly _sched: Scheduler
  readonly _laserBank: LaserBank
  readonly _enemyBank: EnemyBank
  readonly _mutantBank: MutantBank
  readonly _ufoBank: UfoBank
  readonly _bomberBank: BomberBank
  readonly _swarmerBank: SwarmerBank
  readonly _podBank: PodBank
  readonly _effectBank: EffectBank
  readonly _waveDirector: WaveDirector
  readonly _rt: SimRuntime
  /** pt1-22: the pure state of the three standing colour cyclers (COLR/CBOMB/TIECOL). */
  readonly _colorCycle: ColorCycleState
  /** pt1-28: THTAB — the RAND-seeded flame byte table (THINIT), each byte stored at i AND
   *  i+32 so THOUT's 13-byte window (offsets 0..12 off THX) never wrap-scans mid-read.
   *  Lives on state (seeded from createSim's injected rand) so composeFrame stays pure. */
  readonly _thtab: readonly number[]
  /** pt1-28: THX — the sliding byte index into _thtab (THPROC: +1 every 4 ticks, wrapping
   *  past THTAB+32). */
  readonly _thx: number
  /** pt1-28: ticks until THX next advances — THPROC's `NAP 4` countdown. */
  readonly _thnap: number
}

const INITIAL_PLAX16 = 0x2000
const INITIAL_Y = 120

const aliveOf = <T extends { alive: boolean }>(xs: readonly T[]): number => xs.filter((x) => x.alive).length

/** Seed a fresh sim. `rand` (a byte source 0..255) is injected — the shell owns entropy. */
export function createSim(rand: () => number): SimState {
  const sched = createScheduler()
  const laserBank = createLaserBank(sched)
  const effectBank = createEffectBank()

  const rt: SimRuntime = {
    rand,
    player: { x: shipWorldX(INITIAL_PLAX16, 0), y: INITIAL_Y },
    score: createScore(),
    smartBombs: STARTING_SMART_BOMBS,
    smartBombArmed: false,
    smartBombFlash: 0,
    gameOver: false,
    baiterTimer: BAITER_SPAWN_PERIOD,
    respawnGrace: 0,
    prevSmartBomb: false,
    prevHyperspace: false,
    prevThrust: false,
    prevSucking: false,
    shots: [],
    cues: [],
    carrying: new WeakSet<object>(),
    landed: new WeakSet<object>(),
    landerShootTimers: new WeakMap<object, number>(),
  }

  /** APST materialize + the enemy-appear cue — the fleet's "an enemy comes into being" seam. */
  const appear = (x: number, y: number, picture: ObjectImage): void => {
    effectBank.spawnAppear(x, y, picture)
    rt.cues.push({ type: 'enemy-appear' })
  }

  /** Aim a shot from an enemy (world x, row y) at a target (world x, row y). */
  const fireShot = (fromX: number, fromY: number, toX: number, toY: number): void => {
    const dxWorld = signedWrap16(Math.round(toX) - Math.round(fromX))
    const dyRow = toY - fromY
    rt.shots.push({
      x: fromX,
      y: fromY,
      vx: dxWorld / SHOT_TRAVEL_FRAMES,
      vy: dyRow / SHOT_TRAVEL_FRAMES,
      life: SHOT_LIFE,
    })
  }

  /** A per-type enemy fire callback: push the aimed shot and emit that enemy's SHOOT cue. */
  const makeFire = (cue: GameEvent['type']) => (fromX: number, fromY: number, toX: number, toY: number): void => {
    fireShot(fromX, fromY, toX, toY)
    rt.cues.push({ type: cue })
  }

  // The planet surface (TDATA), decoded once, gives landers their terrain-relative roam altitude
  // (GETALT): 2048 columns span one world lap (0x10000), so `worldX >> 5` picks a column. Landers
  // over different terrain roam at different altitudes — the pt1-19 fix for the synchronized row.
  const terrainBlock = TERRAIN.find((b) => b.name === 'TDATA')
  const surface = terrainBlock ? decodeScrollSurface(terrainBlock, TERRAIN_SURFACE_COLS) : null
  const groundAt = surface
    ? (worldX: number): number => surface[(wrap16(worldX) >> 5) % surface.length]
    : undefined
  const enemyBank = createEnemyBank(sched, rand, groundAt)
  const mutantBank = createMutantBank(sched, { rand, player: () => rt.player, fire: makeFire('mutant-shoot') })
  const ufoBank = createUfoBank(sched, { rand, player: () => rt.player, fire: makeFire('baiter-shoot') })
  const bomberBank = createBomberBank(sched, { rand, player: () => rt.player })
  const swarmerBank = createSwarmerBank(sched, { rand, player: () => rt.player, fire: makeFire('swarmer-shoot') })
  const podBank = createPodBank(sched, {
    rand,
    // MMSW — a killed pod bursts 1..6 swarmers at its position (probes.ts). Cap at SWCNT
    // (SWARMER_MAX), the refusal swarmers.ts deferred to its scheduler-integrated spawner.
    releaseSwarmer: (x, y) => {
      if (aliveOf(swarmerBank.swarmers) >= SWARMER_MAX) return
      swarmerBank.spawnSwarmer(x, y)
      appear(x, y, SWARMER_PICTURE)
    },
  })

  /** Spawn one enemy of `kind` at world column `x`, materializing it with an appear cue. */
  const spawnEnemyAt = (kind: 'lander' | 'bomber' | 'pod', x: number): void => {
    if (kind === 'lander') enemyBank.spawnLander(x)
    else if (kind === 'bomber') bomberBank.spawnBomber(x, SPAWN_Y)
    else podBank.spawnPod(x, SPAWN_Y)
    appear(x, SPAWN_Y, kind === 'lander' ? LANDER_PICTURE : kind === 'bomber' ? BOMBER_PICTURE : POD_PICTURE)
  }

  const spawnSpread = (kind: 'lander' | 'bomber' | 'pod', n: number): void => {
    for (let i = 0; i < n; i++) spawnEnemyAt(kind, Math.floor((i / n) * 0x10000))
  }

  /** The wave's whole attacker complement empties before the director advances — a wave is
   *  not cleared while ANY enemy stands, not just landers (the df6-1 integration widens the
   *  df5-8 lander-only population to the full menagerie). */
  const population = (): number =>
    aliveOf(enemyBank.landers) +
    aliveOf(mutantBank.mutants) +
    aliveOf(ufoBank.ufos) +
    aliveOf(bomberBank.bombers) +
    aliveOf(podBank.pods) +
    aliveOf(swarmerBank.swarmers)

  const waveDirector = createWaveDirector(sched, population, (_wave, params) => {
    if (rt.gameOver) return // the game is over — spawn no new field
    rt.cues.push({ type: 'wave-start' }) // ST1SND (a new field begins)
    spawnSpread('lander', params.counts.landers)
    spawnSpread('bomber', params.counts.ties)
    spawnSpread('pod', params.counts.probes)
  })

  // Seed the ground humanoid population (df5-10): PTARG(=10) astronauts spread across the
  // 16-bit world cylinder at the ROM's ground row. DETERMINISTIC (no entropy at spawn).
  for (let i = 0; i < GROUND_HUMANOID_COUNT; i++) {
    enemyBank.spawnHumanoid(Math.floor((i / GROUND_HUMANOID_COUNT) * 0x10000), GROUND_HUMANOID_Y)
  }

  const facing: Facing = 'right'

  // pt1-28 THINIT (DEFA7.SRC:2203-2210): fill THTAB from RAND — `JSR RAND / STA 32,X /
  // STA ,X+` over positions 0..32, each byte landing at i AND i+32 (the ,X+ store at i=32
  // last, exactly the ROM's order), so a THX anywhere in its 0..32 window reads its 13
  // bytes without wrap-scanning. Seeded AFTER initStars so the starfield keeps its
  // pre-pt1-28 layout under a given seed; every rand draw AFTER createSim shifts by 33.
  const stars = initStars(rand)
  const thtab = new Array<number>(THTAB_WINDOW * 2 + 1).fill(0)
  for (let i = 0; i <= THTAB_WINDOW; i++) {
    const b = rand()
    thtab[i + THTAB_WINDOW] = b
    thtab[i] = b
  }

  return withBanks({
    ship: { x: projectOnscreenX(INITIAL_PLAX16), y: INITIAL_Y, facing, thrust: false },
    camera: 0,
    stars,
    lasers: laserBank.lasers,
    landers: enemyBank.landers,
    humanoids: enemyBank.humanoids,
    mutants: mutantBank.mutants,
    baiters: ufoBank.ufos,
    bombers: bomberBank.bombers,
    bombs: bomberBank.bombs,
    pods: podBank.pods,
    swarmers: swarmerBank.swarmers,
    shots: [],
    effects: effectBank.effects,
    wave: waveDirector.wave,
    score: rt.score.score,
    men: rt.score.men,
    smartBombs: rt.smartBombs,
    gameOver: rt.gameOver,
    cues: [],
    // pt1-22: the live palette boots as the CRINIT copy of the default table (a fresh
    // array so the shadow is never the shared DEFAULT_PCRAM reference), and the standing
    // cyclers start ready to fire on the first tick.
    pcram: [...DEFAULT_PCRAM],
    _colorCycle: initColorCycle(),
    _thtab: thtab,
    _thx: 0, // THINIT: STX THX with X = #THTAB
    _thnap: THPROC_NAP,
    _plaxv24: 0,
    _rev: { facing, revflg: false },
    _vy: { y16: INITIAL_Y << 8, playv: 0 },
    _plax16: INITIAL_PLAX16,
    _sched: sched,
    _laserBank: laserBank,
    _enemyBank: enemyBank,
    _mutantBank: mutantBank,
    _ufoBank: ufoBank,
    _bomberBank: bomberBank,
    _swarmerBank: swarmerBank,
    _podBank: podBank,
    _effectBank: effectBank,
    _waveDirector: waveDirector,
    _rt: rt,
  })
}

/** Reproject the bank/effect/runtime snapshots onto a SimState so its views never go stale. */
function withBanks(state: SimState): SimState {
  const rt = state._rt
  return {
    ...state,
    lasers: state._laserBank.lasers,
    landers: state._enemyBank.landers,
    humanoids: state._enemyBank.humanoids,
    mutants: state._mutantBank.mutants,
    baiters: state._ufoBank.ufos,
    bombers: state._bomberBank.bombers,
    bombs: state._bomberBank.bombs,
    pods: state._podBank.pods,
    swarmers: state._swarmerBank.swarmers,
    shots: rt.shots.map((s) => ({ x: s.x, y: s.y, life: s.life })),
    effects: state._effectBank.effects,
    wave: state._waveDirector.wave,
    score: rt.score.score,
    men: rt.score.men,
    smartBombs: rt.smartBombs,
    gameOver: rt.gameOver,
    cues: rt.cues.slice(),
  }
}

/** Spawn a lander at the top, materializing it (the exported entry the visual playtest drives). */
export function spawnLander(state: SimState, x: number): SimState {
  const lander = state._enemyBank.spawnLander(x)
  if (lander) state._effectBank.spawnAppear(lander.x, lander.y, LANDER_PICTURE)
  return withBanks(state)
}

/** Place a humanoid on the terrain at (x, y). */
export function spawnHumanoid(state: SimState, x: number, y: number): SimState {
  state._enemyBank.spawnHumanoid(x, y)
  return withBanks(state)
}

/** Start an EXST explosion at (x, y) over the lander picture (the visual playtest driver). */
export function spawnExplosion(state: SimState, x: number, y: number): SimState {
  state._effectBank.spawnExplode(x, y, LANDER_PICTURE)
  return withBanks(state)
}

/** Ship death (df5-3 loseMan): decrement the men counter and re-derive game-over (df5-6
 *  isGameOver — men < 0). The public death seam the df5-7 visual playtest drives
 *  deterministically (the df4-6 spawnExplosion precedent); df6-1 keeps it exported and
 *  re-points it at the integrated runtime's score ledger (`_rt.score`, not the pre-df6-1
 *  `_score`). The in-tick death path (killPlayer, which also sounds PDSND) is separate. */
export function killShip(state: SimState): SimState {
  const rt = state._rt
  rt.score = loseMan(rt.score)
  if (isGameOver(rt.score)) rt.gameOver = true
  return withBanks(state)
}

/** Advance the sim one 60 Hz tick under `input`. */
export function stepSim(state: SimState, input: Input): SimState {
  const rt = state._rt
  rt.cues = [] // the cue channel is REBUILT each tick, never carried forward (Decision C)

  // 1-3. Ship motion (df3).
  const rev = stepReverse(state._rev, input.reverse)
  let plaxv24 = stepVelocityX(state._plaxv24, { accel: input.thrust, facing: rev.facing })
  let vy = stepVerticalY(state._vy, { up: input.up, down: input.down })
  const camera = slide({ bgl: state.camera, plax16: state._plax16, plaxv: plaxv24 >> 8, facing: rev.facing })
  let plax16 = camera.plax16
  let shipFacing = rev.facing
  let shipRow = vy.y16 >> 8

  // df6-2 — the THRUST held-loop edge (THFLG side-path, DEFA7.SRC:737-751). SNDSEQ keys
  // the sound on the TRANSITION of the thrust bit: off->on turns it ON ($16), on->off OFF
  // ($0F); a HELD button re-hits nothing. The shell routes these through startLoop/stopLoop.
  if (input.thrust && !rt.prevThrust) rt.cues.push({ type: 'thrust-start' })
  else if (!input.thrust && rt.prevThrust) rt.cues.push({ type: 'thrust-stop' })
  rt.prevThrust = input.thrust

  // pt1-28 THPROC (DEFA7.SRC:3282-3288): slide the flame window one byte per NAP-4 slice
  // (every 4 ticks), wrapping to THTAB once THX passes THTAB+32 — the flicker animation
  // the exhaust draw (scene.ts drawThrustExhaust) reads through _thtab[_thx..+12].
  let thnap = state._thnap - 1
  let thx = state._thx
  if (thnap <= 0) {
    thnap = THPROC_NAP
    thx = thx >= THTAB_WINDOW ? 0 : thx + 1
  }

  const stars = stepStars(state.stars, camera.bgl, camera.bglx, STAR_COUNT)

  let died = false
  const killPlayer = (): void => {
    if (died || rt.gameOver) return
    died = true
    rt.score = loseMan(rt.score)
    rt.cues.push({ type: 'player-death' }) // PDSND
    // pt1-25: the on-screen death — spawn the ADR-0005 player-death effect HERE (the one
    // choke point), so every death cause (enemy collision, hyperspace strand) surfaces it.
    state._effectBank.spawnScreen('player-death')
    rt.shots.length = 0 // the field's shots clear with the ship
    if (isGameOver(rt.score)) {
      rt.gameOver = true
      return
    }
    // Brief post-death invulnerability, so the hazard that killed us cannot re-kill on the
    // very next tick (without this a hazard overlapping the resting ship death-loops to
    // game-over in a few frames). A df6-1 placeholder for the ROM's PLADIE→new-ship blink;
    // the ship keeps its pose (no teleport) so ship-movement invariants are unaffected.
    rt.respawnGrace = RESPAWN_GRACE
  }
  const award = (points: number): void => {
    const before = rt.score.men
    rt.score = addPoints(rt.score, points)
    for (let i = 0; i < rt.score.men - before; i++) rt.cues.push({ type: 'extra-man' }) // RPSND
  }

  // 6. Powers (df5-5), on the button's RISING edge.
  const wantSmart = input.smartBomb ?? false
  const wantHyper = input.hyperspace ?? false
  const smartEdge = wantSmart && !rt.prevSmartBomb
  const hyperEdge = wantHyper && !rt.prevHyperspace
  rt.prevSmartBomb = wantSmart
  rt.prevHyperspace = wantHyper

  // The smart-bomb CLEAR itself runs AFTER the dispatch (below), not here: clearing the
  // field before the wave director dispatches would let it see population 0 and respawn a
  // fresh wave on the SAME tick — a full field would blink and reappear. Deferring the
  // clear to just after stepTick makes it behave exactly like a laser kill (the director
  // sees the cleared field on the NEXT tick), so the cleared frame is actually observable.
  if (rt.smartBombArmed && --rt.smartBombFlash <= 0) rt.smartBombArmed = false

  if (hyperEdge && !rt.gameOver && canHyperspace(0)) {
    if (hyperspaceKilled(rt.rand)) {
      killPlayer() // HYPER can strand you — a player death (HYPER issues no cue of its own)
    } else {
      const t = hyperspace(rt.rand)
      plax16 = t.x16
      shipFacing = t.facing
      shipRow = t.y
      vy = { y16: t.y << 8, playv: t.vy }
      plaxv24 = t.vx
      // pt1-25: the vanish/reappear — an ADR-0005 hyperspace effect (freeze) marks the jump.
      state._effectBank.spawnScreen('hyperspace')
    }
  }

  // 7. Fire BEFORE the dispatch (df3-5): the laser travels next tick.
  if (input.fire) {
    const laser = state._laserBank.fire(plax16, shipFacing, shipRow) // pt1-27: capture the fire row
    if (laser) rt.cues.push({ type: 'laser-fire' }) // LASSND — only on a real spawn (cap at 4)
  }

  // 8. Update the enemy-aim pose (WORLD space) and dispatch every process.
  rt.player = { x: shipWorldX(plax16, camera.bgl), y: shipRow }
  state._sched.stepTick()

  // 9. Per-tick sim wiring.
  perTickWiring(state, appearAndCue(state))

  // Smart bomb fires HERE (after the wave director dispatched in stepTick) so the cleared
  // field is not instantly respawned this tick — see the note at the edge detection above.
  if (smartEdge && !rt.gameOver) {
    const res = smartBomb({ armed: rt.smartBombArmed, count: rt.smartBombs })
    if (res.fired) {
      rt.smartBombs = res.count
      rt.smartBombArmed = true
      rt.smartBombFlash = SMART_BOMB_FLASHES
      rt.cues.push({ type: 'smart-bomb' }) // SBSND — the ONE cue; the cleared enemies are silent
      // pt1-25: the screen-level flash — the ADR-0005 smart-bomb wash (the COM PCRAM invert's
      // seizure-safe substitute), distinct from the per-enemy explosions clearAllEnemies queues.
      state._effectBank.spawnScreen('smart-bomb')
      clearAllEnemies(state, award)
    }
  }

  // 10. Collision. Advance effects first, then this tick's outcomes.
  state._effectBank.step()
  hitTestLasers(state, camera.bgl, award)

  // Post-death respawn invulnerability: while it holds, the ship cannot die again (the
  // hazard that killed it gets time to move off), then it counts down.
  const graced = rt.respawnGrace > 0
  if (rt.respawnGrace > 0) rt.respawnGrace -= 1

  const shipScreen: Query = { x: projectOnscreenX(plax16), y: shipRow, picture: SHIP_BOX }
  if (!rt.gameOver) {
    // Enemy shots + bombs + bodies vs the ship → player death (unless just-respawned).
    if (!graced && (bombVsPlayer(shipScreen, hazardObjects(state, camera.bgl)) || shipVsObject(shipScreen, enemyObjects(state, camera.bgl)))) {
      killPlayer()
    }
    // The rescue catch (WORLD space — catchFalling tests the ship pose against the fallers).
    const caught = state._enemyBank.catchFalling({ x: rt.player.x, y: shipRow, picture: box(HUMANOID_PICTURE) })
    for (let i = 0; i < caught.length; i++) {
      rt.cues.push({ type: 'astro-catch' }) // ACSND
      award(RESCUE_POINTS)
    }
    // Enemy fire that lands on a walking humanoid → astro-hit; and the safe-landing outcome.
    resolveHumanoidOutcomes(state, camera.bgl, award)
  }

  // df6-2 — the LANDER-SUCK loop edge, read AFTER every enemy state change this tick (the
  // scheduler's carries, the smart-bomb clear, and the laser kills above), so a carry that
  // ended any of those ways is seen. One aggregate voice (LSKSND): the loop rings while ANY
  // lander is carrying a humanoid upward (grabbed, not yet at the top) and stops when the
  // LAST such carry ends — reached the top, was dropped on the carrier's death, or lost its
  // passenger. Sounded as a held loop across the ascent (the logged df6-2 design deviation).
  //
  // `!l.reachedTop` is DEFENSE-IN-DEPTH, not a reachable branch: perTickWiring transforms a
  // reachedTop lander into a mutant and `killLander`s it the SAME tick (sim.ts perTickWiring,
  // even on the panic path), so by here `l.alive` is already false for it. The clause keeps
  // the predicate expressing the right CONCEPT — "carrying a humanoid UPWARD" excludes one
  // that already delivered it — independent of that kill-ordering, so a future change to when
  // the transform runs cannot silently turn a delivered abduction back into a sounding loop.
  const sucking = state._enemyBank.landers.some((l) => l.alive && l.carrying && !l.reachedTop)
  if (sucking && !rt.prevSucking) rt.cues.push({ type: 'lander-suck-start' })
  else if (!sucking && rt.prevSucking) rt.cues.push({ type: 'lander-suck-stop' })
  rt.prevSucking = sucking

  // pt1-22: advance the standing colour cyclers one tick off the PREVIOUS shadow, returning
  // a fresh 16-byte shadow (persistent — state.pcram is never mutated). This is the "live
  // palette" the shell decodes through: registers 1/A/C/D/E/F animate, 0 and 2-9/B stay put.
  const cycled = stepColorCycle(state._colorCycle, state.pcram)

  return withBanks({
    ...state,
    ship: { x: projectOnscreenX(plax16), y: shipRow, facing: shipFacing, thrust: input.thrust },
    camera: camera.bgl,
    stars,
    pcram: cycled.pcram,
    _colorCycle: cycled.cc,
    _thx: thx,
    _thnap: thnap,
    _plaxv24: plaxv24,
    _rev: { facing: shipFacing, revflg: rev.revflg },
    _vy: vy,
    _plax16: plax16,
  })
}

/** A closure the per-tick wiring uses to materialize a transformed enemy with an appear cue. */
function appearAndCue(state: SimState) {
  return (x: number, y: number, picture: ObjectImage): void => {
    state._effectBank.spawnAppear(x, y, picture)
    state._rt.cues.push({ type: 'enemy-appear' })
  }
}

/** Signed 16-bit difference on the world cylinder ([-0x8000, 0x7fff]). */
function signedWrap16(d: number): number {
  const m = wrap16(d)
  return m >= 0x8000 ? m - 0x10000 : m
}

/** Project a WORLD-X to its on-screen pixel (the exact composeFrame/COLIDE mapping, pt1-18), or
 *  `null` when it is OUTSIDE the visible window — an off-camera object is neither drawn nor
 *  collidable (it can only be hit once it scrolls on screen; the scanner still shows it). */
const toScreenCol = (worldX: number, camera: number): number | null => projectWorldX(worldX, camera)

// ─── Per-tick sim wiring: transforms, pickups, panic, baiters, lander fire, shot travel ──
function perTickWiring(state: SimState, appear: (x: number, y: number, p: ObjectImage) => void): void {
  const rt = state._rt

  // PANIC (df5-4): the last humanoid lost freaks every lander (reachedTop-latched).
  state._enemyBank.panic()

  // lander → mutant (df4-4) and lander PICK-UP (LPKSND), off the live lander views.
  for (const l of state._enemyBank.landers) {
    if (!l.alive) continue
    if (l.reachedTop) {
      state._mutantBank.transformLander(l) // SCZ — the freaked/abducting lander becomes a mutant
      appear(l.x, l.y, MUTANT_PICTURE)
      state._enemyBank.killLander(l) // retire the spent lander (its passenger is already consumed)
      continue
    }
    if (l.carrying && !rt.carrying.has(l)) {
      rt.carrying.add(l)
      rt.cues.push({ type: 'lander-pickup' }) // LPKSND — the grab (LGSND is a dead ROM cue)
    }
    // LSHOT — landers shoot at the player on a staggered cadence (modeled here; landers.ts
    // deferred the lander weapon). WeakMap timer keyed by the stable lander record.
    let t = rt.landerShootTimers.get(l)
    if (t === undefined) t = 1 + (Math.abs(Math.round(l.x)) % LANDER_SHOOT_PERIOD)
    if (--t <= 0) {
      fireAndCue(state, l.x, l.y, 'lander-shoot')
      t = LANDER_SHOOT_PERIOD
    }
    rt.landerShootTimers.set(l, t)
  }

  // The baiter anti-camping timer (UFOST): while a field stands, harry the player.
  if (--rt.baiterTimer <= 0) {
    rt.baiterTimer = BAITER_SPAWN_PERIOD
    const anyEnemy =
      aliveOf(state._enemyBank.landers) +
        aliveOf(state._mutantBank.mutants) +
        aliveOf(state._bomberBank.bombers) +
        aliveOf(state._podBank.pods) +
        aliveOf(state._swarmerBank.swarmers) >
      0
    if (anyEnemy && aliveOf(state._ufoBank.ufos) < BAITER_MAX && !rt.gameOver) {
      state._ufoBank.spawnUfo(rt.player.x, SPAWN_Y)
      appear(rt.player.x, SPAWN_Y, BAITER_PICTURE)
    }
  }

  // Travel the aimed enemy shots; retire the expired.
  for (let i = rt.shots.length - 1; i >= 0; i--) {
    const s = rt.shots[i]
    s.x += s.vx
    s.y += s.vy
    if (--s.life <= 0) rt.shots.splice(i, 1)
  }
}

/** Fire an aimed lander shot at the player and emit its SHOOT cue. */
function fireAndCue(state: SimState, fromX: number, fromY: number, cue: GameEvent['type']): void {
  const rt = state._rt
  const dxWorld = signedWrap16(Math.round(rt.player.x) - Math.round(fromX))
  const dyRow = rt.player.y - fromY
  rt.shots.push({ x: fromX, y: fromY, vx: dxWorld / SHOT_TRAVEL_FRAMES, vy: dyRow / SHOT_TRAVEL_FRAMES, life: SHOT_LIFE })
  rt.cues.push({ type: cue })
}

/** Enemy shots + bomber bombs, projected to on-screen boxes (the ship-death hazard list). */
function hazardObjects(state: SimState, camera: number): readonly CollObject[] {
  const objs: CollObject[] = []
  let id = 0
  for (const s of state._rt.shots) {
    const sx = toScreenCol(s.x, camera)
    if (sx === null) continue // off-window: cannot strike the ship this tick (pt1-18)
    objs.push({ id: String(id++), x: sx, y: Math.round(s.y), picture: SHOT_BOX })
  }
  for (const b of state._bomberBank.bombs) {
    const bx = toScreenCol(b.x, camera)
    if (bx === null) continue
    objs.push({ id: String(id++), x: bx, y: b.y, picture: box(BOMB_PICTURE) })
  }
  return objs
}

/** Every live enemy body, projected to on-screen boxes (the ship-collision list). */
function enemyObjects(state: SimState, camera: number): readonly CollObject[] {
  const objs: CollObject[] = []
  let id = 0
  const add = (recs: readonly { x: number; y: number; alive: boolean }[], picture: ObjectImage): void => {
    for (const r of recs) {
      if (!r.alive) continue
      const rx = toScreenCol(r.x, camera)
      if (rx === null) continue // off-window enemy: not collidable until it scrolls on screen (pt1-18)
      objs.push({ id: String(id++), x: rx, y: r.y, picture: box(picture) })
    }
  }
  add(state._enemyBank.landers, LANDER_PICTURE)
  add(state._mutantBank.mutants, MUTANT_PICTURE)
  add(state._ufoBank.ufos, BAITER_PICTURE)
  add(state._bomberBank.bombers, BOMBER_PICTURE)
  add(state._podBank.pods, POD_PICTURE)
  add(state._swarmerBank.swarmers, SWARMER_PICTURE)
  return objs
}

/**
 * COLIDE (DEFA7.SRC:2775-2787): each live player laser vs the WHOLE enemy list. A box overlap
 * kills the struck enemy, scores it, starts a localized explosion, and emits that enemy's HIT
 * cue; a carrying lander additionally screams its dropped passenger (ASCSND). One object list,
 * ROM-faithful, rebuilt per laser so a kill removes the victim from later tests.
 */
function hitTestLasers(state: SimState, camera: number, award: (p: number) => void): void {
  const rt = state._rt
  interface Target {
    obj: CollObject
    hit: () => void
  }

  for (const laser of state._laserBank.lasers) {
    if (!laser.alive) continue

    // Rebuilt per laser so a kill removes the victim from the next laser's list.
    const targets: Target[] = []
    const at = (rec: { x: number; y: number }, picture: ObjectImage, hit: () => void): void => {
      const rx = toScreenCol(rec.x, camera)
      if (rx === null) return // off-window enemy: not hittable until it scrolls on screen (pt1-18)
      targets.push({
        obj: { id: String(targets.length), x: rx, y: rec.y, picture: box(picture) },
        hit,
      })
    }
    for (const l of state._enemyBank.landers) {
      if (!l.alive) continue
      at(l, LANDER_PICTURE, () => {
        const scream = l.carrying && !l.reachedTop
        state._enemyBank.killLander(l)
        state._effectBank.spawnExplode(l.x, l.y, LANDER_PICTURE)
        award(ENEMY_POINTS.lander)
        rt.cues.push({ type: 'lander-hit' }) // LHSND
        if (scream) rt.cues.push({ type: 'astro-scream' }) // ASCSND — the dropped passenger falls
      })
    }
    for (const m of state._mutantBank.mutants) {
      if (!m.alive) continue
      at(m, MUTANT_PICTURE, () => {
        state._mutantBank.killMutant(m)
        state._effectBank.spawnExplode(m.x, m.y, MUTANT_PICTURE)
        award(ENEMY_POINTS.mutant)
        rt.cues.push({ type: 'mutant-hit' }) // SCHSND
      })
    }
    for (const u of state._ufoBank.ufos) {
      if (!u.alive) continue
      at(u, BAITER_PICTURE, () => {
        state._ufoBank.killUfo(u)
        state._effectBank.spawnExplode(u.x, u.y, BAITER_PICTURE)
        award(ENEMY_POINTS.baiter)
        rt.cues.push({ type: 'baiter-hit' }) // UFHSND
      })
    }
    for (const b of state._bomberBank.bombers) {
      if (!b.alive) continue
      at(b, BOMBER_PICTURE, () => {
        state._bomberBank.killBomber(b)
        state._effectBank.spawnExplode(b.x, b.y, BOMBER_PICTURE)
        award(ENEMY_POINTS.bomber)
        rt.cues.push({ type: 'bomber-hit' }) // TIHSND
      })
    }
    for (const p of state._podBank.pods) {
      if (!p.alive) continue
      at(p, POD_PICTURE, () => {
        state._podBank.killPod(p) // bursts 1..6 swarmers (releaseSwarmer)
        state._effectBank.spawnExplode(p.x, p.y, POD_PICTURE)
        award(ENEMY_POINTS.pod)
        rt.cues.push({ type: 'pod-hit' }) // PRHSND
      })
    }
    for (const s of state._swarmerBank.swarmers) {
      if (!s.alive) continue
      at(s, SWARMER_PICTURE, () => {
        state._swarmerBank.killSwarmer(s)
        state._effectBank.spawnExplode(s.x, s.y, SWARMER_PICTURE)
        award(ENEMY_POINTS.swarmer)
        rt.cues.push({ type: 'swarmer-hit' }) // SWHSND
      })
    }

    if (targets.length === 0) return // nothing left to hit this tick
    // pt1-27: the collision row is the laser's OWN captured fire row, not the ship's live row.
    const query: Query = { x: projectOnscreenX(laser.x), y: laser.y, picture: LASER_BOX }
    const struck = laserVsObject(query, targets.map((t) => t.obj))
    if (struck) targets[Number(struck.object.id)].hit()
  }
}

/** Enemy fire on a walking humanoid (AHSND) and the uncaught-faller safe-landing (ALSND). */
function resolveHumanoidOutcomes(state: SimState, camera: number, award: (p: number) => void): void {
  const rt = state._rt

  // astro-land: an uncaught faller that reached the floor lands safely, once (SC-P250).
  for (const h of state._enemyBank.humanoids) {
    if (h.state === 'falling' && h.y >= 240 && !rt.landed.has(h)) {
      rt.landed.add(h)
      rt.cues.push({ type: 'astro-land' }) // ALSND
      award(SAFE_LANDING_POINTS)
    }
  }

  // astro-hit: an aimed shot / bomb that overlaps a walking humanoid kills it (AHSND). This is a
  // WORLD-space interaction — a lander shoots the humanoids it is abducting anywhere on the
  // cylinder, on-camera or not (that is what the scanner is for) — so it must NOT use the visible-
  // window cull (pt1-18). Project both prey and hazards by the plain camera-relative column
  // (wrap16(worldX-camera)>>8, the pre-pt1-18 mapping with no window clip), so the geometry is
  // identical regardless of where the camera is looking.
  const prey = state._enemyBank.humanoids.filter((h) => h.alive && h.state === 'walking')
  if (prey.length === 0) return
  const worldCol = (x: number): number => wrap16(Math.round(x) - camera) >> 8
  const preyObjs: CollObject[] = prey.map((h, i) => ({ id: String(i), x: worldCol(h.x), y: h.y, picture: box(HUMANOID_PICTURE) }))
  const hazards: CollObject[] = []
  let hid = 0
  for (const s of state._rt.shots) hazards.push({ id: String(hid++), x: worldCol(s.x), y: Math.round(s.y), picture: SHOT_BOX })
  for (const b of state._bomberBank.bombs) hazards.push({ id: String(hid++), x: worldCol(b.x), y: b.y, picture: box(BOMB_PICTURE) })
  for (const hz of hazards) {
    const struck = laserVsObject({ x: hz.x, y: hz.y, picture: hz.picture }, preyObjs)
    if (!struck) continue
    const victim = prey[Number(struck.object.id)]
    if (!victim.alive) continue
    state._enemyBank.killHumanoid(victim)
    rt.cues.push({ type: 'astro-hit' }) // AHSND
  }
}

/** Smart bomb clear: every on-screen enemy dies, scored and exploded but SILENT per-enemy
 *  (only SBSND sounds). Pods burst first so their swarmers are cleared in the same sweep. */
function clearAllEnemies(state: SimState, award: (p: number) => void): void {
  const boom = (rec: { x: number; y: number }, picture: ObjectImage, points: number): void => {
    state._effectBank.spawnExplode(rec.x, rec.y, picture)
    award(points)
  }
  // Pods burst first so their released swarmers are caught in the same sweep.
  for (const p of state._podBank.pods.slice()) if (p.alive) { state._podBank.killPod(p); boom(p, POD_PICTURE, ENEMY_POINTS.pod) }
  for (const s of state._swarmerBank.swarmers.slice()) if (s.alive) { state._swarmerBank.killSwarmer(s); boom(s, SWARMER_PICTURE, ENEMY_POINTS.swarmer) }
  for (const b of state._bomberBank.bombers.slice()) if (b.alive) { state._bomberBank.killBomber(b); boom(b, BOMBER_PICTURE, ENEMY_POINTS.bomber) }
  for (const u of state._ufoBank.ufos.slice()) if (u.alive) { state._ufoBank.killUfo(u); boom(u, BAITER_PICTURE, ENEMY_POINTS.baiter) }
  for (const m of state._mutantBank.mutants.slice()) if (m.alive) { state._mutantBank.killMutant(m); boom(m, MUTANT_PICTURE, ENEMY_POINTS.mutant) }
  for (const l of state._enemyBank.landers.slice()) if (l.alive) { state._enemyBank.killLander(l); boom(l, LANDER_PICTURE, ENEMY_POINTS.lander) }
}
