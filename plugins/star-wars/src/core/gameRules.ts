// src/core/gameRules.ts
//
// Pure rule helpers for Wave 1 — the cockpit aim and the one true hit-test.
// No DOM, no time, no randomness: safe for the deterministic core. All spatial
// math routes through the Math Box (math3d), never ad-hoc trig, so there is a
// single source of 3D truth.

import { length, sub, add, scale, dot, normalize, type Vec3 } from '@shared/math3d'
import { ENEMY_FIRE_INTERVAL, FIRE_MASK, FIRE_THRESHOLD } from './state'

/** Vertical field of view (radians) the renderer projects the scene with — the
 * single source of truth shared by the camera (shell/render.ts) and the aim
 * below, so a bolt flies toward exactly what the crosshair covers. */
export const FOV_Y = Math.PI / 3

/** The player's cockpit in SPACE — the world origin.
 *
 * EXPORTED since sw8-8: it is now the space eye as well as the space gun and homing target, so
 * `render.ts cameraView` and `tie-status.ts`'s C_PV pyramid both need it. `tie-status` cannot read
 * it from `sim.ts` — `tie-status ← sim` is a core import cycle, the same reason `spaceEye` lived
 * here. (`render.ts` is a shell module and does import `sim.ts`, for `surfaceShip`; the cycle is a
 * core-only constraint.) A hand-written `[0,0,0]` standing in for the cockpit is exactly what
 * sw7-16 set out to stop. `sim.ts`'s own private copy was folded into this one at the same time, so this is
 * the single definition the whole core and the space camera share. */
export const COCKPIT: Vec3 = [0, 0, 0]

/** Unit vector from a world position back toward the cockpit at the origin.
 *
 * ⚠ SPACE ONLY — the ship IS the world origin here (the TIE flight model's homing
 * target). It is NOT the surface's ship: `stepSurface` aims its fire with
 * `surfaceShip(altitude)` instead. Retargeting this helper would break space.
 *
 * The single shared copy (sw7-23): `spawnTie`'s initial heading and `aimOrient`'s
 * VM steer target (sim.ts), and `computeStatus`'s C_AS/C_PN geometry (tie-status.ts). */
export function toCockpit(pos: Vec3): Vec3 {
  return normalize(sub(COCKPIT, pos))
}

/**
 * Unit firing direction for a given yoke position. At rest (0,0) it points
 * straight ahead, down −Z (the camera looks down −Z, OpenGL convention). The
 * yoke deflects it left/right (+aimX = right) and up/down (+aimY = up) while it
 * stays unit length.
 *
 * Crucially, the deflection is the INVERSE of the perspective projection the
 * scene is drawn under (FOV_Y, viewport `aspect` = width/height): a point down
 * this ray projects back onto the crosshair at NDC [aimX, aimY] (crosshairNdc),
 * so the bolt hits what the player aimed at. Without the f = 1/tan(FOV_Y/2) and
 * aspect terms the bolt overshoots the reticle by ~f and misses — the 8-16
 * kill-loop bug. `aspect` is a viewport property the shell supplies via Input; it
 * defaults to 1 (square), which is all the pure-core vertical-axis tests need.
 */
export function aimDirection(aimX: number, aimY: number, aspect = 1): Vec3 {
  const f = 1 / Math.tan(FOV_Y / 2)
  return normalize([(aimX * aspect) / f, aimY / f, -1])
}

/**
 * The crosshair reticle's normalised-device position. Centred ([0,0]) when the
 * yoke is at rest, tracking it on both axes — "crosshair at screen centre when
 * phase is space," then following the cursor.
 */
export function crosshairNdc(aimX: number, aimY: number): readonly [number, number] {
  return [clamp(aimX, -1, 1), clamp(aimY, -1, 1)]
}

/**
 * 3D sphere overlap: true when `a` and `b` are within `radius` of each other.
 * Distance comes from the Math Box (length∘sub) — collisions are computed in
 * world space, never in screen pixels.
 */
export function collides(a: Vec3, b: Vec3, radius: number): boolean {
  return length(sub(a, b)) <= radius
}

/**
 * NO PRODUCTION CALLER (sw7-17 / R11b). This existed to stop a 12,000 u/s bolt stepping clean over
 * the exhaust port between two frames; the player's gun is now a hitscan ray, and an exact ray
 * cannot tunnel, so the last caller went with the projectile it was chasing. Retained for
 * `swept-port-collision.test.ts`, which still pins the dt-independence guarantee it protected.
 * Deleting it is a follow-up on sw7-17.
 *
 * Swept 3D sphere overlap: true when the SEGMENT `a`→`b` passes within `radius`
 * of `center`. This is the anti-tunnelling twin of `collides` — a fast target
 * that steps clean over a small sphere between two frames still registers,
 * because we test the whole path it swept this frame rather than only its end
 * point. Decouples anti-tunnelling from the hit radius (sw4-4): the sphere stays
 * exactly `radius`; only the query widens from a point to the frame's segment.
 * Degenerates to a point test when the segment has zero length. Pure Math-Box
 * math (dot/sub/add/scale/length) — no ad-hoc trig, safe for the core.
 */
export function sweptCollides(center: Vec3, a: Vec3, b: Vec3, radius: number): boolean {
  const ab = sub(b, a)
  const abLen2 = dot(ab, ab)
  if (abLen2 === 0) return collides(center, a, radius) // still segment → point test
  // Closest point on the segment to `center`: project, clamped to [a, b].
  const t = clamp(dot(sub(center, a), ab) / abLen2, 0, 1)
  const closest = add(a, scale(ab, t))
  return length(sub(center, closest)) <= radius
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

// --- The laser beam (story sw7-17 / R11b) -----------------------------------
//
// The player's laser is HITSCAN: the ROM draws it gun-ports → site each frame (VWLAZ) and
// resolves collision INSTANTLY against the nearest object under the site — CLSLZ picks
// min(CL.GDS, CL.ADS) in space, CLGLZ on the ground, CLBLZ in the trench. There is no
// travelling player shot and no lifetime anywhere in WSLAZR.MAC.
//
// "Under the site" is recorded during the object DRAW: each object tests the site against its
// own projected size and keeps the nearest.
//
// THE SHAPE OF THAT TEST IS PER-PASS, NOT UNIVERSAL (measured at sw8-27 by grepping every ROM
// module for `TMPOCT`, the octagon accumulator). It appears in exactly two files:
//
//   space aliens  WSMAIN.MAC:3898-3908   |dx| <= T && |dy| <= T && |dx| + |dy| <= 1.5·T
//   fireballs     WSGUNS.MAC:926-941     the same three terms
//   ground/towers WSGRND.MAC:1076-1132   a DIFFERENT test — an unrotated width/height box
//                                        with a `+10.` site fudge and NO octagon term at all
//
// (Note the box threshold is a bare TMPSIZ; only the octagon is 1.5·. An older version of this
// comment cited `WSGUNS.MAC:938-948` as how "each object" records being under the site, which
// over-generalised the FIREBALL recorder to every pass — the ground does not work that way.)
//
// So the box-and-octagon is a property of the SPACE draw pass, not of "a hit" in this machine,
// and it lives at the space arm's own call sites in `sim.ts` — never in `beamHit`, which is
// shared with the surface and trench. `siteOffset` below is the geometry those call sites need;
// `beamHit` keeps the rotationally-symmetric radius the other phases are built on.
//
// Screen-space is the cabinet's way of saying a world-space thing, and for a symmetric radius we
// can say it directly: an object is under the site exactly when the AIM RAY passes within its hit
// radius — a cone through the object's projected size IS a ray within its radius at that depth.
// That keeps the test in world space, where this core does all its collision, and reuses the hit
// radii the game already has (TIE_HIT_RADIUS &c.) instead of inventing a reticle size.

/**
 * How far along the beam it strikes a sphere at `pos`, or `null` if it misses.
 *
 * `eye` is the ship point the beam is cast from and `dir` its unit aim direction. Returns the
 * distance along the beam to the target's closest approach — the ROM's `M.XT`, the number
 * CL.GDS/CL.ADS rank on — so callers can pick the nearest. Targets behind the gun never hit
 * (the perspective divide would otherwise fold them onto the reticle), and `maxRange` is the
 * beam's far endpoint: infinite in space and on the ground, but $7000 = 28,672 in the trench,
 * where CLBLZ builds the beam against a fixed forward line (`LDD #7000 ;FARTHEST FORWARD
 * POINT`, WSLAZR.MAC:418).
 *
 * Pure Math Box (dot/sub/add/scale/length) — no ad-hoc trig, no screen pixels.
 */
export function beamHit(
  eye: Vec3,
  dir: Vec3,
  pos: Vec3,
  radius: number,
  maxRange = Infinity,
): number | null {
  const along = dot(sub(pos, eye), dir)
  if (along <= 0) return null // behind the gun — never under the site
  if (along > maxRange) return null // past the beam's far endpoint
  const closest = add(eye, scale(dir, along))
  return length(sub(pos, closest)) <= radius ? along : null
}

/**
 * The SPACE pass's hit octagon, as a multiple of the target's hit radius:
 * `LDD TMPSIZ / LSRD / ADDD TMPSIZ ;MAKE 1.5 FOR OCTAGON` (WSMAIN.MAC:3904-3906, and the same
 * three instructions at WSGUNS.MAC:937-939 for fireballs).
 *
 * It is intersected with a BOX at a bare `TMPSIZ` — 1.0, not 1.5 — which is why there is no
 * matching `SPACE_HIT_BOX` constant here: the box threshold IS the hit radius the caller already
 * passes, and giving it a second name would invite the two drifting apart.
 *
 * Space and fireballs only. The ground pass uses a different test (see the header above), so
 * this constant has no business anywhere near `beamHit`.
 */
export const SPACE_HIT_OCTAGON = 1.5

/**
 * The object's offset from the SITE, resolved onto the screen's own axes, or `null` if it is
 * behind the gun. `null` and a large offset are different answers and callers must not conflate
 * them — the cabinet's near clamp is a separate exit from its box test.
 *
 * WHY SCREEN AXES AND NOT A RAY-RELATIVE FRAME. The cabinet measures `TMPXD`/`TMPYD` as
 * differences of PROJECTED coordinates — `BJ.CX - LZ.CX` and `BJ.CY - LZ.CY` (WSMAIN.MAC:3883-3895)
 * — so its dx and dy are screen deltas against the fixed screen axes, which do not rotate when
 * the yoke moves. The crosshair slides across a stationary screen. Every phase's view matrix here
 * is IDENTITY-oriented (`cameraView` is a pure translation), so those screen axes ARE world +X and
 * world +Y, and the faithful port needs no basis construction at all.
 *
 * The offsets are taken in the object's own DEPTH PLANE, which is the exact world-space image of a
 * screen delta: a screen delta at depth d corresponds to a world offset of (delta · d / f). Taking
 * the perpendicular distance to the ray instead would be a different quantity once the yoke is
 * deflected — shorter by the cosine of the deflection — and it has no screen-space meaning.
 *
 * This also removes a degeneracy rather than guarding one. Building a basis as
 * `normalize(cross(dir, worldUp))` blows up when the ray is vertical; this cannot, because
 * `aimDirection` puts a literal `-1` in z before normalising, so `dir[2] < 0` for every ray it can
 * return and the ray meets every depth plane in front of the eye exactly once.
 */
export function siteOffset(
  eye: Vec3,
  dir: Vec3,
  pos: Vec3,
): { along: number; dx: number; dy: number } | null {
  const along = dot(sub(pos, eye), dir)
  if (along <= 0) return null // behind the gun — never under the site
  // Where the ray crosses this object's depth plane. `dir[2]` is strictly negative (see above),
  // so this never divides by zero and `t` is always positive for an object in front.
  const t = (eye[2] - pos[2]) / -dir[2]
  return {
    along,
    dx: Math.abs(pos[0] - (eye[0] + dir[0] * t)),
    dy: Math.abs(pos[1] - (eye[1] + dir[1] * t)),
  }
}

// --- Difficulty ramp across waves -------------------------------------------
//
// A run escalates by WAVE: each completed run loops back harder. The ramp is a
// PURE function of the wave number (no time, no randomness) so it stays in the
// deterministic core. Mirrors tempest's `levelParams(level)`: a single `ramp`
// multiplier tightens the fire cadence (down to a positive playable floor, so an
// arbitrarily deep wave never drives it to zero). Wave 1 reproduces today's
// space constants EXACTLY, so wiring this in does not shift Wave-1 balance.
// (sw8-7: the spawn-cadence axis is GONE — the ROM has no spawn interval to
// ramp; the space step keeps its three alien slots topped up every frame,
// WSMAIN.MAC:1450-1454. sw7-23 retired the enemySpeed axis the same way.)

/** Difficulty knobs for a wave, consumed by the space-combat step. */
export interface WaveParams {
  /** Seconds between enemy fireballs (tightens with the wave). */
  enemyFireInterval: number
  /** How many TIE fireballs may share the sky at once — the RE'd per-wave
   * concurrency cap (story 9-5). Climbs 1 → 6 with the wave and saturates at the
   * authentic 6-slot fireball pool; the space step gates per-TIE fire on it, so the
   * ROM-faithful wave 1 keeps a single fireball aloft while late waves fill it. */
  maxConcurrentShots: number
  /** TGPROB cadence-window mask for this wave (state.ts `FIRE_MASK`, WSCPU.MAC:736).
   * The §6 fire gate opens a window when `(state.frame & fireMask) === 0`. Tightens
   * with the wave (0F → 07 → 03: a window every 16 → 8 → 4 game frames). */
  fireMask: number
  /** TGPROB probability threshold for this wave (state.ts `FIRE_THRESHOLD`,
   * WSCPU.MAC:736). Inside an open window a TIE fires when `nextInt(rng, 256) >
   * fireThreshold`; P(fire | window) = (255 − fireThreshold)/256. */
  fireThreshold: number
}

/** Each wave past the first stiffens the ramp by this fraction. */
const RAMP_PER_WAVE = 0.15
/** Enemy fire cadence never drops below this (seconds). */
const ENEMY_FIRE_INTERVAL_FLOOR = 0.25

// --- TIE fire aggression: the RE'd per-wave TGPROB row (story 9-5; sw7 Task 5) --
//
// The 1983 cabinet escalates TIE aggression with the `TGPROB` fire-parameter table
// (WSCPU.MAC:736; the disassembly's ROM:8D71) — a per-wave `[mask, threshold, guns]`
// row indexed by min(mission + DIP, 15). All THREE columns are now ported and drive
// the §6 fire gate (sim.ts's decision tick):
//   * GUNS  → `maxConcurrentShots` (the SIMULTANEOUS-FIREBALL cap; `FIRE_CONCURRENCY`
//     below). Climbs 1 → 6 and saturates at the authentic 6-slot fireball pool.
//   * MASK  → `fireMask` (state.ts `FIRE_MASK`) — the cadence window `(frame & mask)==0`.
//   * THRESHOLD → `fireThreshold` (state.ts `FIRE_THRESHOLD`) — the PRNG roll.
// The cadence columns are NO LONGER "unported": the cabinet game-frame tick IS pinned
// (state.ts `TICK_HZ`, audit T-007), so the frame-mask ports faithfully as a discrete
// per-game-frame gate on `state.frame` rather than an invented seconds cadence — see
// docs/tie-flight-ai-model.md §5.3 / §6 and the sw7 design (docs 4c93855) §3. The
// legacy scalar `enemyFireInterval` below stays only as a wave-difficulty knob
// (pinned by difficulty.test.ts / tie-wave-ramp.test.ts); the space fire path no
// longer consumes it — the §6 gate replaced it.
//
// Clone `wave` is 1-based and the cabinet's first space wave is mission 0, so the
// fire index is min((wave - 1) + DIP, 15). The clone has no DIP switches → DIP = 0.

/** Per-index simultaneous-fireball cap — the TGPROB GUNS column (WSCPU.MAC:736).
 * Length 16 (the index saturates at 15); the value tops out at the 6-slot pool
 * from index 6 on. `FIRE_MASK`/`FIRE_THRESHOLD` (state.ts) are the same table's
 * other two columns, addressed by the same fire-index below. */
const FIRE_CONCURRENCY: readonly number[] = [1, 1, 2, 3, 4, 5, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6]

export function waveParams(wave: number): WaveParams {
  const ramp = 1 + (wave - 1) * RAMP_PER_WAVE
  // Fire-aggression index into TGPROB: min((wave - 1) + DIP, 15), DIP = 0. One index
  // addresses all three columns (guns / mask / threshold), which share the length-16 shape.
  const fireIndex = Math.max(0, Math.min(wave - 1, FIRE_CONCURRENCY.length - 1))
  return {
    enemyFireInterval: Math.max(ENEMY_FIRE_INTERVAL_FLOOR, ENEMY_FIRE_INTERVAL / ramp),
    maxConcurrentShots: FIRE_CONCURRENCY[fireIndex],
    fireMask: FIRE_MASK[fireIndex],
    fireThreshold: FIRE_THRESHOLD[fireIndex],
  }
}

// ⚰️ TOMBSTONE — `spaceEye` / `SPACE_EYE_SHIFT_PER_FRAME` / `EYE_WRAP` were RETIRED by sw8-8.
//
// They ported `ST.UX` as a global space CAMERA. `ST.UX` is not a camera: it is the STARFIELD's
// register, and the 1983 source says so at every site.
//
//   * Its only CONSUMER is the star generator, which loads ST.UX/UY/UZ straight into the Math
//     Box translation registers and immediately emits star points — `WSSTAR.MAC:98-102`,
//     `LDD ST.UX ;STARS RELATIVE MOVEMENT`. The other reads are the writers' own
//     read-modify-write increments, of which two run: `SMVBNR` (`;PLAYER 1 MOVE DURING BANNER`)
//     and `SMVHIS` (`;STAR MOVEMENT DURING HIGH SCORE DISPLAY`). Nothing reads it to place
//     an object.
//   * Its sibling registers say what they are for outright: `WSGLOB.MAC:752-753`,
//     `ST.UY:: ;PLAYERS UNIVERSE Y FOR STARS` / `ST.UZ:: ;PLAYERS UNIVERSE Z FOR STARS`.
//     (`ST.UX::`'s own `;VIEWER X POSITION` names the QUANTITY, not a consumer.)
//   * The starfield writers sit under `WSMAIN.MAC` `.SBTTL MOVE STARS IN SOME DIRECTION` and are
//     `SMV*` routines — banner, instructions, scoring screen, high scores. The Death-Star ones
//     are assembled OUT (`.REPT 0`, `WSMAIN.MAC:2271-2290`; call sites :2186/:2216/:2233
//     commented out), which is also why their three `LDD ST.UX` reads do not run.
//   * But NOT every writer sits there, and the exception strengthens the ruling rather than
//     weakening it. The space-wave writer is filed under `.SBTTL MOVE THE PLAYER`
//     (`WSMAIN.MAC:2292`) and `S1MV` is not an `SMV*` name at all:
//     `WSMAIN.MAC:2522-2530`, `SMVSP1/SMVSP2/SMVNXT/S1MV:`
//     `LDD FRAME / JSR LSLD7 / STD ST.UX ;STARS RELATIVE MOVEMENT`. The routine the ROM files
//     under "MOVE THE PLAYER" writes nothing but ST.UX — it does not touch the player's world
//     position, which is the whole case in one routine.
//   * The second MOVE-THE-PLAYER writer is `S1MVHP` (`;MOVE DURING HYPER`,
//     `WSMAIN.MAC:2531-2536`) — `LDD FRAME / JSR LSLD8 / STD ST.UX`. Same shape, same conclusion.
//
// Nothing in the ROM draws a TIE, the Death Star, a fireball or the gun through ST.UX. sw8-1 read
// `S1MV` correctly and then ported it TWICE — faithfully into the starfield, and again as this
// camera. The second copy displaced the pilot's eye and gun from the cockpit his shield is scored
// at, so incoming fire homed at a point he was no longer looking from: measured, every fireball
// went un-aimable before impact (blind tail 0.73-2.15 s, 100 % of flights). sw8-2 shrank that
// split with a ±2048 wrap instead of closing it, which is why it looked solved.
//
// THE LATERAL DRIFT IS NOT GONE — it lives where the ROM puts it, and always did:
// `src/core/starfield.ts` `STAR_LATERAL_SPEED`, whose comment cites these same lines. The pilot
// now sits at ONE point in space, the cockpit at the world origin (`shipPoint`), which the camera
// (`render.ts cameraView`), the gun (`sim.ts beamOrigin`), the C_PV pyramid (`tie-status.ts`),
// `homeShots` and the shield hit-test all share.
//
// Do not re-derive a space camera from ST.UX a third time. If the Death Star should wander off
// centre, that is the STATION's motion (`render.ts deathStarPlacement`, which pins it at x=0),
// and it needs its own ROM mechanism — not this register.
