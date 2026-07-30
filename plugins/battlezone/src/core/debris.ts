// src/core/debris.ts
//
// Story bz3-5 — GREEN phase (Julia / Dev). Cluster C5, F-008: a reusable,
// deterministic 6-piece gravity-driven particle engine, factored so bz3-6's
// volcano eruption drives the SAME reducer with its own DebrisConfig — no
// battlezone-specific constant is hard-coded here (AC2). PURE core (epic
// non-negotiable): no DOM, no wall clock, no ambient randomness; every
// quantum enters as a config and a state, never time or randomness.
//
// ROM facts (verified ~/Projects/battlezone-source-text):
//   IZVEL = 55,40,70,88,40,66  (BZMTNS.MAC:837-838, decimal — `.RADIX 10` is
//     active from :501 through :838; the 6th byte at :838 was the refuter's
//     catch, EXINIT seeds all six)
//   GRAVTY = -4                (BZONE.MAC:380, decimal, per GAME frame)
//   EXPOSZ += ZVELOC*4         (sign-extended <<2 height integration, EXPLDE)
//
// Per-frame semantics — `stepDebris` advances exactly ONE 15.625 Hz game
// frame, in the ROM's own instruction order (height integrates the velocity
// BEFORE this frame's gravity decrement, then gravity applies):
//   height   += velocity * heightScale
//   velocity += gravity
// A piece is grounded once `velocity <= 0 && height <= groundHeight` (default
// 0) — a fresh piece (velocity = v0 > 0) is never grounded at launch. `done`
// is true once every piece is grounded. The burst's lifetime is therefore an
// EMERGENT property of the tallest launch velocity and gravity, never a
// hard-coded duration — the tallest piece governs (findings F-008).
//
// Story bz3-6 — GREEN phase (Julia / Dev). Cluster C6, H-006: the volcano's
// VOLCNO rock ejecta (BZONE.MAC:1390-1449) drives this SAME engine with its
// own `VOLCANO_ERUPTION` preset — no fork. Two carry-forwards from bz3-5's
// reviewer, scoped by TEA against the actual VOLCNO source:
//   (a) `spawnDebris` now VALIDATES its config and THROWS on anything that
//       could hang a `while (!done)` consumer: empty/non-finite launch
//       velocities, non-finite gravity/heightScale/groundHeight, a
//       non-positive/non-finite `lifetime`, or a config that can never
//       terminate (`lifetime === undefined && gravity >= 0`). A defined
//       finite positive `lifetime` always rescues an otherwise-non-terminating
//       config, since it becomes the termination path (below).
//   (b) The ROM's EXPLDE terminal-velocity clamp (~-124, BZONE.MAC:1795-1798)
//       is verified IMMATERIAL for the volcano (its 5..12 launch velocities
//       bottom out ~-26 under gravity -1) and is deliberately NOT added here —
//       an un-cited clamp would be un-sourced code for a config that never
//       reaches it.
// `lifetime` (new, optional) is the ROM's OBJTIM countdown — a max age in
// game frames, NOT a physics landing (the volcano's ~1.984 s is a TIMER,
// unlike the object explosion's emergent landing). Gated on `!== undefined`
// so OBJECT_EXPLOSION (no lifetime) is completely untouched: it keeps ending
// purely by physics, exactly as bz3-5 shipped it.

/** One particle engine's tuning — count, launch speed, and gravity are all parameters. */
export interface DebrisConfig {
  /** One entry per piece (IZVEL for the object explosion); count === length. */
  readonly launchVelocities: readonly number[]
  /** Per-frame velocity delta (GRAVTY = -4 for the object explosion). */
  readonly gravity: number
  /** height += velocity * heightScale per frame (ROM EXPOSZ += ZVELOC*4). */
  readonly heightScale: number
  /** Grounded threshold; defaults to 0 (pieces launch from the object centre). */
  readonly groundHeight?: number
  /**
   * bz3-6: max age in game frames (ROM OBJTIM, e.g. VOLCNO's 0x1F=31) before
   * the burst retires regardless of physics. `undefined` = physics-only
   * termination (OBJECT_EXPLOSION's ROM behavior, unchanged). A finite
   * positive value also GUARANTEES termination, so `spawnDebris` accepts an
   * otherwise-non-terminating config (gravity >= 0) once one is set.
   */
  readonly lifetime?: number
}

/** One falling fragment's pure physical state. */
export interface DebrisPiece {
  readonly height: number
  readonly velocity: number
  readonly grounded: boolean
}

/** A whole burst: every piece, the config that drives it, and whether it has finished. */
export interface DebrisState {
  readonly pieces: readonly DebrisPiece[]
  readonly config: DebrisConfig
  readonly done: boolean
  /** bz3-6: frames elapsed since spawn — compared against `config.lifetime`. */
  readonly age: number
}

/** The ROM object explosion (tank/super-tank kill): 6 IZVEL pieces, GRAVTY=-4, EXPOSZ<<2. */
export const OBJECT_EXPLOSION: DebrisConfig = {
  launchVelocities: [55, 40, 70, 88, 40, 66],
  gravity: -4,
  heightScale: 4,
}

/**
 * The ROM's VOLCAO ROCK MOVEMENT ejecta (VOLCNO, BZONE.MAC:1390-1449) — the
 * SAME engine as OBJECT_EXPLOSION, a different preset:
 *   launchVelocities — NOROCK=5 rocks (:319), each YSPD=(PRAND&7)+5 ∈ [5,12]
 *     units/frame (:1405-1407). PRAND-random per rock in the ROM; this pins
 *     the band + count with a representative set (one rock ≥11, riding the
 *     lifetime ceiling — bz3-5's "structural, not exact" stance for RNG data).
 *   gravity — -1/frame (`DEC X,YSPD ;GRAVITY TAMES HOLD`, :1417).
 *   heightScale — 1: `YPOS += YSPD` is a plain add, no <<2 (:1418-1435;
 *     contrast OBJECT_EXPLOSION's 4).
 *   lifetime — OBJTIM = 0x1F = 31 frames = 1.984 s (:1396) — a timer ceiling,
 *     not a physics landing (see the header note).
 */
export const VOLCANO_ERUPTION: DebrisConfig = {
  launchVelocities: [5, 7, 9, 11, 12],
  gravity: -1,
  heightScale: 1,
  lifetime: 0x1f,
}

function isGrounded(height: number, velocity: number, groundHeight: number): boolean {
  return velocity <= 0 && height <= groundHeight
}

/**
 * bz3-6 / carry-forward (a): reject any config that could hang a
 * `while (!done)` consumer or that carries a non-finite quantum. A defined
 * `lifetime` guarantees termination on its own, so it is the one thing that
 * RESCUES an otherwise non-terminating (`gravity >= 0`) config.
 */
function validateConfig(config: DebrisConfig): void {
  if (config.launchVelocities.length === 0) {
    throw new Error('DebrisConfig.launchVelocities must not be empty')
  }
  for (const v of config.launchVelocities) {
    if (!Number.isFinite(v)) throw new Error(`DebrisConfig.launchVelocities must all be finite, got ${v}`)
  }
  if (!Number.isFinite(config.gravity)) throw new Error(`DebrisConfig.gravity must be finite, got ${config.gravity}`)
  if (!Number.isFinite(config.heightScale)) {
    throw new Error(`DebrisConfig.heightScale must be finite, got ${config.heightScale}`)
  }
  if (config.groundHeight !== undefined && !Number.isFinite(config.groundHeight)) {
    throw new Error(`DebrisConfig.groundHeight must be finite, got ${config.groundHeight}`)
  }
  if (config.lifetime !== undefined && !(Number.isFinite(config.lifetime) && config.lifetime > 0)) {
    throw new Error(`DebrisConfig.lifetime must be a positive finite frame count, got ${config.lifetime}`)
  }
  if (config.lifetime === undefined && config.gravity >= 0) {
    throw new Error(
      'DebrisConfig never terminates: gravity >= 0 with no lifetime would never ground and would spin the caller',
    )
  }
}

/** Seed one airborne piece per launch velocity, at the object centre (height 0). */
export function spawnDebris(config: DebrisConfig): DebrisState {
  validateConfig(config)
  const groundHeight = config.groundHeight ?? 0
  const pieces: DebrisPiece[] = config.launchVelocities.map((velocity) => ({
    height: 0,
    velocity,
    grounded: isGrounded(0, velocity, groundHeight),
  }))
  const age = 0
  const done = pieces.every((p) => p.grounded) || (config.lifetime !== undefined && age >= config.lifetime)
  return { pieces, config, done, age }
}

/** Advance every un-grounded piece one game frame; grounded pieces hold in place. */
export function stepDebris(state: DebrisState): DebrisState {
  const { gravity, heightScale, lifetime } = state.config
  const groundHeight = state.config.groundHeight ?? 0
  const pieces: DebrisPiece[] = state.pieces.map((piece) => {
    if (piece.grounded) return piece
    const height = piece.height + piece.velocity * heightScale
    const velocity = piece.velocity + gravity
    return { height, velocity, grounded: isGrounded(height, velocity, groundHeight) }
  })
  const age = state.age + 1
  const done = pieces.every((p) => p.grounded) || (lifetime !== undefined && age >= lifetime)
  return { pieces, config: state.config, done, age }
}
