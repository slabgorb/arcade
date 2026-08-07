// tests/climb-prep-bounder.test.ts
//
// Story jt9-50 — RED phase (Tyr One-Handed / TEA). The BOUNDER's cliff-above
// divert, the sibling jt9-23 filed and left unbuilt (its Delivery Finding, and
// the note beside its own F3). jt9-23 wired the two climb-preparation HOLD states
// B2UP3/SHUP3 for the hunter/shadow; the bounder is different in the ROM and gets
// no hold at all:
//
//   BOUNUP  CMPD  BOUPRG        #-DYLEN   LONG OR SHORT RANGE SEEK   (:3844)
//           BGT   BOLEV          BR=SHORT RANGE SEEK                  (:3845)
//   BOUP    LDX   PPOSX,U       CLIFF IN THE WAY??                    (:3846)
//           LDY   PPOSY,U                                             (:3847)
//           LDA   BCKXTB,X                                            (:3848)
//           ANDA  BCKYTB-DYLEN,Y                                      (:3849)
//           BNE   BOLEV          BR=YES  -> cliff above -> fly LEVEL  (:3850)
//           LDD   BOUPDI        #DYLEN*256  NO, SET DISTANCE TO GO UP (:3851)
//           STD   PDIST,U                                             (:3852)
//           BRA   BOUP1A                 -> clear -> commit the climb (:3853)
//
// On a solid vertical sample one DYLEN above the bird, the bounder diverts to
// PLAIN BOLEV LEVEL FLIGHT (`BNE BOLEV`, :3850) — NOT a climb, and NOT a
// B2UP3/SHUP3 hold: there is no `BOUP3` label (0 in the file). The port's bounder
// commits to the climb BLIND — it never samples the cell above — so it flaps up
// into a ceiling the ROM never climbs into. This file proves that gap.
//
// ─── REACHABILITY: WHY THIS IS STAGED, NOT PLAYED (uf1-9, jt9-23) ─────────────
// uf1-9 measured the up-seek is entered on ZERO frames of natural play across
// three seeds / 6000 frames (buzzards climb only toward a quarry above them). The
// cliff-above fork sits one level deeper still, so it is driven DIRECTLY: an
// airborne bounder, a far-above quarry to route it onto the up-seek, and a real
// background cliff placed one height-look-up (DYLEN = 14 px) above it.
//
// ─── THE DISTINGUISHING INPUT: velY < 0 (RISING) — READ THIS BEFORE EDITING ────
// The bounder's blind climb and BOLEV level flight are INDISTINGUISHABLE at
// velY = 0, because both flap when velY >= 0 (BOLEV1's `falling?` law, :3926, and
// the up-seek wing cadence which the bounder enters wings-DOWN on the arm wake).
// That is exactly why jt9-23's own F3 control (bare `boundr()` at velY = 0) stays
// GREEN through this story — it cannot see the change, and does not need to.
//
// The states DIVERGE only when the bird is RISING (velY < 0):
//   • the blind climb still flaps — the up-seek wing cadence is not velY-gated for
//     the bounder (`BOUP1` flaps at expiry unconditionally; wingRows.upVy = null);
//   • BOLEV level flight GLIDES — `flap iff velY >= 0` is false while rising.
// So the RED stages the bounder RISING over a cliff and asserts it does NOT flap
// up into it. A second guard stages it FALLING SLOWLY (0 <= velY < 0x40) and
// asserts it DOES flap — proving the divert is BOLEV (falling-gated) and not a
// mis-applied B2UP3 hold (which glides until velY >= 0x40); this complements F3
// from the other direction and is green today and after.
//
// ─── THE FIXTURE DISCIPLINE (jt5-10 / jt8-3 / jt9-23) ─────────────────────────
// The DECIDE runs only when no seek episode is committed, so the fixture arms NO
// seek and lets the state each wake produces ride forward. The inputs that would
// re-route the brain are frozen and RE-APPLIED EVERY WAKE: velY (the chosen sign),
// the horizontal state (velXIndex = 0, so steerWake — a DIFFERENT, horizontal
// cliff look-ahead — never fires), and posX/posY (so the cliff stays exactly one
// DYLEN above for the whole window). Assertions read only `prevFlapHeld`; no new
// field name is named, so the representation stays Dev's design (per jt9-23).

import { describe, it, expect, beforeAll } from 'vitest'
import { loadEnemy, type EnemyModule, type EnemyState, type PlayerView } from './helpers/enemy-contract.js'
import { vendoredAvailable, sourceLines } from './helpers/joust-source.js'
import { BCK_X_TABLE, X_TABLE_ORIGIN } from '../src/core/flight.js'
import { BCK_Y_TABLE } from '../src/core/arena.js'

const SRC = 'JOUSTRV4.SRC'

// ─── The test's own background oracle (same indexing as bckMaskAt; out of range ⇒ 0) ───
const bckX = (x: number): number => {
  const i = x + X_TABLE_ORIGIN
  return i >= 0 && i < BCK_X_TABLE.length ? BCK_X_TABLE[i] : 0
}
const bck = (x: number, y: number): number =>
  y >= 0 && y < BCK_Y_TABLE.length ? bckX(x) & BCK_Y_TABLE[y] : 0

/** DYLEN = B2YLEN = SHYLEN = $14-6 — the height, in pixels, the decide samples ABOVE the bird. */
const YLEN = 0x14 - 6

/**
 * A whole-pixel (x, y) where the bird sits in OPEN AIR but a solid box lies one
 * YLEN ABOVE it (the geometry `BNE BOLEV` reads), plus a CONTROL where the climb
 * is unobstructed. Mid-air band only (above the $D3 lava line, below the ceiling).
 */
function findSites(): { cliff: { x: number; y: number }; clear: { x: number; y: number } } {
  let cliff: { x: number; y: number } | null = null
  let clear: { x: number; y: number } | null = null
  for (let y = 0x30; y <= 0xc0 && (cliff === null || clear === null); y++) {
    for (let x = 0; x <= 255; x++) {
      const here = bck(x, y)
      const above = bck(x, y - YLEN)
      if (here !== 0) continue // bird must be in open air
      if (cliff === null && above !== 0) cliff = { x, y }
      if (clear === null && above === 0) clear = { x, y }
      if (cliff !== null && clear !== null) break
    }
  }
  if (cliff === null) throw new Error('no cliff-above background geometry found in the tables')
  if (clear === null) throw new Error('no open-air control geometry found')
  return { cliff, clear }
}

const FAR_ABOVE: PlayerView = { pixelY: 0x10, velXIndex: 0 }

/** An airborne bounder at (x, y), still, no seek — parked AT the up-seek decide. */
const decideFixture = (x: number, y: number, velY: number): EnemyState => ({
  entity: {
    posX: x,
    posY: y << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY,
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
  },
  brain: 'boundr',
  decision: 'boundr',
  pchase: 1,
  facing: 1,
})

/**
 * Drive `wakes` wakes of the bounder from the up-seek decide with the geometry and
 * velY frozen, and return how many wakes the wings were DOWN (a flap). Position /
 * horizontal state / velY are re-applied every wake; the brain's own state (seek,
 * pjoy, facing) rides forward untouched.
 */
function flapCount(e: EnemyModule, x: number, y: number, velY: number, wave: number, wakes: number): number {
  let enemy = decideFixture(x, y, velY)
  let flaps = 0
  for (let i = 0; i < wakes; i++) {
    const stepped = e.stepEnemyDetailed(enemy, { player: FAR_ABOVE, wave }).enemy
    if (stepped.prevFlapHeld === true) flaps += 1
    enemy = {
      ...stepped,
      entity: { ...stepped.entity, posX: x, posY: y << 8, velY, velXIndex: 0, velXFrac: 0 },
    }
  }
  return flaps
}

const WAVE = 4
const WAKES = 24 // > BOUPWU (wings-up hold) + a full cadence flap, so a real climb WILL flap
const RISING = -0x40 // velY < 0: BOLEV glides here, the blind climb still flaps
const FALLING_SLOW = 0x20 // 0 <= velY < 0x40: BOLEV flaps here, a B2UP3 hold would glide

describe('jt9-50 — the bounder BOUP cliff-above divert (BOLEV level flight, no BOUP3)', () => {
  let e: EnemyModule
  let cliff: { x: number; y: number }
  let clear: { x: number; y: number }

  beforeAll(async () => {
    e = await loadEnemy()
    const sites = findSites()
    cliff = sites.cliff
    clear = sites.clear
  })

  it('FIXTURE PREMISE — the staged geometry really is "open air, cliff one DYLEN above"', () => {
    expect(bck(cliff.x, cliff.y), 'the cliff site: bird in open air').toBe(0)
    expect(bck(cliff.x, cliff.y - YLEN), 'the cliff site: solid box one DYLEN above').not.toBe(0)
    expect(bck(clear.x, clear.y), 'the control site: bird in open air').toBe(0)
    expect(bck(clear.x, clear.y - YLEN), 'the control site: open air above too').toBe(0)
  })

  it('CONTROL (green now and after) — with the climb CLEAR, a rising bounder still climbs (it flaps)', () => {
    // Attribution control: with nothing above it, the bounder's up-seek DOES flap
    // to climb even while rising (its climb flap is not velY-gated). Green today and
    // must stay green — it proves the RED below is the CLIFF suppressing the climb,
    // not a dead fixture, and not merely the RISING sign killing every flap.
    const flaps = flapCount(e, clear.x, clear.y, RISING, WAVE, WAKES)
    expect(flaps, `a rising bounder with a clear climb should flap within ${WAKES} wakes`).toBeGreaterThan(0)
  })

  it('RED — with a cliff ONE DYLEN ABOVE, a rising bounder flies BOLEV level: it must NOT flap up into it', () => {
    // ROM: BOUP samples BCKYTB-DYLEN, hits the box, `BNE BOLEV` (:3850) — plain
    // level flight. BOLEV glides while rising (`flap iff velY >= 0`). The port has
    // no such divert: it commits to the climb and flaps into the cliff. So this
    // reads > 0 today and must read 0.
    const flaps = flapCount(e, cliff.x, cliff.y, RISING, WAVE, WAKES)
    expect(flaps, 'a rising bounder with a cliff above must not flap up into it — it flies BOLEV level').toBe(0)
  })

  it('GUARD (green now and after; RED if the bounder is wrongly given a B2UP3 hold) — falling slowly over a cliff, it still flaps', () => {
    // The divert is to BOLEV — which flaps whenever falling (velY >= 0) — NOT to the
    // B2UP3/SHUP3 hold, which glides until the fall reaches 0x40. At 0x20 the two
    // diverge: BOLEV flaps, the hold does not. This keeps a future tidy from
    // collapsing the bounder into the hunter/shadow hold (there is no BOUP3).
    const flaps = flapCount(e, cliff.x, cliff.y, FALLING_SLOW, WAVE, WAKES)
    expect(flaps, 'over a cliff while falling slowly the bounder flaps (BOLEV), it is not held level (no BOUP3)').toBeGreaterThan(0)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ORACLE — GREEN ON ARRIVAL. Re-derives, from the vendored 1982 source, the exact
// ROM shape this port must implement: BOUP forks on a cliff ABOVE to plain BOLEV
// (not a hold), the offset is the same $14-6 the port already reuses as
// CLIMB_PREP_YLEN, and there is NO BOUP3 label. A joust story has died three
// review rounds on a MISREAD ROM claim (jt8-6); this makes the mechanism a
// measurement, not a paraphrase. skipIf(!vendoredAvailable) — CI clones without
// the reference tree skip, they do not fail.
// ═════════════════════════════════════════════════════════════════════════════
const src = (): string[] => sourceLines(SRC).map((l) => (l ?? '').replace(/\r$/, ''))

describe.skipIf(!vendoredAvailable)('jt9-50 ORACLE — BOUP diverts to BOLEV on a cliff above (no BOUP3)', () => {
  it('the BOUP decide samples the cell one DYLEN above and `BNE BOLEV` on a solid hit', () => {
    const lines = src()
    const boup = lines.findIndex((l) => /^BOUP\b/.test(l))
    expect(boup, 'the BOUP label exists').toBeGreaterThan(0)
    // The block from BOUP to its clear-path climb (BRA BOUP1A) carries the sample.
    const bra = lines.findIndex((l, i) => i > boup && /\bBRA\s+BOUP1A\b/.test(l))
    expect(bra, 'the clear-path `BRA BOUP1A` follows BOUP').toBeGreaterThan(boup)
    const block = lines.slice(boup, bra + 1).join('\n')
    expect(block, 'reads the background X column').toMatch(/LDA\s+BCKXTB,X/)
    expect(block, 'ANDs the Y row offset UP by the height (DYLEN)').toMatch(/ANDA\s+BCKYTB-DYLEN,Y/)
    expect(block, 'on a solid hit branches to plain level flight (BOLEV)').toMatch(/\bBNE\s+BOLEV\b/)
    // …and the clear path commits the climb via BOUPDI, the contrast to the divert.
    expect(block, 'the clear path sets the up distance from BOUPDI').toMatch(/LDD\s+BOUPDI/)
  })

  it('the bounder offset DYLEN equals B2YLEN and SHYLEN ($14-6) — the port reuses one constant', () => {
    const lines = src()
    const equ = (label: string): string => {
      const i = lines.findIndex((l) => new RegExp(`^${label}\\s+EQU\\b`).test(l))
      expect(i, `${label} EQU present`).toBeGreaterThanOrEqual(0)
      return lines[i].replace(/^\S+\s+EQU\s+/, '').replace(/\s.*$/, '').trim()
    }
    expect(equ('DYLEN'), 'DYLEN is $14-6').toBe('$14-6')
    // Equality is the whole point: the bounder samples the SAME height as the
    // hunter/shadow, so the port's CLIMB_PREP_YLEN (0x14-6) is the right offset to
    // reuse — no new bounder-specific constant is needed.
    expect(equ('B2YLEN'), 'B2YLEN equals DYLEN').toBe(equ('DYLEN'))
    expect(equ('SHYLEN'), 'SHYLEN equals DYLEN').toBe(equ('DYLEN'))
  })

  it('there is NO `BOUP3` label — the bounder has no climb-prep HOLD, unlike B2UP3/SHUP3', () => {
    const lines = src()
    const boup3 = lines.filter((l) => /^BOUP3\b/.test(l))
    expect(boup3.length, 'the bounder must have no BOUP3 hold state').toBe(0)
    // Contrast: the hunter/shadow DO have their holds — proving the absence above
    // is a real ROM distinction, not a search that finds nothing everywhere.
    expect(lines.some((l) => /^B2UP3\b/.test(l)), 'the hunter B2UP3 hold exists').toBe(true)
    expect(lines.some((l) => /^SHUP3\b/.test(l)), 'the shadow SHUP3 hold exists').toBe(true)
  })
})
