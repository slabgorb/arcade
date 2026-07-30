// tests/core/tie-loiter-sights.test.ts
//
// uf1-12 — TCH1DZ, the D-group loiter loop, and its C$PS branch (WSCPU.MAC:1628-1656).
//
// TCH1DZ ("BE MEAN TO PLAYER") is where every D fighter — Darth included — ends up.
// The cabinet's own source shows Atari ENABLING its second half by commenting out the
// loop-back that used to sit at :1638:
//
//     TCH1DZ:              ;BE MEAN  TO PLAYER
//     10$:  .CT 10,0,C$MU2 / .CUNTIL C$PN
//           .CT 40,C$RL+C$T0,C$MF2 / .CUNTIL C$AS+C$AG
//           .CT 20,C$RR+C$T0,C$MF2 / .CUNTIL C$AG
//           .CT 20,C$RL,C$MF / .CUNTIL 0
//     ;;;   .CGOTO 10$                        ← commented out: fall into the C$PS half
//           .CUNTIL C$PN+C$PS                 :1639
//           .CT 40,C$RL+C$T0,C$MF2 / .CUNTIL C$AS+C$AG+C$PS      :1641
//           .CT 20,C$RR+C$T0,C$MF2 / .CUNTIL C$AG+C$PS           :1643
//           .CT 20,C$RL,C$MF / .CUNTIL 0
//           .CIF C$PS / .CGOTO 20$            :1646  ← the two-way branch
//           .CIF 0    / .CGOTO 10$
//     20$:  .CIF C$R1 / .CT 20,C$RR,C$MU2 / .CGOTO 10$
//           .CIF 0    / .CT 20,C$RL,C$MF2 / .CGOTO 10$
//
// The clone ports all of it (tie-vm.ts:340-344) — but with C_PS pinned false by an
// unwired `computeStatus`, the branch at :1646 can only ever take its `.CIF 0` arm.
// 20$ is dead ported code, and the three gates above it hold to their C$PN/C$AS/C$AG
// partners alone, so a loitering fighter keeps weaving while the player's crosshair
// is on it instead of breaking away.
//
// These tests locate the branch STRUCTURALLY (the program's only IF on C_PS) rather
// than by a hard-coded index, so they keep pointing at the right instruction if the
// script tables are ever re-laid-out.
//
// RED until computeStatus derives C_PS.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { stepGame } from '../../src/core/sim'
import { ChoreoOp, Status, Twist, Move, initVm, program, tickChoreo, ctFrames } from '../../src/core/tie-vm'
import { choreoPc } from '../../src/core/tie-waves'
import { COCKPIT, FOV_Y, aimDirection, beamHit } from '../../src/core/gameRules'
import { initialState, TICK_HZ, TIE_HIT_RADIUS, type GameState } from '../../src/core/state'
import { add, scale, type Vec3 } from '@shared/math3d'
import { makeTie, lookAtOrigin } from './helpers/space'

const TICK_DT = 1 / TICK_HZ
const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** Index of the TCH1DZ two-way branch — the program's ONLY `.CIF C$PS` (WSCPU.MAC:1646). */
function sightsBranch(): number {
  const hits: number[] = []
  program.forEach((instr, i) => {
    if (instr.op === ChoreoOp.IF && instr.mask === Status.C_PS) hits.push(i)
  })
  expect(hits, 'the assembled program holds exactly one .CIF C$PS (WSCPU.MAC:1646)').toHaveLength(1)
  return hits[0]
}

/** Entry index of 20$, read off the branch's own GOTO rather than a hard-coded label. */
function tch1dz20(): number {
  const target = program[sightsBranch() + 1]
  if (target.op !== ChoreoOp.GOTO) throw new Error('tie-vm: .CIF C$PS is not followed by a .CGOTO')
  return target.target
}

/** Run one tick from a VM parked on `pc` with nothing armed and nothing running. */
const tickFrom = (pc: number, status: number) => tickChoreo({ ...initVm(pc) }, program, status)

describe('uf1-12 — TCH1DZ_20 reachability: the C_PS branch (WSCPU.MAC:1646-1656)', () => {
  it('takes the 20$ arm when C_PS is set, not the .CIF 0 fallthrough', () => {
    // 20$'s first arm is `.CIF C$R1 / .CT 20,C$RR,C$MU2` — a RIGHT roll climbing on
    // MU2, found nowhere else at this branch. The fallthrough re-enters TCH1DZ at
    // `.CT 10,0,C$MU2`: no twist at all, and a shorter countdown. The two arms are
    // distinguishable on both axes, so neither assertion can pass by accident.
    const taken = tickFrom(sightsBranch(), Status.C_PS | Status.C_R1)
    expect(taken.twist, '20$ first arm: .CT 20,C$RR,C$MU2').toBe(Twist.ROLL_R)
    expect(taken.move).toBe(Move.UP2)
    expect(taken.waitFrames).toBe(ctFrames(0x20))
  })

  it('takes 20$\'s SECOND arm when C_PS is set and C_R1 is not (.CIF 0 / .CT 20,C$RL,C$MF2)', () => {
    const taken = tickFrom(sightsBranch(), Status.C_PS)
    expect(taken.twist).toBe(Twist.ROLL_L)
    expect(taken.move).toBe(Move.FWD2)
    expect(taken.waitFrames).toBe(ctFrames(0x20))
  })

  it('falls through to `.CIF 0 / .CGOTO 10$` when C_PS is clear — the loiter loop repeats', () => {
    const fell = tickFrom(sightsBranch(), 0)
    expect(fell.twist, 'TCH1DZ re-entry: .CT 10,0,C$MU2 has no twist').toBe(0)
    expect(fell.move).toBe(Move.UP2)
    expect(fell.waitFrames).toBe(ctFrames(0x10))
  })

  it('lands inside the 20$ body, not merely on some different instruction', () => {
    // Guards the arms above against a coincidental twist match somewhere else: the
    // taken branch must leave the PC physically within 20$'s six records.
    const entry = tch1dz20()
    const taken = tickFrom(sightsBranch(), Status.C_PS | Status.C_R1)
    expect(taken.pc).toBeGreaterThan(entry)
    expect(taken.pc).toBeLessThanOrEqual(entry + 6)
  })
})

describe('uf1-12 — the three C_PS-bearing CUNTIL gates (WSCPU.MAC:1639,1641,1643)', () => {
  // Each of these gates was ported with two release conditions; with C_PS dead, only
  // one of them can ever fire. C_PS ALONE must release each.
  const gates: ReadonlyArray<[string, number]> = [
    ['.CUNTIL C$PN+C$PS (:1639)', Status.C_PN | Status.C_PS],
    ['.CUNTIL C$AS+C$AG+C$PS (:1641)', Status.C_AS | Status.C_AG | Status.C_PS],
    ['.CUNTIL C$AG+C$PS (:1643)', Status.C_AG | Status.C_PS],
  ]

  /** Where each gate actually sits in the assembled program. Each mask carries C_PS,
   *  which only TCH1DZ uses, so each is unique — asserted rather than assumed. */
  function gateIndex(label: string, mask: number): number {
    const hits: number[] = []
    program.forEach((instr, i) => {
      if (instr.op === 'until' && instr.mask === mask) hits.push(i)
    })
    expect(hits, `${label} appears exactly once in the assembled program`).toHaveLength(1)
    return hits[0]
  }

  it('assembles all three gates with C_PS in their mask', () => {
    for (const [label, mask] of gates) {
      expect(mask & Status.C_PS, `${label} carries C_PS`).toBe(Status.C_PS)
      expect(gateIndex(label, mask)).toBeGreaterThanOrEqual(0)
    }
  })

  it('releases a running maneuver on C_PS alone, with every partner bit clear', () => {
    for (const [label, mask] of gates) {
      // Arm the gate the way the script does: tick onto it, which loads the mask and
      // starts the maneuver that follows (CHCN.D → CHTW.D).
      const armed = tickChoreo(initVm(gateIndex(label, mask)), program, 0)
      expect(armed.untilMask, `${label} armed`).toBe(mask)
      expect(armed.waitFrames, `${label} started its maneuver`).toBeGreaterThan(0)

      // C_PS up, every partner bit down. The gate must fire: CHCN.E abandons the
      // running maneuver and skips to the next control record (which re-arms with
      // ITS mask — firing is a move forward, not a clear to zero).
      const released = tickChoreo(armed, program, Status.C_PS)
      // Nothing set at all: the maneuver just counts down in place.
      const held = tickChoreo(armed, program, 0)

      expect(held.untilMask, `${label} still holds when nothing is set`).toBe(mask)
      expect(held.waitFrames, `${label} merely ticks down`).toBe(armed.waitFrames - 1)
      expect(released.pc, `${label} moves the PC on when C_PS fires`).not.toBe(held.pc)
      expect(released.waitFrames, `${label} abandons the running maneuver`).not.toBe(
        armed.waitFrames - 1,
      )
    }
  })
})

describe('uf1-12 — in play: a fighter held under the crosshair breaks into 20$', () => {
  /** The yoke that puts the crosshair on a world point, clamped to the real ±1 travel. */
  function aimAt(pos: Vec3): { aimX: number; aimY: number } {
    const eye = COCKPIT
    const f = 1 / Math.tan(FOV_Y / 2)
    const dz = pos[2] - eye[2]
    if (dz >= 0) return { aimX: 0, aimY: 0 } // behind the eye: the yoke cannot point there
    const clamp = (v: number) => Math.max(-1, Math.min(1, v))
    return { aimX: clamp((f * (pos[0] - eye[0])) / -dz), aimY: clamp((f * (pos[1] - eye[1])) / -dz) }
  }

  it('reaches TCH1DZ_20 while the player keeps it in the sights, and never does when the yoke is parked', () => {
    const entry = tch1dz20()
    // RE-SEATED by sw8-8 (which landed days after uf1-12). This fighter used to sit at
    // [0, 0, -6000] — dead ahead — and the parked-yoke half passed only because the eye was
    // the DRIFTING `spaceEye`, off to one side, so the centred ray missed an origin-seated
    // target. With the pilot back at the cockpit that is no longer true, and it is not a
    // fixture quirk: a fighter beelining the cockpit is in the parked crosshair BY
    // CONSTRUCTION, because the crosshair and the fighters' target are now the same point.
    // Measured: at 1,500 and 3,000 lateral the loiter weave still carries it into the parked
    // band inside 900 frames. At 6,000 (45 deg off at this depth, the edge of the C_PV
    // pyramid) it stays wide, so the yoke is what brings it in — which is the property this
    // test is actually about.
    const seat: Vec3 = [6000, 0, -6000]

    /** Fly the loiter script for `frames`, tracking the fighter with the yoke (or not),
     *  and report whether the VM ever entered 20$. */
    const run = (track: boolean, frames: number): boolean => {
      let s: GameState = {
        ...initialState(1983),
        enemies: [makeTie({ pos: [...seat] as Vec3, orient: lookAtOrigin(seat), vm: initVm(choreoPc('1DZ')) })],
        spawnTimer: 1e9,
        lives: 999,
      }
      let entered = false
      for (let i = 0; i < frames; i++) {
        const e = s.enemies[0]
        if (!e) break // the fighter left the field — the run is over
        const aim = track ? aimAt(e.pos) : { aimX: 0, aimY: 0 }
        s = stepGame(s, { ...aim, fire: false }, TICK_DT)
        const pc = s.enemies[0]?.vm?.pc
        if (pc !== undefined && pc > entry && pc <= entry + 6) entered = true
      }
      return entered
    }

    expect(run(true, 900), 'held in the sights, the loiter loop breaks into 20$').toBe(true)
    expect(
      run(false, 900),
      'with the yoke parked and the fighter off the crosshair, 20$ stays unvisited',
    ).toBe(false)
  })
})

describe('uf1-12 — AC-6: the shell viewport reaches the pure core', () => {
  it('carries Input.aspect onto the state each step, defaulting to square', () => {
    // The plumbing AC-6 rests on, pinned end-to-end rather than at the seam: whatever
    // `computeStatus` reads has to be what the shell actually sampled this frame,
    // otherwise the sights bit and the gun diverge exactly as measured (539 u at yoke
    // 0.2 on 16:9, against a 500 u band).
    const base: GameState = { ...initialState(1983), enemies: [], spawnTimer: 1e9, lives: 999 }
    const wide = stepGame(base, { aimX: 0.4, aimY: 0, fire: false, aspect: 16 / 9 }, TICK_DT)
    expect(wide.aspect, "the shell's viewport reaches the core").toBe(16 / 9)
    // Optional on Input (input.ts) — a frame that omits it must not poison the state.
    const square = stepGame(wide, { aimX: 0.4, aimY: 0, fire: false }, TICK_DT)
    expect(square.aspect, 'an omitted aspect falls back to square, never to NaN').toBe(1)
  })

  it('derives C_PS from THIS frame\'s yoke, not last frame\'s — a single-frame flick counts', () => {
    // Regression pin for the uf1-12 review (F2). The gun fires down `input`
    // (sim.ts: `aimDirection(aimX, aimY, input.aspect)` with `aimX = input.aimX`), so a
    // sights bit read off the INCOMING state's aim is one frame stale and the two rays
    // separate by 613 u on a one-frame flick of 0.1 — against a 500 u band. The cabinet
    // cannot do that: the laser hit (1.5x TMPSIZ, WSMAIN.MAC:3906) and the sights bit
    // (3x TMPSIZ, :3922) are computed twelve lines apart from ONE TMPOCT, off one
    // LZ.CX/LZ.CY sample. So `stepGame` shadows the frame's yoke onto the state.
    //
    // The discriminator is the branch itself: seat the VM ON the `.CIF C$PS` and step ONE
    // frame with the yoke JUMPING from parked onto a fighter thousands of units off the
    // at-rest ray. Derived from this frame's aim the VM enters 20$; from the stale aim it
    // takes the `.CIF 0` arm back into TCH1DZ.
    //
    // The flick is DIAGONAL on purpose (round-2 review, F6). `aspect` multiplies only the X
    // term, so an X-only flick guards the aspect but leaves the VERTICAL half of the
    // plumbing untested — measured: dropping `aimY` from the shadow passed all 25 tests
    // while dropping `aimX` reddened. On a diagonal, dropping EITHER component swings the
    // ray off the band, so one fixture kills both partial mutations.
    const entry = tch1dz20()
    const flickX = 0.4
    const flickY = 0.3
    const parked: GameState = { ...initialState(1983), spawnTimer: 1e9, lives: 999 }
    // The eye `computeStatus` reads is the COCKPIT — the same point the gun's `beamOrigin`
    // uses, and no longer a `state.frame` derivation (sw8-8 retired the moving eye, which
    // landed days after uf1-12 wrote this). Build the fixture from exactly that.
    const eye = COCKPIT
    const pos = add(eye, scale(aimDirection(flickX, flickY), 6000)) as Vec3

    // Fixture guard: parked, this fighter is nowhere near the sights band.
    expect(
      beamHit(eye, aimDirection(parked.aimX, parked.aimY), pos, 2 * TIE_HIT_RADIUS),
      'with the yoke parked the fighter is outside the band — the flick is what brings it in',
    ).toBeNull()
    // Both axes, since the flick is diagonal: if the incoming state were already deflected
    // on either one, that component would stop discriminating fresh aim from stale.
    expect(
      [parked.aimX, parked.aimY],
      'fixture guard: the incoming state really is parked on BOTH axes',
    ).toEqual([0, 0])

    const seated: GameState = {
      ...parked,
      enemies: [makeTie({ pos, orient: lookAtOrigin(pos), vm: initVm(sightsBranch()) })],
    }
    const after = stepGame(seated, { aimX: flickX, aimY: flickY, fire: false }, TICK_DT)
    const pc = after.enemies[0]?.vm?.pc
    expect(pc, 'the fighter is still on the field with a live VM').toBeDefined()
    expect(pc, 'the flick is seen on the frame it happens: the VM enters 20$').toBeGreaterThan(entry)
    expect(pc).toBeLessThanOrEqual(entry + 6)
  })
})

describe('uf1-12 — AC-5: the tie-status.ts scope note no longer misreports C_PS', () => {
  const source = readFileSync(join(repoRoot, 'src', 'core', 'tie-status.ts'), 'utf8')
  const flat = source.replace(/\s+/g, ' ')

  it('no longer says C_PS is out of scope — the next sweep must not re-file it', () => {
    // The load-bearing half: the file must actually DERIVE the bit. Without this the
    // scan below would pass vacuously on a file that simply deleted the scope note.
    expect(source, 'computeStatus sets C_PS').toMatch(/status\s*\|=\s*Status\.C_PS/)
    // And no surviving scope note may still describe C_PS as pending. Zero matches is
    // a fine outcome — the requirement is that none of them are ABOUT C_PS.
    const claims = /out of scope|until a consumer needs|not derived|unported|stays? out\b/gi
    for (const m of flat.matchAll(claims)) {
      const at = m.index ?? 0
      const window = flat.slice(Math.max(0, at - 220), at + 220)
      expect(window, `"${m[0]}" must no longer be said of C_PS`).not.toMatch(/C_PS/)
    }
  })

  it('still records WHY C_AD, C_AV and C_PM are correctly absent', () => {
    // AC-5's second half: these three stay listed with the ROM reason, so a future
    // sweep reads them as deliberate omissions rather than three more gaps.
    for (const bit of ['C_AD', 'C_AV', 'C_PM']) {
      expect(flat, `${bit} stays documented`).toMatch(new RegExp(`\\b${bit}\\b`))
    }
    expect(flat, 'the ROM annotation that settles C_AD').toMatch(/PLEASE DELETE/)
  })

  it('does not merge the two reasons: C_AV and C_PM ARE set by the cabinet', () => {
    // Added by the uf1-12 review (F1). The first version of this header said "neither
    // C_AV nor C_PM has a setter" — false, and the test above cannot see it, because it
    // only checks the NAMES appear. The ROM sets both; only C_AD has zero setters. So pin
    // the two setter lines rather than any wording: a rewrite that drops them reddens, and
    // one that re-asserts "no setter" while citing them contradicts itself in the open.
    expect(flat, 'CHSET C$AV — "ALIEN HAS PLAYER IN FRONT VIEW"').toMatch(/WSCPU\.MAC:613\b/)
    expect(flat, 'CHSET C$PM — "PLAYER MIDDLE DISTANCE"').toMatch(/WSMAIN\.MAC:3780\b/)
    // Guard against the pins going vacuous: the paragraph must still be ABOUT these bits
    // being absent-with-a-reason, not merely mention two line numbers somewhere.
    expect(flat).toMatch(/C_AV[\s\S]{0,400}WSCPU\.MAC:613|WSCPU\.MAC:613[\s\S]{0,400}C_AV/)
  })

  it('documents C_PS against the ROM line that sets it', () => {
    expect(flat).toMatch(/C_PS/)
    expect(flat, 'the sole CHSET C$PS tree-wide').toMatch(/WSMAIN\.MAC:39\d\d/)
  })
})
