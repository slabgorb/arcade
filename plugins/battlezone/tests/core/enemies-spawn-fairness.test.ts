// tests/core/enemies-spawn-fairness.test.ts
//
// Story bz2-9 — RED phase (Furiosa / TEA). Playtest bug: the opening isn't
// hard, it's UNFAIR. Two compounding defects in enemies.ts kill the player
// within ~2s with no time to turn or react:
//
//   1. GEOMETRY — spawnHostile draws its bearing as `nextFloat(rng) * TAU`
//      (dis65 spawn ring, enemies.ts:222): a full 360° uniform that never
//      consults player.heading, so ~half of all newcomers materialise in the
//      rear blind spot, behind the forward view cone.
//   2. INSTANT FIRE — every spawn is seated already aimed at the player
//      (heading = bearingTo(player), enemies.ts:229), and the fire gate has no
//      post-spawn delay, so a fresh unit shoots on the very frame it appears.
//
// Two behavioral contracts, one per lever the story names:
//
//   * SPAWN GEOMETRY (AC-1 / AC-2): a newcomer's bearing FROM the player,
//     measured against the player's OWN heading, must fall in the forward
//     hemisphere — never the rear blind spot. We operationalise "forward view
//     cone (or at least a reactable bearing)" as |offset| ≤ π/2: in front of or
//     abeam, never behind (threshold rationale logged as a bz2-9 test-design
//     deviation). Measured against player.heading, not a world axis, on
//     purpose: a fix that merely biased spawns toward +Z would pass a heading-0
//     test yet still spawn behind a turned player.
//
//   * POST-SPAWN FIRE GRACE (AC-1 / AC-3): a just-spawned enemy (phaseAge 0),
//     even perfectly aimed, must NOT fire on the frame it appears — but the
//     grace is BRIEF: a settled enemy still fires, so authentic ROM lethality
//     (the AC-4 difficulty ceiling) is preserved, never softened.
//
// phaseAge — already 0 at spawn, already accumulating dt — is the natural grace
// clock. These tests assert the BEHAVIOR (fresh holds, settled fires), free of
// any exact grace constant, so a playtest true-up of the grace length cannot
// break them. bz2-9 R2 raised the grace to the ROM's ~2 s (rez_protect) and made
// it reset on player RESPAWN too (enemies-respawn-fairness.test.ts); the
// "settled fires" cases here and in enemies-roster.test.ts now settle past ~2 s.

import { describe, it, expect } from 'vitest'
import { FAR_CULL, type TankPose } from '../../src/core/camera'
import {
  initEnemies,
  stepEnemies,
  EXPLOSION_DURATION,
  type EnemyState,
  type Hostile,
} from '../../src/core/enemies'

const DT = 1 / 60
const TAU = Math.PI * 2

/** Forward hemisphere: in front of or abeam the player's facing, never behind. */
const FORWARD_HEMISPHERE = Math.PI / 2
const EPS = 1e-9

/** Open ground far from all 21 ROM obstacles (the enemies.test.ts fixture range),
 *  so the spawn-rejection loop never nudges the placement distribution. */
const FIELD = { x: 200_000, z: 200_000 }

/** A wide spread of seeds (Knuth multiplicative — deterministic, no ambient RNG). */
const SEEDS = Array.from({ length: 96 }, (_, i) => (i * 2_654_435_761) >>> 0)

/** Cardinal AND odd facings — a forward-bias fix must hold for every heading. */
const HEADINGS = [0, 0.7, Math.PI / 2, 1.9, Math.PI - 0.1, -0.5, -Math.PI / 2, -2.3, 3.0]

/** Fold an angle onto (−π, π]. */
function wrapAngle(a: number): number {
  let r = a % TAU
  if (r > Math.PI) r -= TAU
  if (r <= -Math.PI) r += TAU
  return r
}

/** |bearing from the player to the hostile, relative to the player's heading|. */
function spawnOffset(player: TankPose, h: Hostile): number {
  const dir = Math.atan2(h.x - player.x, h.z - player.z)
  return Math.abs(wrapAngle(dir - player.heading))
}

const deg = (rad: number): string => `${((rad * 180) / Math.PI).toFixed(1)}°`

describe('bz2-9 spawn geometry — newcomers never appear in the rear blind spot (AC-1, AC-2)', () => {
  it('the initial spawn lands in the forward hemisphere for every seed and facing', () => {
    const cases = SEEDS.flatMap((seed) =>
      HEADINGS.map((heading) => {
        const player: TankPose = { x: FIELD.x, z: FIELD.z, heading }
        const { hostile } = initEnemies(seed, player)
        return { seed, heading, offset: spawnOffset(player, hostile) }
      }),
    )
    const rear = cases.filter((c) => c.offset > FORWARD_HEMISPHERE + EPS)
    const worst = cases.reduce((m, c) => Math.max(m, c.offset), 0)
    expect(
      rear.length,
      `${rear.length}/${cases.length} initial spawns landed behind the player ` +
        `(worst offset ${deg(worst)} from forward)`,
    ).toBe(0)
  })

  it('the same-step replacement spawn (after an explosion) also stays forward', () => {
    const headings = [0.4, 2.0, -1.6]
    const cases = SEEDS.flatMap((seed) =>
      headings.map((heading) => {
        const player: TankPose = { x: FIELD.x, z: FIELD.z, heading }
        // An explosion one dt from retiring: the next step fires the ROM's
        // no-gap replacement through the same spawn ring under test.
        const dying: Hostile = {
          x: player.x + 20_000,
          z: player.z,
          heading: 0,
          kind: 'tank',
          phase: 'exploding',
          phaseAge: EXPLOSION_DURATION,
        }
        const state: EnemyState = { hostile: dying, shell: null, rng: seed, missilesLaunched: 0 }
        const { state: next } = stepEnemies(state, player, null, DT)
        return { heading, phase: next.hostile.phase, offset: spawnOffset(player, next.hostile) }
      }),
    )
    // Sanity: every case actually produced a fresh live replacement to measure.
    expect(cases.every((c) => c.phase === 'alive'), 'a replacement failed to spawn alive').toBe(true)
    const rear = cases.filter((c) => c.offset > FORWARD_HEMISPHERE + EPS)
    const worst = cases.reduce((m, c) => Math.max(m, c.offset), 0)
    expect(
      rear.length,
      `${rear.length}/${cases.length} replacement spawns landed behind the player ` +
        `(worst offset ${deg(worst)})`,
    ).toBe(0)
  })

  it('spawns stay on the safe ring — an entrance, never a teleport on top of the player', () => {
    // Guard (holds pre- and post-fix): the forward bias must not drag the spawn
    // onto the player (AC-1 "not on top of") nor push it past the far plane.
    for (const seed of SEEDS) {
      for (const heading of HEADINGS) {
        const player: TankPose = { x: FIELD.x, z: FIELD.z, heading }
        const { hostile } = initEnemies(seed, player)
        const d = Math.hypot(hostile.x - player.x, hostile.z - player.z)
        expect(d, `seed ${seed}: spawn too close to the player`).toBeGreaterThan(8_000)
        expect(d, `seed ${seed}: spawn beyond the far plane`).toBeLessThan(FAR_CULL)
      }
    }
  })
})

// --- Post-spawn fire grace ---------------------------------------------------
//
// Driven through the REAL spawn path (initEnemies) so these hold whatever fields
// a Hostile carries: a fresh spawn is aimed at the player, so on today's code it
// fires on frame 1. Aging it (phaseAge spread) is the only change between the
// "holds" and "fires" cases — isolating the grace as a function of freshness.

/** A freshly spawned enemy and the pose it spawned against. */
function freshSpawn(seed: number, heading = 0): { player: TankPose; state: EnemyState } {
  const player: TankPose = { x: FIELD.x, z: FIELD.z, heading }
  return { player, state: initEnemies(seed, player) }
}

/** The same enemy, but with the post-spawn grace clock wound past any brief grace. */
function settled(state: EnemyState, phaseAge: number): EnemyState {
  return { ...state, hostile: { ...state.hostile, phaseAge } }
}

describe('bz2-9 post-spawn fire grace — a newcomer cannot fire on the frame it appears (AC-1, AC-3)', () => {
  it('a brand-new spawn does not fire on its first frame, for any seed', () => {
    for (const seed of SEEDS) {
      const { player, state } = freshSpawn(seed, 1.2)
      const r = stepEnemies(state, player, null, DT)
      expect(r.state.shell, `seed ${seed}: the freshly spawned enemy fired on frame 1`).toBeNull()
    }
  })

  it('the SAME spawn, aged past the grace, fires at once — freshness gates the shot, not a blanket cease-fire', () => {
    // The aimed newcomer stays lethal once settled: proves the grace is brief
    // and preserves the ROM difficulty ceiling (AC-4).
    const { player, state } = freshSpawn(9, 0)
    // bz2-9 R2 raised the spawn grace to ~2 s (ROM rez_protect); settle at 3 s,
    // clearly past it, so this stays a "settled tank still shoots" assertion.
    const r = stepEnemies(settled(state, 3), player, null, DT)
    expect(r.state.shell, 'a settled, aimed enemy still shoots').not.toBeNull()
  })

  it('the grace spans a real reaction window — no shot in the first 0.25 s', () => {
    let { player, state } = freshSpawn(9, 0)
    for (let t = 0; t < 0.25 - EPS; t += DT) {
      const r = stepEnemies(state, player, null, DT)
      expect(r.state.shell, `must hold fire during the post-spawn grace (t≈${t.toFixed(3)}s)`).toBeNull()
      state = r.state
    }
  })

  it('the grace is BRIEF — the aimed newcomer still opens fire within a few seconds (ceiling intact)', () => {
    let { player, state } = freshSpawn(9, 0)
    let fired = false
    for (let t = 0; t < 3; t += DT) {
      const r = stepEnemies(state, player, null, DT)
      if (r.state.shell !== null) {
        fired = true
        break
      }
      state = r.state
    }
    expect(fired, 'the grace must lift — a permanent cease-fire would gut the duel').toBe(true)
  })
})
