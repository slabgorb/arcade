// tests/core/tie-fire-visibility.test.ts
//
// sw7-24 T5b — the C$PV "player has alien in view" fire gate.
//
// The ROM's §6 fire gate opens with a VISIBILITY test, not an aim test: the literal
// first condition (WSCPU.MAC:624-626) is `BITA #C$PV/100 / BEQ 40$` — "NO SHOOTING
// GUNS IF PLAYER CANT SEE US". C$PV (==1000, "PLAYER HAS ALIEN IN VIEW", WSCPU.MAC:37)
// is the one bit the per-frame A$CHST rebuild PRESERVES (`ANDA #C$PV/100 ;SAVE IF IN
// VIEW FOR GUNS`, WSCPU.MAC:532-536), set each frame by the view pass (WSMAIN.MAC:
// 3824-3846) when the alien sits inside the player's view pyramid:
//
//     LDD M.XP / CMPD #10   / LBLE RTS1      depth ≤ 0x10  → out (behind/too close)
//              / CMPD #7F00 / LBHI RTS1      depth > 0x7F00 → out (too far)
//     LDD M.YPS / SUBD M.XPS / LBHS RTS1     lateral² ≥ depth² → out (±45° pyramid)
//     LDD M.ZPS / SUBD M.XPS / LBHS RTS1     vertical² ≥ depth² → out
//     CHSET C$PV                             ;WITHIN PLAYERS VIEW SCREEN
//
// A square pyramid in front of the eye — a RATIO law, so it ports unit-for-unit
// (the near/far literals 0x10/0x7F00 live in the same world-unit space as the $800
// fire floor and the 0x7C00 spawn depth the port already uses). "In front" here is
// negative z, and the eye is the COCKPIT at the world origin — the view the player
// actually has, so the bit cannot lie about what is on screen. (Until sw8-8 it was
// measured from a frame-driven `spaceEye`; that camera was a mis-port of the
// starfield's ST.UX register and is retired — see the tombstone in gameRules.ts.)
//
// RE-DERIVED ANGLE (uf1-14). The ROM's ±45° is the 1983 cabinet's screen shape, not
// ours: the clone renders under perspective(FOV_Y, aspect) with FOV_Y = π/3, so the
// glass ends at 30° vertically (every aspect) and atan(aspect · tan(FOV_Y/2))
// horizontally. The ratio law stays as the SHAPE (strict, per-axis — BHS puts the
// edge out); the bound is now depth · tan(half-angle) per axis, with the horizontal
// read from state.aspect. The edge pins below use the aspect-1 bound, ≈ 0.5774 ·
// depth; the aspect sweeps live in tie-view-frustum.test.ts.
//
// Today the clone's gate substitutes C_AS (alien-aims-at-player) for cond-1 and
// never computes C_PV at all (tie-status.ts scopes the player-view bits out), so a
// TIE that has flown PAST the cockpit — behind the eye, off screen, exactly where
// sw8-6/sw8-7's denser swirl now routinely puts them — keeps firing at a player who
// cannot see it. The ROM forbids that. These tests pin the visibility gate ONLY;
// they deliberately do NOT pin whether C_AS stays in the conjunction (that election
// is design-owned, sw8-2 AC8) — every firing fixture below aims its nose at the
// cockpit, so the suite is green under C_PV-alone or C_PV∧C_AS alike.
//
// RED until computeStatus derives C_PV and the §6 gate consumes it.
//
// The sacred boundary holds: no DOM, no time except dt, no randomness except the
// seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import { stepGame } from '../../src/core/sim'
import { computeStatus } from '../../src/core/tie-status'
import { FOV_Y } from '../../src/core/gameRules'
import { Status } from '../../src/core/tie-vm'
import { initialState, TICK_HZ, type GameState, type Enemy } from '../../src/core/state'
import { NO_INPUT } from '../../src/core/input'
import type { Vec3 } from '@shared/math3d'
import { makeSpaceState, makeTie, lookAtOrigin, rngSeed } from './helpers/space'

const TICK_DT = 1 / TICK_HZ

/** A TIE at `pos` with its nose dead on the cockpit — C_AS geometry satisfied, so
 *  under the CURRENT gate (and under a kept C_AS election after the fix) the only
 *  thing that can stop it firing is the visibility bit under test. No VM: it never
 *  moves, and twist 0 passes the AIM_AHEAD lockout. */
function aimedTie(pos: Vec3): Enemy {
  return makeTie({ pos: [...pos] as Vec3, orient: lookAtOrigin([...pos] as Vec3) })
}

/** Wave 11 puts the §6 gate on TGPROB row 10 (mask 0x03, threshold 0x30): a fire
 *  window every 4 game frames at ~81% each — 40 windows across the 160-frame runs
 *  below, so "it never fired" cannot be cadence luck (P < 1e-28); it can only be a
 *  gate. Spawner parked, lives banked so homing fireballs never end the run. */
function oneTieState(pos: Vec3, seed = 1983): GameState {
  return {
    ...initialState(seed),
    wave: 11,
    enemies: [aimedTie(pos)],
    spawnTimer: 1e9,
    lives: 999,
  }
}

/** Step `n` whole game frames; count the frames on which an enemy-fire event fired. */
function countFires(state: GameState, n: number): number {
  let s = state
  let fires = 0
  for (let i = 0; i < n; i++) {
    s = stepGame(s, NO_INPUT, TICK_DT)
    if (s.events.some((e) => e.type === 'enemy-fire')) fires++
  }
  return fires
}

describe('sw7-24 T5b — C_PV: the view-pyramid status bit (WSMAIN.MAC:3824-3846)', () => {
  it('sets C_PV inside the view pyramid and clears it outside — behind, beyond ±45°', () => {
    const s = makeSpaceState()
    // Dead ahead at depth 4000: in view. FIRST assertion so the unfixed code (which
    // never sets the bit) fails here, not on a vacuously-clear negative case.
    expect(
      computeStatus(aimedTie([0, 0, -4000]), s, rngSeed(1)) & Status.C_PV,
      'a TIE dead ahead is on the player\'s screen — C$PV set (WSMAIN.MAC:3846)',
    ).toBe(Status.C_PV)
    // Behind the eye (positive z): the player cannot see it.
    expect(
      computeStatus(aimedTie([0, 0, 4000]), s, rngSeed(1)) & Status.C_PV,
      'a TIE behind the eye is off screen — C$PV clear',
    ).toBe(0)
    // The pyramid edge (lateral² < bound², the ROM's ratio SHAPE, WSMAIN.MAC:
    // 3834-3836): just inside is in view, just outside is not. The bound is the
    // RENDERED frustum's (uf1-14) — depth · aspect · tan(FOV_Y/2) ≈ 2309.4 at
    // depth 4000 on this square (aspect 1) state, not the cabinet's ±45°.
    expect(computeStatus(aimedTie([2299, 0, -4000]), s, rngSeed(1)) & Status.C_PV).toBe(Status.C_PV)
    expect(computeStatus(aimedTie([2320, 0, -4000]), s, rngSeed(1)) & Status.C_PV).toBe(0)
    // Same law on the vertical axis (M.ZPS vs M.XPS, WSMAIN.MAC:3838-3840) —
    // 30° at every aspect, because FOV_Y IS the vertical axis.
    expect(computeStatus(aimedTie([0, 2320, -4000]), s, rngSeed(1)) & Status.C_PV).toBe(0)
  })

  it('ports the ROM depth clamps: in view through 0x7F00, out past it and at ≤ 0x10', () => {
    const s = makeSpaceState()
    // Far clamp (CMPD #7F00 / LBHI): 0x7F00 = 32512 itself is still in view (BHI is
    // strictly-greater), one unit past is out. Deeper than the 0x7C00 spawn, so every
    // live approach starts visible.
    expect(computeStatus(aimedTie([0, 0, -32512]), s, rngSeed(1)) & Status.C_PV).toBe(Status.C_PV)
    expect(computeStatus(aimedTie([0, 0, -32513]), s, rngSeed(1)) & Status.C_PV).toBe(0)
    // Near clamp (CMPD #10 / LBLE): depth 0x10 = 16 is out (LE), 17 is in. Unreachable
    // through the §6 fire floor ($800) but it is the ROM's own law — pin it where it
    // lives, in the status bit.
    expect(computeStatus(aimedTie([0, 0, -17]), s, rngSeed(1)) & Status.C_PV).toBe(Status.C_PV)
    expect(computeStatus(aimedTie([0, 0, -16]), s, rngSeed(1)) & Status.C_PV).toBe(0)
  })

  it('measures the pyramid from the COCKPIT, and never drifts off it with the frame counter', () => {
    // INVERTED by sw8-8. This test used to assert the opposite — that the pyramid follows a
    // frame-driven `spaceEye` (at frame 128 the ST.UX sawtooth put it at x = 1024), and it
    // staged a TIE 3,976 off THAT eye so an origin-anchored port would read the fixture
    // backwards. The premise was wrong: `ST.UX` is the starfield's register, not a camera
    // (WSSTAR.MAC:98 is its only CONSUMER — see the tombstone in gameRules.ts), so the pilot never
    // slides and neither does his view pyramid. The same fixture now pins the correct law.
    //
    // The frame counter is the discriminator: a port that re-derives a moving eye reads this
    // TIE as IN view at frame 128 (|3000 − 1024| = 1976 < the ≈2424.9 aspect-1 bound at depth
    // 4200) and OUT of view at frame 0 (3000 > 2424.9). The cockpit-anchored law says OUT of
    // view at both — the C_PV bit cannot depend on how long the wave has been running.
    // (Fixture re-seated by uf1-14: under the frustum bound the old 5000 sat outside from
    // BOTH eyes, which would have let a moving-eye port pass unnoticed.)
    const pos: Vec3 = [3000, 0, -4200]
    expect(Math.abs(pos[0]), 'fixture guard: lateral sits OUTSIDE the pyramid').toBeGreaterThan(4200 * Math.tan(FOV_Y / 2))
    for (const frame of [0, 128]) {
      const s: GameState = { ...makeSpaceState(), frame }
      expect(
        computeStatus(aimedTie(pos), s, rngSeed(1)) & Status.C_PV,
        `frame ${frame}: outside the cockpit's pyramid, so NOT in view`,
      ).toBe(0)
    }
    // ...and the mirror: a TIE inside the cockpit's pyramid is in view at both frames, so the
    // inversion above is a real constraint and not just "C_PV never sets".
    const inside: Vec3 = [2400, 0, -4200]
    for (const frame of [0, 128]) {
      const s: GameState = { ...makeSpaceState(), frame }
      expect(
        computeStatus(aimedTie(inside), s, rngSeed(1)) & Status.C_PV,
        `frame ${frame}: inside the cockpit's pyramid, so in view`,
      ).toBe(Status.C_PV)
    }
  })
})

describe('sw7-24 T5b — §6 fire gate cond-1: no shooting guns if the player cannot see us (WSCPU.MAC:624-626)', () => {
  it('a TIE behind the eye never fires, however long the gates stay open', () => {
    // Nose on the cockpit (C_AS set), past the $800 floor, no glow, no AIM_AHEAD,
    // 40 open windows at ~81% — every gate the clone tests today passes, so today it
    // FIRES from off screen. The ROM's first gate says it must not.
    expect(countFires(oneTieState([0, 0, 4000]), 160)).toBe(0)
  })

  it('a TIE far outside the view pyramid never fires either', () => {
    // Lateral 20000 at depth 5000 — miles off screen even at the eye's ±2048 extreme.
    expect(countFires(oneTieState([20000, 0, -5000]), 160)).toBe(0)
  })

  it('GUARD: the same TIE in view still fires — the gate filters, it does not silence', () => {
    // Identical fixture, position swung to dead ahead at the same range: in view for
    // the whole run (eye drift ≤ 2048 < 4000), so the §6 cadence must still produce
    // fire. Green today and green after the gate lands — this is what makes the two
    // never-fires above a VISIBILITY contract rather than a dead fire path.
    expect(countFires(oneTieState([0, 0, -4000]), 160)).toBeGreaterThan(0)
  })
})
