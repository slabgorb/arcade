// src/core/frame.ts
//
// Story jt1-1 (GREEN, Julia) — the core skeleton the epic's simulation grows
// into. Everything here is pure: no clock read, no ambient entropy, no browser
// surface. The sim advances only when the shell steps it, one whole video
// frame at a time — the ROM's own nap unit.
//
// Story jt2-1 (GREEN, Julia) — the cooperative process scheduler core. The bare
// frame counter grows into the ruled ROM-shaped simulation state: a tagged-union
// process list, frame naps, two scheduling classes, kill by id+mask, and the
// per-frame RNG stir. SEMANTICS ONLY (epic jt2 ruling, binding): there is NO
// 56-byte block, NO PPC resume address, NO 40×56 RAM pool here — those stay
// dossier CITATIONS. What the ROM's scheduler MEANS is modelled:
//
//   • A process naps in whole frames (`PNAP`, RAMDEF.SRC:171 — 1 nap = 1 frame).
//     `nap` counts down one per frame and the process WAKES on the frame it
//     reaches 0 (`DEC PNAP,U / BEQ EXELOP`, SYSTEM.SRC:233,250 — nap N wakes on
//     pass N). On waking a process re-naps to `period` — the one degree of
//     freedom the ROM leaves to the process body (`NAPTIM STA PNAP,U`,
//     SYSTEM.SRC:225), compressed into a field.
//   • Two scheduling classes run as two FULL passes: every primary steps before
//     any secondary each frame (`PRISEC`, SYSTEM.SRC:217,231,248; PROCCR sets
//     PPRI=0, SECCR 255, RAMDEF.SRC:8-18).
//   • Kill takes id + mask, so one call kills a whole class of ids
//     (`KLPROC` — `ANDB PID,U / CMPB ,S`, SYSTEM.SRC:341-347).
//   • The RNG advances once per frame independent of consumption, mirroring the
//     IRQ's timer stir (`INC RANDOM / DEC RANDOM+1`, SYSTEM.SRC:581-582), via a
//     seeded deterministic generator whose durable word is carried in state and
//     seeded by the SHELL. The core mints no entropy (the purity guard forbids
//     Math.random / clock reads in src/core).

import {
  flap,
  stepFlight,
  tickTimeUp,
  land,
  groundMaskAt,
  stepGround,
  takeOff,
  walkOff,
  wingEdge,
  type EntityState,
  type PlayerInput,
} from './flight.js'
import { applyCeiling, groundOutcome, wrapX } from './arena.js'
import {
  stepEnemyDetailed,
  shouldPromote,
  promote,
  type EnemyState,
  type IntelBudget,
  type PlayerView,
} from './enemy.js'
// jt5-3: the wing cue this frame's flight stepping produced (or none). frame.ts
// dispatches `GameEvent`s the same way demo.ts does — as DATA on the returned
// state — so a wing edge detected here rides `GameState.cues` up to `stepDemo`
// exactly like collisionPass's cues already do.
import type { GameEvent, GameEventKind } from './events.js'
// jt8-1: the aggro subsystem. frame.ts asks it, per waking enemy, WHICH player to
// hunt (SELPLY), then hands that PlayerView to the enemy's existing seek. target.ts
// is a leaf core (imports nothing back), so no cycle. The `targets` state rides the
// sim like `budget` does.
import { selectTarget, type TargetState, type TargetPlayer } from './target.js'
// jt2-7: the egg fall loop lives in the demo wiring (which names the BMI EGGBCK
// guard + bounceEgg at its call site). frame.ts dispatches the `kind: 'egg'`
// variant to it so an egg rides the SAME cooperative scheduler players/enemies do
// — not a forked stepping path. This is a value cycle demo.ts ↔ frame.ts, safe
// because neither module calls the other at evaluation time, only at call time.
import { stepEgg } from './demo.js'
import type { EggState } from './egg.js'
// jt3-7: the ptero/baiter flight (gravity-exempt) and the death dissolve are pure
// cores (jt3-4/jt3-6) that were INERT in the scheduler; frame.ts now dispatches
// them so a live ptero flies and a dissolving body advances in-scheduler. Both are
// leaf cores (ptero → wave/flight/joust, dissolve → nothing), so no import cycle back.
import { stepPteroFlight } from './ptero.js'
import { stepDissolve, type DissolveState } from './dissolve.js'

export type { EntityState, PlayerInput, EnemyState, IntelBudget }

/**
 * The Williams video frame rate: an 8 MHz master clock divided by a
 * 512x260 raster. The 1982 hardware naps in whole frames, so this is the
 * simulation's only timebase.
 */
export const FRAME_HZ = 8_000_000 / (512 * 260)

/** `PPRI` — a process's scheduling class. Primary steps before secondary. */
export type ProcessClass = 'primary' | 'secondary'

/** What a caller hands to `spawn` to create a process (`PROCCR`/`SECCR`). */
export interface ProcessSpec {
  /** `PID` — unique, non-zero. Kills select by `(id & mask) === target`. */
  id: number
  /** `PPRI` — primary or secondary. */
  cls: ProcessClass
  /** `PNAP` — frames until the first wake. >= 1. */
  nap: number
  /** Re-nap applied on each wake (1 = every frame). */
  period: number
  /** Tagged-union discriminant: 'player', later 'enemy'/'egg'/'wave'/… */
  kind: string
  /** A player process carries its flight/ground state here. */
  entity?: EntityState
  /** An `kind: 'enemy'` process carries its mind + flight state here (jt2-2). */
  enemy?: EnemyState
  /** A `kind: 'egg'` process carries its egg state here (jt2-7). */
  egg?: EggState
  /** A `kind: 'dissolve'` process carries its death-dissolve state here (jt3-7). */
  dissolve?: DissolveState
  /**
   * `PFACE` — a player's facing (+1 right / −1 left, RAMDEF.SRC:186). jt2-9
   * threads it into the ground step (so the reversal/skid chain is reachable)
   * and flips it from input every frame (`AIROVR`, :6451-6481). Undefined for a
   * bare scheduler process spawned without one → treated as right-facing.
   */
  facing?: -1 | 1
  /**
   * jt5-3 — a PLAYER process's wing-edge memory: the `flapHeld` LEVEL it
   * carried LAST FRAME (`CURJOY+1`, :6168-6169/:6195-6196). Lives on the
   * process, like `facing` above and for the identical reason (demo.ts Finding
   * #2): the shared, GENERATED `EntityState` cannot safely grow it — the
   * scheduler.test.ts migration guard JSON-compares only `.entity` against a
   * pre-jt5-3 reference pipeline. Undefined reads as `false`.
   */
  prevFlapHeld?: boolean
}

/** A scheduled process. Plain data — the behaviour is dispatched by `kind`. */
export interface Process extends ProcessSpec {}

/** The whole of the simulation state after the jt2-1 migration. */
export interface GameState {
  /** Frame index — the pre-jt2 GameState was only this. */
  readonly frame: number
  /** The tagged-union process list. */
  readonly processes: readonly Process[]
  /**
   * The ordered ids that WOKE on the most recent `stepFrame` — primaries first,
   * then secondaries, in list order within each class. Empty at creation and on
   * any frame nothing woke.
   */
  readonly woke: readonly number[]
  /**
   * `RANDOM` — the durable mulberry32 seed word, stirred once per frame and
   * threaded across frames. Plain data (battlezone's "durable seed word" pattern)
   * so the reducer stays pure.
   */
  readonly rng: number
  /**
   * The global intelligence budget (NSMART/WSMART, jt2-5's carried seam). Threaded
   * onto the sim so `stepFrame` can promote dumb enemies IN-SCHEDULER: a waking
   * dumb enemy with budget room becomes smart and debits NSMART. Seeded empty by
   * `createState`; the wave machine seeds the wanted count via `withBudget`.
   */
  readonly budget: IntelBudget
  /**
   * jt8-1 — the enemy AGGRO state (SELPLY/TARPLY/TARTM, target.ts), carried like
   * `budget`. OPTIONAL so a bare scheduler run (`createState`) needs no target
   * state: absent → every enemy is stepped with `player = null` (the pre-jt8-1
   * behaviour). The demo seeds and advances it (`DemoSim.targets`).
   */
  readonly targets?: TargetState
  /**
   * jt5-3 — the `GameEvent`s the most recent `stepFrame` produced (today, only
   * the four wing cues — a player or enemy's press/release edge). The SAME
   * shape as `woke`: empty at creation, REBUILT from scratch every step, never
   * accumulated (`stepFrame` never READS `state.cues`, only builds a fresh
   * one). `stepDemo` reads the RETURNED value and prepends it to its own cue
   * stream.
   */
  readonly cues: readonly GameEvent[]
}

/** One drawn random plus the advanced state — the probe for the RNG stream. */
export interface Draw {
  /** A float in [0, 1). */
  readonly value: number
  /** The state after one generator advance. */
  readonly state: GameState
}

// ─── RNG: mulberry32, inlined pure ──────────────────────────────────────────
//
// Lifted BYTE-FOR-BYTE from @arcade/shared/src/rng.ts (SH-3, ADR-0001), the
// same mulberry32 four arcade games ship. joust does not yet pin @arcade/shared,
// and the generator is three pure lines, so it is inlined here rather than
// pulling a git-URL dependency for it — the durable word `rng` is carried in
// GameState and this advance is a pure transform of it, producing the identical
// float sequence as the shared module's `nextFloat` for any seed.

/** Advance the durable word once, returning the float and the next word. */
function rngNext(word: number): { value: number; next: number } {
  const next = (word + 0x6d2b79f5) >>> 0
  let t = next
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return { value, next }
}

// ─── The scheduler ──────────────────────────────────────────────────────────

/**
 * The deterministic starting state. The seed is the shell's — core mints no
 * entropy. No processes, RNG at the seed.
 */
export function createState(seed: number): GameState {
  return {
    frame: 0,
    processes: [],
    woke: [],
    cues: [],
    rng: seed >>> 0,
    budget: { nsmart: 0, wsmart: 0 },
  }
}

/** Create a process and append it to the list (`PROCCR`/`SECCR`). Pure. */
export function spawn(state: GameState, spec: ProcessSpec): GameState {
  return { ...state, processes: [...state.processes, { ...spec }] }
}

/**
 * Kill every process whose `(id & mask) === target` in ONE call — the `KLPROC`
 * id+mask law (SYSTEM.SRC:341-347). With `mask` isolating a class's id bits this
 * removes a whole class; with `mask` = 0xFF it removes exactly the one process
 * with `id === target`. Touches neither the frame counter nor the RNG. Pure.
 */
export function kill(state: GameState, target: number, mask: number): GameState {
  return { ...state, processes: state.processes.filter((p) => (p.id & mask) !== target) }
}

/** Draw one random from the durable stream, returning it and the advance. Pure. */
export function draw(state: GameState): Draw {
  const { value, next } = rngNext(state.rng)
  return { value, state: { ...state, rng: next } }
}

/** A player waking with no input this frame glides — no flap, no direction. */
const NEUTRAL_INPUT: PlayerInput = { dir: 0, flap: false, flapHeld: false }

/**
 * One frame of a player process, driven from the list. This is `main.ts`'s
 * `stepPlayer` body verbatim (jt1-6) — the existing flight/ground pipeline,
 * unchanged, so the jt1-5 seeded replay reproduces bit-for-bit now that players
 * are stepped from the process list instead of the demo's own loop.
 */
function stepPlayerEntity(state: EntityState, input: PlayerInput, facing?: -1 | 1): EntityState {
  let s = state

  if (s.airborne) {
    if (input.flap) s = flap(s, input)
    s = stepFlight(s, input)
    s = { ...s, timeUp: tickTimeUp(s.timeUp) }

    const ceiling = applyCeiling(s.posY, s.velY)
    s = { ...s, posY: ceiling.posY, velY: ceiling.velY }
    s = { ...s, posX: wrapX(s.posX) }

    const outcome = groundOutcome(groundMaskAt(s.posX, s.posY >> 8))
    if (outcome.kind === 'platform') s = land(s, outcome.platform)
  } else {
    // Facing threaded through (jt2-9): a reversal (dir against facing) reaches the
    // onMinus skid chain — unreachable while the ground step was facing-blind.
    s = stepGround(s, input, facing)
    s = { ...s, posX: wrapX(s.posX) }
    if (input.flap) {
      s = takeOff(s)
    } else if (groundOutcome(groundMaskAt(s.posX, (s.posY >> 8) + 1)).kind === 'airborne') {
      s = walkOff(s)
    }
  }

  return s
}

/** jt5-3 — a raw `WingEdge` plus which species produced it, as an event kind. */
function wingCue(edge: ReturnType<typeof wingEdge>, species: 'player' | 'enemy'): GameEventKind | undefined {
  if (edge === null) return undefined
  return species === 'player'
    ? edge === 'down'
      ? 'player-wing-down'
      : 'player-wing-up'
    : edge === 'down'
      ? 'enemy-wing-down'
      : 'enemy-wing-up'
}

/**
 * Run a woken process's kind-dispatched behaviour, threading the intelligence
 * budget. Returns the new process, the (possibly-debited) budget — only an
 * enemy promotion changes it; every other kind passes it through untouched —
 * and (jt5-3) the wing cue this wake produced, for player/enemy only.
 */
function runBehaviour(
  p: Process,
  budget: IntelBudget,
  inputs?: Record<number, PlayerInput>,
  wave = 1,
  target?: PlayerView | null,
): { process: Process; budget: IntelBudget; cue?: GameEventKind } {
  if (p.kind === 'player' && p.entity) {
    const input = inputs?.[p.id] ?? NEUTRAL_INPUT
    // A bare scheduler process may carry no facing → treat as right-facing.
    const facing: -1 | 1 = p.facing ?? 1
    // jt5-3: captured BEFORE the step — the law reads the LEVEL this player
    // carried entering this frame, never the one `stepPlayerEntity` computes.
    const wasAirborne = p.entity.airborne
    const prevFlapHeld = p.prevFlapHeld ?? false
    // Step FIRST with the current facing, so a ground reversal (dir against
    // facing) enters the skid chain this frame; THEN flip PFACE from input —
    // `AIROVR` sets PFACE = sign(dir) every frame the stick is pushed, holds on
    // neutral (JOUSTRV4.SRC:6451-6481). Facing lives on the PROCESS, so the
    // entity a solo scheduler run computes is unchanged (the routing≠geometry
    // drive pin compares entities, and it stays bit-identical).
    const entity = stepPlayerEntity(p.entity, input, facing)
    const nextFacing: -1 | 1 = input.dir === 0 ? facing : input.dir > 0 ? 1 : -1
    return {
      process: { ...p, entity, facing: nextFacing, prevFlapHeld: input.flapHeld },
      budget,
      cue: wingCue(wingEdge(wasAirborne, prevFlapHeld, input), 'player'),
    }
  }
  // An enemy integrates on each wake through its own brain + the shared flight
  // core (jt2-2). The EMYTIM divider is this process's `period` — the enemy is
  // woken every Nth frame — not a scale inside the step. jt2-5 turns ON
  // in-scheduler promotion: a dumb enemy (PCHASE 0) waking with budget room
  // (NSMART < WSMART) promotes to ITS decision brain and debits NSMART; an
  // already-smart enemy is never re-promoted.
  if (p.kind === 'enemy' && p.enemy) {
    let enemy = p.enemy
    let next = budget
    if (enemy.pchase === 0 && shouldPromote(next)) {
      const promoted = promote(enemy, next)
      enemy = promoted.enemy
      next = promoted.budget
    }
    // jt8-1: the enemy now RECEIVES its target (SELPLY, computed by the caller from
    // the aggro state + the live players). Absent aggro state → `target` is null →
    // the vertical-seek branch stays dormant (the pre-jt8-1 behaviour, unchanged).
    // uf1-2: and the wave it reads its DYTBL dials at — the down-seek brake. Both
    // are live, but they OVERLAP: `smartDecision`'s seek-up clause and its brake
    // clause return the identical `flap: true`, so the decision is their DISJUNCTION
    // and the wave-dependent brake only CHANGES the outcome where seek-up is false —
    // i.e. the enemy is at or above its quarry, or has none. (Not an artefact of the
    // clause order: verified exhaustively that the two orderings are extensionally
    // identical. The gating is the ROM's — `LBLT BOUNUP` at JOUSTRV4.SRC:3800 sends
    // a buzzard whose quarry is above onto the up path, and BODNVY is read past it
    // at :3819, on the down path only.)
    // jt5-3: `stepEnemyDetailed` runs the SAME brain + flight step `stepEnemy`
    // does (it IS stepEnemy's implementation) and additionally reports the wing
    // edge that wake produced, from the `input.flap`/`flapHeld` only it sees.
    const stepped = stepEnemyDetailed(enemy, { player: target ?? null, wave })
    return {
      process: { ...p, enemy: stepped.enemy },
      budget: next,
      cue: wingCue(stepped.wingEdge, 'enemy'),
    }
  }
  // An egg is a scheduler process too (jt2-7): each wake integrates its fall
  // through the demo's `stepEgg` (the STEGG/EGGLPA loop + the BMI EGGBCK guard).
  if (p.kind === 'egg' && p.egg) {
    return { process: { ...p, egg: stepEgg(p.egg) }, budget }
  }
  // A ptero/baiter flies each wake through the gravity-EXEMPT stepPteroFlight (jt3-4)
  // — ADDGRX skips the mount's `ADDB GRAV`, so posY integrates by VY untouched. It
  // carries no PlayerInput (a live ptero is not stick-driven here).
  if (p.kind === 'ptero' && p.entity) {
    return { process: { ...p, entity: stepPteroFlight(p.entity, NEUTRAL_INPUT) }, budget }
  }
  // A dissolving body advances its ASH animation each wake (jt3-6); when it reaches
  // `done` the demo loop removes it from the process list.
  if (p.kind === 'dissolve' && p.dissolve) {
    return { process: { ...p, dissolve: stepDissolve(p.dissolve) }, budget }
  }
  return { process: p, budget }
}

/**
 * Advance exactly one video frame. TWO full passes — all primaries, then all
 * secondaries — each asleep process's nap decrements, a waker (nap reaches 0)
 * runs its kind's behaviour and re-naps to `period`, and the RNG stirs ONCE
 * (independent of consumption). Pure — the returned state is new; the argument
 * is never mutated. `inputs` supplies this frame's `PlayerInput` per process id.
 */
export function stepFrame(
  state: GameState,
  inputs?: Record<number, PlayerInput>,
  opts?: { wave?: number },
): GameState {
  // uf1-2 — the 1-based wave the enemy brains read their DYTBL dials at. It is a
  // PARAMETER, not a GameState field: the scheduler is a pure frame stepper and the
  // wave belongs to the demo layer above it. Defaults to 1, so every caller that
  // predates the per-wave difficulty seam keeps its exact previous behaviour.
  const wave = opts?.wave ?? 1
  const processes = state.processes
  const next: Process[] = new Array(processes.length)
  const woke: number[] = []
  // jt5-3 — this frame's wing cues. Fresh every call, like `woke`: nothing is
  // carried in from `state.cues`.
  const cues: GameEvent[] = []
  let budget = state.budget

  // jt8-1: the live players an enemy's SELPLY may pick from, and the aggro state
  // it consults. Only gathered when a target state rides the sim (the demo path);
  // a bare scheduler run leaves `players` empty and every enemy sees `null`.
  const targets = state.targets
  const players: TargetPlayer[] = []
  if (targets) {
    for (const p of processes) {
      if (p.kind === 'player' && p.entity) {
        // jt8-2: `velXIndex` rides along so the homing throttle can compare the
        // enemy's own FLYX index against its target's (`BOLEVB`, :3939-3940).
        players.push({
          id: p.id,
          posX: p.entity.posX,
          pixelY: p.entity.posY >> 8,
          velXIndex: p.entity.velXIndex,
        })
      }
    }
  }

  const pass = (cls: ProcessClass): void => {
    processes.forEach((p, i) => {
      if (p.cls !== cls) return
      const napped = p.nap - 1
      if (napped > 0) {
        next[i] = { ...p, nap: napped }
        return
      }
      // Per waking enemy: SELPLY the player it hunts (or null when nobody is
      // targetable / no aggro state rides the sim).
      const target =
        targets && p.kind === 'enemy' && p.enemy
          ? selectTarget(
              targets,
              { posX: p.enemy.entity.posX, pixelY: p.enemy.entity.posY >> 8 },
              players,
            )
          : null
      const ran = runBehaviour(p, budget, inputs, wave, target)
      next[i] = { ...ran.process, nap: p.period }
      budget = ran.budget
      if (ran.cue !== undefined) cues.push({ type: ran.cue })
      woke.push(p.id)
    })
  }
  pass('primary')
  pass('secondary')

  return {
    frame: state.frame + 1,
    processes: next,
    woke,
    cues,
    rng: rngNext(state.rng).next,
    budget,
    // Carry the aggro state through untouched — the demo ticks/reconciles it.
    targets: state.targets,
  }
}
