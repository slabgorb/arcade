// tests/helpers/flight-contract.ts
//
// Story jt1-5 — the CONTRACT for src/core/flight.ts, TEA-authored. Same split
// as jt1-2/jt1-3/jt1-4: TEA states the shape and the tests that pin it, Dev
// writes the module.
//
// ─── EVERY ANCHOR IN THE STORY WAS VERIFIED AGAINST JOUSTRV4.SRC ─────────────
// jt1-4 shipped with five of its story anchors wrong, so this epic treats the
// story text as a hypothesis. All twelve of jt1-5's physics anchors check out
// exactly as written — the first story in the epic where that is true. Two
// structural facts the story does NOT state were found while verifying, and
// both are the kind that produce a plausible, wrong implementation:
//
//   1. THE FLYX LABEL IS THE ZERO ENTRY, NOT THE TABLE START. Four entries sit
//      BEFORE it (JOUSTRV4.SRC:7150-7153) and the index is SIGNED
//      (`LDA PVELX,U / LDD A,X`). A transcription that treats FLYX as element 0
//      and stores nine entries forward is wrong for every negative velocity —
//      i.e. every leftward flight — while looking perfectly reasonable.
//   2. X AND Y USE DIFFERENT POSITION FORMATS. Y is 8.8 fixed point (pixel in
//      the high byte, fraction in the low — `ADDD PPOSY+1,U`, exactly what
//      jt1-4's arena already assumes). X is a 16-bit SIGNED PIXEL count with
//      its sub-pixel accumulator living in the VELOCITY (`PVELX+2`), not the
//      position. Making both 8.8 is the natural symmetry assumption and it is
//      wrong.

import type { Platform } from './arena-contract.js'

/** Where a constant came from. */
export interface SourceAnchor {
  file: string
  startLine: number
  endLine: number
}

/**
 * The device-agnostic per-player input contract (`P2NJMP`,
 * JOUSTRV4.SRC:7261-7263).
 *
 * The ROM normalises two joystick bits with `ANDA #$03 / ASRA / SBCA #0`,
 * which yields exactly −1/0/+1 — and, notably, yields 0 when BOTH directions
 * are pressed. `flap` is the release→press EDGE, not the button level: the
 * shell owns debouncing and edge detection, core sees only the edge.
 */
export interface PlayerInput {
  /** −1 left, 0 neutral, +1 right. Both directions held normalises to 0. */
  dir: -1 | 0 | 1
  /** True on the frame the flap button transitions released→pressed. */
  flap: boolean
  /** Whether the button is currently HELD — selects the gravity of the pair. */
  flapHeld: boolean
}

/** An entity's flight/ground state. Positions per the note above. */
export interface EntityState {
  /** 16-bit SIGNED pixel X. Sub-pixel accumulation lives in `velXFrac`. */
  posX: number
  /** 8.8 fixed point: whole pixel is `posY >> 8`. */
  posY: number
  /** Index into FLYX: one of −8,−6,−4,−2,0,2,4,6,8. NOT a velocity. */
  velXIndex: number
  /** The `PVELX+2` sub-pixel accumulator, 0..255. */
  velXFrac: number
  /** 16-bit signed. Positive is DOWN (matching the ROM's Y axis). */
  velY: number
  /** `PTIMUP` — frames airborne, saturating at 255. */
  timeUp: number
  /** null while airborne; otherwise the ground state's id. */
  groundState: string | null
  /** `PLANTZ` — the joust-resolution height offset. Recorded now; jt2 consumes. */
  plantZ: number
  airborne: boolean
  /**
   * `PFRAME` — the run-animation phase, cycling 4→3→2→1→4 (RUNR, :7191-7196).
   * Optional (0 / absent while airborne). The render's frame selection indexes
   * the run sprites (ORRUN/BRRUN) by it (jt2-7 round 2).
   */
  animPhase?: number
}

/** One row of the ground state machine (the `STATE` macro, :7160-7180). */
export interface GroundState {
  id: string
  /** Frames to wait in this state before advancing. */
  wait: number
  /** Animation routine name (RUNR / SKIDR / STANDR / REVR / RUNSR). */
  call: string
  /** Transition targets by joystick direction. */
  onMinus: string
  onZero: string
  onPlus: string
  /** The FLYX index this state hands to flight on takeoff. */
  flyVel: number
  anchor: SourceAnchor
}

export interface FlightModule {
  // ─── Constants ────────────────────────────────────────────────────────────
  /** `GRAV`, JOUSTRV4.SRC:952. The BASE; the pair is GRAV and GRAV+4. */
  GRAV: number
  /** Gravity with the flap button HELD (wings down) — the glide. */
  GRAVITY_WINGS_DOWN: number
  /** Gravity with the button RELEASED (wings up). */
  GRAVITY_WINGS_UP: number
  /** `MAXVX`, :40. The FLYX index bound — see the rejection note on flap(). */
  MAX_VEL_X_INDEX: number
  /** The nine FLYX entries in index order −8..+8, 256 units = 1 px/frame. */
  FLYX: number[]
  /** Initial VY on a flap-initiated takeoff (`STFLY`, :6124). */
  TAKEOFF_VEL_Y: number
  /** `ORRUN` per-frame X deltas (:7185-7189). */
  ORRUN_DELTAS: number[]
  /** The skid frame's X delta (:7242). */
  SKID_DELTA: number
  /** `PLANTZ` for a skidding mount (:6071-6072). */
  SKID_PLANT_Z: number
  /** `FRCONV` — landing speed → ground state id (:6253-6257). */
  FRCONV: string[]
  GROUND_STATES: Record<string, GroundState>

  // ─── The landing map (see the X-tables note in the session findings) ──────
  /** ROM `LNDXS1` (:7787+), 352 bytes, index 0 = CRT pixel −32. */
  LND_X_TABLE: number[]
  /** ROM `BCKXS1` (:7616+), 352 bytes, same origin. */
  BCK_X_TABLE: number[]
  /** The index origin: `LND_X_TABLE[x + 32]` is the mask for pixel x. */
  X_TABLE_ORIGIN: number
  /**
   * The wave-1 landing mask for a pixel X, i.e. the ROM table with the wave-init
   * `ORA #$20` applied (`LNDXUP`, :987-989 — "FOR NOW, CLIFF 5 LANDS AT ALL
   * POINTS"). Per-cliff destruction is the wave machine's job, not this story's.
   */
  landMaskAtX(x: number): number

  /** `LNDXTB[x] & LNDYTB[y]` — the (x,y) → mask step jt1-4 could not provide. */
  groundMaskAt(x: number, y: number): number

  // ─── Flight ───────────────────────────────────────────────────────────────
  /**
   * Apply one flap edge (`ADDFLP`, :6429-6448).
   *
   * ΔVY = ((timeUp × 96) >> 8) − 96, so a long climb (high PTIMUP) yields a
   * WEAKER impulse — the flap decays. Horizontally the joystick contributes
   * ±2 to the FLYX index, and the result is REJECTED, not clamped: if it would
   * exceed ±MAX_VEL_X_INDEX the index keeps its OLD value entirely
   * (`BGT ADXMX2` returns without storing). The ROM's own comments on those
   * branches are inverted — trust the branches.
   */
  flap(state: EntityState, input: PlayerInput): EntityState

  /**
   * Advance one frame of flight: gravity, then position integration.
   * There is NO air drag and NO terminal velocity; both are cited negative
   * claims and the tests pin them ABSENT.
   */
  stepFlight(state: EntityState, input: PlayerInput): EntityState

  /** Frames airborne, saturating at 255 (`AIRTIM`, :6476-6478). */
  tickTimeUp(timeUp: number): number

  /**
   * The wing transition this frame, from the previous-frame airborne/held state
   * (jt5-3). `'down'` on a press or take-off, `'up'` on a release, else `null` —
   * the moment the ROM clears PTIMUP (jt9-8) and sounds a wing cue.
   */
  wingEdge(wasAirborne: boolean, prevFlapHeld: boolean, input: PlayerInput): 'down' | 'up' | null

  // ─── Ground ───────────────────────────────────────────────────────────────
  /** One frame of ground movement: state advance + the ORRUN X delta. */
  stepGround(state: EntityState, input: PlayerInput): EntityState

  /** Flap-initiated takeoff: VY = −$0080 AND a 1-pixel lift (`STFLY`, :6123). */
  takeOff(state: EntityState): EntityState

  /** Walk off an edge: VY = 0, fractions cleared (`STFALL`, :6139). */
  walkOff(state: EntityState): EntityState

  /** Landing conversion — incoming speed selects the ground state (`FRCONV`). */
  land(state: EntityState, platform: Platform): EntityState
}

export async function loadFlight(): Promise<FlightModule> {
  const specifier = ['..', '..', 'src', 'core', 'flight.js'].join('/')
  try {
    const mod = (await import(/* @vite-ignore */ specifier)) as Partial<FlightModule>
    if (!Array.isArray(mod.FLYX)) throw new Error('module has no `FLYX` export')
    if (typeof mod.flap !== 'function') throw new Error('module has no `flap` export')
    return mod as FlightModule
  } catch (e) {
    throw new Error(
      'flight module not built yet — GREEN (Julia) creates joust/src/core/flight.ts ' +
        `satisfying tests/helpers/flight-contract.ts. (${(e as Error).message})`,
    )
  }
}
