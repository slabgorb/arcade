// src/core/demo.ts
//
// Story jt2-7 (GREEN, Julia) — the wave-1 DEMO wiring: the integration story that
// turns jt2-1..jt2-6's pure cores into a playable slice the shell can draw. This
// module ASSEMBLES wave 1 and DRIVES it deterministically — the demo loop and the
// sim are ONE thing that cannot diverge (the jt2-1 carried seam).
//
// CORE: pure functions over plain data — no clock, no ambient entropy, no browser
// surface, no shell import (the jt1-7 purity scanner sweeps this file the moment
// it lands). main.ts becomes a thin shell: it seeds the demo with a shell-owned
// seed, steps it once per video frame through the shell timebase, and RENDERS the
// resulting process list through the atlas path.
//
// This story adds NO new ROM law — every constant it leans on is already gated by
// an earlier story's citations suite. The three TEA Delivery Findings are resolved
// as follows (see the SM/Dev session assessment):
//   1. ENEMY DVALUE TYPE — the shared `EnemyState` has no type field; the demo
//      carries `enemyType` on the PROCESS (DemoProcess.enemyType), set from the
//      wave row's bounder/hunter/lord counts. joust.killScore reads it.
//   2. PLAYER FACING — the shared (generated) flight `EntityState` cannot grow a
//      facing field; the demo carries `facing` on the PLAYER PROCESS, sourced from
//      the transporter spawn constants (PLAYER1_SPAWN.facing / PLAYER2_SPAWN.facing).
//   3. EGG-FALL GRAVITY — jt2-4 deferred the STEGG/EGGLPA gravity with no cited
//      constant of its own. Rather than invent one (which would owe a JT claim),
//      `stepEgg` REUSES the flight core's base gravity `GRAV` (JOUSTRV4.SRC:952,
//      already gated by flight's suite) to accelerate the fall — so the citations
//      suite stays honest by construction.

import { createState, stepFrame, type ProcessClass } from './frame.js'
import type { GameEvent } from './events.js'
import { GRAV, groundMaskAt, type EntityState, type PlayerInput } from './flight.js'
import { groundOutcome } from './arena.js'
import { applyWaveDestruction, initialArenaState, type ArenaState } from './arena-state.js'
import {
  bounceEgg,
  eggSettles,
  spawnEgg,
  willHatch,
  remountEntryEdge,
  bumpEggHits,
  eggValue,
  airCatchBonus,
  EGGS_PER_ENEMY,
  type EggState,
  type RemountEntry,
} from './egg.js'
import {
  broadPhase,
  narrowPhase,
  resolveJoust,
  bounceTop,
  bounceBottom,
  consumeBumpY,
  type JoustEntity,
  type JoustOutcome,
  type Facing,
  type EnemyType,
  type CollisionBox,
} from './joust.js'
import { growWanted, type EnemyState, type IntelBudget, type SmartBrain } from './enemy.js'
import {
  pteroWaveSpawnCount,
  resolvePteroAttack,
  pteroScoreEvent,
  type PteroEntity,
} from './ptero.js'
import { startDissolve, type DissolveState } from './dissolve.js'
import { trollSpawnable } from './troll.js'
import { seedBaiterClock, stepBaiterClock, NAP_FRAMES, type BaiterClock } from './baiter.js'
import {
  waveRowAt,
  seedWaveBudget,
  emytimForWave,
  waveBeats,
  dispatchWaveType,
  growthDue,
  nextWaveBcd,
  decimalWaveFromBcd,
  type WaveRow,
} from './wave.js'
import {
  PADS,
  enterViaPads,
  beginMaterialise,
  stepMaterialise,
  PLAYER1_SPAWN,
  PLAYER2_SPAWN,
  type Materialisation,
  type TransporterPad,
} from './transporter.js'
import { COLLISION_TABLES, BACKGROUND_RECORDS, ENTITY_RECORDS } from './pictures.js'
// jt8-1: the enemy AGGRO subsystem. The demo OWNS the target state's lifecycle —
// it seeds it, ticks the grace timers each frame, and reconciles the slots against
// the live players (register a fresh/respawned knight, drop a dead one). frame.ts
// reads it (per enemy) to hand the smart brains their quarry.
import {
  seedTargets,
  registerPlayer,
  tickTargetTimers,
  removeTarget,
  TARTIM,
  type TargetState,
} from './target.js'

// ─── The sim, as the demo carries it ─────────────────────────────────────────
//
// A superset of the jt2-1 scheduler `Process`: the tagged-union list plus this
// story's egg variant, the enemy DVALUE type, the player facing (Finding #2), the
// materialisation collision bit, and the private materialisation-window state.

export interface DemoProcess {
  /** `PID` — unique, non-zero. */
  id: number
  /** `PPRI` — primary steps before secondary. */
  cls: ProcessClass
  /** `PNAP` — frames until the next wake (>= 1). */
  nap: number
  /** Re-nap applied on each wake. For an enemy this is the EMYTIM divider. */
  period: number
  /** Tagged-union discriminant. */
  kind: string
  /** A `kind: 'player'` process carries its flight/ground state here. */
  entity?: EntityState
  /** A `kind: 'enemy'` process carries its mind + flight state here (jt2-2). */
  enemy?: EnemyState
  /** A `kind: 'egg'` process carries its egg state here (this story's variant). */
  egg?: EggState
  /** A `kind: 'dissolve'` process carries its death-dissolve state here (jt3-7). */
  dissolve?: DissolveState
  /**
   * A `kind: 'ptero'` process that is a BAITER (PCHASE ≠ 0) — jt3-5's anti-stall
   * pterodactyl. Distinguishes the two 'ptero' variants so a baiter death settles
   * the baiter count (the DissolveState.baiter flag) on entry.
   */
  baiter?: boolean
  /** The enemy's DVALUE type — a wave row's bounders/hunters/lords (Finding #1). */
  enemyType?: EnemyType
  /** The PID $80 collision bit: false while a materialisation window is active. */
  collisionEnabled?: boolean
  /** `PFACE` for a player — the demo's home for player facing (Finding #2). */
  facing?: Facing
  /**
   * jt5-3 — a PLAYER process's wing-edge memory: the `flapHeld` LEVEL it
   * carried last frame. Same home as `facing` above and for the identical
   * reason: `EntityState` is shared, GENERATED, and cannot safely grow it.
   * frame.ts is the writer; nothing here reads it directly.
   */
  prevFlapHeld?: boolean
  /** A player's MOUNT (round 2): P1 an ostrich, P2 a stork — the render draws it under the rider. */
  mount?: 'ostrich' | 'stork'
  /** The transporter materialisation window (jt2-6), while one is in progress. */
  mat?: Materialisation
  /**
   * jt4-5 — a WAVEGG egg-wave egg (a settled complement egg, not a DEATH3 kill-egg). The
   * egg-wave SELF-CLEAR hatch→remount keys on this so only wave eggs mature into remount
   * buzzards (a kill-egg keeps its jt2-4 lifecycle). Set by `spawnWaveEggs`.
   */
  waveEgg?: boolean
  /**
   * jt8-4 — `DEGGS`, the per-PLAYER egg-hit counter that drives the EGGVAL ladder.
   *
   * This rides the PLAYER, not the egg, because that is where the ROM keeps it:
   * EGGSCR reaches it through the catching player's decision area and writes the
   * bumped value straight back —
   *
   *     LDY  PDECSN,U   ; U = "THE PLAYER'S (VICTOR) WORKSPACE THAT HIT THE EGG"
   *     LDY  DEGGS,Y    ; the "EGG KILLED COUNTER" pointer in that area
   *     LDB  ,Y / CMPB #4 / BHS / INCB
   *     STB  ,Y         ; climbs — EGGSCR itself never resets it
   *                                     (JOUSTRV4.SRC:3033-3053; decl at :113)
   *
   * `DEGGS RMB 2` is declared inside the `* DECISION BLOCK *` (`ORG $0`, :101-113),
   * which is per-player state. `EggState.hitCount` (egg.ts) looks like the same
   * thing but cannot be: every producer of an egg hard-codes it to 0 (`spawnEgg`,
   * `settledWaveEgg`) and nothing writes it back, so a ladder read off the egg pays
   * the first rung forever. Absent === 0, so an untouched player is on rung 1.
   *
   * ─── LIFETIME (jt8-6) — three boundaries, and EGGSCR is none of them ──────────
   * "EGGSCR never resets it" is a fact about EGGSCR and NOT about the counter; jt8-4
   * read the second from the first, and a story was filed on the difference. `DEGGS`
   * is a POINTER — `LDY DEGGS,Y` then `LDB ,Y`, and the debug guard at :3039 reads
   * "SHOULD NEVER BE ZERO" because it holds an address — into the fixed cells
   * `EGGS1`/`EGGS2` that P1DEC/P2DEC bind it to (:5551, :5555). Grepping those cells
   * gives the whole lifetime, six `CLR`s and nothing else:
   *
   *   :907 / :912      a new game        "RESET NUMBER OF EGG KILLED"       (JT86-007)
   *   :1979 / :1980    EVERY wave start  WNRM                               (JT86-006)
   *   :4669 / :4675    the player's own death  DEATH1 / DEATH2              (JT86-002/003)
   *
   * So the ladder climbs only within ONE life of ONE wave. The death boundary needs no
   * code here — a death removes the process and `respawnPlayerProcess` builds a fresh
   * one, so the credit dies with the man, which is why this count must NOT be re-homed
   * somewhere that outlives the process. The wave boundary IS explicit, in `stepDemo`'s
   * advance. Both are pinned by tests/demo-jt8-6.test.ts.
   */
  eggHits?: number
}

/**
 * ONE ordered render operation (round 2). The shell iterates a `drawList` and
 * blits each op; making the ordered list a PURE function lets the z-order be
 * pinned by DATA (routing≠geometry) rather than trusted by eye. `arena` ops are
 * cliff/platform/foreground tiles; `entity` ops are the sprites.
 */
export interface DrawOp {
  kind: 'arena' | 'entity'
  /** The atlas block (or ENTITY_RECORDS frame name) this op blits. */
  name: string
  x: number
  y: number
  height?: number
  /**
   * `PFACE` for an ENTITY op (jt2-9) — the shell mirrors the right-facing atlas
   * frame horizontally for a left-facer. Undefined on `arena` ops.
   */
  facing?: Facing
  /**
   * The ASH animation index for a DISSOLVE op (jt3-7 B1) — the shell's
   * `paintDissolve` decodes `expandAshFrames` and paints THIS frame. Carries the
   * body's `DissolveState.frame`; undefined on every non-dissolve op.
   */
  frame?: number
}

/** The demo's simulation state — the jt2-1 GameState, egg variant live. */
export interface DemoSim {
  readonly frame: number
  readonly processes: readonly DemoProcess[]
  readonly woke: readonly number[]
  readonly rng: number
  readonly budget: IntelBudget
  /** jt8-1 — the enemy AGGRO state (SELPLY/TARPLY/TARTM, target.ts), carried like
   * `budget`. Seeded empty by `createWaveDemo`; `stepDemo` ticks + reconciles it. */
  readonly targets: TargetState
}

/** A console/dev-overlay event — score values (DVALUE/EGGVAL) and message beats. */
export type DemoEvent =
  // `player` attributes a kill to the scoring player's id (jt4-1's game.ts drain
  // credits the right ledger — the co-op independence). Optional so pre-jt4 event
  // literals still typecheck; collisionPass always sets it on a real kill.
  | { kind: 'score'; value: number; reason: 'kill' | 'egg'; player?: number }
  | { kind: 'beat'; message: string }
  // jt4-4 — a PLAYER-vs-PLAYER kill: collisionPass names the surviving WINNER and the
  // removed LOSER so the session layer (stepGame) can drive recordPartnerKill (the
  // gladiator award / co-op void). A distinguishable event, not the silent removal jt4-3
  // left behind.
  | { kind: 'partnerKill'; winner: number; loser: number }

/** The whole demo: the sim, the 1-based wave, and the console/overlay event log. */
export interface DemoState {
  sim: DemoSim
  wave: number
  events: readonly DemoEvent[]
  /**
   * The mutable per-run arena (jt3-2): which cliffs/bridge are currently gone. The
   * wave EVENT updates it — seeded from wave 1 in `createWaveDemo`, re-applied on
   * every wave advance in `stepDemo` — so the wave-3 bridge burn + high-nibble
   * cliff destruction flow through the arena-state seam, not the frozen exports.
   */
  arena: ArenaState
  /**
   * jt5-1 — THIS FRAME's audio cue stream, and nothing else's. Rebuilt from
   * scratch by every `stepDemo`, so a moment that stopped happening stops
   * sounding on the very next frame.
   *
   * Deliberately NOT the `events` log above, which is a different thing wearing
   * a similar name: that one is APPEND-AND-CAP (the last EVENT_LOG_CAP entries
   * of the whole run) and is drained by `game.ts` through a reference-set delta.
   * A cue channel built on it would re-fire every sound in the window on every
   * quiet frame — a defect a replay-identity test cannot see, because a stale
   * carry-forward is carried forward identically in both runs.
   */
  cues: readonly GameEvent[]
  /**
   * The BAITER send-off clock (jt3-5): the anti-stall pterodactyl schedule. Seeded
   * per wave from BAITBL and advanced on the EMYOK nap cadence (once per NAP_FRAMES
   * frames) — camp a wave and baiters swarm. Live wiring for AC-1 "the full ecosystem
   * hunts you"; DBAIT baiter-removal is deferred (nbait settles at MAX_BAITERS).
   */
  baiterClock: BaiterClock
}

/** The result of resolving ONE overlapping pair — the wiring over resolveJoust. */
export interface ContactResult {
  outcome: JoustOutcome
  survivors: readonly ('a' | 'b')[]
  /** The egg a dying ENEMY becomes (spawnEgg); null on a bounce or a player victim. */
  egg: EggState | null
  score: number
}

// ─── Demo tuning (shell-facing, NOT a transcribed ROM law) ───────────────────

/**
 * How many frames a materialising enemy stays collision-safe before its window
 * times out and PLYINT re-enables collisions. This is a demo-presentation choice
 * (~2 s at the ~60 Hz video rate), not a transcribed constant — the ABORT/timeout
 * LAW itself is jt2-6's `stepMaterialise`.
 */
const MATERIALISE_WINDOW = 120

/**
 * The console/overlay event log keeps only its most recent entries (jt2-9): the
 * score/beat log is a dev-overlay stream — score ACCUMULATION is jt4 (jt4-1's
 * game.ts drains this per frame), the authentic DISPLAY is jt5 — an unbounded
 * append would leak the whole session's history.
 * A cap keeps the latest events (the kill this frame stays observable) without
 * growing without bound.
 */
const EVENT_LOG_CAP = 32

/** Player processes start mid-screen, airborne — a state the sim can be in. */
const PLAYER_START_PIXEL_Y = 90

/** Base ids so player / enemy / egg ids never collide. */
const PLAYER1_ID = 1
const PLAYER2_ID = 2

/** A broad-phase box roughly the size of a buzzard rider (whole pixels). */
const ENTITY_BOX_W = 16
const ENTITY_BOX_H = 16

/** The neutral glide — no input this frame. */
const NEUTRAL_INPUT: PlayerInput = { dir: 0, flap: false, flapHeld: false }

/**
 * The transcribed collision-span masks (jt2-3 COLLISION_TABLES), by name — what
 * the narrow phase consults so a live joust actually resolves in the loop (round 2:
 * the round-1 collision pass was dead because entities carried no mask).
 */
const MASKS: Record<string, Array<[number, number]>> = {}
for (const t of COLLISION_TABLES) MASKS[t.name] = t.spans

// ─── Wave-1 assembly ──────────────────────────────────────────────────────────

/** A player's flight state at its spawn X, airborne mid-screen. */
function playerEntity(posX: number): EntityState {
  return {
    posX,
    posY: PLAYER_START_PIXEL_Y << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
  }
}

function playerProcess(
  id: number,
  posX: number,
  facing: Facing,
  mount: 'ostrich' | 'stork',
): DemoProcess {
  return { id, cls: 'primary', nap: 1, period: 1, kind: 'player', entity: playerEntity(posX), facing, mount }
}

/**
 * A RESPAWNING player re-entering via the transporter (the ROM CREP1/CREP2 re-create →
 * transporter-served re-materialise, JOUSTRV4.SRC:5610-5620): a fresh player process at its
 * spawn constants (PLAYER1_SPAWN / PLAYER2_SPAWN), re-materialising inside the SAME bounded
 * jt2-6 window an entering enemy uses — collisions OFF while it lands so a swarm does not
 * re-kill the re-created knight the instant it materialises, then re-enabled when the window
 * ENDS. `advanceMaterialisation` counts the `mat` window down and TIMES IT OUT after
 * `MATERIALISE_WINDOW` naps, at which point PLYINT re-enables collisions (`stepMaterialise`,
 * transporter.ts:226-231, :230). So a re-entered knight becomes VULNERABLE again and CAN lose
 * all its lives → the loop closes through play (Reviewer Ruling #1). The session layer
 * (game.ts stepGame) owns the lives ledger and the zero-lives gate; this only builds the
 * re-created process. Pure. `playerId` is 1 (P1) or 2 (P2).
 */
export function respawnPlayerProcess(playerId: number): DemoProcess {
  const spawn = playerId === PLAYER2_ID ? PLAYER2_SPAWN : PLAYER1_SPAWN
  return {
    ...playerProcess(playerId, spawn.x, spawn.facing, spawn.mount),
    collisionEnabled: false,
    mat: beginMaterialise(MATERIALISE_WINDOW),
  }
}

/** The smart brain an enemy type promotes INTO (PDECSN → DSMART). */
function brainFor(type: EnemyType): SmartBrain {
  switch (type) {
    case 'bounder':
      return 'boundr'
    case 'hunter':
      return 'b2undr'
    case 'shadowLord':
      return 'shadow'
  }
}

/** An enemy's mind riding the shared flight core, materialising over a pad. */
function enemyState(pad: TransporterPad, type: EnemyType): EnemyState {
  return {
    entity: {
      posX: pad.x,
      posY: pad.y << 8,
      velXIndex: 0,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
    facing: 1,
    pchase: 0,
    brain: 'linet',
    decision: brainFor(type),
  }
}

function enemyProcess(id: number, pad: TransporterPad, period: number, type: EnemyType): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: period,
    period,
    kind: 'enemy',
    enemy: enemyState(pad, type),
    enemyType: type,
    collisionEnabled: false,
    mat: beginMaterialise(MATERIALISE_WINDOW),
  }
}

/**
 * The scored GROUND enemy types a wave row sends in, in entry order: bounders,
 * then hunters, then shadow lords. Pterodactyls are NOT scored ground enemies —
 * jt3-4 makes them their own `kind:'ptero'` processes (see `spawnWavePteros`), so
 * the old 'bounder'-fill placeholder is gone: the ground count is exactly
 * bounders + hunters + lords. Wave 1 is three bounders.
 */
function enemyTypesForWave(row: WaveRow): EnemyType[] {
  const types: EnemyType[] = []
  for (let i = 0; i < row.bounders; i++) types.push('bounder')
  for (let i = 0; i < row.hunters; i++) types.push('hunter')
  for (let i = 0; i < row.lords; i++) types.push('shadowLord')
  return types
}

/** A pterodactyl's flight state: airborne mid-screen, entering from the left edge
 * on its top FLYXP rung (velXIndex 8) so it streaks across — the gravity-EXEMPT
 * stepPteroFlight (jt3-4) holds its altitude while it flies. */
function pteroFlightEntity(): EntityState {
  return {
    posX: 8,
    posY: PLAYER_START_PIXEL_Y << 8,
    velXIndex: 8,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: true,
    animPhase: 0,
  }
}

/** A pterodactyl process — a PTEID secondary, NOT a scored ground enemy (no
 * enemyType, so it never carries a DVALUE type). jt3-4 spawns it; jt3-7 makes it
 * LIVE: it carries a flight `entity` (stepped gravity-exempt by frame.ts) and
 * collides with a player through resolvePteroAttack (the lance-height joust). */
function pteroProcess(id: number): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'ptero',
    facing: 1,
    collisionEnabled: true,
    entity: pteroFlightEntity(),
  }
}

/** A BAITER process (jt3-5): jt3-4's ptero tagged `baiter` (PCHASE ≠ 0) — the
 * anti-stall pterodactyl the send-off clock scrambles when a player camps a wave.
 * Shares the ptero's gravity-exempt flight and the lance-height joust. */
function baiterProcess(id: number): DemoProcess {
  return {
    id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'ptero',
    baiter: true,
    facing: 1,
    collisionEnabled: true,
    entity: pteroFlightEntity(),
  }
}

/** The lava-troll hand's resting state off CLIF5 (the bottom island): standing on
 * the surface, mid-span. The hand is a render placeholder here — its GRIP mechanic
 * (stepGrip) is a pure core exercised directly; wiring the live grab off the LNDB7
 * landing dispatch is beyond this slice. */
function trollEntity(): EntityState {
  return {
    posX: 148,
    posY: 210 << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0,
    timeUp: 1,
    groundState: null,
    plantZ: 0,
    airborne: false,
    animPhase: 0,
  }
}

/** A lava-troll process — the hand grabbing off CLIF5 once the bridge has burned
 * (trollSpawnable, jt3-3). Its id rides a per-wave namespace clear of the ground
 * enemies (< $80) and the pteros ($80+). */
function trollProcess(wave: number): DemoProcess {
  return {
    id: 0x100 * wave + 0xc0,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'troll',
    facing: 1,
    collisionEnabled: true,
    entity: trollEntity(),
  }
}

/**
 * The pterodactyl processes a wave sends in (jt3-4): the wave row's ptero nibble
 * (WPTEN) WHEN the wave dispatches to the 'ptero' type through jt2-5's
 * `dispatchWaveType`, else none. The count flows through the pure
 * `pteroWaveSpawnCount`. Ptero ids sit in a separate per-wave namespace (+$80) so
 * they never collide with the ground-enemy indices.
 */
function spawnWavePteros(waveNumber: number): DemoProcess[] {
  const row = waveRowAt(waveNumber)
  const count = pteroWaveSpawnCount(row.status, row.pterodactyls, { p1: true, p2: true })
  const pteros: DemoProcess[] = []
  for (let i = 0; i < count; i++) pteros.push(pteroProcess(0x100 * waveNumber + 0x80 + i))
  return pteros
}

/**
 * A SETTLED egg resting on a ledge — one slot of an EGG wave's complement (a full PEGG, not
 * yet hatched). `settled` so `stepEgg` leaves it put (the hatch/remount wiring off a settled
 * wave egg is a later story's); it holds the wave open like any egg until it hatches.
 */
function settledWaveEgg(posX: number, feetY: number): EggState {
  return {
    posX,
    posY: feetY << 8,
    velX: 0,
    velY: 0,
    bumpX: 0,
    bumpY: 0,
    eggsLeft: EGGS_PER_ENEMY,
    hitCount: 0,
    pfeet: 1,
    settled: true,
  }
}

/**
 * The egg processes an EGG wave enters INSTEAD of materialising ground enemies (WAVEGG
 * `LDX #EGG1` "EGG WAVE", JOUSTRV4.SRC:2737-2776): one settled egg per ground-complement
 * slot, placed at the transporter pads. The byte-exact EGG1 placement table (:2737-2776) is
 * untranscribed — TEA's design deviation pins the "enters as eggs" observable, not the exact
 * ledge coordinates / the 6-per-ledge count / the 2 pre-mature hatchings — so the complement
 * lands as settled eggs at real arena pad positions. Ids ride a per-wave namespace clear of
 * the pteros (+$80) and the kill-eggs ($1_0000+).
 */
function spawnWaveEggs(waveNumber: number): DemoProcess[] {
  const complement = enemyTypesForWave(waveRowAt(waveNumber)).length
  const eggs: DemoProcess[] = []
  for (let i = 0; i < complement; i++) {
    const pad = PADS[i % PADS.length]
    // `waveEgg` tags the complement egg so the self-clear hatch (stepDemo) matures ONLY wave
    // eggs into remounts — a DEATH3 kill-egg keeps its jt2-4 lifecycle, untouched.
    eggs.push({ ...eggProcess(0x100 * waveNumber + i, settledWaveEgg(pad.x, pad.y)), waveEgg: true })
  }
  return eggs
}

/**
 * The REMOUNT buzzard a SETTLED wave egg hatches into (EGGLND/EGGMAN, JOUSTRV4.SRC:3239-3279):
 * a live GROUND enemy flying back in from the FARTHER (opposite) edge (egg.ts's
 * `remountEntryEdge` — the ROM correction to "nearer") at max FLYX speed. So a hatched wave egg
 * both DROPS an egg and RAISES an enemy — the egg wave is no longer a permanent egg-lock; it can
 * be fought and cleared. Its id rides a namespace clear of every live process. Pure.
 */
function remountEnemyProcess(id: number, egg: EggState): DemoProcess {
  const entry = remountEntryEdge(egg.posX)
  const type: EnemyType = 'bounder'
  const enemy: EnemyState = {
    entity: {
      posX: entry.posX,
      posY: egg.posY,
      velXIndex: entry.velX,
      velXFrac: 0,
      velY: 0,
      timeUp: 1,
      groundState: null,
      plantZ: 0,
      airborne: true,
      animPhase: 0,
    },
    facing: entry.facing,
    pchase: 0,
    brain: 'linet',
    decision: brainFor(type),
  }
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'enemy', enemy, enemyType: type, collisionEnabled: true }
}

/**
 * The processes a wave sends in, entered deterministically under `seed`: the
 * scored GROUND enemies (bounders/hunters/lords) via pads (jt2-6) — each carrying
 * its EMYTIM period, DVALUE type, and a materialisation window (collisions off
 * until it exits) — PLUS the pterodactyls from the ptero nibble (jt3-4). Ids are
 * namespaced by wave so they never collide across a wave advance. Used by
 * `createWaveDemo` and the wave advance.
 *
 * jt4-4: an EGG wave enters its complement AS EGGS instead of ground enemies (WAVEGG,
 * JOUSTRV4.SRC:2737) — the predicate flows through jt2-5's `dispatchWaveType` (the shape
 * game.ts exposes as `eggWaveSpawnsEggs`; demo.ts consults dispatch directly to stay off the
 * game.ts import cycle). Egg does NOT degrade by player-count, so an egg wave stays one solo.
 */
function spawnWaveEnemies(waveNumber: number, seed: number): DemoProcess[] {
  const row = waveRowAt(waveNumber)
  if (dispatchWaveType(row.status, { p1: true, p2: true }) === 'egg') {
    return [...spawnWaveEggs(waveNumber), ...spawnWavePteros(waveNumber)]
  }
  const period = emytimForWave(waveNumber)
  const types = enemyTypesForWave(row)
  const enemies = enterViaPads(types.length, seed).map((entry) => {
    const pad = PADS.find((p) => p.id === entry.pad) ?? PADS[0]
    return enemyProcess(0x100 * waveNumber + entry.index, pad, period, types[entry.index])
  })
  return [...enemies, ...spawnWavePteros(waveNumber)]
}

/**
 * Assemble wave 1 deterministically under the SHELL's seed: P1/P2 from the spawn
 * constants, the wave-1 enemy complement (three bounders) entered via pads, each
 * with `period = emytimForWave(1) = 2` and collisions disabled while materialising,
 * the budget seeded from the pursuit nibble, and the intro message beats surfaced
 * as `beat` events. Pure — same seed, same DemoState.
 */
export function createWaveDemo(seed: number): DemoState {
  const row = waveRowAt(1)
  const base = createState(seed)

  const players: DemoProcess[] = [
    playerProcess(PLAYER1_ID, PLAYER1_SPAWN.x, PLAYER1_SPAWN.facing, PLAYER1_SPAWN.mount),
    playerProcess(PLAYER2_ID, PLAYER2_SPAWN.x, PLAYER2_SPAWN.facing, PLAYER2_SPAWN.mount),
  ]

  const enemies: DemoProcess[] = spawnWaveEnemies(1, seed)

  const sim: DemoSim = {
    frame: base.frame,
    processes: [...players, ...enemies],
    woke: base.woke,
    rng: base.rng,
    budget: seedWaveBudget(row),
    // Empty; the first stepDemo reconcile registers the live players (STPLY) with
    // their TARTIM grace, so enemies do not lock on for the first ~1.5 s.
    targets: seedTargets(),
  }

  const beats = waveBeats(dispatchWaveType(row.status, { p1: true, p2: true }))
  const events: DemoEvent[] = beats.map((b) => ({ kind: 'beat', message: b.message }))

  const arena = applyWaveDestruction(initialArenaState(), 1, row.status)

  // A fresh demo has not stepped yet, so nothing has happened to cue. The wave-1
  // complement is assembled here rather than arriving through the wave-advance
  // path, and a sound on the frame before the first step would be a sound the
  // shell has no gesture-unlocked context for anyway.
  return { sim, wave: 1, events, cues: [], arena, baiterClock: seedBaiterClock(1) }
}

// ─── The egg fall loop (STEGG/EGGLPA) with the BMI EGGBCK guard ────────────────

/**
 * One frame of a FALLING egg process: on reaching a ledge BOUNCE — but only when
 * `velY >= 0` (the `BMI EGGBCK` precondition documented in egg.ts). A still-
 * ASCENDING egg (velY < 0) at a ledge is left rising and NOT settled — the guard
 * the ROM keeps and the pure `bounceEgg` law cannot. An open-air egg accelerates
 * under the flight core's base gravity (Finding #3) and integrates its 8.8 Y. Pure.
 */
export function stepEgg(egg: EggState): EggState {
  if (egg.settled) return egg

  const pixelY = egg.posY >> 8
  const feetBelow = groundOutcome(groundMaskAt(egg.posX, pixelY + 1))

  // BMI EGGBCK: bounce ONLY a downward/level egg (velY >= 0).
  if (egg.velY >= 0 && feetBelow.kind === 'platform') {
    const bounced = bounceEgg(egg)
    // The settle law decides whether the egg rests or keeps bouncing.
    return { ...bounced, settled: eggSettles(bounced.velY, bounced.velX) }
  }

  // Open-air fall: reuse the flight core's GRAV (no cited egg-gravity constant).
  const velY = egg.velY + GRAV
  return { ...egg, velY, posY: egg.posY + velY, settled: false }
}

/**
 * Hatch a SETTLED egg into a remounting buzzard entering from the FARTHER edge, or
 * null on permadeath (`eggsLeft === 0`). Pure.
 */
export function hatchEgg(egg: EggState): RemountEntry | null {
  if (!willHatch(egg)) return null
  return remountEntryEdge(egg.posX)
}

// ─── The collision pass (the jt2-3 core, in the loop) ─────────────────────────

/**
 * The transcribed collision-span mask a live entity presents this frame (round 2):
 * a buzzard uses a wing mask flying / a body mask on the ground; a player-on-a-bird
 * the ostrich collision tables. Only masks that EXIST in COLLISION_TABLES are used
 * (BWNG1R/BWNG2R are dangling ENTITY_RECORDS references with no table — the wing
 * mask that resolves is BWNG3R / CWNG3R). Returns null for a non-participant.
 */
function collisionMaskFor(p: DemoProcess): string | null {
  if (p.kind === 'enemy' && p.enemy) return p.enemy.entity.airborne ? 'BWNG3R' : 'BSTNDR'
  if (p.kind === 'player' && p.entity) return p.entity.airborne ? 'CWNG3R' : 'CSTN4R'
  return null
}

/** A joust participant built from a demo process, or null for a non-participant. */
function toJoustEntity(p: DemoProcess): JoustEntity | null {
  if (p.kind === 'player' && p.entity) {
    const e = p.entity
    return {
      posX: e.posX,
      posY: e.posY,
      velY: e.velY,
      velX: 0,
      plantZ: e.plantZ,
      facing: p.facing ?? 1,
      bumpX: 0,
      bumpY: 0,
      party: 'player',
      collision: collisionMaskFor(p),
      groundState: e.groundState,
    }
  }
  if (p.kind === 'enemy' && p.enemy) {
    const e = p.enemy.entity
    return {
      posX: e.posX,
      posY: e.posY,
      velY: e.velY,
      velX: 0,
      plantZ: e.plantZ,
      facing: p.enemy.facing,
      bumpX: 0,
      bumpY: 0,
      party: 'enemy',
      enemyType: p.enemyType,
      collision: collisionMaskFor(p),
      groundState: e.groundState,
    }
  }
  return null
}

/**
 * Write a resolved bounce's `velY`/`posY` back onto the process that produced
 * the `JoustEntity` (jt5-4). A bounce touches exactly these two fields — the
 * ±2 `PBUMPY` shove is folded into `posY` immediately by `consumeBumpY` rather
 * than parked in a register for a later frame to drain (no `EntityState` field
 * exists for it, and the ROM's own consumer, the flight loop's
 * `ADDA PBUMPY,U / CLR PBUMPY,U`, is one frame later than the cue this story
 * pins to the SAME frame). Everything else on the entity — facing, plantZ,
 * groundState, animPhase — is untouched.
 */
function withBounced(p: DemoProcess, resolved: JoustEntity): DemoProcess {
  if (p.kind === 'player' && p.entity) {
    return { ...p, entity: { ...p.entity, velY: resolved.velY, posY: resolved.posY } }
  }
  if (p.kind === 'enemy' && p.enemy) {
    return {
      ...p,
      enemy: { ...p.enemy, entity: { ...p.enemy.entity, velY: resolved.velY, posY: resolved.posY } },
    }
  }
  return p
}

function collisionBox(e: JoustEntity): CollisionBox {
  return { x: e.posX, y: e.posY >> 8, w: ENTITY_BOX_W, h: ENTITY_BOX_H }
}

/** A broad-phase box straight off a flight entity (a ptero carries no JoustEntity). */
function entityBox(e: EntityState): CollisionBox {
  return { x: e.posX, y: e.posY >> 8, w: ENTITY_BOX_W, h: ENTITY_BOX_H }
}

/** A broad-phase box for an EGG (jt8-4) — an egg carries no JoustEntity either. */
function eggBox(e: EggState): CollisionBox {
  return { x: e.posX, y: e.posY >> 8, w: ENTITY_BOX_W, h: ENTITY_BOX_H }
}

/** The jt3-4 ptero as a lance-height joust participant. `attackFrame` false — a live
 * wave ptero/baiter glides (10±2 band); the FLY3 attacking window is not modelled
 * on the demo process, so a plain glide-band contact is the resolvable case. */
function toPteroEntity(p: DemoProcess): PteroEntity | null {
  if (p.kind !== 'ptero' || !p.entity) return null
  return { posX: p.entity.posX, posY: p.entity.posY, facing: p.facing ?? 1, attackFrame: false }
}

/** The egg process a dying enemy leaves behind (DEATH3 → a scheduler egg). */
function eggProcess(id: number, egg: EggState): DemoProcess {
  return { id, cls: 'secondary', nap: 1, period: 1, kind: 'egg', egg }
}

/**
 * The DISSOLVE process a killed ptero/baiter becomes (jt3-6): NOT the interim poof
 * and NOT an instant vanish — the body plays the three-frame ASH animation at the
 * ptero's position, then frame.ts drives it to `done` and the demo loop removes it.
 * A baiter tags the DissolveState so the (jt4) baiter count can settle on entry.
 * Its id rides a separate namespace so it never collides with a live process.
 */
function dissolveProcess(ptero: DemoProcess): DemoProcess {
  return {
    id: 0x2_0000 + ptero.id,
    cls: 'secondary',
    nap: 1,
    period: 1,
    kind: 'dissolve',
    dissolve: startDissolve({ baiter: ptero.baiter ?? false }),
    entity: ptero.entity,
  }
}

/**
 * Run the joust between overlapping ENTITY pairs (players + enemies whose
 * materialisation window has exited): broad-phase box → narrow-phase spans →
 * resolveJoust, via `resolveContacts`. Removes the loser only, leaves an egg where
 * a dying enemy stood, and surfaces the kill score. A materialising enemy
 * (collisionEnabled === false) cannot be jousted. Pure — a new list is returned.
 */
function collisionPass(processes: readonly DemoProcess[]): {
  processes: DemoProcess[]
  events: DemoEvent[]
  cues: GameEvent[]
} {
  const eligible = processes.filter(
    (p) => (p.kind === 'player' || p.kind === 'enemy') && p.collisionEnabled !== false,
  ) // NO ptero here, and the ROM disagrees: OSTHT2 — see the jt5-10 note at the foot of this file
  const removed = new Set<number>()
  const spawned: DemoProcess[] = []
  const events: DemoEvent[] = []
  // jt5-1/jt5-4 — this pass resolves six of the seventeen cued moments. They are
  // emitted where the outcome is DECIDED rather than reconstructed later from a
  // process diff, so a removal can never be mistaken for the wrong kind of death.
  const cues: GameEvent[] = []
  // jt5-4 — a bounce's resolved velY/posY, keyed by process id. `resolveContacts`
  // computes the outcome from a JoustEntity snapshot; this map is what carries
  // the applied physics back onto the actual process at the end of the pass (the
  // same shape as `caught` below for egg catches).
  const bounced = new Map<number, JoustEntity>()

  for (let i = 0; i < eligible.length; i++) {
    for (let j = i + 1; j < eligible.length; j++) {
      const pa = eligible[i]
      const pb = eligible[j]
      if (removed.has(pa.id) || removed.has(pb.id)) continue

      const a = toJoustEntity(pa)
      const b = toJoustEntity(pb)
      if (!a || !b) continue
      if (!broadPhase(collisionBox(a), collisionBox(b))) continue

      // Narrow phase consults each entity's transcribed collision-span mask
      // (round 2: live entities now carry a real mask via collisionMaskFor). An
      // entity with no transcribed mask cannot be jousted.
      if (a.collision === null || b.collision === null) continue
      const hit = narrowPhase(
        { name: a.collision, top: a.posY >> 8 },
        { name: b.collision, top: b.posY >> 8 },
        MASKS,
      )
      if (!hit) continue

      const contact = resolveContacts(a, b)
      if (contact.outcome.kind === 'bounce') {
        // ─── jt5-4: the two thud paths, applied ────────────────────────────
        // Both-enemy (SNETHD, :4961) dispatches on SCREEN Y — OSTBMP compares
        // the two PPOSY+1 bytes and sends the physically higher bird UP
        // (LBPL -> OSTUTP / fall-through -> OSTXTP, :5042-5108); an exact tie
        // still separates (LBPL branches on zero too). A tie involving a
        // PERSON (SNPTHD, :5010 "BOTH ON SAME LEVEL", :8124 "AT LEAST 1
        // PERSON THUD'ED") skips OSTBMP entirely and calls OSTXTP
        // UNCONDITIONALLY (:5053-5054) — no height test, the rise is fixed by
        // register role. The SCAN DRIVER settles which party plays which
        // register — this is a ROM fact, not a port decision: :4874
        // `LDU PLINK,U` walks the process list into U, and :4880 `LEAX ,U` /
        // :4881 `LDX PLINK,X` starts X AT U and walks it forward, so U is
        // always the EARLIER element of a pair and X always a LATER one —
        // exactly this port's `for (i) for (j = i + 1)`. So the outer loop's
        // object (`a`/`pa`) IS U (OSTXTP sends U down, OSTXDN) and the one the
        // inner loop found (`b`/`pb`) IS X (OSTXTP sends X up, OSTXUP), and
        // the same a=U/b=X mapping holds above in the SNETHD branch, where
        // OSTBMP's height compare (not the register role) decides which one
        // rises.
        const isEnemyThud = a.party === 'enemy' && b.party === 'enemy'
        let resolvedA: JoustEntity
        let resolvedB: JoustEntity
        if (isEnemyThud) {
          const aHigher = a.posY >> 8 <= b.posY >> 8
          resolvedA = consumeBumpY(aHigher ? bounceTop(a) : bounceBottom(a))
          resolvedB = consumeBumpY(aHigher ? bounceBottom(b) : bounceTop(b))
        } else {
          resolvedA = consumeBumpY(bounceBottom(a))
          resolvedB = consumeBumpY(bounceTop(b))
        }
        bounced.set(pa.id, resolvedA)
        bounced.set(pb.id, resolvedB)
        // SNPTHD (020) and SNETHD (009) send the same 6-bit code $08 at
        // different priorities — two sounds, never a collapsed 'thud'.
        cues.push({ type: isEnemyThud ? 'enemy-thud' : 'player-thud' })
        continue
      }

      const winner = contact.survivors.includes('a') ? pa : pb
      const loser = contact.survivors.includes('a') ? pb : pa
      removed.add(loser.id)
      // The loser's OWN kind picks the cue: SNEDIE "ENEMY DIES" (:8104) or SNPDIE
      // "PLAYER DIES" (:8115). Both tables send the same 6-bit code $16 at
      // different priorities, so they are two sounds, never one.
      cues.push({ type: loser.kind === 'player' ? 'player-death' : 'enemy-death' })
      // The egg rides its own id namespace so it never collides with a live process.
      if (contact.egg) spawned.push(eggProcess(0x1_0000 + loser.id, contact.egg))
      if (contact.score > 0) {
        // Attribute the kill to the WINNER: a scoring kill means an ENEMY died
        // (enemies bounce, never kill each other, resolveContacts), so the winner
        // is the surviving player. jt4-1's game.ts drain credits this player's ledger.
        events.push({ kind: 'score', value: contact.score, reason: 'kill', player: winner.id })
      }
      // jt4-4 — a PLAYER-vs-PLAYER kill is a PARTNER-KILL: emit a distinguishable event so
      // the session layer (stepGame) can drive recordPartnerKill (the gladiator award / the
      // co-op void). A partner kill carries no DVALUE (score 0, above) but names both parties;
      // jt4-3 could not tell an enemy-kill from a partner-kill and removed the loser silently.
      if (pa.kind === 'player' && pb.kind === 'player') {
        events.push({ kind: 'partnerKill', winner: winner.id, loser: loser.id })
      }
    }
  }

  // ─── Player ↔ ptero (jt3-4): the LANCE-HEIGHT joust, not the ostrich joust ───
  // A ptero contact resolves through `resolvePteroAttack` (the two height bands +
  // the opposite-facing + facing-into gates), NOT `resolveJoust`. A clean lance-
  // height kill surfaces the 1000-pt SCRHUN event (jt3-4) and the body DISSOLVES
  // (jt3-6); any other verdict is the normal joust the ptero wins → the player dies.
  const livePlayers = processes.filter(
    (p) => p.kind === 'player' && p.entity && p.collisionEnabled !== false,
  )
  const livePteros = processes.filter(
    (p) => p.kind === 'ptero' && p.entity && p.collisionEnabled !== false,
  )
  for (const pl of livePlayers) {
    for (const pt of livePteros) {
      if (removed.has(pl.id) || removed.has(pt.id)) continue
      const playerJoust = toJoustEntity(pl)
      const pteroEntity = toPteroEntity(pt)
      if (!playerJoust || !pteroEntity) continue
      if (!broadPhase(collisionBox(playerJoust), entityBox(pt.entity!))) continue

      const outcome = resolvePteroAttack(playerJoust, pteroEntity)
      if (outcome.kind === 'kill') {
        // The 1000-pt kill event is jt3-4's (pteroScoreEvent) — emitted ONCE here on
        // the kill; the dissolve replaces the interim poof and emits no score of its own.
        removed.add(pt.id)
        spawned.push(dissolveProcess(pt))
        // The killing player `pl` gets the 1000 (jt4-1 attribution); pteroScoreEvent
        // stays the jt3-4 value source (unchanged — the module test still pins it).
        events.push({ ...pteroScoreEvent(), player: pl.id })
        cues.push({ type: 'ptero-death' })
      } else {
        // pteroWins (the OSTBO fallback the epic ruled the ptero wins): the player dies.
        removed.add(pl.id)
        cues.push({ type: 'player-death' })
      }
    }
  }

  // ─── Player ↔ egg (PLYEGG :3009-3022 → EGGSCR :3030-3095) ───────────────────
  // "COLISION DETECT WITH THE EGG": a player overlapping an egg collects it. The
  // score is the EGGVAL rung for the CATCHING PLAYER's bumped DEGGS count, plus
  // the 500 mid-air bonus while the egg has not yet bounced (PFEET == 0, :3063-3069).
  // Both awards name the catcher so jt4-1's drain credits the right ledger, exactly
  // as the ROM scores into `PDECSN,U` (:3060, :3069 "IN PLAYERS WORKSPACE").
  //
  // The ladder VALUES, the cap and the bonus all stay in egg.ts (jt2-4) — this pass
  // only supplies the counter's per-player home and the collision.
  //
  // The egg is REMOVED. The ROM instead clears the egg's PID collide bit and re-points
  // the process at EGGHIT to float the score value where the egg was (EGGWAK,
  // :3088-3094) — we have no score-display entity, so removal is the honest subset:
  // it collects once and cannot be collected twice. Removal here also means a caught
  // egg is gone before the wave-egg hatch matures survivors below, which is this
  // port's reachable form of the ROM sending an inbound remount bird away (AUTOFF,
  // :3078-3087) — see the session's Design Deviations.
  const caught = new Map<number, DemoProcess>()
  for (const pl of livePlayers) {
    if (removed.has(pl.id)) continue
    let self = caught.get(pl.id) ?? pl
    for (const ep of processes) {
      if (ep.kind !== 'egg' || !ep.egg || removed.has(ep.id)) continue
      const catcher = toJoustEntity(self)
      if (!catcher) continue
      if (!broadPhase(collisionBox(catcher), eggBox(ep.egg))) continue

      const hits = bumpEggHits(self.eggHits ?? 0)
      self = { ...self, eggHits: hits }
      caught.set(pl.id, self)
      events.push({ kind: 'score', value: eggValue(hits), reason: 'egg', player: pl.id })
      const bonus = airCatchBonus(ep.egg.pfeet)
      if (bonus > 0) events.push({ kind: 'score', value: bonus, reason: 'egg', player: pl.id })
      removed.add(ep.id)
      // ONE cue per egg caught, not one per score event: a mid-air catch surfaces
      // the ladder rung AND the 500 bonus, and SNEGG "PLAYER HITS EGG SOUND"
      // (:8098) is a single sound either way.
      cues.push({ type: 'egg-collected' })
    }
  }

  if (removed.size === 0 && spawned.length === 0 && caught.size === 0 && bounced.size === 0)
    return { processes: [...processes], events, cues }
  const survivors = processes
    .filter((p) => !removed.has(p.id))
    .map((p) => {
      const withCatch = caught.get(p.id) ?? p
      const resolved = bounced.get(p.id)
      return resolved ? withBounced(withCatch, resolved) : withCatch
    })
  return { processes: [...survivors, ...spawned], events, cues }
}

/**
 * Resolve ONE overlapping pair — the wiring over the jt2-3 `resolveJoust` law.
 * Removes the LOSER (never the winner, never both), leaves the egg a dying ENEMY
 * becomes (spawnEgg, carrying its velocities), and surfaces the kill score.
 * Enemies never kill each other → always bounce. Pure.
 */
export function resolveContacts(a: JoustEntity, b: JoustEntity): ContactResult {
  const outcome = resolveJoust(a, b)
  if (outcome.kind === 'bounce') {
    return { outcome, survivors: ['a', 'b'], egg: null, score: 0 }
  }
  const victim = outcome.loser === 'a' ? a : b
  const egg =
    victim.party === 'enemy'
      ? spawnEgg({
          posX: victim.posX,
          posY: victim.posY,
          velX: victim.velX,
          velY: victim.velY,
          eggsLeft: EGGS_PER_ENEMY,
        })
      : null
  return { outcome, survivors: [outcome.winner], egg, score: outcome.score }
}

// ─── The per-frame driver ─────────────────────────────────────────────────────

/**
 * Advance one materialisation window a frame: a collision-safe enemy OR a re-materialising
 * PLAYER (jt4-5 respawn) rides the SAME bounded jt2-6 window — it counts its naps down under
 * neutral advance and TIMES OUT, PLYINT re-enabling collisions on exit (transporter.ts:226-231,
 * :230). So a re-entered knight becomes VULNERABLE again when the window ENDS and the loop can
 * close through play (Reviewer Ruling #1). A process without an active window passes through.
 */
function advanceMaterialisation(p: DemoProcess): DemoProcess {
  if (!p.mat || (p.kind !== 'enemy' && p.kind !== 'player')) return p
  const mat = stepMaterialise(p.mat, NEUTRAL_INPUT)
  return { ...p, mat, collisionEnabled: mat.collisionsEnabled }
}

/**
 * How many live BAITERS (a `kind:'ptero'` process tagged PCHASE≠0, `baiter`) disappeared
 * between two process lists — the DBAIT death ENTRY. A baiter leaves the live set ONLY via a
 * collisionPass kill (it becomes a baiter-tagged dissolve), so a disappearance is exactly one
 * PTEKLL `DEC NBAIT` settle (JOUSTRV4.SRC:1370-1372). Pure.
 */
function countBaiterDeaths(before: readonly DemoProcess[], after: readonly DemoProcess[]): number {
  const isLiveBaiter = (p: DemoProcess): boolean => p.kind === 'ptero' && p.baiter === true
  const afterIds = new Set(after.filter(isLiveBaiter).map((p) => p.id))
  let deaths = 0
  for (const p of before) if (isLiveBaiter(p) && !afterIds.has(p.id)) deaths++
  return deaths
}

/**
 * Reconcile the aggro slots against the live players (jt8-1). Drop a slot whose
 * knight is no longer live (the death-shift, JOUSTRV4.SRC:4746-4753); register a
 * live player not yet in a slot (STPLY, :4655-4665) with its TARTIM grace so an
 * enemy cannot lock on for ~1.5 s. Idempotent for an already-slotted player.
 *
 * A respawn is re-registered with a ONE-FRAME LAG: game.ts re-enters the
 * re-materialising process, and THIS reconcile — running on the NEXT stepDemo —
 * arms its fresh grace. The lag is deterministic and harmless (the knight is
 * collision-safe while it materialises anyway), not an instantaneous re-arm. Pure.
 */
function reconcileTargets(targets: TargetState, processes: readonly DemoProcess[]): TargetState {
  // A live player is a `kind:'player'` process that still carries its flight entity —
  // the SAME liveness predicate frame.ts uses to gather the selectable players
  // (frame.ts:322), so reconcile and selection never disagree on who is on-screen.
  const live = new Set<number>()
  for (const p of processes) if (p.kind === 'player' && p.entity) live.add(p.id)
  let t = targets
  for (const slot of [targets.tarply, targets.tarpl2]) {
    if (slot !== null && !live.has(slot)) t = removeTarget(t, slot)
  }
  // Register in a STABLE id order so the primary/secondary assignment is fixed by id
  // (P1 → primary, P2 → secondary), never by incidental process-list ordering.
  for (const id of [...live].sort((a, b) => a - b)) {
    if (t.tarply !== id && t.tarpl2 !== id) t = registerPlayer(t, id, TARTIM)
  }
  return t
}

/**
 * Advance the demo exactly one video frame: drive the scheduler (players +
 * enemies + eggs) through `stepFrame` (which dispatches the `egg` variant to
 * `stepEgg`), advance the materialisation windows, run the collision pass, fire
 * the 15 s growth cadence (growthDue → growWanted while enemies live), advance the
 * wave when it is cleared, and append any score/beat events. Pure — the argument is
 * never mutated. There is NO second stepping path: players ride the identical
 * `stepFrame` a solo scheduler run does.
 */
export function stepDemo(demo: DemoState, inputs?: Record<number, PlayerInput>): DemoState {
  // jt8-1: tick the grace timers FIRST (the ROM decrements them in PLYCOL, a
  // process that runs BEFORE the collisionable players / enemies), so an enemy's
  // SELPLY this frame reads the just-decremented timer.
  const tickedTargets = tickTargetTimers(demo.sim.targets)
  // uf1-2 — the demo owns the wave, so it is the layer that feeds it to the
  // scheduler. Without this argument the whole DYTBL seam is inert: the engine
  // would resolve every dial at wave 1 forever, which is the exact defect uf1-2
  // was filed for.
  //
  // `demo.wave` is the ROM's WAVBCD byte and is BCD-PACKED, not decimal — it is
  // advanced by `nextWaveBcd` below, so the tenth wave holds `0x10`. The difficulty
  // engine takes a 1-based DECIMAL wave, so the unit has to change HERE; handing it
  // the raw byte resolves the tenth wave's dials at wave 16 and crashes outright at
  // the hundredth, where the counter rolls to `0x00`.
  //
  // Do NOT read this call site as evidence that the others are right. The wave-
  // advance block below still passes the raw counter to `waveRowAt`,
  // `applyWaveDestruction`, `spawnWaveEnemies`, `trollSpawnable` and
  // `seedWaveBudget`, and `game.ts` does the same in `resolveWaveType` — all of
  // them decimal-expecting, all of them wrong from the tenth wave on. That
  // PREDATES uf1-2 and is owned by **td1-12**, which will decide once whether the
  // counter stays BCD or becomes an ordinal. Only this hop is fixed here.
  const stepped = stepFrame({ ...demo.sim, targets: tickedTargets, cues: [] }, inputs, {
    wave: decimalWaveFromBcd(demo.wave),
  })

  const materialised = stepped.processes.map((p) => advanceMaterialisation(p as DemoProcess))
  const collided = collisionPass(materialised)

  let wave = demo.wave
  // jt5-1 — the frame's cue stream starts from the collision pass's four moments
  // and gathers the rest below. A FRESH array every frame: nothing is carried in
  // from `demo.cues`, which is the whole point of the channel.
  // jt5-3 — `stepped.cues` (the wing edges frame.ts's stepFrame detected, one
  // per waking player/enemy) come FIRST: they belong to the flight-stepping
  // phase, which runs before collisionPass ever sees this frame's processes.
  const cues: GameEvent[] = [...stepped.cues, ...collided.cues]
  // A dissolve that reached `done` this frame (frame.ts stepped it there) is removed —
  // the body's fate is complete (JSR CPLYR, JOUSTRV4.SRC:1414-1415).
  let processes = collided.processes.filter((p) => !(p.kind === 'dissolve' && p.dissolve?.done))

  // jt4-5 — the WAVEGG egg-wave SELF-CLEAR: a SETTLED wave egg MATURES into a remounting
  // buzzard (egg.ts willHatch/remountEntryEdge — the jt2-4 laws, cited EGGLND/EGGMAN :3239-3279) so
  // an egg wave is no longer a permanent egg-lock. The egg leaves and a live enemy flies in
  // from the FARTHER edge — the wave can now be fought and cleared. Runs BEFORE the wave-clear
  // check below (a hatched enemy holds the wave open) and BEFORE the wave-advance spawn (so a
  // freshly-entered wave egg is not hatched on its entry frame). Only WAVE eggs mature — a
  // DEATH3 kill-egg keeps its jt2-4 lifecycle (this closes only the egg-WAVE clear jt4-4 gaps).
  processes = processes.flatMap((p) => {
    if (!(p.kind === 'egg' && p.waveEgg === true && p.egg?.settled === true && willHatch(p.egg)))
      return [p]
    // SNEGGH "EGG HATCHING SOUND" (:8099) — the maturing egg, not the remount
    // bird's flight in. One cue per egg that matured this frame.
    cues.push({ type: 'egg-hatched' })
    return [remountEnemyProcess(0x40_0000 + p.id, p.egg)]
  })

  let budget = stepped.budget
  let arena = demo.arena
  let baiterClock = demo.baiterClock ?? seedBaiterClock(demo.wave)

  // DBAIT — the NBAIT settle-on-death (PTEKLL `LDA PCHASE,U` "KILLED A BAITER?" / BEQ /
  // `DEC NBAIT`, JOUSTRV4.SRC:1370-1372): a baiter that dissolved this frame (a live baiter in
  // `materialised`, gone from the live set now — collisionPass turned it into a baiter-tagged
  // dissolve) DECrements the on-screen count, so the max-3 cap (CMPA #3-1, :2108-2109) frees a
  // slot for the next EMYOK send-off instead of the swarm holding at MAX_BAITERS forever. Runs
  // BEFORE the send-off cadence below so a freed slot lets a new baiter go this same wave.
  const baiterDeaths = countBaiterDeaths(materialised, processes)
  if (baiterDeaths > 0) baiterClock = { ...baiterClock, nbait: baiterClock.nbait - baiterDeaths }

  const enemiesLeft = processes.some((p) => p.kind === 'enemy')

  // The 15 s growth cadence — WSMART grows once per 896 frames WHILE enemies live.
  if (growthDue(stepped.frame)) budget = growWanted(budget, enemiesLeft)

  // Wave advance: a CLEARED wave advances to the next wave and enters its
  // complement via pads, deterministically under the run's RNG; WSMART re-seeds
  // from the new wave's pursuit nibble (ROM: each wave re-seeds, JOUSTRV4.SRC:2076).
  // A wave is cleared only when NO enemies AND NO eggs remain (a settled egg
  // hatches back into a buzzard, so the wave is not over while an egg lives) and a
  // player is still here to clear it. It holds while any enemy or egg lives.
  const clearable =
    !enemiesLeft &&
    !processes.some((p) => p.kind === 'egg') &&
    processes.some((p) => p.kind === 'player')
  if (clearable) {
    wave = nextWaveBcd(demo.wave)
    // WNRM — a wave start CLEARS both knights' egg-hit counters:
    //
    //     WNRM  CLR  EGGS1    RESET NUMBER OF EGGS KILLED BY PLAYER 1
    //           CLR  EGGS2    RESET NUMBER OF EGGS KILLED BY PLAYER 2
    //                                       (JOUSTRV4.SRC:1979-1980, JT86-006)
    //
    // in the same wave-setup block as `CLR WSMART`. So the EGGVAL ladder climbs only
    // WITHIN a wave — a knight who collected three eggs last wave is back on the first
    // rung here, not still holding 1,000.
    //
    // It has to be EXPLICIT for us where the ROM gets it structurally: the ROM clears
    // the fixed cells EGGS1/EGGS2 that P1DEC/P2DEC bind `DEGGS` to (:5551, :5555),
    // whereas our count rides the player process — and the advance below carries those
    // processes forward untouched. The player's OTHER reset boundary needs no code at
    // all for the same reason, in reverse: `DEATH1 CLR EGGS1` (:4669, the `DDEAD` field
    // of the dying man's own decision record) is satisfied because a death removes the
    // process and `respawnPlayerProcess` builds a fresh one.
    //
    // Scoped to the ADVANCE, never per-frame: clearing every frame would peg the ladder
    // at rung 1 forever and undo jt8-4's climb.
    processes = processes.map((p) =>
      p.kind === 'player' && p.eggHits !== undefined ? { ...p, eggHits: 0 } : p,
    )
    // The wave EVENT: burn the bridge on wave 3 and reflect this wave's cliff
    // destruction into the mutable arena (jt3-2) — latching bridge, reflecting cliffs.
    // Applied BEFORE the troll gate so the spawn reads THIS wave's burned bridge.
    const standing = new Set(arena.destroyedCliffs)
    arena = applyWaveDestruction(arena, wave, waveRowAt(wave).status)
    // SNCLIF "CLIFF DESTROYER" (:8090) — one cue per cliff this wave's status
    // nibble NEWLY took out. Compared by NAME, not by count: cliff destruction
    // reflects the current wave rather than accumulating (the WCLFEW create path
    // rebuilds one whose bit is now clear), so a wave that rebuilds CLIF1L while
    // destroying CLIF2 leaves the count unmoved and must still sound.
    for (const cliff of arena.destroyedCliffs) {
      if (!standing.has(cliff)) cues.push({ type: 'cliff-destroyed' })
    }
    const arrivals = spawnWaveEnemies(wave, stepped.rng)
    // SNECRE "ENEMY RE-CREATED (TRANSPORTER)" (:8103) per buzzard on the pads,
    // and SNPTEI, the introduction scream (:8094), per pterodactyl. An EGG wave
    // enters its complement as settled eggs instead — the machine's table has no
    // egg-laid sound, so those arrive silently.
    for (const p of arrivals) {
      if (p.kind === 'enemy') cues.push({ type: 'enemy-materialise' })
      else if (p.kind === 'ptero') cues.push({ type: 'ptero-arrives' })
    }
    processes = [...processes, ...arrivals]
    // Once the bridge has burned and the troll wave (4) is reached, the lava troll
    // grabs off CLIF5 — the full menagerie (jt3-3 trollSpawnable, consumed live).
    // Only ONE live troll at a time: nothing removes a troll placeholder yet, so
    // without this dedup guard a troll would stack one-per-wave-clear (jt3-7 N2).
    if (trollSpawnable(arena, wave) && !processes.some((p) => p.kind === 'troll'))
      processes = [...processes, trollProcess(wave)]
    budget = seedWaveBudget(waveRowAt(wave))
    // WBEGIN re-seeds the baiter schedule each wave (JOUSTRV4.SRC:2081-2089).
    baiterClock = seedBaiterClock(wave)
  } else if (stepped.frame % NAP_FRAMES === 0) {
    // The EMYOK send-off cadence (once per PCNAP-8 nap-tick): advance the baiter
    // clock, and on a send-off scramble a live baiter that enters and hunts. A
    // per-frame id keeps it clear of every other process namespace. DBAIT baiter
    // removal is deferred (jt4): nbait settles at MAX_BAITERS and the swarm holds.
    const beat = stepBaiterClock(baiterClock)
    baiterClock = beat.clock
    if (beat.spawned) {
      processes = [...processes, baiterProcess(0x30_0000 + stepped.frame)]
      // A baiter IS a pterodactyl (PCHASE ≠ 0) and enters the same way, so it
      // gets the same introduction scream.
      cues.push({ type: 'ptero-arrives' })
    }
  }

  // jt8-1: reconcile the target slots against the FINAL live players — drop a slot
  // whose knight died this frame (the death-shift), and register any live player not
  // yet in a slot (STPLY: a fresh wave's knights, or a respawn re-entered by game.ts)
  // with its TARTIM grace. Idempotent for an already-slotted player.
  const targets = reconcileTargets(tickedTargets, processes)

  const sim: DemoSim = {
    frame: stepped.frame,
    processes,
    woke: stepped.woke,
    rng: stepped.rng,
    budget,
    targets,
  }
  // Cap the log to its most recent entries — the append-only history would
  // otherwise grow unbounded (nothing drains it until the jt4 score display).
  const events = [...demo.events, ...collided.events].slice(-EVENT_LOG_CAP)
  return { sim, wave, events, cues, arena, baiterClock }
}

// ─── Round 2: pure render-SELECTION seams (routing≠geometry) ──────────────────
// The user's live playtest surfaced three render bugs main.ts cannot be unit-
// tested for (it boots a canvas). So the SELECTION — which transcribed frame,
// which sprite layers, which draw order — is extracted here as PURE functions that
// return DATA (ENTITY_RECORDS frame names / atlas block names); the shell blits
// what they return. Pinning the OUTPUT is the routing≠geometry discipline.

/**
 * The buzzard-rider frame for an enemy, from its MOTION: airborne → a wing-flap
 * frame; on the ground and running (`animPhase` 1..4, `PFRAME`) → the run frames
 * BRRUN1..BRRUN4 cycling by the phase (the animation the user reported missing);
 * on the ground and still → BRSTND. The frame name is always the RIGHT-facing
 * record; `drawList` tags each op with the entity's `facing` and the shell
 * mirrors a left-facer at the blit (jt2-9 — the flip is DATA, not by-eye). Pure.
 */
export function enemyFrame(p: DemoProcess): string {
  const e = p.enemy?.entity
  if (!e || e.airborne) return 'BRFLAP'
  const phase = e.animPhase ?? 0
  if (phase >= 1 && phase <= 4) return `BRRUN${phase}`
  return 'BRSTND'
}

/**
 * The pterodactyl FLYING frame for a ptero/baiter, by facing (and animation phase).
 * The name resolves to its IPTERO POSOFF record (PT1R..PT3L) so `entityOp` lifts it
 * off its feet onto the flight line — the seed-4 no-lift, closed for the ptero. Pure.
 */
export function pteroFrame(p: DemoProcess): string {
  const suffix = (p.facing ?? 1) < 0 ? 'L' : 'R'
  const idx = ((p.entity?.animPhase ?? 0) % 3) + 1 // PT1..PT3
  return `PT${idx}${suffix}`
}

/**
 * The lava-troll GRABBING HAND frame, by grip progress (animPhase → GRAB1..GRAB6).
 * The name resolves to its ILAVAT POSOFF record so the hand is lifted as it grips
 * off CLIF5. Right-facing record; the shell mirrors a left-facer at the blit. Pure.
 */
export function trollFrame(p: DemoProcess): string {
  const idx = ((p.entity?.animPhase ?? 0) % 6) + 1 // GRAB1..GRAB6
  return `GRAB${idx}`
}

/**
 * The ASH dissolve frame for a dying ptero/baiter (jt3-6). ASH1R is the transcribed
 * CLIFER frame; it carries NO POSOFF record (the ROM dissolve blits via CLIFER, not
 * WRHOR2/POSOFF), so it draws at the body's feet — the render obligation is the FRAME,
 * the lift is deliberately absent (TEA design deviation). The shell blits ASH
 * UNMIRRORED (the ROM draws it direction-agnostic; an ash cloud has no facing), so
 * `paintDissolve` ignores the op's `facing`. Pure.
 */
export function dissolveFrame(): string {
  return 'ASH1R'
}

/** The mount frame for a player's bird, by mount + motion (ostrich `O*` / stork `S*`). */
function mountFrame(mount: 'ostrich' | 'stork', e: EntityState): string {
  const phase = e.animPhase ?? 0
  const running = !e.airborne && phase >= 1 && phase <= 4
  if (mount === 'stork') {
    if (e.airborne) return 'SFLY1R'
    if (running) return `SRUN${phase}R`
    return 'SRUNSR'
  }
  if (e.airborne) return 'ORFLAP'
  if (running) return `ORRUN${phase}`
  return 'ORSTND'
}

/**
 * The ordered draw layers for a PLAYER: `[mount, rider]` — the bird drawn first
 * (under), the PLY* knight on top. The mount is an ostrich block for P1 / a stork
 * block for P2 (the mount the user reported missing entirely). Pure.
 */
export function playerDrawList(p: DemoProcess): string[] {
  if (!p.entity) return []
  const mount = p.mount ?? 'ostrich'
  // The rider colour distinguishes the players: P1 (ostrich) is the colour-5
  // knight PLYR1, P2 (stork) the colour-7 knight PLYR2 — the same 7×7 shape in
  // swapped colours (PLY1R nibble 5 / PLY2R nibble 7; JOUSTI.SRC:2046/2076).
  // Drawing PLYR1 for both is the "both players are yellow" bug.
  const rider = mount === 'stork' ? 'PLYR2' : 'PLYR1'
  return [mountFrame(mount, p.entity), rider]
}

/** A lower/foreground platform tile — drawn AFTER entities so it occludes them.
 *
 * NOTE (jt2-9): the single `destY >= 0xC0` threshold is a DEMO/SHELL choice, not
 * a transcribed ROM constant — the ROM has no per-tier depth field (it draws the
 * background once, `BCKUP` JOUSTRV4.SRC:993-1014, and reactively refreshes a
 * disturbed cliff via the `BCKRFS` flag :6799-6801). CLIF5 is architecturally
 * distinct (compacted `COMCL5`, separately un-compacted, excluded from the manual
 * CLIF1L..CLIF5 loop), which is consistent with singling out the bottom tier but
 * does not derive 0xC0. True per-tier depth is underivable from the source. */
function isForegroundArena(destY: number): boolean {
  return destY >= 0xc0
}

/**
 * The transcribed POSOFF offset for an entity frame (jt2-9): the ROM stores
 * `XOFF*256 + 256-YOFF` in each ENTITY_RECORDS `position` word (the `POSOFF`
 * macro, JOUSTI.SRC:12-13). The blit destination is `destX = CLSX + XOFF`,
 * `destY = CLSY − YOFF` (`WRHOR2`, JOUSTRV4.SRC:6092-6098), where CLSY is the
 * whole-pixel FEET Y. Without this the sprite draws its top-left AT the feet and
 * clips through every ledge; the mount/rider (different POSOFFs) stack at one
 * origin. Unknown frames (no record) take a zero offset. Pure.
 */
function posOffset(name: string): { xoff: number; yoff: number } {
  const rec = ENTITY_RECORDS.find((r) => r.name === name)
  if (!rec) return { xoff: 0, yoff: 0 }
  return { xoff: rec.position >> 8, yoff: 256 - (rec.position & 0xff) }
}

/** One POSOFF-placed, facing-tagged entity op from a frame name + feet position. */
function entityOp(name: string, posX: number, feetY: number, facing: Facing): DrawOp {
  const { xoff, yoff } = posOffset(name)
  return { kind: 'entity', name, x: posX + xoff, y: feetY - yoff, facing }
}

/**
 * The whole frame's ordered render ops: back platforms → entity sprites →
 * FOREGROUND (lower) platforms that occlude entities standing behind them. A
 * monolithic "all arena, then all entities" leaves foreground cliffs behind the
 * sprites (the user's z-order bug); this list draws some arena AFTER the entities.
 * Pure.
 */
export function drawList(demo: DemoState): DrawOp[] {
  const back: DrawOp[] = []
  const fore: DrawOp[] = []
  for (const rec of BACKGROUND_RECORDS) {
    const destY = rec.dest & 0xff
    const op: DrawOp = {
      kind: 'arena',
      name: rec.source,
      x: ((rec.dest >> 8) & 0xff) * 2,
      y: destY,
      height: rec.wh & 0xff,
    }
    ;(isForegroundArena(destY) ? fore : back).push(op)
  }

  // Each entity op carries its transcribed POSOFF placement (so feet sit on the
  // ledge and the mount/rider align) and its `facing` (so the shell mirrors a
  // left-mover) — the render SELECTION stays pure DATA (routing≠geometry).
  const entities: DrawOp[] = []
  for (const p of demo.sim.processes) {
    if (p.kind === 'player' && p.entity) {
      const facing = p.facing ?? 1
      for (const name of playerDrawList(p)) {
        entities.push(entityOp(name, p.entity.posX, p.entity.posY >> 8, facing))
      }
    } else if (p.kind === 'enemy' && p.enemy) {
      const e = p.enemy.entity
      entities.push(entityOp(enemyFrame(p), e.posX, e.posY >> 8, p.enemy.facing))
    } else if (p.kind === 'egg' && p.egg) {
      entities.push(entityOp('EGGI', p.egg.posX, p.egg.posY >> 8, 1))
    } else if (p.kind === 'ptero' && p.entity) {
      entities.push(entityOp(pteroFrame(p), p.entity.posX, p.entity.posY >> 8, p.facing ?? 1))
    } else if (p.kind === 'troll' && p.entity) {
      entities.push(entityOp(trollFrame(p), p.entity.posX, p.entity.posY >> 8, p.facing ?? 1))
    } else if (p.kind === 'dissolve' && p.entity) {
      // Carry the DissolveState.frame onto the op so the shell's paintDissolve
      // decodes and paints THAT ASH frame (jt3-7 B1), not a frozen frame 0.
      entities.push({
        ...entityOp(dissolveFrame(), p.entity.posX, p.entity.posY >> 8, p.facing ?? 1),
        frame: p.dissolve?.frame ?? 0,
      })
    }
  }

  return [...back, ...entities, ...fore]
}

// ─── KNOWN GAP: PTERO-VS-PTERO NEVER COLLIDES HERE (jt5-10) ──────────────────
//
// `collisionPass`'s eligible set filters to `player | enemy`, and a ptero is
// resolved only through `resolvePteroAttack` against a PLAYER. So two pteros
// never meet in this port. The ROM does not agree, and the divergence is
// recorded here rather than fixed: the fix is a gameplay change, and the user's
// jt5-10 ruling moved it to its own story.
//
// Appended at the foot of the module deliberately. Inserting these lines beside
// `collisionPass` would shift roughly a hundred `demo.ts:N` citations that other
// suites and several ARCHIVED sessions carry, and archived sessions are
// permanent records that cannot be corrected.
//
// WHAT THE ROM DOES. `OSTHT2` sounds the cue FIRST and dispatches on species
// afterwards, so the thud is already playing before anyone knows who collided:
//
//   :5019  OSTHT2  LDX  #SNETHD     ENEMIES COLIDE
//   :5020          JSR  VSND
//   :5022-5027     LDA PID,U / CMPA #$80+PTEID / BEQ OSTH12
//                  LDA PID,X / CMPA #$80+PTEID / BEQ OSTH13
//   :5031-5033  OSTH12  LDA PID,X / CMPA #$80+PTEID / BEQ OSTH11
//   :5028       OSTH11  JSR OSTBMP  NO-ONE DIES, BUT BUMP EACH OTHER ANYWAYS
//
// A ptero-vs-BIRD pair goes to PTEBRD (:5034, and :5037-5038 after `EXG X,U` so
// the ptero is in U). A ptero-vs-PTERO pair falls back to OSTH11 — the ordinary
// bump — with SNETHD already sounded. The branch is reached from
// `:4961  BNE OSTHT2   BR=NO KILL (ENEMY VS. ENEMY, PTERO VS. PTERO)`.
//
// SO THE CUE IS REACHABLE IN PRINCIPLE AND UNREACHABLE IN FACT. jt3-5's baiters
// cap at three live pteros (`src/core/baiter.ts`), so two really do coexist in
// ordinary play; `enemy-thud` already exists as a kind and its comment in
// `src/core/events.ts` already names ptero-vs-ptero. Only the eligible set is
// missing — which is exactly why widening it is a mechanic, not a cue fix.
//
// The ROM routing above is pinned verbatim by
// tests/audio-ptero-wing-source.test.ts, which ALSO guards that the eligible-set
// filter stays as it is, so this gap cannot be closed by accident in a story
// that did not price it.
