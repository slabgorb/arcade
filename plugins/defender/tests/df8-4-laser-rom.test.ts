// tests/df8-4-laser-rom.test.ts
//
// Story df8-4 — RED phase (O'Brien / TEA). THE PLAYER LASER, ROM-FAITHFUL.
//
// Playtest 2026-08-20: the laser "feels weak and slow to fire". Three defects, all
// measured against the Williams source (reference/original-source/defender/DEFA7.SRC):
//
// 1. TRAVEL IS ¼ SPEED. laser.ts STEP = 0x100 advances the head one byte-column per
//    tick. The ROM's LASR1 (DEFA7.SRC:2799-2810) runs `LEAX $100,X` FOUR times per
//    frame (`LDA #4` :2799), lays a `$11` body byte at each (:2801/:2804), stores the
//    bright `$99` tip at the fourth step (:2808-2809), and then `STX PD,U` (:2810)
//    writes THAT position back as the new head — the head moves $400 per tick. (LASL1
//    mirrors it leftward: `LEAX -$100,X`, :2848-2859.) The crawl is also WHY refire
//    stalls: the ROM-correct 4-laser cap (CMPA #4, :2764) holds each LFLG slot ~4×
//    too long at $100/tick.
//
// 2. FIRE IS AUTO-REPEAT; THE ROM IS EDGE-PER-PRESS. sim.ts fires every tick
//    `input.fire` is held (the step-7 LFIRE block). The ROM's switch scan is edge-triggered and
//    debounced — SSCAN (DEFA7.SRC:760-796) dispatches a switch-table entry once per
//    distinct closure (SWTAB → LFIRE, DEFB6.SRC:1845); a held button re-fires nothing.
//    Fix shape: the `prevThrust` edge idiom already in sim.ts (the thrust-start/stop
//    cue edge in stepSim).
//
// 3. THE BEAM IS 4 px OF FLAT INK; THE ROM LAYS A LONG BRIGHT-TIPPED BEAM. scene.ts
//    LASER_LENGTH = 4 draws four palette-1 pixels. The ROM lays, EVERY frame: four
//    `$11` body bytes (:2801-2807) + one `$99` tip byte (:2808-2809) = a $500 head
//    span, plus three FISTAB "fissle" sparkle bytes through the PD+2 trail pointer
//    (:2811-2823) — up to $800 of beam. One VRAM byte-column ($100) is two horizontal
//    pixels (nibble pair), and the port's projection maps $100 → 64*292/9600 ≈ 1.95
//    px, so the ROM head span alone is ~10 px and the full laid beam ~15-16 px. The
//    nibbles ARE the colours: $11 = palette index 1 (body), $99 = palette index 9
//    (the bright leading tip).
//
// ─── WHAT THIS SUITE PINS (what GREEN/Dev must build) ─────────────────────────────
//   laser.ts   STEP → 0x400 (the ROM's per-tick head advance, :2799-2810). The cap
//              MAX_LASERS = 4 is ROM-correct and UNCHANGED.
//   sim.ts     fire on the RISING EDGE of input.fire only (prevFire on the runtime,
//              the prevThrust idiom) — one laser per distinct press.
//   scene.ts   drawLaserStreak lays the ROM beam: ≥ the $500 head span (~10 px, vs
//              today's 4) with the distinct $99 bright tip at the LEADING edge.
//   Preserved: determinism (no entropy beyond the injected rand), pt1-27 y-capture
//              (a laser keeps its fire row), the purity sweep (purity.test.ts scans
//              src/core — not duplicated here, the scheduler.test.ts precedent).
//
// ROBUSTNESS NOTE (beam shape): the exact multi-part pixel layout (fissle sparkle
// values are FISTAB-random, and the floor projection collapses some byte-columns) is
// impractical to pixel-match, so the render tests pin the ROBUST ROM properties: a
// span ≥ 9 px (the $500 head span survives any floor rounding), a sane upper bound,
// body ink = palette 1 ($11), and the leading pixel = palette 9 ($99). Logged as a
// TEA design deviation in the session file.

import { describe, it, expect } from 'vitest'
import { createScheduler } from '../src/core/scheduler.js'
import { createLaserBank } from '../src/core/laser.js'
import { createSim, stepSim, type Input, type SimState } from '../src/core/sim.js'
import { composeFrame } from '../src/core/scene.js'
import { LOGICAL_WIDTH, LOGICAL_HEIGHT } from '../src/shell/render.js'

// ─── ROM literals this suite pins — sourced from DEFA7.SRC, never from the module's
//     own exports (lang-review #26). ──────────────────────────────────────────────
const HEAD_STEP = 0x400 // LDA #4 (:2799) × LEAX $100,X (:2805), STX PD,U (:2810)
const SPAWN_OFFSET_RIGHT = 0x704 // LEAX $704,X (:2792)
const RIGHT_EDGE = 0x9800 // CMPX #$9800 / BHS LRDIE (:2802-2803)
const CAP = 4 // CMPA #4 / BHS LFIREX (:2764) — UNCHANGED by df8-4
const BODY_INK = 0x1 // LDB #$11 (:2801) — both nibbles palette 1
const TIP_INK = 0x9 // LDB #$99 (:2808) — both nibbles palette 9, the bright tip
// The ROM flight: ($9800 − $704) / $400 = 36.2 head steps → the process dies on its
// ~38th run (+1 for MKPROC PTIME=1, the no-move spawn tick). At the old $100 step the
// same flight is ~147 ticks — the bracket below rejects it.
const FLIGHT_TICKS_MIN = 30
const FLIGHT_TICKS_MAX = 45
// The $500 head span (4 body bytes + tip) through the port's projection (64*292/9600
// ≈ 1.95 px per $100) is ~10 px; ≥9 survives any floor rounding. Today's streak is 4.
const BEAM_SPAN_MIN_PX = 9
const BEAM_SPAN_MAX_PX = 40 // sanity: a beam, not a full-row smear

const NEUTRAL: Input = { thrust: false, reverse: false, up: false, down: false, fire: false }
const withInput = (over: Partial<Input>): Input => ({ ...NEUTRAL, ...over })

/** Deterministic byte source (LCG) — the df3-6/df6-1/pt1-27 shape; no ambient entropy. */
function makeRand(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return (s >>> 16) & 0xff
  }
}

// ══════════════════════════════════════════════════════════════════════════════════
// AC1 — TRAVEL SPEED (laser.ts): the head advances $400 per tick, the full LASR1
// four-step frame — not the single $100 placeholder df3-5 shipped (its suite
// deliberately pinned direction+constancy only; this story pins the magnitude).
// ══════════════════════════════════════════════════════════════════════════════════
describe('df8-4 AC1 — the laser head advances $400/tick (LASR1 ×4 LEAX $100, DEFA7.SRC:2799-2810)', () => {
  it('a RIGHT laser advances exactly +$400 each travel tick', () => {
    const sched = createScheduler()
    const bank = createLaserBank(sched)
    const laser = bank.fire(0x1000, 'right')!
    const xs: number[] = [laser.x]
    for (let i = 0; i < 4; i++) {
      sched.stepTick()
      xs.push(laser.x)
    }
    // First stepTick is the MKPROC PTIME=1 wake — the first REAL travel step. Every
    // travel delta is the ROM's whole-frame head advance, $400 (:2799-2810).
    expect(xs[2] - xs[1], 'the per-tick head advance must be the ROM frame step $400').toBe(HEAD_STEP)
    expect(xs[3] - xs[2]).toBe(HEAD_STEP)
    expect(xs[4] - xs[3]).toBe(HEAD_STEP)
  })

  it('a LEFT laser advances exactly −$400 each travel tick (LASL1, :2848-2859)', () => {
    const sched = createScheduler()
    const bank = createLaserBank(sched)
    const laser = bank.fire(0x8000, 'left')!
    const xs: number[] = [laser.x]
    for (let i = 0; i < 4; i++) {
      sched.stepTick()
      xs.push(laser.x)
    }
    expect(xs[2] - xs[1], 'the LEFT head advance must be −$400 (LEAX -$100 ×4)').toBe(-HEAD_STEP)
    expect(xs[3] - xs[2]).toBe(-HEAD_STEP)
    expect(xs[4] - xs[3]).toBe(-HEAD_STEP)
  })

  it('a RIGHT laser crosses the ROM $704→$9800 flight in ~36 ticks, not ~4× that', () => {
    const sched = createScheduler()
    const bank = createLaserBank(sched)
    const laser = bank.fire(0, 'right')! // spawns at the ROM span start, $704
    expect(laser.x).toBe(SPAWN_OFFSET_RIGHT)
    let ticks = 0
    while (bank.count > 0 && ticks < 1000) {
      sched.stepTick()
      ticks++
    }
    expect(bank.count, 'the laser must die off-screen and free its slot').toBe(0)
    expect(laser.x, 'death happens at/past the ROM right edge').toBeGreaterThanOrEqual(RIGHT_EDGE)
    // ($9800−$704)/$400 = 36.2 steps (+1 PTIME spawn tick, +1 death-check run) — the
    // ROM cadence. At the old $100 step this flight is ~147 ticks and reddens here.
    expect(ticks, `flew the span in ${ticks} ticks — the ROM does it in ~38`).toBeGreaterThanOrEqual(FLIGHT_TICKS_MIN)
    expect(ticks, `flew the span in ${ticks} ticks — that is the old $100 crawl`).toBeLessThanOrEqual(FLIGHT_TICKS_MAX)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC2 — EDGE-TRIGGERED FIRE (sim.ts): one laser per distinct PRESS, never per held
// tick. SSCAN (DEFA7.SRC:760-796) dispatches each switch CLOSURE once (SWTAB→LFIRE,
// DEFB6.SRC:1845). Behavioural, through stepSim — the "slow to fire" fix's core.
// ══════════════════════════════════════════════════════════════════════════════════
describe('df8-4 AC2 — fire is edge-per-press, not auto-repeat (SSCAN, DEFA7.SRC:760-796)', () => {
  it('holding fire across 12 ticks spawns exactly ONE laser and ONE laser-fire cue', () => {
    let s = createSim(makeRand(7))
    s = stepSim(s, NEUTRAL) // opening tick: wave 1 spawns, ship rests at row 120
    let peakAlive = 0
    let fireCues = 0
    for (let i = 0; i < 12; i++) {
      s = stepSim(s, withInput({ fire: true }))
      peakAlive = Math.max(peakAlive, s.lasers.filter((l) => l.alive).length)
      fireCues += s.cues.filter((c) => c.type === 'laser-fire').length
    }
    expect(peakAlive, `a HELD button put ${peakAlive} lasers up — the ROM fires once per press`).toBe(1)
    expect(fireCues, `a HELD button sounded LASSND ${fireCues}× — one press, one cue`).toBe(1)
  })

  it('release then press fires a SECOND laser — the edge re-arms on release', () => {
    let s = createSim(makeRand(7))
    s = stepSim(s, NEUTRAL)
    let fireCues = 0
    const count = (st: SimState): number => st.lasers.filter((l) => l.alive).length
    const tally = (st: SimState): void => {
      fireCues += st.cues.filter((c) => c.type === 'laser-fire').length
    }
    for (let i = 0; i < 5; i++) {
      s = stepSim(s, withInput({ fire: true })) // press #1, held
      tally(s)
    }
    expect(count(s), 'the held press must have spawned exactly one laser').toBe(1)
    for (let i = 0; i < 3; i++) {
      s = stepSim(s, NEUTRAL) // release
      tally(s)
    }
    s = stepSim(s, withInput({ fire: true })) // press #2
    tally(s)
    expect(count(s), 'a NEW press after release must spawn a second laser').toBe(2)
    expect(fireCues, 'two presses, two LASSND cues').toBe(2)
  })

  it('the LFLG cap of 4 is UNCHANGED — rapid presses never exceed four concurrent (CMPA #4, :2764)', () => {
    // Pulsed press/release (a distinct edge every 2 ticks) — the cap must still bite
    // at FOUR, and must actually be REACHED (non-vacuity), never five. This replaces
    // the coverage df3-6's held-fire cap test loses under edge triggering.
    let s = createSim(makeRand(7))
    s = stepSim(s, NEUTRAL)
    let peak = 0
    for (let i = 0; i < 16; i++) {
      s = stepSim(s, withInput({ fire: i % 2 === 0 })) // presses at ticks 0,2,4,…
      peak = Math.max(peak, s.lasers.filter((l) => l.alive).length)
    }
    expect(peak, 'four distinct presses must reach the full ROM cap').toBe(CAP)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC3 — THE ROM BEAM (scene.ts composeFrame): the rendered streak is the laid beam —
// ≥ the $500 head span (~10 px, vs today's 4) with the bright $99 tip at the LEADING
// edge, body ink $11 (palette 1). Canonical DIFFER method (pt1-27 AC4): the same
// state composed with and without its laser — every differing pixel is laser ink.
// ══════════════════════════════════════════════════════════════════════════════════

/** A sim state stripped of everything but the one hand-placed laser, so the frame
 *  diff isolates the beam (df5-9's hand-built-laser + pt1-27's DIFFER idioms). */
function laserOnlyState(facing: 'right' | 'left'): SimState {
  let s = createSim(makeRand(7))
  s = stepSim(s, NEUTRAL)
  const bare = {
    ...s,
    landers: [],
    humanoids: [],
    mutants: [],
    baiters: [],
    bombers: [],
    bombs: [],
    pods: [],
    swarmers: [],
    shots: [],
    effects: [],
  }
  return { ...bare, lasers: [{ x: 0x2600, facing, alive: true, y: 120 }] } as SimState
}

/** The beam's ink: every (col, palette-index) that differs from the laser-free frame,
 *  all guaranteed to sit on the fire row (pt1-27). */
function beamPixels(state: SimState): { cols: number[]; inkAt: (col: number) => number } {
  const withBeam = composeFrame(state, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  const without = composeFrame({ ...state, lasers: [] } as SimState, LOGICAL_WIDTH, LOGICAL_HEIGHT)
  const cols: number[] = []
  const row = 120
  for (let i = 0; i < withBeam.data.length; i++) {
    if (withBeam.data[i] !== without.data[i]) {
      expect(Math.floor(i / withBeam.width), 'laser ink off the fire row (pt1-27 y-capture broke)').toBe(row)
      cols.push(i % withBeam.width)
    }
  }
  return { cols, inkAt: (col: number) => withBeam.data[row * withBeam.width + col] }
}

describe('df8-4 AC3 — the beam is the ROM-laid streak, long with a bright tip (DEFA7.SRC:2799-2827)', () => {
  it('the streak spans at least the $500 head span (~10 px) — not the 4 px stub', () => {
    const { cols } = beamPixels(laserOnlyState('right'))
    expect(cols.length, 'no beam drawn at all').toBeGreaterThan(0)
    const span = Math.max(...cols) - Math.min(...cols) + 1
    expect(
      span,
      `the beam spans ${span} px — the ROM lays 4×$11 + $99 ($500 ≈ 10 px minimum; ~15-16 with fissle), not 4`,
    ).toBeGreaterThanOrEqual(BEAM_SPAN_MIN_PX)
    expect(span, 'a beam, not a full-row smear').toBeLessThanOrEqual(BEAM_SPAN_MAX_PX)
  })

  it('a RIGHT beam leads with the bright $99 tip; the body is $11 laser ink', () => {
    const { cols, inkAt } = beamPixels(laserOnlyState('right'))
    expect(cols.length).toBeGreaterThan(0)
    const lead = Math.max(...cols) // right-facing: the leading edge is the rightmost ink
    expect(
      inkAt(lead),
      'the leading pixel must be the bright tip — LDB #$99 (:2808), palette index 9',
    ).toBe(TIP_INK)
    const bodyCount = cols.filter((c) => inkAt(c) === BODY_INK).length
    expect(
      bodyCount,
      'the body must be laid in $11 laser ink (LDB #$11, :2801) — 4 byte-columns ≈ 7-8 px',
    ).toBeGreaterThanOrEqual(6)
  })

  it('a LEFT beam mirrors — the bright tip leads on the LEFT (LASL1 $99, :2857-2858)', () => {
    const { cols, inkAt } = beamPixels(laserOnlyState('left'))
    expect(cols.length).toBeGreaterThan(0)
    const lead = Math.min(...cols) // left-facing: the leading edge is the leftmost ink
    expect(inkAt(lead), 'the left-travelling tip must lead its beam').toBe(TIP_INK)
    const span = Math.max(...cols) - Math.min(...cols) + 1
    expect(span, 'the left beam is the same laid length').toBeGreaterThanOrEqual(BEAM_SPAN_MIN_PX)
  })
})

// ══════════════════════════════════════════════════════════════════════════════════
// AC4 — PRESERVED INVARIANTS: determinism and the pt1-27 y-capture survive the fix.
// (Purity is the armed src/core sweep in purity.test.ts — not duplicated here.)
// ══════════════════════════════════════════════════════════════════════════════════
describe('df8-4 AC4 — determinism and y-capture hold across the laser rework', () => {
  it('two identical seeded runs produce identical laser tracks and identical frames', () => {
    const script = (i: number): Input => withInput({ fire: i % 5 === 0, up: i > 8 })
    const run = (): { track: string; frame: string } => {
      let s = createSim(makeRand(11))
      s = stepSim(s, NEUTRAL)
      const track: number[] = []
      for (let i = 0; i < 20; i++) {
        s = stepSim(s, script(i))
        for (const l of s.lasers) if (l.alive) track.push(l.x)
      }
      const fb = composeFrame(s, LOGICAL_WIDTH, LOGICAL_HEIGHT)
      return { track: track.join(','), frame: fb.data.join(',') }
    }
    const a = run()
    const b = run()
    expect(a.track, 'the same seed+script must fly the same lasers').toBe(b.track)
    expect(a.frame, 'the same seed+script must compose the same frame').toBe(b.frame)
  })

  it('a laser fired from row 120 keeps its row while the ship climbs (pt1-27 holds)', () => {
    let s = createSim(makeRand(7))
    s = stepSim(s, NEUTRAL)
    expect(s.ship.y).toBe(120)
    s = stepSim(s, withInput({ fire: true }))
    // 10 climb ticks — well inside even the fixed ~38-tick flight, so the laser lives.
    for (let i = 0; i < 10; i++) s = stepSim(s, withInput({ up: true }))
    expect(s.ship.y, 'the ship genuinely left the firing row').toBeLessThan(120)
    const laser = s.lasers.find((l) => l.alive)
    expect(laser, 'the laser is still in flight 11 ticks after firing').toBeDefined()
    expect(laser!.y, 'the in-flight laser keeps its captured fire row').toBe(120)
  })
})
