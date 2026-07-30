// tests/sim-assembly.test.ts
//
// Story cp2-5 — RED phase (O'Brien / TEA). The routed cp2-3/cp2-4 fixes that the
// sim ASSEMBLY makes live:
//   (a) the SHOOT top-of-screen guard  — resolveShotHit skips MOBJV>=0xF8 (CT-69)
//   (b) the ±1 OBSTAC probe            — MOTION looks ONE cell ahead, not CENTIS
//                                        cells (CT-48/65) — a corrected-fidelity re-pin
//   (c) the mushroom-priority ordering — stepSim runs stepShot FIRST, then
//                                        resolveShotHit only if the shot survived
//                                        (SHOOT reaches the segment loop only on an
//                                        empty cell, :2150 — the Dev-contract order)
//
// RED because none of (a)/(b)/(c) is built: resolveShotHit still kills a top-row
// segment; stepHead still probes at CENTIS (±2); stepSim carries no train, so no
// shot ever reaches a segment. Each assertion below reddens for that specific gap.

import { describe, it, expect } from 'vitest'
import {
  createPlayfield,
  PLYFLD_STRIDE,
  MUSHROOM_FULL,
  type Playfield,
} from '../src/core/playfield'
import {
  stepCentipede,
  resolveShotHit,
  createCentipede,
  CENT_HEAD_PIC,
  CENT_BODY_PIC,
  CENT_BOTTOM_V,
  CENT_BOUNCE_TOP_V,
  CENT_ENTER_V,
  DEAD_BIT,
  SCORE_BODY,
  type Segment,
} from '../src/core/centipede'
import type { Shot } from '../src/core/player'
import { createSim, stepSim, type SimState } from '../src/core/sim'

// The OBSTAC grid cell for a pixel (h,v) at dir 0 (col=(0xF7-h)>>3, row=(v+4)>>3).
const cellOf = (h: number, v: number) => ({ col: (0xf7 - h) >> 3, row: (v + 4) >> 3 })

type SimExt = SimState & { segs: Segment[] }
const ext = (s: SimState) => s as SimExt

// ─── (b) the ±1 OBSTAC probe — corrected-fidelity re-pin (CT-48/65) ──────────────
//
// cp2-3 pinned MOTION's turn behaviourally (Design Deviation "direction-of-change
// over frame windows"), and its RED tests use dh=1 lone heads + plantAhead over
// BOTH the 1- and 2-cell-ahead cells, so NO cp2-3 assertion baked ±2 into a hard
// expectation (verified: tests/centipede.test.ts, tests/obstac.test.ts stay green
// under the fix — obstac.test asserts the ROUTINE obstacleCellFor(h,v,2)=col-2,
// which is correct; only stepHead's CALL changes from seg.dh to Math.sign(seg.dh)).
// This is the one behaviour that DID differ and was never pinned: a CENTIS-speed
// (dh=2) head must look exactly ONE cell ahead, so it marches one cell CLOSER to a
// mushroom before turning than the current ±2 code does.
describe('cp2-5 MOTION — a CENTIS-speed head probes exactly ONE cell ahead (CT-48/65)', () => {
  function run(segs: Segment[], field: Playfield, n: number): Set<string> {
    const occupied = new Set<string>()
    let cur = segs
    for (let f = 0; f < n; f++) {
      cur = stepCentipede(cur, field)
      for (const s of cur) {
        const { col, row } = cellOf(s.h, s.v)
        occupied.add(`${col},${row}`)
      }
    }
    return occupied
  }

  it('a dh=2 head marches INTO the 1-cell-ahead cell before turning at a mushroom 2 cells ahead', () => {
    // head col = (0xF7-0x80)>>3 = 14, row = (0x40+4)>>3 = 8.
    const head: Segment = { h: 0x80, v: 0x40, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const start = cellOf(head.h, head.v) // {col:14, row:8}
    const field = createPlayfield()
    // Mushroom exactly TWO cells ahead (col 12); the ONE-cell-ahead cell (col 13)
    // is left EMPTY.
    field.cells[(start.col - 2) * PLYFLD_STRIDE + start.row] = MUSHROOM_FULL

    const occupied = run([head], field, 30)
    const oneAhead = `${start.col - 1},${start.row}` // "13,8"
    const twoAhead = `${start.col - 2},${start.row}` // "12,8" (the mushroom cell)

    // ROM (±1, CT-48): looks one cell ahead → marches into col 13, THEN turns.
    expect(occupied.has(oneAhead), 'the head enters the 1-cell-ahead cell (ROM probes ±1, not ±CENTIS)').toBe(true)
    // Both probes still stop it entering the mushroom's own cell (control).
    expect(occupied.has(twoAhead), 'the head never enters the mushroom cell itself').toBe(false)
  })
})

// ─── (a) the SHOOT top-of-screen guard (CT-69) ───────────────────────────────────
describe('cp2-5 SHOOT — a segment at the top entry row (MOBJV>=0xF8) is NOT shootable (CT-69)', () => {
  const liveShot = (h: number, v: number): Shot => ({ h, v, live: true })

  it('resolveShotHit SKIPS a live segment at v=0xF8 even inside the collision window', () => {
    // The climbing shot reaches v=0xF9 for one frame (advance from v<0xF3, +7);
    // a top-row segment at v=0xF8 is |dV|=1 inside the V window (<5) but the ROM
    // (:2179-2182 CMP I,0F8 / BCS) skips it as "off top of screen".
    const seg: Segment = { h: 0x80, v: 0xf8, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    const hit = resolveShotHit(liveShot(0x80, 0xf9), [seg], field)
    expect(hit.hitIndex, 'a segment at the 0xF8 entry row is off-top and not hit').toBe(-1)
    expect(hit.scored, 'no score for a skipped top-row segment').toBe(0)
    expect(hit.shot.live, 'the shot is not consumed by a skipped segment').toBe(true)
  })

  it('the SAME segment ONE row below the top (v=0xF6) IS shootable (the guard is exactly >=0xF8)', () => {
    const seg: Segment = { h: 0x80, v: 0xf6, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    const hit = resolveShotHit(liveShot(0x80, 0xf9), [seg], field)
    expect(hit.hitIndex, 'a segment below the 0xF8 line is a normal hit').toBe(0)
  })
})

// ─── (c) the sim ASSEMBLY: the train is wired + mushroom priority ─────────────────
describe('cp2-5 sim assembly — stepSim wires shot-vs-segment combat (Dev-contract order)', () => {
  it('a shot in a body segment’s window kills it and scores SCORE_BODY', () => {
    let s = ext(createSim(0x7777))
    s.playfield.cells.fill(0) // no mushroom to intercept the shot
    // A live shot climbing at v=0x40; a body at v=0x47 = exactly the shot’s
    // position AFTER stepShot advances it +7 (SHOT_SPEED), same column.
    const body: Segment = { h: s.player.h, v: 0x47, dh: 2, dv: 2, pic: CENT_BODY_PIC }
    s = ext({ ...s, shot: { h: s.player.h, v: 0x40, live: true }, segs: [body] } as SimState)
    const scoreBefore = s.score

    const after = ext(stepSim(s, { dh: 0, dv: 0, fire: false }))
    expect(after.segs, 'stepSim must carry the train through the frame').toBeDefined()
    expect((after.segs[0].pic & 0x80) !== 0, 'the body was killed (bit 7 set — exploding/vacant)').toBe(true)
    expect(after.score - scoreBefore, 'killing a body scores SCORE_BODY (10)').toBe(SCORE_BODY)
  })

  it('a mushroom in the shot’s cell takes PRIORITY — the segment behind it is spared', () => {
    let s = ext(createSim(0x8888))
    s.playfield.cells.fill(0)
    // The cell the shot probes on its next step (obstacleCell at v+1).
    const shotV = 0x40
    const cell = cellOf(s.player.h, shotV + 1)
    s.playfield.cells[cell.col * PLYFLD_STRIDE + cell.row] = MUSHROOM_FULL
    // A body sitting where the advanced shot WOULD be (v+7) — resolveShotHit
    // would kill it, but stepShot must consume the shot on the mushroom FIRST.
    const body: Segment = { h: s.player.h, v: shotV + 7, dh: 2, dv: 2, pic: CENT_BODY_PIC }
    s = ext({ ...s, shot: { h: s.player.h, v: shotV, live: true }, segs: [body] } as SimState)

    const after = ext(stepSim(s, { dh: 0, dv: 0, fire: false }))
    expect(after.segs, 'stepSim must carry the train through the frame').toBeDefined()
    expect((after.segs[0].pic & 0x80) === 0, 'the segment is spared — the mushroom intercepted the shot').toBe(true)
    expect(
      after.playfield.cells[cell.col * PLYFLD_STRIDE + cell.row],
      'the mushroom took the hit (damaged below full)',
    ).toBeLessThan(MUSHROOM_FULL)
  })

  it('the seeded train never gets top-row-shot into oblivion: createSim’s wave-1 train sits at v=0xF8', () => {
    // Regression guard for (a): a fresh train enters at the top entry row where
    // the SHOOT guard applies — so an early shot cannot vaporise the whole train.
    const s = ext(createSim(0x9999))
    expect(s.segs, 'createSim must carry the wave-1 train').toBeDefined()
    expect(s.segs.every((seg) => seg.v === 0xf8), 'the wave-1 train enters along the 0xF8 top row').toBe(true)
  })
})

// ─── User-reported defect (mid-GREEN, cp2-5) — MOTION's bottom is a BOUNCE, not
// a floor (CT-72/73) ──────────────────────────────────────────────────────────
//
// Live-tested on the 5288 demo: the train reaching V=8 kept marching straight
// through it — segments left the visible field entirely, and with no segments
// left in the array's tracked bounds the wave could never register DEAD==0
// (AC-3's wave-loop closure broken). Predicted by cp2-3's Reviewer LOW
// ("post-bottom behavior undefined: marches at V=8; an edge-turn there drives
// V<8") and by the NEWHD deferral note. CT-72/73 transcribe the ROM's actual
// fix: reaching V<9 while descending negates MOBJDV (CENTI4.MAC:1389/1434);
// reaching V>=0x30 while ascending negates it back (:1385/1386) — the train
// ping-pongs inside the player zone forever instead of leaving the screen.
// NEWHD's extra-head FACTORY (the RNG-driven fresh top-edge spawn) stays
// deferred to cp4 per TEA's entropy ruling; this is containment only — no new
// segments are created, existing ones just stop running away.
describe('cp2-5 MOTION — bottom/top containment bounce (CT-72/73, user-reported-defect pin)', () => {
  const isVacant = (pic: number) => (pic & DEAD_BIT) !== 0

  it('a long-running train never leaves the visible field, and stays killable once contained (many frames, wave still clearable)', () => {
    const field = createPlayfield() // no mushrooms: isolates the bottom/top bounce from mushroom-triggered turns
    let segs = createCentipede()
    const FRAMES = 8000 // generous: ~30 rows from spawn (V=0xF8) to the bottom, each row preceded by a full-width edge-to-edge march

    let touchedBottom = false
    let touchedNearTop = false

    for (let f = 0; f < FRAMES; f++) {
      segs = stepCentipede(segs, field)
      for (const seg of segs) {
        if (isVacant(seg.pic)) continue
        // The regression itself: before CT-72/73, a segment turning or diving
        // at the bottom row marched V below CENT_BOTTOM_V without limit.
        expect(seg.v, `frame ${f}: a live segment fell below the bottom of the field`).toBeGreaterThanOrEqual(
          CENT_BOTTOM_V,
        )
        // Symmetric sanity: it can never exceed where it started either.
        expect(seg.v, `frame ${f}: a live segment rose above its own spawn row`).toBeLessThanOrEqual(CENT_ENTER_V)
        if (seg.v <= CENT_BOTTOM_V) touchedBottom = true
        if (seg.v >= CENT_BOUNCE_TOP_V - 2) touchedNearTop = true
      }
    }

    // The scenario must actually exercise both bounds, or the bounds checks
    // above would be vacuously true (the classic "test that can't fail").
    expect(touchedBottom, 'the run must actually drive a segment down to the bottom bounce').toBe(true)
    expect(touchedNearTop, 'a bounced segment must actually ascend back up near the ping-pong top bound').toBe(true)

    // "Wave still clearable": the contained/bounced segments are still normal,
    // shootable segments at sane (h, v) — SHOOT can kill every one of them and
    // the wave can still register DEAD==0 (stepSim's checkPlayerContact/
    // wave-clear consumers, not exercised directly here — this proves the data
    // resolveShotHit consumes stays valid after containment kicks in).
    let live = segs.filter((seg) => !isVacant(seg.pic))
    expect(live.length, 'the containment run must leave at least one live segment to prove killability on').toBeGreaterThan(0)
    for (const target of live) {
      const shot: Shot = { h: target.h, v: target.v, live: true }
      const hit = resolveShotHit(shot, segs, field)
      expect(hit.hitIndex, `a contained segment at (${target.h},${target.v}) must still be hittable`).not.toBe(-1)
      segs = hit.segs
    }
    live = segs.filter((seg) => !isVacant(seg.pic))
    expect(live.length, 'every contained segment was killed — the wave can clear').toBe(0)
  })
})
