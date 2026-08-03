// tests/core/destroyed-shot-burst.test.ts
//
// Story sw8-3 — the lingering destroy-burst when a fireball is shot down (RED phase,
// O'Brien / TEA). The CORE half of the story.
//
// Today a fireball the player shoots down is a SILENT-DELETE at the *visual* level:
// sim.ts removes it from `enemyShots`, scores FIREBALL_SCORE and emits a positioned
// `fireball-destroyed` event (sim.ts:509) — but nothing lingers on screen. The
// playtest report (epic sw8, observation #8, "Fireball leaves no lingering image")
// wants a brief sparkle where the fireball dies, exactly as the ROM's alien-gun-shot
// sparkle (GNB/GNT, WSVROM.MAC) reads on the cabinet.
//
// This suite drives the CORE contract the story context prescribes by NAME (the
// design fixes the shape, unlike sw3-8's seam-agnostic DyingTie): a `destroyedShots`
// list on GameState carrying `{ pos, age }`, mirroring `dyingTies` exactly —
//   * spawned at age 0 at the fireball's own world position when it is shot down,
//   * aged by `dt` each frame,
//   * dropped once age passes `FIREBALL_DESTROY_BURST_SECONDS` (a NEW core constant),
//   * wiped on phase entry (`enterPhase`), like dyingTies/groundDebris,
// all through the pure surface `stepGame(state, input, dt) → state`, no DOM, no clock
// but `dt`, no randomness but the seeded RNG in state.
//
// EXPECTED TO FAIL until GREEN adds `DestroyedShot`, `GameState.destroyedShots`, the
// `FIREBALL_DESTROY_BURST_SECONDS` constant, the spawn/age in sim.ts, and the reset in
// enterPhase. Constants are referenced BY NAME so the suite survives GREEN's lifetime
// tuning (whatever ~0.1–0.2 s feel value the sparkle wants).

import { describe, it, expect } from 'vitest'
import {
  initialState,
  ENEMY_SHOT_TTL,
  // NEW in GREEN — the sparkle's on-screen lifetime, a core constant beside
  // TIE_DEATH_SECONDS / ENEMY_SHOT_TTL in src/core/state.ts. Undefined in RED.
  FIREBALL_DESTROY_BURST_SECONDS,
  type GameState,
  type Projectile,
} from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { fireAt, release } from '../support/aim'
import type { FireballDestroyedEvent } from '../../src/core/events'
import type { Vec3 } from '@shared/math3d'

// Well downrange of the cockpit (outside COCKPIT_HIT_RADIUS = 80) so a kill here is
// unambiguously "before it reaches the cockpit", never a cockpit collision. Mirrors
// tests/core/shootable-fireballs.test.ts.
const DOWNRANGE: Vec3 = [0, 0, -400]

// A fireball flies back toward the cockpit (+Z); at the tiny TICK below it barely
// moves, so it stays inside the hit sphere it starts in.
const fireball = (pos: Vec3): Projectile => ({ pos, vel: [0, 0, 1], ttl: ENEMY_SHOT_TTL })

/** A fresh wave with the sky held EMPTY and QUIET — no live TIEs, no spawns, no enemy
 *  fire — so the only thing that can change the scene is the player's own trigger and
 *  the burst aging. initialState already starts in 'space' with the gun ready. */
const quietWave = (seed = 1983): GameState => ({
  ...initialState(seed),
  enemies: [],
  spawnTimer: 1e9,
  enemyFireCooldown: 1e9,
})

/** A single step short enough that a fireball stays put for the hit-test. */
const TICK = 0.001
/** An ordinary 60 fps frame, for aging the burst forward. */
const DT = 1 / 60

/** Shoot down a lone fireball at DOWNRANGE in one frame and return the kill state. */
const killAFireball = (seed = 1983): GameState => {
  const s0: GameState = { ...quietWave(seed), enemyShots: [fireball(DOWNRANGE)] }
  return stepGame(s0, fireAt(s0, DOWNRANGE), TICK)
}

describe('sw8-3 — GameState carries a destroyedShots burst list (AC1)', () => {
  it('a fresh game starts with an empty destroyedShots list', () => {
    // Like dyingTies/groundDebris: present and empty from initialState, not undefined.
    expect(initialState(1983).destroyedShots).toEqual([])
  })
})

describe('sw8-3 — shooting a fireball down spawns a burst (AC2)', () => {
  it('adds exactly one burst when a fireball is destroyed', () => {
    const kill = killAFireball()
    // Fixture sanity: the fireball really was shot down (not left in flight).
    expect(kill.enemyShots, 'the fireball really was intercepted').toHaveLength(0)
    // GREEN: one sparkle spawned. RED: destroyedShots is undefined → fails.
    expect(kill.destroyedShots).toHaveLength(1)
  })

  it('spawns the burst at the fireball’s own world position — the same point as the cue', () => {
    const kill = killAFireball()
    const cue = kill.events.find((e): e is FireballDestroyedEvent => e.type === 'fireball-destroyed')
    expect(cue, 'the kill emits its positioned cue').toBeDefined()
    // Coordinate-free: the burst sits exactly where the fireball-destroyed cue does,
    // i.e. the fireball's captured position — not the cockpit origin. Ties the two
    // representations together without hard-coding the homing-decayed z.
    expect(kill.destroyedShots[0].pos).toEqual(cue!.pos)
    expect(kill.destroyedShots[0].pos[2], 'downrange near its launch, not at the cockpit').toBeLessThan(-350)
  })

  it('spawns the burst at age ~0 (this frame’s kill, not yet aged)', () => {
    const kill = killAFireball()
    const age = kill.destroyedShots[0].age
    expect(age).toBeGreaterThanOrEqual(0)
    expect(age, 'a just-spawned sparkle has barely aged').toBeLessThan(DT)
  })

  it('does NOT spawn a burst for a fireball nobody hits', () => {
    // The control that keeps the spawn honest: an untouched fireball leaves no sparkle.
    const s0: GameState = { ...quietWave(), enemyShots: [fireball(DOWNRANGE)] }
    const s1 = stepGame(s0, NO_INPUT, TICK)
    expect(s1.enemyShots, 'the fireball is untouched').toHaveLength(1)
    expect(s1.destroyedShots ?? []).toHaveLength(0)
  })
})

describe('sw8-3 — the burst ages and is transient (AC3)', () => {
  it('exposes a positive named lifetime constant', () => {
    // Beside TIE_DEATH_SECONDS / ENEMY_MUZZLE_FLASH_SECONDS: one named place for the
    // sparkle's on-screen duration. Keeps the aging tests non-vacuous (a 0 lifetime
    // would make "drops past its lifetime" pass trivially).
    expect(FIREBALL_DESTROY_BURST_SECONDS).toBeGreaterThan(0)
  })

  it('ages the burst by dt each frame', () => {
    const kill = killAFireball()
    expect(kill.destroyedShots, 'a burst is burning').toHaveLength(1)
    const age0 = kill.destroyedShots[0].age
    // Coast one ordinary frame, trigger up, empty sky — only the burst can change.
    const aged = stepGame(kill, NO_INPUT, DT)
    expect(aged.destroyedShots, 'still burning a frame later').toHaveLength(1)
    expect(aged.destroyedShots[0].age).toBeCloseTo(age0 + DT, 5)
  })

  it('drops the burst once it passes FIREBALL_DESTROY_BURST_SECONDS — no permanent sparkle', () => {
    let s = killAFireball()
    expect(s.destroyedShots, 'a burst is burning at the kill').toHaveLength(1)
    // Run well past the lifetime with an empty sky; the sparkle must clear.
    const steps = Math.ceil(FIREBALL_DESTROY_BURST_SECONDS / DT) + 5
    for (let i = 0; i < steps; i++) s = stepGame(s, NO_INPUT, DT)
    expect(s.destroyedShots, 'the burst is transient — gone past its lifetime').toHaveLength(0)
  })
})

describe('sw8-3 — the burst never crosses a phase boundary (AC6)', () => {
  it('wipes destroyedShots on phase entry, like dyingTies and groundDebris', () => {
    // A leftover sparkle must not rain into the surface/trench. Build a state that
    // WOULD carry one through `...s` if enterPhase forgot to reset it.
    const withBurst = {
      ...quietWave(),
      destroyedShots: [{ pos: [0, 0, -400] as Vec3, age: 0 }],
    } as GameState
    const next = enterPhase(withBurst, 'surface')
    expect(next.destroyedShots ?? []).toHaveLength(0)
  })
})

describe('sw8-3 — core/shell purity & determinism (AC10)', () => {
  it('does not mutate the input state when spawning a burst', () => {
    const base = quietWave()
    const shots = [fireball(DOWNRANGE)]
    const s0: GameState = { ...base, enemyShots: shots }
    const s1 = stepGame(s0, fireAt(s0, DOWNRANGE), TICK)
    // Purity is tested through a WRITE: a burst really spawned in the OUTPUT…
    expect(s1.destroyedShots, 'a burst really spawned').toHaveLength(1)
    // …while the INPUT's arrays are untouched — same reference, and no burst leaked
    // back onto the state we passed in.
    expect(s0.enemyShots).toBe(shots)
    expect(s0.enemyShots).toHaveLength(1)
    expect(s0.destroyedShots ?? []).toHaveLength(0)
  })

  it('identical seeds and inputs yield identical states through a fireball kill', () => {
    const setup = (seed: number): GameState => ({ ...quietWave(seed), enemyShots: [fireball(DOWNRANGE)] })
    let a = setup(42)
    let b = setup(42)
    const shot = fireAt(a, DOWNRANGE)
    // One pull, then coast with the trigger up — the identical script both runs see.
    for (let i = 0; i < 6; i++) {
      const input = i === 0 ? shot : release(shot)
      a = stepGame(a, input, TICK)
      b = stepGame(b, input, TICK)
    }
    expect(a.destroyedShots, 'the kill really spawned a burst we are comparing').toHaveLength(1)
    expect(a).toEqual(b)
  })
})
