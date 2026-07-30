// tests/gun-block.test.ts
//
// Story cp2-3 — RED phase (O'Brien / TEA). AC-4, the cp1-5 carry-forward: the
// ROM's MOVE blocks the GUN from gliding INTO a mushroom cell, via the SAME
// OBSTAC the centipede uses. cp1-5's movePlayer only bounds-clamps (it was
// logged as a TEA Delivery Finding, deferred to here). This story transcribes
// OBSTAC once and MOVE consumes it:
//
//   horizontal (CT-30, CENTI4.MAC:1500-1516): LDY I,0 / LDA PLAYV / JSR OBSTAC /
//     BNE 5$  → on an obstacle, 5$: LDA PLAYH restores the OLD PLAYH.
//   vertical   (CT-31, CENTI4.MAC:1534-1560): LDY I,0 / JSR OBSTAC / BNE 45$ →
//     on an obstacle, 45$: LDA PLAYV restores the OLD PLAYV.
//
// Both call OBSTAC with direction 0 (probe in place). Horizontal resolves first,
// so the vertical probe uses the already-updated column.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────────
// movePlayer (cp1-5) ships as a 2-arg bounds-only function. The blocking form
// takes the playfield as a 3rd argument: movePlayer(player, counts, field). Until
// GREEN wires OBSTAC into MOVE, the field argument is ignored and the gun glides
// through the mushroom — so the two block assertions FAIL by behaviour (a clean
// RED), while the "moves on an empty field" and "backward-compatible" controls
// stay green. cp1-5's own tests/player.test.ts calls the 2-arg form throughout
// and is untouched — it stays green (the field param is optional).

import { describe, it, expect } from 'vitest'
import {
  createPlayer,
  movePlayer,
  obstacleCell,
  PLAYH_MIN,
  PLAYH_MAX,
  type Player,
  type InputCounts,
} from '../src/core/player'
import { createPlayfield, PLYFLD_STRIDE, MUSHROOM_FULL, type Playfield } from '../src/core/playfield'

// movePlayer with the (new, optional) field argument. Cast keeps the test loadable
// under vitest even before GREEN widens the signature; the RED signal is the
// behavioural assertion, not the arity.
type MoveWithField = (player: Player, counts: InputCounts, field?: Playfield) => Player
const move = movePlayer as unknown as MoveWithField

/** Put a full mushroom at grid (col,row). */
function plant(field: Playfield, col: number, row: number): void {
  field.cells[col * PLYFLD_STRIDE + row] = MUSHROOM_FULL
}

describe('cp2-3 AC-4 — the gun is blocked from gliding into a mushroom cell', () => {
  it('HORIZONTAL: a mushroom in the target column keeps the gun at its old H (CT-30)', () => {
    // Gun in column 14 (h=0x86); a +4 px step crosses into column 13 (h=0x8A).
    const g: Player = { ...createPlayer(), h: 0x86, v: 0x10 }
    const candidateH = 0x8a // 0x86 + applyTblmt(8)=+4
    const target = obstacleCell(candidateH, g.v)
    expect(target.h, 'the step must actually cross a column boundary').not.toBe(obstacleCell(g.h, g.v).h)

    const field = createPlayfield()
    plant(field, target.h, target.v)
    const after = move(g, { dh: 8, dv: 0, fire: false }, field)
    expect(after.h, 'MOVE refuses to enter a mushroom column — gun holds its old H').toBe(g.h)
    expect(after.v, 'the blocked axis leaves V untouched').toBe(g.v)
  })

  it('VERTICAL: a mushroom in the target row keeps the gun at its old V (CT-31)', () => {
    const g: Player = { ...createPlayer(), h: 0x80, v: 0x10 }
    const candidateV = 0x14 // 0x10 + applyTblmt(8)=+4
    const target = obstacleCell(g.h, candidateV)
    expect(target.v, 'the step must actually cross a row boundary').not.toBe(obstacleCell(g.h, g.v).v)

    const field = createPlayfield()
    plant(field, target.h, target.v)
    const after = move(g, { dh: 0, dv: 8, fire: false }, field)
    expect(after.v, 'MOVE refuses to enter a mushroom row — gun holds its old V').toBe(g.v)
    expect(after.h, 'the blocked axis leaves H untouched').toBe(g.h)
  })

  it('a clear target cell still moves normally — the block only fires on a mushroom', () => {
    const g: Player = { ...createPlayer(), h: 0x86, v: 0x10 }
    const emptyField = createPlayfield()
    const after = move(g, { dh: 8, dv: 0, fire: false }, emptyField)
    expect(after.h, 'no mushroom ahead => the gun advances (block is not always-on)').toBe(0x8a)
  })
})

describe('cp2-3 AC-4 — cp1-5 movement is preserved (no regression)', () => {
  it('the 3-arg form on an empty field equals the 2-arg bounds-only form', () => {
    const g = { ...createPlayer(), h: 0x80, v: 0x10 }
    const emptyField = createPlayfield()
    for (const counts of [
      { dh: 8, dv: 0, fire: false },
      { dh: -8, dv: 4, fire: false },
      { dh: 0, dv: -8, fire: false },
    ] as InputCounts[]) {
      expect(move(g, counts, emptyField), `empty field must not change (${counts.dh},${counts.dv})`).toEqual(
        movePlayer(g, counts),
      )
    }
  })

  it('edge bounds still clamp with a field present (cp1-5 PS-3/4 stay honoured)', () => {
    const emptyField = createPlayfield()
    let g = { ...createPlayer(), h: PLAYH_MAX, v: 0x10 }
    for (let i = 0; i < 50; i++) g = move(g, { dh: 100, dv: 0, fire: false }, emptyField)
    expect(g.h, 'never past the left edge even with a field').toBeLessThanOrEqual(PLAYH_MAX)
    g = { ...createPlayer(), h: PLAYH_MIN, v: 0x10 }
    for (let i = 0; i < 50; i++) g = move(g, { dh: -100, dv: 0, fire: false }, emptyField)
    expect(g.h, 'never past the right edge even with a field').toBeGreaterThanOrEqual(PLAYH_MIN)
  })
})
