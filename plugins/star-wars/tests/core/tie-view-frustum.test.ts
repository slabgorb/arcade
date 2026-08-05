// tests/core/tie-view-frustum.test.ts
//
// uf1-14 — C_PV's pyramid must be the RENDERED frustum, not the 1983 cabinet's
// ±45° screen.
//
// The ROM's view test (WSMAIN.MAC:3834-3841, `LDD M.YPS / SUBD M.XPS / LBHS
// RTS1`) is a RATIO law — lateral² < depth², vertical² < depth² — a ±45° square
// pyramid. A ratio ports unit-for-unit, which is why sw7-24's port looked safe;
// but the 45° encodes the CABINET's screen shape, and ours is not that shape.
// The clone projects with `perspective(FOV_Y, w/h, NEAR, FAR)` (render.ts:490,
// FOV_Y = π/3 from gameRules.ts), so the glass actually ends at:
//
//   vertical half-angle:    FOV_Y/2 = 30°, at EVERY aspect
//   horizontal half-angle:  atan(aspect · tan(FOV_Y/2)) — 45.7° at 16:9,
//                           37.6° at 4:3, 30.0° at 1:1, 53.4° at 21:9
//
// So the ported 45° over-reports a 15° band of sky above and below the screen
// (claimed "in view", the player cannot see it), and — because C_PV is the §6
// fire gate's literal first condition (WSCPU.MAC:624-626, "NO SHOOTING GUNS IF
// PLAYER CANT SEE US") — TIEs off the top or bottom of the screen still shoot.
// That is the defect sw7-24 was written to kill, surviving on the vertical
// axis. Horizontally the error swings with the canvas: nearly right at 16:9
// (which is why it went unnoticed), UNDER-reporting by 8.4° at 21:9 — silently
// starving fire on ultrawide.
//
// The law these tests pin: keep the ROM's ratio law as the SHAPE (still a
// per-axis pyramid in view space, strict inequality — BHS puts the edge out),
// re-derive the ANGLE from the real frustum, with the horizontal bound read
// from the viewport aspect the core already carries (state.aspect, uf1-12).
// Every expected boundary below is computed from the SAME FOV_Y the render
// projects with, so this suite follows the glass if the camera is ever retuned.
//
// RED until computeStatus derives C_PV from the frustum. That RED is also the
// mutation proof: the shipping implementation IS the ±45° mutant, and each
// re-derived pin must fail against it before Dev makes it pass.
//
// The sacred boundary holds: no DOM, no time except dt, no randomness except
// the seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import { computeStatus } from '../../src/core/tie-status'
import { Status } from '../../src/core/tie-vm'
import { FOV_Y } from '../../src/core/gameRules'
import { stepGame } from '../../src/core/sim'
import { initialState, TICK_HZ, type GameState, type Enemy } from '../../src/core/state'
import { NO_INPUT, type Input } from '../../src/core/input'
import type { Vec3 } from '@shared/math3d'
import { makeSpaceState, makeTie, lookAtOrigin, rngSeed } from './helpers/space'

const TICK_DT = 1 / TICK_HZ

/** tan of the render's vertical half-angle — tan(30°) ≈ 0.57735. The one
 *  constant the whole law hangs off, taken from the SAME FOV_Y render.ts
 *  projects with rather than restated as a literal. */
const TAN_HALF_FOV = Math.tan(FOV_Y / 2)

/** A TIE at `pos`, nose dead on the cockpit — C_AS geometry satisfied, so in
 *  the fire fixtures below the only thing that can silence it is the bit under
 *  test. No VM: it never moves, and twist 0 passes the AIM_AHEAD lockout. */
function aimedTie(pos: Vec3): Enemy {
  return makeTie({ pos: [...pos] as Vec3, orient: lookAtOrigin([...pos] as Vec3) })
}

/** Does computeStatus set C_PV for a TIE at `pos`, on a state whose frame was
 *  projected at `aspect`? (state.aspect is the field uf1-12 shipped for exactly
 *  this — core geometry that must agree with the glass reads it from there.) */
function inView(pos: Vec3, aspect = 1): boolean {
  const s: GameState = { ...makeSpaceState(), aspect }
  return (computeStatus(aimedTie(pos), s, rngSeed(1)) & Status.C_PV) !== 0
}

describe('uf1-14 — C_PV vertical: the render shows 30°, not the cabinet\'s 45°', () => {
  it('sets C_PV just inside the 30° band and clears it just outside', () => {
    // Vertical bound at depth 4000 is 4000 · tan(FOV_Y/2) ≈ 2309.4. One side
    // FIRST so the unfixed ±45° law (which happily sets the bit at 2320) fails
    // on a positive claim, not a vacuously-clear negative.
    expect(inView([0, 2320, -4000]), 'vert 2320 at depth 4000 is 30.1° up — above the glass, C_PV clear').toBe(false)
    expect(inView([0, 2299, -4000]), 'vert 2299 at depth 4000 is 29.9° up — on screen, C_PV set').toBe(true)
  })

  it('clears the stolen 15° band — sky the ±45° port claimed but the player cannot see', () => {
    // 36.9° of elevation: comfortably inside the ported 45° pyramid, comfortably
    // outside the rendered 30°. Both signs — the ratio law squares, and the glass
    // is symmetric about the axis.
    expect(inView([0, 3000, -4000]), '36.9° above the screen top: not in view').toBe(false)
    expect(inView([0, -3000, -4000]), '36.9° below the screen bottom: not in view').toBe(false)
  })

  it('holds the 30° vertical band at EVERY aspect — FOV_Y is the vertical axis', () => {
    // perspective(FOV_Y, aspect) fixes the VERTICAL half-angle; only the
    // horizontal swings with the canvas. A port that scales both axes by the
    // aspect fails the 21:9 arm (2320 < 4000 · 2.333 · tan30°).
    for (const aspect of [0.5, 1, 16 / 9, 21 / 9]) {
      expect(inView([0, 2299, -4000], aspect), `aspect ${aspect}: 29.9° up is on screen`).toBe(true)
      expect(inView([0, 2320, -4000], aspect), `aspect ${aspect}: 30.1° up is off screen`).toBe(false)
    }
  })

  it('derives the bound from the render\'s actual tangent, not an eyeballed constant', () => {
    // At depth 30000 the vertical bound is 30000 · tan(FOV_Y/2) = 17320.5.
    // Pinning ±3 units (±0.02%) kills a hand-rounded 0.577/0.578 while any law
    // actually derived from FOV_Y passes untouched.
    const bound = 30000 * TAN_HALF_FOV
    expect(inView([0, Math.floor(bound) - 2, -30000]), 'just inside the derived bound').toBe(true)
    expect(inView([0, Math.ceil(bound) + 2, -30000]), 'just outside the derived bound').toBe(false)
  })
})

describe('uf1-14 — C_PV horizontal: atan(aspect · tan(FOV_Y/2)), read from state.aspect', () => {
  it('narrows to 30° on a square canvas — the ported 45° over-reports by 15°', () => {
    // aspect 1: horizontal bound == vertical bound ≈ 2309.4 at depth 4000.
    expect(inView([3000, 0, -4000], 1), '36.9° off-axis on a square canvas: off screen').toBe(false)
    expect(inView([2299, 0, -4000], 1), '29.9° off-axis on a square canvas: on screen').toBe(true)
  })

  it('widens to 45.7° at 16:9 — wider than the ported 45°, not narrower', () => {
    // Bound at 16:9, depth 4000: 4000 · (16/9) · tan30° ≈ 4105.6. The inside pin
    // sits at 45.35° — OUTSIDE the ported 45° pyramid — so the unfixed law fails
    // it: the fix must WIDEN the horizontal here, not merely shrink everything.
    expect(inView([4050, 0, -4000], 16 / 9), '45.35° at 16:9: still on the glass').toBe(true)
    expect(inView([4160, 0, -4000], 16 / 9), '46.1° at 16:9: past the edge').toBe(false)
  })

  it('follows the state\'s OWN aspect — the same TIE flips with the canvas, killing any hardcoded ratio', () => {
    // 50.2° off-axis: inside a 21:9 frustum (bound ≈ 5388.6 at depth 4000),
    // outside a 16:9 one (≈ 4105.6). A law that bakes in ANY single aspect —
    // square, 16:9 or ultrawide — gets at least one arm of this pair wrong.
    const pos: Vec3 = [4800, 0, -4000]
    expect(inView(pos, 21 / 9), 'ultrawide: 50.2° is on a 53.4° screen').toBe(true)
    expect(inView(pos, 16 / 9), '16:9: 50.2° is past a 45.7° screen').toBe(false)
    // And a TALL canvas narrows below the square bound (0.5 → ≈ 1154.7 at 4000):
    // the horizontal law must shrink with aspect < 1, not clamp at the vertical.
    expect(inView([1500, 0, -4000], 0.5), 'tall canvas: 20.6° is past a 16.1° screen').toBe(false)
    expect(inView([1500, 0, -4000], 1), 'square canvas: 20.6° is on a 30° screen').toBe(true)
  })

  it('GUARD: the law is a PYRAMID (per-axis ratio, the ROM\'s shape), not a cone', () => {
    // Near both edges at once: 29.9° laterally AND 29.9° vertically. Each axis
    // passes independently, so the ROM-shaped pyramid keeps it in view — while a
    // radial/cone rewrite (39.1° from the axis) would clear it. Green today and
    // green after: this pins the SHAPE half of the AC.
    expect(inView([2299, 2299, -4000], 1), 'the screen has corners — in view at both near-edges').toBe(true)
  })

  it('GUARD: the ROM depth clamps survive the re-derivation', () => {
    // Near/far are the ROM's own literals (VIEW_NEAR 0x10 exclusive, VIEW_FAR
    // 0x7F00 inclusive) and are angle-independent: the story rewrites the
    // pyramid's slope, not its caps. Dead ahead so both laws agree today.
    expect(inView([0, 0, -32512]), 'depth 0x7F00 itself is still in view').toBe(true)
    expect(inView([0, 0, -32513]), 'one unit past the far clamp is out').toBe(false)
    expect(inView([0, 0, -17]), 'depth 17 clears the near clamp').toBe(true)
    expect(inView([0, 0, -16]), 'depth 0x10 is out (LBLE — equality excluded)').toBe(false)
  })
})

// ---------------------------------------------------------------------------
// The §6 fire gate, end to end — C_PV is its literal first condition, so the
// re-derived pyramid must change WHO SHOOTS, not just a status word.
// ---------------------------------------------------------------------------

/** Wave 11 puts the §6 gate on TGPROB row 10 (mask 0x03, threshold 0x30): a
 *  fire window every 4 game frames at ~81% each — 40 windows across the
 *  160-frame runs below, so "it never fired" cannot be cadence luck; it can
 *  only be a gate. Spawner parked, lives banked so homing fireballs never end
 *  the run. (Mirrors tie-fire-visibility.test.ts's fixture.) */
function oneTieState(pos: Vec3, seed = 1983): GameState {
  return {
    ...initialState(seed),
    wave: 11,
    enemies: [aimedTie(pos)],
    spawnTimer: 1e9,
    lives: 999,
  }
}

/** Step `n` whole game frames under `input`; count frames with an enemy-fire
 *  event. `input.aspect` rides through stepGame onto state.aspect each frame —
 *  the same path the shell feeds the projection through. */
function countFires(state: GameState, n: number, input: Input = NO_INPUT): number {
  let s = state
  let fires = 0
  for (let i = 0; i < n; i++) {
    s = stepGame(s, input, TICK_DT)
    if (s.events.some((e) => e.type === 'enemy-fire')) fires++
  }
  return fires
}

describe('uf1-14 — §6 fire gate: the pyramid decides who shoots (WSCPU.MAC:624-626)', () => {
  it('a TIE in the stolen vertical band — on screen per the old 45°, above the glass in truth — never fires', () => {
    // 35° of elevation at depth 4000: the ported law reads it "in view" and
    // today it FIRES at a player who cannot see it — the exact defect sw7-24
    // was written to kill, surviving on the vertical axis (AC-5). Nose on the
    // cockpit, range 4883 > the $800 floor, 40 open windows: every other gate
    // passes, so silence can only come from the frustum-true C_PV.
    expect(countFires(oneTieState([0, 2801, -4000]), 160)).toBe(0)
  })

  it('an ultrawide canvas un-starves the flanks: 50.2° off-axis fires at 21:9 and only at 21:9', () => {
    // The same TIE the unit pair above flips: visible on a 21:9 glass, past the
    // edge of the ported 45° — so today it is silently starved (the horizontal
    // HALF of the story). After the fix it must shoot when, and only when, the
    // canvas actually shows it: square canvas leaves it silent.
    const pos: Vec3 = [4800, 0, -4000]
    expect(
      countFires(oneTieState(pos), 160, { ...NO_INPUT, aspect: 21 / 9 }),
      'visible on the ultrawide glass — the gate must open',
    ).toBeGreaterThan(0)
    expect(
      countFires(oneTieState(pos), 160),
      'square canvas: off the glass — the gate stays shut',
    ).toBe(0)
  })

  it('GUARD: a TIE inside the 30° band still fires — the gate filters, it does not silence', () => {
    // 24.2° up at depth 4000 — on the glass under BOTH laws, so this is green
    // today and green after. It is what makes the two silences above a
    // visibility contract rather than a dead fire path.
    expect(countFires(oneTieState([0, 1800, -4000]), 160)).toBeGreaterThan(0)
  })
})
