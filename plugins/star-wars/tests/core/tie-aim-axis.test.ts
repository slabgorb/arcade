// tests/core/tie-aim-axis.test.ts
//
// uf1-15 — C_AS ("ALIEN HAS PLAYER IN SITES", WSCPU.MAC:29) stops being a guess.
//
// The story arrived with a premise, and the primary source refutes it. The premise was
// that WSCPU.MAC:615-618 is a SCREEN-space radius which "IS an angular cone and therefore
// DOES convert to a cosine once the math box's screen-units-per-radian scale is pinned".
// It is not, and it does not. The scale IS pinnable — that half of the story stands, and
// this suite pins it — but what it pins is not an angle.
//
// THE PATH, read end to end (nothing here is inferred):
//
//   WSCPU.MAC:604-618 — the alien looks at the player and tests the result
//       LDA #M$PSB2 / JSR MGOWT      ;VIEW PLAYERS SHIP
//       LDD M.XP / BMI 140$          ;?PLAYER IN FRONT? — skip if behind
//       SUBD #4000 / BGE 140$        ;IGNORE GUN IF TOO FAR AWAY
//       ... CHSET C$AV ...
//       LDD M.YPS / ADDD M.ZPS
//       CMPD #20 / BHI 140$          ;?AIMING NEAR SHIP?
//       ... CHSET C$AS
//
//   WSGLOB.MAC:177 — M$PSB2 ==19C/4, i.e. math box PC $67.
//
//   SWMP.DOC:140-158 — Jed Margolin's own documentation of PC $67 ("PRE2"):
//       XT = (XIND-XT1)/2   YT = (YIND-YT1)/2   ZT = (ZIND-ZT1)/2
//       [XP,YP,ZP] = [AX1 BX1 CX1; AY1 BY1 CY1; AZ1 BZ1 CZ1] * [XT,YT,ZT]
//       XPS = XP*XP    YPS = YP*YP    ZPS = ZP*ZP
//
// Two facts fall out of that block, and they are the whole story:
//
//   1. THERE IS NO PERSPECTIVE DIVIDE. PRE2 rotates into the viewer's frame and squares;
//      it never divides by depth. The perspective multiply is a DIFFERENT math box program
//      — "PERS", PC $86, SWMP.DOC:180-186: "YP = YP * XP (SCREEN X), ZP = ZP * XP (SCREEN
//      Y)" where "XP is inverse X" — and the C$AS path does not run it. Our own
//      docs/mathbox.md:171-176 says the same thing from the disassembly side: $67 is the
//      view transform "plus Reg38=X²,Reg39=Y²,Reg3A=Z²", while the perspective divide "that
//      yields screen coordinates the AVG can draw" is $AE/$B0. So M.YPS/M.ZPS are squares of
//      VIEW-space offsets, not screen coordinates, and the in-source comment this story
//      replaces ("a SCREEN-SPACE test in per-shape math-box units") is wrong on both counts.
//
//   2. THE TEST CARRIES NO DEPTH TERM. `M.YPS + M.ZPS <= $20` compares lateral² + vertical²
//      to a CONSTANT. Contrast the sibling ratio tests, which do divide by depth by
//      subtracting it: `LDD M.YPS / SUBD M.XPS` (WSMAIN.MAC:3834-3835 for C$PV,
//      WSSTAR.MAC:135-139 for the starfield). Those are ±45° CONES. C$AS is not one of them.
//
// So C$AS is a CYLINDER: the player is "in the alien's sights" when he lies within a fixed
// perpendicular distance of the alien's nose AXIS, at any depth in range. There is no
// half-angle to convert to, at any scale — a cone is the wrong shape, not the wrong number.
//
// THE SCALE, and why we can trust it:
//
//   multiplier   SWMP.DOC:17  "In the Multiplier, 4000H * 4000H = 4000H"  ⇒  a*b/$4000
//   PRE2 halving SWMP.DOC:143 "XT = (XIND-XT1)/2"                          ⇒  XP,YP,ZP are
//                (the constant is HALF=$E000, "actually -1/2", SWMP.DOC:307)   HALF of true
//
//   ⇒ world radius for a squared threshold S:   2 * sqrt(S * $4000)
//
// That chain is CROSS-VALIDATED, not asserted. WSMAIN.MAC:3772-3795 runs the identical
// PRE2 output through the identical squaring for two other thresholds, and the chain lands
// both of them on exact round hex — which two independent wrong scalings could not do:
//
//   C$PM "PLAYER MIDDLE DISTANCE"  $900 → 12288 = $3000   (WSMAIN.MAC:3777-3781)
//   C$PN "PLAYER NEAR"             $100 →  4096 = $1000   (WSMAIN.MAC:3784-3788)
//   C$AS "PLAYER IN ALIENS SITES"   $20 →  1448.15… = 1024·√2
//
// C$AS is irrational because $20 is not a perfect square while $900 = 48² and $100 = 16²
// are — the author picked round SQUARES, so two of the three radii come out round and one
// does not. That is a consistency check, not a coincidence.
//
// Radix: hex. WSCOMN.MAC:5 is `.RADIX 16`, and WSCPU.MAC decimals carry the explicit
// MACRO-11 point (`A$AIM ==10.`, :11). So `#20` is 32, `#4000` is 16384.
//
// Units port 1:1 — raw ROM units ARE our world units (CLAUDE.md; TIE_NEAR_BOUND set the
// precedent). No further scaling.
//
// PURE core test: no DOM, no wall clock, randomness only via the seeded Rng.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  computeStatus,
  psb2SquaredToWorld,
  AIM_AXIS_RADIUS,
  AIM_DEPTH_MAX,
} from '../../src/core/tie-status'
import { Status } from '../../src/core/tie-vm'
import { IDENTITY, type Mat4 } from '@shared/math3d'
import { makeSpaceState, makeTie, lookAway, rngSeed } from './helpers/space'

/** Does this TIE have the player in its sights? */
function hasSights(pos: [number, number, number], orient: Mat4 = IDENTITY): boolean {
  const e = makeTie({ pos, orient })
  return (computeStatus(e, makeSpaceState(), rngSeed(1)) & Status.C_AS) !== 0
}

/**
 * A TIE placed so the cockpit sits exactly `depth` along its nose axis and `perp` off it.
 *
 * With `orient` left at IDENTITY the nose (`orient` column 3, the codebase's forward) is
 * +Z, so a fighter at [-perp, 0, -depth] is AHEAD of the pilot (in front is -Z) and facing
 * back at him. The vector cockpit-minus-TIE is then [perp, 0, depth]: its component along
 * the nose is `depth` and its perpendicular component is `perp`, by construction. Both are
 * exact — no trig, nothing for a fixture bug to round away.
 */
function tieAt(depth: number, perp: number): [number, number, number] {
  return [-perp, 0, -depth]
}

describe('uf1-15 — the M$PSB2 unit chain, pinned from primary source', () => {
  it('lands the ROM\'s two OTHER thresholds on the same quantity on exact round hex', () => {
    // The proof of the scale. Same PRE2 output, same squaring, same multiplier — only the
    // literal differs (WSMAIN.MAC:3777-3788). A chain missing the /$4000 or the ×2 misses
    // BOTH of these; getting both exactly right by accident is not available.
    expect(psb2SquaredToWorld(0x900)).toBe(0x3000) // C$PM — player middle distance
    expect(psb2SquaredToWorld(0x100)).toBe(0x1000) // C$PN — player near
  })

  it('converts C$AS\'s own literal $20 to 1024·√2 world units', () => {
    // WSCPU.MAC:617 `CMPD #20`. Pinned to the number, not to a range: a range would let a
    // retune drift inside it forever.
    expect(psb2SquaredToWorld(0x20)).toBe(1024 * Math.SQRT2)
    expect(AIM_AXIS_RADIUS).toBe(psb2SquaredToWorld(0x20))
    expect(AIM_AXIS_RADIUS).toBeCloseTo(1448.1546878700494, 10)
  })

  it('doubles the LINEAR depth bound too — PRE2 halves every axis, not just the squared ones', () => {
    // WSCPU.MAC:612 `SUBD #4000 / BGE 140$` compares M.XP, which PRE2 halved on the way in,
    // so the true-world bound is twice the literal. $8000 = 32768 sits just past the $7C00
    // = 31744 spawn depth, which is why this gate is a play-cube-corner case rather than a
    // routine one — and exactly why it must not be invented smaller.
    expect(AIM_DEPTH_MAX).toBe(0x8000)
  })
})

describe('uf1-15 — C_AS is a CYLINDER about the nose axis, not a cone', () => {
  // These two are the load-bearing pair, and they fail TODAY IN OPPOSITE DIRECTIONS.
  //
  //   far case   depth 20000, perp 3000 → 8.53° off the nose — INSIDE any 12° cone
  //   near case  depth  3000, perp 1000 → 18.43° off the nose — OUTSIDE any 12° cone
  //
  // The ROM sets the bit for the near case and clears it for the far one — the reverse of
  // what an angle gives, because 3000 > 1024·√2 ≥ 1000. No cosine threshold whatsoever can
  // satisfy both: a cone that clears 8.53° necessarily clears 18.43°. So this pair cannot be
  // made green by retuning FIRE_CONE_COS to any value; only changing the SHAPE passes it.
  // That is the mutation proof, and it is structural rather than a deleted line.

  it('CLEARS the bit far out, where a 12° cone would have set it', () => {
    expect(hasSights(tieAt(20000, 3000))).toBe(false)
  })

  it('SETS the bit up close, where a 12° cone would have cleared it', () => {
    expect(hasSights(tieAt(3000, 1000))).toBe(true)
  })

  it('is depth-independent: one perpendicular offset, same verdict at 3k and 30k', () => {
    // The cylinder in one assertion. Today the near one is false and the far one true —
    // the exact inversion a fixed screen radius produces and a fixed angle cannot.
    expect(hasSights(tieAt(3000, 1400))).toBe(true)
    expect(hasSights(tieAt(30000, 1400))).toBe(true)
  })

  it('takes the radius inclusively, as BHI does', () => {
    // `CMPD #20 / BHI 140$` skips on STRICTLY greater, so the boundary itself is in sights.
    expect(hasSights(tieAt(10000, AIM_AXIS_RADIUS))).toBe(true)
    expect(hasSights(tieAt(10000, AIM_AXIS_RADIUS + 1))).toBe(false)
  })
})

describe('uf1-15 — the gates C_AS is nested inside (WSCPU.MAC:611-614)', () => {
  it('clears the bit for a fighter aimed AWAY, whose axis still runs through the cockpit', () => {
    // The trap a naive cylinder port falls into, and the reason this test exists. An
    // INFINITE nose axis passes within 0 units of the pilot when the fighter points
    // directly away from him — perpendicular distance alone says "in sights". The ROM's
    // `LDD M.XP / BMI 140$` ("?PLAYER IN FRONT?") is what forbids it, so the port needs the
    // half-line, not the line. Green today under the cone law; it must STAY green.
    expect(hasSights([0, 0, -5000], lookAway([0, 0, -5000]))).toBe(false)
  })

  it('clears the bit past AIM_DEPTH_MAX even with the nose dead on', () => {
    // Perfect aim, out of range: `SUBD #4000 / BGE 140$`. Reachable inside the ±$7CFF play
    // cube only on a diagonal — [-25000,0,-25000] is 35355 units out, both axes legal — so
    // this fixture is a state the game can actually be in, not a synthetic one.
    expect(hasSights(tieAt(35355.339059327378, 0))).toBe(false)
  })

  it('sets it at the same aim just INSIDE the range bound', () => {
    // The paired control: without it, the test above could pass for any unrelated reason.
    expect(hasSights(tieAt(28284.271247461902, 0))).toBe(true)
  })
})

describe('uf1-15 — the guess is retired from the source, not just from the arithmetic', () => {
  // Resolved against THIS file, not the cwd: vitest roots the star-wars project at the
  // plugin directory but the process cwd is the monorepo root, and a bare relative path
  // throws at COLLECTION — taking the whole file with it, so every behavioural test above
  // would report as "no tests" rather than as a failure. Read lazily, inside each test.
  const src = () => readFileSync(new URL('../../src/core/tie-status.ts', import.meta.url), 'utf8')

  it('no longer declares FIRE_CONE_COS', () => {
    const SRC = src()
    // Anchored to the DECLARATION, not the token: the name may survive in the tombstone
    // prose explaining what replaced it, and should.
    expect(SRC).not.toMatch(/export\s+const\s+FIRE_CONE_COS\b/)
  })

  it('answers the TODO where AIM_AXIS_RADIUS is declared instead of restating it', () => {
    // Scoped to C_AS's own doc block — PLAYER_NEAR_RANGE a few lines below carries its own
    // separate TODO(playtest) that this story does not touch, so a whole-file scan would
    // fail for the wrong reason and then get "fixed" by widening someone else's scope.
    const SRC = src()
    const decl = SRC.indexOf('export const AIM_AXIS_RADIUS')
    expect(decl).toBeGreaterThan(-1)
    const block = SRC.slice(0, decl).split('/**').pop() ?? ''

    expect(block).not.toMatch(/TODO\(playtest\)/)
    expect(block).toMatch(/PRE2|SWMP\.DOC|\$67/) // cites where the scale came from
    expect(block).toMatch(/WSCPU\.MAC:6(1[5-8]|0[4-9])/) // and the gate it ports
  })
})
