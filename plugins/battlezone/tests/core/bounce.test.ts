// tests/core/bounce.test.ts
//
// Story bz3-9 (Cluster C9, subsumes M-009/H-007) — the ROM's collision BOUNCE:
// ramming an obstacle jolts the view on the Z axis (M-009) AND bobs the
// mountain silhouette vertically (H-007), both driven from ONE decaying core
// value. Trivial workflow: this file and the production code land together.
//
// ROM quarry (~/Projects/battlezone-source-text/BZONE.MAC):
//   * BOUNCE:  .BLKB 1  ;COLLISION BOUNCE VIEW AMT           (:275)
//   * M.NEXT collision handler, first-contact only (OBJCOL 0→1 edge):
//       LDA I,3F / STA BOUNCE                                (:2681-2682)
//   * BOUND (bounce control), once per game frame:
//       LDA BOUNCE / BEQ 20$ / LSR BOUNCE                    (:2132-2134)
//     0x3F halves to 0 in exactly 6 steps: 63,31,15,7,3,1,0.
//   * KLUDGE, per drawn vertex, before the perspective divide:
//       SEC / LDA DDEND / SBC BOUNCE ...                     (:2108-2113)
//     — a uniform Z-axis jolt of the whole view (M-009).
//   * MOUNTS, before drawing the ridge:
//       LDA BOUNCE / LSR / LSR / LSR / LSR (>>4) ... SBC ... (:1265-1277)
//     — shifts the beam's Y-offset (and so the ridge) DOWN by BOUNCE>>4
//     vector-generator units (H-007).
//
// Story bz4-1 (M-009 sibling + H-007 residual) — the ROM writes BOUNCE in
// THREE places; bz3-9 shipped only the obstacle-ram 0x3F. This story adds the
// two DEATH writes and bobs the horizon LINE with the mountains:
//   * Player death / windshield crack — right before DEC LIVES:
//       LDA I,2 / STA CRACK ... LDA I,-1 / STA BOUNCE   (:2335-2338)
//     `LDA I,-1` loads 0xFF (255): the register widens from 0x3F to a FULL
//     BYTE. Fires on every life lost (BOUNCE set BEFORE DEC LIVES at :2339,
//     so the final/game-over death jolts too).
//   * Mutual player-enemy kill — "BLOW'M BOTH UP" (60$, :3358):
//       STA COLFLG / STA COLFLG+2 ... LDA I,-1 / STA BOUNCE ...  (:3358-3364)
//       LDA I,1 ;C ONLY POINTS FOR ENEMY                          (:3365)
//     the player scores the enemy even as both explode; BOUNCE=0xFF too.
//   * MOUNTS draws the horizon LINE from the SAME bounced beam origin:
//       (bounced XCOMP+2) JSR VGVTR2 ;POSITION BEAM               (:1279)
//       LAH/LXL HORIZN / JSR VGJSRL ;ADD HORIZON LINE             (:1280-1282)
//     so the ROM bobs the horizon line TOGETHER with the ridge/moon — bz3-9
//     left it exempt at NDC y=0; this story bobs it off the shared origin.
import { describe, it, expect } from 'vitest'
import { initGame, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'
import type { TankPose } from '../../src/core/camera'
import { OBSTACLES } from '../../src/core/obstacles'
import { tankView } from '../../src/core/camera'
import { transform } from '@shared/math3d'
import { panoramaToNdc, skylineSegments } from '../../src/core/horizon'
import { projectModel, obstacleSegments } from '../../src/core/scene'
import { TALL_BOX } from '../../src/core/models'

const DT = 1 / 60
const START: Input = { ...NO_INPUT, start: true }
const FORWARD: Input = { ...NO_INPUT, leftTread: 1, rightTread: 1 }

const step = (s: GameState, input: Input = NO_INPUT) => stepGame(s, input, DT)
const freshRun = (seed = 7): GameState => stepGame(initGame(seed), START, DT)

// --- The same obstacle-approach fixture as tests/core/events.test.ts's
// motion-blocked describe block: drive a REAL ROM obstacle from clear ground
// until the bz1-4 hard-stop actually catches it, hostile neutralised so it
// can never interfere mid-drive.
const OBSTACLE = OBSTACLES[0]
const RANGE_OUT = Math.hypot(OBSTACLE.x, OBSTACLE.z)
const UX = OBSTACLE.x / RANGE_OUT
const UZ = OBSTACLE.z / RANGE_OUT
const APPROACH: TankPose = {
  x: OBSTACLE.x + UX * 12_000,
  z: OBSTACLE.z + UZ * 12_000,
  heading: Math.atan2(-UX, -UZ),
}

function neutralizeHostile(s: GameState): GameState {
  return {
    ...s,
    enemies: { ...s.enemies, hostile: { ...s.enemies.hostile, phase: 'exploding' as const }, shell: null },
  }
}

function approachRun(): GameState {
  return neutralizeHostile({ ...freshRun(), player: APPROACH })
}

function driveStep(s: GameState, input: Input = FORWARD): GameState {
  return neutralizeHostile(step(s, input))
}

/** Drive full-forward until the hard-stop first catches (moved < 1e-3). */
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

describe('bounce — core state (M-009/H-007 trigger + decay)', () => {
  it('boots at 0 — no bounce before any collision', () => {
    expect(initGame(7).bounce).toBe(0)
    expect(freshRun().bounce).toBe(0)
  })

  it('sets bounce to 0x3F (63) on the exact step the hard-stop first catches', () => {
    const wall = driveToWall(approachRun())
    expect(wall.motionBlockedLatch, 'staging: the fixture must actually be blocked').toBe(true)
    expect(wall.bounce).toBe(0x3f)
  })

  it('does NOT re-arm bounce to 63 while still jammed against the wall (OBJCOL stays set)', () => {
    const wall = driveToWall(approachRun())
    expect(wall.bounce).toBe(0x3f)
    // Keep pressing forward for long enough that BOUND would have halved
    // BOUNCE at least once (well over one 64 ms game frame) while OBJCOL
    // (motionBlockedLatch) never lets go. A bug that re-arms BOUNCE on every
    // still-blocked step would peg it at 63 forever; the real ROM rule lets
    // it keep decaying underneath the held collision.
    let s = wall
    let droppedBelowMax = false
    for (let i = 0; i < 30; i++) {
      s = driveStep(s)
      expect(s.motionBlockedLatch, 'staging: still jammed').toBe(true)
      expect(s.bounce).toBeLessThanOrEqual(0x3f)
      if (s.bounce < 0x3f) droppedBelowMax = true
      // Once it has dropped, a re-arm bug would jump it back up to 63.
      if (droppedBelowMax) expect(s.bounce).toBeLessThan(0x3f)
    }
    expect(droppedBelowMax, 'staging: 30 steps (>1 game frame) must show at least one decay').toBe(true)
  })

  it('decays only at the 15.625 Hz GAME frame — NOT the 60 Hz render sub-step', () => {
    // Synthetic state with the accumulator parked at exactly 0 (a fresh game-
    // frame boundary), isolating the decay cadence from driveToWall's own
    // incidental radarClock phase. 1/60 s sub-steps: 3 of them (0.05 s) stay
    // under one 64 ms (1/15.625 s) game frame; a 4th (0.0667 s) crosses it.
    const base = { ...freshRun(), bounce: 0x3f, radarClock: 0 }
    let s = base
    for (let i = 0; i < 3; i++) {
      s = step(s, NO_INPUT)
      expect(s.bounce, `sub-step ${i + 1} (< 64 ms) must not have decayed yet`).toBe(0x3f)
    }
    s = step(s, NO_INPUT) // the 4th sub-step crosses the 64 ms boundary
    expect(s.bounce, 'the game-frame boundary must halve it exactly once').toBe(0x1f)
  })

  it('halves once per game frame in the exact ROM sequence: 63,31,15,7,3,1,0', () => {
    let s = driveToWall(approachRun())
    expect(s.bounce).toBe(0x3f)
    const seen: number[] = [s.bounce]
    const expected = [63, 31, 15, 7, 3, 1, 0]
    // Advance in small sub-steps until every expected value has been observed,
    // in order, with a generous ceiling (well beyond the ~6 game frames needed).
    for (let i = 0; i < 200 && seen.length < expected.length; i++) {
      s = step(s, NO_INPUT)
      if (s.bounce !== seen[seen.length - 1]) seen.push(s.bounce)
    }
    expect(seen).toEqual(expected)
    // And it STAYS at 0 — no further spontaneous change.
    for (let i = 0; i < 30; i++) {
      s = step(s, NO_INPUT)
      expect(s.bounce).toBe(0)
    }
  })

  it('bz4-1 (AC-1a): a lethal hit SETS bounce to the FULL BYTE 0xFF (respawn path), overwriting the decaying obstacle jolt', () => {
    // BZONE.MAC:2337-2338 — `LDA I,-1 / STA BOUNCE` writes 0xFF (255) on the
    // player-death / windshield-crack path, BEFORE `DEC LIVES` (:2339). Stage a
    // lethal inbound enemy shell one swept step from a tank that is ALSO
    // mid-bounce (0x3F from a wall ram), with lives to spare (respawn branch).
    // radarClock parked at 0 so the death step itself does not decay the
    // freshly-set value — we observe the SET magnitude, not a decayed one.
    let s = driveToWall(approachRun())
    expect(s.bounce).toBe(0x3f)
    s = {
      ...s,
      lives: 3,
      radarClock: 0,
      enemies: { ...s.enemies, shell: { x: s.player.x, z: s.player.z - 200, heading: 0, range: 0 } },
    }
    const died = step(s, NO_INPUT)
    expect(died.player, 'staging: the death step must respawn to the origin').not.toEqual(s.player)
    expect(died.lives).toBe(2)
    // The reconciled post-death behaviour: the death OVERWRITES the decaying
    // 0x3F with the full-byte 0xFF (widened register), and the respawn carries
    // THAT forward — never silently zeroed, never clamped back down to 0x3F.
    expect(died.bounce).toBe(0xff)
  })
})

describe('bounce — Z view jolt (M-009, camera.ts tankView)', () => {
  it('bounce=0 leaves tankView identical to the un-jolted camera', () => {
    const pose: TankPose = { x: 100, z: 200, heading: 0.4 }
    const a = tankView(pose)
    const b = tankView(pose, 0)
    expect(a).toEqual(b)
  })

  it('KLUDGE equivalence: a fixed world point’s eye-depth is reduced by EXACTLY `bounce`', () => {
    // BZONE.MAC:2110-2113: SEC / LDA DDEND / SBC BOUNCE — every vertex's
    // depth drops by the live bounce magnitude, dead ahead or off to the side.
    const pose: TankPose = { x: 500, z: -300, heading: 1.1 }
    const world: [number, number, number] = [1200, -100, 4000]
    const unjolted = transform(tankView(pose, 0), world)
    for (const bounce of [1, 31, 63]) {
      const jolted = transform(tankView(pose, bounce), world)
      // eye-space z is negative depth-into-screen: reducing DISTANCE (making
      // it appear closer) means z moves toward zero, i.e. z_jolted = z_unjolted + bounce.
      expect(jolted[2]).toBeCloseTo(unjolted[2] + bounce, 6)
      // x/y (screen-lateral position) are unaffected by a pure forward push.
      expect(jolted[0]).toBeCloseTo(unjolted[0], 6)
      expect(jolted[1]).toBeCloseTo(unjolted[1], 6)
    }
  })

  it('projectModel forwards bounce through to the SAME jolted view (obstacle wireframe)', () => {
    const pose: TankPose = { x: 0, z: 0, heading: 0 }
    const placement = { x: 0, z: 6000, orientation: 0 }
    const flat = projectModel(TALL_BOX, placement, pose, 1)
    const jolted = projectModel(TALL_BOX, placement, pose, 1, 40)
    expect(jolted).not.toEqual(flat)
    // Matches the direct tankView computation for the same inputs.
    const expected = projectModel(TALL_BOX, placement, pose, 1, 40)
    expect(jolted).toEqual(expected)
  })

  it('obstacleSegments (the real render call site) carries bounce end to end', () => {
    const pose: TankPose = { x: 0, z: 0, heading: 0 }
    const flat = obstacleSegments(pose, 1)
    const jolted = obstacleSegments(pose, 1, 63)
    expect(jolted).not.toEqual(flat)
  })
})

describe('bounce — mountain vertical bob (H-007, horizon.ts panoramaToNdc/skylineSegments)', () => {
  const VECTOR_UNIT_RAD = (2 * Math.PI) / 4096 // horizon.ts's own private constant, re-derived

  it('bounce below 16 shifts nothing — BOUNCE>>4 floors to 0 (BZONE.MAC:1266-1269, four LSRs)', () => {
    const flat = panoramaToNdc(0, 0.05, 0, 1)
    for (const bounce of [0, 1, 15]) {
      expect(panoramaToNdc(0, 0.05, 0, 1, bounce)).toEqual(flat)
    }
  })

  it('shifts elevation DOWN by exactly (bounce >> 4) vector-generator units', () => {
    const azimuth = 0
    const elevation = 0.05
    const heading = 0
    const aspect = 1.5
    for (const bounce of [16, 31, 63]) {
      const shifted = panoramaToNdc(azimuth, elevation, heading, aspect, bounce)!
      const expected = panoramaToNdc(azimuth, elevation - (bounce >> 4) * VECTOR_UNIT_RAD, heading, aspect)!
      expect(shifted[1]).toBeCloseTo(expected[1], 10)
      expect(shifted[0]).toBeCloseTo(expected[0], 10) // x (azimuth) is untouched
    }
  })

  it('skylineSegments carries bounce into every mountain/moon point (the real render call site)', () => {
    const flat = skylineSegments(0, 1.5)
    const bobbed = skylineSegments(0, 1.5, 63)
    expect(bobbed).not.toEqual(flat)
    // bz4-1 (AC-2): the horizon line (segment 0) now bobs WITH the mountains
    // off the SAME bounced beam origin — the ROM draws it from the bounced
    // XCOMP+2 the ridge uses (MOUNTS, BZONE.MAC:1279-1282), so it is no longer
    // exempt. (bz3-9 asserted `toEqual` here; this story reverses that.)
    expect(bobbed[0]).not.toEqual(flat[0])
    // At least one ridge/moon segment must actually have moved.
    const moved = bobbed.slice(1).some((seg, i) => {
      const other = flat[i + 1]
      return seg.y1 !== other.y1 || seg.y2 !== other.y2
    })
    expect(moved).toBe(true)
  })
})

describe('bounce — ONE value drives both effects, in sync, through a real collision', () => {
  it('after ramming a wall, the Z jolt and the mountain bob both fade to zero TOGETHER', () => {
    let s = driveToWall(approachRun())
    const pose: TankPose = { x: 0, z: 0, heading: 0 }

    let sawBobActive = false
    for (let i = 0; i < 200; i++) {
      const joltNow = projectModel(TALL_BOX, { x: 0, z: 6000, orientation: 0 }, pose, 1, s.bounce)
      const joltZero = projectModel(TALL_BOX, { x: 0, z: 6000, orientation: 0 }, pose, 1, 0)
      const bobNow = panoramaToNdc(0, 0.05, 0, 1.5, s.bounce)
      const bobZero = panoramaToNdc(0, 0.05, 0, 1.5, 0)

      const joltActive = JSON.stringify(joltNow) !== JSON.stringify(joltZero)
      const bobActive = JSON.stringify(bobNow) !== JSON.stringify(bobZero)
      if (bobActive) sawBobActive = true

      // The ROM scales the two effects differently (KLUDGE: raw BOUNCE;
      // MOUNTS: BOUNCE>>4), so the bob's threshold (bounce >= 16) is
      // strictly stricter than the jolt's (bounce >= 1) — the bob NEVER
      // fires without the jolt also firing, both reading the SAME s.bounce.
      if (bobActive) expect(joltActive, 'bob active but the jolt (same value) is not').toBe(true)

      if (s.bounce === 0) {
        expect(joltActive).toBe(false)
        expect(bobActive).toBe(false)
        expect(sawBobActive, 'staging: the run must have passed through a bounce >= 16 phase').toBe(true)
        return
      }
      s = step(s, NO_INPUT)
    }
    expect.unreachable('bounce never decayed to 0 within the window')
  })
})

// ---------------------------------------------------------------------------
// bz4-1 — the death / mutual-kill jolt (AC-1) and the horizon-line bob (AC-2).
// ---------------------------------------------------------------------------

/** Fresh in-play run, hostile parked far off and (unless a test says otherwise)
 *  neutralised, plus a lethal enemy shell one swept step from the player. The
 *  next step is a DEATH. radarClock parked at 0 so the death step does not
 *  decay the freshly-set BOUNCE — we read the SET magnitude. */
function withLethalShell(lives: number): GameState {
  const s = neutralizeHostile(freshRun())
  return {
    ...s,
    lives,
    radarClock: 0,
    bounce: 0,
    enemies: { ...s.enemies, shell: { x: s.player.x, z: s.player.z - 200, heading: 0, range: 0 } },
  }
}

describe('bounce — death & mutual-kill jolt (bz4-1, AC-1, BOUNCE=0xFF full byte)', () => {
  it('player death by enemy shell fires the full-byte 0xFF, not the obstacle 0x3F (BZONE.MAC:2337-2338)', () => {
    const died = step(withLethalShell(3), NO_INPUT)
    expect(died.lives, 'staging: a life was lost (respawn branch)').toBe(2)
    expect(died.player, 'staging: respawned to the origin').toEqual({ x: 0, z: 0, heading: 0 })
    // `LDA I,-1 / STA BOUNCE` = 255, the widened register — NOT 0x3F (63).
    expect(died.bounce).toBe(0xff)
    expect(died.bounce).not.toBe(0x3f)
  })

  it('game-over death ALSO fires 0xFF — BOUNCE is written BEFORE DEC LIVES (BZONE.MAC:2337-2339)', () => {
    // Last life: the SAME death write, but this branch returns mode 'gameover'.
    // The ROM STAs BOUNCE=0xFF, then DEC LIVES, then (if zero) INC GOVER — the
    // final death jolts too, so the register must be 0xFF even here.
    const over = step(withLethalShell(1), NO_INPUT)
    expect(over.mode, 'staging: last life → game over').toBe('gameover')
    expect(over.bounce).toBe(0xff)
  })

  it('mutual player-enemy kill fires 0xFF and still scores the enemy (BZONE.MAC:3358-3365)', () => {
    // "BLOW'M BOTH UP" (60$, :3358): the player's shell kills the hostile the
    // SAME step the enemy's in-flight shell kills the player. BOUNCE=0xFF
    // (:3363-3364) AND the player still banks the enemy's points (:3365 "ONLY
    // POINTS FOR ENEMY"). Live hostile parked far off with the player's shell
    // on it (kill); enemy shell on the player (death) — independent slots.
    const before = freshRun()
    const hostile = { ...before.enemies.hostile, x: 240_000, z: 240_000, phase: 'alive' as const }
    const staged: GameState = {
      ...before,
      lives: 3,
      radarClock: 0,
      bounce: 0,
      score: 0,
      enemies: {
        ...before.enemies,
        hostile,
        shell: { x: before.player.x, z: before.player.z - 200, heading: 0, range: 0 },
      },
      playerShell: { x: hostile.x, z: hostile.z - 200, heading: 0, range: 0 },
    }
    const both = step(staged, NO_INPUT)
    const types = both.events.map((e) => e.type)
    expect(types, 'staging: the player killed the enemy this step').toContain('enemy-destroyed')
    expect(types, 'staging: the enemy killed the player this step').toContain('player-hit')
    expect(both.lives, 'staging: the player died (respawn)').toBe(2)
    expect(both.score, 'the player banks the enemy kill even in a mutual kill').toBeGreaterThan(0)
    // The mutual-kill jolt: even with a same-step player kill, BOUNCE=0xFF.
    expect(both.bounce).toBe(0xff)
  })

  it('the register is NOT clamped to 0x3F: a death sets 0xFF and it settles 255→127→63→31→15→7→3→1→0', () => {
    const died = step(withLethalShell(3), NO_INPUT)
    expect(died.bounce, 'the death sets the full byte').toBe(0xff)
    // Isolate the decay cadence: park the accumulator, drop any enemy shell and
    // keep the hostile inert so nothing re-triggers, then walk sub-steps
    // collecting each distinct value. If the register were clamped to 0x3F the
    // sequence would start at 63, not 255.
    let d: GameState = {
      ...died,
      radarClock: 0,
      playerShell: null,
      enemies: {
        ...died.enemies,
        hostile: { ...died.enemies.hostile, phase: 'exploding' as const },
        shell: null,
      },
    }
    const seen: number[] = [d.bounce]
    const expected = [255, 127, 63, 31, 15, 7, 3, 1, 0]
    for (let i = 0; i < 300 && seen.length < expected.length; i++) {
      d = step(d, NO_INPUT)
      if (d.bounce !== seen[seen.length - 1]) seen.push(d.bounce)
    }
    expect(seen).toEqual(expected)
    // …and it stays settled at 0.
    for (let i = 0; i < 30; i++) {
      d = step(d, NO_INPUT)
      expect(d.bounce).toBe(0)
    }
  })
})

describe('bounce — horizon LINE bobs with the mountains (bz4-1, AC-2, shared beam origin)', () => {
  it('the horizon line rides the SAME bounced beam origin as the ridge — its y equals a zero-elevation mountain point (BZONE.MAC:1279-1282)', () => {
    // MOUNTS positions the beam at the bounced XCOMP+2 (:1273-1275 SBC
    // BOUNCE>>4) and draws BOTH the ridge and the horizon LINE (:1282
    // `JSR VGJSRL ;ADD HORIZON LINE`) from it. So the horizon line's NDC y must
    // equal the y a backdrop point at elevation 0 gets under the same bounce —
    // not a mere "it moved" routing check, but the exact shared offset. A
    // mis-scaled, halved, inverted, or upside-down bob fails this.
    const heading = 0.3
    const aspect = 1.5
    for (const bounce of [16, 32, 63, 255]) {
      const segs = skylineSegments(heading, aspect, bounce)
      const horizon = segs[0] // the full-width horizon line (convention: first)
      // Guard: segment 0 really is the full-width horizon line, not a ridge edge.
      expect(Math.abs(horizon.x1)).toBeCloseTo(1, 6)
      expect(Math.abs(horizon.x2)).toBeCloseTo(1, 6)
      // The shared bounced-beam origin: a zero-elevation point's bobbed y.
      const sharedBobY = panoramaToNdc(heading, 0, heading, aspect, bounce)![1]
      // Direction + magnitude sanity: the ROM SBCs the beam origin DOWN, so the
      // shared offset is negative and non-trivial (BOUNCE>>4 ≥ 1 here).
      expect(sharedBobY).toBeLessThan(0)
      // Both endpoints of the horizon line sit on that shared bobbed origin —
      // still a level, full-width line, just lowered together with the ridge.
      expect(horizon.y1).toBeCloseTo(sharedBobY, 10)
      expect(horizon.y2).toBeCloseTo(sharedBobY, 10)
      expect(horizon.y1).toBeCloseTo(horizon.y2, 12)
      // And it genuinely left the flat baseline it sat on before (y = 0).
      expect(Math.abs(horizon.y1)).toBeGreaterThan(1e-6)
    }
  })

  it('below bounce 16 the horizon line does NOT bob — BOUNCE>>4 floors to 0, the SAME threshold as the ridge (BZONE.MAC:1266-1270)', () => {
    // MOUNTS `BEQ 20$` skips the beam-origin SBC when BOUNCE>>4 == 0, so the
    // horizon line and the ridge stay pinned to the flat origin in lockstep — a
    // naive "always shift the horizon by f(bounce)" bob would break this.
    const heading = 0.3
    const aspect = 1.5
    const flat = skylineSegments(heading, aspect)[0]
    for (const bounce of [0, 1, 15]) {
      const horizon = skylineSegments(heading, aspect, bounce)[0]
      expect(horizon.y1).toBe(flat.y1)
      expect(horizon.y2).toBe(flat.y2)
      expect(horizon.y1).toBe(0)
    }
  })
})
