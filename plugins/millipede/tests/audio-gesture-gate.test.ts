// tests/audio-gesture-gate.test.ts
//
// The gesture gate for millipede's rewritten main.ts (ml6-2/ml7-2). AC:
// no AudioContext is constructed before the player's first interaction, and one
// IS constructed the moment it arrives. The cabinet keeps its engine inert at
// module scope (`const audio = createAudio()`, main.ts:38 — @shared/synth builds
// NOTHING until resume()), and the first gesture calls audio.resume().
//
// ─── THIS FILE DELIBERATELY DOES NOT MOCK THE AUDIO MODULE ───────────────────
// A recording fake for createAudio never builds an AudioContext, so the gate
// would look respected no matter what main.ts did. This file boots the REAL
// createAudio → createSynthEngine against a COUNTING AudioContext installed on
// globalThis (helpers/boot-shell.ts). @shared/synth resolves its constructor as
// `AudioContext ?? globalThis.webkitAudioContext` (src/shared/synth.ts:114-118),
// so counting `new AudioContext()` is exactly "did the engine open a context".
//
// ─── THE VACUITY TRAP THIS FILE IS BUILT AROUND ──────────────────────────────
// "No AudioContext before a gesture" is the SH-gate vacuity trap: it is true
// today for the WRONG reason — if nothing ever called audio.resume(), no context
// would be built, gesture or not, and the negative would ship green while proving
// nothing. So the negatives (no context at boot, none across silent attract) are
// paired with the POSITIVE that only real wiring satisfies: after a gesture a
// context IS built. The positive is the load-bearing assertion; the negatives
// keep the fix honest. Neither is committed without the other.

import { describe, it, expect, beforeAll } from 'vitest'
import { bootMillipedeShell, type ShellHarness } from './helpers/boot-shell'

/** Contexts counted at each stage of the boot, captured before the next stage. */
const seen = {
  afterBoot: -1,
  afterSilentFrames: -1,
  afterGesture: -1,
  afterManyGestures: -1,
}

/** The sim phase before and after the first gesture (the smoke assertions). */
const phase = { beforeGesture: '', afterGesture: '' }
/** The frame counter before and after stepping attract (the liveness smoke). */
const frames = { early: -1, later: -1 }

let shell: ShellHarness

beforeAll(async () => {
  shell = await bootMillipedeShell()

  // Boot alone must build nothing: main.ts creates the engine at module scope,
  // but @shared/synth touches WebAudio only inside resume().
  seen.afterBoot = shell.audioContexts()

  // Run the attract screen for a while with NO input whatsoever. Attract is
  // silent by design (core/sim.ts:63-81 — stepAttract clears the event stream),
  // so this is the real pre-gesture state of the cabinet: stepping, rendering,
  // emitting nothing, and — the point of this file — opening no context.
  for (let i = 0; i < 60; i++) shell.frame(i)
  frames.early = shell.sim().frame
  seen.afterSilentFrames = shell.audioContexts()
  phase.beforeGesture = shell.sim().phase

  // The first interaction. main.ts binds audio.resume() to BOTH a window
  // 'keydown' and a canvas 'pointerdown' (main.ts:57-66); a pointerdown also
  // arms `start`, which drops attract into play on the next stepped frame.
  shell.emit('canvas', 'pointerdown', { movementX: 0, movementY: 0 })
  for (let i = 0; i < 5; i++) shell.frame(100 + i)
  seen.afterGesture = shell.audioContexts()
  phase.afterGesture = shell.sim().phase
  frames.later = shell.sim().frame

  // Many more gestures of both kinds — resume() is documented idempotent, so the
  // count must not climb.
  for (let i = 0; i < 10; i++) {
    shell.emit('window', 'keydown', { key: 'Enter' })
    shell.emit('canvas', 'pointerdown', { movementX: 1, movementY: 1 })
    shell.frame(200 + i)
  }
  seen.afterManyGestures = shell.audioContexts()
})

describe('millipede — the gesture gate is respected', () => {
  it('constructs NO AudioContext at boot', () => {
    // A context built at module scope lands 'suspended' on some engines and warns
    // on every load; the browser refuses one before a gesture at all.
    expect(
      seen.afterBoot,
      'main.ts opened an AudioContext while the module was still evaluating — before the ' +
        'player has touched anything',
    ).toBe(0)
  })

  it('constructs NO AudioContext while the attract screen runs untouched', () => {
    // NOTE: on a mis-wired tree this could pass for a reason unrelated to the
    // gate — if resume() were never called, nothing would build a context here.
    // It is meaningful only in company with the positive below.
    expect(
      seen.afterSilentFrames,
      'an AudioContext appeared during attract with no interaction — the engine is being ' +
        'resumed off the frame loop rather than off a gesture',
    ).toBe(0)
  })

  it('DOES construct one once the player interacts — the gate opens (the positive)', () => {
    // The RED, and the assertion the two negatives lean on. It cannot pass unless
    // main.ts both builds the engine AND calls resume() from a real gesture
    // listener — verified non-vacuous below (withholding the gesture keeps it 0).
    expect(
      seen.afterGesture,
      'no AudioContext was built even after a gesture — the engine is never resumed, so the ' +
        'cabinet is permanently mute (main.ts calls neither createAudio nor audio.resume())',
    ).toBeGreaterThan(0)
  })

  it('builds at most ONE context however many gestures arrive (resume is idempotent)', () => {
    // resume() only does work on the first call; the listeners are left attached
    // forever. A context per keystroke would exhaust the browser's cap in a game.
    expect(
      seen.afterManyGestures,
      'more than one AudioContext was constructed — resume() is being bypassed, or a fresh ' +
        'engine is built per gesture',
    ).toBe(1)
  })
})

describe('millipede — boot smoke: the sim is live and the gesture starts play', () => {
  it('stepping attract frames advances the sim frame counter', () => {
    // A dead loop would leave window.__sim frozen; a stalled rAF would throw in
    // frame(). This proves the harness is driving a real, stepping simulation.
    expect(frames.later).toBeGreaterThan(frames.early)
  })

  it('a pointerdown transitions the sim out of attract toward play', () => {
    // The pointerdown arms `start`; advancePhase('attract', {startRequested})
    // leaves attract (core/sim.ts:63-81). Not a gate assertion, but it confirms
    // the very gesture that opens audio is a real, wired interaction.
    expect(phase.beforeGesture).toBe('attract')
    expect(phase.afterGesture).toBe('play')
  })
})
