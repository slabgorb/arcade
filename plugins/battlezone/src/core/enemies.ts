// src/core/enemies.ts
//
// Story bz1-7 — GREEN phase (The Word Burgers / DEV). The enemy side of the
// duel: the "always one hostile" spawn rule, the slow tank's approach/aim/fire
// AI, the enemy projectile (ROM slot #1), hit + explosion, and the 1000-point
// kill award. PURE core (epic non-negotiable): all time enters as `dt`, no
// DOM, no wall clock, no ambient randomness — every draw comes from the seeded
// rng word carried in EnemyState. Identical-in ⇒ identical-out.
//
// Story bz1-8 widens the roster: the guided missile (2000 pts) and the super
// tank (3000 pts), introduced by score threshold. New ROM facts (dis65 file
// offsets, quarried via TEA's RED contract — tests/core/enemies-roster.test.ts):
//   * GetTankType (offset 6581/6587): WHICH tank is a function of the missile
//     launch count alone — "super tank if it's $05 <= N < $80". The $ff "none
//     yet" sentinel is modeled as a 0-based counter (logged deviation).
//   * CreateNewEnemyUnit (6590-6617): below the DIP threshold "score too low,
//     create a tank"; at/above it "get a random number" — the missile-vs-tank
//     choice is a draw from the carried seed. Missile spawns "increment
//     missile counter" (6690).
//   * Missile flight (5753-5807): the first missile ever flies straight in
//     ("be nice", 5753-5756); later ones swerve on a 0.5 s alternation
//     ("set for 0.5 sec, clear for 0.5 sec", 5802) until "very close"
//     ($0800, 5787), then "head at player" (5794). Missiles kill by CONTACT
//     (collision check 6491) — they own no projectile.
//   * Out-of-range scrap (7076/6889): "If it's a missile, we kill it and make
//     a new unit. If it's a tank we keep going." Same-step replacement, no
//     score.
//   * Creation is common code for tank and missile (6725) — one spawn ring.
//
// ROM FIDELITY (docs/battlezone-1980-source-findings.md):
//   * §2 "There will always be one hostile unit on the battlefield, either
//     alive or exploding... There is no delay between one leaving and the next
//     appearing." — `EnemyState.hostile` is never null; the step that retires
//     the blast spawns the replacement in the same returned state.
//   * §1 slow tank = 1000 pts (scoring.ts SCORES.slowTank, byte-confirmed).
//   * The enemy projectile shares the ROM's one projectile system (slots #0/#1
//     — firing.ts header): same SHELL_SPEED, SHELL_MAX_RANGE, and the swept
//     4-sub-steps-per-frame collision walk ("advance them four steps per frame
//     and check for collisions after each step", dis65 offset 6636), here
//     additionally checked against the player (the ROM's projectile-vs-unit
//     test lived in the same walk).
//   * The shell "matches the facing of the firing unit" (offset 2674) — it
//     leaves along the tank's own barrel, and only once roughly aimed.
//   * §5's aggression curve (score differential, ~17 s ramp) is bz1-10's port;
//     this story ships the BASELINE AI: pivot onto the player, crawl in, fire
//     when aimed. `phaseAge` accumulates as the hook the ramp will read.
//   * The ROM's missing spawn-collision check (enemies can spawn inside
//     obstacles) is a known defect DELIBERATELY NOT replicated (epic descope,
//     logged as a bz1-7 Design Deviation): spawns reject blocked ground.
//   * The exact ROM projectile collision-diameter table ($6139) and the slow
//     tank's own speed constants are deferred decodes — TANK_HIT_RADIUS reuses
//     the player's ROM radius and the throttle is a provisional half-speed
//     crawl; bz1-12's playtest trues both up (see session deviations).
//
// Story bz3-5 — GREEN phase (Julia / Dev). Cluster C5, F-008: the tank/
// super-tank OBJECT kill (section 1 of stepEnemies, below) now attaches a
// `DebrisState` (src/core/debris.ts — the ROM's reusable 6-piece gravity
// particle engine, IZVEL launch 55,40,70,88,40,66 / GRAVTY=-4 / EXPOSZ<<2)
// instead of the fixed `EXPLOSION_DURATION` scalar timer; the blast now ends
// when the tallest piece PHYSICALLY lands (~2.8-3.0 s), not on a clock. See
// the `Hostile.debris` and `EXPLOSION_DURATION` doc comments for the
// keep-vs-migrate scope decisions (saucer.ts's own blast, the missile's own
// contact self-detonation, and the many hand-built exploding-Hostile test
// fixtures all deliberately stay on the old scalar gate).

import type { TankPose } from './camera'
import type { Input } from './input'
import { isBlocked, MAX_TURN_RATE, PLAYER_RADIUS, stepTank } from './movement'
import { SHELL_SPEED, SHELL_MAX_RANGE, shellBlocked, type Shell } from './firing'
import { GAME_FRAME_HZ } from './timebase'
import { SCORES, MISSILE_INTRO_THRESHOLD } from './scoring'
import { FULL_AGGRESSION_DIFFERENTIAL } from './difficulty'
import type { RadarContact } from './radar'
import { createRng, nextFloat, type Rng } from '@shared/rng'
import { OBJECT_EXPLOSION, spawnDebris, stepDebris, type DebrisState } from './debris'

/** The hostile slot is occupied through the death blast (findings §2). */
export type HostilePhase = 'alive' | 'exploding'

/**
 * The full bz1-8 roster. Spellings match radar.ts's RadarContactKind so
 * radarContacts is a passthrough (no translation table). The saucer (bz1-9)
 * is a bonus VISITOR, not the hostile — it never enters this union.
 */
export type HostileKind = 'tank' | 'super-tank' | 'missile'

/** The one hostile on the battlefield. */
export interface Hostile {
  /** Planar world X (planar-sim ruling: no y). */
  readonly x: number
  /** Planar world Z. */
  readonly z: number
  /** Facing, radians — ROM convention: 0 faces +Z, increasing turns to +X. */
  readonly heading: number
  readonly kind: HostileKind
  readonly phase: HostilePhase
  /** Seconds spent in the current phase — explosion expiry + missile swerve clock now; bz1-10's ~17s aggression ramp later. */
  readonly phaseAge: number
  /**
   * bz2-10 — the authentic ROM goal-heading maneuvering state (SetTankTurnTo
   * $6534). `turnTo` is the world heading the tank is steering toward, usually
   * NOT the player (a flank ±90° or a wander), so the barrel is decoupled from
   * the player and fire is intermittent. `moveCounter` counts down to the next
   * goal re-pick; `reversing` counts down a post-collision back-off
   * (HitSomething $651a). All optional so pre-bz2-10 `Hostile` literals still
   * typecheck (the `reload ??` idiom); a fresh tank (turnTo absent) orients on
   * the player once, then wanders.
   */
  readonly turnTo?: number
  readonly moveCounter?: number
  readonly reversing?: number
  /**
   * Which goal the tank is currently pursuing. `charge` re-locks onto the live
   * player bearing each step (GoHard — a true pursuit that closes and fires);
   * `flank`/`wander` steer toward the fixed `turnTo` heading. Absent = fresh.
   */
  readonly goal?: 'charge' | 'flank' | 'wander'
  /**
   * bz3-5 / F-008: the ROM's 6-piece gravity debris burst, attached the
   * instant the tank/super-tank OBJECT kill happens (stepEnemies section 1)
   * and carried forward while `phase === 'exploding'`. `stepDebris`'s `done`
   * flag — not a clock — governs when the replacement spawns (see the
   * exploding branch of stepEnemies). Absent on a hand-built exploding
   * Hostile — the missile's own contact self-detonation (`stepMissile`) and
   * the many pre-bz3-5 test fixtures across the suite — which fall back to
   * the scalar `EXPLOSION_DURATION` gate instead (Design Deviation).
   */
  readonly debris?: DebrisState
  /**
   * bz4-3 / AC-1: the ROM's per-object tread-animation counter TRDCTR
   * (`ZX,TRDCTR`), tied to THIS tank's own motion, not a free-running clock.
   * `stepEnemies` INCs it on a commanded forward drive (M.FOR → INC,
   * BZONE.MAC:2669), DECs it on a commanded reverse (M.REV → DEC, :2673), and
   * leaves it FROZEN while the tank pivots or holds still (pivot/M.STOP never
   * touch TRDCTR) — so a stationary tank's treads freeze and a reversing tank's
   * roll backward. Seeded 0 at spawn; the shell (`main.ts`) feeds it to
   * `scene.treadFrame` in place of bz3-12's `game.frameCount`. Optional (`?? 0`
   * idiom, like `reload`/`missilesLaunched`) so pre-bz4-3 `Hostile` literals
   * still typecheck. May go negative while reversing — `treadFrame` already
   * wraps negatives (`treadFrame(-1) === treadFrame(3)`).
   */
  readonly treadCounter?: number
}

/** The whole enemy side of the sim, carried across frames. */
export interface EnemyState {
  /** NEVER null — the "always one hostile" rule (findings §2). */
  readonly hostile: Hostile
  /** The enemy's projectile — ROM slot #1; same physics as the player's. */
  readonly shell: Shell | null
  /** The carried PRNG seed word (a primitive — the rng cursor stays local). */
  readonly rng: number
  /**
   * Missiles launched at the player this game — the ROM's counter (game start
   * writes $ff = "none yet", dis65 1605; modeled 0-based). Increments when a
   * missile SPAWNS (dis65 6690) and drives GetTankType's slow/super choice.
   */
  readonly missilesLaunched: number
  /**
   * bz2-9 R2: seconds until the tank may fire again after its last shell STRUCK
   * an obstacle — the ROM's post-strike explosion lock ($a0). 0/absent = ready.
   * Optional so the many pre-R2 `EnemyState` literals still typecheck; read via
   * `?? 0`, the `missilesLaunched` idiom.
   */
  readonly reload?: number
}

/** What one enemy step tells the caller. */
export interface EnemyStepResult {
  readonly state: EnemyState
  /** The dead unit's ROM kill value on the kill step (1000/2000/3000), else 0 — never awarded twice. */
  readonly scoreAward: number
  /** The player's shell struck the hostile — the caller nulls its slot. */
  readonly playerShellConsumed: boolean
  /** The enemy's shell reached the player — a SIGNAL only; consequences (lives, death sequence) are a later story. */
  readonly playerHit: boolean
}

/**
 * Shell-vs-tank kill radius. Reuses the player's ROM radius ($480 = 1152 —
 * $6427) as the tank-scale approximation; the projectile-specific diameter
 * table at $6139 is a deferred byte-decode (house deferral since bz1-4/bz1-5).
 * ≥ one 60 Hz shell frame-step (256), so the point-sampled kill test cannot
 * tunnel at the standing cadence.
 */
export const TANK_HIT_RADIUS = PLAYER_RADIUS

/**
 * Seconds the hostile spends exploding before the replacement spawns — the
 * PRE-bz3-5 scalar timer. bz3-5 / F-008 replaces this for the tank/
 * super-tank OBJECT kill (stepEnemies section 1) with the ROM's 6-piece
 * gravity debris sim (`debris.ts`'s `OBJECT_EXPLOSION`); that kill always
 * attaches a `DebrisState` and this constant plays NO role in its
 * retirement — `stepDebris`'s physics-driven `done` flag does.
 *
 * KEPT exported and in active use for two things bz3-5 deliberately did NOT
 * touch (see the story's Delivery Findings):
 *   1. `saucer.ts`'s own visitor blast — a different ROM object, not audited
 *      by F-008 (the saucer is a bonus visitor, never the hostile).
 *   2. A `Hostile` that reaches the exploding branch with no `debris` field —
 *      the missile's own contact self-detonation (`stepMissile`, not cited
 *      by F-008 either) and the many pre-bz3-5 test fixtures across the
 *      suite that hand-construct an `exploding` Hostile literal directly.
 *      Both fall back to this scalar gate (see the exploding branch below).
 */
export const EXPLOSION_DURATION = 1.5

/**
 * Tank spawns are slow tanks until this many missiles have been launched,
 * super tanks after. bz3-3 / E-010: TR7CHK's `LDA NOR2D3 / CMP I,5` (carry
 * set = TR7, BZONE.MAC:3704-3707) fires once NOR2D3 >= 5 — but NOR2D3 is the
 * missile count MINUS ONE (game-start `LDA I,-1 / STA NOR2D3`, :1175; the
 * first spawn's "THIS WILL SET NOR2D3 TO 0 FOR FIRST", :3773). So NOR2D3 >= 5
 * first holds at the 6th missile launched, not the 5th — our 0-based
 * `missilesLaunched` (never -1-based) reaches the same event one later.
 */
export const SUPER_TANK_AFTER_MISSILES = 6

/**
 * Inside this range the missile stops swerving and homes. ROM-EXACT:
 * dis65 5787 — "use distance threshold of $0800 (very close)".
 */
export const MISSILE_CLOSE_RANGE = 0x0800

/**
 * A missile farther than this from the player is scrapped and replaced
 * same-step ("if a missile misses the player and gets too far away, this
 * spawns a new one" — dis65 6889/7076; tanks keep going). PROVISIONAL
 * distance: the semantics are the ROM fact, the byte is an undecoded quarry
 * value. Must clear the far plane (31487) so no fresh spawn (ring ≤ 30k) is
 * scrapped at birth.
 */
export const MISSILE_ABANDON_RANGE = 36_000

// --- Provisional AI tuning (bz1-12 playtest true-up; see session deviations) —

// --- bz2-10: authentic goal-heading maneuvering AI (playtest true-up, like the
// other AI knobs). The ROM tank is a GOAL-HEADING state machine (SetTankTurnTo
// $6534), NOT a beeline seeker: it steers toward `turnTo` — usually a flank
// (~90° off the player) or a wander — at a slow, capped rate (well below the
// player's pivot), holds a standoff, reverses off obstacles, and fires only on
// the rare frames its barrel genuinely lines up (ShootOkay $65b6). All values
// PROVISIONAL inside TEA's behavioral bands (relative, not absolute), so a
// bz1-12-style playtest retune stays green.

/**
 * Enemy turn rate — bz3-2 / E-011: the bz3-1-corrected `MAX_TURN_RATE` IS the
 * ROM's regular enemy rate (both 1.40625°/frame @ 15.625 Hz — BZONE.MAC:2826
 * ITANGL / :2988 two calls/frame), so the regular tank turns at the full
 * shared rate; the TR7 super tank doubles it (:2988-2997, four calls/frame).
 * Applied via the enemy's OWN commanded treads — `MAX_TURN_RATE` itself (the
 * player's cap) is untouched.
 */
const TANK_TURN_RATE = MAX_TURN_RATE
const SUPER_TANK_TURN_RATE = MAX_TURN_RATE * 2

/**
 * Distance (world units) at which the tank stops closing and holds/circles —
 * ROM SmallAngleCom $64c2 ($05=1280 slow, $08=2048 super). No point-blank ram.
 */
const STANDOFF = 1280
const SUPER_STANDOFF = 2048

/** Heading error to the goal within which the tank advances; a bigger error
 *  rotates in place (ROM ContMove $6463 — big turns don't advance). */
const ADVANCE_CONE = 1.3

/**
 * Goal odds + hold times (ROM SetTankTurnTo: GoHard charge / GoMedium flank /
 * GoMild wander). bz3-2 / E-002 retune → ATTACK-DOMINANT (BZONE.MAC:3072-3074
 * `LDA PRAND / LSR / BCC R.ATCK`: a fair coin alone floors attack at ≥50% of
 * decisions, and back-to-back attacks are legal — no anti-repeat gate in the
 * ROM). Charge is now the majority pick and may repeat immediately (see the
 * goal-repick block below — the old `canCharge = goal !== 'charge'` anti-weld
 * gate is gone). An un-aligned charge still auto-extends until it takes its
 * shot (`CHARGE_PERIOD` bounds only the barrel-on hold AFTER lining up, so a
 * settled tank breaks off instead of welding); flank/wander hold longer ($40).
 * The morale rubber-band ($6548) is simplified to fixed odds (deferred — see
 * Dev deviation), provisional pending playtest.
 */
const CHARGE_CHANCE = 0.55
const FLANK_CHANCE = 0.3
const CHARGE_PERIOD = 2.0
const GOAL_PERIOD = 3.5
/** Flank goal = ±90° off the player bearing (ROM `player_angle XOR $40`). */
const FLANK_ARC = Math.PI / 2
/** Wander goal = previous goal ± up to ~45° (ROM GoMild ±$1f). */
const WANDER_ARC = Math.PI / 2

/** Post-collision back-off: reverse + random turn for ~3s (ROM HitSomething
 *  $651a, move_counter=$30) — unsticks a wedged tank. */
const COLLISION_REVERSE = 3.0
const COLLISION_TURN_ARC = Math.PI
/** A commanded advance that gained less ground than this struck an obstacle. */
const STALL_EPSILON = 1

/**
 * Radians of heading error inside which the tank fires — bz3-2 / E-004: the
 * ROM's own window, FIREIT's `CMP I,2` (BZONE.MAC:3145): |error| < 2 angle
 * units ≈ 2.81°. Retuned TOGETHER with the attack-dominant disposition
 * (E-002) and the ROM turn rate (E-011) — the old wider cone was a
 * compensation for a tank that rarely attacked and turned slowly, not a ROM
 * fact. A mild (low-aggro) tank widens it further and "takes bad shots"
 * (findings §5); a full-aggro tank must be genuinely lined up on the player.
 */
const FIRE_CONE = 0.049 // < 2 angle units (360/256° each) ≈ 2.81°
const MILD_FIRE_EXTRA = 0.55

/**
 * bz3-2 / E-013: beyond this distance, a not-fully-aggressive tank withholds
 * fire — the ROM's FIREIT restraint `LDA TDIST / CMP I,24 / BCS 50$`
 * (BZONE.MAC:3134-3136), dropped only once fully aggressive (FTIMER==$FF,
 * :3124). $24 is an undecoded TDIST distance byte; ×256 (the clone's existing
 * world-units-per-ROM-distance convention, e.g. STANDOFF=$05×256) ≈ 9216.
 */
const RANGE_RESTRAINT = 0x24 * 256

/**
 * bz2-9 (unfair-spawn playtest fix, R2): a tank holds fire until it has been
 * "spawned" this many seconds. A PLAYER respawn re-spawns the grace too — sim.ts
 * resets the survivor's `phaseAge` on respawn — so the standing enemy can't
 * re-kill the fresh spawn on the next frame. ROM-grounded: rez_protect gates
 * TryShootPlayer until ~2 s since the last spawn ("don't be unfair", dis65 $6595:
 * `cmp #$20` ≈ 32 frames at the ~16 fps game loop). Enemies stay fully lethal
 * AFTER the grace (AC-4 — the difficulty ceiling is untouched).
 */
const SPAWN_FIRE_GRACE = 2.0

/**
 * bz2-9 R2: after an enemy shell STRIKES an obstacle the tank cannot re-fire for
 * this long. The ROM holds a struck projectile in an explosion state ($a0) that
 * keeps the fire gate shut until the blast ends, so a tank wedged against a
 * barrier fires on a reload instead of every frame. PROVISIONAL — the explosion
 * frame count is an undecoded quarry byte (playtest true-up, like the other AI
 * knobs); sits inside TEA's "not a machine-gun" band.
 */
const SHELL_RELOAD = 0.4

/** The slow tank crawls at half the player's throttle ("slow" tank). */
const SLOW_TANK_THROTTLE = 0.5

/** The super tank runs at the player's full throttle — provisional, like the slow tank's crawl. */
const SUPER_TANK_THROTTLE = 1.0

/**
 * Missile flight tuning — ALL provisional inside TEA's behavioral bands
 * (the ROM velocity table is an undecoded quarry byte; bz1-12 trues up):
 * flies at twice the player's top speed, snaps its nose at 8 rad/s, and
 * swerves ±0.35 rad on the ROM's half-second alternation (dis65 5802).
 */
const MISSILE_SPEED = 11_520
const MISSILE_TURN_RATE = 8
const MISSILE_SWERVE = 0.35
const MISSILE_SWERVE_PERIOD = 0.5

/**
 * Odds a replacement spawn above the DIP threshold is a missile rather than
 * a tank. bz3-3 / R-008 decode: a fair 1-bit coin — `LDY PRAND / TYA / EOR
 * OLDRND / STY OLDRND / LSR / BCC TANKCK` (BZONE.MAC:3733-3738) routes bit 0
 * of the fudged POKEY random byte to the tank branch on carry-clear; the
 * other half falls through to R2D3CK, the missile spawn (BZONE.MAC:3737-3741).
 * 50/50, not the old provisional 40%.
 */
export const MISSILE_SPAWN_CHANCE = 0.5

/** ROM kill values per roster kind (findings §1, byte-confirmed). */
const KILL_AWARD: Readonly<Record<HostileKind, number>> = {
  tank: SCORES.slowTank,
  'super-tank': SCORES.superTank,
  missile: SCORES.missile,
}

/** Spawn ring around the player: clear of contact, inside the far plane. */
const SPAWN_MIN = 16_000
const SPAWN_MAX = 30_000

/**
 * bz3-2 / E-009: the spawn arc's HALF-width at score 0 and at the ROM's $7F
 * full-aggression cap (BZONE.MAC:3752-3795 — ROBCHK's mask $0F→$1F→$3F→$7F,
 * ANDed with PRAND and added to the player's facing TANGLE). $0F=15 units≈21°,
 * $7F=127 units≈178.6°; interpolated LINEARLY by score between them — the same
 * acknowledged simplification as difficulty.ts's ramp (the ROM steps through
 * four discrete masks, not a continuum). Supersedes bz2-9's fixed ±π/2 forward
 * hemisphere: a mild spawn still lands well inside that old hemisphere, but a
 * high-score spawn now reaches into the rear (ROM-correct — "spawns in any
 * direction ... with full aggression", findings §5). Centered on
 * player.heading, so it holds for any facing.
 */
const SPAWN_ARC_HALF_MIN = (21 * Math.PI) / 180
const SPAWN_ARC_HALF_MAX = (178 * Math.PI) / 180

/**
 * Full spawn-arc width for a given player-minus-enemy score DIFFERENTIAL
 * (bz3-2 / E-009 review follow-up) — keyed on the same differential signal
 * `aggression()` (difficulty.ts) already reads, NOT the aggro ratchet it
 * produces, so the arc scales independently of the throttle/cone/turn knobs.
 * Also distinct from the raw player `score` chooseKind reads for the
 * missile-introduction DIP threshold (findings §9) — an unrelated,
 * absolute-score mechanism. Negative (enemy leading) clamps to the
 * narrowest arc, same floor direction as aggression()'s clamp.
 */
function spawnArcWidth(differential: number): number {
  const t = Math.min(Math.max(differential, 0) / FULL_AGGRESSION_DIFFERENTIAL, 1)
  return 2 * (SPAWN_ARC_HALF_MIN + t * (SPAWN_ARC_HALF_MAX - SPAWN_ARC_HALF_MIN))
}

/**
 * The ROM's swept-collision granularity: 256 units per sub-step, 4 sub-steps
 * per 15.625 Hz / 64 ms game frame (SHELL_SPEED / GAME_FRAME_HZ / 4 = 256;
 * BZONE.MAC:608 SAVE3=4). Was `/ 60 / 4`, which yielded 66.7 once SHELL_SPEED
 * was corrected — bz3-1 / AC-1: use the game frame, never the 60 Hz render loop.
 */
const SHELL_SUBSTEP = SHELL_SPEED / GAME_FRAME_HZ / 4

const TAU = Math.PI * 2

/** Fold an angle onto (−π, π]. */
function wrapAngle(a: number): number {
  let r = a % TAU
  if (r > Math.PI) r -= TAU
  if (r <= -Math.PI) r += TAU
  return r
}

/** Bearing from (x, z) to the player — camera.ts's [sin, cos] convention. */
function bearingTo(x: number, z: number, player: TankPose): number {
  return Math.atan2(player.x - x, player.z - z)
}

/**
 * Spawn a fresh hostile of the given kind on the ring around the player,
 * facing the player, rejecting blocked ground (the deliberate
 * anti-spawn-in-obstacle fix). One creation path for every kind — the ROM's
 * "common code for creating a new tank or missile" (dis65 6725). Draws from
 * the passed rng cursor — deterministic per carried seed word. `spread` is
 * the full spawn-arc width off the player's heading (bz3-2 / E-009 —
 * spawnArcWidth), centered so it holds for any facing.
 */
function spawnHostile(rng: Rng, player: TankPose, kind: HostileKind, spread: number): Hostile {
  for (;;) {
    const dir = player.heading + (nextFloat(rng) - 0.5) * spread
    const d = SPAWN_MIN + nextFloat(rng) * (SPAWN_MAX - SPAWN_MIN)
    const x = player.x + Math.sin(dir) * d
    const z = player.z + Math.cos(dir) * d
    // Obstacle footprints cover a sliver of the ring — the rejection loop
    // terminates in a draw or two, deterministically.
    if (!isBlocked(x, z)) {
      return { x, z, heading: bearingTo(x, z, player), kind, phase: 'alive', phaseAge: 0, treadCounter: 0 }
    }
  }
}

/**
 * The ROM's replacement selection (CreateNewEnemyUnit + GetTankType,
 * dis65 6581-6617): below the DIP threshold, always a tank; at/above it, a
 * seeded draw may make a missile; WHICH tank is the launch counter's call.
 */
function chooseKind(rng: Rng, missilesLaunched: number, score: number): HostileKind {
  if (score >= MISSILE_INTRO_THRESHOLD && nextFloat(rng) < MISSILE_SPAWN_CHANCE) {
    return 'missile'
  }
  return missilesLaunched >= SUPER_TANK_AFTER_MISSILES ? 'super-tank' : 'tank'
}

/** Seed the enemy side: one alive slow tank (score 0 era), no shell, no launches. */
export function initEnemies(seed: number, player: TankPose): EnemyState {
  const rng = createRng(seed)
  const hostile = spawnHostile(rng, player, 'tank', spawnArcWidth(0))
  return { hostile, shell: null, rng: rng.seed, missilesLaunched: 0, reload: 0 }
}

/**
 * bz2-10 authentic drive: steer toward the GOAL heading `turnTo` (usually NOT
 * the player) at the enemy's OWN capped turn rate, expressed as opposed-tread
 * components so the shared `MAX_TURN_RATE` (the player's pivot) is untouched.
 * Advance only when roughly on the goal AND still outside the standoff; reverse
 * after a collision. Yaw and forward compose on the treads — they cancel in the
 * forward term and add in the yaw term (see movement.stepTank).
 */
function aiDrive(
  hostile: Hostile,
  player: TankPose,
  goalHeading: number,
  throttle: number,
  maxYaw: number,
  standoff: number,
  reversing: number,
  dt: number,
): Input {
  const errGoal = wrapAngle(goalHeading - hostile.heading)
  // Turn toward the goal, capped at the enemy rate, never overshooting in a step.
  // Frozen time (dt = 0) is a spatial no-op — no turn (guards the `/dt`).
  const yaw = dt > 0 ? Math.sign(errGoal) * Math.min(Math.abs(errGoal) / dt, maxYaw) : 0
  const turnComp = yaw / MAX_TURN_RATE // = (right − left) / 2
  const distPlayer = Math.hypot(player.x - hostile.x, player.z - hostile.z)
  const forwardFraction =
    reversing > 0
      ? -throttle // backing off a collision
      : Math.abs(errGoal) <= ADVANCE_CONE && distPlayer > standoff
        ? throttle // aligned to the goal + outside the standoff → close/circle
        : 0 // mid-turn or holding the standoff → rotate in place
  return {
    leftTread: forwardFraction - turnComp,
    rightTread: forwardFraction + turnComp,
    fire: false,
  }
}

/**
 * One step of guided-missile flight (dis65 5753-5807). The missile FLIES —
 * no dual-tread physics, no obstacle collision (ROM altitude $1800, offset
 * 6693 — it passes over the field; the planar core keeps only x/z): steer
 * toward the player (plus the swerve offset while far and not the pampered
 * first missile), advance along the nose, detonate on contact.
 */
function stepMissile(
  hostile: Hostile,
  player: TankPose,
  missilesLaunched: number,
  dt: number,
): { readonly hostile: Hostile; readonly playerHit: boolean } {
  const dx = player.x - hostile.x
  const dz = player.z - hostile.z
  const range = Math.hypot(dx, dz)
  // "first missile ever... be nice (fly straight in)" (5753-5756);
  // inside $0800 the swerve stops and it homes ("head at player", 5787-5794).
  const weaving = missilesLaunched !== 1 && range > MISSILE_CLOSE_RANGE
  // The ROM alternates swerve direction on a half-second clock (5799-5803);
  // phaseAge is the sim's deterministic stand-in for the frame counter.
  const swerve = weaving
    ? Math.floor(hostile.phaseAge / MISSILE_SWERVE_PERIOD) % 2 === 0
      ? MISSILE_SWERVE
      : -MISSILE_SWERVE
    : 0
  const err = wrapAngle(bearingTo(hostile.x, hostile.z, player) + swerve - hostile.heading)
  const turn = Math.sign(err) * Math.min(Math.abs(err), MISSILE_TURN_RATE * dt)
  const heading = wrapAngle(hostile.heading + turn)
  const x = hostile.x + Math.sin(heading) * MISSILE_SPEED * dt
  const z = hostile.z + Math.cos(heading) * MISSILE_SPEED * dt
  // Contact kill (dis65 6491) — the player's ROM radius stands in for the
  // undecoded missile collision radius ($6533, same deferral as
  // TANK_HIT_RADIUS). One frame-step (192 units) < the radius: no tunneling.
  const px = x - player.x
  const pz = z - player.z
  if (px * px + pz * pz < PLAYER_RADIUS * PLAYER_RADIUS) {
    return {
      hostile: {
        x, z, heading, kind: 'missile', phase: 'exploding', phaseAge: 0,
        treadCounter: hostile.treadCounter, // bz4-3: carry the field through the rebuild
      },
      playerHit: true,
    }
  }
  return {
    hostile: {
      x, z, heading, kind: 'missile', phase: 'alive', phaseAge: hostile.phaseAge + dt,
      treadCounter: hostile.treadCounter, // bz4-3: carry the field through the rebuild
    },
    playerHit: false,
  }
}

/**
 * Advance the whole enemy side one step, pure and deterministic:
 *   1. the player's shell vs the alive hostile (kill → exploding + 1000 pts),
 *   2. the enemy shell's swept flight (obstacles, max range, the player),
 *   3. the hostile itself — AI drive + aimed fire while alive; blast timer
 *      while exploding, with the no-gap replacement spawn on expiry.
 */
export function stepEnemies(
  state: EnemyState,
  player: TankPose,
  playerShell: Shell | null,
  dt: number,
  score = 0,
  // bz1-10's ratchet (difficulty.aggression, findings §5), normalised [0, 1].
  // Scales the tank knobs: mild enemies crawl slower and take bad shots
  // (fire outside the aimed gate); 1 — the default — is EXACTLY the
  // pre-ratchet behavior, so callers that don't ratchet are untouched. The
  // knob MAPPING is provisional like the AI constants it scales (bz1-12
  // playtest true-up).
  aggro = 1,
  // bz3-2 / E-009 review follow-up: the player-minus-enemy score DIFFERENTIAL
  // that drives the spawn arc (spawnArcWidth) — the same signal fed to
  // difficulty.aggression() at the sim.ts call site, kept SEPARATE from
  // `score` above (which stays the raw player score chooseKind reads for the
  // missile DIP threshold, findings §9). Defaults to `score` so callers with
  // no enemy-score context (most unit tests) keep the prior approximation.
  differential = score,
): EnemyStepResult {
  const rng = createRng(state.rng)
  let hostile = state.hostile
  let shell = state.shell
  // Defensive ?? 0: pre-widening EnemyState literals (bz1-7's tests) predate
  // the counter; a missing field must read as "no missiles launched yet".
  let missilesLaunched = state.missilesLaunched ?? 0
  // bz2-9 R2: the post-strike reload burns down each step (?? 0 for pre-R2 literals).
  let reload = Math.max(0, (state.reload ?? 0) - dt)
  let scoreAward = 0
  let playerShellConsumed = false
  let playerHit = false
  let justKilled = false

  /** The ROM's same-step replacement: pick a kind, count a launch, spawn. */
  const spawnReplacement = (): Hostile => {
    const kind = chooseKind(rng, missilesLaunched, score)
    if (kind === 'missile') missilesLaunched += 1
    return spawnHostile(rng, player, kind, spawnArcWidth(differential))
  }

  // 1. The player's shell vs the hostile — only a LIVE unit can be killed
  // (debris eats no shells and re-awards nothing). Point sample at the shell's
  // current position: TANK_HIT_RADIUS ≥ one frame-step, so no tunneling at
  // the standing cadence (the swept refinement is a sim.ts-era follow-up —
  // see Delivery Findings).
  if (playerShell !== null && hostile.phase === 'alive') {
    const dx = playerShell.x - hostile.x
    const dz = playerShell.z - hostile.z
    if (dx * dx + dz * dz < TANK_HIT_RADIUS * TANK_HIT_RADIUS) {
      hostile = {
        x: hostile.x,
        z: hostile.z,
        heading: hostile.heading,
        kind: hostile.kind,
        phase: 'exploding',
        phaseAge: 0,
        // bz4-3: the dead tank's tread counter rides through the blast (it
        // renders as debris, not treads, but the field must survive the rebuild).
        treadCounter: hostile.treadCounter,
        // bz3-5 / F-008: the ROM's 6-piece gravity burst, not a clock.
        debris: spawnDebris(OBJECT_EXPLOSION),
      }
      scoreAward = KILL_AWARD[hostile.kind]
      playerShellConsumed = true
      justKilled = true
    }
  }

  // 2. The enemy shell in flight — the ROM's swept walk: advance in sub-steps
  // and check collisions after each (offset 6636), against the range wall,
  // the 21 obstacles, and the player. A shell keeps flying even if its firer
  // is exploding — it is already out of the barrel.
  if (shell !== null) {
    const dist = SHELL_SPEED * dt
    if (dist > 0) {
      const substeps = Math.ceil(dist / SHELL_SUBSTEP)
      const stepDist = dist / substeps
      const fx = Math.sin(shell.heading)
      const fz = Math.cos(shell.heading)
      let x = shell.x
      let z = shell.z
      let range = shell.range
      let inFlight = true
      for (let i = 0; i < substeps; i++) {
        x += fx * stepDist
        z += fz * stepDist
        range += stepDist
        if (range > SHELL_MAX_RANGE) {
          inFlight = false // expired at the range wall
          break
        }
        if (shellBlocked(x, z)) {
          inFlight = false // struck an obstacle mid-path
          reload = SHELL_RELOAD // bz2-9 R2: the strike's explosion locks the next shot out
          break
        }
        const px = x - player.x
        const pz = z - player.z
        if (px * px + pz * pz < PLAYER_RADIUS * PLAYER_RADIUS) {
          playerHit = true // the duel is real — signal the caller
          inFlight = false
          break
        }
      }
      shell = inFlight ? { x, z, heading: shell.heading, range } : null
    }
  }

  // 3. The hostile itself.
  if (hostile.phase === 'alive') {
    if (hostile.kind === 'missile') {
      // A missile that sailed too far past the player is scrapped and
      // replaced in the same step, no score — "we kill it and make a new
      // unit" (dis65 7076). Tanks at any range just keep coming.
      const mdx = hostile.x - player.x
      const mdz = hostile.z - player.z
      if (mdx * mdx + mdz * mdz > MISSILE_ABANDON_RANGE * MISSILE_ABANDON_RANGE) {
        hostile = spawnReplacement()
      } else {
        const flown = stepMissile(hostile, player, missilesLaunched, dt)
        hostile = flown.hostile
        playerHit = playerHit || flown.playerHit
      }
    } else {
      // bz2-10: the authentic ROM goal-heading maneuvering AI (replacing the
      // bz1-7 beeline seeker). The tank steers toward a GOAL that is usually NOT
      // the player (flank/wander), turns slowly, holds a standoff, reverses off
      // obstacles, and fires only when its barrel genuinely sweeps the player.
      // Mild enemies crawl: the ratchet scales the throttle from half speed
      // (aggro 0) up to the story-standing full value (aggro 1).
      const throttle =
        (hostile.kind === 'super-tank' ? SUPER_TANK_THROTTLE : SLOW_TANK_THROTTLE) *
        (0.5 + 0.5 * aggro)
      const maxYaw = hostile.kind === 'super-tank' ? SUPER_TANK_TURN_RATE : TANK_TURN_RATE
      const standoff = hostile.kind === 'super-tank' ? SUPER_STANDOFF : STANDOFF
      const bearing = bearingTo(hostile.x, hostile.z, player)
      const distToPlayer = Math.hypot(player.x - hostile.x, player.z - hostile.z)

      // Goal state (defaults for fresh spawns / pre-bz2-10 literals). Timers burn
      // down each step; a fresh tank (no goal yet) charges the player. Every rng
      // draw here comes from the carried seed word.
      let reversing = Math.max(0, (hostile.reversing ?? 0) - dt)
      let moveCounter = Math.max(0, (hostile.moveCounter ?? 0) - dt)
      let goal = hostile.goal
      let turnTo = hostile.turnTo
      if (goal === undefined) {
        goal = 'charge'
        moveCounter = CHARGE_PERIOD
      } else if (reversing <= 0 && moveCounter <= 0) {
        // The ROM's GoHard PERSISTS: enemy_score keeps it charging (re-locking
        // near every frame) until it lines up and takes its shot — a charge
        // that has NOT yet lined up (|err| > the fire cone) keeps charging, no
        // break-off, no rng draw — so a tank that starts facing away always
        // FOLLOWS THROUGH to a shot instead of quitting mid-sweep (keeps the
        // tank lethal).
        const errPlayerNow = wrapAngle(bearing - hostile.heading)
        if (goal === 'charge' && Math.abs(errPlayerNow) > FIRE_CONE) {
          moveCounter = CHARGE_PERIOD // still lining up — keep charging
        } else {
          // SetTankTurnTo $6534: charge / flank ±90° / wander ±45°. bz3-2 /
          // E-002: the ROM fair coin (BZONE.MAC:3072-3074 `BCC R.ATCK`) allows
          // back-to-back attacks and never consults the previous goal, so
          // charge is eligible from ANY prior goal, including another charge
          // (the old `canCharge = goal !== 'charge'` anti-weld gate is gone).
          // Morale rubber-band ($6548) simplified to fixed odds — see Dev
          // deviation.
          const roll = nextFloat(rng)
          if (roll < CHARGE_CHANCE) {
            goal = 'charge' // GoHard — pursue the player
            moveCounter = CHARGE_PERIOD
          } else if (roll < CHARGE_CHANCE + FLANK_CHANCE) {
            goal = 'flank' // GoMedium
            turnTo = wrapAngle(bearing + (nextFloat(rng) < 0.5 ? FLANK_ARC : -FLANK_ARC))
            moveCounter = GOAL_PERIOD
          } else {
            goal = 'wander' // GoMild
            turnTo = wrapAngle((turnTo ?? bearing) + (nextFloat(rng) - 0.5) * WANDER_ARC)
            moveCounter = GOAL_PERIOD
          }
        }
      }
      // `charge` re-locks onto the LIVE player bearing each step — a true pursuit
      // that closes and eventually lines the barrel up to fire; flank/wander hold
      // their fixed world heading, so the barrel drifts off the player (no fire).
      const goalHeading = goal === 'charge' ? bearing : (turnTo ?? bearing)

      // Fire decision at the current pose, before moving — the shell leaves along
      // the tank's own barrel (offset 2674). The gate is the ROM ShootOkay window
      // (~±2.8°, bz3-2/E-004) so a tank pointed at its flank goal holds fire; a
      // mild (low-aggro) tank widens it and takes bad shots (findings §5). bz3-2 /
      // E-013 adds a range term: below full aggression the tank also withholds
      // fire past RANGE_RESTRAINT (BZONE.MAC:3134-3136 TDIST≥$24), lifted only at
      // aggro===1 (FTIMER==$FF). bz2-9's grace + post-strike reload gate are
      // preserved; the opening stays survivable and a settled tank stays lethal
      // once its barrel sweeps you.
      const errPlayer = wrapAngle(bearing - hostile.heading)
      if (
        shell === null &&
        !playerHit &&
        reload <= 0 &&
        hostile.phaseAge >= SPAWN_FIRE_GRACE &&
        Math.abs(errPlayer) <= FIRE_CONE + (1 - aggro) * MILD_FIRE_EXTRA &&
        (aggro >= 1 || distToPlayer < RANGE_RESTRAINT)
      ) {
        shell = { x: hostile.x, z: hostile.z, heading: hostile.heading, range: 0 }
      }

      const input = aiDrive(hostile, player, goalHeading, throttle, maxYaw, standoff, reversing, dt)
      const moved = stepTank({ x: hostile.x, z: hostile.z, heading: hostile.heading }, input, dt)

      // bz4-3 / AC-1: step the per-hostile tread counter off THIS frame's
      // commanded drive — the ROM's movement-dispatch INC/DEC (M.FOR → INC
      // ZX,TRDCTR :2669, M.REV → DEC :2673; pivot/M.STOP leave it frozen). The
      // yaw components cancel, so `netTread` = 2·forwardFraction: >0 = commanded
      // forward (INC), <0 = commanded reverse (DEC), 0 = pivot/hold (freeze). Off
      // the COMMAND (not the achieved displacement), so a blocked advance still
      // rolls the tread this frame (ROM: the INC follows JSR M.FOR regardless),
      // and the HitSomething reverse below only affects NEXT frame.
      //
      // The ROM's INC/DEC fire once per 15.625 Hz game frame, but stepEnemies
      // runs on every ~60 Hz shell sub-step — so gate the step to WHOLE game
      // frames elapsed this call via the same floor-diff-on-phaseAge idiom the
      // debris (below) and volcano (sim.ts) use. `phaseAge` accumulates +dt per
      // alive call and seeds 0 at spawn, so summed across sub-steps this
      // telescopes to exactly the `frameCount` delta (both ride the 15.625 Hz
      // clock). Taken from the pre-increment phaseAge so it matches frameCount
      // frame-for-frame. Sign is pinned; the per-game-frame rate is byte-exact.
      const wholeFrames =
        Math.floor((hostile.phaseAge + dt) * GAME_FRAME_HZ) -
        Math.floor(hostile.phaseAge * GAME_FRAME_HZ)
      const netTread = input.leftTread + input.rightTread
      const prevTread = hostile.treadCounter ?? 0
      const treadCounter =
        netTread > 1e-6
          ? prevTread + wholeFrames
          : netTread < -1e-6
            ? prevTread - wholeFrames
            : prevTread

      // HitSomething $651a: a commanded advance (net-forward treads) that gained
      // no ground struck an obstacle — reverse + turn to a fresh heading so the
      // tank never wedges.
      const advancing = netTread > 1e-6
      const gained = Math.hypot(moved.x - hostile.x, moved.z - hostile.z)
      if (dt > 0 && advancing && gained < STALL_EPSILON) {
        reversing = COLLISION_REVERSE
        moveCounter = COLLISION_REVERSE
        goal = 'wander'
        turnTo = wrapAngle(hostile.heading + (nextFloat(rng) - 0.5) * COLLISION_TURN_ARC)
      }

      hostile = {
        x: moved.x,
        z: moved.z,
        heading: moved.heading,
        kind: hostile.kind,
        phase: 'alive',
        phaseAge: hostile.phaseAge + dt,
        goal,
        turnTo,
        moveCounter,
        reversing,
        treadCounter,
      }
    }
  } else if (!justKilled) {
    // The blast burns down; the step that retires it spawns the replacement
    // in the SAME returned state — "no delay between one leaving and the next
    // appearing" (findings §2). Frozen time (dt = 0) never expires a blast.
    //
    // bz3-5 / F-008: an object kill (section 1, above) always attaches a
    // DebrisState — retirement is governed by `stepDebris`'s PHYSICS (the
    // tallest piece landing), not a clock. `stepDebris` advances exactly one
    // 15.625 Hz game frame per call, so the caller's `dt` (the shell's own
    // fixed 1/60 s sub-step — ADR-0001, SH-5) is converted to WHOLE game
    // frames via a floor-diff on the continuously-accumulated `phaseAge` —
    // the same fixed-rate-from-a-finer-clock idiom as sim.ts's radar
    // accumulator — so the integer ROM arithmetic never sees a fractional
    // frame, and no error accumulates across calls (the floor is taken
    // against the running total, not summed per step). A Hostile that
    // reaches here with no `debris` (the missile's own contact
    // self-detonation, and hand-built exploding fixtures across the test
    // suite) keeps the OLD scalar `EXPLOSION_DURATION` gate — see its doc
    // comment.
    const age = hostile.phaseAge + dt
    if (hostile.debris) {
      const priorFrames = Math.floor(hostile.phaseAge * GAME_FRAME_HZ)
      const nowFrames = Math.floor(age * GAME_FRAME_HZ)
      let burst = hostile.debris
      for (let f = priorFrames; f < nowFrames; f++) burst = stepDebris(burst)
      if (dt > 0 && burst.done) {
        hostile = spawnReplacement()
      } else {
        hostile = {
          x: hostile.x,
          z: hostile.z,
          heading: hostile.heading,
          kind: hostile.kind,
          phase: 'exploding',
          phaseAge: age,
          treadCounter: hostile.treadCounter, // bz4-3: survive the blast rebuild
          debris: burst,
        }
      }
    } else if (dt > 0 && age >= EXPLOSION_DURATION) {
      hostile = spawnReplacement()
    } else {
      hostile = {
        x: hostile.x,
        z: hostile.z,
        heading: hostile.heading,
        kind: hostile.kind,
        phase: 'exploding',
        phaseAge: age,
        treadCounter: hostile.treadCounter, // bz4-3: survive the blast rebuild
      }
    }
  }

  return {
    state: { hostile, shell, rng: rng.seed, missilesLaunched, reload },
    scoreAward,
    playerShellConsumed,
    playerHit,
  }
}

/**
 * The radar wiring bz1-6 left open: an alive hostile paints exactly one
 * contact of its own kind — "enemy tanks and missiles appear on radar"
 * (findings §7); shells and debris never paint. HostileKind's spellings ARE
 * RadarContactKind spellings, so this is a passthrough.
 */
export function radarContacts(state: EnemyState): readonly RadarContact[] {
  return state.hostile.phase === 'alive'
    ? [{ x: state.hostile.x, z: state.hostile.z, kind: state.hostile.kind }]
    : []
}
