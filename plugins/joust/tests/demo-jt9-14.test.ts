// tests/demo-jt9-14.test.ts
//
// Story jt9-14 — RED phase (Mr. Praline / TEA). THE PLAYER-VS-PTERO ATTACK IS
// BOX-ONLY, the third overlap pass that stops at broadPhase.
//
// ─── RED TODAY ───────────────────────────────────────────────────────────────
// `collisionPass` has THREE overlap passes; only two consult a mask.
//   • joust pass          (demo.ts) — broadPhase THEN narrowPhase. ✓
//   • player-vs-egg catch (demo.ts) — broadPhase THEN narrowPhase. ✓ (jt8-7)
//   • player-vs-ptero     (demo.ts) — broadPhase, then resolvePteroAttack.
//                                                NO narrowPhase. ← THE DEFECT.
// So the player's reach against a pterodactyl is the flat 16px ENTITY_BOX_H,
// exactly the bug jt8-7 fixed for eggs. `collisionMaskFor` already returns the
// real transcribed mask 'PT1RC' for a ptero (demo.ts); the pass that most
// needs it never asks.
//
// ─── THE ROM SETTLES THE PREMISE (the story's "settle this first") ───────────
// The port's narrowPhase is a model of BPCOL (JOUSTRV4.SRC:7043). The ROM runs
// BPCOL as a PRECONDITION to the whole player-vs-ptero dispatch:
//     OSTXYP  JSR  BPCOL      the span-mask collision test  (:4944)
//             BCS  OSTHIT     ONLY on a collision → dispatch (:4945)
//     OSTHIT  ...             player-vs-ptero lance compare  (:4971-5001)
// So wiring narrowPhase into this pass MATCHES the machine — CONFIRMED. The
// companion file demo-jt9-14-source.test.ts pins those ROM lines.
// (A separate, pre-existing divergence — narrowPhase drops BPCOL's COLDX screen-X
// term — is filed as a follow-up; it is NOT this story's fix. Every fixture here
// is staged at dx=0, so COLDX=0 and these bands are invariant under that fix.)
//
// ─── WHERE THE FIXTURES SIT (the jt8-3 rule: where the two maps DISAGREE) ─────
// Measured (see the TEA Assessment's calibration) for player airborne (CWNG3R,
// 13 rows) × ptero (PT1RC, 6 real rows), dy = pteroTop − playerTop:
//
//   dy            16px box   CWNG3R×PT1RC mask   glide kill band (lance 8..12)
//   −15 .. −10    accepts    REJECTS            kill at −12..−10   ← box-only KILL
//   −9  .. −8     accepts    accepts            kill               ← real lance kill
//   −7  .. +8     accepts    accepts            —  (pteroWins)     ← real player death
//   +9  .. +15    accepts    REJECTS            —  (pteroWins)     ← box-only PLAYER DEATH
//   |dy| >= 16    rejects    rejects            —
//
// The kill band and the mask overlap ONLY at dy −9/−8 — a lance kill is faithful
// to the ROM only in that tight window (at dx=0 the ROM's BPCOL == this mask).
// The box-only bands are where today's pass wrongly resolves a contact the mask
// (and the machine) reject.

import { describe, it, expect } from 'vitest'
import { createWaveDemo, stepDemo, type DemoProcess, type DemoState } from '../src/core/demo.js'
import { broadPhase, type CollisionBox } from '../src/core/joust.js'
import type { EntityState } from '../src/core/flight.js'

const SEED = 0x1234
const PLAYER = 1
const PTERO = 0xb30
const PLAYER_TOP = 110

/** Gravity-exempt hover: velY 0 so stepPteroFlight holds altitude; the player's
 *  velY 0 / timeUp 1 keeps its top within <0.1px across the short window. */
function entity(over: Partial<EntityState> = {}): EntityState {
  return {
    posX: 100, posY: PLAYER_TOP << 8, velXIndex: 0, velXFrac: 0, velY: 0, timeUp: 1,
    groundState: null, plantZ: 0, airborne: true, animPhase: 0, ...over,
  }
}

/** Only [player, ptero, wave-anchor] in the sim — the anchor holds the wave open
 *  without ever colliding (jt5-16's idiom); nothing else can resolve. */
function only(procs: DemoProcess[]): DemoState {
  const base = createWaveDemo(SEED)
  const anchor = base.sim.processes.find((p) => p.kind === 'enemy')
  if (!anchor) throw new Error('wave 1 must supply a ground enemy to hold the wave open')
  return {
    ...base,
    sim: { ...base.sim, processes: [...procs, anchor], budget: { nsmart: 0, wsmart: 0 } },
    events: [],
  }
}

const hush = (d: DemoState, keep: number): DemoState => ({
  ...d,
  sim: {
    ...d.sim,
    processes: d.sim.processes.map((p) =>
      p.kind === 'player' || p.id === keep ? p : { ...p, nap: 100_000 },
    ),
  },
})

const box = (x: number, top: number): CollisionBox => ({ x, y: top, w: 16, h: 16 })

interface Outcome {
  pteroAlive: boolean
  playerAlive: boolean
  scored1000: boolean
  deathCues: string[]
  boxesOverlap: boolean
}

/**
 * Stage a player and a single ptero at vertical offset `dy` (= pteroTop −
 * playerTop) and horizontal offset `dx`, opposite facings, the player facing
 * into the ptero. Step up to 3 frames and report the resolved outcome. The
 * staged boxes' overlap is captured as the box-only PRECONDITION.
 */
function contact(dy: number, dx = 0): Outcome {
  const pteroTop = PLAYER_TOP + dy
  const player: DemoProcess = {
    id: PLAYER, cls: 'primary', nap: 1, period: 1, kind: 'player', facing: 1, mount: 'ostrich',
    collisionEnabled: true, entity: entity({ posX: 100, posY: PLAYER_TOP << 8 }),
  }
  const ptero: DemoProcess = {
    id: PTERO, cls: 'secondary', nap: 1, period: 1, kind: 'ptero', facing: -1,
    collisionEnabled: true, entity: entity({ posX: 100 + dx, posY: pteroTop << 8 }),
  }
  const boxesOverlap = broadPhase(box(100, PLAYER_TOP), box(100 + dx, pteroTop))
  let d = only([player, ptero])
  const deathCues: string[] = []
  for (let f = 0; f < 3; f++) {
    d = hush(d, PTERO)
    d = stepDemo(d, {})
    deathCues.push(...d.cues.map((c) => c.type as string).filter((c) => /-death$/.test(c)))
  }
  return {
    pteroAlive: d.sim.processes.some((p) => p.id === PTERO),
    playerAlive: d.sim.processes.some((p) => p.id === PLAYER),
    scored1000: d.events.some((e) => e.kind === 'score' && e.reason === 'kill'),
    deathCues,
    boxesOverlap,
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 — THE KILL PATH IS BOX-ONLY: a ptero the mask clears is still lanced today.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-14 AC-1 — the player-vs-ptero pass consults PT1RC after broadPhase', () => {
  it('a ptero 11px above (in the kill band, inside the box, CLEAR of the mask) is NOT killed', () => {
    // THE HEADLINE. RED today: the box accepts dy=-11 and the lance band is
    // 10±2, so the ptero is lanced from clear of PT1RC. Kills the do-nothing
    // mutant. Non-vacuity: the box-overlap precondition proves they touch, and
    // AC-2's offset-9 kill is the same harness producing a kill.
    const r = contact(-11)
    expect(r.boxesOverlap, 'precondition: the 16px boxes really overlap (box-only)').toBe(true)
    expect(r.pteroAlive, 'dy=-11 is box-only — the mask must spare the ptero').toBe(true)
    expect(r.scored1000, 'and no 1000-pt kill is scored').toBe(false)
    expect(r.deathCues, 'and no death cue fires — nothing resolved').toEqual([])
    expect(r.playerAlive, 'and the player is untouched').toBe(true)
  })

  it('a ptero 12px above (band edge, box-only) is likewise NOT killed', () => {
    const r = contact(-12)
    expect(r.boxesOverlap, 'precondition: boxes overlap').toBe(true)
    expect(r.pteroAlive, 'dy=-12 is box-only — the ptero survives').toBe(true)
    expect(r.scored1000).toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-2 — THE KILL STILL FIRES WHERE THE MASK AGREES (guards over-tightening).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-14 AC-2 — a lance kill inside the mask still resolves', () => {
  it('a ptero 9px above (in the band AND the mask) is killed — 1000 + one ptero-death', () => {
    // PASSES TODAY. Kills every over-tightening fix (shrink the box, demand
    // exact co-location, drop the pass): those all fail to kill here.
    const r = contact(-9)
    expect(r.pteroAlive, 'dy=-9 is a real lance kill — the ptero dies').toBe(false)
    expect(r.scored1000, 'the 1000-pt SCRHUN kill is scored').toBe(true)
    expect(r.deathCues, 'exactly one ptero-death, no player-death').toEqual(['ptero-death'])
    expect(r.playerAlive, 'the knight survives the kill').toBe(true)
  })

  it('a ptero 8px above (band + mask edge) is still killed', () => {
    // PASSES TODAY. The lower edge of the kill×mask window; a fix that lands the
    // cutoff one pixel high loses this kill.
    const r = contact(-8)
    expect(r.pteroAlive, 'dy=-8 is still a lance kill').toBe(false)
    expect(r.scored1000).toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — THE KILL BOUNDARY IS SHARP AT THE MASK EDGE.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-14 AC-3 — the kill cutoff follows the mask, not the box', () => {
  it('dy=-9 kills the ptero, dy=-10 (one px further, box-only) does NOT', () => {
    // One pixel apart, opposite sides of the CWNG3R×PT1RC edge, BOTH inside the
    // 10±2 band and the 16px box. Today both kill (box-only). A fix that tightens
    // the BOX instead of consulting the mask cannot place its cutoff exactly here
    // AND at the +8/+9 player-death edge below — only the mask can.
    expect(contact(-9).pteroAlive, 'dy=-9 is the last mask-agreeing kill row').toBe(false)
    expect(contact(-10).pteroAlive, 'dy=-10 is the first box-only row — spared').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-4 — THE PLAYER-DEATH PATH IS BOX-ONLY TOO (pteroWins, the OSTBO fallback).
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-14 AC-4 — a box-only ptero cannot kill the PLAYER either', () => {
  it('a ptero 12px below (out of band, inside the box, CLEAR of the mask) does NOT take the player', () => {
    // RED today: the box accepts dy=+12, the contact resolves the OSTBO fallback
    // (pteroWins) and the knight dies from a pterodactyl visibly clear of him.
    const r = contact(12)
    expect(r.boxesOverlap, 'precondition: boxes overlap (box-only)').toBe(true)
    expect(r.playerAlive, 'dy=+12 is box-only — the mask must spare the knight').toBe(true)
    expect(r.deathCues, 'and no death cue fires').toEqual([])
    expect(r.pteroAlive, 'and the ptero flies on').toBe(true)
  })

  it('the pteroWins boundary is SHARP: dy=+8 takes the player, dy=+9 (box-only) does not', () => {
    // The mirror edge. dy=+8 is a mask HIT out of the kill band → pteroWins →
    // the knight dies. dy=+9 is one px further, a mask MISS → spared. Today both
    // kill the knight; only the mask discriminates them.
    expect(contact(8).playerAlive, 'dy=+8 is mask-agreeing pteroWins — knight dies').toBe(false)
    expect(contact(9).playerAlive, 'dy=+9 is box-only — knight spared').toBe(true)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-5 — broadPhase IS NOT REMOVED: narrowPhase ignores screen X.
// ─────────────────────────────────────────────────────────────────────────────
describe('jt9-14 AC-5 — the mask does not replace broadPhase (it is X-blind)', () => {
  it('a ptero 64px away in X at lance height resolves NOTHING', () => {
    // PASSES TODAY. Kills the "delete broadPhase, rely on the mask" mutant:
    // narrowPhase compares sprite-local columns and never sees screen X, so at
    // dy=-9 the masks overlap regardless of a 64px horizontal gap. broadPhase is
    // the only thing carrying X, and it must stay.
    const r = contact(-9, 64)
    expect(r.boxesOverlap, 'precondition: 64px in X is OUTSIDE the box').toBe(false)
    expect(r.pteroAlive, 'a ptero 64px away is not lanced').toBe(true)
    expect(r.playerAlive, 'and the far ptero does not take the player').toBe(true)
    expect(r.deathCues, 'nothing resolves at 64px').toEqual([])
  })

  it('a co-located out-of-band ptero (mask hit) still takes the player — the mask agrees', () => {
    // PASSES TODAY and after. dy=0 is a mask HIT out of the kill band → the OSTBO
    // fallback (pteroWins). Guards against an over-tightening that drops the
    // mask-agreeing contact along with the box-only ones.
    const r = contact(0)
    expect(r.playerAlive, 'a superimposed out-of-band ptero takes the knight').toBe(false)
    expect(r.deathCues, 'exactly the one player-death').toEqual(['player-death'])
    expect(r.pteroAlive, 'the ptero survives its win').toBe(true)
  })
})
