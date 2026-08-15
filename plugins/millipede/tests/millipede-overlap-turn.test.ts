// tests/millipede-overlap-turn.test.ts
//
// Story ml10-1 — RED phase (Han Solo / TEA). Wire the OVRLAP segment-vs-segment
// turn (checkOverlap) into stepMillipede's head reaction, at the ROM ordering.
//
// ─── THE GAP THIS STORY CLOSES ────────────────────────────────────────────────
// checkOverlap (src/core/millipede.ts:405, OVRLAP MLSUB.MAC:896-912) is fully
// built, ROM-cited and unit-tested — but it has ZERO production callers. The head
// reaction in stepMillipede today only turns on the OBSTAC (mushroom) field
// (ml3-6) and the screen edge; it never turns when it overlaps a LIVE segment
// ahead of it on the same line. The confession comment at src/core/millipede.ts:300
// spells this out: the ROM's "no-turn" branch (13$, MILLI.MAC:1541) runs
// JSR OVRLAP FIRST — before the edge/free-space handling — so a head that overlaps
// a live in-front segment must TURN (drop a row) exactly as it does on a mushroom.
//
// ─── WHAT GREEN (Dev) MUST SHIP ───────────────────────────────────────────────
// Wire checkOverlap into stepMillipede's head reaction sequence at the ROM's
// ordering:  OBSTAC (mushroom) turn → OVRLAP (overlap) turn → edge / free-space.
// Reuse checkOverlap AS-IS: its dead-floor guard (colour >= OVRLAP_DEAD_MIN 0xC0)
// and parked-score guard (0xFF) already exist and must be preserved through the
// wiring. checkOverlap needs the whole segment array and the head's own index, so
// the wiring passes those down into the head reaction (an implementation detail
// for Dev). No new game logic — this story is pure WIRING.
//
// ─── WHY THIS IS RED (the load-bearing point) ─────────────────────────────────
// The existing data test on checkOverlap (millipede-split-death.test.ts) PASSES
// today while the turn is DEAD — it calls checkOverlap directly, so it proves the
// function is correct, NOT that anything calls it. Every wiring assertion below
// drives the behaviour through the REAL producer, stepMillipede, and observes the
// head's `v`: a turn descends one step (move(seg, descending) subtracts dv), a
// coast leaves v unchanged. With OVRLAP unwired the head coasts, so the positive
// turns below fail today; once wired, deleting the checkOverlap call reverts them
// to a coast and they fail again.  The observable IS the turn.
//
// ─── SCOPE ────────────────────────────────────────────────────────────────────
// Head reaction only (mirroring the head-only OBSTAC and edge turns). checkOverlap
// itself is unchanged; the OBSTAC math (ml3-6), the split (ml3-2), player collision
// and EXPLOD are out of scope. No-regression to the mushroom-turn / edge-turn paths
// is guarded here by an edge control and by the untouched obstac.test.ts.

import { describe, it, expect } from 'vitest'

// ─── the ROM constants ml10-1 leans on — hand-mirrored (independent of the module,
//     lang-review #26: an assertion whose terms are all read back from the module
//     under test proves nothing) ──────────────────────────────────────────────
const HEAD_COLOR = 0x39 // MT-5 (MILLI.MAC:542)
const BODY_COLOR = 0x3d // MT-6 (MILLI.MAC:600)
const SCORE_COLOR = 0xff // MS-13 (MILLI.MAC:792) — a parked floating score OVRLAP must ignore
const OVRLAP_DEAD_MIN = 0xc0 // MS-3 (MLSUB.MAC:903) — colour >= this ⇒ dead/score, skipped
const POISON_COLOR = 0x1b // MT-7 (MILLI.MAC:1508)
const LEFT_EDGE = 0xf0 // MT-21 (MILLI.MAC:1511)

interface Segment {
  h: number
  v: number
  dh: number
  dv: number
  pic: number
  color: number
}

interface MillipedeModule {
  stepMillipede: (segs: Segment[], frame: number, field?: Uint8Array) => Segment[]
  checkOverlap: (segs: readonly Segment[], headIndex: number) => boolean
}

// Computed specifier (the obstac.test.ts / conway.test.ts house pattern): keeps the
// tree lint-clean and defers resolution to vitest at runtime.
const MILLIPEDE_SPECIFIER = ['..', 'src', 'core', 'millipede'].join('/')
async function loadMillipede(): Promise<MillipedeModule> {
  const mod = (await import(/* @vite-ignore */ MILLIPEDE_SPECIFIER)) as Partial<MillipedeModule>
  if (typeof mod.stepMillipede !== 'function') throw new Error('millipede.ts has no stepMillipede')
  if (typeof mod.checkOverlap !== 'function') throw new Error('millipede.ts has no checkOverlap')
  return mod as MillipedeModule
}

// A head on an 8px cell boundary (v & 7 == 0, so the mid-drop short-circuit at
// MT-19 does not fire), mid-screen (not at an edge), marching right at dv 2. A
// turn descends exactly one step to 0x7E; a coast leaves v at 0x80.
const CELL_V = 0x80
const COAST_V = 0x80 // move(seg, false): v unchanged
const TURN_V = 0x7e // move(seg, true): v - dv = 0x80 - 2, and (0x7E & 7) != 4 so dh does not reverse
const FRAME = 1 // odd frame: the leg-picture animation (even frames) cannot confound the assertion

const head = (o: Partial<Segment> = {}): Segment => ({
  h: 0x80,
  v: CELL_V,
  dh: 2,
  dv: 2,
  pic: 0,
  color: HEAD_COLOR,
  ...o,
})
const seg = (o: Partial<Segment>): Segment => ({ h: 0x80, v: CELL_V, dh: 2, dv: 2, pic: 0, color: BODY_COLOR, ...o })
const emptyField = () => new Uint8Array(0x3c0)

// ═══════════════════════════════════════════════════════════════════════════════
// AC-1 — the WIRING itself: a head that overlaps a live in-front segment TURNS.
//   Head {h:0x80, v:0x80, dh:+2} marching right; a live body 4px AHEAD on the same
//   line (h:0x84) is the OVRLAP the existing data test already proves checkOverlap
//   detects. Through stepMillipede the head must drop a row (v 0x80 → 0x7E) instead
//   of coasting. Two live segments ⇒ no last-head speed-up, so dv stays 2.
// ═══════════════════════════════════════════════════════════════════════════════
describe('ml10-1 AC-1 — stepMillipede turns the head on a segment overlap (OVRLAP, MILLI.MAC:1541 / MLSUB.MAC:896)', () => {
  it('control: a live segment BEHIND the head (no overlap) ⇒ the head coasts level (v unchanged)', async () => {
    const m = await loadMillipede()
    // marching right, a lower-H segment is BEHIND (MS-5 "look only in front of us")
    const segs = [head(), seg({ h: 0x7c })]
    const out = m.stepMillipede(segs, FRAME)
    expect(out[0].v, 'nothing ahead to overlap ⇒ free-space coast at 0x80').toBe(COAST_V)
  })

  it('a live segment 4px AHEAD on the same line makes the head TURN — it descends one row (0x80 → 0x7E)', async () => {
    const m = await loadMillipede()
    const segs = [head(), seg({ h: 0x84 })]
    // sanity: the fixture really is an overlap by checkOverlap's own reckoning
    expect(m.checkOverlap(segs, 0), 'fixture precondition: this IS an overlap').toBe(true)
    const out = m.stepMillipede(segs, FRAME)
    expect(out[0].v, 'overlap ahead ⇒ drop a row (the 15$ turn seam), not coast at 0x80').toBe(TURN_V)
  })

  it('the turn is CAUSED by the overlap: an in-front live segment descends BELOW the behind-only control', async () => {
    const m = await loadMillipede()
    const control = m.stepMillipede([head(), seg({ h: 0x7c })], FRAME) // behind ⇒ coast
    const hit = m.stepMillipede([head(), seg({ h: 0x84 })], FRAME) // ahead ⇒ turn
    // if the checkOverlap call is removed, hit reverts to the control and this fails
    expect(hit[0].v, 'the descend is the observable effect of the OVRLAP wiring').toBeLessThan(control[0].v)
  })

  it('OVRLAP is INDEPENDENT of the mushroom field: the overlap turns the head even with an empty field passed', async () => {
    const m = await loadMillipede()
    // guards against nesting the OVRLAP check inside the `if (field)` OBSTAC branch
    const out = m.stepMillipede([head(), seg({ h: 0x84 })], FRAME, emptyField())
    expect(out[0].v, 'an empty field is not an obstacle, but the overlap still turns the head').toBe(TURN_V)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC-2 — checkOverlap's semantics are PRESERVED through the wiring (it is reused
//   AS-IS). Each guard is paired with a live-overlap positive in the same block so
//   the negative is a discriminator, not a vacuous "still coasts".
// ═══════════════════════════════════════════════════════════════════════════════
describe('ml10-1 AC-2 — the wired turn honours checkOverlap dead/score/direction/line guards (MS-2..6)', () => {
  it('a parked SCORE (0xFF) ahead does NOT turn the head, but a live body at the same cell DOES', async () => {
    const m = await loadMillipede()
    const scoreAhead = m.stepMillipede([head(), seg({ h: 0x84, color: SCORE_COLOR })], FRAME)
    expect(scoreAhead[0].v, 'a floating score (>= 0xC0) is not collidable ⇒ coast').toBe(COAST_V)
    const liveAhead = m.stepMillipede([head(), seg({ h: 0x84, color: BODY_COLOR })], FRAME)
    expect(liveAhead[0].v, 'a live body at the same cell IS collidable ⇒ turn').toBe(TURN_V)
  })

  it('a DEAD segment (colour >= 0xC0) ahead is skipped; a colour one below the floor (0xBF) turns the head', async () => {
    const m = await loadMillipede()
    const deadAhead = m.stepMillipede([head(), seg({ h: 0x84, color: OVRLAP_DEAD_MIN })], FRAME)
    expect(deadAhead[0].v, 'colour 0xC0 is at the dead floor ⇒ skipped ⇒ coast').toBe(COAST_V)
    const liveAhead = m.stepMillipede([head(), seg({ h: 0x84, color: OVRLAP_DEAD_MIN - 1 })], FRAME)
    expect(liveAhead[0].v, 'colour 0xBF is below the dead floor ⇒ a real overlap ⇒ turn').toBe(TURN_V)
  })

  it('"ahead" tracks the heading: marching LEFT, a lower-H segment turns the head and a higher-H one does not', async () => {
    const m = await loadMillipede()
    const aheadLeft = m.stepMillipede([head({ dh: -2 }), seg({ h: 0x7c, dh: -2 })], FRAME)
    expect(aheadLeft[0].v, 'marching left, a lower-H segment is AHEAD ⇒ turn').toBe(TURN_V)
    const behindLeft = m.stepMillipede([head({ dh: -2 }), seg({ h: 0x84, dh: -2 })], FRAME)
    expect(behindLeft[0].v, 'marching left, a higher-H segment is BEHIND ⇒ coast').toBe(COAST_V)
  })

  it('a segment on a DIFFERENT line never overlaps ⇒ the head coasts', async () => {
    const m = await loadMillipede()
    const out = m.stepMillipede([head(), seg({ h: 0x84, v: 0x88 })], FRAME)
    expect(out[0].v, 'different line ⇒ no overlap ⇒ coast').toBe(COAST_V)
  })
})

// ═══════════════════════════════════════════════════════════════════════════════
// AC-3 — NO REGRESSION to the neighbouring reaction branches. The OVRLAP turn sits
//   AFTER the OBSTAC turn and BEFORE the edge/free-space handling, so both must
//   still work. The mushroom (OBSTAC) path has its own suite (obstac.test.ts); here
//   we pin the edge turn (the branch now downstream of OVRLAP) and free-space coast.
// ═══════════════════════════════════════════════════════════════════════════════
describe('ml10-1 AC-3 — the edge turn and free-space coast still work downstream of the OVRLAP check', () => {
  it('a lone head with no segment to overlap still coasts level in free space (v unchanged)', async () => {
    const m = await loadMillipede()
    const out = m.stepMillipede([head()], FRAME)
    expect(out[0].v, 'no overlap, not at an edge ⇒ pure free-space MOTION').toBe(COAST_V)
  })

  it('a head at the LEFT edge marching right still turns (descends) even with no overlap', async () => {
    const m = await loadMillipede()
    // h at LEFT_EDGE (0xF0) marching right (dh>=0) ⇒ the MT-21 edge turn fires
    const out = m.stepMillipede([head({ h: LEFT_EDGE })], FRAME)
    expect(out[0].v, 'the edge turn still descends a row (0x80 → 0x7E)').toBe(TURN_V)
  })

  it('poison is untouched: a poisoned head is not diverted by the overlap wiring (still a segment step)', async () => {
    const m = await loadMillipede()
    // a poisoned head dives (MT-7) regardless of overlap; assert the overlap wiring
    // did not swallow that branch — v changes (it descends), colour stays poison.
    const out = m.stepMillipede([head({ color: POISON_COLOR }), seg({ h: 0x84 })], FRAME)
    expect(out[0].color, 'a poisoned head stays poisoned').toBe(POISON_COLOR)
    expect(out[0].v, 'a poisoned head dives (descends), not coasts').toBeLessThan(CELL_V)
  })
})
