// tests/frame-order.test.ts
//
// Story cp2-15 (RED, O'Brien) — the ROM mainloop's PLAY-vs-SHOOT order and
// SHOOT's descending slot scan, pinned at the stepSim level.
//
// Ground truth (CENTI4.MAC, revision.v4 — every line re-opened this session):
//   :30 JSR MOTION   — move centipedes (PLAY per segment inside, :1449)
//   :31 JSR EXPLOD   — explosion countdown, slots 0-13
//   :32 JSR MOVE     — move player
//   :33 JSR BUGMV    — move spider; ":416-417 LDX I,13. / JSR PLAY" tests the
//                      gun against the spider's POST-move position
//   :34 JSR SHOOT    — ONE scan for every slot: ":2171 11$: LDX I,13." then
//                      ":2292-2294 16$: DEX / BMI 30$ / JMP 115$" — descending,
//                      and a hit exits through 19$ without resuming the scan
//
// On a gun contact, PLAYEX (:1800-1808) stamps the COLLIDING slot's picture
// 0xFF ("LDA I,0FF / STA X,MOBJP") and blanks the shot ("LDA I,28 / STA
// SHOTP"), so the SHOOT that follows skips the slot (":2177-2178 CMP I,0F8 /
// BCS 132$") and NOTHING scores on a death frame. The sim currently resolves
// every shot collision first and tests the gun last, so the same frame kills
// the creature, pays its points, and spares the player — backwards.
//
// These are stepSim tests on purpose: the defect is the FRAME ORDER, which no
// unit test on an individual resolver can see. Stagings are rng-silent (parked
// slot-12/13 defaults draw nothing for one frame; spider count2 is far from 0)
// so every expectation is deterministic.

import { describe, expect, it } from 'vitest'
import {
  createSim,
  stepSim,
  DEATH_DELAY,
  PLAYER_EXPLODE_START,
  type SimState,
} from '../src/core/sim'
import type { InputCounts } from '../src/core/player'
import {
  CENT_BODY_PIC,
  CENT_HEAD_PIC,
  DEAD_BIT,
  type Segment,
} from '../src/core/centipede'
import {
  SPIDER_PIC_MIN,
  SPIDER_PTS_300,
  SPIDER_SCORE_300,
  SPIDER_TURN_COUNT,
  type Spider,
} from '../src/core/spider'
import { SCORP_PIC_LOW, SCORP_SCORE, isScorpion } from '../src/core/scorpion'

const IDLE: InputCounts = { dh: 0, dv: 0, fire: false }

/** A live walking spider staged so ONE BUGMV step lands it exactly where the
 *  test needs it. dh is SUBTRACTED from h and dv from v (:342-356, the sign
 *  trap); count2 far from 0 so no direction roll draws rng. */
const spiderAt = (over: Partial<Spider>): Spider => ({
  h: 0x80,
  v: 0x40,
  dh: 0,
  dv: 1,
  pic: SPIDER_PIC_MIN,
  count2: SPIDER_TURN_COUNT,
  count: 0,
  oldDh: 2,
  pts: SPIDER_PTS_300,
  ...over,
})

/** A live body segment marching horizontally (MOTION ADDS dh, :1445-1448).
 *  v is chosen off the (v & 7) === 4 turn phase so one step never dives. */
const bodyAt = (h: number, v: number): Segment => ({ h, v, dh: 2, dv: 2, pic: CENT_BODY_PIC })

/** A far-corner bystander so a staged kill can never empty the train and trip
 *  the wave-clear branch instead of the branch under test. 0xA0 & 7 = 0. */
const BYSTANDER: Segment = { h: 0x20, v: 0xa0, dh: 2, dv: 2, pic: CENT_BODY_PIC }

/** Stage a playing-state sim with an empty field (no mushroom can intercept
 *  the shot or feed the spider) and the given overrides. */
function staged(over: Partial<SimState>): SimState {
  const s = createSim(0x5150)
  s.playfield.cells.fill(0)
  return { ...s, ...over } as SimState
}

// ════════════════════════════════════════════════════════════════════════════
// AC-1 — PLAY (:417, inside BUGMV :33) resolves BEFORE SHOOT (:34): a creature
// in both the gun box and the shot box kills the PLAYER and awards NO points.
// ════════════════════════════════════════════════════════════════════════════

describe('cp2-15 AC-1 — PLAY before SHOOT (CENTI4.MAC:33-34, :417, :1806, :2177-2178)', () => {
  it('a spider in BOTH the gun box and the shot box kills the PLAYER and scores nothing', () => {
    // Gun at (0x80, 0x08). Staged shot at the gun column advances +7 to
    // (0x80, 0x0F) before any collision test reads it.
    //
    // The spider is staged one BUGMV step OUTSIDE both boxes — (0x8A, 0x0D):
    // pre-move the gun sees |dH| = 10 >= 10 (:1781 "CMP I,10." DECIMAL) and the
    // shot sees |dH| = 10 >= 10 (:2232) — and lands one step INSIDE both:
    // post-move (0x89, 0x0C) gives the gun |dH| 9, |dV| 4, sum 13 < 14 (:1822)
    // and the shot |dH| 9 < 10, |dV| 3 < 5 (:2202). Only an implementation
    // that runs BUGMV's move FIRST (:342-356), THEN PLAY (:417), THEN SHOOT
    // (:34) kills the player here; testing the gun before the move, or the
    // shot before the gun, each leaves the player alive.
    const s = staged({
      segs: [BYSTANDER],
      spider: spiderAt({ h: 0x8a, v: 0x0d, dh: 1, dv: 1 }),
      shot: { h: 0x80, v: 0x08, live: true },
    })
    const before = s.score

    const after = stepSim(s, IDLE)

    // The ROM kills the PLAYER: PLAYEX arms the death pause and the explosion.
    expect(after.delay, 'gun contact arms the death pause (:1801-1802 DELAY=0x30)').toBe(DEATH_DELAY)
    expect(after.playerExplode, 'and the player explosion picture (:1803-1804)').toBe(PLAYER_EXPLODE_START)
    // ...and pays NOTHING: the collider is stamped 0xFF (:1805-1806) and SHOOT
    // skips a slot at or above 0xF8 (:2177-2178), so no 300/600/900 lands.
    expect(after.score, 'no spider points score on a PLAY death frame').toBe(before)
    // The life itself is spent when the pause ends, not at contact (CT-65).
    expect(after.lives, 'contact frame does not shortcut the life count').toBe(s.lives)
  })

  it('a segment in BOTH the gun box and the shot box kills the PLAYER and scores nothing', () => {
    // MOTION (:30) marches the head from (0x80, 0x0D) to (0x82, 0x0D), still
    // inside the gun box (|dH| 2 < 7, |dV| 5 < 7, sum 7 < 0x0C) and inside the
    // advanced shot's segment windows (|dV| 2 < 5, |dH| 2 < 6 per :2202/:2266).
    // The ROM's per-segment PLAY (:1449, inside MOTION) runs before SHOOT
    // (:34): the player dies, the head is stamped 0xFF (:1806), and SHOOT
    // skips it — no 100 points. The sim today shoots the head first (pre-march,
    // at (0x80, 0x0D)), pays SCORE_HEAD, and the vacated slot then cannot
    // collide with the gun at all.
    const s = staged({
      segs: [BYSTANDER, { h: 0x80, v: 0x0d, dh: 2, dv: 2, pic: CENT_HEAD_PIC }],
      shot: { h: 0x80, v: 0x08, live: true },
    })
    const before = s.score

    const after = stepSim(s, IDLE)

    expect(after.delay, 'gun contact arms the death pause (:1801-1802)').toBe(DEATH_DELAY)
    expect(after.playerExplode, 'and the player explosion picture (:1803-1804)').toBe(PLAYER_EXPLODE_START)
    expect(after.score, 'no segment points score on a PLAY death frame').toBe(before)
  })
})

// ════════════════════════════════════════════════════════════════════════════
// AC-2 — SHOOT is ONE descending scan from slot 13 (:2171 "11$: LDX I,13.",
// :2292-2294 "16$: DEX / BMI 30$ / JMP 115$"); the first slot inside both
// windows is killed, the hit exits through 19$, and no lower slot is tested.
// ════════════════════════════════════════════════════════════════════════════

describe('cp2-15 AC-2 — SHOOT scans slots descending from 13, first match ends the scan', () => {
  it('a shot inside the spider window AND a segment window kills the SPIDER at the spider band', () => {
    // Staged shot (0x60, 0x59) advances to (0x60, 0x60). The spider's one
    // BUGMV step lands it exactly there (dead centre of the :2202/:2232
    // windows); the body at (0x63, 0x60) is inside the segment windows both
    // pre-march (|dH| 3) and post-march (|dH| 5 < 6, :2266). The gun at
    // (0x80, 0x08) is far from everything, and |spiderV − PLAYV| = 0x58 >=
    // 0x40, so the ROM pays the FAR band: 300 (:2236-2244).
    const s = staged({
      segs: [BYSTANDER, bodyAt(0x63, 0x60)],
      spider: spiderAt({ h: 0x60, v: 0x61, dh: 0, dv: 1 }),
      shot: { h: 0x60, v: 0x59, live: true },
    })
    const before = s.score

    const after = stepSim(s, IDLE)

    expect(after.score - before, 'the SPIDER scores — 300, the far proximity band, not 10/100').toBe(SPIDER_SCORE_300)
    expect((after.spider.pic & DEAD_BIT) !== 0, 'slot 13 took the hit (:2171 scans it first)').toBe(true)
    expect(after.spider.pts, 'the points sprite is the 300 face (:2236-2237)').toBe(SPIDER_PTS_300)
    // First match EXITS the scan (:2292-2294 never resumes after 19$): the
    // segment in the shot's window survives untouched, un-split, un-scored.
    expect(after.segs[1].pic, 'the segment inside the same shot window survives').toBe(CENT_BODY_PIC)
    expect(
      Array.from(after.playfield.cells).every((c) => c === 0),
      'no mushroom drops — a segment kill would have stamped one (:2287 MUSHER)',
    ).toBe(true)
  })

  it('a shot inside the scorpion window AND a segment window kills the SCORPION (slot 12 beats 0-11)', () => {
    // Slot 12 is scanned before every segment slot (:2292-2294). The scorpion
    // sits exactly on the advanced shot (SHOOT reads slot 12 where it moved
    // FROM — SCORP :36 runs after SHOOT :34); the body is inside the segment
    // windows both pre- and post-march. The ROM pays 1000 (:2226-2228) and the
    // segment survives; the sim today pays 10 and spares the scorpion.
    const s = staged({
      segs: [BYSTANDER, bodyAt(0x63, 0x60)],
      flea: { h: 0x60, v: 0x60, dh: 2, dv: 0, pic: SCORP_PIC_LOW },
      shot: { h: 0x60, v: 0x59, live: true },
    })
    const before = s.score

    const after = stepSim(s, IDLE)

    expect(after.score - before, 'the SCORPION scores 1000 (:2226-2228), not the segment 10').toBe(SCORP_SCORE)
    expect((after.flea.pic & DEAD_BIT) !== 0, 'slot 12 took the hit').toBe(true)
    expect(after.segs[1].pic, 'the segment inside the same shot window survives').toBe(CENT_BODY_PIC)
    expect(
      Array.from(after.playfield.cells).every((c) => c === 0),
      'no mushroom drops — a segment kill would have stamped one',
    ).toBe(true)
  })

  it('slot 13 beats slot 12: a shot inside BOTH the spider and scorpion windows kills the SPIDER', () => {
    // GUARD (expected green today AND after the fix): the sim already resolves
    // the spider before slot 12; this pins the 13-before-12 leg of the
    // descending scan so the reorder cannot invert it. The spider lands on the
    // advanced shot; the scorpion at (0x65, 0x60) is |dH| 5 < 10 (:2226-2227)
    // — in window, but never reached once slot 13 matches.
    const s = staged({
      segs: [BYSTANDER],
      spider: spiderAt({ h: 0x60, v: 0x61, dh: 0, dv: 1 }),
      flea: { h: 0x65, v: 0x60, dh: 2, dv: 0, pic: SCORP_PIC_LOW },
      shot: { h: 0x60, v: 0x59, live: true },
    })
    const before = s.score

    const after = stepSim(s, IDLE)

    expect(after.score - before, 'the spider band pays, not the scorpion 1000').toBe(SPIDER_SCORE_300)
    expect((after.spider.pic & DEAD_BIT) !== 0, 'slot 13 took the hit').toBe(true)
    expect(isScorpion(after.flea.pic), 'the scorpion survives the frame alive').toBe(true)
  })
})
