// tests/core/tie-view-frustum.test.ts
//
// sw10-1 — C_PV's pyramid IS the cabinet's ±45° screen, because the render now
// projects with the cabinet's authentic lens.
//
// The ROM's view test (WSMAIN.MAC:3834-3841, `LDD M.YPS / SUBD M.XPS / LBHS
// RTS1`) is a RATIO law — lateral² < depth², vertical² < depth² — a ±45° square
// pyramid, symmetric on both axes, with no aspect term at all. uf1-14 diverged
// from it deliberately: at the time the clone projected with a 60° anisotropic
// lens (`perspective(FOV_Y=π/3, w/h, …)`), so the glass ended at 30° vertically
// and atan(aspect·tan30°) horizontally, and C_PV had to follow OUR glass or it
// would claim sky the player could not see. sw10-1 retires that lens: the render
// now uses the cabinet's symmetric ~90° FOV (45° half-angle on BOTH axes),
// divide-by-depth, aspect-INDEPENDENT (audit 2026-08-08-star-wars-projection-audit.md).
// So the glass IS the ROM's ±45° pyramid again, and C_PV returns to it — uf1-14's
// PRINCIPLE ("the bit matches the glass") is preserved; only the glass moved.
//
// The law these tests pin:
//
//   vertical bound   = depth · tan(45°) = depth        (|vert| < depth)
//   horizontal bound = depth · tan(45°) = depth        (|lat|  < depth)
//   at EVERY aspect  — the same TIE gives the same answer on any canvas.
//
// Both bounds are computed from the SAME FOV_Y the render projects with
// (tan(FOV_Y/2) = 1 at 90°), so the suite still follows the glass if the camera
// is ever retuned. RED against the shipping 30°/aspect implementation: it is the
// mutant, and each re-derived pin fails against it (a 30°-vertical or
// aspect-scaled-horizontal law reads these ±45° seats wrong) before Dev makes it
// pass.
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

/** tan of the render's half-angle — tan(45°) = 1 under the authentic symmetric
 *  90° lens. The one constant the whole law hangs off, taken from the SAME
 *  FOV_Y render.ts projects with rather than restated as a literal, so the pins
 *  track the camera. */
const TAN_HALF_FOV = Math.tan(FOV_Y / 2)

/** A TIE at `pos`, nose dead on the cockpit — C_AS geometry satisfied, so in
 *  the fire fixtures below the only thing that can silence it is the bit under
 *  test. No VM: it never moves, and twist 0 passes the AIM_AHEAD lockout. */
function aimedTie(pos: Vec3): Enemy {
  return makeTie({ pos: [...pos] as Vec3, orient: lookAtOrigin([...pos] as Vec3) })
}

/** Does computeStatus set C_PV for a TIE at `pos`, on a state whose frame was
 *  projected at `aspect`? Under the authentic lens the answer must NOT depend on
 *  `aspect` — state.aspect is still threaded through (uf1-12), but the ±45°
 *  pyramid ignores it. */
function inView(pos: Vec3, aspect = 1): boolean {
  const s: GameState = { ...makeSpaceState(), aspect }
  return (computeStatus(aimedTie(pos), s, rngSeed(1)) & Status.C_PV) !== 0
}

describe('sw10-1 — C_PV vertical: the authentic ±45° glass (was the render\'s 30°)', () => {
  it('sets C_PV just inside the ±45° band and clears it just outside', () => {
    // Vertical bound at depth 4000 is 4000 · tan(45°) = 4000. The positive claim
    // FIRST, and it sits at 3960 — OUTSIDE the shipping 30° band (2309), so the
    // ±45°-mutant fails it on a positive claim, not a vacuously-clear negative.
    expect(inView([4000, 0, 3960]), 'vert 3960 at depth 4000 is 44.7° up — on the ±45° glass, C_PV set').toBe(true)
    expect(inView([4000, 0, 4040]), 'vert 4040 at depth 4000 is 45.3° up — above the glass, C_PV clear').toBe(false)
  })

  it('reclaims the band the old 30° render cut off — sky the authentic glass shows', () => {
    // 36.9° of elevation: outside the retired 30° pyramid, comfortably inside the
    // authentic ±45°. Both signs — the ratio law squares, and the glass is
    // symmetric about the axis. This INVERTS uf1-14: what the 30° render hid, the
    // cabinet lens shows.
    expect(inView([4000, 0, 3000]), '36.9° above centre: on the authentic glass').toBe(true)
    expect(inView([4000, 0, -3000]), '36.9° below centre: on the authentic glass').toBe(true)
  })

  it('holds the ±45° vertical band at EVERY aspect — the lens is aspect-independent', () => {
    // The authentic lens fixes BOTH half-angles at 45° regardless of canvas. A
    // port that still scales the vertical (or either) axis by aspect fails an arm
    // of this loop.
    for (const aspect of [0.5, 1, 16 / 9, 21 / 9]) {
      expect(inView([4000, 0, 3960], aspect), `aspect ${aspect}: 44.7° up is on screen`).toBe(true)
      expect(inView([4000, 0, 4040], aspect), `aspect ${aspect}: 45.3° up is off screen`).toBe(false)
    }
  })

  it('derives the bound from the render\'s actual tangent (tan 45° = 1), not an eyeballed constant', () => {
    // At depth 30000 the vertical bound is 30000 · tan(45°) = 30000. Pinning ±2
    // units kills a hand-rounded 0.99/1.01 while any law actually derived from
    // FOV_Y passes untouched — and it fails hard against the 0.577 (30°) mutant.
    const bound = 30000 * TAN_HALF_FOV
    expect(inView([30000, 0, Math.floor(bound) - 2]), 'just inside the derived bound').toBe(true)
    expect(inView([30000, 0, Math.ceil(bound) + 2]), 'just outside the derived bound').toBe(false)
  })
})

describe('sw10-1 — C_PV horizontal: the SAME ±45° bound, aspect-INDEPENDENT (was atan(aspect·tan30°))', () => {
  it('is the ±45° square bound on a square canvas — the retired 30° under-reported by 15°', () => {
    // aspect 1: horizontal bound == vertical bound == depth == 4000. 36.9°
    // off-axis was OFF the old 30° square glass; it is ON the authentic one.
    expect(inView([4000, 3000, 0], 1), '36.9° off-axis on a square canvas: on the authentic glass').toBe(true)
    expect(inView([4000, 3960, 0], 1), '44.7° off-axis on a square canvas: still on the glass').toBe(true)
    expect(inView([4000, 4040, 0], 1), '45.3° off-axis on a square canvas: past the edge').toBe(false)
  })

  it('does NOT flip with the canvas — the same TIE reads the same at every aspect', () => {
    // The old law made a flank TIE appear/disappear as the canvas changed
    // (atan(aspect·tan30°)). The authentic law is aspect-independent, so a seat
    // inside ±45° is in view on EVERY canvas and a seat outside is out on every
    // one. This kills any aspect-dependent horizontal law outright.
    const inside: Vec3 = [4000, 3600, 0] // 42.0° off-axis, |lat| = 0.9·depth
    const outside: Vec3 = [4000, 4800, 0] // 50.2° off-axis, |lat| = 1.2·depth
    for (const aspect of [0.5, 1, 16 / 9, 21 / 9]) {
      expect(inView(inside, aspect), `aspect ${aspect}: 42.0° flank is on the ±45° glass`).toBe(true)
      expect(inView(outside, aspect), `aspect ${aspect}: 50.2° flank is off the ±45° glass`).toBe(false)
    }
  })

  it('GUARD: the law is a PYRAMID (per-axis ratio, the ROM\'s shape), not a cone', () => {
    // Near both edges at once: 44.7° laterally AND 44.7° vertically. Each axis
    // passes independently, so the ROM-shaped pyramid keeps it in view — while a
    // radial/cone rewrite (57.6° from the axis) would clear it. Pins the SHAPE
    // half of the law.
    expect(inView([4000, 3960, 3960], 1), 'the screen has corners — in view at both near-edges').toBe(true)
  })

  it('GUARD: the ROM depth clamps survive the re-derivation', () => {
    // Near/far are the ROM's own literals (VIEW_NEAR 0x10 exclusive, VIEW_FAR
    // 0x7F00 inclusive) and are angle-independent: sw10-1 rewrites the pyramid's
    // slope, not its caps. Dead ahead so the caps are all that decide.
    expect(inView([32512, 0, 0]), 'depth 0x7F00 itself is still in view').toBe(true)
    expect(inView([32513, 0, 0]), 'one unit past the far clamp is out').toBe(false)
    expect(inView([17, 0, 0]), 'depth 17 clears the near clamp').toBe(true)
    expect(inView([16, 0, 0]), 'depth 0x10 is out (LBLE — equality excluded)').toBe(false)
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

describe('sw10-1 — §6 fire gate: the ±45° pyramid decides who shoots (WSCPU.MAC:624-626)', () => {
  it('a TIE the old 30° render hid — 35° up, now on the authentic glass — fires', () => {
    // 35° of elevation at depth 4000 (vert 2801): OFF the retired 30° pyramid, so
    // the shipping law silences it — but it is ON the authentic ±45° glass, in
    // full view of the player, and every other gate passes (nose on the cockpit,
    // range 4883 > the $800 floor, 40 open windows). Under the cabinet lens it
    // must shoot. RED against the 30° mutant, which keeps it silent.
    expect(countFires(oneTieState([4000, 0, 2801]), 160)).toBeGreaterThan(0)
  })

  it('a TIE past ±45° — genuinely off the authentic glass — never fires', () => {
    // 47.7° up (vert 4400 at depth 4000): past the edge of the cabinet's own
    // ±45° screen, so the player cannot see it and it must not fire (the sw7-24
    // "no shooting guns if player can't see us" contract, now measured against
    // the authentic glass).
    expect(countFires(oneTieState([4000, 0, 4400]), 160)).toBe(0)
  })

  it('the gate is aspect-independent: a flank TIE fires (or not) the same on every canvas', () => {
    // The old law un-starved ultrawide flanks — a TIE fired at 21:9 and only at
    // 21:9. The authentic lens is aspect-independent: an on-glass flank fires on
    // BOTH square and ultrawide; an off-glass flank stays silent on both.
    const onGlass: Vec3 = [4000, 3600, 0] // 42.0° off-axis, |lat| = 0.9·depth
    const offGlass: Vec3 = [4000, 4800, 0] // 50.2° off-axis, |lat| = 1.2·depth
    expect(countFires(oneTieState(onGlass), 160, { ...NO_INPUT, aspect: 21 / 9 }), 'on-glass flank fires at 21:9').toBeGreaterThan(0)
    expect(countFires(oneTieState(onGlass), 160), 'on-glass flank fires on a square canvas too').toBeGreaterThan(0)
    expect(countFires(oneTieState(offGlass), 160, { ...NO_INPUT, aspect: 21 / 9 }), 'off-glass flank stays silent at 21:9').toBe(0)
    expect(countFires(oneTieState(offGlass), 160), 'off-glass flank stays silent on a square canvas').toBe(0)
  })

  it('GUARD: a TIE inside ±45° still fires — the gate filters, it does not silence', () => {
    // 24.2° up at depth 4000 — on the glass under BOTH the old and the authentic
    // law, so it is what makes the silences above a visibility contract rather
    // than a dead fire path.
    expect(countFires(oneTieState([4000, 0, 1800]), 160)).toBeGreaterThan(0)
  })
})
