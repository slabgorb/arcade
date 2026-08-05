// tests/core/windshield-crack.test.ts
//
// Story bz5-1 (epic bz5) — RED phase (Leeloo / TEA). The cracked-glass
// windshield is the cabinet's HIT reaction, not a permanent decal. The clone
// currently draws it every frame from spawn (main.ts:276, `drawCrackedGlass`
// unconditional). bz4-1 ported BOUNCE's death write (0xFF) but SKIPPED its
// sibling right beside it — the ROM's `CRACK` register — which is what actually
// gates the shattered-glass graphic.
//
// ROM quarry (/Users/slabgorb/Projects/battlezone-source-text/BZONE.MAC):
//   * CRACK: .BLKB 1  ;CRACKED WINDSHIELD COUNTER              (:256)
//   * Player death / windshield crack — right beside the BOUNCE=0xFF write,
//     BEFORE DEC LIVES:
//       LDA I,2 / STA CRACK  ... LDA I,-1 / STA BOUNCE         (:2335-2338)
//     CRACK is SET to 2 on every life lost (game-over included, same as BOUNCE).
//   * Mutual player-enemy kill also writes CRACK                (:3362).
//   * The render gates the whole windshield on it:
//       LDA CRACK / BEQ 31$ / JMP WNSHLD                        (:506-507)
//     CRACK == 0 → open the clear window (BIGWND); CRACK != 0 → draw the
//     cracked windshield (WNSHLD). So "cracked" ≡ CRACK != 0.
//   * WNSHLD advances the counter once per game frame, +2, and RESETS it to 0
//     at the 16*2 boundary, then repositions/respawns (or → attract on game
//     over):  INC CRACK / INC CRACK (:697-698);  reset STA CRACK=0 (:660-661).
//     So the crack is a BOUNDED window (~15 game frames ≈ 1 s at 15.625 Hz)
//     that CLEARS on its own — never permanent.
//
// The contract this file pins (the observable core seam the shell READS):
//   GameState.crack : number  — the ROM CRACK counter. 0 = clean windshield,
//   non-zero = the shattered-glass overlay is drawn. Set to 2 on a player-death
//   step, advanced on the 15.625 Hz game frame (NOT the ~60 Hz render sub-step,
//   the C-001 trap `bounce`/`frameCount` already avoid), and back to 0 after the
//   death window. Computed in core; the shell only reads it (core purity).
//
// Scope note (bz5-1 = VISIBILITY only): the story keeps CRACK_PATHS as-is (no
// progressive sections) and does NOT freeze the tank for the ending sequence —
// the exact window length is Dev's to match against MAME's player-death
// handling (AC3, bzone.cpp) and record in the findings doc. These tests pin the
// BEHAVIOUR (clean → cracked-on-death → clears), robust to that exact count.
import { describe, it, expect } from 'vitest'
import { initGame, type GameState } from '../../src/core/state'
import { stepGame } from '../../src/core/sim'
import { NO_INPUT, type Input } from '../../src/core/input'
import type { TankPose } from '../../src/core/camera'
import { OBSTACLES } from '../../src/core/obstacles'
import { GAME_FRAME_HZ } from '../../src/core/timebase'

const DT = 1 / 60
/** One WHOLE ROM game frame per step — advanceRadar fires exactly one 15.625 Hz
 *  tick, so crack advances once per call with no sub-frame remainder. */
const FRAME_DT = 1 / GAME_FRAME_HZ
const START: Input = { ...NO_INPUT, start: true }

const step = (s: GameState, input: Input = NO_INPUT, dt: number = DT): GameState =>
  stepGame(s, input, dt)
const freshRun = (seed = 7): GameState => stepGame(initGame(seed), START, DT)

/** Park the hostile mid-explosion with no shell in flight, so nothing on the
 *  enemy side can hit the player during a test window. (bounce.test.ts idiom.) */
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

/** Fresh in-play run, hostile neutralised, plus a lethal enemy shell one swept
 *  step from the player — the NEXT step is a DEATH. radarClock parked at 0 so
 *  the death step itself fires no game frame, and we read the SET crack value
 *  (mirrors bounce.test.ts's withLethalShell). */
function withLethalShell(lives: number): GameState {
  const s = neutralizeHostile(freshRun())
  return {
    ...s,
    lives,
    radarClock: 0,
    enemies: {
      ...s.enemies,
      shell: { x: s.player.x, z: s.player.z - 200, heading: 0, range: 0 },
    },
  }
}

// --- Real obstacle-ram fixture (the discriminator): drive a REAL ROM obstacle
// from clear ground until the bz1-4 hard-stop catches, which sets BOUNCE=0x3F.
// This is a NON-death jolt — the windshield must stay clean. (bounce.test.ts.)
const OBSTACLE = OBSTACLES[0]
const RANGE_OUT = Math.hypot(OBSTACLE.x, OBSTACLE.z)
const UX = OBSTACLE.x / RANGE_OUT
const UZ = OBSTACLE.z / RANGE_OUT
const APPROACH: TankPose = {
  x: OBSTACLE.x + UX * 12_000,
  z: OBSTACLE.z + UZ * 12_000,
  heading: Math.atan2(-UX, -UZ),
}
const FORWARD: Input = { ...NO_INPUT, leftTread: 1, rightTread: 1 }

function driveToWall(maxSteps = 500): GameState {
  let cur = neutralizeHostile({ ...freshRun(), player: APPROACH })
  for (let i = 0; i < maxSteps; i++) {
    const next = neutralizeHostile(step(cur, FORWARD))
    const moved = Math.hypot(next.player.x - cur.player.x, next.player.z - cur.player.z)
    if (moved < 1e-3) return next
    cur = next
  }
  throw new Error('staging: never reached the wall — approach geometry broke')
}

describe('windshield crack — the ROM CRACK counter is a HIT reaction (bz5-1)', () => {
  // ── AC1: CLEAN on a fresh run and during ordinary un-hit play ──
  it('boots CLEAN — crack is 0 before any hit (initGame and a fresh run)', () => {
    expect(initGame(7).crack, 'attract boot').toBe(0)
    expect(freshRun().crack, 'the first playing frame').toBe(0)
  })

  it('stays CLEAN through 300 frames of un-hit play (never spontaneously cracks)', () => {
    let s = neutralizeHostile(freshRun())
    for (let i = 0; i < 300; i++) {
      s = neutralizeHostile(step(s, NO_INPUT))
      expect(s.crack, `un-hit frame ${i}`).toBe(0)
    }
  })

  it('stays CLEAN in the attract demo — the demo tank is immortal (no player-hit)', () => {
    let s = initGame(11) // attract mode; demoInput drives, deaths are demo-framed away
    for (let i = 0; i < 300; i++) {
      s = step(s, NO_INPUT)
      expect(s.mode, 'staging: still in attract').toBe('attract')
      expect(s.crack, `attract frame ${i}`).toBe(0)
    }
  })

  // ── AC2: the crack APPEARS on a hit — the ROM's CRACK := 2 (:2335-2336) ──
  it('a player death SETS crack to 2 — the windshield-crack write (BZONE.MAC:2335-2336)', () => {
    const died = step(withLethalShell(3))
    expect(died.lives, 'staging: a life was lost (respawn branch)').toBe(2)
    expect(died.player, 'staging: respawned to the origin').toEqual({ x: 0, z: 0, heading: 0 })
    expect(died.crack, 'CRACK := 2 on death, `LDA I,2 / STA CRACK`').toBe(2)
  })

  it('a GAME-OVER death ALSO cracks the windshield — every life lost (BZONE.MAC:2335 before DEC LIVES)', () => {
    const over = step(withLethalShell(1))
    expect(over.mode, 'staging: last life → game over').toBe('gameover')
    expect(over.crack, 'the final death jolts the windshield too').toBe(2)
  })

  // ── The discriminator: crack tracks DEATH, not BOUNCE ──
  it('an obstacle RAM does NOT crack the windshield — CRACK is not BOUNCE (BZONE.MAC:2681 vs :2335)', () => {
    const wall = driveToWall()
    expect(wall.motionBlockedLatch, 'staging: the tank is actually jammed').toBe(true)
    expect(wall.bounce, 'staging: the ram set BOUNCE to 0x3F').toBe(0x3f)
    // BOUNCE fired, but no life was lost — the windshield must stay clean.
    expect(wall.crack, 'a wall ram jolts the view but does not shatter the glass').toBe(0)
  })

  // ── Cadence: the counter advances on the 15.625 Hz GAME frame, not the sub-step ──
  it('does NOT advance crack on a sub-frame ~60 Hz step (the C-001 game-frame trap)', () => {
    const died = neutralizeHostile(step(withLethalShell(3)))
    expect(died.crack, 'staging: cracked on death').toBe(2)
    // A single 1/60 s sub-step does not fill a 64 ms game frame, so the counter
    // must not move yet — crack lives on the game-frame boundary like bounce.
    const sub = neutralizeHostile(step(died, NO_INPUT, DT))
    expect(sub.crack, 'crack held across a sub-frame step').toBe(2)
  })

  // ── AC2: the crack CLEARS — a bounded window, never a permanent decal ──
  it('is a BOUNDED window that returns to 0 and stays clean (not a permanent overlay)', () => {
    // From the death state, isolate the player (hostile dead, no enemy shell) so
    // nothing re-cracks the glass, and advance whole game frames.
    let s = neutralizeHostile(step(withLethalShell(3)))
    const series: number[] = [s.crack]
    for (let i = 0; i < 40; i++) {
      // Re-neutralise after every frame: the hostile is held mid-explosion with
      // no shell, so it can never re-hit the player and reset the counter — the
      // window we observe is a clean single death sequence.
      s = neutralizeHostile(step(s, NO_INPUT, FRAME_DT))
      series.push(s.crack)
    }
    // The crack is visible for a real, contiguous window straight after the hit…
    const firstZero = series.indexOf(0)
    expect(firstZero, 'crack must reach 0 within the window (not permanent)').toBeGreaterThan(0)
    expect(firstZero, 'the visible window is a real death sequence, not a 1-frame flash').toBeGreaterThanOrEqual(8)
    expect(firstZero, 'the window is bounded near the ROM 16-section cap').toBeLessThanOrEqual(20)
    // …every frame before it is non-zero (no flicker mid-sequence)…
    for (let i = 0; i < firstZero; i++) {
      expect(series[i], `crack must stay lit through the window at frame ${i}`).not.toBe(0)
    }
    // …and once cleared it STAYS clean under continued un-hit play.
    for (let i = firstZero; i < series.length; i++) {
      expect(series[i], `crack must stay 0 after clearing, frame ${i}`).toBe(0)
    }
  })

  // ── Determinism: crack is part of the pure state ──
  it('is deterministic — identical input yields an identical (and real) crack value', () => {
    const a = step(withLethalShell(3))
    const b = step(withLethalShell(3))
    // Anchored to the real death value so this is not a vacuous undefined===undefined
    // pass before the field exists — two identical deaths both crack to 2.
    expect(a.crack).toBe(2)
    expect(a.crack).toBe(b.crack)
  })
})
