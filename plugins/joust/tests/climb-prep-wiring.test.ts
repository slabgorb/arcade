// tests/climb-prep-wiring.test.ts
//
// Story jt9-23 — RED phase (Tyr One-Handed / TEA). THE BEHAVIOUR half; the ROM
// provenance for every law asserted here lives in climb-prep-source.test.ts,
// whose ORACLE groups pass on arrival and are the evidence base.
//
// Every non-control test in THIS file is RED. The port's brain runs the up-seek
// DECIDE (far-above, long-range) and commits STRAIGHT to the climb — it never
// samples the background ABOVE the bird, so a cliff blocking the climb is
// invisible to it. The ROM does not commit blindly: `B2UP`/`SHUNUP` sample
// `BCKYTB-YLEN` and, on a solid hit, enter B2UP3/SHUP3 — "LEVEL FLIGHT, READY TO
// GO UP" — and hold LEVEL for a 21-wake decision interval, re-checking the cliff
// each wake. This file proves the port has no such hold yet.
//
// ─── REACHABILITY: WHY THIS IS STAGED, NOT PLAYED (uf1-9, jt5-10) ─────────────
// uf1-9 measured the up-seek is entered on ZERO frames of natural play across
// three seeds / 6000 frames (hunters first spawn at wave 4; buzzards climb only
// toward a quarry above them, which no test's play reaches). The climb-prep hold
// sits one level DEEPER — an up-seek WITH a cliff above — so it is doubly
// unreachable by play. It is therefore driven DIRECTLY: an airborne enemy, a
// far-above quarry to route it onto the up-seek, and a real background cliff
// placed one height-look-up (YLEN = 14 px) above it. This is not a shortcut
// around coverage; it is the only way to observe a state production never enters
// (the "wiring a dead core can kill a sibling's reachability" trap — probe the
// assembled state, not a staged unit in isolation).
//
// ─── THE FIXTURE DISCIPLINE (jt5-10 / jt8-3) ─────────────────────────────────
// The DECIDE runs when no seek episode is committed, so the fixture arms NO
// seek and lets whatever state the wake produces ride forward (`...stepped`).
// The two inputs that would otherwise re-route the brain are frozen and
// RE-APPLIED EVERY WAKE: velY (pinned level, below the "falling fast enough"
// -$0040 gate, so the body cannot flap its way out) and the horizontal state
// (velXIndex = 0, so steerWake — a DIFFERENT, horizontal cliff look-ahead —
// never fires and cannot turn the bird). posX/posY are frozen too, so the
// cliff stays exactly one YLEN above the bird for the whole window.

import { describe, it, expect, beforeAll } from 'vitest'
import { loadEnemy, type EnemyModule, type EnemyState, type PlayerView } from './helpers/enemy-contract.js'
import { BCK_X_TABLE, X_TABLE_ORIGIN } from '../src/core/flight.js'
import { BCK_Y_TABLE } from '../src/core/arena.js'

// ─── The test's own background oracle (same indexing as bckMaskAt; out of range ⇒ 0) ───
const bckX = (x: number): number => {
  const i = x + X_TABLE_ORIGIN
  return i >= 0 && i < BCK_X_TABLE.length ? BCK_X_TABLE[i] : 0
}
const bck = (x: number, y: number): number =>
  y >= 0 && y < BCK_Y_TABLE.length ? bckX(x) & BCK_Y_TABLE[y] : 0

/** B2YLEN = SHYLEN = $14-6 — the height, in pixels, the decide samples ABOVE the bird. */
const YLEN = 0x14 - 6

/**
 * Scan the background tables for a whole-pixel (x, y) where the bird sits in
 * OPEN AIR (`bck(x, y) === 0`) but a solid box lies one YLEN ABOVE it
 * (`bck(x, y - YLEN) !== 0`) — the exact geometry the up-seek decide reads to
 * fork into B2UP3/SHUP3. Also returns a CONTROL: open air both at the line and
 * above, where the climb is unobstructed. Mid-air band only (above the $D3 lava
 * line, below the ceiling).
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
      if (clear === null && above === 0 && bck(x, y) === 0) clear = { x, y }
      if (cliff !== null && clear !== null) break
    }
  }
  if (cliff === null) throw new Error('no cliff-above background geometry found in the tables')
  if (clear === null) throw new Error('no open-air control geometry found')
  return { cliff, clear }
}

const FAR_ABOVE: PlayerView = { pixelY: 0x10, velXIndex: 0 }

/** An airborne hunter at (x, y), level, still, no seek — parked AT the up-seek decide. */
const decideFixture = (brain: 'b2undr' | 'shadow', x: number, y: number): EnemyState => ({
  entity: {
    posX: x,
    posY: y << 8,
    velXIndex: 0,
    velXFrac: 0,
    velY: 0, // level — below the -$0040 "falling fast enough" gate
    timeUp: 0,
    groundState: null,
    plantZ: 0,
    airborne: true,
  },
  brain,
  decision: brain,
  pchase: 1,
  facing: 1,
})

/**
 * Drive `wakes` wakes from the up-seek decide with the cliff geometry frozen in
 * place, and return the number of wakes the wings were DOWN (a flap of the climb
 * cadence). velY / horizontal state / position are re-applied every wake; the
 * brain's own state (seek, pjoy, facing) rides forward untouched.
 */
function flapCount(e: EnemyModule, brain: 'b2undr' | 'shadow', x: number, y: number, wave: number, wakes: number): number {
  let enemy = decideFixture(brain, x, y)
  let flaps = 0
  for (let i = 0; i < wakes; i++) {
    const stepped = e.stepEnemyDetailed(enemy, { player: FAR_ABOVE, wave }).enemy
    if (stepped.prevFlapHeld === true) flaps += 1
    enemy = {
      ...stepped,
      entity: { ...stepped.entity, posX: x, posY: y << 8, velY: 0, velXIndex: 0, velXFrac: 0 },
    }
  }
  return flaps
}

const WAVE = 4 // hunters first spawn here; the up-seek is a wave-4+ mechanic
const WAKES = 24 // > HUUPWU (8 wakes wings-up) + a full cadence flap, so today's climb WILL flap

describe('jt9-23 — the climb-preparation hold (B2UP3 / SHUP3)', () => {
  let e: EnemyModule
  let cliff: { x: number; y: number }
  let clear: { x: number; y: number }

  beforeAll(async () => {
    e = await loadEnemy()
    const sites = findSites()
    cliff = sites.cliff
    clear = sites.clear
  })

  it('FIXTURE PREMISE — the staged geometry really is "open air, cliff one YLEN above"', () => {
    // Asserted, not assumed (uf1-9 rule): the whole point is a cliff blocking the
    // climb, so prove the background actually has one there — and none at the
    // control site.
    expect(bck(cliff.x, cliff.y), 'the cliff site: bird in open air').toBe(0)
    expect(bck(cliff.x, cliff.y - YLEN), 'the cliff site: solid box one YLEN above').not.toBe(0)
    expect(bck(clear.x, clear.y), 'the control site: bird in open air').toBe(0)
    expect(bck(clear.x, clear.y - YLEN), 'the control site: open air above too').toBe(0)
  })

  it('CONTROL (green now and after) — with the climb CLEAR, the hunter climbs (it flaps)', () => {
    // Attribution control: the hunter's up-seek DOES flap to climb when nothing
    // blocks it. This is green today and must stay green — it proves the RED
    // below is the cliff suppressing the climb, not a dead fixture that never
    // climbs at all.
    const flaps = flapCount(e, 'b2undr', clear.x, clear.y, WAVE, WAKES)
    expect(flaps, `hunter with a clear climb should flap within ${WAKES} wakes`).toBeGreaterThan(0)
  })

  it('RED — with a cliff ONE YLEN ABOVE, the hunter must HOLD LEVEL (B2UP3), not climb into it', () => {
    // ROM: B2UP samples BCKYTB-B2YLEN, hits the box, enters B2UP3 — wings UP,
    // level, for the 21-wake decision interval, re-checking the cliff each wake.
    // The port has no such state: it commits to the climb and flaps into the
    // cliff. So this reads > 0 today and must read 0.
    const flaps = flapCount(e, 'b2undr', cliff.x, cliff.y, WAVE, WAKES)
    expect(flaps, 'hunter with a cliff above must not flap up into it — it holds B2UP3 level').toBe(0)
  })

  it('CONTROL (green now and after) — with the climb CLEAR, the shadow climbs (it flaps)', () => {
    const flaps = flapCount(e, 'shadow', clear.x, clear.y, WAVE, WAKES)
    expect(flaps, `shadow with a clear climb should flap within ${WAKES} wakes`).toBeGreaterThan(0)
  })

  it('RED — with a cliff ONE YLEN ABOVE, the shadow must HOLD LEVEL (SHUP3), not climb into it', () => {
    // ROM: SHUNUP samples BCKYTB-SHYLEN, hits the box, enters SHUP3 — the same
    // level hold. The port's shadow commits to the climb identically.
    const flaps = flapCount(e, 'shadow', cliff.x, cliff.y, WAVE, WAKES)
    expect(flaps, 'shadow with a cliff above must not flap up into it — it holds SHUP3 level').toBe(0)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Reviewer round 1 (Heimdall) — the mutation battery found three knobs the
// behaviour block above did not pin: the shadow's STEERING routine (F1, a real
// defect — `coastDir` where SHUP3A→SHDIRA aims), the FALL-FAST threshold value
// (F2), and the bounder EXCLUSION (F3). These call the brain decision functions
// directly so `dir` and `flap` are both observable on a single wake — the freeze
// harness above can only see flap (`prevFlapHeld`).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-23 review R1 — steering, fall-fast threshold, and bounder exclusion', () => {
  let e: EnemyModule
  let cliff: { x: number; y: number }
  let clear: { x: number; y: number }

  beforeAll(async () => {
    e = await loadEnemy()
    const sites = findSites()
    cliff = sites.cliff
    clear = sites.clear
  })

  /** A brain fixture at (x,y) with an explicit velY / horizontal index / facing. */
  const at = (
    brain: 'boundr' | 'b2undr' | 'shadow',
    x: number,
    y: number,
    velY: number,
    velXIndex: number,
    facing: -1 | 1,
  ): EnemyState => ({
    entity: { posX: x, posY: y << 8, velXIndex, velXFrac: 0, velY, timeUp: 0, groundState: null, plantZ: 0, airborne: true },
    brain,
    decision: brain,
    pchase: 1,
    facing,
  })

  it('F1 — a MOVING shadow holding below a cliff AIMS at its facing (SHDIRA), it does not coast', () => {
    // SHUP3A/SHUP3B `JMP SHDIRA` (:4434/:4441) — aims (dir = facing), no PVELX gate.
    // SHUP1 (the normal up-seek) `JMP SHDIRB` (:4275) — coasts (dir 0) while moving.
    // So over a cliff the shadow must AIM even though it is moving.
    const movingOverCliff = e.shadow(at('shadow', cliff.x, cliff.y, 0, 1, 1), FAR_ABOVE, WAVE)
    expect(movingOverCliff.dir, 'SHUP3 aims at facing (SHDIRA), not dir 0').toBe(1)
    // Control that anchors the distinction: the SAME shadow with NO cliff is on the
    // normal up-seek (SHUP1→SHDIRB) and COASTS to dir 0 while moving.
    const movingClear = e.shadow(at('shadow', clear.x, clear.y, 0, 1, 1), FAR_ABOVE, WAVE)
    expect(movingClear.dir, 'the normal up-seek coasts (SHDIRB) while moving').toBe(0)
  })

  it('F2 — the fall-fast gate is exactly CLIMB_PREP_FALL_FAST (0x40): flap at 0x40, glide at 0x3F', () => {
    // `ADDD #-$0040 / BMI B2UP3B` (:4210/:4426): flap only once the fall reaches 0x40.
    for (const brain of ['b2undr', 'shadow'] as const) {
      const fast = brain === 'shadow'
        ? e.shadow(at(brain, cliff.x, cliff.y, 0x40, 0, 1), FAR_ABOVE, WAVE)
        : e.b2undr(at(brain, cliff.x, cliff.y, 0x40, 0, 1), FAR_ABOVE, WAVE)
      const slow = brain === 'shadow'
        ? e.shadow(at(brain, cliff.x, cliff.y, 0x3f, 0, 1), FAR_ABOVE, WAVE)
        : e.b2undr(at(brain, cliff.x, cliff.y, 0x3f, 0, 1), FAR_ABOVE, WAVE)
      expect(fast.flap, `${brain}: velY=0x40 is falling fast enough → flap`).toBe(true)
      expect(slow.flap, `${brain}: velY=0x3F is below the gate → glide (wings up)`).toBe(false)
    }
  })

  it('F3 — the BOUNDER never gets the climb-prep HOLD: its per-wake flap law is unchanged over a cliff (no BOUP3)', () => {
    // The bounder samples the same cliff and diverts to plain BOLEV (`BNE BOLEV`
    // :3850) — there is no BOUP3. So the climb-prep HOLD gate (the `velY >= 0x40`
    // fall-fast law of B2UP3/SHUP3) must NOT touch it. This calls `boundr()` — the
    // bare per-wake flap law (`pursue`), NOT the full step pipeline — where at velY=0
    // the bounder flaps `velY >= 0` exactly as it does with no cliff, NOT the hold
    // (which would glide at velY=0 < 0x40).
    //
    // jt9-50 note: the BOUP divert itself lives at the up-seek DECIDE (`seekWake`),
    // which `boundr()` does not run, so it is INVISIBLE here — at velY=0 BOLEV and the
    // climb both flap, so this pair cannot see the divert either way. The divert is
    // observable only through the full pipeline while RISING (velY<0); that is what
    // climb-prep-bounder.test.ts stages. So "the flap law is the same over a cliff"
    // remains true for this bare-`pursue` call even after jt9-50 landed.
    const overCliff = e.boundr(at('boundr', cliff.x, cliff.y, 0, 0, 1), FAR_ABOVE, WAVE)
    const noCliff = e.boundr(at('boundr', clear.x, clear.y, 0, 0, 1), FAR_ABOVE, WAVE)
    expect(overCliff.flap, 'the bounder is not held level (no B2UP3 hold)').toBe(true)
    expect(overCliff.flap, 'the bare per-wake flap law is unchanged by the cliff').toBe(noCliff.flap)
  })
})
