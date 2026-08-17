// tests/segment-shot-kill-score.test.ts
//
// Story ml13-2 — RED phase (Leeloo / TEA). SHOT-KILL SCORING: a player shot that
// kills a millipede segment must score the ROM head/body split — body 10, head 100
// — NOT the flat provisional SEGMENT_PTS = 10 the port awards today (sim.ts:72,185).
// This is the shot-kill sibling of ml12-3, which already made the DDT-cloud kill
// path ROM-faithful (body 30 / head 300, tripled from this base).
//
// ─── GROUND TRUTH (reference/original-source/millipede/MILLI.MAC, .RADIX 16) ──────
// The kill scores in SHOOT2's millipede branch, 142$ (MILLI.MAC:2148-2180). After
// planting the mushroom and DECing DEAD it awards points:
//
//   2161       LDY I,0
//   2162       LDA I,10        ;BODY=10 POINTS      <- the flat BASE (DD-225)
//   2163       BIT TEMP3+1                          \ DDT-death flag: set ONLY on a
//   2164       BPL 16$         ;NO DDT DEATH        / DDT-cloud kill (DDTEX1 :1947).
//   2165       LDA I,30                             <- DDT override (DD-223); a SHOT
//                                                      kill SKIPS this (BPL taken).
//   2166  16$: PHA
//   2167       LDA X,MOBJC     \ head-vs-body: a BODY is colour >= 0x3D (BODY_COLOR),
//   2168       CMP I,3D        / a head (0x39) or poisoned head (0x1B) is below it.
//   2169       PLA
//   2170       BCS 145$        ;IF BODY SEGMENT     <- body keeps the loaded byte
//   2171       LSR             ;100 POINTS FOR A HEAD  \ head: LSR x4 shifts the base
//   2172       LSR                                     | byte 0x10 into the hundreds
//   2173       LSR                                     | digit (0x10 >> 4 = 1 -> 100).
//   2174       LSR                                     /  (DD-226)
//   2175       TAY
//
// So a SHOT kill (no DDT flag) scores BODY = BCD 10 (:2162, DD-225) and HEAD = BCD
// 100 (:2171-2175 LSR x4 of the base 0x10, DD-226). The DDT premium 30/300
// (DD-223/224) is exactly 3x this base — the same LSR×4 turns 0x30 into 300, which
// is why the shipped DDT_KILL_*_PTS constants corroborate these base values.
//
// ─── RADIX ────────────────────────────────────────────────────────────────────
// MILLI.MAC is `.RADIX 16`: `LDA I,10` loads 0x10 = BCD ten, `LDA I,30` loads 0x30
// = BCD thirty. The scoring is 3-byte BCD (SCORNG, MLSUB.MAC:1040+), and the head's
// LSR×4 self-proves the hex reading: 0x10 >> 4 = 0x01 (a head hundreds digit = 100),
// whereas a decimal 10 (0x0A) >> 4 = 0 would score a head ZERO, contradicting the
// ";100 POINTS FOR A HEAD" comment. The shipped DDT head constant (300 = 0x30 >> 4)
// is the same arithmetic on the tripled byte.
//
// ─── WHY THIS IS RED ────────────────────────────────────────────────────────────
// sim.ts:185 does `score += SEGMENT_PTS` (a flat 10) for EVERY shot kill, head or
// body. So a body kill already scores 10 (these body tests are GREEN guards that
// pin it survives the fix), but a HEAD kill scores a wrong 10 — the head=100 and
// discriminator tests below are RED until GREEN adds the head/body branch (mirroring
// sim.ts:299's DDT-kill split `s.color >= BODY_COLOR ? … : …`).

import { describe, it, expect } from 'vitest'
import { createGame, type GameState } from '../src/core/game-state'
import { stepGame, type GameInput } from '../src/core/sim'
import { BODY_COLOR, HEAD_COLOR, POISON_COLOR, type Segment } from '../src/core/millipede'
import { obstacOffset } from '../src/core/mushroom'
import {
  CLOUD_STAMP,
  DDT_KILL_BODY_PTS,
  DDT_KILL_HEAD_PTS,
  newDdtTable,
  type DdtTable,
} from '../src/core/ddt'

// The ROM base shot-kill scores — BCD values from SHOOT2 142$ (MILLI.MAC), NOT the
// flat provisional 10. Local cited consts (the ddt-segment-kill.test.ts pattern):
// the assertion pins what stepGame PRODUCES, decoupled from any constant name GREEN
// may introduce.
const SHOT_BODY_PTS = 10 // MILLI.MAC:2162 `LDA I,10 ;BODY=10 POINTS` (DD-225)
const SHOT_HEAD_PTS = 100 // MILLI.MAC:2171-2175 LSR×4 of 0x10 -> hundreds (DD-226)

const NO_INPUT: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const SIZE = 0x3c0
const emptyField = (): Uint8Array => new Uint8Array(SIZE)
const kinds = (g: GameState): string[] => g.events.map((e) => e.type)

/** A clean play state: empty field, empty (non-exploding) DDT bank, exactly the given
 *  segments, score zeroed — so a single kill is the ONLY score source this frame
 *  (no bonus-life threshold is crossed by 10/100). */
const play = (segments: Segment[], field = emptyField(), over?: Partial<GameState>): GameState => ({
  ...createGame(0x12_3, { phase: 'play' }),
  field,
  ddt: newDdtTable() as DdtTable,
  segments,
  frame: 0,
  score: 0,
  ...over,
})

/** A stationary segment sitting at (0x80,0x40). The shot resolves against it in
 *  stepGame's shot phase (sim.ts:180-190) BEFORE the march, so dh/dv are irrelevant
 *  — the segment is removed the same frame. */
const segAt = (color: number): Segment => ({ h: 0x80, v: 0x40, dh: 0, dv: 0, pic: 0, color })

/** Fire a shot already ON the segment and step once: the shot kills it and scores. */
const shootKill = (color: number): GameState =>
  stepGame(play([segAt(color)], emptyField(), { shot: { active: true, h: 0x80, v: 0x40 } }), NO_INPUT)

describe('ml13-2 — a shot kill emits the kill (preconditions: a score mismatch below is a VALUE bug, not a missed kill)', () => {
  for (const [name, color] of [
    ['body', BODY_COLOR],
    ['head', HEAD_COLOR],
    ['poisoned head', POISON_COLOR],
  ] as const) {
    it(`a shot on a ${name} segment kills it and consumes the shot`, () => {
      const after = shootKill(color)
      expect(kinds(after), 'the segment-killed cue fires').toContain('segment-killed')
      expect(after.shot.active, 'the shot is consumed').toBe(false)
      expect(after.segments.some((s) => s.color === color), 'the segment is gone').toBe(false)
    })
  }
})

describe('ml13-2 AC1/AC2 — a shot kill scores the ROM head/body split (MILLI.MAC:2162-2175, DD-225/226)', () => {
  it('a BODY segment shot-kill scores 10 (guard: the ROM body value survives the fix)', () => {
    // Already 10 today (the flat SEGMENT_PTS coincides with the ROM body value); this
    // guards that GREEN's head/body branch does not disturb the body award.
    expect(shootKill(BODY_COLOR).score).toBe(SHOT_BODY_PTS)
  })

  it('a HEAD segment shot-kill scores 100, not the flat 10 (RED driver, MILLI.MAC:2171-2175)', () => {
    expect(shootKill(HEAD_COLOR).score).toBe(SHOT_HEAD_PTS)
  })

  it('a POISONED-HEAD (colour 0x1B < 0x3D) shot-kill also scores 100 — it is a head, not a body', () => {
    // MILLI.MAC:2167-2170 CMP I,3D / BCS 145$: anything below BODY_COLOR (0x3D) is a
    // head, so a poisoned head (0x1B) takes the LSR×4 hundreds path too.
    expect(shootKill(POISON_COLOR).score).toBe(SHOT_HEAD_PTS)
  })
})

describe('ml13-2 — the split is REAL, not a coincidental flat constant (discriminator)', () => {
  it('a head scores exactly 10x a body (100 vs 10) — they must DIFFER', () => {
    const bodyScore = shootKill(BODY_COLOR).score
    const headScore = shootKill(HEAD_COLOR).score
    expect(headScore, 'head != body: the flat-10 award is gone').not.toBe(bodyScore)
    expect(headScore, 'head is 10x the body (BCD hundreds vs units)').toBe(bodyScore * 10)
  })
})

describe('ml13-2 — the base is 1/3 of the DDT premium (DD-223/224 ↔ DD-225/226 ROM relationship)', () => {
  // Ties the base shot values to the SHIPPED DDT constants: the DDT-death flag only
  // TRIPLES this base (LDA I,10 -> LDA I,30; the head LSR×4 is shared). If either
  // pair is ever re-derived, this pins that the 3x relationship must be preserved.
  it('the DDT body premium (30) is 3x the shot body base (10)', () => {
    expect(DDT_KILL_BODY_PTS).toBe(SHOT_BODY_PTS * 3)
  })
  it('the DDT head premium (300) is 3x the shot head base (100)', () => {
    expect(DDT_KILL_HEAD_PTS).toBe(SHOT_HEAD_PTS * 3)
  })
})

describe('ml13-2 AC4 — regression: the DDT-cloud kill path is UNCHANGED (still 30/300)', () => {
  // The shot-kill and DDT-kill paths share SHOOT2 142$, so a badly-shared GREEN change
  // could disturb the DDT premium. A minimal in-file guard (ddt-segment-kill.test.ts
  // owns the full DDT-kill behaviour): march a boundary segment onto an occupied-cell
  // cloud (MILLI.MAC:1611 LDY I,0) with NO shot, and pin its premium score.
  const marchingBody = (h: number, v = 0x60): Segment => ({ h, v, dh: 2, dv: 2, pic: 3, color: BODY_COLOR })
  const marchingHead = (h: number, v = 0x60): Segment => ({ h, v, dh: 2, dv: 2, pic: 3, color: HEAD_COLOR })
  const occupiedCellAfterStep = (seg: Segment): number => obstacOffset((seg.h + seg.dh) & 0xff, seg.v, 0)
  const ddtKill = (seg: Segment): GameState => {
    const field = emptyField()
    field[occupiedCellAfterStep(seg)] = CLOUD_STAMP // occupied-cell cloud -> DDT kill
    return stepGame(play([seg], field), NO_INPUT)
  }

  it('a DDT-cloud kill of a BODY still scores the premium 30 (unchanged)', () => {
    expect(ddtKill(marchingBody(0x60)).score).toBe(DDT_KILL_BODY_PTS)
  })

  it('a DDT-cloud kill of a HEAD still scores the premium 300 (unchanged)', () => {
    expect(ddtKill(marchingHead(0x60)).score).toBe(DDT_KILL_HEAD_PTS)
  })
})
