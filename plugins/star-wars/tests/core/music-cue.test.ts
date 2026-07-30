// tests/core/music-cue.test.ts
//
// RED-phase suite for Story sw3-5 — "Phase music engine: a looping music channel
// driven off phase edges". The 1983 cabinet swaps its looping background music at
// each phase edge (docs/star-wars-1983-source-findings.md, "## Sound hooks"):
//
//   phase edge            ROM cue         our track
//   ----------------------------------------------------
//   space @ PH.TIM 2s     Sound_24/$25    'space'    (sw8-12: a MILESTONE — the
//                                                     phase OPENS IN SILENCE;
//                                                     WSMAIN.MAC:1378-1390/1418-1430)
//   Death Star surface    Sound_20/$21    'towers'   (ROM "Towers music")
//   trench run            Sound_22        'trench'
//   space @ ROM {4,6,8}   Sound_1D        'imperialMarch'  (replaces 'space' at
//                                                     the SAME 2s milestone)
//
// sw8-12 re-seat: this suite's space rows originally cued on the run-start /
// wave-rollover EDGES. The ROM's PHISP1 plays nothing — the space theme is the
// PH.TIM==40 (2s) milestone walked by PHESP1 — so those stagings moved to the
// milestone crossing. The towers/trench EDGE rows are authentic and unchanged
// (PM4TH rides the ground-phase init). Canonical milestone pins:
// tests/core/space-music-milestones.test.ts.
//
// The last row is the space-wave loop (WSMAIN:1421 / sub_6838): it plays the
// Imperial March INSTEAD of the space theme on human 1-based waves {4,6,8,...} —
// the ROM gate `LDA GM.WAV / CMPA #4-1 / IFGE / ANDA #1 / IFNE` reads the 0-based
// counter (GM.WAV >= 3 AND odd), which is human wave >= 4 AND even. (sw3-5 shipped
// the 1-based misread {3,5,7,...}; sw7-2 corrected it — see wave-parity-gates.test.)
// The Imperial March replaces ONLY the space theme — towers/trench are wave-independent.
//
// DESIGN (TEA's call, delegated by the story context): the cue is a first-class
// core GameEvent, mirroring sw2-5 speech — the core decides WHICH track and WHEN
// (deterministic, tested here); the shell owns the looping playback via
// @shared/audio startLoop/stopLoop (tests/shell/music-channel.test.ts).
//
//   // src/core/events.ts  — added to the GameEvent union (nothing here exists yet)
//   type MusicTrack = 'space' | 'towers' | 'trench' | 'imperialMarch'
//   interface MusicEvent { type: 'music'; track: MusicTrack }
//
// The cue is emitted ON THE PHASE EDGE ONLY (run start, space->surface,
// surface->trench, and the trench->next-wave-space clearRun) — never on a frame
// that merely stays in a phase. A per-frame emit would re-trigger startLoop 60x a
// second and stutter the loop to silence; that is the headline regression guarded
// below, and the cousin of the sw3-4 "run two goes silent" edge/reset bug.
//
// Valid RED: `MusicTrack`/the `music` variant do not exist yet (type errors until
// GREEN, like sw3-4's `trenchTimer`), and `stepGame` emits no `music` events, so
// every behavioural assertion fails at runtime.
import { describe, it, expect } from 'vitest'
import type { MusicTrack } from '../../src/core/events'
import { stepGame, enterPhase } from '../../src/core/sim'
import {
  initialState,
  SURFACE_END_SEQ,
  SURFACE_SEQ_SPAN,
  type GameState,
} from '../../src/core/state'
import { NO_INPUT } from '../../src/core/input'
// sw8-11: end-of-space staging valid under both the retiring kill quota and the
// ported ROM time-box — this suite's subject is the EDGE cues, not the mechanism.
import { SPACE_PHASE_OVER } from '../support/space-phase-end'
// sw9-2: attract+start opens the SELECT picker; the run-start music fires on the
// select→playing edge (see tests/support/select.ts). EASY (choice 0) = wave 1.
import { fireAtChoice, beginRunAt } from '../support/select'

/** A surface state whose traversal is complete (gdSeq >= 5), so the NEXT step
 *  crosses the surface→trench edge (sw7-18 / D-019 — the ROM ends the ground
 *  phase by traversal, not by an all-towers count). gdSeq and surfaceScrollZ are
 *  set consistently so the gate reads the same whether Dev stores or derives gdSeq. */
const traversalComplete: Partial<GameState> = {
  gdSeq: SURFACE_END_SEQ,
  surfaceScrollZ: SURFACE_END_SEQ * SURFACE_SEQ_SPAN + 1,
}

const DT = 1 / 60

/** A playing-phase state seeded deterministically, with optional overrides
 *  (initialState already opens in mode 'playing', phase 'space', wave 1). */
function playing(overrides: Partial<GameState> = {}): GameState {
  return { ...initialState(1), ...overrides }
}

/** A clean trench run at a chosen `wave` (the Imperial-March parity source). Wall
 *  obstacles cleared so a catwalk crash can't cut the run short (mirrors
 *  trench-voice-timer.test.ts's freshTrench). */
function trenchAtWave(seed: number, wave: number): GameState {
  return { ...enterPhase(initialState(seed), 'trench'), mode: 'playing', wave, trenchObstacles: [] }
}

/** A run ARMED AND AT THE WALL, so the NEXT step destroys the port — driving the
 *  trench->next-wave-space `clearRun` edge (mirrors speech-cues.test.ts). */
function portKill(state: GameState): GameState {
  // sw3-15: a port kill now only resolves in the near-cockpit approach window,
  // so seat the (dead-centre) port in-window rather than at its far spawn distance.
  // sw7-17: the laser is HITSCAN, so the bolt that used to be parked on the port is
  // gone — and a port 300 ahead of a pilot flying 768 above the floor sits 68.7° below
  // him, past the 30° the yoke reaches, so it cannot become "shoot it this frame"
  // either. A real run wins the way this fixture does: the torpedo latch closed far
  // out (where the port IS reachable), resolving here at the ROM's $800 gate — sw5-6's
  // ARM-early / RESOLVE-late split. See speech-cues.test.ts's twin.
  const p = state.exhaustPort!.pos
  const port: typeof p = [p[0], p[1], -300]
  return {
    ...state,
    exhaustPort: { pos: port },
    portTorpedoArmed: true,
  }
}

/** The music tracks cued this frame, in order (mirrors speech-cues' spokenLines). */
function musicTracks(s: GameState): string[] {
  return s.events.filter((e) => e.type === 'music').map((e) => (e.type === 'music' ? e.track : ''))
}

/** A parked space phase on `wave`, one step short of the 2s theme milestone
 *  (sw8-12): the NEXT step crosses phaseTime 2 and must cue the wave's theme.
 *  Literal 1.99 on purpose — staging never re-derives from the constant under
 *  audit. Sky parked so the crossing frame is deterministic. */
function themeCrossing(wave: number): GameState {
  return playing({
    phase: 'space',
    wave,
    enemies: [],
    enemyShots: [],
    spawnTimer: 1e9,
    phaseTime: 1.99,
  })
}

/** Every track the engine can cue — pins the `MusicTrack` union members at compile
 *  time (a renamed/missing id is a type error, not a silent pass). */
const MUSIC_TRACKS: MusicTrack[] = ['space', 'towers', 'trench', 'imperialMarch']

describe('MusicEvent — a core GameEvent variant (AC2)', () => {
  it('emits every MusicTrack the union declares across real phase edges', () => {
    // Folds the old compile-time "is a `music` variant" / "4 distinct tracks" pins
    // (which only inspected the local MUSIC_TRACKS fixture, never production) into one
    // BEHAVIORAL check: every track the union declares must actually be reachable as a
    // `music` cue — so the union carries no dead member and no edge is missing its
    // theme. The `MUSIC_TRACKS: MusicTrack[]` annotation still pins the union at
    // COMPILE time (a renamed/dropped member is a type error here); "4 distinct .wav
    // files" is pinned against the real MUSIC export in tests/shell/music-channel.
    const emitted = new Set<string>([
      // the space theme is the 2s PH.TIM milestone (sw8-12), not an edge cue:
      // a parked wave-2 space frame crossing phaseTime 2 cues 'space'…
      ...musicTracks(stepGame(themeCrossing(2), NO_INPUT, DT)),
      // …and the same crossing on wave 4 (GM.WAV 3, odd) cues 'imperialMarch'
      ...musicTracks(stepGame(themeCrossing(4), NO_INPUT, DT)),
      // space -> surface: towers theme (an EDGE — PM4TH rides the ground init)
      ...musicTracks(
        stepGame(playing({ phase: 'space', wave: 2, ...SPACE_PHASE_OVER }), NO_INPUT, DT),
      ),
      // surface -> trench: trench theme (D-019: ends by traversal, not kills)
      ...musicTracks(
        stepGame(playing({ phase: 'surface', wave: 2, ...traversalComplete }), NO_INPUT, DT),
      ),
    ])
    expect(emitted).toEqual(new Set<string>(MUSIC_TRACKS))
  })
})

describe('music cue — the run start opens in SILENCE; the theme is the 2s milestone (sw8-12, PHISP1 plays nothing)', () => {
  it('cues NO music alongside player-spawn when a run begins', () => {
    const sel = stepGame(playing({ mode: 'attract' }), { ...NO_INPUT, start: true }, DT)
    expect(sel.mode).toBe('select') // sw9-2: the picker sits between attract and play
    const out = fireAtChoice(sel, 0) // choice 0 = EASY = wave 1
    expect(out.mode).toBe('playing')
    expect(out.phase).toBe('space')
    expect(out.events).toContainEqual({ type: 'player-spawn' }) // the furniture survives
    // sw8-12: the ROM's PHISP1 zeroes/seeds PH.TIM and plays NOTHING — the theme
    // belongs to the 2s milestone (WSMAIN.MAC:1378-1390), not to this edge.
    expect(out.events.some((e) => e.type === 'music')).toBe(false)
  })

  it('wave 1 hears the PLAIN space theme within the head-started first frames — never the March (odd, < 4)', () => {
    // initialState seeds phaseTime 1.95 (SC.FWV==0, sw8-11), so the wave-1 theme
    // fires within the first few 1/60s steps — "almost immediately", per the ROM's
    // "START A BIT AHEAD". The March needs wave >= 4 AND even; wave 1 never qualifies.
    let s: GameState = { ...beginRunAt(0), enemies: [], enemyShots: [], spawnTimer: 1e9 }
    expect(musicTracks(s)).toEqual([]) // the run-start edge itself is silent
    const heard: string[] = []
    for (let f = 0; f < 10 && heard.length === 0; f++) {
      s = stepGame(s, NO_INPUT, DT)
      heard.push(...musicTracks(s))
    }
    expect(heard).toContain('space')
    expect(heard).not.toContain('imperialMarch')
  })
})

describe('music cue — entering the Death Star surface plays the towers theme (AC2)', () => {
  it("swaps to the 'towers' theme on the space -> surface edge", () => {
    const out = stepGame(playing({ phase: 'space', wave: 2, ...SPACE_PHASE_OVER }), NO_INPUT, DT)
    expect(out.phase).toBe('surface') // the transition actually happened
    expect(out.events).toContainEqual({ type: 'level-clear', next: 'surface' })
    expect(out.events).toContainEqual({ type: 'music', track: 'towers' })
  })

  it("names the surface track for the ROM 'towers' music, not the 'surface' phase", () => {
    const out = stepGame(playing({ phase: 'space', wave: 2, ...SPACE_PHASE_OVER }), NO_INPUT, DT)
    // Deliberate: the surface phase's authentic music is Sound_20/21 "Towers music".
    expect(musicTracks(out)).toContain('towers')
    expect(musicTracks(out)).not.toContain('surface')
  })

  it('does NOT play the trench theme on the surface edge (right theme, right moment)', () => {
    const out = stepGame(playing({ phase: 'space', wave: 2, ...SPACE_PHASE_OVER }), NO_INPUT, DT)
    expect(musicTracks(out)).not.toContain('trench')
  })
})

describe('music cue — entering the trench plays the trench theme (AC2)', () => {
  it("swaps to the 'trench' theme on the surface -> trench edge", () => {
    const out = stepGame(playing({ phase: 'surface', wave: 2, ...traversalComplete }), NO_INPUT, DT)
    expect(out.phase).toBe('trench') // the transition actually happened
    expect(out.events).toContainEqual({ type: 'level-clear', next: 'trench' })
    expect(out.events).toContainEqual({ type: 'music', track: 'trench' })
  })
})

describe('music cue — the Imperial March replaces the space theme on ROM waves {4,6,8,...} (AC3)', () => {
  // ROM gate WSMAIN:1421 reads the 0-based GM.WAV: March iff GM.WAV>=3 AND GM.WAV odd
  // = human 1-based wave >= 4 AND even. sw7-2 corrected sw3-5's 1-based {3,5,7,...}
  // misread. The exhaustive wave map lives in tests/core/wave-parity-gates.test.ts.
  //
  // sw8-12 re-seat: these used to read the wave-ROLLOVER frame's tracks — an edge
  // the ROM keeps silent. The parity law is unchanged; it is now consulted at the
  // 2s milestone of the entered wave, so the staging moved to the crossing. The
  // rollover-integrated form (port kill -> new wave -> milestone) lives in
  // wave-parity-gates.test.ts's re-seated musicEnteringWave.
  it('plays the plain space theme at wave 2 (even but < 4) — the 2s crossing', () => {
    const out = stepGame(themeCrossing(2), NO_INPUT, DT)
    expect(musicTracks(out)).toContain('space')
    expect(musicTracks(out)).not.toContain('imperialMarch')
  })

  it('plays the plain space theme at wave 3 (odd) — the March needs an EVEN wave', () => {
    const out = stepGame(themeCrossing(3), NO_INPUT, DT)
    expect(musicTracks(out)).toContain('space')
    expect(musicTracks(out)).not.toContain('imperialMarch')
  })

  it('plays the Imperial March at wave 4 (even, >= 4) — and never the plain theme', () => {
    const out = stepGame(themeCrossing(4), NO_INPUT, DT)
    expect(out.phase).toBe('space') // the milestone is mid-phase, not a warp
    expect(musicTracks(out)).toContain('imperialMarch')
    expect(musicTracks(out)).not.toContain('space')
  })

  it('plays the plain space theme at wave 5 (odd) — the gate needs EVEN, not just >= 4', () => {
    const out = stepGame(themeCrossing(5), NO_INPUT, DT)
    expect(musicTracks(out)).toContain('space')
    expect(musicTracks(out)).not.toContain('imperialMarch')
  })

  it('replaces ONLY the space theme — the towers/trench edges are unchanged at wave 3', () => {
    // Imperial March is the space-wave loop (sub_6838); the surface/trench themes
    // never become the March, whatever the wave/parity.
    const toSurface = stepGame(
      playing({ phase: 'space', ...SPACE_PHASE_OVER, wave: 3 }),
      NO_INPUT,
      DT,
    )
    expect(toSurface.phase).toBe('surface')
    expect(musicTracks(toSurface)).toContain('towers')
    expect(musicTracks(toSurface)).not.toContain('imperialMarch')

    const toTrench = stepGame(
      playing({ phase: 'surface', wave: 3, ...traversalComplete }),
      NO_INPUT,
      DT,
    )
    expect(toTrench.phase).toBe('trench')
    expect(musicTracks(toTrench)).toContain('trench')
    expect(musicTracks(toTrench)).not.toContain('imperialMarch')
  })
})

describe('the cue fires on the EDGE, not every frame (AC1/AC4 — one startLoop per phase, not 60/sec)', () => {
  it('emits exactly one music cue entering the trench, and none on the next trench frame', () => {
    const entered = stepGame(playing({ phase: 'surface', wave: 2, ...traversalComplete }), NO_INPUT, DT)
    expect(entered.phase).toBe('trench')
    expect(musicTracks(entered)).toEqual(['trench']) // exactly one, exactly this track
    // A subsequent frame still in the trench (port far downrange, no hit) must be
    // musically silent — the cue rides the EDGE, not every frame in the phase. A
    // per-frame emit would re-start the loop every step and never let it play.
    const next = stepGame({ ...entered, mode: 'playing' }, NO_INPUT, DT)
    expect(next.phase).toBe('trench')
    expect(musicTracks(next)).toEqual([])
  })

  it('the run-start frame AND the following idle frame are musically silent (sw8-12: pre-milestone)', () => {
    const started = beginRunAt(0) // attract→select→EASY, the run-start edge
    expect(musicTracks(started)).toEqual([]) // sw8-12: the edge is silent now
    const idle = stepGame(started, NO_INPUT, DT) // still space, still short of 2s
    expect(idle.phase).toBe('space')
    // 1.95 (head start) + 1/60 < 2 — the theme milestone has not arrived yet.
    expect(musicTracks(idle)).toEqual([])
  })

  it('an idle surface frame (already entered) emits no music cue', () => {
    const entered = stepGame(playing({ phase: 'space', wave: 2, ...SPACE_PHASE_OVER }), NO_INPUT, DT)
    expect(entered.phase).toBe('surface')
    const idle = stepGame({ ...entered, mode: 'playing' }, NO_INPUT, DT)
    expect(idle.phase).toBe('surface')
    expect(musicTracks(idle)).toEqual([])
  })

  it('a plain trench frame that is not an edge emits no music', () => {
    // Already IN the trench (not entering it) — stepping forward is not an edge.
    const trench: GameState = { ...enterPhase(initialState(7), 'trench'), mode: 'playing' }
    expect(musicTracks(stepGame(trench, NO_INPUT, DT))).toEqual([])
  })
})

describe('no run-two-silent regression — a later wave still cues its edges (AC4)', () => {
  it('a second run (wave 2) still swaps to the towers theme entering the surface', () => {
    const out = stepGame(
      playing({ phase: 'space', ...SPACE_PHASE_OVER, wave: 2 }),
      NO_INPUT,
      DT,
    )
    expect(out.phase).toBe('surface')
    expect(musicTracks(out)).toContain('towers')
  })

  it('a second run (wave 2) still swaps to the trench theme entering the trench', () => {
    // Re-based by sw7-18 (D-019): wave 2's authored maze is BUNK — bunkers only,
    // ZERO towers — and killing towers no longer ends the phase anyway. Wave 2
    // leaves the surface the authentic way: TRAVERSAL, once the ship has flown its
    // five $8000 passes (gdSeq >= 5). Seat the run at that completion so this frame
    // IS the edge. The cue under test — the trench theme on a second run — is unchanged.
    const out = stepGame(
      playing({ phase: 'surface', wave: 2, ...traversalComplete }),
      NO_INPUT,
      DT,
    )
    expect(out.phase).toBe('trench')
    expect(musicTracks(out)).toContain('trench')
  })

  it('the clearRun return path is musically SILENT (sw8-12) — the next theme belongs to the new wave 2s milestone', () => {
    // The port kill runs the most complex return path (stepTrench -> clearRun ->
    // enterPhase). It used to re-open the space theme here; the ROM's rollover is
    // silent — enterPhase restarts the clock and the theme waits for its milestone.
    // The level-clear still rides the frame out, proving the path itself survives.
    const out = stepGame(portKill(trenchAtWave(1983, 1)), NO_INPUT, DT)
    expect(out.events).toContainEqual({ type: 'level-clear', next: 'space' })
    expect(musicTracks(out).length).toBe(0) // sw8-12: no music cue on the wave-clear edge
  })
})

describe('music cues are deterministic (AC4 — pure core)', () => {
  it('identical seed + inputs replay identical music cues across a scripted run', () => {
    function musicStream(seed: number): string[] {
      // Drive a scripted run across both music edges: clear space (→ surface), then
      // complete the surface traversal (→ trench). WAVE 2 — wave 1 has no ground
      // phase (D-015), so it would skip the 'towers' edge this run must cross.
      let s: GameState = { ...initialState(seed), wave: 2, phase: 'space', ...SPACE_PHASE_OVER }
      const tracks: string[] = []
      for (let f = 0; f < 3; f++) {
        if (s.phase === 'surface') s = { ...s, ...traversalComplete } // end by traversal, not kills (D-019)
        s = stepGame(s, NO_INPUT, DT)
        tracks.push(...musicTracks(s))
      }
      return tracks
    }
    const a = musicStream(1983)
    const b = musicStream(1983)
    expect(a).toEqual(b)
    // The scripted run really did cross both music edges.
    expect(a).toContain('towers')
    expect(a).toContain('trench')
  })
})
