// tests/core/tie-sights-visibility.test.ts
//
// sw8-19 — C_PS may only be set for a fighter the player can actually SEE.
//
// THE ROM GATE IS CONTROL FLOW, NOT ADJACENCY. The filed finding described the gate as
// implicit — the sole `CHSET C$PS` "sits inside the object draw pass, so an object the
// cabinet does not draw cannot receive the sights bit". True, and much weaker than what
// the source says. `S2VW` (WSMAIN.MAC:3755) is one straight-line routine, and it has
// EXACTLY FOUR exits before it sets C$PV — every one of them a long branch to `RTS1`,
// whose body is a bare `RTS` at :3754:
//
//     12$:  LDD M.XP / CMPD #10   / LBLE RTS1      :3824-3826   near clamp
//           CMPD #7F00            / LBHI RTS1      :3827-3828   far clamp
//     19$:  LDD M.YPS / SUBD M.XPS / LBHS RTS1     :3834-3836   ratio test  ;B OUT OF VIEW
//     28$:  LDD M.ZPS / SUBD M.XPS / LBHS RTS1     :3840-3842   ratio test
//     31$:  LDX S2.PRM / LDD A$CHST(X)
//           CHSET C$PV            ;WITHIN PLAYERS VIEW SCREEN   :3846
//           ... IS2UV / OBJCEN ... ;SHIP 2 VISIBLE              :3870-3873
//           ... TMPSIZ / TMPOCT / the laser hit ...             :3875-3918
//           CHSET C$PS            ;STATUS: ALIEN IN PLAYER SITES :3930
//
// Those four tests ARE C_PV's definition. `CHSET C$PV` is :3846 and the tree's sole
// `CHSET C$PS` is :3930, and between those two lines there is NO label at all — so
// nothing can branch into the span and arrive at the second without having executed
// the first. (The next branch target, `86$`, is at :3933: PAST the CHSET, reached only
// by the `?ALIVE?` test's own `BNE` at :3928, so it can only skip the sights bit.)
// :3930 is therefore UNREACHABLE unless :3846 executed, on the same object, in the same
// pass. Gating C_PS on C_PV is a transcription of the cabinet's control flow, not an
// inference from proximity.
//
// (CORRECTED during GREEN: this paragraph first said `86$` was "the only branch target
// BETWEEN them", which is false — :3933 is past :3930, not between. The true statement
// is the stronger one above: the span contains no label whatsoever.)
//
// Nothing else in that span gates: `IS2UV`/`OBJCEN` (:3870-3873) are `JSR`s, and a JSR
// returns to :3875 — it cannot skip the caller's remaining code. The laser-hit block's
// four `ENDIF`s all close at :3915-3918, BEFORE the `;---` at :3919, so the sights test
// is a sibling of the hit test and not nested inside its conditions. The one other guard
// in the C_PS block, `?ALIVE?` (`LDA A$TYP(X) / CMPA #1 / BNE 86$`, :3926-3928), is
// already ported: `state.enemies` holds only live fighters.
//
// WHAT THE PORT DID BEFORE THIS STORY. `computeStatus` derived C_PV from the RENDERED
// frustum (uf1-14) and derived C_PS from `beamHit` alone — and `beamHit`
// (gameRules.ts:152-164) carries NO view test whatsoever, only `along <= 0` (behind the
// gun) and a `maxRange` that is `Infinity` in space. So the two bits were independent, and
// C_PS could be set for a fighter that is off the glass.
//
// (Updated at sw8-27, which changed the second half of that sentence: C_PS no longer goes
// through `beamHit` at all — it uses `siteOffset` against the ROM's L1 warning octagon. The
// first half still holds and is still the point of this file, and `beamHit`'s view-blindness
// is still true and still deliberate, which is what the GUN test at the bottom pins.)
//
// MEASURED, IN PLAY, NOT ARGUED. The shipped uf1-12 loiter fixture — a D-group fighter
// seated at [4000, 0, -6000] and tracked with the yoke — spends 30 of its 391 flight
// frames with C_PS set and C_PV clear, starting at frame 0. `tie-loiter-sights.test.ts`
// already notices the geometry in its own comment ("4,000 at this depth is 33.7° off the
// nose — still outside the ±30° glass") without recognising it as this defect.
//
// WHY THE DIVERGENCE IS BIGGER THAN THE FILING SAYS. The filing calls it "behaviourally
// small (the fighter is about to collide)", which is true of the single seat it chose and
// false of the region. The band is a FIXED size while the pyramid's half-width GROWS with
// depth, so the two cross over, and below that crossover a fighter can be inside the band
// and outside the glass. At depth 800 it is ~925 u from the cockpit — 3.7 × its own kill
// radius, nowhere near collision.
//
// (SWEPT at sw8-27, which retired the shape this paragraph described, and the numbers with
// it. The band WAS a 500 u disc — `SIGHTS_BAND_FACTOR × TIE_HIT_RADIUS`, 2 × 250 — and is
// now the cabinet's L1 octagon, `|dx| + |dy| <= SIGHTS_OCTAGON × TIE_HIT_RADIUS`
// (WSMAIN.MAC:3920-3924). So it is no longer ONE number: it reaches 750 u on each axis and
// 375 u per axis on the diagonal, which is 530 u radially. The crossover is per-axis too —
// vertically `3 × TIE_HIT_RADIUS / tan(FOV_Y/2)` = 750 / 0.57735 = 1299 u, where this
// paragraph used to say 866. Every seat below still sits inside BOTH models, so the seats
// did not move; only the description of the region they sit in did.)
//
// And uf1-14 made the region BIGGER, which is why the story's dependency ordering
// mattered: at the retired ±45° pyramid the crossover was 500/1.0 = 500; at the rendered
// 30° vertical it is 866. Horizontally it scales with the canvas (`hBound = vBound ×
// aspect`), so the SAME seat can be off-glass on a square canvas and on-glass at 16:9 —
// pinned below, because that pair is what proves the gate reads the real viewport rather
// than a constant.
//
// RED until computeStatus gates C_PS on C_PV.
//
// The sacred boundary holds: no DOM, no time except dt, no randomness except the seeded
// RNG carried in state.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { computeStatus, VIEW_NEAR, VIEW_FAR, SIGHTS_BAND_FACTOR, SIGHTS_OCTAGON } from '../../src/core/tie-status'
import { ChoreoOp, Status, initVm, program } from '../../src/core/tie-vm'
import { choreoPc } from '../../src/core/tie-waves'
import { COCKPIT, FOV_Y, aimDirection, beamHit } from '../../src/core/gameRules'
import { stepGame } from '../../src/core/sim'
import {
  initialState,
  PLAY_CUBE_MAX,
  PLAY_CUBE_MIN,
  TICK_HZ,
  TIE_HIT_RADIUS,
  TIE_SPAWN_DISTANCE,
  type GameState,
} from '../../src/core/state'
import type { Vec3 } from '@shared/math3d'
import { makeSpaceState, makeTie, lookAtOrigin, rngSeed } from './helpers/space'

const TICK_DT = 1 / TICK_HZ
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** The rendered frustum's vertical slope — `perspective(FOV_Y, aspect, …)` in render.ts.
 *  Recomputed here from the shared constant rather than copied, so a change to FOV_Y
 *  moves the fixtures and the machine together instead of silently splitting them. */
const TAN_HALF = Math.tan(FOV_Y / 2)

/** The full status word for a TIE at `pos` on a canvas of shape `aspect`, yoke at rest. */
function statusAt(pos: Vec3, aspect: number, seed = 1): number {
  const s: GameState = { ...makeSpaceState(), aspect }
  return computeStatus(makeTie({ pos }), s, rngSeed(seed))
}

const sights = (pos: Vec3, aspect: number) => statusAt(pos, aspect) & Status.C_PS
const inView = (pos: Vec3, aspect: number) => statusAt(pos, aspect) & Status.C_PV

/**
 * Fixture guard used by every negative seat below. Asserts that the seat really is the case
 * we mean: strictly inside the sights band measured off the at-rest aim ray, and strictly
 * outside the rendered view pyramid.
 *
 * Without this a "C_PS is clear" assertion passes for the wrong reason the moment a seat
 * drifts out of the band, and the suite scores itself as protecting something it does not.
 *
 * IT IS DELIBERATELY CONSERVATIVE, and since sw8-27 that is a real distinction rather than a
 * pedantic one. The band the game now tests is the L1 octagon at `SIGHTS_OCTAGON` (750 u);
 * this guard asks the strictly SMALLER question "inside the retired 500 u disc", which
 * implies the octagon — a disc of radius 500 reaches at most 500·√2 = 707 in `|dx| + |dy|`,
 * under the octagon's 750. So "in-disc ⇒ in-band" holds and every seat below is still the
 * case it claims to be. What it no longer is, is a statement of the shipped SHAPE: it cannot
 * fail a seat that left the disc but stayed in the octagon, and a seat needing that
 * discrimination belongs in `gun-visibility-and-shape.test.ts`, which tests the region
 * directly.
 */
function assertSeatIsInBandAndOffGlass(pos: Vec3, aspect: number, label: string): void {
  const ray = aimDirection(0, 0, aspect)
  expect(
    beamHit(COCKPIT, ray, pos, SIGHTS_BAND_FACTOR * TIE_HIT_RADIUS),
    `${label}: fixture guard — the seat is INSIDE the sights band (so C_PS would set today)`,
  ).not.toBeNull()
  expect(
    inView(pos, aspect),
    `${label}: fixture guard — the seat is OUTSIDE the rendered view pyramid (C_PV clear)`,
  ).toBe(0)
}

describe('sw8-19 — C_PS is gated on C_PV: the ROM cannot set the sights bit for an unseen fighter', () => {
  it('anchors the geometry the seats below are built from', () => {
    // Absolute anchors. Every seat is chosen relative to these, so if one is retuned the
    // failure lands here — naming the cause — instead of scattering across the negatives.
    expect(TIE_HIT_RADIUS, 'the established TIE kill radius').toBe(250)
    expect(SIGHTS_OCTAGON, "the sights octagon, ADDD TMPSIZ twice at WSMAIN.MAC:3920-3923").toBe(3)
    expect(VIEW_NEAR, "the ROM's near clamp, CMPD #10 at WSMAIN.MAC:3825").toBe(0x10)
    expect(VIEW_FAR, "the ROM's far clamp, CMPD #7F00 at WSMAIN.MAC:3827").toBe(0x7f00)
    // The crossover depth below which band-but-off-glass is reachable at all, on the
    // VERTICAL axis — where the octagon reaches 3 × the kill radius. (sw8-27 moved this
    // from 866 to 1299: the retired disc stopped at 2 ×.)
    expect((SIGHTS_OCTAGON * TIE_HIT_RADIUS) / TAN_HALF).toBeCloseTo(1299.0, 1)
    // NOT a behavioural anchor, and it must not be read as one: since sw8-27 nothing in
    // `src/` consumes `SIGHTS_BAND_FACTOR`. It survives as the docstring statement of the
    // cabinet's unit-free 3 ÷ 1.5 ratio, so what is pinned here is that ARITHMETIC — the
    // two octagon thresholds still stand in the ratio the constant claims — and not any
    // region the game tests a fighter against.
    expect(SIGHTS_OCTAGON / 1.5, 'the ROM doubling, 3·TMPSIZ over 1.5·TMPSIZ').toBe(SIGHTS_BAND_FACTOR)
  })

  it("the NEAR-clamp exit (LBLE RTS1, :3826): the filing's own worked example", () => {
    // A TIE at [400, 0, -10]: 400 u off the aim ray, inside the sights band on that axis
    // (750 u since sw8-27, and 500 before it, so the seat reads the same either way), so the
    // beam test passes — while its view depth of 10 is under VIEW_NEAR (0x10 = 16), so the
    // cabinet would have returned at :3826 and never reached :3930.
    const seat: Vec3 = [400, 0, -10]
    assertSeatIsInBandAndOffGlass(seat, 16 / 9, 'near-clamp seat')
    expect(
      sights(seat, 16 / 9),
      'the ROM returns at :3826 before CHSET C$PV, so C$PS is unreachable for this object',
    ).toBe(0)
  })

  it('a RATIO exit (LBHS RTS1, :3836/:3842): off the pyramid edge at depth 800, nowhere near collision', () => {
    // The non-degenerate case the filing does not have. This fighter is a hair outside the
    // pyramid's vertical bound (800 · tan30° = 461.9) and ~925 u from the cockpit — 3.7 ×
    // its own kill radius — so "it is about to collide anyway" does not apply.
    const seat: Vec3 = [0, 462.3, -800]
    assertSeatIsInBandAndOffGlass(seat, 16 / 9, 'vertical-edge seat')
    const range = Math.hypot(seat[0], seat[1], seat[2])
    expect(range / TIE_HIT_RADIUS, 'this seat is far outside collision range').toBeGreaterThan(3)
    expect(sights(seat, 16 / 9), 'off the glass ⇒ no sights bit').toBe(0)
  })

  it('the OTHER ratio exit: off the pyramid edge laterally at 16:9, depth 400', () => {
    // The two ratio tests are separate exits in the ROM (:3836 and :3842) and separate
    // terms in the port, so a fix that gates on only one of them survives the seat above.
    const seat: Vec3 = [450, 0, -400]
    assertSeatIsInBandAndOffGlass(seat, 16 / 9, 'lateral-edge seat')
    expect(sights(seat, 16 / 9), 'off the glass laterally ⇒ no sights bit').toBe(0)
  })

  it('follows the REAL viewport: one seat, two canvases, opposite answers', () => {
    // The strongest single discriminator in this file, and the one a hard-coded cone
    // cannot pass. `hBound = depth · tan(FOV_Y/2) · aspect`, so at depth 800 the lateral
    // bound is 461.9 on a square canvas and 821.1 at 16:9. A TIE at x = 480 is therefore
    // OFF the glass at 1:1 and ON it at 16:9 — while sitting inside the sights band at
    // both, so the sights band alone cannot explain the difference.
    const seat: Vec3 = [480, 0, -800]

    assertSeatIsInBandAndOffGlass(seat, 1, 'square-canvas seat')
    expect(sights(seat, 1), 'square canvas: the fighter is off the glass, so no sights bit').toBe(0)

    // The positive half of the same pair — this is what makes the negative meaningful
    // rather than "C_PS never sets at this position".
    expect(inView(seat, 16 / 9), 'at 16:9 the very same seat IS on the glass').toBe(Status.C_PV)
    expect(
      sights(seat, 16 / 9),
      'at 16:9 the fighter is visible and in the band, so the sights bit stands',
    ).toBe(Status.C_PS)
  })

  it('holds as a UNIVERSAL across depth, offset and canvas shape — C_PS ⇒ C_PV', () => {
    // The law itself, swept rather than sampled. Both counters are asserted non-zero
    // afterwards: without them a derivation that killed C_PS outright would sail through
    // every implication in the sweep, since a false antecedent proves anything.
    let sighted = 0
    let inBandOffGlass = 0
    for (const aspect of [1, 4 / 3, 16 / 9, 21 / 9]) {
      for (const depth of [20, 100, 400, 800, 1500, 6000, 20000]) {
        for (const lat of [0, 120, 300, 460, 480, 700]) {
          for (const vert of [0, 300, 480]) {
            const pos: Vec3 = [lat, vert, -depth]
            const st = statusAt(pos, aspect)
            const ps = st & Status.C_PS
            const pv = st & Status.C_PV
            if (ps) {
              sighted++
              expect(
                pv,
                `C_PS set at aspect ${aspect.toFixed(3)}, depth ${depth}, lat ${lat}, vert ${vert} — but C_PV clear`,
              ).toBe(Status.C_PV)
            }
            const ray = aimDirection(0, 0, aspect)
            if (!pv && beamHit(COCKPIT, ray, pos, SIGHTS_BAND_FACTOR * TIE_HIT_RADIUS) !== null) {
              inBandOffGlass++
            }
          }
        }
      }
    }
    expect(sighted, 'positive control: the sweep DID contain sighted fighters').toBeGreaterThan(0)
    expect(
      inBandOffGlass,
      'positive control: the sweep DID contain in-band, off-glass seats — the case under test',
    ).toBeGreaterThan(0)
  })
})

describe('sw8-19 — the gate must not cost anything it was not asked to change', () => {
  it('leaves a visible fighter in the band fully sighted (the positive control)', () => {
    // The whole suite above is negatives. If a fix simply stopped deriving C_PS, every one
    // of them would pass. This is the assertion that forbids it.
    const s = makeSpaceState()
    const onRay: Vec3 = [0, 0, -6000]
    expect(inView(onRay, 16 / 9), 'dead ahead at 6000 is plainly on the glass').toBe(Status.C_PV)
    expect(sights(onRay, 16 / 9), 'and therefore still in the sights').toBe(Status.C_PS)
    // Inside the band but off the ray, still well within the pyramid at this depth.
    const offset: Vec3 = [SIGHTS_BAND_FACTOR * TIE_HIT_RADIUS - 1, 0, -6000]
    expect(sights(offset, 16 / 9), 'one unit inside the band, and visible').toBe(Status.C_PS)
    expect(s.aspect, 'a fresh state is square until the shell says otherwise').toBe(1)
  })

  it('does NOT change the GUN — beamHit still has no view test', () => {
    // Kills the tempting wrong fix by name. Clamping `beamHit` to the frustum would make
    // every negative above pass, and would silently move the player's laser: the gun is
    // hitscan and its reach is the doctrine gameRules.ts states. The ROM does not gate the
    // HIT on visibility either — the laser block at WSMAIN.MAC:3898-3918 sits under the same
    // C$PV exits, so the cabinet expresses that gate once, structurally, and never inside its
    // hit test. C_PS is what moves; `beamHit` is not.
    //
    // (The citation above is spelled with its filename deliberately. Written bare as
    // `:3898-3918` the comment-citation guard binds it to the nearest preceding filename —
    // `gameRules.ts`, 272 lines — and reports a span out of range. That is sw8-25's
    // association defect reproduced by accident while writing this file, and the
    // documented spelling is what avoids it.)
    const ray = aimDirection(0, 0, 16 / 9)
    const offGlass: Vec3 = [0, 462.3, -800]
    expect(inView(offGlass, 16 / 9), 'fixture guard: this seat is off the glass').toBe(0)
    expect(
      beamHit(COCKPIT, ray, offGlass, SIGHTS_BAND_FACTOR * TIE_HIT_RADIUS),
      'beamHit still reports the off-glass target — the gate belongs to C_PS, not to the ray',
    ).not.toBeNull()

    // A closer seat, off the glass AND inside the kill radius. This is the one that shows
    // the gate is not being smuggled into the ray: at depth 400 the pyramid's vertical
    // bound is 230.9, so vert 240 is off-screen while sitting 240 u from the ray — inside
    // TIE_HIT_RADIUS. A view clamp added to `beamHit` would silently change what the player
    // can shoot in the phases that still call it: the surface turrets (`sim.ts:1137`) and
    // the trench's exhaust port and obstacles (`:1366`, `:1382`). The cabinet gates none of
    // those — `GRLZCL` runs unconditionally straight after `BJGDRW` (WSGRND.MAC:978-979).
    //
    // (CITATION HISTORY, and it is worth keeping because both of this story's attempts at it
    // were wrong in instructive ways. It began as `sim.ts:535`, went stale by +11 when
    // sw8-19's finish chore inserted a comment block at `sim.ts:168`, and sw8-27 re-anchored
    // it to `:546` — a number measured against the PRE-story file, which the story's own
    // +43-line insertion then invalidated in the same commit. `:546` now lands on
    // `const darthScored = new Set<number>()`. The mechanical +9 shift would have been right
    // where the hand-measured number was not, which is the lesson: an AC that hard-codes a
    // line into a story that GROWS the file is a booby trap, because the AC is written before
    // the insertion exists. Neither number was ever reported by the comment-citation guard —
    // with no verbatim quote adjacent it range-checks only, and every one of 535, 544 and 546
    // was a valid line — so this citation sat in neither the guard's 29 nor sw8-24's sweep.
    // Anchored on SYMBOLS above rather than on a third line number.)
    //
    // WHAT THIS ASSERTION PINS, RESTATED FOR THE POST-sw8-27 TREE. It is not retired, and
    // sw8-27's AC3 is why: the space arm resolves its own hits through `spaceSiteHit`
    // (`sim.ts:589` for fighters, `:597` for fireballs) and no longer calls `beamHit` at all,
    // so this direct `beamHit` probe is now the ONLY thing standing between the shared helper
    // and a well-meant "just clamp it in one place" refactor. It stays green precisely because
    // it calls the helper directly.
    const killableOffGlass: Vec3 = [0, 240, -400]
    expect(inView(killableOffGlass, 16 / 9), 'fixture guard: also off the glass').toBe(0)
    expect(
      beamHit(COCKPIT, ray, killableOffGlass, TIE_HIT_RADIUS),
      'the kill radius still resolves off-glass — this story does not touch the gun',
    ).not.toBeNull()
  })

  it('NARROWING THE BAND IS NOT THE FIX: a seat only the full 3× octagon reaches stays sighted', () => {
    // The other tempting wrong fix for this story: shrink the sights band until the reported
    // off-glass seats stop reproducing. That trades the cabinet's region for a tuned number
    // and silently retunes the loiter break TCH1DZ hangs off C_PS.
    //
    // REWRITTEN AT sw8-27's REWORK, because the version that stood here could not do its job
    // and said it could. It was titled "keeps the band at exactly twice the kill radius", it
    // asserted `SIGHTS_BAND_FACTOR === 2`, and it seated a TIE at dx 251. MEASURED: halving
    // the shipped band — `SIGHTS_OCTAGON` 3 → 1.5, so the axis bound drops 750 → 375 — left
    // it GREEN, because 251 clears 375 as comfortably as it clears 750. It was pinning a
    // constant that, since AC6, nothing in `src/` reads: mutating `SIGHTS_BAND_FACTOR` 2 → 1
    // reddens only self-assertions on itself. A title claiming a property the test cannot
    // fail is worse than no test, because it invites deleting the ones doing the real work.
    //
    // The seat therefore has to sit in the SHELL between the two bands. At depth 6000 on
    // 16:9 the glass reaches 6158 laterally, so dx 700 is comfortably drawn — and 700 is
    // inside the shipped axis bound of 3 × 250 = 750 while being far outside 1.5 × 250 = 375.
    //
    // VERBATIM MUTANT this kills, applied to `tie-status.ts`:
    //   export const SIGHTS_OCTAGON = 1.5
    const inTheOuterBand: Vec3 = [700, 0, -6000]
    expect(inView(inTheOuterBand, 16 / 9), 'fixture guard: this seat is ON the glass').toBe(Status.C_PV)
    expect(700, 'fixture guard: outside a HALVED band, so halving the octagon reddens this').toBeGreaterThan(
      1.5 * TIE_HIT_RADIUS,
    )
    expect(700, 'fixture guard: inside the shipped band, so it is sighted today').toBeLessThanOrEqual(
      SIGHTS_OCTAGON * TIE_HIT_RADIUS,
    )
    expect(
      sights(inTheOuterBand, 16 / 9),
      'well outside the kill radius but inside the ROM warning octagon, and visible',
    ).toBe(Status.C_PS)
  })

  it('records that the FAR exit (:3828) is unreachable in space rather than leaving it untested', () => {
    // There is no seat to write for the far clamp: view depth never exceeds VIEW_FAR, so
    // asserting the ordering is the honest substitute — if a constant moves, this says so
    // instead of a missing test quietly implying the case was covered.
    //
    // The BOUND that makes it unreachable is the play cube, not the spawn depth. A TIE
    // spawns at 0x7C00 but then flies, and `sim.ts` re-clamps every enemy every step
    // (`clampToPlayCube`), so the reachable extreme is |PLAY_CUBE_MIN| = 32,000 — which is
    // what has to stay under VIEW_FAR (32,512; margin 512). Pinning only the spawn depth
    // was mutation-PASSABLE: the sw8-19 Reviewer set PLAY_CUBE_MIN = -33000, making depth
    // 33,000 reachable and the far exit live, and all 2252 tests stayed green including
    // this one. The play-cube assertion below is the guard; the spawn pin is kept as a
    // second anchor because it is the depth every fixture in this suite is chosen against.
    expect(VIEW_FAR, 'the reachable extreme of the play cube stays inside the far clamp').toBeGreaterThan(
      Math.abs(PLAY_CUBE_MIN),
    )
    expect(VIEW_FAR).toBeGreaterThan(PLAY_CUBE_MAX)
    expect(TIE_SPAWN_DISTANCE, 'TBG* spawn depth').toBe(0x7c00)
    expect(VIEW_FAR).toBeGreaterThan(TIE_SPAWN_DISTANCE)
  })
})

describe('sw8-19 — in play: the shipped loiter fixture never sights an off-glass fighter', () => {
  /** Index of the program's only `.CIF C$PS` (WSCPU.MAC:1646), located structurally. */
  function sightsBranch(): number {
    const hits: number[] = []
    program.forEach((instr, i) => {
      if (instr.op === ChoreoOp.IF && instr.mask === Status.C_PS) hits.push(i)
    })
    expect(hits, 'exactly one .CIF C$PS in the assembled program').toHaveLength(1)
    return hits[0]
  }

  /** The yoke that puts the crosshair on a world point, clamped to real ±1 travel —
   *  the same inversion `tie-loiter-sights.test.ts` flies this fixture with. */
  function aimAt(pos: Vec3): { aimX: number; aimY: number } {
    const f = 1 / Math.tan(FOV_Y / 2)
    const dz = pos[2] - COCKPIT[2]
    if (dz >= 0) return { aimX: 0, aimY: 0 }
    const c = (v: number) => Math.max(-1, Math.min(1, v))
    return { aimX: c((f * (pos[0] - COCKPIT[0])) / -dz), aimY: c((f * (pos[1] - COCKPIT[1])) / -dz) }
  }

  it('flies the uf1-12 seat and counts frames where the sights bit outlives visibility', () => {
    // Synthetic seats prove transcription; this proves the bit is wrong in ORDINARY PLAY.
    // The fixture is not invented for this story — it is the seat uf1-12 shipped and
    // uf1-15 re-measured, flown exactly as its own suite flies it.
    // Narrow with a throw rather than an `expect`: a matcher does not narrow the union
    // for tsc, and `ChoreoInstr` only carries `target` on the GOTO arm.
    const target = program[sightsBranch() + 1]
    if (target.op !== ChoreoOp.GOTO) throw new Error('tie-vm: .CIF C$PS is not followed by a .CGOTO')
    const entry = target.target
    const seat: Vec3 = [4000, 0, -6000]

    let s: GameState = {
      ...initialState(1983),
      enemies: [makeTie({ pos: [...seat] as Vec3, orient: lookAtOrigin(seat), vm: initVm(choreoPc('1DZ')) })],
      spawnTimer: 1e9,
      lives: 999,
    }

    let offGlassSighted = 0
    let visibleSighted = 0
    let enteredTwenty = false
    let frames = 0
    for (let i = 0; i < 900; i++) {
      const e = s.enemies[0]
      if (!e) break
      frames++
      const aim = aimAt(e.pos)
      const st = computeStatus(e, { ...s, ...aim }, rngSeed(1))
      if (st & Status.C_PS) {
        if (st & Status.C_PV) visibleSighted++
        else offGlassSighted++
      }
      s = stepGame(s, { ...aim, fire: false }, TICK_DT)
      const pc = s.enemies[0]?.vm?.pc
      if (pc !== undefined && pc > entry && pc <= entry + 6) enteredTwenty = true
    }

    // Positive controls FIRST, so a run that stopped flying — or a derivation that killed
    // C_PS outright — fails here and cannot be mistaken for the fix working.
    expect(frames, 'the fixture actually flew').toBeGreaterThan(100)
    expect(
      visibleSighted,
      'positive control: the fighter IS sighted while visible on plenty of frames',
    ).toBeGreaterThan(0)
    expect(
      enteredTwenty,
      'positive control: held in the sights, the loiter loop still breaks into 20$ (uf1-12)',
    ).toBe(true)

    // The story. Measured at 30 before the gate lands.
    expect(
      offGlassSighted,
      'no frame may carry C_PS for a fighter the player cannot see',
    ).toBe(0)
  })
})

describe('sw8-19 — the comment must state the gate the ROM actually has', () => {
  const flat = (p: string) => readFileSync(p, 'utf8').replace(/\s+/g, ' ')
  const core = flat(join(repoRoot, 'src', 'core', 'tie-status.ts'))
  const suite = flat(join(repoRoot, 'tests', 'core', 'tie-sights-status.test.ts'))

  it('names C_PV as the gate and cites the RTS1 exits that make :3930 unreachable', () => {
    // Load-bearing first: the code must really carry the gate, or the prose checks below
    // pass on a file that only had its comment rewritten.
    expect(
      readFileSync(join(repoRoot, 'src', 'core', 'tie-status.ts'), 'utf8'),
      'the C_PS derivation is gated on C_PV',
    ).toMatch(/C_PV[\s\S]{0,200}Status\.C_PS|Status\.C_PS[\s\S]{0,200}C_PV/)
    // The four exits are the evidence for the gate. Vendored ROM source is immutable, so
    // unlike an in-repo citation these spans cannot rot.
    for (const line of ['3826', '3828', '3836', '3842']) {
      expect(core, `the comment cites the RTS1 exit at WSMAIN.MAC:${line}`).toMatch(
        new RegExp(`\\b${line}\\b`),
      )
    }
    expect(core, 'and names the routine those exits leave').toMatch(/S2VW|RTS1/)
  })

  it('no longer offers beamHit as the "must be drawn" gate — in EITHER file', () => {
    // The understatement this story corrects exists in two places, stated the same way:
    // `tie-status.ts` ("the 'must be drawn' gate the CHSET inherits from sitting in the
    // draw pass is `beamHit` refusing anything behind the gun") and the header of
    // `tie-sights-status.test.ts`, which says it "comes free from `beamHit`". Fixing one
    // copy and leaving the other is how a corrected claim goes on being wrong in the tree.
    for (const [name, text] of [['tie-status.ts', core], ['tie-sights-status.test.ts', suite]] as const) {
      for (const m of text.matchAll(/must be drawn|comes free from|inherits from sitting/gi)) {
        const at = m.index ?? 0
        const window = text.slice(Math.max(0, at - 260), at + 260)
        expect(
          window,
          `${name}: "${m[0]}" must no longer name beamHit as the visibility gate`,
        ).not.toMatch(/beamHit/)
      }
    }
  })

  it('still describes beamHit truthfully — a separate, weaker guard that survives', () => {
    // Not a licence to delete the sentence: `beamHit`'s behind-the-gun refusal is real and
    // still runs. It is simply not the ported gate.
    expect(core, 'beamHit is still documented').toMatch(/beamHit/)
    expect(core, 'and so is what it actually refuses').toMatch(/behind the gun/i)
  })
})
