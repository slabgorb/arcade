// tests/segment-kill-mushroom.test.ts
//
// Story ml13-1 — segment kills leave a mushroom (the ROM's MUSHER).
// ml12-3 follow-up: the port removes + scores + emits `segment-killed` on a kill,
// but never runs MUSHER.
//
// ─── GROUND TRUTH (reference/original-source/millipede/MILLI.MAC + MLSUB.MAC, .RADIX 16) ──
// SHOOT2's millipede branch (142$, MILLI.MAC:2148-2176) is the SHARED kill tail for a
// shot kill AND a DDT-cloud kill (DDTEX1 :1946 → JSR SHOOT2). Before it DECs DEAD it
// plants a mushroom:
//   2155  15$: JSR OBSTA0     ; GET ADDRESS FOR MUSHROOM
//   2157       JSR MUSHER     ; PUT MUSHROOMS ON SCREEN
//
// OBSTA0 (MLSUB.MAC:834-839) derives the direction from the segment's OWN MOBJDH sign
// (`LDY I,-1 / LDA MOBJDH / BMI / LDY I,1`), and OBSTAC adds `8*DIRECTION` (:863). So the
// target is the cell 8px AHEAD in the travel direction — `obstacOffset(h, v, dh<0?-1:1)`,
// the same derivation as the port's `obstac()` (mushroom.ts:186-189). NOT the segment's
// own cell, and NOT (for a DDT kill) the occupied cloud cell that TRIGGERED the kill
// (MOTION reads that with `LDY I,0`, :1611 — a different cell).
//
// MUSHER (MLSUB.MAC:732-772) only ADDS when the target cell is EMPTY (:739 AND I,7F / BNE),
// stamping FULL_MUSHROOM (=0x7f) keeping the grey background bit (:770) and INCrementing
// the MUSH running tally for the row band (rows < LOWER_MAX / >= TOP_MIN; the middle band
// is stamped but uncounted).
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// sim.ts's shot-kill path and its DDT-kill step 8b drop the segment + score + emit the
// event but never call MUSHER — no mushroom at the cell-ahead, no MUSH bump.

import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/core/game-state'
import { stepGame, type GameInput } from '../src/core/sim'
import { BODY_COLOR, HEAD_COLOR, type Segment } from '../src/core/millipede'
import { obstacOffset, obstacleAt, FULL_MUSHROOM, BACKGROUND_BIT } from '../src/core/mushroom'
import { CLOUD_STAMP, newDdtTable, type DdtTable } from '../src/core/ddt'

const NO_INPUT: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const SIZE = 0x3c0
const emptyField = (): Uint8Array => new Uint8Array(SIZE)

/** A clean play state: empty field, zeroed MUSH tally, no DDT bank exploding, exactly the
 *  given segments — so a kill is the sole field/tally mutator this frame. */
const play = (segments: Segment[], field = emptyField(), over?: Partial<GameState>): GameState => ({
  ...createGame(0x12_3, { phase: 'play' }),
  field,
  ddt: newDdtTable() as DdtTable,
  mushCounts: { lower: 0, top: 0 },
  segments,
  frame: 0,
  ...over,
})

const isFullMushroom = (field: Uint8Array, cell: number): boolean =>
  obstacleAt(field, cell) === FULL_MUSHROOM
const kinds = (g: GameState): string[] => g.events.map((e) => e.type)

/** OBSTA0's target: the cell 8px AHEAD in the segment's travel direction (dir = sign(dh)). */
const aheadCell = (h: number, v: number, dh: number): number => obstacOffset(h, v, dh < 0 ? -1 : 1)

/** A coasting body ON an 8px cell boundary, heading right at +2 — its post-move OCCUPIED
 *  cell (dir 0, the DDT-kill trigger) and AHEAD cell (dir +1, the MUSHER target) are both
 *  deterministic. */
const body = (h: number, v = 0x60): Segment => ({ h, v, dh: 2, dv: 2, pic: 3, color: BODY_COLOR })

describe('ml13-1 AC1 — a SHOT kill leaves a mushroom at OBSTA0’s cell-ahead (SHOOT2 142$ MUSHER)', () => {
  // seg heads right (dh 1). MUSHER plants at aheadCell(0x80,0x40,1) — an empty LOWER-band
  // cell (row 0x08 < LOWER_MAX 0x0C) — so it stamps + bumps MUSH[0].
  const seg: Segment = { h: 0x80, v: 0x40, dh: 1, dv: 0, pic: 0, color: HEAD_COLOR }
  const ahead = aheadCell(seg.h, seg.v, seg.dh)
  const own = obstacOffset(seg.h, seg.v, 0)

  it('a shot kill stamps FULL_MUSHROOM at the cell AHEAD (not the segment’s own cell)', () => {
    const field = emptyField()
    const after = stepGame(play([seg], field, { shot: { active: true, h: 0x80, v: 0x40 } }), NO_INPUT)

    expect(kinds(after), 'the shot still kills the segment (ml12-3 intact)').toContain('segment-killed')
    expect(isFullMushroom(after.field, ahead), 'MUSHER stamps at OBSTA0 cell-ahead').toBe(true)
    expect(ahead, 'the cell-ahead is a DIFFERENT cell from the segment’s own').not.toBe(own)
    expect(isFullMushroom(after.field, own), 'nothing is stamped at the own cell').toBe(false)
  })

  it('the shot-kill mushroom BUMPS the MUSH running tally (MUSHER INC MUSH[0], row 0x08 < LOWER_MAX)', () => {
    const after = stepGame(play([seg], emptyField(), { shot: { active: true, h: 0x80, v: 0x40 } }), NO_INPUT)
    expect(after.mushCounts.lower, 'the planted mushroom is counted, not just drawn').toBe(1)
  })

  it('the plant PRESERVES the grey background bit (MUSHER keeps MSKORA, :770 ORA NY,OBST)', () => {
    const field = emptyField()
    field[ahead] = BACKGROUND_BIT // an empty-but-GREY cell (low 7 bits still 0)
    const after = stepGame(play([seg], field, { shot: { active: true, h: 0x80, v: 0x40 } }), NO_INPUT)
    expect(isFullMushroom(after.field, ahead), 'full mushroom in the low 7 bits').toBe(true)
    expect(after.field[ahead] & BACKGROUND_BIT, 'the grey background bit survives the plant').toBe(BACKGROUND_BIT)
  })

  it('CONTROL: the SAME segment with NO shot leaves NO mushroom at the cell-ahead — the kill is the cause', () => {
    const after = stepGame(play([seg], emptyField()), NO_INPUT)
    expect(isFullMushroom(after.field, ahead), 'no kill, no mushroom').toBe(false)
    expect(after.mushCounts.lower, 'no kill, no tally bump').toBe(0)
  })
})

describe('ml13-1 AC2 — a DDT-cloud kill ALSO plants a mushroom (same SHOOT2 142$ tail, OBSTA0 cell-ahead)', () => {
  it('a DDT kill stamps a mushroom at the cell AHEAD, distinct from the occupied cloud cell it read', () => {
    const seg = body(0x60)
    const marchedH = (seg.h + seg.dh) & 0xff
    const occupied = obstacOffset(marchedH, seg.v, 0) // dir 0 — the cloud cell that triggers the kill
    const ahead = aheadCell(marchedH, seg.v, seg.dh) // dir +1 — OBSTA0's mushroom target
    expect(ahead, 'the ahead cell differs from the triggering cloud cell').not.toBe(occupied)

    const field = emptyField()
    field[occupied] = CLOUD_STAMP // only the occupied cell is a cloud; the ahead cell is open
    const after = stepGame(play([seg], field), NO_INPUT)

    expect(kinds(after), 'the DDT cloud still kills the segment').toContain('segment-killed')
    expect(isFullMushroom(after.field, ahead), 'MUSHER plants at the empty cell-ahead').toBe(true)
    // The occupied cloud cell is NOT the plant target — it keeps its cloud, not a mushroom.
    expect(isFullMushroom(after.field, occupied), 'the cloud cell itself is not turned into a mushroom').toBe(false)
    const liveOnCell = after.segments.some((s) => s.color !== 0x00 && obstacOffset(s.h, s.v, 0) === occupied)
    expect(liveOnCell, 'and the segment itself is gone').toBe(false)
  })

  it('if the cell-ahead is ALSO a cloud (non-empty), MUSHER skips — no mushroom (empty-cell rule :739)', () => {
    const seg = body(0x60)
    const marchedH = (seg.h + seg.dh) & 0xff
    const occupied = obstacOffset(marchedH, seg.v, 0)
    const ahead = aheadCell(marchedH, seg.v, seg.dh)
    const field = emptyField()
    field[occupied] = CLOUD_STAMP
    field[ahead] = CLOUD_STAMP // the blast covers the ahead cell too → MUSHER finds it non-empty
    const after = stepGame(play([seg], field), NO_INPUT)
    expect(kinds(after)).toContain('segment-killed')
    expect(isFullMushroom(after.field, ahead), 'a non-empty ahead cell blocks the plant').toBe(false)
  })
})
