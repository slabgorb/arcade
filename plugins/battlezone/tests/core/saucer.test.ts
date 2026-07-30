// tests/core/saucer.test.ts
//
// Story bz1-9 — RED phase (Furiosa / TEA). The saucer: the bonus VISITOR —
// drifts in once the score reaches 2000, wanders a random path, is worth 5000
// if shot down, never paints on the radar, and never fires. It coexists with
// the one hostile (bz1-7's invariant) but takes no part in that lifecycle.
//
// CONTRACT pinned for Dev (GREEN) — new module, mirrors enemies.ts's shape:
//   src/core/saucer.ts
//     type SaucerPhase = 'alive' | 'exploding'
//     interface Saucer {
//       readonly x: number          — planar world X (planar-sim ruling: no y;
//       readonly z: number            the hover height is a render offset)
//       readonly heading: number    — drift direction, camera.ts convention
//       readonly phase: SaucerPhase — occupied through the death blast
//       readonly phaseAge: number   — seconds in the current phase
//     }
//     interface SaucerState {
//       readonly saucer: Saucer | null  — null = no visitor on the field
//       readonly rng: number            — its OWN carried seed word, never
//                                         shared with EnemyState.rng
//       (Dev may carry additional private timing fields — these tests only
//        ever build SaucerState through initSaucer/stepSaucer, never literals.)
//     }
//     interface SaucerStepResult {
//       readonly state: SaucerState
//       readonly scoreAward: number          — 5000 on the kill step, else 0
//       readonly playerShellConsumed: boolean
//       — NO `shell` field, NO `playerHit` field: the saucer is UNARMED.
//         Contact damage is unconfirmed in the quarry; per the story context
//         it ships harmless (bonus target only) until bz1-2 data says otherwise.
//     }
//     SAUCER_HIT_RADIUS — BAND: ≥ one 60 Hz shell frame-step (256) so the
//         point-sampled kill test cannot tunnel (house rule since bz1-5/7);
//         reusing TANK_HIT_RADIUS is lawful (the ROM diameter table at $6139
//         is the standing deferred decode).
//     initSaucer(seed: number): SaucerState — no visitor at game start
//         (score 0 < the 2000 gate by definition).
//     stepSaucer(state, player: TankPose, playerShell: Shell | null, dt,
//                score): SaucerStepResult — parameter order mirrors
//         stepEnemies; score is REQUIRED (the gate is this story's point).
//     saucerContacts(state): readonly RadarContact[] — alive → exactly one
//         contact of kind 'saucer' at the live position; else []. Mirrors
//         enemies.radarContacts so main.ts concatenates the two lists.
//
// ROM facts driving these tests (docs/battlezone-1980-source-findings.md):
//   §1: saucer kill value 5000 (byte-confirmed, offset 4388/~$6124), object
//       $20; DISTINCT from the 2000-pt appearance threshold ("easy to
//       cross-wire; both scoring.ts and its tests guard the two constants
//       separately").
//   §2: "Saucers start appearing at 2000 points." (scoring.ts →
//       SAUCER_APPEARANCE_SCORE). "There will always be one hostile unit on
//       the battlefield" — and the saucer is explicitly a bonus visitor ON
//       TOP of that one hostile, never a replacement for it.
//   §7: "Enemy tanks and missiles appear on radar, obstacles and saucers do
//       not." — radar.ts's RADAR_INVISIBLE_KINDS already lists 'saucer';
//       these tests drive the LIVE entity through deriveRadar end-to-end.
//
// TEA BANDS (the quarry has NO decoded saucer spawn-timing / drift-path /
// lifetime data — findings doc is silent beyond §2's threshold; logged as a
// session deviation, bz1-12's playtest trues up):
//   * spawn wait: once eligible (score ≥ 2000), a visitor appears within 60 s
//     of sim time; visits RECUR (plural "saucers start appearing").
//   * spawn standoff: off the player's face and inside the far plane —
//     PLAYER_RADIUS < dist ≤ FAR_CULL at the spawn step (it "drifts in"
//     visible, not materializing on the gun barrel).
//   * drift: moves every step (never parks), no teleports (≤ 30 000 u/s —
//     generous vs the missile's 11 520), planar (x/z only), RNG-seeded so
//     different seeds wander different paths.
//   * lifetime: an unshot visitor leaves the field within 120 s of spawning.
//   * frozen time (dt = 0) is a full no-op for the saucer side — no spawn
//     draw, no drift, no timer burn (house semantics, bz1-7's blast rule) —
//     EXCEPT the kill check, which is position-based and dt-independent
//     (house mutual-kill semantics, bz1-8's carried debt).
//
// Convention (fixed by src/core/camera.ts, do NOT re-derive): heading 0 faces
// +Z, increasing heading turns CCW toward +X.
//
// RED: src/core/saucer.ts does not exist yet; every test loads the module
// defensively so a missing export fails as a clean contract miss (house
// pattern, bz1-7/bz1-8 precedent).

import { describe, it, expect } from 'vitest'
import { FAR_CULL, type TankPose } from '../../src/core/camera'
import { PLAYER_RADIUS } from '../../src/core/movement'
import { SCORES, SAUCER_APPEARANCE_SCORE } from '../../src/core/scoring'
import { deriveRadar, RADAR_INVISIBLE_KINDS, type RadarContact } from '../../src/core/radar'
import { initEnemies, stepEnemies, EXPLOSION_DURATION } from '../../src/core/enemies'
import { projectModel } from '../../src/core/scene'
import { SAUCER } from '../../src/core/models'

type SaucerPhase = 'alive' | 'exploding'
interface Saucer {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly phase: SaucerPhase
  readonly phaseAge: number
}
interface SaucerState {
  readonly saucer: Saucer | null
  readonly rng: number
}
interface Shell {
  readonly x: number
  readonly z: number
  readonly heading: number
  readonly range: number
}
interface SaucerStepResult {
  readonly state: SaucerState
  readonly scoreAward: number
  readonly playerShellConsumed: boolean
}
interface SaucerModule {
  SAUCER_HIT_RADIUS: number
  initSaucer(seed: number): SaucerState
  stepSaucer(
    state: SaucerState,
    player: TankPose,
    playerShell: Shell | null,
    dt: number,
    score: number,
  ): SaucerStepResult
  saucerContacts(state: SaucerState): readonly RadarContact[]
}

async function loadSaucer(): Promise<SaucerModule> {
  let m: Partial<SaucerModule> = {}
  let importError: string | null = null
  try {
    // RED contract load: the module is not built yet (house pattern).
    m = (await import('../../src/core/saucer')) as unknown as Partial<SaucerModule>
  } catch (e: unknown) {
    // Surface the real failure inside the contract miss below (review
    // round-trip 1: a bare swallow would disguise a genuine import-time bug
    // as a missing export).
    importError = e instanceof Error ? e.message : String(e)
  }
  if (typeof m.initSaucer !== 'function' || typeof m.stepSaucer !== 'function') {
    throw new Error(
      'CONTRACT: src/core/saucer.ts must export initSaucer(seed) and stepSaucer(state, player, playerShell, dt, score)' +
        (importError === null ? '' : ` — import failed: ${importError}`),
    )
  }
  if (typeof m.saucerContacts !== 'function') {
    throw new Error(
      'CONTRACT: src/core/saucer.ts must export saucerContacts(state) (radar wiring, findings §7)',
    )
  }
  if (typeof m.SAUCER_HIT_RADIUS !== 'number') {
    throw new Error(
      'CONTRACT: src/core/saucer.ts must export SAUCER_HIT_RADIUS (kill radius band, house anti-tunneling rule)',
    )
  }
  return m as SaucerModule
}

const DT = 1 / 60

/** TEA band: once eligible, a visitor appears within this much sim time. */
const SPAWN_WAIT_S = 60
/** TEA band: an unshot visitor leaves the field within this much sim time. */
const LIFETIME_S = 120
/** TEA band: drift never teleports — generous ceiling vs the missile's 11 520. */
const DRIFT_SPEED_CAP = 30_000

/** Open plain, far from the obstacle field (house trick — obstacles live within ~46k of the origin). */
const OPEN: TankPose = { x: 200_000, z: 200_000, heading: 0 }

/** One eligible score for the whole suite — comfortably past the gate. */
const ELIGIBLE = 2500

function dist(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.hypot(a.x - b.x, a.z - b.z)
}

/**
 * Drive the saucer side for up to `steps` sim steps against a parked player
 * and no shell, recording the full trace. Stops early if `until` says so.
 */
function run(
  mod: SaucerModule,
  start: SaucerState,
  steps: number,
  score: number,
  until?: (state: SaucerState, i: number) => boolean,
): { states: SaucerState[]; results: SaucerStepResult[] } {
  const states: SaucerState[] = [start]
  const results: SaucerStepResult[] = []
  let s = start
  for (let i = 0; i < steps; i++) {
    const r = mod.stepSaucer(s, OPEN, null, DT, score)
    s = r.state
    states.push(s)
    results.push(r)
    if (until?.(s, i)) break
  }
  return { states, results }
}

/** Drive a fresh seed until the visitor is alive on the field (must happen inside the spawn band). */
function spawnLive(mod: SaucerModule, seed: number): { state: SaucerState; saucer: Saucer } {
  const { states } = run(mod, mod.initSaucer(seed), Math.ceil(SPAWN_WAIT_S / DT), ELIGIBLE, (s) => s.saucer !== null)
  const last = states[states.length - 1]
  if (last.saucer === null) {
    throw new Error(`TEA band violated: no saucer within ${SPAWN_WAIT_S}s at score ${ELIGIBLE} (seed ${seed})`)
  }
  return { state: last, saucer: last.saucer }
}

describe('bz1-9 contract — exports, init state, and the two constants that must not cross-wire', () => {
  it('initSaucer starts with no visitor on the field (game start is score 0, below the gate)', async () => {
    const m = await loadSaucer()
    const state = m.initSaucer(1234)
    expect(state.saucer).toBeNull()
    expect(typeof state.rng).toBe('number')
  })

  it('SAUCER_HIT_RADIUS clears one shell frame-step (256) — the house anti-tunneling band', async () => {
    const m = await loadSaucer()
    expect(Number.isFinite(m.SAUCER_HIT_RADIUS)).toBe(true)
    expect(m.SAUCER_HIT_RADIUS).toBeGreaterThanOrEqual(256)
  })

  it('appearance (2000) and kill value (5000) stay distinct constants (findings §1 cross-wire guard)', () => {
    expect(SAUCER_APPEARANCE_SCORE).toBe(2000)
    expect(SCORES.saucer).toBe(5000)
    expect(SCORES.saucer).not.toBe(SAUCER_APPEARANCE_SCORE)
  })
})

describe('spawn gate — "Saucers start appearing at 2000 points" (findings §2)', () => {
  it('below the gate NO visitor ever appears — 90 s of sim across seeds at score 0 and 1999', async () => {
    const m = await loadSaucer()
    for (const score of [0, SAUCER_APPEARANCE_SCORE - 1]) {
      for (const seed of [1, 7, 1999, 424242]) {
        const { states } = run(m, m.initSaucer(seed), Math.ceil(90 / DT), score)
        for (const s of states) {
          expect(s.saucer, `seed ${seed} score ${score}: saucer must stay null below the gate`).toBeNull()
        }
      }
    }
  })

  it('at the gate exactly (score 2000) a visitor appears within the spawn band', async () => {
    const m = await loadSaucer()
    for (const seed of [1, 7, 424242]) {
      const { states } = run(
        m,
        m.initSaucer(seed),
        Math.ceil(SPAWN_WAIT_S / DT),
        SAUCER_APPEARANCE_SCORE,
        (s) => s.saucer !== null,
      )
      const last = states[states.length - 1]
      expect(last.saucer, `seed ${seed}: a saucer must appear within ${SPAWN_WAIT_S}s at the gate`).not.toBeNull()
      expect(last.saucer?.phase).toBe('alive')
    }
  })

  it('drifts IN: the spawn stands off the player but inside the far plane', async () => {
    const m = await loadSaucer()
    for (const seed of [3, 99, 31337]) {
      const { saucer } = spawnLive(m, seed)
      const d = dist(saucer, OPEN)
      expect(d).toBeGreaterThan(PLAYER_RADIUS)
      expect(d).toBeLessThanOrEqual(FAR_CULL)
    }
  })

  it('visits recur: after one visitor leaves, another appears within the spawn band', async () => {
    const m = await loadSaucer()
    const first = spawnLive(m, 11)
    // Let the first visitor's whole stay (drift + possible blast) burn down.
    const gone = run(m, first.state, Math.ceil(LIFETIME_S / DT), ELIGIBLE, (s) => s.saucer === null)
    expect(gone.states[gone.states.length - 1].saucer).toBeNull()
    // The plural in "saucers start appearing": the next visit comes.
    const again = run(
      m,
      gone.states[gone.states.length - 1],
      Math.ceil(SPAWN_WAIT_S / DT),
      ELIGIBLE,
      (s) => s.saucer !== null,
    )
    expect(again.states[again.states.length - 1].saucer).not.toBeNull()
  })
})

describe('drift — a random path across the plain (TEA bands; quarry data pending)', () => {
  it('never parks: an alive visitor moves every step', async () => {
    const m = await loadSaucer()
    const { state } = spawnLive(m, 5)
    let prev = state.saucer as Saucer
    let s = state
    for (let i = 0; i < 120; i++) {
      const r = m.stepSaucer(s, OPEN, null, DT, ELIGIBLE)
      s = r.state
      if (s.saucer === null || s.saucer.phase !== 'alive') break
      expect(
        dist(s.saucer, prev),
        `step ${i}: an alive saucer must drift, not park`,
      ).toBeGreaterThan(0)
      prev = s.saucer
    }
  })

  it('never teleports: per-step displacement stays under the drift speed cap', async () => {
    const m = await loadSaucer()
    const { state } = spawnLive(m, 5)
    let prev = state.saucer as Saucer
    let s = state
    for (let i = 0; i < 600; i++) {
      const r = m.stepSaucer(s, OPEN, null, DT, ELIGIBLE)
      s = r.state
      if (s.saucer === null || s.saucer.phase !== 'alive') break
      expect(dist(s.saucer, prev)).toBeLessThanOrEqual(DRIFT_SPEED_CAP * DT)
      prev = s.saucer
    }
  })

  it('the path is seeded: different seeds wander different paths', async () => {
    const m = await loadSaucer()
    const a = spawnLive(m, 21)
    const b = spawnLive(m, 22)
    // Drift both for 5 s and compare FULL lifecycle traces — positions AND
    // despawn ticks both count as seeded divergence, so there is no
    // unreachable branch (review round-trip 1: the old else-arm asserted a
    // condition unrelated to seeding and could never fire).
    const ra = run(m, a.state, 300, ELIGIBLE)
    const rb = run(m, b.state, 300, ELIGIBLE)
    const traceA = ra.states.map((s) => JSON.stringify(s.saucer))
    const traceB = rb.states.map((s) => JSON.stringify(s.saucer))
    expect(traceA).not.toEqual(traceB)
  })
})

describe('despawn — the visitor leaves (TEA lifetime band)', () => {
  it('an unshot visitor leaves the field within the lifetime band', async () => {
    const m = await loadSaucer()
    const { state } = spawnLive(m, 13)
    const { states } = run(m, state, Math.ceil(LIFETIME_S / DT), ELIGIBLE, (s) => s.saucer === null)
    expect(states[states.length - 1].saucer).toBeNull()
  })

  it('frozen time (dt = 0) is a full no-op — no spawn draw, no drift, no timer burn', async () => {
    const m = await loadSaucer()
    // Empty field, eligible score: dt 0 must not roll the spawn dice.
    let s: SaucerState = m.initSaucer(77)
    for (let i = 0; i < 50; i++) {
      const r = m.stepSaucer(s, OPEN, null, 0, ELIGIBLE)
      expect(r.state).toEqual(s)
      expect(r.scoreAward).toBe(0)
      s = r.state
    }
    // Live visitor: dt 0 must not drift it or burn its clock.
    const live = spawnLive(m, 77).state
    const frozen = m.stepSaucer(live, OPEN, null, 0, ELIGIBLE)
    expect(frozen.state).toEqual(live)
  })
})

describe('kill — 5000 points through the standard machinery (findings §1; bz1-7 explosion semantics)', () => {
  it('a shell on the visitor kills it: 5000 award, shell consumed, blast begins', async () => {
    const m = await loadSaucer()
    const { state, saucer } = spawnLive(m, 42)
    const shell: Shell = { x: saucer.x, z: saucer.z, heading: 0, range: 1000 }
    const r = m.stepSaucer(state, OPEN, shell, DT, ELIGIBLE)
    expect(r.scoreAward).toBe(SCORES.saucer)
    expect(r.playerShellConsumed).toBe(true)
    expect(r.state.saucer).not.toBeNull()
    expect(r.state.saucer?.phase).toBe('exploding')
  })

  it('the kill lands even at dt = 0 (position-based, dt-independent — house mutual-kill semantics)', async () => {
    const m = await loadSaucer()
    const { state, saucer } = spawnLive(m, 43)
    const shell: Shell = { x: saucer.x, z: saucer.z, heading: 0, range: 1000 }
    const r = m.stepSaucer(state, OPEN, shell, 0, ELIGIBLE)
    expect(r.scoreAward).toBe(SCORES.saucer)
    expect(r.playerShellConsumed).toBe(true)
  })

  it('a miss consumes nothing and awards nothing', async () => {
    const m = await loadSaucer()
    const { state, saucer } = spawnLive(m, 44)
    const shell: Shell = {
      x: saucer.x + m.SAUCER_HIT_RADIUS * 4,
      z: saucer.z,
      heading: 0,
      range: 1000,
    }
    const r = m.stepSaucer(state, OPEN, shell, DT, ELIGIBLE)
    expect(r.scoreAward).toBe(0)
    expect(r.playerShellConsumed).toBe(false)
    expect(r.state.saucer?.phase).toBe('alive')
  })

  it('debris eats no shells and re-awards nothing (bz1-7 rule, same machinery)', async () => {
    const m = await loadSaucer()
    const { state, saucer } = spawnLive(m, 45)
    const shell: Shell = { x: saucer.x, z: saucer.z, heading: 0, range: 1000 }
    const killed = m.stepSaucer(state, OPEN, shell, DT, ELIGIBLE)
    const exploding = killed.state
    const blast = exploding.saucer as Saucer
    const again = m.stepSaucer(exploding, OPEN, { ...shell, x: blast.x, z: blast.z }, DT, ELIGIBLE)
    expect(again.scoreAward).toBe(0)
    expect(again.playerShellConsumed).toBe(false)
  })

  it('the award lands exactly once across the whole visit', async () => {
    const m = await loadSaucer()
    const { state, saucer } = spawnLive(m, 46)
    const shell: Shell = { x: saucer.x, z: saucer.z, heading: 0, range: 1000 }
    let total = 0
    let s = state
    let pending: Shell | null = shell
    for (let i = 0; i < Math.ceil(LIFETIME_S / DT); i++) {
      const r: SaucerStepResult = m.stepSaucer(s, OPEN, pending, DT, ELIGIBLE)
      total += r.scoreAward
      if (r.playerShellConsumed) pending = null
      s = r.state
      if (s.saucer === null) break
    }
    expect(total).toBe(SCORES.saucer)
  })

  it('the blast burns down on the standard clock, then the slot clears — NO replacement (bonus visitor, not the hostile)', async () => {
    const m = await loadSaucer()
    const { state, saucer } = spawnLive(m, 47)
    const shell: Shell = { x: saucer.x, z: saucer.z, heading: 0, range: 1000 }
    const killed = m.stepSaucer(state, OPEN, shell, DT, ELIGIBLE)
    // Burn just past the standard blast duration (bz1-7's machinery).
    const burnSteps = Math.ceil((EXPLOSION_DURATION + 0.5) / DT)
    let s = killed.state
    let sawBlast = false
    let clearedAt = -1
    for (let i = 0; i < burnSteps; i++) {
      if (s.saucer?.phase === 'exploding') sawBlast = true
      const r = m.stepSaucer(s, OPEN, null, DT, ELIGIBLE)
      s = r.state
      // The step that retires the blast must NOT spawn a fresh visitor in the
      // same returned state — that no-gap rule is the HOSTILE's (findings §2),
      // and the saucer is explicitly not the hostile.
      if (clearedAt < 0 && s.saucer === null) clearedAt = i
    }
    expect(sawBlast).toBe(true)
    expect(clearedAt).toBeGreaterThanOrEqual(0)
  })
})

describe('radar-invisible end-to-end — "obstacles and saucers do not" (findings §7, AC-3)', () => {
  it("radar.ts still lists 'saucer' among the invisible kinds (regression guard on bz1-6's filter)", () => {
    expect(RADAR_INVISIBLE_KINDS).toContain('saucer')
  })

  it('an alive visitor supplies exactly one LIVE contact of kind saucer — not a vacuous empty list', async () => {
    const m = await loadSaucer()
    const { state, saucer } = spawnLive(m, 52)
    const contacts = m.saucerContacts(state)
    expect(contacts).toHaveLength(1)
    expect(contacts[0].kind).toBe('saucer')
    expect(contacts[0].x).toBe(saucer.x)
    expect(contacts[0].z).toBe(saucer.z)
  })

  it('deriveRadar paints ZERO blips for the live saucer across its entire visit', async () => {
    const m = await loadSaucer()
    let s: SaucerState = m.initSaucer(53)
    for (let i = 0; i < Math.ceil(LIFETIME_S / DT); i++) {
      const r = m.stepSaucer(s, OPEN, null, DT, ELIGIBLE)
      s = r.state
      expect(deriveRadar(OPEN, m.saucerContacts(s))).toHaveLength(0)
      if (i > Math.ceil(SPAWN_WAIT_S / DT) && s.saucer === null) break
    }
  })

  it('mixed contacts: the hostile paints, the saucer does not — one blip total', async () => {
    const m = await loadSaucer()
    const { state } = spawnLive(m, 54)
    const contacts: RadarContact[] = [
      ...m.saucerContacts(state),
      { x: OPEN.x + 5000, z: OPEN.z + 5000, kind: 'tank' },
    ]
    expect(contacts.length).toBe(2)
    const blips = deriveRadar(OPEN, contacts)
    expect(blips).toHaveLength(1)
  })

  it('an exploding or absent visitor supplies no contact at all', async () => {
    const m = await loadSaucer()
    expect(m.saucerContacts(m.initSaucer(55))).toHaveLength(0)
    const { state, saucer } = spawnLive(m, 55)
    const shell: Shell = { x: saucer.x, z: saucer.z, heading: 0, range: 1000 }
    const killed = m.stepSaucer(state, OPEN, shell, DT, ELIGIBLE)
    expect(killed.state.saucer?.phase).toBe('exploding')
    expect(m.saucerContacts(killed.state)).toHaveLength(0)
  })
})

describe('unarmed — the visitor never fires (AC-6; contact damage ships harmless per story context)', () => {
  it('the step result exposes NO fire channel: no shell, no playerHit, at any point in a full visit', async () => {
    const m = await loadSaucer()
    let s: SaucerState = m.initSaucer(61)
    for (let i = 0; i < Math.ceil((SPAWN_WAIT_S + LIFETIME_S) / DT); i++) {
      const r = m.stepSaucer(s, OPEN, null, DT, ELIGIBLE)
      expect('shell' in r, 'SaucerStepResult must not carry a shell — the saucer is unarmed').toBe(false)
      expect('playerHit' in r, 'SaucerStepResult must not signal playerHit — the saucer is harmless').toBe(false)
      expect('shell' in r.state, 'SaucerState must not carry a projectile slot').toBe(false)
      s = r.state
      if (i > Math.ceil(SPAWN_WAIT_S / DT) && s.saucer === null) break
    }
  })
})

describe('coexistence — the one-hostile invariant is untouched (findings §2, AC-2)', () => {
  it('interleaved with the enemy side, there is exactly one hostile at every step of a long run', async () => {
    const m = await loadSaucer()
    let enemies = initEnemies(9001, OPEN)
    let saucer: SaucerState = m.initSaucer(9002)
    let sawSaucer = false
    for (let i = 0; i < 3600; i++) {
      const e = stepEnemies(enemies, OPEN, null, DT, ELIGIBLE)
      enemies = e.state
      const s = m.stepSaucer(saucer, OPEN, null, DT, ELIGIBLE)
      saucer = s.state
      if (saucer.saucer !== null) sawSaucer = true
      // Exactly one hostile, alive or exploding, whatever the visitor is doing.
      expect(enemies.hostile).toBeTruthy()
      expect(['alive', 'exploding']).toContain(enemies.hostile.phase)
    }
    // The run must actually exercise coexistence — the visitor showed up.
    expect(sawSaucer).toBe(true)
  })

  it('the enemy side is bit-identical with or without the saucer stepping beside it (independent lifecycles)', async () => {
    const m = await loadSaucer()
    const seed = 4242
    // Run A: enemies alone.
    let alone = initEnemies(seed, OPEN)
    const traceAlone: string[] = []
    for (let i = 0; i < 1200; i++) {
      alone = stepEnemies(alone, OPEN, null, DT, ELIGIBLE).state
      traceAlone.push(JSON.stringify(alone))
    }
    // Run B: same enemy seed, saucer stepping in the same loop.
    let beside = initEnemies(seed, OPEN)
    let s: SaucerState = m.initSaucer(31337)
    const traceBeside: string[] = []
    for (let i = 0; i < 1200; i++) {
      beside = stepEnemies(beside, OPEN, null, DT, ELIGIBLE).state
      s = m.stepSaucer(s, OPEN, null, DT, ELIGIBLE).state
      traceBeside.push(JSON.stringify(beside))
    }
    expect(traceBeside).toEqual(traceAlone)
  })

  it('killing the visitor never spawns, kills, or replaces the hostile (kill interleave vs control)', async () => {
    // Review round-trip 1 rewrite: the old version compared a local variable
    // the code under test could never reach — a tautology. This one makes the
    // kill HAPPEN mid-interleave and demands the hostile trace stay
    // bit-identical to a saucer-free control run.
    const m = await loadSaucer()
    const seed = 7777
    const STEPS = 900 // 15 s: visit spawns ≤12 s in, killed on first alive step
    // Control: the enemy side runs alone.
    let control = initEnemies(seed, OPEN)
    const controlTrace: string[] = []
    for (let i = 0; i < STEPS; i++) {
      control = stepEnemies(control, OPEN, null, DT, ELIGIBLE).state
      controlTrace.push(JSON.stringify(control))
    }
    // Interleaved: same enemy seed while the saucer spawns, takes a shell
    // kill, burns its blast, and clears — beside it. The shell exists only in
    // the saucer's own step call (mirrors main.ts's consumed-shell nulling).
    let enemies = initEnemies(seed, OPEN)
    let s: SaucerState = m.initSaucer(78)
    let killAward = 0
    const liveTrace: string[] = []
    for (let i = 0; i < STEPS; i++) {
      enemies = stepEnemies(enemies, OPEN, null, DT, ELIGIBLE).state
      const shell: Shell | null =
        killAward === 0 && s.saucer !== null && s.saucer.phase === 'alive'
          ? { x: s.saucer.x, z: s.saucer.z, heading: 0, range: 1000 }
          : null
      const r = m.stepSaucer(s, OPEN, shell, DT, ELIGIBLE)
      s = r.state
      killAward += r.scoreAward
      liveTrace.push(JSON.stringify(enemies))
    }
    // The kill really happened — this test may not pass vacuously…
    expect(killAward).toBe(SCORES.saucer)
    // …and the hostile lifecycle never noticed.
    expect(liveTrace).toEqual(controlTrace)
  })
})

describe('determinism — identical seed + dt sequence ⇒ identical lifecycle (epic standing AC, AC-5)', () => {
  // A deliberately uneven dt sequence — determinism must survive frame jitter.
  const DT_CYCLE = [1 / 60, 1 / 30, 1 / 120, 1 / 60] as const

  function fullTrace(m: SaucerModule, seed: number, steps: number): string[] {
    let s = m.initSaucer(seed)
    const trace: string[] = []
    for (let i = 0; i < steps; i++) {
      s = m.stepSaucer(s, OPEN, null, DT_CYCLE[i % DT_CYCLE.length], ELIGIBLE).state
      trace.push(JSON.stringify(s))
    }
    return trace
  }

  it('two runs with the same seed and dt sequence produce identical traces — spawn tick, path, despawn tick', async () => {
    const m = await loadSaucer()
    const steps = Math.ceil((SPAWN_WAIT_S + LIFETIME_S) / (1 / 30))
    expect(fullTrace(m, 12345, steps)).toEqual(fullTrace(m, 12345, steps))
  })

  it('a scripted kill reproduces byte-identically: spawn → kill → blast → despawn → NEXT spawn (rng carry through the blast)', async () => {
    // Review round-trip 1 addition: AC-5 demands identical LIFECYCLES, and the
    // rng draw on the blast-expiry path (the next visit's wait) was never
    // exercised under a two-run comparison before this test.
    const m = await loadSaucer()
    function killTrace(): string[] {
      let s = m.initSaucer(4242)
      let killed = false
      let spawns = 0
      let prevNull = true
      const trace: string[] = []
      // 40 s: first visit ≤12 s in, killed on its first alive step, 1.5 s
      // blast, then the post-blast draw must yield the follow-up visit.
      for (let i = 0; i < Math.ceil(40 / DT); i++) {
        const shell: Shell | null =
          !killed && s.saucer !== null && s.saucer.phase === 'alive'
            ? { x: s.saucer.x, z: s.saucer.z, heading: 0, range: 1000 }
            : null
        const r = m.stepSaucer(s, OPEN, shell, DT, ELIGIBLE)
        if (r.playerShellConsumed) killed = true
        s = r.state
        const nowNull = s.saucer === null
        if (prevNull && !nowNull) spawns += 1
        prevNull = nowNull
        trace.push(JSON.stringify(s))
      }
      // The scripted kill must land and the post-blast rng must produce the
      // next visit — otherwise the trace comparison proves nothing.
      expect(killed).toBe(true)
      expect(spawns).toBeGreaterThanOrEqual(2)
      return trace
    }
    expect(killTrace()).toEqual(killTrace())
  })

  it('stepSaucer never mutates its inputs (frozen state, pose, and shell survive the call)', async () => {
    const m = await loadSaucer()
    const { state, saucer } = spawnLive(m, 88)
    const frozenSaucer = Object.freeze({ ...(saucer as Saucer) })
    const frozenState = Object.freeze({ ...state, saucer: frozenSaucer }) as SaucerState
    const frozenPose = Object.freeze({ ...OPEN })
    const frozenShell = Object.freeze({ x: saucer.x, z: saucer.z, heading: 0, range: 1000 })
    const snapshot = JSON.stringify([frozenState, frozenPose, frozenShell])
    // ESM is strict mode: a mutating write to a frozen object throws.
    const r = m.stepSaucer(frozenState, frozenPose, frozenShell, DT, ELIGIBLE)
    expect(JSON.stringify([frozenState, frozenPose, frozenShell])).toBe(snapshot)
    expect(r.scoreAward).toBe(SCORES.saucer)
  })

  it('same inputs twice ⇒ same outputs (referential transparency)', async () => {
    const m = await loadSaucer()
    const { state } = spawnLive(m, 89)
    const a = m.stepSaucer(state, OPEN, null, DT, ELIGIBLE)
    const b = m.stepSaucer(state, OPEN, null, DT, ELIGIBLE)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })
})

describe('render path — the live saucer projects through the bz1-3 pipeline like any entity', () => {
  it('projectModel(SAUCER, live pose) yields visible segments dead ahead of the camera', async () => {
    const m = await loadSaucer()
    const { saucer } = spawnLive(m, 91)
    // Park the camera 10k behind the live saucer, looking straight at it —
    // inside NEAR_CULL..FAR_CULL, dead center of the 45° cone.
    const camera: TankPose = { x: saucer.x, z: saucer.z - 10_000, heading: 0 }
    const segments = projectModel(
      SAUCER,
      { x: saucer.x, z: saucer.z, orientation: saucer.heading },
      camera,
      16 / 9,
    )
    expect(segments.length).toBeGreaterThan(0)
  })
})
