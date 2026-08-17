// tests/segment-kill-mushroom.test.ts
//
// Story ml13-1 — RED phase (TEA / Leeloo). SEGMENT KILLS AND THE MUSHROOM THEY LEAVE.
// ml12-3 follow-up: the port removes + scores + emits `segment-killed` on a kill,
// but never runs the ROM's MUSHER. Wiring MUSHER in is ROM-faithful ONLY through
// its own rules — and those rules make the two kill paths DIFFER.
//
// ─── GROUND TRUTH (reference/original-source/millipede/MILLI.MAC, .RADIX 16) ────
// SHOOT2's millipede branch (142$, MILLI.MAC:2148-2176) is the SHARED kill tail for
// a shot kill AND a DDT-cloud kill (DDTEX1 :1946 → JSR SHOOT2). Before it DECs DEAD
// and scores it does:
//   2163  15$: JSR OBSTA0     ; GET ADDRESS FOR MUSHROOM  (dir 0 → the segment's OWN
//   2164       JSR MUSHER     ; PUT MUSHROOMS ON SCREEN    cell, MILLI.MAC:1996)
//
// MUSHER (MLSUB.MAC:732-772) only ADDS a mushroom when the target cell is EMPTY:
//   739  AND I,7F / BNE 20$   ; already something here → DO NOTHING
// stamping FULL_MUSHROOM (=0x7f, mushroom.ts:29) keeping the grey background bit
// (:770 ORA NY,OBST), and it INCrements the MUSH running tally for the row band.
//
// That empty-cell rule is why the two paths DIVERGE:
//  • A SHOT kill lands on an OPEN cell → MUSHER plants a mushroom (+ bumps MUSH).
//  • A DDT-cloud kill lands on the CLOUD cell that triggered it (non-empty, 0x2E..0x6D)
//    → MUSHER's `AND I,7F / BNE` skips: NO mushroom from a DDT kill.
// (Faithful to play: DDT clears the train WITHOUT littering the field with mushrooms.)
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// sim.ts's shot-kill path (:177-185) drops the segment + scores + emits the event
// but never calls MUSHER, so no mushroom is planted and the MUSH tally is not bumped
// → the shot-kill tests are RED. The DDT path already plants nothing, so its guard is
// GREEN and pins that wiring MUSHER must NOT start planting on the cloud cell.

import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/core/game-state'
import { stepGame, type GameInput } from '../src/core/sim'
import { BODY_COLOR, HEAD_COLOR, type Segment } from '../src/core/millipede'
import { obstacOffset, obstacleAt, FULL_MUSHROOM, BACKGROUND_BIT } from '../src/core/mushroom'
import { CLOUD_STAMP, newDdtTable, type DdtTable } from '../src/core/ddt'

const NO_INPUT: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const SIZE = 0x3c0
const emptyField = (): Uint8Array => new Uint8Array(SIZE)

/** A clean play state: empty field, zeroed MUSH tally (so it tracks THIS field), no
 *  DDT bank exploding, exactly the given segments — so a kill is the sole field/tally
 *  mutator this frame. */
const play = (segments: Segment[], field = emptyField(), over?: Partial<GameState>): GameState => ({
  ...createGame(0x12_3, { phase: 'play' }),
  field,
  ddt: newDdtTable() as DdtTable,
  mushCounts: { lower: 0, top: 0 },
  segments,
  frame: 0,
  ...over,
})

/** True when the masked cell reads a full mushroom (OBSTAC masks off the grey bg). */
const isFullMushroom = (field: Uint8Array, cell: number): boolean =>
  obstacleAt(field, cell) === FULL_MUSHROOM

const kinds = (g: GameState): string[] => g.events.map((e) => e.type)

/** A coasting body ON an 8px cell boundary (v & 7 == 0), heading right at +2, so its
 *  post-move OCCUPIED cell is deterministic (same fixture ddt-segment-kill uses). */
const body = (h: number, v = 0x60): Segment => ({ h, v, dh: 2, dv: 2, pic: 3, color: BODY_COLOR })
const occupiedAfterStep = (s: Segment): number => obstacOffset((s.h + s.dh) & 0xff, s.v, 0)

describe('ml13-1 AC1 — a SHOT kill leaves a mushroom at the dead cell (SHOOT2 142$ MUSHER)', () => {
  // seg at (0x80,0x40); obstacOffset(0x80,0x40,0) = field offset 0x1C8, row 0x08 — an
  // empty, plantable, LOWER-band cell (row < LOWER_MAX 0x0C), so MUSHER plants + bumps MUSH[0].
  const shotKilledSeg: Segment = { h: 0x80, v: 0x40, dh: 1, dv: 0, pic: 0, color: HEAD_COLOR }
  const deadCell = obstacOffset(shotKilledSeg.h, shotKilledSeg.v, 0)

  it('a shot that kills a segment stamps FULL_MUSHROOM at the segment’s own (empty) cell', () => {
    const field = emptyField()
    expect(isFullMushroom(field, deadCell), 'precondition: the cell starts empty').toBe(false)

    const after = stepGame(play([shotKilledSeg], field, { shot: { active: true, h: 0x80, v: 0x40 } }), NO_INPUT)

    expect(kinds(after), 'the shot still kills the segment (ml12-3 intact)').toContain('segment-killed')
    expect(isFullMushroom(after.field, deadCell), 'MUSHER stamps a full mushroom at the dead cell').toBe(true)
  })

  it('the shot-kill mushroom BUMPS the MUSH running tally (MUSHER INC MUSH[0], row 0x08 < LOWER_MAX)', () => {
    const after = stepGame(play([shotKilledSeg], emptyField(), { shot: { active: true, h: 0x80, v: 0x40 } }), NO_INPUT)
    expect(after.mushCounts.lower, 'the planted mushroom is counted, not just drawn').toBe(1)
  })

  it('the plant PRESERVES the grey background bit (MUSHER keeps MSKORA, :770 ORA NY,OBST)', () => {
    const field = emptyField()
    field[deadCell] = BACKGROUND_BIT // an empty-but-GREY cell (low 7 bits still 0)
    const after = stepGame(play([shotKilledSeg], field, { shot: { active: true, h: 0x80, v: 0x40 } }), NO_INPUT)
    expect(isFullMushroom(after.field, deadCell), 'full mushroom in the low 7 bits').toBe(true)
    expect(after.field[deadCell] & BACKGROUND_BIT, 'the grey background bit survives the plant').toBe(BACKGROUND_BIT)
  })

  it('CONTROL: the SAME segment with NO shot leaves NO mushroom at its cell — the kill is the cause', () => {
    const after = stepGame(play([shotKilledSeg], emptyField()), NO_INPUT)
    expect(isFullMushroom(after.field, deadCell), 'no kill, no mushroom').toBe(false)
    expect(after.mushCounts.lower, 'no kill, no tally bump').toBe(0)
  })
})

describe('ml13-1 AC2 — a DDT-cloud kill plants NO mushroom (MUSHER skips the non-empty cloud cell)', () => {
  it('the killed segment is REMOVED but the occupied cloud cell does NOT become a mushroom', () => {
    const seg = body(0x60)
    const cell = occupiedAfterStep(seg)
    const field = emptyField()
    field[cell] = CLOUD_STAMP // occupied-cell cloud → DDT kill (ml12-3)
    const after = stepGame(play([seg], field), NO_INPUT)

    expect(kinds(after), 'the DDT cloud still kills the segment').toContain('segment-killed')
    // ROM: MUSHER's `AND I,7F / BNE 20$` (:739) skips — the cloud cell is non-empty.
    expect(isFullMushroom(after.field, cell), 'a DDT kill leaves NO mushroom (cloud blocks MUSHER)').toBe(false)
    const liveOnCell = after.segments.some((s) => s.color !== 0x00 && obstacOffset(s.h, s.v, 0) === cell)
    expect(liveOnCell, 'and the segment itself is gone').toBe(false)
  })

  it('a DDT kill does NOT bump the MUSH tally (no mushroom was added)', () => {
    const seg = body(0x60)
    const field = emptyField()
    field[occupiedAfterStep(seg)] = CLOUD_STAMP
    const after = stepGame(play([seg], field), NO_INPUT)
    expect(after.mushCounts.lower, 'no plant → no INC MUSH').toBe(0)
    expect(after.mushCounts.top).toBe(0)
  })
})
