// tests/segment-kill-mushroom.test.ts
//
// Story ml13-1 — RED phase (TEA / Leeloo). SEGMENT KILLS LEAVE A MUSHROOM.
// ml12-3 follow-up: the port removes + scores + emits `segment-killed` on a kill,
// but plants NO mushroom at the dead cell — the ROM does, for BOTH kill paths.
//
// ─── GROUND TRUTH (reference/original-source/millipede/MILLI.MAC, .RADIX 16) ────
// SHOOT2's millipede branch (142$, MILLI.MAC:2148-2176) is the SHARED kill tail
// for a shot kill AND a DDT-cloud kill. Before it DECs DEAD and scores, it plants
// a mushroom at the dead segment's cell:
//
//   2163  15$: JSR OBSTA0     ; GET ADDRESS FOR MUSHROOM   (dir 0 → the segment's
//   2164       JSR MUSHER     ; PUT MUSHROOMS ON SCREEN     OWN cell, MILLI.MAC:1996
//   2166       DEC X,DEAD     ; REDUCE COUNT OF CENTIPEDES  "GIVE NO DIRECTION")
//
// So killing a segment (however it died) stamps FULL_MUSHROOM (=0x7f, mushroom.ts:29)
// at its cell. The mover's own cell is `obstacOffset(h, v, 0)` — the `8*dir` term
// vanishes at dir 0 (mushroom.ts:167-168), exactly as SHOOT1 passes it.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// sim.ts's shot-kill path (:177-185) and DDT-kill path (step 8b) both drop the
// segment + score + emit the event, but neither writes FULL_MUSHROOM into the
// field. These tests assert the dead cell becomes a full mushroom → RED until the
// MUSHER-equivalent plant lands on BOTH paths.

import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/core/game-state'
import { stepGame, type GameInput } from '../src/core/sim'
import { BODY_COLOR, HEAD_COLOR, type Segment } from '../src/core/millipede'
import { obstacOffset, obstacleAt, FULL_MUSHROOM, BACKGROUND_BIT } from '../src/core/mushroom'
import { CLOUD_STAMP, newDdtTable, type DdtTable } from '../src/core/ddt'

const NO_INPUT: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const SIZE = 0x3c0
const emptyField = (): Uint8Array => new Uint8Array(SIZE)

/** A clean play state: empty field (no scattered mushrooms/bombs), no DDT bank
 *  exploding, exactly the given segments — so the ONLY thing that can stamp a
 *  mushroom this frame is the kill under test. */
const play = (segments: Segment[], field = emptyField(), over?: Partial<GameState>): GameState => ({
  ...createGame(0x12_3, { phase: 'play' }),
  field,
  ddt: newDdtTable() as DdtTable,
  segments,
  frame: 0,
  ...over,
})

/** True when the masked cell reads a full mushroom (DDTEXP/OBSTAC mask off the grey bg). */
const isFullMushroom = (field: Uint8Array, cell: number): boolean =>
  obstacleAt(field, cell) === FULL_MUSHROOM

const kinds = (g: GameState): string[] => g.events.map((e) => e.type)

/** A coasting body ON an 8px cell boundary (v & 7 == 0), heading right at +2, so
 *  its post-move OCCUPIED cell is deterministic (same fixture ddt-segment-kill uses). */
const body = (h: number, v = 0x60): Segment => ({ h, v, dh: 2, dv: 2, pic: 3, color: BODY_COLOR })
const occupiedAfterStep = (s: Segment): number => obstacOffset((s.h + s.dh) & 0xff, s.v, 0)

describe('ml13-1 AC1 — a SHOT kill leaves a mushroom at the dead cell (SHOOT2 142$ MUSHER)', () => {
  it('a shot that kills a segment stamps FULL_MUSHROOM at the segment’s own cell', () => {
    const seg: Segment = { h: 0x80, v: 0x40, dh: 1, dv: 0, pic: 0, color: HEAD_COLOR }
    const cell = obstacOffset(seg.h, seg.v, 0) // dir 0 — the mover's OWN cell (MILLI.MAC:1996)
    const field = emptyField()
    expect(isFullMushroom(field, cell), 'precondition: the cell starts empty').toBe(false)

    const after = stepGame(play([seg], field, { shot: { active: true, h: seg.h, v: seg.v } }), NO_INPUT)

    // ml12-3 behaviour intact: the kill still fires.
    expect(kinds(after), 'the shot still kills the segment').toContain('segment-killed')
    // NEW: a full mushroom now sits where the segment died.
    expect(isFullMushroom(after.field, cell), 'MUSHER stamps a full mushroom at the dead cell').toBe(true)
  })

  it('CONTROL: the SAME segment with NO shot leaves NO mushroom at its cell — the kill is the cause', () => {
    const seg: Segment = { h: 0x80, v: 0x40, dh: 1, dv: 0, pic: 0, color: HEAD_COLOR }
    const cell = obstacOffset(seg.h, seg.v, 0)
    const after = stepGame(play([seg], emptyField()), NO_INPUT)
    expect(isFullMushroom(after.field, cell), 'no kill, no mushroom').toBe(false)
  })
})

describe('ml13-1 AC2 — a DDT-cloud kill leaves a mushroom at the dead cell (same SHOOT2 142$ tail)', () => {
  it('a DDT-cloud kill stamps FULL_MUSHROOM at the occupied (dead) cell, overwriting the cloud', () => {
    const seg = body(0x60)
    const cell = occupiedAfterStep(seg)
    const field = emptyField()
    field[cell] = CLOUD_STAMP // occupied-cell cloud → DDT kill (ml12-3)
    expect(isFullMushroom(field, cell), 'precondition: a cloud, not a mushroom').toBe(false)

    const after = stepGame(play([seg], field), NO_INPUT)

    expect(kinds(after), 'the DDT cloud still kills the segment').toContain('segment-killed')
    expect(isFullMushroom(after.field, cell), 'MUSHER stamps a full mushroom over the dead cloud cell').toBe(true)
  })

  it('the planted mushroom PRESERVES the grey background bit (MUSHER keeps MSKORA)', () => {
    const seg = body(0x60)
    const cell = occupiedAfterStep(seg)
    const field = emptyField()
    field[cell] = CLOUD_STAMP | BACKGROUND_BIT // a GREY cloud cell

    const after = stepGame(play([seg], field), NO_INPUT)

    expect(isFullMushroom(after.field, cell), 'full mushroom in the low 7 bits').toBe(true)
    expect(after.field[cell] & BACKGROUND_BIT, 'the grey background bit survives the plant').toBe(BACKGROUND_BIT)
  })
})

describe('ml13-1 — the plant does not regress the kill itself (ml12-3)', () => {
  it('a killed segment is still REMOVED from the roster (mushroom replaces it, not joins it)', () => {
    const seg = body(0x60)
    const cell = occupiedAfterStep(seg)
    const field = emptyField()
    field[cell] = CLOUD_STAMP
    const after = stepGame(play([seg], field), NO_INPUT)
    const liveOnCell = after.segments.some(
      (s) => s.color !== 0x00 && obstacOffset(s.h, s.v, 0) === cell,
    )
    expect(liveOnCell, 'no live segment remains on the dead cell').toBe(false)
    expect(isFullMushroom(after.field, cell), 'a mushroom stands there instead').toBe(true)
  })
})
