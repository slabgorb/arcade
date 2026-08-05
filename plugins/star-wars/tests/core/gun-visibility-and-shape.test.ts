// tests/core/gun-visibility-and-shape.test.ts
//
// sw8-27 — the player's GUN carries the visibility divergence C_PS lost in sw8-19, and the
// space arm's hit SHAPE is a disc where the cabinet uses a box intersected with an octagon.
//
// == THE GATE IS CONTROL FLOW, IN TWO DRAW PASSES, NOT ONE =====================
//
// sw8-19 established the alien half. `S2VW` (WSMAIN.MAC:3755) has EXACTLY FOUR exits before
// `CHSET C$PV` (:3846), all long branches to `RTS1` at :3754 — :3825-3826 near clamp,
// :3827-3828 far clamp, :3834-3836 and :3840-3842 the two ratio tests. The LASER-HIT block
// (WSMAIN.MAC:3898-3918), which writes `CL.ADS`/`CL.AP`, sits below all four. Between :3846
// and :3898 there is no label at all, and the three intervening `JSR`s return to the caller's
// next line, so nothing can branch in. The cabinet cannot resolve a hit on an alien it did
// not draw.
//
// THE HALF sw8-19 DID NOT HAVE, and which this story adds: the FIREBALLS are gated the same
// way, in a different module. `VWGUN::` (WSGUNS.MAC:852) has its own four exits before its
// `;GUN SHOT IS VISIBLE` marker at :904, and each exit is a compare-and-branch PAIR, so each
// spans TWO lines:
//
//     LDD M.XP / CMPD #01   / LBLE 90$     :883-885   near clamp
//              CMPD #7F00   / LBHI 90$     :886-887   far clamp
//              SUBD M.XP    / LBHS 90$     :895-896   ratio test  (Y)
//              SUBD M.XP    / LBHS 90$     :902-903   ratio test  (Z)
//
// The hit-record that writes `CL.GDS`/`CL.GP` is :906-948, below all four. Identical
// structure to `S2VW`, different literals. So BOTH space-arm resolutions are gated in the
// cabinet and neither is gated here.
//
// (SPANS CORRECTED at sw8-27's rework. Each exit was cited as the single line of its BRANCH
// — :885, :887, :896, :903 — while the text quoted beside it was the whole compare-and-branch
// pair, whose compare sits one line above. The `S2VW` four in the paragraph above were already
// written as two-line ranges, and it was the inconsistency inside one parallel construction
// that gave it away: only one half of the pair had been read as ranges.)
//
// == THE SHAPE, AND WHY IT MUST NOT GO IN THE SHARED HELPER ====================
//
// MEASURED at setup by grepping every ROM module for `TMPOCT`: the octagon test exists in
// exactly TWO files — WSMAIN.MAC (aliens) and WSGUNS.MAC (fireballs). Those are the same two
// passes the gate covers. The GROUND objects use a completely different test — an UNROTATED
// width/height box, measured against the object's own collision width and height, with NO
// octagon term at all (WSGRND.MAC:1076-1132, writing `CL.BDS`/`CL.TDS`) — and the trench is
// another matter again.
//
// (CORRECTED at sw8-27's rework: this sentence used to offer the `+10.` site fudge as part of
// what makes the ground pass different, and it is the one term all three passes share.
// WSGRND.MAC:1078 `ADDD #10. ;SITE RADIUS FOR FUDGE` has exact counterparts in both space
// passes — WSMAIN.MAC:3881 `ADDD #10. ;ADDIN CURSOR SIZE` and WSGUNS.MAC:918 `ADDD #10.
// ;SIZE OF CURSOR` — so it is the cursor's own size being added to every object's projected
// size, everywhere. The real differentiators are the unrotated width/height box and the
// absent octagon, which is what the sentence now says.)
//
// So porting the box/octagon into `beamHit` would impose the space alien's shape on towers,
// bunkers, the exhaust port and trench obstacles, which the cabinet does not do. The shape
// belongs at the same two space-arm call sites as the gate. That is why the surface and trench
// probes in group C below are not merely regression cover: they are the discriminator that
// kills the helper-side fix, which is mutant G6/M6 in sw8-19's batteries.
//
//   space alien  (WSMAIN.MAC:3898-3908)  |dx| <= T  AND  |dy| <= T  AND  |dx|+|dy| <= 1.5·T
//   fireball     (WSGUNS.MAC:926-941)    the same three terms
//   sights       (WSMAIN.MAC:3920-3924)  |dx|+|dy| <= 3·T          — no box term at all
//
// NOTE the box threshold is 1.0·T and only the OCTAGON is 1.5·T. The filing compressed the two
// into "box AND octagon at 1.5x"; a port written to that reading is wrong in the one direction
// the current deviation never errs in (see below).
//
// == WHY THE SUITE IS MOSTLY GREEN-ON-ARRIVAL, AND WHY THAT IS THE POINT =======
//
// MEASURED at setup over 2000 sampled directions: today's disc is a STRICT SUBSET of the
// cabinet's region in both tests — 0/2000 directions where the clone reaches further than the
// ROM. Kill: identical on the axes, cabinet reaching sqrt(5)/2 = 1.1180·R at atan(1/2) = 26.57°
// off-axis (the octagon corner). Sights: cabinet 3.0·R on axis against our 2.0·R, never below
// 2.121·R.
//
// Two consequences drive the design of this file:
//
//   1. The shape change is PURELY ADDITIVE. Nothing killable today stops being killable, which
//      is why applying it reddened ZERO of 2252 tests at setup. Group D therefore leads with
//      the seats that are red TODAY (inside the ROM region, outside the disc) and follows with
//      guards that are green today and exist to kill a specific wrong fix by name. Each of the
//      latter says which mutant it catches, because a green assertion that names no mutant is
//      indistinguishable from scenery.
//   2. The GATE is not additive — it takes kills away — so group A and B are red today and
//      carry positive controls, without which "stop killing anything" would pass every one.
//
// == WHAT THIS FILE DELIBERATELY DOES NOT DO ==================================
//
// It does not call `beamHit` and assert a gate. It CANNOT: the gate is caller-side by AC3, so
// a `beamHit` unit test is structurally blind to it. Every gun assertion here therefore drives
// `stepGame` and reads the kill events. `tie-sights-visibility.test.ts`'s "does NOT change the
// GUN" is the complementary half and stays GREEN — it pins that the gate is not in the helper,
// which is exactly what AC3 still requires.
//
// The sacred boundary holds: no DOM, no time except dt, no randomness except the seeded RNG.

import { describe, it, expect } from 'vitest'
import { stepGame, enterPhase } from '../../src/core/sim'
import { computeStatus, SIGHTS_BAND_FACTOR } from '../../src/core/tie-status'
import { Status } from '../../src/core/tie-vm'
import { COCKPIT, FOV_Y, aimDirection, beamHit, siteOffset } from '../../src/core/gameRules'
import {
  initialState,
  SKIM_ALTITUDE,
  TIE_HIT_RADIUS,
  ENEMY_SHOT_HIT_RADIUS,
  TURRET_HIT_RADIUS,
  COCKPIT_HIT_RADIUS,
  ENEMY_SHOT_TTL,
  type GameState,
} from '../../src/core/state'
import { OBSTACLE_HIT_RADIUS } from '../../src/core/trench-obstacles'
import type { Input } from '../../src/core/input'
import type { Vec3 } from '@shared/math3d'
import { makeSpaceState, makeTie, rngSeed } from './helpers/space'

const DT = 1 / 60
const WIDE = 16 / 9

/** The rendered frustum's vertical slope, recomputed from the shared constant rather than
 *  copied — a change to FOV_Y moves the fixtures and the machine together. */
const TAN_HALF = Math.tan(FOV_Y / 2)

/** The ROM's kill terms, in units of the target's hit radius (WSMAIN.MAC:3898-3908 /
 *  WSGUNS.MAC:926-941). Named so the seats below read as what they are. */
const BOX = 1.0
const OCTAGON = 1.5
/** The sights term, the same octagon scaled up and with the box dropped (:3920-3924). */
const SIGHTS_OCTAGON = 3.0

/** C_PV for a position, through the real machine — a pure function of position and aspect,
 *  independent of where the yoke points, which is what lets a seat be off-glass and under the
 *  crosshair at the same time. */
const inView = (pos: Vec3, aspect: number): number => {
  const s: GameState = { ...makeSpaceState(), aspect }
  return computeStatus(makeTie({ pos }), s, rngSeed(1)) & Status.C_PV
}

/** C_PS for a position, likewise. */
const sights = (pos: Vec3, aspect: number): number => {
  const s: GameState = { ...makeSpaceState(), aspect }
  return computeStatus(makeTie({ pos }), s, rngSeed(1)) & Status.C_PS
}

/**
 * A space run holding exactly what the fixture places, with the spawner and enemy fire parked
 * so nothing but the player's own trigger can change the lists.
 *
 * `firePrev: false` and `fireCooldown: 0` are load-bearing — the trigger is EDGE-triggered
 * (`fireEdge = input.fire && !state.firePrev`, sim.ts:300) and gated on the cooldown, so
 * without both the beam never arms and every negative below passes for the wrong reason.
 */
const spaceRun = (over: Partial<GameState> = {}): GameState => ({
  ...initialState(1983),
  enemies: [],
  enemyShots: [],
  spawnTimer: 1e9,
  enemyFireCooldown: 1e9,
  firePrev: false,
  fireCooldown: 0,
  ...over,
})

/** Trigger down with the yoke AT REST, so the beam is exactly `[0, 0, -1]` from the cockpit
 *  and a seat's perpendicular offset from the ray is just its own (x, y). Every geometric claim
 *  in groups A–E rests on that.
 *
 *  It used to say "which is why no test here deflects the yoke", and that stopped being true
 *  the moment a property needed a deflection to be observable: the depth-plane guard in group D
 *  (`aimY = 0.6`, added at GREEN) and two seats in group F. Those build their own `Input` and
 *  measure their own geometry off `aimDirection`, and they must — `assertGunSeat` below
 *  measures from the at-rest ray and would reject every one of them. */
const restTrigger = (aspect: number): Input => ({ aimX: 0, aimY: 0, fire: true, aspect })

const tieDied = (s: GameState): boolean => s.events.some((e) => e.type === 'enemy-death' && e.enemyType === 'tie')
const fireballDied = (s: GameState): boolean => s.events.some((e) => e.type === 'fireball-destroyed')

/** A TIE at `pos` — a plain mook, so a hit destroys it (Darth is immortal and would not). */
const tieAt = (pos: Vec3) => makeTie({ pos: [...pos] as Vec3, kind: 'tie' as const })

/**
 * Fixture guard for every gun seat below. Asserts through the SAME machinery the assertions
 * use that the seat is the case we mean: under the at-rest crosshair (so the beam resolves it
 * today) and, when `offGlass`, outside the rendered pyramid.
 *
 * Without this a "did not die" assertion passes the moment a seat drifts out of the kill
 * radius, and the suite scores itself as protecting something it does not.
 */
function assertGunSeat(pos: Vec3, radius: number, aspect: number, offGlass: boolean, label: string): void {
  const ray = aimDirection(0, 0, aspect)
  expect(
    beamHit(COCKPIT, ray, pos, radius),
    `${label}: fixture guard — the seat is under the at-rest crosshair, so the beam resolves it TODAY`,
  ).not.toBeNull()
  expect(
    inView(pos, aspect),
    `${label}: fixture guard — the seat is ${offGlass ? 'OUTSIDE' : 'INSIDE'} the rendered view pyramid`,
  ).toBe(offGlass ? 0 : Status.C_PV)
}

// ---------------------------------------------------------------------------
// A — AC1: the TIE resolution is gated on C_PV
// ---------------------------------------------------------------------------

describe('sw8-27 AC1 — the player cannot kill a TIE the cabinet would not have drawn', () => {
  it('the filed seat: off the glass at depth 400, inside the kill radius, survives the shot', () => {
    // The story's headline seat, and TEA's original sw8-19 measurement. At depth 400 the
    // pyramid's vertical bound is 400 · tan30° = 230.9, so vert 240 is off-screen — while
    // sitting 240 u from the at-rest ray, inside TIE_HIT_RADIUS (250). Killable while
    // invisible: the cabinet returns at :3836 and never reaches its hit block.
    const seat: Vec3 = [0, 240, -400]
    assertGunSeat(seat, TIE_HIT_RADIUS, WIDE, true, 'filed off-glass seat')

    const s = stepGame(spaceRun({ enemies: [tieAt(seat)] }), restTrigger(WIDE), DT)

    expect(tieDied(s), 'the cabinet cannot resolve a hit on an alien it did not draw').toBe(false)
    expect(s.enemies, 'and the fighter is still standing').toHaveLength(1)
  })

  it('the POSITIVE CONTROL: the same depth, on the glass, still dies', () => {
    // Without this every negative in this file passes for a gate that simply stopped the gun.
    // Vert 200 is inside the 230.9 bound at the same depth and the same distance regime.
    const seat: Vec3 = [0, 200, -400]
    assertGunSeat(seat, TIE_HIT_RADIUS, WIDE, false, 'on-glass control')

    const s = stepGame(spaceRun({ enemies: [tieAt(seat)] }), restTrigger(WIDE), DT)

    expect(tieDied(s), 'a visible fighter under the crosshair still dies').toBe(true)
    expect(s.enemies, 'and is removed from the wave').toHaveLength(0)
  })

  it('follows the REAL viewport: one seat, two canvases, opposite outcomes', () => {
    // The strongest single discriminator here, and the one a hard-coded cone cannot pass.
    // `hBound = depth · tan(FOV_Y/2) · aspect`, so at depth 400 the lateral bound is 230.9 on
    // a square canvas and 410.5 at 16:9. A TIE at x = 240 is therefore OFF the glass at 1:1
    // and ON it at 16:9 — while sitting 240 u from the ray at both, so the kill radius alone
    // cannot explain the difference. A gate that ignores `state.aspect` reddens here.
    const seat: Vec3 = [240, 0, -400]

    assertGunSeat(seat, TIE_HIT_RADIUS, 1, true, 'square-canvas seat')
    const square = stepGame(spaceRun({ aspect: 1, enemies: [tieAt(seat)] }), restTrigger(1), DT)
    expect(tieDied(square), 'square canvas: off the glass, so the shot cannot land').toBe(false)

    assertGunSeat(seat, TIE_HIT_RADIUS, WIDE, false, 'wide-canvas seat')
    const wide = stepGame(spaceRun({ aspect: WIDE, enemies: [tieAt(seat)] }), restTrigger(WIDE), DT)
    expect(tieDied(wide), 'at 16:9 the very same seat is on the glass, and dies').toBe(true)
  })

  it('holds as a UNIVERSAL across depth, offset and canvas shape — a kill implies C_PV', () => {
    // The law itself, swept rather than sampled. Both counters are asserted non-zero after,
    // because a gun that killed NOTHING would satisfy every implication vacuously.
    let kills = 0
    let underSiteOffGlass = 0
    for (const aspect of [1, 4 / 3, WIDE]) {
      for (const depth of [120, 200, 400, 800, 2000, 6000]) {
        for (const lat of [0, 120, 240]) {
          for (const vert of [0, 120, 240]) {
            const pos: Vec3 = [lat, vert, -depth]
            const ray = aimDirection(0, 0, aspect)
            const underSite = beamHit(COCKPIT, ray, pos, TIE_HIT_RADIUS) !== null
            const visible = inView(pos, aspect) !== 0
            if (underSite && !visible) underSiteOffGlass++

            const s = stepGame(spaceRun({ aspect, enemies: [tieAt(pos)] }), restTrigger(aspect), DT)
            if (tieDied(s)) {
              kills++
              expect(
                visible,
                `killed at aspect ${aspect.toFixed(3)}, depth ${depth}, lat ${lat}, vert ${vert} — but C_PV clear`,
              ).toBe(true)
            }
          }
        }
      }
    }
    expect(kills, 'positive control: the sweep DID kill fighters').toBeGreaterThan(0)
    expect(
      underSiteOffGlass,
      'positive control: the sweep DID contain under-site, off-glass seats — the case under test',
    ).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// B — AC2: the FIREBALL resolution is gated the same way (VWGUN's own four exits)
// ---------------------------------------------------------------------------

describe('sw8-27 AC2 — the player cannot shoot down a fireball the cabinet would not have drawn', () => {
  // A fireball's hit radius (150) is SMALLER than the pyramid's vertical bound at any depth
  // past 260, so an off-glass-but-under-site seat only exists close in: the bound is
  // depth · 0.5774, which is under 150 only for depth < 259.8. These seats are therefore
  // shallow by necessity, not by choice — and still well outside COCKPIT_HIT_RADIUS (80), so
  // the shot is not consumed as cockpit damage before the beam can reach it.
  it('off the glass at depth 200, under the crosshair, is NOT shot down', () => {
    const seat: Vec3 = [0, 140, -200]
    expect(
      Math.abs(seat[1]) > Math.abs(seat[2]) * TAN_HALF,
      'fixture guard: the seat is above the rendered pyramid at this depth',
    ).toBe(true)
    expect(
      Math.hypot(...seat) > COCKPIT_HIT_RADIUS,
      'fixture guard: far enough out that the cockpit-damage pass does not eat it first',
    ).toBe(true)
    assertGunSeat(seat, ENEMY_SHOT_HIT_RADIUS, WIDE, true, 'off-glass fireball')

    const s = stepGame(
      spaceRun({ enemyShots: [{ pos: [...seat] as Vec3, vel: [0, 0, 0], ttl: ENEMY_SHOT_TTL }] }),
      restTrigger(WIDE),
      DT,
    )

    expect(
      fireballDied(s),
      'VWGUN returns at :896 before ;GUN SHOT IS VISIBLE, so CL.GDS is never written',
    ).toBe(false)
  })

  it('the POSITIVE CONTROL: an on-glass fireball under the crosshair is still shot down', () => {
    // sw8-3 / 8-18 shipped fireball interception deliberately; this is the assertion that
    // stops AC2 being satisfied by disabling it.
    const seat: Vec3 = [0, 100, -6000]
    assertGunSeat(seat, ENEMY_SHOT_HIT_RADIUS, WIDE, false, 'on-glass fireball')

    const s = stepGame(
      spaceRun({ enemyShots: [{ pos: [...seat] as Vec3, vel: [0, 0, 0], ttl: ENEMY_SHOT_TTL }] }),
      restTrigger(WIDE),
      DT,
    )

    expect(fireballDied(s), 'a visible fireball under the crosshair still dies').toBe(true)
  })

  it('gates the two space lists INDEPENDENTLY — a fix wired to only one of them reddens here', () => {
    // The filing named a single space-arm call site. There are two, four lines apart, and a
    // gate applied to the loop the description mentions leaves the other one open. Seating
    // both off-glass at once means neither may resolve.
    const tieSeat: Vec3 = [0, 240, -400]
    const shotSeat: Vec3 = [0, 140, -200]
    const s = stepGame(
      spaceRun({
        enemies: [tieAt(tieSeat)],
        enemyShots: [{ pos: [...shotSeat] as Vec3, vel: [0, 0, 0], ttl: ENEMY_SHOT_TTL }],
      }),
      restTrigger(WIDE),
      DT,
    )
    expect(tieDied(s), 'the fighter is off the glass').toBe(false)
    expect(fireballDied(s), 'and so is the fireball').toBe(false)
  })
})

// ---------------------------------------------------------------------------
// C — AC3: the gate is CALLER-SIDE. The shared helper keeps no view term.
// ---------------------------------------------------------------------------

describe('sw8-27 AC3 — the gate does not leak into the shared helper', () => {
  it('a SURFACE turret the space gate would refuse still dies', () => {
    // MUTANT G6/M6 BY NAME: clamping `beamHit` to the frustum is the tempting one-line fix,
    // and it would satisfy every assertion in groups A and B. It is wrong twice over — the
    // ROM's ground pass has no view gate on its collision at all (`GRLZCL` is called at
    // WSGRND.MAC:979 immediately after `BJGDRW` at :978, and no branch in the routine skips
    // one without skipping the other), and the ground objects do not even use the same hit
    // SHAPE (WSGRND.MAC:1076-1132 is a width/height box with no octagon term).
    //
    // CORRECTED at GREEN. This comment used to say the tower "sits at vert 4000 against a
    // pyramid bound of 230.9 — hopelessly off the SPACE glass". SKIM_ALTITUDE is 128, which is
    // INSIDE that bound, so the seat was never off the glass and this test did not bite the
    // mutant it named: measured, hoisting the C_PV gate into `beamHit` leaves this test GREEN.
    // What does catch that mutant is `hitscan-laser.test.ts`'s 6,000-off-axis tower (and the
    // direct `beamHit` probe below), so the property was covered — by a different test than
    // this one claimed. Kept as ordinary surface-still-fires cover, named for what it does.
    const tower: Vec3 = [0, SKIM_ALTITUDE, -400]
    const s0: GameState = {
      ...enterPhase(initialState(1983), 'surface'),
      mode: 'playing',
      altitude: SKIM_ALTITUDE,
      turrets: [{ pos: [...tower] as Vec3, age: 0 }],
      surfaceMazeLaid: true,
      projectiles: [],
      enemyShots: [],
      firePrev: false,
      fireCooldown: 0,
    }
    const s = stepGame(s0, restTrigger(WIDE), DT)
    expect(
      s.events.some((e) => e.type === 'enemy-death' && e.enemyType === 'turret'),
      'the surface phase has no C_PV notion — a view clamp in beamHit would break it',
    ).toBe(true)
    expect(TURRET_HIT_RADIUS, 'anchor: the surface probe is measured against its own radius').toBeGreaterThan(0)
  })

  it('the ROM SHAPE does not leak into the helper either — the surface keeps its disc', () => {
    // ADDED at GREEN, because nothing caught this. The gate leaking into `beamHit` is caught
    // (measured: 6 tests, including the probe below). The SHAPE leaking into it was caught by
    // NOTHING — every surface and trench fixture seats its target essentially on the ray, where
    // a disc and the ROM's box∩octagon agree, so the two models are indistinguishable there.
    //
    // The discriminator has to sit where they differ, and they differ in one place: the octagon
    // CORNER. Today's disc is a strict subset of the ROM region, so hoisting the ROM shape into
    // the helper can only ADD hits — never remove them. The seat below is therefore one the
    // surface must keep MISSING: at 26.57° off the ray and 212 units out, it is outside
    // TURRET_HIT_RADIUS (200) but inside the ROM box (189.6, 94.8 both ≤ 200) and inside the
    // ROM octagon (284.4 ≤ 300). If the space shape ever reaches `beamHit`, this tower starts
    // dying and this test reddens.
    //
    // VERBATIM MUTANT this kills — the WHOLE body of `beamHit`, replaced, same five lines:
    //   const along = dot(sub(pos, eye), dir)
    //   if (along > maxRange) return null
    //   const s = siteOffset(eye, dir, pos)
    //   if (s === null || s.dx > radius || s.dy > radius) return null
    //   return s.dx + s.dy > SPACE_HIT_OCTAGON * radius ? null : along
    //
    // MEASURED at the round-1 rework: reddens exactly 1 test — this one.
    //
    // (CORRECTED twice, and both corrections are the reason AC8 asks for a runnable string
    // rather than a description. The version that stood here began at `const s = …`, which
    // left `along` undefined if pasted literally and silently DROPPED the `maxRange` clip if
    // read as "the body below the first line". Pasted that way it reddens 7 tests across 5
    // files — the trench clips its beam at TRENCH_FAR — against a recorded 1, so a reader
    // reproducing it would have concluded this guard was far broader than it is. The second
    // correction is subtler: written as seven lines it also reddens `citations.test.ts` twice,
    // because it changes gameRules.ts's LINE COUNT and the findings' `ours` citations are
    // re-opened against the working tree. A mutant that moves lines cannot report a clean
    // blast radius in this repo. Folded to five lines, exactly replacing the original five.)
    const corner: Vec3 = [189.6, SKIM_ALTITUDE + 94.8, -3000]
    expect(Math.hypot(189.6, 94.8), 'fixture guard: OUTSIDE the disc the surface uses').toBeGreaterThan(
      TURRET_HIT_RADIUS,
    )
    expect(189.6 + 94.8, 'fixture guard: INSIDE the ROM octagon, so a leak would accept it').toBeLessThanOrEqual(
      1.5 * TURRET_HIT_RADIUS,
    )
    const surfaceAt = (pos: Vec3): GameState => ({
      ...enterPhase(initialState(1983), 'surface'),
      mode: 'playing',
      altitude: SKIM_ALTITUDE,
      turrets: [{ pos: [...pos] as Vec3, age: 0 }],
      surfaceMazeLaid: true,
      projectiles: [],
      enemyShots: [],
      firePrev: false,
      fireCooldown: 0,
    })
    const turretDied = (s: GameState) => s.events.some((e) => e.type === 'enemy-death' && e.enemyType === 'turret')

    expect(
      turretDied(stepGame(surfaceAt(corner), restTrigger(WIDE), DT)),
      'the octagon corner is a MISS on the surface — the ROM shape is space-only',
    ).toBe(false)

    // The positive control, without which the assertion above passes for any broken fixture:
    // the same bearing, just inside the disc, still dies.
    const inside: Vec3 = [170, SKIM_ALTITUDE + 85, -3000]
    expect(Math.hypot(170, 85), 'fixture guard: inside the disc').toBeLessThan(TURRET_HIT_RADIUS)
    expect(
      turretDied(stepGame(surfaceAt(inside), restTrigger(WIDE), DT)),
      'positive control: the surface gun still works on this bearing',
    ).toBe(true)
  })

  it('`beamHit` itself still resolves a target outside the space pyramid', () => {
    // The direct statement of the same property, and the complement of
    // `tie-sights-visibility.test.ts`'s "does NOT change the GUN" — which stays green and
    // must: what it pins is that the gate is not in the helper, which AC3 still requires.
    const ray = aimDirection(0, 0, WIDE)
    const offGlass: Vec3 = [0, 240, -400]
    expect(inView(offGlass, WIDE), 'fixture guard: off the glass').toBe(0)
    expect(
      beamHit(COCKPIT, ray, offGlass, TIE_HIT_RADIUS),
      'the helper is view-blind by design; the caller is what gates',
    ).not.toBeNull()
    expect(OBSTACLE_HIT_RADIUS, 'anchor: the trench radius the helper also serves').toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// D — AC5: the space-arm KILL region is the ROM's box ∩ 1.5× octagon
// ---------------------------------------------------------------------------

describe('sw8-27 AC5 — the space kill region is the cabinet box ∩ octagon, not a disc', () => {
  // Every seat here is ON the glass and at depth 6000, so the AC1 gate cannot confound the
  // shape measurement: at that depth the bounds are 3464 vertical and 6157 lateral at 16:9,
  // and no offset below approaches either.
  const DEPTH = -6000
  const at = (dx: number, dy: number): Vec3 => [dx, dy, DEPTH]
  const shootAt = (pos: Vec3): GameState =>
    stepGame(spaceRun({ aspect: WIDE, enemies: [tieAt(pos)] }), restTrigger(WIDE), DT)

  it('anchors the terms the seats below are built from', () => {
    expect(TIE_HIT_RADIUS, 'the established TIE kill radius').toBe(250)
    expect(BOX, 'WSMAIN.MAC:3898-3903 — |dx| and |dy| against a BARE TMPSIZ').toBe(1.0)
    expect(OCTAGON, 'WSMAIN.MAC:3904-3906 — LSRD / ADDD TMPSIZ, "MAKE 1.5 FOR OCTAGON"').toBe(1.5)
    // The corner of the ROM's octagon: where the box and the octagon cross, at atan(1/2).
    expect(Math.sqrt(5) / 2, 'the cabinet reaches √5/2 R at 26.57° off-axis').toBeCloseTo(1.118, 3)
  })

  it('RED — the octagon CORNER: a seat the cabinet kills and the disc misses', () => {
    // 26.57° off-axis (atan ½) at 1.06 R. |dx| = 237.0 and |dy| = 118.5, so both box terms
    // pass (≤ 250) and the octagon sum is 355.5 (≤ 375) — the cabinet records the hit. The
    // radial distance is 265, outside the 250 disc, so today's port misses it. This is the
    // ONLY direction in which the two models disagree, and the shell is 250 → 279.5 wide.
    const seat = at(237.0, 118.5)
    expect(inView(seat, WIDE), 'fixture guard: plainly on the glass at this depth').toBe(Status.C_PV)
    expect(Math.hypot(237.0, 118.5), 'fixture guard: OUTSIDE the disc the port uses today').toBeGreaterThan(
      TIE_HIT_RADIUS,
    )
    expect(Math.abs(237.0), 'fixture guard: inside the ROM box on x').toBeLessThanOrEqual(BOX * TIE_HIT_RADIUS)
    expect(Math.abs(118.5), 'fixture guard: inside the ROM box on y').toBeLessThanOrEqual(BOX * TIE_HIT_RADIUS)
    expect(237.0 + 118.5, 'fixture guard: inside the ROM octagon').toBeLessThanOrEqual(OCTAGON * TIE_HIT_RADIUS)

    expect(tieDied(shootAt(seat)), 'the cabinet writes CL.ADS here, so the clone must too').toBe(true)
  })

  it('GREEN GUARD — the BOX term bites: kills the "octagon only" fix', () => {
    // MUTANT BY NAME: dropping the box and keeping only `|dx|+|dy| <= 1.5·T` accepts a seat
    // 1.3 R dead on the lateral axis (sum 325 ≤ 375) that the cabinet REJECTS at :3898-3900,
    // because |dx| = 325 exceeds a bare TMPSIZ. Green today only because the disc rejects it
    // too, for a different reason — so it is stated here as the wrong-fix guard it is, not as
    // evidence of anything the port currently gets right.
    const seat = at(325, 0)
    expect(inView(seat, WIDE), 'fixture guard: on the glass').toBe(Status.C_PV)
    expect(325 + 0, 'this seat IS inside the octagon — only the box excludes it').toBeLessThanOrEqual(
      OCTAGON * TIE_HIT_RADIUS,
    )
    expect(325, 'and it is outside the box').toBeGreaterThan(BOX * TIE_HIT_RADIUS)

    expect(tieDied(shootAt(seat)), 'the cabinet returns at the box test, so no kill').toBe(false)
  })

  it('GREEN GUARD — the OCTAGON term bites: kills the "box only" fix', () => {
    // The mirror mutant: keeping only the box accepts a 45° seat at |dx| = |dy| = 195 (both
    // ≤ 250) that the cabinet REJECTS at :3907-3908, because the sum 390 exceeds 1.5·TMPSIZ.
    const seat = at(195, 195)
    expect(inView(seat, WIDE), 'fixture guard: on the glass').toBe(Status.C_PV)
    expect(195, 'this seat IS inside the box on both axes — only the octagon excludes it').toBeLessThanOrEqual(
      BOX * TIE_HIT_RADIUS,
    )
    expect(195 + 195, 'and it is outside the octagon').toBeGreaterThan(OCTAGON * TIE_HIT_RADIUS)

    expect(tieDied(shootAt(seat)), 'the cabinet returns at the octagon test, so no kill').toBe(false)
  })

  it('measures dx/dy in the target DEPTH PLANE, the way a screen delta does — not perpendicular to the ray', () => {
    // ADDED at GREEN, because nothing caught this either. Every other seat in this file is
    // measured with the yoke AT REST, where the ray is [0,0,-1] and the two candidate measures
    // are identical — so the choice between them was invisible to all 2274 tests.
    //
    // The cabinet's dx/dy are differences of PROJECTED coordinates (`BJ.CX - LZ.CX`,
    // WSMAIN.MAC:3883-3895), i.e. screen deltas. The world-space image of a screen delta is the
    // offset taken in the target's own depth plane. The perpendicular distance to the ray is a
    // DIFFERENT quantity once the yoke is deflected — shorter by the cosine of the deflection —
    // and it has no screen-space meaning.
    //
    // The two therefore disagree, and this seat is where. Yoke at aimY = 0.6, target at depth
    // 2000: the ray is 692.8 up at that depth, the target 265 above the ray IN THE PLANE (so
    // the ROM box at 250 rejects it) but only 236.6 from the ray PERPENDICULARLY (so a
    // perpendicular measure would accept it). It must MISS.
    //
    // VERBATIM MUTANT this kills. It replaces the last FIVE lines of `siteOffset`
    // (`gameRules.ts`) — the `const t` line through the return — with five others, so no
    // line count moves:
    //   const c = add(eye, scale(dir, along))
    //   const dx = Math.abs(pos[0] - c[0])
    //   const dy = Math.abs(pos[1] - c[1])
    //   if (!Number.isFinite(dx) || !Number.isFinite(dy)) return null // guard preserved
    //   return { along, dx, dy }
    //
    // MEASURED against HEAD at the round-2 rework: reddens exactly 1 test — this one.
    //
    // R4 (round-2 review), and it is worth reading before publishing the next mutant here.
    // The string above USED to be a six-line replacement, and it was correct on the day it
    // was written: the RED commit's `siteOffset` ended in six lines. The GREEN commit in the
    // same diff restructured it to five — hoisting `dx`/`dy` out of the object literal to
    // add the `Number.isFinite` guard — and this comment was not reconciled. Applied
    // literally against the delivered tree the published string was six-for-five (so the
    // file DID move, reddening `citations.test.ts` twice) and it silently dropped the
    // finite guard (so it reddened F8 as well): 4 tests across 2 files, not the recorded 1.
    // The battery had actually run a different, correct 3-for-3 mutant, so the record was a
    // statement about a string nobody published. A mutant is a claim about the CURRENT tree
    // and must be re-read from it after the last edit — checklist #20 and #23.
    //
    // (An earlier RE-FOLD, kept because the hazard is separate and still live. Collapsing
    // the object literal shortens `gameRules.ts`, and `citations.test.ts` re-opens each
    // finding's `ours` citation against the WORKING TREE — so a line-count-changing version
    // reddens it on top of this test, and a reader would record a blast radius of 3 for a
    // change that moves one behaviour. Any mutant published here must preserve line count,
    // and must keep every clause the original had.)
    const AIM_Y = 0.6
    const DEEP = 2000
    const rayY = (AIM_Y / (1 / Math.tan(FOV_Y / 2))) * DEEP // where the deflected ray sits at that depth
    const deflected: Input = { aimX: 0, aimY: AIM_Y, fire: true, aspect: WIDE }

    const beyond: Vec3 = [0, rayY + 265, -DEEP]
    expect(inView(beyond, WIDE), 'fixture guard: still on the glass, so the gate cannot explain a miss').toBe(
      Status.C_PV,
    )
    expect(
      tieDied(stepGame(spaceRun({ aspect: WIDE, enemies: [tieAt(beyond)] }), deflected, DT)),
      '265 in the depth plane is outside the ROM box — a perpendicular measure would call it 236.6 and hit',
    ).toBe(false)

    // Positive control on the SAME deflected ray, without which the miss above proves nothing:
    // a seat inside the box in plane terms still dies.
    const within: Vec3 = [0, rayY + 237.5, -DEEP]
    expect(inView(within, WIDE), 'fixture guard: also on the glass').toBe(Status.C_PV)
    expect(
      tieDied(stepGame(spaceRun({ aspect: WIDE, enemies: [tieAt(within)] }), deflected, DT)),
      'positive control: the deflected gun still kills inside the box',
    ).toBe(true)
  })

  it('the change is PURELY ADDITIVE — nothing killable today stops being killable', () => {
    // The containment measured at setup, asserted rather than trusted: the disc is a strict
    // subset of the ROM region, because the greatest |dx|+|dy| anywhere on a disc of radius R
    // is R·√2 = 1.414 R, which is inside the 1.5 R octagon, and every point of the disc is
    // inside the box by construction. So a shape port that LOSES a kill has mis-ported it.
    let killable = 0
    for (let deg = 0; deg < 360; deg += 7) {
      for (const k of [0.2, 0.5, 0.8, 0.95, 0.999]) {
        const dx = k * TIE_HIT_RADIUS * Math.cos((deg * Math.PI) / 180)
        const dy = k * TIE_HIT_RADIUS * Math.sin((deg * Math.PI) / 180)
        const seat = at(dx, dy)
        killable++
        expect(
          tieDied(shootAt(seat)),
          `inside today's disc at ${deg}°, k=${k} — the ROM region contains the whole disc`,
        ).toBe(true)
      }
    }
    expect(killable, 'positive control: the sweep actually probed seats').toBeGreaterThan(100)
  })
})

// ---------------------------------------------------------------------------
// E — AC6: the SIGHTS region is the ROM's pure L1 octagon at 3×, with no box
// ---------------------------------------------------------------------------

describe('sw8-27 AC6 — the sights band is the cabinet L1 octagon at 3×, not a disc at 2×', () => {
  const DEPTH = -6000
  const at = (dx: number, dy: number): Vec3 => [dx, dy, DEPTH]
  const R = TIE_HIT_RADIUS

  it('RED — on the axis the cabinet warns out to 3·TMPSIZ, where the disc stops at 2·', () => {
    // The largest disagreement between the two models anywhere: 750 against 500. A fighter
    // 625 u off the ray at this depth is inside the cabinet's warning area (sum 625 ≤ 750)
    // and outside our disc. TCH1DZ's loiter break reads this bit, so the region is not
    // cosmetic — it gates choreography.
    const seat = at(625, 0)
    expect(inView(seat, WIDE), 'fixture guard: on the glass').toBe(Status.C_PV)
    expect(625, 'inside the ROM warning octagon').toBeLessThanOrEqual(SIGHTS_OCTAGON * R)
    expect(625, 'outside the disc the port uses today').toBeGreaterThan(SIGHTS_BAND_FACTOR * R)

    expect(sights(seat, WIDE), 'ALLOW LARGER WARNING AREA, WSMAIN.MAC:3922').toBe(Status.C_PS)
  })

  it('RED — and on the diagonal it warns to 2.121·, where the disc still stops at 2·', () => {
    // The other end of the same anisotropy. |dx| = |dy| = 362.3 is 512.5 radially — outside
    // the disc — while the sum 724.6 is inside the octagon. A port that merely WIDENED the
    // disc from 2× to 3× would pass the axis test above and fail here, because it would also
    // accept 750 on the diagonal, which the cabinet does not.
    const seat = at(362.3, 362.3)
    expect(inView(seat, WIDE), 'fixture guard: on the glass').toBe(Status.C_PV)
    expect(Math.hypot(362.3, 362.3), 'outside the disc').toBeGreaterThan(SIGHTS_BAND_FACTOR * R)
    expect(362.3 + 362.3, 'inside the octagon').toBeLessThanOrEqual(SIGHTS_OCTAGON * R)

    expect(sights(seat, WIDE), 'the sum is what the cabinet tests, not the radius').toBe(Status.C_PS)
  })

  it('GREEN GUARD — a widened DISC is not the fix: the diagonal must stop short of 3·', () => {
    // MUTANT BY NAME: `SIGHTS_BAND_FACTOR = 3` with the disc kept. That passes the axis test
    // and accepts this seat, which the cabinet rejects — 380 + 380 = 760 is past 3·TMPSIZ.
    const seat = at(380, 380)
    expect(inView(seat, WIDE), 'fixture guard: on the glass').toBe(Status.C_PV)
    expect(Math.hypot(380, 380), 'a 3× DISC would accept this seat').toBeLessThan(SIGHTS_OCTAGON * R)
    expect(380 + 380, 'the octagon does not').toBeGreaterThan(SIGHTS_OCTAGON * R)

    expect(sights(seat, WIDE), 'past the warning octagon on the diagonal').toBe(0)
  })

  it('RED — the sights band reaches 725 on the axis, so no box NARROWER than 3× survives', () => {
    // The one structural difference between the two ROM blocks: :3920-3924 tests only the
    // sum, with no box term.
    //
    // WHAT THIS SEAT PROVES, stated to match what was measured rather than what reads well.
    // A port that reused the kill predicate at a bigger scale would add a box, and how far
    // this test can see depends on that box's SCALE:
    //
    //   box at 1× or 2× TMPSIZ  — CAUGHT here (mutation-proven: a 2× box reddens this test,
    //                             the axis test above, the rewritten band test in
    //                             tie-sights-status.test.ts, and the AC7 agreement sweep).
    //   box at exactly 3×       — EQUIVALENT MUTANT. `|dx| + |dy| <= 3·T` already implies
    //                             both `|dx| <= 3·T` and `|dy| <= 3·T`, so the term is
    //                             redundant and changes no observable behaviour. It survived
    //                             the battery, and correctly: there is nothing to catch. Do
    //                             not add a test for it — add one and it passes vacuously,
    //                             asserting a property no input can violate.
    //
    // So this test's job is the 725 reach itself, which the retired 2× disc fails.
    const seat = at(725, 0)
    expect(inView(seat, WIDE), 'fixture guard: on the glass').toBe(Status.C_PV)
    expect(725, 'inside the octagon, and past 2·TMPSIZ').toBeLessThanOrEqual(SIGHTS_OCTAGON * R)

    expect(sights(seat, WIDE), 'no box term at :3920-3924 — only the sum').toBe(Status.C_PS)
  })

  it('GREEN GUARD — the axis still stops: 3· is a bound, not an opening', () => {
    const seat = at(775, 0)
    expect(inView(seat, WIDE), 'fixture guard: on the glass').toBe(Status.C_PV)
    expect(775, 'past the warning octagon on the axis').toBeGreaterThan(SIGHTS_OCTAGON * R)
    expect(sights(seat, WIDE), 'the cabinet does not warn out here either').toBe(0)
  })

  it('containment survives the reshape: anything the gun can KILL is in the sights', () => {
    // 1.5·TMPSIZ ⊂ 3·TMPSIZ is a containment in the cabinet, and it must remain one here
    // after BOTH regions change shape. Measured at setup in the old models and asserted here
    // in the new ones — this is the assertion that stops the two machines drifting apart
    // while each is independently "correct".
    let killable = 0
    for (let deg = 0; deg < 360; deg += 11) {
      for (const k of [0.3, 0.7, 1.0, 1.1]) {
        const dx = k * R * Math.cos((deg * Math.PI) / 180)
        const dy = k * R * Math.sin((deg * Math.PI) / 180)
        const seat = at(dx, dy)
        const died = tieDied(stepGame(spaceRun({ aspect: WIDE, enemies: [tieAt(seat)] }), restTrigger(WIDE), DT))
        if (died) {
          killable++
          expect(sights(seat, WIDE), `killable at ${deg}°, k=${k} — but not in the sights`).toBe(Status.C_PS)
        }
      }
    }
    expect(killable, 'positive control: the sweep DID contain killable seats').toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// F — AC7: the shape deviation is retired by MEASUREMENT, in both directions
// ---------------------------------------------------------------------------

describe('sw8-27 AC7 — the port and the cabinet now agree about every seat, not merely nest', () => {
  const DEPTH = -6000
  const at = (dx: number, dy: number): Vec3 => [dx, dy, DEPTH]

  it('the KILL region matches the cabinet term for term, in both directions', () => {
    // Before this story the relationship was CONTAINMENT — 0/2000 directions where the clone
    // reached further, but a real gap at the octagon corner. The deviation is only retired if
    // the two agree, so this asserts equality and counts both kinds of seat to prove the
    // sweep can see both.
    let accepted = 0
    let rejected = 0
    for (let deg = 0; deg < 360; deg += 9) {
      for (const k of [0.5, 0.9, 1.0, 1.05, 1.1, 1.15, 1.3]) {
        const dx = k * TIE_HIT_RADIUS * Math.cos((deg * Math.PI) / 180)
        const dy = k * TIE_HIT_RADIUS * Math.sin((deg * Math.PI) / 180)
        const rom =
          Math.abs(dx) <= BOX * TIE_HIT_RADIUS &&
          Math.abs(dy) <= BOX * TIE_HIT_RADIUS &&
          Math.abs(dx) + Math.abs(dy) <= OCTAGON * TIE_HIT_RADIUS
        const seat = at(dx, dy)
        const died = tieDied(stepGame(spaceRun({ aspect: WIDE, enemies: [tieAt(seat)] }), restTrigger(WIDE), DT))
        if (rom) accepted++
        else rejected++
        expect(died, `cabinet says ${rom ? 'HIT' : 'MISS'} at ${deg}°, k=${k} — the port disagreed`).toBe(rom)
      }
    }
    expect(accepted, 'positive control: the sweep contained seats the cabinet ACCEPTS').toBeGreaterThan(0)
    expect(rejected, 'positive control: and seats it REJECTS').toBeGreaterThan(0)
  })

  it('the SIGHTS region matches the cabinet term for term, in both directions', () => {
    let accepted = 0
    let rejected = 0
    for (let deg = 0; deg < 360; deg += 9) {
      for (const k of [1.5, 2.0, 2.1, 2.3, 2.8, 3.1]) {
        const dx = k * TIE_HIT_RADIUS * Math.cos((deg * Math.PI) / 180)
        const dy = k * TIE_HIT_RADIUS * Math.sin((deg * Math.PI) / 180)
        const rom = Math.abs(dx) + Math.abs(dy) <= SIGHTS_OCTAGON * TIE_HIT_RADIUS
        const seat = at(dx, dy)
        expect(inView(seat, WIDE), `fixture guard: on the glass at ${deg}°, k=${k}`).toBe(Status.C_PV)
        if (rom) accepted++
        else rejected++
        expect(
          sights(seat, WIDE) !== 0,
          `cabinet says ${rom ? 'SIGHTED' : 'CLEAR'} at ${deg}°, k=${k} — the port disagreed`,
        ).toBe(rom)
      }
    }
    expect(accepted, 'positive control: the sweep contained sighted seats').toBeGreaterThan(0)
    expect(rejected, 'positive control: and unsighted ones').toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// F — the round-1 review's findings: the parts of the new gate nobody named
// ---------------------------------------------------------------------------
//
// Groups A–E were written from the ACs, and the round-1 Reviewer's Devil's Advocate is that
// this is exactly their limit: every guard in this file aims at a mutant somebody thought of,
// so anything the ACs did not name is unexamined. Three such things were found, and all three
// are inputs rather than geometry — which is why a file organised by ROM citation missed them.
//
// They share one shape: `spaceSiteHit` REJECTS with `>` where the helper it replaced ACCEPTED
// with `<=`. That inversion is invisible on ordinary inputs and decides the answer on
// degenerate ones, because every comparison against NaN is false — so `beamHit` failed CLOSED
// (a NaN offset is not `<= radius`, no hit) and `spaceSiteHit` fails OPEN (a NaN offset is not
// `> radius`, so it clears the box AND the octagon and returns a "hit").

describe('sw8-27 F — degenerate inputs to the new gate, which the ACs did not name', () => {
  it('F5 — a target at the OPPOSITE frustum corner is not killed: `along <= 0` is load-bearing', () => {
    // `siteOffset`'s behind-the-gun exit was invisible to the whole suite: a line-preserving
    // neutralisation of it left 202/202 files and 2276/2276 tests GREEN. It is not dead code,
    // and it is not merely "reachable" — past it, the player kills a fighter they are aiming
    // AWAY from.
    //
    // Reaching it needs all three of: the target ON the glass (or `inPlayerView` refuses it
    // first), the target INSIDE the box and octagon (or the shape refuses it), and `along < 0`.
    // The last two pull against each other — `along = t + delta·dir`, where `t > 0` is the
    // ray's parameter at the target's depth plane and `delta` is the in-plane offset the box
    // caps at the hit radius — so the only way to lose is with `t` SMALL, which means shallow
    // depth, which means a tiny frustum. Everything has to be near a corner at once.
    //
    // The round-1 review named a seat at [1025.4, 576.8, -1000] with `along = -249.5`. That
    // seat proves the exit is reachable and NOT that it matters: measured, its in-plane offset
    // is dx 2051.8, dy 1154.2, so the box rejects it and the guard changes nothing there. The
    // seat below is the one that actually bites — at depth 117 with the yoke jammed to the
    // opposite corner, dx 239.6 and dy 134.8 clear the box (250) and sum to 374.3, inside the
    // octagon's 375, while `along` is -28.8.
    //
    // VERBATIM MUTANT this kills, replacing that line in `siteOffset` (`gameRules.ts`):
    //   if (along <= 0 && false) return null // behind the gun — never under the site
    const DEPTH = 117
    const vBound = DEPTH * TAN_HALF
    const hBound = vBound * WIDE
    const oppositeCorner: Vec3 = [hBound * 0.995, vBound * 0.995, -DEPTH]
    // The yoke jammed to the corner DIAGONALLY opposite the seat.
    const cornerYoke: Input = { aimX: -1, aimY: -1, fire: true, aspect: WIDE }

    // Fixture guards — each is one of the three conditions above, so a seat that drifts off
    // any of them fails HERE, naming which one, instead of passing the assertion vacuously.
    expect(inView(oppositeCorner, WIDE), 'fixture guard: the seat is ON the glass').toBe(Status.C_PV)
    const dir = aimDirection(cornerYoke.aimX, cornerYoke.aimY, WIDE)
    const site = siteOffset(COCKPIT, dir, oppositeCorner)
    expect(site, 'fixture guard: the guard under test is the ONLY thing rejecting this seat').toBeNull()
    // Re-derive what `siteOffset` would have returned with the guard neutralised, so the
    // claim "the box and octagon both accept it" is measured here rather than asserted in
    // the comment above.
    const t = (COCKPIT[2] - oppositeCorner[2]) / -dir[2]
    const dx = Math.abs(oppositeCorner[0] - (COCKPIT[0] + dir[0] * t))
    const dy = Math.abs(oppositeCorner[1] - (COCKPIT[1] + dir[1] * t))
    const along = dir[0] * oppositeCorner[0] + dir[1] * oppositeCorner[1] + dir[2] * oppositeCorner[2]
    expect(along, 'fixture guard: the seat really is BEHIND the gun').toBeLessThan(0)
    expect(dx, 'fixture guard: and inside the ROM box on x, so the box does not save us').toBeLessThanOrEqual(
      BOX * TIE_HIT_RADIUS,
    )
    expect(dy, 'fixture guard: and on y').toBeLessThanOrEqual(BOX * TIE_HIT_RADIUS)
    expect(dx + dy, 'fixture guard: and inside the ROM octagon, so that does not either').toBeLessThanOrEqual(
      OCTAGON * TIE_HIT_RADIUS,
    )

    expect(
      tieDied(stepGame(spaceRun({ aspect: WIDE, enemies: [tieAt(oppositeCorner)] }), cornerYoke, DT)),
      'the player is aiming at the far corner of the glass — this fighter must survive',
    ).toBe(false)

    // POSITIVE CONTROL, without which "nothing dies at depth 117" passes for the wrong reason:
    // the same fighter, same frame, with the yoke pointed AT it, dies.
    const onTarget: Input = {
      aimX: (oppositeCorner[0] / -oppositeCorner[2] / WIDE) * (1 / TAN_HALF),
      aimY: (oppositeCorner[1] / -oppositeCorner[2]) * (1 / TAN_HALF),
      fire: true,
      aspect: WIDE,
    }
    expect(
      tieDied(stepGame(spaceRun({ aspect: WIDE, enemies: [tieAt(oppositeCorner)] }), onTarget, DT)),
      'positive control: aimed at, the very same fighter at the very same seat dies',
    ).toBe(true)
  })

  it('F7 — a degenerate viewport aspect does not silently disarm the gun', () => {
    // RED. `inPlayerView` builds `hBound = vBound * aspect`, so `aspect === 0` collapses the
    // lateral bound to zero and `lat * lat < 0` is false for EVERY position — including dead
    // ahead. Before this story that corrupted a status bit; as of this story it also gates
    // `spaceSiteHit`, so the player's laser hits NOTHING in space for the whole frame and
    // nothing anywhere says why.
    //
    // It is reachable from the shell: `shell/input.ts` guards `clientHeight === 0` but not
    // `clientWidth === 0`, which yields exactly 0 and reaches `input.aspect ?? 1` untouched —
    // and `?? 1` does not fire, because 0 is not nullish. A zero-width canvas is what a
    // display: none container, a collapsed flex child or a pre-layout first frame all produce.
    //
    // The fix belongs where the viewport ENTERS the core, not inside the frustum math: one
    // guard at the boundary keeps `inPlayerView` a pure statement of the pyramid, and covers
    // every future reader rather than the two that exist today.
    //
    // THE RULE PINNED HERE is the one the core already documents for a viewport the shell has
    // not supplied — fall back to SQUARE (`tie-sights-status.test.ts`, "defaults to a square
    // viewport when the shell has not supplied one") — extended to a viewport the shell HAS
    // supplied and that cannot be used: `Number.isFinite(a) && a > 0 ? a : 1`. A fallback and
    // not a clamp, deliberately: clamping into a sane band means inventing the band, and still
    // hands the frustum a number nobody measured.
    //
    // AND IT MUST REACH TWO CALL SITES, which is what the last block below is for. `stepGame`
    // shadows the viewport onto the state at `sim.ts:193-195`, and the preamble above that line
    // says "this one line reaches every exit path" — but `beamDir` is built at `sim.ts:354`
    // from `input.aspect` RAW, not from the shadowed `state.aspect` — that is how it stood when
    // this test was written. A guard added at the shadow ALONE would have made the two disagree,
    // and the beam would have gone on inverting the projection with the very viewport the gate
    // had just rejected. GREEN moved that line onto `state.aspect`, so the two agree again for a
    // reason rather than by luck.
    //
    // VERBATIM MUTANTS this kills, both line-preserving, both in `sim.ts`:
    //
    //   the sanitiser itself —
    //     const aspect = rawAspect
    //   MEASURED at GREEN: reddens exactly 1 test — this one.
    //
    //   the second call site put back the way it was, i.e. a state-only fix —
    //     const beamDir: Vec3 = aimDirection(aimX, aimY, input.aspect)
    //   MEASURED at GREEN: reddens 5, of which ONE is behavioural — this test. The other four
    //   are the citation guards, and for a different reason from the line-count artefact noted
    //   in group C: this mutant changes the CONTENT of a line `tie-sights-status.test.ts` quotes
    //   verbatim, so the quote stops matching its own citation. Two independent ways for a
    //   mutant's count to overstate its blast radius in this repo, and neither is the code.
    const deadAhead: Vec3 = [0, 0, -3000]
    expect(
      tieDied(stepGame(spaceRun({ aspect: 1, enemies: [tieAt(deadAhead)] }), restTrigger(1), DT)),
      'control: on a sane viewport this fighter is dead centre and dies',
    ).toBe(true)

    for (const [label, aspect] of [
      ['zero (a zero-width canvas)', 0],
      ['negative', -1],
      ['NaN', NaN],
      ['Infinity', Infinity],
    ] as const) {
      const after = stepGame(spaceRun({ enemies: [tieAt(deadAhead)] }), { aimX: 0, aimY: 0, fire: true, aspect }, DT)
      expect(after.aspect, `aspect ${label}: falls back to square, the default the core documents`).toBe(1)
      expect(
        tieDied(after),
        `aspect ${label}: a fighter dead ahead under the crosshair must still be killable`,
      ).toBe(true)
    }

    // FAIL-OPEN, the mirror of the case above and the third of the round-1 review's confirmed
    // silent failures. An unbounded aspect makes `hBound` unbounded, so a fighter off the SIDE
    // of the glass reads as drawn. The seat has to be one the SHAPE admits, or the assertion
    // passes without the gate ever being consulted: at depth 400 the lateral bound is 230.9 on
    // a square canvas while 240 is inside TIE_HIT_RADIUS of the at-rest ray. It is AC1's filed
    // seat rotated onto the other axis.
    const offGlassLaterally: Vec3 = [240, 0, -400]
    assertGunSeat(offGlassLaterally, TIE_HIT_RADIUS, 1, true, 'lateral fail-open seat')
    expect(
      tieDied(
        stepGame(
          spaceRun({ enemies: [tieAt(offGlassLaterally)] }),
          { aimX: 0, aimY: 0, fire: true, aspect: Infinity },
          DT,
        ),
      ),
      'aspect Infinity: an unbounded lateral bound must not re-admit a fighter that was never drawn',
    ).toBe(false)

    // THE SECOND CALL SITE. Seat a fighter on the ray the yoke describes AT THE FALLBACK
    // ASPECT, then send the degenerate one. A fix applied only where `state.aspect` is set
    // leaves `sim.ts:354` building `aimDirection(aimX, aimY, 0)`, whose x term is multiplied to
    // zero: the beam flies straight ahead while the crosshair is deflected, and this fighter
    // lives through a shot that is on it.
    const YOKE = 0.5
    const deflectedRay = aimDirection(YOKE, 0, 1)
    const tOf = 3000 / -deflectedRay[2]
    const onDeflectedRay: Vec3 = [deflectedRay[0] * tOf, deflectedRay[1] * tOf, -3000]
    // Guarded by hand rather than through `assertGunSeat`, which measures from the AT-REST ray
    // (see its docstring) and would reject a seat 866 u off it — the whole point of this seat.
    expect(
      beamHit(COCKPIT, deflectedRay, onDeflectedRay, TIE_HIT_RADIUS),
      'fixture guard: the seat is on the DEFLECTED ray, so the shot resolves it at aspect 1',
    ).not.toBeNull()
    expect(inView(onDeflectedRay, 1), 'fixture guard: and on the glass at the fallback aspect').toBe(Status.C_PV)
    expect(
      tieDied(
        stepGame(spaceRun({ enemies: [tieAt(onDeflectedRay)] }), { aimX: YOKE, aimY: 0, fire: true, aspect: 1 }, DT),
      ),
      'control: at the fallback aspect the deflected crosshair is on this fighter',
    ).toBe(true)
    expect(
      tieDied(
        stepGame(spaceRun({ enemies: [tieAt(onDeflectedRay)] }), { aimX: YOKE, aimY: 0, fire: true, aspect: 0 }, DT),
      ),
      'aspect zero: the BEAM must fall back too — a state-only guard leaves sim.ts:354 raw',
    ).toBe(true)
  })

  it('F8 — a non-finite yoke cannot manufacture a hit out of NaN', () => {
    // RED, and the premise it corrects is one `siteOffset`'s own docstring states as fact:
    // "`aimDirection` puts a literal `-1` in z before normalising, so `dir[2] < 0` for every
    // ray it can return". Measured, that is false — `aimDirection(Infinity, 0, 1)` returns
    // `[NaN, 0, -0]`, whose z is neither negative nor usable as a divisor.
    //
    // What follows is the inversion described above the describe: `beamHit` accepts with
    // `<= radius`, so NaN fails it and the helper fails CLOSED. `spaceSiteHit` rejects with
    // `> radius`, so NaN passes the box AND the octagon and it returns a non-null "hit" whose
    // range is NaN. Today that is masked one layer up — `range < bestRange` is also false for
    // NaN, so the contest discards it — which means the whole thing rests on a coincidence in
    // a DIFFERENT function from the one that made the assumption. Remove the ranking (a single
    // target, an early return, any future rewrite of the loop) and the mask goes with it.
    //
    // Pin the contract at the seam that made the claim: `siteOffset` returns null when it
    // cannot answer, which is what its `| null` already promises and what makes its docstring
    // true again.
    //
    // VERBATIM MUTANT this kills — `siteOffset`'s guard line in `gameRules.ts`, replaced by a
    // comment so the line count holds:
    //   // MUTANT: the whole non-finite guard removed (line-preserving)
    // MEASURED at GREEN: reddens exactly 1 test — this one.
    //
    // (The FIRST attempt at this mutant was equivalent and scored 0, which is the lesson worth
    // keeping. Neutralising only the first conjunct — `if (false && !Number.isFinite(dx) ||
    // !Number.isFinite(dy))` — reads as a disabled guard and is not one: `&&` binds tighter
    // than `||`, so the whole thing collapses to `!Number.isFinite(dy)` and the guard still
    // fires on every input here, dy being NaN in all three. A survivor is a question about the
    // MUTANT before it is a question about the tests.)
    for (const [label, aimX, aimY] of [
      ['+Infinity on x', Infinity, 0],
      ['-Infinity on x', -Infinity, 0],
      ['NaN on y', 0, NaN],
    ] as const) {
      const dir = aimDirection(aimX, aimY, WIDE)
      expect(
        siteOffset(COCKPIT, dir, [0, 0, -3000]),
        `${label}: a ray that cannot be resolved yields no site, rather than a NaN one`,
      ).toBeNull()
    }

    // And end-to-end, because the seam contract is only worth having if the arm honours it:
    // no kill, and no crash, on a frame the shell should never send but might.
    const s = spaceRun({ aspect: WIDE, enemies: [tieAt([0, 0, -3000])] })
    const after = stepGame(s, { aimX: Infinity, aimY: 0, fire: true, aspect: WIDE }, DT)
    expect(tieDied(after), 'a non-finite yoke kills nothing').toBe(false)

    // POSITIVE CONTROL for the whole block: the ordinary ray at the same seat still resolves,
    // so "returns null" is not passing because `siteOffset` stopped working.
    expect(
      siteOffset(COCKPIT, aimDirection(0, 0, WIDE), [0, 0, -3000]),
      'positive control: the at-rest ray still resolves the very same target',
    ).not.toBeNull()
  })
})
