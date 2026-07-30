// tests/motion-coast.test.ts
//
// Story cp2-9 — RED phase (O'Brien / TEA). The frame-exact MOTION turn: the
// ROM's COAST-MARCH during a descent, replacing cp2-3's ratified freeze-h
// simplification. Transcribed from rev-4 CENTI4.MAC:1277-1475 and pinned by
// CT-13/17/19/20/21/72/73 + the new CT-74/75/76/77 in
// docs/rom-study/claims/09-centipede-train.json.
//
// ─── WHAT THE ROM ACTUALLY DOES (CT-76/77) ───────────────────────────────────────
// A segment's horizontal march (20$: ADC MOBJH / STA MOBJH ;CHANGE HPOS, CT-77)
// runs UNCONDITIONALLY every stepped frame — including mid-descent. The descent
// itself is stateless: a segment off the 8px cell boundary (V&7 != 0) skips the
// OBSTAC/edge logic and re-enters the vertical step directly (71$: AND I,07 /
// BNE 15$, CT-76), so once a turn begins it descends a FULL 8px cell before it can
// march horizontally again. The heading only reverses when V&7 == 4 (CT-21), AFTER
// that frame's H march. Net effect for a head meeting a mushroom while marching
// right at V=0xF8, dh=dv=2:
//
//   frame │ before        │ 15$ descend │ 20$ march (OLD dh) │ 20$ V&7==4?  │ after
//   ──────┼───────────────┼─────────────┼────────────────────┼──────────────┼──────────────
//     1   │ 0x80,0xF8,+2  │ V→0xF6      │ H→0x82 (+2)        │ 0xF6&7=6 no  │ 0x82,0xF6,+2
//     2   │ 0x82,0xF6,+2  │ V→0xF4      │ H→0x84 (+2)        │ 0xF4&7=4 YES │ 0x84,0xF4,-2  ← reverse
//     3   │ 0x84,0xF4,-2  │ V→0xF2      │ H→0x82 (-2)        │ 0xF2&7=2 no  │ 0x82,0xF2,-2
//     4   │ 0x82,0xF2,-2  │ V→0xF0      │ H→0x80 (-2)        │ 0xF0&7=0 no  │ 0x80,0xF0,-2  ← net-zero, 1 cell down
//     5   │ 0x80,0xF0,-2  │  (V&7==0, OBSTAC clear left) → plain march │        │ 0x7E,0xF0,-2
//
// The head COASTS +4px (half a cell) toward the mushroom, then returns — NET ZERO
// horizontal displacement, and it never enters the mushroom cell (OBSTAC probes a
// full 8px ahead, CT-28). cp2-3's descend() instead FREEZES h during the descent
// and reverses on a round-to-nearest row-bucket flip (at V=0xF2, V&7==2) — the
// documented "DESIGN DEVIATION" this story retires.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// src/core/centipede.ts's descend() freezes h (h never leaves its start during a
// turn) and reverses on the row-bucket flip, not the V&7==4 phase; dive() marches
// h monotonically and never reverses. Every "coast"/"net-zero"/"V&7==4"/"zigzag"
// assertion below reddens for that gap. The in-code DESIGN DEVIATION block is still
// present, so the source-scan reddens too. GREEN unifies the descent (V&7-derived,
// no `turning` flag) so all pass. The long-run containment CONTROLS are green under
// both impls — they guard that the coast does NOT break cp2-5's bottom bounce.

import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  createPlayfield,
  PLYFLD_STRIDE,
  MUSHROOM_FULL,
  obstacleCellFor,
  type Playfield,
} from '../src/core/playfield'
import {
  stepCentipede,
  createCentipede,
  CENT_HEAD_PIC,
  CENT_ENTER_V,
  CENT_BOTTOM_V,
  POISON_BIT,
  DEAD_BIT,
  type Segment,
} from '../src/core/centipede'

// A poisoned mushroom on the field is coded 0x38-0x3B (CT-17/18); 0x3B is a full
// poisoned mushroom (cp1-6 stamp). NORMAL full is MUSHROOM_FULL=0x3F.
const POISON_FULL = 0x3b

// The peak coast excursion is a half-cell (4px) toward the obstacle, INDEPENDENT
// of speed: the reversal fires at V&7==4, i.e. after V has dropped exactly 4px
// from the cell boundary, and the head has coasted `dh` per frame over 4/dv of
// them → 4*dh/dv px. For the wave-1 case dh==dv, that is 4px.
const PEAK_COAST_PX = 4

/** The OBSTAC grid cell for a pixel (h,v) at dir 0 (col=(0xF7-h)>>3, row=(v+4)>>3). */
const cellOf = (h: number, v: number) => ({ col: (0xf7 - h) >> 3, row: (v + 4) >> 3 })

/** Step a single-head train `n` frames, returning the head snapshot AFTER each frame. */
function trace(seg: Segment, field: Playfield, n: number): Segment[] {
  const frames: Segment[] = []
  let cur: Segment[] = [seg]
  for (let f = 0; f < n; f++) {
    cur = stepCentipede(cur, field)
    frames.push({ ...cur[0] })
  }
  return frames
}

/** Plant a mushroom in the exact cell OBSTAC probes for a head at (h,v) heading `dir`. */
function plantProbeCell(field: Playfield, h: number, v: number, dir: number, code: number): { col: number; row: number } {
  const cell = obstacleCellFor(h, v, dir)
  field.cells[cell.h * PLYFLD_STRIDE + cell.v] = code
  return { col: cell.h, row: cell.v }
}

// ─── the coast-march turn: frame-exact (CT-13/20/21/76/77) ───────────────────────
describe('cp2-9 MOTION — the coast-march turn is frame-exact (CT-77 + CT-21 gate)', () => {
  it('a head meeting a mushroom marches OLD-dir while descending, reverses at V&7==4, lands one cell down', () => {
    const head: Segment = { h: 0x80, v: CENT_ENTER_V, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantProbeCell(field, head.h, head.v, 1, MUSHROOM_FULL) // one 8px cell ahead (col 13, row 31)

    const fr = trace(head, field, 5)
    // The frame-by-frame trajectory transcribed from CENTI4.MAC:1277-1475 (header table).
    const expected = [
      { h: 0x82, v: 0xf6, dh: 2 }, // F1 detect + descend, coast +2
      { h: 0x84, v: 0xf4, dh: -2 }, // F2 descend, coast +2, then V&7==4 → reverse
      { h: 0x82, v: 0xf2, dh: -2 }, // F3 descend, march -2
      { h: 0x80, v: 0xf0, dh: -2 }, // F4 descend, march -2 → net-zero, one cell down
      { h: 0x7e, v: 0xf0, dh: -2 }, // F5 V&7==0, OBSTAC clear leftward → plain march
    ]
    fr.forEach((s, i) => {
      expect(s.h, `frame ${i + 1}: HPOS (coast-march every frame, CT-77)`).toBe(expected[i].h)
      expect(s.v, `frame ${i + 1}: VPOS (descends one 8px cell)`).toBe(expected[i].v)
      expect(s.dh, `frame ${i + 1}: MOBJDH (reversal gated to V&7==4, CT-21)`).toBe(expected[i].dh)
      expect(s.dv, `frame ${i + 1}: MOBJDV unchanged at the top (no bounce)`).toBe(2)
    })
  })

  it('the coast is net-zero: h coasts forward, then returns to its start after a full-cell descent', () => {
    const head: Segment = { h: 0x80, v: CENT_ENTER_V, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantProbeCell(field, head.h, head.v, 1, MUSHROOM_FULL)

    const fr = trace(head, field, 8)
    const startH = head.h
    const maxH = Math.max(startH, ...fr.map((s) => s.h))
    // freeze-h keeps h == startH throughout the descent → maxH == startH (RED).
    expect(maxH, 'the head COASTS forward past its start during the descent (CT-77)').toBeGreaterThan(startH)

    // The descent drops a FULL 8px cell (V&7 0 → 0); freeze-h stops on the round-to-
    // nearest bucket flip at V=0xF2 and never reaches 0xF0 (RED: land is undefined).
    const land = fr.find((s) => s.v === CENT_ENTER_V - 8)
    expect(land, 'the descent lands exactly one 8px cell down (V drops a full cell)').toBeDefined()
    expect(land!.h, 'net-zero: horizontal position returns to start after the coast').toBe(startH)
  })

  it('the peak coast excursion is +4px (half a cell) and never enters the obstacle cell', () => {
    const head: Segment = { h: 0x80, v: CENT_ENTER_V, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    const mush = plantProbeCell(field, head.h, head.v, 1, MUSHROOM_FULL)

    const fr = trace(head, field, 8)
    const maxH = Math.max(head.h, ...fr.map((s) => s.h))
    expect(maxH - head.h, 'peak coast is a half-cell toward the obstacle (dh==dv)').toBe(PEAK_COAST_PX)

    // Control (true under both impls): +4px never reaches the mushroom cell, which
    // sits a full 8px cell ahead — the ROM's turn never enters the obstacle's cell.
    const enteredMush = fr.some((s) => {
      const c = cellOf(s.h, s.v)
      return c.col === mush.col && c.row === mush.row
    })
    expect(enteredMush, 'the coasting head never enters the mushroom cell (OBSTAC looks 8px ahead, CT-28)').toBe(false)
  })

  it('MOBJDH reverses EXACTLY on the V&7==4 cell-phase, not on a row-bucket flip (CT-21)', () => {
    const head: Segment = { h: 0x80, v: CENT_ENTER_V, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantProbeCell(field, head.h, head.v, 1, MUSHROOM_FULL)

    const fr = trace(head, field, 8)
    const flip = fr.find((s) => Math.sign(s.dh) !== Math.sign(head.dh))
    expect(flip, 'the head reverses during the descent (CT-20)').toBeDefined()
    // freeze-h reverses on the round-to-nearest bucket change at V=0xF2 (V&7==2) → RED.
    expect(flip!.v & 7, 'the reversal fires when V&7==4 (CT-21), not at the row-bucket boundary').toBe(4)
  })
})

// ─── composition with the bottom bounce (CT-72/73) ───────────────────────────────
describe('cp2-9 MOTION — the coast composes with cp2-5s bottom bounce (CT-72/73)', () => {
  it('a coast-turn on the bottom row still bounces — V never falls below CENT_BOTTOM_V while coasting', () => {
    // Head on the bottom-most travel row (V=0x10), a mushroom one cell ahead: it
    // turns, coasts, and descends a full cell toward V=8 — where CT-72 must bounce.
    const head: Segment = { h: 0x80, v: 0x10, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantProbeCell(field, head.h, head.v, 1, MUSHROOM_FULL)

    const fr = trace(head, field, 12)
    const minV = Math.min(...fr.map((s) => s.v))
    // Control: containment holds under the coast (cp2-5's bounce is V-only).
    expect(minV, 'the coast-turn at the bottom still bounces — V stays at/above the floor (CT-72)').toBeGreaterThanOrEqual(
      CENT_BOTTOM_V,
    )
    // RED: the near-bottom turn must ALSO coast (freeze-h keeps h fixed here).
    const maxH = Math.max(head.h, ...fr.map((s) => s.h))
    expect(maxH, 'the coast composes with the bounce — h still coasts forward near the floor').toBeGreaterThan(head.h)
  })

  it('CONTROL: the full wave-1 train stays contained over a long coast-march run', () => {
    // Coast-invariant regression guard for cp2-5's containment (the 8000-frame pin
    // in sim-assembly.test.ts owns the full descent-to-floor; this proves the coast
    // rewrite keeps every live segment on the visible field). Green under both impls.
    const field = createPlayfield()
    let segs = createCentipede()
    for (let f = 0; f < 1200; f++) {
      segs = stepCentipede(segs, field)
      for (const s of segs) {
        if ((s.pic & DEAD_BIT) !== 0) continue
        expect(s.v, `frame ${f}: a live segment left the field below the floor`).toBeGreaterThanOrEqual(CENT_BOTTOM_V)
        expect(s.v, `frame ${f}: a live segment rose above its spawn row`).toBeLessThanOrEqual(CENT_ENTER_V)
      }
    }
  })
})

// ─── the poisoned-head DIVE also coasts (CT-19 + CT-21) ──────────────────────────
describe('cp2-9 MOTION — the poison dive is a descent too, so it also coasts (CT-19/21)', () => {
  it('the diving head reverses MOBJDH at each V&7==4 phase — it zigzags, it does not slide straight', () => {
    // The ROM's poisoned head goes to the SAME vertical-step handler (10$: AND I,20
    // / BNE 15$) and reaches the SAME 20$ H-march + V&7==4 reversal gate. So a dive
    // is a coast too: dh flips every half-cell of descent. cp2-3's dive() marches h
    // monotonically and never reverses (RED — 0 sign changes).
    const head: Segment = { h: 0x80, v: 0x80, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantProbeCell(field, head.h, head.v, 1, POISON_FULL) // 0x3B poison ahead → poisons then dives

    const first = stepCentipede([head], field)
    expect((first[0].pic & POISON_BIT) !== 0, 'stepping onto a poison mushroom sets the poison bit (CT-18)').toBe(true)

    const fr = trace(head, field, 24)
    let signChanges = 0
    let prev = Math.sign(head.dh)
    for (const s of fr) {
      const sign = Math.sign(s.dh)
      if (sign !== 0 && sign !== prev) {
        signChanges += 1
        prev = sign
      }
    }
    expect(signChanges, 'the diving head reverses dh at the V&7==4 phases (CT-21) — the dive zigzags').toBeGreaterThan(0)
  })

  it('CONTROL: the dive is otherwise UNAFFECTED — it still bypasses OBSTAC and reaches the bottom zone (CT-19)', () => {
    // The "poison-dive unaffected where source says so" part: the decision to dive,
    // the OBSTAC/edge bypass, and the plunge to the bottom are unchanged. Green now
    // and must stay green (a mushroom directly BELOW does not stop the dive).
    const head: Segment = { h: 0x80, v: 0x80, dh: 2, dv: 2, pic: CENT_HEAD_PIC }
    const field = createPlayfield()
    plantProbeCell(field, head.h, head.v, 1, POISON_FULL)

    const fr = trace(head, field, 200)
    const minV = Math.min(...fr.map((s) => s.v))
    expect(minV, 'the poisoned head plunges to the bottom zone regardless of the coast (CT-19)').toBeLessThanOrEqual(0x10)
  })
})

// ─── the freeze-h DESIGN DEVIATION block is retired (source-text scan) ────────────
describe('cp2-9 — the in-code freeze-h DESIGN DEVIATION block is removed in GREEN', () => {
  const centipedeSrc = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'core', 'centipede.ts'),
    'utf8',
  )

  it('the "DESIGN DEVIATION: THE TURN\'S MULTI-FRAME TIMING" block is gone', () => {
    expect(
      centipedeSrc.includes('DESIGN DEVIATION: THE TURN'),
      'the ratified freeze-h deviation block must be removed once the coast-march lands',
    ).toBe(false)
  })

  it('the freeze-h language ("FREEZES h") is gone', () => {
    expect(/FREEZES\s+h/i.test(centipedeSrc), 'no code or comment should still claim it FREEZES h during a turn').toBe(
      false,
    )
  })

  it('the non-ROM `turning` bookkeeping field is gone (mid-descent derives from V&7, CT-76)', () => {
    expect(
      /turning\?\s*:/.test(centipedeSrc),
      'the `turning` adapter flag is retired — a descending segment is identified by V&7 != 0 (CT-76)',
    ).toBe(false)
  })
})
