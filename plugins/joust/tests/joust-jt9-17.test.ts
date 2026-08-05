// tests/joust-jt9-17.test.ts
//
// Story jt9-17 — RED phase (Pennywise / TEA). The UNIT law for the WHOLE
// horizontal bounce `OSTLR` (JOUSTRV4.SRC:5110-5159), both parties at once.
//
// `bounceHorizontal(velX)` models ONE QUARTER of OSTLR — the rightward-moving
// party's self-velocity only (joust.ts:296-297). This suite pins the full law as
// a new pure function `bounceApartX(leftVelX, rightVelX)` returning both parties'
// reflected `PVELX`, both `PBUMPX` shoves and both `PFACE` writes. It fails today
// with "module has no `bounceApartX` export" (the loadJoust contract) until Julia
// builds it — a clean feature-absent red, never a type error.
//
// THE ROM ARITHMETIC, decoded from JOUSTRV4.SRC:5110-5159 (Motorola 6809; ASRA is
// an arithmetic shift = floor-divide-by-2; the FLYX index is always EVEN so no
// odd-negative >> edge arises):
//
//   LEFT party (must move LEFT — OSTXLF's `LDA PVELX,X / BLE 1$` guard, :5114-5115):
//     leftVelX'  = leftVelX > 0 ? -leftVelX + 2 : leftVelX          (guard: skip if <= 0)
//     rightBumpX = leftVelX > 0 ? leftVelX >> 1 : (-leftVelX + 2) >> 1   (STA PBUMPX,U, :5122)
//     PFACE,X   := -1  (LDA #-1 / STA PFACE,X, :5123-5124)  — UNCONDITIONAL
//
//   RIGHT party (must move RIGHT — OSTXLF's `LDA PVELX,U / BGE 2$` guard, :5130-5131):
//     rightVelX' = rightVelX < 0 ? -rightVelX - 2 : rightVelX       (guard: skip if >= 0)
//     leftBumpX  = rightVelX < 0 ? rightVelX >> 1 : -(rightVelX + 2) >> 1  (STA PBUMPX,X, :5134)
//     PFACE,U   := 0 -> our +1  (CLR PFACE,U, :5135)       — UNCONDITIONAL
//
// OSTURT (:5137-5158) is the same law with the register roles swapped, so one
// function over (leftVelX, rightVelX) captures both ROM arms. COLDX == 0 is the
// `BEQ OSTNLR` no-bounce case (:5112) and NEVER calls this — that gate lives at
// the wiring seam, pinned in demo-jt9-17.test.ts.

import { describe, it, expect } from 'vitest'
import { loadJoust, type HorizontalBounce } from './helpers/joust-collision-contract.js'

describe('jt9-17 — bounceApartX is the WHOLE OSTLR law, both parties', () => {
  it('both charging inward: each reflects away, slowed by 2, and half-bumps the other', async () => {
    const j = await loadJoust()
    // left +6 (moving right, toward), right -6 (moving left, toward).
    // left:  -6+2 = -4, bump on right = 6>>1 = 3.
    // right: -(-6)-2 = 4, bump on left = -6>>1 = -3.
    expect(j.bounceApartX(6, -6)).toEqual<HorizontalBounce>({
      leftVelX: -4,
      rightVelX: 4,
      leftBumpX: -3,
      rightBumpX: 3,
      leftFacing: -1,
      rightFacing: 1,
    })
  })

  it('left ALREADY moving away (BLE guard skips its reflect) — velocity left alone, still bumped', async () => {
    const j = await loadJoust()
    // left -8 (already moving left, <=0 -> guard skips: velocity UNCHANGED, not +10).
    // rightBump from the skipped form = (-(-8)+2)>>1 = 10>>1 = 5.
    // right -6 (charging): -(-6)-2 = 4, leftBump = -6>>1 = -3.
    expect(j.bounceApartX(-8, -6)).toEqual<HorizontalBounce>({
      leftVelX: -8,
      rightVelX: 4,
      leftBumpX: -3,
      rightBumpX: 5,
      leftFacing: -1,
      rightFacing: 1,
    })
  })

  it('right ALREADY moving away (BGE guard skips its reflect) — velocity left alone, still bumped', async () => {
    const j = await loadJoust()
    // right +8 (already moving right, >=0 -> guard skips: velocity UNCHANGED, not -10).
    // leftBump from the skipped form = -(8+2)>>1 = -10>>1 = -5.
    // left +6 (charging): -6+2 = -4, rightBump = 6>>1 = 3.
    expect(j.bounceApartX(6, 8)).toEqual<HorizontalBounce>({
      leftVelX: -4,
      rightVelX: 8,
      leftBumpX: -5,
      rightBumpX: 3,
      leftFacing: -1,
      rightFacing: 1,
    })
  })

  it('the ±2 slowdown can zero a velocity, and the bump is the pre-slow half', async () => {
    const j = await loadJoust()
    // left +2: -2+2 = 0, rightBump = 2>>1 = 1.
    // right -2: -(-2)-2 = 0, leftBump = -2>>1 = -1.
    expect(j.bounceApartX(2, -2)).toEqual<HorizontalBounce>({
      leftVelX: 0,
      rightVelX: 0,
      leftBumpX: -1,
      rightBumpX: 1,
      leftFacing: -1,
      rightFacing: 1,
    })
  })

  it('PFACE is UNCONDITIONAL: both guards skip, velocities untouched, but facings still turn', async () => {
    const j = await loadJoust()
    // Both already moving apart (left -8 <=0 skip, right +8 >=0 skip): neither
    // velocity changes, yet the LEFT party faces left and the RIGHT faces right.
    // A port that only writes PFACE inside the velocity guard fails here.
    const out = await j.bounceApartX(-8, 8)
    expect(out.leftVelX, 'left velocity untouched').toBe(-8)
    expect(out.rightVelX, 'right velocity untouched').toBe(8)
    expect(out.leftFacing, 'left party faces LEFT regardless of guard').toBe(-1)
    expect(out.rightFacing, 'right party faces RIGHT regardless of guard').toBe(1)
    // The bumps still land (from the skipped/no-reflect form).
    expect(out.rightBumpX, '(-(-8)+2)>>1').toBe(5)
    expect(out.leftBumpX, '-(8+2)>>1').toBe(-5)
  })
})
