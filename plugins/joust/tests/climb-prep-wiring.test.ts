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
import {
  CLIFF_DESTRUCTION,
  initialArenaState,
  applyWaveDestruction,
  type ArenaState,
  type CliffDestruction,
} from '../src/core/arena-state.js'

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

// ─────────────────────────────────────────────────────────────────────────────
// Story jt9-51 — climb-prep is PER-WAKE (no 21-wake latch). RED phase (Tyr
// One-Handed / TEA).
//
// jt9-23 (the block at the top) pinned that the climb-prep HOLD exists: with a
// cliff one YLEN above, the enemy holds level instead of flapping into it (0
// flaps over a sustained cliff), and with a clear climb it flaps (the CONTROLs).
// That covers this story's AC-1 (hunter hold), AC-2 (shadow hold) and AC-5
// (open-air control) — see the jt9-23 block above; they are not duplicated here.
//
// What jt9-23 did NOT pin — and what the port DELIBERATELY differs from the ROM
// on — is the hold's TEMPORAL shape. The ROM's B2UP3/SHUP3 arm a 21-wake `#20+1`
// `PJOYT` countdown at entry and hold LEVEL for the whole interval, re-deciding
// only at expiry — so a cliff cleared mid-interval keeps holding for up to 20
// more wakes. The port instead RE-DERIVES the hold every wake from the live
// background mask, carrying NO timer and NO stored line — a Reviewer-accepted
// jt9-23 deviation. That per-wake re-derivation lives in `cliffBlocksClimb`, read
// once per wake by the hunter's `b2undr` up-seek branch and the shadow's SHUP3
// branch; the ROM's held `#20+1` timer and stored line survive only as provenance
// in climb-prep-source.test.ts. This block pins the per-wake OBSERVABLE: a cleared
// cliff resumes the climb well inside 21 wakes, and a re-appearing cliff
// re-engages the hold that same wake.
//
// These tests pass on arrival (the port already re-derives per wake) — they are
// GUARDS against a future drift toward the ROM's held timer, or a stateful
// re-implementation that latches the hold. The RED evidence is a MUTATION: force
// `cliffBlocksClimb` to a constant (sticky-true = a latch; false = no hold) and
// every assertion below flips. See the TEA Assessment for the mutation battery.
//
// The cliff is toggled by MOVING the bird between the cliff site (open air, solid
// box one YLEN above) and the clear site (open air above) — the up-seek reads the
// mask one YLEN above the bird's LIVE position, so a position change IS a cliff
// change to the decide. Every wake re-freezes velY=0 (below the -$0040 gate) and
// velXIndex=0 (steerWake inert), exactly as `flapCount` above; only the position
// per wake varies. `.` = wings up (hold/glide), `F` = wings down (a climb flap).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-51 — climb-prep is PER-WAKE, not a 21-wake latch (B2UP3 / SHUP3)', () => {
  let e: EnemyModule
  let cliff: { x: number; y: number }
  let clear: { x: number; y: number }

  beforeAll(async () => {
    e = await loadEnemy()
    const sites = findSites()
    cliff = sites.cliff
    clear = sites.clear
  })

  /**
   * Drive one wake per entry in `sites`, carrying the brain's own state (seek,
   * pjoy, facing, wing cadence) FORWARD untouched — only the position is set to
   * that wake's site and velY/horizontal re-frozen. Returns, per wake, whether
   * the wings were DOWN (a climb flap). This is `flapCount`'s harness with a
   * per-wake position instead of a single frozen one, so a `cliff`→`clear`
   * transition in the list is a cliff CLEARED between two consecutive wakes with
   * all carried state intact — the only way a latch, if one existed, could show.
   */
  const traceFlaps = (brain: 'b2undr' | 'shadow', sites: { x: number; y: number }[]): boolean[] => {
    let enemy = decideFixture(brain, sites[0].x, sites[0].y)
    const flaps: boolean[] = []
    for (const s of sites) {
      enemy = { ...enemy, entity: { ...enemy.entity, posX: s.x, posY: s.y << 8, velY: 0, velXIndex: 0, velXFrac: 0 } }
      const stepped = e.stepEnemyDetailed(enemy, { player: FAR_ABOVE, wave: WAVE }).enemy
      flaps.push(stepped.prevFlapHeld === true)
      enemy = stepped
    }
    return flaps
  }

  const rep = (s: { x: number; y: number }, n: number): { x: number; y: number }[] =>
    Array.from({ length: n }, () => s)

  // ─── AC-3: a cleared cliff resumes the climb, NOT deferred by a 21-wake timer ──

  it('AC-3 shadow — a cliff cleared on wake 5 resumes the climb THE VERY NEXT WAKE (no latch)', () => {
    // The shadow's up-seek flaps EVERY wake while climbing (velY=0), so the resume
    // is exactly observable: hold for the 5 cliff wakes, then flap from the first
    // clear wake onward. 5 + 15 = 20 wakes total, all inside a single 21-wake ROM
    // interval — so a `#20+1` latch armed at cliff entry would STILL be holding at
    // wake 20 and flaps[5] would be false. The port re-derives → flaps[5] is true.
    const f = traceFlaps('shadow', [...rep(cliff, 5), ...rep(clear, 15)])
    expect(f.slice(0, 5).some((x) => x), 'held level over the cliff (no climb flap)').toBe(false)
    expect(f[5], 'the climb resumes the very next wake after the cliff clears').toBe(true)
  })

  it('AC-3 hunter — a cliff cleared mid-hold resumes the climb well inside 21 wakes (no latch)', () => {
    // The hunter climbs on an ~8-wake cadence (HUUPWU wings-up, then a flap), so
    // the resume is not literally the next wake — but it MUST land inside the
    // 21-wake window a ROM latch would suppress. cliff×5 + clear×15 = 20 wakes: the
    // port flaps within the clear window (around wake 8); a latch armed at cliff
    // entry holds through wake 20, giving zero flaps across the whole trace.
    const f = traceFlaps('b2undr', [...rep(cliff, 5), ...rep(clear, 15)])
    expect(f.slice(0, 5).some((x) => x), 'held level over the cliff (no climb flap)').toBe(false)
    const firstFlap = f.indexOf(true)
    expect(firstFlap, 'the climb resumes — there IS a flap in the trace').toBeGreaterThanOrEqual(5)
    expect(firstFlap, 'and it resumes inside the 21-wake window a ROM latch would suppress').toBeLessThan(21)
  })

  // ─── AC-4: a re-appearing cliff re-engages the hold that same wake ─────────────

  it('AC-4 shadow — a cliff re-appearing on wake 12 re-engages the hold immediately', () => {
    // Climb clear for 12 wakes (flapping every wake), then the cliff returns. The
    // hold re-engages from the LIVE mask, so every wake from 12 on holds level.
    const f = traceFlaps('shadow', [...rep(clear, 12), ...rep(cliff, 8)])
    expect(f[11], 'the shadow is climbing (flapping) just before the cliff returns').toBe(true)
    expect(f.slice(12).some((x) => x), 'the re-appeared cliff re-engages the hold every wake after').toBe(false)
  })

  it('AC-4 hunter — a re-appearing cliff suppresses the climb cadence (re-engaged hold)', () => {
    // all-clear flaps at ~wake 8 and ~wake 16. Here the cliff returns at wake 12,
    // so the wake-16 cadence flap must be SUPPRESSED: a flap in wakes 0..11 (clear)
    // and none in wakes 12..19 (cliff). If the re-added cliff were ignored (latch
    // expired / stateful hold), wake ~16 would flap like all-clear.
    const f = traceFlaps('b2undr', [...rep(clear, 12), ...rep(cliff, 8)])
    expect(f.slice(0, 12).some((x) => x), 'the hunter flaps while the climb is clear').toBe(true)
    expect(f.slice(12).some((x) => x), 'the re-appeared cliff holds level (no cadence flap)').toBe(false)
  })

  // ─── The full toggle: hold → climb → hold, tracked wake-by-wake ───────────────

  it('the hold tracks the mask each wake: cliff→clear→cliff is hold→climb→hold (both brains)', () => {
    // A single trace exercising both transitions with all state carried across:
    // 4 cliff wakes (hold), 8 clear wakes (climb), 8 cliff wakes (hold again).
    // The shadow shows it crisply (`....FFFFFFFF........`); the hunter shows a
    // climb flap only in the clear window and none in either cliff window.
    for (const brain of ['shadow', 'b2undr'] as const) {
      const f = traceFlaps(brain, [...rep(cliff, 4), ...rep(clear, 8), ...rep(cliff, 8)])
      expect(f.slice(0, 4).some((x) => x), `${brain}: first cliff window holds level`).toBe(false)
      expect(f.slice(4, 12).some((x) => x), `${brain}: the clear window climbs (at least one flap)`).toBe(true)
      expect(f.slice(12).some((x) => x), `${brain}: the re-appeared cliff holds level again`).toBe(false)
    }
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// Story jt11-12 item (1) — the VERTICAL climb sample must honour DESTRUCTION.
// RED phase (Han Solo / TEA).
//
// jt9-23 / jt9-50 / jt9-51 (the blocks above) wired the climb-prep hold and the
// bounder's BOUP divert off `cliffBlocksClimb`, which reads the PRISTINE
// background one YLEN above the bird. jt11-5 then gave the HORIZONTAL look-ahead
// (`steerWake`) the live arena, so a DESTROYED cliff's background bits read as
// open air — `backgroundActive` returns false once WCLFEW has cleared that
// cliff's BCKXD1 bits (JOUSTRV4.SRC:2301-2325), the seam applied inside `steerWake`.
//
// The VERTICAL climb sample never got that seam. `cliffBlocksClimb` and its
// helper `bckMaskAt` take no arena, so all THREE consumers still see a
// burned-away cliff as solid and refuse to climb through thin air: the hunter
// `b2undr` B2UP3 branch, the shadow SHUP3 branch, and the bounder BOUP divert.
//
// These stage a cliff whose BACKGROUND bits belong to a DESTRUCTIBLE cliff, then
// destroy exactly that cliff through the real `applyWaveDestruction` path and
// thread the resulting arena through `stepEnemyDetailed`'s ctx (already carried
// there for `steerWake` since jt11-5). The climb must resume. Attribution is
// A/B: the SAME site with the PRISTINE arena still holds (the cliff is really
// there), and a NON-destructible control cliff still holds even with EVERY cliff
// destroyed (the awareness is bit-accurate, not a blanket "destruction opens all
// climbs"). Same staged-not-played discipline as jt9-23 (uf1-9: the up-seek is
// entered on zero frames of natural play; the cliff-above fork is deeper still).
// ─────────────────────────────────────────────────────────────────────────────

/** The OR of every destructible cliff's background-collision bits (0x47). */
const DESTRUCTIBLE_BCK = CLIFF_DESTRUCTION.reduce((m, c) => m | c.backgroundBits, 0)

/** Destroy exactly one cliff via the production wave path; bridge intact (wave 1). */
const destroyOnly = (c: CliffDestruction): ArenaState =>
  applyWaveDestruction(initialArenaState(), 1, c.statusBit)

/** Destroy EVERY destructible cliff (status high nibble all set); bridge intact. */
const destroyAll = (): ArenaState => applyWaveDestruction(initialArenaState(), 1, 0xf0)

/**
 * Scan for three staged sites (bird in open air throughout, mid-air band):
 *   • `destr`  — a solid box one YLEN above whose bits belong to ONE destructible
 *     cliff (recorded), so destroying that cliff opens the sample.
 *   • `nondestr` — a solid box above whose bits are DISJOINT from every
 *     destructible cliff, so no destruction can open it (the bit-accuracy control).
 *   • `clear`  — open air above too (the "climb really can flap here" control).
 */
function findDestructionSites(): {
  destr: { x: number; y: number; cliff: CliffDestruction }
  nondestr: { x: number; y: number }
  clear: { x: number; y: number }
} {
  let destr: { x: number; y: number; cliff: CliffDestruction } | null = null
  let nondestr: { x: number; y: number } | null = null
  let clear: { x: number; y: number } | null = null
  for (let y = 0x30; y <= 0xc0; y++) {
    for (let x = 0; x <= 255; x++) {
      if (bck(x, y) !== 0) continue // bird must be in open air
      const above = bck(x, y - YLEN)
      if (above === 0) {
        if (clear === null) clear = { x, y }
        continue
      }
      if (destr === null) {
        const owner = CLIFF_DESTRUCTION.find((c) => (above & c.backgroundBits) !== 0)
        if (owner) destr = { x, y, cliff: owner }
      }
      if (nondestr === null && (above & DESTRUCTIBLE_BCK) === 0) nondestr = { x, y }
    }
    if (destr && nondestr && clear) break
  }
  if (!destr) throw new Error('no destructible-cliff-above geometry found in the tables')
  if (!nondestr) throw new Error('no non-destructible-cliff-above control found')
  if (!clear) throw new Error('no open-air control geometry found')
  return { destr, nondestr, clear }
}

/** An airborne enemy at (x, y) with an explicit velY, still, no seek — at the up-seek decide. */
const fixtureAt = (brain: 'boundr' | 'b2undr' | 'shadow', x: number, y: number, velY: number): EnemyState => ({
  entity: { posX: x, posY: y << 8, velXIndex: 0, velXFrac: 0, velY, timeUp: 0, groundState: null, plantZ: 0, airborne: true },
  brain,
  decision: brain,
  pchase: 1,
  facing: 1,
})

/**
 * `flapCount` (above) plus a threaded arena and an explicit velY. Position /
 * horizontal state / velY are re-frozen every wake; the brain's own state rides
 * forward. Returns how many wakes the wings were DOWN (a climb flap).
 */
function flapCountArena(
  e: EnemyModule,
  brain: 'boundr' | 'b2undr' | 'shadow',
  x: number,
  y: number,
  velY: number,
  wave: number,
  wakes: number,
  arena: ArenaState,
): number {
  let enemy = fixtureAt(brain, x, y, velY)
  let flaps = 0
  for (let i = 0; i < wakes; i++) {
    const stepped = e.stepEnemyDetailed(enemy, { player: FAR_ABOVE, wave, arena }).enemy
    if (stepped.prevFlapHeld === true) flaps += 1
    enemy = { ...stepped, entity: { ...stepped.entity, posX: x, posY: y << 8, velY, velXIndex: 0, velXFrac: 0 } }
  }
  return flaps
}

// The hunter and shadow hold LEVEL over a cliff at velY=0 (flap only past the
// -$0040 fall gate); a rising bounder GLIDES over a cliff (BOLEV) but flaps a
// clear climb — so RISING is the sign that separates the bounder's divert.
const LEVEL = 0
const RISING = -0x40

describe('jt11-12(1) — the vertical climb sample honours cliff destruction', () => {
  let e: EnemyModule
  let sites: ReturnType<typeof findDestructionSites>

  beforeAll(async () => {
    e = await loadEnemy()
    sites = findDestructionSites()
  })

  it('FIXTURE PREMISE — staged geometry is a real cliff whose bits are (non-)destructible as claimed', () => {
    const { destr, nondestr, clear } = sites
    // The destructible site: open air, a solid box one YLEN above, and those bits
    // belong to the recorded destructible cliff.
    expect(bck(destr.x, destr.y), 'destructible site: bird in open air').toBe(0)
    expect(bck(destr.x, destr.y - YLEN), 'destructible site: solid box above').not.toBe(0)
    expect(
      bck(destr.x, destr.y - YLEN) & destr.cliff.backgroundBits,
      `the box above belongs to ${destr.cliff.cliff}`,
    ).not.toBe(0)
    // The control cliff: solid above, but NO destructible bit — no arena can open it.
    expect(bck(nondestr.x, nondestr.y), 'control site: bird in open air').toBe(0)
    expect(bck(nondestr.x, nondestr.y - YLEN), 'control site: solid box above').not.toBe(0)
    expect(
      bck(nondestr.x, nondestr.y - YLEN) & DESTRUCTIBLE_BCK,
      'the control box shares no bit with any destructible cliff',
    ).toBe(0)
    // The clear site: open air above, so a climb genuinely flaps there.
    expect(bck(clear.x, clear.y - YLEN), 'clear site: open air above').toBe(0)
    // And the destroyed arena really drops the target cliff's background bits.
    expect(destroyOnly(destr.cliff).destroyedBackgroundBits & destr.cliff.backgroundBits).toBe(
      destr.cliff.backgroundBits,
    )
  })

  for (const brain of ['b2undr', 'shadow'] as const) {
    it(`CONTROL (green now and after) — ${brain}: with the PRISTINE arena the cliff still holds the climb`, () => {
      // The cliff is really there: with nothing destroyed the hold stands (0 flaps).
      // This anchors the RED below to the DESTRUCTION, not to a dead fixture.
      const flaps = flapCountArena(e, brain, sites.destr.x, sites.destr.y, LEVEL, WAVE, WAKES, initialArenaState())
      expect(flaps, `${brain} over an intact cliff holds level`).toBe(0)
    })

    it(`RED — ${brain}: destroying that cliff frees the climb — the hold releases and it flaps`, () => {
      // After the fix, `cliffBlocksClimb` reads the arena the way `steerWake` does:
      // a sample whose bits belong to a destroyed cliff is open air, so the B2UP3 /
      // SHUP3 hold lifts. Today the arena is ignored → still 0 flaps → RED.
      const arena = destroyOnly(sites.destr.cliff)
      const flaps = flapCountArena(e, brain, sites.destr.x, sites.destr.y, LEVEL, WAVE, WAKES, arena)
      expect(flaps, `${brain} over a DESTROYED cliff must climb (flap) — the cliff is gone`).toBeGreaterThan(0)
    })

    it(`CONTROL (green now and after) — ${brain}: a NON-destructible cliff still holds even with every cliff destroyed`, () => {
      // Bit-accuracy: the awareness keys on the destroyed cliff's OWN bits, not a
      // blanket "any destruction opens every climb". This box shares no bit with a
      // destructible cliff, so destroy-all leaves it solid and the hold stands.
      const flaps = flapCountArena(e, brain, sites.nondestr.x, sites.nondestr.y, LEVEL, WAVE, WAKES, destroyAll())
      expect(flaps, `${brain} over an indestructible cliff holds even with all cliffs destroyed`).toBe(0)
    })
  }

  // The bounder has no hold (no BOUP3): it diverts a blocked climb to BOLEV level
  // flight, which GLIDES while rising. So the bounder's divert is read RISING.
  it('CONTROL (green now and after) — bounder: a rising bounder over the intact cliff flies BOLEV level (glides)', () => {
    const flaps = flapCountArena(e, 'boundr', sites.destr.x, sites.destr.y, RISING, WAVE, WAKES, initialArenaState())
    expect(flaps, 'a rising bounder over an intact cliff diverts to BOLEV and glides').toBe(0)
  })

  it('RED — bounder: destroying that cliff restores the up-seek — a rising bounder climbs (flaps)', () => {
    // With the cliff gone the bounder BOUP divert no longer fires, so the
    // bounder arms the up-seek and its climb flaps even while rising (not velY-gated).
    // Today the arena is ignored → still diverts → 0 flaps → RED.
    const arena = destroyOnly(sites.destr.cliff)
    const flaps = flapCountArena(e, 'boundr', sites.destr.x, sites.destr.y, RISING, WAVE, WAKES, arena)
    expect(flaps, 'a rising bounder over a DESTROYED cliff climbs (the BOUP divert no longer fires)').toBeGreaterThan(0)
  })

  it('ATTRIBUTION (green now and after) — a rising bounder with a CLEAR climb flaps (fixture is not dead)', () => {
    const flaps = flapCountArena(e, 'boundr', sites.clear.x, sites.clear.y, RISING, WAVE, WAKES, initialArenaState())
    expect(flaps, 'a rising bounder with nothing above climbs (flaps) — proving the RED is the cliff, not the sign').toBeGreaterThan(0)
  })
})
