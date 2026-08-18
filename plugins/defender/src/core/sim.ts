// plugins/defender/src/core/sim.ts
//
// Story df3-6 (GREEN) — the pure aggregate that wires the df3 core into ONE tick. df3-1..5
// shipped each piece in isolation (scheduler, world/camera, ship, stars, laser); this
// module composes them so `stepSim(state, input)` advances the whole live sim once, and
// `createSim(rand)` seeds it. PURE, clock-free src/core (tests/purity.test.ts scans it):
// it imports only sibling core modules, reads no clock, and mints no entropy — STINIT's
// RAND is INJECTED by the shell (createSim's `rand` argument), exactly as stars.ts asks.
//
// The shell drives this off @shared/loop: main.ts calls stepSim() once per fixed 60 Hz
// tick with the per-tick Input snapshot the shell samples (shell/input.ts mapInput).
//
// ─── THE ORDER OF ONE TICK (mirrors the ROM PLAYER frame) ─────────────────────────
//   1. REV      stepReverse   — one held press flips facing exactly once (ship.ts)
//   2. PLAXV    stepVelocityX — damp then thrust on the 24-BIT accumulator (ship.ts)
//   3. VERTICAL stepVerticalY — freeze/kick/accelerate/integrate the clamped strip
//   4. PLAY1    slide         — camera slide; it consumes the TOP 16 BITS of PLAXV
//                               (plaxv24 >> 8 — the sub-pixel low byte is ship territory)
//   5. STOUT    stepStars     — scroll the starfield by the camera delta (bgl vs bglx)
//   6. LFIRE    laserBank.fire — spawn a laser (before stepTick, so it first travels NEXT
//                               tick per df3-5); shipX is the 16-bit onscreen PLAX16
//   7. DISP     sched.stepTick — one cooperative dispatch pass; travels the live lasers

import { createScheduler, type Scheduler } from './scheduler.js'
import { createLaserBank, type LaserBank, type Laser } from './laser.js'
import { createEnemyBank, type EnemyBank, type Lander, type Humanoid } from './landers.js'
import { createWaveDirector, type WaveDirector } from './waves.js'
import { createEffectBank, type EffectBank, type PlacedEffect } from './effects.js'
import { laserVsObject, type CollObject } from './collision.js'
import { OBJECTS, type ObjectImage } from './objects.js'
import { initStars, stepStars, STAR_COUNT, type Star } from './stars.js'
import { slide, type Facing } from './world.js'
import { stepVelocityX, stepReverse, stepVerticalY, type RevState, type VState } from './ship.js'

/** Two 4-bit pixels per raster byte — a picture is `width×2` pixels wide (objects.ts). */
const PIXELS_PER_BYTE = 2

/** The lander sprite (LNDP1, DEFB6.SRC:1947) — the enemy that materializes/explodes in
 *  the df4 live sim. df4-2 effects animate the appearing/exploding object's OWN picture,
 *  so the appear (on spawn) and the explosion (on a laser kill) both animate this one. */
const LANDER_PICTURE: ObjectImage = (() => {
  const pic = OBJECTS.find((o) => o.name === 'LNDP1')
  if (!pic) throw new Error('sim.ts: LNDP1 is not in the transcribed OBJECTS table')
  return pic
})()

/** The player laser box (LASP1, 8×1, DEFB6.SRC:1940) COLIDE tests against the enemy list
 *  (DEFA7.SRC:2775-2787). Width in PIXELS — the collision seam works in screen space. */
const LASER_BOX = { width: 8, height: 1 } as const

/** The pure per-tick input snapshot the shell feeds the ship (shell owns the PIA read). */
export interface Input {
  readonly thrust: boolean
  readonly reverse: boolean
  readonly up: boolean
  readonly down: boolean
  readonly fire: boolean
}

/** The ship's observable on-screen pose: `x`/`y` are the display COLUMN/ROW (high bytes
 *  of PLAX16 / PLAY16), `facing` is the PLADIR sign. */
export interface ShipView {
  readonly x: number
  readonly y: number
  readonly facing: Facing
}

/**
 * One frame of the whole Defender sim. The four scalar `_`-fields and the two `_`-objects
 * carry the state stepSim needs to advance; the ship/camera/stars/lasers views are what
 * the shell composer and the tests read. The scheduler and laser bank are stateful
 * objects (df3-1/df3-5), carried by reference across ticks — each createSim() owns its
 * own pair, so two sims never share a run-list and same-seed runs stay deterministic.
 */
export interface SimState {
  readonly ship: ShipView
  readonly camera: number
  readonly stars: readonly Star[]
  readonly lasers: readonly Laser[]
  /** The df4-3 abduction population — snapshots refreshed each tick from the enemy bank,
   *  exactly as `lasers` refreshes from the laser bank. Empty on a fresh sim. */
  readonly landers: readonly Lander[]
  readonly humanoids: readonly Humanoid[]
  /** The df4-6 in-flight effects (df4-2 APST materialize / EXST explosion), refreshed each
   *  tick from the effect bank like `lasers`/`landers`. Empty on a fresh sim. */
  readonly effects: readonly PlacedEffect[]
  /** df5-8: the current wave number (GETWV). Refreshed each tick from the wave director;
   *  0 on a fresh sim, 1 after the first cleared-field tick spawns wave 1. */
  readonly wave: number
  /** PLAXV — the 24-bit horizontal velocity accumulator (ship.ts). */
  readonly _plaxv24: number
  /** REV facing + debounce latch (ship.ts). */
  readonly _rev: RevState
  /** PLAY16 + PLAYV vertical state (ship.ts). */
  readonly _vy: VState
  /** PLAX16 — the ship's 16-bit onscreen X (world.ts). */
  readonly _plax16: number
  readonly _sched: Scheduler
  readonly _laserBank: LaserBank
  /** The df4-3 abduction bank (landers + humanoids), carried by reference like _laserBank. */
  readonly _enemyBank: EnemyBank
  /** The df4-6 effect bank (materialize/explosion), carried by reference like _laserBank. */
  readonly _effectBank: EffectBank
  /** df5-8: the df5-2 wave director, carried by reference so stepSim can read its `wave`
   *  counter. It is a df3 scheduler PROCESS (registered on `_sched` at construction), so
   *  the scheduler — not this handle — keeps it dispatching; the handle is read-only. */
  readonly _waveDirector: WaveDirector
}

/** The ship's initial pose: onscreen column $20 (the facing-right base, world.ts), mid-strip. */
const INITIAL_PLAX16 = 0x2000 // column 0x20 in the high byte
const INITIAL_Y = 120 // a row well inside the [YMIN, 239] strip

/**
 * Seed a fresh sim. `rand` (a byte source 0..255) is injected — the shell owns entropy so
 * this stays pure. The scheduler and laser bank are minted here and carried in the state.
 */
export function createSim(rand: () => number): SimState {
  const sched = createScheduler()
  const laserBank = createLaserBank(sched)
  // Minted here but consumes no entropy at construction, so star seeding is unchanged and
  // a fresh sim carries no enemies (spawning is explicit; the df5 wave logic drives it).
  const enemyBank = createEnemyBank(sched, rand)
  const effectBank = createEffectBank()
  // df5-8: wire the df5-2 wave director over the scheduler + enemy bank. It advances when
  // the LIVE lander population empties (alive count, not the array length — killLander flags
  // records in place) and spawns each wave's WVTAB lander count through the bank. The x
  // placement spreads the wave evenly across the 16-bit world cylinder ($10000 wrap,
  // world.ts) — a deterministic, pure choice (no entropy), so same-seed runs stay identical.
  const waveDirector = createWaveDirector(
    sched,
    () => enemyBank.landers.filter((l) => l.alive).length,
    (_wave, params) => {
      const n = params.counts.landers
      for (let i = 0; i < n; i++) enemyBank.spawnLander(Math.floor((i / n) * 0x10000))
    },
  )
  const facing: Facing = 'right'
  return {
    ship: { x: INITIAL_PLAX16 >> 8, y: INITIAL_Y, facing },
    camera: 0,
    stars: initStars(rand),
    lasers: laserBank.lasers,
    landers: enemyBank.landers,
    humanoids: enemyBank.humanoids,
    effects: effectBank.effects,
    wave: waveDirector.wave,
    _plaxv24: 0,
    _rev: { facing, revflg: false },
    _vy: { y16: INITIAL_Y << 8, playv: 0 },
    _plax16: INITIAL_PLAX16,
    _sched: sched,
    _laserBank: laserBank,
    _enemyBank: enemyBank,
    _effectBank: effectBank,
    _waveDirector: waveDirector,
  }
}

/** Snapshot-refresh helper: a new SimState reflecting the current enemy/effect-bank views,
 *  used by stepSim and the spawn entries so `landers`/`humanoids`/`effects` never go stale. */
function withBanks(state: SimState): SimState {
  return {
    ...state,
    landers: state._enemyBank.landers,
    humanoids: state._enemyBank.humanoids,
    effects: state._effectBank.effects,
  }
}

/** Spawn a lander at the top, descending (*START LANDERS, DEFB6.SRC:649). It MATERIALIZES:
 *  an APST appear effect (df4-2) is enqueued over the lander so it fades in rather than
 *  popping. Returns a new SimState with the lander + its appear effect in the views. */
export function spawnLander(state: SimState, x: number): SimState {
  const lander = state._enemyBank.spawnLander(x)
  if (lander) state._effectBank.spawnAppear(lander.x, lander.y, LANDER_PICTURE)
  return withBanks(state)
}

/** Place a humanoid on the terrain at (x, y) (ASTRO, DEFB6.SRC:290). Returns a new
 *  SimState with the humanoid in its `humanoids` view. */
export function spawnHumanoid(state: SimState, x: number, y: number): SimState {
  state._enemyBank.spawnHumanoid(x, y)
  return withBanks(state)
}

/** Start an EXST explosion (df4-2) at (world-x `x`, row `y`) over the lander picture — the
 *  LOCALIZED, seizure-safe burst ADR-0005 requires (classify('enemy-explode') is
 *  'localized'; NO whole-frame strobe). The COLIDE wiring in stepSim calls this on a kill,
 *  and the visual playtest drives it directly. Returns a new SimState with the effect. */
export function spawnExplosion(state: SimState, x: number, y: number): SimState {
  state._effectBank.spawnExplode(x, y, LANDER_PICTURE)
  return withBanks(state)
}

/** Advance the sim one 60 Hz tick under `input`. Returns the next state; the scheduler and
 *  laser bank are mutated in place and carried forward by reference. */
export function stepSim(state: SimState, input: Input): SimState {
  const rev = stepReverse(state._rev, input.reverse)
  const plaxv24 = stepVelocityX(state._plaxv24, { accel: input.thrust, facing: rev.facing })
  const vy = stepVerticalY(state._vy, { up: input.up, down: input.down })

  // slide consumes the TOP 16 bits of the 24-bit PLAXV (the seam df3-2 documents).
  const camera = slide({ bgl: state.camera, plax16: state._plax16, plaxv: plaxv24 >> 8, facing: rev.facing })

  const stars = stepStars(state.stars, camera.bgl, camera.bglx, STAR_COUNT)

  // Fire BEFORE the dispatch: a fresh laser process (PTIME=1) is not in this tick's
  // start-of-tick snapshot, so it sits at its spawn for one tick and travels next (df3-5).
  if (input.fire) state._laserBank.fire(camera.plax16, rev.facing)
  state._sched.stepTick()

  const shipRow = vy.y16 >> 8

  // COLIDE (DEFA7.SRC:2775-2787): each live player laser box vs the enemy list. A box
  // overlap kills the struck lander (LKIL1) and starts a LOCALIZED explosion (EXST) at it.
  // The lasers/landers are the freshly-travelled snapshots; both are read in SCREEN space
  // (column = world-x >> 8, the render convention), so the laser you SEE hits the lander
  // you SEE. Advance the effects first, then spawn this tick's explosions fresh.
  state._effectBank.step()
  hitTestLasers(state, shipRow)

  return {
    ship: { x: camera.plax16 >> 8, y: shipRow, facing: rev.facing },
    camera: camera.bgl,
    stars,
    lasers: state._laserBank.lasers,
    landers: state._enemyBank.landers,
    humanoids: state._enemyBank.humanoids,
    effects: state._effectBank.effects,
    wave: state._waveDirector.wave,
    _plaxv24: plaxv24,
    _rev: rev,
    _vy: vy,
    _plax16: camera.plax16,
    _sched: state._sched,
    _laserBank: state._laserBank,
    _enemyBank: state._enemyBank,
    _effectBank: state._effectBank,
    _waveDirector: state._waveDirector,
  }
}

/** Run the df4-1 laser-vs-lander COLIDE seam for one tick: every live laser is tested
 *  against the live landers; a box overlap kills that lander and spawns its explosion. The
 *  landers are captured up front so removing one mid-loop can't shift the list under us. */
function hitTestLasers(state: SimState, shipRow: number): void {
  const liveLanders = state._enemyBank.landers.filter((l) => l.alive)
  if (liveLanders.length === 0) return

  const landerBox = { width: LANDER_PICTURE.width * PIXELS_PER_BYTE, height: LANDER_PICTURE.height }
  // Index the objects so a Hit names WHICH lander to kill (COLIDE returns the struck object).
  const objects: readonly CollObject[] = liveLanders.map((l, i) => ({
    id: String(i),
    x: l.x >> 8,
    y: l.y,
    picture: landerBox,
  }))

  for (const laser of state._laserBank.lasers) {
    if (!laser.alive) continue
    const query = { x: laser.x >> 8, y: shipRow, picture: LASER_BOX }
    const hit = laserVsObject(query, objects)
    if (!hit) continue
    const lander = liveLanders[Number(hit.object.id)]
    if (!lander || !lander.alive) continue
    state._enemyBank.killLander(lander) // LKIL1 (DEFB6.SRC:905)
    state._effectBank.spawnExplode(lander.x, lander.y, LANDER_PICTURE) // EXST (SAMEXAP7)
  }
}
