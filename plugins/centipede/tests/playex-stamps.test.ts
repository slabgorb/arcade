// tests/playex-stamps.test.ts
//
// Story cp2-16 (RED, Leeloo / TEA) — PLAYEX's side-effects on a gun death, and
// the slot-12 phasing amendment. Successor to cp2-15 (#35, `156430e`), whose
// frame-order.test.ts pinned the mainloop order but stayed silent on what
// PLAYEX does to the COLLIDER and to a shot in flight.
//
// Ground truth (CENTI4.MAC, revision.v4 — every line re-opened this session):
//
//   PLAYEX (:1800-1808) is the death exit shared by every PLAY caller. Beyond
//   arming DELAY (:1801-1802) and the player picture (:1803-1804) it has two
//   side-effects on the WORLD:
//     :1805-1806  LDA I,0FF / STA X,MOBJP   — stamp the KILLING slot's picture
//                 0xFF; X is the CALLER's slot (0-11 MOTION :1449, 13 BUGMV
//                 :416-417, 12 ANTMV :107-108)
//     :1807-1808  LDA I,28 / STA SHOTP      — BLANK SHOT, wherever it is
//
//   The stamp's frame-end value is set by WHERE the caller sits relative to
//   EXPLOD (:31): MOTION (:30) stamps BEFORE EXPLOD, so a segment that kills
//   the gun ends its frame already counted down once, at 0xFE; BUGMV (:33)
//   and ANTMV (:37) stamp AFTER it, so spider and flea hold the full 0xFF to
//   the frame's end. SHOOT (:34) skips any slot at picture >= 0xF8
//   (:2177-2178), so a stamped collider can never also be shot — nothing
//   scores on a death frame.
//
//   Slot 12 (the AMENDMENT, found by a-2's cp2-15 review probe): ANTMV runs at
//   mainloop :37 — AFTER SHOOT (:34) — and moves the flea (:101-103 "SEC / SBC
//   ANTDV / 27$: STA ANTV") BEFORE its own PLAY (:107-108 "LDX I,12. / JSR
//   PLAY"), gated off entirely once the slot is dead (:53-56 "CMP I,20 / BCC
//   4$"). So on a flea dual-window frame the cabinet resolves the SHOT first:
//   a fast (already-hit, ANTDV=4) flea dies for 200 (:2219-2222) and the
//   player LIVES; a fresh flea is silently sped up (:2223 "STA ANTDV ;SPEED UP
//   ON FIRST HIT", no score) and then kills the player from ANTMV's own
//   post-move PLAY. The sim today runs its one consolidated pre-SHOOT
//   `checkPlayerContact(segs, player, spider, state.flea)` with the PRE-step
//   flea (sim.ts:413), so both frames kill the PLAYER — the in-code comment
//   defending that ("Do not 'fix' this by passing the post-step flea") is true
//   for OVRLAP/BUGMV's read of slot 12, false for ANTMV's own PLAY.
//
// ─── EXPECTED RED (verified by the cp2-15 probe against this exact tree) ─────
//   1. spider dual-window   — fails `expected 20 to be 255` (no stamp)
//   2. segment dual-window  — fails `expected +0 to be 254` (no stamp)
//   4. fast-flea dual-window — fails `expected +0 to be 200` (player dies
//      where the ROM shoots the flea)
//   5. slow-flea dual-window — fails `expected 1 to be 4` (blanked shot never
//      speeds the flea up)
//   3 (far-shot blank) is a GUARD: green today (#35 already blanks on a hit)
//   and it must SURVIVE the stamp refactor.
//
// Stagings are lifted from the probe-proven a-2 reference branch
// `fix/cp2-15-frame-order` (`7babb64`) — each dual-window fixture is valid
// under BOTH frame orders (pre- and post-move positions inside the windows, or
// the mover staged so it cannot shift out), so every red discriminates on the
// PLAYEX side-effect or the slot-12 phasing alone, never on geometry. All are
// rng-silent for the staged frame (spider count2 far from 0, slot 12 occupied,
// a live decoy segment keeps the wave open).

import { describe, it, expect } from 'vitest'
import {
  createSim,
  stepSim,
  DEATH_DELAY,
  PLAYER_EXPLODE_START,
  type SimState,
} from '../src/core/sim'
import { createPlayfield } from '../src/core/playfield'
import { EXPLOSION_PIC, SCORE_HEAD, type Segment } from '../src/core/centipede'
import {
  SPIDER_PIC_MIN,
  SPIDER_EXPLODE_PIC,
  SPIDER_SCORE_900,
  type Spider,
} from '../src/core/spider'
import { FLEA_FAST_DV, FLEA_SCORE, FLEA_EXPLODE_PIC, type Flea } from '../src/core/flea'
import type { InputCounts, Player } from '../src/core/player'

/** The neutral frame (typed, or NaN coords slip in — the cp3-4 lesson). */
const IDLE: InputCounts = { dh: 0, dv: 0, fire: false }

/** A far-corner live head keeps the wave open so no fixture trips the
 *  wave-clear branch by accident. It marches at (0x30, 0xB0), away from every
 *  staged collision below. */
const decoy = (): Segment => ({ h: 0x30, v: 0xb0, dh: 2, dv: 8, pic: 0x00 })

/** An empty field: no mushroom intercepts the shot and no OBSTAC turn bends a
 *  staged march. */
function base(seed = 0x1234): SimState {
  const s = createSim(seed)
  return { ...s, playfield: createPlayfield() }
}

/** A mid-zone gun the fixtures aim around. movePlayer(IDLE) holds it still. */
const gunAt = (h: number, v: number): Player => ({ h, v, hFrac: 0, vFrac: 0 })

/** A walking spider. h ODD (the house invariant); count2 high so no direction
 *  redraw draws rng inside the staged frame; dh = dv = 1 (SUBTRACTED, SP-5) so
 *  one BUGMV step moves it exactly (-1, -1). */
function walkingSpider(over: Partial<Spider>): Spider {
  return { h: 0x81, v: 0x22, dh: 1, dv: 1, pic: SPIDER_PIC_MIN, count2: 0x40, count: 0, oldDh: 1, pts: 0xb6, ...over }
}

/** A live flea in slot 12 (pic 0x1C, the first ant picture; dh hard 0). */
function liveFlea(over: Partial<Flea>): Flea {
  return { h: 0x80, v: 0x24, dv: 1, dh: 0, pic: 0x1c, ...over }
}

// ─────────────────────────────────────────────────────────────────────────────
// AC-1 + AC-2 — the declared scope: PLAYEX stamps the killing slot 0xFF
// (:1805-1806) and blanks the shot (:1807-1808). The stamp's end-of-frame
// value (0xFF vs 0xFE) pins WHERE each caller's PLAY runs relative to EXPLOD.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp2-16 AC-1/AC-2 — a gun death stamps the killing slot 0xFF and blanks the shot (PLAYEX :1805-1808)', () => {
  it('spider dual-window: the player dies, nothing scores, and the spider is stamped 0xFF — held to frame end (BUGMV :33 stamps after EXPLOD :31)', () => {
    const s0 = base()
    // Gun at (0x80, 0x20). The spider's one BUGMV step lands it on (0x80,
    // 0x21): inside PLAY's slot-13 box (SP-15/16) AND inside SHOOT's spider
    // windows against the advanced shot. Valid under both orders — the shot
    // pre-frame sits below its meeting point, and slot 13's PLAY (:416-417)
    // reads the post-move spider either way.
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      spider: walkingSpider({ h: 0x81, v: 0x22 }),
      shot: { h: 0x80, v: 0x1a, live: true },
      segs: [decoy()],
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'PLAYEX arms the death pause (CT-52)').toBe(DEATH_DELAY)
    expect(after.playerExplode, 'PLAYEX starts the player explosion (CT-53)').toBe(PLAYER_EXPLODE_START)
    expect(after.score - s0.score, `no points — the stamp (:1805-1806) makes SHOOT skip the slot (:2177-2178); a miss here pays the near band +${SPIDER_SCORE_900}`).toBe(0)
    // THE STAMP (red today — the spider keeps walking at pic 0x14): X is 13
    // from BUGMV's ":416 LDX I,13." — the spider that took the player dies
    // with him, and EXPLOD (:31) already ran, so 0xFF holds to frame end.
    expect(after.spider.pic, 'the killing spider is stamped 0xFF (:1805-1806, X=13)').toBe(SPIDER_EXPLODE_PIC)
    expect(after.shot.live, 'PLAYEX blanks the shot (:1807-1808 "LDA I,28 / STA SHOTP")').toBe(false)
  })

  it('segment dual-window: the killing head ends its frame at 0xFE — stamped inside MOTION (:30/:1449), counted down by EXPLOD (:31) the SAME frame', () => {
    const s0 = base()
    // Head pre-MOTION at (0x7E, 0x20) marching +2: post-MOTION it sits ON the
    // gun (0x80, 0x20). The shot's meeting point is inside the segment window
    // against BOTH the pre-move head (|dH|=2 < 6) and the post-move one
    // (|dH|=0), so the staging is valid under either order.
    const head: Segment = { h: 0x7e, v: 0x20, dh: 2, dv: 8, pic: 0x00 }
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      shot: { h: 0x80, v: 0x19, live: true },
      segs: [decoy(), head],
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'PLAYEX arms the death pause (CT-52)').toBe(DEATH_DELAY)
    expect(after.playerExplode, 'PLAYEX starts the player explosion (CT-53)').toBe(PLAYER_EXPLODE_START)
    expect(after.score - s0.score, `no points on the death frame — a miss here wrongly pays +${SCORE_HEAD}`).toBe(0)
    expect(after.shot.live, 'PLAYEX blanks the shot (:1807-1808)').toBe(false)
    // THE STAMP + THE SITE (red today — the head survives at pic 0x00): only a
    // stamp applied AT MOTION's own PLAY site (:1449, before stepExplosions)
    // can end the frame at 0xFE. A stamp bolted onto the current post-EXPLOD
    // consolidated check would end at 0xFF and stay red here.
    expect(after.segs[1].pic, 'stamped 0xFF in MOTION (:1449 → :1805-1806), stepped once by EXPLOD (:31) the same frame').toBe(EXPLOSION_PIC - 1)
  })

  it('GUARD (green today): a contact death blanks a shot in flight ANYWHERE on the field (:1807-1808)', () => {
    const s0 = base()
    // Contact death with no shot windows involved: the head marches onto the
    // gun while the shot climbs far away at (0x20, 0x80). #35 already blanks
    // on a hit; this pins the behavior through the stamp refactor.
    const head: Segment = { h: 0x7e, v: 0x20, dh: 2, dv: 8, pic: 0x00 }
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      shot: { h: 0x20, v: 0x80, live: true },
      segs: [decoy(), head],
    }
    const after = stepSim(s, IDLE)

    expect(after.delay, 'the contact death itself fires').toBe(DEATH_DELAY)
    expect(after.score - s0.score, 'nothing scores on the death frame').toBe(0)
    expect(after.shot.live, 'PLAYEX blanks the in-flight shot (:1807-1808 "LDA I,28 / STA SHOTP ;BLANK SHOT")').toBe(false)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// AC-3 — the slot-12 amendment: ANTMV (:37) runs AFTER SHOOT (:34), moves the
// flea (:101-103) before its own PLAY (:107-108), and is gated off for a dead
// slot (:53-56). The shot resolves FIRST on a flea dual-window frame.
// ─────────────────────────────────────────────────────────────────────────────
describe('cp2-16 AC-3 — the flea dual-window frame resolves the SHOT first (ANTMV :37 after SHOOT :34)', () => {
  it('fast flea dual-window: the SHOT wins — +200, the flea explodes, the player LIVES', () => {
    const s0 = base()
    // An already-hit flea (ANTDV = 4, FL-14/17) directly above the gun, inside
    // the gun box AND the shot window. SHOOT (:34) explodes it for 200
    // (:2219-2222) before ANTMV (:37) ever runs; the dead slot fails ANTMV's
    // :53-56 pic gate, so its PLAY never fires and the player survives.
    // Red today: the pre-step consolidated check (sim.ts:413) kills the
    // PLAYER and the blank (:414) starves the scan — `expected +0 to be 200`.
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      flea: liveFlea({ h: 0x80, v: 0x24, dv: FLEA_FAST_DV }),
      shot: { h: 0x80, v: 0x1d, live: true },
      segs: [decoy()],
    }
    const after = stepSim(s, IDLE)

    expect(after.score - s0.score, 'the killing hit scores 200 (FL-16, :2219 "LDY I,2")').toBe(FLEA_SCORE)
    expect(after.flea.pic, 'the flea explodes (FL-19)').toBe(FLEA_EXPLODE_PIC)
    expect(after.delay, 'the player LIVES — a dead slot 12 never reaches PLAY (:53-56)').toBe(0)
    expect(after.playerExplode, 'no player explosion').toBe(0)
  })

  it('slow flea dual-window: the first hit speeds it up scoreless (:2223), ANTMV drops it onto the gun, and its PLAY kills the player — the flea dies WITH him', () => {
    const s0 = base()
    // A fresh flea (dv 1): the shot's first hit only sets ANTDV := 4 (:2223
    // "STA ANTDV ;SPEED UP ON FIRST HIT" — the :2224 "BNE 108$" bypasses the
    // score). ANTMV (:37) then moves it 4 down (:101-103) onto the gun, and
    // its own PLAY (:107-108, X=12) reaches PLAYEX: the stamp lands on slot 12
    // — the flea that kills the player dies with him, holding 0xFF to frame
    // end (EXPLOD already ran at :31). Red today: the blanked shot never
    // speeds the flea up — `expected 1 to be 4`.
    const s = {
      ...s0,
      player: gunAt(0x80, 0x20),
      flea: liveFlea({ h: 0x80, v: 0x24, dv: 1 }),
      shot: { h: 0x80, v: 0x1d, live: true },
      segs: [decoy()],
    }
    const after = stepSim(s, IDLE)

    expect(after.score - s0.score, 'the first hit scores nothing (:2223-2224)').toBe(0)
    expect(after.flea.dv, 'the flea is sped up to ANTDV = 4 (FL-17)').toBe(FLEA_FAST_DV)
    expect(after.delay, "ANTMV's post-move PLAY still kills the player (CT-52)").toBe(DEATH_DELAY)
    expect(after.playerExplode, 'the player explodes (CT-53)').toBe(PLAYER_EXPLODE_START)
    expect(after.flea.pic, 'the killing flea is stamped 0xFF by its own PLAYEX (:1805-1806, X=12)').toBe(FLEA_EXPLODE_PIC)
  })
})
