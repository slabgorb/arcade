// tests/core/events.test.ts
//
// Story bz1-11 — RED phase (Furiosa / TEA). The pure-core GameEvent channel:
// `stepGame` emits a fresh list of DATA events on `state.events` each step,
// describing the gameplay moments the shell's audio engine reacts to. Mirrors
// star-wars's core/events.ts pattern (context-story-bz1-11.md: reuse, don't
// reinvent) — a discriminated union narrowed by `type`, appended fresh each
// step, never callbacks.
//
// Event kinds under test (only what landed stories actually produce):
//   shot-fired       — bz1-5: the cannon fired (playerShell null → non-null)
//   enemy-destroyed  — bz1-7/8/9: a hostile or the saucer was killed
//   player-hit       — bz1-7: the enemy's shell reached the player
//   hostile-spawn    — bz1-7/8: the replacement hostile entered the field
//   saucer-present   — bz1-9: the visitor arrived (warble start)
//   saucer-gone      — bz1-9: the visitor stopped being alive (warble stop)
//   motion-blocked   — bz3-10 (U-010): BOING's trigger, review round 2
//   enemy-in-range   — bz3-10 (U-008): WARNG's trigger, review round 2
//
// Fixture pattern is the house one from lives.test.ts / enemies.test.ts:
// craft a shell just short of its target on open ground and let one 60 Hz
// step register the swept hit. core/events.ts is absent pre-GREEN —
// `state.events` coming back undefined is the RED signal.
//
// Review round 2 (HIGH): the two describe blocks near the end of this file —
// 'motion-blocked' and 'enemy-in-range' — are the non-vacuous, real-stepGame
// proof the Reviewer found missing: deleting sim.ts's emission OR its latch
// check (so the cue fires every frame instead of on the 0→1 edge) must fail
// one of these, not just the dispatch-mapping unit test in
// tests/shell/audio-cue-triggers.test.ts (which only proves the map, not that
// core ever calls it right).
import { describe, it, expect } from 'vitest'
import { initGame, SPAWN_POSE, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'
import type { TankPose } from '../../src/core/camera'
import { OBSTACLES } from '../../src/core/obstacles'
import { ENEMY_ALERT_RANGE } from '../../src/core/alerts'

const DT = 1 / 60
// bz3-5 / F-008: the object-kill blast is now the ROM's 6-piece gravity
// debris sim (~2.8-3.0 s, physics-driven), not the old fixed 1.5 s timer —
// generous slack over debris.test.ts's own 2.5-3.4 s band.
const BLAST_MAX_SECONDS = 3.6
const START: Input = { ...NO_INPUT, start: true }
const FIRE: Input = { ...NO_INPUT, fire: true }

const step = (s: GameState, input: Input = NO_INPUT) => stepGame(s, input, DT)

/** A fresh run, in play (house helper from lives.test.ts). */
const freshRun = (seed = 7): GameState => stepGame(initGame(seed), START, DT)

/** Move the duel to open ground (the enemies.test.ts fixture coordinates —
 *  far from all 21 obstacles) and park the player's shell on the hostile:
 *  the next step is a kill. */
function withKillPending(s: GameState): GameState {
  const hostile = { ...s.enemies.hostile, x: 240_000, z: 240_000, phase: 'alive' as const }
  return {
    ...s,
    enemies: { ...s.enemies, hostile, shell: null },
    playerShell: { x: hostile.x, z: hostile.z - 200, heading: 0, range: 0 },
  }
}

/** Enemy shell one swept step from the player — the next step is a death. */
function withInboundEnemyShell(s: GameState): GameState {
  return {
    ...s,
    enemies: {
      ...s.enemies,
      shell: { x: s.player.x, z: s.player.z - 200, heading: 0, range: 0 },
    },
  }
}

/** Saucer-eligible run: score past the 2000 gate, spawn clock about to fire. */
function withSaucerDue(s: GameState): GameState {
  return {
    ...s,
    score: 2500,
    saucer: { ...s.saucer, saucer: null, spawnWait: DT / 2 },
  }
}

/** A live saucer parked on open ground with the player's shell 200 short of
 *  it, and the hostile parked 40k units away so it cannot claim the shell
 *  first (bz1-9 precedence: the hostile sees the shell before the saucer). */
function withSaucerKillPending(s: GameState): GameState {
  const hostile = { ...s.enemies.hostile, x: 240_000, z: 240_000, phase: 'alive' as const }
  return {
    ...s,
    score: 2500,
    enemies: { ...s.enemies, hostile, shell: null },
    saucer: {
      ...s.saucer,
      saucer: { x: 240_000, z: 200_000, heading: 0, phase: 'alive' as const, phaseAge: 0 },
    },
    playerShell: { x: 240_000, z: 199_800, heading: 0, range: 0 },
  }
}

const typesOf = (s: GameState): string[] => (s.events ?? []).map((e) => e.type)

describe('the event channel exists and stays pure data', () => {
  it('boots with an empty event list', () => {
    expect(initGame(7).events).toEqual([])
  })

  it('events are plain JSON data — no functions, no class instances', () => {
    // Collect a busy step (a kill) and round-trip it: DATA events survive
    // JSON identically; a callback or class instance would not.
    const killed = step(withKillPending(freshRun()))
    expect(killed.events.length).toBeGreaterThan(0)
    for (const e of killed.events) {
      expect(typeof e.type).toBe('string')
      expect(JSON.parse(JSON.stringify(e))).toEqual(e)
    }
  })

  it('stepGame never mutates the input state’s event list', () => {
    const s = step(withKillPending(freshRun()))
    const before = JSON.stringify(s.events)
    step(s)
    step(s, FIRE)
    expect(JSON.stringify(s.events)).toBe(before)
  })

  it('the list is FRESH each step — a quiet step emits nothing, not leftovers', () => {
    // A kill step emits; the following coast step (blast burning down, no
    // gameplay moment) must come back empty, not carry the kill forward.
    const killed = step(withKillPending(freshRun()))
    expect(killed.events.length).toBeGreaterThan(0)
    const coast = step(killed)
    expect(coast.events).toEqual([])
  })
})

describe('shot-fired — the cannon report cue (bz1-5 slot rule)', () => {
  it('fires exactly one shot-fired on the step the shell leaves the barrel', () => {
    const s = freshRun()
    expect(s.playerShell).toBeNull()

    const fired = step(s, FIRE)
    expect(fired.playerShell, 'staging: the shell must actually spawn').not.toBeNull()
    expect(typesOf(fired).filter((t) => t === 'shot-fired')).toHaveLength(1)
  })

  it('does NOT re-fire while the one shell is still in flight (held trigger)', () => {
    const fired = step(freshRun(), FIRE)
    const held = step(fired, FIRE)
    // Precondition: the shell is still out (max range 32512 ≫ one step).
    expect(held.playerShell, 'staging: shell should still be in flight').not.toBeNull()
    expect(typesOf(held)).not.toContain('shot-fired')
  })
})

describe('enemy-destroyed — the explosion cue (bz1-7 kill)', () => {
  it('emits enemy-destroyed with the dead hostile’s kind on the kill step', () => {
    const staged = withKillPending(freshRun())
    const kind = staged.enemies.hostile.kind
    const killed = step(staged)

    expect(killed.enemies.hostile.phase, 'staging: the hit must register').toBe('exploding')
    const deaths = killed.events.filter((e) => e.type === 'enemy-destroyed')
    expect(deaths).toHaveLength(1)
    expect(deaths[0]).toMatchObject({ type: 'enemy-destroyed', kind })
  })

  it('emits it exactly once — the blast burning down is not a second kill', () => {
    const killed = step(withKillPending(freshRun()))
    let s = killed
    let extra = 0
    for (let i = 0; i < 30; i++) {
      s = step(s)
      extra += typesOf(s).filter((t) => t === 'enemy-destroyed').length
    }
    expect(extra).toBe(0)
  })
})

describe('player-hit — the player-side explosion cue (bz1-7 signal)', () => {
  it('emits player-hit on the step the enemy shell reaches the player', () => {
    const out = step(withInboundEnemyShell(freshRun()))
    expect(out.lives, 'staging: the death must register').toBeLessThan(freshRun().lives)
    expect(typesOf(out).filter((t) => t === 'player-hit')).toHaveLength(1)
  })

  it('still emits player-hit on the FINAL death — the game-over step keeps its cue', () => {
    const lastLife: GameState = { ...freshRun(), lives: 1 }
    const out = step(withInboundEnemyShell(lastLife))
    expect(out.mode, 'staging: final death ends the run').toBe('gameover')
    expect(typesOf(out)).toContain('player-hit')
  })
})

describe('hostile-spawn — the replacement entering the field (bz1-7 no-gap rule)', () => {
  it('emits hostile-spawn exactly once, on the step the replacement goes live', () => {
    // Kill, then walk the blast down: the bz3-5 debris physics' ~2.8-3.0 s of
    // coast steps, then the "always one hostile" replacement (findings §2).
    let s = step(withKillPending(freshRun()))
    expect(s.enemies.hostile.phase).toBe('exploding')

    const maxSteps = Math.ceil(BLAST_MAX_SECONDS / DT) + 30
    let spawnStepEvents: readonly string[] | null = null
    let spawnCount = 0
    for (let i = 0; i < maxSteps && spawnStepEvents === null; i++) {
      const prevPhase = s.enemies.hostile.phase
      s = step(s)
      spawnCount += typesOf(s).filter((t) => t === 'hostile-spawn').length
      if (prevPhase === 'exploding' && s.enemies.hostile.phase === 'alive') {
        spawnStepEvents = typesOf(s)
      }
    }

    expect(spawnStepEvents, 'staging: the replacement must spawn').not.toBeNull()
    expect(spawnStepEvents).toContain('hostile-spawn')
    expect(spawnCount, 'exactly one spawn event across the whole window').toBe(1)
  })

  it('carries the spawned hostile’s kind — self-consistent with the state', () => {
    let s = step(withKillPending(freshRun()))
    const maxSteps = Math.ceil(BLAST_MAX_SECONDS / DT) + 30
    for (let i = 0; i < maxSteps; i++) {
      const prevPhase = s.enemies.hostile.phase
      s = step(s)
      if (prevPhase === 'exploding' && s.enemies.hostile.phase === 'alive') {
        const spawn = s.events.find((e) => e.type === 'hostile-spawn')
        expect(spawn).toBeDefined()
        expect(spawn).toMatchObject({ kind: s.enemies.hostile.kind })
        return
      }
    }
    expect.unreachable('the replacement hostile never spawned')
  })
})

describe('saucer-present / saucer-gone — the warble’s start and stop (bz1-9)', () => {
  it('emits saucer-present on the step the visitor arrives', () => {
    let s = withSaucerDue(freshRun())
    let arrivalEvents: readonly string[] | null = null
    for (let i = 0; i < 10 && arrivalEvents === null; i++) {
      const wasEmpty = s.saucer.saucer === null
      s = step(s)
      expect(typesOf(s)).not.toContain('saucer-gone')
      if (wasEmpty && s.saucer.saucer !== null) arrivalEvents = typesOf(s)
    }
    expect(arrivalEvents, 'staging: the saucer must spawn within the window').not.toBeNull()
    expect(arrivalEvents).toContain('saucer-present')
  })

  it('emits saucer-gone AND enemy-destroyed(saucer) on the kill step — the warble dies with it', () => {
    const staged = withSaucerKillPending(freshRun())
    const killed = step(staged)

    expect(killed.saucer.saucer?.phase, 'staging: the hit must register').toBe('exploding')
    expect(typesOf(killed)).toContain('saucer-gone')
    const deaths = killed.events.filter((e) => e.type === 'enemy-destroyed')
    expect(deaths).toHaveLength(1)
    expect(deaths[0]).toMatchObject({ kind: 'saucer' })
  })

  it('never emits saucer-present while the field stays empty below the gate', () => {
    let s = freshRun() // score 0 — below the 2000 eligibility gate
    for (let i = 0; i < 60; i++) {
      s = step(s)
      expect(typesOf(s)).not.toContain('saucer-present')
    }
  })
})

describe('saucer natural departure — the warble must end without a kill (review rework)', () => {
  it('emits saucer-gone WITHOUT enemy-destroyed when the visitor simply leaves', () => {
    // Review finding [MEDIUM]: only the kill path was covered. Age a live
    // visitor with no shell anywhere near it; the visit clock (bz1-9) sends
    // it home — that step must close the warble but award nothing.
    let s: GameState = {
      ...freshRun(),
      score: 2500,
      enemies: {
        ...freshRun().enemies,
        hostile: { ...freshRun().enemies.hostile, x: 240_000, z: 240_000, phase: 'alive' as const },
        shell: null,
      },
      saucer: {
        ...freshRun().saucer,
        saucer: { x: 200_000, z: 200_000, heading: 0, phase: 'alive' as const, phaseAge: 0 },
      },
      playerShell: null,
    }

    const maxSteps = Math.ceil(30 / DT) // visit clocks are seconds-scale; 30 s is a hard ceiling
    for (let i = 0; i < maxSteps; i++) {
      const hadLive = s.saucer.saucer?.phase === 'alive'
      s = step(s)
      const nowLive = s.saucer.saucer?.phase === 'alive'
      expect(typesOf(s), 'no shell in flight — nothing can die').not.toContain('enemy-destroyed')
      if (hadLive && !nowLive) {
        expect(typesOf(s), 'the departure step must close the warble').toContain('saucer-gone')
        return
      }
      expect(typesOf(s)).not.toContain('saucer-gone')
    }
    expect.unreachable('the visitor never departed — staging or visit clock broken')
  })
})

describe('mutual kill — both cues on the same tick (review rework)', () => {
  // Review finding [MEDIUM]: hostile dies AND the player is hit in ONE step;
  // both events thread the same list through the respawn/gameover branches.
  const mutual = (lives: number): GameState =>
    withInboundEnemyShell({ ...withKillPending(freshRun()), lives })

  it('respawn variant: enemy-destroyed AND player-hit both survive the branch', () => {
    const out = step(mutual(3))
    expect(out.mode, 'staging: tanks remain — the run rolls on').toBe('playing')
    expect(out.enemies.hostile.phase, 'staging: the hostile must die').toBe('exploding')
    expect(typesOf(out)).toContain('enemy-destroyed')
    expect(typesOf(out)).toContain('player-hit')
  })

  it('final-death variant: the game-over step still carries both cues', () => {
    const out = step(mutual(1))
    expect(out.mode, 'staging: last tank — the run ends').toBe('gameover')
    expect(out.enemies.hostile.phase, 'staging: the hostile must die').toBe('exploding')
    expect(typesOf(out)).toContain('enemy-destroyed')
    expect(typesOf(out)).toContain('player-hit')
  })
})

describe('motion-blocked — the BOING rising-edge trigger (bz3-10 / U-010, review rework)', () => {
  // Drive straight at a REAL ROM obstacle (obstacles.ts) from clear ground
  // until the bz1-4 movement hard-stop actually catches it — the exact
  // isMotionBlocked/OBJCOL condition BOING keys on. This is the real
  // stepGame/stepBattle scenario the Reviewer found missing: a dispatch-level
  // unit test (audio-cue-triggers.test.ts) can't prove core ever emits this,
  // or emits it only once.
  const FORWARD: Input = { ...NO_INPUT, leftTread: 1, rightTread: 1 }
  const OBSTACLE = OBSTACLES[0]
  const RANGE_OUT = Math.hypot(OBSTACLE.x, OBSTACLE.z)
  const UX = OBSTACLE.x / RANGE_OUT
  const UZ = OBSTACLE.z / RANGE_OUT
  // Start well outside the ring, aimed straight back in at the centre — the
  // movement.test.ts obstacle-collision fixture's own approach geometry.
  const APPROACH: TankPose = {
    x: OBSTACLE.x + UX * 12_000,
    z: OBSTACLE.z + UZ * 12_000,
    heading: Math.atan2(-UX, -UZ),
  }

  /** Force the hostile out of the way — 'exploding' and shell-less — so it
   *  can NEVER revive, chase, or fire mid-drive: the blast+respawn cycle
   *  (~2.8-3.6 s) is shorter than this approach (~4 s at MAX_SPEED), so
   *  without re-neutralising every step a fresh hostile could spawn and hit
   *  the player, respawning it away from the wall and breaking the fixture. */
  function neutralizeHostile(s: GameState): GameState {
    return {
      ...s,
      enemies: {
        ...s.enemies,
        hostile: { ...s.enemies.hostile, phase: 'exploding' as const },
        shell: null,
      },
    }
  }

  /** A fresh run parked on the approach, hostile neutralised. */
  function approachRun(): GameState {
    return neutralizeHostile({ ...freshRun(), player: APPROACH })
  }

  /** One drive step, re-neutralising the hostile immediately after. */
  function driveStep(s: GameState, input: Input = FORWARD): GameState {
    return neutralizeHostile(step(s, input))
  }

  /** Drive full-forward until the bz1-4 hard-stop actually catches (the same
   *  `moved < 1e-3` the core predicate itself uses), or the budget runs out. */
  function driveToWall(s: GameState, maxSteps = 500): GameState {
    let cur = s
    for (let i = 0; i < maxSteps; i++) {
      const next = driveStep(cur)
      const moved = Math.hypot(next.player.x - cur.player.x, next.player.z - cur.player.z)
      if (moved < 1e-3) return next
      cur = next
    }
    throw new Error('staging: never reached the wall — approach geometry broke')
  }

  it('fires motion-blocked on the exact step the hard-stop first catches, never before', () => {
    let cur = approachRun()
    let firstBlockedTypes: readonly string[] | null = null
    for (let i = 0; i < 500 && firstBlockedTypes === null; i++) {
      const prevPose = cur.player
      cur = driveStep(cur)
      const moved = Math.hypot(cur.player.x - prevPose.x, cur.player.z - prevPose.z)
      if (moved < 1e-3) {
        firstBlockedTypes = typesOf(cur)
      } else {
        expect(typesOf(cur), 'still making progress this step — must not fire yet').not.toContain(
          'motion-blocked',
        )
      }
    }
    expect(firstBlockedTypes, 'staging: the approach must actually hit the wall').not.toBeNull()
    expect(firstBlockedTypes).toContain('motion-blocked')
  })

  it('does NOT re-fire the next step while still pressed against the wall (level, not edge)', () => {
    const wall = driveToWall(approachRun())
    expect(typesOf(wall), 'staging: must already be blocked').toContain('motion-blocked')
    const held = driveStep(wall)
    expect(typesOf(held), 'still jammed next frame — must not refire').not.toContain('motion-blocked')
    expect(held.motionBlockedLatch).toBe(true)
  })

  it('re-fires after releasing the tread and driving forward again (a second edge)', () => {
    const wall = driveToWall(approachRun())
    expect(typesOf(wall)).toContain('motion-blocked')
    const released = driveStep(wall, NO_INPUT) // no translate intent — the latch must clear
    expect(released.motionBlockedLatch, 'releasing clears the latch').toBe(false)
    expect(typesOf(released)).not.toContain('motion-blocked')
    const pressedAgain = driveStep(released)
    expect(
      typesOf(pressedAgain),
      'releasing then re-pressing forward must re-arm the edge, not stay silenced',
    ).toContain('motion-blocked')
  })
})

describe('enemy-in-range — the WARNG rising-edge trigger (bz3-10 / U-008, review rework)', () => {
  // A live hostile pinned dead-ahead of the player (heading 0 → forward is
  // +Z, camera.ts) and within ENEMY_ALERT_RANGE (core/alerts.ts) satisfies
  // isEnemyInRange exactly. Re-pinning every step isolates the rising-edge
  // logic in sim.ts from the AI's own drive — the real stepGame/stepBattle
  // path the Reviewer found untested, not a synthetic dispatch call.
  const IN_RANGE = ENEMY_ALERT_RANGE / 4 // well inside, dead ahead
  const OUT_OF_RANGE = ENEMY_ALERT_RANGE * 3 // well outside

  function withHostileAhead(s: GameState, dz: number): GameState {
    return {
      ...s,
      enemies: {
        ...s.enemies,
        hostile: { ...s.enemies.hostile, x: s.player.x, z: s.player.z + dz, phase: 'alive' as const },
      },
    }
  }

  it('fires enemy-in-range on the step range+alignment first both hold', () => {
    const staged = withHostileAhead(freshRun(), OUT_OF_RANGE)
    expect(typesOf(staged)).not.toContain('enemy-in-range') // staging: starts out of range

    const entered = step(withHostileAhead(staged, IN_RANGE))
    expect(
      typesOf(entered),
      'the rising edge must fire the moment range and alignment both hold',
    ).toContain('enemy-in-range')
    expect(entered.enemyInRangeLatch, 'staging: the latch itself must flip').toBe(true)
  })

  it('does NOT re-fire the next step while the hostile stays in range (level, not edge)', () => {
    let s = step(withHostileAhead(withHostileAhead(freshRun(), OUT_OF_RANGE), IN_RANGE))
    expect(typesOf(s)).toContain('enemy-in-range')
    const held = step(withHostileAhead(s, IN_RANGE))
    expect(typesOf(held), 'still in range next frame — must not refire').not.toContain('enemy-in-range')
  })

  it('re-fires after the hostile drops out of range and re-enters (a second edge)', () => {
    let s = step(withHostileAhead(freshRun(), IN_RANGE))
    expect(typesOf(s)).toContain('enemy-in-range')

    s = step(withHostileAhead(s, OUT_OF_RANGE))
    expect(typesOf(s), 'dropping out of range must not fire').not.toContain('enemy-in-range')
    expect(s.enemyInRangeLatch, 'the latch must clear on the drop').toBe(false)

    const reentered = step(withHostileAhead(s, IN_RANGE))
    expect(
      typesOf(reentered),
      'dropping out and back in must re-arm the edge, not stay silenced',
    ).toContain('enemy-in-range')
  })

  it('respawn clears the stale latch — a fresh spawn born in range re-fires WARNG (review rework, MEDIUM)', () => {
    // Stage: the latch is ALREADY armed (true) heading into the death step —
    // sim.ts:245-246 used to carry that stale value straight through the
    // teleport to SPAWN_POSE, silently suppressing the very next edge.
    let s = step(withHostileAhead(freshRun(), IN_RANGE))
    expect(s.enemyInRangeLatch, 'staging: latch must already be armed before the death step').toBe(
      true,
    )
    expect(s.lives, 'staging: a non-fatal hit must respawn, not end the run').toBeGreaterThan(1)

    // The death step: an inbound enemy shell reaches the player THIS step
    // (events.test.ts's own house fixture), while the hostile stays pinned
    // dead-ahead of the ORIGIN too — the exact "respawns still in range" shape.
    const dying = withInboundEnemyShell(withHostileAhead(s, IN_RANGE))
    const died = step(dying)
    expect(died.player, 'staging: the death step must respawn to the origin').toEqual(SPAWN_POSE)

    // Re-pin the hostile dead-ahead of the origin and take the very next
    // step: the fresh spawn is already in danger, so WARNG must sound — a
    // stale `true` latch from the pre-hit pose would silently swallow it.
    const next = step(withHostileAhead(died, IN_RANGE))
    expect(
      typesOf(next),
      'a fresh spawn born in range must re-fire the alarm, not inherit a stale latch',
    ).toContain('enemy-in-range')
  })
})

describe('game-over hold and determinism (story AC)', () => {
  it('the game-over hold is silent — no events while the screen freezes', () => {
    const lastLife: GameState = { ...freshRun(), lives: 1 }
    const over = step(withInboundEnemyShell(lastLife))
    expect(over.mode).toBe('gameover')

    const hold = step(over)
    expect(hold.mode, 'staging: still holding, not yet cycled').toBe('gameover')
    expect(hold.events).toEqual([])
  })

  it('a fixed seed + input script yields an IDENTICAL event stream, twice over', () => {
    // The determinism AC: the audio channel must not perturb the sim, and the
    // stream itself must replay exactly. Scripted pot-shots guarantee the log
    // is non-empty — determinism over an empty log would prove nothing.
    const script = (i: number): Input => ({
      leftTread: 0.5 + 0.5 * Math.sin(i / 17),
      rightTread: 0.5 + 0.5 * Math.cos(i / 23),
      fire: i % 37 === 0,
      start: false,
    })

    const runLog = (): string => {
      let s = freshRun(1234)
      const log: string[] = []
      for (let i = 0; i < 600; i++) {
        s = stepGame(s, script(i), DT)
        log.push(JSON.stringify(s.events))
      }
      return log.join('\n')
    }

    const first = runLog()
    expect(first, 'the script must actually produce events').toContain('shot-fired')
    expect(runLog()).toBe(first)
  })

  it('shot-fired coincides EXACTLY with the shell slot filling — never drifts', () => {
    // Stream invariant over a long scripted run: the cue and the state
    // transition it narrates are the same step, every time.
    const script = (i: number): Input => ({
      leftTread: 0.8,
      rightTread: 0.6,
      fire: i % 25 === 0,
      start: false,
    })
    let s = freshRun(99)
    let shots = 0
    for (let i = 0; i < 600; i++) {
      const hadShell = s.playerShell !== null
      s = stepGame(s, script(i), DT)
      const fired = typesOf(s).includes('shot-fired')
      const spawned = !hadShell && s.playerShell !== null
      expect(fired, `step ${i}: cue and slot transition must agree`).toBe(spawned)
      if (fired) shots++
    }
    expect(shots, 'the run must actually shoot').toBeGreaterThan(0)
  })
})
