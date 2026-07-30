// tests/core/alerts.test.ts
//
// Story bz1-12 — RED rework (Furiosa / TEA), round-trip 1. Immortan Joe's review
// rejected the GREEN: the in-game alert DECISION (MOTION BLOCKED / ENEMY IN
// RANGE) was pure branching logic — a motion-blocked tie-break, an aim-cone
// dot-product, a range threshold — trapped INSIDE main.ts (`inGameMessage`),
// untested and unexported. main.ts runs DOM/rAF bootstrap on import, so it can
// never be unit-tested from there. This pins the fix: extract the pure decision
// into a side-effect-free core module and drive every branch.
//
// Pinned surface (ABSENT until GREEN — module-load failure is the RED signal):
//   core/alerts.ts :
//     - inGameAlert(input, prevPose, game): string | null — the ROM alert to
//       show this frame (from core/text.ts MESSAGES), or null.
//     - ENEMY_ALERT_RANGE: number — the "in cannon range" world-unit threshold
//       (exported so the boundary is testable, not a buried magic number).
//   main.ts calls this instead of its own inline copy (the pure decision leaves
//   the shell; the shell only paints the returned word — mirrors core/screens.ts).
//
// This is the SAME house split screens.ts uses: WORDS/decisions in pure core,
// stroking in the shell. The move is what makes the boundary logic testable.
import { describe, it, expect } from 'vitest'
import { inGameAlert, ENEMY_ALERT_RANGE } from '../../src/core/alerts'
import * as alertsModule from '../../src/core/alerts'
import { GAME_FRAME_HZ } from '../../src/core/timebase'
import { MESSAGES } from '../../src/core/text'

// bz3-11 AC1 — `alertFlashOn` is the flash gate Dev adds in GREEN. It is ABSENT
// now (this is RED), so it is read through a typed OPTIONAL view of the module:
// the test file typechecks clean (`tsc --noEmit`) while every call fails at
// runtime (`alertFlashOn is not a function`) until the export lands. Dev's real
// `export function alertFlashOn(frame: number): boolean` satisfies this view.
const alertFlashOn = (alertsModule as { readonly alertFlashOn?: (frame: number) => boolean })
  .alertFlashOn
import { initGame, type GameState } from '../../src/core/state'
import type { TankPose } from '../../src/core/camera'
import type { Input } from '../../src/core/input'
import type { Hostile } from '../../src/core/enemies'

const idle: Input = { leftTread: 0, rightTread: 0, fire: false }
const forward: Input = { leftTread: 1, rightTread: 1, fire: false } // both treads → translate
const pivot: Input = { leftTread: 1, rightTread: -1, fire: false } // opposed → rotate, no translate

/** A GameState with the player pose and hostile overridden — everything else is
 *  a valid deterministic boot. Player defaults to origin facing +Z (heading 0),
 *  so "dead ahead" is +Z and the dot-product math is easy to reason about. */
function stateWith(player: Partial<TankPose>, hostile: Partial<Hostile>): GameState {
  const base = initGame(1)
  return {
    ...base,
    player: { x: 0, z: 0, heading: 0, ...player },
    enemies: { ...base.enemies, hostile: { ...base.enemies.hostile, ...hostile } },
  }
}

// A hostile parked far behind the player and not this frame's concern — used to
// isolate the motion-blocked branch from the enemy-in-range branch.
const HOSTILE_BEHIND: Partial<Hostile> = { x: 0, z: -30000, phase: 'alive' }

describe('bz1-12 — inGameAlert: MOTION BLOCKED BY OBJECT', () => {
  it('fires when the player intends to translate but the pose did not move', () => {
    const game = stateWith({ x: 100, z: 100 }, HOSTILE_BEHIND)
    const prev: TankPose = { x: 100, z: 100, heading: 0 } // identical → blocked hard-stop
    expect(inGameAlert(forward, prev, game)).toBe(MESSAGES.MOTION_BLOCKED)
  })

  it('does NOT fire when the tank actually moved (translation succeeded)', () => {
    const game = stateWith({ x: 100, z: 100 }, HOSTILE_BEHIND)
    const prev: TankPose = { x: 100, z: 0, heading: 0 } // moved 100 units
    expect(inGameAlert(forward, prev, game)).not.toBe(MESSAGES.MOTION_BLOCKED)
  })

  it('does NOT fire on rotation-in-place (opposed treads = no translation intent)', () => {
    // bz3-11: HOSTILE_BEHIND is alive and past the REAR bearing cutoff, so
    // AC2's non-range-gated directional callout now fires here too — this
    // test's own concern (pivoting must not raise MOTION BLOCKED) still holds.
    const game = stateWith({ x: 100, z: 100 }, HOSTILE_BEHIND)
    const prev: TankPose = { x: 100, z: 100, heading: 0 } // unmoved, but pivoting
    expect(inGameAlert(pivot, prev, game)).not.toBe(MESSAGES.MOTION_BLOCKED)
    expect(inGameAlert(pivot, prev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.REAR}`)
  })
})

describe('bz1-12 — inGameAlert: ENEMY IN RANGE (gunsight-aligned + in range)', () => {
  it('fires when the live hostile is dead ahead and within range', () => {
    const game = stateWith({}, { x: 0, z: 5000, phase: 'alive' }) // straight ahead (+Z)
    const prev: TankPose = { x: 0, z: 0, heading: 0 }
    expect(inGameAlert(idle, prev, game)).toBe(MESSAGES.ENEMY_IN_RANGE)
  })

  it('does NOT fire when the hostile is off the gunsight cone (perpendicular)', () => {
    // bz3-11: ENEMY IN RANGE specifically does not fire (the aim-cone predicate
    // this test targets) — but AC2's directional callout now covers this
    // off-axis hostile instead of the old, incomplete "nothing" default.
    const game = stateWith({}, { x: 5000, z: 0, phase: 'alive' }) // to the side (+X)
    expect(inGameAlert(idle, { x: 0, z: 0, heading: 0 }, game)).not.toBe(MESSAGES.ENEMY_IN_RANGE)
    expect(inGameAlert(idle, { x: 0, z: 0, heading: 0 }, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.LEFT}`)
  })

  it('does NOT fire when the hostile is behind the player', () => {
    // bz3-11: same story — ENEMY IN RANGE stays silent, AC2's REAR callout fires.
    const game = stateWith({}, { x: 0, z: -5000, phase: 'alive' }) // behind (−Z)
    expect(inGameAlert(idle, { x: 0, z: 0, heading: 0 }, game)).not.toBe(MESSAGES.ENEMY_IN_RANGE)
    expect(inGameAlert(idle, { x: 0, z: 0, heading: 0 }, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.REAR}`)
  })

  it('does NOT fire when a dead-ahead hostile is beyond ENEMY_ALERT_RANGE', () => {
    const game = stateWith({}, { x: 0, z: ENEMY_ALERT_RANGE + 1000, phase: 'alive' })
    expect(inGameAlert(idle, { x: 0, z: 0, heading: 0 }, game)).toBeNull()
  })

  it('respects the range boundary: just inside fires, exactly at the edge does not', () => {
    const prev: TankPose = { x: 0, z: 0, heading: 0 }
    const inside = stateWith({}, { x: 0, z: ENEMY_ALERT_RANGE - 1, phase: 'alive' })
    const edge = stateWith({}, { x: 0, z: ENEMY_ALERT_RANGE, phase: 'alive' })
    expect(inGameAlert(idle, prev, inside)).toBe(MESSAGES.ENEMY_IN_RANGE)
    expect(inGameAlert(idle, prev, edge)).toBeNull() // strict `< ENEMY_ALERT_RANGE`
  })

  it('does NOT fire when the aligned, in-range hostile is not alive (exploding)', () => {
    const game = stateWith({}, { x: 0, z: 5000, phase: 'exploding' })
    expect(inGameAlert(idle, { x: 0, z: 0, heading: 0 }, game)).toBeNull()
  })
})

describe('bz1-12 — inGameAlert: tie-break and the quiet default', () => {
  it('MOTION BLOCKED wins when both conditions hold at once', () => {
    // Player intends to translate but is hard-stopped, AND a hostile is dead
    // ahead in range — the block is the more urgent, immediate feedback.
    const game = stateWith({ x: 0, z: 0 }, { x: 0, z: 5000, phase: 'alive' })
    const prev: TankPose = { x: 0, z: 0, heading: 0 } // unmoved → blocked
    expect(inGameAlert(forward, prev, game)).toBe(MESSAGES.MOTION_BLOCKED)
  })

  it('returns the REAR callout, not a bare null, for an idle player and a far rear hostile', () => {
    // bz3-11: pre-AC2 this was the "quiet default" (no directional cue existed
    // yet). AC2 is deliberately NOT range-gated, so HOSTILE_BEHIND — alive and
    // past the REAR cutoff — now raises 'ENEMY TO REAR' instead of null.
    const game = stateWith({}, HOSTILE_BEHIND)
    expect(inGameAlert(idle, { x: 0, z: 0, heading: 0 }, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.REAR}`)
  })
})

// ===========================================================================
// bz3-11 — OFF-AXIS ENEMY PROMPTS (Cluster C11: C-004, C-005, S-021). RED (O'Brien
// / TEA). The visual twin of bz3-10's WARNG audio. Two ROM cues the clone only
// half-implements:
//   AC1 (C-004): 'ENEMY IN RANGE' must FLASH on FRAME bit 1 (~3.9 Hz), not draw
//        steadily. BZONE.MAC:4045-4047  `LDA I,2 / AND FRAME / BEQ D.10` — the
//        message draws only on frames where (FRAME & 2) != 0. The identical gate
//        guards the direction prompt at :555-556.
//   AC2 (C-005/S-021): the directional 'ENEMY TO <LEFT|RIGHT|REAR>' callout is
//        never emitted — the strings live in text.ts but no core logic selects
//        them. BZONE.MAC:558-571 buckets the bearing: forward (skip) when
//        PTURN < 22., REAR when PTURN > 6B (107), else LEFT/RIGHT by SAVE2 sign.
//
// PINNED SURFACE (bz1-12 pattern — ABSENT until GREEN is the RED signal):
//   core/alerts.ts :
//     - alertFlashOn(frame): boolean — the shared bit-1 flash gate the SHELL
//       reads to decide WHEN to stroke the enemy alerts (ENEMY IN RANGE + the
//       ENEMY TO callout). Pure decision in core; the shell strokes.
//     - inGameAlert(...) EXTENDED to emit the composed `ENEMY TO <dir>` string
//       for a live, off-gunsight hostile (precedence: motion-blocked >
//       enemy-in-range > enemy-direction > null). Existing signature unchanged.
//
// BEARING / SIGN convention is the game's OWN, already shipped and tested by the
// radar (core/radar.ts, tests/core/radar.test.ts, shell/render.ts:175-179):
//   bearing = atan2(dx, dz) - heading, folded to (−π, π]; 0 = dead ahead.
//   +bearing → world +X → the radar paints it screen-LEFT → 'ENEMY TO LEFT';
//   −bearing → world −X → screen-RIGHT → 'ENEMY TO RIGHT'. (This also matches the
//   physical turn: camera.ts's increasing-heading = counter-clockwise = a LEFT
//   turn brings a +X contact onto the gunsight.) The callout MUST agree with the
//   radar — both point the player the same way toward the unseen enemy.
// ===========================================================================

// The two ROM bearing cutoffs, transcribed from BZONE.MAC as fractions of a full
// 256-unit byte-angle (BAM) turn — PTURN is |SAVE2| in BAM (computed :511-520):
//   in-view cutoff : `CMP I,22.`  BZONE.MAC:559  → 22 BAM  = 30.9375°  = 0.539961 rad
//   rear    cutoff : `LDA I,6B`   BZONE.MAC:564  → 107 BAM = 150.468°  = 2.626272 rad
const IN_VIEW_TURN_DEG = (22 / 256) * 360 // 30.9375°
const REAR_TURN_DEG = (0x6b / 256) * 360 // 150.468° (0x6B = 107)

/** A hostile placed at signed bearing `deg` (player at origin, heading 0), range
 *  `r`. +deg = world +X side (→ LEFT); the sim reads only its x/z/phase. Range is
 *  deliberately variable: the ROM's :558-571 callout is NOT range-gated. */
function hostileAtBearing(deg: number, r = 10_000, phase: Hostile['phase'] = 'alive'): Partial<Hostile> {
  const b = (deg * Math.PI) / 180
  return { x: r * Math.sin(b), z: r * Math.cos(b), phase }
}

describe('bz3-11 AC1 — ENEMY IN RANGE flashes on FRAME bit 1, not steady (C-004)', () => {
  it('shows for 2 frames then hides for 2 — the `LDA I,2 / AND FRAME` bit-1 gate', () => {
    // BZONE.MAC:4045-4047 draw iff (FRAME & 2) != 0. Over a game-frame counter
    // 0..7 that bit reads 0,0,1,1,0,0,1,1 → a 2-on / 2-off blink.
    const phases = [0, 1, 2, 3, 4, 5, 6, 7].map((f) => alertFlashOn!(f))
    expect(phases).toEqual([false, false, true, true, false, false, true, true])
  })

  it('is NOT steady — some frames hide the message (the C-004 bug is always-true)', () => {
    const anyHidden = [0, 1, 2, 3, 4, 5, 6, 7].some((f) => !alertFlashOn!(f))
    expect(anyHidden).toBe(true)
  })

  it('gates on bit 1 ALONE — bit 0 and bit 2 never move the phase', () => {
    expect(alertFlashOn!(0)).toBe(alertFlashOn!(1)) // differ only in bit 0 → same phase
    expect(alertFlashOn!(2)).toBe(alertFlashOn!(6)) // differ only in bit 2, both bit-1 set
    expect(alertFlashOn!(0)).not.toBe(alertFlashOn!(2)) // bit 1 flips the phase
  })

  it('the blink is ~3.9 Hz at the 15.625 Hz GAME frame — NOT the 60 Hz render rate', () => {
    // 2 on + 2 off = a 4-game-frame period. At GAME_FRAME_HZ that is
    // GAME_FRAME_HZ / 4 = 3.90625 Hz (128 ms on / 128 ms off). The counter fed to
    // alertFlashOn MUST be the 15.625 Hz game frame (timebase.ts; BZONE.MAC:439
    // INC FRAME, :1085 "END OF FRAME (64 MS)"), never the ~60 Hz render frame —
    // that C-001 confusion would blink it at 15 Hz. This assertion documents the
    // required rate; the shell wires the game-frame counter (see GREEN notes).
    const flashHz = GAME_FRAME_HZ / 4
    expect(flashHz).toBeCloseTo(3.90625, 5)
    expect(flashHz).toBeGreaterThan(3.8)
    expect(flashHz).toBeLessThan(4.0)
  })
})

describe('bz3-11 AC2 — inGameAlert emits ENEMY TO LEFT/RIGHT/REAR (C-005, S-021)', () => {
  const prev: TankPose = { x: 0, z: 0, heading: 0 }

  it('LEFT: a live hostile off the gunsight on the +X side → "ENEMY TO LEFT"', () => {
    // +X reads bearing +π/2 → radar paints it screen-LEFT (render.ts:175-179).
    const game = stateWith({}, { x: 5000, z: 0, phase: 'alive' })
    expect(inGameAlert(idle, prev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.LEFT}`)
  })

  it('RIGHT: a live hostile off the gunsight on the −X side → "ENEMY TO RIGHT"', () => {
    const game = stateWith({}, { x: -5000, z: 0, phase: 'alive' })
    expect(inGameAlert(idle, prev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.RIGHT}`)
  })

  it('REAR: a live hostile directly behind (−Z) → "ENEMY TO REAR"', () => {
    // BZONE.MAC:563-566 — REAR when PTURN > 0x6B (150.5°), regardless of side.
    const game = stateWith({}, { x: 0, z: -5000, phase: 'alive' })
    expect(inGameAlert(idle, prev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.REAR}`)
  })

  it('REAR overrides the LEFT/RIGHT split inside the rear cone (rear-left quarter)', () => {
    // 160° off-axis on the +X side: past the 150.5° rear cutoff → REAR, not LEFT.
    const game = stateWith({}, hostileAtBearing(160))
    expect(inGameAlert(idle, prev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.REAR}`)
  })

  it('LEFT just short of the rear cutoff stays LEFT (rear-cutoff boundary, +X side)', () => {
    // 148° < 150.5° rear cutoff → still lateral → LEFT.
    const game = stateWith({}, hostileAtBearing(148))
    expect(inGameAlert(idle, prev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.LEFT}`)
  })

  it('is NOT range-gated: a far-off-axis hostile beyond ENEMY_ALERT_RANGE still calls out', () => {
    // :558-571 has no range check — the cue points you toward the enemy at any
    // distance, unlike ENEMY IN RANGE (which is range-gated).
    const game = stateWith({}, hostileAtBearing(90, ENEMY_ALERT_RANGE * 3))
    expect(inGameAlert(idle, prev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.LEFT}`)
  })

  it('is RELATIVE to heading: facing +X, a +Z hostile is on the RIGHT', () => {
    // Player faces +X (heading π/2); the +Z hostile sits at bearing −π/2 → RIGHT.
    const game = stateWith({ heading: Math.PI / 2 }, { x: 0, z: 10_000, phase: 'alive' })
    const facingPrev: TankPose = { x: 0, z: 0, heading: Math.PI / 2 }
    expect(inGameAlert(idle, facingPrev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.RIGHT}`)
  })
})

describe('bz3-11 AC2 — the directional cue respects the ROM gates and precedence', () => {
  const prev: TankPose = { x: 0, z: 0, heading: 0 }

  it('does NOT call out inside the forward dead-band (off the aim cone, within the in-view cutoff)', () => {
    // 25° off-axis: past ENEMY IN RANGE's ~9° aim cone but short of the 30.9° (22
    // BAM) in-view cutoff (BZONE.MAC:559 `CMP I,22.` / BCC skip) → no callout.
    expect(IN_VIEW_TURN_DEG).toBeCloseTo(30.9375, 4) // pins the transcribed cutoff
    const game = stateWith({}, hostileAtBearing(25))
    expect(inGameAlert(idle, prev, game)).toBeNull()
  })

  it('DOES call out just past the in-view cutoff (32° off-axis → LEFT)', () => {
    // 32° > 30.9° cutoff → the prompt engages (the two cases straddle 22 BAM).
    const game = stateWith({}, hostileAtBearing(32))
    expect(inGameAlert(idle, prev, game)).toBe(`${MESSAGES.ENEMY_TO} ${MESSAGES.LEFT}`)
  })

  it('pins the transcribed rear cutoff at 0x6B BAM = 150.468°', () => {
    expect(REAR_TURN_DEG).toBeCloseTo(150.46875, 4)
  })

  it('does NOT call out for a non-alive hostile (exploding, off-axis)', () => {
    const game = stateWith({}, hostileAtBearing(90, 10_000, 'exploding'))
    expect(inGameAlert(idle, prev, game)).toBeNull()
  })

  it('ENEMY IN RANGE still wins for a dead-ahead, in-range hostile (precedence unchanged)', () => {
    // Aligned + near → the aligned message, NOT a directional callout.
    const game = stateWith({}, { x: 0, z: 5000, phase: 'alive' })
    expect(inGameAlert(idle, prev, game)).toBe(MESSAGES.ENEMY_IN_RANGE)
  })

  it('MOTION BLOCKED still wins over a directional cue (precedence unchanged)', () => {
    const game = stateWith({ x: 100, z: 100 }, hostileAtBearing(90))
    const blockedPrev: TankPose = { x: 100, z: 100, heading: 0 } // unmoved → blocked
    expect(inGameAlert(forward, blockedPrev, game)).toBe(MESSAGES.MOTION_BLOCKED)
  })
})
