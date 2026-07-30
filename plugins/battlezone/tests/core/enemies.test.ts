// tests/core/enemies.test.ts
//
// Story bz1-7 — RED phase (Furiosa / TEA). Enemy tanks: the "always one
// hostile" spawn rule, approach/aim/fire AI, hit + explosion, 1000 pts — all
// pure core/.
//
// CONTRACT pinned for Dev (GREEN):
//   src/core/enemies.ts
//     type HostilePhase = 'alive' | 'exploding'
//         — the ROM keeps the hostile slot occupied through the death blast:
//           "There will always be one hostile unit on the battlefield, either
//           alive or exploding" (findings §2, hub page verbatim).
//     interface Hostile { readonly x, z, heading: number;
//                         readonly kind: 'tank'; readonly phase: HostilePhase;
//                         readonly phaseAge: number }
//         — planar pose (no y — planar-sim ruling); `kind` is 'tank' (the slow
//           tank, ROM object $02) for the WHOLE of bz1-7 — missiles/super tanks
//           widen the union in bz1-8; `phaseAge` = seconds in the current
//           phase (drives explosion expiry now; the ROM's "~17 seconds after it
//           has spawned" aggression ramp (findings §5) reads it in bz1-10).
//     interface EnemyState { readonly hostile: Hostile;
//                            readonly shell: Shell | null;
//                            readonly rng: number }
//         — hostile is NEVER null (the spawn rule); `shell` is the enemy's
//           projectile — ROM slot #1 (firing.ts header: "Slot #0 is the
//           player's, #1 the enemy's"), same Shell shape as firing.ts, same
//           SHELL_SPEED / SHELL_MAX_RANGE physics (one shared projectile
//           system in the ROM); `rng` is the carried PRNG seed word (a plain
//           number — rng.ts's cursor is local to the step).
//     initEnemies(seed: number, player: TankPose): EnemyState
//         — seeds the PRNG and spawns the first hostile.
//     stepEnemies(state, player: TankPose, playerShell: Shell | null, dt):
//         EnemyStepResult — the whole enemy side of one sim step: AI
//           (approach/aim/fire), enemy-shell flight (swept, obstacle-blocked,
//           range-expired), player-shell-vs-hostile hit test, explosion
//           lifecycle, replacement spawn.
//     interface EnemyStepResult {
//       readonly state: EnemyState
//       readonly scoreAward: number          — SCORES.slowTank on the kill
//           step, else 0 (never awarded twice for one kill)
//       readonly playerShellConsumed: boolean — the player's shell struck the
//           hostile this step; the caller nulls its firing slot
//       readonly playerHit: boolean          — the enemy's shell reached the
//           player this step (consequences — lives, death sequence — are a
//           later story; this is the signal)
//     }
//     radarContacts(state): readonly RadarContact[]
//         — the radar wiring bz1-6 left open ("bz1-7 (enemy tanks) wires their
//           entities into [deriveRadar] WITHOUT touching the filter"): an alive
//           hostile paints exactly one kind-'tank' contact; shells never paint
//           (findings §7 names tanks and missiles — the UNITS — not shots).
//     TANK_HIT_RADIUS — shell-vs-tank kill radius, world units. ≥ 256 (one
//           60 Hz shell frame-step, so point sampling cannot tunnel at the
//           standing cadence — the ROM swept 4 sub-steps/frame for the same
//           reason, dis65 offset 6636). The exact ROM projectile
//           collision-diameter table ($6139) is a deferred decode — same
//           deferral movement.isBlocked and firing.shellBlocked already log.
//     EXPLOSION_DURATION — seconds the hostile spends exploding before the
//           replacement spawns. No ROM citation yet (playtest true-up,
//           bz1-12); pinned behaviorally: finite, > 0, ≤ 10.
//
// ROM facts driving these tests (docs/battlezone-1980-source-findings.md):
//   §1: slow tank = 1000 pts (scoring.ts SCORES.slowTank, byte-confirmed).
//   §2: "always one hostile... alive or exploding"; "no delay between one
//       leaving and the next appearing".
//   §5: aggression scales with score differential; full curve is bz1-10 —
//       bz1-7 pins the BASELINE behaviors only: turns toward the player,
//       closes distance, fires when roughly aimed.
//   epic: the ROM's missing spawn-collision check (enemies can spawn inside
//       obstacles) is a known defect we DELIBERATELY DO NOT REPLICATE — spawn
//       must land on drivable ground (movement.isBlocked === false). Logged
//       as a Design Deviation in the session file, per the epic's instruction.
//
// Convention (fixed by src/core/camera.ts, do NOT re-derive): heading 0 faces
// +Z, increasing heading turns CCW toward +X; forwardFromHeading(h) =
// [sin h, 0, cos h]; bearing(a→b) = atan2(b.x−a.x, b.z−a.z).
//
// RED: enemies.ts does not exist yet; each test loads the module defensively
// so a missing export fails as a clean contract miss (house pattern).

import { describe, it, expect } from 'vitest'
import { FAR_CULL, type TankPose } from '../../src/core/camera'
import { MAX_SPEED, MAX_TURN_RATE, PLAYER_RADIUS, isBlocked } from '../../src/core/movement'
import { SHELL_SPEED, SHELL_MAX_RANGE } from '../../src/core/firing'
import { SCORES } from '../../src/core/scoring'
import { deriveRadar, type RadarContact } from '../../src/core/radar'

type HostilePhase = 'alive' | 'exploding'
interface Hostile {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly kind: string
  readonly phase: HostilePhase
  readonly phaseAge: number
}
interface Shell {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly range: number
}
interface EnemyState {
  readonly hostile: Hostile
  readonly shell: Shell | null
  readonly rng: number
}
interface EnemyStepResult {
  readonly state: EnemyState
  readonly scoreAward: number
  readonly playerShellConsumed: boolean
  readonly playerHit: boolean
}
interface EnemiesModule {
  TANK_HIT_RADIUS: number
  EXPLOSION_DURATION: number
  initEnemies(seed: number, player: TankPose): EnemyState
  stepEnemies(
    state: EnemyState,
    player: TankPose,
    playerShell: Shell | null,
    dt: number,
  ): EnemyStepResult
  radarContacts(state: EnemyState): readonly RadarContact[]
}

async function loadEnemies(): Promise<EnemiesModule> {
  let m: Partial<EnemiesModule> = {}
  try {
    // RED contract load: enemies.ts is not built yet (house pattern).
    m = (await import('../../src/core/enemies')) as unknown as Partial<EnemiesModule>
  } catch {
    // module not built yet — the assertions below report the precise miss
  }
  if (typeof m.initEnemies !== 'function') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export initEnemies(seed, player): EnemyState',
    )
  }
  if (typeof m.stepEnemies !== 'function') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export stepEnemies(state, player, playerShell, dt): EnemyStepResult',
    )
  }
  if (typeof m.radarContacts !== 'function') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export radarContacts(state): readonly RadarContact[]',
    )
  }
  if (typeof m.TANK_HIT_RADIUS !== 'number') {
    throw new Error('CONTRACT: src/core/enemies.ts must export TANK_HIT_RADIUS: number')
  }
  if (typeof m.EXPLOSION_DURATION !== 'number') {
    throw new Error('CONTRACT: src/core/enemies.ts must export EXPLOSION_DURATION: number')
  }
  return m as EnemiesModule
}

const DT = 1 / 60
const TAU = Math.PI * 2

/** Fold an angle onto (−π, π]. */
function wrap(a: number): number {
  let r = a % TAU
  if (r > Math.PI) r -= TAU
  if (r <= -Math.PI) r += TAU
  return r
}

/** Bearing from a to b in the camera.ts [sin, cos] convention. */
function bearing(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.atan2(b.x - a.x, b.z - a.z)
}

function dist(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

// The obstacle field lives within ~46k of the world origin (obstacles.ts) —
// everything at 200k+ is open plain (same trick as firing.test.ts's OPEN).
const OPEN: TankPose = { x: 200_000, z: 200_000, heading: 0 }
// A player parked in the middle of the 21-obstacle field — the dangerous
// spawn neighbourhood for the anti-spawn-in-obstacle pin.
const ORIGIN: TankPose = { x: 0, z: 0, heading: 0 }

/** Fabricate an alive slow tank (tests may build states — pure data). */
function tank(x: number, z: number, heading: number): Hostile {
  return { x, z, heading, kind: 'tank', phase: 'alive', phaseAge: 0 }
}

describe('initEnemies — the "always one hostile" spawn rule (findings §2)', () => {
  it('spawns exactly one ALIVE slow tank with no enemy shell in flight', async () => {
    const { initEnemies } = await loadEnemies()
    const state = initEnemies(1234, OPEN)
    expect(state.hostile, 'the hostile slot is never empty').toBeTruthy()
    expect(state.hostile.phase).toBe('alive')
    expect(state.hostile.kind, 'bz1-7 roster is the slow tank only (bz1-8 widens)').toBe('tank')
    expect(state.hostile.phaseAge).toBe(0)
    expect(state.shell, 'the enemy holds its fire at birth').toBeNull()
    expect(Number.isFinite(state.hostile.x)).toBe(true)
    expect(Number.isFinite(state.hostile.z)).toBe(true)
    expect(Number.isFinite(state.hostile.heading)).toBe(true)
  })

  it('never spawns inside an obstacle footprint — the ROM bug we deliberately fix', async () => {
    const { initEnemies } = await loadEnemies()
    // The ROM's missing spawn-collision check is a known defect the epic
    // descopes ("spawn-in-obstacle ROM bug not replicated"). Drivable ground =
    // movement.isBlocked false — checked across many seeds with the player
    // parked in the middle of the obstacle field, where a naive spawner would
    // land inside a footprint sooner or later.
    for (let seed = 0; seed < 100; seed++) {
      const { hostile } = initEnemies(seed, ORIGIN)
      expect(
        isBlocked(hostile.x, hostile.z),
        `seed ${seed}: spawned inside an obstacle footprint at (${hostile.x}, ${hostile.z})`,
      ).toBe(false)
    }
  })

  it('spawns clear of the player but within sight — an entrance, not a teleport-on-top', async () => {
    const { initEnemies, TANK_HIT_RADIUS } = await loadEnemies()
    for (const player of [OPEN, ORIGIN]) {
      for (let seed = 0; seed < 32; seed++) {
        const { hostile } = initEnemies(seed, player)
        const d = dist(hostile, player)
        // Not touching at birth (no free kill either way)…
        expect(d, `seed ${seed}: spawned on top of the player`).toBeGreaterThan(
          PLAYER_RADIUS + TANK_HIT_RADIUS,
        )
        // …and it APPEARS (findings §5 "tanks will appear in front of the
        // player") — inside the far cull, not beyond sight. Exact spawn
        // distances are a deferred quarry decode (bz1-12 true-up).
        expect(d, `seed ${seed}: spawned beyond the far plane`).toBeLessThanOrEqual(FAR_CULL)
      }
    }
  })

  it('consults the seeded RNG — different seeds vary the spawn placement', async () => {
    const { initEnemies } = await loadEnemies()
    const spots = new Set<string>()
    for (let seed = 0; seed < 32; seed++) {
      const { hostile } = initEnemies(seed, OPEN)
      spots.add(`${Math.round(hostile.x)},${Math.round(hostile.z)}`)
    }
    // 32 seeds must not funnel into fewer than a handful of spots — proof the
    // PRNG is actually consulted (not a hard-coded spawn point).
    expect(spots.size).toBeGreaterThanOrEqual(4)
  })

  it('is deterministic — the same seed spawns the identical state', async () => {
    const { initEnemies } = await loadEnemies()
    expect(initEnemies(0xdead, OPEN)).toEqual(initEnemies(0xdead, OPEN))
  })
})

describe('hit + explosion + 1000 pts — the hostile lifecycle (findings §1, §2)', () => {
  it('a player shell inside TANK_HIT_RADIUS kills: consumed, exploding, SCORES.slowTank awarded', async () => {
    const { stepEnemies } = await loadEnemies()
    const h = tank(210_000, 200_000, 0)
    const state: EnemyState = { hostile: h, shell: null, rng: 42 }
    const playerShell: Shell = { x: h.x, z: h.z, heading: -Math.PI / 2, range: 10_000 }
    const r = stepEnemies(state, OPEN, playerShell, DT)
    expect(r.playerShellConsumed, 'the shell struck the tank and is spent').toBe(true)
    expect(r.scoreAward, 'slow tank = 1000 pts — ROM kill value (findings §1)').toBe(
      SCORES.slowTank,
    )
    expect(r.scoreAward).toBe(1000) // the ROM constant, pinned both ways
    expect(r.state.hostile.phase, 'the tank explodes — the slot is NOT emptied').toBe('exploding')
    // It explodes where it died (within one step of drift), not somewhere new.
    expect(dist(r.state.hostile, h)).toBeLessThan(200)
  })

  it('a near miss just outside the radius does not kill', async () => {
    const { stepEnemies, TANK_HIT_RADIUS } = await loadEnemies()
    const h = tank(210_000, 200_000, 0)
    const state: EnemyState = { hostile: h, shell: null, rng: 42 }
    // Abeam at 3× the kill radius, flying AWAY — no swept path ever closes in.
    const playerShell: Shell = {
      x: h.x + 3 * TANK_HIT_RADIUS,
      z: h.z,
      heading: Math.PI / 2,
      range: 5_000,
    }
    const r = stepEnemies(state, OPEN, playerShell, DT)
    expect(r.playerShellConsumed).toBe(false)
    expect(r.scoreAward).toBe(0)
    expect(r.state.hostile.phase).toBe('alive')
  })

  it('a hit within the radius (not dead centre) still kills', async () => {
    const { stepEnemies, TANK_HIT_RADIUS } = await loadEnemies()
    const h = tank(210_000, 200_000, 0)
    const state: EnemyState = { hostile: h, shell: null, rng: 42 }
    const playerShell: Shell = {
      x: h.x + 0.9 * TANK_HIT_RADIUS,
      z: h.z,
      heading: 0,
      range: 5_000,
    }
    const r = stepEnemies(state, OPEN, playerShell, DT)
    expect(r.playerShellConsumed).toBe(true)
    expect(r.scoreAward).toBe(SCORES.slowTank)
    expect(r.state.hostile.phase).toBe('exploding')
  })

  it('the battlefield is never empty: explosion runs its course (bz3-5 debris physics), then the replacement spawns with NO gap', async () => {
    const { stepEnemies } = await loadEnemies()
    const h = tank(210_000, 200_000, 0)
    // Kill it…
    const killShell: Shell = { x: h.x, z: h.z, heading: 0, range: 1_000 }
    let r = stepEnemies({ hostile: h, shell: null, rng: 7 }, OPEN, killShell, DT)
    expect(r.state.hostile.phase).toBe('exploding')
    // …then walk the explosion out. At EVERY step the hostile slot is occupied
    // ("always one hostile... either alive or exploding", findings §2) and the
    // kill is never re-awarded. bz3-5 / F-008: the blast is now the ROM's
    // 6-piece gravity debris sim — physics-driven, ~2.8-3.0 s (the tallest
    // IZVEL=88 piece governs) — roughly double the old fixed 1.5 s timer this
    // story replaced; the cap below is generous slack over that band
    // (debris.test.ts pins the same 2.5-3.4 s band on the engine directly).
    const maxSteps = Math.ceil(3.6 / DT) + 3
    let explodingSteps = 1 // the kill step left it exploding
    let steps = 0
    while (r.state.hostile.phase === 'exploding' && steps < maxSteps) {
      r = stepEnemies(r.state, OPEN, null, DT)
      steps++
      expect(r.state.hostile, `step ${steps}: the hostile slot went empty`).toBeTruthy()
      expect(r.scoreAward, `step ${steps}: the kill was awarded twice`).toBe(0)
      if (r.state.hostile.phase === 'exploding') explodingSteps++
    }
    // "There is no delay between one leaving and the next appearing" — the
    // step that retires the blast delivers a live replacement in the SAME
    // returned state, never an empty interim.
    expect(r.state.hostile.phase, 'a replacement tank is already alive').toBe('alive')
    // bz3-5: the blast now lasts the ROM's physics-driven ~2.8-3.0 s, not the
    // old fixed 1.5 s timer (debris.test.ts's own 2.5-3.4 s band).
    const explosionSeconds = explodingSteps * DT
    expect(explosionSeconds, `explosion lasted ${explosionSeconds.toFixed(3)}s`).toBeGreaterThan(2.2)
    expect(explosionSeconds).toBeLessThanOrEqual(3.4)
    // The replacement is a FRESH slow tank on legal ground.
    expect(r.state.hostile.kind).toBe('tank')
    expect(r.state.hostile.phaseAge).toBeLessThanOrEqual(1.5 * DT)
    expect(isBlocked(r.state.hostile.x, r.state.hostile.z)).toBe(false)
    expect(dist(r.state.hostile, OPEN)).toBeGreaterThan(PLAYER_RADIUS)
    expect(dist(r.state.hostile, OPEN)).toBeLessThanOrEqual(FAR_CULL)
  })

  it('shooting the debris is worth nothing — an exploding tank cannot be re-killed', async () => {
    const { stepEnemies } = await loadEnemies()
    const exploding: Hostile = {
      x: 210_000,
      z: 200_000,
      heading: 0,
      kind: 'tank',
      phase: 'exploding',
      phaseAge: 0,
    }
    const state: EnemyState = { hostile: exploding, shell: null, rng: 42 }
    const playerShell: Shell = { x: exploding.x, z: exploding.z, heading: 0, range: 1_000 }
    const r = stepEnemies(state, OPEN, playerShell, DT)
    expect(r.scoreAward, 'no double score off a corpse').toBe(0)
    expect(r.playerShellConsumed, 'the shell flies on through the blast').toBe(false)
  })

  it('phaseAge accumulates dt — the hook bz1-10\'s ~17s aggression ramp reads (findings §5)', async () => {
    const { stepEnemies } = await loadEnemies()
    const state: EnemyState = { hostile: tank(225_000, 200_000, 0), shell: null, rng: 3 }
    const r1 = stepEnemies(state, OPEN, null, DT)
    const r2 = stepEnemies(r1.state, OPEN, null, DT)
    expect(r1.state.hostile.phaseAge).toBeCloseTo(DT, 9)
    expect(r2.state.hostile.phaseAge).toBeCloseTo(2 * DT, 9)
  })

  it('sanity-pins the lifecycle constants', async () => {
    const { TANK_HIT_RADIUS, EXPLOSION_DURATION } = await loadEnemies()
    // ≥ 256: one 60 Hz shell frame-step (SHELL_SPEED/60) — point sampling
    // cannot tunnel past the tank at the standing cadence. ≤ 4096: it is a
    // tank, not a barn. Exact ROM diameter table ($6139) is a deferred decode.
    expect(TANK_HIT_RADIUS).toBeGreaterThanOrEqual(SHELL_SPEED / 60)
    expect(TANK_HIT_RADIUS).toBeLessThanOrEqual(4096)
    expect(EXPLOSION_DURATION).toBeGreaterThan(0)
    expect(EXPLOSION_DURATION).toBeLessThanOrEqual(10)
  })
})

describe('AI — approach (the tank closes on the player)', () => {
  it('engages — closes into weapons range over open ground and stays alive doing it', async () => {
    const { stepEnemies } = await loadEnemies()
    // 25k out on the empty plain, facing the wrong way — it must turn in and
    // drive. bz3-1: the enemy slowed to ROM speed with the 15.625 Hz timebase
    // correction (it derives from the shared MAX_SPEED/MAX_TURN_RATE), so the
    // sim-time budget is scaled by the 60/15.625 = 3.84 ratio this story corrects
    // (10 s → ~40 s), still generous for the now-ROM-speed approach.
    let state: EnemyState = { hostile: tank(225_000, 200_000, 0), shell: null, rng: 11 }
    const d0 = dist(state.hostile, OPEN)
    let minReached = d0
    for (let i = 0; i < 2400; i++) {
      const r = stepEnemies(state, OPEN, null, DT)
      expect(r.state.hostile.phase, 'nothing kills the tank in this run').toBe('alive')
      state = r.state
      minReached = Math.min(minReached, dist(state.hostile, OPEN))
    }
    // bz2-10: the tank now JOCKEYS (charge in → break off to flank → re-approach)
    // rather than driving a straight beeline, so its END position need not be
    // net-closer — a flank leg can leave it back out at the ring. What must hold
    // is that it ENGAGES: at some point it closed from 25k into weapons range.
    // (min distance over the run, not net displacement — the beeline-era check.)
    expect(minReached, 'the tank must close into engagement range at least once').toBeLessThan(d0 - 10_000)
  })

  it('moves like a tank, not a teleporter — per-step displacement and turn are bounded', async () => {
    const { stepEnemies } = await loadEnemies()
    let state: EnemyState = { hostile: tank(225_000, 200_000, 0), shell: null, rng: 11 }
    for (let i = 0; i < 300; i++) {
      const r = stepEnemies(state, OPEN, null, DT)
      const prev = state.hostile
      const cur = r.state.hostile
      // The slow tank obeys the same physics the player does (dual-tread
      // kinematics, bz1-4): its exact ROM speed is undecoded, but nothing on
      // treads outruns MAX_SPEED or out-turns MAX_TURN_RATE.
      expect(dist(prev, cur), `step ${i}: teleported`).toBeLessThanOrEqual(
        MAX_SPEED * DT * 1.01,
      )
      expect(Math.abs(wrap(cur.heading - prev.heading)), `step ${i}: snap-turned`,
      ).toBeLessThanOrEqual(MAX_TURN_RATE * DT * 1.01)
      state = r.state
    }
  })

  it('never ends a step inside an obstacle footprint (obstacles block enemies too)', async () => {
    const { stepEnemies } = await loadEnemies()
    // Player at the origin; hostile at (16384, 16384) aimed straight down the
    // line — obstacle #0 (8192, 8192) sits dead on it. However the AI handles
    // the block (stall, steer around), it must never END a step overlapping.
    const h = tank(16_384, 16_384, bearing({ x: 16_384, z: 16_384 }, ORIGIN))
    let state: EnemyState = { hostile: h, shell: null, rng: 5 }
    for (let i = 0; i < 720; i++) {
      const r = stepEnemies(state, ORIGIN, null, DT)
      if (r.state.hostile.phase === 'alive') {
        expect(
          isBlocked(r.state.hostile.x, r.state.hostile.z),
          `step ${i}: the tank ended a step inside a footprint`,
        ).toBe(false)
      }
      state = r.state
    }
  })
})

describe('AI — aim then fire (findings §5 baseline; full curve is bz1-10)', () => {
  it('turns onto the player and fires a shell roughly down the bearing', async () => {
    const { stepEnemies } = await loadEnemies()
    // 12k out, facing EXACTLY away (heading error π). It must swing around and
    // take the shot. bz3-1: the enemy turn rate fell to ROM speed with the
    // 15.625 Hz timebase correction (it derives from the shared MAX_TURN_RATE),
    // so a π turn-around plus a maneuvering approach needs more sim time. Scale
    // the budget by the 60/15.625 = 3.84 ratio this story corrects (30 s → 120 s).
    let state: EnemyState = { hostile: tank(212_000, 200_000, Math.PI / 2), shell: null, rng: 9 }
    let fired: { shell: Shell; hostile: Hostile } | null = null
    for (let i = 0; i < 7200 && fired === null; i++) {
      const r = stepEnemies(state, OPEN, null, DT)
      if (r.state.shell !== null) {
        fired = { shell: r.state.shell, hostile: r.state.hostile }
      }
      state = r.state
    }
    expect(fired, 'the tank eventually took a shot').not.toBeNull()
    const { shell, hostile } = fired as { shell: Shell; hostile: Hostile }
    // ROM: the shell's "velocity matches the facing of the firing unit"
    // (dis65 offset 2674) — it leaves along the tank's own barrel…
    expect(Math.abs(wrap(shell.heading - hostile.heading))).toBeLessThan(0.05)
    // …and the tank only pulls the trigger once roughly aimed: the shot goes
    // broadly AT the player, not off into the void.
    expect(Math.abs(wrap(shell.heading - bearing(hostile, OPEN)))).toBeLessThanOrEqual(Math.PI / 4)
    // The shell leaves FROM the tank, fresh out of the barrel.
    expect(dist(shell, hostile)).toBeLessThanOrEqual(1_500)
    expect(shell.range).toBeLessThanOrEqual(SHELL_SPEED * DT + 1e-6)
  })

  it('holds to ONE enemy shell in flight — a live shell advances, it is never re-spawned', async () => {
    const { stepEnemies } = await loadEnemies()
    // Aimed dead at the player, shell already out: the tank must NOT reset its
    // projectile (ROM slot #1 is single-occupancy, like the player's slot #0).
    const h = tank(212_000, 200_000, bearing({ x: 212_000, z: 200_000 }, OPEN))
    const live: Shell = { x: 211_000, z: 200_000, heading: -Math.PI / 2, range: 1_000 }
    const r = stepEnemies({ hostile: h, shell: live, rng: 13 }, OPEN, null, DT)
    expect(r.state.shell, 'the shell is still in flight').not.toBeNull()
    const s = r.state.shell as Shell
    expect(s.range, 'the SAME shell advanced — not a fresh one at range 0').toBeGreaterThan(
      live.range,
    )
    expect(s.heading, 'a shell never curves in flight').toBeCloseTo(live.heading, 9)
  })

  it('flies the enemy shell at SHELL_SPEED along its fixed heading (shared ROM projectile system)', async () => {
    const { stepEnemies } = await loadEnemies()
    // Park the firer far away and grossly unaimed so the only actor is the
    // in-flight shell (the aim-then-fire pin above keeps an unaimed tank from
    // shooting).
    const h = tank(240_000, 240_000, 0)
    const live: Shell = { x: 200_000, z: 190_000, heading: Math.PI / 4, range: 0 }
    const r = stepEnemies({ hostile: h, shell: live, rng: 13 }, OPEN, null, DT)
    const s = r.state.shell as Shell
    expect(s).not.toBeNull()
    const step = SHELL_SPEED * DT
    expect(s.x).toBeCloseTo(live.x + Math.sin(live.heading) * step, 6)
    expect(s.z).toBeCloseTo(live.z + Math.cos(live.heading) * step, 6)
    expect(s.range).toBeCloseTo(step, 6)
  })

  it('expires the enemy shell at SHELL_MAX_RANGE like any ROM projectile', async () => {
    const { stepEnemies } = await loadEnemies()
    const h = tank(240_000, 240_000, 0)
    const nearlySpent: Shell = {
      x: 200_000,
      z: 190_000,
      heading: Math.PI / 4,
      range: SHELL_MAX_RANGE - 100,
    }
    const r = stepEnemies({ hostile: h, shell: nearlySpent, rng: 13 }, OPEN, null, DT)
    expect(r.state.shell, 'the shell died at the range wall').toBeNull()
    expect(r.playerHit).toBe(false)
  })

  it('obstacles block enemy shells — swept, no tunnelling (ROM 4 sub-steps/frame)', async () => {
    const { stepEnemies } = await loadEnemies()
    const h = tank(240_000, 240_000, 0)
    // 2000 units short of obstacle #0 (8192, 8192), firing straight at it; one
    // big 0.5s step advances 7680 — clean over the footprint if the check only
    // sampled the endpoint. Null here can only mean the swept check saw it.
    const inbound: Shell = { x: 8_192, z: 6_192, heading: 0, range: 0 }
    const r = stepEnemies({ hostile: h, shell: inbound, rng: 13 }, OPEN, null, 0.5)
    expect(r.state.shell, 'the shell struck the obstacle mid-path').toBeNull()
    expect(r.playerHit).toBe(false)
    expect(r.scoreAward).toBe(0)
  })

  it('an exploding tank holds its fire', async () => {
    const { stepEnemies } = await loadEnemies()
    const dying: Hostile = {
      x: 212_000,
      z: 200_000,
      heading: bearing({ x: 212_000, z: 200_000 }, OPEN),
      kind: 'tank',
      phase: 'exploding',
      phaseAge: 0,
    }
    const r = stepEnemies({ hostile: dying, shell: null, rng: 13 }, OPEN, null, DT)
    expect(r.state.shell, 'debris does not shoot back').toBeNull()
  })
})

describe('the enemy shell hits the player (the duel is real)', () => {
  it('a shell crossing the player mid-step registers the hit — swept, not endpoint-sampled', async () => {
    const { stepEnemies } = await loadEnemies()
    const h = tank(240_000, 240_000, 0)
    // 5000 short of the player, firing straight through them; the step
    // advances 10000, so the ENDPOINT lands 5000 past — outside any sane hit
    // radius. Only a swept test sees the crossing. (ROM: "check for
    // collisions after each step", dis65 offset 6636.)
    const inbound: Shell = { x: OPEN.x, z: OPEN.z - 5_000, heading: 0, range: 0 }
    const bigDt = 10_000 / SHELL_SPEED
    const r = stepEnemies({ hostile: h, shell: inbound, rng: 13 }, OPEN, null, bigDt)
    expect(r.playerHit, 'the shell passed through the player — that is a hit').toBe(true)
    expect(r.state.shell, 'a shell that hits is spent').toBeNull()
  })

  it('a clean miss abeam of the player registers nothing', async () => {
    const { stepEnemies } = await loadEnemies()
    const h = tank(240_000, 240_000, 0)
    // Same run geometry, offset 3 player-radii abeam — flies straight past.
    const abeam: Shell = { x: OPEN.x + 3 * PLAYER_RADIUS, z: OPEN.z - 5_000, heading: 0, range: 0 }
    const bigDt = 10_000 / SHELL_SPEED
    const r = stepEnemies({ hostile: h, shell: abeam, rng: 13 }, OPEN, null, bigDt)
    expect(r.playerHit).toBe(false)
    expect(r.state.shell, 'the shell flies on').not.toBeNull()
  })
})

describe('radar wiring — the hostile paints, shells never do (findings §7)', () => {
  it('an alive hostile is exactly one kind-\'tank\' contact, even with a shell in flight', async () => {
    const { radarContacts } = await loadEnemies()
    const h = tank(210_000, 203_000, 1.2)
    const live: Shell = { x: 205_000, z: 201_000, heading: -Math.PI / 2, range: 4_000 }
    const contacts = radarContacts({ hostile: h, shell: live, rng: 1 })
    expect(contacts).toHaveLength(1)
    expect(contacts[0].kind).toBe('tank')
    expect(contacts[0].x).toBe(h.x)
    expect(contacts[0].z).toBe(h.z)
  })

  it('feeds deriveRadar a paintable blip at the right bearing and range', async () => {
    const { radarContacts } = await loadEnemies()
    const pose: TankPose = { x: 200_000, z: 200_000, heading: 0.3 }
    const h = tank(210_000, 203_000, 0)
    const blips = deriveRadar(pose, radarContacts({ hostile: h, shell: null, rng: 1 }))
    expect(blips).toHaveLength(1)
    expect(blips[0].range).toBeCloseTo(Math.hypot(10_000, 3_000), 6)
    expect(blips[0].bearing).toBeCloseTo(wrap(Math.atan2(10_000, 3_000) - 0.3), 6)
  })
})

describe('determinism (standing epic AC)', () => {
  it('replays a full kill → explosion → respawn script to an identical state trail', async () => {
    const { initEnemies, stepEnemies } = await loadEnemies()
    const run = (): unknown[] => {
      let state = initEnemies(99, OPEN)
      const trail: unknown[] = [state]
      // Phase 1: 90 undisturbed steps of AI.
      for (let i = 0; i < 90; i++) {
        const r = stepEnemies(state, OPEN, null, DT)
        state = r.state
        trail.push(r)
      }
      // Phase 2: assassinate the hostile wherever it stands…
      const killShell: Shell = { x: state.hostile.x, z: state.hostile.z, heading: 0, range: 1 }
      const kill = stepEnemies(state, OPEN, killShell, DT)
      state = kill.state
      trail.push(kill)
      // …and walk far enough to cross the explosion AND the respawn.
      for (let i = 0; i < 700; i++) {
        const r = stepEnemies(state, OPEN, null, DT)
        state = r.state
        trail.push(r)
      }
      return trail
    }
    expect(run()).toEqual(run())
  })

  it('returns finite state for extreme (but finite) dt — no NaN/Infinity blow-up', async () => {
    const { initEnemies, stepEnemies } = await loadEnemies()
    const state = initEnemies(3, OPEN)
    const r = stepEnemies(state, OPEN, null, 1e4)
    expect(r.state.hostile, 'the hostile slot survived the jolt').toBeTruthy()
    expect(Number.isFinite(r.state.hostile.x)).toBe(true)
    expect(Number.isFinite(r.state.hostile.z)).toBe(true)
    expect(Number.isFinite(r.state.hostile.heading)).toBe(true)
    expect(Number.isFinite(r.state.hostile.phaseAge)).toBe(true)
    if (r.state.shell !== null) {
      expect(Number.isFinite(r.state.shell.x)).toBe(true)
      expect(Number.isFinite(r.state.shell.z)).toBe(true)
      expect(Number.isFinite(r.state.shell.range)).toBe(true)
    }
  })
})
