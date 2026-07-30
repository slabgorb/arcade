// tests/death-frame-gates.test.ts
//
// Story cp2-17 (RED, Leeloo / TEA) — the death-frame stepping RULING. Successor
// to cp2-16 (#36, `359c7fe`), which shipped the PLAYEX stamps but deliberately
// left three things for this story (cp2-16 Impact Summary, routed to cp2-17):
//
//   ITEM 1 (THE RULING) — do the spider (BUGMV, :33) and the flea (ANTMV, :37)
//   FREEZE once the gun is dead, as the ROM does, or keep RUNNING as #35 chose
//   for replay stability? RULED **FREEZE** (ROM-faithful), confirmed by the
//   user at RED. Ground truth, re-opened against revision.v4/CENTI4.MAC this
//   session (both gates read PLAYP, the player picture, which carries set bits
//   the moment PLAYEX stamps the explosion — so a dead/exploding gun fails
//   `AND I,0AF == 0`):
//       BUGMV :289-291  "LDA PLAYP / AND I,0AF / BEQ 5$ ;BUG MOVE IF PLAYER IS
//                        ALIVE"  — player dead ⇒ falls to ":292 3$: RTS", the
//                        spider does NOT move.
//       ANTMV :50-56    "LDA PLAYP / AND I,0AF / BNE 2$ ;DON'T MOVE IF PLAYER
//                        IS DEAD ... 2$: RTS"  — player dead ⇒ the flea does
//                        NOT move.
//   In mainloop order (:30 MOTION, :33 BUGMV, :34 SHOOT, :36 SCORP, :37 ANTMV)
//   the gate bites every stepper AFTER the killing PLAY: a MOTION kill (:30)
//   freezes BUGMV and ANTMV; a BUGMV kill (:33) freezes ANTMV. develop today
//   runs all steppers unconditionally (sim.ts:406/:516) and gates only the PLAY
//   CHECKS (sim.ts:435-440, :530-534) — so these two are RED.
//
//   ITEM 2a (GUARD) — the cross-hazard `!playerHit` one-death guards
//   (sim.ts:436, :530): once a caller has killed the gun this frame, a LATER
//   hazard also in contact must NOT stamp a second collider or re-arm PLAYEX.
//   Green today; mutation target: drop the `!playerHit` at :436 (spider) or
//   :530 (flea) and the guarded creature is stamped 0xFF — these tests red.
//
//   ITEM 2b (GUARD) — MOTION's multi-collider tie-break. playerContactIndex
//   (centipede.ts:523) walks the slots DESCENDING (NCENT-1 → 0, :1284 "LDX
//   I,NCENT-1"; a hit exits MOTION at :1450 "BCC 35$"), so when two segments
//   share the gun box the HIGHER slot takes the stamp. Green today; mutation
//   target: reverse the loop to ascending and the LOWER slot is stamped — red.
//
//   ITEM 3 (GUARD) — the death PAUSE runs no EXPLOD. stepDeathFrame
//   (sim.ts:630) steps only playerExplode + RESTOR; a creature stamped this
//   frame holds its explosion picture frozen through the whole pause (it is
//   respawn, not EXPLOD, that clears it). Green today; mutation target: call a
//   creature-explosion stepper inside stepDeathFrame and the frozen 0xFE
//   counts down — red.
//
// ─── RED / GREEN SPLIT ──────────────────────────────────────────────────────
//   RED today (item 1, the ruling — Dev makes them green by FREEZING the
//   steppers on a death frame):
//     • spider FREEZES on a MOTION-kill frame
//     • flea   FREEZES on a MOTION-kill frame
//   GREEN today (guards — they must SURVIVE the freeze fix):
//     • steppers still RUN on a live (non-death) frame — pins the fix's
//       narrowness so Dev cannot "pass" the reds by freezing everything always
//     • cross-hazard spider guard (item 2a)
//     • cross-hazard flea guard  (item 2a)
//     • descending tie-break      (item 2b)
//     • pause runs no EXPLOD      (item 3)
//
// The freeze fix is surgical, so no cp2-16 fixture regresses: those stage the
// stepper's OWN caller as the killer (motionKill = -1, playerHit false BEFORE
// the stepper), so the entry gate never bites them. The reference branch
// `fix/cp2-15-frame-order` (`7babb64`) ran the full suite green WITH these
// gates, so the destination state is attainable.
//
// Stagings mirror the probe-proven cp2-16 idioms: an empty field (no mushroom
// intercepts a shot or bends a march), a far live decoy head that keeps the
// wave open, and rng-silent creatures (spider count2 far from 0; the staged
// frame draws no rng). The killer is always a SEGMENT via MOTION's PLAY
// (motionKill), cleanly separate from the spider/flea whose freeze is measured.

import { describe, it, expect } from 'vitest'
import {
  createSim,
  stepSim,
  DEATH_DELAY,
  type SimState,
} from '../src/core/sim'
import { createPlayfield } from '../src/core/playfield'
import { DEAD_BIT, EXPLOSION_PIC, type Segment } from '../src/core/centipede'
import { SPIDER_PIC_MIN, type Spider } from '../src/core/spider'
import type { Flea } from '../src/core/flea'
import type { InputCounts, Player } from '../src/core/player'

/** The neutral frame (typed, or NaN coords slip in — the cp3-4 lesson). */
const IDLE: InputCounts = { dh: 0, dv: 0, fire: false }

/** A far-corner live head keeps the wave open so no fixture trips the
 *  wave-clear branch by accident. It marches at (0x30, 0xB0). */
const decoy = (): Segment => ({ h: 0x30, v: 0xb0, dh: 2, dv: 8, pic: 0x00 })

/** A dead, far-away shot: no SHOOT resolver touches it, so it never scores or
 *  kills a staged creature. The freeze/guard is measured on PLAY alone. */
const noShot = () => ({ h: 0x08, v: 0x08, live: false })

/** An empty field: no mushroom intercepts a shot and no OBSTAC turn bends a
 *  staged march. */
function base(seed = 0x1234): SimState {
  const s = createSim(seed)
  return { ...s, playfield: createPlayfield() }
}

/** A mid-zone gun the fixtures aim around. movePlayer(IDLE) holds it still. */
const gunAt = (h: number, v: number): Player => ({ h, v, hFrac: 0, vFrac: 0 })

/** A live head that marches +2 into the gun at (0x80, 0x20): pre-MOTION
 *  (0x7E, 0x20) → post (0x80, 0x20), inside PLAY's box → motionKill. v = 0x20
 *  ((v & 7) ≠ 4) so one step never dives; dv = 8 matches the cp2-16 idiom. */
const killerHead = (): Segment => ({ h: 0x7e, v: 0x20, dh: 2, dv: 8, pic: 0x00 })

/** A walking spider. h ODD (the house invariant); count2 high so no direction
 *  redraw draws rng inside the staged frame; dh = dv = 1 (SUBTRACTED, SP-5) so
 *  one BUGMV step moves it exactly (-1, -1) when it runs. */
function walkingSpider(over: Partial<Spider>): Spider {
  return { h: 0x81, v: 0x40, dh: 1, dv: 1, pic: SPIDER_PIC_MIN, count2: 0x40, count: 0, oldDh: 1, pts: 0xb6, ...over }
}

/** A live flea in slot 12 (pic 0x1C, the first ant picture; dh hard 0). One
 *  ANTMV step moves it by dv when it runs. */
function liveFlea(over: Partial<Flea>): Flea {
  return { h: 0x40, v: 0x40, dv: 1, dh: 0, pic: 0x1c, ...over }
}

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 1 — THE RULING: the spider and flea FREEZE on a death frame (BUGMV
// :289-291 / ANTMV :50-56). A SEGMENT kills the gun at MOTION (:30); the spider
// (:33) and flea (:37) both run their entry gate AFTER it, find the gun dead,
// and skip their move. RED today — develop runs both steppers regardless.
// ═════════════════════════════════════════════════════════════════════════════
describe('cp2-17 item 1 — the spider FREEZES once the gun is dead (BUGMV :289-291)', () => {
  it('a MOTION kill (:30) freezes the spider (:33): the walking spider does NOT take its step', () => {
    const s0 = base()
    const spider0 = walkingSpider({ h: 0x41, v: 0x40 })
    // The killer head lands ON the gun and kills the player at MOTION (:30),
    // before BUGMV (:33). The spider marches far away at (0x41, 0x40) — out of
    // every gun/shot box — so its ONLY mover is stepSpider. The ROM's BUGMV
    // finds PLAYP dead at :289 and RTSes at :292 without moving it.
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      segs: [decoy(), killerHead()],
      spider: spider0,
      shot: noShot(),
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'the segment kills the gun this frame (PLAYEX, CT-52)').toBe(DEATH_DELAY)
    // RED today: develop's stepSpider (sim.ts:406) runs unconditionally, so the
    // spider marches to (0x40, 0x3F). The ruling FREEZES it at its staged spot.
    expect(after.spider.h, 'BUGMV freezes: h unchanged (:291 BEQ not taken → :292 RTS)').toBe(spider0.h)
    expect(after.spider.v, 'BUGMV freezes: v unchanged').toBe(spider0.v)
  })
})

describe('cp2-17 item 1 — the flea FREEZES once the gun is dead (ANTMV :50-56)', () => {
  it('a MOTION kill (:30) freezes the flea (:37): the live flea does NOT take its step', () => {
    const s0 = base()
    const flea0 = liveFlea({ h: 0x40, v: 0x40, dv: 1 })
    // Same MOTION kill; the flea falls far from the gun at (0x40, 0x40) — no
    // ANTMV PLAY reaches it — so its only mover is stepFlea. ANTMV (:37) runs
    // dead-last and finds PLAYP dead at :50, RTSing at :57 without moving it.
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      segs: [decoy(), killerHead()],
      flea: flea0,
      shot: noShot(),
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'the segment kills the gun this frame (PLAYEX, CT-52)').toBe(DEATH_DELAY)
    // RED today: develop's stepFlea (sim.ts:516) runs unconditionally, so the
    // flea falls to (0x40, 0x3F). The ruling FREEZES it at its staged spot.
    expect(after.flea.h, 'ANTMV freezes: h unchanged (:52 BNE taken → :57 RTS)').toBe(flea0.h)
    expect(after.flea.v, 'ANTMV freezes: v unchanged').toBe(flea0.v)
  })
})

describe('cp2-17 item 1 GUARD — the freeze is death-frame-only: a LIVE frame still steps both creatures', () => {
  it('no kill this frame ⇒ the spider AND the flea take their normal step (pins the fix’s narrowness)', () => {
    const s0 = base()
    const spider0 = walkingSpider({ h: 0x41, v: 0x40 })
    const flea0 = liveFlea({ h: 0x61, v: 0x60, dv: 1 })
    // The gun is alone at (0x80, 0x20); nothing is in any PLAY box, so no death
    // fires. Both steppers must run exactly as they do today — a fix that
    // freezes creatures on a LIVE frame breaks ordinary play and reds here.
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      segs: [decoy()],
      spider: spider0,
      flea: flea0,
      shot: noShot(),
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'nobody dies — the gun is untouched').toBe(0)
    expect(
      after.spider.h !== spider0.h || after.spider.v !== spider0.v,
      'the spider steps normally on a live frame (BUGMV :291 BEQ taken → move)',
    ).toBe(true)
    expect(
      after.flea.h !== flea0.h || after.flea.v !== flea0.v,
      'the flea steps normally on a live frame (ANTMV :56 BCC taken → move)',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 2a — the cross-hazard `!playerHit` one-death guards (sim.ts:436, :530).
// A segment kills the gun at MOTION; a spider / flea ALSO in contact this frame
// must NOT be stamped — PLAYEX fires once. GREEN today; each mutation red is
// documented above. (Both creatures freeze at their staged in-box spot under
// the ruling, but the guard is position-independent, so these hold either way.)
// ═════════════════════════════════════════════════════════════════════════════
describe('cp2-17 item 2a — a second hazard in contact is NOT stamped once the gun is already dead', () => {
  it('cross-hazard spider guard (sim.ts:436): a segment kill + a spider in the gun box ⇒ the spider is NOT stamped', () => {
    const s0 = base()
    // Killer head → (0x80, 0x20) = MOTION kill. The spider sits inside its own
    // PLAY box against the gun (0x81, 0x20): |dH| = 1 < 10, sum = 1 < 14
    // (SP-15/16). Its check at :436 is skipped by `!playerHit`; drop that guard
    // and the spider is stamped 0xFF (SPIDER_EXPLODE_PIC) — this test reds.
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      segs: [decoy(), killerHead()],
      spider: walkingSpider({ h: 0x81, v: 0x20 }),
      shot: noShot(),
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'the segment kills the gun — one PLAYEX').toBe(DEATH_DELAY)
    expect(
      (after.spider.pic & DEAD_BIT) === 0,
      'the spider is NOT stamped — the second hazard is guarded off (:436 !playerHit)',
    ).toBe(true)
  })

  it('cross-hazard flea guard (sim.ts:530): a segment kill + a flea in the gun box ⇒ the flea is NOT stamped', () => {
    const s0 = base()
    // Killer head → MOTION kill. The flea (pic 0x1C < FLEA_PLAY_PIC_LIMIT) sits
    // inside the flea PLAY box against the gun (0x80, 0x21): |dH| = 0 < 7, sum
    // = 1 < 12. Its check at :530 is skipped by `!playerHit`; drop that guard
    // and the flea is stamped 0xFF (FLEA_EXPLODE_PIC) — this test reds.
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      segs: [decoy(), killerHead()],
      flea: liveFlea({ h: 0x80, v: 0x21, dv: 1 }),
      shot: noShot(),
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'the segment kills the gun — one PLAYEX').toBe(DEATH_DELAY)
    expect(
      (after.flea.pic & DEAD_BIT) === 0,
      'the flea is NOT stamped — the second hazard is guarded off (:530 !playerHit)',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 2b — MOTION's descending tie-break (playerContactIndex, centipede.ts:523,
// walked NCENT-1 → 0). Two segments in the gun box ⇒ the HIGHER array slot is
// the one PLAYEX stamps; the lower survives. GREEN today; reversing the walk to
// ascending stamps the lower slot instead — this test reds.
// ═════════════════════════════════════════════════════════════════════════════
describe('cp2-17 item 2b — two segments in the gun box: the HIGHER slot takes the stamp (NCENT-1 descending, :1284)', () => {
  it('the higher-index colliding segment is stamped 0xFE; the lower one survives', () => {
    const s0 = base()
    // segs[1] (LOW) and segs[2] (HIGH) both march +2 to the gun row and both
    // land inside the PLAY box: segs[1] post (0x7E, 0x20) → |dH| = 2 < 7; segs[2]
    // post (0x80, 0x20) → |dH| = 0. The descending walk hits index 2 first and
    // exits (MOTION's :1450 BCC on a kill), so segs[2] is stamped and segs[1]
    // lives. A stamp lands 0xFF at MOTION's site, then EXPLOD (:31) counts it
    // down the SAME frame ⇒ 0xFE (EXPLOSION_PIC - 1).
    const segLow: Segment = { h: 0x7c, v: 0x20, dh: 2, dv: 8, pic: 0x00 }
    const segHigh: Segment = { h: 0x7e, v: 0x20, dh: 2, dv: 8, pic: 0x00 }
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      segs: [decoy(), segLow, segHigh],
      shot: noShot(),
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'a segment kills the gun this frame').toBe(DEATH_DELAY)
    expect(after.segs[2].pic, 'the HIGHER slot is stamped (0xFF in MOTION, counted down to 0xFE by EXPLOD)').toBe(EXPLOSION_PIC - 1)
    expect(
      (after.segs[1].pic & DEAD_BIT) === 0,
      'the LOWER slot survives — the descending walk exited at the higher one (:1450)',
    ).toBe(true)
  })
})

// ═════════════════════════════════════════════════════════════════════════════
// ITEM 3 — the death PAUSE runs no EXPLOD. stepDeathFrame (sim.ts:630) advances
// only playerExplode + RESTOR; a creature stamped on the kill frame holds its
// explosion picture FROZEN through the pause. GREEN today; adding a creature
// EXPLOD step to the pause counts the 0xFE down — this test reds.
// ═════════════════════════════════════════════════════════════════════════════
describe('cp2-17 item 3 — a stamped explosion is frozen through the death pause (stepDeathFrame runs no EXPLOD)', () => {
  it('a 0xFE-stamped segment does not count down while the pause holds', () => {
    const s0 = base()
    // A MOTION kill stamps the killing head 0xFF, EXPLOD counts it to 0xFE, and
    // the death pause arms (delay = DEATH_DELAY). The next stepSim is a PAUSE
    // frame (stepPlayingFrame does not run): the stamped picture must NOT move.
    const kill = stepSim(
      { ...s0, player: gunAt(0x80, 0x20), segs: [decoy(), killerHead()], shot: noShot() },
      IDLE,
    )
    expect(kill.delay, 'the kill frame arms the death pause').toBe(DEATH_DELAY)
    expect(kill.segs[1].pic, 'the killer ends its frame stamped 0xFE (MOTION stamp + EXPLOD :31)').toBe(EXPLOSION_PIC - 1)

    const paused = stepSim(kill, IDLE)
    expect(paused.delay, 'still inside the pause, and it is counting down (proof stepDeathFrame ran)').toBeLessThan(DEATH_DELAY)
    expect(paused.delay, 'still inside the pause (not yet respawned)').toBeGreaterThan(0)
    expect(paused.segs[1].pic, 'the stamped explosion is FROZEN — the pause runs no EXPLOD').toBe(EXPLOSION_PIC - 1)
  })
})
