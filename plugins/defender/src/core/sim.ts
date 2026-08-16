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
import { initStars, stepStars, STAR_COUNT, type Star } from './stars.js'
import { slide, type Facing } from './world.js'
import { stepVelocityX, stepReverse, stepVerticalY, type RevState, type VState } from './ship.js'

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
  const facing: Facing = 'right'
  return {
    ship: { x: INITIAL_PLAX16 >> 8, y: INITIAL_Y, facing },
    camera: 0,
    stars: initStars(rand),
    lasers: laserBank.lasers,
    _plaxv24: 0,
    _rev: { facing, revflg: false },
    _vy: { y16: INITIAL_Y << 8, playv: 0 },
    _plax16: INITIAL_PLAX16,
    _sched: sched,
    _laserBank: laserBank,
  }
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

  return {
    ship: { x: camera.plax16 >> 8, y: vy.y16 >> 8, facing: rev.facing },
    camera: camera.bgl,
    stars,
    lasers: state._laserBank.lasers,
    _plaxv24: plaxv24,
    _rev: rev,
    _vy: vy,
    _plax16: camera.plax16,
    _sched: state._sched,
    _laserBank: state._laserBank,
  }
}
