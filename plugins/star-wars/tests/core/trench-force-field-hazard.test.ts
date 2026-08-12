// tests/core/trench-force-field-hazard.test.ts
//
// Story sw11-3 — RED phase (Han Solo / TEA): the trench catwalk is a CHANNEL-
// SPANNING member seated in a top/bottom band, dodged by DIVING/CLIMBING —
// NOT a single-wall force-field fin dodged by steering to the other wall.
// This REWORKS finding B-012 (sw7-19), which modelled the catwalk as one wall's
// panel with a lateral (side) gate. That side gate is the defect.
//
// -- WHAT THE ROM ACTUALLY DOES (WSPANL.MAC, 1983 source; radix 16) -----------
//
// The panel collision runs TWICE per trench segment, once per wall:
//   PNVLW  ;VIEW LEFT WALL PANELS   → LDD M$TY / IFLE ;?ON LEFT SIDE?   (:199)
//   PNVRW  ;VIEW RIGHT WALL PANELS  → LDD M$TY / IFGE ;?ON RIGHT SIDE?  (:367)
// BOTH are called for the same segment, so a force-field row has a LEFT panel AND
// a RIGHT panel at the same height band. A pilot on the left hits the left panel;
// a pilot who "steers to the right wall" just hits the right panel. There is no
// lateral escape — the row spans the channel. The HIT gate is VERTICAL:
//
//   LDD M.Z0 / ADDD #200      ;TOP OF FORCE FIELD
//   SUBD M$TZ / IFGE          ;?FORCE FIELD ABOVE PLAYER?     ← vertical
//   SUBD #400 / IFLE          ;?BUT NOT TOO FAR?              ← $400 band (Z)
//   LDD M.X0 / SUBD M$TX / SUBD #400 / IFLS ;?WITHIN FIRST HALF? ← depth
//   → LDA #TD$WFG  ;HIT: glow + AUDCR crash + roll
//
// and the panels themselves stack $400 apart in Z (`ADDD #400 ;MOVE UP TO NEXT
// PANEL`, :240). So the dodge is to leave the band vertically — dive under a top
// catwalk, climb over a bottom catwalk. `.WGD WFG`'s ";CATWALK COLOR WHEN
// COLLIDED" (WSOBJ.MAC:1834) confirms WFF/WFG IS the catwalk; and TWDG92-96
// (WSBASE.MAC:878-906) name the "8 PANEL DIVIDER WITH CATWALK AT TOP/BOTTOM" —
// a full row across the channel, seated at a top or bottom band.
//
// -- WHAT B-012 GOT RIGHT, AND WHAT IT GOT WRONG ------------------------------
//
// RIGHT: the object identity (the catwalk IS the wall force field, TD$WFF/WFG)
//   and the single-panel model shape (`.WP WFF`, a vertical fin) — unchanged, and
//   still pinned by trench-force-field-rom.test.ts. NOT this story's concern.
// WRONG: it placed ONE panel on ONE wall and gated the graze on the pilot's
//   lateral side (`onFieldSide`), so steering to the far wall dodged it. The ROM
//   places the row on BOTH walls at the band and never checks lateral distance —
//   the graze is vertical-band-gated and channel-spanning.
//
// -- REPRESENTATION CONTRACT (declared here; Dev's grid-derived spawning meets it)
//
// A channel-spanning catwalk is a trench obstacle of kind 'catwalk' whose lateral
// pos[1] is the channel CENTRE (0) — it is NOT mounted to a wall sign. pos[2] is
// its band height (a top or a bottom band); pos[0] is its downrange depth. The
// graze fires whenever the pilot's VERTICAL trenchView[2] is within the field's
// band AND it is within the depth window — INDEPENDENT of the pilot's lateral
// trenchView[1]. The contact is a GRAZE ('terrain-crash', NO shield — the shield
// accounting rides WSGLOW, S-016 scope, a later story). The EXACT band ($200 top
// offset / $400 height) and the grid slot→band-height map are Dev's to derive
// from the wedge grid; this suite pins the OBSERVABLE (which HEIGHT grazes vs
// clears, and that LATERAL side never matters), not those literals.

import { describe, it, expect } from 'vitest'
import { initialState, type GameState, type TrenchObstacle } from '../../src/core/state'
import { stepGame, enterPhase } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import { TRENCH_EYE_SEAT, TRENCH_EYE_MIN, TRENCH_EYE_MAX } from '../../src/core/trench-channel'
import type { Vec3 } from '@shared/math3d'

/**
 * An isolated trench holding ONLY the given catwalk hazard(s) and no exhaust
 * port, seated at the given pilot viewpoint. No port ⇒ the catwalk contact is the
 * only thing that can touch a shield, so the count is clean.
 */
function trenchWith(obstacles: TrenchObstacle[], view: Vec3): GameState {
  return {
    ...enterPhase(initialState(), 'trench'),
    mode: 'playing',
    exhaustPort: null,
    projectiles: [],
    trenchObstacles: obstacles.map((o) => ({ kind: o.kind, pos: [...o.pos] as Vec3 })),
    trenchView: [...view] as Vec3,
  }
}

/**
 * A channel-spanning catwalk: seated at band height `y`, downrange `depth`
 * (positive = ahead of the cockpit). Lateral pos[1] is the channel centre (0):
 * the catwalk spans the width, so which wall the pilot hugs is immaterial.
 */
const catwalk = (y: number, depth = 1): TrenchObstacle => ({ kind: 'catwalk', pos: [depth, 0, y] })

// Lateral pilot offsets, inside the ROM ±511 clamp. Vertical dodging is the only
// dodge, so these must ALL graze an in-band catwalk.
const FAR_LEFT = -500
const CENTRE = 0
const FAR_RIGHT = 500
const DT = 1 / 60

/** Drive a hands-off pilot until the hazard clears (or a cap), reporting whether
 *  a crash EVER fired and the net shields spent. NO_INPUT holds trenchView fixed. */
function flyThrough(s0: GameState): { crashSeen: boolean; shieldsLost: number } {
  let s = s0
  const lives0 = s.lives
  let crashSeen = false
  for (let i = 0; i < 120 && s.trenchObstacles.length > 0; i++) {
    s = stepGame(s, NO_INPUT, DT)
    if (s.events.some((e) => e.type === 'terrain-crash')) crashSeen = true
  }
  return { crashSeen, shieldsLost: lives0 - s.lives }
}

describe('sw11-3 — the catwalk spans the channel: vertical-band graze, NO lateral dodge', () => {
  it('grazes an in-band pilot and costs NO shield (the graze contract, preserved)', () => {
    // A catwalk at the pilot's height, just downrange; pilot centred at that
    // height. It grazes (crash sound), and a graze spends no shield (WSGLOW/S-016
    // scope, not this story).
    const s0 = trenchWith([catwalk(TRENCH_EYE_SEAT)], [0, CENTRE, TRENCH_EYE_SEAT])
    const { crashSeen, shieldsLost } = flyThrough(s0)
    expect(crashSeen, 'the catwalk grazes the in-band pilot').toBe(true)
    expect(shieldsLost, 'a graze costs no shield').toBe(0)
  })

  it('is CHANNEL-SPANNING: grazes a left, a centre AND a right pilot at band height', () => {
    // The headline of sw11-3. The catwalk spans the width, so lateral position
    // cannot dodge it. RED against B-012: a centred (pos[1]=0) field side-gates to
    // trenchView[1] >= 0, so the FAR-LEFT pilot flies clear today. All three must
    // graze once the lateral gate is gone.
    for (const lateral of [FAR_LEFT, CENTRE, FAR_RIGHT]) {
      const { crashSeen } = flyThrough(trenchWith([catwalk(TRENCH_EYE_SEAT)], [0, lateral, TRENCH_EYE_SEAT]))
      expect(crashSeen, `a pilot at lateral ${lateral}, in the band, grazes`).toBe(true)
    }
  })

  it('lateral steering is NOT a dodge: hugging the far wall at band height still grazes (inverts B-012)', () => {
    // B-012 let a pilot dodge a left-wall field by holding the right wall. The
    // spanning catwalk has no such escape: a pilot pinned to the far edge, still at
    // the band height, grazes. RED today (the opposite side flies clear).
    const s0 = trenchWith([catwalk(TRENCH_EYE_SEAT)], [0, FAR_LEFT, TRENCH_EYE_SEAT])
    const { crashSeen, shieldsLost } = flyThrough(s0)
    expect(crashSeen, 'no lateral escape from a channel-spanning catwalk').toBe(true)
    expect(shieldsLost).toBe(0)
  })

  it('the vertical dodge clears it: a pilot a full channel away in HEIGHT flies clear, any side', () => {
    // A LOW (bottom-band) catwalk and a pilot climbed to the ceiling — separated in
    // height by far more than any ROM band ($400) — must NOT graze, even hugging the
    // far wall. Robust to the exact band size: the extreme is unambiguous.
    const climbed = flyThrough(trenchWith([catwalk(TRENCH_EYE_MIN)], [0, FAR_LEFT, TRENCH_EYE_MAX]))
    expect(climbed.crashSeen, 'a pilot a full channel above a low catwalk is clear').toBe(false)
    expect(climbed.shieldsLost).toBe(0)
  })

  it('a TOP-band catwalk grazes a high pilot and clears a dived one — dodge is DIVE', () => {
    // Both pilots centred, so only HEIGHT decides. A top-band catwalk (high y)
    // grazes the pilot who rides high and clears the pilot who dives to the floor.
    const topBand = () => [catwalk(TRENCH_EYE_MAX)]
    const high = flyThrough(trenchWith(topBand(), [0, CENTRE, TRENCH_EYE_MAX]))
    const dived = flyThrough(trenchWith(topBand(), [0, CENTRE, TRENCH_EYE_MIN]))
    expect(high.crashSeen, 'a high pilot grazes the top catwalk').toBe(true)
    expect(dived.crashSeen, 'diving to the floor clears the top catwalk').toBe(false)
  })

  it('a BOTTOM-band catwalk grazes a low pilot and clears a climbed one — dodge is CLIMB', () => {
    // The mirror: a bottom-band catwalk (low y) grazes the low pilot and clears the
    // one who climbs to the ceiling. Both bands exist (TWDG top/bottom), and neither
    // dodge is lateral.
    const bottomBand = () => [catwalk(TRENCH_EYE_MIN)]
    const low = flyThrough(trenchWith(bottomBand(), [0, CENTRE, TRENCH_EYE_MIN]))
    const climbed = flyThrough(trenchWith(bottomBand(), [0, CENTRE, TRENCH_EYE_MAX]))
    expect(low.crashSeen, 'a low pilot grazes the bottom catwalk').toBe(true)
    expect(climbed.crashSeen, 'climbing to the ceiling clears the bottom catwalk').toBe(false)
  })

  it('does NOT graze while the catwalk is still far downrange (guards an over-eager depth gate)', () => {
    // One frame with the catwalk parked deep in the channel: no sane depth gate
    // (within the field's first $400) should register a hit this far out — even for
    // an in-band pilot.
    const s0 = trenchWith([catwalk(TRENCH_EYE_SEAT, 8000)], [0, CENTRE, TRENCH_EYE_SEAT])
    const s1 = stepGame(s0, NO_INPUT, DT)
    expect(s1.events.some((e) => e.type === 'terrain-crash')).toBe(false)
    expect(s1.lives).toBe(s0.lives)
    expect(s1.trenchObstacles).toHaveLength(1) // still ahead, still airborne
  })
})
