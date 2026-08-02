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
// fighters — a killed TIE moves to `dyingTies`. And the "must be drawn" gate the CHSET
// inherits from sitting in the draw pass comes free from `beamHit`, which refuses any
// target behind the gun.
//
// RED until computeStatus derives C_PS.
//
// The sacred boundary holds: no DOM, no time except dt, no randomness except the
// seeded RNG carried in state.

import { describe, it, expect } from 'vitest'
import { computeStatus } from '../../src/core/tie-status'
import { Status } from '../../src/core/tie-vm'
import { aimDirection, beamHit, COCKPIT, FOV_Y } from '../../src/core/gameRules'
import { TIE_HIT_RADIUS, type GameState } from '../../src/core/state'
import { add, scale, type Vec3 } from '@shared/math3d'
import { makeSpaceState, makeTie, lookAtOrigin, lookAway, rngSeed } from './helpers/space'

/** The ROM's doubling: `ADDD TMPSIZ / ADDD TMPSIZ` (3×) over `LSRD / ADDD TMPSIZ`
 *  (1.5×), WSMAIN.MAC:3920-3922 vs :3904-3906. Written as the literal the ROM
 *  arithmetic yields, never re-derived from the value under test. */
const SIGHTS_FACTOR = 2

/** A point exactly `depth` along the aim ray the given state is holding, pushed
 *  `offset` units broadside (world +X, which is perpendicular to the at-rest ray).
 *  Built from the SAME shared helpers the core aims with, so the fixture cannot
 *  drift from the machine under test. */
function onRay(s: GameState, depth: number, offset = 0): Vec3 {
  const eye = COCKPIT
  const dir = aimDirection(s.aimX, s.aimY)
  const p = add(eye, scale(dir, depth))
  return [p[0] + offset, p[1], p[2]]
}

/** The yoke position that puts the crosshair on a world point, inverting
 *  `aimDirection` (gameRules.ts:49-51) at the unit aspect the tests run at. */
function aimAt(pos: Vec3): { aimX: number; aimY: number } {
  const eye = COCKPIT
  const f = 1 / Math.tan(FOV_Y / 2)
  const [dx, dy, dz] = [pos[0] - eye[0], pos[1] - eye[1], pos[2] - eye[2]]
  return { aimX: (f * dx) / -dz, aimY: (f * dy) / -dz }
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

  it('opens the band at EXACTLY twice the kill radius — 3·TMPSIZ over 1.5·TMPSIZ', () => {
    const s = makeSpaceState()
    const band = SIGHTS_FACTOR * TIE_HIT_RADIUS
    // Absolute anchor, so the boundary probes below cannot go vacuous if the
    // established hit radius is ever retuned without revisiting this law.
    expect(TIE_HIT_RADIUS, 'fixture anchor: the established TIE kill radius').toBe(250)
    expect(
      sights(makeTie({ pos: onRay(s, 6000, band - 1) }), s),
      'one unit inside 2× the kill radius is still in the sights',
    ).toBe(Status.C_PS)
    expect(
      sights(makeTie({ pos: onRay(s, 6000, band + 1) }), s),
      'one unit outside 2× the kill radius is not',
    ).toBe(0)
    // And the band is genuinely WIDER than the kill band — a port that reused the
    // kill radius unchanged (factor 1 instead of 2) reddens here.
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

  it('never sights a TIE behind the eye — the CHSET lives in the DRAW pass', () => {
    const s = makeSpaceState()
    const eye = COCKPIT
    // Mirror of the on-ray fixture, straight out the back of the cockpit.
    expect(sights(makeTie({ pos: [eye[0], eye[1], eye[2] + 6000] }), s)).toBe(0)
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
    const pos: Vec3 = [OFF_ORIGIN, 0, -6000]
    expect(
      Math.abs(pos[0]),
      'fixture guard: this sits outside the band measured from the cockpit',
    ).toBeGreaterThan(SIGHTS_FACTOR * TIE_HIT_RADIUS)
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

  it('measures against the SAME ray the gun uses — viewport aspect included (AC-6)', () => {
    // The shell supplies a real aspect every frame (src/shell/input.ts:45), and the gun
    // inverts the projection WITH it (sim.ts:313, `aimDirection(aimX, aimY, input.aspect)`)
    // so the bolt goes where the crosshair is drawn. A sights bit computed at the default
    // unit aspect is therefore testing a DIFFERENT RAY, and not by a little: at 16:9 and
    // depth 6000 the two rays are 539 u apart at yoke 0.2 and 2694 u apart at full
    // deflection, against a band only 500 u wide. From about a fifth of yoke travel the
    // two bands stop overlapping at all.
    const aimX = 0.4
    const s: GameState = { ...makeSpaceState(), aimX, aimY: 0, aspect: 16 / 9 }
    const eye = COCKPIT
    const onGunRay = add(eye, scale(aimDirection(aimX, 0, s.aspect), 6000))
    const onBlindRay = add(eye, scale(aimDirection(aimX, 0), 6000))

    // Fixture guard, measured with the same machine the assertions use: the blind-ray
    // point must sit genuinely OUTSIDE the sights band taken from the gun's ray, or the
    // negative assertion below could pass on a correct implementation by luck.
    const gunDir = aimDirection(aimX, 0, s.aspect)
    expect(
      beamHit(eye, gunDir, onBlindRay, SIGHTS_FACTOR * TIE_HIT_RADIUS),
      'the aspect-blind ray leaves the band entirely at this yoke',
    ).toBeNull()

    expect(
      sights(makeTie({ pos: onGunRay }), s),
      'a TIE under the crosshair the pilot is actually looking through is in the sights',
    ).toBe(Status.C_PS)
    expect(
      sights(makeTie({ pos: onBlindRay }), s),
      'a TIE on the aspect-blind ray is NOT where the pilot is aiming',
    ).toBe(0)
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
        const pos: Vec3 = [p[0] + offset, p[1], p[2]]
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
