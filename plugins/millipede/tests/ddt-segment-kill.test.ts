// tests/ddt-segment-kill.test.ts
//
// Story ml12-3 — RED phase (TEA / O'Brien). THE DDT CLOUD KILLS MILLIPEDE
// SEGMENTS. Owner playtest finding (2026-08-17): deploying a DDT does NOT damage
// or kill the train. The DDT *visual* shipped in ml9-3/ml11 (the blue box + red
// 'DDT' glyph); the *kill* was left as a documented caller-side seam — the DDT
// dossier itself records "DDTEX1 -> SHOOT2 kill dispatch" as NOT modelled yet
// (see plugins/millipede/tests/ddt.test.ts SCOPE block). This story wires it.
//
// ─── GROUND TRUTH (reference/original-source/millipede/MILLI.MAC) ─────────────
// The kill lives in MOTION, the per-segment march (MILLI.MAC:1444-1632). After a
// segment has MOVED (its MOBJV/MOBJH updated at :1601-1608), the ROM checks the
// cell it now stands on for a DDT cloud and destroys it:
//
//   1609  STA TEMP1
//   1610  LDA X,MOBJV
//   1611  LDY I,0            ; <-- Y=0: OBSTAC's 8*DIR term vanishes, so this reads
//   1612  JSR OBSTAC         ;     the OCCUPIED cell (H,V) itself, NOT the cell-
//   1613  JSR DDTEXP         ;     ahead the TURN check (:1527 OBSTA0, Y=DIR) reads.
//   1614  BCS 30$            ; OBJECT DESTROYED -> skip PLAY (:1615) AND the turn.
//
// DDTEXP (MILLI.MAC:1942-1963) is the classifier: a stamp in [CLOUD, DDT) —
// i.e. [0x2E, 0x6E) — is "inside a cloud"; anything else exits carry-clear (no
// kill). Inside, DDTEX1 (:1946-1959) sets the explosion picture ($FF), scores,
// plays CHAN2=$14, and returns carry-set = destroyed. SHOOT2's millipede branch
// (142$, MILLI.MAC:2148-2176) drops a mushroom (MUSHER) at the dead cell and
// DECs DEAD — so a cloud kill removes the segment from the live count and plants
// a mushroom, exactly like a shot kill (sim.ts's SHOOT2-vs-segment path).
//
// Claims: DD-215/216 (the [CLOUD,DDT) range), DD-217/218 (DDTEX1->SHOOT2), and
// the MOTION call-site DD-219..222 — all byte-verified against the vendored 1982
// source by tests/audit/citations.test.ts.
//
// ─── RADIX ──────────────────────────────────────────────────────────────────
// MILLI.MAC/MLSUB.MAC/MLDEF.MAC are `.RADIX 16`: CLOUD=0x2E, DDT=0x6E are hex.
//
// ─── WHY THIS IS RED ─────────────────────────────────────────────────────────
// stepGame today marches segments straight through a cloud untouched (the turn
// table at :1531-1532 "GO THRU DTT CLOUDS" is wired, but the SEPARATE :1611-1614
// kill is not). A segment standing on a cloud cell therefore survives. These
// tests place a marching segment so its OCCUPIED cell is a cloud and assert it is
// destroyed — RED until the MOTION kill lands.

import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/core/game-state'
import { stepGame, type GameInput } from '../src/core/sim'
import {
  BODY_COLOR,
  HEAD_COLOR,
  POISON_COLOR,
  type Segment,
} from '../src/core/millipede'
import { obstacOffset } from '../src/core/mushroom'
import {
  CLOUD_STAMP,
  DDT_STAMP,
  DDT_EXPLOSION_START,
  DDT_ANCHOR_BACKSTEP,
  ddtExplosionStep,
  inDdtCloud,
  newDdtTable,
  type DdtTable,
} from '../src/core/ddt'

const NO_INPUT: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const SIZE = 0x3c0
const emptyField = (): Uint8Array => new Uint8Array(SIZE)

// A still-marching train segment (a live THREAT). A DDT kill turns it into an
// explosion / removes it, so it leaves this set — whether GREEN filters it out
// or parks it as an explosion (colour >= 0xC0), the observable is the same.
const MARCH_COLORS: readonly number[] = [HEAD_COLOR, BODY_COLOR, POISON_COLOR]
const marching = (g: GameState): Segment[] =>
  g.segments.filter((s) => MARCH_COLORS.includes(s.color))

/** A coasting body ON an 8px cell boundary (v & 7 == 0), heading right at +2.
 *  Only a boundary segment marches LEVEL — one off the boundary is "mid-drop"
 *  and keeps descending (millipede.ts:297, MOTION 71$ :1481-1482). On a boundary
 *  it steps h -> (h+2)&0xFF with v unchanged (move(s,false)), so its post-move
 *  OCCUPIED cell is deterministic. (obstac.test.ts uses v=0x50 for the same
 *  reason.) */
const body = (h: number, v = 0x60): Segment => ({
  h,
  v,
  dh: 2,
  dv: 2,
  pic: 3,
  color: BODY_COLOR,
})

/** The field cell a coasting body OCCUPIES after one free-space step, exactly as
 *  MOTION reads it at :1611-1612 (post-move H,V with direction 0). */
const occupiedCellAfterStep = (seg: Segment): number =>
  obstacOffset((seg.h + seg.dh) & 0xff, seg.v, 0)

/** The cell the TURN check reads — the cell 8px AHEAD in the heading direction
 *  (:1527 OBSTA0, Y=sign(dh)). Distinct from the occupied cell above. */
const aheadCellAfterStep = (seg: Segment): number =>
  obstacOffset((seg.h + seg.dh) & 0xff, seg.v, seg.dh < 0 ? -1 : 1)

/** A clean play state: empty field (no scattered mushrooms/bombs), no DDT bank
 *  exploding (so ddtExplosionStep is a no-op and our seeded stamps persist),
 *  and exactly the given segments. */
const play = (segments: Segment[], field = emptyField(), ddt?: DdtTable): GameState => {
  const g = createGame(0x12_3, { phase: 'play' })
  return { ...g, field, ddt: ddt ?? newDdtTable(), segments, frame: 0 }
}

describe('ml12-3 AC1 — a DDT cloud KILLS a millipede segment (MILLI.MAC:1611-1614)', () => {
  it('a segment whose OCCUPIED cell is a cloud is destroyed by one step', () => {
    const seg = body(0x60)
    const field = emptyField()
    field[occupiedCellAfterStep(seg)] = CLOUD_STAMP // 0x2E, in [CLOUD, DDT)
    const before = marching(play([seg], field))
    expect(before, 'precondition: one marching segment before the step').toHaveLength(1)

    const after = marching(stepGame(play([seg], field), NO_INPUT))
    expect(after, 'the segment standing on a cloud is killed (DDTEXP -> destroyed)').toHaveLength(0)
  })

  it('CONTROL: the SAME segment over an EMPTY field survives — the cloud is the cause', () => {
    const seg = body(0x60)
    const after = marching(stepGame(play([seg], emptyField()), NO_INPUT))
    expect(after, 'no cloud, no kill: the segment marches on').toHaveLength(1)
    expect(after[0].color).toBe(BODY_COLOR)
  })

  it('inside-dies / outside-lives: only the segment IN the cloud is killed', () => {
    const killed = body(0x60)
    const survivor = body(0xc0)
    const field = emptyField()
    const killCell = occupiedCellAfterStep(killed)
    const surviveCell = occupiedCellAfterStep(survivor)
    expect(killCell, 'the two segments occupy different cells').not.toBe(surviveCell)
    field[killCell] = CLOUD_STAMP // seed ONLY the killed segment's cell

    const after = marching(stepGame(play([killed, survivor], field), NO_INPUT))
    expect(after, 'exactly one survivor — the one outside the cloud').toHaveLength(1)
    // The survivor coasted one step to the right; it did NOT die.
    expect(after[0].color).toBe(BODY_COLOR)
    expect(after[0].h).toBe((survivor.h + survivor.dh) & 0xff)
  })
})

describe('ml12-3 AC1 — the kill band is EXACTLY [CLOUD, DDT) (DDTEXP, MILLI.MAC:1942-1944)', () => {
  // Each case seeds the killed segment's occupied cell with one stamp and asks:
  // did the DDT mechanic destroy it? Only [0x2E, 0x6E) may.
  const stepWithOccupiedStamp = (stamp: number): number => {
    const seg = body(0x60)
    const field = emptyField()
    field[occupiedCellAfterStep(seg)] = stamp
    return marching(stepGame(play([seg], field), NO_INPUT)).length
  }

  it('CLOUD (0x2E) — the low edge of the band — kills', () => {
    expect(stepWithOccupiedStamp(CLOUD_STAMP)).toBe(0)
  })

  it('DDT-1 (0x6D) — the high edge, just below DDT — kills', () => {
    expect(stepWithOccupiedStamp(DDT_STAMP - 1)).toBe(0) // 0x6D
  })

  it('a LETTER (0x10, below CLOUD) does NOT DDT-kill — the segment lives', () => {
    // < CLOUD is a TURN obstacle for the cell-AHEAD, but in the OCCUPIED cell it
    // is no DDT cloud: DDTEXP exits carry-clear (:1943 BCC 25$).
    expect(stepWithOccupiedStamp(0x10)).toBe(1)
  })

  it('a DDT BOMB stamp (0x6E, == DDT) does NOT DDT-cloud-kill — the segment lives', () => {
    // >= DDT exits carry-clear (:1944-1945 BCS 25$); a bomb is not its own cloud.
    expect(stepWithOccupiedStamp(DDT_STAMP)).toBe(1)
  })
})

describe('ml12-3 AC2 — the kill reads the OCCUPIED cell, not the cell-ahead (MILLI.MAC:1611 LDY I,0)', () => {
  // This is the regression guard for the shipped "head passes THROUGH a DDT
  // cloud" turn behaviour (obstac.test.ts:354-359, MILLI.MAC:1531-1532). That
  // test puts a cloud in the cell-AHEAD and asserts no turn; the kill must read a
  // DIFFERENT cell (the occupied one, Y=0) or it would destroy that passing head
  // and turn the pass-through test red. Here: a cloud ONLY in the cell-ahead must
  // NOT kill.
  it('a cloud in the cell-AHEAD (but not the occupied cell) does NOT kill — pass-through preserved', () => {
    const seg = body(0x60)
    const ahead = aheadCellAfterStep(seg)
    const occupied = occupiedCellAfterStep(seg)
    expect(ahead, 'ahead and occupied are distinct cells').not.toBe(occupied)

    const field = emptyField()
    field[ahead] = CLOUD_STAMP // cloud AHEAD only — the occupied cell stays empty
    const after = marching(stepGame(play([seg], field), NO_INPUT))
    expect(after, 'a cloud merely ahead is passed through, not a kill').toHaveLength(1)
  })
})

describe('ml12-3 AC1 — a REAL triggered DDT explosion kills a segment in its blast', () => {
  // Liveness, not just the classifier: drive an actual explosion frame so
  // ddtExplosionStep DRAWS cloud stamps into the field (as a deployed DDT does),
  // then march a segment onto a drawn cell. The FRAME&7==0 gate (DD-102) fires
  // the draw; the just-hit state 0xB4 (DD-211) draws the smallest cloud (LIST_97,
  // idx 9), whose offset 0x61 carries a cloud stamp — so an anchor of C-0x61
  // (DD-210 backstep) lands a cloud on cell C.
  const seg = body(0x80, 0x50)
  const C = occupiedCellAfterStep(seg) // the cell the segment will occupy
  const anchor = C - DDT_ANCHOR_BACKSTEP // 0x61 (DD-210)

  const explodingTable = (): DdtTable => {
    const t = newDdtTable()
    t[3] = { lo: anchor & 0xff, hi: DDT_EXPLOSION_START | ((anchor >> 8) & 3) }
    return t
  }

  it('the explosion actually DRAWS a cloud onto the segment’s cell (sanity)', () => {
    const field = emptyField()
    ddtExplosionStep(explodingTable(), field, 8) // FRAME&7==0 -> draw
    expect(inDdtCloud(field[C]), 'a real cloud stamp now sits on cell C').toBe(true)
  })

  it('a segment marching into a live explosion cloud is killed', () => {
    // frame=8: FRAME&7==0 draws the cloud (step 6) BEFORE the segment marches
    // (step 8), so its occupied cell C is a cloud when the kill check runs.
    const state = { ...play([seg], emptyField(), explodingTable()), frame: 8 }
    const after = marching(stepGame(state, NO_INPUT))
    expect(after, 'the deployed DDT kills the segment in its blast').toHaveLength(0)
  })
})
