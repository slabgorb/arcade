// tests/core/space-music-milestones.test.ts
//
// RED-phase suite for Story sw8-12 — space-phase music follows the ROM's PH.TIM
// milestone schedule, not the phase edges.
//
// The 1983 source (WSMAIN.MAC PHESP1, :1415-1444) walks the space clock every
// game frame and fires each cue on an exact PH.TIM compare:
//
//   PH.TIM ==  2*20.          =  40  ( 2s)  theme — PMTH5 :1430, or PMDAR :1426
//                                           when GM.WAV >= 3 AND odd (CMPA #4-1 /
//                                           IFGE / ANDA #1 / IFNE, :1421-1425 —
//                                           human waves {4,6,8,...}; GM.WAV is
//                                           0-based: "START AT EASY" seeds 0, :1053)
//   PH.TIM ==  2+7+1*20.      = 200  (10s)  theme B — PMTHB :1435, parity-blind
//                                           (the CMPD chain tests PH.TIM only)
//   PH.TIM ==  2+7+1+9+1*20.  = 400  (20s)  descent — PMDES :1439, ONE second
//   PH.TIM >=  2+7+1+9+1+1*20.= 420  (21s)  before "GO AHEAD AND DESCEND" (sw8-11)
//
// PHISP1 (the phase INIT, :1378-1390) plays NOTHING — it zeroes PH.TIM (or seeds
// 2*20.-1 = 39 on the run's first wave, "THEN START A BIT AHEAD"), so the phase
// OPENS IN SILENCE and the theme is a milestone, not an edge cue. All four tunes'
// only call sites in the entire tree are this block (grep "JSR PM(TH5|THB|DES|DAR)"
// — the PMBEN "grep the caller, not the label" discipline), so the clone's
// edge-cued space track (beginRun / clearRun, sw3-5) and edge-cued descent
// (progress(), sw7-8/U-014's own comment calls itself the "un-sequenced
// equivalent") are refuted at the caller level.
//
// Contract pinned here (Dev implements to this):
//   - entering the space phase cues NO space music (run start, wave rollover);
//   - the step that CROSSES phaseTime 2 cues the theme ONCE — named 'space', or
//     'imperialMarch' on human waves {4,6,8,...} (musicTrackFor's existing law);
//   - the step that crosses 10 cues 'themeB' ONCE — on March waves too;
//   - the step that crosses 20 cues the 'descent' TUNE once, while the phase is
//     still 'space' — the space->surface edge no longer carries it;
//   - crossings are `prev < T && next >= T` of the sw8-11 phaseTime clock — the
//     float-dt port of the ROM's integer IFEQ (the IFHS -> `>=` precedent);
//   - the milestones belong to PHESP1: no space cue ever fires from a surface /
//     trench / gameOver frame, whatever their clock reads.
//
// Milestone literals (2, 10, 20, 21, 1.95) are pinned as LITERALS, never derived
// from exported constants (tp1-27 — a pin that re-derives from the constant under
// audit stays green for any value of it).
//
// CHANNEL-AGNOSTIC BY DESIGN: cues are collected by NAME across both the 'music'
// and 'tune' event channels. WHICH channel carries the theme / themeB (looping
// music vs one-shot tune, and the shell asset consequences — see the session's
// Delivery Findings) is Dev's call; WHEN and WHAT are the ROM's, and are pinned.
//
// Also closes sw8-11's Reviewer M7 survivor: phaseTime accumulation OUTSIDE the
// space phase was unpinned (removing the surface dispatch tick survived the full
// suite). This story's cross-phase negative guards are non-vacuous ONLY if that
// accumulation is pinned, so the accumulation asserts live here, with the guards
// they arm.

import { describe, it, expect } from 'vitest'
import { stepGame, enterPhase } from '../../src/core/sim'
import { initialState, type GameState } from '../../src/core/state'
import { NO_INPUT } from '../../src/core/input'
import { beginRunAt } from '../support/select'

/** One ROM game frame (20 Hz) in seconds — the space-phase-timebox convention. */
const DT = 0.05

/** A playing-phase state (initialState opens mode 'playing', phase 'space', wave 1,
 *  phaseTime seeded 1.95 — the ROM's SC.FWV==0 first-wave head start). */
function playing(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState(1), ...overrides }
}

/** A wave-N space entry on the clearRun path: clock 0, no head start (SC.FWV != 0
 *  past the first wave) — the space-phase-timebox spaceWave2 idiom, wave-general. */
function spaceAtWave(wave: number): GameState {
  return { ...enterPhase(playing(), 'space'), wave }
}

/** Park the sky so a multi-second idle flight is deterministic (sw8-7's "a
 *  positive timer still parks" contract keeps the idiom valid). */
function parkedSky(s: GameState): GameState {
  return { ...s, enemies: [], enemyShots: [], spawnTimer: 1e9 }
}

/** Every music/tune cue this frame, by NAME, in event order — the channel-agnostic
 *  collection the header describes. MusicTrack / TuneName members widen to string. */
function cueNames(s: GameState): string[] {
  return s.events.flatMap((e): string[] =>
    e.type === 'music' ? [e.track] : e.type === 'tune' ? [e.tune] : [],
  )
}

/** The cue names that belong to the SPACE milestone schedule. Filtering to these
 *  keeps fixtures honest around frames that legitimately cue something else
 *  (the port-kill frame's 'finale', a surface frame's 'finishGround'). */
const SPACE_SCHEDULE = ['space', 'imperialMarch', 'themeB', 'descent']

function spaceCues(s: GameState): string[] {
  return cueNames(s).filter((n) => SPACE_SCHEDULE.includes(n))
}

/** Fly a parked space state to the warp, recording every cue with the phaseTime
 *  it fired at (post-step clock) and the wall-time step index. The warp frame's
 *  own cues (towers/trench music) are recorded with the phase they fired into. */
function flight(s0: GameState): {
  cues: Array<{ name: string; at: number; step: number; phase: string }>
  end: GameState
  steps: number
} {
  const cues: Array<{ name: string; at: number; step: number; phase: string }> = []
  let s = s0
  let steps = 0
  while (s.phase === 'space' && steps < 500) {
    s = stepGame(s, NO_INPUT, DT)
    steps++
    for (const name of cueNames(s)) {
      cues.push({ name, at: s.phaseTime, step: steps, phase: s.phase })
    }
  }
  return { cues, end: s, steps }
}

// ── AC-1: the space phase OPENS IN SILENCE ────────────────────────────────────

describe('sw8-12 AC-1 — entering the space phase cues no music (PHISP1 plays nothing, WSMAIN.MAC:1378-1390)', () => {
  it('a run start (attract -> select -> EASY) emits NO music event and no schedule cue', () => {
    const out = beginRunAt(0) // EASY = wave 1
    expect(out.mode).toBe('playing')
    expect(out.phase).toBe('space')
    // The run-start furniture survives — only the music cue moves to its milestone.
    expect(out.events).toContainEqual({ type: 'player-spawn' })
    expect(out.events.some((e) => e.type === 'music')).toBe(false)
    expect(spaceCues(out)).toEqual([])
  })

  it('the wave-rollover (port-kill clearRun) frame is musically silent — the new wave theme belongs to its 2s milestone', () => {
    // The port-kill frame legitimately cues the 'finale' TUNE (sw7-8/U-012), so
    // this pins the MUSIC channel empty and the schedule cues absent — not "no
    // events at all".
    const s0 = portKill({ ...enterPhase(initialState(1983), 'trench'), mode: 'playing', wave: 1, trenchObstacles: [] })
    const out = stepGame(s0, NO_INPUT, DT)
    expect(out.events).toContainEqual({ type: 'level-clear', next: 'space' })
    expect(out.wave).toBe(2) // the rollover really happened
    expect(out.events.some((e) => e.type === 'music')).toBe(false)
    expect(spaceCues(out)).toEqual([])
  })
})

/** A trench run armed and at the wall — the NEXT step destroys the port (the
 *  music-cue / speech-cues portKill idiom, sw3-15/sw7-17 seating). */
function portKill(state: GameState): GameState {
  const p = state.exhaustPort!.pos
  return {
    ...state,
    exhaustPort: { pos: [p[0], p[1], -300] },
    portTorpedoArmed: true,
  }
}

// ── AC-2: the theme is the 2-SECOND milestone ─────────────────────────────────

describe('sw8-12 AC-2 — the theme fires the step phaseTime crosses 2 (PH.TIM 40, WSMAIN.MAC:1418-1430)', () => {
  it('a parked wave-2 space entry is SILENT for 39 frames, cues exactly [space] on frame 40, and is silent after', () => {
    let s = parkedSky(spaceAtWave(2))
    for (let f = 1; f <= 39; f++) {
      s = stepGame(s, NO_INPUT, DT)
      expect(cueNames(s), `frame ${f} (phaseTime ${s.phaseTime.toFixed(2)}) must be silent`).toEqual([])
    }
    s = stepGame(s, NO_INPUT, DT) // frame 40: 40 x 0.05 crosses 2.0
    expect(spaceCues(s)).toEqual(['space'])
    for (let f = 41; f <= 60; f++) {
      s = stepGame(s, NO_INPUT, DT)
      expect(cueNames(s), `frame ${f} must not re-fire the theme`).toEqual([])
    }
  })

  it('the milestone is a CROSSING, not an equality: a step from 1.99 lands past 2.0 and still fires', () => {
    // The ROM's IFEQ is an integer-frame compare; under float dt the port is
    // prev < 2 && next >= 2 (the sw8-11 IFHS -> `>=` precedent). A frame never
    // sits exactly ON 2.0 here, so an equality port would silently never fire.
    const s = stepGame({ ...parkedSky(spaceAtWave(2)), phaseTime: 1.99 }, NO_INPUT, DT)
    expect(spaceCues(s)).toEqual(['space'])
  })

  it('a clock already PAST the milestone does not fire it (guard: no >= re-fire)', () => {
    // Intended keep-behavior guard — green before and after GREEN. With crossing
    // semantics a state staged at 2.01 has prev >= 2, so the theme is spent.
    const s = stepGame({ ...parkedSky(spaceAtWave(2)), phaseTime: 2.01 }, NO_INPUT, DT)
    expect(spaceCues(s)).toEqual([])
  })
})

// ── AC-3: the Darth variant at the SAME milestone ─────────────────────────────

describe('sw8-12 AC-3 — the 2s milestone plays the Imperial March on human waves {4,6,8,...} (GM.WAV>=3 odd, WSMAIN.MAC:1421-1426)', () => {
  it('wave 4 (GM.WAV 3, odd): the crossing cues [imperialMarch], never the plain theme', () => {
    const s = stepGame({ ...parkedSky(spaceAtWave(4)), phaseTime: 1.99 }, NO_INPUT, DT)
    expect(spaceCues(s)).toEqual(['imperialMarch'])
  })

  it('wave 5 (GM.WAV 4, even): the crossing cues the plain [space] theme', () => {
    const s = stepGame({ ...parkedSky(spaceAtWave(5)), phaseTime: 1.99 }, NO_INPUT, DT)
    expect(spaceCues(s)).toEqual(['space'])
  })
})

// ── AC-4: theme B is the 10-SECOND milestone ──────────────────────────────────

describe("sw8-12 AC-4 — 'themeB' fires the step phaseTime crosses 10 (PMTHB, PH.TIM 200 = (2+7+1)*20, WSMAIN.MAC:1433-1435)", () => {
  it('the crossing step cues exactly [themeB]', () => {
    const s = stepGame({ ...parkedSky(spaceAtWave(2)), phaseTime: 9.99 }, NO_INPUT, DT)
    expect(spaceCues(s)).toEqual(['themeB'])
  })

  it('the approach to the milestone stays silent (9.7 -> 9.9 cues nothing)', () => {
    // Intended keep-behavior guard — the schedule has GAPS, and the gaps are part
    // of it (the cabinet is silent between theme end and theme B).
    let s = { ...parkedSky(spaceAtWave(2)), phaseTime: 9.7 }
    for (let f = 0; f < 4; f++) {
      s = stepGame(s, NO_INPUT, DT)
      expect(cueNames(s)).toEqual([])
    }
  })

  it('theme B is parity-BLIND: a March wave (4) still gets themeB at 10s — the CMPD chain tests PH.TIM only', () => {
    const s = stepGame({ ...parkedSky(spaceAtWave(4)), phaseTime: 9.99 }, NO_INPUT, DT)
    expect(spaceCues(s)).toEqual(['themeB'])
  })

  it('themeB is a ONE-SHOT: exactly one across the crossing and the ten frames after', () => {
    let s: GameState = { ...parkedSky(spaceAtWave(2)), phaseTime: 9.99 }
    const seen: string[] = []
    for (let f = 0; f < 11; f++) {
      s = stepGame(s, NO_INPUT, DT)
      seen.push(...spaceCues(s))
    }
    expect(seen).toEqual(['themeB'])
  })
})

// ── AC-5: the descent tune is the 20-SECOND milestone, 1s BEFORE the warp ─────

describe("sw8-12 AC-5 — 'descent' fires the step phaseTime crosses 20, while the phase is STILL space (PMDES, PH.TIM 400, WSMAIN.MAC:1436-1439)", () => {
  it('the crossing step cues the descent TUNE and does NOT warp — the warp is a separate, later frame (21s)', () => {
    const s = stepGame({ ...parkedSky(spaceAtWave(2)), phaseTime: 19.99 }, NO_INPUT, DT)
    expect(s.events).toContainEqual({ type: 'tune', tune: 'descent' })
    expect(s.phase).toBe('space')
    expect(s.events.some((e) => e.type === 'level-clear')).toBe(false)
  })

  it('the space -> surface WARP frame no longer carries the descent — only the towers theme rides the edge', () => {
    // Staged past the descent milestone so the next step is the sw8-11 time-box
    // warp itself: the descent belongs to 20s, which this state has already spent.
    const s = stepGame({ ...parkedSky(spaceAtWave(2)), phaseTime: 20.99 }, NO_INPUT, DT)
    expect(s.phase).toBe('surface')
    expect(cueNames(s)).toEqual(['towers'])
  })

  it('descent is a ONE-SHOT fired IN space: exactly one between 20s and the warp, before the phase flips', () => {
    // The phase is recorded per cue: today's edge-cued descent would land here
    // exactly once too, but stamped 'surface' (the warp frame) — the phase
    // stamp is what separates the milestone from the edge, not the count.
    let s: GameState = { ...parkedSky(spaceAtWave(2)), phaseTime: 19.99 }
    const seen: Array<{ name: string; phase: string }> = []
    while (s.phase === 'space') {
      s = stepGame(s, NO_INPUT, DT)
      for (const name of spaceCues(s)) seen.push({ name, phase: s.phase })
    }
    expect(seen).toEqual([{ name: 'descent', phase: 'space' }])
  })
})

// ── AC-6: the whole schedule, flown end to end ────────────────────────────────

describe('sw8-12 AC-6 — a full parked flight walks the ROM schedule in order', () => {
  it('wave 2+: [space@2s, themeB@10s, descent@20s], each within one frame of its milestone, then the 21s warp to the surface', () => {
    const { cues, end, steps } = flight(parkedSky(spaceAtWave(2)))
    const schedule = cues.filter((c) => SPACE_SCHEDULE.includes(c.name))
    expect(schedule.map((c) => c.name)).toEqual(['space', 'themeB', 'descent'])
    const [theme, themeB, descent] = schedule
    expect(theme.at).toBeGreaterThanOrEqual(2)
    expect(theme.at).toBeLessThanOrEqual(2 + DT)
    expect(themeB.at).toBeGreaterThanOrEqual(10)
    expect(themeB.at).toBeLessThanOrEqual(10 + DT)
    expect(descent.at).toBeGreaterThanOrEqual(20)
    expect(descent.at).toBeLessThanOrEqual(20 + DT)
    // The box itself is sw8-11's: the warp lands at ~21s, one second after the descent.
    expect(end.phase).toBe('surface')
    expect(steps * DT).toBeGreaterThan(20.9)
    expect(steps * DT).toBeLessThanOrEqual(21.15)
    expect(steps * DT - descent.step * DT).toBeGreaterThanOrEqual(0.9)
    expect(steps * DT - descent.step * DT).toBeLessThanOrEqual(1.1)
  })

  it("wave 1: the 1.95s head start fires the theme on the run's FIRST step and shifts every cue ~1.95s earlier in wall time", () => {
    // initialState IS the run start (SC.FWV==0): phaseTime opens at 1.95, so the
    // first 0.05s step crosses 2.0 — the cabinet's theme "fires almost
    // immediately" on wave 1 (PH.TIM seeded 2*20.-1 = 39, WSMAIN.MAC:1386-1390).
    const { cues, end, steps } = flight(parkedSky(playing()))
    const schedule = cues.filter((c) => SPACE_SCHEDULE.includes(c.name))
    expect(schedule.map((c) => c.name)).toEqual(['space', 'themeB', 'descent'])
    const [theme, themeB, descent] = schedule
    expect(theme.step).toBe(1) // wall ~0.05s — NOT 2s
    expect(themeB.step * DT).toBeGreaterThan(7.9) // wall ~8.05s = 10 - 1.95
    expect(themeB.step * DT).toBeLessThanOrEqual(8.2)
    expect(descent.step * DT).toBeGreaterThan(17.9) // wall ~18.05s = 20 - 1.95
    expect(descent.step * DT).toBeLessThanOrEqual(18.2)
    // Wave 1 dives straight to the TRENCH (sw7-18) at ~19.05s wall (sw8-11).
    expect(end.phase).toBe('trench')
    expect(steps * DT).toBeGreaterThan(18.9)
    expect(steps * DT).toBeLessThanOrEqual(19.2)
  })
})

// ── AC-7: the milestones belong to PHESP1 — and the cross-phase clock is real ─

describe('sw8-12 AC-7 — no space cue fires outside the space phase, and the clock those guards read is pinned (sw8-11 review M7)', () => {
  it('a gameOver space frame crossing a milestone cues nothing (PHESP1 exits through PHIS0D before the milestone walk)', () => {
    // Intended keep-behavior guard — green before and after GREEN.
    const s0 = { ...parkedSky(spaceAtWave(2)), phaseTime: 1.99, gameOver: true, lives: 0 }
    expect(cueNames(stepGame(s0, NO_INPUT, DT))).toEqual([])
  })

  it('the SURFACE clock accumulates (M7 pin) and its milestones cue no space music', () => {
    // The accumulation assert is what makes the negative half non-vacuous: if the
    // surface dispatch tick were removed (sw8-11 review mutation M7), phaseTime
    // would never cross and "no cue" would pass having tested nothing.
    for (const t of [1.99, 9.99, 19.99]) {
      const s0 = { ...enterPhase(playing(), 'surface'), wave: 2, phaseTime: t }
      const s1 = stepGame(s0, NO_INPUT, DT)
      expect(s1.phaseTime).toBeCloseTo(t + DT, 5) // the clock really ticked
      expect(spaceCues(s1)).toEqual([])
    }
  })

  it('the TRENCH clock accumulates (M7 pin) and its milestones cue no space music', () => {
    for (const t of [1.99, 9.99, 19.99]) {
      const s0 = {
        ...enterPhase(playing(), 'trench'),
        mode: 'playing' as const,
        phaseTime: t,
        trenchObstacles: [],
      }
      const s1 = stepGame(s0, NO_INPUT, DT)
      expect(s1.phaseTime).toBeCloseTo(t + DT, 5)
      expect(spaceCues(s1)).toEqual([])
    }
  })
})
