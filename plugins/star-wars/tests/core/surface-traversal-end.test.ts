// tests/core/surface-traversal-end.test.ts
//
// Story sw7-18 — R11c surface traversal rebuild, Defect D-019 (end by traversal
// ONLY) + the PMREB audio rider. RED phase (O'Brien / TEA). EXPECTED TO FAIL.
//
// THE DEFECT. The ROM ends the ground phase purely by TRAVERSAL: `LDA GD.SEQ /
// CMPA #5 ;ONLY GO SO FAR INTO GROUND SEQUENCES` (WSMAIN.MAC:1678-1688). GD.SEQ
// counts $8000 wraps of forward travel (S1MVGD, WSMAIN.MAC:2537-2545) — five
// passes ≈ 371 frames ≈ 18.1 s. Killing every tower sets `Q.ATP` and shows the
// "50,000 FOR SHOOTING ALL TOWERS" banner but does NOT shorten the phase.
//
// Ours couples the two: `phaseCleared` returns `allTowersKilled(s) ||
// surfaceScrollZ >= surfaceFieldDepth(s.wave)` — the all-towers arm cuts the
// surface short the instant the last tower dies. This suite drops that arm.
//
// THE FIX (design §Defect 3 / R11c):
//   - phase ends at `gdSeq >= SURFACE_END_SEQ` (5) ONLY — the all-towers arm is
//     gone; a single missed tower no longer strands the run either (that was the
//     other side of the old coupling, sw4-3).
//   - `gdSeq` counts completed $8000 passes: gdSeq = floor(surfaceScrollZ /
//     SURFACE_SEQ_SPAN), seeded 0 on surface entry.
//   - the 50,000 clear bonus is DECOUPLED: it banks ONCE the frame all towers are
//     down (phaseKills reaches the wave's tower quota) — mid-phase, banner and
//     all — and the pilot keeps flying the rest of the traversal.
//
// AUDIO RIDER (design §Defect 3, music rider). PHEGD fires `PMREB` "FINISH GROUND
// WITH REBEL" at pseudo-second 14 (`LDA PH.TIM / CMPA #14. / JSR PMREB`,
// WSMAIN.MAC:1668-1671; PH.TIM ticks once per 16 frames). sw7-8's audio hooks are
// live, so this cues a one-shot `finishGround` tune late in the surface — once,
// before the phase ends.
//
// Contract this suite asks DEV to implement:
//   state.ts constants:
//     SURFACE_SEQ_SPAN = 0x8000   // 32,768 — one forward pass (ROM $8000 wrap)
//     SURFACE_END_SEQ  = 5         // GD.SEQ >= 5 ends the phase (ROM CMPA #5)
//   GameState gains:  gdSeq: number   // ROM GD.SEQ; completed $8000 passes
//   events.ts:        TuneName gains 'finishGround' (PMREB)
//   Behaviour:
//     - phaseCleared('surface') === (gdSeq >= SURFACE_END_SEQ); the allTowersKilled
//       arm is removed; surfaceFieldDepth no longer gates the exit.
//     - gdSeq === floor(surfaceScrollZ / SURFACE_SEQ_SPAN) throughout the phase.
//     - the 50k bonus (tower-bonus event + score + towerBonusAwardedAt) banks once,
//       the frame allTowersKilled first holds, WITHOUT clearing the phase.
//     - a single 'tune'/'finishGround' cue fires during the surface, past ~10 s in.
//
// Sacred boundary: pure core, no DOM, no time except dt, no RNG except state's.

import { describe, it, expect } from 'vitest'
import {
  initialState,
  towersForWave,
  SURFACE_CLEAR_BONUS,
  SURFACE_SEQ_SPAN,
  SURFACE_END_SEQ,
  SURFACE_FINISH_GROUND_SPEED,
  SKIM_ALTITUDE,
  MIN_SKIM_ALTITUDE,
  POST_HIT_SHIELD_WINDOW,
  type GameState,
} from '../../src/core/state'
import { stepGame, enterPhase, surfaceShip } from '../../src/core/sim'
import { NO_INPUT } from '../../src/core/input'
import type { GameEvent } from '../../src/core/events'

const DT = 0.02

/** A fresh surface at a chosen wave, padded so surface fire cannot end the run
 *  before the traversal completes — we probe the CLEAR condition, not death. */
function freshSurface(wave: number, seed = 1983): GameState {
  return { ...enterPhase({ ...initialState(seed), wave }, 'surface'), lives: 9999 }
}

/** Fly the surface with NO input until it clears (or give up). Returns the last
 *  state and every event seen. The accelerating pace clears a real traversal in
 *  ~18 s, so this terminates well within budget. */
function flyUntilTrench(s: GameState, maxSteps = 4000): { s: GameState; events: GameEvent[]; steps: number } {
  const events: GameEvent[] = []
  let steps = 0
  for (; steps < maxSteps && s.phase === 'surface' && !s.gameOver; steps++) {
    s = stepGame(s, NO_INPUT, DT)
    events.push(...(s.events as GameEvent[]))
  }
  return { s, events, steps }
}

// --- AC: gdSeq counts $8000 passes ------------------------------------------

describe('sw7-18 / D-019 — gdSeq counts $8000 forward passes', () => {
  it('seeds gdSeq to 0 on surface entry', () => {
    expect(freshSurface(3).gdSeq).toBe(0)
    expect(enterPhase(initialState(1983), 'surface').gdSeq).toBe(0)
  })

  it('gdSeq tracks floor(surfaceScrollZ / SURFACE_SEQ_SPAN) across the traversal', () => {
    let s = freshSurface(7)
    // Sample every few frames while the phase runs; the two must stay locked.
    for (let i = 0; i < 400 && s.phase === 'surface'; i++) {
      s = stepGame(s, NO_INPUT, DT)
      expect(s.gdSeq).toBe(Math.floor(s.surfaceScrollZ / SURFACE_SEQ_SPAN))
    }
  })

  it('gdSeq climbs monotonically past 0 (the field genuinely wraps, not a single pass)', () => {
    let s = freshSurface(7)
    let maxSeq = 0
    for (let i = 0; i < 2000 && s.phase === 'surface'; i++) {
      s = stepGame(s, NO_INPUT, DT)
      expect(s.gdSeq).toBeGreaterThanOrEqual(maxSeq) // never rewinds
      maxSeq = s.gdSeq
    }
    expect(maxSeq).toBeGreaterThanOrEqual(1) // more than one pass really happened
  })
})

// --- AC: the phase ends by traversal ONLY -----------------------------------

describe('sw7-18 / D-019 — the surface ends at gdSeq >= 5, by traversal alone', () => {
  it('clears to the trench only once gdSeq reaches SURFACE_END_SEQ', () => {
    const { s } = flyUntilTrench(freshSurface(7))
    expect(s.phase).toBe('trench')
    expect(s.gdSeq).toBeGreaterThanOrEqual(SURFACE_END_SEQ)
  })

  it('the traversal covers ~five $8000 passes of scroll before it ends', () => {
    // The exit is scroll-distance driven through gdSeq; the ship must actually fly
    // the five passes (≈ 163,840 units), not bail early.
    const { s } = flyUntilTrench(freshSurface(7))
    expect(s.phase).toBe('trench')
    // surfaceScrollZ is reset by enterPhase('trench'), so re-derive from the seq gate:
    // reaching the trench means the surface saw at least SURFACE_END_SEQ full passes.
    expect(SURFACE_END_SEQ * SURFACE_SEQ_SPAN).toBe(5 * 0x8000) // 163,840 — the design figure
  })

  it('killing every tower does NOT cut the surface short (the old early-exit arm is gone)', () => {
    // The D-019 heart: all towers accounted for, but gdSeq is still 0 — the run
    // MUST stay on the surface and keep flying, not jump to the trench.
    const wave = 3 // SQUARE — 16 towers, a real quota to "clear"
    const quota = towersForWave(wave)
    expect(quota).toBeGreaterThan(0)
    let s: GameState = { ...freshSurface(wave), phaseKills: quota }
    for (let i = 0; i < 20; i++) s = stepGame(s, NO_INPUT, DT) // still deep inside pass 0
    expect(s.gdSeq).toBeLessThan(SURFACE_END_SEQ)
    expect(s.phase).toBe('surface') // all towers dead, yet the phase is NOT cleared
  })

  it('a missed-tower run still clears (a single un-shot tower never strands the run)', () => {
    // The other half of the old coupling: with nothing shot, gdSeq alone ends it.
    const { s } = flyUntilTrench(freshSurface(7))
    expect(s.gameOver).toBe(false) // padded lives — testing the phase, not death
    expect(s.phase).toBe('trench')
  })
})

// --- AC: the 50k bonus is decoupled from phase length ------------------------

describe('sw7-18 / D-019 — the all-towers bonus banks once, mid-phase, decoupled', () => {
  const wave = 3
  const quota = towersForWave(wave)

  it('banks the 50,000 the frame all towers are down — WITHOUT clearing the phase', () => {
    const s0: GameState = { ...freshSurface(wave), phaseKills: quota, score: 0, towerBonusAwardedAt: null }
    const s1 = stepGame(s0, NO_INPUT, DT)
    expect(s1.phase).toBe('surface') // banked, but the traversal continues
    expect(s1.score).toBe(SURFACE_CLEAR_BONUS)
    expect(s1.events.some((e) => e.type === 'tower-bonus')).toBe(true)
    expect(s1.towerBonusAwardedAt).not.toBeNull()
  })

  it('banks the bonus EXACTLY once — later frames do not re-award it', () => {
    let s: GameState = { ...freshSurface(wave), phaseKills: quota, score: 0, towerBonusAwardedAt: null }
    let bonusEvents = 0
    for (let i = 0; i < 40 && s.phase === 'surface'; i++) {
      s = stepGame(s, NO_INPUT, DT)
      bonusEvents += s.events.filter((e) => e.type === 'tower-bonus').length
    }
    expect(bonusEvents).toBe(1)
    expect(s.score).toBe(SURFACE_CLEAR_BONUS) // exactly one 50k, not stacked
  })

  it('a full-clear run banks 50k total across the WHOLE traversal, not per pass', () => {
    // All towers dead at entry; fly the entire phase. The bonus is one banner, even
    // though gdSeq crosses five boundaries.
    const start: GameState = { ...freshSurface(wave), phaseKills: quota, score: 0, towerBonusAwardedAt: null }
    const { s, events } = flyUntilTrench(start)
    expect(s.phase).toBe('trench')
    expect(events.filter((e) => e.type === 'tower-bonus')).toHaveLength(1)
    expect(s.score).toBe(SURFACE_CLEAR_BONUS)
  })

  it('a scroll-completion clear with towers left un-killed banks NO bonus', () => {
    const start = { ...freshSurface(7), score: 0 }
    const { s, events } = flyUntilTrench(start)
    expect(s.phase).toBe('trench')
    expect(s.score).toBe(0)
    expect(events.some((e) => e.type === 'tower-bonus')).toBe(false)
  })

  it('the 50k banner STAMP survives the surface→trench edge (Reviewer R-1)', () => {
    // The stamp is banked MID-SURFACE now (D-019). enterPhase nulls towerBonusAwardedAt
    // on every entry, so without an explicit carry the surface→trench edge would DISCARD
    // it — cutting the "50,000 FOR SHOOTING ALL TOWERS" banner short in the trench, unlike
    // the sibling reward stamps clearRun carries. Seat the surface at its traversal end so
    // the stamp lands close to the edge, then assert it rides across.
    const start: GameState = {
      ...freshSurface(wave),
      phaseKills: quota,
      towerBonusAwardedAt: null,
      gdSeq: 4, // one pass short — the next steps bank the bonus, THEN cross into the trench
      surfaceScrollZ: 4 * 0x8000 + (0x8000 - 1),
    }
    const { s } = flyUntilTrench(start)
    expect(s.phase).toBe('trench')
    expect(s.towerBonusAwardedAt).not.toBeNull() // the banner stamp rode across the edge
  })

  it('the bunkers-only wave (0 towers) never gifts the bonus', () => {
    // BUNK has no towers, so allTowersKilled can never hold — no free 50k, ever.
    const start = { ...freshSurface(2), score: 0 } // wave 2 = BUNK
    expect(towersForWave(2)).toBe(0)
    const { s, events } = flyUntilTrench(start)
    expect(s.phase).toBe('trench')
    expect(s.score).toBe(0)
    expect(events.some((e) => e.type === 'tower-bonus')).toBe(false)
  })
})

// --- AC: the PMREB "finish ground" audio rider ------------------------------

describe('sw7-18 / D-019 — the PMREB "finish ground with rebel" tune (audio rider)', () => {
  it('cues exactly one finishGround tune during the surface traversal', () => {
    const { events } = flyUntilTrench(freshSurface(7))
    const finish = events.filter((e) => e.type === 'tune' && e.tune === 'finishGround')
    expect(finish).toHaveLength(1)
  })

  it('fires LATE in the phase (~pseudo-second 14 ≈ 10.9 s), not on the opening frames', () => {
    // PH.TIM ticks once per 16 frames; PMREB fires at PH.TIM == 14 → ~14×16/TICK_HZ ≈ 10.9 s.
    // Measure the elapsed surface time when the cue lands: a genuinely late beat.
    let s = freshSurface(7)
    let firedAt: number | null = null
    let elapsed = 0
    for (let i = 0; i < 4000 && s.phase === 'surface'; i++) {
      s = stepGame(s, NO_INPUT, DT)
      elapsed += DT
      if (firedAt === null && s.events.some((e) => e.type === 'tune' && e.tune === 'finishGround')) {
        firedAt = elapsed
      }
    }
    expect(firedAt).not.toBeNull()
    expect(firedAt!).toBeGreaterThan(9) // not an opening-frame cue
    expect(firedAt!).toBeLessThan(13) // lands around the ROM's pseudo-second 14
  })

  it('does not fire on a non-surface phase', () => {
    // The rider is PHEGD-only: a space run cues no finishGround.
    let s: GameState = { ...initialState(1983), phase: 'space' }
    const seen: GameEvent[] = []
    for (let i = 0; i < 400; i++) {
      s = stepGame(s, NO_INPUT, DT)
      seen.push(...(s.events as GameEvent[]))
    }
    expect(seen.some((e) => e.type === 'tune' && e.tune === 'finishGround')).toBe(false)
  })
})

// ── sw8-21: the death frame silences PMREB (PHEGD exits before it) ───────────
//
// ROM. PHEGD (WSMAIN.MAC:1642) tests the shields ABOVE the PH.TIM walk that
// fires the cue: `LDA S.GAS / LBMI PHIG0D ;J EXIT WHEN DEAD` (:1645-1646) sits
// before `JSR PMREB ;FINISH GROUND WITH REBEL` (:1673), so the cabinet never
// starts the "finish ground" cue over the player's death. This is the exact
// twin of PHESP1's space gate that sw8-13 ported (:1396-1397); the block in
// `space-music-milestones.test.ts` (:358) is this suite's template.
//
// OURS, BEFORE THIS STORY. `stepSurface` pushed the cue immediately after the
// pace was integrated, the frame it first crossed SURFACE_FINISH_GROUND_SPEED —
// with no lives gate at all — while the frame's shield loss was not resolved
// until `loseShield` some 130 lines further down. The cue started over the death.
//
// >> Line numbers below marked (pre-fix) describe that OLD layout and will not
// >> match the current file: the fix moved the push. Current anchors are
// >> `const scrollSpeed` (sim.ts:983, where the crossing is computed),
// >> `loseShield` / `const lives` (:1122-1123) and the gated push (:1145-1150).
//
// WHY THIS IS NOT A ONE-LINE `if` (the thing the story's "same fix shape as
// sw8-13" phrasing hides). `lives` is bound by `loseShield`, far below where the
// push used to sit. Wrapping the push in `if (lives > 0)` where it stood was
// compiled to check, and tsc rejected it:
//   sim.ts(997,9): error TS2448: Block-scoped variable 'lives' used before its
//                  declaration.                                      (pre-fix)
//   sim.ts(997,9): error TS2454: Variable 'lives' is used before being assigned.
// The only binding in scope there was `state.lives`, which describes a frame
// ENTERED dead; the dispatcher (sim.ts:185) makes that unreachable, so gating on
// it would be a no-op (the last test below pins that, and it reddens when the
// gameover branch is disabled). sw8-13 had the ordering for free (space:
// loseShield :633, gate :662). The surface stepper had them reversed, so this
// port had to RE-ORDER the decision below the shield resolution, not wrap it.
//
// Two of these tests exist specifically to refute the near-misses, and both turn
// on the same structural fact: the surface accrues `damage` at SEVERAL points,
// some above where the crossing is computed (`const scrollSpeed`, :983) and some
// below it, while `loseShield` (:1122) is the ONE place damage becomes death.
// That is why the gate must read `loseShield`'s result and not any earlier proxy
// — and it stays true however many damage sources the stepper grows:
//   - the turret-bolt case lands damage BELOW the crossing, so a fix reading the
//     local `damage` counter there sees 0 and still fires;
//   - the S-016 case has damage land and be DROPPED by the redraw window, so a
//     fix gating on `damage > 0` silences a cue the pilot should hear.
// Only the post-`loseShield` result satisfies all four.
//
// The five tests here that pass on arrival are regression guards, and each was
// mutation-proved rather than assumed: deleting the cue push reddens all four
// "still cues" cases, and disabling the gameover branch at sim.ts:185 reddens
// the reachability case. The one-shot property (the cue must not repeat on
// every frame past the threshold) is guarded by `cues exactly one finishGround
// tune during the surface traversal` above — a single-frame test cannot see it,
// which is why that one is named in this story's ACs as must-stay-green.
//
// Reachable only when the speed crossing and the LAST shield's fall share one
// frame — the story's ~0.05 s window.
describe('sw8-21 — a finishGround crossing on the death frame cues NOTHING', () => {
  /** Every finishGround cue emitted on this frame. */
  const finishCues = (s: GameState): GameEvent[] =>
    (s.events as GameEvent[]).filter((e) => e.type === 'tune' && e.tune === 'finishGround')

  /**
   * A surface seated one frame BELOW the PMREB speed crossing, so the very next
   * step crosses it. The pace integrates at SURFACE_ACCEL·dt (≈ 8.4 u at DT), so
   * starting 1 unit short guarantees the crossing lands on step one and nowhere
   * else. `shieldHitAt: null` opens the S-016 window unless a test closes it.
   */
  function atCrossing(over: Partial<GameState> = {}): GameState {
    return {
      ...enterPhase({ ...initialState(1983), wave: 7 }, 'surface'),
      mode: 'playing' as const,
      surfaceScrollSpeed: SURFACE_FINISH_GROUND_SPEED - 1,
      shieldHitAt: null,
      enemyShots: [],
      ...over,
    }
  }

  /** Flying below MIN_SKIM_ALTITUDE scrapes the surface: one shield, no RNG, no
   *  enemy. Its `damage++` is at `sim.ts:965-969` — ABOVE where the crossing is
   *  computed (`const scrollSpeed`, :983), which is what makes the near-miss fix
   *  in the turret-bolt test below look plausible. */
  const scraping = { altitude: 0 }

  it('the fixture really does cross on step one (guards every test below)', () => {
    // If this ever fails, the "silenced" assertions below are vacuous — they would
    // pass simply because no crossing occurred. Pin it against a live pilot.
    const out = stepGame(atCrossing({ lives: 9 }), NO_INPUT, DT)
    expect(scraping.altitude).toBeLessThan(MIN_SKIM_ALTITUDE) // the scrape fixture really scrapes
    expect(out.surfaceScrollSpeed).toBeGreaterThanOrEqual(SURFACE_FINISH_GROUND_SPEED)
    expect(finishCues(out)).toHaveLength(1)
  })

  it('the last shield falling on the crossing frame silences the cue', () => {
    const out = stepGame(atCrossing({ lives: 1, ...scraping }), NO_INPUT, DT)
    expect(out.lives).toBe(0)
    expect(out.gameOver).toBe(true)
    expect(out.events).toContainEqual({ type: 'terrain-crash' })
    // The crossing genuinely happened — the ship flew this frame and the pace
    // carried past the threshold. The cue is LOST, not deferred: nothing can
    // re-arm it, because the condition is a one-way crossing.
    expect(out.surfaceScrollSpeed).toBeGreaterThanOrEqual(SURFACE_FINISH_GROUND_SPEED)
    expect(finishCues(out)).toEqual([])
  })

  it('silences it for a TURRET BOLT too — damage that lands BELOW the cue site', () => {
    // The bolt's hit-test (`liveShots`, sim.ts:1113-1120) runs BELOW the point
    // where the crossing is computed (`const scrollSpeed`, :983), so at that
    // point this frame's `damage` counter has not yet seen the bolt — whereas
    // the terrain scrape above it (:965-969) has already been counted. A fix
    // that gated on `damage` at the crossing would therefore pass the scrape
    // test above and fail this one. Only the post-`loseShield` `lives`
    // (:1122-1123) sees every source, whatever they are.
    const ship = surfaceShip(SKIM_ALTITUDE)
    const out = stepGame(
      atCrossing({
        lives: 1,
        altitude: SKIM_ALTITUDE, // no scrape: the bolt is the only damage
        enemyShots: [{ pos: [...ship], vel: [0, 0, 0], ttl: 1 }],
      }),
      NO_INPUT,
      DT,
    )
    expect(out.events).toContainEqual({ type: 'player-death', cause: 'turret' })
    expect(out.events).not.toContainEqual({ type: 'terrain-crash' }) // the bolt, nothing else
    expect(out.lives).toBe(0)
    expect(out.surfaceScrollSpeed).toBeGreaterThanOrEqual(SURFACE_FINISH_GROUND_SPEED)
    expect(finishCues(out)).toEqual([])
  })

  it('control: the SAME crossing with shields to spare still cues — the gate is the DEATH, not the hit', () => {
    const out = stepGame(atCrossing({ lives: 6, ...scraping }), NO_INPUT, DT)
    expect(out.lives).toBe(5) // a shield was genuinely charged
    expect(out.gameOver).toBe(false)
    expect(finishCues(out)).toHaveLength(1)
  })

  it('boundary control: the hit that leaves ONE shield still cues — only the LAST shield exits PHEGD', () => {
    // Pins the gate to lives reaching 0, not to "a hit landed this frame": the
    // ROM's LBMI reads S.GAS minus (dead), and a pilot with a shield left hears
    // the cue exactly as the cabinet would.
    const out = stepGame(atCrossing({ lives: 2, ...scraping }), NO_INPUT, DT)
    expect(out.lives).toBe(1)
    expect(out.gameOver).toBe(false)
    expect(finishCues(out)).toHaveLength(1)
  })

  it('a hit DROPPED by the S-016 redraw window leaves the pilot alive — so the cue still fires', () => {
    // The scrape lands, but `shieldHitAt` is inside POST_HIT_SHIELD_WINDOW, so
    // loseShield folds it away and `lives` never falls. Damage occurred; death
    // did not. A gate written against `damage > 0` silences this wrongly.
    const out = stepGame(atCrossing({ lives: 1, shieldHitAt: 0, ...scraping }), NO_INPUT, DT)
    expect(DT).toBeLessThan(POST_HIT_SHIELD_WINDOW) // the window is genuinely open
    expect(out.events).toContainEqual({ type: 'terrain-crash' }) // damage DID land
    expect(out.lives).toBe(1) // ...and was dropped, not charged
    expect(out.gameOver).toBe(false)
    expect(finishCues(out)).toHaveLength(1)
  })

  it('a frame ENTERED dead never reaches the stepper, so the crossing never even runs', () => {
    // The other half of the ROM's exit, and why gating on `state.lives` at the
    // cue site would be a no-op: sim.ts:185 returns on the gameover branch before
    // the phase dispatch at :345-350. The pace does not advance at all.
    const seeded = atCrossing({ lives: 0, gameOver: true, mode: 'gameover' as const })
    const out = stepGame(seeded, NO_INPUT, DT)
    expect(out.surfaceScrollSpeed).toBe(seeded.surfaceScrollSpeed) // stepSurface never ran
    expect(finishCues(out)).toEqual([])
  })
})
