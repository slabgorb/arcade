// tests/core/enemies-roster.test.ts
//
// Story bz1-8 — RED phase (Furiosa / TEA). The roster widens: guided missile
// (2000 pts), super tank (3000 pts), and the score-threshold introduction —
// all pure core/.
//
// CONTRACT pinned for Dev (GREEN) — widens bz1-7's enemies.ts contract:
//   src/core/enemies.ts
//     type HostileKind = 'tank' | 'super-tank' | 'missile'
//         — the literal union bz1-7 built to widen ("bz1-8 widens this union",
//           enemies.ts:54). Spellings match radar.ts's RadarContactKind so
//           radarContacts maps kind→kind with no translation table.
//     Hostile.kind: HostileKind
//     EnemyState.missilesLaunched: number
//         — the ROM's missile-launch counter (game start writes $ff = "no
//           missiles launched yet", dis65 line 1605; we model "none yet" as 0).
//           Increments when a missile SPAWNS (dis65 6690 "increment missile
//           counter"); tank spawns leave it alone. Drives GetTankType.
//     initEnemies(seed, player) — unchanged shape; missilesLaunched starts 0
//           and the first hostile is still the slow tank (score 0 < threshold).
//     stepEnemies(state, player, playerShell, dt, score = 0): EnemyStepResult
//         — NEW 5th parameter: the player's live score at this step, feeding
//           the ROM's spawn selection (CreateNewEnemyUnit, dis65 6590-6617)
//           whenever this step spawns a replacement. Default 0 keeps every
//           bz1-7 call site meaningful (score-0 era: tanks only).
//     SUPER_TANK_AFTER_MISSILES = 6 — CORRECTED by bz3-3/E-010 (was pinned 5
//           here from a dis65 secondary-source read). Primary source: TR7CHK
//           `LDA NOR2D3 / CMP I,5` (carry set = TR7, BZONE.MAC:3704-3707).
//           NOR2D3 is the missile count MINUS ONE (game-start `LDA I,-1`,
//           :1175; "SET TO 0 FOR FIRST", :3773), so NOR2D3 >= 5 first holds
//           at the 6th missile launched — one later than our 0-based counter
//           originally fired. See docs/audit/findings/pair-enemy-ai.json E-010.
//     MISSILE_CLOSE_RANGE = 0x0800 (2048) — ROM-EXACT (dis65 5787 "use
//           distance threshold of $0800 (very close)"): inside it the missile
//           stops weaving and homes ("head at player", 5794).
//     MISSILE_ABANDON_RANGE — BAND: ≥ FAR_CULL, finite. "Player out of range
//           of enemy. If it's a missile, we kill it and make a new unit. If
//           it's a tank we keep going." (dis65 7076; also 6889 "if a missile
//           misses the player and gets too far away, this spawns a new one").
//           The exact ROM distance is an undecoded quarry byte — band now,
//           true-up later (house deferral).
//
// ROM facts driving these tests:
//   §1 (findings doc): missile = 2000 pts, super tank = 3000 pts (byte-
//       confirmed kill-score-add immediates, offsets ~4097/~4106).
//   §9: MISSILE_INTRO_THRESHOLD = 10000 (DIP factory default, pinned bz1-2) —
//       "When your score reaches a threshold... missiles start to appear"
//       ($69be). Below it the spawner NEVER makes a missile (dis65 6611
//       "score too low, create a tank"); at/above it missiles join a random
//       rotation (6613 "get a random number..." — draw from the carried seed).
//   GetTankType (dis65 6581): slow tank vs super tank is a function of the
//       missile-launch count alone — score picks tank-vs-missile, the counter
//       picks WHICH tank.
//   Missile flight (dis65 5144/5753-5807): first missile ever "flies straight
//       in" ("be nice", 5756); later ones swerve left/right on a ~0.5 s
//       alternation ("set for 0.5 sec, clear for 0.5 sec... whether we swerve
//       left or right", 5802-5803) until MISSILE_CLOSE_RANGE, then home. The
//       swerve AMPLITUDE is undecoded — these tests pin a loose behavioral
//       band (visibly crosses both sides of the bearing; still closes net
//       distance), not the exact curve. Missiles kill by CONTACT (collision
//       check dis65 6491; missiles own no projectile) — the shell system
//       remains tank-only.
//   §7: "Enemy tanks and missiles appear on radar" — missile and super-tank
//       contacts paint; the exploding slot still paints nothing.
//   Speeds: the missile/super-tank velocity constants are undecoded quarry
//       bytes. Pinned as RELATIVE bands: super tank out-closes the slow tank;
//       the missile out-closes both. bz1-12's playtest trues up absolutes.
//
// Carried debts from bz1-7's review (queued for "bz1-8's roster rework"):
//   dt = 0 must be a spatial no-op for stepEnemies (fire-on-dt-0 stays legal —
//   house semantics), and the mutual-kill frame (player shell kills the
//   hostile in the same step the enemy shell reaches the player) must land
//   both events in ONE result.
//
// Convention (fixed by src/core/camera.ts, do NOT re-derive): heading 0 faces
// +Z, increasing heading turns CCW toward +X; bearing(a→b) =
// atan2(b.x−a.x, b.z−a.z).
//
// RED: the widened exports don't exist yet; each test loads the module
// defensively so a missing export fails as a clean contract miss (house
// pattern, bz1-7 precedent).

import { describe, it, expect } from 'vitest'
import { FAR_CULL, type TankPose } from '../../src/core/camera'
import { PLAYER_RADIUS } from '../../src/core/movement'
import { SCORES, MISSILE_INTRO_THRESHOLD } from '../../src/core/scoring'
import { RADAR_INVISIBLE_KINDS } from '../../src/core/radar'
import type { RadarContact } from '../../src/core/radar'

type HostileKind = 'tank' | 'super-tank' | 'missile'
type HostilePhase = 'alive' | 'exploding'
interface Hostile {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly kind: HostileKind
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
  readonly missilesLaunched: number
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
  SUPER_TANK_AFTER_MISSILES: number
  MISSILE_CLOSE_RANGE: number
  MISSILE_ABANDON_RANGE: number
  MISSILE_SPAWN_CHANCE: number
  initEnemies(seed: number, player: TankPose): EnemyState
  stepEnemies(
    state: EnemyState,
    player: TankPose,
    playerShell: Shell | null,
    dt: number,
    score?: number,
  ): EnemyStepResult
  radarContacts(state: EnemyState): readonly RadarContact[]
}

async function loadEnemies(): Promise<EnemiesModule> {
  let m: Partial<EnemiesModule> = {}
  try {
    // RED contract load: the widened exports are not built yet (house pattern).
    m = (await import('../../src/core/enemies')) as unknown as Partial<EnemiesModule>
  } catch {
    // module not importable — the assertions below report the precise miss
  }
  if (typeof m.initEnemies !== 'function' || typeof m.stepEnemies !== 'function') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export initEnemies(seed, player) and stepEnemies(state, player, playerShell, dt, score?)',
    )
  }
  if (typeof m.radarContacts !== 'function') {
    throw new Error('CONTRACT: src/core/enemies.ts must export radarContacts(state)')
  }
  if (typeof m.SUPER_TANK_AFTER_MISSILES !== 'number') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export SUPER_TANK_AFTER_MISSILES (ROM GetTankType, dis65 6587)',
    )
  }
  if (typeof m.MISSILE_CLOSE_RANGE !== 'number') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export MISSILE_CLOSE_RANGE (dis65 5787, $0800)',
    )
  }
  if (typeof m.MISSILE_ABANDON_RANGE !== 'number') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export MISSILE_ABANDON_RANGE (dis65 7076 out-of-range scrap)',
    )
  }
  if (typeof m.MISSILE_SPAWN_CHANCE !== 'number') {
    throw new Error(
      'CONTRACT: src/core/enemies.ts must export MISSILE_SPAWN_CHANCE (BZONE.MAC:3733-3741, fair coin)',
    )
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

// Open plain, far from the obstacle field (house trick — obstacles live
// within ~46k of the world origin).
const OPEN: TankPose = { x: 200_000, z: 200_000, heading: 0 }

/** A blast that has fully burned down — the next step MUST spawn the replacement. */
function expiredBlast(rng: number, missilesLaunched: number): EnemyState {
  return {
    // phaseAge 99 ≥ any lawful EXPLOSION_DURATION (bz1-7 pins it ≤ 10).
    hostile: { x: OPEN.x + 20_000, z: OPEN.z, heading: 0, kind: 'tank', phase: 'exploding', phaseAge: 99 },
    shell: null,
    rng,
    missilesLaunched,
  }
}

/** Step one replacement spawn out of an expired blast at the given score. */
function respawn(
  mod: EnemiesModule,
  rng: number,
  missilesLaunched: number,
  score: number,
): EnemyStepResult {
  return mod.stepEnemies(expiredBlast(rng, missilesLaunched), OPEN, null, DT, score)
}

/**
 * Drive an alive hostile for up to `steps` sim steps against a parked player.
 * Stops early on contact (playerHit) or death. Returns the observed trail.
 */
function run(
  mod: EnemiesModule,
  start: EnemyState,
  steps: number,
  score = 0,
): {
  states: EnemyState[]
  hits: boolean[]
  sawEnemyShell: boolean
  contactStep: number
} {
  const states: EnemyState[] = [start]
  const hits: boolean[] = []
  let sawEnemyShell = false
  let contactStep = -1
  let s = start
  for (let i = 0; i < steps; i++) {
    const r = mod.stepEnemies(s, OPEN, null, DT, score)
    s = r.state
    states.push(s)
    hits.push(r.playerHit)
    if (s.shell !== null) sawEnemyShell = true
    if (r.playerHit && contactStep < 0) contactStep = i
    if (r.playerHit || s.hostile.phase !== 'alive') break
  }
  return { states, hits, sawEnemyShell, contactStep }
}

describe('bz1-8 contract — widened exports and init state', () => {
  it('exports the ROM-exact selection constants', async () => {
    const m = await loadEnemies()
    // TR7CHK: LDA NOR2D3 / CMP I,5 (BZONE.MAC:3704-3707) fires at NOR2D3>=5;
    // NOR2D3 = missiles launched - 1 (:1175, :3773), so the boundary event is
    // the 6th missile launched (bz3-3/E-010 corrects bz1-8's pin of 5).
    expect(m.SUPER_TANK_AFTER_MISSILES).toBe(6)
    // "use distance threshold of $0800 (very close)" (dis65 5787) — $0800 exact.
    expect(m.MISSILE_CLOSE_RANGE).toBe(0x0800)
    // Undecoded quarry byte — BAND: a fresh spawn (≤ FAR_CULL by bz1-7's own
    // pin) must never be scrapped at birth, and the wall must exist at all.
    expect(Number.isFinite(m.MISSILE_ABANDON_RANGE)).toBe(true)
    expect(m.MISSILE_ABANDON_RANGE).toBeGreaterThanOrEqual(FAR_CULL)
    // bz3-3/R-008: LDY PRAND / EOR OLDRND / LSR / BCC TANKCK (BZONE.MAC:3733-
    // 3738) is a 1-bit coin — exactly 50/50, not the old provisional 40%.
    expect(m.MISSILE_SPAWN_CHANCE).toBe(0.5)
  })

  it('initEnemies starts the launch counter at zero ("$ff = no missiles launched yet", modeled as 0)', async () => {
    const m = await loadEnemies()
    const state = m.initEnemies(1234, OPEN)
    expect(state.missilesLaunched).toBe(0)
    // Game start is score 0 — below any DIP threshold: the first hostile is
    // still the slow tank (bz1-7's init pin remains true in the missile era).
    expect(state.hostile.kind).toBe('tank')
  })
})

describe('score-threshold introduction — CreateNewEnemyUnit (dis65 6590-6617, $69be)', () => {
  it('below MISSILE_INTRO_THRESHOLD a replacement is NEVER a missile ("score too low, create a tank")', async () => {
    const m = await loadEnemies()
    for (let seed = 0; seed < 32; seed++) {
      const r = respawn(m, seed, 0, MISSILE_INTRO_THRESHOLD - 1)
      expect(
        r.state.hostile.kind,
        `seed ${seed}: spawned a ${r.state.hostile.kind} below the missile threshold`,
      ).toBe('tank')
      expect(r.state.missilesLaunched, 'tank spawns never touch the counter').toBe(0)
    }
  })

  it('AT the threshold missiles join the rotation ("when your score REACHES a threshold" — ≥, not >)', async () => {
    const m = await loadEnemies()
    // Deterministic per seed: cycle replacement spawns at exactly the
    // threshold until a missile appears. A rotation that can produce missiles
    // does so within 64 respawns for these seeds — and the run is replayable
    // forever (seeded rng), so this is a pin, not a flake.
    for (const seed of [1, 2, 3, 0xbeef, 0xf00d, 42]) {
      let rng = seed
      let launched = 0
      let sawMissile = false
      for (let i = 0; i < 64; i++) {
        const r = respawn(m, rng, launched, MISSILE_INTRO_THRESHOLD)
        if (r.state.hostile.kind === 'missile') {
          // "increment missile counter" (dis65 6690) — ON SPAWN.
          expect(r.state.missilesLaunched, `seed ${seed}: launch counter on missile spawn`).toBe(
            launched + 1,
          )
          sawMissile = true
          break
        }
        expect(r.state.missilesLaunched, `seed ${seed}: non-missile spawn bumped the counter`).toBe(
          launched,
        )
        rng = r.state.rng
        launched = r.state.missilesLaunched
      }
      expect(sawMissile, `seed ${seed}: no missile in 64 at-threshold respawns`).toBe(true)
    }
  })

  it('above the threshold the rotation still mixes in tanks — missiles are a draw, not a takeover', async () => {
    const m = await loadEnemies()
    // "get a random number" (dis65 6613): the choice is a draw from the
    // carried seed, so SOME spawns above the threshold remain tanks.
    let rng = 0xdead
    let launched = 0
    const kinds = new Set<string>()
    for (let i = 0; i < 64; i++) {
      const r = respawn(m, rng, launched, MISSILE_INTRO_THRESHOLD + 5_000)
      kinds.add(r.state.hostile.kind)
      rng = r.state.rng
      launched = r.state.missilesLaunched
    }
    expect(kinds.has('missile'), 'missiles appear above the threshold').toBe(true)
    expect(
      kinds.has('tank') || kinds.has('super-tank'),
      'tanks still appear above the threshold — the rotation is mixed',
    ).toBe(true)
  })

  it('replacement spawns are deterministic — same seed word, same score, same unit', async () => {
    const m = await loadEnemies()
    const a = respawn(m, 0xcafe, 2, MISSILE_INTRO_THRESHOLD)
    const b = respawn(m, 0xcafe, 2, MISSILE_INTRO_THRESHOLD)
    expect(a).toEqual(b)
  })

  it('bz3-3/R-008: above the threshold the missile draw is a fair coin (~50%), not the old 40%', async () => {
    const m = await loadEnemies()
    // Drive the actual spawn decision (not just the constant) across a wide,
    // deterministic seed spread and count the missile rate. BZONE.MAC:3733-
    // 3738 is a single random bit, so the long-run rate must land near 0.5 —
    // a 40%-tuned draw would land far below this band.
    let rng = 0x5eed
    let launched = 0
    let missiles = 0
    const N = 2000
    for (let i = 0; i < N; i++) {
      const r = respawn(m, rng, launched, MISSILE_INTRO_THRESHOLD)
      if (r.state.hostile.kind === 'missile') missiles++
      rng = r.state.rng
      launched = r.state.missilesLaunched
    }
    const rate = missiles / N
    expect(rate, `observed missile rate ${rate} across ${N} draws`).toBeGreaterThan(0.45)
    expect(rate, `observed missile rate ${rate} across ${N} draws`).toBeLessThan(0.55)
  })
})

describe('GetTankType — the launch counter picks WHICH tank (BZONE.MAC:3704-3707 TR7CHK)', () => {
  it('with fewer than SUPER_TANK_AFTER_MISSILES launches, tank spawns are slow tanks (boundary: 5)', async () => {
    const m = await loadEnemies()
    for (const launched of [0, 1, 4, 5]) {
      for (let seed = 0; seed < 8; seed++) {
        // Score 0 forces the tank branch; the counter picks the tank type.
        const r = respawn(m, seed, launched, 0)
        expect(
          r.state.hostile.kind,
          `launched=${launched} seed=${seed}: expected a slow tank`,
        ).toBe('tank')
      }
    }
  })

  it('at/after SUPER_TANK_AFTER_MISSILES launches, tank spawns are super tanks (boundary: 6)', async () => {
    const m = await loadEnemies()
    for (const launched of [6, 7, 20]) {
      for (let seed = 0; seed < 8; seed++) {
        const r = respawn(m, seed, launched, 0)
        expect(
          r.state.hostile.kind,
          `launched=${launched} seed=${seed}: expected a super tank`,
        ).toBe('super-tank')
      }
    }
  })

  it('bz3-3/E-010: the 5th missile still yields a slow tank, only the 6th flips to super (NOR2D3=missiles-1, CMP I,5)', async () => {
    const m = await loadEnemies()
    for (let seed = 0; seed < 16; seed++) {
      const fifth = respawn(m, seed, 5, 0)
      expect(fifth.state.hostile.kind, `seed=${seed}: 5th missile spawned a super tank early`).toBe(
        'tank',
      )
      const sixth = respawn(m, seed, 6, 0)
      expect(sixth.state.hostile.kind, `seed=${seed}: 6th missile did not spawn a super tank`).toBe(
        'super-tank',
      )
    }
  })

  it('deep in the game (threshold met, ≥6 launched) the slow tank is gone from the rotation', async () => {
    const m = await loadEnemies()
    let rng = 7
    let launched = 6
    for (let i = 0; i < 32; i++) {
      const r = respawn(m, rng, launched, MISSILE_INTRO_THRESHOLD)
      expect(
        ['missile', 'super-tank'],
        `respawn ${i}: a slow tank spawned in the super-tank era`,
      ).toContain(r.state.hostile.kind)
      rng = r.state.rng
      launched = r.state.missilesLaunched
    }
  })
})

describe('kill awards — ROM kill-score immediates (findings §1)', () => {
  function killOnTheSpot(m: EnemiesModule, kind: HostileKind): EnemyStepResult {
    const h: Hostile = { x: OPEN.x + 10_000, z: OPEN.z, heading: 0, kind, phase: 'alive', phaseAge: 0 }
    const state: EnemyState = { hostile: h, shell: null, rng: 42, missilesLaunched: 6 }
    const playerShell: Shell = { x: h.x, z: h.z, heading: 0, range: 5_000 }
    return m.stepEnemies(state, OPEN, playerShell, DT, 0)
  }

  it('killing a missile awards SCORES.missile — 2000, pinned both ways', async () => {
    const m = await loadEnemies()
    const r = killOnTheSpot(m, 'missile')
    expect(r.playerShellConsumed).toBe(true)
    expect(r.scoreAward).toBe(SCORES.missile)
    expect(r.scoreAward).toBe(2000)
    expect(r.state.hostile.phase).toBe('exploding')
  })

  it('killing a super tank awards SCORES.superTank — 3000, pinned both ways', async () => {
    const m = await loadEnemies()
    const r = killOnTheSpot(m, 'super-tank')
    expect(r.playerShellConsumed).toBe(true)
    expect(r.scoreAward).toBe(SCORES.superTank)
    expect(r.scoreAward).toBe(3000)
    expect(r.state.hostile.phase).toBe('exploding')
  })

  it('the blast keeps the kind of what died — debris knows what it was', async () => {
    const m = await loadEnemies()
    // The render layer draws the explosion at the dead unit's pose and the
    // replacement selection happens at EXPIRY — so the exploding slot must
    // carry the dead unit's kind through the whole blast.
    for (const kind of ['missile', 'super-tank'] as const) {
      const r = killOnTheSpot(m, kind)
      expect(r.state.hostile.kind, `${kind} blast lost its identity`).toBe(kind)
    }
  })

  it('a kill mid-blast pays nothing twice — debris eats no shells (roster kinds)', async () => {
    const m = await loadEnemies()
    const h: Hostile = {
      x: OPEN.x + 10_000, z: OPEN.z, heading: 0, kind: 'missile', phase: 'exploding', phaseAge: 0.1,
    }
    const state: EnemyState = { hostile: h, shell: null, rng: 42, missilesLaunched: 3 }
    const playerShell: Shell = { x: h.x, z: h.z, heading: 0, range: 5_000 }
    const r = m.stepEnemies(state, OPEN, playerShell, DT, 0)
    expect(r.scoreAward).toBe(0)
    expect(r.playerShellConsumed).toBe(false)
  })
})

describe('missile flight — guided, contact-kill, scrap-on-miss (dis65 5144/5753-5807/6491/7076)', () => {
  /** An alive unit `d` units north of the player, facing the player. */
  function inbound(kind: HostileKind, d: number, launched: number): EnemyState {
    return {
      hostile: { x: OPEN.x, z: OPEN.z + d, heading: Math.PI, kind, phase: 'alive', phaseAge: 0 },
      shell: null,
      rng: 0xfeed,
      missilesLaunched: launched,
    }
  }

  it('a missile out-closes the slow tank AND the super tank (relative speed band — absolutes are bz1-12 true-ups)', async () => {
    const m = await loadEnemies()
    const closed = (kind: HostileKind): number => {
      const { states } = run(m, inbound(kind, 20_000, 6), 60)
      const last = states[states.length - 1]
      return 20_000 - dist(last.hostile, OPEN)
    }
    const missile = closed('missile')
    const superTank = closed('super-tank')
    const slowTank = closed('tank')
    expect(missile, 'missile vs slow tank').toBeGreaterThan(slowTank)
    expect(missile, 'missile vs super tank').toBeGreaterThan(superTank)
    expect(slowTank, 'everything makes SOME progress head-on').toBeGreaterThan(0)
  })

  it('a missile never fires a shell — it IS the projectile (contact kill, dis65 6491)', async () => {
    const m = await loadEnemies()
    const { sawEnemyShell } = run(m, inbound('missile', 20_000, 6), 120)
    expect(sawEnemyShell, 'a missile launched a shell').toBe(false)
  })

  it('missile contact detonates on the player: playerHit signalled, missile explodes, no points to anyone', async () => {
    const m = await loadEnemies()
    const { states, contactStep } = run(m, inbound('missile', PLAYER_RADIUS + 2_000, 6), 240)
    expect(contactStep, 'the missile never reached the player').toBeGreaterThanOrEqual(0)
    const atContact = states[states.length - 1]
    expect(atContact.hostile.phase, 'the missile detonates — the slot survives as its blast').toBe(
      'exploding',
    )
    expect(atContact.hostile.kind).toBe('missile')
  })

  it('a missile past MISSILE_ABANDON_RANGE is scrapped and replaced SAME-step, no score (dis65 7076)', async () => {
    const m = await loadEnemies()
    const d = m.MISSILE_ABANDON_RANGE * 1.05
    const state: EnemyState = {
      // heading 0 = due north, sailing AWAY from the player — a clean miss.
      hostile: { x: OPEN.x, z: OPEN.z + d, heading: 0, kind: 'missile', phase: 'alive', phaseAge: 2 },
      shell: null,
      rng: 9,
      missilesLaunched: 3,
    }
    const r = m.stepEnemies(state, OPEN, null, DT, 0)
    expect(r.scoreAward, 'a self-scrapped missile pays nothing').toBe(0)
    expect(r.state.hostile.phase, 'the replacement enters alive — no gap').toBe('alive')
    expect(
      dist(r.state.hostile, OPEN),
      'the replacement is a fresh entrance near the player, not the runaway missile',
    ).toBeLessThanOrEqual(FAR_CULL)
  })

  it('a tank at the same distance keeps crawling — "if it\'s a tank we keep going" (dis65 7076)', async () => {
    const m = await loadEnemies()
    const d = m.MISSILE_ABANDON_RANGE * 1.05
    const state: EnemyState = {
      hostile: { x: OPEN.x, z: OPEN.z + d, heading: Math.PI, kind: 'tank', phase: 'alive', phaseAge: 2 },
      shell: null,
      rng: 9,
      missilesLaunched: 0,
    }
    const r = m.stepEnemies(state, OPEN, null, DT, 0)
    expect(r.state.hostile.kind).toBe('tank')
    expect(
      dist(r.state.hostile, OPEN),
      'the far tank persisted (no scrap) and merely crawled',
    ).toBeGreaterThan(m.MISSILE_ABANDON_RANGE * 0.9)
  })

  it('the FIRST missile ever flies straight in — "be nice" (dis65 5753-5756)', async () => {
    const m = await loadEnemies()
    // missilesLaunched === 1 while a missile is alive ⇒ it IS the first ever.
    const start = inbound('missile', 20_000, 1)
    const { states } = run(m, start, 60)
    for (let i = 1; i < states.length; i++) {
      const h = states[i].hostile
      if (h.phase !== 'alive') break
      const err = Math.abs(wrap(h.heading - bearing(h, OPEN)))
      expect(err, `step ${i}: the first missile deviated from the bearing line`).toBeLessThanOrEqual(
        0.05,
      )
    }
  })

  it('later missiles weave — the approach visibly crosses BOTH sides of the bearing line within 2 s', async () => {
    const m = await loadEnemies()
    // ROM: swerve direction flips every 0.5 s (dis65 5799-5803), so a 2 s
    // window must show deviation on both sides. Amplitude is an undecoded
    // quarry byte — 0.05 rad is the "visible weave" floor, not the ROM curve.
    const start = inbound('missile', 25_000, 3)
    const { states } = run(m, start, 120)
    let maxDev = -Infinity
    let minDev = Infinity
    for (const s of states.slice(1)) {
      if (s.hostile.phase !== 'alive') break
      const dev = wrap(s.hostile.heading - bearing(s.hostile, OPEN))
      maxDev = Math.max(maxDev, dev)
      minDev = Math.min(minDev, dev)
    }
    expect(maxDev, 'no starboard swerve seen').toBeGreaterThan(0.05)
    expect(minDev, 'no port swerve seen').toBeLessThan(-0.05)
    // The weave is an approach, not an orbit — net distance still shrinks.
    const last = states[states.length - 1]
    expect(dist(last.hostile, OPEN)).toBeLessThan(25_000 - 2_000)
  })

  it('inside MISSILE_CLOSE_RANGE the weave stops — it homes ("head at player", dis65 5794)', async () => {
    const m = await loadEnemies()
    const d = Math.floor(m.MISSILE_CLOSE_RANGE * 0.9)
    const start: EnemyState = {
      // Begin 0.6 rad OFF the bearing line: homing must wind the error DOWN,
      // never wind it up — no weave inside the close threshold.
      hostile: {
        x: OPEN.x, z: OPEN.z + d, heading: Math.PI - 0.6, kind: 'missile', phase: 'alive', phaseAge: 1,
      },
      shell: null,
      rng: 0xfeed,
      missilesLaunched: 3,
    }
    const { states } = run(m, start, 30)
    const errs: number[] = []
    for (const s of states) {
      if (s.hostile.phase !== 'alive') break
      errs.push(Math.abs(wrap(s.hostile.heading - bearing(s.hostile, OPEN))))
    }
    expect(errs.length, 'need at least a few alive steps to observe homing').toBeGreaterThanOrEqual(3)
    for (let i = 1; i < errs.length; i++) {
      expect(errs[i], `step ${i}: heading error grew while homing`).toBeLessThanOrEqual(
        errs[i - 1] + 1e-9,
      )
    }
    expect(errs[errs.length - 1], 'net convergence toward the bearing line').toBeLessThan(errs[0])
  })
})

describe('super tank — same duel, faster tank (speed table undecoded — relative band)', () => {
  it('fires the shared shell when roughly aimed, like the slow tank (one projectile system)', async () => {
    const m = await loadEnemies()
    const state: EnemyState = {
      hostile: {
        // bz2-9 R2: the spawn fire grace is raised to ~2 s (ROM rez_protect,
        // "don't be unfair"); settle the tank clearly past it so this asserts
        // "aimed super tank fires when settled", not the grace boundary.
        x: OPEN.x, z: OPEN.z + 15_000, heading: Math.PI, kind: 'super-tank', phase: 'alive', phaseAge: 3,
      },
      shell: null,
      rng: 5,
      missilesLaunched: 6,
    }
    const r = m.stepEnemies(state, OPEN, null, DT, 0)
    expect(r.state.shell, 'an aimed super tank fires').not.toBeNull()
  })

  it('out-closes the slow tank from the same start (dis65 names it the SUPER tank, not the sidegrade tank)', async () => {
    const m = await loadEnemies()
    const closed = (kind: HostileKind): number => {
      const start: EnemyState = {
        hostile: { x: OPEN.x, z: OPEN.z + 20_000, heading: Math.PI, kind, phase: 'alive', phaseAge: 0 },
        shell: null,
        rng: 0xfeed,
        missilesLaunched: 6,
      }
      const { states } = run(m, start, 60)
      const last = states[states.length - 1]
      return 20_000 - dist(last.hostile, OPEN)
    }
    expect(closed('super-tank')).toBeGreaterThan(closed('tank'))
  })
})

describe('radar — tanks AND missiles paint; the blast never does (findings §7)', () => {
  it('an alive missile paints exactly one kind-"missile" contact', async () => {
    const m = await loadEnemies()
    const state: EnemyState = {
      hostile: { x: 1_000, z: 2_000, heading: 0, kind: 'missile', phase: 'alive', phaseAge: 0 },
      shell: null,
      rng: 1,
      missilesLaunched: 1,
    }
    expect(m.radarContacts(state)).toEqual([{ x: 1_000, z: 2_000, kind: 'missile' }])
  })

  it('an alive super tank paints exactly one kind-"super-tank" contact', async () => {
    const m = await loadEnemies()
    const state: EnemyState = {
      hostile: { x: -3_000, z: 500, heading: 1, kind: 'super-tank', phase: 'alive', phaseAge: 0 },
      shell: null,
      rng: 1,
      missilesLaunched: 6,
    }
    expect(m.radarContacts(state)).toEqual([{ x: -3_000, z: 500, kind: 'super-tank' }])
  })

  it('an exploding roster unit paints nothing — debris is not a unit', async () => {
    const m = await loadEnemies()
    for (const kind of ['missile', 'super-tank'] as const) {
      const state: EnemyState = {
        hostile: { x: 0, z: 9_000, heading: 0, kind, phase: 'exploding', phaseAge: 0.5 },
        shell: null,
        rng: 1,
        missilesLaunched: 6,
      }
      expect(m.radarContacts(state), `${kind} blast painted the scanner`).toEqual([])
    }
  })

  it('the radar filter itself was not touched — missile/super-tank stay OFF the invisible list', () => {
    // bz1-6's filter contract: bz1-8 supplies contacts, the filter is fixed.
    expect(RADAR_INVISIBLE_KINDS).not.toContain('missile')
    expect(RADAR_INVISIBLE_KINDS).not.toContain('super-tank')
  })
})

describe('carried debts from bz1-7 — dt = 0 and the mutual-kill frame', () => {
  it('dt = 0 is a spatial no-op for every roster kind (fire-on-dt-0 stays legal — house semantics)', async () => {
    const m = await loadEnemies()
    for (const kind of ['tank', 'super-tank', 'missile'] as const) {
      const h: Hostile = {
        x: OPEN.x + 9_000, z: OPEN.z, heading: -Math.PI / 2, kind, phase: 'alive', phaseAge: 1.25,
      }
      const state: EnemyState = { hostile: h, shell: null, rng: 3, missilesLaunched: 6 }
      const r = m.stepEnemies(state, OPEN, null, 0, 0)
      expect(r.state.hostile.x, `${kind}: x drifted at dt=0`).toBe(h.x)
      expect(r.state.hostile.z, `${kind}: z drifted at dt=0`).toBe(h.z)
      expect(r.state.hostile.heading, `${kind}: heading drifted at dt=0`).toBe(h.heading)
      expect(r.state.hostile.phaseAge, `${kind}: phaseAge advanced at dt=0`).toBe(h.phaseAge)
      expect(r.scoreAward).toBe(0)
      expect(r.playerHit).toBe(false)
    }
  })

  it('dt = 0 never expires a blast — no replacement out of frozen time', async () => {
    const m = await loadEnemies()
    const state = expiredBlast(11, 0)
    const r = m.stepEnemies(state, OPEN, null, 0, 0)
    expect(r.state.hostile.phase).toBe('exploding')
    expect(r.state.hostile.phaseAge).toBe(state.hostile.phaseAge)
  })

  it('the mutual-kill frame lands BOTH events in one result — kill paid AND hit signalled', async () => {
    const m = await loadEnemies()
    const h: Hostile = {
      x: OPEN.x + 10_000, z: OPEN.z, heading: -Math.PI / 2, kind: 'tank', phase: 'alive', phaseAge: 3,
    }
    // The enemy's shell is already in flight, one sub-step short of the player…
    const enemyShell: Shell = { x: OPEN.x, z: OPEN.z + PLAYER_RADIUS + 100, heading: Math.PI, range: 100 }
    // …while the player's shell sits dead on the hostile.
    const playerShell: Shell = { x: h.x, z: h.z, heading: Math.PI / 2, range: 8_000 }
    const state: EnemyState = { hostile: h, shell: enemyShell, rng: 21, missilesLaunched: 0 }
    const r = m.stepEnemies(state, OPEN, playerShell, DT, 0)
    expect(r.playerShellConsumed, 'the kill half of the mutual frame').toBe(true)
    expect(r.scoreAward).toBe(SCORES.slowTank)
    expect(r.playerHit, 'the death half of the mutual frame').toBe(true)
    expect(r.state.hostile.phase).toBe('exploding')
  })
})

describe('era invariants — always one hostile, replayable to the byte', () => {
  function longRun(m: EnemiesModule, seed: number): EnemyState[] {
    // 600 steps (~10 s) spanning kills, blasts, respawns and the missile era:
    // every 97th step the player's shell materializes dead on the hostile.
    let state = m.initEnemies(seed, OPEN)
    const trail: EnemyState[] = [state]
    for (let i = 0; i < 600; i++) {
      const shell: Shell | null =
        i % 97 === 0 && state.hostile.phase === 'alive'
          ? { x: state.hostile.x, z: state.hostile.z, heading: 0, range: 1_000 }
          : null
      state = m.stepEnemies(state, OPEN, shell, DT, MISSILE_INTRO_THRESHOLD).state
      trail.push(state)
    }
    return trail
  }

  it('the hostile slot is never empty and the launch counter never runs backwards', async () => {
    const m = await loadEnemies()
    const trail = longRun(m, 0x5eed)
    for (let i = 0; i < trail.length; i++) {
      const s = trail[i]
      expect(s.hostile, `step ${i}: the battlefield emptied`).toBeTruthy()
      expect(['alive', 'exploding'], `step ${i}: unknown phase`).toContain(s.hostile.phase)
      expect(['tank', 'super-tank', 'missile'], `step ${i}: unknown kind`).toContain(s.hostile.kind)
      if (i > 0) {
        expect(
          s.missilesLaunched,
          `step ${i}: the launch counter ran backwards`,
        ).toBeGreaterThanOrEqual(trail[i - 1].missilesLaunched)
      }
    }
  })

  it('the whole roster era replays byte-identical from the same seed', async () => {
    const m = await loadEnemies()
    expect(longRun(m, 0xf1e1d)).toEqual(longRun(m, 0xf1e1d))
  })

  it('stepEnemies never mutates its inputs — frozen state passes through untouched', async () => {
    const m = await loadEnemies()
    const h: Hostile = Object.freeze({
      x: OPEN.x + 8_000, z: OPEN.z, heading: -Math.PI / 2, kind: 'missile', phase: 'alive', phaseAge: 0.4,
    } as const)
    const shell: Shell = Object.freeze({ x: OPEN.x + 4_000, z: OPEN.z, heading: Math.PI, range: 900 })
    const state: EnemyState = Object.freeze({ hostile: h, shell, rng: 77, missilesLaunched: 2 })
    const before = JSON.stringify(state)
    // Strict mode (ESM): any mutation of a frozen input throws — so a clean
    // return IS the assertion, and the snapshot proves structural identity.
    const r = m.stepEnemies(state, OPEN, null, DT, MISSILE_INTRO_THRESHOLD)
    expect(r.state).toBeTruthy()
    expect(JSON.stringify(state)).toBe(before)
  })
})
