// tests/core/tie-sights-status.test.ts
//
// uf1-12 — C$PS, "PLAYER HAS ALIEN IN SITES" (WSCPU.MAC:36, `C$PS ==800`).
//
// The clone assembles four gates on this bit inside TCH1DZ (tie-vm.ts:341-342,
// WSCPU.MAC:1639/1641/1643/1646) but `computeStatus` never derives it, so it reads
// permanently false: three CUNTIL gates lose one of their two release conditions and
// the TCH1DZ_20 arm is dead ported code. Unlike C_AD/C_AV/C_PM this is a real gap —
// the cabinet genuinely sets the bit, in exactly ONE place tree-wide.
//
// THE ROM GATE (WSMAIN.MAC:3880-3932, inside the object-draw pass). The SAME two
// scratch values serve the player's laser hit test and the sights bit:
//
//     LDD M.YP / ADDD #10. ;ADDIN CURSOR SIZE   → TMPSIZ = projected size + cursor
//     LDD BJ.CX / SUBD LZ.CX / IFMI / NEGD      → |dx| object-centre minus lazar-centre
//     LDD BJ.CY / SUBD LZ.CY / IFMI / NEGD      → |dy|
//     ... / STD TMPOCT                          → TMPOCT = |dx| + |dy|
//
//   the HIT (:3898-3918, and identically WSGUNS.MAC:925-948 for the guns):
//     LDD TMPXD / SUBD TMPSIZ / IFLE            → |dx| ≤ TMPSIZ
//     LDD TMPYD / SUBD TMPSIZ / IFLE            → |dy| ≤ TMPSIZ
//     LDD TMPSIZ / LSRD / ADDD TMPSIZ ;MAKE 1.5 FOR OCTAGON
//     SUBD TMPOCT / IFGE                        → TMPOCT ≤ 1.5 × TMPSIZ
//
//   the SIGHTS (:3919-3932):
//     LDD TMPSIZ ;?AIM IS NEARING ALIEN?
//     ADDD TMPSIZ / ADDD TMPSIZ ;ALLOW LARGER WARNING AREA
//     SUBD TMPOCT / IFHS                        → TMPOCT ≤ 3 × TMPSIZ
//     LDX S2.PRM / LDA A$TYP(X) / CMPA #1 / BNE 86$   ;?ALIVE?
//     LDD A$CHST(X) / CHSET C$PS ;STATUS: ALIEN IN PLAYER SITES
//
// So the sights band is not a tuned threshold and not a cone: it is the KILL BAND,
// doubled. 3·TMPSIZ over 1.5·TMPSIZ is EXACTLY 2 — and that factor is the only part
// of the expression that is unit-free, radix-free and projection-free, which is
// precisely why it is the part that ports. (`#10.` is the one literal here, and the
// `.` is a decimal override, so even it tells you the file's default radix is not 10.)
//
// The port follows the doctrine gameRules.ts already states for this exact ROM
// octagon: "an object is under the site exactly when the AIM RAY passes within its
// hit radius … it also reuses the hit radii the game already has (TIE_HIT_RADIUS &c.)
// instead of inventing a reticle size, so the beam and the sphere can never disagree
// about how big a target is." C_PS is that same predicate at twice the radius.
//
// The ROM's ?ALIVE? guard (A$TYP == 1) needs no port: `state.enemies` holds only live
// fighters — a killed TIE moves to `dyingTies`.
//
// The visibility gate is C_PV, and it is control flow rather than proximity (sw8-19):
// `S2VW` (WSMAIN.MAC:3755) exits to `RTS1` at WSMAIN.MAC:3826, :3828, :3836 and :3842 —
// the near clamp, the far clamp and the two ratio tests, i.e. C_PV's own definition —
// all of them BEFORE `CHSET C$PV` at WSMAIN.MAC:3846, so the sole `CHSET C$PS` at
// WSMAIN.MAC:3930 is unreachable for an object the cabinet did not draw. `beamHit`'s
// refusal of targets behind the gun is a real but weaker guard that survives alongside
// it, and it is not that gate. The gating itself is pinned by
// `tie-sights-visibility.test.ts`; the seats below all sit inside the rendered pyramid,
// so they exercise the band rather than the gate.
//
// RED until computeStatus derives C_PS.
//
// The sacred boundary holds: no DOM, no time except dt, no randomness except the
// seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import { computeStatus, SIGHTS_BAND_FACTOR, SIGHTS_OCTAGON } from '../../src/core/tie-status'
import { Status } from '../../src/core/tie-vm'
import { aimDirection, beamHit, COCKPIT, FOV_Y } from '../../src/core/gameRules'
import { TIE_HIT_RADIUS, type GameState } from '../../src/core/state'
import { add, scale, type Vec3 } from '@shared/math3d'
import { makeSpaceState, makeTie, lookAtOrigin, lookAway, rngSeed } from './helpers/space'

// The ROM's doubling — `ADDD TMPSIZ / ADDD TMPSIZ` (3×) over `LSRD / ADDD TMPSIZ` (1.5×),
// WSMAIN.MAC:3920-3922 vs :3904-3906 — used to live here as a file-local `SIGHTS_FACTOR = 2`.
// R3 retired it: two test-local terms compared against a third proved nothing about the
// machine. `SIGHTS_BAND_FACTOR` and `SIGHTS_OCTAGON` are imported above and compared to each
// other instead, so a drift between them fails rather than cancelling out.

/** A point exactly `depth` along the aim ray the given state is holding, pushed
 *  `offset` units broadside (world +Y, the native right axis, which is perpendicular
 *  to the at-rest ray). Built from the SAME shared helpers the core aims with, so the
 *  fixture cannot drift from the machine under test. */
function onRay(s: GameState, depth: number, offset = 0): Vec3 {
  const eye = COCKPIT
  const dir = aimDirection(s.aimX, s.aimY)
  const p = add(eye, scale(dir, depth))
  return [p[0], p[1] + offset, p[2]] // native: index 1 = right (broadside)
}

/** The yoke position that puts the crosshair on a world point, inverting
 *  `aimDirection` (gameRules.ts:54-57) at the unit aspect the tests run at.
 *  Native basis: depth is index 0, right index 1, up index 2. */
function aimAt(pos: Vec3): { aimX: number; aimY: number } {
  const eye = COCKPIT
  const f = 1 / Math.tan(FOV_Y / 2)
  const depth = pos[0] - eye[0]
  return { aimX: (f * (pos[1] - eye[1])) / depth, aimY: (f * (pos[2] - eye[2])) / depth }
}

const sights = (e: ReturnType<typeof makeTie>, s: GameState, seed = 1) =>
  computeStatus(e, s, rngSeed(seed)) & Status.C_PS

describe('uf1-12 — C_PS: the player-sights status bit (WSMAIN.MAC:3919-3932)', () => {
  it('is the ROM equate C$PS == 0x800 (WSCPU.MAC:36)', () => {
    expect(Status.C_PS).toBe(0x800)
  })

  it('sets C_PS when the crosshair is on the TIE, and clears it well outside the warning band', () => {
    const s = makeSpaceState()
    // Dead on the ray. FIRST assertion, so code that never sets the bit fails HERE
    // rather than on a negative case it passes vacuously.
    expect(
      sights(makeTie({ pos: onRay(s, 6000) }), s),
      'a TIE the crosshair is sitting on is in the player\'s sights (CHSET C$PS)',
    ).toBe(Status.C_PS)
    // Far broadside of the ray — the aim is nowhere near it.
    expect(
      sights(makeTie({ pos: onRay(s, 6000, 40 * TIE_HIT_RADIUS) }), s),
      'a TIE far off the aim ray is not in the sights',
    ).toBe(0)
  })

  it('opens the band as the ROM L1 OCTAGON at 3·TMPSIZ — not as a disc at 2×', () => {
    // REWRITTEN by sw8-27, not relaxed. The old version asserted a DISC boundary at
    // `SIGHTS_BAND_FACTOR × TIE_HIT_RADIUS` and was right about the only number it could see.
    //
    // What it could not see: `SIGHTS_BAND_FACTOR = 2` is the ratio of the two OCTAGON terms
    // (3 ÷ 1.5), and it is genuinely 2 — but the cabinet never tests a radius. C_PS is
    // `LDD TMPSIZ / ADDD TMPSIZ / ADDD TMPSIZ / SUBD TMPOCT / IFHS` (WSMAIN.MAC:3920-3924),
    // i.e. `|dx| + |dy| <= 3·TMPSIZ`, with NO box term at all — an L1 octagon, not a circle.
    // A disc of radius 2·T is a strict SUBSET of that octagon: they agree nowhere except by
    // accident, reaching 3·T on the axes and 2.121·T on the diagonals against a flat 2·T.
    //
    // So the old assertions were not merely under-specified, they pinned the wrong SHAPE at
    // a boundary the cabinet does not have. The rewrite keeps the anchor and the
    // wider-than-the-kill-band property and replaces the boundary with the ROM's own terms.
    const s = makeSpaceState()
    const T = TIE_HIT_RADIUS
    const OCT = 3 * T // the cabinet's warning octagon, WSMAIN.MAC:3920-3923
    // Absolute anchor, so the boundary probes below cannot go vacuous if the
    // established hit radius is ever retuned without revisiting this law.
    expect(TIE_HIT_RADIUS, 'fixture anchor: the established TIE kill radius').toBe(250)
    // And the anchor that ties `OCT`'s literal 3 to the constant the machine reads. Without
    // it the probes below measure a number this file made up: halving the shipped band
    // (`SIGHTS_OCTAGON` 3 → 1.5) would move the code and not the fixture, and every seat
    // would still be scored against 750.
    expect(SIGHTS_OCTAGON, 'the shipped warning octagon, WSMAIN.MAC:3920-3923').toBe(3)
    // The ratio `SIGHTS_BAND_FACTOR` names, pinned as a ratio and nothing more: the warning
    // octagon over the kill octagon, 3 ÷ 1.5. It is the one term in the whole expression
    // that is unit-free, and it is what survives of the retired disc model — the shape
    // probes below, not this line, are what pin the region.
    //
    // R3 (round-2 review): this line was a TAUTOLOGY. It read
    // `expect(OCT / (1.5 * T)).toBe(SIGHTS_FACTOR)` against a file-local `SIGHTS_FACTOR = 2`,
    // with `OCT = 3 * T` and `T = TIE_HIT_RADIUS` — three test-local values, and
    // `(3T)/(1.5T) ≡ 2` for every non-zero T. No mutation of production code could fail it,
    // and it existed only because `SIGHTS_FACTOR` had gone unused and `noUnusedLocals` is on.
    // Both terms are now imported from the module under test, which is what the sibling line
    // at `tie-sights-visibility.test.ts:172` does — so the two constants drifting apart
    // reddens here instead of passing.
    expect(SIGHTS_OCTAGON / 1.5, 'the ROM doubling: 3·TMPSIZ over 1.5·TMPSIZ').toBe(SIGHTS_BAND_FACTOR)

    // ON THE AXIS the octagon reaches 3·T. A disc at 2·T stops at 500 and reddens here.
    expect(
      sights(makeTie({ pos: onRay(s, 6000, OCT - 1) }), s),
      'one unit inside 3·TMPSIZ on the axis is in the sights',
    ).toBe(Status.C_PS)
    expect(
      sights(makeTie({ pos: onRay(s, 6000, OCT + 1) }), s),
      'one unit outside 3·TMPSIZ on the axis is not',
    ).toBe(0)

    // ON THE DIAGONAL the same octagon reaches only 1.5·T per axis — 2.121·T radially.
    // This is the pair that discriminates the octagon from ANY disc: a disc widened to 3·T
    // to satisfy the axis probes above would accept the second seat here.
    const diag = (perAxis: number): Vec3 => {
      const p = onRay(s, 6000)
      return [p[0], p[1] + perAxis, p[2] + perAxis] // native: offset right (1) and up (2)
    }
    expect(
      sights(makeTie({ pos: diag(1.5 * T - 1) }), s),
      'just inside the octagon on the diagonal (|dx| + |dy| < 3·TMPSIZ)',
    ).toBe(Status.C_PS)
    expect(
      sights(makeTie({ pos: diag(1.5 * T + 1) }), s),
      'just outside it — the SUM is what the cabinet tests, not the radius',
    ).toBe(0)

    // And the band is genuinely WIDER than the kill band — a port that reused the
    // kill radius unchanged (factor 1 instead of 3) reddens here.
    expect(
      sights(makeTie({ pos: onRay(s, 6000, TIE_HIT_RADIUS + 1) }), s),
      'just OUTSIDE the kill radius is still inside the warning band',
    ).toBe(Status.C_PS)
  })

  it('keeps the two machines agreeing: anything the laser can KILL is in the sights', () => {
    // 1.5·TMPSIZ ⊂ 3·TMPSIZ is a containment in the ROM, so it must be one here.
    // Sweeping the same grid through `beamHit` — the clone's actual kill test — is
    // what stops the sights bit and the gun from ever disagreeing about a target.
    const s = makeSpaceState()
    const eye = COCKPIT
    const dir = aimDirection(s.aimX, s.aimY)
    let killable = 0
    for (const depth of [1200, 6000, 20000]) {
      for (let offset = 0; offset <= 4 * TIE_HIT_RADIUS; offset += 25) {
        const pos = onRay(s, depth, offset)
        if (beamHit(eye, dir, pos, TIE_HIT_RADIUS) === null) continue
        killable++
        expect(
          sights(makeTie({ pos }), s),
          `a TIE the laser can kill at depth ${depth}, offset ${offset} must be in the sights`,
        ).toBe(Status.C_PS)
      }
    }
    expect(killable, 'guard: the sweep actually contained killable positions').toBeGreaterThan(0)
  })

  it("never sights a TIE behind the eye — beamHit's `along <= 0` refusal", () => {
    // Renamed at sw8-19's finish (TEA's own filed Improvement). The old name claimed
    // "the CHSET lives in the DRAW pass", which is a statement about the ROM's draw-pass
    // gate — and nothing here observes that gate; this test only exercises the behind-the-
    // eye half, which comes from `beamHit`. The name was the closest the suite could get
    // while the draw-pass gate was unported. It IS ported now (C_PS is gated on C_PV) and
    // covered by `tie-sights-visibility.test.ts`, so this name narrows to what it proves.
    const s = makeSpaceState()
    const eye = COCKPIT
    // Mirror of the on-ray fixture, straight out the back of the cockpit (native: −depth).
    expect(sights(makeTie({ pos: [eye[0] - 6000, eye[1], eye[2]] }), s)).toBe(0)
  })

  it('follows the YOKE: steering the crosshair onto an off-axis TIE sets the bit', () => {
    const rest = makeSpaceState()
    // A TIE parked well off the at-rest ray — outside the band while the yoke is centred.
    const pos = onRay(rest, 6000, 3000)
    expect(sights(makeTie({ pos }), rest), 'centred yoke: not in the sights').toBe(0)
    // Now put the crosshair on it. The bit reads the CROSSHAIR, not the cockpit axis:
    // a port that ignored the yoke and always shot straight ahead stays red here.
    const steered: GameState = { ...rest, ...aimAt(pos) }
    expect(steered.aimX, 'fixture guard: the yoke actually moved').not.toBe(0)
    expect(sights(makeTie({ pos }), steered), 'crosshair on it: in the sights').toBe(Status.C_PS)
  })

  it('is PLAYER-relative — the TIE\'s own facing cannot change it (unlike C_AS)', () => {
    const s = makeSpaceState()
    const pos = onRay(s, 6000)
    const facing = makeTie({ pos, orient: lookAtOrigin(pos) })
    const turned = makeTie({ pos, orient: lookAway(pos) })
    expect(sights(facing, s)).toBe(Status.C_PS)
    expect(sights(turned, s), 'a fighter looking away is still under the player\'s crosshair').toBe(
      Status.C_PS,
    )
    // Proof the fixture pair is discriminating at all: it DOES flip the alien-side bit.
    expect(computeStatus(facing, s, rngSeed(1)) & Status.C_AS).toBe(Status.C_AS)
    expect(computeStatus(turned, s, rngSeed(1)) & Status.C_AS).toBe(0)
  })

  it('measures from the COCKPIT, and never drifts off it with the frame counter', () => {
    // INVERTED by sw8-8, which landed days after uf1-12. This test used to assert the
    // opposite — that the sights ray starts at a frame-driven `spaceEye` (at frame 128 the
    // ST.UX sawtooth put it at x = 1024) — and it staged a TIE 1,024 off the origin so an
    // origin-anchored port would read the fixture backwards. The premise was wrong: `ST.UX`
    // is the starfield's register, not a camera (`WSSTAR.MAC:98` is its only CONSUMER; the WSMAIN
    // reads are the writers' own increments — see the tombstone in gameRules.ts), so the pilot
    // never slides and neither does his crosshair.
    //
    // This bit matters more than C_PV did: C_PS gates a LOITER BREAK (TCH1DZ, four gates), so
    // an eye offset would have fighters peeling off at a crosshair the player is not looking
    // down. The frame counter is the discriminator — a port that re-derives a moving eye reads
    // the off-origin TIE as IN the sights at frame 128 and OUT at frame 0. The cockpit-anchored
    // law says OUT at both.
    const OFF_ORIGIN = 1024 // what the retired ST.UX sawtooth put the eye at, at frame 128
    const pos: Vec3 = [6000, OFF_ORIGIN, 0] // native [depth, right, up]
    expect(
      Math.abs(pos[1]), // native: index 1 = lateral (right)
      'fixture guard: this sits outside the band measured from the cockpit',
      // Stated against the ROM OCTAGON (3·TMPSIZ = 750) rather than the retired disc
      // (2·TMPSIZ = 500) since sw8-27 reshaped the band. 1,024 clears both, but a guard
      // that kept the smaller number would have stopped meaning "outside the band".
    ).toBeGreaterThan(3 * TIE_HIT_RADIUS)
    for (const frame of [0, 128]) {
      const s: GameState = { ...makeSpaceState(), frame }
      expect(
        sights(makeTie({ pos }), s),
        `frame ${frame}: outside the cockpit's sights band, so C_PS clear`,
      ).toBe(0)
    }
    // ...and the mirror: a TIE ON the cockpit's ray is in the sights at both frames, so the
    // inversion is a real constraint and not just "C_PS never sets".
    const onAxis = onRay(makeSpaceState(), 6000)
    for (const frame of [0, 128]) {
      const s: GameState = { ...makeSpaceState(), frame }
      expect(
        sights(makeTie({ pos: onAxis }), s),
        `frame ${frame}: on the cockpit's ray, so C_PS set`,
      ).toBe(Status.C_PS)
    }
  })

  it('measures against the SAME ray at every aspect — the authentic lens is aspect-independent (AC-6)', () => {
    // INVERTED by sw10-1. Before this story `aimDirection` divided by a horizontal-only
    // `f = 1/tan(FOV_Y/2)` under a 60°-vertical FOV, so a square canvas and a 16:9 one
    // disagreed about where the yoke pointed — this test used to MEASURE that divergence
    // (539 u apart at yoke 0.2, 2694 u at full deflection, against a 750 u band). The
    // authentic ROM lens (WSMAIN.MAC:3824-3846) is a symmetric 90° pyramid, ±45° on BOTH
    // axes, with no aspect term anywhere in it: `f = 1/tan(45°) = 1`, so `aimDirection`
    // returns the IDENTICAL ray no matter what `aspect` the caller passes. The cabinet's
    // glass is square in angle even though its tube is not, so there is no longer an
    // "aspect-blind ray" to distinguish from the gun's — they are the same ray, always.
    const aimX = 0.4
    const eye = COCKPIT

    // The claim itself: swapping the aspect argument cannot move the ray at all.
    const wideRay = aimDirection(aimX, 0, 16 / 9)
    const squareRay = aimDirection(aimX, 0, 1)
    expect(wideRay, 'the authentic lens takes no aspect term — the two rays are the same').toEqual(
      squareRay,
    )

    // And the sights bit, which reads this ray through `computeStatus`, agrees at both
    // canvas shapes for the identical world seat — the aspect-invariance that replaces the
    // old aspect-DEPENDENCE this test used to pin.
    const onRay6000 = add(eye, scale(wideRay, 6000))
    const wide: GameState = { ...makeSpaceState(), aimX, aimY: 0, aspect: 16 / 9 }
    const square: GameState = { ...makeSpaceState(), aimX, aimY: 0, aspect: 1 }
    expect(
      sights(makeTie({ pos: onRay6000 }), wide),
      'a TIE under the crosshair is in the sights at 16:9',
    ).toBe(Status.C_PS)
    expect(
      sights(makeTie({ pos: onRay6000 }), square),
      'and identically in the sights on a square canvas — same yoke, same ray, same seat',
    ).toBe(Status.C_PS)
  })

  it('keeps the gun and the sights agreeing under a real viewport aspect (AC-6)', () => {
    // The containment invariant again, but on a 16:9 canvas with the yoke off centre —
    // the case an aspect-blind derivation gets wrong. Whatever the laser can kill must
    // still read as in the sights.
    const aimX = 0.4
    const s: GameState = { ...makeSpaceState(), aimX, aimY: 0, aspect: 16 / 9 }
    const eye = COCKPIT
    const dir = aimDirection(aimX, 0, s.aspect)
    let killable = 0
    for (const depth of [1200, 6000, 20000]) {
      for (let offset = 0; offset <= 4 * TIE_HIT_RADIUS; offset += 25) {
        const p = add(eye, scale(dir, depth))
        const pos: Vec3 = [p[0], p[1] + offset, p[2]] // native: index 1 = right (broadside)
        if (beamHit(eye, dir, pos, TIE_HIT_RADIUS) === null) continue
        killable++
        expect(
          sights(makeTie({ pos }), s),
          `killable at depth ${depth}, offset ${offset} must be in the sights`,
        ).toBe(Status.C_PS)
      }
    }
    expect(killable, 'guard: the sweep actually contained killable positions').toBeGreaterThan(0)
  })

  it('defaults to a square viewport when the shell has not supplied one', () => {
    // `Input.aspect` is optional and the core defaults it to 1 (input.ts). The state's
    // copy must default the same way, or every headless fixture silently changes meaning.
    expect(makeSpaceState().aspect, 'a fresh state is square until the shell says otherwise').toBe(1)
  })

  it('costs no extra RNG — the two random bits are identical in and out of the sights', () => {
    // C$PS is a geometry test; the ROM draws no random byte for it. A conditional
    // draw would desynchronise the seeded core the moment a TIE crossed the band.
    const s = makeSpaceState()
    const inside = computeStatus(makeTie({ pos: onRay(s, 6000) }), s, rngSeed(7))
    const outside = computeStatus(makeTie({ pos: onRay(s, 6000, 40 * TIE_HIT_RADIUS) }), s, rngSeed(7))
    expect(inside & Status.C_PS).toBe(Status.C_PS) // guard: the fixtures really do straddle the band
    expect(outside & Status.C_PS).toBe(0)
    expect(inside & (Status.C_R1 | Status.C_R2)).toBe(outside & (Status.C_R1 | Status.C_R2))
  })
})
