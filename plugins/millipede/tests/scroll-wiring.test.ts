// tests/scroll-wiring.test.ts
//
// Story ml7-9 — RED phase (TEA). Wire the pure core/scroll.ts subsystem
// (SCROLD/SCROLU + the ml4-4 DDT halves) INTO stepGame so the field scrolls
// under millipede descent. ml3-5 shipped scroll.ts as pure reducers with NO
// caller; ml4-4 shipped ddtScrollDown/ddtScrollUp likewise. This story threads
// them into the frame loop and gives GameState the SCROLC counter and the MUSH
// count pair those reducers read and write.
//
// ─── GROUND TRUTH: THE ROM MAINLINE (reference/original-source/millipede) ─────
// MILLI.MAC MAINLINE (the frame loop), verbatim order:
//   :29  JSR SHOOT   ; fire shots + collisions — SHOOT2 SETS SCROLC on a kill
//   :35  JSR MOTION  ; march the centipede (the descent)
//   :36  JSR SPDMV … :42 JSR WRMMV   ; enemy motion + planting
//   :44  JSR CHKEND  ; wave end
//   :45  JSR RESTOR  ; restore mushrooms
//   :46  JSR SCROLL  ; ← consume SCROLC, dispatch the scroll   (THIS STORY)
//   :47  LDA CDONE / BEQ ; MASTER (conway) only runs when CDONE != 0
//   :49  JSR MASTER
// So SCROLL runs ONCE per frame, AFTER every SCROLC source (kills, motion,
// restore) and BEFORE the CDONE-gated MASTER — exactly where masterStep sits in
// sim.ts today. SC-6 (conwayActive gates scrolling OFF) means SCROLL and MASTER
// never both act in one frame.
//
// THE FIVE SCROLC WRITERS (all currently unwired — grep SCROLC in MILLI.MAC):
//   :1140  SCROLL continuous arm  DEC (down)  every 128f @ phase $1E, CENTIN==4
//   :2090  beetle kill (SHOOT2)   DEC (down)  "SCROLL PLAYFIELD DOWN"
//   :2127  mosquito kill (SHOOT2)  INC (up)    "SCROLL PLAYFIELD UP"
//   :503   CENTPC train re-lay    DEC (down)  "SCROLL PLAYFIELD DOWN ONE ROW"
//   :1812  player-death/DDT-hit   STA 0       "STOP ANY EXISTING SCROLLING"
// SCROLL then dispatches on SCROLC's sign (MLSUB.MAC:1141-1144): 0 → none,
// negative → SCROLD (down), positive → SCROLU (up); the reducers consume it
// (SCROLD INC toward 0, SCROLU DEC toward 0).
//
// ─── ACCESSIBILITY (the standing photosensitive override, epic ml7) ──────────
// The scroll is a byte SHIFT (freeze-friendly), never a per-frame flash, and the
// continuous arm fires on a 128-frame cadence — NOT every frame. Pinned here so a
// future edit cannot turn "scroll under descent" into a full-screen strobe.
//
// ─── ISOLATION DISCIPLINE ────────────────────────────────────────────────────
// scroll.test.ts already pins the pure geometry exhaustively; this file tests the
// WIRING. GameState's scrolc and mushCounts are ROSTER-IMMUNE scalars — every
// enemy plant uses a THROWAWAY MushCounts (bee.ts:118, beetle.ts:70) and no enemy
// writes scrolc — so they are the primary observables. Field assertions use the
// grey-re-entry fingerprint (row 6 gains bit 7 in EVERY column on a down-scroll,
// SC-29), which no single-cell enemy plant/eat can erase. See the roster-isolation
// note below the helpers for why a deterministic reserved-slot spider spawn cannot
// corrupt these cell-specific assertions (lang-review #18).

import { describe, it, expect } from 'vitest'
import { stepGame, type GameInput } from '../src/core/sim'
import { createGame, type GameState } from '../src/core/game-state'
import { LOWER_MAX, TOP_MIN } from '../src/core/mushroom'
import { PLYFLD_SIZE, PLYFLD_STRIDE, PLYFLD_WIDTH, MAXPH } from '../src/core/conway'
import { EVENT_KINDS } from '../src/core/events'
import { createPlayer } from '../src/core/input'
import { initRoster } from '../src/core/enemies/roster'
import { initBeetles } from '../src/core/enemies/beetle'
import { initMosquitoes } from '../src/core/enemies/mosquito'
import { newDdtTable, ddtPlace, DDT_EXPLODING_MIN } from '../src/core/ddt'

const idle: GameInput = { dh: 0, dv: 0, fire: false, start: false }
const SEED = 0x1982

// ─── field geometry (mirrors scroll.test.ts; no game logic reimplemented) ─────
const STRIDE = PLYFLD_STRIDE // 0x20
const COLS = PLYFLD_WIDTH // 30
const idx = (col: number, row: number) => col * STRIDE + row
const GREY_BIT = 0x80

/** A fresh empty playfield the size stepGame expects. */
const emptyField = () => new Uint8Array(PLYFLD_SIZE)

/** A play state with a fully controlled field/roster (the arm DISARMED unless a
 *  test overrides segments/frame). `scrolc`/`mushCounts` are real GameState fields
 *  now, so tests set and read them directly. */
function playState(over: Partial<GameState> = {}): GameState {
  const base = createGame(SEED, { phase: 'play' })
  return {
    ...base,
    field: emptyField(),
    roster: initRoster(),
    ...over,
  }
}

/** True iff EVERY column carries the grey bit on the re-entry row (row 6): the
 *  SC-29 fingerprint a down-scroll stamps and nothing else does across all 30
 *  columns. Robust to a stray single-cell enemy write. */
const downScrollFingerprint = (field: Uint8Array): boolean => {
  for (let c = 0; c < COLS; c++) if ((field[idx(c, 6)] & GREY_BIT) === 0) return false
  return true
}

// Note on roster isolation: a fresh play state spawns a reserved-slot spider
// (spider.ts:92 — slots 12/13 spawn even at score 0), but a JUST-spawned spider
// does not move, eat, or plant that frame (spider.ts:104), so it writes NOTHING
// to the playfield. The scroll assertions below are therefore cell-specific (the
// exact byte at an (col,row), or the grey bit across all 30 columns' row 6) and
// self-validating: a spawn that DID corrupt a cell would fail the very assertion,
// not slip past a coarse "roster is vacant" gate.

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC1 — GameState carries the scroll counter and the MUSH pair', () => {
  it('a fresh game starts with SCROLC == 0 (MLDEF.MAC:372, nothing pending)', () => {
    const g = createGame(SEED, { phase: 'play' })
    expect(g.scrolc).toBe(0)
  })

  it('createGame SEEDS mushCounts from the boot scatter it currently discards', () => {
    // game-state.ts:86-89 already runs `musher(field, …, counts)` 96× but throws
    // `counts` away. ml7-9 keeps it on GameState. Cross-check against the field
    // itself using the ROM's own count-region definition (MUSHER counts by row
    // band: lower row<0x0C, top row>=0x14; the middle band is uncounted) — this
    // is independent of the scatter RNG, so it is not a reimplementation.
    const g = createGame(SEED)
    const mc = g.mushCounts
    let lower = 0
    let top = 0
    for (let c = 0; c < COLS; c++) {
      for (let row = 0; row < STRIDE; row++) {
        if ((g.field[idx(c, row)] & 0x7f) >= 0x70) {
          if (row < LOWER_MAX) lower += 1
          else if (row >= TOP_MIN) top += 1
        }
      }
    }
    // Sanity: the boot scatter really does plant countable mushrooms in both
    // bands (else the assertion below would be vacuously 0 == 0).
    expect(lower + top, 'boot scatter must plant countable mushrooms').toBeGreaterThan(0)
    expect(mc).toEqual({ lower, top })
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC2 — SCROLL consumes a pending scroll each frame (MLSUB.MAC:1141-1144)', () => {
  it('a pending DOWN (SCROLC < 0) shifts the field down and INCs toward 0 (SC-16/18)', () => {
    // Marker high in a column; a down-scroll is new[r] = old[r+1] (SC-26), so it
    // descends one row. Arm is disarmed (12-segment boot train ⇒ CENTIN != 4), so
    // the ONLY scroll is the pending one we seeded.
    const field = emptyField()
    field[idx(10, 0x10)] = 0x22
    const g = playState({ field, scrolc: -1 })
    const out = stepGame(g, idle)
    expect(out.field[idx(10, 0x0f)], 'marker descended one row (SC-26)').toBe(0x22)
    expect(out.field[idx(10, 0x10)], 'source cell vacated').toBe(0)
    expect(downScrollFingerprint(out.field), 'grey re-entry stamped (SC-29)').toBe(true)
    expect(out.scrolc, 'SCROLD consumed one down (INC toward 0, SC-18)').toBe(0)
  })

  it('a pending UP (SCROLC > 0) shifts the field up and DECs toward 0 (SC-17/36)', () => {
    // Up-scroll is new[r] = old[r-1] (SC-41): a marker climbs one row.
    const field = emptyField()
    field[idx(10, 0x10)] = 0x22
    const g = playState({ field, scrolc: 1 })
    const out = stepGame(g, idle)
    expect(out.field[idx(10, 0x11)], 'marker climbed one row (SC-41)').toBe(0x22)
    expect(out.field[idx(10, 0x10)], 'source cell vacated').toBe(0)
    expect(out.scrolc, 'SCROLU consumed one up (DEC toward 0, SC-36)').toBe(0)
  })

  it('SCROLC == 0 scrolls NOTHING — the field is untouched (SC-15)', () => {
    const field = emptyField()
    field[idx(10, 0x10)] = 0x22
    const g = playState({ field, scrolc: 0 })
    const out = stepGame(g, idle)
    expect(out.field[idx(10, 0x10)], 'marker did not move').toBe(0x22)
    expect(downScrollFingerprint(out.field), 'no grey re-entry with nothing pending').toBe(false)
    expect(out.scrolc).toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC3 — the continuous-scroll arm drives the descent (MLSUB.MAC:1133-1140)', () => {
  // A length-4 LIVE train (CENTIN==4), no hit DDT, at FRAME phase (frame & $7F)
  // == $1E arms the DEC SCROLC that makes the field drift DOWN under the march.
  const fourTrain = () => createGame(SEED, { phase: 'play' }).segments.slice(0, 4)

  it('armed at phase $1E: the field drifts DOWN one row (SC-11/13/14)', () => {
    const field = emptyField()
    field[idx(7, 0x10)] = 0x33
    const g = playState({ field, segments: fourTrain(), frame: 0x1e, scrolc: 0 })
    const out = stepGame(g, idle)
    expect(out.field[idx(7, 0x0f)], 'the arm scrolled the field down (SC-14)').toBe(0x33)
    expect(downScrollFingerprint(out.field), 'grey re-entry stamped (SC-29)').toBe(true)
  })

  it('same train ONE frame off phase ($1D): NO scroll — the arm is gated (SC-13)', () => {
    // The accessibility magnitude (lang-review #29): the drift is PERIODIC, not
    // per-frame. If the arm fired every frame this control would also scroll.
    const field = emptyField()
    field[idx(7, 0x10)] = 0x33
    const g = playState({ field, segments: fourTrain(), frame: 0x1d, scrolc: 0 })
    const out = stepGame(g, idle)
    expect(out.field[idx(7, 0x10)], 'marker stayed put off-phase').toBe(0x33)
    expect(downScrollFingerprint(out.field), 'no scroll off the $1E phase').toBe(false)
  })

  it('a WRONG-length train at phase $1E does NOT arm (CENTIN != 4, SC-11)', () => {
    // The full 12-segment boot train: the arm is wave-4-specific, so it must not
    // fire here even though the frame phase is right.
    const field = emptyField()
    field[idx(7, 0x10)] = 0x33
    const g = playState({ field, frame: 0x1e, scrolc: 0 }) // default 12-live train
    const out = stepGame(g, idle)
    expect(out.field[idx(7, 0x10)], 'no arm with a 12-length train').toBe(0x33)
    expect(downScrollFingerprint(out.field)).toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC4 — an active gate PAUSES a pending scroll, it does not drop it (SC-6)', () => {
  // The hard gates (:1113-1123) RTS before consuming SCROLC, so a queued scroll
  // SURVIVES the gated frame and is applied once the gate opens — a pause, not a
  // discard. Tested as two frames: gated → preserved, then open → APPLIED. The
  // apply is the RED signal (a "no scroll" frame is indistinguishable from an
  // unwired one, so a single gated frame cannot drive the implementation).
  //
  // NOTE the player-death gate is the OPPOSITE of this (it CANCELS — AC6, :1812).
  // Two hard gates PRESERVE: conway-active (CDONE, SC-6) and ddtExploding (SC-7);
  // both are tested below. (attract/MODE is unreachable in the play phase.)
  it('CONWAY-active pauses the pending down; when CDONE clears it scrolls (SC-6)', () => {
    const gated = playState({
      scrolc: -1,
      conway: { phase: 0, active: true, addr: 0, ngrown: 0 },
    })
    // Frame 1 — gated: the counter is preserved (scalar, immune to the masterStep
    // Conway growth that CONWAY-active also runs; we do not assert the field here).
    const held = stepGame(gated, idle)
    expect(held.scrolc, 'CONWAY-active preserves the pending down (SC-6)').toBe(-1)
    // Frame 2 — the gate opens (CDONE clear): NOW the held scroll is applied. The
    // grey re-entry fingerprint is the evidence (scrollDown ORs $80 into row 6 of
    // every column unconditionally), so it survives whatever Conway did in frame 1.
    const opened = stepGame(
      { ...held, conway: { phase: 0, active: false, addr: 0, ngrown: 0 } } as GameState,
      idle,
    )
    expect(downScrollFingerprint(opened.field), 'the held scroll applied once the gate opened').toBe(
      true,
    )
    expect(opened.scrolc, 'and was then consumed (SC-18)').toBe(0)
  })

  it('an EXPLODING DDT pauses the pending down; when it clears the scroll applies (SC-7)', () => {
    // frame:1 makes ddtExplosionStep a no-op (FRAME & 7 != 0, DD-102), so the
    // exploding entry survives untouched for the gate to read.
    const exploding = newDdtTable()
    exploding[0].hi = DDT_EXPLODING_MIN // >= threshold ⇒ anyDdtExploding true (SC-7)
    exploding[0].lo = 0xcd
    const gated = playState({ scrolc: -1, frame: 1, ddt: exploding })
    const held = stepGame(gated, idle)
    expect(held.scrolc, 'an exploding DDT preserves the pending down (SC-7)').toBe(-1)
    // Clear the explosion (a vacant bank): the gate opens and the held scroll fires.
    const opened = stepGame({ ...held, ddt: newDdtTable() }, idle)
    expect(downScrollFingerprint(opened.field), 'the held scroll applied once the bank cleared').toBe(
      true,
    )
    expect(opened.scrolc, 'and was then consumed (SC-18)').toBe(0)
  })

  it('CONWAY completing THIS frame still defers the scroll — CDONE is read pre-MASTER (SC-6)', () => {
    // masterStep flips active true→false when it finishes the screen (phase reaches
    // MAXPH+1). The ROM's SCROLL (:46) reads CDONE BEFORE MASTER (:49), so on the
    // completion frame the scroll must STILL be gated and fire only next frame.
    // Regression guard for reading conway.active PRE- vs POST-masterStep: a
    // completing state is CLEANUP (phase MAXPH) on its last 32-cell chunk.
    const completing = playState({
      scrolc: -1,
      conway: { phase: MAXPH, addr: PLYFLD_SIZE - STRIDE, ngrown: 1, active: true },
    })
    const out = stepGame(completing, idle)
    expect(out.conway.active, 'masterStep completed the metamorphosis this frame').toBe(false)
    expect(out.scrolc, 'but SCROLL saw CDONE pre-MASTER and DEFERRED the scroll (SC-6)').toBe(-1)
    expect(downScrollFingerprint(out.field), 'no scroll fired on the completion frame').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC5 — the SCROLC sources are wired (the dropped kill flags + CENTPC)', () => {
  // Differential: the ONLY difference between case and control is the kill, so a
  // scroll appearing only in the kill case proves the kill queued it (avoids the
  // all-local-terms vacuity of lang-review #26). The enemy sits MID-FIELD, where a
  // pre-seeded active shot reaches it but it is far from the player (bottom row),
  // so the shot-kill does NOT also contact the player — a player death would
  // cancel the scroll (AC6, :1812) and mask the source under test. Arm disarmed
  // (12-segment boot train ⇒ CENTIN != 4), empty field, SCROLC starts 0.
  const SHOT_H = 0x80
  const SHOT_V = 0x40 // mid-field: reached by the shot, clear of the player at v 8
  const activeShot = { active: true, h: SHOT_H, v: SHOT_V }

  const liveBeetle = () => {
    const beetles = initBeetles()
    Object.assign(beetles[0], { color: 0xb9, pic: 0x34, h: SHOT_H, v: SHOT_V, dh: 0, dv: 0 })
    return beetles
  }
  const liveMosquito = () => {
    const mosquitoes = initMosquitoes()
    // isMosquitoLive: color != 0 && 0x0E <= pic < 0x10 (mosquito.ts:90).
    Object.assign(mosquitoes[0], { color: 0x79, pic: 0x0e, h: SHOT_H, v: SHOT_V, dh: 0, dv: 0 })
    return mosquitoes
  }

  it('a BEETLE kill DECs SCROLC → the field scrolls DOWN this frame (MILLI.MAC:2090)', () => {
    const hit = playState({ shot: activeShot, roster: { ...initRoster(), beetles: liveBeetle() } })
    const out = stepGame(hit, idle)
    expect(out.score, 'the beetle was actually killed (300 pts, BT-45)').toBe(300)
    expect(out.player.alive, 'the shot-kill did not also kill the player').toBe(true)
    expect(downScrollFingerprint(out.field), 'the kill scrolled the field down').toBe(true)
  })

  it('CONTROL — the same active shot with NO beetle does not scroll (differential floor)', () => {
    const miss = playState({ shot: activeShot }) // empty roster, empty field
    const out = stepGame(miss, idle)
    expect(out.score, 'nothing killed').toBe(0)
    expect(downScrollFingerprint(out.field), 'no kill ⇒ no scroll').toBe(false)
  })

  it('a MOSQUITO kill INCs SCROLC → the field scrolls UP this frame (MILLI.MAC:2127)', () => {
    // Up-scroll's fingerprint: the grey blank $80 enters at the BOTTOM row 2
    // (SC-40) in every column, and row 6 does NOT gain the down-scroll grey bit.
    const hit = playState({ shot: activeShot, roster: { ...initRoster(), mosquitoes: liveMosquito() } })
    const out = stepGame(hit, idle)
    expect(out.score, 'the mosquito was actually killed (400 pts, MQ-28)').toBe(400)
    expect(out.player.alive, 'the shot-kill did not also kill the player').toBe(true)
    let bottomGrey = 0
    for (let c = 0; c < COLS; c++) if (out.field[idx(c, 2)] === GREY_BIT) bottomGrey += 1
    expect(bottomGrey, 'up-scroll stamped the grey blank on row 2 (SC-40)').toBe(COLS)
    expect(downScrollFingerprint(out.field), 'an up-scroll is NOT a down-scroll').toBe(false)
  })

  it('the CENTPC train re-lay at wave start scrolls the field DOWN (MILLI.MAC:503)', () => {
    // A cleared millipede (empty train) with the inter-wave DELAY about to elapse
    // lays a fresh train this frame — CENTPC's `DEC SCROLC` then scrolls down.
    const relaid = playState({ segments: [], delay: 1 })
    const out = stepGame(relaid, idle)
    expect(out.wave, 'the next wave was laid (createMillipede ran)').toBe(1)
    expect(downScrollFingerprint(out.field), 'the re-lay scrolled the field down').toBe(true)
  })

  it('CONTROL — a cleared train mid-pause (no re-lay this frame) does not scroll', () => {
    // DELAY not yet elapsed: no createMillipede, so no CENTPC re-lay, no scroll.
    const waiting = playState({ segments: [], delay: 2 })
    const out = stepGame(waiting, idle)
    expect(out.wave, 'no new wave yet').toBe(0)
    expect(downScrollFingerprint(out.field), 'no re-lay ⇒ no scroll').toBe(false)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC6 — player death CANCELS any pending scroll (MILLI.MAC:1812)', () => {
  it('losing the player zeroes SCROLC ("STOP ANY EXISTING SCROLLING")', () => {
    // A live player standing on a live segment dies this frame (sim.ts step 7).
    // Any pending scroll must be cancelled, not carried into the death animation.
    const player = createPlayer()
    const seg = { h: player.h, v: player.v, dh: 0, dv: 0, pic: 0, color: 0x39 }
    const g = playState({ scrolc: -1, segments: [seg], lives: 3 })
    const out = stepGame(g, idle)
    expect(out.player.alive, 'the player died on the segment').toBe(false)
    expect(out.scrolc, 'the pending scroll was cancelled on death').toBe(0)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC7 — the MUSH count sink is threaded (scroll + ddt deltas)', () => {
  it('a mushroom pushed off the bottom by a down-scroll DECs mushCounts.lower (SC-31)', () => {
    // A grey-normal mushroom on the bottom shift row (row 2) is pushed off the
    // bottom (SC-31 ⇒ mush -1). GameState.mushCounts must fall by one. Counts are
    // roster-immune (enemy plants use a throwaway MushCounts), so we seed a known
    // lower count and assert the exact decrement.
    const field = emptyField()
    field[idx(2, 2)] = 0xfc // grey normal mushroom ($7C | grey), (& 0x7f) >= 0x70
    const g = playState({ field, scrolc: -1, mushCounts: { lower: 5, top: 3 } })
    const out = stepGame(g, idle)
    // Assert the LOWER-region push-off (the SC-31 mechanism under test) — it is
    // deterministic. We do NOT assert `top` here: a down-scroll also plants top
    // mushrooms on a 1-in-16 RNG draw per column (SC-24), so `top` legitimately
    // varies with state.rng's position; that plant path is pinned in scroll.test.ts.
    expect(out.mushCounts.lower, 'one mushroom left the bottom region (SC-31)').toBe(4)
  })

  it('a mushroom crossing INTO the bottom region INCs mushCounts.lower (SC-21/33)', () => {
    const field = emptyField()
    field[idx(7, 0x0c)] = 0x7c // → row $0B under a down-scroll: enters the bottom region
    const g = playState({ field, scrolc: -1, mushCounts: { lower: 0, top: 0 } })
    const out = stepGame(g, idle)
    expect(out.mushCounts.lower, 'one mushroom entered the bottom region (SC-33)').toBe(1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC8 — the DDT-bomb halves scroll with the field (ml4-4 ddtScroll*)', () => {
  // ddtScrollDown/ddtScrollUp keep the DDTADD bank in step with the field shift:
  // an occupied entry's row (lo) tracks the scroll (DD-53 DEC on down). The field
  // shift alone does not touch the bank, so a moved bank row is unique to the
  // DDT-half wiring.
  const occupiedDdt = () => {
    const table = newDdtTable()
    ddtPlace(table, false) // stamps the four bombs at their DDTADD rows
    const i = table.findIndex((e) => e.hi !== 0)
    return { table, i }
  }

  it('a DOWN-scroll steps an occupied DDT bank entry one row down (MLSUB.MAC:1231-1295, DD-53)', () => {
    const { table, i } = occupiedDdt()
    expect(i, 'a bomb bank entry is occupied to move').toBeGreaterThanOrEqual(0)
    const loBefore = table[i].lo // DDTST[0] = 0x10CD ⇒ row $0D, well clear of rows 0/1
    const g = playState({ ddt: table, scrolc: -1 })
    const out = stepGame(g, idle)
    // This entry sits far from rows 0/1, so DD-53 STEPS it (DEC lo) rather than
    // clearing it off-screen. Pin BOTH facts — no ternary, no vacuous branch: the
    // on-screen assumption (hi != 0) is asserted, so a future fixture that scrolled
    // this entry off would fail here loudly instead of silently going tautological.
    expect(out.ddt[i].hi, 'the bomb stayed on-screen (did not scroll off)').not.toBe(0)
    expect(out.ddt[i].lo, 'on-screen bomb stepped down one row (DD-53)').toBe(loBefore - 1)
  })
})

// ═══════════════════════════════════════════════════════════════════════════
describe('ml7-9 AC9 — accessibility: a scroll is a SHIFT, never a full-screen strobe', () => {
  it('the event vocabulary still has no flash/strobe cue', () => {
    for (const kind of EVENT_KINDS) expect(kind).not.toMatch(/flash|strobe/i)
  })

  it('a scrolling frame emits NO new per-frame cue a renderer could strobe on', () => {
    // The scroll moves bytes; it must not add a repeating flash event. Compare a
    // scrolling frame's event set against the identical non-scrolling frame — the
    // scroll must introduce no cue at all (a shift is silent).
    const base = () => playState({ scrolc: 0 })
    const still = stepGame(base(), idle)
    const scrolling = stepGame(playState({ scrolc: -1 }), idle)
    expect(downScrollFingerprint(scrolling.field), 'the seeded frame really scrolled').toBe(true)
    expect(scrolling.events, 'scrolling adds no event over a still frame').toEqual(still.events)
  })
})
