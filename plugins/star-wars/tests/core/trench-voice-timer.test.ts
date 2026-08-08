// tests/core/trench-voice-timer.test.ts
//
// Origin: Story sw3-4 — "Trench voice-line timer". The 1983 cabinet drives four
// iconic lines off a trench timer `word_4B0E`, gated by 0-based wave parity
// (WSMAIN.MAC:1868 `LDA BS.WAV / LSRA / IFCC`):
//
//   | frames | BS.WAV parity | human wave | Sound | line                              |
//   |--------|---------------|------------|-------|-----------------------------------|
//   |  16    | even (LSR CC) | odd  1,3,5 | $18   | "Luke, trust me"        (SPKTRU)  |
//   |  24    | even          | odd  1,3,5 | $1A   | "Yahoo, you're all clear kid" ($SPKYAU) |
//   |  16    | odd  (LSR CS) | even 2,4,6 | —     | "Let go Luke"           (SPKLET)  |
//   |  22    | odd           | even 2,4,6 | $16   | "The Force is strong…"  (SPKSTR)  |
//
// A single run plays only its PARITY set. BS.WAV is the 0-based wave (WSMAIN:1868
// "BEGIN WITH WAVE 0" / :1702-1707 BS.WAV = clamped GM.WAV), so BS.WAV-even is human
// ODD and BS.WAV-odd is human EVEN.
//
// ── CORRECTED by Story sw7-2 (R2 Wave-parity family) ────────────────────────────
// sw3-4 sourced parity from the 1-based `state.wave`, so its even/odd sets were the
// exact INVERSE of the cabinet's (audit U-008), and its odd branch was missing "Let
// go Luke" @16 entirely (U-007). sw7-2 reconciles the base — parity now derives from
// the 0-based wave — so the sets ride the ROM waves and "Let go Luke" is restored.
// The exhaustive wave→line map is pinned in tests/core/wave-parity-gates.test.ts;
// this suite keeps sw3-4's timing / once-per-run / reset / return-path / determinism
// coverage, re-expressed against the corrected parity (odd-wave fixtures for the
// Luke+Yahoo set, even-wave fixtures for the LetGo+Force set).
//
// ── (unchanged from sw7-1 / T-008) ──────────────────────────────────────────────
// The timer advances at the ROM game-frame rate 20.508 Hz (= TICK_HZ), so the cues
// fire at their authentic wall-clock times (16/20.508 = 0.78 s … 24/20.508 = 1.17 s)
// and are frame-rate independent. `trenchTimer` is a float game-frame accumulator.
import { describe, it, expect } from 'vitest'
import type { GameEvent, SpeechLine } from '../../src/core/events'
import { stepGame, enterPhase } from '../../src/core/sim'
import { initialState, type GameState } from '../../src/core/state'
import { NO_INPUT } from '../../src/core/input'
import { TRENCH_EYE_SEAT } from '../../src/core/trench-channel'

const DT = 1 / 60

/** ROM game-frame rate (WSINT.MAC:147) — the rate word_4B0E advances at. */
const ROM_GAME_FRAME_HZ = 246.094 / 12 // 20.508 Hz

// Authentic ROM trench-timer thresholds (word_4B0E), in GAME FRAMES.
const F_AT16 = 16 // @16 — "Luke, trust me" (odd) / "Let go Luke" (even)
const F_FORCE = 22 // even wave — "The Force is strong…"    (Sound_16)
const F_YAHOO = 24 // odd wave  — "Yahoo, you're all clear" (Sound_1A)

// Their authentic wall-clock firing times (frames ÷ 20.508 Hz), in seconds.
const S_AT16 = F_AT16 / ROM_GAME_FRAME_HZ // 0.780 s
const S_FORCE = F_FORCE / ROM_GAME_FRAME_HZ // 1.073 s
const S_YAHOO = F_YAHOO / ROM_GAME_FRAME_HZ // 1.170 s

// Representative parity waves (1-based). ODD → Luke+Yahoo set; EVEN → LetGo+Force set.
const ODD_WAVE = 1
const EVEN_WAVE = 2

/** A clean trench run seeded deterministically at a chosen `wave` (parity source).
 *  Wall obstacles are cleared so a catwalk crash can't cut the run short and mask the
 *  voice timer, and the exhaust port sits far downrange (a NO_INPUT run only reaches
 *  it at ~4.6 s), so this fixture isolates the timer, nothing else. */
function freshTrench(seed: number, wave: number): GameState {
  return {
    ...enterPhase(initialState(seed), 'trench'),
    mode: 'playing',
    wave,
    trenchObstacles: [],
  }
}

/** Pull the speech lines emitted this frame, in order (mirrors speech-cues.test.ts). */
function spokenLines(s: GameState): string[] {
  return s.events.filter((e) => e.type === 'speech').map((e) => (e.type === 'speech' ? e.line : ''))
}

interface Beat {
  /** accumulated sim-time (s) at the END of this step */
  t: number
  lines: string[]
}

/** Drive a trench state forward `steps` frames at DT, recording the accumulated
 *  sim-time and any speech emitted on each. 90 steps = 1.5 s clears the last cue
 *  (1.17 s) while the port is still ~1,650 u downrange (a NO_INPUT run never fires,
 *  so the port cannot resolve). */
function collectRun(s0: GameState, steps: number): Beat[] {
  const beats: Beat[] = []
  let s = s0
  let t = 0
  for (let i = 0; i < steps; i++) {
    s = stepGame(s, NO_INPUT, DT)
    t += DT
    beats.push({ t, lines: spokenLines(s) })
  }
  return beats
}

/** The sim-times at which `line` was spoken across a run — [] if never, and a length
 *  > 1 means it re-fired (a bug the once-per-run tests guard against). */
function firedAt(beats: Beat[], line: string): number[] {
  return beats.filter((b) => b.lines.includes(line)).map((b) => b.t)
}

const STEPS = 90 // 1.5 s — past the last threshold (1.17 s), port still downrange

describe('trench voice timer — the counter is frame-true (sw7-1 / T-008)', () => {
  it('enters the trench with the voice timer zeroed', () => {
    expect(enterPhase(initialState(1), 'trench').trenchTimer).toBe(0)
  })

  it('advances at the 20.508 Hz game-frame rate — ~20.5 frames after one second', () => {
    // One second of 60 Hz steps accumulates ONE second of game frames = 20.508, NOT
    // 60. (The old per-step counter reached 60 here — 2.93× fast.)
    let s = freshTrench(1, EVEN_WAVE)
    for (let i = 0; i < 60; i++) s = stepGame(s, NO_INPUT, DT)
    expect(s.trenchTimer).toBeCloseTo(ROM_GAME_FRAME_HZ, 1) // ≈ 20.508
  })

  it('is dt-SCALED, not per-step — a 1/240 step advances ¼ as far as a 1/60 step', () => {
    // The exact inversion of the sw3-4 bug: the counter is proportional to elapsed
    // time, so a quarter-length frame advances it a quarter as far. A per-step counter
    // would advance by 1 for BOTH and this ratio would be 1.
    const t0 = freshTrench(1, EVEN_WAVE)
    const fine = stepGame(t0, NO_INPUT, 1 / 240).trenchTimer
    const coarse = stepGame(t0, NO_INPUT, 1 / 60).trenchTimer
    expect(fine).toBeGreaterThan(0)
    expect(coarse / fine).toBeCloseTo(4, 1)
  })

  it('does NOT advance outside the trench (a space frame leaves it at 0)', () => {
    const space: GameState = { ...initialState(1), phase: 'space', mode: 'playing' }
    expect(space.trenchTimer).toBe(0)
    expect(stepGame(space, NO_INPUT, DT).trenchTimer).toBe(0)
  })
})

describe('odd-wave trench run — "Luke, trust me" @0.78 s + "Yahoo" @1.17 s (AC2)', () => {
  // Human ODD wave ⇐ BS.WAV EVEN branch (WSMAIN:1868 LSR carry-clear).
  const beats = collectRun(freshTrench(1983, ODD_WAVE), STEPS)

  it('cues "Luke, trust me" exactly once, at its ROM wall-clock time', () => {
    const times = firedAt(beats, 'lukeTrustMe')
    expect(times).toHaveLength(1)
    expect(times[0]).toBeCloseTo(S_AT16, 1) // 0.780 s
  })

  it('cues "Yahoo, you\'re all clear kid" exactly once, at its ROM wall-clock time', () => {
    const times = firedAt(beats, 'youreAllClearKid')
    expect(times).toHaveLength(1)
    expect(times[0]).toBeCloseTo(S_YAHOO, 1) // 1.170 s
  })

  it('does NOT cue the even-wave lines on an odd run (parity gate, AC4)', () => {
    expect(firedAt(beats, 'letGoLuke')).toEqual([])
    expect(firedAt(beats, 'theForceIsStrongInThisOne')).toEqual([])
  })
})

describe('even-wave trench run — "Let go Luke" @0.78 s + "The Force is strong" @1.07 s (AC3)', () => {
  // Human EVEN wave ⇐ BS.WAV ODD branch. sw7-2 restores "Let go Luke" @16 (U-007).
  const beats = collectRun(freshTrench(1983, EVEN_WAVE), STEPS)

  it('cues "Let go Luke" exactly once, at its ROM wall-clock time (restored by sw7-2)', () => {
    const times = firedAt(beats, 'letGoLuke')
    expect(times).toHaveLength(1)
    expect(times[0]).toBeCloseTo(S_AT16, 1) // 0.780 s
  })

  it('cues "The Force is strong in this one" exactly once, at its ROM wall-clock time', () => {
    const times = firedAt(beats, 'theForceIsStrongInThisOne')
    expect(times).toHaveLength(1)
    expect(times[0]).toBeCloseTo(S_FORCE, 1) // 1.073 s
  })

  it('does NOT cue the odd-wave lines on an even run (parity gate, AC4)', () => {
    expect(firedAt(beats, 'lukeTrustMe')).toEqual([])
    expect(firedAt(beats, 'youreAllClearKid')).toEqual([])
  })
})

describe('a line fires ONCE per run, not every frame past its threshold (AC5)', () => {
  it('an odd run is silent of "Luke, trust me" on every frame after it fires', () => {
    const beats = collectRun(freshTrench(7, ODD_WAVE), STEPS)
    expect(firedAt(beats, 'lukeTrustMe')).toHaveLength(1) // it really did fire once
    const after = beats.filter((b) => b.t > S_AT16 + DT)
    expect(after.length).toBeGreaterThan(0) // the run really did pass 0.78 s
    expect(after.some((b) => b.lines.includes('lukeTrustMe'))).toBe(false)
  })

  it('an even run is silent of "The Force is strong" on every frame after it fires', () => {
    const beats = collectRun(freshTrench(7, EVEN_WAVE), STEPS)
    expect(firedAt(beats, 'theForceIsStrongInThisOne')).toHaveLength(1)
    const after = beats.filter((b) => b.t > S_FORCE + DT)
    expect(after.length).toBeGreaterThan(0)
    expect(after.some((b) => b.lines.includes('theForceIsStrongInThisOne'))).toBe(false)
  })
})

describe('the timer + cues reset each run (AC6)', () => {
  it('resets a NON-ZERO timer to 0 on entering the trench', () => {
    // Drive the reset from a genuinely dirty value — NOT from a pristine
    // `initialState` (whose trenchTimer is already 0, which would pass even if the
    // `enterPhase` reset were deleted).
    const dirty: GameState = { ...initialState(1), trenchTimer: 47 }
    expect(enterPhase(dirty, 'trench').trenchTimer).toBe(0)
  })

  it('re-arms the cues on a second run whose prior timer had already climbed past 24', () => {
    // Run 1 (odd wave) climbs the timer well past every threshold...
    const run1 = collectRun(freshTrench(1, ODD_WAVE), STEPS)
    expect(firedAt(run1, 'lukeTrustMe')).toHaveLength(1)
    expect(firedAt(run1, 'youreAllClearKid')).toHaveLength(1) // really climbed past 24 frames
    // ...then a NEW trench opens from a state that STILL carries that climbed timer.
    // The entry MUST zero it, or the second run is silent forever (timer never falls
    // back below 16). If the enterPhase reset were missing, the cue would never fire.
    const climbed: GameState = { ...initialState(1), wave: ODD_WAVE, trenchTimer: 30 }
    const run2Start: GameState = {
      ...enterPhase(climbed, 'trench'),
      mode: 'playing',
      trenchObstacles: [],
    }
    expect(run2Start.trenchTimer).toBe(0)
    const run2 = collectRun(run2Start, STEPS)
    const luke = firedAt(run2, 'lukeTrustMe')
    expect(luke).toHaveLength(1)
    expect(luke[0]).toBeCloseTo(S_AT16, 1)
  })
})

describe('silence outside the cue windows (AC7 — complements speech-cues.test.ts)', () => {
  it('the trench is silent before the first threshold time', () => {
    const beats = collectRun(freshTrench(1, EVEN_WAVE), STEPS)
    const beforeFirst = beats.filter((b) => b.t < S_AT16 - DT)
    expect(beforeFirst.length).toBeGreaterThan(0) // there really is a pre-cue window
    expect(beforeFirst.every((b) => b.lines.length === 0)).toBe(true)
  })

  it('emits speech ONLY on the run\'s two threshold frames (no chatter between)', () => {
    const beats = collectRun(freshTrench(1, EVEN_WAVE), STEPS)
    const speakingFrames = beats.filter((b) => b.lines.length > 0)
    expect(speakingFrames).toHaveLength(2) // exactly the @16 + @22 lines, nothing else
  })
})

describe('parity is stable across many waves (rule: parity arithmetic)', () => {
  it('a high ODD wave still cues the Luke+Yahoo set, never the even-wave lines', () => {
    const beats = collectRun(freshTrench(1, 101), STEPS)
    expect(firedAt(beats, 'lukeTrustMe')).toHaveLength(1)
    expect(firedAt(beats, 'youreAllClearKid')).toHaveLength(1)
    expect(firedAt(beats, 'letGoLuke')).toEqual([])
    expect(firedAt(beats, 'theForceIsStrongInThisOne')).toEqual([])
  })

  it('a high EVEN wave still cues the LetGo+Force set, never the odd-wave lines', () => {
    const beats = collectRun(freshTrench(1, 100), STEPS)
    expect(firedAt(beats, 'letGoLuke')).toHaveLength(1)
    expect(firedAt(beats, 'theForceIsStrongInThisOne')).toHaveLength(1)
    expect(firedAt(beats, 'lukeTrustMe')).toEqual([])
    expect(firedAt(beats, 'youreAllClearKid')).toEqual([])
  })
})

describe('SpeechEvent carries the trench SpeechLine ids (AC9 / union exhaustiveness)', () => {
  // Typed as SpeechLine[]: a COMPILE-TIME assertion that all four ids are members of
  // the union — a renamed or missing id is a type error, not a silent pass. sw7-2 adds
  // 'letGoLuke' (U-007), the fourth trench line, to sw3-4's original three.
  const TRENCH_LINES: SpeechLine[] = [
    'lukeTrustMe',
    'youreAllClearKid',
    'theForceIsStrongInThisOne',
    'letGoLuke',
  ]

  it('the trench contributes four DISTINCT lines to the SpeechLine union', () => {
    expect(new Set(TRENCH_LINES).size).toBe(4)
  })

  it('each is a valid `speech` GameEvent payload', () => {
    const events: GameEvent[] = TRENCH_LINES.map((line) => ({ type: 'speech', line }))
    for (const e of events) {
      expect(e.type).toBe('speech')
      if (e.type === 'speech') expect(typeof e.line).toBe('string')
    }
  })
})

describe('a cue rides every return path — coexists with crash / port-kill events', () => {
  it('fires alongside the win cue when a trench line lands on the SAME frame as a port kill (clearRun path)', () => {
    // Wave 4 (even → "Let go Luke" @16, and a SPEAKING wave for "Great shot kid"),
    // timer one game-frame short of 16, with the port scrolled into the approach window and the
    // proton torpedo already ARMED, so this ONE step both crosses the @16 threshold AND destroys
    // the port. The port kill runs clearRun -> enterPhase (the most complex return path); the cue,
    // pushed at the TOP of stepTrench, must still ride the frame's events out. (trenchTimer is set
    // 0.1 frames below 16 so a single game-frame advance — dt·20.508 ≈ 0.34 — crosses it this step.)
    //
    // sw7-17 / R11b: the kill used to be staged with a bolt parked on the port. The player's gun is
    // now a hitscan beam and spawns nothing (audit G-004), and an in-window port cannot be shot at
    // all — from the seat 768 above the floor it is ~44° down, past the yoke's 30°. The ROM arms
    // the torpedo early and resolves it at the wall (`LDA PT.LIV` at `SUBD #0800`), so the armed
    // latch IS the staged kill. Nothing about the cue's return path changes; this is still the
    // clearRun frame, reached the way a pilot reaches it.
    const trench = enterPhase(initialState(1983), 'trench')
    const p = trench.exhaustPort!.pos
    const port: typeof p = [p[0], p[1], -300] // seat it in the near-cockpit approach window
    const s0: GameState = {
      ...trench,
      mode: 'playing',
      wave: 4,
      trenchTimer: F_AT16 - 0.1,
      trenchObstacles: [],
      exhaustPort: { pos: port },
      portTorpedoArmed: true,
    }
    const lines = spokenLines(stepGame(s0, NO_INPUT, DT))
    expect(lines).toContain('letGoLuke') // the timer cue survived the port-hit return
    expect(lines).toContain('greatShotKidThatWasOneInAMillion') // ...next to the win cue (wave 4 speaks)
  })

  it('fires alongside a catwalk crash on the SAME frame (obstacle-crash path)', () => {
    // A synthetic force field parked at the cockpit forces the crash branch on this
    // step, while the timer crosses 16 on an ODD wave ("Luke, trust me"). The cue
    // must ride the crash return path too.
    //
    // sw7-19 re-seat: the catwalk is now a SIDE-GATED wall force field (B-012), so a
    // centred (x=0) parked obstacle no longer collides. Co-locate the field with a
    // left-side pilot so the graze fires under BOTH the old radius sphere and the new
    // side gate — this test is about the voice cue riding the crash return, not the
    // collision shape.
    const trench = enterPhase(initialState(1983), 'trench')
    const s0: GameState = {
      ...trench,
      mode: 'playing',
      wave: ODD_WAVE,
      trenchTimer: F_AT16 - 0.1,
      trenchObstacles: [{ kind: 'catwalk', pos: [-300, TRENCH_EYE_SEAT, -1] }],
      trenchView: [-300, TRENCH_EYE_SEAT, 0],
    }
    const out = stepGame(s0, NO_INPUT, DT)
    expect(spokenLines(out)).toContain('lukeTrustMe') // the cue survived the crash return
    expect(out.events.some((e) => e.type === 'terrain-crash')).toBe(true) // crash really fired
  })
})

describe('trench voice cues are deterministic (AC8 — pure core)', () => {
  it('identical seed + wave replay identical speech cues across a trench run', () => {
    const stream = (seed: number, wave: number): string[] =>
      collectRun(freshTrench(seed, wave), STEPS).flatMap((b) => b.lines)
    const a = stream(2024, ODD_WAVE)
    const b = stream(2024, ODD_WAVE)
    expect(a).toEqual(b)
    // The scripted odd run really did cross both of its cue edges.
    expect(a).toContain('lukeTrustMe')
    expect(a).toContain('youreAllClearKid')
  })
})

// ── sw8-22: the death frame gate — but only the death ABOVE the cue walk ──────
//
// ROM. PHEBS ('VIEW BASE TRENCH', WSMAIN.MAC) guards the phase at its TOP —
// `LDA S.GAS / LBMI PHIB0D ;J EXIT WHEN PLAYER DIES` — and that guard sits above
// the phase's whole PH.TIM cue walk: `JSR PMRRP` (the rebel-repeat theme) and the
// parity-gated voice lines `JSR SPKTRU` / `SPKYAU` / `SPKLET` / `SPKSTR`. This is
// the SAME exit sw8-13 (space, PHESP1) and sw8-21 (surface, PHEGD) already ported;
// the block in `surface-traversal-end.test.ts` is this suite's template, and the
// `loseShield`-is-where-damage-becomes-death invariant is the same one.
//
// WHAT MAKES THE TRENCH DIFFERENT — and why this is NOT a copy of sw8-21's single
// relocation. `stepTrench` resolves TWO shield hits, and the ROM puts them on
// OPPOSITE sides of the cue walk:
//   • the wall-GUN hit (DOBASE 'FIRES BASES SHOTS') runs ABOVE the cue walk, under
//     the same top guard — so a last-shield fall to a turret bolt silences this
//     frame's voice + theme cues, exactly as sw8-21's turret bolt silenced PMREB.
//     In OURS that hit is `gunHit` (a `loseShield`), and the cue must read ITS
//     post-hit lives.
//   • the exhaust-port CRASH (bashing the end wall) runs BELOW the cue walk and
//     carries its OWN, separate guard `LDA S.GAS / LBLE PHIB0D` that gates only
//     `JSR SPKR2N` (R2's swearing) — NOT the voice lines, which already fired
//     above it. In OURS that hit is `portHit`, and `r2Scream` is already gated on
//     its post-hit lives; the voice cue must stay.
//
// So the ruling is: the voice/theme cue is gated by the GUN death, and is NOT
// gated by the port-crash death. A naive "gate on the frame's final lives" fix
// would silence the cue on a port crash too — the port-crash test below is the
// discriminator that refutes it, and it must stay green.
//
// The cue crossing here is TIMER-driven (`trenchTimer`, ROM word_4B0E), so a
// death frame is staged by seating the timer one game-frame below a threshold
// (F_AT16 - 0.1, the same seat the "rides every return path" block above uses)
// and landing the killing hit on that same step.
describe('sw8-22 — a voice cue on the GUN-death frame is silenced (PHEBS exits before the walk)', () => {
  /** A trench seated one game-frame below the @16 cue on an EVEN-parity (human ODD)
   *  wave, so the next step crosses it and "Luke, trust me" is due. Obstacles cleared
   *  so nothing cuts the run short; `shieldHitAt: null` keeps the S-016 window closed
   *  to a fresh hit so a seeded bolt genuinely charges a shield. */
  function atCue16(over: Partial<GameState> = {}): GameState {
    return {
      ...enterPhase(initialState(1983), 'trench'),
      mode: 'playing' as const,
      wave: ODD_WAVE, // even parity → "Luke, trust me" @16
      trenchTimer: F_AT16 - 0.1,
      trenchObstacles: [],
      shieldHitAt: null,
      enemyShots: [],
      ...over,
    }
  }

  /** A wall-gun bolt parked on the pilot's eye (`trenchView` default), so the trench
   *  gun hit-test lands it this frame: one shield, cause 'turret', nothing else. */
  const bolt: Partial<GameState> = {
    enemyShots: [{ pos: [0, TRENCH_EYE_SEAT, 0], vel: [0, 0, 0], ttl: 1 }],
  }

  it('the fixture really crosses the @16 cue on step one (guards every test below)', () => {
    // If this regresses, the "silenced" assertion below is vacuous — it would pass
    // simply because no cue crossed. Pin it against a live pilot with shields to spare.
    const out = stepGame(atCue16({ lives: 9 }), NO_INPUT, DT)
    expect(spokenLines(out)).toContain('lukeTrustMe')
    expect(out.gameOver).toBe(false)
  })

  it('the last shield falling to a WALL-GUN bolt on the cue frame silences the voice cue', () => {
    const out = stepGame(atCue16({ lives: 1, ...bolt }), NO_INPUT, DT)
    expect(out.lives).toBe(0)
    expect(out.gameOver).toBe(true)
    expect(out.events).toContainEqual({ type: 'player-death', cause: 'turret' }) // the death really landed
    // The crossing genuinely happened (the timer stepped past 16), but the gun hit
    // above the cue walk took the last shield — so the line is LOST, not deferred.
    expect(out.trenchTimer).toBeGreaterThanOrEqual(F_AT16)
    expect(spokenLines(out)).not.toContain('lukeTrustMe')
  })

  it('control: the SAME cue frame with shields to spare still speaks — the gate is the DEATH, not the hit', () => {
    // A bolt lands and charges a shield, but the pilot lives. `gunHit`'s post-hit
    // lives are > 0, so the cue fires exactly as the cabinet would. A fix that gated
    // on "a hit landed this frame" instead of the post-`loseShield` lives fails here.
    const out = stepGame(atCue16({ lives: 6, ...bolt }), NO_INPUT, DT)
    expect(out.events).toContainEqual({ type: 'player-death', cause: 'turret' })
    expect(out.lives).toBe(5) // a shield was genuinely charged
    expect(out.gameOver).toBe(false)
    expect(spokenLines(out)).toContain('lukeTrustMe')
  })

  it('boundary control: the bolt that leaves ONE shield still speaks — only the LAST shield exits PHEBS', () => {
    const out = stepGame(atCue16({ lives: 2, ...bolt }), NO_INPUT, DT)
    expect(out.lives).toBe(1)
    expect(out.gameOver).toBe(false)
    expect(spokenLines(out)).toContain('lukeTrustMe')
  })

  it('THE RULING: a last shield falling to the EXHAUST-PORT crash does NOT silence the voice cue', () => {
    // The port bash sits BELOW the cue walk in PHEBS, under its own `LBLE PHIB0D`
    // guard that gates only `SPKR2N`. So the voice line has already fired by the time
    // the crash resolves. Seat the port ON the cockpit plane (it scrolls to z >= 0
    // this step) with no torpedo armed and no fire input, so the frame resolves as a
    // crash, not a win. The pilot dies to the crash — yet "Luke, trust me" is spoken.
    // This is the discriminator against a "gate on final lives" over-fix.
    const out = stepGame(
      atCue16({ lives: 1, exhaustPort: { pos: [0, 0, 0] }, portTorpedoArmed: false }),
      NO_INPUT,
      DT,
    )
    expect(out.lives).toBe(0)
    expect(out.gameOver).toBe(true)
    expect(out.events).toContainEqual({ type: 'exhaust-port-missed' }) // the crash really resolved
    expect(spokenLines(out)).not.toContain('r2Scream') // R2 is silenced by the death (existing gate)
    expect(spokenLines(out)).toContain('lukeTrustMe') // ...but the voice cue above the crash is NOT
  })

  it('a frame ENTERED dead never reaches stepTrench, so the cue never even crosses', () => {
    // The other half of the ROM's exit: the dispatcher returns on the gameover branch
    // before the trench phase runs, so the timer never advances and nothing is spoken.
    const seeded = atCue16({ lives: 0, gameOver: true, mode: 'gameover' as const })
    const out = stepGame(seeded, NO_INPUT, DT)
    expect(out.trenchTimer).toBe(seeded.trenchTimer) // stepTrench never ran
    expect(spokenLines(out)).toEqual([])
  })
})
